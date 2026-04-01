import mongoose, { Schema } from 'mongoose';

export interface IOutboxEvent {
  _id: mongoose.Types.ObjectId;
  event_type: string;
  aggregate_id: string;
  payload: Record<string, unknown>;
  published: boolean;
  published_at?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const outboxSchema = new Schema<IOutboxEvent>(
  {
    event_type: { type: String, required: true, index: true },
    aggregate_id: { type: String, required: true, index: true },
    payload: { type: Schema.Types.Mixed, required: true },
    published: { type: Boolean, default: false, index: true },
    published_at: { type: Date, default: null },
  },
  {
    versionKey: false,
    timestamps: true,
  }
);

outboxSchema.index({ published: 1, createdAt: 1 });

export const OutboxModel = mongoose.model<IOutboxEvent>('outboxevents', outboxSchema);
