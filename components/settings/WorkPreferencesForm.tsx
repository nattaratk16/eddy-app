'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X, Plus } from 'lucide-react';
import Button from '../Button';
import TimePicker from '../TimePicker';
import { useToast } from '../ToastProvider';
import { inputClass, labelClass, segBtnClass } from './fieldStyles';

const TIMEZONES = [
  'Asia/Bangkok', 'Asia/Singapore', 'Asia/Jakarta', 'Asia/Tokyo', 'Asia/Kolkata',
  'Asia/Dubai', 'Europe/London', 'Europe/Paris', 'America/New_York', 'America/Los_Angeles',
  'Australia/Sydney', 'UTC',
];
const MAX_SKILLS = 20;
// ปุ่มเลือกสำเร็จรูป + "กำหนดเอง" (พิมพ์ค่าอื่นเองได้เสมอ) - ต้องตรงกับช่วงที่ยอมรับใน
// app/api/profile/route.ts (โฟกัส 15-240 นาที, buffer 0-120 นาที)
const MIN_FOCUS_MINUTES = 15;
const MAX_FOCUS_MINUTES = 240;
const FOCUS_PRESETS = [30, 45, 60, 90, 120, 180];
const MIN_BUFFER_MINUTES = 0;
const MAX_BUFFER_MINUTES = 120;
const BUFFER_PRESETS = [0, 5, 10, 15, 20, 30, 45];

interface WorkPreferencesFormProps {
  initialTimezone: string;
  initialDayStart: string;
  initialDayEnd: string;
  initialSkills: string[];
  initialMaxFocusMinutes: number | null;
  initialBufferMinutes: number | null;
}

export default function WorkPreferencesForm(p: WorkPreferencesFormProps) {
  const router = useRouter();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [timezone, setTimezone] = useState(p.initialTimezone || 'Asia/Bangkok');
  const [dayStart, setDayStart] = useState(p.initialDayStart);
  const [dayEnd, setDayEnd] = useState(p.initialDayEnd);
  const [skills, setSkills] = useState<string[]>(p.initialSkills);
  const [skillInput, setSkillInput] = useState('');
  const [maxFocusMinutes, setMaxFocusMinutes] = useState(p.initialMaxFocusMinutes ? String(p.initialMaxFocusMinutes) : '');
  const [bufferMinutes, setBufferMinutes] = useState(p.initialBufferMinutes ? String(p.initialBufferMinutes) : '');
  // เปิดช่องกรอกเองเมื่อค่าที่มีอยู่แล้วไม่ตรงกับปุ่มสำเร็จรูปตัวไหนเลย (เช่นมาจากการพิมพ์เองครั้งก่อน)
  const [customFocusOpen, setCustomFocusOpen] = useState(
    p.initialMaxFocusMinutes != null && !FOCUS_PRESETS.includes(p.initialMaxFocusMinutes),
  );
  const [customBufferOpen, setCustomBufferOpen] = useState(
    p.initialBufferMinutes != null && !BUFFER_PRESETS.includes(p.initialBufferMinutes),
  );

  function addSkill() {
    const v = skillInput.trim();
    if (!v || skills.includes(v) || skills.length >= MAX_SKILLS) {
      setSkillInput('');
      return;
    }
    setSkills((prev) => [...prev, v]);
    setSkillInput('');
  }
  function removeSkill(skill: string) {
    setSkills((prev) => prev.filter((s) => s !== skill));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    // ส่งเฉพาะฟิลด์ของแท็บนี้ - API เช็คทีละช่อง ค่าที่ไม่ได้ส่ง (ชื่อ/อวาตาร์ ฯลฯ) จะไม่ถูกแตะ
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timezone,
        dayStart,
        dayEnd,
        skills,
        maxFocusMinutes: maxFocusMinutes ? Number(maxFocusMinutes) : null,
        bufferMinutes: bufferMinutes ? Number(bufferMinutes) : null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return setError(data.error ?? 'บันทึกไม่สำเร็จ ลองใหม่อีกครั้งนะ');
    }
    toast.success('บันทึกการตั้งค่าแล้ว');
    router.refresh();
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-6">
      {/* ---------- เวลาที่สะดวก ---------- */}
      <div>
        <h2 className="font-display text-h3 text-ink">เวลาที่สะดวก</h2>
        <p className="mt-0.5 font-body text-caption text-ink-muted">
          ช่วงเวลาที่คุณสะดวกทำงานในแต่ละวัน — เอ็ดดี้ใช้ช่วยหาเวลาว่างตอนจัดตารางกลุ่ม
        </p>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className={labelClass}>เริ่ม</label>
            <TimePicker id="pf-daystart" value={dayStart} onChange={setDayStart} />
          </div>
          <div>
            <label className={labelClass}>ถึง</label>
            <TimePicker id="pf-dayend" value={dayEnd} onChange={setDayEnd} />
          </div>
          <div>
            <label className={labelClass} htmlFor="pf-tz">โซนเวลา</label>
            <select id="pf-tz" value={timezone} onChange={(e) => setTimezone(e.target.value)} className={inputClass}>
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ---------- จังหวะการทำงาน ---------- */}
      <div className="border-t border-eddy-100 pt-5">
        <h2 className="font-display text-h3 text-ink">จังหวะการทำงาน</h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>ระยะเวลาโฟกัสต่อเนื่องสูงสุด</label>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => { setMaxFocusMinutes(''); setCustomFocusOpen(false); }}
                className={segBtnClass(maxFocusMinutes === '' && !customFocusOpen)}
              >
                ไม่ระบุ
              </button>
              {FOCUS_PRESETS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setMaxFocusMinutes(String(m)); setCustomFocusOpen(false); }}
                  className={segBtnClass(!customFocusOpen && maxFocusMinutes === String(m))}
                >
                  {m}
                </button>
              ))}
              <button type="button" onClick={() => setCustomFocusOpen(true)} className={segBtnClass(customFocusOpen)}>
                กำหนดเอง
              </button>
            </div>
            {customFocusOpen && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  id="pf-focus"
                  type="number"
                  inputMode="numeric"
                  min={MIN_FOCUS_MINUTES}
                  max={MAX_FOCUS_MINUTES}
                  step={5}
                  autoFocus
                  value={maxFocusMinutes}
                  onChange={(e) => setMaxFocusMinutes(e.target.value)}
                  placeholder={`${MIN_FOCUS_MINUTES}-${MAX_FOCUS_MINUTES}`}
                  className={inputClass}
                />
                <span className="flex-shrink-0 font-body text-sm text-ink-muted">นาที</span>
              </div>
            )}
            <p className="mt-1.5 font-body text-xs text-ink-muted">เอ็ดดี้จะไม่แตกขั้นตอนงานให้ยาวเกินนี้ตอนวางแผนงาน</p>
          </div>
          <div>
            <label className={labelClass}>เว้นช่วงพักระหว่างงาน</label>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => { setBufferMinutes(''); setCustomBufferOpen(false); }}
                className={segBtnClass(bufferMinutes === '' && !customBufferOpen)}
              >
                ไม่ระบุ
              </button>
              {BUFFER_PRESETS.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => { setBufferMinutes(String(b)); setCustomBufferOpen(false); }}
                  className={segBtnClass(!customBufferOpen && bufferMinutes === String(b))}
                >
                  {b}
                </button>
              ))}
              <button type="button" onClick={() => setCustomBufferOpen(true)} className={segBtnClass(customBufferOpen)}>
                กำหนดเอง
              </button>
            </div>
            {customBufferOpen && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  id="pf-buffer"
                  type="number"
                  inputMode="numeric"
                  min={MIN_BUFFER_MINUTES}
                  max={MAX_BUFFER_MINUTES}
                  step={5}
                  autoFocus
                  value={bufferMinutes}
                  onChange={(e) => setBufferMinutes(e.target.value)}
                  placeholder={`${MIN_BUFFER_MINUTES}-${MAX_BUFFER_MINUTES}`}
                  className={inputClass}
                />
                <span className="flex-shrink-0 font-body text-sm text-ink-muted">นาที</span>
              </div>
            )}
            <p className="mt-1.5 font-body text-xs text-ink-muted">เว้นช่องว่างก่อน/หลังงานที่เอ็ดดี้จัดลงปฏิทินให้อัตโนมัติ</p>
          </div>
        </div>
      </div>

      {/* ---------- ทักษะและความถนัด ---------- */}
      <div className="border-t border-eddy-100 pt-5">
        <h2 className="font-display text-h3 text-ink">ทักษะและความถนัด</h2>
        <p className="mt-0.5 font-body text-caption text-ink-muted">
          ตอนแตกงานกลุ่มแล้วให้เอ็ดดี้มอบหมายให้สมาชิก จะจับคู่ทักษะตรงนี้กับเนื้องานย่อยด้วย ไม่ใช่ดูแค่ใครว่างที่สุด
        </p>
        <div className="mt-3 flex gap-2">
          <input
            id="pf-skill-input"
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addSkill();
              }
            }}
            placeholder="เช่น ออกแบบ, เขียนโค้ด, นำเสนอ"
            maxLength={40}
            className={inputClass}
          />
          <button
            type="button"
            onClick={addSkill}
            disabled={!skillInput.trim() || skills.length >= MAX_SKILLS}
            className="flex flex-shrink-0 items-center gap-1 rounded-clay-sm bg-eddy-50 px-4 font-display text-sm font-semibold text-eddy-600 transition-colors hover:bg-eddy-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={15} /> เพิ่ม
          </button>
        </div>
        {skills.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {skills.map((s) => (
              <span key={s} className="flex items-center gap-1 rounded-full bg-pastel-blue px-3 py-1 font-body text-xs text-eddy-700">
                {s}
                <button
                  type="button"
                  onClick={() => removeSkill(s)}
                  aria-label={`ลบทักษะ ${s}`}
                  className="text-eddy-700/60 transition-colors hover:text-eddy-700"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
        <p className="mt-1.5 font-body text-xs text-ink-muted">{skills.length}/{MAX_SKILLS}</p>
      </div>

      {error && <p className="rounded-clay-sm bg-pastel-pink/60 px-3 py-2 font-body text-sm text-eddy-700">{error}</p>}

      <div>
        <Button type="submit" disabled={saving} className="!rounded-full !bg-gradient-to-r !from-eddy-500 !to-accent-500 hover:!brightness-110">
          <span className="flex items-center gap-1.5">
            <Check size={16} /> {saving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
          </span>
        </Button>
      </div>
    </form>
  );
}
