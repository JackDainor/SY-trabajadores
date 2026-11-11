import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { getSql } from './db';

const COOKIE = 'sy_crop_session';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 días

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) {
    throw new Error('Falta AUTH_SECRET (mín. 16 caracteres) en variables de entorno.');
  }
  return new TextEncoder().encode(s);
}

export async function hashPin(pin) {
  return bcrypt.hash(String(pin), 10);
}

export async function verifyPin(pin, hash) {
  return bcrypt.compare(String(pin), hash);
}

export async function createSession(user) {
  const token = await new SignJWT({
    sub: user.id,
    role: user.role,
    name: user.name,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());

  cookies().set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  cookies().set(COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
}

export async function getSession() {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      id: payload.sub,
      role: payload.role,
      name: payload.name,
    };
  } catch {
    return null;
  }
}

export async function requireUser(roles = null) {
  const session = await getSession();
  if (!session) return null;
  if (roles && !roles.includes(session.role)) return null;

  const sql = getSql();
  const rows = await sql`
    SELECT id, name, role, active, skip_confirm
    FROM users WHERE id = ${session.id} AND active = TRUE
  `;
  return rows[0] || null;
}

export async function loginWithPin(pin) {
  const sql = getSql();
  const users = await sql`
    SELECT id, name, role, pin_hash, active, skip_confirm
    FROM users WHERE active = TRUE
  `;

  for (const u of users) {
    if (await verifyPin(pin, u.pin_hash)) {
      await createSession(u);
      return {
        id: u.id,
        name: u.name,
        role: u.role,
        skip_confirm: u.skip_confirm,
      };
    }
  }
  return null;
}
