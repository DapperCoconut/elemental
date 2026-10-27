import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, lit } from '../../../../../art/IsleArt';
import {
  CANVAS, CANVAS_SHADE, HEMP_DARK, OAK, OAK_DARK, RED_THREAD, TAN_SAIL,
  dist, peg, polyline, sag, segCross, sheet,
} from '../art';
import { laundryBasket } from '../buildings';

/**
 * Drying Lines — Seamstress Tuck's green.
 *
 * Three washing lines run across the loft, hung with whole sails out to dry. A hanging sheet is
 * a wall you can see through only as a shadow: a blow struck *through* one (the line between
 * the two fighters crosses a sheet's foot) is mostly soaked up by the wet canvas, and tears it.
 * Tear a sheet through and it drops off its pegs into a heap. Pushing through a sheet by hand is
 * allowed but slow, and rips it a little.
 *
 * Tuck keeps her washing up. Whenever a stretch of line is bare she trots to her basket, takes a
 * fresh sheet, and pegs it back up — standing still at the line for a long beat while she does.
 * Hit her mid-pegging and she fumbles it into the mud and has to go back to the basket.
 *
 * The exploit is the pegging: she always goes to the basket, and then to the bare slot nearest
 * the line between you. Tear the sheet she is hiding behind, then catch her pinning its
 * replacement.
 */

const LINE_FRAC = [0.26, 0.52, 0.78];
const SLOT_X: number[][] = [[180, 390, 600, 810], [280, 490, 700], [170, 380, 590, 800]];
const SHEET_W = 150;
const SHEET_DROP = 92;
const SHEET_HP = 100;
/** Damage that crosses a sheet is cut to this share. */
const SOAK = 0.3;
const TEAR_PER_DAMAGE = 3.2;
const PUSH_BAND = 16;
const PUSH_SLOW = 0.55;
const PUSH_TEAR_PER_S = 14;
const PEG_MS = 1500;
const PEG_HARD_MS = 1100;
const DUTY_GAP_MS = 2600;
const FALL_MS = 420;
const FIGHTER_R = 20;

interface Sheet {
  line: number;
  x: number;
  w: number;
  y: number;
  hp: number;
  up: boolean;
  /** When it fell (for the crumple) — heaps lie until re-pegged. */
  downAt: number;
  color: number;
  seed: number;
  /** Tear slashes: offsets within the sheet, drawn as dark rents. */
  tears: { u: number; v: number; len: number; a: number }[];
  /** Brief flutter when struck. */
  hitAt: number;
}

type Duty = 'none' | 'basket' | 'carry' | 'peg';

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, rng } = ctx;
  const field = H - top;
  const pegMs = ctx.hard ? PEG_HARD_MS : PEG_MS;
  const basket: Pt = { x: W - 64, y: H - 46 };
  const lineY = LINE_FRAC.map((f) => top + field * f);

  const sheets: Sheet[] = [];
  SLOT_X.forEach((xs, li) => {
    for (const x of xs) {
      sheets.push({
        line: li, x, w: SHEET_W - rng() * 20, y: lineY[li], hp: SHEET_HP, up: true, downAt: 0,
        color: rng() < 0.25 ? TAN_SAIL : rng() < 0.5 ? CANVAS_SHADE : CANVAS, seed: rng() * 10, tears: [], hitAt: -9999,
      });
    }
  });
  // Two start on the ground so the first pegging comes early.
  for (let k = 0; k < 2; k++) {
    const s = sheets[Math.floor(rng() * sheets.length)];
    s.up = false; s.downAt = -9999; s.hp = 0;
  }

  let duty: Duty = 'none';
  let target: Sheet | null = null;
  let pegStart = 0;
  let nextDutyAt = 2500;
  let announced = false;
  let pushAcc = 0;
  let fumbleAt = -9999;

  const fieldPt = (f: Fighter): Pt => ({ x: f.x, y: f.y + 12 });

  /** Up sheets whose foot-line the segment between the two fighters crosses. */
  const crossed = (): Sheet[] => {
    const a = fieldPt(ctx.player), b = fieldPt(ctx.npc);
    return sheets.filter((s) => s.up && segCross(a.x, a.y, b.x, b.y, s.x - s.w / 2, s.y, s.x + s.w / 2, s.y));
  };

  const tear = (s: Sheet, amount: number, time: number, nearX: number): void => {
    s.hp -= amount;
    s.hitAt = time;
    s.tears.push({ u: Math.max(-0.42, Math.min(0.42, (nearX - s.x) / s.w + (rng() - 0.5) * 0.3)), v: 0.2 + rng() * 0.6, len: 10 + amount * 0.6, a: -0.9 + rng() * 1.8 });
    if (s.hp <= 0) {
      s.up = false; s.downAt = time; s.tears = [];
      ctx.sfx('slash');
      ctx.float(s.x, s.y - 60, 'TORN DOWN', '#ece3cc');
    }
  };

  /** A hit landed through cloth tears the sheet nearest the one who took it. */
  const soakHit = (victim: Fighter, amount: number): void => {
    const c = crossed();
    if (!c.length) return;
    const time = ctx.scene.time.now;
    c.sort((p, q) => dist(p.x, p.y, victim.x, victim.y) - dist(q.x, q.y, victim.x, victim.y));
    tear(c[0], amount * TEAR_PER_DAMAGE, time, victim.x);
  };

  const pushingThrough = (f: Fighter): Sheet | null => {
    const p = fieldPt(f);
    return sheets.find((s) => s.up && Math.abs(p.y - s.y) < PUSH_BAND && Math.abs(p.x - s.x) < s.w / 2) ?? null;
  };

  /** The bare slot Tuck wants to fill: the one nearest the line between the two of you. */
  const pickSlot = (): Sheet | null => {
    const bare = sheets.filter((s) => !s.up);
    if (!bare.length) return null;
    const mx = (ctx.player.x + ctx.npc.x) / 2, my = (ctx.player.y + ctx.npc.y) / 2;
    bare.sort((a, b) => dist(a.x, a.y, mx, my) - dist(b.x, b.y, mx, my));
    return bare[0];
  };

  return {
    update(time, dt) {
      if (!announced) { announced = true; ctx.banner('WASHING DAY', '#ece3cc'); }
      const n = ctx.npc;

      // Pushing through wet linen: slow, and it rips a little.
      for (const f of [ctx.player, n]) {
        const s = pushingThrough(f);
        if (!s) continue;
        pushAcc += PUSH_TEAR_PER_S * dt;
        if (pushAcc >= 4) { tear(s, pushAcc, time, f.x); pushAcc = 0; }
      }

      // Tuck's laundry duty.
      if (duty === 'none' && time >= nextDutyAt) {
        const bare = sheets.filter((s) => !s.up).length;
        if (bare >= 1 && (bare >= 2 || rng() < 0.5)) { duty = 'basket'; }
        else nextDutyAt = time + 1200;
      }
      if (duty === 'basket' && dist(n.x, n.y, basket.x, basket.y) < 50) {
        target = pickSlot();
        if (target) { duty = 'carry'; ctx.float(n.x, n.y - 50, 'FRESH SHEET', '#ece3cc'); }
        else { duty = 'none'; nextDutyAt = time + DUTY_GAP_MS; }
      }
      if (duty === 'carry' && target) {
        if (target.up) target = pickSlot();
        if (!target) { duty = 'none'; nextDutyAt = time + DUTY_GAP_MS; }
        else if (dist(n.x, n.y + 12, target.x, target.y) < 46) { duty = 'peg'; pegStart = time; ctx.sfx('trap-set'); }
      }
      if (duty === 'peg' && target) {
        if (dist(n.x, n.y + 12, target.x, target.y) > 70) { duty = 'carry'; }
        else if (time - pegStart >= pegMs) {
          target.up = true; target.hp = SHEET_HP; target.tears = []; target.hitAt = time;
          target.color = rng() < 0.3 ? TAN_SAIL : CANVAS;
          ctx.float(target.x, target.y - 70, 'PEGGED', '#ece3cc');
          ctx.sfx('trap-snap');
          duty = 'none'; target = null; nextDutyAt = time + DUTY_GAP_MS;
        }
      }
    },

    onPlayerHurt(amount) { soakHit(ctx.player, amount); },
    onNpcHurt(amount) {
      soakHit(ctx.npc, amount);
      if (duty === 'peg' || duty === 'carry') {
        // Hit while she has the sheet in her arms: dropped in the mud.
        const now = ctx.scene.time.now;
        fumbleAt = now;
        ctx.float(ctx.npc.x, ctx.npc.y - 52, 'DROPPED IT', '#ffb08a');
        // She gives the washing up for a while and comes after you instead.
        duty = 'none'; target = null; nextDutyAt = now + DUTY_GAP_MS * 1.5;
      }
    },

    playerTakenMult() { return crossed().length ? SOAK : 1; },
    npcTakenMult() { return crossed().length ? SOAK : 1; },
    playerSpeedMult() { return pushingThrough(ctx.player) ? PUSH_SLOW : 1; },
    npcSpeedMult() { return pushingThrough(ctx.npc) ? PUSH_SLOW : 1; },

    npcSeek(): Pt | null {
      if (duty === 'basket') return basket;
      if ((duty === 'carry' || duty === 'peg') && target) return { x: target.x, y: target.y - 2 };
      return null;
    },

    drawGround(g, time) {
      const t = time / 1000;
      // The lines' shadows across the boards, and heaps of fallen canvas.
      for (let li = 0; li < lineY.length; li++) {
        g.lineStyle(2, 0x000000, 0.18); g.lineBetween(30, lineY[li] + 4, W - 30, lineY[li] + 4);
      }
      for (const s of sheets) {
        if (s.up) {
          g.fillStyle(0x000000, 0.16); g.fillEllipse(s.x + 6, s.y + 6, s.w * 1.02, 16);
          continue;
        }
        const k = Math.min(1, (time - s.downAt) / FALL_MS);
        if (k < 1) continue;
        // A heap: a few overlapping crumpled lobes.
        for (let i = 0; i < 4; i++) {
          const ox = Math.sin(s.seed + i * 2.1) * s.w * 0.22, oy = Math.cos(s.seed + i) * 6;
          g.fillStyle(dim(s.color, 0.35), 0.9); g.fillEllipse(s.x + ox + 2, s.y + 4 + oy, s.w * 0.42, 20);
          g.fillStyle(s.color, 0.95); g.fillEllipse(s.x + ox, s.y + 1 + oy, s.w * 0.4, 17);
          g.lineStyle(1, dim(s.color, 0.25), 0.8); g.strokeEllipse(s.x + ox, s.y + 1 + oy, s.w * 0.22, 7);
        }
      }
      // The basket, with Tuck's next sheet folded on top.
      laundryBasket(g, basket.x, basket.y, 1.1);
      if (time - fumbleAt < 1200) {
        g.fillStyle(0x5a4632, 0.5); g.fillEllipse(ctx.npc.x, ctx.npc.y + 16, 60, 18);
      }
      // Peg progress: a ring of pegs filling in at the slot she is pinning.
      if (duty === 'peg' && target) {
        const k = Math.min(1, (time - pegStart) / pegMs);
        g.lineStyle(3, 0xece3cc, 0.5 + 0.4 * Math.sin(t * 10)); g.strokeEllipse(target.x, target.y, target.w, 26);
        const n = 8;
        for (let i = 0; i < n; i++) {
          if (i / n > k) break;
          peg(g, target.x - target.w / 2 + 8 + (target.w - 16) * (i / (n - 1)), target.y - 4);
        }
      }
    },

    drawAir(g, time) {
      const t = time / 1000;
      // Props and lines.
      for (let li = 0; li < lineY.length; li++) {
        const y = lineY[li];
        const lineH = y - SHEET_DROP - 14;
        for (const px of [26, W - 26]) {
          g.fillStyle(OAK_DARK, 0.9); g.fillRect(px - 4, lineH - 6, 8, y - lineH + 6);
          g.fillStyle(OAK, 0.9); g.fillRect(px - 2, lineH - 6, 3, y - lineH + 6);
        }
        polyline(g, sag({ x: 26, y: lineH }, { x: W - 26, y: lineH }, 10, 24), 1.6, HEMP_DARK, 0.9);
      }
      const p = ctx.player;
      for (const s of sheets) {
        const lineH = s.y - SHEET_DROP - 14;
        const hang = lineH + Math.sin(((s.x - 26) / (W - 52)) * Math.PI) * 10;
        if (!s.up) {
          const k = Math.min(1, (time - s.downAt) / FALL_MS);
          if (k >= 1) continue;
          // Falling: the sheet slides down off its pegs and crumples.
          sheet(g, s.x, hang + k * SHEET_DROP * 0.9, s.w * (1 - k * 0.2), SHEET_DROP * (1 - k * 0.85), Math.sin(t * 9) * 0.6, s.color, 1 - k * 0.3, t * 6, false);
          continue;
        }
        const struck = Math.max(0, 1 - (time - s.hitAt) / 500);
        const billow = Math.sin(t * 1.3 + s.seed) * 0.35 + struck * Math.sin(t * 30) * 0.6;
        // See-through for the player when they stand right in front of it (so you never lose
        // yourself), opaque otherwise — what is behind a sheet is a shadow at most.
        const front = p.y + 12 > s.y && p.y + 12 - s.y < 70 && Math.abs(p.x - s.x) < s.w / 2 + 10;
        const a = front ? 0.42 : 0.94;
        sheet(g, s.x, hang, s.w, SHEET_DROP, billow, s.color, a, t * 3 + s.seed);
        // Health shows as tears in the cloth.
        for (const tr of s.tears) {
          const cx = s.x + tr.u * s.w, cy = hang + tr.v * SHEET_DROP;
          g.lineStyle(4, dim(s.color, 0.65), a); g.lineBetween(cx - Math.cos(tr.a) * tr.len / 2, cy - Math.sin(tr.a) * tr.len / 2, cx + Math.cos(tr.a) * tr.len / 2, cy + Math.sin(tr.a) * tr.len / 2);
          g.lineStyle(1, lit(s.color, 0.3), a * 0.8); g.lineBetween(cx - Math.cos(tr.a) * tr.len / 2, cy - Math.sin(tr.a) * tr.len / 2 - 2, cx + Math.cos(tr.a) * tr.len / 2, cy + Math.sin(tr.a) * tr.len / 2 - 2);
        }
        if (s.hp < SHEET_HP * 0.35 && Math.floor(time / 160) % 2 === 0) {
          g.lineStyle(2, RED_THREAD, 0.6 * a); g.strokeRect(s.x - s.w / 2, hang, s.w, SHEET_DROP);
        }
      }
      // What Tuck is carrying.
      const n = ctx.npc;
      if (duty === 'carry' || duty === 'peg') {
        g.fillStyle(dim(CANVAS, 0.3), 1); g.fillRoundedRect(n.x - 16, n.y - 6, 32, 14, 4);
        g.fillStyle(CANVAS, 1); g.fillRoundedRect(n.x - 15, n.y - 8, 30, 12, 4);
        g.lineStyle(1, RED_THREAD, 0.9); g.lineBetween(n.x - 12, n.y - 3, n.x + 12, n.y - 3);
      }
      // A thread from the crossed sheets to the fighters, when blows are being soaked.
      const c = crossed();
      if (c.length) {
        for (const s of c) {
          g.lineStyle(2, 0xffffff, 0.12 + 0.08 * Math.sin(t * 8));
          g.strokeRect(s.x - s.w / 2, s.y - 4, s.w, 8);
        }
      }
    },

    drawHud(g) {
      const up = sheets.filter((s) => s.up).length;
      const x0 = W / 2 - sheets.length * 9;
      for (let i = 0; i < sheets.length; i++) {
        const on = i < up;
        g.fillStyle(on ? CANVAS : 0x3a342c, on ? 0.95 : 0.6);
        g.fillRect(x0 + i * 18, top + 6, 13, 16);
        g.fillStyle(on ? RED_THREAD : 0x2a241c, 0.9); g.fillRect(x0 + i * 18, top + 19, 13, 2);
        g.fillStyle(OAK, 0.9); g.fillRect(x0 + i * 18 + 2, top + 3, 2, 5); g.fillRect(x0 + i * 18 + 9, top + 3, 2, 5);
      }
    },
  };
}

export const DRYING_LINES: GimmickDef = {
  id: 'sailmaker-drying-lines',
  rules: 'Sheets block blows aimed through them — and tear. Tuck pegs up fresh ones; hit her while she pegs and she drops it.',
  make,
};
