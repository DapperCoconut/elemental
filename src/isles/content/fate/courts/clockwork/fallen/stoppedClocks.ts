import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { glow, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { dial, hand } from '../art';
import { BLUED, BLUED_LIT, BRASS, CARD_BLACK, ENAMEL_SHADE, GILT, PAID_GREY, STONE_DARK } from '../palette';
import { alive, clamp, dist, segDist } from '../util';

/**
 * All the Clocks Stopped — Stopper Gervase Lammerlaw, who on the Row stops a house's clocks when
 * someone in it dies, and drapes their faces in crepe until the mourning is done. In the King's
 * telling he stopped the clocks of the *living*: a family that could not pay its hours had its
 * clocks stopped, and was counted dead from that minute.
 *
 * Three great stopped clocks lie face-up in the yard under black crepe. Inside a stopped face time
 * does not pass, so any shot that flies into one simply stops there — hanging in the air, still
 * pointing the way it was going. When the mourning ends (the clock is wound; its hands twitch and
 * the hung shots' lines light up), everything held flies on along its old line at its owner's foe —
 * and the clock's own two hands, which stopped pointing at the two of you, fly off too.
 *
 * Strike a clock's crepe bow to end its mourning now. Put a stopped clock between you and him, and
 * every shot either side fires lands in it — pointing at the other. Halfway down, his clocks begin
 * to creep after you.
 */

const ID = fallenId('clockwork', 'stopped');
const R = 66;
const MAX_HELD = 9;
const SHOT_SPEED = 440;
const HAND_SPEED = 520;
const HAND_LEN = 46;
const EMBER = 0xe8823a;

interface Held { x: number; y: number; a: number; dmg: number; owner: 'player' | 'npc'; born: number }
interface FlyHand { x: number; y: number; a: number; hit: Set<Fighter>; hour: boolean }
interface Clock {
  x: number; y: number; held: Held[]; nextAt: number; warnAt: number; releaseAt: number;
  hourA: number; minA: number; aimH: number; aimM: number; bow: StrikeTarget | null; bowCd: number; releasedAt: number;
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const fy = (k: number) => top + (H - top) * k;
  const clocks: Clock[] = [
    { x: W * 0.25, y: fy(0.3) }, { x: W * 0.75, y: fy(0.3) }, { x: W * 0.5, y: fy(0.76) },
  ].map((c, i) => ({
    ...c, held: [], nextAt: 0, warnAt: 0, releaseAt: 0, hourA: 1.2 + i, minA: 4 + i * 0.7, aimH: 0, aimM: 0,
    bow: null, bowCd: 0, releasedAt: -1e9,
  }));
  const hands: FlyHand[] = [];
  let started = false;
  let creep = false;

  const foeOf = (o: 'player' | 'npc'): Fighter => (o === 'player' ? npc : player);
  const angTo = (c: Clock, f: Fighter) => Math.atan2(f.y - c.y, f.x - c.x);

  function warn(c: Clock, time: number, ms: number): void {
    if (c.warnAt) return;
    c.warnAt = time;
    c.releaseAt = time + tk.warn(ms);
    c.aimH = alive(player) ? angTo(c, player) : c.hourA;
    c.aimM = alive(npc) ? angTo(c, npc) : c.minA;
    ctx.sfx('clock-tick');
  }

  function release(c: Clock, time: number): void {
    for (const h of c.held) {
      tk.spawnBullet({
        x: h.x, y: h.y, angle: h.a, speed: SHOT_SPEED, damage: h.dmg, lifeMs: 2600, r: 7,
        color: h.owner === 'player' ? BLUED_LIT : EMBER, hits: [foeOf(h.owner)],
      });
    }
    hands.push({ x: c.x, y: c.y, a: c.aimH, hit: new Set(), hour: true });
    hands.push({ x: c.x, y: c.y, a: c.aimM, hit: new Set(), hour: false });
    c.held = [];
    c.hourA = c.aimH; c.minA = c.aimM;
    c.warnAt = 0; c.releaseAt = 0;
    c.releasedAt = time;
    c.nextAt = time + (creep ? 5600 : 7200);
    ctx.sfx('whoosh');
  }

  return {
    update(time, dt) {
      const d = clamp(dt, 0, 0.1);
      if (!started) {
        started = true;
        clocks.forEach((c, i) => {
          c.nextAt = time + 3200 + i * 2400;
          const cc = c;
          c.bow = ctx.target({
            x: c.x, y: c.y + R + 16, r: 18,
            onStruck: () => { const now = ctx.scene.time.now; if (now < cc.bowCd) return; cc.bowCd = now + 2000; warn(cc, now, 650); },
          });
        });
      }
      if (!creep && npc.hp < npc.maxHp * 0.5) { creep = true; ctx.banner('THE CLOCKS CREEP AFTER YOU', '#c8c8c0'); ctx.sfx('curse-cast'); }
      for (const c of clocks) {
        // Shots that fly into a stopped face stop there, still pointing the way they went.
        if (!c.warnAt || time < c.releaseAt - 120) {
          for (const s of ctx.shotsNear(c.x, c.y, R)) {
            const of = s.owner === 'player' ? player : npc;
            const a = Math.atan2(s.y - of.y, s.x - of.x);
            s.block();
            if (c.held.length < MAX_HELD) {
              c.held.push({ x: s.x, y: s.y, a, dmg: clamp(s.damage * 1.1, 6, 24), owner: s.owner, born: time });
              ctx.sfx('time-warp');
            }
          }
        }
        if (!c.warnAt && time >= c.nextAt) warn(c, time, 1300);
        if (c.warnAt && time >= c.releaseAt) release(c, time);
        if (creep && alive(player) && !c.warnAt) {
          const dd = dist(c.x, c.y, player.x, player.y);
          if (dd > R + 40) {
            const nx = c.x + ((player.x - c.x) / dd) * 22 * d, ny = c.y + ((player.y - c.y) / dd) * 22 * d;
            const clear = clocks.every((o) => o === c || dist(nx, ny, o.x, o.y) > R * 2 + 30);
            if (clear) {
              const dx = nx - c.x, dy = ny - c.y;
              c.x = clamp(nx, R + 20, W - R - 20); c.y = clamp(ny, top + R + 10, H - R - 40);
              for (const h of c.held) { h.x += dx; h.y += dy; }
              c.bow?.moveTo(c.x, c.y + R + 16);
            }
          }
        }
      }
      // The flung hands: blued steel blades on a straight line, cutting whoever they cross.
      for (let i = hands.length - 1; i >= 0; i--) {
        const h = hands[i];
        h.x += Math.cos(h.a) * HAND_SPEED * d; h.y += Math.sin(h.a) * HAND_SPEED * d;
        const tx = h.x + Math.cos(h.a) * HAND_LEN, ty = h.y + Math.sin(h.a) * HAND_LEN;
        for (const f of [player, npc]) {
          if (!alive(f) || h.hit.has(f)) continue;
          if (segDist(f.x, f.y, h.x, h.y, tx, ty) < 24) {
            h.hit.add(f);
            if (f === player) tk.hitPlayer(12, f.x, f.y);
            else ctx.hit(npc, 18, f.x, f.y);
            ctx.sfx('slash');
          }
        }
        if (h.x < -60 || h.x > W + 60 || h.y < top - 60 || h.y > H + 60) hands.splice(i, 1);
      }
    },

    npcSeek() {
      if (!alive(npc) || !alive(player)) return null;
      // Off any lit line that will fly at it: your held shots, and the minute hand.
      for (const c of clocks) {
        if (!c.warnAt) continue;
        const lines = [...c.held.filter((h) => h.owner === 'player').map((h) => ({ x: h.x, y: h.y, a: h.a })), { x: c.x, y: c.y, a: c.aimM }];
        for (const l of lines) {
          const ex = l.x + Math.cos(l.a) * 1400, ey = l.y + Math.sin(l.a) * 1400;
          if (segDist(npc.x, npc.y, l.x, l.y, ex, ey) < 48) {
            const s = (npc.x - l.x) * -Math.sin(l.a) + (npc.y - l.y) * Math.cos(l.a) >= 0 ? 1 : -1;
            return { x: tk.clampX(npc.x - Math.sin(l.a) * 100 * s), y: tk.clampY(npc.y + Math.cos(l.a) * 100 * s) };
          }
        }
      }
      // Otherwise put a stopped clock between us.
      const mx = (npc.x + player.x) / 2, my = (npc.y + player.y) / 2;
      const c = clocks.reduce((a, b) => (dist(mx, my, a.x, a.y) <= dist(mx, my, b.x, b.y) ? a : b));
      const dp = dist(c.x, c.y, player.x, player.y) || 1;
      return { x: tk.clampX(c.x + ((c.x - player.x) / dp) * (R + 80)), y: tk.clampY(c.y + ((c.y - player.y) / dp) * (R + 80)) };
    },

    drawGround(g, time) {
      for (const c of clocks) drawStopped(g, c, time);
    },

    drawAir(g, time) {
      for (const c of clocks) {
        const lit = c.warnAt ? clamp((time - c.warnAt) / Math.max(1, c.releaseAt - c.warnAt), 0, 1) : 0;
        for (const h of c.held) drawHeld(g, h, time, lit, W, H);
      }
      for (const h of hands) hand(g, h.x, h.y, h.a, HAND_LEN, h.hour ? 6 : 4, h.hour ? BLUED : 0x2a3a88);
    },

    drawHud(g) {
      const y = top + 16;
      clocks.forEach((c, i) => {
        const x = W / 2 - 50 + i * 50;
        g.fillStyle(0x000000, 0.55); g.fillCircle(x, y, 15);
        dial(g, x, y, 11, c.hourA + Math.PI / 2, c.minA + Math.PI / 2, c.warnAt ? 0xfff4d8 : ENAMEL_SHADE, BRASS);
        for (let k = 0; k < Math.min(MAX_HELD, c.held.length); k++) {
          const own = c.held[k].owner === 'player';
          g.fillStyle(own ? BLUED_LIT : EMBER, 1); g.fillCircle(x - 12 + (k % 5) * 6, y + 20 + Math.floor(k / 5) * 5, 2);
        }
      });
    },

    destroy() { for (const c of clocks) c.bow?.remove(); },
  };
}

/** A great stopped clock lying face-up: stone surround, a grey-veiled enamel face, a crepe sash and bow. */
function drawStopped(g: G, c: Clock, time: number): void {
  const live = c.warnAt > 0;
  const k = live ? clamp((time - c.warnAt) / Math.max(1, c.releaseAt - c.warnAt), 0, 1) : 0;
  shadow(g, c.x, c.y + 6, R * 2.4, R * 0.8, 0.32);
  g.fillStyle(STONE_DARK, 1); g.fillCircle(c.x, c.y + 3, R + 12);
  // The hands creep from where they stopped toward the two of you as it is wound.
  const twitch = live ? Math.sin(time / 40) * 0.05 * (1 - k) : 0;
  const hA = c.hourA + (wrap(c.aimH - c.hourA)) * (live ? k : 0) + twitch;
  const mA = c.minA + (wrap(c.aimM - c.minA)) * (live ? k : 0) - twitch;
  dial(g, c.x, c.y, R, hA + Math.PI / 2, mA + Math.PI / 2, live ? 0xfff8e8 : ENAMEL_SHADE, BRASS);
  // Time-stopped: a grey veil over the face, lifting as it is wound.
  g.fillStyle(PAID_GREY, 0.42 * (1 - k)); g.fillCircle(c.x, c.y, R);
  // The crepe: two black bands crossed over the face, with soft folds; drawn back as it is wound.
  const pull = k * R * 0.9;
  for (const s of [-1, 1]) {
    const a = s * 0.6;
    const cx = Math.cos(a), cy = Math.sin(a);
    const len = R - pull * 0.6;
    g.fillStyle(CARD_BLACK, 0.82 - k * 0.4);
    g.fillPoints([
      { x: c.x - cx * len - cy * 9, y: c.y - cy * len + cx * 9 }, { x: c.x + cx * len - cy * 9, y: c.y + cy * len + cx * 9 },
      { x: c.x + cx * len + cy * 9, y: c.y + cy * len - cx * 9 }, { x: c.x - cx * len + cy * 9, y: c.y - cy * len - cx * 9 },
    ], true);
    for (let f = -2; f <= 2; f++) {
      g.lineStyle(1, 0x3a3438, 0.7);
      g.lineBetween(c.x - cx * len * 0.9 + f * 4 * cx, c.y - cy * len * 0.9 + f * 4 * cy - 6, c.x - cx * len * 0.9 + f * 4 * cx, c.y - cy * len * 0.9 + f * 4 * cy + 6);
    }
  }
  // The bow at the foot: strike it to end the mourning.
  const bx = c.x, by = c.y + R + 16;
  g.fillStyle(CARD_BLACK, 1);
  g.fillTriangle(bx, by, bx - 20, by - 10, bx - 18, by + 9);
  g.fillTriangle(bx, by, bx + 20, by - 10, bx + 18, by + 9);
  g.fillTriangle(bx - 3, by + 2, bx - 10, by + 22, bx - 2, by + 20);
  g.fillTriangle(bx + 3, by + 2, bx + 10, by + 22, bx + 2, by + 20);
  g.fillStyle(GILT, 1); g.fillCircle(bx, by, 4);
  if (live) glow(g, c.x, c.y, R + 10, 0xfff0c0, 0.04 + k * 0.05, 3);
}

/** A shot hung in stopped time: a frozen spark with its frost of ticks, and — when the clock is wound — its line lit to the wall. */
function drawHeld(g: G, h: Held, time: number, lit: number, W: number, H: number): void {
  const col = h.owner === 'player' ? BLUED_LIT : EMBER;
  const cx = Math.cos(h.a), cy = Math.sin(h.a);
  if (lit > 0) {
    let len = 0;
    for (; len < 1400; len += 20) { const x = h.x + cx * len, y = h.y + cy * len; if (x < 0 || x > W || y < 0 || y > H) break; }
    for (let s = 14; s < len; s += 22) {
      g.lineStyle(2, col, 0.2 + lit * 0.55);
      g.lineBetween(h.x + cx * s, h.y + cy * s, h.x + cx * (s + 11), h.y + cy * (s + 11));
    }
  }
  // A short frozen tail behind it, and a ring of little stopped ticks.
  g.lineStyle(3, col, 0.5); g.lineBetween(h.x - cx * 16, h.y - cy * 16, h.x, h.y);
  g.fillStyle(col, 0.9); g.fillCircle(h.x, h.y, 5);
  g.fillStyle(0xffffff, 0.8); g.fillCircle(h.x - 1.5, h.y - 1.5, 1.8);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + (h.born % 997) * 0.01;
    g.lineStyle(1, PAID_GREY, 0.7); g.lineBetween(h.x + Math.cos(a) * 8, h.y + Math.sin(a) * 8, h.x + Math.cos(a) * 11, h.y + Math.sin(a) * 11);
  }
  // A tiny arrowhead so its way is never in doubt.
  g.fillStyle(col, 0.85);
  g.fillTriangle(h.x + cx * 12, h.y + cy * 12, h.x + cx * 6 - cy * 4, h.y + cy * 6 + cx * 4, h.x + cx * 6 + cy * 4, h.y + cy * 6 - cx * 4);
  if (lit > 0.6) glow(g, h.x, h.y, 14, col, 0.06 + Math.sin(time / 50) * 0.02, 2);
}

const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));

export const FALLEN_STOPPED: GimmickDef = {
  id: ID,
  rules: 'Shots flying into a stopped clock hang there. Wound, it flings them on at the shooter\'s foe, and its hands at you both. Strike its bow to wind it.',
  make,
};
