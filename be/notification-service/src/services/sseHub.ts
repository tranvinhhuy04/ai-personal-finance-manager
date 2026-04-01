import { Response } from 'express';

class SSEHub {
  private clients = new Map<string, Set<Response>>();

  subscribe(userId: string, res: Response) {
    const current = this.clients.get(userId) ?? new Set<Response>();
    current.add(res);
    this.clients.set(userId, current);

    res.on('close', () => {
      const userClients = this.clients.get(userId);
      if (!userClients) return;
      userClients.delete(res);
      if (userClients.size === 0) {
        this.clients.delete(userId);
      }
    });
  }

  push(userId: string, payload: unknown) {
    const userClients = this.clients.get(userId);
    if (!userClients || userClients.size === 0) return;

    const data = `data: ${JSON.stringify(payload)}\n\n`;
    for (const res of userClients) {
      res.write(data);
    }
  }
}

export const sseHub = new SSEHub();
