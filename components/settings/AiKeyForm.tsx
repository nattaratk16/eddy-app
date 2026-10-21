'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, KeyRound, Trash2, ExternalLink } from 'lucide-react';
import Button from '../Button';
import { useToast } from '../ToastProvider';
import { inputClass, labelClass } from './fieldStyles';

interface AiKeyFormProps {
  hasKey: boolean;
  /** 4 ตัวท้ายของ key ที่ตั้งไว้แล้ว (ถ้ามี) - ใช้โชว์ยืนยันว่าคือ key ไหนโดยไม่ต้องส่ง key เต็มกลับมา */
  last4: string | null;
}

export default function AiKeyForm({ hasKey, last4 }: AiKeyFormProps) {
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = useState(!hasKey);
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState('');

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const v = apiKey.trim();
    if (!v) return setError('กรุณากรอก API key');
    setSaving(true);
    setError('');
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ geminiApiKey: v }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return setError(data.error ?? 'บันทึกไม่สำเร็จ ลองใหม่อีกครั้งนะ');
    }
    toast.success('บันทึก API key แล้ว');
    setApiKey('');
    setEditing(false);
    router.refresh();
  }

  async function removeKey() {
    setRemoving(true);
    setError('');
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ geminiApiKey: '' }),
    });
    setRemoving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return setError(data.error ?? 'ลบไม่สำเร็จ ลองใหม่อีกครั้งนะ');
    }
    toast.success('ลบ API key แล้ว');
    setEditing(true);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-h3 text-ink">Gemini API key</h2>
        <p className="mt-0.5 font-body text-caption text-ink-muted">
          ฟีเจอร์ AI ทั้งหมดของเอ็ดดี้ (แชท, วิเคราะห์ตาราง, แตกงานย่อย, กระจายงานกลุ่ม ฯลฯ) ใช้ Gemini
          API key ของคุณเอง ไม่มี key กลางของระบบให้แล้ว ต้องตั้งค่าที่นี่ก่อนถึงจะใช้ฟีเจอร์ AI ได้
        </p>
        <a
          href="https://aistudio.google.com/app/apikey"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1 font-body text-sm font-medium text-eddy-600 hover:underline"
        >
          ไปสร้าง API key ฟรีที่ Google AI Studio <ExternalLink size={13} />
        </a>
      </div>

      {!editing && hasKey ? (
        <div className="flex items-center justify-between gap-3 rounded-clay-sm border border-eddy-100 bg-eddy-50/60 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-clay-sm bg-pastel-green text-chip-ink">
              <KeyRound size={16} />
            </span>
            <div>
              <p className="font-display text-sm font-semibold text-ink">ตั้งค่าแล้ว</p>
              <p className="font-body text-xs text-ink-muted">ลงท้ายด้วย •••{last4}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-full border border-eddy-200 bg-surface px-3.5 py-1.5 font-display text-xs font-semibold text-ink-soft transition-colors hover:bg-eddy-50"
            >
              เปลี่ยน key
            </button>
            <button
              type="button"
              onClick={removeKey}
              disabled={removing}
              className="flex items-center gap-1 rounded-full border border-eddy-200 bg-surface px-3.5 py-1.5 font-display text-xs font-semibold text-ink-soft transition-colors hover:bg-pastel-pink/60 disabled:opacity-50"
            >
              <Trash2 size={13} /> {removing ? 'กำลังลบ...' : 'ลบ'}
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={save} className="flex flex-col gap-3">
          <div>
            <label className={labelClass} htmlFor="ai-key-input">Gemini API key</label>
            <input
              id="ai-key-input"
              type="password"
              autoComplete="off"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIza..."
              className={inputClass}
            />
          </div>
          {error && (
            <p className="rounded-clay-sm bg-pastel-pink/60 px-3 py-2 font-body text-sm text-chip-ink dark:bg-pastel-pink-dark/20 dark:text-pastel-pink-dark">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" disabled={saving} className="!rounded-full !bg-gradient-to-r !from-eddy-500 !to-accent-500 hover:!brightness-110">
              <span className="flex items-center gap-1.5">
                <Check size={16} /> {saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </span>
            </Button>
            {hasKey && (
              <button
                type="button"
                onClick={() => { setEditing(false); setError(''); setApiKey(''); }}
                className="rounded-full border border-eddy-200 bg-surface px-4 py-2.5 font-display text-caption font-semibold text-ink-soft transition-colors hover:bg-eddy-50"
              >
                ยกเลิก
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
