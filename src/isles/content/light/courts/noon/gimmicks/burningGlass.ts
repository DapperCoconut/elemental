import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import type { StrikeTarget } from '../../../../../../boss/framework/StrikeTargets';
import { glow, mixC } from '../../../../../art/IsleArt';
import { glint } from '../art';
import {
  BEAM, BRASS, BRASS_DARK, BRASS_LIT, GLASS, GLASS_EDGE, GOLD, GOLD_LIT, IRON, IRON_DARK, IRON_LIT, SCORCH,
  SCORCH_DARK,
} from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Burning Glass — Lensman Kindler.
 *
 * The court's great lens hangs from a trolley on an iron gantry across the top of the square,
 * and Kindler works it. It does not aim at whoever he likes: a lens wants a *still* target, so
 * it turns to whichever fighter has been moving least lately. Its focus spot creeps across the
 * marble after them — slower than a walk — and while it sits on them it heats from gold to
 * white. At white it scorches whoever is under it, and leaves the stone brown.
 *
 * Keep moving and the lens loses interest in you. Better: each gantry tower carries an iron
 * hand-wheel. Strike one and the lens swings — hard and fast — onto your opponent, and stays on
 * them for a while however much they run. Kindler knows where the wheels are too.
 */

const SPOT_R = 46;
const CREEP = 118;
const SWING = 430;
const HEAT_S = 2.2;
const COOL_S = 0.7;
const LOCK_MS = 6000;
const SWITCH_S = 0.9;

interface Scorch { x: number; y: number; at: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  const DMG = ctx.hard ? 20 : 16;
  const lensY = top + 34;
  const spot: Pt = { x: W / 2, y: (top + H) / 2 };
  let tracked: Fighter = player;
  let heat = 0;
  let coolUntil = 0;
  let lockUntil = 0;
  let swingUntil = 0;
  let switchT = 0;
  let wheelSpin = 0;
  let wheelFx = -9999;
  let wheelCdUntil = 0;
  let scorchFx = -9999;
  const scorches: Scorch[] = [];
  const speed = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  const lastPos = new Map<Fighter, Pt>([[player, { x: player.x, y: player.y }], [npc, { x: npc.x, y: npc.y }]]);
  const other = (f: Fighter): Fighter => (f === player ? npc : player);

  /** The two towers' hand-wheels, down the side walls. */
  const wheelPts: Pt[] = [{ x: 62, y: top + 150 }, { x: W - 62, y: top + 150 }];
  const wheels: StrikeTarget[] = wheelPts.map((p, i) => ctx.target({
    x: p.x, y: p.y, r: 26,
    onStruck(by) {
      const now = ctx.scene.time.now;
      if (now < wheelCdUntil) return;
      wheelCdUntil = now + 1200;
      const victim = by === 'player' ? npc : player;
      tracked = victim;
      lockUntil = now + LOCK_MS;
      swingUntil = now + 900;
      heat = Math.max(heat * 0.5, 0.25);
      wheelSpin += (i === 0 ? 1 : -1) * Math.PI * 3;
      wheelFx = now;
      ctx.sfx('gear-turn');
      ctx.float(p.x, p.y - 40, 'SWUNG!', '#ffe17a');
      ctx.banner(victim === player ? 'THE LENS SWINGS ONTO YOU' : 'THE LENS SWINGS ONTO KINDLER', '#fff3c0');
    },
  }));

  function scorch(time: number): void {
    heat = 0;
    coolUntil = time + 650;
    scorchFx = time;
    scorches.push({ x: spot.x, y: spot.y, at: time });
    if (scorches.length > 8) scorches.shift();
    ctx.sfx('sizzle');
    ctx.flash(spot.x, spot.y, 0xffffff);
    for (const f of [player, npc]) {
      if (!alive(f) || dist(f.x, f.y, spot.x, spot.y) > SPOT_R + 16) continue;
      ctx.hit(f, DMG, f.x, f.y);
      ctx.float(f.x, f.y - 48, 'SCORCHED', '#ffffff');
    }
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      // How much each fighter has been moving lately.
      for (const f of [player, npc]) {
        const lp = lastPos.get(f);
        if (!lp) continue;
        const v = dt > 0 ? dist(lp.x, lp.y, f.x, f.y) / dt : 0;
        lp.x = f.x; lp.y = f.y;
        const s = speed.get(f) ?? 0;
        speed.set(f, s + (Math.min(v, 400) - s) * Math.min(1, dt * 1.3));
      }
      // The lens turns to the stiller fighter, unless a wheel has swung it.
      if (time >= lockUntil) {
        const o = other(tracked);
        if (alive(o) && (speed.get(o) ?? 0) + 18 < (speed.get(tracked) ?? 0)) switchT += dt; else switchT = 0;
        if (switchT > SWITCH_S || !alive(tracked)) {
          switchT = 0;
          tracked = o;
          heat *= 0.4;
          ctx.sfx('gear-turn');
          if (tracked === player) ctx.float(player.x, player.y - 52, 'THE LENS FINDS YOU', '#fff3c0');
        }
      }
      // The spot creeps after its fighter; a swing throws it fast.
      if (alive(tracked) && time >= coolUntil) {
        const sp = time < swingUntil ? SWING : CREEP * (ctx.hard ? 1.12 : 1);
        const d = dist(spot.x, spot.y, tracked.x, tracked.y);
        if (d > 1) {
          const step = Math.min(d, sp * dt);
          spot.x += ((tracked.x - spot.x) / d) * step;
          spot.y += ((tracked.y - spot.y) / d) * step;
        }
        if (d < SPOT_R) heat = Math.min(1, heat + dt / HEAT_S);
        else heat = Math.max(0, heat - dt * COOL_S);
        if (heat >= 1) scorch(time);
      } else {
        heat = Math.max(0, heat - dt * COOL_S);
      }
      wheelSpin *= Math.max(0, 1 - dt * 2.5);
      for (let i = 0; i < wheels.length; i++) wheels[i].moveTo(wheelPts[i].x, wheelPts[i].y);
    },

    npcSeek() {
      const now = ctx.scene.time.now;
      if (tracked === npc) {
        // Hot on him: make for the nearer wheel and swing it; otherwise keep moving away from the spot.
        const w = wheelPts.reduce((a, b) => (dist(a.x, a.y, npc.x, npc.y) < dist(b.x, b.y, npc.x, npc.y) ? a : b));
        if ((heat > 0.3 || now < lockUntil) && now >= wheelCdUntil) return { x: w.x + (w.x < W / 2 ? 30 : -30), y: w.y + 20 };
        const a = Math.atan2(npc.y - spot.y, npc.x - spot.x) + Math.sin(now / 700) * 0.9;
        return { x: clamp(npc.x + Math.cos(a) * 180, 70, W - 70), y: clamp(npc.y + Math.sin(a) * 180, top + 60, H - 50) };
      }
      // The lens is on you: stand off at range and make you dodge his shots while it heats.
      const a = Math.atan2(npc.y - player.y, npc.x - player.x) + Math.sin(now / 1500) * 0.5;
      return { x: clamp(player.x + Math.cos(a) * 250, 70, W - 70), y: clamp(player.y + Math.sin(a) * 220, top + 60, H - 50) };
    },

    drawGround(g, time) {
      // Old scorches, browning the marble.
      for (const s of scorches) {
        const k = clamp(1 - (time - s.at) / 9000, 0, 1);
        if (k <= 0) continue;
        g.fillStyle(SCORCH, 0.35 * k); g.fillEllipse(s.x, s.y, SPOT_R * 2.2, SPOT_R * 1.3);
        g.fillStyle(SCORCH_DARK, 0.4 * k); g.fillEllipse(s.x, s.y, SPOT_R * 1.1, SPOT_R * 0.6);
        for (let i = 0; i < 6; i++) { const a = i * 1.05 + s.x; g.lineStyle(1, SCORCH_DARK, 0.5 * k); g.lineBetween(s.x, s.y, s.x + Math.cos(a) * SPOT_R * 0.9, s.y + Math.sin(a) * SPOT_R * 0.5); }
      }
      // The focus spot: gold, swelling and whitening as it heats; a caustic ring round it.
      const c = mixC(GOLD, 0xffffff, heat);
      const pulse = 0.5 + 0.5 * Math.sin(time / (140 - heat * 90));
      g.fillStyle(c, 0.12 + heat * 0.2); g.fillEllipse(spot.x, spot.y, SPOT_R * 2.4, SPOT_R * 1.5);
      g.fillStyle(c, 0.25 + heat * 0.35); g.fillEllipse(spot.x, spot.y, SPOT_R * 2 * (0.5 + heat * 0.25), SPOT_R * 1.2 * (0.5 + heat * 0.25));
      g.fillStyle(0xffffff, 0.3 + heat * 0.6 * pulse); g.fillEllipse(spot.x, spot.y, SPOT_R * (0.3 + heat * 0.5), SPOT_R * 0.6 * (0.3 + heat * 0.5));
      g.lineStyle(2, c, 0.4 + heat * 0.5); g.strokeEllipse(spot.x, spot.y, SPOT_R * 2, SPOT_R * 1.2);
      // The heat gauge: an arc round the spot that fills to white.
      g.lineStyle(3, heat > 0.75 ? 0xffffff : GOLD_LIT, 0.8);
      g.beginPath(); g.arc(spot.x, spot.y, SPOT_R + 8, -Math.PI / 2, -Math.PI / 2 + heat * Math.PI * 2, false); g.strokePath();
      if (heat > 0.75) for (let i = 0; i < 4; i++) { const a = time / 200 + i * 1.57; glint(g, spot.x + Math.cos(a) * SPOT_R * 0.7, spot.y + Math.sin(a) * SPOT_R * 0.4, 5, 0.8); }
      if (time - scorchFx < 500) {
        const k = (time - scorchFx) / 500;
        g.lineStyle(4 * (1 - k), 0xffffff, 1 - k); g.strokeEllipse(spot.x, spot.y, SPOT_R * 2 * (1 + k), SPOT_R * 1.2 * (1 + k));
      }
    },

    drawAir(g, time) {
      // The gantry: a girder along the top, towers down both side walls with the wheels.
      g.fillStyle(IRON_DARK, 1); g.fillRect(20, top + 4, W - 40, 22);
      g.fillStyle(IRON, 1); g.fillRect(20, top + 4, W - 40, 16);
      g.fillStyle(IRON_LIT, 1); g.fillRect(20, top + 4, W - 40, 2);
      for (let x = 30; x < W - 30; x += 16) { g.fillStyle(IRON_LIT, 1); g.fillCircle(x, top + 10, 1.4); g.fillCircle(x, top + 18, 1.4); }
      for (let x = 40; x < W - 40; x += 48) { g.lineStyle(2, IRON, 1); g.lineBetween(x, top + 26, x + 24, top + 4); g.lineBetween(x + 24, top + 4, x + 48, top + 26); }
      for (const p of wheelPts) {
        // The tower leg down the wall.
        g.lineStyle(7, IRON_DARK, 1); g.lineBetween(p.x - 18, top + 20, p.x - 18, p.y + 60);
        g.lineBetween(p.x + 18, top + 20, p.x + 18, p.y + 60);
        g.lineStyle(2, IRON, 1);
        for (let y = top + 30; y < p.y + 50; y += 26) { g.lineBetween(p.x - 18, y, p.x + 18, y + 26); g.lineBetween(p.x + 18, y, p.x - 18, y + 26); }
        // The wheel.
        const spin = wheelSpin * (p.x < W / 2 ? 1 : -1) + time / 4000;
        const hot = time - wheelFx < 600;
        if (hot) glow(g, p.x, p.y, 40, GOLD_LIT, 0.08, 3);
        g.lineStyle(5, IRON_DARK, 1); g.strokeCircle(p.x, p.y, 22);
        g.lineStyle(2, IRON_LIT, 1); g.strokeCircle(p.x, p.y - 1, 22);
        for (let i = 0; i < 6; i++) {
          const a = spin + (i / 6) * Math.PI * 2;
          g.lineStyle(3, IRON, 1); g.lineBetween(p.x, p.y, p.x + Math.cos(a) * 22, p.y + Math.sin(a) * 22);
          g.fillStyle(BRASS, 1); g.fillCircle(p.x + Math.cos(a) * 27, p.y + Math.sin(a) * 27, 3.5);
        }
        g.fillStyle(BRASS_DARK, 1); g.fillCircle(p.x, p.y, 7); g.fillStyle(BRASS_LIT, 1); g.fillCircle(p.x - 1.5, p.y - 1.5, 2.5);
        // "Strike me" hint: a brass arrow pulsing when the lens is on you.
        if (tracked === player && time >= wheelCdUntil) {
          const k = 0.5 + 0.5 * Math.sin(time / 180);
          g.fillStyle(GOLD_LIT, 0.4 + k * 0.5);
          const dx = p.x < W / 2 ? 1 : -1;
          g.fillTriangle(p.x + dx * 40, p.y, p.x + dx * 52, p.y - 7, p.x + dx * 52, p.y + 7);
        }
      }
      // The trolley and the lens hanging under it, over the spot.
      const lx = clamp(spot.x, 90, W - 90);
      g.fillStyle(IRON_DARK, 1); g.fillRect(lx - 30, top + 2, 60, 12);
      g.fillStyle(BRASS, 1); g.fillCircle(lx - 20, top + 4, 4); g.fillCircle(lx + 20, top + 4, 4);
      g.lineStyle(2, IRON_DARK, 1); g.lineBetween(lx - 22, top + 14, lx - 36, lensY); g.lineBetween(lx + 22, top + 14, lx + 36, lensY);
      // The cone of focused light from the lens down to the spot.
      const c = mixC(BEAM, 0xffffff, heat);
      g.fillStyle(c, 0.06 + heat * 0.12);
      g.fillTriangle(lx - 46, lensY + 4, lx + 46, lensY + 4, spot.x, spot.y);
      g.lineStyle(1, c, 0.2 + heat * 0.4); g.lineBetween(lx - 46, lensY + 4, spot.x, spot.y); g.lineBetween(lx + 46, lensY + 4, spot.x, spot.y);
      // The lens.
      g.fillStyle(BRASS_DARK, 1); g.fillEllipse(lx, lensY, 104, 30);
      g.fillStyle(BRASS, 1); g.fillEllipse(lx, lensY - 1, 98, 26);
      g.fillStyle(GLASS_EDGE, 1); g.fillEllipse(lx, lensY - 1, 88, 20);
      g.fillStyle(GLASS, 1); g.fillEllipse(lx - 4, lensY - 3, 62, 12);
      g.fillStyle(0xffffff, 0.7 + heat * 0.3); g.fillEllipse(lx - 14, lensY - 4, 22, 5);
      glint(g, lx - 22, lensY - 5, 6 + heat * 6, 0.9);
      // Whose it is.
      if (alive(tracked)) {
        g.fillStyle(tracked === player ? 0xffe17a : 0xffffff, 0.85);
        g.fillTriangle(lx - 6, lensY + 16, lx + 6, lensY + 16, lx, lensY + 24);
      }
    },

    drawHud(g, time) {
      // A brass gauge under the HUD: which fighter has been stiller, and how long the lens is held.
      const x = W / 2, y = top + 60;
      g.fillStyle(0x000000, 0.35); g.fillRoundedRect(x - 92, y - 12, 184, 24, 10);
      const ps = speed.get(player) ?? 0, ns = speed.get(npc) ?? 0;
      for (const [f, s, d] of [[player, ps, -1], [npc, ns, 1]] as [Fighter, number, number][]) {
        const w = clamp(s / 220, 0, 1) * 70;
        g.fillStyle(tracked === f ? 0xffe17a : 0x9aa6b0, 0.95);
        g.fillRect(d < 0 ? x - 8 - w : x + 8, y - 4, w, 8);
      }
      g.fillStyle(BRASS, 1); g.fillCircle(x, y, 7);
      g.fillStyle(0xffffff, 1); g.fillCircle(x - 1.5, y - 1.5, 2);
      if (time < lockUntil) {
        const k = (lockUntil - time) / LOCK_MS;
        g.lineStyle(2, GOLD_LIT, 0.9); g.beginPath(); g.arc(x, y, 11, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
      }
    },

    destroy() { for (const w of wheels) w.remove(); },
  };
}

export const BURNING_GLASS: GimmickDef = {
  id: 'noon-burning-glass',
  rules: 'The great lens tracks the stiller fighter; its spot heats gold to white, then scorches. Strike a gantry wheel to swing the lens onto your foe.',
  make,
};
