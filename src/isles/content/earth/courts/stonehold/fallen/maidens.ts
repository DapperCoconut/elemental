import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { mulberry, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { dustPuff } from '../art';
import {
  CHALK, DUST, EARTH_DARK, GRANITE, GRANITE_DARK, GRANITE_DEEP, GRANITE_LIT, LICHEN, LICHEN_LIT, REGENT_LIT, STRATA,
} from '../palette';
import { alive, clamp, dist, stepDt, wrapAngle } from '../util';

/**
 * The Maidens Dance — Lowri Chanter, the Regent's piper.
 *
 * Every Stonehold child knows the ring of nine stones by the avenue: girls who danced on a
 * Tithe-day and were turned to stone for it, and the piper who played for them turned with them.
 * In the star's telling it was no curse. Lowri played the tune the Regent paid for, the girls
 * danced, and the Burier's mason did the rest. She has played for them ever since.
 *
 * While the pipe plays, the Maidens dance. Each one creeps on the nearest fighter — but only while
 * that fighter is not looking at her. Look at a maiden and she stands as still as stone (the pale
 * fan on the floor is where you are looking). Touch one, or let one reach you, and she takes you
 * to dance: spun, hurt and held, and then she glides back to her socket. When the pipe rests, so
 * do they.
 *
 * Lowri looks where she walks, and the Maidens go for whoever is nearest — so lead them to her, or
 * strike one (it is knocked away from you, stunned a moment) straight into her. Halfway down the
 * piper quickens and the Maidens run. The bot keeps you between itself and a hunting maiden.
 */

const ID = fallenId('stonehold', 'maidens');
const N = 6;
const CONE = 0.95;
const TOUCH = 36;
const KNOCK = 84;

interface Maiden {
  sx: number; sy: number; x: number; y: number; kx: number; ky: number;
  frozenUntil: number; home: boolean; moving: boolean; tookAt: number; seed: number; step: number;
  target: StrikeTarget | null;
}
interface Puff { x: number; y: number; at: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const cx = W / 2, cy = (top + H) / 2 + 6;
  const maidens: Maiden[] = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2 + Math.PI / 6;
    const x = cx + Math.cos(a) * 330, y = cy + Math.sin(a) * 190;
    maidens.push({ sx: x, sy: y, x, y, kx: x, ky: y, frozenUntil: 0, home: false, moving: false, tookAt: -1e9, seed: 300 + i * 13, step: 0, target: null });
  }
  const puffs: Puff[] = [];
  let started = false;
  let quick = false;
  let barAt = 0;

  const playMs = () => (quick ? 4300 : 3800);
  const restMs = () => (quick ? 1000 : 1500);
  const playing = (time: number) => ((time - barAt) % (playMs() + restMs())) < playMs();
  const nearest = (m: Maiden): Fighter => (!alive(npc) || dist(player.x, player.y, m.x, m.y) <= dist(npc.x, npc.y, m.x, m.y) ? player : npc);
  const watched = (f: Fighter, m: Maiden) => Math.abs(wrapAngle(Math.atan2(m.y - f.y, m.x - f.x) - ctx.facing(f))) < CONE;

  function take(m: Maiden, f: Fighter): void {
    m.home = true; m.tookAt = tk.now;
    if (f === player) tk.hitPlayer(15, f.x, f.y);
    else { ctx.hit(npc, 26, f.x, f.y); ctx.float(f.x, f.y - 54, 'TAKEN TO DANCE', '#e8dcc8'); }
    ctx.stun(f, 850);
    const a = Math.atan2(f.y - m.y, f.x - m.x);
    ctx.nudge(f, Math.cos(a + 1.2) * 46, Math.sin(a + 1.2) * 46);
    ctx.sfx('stone-slam');
    ctx.flash(f.x, f.y, GRANITE_LIT);
    puffs.push({ x: f.x, y: f.y + 8, at: tk.now });
  }

  for (const m of maidens) {
    m.target = ctx.target({
      x: m.x, y: m.y - 34, r: 24,
      onStruck: (by) => {
        if (m.home) return;
        const f = by === 'player' ? player : npc;
        const d = dist(f.x, f.y, m.x, m.y) || 1;
        m.kx = tk.clampX(m.x + ((m.x - f.x) / d) * KNOCK, 50);
        m.ky = clamp(m.y + ((m.y - f.y) / d) * KNOCK, top + 40, H - 30);
        m.frozenUntil = tk.now + 1100;
        ctx.sfx('clang');
      },
    });
  }

  return {
    update(time, rawDt) {
      const dt = stepDt(rawDt);
      if (!started) { started = true; barAt = time + 1500; }
      if (!quick && npc.hp < npc.maxHp * 0.5) { quick = true; ctx.banner('THE PIPER QUICKENS', '#e8dcc8'); ctx.sfx('screech'); }
      const play = time >= barAt && playing(time);
      const speed = quick ? 96 : 64;
      for (const m of maidens) {
        m.moving = false;
        if (m.home) {
          const d = dist(m.x, m.y, m.sx, m.sy);
          if (d < 6) { m.home = false; m.x = m.sx; m.y = m.sy; m.kx = m.x; m.ky = m.y; }
          else { m.x += ((m.sx - m.x) / d) * Math.min(d, 280 * dt); m.y += ((m.sy - m.y) / d) * Math.min(d, 280 * dt); m.kx = m.x; m.ky = m.y; }
        } else if (time < m.frozenUntil) {
          const k = Math.min(1, dt * 12);
          m.x += (m.kx - m.x) * k; m.y += (m.ky - m.y) * k;
        } else if (play) {
          const f = nearest(m);
          if (alive(f) && !watched(f, m)) {
            const d = dist(m.x, m.y, f.x, f.y) || 1;
            m.x += ((f.x - m.x) / d) * speed * dt; m.y += ((f.y - m.y) / d) * speed * dt;
            m.kx = m.x; m.ky = m.y; m.moving = true; m.step += dt * 8;
          }
        }
        m.target?.moveTo(m.x, m.y - 34);
        if (m.home) continue;
        for (const f of [player, npc]) if (alive(f) && dist(f.x, f.y, m.x, m.y) < TOUCH) { take(m, f); break; }
      }
      while (puffs.length && time - puffs[0].at > 800) puffs.shift();
    },

    npcSeek() {
      if (!alive(player) || !alive(npc)) return null;
      let hunter: Maiden | null = null, hd = 240;
      for (const m of maidens) {
        if (m.home || nearest(m) !== npc) continue;
        const d = dist(m.x, m.y, npc.x, npc.y);
        if (d < hd) { hd = d; hunter = m; }
      }
      if (!hunter) return null;
      // Put you between itself and the maiden: she goes for whoever is nearer.
      const d = dist(player.x, player.y, hunter.x, hunter.y) || 1;
      return { x: tk.clampX(player.x + ((player.x - hunter.x) / d) * 95), y: tk.clampY(player.y + ((player.y - hunter.y) / d) * 95) };
    },

    drawGround(g, time) {
      // The watch fans: where each of you is looking, the stones stand still.
      for (const f of [player, npc]) {
        if (!alive(f)) continue;
        const a = ctx.facing(f);
        const pts = [{ x: f.x, y: f.y }];
        for (let i = 0; i <= 10; i++) { const t = a - CONE + (i / 10) * CONE * 2; pts.push({ x: f.x + Math.cos(t) * 240, y: f.y + Math.sin(t) * 240 }); }
        g.fillStyle(0xfff4d8, f === player ? 0.07 : 0.04); g.fillPoints(pts, true);
        g.lineStyle(1, 0xfff4d8, f === player ? 0.25 : 0.12);
        g.lineBetween(f.x, f.y, pts[1].x, pts[1].y); g.lineBetween(f.x, f.y, pts[11].x, pts[11].y);
      }
      // The sockets in the old ring: worn hollows, a ring of dust, a dropped dry posy.
      for (const m of maidens) {
        g.fillStyle(EARTH_DARK, 0.7); g.fillEllipse(m.sx, m.sy, 46, 14);
        g.lineStyle(1, CHALK, 0.25); g.strokeEllipse(m.sx, m.sy, 58, 18);
        g.fillStyle(0x8a6a4a, 0.8); g.fillCircle(m.sx + 18, m.sy + 5, 2); g.fillStyle(0xb07a8a, 0.7); g.fillCircle(m.sx + 21, m.sy + 4, 1.6);
        if (dist(m.x, m.y, m.sx, m.sy) > 20) { g.lineStyle(3, EARTH_DARK, 0.25); g.lineBetween(m.sx, m.sy, m.x, m.y); }
      }
      for (const p of puffs) dustPuff(g, p.x, p.y, (time - p.at) / 800, 30, DUST);
    },

    drawAir(g, time) {
      for (const m of [...maidens].sort((a, b) => a.y - b.y)) drawMaiden(g, m, time);
      if (alive(npc) && time >= barAt && playing(time)) drawNotes(g, npc.x, npc.y - 60, time);
    },

    drawHud(g, time) {
      // A stave: notes scroll while the pipe plays; a rest sits on the lines while it does not.
      const w = 140, x = W / 2 - w / 2, y = top + 8;
      g.fillStyle(0xe8dcbc, 0.92); g.fillRoundedRect(x - 6, y - 4, w + 12, 30, 4);
      for (let i = 0; i < 5; i++) { g.lineStyle(1, 0x5a4a3a, 0.8); g.lineBetween(x, y + 2 + i * 5, x + w, y + 2 + i * 5); }
      const play = time >= barAt && playing(time);
      if (play) {
        for (let i = 0; i < 7; i++) {
          const nx = x + w - (((time / (quick ? 6 : 9)) + i * 22) % w);
          const ny = y + 2 + ((i * 3) % 5) * 5;
          g.fillStyle(0x2a1e18, 1); g.fillEllipse(nx, ny, 6, 4.5);
          g.lineStyle(1.2, 0x2a1e18, 1); g.lineBetween(nx + 3, ny, nx + 3, ny - 11);
        }
      } else {
        g.fillStyle(0x2a1e18, 1); g.fillRect(x + w / 2 - 6, y + 7, 12, 4);
        g.fillStyle(REGENT_LIT, 0.8); g.fillRect(x + 4, y + 22, (w - 8) * clamp(((time - barAt) % (playMs() + restMs()) - playMs()) / restMs(), 0, 1), 2);
      }
    },

    destroy() { for (const m of maidens) m.target?.remove(); },
  };
}

/** A maiden: a standing stone that was a girl — skirt flared at the foot, an arm up mid-turn, a dry garland. */
function drawMaiden(g: G, m: Maiden, time: number): void {
  const rng = mulberry(m.seed);
  const sway = m.moving ? Math.sin(m.step) * 3 : 0;
  const x = m.x, y = m.y, h = 74;
  const hx = x + sway;
  shadow(g, x + 8, y, 54, 14, 0.36);
  if (m.moving) for (let i = 0; i < 3; i++) { g.fillStyle(DUST, 0.35); g.fillCircle(x - 14 + i * 14, y + 1 + Math.sin(m.step + i) * 2, 4); }
  const body = [
    { x: x - 22, y }, { x: x - 13, y: y - 30 }, { x: hx - 11, y: y - 44 }, { x: hx - 14, y: y - 54 },
    { x: hx - 6, y: y - 60 }, { x: hx + 7, y: y - 60 }, { x: hx + 14, y: y - 52 }, { x: hx + 10, y: y - 42 },
    { x: x + 12, y: y - 30 }, { x: x + 22, y },
  ];
  g.fillStyle(GRANITE_DARK, 1); g.fillPoints(body.map((p) => ({ x: p.x + 3, y: p.y + 2 })), true);
  g.fillStyle(GRANITE, 1); g.fillPoints(body, true);
  g.fillStyle(GRANITE_LIT, 0.45); g.fillPoints([body[0], body[1], body[2], body[3], body[4], { x: hx - 3, y: y - 40 }, { x: x - 8, y }], true);
  // Folds of the skirt, worn to grooves.
  for (let i = -2; i <= 2; i++) { g.lineStyle(1.4, GRANITE_DEEP, 0.45); g.lineBetween(x + i * 4, y - 28, x + i * 8, y - 2); }
  // Strata through her, as through every stone on the shoulder.
  g.lineStyle(4, STRATA[m.seed % STRATA.length], 0.22); g.lineBetween(x - 18, y - 16, x + 18, y - 20);
  // The arm raised mid-turn, the other on the hip.
  g.fillStyle(GRANITE, 1); g.fillEllipse(hx + 16, y - 64, 8, 22);
  g.lineStyle(1, GRANITE_DEEP, 0.6); g.strokeEllipse(hx + 16, y - 64, 8, 22);
  g.fillStyle(GRANITE, 1); g.fillEllipse(hx - 15, y - 42, 8, 12);
  // Head, tipped back as if laughing; eyes shut, carved.
  g.fillStyle(GRANITE, 1); g.fillEllipse(hx, y - h + 4, 18, 20);
  g.fillStyle(GRANITE_LIT, 0.4); g.fillEllipse(hx - 3, y - h + 1, 8, 12);
  g.lineStyle(1.2, GRANITE_DEEP, 0.9);
  g.beginPath(); g.arc(hx - 4, y - h + 4, 2.5, 0.2, Math.PI - 0.2, false); g.strokePath();
  g.beginPath(); g.arc(hx + 4, y - h + 4, 2.5, 0.2, Math.PI - 0.2, false); g.strokePath();
  g.lineBetween(hx - 2, y - h + 10, hx + 2, y - h + 10);
  // A dry garland: brown stems, faded flowers.
  for (let i = 0; i < 7; i++) {
    const a = Math.PI + (i / 6) * Math.PI;
    const fx = hx + Math.cos(a) * 9, fy = y - h + Math.sin(a) * 5 - 3;
    g.fillStyle(i % 2 ? 0xb08a6a : 0x9a7a8a, 0.9); g.fillCircle(fx, fy, 1.8);
  }
  for (let i = 0; i < 5; i++) { g.fillStyle(LICHEN, 0.75); const lx = x + (rng() - 0.5) * 30, ly = y - rng() * 50 - 4; g.fillCircle(lx, ly, 1.5 + rng() * 2); g.fillStyle(LICHEN_LIT, 0.6); g.fillCircle(lx - 0.5, ly - 0.5, 0.8); }
  g.fillStyle(EARTH_DARK, 1); g.fillEllipse(x, y - 1, 46, 9);
  if (time < m.frozenUntil) { g.lineStyle(2, 0xffffff, 0.5); g.strokeEllipse(hx, y - 40, 52, 92); }
  if (time - m.tookAt < 600) { const k = (time - m.tookAt) / 600; g.lineStyle(3, REGENT_LIT, 1 - k); g.strokeEllipse(x, y - 4, 60 + k * 60, 18 + k * 18); }
}

/** Notes off the piper's chanter: drawn heads and stems, rising and drifting. */
function drawNotes(g: G, x: number, y: number, time: number): void {
  for (let i = 0; i < 3; i++) {
    const k = ((time / 900) + i / 3) % 1;
    const nx = x + Math.sin(k * 6 + i) * 14 + 10, ny = y - k * 40;
    g.fillStyle(0x2a1e18, 1 - k); g.fillEllipse(nx, ny, 6, 4.5);
    g.lineStyle(1.4, 0x2a1e18, 1 - k); g.lineBetween(nx + 3, ny, nx + 3, ny - 11);
    if (i === 1) g.lineBetween(nx + 3, ny - 11, nx + 8, ny - 8);
  }
}

export const FALLEN_MAIDENS: GimmickDef = {
  id: ID,
  rules: 'While the pipe plays, each Maiden creeps on the nearest fighter not looking at her; touch one and she takes you. Strike one to knock her away.',
  make,
};
