"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = verifyToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET;
function verifyToken(req, res, next) {
    if (!JWT_SECRET) {
        return res.status(500).json({ message: 'JWT_SECRET is not configured' });
    }
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    console.log('Token received:', token);
    if (!token) {
        return res.status(401).json({ message: 'Access token missing' });
    }
    jsonwebtoken_1.default.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: 'Invalid or expired token' });
        }
        const payload = decoded;
        const userId = payload?.sub ?? payload?.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Invalid token payload' });
        }
        req.user = payload;
        req.userId = userId;
        next();
    });
}
