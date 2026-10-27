import Phaser from 'phaser';
import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, lit } from '../../../../../art/IsleArt';
import { BRASS, CHERRY, GRAPE, ICING, LEMON, LICORICE, MINT, PINK, SWEETS, VERDIGRA, dist, wrappedSweet } from '../art';

/**
 * Piñata — Partyman Peso's Fête Ground.
 *
 * A papier-mâché donkey hangs from a rope over the yard and swings — a long pendulum whose
 * swing turns slowly round the room, so the path it sweeps is never the same twice. It is hard to
 * miss and harder to stop: anyone it swings into cracks it, and is knocked aside for their trouble.
 * Whoever lands the *last* crack breaks it, and the Prince's sweets shower out across the floor.
 *
 * Every sweet the breaker gathers is theirs: each one makes the other fighter take a little more
 * from them, until the next piñata is broken. Gold coins among the sweets heal the breaker. The
 * other fighter can only spoil what they pick up — but spoiling is something.
 *
 * Peso always breaks it, he says. He lets the swing do the work and steps in for the last crack.
 * Count the cracks — the tears in its paper — and get there first.
 */

const SWING_MS = 2800;
const AMP = 230;
const TURN_RAD_PER_S = 0.22;
const HIT_R = 40;
const HIT_COOLDOWN_MS = 750;
const CRACKS = 6;
const CRACKS_HARD = 7;
const KNOCK = 46;
const KNOCK_DAMAGE = 3;
const PIECES = 9;
const COINS = 3;
const PICK_R = 26;
const FLY_MS = 650;
const PIECE_LIFE_MS = 9000;
const TAKEN_PER_STACK = 0.045;
const SPEED_PER_STACK = 0.02;
const MAX_STACKS = 10;
const COIN_HEAL = 6;
const NEXT_MS = 6000;
const LOWER_MS = 900;

interface Piece { x0: number; y0: number; x: number; y: number; at: number; coin: boolean; color: number; spin: number }
interface Pinata { ax: number; ay: number; plane: number; phase: number; cracks: number; bornAt: number; tears: number[] }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, rng } = ctx;
  const need = ctx.hard ? CRACKS_HARD : CRACKS;

  let pin: Pinata | null = null;
  let nextAt = 1400;
  let pieces: Piece[] = [];
  let breaker: Fighter | null = null;
  const stacks = new Map<Fighter, number>();
  const lastHit = new Map<Fighter, number>();
  let shower: { x: number; y: number; at: number } | null = null;
  let announced = false;

  const pos = (p: Pinata, time: number): { x: number; y: number; vx: number; vy: number } => {
    const lower = Math.min(1, (time - p.bornAt) / LOWER_MS);
    const w = (Math.PI * 2) / SWING_MS;
    const s = Math.sin((time - p.bornAt) * w + p.phase) * AMP * lower;
    const c = Math.cos((time - p.bornAt) * w + p.phase) * AMP * lower * w * 1000;
    const plane = p.plane + ((time - p.bornAt) / 1000) * TURN_RAD_PER_S;
    const ux = Math.cos(plane), uy = Math.sin(plane) * 0.62;
    return { x: p.ax + ux * s, y: p.ay + uy * s, vx: ux * c, vy: uy * c };
  };

  const hang = (time: number): void => {
    pin = {
      ax: W * (0.38 + rng() * 0.24), ay: top + (H - top) * (0.42 + rng() * 0.16),
      plane: rng() * Math.PI, phase: rng() * Math.PI * 2, cracks: 0, bornAt: time, tears: [],
    };
    ctx.sfx('countdown-go');
    ctx.float(pin.ax, pin.ay - 90, 'A NEW PIÑATA!', '#ffe070');
  };

  const breakIt = (p: Pinata, f: Fighter, time: number): void => {
    const at = pos(p, time);
    pin = null;
    nextAt = time + NEXT_MS;
    breaker = f;
    stacks.set(ctx.player, 0); stacks.set(ctx.npc, 0);
    pieces = [];
    for (let i = 0; i < PIECES + COINS; i++) {
      const a = (i / (PIECES + COINS)) * Math.PI * 2 + rng() * 0.4;
      const r = 70 + rng() * 170;
      pieces.push({
        x0: at.x, y0: at.y,
        x: Phaser.Math.Clamp(at.x + Math.cos(a) * r, 50, W - 50), y: Phaser.Math.Clamp(at.y + Math.sin(a) * r * 0.8, top + 40, H - 40),
        at: time, coin: i >= PIECES, color: SWEETS[i % SWEETS.length], spin: rng() * Math.PI,
      });
    }
    shower = { x: at.x, y: at.y, at: time };
    ctx.sfx('jackpot');
    ctx.banner(f === ctx.player ? 'YOU BROKE IT!' : 'PESO BROKE IT!', f === ctx.player ? '#ffe070' : '#ff9a8a');
    ctx.scene.cameras.main.shake(150, 0.005);
  };

  const sweetsOf = (f: Fighter): number => stacks.get(f) ?? 0;

  return {
    update(time) {
      if (!announced) { announced = true; ctx.banner('BREAK IT, KEEP IT', '#ffe070'); }
      if (!pin && time >= nextAt) hang(time);

      if (pin) {
        const at = pos(pin, time);
        const lowered = time - pin.bornAt > LOWER_MS;
        for (const f of [ctx.player, ctx.npc]) {
          if (!lowered || !f.active || f.hp <= 0) continue;
          if (time - (lastHit.get(f) ?? -9999) < HIT_COOLDOWN_MS) continue;
          if (dist(at.x, at.y, f.x, f.y + 10) > HIT_R) continue;
          lastHit.set(f, time);
          pin.cracks++;
          pin.tears.push(rng() * Math.PI * 2);
          const sp = Math.hypot(at.vx, at.vy) || 1;
          ctx.hit(f, KNOCK_DAMAGE, f.x, f.y);
          ctx.nudge(f, (at.vx / sp) * KNOCK, (at.vy / sp) * KNOCK);
          ctx.sfx('drum-hit');
          if (pin.cracks >= need) { breakIt(pin, f, time); break; }
          ctx.float(at.x, at.y - 80, `CRACK ${pin.cracks}/${need}`, f === ctx.player ? '#fff0a0' : '#ffb0a0');
        }
      }

      // Sweets on the floor: the breaker gathers, the other spoils.
      for (const pc of [...pieces]) {
        if (time - pc.at < FLY_MS) continue;
        if (time - pc.at > PIECE_LIFE_MS) { pieces = pieces.filter((q) => q !== pc); continue; }
        for (const f of [ctx.player, ctx.npc]) {
          if (!f.active || f.hp <= 0) continue;
          if (dist(pc.x, pc.y, f.x, f.y + 12) > PICK_R) continue;
          pieces = pieces.filter((q) => q !== pc);
          if (f === breaker) {
            if (pc.coin) { ctx.heal(f, COIN_HEAL); ctx.sfx('money'); ctx.float(f.x, f.y - 46, `+${COIN_HEAL}`, '#8affa0'); }
            else { stacks.set(f, Math.min(MAX_STACKS, sweetsOf(f) + 1)); ctx.sfx('sparkle'); ctx.float(f.x, f.y - 46, `SWEET ×${sweetsOf(f)}`, '#ffd6e8'); }
          } else {
            ctx.sfx('hit-light');
            ctx.float(f.x, f.y - 46, 'SPOILED', '#c8c8c8');
          }
          break;
        }
      }
    },

    // The breaker's sweets make the other fighter take more from them.
    playerTakenMult: () => 1 + sweetsOf(ctx.npc) * TAKEN_PER_STACK,
    npcTakenMult: () => 1 + sweetsOf(ctx.player) * TAKEN_PER_STACK,
    playerSpeedMult: () => 1 + sweetsOf(ctx.player) * SPEED_PER_STACK,
    npcSpeedMult: () => 1 + sweetsOf(ctx.npc) * SPEED_PER_STACK,

    npcSeek(): Pt | null {
      const n = ctx.npc;
      const now = ctx.scene.time.now;
      if (pieces.length) {
        // Gather if he broke it; spoil whatever is nearest the player if he did not.
        const ref = breaker === n ? n : ctx.player;
        let best: Piece | null = null, bd = Infinity;
        for (const pc of pieces) {
          if (now - pc.at < FLY_MS) continue;
          const d = dist(ref.x, ref.y, pc.x, pc.y);
          if (d < bd) { bd = d; best = pc; }
        }
        if (best && (breaker === n || bd < 260)) return { x: best.x, y: best.y - 12 };
      }
      if (pin && pin.cracks >= need - 2) {
        // Step into the path for the last crack: where the swing will be in a moment.
        const ahead = pos(pin, now + 380);
        return { x: ahead.x, y: ahead.y - 10 };
      }
      return null;
    },

    drawGround(g, time) {
      if (pin) {
        // The swing's path: a long faint ellipse, and the shadow riding along it.
        const at = pos(pin, time);
        const plane = pin.plane + ((time - pin.bornAt) / 1000) * TURN_RAD_PER_S;
        const ux = Math.cos(plane), uy = Math.sin(plane) * 0.62;
        g.lineStyle(10, LEMON, 0.07); g.lineBetween(pin.ax - ux * AMP, pin.ay - uy * AMP, pin.ax + ux * AMP, pin.ay + uy * AMP);
        g.fillStyle(0x000000, 0.25); g.fillEllipse(at.x, at.y, 60, 18);
        if (pin.cracks >= need - 1) { g.lineStyle(2, 0xffffff, 0.3 + 0.3 * Math.sin(time / 90)); g.strokeEllipse(at.x, at.y, 2 * HIT_R + 10, HIT_R); }
      }
      if (shower) {
        const k = (time - shower.at) / 500;
        if (k < 1) { g.lineStyle(4, LEMON, 0.6 * (1 - k)); g.strokeEllipse(shower.x, shower.y, 80 + k * 300, 30 + k * 160); }
      }
      // Sweets lying on the floor (flying ones are drawn in the air).
      for (const pc of pieces) {
        if (time - pc.at < FLY_MS) continue;
        const fade = time - pc.at > PIECE_LIFE_MS - 1200 ? (Math.floor(time / 120) % 2 ? 0.4 : 1) : 1;
        const own = breaker === ctx.player ? 0x6fc6ff : 0xff7a4a;
        g.lineStyle(1.5, own, 0.35 * fade); g.strokeCircle(pc.x, pc.y, 12);
        if (pc.coin) {
          g.fillStyle(dim(BRASS, 0.4), fade); g.fillEllipse(pc.x, pc.y + 1, 15, 10);
          g.fillStyle(BRASS, fade); g.fillEllipse(pc.x, pc.y, 14, 9);
          g.fillStyle(lit(BRASS, 0.5), fade); g.fillEllipse(pc.x - 2, pc.y - 2, 5, 3);
        } else wrappedSweet(g, pc.x, pc.y - 2, 5, pc.color, pc.spin, fade);
      }
    },

    drawAir(g, time) {
      const t = time / 1000;
      // The beam overhead and the rope.
      if (pin) {
        const at = pos(pin, time);
        const lower = Math.min(1, (time - pin.bornAt) / LOWER_MS);
        const hangY = at.y - 70;
        const topY = top - 4;
        g.lineStyle(2, 0x8a6a3a, 1); g.lineBetween(pin.ax, topY, at.x, hangY - 26);
        g.fillStyle(0x5a3a1e, 1); g.fillRect(pin.ax - 20, topY - 4, 40, 8);
        drawDonkey(g, at.x, hangY - (1 - lower) * 120, pin, need, t, at.vx);
      }
      // Sweets in flight.
      for (const pc of pieces) {
        const k = (time - pc.at) / FLY_MS;
        if (k >= 1) continue;
        const x = pc.x0 + (pc.x - pc.x0) * k, y = pc.y0 - 70 + (pc.y - pc.y0 + 70) * k - Math.sin(k * Math.PI) * 60;
        if (pc.coin) { g.fillStyle(BRASS, 1); g.fillEllipse(x, y, 12 * Math.abs(Math.cos(t * 12 + pc.spin)) + 2, 12); }
        else wrappedSweet(g, x, y, 5, pc.color, pc.spin + k * 9, 1);
      }
    },

    drawHud(g) {
      // Sweets held: yours on the left, Peso's on the right, under the HUD strip.
      const y = top + 14;
      for (const [f, x0, dir, col] of [[ctx.player, 20, 1, 0x6fc6ff], [ctx.npc, W - 20, -1, 0xff7a4a]] as [Fighter, number, number, number][]) {
        const n = sweetsOf(f);
        if (!n) continue;
        g.fillStyle(0x1a1018, 0.55); g.fillRoundedRect(dir > 0 ? x0 - 6 : x0 - 12 * n - 6, y - 9, 12 * n + 12, 18, 6);
        for (let i = 0; i < n; i++) wrappedSweet(g, x0 + dir * (6 + i * 12), y, 4, i % 2 ? col : SWEETS[i % SWEETS.length], 0, 1);
      }
    },
  };
}

/**
 * A papier-mâché donkey: a barrel body in rows of fringed tissue, a long neck and head, two tall
 * ears, four stubby legs and a tassel tail. Each crack tears its paper; on the last one it gapes
 * and the sweets show through.
 */
function drawDonkey(g: Phaser.GameObjects.Graphics, x: number, y: number, p: Pinata, need: number, t: number, vx: number): void {
  const lean = Phaser.Math.Clamp(vx / 900, -0.4, 0.4);
  const face = vx >= 0 ? 1 : -1;
  const rows = [PINK, LEMON, MINT, GRAPE, CHERRY];
  // Legs.
  for (const lx of [-16, -6, 8, 18]) {
    g.fillStyle(dim(rows[2], 0.3), 1); g.fillRect(x + lx - 3 + lean * 8, y + 10, 6, 16);
    g.fillStyle(LICORICE, 1); g.fillRect(x + lx - 3 + lean * 8, y + 24, 6, 3);
  }
  // Body: fringed rows.
  g.fillStyle(0x000000, 0.25); g.fillEllipse(x + 2, y + 3, 62, 34);
  for (let r = 0; r < 5; r++) {
    const ry = y - 12 + r * 6;
    const half = 30 * Math.sqrt(Math.max(0, 1 - Math.pow((ry - y) / 18, 2)));
    g.fillStyle(rows[r], 1); g.fillRect(x - half, ry, half * 2, 7);
    g.lineStyle(1, dim(rows[r], 0.3), 0.8);
    for (let fx = x - half + 2; fx < x + half; fx += 3) g.lineBetween(fx, ry + 3, fx + Math.sin(t * 8 + fx) * 1.2, ry + 7);
  }
  // Neck and head.
  const hx = x + face * 26, hy = y - 24;
  g.fillStyle(rows[1], 1); g.fillRect(hx - 6, hy, 12, 18);
  g.fillStyle(rows[0], 1); g.fillEllipse(hx + face * 6, hy - 2, 24, 15);
  g.fillStyle(LICORICE, 1); g.fillCircle(hx + face * 4, hy - 5, 1.8);
  g.fillStyle(rows[3], 1);
  g.fillTriangle(hx - 4, hy - 8, hx, hy - 8, hx - 3, hy - 24);
  g.fillTriangle(hx + 1, hy - 8, hx + 5, hy - 8, hx + 4, hy - 22);
  // Tail.
  g.lineStyle(2, rows[4], 1); g.lineBetween(x - face * 28, y - 4, x - face * 36, y + 8 + Math.sin(t * 6) * 3);
  // A ribbon in the Empress's green round its neck — every Tithe-Day piñata is hers.
  g.lineStyle(3, VERDIGRA, 1); g.lineBetween(hx - 7, hy + 6, hx + 7, hy + 4);
  // Tears: one dark rip per crack; near the end, sweets peep through.
  p.tears.forEach((a, i) => {
    const tx = x + Math.cos(a) * 18, ty = y + Math.sin(a) * 8;
    g.fillStyle(0x2a1a22, 1); g.fillTriangle(tx - 5, ty - 2, tx + 5, ty, tx, ty + 4 + i * 0.4);
    if (p.cracks >= need - 2) { g.fillStyle(SWEETS[i % SWEETS.length], 1); g.fillCircle(tx, ty, 2); }
  });
  g.lineStyle(1, ICING, 0.25); g.strokeEllipse(x, y, 60, 32);
}

export const PINATA: GimmickDef = {
  id: 'confection-pinata',
  rules: 'A piñata swings over the yard; it cracks on whoever it hits. Land the LAST crack to break it — every sweet you then gather makes your foe take more.',
  make,
};
