'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, AtSign, X, Plus, User, Tags, Clock, ListChecks, Users, type LucideIcon } from 'lucide-react';
import Button from './Button';
import TimePicker from './TimePicker';
import { PASTEL_COLORS, getColorOption } from '@/lib/colors';
import type { PastelColor } from '@/lib/types';

interface ProfileFormProps {
  email: string;
  image: string; // รูปจากบัญชีอีเมล (OAuth) - แสดงอย่างเดียว แก้ไม่ได้
  initialName: string;
  initialUsername: string;
  initialAvatarColor: string;
  initialAvatarEmoji: string;
  initialTimezone: string;
  initialDayStart: string;
  initialDayEnd: string;
  initialSkills: string[];
  initialMaxFocusMinutes: number | null;
  initialBufferMinutes: number | null;
  /** สถิติ/ข้อมูลบัญชี - แสดงในการ์ดตัวตนด้านบน (คำนวณฝั่งเซิร์ฟเวอร์ ไม่ต้องแก้ไข) */
  memberSinceLabel: string;
  completedTaskCount: number;
  groupCount: number;
}

function StatChip({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number }) {
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 font-body text-xs font-medium text-ink-soft shadow-clay-sm">
      <Icon size={13} className="text-eddy-600" />
      <span className="font-display font-bold text-ink">{value}</span> {label}
    </span>
  );
}

const inputClass =
  'w-full rounded-clay-sm border border-eddy-200 bg-white px-4 py-2.5 font-body text-sm text-ink transition-colors placeholder:text-ink-muted focus:border-eddy-400 focus:outline-none focus:ring-2 focus:ring-eddy-500/25';
const labelClass = 'mb-1.5 block font-display text-sm font-semibold text-ink-soft';

const EMOJI_PRESETS = ['😀', '😎', '🧑‍💻', '📚', '☕', '🌙', '🚀', '🎯', '🐱', '🌸', '⚡', '🎧'];
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

function segBtnClass(active: boolean) {
  return `rounded-full px-4 py-2 font-body text-sm font-medium transition-colors ${
    active ? 'bg-eddy-500 text-white' : 'bg-eddy-50 text-ink-soft hover:bg-eddy-100'
  }`;
}

export default function ProfileForm(p: ProfileFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const [name, setName] = useState(p.initialName);
  const [username, setUsername] = useState(p.initialUsername);
  const [avatarColor, setAvatarColor] = useState<PastelColor>((p.initialAvatarColor as PastelColor) || 'blue');
  const [avatarEmoji, setAvatarEmoji] = useState(p.initialAvatarEmoji);
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

  const hasPhoto = Boolean(p.image);
  const color = getColorOption(avatarColor);
  const initial = (name || p.email).charAt(0).toUpperCase();

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
    setSaved(false);
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        username,
        avatarColor,
        avatarEmoji,
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
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-6">
      {/* ---------- ปกโปรไฟล์แบบโซเชียล: แบนเนอร์ไล่สี + อวาตาร์ซ้อนทับ ---------- */}
      <div className="flex flex-col gap-4">
        {/* แบนเนอร์ - ยื่นชนขอบการ์ด (ยกเลิก padding ของ Card ที่ครอบอยู่ p-6) */}
        <div className="-mx-6 -mt-6 h-28 overflow-hidden rounded-t-clay bg-gradient-to-r from-eddy-500 via-accent-500 to-pastel-lilac-dark sm:h-32">
          <div className="relative h-full w-full">
            <div className="pointer-events-none absolute -right-6 -top-10 h-32 w-32 rounded-full bg-white/20 blur-2xl" />
            <div className="pointer-events-none absolute -left-10 bottom-0 h-28 w-28 rounded-full bg-white/15 blur-2xl" />
          </div>
        </div>

        {/* อวาตาร์ซ้อนทับขอบล่างแบนเนอร์ + ชื่อ/อีเมล เรียงข้างกันแบบหน้าโปรไฟล์โซเชียล */}
        <div className="-mt-14 flex flex-col gap-3 px-1 sm:flex-row sm:items-end sm:gap-4">
          {hasPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.image} alt={name} className="h-24 w-24 flex-shrink-0 rounded-full object-cover ring-4 ring-white shadow-clay-sm" />
          ) : (
            <div className={`flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-full text-3xl font-bold ring-4 ring-white shadow-clay-sm ${color.chipClass}`}>
              {avatarEmoji || initial}
            </div>
          )}
          <div className="min-w-0 flex-1 sm:pb-1">
            <p className="truncate font-display text-lg font-bold text-ink">{name || p.email}</p>
            {username && <p className="font-body text-sm text-ink-muted">@{username}</p>}
            <p className="mt-0.5 truncate font-body text-xs text-ink-muted">{p.email}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-eddy-100/80 pt-3.5">
          <StatChip icon={ListChecks} label="งานสำเร็จ" value={p.completedTaskCount} />
          <StatChip icon={Users} label="กลุ่ม" value={p.groupCount} />
          <span className="font-body text-xs text-ink-muted sm:ml-auto">เข้าร่วมเมื่อ {p.memberSinceLabel}</span>
        </div>

        {hasPhoto ? (
          <p className="border-t border-eddy-100/80 pt-3.5 font-body text-xs text-ink-muted">ใช้รูปจากบัญชีอีเมลของคุณ</p>
        ) : (
          <div className="border-t border-eddy-100/80 pt-3.5">
            <p className={labelClass}>สีอวาตาร์</p>
            <div className="flex flex-wrap gap-2">
              {PASTEL_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setAvatarColor(c.value)}
                  aria-label={c.label}
                  className={`h-6 w-6 rounded-full ${c.swatchClass} ${avatarColor === c.value ? 'scale-110 ring-2 ring-eddy-500 ring-offset-2' : ''}`}
                />
              ))}
            </div>
            <p className={`${labelClass} mt-3`}>อีโมจิ</p>
            <div className="flex flex-wrap items-center gap-1.5">
              {EMOJI_PRESETS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setAvatarEmoji(avatarEmoji === e ? '' : e)}
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-lg transition-colors ${avatarEmoji === e ? 'bg-eddy-100 ring-2 ring-eddy-400' : 'hover:bg-eddy-50'}`}
                >
                  {e}
                </button>
              ))}
              {avatarEmoji && (
                <button type="button" onClick={() => setAvatarEmoji('')} className="ml-1 font-body text-xs text-ink-muted hover:text-ink">
                  ล้าง
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ---------- ตัวตน ---------- */}
      <div>
        <h3 className="mb-3 flex items-center gap-1.5 font-display text-h3 text-ink">
          <User size={17} className="text-eddy-500" /> ตัวตน
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="pf-name">ชื่อที่แสดง</label>
            <input id="pf-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="ชื่อของคุณ" className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="pf-username">ชื่อผู้ใช้</label>
            <div className="relative">
              <AtSign size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                id="pf-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="username"
                className={`${inputClass} pl-9`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ---------- ทักษะและความถนัด ---------- */}
      <div>
        <h3 className="flex items-center gap-1.5 font-display text-h3 text-ink">
          <Tags size={17} className="text-eddy-500" /> ทักษะและความถนัด
        </h3>
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
                <button type="button" onClick={() => removeSkill(s)} aria-label={`ลบทักษะ ${s}`} className="text-eddy-700/60 transition-colors hover:text-eddy-700">
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
        <p className="mt-1.5 font-body text-xs text-ink-muted">{skills.length}/{MAX_SKILLS}</p>
      </div>

      {/* ---------- เวลาที่สะดวก ---------- */}
      <div>
        <h3 className="flex items-center gap-1.5 font-display text-h3 text-ink">
          <Clock size={17} className="text-eddy-500" /> เวลาที่สะดวก
        </h3>
        <p className="mt-0.5 font-body text-caption text-ink-muted">ช่วงเวลาที่คุณสะดวกทำงานในแต่ละวัน — เอ็ดดี้ใช้ช่วยหาเวลาว่างตอนจัดตารางกลุ่ม</p>
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
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
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
              <button
                type="button"
                onClick={() => setCustomFocusOpen(true)}
                className={segBtnClass(customFocusOpen)}
              >
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
            <p className="mt-1.5 font-body text-xs text-ink-muted">
              เอ็ดดี้จะไม่แตกขั้นตอนงานให้ยาวเกินนี้ตอนวางแผนงาน
            </p>
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
              <button
                type="button"
                onClick={() => setCustomBufferOpen(true)}
                className={segBtnClass(customBufferOpen)}
              >
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
            <p className="mt-1.5 font-body text-xs text-ink-muted">
              เว้นช่องว่างก่อน/หลังงานที่เอ็ดดี้จัดลงปฏิทินให้อัตโนมัติ
            </p>
          </div>
        </div>
      </div>

      {error && <p className="rounded-clay-sm bg-pastel-pink/60 px-3 py-2 font-body text-sm text-eddy-700">{error}</p>}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving} className="!rounded-full !bg-gradient-to-r !from-eddy-500 !to-accent-500 hover:!brightness-110">
          <span className="flex items-center gap-1.5">
            <Check size={16} /> {saving ? 'กำลังบันทึก...' : 'บันทึกโปรไฟล์'}
          </span>
        </Button>
        {saved && <span className="font-body text-sm font-semibold text-emerald-600">บันทึกแล้ว ✓</span>}
      </div>
    </form>
  );
}
