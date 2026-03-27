"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = requireAuth;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey123';
function extractBearerToken(req) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    return token ?? null;
}
function requireAuth(expectedType) {
    return (req, res, next) => {
        const token = extractBearerToken(req);
        if (!token)
            return res.status(401).json({ message: 'Access token missing' });
        jsonwebtoken_1.default.verify(token, JWT_SECRET, (err, decoded) => {
            if (err)
                return res.status(401).json({ message: 'Invalid or expired token' });
            const payload = decoded;
            if (payload?.type !== expectedType) {
                return res.status(401).json({ message: 'Invalid token type' });
            }
            req.userId = payload.sub;
            return next();
        });
    };
}
