"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerHandler = registerHandler;
exports.loginHandler = loginHandler;
const authService_1 = require("../../services/authService");
async function registerHandler(req, res) {
    const { email, password, fullName, phone } = req.body ?? {};
    try {
        const result = await (0, authService_1.register)({ email, password, fullName, phone });
        return res.status(201).json(result);
    }
    catch (err) {
        const code = err?.code;
        if (code === 'EMAIL_EXISTS')
            return res.status(409).json({ message: 'Email already exists' });
        if (code === 'VALIDATION_ERROR')
            return res.status(400).json({ message: err?.message ?? 'Invalid input' });
        return res.status(500).json({ message: 'Internal server error' });
    }
}
async function loginHandler(req, res) {
    const { email, password, twoFactorCode } = req.body ?? {};
    try {
        const result = await (0, authService_1.login)({ email, password, twoFactorCode });
        return res.status(200).json(result);
    }
    catch (err) {
        const code = err?.code;
        if (code === 'VALIDATION_ERROR')
            return res.status(400).json({ message: err?.message ?? 'Invalid input' });
        if (code === 'UNAUTHORIZED')
            return res.status(401).json({ message: err?.message ?? 'Invalid credentials' });
        return res.status(500).json({ message: 'Internal server error' });
    }
}
