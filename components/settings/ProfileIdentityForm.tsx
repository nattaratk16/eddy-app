'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Check, AtSign } from 'lucide-react';
import Button from '../Button';
import { useToast } from '../ToastProvider';
import { inputClass, labelClass } from './fieldStyles';
import { PASTEL_COLORS, getColorOption } from '@/lib/colors';
import type { PastelColor } from '@/lib/types';

const EMOJI_PRESETS = ['😀', '😎', '🧑‍💻', '📚', '☕', '🌙', '🚀', '🎯', '🐱', '🌸', '⚡', '🎧'];
const BIO_MAX = 500; // ต้องตรงกับ BIO_MAX ใน app/api/profile/route.ts

interface ProfileIdentityFormProps {
  email: string;
  image: string; // รูปจากบัญชี Google - แสดงอย่างเดียว แก้ไม่ได้
  initialName: string;
  initialUsername: string;
  initialTitle: string;
  initialOrganization: string;
  initialBio: string;
  initialAvatarColor: string;
  initialAvatarEmoji: string;
}

export default function ProfileIdentityForm(p: ProfileIdentityFormProps) {
  const router = useRouter();
  const { update } = useSession();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState(p.initialName);
  const [username, setUsername] = useState(p.initialUsername);
  const [title, setTitle] = useState(p.initialTitle);
  const [organization, setOrganization] = useState(p.initialOrganization);
  const [bio, setBio] = useState(p.initialBio);
  const [avatarColor, setAvatarColor] = useState<PastelColor>((p.initialAvatarColor as PastelColor) || 'blue');
  const [avatarEmoji, setAvatarEmoji] = useState(p.initialAvatarEmoji);

  const hasPhoto = Boolean(p.image);
  const color = getColorOption(avatarColor);
  const initial = (name || p.email).charAt(0).toUpperCase();

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    // ส่งเฉพาะฟิลด์ของแท็บนี้ - API เช็คทีละช่อง (field-by-field) ค่าที่ไม่ได้ส่งจะไม่ถูกแตะ
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, username, title, organization, bio, avatarColor, avatarEmoji }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return setError(data.error ?? 'บันทึกไม่สำเร็จ ลองใหม่อีกครั้งนะ');
    }
    toast.success('บันทึกโปรไฟล์แล้ว');
    // อัปเดต JWT ของ next-auth ให้ดึงชื่อ/รูปใหม่จาก DB (ดู jwt callback ใน auth.ts) ก่อน refresh
    // ไม่งั้น Sidebar กับคำทักทาย "สวัสดี, ..." จะยังเป็นชื่อเดิม เพราะ router.refresh() ไม่แตะ session
    await update();
    router.refresh();
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-6">
      {/* ---------- อวาตาร์ ---------- */}
      <div>
        <h2 className="font-display text-h3 text-ink">อวาตาร์</h2>
        <div className="mt-3 flex items-center gap-4">
          {hasPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.image} alt={name} className="h-20 w-20 flex-shrink-0 rounded-full object-cover shadow-clay-sm" />
          ) : (
            <div
              className={`flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full text-3xl font-bold shadow-clay-sm ${color.chipClass}`}
            >
              {avatarEmoji || initial}
            </div>
          )}
          {hasPhoto && <p className="font-body text-sm text-ink-muted">ใช้รูปจากบัญชีอีเมลของคุณ</p>}
        </div>

        {!hasPhoto && (
          <div className="mt-4">
            <p className={labelClass}>สีพื้น</p>
            <div className="flex flex-wrap gap-2">
              {PASTEL_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setAvatarColor(c.value)}
                  aria-label={c.label}
                  className={`h-6 w-6 rounded-full ${c.swatchClass} ${
                    avatarColor === c.value ? 'scale-110 ring-2 ring-eddy-500 ring-offset-2' : ''
                  }`}
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
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-lg transition-colors ${
                    avatarEmoji === e ? 'bg-eddy-100 ring-2 ring-eddy-400' : 'hover:bg-eddy-50'
                  }`}
                >
                  {e}
                </button>
              ))}
              {avatarEmoji && (
                <button
                  type="button"
                  onClick={() => setAvatarEmoji('')}
                  className="ml-1 font-body text-xs text-ink-muted hover:text-ink"
                >
                  ล้าง
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ---------- ตัวตน ---------- */}
      <div className="border-t border-eddy-100 pt-5">
        <h2 className="font-display text-h3 text-ink">ตัวตน</h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          <div>
            <label className={labelClass} htmlFor="pf-title">บทบาท / ตำแหน่ง</label>
            <input
              id="pf-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="เช่น นักศึกษาวิศวกรรม, นักการตลาด"
              maxLength={80}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="pf-org">สถานศึกษา / ที่ทำงาน</label>
            <input
              id="pf-org"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              placeholder="เช่น มหาวิทยาลัย..., บริษัท..."
              maxLength={120}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* ---------- เกี่ยวกับฉัน ---------- */}
      <div className="border-t border-eddy-100 pt-5">
        <h2 className="font-display text-h3 text-ink">เกี่ยวกับฉัน</h2>
        <p className="mt-0.5 font-body text-caption text-ink-muted">
          เล่าสไตล์การทำงานของคุณสั้นๆ — เพื่อนในกลุ่มเห็น และเอ็ดดี้ใช้เป็นบริบทตอนช่วยวางแผนงานให้
        </p>
        <textarea
          id="pf-bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={4}
          maxLength={BIO_MAX}
          placeholder="เช่น ชอบทำงานตอนเช้า สมาธิสั้นตอนบ่าย ถนัดงานออกแบบมากกว่างานเอกสาร"
          className={`${inputClass} mt-3 resize-y`}
        />
        <p className="mt-1.5 text-right font-body text-xs text-ink-muted">{bio.length}/{BIO_MAX}</p>
      </div>

      {error && <p className="rounded-clay-sm bg-pastel-pink/60 px-3 py-2 font-body text-sm text-chip-ink dark:bg-pastel-pink-dark/20 dark:text-pastel-pink-dark">{error}</p>}

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
