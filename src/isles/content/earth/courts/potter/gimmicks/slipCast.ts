import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import { lit, mixC } from '../../../../../art/IsleArt';
import { pot } from '../art';
import { MARL, PLASTER, PLASTER_DARK, SLIP, SLIP_DARK, SLIP_DEEP, SLIP_LIT, TIMBER_DARK } from '../palette';
import { alive, clamp, stepDt } from '../util';

/**
 * Slip Casting — Moulder Grogg.
 *
 * Great plaster moulds are let into the floor, each the shape of something the court casts — a
 * jug, a figure, a vase. One after another they fill with slip poured from Grogg's spouts overhead;
 * the level climbs, the surface skins over, and on a beat the mould *sets*. Whoever is standing in
 * a mould as it sets is cast in clay: held fast, only able to swing, until somebody strikes them
 * free — and the blow that breaks a cast shell breaks it hard. Wading through a filling mould is
 * slow going.
 *
 * Grogg would like you cast and him swinging. Stand where his path to you crosses a mould that
 * is skinning over, and let him walk into it.
 */

const FILL_MS = 3600;
const SET_WARN = 1100;
const DRAIN_MS = 1400;
const CAST_MAX = 3500;
const BREAK_DMG = 10;

type Phase = 'idle' | 'fill' | 'setting' | 'drain';
type MouldShape = 'jug' | 'figure' | 'vase';
interface Mould { x: number; y: number; w: number; h: number; shape: MouldShape; phase: Phase; at: number; next: number }
interface Cast { until: number; at: number; mould: Mould | null }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const midY = (top + H) / 2;
  const moulds: Mould[] = [
    { x: 200, y: top + 130, w: 120, h: 96, shape: 'jug', phase: 'idle', at: 0, next: 0 },
    { x: 760, y: top + 130, w: 120, h: 96, shape: 'vase', phase: 'idle', at: 0, next: 0 },
    { x: W / 2, y: midY, w: 130, h: 104, shape: 'figure', phase: 'idle', at: 0, next: 0 },
    { x: 200, y: H - 110, w: 120, h: 96, shape: 'vase', phase: 'idle', at: 0, next: 0 },
    { x: 760, y: H - 110, w: 120, h: 96, shape: 'jug', phase: 'idle', at: 0, next: 0 },
  ];
  const casts = new Map<Fighter, Cast>([[player, { until: 0, at: 0, mould: null }], [npc, { until: 0, at: 0, mould: null }]]);
  let started = false;
  let guard = false;
  const castMs = ctx.hard ? CAST_MAX + 500 : CAST_MAX;

  const inside = (m: Mould, f: Fighter) => Math.abs(f.x - m.x) < m.w / 2 && Math.abs(f.y - m.y) < m.h / 2;
  const level = (m: Mould, time: number): number => {
    if (m.phase === 'fill') return clamp((time - m.at) / FILL_MS, 0, 1);
    if (m.phase === 'setting') return 1;
    if (m.phase === 'drain') return 1 - clamp((time - m.at) / DRAIN_MS, 0, 1);
    return 0;
  };
  const isCast = (f: Fighter) => ctx.scene.time.now < (casts.get(f)?.until ?? 0);

  function setMould(m: Mould, time: number): void {
    let any = false;
    for (const [f, c] of casts) {
      if (!alive(f) || !inside(m, f) || time < c.until) continue;
      c.until = time + castMs; c.at = time; c.mould = m;
      ctx.float(f.x, f.y - 50, 'CAST IN CLAY', '#e2bc98');
      any = true;
    }
    ctx.sfx(any ? 'stone-slam' : 'slime-splat');
  }

  function breakFree(f: Fighter): void {
    if (guard) return;
    const c = casts.get(f);
    if (!c || ctx.scene.time.now >= c.until) return;
    c.until = 0;
    guard = true;
    ctx.hit(f, BREAK_DMG, f.x, f.y);
    guard = false;
    ctx.float(f.x, f.y - 50, 'STRUCK FREE', '#f6e2c8');
    ctx.sfx('crystal-shatter');
  }

  return {
    update(time, dtRaw) {
      stepDt(dtRaw);
      if (!started) {
        started = true;
        // Stagger the first pours so the floor is never all-set at once.
        moulds.forEach((m, i) => { m.next = time + 900 + i * 1500 + rng() * 600; });
      }
      for (const m of moulds) {
        if (m.phase === 'idle' && time >= m.next) { m.phase = 'fill'; m.at = time; ctx.sfx('splash'); }
        else if (m.phase === 'fill' && time - m.at >= FILL_MS) { m.phase = 'setting'; m.at = time; ctx.float(m.x, m.y - m.h / 2 - 10, 'SETTING', '#dcb48e'); ctx.sfx('clock-tick'); }
        else if (m.phase === 'setting' && time - m.at >= SET_WARN) { setMould(m, time); m.phase = 'drain'; m.at = time; }
        else if (m.phase === 'drain' && time - m.at >= DRAIN_MS) { m.phase = 'idle'; m.next = time + (ctx.hard ? 1400 : 2200) + rng() * 2400; }
      }
      // The cast are held: rooted and able only to swing.
      for (const [f, c] of casts) {
        if (!alive(f) || time >= c.until) continue;
        ctx.root(f, 140);
        ctx.silence(f, 140);
      }
    },

    onPlayerHurt() { breakFree(player); },
    onNpcHurt() { breakFree(npc); },

    playerSpeedMult() {
      const time = ctx.scene.time.now;
      return moulds.some((m) => inside(m, player) && level(m, time) > 0.25 && m.phase !== 'drain') ? 0.7 : 1;
    },
    npcSpeedMult() {
      const time = ctx.scene.time.now;
      return moulds.some((m) => inside(m, npc) && level(m, time) > 0.25 && m.phase !== 'drain') ? 0.7 : 1;
    },

    npcSeek() {
      const time = ctx.scene.time.now;
      if (isCast(npc)) return null;
      // Standing in a mould that is skinning over: get out.
      const here = moulds.find((m) => inside(m, npc) && (m.phase === 'setting' || (m.phase === 'fill' && level(m, time) > 0.7)));
      if (here) {
        const dx = npc.x - here.x, dy = npc.y - here.y;
        const ax = Math.abs(dx) / here.w, ay = Math.abs(dy) / here.h;
        return ax > ay
          ? { x: clamp(here.x + Math.sign(dx || 1) * (here.w / 2 + 40), 60, W - 60), y: npc.y }
          : { x: npc.x, y: clamp(here.y + Math.sign(dy || 1) * (here.h / 2 + 40), top + 50, H - 40) };
      }
      // You are cast: walk up and swing.
      if (isCast(player)) return { x: player.x + (npc.x < player.x ? -40 : 40), y: player.y };
      // Otherwise crowd you toward the fullest mould near you.
      let best: Mould | null = null, bs = 0.4;
      for (const m of moulds) { const l = m.phase === 'fill' ? level(m, time) : 0; if (l > bs && Math.hypot(m.x - player.x, m.y - player.y) < 260) { bs = l; best = m; } }
      if (best) {
        const dx = player.x - best.x, dy = player.y - best.y;
        const d = Math.hypot(dx, dy) || 1;
        return { x: clamp(player.x + (dx / d) * 110, 60, W - 60), y: clamp(player.y + (dy / d) * 110, top + 50, H - 40) };
      }
      return null;
    },

    drawGround(g, time) {
      for (const m of moulds) {
        const x0 = m.x - m.w / 2, y0 = m.y - m.h / 2;
        // The plaster block let into the floor, strapped, its cavity in the shape it casts.
        g.fillStyle(PLASTER_DARK, 1); g.fillRoundedRect(x0 - 6, y0 - 6, m.w + 12, m.h + 12, 10);
        g.fillStyle(PLASTER, 1); g.fillRoundedRect(x0 - 4, y0 - 6, m.w + 8, m.h + 8, 10);
        g.fillStyle(0xffffff, 0.35); g.fillRect(x0, y0 - 4, m.w, 3);
        g.fillStyle(TIMBER_DARK, 1); g.fillRect(x0 - 8, m.y - 3, 8, 6); g.fillRect(x0 + m.w, m.y - 3, 8, 6);
        // The cavity floor.
        g.fillStyle(PLASTER_DARK, 1); g.fillRoundedRect(x0 + 4, y0 + 4, m.w - 8, m.h - 8, 8);
        // The shape's ghost cut into the cavity floor.
        g.lineStyle(2, mixC(PLASTER_DARK, 0x6a5a48, 0.5), 0.7);
        if (m.shape === 'jug') { g.strokeEllipse(m.x, m.y + 6, m.w * 0.5, m.h * 0.6); g.strokeEllipse(m.x + m.w * 0.28, m.y + 2, m.w * 0.16, m.h * 0.3); }
        else if (m.shape === 'vase') { g.strokeEllipse(m.x, m.y + 12, m.w * 0.42, m.h * 0.46); g.strokeRect(m.x - m.w * 0.08, m.y - m.h * 0.38, m.w * 0.16, m.h * 0.3); }
        else { g.strokeCircle(m.x, m.y - m.h * 0.26, m.h * 0.14); g.strokeEllipse(m.x, m.y + m.h * 0.1, m.w * 0.36, m.h * 0.5); }
        // Slip: rising with the level, pale skin as it sets, cracking dry as it drains.
        const l = level(m, time);
        if (l > 0) {
          const inset = 4 + (1 - l) * 8;
          const c = m.phase === 'setting' ? mixC(SLIP, SLIP_LIT, clamp((time - m.at) / SET_WARN, 0, 1)) : m.phase === 'drain' ? mixC(SLIP_DARK, MARL, 0.3) : mixC(SLIP_DEEP, SLIP, l);
          g.fillStyle(c, 0.5 + l * 0.5); g.fillRoundedRect(x0 + inset, y0 + inset, m.w - inset * 2, m.h - inset * 2, 8);
          g.fillStyle(SLIP_LIT, 0.25 * l); g.fillEllipse(m.x - m.w * 0.18, m.y - m.h * 0.2, m.w * 0.3, 6);
          if (m.phase === 'setting') {
            const k = clamp((time - m.at) / SET_WARN, 0, 1);
            // The skin wrinkling, and a ring closing round the rim as the beat comes.
            for (let i = 0; i < 5; i++) {
              g.lineStyle(1.2, SLIP_DARK, 0.5 * k);
              g.beginPath(); g.arc(m.x + (i - 2) * m.w * 0.16, m.y + ((i * 13) % 20) - 10, 10, Math.PI * 1.1, Math.PI * 1.9, false); g.strokePath();
            }
            g.lineStyle(3, 0xffffff, 0.3 + k * 0.6); g.strokeRoundedRect(x0 - 2, y0 - 2, m.w + 4, m.h + 4, 10);
          }
          if (m.phase === 'fill') {
            // The pour: a thick ribbon falling from the spout and a ring where it lands.
            const px = m.x + m.w * 0.3, py = y0 + m.h * 0.3;
            g.fillStyle(SLIP, 0.9); g.fillRect(px - 4, py - 70, 8, 70);
            g.fillStyle(SLIP_LIT, 0.6); g.fillRect(px - 2, py - 70, 2, 70);
            const ph = (time / 300) % 1;
            g.lineStyle(1.5, SLIP_LIT, 0.6 * (1 - ph)); g.strokeEllipse(px, py, 10 + ph * 26, 4 + ph * 9);
          }
          // Fill gauge on the plaster rim.
          g.fillStyle(SLIP_DARK, 1); g.fillRect(x0, y0 + m.h + 1, m.w * l, 3);
        }
      }
    },

    drawAir(g, time) {
      // The spouts overhead for any mould that is pouring.
      for (const m of moulds) {
        if (m.phase !== 'fill') continue;
        const px = m.x + m.w * 0.3, py = m.y - m.h / 2 + m.h * 0.3 - 70;
        pot(g, px + 10, py + 8, 18, 'jug', lit(MARL, 0.1));
      }
      // Cast shells: a clay figure poured round the fighter, seams and a pour-hole on top.
      for (const [f, c] of casts) {
        if (!alive(f) || time >= c.until) continue;
        const left = clamp((c.until - time) / castMs, 0, 1);
        const wob = Math.sin(time / 40) * (left < 0.25 ? 1.5 : 0);
        g.fillStyle(SLIP_DARK, 0.85); g.fillEllipse(f.x + wob, f.y - 8, 54, 64);
        g.fillStyle(SLIP, 0.9); g.fillEllipse(f.x - 3 + wob, f.y - 10, 46, 58);
        g.fillStyle(SLIP_LIT, 0.5); g.fillEllipse(f.x - 12 + wob, f.y - 24, 10, 20);
        g.lineStyle(1.5, SLIP_DEEP, 0.9); g.lineBetween(f.x + wob, f.y - 40, f.x + wob, f.y + 22);
        g.fillStyle(SLIP_DEEP, 1); g.fillEllipse(f.x + wob, f.y - 40, 10, 4);
        // The hold running down.
        g.lineStyle(2, SLIP_LIT, 0.8); g.beginPath(); g.arc(f.x, f.y - 8, 34, -Math.PI / 2, -Math.PI / 2 + left * Math.PI * 2, false); g.strokePath();
        if (time - c.at < 300) { g.lineStyle(3, 0xffffff, 1 - (time - c.at) / 300); g.strokeEllipse(f.x, f.y - 8, 70, 80); }
      }
    },
  };
}

export const SLIP_CASTING: GimmickDef = {
  id: 'potter-slip-cast',
  rules: 'Floor moulds fill with slip and set on a beat. Whoever stands in one as it sets is cast in clay — held, swinging only — until struck free, and that blow lands hard.',
  make,
};
