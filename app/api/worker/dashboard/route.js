import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { getSql, getPrices } from '@/lib/db';
import { earningsForCut } from '@/lib/money';

export async function GET(req) {
  const user = await requireUser(['worker', 'admin']);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const sql = getSql();
  const url = new URL(req.url);
  const month = url.searchParams.get('month') || new Date().toISOString().slice(0, 7);

  const memberships = await sql`
    SELECT tm.team_id, tm.role_machine, t.name AS team_name, t.pay_mode
    FROM team_members tm
    JOIN teams t ON t.id = tm.team_id AND t.active = TRUE
    WHERE tm.user_id = ${user.id}
  `;

  if (!memberships.length && user.role === 'worker') {
    return NextResponse.json({
      user,
      teams: [],
      cuts: [],
      vales: [],
      summary: { produced: 0, vales: 0, net: 0 },
      prices: await getPrices(),
      providers: [],
    });
  }

  const teamIds = memberships.map((m) => m.team_id);
  const prices = await getPrices();

  // Cortes del mes de sus equipos
  const cuts = teamIds.length
    ? await sql`
        SELECT c.*, p.name AS provider_name, t.pay_mode, t.name AS team_name
        FROM cuts c
        JOIN providers p ON p.id = c.provider_id
        JOIN teams t ON t.id = c.team_id
        WHERE c.team_id = ANY(${teamIds})
          AND to_char(c.work_date, 'YYYY-MM') = ${month}
          AND c.status = 'confirmed'
        ORDER BY c.created_at DESC
      `
    : [];

  // Vales: del equipo (unidad) o personales
  const vales = teamIds.length
    ? await sql`
        SELECT v.*, t.pay_mode, t.name AS team_name
        FROM vales v
        JOIN teams t ON t.id = v.team_id
        WHERE v.team_id = ANY(${teamIds})
          AND to_char(v.vale_date, 'YYYY-MM') = ${month}
          AND (
            (t.pay_mode = 'unidad')
            OR (t.pay_mode = 'por_maquina' AND v.user_id = ${user.id})
          )
        ORDER BY v.vale_date DESC
      `
    : [];

  let produced = 0;
  for (const c of cuts) {
    const mem = memberships.find((m) => m.team_id === c.team_id);
    produced += earningsForCut({
      payMode: c.pay_mode,
      roleMachine: mem?.role_machine,
      validPieces: c.valid_pieces,
      prices,
    });
  }

  const valesSum = vales.reduce((s, v) => s + Number(v.amount), 0);

  const providers = await sql`
    SELECT id, name FROM providers WHERE active = TRUE ORDER BY name
  `;

  return NextResponse.json({
    user,
    teams: memberships,
    cuts,
    vales,
    summary: {
      produced,
      vales: valesSum,
      net: produced - valesSum,
    },
    prices,
    providers,
    month,
  });
}
