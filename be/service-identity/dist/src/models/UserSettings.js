"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const userSettingsSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    twoFactorEnabled: { type: Boolean, default: false },
    theme: { type: String, default: 'dark' },
    twoFactorMethod: { type: String, default: null },
    twoFactorSecret: { type: String, default: null },
    preferredCurrency: { type: String, default: 'VND' },
    locale: { type: String, default: 'vi-VN' },
    updatedAt: { type: Date, default: Date.now },
}, {
    versionKey: false,
    toJSON: {
        transform: (_doc, ret) => {
            ret.id = ret._id.toString();
            ret.userId = ret.userId?.toString();
            delete ret._id;
            return ret;
        },
    },
});
exports.default = (0, mongoose_1.model)('UserSettings', userSettingsSchema);
