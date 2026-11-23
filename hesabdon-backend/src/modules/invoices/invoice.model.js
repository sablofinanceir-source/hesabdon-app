import mongoose from 'mongoose';

const { Schema } = mongoose;

export const PAYMENT_METHODS = ['cash', 'card', 'transfer', 'cheque'];

const itemSchema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  name: { type: String, required: true }, // نام کالا در لحظه ثبت (snapshot)
  unit: String,
  quantity: { type: Number, required: true, min: 0.001 },
  unitPrice: { type: Number, required: true, min: 0 },
  unitCost: { type: Number, default: 0, min: 0 }, // بهای تمام‌شده هر واحد (برای محاسبه سود)
  discount: { type: Number, default: 0, min: 0 },
  total: { type: Number, required: true, min: 0 },
});

/**
 * یک مدل برای فروش و خرید:
 *  - status=open      → «فاکتور باز»: آیتم‌ها اضافه می‌شوند (با بارکد) و هنوز روی انبار/حساب اثری ندارد
 *  - status=finalized → ثبت نهایی: موجودی و حساب شخص به‌روز شده
 *  - status=void      → باطل‌شده: همه اثرها برگشت خورده
 */
const invoiceSchema = new Schema(
  {
    shop: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    type: { type: String, enum: ['sale', 'purchase'], required: true },
    number: { type: Number }, // شماره ترتیبی؛ فقط هنگام ثبت نهایی داده می‌شود
    status: { type: String, enum: ['open', 'finalized', 'void'], default: 'open' },
    source: { type: String, enum: ['manual', 'voice'], default: 'manual' },
    party: { type: Schema.Types.ObjectId, ref: 'Party' },
    items: [itemSchema],
    subtotal: { type: Number, default: 0 },
    discount: { type: Number, default: 0, min: 0 },
    total: { type: Number, default: 0 },
    costTotal: { type: Number, default: 0 }, // جمع بهای تمام‌شده (فقط فروش)
    paidAmount: { type: Number, default: 0, min: 0 },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, default: 'cash' },
    // اثری که روی حساب شخص گذاشته شده تا هنگام ابطال دقیقاً برگردد
    ledgerEffect: { party: { type: Schema.Types.ObjectId }, amount: { type: Number, default: 0 } },
    note: { type: String, maxlength: 500 },
    voiceTranscript: String,
    date: { type: Date, default: Date.now },
    finalizedAt: Date,
    voidedAt: Date,
    voidedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    voidReason: String,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

invoiceSchema.index({ shop: 1, type: 1, number: 1 }, { unique: true, partialFilterExpression: { number: { $type: 'number' } } });
invoiceSchema.index({ shop: 1, status: 1, type: 1, date: -1 });
invoiceSchema.index({ shop: 1, party: 1, date: -1 });

export const Invoice = mongoose.model('Invoice', invoiceSchema);
