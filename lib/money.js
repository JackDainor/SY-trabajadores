export function money(n) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(n) || 0);
}

export function monthKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/** Calcula lo ganado por un corte según modo del equipo y rol del miembro */
export function earningsForCut({ payMode, roleMachine, validPieces, prices }) {
  const pieces = Number(validPieces) || 0;
  if (payMode === 'unidad') {
    return pieces * (prices.prenda || 1.4);
  }
  // por_maquina
  if (roleMachine === 'recta') return pieces * (prices.recta || 1);
  if (roleMachine === 'over') return pieces * (prices.over || 0.4);
  return 0;
}
