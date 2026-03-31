import { Schema, model } from 'mongoose';

export interface IOutboxEvent {
  _id: any;
  eventType: string;
  aggregateId: string;
  aggregateType: string;
  payload: Record<string, any>;
  published: boolean;
  publishedAt?: Date;
  createdAt: Date;
}

const outboxSchema = new Schema<IOutboxEvent>(
  {
    eventType: {
      type: String,
      required: true,
      index: true,
    },
    aggregateId: {
      type: String,
      required: true,
    },
    aggregateType: {
      type: String,
      required: true,
      enum: ['TRANSACTION'],
    },
    payload: {
      type: Schema.Types.Mixed,
      required: true,
    },
    published: {
      type: Boolean,
      default: false,
      index: true,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    versionKey: false,
  }
);

// Index to find unpublished events efficiently
outboxSchema.index({ published: 1, createdAt: 1 });

export default model<IOutboxEvent>('OutboxEvent', outboxSchema);
