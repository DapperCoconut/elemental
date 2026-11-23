import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { glow } from '../../../../../art/IsleArt';
import { OBS, seam } from '../../../../../art/PinnacleArt';
import { glassDrop } from '../art';
import { B, VEN, VEN_CSS, VEN_DARK, VEN_DEEP, VEN_LIT, VEN_LIT_CSS, alive, clamp, dist, stepOf } from '../palette';

/**
 * Seat of the Draught — the Decree of the Condenser Coil.
 *
 * The alembic's condenser coil is laid in the floor as one great ring of glass tube round the
 * middle of the room. A bead of hot Draught runs round it, and at each of four cracked vents it
 * passes, the vent spits a column of venom: 15 and a slow to anyone standing over it — the
 * councilor included. Two brass-less black-glass valves sit on the ring; strike one and the bead
 * turns back the way it came, so the vent it just left is suddenly the next. Every sixth spit the
 * still boils over through the drain in the middle.
 *
 * The Distiller wants you over a vent when the bead arrives, and she will turn the valve on you
 * to make it so. Turn it on her: she stands her ground to spray acid, and her tail is long.
 */

const ID = `${B.id}-coil`;

const make = (ctx: GimmickCtx): EncounterGimmick => {
  const { W, H, top, tk } = ctx;
  const CX = W / 2, CY = (top + H) / 2 + 8;
  const RX = 250, RY = 196;
  const VENT_R = 76;
  const BOIL_R = 118;
  const OMEGA = ctx.hard ? 1.38 : 1.15;
  const LOCK_MS = 1600;
  const SPITS_TO_BOIL = 6;
  const onRing = (a: number, k = 1): Pt => ({ x: CX + Math.cos(a) * RX * k, y: CY + Math.sin(a) * RY * k });
  const VENTS = [0, 1, 2, 3].map((i) => Math.PI / 4 + (i * Math.PI) / 2);
  const VALVES = [0, Math.PI];

  let theta = -Math.PI / 2;
  let dir = 1;
  let lockUntil = 0;
  let spits = 0;
  let boilAt = 0;
  let started = false;
  const slowUntil = { npc: 0 };
  const turnFx = [0, 0];
  const valveSpin = [0, 0];
  const spitFx: { x: number; y: number; at: number }[] = [];

  /** Forward angular distance from the bead to angle `a`, along the way the bead is running. */
  const ahead = (a: number): number => {
    const d = (a - theta) * dir;
    return ((d % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  };
  const nextVent = (): number => VENTS.reduce((best, v) => (ahead(v) < ahead(best) ? v : best), VENTS[0]);
  const prevVent = (): number => VENTS.reduce((best, v) => (ahead(v) > ahead(best) ? v : best), VENTS[0]);

  const valves = VALVES.map((a, i) => {
    const p = onRing(a, 1.16);
    return ctx.target({
      x: p.x, y: p.y, r: 26, passThrough: true,
      onStruck(by) {
        const now = ctx.scene.time.now;
        if (now < lockUntil || !started) return;
        dir = -dir;
        lockUntil = now + LOCK_MS;
        turnFx[i] = now;
        valveSpin[i] += Math.PI;
        ctx.sfx('gear-turn');
        ctx.float(p.x, p.y - 34, by === 'player' ? 'TURNED BACK' : 'SHE TURNS IT', by === 'player' ? VEN_LIT_CSS : '#c9b0ff');
      },
    });
  });

  const spit = (a: number, time: number) => {
    const p = onRing(a);
    spitFx.push({ x: p.x, y: p.y, at: time });
    ctx.sfx('geyser');
    if (alive(ctx.player) && dist(ctx.player.x, ctx.player.y, p.x, p.y) < VENT_R) {
      tk.hitPlayer(15, p.x, p.y);
      tk.slowPlayer(0.6, 1400);
    }
    if (alive(ctx.npc) && dist(ctx.npc.x, ctx.npc.y, p.x, p.y) < VENT_R) {
      ctx.hit(ctx.npc, Math.max(8, ctx.npc.maxHp * 0.045), ctx.npc.x, ctx.npc.y);
      slowUntil.npc = time + 1400;
      ctx.float(ctx.npc.x, ctx.npc.y - 50, 'SCALDED', VEN_LIT_CSS);
    }
    spits++;
    if (spits % SPITS_TO_BOIL === 0) boil(time);
  };

  const boil = (time: number) => {
    const warn = 1500;
    boilAt = time + tk.warn(warn);
    tk.spawnZone({ x: CX, y: CY, radius: BOIL_R, warnMs: warn, damage: 18, slowMult: 0.7, slowMs: 1200 });
    ctx.banner('THE STILL BOILS OVER', VEN_CSS);
    tk.schedule(tk.warn(warn), () => {
      if (alive(ctx.npc) && dist(ctx.npc.x, ctx.npc.y, CX, CY) < BOIL_R) ctx.hit(ctx.npc, Math.max(10, ctx.npc.maxHp * 0.055), CX, CY);
      ctx.sfx('explosion-medium');
    });
  };

  return {
    update(time, dt) {
      if (!started) { started = true; lockUntil = time + 1200; ctx.banner('THE COIL RUNS — STRIKE A VALVE TO TURN IT', VEN_CSS); }
      const step = stepOf(dt);
      const prev = theta;
      theta += dir * OMEGA * step;
      for (const v of VENTS) {
        // Did the bead cross this vent's angle this frame (any lap)?
        const lo = Math.min(prev, theta), hi = Math.max(prev, theta);
        const k = Math.ceil((lo - v) / (Math.PI * 2));
        const va = v + k * Math.PI * 2;
        if (va > lo && va <= hi) spit(v, time);
      }
      while (spitFx.length && time - spitFx[0].at > 900) spitFx.shift();
    },
    npcSpeedMult() { return ctx.scene.time.now < slowUntil.npc ? 0.6 : 1; },
    npcSeek() {
      const n = ctx.npc, p = ctx.player;
      const now = ctx.scene.time.now;
      if (now < boilAt && dist(n.x, n.y, CX, CY) < BOIL_R + 30) {
        const a = Math.atan2(n.y - CY, n.x - CX);
        return onRing(a, 0.82);
      }
      const nv = nextVent();
      const vp = onRing(nv);
      const eta = ahead(nv) / OMEGA;
      if (eta < 1.6 && dist(n.x, n.y, vp.x, vp.y) < VENT_R + 40) {
        const a = Math.atan2(n.y - vp.y, n.x - vp.x);
        return { x: clamp(vp.x + Math.cos(a) * 170, 60, W - 60), y: clamp(vp.y + Math.sin(a) * 170, top + 50, H - 50) };
      }
      // The Distiller's trick: if you are standing on the vent behind the bead, she turns it back on you.
      const pv = onRing(prevVent());
      if (now >= lockUntil && dist(p.x, p.y, pv.x, pv.y) < VENT_R) {
        const near = valves.reduce((b, v) => (dist(n.x, n.y, v.x, v.y) < dist(n.x, n.y, b.x, b.y) ? v : b), valves[0]);
        if (dist(n.x, n.y, near.x, near.y) < 320) return { x: near.x, y: near.y };
      }
      return null;
    },
    drawGround(g, time) {
      const t = time / 1000;
      // The drain in the middle: a grate over a well of Draught, bubbling as it builds to a boil.
      const boiling = time < boilAt;
      const bk = boiling ? 1 - (boilAt - time) / tk.warn(1500) : (spits % SPITS_TO_BOIL) / SPITS_TO_BOIL;
      g.fillStyle(0x020302, 1); g.fillCircle(CX, CY, 44);
      g.fillStyle(VEN_DEEP, 0.6 + bk * 0.3); g.fillCircle(CX, CY, 36);
      for (let i = 0; i < 6; i++) {
        const ph = (t * (0.8 + bk * 2) + i / 6) % 1;
        g.fillStyle(VEN_LIT, (1 - ph) * (0.3 + bk * 0.6));
        g.fillCircle(CX + Math.cos(i * 2.4) * 22 * ph, CY + Math.sin(i * 2.4) * 14 * ph, 2 + bk * 3);
      }
      g.lineStyle(3, OBS.facet, 1);
      for (let i = -2; i <= 2; i++) g.lineBetween(CX + i * 13, CY - 34, CX + i * 13, CY + 34);
      g.lineStyle(4, OBS.sheen, 1); g.strokeCircle(CX, CY, 44);
      g.lineStyle(1, OBS.edge, 0.7); g.strokeCircle(CX, CY, 47);
      // Feeder pipes from the drain out to the ring, under the glass.
      for (const v of VENTS) {
        const p = onRing(v, 0.9);
        g.lineStyle(7, OBS.glass, 1); g.lineBetween(CX + Math.cos(v) * 44, CY + Math.sin(v) * 44, p.x, p.y);
        g.lineStyle(2, VEN_DARK, 1); g.lineBetween(CX + Math.cos(v) * 44, CY + Math.sin(v) * 44, p.x, p.y);
      }
      // The coil: a glass tube in the floor, Draught inside, joints every few feet.
      g.lineStyle(26, 0x000000, 0.35); g.strokeEllipse(CX, CY + 4, RX * 2, RY * 2);
      g.lineStyle(22, OBS.glass, 1); g.strokeEllipse(CX, CY, RX * 2, RY * 2);
      g.lineStyle(12, VEN_DARK, 1); g.strokeEllipse(CX, CY, RX * 2, RY * 2);
      g.lineStyle(4, VEN_DEEP, 1); g.strokeEllipse(CX, CY, RX * 2, RY * 2);
      g.lineStyle(1.4, OBS.edge, 0.6); g.strokeEllipse(CX, CY, RX * 2 + 22, RY * 2 + 22);
      g.lineStyle(1, OBS.edge, 0.3); g.strokeEllipse(CX, CY, RX * 2 - 22, RY * 2 - 22);
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        const o = onRing(a, 1.05), n = onRing(a, 0.95);
        g.lineStyle(3, OBS.sheen, 1); g.lineBetween(o.x, o.y, n.x, n.y);
      }
      // Flow chevrons show which way the bead is running.
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 + ((t * dir * 0.6) % (Math.PI / 6));
        const p = onRing(a), q = onRing(a - dir * 0.06);
        g.lineStyle(2, VEN, 0.35); g.lineBetween(q.x, q.y - 4, p.x, p.y); g.lineBetween(q.x, q.y + 4, p.x, p.y);
      }
      // The vents: cracked collars; their warning floods in as the bead comes.
      for (const v of VENTS) {
        const p = onRing(v);
        const heat = clamp(1 - ahead(v) / 1.35, 0, 1);
        g.fillStyle(VEN, 0.05 + heat * 0.22); g.fillCircle(p.x, p.y, VENT_R);
        g.lineStyle(2, heat > 0.65 && Math.floor(time / 90) % 2 ? VEN_LIT : VEN, 0.25 + heat * 0.7); g.strokeCircle(p.x, p.y, VENT_R);
        if (heat > 0) { g.beginPath(); g.lineStyle(4, VEN_LIT, 0.8); g.arc(p.x, p.y, VENT_R - 4, -Math.PI / 2, -Math.PI / 2 + heat * Math.PI * 2, false); g.strokePath(); }
        g.fillStyle(OBS.facet, 1); g.fillCircle(p.x, p.y, 20);
        g.lineStyle(2, OBS.edge, 0.7); g.strokeCircle(p.x, p.y, 20);
        g.fillStyle(0x020302, 1); g.fillCircle(p.x, p.y, 11);
        g.fillStyle(VEN, 0.3 + heat * 0.7); g.fillCircle(p.x, p.y, 8);
        seam(g, [{ x: p.x + 16, y: p.y - 8 }, { x: p.x + 30, y: p.y - 18 }, { x: p.x + 44, y: p.y - 14 }], 1, 0.4 + heat * 0.6, heat, VEN);
        seam(g, [{ x: p.x - 14, y: p.y + 10 }, { x: p.x - 30, y: p.y + 14 }, { x: p.x - 38, y: p.y + 28 }], 1, 0.4 + heat * 0.6, heat, VEN);
      }
      // The valves: black-glass wheels on stems off the ring.
      VALVES.forEach((a, i) => {
        const p = onRing(a, 1.16), r = onRing(a, 1.04);
        const live = time >= lockUntil;
        const kick = clamp(1 - (time - turnFx[i]) / 500, 0, 1);
        g.lineStyle(8, OBS.facet, 1); g.lineBetween(r.x, r.y, p.x, p.y);
        if (live) glow(g, p.x, p.y, 34, VEN, 0.04 + 0.02 * Math.sin(t * 4), 2);
        g.fillStyle(OBS.glass, 1); g.fillCircle(p.x, p.y, 24);
        g.lineStyle(4, live ? OBS.sheen : OBS.facet, 1); g.strokeCircle(p.x, p.y, 22);
        const spin = valveSpin[i] - kick * Math.PI;
        for (let k = 0; k < 4; k++) {
          const sa = spin + (k * Math.PI) / 2;
          g.lineStyle(3, OBS.edge, live ? 0.85 : 0.35);
          g.lineBetween(p.x, p.y, p.x + Math.cos(sa) * 20, p.y + Math.sin(sa) * 20);
        }
        g.fillStyle(live ? VEN : VEN_DARK, 1); g.fillCircle(p.x, p.y, 5);
        if (kick > 0) { g.lineStyle(3, VEN_LIT, kick); g.strokeCircle(p.x, p.y, 24 + (1 - kick) * 30); }
      });
      // The bead and its trail.
      for (let i = 10; i >= 0; i--) {
        const p = onRing(theta - dir * i * 0.05);
        g.fillStyle(i === 0 ? VEN_LIT : VEN, 0.9 - i * 0.08); g.fillCircle(p.x, p.y, 9 - i * 0.6);
      }
      const bp = onRing(theta);
      glow(g, bp.x, bp.y, 34, VEN_LIT, 0.08, 3);
      g.fillStyle(0xffffff, 0.9); g.fillCircle(bp.x - 2, bp.y - 2, 3);
    },
    drawAir(g, time) {
      for (const s of spitFx) {
        const k = (time - s.at) / 900;
        if (k < 0 || k > 1) continue;
        const h = 120 * Math.sin(Math.min(1, k * 1.6) * Math.PI * 0.5) * (1 - k * 0.5);
        g.fillStyle(VEN, 0.55 * (1 - k)); g.fillEllipse(s.x, s.y - h / 2, 34 - k * 10, h);
        g.fillStyle(VEN_LIT, 0.7 * (1 - k)); g.fillEllipse(s.x, s.y - h / 2, 12, h * 0.9);
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * Math.PI * 2;
          const r = k * VENT_R;
          glassDrop(g, s.x + Math.cos(a) * r, s.y + Math.sin(a) * r * 0.7 - h * (1 - k) * 0.6 + k * k * 40, 3, 1 - k);
        }
        g.lineStyle(3, VEN_LIT, 0.8 * (1 - k)); g.strokeEllipse(s.x, s.y, VENT_R * 2 * k, VENT_R * 1.4 * k);
      }
      if (ctx.scene.time.now < slowUntil.npc && alive(ctx.npc)) {
        for (let i = 0; i < 3; i++) glassDrop(g, ctx.npc.x - 12 + i * 12, ctx.npc.y - 30 + ((time / 8 + i * 13) % 26), 2.2, 0.8);
      }
    },
    drawHud(g, time) {
      // Pressure: six pips that fill as the vents spit; at six, the still boils.
      const cx = W / 2, cy = top + 16;
      const filled = time < boilAt ? SPITS_TO_BOIL : spits % SPITS_TO_BOIL;
      g.fillStyle(0x050806, 0.85); g.fillRoundedRect(cx - 86, cy - 11, 172, 22, 8);
      g.lineStyle(1.5, OBS.edge, 0.6); g.strokeRoundedRect(cx - 86, cy - 11, 172, 22, 8);
      for (let i = 0; i < SPITS_TO_BOIL; i++) {
        const px = cx - 64 + i * 25.6;
        g.fillStyle(i < filled ? VEN : VEN_DARK, i < filled ? 1 : 0.8); g.fillCircle(px, cy, 7);
        if (i < filled && time < boilAt && Math.floor(time / 120) % 2) { g.fillStyle(VEN_LIT, 1); g.fillCircle(px, cy, 4); }
      }
      // An arrow for the bead's way round.
      g.lineStyle(2, VEN_LIT, 0.9);
      const ax = cx + 78;
      g.lineBetween(ax - 4 * dir, cy - 5, ax + 4 * dir, cy); g.lineBetween(ax - 4 * dir, cy + 5, ax + 4 * dir, cy);
    },
    destroy() { for (const v of valves) v.remove(); },
  };
};

export const DECREE_COIL: GimmickDef = {
  id: ID,
  rules: 'The Draught shall run the coil, and every vent it passes shall spit; a struck valve turns it back; the sixth spit boils the still.',
  make,
};
