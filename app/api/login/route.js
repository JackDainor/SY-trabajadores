import { NextResponse } from 'next/server';
import { loginWithPin } from '@/lib/auth';

export async function POST(req) {
  try {
    const { pin } = await req.json();
    if (!pin || String(pin).length < 4) {
      return NextResponse.json({ error: 'PIN inválido' }, { status: 400 });
    }
    const user = await loginWithPin(String(pin));
    if (!user) {
      return NextResponse.json({ error: 'PIN incorrecto' }, { status: 401 });
    }
    return NextResponse.json({
      id: user.id,
      name: user.name,
      role: user.role,
      skip_confirm: user.skip_confirm,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e.message?.includes('DATABASE') || e.message?.includes('AUTH_SECRET')
        ? e.message
        : 'Error del servidor' },
      { status: 500 }
    );
  }
}
