'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { usePolling } from '@/cafe/hooks/usePolling';
import { timeAgo } from '@/cafe/lib/dates';

interface Notif {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let on = true;
    const load = async () => {
      try {
        const r = await fetch('/api/notifications');
        if (!r.ok) return;
        const d = await r.json();
        if (on) {
          setItems(d.notifications);
          setUnread(d.unread);
        }
      } catch {
        /* polling — ignore transient errors */
      }
    };
    load();
    const t = setInterval(load, 10000);
    return () => {
      on = false;
      clearInterval(t);
    };
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const markAll = async () => {
    await fetch('/api/notifications/read-all', { method: 'POST' });
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnread(0);
  };

  return (
    <div className="relative" ref={boxRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-200/60 hover:text-navy transition-colors"
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`}
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber px-1 font-mono text-[9px] font-bold text-white shadow-sm">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200/90 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <span className="text-xs font-bold text-navy">Notifications</span>
            {unread > 0 && (
              <button onClick={markAll} className="text-[11px] font-semibold text-amber hover:underline">
                Mark all as read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-slate-400">No notifications yet</div>
            ) : (
              items.map((n) => (
                <div key={n.id} className={`border-b border-slate-50 px-4 py-3 ${n.isRead ? '' : 'bg-warm-50/70'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-xs font-semibold text-navy">{n.title}</div>
                    <span className="shrink-0 text-[10px] text-slate-400">{timeAgo(n.createdAt)}</span>
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{n.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
