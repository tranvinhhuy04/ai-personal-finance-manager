"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sseHub = void 0;
class SSEHub {
    constructor() {
        this.clients = new Map();
    }
    subscribe(userId, res) {
        const current = this.clients.get(userId) ?? new Set();
        current.add(res);
        this.clients.set(userId, current);
        res.on('close', () => {
            const userClients = this.clients.get(userId);
            if (!userClients)
                return;
            userClients.delete(res);
            if (userClients.size === 0) {
                this.clients.delete(userId);
            }
        });
    }
    push(userId, payload) {
        const userClients = this.clients.get(userId);
        if (!userClients || userClients.size === 0)
            return;
        const data = `data: ${JSON.stringify(payload)}\n\n`;
        for (const res of userClients) {
            res.write(data);
        }
    }
}
exports.sseHub = new SSEHub();
