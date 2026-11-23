import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import { OBS, slab } from '../../../../../art/PinnacleArt';
import { BRASS, BRASS_DARK, COPPER, COPPER_LIT, SIDE_NPC, SIDE_PLAYER, VOLT, sparks, trefoil } from '../art';
import { type Who, WHO, alive, clamp, dist, other, stepOf } from '../util';

/**
 * DECREE OF CONTAMINATION — Councilor Mirela Becque, Seat of the Halflife (radiation).
 *
 * Becque drafted the clause by which a house switched off three times was *earthed* — and she
 * wrote that the earthed carry their debt with them, the way a hot thing carries its heat. In her
 * room the dose is a thing one fighter holds at a time. Whoever is HOT burns slowly, hits a third
 * harder, and leaves glowing footprints that dose anyone who treads in them. Land a blow on the
 * other and the dose is theirs. Let it build to a hundred and you go CRITICAL: a blast round you
 * that takes the both of you if you are close. Two decontamination showers stand at the walls —
 * stand under one and you scrub it off, and then the cask in the middle vents it onto whoever is
 * nearest.
 *
 * She is a sniper who tags from range; she passes it on the first tracer that bites and keeps
 * you walking in her prints. The turn: the dose is a weapon in your hands too — a third harder —
 * and a CRITICAL next to her takes her with you.
 */

const HOT = 0xd4ff3a;
const HOT_CSS = '#d4ff3a';
const SHOWER_R = 42;
const PRINT_R = 20;
const PRINT_LIFE = 4500;
const CRIT_R = 150;
const CRIT_DMG = 26;

interface Print { x: number; y: number; at: number; a: number }
interface Shower { x: number; y: number; dwell: Record<Who, number>; readyAt: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top } = ctx;
  const MIDY = (top + H) / 2 + 10;
  const DOSE_HOT = ctx.hard ? 8.5 : 7;
  const PASS_LOCK = 1400;
  const VENT_WARN = ctx.tk.warn(1500);
  const cask: Pt = { x: W / 2, y: MIDY };
  const showers: Shower[] = [{ x: 96, y: MIDY }, { x: W - 96, y: MIDY }].map((p) => ({ x: p.x, y: p.y, dwell: { player: 0, npc: 0 }, readyAt: 0 }));

  let hot: Who | null = null;
  let start = -1;
  let passLockUntil = 0;
  let ventAt = -1;
  let internal = false;
  let tickAt = 0;
  const dose: Record<Who, number> = { player: 0, npc: 0 };
  const prints: Print[] = [];
  const lastPrint: Record<Who, Pt> = { player: { x: -999, y: -999 }, npc: { x: -999, y: -999 } };
  const critFx: { x: number; y: number; at: number }[] = [];
  const fighter = (w: Who): Fighter => (w === 'player' ? ctx.player : ctx.npc);

  const zap = (f: Fighter, n: number) => { internal = true; try { ctx.hit(f, n, f.x, f.y); } finally { internal = false; } };

  const makeHot = (w: Who, time: number, why: string) => {
    hot = w;
    passLockUntil = time + PASS_LOCK;
    const f = fighter(w);
    ctx.float(f.x, f.y - 50, why, HOT_CSS);
    ctx.flash(f.x, f.y, HOT);
    ctx.sfx('status-poison');
  };

  const critical = (w: Who, time: number) => {
    const f = fighter(w);
    critFx.push({ x: f.x, y: f.y, at: time });
    ctx.banner('CRITICAL', HOT_CSS);
    ctx.sfx('explosion-large');
    for (const v of WHO) {
      const g = fighter(v);
      if (alive(g) && dist(g.x, g.y, f.x, f.y) <= CRIT_R) zap(g, CRIT_DMG);
    }
    dose[w] = 30;
    if (hot === w) { hot = null; ventAt = time + 2600; }
  };

  const hurt = (w: Who, amount: number) => {
    // A blow from the hot one passes it: the hurt side is the new carrier.
    if (internal || amount < 2 || hot !== other(w)) return;
    const now = ctx.scene.time.now;
    if (now < passLockUntil) return;
    makeHot(w, now, w === 'player' ? 'CONTAMINATED' : 'PASSED TO HER');
  };

  return {
    update(time, dt) {
      const s = stepOf(dt);
      if (start < 0) {
        start = time;
        ventAt = time + 2400;
        ctx.banner('DECREE OF CONTAMINATION — THE DOSE GOES TO WHOEVER IS STRUCK', '#ffe14a');
        return;
      }
      // The cask vents onto whoever stands nearest it.
      if (ventAt > 0 && hot === null && time >= ventAt) {
        ventAt = -1;
        const dp = dist(ctx.player.x, ctx.player.y, cask.x, cask.y), dn = dist(ctx.npc.x, ctx.npc.y, cask.x, cask.y);
        makeHot(dp <= dn ? 'player' : 'npc', time, 'THE CASK VENTS');
        ctx.sfx('smoke');
      }
      const tick = time >= tickAt;
      if (tick) tickAt = time + 600;
      for (const w of WHO) {
        const f = fighter(w);
        if (!alive(f)) continue;
        if (hot === w) {
          dose[w] += DOSE_HOT * s;
          if (tick) zap(f, 2);
          if (dist(f.x, f.y, lastPrint[w].x, lastPrint[w].y) > 38) {
            prints.push({ x: f.x, y: f.y, at: time, a: Math.atan2(f.y - lastPrint[w].y, f.x - lastPrint[w].x) });
            lastPrint[w] = { x: f.x, y: f.y };
          }
        } else {
          const onPrint = prints.some((p) => time - p.at < PRINT_LIFE && dist(f.x, f.y, p.x, p.y) < PRINT_R);
          if (onPrint) { dose[w] += 14 * s; if (tick) zap(f, 2); }
          else dose[w] = Math.max(0, dose[w] - 4 * s);
        }
        // Showers.
        for (const sh of showers) {
          const under = dist(f.x, f.y, sh.x, sh.y) < SHOWER_R;
          if (!under || time < sh.readyAt) { sh.dwell[w] = 0; continue; }
          dose[w] = Math.max(0, dose[w] - 22 * s);
          if (hot === w) {
            sh.dwell[w] += s * 1000;
            if (sh.dwell[w] >= 1200) {
              hot = null;
              dose[w] = Math.max(0, dose[w] - 40);
              sh.readyAt = time + 9000;
              sh.dwell[w] = 0;
              ventAt = time + 4000;
              ctx.float(f.x, f.y - 50, 'DECONTAMINATED', '#d8f4ff');
              ctx.sfx('splash');
            }
          }
        }
        if (dose[w] >= 100) critical(w, time);
      }
      while (prints.length && time - prints[0].at > PRINT_LIFE) prints.shift();
    },
    onPlayerHurt(amount) { hurt('player', amount); },
    onNpcHurt(amount) { hurt('npc', amount); },
    playerTakenMult() { return hot === 'npc' ? 1.3 : 1; },
    npcTakenMult() { return hot === 'player' ? 1.3 : 1; },
    npcSeek(): Pt | null {
      const n = ctx.npc, p = ctx.player;
      const now = ctx.scene.time.now;
      if (hot === 'npc') {
        // Scrub it if it is getting high and a shower is near; else go and pass it.
        if (dose.npc > 62) {
          const sh = showers.filter((x) => now >= x.readyAt).sort((a, b) => dist(n.x, n.y, a.x, a.y) - dist(n.x, n.y, b.x, b.y))[0];
          if (sh && dist(n.x, n.y, sh.x, sh.y) < 420) return { x: sh.x, y: sh.y };
        }
        return { x: p.x, y: p.y };
      }
      // Before a vent, be the one farther from the cask.
      if (hot === null && ventAt > 0 && ventAt - now < VENT_WARN + 800) {
        const a = Math.atan2(n.y - cask.y, n.x - cask.x);
        return { x: clamp(cask.x + Math.cos(a) * 340, 60, W - 60), y: clamp(cask.y + Math.sin(a) * 200, top + 50, H - 50) };
      }
      if (hot === 'player') {
        // Keep range from the carrier, and out of the prints.
        const a = Math.atan2(n.y - p.y, n.x - p.x);
        return { x: clamp(p.x + Math.cos(a) * 360, 70, W - 70), y: clamp(p.y + Math.sin(a) * 360, top + 60, H - 50) };
      }
      return null;
    },
    drawGround(g, time) {
      const t = time / 1000;
      // The cask: a squat lead drum with a trefoil lid, venting when it is about to.
      const venting = hot === null && ventAt > 0 && ventAt - time < VENT_WARN;
      const vk = venting ? clamp(1 - (ventAt - time) / VENT_WARN, 0, 1) : 0;
      if (venting) {
        g.lineStyle(3, HOT, 0.3 + vk * 0.5); g.strokeCircle(cask.x, cask.y, 40 + vk * 300);
        g.fillStyle(HOT, 0.04 + vk * 0.06); g.fillCircle(cask.x, cask.y, 40 + vk * 300);
      }
      g.fillStyle(0x000000, 0.45); g.fillEllipse(cask.x + 4, cask.y + 20, 96, 30);
      g.fillStyle(0x2a2a30, 1); g.fillRect(cask.x - 40, cask.y - 26, 80, 44);
      g.fillStyle(0x44444c, 1); g.fillRect(cask.x - 30, cask.y - 26, 24, 44);
      for (const by of [-16, 0, 12]) { g.fillStyle(0x1a1a20, 1); g.fillRect(cask.x - 41, cask.y + by, 82, 4); }
      g.fillStyle(0x3a3a42, 1); g.fillEllipse(cask.x, cask.y - 26, 80, 24);
      trefoil(g, cask.x, cask.y - 26, 11, venting ? HOT : VOLT, 1);
      g.lineStyle(1, OBS.edge, 0.5); g.strokeEllipse(cask.x, cask.y - 26, 80, 24);
      // Showers: a copper ring of nozzles on a black-glass basin, a valve wheel.
      for (const sh of showers) {
        const ready = time >= sh.readyAt;
        g.fillStyle(OBS.glass, 1); g.fillCircle(sh.x, sh.y, SHOWER_R + 6);
        g.lineStyle(3, COPPER, 1); g.strokeCircle(sh.x, sh.y, SHOWER_R + 6);
        g.lineStyle(1, COPPER_LIT, 0.6); g.strokeCircle(sh.x, sh.y, SHOWER_R + 3);
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2;
          g.fillStyle(BRASS, 1); g.fillCircle(sh.x + Math.cos(a) * (SHOWER_R + 6), sh.y + Math.sin(a) * (SHOWER_R + 6), 3);
        }
        g.lineStyle(1, 0x7ac8f0, 0.35);
        for (let r = 8; r < SHOWER_R; r += 9) g.strokeCircle(sh.x, sh.y, r);
        if (ready) {
          for (let i = 0; i < 14; i++) {
            const ph = ((t * 1.6) + i / 14) % 1;
            const a = i * 2.4;
            g.fillStyle(0xbfe8ff, 0.6 * (1 - ph));
            g.fillEllipse(sh.x + Math.cos(a) * SHOWER_R * ph, sh.y + Math.sin(a) * SHOWER_R * ph, 2, 5);
          }
        } else {
          const k = clamp(1 - (sh.readyAt - time) / 9000, 0, 1);
          g.lineStyle(3, VOLT, 0.6); g.beginPath(); g.arc(sh.x, sh.y, SHOWER_R + 14, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
        }
        const dw = Math.max(sh.dwell.player, sh.dwell.npc);
        if (dw > 0) { g.lineStyle(4, 0xd8f4ff, 0.9); g.beginPath(); g.arc(sh.x, sh.y, SHOWER_R - 4, -Math.PI / 2, -Math.PI / 2 + (dw / 1200) * Math.PI * 2, false); g.strokePath(); }
        slab(g, sh.x + (sh.x < W / 2 ? -54 : 54), sh.y + 30, 18, 70);
        g.fillStyle(BRASS_DARK, 1); g.fillCircle(sh.x + (sh.x < W / 2 ? -54 : 54), sh.y - 28, 9);
        g.lineStyle(2, BRASS, 1); g.strokeCircle(sh.x + (sh.x < W / 2 ? -54 : 54), sh.y - 28, 9);
      }
      // Footprints of the hot: two soles each, glowing and fading.
      for (const p of prints) {
        const k = 1 - (time - p.at) / PRINT_LIFE;
        if (k <= 0) continue;
        g.fillStyle(HOT, 0.08 * k); g.fillCircle(p.x, p.y, PRINT_R);
        const nx = -Math.sin(p.a) * 7, ny = Math.cos(p.a) * 7;
        for (const sgn of [-1, 1]) {
          g.fillStyle(HOT, 0.55 * k);
          g.fillEllipse(p.x + nx * sgn + Math.cos(p.a) * sgn * 4, p.y + ny * sgn + Math.sin(p.a) * sgn * 4, 8, 6);
        }
      }
      // Critical blooms.
      for (let i = critFx.length - 1; i >= 0; i--) {
        const c = critFx[i];
        const k = (time - c.at) / 900;
        if (k >= 1) { critFx.splice(i, 1); continue; }
        g.fillStyle(HOT, 0.3 * (1 - k)); g.fillCircle(c.x, c.y, CRIT_R * (0.4 + k * 0.6));
        g.lineStyle(6, 0xffffff, 1 - k); g.strokeCircle(c.x, c.y, CRIT_R * (0.4 + k * 0.6));
      }
    },
    drawAir(g, time) {
      if (!hot) return;
      const f = fighter(hot);
      if (!alive(f)) return;
      const d = dose[hot] / 100;
      // The carrier: a sick halo and a trefoil badge that blinks faster as the dose climbs.
      g.fillStyle(HOT, 0.1 + d * 0.12); g.fillCircle(f.x, f.y, 36 + d * 16);
      for (let i = 0; i < 6; i++) {
        const a = time / 400 + i;
        const r = 30 + ((time / 9 + i * 20) % 22);
        g.fillStyle(HOT, 0.7); g.fillCircle(f.x + Math.cos(a) * r, f.y + Math.sin(a) * r, 1.6);
      }
      const blink = Math.floor(time / (420 - d * 330)) % 2 === 0;
      trefoil(g, f.x, f.y - 52, 10, blink ? HOT : VOLT, 1);
      if (d > 0.75) sparks(g, f.x, f.y, 30, Math.floor(time / 50), HOT, d - 0.6);
    },
    drawHud(g) {
      const cx = ctx.W / 2, cy = top + 18;
      g.fillStyle(OBS.glass, 0.88); g.fillRoundedRect(cx - 150, cy - 12, 300, 24, 8);
      g.lineStyle(1.5, VOLT, 0.8); g.strokeRoundedRect(cx - 150, cy - 12, 300, 24, 8);
      trefoil(g, cx, cy, 9, hot ? HOT : VOLT, 1);
      const bar = (x: number, w: Who, dir: 1 | -1) => {
        const k = clamp(dose[w] / 100, 0, 1);
        g.fillStyle(0x1a1626, 1); g.fillRect(dir > 0 ? x : x - 120, cy - 5, 120, 10);
        g.fillStyle(hot === w ? HOT : w === 'player' ? SIDE_PLAYER : SIDE_NPC, 1);
        g.fillRect(dir > 0 ? x : x - 120 * k, cy - 5, 120 * k, 10);
        g.lineStyle(1, 0xff6a4a, 0.8); g.lineBetween(dir > 0 ? x + 119 : x - 119, cy - 7, dir > 0 ? x + 119 : x - 119, cy + 7);
      };
      bar(cx - 18, 'player', -1);
      bar(cx + 18, 'npc', 1);
    },
  };
}

export const DECREE_CONTAMINATION: GimmickDef = {
  id: 'bench-electricity-contamination',
  rules: 'One fighter carries the dose: it burns, hits a third harder, leaves hot prints. Strike the other to pass it. At 100 it blows.',
  make,
};
