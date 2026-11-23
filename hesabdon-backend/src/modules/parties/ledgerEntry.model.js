import mongoose from 'mongoose';

// دفتر حساب هر شخص (گردش حساب)
const ledgerEntrySchema = new mongoose.Schema(
  {
    shop: { type: mongoose.Schema.Types.ObjectId, required: true },
    party: { type: mongoose.Schema.Types.ObjectId, ref: 'Party', required: true },
    type: { type: String, enum: ['invoice', 'payment_in', 'payment_out', 'reversal', 'adjustment'], required: true },
    amount: { type: Number, required: true }, // علامت‌دار: مثبت = بدهی او زیاد شد
    balanceAfter: { type: Number, required: true },
    method: { type: String, enum: ['cash', 'card', 'transfer', 'cheque'] },
    ref: { type: mongoose.Schema.Types.ObjectId },
    refType: String,
    note: String,
    date: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

ledgerEntrySchema.index({ shop: 1, party: 1, date: -1 });

export const LedgerEntry = mongoose.model('LedgerEntry', ledgerEntrySchema);
