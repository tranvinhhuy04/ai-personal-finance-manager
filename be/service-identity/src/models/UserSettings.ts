import { Schema, model } from 'mongoose';

const userSettingsSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    twoFactorEnabled: { type: Boolean, default: false },
    theme: { type: String, default: 'dark' },
    twoFactorMethod: { type: String, default: null },
    twoFactorSecret: { type: String, default: null },
    preferredCurrency: { type: String, default: 'VND' },
    locale: { type: String, default: 'vi-VN' },
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
