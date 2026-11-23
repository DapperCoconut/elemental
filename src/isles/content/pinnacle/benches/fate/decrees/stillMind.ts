import type Phaser from 'phaser';
import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import { OBS, seam, shard } from '../../../../../art/PinnacleArt';
import { glow } from '../../../../../art/IsleArt';
import { CSS_LOT, CSS_NPC, CSS_PLAYER, FELT, FELT_GLOW, IVORY, LOT_LILAC, SIDE_NPC, SIDE_PLAYER } from '../palette';
import { type Who, WHO, alive, clamp, dist, stepOf } from '../util';

/**
 * Seat of the Sealed Mind — Councilor Cassius Augur, who wrote the clause that every wager be
 * read by a mentalist, so that no citizen could bluff the House.
 *
 * DECREE OF THE STILL MIND. Here a mind that does not move cannot be struck. Stand still and your
 * focus gathers; when it is full a third eye opens over you and a ring of thought turns round you
 * — any shot that crosses it is turned back on whoever threw it. Each turn costs a ward (three),
 * and when the last is spent the eye breaks and must be rebuilt. Move, and the eye shuts. The
 * councilor reads every shot you throw before it leaves your hand, and will be perfectly still
 * when it arrives. But a thought only turns a thrown thing: beams, blasts and blows walk straight
 * through it — and three cheap shots will break it.
 */

interface Mind { lx: number; ly: number; still: number; focus: number; wards: number; regenAt: number; brokeAt: number; open: boolean }
interface Ripple { x: number; y: number; at: number; c: number }

const make = (ctx: GimmickCtx): EncounterGimmick => {
  const RING = 104;
  const WARDS = 3;
  const GATHER_S = ctx.hard ? 0.5 : 0.6;
  const SETTLE_S = 0.3;
  const STILL_PX_S = 40;
  const REGEN_MS = ctx.hard ? 2200 : 2600;
  const BROKEN_MS = 2400;

  const mind: Record<Who, Mind> = {
    player: { lx: ctx.player.x, ly: ctx.player.y, still: 0, focus: 0, wards: WARDS, regenAt: 0, brokeAt: -9999, open: false },
    npc: { lx: ctx.npc.x, ly: ctx.npc.y, still: 0, focus: 0, wards: WARDS, regenAt: 0, brokeAt: -9999, open: false },
  };
  const ripples: Ripple[] = [];
  let playerCastAt = -9999;
  let introduced = false;
  const fighter = (w: Who) => (w === 'player' ? ctx.player : ctx.npc);
  const colorOf = (w: Who) => (w === 'player' ? SIDE_PLAYER : SIDE_NPC);

  const tick = (w: Who, time: number, dt: number): void => {
    const m = mind[w];
    const f = fighter(w);
    const moved = dist(f.x, f.y, m.lx, m.ly);
    m.lx = f.x; m.ly = f.y;
    if (!alive(f)) { m.open = false; m.focus = 0; return; }
    if (moved <= STILL_PX_S * dt + 0.4) m.still += dt; else m.still = 0;
    const broken = time - m.brokeAt < BROKEN_MS;
    if (m.still >= SETTLE_S && !broken) m.focus = Math.min(1, m.focus + dt / GATHER_S);
    else m.focus = Math.max(0, m.focus - dt / 0.18);
    const wasOpen = m.open;
    m.open = m.focus >= 1 && m.wards > 0;
    if (m.open && !wasOpen) ctx.sfx('crystal-chime');
    // Wards come back one at a time while the mind is not being tested.
    if (m.wards < WARDS && time >= m.regenAt && !broken) { m.wards++; m.regenAt = time + REGEN_MS; }
    if (!m.open) return;
    for (const s of ctx.shotsNear(f.x, f.y, RING)) {
      if (s.owner === w) continue;
      s.reflect(s.x - f.x, s.y - f.y);
      ripples.push({ x: s.x, y: s.y, at: time, c: colorOf(w) });
      m.wards--;
      m.regenAt = time + REGEN_MS;
      ctx.sfx('prism');
      if (m.wards <= 0) {
        m.open = false; m.focus = 0; m.brokeAt = time;
        ctx.float(f.x, f.y - 64, 'THE MIND BREAKS', w === 'player' ? CSS_PLAYER : CSS_NPC);
        ctx.sfx('crystal-shatter');
        break;
      }
    }
  };

  /** The third eye: an almond of black glass, a felt iris, lilac light — cracked when broken. */
  const eye = (g: Phaser.GameObjects.Graphics, x: number, y: number, s: number, open: number, broken: boolean, time: number): void => {
    const h = s * 0.55 * open;
    g.fillStyle(LOT_LILAC, 0.08 + 0.06 * open); g.fillEllipse(x, y, s * 3, s * 2);
    g.fillStyle(OBS.glass, 1); g.fillEllipse(x, y, s * 2.2, Math.max(2, h * 2.2));
    g.lineStyle(1.6, OBS.edge, 0.9); g.strokeEllipse(x, y, s * 2.2, Math.max(2, h * 2.2));
    if (open > 0.2) {
      const look = Math.sin(time / 700) * s * 0.25;
      g.fillStyle(FELT, 1); g.fillCircle(x + look, y, s * 0.5 * open);
      g.fillStyle(FELT_GLOW, 1); g.fillCircle(x + look, y, s * 0.34 * open);
      g.fillStyle(OBS.glass, 1); g.fillEllipse(x + look, y, s * 0.14, s * 0.4 * open);
      g.fillStyle(0xffffff, 0.8); g.fillCircle(x + look - s * 0.15, y - s * 0.15, s * 0.08);
    }
    // Lashes of glass: three short shards fanning up.
    for (let i = -1; i <= 1; i++) shard(g, x + i * s * 0.6, y - h - 1, s * 0.35, s * (0.7 - Math.abs(i) * 0.2) * (0.4 + open * 0.6), i * s * 0.25, 0.2);
    if (broken) seam(g, [{ x: x - s * 0.9, y: y - s * 0.3 }, { x: x - s * 0.2, y: y + s * 0.1 }, { x: x + s * 0.3, y: y - s * 0.2 }, { x: x + s, y: y + s * 0.2 }], 1.2, 1, 0.6, OBS.seam);
  };

  return {
    update(time, dt) {
      const s = stepOf(dt);
      if (!introduced) { introduced = true; ctx.banner('STAND STILL AND THE MIND TURNS SHOTS — MOVE AND IT SHUTS', CSS_LOT); }
      for (const w of WHO) tick(w, time, s);
      while (ripples.length && time - ripples[0].at > 600) ripples.shift();
    },
    onPlayerCast() { playerCastAt = ctx.scene.time.now; },
    npcSeek() {
      const n = ctx.npc, m = mind.npc;
      const t = ctx.scene.time.now;
      if (m.wards <= 0 || t - m.brokeAt < BROKEN_MS) return null;
      // It reads your hand: when you have just thrown, or a shot of yours is coming, it goes still.
      const incoming = ctx.shotsNear(n.x, n.y, 300).some((sh) => sh.owner === 'player');
      if (incoming || t - playerCastAt < 600) return { x: n.x, y: n.y };
      return null;
    },
    drawGround(g, time) {
      const t = time / 1000;
      for (const w of WHO) {
        const m = mind[w];
        const f = fighter(w);
        if (!alive(f)) continue;
        // A still mind stills the glass under it: rings spreading like a pond going calm.
        if (m.still > 0.1) {
          const calm = clamp(m.still / 1.2, 0, 1);
          for (let i = 0; i < 3; i++) {
            const ph = (t * 0.6 + i / 3) % 1;
            g.lineStyle(1.2, colorOf(w), 0.25 * calm * (1 - ph)); g.strokeEllipse(f.x, f.y + 14, (30 + ph * RING * 1.6), (30 + ph * RING * 1.6) * 0.45);
          }
        }
        // The focus gathering: an arc round the feet.
        if (m.focus > 0 && !m.open) {
          g.lineStyle(3, colorOf(w), 0.7);
          g.beginPath(); g.arc(f.x, f.y, 30, -Math.PI / 2, -Math.PI / 2 + m.focus * Math.PI * 2, false); g.strokePath();
        }
        if (m.open) {
          g.fillStyle(colorOf(w), 0.05); g.fillCircle(f.x, f.y, RING);
          g.lineStyle(1.5, colorOf(w), 0.35 + 0.15 * Math.sin(t * 4)); g.strokeCircle(f.x, f.y, RING);
          g.lineStyle(1, LOT_LILAC, 0.25); g.strokeCircle(f.x, f.y, RING - 8);
        }
      }
    },
    drawAir(g, time) {
      const t = time / 1000;
      for (const w of WHO) {
        const m = mind[w];
        const f = fighter(w);
        if (!alive(f)) continue;
        const broken = time - m.brokeAt < BROKEN_MS;
        if (m.open || m.focus > 0.4 || broken) eye(g, f.x, f.y - 54, 10, m.open ? 1 : broken ? 0.15 : m.focus * 0.6, broken, time);
        // Ward pips over the eye.
        for (let i = 0; i < WARDS; i++) {
          const px = f.x - 12 + i * 12, py = f.y - 74;
          const on = i < m.wards;
          g.fillStyle(on ? colorOf(w) : OBS.glass, on ? 0.95 : 0.8);
          g.fillTriangle(px, py - 5, px + 4, py, px, py + 5); g.fillTriangle(px, py - 5, px - 4, py, px, py + 5);
          g.lineStyle(1, OBS.edge, 0.6); g.lineBetween(px, py - 5, px + 4, py);
        }
        // The ring of thought: glass glyph-shards turning round the still one.
        if (m.open) {
          for (let i = 0; i < 9; i++) {
            const a = t * (w === 'player' ? 0.9 : -0.9) + (i / 9) * Math.PI * 2;
            const x = f.x + Math.cos(a) * RING, y = f.y + Math.sin(a) * RING;
            g.fillStyle(OBS.facet, 0.95);
            g.fillTriangle(x + Math.cos(a) * 7, y + Math.sin(a) * 7, x - Math.sin(a) * 4, y + Math.cos(a) * 4, x + Math.sin(a) * 4, y - Math.cos(a) * 4);
            g.fillStyle(colorOf(w), 0.9); g.fillCircle(x, y, 1.6);
          }
          glow(g, f.x, f.y - 54, 22, LOT_LILAC, 0.03, 2);
        }
      }
      // A turned shot leaves a ring of thought where it bounced.
      for (const r of ripples) {
        const k = (time - r.at) / 600;
        g.lineStyle(2, r.c, 0.8 * (1 - k)); g.strokeCircle(r.x, r.y, 8 + k * 30);
        g.lineStyle(1, IVORY, 0.6 * (1 - k)); g.strokeCircle(r.x, r.y, 4 + k * 16);
      }
    },
    drawHud(g) {
      // Your focus, under your own name: a lilac bar that fills as you stand still.
      const m = mind.player;
      const x = 28, y = ctx.H - 28;
      g.fillStyle(0x07060d, 0.8); g.fillRoundedRect(x - 8, y - 12, 136, 24, 8);
      g.lineStyle(1, m.open ? SIDE_PLAYER : OBS.edge, m.open ? 0.9 : 0.5); g.strokeRoundedRect(x - 8, y - 12, 136, 24, 8);
      g.fillStyle(m.open ? SIDE_PLAYER : LOT_LILAC, 0.9); g.fillRect(x + 22, y - 3, 96 * m.focus, 6);
      eye(g, x + 8, y, 6, m.open ? 1 : m.focus * 0.6, false, 0);
    },
  };
};

export const DECREE_STILL_MIND: GimmickDef = {
  id: 'bench-fate-still-mind',
  rules: 'A fighter who stands still opens a third eye: its ring turns thrown shots back, three times, then breaks. Moving shuts it.',
  make,
};
