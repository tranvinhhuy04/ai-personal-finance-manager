import { Schema, model } from 'mongoose';

const aiUsageLogSchema = new Schema(
  {
    date: { type: Date, required: true },
    model: { type: String, required: true },
    tokens_used: { type: Number, required: true, min: 0 },
    estimated_cost: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const userSettingsSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    twoFactorEnabled: { type: Boolean, default: false },
    theme: { type: String, default: 'dark' },
    twoFactorMethod: { type: String, default: null },
    twoFactorSecret: { type: String, default: null },
    preferredCurrency: { type: String, default: 'VND' },
    locale: { type: String, default: 'vi-VN' },
    gemini_api_key: { type: String, default: null },
    selected_ai_model: { type: String, default: 'gemini-2.5-flash' },
    ai_usage_logs: { type: [aiUsageLogSchema], default: [] },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    versionKey: false,
    toJSON: {
      transform: (_doc, ret: any) => {
        ret.id = ret._id.toString();
        ret.userId = ret.userId?.toString();
        delete ret._id;
        return ret;
      },
    },
  }
);

export default model('UserSettings', userSettingsSchema);
