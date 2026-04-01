"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = requireAuth;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET;
function requireAuth(req, res, next) {
    if (!JWT_SECRET) {
        return res.status(500).json({ message: 'JWT_SECRET is not configured' });
    }
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Missing or invalid authorization header' });
    }
    const token = authHeader.slice(7);
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.userId = decoded?.sub ?? decoded?.userId;
        if (!req.userId) {
            return res.status(401).json({ message: 'Invalid token payload' });
        }
        next();
    }
    catch {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
}
