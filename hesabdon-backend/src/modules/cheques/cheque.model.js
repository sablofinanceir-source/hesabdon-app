import mongoose from 'mongoose';

const chequeSchema = new mongoose.Schema(
  {
    shop: { type: mongoose.Schema.Types.ObjectId, required: true },
    direction: { type: String, enum: ['received', 'issued'], required: true }, // دریافتی / پرداختی
    party: { type: mongoose.Schema.Types.ObjectId, ref: 'Party' },
    partyName: { type: String, trim: true }, // اگر طرف حساب ثبت‌شده نیست
    amount: { type: Number, required: true, min: 0 },
    number: { type: String, trim: true }, // شماره چک / صیاد
    bank: { type: String, trim: true },
    issueDate: Date,
    dueDate: { type: Date, required: true },
    status: { type: String, enum: ['pending', 'cashed', 'bounced', 'returned'], default: 'pending' },
    settledAt: Date,
    ledgerApplied: { type: Boolean, default: false }, // با وصول، روی حساب شخص اثر گذاشته شده؟
    note: { type: String, maxlength: 500 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

chequeSchema.index({ shop: 1, status: 1, dueDate: 1 });
chequeSchema.index({ shop: 1, party: 1 });

export const Cheque = mongoose.model('Cheque', chequeSchema);
