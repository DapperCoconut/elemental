import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import { dim, glow, lit } from '../../../../../art/IsleArt';
import { auroraCurtain } from '../art';
import { AURORA_CRIMSON, AURORA_GREEN, AURORA_VIOLET, SPARK } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Aurora — Skywatcher Borea.
 *
 * Borea calls the aurora down. Curtains of it come down out of the sky onto the platform and
 * drift across it, and standing in one does something to you — what depends on its colour, and
 * every curtain changes colour on the same slow beat:
 *
 * • **green** wards you (you take much less) — but lights you up, and the sky drops a star on
 *   whoever is lit, every couple of seconds, wherever they stand;
 * • **violet** quickens you — but hums through you and wears you down;
 * • **crimson** makes you fierce — your blows land harder on the other — and you take more too.
 *
 * Every rule works for whoever is inside, so it is a fight over curtains. Read the next colour
 * off the hem (it turns there first) and be standing in the right one when the beat comes.
 */

type Rule = 'ward' | 'quick' | 'fierce';
const RULES: Rule[] = ['ward', 'quick', 'fierce'];
const COLOR: Record<Rule, number> = { ward: AURORA_GREEN, quick: AURORA_VIOLET, fierce: AURORA_CRIMSON };
const NAME: Record<Rule, string> = { ward: 'WARD', quick: 'QUICK', fierce: 'FIERCE' };
const CSS: Record<Rule, string> = { ward: '#4af0a0', quick: '#c8a0ff', fierce: '#ff7aa0' };

const CURTAIN_W = 110;
const DESCEND_MS = 1400;
const LIFE_MS = 15000;
const BEAT_MS = 7000;
const STAR_WARN = 950;
const STAR_R = 54;
const STAR_DMG = 10;

interface Curtain { x: number; vx: number; bornAt: number; offset: number; seed: number }
interface Star { x: number; y: number; at: number; fireAt: number; done: boolean }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng, tk } = ctx;
  const curtains: Curtain[] = [];
  const stars: Star[] = [];
  let beat = 0;
  let beatAt = 0;
  let nextCurtain = 0;
  let started = false;
  const lastStar = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  const lastHum = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  const maxCurtains = ctx.hard ? 4 : 3;

  const rule = (c: Curtain, b = beat): Rule => RULES[(b + c.offset) % 3];
  const landed = (c: Curtain, time: number) => time - c.bornAt > DESCEND_MS;
  /** The rule of the curtain a fighter stands in, if any. */
  const inside = (f: Fighter): Rule | null => {
    if (!alive(f)) return null;
    const time = ctx.scene.time.now;
    for (const c of curtains) if (landed(c, time) && Math.abs(f.x - c.x) < CURTAIN_W / 2) return rule(c);
    return null;
  };
  const hurt = (f: Fighter, amount: number, x: number, y: number) => { if (f === player) tk.hitPlayer(amount, x, y); else ctx.hit(f, amount, x, y); };

  function spawn(time: number): void {
    let x = 0;
    for (let i = 0; i < 10; i++) {
      x = 90 + rng() * (W - 180);
      if (!curtains.some((c) => Math.abs(c.x - x) < CURTAIN_W * 1.2)) break;
    }
    curtains.push({ x, vx: (rng() < 0.5 ? -1 : 1) * (18 + rng() * 16), bornAt: time, offset: Math.floor(rng() * 3), seed: rng() * 10 });
    ctx.sfx('sparkle');
  }

  const taken = (f: Fighter): number => {
    const mine = inside(f);
    const other = inside(f === player ? npc : player);
    let m = 1;
    if (mine === 'ward') m *= 0.6;
    if (mine === 'fierce') m *= 1.2;
    if (other === 'fierce') m *= 1.3;
    return m;
  };

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) {
        started = true;
        beatAt = time;
        nextCurtain = time + 3800;
        spawn(time); curtains[0].x = W * 0.32; curtains[0].offset = 0;
        spawn(time); curtains[1].x = W * 0.68; curtains[1].offset = 2;
      }
      if (time - beatAt > BEAT_MS) {
        beatAt = time;
        beat++;
        ctx.banner('THE AURORA SHIFTS', '#a8ffe0');
        ctx.sfx('holy-chord');
        for (const c of curtains) if (landed(c, time)) ctx.float(c.x, H - 70, NAME[rule(c)], CSS[rule(c)]);
      }
      if (time >= nextCurtain) {
        nextCurtain = time + (ctx.hard ? 3600 : 4600);
        if (curtains.length < maxCurtains) spawn(time);
      }
      for (let i = curtains.length - 1; i >= 0; i--) {
        const c = curtains[i];
        if (time - c.bornAt > LIFE_MS) { curtains.splice(i, 1); continue; }
        if (!landed(c, time)) continue;
        c.x += c.vx * dt;
        if (c.x < CURTAIN_W / 2 + 20 || c.x > W - CURTAIN_W / 2 - 20) { c.vx = -c.vx; c.x = clamp(c.x, CURTAIN_W / 2 + 20, W - CURTAIN_W / 2 - 20); }
      }

      for (const f of [player, npc]) {
        const r = inside(f);
        if (!r) continue;
        // Lit by the ward: the sky drops a star on you.
        if (r === 'ward' && time - (lastStar.get(f) ?? 0) > (ctx.hard ? 1700 : 2100)) {
          lastStar.set(f, time);
          stars.push({ x: f.x, y: f.y, at: time, fireAt: time + tk.warn(STAR_WARN), done: false });
          ctx.sfx('light-beam');
        }
        // The violet hum.
        if (r === 'quick' && time - (lastHum.get(f) ?? 0) > 500) {
          lastHum.set(f, time);
          hurt(f, 2, f.x, f.y);
        }
      }
      for (const s of stars) {
        if (s.done || time < s.fireAt) continue;
        s.done = true;
        ctx.sfx('crystal-shatter');
        for (const f of [player, npc]) {
          if (alive(f) && dist(s.x, s.y, f.x, f.y) < STAR_R + 16) { hurt(f, STAR_DMG, s.x, s.y); ctx.float(f.x, f.y - 44, 'STARFALL', '#fff4c0'); }
        }
      }
      for (let i = stars.length - 1; i >= 0; i--) if (stars[i].done && time > stars[i].fireAt + 500) stars.splice(i, 1);
    },

    playerSpeedMult: () => (inside(player) === 'quick' ? 1.35 : 1),
    npcSpeedMult: () => (inside(npc) === 'quick' ? 1.35 : 1),
    playerTakenMult: () => taken(player),
    npcTakenMult: () => taken(npc),

    npcSeek() {
      if (!alive(npc) || !alive(player)) return null;
      const time = ctx.scene.time.now;
      const live = curtains.filter((c) => landed(c, time));
      // Dodge a star he is standing under first.
      const under = stars.find((s) => !s.done && dist(s.x, s.y, npc.x, npc.y) < STAR_R + 20);
      if (under) return { x: clamp(npc.x + (npc.x < W / 2 ? 140 : -140), 60, W - 60), y: clamp(npc.y + 90, top + 50, H - 40) };
      const pick = (r: Rule): Curtain | null => live.filter((c) => rule(c) === r).sort((a, b) => Math.abs(a.x - npc.x) - Math.abs(b.x - npc.x))[0] ?? null;
      const hpLow = npc.hp < npc.maxHp * 0.5;
      const close = dist(player.x, player.y, npc.x, npc.y) < 300;
      const c = (hpLow ? pick('ward') : null) ?? (close ? pick('fierce') : null) ?? (!close ? pick('quick') : null) ?? pick('ward');
      if (!c) return null;
      return { x: c.x, y: clamp(player.y + (npc.y < player.y ? -60 : 60), top + 50, H - 40) };
    },

    drawGround(g, time) {
      for (const c of curtains) {
        const k = clamp((time - c.bornAt) / DESCEND_MS, 0, 1);
        const col = COLOR[rule(c)];
        // The pool of light where the curtain stands on the floor.
        g.fillStyle(col, 0.06 + k * 0.08); g.fillRect(c.x - CURTAIN_W / 2, top, CURTAIN_W, H - top);
        if (k >= 1) {
          g.lineStyle(2, lit(col, 0.3), 0.45); g.lineBetween(c.x - CURTAIN_W / 2, top, c.x - CURTAIN_W / 2, H);
          g.lineBetween(c.x + CURTAIN_W / 2, top, c.x + CURTAIN_W / 2, H);
        }
        // The rule's glyph on the floor at its foot.
        const gx = c.x, gy = H - 34;
        g.fillStyle(dim(col, 0.5), 0.8); g.fillCircle(gx, gy, 14);
        g.lineStyle(2, lit(col, 0.4), 1);
        const r = rule(c);
        if (r === 'ward') { g.strokeTriangle(gx - 7, gy - 7, gx + 7, gy - 7, gx, gy + 8); g.lineBetween(gx - 7, gy - 7, gx + 7, gy - 7); }
        else if (r === 'quick') { for (const o of [-4, 3]) { g.lineBetween(gx + o - 3, gy - 6, gx + o + 3, gy); g.lineBetween(gx + o + 3, gy, gx + o - 3, gy + 6); } }
        else { g.lineBetween(gx - 6, gy - 6, gx + 6, gy + 6); g.lineBetween(gx + 6, gy - 6, gx - 6, gy + 6); }
        // The next colour, turning at the hem a second before the beat.
        const toBeat = BEAT_MS - (time - beatAt);
        if (toBeat < 1600 && k >= 1) {
          const nc = COLOR[rule(c, beat + 1)];
          g.fillStyle(nc, 0.3 * (1 - toBeat / 1600)); g.fillRect(c.x - CURTAIN_W / 2, H - 70, CURTAIN_W, 70);
        }
      }
      // Stars about to fall: a shrinking clock of light.
      for (const s of stars) {
        if (s.done) continue;
        const k = clamp((time - s.at) / Math.max(1, s.fireAt - s.at), 0, 1);
        g.fillStyle(0xfff4c0, 0.1 + k * 0.15); g.fillCircle(s.x, s.y, STAR_R);
        g.lineStyle(2, 0xfff4c0, 0.6); g.strokeCircle(s.x, s.y, STAR_R);
        g.lineStyle(3, 0xffffff, 0.8);
        g.beginPath(); g.arc(s.x, s.y, STAR_R - 6, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
      }
    },

    drawAir(g, time) {
      for (const c of curtains) {
        const k = clamp((time - c.bornAt) / DESCEND_MS, 0, 1);
        const fade = clamp((LIFE_MS - (time - c.bornAt)) / 1000, 0, 1);
        auroraCurtain(g, c.x, 0, top + (H - top) * k, CURTAIN_W, COLOR[rule(c)], time + c.seed * 1000, 0.75 * fade);
      }
      // The stars coming down.
      for (const s of stars) {
        if (s.done) {
          const k = clamp((time - s.fireAt) / 500, 0, 1);
          g.lineStyle(8 * (1 - k), 0xffffff, 1 - k); g.lineBetween(s.x, 0, s.x, s.y);
          g.lineStyle(4 * (1 - k), 0xfff4c0, 1 - k); g.strokeCircle(s.x, s.y, STAR_R * (0.6 + k * 0.6));
          continue;
        }
        const k = clamp((time - s.at) / Math.max(1, s.fireAt - s.at), 0, 1);
        const sy = top - 40 + (s.y - top + 40) * k * k;
        glow(g, s.x, sy, 18, 0xfff4c0, 0.1, 2);
        for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + time / 200; g.lineStyle(2, 0xffffff, 0.9); g.lineBetween(s.x, sy, s.x + Math.cos(a) * 9, sy + Math.sin(a) * 9); }
      }
      // The lit: a halo on whoever stands in green.
      for (const f of [player, npc]) {
        const r = inside(f);
        if (!r) continue;
        const col = COLOR[r];
        g.lineStyle(2, lit(col, 0.4), 0.6 + Math.sin(time / 120) * 0.2); g.strokeEllipse(f.x, f.y - 46, 30, 8);
        if (r === 'ward') { g.lineStyle(1.5, SPARK, 0.4); g.strokeCircle(f.x, f.y, 26); }
        if (r === 'quick') for (let i = 0; i < 3; i++) { const ph = ((time / 300) + i / 3) % 1; g.lineStyle(1.5, col, 1 - ph); g.lineBetween(f.x - 18, f.y - 10 + ph * 30, f.x - 30, f.y - 10 + ph * 30); }
        if (r === 'fierce') { g.fillStyle(col, 0.25); g.fillCircle(f.x, f.y, 24 + Math.sin(time / 90) * 3); }
      }
    },

    drawHud(g, time) {
      // The beat: a thin bar across the top of the arena that runs out as the colours turn.
      const k = clamp((time - beatAt) / BEAT_MS, 0, 1);
      const w = 260, x0 = W / 2 - w / 2, y = top + 8;
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x0 - 3, y - 3, w + 6, 12, 5);
      const cols = [AURORA_GREEN, AURORA_VIOLET, AURORA_CRIMSON];
      for (let i = 0; i < 3; i++) { g.fillStyle(cols[(beat + i) % 3], 0.35); g.fillRect(x0 + (w / 3) * i, y, w / 3, 6); }
      g.fillStyle(0xffffff, 0.9); g.fillRect(x0 + w * k - 1, y - 2, 3, 10);
    },
  };
}

export const AURORA: GimmickDef = {
  id: 'lodestar-aurora',
  rules: 'Aurora curtains come down and drift. Green wards you but lights you for starfall; violet quickens you but hums; crimson makes your blows fierce, and theirs. Colours turn on a beat.',
  make,
};

