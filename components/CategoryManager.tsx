'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, Check, X, Share2 } from 'lucide-react';
import clsx from 'clsx';
import { PASTEL_COLORS, getColorOption } from '@/lib/colors';
import { CATEGORY_KIND_OPTIONS, type CategoryKind } from '@/lib/categoryKind';
import type { CalendarCategory, PastelColor } from '@/lib/types';

interface CategoryManagerProps {
  categories: CalendarCategory[];
  visibleIds: Set<string>;
  onToggleVisible: (id: string) => void;
  onAdd: (name: string, color: PastelColor) => void;
  onUpdate: (id: string, changes: Partial<CalendarCategory>) => void;
  onDelete: (id: string) => void;
  onShare?: (id: string) => void;
}

function ColorPicker({ value, onChange }: { value: PastelColor; onChange: (c: PastelColor) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {PASTEL_COLORS.map((c) => (
        <button
          key={c.value}
          type="button"
          aria-label={`สี${c.label}`}
          onClick={() => onChange(c.value)}
          className={clsx(
            'h-7 w-7 rounded-full transition-transform',
            c.swatchClass,
            value === c.value ? 'scale-110 ring-2 ring-eddy-500 ring-offset-2' : ''
          )}
        />
      ))}
    </div>
  );
}

/** ปุ่มสลับวิชาการ/ไม่ใช่วิชาการ - ค่าเริ่มต้นเดามาจากชื่อ แต่แก้ตรงนี้ได้เสมอถ้าเดาผิด */
function KindToggle({ value, onChange }: { value: CategoryKind; onChange: (k: CategoryKind) => void }) {
  return (
    <div className="flex gap-1.5">
      {CATEGORY_KIND_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={clsx(
            'rounded-full px-2.5 py-1 font-body text-xs font-medium transition-colors',
            value === opt.value
              ? opt.value === 'academic'
                ? 'bg-kind-academic text-white'
                : 'bg-kind-nonAcademic text-white'
              : 'bg-white text-ink-muted shadow-clay-inset',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default function CategoryManager({
  categories,
  visibleIds,
  onToggleVisible,
  onAdd,
  onUpdate,
  onDelete,
  onShare,
}: CategoryManagerProps) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState<PastelColor>('blue');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState<PastelColor>('blue');
  const [editKind, setEditKind] = useState<CategoryKind>('non_academic');

  function startEdit(cat: CalendarCategory) {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditColor(cat.color);
    setEditKind(cat.kind ?? 'non_academic');
  }

  function confirmEdit() {
    if (!editingId) return;
    const name = editName.trim();
    if (name) onUpdate(editingId, { name, color: editColor, kind: editKind });
    setEditingId(null);
  }

  function confirmAdd() {
    const name = newName.trim();
    if (!name) return;
    onAdd(name, newColor);
    setNewName('');
    setNewColor('blue');
    setAdding(false);
  }

  return (
    <div className="flex flex-col gap-3">
      {categories.map((cat) => {
        const color = getColorOption(cat.color);
        const isEditing = editingId === cat.id;
        const visible = visibleIds.has(cat.id);

        if (isEditing) {
          return (
            <div key={cat.id} className="rounded-clay-sm bg-eddy-50 p-3">
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="mb-2 w-full rounded-clay-sm bg-white px-3 py-2 font-body text-sm text-ink shadow-clay-inset focus:outline-none"
                autoFocus
              />
              <ColorPicker value={editColor} onChange={setEditColor} />
              <p className="mb-1.5 mt-3 font-body text-xs text-ink-muted">
                หมวดหมู่นี้เกี่ยวกับ (ใช้แยกภาระงานในหน้ากลุ่ม)
              </p>
              <KindToggle value={editKind} onChange={setEditKind} />
              <div className="mt-3 flex gap-2">
                <button
                  onClick={confirmEdit}
                  className="flex items-center gap-1 rounded-clay-sm bg-eddy-500 px-3 py-1.5 font-display text-xs font-semibold text-white"
                >
                  <Check size={14} /> บันทึก
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="flex items-center gap-1 rounded-clay-sm bg-white px-3 py-1.5 font-display text-xs font-semibold text-ink-muted"
                >
                  <X size={14} /> ยกเลิก
                </button>
              </div>
            </div>
          );
        }

        return (
          <div key={cat.id} className="flex items-center gap-2 rounded-clay-sm px-1 py-1">
            <input
              type="checkbox"
              checked={visible}
              onChange={() => onToggleVisible(cat.id)}
              aria-label={`แสดง/ซ่อนหมวดหมู่ ${cat.name}`}
              className="h-4 w-4 accent-eddy-500"
            />
            <span className={clsx('h-3 w-3 flex-shrink-0 rounded-full', color.dotClass)} />
            <span className={clsx('flex-1 truncate font-body text-sm', visible ? 'text-ink' : 'text-ink-muted')}>
              {cat.name}
            </span>
            {onShare && (
              <button
                onClick={() => onShare(cat.id)}
                aria-label={`แชร์หมวดหมู่ ${cat.name}`}
                className="text-ink-muted hover:text-eddy-600"
              >
                <Share2 size={15} />
              </button>
            )}
            <button onClick={() => startEdit(cat)} aria-label={`แก้ไขหมวดหมู่ ${cat.name}`} className="text-ink-muted hover:text-eddy-600">
              <Pencil size={15} />
            </button>
            <button onClick={() => onDelete(cat.id)} aria-label={`ลบหมวดหมู่ ${cat.name}`} className="text-ink-muted hover:text-eddy-600">
              <Trash2 size={15} />
            </button>
          </div>
        );
      })}

      {adding ? (
        <div className="rounded-clay-sm bg-eddy-50 p-3">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="ชื่อหมวดหมู่ เช่น ปฏิทินการเรียน"
            className="mb-2 w-full rounded-clay-sm bg-white px-3 py-2 font-body text-sm text-ink shadow-clay-inset placeholder:text-ink-muted focus:outline-none"
            autoFocus
          />
          <ColorPicker value={newColor} onChange={setNewColor} />
          <div className="mt-3 flex gap-2">
            <button
              onClick={confirmAdd}
              className="flex items-center gap-1 rounded-clay-sm bg-eddy-500 px-3 py-1.5 font-display text-xs font-semibold text-white"
            >
              <Check size={14} /> เพิ่ม
            </button>
            <button
              onClick={() => setAdding(false)}
              className="flex items-center gap-1 rounded-clay-sm bg-white px-3 py-1.5 font-display text-xs font-semibold text-ink-muted"
            >
              <X size={14} /> ยกเลิก
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center justify-center gap-1 rounded-clay-sm border-2 border-dashed border-eddy-200 px-3 py-2 font-display text-xs font-semibold text-eddy-600 hover:bg-eddy-50"
        >
          <Plus size={14} /> เพิ่มหมวดหมู่
        </button>
      )}
    </div>
  );
}
