'use client';

import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import Modal from '@/components/Modal';
import { PASTEL_COLORS } from '@/lib/colors';
import type { GroupInfo, PastelColor } from '@/lib/types';

const NAME_MAX = 60;
const DESC_MAX = 200;

interface Props {
  open: boolean;
  onClose: () => void;
  group: GroupInfo;
  /** เรียกหลังบันทึกสำเร็จ - ให้หน้าที่ครอบอยู่โหลดข้อมูลกลุ่มใหม่ */
  onSaved: () => void;
}

/**
 * ตั้งค่ากลุ่ม - แก้ชื่อ/คำอธิบาย/สีประจำกลุ่ม
 *
 * PATCH /api/groups/[id] มีมาตั้งแต่แรกและตรวจสิทธิ์ "เจ้าของเท่านั้น" ให้อยู่แล้ว
 * แต่ไม่เคยมีหน้าจอไหนเรียกมันเลย ฟอร์มนี้คือส่วนที่ขาดไป
 * (ฝั่งเซิร์ฟเวอร์ยังเป็นด่านตัดสินสิทธิ์เหมือนเดิม การซ่อนปุ่มใน UI เป็นแค่ความสะดวก)
 */
export default function GroupSettingsModal({ open, onClose, group, onSaved }: Props) {
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description ?? '');
  const [color, setColor] = useState<PastelColor>(group.color);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // เปิดใหม่ทุกครั้งให้เริ่มจากค่าล่าสุดของกลุ่ม (เผื่อมีคนแก้จากที่อื่นระหว่างนั้น)
  useEffect(() => {
    if (!open) return;
    setName(group.name);
    setDescription(group.description ?? '');
    setColor(group.color);
    setError('');
  }, [open, group.name, group.description, group.color]);

  const dirty =
    name.trim() !== group.name || description.trim() !== (group.description ?? '') || color !== group.color;

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) return setError('ชื่อกลุ่มห้ามว่าง');

    setSaving(true);
    setError('');
    const res = await fetch(`/api/groups/${group.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: trimmed, description: description.trim(), color }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) return setError(data.error ?? 'บันทึกไม่สำเร็จ');
    onSaved();
    onClose();
  }

  const inputCls =
    'w-full rounded-clay-sm border border-eddy-200 bg-surface px-3.5 py-2.5 font-body text-body text-ink placeholder:text-ink-muted focus:border-eddy-400 focus:outline-none focus:ring-2 focus:ring-eddy-500/25';
  const labelCls = 'mb-1.5 block font-display text-caption font-semibold text-ink-soft';

  return (
    <Modal open={open} onClose={onClose} title="ตั้งค่ากลุ่ม" maxWidth="max-w-lg">
      <div className="flex flex-col gap-4">
        <div>
          <label className={labelCls} htmlFor="group-name">ชื่อกลุ่ม</label>
          <input
            id="group-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={NAME_MAX}
            className={inputCls}
            autoFocus
          />
        </div>

        <div>
          <label className={labelCls} htmlFor="group-desc">คำอธิบาย (ไม่บังคับ)</label>
          <textarea
            id="group-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={DESC_MAX}
            rows={3}
            placeholder="กลุ่มนี้เกี่ยวกับอะไร"
            className={`${inputCls} resize-none`}
          />
          <p className="mt-1 text-right font-body text-micro text-ink-muted">
            {description.length}/{DESC_MAX}
          </p>
        </div>

        <div>
          <p className={labelCls}>สีประจำกลุ่ม</p>
          <div className="flex flex-wrap gap-2">
            {PASTEL_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setColor(c.value)}
                aria-label={`สี${c.label}`}
                aria-pressed={color === c.value}
                className={`h-8 w-8 rounded-full transition-transform ${c.swatchClass} ${
                  color === c.value ? 'scale-110 ring-2 ring-eddy-500 ring-offset-2 ring-offset-surface' : ''
                }`}
              />
            ))}
          </div>
        </div>

        {error && (
          <p className="rounded-clay-sm bg-pastel-coral/60 px-3.5 py-2.5 font-body text-caption font-semibold text-chip-ink dark:bg-pastel-coral-dark/20 dark:text-pastel-coral-dark">
            {error}
          </p>
        )}
      </div>

      <div className="mt-5 flex justify-end gap-2 border-t border-eddy-100 pt-4">
        <button
          onClick={onClose}
          className="rounded-full border border-eddy-200 px-4 py-2 font-display text-caption font-semibold text-ink-soft transition-colors hover:bg-eddy-50"
        >
          ยกเลิก
        </button>
        <button
          onClick={save}
          disabled={saving || !dirty}
          className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-eddy-500 to-accent-500 px-5 py-2 font-display text-caption font-semibold text-white shadow-clay-sm transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
        >
          <Check size={15} /> {saving ? 'กำลังบันทึก...' : 'บันทึก'}
        </button>
      </div>
    </Modal>
  );
}
