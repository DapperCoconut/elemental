import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { glow, shadow, type G } from '../../../../../art/IsleArt';
import { figure, letter } from '../art';
import {
  BRASS, BRASS_DARK, BRASS_LIT, IRON, IRON_LIT, LAMP, PLASTER_DARK, ROOF, SHUTTER, SHUTTER_LIT, TIMBER_DARK, WAX, WAX_LIT,
} from '../palette';
import { alive, clamp, dist, segDist, stepDt } from '../util';
import { fallenId } from '../../../../meteor/spec';

/**
 * Intercepted — Go-Between Ansel Querne, who in the King's telling stood between the Prince's Ear
 * and everyone else, and never sent anything on without reading it first.
 *
 * A go-between is a man on the end of a line. Behind a grilled hatch in the wall sits his client
 * — the Ear's man, hooded — and a gold thread runs from the client's hand to Ansel's satchel,
 * wherever Ansel walks. Down it, one after another, come the client's packets: **pay** (a purse:
 * whoever takes it is mended and their cooldowns race) and **orders** (a red-sealed letter: if it
 * reaches Ansel he reads it and calls a blow down where you stand; if *you* take it, it serves
 * you — struck and silenced). The client's in-tray shows what is coming next.
 *
 * Anything that brushes a fighter on the way is theirs: stand across the thread to take the pay
 * and let the orders by. Strike an order in flight and it is readdressed — it flies straight at
 * your foe. Ansel walks to keep the thread clear of you and strikes orders back. Past half a
 * second client opens the hatch in the far wall and a second thread runs to him.
 */

const ID = fallenId('cloak', 'intercepted');
const SEND_MS = 1500;
const SEND_LATE = 1250;
const SPEED = 250;
const CATCH_R = 26;
const RETURN_SPEED = 370;
const RUSH_MS = 3000;

type Kind = 'pay' | 'orders';
interface Client { x: number; y: number; dir: number; tray: Kind[]; nextAt: number; sentAt: number }
interface Packet { kind: Kind; client: Client; p: number; x: number; y: number; target: StrikeTarget; born: number }
interface Return { x: number; y: number; vx: number; vy: number; at: number; to: Fighter }
interface Pop { x: number; y: number; at: number; color: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk, rng } = ctx;
  const ym = (top + H) / 2;
  const roll = (): Kind => (rng() < 0.45 ? 'pay' : 'orders');
  const clients: Client[] = [{ x: 34, y: ym, dir: 1, tray: [roll(), roll(), roll()], nextAt: 0, sentAt: -1e9 }];
  const packets: Packet[] = [];
  const returns: Return[] = [];
  const pops: Pop[] = [];
  const rushUntil = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  let late = false;
  let started = false;

  const satchel = (): Pt => ({ x: npc.x, y: npc.y - 18 });
  const mouth = (c: Client): Pt => ({ x: c.x + c.dir * 22, y: c.y - 30 });

  function send(c: Client, time: number): void {
    const kind = c.tray.shift() ?? 'orders';
    c.tray.push(roll());
    c.sentAt = time;
    const m = mouth(c);
    const pk: Packet = {
      kind, client: c, p: 0, x: m.x, y: m.y, born: time,
      target: ctx.target({ x: m.x, y: m.y, r: 18, passThrough: true, onStruck: (by) => readdress(pk, by === 'player' ? npc : player) }),
    };
    packets.push(pk);
    ctx.sfx('whoosh');
  }

  function drop(pk: Packet): void {
    pk.target.remove();
    const i = packets.indexOf(pk);
    if (i >= 0) packets.splice(i, 1);
  }

  function readdress(pk: Packet, to: Fighter): void {
    if (pk.kind !== 'orders' || !packets.includes(pk) || !alive(to)) return;
    const d = Math.max(1, dist(pk.x, pk.y, to.x, to.y - 18));
    returns.push({ x: pk.x, y: pk.y, vx: ((to.x - pk.x) / d) * RETURN_SPEED, vy: ((to.y - 18 - pk.y) / d) * RETURN_SPEED, at: tk.now, to });
    drop(pk);
    ctx.sfx('slash');
  }

  /** A fighter takes a packet: pay mends and hurries them, orders serve them. */
  function receive(pk: Packet, f: Fighter, time: number): void {
    drop(pk);
    if (pk.kind === 'pay') {
      rushUntil.set(f, time + RUSH_MS);
      ctx.heal(f, f === player ? 6 : 9);
      ctx.sfx('money');
      pops.push({ x: pk.x, y: pk.y, at: time, color: BRASS_LIT });
      return;
    }
    pops.push({ x: pk.x, y: pk.y, at: time, color: WAX_LIT });
    if (f === player) {
      tk.hitPlayer(12, f.x, f.y); ctx.silence(player, 900); ctx.sfx('judgement');
    } else {
      // Ansel reads his orders: a blow is called down where the stranger stands.
      ctx.sfx('curse-cast');
      if (alive(player)) tk.spawnZone({ x: player.x, y: player.y, radius: 72, warnMs: 900, damage: 16 });
    }
  }

  return {
    update(time, dt) {
      const s = stepDt(dt);
      if (!started) { started = true; clients[0].nextAt = time + 1200; }
      if (!late && npc.hp < npc.maxHp * 0.5) {
        late = true;
        clients.push({ x: W - 34, y: ym, dir: -1, tray: [roll(), roll(), roll()], nextAt: time + 900, sentAt: -1e9 });
        ctx.banner('A SECOND HATCH OPENS — TWO CLIENTS', '#f4d890');
        ctx.sfx('boss-phase');
      }
      for (const c of clients) if (time >= c.nextAt) { c.nextAt = time + (late ? SEND_LATE : SEND_MS); if (alive(npc)) send(c, time); }
      const a = satchel();
      for (const pk of [...packets]) {
        const m = mouth(pk.client);
        const len = Math.max(40, dist(m.x, m.y, a.x, a.y));
        pk.p += (SPEED * s) / len;
        pk.x = m.x + (a.x - m.x) * pk.p; pk.y = m.y + (a.y - m.y) * pk.p;
        pk.target.moveTo(pk.x, pk.y);
        if (alive(player) && dist(pk.x, pk.y, player.x, player.y - 16) < CATCH_R) { receive(pk, player, time); continue; }
        if (pk.p >= 1 || time - pk.born > 8000) { if (alive(npc)) receive(pk, npc, time); else drop(pk); }
      }
      for (let i = returns.length - 1; i >= 0; i--) {
        const r = returns[i];
        r.x += r.vx * s; r.y += r.vy * s;
        if (alive(r.to) && dist(r.x, r.y, r.to.x, r.to.y - 16) < CATCH_R) {
          pops.push({ x: r.x, y: r.y, at: time, color: WAX_LIT });
          if (r.to === player) { tk.hitPlayer(14, r.x, r.y); ctx.stun(player, 450); }
          else { ctx.hit(npc, 30, r.x, r.y); ctx.stun(npc, 700); ctx.float(npc.x, npc.y - 60, 'RETURN TO SENDER', '#ffd27a'); }
          ctx.sfx('explosion-small');
          returns.splice(i, 1);
          continue;
        }
        if (time - r.at > 2600 || r.x < -20 || r.x > W + 20 || r.y < top - 20 || r.y > H + 20) returns.splice(i, 1);
      }
      for (let i = pops.length - 1; i >= 0; i--) if (time - pops[i].at > 600) pops.splice(i, 1);
    },

    playerCooldownRate: () => (tk.now < (rushUntil.get(player) ?? 0) ? 1.7 : 1),
    npcCooldownRate: () => (tk.now < (rushUntil.get(npc) ?? 0) ? 1.7 : 1),

    npcSeek() {
      if (!alive(player) || !alive(npc)) return null;
      // A readdressed order coming at him: step off its line.
      const r = returns.find((q) => q.to === npc);
      if (r) {
        const sp = Math.hypot(r.vx, r.vy) || 1;
        const side = (npc.x - r.x) * (-r.vy / sp) + (npc.y - r.y) * (r.vx / sp) >= 0 ? 1 : -1;
        return { x: tk.clampX(npc.x - (r.vy / sp) * side * 110), y: tk.clampY(npc.y + (r.vx / sp) * side * 110) };
      }
      // Keep every thread clear of the stranger: swing round the client, away from the stranger's side.
      const c = clients[clients.length > 1 && dist(clients[1].x, clients[1].y, npc.x, npc.y) < dist(clients[0].x, clients[0].y, npc.x, npc.y) ? 1 : 0];
      const m = mouth(c);
      const a = satchel();
      if (segDist(player.x, player.y - 16, m.x, m.y, a.x, a.y) > 110) return null;
      const ap = Math.atan2(player.y - m.y, player.x - m.x);
      const an = Math.atan2(npc.y - m.y, npc.x - m.x);
      const turn = an - ap >= 0 ? 1 : -1;
      const want = ap + turn * 1.0;
      const rr = clamp(dist(m.x, m.y, npc.x, npc.y), 220, 380);
      return { x: tk.clampX(m.x + Math.cos(want) * rr), y: tk.clampY(m.y + Math.sin(want) * rr) };
    },

    drawGround(g, time) {
      if (!alive(npc)) return;
      const a = satchel();
      for (const c of clients) {
        const m = mouth(c);
        // The thread's shadow on the cobbles, and the line a packet will run.
        g.lineStyle(3, 0x000000, 0.18); g.lineBetween(m.x, c.y + 4, a.x, npc.y + 2);
        const n = Math.floor(dist(m.x, c.y, a.x, npc.y) / 22);
        for (let i = 1; i < n; i++) {
          const t = i / n;
          g.fillStyle(BRASS, 0.25 + 0.15 * Math.sin(time / 200 - i)); g.fillCircle(m.x + (a.x - m.x) * t, c.y + (npc.y - c.y) * t + 2, 1.5);
        }
      }
      for (const r of returns) glow(g, r.x, r.y + 18, 16, WAX_LIT, 0.08, 2);
    },

    drawAir(g, time) {
      for (const c of clients) drawHatch(g, c, time);
      if (alive(npc)) {
        const a = satchel();
        for (const c of clients) {
          const m = mouth(c);
          // The gold thread: a slight sag, a bright running twist.
          const mx = (m.x + a.x) / 2, my = (m.y + a.y) / 2 + 14;
          let px = m.x, py = m.y;
          for (let i = 1; i <= 20; i++) {
            const t = i / 20;
            const x = (1 - t) * (1 - t) * m.x + 2 * t * (1 - t) * mx + t * t * a.x;
            const y = (1 - t) * (1 - t) * m.y + 2 * t * (1 - t) * my + t * t * a.y;
            g.lineStyle(2, i % 2 ? BRASS : BRASS_LIT, 0.95); g.lineBetween(px, py, x, y);
            px = x; py = y;
          }
          // Ansel's end: a brass ring on the satchel strap.
          g.lineStyle(2, BRASS_LIT, 1); g.strokeCircle(a.x, a.y, 4);
        }
      }
      for (const pk of packets) drawPacket(g, pk.kind, pk.x, pk.y, time + pk.born);
      for (const r of returns) {
        const ang = Math.atan2(r.vy, r.vx);
        for (let i = 1; i <= 4; i++) { g.lineStyle(2, WAX_LIT, 0.5 - i * 0.1); g.lineBetween(r.x - Math.cos(ang) * i * 8, r.y - Math.sin(ang) * i * 8 - 3, r.x - Math.cos(ang) * (i * 8 + 6), r.y - Math.sin(ang) * (i * 8 + 6) - 3); }
        letter(g, r.x, r.y, 1.4, ang, true);
      }
      for (const p of pops) {
        const k = (time - p.at) / 600;
        g.lineStyle(2.5, p.color, 1 - k); g.strokeCircle(p.x, p.y, 10 + k * 26);
        for (let i = 0; i < 6; i++) { const an = i * 1.047; g.fillStyle(p.color, 1 - k); g.fillCircle(p.x + Math.cos(an) * (8 + k * 30), p.y + Math.sin(an) * (8 + k * 30), 2); }
      }
      for (const f of [player, npc]) {
        if (!alive(f) || tk.now >= (rushUntil.get(f) ?? 0)) continue;
        // Paid: a little shower of coin round the shoulders.
        for (let i = 0; i < 3; i++) {
          const t = (time / 500 + i / 3) % 1;
          g.fillStyle(BRASS_LIT, 1 - t); g.fillEllipse(f.x - 14 + i * 14, f.y - 50 + t * 30, 5 * Math.abs(Math.cos(time / 90 + i)) + 1, 5);
        }
      }
    },

    drawHud(g) {
      // Each client's in-tray: the next three packets, nearest first.
      clients.forEach((c, ci) => {
        const x0 = ci === 0 ? 30 : W - 120, y = top + 20;
        g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x0 - 8, y - 15, 98, 30, 7);
        g.fillStyle(TIMBER_DARK, 1); g.fillRect(x0 - 2, y + 6, 86, 4);
        c.tray.forEach((k, i) => {
          const x = x0 + 12 + i * 28;
          drawPacket(g, k, x, y - 1, 0, i === 0 ? 1.15 : 0.9, i === 0 ? 1 : 0.6);
        });
        g.lineStyle(2, LAMP, 0.9); g.strokeRoundedRect(x0 - 1, y - 13, 26, 26, 4);
      });
    },

    destroy() { for (const pk of packets) pk.target.remove(); },
  };
}

/** A packet on the thread: a brass-mouthed purse that chinks, or a red-sealed order, tumbling. */
function drawPacket(g: G, kind: Kind, x: number, y: number, t: number, s = 1, a = 1): void {
  if (kind === 'orders') {
    letter(g, x, y, 1.45 * s, Math.sin(t / 160) * 0.4, true, a);
    g.lineStyle(1, WAX_LIT, 0.6 * a); g.strokeCircle(x, y, 13 * s);
    return;
  }
  g.fillStyle(0x5a3a24, a); g.fillCircle(x, y + 2 * s, 8 * s);
  g.fillStyle(0x7a5236, a); g.fillCircle(x - 3 * s, y, 3.5 * s);
  g.fillStyle(BRASS, a); g.fillRect(x - 6 * s, y - 7 * s, 12 * s, 3 * s);
  g.fillStyle(BRASS_LIT, a); g.fillRect(x - 6 * s, y - 7 * s, 4 * s, 1.5 * s);
  g.fillStyle(BRASS_LIT, a * (0.5 + Math.sin(t / 90) * 0.5)); g.fillCircle(x + 5 * s, y - 2 * s, 1.3 * s);
  g.lineStyle(1, BRASS_DARK, a); g.strokeCircle(x, y + 2 * s, 8 * s);
}

/**
 * The client's hatch in the wall: a shuttered slot in bruised plaster, its iron grille swung up,
 * a hooded figure behind it holding the spool the thread runs from. It lights as a packet goes.
 */
function drawHatch(g: G, c: Client, time: number): void {
  const x = c.x, y = c.y, d = c.dir;
  const sent = clamp(1 - (time - c.sentAt) / 300, 0, 1);
  shadow(g, x, y + 4, 70, 14, 0.3);
  g.fillStyle(PLASTER_DARK, 1); g.fillRect(x - 30, y - 70, 60, 74);
  g.fillStyle(ROOF, 1); g.fillTriangle(x - 36, y - 70, x + 36, y - 70, x, y - 94);
  g.fillStyle(0x0b0910, 1); g.fillRect(x - 20, y - 56, 40, 34);
  glow(g, x, y - 40, 26, LAMP, 0.05 + sent * 0.1, 2);
  figure(g, x, y - 18, 0.8, 0x2a2234, { hood: true, eyeGlint: true, arm: 0.4 + sent * 0.4 });
  // Shutters swung open to each side, eye-holes bored through.
  for (const sd of [-1, 1]) {
    g.fillStyle(SHUTTER, 1); g.fillRect(x + sd * 22 - (sd < 0 ? 12 : 0), y - 58, 12, 38);
    g.fillStyle(SHUTTER_LIT, 0.6); g.fillRect(x + sd * 22 - (sd < 0 ? 12 : 0), y - 58, 3, 38);
    g.fillStyle(0x000000, 1); g.fillCircle(x + sd * 28, y - 46, 1.6);
  }
  // The grille, raised, and the spool at the sill.
  g.lineStyle(1.5, IRON, 1);
  for (let i = 0; i < 5; i++) g.lineBetween(x - 18 + i * 9, y - 62, x - 18 + i * 9, y - 56);
  g.fillStyle(IRON_LIT, 1); g.fillRect(x - 20, y - 23, 40, 4);
  g.fillStyle(BRASS, 1); g.fillCircle(x + d * 22, y - 30, 5);
  g.lineStyle(1, BRASS_LIT, 1); g.strokeCircle(x + d * 22, y - 30, 3);
  // A sealed-wax tally on the sill: the Ear's mark.
  g.fillStyle(WAX, 1); g.fillCircle(x - d * 12, y - 25, 3);
}

export const FALLEN_INTERCEPTED: GimmickDef = {
  id: ID,
  rules: 'A client sends Ansel pay and orders down a gold thread. Cross it to take pay; orders serve whoever takes them. Strike an order at your foe.',
  make,
};
