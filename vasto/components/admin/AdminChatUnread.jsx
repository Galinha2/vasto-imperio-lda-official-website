'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
const UnreadContext = createContext({ counts: {}, total: 0, markRead: async () => {}, refresh: async () => {} });
export const useAdminChatUnread = () => useContext(UnreadContext);
export default function AdminChatUnread({ children }) {
  const [counts, setCounts] = useState({});
  const acknowledged = useRef(new Set());
  const pending = useRef(new Set());
  const alive = useRef(true);
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const version = ++generation.current;
    try {
      const response = await fetch('/api/admin/chat?unread=1', { cache: 'no-store' });
      if (!response.ok) return;
      const data = await response.json();
      if (alive.current && generation.current === version) setCounts(data.counts);
    } catch { /* Retry on the next poll. */ }
  }, []);
  useEffect(() => {
    alive.current = true;
    refresh();
    const timer = setInterval(refresh, 3000);
    const visible = () => { if (!document.hidden) refresh(); };
    window.addEventListener('admin:new-chat', refresh);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', visible);
    return () => {
      alive.current = false;
      clearInterval(timer);
      window.removeEventListener('admin:new-chat', refresh);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [refresh]);
  const markRead = useCallback(async (id, messages) => {
    const ids = messages.filter(m => m.sender === 'visitor' && !m.admin_read_at && !acknowledged.current.has(m.id) && !pending.current.has(m.id)).map(m => m.id);
    if (!ids.length) return;
    ids.forEach(id => pending.current.add(id));
    try {
      const response = await fetch('/api/admin/chat', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, messageIds: ids }) });
      if (!response.ok) return;
      ids.forEach(id => acknowledged.current.add(id));
      await refresh();
    } catch { /* Keep unread status on failure and retry on the next messages fetch. */ }
    finally { ids.forEach(id => pending.current.delete(id)); }
  }, [refresh]);
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  return <UnreadContext.Provider value={{ counts, total, markRead, refresh }}>{children}</UnreadContext.Provider>;
}
