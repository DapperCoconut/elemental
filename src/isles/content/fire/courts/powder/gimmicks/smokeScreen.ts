import type Phaser from 'phaser';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import { Clock, P, PCOL, dist, drawPuff } from '../util';
import { dim, lit } from '../../../../../art/IsleArt';

/**
 * SMOKE SCREEN — Smoke-Runner Kit.
 *
 * Kit lobs smoke grenades — a tin canister on a high arc with its shadow racing ahead of it —
 * that burst into thick banks of gunsmoke. Anyone inside a bank is hard to hit: damage against
 * them is nearly halved. Kit runs from bank to bank and the smoke closes over him, so all you see
 * is the odd glint of his eyes.
 *
 * Smoke cuts both ways. Walk *into* his bank and you are face to face in the fog — nobody is
 * hidden from somebody standing next to them, and your body parts the cloud so it thins out
 * fast. You can also hide in it yourself while he is out in the open.
 */

interface Lob { fx: number; fy: number; tx: number; ty: number; at: number; landAt: number }
interface Cloud { x: number; y: number; born: number; life: number; r: number; seed: number; dead: boolean }

const FLIGHT_MS = 820;
const CLOUD_R = 96;
const HIDDEN_MULT = 0.55;

export const SMOKE_SCREEN: GimmickDef = {
  id: 'powder-smoke',
  rules: 'Smoke banks halve the damage anyone inside them takes. Step into his bank and you are face to face — and you part the smoke.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const clock = new Clock();
    const { rng } = ctx;
    const lobs: Lob[] = [];
    const clouds: Cloud[] = [];
    const cloudLife = ctx.hard ? 9000 : 7500;
    let nextLob = -1;
    let lastHiddenNote = 0;
    let kitWasHidden = false;

    const cloudOf = (f: Fighter): Cloud | null => {
      let best: Cloud | null = null;
      for (const c of clouds) {
        if (c.dead || c.r < 30) continue;
        if (dist(c.x, c.y, f.x, f.y) < c.r * 0.82 && (!best || c.r > best.r)) best = c;
      }
      return best;
    };
    const hidden = (f: Fighter, other: Fighter): boolean => {
      const c = cloudOf(f);
      if (!c) return false;
      // Face to face in the fog — the other one is right there, inside the same bank.
      return !(cloudOf(other) === c && dist(f.x, f.y, other.x, other.y) < c.r * 1.2);
    };

    const lob = (now: number): void => {
      const n = ctx.npc, p = ctx.player;
      let tx: number, ty: number;
      if (rng() < 0.45) {
        // Right on his own head — the classic vanish.
        tx = n.x + (rng() - 0.5) * 40; ty = n.y + (rng() - 0.5) * 40;
      } else {
        // A screen between you and him.
        const k = 0.3 + rng() * 0.2;
        tx = n.x + (p.x - n.x) * k + (rng() - 0.5) * 80;
        ty = n.y + (p.y - n.y) * k + (rng() - 0.5) * 80;
      }
      tx = ctx.tk.clampX(tx, 60); ty = ctx.tk.clampY(ty, 60);
      lobs.push({ fx: n.x, fy: n.y - 20, tx, ty, at: now, landAt: now + FLIGHT_MS });
      ctx.sfx('grenade-throw');
    };

    return {
      update(time: number) {
        const dt = clock.tick(time);
        if (nextLob < 0) nextLob = time + 1600;
        if (dt === 0) return;
        if (time >= nextLob && clouds.filter((c) => !c.dead).length < 4) {
          lob(time);
          nextLob = time + (ctx.hard ? 3000 : 3600) + rng() * 1200;
        }
        for (let i = lobs.length - 1; i >= 0; i--) {
          const l = lobs[i];
          if (time < l.landAt) continue;
          lobs.splice(i, 1);
          ctx.sfx('smoke');
          for (const f of [ctx.player, ctx.npc]) {
            if (f.active && dist(f.x, f.y, l.tx, l.ty) < 26) { ctx.hit(f, 6, f.x, f.y); ctx.float(f.x, f.y - 36, 'BONK', PCOL.smoke); }
          }
          clouds.push({ x: l.tx, y: l.ty, born: time, life: cloudLife, r: 18, seed: rng() * 50, dead: false });
        }
        const pc = cloudOf(ctx.player);
        for (const c of clouds) {
          if (c.dead) continue;
          // The player's body parts the smoke: a bank you stand in burns down three times as fast.
          const drain = pc === c ? 3 : 1;
          c.life -= dt * 1000 * drain;
          const grow = Math.min(1, (time - c.born) / 600);
          const fade = Math.min(1, c.life / 1500);
          c.r = CLOUD_R * grow * Math.max(0.2, fade);
          // Banks drift a little — the yard always has a breeze off the moat.
          c.x += Math.sin(time / 1700 + c.seed) * 6 * dt;
          if (c.life <= 0) c.dead = true;
        }
        for (let i = clouds.length - 1; i >= 0; i--) if (clouds[i].dead) clouds.splice(i, 1);

        const kh = hidden(ctx.npc, ctx.player);
        if (kh && !kitWasHidden && time - lastHiddenNote > 2500) {
          ctx.float(ctx.npc.x, ctx.npc.y - 50, 'HIDDEN', PCOL.smoke);
          lastHiddenNote = time;
        }
        kitWasHidden = kh;
      },

      playerTakenMult: () => (hidden(ctx.player, ctx.npc) ? HIDDEN_MULT : 1),
      npcTakenMult: () => (hidden(ctx.npc, ctx.player) ? HIDDEN_MULT : 1),

      npcSeek(): Pt | null {
        const n = ctx.npc;
        const pc = cloudOf(ctx.player);
        let best: Cloud | null = null;
        let bestD = 420;
        for (const c of clouds) {
          if (c.dead || c === pc || c.life < 1500 || c.r < 50) continue;
          const d = dist(n.x, n.y, c.x, c.y);
          if (d < bestD) { bestD = d; best = c; }
        }
        if (!best) return null;
        // Inside already: hold a spot near the middle, drifting a touch to stay unpredictable.
        return { x: best.x + Math.sin(ctx.tk.now / 600) * 18, y: best.y + Math.cos(ctx.tk.now / 700) * 14 };
      },

      drawGround(g: Phaser.GameObjects.Graphics, time: number) {
        for (const c of clouds) {
          // Soot ring and the spent canister lying on its side, still hissing.
          g.fillStyle(0x000000, 0.12); g.fillCircle(c.x, c.y, c.r * 0.9);
          g.fillStyle(dim(P.iron, 0.2), 1); g.fillRoundedRect(c.x - 7, c.y - 4, 14, 8, 3);
          g.fillStyle(P.redcoat, 1); g.fillRect(c.x - 2, c.y - 4, 3, 8);
          if (c.life > 1500 && Math.floor(time / 120) % 2 === 0) { g.fillStyle(P.smoke, 0.6); g.fillCircle(c.x + 9, c.y - 2, 3); }
        }
        for (const l of lobs) {
          // The landing spot and a shadow that tightens as the canister drops.
          const k = Math.min(1, (time - l.at) / FLIGHT_MS);
          g.lineStyle(1.5, P.smoke, 0.5); g.strokeCircle(l.tx, l.ty, 26);
          g.fillStyle(0x000000, 0.15 + k * 0.25); g.fillEllipse(l.tx, l.ty, 10 + k * 14, 5 + k * 6);
        }
      },

      drawAir(g: Phaser.GameObjects.Graphics, time: number) {
        for (const l of lobs) {
          const k = Math.min(1, (time - l.at) / FLIGHT_MS);
          const x = l.fx + (l.tx - l.fx) * k;
          const y = l.fy + (l.ty - l.fy) * k - Math.sin(k * Math.PI) * 120;
          // Tumbling canister with a ribbon of smoke trailing off its fuse.
          const spin = time / 60;
          g.fillStyle(P.iron, 1);
          g.fillRect(x - 5 + Math.cos(spin) * 2, y - 7, 10, 14);
          g.fillStyle(P.redcoat, 1); g.fillRect(x - 5, y - 2, 10, 3);
          g.fillStyle(P.smoke, 0.5); g.fillCircle(x - (l.tx - l.fx) * 0.02, y + 6, 4);
        }
        const pc = cloudOf(ctx.player);
        const nc = cloudOf(ctx.npc);
        for (const c of clouds) {
          const kitIn = nc === c && pc !== c;
          const youIn = pc === c;
          const base = kitIn ? 0.8 : youIn ? 0.32 : 0.6;
          const a = base * Math.min(1, c.life / 1200);
          for (let i = 0; i < 7; i++) {
            const ang = c.seed + i * 0.9 + time / (3000 + i * 300);
            const rr = c.r * (0.35 + (i % 3) * 0.12);
            drawPuff(g, c.x + Math.cos(ang) * c.r * 0.42, c.y + Math.sin(ang) * c.r * 0.3, rr, i % 2 ? P.smoke : lit(P.smoke, 0.1), a * 0.55, Math.floor(c.seed) + i);
          }
          if (kitIn && Math.floor((time + c.seed * 40) / 1300) % 3 === 0) {
            // Two eye glints in the murk where he is.
            g.fillStyle(P.sparkHot, 0.9);
            g.fillCircle(ctx.npc.x - 5, ctx.npc.y - 4, 2); g.fillCircle(ctx.npc.x + 5, ctx.npc.y - 4, 2);
          }
          if (youIn) {
            // A thin outline so you never lose yourself in your own fog.
            g.lineStyle(1.5, P.sparkHot, 0.5); g.strokeCircle(ctx.player.x, ctx.player.y, 26);
          }
        }
      },
    };
  },
};
