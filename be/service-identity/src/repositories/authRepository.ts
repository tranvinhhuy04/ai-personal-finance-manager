import User from '../models/User';
import UserSettings from '../models/UserSettings';

type CreateUserInput = {
  email: string;
  passwordHash: string;
  fullName: string;
  phone: string | null;
};

export async function findUserByEmail(email: string) {
  return User.findOne({ email }).lean();
}

export async function findUserById(userId: string) {
  return User.findById(userId).lean();
}

export async function createUser(input: CreateUserInput) {
  return User.create({
    email: input.email,
    passwordHash: input.passwordHash,
    fullName: input.fullName,
    phone: input.phone,
    status: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

export async function createDefaultUserSettings(userId: string) {
  return UserSettings.create({
    userId,
    twoFactorEnabled: false,
    theme: 'dark',
    preferredCurrency: 'VND',
    locale: 'vi-VN',
    updatedAt: new Date(),
  });
}

export async function findUserSettings(userId: string) {
  return UserSettings.findOne({ userId }).lean();
}

export async function upsertUserSettings(userId: string, update: Record<string, unknown>) {
  return UserSettings.findOneAndUpdate(
    { userId },
    {
      $set: {
        ...update,
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );
}
