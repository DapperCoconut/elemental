import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { dim, glow, lit, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import {
  GILT, GILT_DARK, GILT_LIT, LACQUER, OAK, OAK_DARK, OAK_LIT, PORCELAIN, PORCELAIN_DARK, SEQ_TEAL, VELVET,
} from '../palette';
import { alive, clamp, dist, other, stepDt } from '../util';

/**
 * Face Value — Fitter Ginevra Stucchi, who fits the court's masks so the Part painted on the brow
 * sits where a Tuner can read it, and who in the King's telling fitted the plaster faces that the
 * muted wore up to the Organ.
 *
 * Four of her finished masks wait on carved wig-stands round the yard. Strike a stand and its mask
 * flies to whoever stands NEAREST that stand — it may not be you. Each face changes the wearer for
 * nine seconds: the white BAUTA guards (blows glance, feet drag); the plague doctor's BEAK bites
 * harder but is bitten harder; the black MORETTA is held in the teeth — mute, no casting, but the
 * cooldowns race behind it; the GATTO runs, with slow paws for spells.
 *
 * Her own trade is the wet volto: a plaster face she throws that sets on a bare face — slow feet,
 * slow cooldowns. A masked face shatters it. The exploit: she walks to the stand she wants; strike
 * the moretta's stand while she is the one nearest it. Halfway down the masks bite back: one worn
 * its whole nine seconds sets hard and stuns its wearer — change faces before it does.
 */

const ID = fallenId('masque', 'face-value');
type Kind = 'bauta' | 'medico' | 'moretta' | 'gatto';
const KINDS: Kind[] = ['bauta', 'medico', 'moretta', 'gatto'];
const WEAR_MS = 9000;
const REFILL_MS = 6500;
const VOLTO_EVERY = 6200;
const VOLTO_WARN = 750;
const VOLTO_SPEED = 235;
const PLASTER_MS = 5000;

interface Stand { x: number; y: number; kind: Kind; full: boolean; refillAt: number; struckAt: number; t: StrikeTarget }
interface Worn { kind: Kind; since: number; until: number }
interface Flight { kind: Kind; from: { x: number; y: number }; to: Fighter; at: number }
interface Volto { x: number; y: number; a: number; born: number; t: StrikeTarget }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk, rng } = ctx;
  const spots = [
    { x: 150, y: top + 120 }, { x: W - 150, y: top + 120 }, { x: 150, y: H - 80 }, { x: W - 150, y: H - 80 },
  ];
  const order = [...KINDS].sort(() => rng() - 0.5);
  const worn = new Map<Fighter, Worn | null>([[player, null], [npc, null]]);
  const flights: Flight[] = [];
  let volto: Volto | null = null;
  let voltoWarnAt = -1;
  let nextVolto = 0;
  let plasterUntil = 0;
  let setHard = false;
  let started = false;
  let bonusGuard = false;
  let silenceTick = 0;

  const stands: Stand[] = spots.map((p, i) => {
    const s: Stand = { x: p.x, y: p.y, kind: order[i], full: true, refillAt: 0, struckAt: -9999, t: null as unknown as StrikeTarget };
    s.t = ctx.target({ x: p.x, y: p.y - 44, r: 20, onStruck: () => strike(s) });
    return s;
  });

  const wornNow = (f: Fighter, now: number): Kind | null => {
    const w = worn.get(f);
    return w && now < w.until ? w.kind : null;
  };

  /** A stand struck: its mask flies to whoever stands nearest it. */
  function strike(s: Stand): void {
    const now = tk.now;
    if (!s.full || now - s.struckAt < 600) return;
    const fs = [player, npc].filter(alive);
    if (!fs.length) return;
    const f = fs.reduce((a, b) => (dist(a.x, a.y, s.x, s.y) <= dist(b.x, b.y, s.x, s.y) ? a : b));
    s.full = false; s.struckAt = now; s.refillAt = now + REFILL_MS;
    flights.push({ kind: s.kind, from: { x: s.x, y: s.y - 48 }, to: f, at: now });
    worn.set(f, { kind: s.kind, since: now, until: now + WEAR_MS });
    if (f === player) plasterUntil = 0;
    ctx.sfx('whoosh');
    ctx.float(f.x, f.y - 52, NAME[s.kind], '#f2ece4');
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextVolto = time + 3200; }
      if (!setHard && npc.hp <= npc.maxHp * 0.5) {
        setHard = true;
        ctx.banner('The masks bite back: wear one its whole span and it sets on you.', '#f2ece4');
        ctx.sfx('curse-cast');
      }
      for (const s of stands) if (!s.full && time >= s.refillAt) { s.full = true; ctx.sfx('sparkle'); }

      // Masks worn out: they drop — or, past half, set hard and stun.
      for (const f of [player, npc]) {
        const w = worn.get(f);
        if (!w || time < w.until) continue;
        worn.set(f, null);
        if (setHard && alive(f)) {
          ctx.stun(f, 900);
          if (f === player) tk.hitPlayer(8, f.x, f.y); else ctx.hit(f, 10, f.x, f.y);
          ctx.float(f.x, f.y - 52, 'SET HARD', '#f2ece4');
          ctx.sfx('stone-slam');
        }
      }

      // The moretta is held in the teeth: no casting while it is on.
      if (time >= silenceTick) {
        silenceTick = time + 300;
        for (const f of [player, npc]) if (wornNow(f, time) === 'moretta') ctx.silence(f, 420);
      }

      // Her wet volto.
      if (voltoWarnAt < 0 && !volto && time >= nextVolto - VOLTO_WARN && alive(npc) && alive(player)) {
        voltoWarnAt = time;
        ctx.sfx('beam-charge');
      }
      if (voltoWarnAt >= 0 && time >= nextVolto) {
        voltoWarnAt = -1;
        nextVolto = time + VOLTO_EVERY;
        const a = Math.atan2(player.y - npc.y, player.x - npc.x);
        const v: Volto = { x: npc.x, y: npc.y - 30, a, born: time, t: null as unknown as StrikeTarget };
        v.t = ctx.target({ x: v.x, y: v.y, r: 16, onStruck: (by) => { if (by === 'player') smash(v, 'STRUCK DOWN'); } });
        volto = v;
        ctx.sfx('grenade-throw');
      }
      if (volto) {
        const v = volto;
        const want = Math.atan2(player.y - v.y, player.x - v.x);
        let d = want - v.a;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        v.a += clamp(d, -0.85 * dt, 0.85 * dt);
        v.x += Math.cos(v.a) * VOLTO_SPEED * dt; v.y += Math.sin(v.a) * VOLTO_SPEED * dt;
        v.t.moveTo(v.x, v.y);
        if (alive(player) && dist(v.x, v.y, player.x, player.y) < 32) {
          if (wornNow(player, time)) {
            tk.hitPlayer(6, player.x, player.y);
            smash(v, 'SHATTERS ON THE MASK');
          } else {
            tk.hitPlayer(10, player.x, player.y);
            plasterUntil = time + PLASTER_MS;
            smash(v, 'PLASTER SETS');
            ctx.sfx('slime-splat');
          }
        } else if (time - v.born > 3200 || v.x < 20 || v.x > W - 20 || v.y < top || v.y > H - 10) {
          smash(v, '');
        }
      }
      while (flights.length && time - flights[0].at > 320) flights.shift();
    },

    playerSpeedMult() {
      const now = tk.now;
      const k = wornNow(player, now);
      const m = k === 'bauta' ? 0.72 : k === 'gatto' ? 1.35 : 1;
      return now < plasterUntil ? m * 0.8 : m;
    },
    npcSpeedMult() {
      const k = wornNow(npc, tk.now);
      return k === 'bauta' ? 0.72 : k === 'gatto' ? 1.35 : 1;
    },
    playerTakenMult() { return taken(wornNow(player, tk.now)); },
    npcTakenMult() { return taken(wornNow(npc, tk.now)); },
    playerCooldownRate() {
      const now = tk.now;
      const r = rate(wornNow(player, now));
      return now < plasterUntil ? r * 0.45 : r;
    },
    npcCooldownRate() { return rate(wornNow(npc, tk.now)); },

    onNpcHurt(amount) { beak(player, amount); },
    onPlayerHurt(amount) { beak(npc, amount); },

    npcSeek() {
      const now = tk.now;
      const mine = worn.get(npc);
      if (mine && mine.until - now > (setHard ? 2600 : 2000)) return null;
      const ratio = npc.hp / npc.maxHp;
      const want: Kind = ratio < 0.4 ? 'bauta' : wornNow(player, now) === 'bauta' ? 'gatto' : 'medico';
      const s = stands.find((t) => t.full && t.kind === want) ?? stands.find((t) => t.full && t.kind !== 'moretta');
      if (!s) return null;
      // Stand between the stand and the player, so she is the nearest when it is struck.
      const a = Math.atan2(player.y - s.y, player.x - s.x);
      return { x: clamp(s.x + Math.cos(a) * 34, 60, W - 60), y: clamp(s.y + Math.sin(a) * 34, top + 40, H - 40) };
    },

    drawGround(g, time) {
      // A fitter's yard: a chalked fitting-circle by each stand, and the shed plaster flecks.
      for (const s of stands) {
        g.lineStyle(2, PORCELAIN_DARK, 0.35); g.strokeEllipse(s.x, s.y + 4, 120, 46);
        g.lineStyle(1, PORCELAIN_DARK, 0.25);
        for (let k = 0; k < 12; k++) {
          const a = (k / 12) * Math.PI * 2;
          g.lineBetween(s.x + Math.cos(a) * 54, s.y + 4 + Math.sin(a) * 20, s.x + Math.cos(a) * 60, s.y + 4 + Math.sin(a) * 23);
        }
        if (s.full) { g.fillStyle(COLOR[s.kind], 0.1 + 0.05 * Math.sin(time / 400 + s.x)); g.fillEllipse(s.x, s.y + 4, 108, 40); }
      }
    },

    drawAir(g, time) {
      for (const s of stands) drawStand(g, s, time);
      // Masks flying to their new face.
      for (const f of flights) {
        const k = clamp((time - f.at) / 320, 0, 1);
        const x = f.from.x + (f.to.x - f.from.x) * k, y = f.from.y + (f.to.y - 34 - f.from.y) * k - Math.sin(k * Math.PI) * 40;
        drawMask(g, f.kind, x, y, 0.9, 1, k * 6);
      }
      // Each fighter's face, worn over theirs with a timer ribbon.
      for (const f of [player, npc]) {
        const w = worn.get(f);
        if (!w || time >= w.until || !alive(f) || flights.some((fl) => fl.to === f)) continue;
        drawMask(g, w.kind, f.x, f.y - 34, 0.62, 0.95, 0);
        const k = (w.until - time) / WEAR_MS;
        g.lineStyle(2, setHard && k < 0.25 ? 0xff6a4a : GILT, 0.85);
        g.beginPath(); g.arc(f.x, f.y - 34, 17, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k); g.strokePath();
      }
      if (time < plasterUntil && alive(player)) {
        drawVolto(g, player.x, player.y - 34, 0.6, 0.75);
        g.fillStyle(0x9a9a92, 0.5); g.fillCircle(player.x - 5, player.y - 22, 2); g.fillCircle(player.x + 6, player.y - 20, 1.6);
      }
      // Her hand raising the wet face.
      if (voltoWarnAt >= 0 && alive(npc)) {
        const k = clamp((time - voltoWarnAt) / VOLTO_WARN, 0, 1);
        drawVolto(g, npc.x + 18, npc.y - 46 - k * 10, 0.5 + k * 0.2, 0.6 + k * 0.4);
      }
      if (volto) {
        const v = volto;
        g.lineStyle(3, PORCELAIN, 0.2); g.lineBetween(v.x, v.y, v.x - Math.cos(v.a) * 26, v.y - Math.sin(v.a) * 26);
        drawVolto(g, v.x, v.y, 0.8, 1, (time - v.born) / 200);
      }
    },

    drawHud(g) {
      // Two cameo frames: your face and hers, with what each wears.
      const now = tk.now;
      [player, npc].forEach((f, i) => {
        const x = 22 + i * 64, y = top + 10;
        g.fillStyle(0x14121a, 0.75); g.fillRoundedRect(x, y, 56, 56, 8);
        g.lineStyle(2, i === 0 ? SEQ_TEAL : VELVET, 0.9); g.strokeRoundedRect(x, y, 56, 56, 8);
        const k = wornNow(f, now);
        if (k) {
          drawMask(g, k, x + 28, y + 26, 0.62, 1, 0);
          const w = worn.get(f);
          if (w) { g.fillStyle(GILT, 0.9); g.fillRect(x + 6, y + 49, 44 * ((w.until - now) / WEAR_MS), 3); }
        } else if (f === player && now < plasterUntil) {
          drawVolto(g, x + 28, y + 26, 0.62, 1);
        } else {
          g.fillStyle(0x6a5a50, 0.5); g.fillEllipse(x + 28, y + 26, 22, 28);
        }
      });
    },

    destroy() {
      for (const s of stands) s.t.remove();
      volto?.t.remove();
    },
  };

  function smash(v: Volto, label: string): void {
    if (volto !== v) return;
    v.t.remove();
    volto = null;
    ctx.flash(v.x, v.y, PORCELAIN);
    if (label) ctx.float(v.x, v.y - 20, label, '#f2ece4');
    ctx.sfx('crystal-shatter');
  }

  /** The beak bites: blows by a beak-wearer land 40 % heavier. */
  function beak(dealer: Fighter, amount: number): void {
    if (bonusGuard || wornNow(dealer, tk.now) !== 'medico') return;
    const victim = other(dealer, player, npc);
    bonusGuard = true;
    ctx.hit(victim, amount * 0.4, victim.x, victim.y);
    bonusGuard = false;
  }
}

const NAME: Record<Kind, string> = { bauta: 'BAUTA', medico: 'THE BEAK', moretta: 'MORETTA', gatto: 'GATTO' };
const COLOR: Record<Kind, number> = { bauta: 0xf2ece4, medico: 0xe8dcc0, moretta: 0x2a1a2a, gatto: 0xf0c75a };
const taken = (k: Kind | null): number => (k === 'bauta' ? 0.65 : k === 'medico' ? 1.3 : 1);
const rate = (k: Kind | null): number => (k === 'moretta' ? 2.4 : k === 'gatto' ? 0.6 : 1);

/** A carved oak wig-stand: tripod feet, turned pole, a blank block head wearing the mask. */
function drawStand(g: G, s: Stand, time: number): void {
  shadow(g, s.x, s.y + 2, 46, 12, 0.3);
  g.lineStyle(4, OAK_DARK, 1);
  g.lineBetween(s.x, s.y - 14, s.x - 18, s.y + 2); g.lineBetween(s.x, s.y - 14, s.x + 18, s.y + 2); g.lineBetween(s.x, s.y - 14, s.x + 3, s.y + 5);
  g.fillStyle(OAK, 1); g.fillRect(s.x - 3, s.y - 40, 6, 28);
  for (const yy of [-36, -26, -18]) { g.fillStyle(OAK_LIT, 1); g.fillEllipse(s.x, s.y + yy, 10, 4); }
  g.fillStyle(dim(OAK_LIT, 0.1), 1); g.fillEllipse(s.x, s.y - 48, 22, 26);
  g.fillStyle(OAK_DARK, 0.5); g.fillEllipse(s.x + 4, s.y - 46, 10, 20);
  if (s.full) {
    drawMask(g, s.kind, s.x, s.y - 48, 0.8, 1, Math.sin(time / 700 + s.x) * 1.5);
    // A tag on a ribbon naming the face.
    g.lineStyle(1, GILT, 0.8); g.lineBetween(s.x + 10, s.y - 38, s.x + 22, s.y - 24);
    g.fillStyle(PORCELAIN, 0.9); g.fillRect(s.x + 18, s.y - 26, 12, 8);
    g.fillStyle(COLOR[s.kind], 1); g.fillCircle(s.x + 24, s.y - 22, 2.4);
  } else {
    g.lineStyle(1, GILT_DARK, 0.6); g.strokeEllipse(s.x, s.y - 48, 22, 26);
  }
}

/** The five faces of the fitter's bench, each drawn in its own build. `bob` lifts it a little. */
function drawMask(g: G, kind: Kind, x: number, y: number, s: number, a: number, bob: number): void {
  const yy = y - bob;
  if (kind === 'bauta') {
    // White full face, square jutting jaw (so the wearer can eat without unmasking), gilt brow.
    g.fillStyle(PORCELAIN, a); g.fillRoundedRect(x - 11 * s, yy - 15 * s, 22 * s, 24 * s, 7 * s);
    g.fillTriangle(x - 11 * s, yy + 4 * s, x + 11 * s, yy + 4 * s, x + 4 * s, yy + 17 * s);
    g.fillStyle(PORCELAIN_DARK, a); g.fillTriangle(x - 2 * s, yy + 6 * s, x + 11 * s, yy + 4 * s, x + 4 * s, yy + 17 * s);
    g.fillStyle(GILT, a); g.fillRect(x - 10 * s, yy - 13 * s, 20 * s, 3 * s);
    g.fillStyle(LACQUER, a); g.fillEllipse(x - 5 * s, yy - 5 * s, 6 * s, 4 * s); g.fillEllipse(x + 5 * s, yy - 5 * s, 6 * s, 4 * s);
    g.lineStyle(1, PORCELAIN_DARK, a); g.lineBetween(x, yy - 3 * s, x - 1 * s, yy + 3 * s);
  } else if (kind === 'medico') {
    // The plague doctor: domed face, round glass eyes, the long curved beak.
    g.fillStyle(0xe8dcc0, a); g.fillCircle(x, yy - 4 * s, 11 * s);
    g.fillTriangle(x - 4 * s, yy + 1 * s, x + 5 * s, yy - 2 * s, x + 20 * s, yy + 16 * s);
    g.fillStyle(dim(0xe8dcc0, 0.25), a); g.fillTriangle(x - 2 * s, yy + 4 * s, x + 4 * s, yy + 2 * s, x + 20 * s, yy + 16 * s);
    g.fillStyle(0x6ab0c0, a); g.fillCircle(x - 4 * s, yy - 6 * s, 3.6 * s); g.fillCircle(x + 5 * s, yy - 6 * s, 3.6 * s);
    g.lineStyle(1.5 * s, GILT_DARK, a); g.strokeCircle(x - 4 * s, yy - 6 * s, 3.6 * s); g.strokeCircle(x + 5 * s, yy - 6 * s, 3.6 * s);
    g.fillStyle(0xffffff, a * 0.8); g.fillCircle(x - 5 * s, yy - 7 * s, 1 * s);
  } else if (kind === 'moretta') {
    // The mute black oval, velvet, held by a button in the teeth.
    g.fillStyle(0x1a0e1a, a); g.fillEllipse(x, yy - 2 * s, 20 * s, 26 * s);
    g.fillStyle(0x3a2a3a, a); g.fillEllipse(x - 3 * s, yy - 6 * s, 9 * s, 12 * s);
    g.fillStyle(0x000000, a); g.fillEllipse(x - 4.5 * s, yy - 4 * s, 5 * s, 3.5 * s); g.fillEllipse(x + 4.5 * s, yy - 4 * s, 5 * s, 3.5 * s);
    g.fillStyle(GILT_LIT, a); g.fillCircle(x, yy + 6 * s, 1.6 * s);
  } else {
    // The gatto: a gilt cat with pointed ears and painted whiskers.
    g.fillStyle(GILT, a);
    g.fillTriangle(x - 11 * s, yy - 6 * s, x - 7 * s, yy - 18 * s, x - 2 * s, yy - 9 * s);
    g.fillTriangle(x + 11 * s, yy - 6 * s, x + 7 * s, yy - 18 * s, x + 2 * s, yy - 9 * s);
    g.fillEllipse(x, yy - 2 * s, 24 * s, 18 * s);
    g.fillStyle(GILT_LIT, a); g.fillEllipse(x - 3 * s, yy - 6 * s, 10 * s, 5 * s);
    g.fillStyle(0x1a1410, a); g.fillTriangle(x - 8 * s, yy - 4 * s, x - 2 * s, yy - 5 * s, x - 4 * s, yy - 1 * s);
    g.fillTriangle(x + 8 * s, yy - 4 * s, x + 2 * s, yy - 5 * s, x + 4 * s, yy - 1 * s);
    g.lineStyle(1, GILT_DARK, a);
    for (const d of [-1, 1]) { g.lineBetween(x + d * 3 * s, yy + 3 * s, x + d * 13 * s, yy + 1 * s); g.lineBetween(x + d * 3 * s, yy + 4 * s, x + d * 13 * s, yy + 6 * s); }
    g.fillStyle(VELVET, a); g.fillTriangle(x - 1.5 * s, yy + 1 * s, x + 1.5 * s, yy + 1 * s, x, yy + 3 * s);
  }
}

/** The wet plaster volto: a plain white face, grey where it is still wet, dripping. */
function drawVolto(g: G, x: number, y: number, s: number, a: number, spin = 0): void {
  const tilt = Math.sin(spin) * 3 * s;
  glow(g, x, y, 16 * s, PORCELAIN, 0.05 * a, 2);
  g.fillStyle(lit(PORCELAIN_DARK, 0.2), a); g.fillEllipse(x + tilt, y, 22 * s, 28 * s);
  g.fillStyle(PORCELAIN, a); g.fillEllipse(x + tilt - 2 * s, y - 2 * s, 18 * s, 24 * s);
  g.fillStyle(0x8a867e, a); g.fillEllipse(x + tilt - 4 * s, y - 4 * s, 5 * s, 3 * s); g.fillEllipse(x + tilt + 4 * s, y - 4 * s, 5 * s, 3 * s);
  g.lineStyle(1.2 * s, 0x8a867e, a); g.lineBetween(x + tilt - 3 * s, y + 7 * s, x + tilt + 3 * s, y + 7 * s);
  g.fillStyle(0xb8b4aa, a * 0.8); g.fillCircle(x + tilt + 6 * s, y + 13 * s, 1.6 * s); g.fillCircle(x + tilt - 5 * s, y + 14 * s, 1.2 * s);
}

export const FALLEN_FACE_VALUE: GimmickDef = {
  id: ID,
  rules: 'Strike a mask-stand: its mask flies to whoever is nearest it. Bauta guards, beak bites, moretta mutes but races cooldowns. Plaster sets bare faces.',
  make,
};
