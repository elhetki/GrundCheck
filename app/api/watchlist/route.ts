import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { WatchlistTogglePayload } from '@/lib/types';

// NOTE: Auth is skipped for hackathon scope.
// We use an anonymous session ID from a cookie instead.

function getSessionId(req: NextRequest): string {
  return req.cookies.get('grundcheck_session')?.value ?? 'anon';
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const sessionId = getSessionId(req);

  try {
    const items = await prisma.watchlistItem.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ items });
  } catch (err) {
    console.error('[/api/watchlist GET]', err);
    return NextResponse.json({ error: 'Datenbankfehler' }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const sessionId = getSessionId(req);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Ungültige JSON-Daten' }, { status: 400 });
  }

  const payload = body as WatchlistTogglePayload;
  if (!payload.entityId || !payload.entityName || !payload.entityType) {
    return NextResponse.json({ error: 'Fehlende Felder: entityId, entityName, entityType' }, { status: 400 });
  }

  try {
    // Toggle: if already on watchlist → remove, else → add
    const existing = await prisma.watchlistItem.findFirst({
      where: { sessionId, entityId: payload.entityId },
    });

    if (existing) {
      await prisma.watchlistItem.delete({ where: { id: existing.id } });
      return NextResponse.json({ action: 'removed', entityId: payload.entityId });
    }

    const item = await prisma.watchlistItem.create({
      data: {
        sessionId,
        entityId: payload.entityId,
        entityName: payload.entityName,
        entityType: payload.entityType,
      },
    });

    return NextResponse.json({ action: 'added', item });
  } catch (err) {
    console.error('[/api/watchlist POST]', err);
    return NextResponse.json({ error: 'Datenbankfehler' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const sessionId = getSessionId(req);
  const entityId = req.nextUrl.searchParams.get('entityId');

  if (!entityId) {
    return NextResponse.json({ error: 'Fehlender Parameter entityId' }, { status: 400 });
  }

  try {
    await prisma.watchlistItem.deleteMany({ where: { sessionId, entityId } });
    return NextResponse.json({ action: 'removed', entityId });
  } catch (err) {
    console.error('[/api/watchlist DELETE]', err);
    return NextResponse.json({ error: 'Datenbankfehler' }, { status: 500 });
  }
}
