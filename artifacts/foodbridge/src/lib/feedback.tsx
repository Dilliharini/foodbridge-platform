import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { Check, X } from 'lucide-react';

type Notice = { id: number; title: string; message?: string; kind: 'success' | 'error' };
type FeedbackValue = { notify: (title: string, message?: string, kind?: Notice['kind']) => void };
const FeedbackContext = createContext<FeedbackValue | null>(null);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const value = useMemo(() => ({
    notify: (title: string, message?: string, kind: Notice['kind'] = 'success') => {
      const id = Date.now();
      setNotices((current) => [...current, { id, title, message, kind }]);
      window.setTimeout(() => setNotices((current) => current.filter((notice) => notice.id !== id)), 4200);
    },
  }), []);
  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[80] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2" aria-live="polite">
        {notices.map((notice) => (
          <div key={notice.id} className="animate-rise flex items-start gap-3 rounded-xl border border-border bg-card p-4 soft-shadow" data-testid={`toast-${notice.id}`}>
            <div className={`mt-0.5 rounded-full p-1 ${notice.kind === 'success' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
              {notice.kind === 'success' ? <Check size={14} /> : <X size={14} />}
            </div>
            <div className="min-w-0 flex-1"><p className="text-sm font-bold">{notice.title}</p>{notice.message && <p className="mt-1 text-xs text-muted-foreground">{notice.message}</p>}</div>
            <button type="button" className="text-muted-foreground" onClick={() => setNotices((current) => current.filter((item) => item.id !== notice.id))} data-testid={`button-dismiss-toast-${notice.id}`}><X size={14} /></button>
          </div>
        ))}
      </div>
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const context = useContext(FeedbackContext);
  if (!context) throw new Error('useFeedback must be used inside FeedbackProvider');
  return context;
}