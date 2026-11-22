import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, glow, mixC } from '../../../../../art/IsleArt';
import { magnetDisc, poly, rivets } from '../art';
import { COIL, COIL_LIT, IRON, IRON_DARK, IRON_LIT, IRON_SHEEN, RUST, RUST_LIT, TIMBER_DARK } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Scrap Magnet — Scrapper Rusk.
 *
 * An overhead crane runs its electromagnet back and forth across the yard in rows, like a man
 * mowing. It switches on and off on a clock: first the coil glows and hums (its shadow on the
 * floor marks where it will bite), then it is live. Anyone under a live magnet is lifted — held
 * fast and dragged along with it — and dropped hard when the current cuts.
 *
 * Scrap lies all over the yard, and the live magnet sweeps it up too. When the current cuts, every
 * piece it gathered flies out in a burst of shrapnel from where it lets go — at anybody standing
 * round it. Lead Rusk under the magnet's path, and be somewhere else when it lets go.
 */

const MAG_R = 62;
const PICK_R = 96;
const OFF_MS = 2300;
const CHARGE_MS = 1000;
const LIVE_MS = 2500;
const SPEED = 150;
const ROW_STEP = 120;
const MAX_HOLD_MS = 1700;
const DROP_DMG = 12;
const DROP_STUN = 500;
const SHRAP_DMG = 7;

type MagState = 'off' | 'charge' | 'live';
interface Scrap { x: number; y: number; kind: number; a: number; stuck: boolean; vx: number; vy: number; flyUntil: number; hit: Set<Fighter> }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { tk, player, npc, rng, W, H, top } = ctx;
  const XL = 90, XR = W - 90, YT = top + 70, YB = H - 70;
  let mx = XL, my = YT;
  let dirX = 1, dirY = 1;
  let rowTarget = YT;
  let state: MagState = 'off';
  let stateAt = 0;
  let started = false;
  const held = new Map<Fighter, number>();
  const scrap: Scrap[] = [];
  const speed = ctx.hard ? SPEED * 1.2 : SPEED;

  function scatter(n: number): void {
    for (let i = 0; i < n; i++) {
      scrap.push({ x: 70 + rng() * (W - 140), y: top + 50 + rng() * (H - top - 100), kind: Math.floor(rng() * 4), a: rng() * 6, stuck: false, vx: 0, vy: 0, flyUntil: 0, hit: new Set() });
    }
  }

  function drop(time: number): void {
    for (const [f] of held) {
      if (!alive(f)) continue;
      if (f === player) tk.hitPlayer(DROP_DMG, f.x, f.y); else ctx.hit(f, DROP_DMG, f.x, f.y);
      ctx.stun(f, DROP_STUN);
      ctx.float(f.x, f.y - 46, 'DROPPED', '#c8e8ff');
      ctx.flash(f.x, f.y, COIL_LIT);
    }
    held.clear();
    const stuck = scrap.filter((s) => s.stuck);
    if (stuck.length) ctx.sfx('explosion-small');
    stuck.forEach((s, i) => {
      const a = (i / stuck.length) * Math.PI * 2 + rng() * 0.3;
      s.stuck = false;
      s.x = mx + Math.cos(a) * 20; s.y = my + Math.sin(a) * 20;
      s.vx = Math.cos(a) * 330; s.vy = Math.sin(a) * 330;
      s.flyUntil = time + 750;
      s.hit = new Set();
    });
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; stateAt = time; scatter(ctx.hard ? 14 : 11); }

      // The crane mows the yard: along a row, step down (or up), back along the next.
      if (Math.abs(my - rowTarget) > 1) {
        my += clamp(rowTarget - my, -speed * dt, speed * dt);
      } else {
        mx += dirX * speed * dt;
        if (mx > XR || mx < XL) {
          mx = clamp(mx, XL, XR);
          dirX = -dirX as 1 | -1;
          let ny = rowTarget + dirY * ROW_STEP;
          if (ny > YB || ny < YT) { dirY = -dirY as 1 | -1; ny = rowTarget + dirY * ROW_STEP; }
          rowTarget = clamp(ny, YT, YB);
        }
      }

      // The current.
      const age = time - stateAt;
      if (state === 'off' && age > OFF_MS) { state = 'charge'; stateAt = time; ctx.sfx('electric-charge'); }
      else if (state === 'charge' && age > tk.warn(CHARGE_MS)) { state = 'live'; stateAt = time; ctx.sfx('magnet-pull'); }
      else if (state === 'live' && age > LIVE_MS) { state = 'off'; stateAt = time; drop(time); }

      if (state === 'live') {
        for (const f of [player, npc]) {
          if (!alive(f)) continue;
          const d = dist(f.x, f.y, mx, my);
          const since = held.get(f);
          if (since === undefined && d < MAG_R) {
            held.set(f, time);
            ctx.float(f.x, f.y - 46, 'LIFTED', '#c8e8ff');
            ctx.sfx('magnet-pull');
          }
          const h = held.get(f);
          if (h !== undefined) {
            if (time - h > MAX_HOLD_MS) {
              // Slips off the side before the current cuts: a short fall.
              held.delete(f);
              if (f === player) tk.hitPlayer(DROP_DMG * 0.5, f.x, f.y); else ctx.hit(f, DROP_DMG * 0.5, f.x, f.y);
              ctx.stun(f, 250);
              continue;
            }
            ctx.stun(f, 120);
            ctx.nudge(f, (mx - f.x) * Math.min(1, dt * 12), (my - f.y) * Math.min(1, dt * 12));
          }
        }
        for (const s of scrap) {
          if (s.stuck || time < s.flyUntil) continue;
          if (dist(s.x, s.y, mx, my) < PICK_R) { s.stuck = true; s.a = rng() * Math.PI * 2; }
        }
      }

      // Flying shrapnel.
      for (const s of scrap) {
        if (time >= s.flyUntil) continue;
        s.x += s.vx * dt; s.y += s.vy * dt;
        if (s.x < 40 || s.x > W - 40) { s.vx = -s.vx; s.x = clamp(s.x, 40, W - 40); }
        if (s.y < top + 20 || s.y > H - 30) { s.vy = -s.vy; s.y = clamp(s.y, top + 20, H - 30); }
        for (const f of [player, npc]) {
          if (!alive(f) || s.hit.has(f)) continue;
          if (dist(s.x, s.y, f.x, f.y) < 24) {
            s.hit.add(f);
            if (f === player) tk.hitPlayer(SHRAP_DMG, s.x, s.y); else ctx.hit(f, SHRAP_DMG, s.x, s.y);
          }
        }
        s.a += dt * 14;
      }
    },

    npcSeek() {
      const live = state !== 'off';
      const d = dist(npc.x, npc.y, mx, my);
      // Get out from under it before it bites.
      if (live && d < MAG_R + 80) {
        const a = Math.atan2(npc.y - my, npc.x - mx);
        return { x: clamp(mx + Math.cos(a) * 220, 60, W - 60), y: clamp(my + Math.sin(a) * 200, top + 50, H - 50) };
      }
      // Near the end of a live spell, stand so the player is between the magnet and you.
      const a = Math.atan2(player.y - my, player.x - mx);
      const p: Pt = { x: player.x + Math.cos(a) * 170, y: player.y + Math.sin(a) * 170 };
      if (dist(p.x, p.y, mx, my) < MAG_R + 90) { p.x = player.x - Math.cos(a) * 170; p.y = player.y - Math.sin(a) * 170; }
      return { x: clamp(p.x, 60, W - 60), y: clamp(p.y, top + 50, H - 50) };
    },

    drawGround(g, time) {
      // The crane's runways down both sides of the yard.
      for (const x of [26, W - 26]) {
        g.fillStyle(IRON_DARK, 1); g.fillRect(x - 8, top, 16, H - top);
        g.fillStyle(IRON_SHEEN, 0.5); g.fillRect(x - 2, top, 3, H - top);
        rivets(g, x, top + 12, x, H - 12, 18, 1.2);
      }
      // The bridge's shadow across the yard at the magnet's row.
      g.fillStyle(0x000000, 0.16); g.fillRect(0, my + 28, W, 12);
      // Scrap lying about.
      for (const s of scrap) if (!s.stuck && time >= s.flyUntil) drawScrap(g, s.x, s.y, s.kind, s.a, 1);
      // The magnet's footprint: where it will bite.
      if (state === 'charge') {
        const k = clamp((time - stateAt) / tk.warn(CHARGE_MS), 0, 1);
        g.fillStyle(COIL, 0.08 + k * 0.12); g.fillCircle(mx, my, MAG_R);
        g.lineStyle(2, COIL_LIT, 0.4 + k * 0.5); g.strokeCircle(mx, my, MAG_R + (1 - k) * 40);
      } else if (state === 'live') {
        g.fillStyle(COIL, 0.16); g.fillCircle(mx, my, MAG_R);
        g.lineStyle(2, COIL_LIT, 0.6); g.strokeCircle(mx, my, MAG_R);
        g.lineStyle(1, COIL_LIT, 0.25); g.strokeCircle(mx, my, PICK_R);
        // Field lines tugging inward.
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2 + time / 600;
          const ph = (time / 400 + i / 10) % 1;
          const r = PICK_R * (1 - ph);
          g.lineStyle(1.5, COIL_LIT, 0.5 * ph); g.lineBetween(mx + Math.cos(a) * r, my + Math.sin(a) * r, mx + Math.cos(a) * (r - 14), my + Math.sin(a) * (r - 14));
        }
      } else {
        g.fillStyle(0x000000, 0.2); g.fillEllipse(mx, my + 6, MAG_R * 1.4, MAG_R * 0.5);
      }
    },

    drawAir(g, time) {
      // Shrapnel in flight.
      for (const s of scrap) {
        if (time >= s.flyUntil) continue;
        g.lineStyle(2, RUST_LIT, 0.4); g.lineBetween(s.x, s.y, s.x - s.vx * 0.04, s.y - s.vy * 0.04);
        drawScrap(g, s.x, s.y, s.kind, s.a, 1);
      }
      // The bridge beam overhead, the trolley, the magnet.
      g.fillStyle(IRON_DARK, 0.9); g.fillRect(0, my - 64, W, 14);
      g.fillStyle(IRON, 0.9); g.fillRect(0, my - 64, W, 4);
      for (let x = 10; x < W; x += 30) { g.lineStyle(1.5, IRON_LIT, 0.4); g.lineBetween(x, my - 60, x + 15, my - 50); }
      g.fillStyle(TIMBER_DARK, 1); g.fillRect(mx - 26, my - 72, 52, 12);
      g.lineStyle(2, IRON_LIT, 1); g.lineBetween(mx - 10, my - 60, mx - 18, my - 26); g.lineBetween(mx + 10, my - 60, mx + 18, my - 26);
      const live = state === 'live' ? 1 : state === 'charge' ? clamp((time - stateAt) / tk.warn(CHARGE_MS), 0, 1) * 0.6 : 0;
      magnetDisc(g, mx, my - 18, 36, live);
      // Scrap clinging to its underside.
      let k = 0;
      for (const s of scrap) {
        if (!s.stuck) continue;
        const a = k * 2.4 + time / 1200;
        drawScrap(g, mx + Math.cos(a) * 30, my - 18 + Math.sin(a) * 18, s.kind, s.a, 0.9);
        k++;
      }
      // Anyone held: a blue tether and a little dangle.
      for (const [f] of held) {
        if (!alive(f)) continue;
        g.lineStyle(3, COIL_LIT, 0.6 + Math.sin(time / 50) * 0.2); g.lineBetween(mx, my - 4, f.x, f.y - 20);
        glow(g, f.x, f.y - 10, 34, COIL, 0.05, 3);
      }
      if (state === 'charge') {
        // The hum: arcs crackling round the coil.
        for (let i = 0; i < 4; i++) {
          const a = time / 80 + i * 1.6;
          g.lineStyle(1.5, COIL_LIT, 0.8);
          g.lineBetween(mx + Math.cos(a) * 30, my - 18 + Math.sin(a) * 18, mx + Math.cos(a + 0.4) * 44, my - 18 + Math.sin(a + 0.4) * 26);
        }
      }
    },

    drawHud(g, time) {
      // The crane's current: a small dial in the corner.
      const x = W - 40, y = top + 26;
      g.fillStyle(0x000000, 0.5); g.fillCircle(x, y, 16);
      const col = state === 'live' ? COIL_LIT : state === 'charge' ? COIL : dim(COIL, 0.6);
      g.lineStyle(3, col, 1);
      const span = state === 'off' ? (time - stateAt) / OFF_MS : state === 'charge' ? 1 : 1 - (time - stateAt) / LIVE_MS;
      g.beginPath(); g.arc(x, y, 12, -Math.PI / 2, -Math.PI / 2 + clamp(span, 0, 1) * Math.PI * 2, false); g.strokePath();
      g.fillStyle(col, 1); g.fillCircle(x, y, 4);
    },
  };
}

/** One piece of scrap: a gear, a plate, a bent bar or a horseshoe. */
function drawScrap(g: Phaser.GameObjects.Graphics, x: number, y: number, kind: number, a: number, s: number): void {
  const c = mixC(IRON, RUST, ((kind * 37) % 10) / 14);
  switch (kind) {
    case 0: {
      for (let t = 0; t < 8; t++) { const b = a + (t / 8) * Math.PI * 2; g.fillStyle(c, 1); g.fillRect(x + Math.cos(b) * 7 * s - 1.5, y + Math.sin(b) * 7 * s - 1.5, 3, 3); }
      g.fillStyle(c, 1); g.fillCircle(x, y, 6 * s);
      g.fillStyle(dim(c, 0.5), 1); g.fillCircle(x, y, 2 * s);
      break;
    }
    case 1:
      poly(g, [
        { x: x + Math.cos(a) * 9 * s, y: y + Math.sin(a) * 9 * s }, { x: x + Math.cos(a + 1.7) * 6 * s, y: y + Math.sin(a + 1.7) * 6 * s },
        { x: x + Math.cos(a + 3.3) * 9 * s, y: y + Math.sin(a + 3.3) * 9 * s }, { x: x + Math.cos(a + 4.8) * 5 * s, y: y + Math.sin(a + 4.8) * 5 * s },
      ], c);
      break;
    case 2:
      g.lineStyle(3 * s, c, 1);
      g.lineBetween(x - Math.cos(a) * 9 * s, y - Math.sin(a) * 9 * s, x, y); g.lineBetween(x, y, x + Math.cos(a + 0.8) * 8 * s, y + Math.sin(a + 0.8) * 8 * s);
      break;
    default:
      g.lineStyle(3 * s, c, 1); g.beginPath(); g.arc(x, y, 6 * s, a, a + Math.PI * 1.3, false); g.strokePath();
  }
}

export const SCRAP_MAGNET: GimmickDef = {
  id: 'forge-scrap-magnet',
  rules: 'An electromagnet crane mows the yard. Live, it lifts whoever is under it and drops them hard — and the scrap it gathered bursts out as shrapnel where it lets go.',
  make,
};
