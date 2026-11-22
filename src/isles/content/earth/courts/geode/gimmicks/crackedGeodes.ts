import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { glow } from '../../../../../art/IsleArt';
import { crystalPoint, cutGem, geodeStone } from '../art';
import { AMETHYST, CITRINE, QUARTZ_DARK, QUARTZ_LIT, RIND, RIND_DARK, ROSE, SMOKY } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Cracked Geodes — Breaker Vug.
 *
 * Vug cracks the stones the quarry sends up: every one a closed grey ball, every one with
 * something inside. They lie about the floor; strike one and you crack it and take the gem in
 * its heart — an amethyst (quick feet), a ruby (heavy blows), a sapphire (a hard skin) or a
 * citrine (a mouthful of health). But the cavern roof above the breaking-yard is old and hung
 * with stalactites, and every third stone cracked shakes it: shadows swell on the floor — under
 * both fighters and round about — and a second later the stone comes down on them.
 *
 * The count is on the wall. Crack the third yourself, then step out of your shadow and leave him
 * under his; or let him crack it, and take the gem he was walking to.
 */

const MAX_STONES = 5;
const GEM_MS = 4500;
const DROP_WARN = 1250;
const DROP_R = 44;

type GemKind = 'amethyst' | 'ruby' | 'sapphire' | 'citrine';
const GEM_COLOR: Record<GemKind, number> = { amethyst: AMETHYST, ruby: 0xe03a52, sapphire: 0x3a6ae0, citrine: CITRINE };
const GEM_TEXT: Record<GemKind, string> = { amethyst: 'AMETHYST — QUICK', ruby: 'RUBY — HEAVY', sapphire: 'SAPPHIRE — HARD', citrine: 'CITRINE — HEAL' };

interface Stone { x: number; y: number; r: number; gem: GemKind; openAt: number; by: Fighter | null; body: StrikeTarget | null }
interface Drop { x: number; y: number; at: number; fall: number; done: boolean; seed: number }
interface Buffs { quick: number; heavy: number; hard: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const dropDmg = ctx.hard ? 18 : 15;
  const stones: Stone[] = [];
  const drops: Drop[] = [];
  const buffs = new Map<Fighter, Buffs>([[player, { quick: 0, heavy: 0, hard: 0 }], [npc, { quick: 0, heavy: 0, hard: 0 }]]);
  let cracks = 0;
  let nextStone = 0;
  let started = false;

  function place(): void {
    for (let tries = 0; tries < 20; tries++) {
      const x = 90 + rng() * (W - 180), y = top + 70 + rng() * (H - top - 130);
      if (dist(x, y, player.x, player.y) < 110 || dist(x, y, npc.x, npc.y) < 110) continue;
      if (stones.some((s) => s.openAt < 0 && dist(s.x, s.y, x, y) < 130)) continue;
      const kinds: GemKind[] = ['amethyst', 'ruby', 'sapphire', 'citrine'];
      const s: Stone = { x, y, r: 16 + rng() * 5, gem: kinds[Math.floor(rng() * 4)], openAt: -1, by: null, body: null };
      // A floor stone: shots crack it and fly on.
      s.body = ctx.target({
        x, y: y - s.r * 0.8, r: s.r + 4, passThrough: true,
        onStruck: (by) => { if (s.openAt < 0) crack(s, by === 'player' ? player : npc, ctx.scene.time.now); },
      });
      stones.push(s);
      return;
    }
  }

  function crack(s: Stone, f: Fighter, time: number): void {
    s.openAt = time; s.by = f;
    s.body?.remove();
    s.body = null;
    cracks++;
    ctx.sfx('rock-throw');
    const b = buffs.get(f);
    if (b) {
      if (s.gem === 'amethyst') b.quick = time + GEM_MS;
      else if (s.gem === 'ruby') b.heavy = time + GEM_MS;
      else if (s.gem === 'sapphire') b.hard = time + GEM_MS;
      else ctx.heal(f, ctx.hard ? 10 : 12);
    }
    ctx.float(s.x, s.y - 40, GEM_TEXT[s.gem], f === player ? '#fff0c0' : '#ffb0b0');
    if (cracks % 3 === 0) quake(time);
  }

  function quake(time: number): void {
    ctx.banner('THE CAVERN SHAKES', '#f0d8b0');
    ctx.sfx('quake');
    const spots: Pt[] = [];
    for (const f of [player, npc]) if (alive(f)) spots.push({ x: f.x, y: f.y });
    for (let i = 0; i < (ctx.hard ? 5 : 4); i++) spots.push({ x: 80 + rng() * (W - 160), y: top + 60 + rng() * (H - top - 110) });
    spots.forEach((p, i) => drops.push({ x: p.x, y: p.y, at: time + i * 90, fall: time + i * 90 + DROP_WARN, done: false, seed: rng() * 10 }));
  }

  const mine = (f: Fighter, k: keyof Buffs) => ctx.scene.time.now < (buffs.get(f)?.[k] ?? 0);

  return {
    update(time, dtRaw) {
      stepDt(dtRaw);
      if (!started) { started = true; for (let i = 0; i < 3; i++) place(); nextStone = time + 3000; }
      if (time >= nextStone) {
        nextStone = time + (ctx.hard ? 2800 : 3500);
        if (stones.filter((s) => s.openAt < 0).length < MAX_STONES) place();
      }
      for (let i = stones.length - 1; i >= 0; i--) if (stones[i].openAt >= 0 && time - stones[i].openAt > 1600) stones.splice(i, 1);
      for (const d of drops) {
        if (d.done || time < d.fall) continue;
        d.done = true;
        ctx.sfx('stone-slam');
        for (const f of [player, npc]) {
          if (!alive(f) || dist(d.x, d.y, f.x, f.y) >= DROP_R + 8) continue;
          ctx.hit(f, dropDmg, f.x, f.y);
          ctx.stun(f, 500);
        }
      }
      for (let i = drops.length - 1; i >= 0; i--) if (drops[i].done && time - drops[i].fall > 2600) drops.splice(i, 1);
    },

    destroy() { for (const s of stones) s.body?.remove(); },

    playerSpeedMult() { return mine(player, 'quick') ? 1.35 : 1; },
    npcSpeedMult() { return mine(npc, 'quick') ? 1.35 : 1; },
    playerTakenMult() { return (mine(npc, 'heavy') ? 1.4 : 1) * (mine(player, 'hard') ? 0.5 : 1); },
    npcTakenMult() { return (mine(player, 'heavy') ? 1.4 : 1) * (mine(npc, 'hard') ? 0.5 : 1); },

    npcSeek() {
      if (!alive(npc)) return null;
      // Out from under any falling stone first.
      for (const d of drops) {
        if (d.done || dist(d.x, d.y, npc.x, npc.y) > DROP_R + 30) continue;
        const a = Math.atan2(npc.y - d.y, npc.x - d.x) + 0.3;
        return { x: clamp(d.x + Math.cos(a) * 130, 60, W - 60), y: clamp(d.y + Math.sin(a) * 130, top + 50, H - 40) };
      }
      // Otherwise the nearest closed stone — preferring ones nearer him than you.
      let best: Stone | null = null, bs = Infinity;
      for (const s of stones) {
        if (s.openAt >= 0) continue;
        const sc = dist(s.x, s.y, npc.x, npc.y) - dist(s.x, s.y, player.x, player.y) * 0.4;
        if (sc < bs) { bs = sc; best = s; }
      }
      return best ? { x: best.x, y: best.y } : { x: clamp(player.x + 200, 60, W - 60), y: player.y };
    },

    drawGround(g, time) {
      for (const d of drops) {
        if (!d.done) {
          if (time < d.at) continue;
          const k = clamp((time - d.at) / DROP_WARN, 0, 1);
          // A shadow swelling under the stalactite.
          g.fillStyle(0x000000, 0.12 + k * 0.32); g.fillEllipse(d.x, d.y, DROP_R * 2 * (0.4 + k * 0.6), DROP_R * 0.9 * (0.4 + k * 0.6));
          g.lineStyle(1.5, 0xf0d8b0, 0.2 + k * 0.5); g.strokeEllipse(d.x, d.y, DROP_R * 2, DROP_R * 0.9);
        } else {
          // Broken stalactite rubble, settling into dust.
          const k = clamp((time - d.fall) / 2600, 0, 1);
          for (let i = 0; i < 6; i++) {
            const a = d.seed + i * 1.1, r = 10 + (i * 7) % 24;
            g.fillStyle(i % 2 ? RIND : RIND_DARK, 1 - k); g.fillCircle(d.x + Math.cos(a) * r, d.y + Math.sin(a) * r * 0.5, 4 + (i % 3) * 2);
          }
          g.fillStyle(0xe8e2ea, 0.4 * (1 - k)); g.fillEllipse(d.x, d.y, 90 * (0.6 + k), 30 * (0.6 + k));
        }
      }
    },

    drawAir(g, time) {
      for (const s of [...stones].sort((a, b) => a.y - b.y)) {
        const open = s.openAt < 0 ? 0 : clamp((time - s.openAt) / 400, 0, 1);
        const gemC = GEM_COLOR[s.gem];
        geodeStone(g, s.x, s.y, s.r, open, s.gem === 'amethyst' ? AMETHYST : s.gem === 'citrine' ? CITRINE : s.gem === 'ruby' ? ROSE : QUARTZ_DARK, gemC);
        if (open > 0 && s.openAt >= 0) {
          const k = clamp((time - s.openAt) / 900, 0, 1);
          // The gem flies to whoever cracked it.
          if (s.by && k < 1) {
            const x = s.x + (s.by.x - s.x) * k, y = s.y - 30 + (s.by.y - 30 - s.y + 30) * k - Math.sin(k * Math.PI) * 30;
            glow(g, x, y, 14, gemC, 0.08, 2);
            cutGem(g, x, y, 6, gemC);
          }
        } else {
          // A crack line hinting at what is inside.
          g.lineStyle(1, 0xffffff, 0.25 + Math.sin(time / 300 + s.x) * 0.15);
          g.lineBetween(s.x - s.r * 0.4, s.y - s.r * 1.2, s.x + s.r * 0.1, s.y - s.r * 0.5);
          g.fillStyle(gemC, 0.55); g.fillCircle(s.x - s.r * 0.15, s.y - s.r * 0.85, 1.6);
        }
      }
      // Stalactites coming down in the last moment.
      for (const d of drops) {
        if (d.done || time < d.fall - 320) continue;
        const k = clamp(1 - (d.fall - time) / 320, 0, 1);
        const y = top - 20 + (d.y - top + 20) * k * k;
        crystalPoint(g, d.x, y - 50, 18, 54, Math.PI, SMOKY);
        crystalPoint(g, d.x + 9, y - 40, 9, 26, Math.PI + 0.2, RIND);
      }
      // Gem buffs: a ring of the gem's colour on whoever holds one.
      for (const [f, b] of buffs) {
        if (!alive(f)) continue;
        const list: [number, number][] = [[b.quick, GEM_COLOR.amethyst], [b.heavy, GEM_COLOR.ruby], [b.hard, GEM_COLOR.sapphire]];
        list.forEach(([until, c], i) => {
          if (time >= until) return;
          const a = time / 300 + i * 2.1;
          cutGem(g, f.x + Math.cos(a) * 26, f.y - 20 + Math.sin(a) * 10, 4.5, c);
        });
      }
    },

    drawHud(g) {
      // Three notches on the wall: the stones cracked toward the next quake.
      const n = cracks % 3;
      for (let i = 0; i < 3; i++) {
        const x = W / 2 - 30 + i * 30, y = top + 16;
        g.fillStyle(0x000000, 0.45); g.fillCircle(x, y, 10);
        if (i < n) { g.fillStyle(RIND, 1); g.fillCircle(x, y, 8); g.lineStyle(2, QUARTZ_LIT, 1); g.lineBetween(x - 5, y - 5, x + 5, y + 5); }
        else { g.lineStyle(1.5, RIND, 0.8); g.strokeCircle(x, y, 8); }
      }
      if (n === 2) { g.lineStyle(2, 0xf0d8b0, 0.8); g.strokeRoundedRect(W / 2 - 46, top + 2, 92, 28, 8); }
    },
  };
}

export const CRACKED_GEODES: GimmickDef = {
  id: 'geode-cracked-geodes',
  rules: 'Strike a closed geode to crack it and take its gem: quick, heavy, hard or healing. Every third crack drops stalactites on both your shadows.',
  make,
};
