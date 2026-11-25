import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { glow, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { hazardStripe } from '../art';
import {
  AMBER, AMBER_LIT, CHEREN, CHEREN_DIM, CHEREN_LIT, CONCRETE_DARK, COPPER, COPPER_DARK, COPPER_LIT, GLOW, GLOW_LIT, IRON,
  IRON_DARK, LEAD_DARK, SLAG, SLAG_LIT, VERDIGRIS,
} from '../palette';
import { alive, clamp, dist, wrapAngle } from '../util';

/**
 * Bent by Weight — Separator Cyprian Lowe, magnet.
 *
 * Under the dome the separator sorts the ore by weight. A great magnet bends a stream of ions into
 * half-circles: the light ones turn tight, the heavy ones swing wide, and each lands in its own cup.
 * In the star's telling Lowe sorted the town the same way — the light kept, the heavy sent up the Coil.
 *
 * The rule: from the ion source, ions fly on half-circles laid through where you stand (the whole
 * path glows first; the size of the circle is the ion's weight), then splash in a collector cup where
 * they land. The magnet's field is painted over the yard — dots or crosses. Strike either coil to
 * reverse it: every waiting ion goes round the *other* half of its circle instead — onto him, if you
 * read it right. Past half Lowe takes the source in his own hands: the ions fly from him.
 */

const SLUG = 'calutron';
/** Weights: a light, a middling and a heavy ion — the radius of their circle. */
const MASSES = [95, 150, 210];
const EVERY_MS = 1650;
const WARN_MS = 1150;
const FLIGHT_MS = 520;
const BEAD_DMG = 16;
const BEAD_R = 30;
const SPLASH_R = 54;
const SPLASH_DMG = 10;
const FLIP_LOCK = 900;

interface Ion {
  /** The source point and the circle's centre. */
  sx: number; sy: number; ox: number; oy: number; r: number;
  /** Angle of the source on the circle (from the centre). */
  start: number;
  firesAt: number;
  hit: Set<Fighter>;
  /** Sweep sign, read from the field when it launches. */
  sign: number;
  done: boolean;
  /** Set at half: the ion came from Lowe's hands, so it can't hit him on the way out. */
  fromNpc: boolean;
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng, tk } = ctx;
  const S0: Pt = { x: W / 2, y: (top + H) / 2 + 10 };
  const coils: Pt[] = [{ x: 74, y: S0.y }, { x: W - 74, y: S0.y }];
  let field = 1;
  let flippedAt = -99999;
  let nextIon = -1;
  let inHand = false;
  const ions: Ion[] = [];
  const splashes: { x: number; y: number; at: number }[] = [];

  const flip = () => {
    const now = ctx.scene.time.now;
    if (now - flippedAt < FLIP_LOCK) return;
    field = -field; flippedAt = now;
    tk.sfx('magnet-pull');
  };
  const targets: StrikeTarget[] = coils.map((c) => ctx.target({ x: c.x, y: c.y - 20, r: 36, onStruck: () => flip() }));

  /** Where an ion is on its sweep (0..1) for a given field sign. */
  const at = (ion: Ion, t: number, sign: number): Pt => {
    const a = ion.start + sign * Math.PI * t;
    return { x: ion.ox + Math.cos(a) * ion.r, y: ion.oy + Math.sin(a) * ion.r };
  };
  const landing = (ion: Ion): Pt => ({ x: 2 * ion.ox - ion.sx, y: 2 * ion.oy - ion.sy });
  /** Does the half-circle for this sign pass near a point? */
  const crosses = (ion: Ion, sign: number, p: Pt, pad: number) => {
    const d = dist(p.x, p.y, ion.ox, ion.oy);
    if (Math.abs(d - ion.r) > pad) return false;
    const rel = wrapAngle((Math.atan2(p.y - ion.oy, p.x - ion.ox) - ion.start) * sign);
    return rel >= -0.1 && rel <= Math.PI + 0.1;
  };

  /** Lay a new ion's circle through the player's feet. */
  const lay = (time: number) => {
    const S = inHand ? { x: npc.x, y: npc.y } : S0;
    const d = Math.max(30, dist(S.x, S.y, player.x, player.y));
    const phi = Math.atan2(player.y - S.y, player.x - S.x);
    const fits = MASSES.filter((r) => 2 * r >= d * 1.02);
    const r = fits.length ? fits[Math.floor(rng() * fits.length)] : MASSES[MASSES.length - 1];
    const half = Math.acos(clamp(d / (2 * r), -1, 1));
    // Of the two circles through both points, take the one this field sweeps through the player.
    let best: Ion | null = null;
    for (const s of [-1, 1]) {
      const alpha = phi + s * half;
      const ox = S.x + Math.cos(alpha) * r, oy = S.y + Math.sin(alpha) * r;
      const ion: Ion = { sx: S.x, sy: S.y, ox, oy, r, start: alpha + Math.PI, firesAt: time + WARN_MS, hit: new Set(), sign: field, done: false, fromNpc: inHand };
      if (crosses(ion, field, player, 40)) { best = ion; break; }
      best = best ?? ion;
    }
    if (best) { ions.push(best); tk.sfx('electric-charge'); }
  };

  return {
    update(time) {
      if (nextIon < 0) nextIon = time + 1800;
      if (!inHand && npc.hp <= npc.maxHp * 0.5) {
        inHand = true;
        ctx.banner('LOWE TAKES THE SOURCE IN HIS HANDS', '#b8ecff');
        tk.sfx('plasma-arc');
      }
      if (time >= nextIon) { lay(time); nextIon = time + (inHand ? EVERY_MS * 0.9 : EVERY_MS); }
      for (const ion of ions) {
        if (ion.done) continue;
        if (time < ion.firesAt) { ion.sign = field; continue; }
        const t = clamp((time - ion.firesAt) / FLIGHT_MS, 0, 1);
        const b = at(ion, t, ion.sign);
        for (const f of [player, npc]) {
          if (!alive(f) || ion.hit.has(f) || ctx.isAirborne(f)) continue;
          if (f === npc && ion.fromNpc && t < 0.25) continue;
          if (dist(f.x, f.y, b.x, b.y) < BEAD_R) { ion.hit.add(f); tk.hitFighter(f, BEAD_DMG, f.x, f.y); }
        }
        if (t >= 1) {
          ion.done = true;
          const e = landing(ion);
          splashes.push({ x: e.x, y: e.y, at: time });
          tk.sfx('splash');
          for (const f of [player, npc]) if (alive(f) && !ctx.isAirborne(f) && dist(f.x, f.y, e.x, e.y) < SPLASH_R) tk.hitFighter(f, SPLASH_DMG, f.x, f.y);
        }
      }
      for (let i = ions.length - 1; i >= 0; i--) if (ions[i].done) ions.splice(i, 1);
      while (splashes.length && time - splashes[0].at > 900) splashes.shift();
    },

    npcSeek() {
      // Throw the field when a waiting ion is laid on him, or when flipping it would find the player.
      const now = ctx.scene.time.now;
      for (const ion of ions) {
        if (now >= ion.firesAt) continue;
        const onMe = crosses(ion, field, npc, 44);
        const flipHitsYou = crosses(ion, -field, player, 30) && !crosses(ion, field, player, 30);
        if ((flipHitsYou || onMe) && ion.firesAt - now > 450) {
          const c = coils[dist(npc.x, npc.y, coils[0].x, coils[0].y) < dist(npc.x, npc.y, coils[1].x, coils[1].y) ? 0 : 1];
          if (dist(npc.x, npc.y, c.x, c.y) < 240) return { x: c.x + (c.x < W / 2 ? 46 : -46), y: c.y };
        }
        if (onMe) {
          // Off the ring: inward to the centre if inside, outward if not.
          const d = dist(npc.x, npc.y, ion.ox, ion.oy);
          const a = Math.atan2(npc.y - ion.oy, npc.x - ion.ox);
          const rr = d < ion.r ? Math.max(0, ion.r - 90) : ion.r + 90;
          return { x: clamp(ion.ox + Math.cos(a) * rr, 60, W - 60), y: clamp(ion.oy + Math.sin(a) * rr, top + 50, H - 50) };
        }
      }
      return null;
    },

    destroy() { for (const t of targets) t.remove(); },

    drawGround(g, time) {
      // The field, painted across the floor: dots (out of the stone) or crosses (into it).
      const flipK = clamp((time - flippedAt) / 400, 0, 1);
      for (let y = top + 40; y < H - 20; y += 56) {
        for (let x = 150; x < W - 140; x += 64) {
          const a = 0.16 + 0.08 * flipK;
          if (field > 0) { g.lineStyle(1.5, CHEREN_DIM, a); g.strokeCircle(x, y, 6); g.fillStyle(CHEREN, a + 0.1); g.fillCircle(x, y, 2); }
          else { g.lineStyle(2, COPPER_DARK, a + 0.1); g.lineBetween(x - 5, y - 5, x + 5, y + 5); g.lineBetween(x - 5, y + 5, x + 5, y - 5); }
        }
      }
      // The waiting ions' paths: the half that will fly bright, the other half faint.
      for (const ion of ions) {
        const k = clamp(1 - (ion.firesAt - time) / WARN_MS, 0, 1);
        const flying = time >= ion.firesAt;
        const sign = flying ? ion.sign : field;
        const col = ion.r < 120 ? GLOW : ion.r < 180 ? CHEREN : AMBER;
        g.lineStyle(1, col, 0.18);
        g.strokeCircle(ion.ox, ion.oy, ion.r);
        g.lineStyle(flying ? 3 : 4 + k * 6, col, flying ? 0.25 : 0.15 + k * 0.4);
        g.beginPath();
        for (let i = 0; i <= 28; i++) { const p = at(ion, i / 28, sign); if (i === 0) g.moveTo(p.x, p.y); else g.lineTo(p.x, p.y); }
        g.strokePath();
        const e = landing(ion);
        drawCup(g, e, col, k);
      }
      for (const s of splashes) {
        const k = clamp((time - s.at) / 900, 0, 1);
        g.fillStyle(SLAG, 0.3 * (1 - k)); g.fillCircle(s.x, s.y, SPLASH_R * (0.6 + k * 0.5));
        g.lineStyle(3 * (1 - k), SLAG_LIT, 1 - k); g.strokeCircle(s.x, s.y, SPLASH_R * (0.6 + k * 0.5));
      }
      for (const c of coils) drawCoil(g, c, field, time, flippedAt);
      if (!inHand) drawSource(g, S0, time);
    },

    drawAir(g, time) {
      for (const ion of ions) {
        if (time < ion.firesAt) continue;
        const t = clamp((time - ion.firesAt) / FLIGHT_MS, 0, 1);
        for (let k = 0; k < 6; k++) {
          const p = at(ion, Math.max(0, t - k * 0.03), ion.sign);
          g.fillStyle(k === 0 ? 0xffffff : GLOW_LIT, 1 - k / 6); g.fillCircle(p.x, p.y, 8 - k);
        }
        const b = at(ion, t, ion.sign);
        glow(g, b.x, b.y, 26, CHEREN_LIT, 0.08, 3);
      }
      if (inHand && alive(npc)) {
        // The source cradled in his hands: a filament cage spitting sparks.
        const x = npc.x, y = npc.y - 26;
        g.lineStyle(2, COPPER_LIT, 1); g.strokeCircle(x, y, 9);
        g.fillStyle(GLOW_LIT, 0.7 + Math.sin(time / 50) * 0.3); g.fillCircle(x, y, 4);
        glow(g, x, y, 24, GLOW, 0.07, 3);
      }
    },

    drawHud(g, time) {
      // The field's compass: the sign of the field, and each waiting ion's weight and fuse.
      const x = 26, y = top + 22;
      g.fillStyle(0x000000, 0.55); g.fillRoundedRect(x - 14, y - 16, 40 + 3 * 22, 32, 6);
      g.fillStyle(IRON_DARK, 1); g.fillCircle(x, y, 11);
      if (field > 0) { g.lineStyle(2, CHEREN_LIT, 1); g.strokeCircle(x, y, 8); g.fillStyle(CHEREN_LIT, 1); g.fillCircle(x, y, 3); }
      else { g.lineStyle(3, COPPER_LIT, 1); g.lineBetween(x - 6, y - 6, x + 6, y + 6); g.lineBetween(x - 6, y + 6, x + 6, y - 6); }
      ions.slice(0, 3).forEach((ion, i) => {
        const ix = x + 28 + i * 22;
        const k = clamp(1 - (ion.firesAt - time) / WARN_MS, 0, 1);
        const col = ion.r < 120 ? GLOW : ion.r < 180 ? CHEREN : AMBER;
        g.lineStyle(2, col, 0.4); g.strokeCircle(ix, y, 4 + (ion.r / 210) * 5);
        g.fillStyle(col, 1); g.slice(ix, y, 4 + (ion.r / 210) * 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k, false); g.fillPath();
      });
    },
  };
}

/** A collector cup where an ion lands: a copper bucket on a stand, glowing as its ion comes due. */
function drawCup(g: G, p: Pt, col: number, k: number): void {
  g.fillStyle(col, 0.05 + k * 0.12); g.fillCircle(p.x, p.y, SPLASH_R);
  g.lineStyle(1.5, col, 0.3 + k * 0.5); g.strokeCircle(p.x, p.y, SPLASH_R);
  g.fillStyle(COPPER_DARK, 1); g.fillRect(p.x - 9, p.y - 6, 18, 12);
  g.fillStyle(COPPER, 1); g.fillEllipse(p.x, p.y - 6, 18, 6);
  g.fillStyle(col, 0.5 + k * 0.5); g.fillEllipse(p.x, p.y - 6, 12, 3.5);
}

/** One of the magnet's coils: a copper-wound drum on a concrete plinth, its windings throbbing. */
function drawCoil(g: G, c: Pt, field: number, time: number, flippedAt: number): void {
  const { x, y } = c;
  shadow(g, x, y + 6, 110, 30, 0.4);
  g.fillStyle(CONCRETE_DARK, 1); g.fillRect(x - 44, y - 8, 88, 14);
  hazardStripe(g, x - 44, y + 4, 88, 5, 0.85);
  g.fillStyle(IRON_DARK, 1); g.fillRoundedRect(x - 34, y - 66, 68, 60, 8);
  for (let i = 0; i < 9; i++) {
    const wy = y - 62 + i * 6.4;
    g.fillStyle(i % 2 ? COPPER_DARK : COPPER, 1); g.fillRect(x - 30, wy, 60, 5);
    g.fillStyle(COPPER_LIT, 0.4 + 0.3 * Math.sin(time / 120 + i * 0.7 * field)); g.fillRect(x - 28, wy, 14, 1.5);
  }
  g.fillStyle(VERDIGRIS, 0.6); g.fillRect(x - 32, y - 10, 64, 3);
  g.fillStyle(LEAD_DARK, 1); g.fillRect(x - 36, y - 70, 72, 6);
  // The pole face: glows blue for dots, copper for crosses.
  g.fillStyle(field > 0 ? CHEREN : COPPER_LIT, 0.8); g.fillCircle(x, y - 36, 7);
  glow(g, x, y - 36, 30, field > 0 ? CHEREN : COPPER, 0.05, 3);
  const k = (time - flippedAt) / 400;
  if (k >= 0 && k < 1) { g.lineStyle(4 * (1 - k), AMBER_LIT, 1 - k); g.strokeCircle(x, y - 36, 20 + k * 40); }
}

/** The ion source at the yard's heart: an iron bell-jar on legs with a white-hot filament. */
function drawSource(g: G, s: Pt, time: number): void {
  const { x, y } = s;
  shadow(g, x, y + 4, 60, 18, 0.4);
  for (const k of [-1, 1]) { g.lineStyle(4, IRON_DARK, 1); g.lineBetween(x + k * 18, y + 2, x + k * 10, y - 18); }
  g.fillStyle(IRON, 1); g.fillRect(x - 14, y - 22, 28, 6);
  g.fillStyle(0x2a4a5a, 0.85); g.fillEllipse(x, y - 34, 24, 26);
  g.lineStyle(2, IRON, 1); g.strokeEllipse(x, y - 34, 24, 26);
  const fl = 0.7 + Math.sin(time / 40) * 0.3;
  g.lineStyle(2, GLOW_LIT, fl); g.beginPath(); g.moveTo(x - 6, y - 30); g.lineTo(x - 2, y - 40); g.lineTo(x + 2, y - 30); g.lineTo(x + 6, y - 40); g.strokePath();
  glow(g, x, y - 34, 30, GLOW, 0.06 * fl, 3);
}

export const FALLEN_CALUTRON: GimmickDef = {
  id: fallenId('halflife', SLUG),
  rules: 'Ions fly half-circles through your feet and splash in a cup. Strike a coil to flip the field: they fly the other half. At half, they fly from him.',
  make,
};
