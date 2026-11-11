'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (pin.length < 4) {
      setError('Ingresá un PIN de al menos 4 dígitos');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'PIN incorrecto');
        setLoading(false);
        return;
      }
      if (data.role === 'admin') router.replace('/admin');
      else router.replace('/trabajador');
    } catch {
      setError('Error de conexión. Reintentá.');
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <header className="topbar" style={{ justifyContent: 'center' }}>
        <img src="/logo.png" alt="SY CROP" width={36} height={36} />
        <div className="brand">
          <strong>SY CROP</strong>
          <span>Trabajadores</span>
        </div>
      </header>
      <main className="container" style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
        <div className="card" style={{ width: '100%' }}>
          <p className="eyebrow">ACCESO</p>
          <h1>Ingresá tu PIN</h1>
          <p className="muted" style={{ marginBottom: 18 }}>
            PIN numérico que te asignó el administrador del taller.
          </p>
          <form onSubmit={submit}>
            <label>
              PIN
              <input
                className="pin-input"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                autoComplete="one-time-code"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
              />
            </label>
            {error && (
              <p style={{ color: 'var(--danger)', fontSize: 13, margin: '0 0 12px' }}>{error}</p>
            )}
            <button className="primary" type="submit" disabled={loading || pin.length < 4}>
              {loading ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
