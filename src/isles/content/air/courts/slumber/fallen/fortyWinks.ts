import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, lit, type G } from '../../../../../art/IsleArt';
import { BRASS, BRASS_DARK, DREAM, DREAM_LIT, FEATHER, LINEN, NIGHTMARE, NIGHTMARE_EYE, QUILT_LAV, QUILT_ROSE, QUILT_SKY, dist, nightcapOn, zzz } from '../art';
import { fallenId } from '../../../../meteor/spec';
import { EMBER, alive, hudPlate } from './kit';

/**
 * Forty Winks — Milliner Tassel, Capmaker to His Drowsiness. Every nightcap in the Slumber Court
 * comes off her block, and in the star's telling each one has a little sand-glass sewn into the
 * crown: put it on and you get forty winks' worth of dreaming done in no time at all — and then
 * the sand runs out and you are asleep where you stand.
 *
 * Caps flutter down out of the dark on a growing shadow. One lands on whoever is nearest where its
 * shadow falls; a cap nobody is under lies on the quilt a while for anyone to walk into. Wearing a
 * cap, your cooldowns run more than twice as fast — and when its sand is out you doze (a real
 * stun). Take it for a burst, or step out from under it. Steer the drops onto her and punish the
 * doze: the caps cannot tell her head from yours.
 *
 * Halfway down she starts sewing the black ones: caps drop two at a time and one is a nightmare
 * cap — under it time drags (cooldowns at half speed) and every blow lands harder, with no doze to
 * end it early. Read the colours as they fall. The bot runs under white caps when it is nearer
 * than you, gives black shadows a wide berth, and closes in when your sand is running out.
 */

const ID = fallenId('slumber', 'forty-winks');
const EVERY_MS = 3100;
const FALL_MS = 1500;
const CATCH_R = 50;
const PICK_R = 30;
const LIE_MS = 4500;
const WHITE_MS = 4200;
const BLACK_MS = 3500;
const DOZE_MS = 1300;
const FAST = 2.4;
const SLOW = 0.5;
const BLACK_TAKEN = 1.35;

type Kind = 'white' | 'black';
interface Cap { x: number; y: number; kind: Kind; t0: number; landAt: number; lyingUntil: number; seed: number }
interface Worn { kind: Kind; at: number; until: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { player, npc, tk } = ctx;
  let caps: Cap[] = [];
  const worn = new Map<Fighter, Worn>();
  const dozeAt = new Map<Fighter, number>();
  let nextAt = 0;
  let started = false;
  let black = false;
  let drop = 0;
  let seed = 1;

  const wearing = (f: Fighter, now: number): Worn | null => {
    const w = worn.get(f);
    return w && now < w.until ? w : null;
  };

  function spot(i: number): Pt {
    // Turn and turn about: one near you, one near her, one anywhere.
    const who = i % 3 === 0 ? player : i % 3 === 1 ? npc : null;
    const a = ctx.rng() * Math.PI * 2, r = 50 + ctx.rng() * 90;
    const base = who ? { x: who.x, y: who.y } : { x: 120 + ctx.rng() * (ctx.W - 240), y: ctx.top + 70 + ctx.rng() * (ctx.H - ctx.top - 140) };
    return { x: tk.clampX(base.x + (who ? Math.cos(a) * r : 0), 60), y: tk.clampY(base.y + (who ? Math.sin(a) * r : 0), 60) };
  }

  function put(f: Fighter, kind: Kind, time: number): void {
    worn.set(f, { kind, at: time, until: time + (kind === 'white' ? WHITE_MS : BLACK_MS) });
    ctx.sfx(kind === 'white' ? 'sparkle' : 'curse-cast');
    if (f === npc) ctx.float(npc.x, npc.y - 60, kind === 'white' ? 'CAPPED' : 'BLACK CAP', kind === 'white' ? '#e4d8ff' : '#ff8a6a');
  }

  return {
    update(time) {
      if (!started) { started = true; nextAt = time + 1500; ctx.banner('FORTY WINKS', '#e4d8ff'); }
      if (!black && npc.hp < npc.maxHp * 0.5) { black = true; ctx.banner('THE BLACK CAPS', '#ff8a6a'); ctx.sfx('status-debuff'); }

      if (time >= nextAt) {
        nextAt = time + EVERY_MS;
        const fall = tk.warn(FALL_MS);
        const a = spot(drop++);
        caps.push({ ...a, kind: 'white', t0: time, landAt: time + fall, lyingUntil: 0, seed: seed++ });
        if (black) {
          let b = spot(drop++);
          for (let i = 0; i < 4 && dist(a.x, a.y, b.x, b.y) < 170; i++) b = spot(drop++);
          caps.push({ ...b, kind: 'black', t0: time, landAt: time + fall, lyingUntil: 0, seed: seed++ });
        }
      }

      for (const c of [...caps]) {
        if (!c.lyingUntil && time >= c.landAt) {
          // Lands on whoever is nearest its shadow and bare-headed.
          let best: Fighter | null = null, bd = CATCH_R;
          for (const f of [player, npc]) {
            if (!alive(f) || wearing(f, time)) continue;
            const d = dist(f.x, f.y, c.x, c.y);
            if (d < bd) { bd = d; best = f; }
          }
          if (best) { put(best, c.kind, time); caps = caps.filter((o) => o !== c); continue; }
          if (c.kind === 'black') { caps = caps.filter((o) => o !== c); ctx.sfx('smoke'); continue; }
          c.lyingUntil = time + LIE_MS;
          ctx.sfx('land');
        }
        if (c.lyingUntil) {
          if (time >= c.lyingUntil) { caps = caps.filter((o) => o !== c); continue; }
          for (const f of [player, npc]) {
            if (alive(f) && !wearing(f, time) && dist(f.x, f.y, c.x, c.y) < PICK_R) { put(f, c.kind, time); caps = caps.filter((o) => o !== c); break; }
          }
        }
      }

      // A white cap's sand runs out: asleep where you stand.
      for (const [f, w] of [...worn]) {
        if (time < w.until) continue;
        worn.delete(f);
        if (w.kind === 'white' && alive(f)) { ctx.stun(f, DOZE_MS); dozeAt.set(f, time); ctx.sfx('hush'); }
      }
    },

    playerCooldownRate() { const w = wearing(player, tk.now); return w ? (w.kind === 'white' ? FAST : SLOW) : 1; },
    npcCooldownRate() { const w = wearing(npc, tk.now); return w ? (w.kind === 'white' ? FAST : SLOW) : 1; },
    playerTakenMult() { const w = wearing(player, tk.now); return w && w.kind === 'black' ? BLACK_TAKEN : 1; },
    npcTakenMult() { const w = wearing(npc, tk.now); return w && w.kind === 'black' ? BLACK_TAKEN : 1; },

    npcSeek(): Pt | null {
      const now = tk.now;
      // Black shadow under her: out, the short way.
      for (const c of caps) {
        if (c.kind !== 'black' || c.lyingUntil) continue;
        const d = dist(npc.x, npc.y, c.x, c.y);
        if (d < CATCH_R + 50) {
          const a = d > 1 ? Math.atan2(npc.y - c.y, npc.x - c.x) : 1;
          return { x: tk.clampX(c.x + Math.cos(a) * 130), y: tk.clampY(c.y + Math.sin(a) * 130) };
        }
      }
      // Your sand nearly out: come in for the doze.
      const pw = wearing(player, now);
      if (pw && pw.kind === 'white' && pw.until - now < 900) return { x: player.x, y: player.y };
      // Her own sand nearly out: back off before she nods.
      const nw = wearing(npc, now);
      if (nw && nw.kind === 'white' && nw.until - now < 1200) {
        const a = Math.atan2(npc.y - player.y, npc.x - player.x);
        return { x: tk.clampX(npc.x + Math.cos(a) * 180), y: tk.clampY(npc.y + Math.sin(a) * 180) };
      }
      // A white cap she can reach before you: under it.
      if (!nw) {
        for (const c of caps) {
          if (c.kind !== 'white') continue;
          if (dist(npc.x, npc.y, c.x, c.y) + 30 < dist(player.x, player.y, c.x, c.y)) return { x: c.x, y: c.y };
        }
      }
      return null;
    },

    drawGround(g, time) {
      const t = time / 1000;
      for (const c of caps) {
        if (c.lyingUntil) {
          // Lying on the quilt: a crumpled cap with its pompom, gently breathing sand.
          const fade = Math.min(1, (c.lyingUntil - time) / 800);
          g.fillStyle(0x000000, 0.25 * fade); g.fillEllipse(c.x, c.y + 4, 40, 10);
          g.lineStyle(1.5, DREAM_LIT, 0.4 * fade + 0.2 * Math.sin(t * 5)); g.strokeCircle(c.x, c.y, PICK_R);
          continue;
        }
        // The falling cap's shadow: grows and sharpens as it comes down.
        const k = Math.max(0, Math.min(1, (time - c.t0) / (c.landAt - c.t0)));
        const col = c.kind === 'white' ? 0x2a2450 : 0x3a0a14;
        g.fillStyle(col, 0.15 + 0.35 * k); g.fillEllipse(c.x, c.y, CATCH_R * 2 * (0.4 + 0.6 * k), CATCH_R * 0.9 * (0.4 + 0.6 * k));
        g.lineStyle(2, c.kind === 'white' ? DREAM_LIT : NIGHTMARE_EYE, 0.4 + 0.4 * k); g.strokeEllipse(c.x, c.y, CATCH_R * 2, CATCH_R * 0.9);
        // The sand-glass sigil stitched into the shadow — the cap's whole trick, shown.
        drawGlass(g, c.x, c.y - 2, 7, c.kind === 'white' ? 1 - k : k, 0.6 * k, c.kind === 'white' ? 0xf2d890 : NIGHTMARE_EYE);
      }
    },

    drawAir(g, time) {
      const t = time / 1000;
      for (const c of caps) {
        const colour = c.kind === 'white' ? [QUILT_LAV, QUILT_ROSE, QUILT_SKY][c.seed % 3] : NIGHTMARE;
        if (c.lyingUntil) {
          drawCap(g, c.x, c.y - 4, 13, colour, c.kind, 0, 1);
          continue;
        }
        const k = Math.max(0, Math.min(1, (time - c.t0) / (c.landAt - c.t0)));
        // Fluttering down: swinging side to side like a leaf, a ribbon of sand trailing.
        const sway = Math.sin(t * 5 + c.seed) * 30 * (1 - k);
        const x = c.x + sway, y = c.y - 360 * (1 - k) - 20;
        for (let i = 1; i <= 5; i++) {
          g.fillStyle(c.kind === 'white' ? 0xf2d890 : NIGHTMARE_EYE, 0.5 * (1 - i / 6));
          g.fillCircle(x - Math.sin(t * 5 + c.seed - i * 0.3) * 30 * (1 - k) , y - i * 9, 2);
        }
        drawCap(g, x, y, 14, colour, c.kind, Math.sin(t * 5 + c.seed) * 0.5, 1);
      }
      // Caps on heads: the cap, a sand-glass ring at the feet running down, and the doze after.
      for (const f of [player, npc]) {
        if (!alive(f)) continue;
        const w = wearing(f, time);
        if (w) {
          const k = (time - w.at) / (w.until - w.at);
          const colour = w.kind === 'white' ? (f === player ? QUILT_SKY : QUILT_ROSE) : NIGHTMARE;
          nightcapOn(g, f.x, f.y - 26, 14, colour, 1, 0.3 + k * 0.6, Math.sin(t * 3) * 2);
          drawGlass(g, f.x + 10, f.y - 46, 5, 1 - k, 1, w.kind === 'white' ? 0xf2d890 : NIGHTMARE_EYE);
          g.lineStyle(3, 0x1a1430, 0.5); g.strokeCircle(f.x, f.y + 4, 26);
          g.lineStyle(3, w.kind === 'white' ? 0xf2d890 : NIGHTMARE_EYE, 0.9);
          g.beginPath(); g.arc(f.x, f.y + 4, 26, -Math.PI / 2, -Math.PI / 2 + (1 - k) * Math.PI * 2, false); g.strokePath();
          if (w.kind === 'white') {
            // Dreaming fast: little stars spinning off the cap.
            for (let i = 0; i < 3; i++) {
              const a = t * 6 + i * 2.1;
              g.fillStyle(DREAM_LIT, 0.8); g.fillCircle(f.x + Math.cos(a) * 22, f.y - 40 + Math.sin(a) * 8, 2);
            }
          }
        }
        const dz = dozeAt.get(f);
        if (dz !== undefined && time - dz < DOZE_MS) {
          nightcapOn(g, f.x, f.y - 26, 14, DREAM, 0.6, 1, 0);
          zzz(g, f.x + 16, f.y - 46, 7, t, DREAM_LIT, 1);
        }
      }
    },

    drawHud(g, time) {
      const w = wearing(player, time);
      if (!w) return;
      // An hourglass: the sand in the cap you are wearing.
      const k = (time - w.at) / (w.until - w.at);
      const x = 40, y = ctx.H - 50;
      hudPlate(g, x - 24, y - 34, 150, 62);
      drawGlass(g, x, y - 4, 18, 1 - k, 1, w.kind === 'white' ? 0xf2d890 : NIGHTMARE_EYE);
      g.fillStyle(w.kind === 'white' ? DREAM_LIT : NIGHTMARE_EYE, 1);
      for (let i = 0; i < 3; i++) g.fillTriangle(x + 36 + i * 22, y - 14, x + 36 + i * 22, y + 4, x + 50 + i * 22, y - 5);
      if (w.kind === 'black') { g.fillStyle(NIGHTMARE, 1); g.fillRect(x + 32, y - 18, 72, 26); g.fillStyle(NIGHTMARE_EYE, 1); g.fillCircle(x + 52, y - 5, 3); g.fillCircle(x + 84, y - 5, 3); }
    },
  };
}

/**
 * A nightcap on its own — a soft cone slumped over, a turned-up brim, a pompom, and the little
 * brass sand-glass Tassel sews into every crown. A black cap has a red-eyed pompom.
 */
function drawCap(g: G, x: number, y: number, s: number, colour: number, kind: Kind, tilt: number, a: number): void {
  const c = Math.cos(tilt), sn = Math.sin(tilt);
  const P = (dx: number, dy: number): Pt => ({ x: x + dx * c - dy * sn, y: y + dx * sn + dy * c });
  const b0 = P(-s, 0), b1 = P(s, 0), mid = P(s * 0.3, -s * 1.6), tip = P(s * 1.5, -s * 0.9);
  g.fillStyle(0x000000, 0.18 * a); g.fillEllipse(x, y + s * 0.4, s * 2.2, s * 0.6);
  g.fillStyle(dim(colour, 0.3), a); g.fillTriangle(b0.x, b0.y + 1, b1.x, b1.y + 1, mid.x, mid.y + 1);
  g.fillStyle(colour, a); g.fillTriangle(b0.x, b0.y, b1.x, b1.y, mid.x, mid.y);
  g.fillTriangle(mid.x, mid.y, tip.x, tip.y, P(s * 0.6, -s * 0.5).x, P(s * 0.6, -s * 0.5).y);
  g.lineStyle(1.2, lit(colour, 0.3), a); g.lineBetween(P(-s * 0.3, -s * 0.4).x, P(-s * 0.3, -s * 0.4).y, mid.x, mid.y);
  g.fillStyle(kind === 'white' ? lit(colour, 0.45) : 0x4a2a3a, a); g.fillRoundedRect(Math.min(b0.x, b1.x) - 2, Math.min(b0.y, b1.y) - s * 0.28, Math.abs(b1.x - b0.x) + 4, s * 0.42, s * 0.15);
  g.fillStyle(kind === 'white' ? FEATHER : NIGHTMARE_EYE, a); g.fillCircle(tip.x, tip.y, s * 0.32);
  g.fillStyle(kind === 'white' ? LINEN : 0xffd0d0, a); g.fillCircle(tip.x - 1, tip.y - 1, s * 0.14);
  const gp = P(0, -s * 0.75);
  g.fillStyle(BRASS_DARK, a); g.fillRect(gp.x - 3, gp.y - 4, 6, 8);
  g.fillStyle(BRASS, a); g.fillRect(gp.x - 2.4, gp.y - 3.4, 4.8, 6.8);
  g.fillStyle(EMBER, a * 0.8); g.fillCircle(gp.x, gp.y, 1.2);
}

/** A little sand-glass: brass ends, two glass bulbs, the sand in the top running into the bottom. */
function drawGlass(g: G, x: number, y: number, s: number, top: number, a: number, sand: number): void {
  g.fillStyle(BRASS_DARK, a); g.fillRect(x - s * 0.8, y - s * 1.2, s * 1.6, s * 0.22); g.fillRect(x - s * 0.8, y + s, s * 1.6, s * 0.22);
  g.fillStyle(0xe8f0ff, a * 0.35);
  g.fillTriangle(x - s * 0.6, y - s, x + s * 0.6, y - s, x, y);
  g.fillTriangle(x - s * 0.6, y + s, x + s * 0.6, y + s, x, y);
  const tk = Math.max(0, Math.min(1, top));
  if (tk > 0.02) { g.fillStyle(sand, a); g.fillTriangle(x - s * 0.6 * tk, y - s * tk, x + s * 0.6 * tk, y - s * tk, x, y); }
  const bk = 1 - tk;
  if (bk > 0.02) { g.fillStyle(sand, a); g.fillTriangle(x - s * 0.6, y + s, x + s * 0.6, y + s, x, y + s * (1 - bk)); }
  if (tk > 0.02 && bk > 0.02) { g.lineStyle(1, sand, a); g.lineBetween(x, y, x, y + s * 0.9); }
}

export const FALLEN_FORTY_WINKS: GimmickDef = {
  id: ID,
  rules: 'Nightcaps fall on whoever is nearest their shadow: cooldowns race, then you doze. Later, black caps drag time and make you take more.',
  make,
};
