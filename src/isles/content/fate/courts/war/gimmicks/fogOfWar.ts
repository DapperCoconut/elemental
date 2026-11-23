import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { glow } from '../../../../../art/IsleArt';
import { lantern } from '../art';
import { BAIZE_DARK, CANVAS, FOG, GILT, INK, LAMP, RED, TIMBER_DARK } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Fog of War — Scout Feint.
 *
 * The yard is fogged in. You carry a little light of your own; three scouts' lanterns walk their
 * rounds through the murk; everything else is grey. Feint keeps to the dark, and he is only to be
 * seen when one of the lanterns finds him (or when he comes close enough to your own light) —
 * and a scout who finds him calls it out: while a lantern is on him he is *spotted*, and every
 * blow on him lands a quarter harder. The map table in the corner shows the rounds, and a red chip
 * where he was last seen.
 *
 * Strike a lantern and its scout throws the shutters wide: it flares for a few seconds, lighting
 * twice as far. Feint, for his part, leaves decoys in the fog — painted cut-outs of himself that
 * fold flat the moment a light touches them.
 */

interface Scout { cx: number; cy: number; rx: number; ry: number; speed: number; ph: number; x: number; y: number; flareUntil: number; t: StrikeTarget }
interface Decoy { x: number; y: number; bornAt: number; foldAt: number }

const CELL = 32;
const SELF_R = 130;
const LANTERN_R = 104;
const FLARE_R = 200;
const FLARE_MS = 3000;

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const SPOT = 1.28;
  const scouts: Scout[] = [];
  const decoys: Decoy[] = [];
  let spotted = false;
  let lastSeen: Pt | null = null;
  let lastSeenAt = -9999;
  let nextDecoy = 0;
  let started = false;

  const rounds: [number, number, number, number, number][] = [
    [W * 0.25, (top + H) / 2, 170, 150, 0.32],
    [W * 0.72, top + 170, 210, 70, -0.28],
    [W * 0.6, H - 130, 260, 80, 0.24],
  ];
  for (const [cx, cy, rx, ry, speed] of rounds) {
    const s: Scout = { cx, cy, rx, ry, speed, ph: rng() * Math.PI * 2, x: cx, y: cy, flareUntil: 0, t: null as unknown as StrikeTarget };
    s.t = ctx.target({
      x: cx, y: cy, r: 18, passThrough: true,
      onStruck() {
        const now = ctx.scene.time.now;
        if (now < s.flareUntil - FLARE_MS + 600) return;
        s.flareUntil = now + FLARE_MS;
        ctx.sfx('light-beam');
        ctx.float(s.x, s.y - 40, 'SHUTTERS OPEN', '#ffd890');
      },
    });
    scouts.push(s);
  }

  const lightR = (s: Scout, time: number) => (time < s.flareUntil ? FLARE_R : LANTERN_R);
  const lights = (time: number): [number, number, number][] => [
    [player.x, player.y, SELF_R],
    ...scouts.map((s) => [s.x, s.y, lightR(s, time)] as [number, number, number]),
  ];
  const litAt = (x: number, y: number, time: number) => lights(time).some(([lx, ly, r]) => dist(lx, ly, x, y) < r);

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextDecoy = time + 4000; }
      for (const s of scouts) {
        s.ph += s.speed * dt;
        s.x = clamp(s.cx + Math.cos(s.ph) * s.rx, 40, W - 40);
        s.y = clamp(s.cy + Math.sin(s.ph) * s.ry, top + 40, H - 30);
        s.t.moveTo(s.x, s.y - 30);
      }
      // Is a lantern on him?
      const was = spotted;
      spotted = alive(npc) && scouts.some((s) => dist(s.x, s.y, npc.x, npc.y) < lightR(s, time));
      if (spotted || (alive(npc) && dist(player.x, player.y, npc.x, npc.y) < SELF_R)) { lastSeen = { x: npc.x, y: npc.y }; lastSeenAt = time; }
      if (spotted && !was) { ctx.float(npc.x, npc.y - 56, 'SPOTTED!', '#ff8a7a'); ctx.sfx('screech'); }

      // Decoys: cut-outs of Feint left in the dark.
      if (time >= nextDecoy) {
        nextDecoy = time + (ctx.hard ? 4800 : 6200);
        for (let k = 0; k < 2; k++) {
          for (let tries = 0; tries < 8; tries++) {
            const x = 70 + rng() * (W - 140), y = top + 60 + rng() * (H - top - 100);
            if (litAt(x, y, time) || dist(x, y, player.x, player.y) < 220) continue;
            decoys.push({ x, y, bornAt: time, foldAt: -1 });
            break;
          }
        }
        if (decoys.length > 6) decoys.splice(0, decoys.length - 6);
      }
      for (let i = decoys.length - 1; i >= 0; i--) {
        const d = decoys[i];
        if (d.foldAt < 0 && litAt(d.x, d.y, time)) { d.foldAt = time; ctx.float(d.x, d.y - 50, 'A CUT-OUT', '#d8cbaa'); ctx.sfx('snap-back'); }
        if (d.foldAt >= 0 && time - d.foldAt > 600) decoys.splice(i, 1);
        else if (time - d.bornAt > 20000) decoys.splice(i, 1);
      }
    },

    npcTakenMult() { return spotted ? SPOT : 1; },

    npcSeek() {
      // Keep to the dark, a fair way off you, out of every lantern's round.
      const now = ctx.scene.time.now;
      let best: Pt | null = null;
      let bs = -Infinity;
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const x = clamp(player.x + Math.cos(a) * 250, 60, W - 60), y = clamp(player.y + Math.sin(a) * 200, top + 50, H - 40);
        let score = -dist(x, y, npc.x, npc.y) * 0.3;
        for (const s of scouts) score += Math.min(0, dist(x, y, s.x, s.y) - lightR(s, now) - 40) * 2;
        if (score > bs) { bs = score; best = { x, y }; }
      }
      return best;
    },

    drawGround(g, time) {
      // Decoys: flat painted boards of a cloaked scout on a stake, folding when found.
      for (const d of decoys) {
        const k = d.foldAt >= 0 ? clamp((time - d.foldAt) / 600, 0, 1) : 0;
        const h = 1 - k;
        g.fillStyle(0x000000, 0.25); g.fillEllipse(d.x, d.y + 2, 30, 8);
        g.fillStyle(TIMBER_DARK, 1); g.fillRect(d.x - 1.5, d.y - 10, 3, 10);
        g.fillStyle(0x3a3050, 1); g.fillEllipse(d.x, d.y - 24 * h - 6, 26, 36 * h);
        g.fillStyle(0xd8b08a, 1); g.fillCircle(d.x, d.y - 46 * h - 6, 7 * h);
        g.fillStyle(0x6a50a0, 1); g.fillTriangle(d.x - 9, d.y - 46 * h - 6, d.x + 9, d.y - 46 * h - 6, d.x, d.y - 62 * h - 6);
      }
    },

    drawAir(g, time) {
      // The fog: a grid of grey, thinned round every light.
      const ls = lights(time);
      for (let y = top; y < H; y += CELL) {
        for (let x = 0; x < W; x += CELL) {
          const cx = x + CELL / 2, cy = y + CELL / 2;
          let vis = 0;
          for (const [lx, ly, r] of ls) {
            const v = clamp((r - dist(lx, ly, cx, cy)) / (r * 0.4), 0, 1);
            if (v > vis) vis = v;
          }
          if (vis >= 1) continue;
          const drift = Math.sin(time / 1400 + cx * 0.013 + cy * 0.021) * 0.04;
          g.fillStyle(FOG, clamp(0.9 * (1 - vis) + drift, 0, 0.94));
          g.fillRect(x, y, CELL, CELL);
        }
      }
      // Wisps drifting over the grey.
      for (let i = 0; i < 10; i++) {
        const x = ((time / 40 + i * 137) % (W + 200)) - 100, y = top + 40 + ((i * 89) % (H - top - 80));
        g.fillStyle(0xb8b2a6, 0.08); g.fillEllipse(x, y, 160, 30);
      }
      // Lanterns on their stakes, scouts' hands on the shutters.
      for (const s of scouts) {
        const flare = time < s.flareUntil;
        glow(g, s.x, s.y - 30, flare ? 60 : 34, LAMP, flare ? 0.09 : 0.06, 3);
        g.fillStyle(0x2a2632, 1); g.fillEllipse(s.x - 10, s.y - 14, 14, 26);
        g.fillStyle(0xd8b08a, 1); g.fillCircle(s.x - 10, s.y - 30, 5);
        lantern(g, s.x, s.y - 26, flare ? 1 : 0.75 + Math.sin(time / 160 + s.ph) * 0.1);
      }
      // A spotted Feint: a ring of lantern light picked out round him.
      if (spotted && alive(npc)) { g.lineStyle(2, RED, 0.6 + Math.sin(time / 90) * 0.3); g.strokeCircle(npc.x, npc.y - 8, 30); }
    },

    drawHud(g, time) {
      // The map table: a little chart of the yard with the rounds and the last sighting.
      const mw = 150, mh = 90, mx = W - mw - 14, my = H - mh - 14;
      g.fillStyle(TIMBER_DARK, 0.95); g.fillRoundedRect(mx - 6, my - 6, mw + 12, mh + 12, 6);
      g.fillStyle(CANVAS, 1); g.fillRect(mx, my, mw, mh);
      g.fillStyle(BAIZE_DARK, 0.35); g.fillEllipse(mx + mw / 2, my + mh / 2, mw * 0.85, mh * 0.7);
      const sx = mw / W, sy = mh / (H - top);
      for (const s of scouts) {
        g.lineStyle(1, INK, 0.3); g.strokeEllipse(mx + s.cx * sx, my + (s.cy - top) * sy, s.rx * 2 * sx, s.ry * 2 * sy);
        g.fillStyle(GILT, 1); g.fillCircle(mx + s.x * sx, my + (s.y - top) * sy, 3);
      }
      g.fillStyle(INK, 1); g.fillCircle(mx + player.x * sx, my + (player.y - top) * sy, 3);
      if (lastSeen) {
        const fade = clamp(1 - (time - lastSeenAt) / 6000, 0.25, 1);
        g.fillStyle(RED, fade); g.fillCircle(mx + lastSeen.x * sx, my + (lastSeen.y - top) * sy, 4);
        g.lineStyle(1, 0xffffff, fade); g.strokeCircle(mx + lastSeen.x * sx, my + (lastSeen.y - top) * sy, 4);
      }
    },

    destroy() { for (const s of scouts) s.t.remove(); },
  };
}

export const FOG_OF_WAR: GimmickDef = {
  id: 'war-fog-of-war',
  rules: 'The yard is fogged; Feint is seen only in a lantern\'s light or yours. Spotted by a lantern, he takes +28% damage. Strike a lantern to throw its shutters wide.',
  make,
};
