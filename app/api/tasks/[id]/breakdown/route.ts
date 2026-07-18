import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { breakdownTask } from '@/lib/gemini';
import type { Subtask } from '@/lib/types';

function serialize(s: { id: string; title: string; done: boolean }): Subtask {
  return { id: s.id, title: s.title, done: s.done };
}

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const task = await prisma.task.findUnique({ where: { id: params.id } });
  if (!task || task.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  let titles: string[] | null = null;
  try {
    titles = await breakdownTask({ title: task.title });
  } catch {
    titles = null;
  }

  // ไม่มี local fallback สำหรับฟีเจอร์นี้ (ต้องอาศัยความเข้าใจภาษาจริง) - ถ้า Gemini ใช้ไม่ได้ ให้แจ้งตรงๆ
  if (!titles) {
    return NextResponse.json(
      { error: 'ตอนนี้เอ็ดดี้แตกงานให้ไม่ได้ (อาจยังไม่ได้ตั้งค่า Gemini API หรือเชื่อมต่อไม่สำเร็จ) ลองใหม่อีกครั้งนะ' },
      { status: 502 }
    );
  }

  const last = await prisma.subtask.findFirst({ where: { taskId: params.id }, orderBy: { order: 'desc' } });
  const startOrder = (last?.order ?? -1) + 1;
  // สร้างทีละตัวตามลำดับ (ไม่ใช้ Promise.all) เพื่อให้ order ตรงกับลำดับที่ Gemini เสนอมาจริงๆ
  const created: Awaited<ReturnType<typeof prisma.subtask.create>>[] = [];
  for (let i = 0; i < titles.length; i++) {
    created.push(await prisma.subtask.create({ data: { title: titles[i], taskId: params.id, order: startOrder + i } }));
  }

  return NextResponse.json({ subtasks: created.map(serialize) }, { status: 201 });
}
