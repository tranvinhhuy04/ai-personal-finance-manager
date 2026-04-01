"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findUserByEmail = findUserByEmail;
exports.findUserById = findUserById;
exports.createUser = createUser;
exports.createDefaultUserSettings = createDefaultUserSettings;
exports.findUserSettings = findUserSettings;
exports.upsertUserSettings = upsertUserSettings;
const User_1 = __importDefault(require("../models/User"));
const UserSettings_1 = __importDefault(require("../models/UserSettings"));
async function findUserByEmail(email) {
    return User_1.default.findOne({ email }).lean();
}
async function findUserById(userId) {
    return User_1.default.findById(userId).lean();
}
async function createUser(input) {
    return User_1.default.create({
        email: input.email,
        passwordHash: input.passwordHash,
        fullName: input.fullName,
        phone: input.phone,
        status: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
    });
}
async function createDefaultUserSettings(userId) {
    return UserSettings_1.default.create({
        userId,
        twoFactorEnabled: false,
        theme: 'dark',
        preferredCurrency: 'VND',
        locale: 'vi-VN',
        updatedAt: new Date(),
    });
}
async function findUserSettings(userId) {
    return UserSettings_1.default.findOne({ userId }).lean();
}
async function upsertUserSettings(userId, update) {
    return UserSettings_1.default.findOneAndUpdate({ userId }, {
        $set: {
            ...update,
            updatedAt: new Date(),
        },
    }, { upsert: true });
}
