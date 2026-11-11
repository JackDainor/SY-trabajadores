import { NextResponse } from 'next/server';
import { requireUser, hashPin } from '@/lib/auth';
import { getSql, getPrices } from '@/lib/db';

export async function GET(req) {
  const user = await requireUser(['admin']);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const sql = getSql();
  const url = new URL(req.url);
  const month = url.searchParams.get('month') || new Date().toISOString().slice(0, 7);

  const [providers, teams, workers, cuts, vales, prices] = await Promise.all([
    sql`SELECT * FROM providers ORDER BY active DESC, name`,
    sql`
      SELECT t.*,
        (SELECT json_agg(json_build_object(
          'user_id', u.id, 'name', u.name, 'role_machine', tm.role_machine
        )) FROM team_members tm JOIN users u ON u.id = tm.user_id WHERE tm.team_id = t.id) AS members
      FROM teams t ORDER BY t.name
    `,
    sql`SELECT id, name, role, active, created_at FROM users WHERE role = 'worker' ORDER BY name`,
    sql`
      SELECT c.*, p.name AS provider_name, t.name AS team_name, u.name AS registered_by_name
      FROM cuts c
      JOIN providers p ON p.id = c.provider_id
      JOIN teams t ON t.id = c.team_id
      JOIN users u ON u.id = c.registered_by
      WHERE to_char(c.work_date, 'YYYY-MM') = ${month}
      ORDER BY c.created_at DESC
      LIMIT 200
    `,
    sql`
      SELECT v.*, t.name AS team_name, u.name AS user_name
      FROM vales v
      JOIN teams t ON t.id = v.team_id
      LEFT JOIN users u ON u.id = v.user_id
      WHERE to_char(v.vale_date, 'YYYY-MM') = ${month}
      ORDER BY v.vale_date DESC
    `,
    getPrices(),
  ]);

  return NextResponse.json({
    user,
    providers,
    teams,
    workers,
    cuts,
    vales,
    prices,
    month,
  });
}

export async function POST(req) {
  const user = await requireUser(['admin']);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const sql = getSql();
  const body = await req.json();
  const { action } = body;

  try {
    if (action === 'create_provider') {
      const name = String(body.name || '').trim();
      if (!name) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 });
      await sql`INSERT INTO providers (name) VALUES (${name})`;
      return NextResponse.json({ ok: true });
    }

    if (action === 'toggle_provider') {
      await sql`UPDATE providers SET active = NOT active WHERE id = ${body.id}`;
      return NextResponse.json({ ok: true });
    }

    if (action === 'create_worker') {
      const name = String(body.name || '').trim();
      const pin = String(body.pin || '');
      if (!name || pin.length < 4) {
        return NextResponse.json({ error: 'Nombre y PIN (mín. 4 dígitos)' }, { status: 400 });
      }
      const pin_hash = await hashPin(pin);
      await sql`
        INSERT INTO users (name, role, pin_hash) VALUES (${name}, 'worker', ${pin_hash})
      `;
      return NextResponse.json({ ok: true });
    }

    if (action === 'create_team') {
      const name = String(body.name || '').trim();
      const pay_mode = body.pay_mode === 'por_maquina' ? 'por_maquina' : 'unidad';
      if (!name) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 });
      const rows = await sql`
        INSERT INTO teams (name, pay_mode) VALUES (${name}, ${pay_mode}) RETURNING id
      `;
      return NextResponse.json({ ok: true, id: rows[0].id });
    }

    if (action === 'add_member') {
      const { team_id, user_id, role_machine } = body;
      await sql`
        INSERT INTO team_members (team_id, user_id, role_machine)
        VALUES (
          ${team_id},
          ${user_id},
          ${role_machine || null}
        )
        ON CONFLICT (team_id, user_id) DO UPDATE SET role_machine = EXCLUDED.role_machine
      `;
      return NextResponse.json({ ok: true });
    }

    if (action === 'create_vale') {
      const amount = Number(body.amount);
      if (!(amount > 0) || !body.team_id) {
        return NextResponse.json({ error: 'Monto y equipo requeridos' }, { status: 400 });
      }
      await sql`
        INSERT INTO vales (team_id, user_id, amount, note, vale_date, created_by)
        VALUES (
          ${body.team_id},
          ${body.user_id || null},
          ${amount},
          ${body.note || null},
          ${body.vale_date || new Date().toISOString().slice(0, 10)},
          ${user.id}
        )
      `;
      return NextResponse.json({ ok: true });
    }

    if (action === 'void_cut') {
      await sql`
        UPDATE cuts SET status = 'voided', void_reason = ${body.reason || 'Anulado por admin'},
          voided_by = ${user.id}, voided_at = NOW()
        WHERE id = ${body.id}
      `;
      return NextResponse.json({ ok: true });
    }

    if (action === 'update_prices') {
      if (body.prenda != null) {
        await sql`INSERT INTO settings (key, value) VALUES ('precio_prenda', ${String(body.prenda)})
          ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`;
      }
      if (body.recta != null) {
        await sql`INSERT INTO settings (key, value) VALUES ('precio_recta', ${String(body.recta)})
          ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`;
      }
      if (body.over != null) {
        await sql`INSERT INTO settings (key, value) VALUES ('precio_over', ${String(body.over)})
          ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`;
      }
      return NextResponse.json({ ok: true });
    }

    if (action === 'set_admin_pin') {
      const pin = String(body.pin || '');
      if (pin.length < 4) return NextResponse.json({ error: 'PIN mínimo 4 dígitos' }, { status: 400 });
      const pin_hash = await hashPin(pin);
      await sql`UPDATE users SET pin_hash = ${pin_hash} WHERE id = ${user.id}`;
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Acción desconocida' }, { status: 400 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e.message || 'Error' }, { status: 500 });
  }
}
