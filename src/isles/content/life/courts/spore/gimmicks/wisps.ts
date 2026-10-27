import Phaser from 'phaser';
import type { EncounterGimmick, Fighter, GimmickCtx, GimmickDef, Pt, Side } from './shared';
import { live, SIDES } from './shared';
import { BOG, BOG_SHEEN, CSS_SPORE, CSS_WISP, MOSS, MOSS_LIT, PEAT_DARK, SPORE, WHITE, WISP, WISP_DEEP } from '../palette';
import { dist } from '../sporeArt';

/**
 * Will-o'-Wisps — Wisper Fen's fight.
 *
 * The bog is soft everywhere. The only ground that holds is the ground under a wisp: each of the
 * pale lights hanging over the fen keeps a little island of firm moss beneath it, and the island
 * goes where the light goes. Off firm ground you **sink** — slower and slower as the mud climbs
 * your legs, until you are stuck fast for a moment and anything can hit you. Back on firm ground
 * you pull free quickly.
 *
 * Free wisps wander. Stand under one long enough and it **follows you** — never quite keeping up,
 * so stand still and let your island catch you, or keep moving and wade. Fen is a wisp-caller:
 * every few seconds she **beckons** the light nearest you away to herself. But she sinks in her
 * own bog as fast as you do, and a light she has called can be called back: stand under it and
 * it will leave her mid-step.
 */

const FIRM = 78;
const CLAIM_MS = 1100;
const STEAL_MS = 1700;
const OWN_MS = 6500;
const FOLLOW_SPEED = 92;
const WANDER_SPEED = 42;
const STUCK_MS = 1100;

interface Wisp { x: number; y: number; tx: number; ty: number; owner: Side | null; until: number; claim: Record<Side, number>; seed: number; retarget: number }

export const WISPS: GimmickDef = {
  id: 'spore-wisps',
  rules: 'Off firm ground you sink until stuck; the only firm ground is under a wisp. Stand under one and it follows you. Fen calls them away.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const { W, H, top, hard } = ctx;
    const sinkTime = hard ? 3.0 : 3.7;
    const beckonEvery = hard ? 5200 : 6600;
    const count = hard ? 3 : 4;
    const wisps: Wisp[] = [];
    for (let i = 0; i < count; i++) {
      const x = 140 + (i + 0.5) * ((W - 280) / count) + (ctx.rng() - 0.5) * 60;
      const y = top + 90 + ctx.rng() * (H - top - 180);
      wisps.push({ x, y, tx: x, ty: y, owner: null, until: 0, claim: { p: 0, n: 0 }, seed: i * 31 + 5, retarget: 0 });
    }
    const sink = { p: 0, n: 0 };
    const stuckUntil = { p: 0, n: 0 };
    let beckonAt = ctx.scene.time.now + 4200;
    let beckonFx: { w: Wisp; at: number } | null = null;
    const fOf = (k: Side): Fighter => (k === 'p' ? ctx.player : ctx.npc);
    const firmUnder = (f: Fighter): boolean => wisps.some((w) => dist(f.x, f.y + 12, w.x, w.y) < FIRM);
    const clampPt = (x: number, y: number): Pt => ({ x: Phaser.Math.Clamp(x, 60, W - 60), y: Phaser.Math.Clamp(y, top + 50, H - 40) });

    return {
      update(time, dt) {
        const step = Math.min(0.05, dt);
        // Wisps drift: free ones wander, owned ones trail their owner.
        for (const w of wisps) {
          if (w.owner && time >= w.until) {
            if (w.owner === 'p') ctx.float(w.x, w.y - 60, 'the light drifts off', CSS_WISP);
            w.owner = null;
          }
          if (w.owner) {
            const f = fOf(w.owner);
            w.tx = f.x; w.ty = f.y + 12;
          } else if (time >= w.retarget) {
            w.retarget = time + 2600 + ctx.rng() * 2400;
            const q = clampPt(w.x + (ctx.rng() - 0.5) * 360, w.y + (ctx.rng() - 0.5) * 240);
            w.tx = q.x; w.ty = q.y;
          }
          const d = dist(w.x, w.y, w.tx, w.ty);
          const sp = (w.owner ? FOLLOW_SPEED : WANDER_SPEED) * step;
          if (d > 2) { w.x += ((w.tx - w.x) / d) * Math.min(sp, d); w.y += ((w.ty - w.y) / d) * Math.min(sp, d); }
          // Claims: stand under a wisp to make it yours (longer if it is the other side's).
          for (const k of SIDES) {
            const f = fOf(k);
            const under = live(f) && w.owner !== k && dist(f.x, f.y + 12, w.x, w.y) < FIRM * 0.6;
            w.claim[k] = under ? w.claim[k] + step * 1000 : 0;
            const need = w.owner ? STEAL_MS : CLAIM_MS;
            if (w.claim[k] >= need) {
              w.owner = k; w.until = time + OWN_MS;
              w.claim.p = 0; w.claim.n = 0;
              ctx.float(w.x, w.y - 64, k === 'p' ? 'THE WISP FOLLOWS YOU' : 'THE WISP GOES TO FEN', k === 'p' ? CSS_SPORE : CSS_WISP);
              ctx.sfx('sparkle');
            }
          }
        }
        // Fen beckons the light nearest you.
        if (time >= beckonAt) {
          beckonAt = time + beckonEvery;
          const p = ctx.player;
          const w = wisps.filter((q) => q.owner !== 'n').sort((a, b) => dist(a.x, a.y, p.x, p.y) - dist(b.x, b.y, p.x, p.y))[0];
          if (w && live(ctx.npc)) {
            w.owner = 'n'; w.until = time + OWN_MS * 0.8;
            beckonFx = { w, at: time };
            ctx.float(ctx.npc.x, ctx.npc.y - 48, 'COME, LITTLE LIGHT', CSS_WISP);
            ctx.sfx('hush');
          }
        }
        if (beckonFx && time - beckonFx.at > 900) beckonFx = null;
        // The bog.
        for (const k of SIDES) {
          const f = fOf(k);
          if (!live(f)) continue;
          if (time < stuckUntil[k]) continue;
          if (firmUnder(f)) sink[k] = Math.max(0, sink[k] - step * 1.4);
          else sink[k] = Math.min(1, sink[k] + step / sinkTime);
          if (sink[k] >= 1) {
            stuckUntil[k] = time + STUCK_MS;
            ctx.root(f, STUCK_MS);
            ctx.float(f.x, f.y - 46, k === 'p' ? 'STUCK IN THE BOG' : 'FEN IS STUCK', k === 'p' ? '#c9a77a' : CSS_WISP);
            ctx.sfx('slime-splat');
            sink[k] = 0.55;
          }
        }
      },

      playerSpeedMult: () => 1 - 0.68 * sink.p,
      npcSpeedMult: () => 1 - 0.68 * sink.n,
      playerTakenMult: () => (ctx.scene.time.now < stuckUntil.p ? 1.2 : 1),
      npcTakenMult: () => (ctx.scene.time.now < stuckUntil.n ? 1.2 : 1),

      npcSeek() {
        const n = ctx.npc;
        // Her own lights first — stand on the island under one.
        const mine = wisps.filter((w) => w.owner === 'n').sort((a, b) => dist(a.x, a.y, n.x, n.y) - dist(b.x, b.y, n.x, n.y))[0];
        if (sink.n > 0.3 || !firmUnder(n)) {
          if (mine) return { x: mine.x, y: mine.y - 12 };
          const any = wisps.slice().sort((a, b) => dist(a.x, a.y, n.x, n.y) - dist(b.x, b.y, n.x, n.y))[0];
          if (any) return { x: any.x, y: any.y - 12 };
        }
        // Your light is close to her: walk under it and take it.
        const yours = wisps.find((w) => w.owner === 'p' && dist(w.x, w.y, n.x, n.y) < 220);
        if (yours) return { x: yours.x, y: yours.y - 12 };
        return null;
      },

      drawGround(g, time) {
        // The soft bog over the whole floor: a wet black sheen with slow rings opening in it.
        g.fillStyle(BOG, 0.35); g.fillRect(0, top, W, H - top);
        for (let i = 0; i < 9; i++) {
          const ph = ((time / 3200) + i / 9) % 1;
          const x = 80 + ((i * 263) % (W - 160)), y = top + 40 + ((i * 151) % (H - top - 80));
          g.lineStyle(1.2, BOG_SHEEN, 0.5 * (1 - ph)); g.strokeEllipse(x, y, 20 + ph * 70, 8 + ph * 26);
        }
        // Firm islands under every wisp: a moss tussock, lit from above.
        for (const w of wisps) {
          g.fillStyle(PEAT_DARK, 0.9); g.fillEllipse(w.x, w.y + 4, FIRM * 2.1, FIRM * 1.35);
          g.fillStyle(MOSS, 0.95); g.fillEllipse(w.x, w.y, FIRM * 2, FIRM * 1.28);
          g.fillStyle(MOSS_LIT, 0.4); g.fillEllipse(w.x - FIRM * 0.2, w.y - FIRM * 0.18, FIRM * 1.1, FIRM * 0.55);
          g.fillStyle(WISP, 0.1 + 0.05 * Math.sin(time / 300 + w.seed)); g.fillEllipse(w.x, w.y, FIRM * 1.7, FIRM * 1.05);
          const ring = w.owner === 'p' ? SPORE : w.owner === 'n' ? WISP_DEEP : WISP;
          g.lineStyle(2, ring, 0.55); g.strokeEllipse(w.x, w.y, FIRM * 2, FIRM * 1.28);
          // A claim in progress fills an arc round the island.
          for (const k of SIDES) {
            if (w.claim[k] <= 0) continue;
            const need = w.owner ? STEAL_MS : CLAIM_MS;
            const q = Phaser.Math.Clamp(w.claim[k] / need, 0, 1);
            g.lineStyle(4, k === 'p' ? SPORE : WISP_DEEP, 0.9);
            g.beginPath(); g.arc(w.x, w.y, FIRM * 0.7, -Math.PI / 2, -Math.PI / 2 + q * Math.PI * 2, false); g.strokePath();
          }
        }
        // Mud climbing whoever is sinking: rings of disturbed bog at the feet.
        for (const k of SIDES) {
          const f = fOf(k);
          if (!live(f) || sink[k] <= 0.02) continue;
          const s = sink[k];
          g.fillStyle(PEAT_DARK, 0.6 + 0.3 * s); g.fillEllipse(f.x, f.y + 16, 40 + s * 18, 12 + s * 6);
          const ph = (time / 700) % 1;
          g.lineStyle(1.5, BOG_SHEEN, 0.7 * (1 - ph)); g.strokeEllipse(f.x, f.y + 16, 40 + ph * 40, 12 + ph * 12);
        }
      },

      drawAir(g, time) {
        // The mud over the legs, rising with the sink.
        for (const k of SIDES) {
          const f = fOf(k);
          if (!live(f) || sink[k] <= 0.05) continue;
          const s = sink[k];
          const hh = 6 + s * 22;
          g.fillStyle(PEAT_DARK, 0.92); g.fillEllipse(f.x, f.y + 18 - hh / 2, 46, hh);
          g.fillStyle(BOG_SHEEN, 0.6); g.fillEllipse(f.x - 6, f.y + 18 - hh + 2, 20, 4);
          if (ctx.scene.time.now < stuckUntil[k]) {
            for (let i = 0; i < 3; i++) {
              const ph = ((time / 400) + i / 3) % 1;
              g.fillStyle(BOG_SHEEN, 1 - ph); g.fillCircle(f.x - 16 + i * 16, f.y + 6 - ph * 10, 2 + ph * 2);
            }
          }
        }
        // The wisps: cold flames bobbing over their islands.
        for (const w of wisps) {
          const bob = Math.sin(time / 340 + w.seed) * 6;
          const x = w.x + Math.sin(time / 520 + w.seed) * 4, y = w.y - 46 + bob;
          g.fillStyle(WISP, 0.12); g.fillCircle(x, y, 30);
          g.fillStyle(WISP, 0.22); g.fillCircle(x, y, 18);
          // A teardrop flame, tail streaming back the way it drifts.
          const tail = Math.atan2(w.y - w.ty, w.x - w.tx) || Math.PI / 2;
          for (let i = 3; i >= 0; i--) {
            const r = 9 - i * 1.8;
            g.fillStyle(i === 0 ? WHITE : WISP, 0.75 - i * 0.12);
            g.fillCircle(x + Math.cos(tail) * i * 5, y + Math.sin(tail) * i * 5 - i * 2, r);
          }
          const ring = w.owner === 'p' ? SPORE : w.owner === 'n' ? WISP_DEEP : 0;
          if (ring) { g.lineStyle(1.5, ring, 0.8); g.strokeCircle(x, y, 13); }
          // A faint thread to its owner.
          if (w.owner) {
            const f = fOf(w.owner);
            g.lineStyle(1, w.owner === 'p' ? SPORE : WISP, 0.25); g.lineBetween(x, y, f.x, f.y - 20);
          }
        }
        // Fen's beckon: a pale sweep from her hand to the light she is calling.
        if (beckonFx) {
          const q = (ctx.scene.time.now - beckonFx.at) / 900;
          const n = ctx.npc, w = beckonFx.w;
          g.lineStyle(3 * (1 - q), WISP, 0.8 * (1 - q)); g.lineBetween(n.x, n.y - 24, w.x, w.y - 46);
          g.lineStyle(2, WHITE, 0.6 * (1 - q)); g.strokeCircle(w.x, w.y - 46, 16 + q * 30);
        }
      },

      drawHud(g) {
        // Two depth gauges: how far each of you has gone into the bog.
        const y = 104;
        for (const [k, x0] of [['p', W / 2 - 150], ['n', W / 2 + 30]] as const) {
          g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x0 - 4, y - 4, 128, 16, 6);
          g.fillStyle(MOSS, 1); g.fillRoundedRect(x0, y, 120, 8, 4);
          g.fillStyle(PEAT_DARK, 1); g.fillRoundedRect(x0, y, 120 * sink[k], 8, 4);
          g.fillStyle(k === 'p' ? SPORE : WISP, 1); g.fillCircle(x0 - 10, y + 4, 4);
        }
      },
    };
  },
};
