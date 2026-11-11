import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { getSql } from '@/lib/db';

export async function POST(req) {
  const user = await requireUser(['worker', 'admin']);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const body = await req.json();
    const {
      team_id,
      provider_id,
      title,
      photo_data,
      pieces,
      defects = 0,
      colors,
      notes,
      work_date,
      skip_confirm,
    } = body;

    if (!team_id || !provider_id || !title?.trim()) {
      return NextResponse.json({ error: 'Faltan datos obligatorios' }, { status: 400 });
    }

    const p = Math.max(0, parseInt(pieces, 10) || 0);
    const d = Math.max(0, parseInt(defects, 10) || 0);
    if (d > p) {
      return NextResponse.json({ error: 'Los defectos no pueden superar las prendas' }, { status: 400 });
    }
    const valid = p - d;

    const sql = getSql();

    // Debe ser miembro del equipo
    const mem = await sql`
      SELECT 1 FROM team_members WHERE team_id = ${team_id} AND user_id = ${user.id}
    `;
    if (!mem.length && user.role !== 'admin') {
      return NextResponse.json({ error: 'No pertenecés a ese equipo' }, { status: 403 });
    }

    const rows = await sql`
      INSERT INTO cuts (
        team_id, registered_by, provider_id, title, photo_data,
        pieces, defects, valid_pieces, colors, notes, work_date, status
      ) VALUES (
        ${team_id},
        ${user.id},
        ${provider_id},
        ${title.trim()},
        ${photo_data || null},
        ${p},
        ${d},
        ${valid},
        ${colors ? JSON.stringify(colors) : null},
        ${notes || null},
        ${work_date || new Date().toISOString().slice(0, 10)},
        'confirmed'
      )
      RETURNING id, created_at, valid_pieces
    `;

    if (skip_confirm === true) {
      await sql`UPDATE users SET skip_confirm = TRUE WHERE id = ${user.id}`;
    }

    return NextResponse.json({ ok: true, cut: rows[0] });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'No se pudo guardar el corte' }, { status: 500 });
  }
}
