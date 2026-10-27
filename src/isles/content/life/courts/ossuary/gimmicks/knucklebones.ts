import type Phaser from 'phaser';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import { dim, lit } from '../../../../../art/IsleArt';
import { Clock, O, OCOL, alive, clamp, dist, drawBone, jit, segDist } from '../util';

/**
 * KNUCKLEBONES — Rattlebag Coccyx.
 *
 * Every round, Coccyx tosses five knucklebones and the jack across the yard. While they tumble
 * and settle, the jack lies where it fell, ringed — and whoever reaches it first *holds the luck*
 * for the round. Then the bones come to rest and their faces pick the yard's rule until the next
 * throw:
 *
 * • BONES FLY — loose bones lift off the ground and fly across the yard, each down a line drawn a
 *   moment before. They hunt the one who does not hold the jack (with nobody holding it, both).
 * • HALLOWED GROUND — half the flags glow; standing on a lit one mends you. The lit half swaps
 *   on a slow beat. The holder mends nearly twice as fast.
 * • BLOOD PRICE — every hit heals the one who landed it; the holder's hits heal the most.
 * • DEAD MAN'S HAND — the yard turns on whoever does not hold the jack: they take more from
 *   everything.
 *
 * Coccyx plays the jack hard — he always runs for it. Beat him to it and the yard is yours.
 */

type Side = 'player' | 'npc';
type Rule = 'fly' | 'hallowed' | 'blood' | 'hand';

interface Tossed { x0: number; y0: number; x1: number; y1: number; at: number; landAt: number; seed: number; jack: boolean }
interface Flyer { x0: number; y0: number; x1: number; y1: number; warnAt: number; goAt: number; target: Side; done: boolean; seed: number }

const ROUND_MS = 10000;
const TOSS_MS = 900;
const SETTLE_MS = 2300;
const JACK_R = 34;
const CELL = 120;
const FLY_SPEED = 620;

const RULE_TEXT: Record<Rule, { name: string; sub: string }> = {
  fly: { name: 'BONES FLY', sub: 'Loose bones hunt whoever lacks the jack.' },
  hallowed: { name: 'HALLOWED GROUND', sub: 'Lit flags mend. The holder mends faster.' },
  blood: { name: 'BLOOD PRICE', sub: 'Every hit heals the hitter.' },
  hand: { name: 'DEAD MAN\'S HAND', sub: 'Whoever lacks the jack takes more.' },
};

export const KNUCKLEBONES: GimmickDef = {
  id: 'ossuary-knucklebones',
  rules: 'Each round the bones are tossed: grab the ringed jack before they settle to hold the round\'s luck. The roll picks the rule — Bones Fly, Hallowed Ground, Blood Price or Dead Man\'s Hand.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const clock = new Clock();
    const { W, H, top, rng } = ctx;
    let now = 0;
    let nextThrow = -1;
    let settleAt = -1;
    let tossed: Tossed[] = [];
    let jack: Pt | null = null;
    let holder: Side | null = null;
    let rule: Rule | null = null;
    let lastRule: Rule | null = null;
    let ruleFrom = 0;
    let flyers: Flyer[] = [];
    let nextFly = 0;
    let flySide = 0;
    let healAcc: Record<Side, number> = { player: 0, npc: 0 };
    const fighterOf = (s: Side): Fighter => (s === 'player' ? ctx.player : ctx.npc);
    const other = (s: Side): Side => (s === 'player' ? 'npc' : 'player');

    const toss = (): void => {
      const n = ctx.npc;
      tossed = [];
      for (let i = 0; i < 6; i++) {
        const x1 = clamp(W / 2 + (rng() - 0.5) * (W - 280), 120, W - 120);
        const y1 = clamp(top + 90 + rng() * (H - top - 170), top + 60, H - 60);
        tossed.push({ x0: n.x, y0: n.y - 20, x1, y1, at: now + i * 60, landAt: now + TOSS_MS + i * 60, seed: rng() * 100, jack: i === 5 });
      }
      // The jack never lands right under either fighter.
      const j = tossed[5];
      const p = ctx.player;
      for (let tries = 0; tries < 8 && (dist(j.x1, j.y1, p.x, p.y) < 140 || dist(j.x1, j.y1, n.x, n.y) < 140); tries++) {
        j.x1 = clamp(120 + rng() * (W - 240), 120, W - 120);
        j.y1 = clamp(top + 80 + rng() * (H - top - 160), top + 60, H - 60);
      }
      jack = null;
      holder = null;
      rule = null;
      flyers = [];
      settleAt = now + TOSS_MS + SETTLE_MS;
      ctx.sfx('dice');
      ctx.float(n.x, n.y - 60, 'BONES!', OCOL.bone);
    };

    const settle = (): void => {
      // Never the same rule twice running.
      const pool: Rule[] = (['fly', 'hallowed', 'blood', 'hand'] as Rule[]).filter((r) => r !== lastRule);
      rule = pool[Math.floor(rng() * pool.length)];
      lastRule = rule;
      ruleFrom = now;
      jack = null;
      nextFly = now + 600;
      ctx.sfx('jackpot');
      ctx.banner(RULE_TEXT[rule].name, holder === 'player' ? '#a8f0b0' : holder === 'npc' ? '#ff9a8a' : '#f3ead2');
      ctx.float(W / 2, top + 70, RULE_TEXT[rule].sub, OCOL.bone);
    };

    /** Damage-heals for Blood Price. */
    const bloodHeal = (hitter: Side, amount: number): void => {
      if (rule !== 'blood') return;
      const frac = holder === hitter ? 0.6 : holder === null ? 0.35 : 0.2;
      const f = fighterOf(hitter);
      if (!alive(f)) return;
      ctx.heal(f, Math.max(1, Math.round(amount * frac)));
      ctx.sfx('heal');
    };

    const cellLit = (x: number, y: number): boolean => {
      const flip = Math.floor((now - ruleFrom) / 2500) % 2;
      const cx = Math.floor(x / CELL), cy = Math.floor((y - top) / CELL);
      return ((((cx + cy) % 2) + 2) % 2) === flip;
    };

    return {
      update(time: number) {
        const dt = clock.tick(time);
        now = time;
        if (nextThrow < 0) nextThrow = time + 2200;
        if (dt === 0) return;
        if (time >= nextThrow) { toss(); nextThrow = time + ROUND_MS; }
        // The jack lies ringed once it lands; first to touch it holds the luck.
        const j = tossed.find((t) => t.jack);
        if (j && !rule && time >= j.landAt && !holder) {
          if (!jack) { jack = { x: j.x1, y: j.y1 }; ctx.sfx('land'); }
          for (const s of ['player', 'npc'] as Side[]) {
            const f = fighterOf(s);
            if (alive(f) && dist(f.x, f.y, jack.x, jack.y) < JACK_R) {
              holder = s;
              ctx.sfx('money');
              ctx.float(f.x, f.y - 50, s === 'player' ? 'YOU HOLD THE JACK' : 'COCCYX HOLDS THE JACK', s === 'player' ? OCOL.green : OCOL.red);
              jack = null;
              break;
            }
          }
        }
        if (settleAt > 0 && time >= settleAt && !rule) { settleAt = -1; settle(); }
        if (!rule) return;

        if (rule === 'fly') {
          if (time >= nextFly) {
            nextFly = time + (ctx.hard ? 560 : 720);
            const target: Side = holder ? other(holder) : (flySide++ % 2 ? 'player' : 'npc');
            const tf = fighterOf(target);
            if (alive(tf)) {
              // From a random edge of the yard, aimed at where they stand now.
              const e = Math.floor(rng() * 4);
              const x0 = e === 0 ? -20 : e === 1 ? W + 20 : 60 + rng() * (W - 120);
              const y0 = e === 2 ? top - 10 : e === 3 ? H + 20 : top + 40 + rng() * (H - top - 80);
              const a = Math.atan2(tf.y - y0, tf.x - x0);
              const L = 1400;
              flyers.push({ x0, y0, x1: x0 + Math.cos(a) * L, y1: y0 + Math.sin(a) * L, warnAt: time, goAt: time + 650, target, done: false, seed: rng() * 50 });
              ctx.sfx('whoosh');
            }
          }
          for (const fl of flyers) {
            if (fl.done || time < fl.goAt) continue;
            const run = ((time - fl.goAt) / 1000) * FLY_SPEED;
            const L = dist(fl.x0, fl.y0, fl.x1, fl.y1);
            if (run > L) { fl.done = true; continue; }
            const ux = (fl.x1 - fl.x0) / L, uy = (fl.y1 - fl.y0) / L;
            const hx = fl.x0 + ux * run, hy = fl.y0 + uy * run;
            for (const s of ['player', 'npc'] as Side[]) {
              if (holder === s) continue;
              const f = fighterOf(s);
              if (alive(f) && segDist(f.x, f.y, hx - ux * 30, hy - uy * 30, hx, hy) < 20) {
                fl.done = true;
                ctx.hit(f, ctx.hard ? 12 : 10, f.x, f.y);
                ctx.sfx('hit-medium');
                break;
              }
            }
          }
          flyers = flyers.filter((f) => !f.done || time - f.goAt < 400);
        }

        if (rule === 'hallowed') {
          for (const s of ['player', 'npc'] as Side[]) {
            const f = fighterOf(s);
            if (!alive(f) || !cellLit(f.x, f.y)) continue;
            healAcc[s] += dt * (holder === s ? 10 : 5.5);
            if (healAcc[s] >= 3) { ctx.heal(f, Math.floor(healAcc[s])); healAcc[s] -= Math.floor(healAcc[s]); }
          }
        } else healAcc = { player: 0, npc: 0 };
      },

      onNpcHurt(amount: number) { bloodHeal('player', amount); },
      onPlayerHurt(amount: number) { bloodHeal('npc', amount); },

      playerTakenMult: () => (rule === 'hand' ? (holder === 'player' ? 1 : holder === 'npc' ? 1.3 : 1.15) : 1),
      npcTakenMult: () => (rule === 'hand' ? (holder === 'npc' ? 1 : holder === 'player' ? 1.3 : 1.15) : 1),

      npcSeek(): Pt | null {
        if (jack && !holder) return jack;
        // On hallowed ground he finds the nearest lit flag.
        if (rule === 'hallowed') {
          const n = ctx.npc;
          if (!cellLit(n.x, n.y)) {
            const cx = Math.floor(n.x / CELL), cy = Math.floor((n.y - top) / CELL);
            const opts: Pt[] = [];
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
              const x = (cx + dx + 0.5) * CELL, y = top + (cy + dy + 0.5) * CELL;
              if (x > 40 && x < W - 40 && y > top + 30 && y < H - 30) opts.push({ x, y });
            }
            return opts[0] ?? null;
          }
        }
        return null;
      },

      drawGround(g: Phaser.GameObjects.Graphics, time: number) {
        // Hallowed flags: gold light over a chequer of the yard, flickering just before a swap.
        if (rule === 'hallowed') {
          const phaseT = (now - ruleFrom) % 2500;
          const flicker = phaseT > 2100 && Math.floor(time / 90) % 2 === 0;
          for (let cy = 0; top + cy * CELL < H; cy++) {
            for (let cx = 0; cx * CELL < W; cx++) {
              const x = cx * CELL, y = top + cy * CELL;
              if (!cellLit(x + 1, y + 1)) continue;
              g.fillStyle(O.holy, flicker ? 0.06 : 0.16); g.fillRect(x + 3, y + 3, CELL - 6, CELL - 6);
              g.lineStyle(2, O.holy, flicker ? 0.2 : 0.45); g.strokeRect(x + 6, y + 6, CELL - 12, CELL - 12);
              // A small cross cut in the flag's middle.
              g.fillStyle(O.holy, 0.4); g.fillRect(x + CELL / 2 - 2, y + CELL / 2 - 12, 4, 24); g.fillRect(x + CELL / 2 - 8, y + CELL / 2 - 6, 16, 4);
            }
          }
        }
        // Dead Man's Hand: a cold violet stain under whoever lacks the jack.
        if (rule === 'hand') {
          for (const s of ['player', 'npc'] as Side[]) {
            if (holder === s) continue;
            const f = fighterOf(s);
            if (!alive(f)) continue;
            g.fillStyle(O.dusk, 0.28 + Math.sin(time / 160) * 0.06); g.fillEllipse(f.x, f.y + 18, 70, 22);
          }
        }
        // Flight lines for flying bones.
        for (const fl of flyers) {
          if (time >= fl.goAt + 120) continue;
          const k = clamp((time - fl.warnAt) / (fl.goAt - fl.warnAt), 0, 1);
          g.lineStyle(2 + k * 6, O.boneLit, 0.08 + k * 0.18); g.lineBetween(fl.x0, fl.y0, fl.x1, fl.y1);
        }
        // Landed bones (and the jack's ring until somebody takes it).
        for (const t of tossed) {
          if (time < t.landAt) continue;
          if (t.jack && (holder || rule)) continue;
          g.fillStyle(0x000000, 0.3); g.fillEllipse(t.x1, t.y1 + 4, 18, 6);
          if (t.jack && jack) {
            const k = clamp((settleAt - time) / SETTLE_MS, 0, 1);
            g.lineStyle(3, O.sinewLit, 0.85); g.strokeCircle(jack.x, jack.y, JACK_R);
            g.lineStyle(5, O.gilt, 0.9);
            g.beginPath(); g.arc(jack.x, jack.y, JACK_R + 7, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k, false); g.strokePath();
          }
        }
      },

      drawAir(g: Phaser.GameObjects.Graphics, time: number) {
        // The tumbling bones in flight, then lying on their faces.
        for (const t of tossed) {
          if (time < t.at) continue;
          if (t.jack && (holder || rule)) continue;
          const k = clamp((time - t.at) / (t.landAt - t.at), 0, 1);
          const x = t.x0 + (t.x1 - t.x0) * k;
          const y = t.y0 + (t.y1 - t.y0) * k - Math.sin(k * Math.PI) * 110;
          const spin = k < 1 ? time / 60 + t.seed : t.seed;
          // A knucklebone: a waisted little bone with knobbed ends; the jack is red-tipped.
          const c = Math.cos(spin) * 7, s = Math.sin(spin) * 3.5;
          drawBone(g, x - c, y - s, x + c, y + s, 4, t.jack ? O.boneLit : O.bone, 1);
          if (t.jack) { g.fillStyle(O.sinew, 1); g.fillCircle(x + c, y + s, 3); g.fillCircle(x - c, y - s, 3); }
          else if (k >= 1) {
            // The face it shows, as pips.
            const pips = 1 + Math.floor(jit(t.seed, 1) * 4);
            for (let i = 0; i < pips; i++) { g.fillStyle(O.slate, 1); g.fillCircle(x - 4 + i * 2.7, y - 5, 0.9); }
          }
        }
        // Flying bones.
        for (const fl of flyers) {
          if (fl.done || time < fl.goAt) continue;
          const L = dist(fl.x0, fl.y0, fl.x1, fl.y1);
          const run = ((time - fl.goAt) / 1000) * FLY_SPEED;
          const ux = (fl.x1 - fl.x0) / L, uy = (fl.y1 - fl.y0) / L;
          const hx = fl.x0 + ux * run, hy = fl.y0 + uy * run;
          const spin = time / 45 + fl.seed;
          const c = Math.cos(spin) * 12, s = Math.sin(spin) * 12;
          g.lineStyle(4, O.bone, 0.2); g.lineBetween(hx - ux * 50, hy - uy * 50, hx, hy);
          drawBone(g, hx - c, hy - s, hx + c, hy + s, 4.5, O.bone, 1);
        }
        // The holder carries the jack on a string at the hip.
        if (holder) {
          const f = fighterOf(holder);
          if (alive(f)) {
            const sw = Math.sin(time / 200) * 4;
            g.lineStyle(1, O.sinewLit, 0.9); g.lineBetween(f.x + 16, f.y - 4, f.x + 18 + sw, f.y + 12);
            drawBone(g, f.x + 12 + sw, f.y + 14, f.x + 24 + sw, f.y + 12, 3, O.boneLit, 1);
            g.fillStyle(O.sinew, 1); g.fillCircle(f.x + 24 + sw, f.y + 12, 2.2);
          }
        }
      },

      drawHud(g: Phaser.GameObjects.Graphics, time: number) {
        // The rule plaque, top centre: a bone-white tablet with the round's faces as pips.
        const cx = W / 2, y = top + 8;
        g.fillStyle(0x000000, 0.45); g.fillRoundedRect(cx - 92, y, 184, 30, 8);
        g.fillStyle(dim(O.bone, 0.2), 1); g.fillRoundedRect(cx - 88, y + 3, 176, 24, 6);
        const faces: Rule[] = ['fly', 'hallowed', 'blood', 'hand'];
        faces.forEach((r, i) => {
          const x = cx - 66 + i * 44;
          const on = rule === r;
          g.fillStyle(on ? O.boneLit : O.boneShade, 1); g.fillRoundedRect(x - 14, y + 6, 28, 18, 4);
          if (on) { g.lineStyle(2, holder === 'player' ? 0x8af0a0 : holder === 'npc' ? 0xff7a6a : O.gilt, 1); g.strokeRoundedRect(x - 14, y + 6, 28, 18, 4); }
          for (let k = 0; k <= i; k++) { g.fillStyle(on ? O.sinew : O.slate, 1); g.fillCircle(x - 7 + k * 4.7, y + 15, 1.6); }
        });
        // While the bones settle: a countdown bar under the plaque.
        if (!rule && settleAt > 0) {
          const k = clamp((settleAt - time) / (TOSS_MS + SETTLE_MS), 0, 1);
          g.fillStyle(O.gilt, 0.9); g.fillRect(cx - 88, y + 32, 176 * k, 3);
        }
        if (holder === 'player') { g.fillStyle(lit(O.gilt, 0.2), 1); g.fillCircle(cx + 104, y + 15, 6); g.fillStyle(O.sinew, 1); g.fillCircle(cx + 104, y + 15, 2.5); }
      },
    };
  },
};
