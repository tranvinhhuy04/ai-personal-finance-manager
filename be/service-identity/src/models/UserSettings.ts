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

/**
 * Mỗi phần tử trong pool API Key:
 *   key      — chuỗi AES-256-CBC encrypted
 *   status   — 'active' | 'exhausted'
 *   added_at — thời điểm thêm key
 */
const geminiApiKeyEntrySchema = new Schema(
  {
    key: { type: String, required: true },
    status: { type: String, enum: ['active', 'exhausted'], default: 'active' },
    added_at: { type: Date, default: Date.now },
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
    /**
     * Pool tối đa 10 Gemini API Keys.
     * Field `gemini_api_key` (legacy string) vẫn có thể tồn tại trong DB cũ —
     * service layer sẽ migrate on-read sang đây.
     */
    gemini_api_keys: {
      type: [geminiApiKeyEntrySchema],
      default: [],
      validate: {
        validator: (v: unknown[]) => v.length <= 10,
        message: 'Tối đa 10 API Keys được phép',
      },
    },
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
