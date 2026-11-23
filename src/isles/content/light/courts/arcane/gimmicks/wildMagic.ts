import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import { glow, lit, type G } from '../../../../../art/IsleArt';
import { wardBubble } from '../art';
import { CHALK } from '../palette';
import { alive, asSlot, clamp, dist, slotOf, stepDt } from '../util';

/**
 * Wild Magic — Surge-Mage Fizzle.
 *
 * Fizzle's experiments have left the yard *wild*: every cast either fighter makes may surge. A
 * coloured spark circles each of you, showing which surge is coming next, and it changes every
 * couple of seconds:
 *
 * • **violet — blink**: the caster is flung to somewhere else on the flags;
 * • **gold — ward**: a ward bubble sprouts round the caster, and blows mostly glance off it;
 * • **red — bolt**: a bolt of raw magic shoots off in a random direction (it can only hit the
 *   other fighter);
 * • **green — refresh**: the spell comes straight back off cooldown.
 *
 * The weave strains with every cast that does not surge (the ring at your feet fills), so a surge
 * is never far off. Watch your spark and cast on green and gold. Motes of raw magic fall now and
 * then: pick one up and your very next cast surges for certain — with whatever your spark shows.
 */

type Surge = 'blink' | 'ward' | 'bolt' | 'refresh';
const SURGES: Surge[] = ['blink', 'ward', 'bolt', 'refresh'];
const COLOR: Record<Surge, number> = { blink: 0xa878f8, ward: 0xf0c850, bolt: 0xff5a4a, refresh: 0x6ae88a };
const NAME: Record<Surge, string> = { blink: 'BLINK', ward: 'WARD', bolt: 'BOLT', refresh: 'REFRESH' };

const BASE = 0.3;
const STRAIN = 0.15;
const REROLL_MS = 2600;
const WARD_MS = 2400;

interface Weave {
  next: Surge;
  rerollAt: number;
  chance: number;
  charged: boolean;
  wardUntil: number;
  burstAt: number;
  burst: Surge;
  /** Where a blink came from, for the streak. */
  fromX: number; fromY: number;
}

interface Mote { x: number; y: number; landAt: number; dieAt: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng, tk } = ctx;
  const weaves = new Map<Fighter, Weave>();
  for (const f of [player, npc]) {
    weaves.set(f, { next: SURGES[Math.floor(rng() * 4)], rerollAt: 0, chance: BASE, charged: false, wardUntil: 0, burstAt: -9999, burst: 'ward', fromX: 0, fromY: 0 });
  }
  const motes: Mote[] = [];
  let nextMote = 0;
  let started = false;
  const now = () => ctx.scene.time.now;

  function reroll(w: Weave, time: number, avoid?: Surge): void {
    const pool = SURGES.filter((s) => s !== avoid);
    w.next = pool[Math.floor(rng() * pool.length)];
    w.rerollAt = time + REROLL_MS + rng() * 600;
  }

  function surge(f: Fighter, abilityId: string, slot: string | null): void {
    const w = weaves.get(f);
    if (!w || !alive(f)) return;
    const time = now();
    const roll = w.charged || rng() < w.chance;
    if (!roll) { w.chance = Math.min(0.9, w.chance + STRAIN); return; }
    w.charged = false;
    w.chance = BASE;
    let kind = w.next;
    // A refreshed ultimate would be a free ultimate: Q surges as a ward instead.
    if (kind === 'refresh' && slot === 'q') kind = 'ward';
    const other = f === player ? npc : player;
    w.burstAt = time; w.burst = kind;
    ctx.float(f.x, f.y - 54, `SURGE: ${NAME[kind]}`, `#${COLOR[kind].toString(16).padStart(6, '0')}`);
    switch (kind) {
      case 'blink': {
        w.fromX = f.x; w.fromY = f.y;
        let tx = f.x, ty = f.y;
        for (let i = 0; i < 8; i++) {
          tx = 80 + rng() * (W - 160); ty = top + 60 + rng() * (H - top - 110);
          if (dist(tx, ty, f.x, f.y) > 200) break;
        }
        ctx.nudge(f, tx - f.x, ty - f.y);
        ctx.sfx('blink');
        break;
      }
      case 'ward':
        w.wardUntil = time + WARD_MS;
        ctx.sfx('crystal-chime');
        break;
      case 'bolt': {
        const a = rng() * Math.PI * 2;
        tk.spawnBullet({ x: f.x + Math.cos(a) * 30, y: f.y + Math.sin(a) * 30, angle: a, speed: 330, damage: 12, r: 8, lifeMs: 3000, color: COLOR.bolt, hits: [other] });
        // A second, aimed the other way, on hard.
        if (ctx.hard) tk.spawnBullet({ x: f.x - Math.cos(a) * 30, y: f.y - Math.sin(a) * 30, angle: a + Math.PI, speed: 330, damage: 10, r: 7, lifeMs: 3000, color: COLOR.bolt, hits: [other] });
        ctx.sfx('zap');
        break;
      }
      case 'refresh':
        f.reduceCooldown(abilityId, 60000);
        ctx.sfx('time-warp');
        break;
    }
    reroll(w, time, kind);
  }

  /** The icon for each surge, drawn small inside its spark. */
  function icon(g: G, s: Surge, x: number, y: number, r: number, a = 1): void {
    g.lineStyle(1.6, 0xffffff, a);
    if (s === 'blink') {
      g.beginPath(); g.arc(x, y, r * 0.6, 0.4, Math.PI * 1.6, false); g.strokePath();
      g.lineBetween(x + r * 0.2, y - r * 0.6, x + r * 0.7, y - r * 0.2);
    } else if (s === 'ward') {
      for (let k = 0; k < 6; k++) { const a1 = (k / 6) * Math.PI * 2, a2 = ((k + 1) / 6) * Math.PI * 2; g.lineBetween(x + Math.cos(a1) * r * 0.65, y + Math.sin(a1) * r * 0.65, x + Math.cos(a2) * r * 0.65, y + Math.sin(a2) * r * 0.65); }
    } else if (s === 'bolt') {
      g.lineBetween(x - r * 0.2, y - r * 0.7, x + r * 0.25, y - r * 0.05); g.lineBetween(x + r * 0.25, y - r * 0.05, x - r * 0.25, y + r * 0.05); g.lineBetween(x - r * 0.25, y + r * 0.05, x + r * 0.2, y + r * 0.7);
    } else {
      g.beginPath(); g.arc(x, y, r * 0.6, -Math.PI * 0.3, Math.PI * 1.4, false); g.strokePath();
      g.lineBetween(x + r * 0.35, y - r * 0.5, x + r * 0.55, y - r * 0.1);
      g.lineBetween(x + r * 0.35, y - r * 0.5, x + r * 0.75, y - r * 0.55);
    }
  }

  return {
    update(time, dtRaw) {
      stepDt(dtRaw);
      if (!started) {
        started = true;
        for (const w of weaves.values()) w.rerollAt = time + REROLL_MS;
        nextMote = time + 3500;
      }
      for (const w of weaves.values()) if (time >= w.rerollAt) reroll(w, time, w.next);
      // Motes of raw magic.
      if (time >= nextMote) {
        nextMote = time + (ctx.hard ? 6000 : 7200);
        if (motes.length < 2) {
          const x = 120 + rng() * (W - 240), y = top + 90 + rng() * (H - top - 160);
          motes.push({ x, y, landAt: time + 800, dieAt: time + 9800 });
          ctx.sfx('sparkle');
        }
      }
      for (let i = motes.length - 1; i >= 0; i--) {
        const m = motes[i];
        if (time > m.dieAt) { motes.splice(i, 1); continue; }
        if (time < m.landAt) continue;
        for (const f of [player, npc]) {
          const w = weaves.get(f);
          if (!w || !alive(f) || w.charged || dist(f.x, f.y, m.x, m.y) > 34) continue;
          w.charged = true;
          ctx.float(f.x, f.y - 52, 'CHARGED', '#f0e6ff');
          ctx.sfx('electric-charge');
          motes.splice(i, 1);
          break;
        }
      }
    },

    onPlayerCast(abilityId, slot) { surge(player, abilityId, asSlot(slot) ?? slotOf(player, abilityId)); },
    onNpcCast(abilityId) { surge(npc, abilityId, slotOf(npc, abilityId)); },

    playerTakenMult() { return now() < (weaves.get(player)?.wardUntil ?? 0) ? 0.45 : 1; },
    npcTakenMult() { return now() < (weaves.get(npc)?.wardUntil ?? 0) ? 0.45 : 1; },

    npcSeek() {
      const t = now();
      const w = weaves.get(npc);
      if (!w || w.charged) return null;
      const live = motes.filter((m) => t >= m.landAt - 300);
      if (!live.length) return null;
      live.sort((a, b) => dist(a.x, a.y, npc.x, npc.y) - dist(b.x, b.y, npc.x, npc.y));
      return { x: live[0].x, y: live[0].y };
    },

    drawGround(g, time) {
      // The strain ring at each fighter's feet: how close a surge is.
      for (const f of [player, npc]) {
        const w = weaves.get(f);
        if (!w || !alive(f)) continue;
        const k = w.charged ? 1 : (w.chance - BASE) / (0.9 - BASE);
        g.lineStyle(1.2, COLOR[w.next], 0.3); g.strokeEllipse(f.x, f.y + 10, 56, 20);
        g.lineStyle(3, COLOR[w.next], 0.35 + k * 0.5);
        g.beginPath(); g.arc(f.x, f.y + 10, 28, -Math.PI / 2, -Math.PI / 2 + Math.max(0.15, k) * Math.PI * 2, false); g.strokePath();
        // A blink's streak along the flags.
        const bk = (time - w.burstAt) / 500;
        if (w.burst === 'blink' && bk >= 0 && bk < 1) {
          g.lineStyle(10 * (1 - bk), COLOR.blink, 0.4 * (1 - bk)); g.lineBetween(w.fromX, w.fromY, f.x, f.y);
          g.lineStyle(2, 0xffffff, 0.6 * (1 - bk)); g.lineBetween(w.fromX, w.fromY, f.x, f.y);
        }
      }
      // Mote landing marks.
      for (const m of motes) {
        const k = clamp((m.landAt - time) / 800, 0, 1);
        g.lineStyle(1.5, CHALK, 0.6); g.strokeCircle(m.x, m.y, 14 + k * 30);
        g.fillStyle(0xf0e6ff, 0.12); g.fillCircle(m.x, m.y, 18);
      }
    },

    drawAir(g, time) {
      for (const f of [player, npc]) {
        const w = weaves.get(f);
        if (!w || !alive(f)) continue;
        // The spark orbiting, flickering as it is about to change.
        const a = time / 380 + (f === npc ? Math.PI : 0);
        const sx = f.x + Math.cos(a) * 30, sy = f.y - 30 + Math.sin(a) * 10;
        const flick = w.rerollAt - time < 500 && Math.floor(time / 70) % 2 === 0;
        const c = COLOR[w.next];
        glow(g, sx, sy, 16, c, w.charged ? 0.14 : 0.07, 3);
        g.fillStyle(flick ? 0xffffff : c, 0.95); g.fillCircle(sx, sy, w.charged ? 9 : 7.5);
        g.lineStyle(1, lit(c, 0.5), 0.9); g.strokeCircle(sx, sy, w.charged ? 11 : 9);
        icon(g, w.next, sx, sy, 7);
        for (let i = 0; i < 3; i++) {
          const ta = a - 0.18 * (i + 1);
          g.fillStyle(c, 0.5 - i * 0.15); g.fillCircle(f.x + Math.cos(ta) * 30, f.y - 30 + Math.sin(ta) * 10, 3 - i * 0.7);
        }
        // Ward bubble.
        if (time < w.wardUntil) wardBubble(g, f.x, f.y - 8, 34, COLOR.ward, clamp((w.wardUntil - time) / 400, 0, 1), time);
        // Surge burst.
        const bk = (time - w.burstAt) / 450;
        if (bk >= 0 && bk < 1) {
          const bc = COLOR[w.burst];
          for (let i = 0; i < 12; i++) {
            const ra = (i / 12) * Math.PI * 2 + i * 0.3;
            g.lineStyle(2.5 * (1 - bk), bc, 1 - bk);
            g.lineBetween(f.x + Math.cos(ra) * (10 + bk * 30), f.y - 10 + Math.sin(ra) * (10 + bk * 30), f.x + Math.cos(ra) * (18 + bk * 50), f.y - 10 + Math.sin(ra) * (18 + bk * 50));
          }
        }
      }
      // Falling and lying motes: a fizzing star.
      for (const m of motes) {
        const fall = clamp((m.landAt - time) / 800, 0, 1);
        const y = m.y - fall * 220;
        const tw = 0.6 + Math.sin(time / 60 + m.x) * 0.4;
        glow(g, m.x, y - 8, 18, 0xf0e6ff, 0.08, 3);
        for (let i = 0; i < 4; i++) {
          const ra = time / 300 + i * Math.PI / 2;
          g.lineStyle(1.5, SURGES.map((s) => COLOR[s])[i], tw);
          g.lineBetween(m.x, y - 8, m.x + Math.cos(ra) * 12, y - 8 + Math.sin(ra) * 12);
        }
        g.fillStyle(0xffffff, 1); g.fillCircle(m.x, y - 8, 4);
      }
    },

    drawHud(g) {
      for (const [f, x] of [[player, 34], [npc, W - 34]] as [Fighter, number][]) {
        const w = weaves.get(f);
        if (!w) continue;
        const y = top + 24;
        const c = COLOR[w.next];
        g.fillStyle(0x000000, 0.5); g.fillCircle(x, y, 18);
        g.fillStyle(c, 0.9); g.fillCircle(x, y, 12);
        icon(g, w.next, x, y, 10);
        const k = w.charged ? 1 : w.chance;
        g.lineStyle(3, c, 0.85); g.beginPath(); g.arc(x, y, 17, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
      }
    },
  };
}

export const WILD_MAGIC: GimmickDef = {
  id: 'arcane-wild-magic',
  rules: 'Every cast may surge — blink, ward, bolt or refresh — and the spark circling you shows which. Cast on a good spark; grab a mote to surge for sure.',
  make,
};
