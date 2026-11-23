import mongoose from 'mongoose';

// مشتری، تأمین‌کننده یا هر دو. balance > 0 یعنی او به ما بدهکار است؛ balance < 0 یعنی ما به او بدهکاریم.
const partySchema = new mongoose.Schema(
  {
    shop: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    type: { type: String, enum: ['customer', 'supplier', 'both'], default: 'customer' },
    address: { type: String, trim: true },
    note: { type: String, maxlength: 500 },
    balance: { type: Number, default: 0 },
    creditLimit: { type: Number, default: 0, min: 0 }, // 0 = بدون سقف
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

partySchema.index({ shop: 1, name: 1 });
partySchema.index({ shop: 1, phone: 1 });

export const Party = mongoose.model('Party', partySchema);
