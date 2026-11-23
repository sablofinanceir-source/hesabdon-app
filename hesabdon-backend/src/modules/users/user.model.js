import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    shop: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    role: { type: String, enum: ['owner', 'staff'], default: 'staff' },
    permissions: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
    pushTokens: { type: [String], default: [] }, // Expo push tokens
    lastLoginAt: Date,
  },
  { timestamps: true },
);

userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

export const User = mongoose.model('User', userSchema);
