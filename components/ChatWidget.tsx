'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Send, X, Sparkles, CalendarPlus, ListPlus, Check, AlertTriangle, Clock, Trash2 } from 'lucide-react';
import EddyMascot from './EddyMascot';
import type { ParsedMessageIntent } from '@/lib/gemini';
import type { SlotAdvice, SlotSuggestion } from '@/lib/slotAdvice';

interface ChatMessage {
  id: string;
  role: 'user' | 'eddy';
  text: string;
  draft?: ParsedMessageIntent;
  /** วันที่ขอมาชนของเดิม/แน่นเกินไป -> เอ็ดดี้เสนอเวลาอื่นให้เลือก (เลือกหรือไม่เลือกก็ได้) */
  slotAdvice?: SlotAdvice;
  added?: boolean; // สำหรับ draft ที่เป็น task และเพิ่มไปแล้ว
}

const initialMessages: ChatMessage[] = [
  {
    id: 'welcome',
    role: 'eddy',
    text: 'สวัสดี! ผมเอ็ดดี้ ผู้ช่วยของคุณ ลองพิมพ์ "นัดหมอฟันพุธหน้าบ่ายสาม" หรือ "อ่านหนังสือสอบ" ดูได้เลย ผมจะช่วยแปลงให้!',
  },
];

export default function ChatWidget() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  // โหลดประวัติแค่ครั้งเดียวตอนเปิดแชทครั้งแรก - ไม่โหลดพร้อมทุกหน้าที่มีปุ่มแชทลอยอยู่
  const historyLoaded = useRef(false);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open]);

  // เปิดแชทครั้งแรก -> ดึงบทสนทนาเก่ามาต่อ
  useEffect(() => {
    if (!open || historyLoaded.current) return;
    historyLoaded.current = true;
    setLoadingHistory(true);
    (async () => {
      try {
        const res = await fetch('/api/chat/history');
        const data = await res.json();
        const past: ChatMessage[] = (data.messages ?? []).map(
          (m: { id: string; role: 'user' | 'eddy'; text: string; draft?: ParsedMessageIntent; added?: boolean }) => ({
            id: m.id,
            role: m.role,
            text: m.text,
            draft: m.draft,
            added: m.added,
          }),
        );
        // มีประวัติแล้วก็ไม่ต้องขึ้นข้อความต้อนรับซ้ำ
        if (past.length > 0) setMessages(past);
      } catch {
        // โหลดประวัติไม่ได้ก็เริ่มบทสนทนาใหม่ได้ตามปกติ
      } finally {
        setLoadingHistory(false);
      }
    })();
  }, [open]);

  async function clearHistory() {
    if (!confirm('ล้างประวัติแชททั้งหมด?')) return;
    setMessages(initialMessages);
    await fetch('/api/chat/history', { method: 'DELETE' });
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'eddy',
          text: data.reply ?? 'ขออภัย ผมยังตอบไม่ได้ตอนนี้',
          draft: data.draft ?? undefined,
          slotAdvice: data.slotAdvice ?? undefined,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'eddy', text: 'เชื่อมต่อไม่สำเร็จ ลองใหม่อีกครั้งนะ' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  /** เปิดฟอร์มเพิ่มกิจกรรมในหน้าปฏิทิน - slot = เวลาที่ผู้ใช้เลือกจากตัวเลือกที่เอ็ดดี้เสนอ (ไม่เลือกก็ใช้เวลาเดิม) */
  function addDraftToCalendar(draft: ParsedMessageIntent, slot?: SlotSuggestion) {
    const payload = encodeURIComponent(
      JSON.stringify(
        slot ? { ...draft, date: slot.date, startTime: slot.startTime, endTime: slot.endTime } : draft,
      ),
    );
    router.push(`/calendar?quickAdd=${payload}`);
    setOpen(false);
  }

  async function addDraftToTodo(messageId: string, draft: ParsedMessageIntent) {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: draft.title }),
    });
    if (!res.ok) return;
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, added: true } : m)));
    // จำไว้ในฐานข้อมูลด้วย ไม่งั้นรีเฟรชแล้วปุ่มกลับมาให้กดซ้ำจนได้งานซ้ำ
    fetch('/api/chat/history', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: messageId }),
    }).catch(() => {});
  }

  return (
    <>
      {/* Floating action button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-24 right-6 z-40 flex h-16 w-16 items-center justify-center rounded-full bg-ink shadow-clay-pop ring-1 ring-black/5 transition-transform hover:scale-105 md:bottom-8 md:right-8"
        aria-label="เปิดแชทกับ Eddy"
      >
        {open ? <X color="white" size={26} /> : <EddyMascot size={48} float={false} />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-40 right-4 z-40 flex h-[480px] w-[92vw] max-w-sm flex-col overflow-hidden rounded-clay bg-white shadow-clay-pop md:bottom-28 md:right-8">
          <div className="flex items-center gap-3 bg-ink px-5 py-4 text-white">
            <EddyMascot size={36} float={false} />
            <div className="flex-1">
              <p className="font-display text-sm font-bold">คุยกับเอ็ดดี้</p>
              <p className="flex items-center gap-1 text-[11px] text-white/70">
                <Sparkles size={12} /> ขับเคลื่อนด้วย Gemini AI
              </p>
            </div>
            <button
              onClick={clearHistory}
              aria-label="ล้างประวัติแชท"
              title="ล้างประวัติแชท"
              className="rounded-full p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Trash2 size={15} />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-eddy-50 px-4 py-4">
            {loadingHistory && (
              <p className="text-center font-body text-xs text-ink-muted">กำลังโหลดบทสนทนาก่อนหน้า...</p>
            )}
            {messages.map((m) => (
              <div key={m.id} className="flex flex-col gap-2">
                <div
                  className={`max-w-[80%] rounded-clay-sm px-4 py-2.5 font-body text-sm ${
                    m.role === 'eddy' ? 'bg-white text-ink shadow-clay-sm' : 'ml-auto bg-eddy-500 text-white'
                  }`}
                >
                  {m.text}
                </div>

                {/* การ์ดเสนอเพิ่มกิจกรรม/สิ่งที่ต้องทำ จากข้อความที่ Gemini แปลงได้ */}
                {m.draft && (
                  <div className="max-w-[85%] rounded-clay-sm bg-pastel-mint/60 p-3">
                    <p className="font-body text-xs font-semibold text-ink">เอ็ดดี้อ่านได้ว่า:</p>
                    <p className="mt-1 font-body text-sm text-ink">{m.draft.title}</p>
                    {m.draft.intent === 'event' && (
                      <p className="font-body text-xs text-ink-muted">
                        {m.draft.date}
                        {m.draft.startTime ? ` • ${m.draft.startTime} น.` : ''}
                      </p>
                    )}
                    {/* วันนั้นชนของเดิม/แน่นเกินไป - เสนอเวลาอื่นให้เลือก */}
                    {!m.added && m.draft.intent === 'event' && m.slotAdvice && (
                      <div className="mt-2 rounded-clay-sm bg-white/80 p-2.5">
                        <p className="flex items-start gap-1.5 font-body text-[11px] text-ink">
                          <AlertTriangle size={13} className="mt-px flex-shrink-0 text-amber-500" />
                          {m.slotAdvice.message}
                        </p>
                        {m.slotAdvice.suggestions.length > 0 && (
                          <>
                            <p className="mt-1.5 font-body text-[11px] text-ink-muted">
                              {m.slotAdvice.conflictWith ? 'ลองเวลาพวกนี้แทนไหม?' : 'ช่วงอื่นที่ยังว่างในวันใกล้ๆ'}
                            </p>
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              {m.slotAdvice.suggestions.map((sg) => (
                                <button
                                  key={`${sg.date}-${sg.startTime}`}
                                  onClick={() => addDraftToCalendar(m.draft!, sg)}
                                  className="flex items-center gap-1 rounded-full border border-eddy-200 bg-white px-2.5 py-1 font-display text-[11px] font-semibold text-eddy-700 transition-colors hover:bg-eddy-50"
                                >
                                  <Clock size={11} /> {sg.label}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {m.added ? (
                      <p className="mt-2 flex items-center gap-1 font-display text-xs font-semibold text-eddy-700">
                        <Check size={14} /> เพิ่มแล้ว
                      </p>
                    ) : m.draft.intent === 'event' ? (
                      <button
                        onClick={() => addDraftToCalendar(m.draft!)}
                        className="mt-2 flex items-center gap-1 rounded-clay-sm bg-eddy-500 px-3 py-1.5 font-display text-xs font-semibold text-white"
                      >
                        <CalendarPlus size={14} />{' '}
                        {m.slotAdvice ? `ใช้เวลาเดิม${m.draft.startTime ? ` (${m.draft.startTime})` : ''}` : 'เพิ่มลงปฏิทิน'}
                      </button>
                    ) : (
                      <button
                        onClick={() => addDraftToTodo(m.id, m.draft!)}
                        className="mt-2 flex items-center gap-1 rounded-clay-sm bg-eddy-500 px-3 py-1.5 font-display text-xs font-semibold text-white"
                      >
                        <ListPlus size={14} /> เพิ่มในสิ่งที่ต้องทำ
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="max-w-[60%] rounded-clay-sm bg-white px-4 py-2.5 font-body text-sm text-ink-muted shadow-clay-sm">
                เอ็ดดี้กำลังพิมพ์...
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="flex items-center gap-2 border-t border-eddy-100 bg-white p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="พิมพ์ข้อความถึงเอ็ดดี้..."
              className="flex-1 rounded-clay-sm bg-eddy-50 px-4 py-2.5 font-body text-sm text-ink placeholder:text-ink-muted focus:outline-none"
            />
            <button
              type="submit"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-eddy-500 text-white disabled:opacity-50"
              disabled={loading}
              aria-label="ส่งข้อความ"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
