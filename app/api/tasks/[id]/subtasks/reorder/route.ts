import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const task = await prisma.task.findUnique({ where: { id: params.id } });
  if (!task || task.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await req.json();
  const subtaskIds: string[] = Array.isArray(body?.subtaskIds) ? body.subtaskIds : [];
  if (subtaskIds.length === 0) {
    return NextResponse.json({ error: 'subtaskIds is required' }, { status: 400 });
  }

  // ยืนยันว่าทุก id ที่ส่งมาเป็นของ subtask ในงานนี้จริงๆ ก่อนอัปเดต (กันสลับลำดับ subtask ของงาน/คนอื่น)
  const existing = await prisma.subtask.findMany({ where: { taskId: params.id } });
  const existingIds = new Set(existing.map((s) => s.id));
  if (subtaskIds.length !== existing.length || !subtaskIds.every((id) => existingIds.has(id))) {
    return NextResponse.json({ error: 'subtaskIds does not match this task’s subtasks' }, { status: 400 });
  }

  await prisma.$transaction(
    subtaskIds.map((id, index) => prisma.subtask.update({ where: { id }, data: { order: index } }))
  );

  return NextResponse.json({ ok: true });
}
