# myAnbari Backend

بک‌اند برنامه حسابداری و انبارداری فروشگاه — **Node.js + Express + MongoDB (Mongoose)** با معماری ماژولار MVC.
هوش مصنوعی (ثبت صوتی) از طریق **GapGPT** (سازگار با OpenAI SDK).

## راه‌اندازی

```bash
cp .env.example .env      # مقدارها را پر کنید (MONGODB_URI, JWT_ACCESS_SECRET, SMSIR_API_KEY, SMSIR_TEMPLATE_ID, GAPGPT_API_KEY)
npm install
npm run dev               # http://localhost:4000/api/v1/health
```
نیازمندی: Node.js 20+ و MongoDB.

## ساختار

```
src/
  config/        env، اتصال دیتابیس، مجوزها، طرح‌های اشتراک
  core/          AppError، validate (zod)، pagination، فارسی‌سازی متن/شماره، fuzzy match
  middlewares/   auth (JWT)، permission، feature (طرح اشتراک)، upload، error
  services/      gapgpt.client.js  ← تنها نقطه ارتباط با هوش مصنوعی
  jobs/          scheduler.js  ← ارسال اعلان یادآوری‌ها
  modules/       هر ماژول: model / validation / service / controller / routes
    auth  users(+staff)  shops  products  inventory  parties  invoices
    cheques  recipes  reminders  reports  voice
```
جریان هر درخواست: `route → validate(zod) → controller (نازک) → service (منطق کسب‌وکار) → model`.

## قابلیت‌ها ← ماژول

| قابلیت | ماژول | نکته |
|---|---|---|
| ثبت با صدا | `voice` | صدا → متن → GapGPT → ثبت خودکار؛ قابل اصلاح (`PUT /invoices/:id`) و برگشت (`POST /invoices/:id/void`) |
| بارکد | `products` + `invoices` | `GET /products/barcode/:code` و `POST /invoices/:id/items {barcode}` روی «فاکتور باز» |
| موجودی و انبار | `inventory` | دفتر گردش انبار، اصلاح موجودی، ارزش انبار؛ تغییر موجودی فقط از یک تابع اتمیک |
| چک‌ها | `cheques` | دریافتی/پرداختی، سررسید، وضعیت، یادآوری خودکار، ثبت در حساب شخص هنگام وصول |
| مشتریان نسیه | `parties` | مانده، سقف اعتبار، گردش حساب، ثبت دریافت/پرداخت |
| رسید و فاکتور | `invoices` | JSON یا HTML (برای `expo-print` / اشتراک‌گذاری) |
| گزارش‌ها | `reports` | داشبورد، فروش، سود ناخالص، پرفروش‌ها، رو به اتمام، مانده حساب‌ها |
| کارکنان | `users` (`/staff`) | مجوزهای ریزدانه + پریست‌های آماده (cashier / warehouse / manager) |
| دستور ساخت | `recipes` | با هر فروش مواد اولیه کم می‌شود و بهای تمام‌شده محاسبه می‌شود |
| یادآوری‌ها | `reminders` | تکرار روزانه/هفتگی/ماهانه + Push با Expo |
| اشتراک | `config/plans.js` | قابلیت‌های `voice, cheques, recipes, staff` فقط در طرح حرفه‌ای |

## مفاهیم مهم

- **فاکتور** یک مدل برای فروش و خرید است: `open` (فاکتور باز، بدون اثر روی انبار) → `finalized` (موجودی و حساب به‌روز می‌شود) → `void` (همه اثرها برگشت می‌خورد).
- **مانده طرف حساب:** `balance > 0` یعنی او به ما بدهکار است؛ `balance < 0` یعنی ما بدهکاریم.
- **بهای تمام‌شده** هر آیتم هنگام فروش ذخیره می‌شود (snapshot) تا سود ناخالص با تغییر قیمت‌ها خراب نشود.
- **پول** به‌صورت عدد صحیح تومان (یا ریال، طبق تنظیم فروشگاه) ذخیره می‌شود. تاریخ‌ها UTC هستند؛ تبدیل به شمسی در اپ.
- همه داده‌ها با `shop` ایزوله هستند (چند‌مستاجری).

## احراز هویت

ورود و ثبت‌نام **فقط با کد یک‌بارمصرف پیامکی (OTP)** و از طریق **sms.ir** است؛ رمز عبور وجود ندارد.

```
POST /auth/otp/request   { phone }                                   → { expiresIn, resendAfter, length }
POST /auth/otp/verify    { phone, code, name?, shopName?, businessType? }
                                                                     → { user, shop, isNewUser, tokens }
POST /auth/refresh | POST /auth/logout       { refreshToken }
```
- **کاربر موجود** (مالک یا کارمند): فقط `phone + code` کافی است.
- **شمارهٔ جدید:** اگر `name` و `shopName` همراه نباشد خطای `422 REGISTRATION_REQUIRED` برمی‌گردد و کد تا ۵ دقیقه معتبر می‌ماند؛ اپ فرم را نشان می‌دهد و **همان کد** را همراه `name` و `shopName` دوباره می‌فرستد. با موفقیت، مالک و فروشگاه ساخته می‌شود (هر فروشگاه جدید ۱۴ روز طرح حرفه‌ای رایگان می‌گیرد).
- **کارمند** را مالک با `POST /staff` (فقط نام، شماره و مجوز) می‌سازد و کارمند با همان شماره و کد پیامکی وارد می‌شود.
- کدهای خطا: `OTP_INVALID` (۴۰۱، با `details.attemptsLeft`)، `OTP_EXPIRED` (۴۰۱)، `OTP_ATTEMPTS_EXCEEDED` (۴۲۹)، `OTP_COOLDOWN` و `OTP_LIMIT_REACHED` (۴۲۹، با `details.retryAfter` به ثانیه)، `SMS_SEND_FAILED` (۵۰۲)، `ACCOUNT_DISABLED` (۴۰۳).

هدر درخواست‌ها: `Authorization: Bearer <accessToken>`. Access token کوتاه‌مدت (۱۵ دقیقه) و Refresh token چرخشی (rotation) است.

### امنیت OTP
- کد با `crypto.randomInt` ساخته می‌شود و فقط **HMAC** آن ذخیره می‌شود (کد خام هرگز ذخیره یا لاگ نمی‌شود، جز در محیط توسعه بدون کلید پیامک).
- انقضا ۱۲۰ ثانیه، حداکثر ۵ تلاش برای هر کد، فاصلهٔ ۶۰ ثانیه بین دو ارسال و حداکثر ۵ ارسال در ساعت برای هر شماره؛ همه اتمیک (مقاوم در برابر درخواست همزمان). علاوه بر آن محدودیت IP روی هر دو مسیر.
- کد بعد از اولین تأیید موفق مصرف می‌شود و کد جدید، کد قبلی را باطل می‌کند.
- اگر ارسال پیامک شکست بخورد، سهمیهٔ ارسال برگردانده می‌شود تا کاربر بتواند فوراً دوباره تلاش کند.
- برای شمارهٔ غیرفعال پیامک ارسال نمی‌شود.

### راه‌اندازی sms.ir
1. در پنل sms.ir کلید API بسازید (`SMSIR_API_KEY`).
2. در بخش «ارسال سریع» یک قالب بسازید، مثلاً: `کد ورود شما به مای‌انباری: #Code#` و شناسهٔ آن را در `SMSIR_TEMPLATE_ID` بگذارید.
3. اگر نام پارامتر در قالب چیز دیگری است (مثلاً `#CODE#`)، `SMSIR_CODE_PARAM` را مطابق آن تنظیم کنید.
4. در محیط توسعه اگر کلید خالی باشد، کد در کنسول سرور چاپ می‌شود؛ در `production` نبودن کلید یا شناسهٔ قالب هنگام اجرا خطا می‌دهد.

## Endpoints (پیشوند `/api/v1`)

```
GET    /health            GET /plans
POST   /auth/otp/request|otp/verify|refresh|logout
GET    /users/me          PATCH /users/me         PUT /users/me/push-token     POST /users/me/push-token/remove
GET|POST /staff           PATCH|DELETE /staff/:id
GET    /shop              PATCH /shop             GET /shop/plan

GET|POST /products        GET /products/categories   GET /products/barcode/:code
GET|PATCH|DELETE /products/:id

GET    /inventory/movements   GET /inventory/valuation   POST /inventory/adjust

GET|POST /parties         GET|PATCH|DELETE /parties/:id
GET    /parties/:id/ledger     POST /parties/:id/payments

GET|POST /invoices        GET|PUT|DELETE /invoices/:id
POST   /invoices/:id/items            PATCH|DELETE /invoices/:id/items/:itemId
POST   /invoices/:id/finalize         POST /invoices/:id/void
GET    /invoices/:id/receipt?format=json|html

GET|POST /cheques         GET /cheques/summary    GET|PATCH|DELETE /cheques/:id
POST   /cheques/:id/status

GET|POST /recipes         GET|PATCH|DELETE /recipes/:id

GET|POST /reminders       PATCH|DELETE /reminders/:id    POST /reminders/:id/complete

GET    /reports/dashboard|summary|sales-by-period|top-products|low-stock|balances

POST   /voice/transcribe  (multipart: audio)
POST   /voice/entries     (multipart: audio  یا JSON: { text, dryRun })
```

پاسخ موفق: `{ success: true, data, meta? }` — پاسخ خطا: `{ success: false, error: { code, message, details? } }`.

## نمونه جریان‌ها

**فروش با بارکدخوان (فاکتور باز)**
```
POST /invoices            { "type": "sale" }                       → فاکتور باز
POST /invoices/:id/items  { "barcode": "6260000000001" }           → هر اسکن یک واحد اضافه می‌کند
POST /invoices/:id/finalize { "paidAmount": 50000, "partyId": "…" } → باقی‌مانده نسیه می‌شود
GET  /invoices/:id/receipt?format=html
```

**ثبت صوتی**
```
POST /voice/entries  (audio=ضبط صدا)   مثلاً «دو تا شیر و یک نان به علی نسیه فروختم»
→ status: created | needs_review | unrecognized | preview
اشتباه بود؟  POST /invoices/:id/void   یا   PUT /invoices/:id  با آیتم‌های اصلاح‌شده
```
`status = needs_review` یعنی کالا/شخص مبهم است (یا موجودی/سقف اعتبار اجازه نمی‌دهد)؛ اپ باید فرم اصلاح را نشان دهد. با `dryRun: true` فقط تحلیل می‌شود.

## نکات و محدودیت‌های فعلی

1. **تراکنش MongoDB استفاده نشده** تا روی MongoDB تکی (بدون replica set) هم اجرا شود. به‌جایش تغییر موجودی با `$inc` اتمیک است و در خطا، عملیات انجام‌شده برگردانده می‌شود (rollback دستی). اگر روی Atlas/replica set هستید، می‌توان `session` اضافه کرد.
2. **مدل صوت (STT):** نام مدل تبدیل گفتار در `GAPGPT_STT_MODEL` است. اگر GapGPT مدل `whisper-1` را پشتیبانی نکرد، یا مدل دیگری بگذارید، یا از Speech-to-Text داخلی گوشی استفاده کنید و فقط `text` را به `/voice/entries` بفرستید.
3. **درگاه پرداخت اشتراک** پیاده نشده؛ فعلاً ۱۴ روز آزمایشی هنگام ثبت‌نام فعال می‌شود. برای فعال‌سازی اشتراک باید درگاه (زرین‌پال و …) و webhook اضافه شود.
4. **کاربران قدیمی:** فیلد `passwordHash` دیگر استفاده نمی‌شود و در دیتابیس‌های قدیمی بی‌ضرر می‌ماند. برای پاک‌سازی: `db.users.updateMany({}, { $unset: { passwordHash: "" } })`.
5. زمان‌بند اعلان‌ها با `setInterval` است؛ در چند نمونه سرور فقط روی یکی اجرا شود یا به BullMQ منتقل شود.
6. تکرار ماهانه یادآوری‌ها بر اساس ماه میلادی است (نه شمسی).
7. تست خودکار هنوز ننوشته‌ایم.
