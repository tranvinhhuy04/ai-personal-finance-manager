const mongoose = require('mongoose');

const { Schema } = mongoose;

const categorySchema = new Schema(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'users',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category_type: {
      type: String,
      enum: ['INCOME', 'EXPENSE'],
      required: true,
      index: true,
    },
    parent_id: {
      type: Schema.Types.ObjectId,
      ref: 'categories',
      default: null,
      index: true,
    },
    is_system: {
      type: Boolean,
      default: false,
      index: true,
    },
    status: {
      type: Number,
      default: 1,
      index: true,
    },
  },
  {
    versionKey: false,
    timestamps: true,
  }
);

module.exports = mongoose.model('categories', categorySchema);
