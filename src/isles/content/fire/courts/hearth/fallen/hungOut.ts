import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { dim, glow, lit, shadow, type G } from '../../../../../art/IsleArt';
import { ASH_LIT, EMBER, EMBER_DARK, EMBER_LIT, GLOW, IRON, RENDER, SMOKE, SOOT } from '../palette';
import { alive, clamp, dist, frameClock } from '../gimmicks/util';
import { fallenId } from '../../../../meteor/spec';

/**
 * Hung Out to Dry — Nell Pegg, the washerwoman of the lower square, who in the King's telling
 * read every family's secrets off their washing and carried them to the tithe office.
 *
 * Three washing lines are strung across the room on posts, heavy with grey sheets. A sheet stops
 * any shot that meets it — hers and yours — so the lines are cover that cuts both ways, and Nell
 * fights from behind them. Every few seconds she snaps a sheet off its pegs and sends it flapping
 * at you: a slow, wide thing you must step aside from.
 *
 * The exploit is the posts: strike a post twice and its whole line drops, wrapping whoever stands
 * under it in wet linen (rooted, hurt). Halfway down, tithe embers get into the wash: sheets
 * smoulder (a brown scorch spreads first), then burn as curtains of fire that sear anyone walking
 * through and stop nothing — the cover burns away line by line. The bot hides behind a sheet and
 * runs for a post whenever you stand under a line.
 */

const ID = fallenId('hearth', 'hung-out');
const SHEET_W = 62;
const SHEET_BLOCK_R = 32;
const WRAP_R = 28;
const DOWN_MS = 7000;
const FLY_SPEED = 190;
const FLY_EVERY = 5200;
const SMOULDER_MS = 1300;
const BURN_MS = 5000;

interface Sheet { t: number; state: 'hung' | 'smoulder' | 'burning' | 'ash'; at: number; tint: number }
interface Line {
  a: Pt; b: Pt; sheets: Sheet[]; down: boolean; downAt: number;
  posts: StrikeTarget[]; blows: number; lastBlow: number;
}
interface Flier { x: number; y: number; vx: number; vy: number; born: number; tint: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const step = frameClock();
  const fy = (k: number) => top + (H - top) * k;
  const lines: Line[] = [];
  const fliers: Flier[] = [];
  let embers = false;
  let nextFly = 0;
  let nextScorch = 0;
  let started = false;
  let lastSearP = 0;
  let lastSearN = 0;
  const tints = [0xb8b2a8, 0xa8a49c, 0xc4bcb0, 0x9a968e];

  const along = (l: Line, t: number): Pt => ({ x: l.a.x + (l.b.x - l.a.x) * t, y: l.a.y + (l.b.y - l.a.y) * t });
  const segDist = (l: Line, x: number, y: number): number => {
    const dx = l.b.x - l.a.x, dy = l.b.y - l.a.y;
    const t = clamp(((x - l.a.x) * dx + (y - l.a.y) * dy) / (dx * dx + dy * dy), 0, 1);
    return dist(x, y, l.a.x + dx * t, l.a.y + dy * t);
  };
  const standing = (l: Line) => !l.down;
  const covers = (s: Sheet) => s.state === 'hung' || s.state === 'smoulder';

  function addLine(a: Pt, b: Pt): void {
    const l: Line = { a, b, down: false, downAt: 0, posts: [], blows: 0, lastBlow: 0, sheets: [] };
    for (const t of [0.22, 0.5, 0.78]) l.sheets.push({ t, state: 'hung', at: 0, tint: tints[(lines.length + Math.round(t * 9)) % 4] });
    for (const p of [a, b]) {
      l.posts.push(ctx.target({
        x: p.x, y: p.y - 14, r: 16, passThrough: true,
        onStruck: () => {
          if (l.down || tk.now - l.lastBlow < 250) return;
          l.lastBlow = tk.now;
          l.blows++;
          ctx.sfx('clang');
          if (l.blows >= 2) drop(l, tk.now);
        },
      }));
    }
    lines.push(l);
  }

  function drop(l: Line, time: number): void {
    l.down = true; l.downAt = time; l.blows = 0;
    ctx.sfx('whip');
    const wrap = (f: Fighter) => {
      if (!alive(f) || segDist(l, f.x, f.y) > WRAP_R) return;
      ctx.root(f, 1400);
      if (f === player) ctx.hit(player, 14, f.x, f.y); else ctx.hit(npc, 22, f.x, f.y);
      ctx.float(f.x, f.y - 50, 'WRAPPED', '#d8d0c4');
    };
    wrap(player); wrap(npc);
  }

  addLine({ x: W * 0.14, y: fy(0.24) }, { x: W * 0.47, y: fy(0.3) });
  addLine({ x: W * 0.54, y: fy(0.5) }, { x: W * 0.87, y: fy(0.44) });
  addLine({ x: W * 0.17, y: fy(0.76) }, { x: W * 0.52, y: fy(0.82) });

  return {
    update(time, _dt) {
      const dt = step(time);
      if (!started) { started = true; nextFly = time + 3000; nextScorch = time + 1e9; }
      if (!embers && npc.hp < npc.maxHp * 0.5) {
        embers = true; nextScorch = time + 600;
        ctx.banner('EMBERS IN THE WASH', '#ffb070');
        ctx.sfx('flame-burst');
      }
      for (const l of lines) {
        if (l.down && time - l.downAt > DOWN_MS) {
          l.down = false;
          for (const s of l.sheets) if (s.state !== 'ash' || !embers) { s.state = 'hung'; s.at = time; }
        }
        if (l.down) continue;
        for (const s of l.sheets) {
          const p = along(l, s.t);
          if (covers(s)) for (const h of ctx.shotsNear(p.x, p.y - 8, SHEET_BLOCK_R)) h.block();
          if (s.state === 'smoulder' && time - s.at > SMOULDER_MS) { s.state = 'burning'; s.at = time; ctx.sfx('inferno'); }
          if (s.state === 'burning') {
            if (time - s.at > BURN_MS) { s.state = 'ash'; s.at = time; continue; }
            for (const f of [player, npc]) {
              if (!alive(f) || Math.abs(f.x - p.x) > SHEET_W / 2 + 10 || Math.abs(f.y - p.y) > 26) continue;
              if (f === player && time - lastSearP > 500) { lastSearP = time; tk.hitPlayer(8, f.x, f.y); ctx.sfx('status-burn'); }
              if (f === npc && time - lastSearN > 500) { lastSearN = time; ctx.hit(npc, 11, f.x, f.y); }
            }
          }
        }
      }
      // Embers settle on the sheet nearest the foe-side of the room — one at a time.
      if (embers && time >= nextScorch) {
        nextScorch = time + 4200;
        const hung: { s: Sheet; p: Pt }[] = [];
        for (const l of lines) if (standing(l)) for (const s of l.sheets) if (s.state === 'hung') hung.push({ s, p: along(l, s.t) });
        hung.sort((a, b) => dist(a.p.x, a.p.y, player.x, player.y) - dist(b.p.x, b.p.y, player.x, player.y));
        if (hung.length) { hung[0].s.state = 'smoulder'; hung[0].s.at = time; ctx.sfx('sizzle'); }
      }
      // Nell snaps a sheet off the line nearest her and sends it at you.
      if (time >= nextFly && alive(player) && alive(npc)) {
        nextFly = time + (embers ? FLY_EVERY * 0.8 : FLY_EVERY);
        const a = Math.atan2(player.y - npc.y, player.x - npc.x);
        fliers.push({ x: npc.x + Math.cos(a) * 30, y: npc.y - 10, vx: Math.cos(a) * FLY_SPEED, vy: Math.sin(a) * FLY_SPEED, born: time, tint: tints[Math.floor(time) % 4] });
        ctx.sfx('gust');
      }
      for (let i = fliers.length - 1; i >= 0; i--) {
        const f = fliers[i];
        f.x += f.vx * dt; f.y += f.vy * dt;
        if (alive(player) && dist(f.x, f.y, player.x, player.y) < 34) {
          tk.hitPlayer(13, f.x, f.y); tk.slowPlayer(0.6, 1200);
          ctx.float(player.x, player.y - 50, 'SHEETED', '#d8d0c4');
          fliers.splice(i, 1); continue;
        }
        if (f.x < 10 || f.x > W - 10 || f.y < top || f.y > H || time - f.born > 6000) fliers.splice(i, 1);
      }
    },

    npcSeek() {
      if (!alive(player)) return null;
      // A post, when you stand under its line and he can get there first.
      for (const l of lines) {
        if (l.down || segDist(l, player.x, player.y) > WRAP_R + 10) continue;
        const post = dist(npc.x, npc.y, l.a.x, l.a.y) < dist(npc.x, npc.y, l.b.x, l.b.y) ? l.a : l.b;
        return { x: post.x, y: post.y + 30 };
      }
      // Otherwise: behind the nearest sheet that still covers, on the far side from you.
      let best: Pt | null = null;
      let bd = 1e9;
      for (const l of lines) {
        if (l.down) continue;
        for (const s of l.sheets) {
          if (!covers(s)) continue;
          const p = along(l, s.t);
          const a = Math.atan2(p.y - player.y, p.x - player.x);
          const q = { x: tk.clampX(p.x + Math.cos(a) * 60), y: tk.clampY(p.y + Math.sin(a) * 60) };
          const d = dist(npc.x, npc.y, q.x, q.y);
          if (d < bd) { bd = d; best = q; }
        }
      }
      return best;
    },

    drawGround(g, time) {
      for (const l of lines) {
        for (const p of [l.a, l.b]) shadow(g, p.x, p.y + 2, 26, 8);
        if (l.down) {
          // The line on the cobbles in a heap of wet linen.
          g.lineStyle(1.5, 0x8a7a64, 0.8); g.lineBetween(l.a.x, l.a.y, l.b.x, l.b.y);
          for (const s of l.sheets) {
            if (s.state === 'ash') continue;
            const p = along(l, s.t);
            g.fillStyle(dim(s.tint, 0.25), 0.9); g.fillEllipse(p.x, p.y, SHEET_W + 8, 18);
            g.fillStyle(s.tint, 0.8); g.fillEllipse(p.x - 6, p.y - 3, SHEET_W - 14, 10);
            g.lineStyle(1, dim(s.tint, 0.4), 0.8); g.lineBetween(p.x - 20, p.y - 2, p.x + 14, p.y + 3);
          }
          continue;
        }
        for (const s of l.sheets) {
          const p = along(l, s.t);
          if (s.state === 'burning') {
            const k = (time - s.at) / BURN_MS;
            g.fillStyle(EMBER, 0.18); g.fillRect(p.x - SHEET_W / 2 - 8, p.y - 26, SHEET_W + 16, 52);
            g.lineStyle(1.5, EMBER_LIT, 0.6); g.strokeRect(p.x - SHEET_W / 2 - 8, p.y - 26, SHEET_W + 16, 52);
            for (let i = 0; i < 6; i++) { g.fillStyle(SOOT, 0.4 * k); g.fillCircle(p.x - 26 + i * 10, p.y + 6 + (i % 2) * 6, 4); }
          } else if (s.state === 'ash') {
            g.fillStyle(SOOT, 0.55); g.fillEllipse(p.x, p.y + 4, SHEET_W, 14);
            for (let i = 0; i < 5; i++) { g.fillStyle(ASH_LIT, 0.5); g.fillCircle(p.x - 20 + i * 10, p.y + 3 + (i % 2) * 3, 1.5); }
          } else {
            g.fillStyle(0x000000, 0.18); g.fillEllipse(p.x + 6, p.y + 4, SHEET_W, 12);
          }
        }
      }
    },

    drawAir(g, time) {
      for (const l of lines) {
        drawPost(g, l.a.x, l.a.y, l.blows, time);
        drawPost(g, l.b.x, l.b.y, l.blows, time);
        if (l.down) continue;
        // The rope sagging between posts, sheets pegged along it.
        const ropeY = (p: Pt, t: number) => p.y - 70 + Math.sin(t * Math.PI) * 10;
        let prev = { x: l.a.x, y: l.a.y - 70 };
        for (let i = 1; i <= 16; i++) {
          const t = i / 16; const p = along(l, t);
          const q = { x: p.x, y: ropeY(p, t) };
          g.lineStyle(1.5, 0x8a7a64, 1); g.lineBetween(prev.x, prev.y, q.x, q.y);
          prev = q;
        }
        for (const s of l.sheets) {
          if (s.state === 'ash') continue;
          const p = along(l, s.t);
          drawSheet(g, p.x, ropeY(p, s.t), p.y, s, time);
        }
      }
      for (const f of fliers) drawFlier(g, f, time);
    },

    drawHud(g, time) {
      const y = top + 16;
      lines.forEach((l, i) => {
        const x = W / 2 - 60 + i * 40;
        g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x - 16, y - 12, 32, 24, 5);
        g.lineStyle(1.5, 0x8a7a64, 1); g.lineBetween(x - 12, y - 6, x + 12, y - 6);
        if (l.down) {
          const k = clamp((time - l.downAt) / DOWN_MS, 0, 1);
          g.fillStyle(0x5a5550, 1); g.fillRect(x - 12, y + 4, 24 * k, 4);
        } else {
          l.sheets.forEach((s, j) => {
            const c = s.state === 'burning' ? EMBER : s.state === 'smoulder' ? EMBER_DARK : s.state === 'ash' ? SOOT : s.tint;
            g.fillStyle(c, 1); g.fillRect(x - 11 + j * 8, y - 5, 6, 10);
          });
          for (let b = 0; b < l.blows; b++) { g.fillStyle(EMBER_LIT, 1); g.fillCircle(x - 12 + b * 24, y + 8, 2); }
        }
      });
      const k = clamp(1 - (nextFly - time) / FLY_EVERY, 0, 1);
      g.fillStyle(0x000000, 0.5); g.fillCircle(W / 2 + 90, y, 12);
      g.lineStyle(2.5, RENDER, 1);
      g.beginPath(); g.arc(W / 2 + 90, y, 10, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
    },

    destroy() { for (const l of lines) for (const p of l.posts) p.remove(); },
  };
}

/** A clothes-prop post: forked top, a cleat, the dents each blow left. */
function drawPost(g: G, x: number, y: number, blows: number, time: number): void {
  const shake = blows ? Math.sin(time / 40) * 1.5 : 0;
  g.fillStyle(0x3a2c20, 1); g.fillRect(x - 4 + shake, y - 80, 8, 80);
  g.fillStyle(0x5a4430, 1); g.fillRect(x - 2 + shake, y - 78, 2, 76);
  g.lineStyle(3, 0x3a2c20, 1);
  g.lineBetween(x + shake, y - 78, x - 7 + shake, y - 90); g.lineBetween(x + shake, y - 78, x + 7 + shake, y - 90);
  g.fillStyle(IRON, 1); g.fillRect(x - 6 + shake, y - 40, 12, 4);
  for (let i = 0; i < blows; i++) { g.fillStyle(EMBER_LIT, 0.9); g.fillRect(x - 3 + shake, y - 30 + i * 8, 6, 2); }
}

/** One sheet on the line: pegs, folds that sway, soot streaks, and fire when the embers find it. */
function drawSheet(g: G, x: number, ry: number, gy: number, s: Sheet, time: number): void {
  const h = Math.min(54, gy - ry - 10);
  const sway = Math.sin(time / 420 + x * 0.05) * 5;
  const w = SHEET_W;
  const c = s.state === 'smoulder' ? dim(s.tint, 0.15) : s.tint;
  g.fillStyle(dim(c, 0.25), 1);
  g.fillPoints([{ x: x - w / 2, y: ry }, { x: x + w / 2, y: ry }, { x: x + w / 2 + sway, y: ry + h }, { x: x - w / 2 + sway * 0.6, y: ry + h + 3 }], true);
  g.fillStyle(c, 1);
  g.fillPoints([{ x: x - w / 2 + 2, y: ry + 1 }, { x: x + w / 2 - 2, y: ry + 1 }, { x: x + w / 2 - 2 + sway, y: ry + h - 3 }, { x: x - w / 2 + 2 + sway * 0.6, y: ry + h }], true);
  for (let i = 1; i < 4; i++) { g.lineStyle(1, dim(c, 0.18), 0.8); g.lineBetween(x - w / 2 + i * w / 4, ry + 2, x - w / 2 + i * w / 4 + sway * 0.8, ry + h - 2); }
  g.fillStyle(lit(c, 0.25), 0.6); g.fillRect(x - w / 2 + 4, ry + 3, 8, h - 8);
  g.fillStyle(SMOKE, 0.35); g.fillRect(x - 8 + sway * 0.5, ry + h - 12, 22, 4);
  for (const px of [x - w / 2 + 6, x, x + w / 2 - 6]) { g.fillStyle(0x6a5440, 1); g.fillRect(px - 1.5, ry - 5, 3, 9); }
  if (s.state === 'smoulder') {
    const k = clamp((time - s.at) / SMOULDER_MS, 0, 1);
    g.fillStyle(0x5a3018, 0.8); g.fillEllipse(x + sway * 0.7, ry + h - 8, 14 + k * 30, 8 + k * 20);
    g.fillStyle(EMBER, 0.5 + Math.sin(time / 60) * 0.3); g.fillEllipse(x + sway * 0.7, ry + h - 8, 6 + k * 16, 3 + k * 8);
  } else if (s.state === 'burning') {
    const k = clamp((time - s.at) / BURN_MS, 0, 1);
    const fh = h * (1 - k * 0.6);
    for (let i = 0; i < 6; i++) {
      const fx = x - w / 2 + 6 + i * (w - 12) / 5 + sway * 0.5;
      const lick = fh * (0.7 + Math.sin(time / 70 + i * 1.7) * 0.3);
      g.fillStyle(EMBER, 0.9); g.fillTriangle(fx - 7, ry + h, fx + 7, ry + h, fx, ry + h - lick);
      g.fillStyle(GLOW, 0.9); g.fillTriangle(fx - 3, ry + h, fx + 3, ry + h, fx, ry + h - lick * 0.6);
    }
    glow(g, x, ry + h * 0.6, 50, EMBER, 0.05, 3);
  }
}

/** A sheet torn off its pegs, flapping open as it flies. */
function drawFlier(g: G, f: Flier, time: number): void {
  const a = Math.atan2(f.vy, f.vx);
  const flap = Math.sin(time / 60) * 0.35;
  const cx = f.x, cy = f.y - 22;
  const ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
  shadow(g, f.x, f.y + 4, 54, 14, 0.25);
  const p = (u: number, n: number) => ({ x: cx + ux * u + nx * n, y: cy + uy * u + ny * n });
  g.fillStyle(dim(f.tint, 0.25), 1);
  g.fillPoints([p(-24, -30), p(16, -26 - flap * 20), p(24, 0), p(16, 26 + flap * 20), p(-24, 30), p(-14, 0)], true);
  g.fillStyle(f.tint, 1);
  g.fillPoints([p(-20, -26), p(14, -22 - flap * 18), p(20, 0), p(14, 22 + flap * 18), p(-20, 26), p(-11, 0)], true);
  g.lineStyle(1, dim(f.tint, 0.35), 0.9);
  for (const n of [-14, 0, 14]) { const q1 = p(-16, n), q2 = p(16, n * (1 + flap)); g.lineBetween(q1.x, q1.y, q2.x, q2.y); }
  for (let i = 0; i < 3; i++) { const q = p(-30 - i * 10, (i - 1) * 12); g.lineStyle(1, 0xd8d0c4, 0.4); g.lineBetween(q.x, q.y, q.x - ux * 14, q.y - uy * 14); }
}

export const FALLEN_HUNG_OUT: GimmickDef = {
  id: ID,
  rules: 'Sheets stop every shot. Dodge the sheets Nell throws; strike a post twice to drop its line on whoever stands under it. At half, the wash burns.',
  make,
};
