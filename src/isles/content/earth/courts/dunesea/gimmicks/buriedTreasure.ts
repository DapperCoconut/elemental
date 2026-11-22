import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { glow } from '../../../../../art/IsleArt';
import { scorpion, urn } from '../art';
import { BRASS, BRASS_LIT, SAND, SAND_DARK, SAND_DEEP, SAND_LIT, SAND_PALE, TILE, VENOM } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Buried Treasure — Digger Petra.
 *
 * Mounds heave up out of the sand. Stand on one and you dig it out: an *urn* — gold (your blows
 * land harder for a while), balm (you heal), or a fortune in old coin flung at the other fighter —
 * or a *scorpion nest*, which boils out three scorpions that hunt whoever is nearest. Every few
 * seconds the wind sweeps across the floor and buries the rest again: half-dug mounds lose their
 * progress, and undug ones may be gone.
 *
 * Petra has a digger's luck: she walks to the urns. A clever player learns her tells — an urn's
 * mound catches the sun now and then; a nest's has little holes and a claw that pokes out — and
 * digs nests where Petra is standing.
 */

type Kind = 'gold' | 'balm' | 'coins' | 'nest';
const DIG_MS = 1300;
const MOUND_R = 30;
const RISE_MS = 800;
const GOLD_MS = 6000;

interface Mound { x: number; y: number; kind: Kind; bornAt: number; dig: Map<Fighter, number>; seed: number }
interface Scorp { x: number; y: number; a: number; dieAt: number; stings: number; lastSting: number }
interface Coin { x: number; y: number; vx: number; vy: number; to: Fighter; dieAt: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const mounds: Mound[] = [];
  const scorps: Scorp[] = [];
  const coins: Coin[] = [];
  const goldUntil = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  const max = ctx.hard ? 5 : 4;
  const windEvery = ctx.hard ? 6200 : 7400;
  const WIND_WARN = 1000;
  let nextWind = 0;
  let windAt = -1;
  let windDir: 1 | -1 = 1;
  let windX = -1;
  let nextMound = 0;
  let started = false;
  const pushed = new Set<Fighter>();

  const other = (f: Fighter) => (f === player ? npc : player);
  const ready = (m: Mound, time: number) => time - m.bornAt > RISE_MS;

  function raise(time: number): void {
    for (let i = 0; i < 12; i++) {
      const p = { x: 90 + rng() * (W - 180), y: top + 70 + rng() * (H - top - 120) };
      if (mounds.some((m) => dist(m.x, m.y, p.x, p.y) < 110)) continue;
      const r = rng();
      const kind: Kind = r < 0.36 ? 'nest' : r < 0.6 ? 'gold' : r < 0.82 ? 'balm' : 'coins';
      mounds.push({ x: p.x, y: p.y, kind, bornAt: time, dig: new Map(), seed: rng() * 10 });
      return;
    }
  }

  function open(m: Mound, by: Fighter, time: number): void {
    mounds.splice(mounds.indexOf(m), 1);
    ctx.sfx(m.kind === 'nest' ? 'trap-snap' : 'jackpot');
    switch (m.kind) {
      case 'gold':
        goldUntil.set(by, time + GOLD_MS);
        ctx.float(m.x, m.y - 40, 'GOLDEN URN', '#f4d68a');
        break;
      case 'balm':
        ctx.heal(by, ctx.hard ? 14 : 16);
        ctx.float(m.x, m.y - 40, 'BALM', '#9ae0d8');
        break;
      case 'coins': {
        const foe = other(by);
        for (let i = 0; i < 7; i++) {
          const a = Math.atan2(foe.y - m.y, foe.x - m.x) + (i - 3) * 0.16;
          coins.push({ x: m.x, y: m.y - 10, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300, to: foe, dieAt: time + 1400 });
        }
        ctx.float(m.x, m.y - 40, 'A FORTUNE', '#f4d68a');
        break;
      }
      case 'nest':
        for (let i = 0; i < 3; i++) scorps.push({ x: m.x + (i - 1) * 12, y: m.y, a: rng() * Math.PI * 2, dieAt: time + 7000, stings: 0, lastSting: 0 });
        ctx.float(m.x, m.y - 40, 'SCORPIONS!', '#e8b030');
        break;
    }
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; raise(time); raise(time); nextMound = time + 1500; nextWind = time + windEvery; }
      if (time >= nextMound) { nextMound = time + 1700; if (mounds.length < max) raise(time); }

      // Digging.
      for (const m of [...mounds]) {
        if (!ready(m, time)) continue;
        for (const f of [player, npc]) {
          if (!alive(f)) continue;
          const on = dist(f.x, f.y + 8, m.x, m.y) < MOUND_R;
          const v = m.dig.get(f) ?? 0;
          const nv = on ? v + (dt * 1000) / DIG_MS : Math.max(0, v - dt * 0.25);
          m.dig.set(f, nv);
          if (nv >= 1 && mounds.includes(m)) { open(m, f, time); break; }
        }
      }

      // The wind: a front sweeping the floor, re-burying what it passes.
      if (windAt < 0 && time >= nextWind - WIND_WARN) {
        windAt = time;
        windDir = rng() < 0.5 ? 1 : -1;
        windX = -1;
        pushed.clear();
        ctx.banner('THE WIND BURIES IT AGAIN', '#f2d496');
        ctx.sfx('gust');
      }
      if (windAt >= 0 && time >= nextWind) {
        if (windX < 0) windX = windDir > 0 ? 0 : W;
        const prev = windX;
        windX += windDir * 620 * dt;
        for (let i = mounds.length - 1; i >= 0; i--) {
          const m = mounds[i];
          if ((m.x - prev) * windDir >= 0 && (m.x - windX) * windDir < 0) {
            m.dig.clear();
            if (rng() < 0.5) mounds.splice(i, 1);
          }
        }
        for (const f of [player, npc]) {
          if (!alive(f) || pushed.has(f)) continue;
          if ((f.x - prev) * windDir >= 0 && (f.x - windX) * windDir < 0) { pushed.add(f); ctx.nudge(f, windDir * 50, 0); }
        }
        if (windX < -40 || windX > W + 40) { windAt = -1; nextWind = time + windEvery; }
      }

      // Scorpions hunt the nearest.
      for (let i = scorps.length - 1; i >= 0; i--) {
        const s = scorps[i];
        const tgt = [player, npc].filter(alive).sort((a, b) => dist(a.x, a.y, s.x, s.y) - dist(b.x, b.y, s.x, s.y))[0];
        if (tgt) {
          const want = Math.atan2(tgt.y - s.y, tgt.x - s.x);
          s.a += clamp(Math.atan2(Math.sin(want - s.a), Math.cos(want - s.a)), -5 * dt, 5 * dt);
          const sp = ctx.hard ? 132 : 116;
          s.x += Math.cos(s.a) * sp * dt; s.y += Math.sin(s.a) * sp * dt;
          if (dist(s.x, s.y, tgt.x, tgt.y + 8) < 24 && time - s.lastSting > 700) {
            s.lastSting = time; s.stings++;
            ctx.hit(tgt, ctx.hard ? 7 : 6, tgt.x, tgt.y);
            ctx.sfx('stab');
          }
        }
        if (time > s.dieAt || s.stings >= 2) scorps.splice(i, 1);
      }

      for (let i = coins.length - 1; i >= 0; i--) {
        const c = coins[i];
        c.x += c.vx * dt; c.y += c.vy * dt;
        if (alive(c.to) && dist(c.x, c.y, c.to.x, c.to.y) < 26) { ctx.hit(c.to, 3, c.x, c.y); coins.splice(i, 1); continue; }
        if (time > c.dieAt) coins.splice(i, 1);
      }
    },

    playerTakenMult() { return ctx.scene.time.now < (goldUntil.get(npc) ?? 0) ? 1.35 : 1; },
    npcTakenMult() { return ctx.scene.time.now < (goldUntil.get(player) ?? 0) ? 1.35 : 1; },

    npcSeek() {
      const now = ctx.scene.time.now;
      // Run from scorpions on her heels.
      const s = scorps.find((q) => dist(q.x, q.y, npc.x, npc.y) < 90);
      if (s) return { x: clamp(npc.x + (npc.x - s.x) * 2, 60, W - 60), y: clamp(npc.y + (npc.y - s.y) * 2, top + 50, H - 40) };
      // A digger's luck: straight to an urn.
      let best: Mound | null = null;
      for (const m of mounds) if (m.kind !== 'nest' && ready(m, now) && (!best || dist(m.x, m.y, npc.x, npc.y) < dist(best.x, best.y, npc.x, npc.y))) best = m;
      if (best) return { x: best.x, y: best.y - 8 };
      const a = Math.atan2(npc.y - player.y, npc.x - player.x);
      const p: Pt = { x: player.x + Math.cos(a) * 200, y: player.y + Math.sin(a) * 160 };
      return { x: clamp(p.x, 60, W - 60), y: clamp(p.y, top + 50, H - 40) };
    },

    drawGround(g, time) {
      for (const m of mounds) {
        const k = clamp((time - m.bornAt) / RISE_MS, 0, 1);
        // The mound heaving up.
        g.fillStyle(SAND_DEEP, 0.5 * k); g.fillEllipse(m.x + 4, m.y + 6, 62 * k + 10, 22 * k + 4);
        g.fillStyle(SAND_DARK, 1); g.fillEllipse(m.x, m.y, 58 * k + 8, 26 * k + 4);
        g.fillStyle(SAND, 1); g.fillEllipse(m.x - 2, m.y - 4 * k, 48 * k + 6, 20 * k + 3);
        g.fillStyle(SAND_LIT, 0.9); g.fillEllipse(m.x - 8, m.y - 8 * k, 22 * k, 7 * k);
        if (k < 1) continue;
        if (m.kind === 'nest') {
          // Holes, and now and then a claw.
          for (let i = 0; i < 4; i++) { g.fillStyle(0x2a1a10, 0.8); g.fillCircle(m.x - 14 + i * 9, m.y - 2 + (i % 2) * 5, 2); }
          if (Math.sin(time / 600 + m.seed * 3) > 0.7) {
            const cx = m.x + 6, cy = m.y - 4;
            g.lineStyle(2, 0x2a1a14, 1); g.lineBetween(cx, cy, cx + 5, cy - 6);
            g.fillStyle(0x2a1a14, 1); g.fillCircle(cx + 6, cy - 7, 2.6);
          }
        } else {
          // The rim of a sealed jar just showing.
          g.fillStyle(m.kind === 'balm' ? TILE : 0xb8643a, 0.8); g.fillEllipse(m.x + 4, m.y - 6, 12, 4);
        }
        // Dig progress: a ring per digger.
        let ring = 0;
        for (const [f, v] of m.dig) {
          if (v <= 0.02) continue;
          g.lineStyle(3, f === player ? 0x9ae0d8 : 0xff9a5a, 0.9);
          g.beginPath(); g.arc(m.x, m.y, MOUND_R + 6 + ring * 5, -Math.PI / 2, -Math.PI / 2 + v * Math.PI * 2, false); g.strokePath();
          ring++;
        }
      }
      // The burying wind: a front of blown sand.
      if (windAt >= 0) {
        if (time < nextWind) {
          const k = clamp((time - windAt) / WIND_WARN, 0, 1);
          const ex = windDir > 0 ? 0 : W;
          for (let i = 0; i < 12; i++) {
            const y = top + 20 + i * ((H - top - 40) / 11);
            g.lineStyle(2, SAND_PALE, 0.2 + k * 0.4); g.lineBetween(ex, y, ex + windDir * (30 + k * 80 + ((i * 37) % 30)), y + 3);
          }
        } else {
          g.fillStyle(SAND_LIT, 0.35); g.fillRect(windDir > 0 ? windX - 90 : windX, top, 90, H - top);
          for (let i = 0; i < 20; i++) {
            const y = top + ((i * 29 + time / 4) % (H - top));
            g.lineStyle(2, SAND_PALE, 0.6); g.lineBetween(windX, y, windX - windDir * 60, y + 4);
          }
        }
      }
    },

    drawAir(g, time) {
      // An urn mound's glint — the tell.
      for (const m of mounds) {
        if (m.kind === 'nest' || !ready(m, time)) continue;
        const ph = ((time / 1800) + m.seed) % 1;
        if (ph < 0.18) {
          const k = Math.sin((ph / 0.18) * Math.PI);
          const gx = m.x + 6, gy = m.y - 12;
          g.lineStyle(2, BRASS_LIT, k); g.lineBetween(gx - 9 * k, gy, gx + 9 * k, gy); g.lineBetween(gx, gy - 9 * k, gx, gy + 9 * k);
          glow(g, gx, gy, 10, BRASS_LIT, 0.08 * k, 2);
        }
      }
      for (const s of scorps) scorpion(g, s.x, s.y, s.a, 1.1, time);
      for (const c of coins) {
        g.fillStyle(BRASS, 1); g.fillCircle(c.x, c.y, 5);
        g.fillStyle(BRASS_LIT, 1); g.fillCircle(c.x - 1.5, c.y - 1.5, 2);
      }
      // A floating urn over whoever has the gold.
      for (const f of [player, npc]) {
        const until = goldUntil.get(f) ?? 0;
        if (time >= until || !alive(f)) continue;
        const bob = Math.sin(time / 200) * 3;
        glow(g, f.x, f.y - 60 + bob, 16, BRASS_LIT, 0.07, 2);
        urn(g, f.x, f.y - 50 + bob, 0.7, BRASS, true);
        g.lineStyle(2, VENOM, 0.8); g.beginPath(); g.arc(f.x, f.y - 58 + bob, 14, -Math.PI / 2, -Math.PI / 2 + ((until - time) / GOLD_MS) * Math.PI * 2, false); g.strokePath();
      }
    },
  };
}

export const BURIED_TREASURE: GimmickDef = {
  id: 'dunesea-buried-treasure',
  rules: 'Mounds rise; stand on one to dig it — an urn of power, or a scorpion nest that hunts the nearest. The wind re-buries the rest. Petra digs for urns.',
  make,
};
