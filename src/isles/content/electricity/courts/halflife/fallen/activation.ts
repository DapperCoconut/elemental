import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget, Striker } from '../../../../../IslesTypes';
import { glow, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { hazardStripe, trefoil } from '../art';
import {
  AMBER, AMBER_DARK, AMBER_LIT, CHEREN, CHEREN_LIT, GLOW, GLOW_DIM, GLOW_LIT, HAZARD_BLACK, IRON, IRON_DARK, IRON_LIT, LEAD, LEAD_DARK,
  LEAD_DEEP, LEAD_LIT, RUST, TIMBER, TIMBER_DARK,
} from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Made to Glow — Source-Warden Ermentrude Scaife, hunt.
 *
 * Behind the dome, in a castle of lead bricks, the court keeps a neutron source: a capsule that
 * makes *other* things radioactive. Iron left near it comes away glowing. In the star's telling
 * Scaife drew the plug for the Tally: a house that glowed was a house that was short.
 *
 * The rule: every so often she hoists the plug (the ring on the floor shows its reach). While it is
 * out, whatever stands inside — fighters, and the four bits of iron scrap — is *activated*. An
 * activated fighter burns whoever stands near them, hard, and themselves a little; activated scrap
 * burns whoever passes it. Activation halves every few seconds (the half-life clock on the HUD).
 * She wants to be hot and on you. So can you: take the glow and hug her. Strike the plug to drop
 * it shut, or hoist it early when she stands in reach. Past half the source is fresh: glow lasts
 * twice as long.
 */

const SLUG = 'activation';
const REACH = 200;
const SHUT_MS = 5600;
const WARN_MS = 1250;
const OPEN_MS = 2600;
/** Activation gained per second inside the ring (at the castle; half at the rim). */
const SOAK = 1.25;
const ACT_CAP = 4;
const NEAR_R = 130;
const SCRAP_R = 64;
const TICK_MS = 550;
const SCRAP_TICK = 900;

type Plug = 'shut' | 'hoisting' | 'open';
interface Scrap { x: number; y: number; kind: 'wheel' | 'pick' | 'chair' | 'bucket'; act: number; nextTick: number; }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const C: Pt = { x: W / 2, y: (top + H) / 2 + 8 };
  let plug: Plug = 'shut';
  let stateAt = 0;
  let started = false;
  let lastShut = -99999;
  let fresh = false;
  const act = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  const nextTick = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  const scrap: Scrap[] = (['wheel', 'pick', 'chair', 'bucket'] as const).map((kind, i) => {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    return { x: C.x + Math.cos(a) * 165, y: C.y + Math.sin(a) * 120, kind, act: 0, nextTick: 0 };
  });
  const halfLife = () => (fresh ? 8 : 4);

  const setPlug = (p: Plug, time: number) => { plug = p; stateAt = time; };
  const strikePlug = (_by: Striker) => {
    const now = ctx.scene.time.now;
    if (plug === 'open') { setPlug('shut', now); lastShut = now; tk.sfx('anvil'); }
    else if (plug === 'shut' && now - lastShut > 2000) { setPlug('hoisting', now - (WARN_MS - 700)); tk.sfx('chain'); }
  };
  const plugTarget: StrikeTarget = ctx.target({ x: C.x, y: C.y - 30, r: 32, onStruck: (by) => strikePlug(by) });

  const burn = (f: Fighter, amount: number) => { if (alive(f) && !ctx.isAirborne(f) && amount >= 1) tk.hitFighter(f, amount, f.x, f.y); };

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; setPlug('shut', time - SHUT_MS + 2200); }
      if (!fresh && npc.hp <= npc.maxHp * 0.5) { fresh = true; ctx.banner('A FRESH CAPSULE — THE GLOW LASTS TWICE AS LONG', '#d8ffb0'); tk.sfx('status-buff'); }

      // The plug's cycle.
      if (plug === 'shut' && time - stateAt >= SHUT_MS) { setPlug('hoisting', time); tk.sfx('chain'); }
      else if (plug === 'hoisting' && time - stateAt >= WARN_MS) { setPlug('open', time); tk.sfx('beam-fire'); }
      else if (plug === 'open' && time - stateAt >= OPEN_MS) { setPlug('shut', time); lastShut = time; tk.sfx('anvil'); }

      // Soak while open; decay always.
      const decay = Math.pow(0.5, dt / halfLife());
      for (const f of [player, npc]) {
        let a = (act.get(f) ?? 0) * decay;
        if (plug === 'open' && alive(f)) {
          const d = dist(f.x, f.y, C.x, C.y);
          if (d < REACH) a = Math.min(ACT_CAP, a + SOAK * (1 - (d / REACH) * 0.5) * dt);
        }
        act.set(f, a < 0.02 ? 0 : a);
      }
      for (const s of scrap) {
        s.act *= decay;
        if (plug === 'open' && dist(s.x, s.y, C.x, C.y) < REACH) s.act = Math.min(3, s.act + SOAK * 0.8 * dt);
      }

      // A hot fighter burns the other one close by — and a little of themselves.
      for (const f of [player, npc]) {
        const a = act.get(f) ?? 0;
        if (a < 0.3 || time < (nextTick.get(f) ?? 0)) continue;
        nextTick.set(f, time + TICK_MS);
        const o = f === player ? npc : player;
        if (dist(f.x, f.y, o.x, o.y) < NEAR_R) burn(o, Math.round(1 + a * 2.2));
        if (a >= 1.2) burn(f, Math.round(a * 0.6));
      }
      // Hot scrap burns whoever passes.
      for (const s of scrap) {
        if (s.act < 0.3 || time < s.nextTick) continue;
        s.nextTick = time + SCRAP_TICK;
        for (const f of [player, npc]) if (dist(f.x, f.y, s.x, s.y) < SCRAP_R) burn(f, Math.max(1, Math.round(s.act * 2.5)));
      }
    },

    npcSeek() {
      const me = act.get(npc) ?? 0, you = act.get(player) ?? 0;
      // Hot: run her glow into you.
      if (me >= 1 && me >= you * 0.8) return { x: player.x, y: player.y };
      // You are hotter: keep out of your reach, on the far side of the castle if she can.
      if (you >= 1) {
        const a = Math.atan2(npc.y - player.y, npc.x - player.x);
        return { x: clamp(player.x + Math.cos(a) * 260, 60, W - 60), y: clamp(player.y + Math.sin(a) * 260, top + 50, H - 50) };
      }
      // The plug is coming up: get in close to soak — away from the scrap.
      if (plug !== 'shut' || time() - stateAt > SHUT_MS - 1800) {
        const a = Math.atan2(npc.y - C.y, npc.x - C.x);
        return { x: C.x + Math.cos(a) * 60, y: C.y + Math.sin(a) * 60 };
      }
      return null;
    },

    destroy() { plugTarget.remove(); },

    drawGround(g, t) {
      const k = plug === 'hoisting' ? clamp((t - stateAt) / WARN_MS, 0, 1) : plug === 'open' ? 1 : 0;
      // The reach: a painted ring always, brightening as the plug rises.
      g.fillStyle(GLOW, plug === 'open' ? 0.08 + Math.sin(t / 90) * 0.02 : k * 0.05); g.fillCircle(C.x, C.y, REACH);
      g.lineStyle(2, AMBER, 0.25 + k * 0.55); g.strokeCircle(C.x, C.y, REACH);
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2 + t / 4000;
        g.lineStyle(3, i % 2 ? HAZARD_BLACK : AMBER, 0.35 + k * 0.5);
        g.beginPath(); g.arc(C.x, C.y, REACH - 4, a, a + 0.12, false); g.strokePath();
      }
      if (plug === 'hoisting') { g.lineStyle(3, GLOW_LIT, 0.8); g.strokeCircle(C.x, C.y, REACH * (1 - k) + 20); }
      for (const s of scrap) drawScrap(g, s, t);
      drawCastle(g, C, plug, k, t);
    },

    drawAir(g, t) {
      // The hoist: a timber tripod over the castle, its chain to the plug.
      const lift = plug === 'hoisting' ? clamp((t - stateAt) / WARN_MS, 0, 1) * 38 : plug === 'open' ? 38 : 0;
      const apex = { x: C.x, y: C.y - 120 };
      for (const [fx, fy] of [[C.x - 58, C.y + 8], [C.x + 58, C.y + 8], [C.x + 6, C.y - 40]]) {
        g.lineStyle(5, TIMBER_DARK, 1); g.lineBetween(fx, fy, apex.x, apex.y);
        g.lineStyle(2, TIMBER, 1); g.lineBetween(fx - 1, fy, apex.x - 1, apex.y);
      }
      g.fillStyle(IRON_DARK, 1); g.fillCircle(apex.x, apex.y, 6);
      const py = C.y - 40 - lift;
      for (let y = apex.y + 6; y < py - 6; y += 6) { g.lineStyle(2, IRON_LIT, 1); g.strokeEllipse(C.x, y, 4, 6); }
      // The plug itself: a lead cylinder with a lifting eye.
      g.fillStyle(LEAD_DARK, 1); g.fillRect(C.x - 14, py - 6, 28, 24);
      g.fillStyle(LEAD, 1); g.fillRect(C.x - 12, py - 6, 20, 22);
      g.fillStyle(LEAD_LIT, 1); g.fillEllipse(C.x, py - 6, 28, 8);
      g.lineStyle(2, IRON, 1); g.strokeCircle(C.x, py - 10, 4);
      // Hot fighters: the glow comes off them in motes and a ring of their reach.
      for (const f of [player, npc]) {
        const a = act.get(f) ?? 0;
        if (!alive(f) || a < 0.05) continue;
        const r = clamp(a / ACT_CAP, 0, 1);
        glow(g, f.x, f.y - 8, 24 + r * 26, GLOW, 0.05 + r * 0.06, 3);
        if (a >= 0.3) { g.lineStyle(1.5, GLOW, 0.2 + r * 0.4); g.strokeCircle(f.x, f.y, NEAR_R); }
        const n = Math.ceil(a * 3);
        for (let i = 0; i < n; i++) {
          const ph = (t / 700 + i / n) % 1;
          const ang = i * 2.4 + Math.floor(t / 700 + i / n) * 1.3;
          g.fillStyle(GLOW_LIT, (1 - ph) * 0.9);
          g.fillCircle(f.x + Math.cos(ang) * (12 + ph * 20), f.y - 10 + Math.sin(ang) * 8 - ph * 26, 2);
        }
      }
    },

    drawHud(g, t) {
      // Two dosimeter tubes — yours and hers — with the half-life clock between them.
      const x = 24, y = top + 10;
      g.fillStyle(0x000000, 0.55); g.fillRoundedRect(x - 8, y - 4, 92, 50, 6);
      const tube = (tx: number, a: number, c: number) => {
        g.fillStyle(LEAD_DEEP, 1); g.fillRoundedRect(tx, y, 14, 40, 5);
        const h = 36 * clamp(a / ACT_CAP, 0, 1);
        g.fillStyle(c, 1); g.fillRoundedRect(tx + 2, y + 38 - h, 10, h, 3);
        for (let i = 1; i < 4; i++) { g.lineStyle(1, LEAD_LIT, 0.6); g.lineBetween(tx, y + 38 - i * 9, tx + 4, y + 38 - i * 9); }
      };
      tube(x, act.get(player) ?? 0, CHEREN);
      tube(x + 62, act.get(npc) ?? 0, GLOW);
      // The half-life clock: one sweep per half-life, a notch for each halving.
      const cx2 = x + 38, cy2 = y + 20;
      g.fillStyle(AMBER_LIT, 1); g.fillCircle(cx2, cy2, 14);
      g.lineStyle(2, AMBER_DARK, 1); g.strokeCircle(cx2, cy2, 14);
      const p = ((t / 1000) % halfLife()) / halfLife();
      g.fillStyle(AMBER, 1); g.slice(cx2, cy2, 12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - p), false); g.fillPath();
      g.lineStyle(2, HAZARD_BLACK, 1); g.lineBetween(cx2, cy2, cx2 + Math.cos(-Math.PI / 2 + p * Math.PI * 2) * 12, cy2 + Math.sin(-Math.PI / 2 + p * Math.PI * 2) * 12);
      if (plug !== 'shut') { g.fillStyle(GLOW, 0.5 + Math.sin(t / 80) * 0.4); g.fillCircle(cx2, y + 44, 3); }
      if (fresh) trefoil(g, cx2, cy2, 4, HAZARD_BLACK);
    },
  };

  function time(): number { return ctx.scene.time.now; }
}

/** The lead castle: staggered lead bricks round the source well, the well glowing when unplugged. */
function drawCastle(g: G, c: Pt, plug: Plug, k: number, t: number): void {
  shadow(g, c.x, c.y + 10, 130, 36, 0.4);
  const rows = 4, bw = 22, bh = 11;
  for (let r = 0; r < rows; r++) {
    const y = c.y - r * bh;
    const n = 5 - (r > 1 ? 1 : 0);
    const x0 = c.x - (n * bw) / 2 + (r % 2 ? bw / 4 : 0);
    for (let i = 0; i < n; i++) {
      const bx = x0 + i * bw;
      g.fillStyle(LEAD_DARK, 1); g.fillRect(bx, y - bh, bw - 1, bh - 1);
      g.fillStyle(LEAD, 1); g.fillRect(bx + 1, y - bh, bw - 3, bh - 4);
      g.fillStyle(LEAD_LIT, 0.45); g.fillRect(bx + 2, y - bh + 1, bw - 8, 2);
    }
  }
  hazardStripe(g, c.x - 56, c.y, 112, 6, 0.85);
  trefoil(g, c.x - 40, c.y - 22, 6, HAZARD_BLACK, AMBER);
  // The well mouth on top.
  g.fillStyle(LEAD_DEEP, 1); g.fillEllipse(c.x, c.y - 44, 34, 12);
  if (k > 0) {
    const on = plug === 'open' ? 0.8 + Math.sin(t / 60) * 0.2 : k * 0.6;
    g.fillStyle(GLOW, on); g.fillEllipse(c.x, c.y - 44, 26, 8);
    glow(g, c.x, c.y - 44, 40 + on * 40, GLOW, 0.06 * on, 4);
    if (plug === 'open') {
      g.fillStyle(GLOW_LIT, 0.25); g.fillTriangle(c.x - 12, c.y - 44, c.x + 12, c.y - 44, c.x, c.y - 140);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + t / 300;
        const r = 30 + ((t / 5 + i * 37) % (REACH - 30));
        g.fillStyle(CHEREN_LIT, 0.7 * (1 - r / REACH)); g.fillCircle(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r * 0.75, 2);
      }
    }
  }
}

/** A bit of iron scrap — wheel, pick, rail chair, bucket — that takes the glow and gives it back. */
function drawScrap(g: G, s: Scrap, t: number): void {
  const hot = clamp(s.act / 3, 0, 1);
  const { x, y } = s;
  shadow(g, x, y + 4, 44, 12, 0.3);
  if (s.act >= 0.3) {
    g.fillStyle(GLOW, 0.05 + hot * 0.1); g.fillCircle(x, y, SCRAP_R);
    g.lineStyle(1.5, GLOW, 0.25 + hot * 0.5); g.strokeCircle(x, y, SCRAP_R);
  }
  const iron = hot > 0.1 ? GLOW_DIM : IRON;
  if (s.kind === 'wheel') {
    g.lineStyle(5, IRON_DARK, 1); g.strokeCircle(x, y - 4, 14);
    g.lineStyle(3, iron, 1); g.strokeCircle(x, y - 4, 12);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; g.lineStyle(2, iron, 1); g.lineBetween(x, y - 4, x + Math.cos(a) * 11, y - 4 + Math.sin(a) * 11); }
    g.fillStyle(RUST, 1); g.fillCircle(x, y - 4, 3);
  } else if (s.kind === 'pick') {
    g.lineStyle(4, TIMBER_DARK, 1); g.lineBetween(x - 16, y + 2, x + 12, y - 14);
    g.lineStyle(2, TIMBER, 1); g.lineBetween(x - 15, y + 1, x + 11, y - 15);
    g.lineStyle(5, IRON_DARK, 1); g.beginPath(); g.arc(x + 12, y - 4, 14, Math.PI * 1.05, Math.PI * 1.95, false); g.strokePath();
    g.lineStyle(3, iron, 1); g.beginPath(); g.arc(x + 12, y - 4, 14, Math.PI * 1.1, Math.PI * 1.9, false); g.strokePath();
  } else if (s.kind === 'chair') {
    g.fillStyle(IRON_DARK, 1); g.fillRect(x - 16, y - 6, 32, 8);
    g.fillStyle(iron, 1); g.fillRect(x - 10, y - 16, 6, 12); g.fillRect(x + 4, y - 16, 6, 12);
    g.fillStyle(RUST, 1); g.fillCircle(x - 12, y - 2, 2); g.fillCircle(x + 12, y - 2, 2);
  } else {
    g.fillStyle(IRON_DARK, 1); g.fillTriangle(x - 14, y - 18, x + 14, y - 18, x + 10, y);
    g.fillTriangle(x - 14, y - 18, x + 10, y, x - 10, y);
    g.fillStyle(iron, 1); g.fillEllipse(x, y - 18, 28, 8);
    g.lineStyle(2, IRON_LIT, 1); g.beginPath(); g.arc(x, y - 18, 14, Math.PI, 0, false); g.strokePath();
  }
  if (hot > 0.1) {
    glow(g, x, y - 8, 20 + hot * 20, GLOW, 0.05 * hot + 0.02, 3);
    const p = (t / 600 + x) % 1;
    g.fillStyle(GLOW_LIT, (1 - p) * hot); g.fillCircle(x + Math.sin(x + Math.floor(t / 600)) * 10, y - 12 - p * 20, 1.8);
  }
}

export const FALLEN_ACTIVATION: GimmickDef = {
  id: fallenId('halflife', SLUG),
  rules: 'The drawn plug makes all in its ring glow; a glowing fighter burns whoever is near. Glow halves on a clock. Get hot, hug her. Strike the plug.',
  make,
};
