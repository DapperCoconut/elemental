/**
 * Math's problem sets. Pure data — no Phaser — so both sims of an online match can deal the same
 * five problems off one relayed seed, and a script can check every answer.
 *
 * Every answer is a whole number, because every answer is typed.
 */

export interface MathProblem {
  /** What the slate shows, without the trailing `= ?`. */
  text: string;
  answer: number;
}

export type Rng = () => number;

/** mulberry32 — small, fast, and identical on both machines. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const int = (rng: Rng, lo: number, hi: number): number => lo + Math.floor(rng() * (hi - lo + 1));
const pick = <T>(rng: Rng, list: readonly T[]): T => list[Math.floor(rng() * list.length)];

const SUP = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];
const SUB = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];
const sup = (n: number): string => String(n).split('').map((d) => SUP[Number(d)]).join('');
const sub = (n: number): string => String(n).split('').map((d) => SUB[Number(d)]).join('');

/** `3x²`, `x`, `7` — one term of a polynomial, unsigned. */
function term(coef: number, power: number): string {
  const c = Math.abs(coef);
  if (power === 0) return String(c);
  const x = power === 1 ? 'x' : `x${sup(power)}`;
  return c === 1 ? x : `${c}${x}`;
}

/** `[coef, power]` pairs, highest power first, as `3x⁴ − 2x² + 7`. */
function poly(terms: [number, number][]): string {
  let out = '';
  terms.forEach(([c, p], i) => {
    if (c === 0) return;
    if (i === 0 || out === '') out += (c < 0 ? '−' : '') + term(c, p);
    else out += (c < 0 ? ' − ' : ' + ') + term(c, p);
  });
  return out;
}

const evalPoly = (terms: [number, number][], x: number): number =>
  terms.reduce((s, [c, p]) => s + c * Math.pow(x, p), 0);

/** d/dx, term by term. */
const derive = (terms: [number, number][]): [number, number][] =>
  terms.filter(([, p]) => p > 0).map(([c, p]) => [c * p, p - 1] as [number, number]);

// ── Crunch the Numbers (the click) ──────────────────────────────────────────

/**
 * One line of arithmetic a person can do without looking away from a fight: single digits,
 * an answer of one or two digits, never negative.
 */
export function crunchProblem(rng: Rng = Math.random): MathProblem {
  const kind = rng();
  if (kind < 0.45) {
    const a = int(rng, 1, 9);
    const b = int(rng, 1, 9);
    return { text: `${a} + ${b}`, answer: a + b };
  }
  if (kind < 0.75) {
    const b = int(rng, 1, 8);
    const a = int(rng, b, 9 + b);
    return { text: `${a} − ${b}`, answer: a - b };
  }
  const a = int(rng, 2, 6);
  const b = int(rng, 2, 6);
  return { text: `${a} × ${b}`, answer: a * b };
}

// ── 42 (the ultimate) ────────────────────────────────────────────────────────

/** Tier 1 — a warm-up. */
function tierOne(rng: Rng): MathProblem {
  const a = int(rng, 4, 9);
  const b = int(rng, 4, 9);
  return { text: `${a} + ${b}`, answer: a + b };
}

/** Tier 2 — needs a second of thought. */
function tierTwo(rng: Rng): MathProblem {
  if (rng() < 0.5) {
    const a = int(rng, 12, 19);
    const b = int(rng, 3, 9);
    return { text: `${a} × ${b}`, answer: a * b };
  }
  const a = int(rng, 61, 99);
  const b = int(rng, 24, 58);
  return { text: `${a} − ${b}`, answer: a - b };
}

/** Tier 3 — algebra against the clock. */
function tierThree(rng: Rng): MathProblem {
  if (rng() < 0.5) {
    const x = int(rng, 6, 14);
    const m = int(rng, 6, 9);
    const k = int(rng, 11, 29);
    return { text: `${m}x − ${k} = ${m * x - k},  x`, answer: x };
  }
  const n = int(rng, 13, 19);
  const k = int(rng, 17, 46);
  return { text: `${n}${sup(2)} − ${k}`, answer: n * n - k };
}

/** Tier 4 — first-year calculus. */
function tierFour(rng: Rng): MathProblem {
  if (rng() < 0.5) {
    const terms: [number, number][] = [[int(rng, 2, 5), 3], [-int(rng, 3, 7), 2], [int(rng, 2, 9), 1]];
    const at = int(rng, 3, 5);
    return { text: `d/dx (${poly(terms)})  at x = ${at}`, answer: evalPoly(derive(terms), at) };
  }
  // ∫₀ᵇ (3a·x² + 2c·x) dx = a·b³ + c·b²
  const a = int(rng, 2, 4);
  const c = int(rng, 2, 6);
  const b = int(rng, 3, 5);
  return {
    text: `∫${sub(0)}${sup(b)} (${poly([[3 * a, 2], [2 * c, 1]])}) dx`,
    answer: a * b * b * b + c * b * b,
  };
}

/** Tier 5 — not meant to be done in seven seconds. */
function tierFive(rng: Rng): MathProblem {
  const kind = pick(rng, ['integral', 'third', 'sum', 'det'] as const);
  if (kind === 'integral') {
    // ∫ₐᵇ (5p·x⁴ − 4q·x³ + 3r·x² − s) dx = [p·x⁵ − q·x⁴ + r·x³ − s·x]
    const p = int(rng, 2, 4);
    const q = int(rng, 3, 7);
    const r = int(rng, 2, 6);
    const s = int(rng, 11, 37);
    const lo = int(rng, 1, 2);
    const hi = int(rng, 4, 6);
    const F = (x: number): number => p * x ** 5 - q * x ** 4 + r * x ** 3 - s * x;
    return {
      text: `∫${sub(lo)}${sup(hi)} (${poly([[5 * p, 4], [-4 * q, 3], [3 * r, 2], [-s, 0]])}) dx`,
      answer: F(hi) - F(lo),
    };
  }
  if (kind === 'third') {
    const terms: [number, number][] = [[int(rng, 2, 4), 7], [-int(rng, 3, 6), 5], [int(rng, 5, 9), 4]];
    const at = int(rng, 2, 3);
    return {
      text: `d${sup(3)}/dx${sup(3)} (${poly(terms)})  at x = ${at}`,
      answer: evalPoly(derive(derive(derive(terms))), at),
    };
  }
  if (kind === 'sum') {
    const n = int(rng, 17, 29);
    const tri = (n * (n + 1)) / 2;
    return { text: `Σ k${sup(3)},  k = 1 … ${n}`, answer: tri * tri };
  }
  const m = Array.from({ length: 9 }, () => int(rng, -7, 9));
  const det = m[0] * (m[4] * m[8] - m[5] * m[7]) - m[1] * (m[3] * m[8] - m[5] * m[6]) + m[2] * (m[3] * m[7] - m[4] * m[6]);
  const n = (v: number): string => (v < 0 ? `−${-v}` : String(v));
  return {
    text: `det [${n(m[0])} ${n(m[1])} ${n(m[2])} | ${n(m[3])} ${n(m[4])} ${n(m[5])} | ${n(m[6])} ${n(m[7])} ${n(m[8])}]`,
    answer: det,
  };
}

const TIERS = [tierOne, tierTwo, tierThree, tierFour, tierFive];

/** How many problems 42 sets. */
export const EXAM_LENGTH = TIERS.length;

/** The five problems of one 42, easy to basically impossible, off one seed. */
export function examProblems(seed: number): MathProblem[] {
  const rng = seededRng(seed);
  return TIERS.map((make) => make(rng));
}

/** The equations that stream into the caster during 42's cutscene. Set dressing only. */
export const CUTSCENE_EQUATIONS: readonly string[] = [
  'e^(iπ) + 1 = 0', 'a² + b² = c²', '∫ eˣ dx = eˣ', 'd/dx sin x = cos x', 'F = ma', 'E = mc²',
  'x = (−b ± √(b²−4ac)) / 2a', 'Σ 1/n² = π²/6', 'lim (1 + 1/n)ⁿ = e', '∇ · E = ρ/ε₀', 'i² = −1',
  'φ = (1 + √5) / 2', 'n! ≈ √(2πn)(n/e)ⁿ', 'sin²θ + cos²θ = 1', '∫₀¹ x² dx = ⅓', 'ζ(2) = π²/6',
  'd/dx xⁿ = n·xⁿ⁻¹', 'A = πr²', 'V − E + F = 2', '6 × 7 = 42', 'log(ab) = log a + log b',
  '∮ B · dl = μ₀I', 'det(AB) = det A · det B', 'P(A|B) = P(B|A)P(A)/P(B)',
];
