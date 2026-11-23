import OpenAI, { toFile } from 'openai';
import { env } from '../config/env.js';
import { AppError } from '../core/AppError.js';

let client;

/** GapGPT با SDK رسمی OpenAI سازگار است؛ فقط baseURL فرق دارد */
function getClient() {
  if (!env.ai.apiKey) throw new AppError('سرویس هوش مصنوعی پیکربندی نشده است (GAPGPT_API_KEY)', 503, 'AI_NOT_CONFIGURED');
  client ??= new OpenAI({ apiKey: env.ai.apiKey, baseURL: env.ai.baseUrl, timeout: 60_000, maxRetries: 1 });
  return client;
}

const upstream = (err) =>
  new AppError('خطا در ارتباط با سرویس هوش مصنوعی', 502, 'AI_UPSTREAM_ERROR', { status: err?.status, message: err?.message });

/** استخراج اولین شیء JSON از پاسخ مدل (حتی اگر داخل ``` یا همراه توضیح باشد) */
export function extractJson(text = '') {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(text.slice(start, end + 1)); } catch { return null; }
}

/** گفتار → متن فارسی */
export async function transcribeAudio({ buffer, filename = 'audio.m4a', mimetype = 'audio/m4a' }) {
  try {
    const file = await toFile(buffer, filename, { type: mimetype });
    const res = await getClient().audio.transcriptions.create({ file, model: env.ai.sttModel, language: 'fa' });
    return (res.text ?? '').trim();
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw upstream(err);
  }
}

/** درخواست چت با خروجی JSON. اگر مدل response_format را پشتیبانی نکند، بدون آن تکرار می‌شود. */
export async function chatJson({ system, user }) {
  const params = {
    model: env.ai.chatModel,
    temperature: 0,
    messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
  };
  try {
    let res;
    try {
      res = await getClient().chat.completions.create({ ...params, response_format: { type: 'json_object' } });
    } catch (err) {
      if (err?.status !== 400) throw err;
      res = await getClient().chat.completions.create(params);
    }
    return extractJson(res.choices?.[0]?.message?.content ?? '');
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw upstream(err);
  }
}
