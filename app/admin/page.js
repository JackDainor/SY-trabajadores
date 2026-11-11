'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

function money(n) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(n) || 0);
}

export default function AdminPage() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('cortes');
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);

  const showToast = (m) => {
    setToast(m);
    setTimeout(() => setToast(''), 2800);
  };

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/overview');
      if (res.status === 401) {
        router.replace('/');
        return;
      }
      setData(await res.json());
    } catch {
      showToast('Error al cargar');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(body) {
    const res = await fetch('/api/admin/overview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) {
      showToast(json.error || 'Error');
      return false;
    }
    showToast('Listo');
    load();
    return true;
  }

  async function logout() {
    await fetch('/api/logout', { method: 'POST' });
    router.replace('/');
  }

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: 40 }}>
        <p className="muted">Cargando panel…</p>
      </div>
    );
  }

  return (
    <div>
      <header className="topbar">
        <img src="/logo.png" alt="SY CROP" />
        <div className="brand">
          <strong>SY CROP</strong>
          <span>Admin</span>
        </div>
        <div className="spacer" />
        <span className="user-chip">{data?.user?.name}</span>
        <button className="ghost" type="button" onClick={logout}>
          Salir
        </button>
      </header>

      <main className="container">
        <p className="eyebrow">PANEL DEL JEFE</p>
        <h1>Administración</h1>
        <p className="muted" style={{ marginBottom: 14 }}>
          Mes: {data?.month} · Precios: prenda {money(data?.prices?.prenda)} · recta{' '}
          {money(data?.prices?.recta)} · over {money(data?.prices?.over)}
        </p>

        <nav className="tabs">
          {[
            ['cortes', 'Cortes'],
            ['vales', 'Vales'],
            ['equipos', 'Equipos'],
            ['personal', 'Personal'],
            ['proveedores', 'Proveedores'],
            ['ajustes', 'Ajustes'],
          ].map(([id, label]) => (
            <button key={id} type="button" className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
              {label}
            </button>
          ))}
        </nav>

        {tab === 'cortes' && (
          <div className="card">
            <h2>Cortes del mes ({data?.cuts?.length || 0})</h2>
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Equipo / Quién</th>
                    <th>Modelo</th>
                    <th>Proveedor</th>
                    <th>Prendas</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.cuts || []).map((c) => (
                    <tr key={c.id}>
                      <td>{c.work_date}</td>
                      <td>
                        {c.team_name}
                        <br />
                        <small className="muted">{c.registered_by_name}</small>
                      </td>
                      <td>
                        {c.title}
                        {c.status === 'voided' && (
                          <>
                            {' '}
                            <span className="badge void">anulado</span>
                          </>
                        )}
                      </td>
                      <td>{c.provider_name}</td>
                      <td>
                        {c.valid_pieces} vál.
                        {c.defects > 0 ? ` / ${c.defects} def.` : ''}
                      </td>
                      <td>
                        {c.status === 'confirmed' && (
                          <button
                            className="danger-btn"
                            type="button"
                            onClick={() => {
                              const reason = prompt('Motivo de anulación:');
                              if (reason != null) act({ action: 'void_cut', id: c.id, reason });
                            }}
                          >
                            Anular
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!data?.cuts?.length && <p className="muted">Sin cortes este mes</p>}
          </div>
        )}

        {tab === 'vales' && (
          <div className="card">
            <h2>Vales del mes</h2>
            <ValeForm data={data} onSave={(body) => act({ action: 'create_vale', ...body })} />
            <ul style={{ listStyle: 'none', padding: 0, marginTop: 16 }}>
              {(data?.vales || []).map((v) => (
                <li key={v.id} className="list-item">
                  <div className="meta">
                    <h3>{money(v.amount)}</h3>
                    <div className="tags">
                      <span>{v.team_name}</span>
                      {v.user_name && <span>{v.user_name}</span>}
                      <span>{v.vale_date}</span>
                      {v.note && <span>{v.note}</span>}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {tab === 'equipos' && (
          <div className="card">
            <h2>Equipos</h2>
            <TeamForm
              workers={data?.workers || []}
              onCreate={async (body) => act({ action: 'create_team', ...body })}
              onAddMember={(body) => act({ action: 'add_member', ...body })}
              teams={data?.teams || []}
            />
            {(data?.teams || []).map((t) => (
              <div key={t.id} style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
                <strong>{t.name}</strong>{' '}
                <span className="badge">{t.pay_mode === 'unidad' ? 'unidad' : 'por máquina'}</span>
                <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
                  {(t.members || []).map((m) => (
                    <div key={m.user_id}>
                      {m.name}
                      {m.role_machine ? ` · ${m.role_machine}` : ''}
                    </div>
                  ))}
                  {!t.members?.length && 'Sin miembros'}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'personal' && (
          <div className="card">
            <h2>Trabajadores</h2>
            <WorkerForm onSave={(body) => act({ action: 'create_worker', ...body })} />
            <ul style={{ listStyle: 'none', padding: 0, marginTop: 12 }}>
              {(data?.workers || []).map((w) => (
                <li key={w.id} className="list-item">
                  <div className="meta">
                    <h3>{w.name}</h3>
                    <div className="tags">
                      <span className="badge">{w.active ? 'activo' : 'inactivo'}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {tab === 'proveedores' && (
          <div className="card">
            <h2>Proveedores</h2>
            <ProviderForm onSave={(name) => act({ action: 'create_provider', name })} />
            <ul style={{ listStyle: 'none', padding: 0, marginTop: 12 }}>
              {(data?.providers || []).map((p) => (
                <li key={p.id} className="list-item">
                  <div className="meta">
                    <h3>{p.name}</h3>
                    <div className="tags">
                      <span className="badge">{p.active ? 'activo' : 'inactivo'}</span>
                    </div>
                  </div>
                  <button
                    className="secondary"
                    style={{ width: 'auto', padding: '8px 12px' }}
                    type="button"
                    onClick={() => act({ action: 'toggle_provider', id: p.id })}
                  >
                    {p.active ? 'Desactivar' : 'Activar'}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {tab === 'ajustes' && (
          <div className="card">
            <h2>Precios (R$)</h2>
            <PricesForm
              prices={data?.prices}
              onSave={(body) => act({ action: 'update_prices', ...body })}
            />
            <h2 style={{ marginTop: 24 }}>Cambiar tu PIN de admin</h2>
            <PinForm onSave={(pin) => act({ action: 'set_admin_pin', pin })} />
          </div>
        )}
      </main>

      <div className={`toast${toast ? ' show' : ''}`}>{toast}</div>
    </div>
  );
}

function ProviderForm({ onSave }) {
  const [name, setName] = useState('');
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (await onSave(name)) setName('');
      }}
      className="row"
    >
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del proveedor" />
      <button className="primary" type="submit" style={{ width: 'auto' }}>
        Añadir
      </button>
    </form>
  );
}

function WorkerForm({ onSave }) {
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (await onSave({ name, pin })) {
          setName('');
          setPin('');
        }
      }}
    >
      <label>
        Nombre
        <input value={name} onChange={(e) => setName(e.target.value)} required />
      </label>
      <label>
        PIN (solo números, mín. 4)
        <input
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          inputMode="numeric"
          minLength={4}
          required
        />
      </label>
      <button className="primary" type="submit">
        Crear trabajador
      </button>
    </form>
  );
}

function TeamForm({ teams, workers, onCreate, onAddMember }) {
  const [name, setName] = useState('');
  const [mode, setMode] = useState('unidad');
  const [teamId, setTeamId] = useState('');
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState('');

  return (
    <div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (await onCreate({ name, pay_mode: mode })) {
            setName('');
          }
        }}
      >
        <label>
          Nuevo equipo
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Pareja Ana-Luis" />
        </label>
        <label>
          Modo de pago
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="unidad">Unidad (pareja, un solo total)</option>
            <option value="por_maquina">Por máquina (roles fijos)</option>
          </select>
        </label>
        <button className="primary" type="submit">
          Crear equipo
        </button>
      </form>

      <form
        style={{ marginTop: 20 }}
        onSubmit={async (e) => {
          e.preventDefault();
          if (
            await onAddMember({
              team_id: teamId,
              user_id: userId,
              role_machine: role || null,
            })
          ) {
            setUserId('');
            setRole('');
          }
        }}
      >
        <h2 style={{ marginTop: 8 }}>Añadir miembro a equipo</h2>
        <label>
          Equipo
          <select value={teamId} onChange={(e) => setTeamId(e.target.value)} required>
            <option value="">Seleccionar…</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.pay_mode})
              </option>
            ))}
          </select>
        </label>
        <label>
          Trabajador
          <select value={userId} onChange={(e) => setUserId(e.target.value)} required>
            <option value="">Seleccionar…</option>
            {workers.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Máquina (solo si el equipo es por máquina)
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="">— (unidad / sin rol)</option>
            <option value="recta">Recta</option>
            <option value="over">Over</option>
          </select>
        </label>
        <button className="primary" type="submit">
          Añadir al equipo
        </button>
      </form>
    </div>
  );
}

function ValeForm({ data, onSave }) {
  const [teamId, setTeamId] = useState('');
  const [userId, setUserId] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const team = (data?.teams || []).find((t) => t.id === teamId);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (
          await onSave({
            team_id: teamId,
            user_id: team?.pay_mode === 'por_maquina' ? userId || null : null,
            amount,
            note,
          })
        ) {
          setAmount('');
          setNote('');
        }
      }}
    >
      <label>
        Equipo
        <select value={teamId} onChange={(e) => setTeamId(e.target.value)} required>
          <option value="">Seleccionar…</option>
          {(data?.teams || []).map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
      {team?.pay_mode === 'por_maquina' && (
        <label>
          Trabajador (vale personal)
          <select value={userId} onChange={(e) => setUserId(e.target.value)} required>
            <option value="">Seleccionar…</option>
            {(team.members || []).map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <label>
        Monto (R$)
        <input type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
      </label>
      <label>
        Nota
        <input value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      <button className="primary" type="submit">
        Registrar vale
      </button>
    </form>
  );
}

function PricesForm({ prices, onSave }) {
  const [prenda, setPrenda] = useState(prices?.prenda ?? 1.4);
  const [recta, setRecta] = useState(prices?.recta ?? 1);
  const [over, setOver] = useState(prices?.over ?? 0.4);
  useEffect(() => {
    if (prices) {
      setPrenda(prices.prenda);
      setRecta(prices.recta);
      setOver(prices.over);
    }
  }, [prices]);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ prenda, recta, over });
      }}
    >
      <div className="row">
        <label>
          Prenda
          <input type="number" step="0.01" value={prenda} onChange={(e) => setPrenda(e.target.value)} />
        </label>
        <label>
          Recta
          <input type="number" step="0.01" value={recta} onChange={(e) => setRecta(e.target.value)} />
        </label>
        <label>
          Over
          <input type="number" step="0.01" value={over} onChange={(e) => setOver(e.target.value)} />
        </label>
      </div>
      <button className="primary" type="submit">
        Guardar precios
      </button>
    </form>
  );
}

function PinForm({ onSave }) {
  const [pin, setPin] = useState('');
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (await onSave(pin)) setPin('');
      }}
    >
      <label>
        Nuevo PIN admin
        <input
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          inputMode="numeric"
          minLength={4}
          required
        />
      </label>
      <button className="primary" type="submit">
        Cambiar PIN
      </button>
    </form>
  );
}
