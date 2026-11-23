import { z } from 'zod';
import { AppError } from '../../core/AppError.js';
import { fuzzyFind } from '../../core/fuzzy.js';
import { toLatinDigits } from '../../core/phone.js';
import { normalizeText } from '../../core/text.js';
import { chatJson, transcribeAudio } from '../../services/gapgpt.client.js';
import { createInvoice } from '../invoices/invoice.service.js';
import { Party } from '../parties/party.model.js';
import { recordPayment } from '../parties/party.service.js';
import { Product } from '../products/product.model.js';
import { SYSTEM_PROMPT, buildUserPrompt } from './voice.prompt.js';

const draftSchema = z.object({
  intent: z.enum(['sale', 'purchase', 'payment_received', 'payment_made', 'unknown']).catch('unknown'),
  party_name: z.string().nullish().catch(null),
  items: z
    .array(
      z.object({
        product_id: z.string().nullish().catch(null),
        name: z.string().catch(''),
        quantity: z.coerce.number().positive().catch(1),
        unit_price: z.coerce.number().min(0).nullish().catch(null),
      }),
    )
    .catch([]),
  is_credit: z.boolean().catch(false),
  paid_amount: z.coerce.number().min(0).nullish().catch(null),
  amount: z.coerce.number().positive().nullish().catch(null),
  note: z.string().nullish().catch(null),
});

// خطاهای تجاری که یعنی «ثبت خودکار ممکن نیست، کاربر باید اصلاح کند»
const REVIEWABLE = new Set(['PARTY_REQUIRED', 'INSUFFICIENT_STOCK', 'CREDIT_LIMIT_EXCEEDED', 'EMPTY_INVOICE']);

export async function transcribe(file) {
  if (!file) throw AppError.badRequest('فایل صوتی ارسال نشده است (فیلد audio)', 'AUDIO_REQUIRED');
  const text = await transcribeAudio({ buffer: file.buffer, filename: file.originalname, mimetype: file.mimetype });
  if (!text) throw AppError.unprocessable('صدا تشخیص داده نشد. دوباره تلاش کنید', 'EMPTY_TRANSCRIPT');
  return text;
}

async function loadCatalog(shopId) {
  const products = await Product.find({ shop: shopId, isActive: true }).select('name unit sellPrice buyPrice')
    .sort({ updatedAt: -1 }).limit(400).lean();
  return products.map((p) => ({ ...p, _norm: normalizeText(p.name) }));
}

async function parseWithAi(catalog, text) {
  const raw = await chatJson({ system: SYSTEM_PROMPT, user: buildUserPrompt(catalog, text) });
  const parsed = draftSchema.safeParse(raw ?? {});
  return parsed.success ? parsed.data : draftSchema.parse({});
}

/** خروجی خام مدل را با دیتای واقعی فروشگاه تطبیق می‌دهد (هرگز به product_id مدل اعتماد کامل نمی‌شود) */
async function resolveDraft(shopId, catalog, draft) {
  const byId = new Map(catalog.map((p) => [String(p._id), p]));
  const items = draft.items.map((it) => {
    const product = (it.product_id && byId.get(it.product_id)) || fuzzyFind(it.name, catalog);
    return {
      spokenName: it.name,
      productId: product ? String(product._id) : null,
      name: product?.name ?? it.name,
      quantity: it.quantity,
      unitPrice: it.unit_price ?? undefined,
      matched: Boolean(product),
    };
  });

  let party = null;
  if (draft.party_name) {
    const parties = await Party.find({ shop: shopId, isActive: true }).select('name').limit(2000).lean();
    const found = fuzzyFind(draft.party_name, parties, 0.7);
    party = found ? { id: String(found._id), name: found.name, isNew: false } : { id: null, name: draft.party_name.trim(), isNew: true };
  }

  return {
    intent: draft.intent,
    party,
    items,
    isCredit: draft.is_credit,
    paidAmount: draft.paid_amount ?? null,
    amount: draft.amount ?? null,
    note: draft.note ?? null,
  };
}

const result = (status, transcript, draft, extra = {}) => ({ status, transcript, draft, ...extra });

/**
 * ثبت صوتی/متنی:
 *  - created       → ثبت شد (با invoice.id می‌توان آن را اصلاح: PUT /invoices/:id یا برگرداند: POST /invoices/:id/void)
 *  - preview       → فقط تحلیل شد (dryRun)
 *  - needs_review  → اطلاعات ناقص/مبهم است؛ اپ باید فرم اصلاح را نشان دهد
 *  - unrecognized  → جمله حسابداری نبود
 */
export async function processEntry(auth, { text, file, dryRun }) {
  const transcript = toLatinDigits(text || (await transcribe(file)));
  const catalog = await loadCatalog(auth.shopId);
  const draft = await resolveDraft(auth.shopId, catalog, await parseWithAi(catalog, transcript));

  if (draft.intent === 'unknown') return result('unrecognized', transcript, draft);

  // ---- پرداخت/دریافت از طرف حساب ----
  if (draft.intent === 'payment_received' || draft.intent === 'payment_made') {
    if (!draft.party || !draft.amount) return result('needs_review', transcript, draft, { reason: 'نام شخص یا مبلغ مشخص نیست' });
    if (draft.party.isNew) return result('needs_review', transcript, draft, { reason: `شخصی با نام «${draft.party.name}» پیدا نشد` });
    if (dryRun) return result('preview', transcript, draft);
    const record = await recordPayment(auth, draft.party.id, {
      direction: draft.intent === 'payment_received' ? 'received' : 'paid',
      amount: draft.amount, method: 'cash', note: draft.note ?? undefined,
    });
    return result('created', transcript, draft, { kind: 'payment', record });
  }

  // ---- فروش / خرید ----
  if (!draft.items.length) return result('needs_review', transcript, draft, { reason: 'هیچ کالایی تشخیص داده نشد' });
  const unmatched = draft.items.filter((i) => !i.matched);
  if (unmatched.length) {
    return result('needs_review', transcript, draft, {
      reason: `کالای «${unmatched.map((i) => i.spokenName).join('، ')}» در لیست کالاها پیدا نشد`,
    });
  }
  if (dryRun) return result('preview', transcript, draft);

  // طرف حساب جدید (مثلاً مشتری نسیه) خودکار ساخته می‌شود؛ اگر ثبت فاکتور شکست خورد حذف می‌شود
  let createdPartyId = null;
  let partyId = draft.party?.id ?? undefined;
  if (draft.party?.isNew) {
    const party = await Party.create({ shop: auth.shopId, name: draft.party.name, type: draft.intent === 'sale' ? 'customer' : 'supplier' });
    createdPartyId = party._id;
    partyId = String(party._id);
  }

  try {
    const invoice = await createInvoice(auth, {
      type: draft.intent,
      partyId,
      items: draft.items.map(({ productId, quantity, unitPrice }) => ({ productId, quantity, unitPrice })),
      status: 'finalized',
      paidAmount: draft.isCredit ? 0 : draft.paidAmount ?? undefined,
      paymentMethod: 'cash',
      source: 'voice',
      voiceTranscript: transcript,
      note: draft.note ?? undefined,
    });
    return result('created', transcript, draft, { kind: 'invoice', record: invoice, createdParty: Boolean(createdPartyId) });
  } catch (err) {
    if (createdPartyId) await Party.deleteOne({ _id: createdPartyId });
    if (err instanceof AppError && REVIEWABLE.has(err.code)) return result('needs_review', transcript, draft, { reason: err.message, code: err.code });
    throw err;
  }
}
