'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

function money(n) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(n) || 0);
}

function compressImage(file, maxW = 800, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxW / img.width);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = reject;
    img.src = url;
  });
}

export default function TrabajadorPage() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('resumen');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    team_id: '',
    provider_id: '',
    title: '',
    pieces: '',
    defects: '0',
    hasDefects: false,
    notes: '',
    work_date: new Date().toISOString().slice(0, 10),
    photo_data: '',
  });
  const [skipConfirm, setSkipConfirm] = useState(false);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2800);
  };

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/worker/dashboard');
      if (res.status === 401) {
        router.replace('/');
        return;
      }
      const json = await res.json();
      setData(json);
      if (json.teams?.length && !form.team_id) {
        setForm((f) => ({ ...f, team_id: json.teams[0].team_id }));
      }
      if (json.user?.skip_confirm) setSkipConfirm(true);
    } catch {
      showToast('Error al cargar');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  async function logout() {
    await fetch('/api/logout', { method: 'POST' });
    router.replace('/');
  }

  function openNew() {
    setForm({
      team_id: data?.teams?.[0]?.team_id || '',
      provider_id: '',
      title: '',
      pieces: '',
      defects: '0',
      hasDefects: false,
      notes: '',
      work_date: new Date().toISOString().slice(0, 10),
      photo_data: '',
    });
    setShowForm(true);
  }

  async function onPhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Elegí una imagen');
      return;
    }
    try {
      const dataUrl = await compressImage(file);
      setForm((f) => ({ ...f, photo_data: dataUrl }));
    } catch {
      showToast('No se pudo leer la foto');
    }
  }

  function trySave() {
    const pieces = parseInt(form.pieces, 10);
    if (!form.team_id || !form.provider_id || !form.title.trim() || !(pieces >= 0)) {
      showToast('Completá proveedor, título y cantidad');
      return;
    }
    if (form.hasDefects) {
      const d = parseInt(form.defects, 10) || 0;
      if (d > pieces) {
        showToast('Defectos no pueden superar las prendas');
        return;
      }
    }
    if (data?.user?.skip_confirm || skipConfirm) {
      doSave(false);
    } else {
      setConfirmOpen(true);
    }
  }

  async function doSave(rememberSkip) {
    setSaving(true);
    setConfirmOpen(false);
    try {
      const defects = form.hasDefects ? parseInt(form.defects, 10) || 0 : 0;
      const res = await fetch('/api/worker/cuts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team_id: form.team_id,
          provider_id: form.provider_id,
          title: form.title.trim(),
          photo_data: form.photo_data || null,
          pieces: parseInt(form.pieces, 10) || 0,
          defects,
          notes: form.notes.trim() || null,
          work_date: form.work_date,
          skip_confirm: rememberSkip || skipConfirm,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        showToast(json.error || 'Error al guardar');
        setSaving(false);
        return;
      }
      showToast('Corte guardado. Ya no se puede editar.');
      setShowForm(false);
      setSaving(false);
      load();
      setTab('historial');
    } catch {
      showToast('Error de conexión');
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: 40 }}>
        <p className="muted">Cargando…</p>
      </div>
    );
  }

  const team = data?.teams?.[0];
  const validPreview =
    (parseInt(form.pieces, 10) || 0) -
    (form.hasDefects ? parseInt(form.defects, 10) || 0 : 0);

  return (
    <div>
      <header className="topbar">
        <img src="/logo.png" alt="SY CROP" />
        <div className="brand">
          <strong>SY CROP</strong>
          <span>Trabajadores</span>
        </div>
        <div className="spacer" />
        <span className="user-chip">{data?.user?.name}</span>
        <button className="ghost" type="button" onClick={logout}>
          Salir
        </button>
      </header>

      <main className="container">
        <div className="stat-grid">
          <div className="stat">
            <p>Producido del mes</p>
            <strong>{money(data?.summary?.produced)}</strong>
          </div>
          <div className="stat">
            <p>Vales</p>
            <strong>{money(data?.summary?.vales)}</strong>
          </div>
          <div className="stat accent" style={{ gridColumn: '1 / -1' }}>
            <p>A recibir este mes</p>
            <strong>{money(data?.summary?.net)}</strong>
          </div>
        </div>

        {team && (
          <p className="muted" style={{ marginBottom: 12 }}>
            Equipo: <strong>{team.team_name}</strong>
            {team.pay_mode === 'por_maquina' && team.role_machine
              ? ` · Tu máquina: ${team.role_machine}`
              : ' · Pago en conjunto'}
          </p>
        )}

        <button className="primary" type="button" onClick={openNew} style={{ marginBottom: 16 }}>
          ＋ Registrar corte
        </button>

        <nav className="tabs">
          <button type="button" className={tab === 'resumen' ? 'active' : ''} onClick={() => setTab('resumen')}>
            Resumen
          </button>
          <button type="button" className={tab === 'historial' ? 'active' : ''} onClick={() => setTab('historial')}>
            Historial
          </button>
          <button type="button" className={tab === 'vales' ? 'active' : ''} onClick={() => setTab('vales')}>
            Vales
          </button>
        </nav>

        {tab === 'resumen' && (
          <div className="card">
            <p className="eyebrow">MES ACTUAL</p>
            <h2>Tu producción</h2>
            <p className="muted">
              Los cortes confirmados ya no se pueden editar ni borrar. Los defectos no cuentan como prenda
              terminada.
            </p>
            <p style={{ marginTop: 12 }}>
              Precios: prenda {money(data?.prices?.prenda)} · recta {money(data?.prices?.recta)} · over{' '}
              {money(data?.prices?.over)}
            </p>
          </div>
        )}

        {tab === 'historial' && (
          <div className="card">
            <h2>Cortes del mes</h2>
            {!data?.cuts?.length && (
              <div className="empty">
                <div className="art">✂</div>
                <p>Todavía no hay cortes este mes</p>
              </div>
            )}
            {data?.cuts?.map((c) => (
              <div className="list-item" key={c.id}>
                {c.photo_data ? (
                  <img src={c.photo_data} alt="" />
                ) : (
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 10,
                      background: 'var(--pale)',
                      display: 'grid',
                      placeItems: 'center',
                    }}
                  >
                    ✂
                  </div>
                )}
                <div className="meta">
                  <h3>{c.title}</h3>
                  <div className="tags">
                    <span>{c.provider_name}</span>
                    <span>
                      {c.valid_pieces} válidas
                      {c.defects > 0 ? ` (${c.defects} defectos)` : ''}
                    </span>
                    <span>{c.work_date}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'vales' && (
          <div className="card">
            <h2>Vales del mes</h2>
            {!data?.vales?.length && (
              <div className="empty">
                <p>Sin vales este mes</p>
              </div>
            )}
            {data?.vales?.map((v) => (
              <div className="list-item" key={v.id}>
                <div className="meta">
                  <h3>{money(v.amount)}</h3>
                  <div className="tags">
                    <span>{v.vale_date}</span>
                    {v.note && <span>{v.note}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showForm && (
        <div className="modal-backdrop" role="dialog">
          <div className="modal">
            <p className="eyebrow">NUEVO CORTE</p>
            <h2>Registrar producción</h2>
            <p className="muted" style={{ marginBottom: 12 }}>
              Revisá bien los datos. Al confirmar no se podrá editar ni borrar.
            </p>

            {data?.teams?.length > 1 && (
              <label>
                Equipo
                <select
                  value={form.team_id}
                  onChange={(e) => setForm({ ...form, team_id: e.target.value })}
                >
                  {data.teams.map((t) => (
                    <option key={t.team_id} value={t.team_id}>
                      {t.team_name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label>
              Proveedor
              <select
                value={form.provider_id}
                onChange={(e) => setForm({ ...form, provider_id: e.target.value })}
                required
              >
                <option value="">Seleccionar…</option>
                {data?.providers?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Título / modelo
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ej. Crop top negro"
                maxLength={100}
              />
            </label>

            <div className="row">
              <label>
                Fecha
                <input
                  type="date"
                  value={form.work_date}
                  onChange={(e) => setForm({ ...form, work_date: e.target.value })}
                />
              </label>
              <label>
                Prendas
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={form.pieces}
                  onChange={(e) => setForm({ ...form, pieces: e.target.value })}
                  placeholder="0"
                />
              </label>
            </div>

            <label className="checkbox-row" style={{ marginBottom: 12 }}>
              <input
                type="checkbox"
                checked={form.hasDefects}
                onChange={(e) =>
                  setForm({
                    ...form,
                    hasDefects: e.target.checked,
                    defects: e.target.checked ? form.defects : '0',
                  })
                }
              />
              ¿Hubo defectos?
            </label>

            {form.hasDefects && (
              <label>
                Cantidad de defectos
                <input
                  type="number"
                  min="0"
                  value={form.defects}
                  onChange={(e) => setForm({ ...form, defects: e.target.value })}
                />
                <small>No cuentan como prenda terminada. Válidas: {Math.max(0, validPreview)}</small>
              </label>
            )}

            <label>
              Foto del modelo <small>(opcional)</small>
              <input type="file" accept="image/*" capture="environment" onChange={onPhoto} />
              {form.photo_data && <img className="photo-preview" src={form.photo_data} alt="Vista previa" />}
            </label>

            <label>
              Nota <small>(opcional)</small>
              <input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                maxLength={150}
              />
            </label>

            <div className="actions">
              <button className="primary" type="button" disabled={saving} onClick={trySave}>
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
              <button className="secondary" type="button" disabled={saving} onClick={() => setShowForm(false)}>
                Cancelar / Editar después
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmOpen && (
        <div className="modal-backdrop" role="dialog">
          <div className="modal">
            <h2>¿Seguro que querés guardar?</h2>
            <p className="muted">
              Una vez guardado, este corte <strong>no se podrá editar ni borrar</strong>.
            </p>
            <p style={{ margin: '12px 0' }}>
              {form.title} · {form.pieces} prendas
              {form.hasDefects ? ` · ${form.defects} defectos` : ''} · {Math.max(0, validPreview)} válidas
            </p>
            <label className="checkbox-row">
              <input type="checkbox" checked={skipConfirm} onChange={(e) => setSkipConfirm(e.target.checked)} />
              No volver a mostrar este aviso
            </label>
            <div className="actions">
              <button className="primary" type="button" disabled={saving} onClick={() => doSave(skipConfirm)}>
                Sí, guardar
              </button>
              <button className="secondary" type="button" onClick={() => setConfirmOpen(false)}>
                Volver a editar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`toast${toast ? ' show' : ''}`}>{toast}</div>
    </div>
  );
}
