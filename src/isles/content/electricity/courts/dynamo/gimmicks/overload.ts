import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, Rect } from '../../../../../IslesTypes';
import { glow } from '../../../../../art/IsleArt';
import { bolt, fuseBox, fuseCartridge, sparks } from '../art';
import { ARC, COIL_HOT, FILAMENT, SPARK } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Overload — Fusewright Amp.
 *
 * Six fuseboxes are bolted round the walls of the Fuse House yard. Every blow that lands near
 * one runs current into it — the harder the hit and the closer the box, the faster its filament
 * heats. A box that fills to the top hums, glows white, and blows: a burst of arc and flame the
 * length of its wall. Fight near a hot box and you are feeding the bang you are standing in.
 *
 * Amp makes fuses, and fuses come out. Strike a box that is at least a third full and you pull
 * its fuse — the box goes cold (even one about to blow) and you are holding a fizzing cartridge.
 * A moment later you lob it at the other fighter: the fuller the box was, the bigger it goes. But
 * take a solid hit while you are holding one and it goes off in your hand.
 */

type Wall = 'n' | 's' | 'w' | 'e';
interface Box { x: number; y: number; wall: Wall; band: Rect; fill: number; warnAt: number; blownAt: number }
interface Held { box: number; fill: number; since: number }
interface Lob { by: Fighter; fx: number; fy: number; tx: number; ty: number; at: number; landAt: number; fill: number }

const BOX_R = 26;
const PULL_MIN = 35;
const HOLD_MS = 1600;
const LOB_MS = 650;
const LOB_R = 76;

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const cy = (top + H) / 2;
  const mk = (x: number, y: number, wall: Wall): Box => {
    const band: Rect = wall === 'n' ? { x: x - 220, y: top, w: 440, h: 130 }
      : wall === 's' ? { x: x - 220, y: H - 130, w: 440, h: 130 }
        : wall === 'w' ? { x: 0, y: cy - 190, w: 130, h: 380 }
          : { x: W - 130, y: cy - 190, w: 130, h: 380 };
    return { x, y, wall, band, fill: 0, warnAt: -1, blownAt: -9999 };
  };
  const boxes: Box[] = [
    mk(240, top + 24, 'n'), mk(W - 240, top + 24, 'n'), mk(240, H - 24, 's'), mk(W - 240, H - 24, 's'),
    mk(24, cy, 'w'), mk(W - 24, cy, 'e'),
  ];
  const warnMs = ctx.hard ? 800 : 1000;
  const blastDmg = ctx.hard ? 20 : 16;
  const held = new Map<Fighter, Held>();
  const lobs: Lob[] = [];
  const booms: { x: number; y: number; r: number; at: number }[] = [];

  const other = (f: Fighter) => (f === player ? npc : player);
  const inRect = (r: Rect, x: number, y: number) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

  function hurt(f: Fighter, n: number, x: number, y: number): void {
    if (f === player) tk.hitPlayer(n, x, y);
    else ctx.hit(f, n, x, y);
  }

  /** Current from a blow runs into every box near where it landed. */
  function feed(x: number, y: number, amount: number): void {
    for (const b of boxes) {
      if (b.warnAt >= 0 || ctx.scene.time.now - b.blownAt < 1500) continue;
      const d = dist(b.x, b.y, x, y);
      if (d < 320) b.fill = clamp(b.fill + amount * 2.6 * (1 - d / 320), 0, 100);
    }
  }

  function blow(b: Box, time: number): void {
    b.warnAt = -1; b.fill = 0; b.blownAt = time;
    ctx.sfx('explosion-medium');
    booms.push({ x: b.band.x + b.band.w / 2, y: b.band.y + b.band.h / 2, r: Math.max(b.band.w, b.band.h) / 2, at: time });
    for (const f of [player, npc]) {
      if (!alive(f) || !inRect(b.band, f.x, f.y)) continue;
      hurt(f, blastDmg, f.x, f.y);
      const push = b.wall === 'n' ? [0, 90] : b.wall === 's' ? [0, -90] : b.wall === 'w' ? [90, 0] : [-90, 0];
      ctx.nudge(f, push[0], push[1]);
    }
  }

  /** The fuse goes off in the hand of whoever is holding it. */
  function fizzle(f: Fighter): void {
    const h = held.get(f);
    if (!h) return;
    held.delete(f);
    booms.push({ x: f.x, y: f.y, r: 40, at: ctx.scene.time.now });
    ctx.float(f.x, f.y - 50, 'IN THE HAND!', '#ffb070');
    ctx.sfx('explosion-small');
    hurt(f, 8, f.x, f.y);
  }

  /** A blow on a box a third full pulls its fuse into the striker's hand; the box goes cold. */
  function pull(b: Box, f: Fighter): void {
    if (!alive(f) || held.has(f) || b.fill < PULL_MIN) return;
    const time = tk.now;
    held.set(f, { box: boxes.indexOf(b), fill: b.fill, since: time });
    b.fill = 0; b.warnAt = -1; b.blownAt = time;
    ctx.sfx('snap-back');
    ctx.float(f.x, f.y - 48, 'FUSE PULLED', '#ffe9a8');
  }

  for (const b of boxes) {
    ctx.target({ x: b.x, y: b.y, r: BOX_R, onStruck: (by) => pull(b, by === 'player' ? player : npc) });
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      for (const b of boxes) {
        // A slow trickle off the yard's own load.
        if (b.warnAt < 0 && time - b.blownAt > 1500) b.fill = clamp(b.fill + 2 * dt, 0, 100);
        if (b.warnAt < 0 && b.fill >= 100) { b.warnAt = time; ctx.sfx('beam-charge'); ctx.float(b.x, b.y + (b.wall === 'n' ? 40 : -40), 'OVERLOAD', '#ffe070'); }
        if (b.warnAt >= 0 && time >= b.warnAt + warnMs) blow(b, time);
      }
      // Held fuses get thrown.
      for (const [f, h] of held) {
        if (!alive(f)) { held.delete(f); continue; }
        if (time - h.since < HOLD_MS) continue;
        held.delete(f);
        const t = other(f);
        if (!alive(t)) continue;
        lobs.push({ by: f, fx: f.x, fy: f.y - 20, tx: t.x, ty: t.y, at: time, landAt: time + LOB_MS, fill: h.fill });
        ctx.sfx('grenade-throw');
      }
      for (let i = lobs.length - 1; i >= 0; i--) {
        const l = lobs[i];
        if (time < l.landAt) continue;
        lobs.splice(i, 1);
        const r = LOB_R * (0.8 + l.fill / 250);
        booms.push({ x: l.tx, y: l.ty, r, at: time });
        ctx.sfx('explosion-medium');
        for (const f of [player, npc]) {
          if (!alive(f) || dist(f.x, f.y, l.tx, l.ty) > r + 14) continue;
          hurt(f, Math.round(11 + (l.fill / 100) * 11), f.x, f.y);
        }
      }
      for (let i = booms.length - 1; i >= 0; i--) if (time - booms[i].at > 600) booms.splice(i, 1);
    },

    onPlayerHurt(amount) {
      feed(player.x, player.y, amount);
      if (amount >= 5 && held.has(player)) fizzle(player);
    },
    onNpcHurt(amount) {
      feed(npc.x, npc.y, amount);
      if (amount >= 5 && held.has(npc)) fizzle(npc);
    },

    npcSeek() {
      if (!alive(player)) return null;
      const avoid = (p: Pt): Pt => {
        for (const b of boxes) {
          if (b.warnAt < 0 || !inRect(b.band, p.x, p.y)) continue;
          if (b.wall === 'n') p.y = b.band.y + b.band.h + 50;
          else if (b.wall === 's') p.y = b.band.y - 50;
          else if (b.wall === 'w') p.x = b.band.x + b.band.w + 50;
          else p.x = b.band.x - 50;
        }
        return { x: clamp(p.x, 60, W - 60), y: clamp(p.y, top + 50, H - 40) };
      };
      // Holding one: keep a throw's distance.
      if (held.has(npc)) {
        const a = Math.atan2(npc.y - player.y, npc.x - player.x);
        return avoid({ x: player.x + Math.cos(a) * 250, y: player.y + Math.sin(a) * 220 });
      }
      // A hot box near him: go and pull it — especially one about to blow on the player.
      const hot = boxes
        .filter((b) => b.fill >= 45 && dist(b.x, b.y, npc.x, npc.y) < 400)
        .sort((a, b) => b.fill - a.fill)[0];
      if (hot && !(hot.warnAt >= 0 && inRect(hot.band, player.x, player.y))) return { x: hot.x + (hot.wall === 'e' ? -28 : hot.wall === 'w' ? 28 : 0), y: hot.y + (hot.wall === 'n' ? 28 : hot.wall === 's' ? -28 : 0) };
      // Otherwise press in, but never into a warning band.
      const a = Math.atan2(npc.y - player.y, npc.x - player.x);
      return avoid({ x: player.x + Math.cos(a) * 170, y: player.y + Math.sin(a) * 150 });
    },

    drawGround(g, time) {
      for (const b of boxes) {
        // The wall's band: scorched, and striped bright when its box is about to blow.
        if (b.warnAt >= 0) {
          const k = clamp((time - b.warnAt) / warnMs, 0, 1);
          g.fillStyle(COIL_HOT, 0.1 + k * 0.25); g.fillRect(b.band.x, b.band.y, b.band.w, b.band.h);
          g.lineStyle(3, Math.floor(time / 90) % 2 ? 0xffffff : 0xe8c838, 0.5 + k * 0.5); g.strokeRect(b.band.x, b.band.y, b.band.w, b.band.h);
        } else if (b.fill > 60) {
          g.lineStyle(2, 0xe8c838, (b.fill - 60) / 100); g.strokeRect(b.band.x + 2, b.band.y + 2, b.band.w - 4, b.band.h - 4);
        }
        // A ring round a box with enough in it to pull.
        const pullable = b.fill >= PULL_MIN;
        g.lineStyle(1.5, pullable ? FILAMENT : 0x6a6a70, pullable ? 0.6 : 0.25); g.strokeCircle(b.x, b.y, BOX_R + 12);
      }
      // Lob shadows and landing marks.
      for (const l of lobs) {
        const k = clamp((time - l.at) / LOB_MS, 0, 1);
        const r = LOB_R * (0.8 + l.fill / 250);
        g.lineStyle(2, COIL_HOT, 0.4 + k * 0.5); g.strokeCircle(l.tx, l.ty, r);
        g.fillStyle(COIL_HOT, 0.08 + k * 0.15); g.fillCircle(l.tx, l.ty, r * k);
        g.fillStyle(0x000000, 0.3); g.fillEllipse(l.fx + (l.tx - l.fx) * k, l.fy + 20 + (l.ty - l.fy) * k, 14, 6);
      }
    },

    drawAir(g, time) {
      // The boxes themselves, on the walls.
      for (const b of boxes) {
        const blownAgo = time - b.blownAt;
        fuseBox(g, b.x, b.y, 1, b.warnAt >= 0 ? 1 : b.fill / 100, blownAgo > 1500, time);
        if (b.warnAt >= 0) { glow(g, b.x, b.y, 44, 0xffffff, 0.08, 3); sparks(g, b.x, b.y, 26, time, 8, SPARK); }
        if (blownAgo < 1500) {
          for (let i = 0; i < 3; i++) {
            const ph = ((time / 700) + i / 3) % 1;
            g.fillStyle(0x2a2a2e, 0.5 * (1 - ph)); g.fillCircle(b.x + Math.sin(ph * 6 + i) * 6, b.y - ph * 40, 6 + ph * 10);
          }
        }
      }
      // Fuses in hand, fizzing.
      for (const [f] of held) if (alive(f)) fuseCartridge(g, f.x + 18, f.y - 26, -0.6 + Math.sin(time / 120) * 0.1, time);
      // Fuses in flight: a high lob.
      for (const l of lobs) {
        const k = clamp((time - l.at) / LOB_MS, 0, 1);
        const x = l.fx + (l.tx - l.fx) * k, y = l.fy + (l.ty - l.fy) * k - Math.sin(k * Math.PI) * 110;
        fuseCartridge(g, x, y, k * 12, time, 1.1);
      }
      // Bursts.
      for (const b of booms) {
        const k = clamp((time - b.at) / 600, 0, 1);
        g.fillStyle(0xffffff, 0.5 * (1 - k)); g.fillCircle(b.x, b.y, b.r * (0.3 + k * 0.6));
        g.fillStyle(COIL_HOT, 0.4 * (1 - k)); g.fillCircle(b.x, b.y, b.r * (0.5 + k * 0.7));
        for (let i = 0; i < 5; i++) {
          const a = i * 1.3 + b.at;
          bolt(g, b.x, b.y, b.x + Math.cos(a) * b.r * (0.6 + k * 0.5), b.y + Math.sin(a) * b.r * (0.6 + k * 0.5), Math.floor(time / 50) + i, 2, ARC, 1 - k, 10, false);
        }
      }
    },
  };
}

export const OVERLOAD: GimmickDef = {
  id: 'dynamo-overload',
  rules: 'Blows feed the fuseboxes near them; a full box blows along its wall. Strike a box a third full to pull its fuse and lob it at your foe. Hit while holding: it goes off.',
  make,
};
