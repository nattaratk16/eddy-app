'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, CalendarPlus, ListPlus, Check, AlertTriangle, Clock, Trash2 } from 'lucide-react';
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
    text: 'สวัสดี! ผมเอ็ดดี้ ผู้ช่วยของคุณ พิมพ์สิ่งที่อยากทำมาได้เลย เดี๋ยวผมแปลงเป็นกิจกรรมหรือสิ่งที่ต้องทำให้',
  },
];

/** ตัวอย่างให้กดเริ่มบทสนทนา - โผล่เฉพาะตอนยังไม่มีประวัติแชท */
const STARTERS = ['นัดหมอฟันพุธหน้าบ่ายสาม', 'อ่านหนังสือสอบ', 'ประชุมกลุ่มพรุ่งนี้ 10 โมง'];

/** "2026-09-10" -> "พ. 10 ก.ย." (เป็นป้ายวันที่ล้วน อ่านเป็น UTC ไม่ให้เลื่อนตามโซนเวลาเครื่อง) */
function thaiDay(iso?: string): string {
  if (!iso) return '';
  const d = new Date(`${iso.slice(0, 10)}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
}

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
  }, [messages, open, loading]);

  // ปิดด้วย Escape เหมือน Modal ตัวอื่นในแอป
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

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

  /** preset = ข้อความจากปุ่มตัวอย่าง (ไม่ได้พิมพ์เอง) */
  async function sendMessage(preset?: string) {
    const text = (preset ?? input).trim();
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

  // ยังไม่ได้คุยอะไรเลย -> เสนอตัวอย่างให้กด (ช่วยให้รู้ว่าพิมพ์แบบไหนได้บ้าง)
  const showStarters = !loadingHistory && messages.length === 1 && messages[0].id === 'welcome';

  return (
    <>
      {/* ปุ่มลอยเปิดแชท - การ์ดขาวเงาลึกให้เข้าชุดกับการ์ดอื่นในแอป (เดิมเป็นวงกลมดำทึบ หนักกว่าทั้งหน้า) */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-24 right-6 z-40 flex h-16 w-16 items-center justify-center rounded-full border border-surface bg-surface shadow-clay-pop ring-1 ring-eddy-100 transition-transform hover:scale-105 active:scale-95 md:bottom-8 md:right-8"
        aria-label={open ? 'ปิดแชทกับเอ็ดดี้' : 'เปิดแชทกับเอ็ดดี้'}
      >
        {open ? <X size={24} className="text-ink" /> : <EddyMascot size={44} float={false} />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            style={{ transformOrigin: 'bottom right' }}
            // จอใหญ่ขยายทั้งกว้างและสูง (มือถือ 400x560 -> เดสก์ท็อป 460x640 -> จอกว้าง 520x720)
            // max-h ผูกกับ 100vh ไว้เสมอ กันกล่องล้นจอบนโน้ตบุ๊กจอเตี้ย
            className="fixed bottom-44 right-4 z-40 flex h-[560px] max-h-[calc(100vh-13rem)] w-[92vw] max-w-[400px] flex-col overflow-hidden rounded-clay-lg border border-eddy-100 bg-surface shadow-clay-pop md:bottom-28 md:right-8 md:h-[640px] md:max-h-[calc(100vh-11rem)] md:max-w-[460px] lg:h-[720px] lg:max-w-[520px]"
          >
            {/* ---------- หัวแชท ---------- */}
            <div className="flex items-center gap-3 border-b border-eddy-100 px-4 py-3">
              <span className="relative flex-shrink-0">
                <EddyMascot size={34} float={false} />
                <span className="absolute -bottom-0.5 -right-1 h-2.5 w-2.5 rounded-full bg-brand-green ring-2 ring-surface" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-body font-semibold text-ink">เอ็ดดี้</p>
                <p className="font-body text-micro text-ink-muted">พร้อมช่วยจัดตารางให้คุณ</p>
              </div>
              <button
                onClick={clearHistory}
                aria-label="ล้างประวัติแชท"
                title="ล้างประวัติแชท"
                className="rounded-full p-2 text-ink-muted transition-colors hover:bg-eddy-50 hover:text-ink"
              >
                <Trash2 size={15} />
              </button>
              <button
                onClick={() => setOpen(false)}
                aria-label="ปิดแชท"
                className="rounded-full p-2 text-ink-muted transition-colors hover:bg-eddy-50 hover:text-ink"
              >
                <X size={17} />
              </button>
            </div>

            {/* ---------- บทสนทนา ---------- */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 pb-4 pt-1">
              {loadingHistory && (
                <p className="py-6 text-center font-body text-caption text-ink-muted">กำลังโหลดบทสนทนาก่อนหน้า...</p>
              )}

              {messages.map((m, i) => {
                const eddy = m.role === 'eddy';
                // ข้อความติดกันของคนเดียวกันเว้นห่างน้อยลง + โชว์อวาตาร์เฉพาะข้อความแรกของชุด
                const sameAsPrev = i > 0 && messages[i - 1].role === m.role;
                return (
                  <div key={m.id} className={sameAsPrev ? 'mt-1' : 'mt-4'}>
                    <div className={`flex gap-2 ${eddy ? 'justify-start' : 'justify-end'}`}>
                      {eddy && (
                        <span className="flex w-7 flex-shrink-0 items-end">
                          {!sameAsPrev && <EddyMascot size={26} float={false} still />}
                        </span>
                      )}
                      <div
                        className={`max-w-[78%] px-3.5 py-2.5 font-body text-body ${
                          eddy
                            ? 'rounded-[18px] rounded-bl-[6px] bg-eddy-50 text-ink'
                            : 'rounded-[18px] rounded-br-[6px] bg-inverse text-white'
                        }`}
                      >
                        {m.text}
                      </div>
                    </div>

                    {/* การ์ดเสนอเพิ่มกิจกรรม/สิ่งที่ต้องทำ จากข้อความที่ Gemini แปลงได้ */}
                    {m.draft && (
                      <div className="ml-9 mt-2 max-w-[86%] overflow-hidden rounded-clay-sm border border-eddy-100 bg-surface shadow-clay-sm">
                        <div className="flex items-center gap-2 border-b border-eddy-100 bg-eddy-50/60 px-3 py-2">
                          <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-surface text-eddy-600 shadow-clay-sm">
                            {m.draft.intent === 'event' ? <CalendarPlus size={13} /> : <ListPlus size={13} />}
                          </span>
                          <p className="font-display text-micro font-semibold tracking-wide text-ink-soft">
                            {m.draft.intent === 'event' ? 'กิจกรรมใหม่' : 'สิ่งที่ต้องทำใหม่'}
                          </p>
                        </div>

                        <div className="px-3 py-2.5">
                          <p className="font-display text-body font-semibold text-ink">{m.draft.title}</p>
                          {m.draft.intent === 'event' && m.draft.date && (
                            <p className="mt-1 flex items-center gap-1.5 font-body text-caption text-ink-muted">
                              <Clock size={12} className="flex-shrink-0" />
                              {thaiDay(m.draft.date)}
                              {m.draft.startTime ? ` · ${m.draft.startTime} น.` : ''}
                            </p>
                          )}

                          {/* วันนั้นชนของเดิม/แน่นเกินไป - เสนอเวลาอื่นให้เลือก */}
                          {!m.added && m.draft.intent === 'event' && m.slotAdvice && (
                            <div className="mt-2.5 rounded-clay-sm bg-pastel-amber/40 p-2.5">
                              <p className="flex items-start gap-1.5 font-body text-caption text-ink">
                                <AlertTriangle size={13} className="mt-0.5 flex-shrink-0 text-brand-orange-ink" />
                                {m.slotAdvice.message}
                              </p>
                              {m.slotAdvice.suggestions.length > 0 && (
                                <>
                                  <p className="mt-2 font-body text-micro text-ink-soft">
                                    {m.slotAdvice.conflictWith ? 'ลองเวลาพวกนี้แทนไหม?' : 'ช่วงอื่นที่ยังว่างในวันใกล้ๆ'}
                                  </p>
                                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                                    {m.slotAdvice.suggestions.map((sg) => (
                                      <button
                                        key={`${sg.date}-${sg.startTime}`}
                                        onClick={() => addDraftToCalendar(m.draft!, sg)}
                                        className="flex items-center gap-1 rounded-full border border-eddy-200 bg-surface px-2.5 py-1 font-display text-micro font-semibold text-eddy-700 transition-colors hover:bg-eddy-50"
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
                            <p className="mt-2.5 flex items-center gap-1.5 font-display text-caption font-semibold text-brand-green">
                              <Check size={14} /> เพิ่มแล้ว
                            </p>
                          ) : m.draft.intent === 'event' ? (
                            <button
                              onClick={() => addDraftToCalendar(m.draft!)}
                              className="mt-2.5 flex items-center gap-1.5 rounded-full bg-gradient-to-r from-eddy-500 to-accent-500 px-3.5 py-1.5 font-display text-caption font-semibold text-white shadow-clay-sm transition-all hover:brightness-110 active:scale-95"
                            >
                              <CalendarPlus size={14} />
                              {m.slotAdvice ? `ใช้เวลาเดิม${m.draft.startTime ? ` (${m.draft.startTime})` : ''}` : 'เพิ่มลงปฏิทิน'}
                            </button>
                          ) : (
                            <button
                              onClick={() => addDraftToTodo(m.id, m.draft!)}
                              className="mt-2.5 flex items-center gap-1.5 rounded-full bg-gradient-to-r from-eddy-500 to-accent-500 px-3.5 py-1.5 font-display text-caption font-semibold text-white shadow-clay-sm transition-all hover:brightness-110 active:scale-95"
                            >
                              <ListPlus size={14} /> เพิ่มในสิ่งที่ต้องทำ
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {showStarters && (
                <div className="ml-9 mt-3 flex flex-wrap gap-1.5">
                  {STARTERS.map((s) => (
                    <button
                      key={s}
                      onClick={() => sendMessage(s)}
                      className="rounded-full border border-eddy-200 bg-surface px-3 py-1.5 font-body text-caption text-eddy-700 transition-colors hover:bg-eddy-50"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {loading && (
                <div className="mt-4 flex gap-2">
                  <span className="flex w-7 flex-shrink-0 items-end">
                    <EddyMascot size={26} float={false} still />
                  </span>
                  <div className="flex items-center gap-1 rounded-[18px] rounded-bl-[6px] bg-eddy-50 px-4 py-3.5">
                    {[0, 1, 2].map((d) => (
                      <span
                        key={d}
                        className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-eddy-400"
                        style={{ animationDelay: `${d * 0.18}s` }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ---------- ช่องพิมพ์ ---------- */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }}
              className="border-t border-eddy-100 p-3"
            >
              <div className="flex items-center gap-2 rounded-full bg-eddy-50 py-1.5 pl-4 pr-1.5 transition-shadow focus-within:ring-2 focus-within:ring-eddy-500/20">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="พิมพ์ข้อความถึงเอ็ดดี้..."
                  className="min-w-0 flex-1 bg-transparent py-1.5 font-body text-body text-ink placeholder:text-ink-muted focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  aria-label="ส่งข้อความ"
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-eddy-500 to-accent-500 text-white shadow-clay-sm transition-all hover:brightness-110 active:scale-95 disabled:from-eddy-200 disabled:to-eddy-200 disabled:shadow-none"
                >
                  <Send size={16} />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
