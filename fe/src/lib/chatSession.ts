const CHAT_SESSION_KEY_PREFIX = 'fin-chat-session:';

export function getOrCreateChatSessionId(scope: string): string {
  if (typeof window === 'undefined') {
    return `${scope}-server-session`;
  }

  const storageKey = `${CHAT_SESSION_KEY_PREFIX}${scope}`;
  const existing = window.localStorage.getItem(storageKey);
  if (existing && existing.trim()) {
    return existing;
  }

  const sessionId = typeof window.crypto?.randomUUID === 'function'
    ? window.crypto.randomUUID()
    : `${scope}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  window.localStorage.setItem(storageKey, sessionId);
  return sessionId;
}