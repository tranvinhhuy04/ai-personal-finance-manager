const CHAT_SESSION_KEY_PREFIX = 'fin-chat-session:';

// Lấy hoặc tạo mới session ID cho AI chat.
// Mỗi 'scope' (ví dụ: 'dashboard', 'ai-assistant') có session riêng biệt
// Session ID được lưu vào localStorage để tiếp tục cuộc hội thoại sau khi reload trang.
export function getOrCreateChatSessionId(scope: string): string {
  if (typeof window === 'undefined') {
    // SSR guard – trả về giá trị tạm thời khi chạy ngoài browser
    return `${scope}-server-session`;
  }

  const storageKey = `${CHAT_SESSION_KEY_PREFIX}${scope}`;
  const existing = window.localStorage.getItem(storageKey);
  if (existing && existing.trim()) {
    return existing;
  }

  // Tạo session ID mới: ưu tiên crypto.randomUUID() (chuẩn), fallback về timestamp+random
  const sessionId = typeof window.crypto?.randomUUID === 'function'
    ? window.crypto.randomUUID()
    : `${scope}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  window.localStorage.setItem(storageKey, sessionId);
  return sessionId;
}