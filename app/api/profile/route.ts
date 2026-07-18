import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

const BIO_MAX_LENGTH = 300;

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();

  const name = typeof body?.name === 'string' ? body.name.trim() : undefined;
  const bio = typeof body?.bio === 'string' ? body.bio.trim() : undefined;
  const image = typeof body?.image === 'string' ? body.image.trim() : undefined;

  if (bio !== undefined && bio.length > BIO_MAX_LENGTH) {
    return NextResponse.json({ error: `เกี่ยวกับฉันยาวเกินไป (สูงสุด ${BIO_MAX_LENGTH} ตัวอักษร)` }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...(name !== undefined && { name: name || null }),
      ...(bio !== undefined && { bio: bio || null }),
      ...(image !== undefined && { image: image || null }),
    },
    select: { id: true, name: true, bio: true, image: true },
  });

  return NextResponse.json({ user });
}
