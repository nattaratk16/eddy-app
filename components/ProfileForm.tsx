'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, AtSign, Sparkles } from 'lucide-react';
import Button from './Button';
import TimePicker from './TimePicker';
import { PASTEL_COLORS, getColorOption } from '@/lib/colors';
import type { PastelColor } from '@/lib/types';

interface ProfileFormProps {
  email: string;
  image: string; // รูปจากบัญชีอีเมล (OAuth) - แสดงอย่างเดียว แก้ไม่ได้
  initialName: string;
  initialUsername: string;
  initialBio: string;
  initialAvatarColor: string;
  initialAvatarEmoji: string;
  initialTimezone: string;
  initialDayStart: string;
  initialDayEnd: string;
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
const BIO_MAX = 500;

export default function ProfileForm(p: ProfileFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const [name, setName] = useState(p.initialName);
  const [username, setUsername] = useState(p.initialUsername);
  const [bio, setBio] = useState(p.initialBio);
  const [avatarColor, setAvatarColor] = useState<PastelColor>((p.initialAvatarColor as PastelColor) || 'blue');
  const [avatarEmoji, setAvatarEmoji] = useState(p.initialAvatarEmoji);
  const [timezone, setTimezone] = useState(p.initialTimezone || 'Asia/Bangkok');
  const [dayStart, setDayStart] = useState(p.initialDayStart);
  const [dayEnd, setDayEnd] = useState(p.initialDayEnd);

  const hasPhoto = Boolean(p.image);
  const color = getColorOption(avatarColor);
  const initial = (name || p.email).charAt(0).toUpperCase();

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, username, bio, avatarColor, avatarEmoji, timezone, dayStart, dayEnd }),
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
      {/* ---------- อวาตาร์ ---------- */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {hasPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.image} alt={name} className="h-20 w-20 flex-shrink-0 rounded-full object-cover shadow-clay-sm" />
        ) : (
          <div className={`flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full text-3xl font-bold shadow-clay-sm ${color.chipClass}`}>
            {avatarEmoji || initial}
          </div>
        )}
        {hasPhoto ? (
          <p className="font-body text-sm text-ink-muted">ใช้รูปจากบัญชีอีเมลของคุณ</p>
        ) : (
          <div className="flex-1">
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
        <h3 className="mb-3 font-display text-h3 text-ink">ตัวตน</h3>
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
          <div className="sm:col-span-2">
            <label className={labelClass} htmlFor="pf-bio">เกี่ยวกับฉัน / นิสัย</label>
            <textarea
              id="pf-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={BIO_MAX}
              rows={4}
              placeholder="เล่าว่าคุณเป็นคนแบบไหน ชอบทำอะไร มีนิสัยการทำงาน/พักผ่อนยังไง เช่น ชอบทำงานตอนเช้า สมาธิสั้นช่วงบ่าย ชอบออกกำลังกาย..."
              className={inputClass}
            />
            <div className="mt-1 flex items-center justify-between">
              <p className="flex items-center gap-1 font-body text-xs text-eddy-600">
                <Sparkles size={12} /> เอ็ดดี้ใช้ข้อมูลนี้ช่วยวิเคราะห์และวางแผนให้เหมาะกับคุณ
              </p>
              <p className="font-body text-xs text-ink-muted">{bio.length}/{BIO_MAX}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ---------- เวลาที่สะดวก ---------- */}
      <div>
        <h3 className="font-display text-h3 text-ink">เวลาที่สะดวก</h3>
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
