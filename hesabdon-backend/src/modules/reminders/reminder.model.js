import mongoose from 'mongoose';

const reminderSchema = new mongoose.Schema(
  {
    shop: { type: mongoose.Schema.Types.ObjectId, required: true },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    note: { type: String, maxlength: 500 },
    type: { type: String, enum: ['purchase', 'installment', 'bill', 'task', 'cheque', 'other'], default: 'task' },
    amount: { type: Number, min: 0 },
    dueAt: { type: Date, required: true },
    notifyBeforeMinutes: { type: Number, default: 0, min: 0 }, // چند دقیقه قبل از موعد خبر بدهد
    repeat: { type: String, enum: ['none', 'daily', 'weekly', 'monthly'], default: 'none' },
    isDone: { type: Boolean, default: false },
    doneAt: Date,
    notifiedAt: Date, // آخرین باری که برای موعد فعلی اعلان رفته
    ref: { type: mongoose.Schema.Types.ObjectId }, // مثلاً شناسه چک مرتبط
    refType: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

reminderSchema.index({ shop: 1, isDone: 1, dueAt: 1 });
reminderSchema.index({ isDone: 1, notifiedAt: 1, dueAt: 1 }); // برای زمان‌بند

export const Reminder = mongoose.model('Reminder', reminderSchema);
