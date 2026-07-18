'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Check, X } from 'lucide-react';
import Button from './Button';

interface ProfileFormProps {
  initialName: string;
  email: string;
  initialBio: string;
  initialImage: string;
}

const inputClass =
  'w-full rounded-clay-sm bg-eddy-50 px-4 py-2.5 font-body text-sm text-ink shadow-clay-inset placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-eddy-300';
const labelClass = 'mb-1.5 block font-display text-sm font-semibold text-ink-soft';

export default function ProfileForm({ initialName, email, initialBio, initialImage }: ProfileFormProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState(initialName);
  const [bio, setBio] = useState(initialBio);
  const [image, setImage] = useState(initialImage);

  const displayName = name || email;
  const initial = displayName.charAt(0).toUpperCase();

  function cancelEdit() {
    setName(initialName);
    setBio(initialBio);
    setImage(initialImage);
    setError('');
    setEditing(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), bio: bio.trim(), image: image.trim() }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? 'บันทึกไม่สำเร็จ ลองใหม่อีกครั้งนะ');
      setSaving(false);
      return;
    }

    setSaving(false);
    setEditing(false);
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center gap-4">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={displayName} className="h-20 w-20 flex-shrink-0 rounded-full object-cover shadow-clay-sm" />
        ) : (
          <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full bg-eddy-500 font-display text-2xl font-bold text-white shadow-clay-sm">
            {initial}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate font-display text-lg font-bold text-ink">{displayName}</p>
          <p className="truncate font-body text-sm text-ink-muted">{email}</p>
        </div>
      </div>

      {editing ? (
        <form onSubmit={handleSave} className="mt-6 flex flex-col gap-4">
          <div>
            <label className={labelClass} htmlFor="profile-name">
              ชื่อ
            </label>
            <input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="profile-image">
              ลิงก์รูปโปรไฟล์ (ไม่บังคับ)
            </label>
            <input
              id="profile-image"
              value={image}
              onChange={(e) => setImage(e.target.value)}
              placeholder="https://..."
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="profile-bio">
              เกี่ยวกับฉัน (ไม่บังคับ)
            </label>
            <textarea
              id="profile-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={300}
              rows={3}
              placeholder="เล่าเกี่ยวกับตัวเองสั้นๆ..."
              className={inputClass}
            />
            <p className="mt-1 text-right font-body text-xs text-ink-muted">{bio.length}/300</p>
          </div>

          {error && (
            <p className="rounded-clay-sm bg-pastel-pink/60 px-3 py-2 font-body text-sm text-eddy-700">{error}</p>
          )}

          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              <Check size={16} /> {saving ? 'กำลังบันทึก...' : 'บันทึก'}
            </Button>
            <Button type="button" variant="ghost" onClick={cancelEdit} disabled={saving}>
              <X size={16} /> ยกเลิก
            </Button>
          </div>
        </form>
      ) : (
        <div className="mt-6">
          <p className="font-body text-sm text-ink-muted">{bio || 'ยังไม่ได้เขียนเกี่ยวกับตัวเอง'}</p>
          <Button type="button" variant="secondary" className="mt-4" onClick={() => setEditing(true)}>
            <Pencil size={16} /> แก้ไขโปรไฟล์
          </Button>
        </div>
      )}
    </div>
  );
}
