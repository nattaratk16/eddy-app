'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Check, AtSign, Shuffle, Wand2, UserRound } from 'lucide-react';
import Button from '../Button';
import UserAvatar from '../UserAvatar';
import { useToast } from '../ToastProvider';
import { inputClass, labelClass } from './fieldStyles';
import { AVATAR_STYLES, buildDicebearUrl, randomAvatarSeed, type AvatarStyle } from '@/lib/avatar';

const SEED_GRID_SIZE = 8;

interface ProfileIdentityFormProps {
  email: string;
  image: string; // รูปจากบัญชี Google - ซิงก์อัตโนมัติ ใช้เป็นค่าเริ่มต้นถ้ายังไม่ได้เลือกอวาตาร์การ์ตูนเอง
  initialName: string;
  initialUsername: string;
  initialTitle: string;
  initialOrganization: string;
  initialAvatarStyle: string;
  initialAvatarSeed: string;
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

  const hasPhoto = Boolean(p.image);
  // ถ้ามีรูป Google อยู่แล้วและยังไม่เคยเลือกอวาตาร์การ์ตูนมาก่อน (initialAvatarStyle ว่าง) ต้องเริ่มที่
  // สถานะ "ใช้รูป Google" ไว้ก่อน (avatarStyle ว่าง) ไม่ใช่สุ่มเลือกสไตล์แรกให้อัตโนมัติ - ไม่งั้นทุกครั้งที่
  // เปิดหน้านี้ ฟอร์มจะเผลอ "เลือก" อวาตาร์การ์ตูนให้เองโดยที่ผู้ใช้ไม่ได้ตั้งใจ แล้วถ้าบันทึกอย่างอื่น
  // (เช่น แก้ชื่อ) โดยไม่ทันสังเกต จะเผลอทับค่า "ใช้รูป Google" ที่เคยตั้งใจเลือกไว้ไปโดยไม่รู้ตัว
  // (คนที่ไม่มีรูป Google ไม่มีทางเลือกอื่น เลยค่อยสุ่มสไตล์แรกให้เป็นค่าเริ่มต้นแทน)
  const [avatarStyle, setAvatarStyle] = useState(
    p.initialAvatarStyle || (hasPhoto ? '' : AVATAR_STYLES[0].value),
  );
  const [seedGrid, setSeedGrid] = useState<string[]>(() => {
    const seeds = p.initialAvatarSeed ? [p.initialAvatarSeed] : [];
    while (seeds.length < SEED_GRID_SIZE) seeds.push(randomAvatarSeed());
    return seeds;
  });
  const [avatarSeed, setAvatarSeed] = useState(p.initialAvatarSeed || (hasPhoto ? '' : seedGrid[0]));

  // ใช้รูป Google ได้ก็ต่อเมื่อยังไม่เคยเลือกอวาตาร์การ์ตูนไว้เลย (ตอนเปิดหน้าครั้งแรก) หรือตั้งใจเคลียร์ทิ้ง
  // (กดปุ่ม "ใช้รูปจาก Google แทน")
  const showingGoogleFallback = hasPhoto && !avatarStyle;

  function shuffleSeeds() {
    setSeedGrid(Array.from({ length: SEED_GRID_SIZE }, () => randomAvatarSeed()));
  }

  function pickDicebearStyle(style: AvatarStyle) {
    setAvatarStyle(style);
    // สไตล์ใหม่ - เคลียร์ seed ที่เลือกไว้ด้วย กันกรณี seed เดิม (เลือกไว้ตอนดูสไตล์อื่น) ถูกบันทึกไป
    // ทั้งที่ผู้ใช้ไม่เคยเห็น/กดเลือกมันภายใต้สไตล์ใหม่นี้เลย ต้องกดเลือกจากกริดใหม่อีกครั้ง
    const freshSeeds = Array.from({ length: SEED_GRID_SIZE }, () => randomAvatarSeed());
    setSeedGrid(freshSeeds);
    setAvatarSeed(freshSeeds[0]);
  }

  function resetToGooglePhoto() {
    setAvatarStyle('');
    setAvatarSeed('');
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        username,
        title,
        organization,
        avatarStyle,
        avatarSeed,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return setError(data.error ?? 'บันทึกไม่สำเร็จ ลองใหม่อีกครั้งนะ');
    }
    toast.success('บันทึกโปรไฟล์แล้ว');
    // อัปเดต JWT ของ next-auth ให้ดึงชื่อ/รูป/อวาตาร์ใหม่จาก DB (ดู jwt callback ใน auth.ts) ก่อน refresh
    // ไม่งั้น Sidebar กับคำทักทาย "สวัสดี, ..." จะยังเป็นของเดิม เพราะ router.refresh() ไม่แตะ session
    // ต้องส่ง argument (แม้จะเป็น {} เฉยๆ) ไม่งั้น next-auth จะแค่ GET session เดิมกลับมาเฉยๆ ไม่ได้
    // ยิง POST ไปเรียก jwt callback ใหม่จริงๆ (เจอบั๊กนี้ตอนทดสอบ - เรียก update() เปล่าๆ แล้วอวาตาร์/ชื่อ
    // ใน Sidebar ไม่เคยอัปเดตเลยจนกว่าจะออกจากระบบแล้วเข้าใหม่)
    await update({});
    router.refresh();
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-6">
      {/* ---------- อวาตาร์ ---------- */}
      <div>
        <h2 className="font-display text-h3 text-ink">อวาตาร์</h2>
        <div className="mt-3 flex items-center gap-4">
          <UserAvatar
            name={name || p.email}
            image={showingGoogleFallback ? p.image : undefined}
            avatarStyle={!showingGoogleFallback ? avatarStyle : undefined}
            avatarSeed={!showingGoogleFallback ? avatarSeed : undefined}
            size={80}
            className="shadow-clay-sm"
          />
          {showingGoogleFallback && <p className="font-body text-sm text-ink-muted">ใช้รูปจากบัญชี Google อยู่ตอนนี้</p>}
        </div>

        {showingGoogleFallback ? (
          // avatarStyle ว่างอยู่ตอนนี้ (เพิ่งกด "ใช้รูปจาก Google แทน") - ต้องซ่อนตัวเลือกสไตล์/หน้าตา
          // ไปเลย ไม่ใช่โชว์ไว้เฉยๆ เพราะ buildDicebearUrl('', seed) จะได้ URL พัง (ไม่มีสไตล์ใน path)
          // กลายเป็นรูปเสียทั้งกริดจนกว่าจะกดเลือกสไตล์ใหม่
          <button
            type="button"
            onClick={() => pickDicebearStyle(AVATAR_STYLES[0].value)}
            className="mt-4 flex items-center gap-2 rounded-full bg-eddy-500 px-5 py-2.5 font-display text-sm font-semibold text-white shadow-clay-sm transition-all duration-150 hover:brightness-110 active:scale-[0.97]"
          >
            <Wand2 size={16} /> ลองเปลี่ยนเป็นอวาตาร์การ์ตูนดูไหม
          </button>
        ) : (
          <div className="mt-4">
            <p className={labelClass}>สไตล์</p>
            {/* grid เท่ากันทุกปุ่มแทน flex-wrap เดิม (ความยาวข้อความไม่เท่ากันทำให้ปุ่มกว้างไม่เท่ากัน ดูไม่สมมาตร) */}
            <div className="grid grid-cols-4 gap-1.5">
              {AVATAR_STYLES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => pickDicebearStyle(s.value)}
                  className={`rounded-full py-1.5 font-body text-xs font-semibold transition-colors ${
                    avatarStyle === s.value
                      ? 'bg-eddy-500 text-white'
                      : 'bg-eddy-50 text-ink-soft hover:bg-eddy-100'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <p className={`${labelClass} mt-3`}>เลือกหน้าตา</p>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
              {seedGrid.map((seed) => (
                <button
                  key={seed}
                  type="button"
                  onClick={() => setAvatarSeed(seed)}
                  aria-label="เลือกอวาตาร์นี้"
                  className={`overflow-hidden rounded-full border-2 transition-colors ${
                    avatarSeed === seed ? 'border-eddy-500' : 'border-transparent hover:border-eddy-200'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- SVG จาก DiceBear */}
                  <img src={buildDicebearUrl(avatarStyle, seed)} alt="" width={48} height={48} className="h-12 w-12" />
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={shuffleSeeds}
              className="mt-3 flex items-center gap-1.5 font-body text-xs font-semibold text-eddy-600 hover:text-eddy-700"
            >
              <Shuffle size={13} /> สุ่มหน้าใหม่
            </button>
          </div>
        )}

        {hasPhoto && !showingGoogleFallback && (
          <button
            type="button"
            onClick={resetToGooglePhoto}
            className="mt-3 flex items-center gap-1.5 rounded-full bg-eddy-50 px-4 py-2 font-body text-xs font-semibold text-eddy-700 transition-colors hover:bg-eddy-100"
          >
            <UserRound size={14} /> ใช้รูปจาก Google แทน
          </button>
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
