import mongoose, { Schema } from 'mongoose';

export interface INotification {
  _id: mongoose.Types.ObjectId;
  user_id: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT' | 'REMINDER';
  is_read: boolean;
  created_at: Date;
  metadata?: Record<string, unknown>;
}

const notificationSchema = new Schema<INotification>(
  {
    user_id: { type: String, required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ['INFO', 'SUCCESS', 'WARNING', 'ALERT', 'REMINDER'], required: true, default: 'INFO' },
    is_read: { type: Boolean, required: true, default: false, index: true },
    created_at: { type: Date, required: true, default: Date.now, index: true },
    metadata: { type: Schema.Types.Mixed, default: null },
  },
  {
    versionKey: false,
    timestamps: false,
  }
);

notificationSchema.index({ user_id: 1, created_at: -1 });

export const NotificationModel = mongoose.model<INotification>('notifications', notificationSchema);
