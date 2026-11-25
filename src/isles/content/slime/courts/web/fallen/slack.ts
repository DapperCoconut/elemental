import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { dim, glow, lit, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import {
  BONE, BRUISE, BRUISE_LIT, DROP, GOLD_THREAD, PLANK, PLANK_DARK, PLANK_LIT, ROPE, ROPE_DARK, SILK_DARK, SILK_LIT,
  SILK_SHADE, SPIDER_GOLD,
} from '../palette';
import { alive, clamp, dist, mover, stepDt } from '../util';

/**
 * Slack in the Sheet — Sheetwright Odo Tensley, who keeps the woven floor of the Web Court taut,
 * and who in the King's telling let it go slack under the houses the Spymaster named, so that
 * what stood there slid away into the drop.
 *
 * The Sheet is silk, and silk gives. Stand still and it sags under you, a little deeper every
 * moment; walk and it springs back behind you. The mill's racks keep spilling full bobbins onto
 * the floor, and a bobbin rolls downhill — into the deepest sag in the yard, faster the deeper it
 * is — and a bobbin at speed bowls over whoever is sitting at the bottom. Climbing out of your own
 * sag is slow work, too.
 *
 * The exploit is the stays: a bone peg at each corner holds the Sheet's edge. Strike one and that
 * corner goes slack for a while, and the whole floor tips toward it — so every bobbin in the yard
 * runs that way. Slacken his corner. And he must stand to cast, like anyone: let him dig his own
 * hole. Halfway down he cuts the inner stays: the Sheet sags twice as fast and the racks pour.
 */

const ID = fallenId('web', 'slack');
const SIGMA = 130;
const PULL = 330;
const TILT = 150;
const MAX_SPEED = 230;
const HURT_SPEED = 85;
const BOB_R = 14;
const SLACK_MS = 5200;
const LIFE_MS = 15000;

interface Dip { f: Fighter; x: number; y: number; depth: number; track: ReturnType<typeof mover> }
interface Bobbin { x: number; y: number; vx: number; vy: number; roll: number; born: number; tint: number }
interface Peg { x: number; y: number; t: StrikeTarget; slackUntil: number; struckAt: number }
interface Splinter { x: number; y: number; at: number; tint: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk, rng } = ctx;
  const dips: Dip[] = [player, npc].map((f) => ({ f, x: f.x, y: f.y, depth: 0, track: mover(f) }));
  const bobbins: Bobbin[] = [];
  const splinters: Splinter[] = [];
  const tints = [BRUISE_LIT, GOLD_THREAD, SILK_LIT, 0xc98a5a, BRUISE];
  let cut = false;
  let nextSpill = 0;
  let started = false;

  const pegs: Peg[] = [
    { x: 54, y: top + 34 }, { x: W - 54, y: top + 34 }, { x: 54, y: H - 34 }, { x: W - 54, y: H - 34 },
  ].map((p) => {
    const peg: Peg = { x: p.x, y: p.y, slackUntil: 0, struckAt: 0, t: null as unknown as StrikeTarget };
    peg.t = ctx.target({
      x: p.x, y: p.y - 10, r: 16, passThrough: true,
      onStruck: () => {
        const now = tk.now;
        if (now - peg.struckAt < 900) return;
        peg.struckAt = now;
        for (const o of pegs) o.slackUntil = 0;
        peg.slackUntil = now + SLACK_MS;
        ctx.sfx('snap-back');
        ctx.flash(peg.x, peg.y - 10, SILK_LIT);
      },
    });
    return peg;
  });

  const slackPeg = (now: number): Peg | undefined => pegs.find((p) => p.slackUntil > now);

  /** How hard the Sheet pulls a thing at (x, y) downhill: toward every sag, and toward a slack corner. */
  function downhill(x: number, y: number, now: number): Pt {
    let ax = 0, ay = 0;
    for (const d of dips) {
      if (d.depth <= 0.01) continue;
      const dx = d.x - x, dy = d.y - y;
      const r = Math.hypot(dx, dy) || 1;
      const k = PULL * d.depth * Math.exp(-(r * r) / (2 * SIGMA * SIGMA)) * Math.min(1, r / 40);
      ax += (dx / r) * k; ay += (dy / r) * k;
    }
    const s = slackPeg(now);
    if (s) {
      const dx = s.x - x, dy = s.y - y, r = Math.hypot(dx, dy) || 1;
      ax += (dx / r) * TILT; ay += (dy / r) * TILT;
    }
    return { x: ax, y: ay };
  }

  /** How far down the Sheet lies at (x, y), 0 (taut) to about 1 (a full sag) — for drawing the weave. */
  function sagAt(x: number, y: number): { dx: number; dy: number; deep: number } {
    let ox = 0, oy = 0, deep = 0;
    for (const d of dips) {
      if (d.depth <= 0.01) continue;
      const dx = d.x - x, dy = d.y - y;
      const e = d.depth * Math.exp(-(dx * dx + dy * dy) / (2 * 70 * 70));
      ox += dx * e * 0.32; oy += dy * e * 0.32; deep += e;
    }
    return { dx: ox, dy: oy, deep: Math.min(1, deep) };
  }

  function spill(time: number): void {
    const x = 120 + rng() * (W - 240);
    const fromTop = rng() < 0.5;
    bobbins.push({
      x, y: fromTop ? top + 14 : H - 14, vx: (rng() - 0.5) * 40, vy: fromTop ? 50 : -50,
      roll: rng() * 6, born: time, tint: tints[Math.floor(rng() * tints.length)],
    });
    ctx.sfx('rock-throw');
  }

  function bowl(b: Bobbin, f: Fighter, speed: number): void {
    const dmg = Math.round(9 + speed / 30);
    if (f === player) { tk.hitPlayer(dmg, f.x, f.y); tk.slowPlayer(0.7, 600); }
    else ctx.hit(npc, dmg + 4, f.x, f.y);
    const a = Math.atan2(b.vy, b.vx);
    ctx.nudge(f, Math.cos(a) * 30, Math.sin(a) * 30);
    ctx.sfx('hit-medium');
    splinters.push({ x: b.x, y: b.y, at: tk.now, tint: b.tint });
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextSpill = time + 1600; }
      if (!cut && npc.hp < npc.maxHp * 0.5) {
        cut = true;
        ctx.banner('THE INNER STAYS ARE CUT', '#ddd4f0');
        ctx.sfx('whip');
      }
      // The Sheet sags under whoever stands still, and springs back behind whoever walks.
      for (const d of dips) {
        const speed = d.track.step(dt);
        const k = Math.min(1, dt * 5);
        d.x += (d.f.x - d.x) * k; d.y += (d.f.y - d.y) * k;
        if (!alive(d.f)) { d.depth = Math.max(0, d.depth - dt); continue; }
        if (speed < 60) d.depth = Math.min(1, d.depth + dt * (cut ? 0.8 : 0.45));
        else d.depth = Math.max(0, d.depth - dt * 0.75);
      }
      if (time >= nextSpill && bobbins.length < (cut ? 10 : 7)) {
        nextSpill = time + (cut ? 1000 : 1700);
        spill(time);
        if (cut && rng() < 0.4) spill(time);
      }
      for (let i = bobbins.length - 1; i >= 0; i--) {
        const b = bobbins[i];
        const a = downhill(b.x, b.y, time);
        b.vx += a.x * dt; b.vy += a.y * dt;
        const fr = Math.max(0, 1 - 0.9 * dt);
        b.vx *= fr; b.vy *= fr;
        let sp = Math.hypot(b.vx, b.vy);
        if (sp > MAX_SPEED) { b.vx *= MAX_SPEED / sp; b.vy *= MAX_SPEED / sp; sp = MAX_SPEED; }
        b.x += b.vx * dt; b.y += b.vy * dt;
        b.roll += sp * dt / 8;
        if (b.x < 30 || b.x > W - 30) { b.vx *= -0.5; b.x = clamp(b.x, 30, W - 30); }
        if (b.y < top + 8 || b.y > H - 10) { b.vy *= -0.5; b.y = clamp(b.y, top + 8, H - 10); }
        let gone = time - b.born > LIFE_MS;
        for (const f of [player, npc]) {
          if (gone || !alive(f) || dist(b.x, b.y, f.x, f.y) > BOB_R + 20) continue;
          if (sp >= HURT_SPEED) { bowl(b, f, sp); gone = true; }
          else { const r = dist(b.x, b.y, f.x, f.y) || 1; b.x += (b.x - f.x) / r * 3; b.y += (b.y - f.y) / r * 3; }
        }
        if (gone) bobbins.splice(i, 1);
      }
      for (let i = splinters.length - 1; i >= 0; i--) if (time - splinters[i].at > 700) splinters.splice(i, 1);
    },

    playerSpeedMult() { return 1 - 0.25 * dips[0].depth; },
    npcSpeedMult() { return 1 - 0.25 * dips[1].depth; },

    npcSeek() {
      if (!alive(player)) return null;
      const now = tk.now;
      // Slacken the corner the player stands nearest, if he can reach its peg first.
      const near = pegs.reduce((m, p) => (dist(p.x, p.y, player.x, player.y) < dist(m.x, m.y, player.x, player.y) ? p : m));
      if (near.slackUntil < now && dist(near.x, near.y, player.x, player.y) < 300 && dist(near.x, near.y, npc.x, npc.y) < 360) {
        return { x: tk.clampX(near.x + (W / 2 - near.x) * 0.12), y: tk.clampY(near.y + ((top + H) / 2 - near.y) * 0.15) };
      }
      // Otherwise keep walking a wide circle round you, so his own sag never deepens.
      const a = now / 1400 + (npc.x < player.x ? Math.PI : 0);
      let x = player.x + Math.cos(a) * 250, y = player.y + Math.sin(a) * 200;
      for (const b of bobbins) {
        if (Math.hypot(b.vx, b.vy) < HURT_SPEED || dist(b.x, b.y, x, y) > 90) continue;
        x += (x - b.x) * 0.8; y += (y - b.y) * 0.8;
      }
      return { x: tk.clampX(x, 70), y: tk.clampY(y, 60) };
    },

    drawGround(g, time) {
      const s = slackPeg(time);
      // A slack corner: the edge drops away, wrinkles run out from it.
      if (s) {
        const k = clamp((s.slackUntil - time) / SLACK_MS, 0, 1);
        g.fillStyle(DROP, 0.22 * k); g.fillCircle(s.x, s.y, 150);
        g.fillStyle(DROP, 0.18 * k); g.fillCircle(s.x, s.y, 80);
        for (let i = 0; i < 9; i++) {
          const a = Math.atan2((top + H) / 2 - s.y, W / 2 - s.x) + (i - 4) * 0.16;
          g.lineStyle(1.5, SILK_SHADE, 0.6 * k);
          g.lineBetween(s.x + Math.cos(a) * 30, s.y + Math.sin(a) * 30, s.x + Math.cos(a) * (220 + (i % 3) * 40), s.y + Math.sin(a) * (220 + (i % 3) * 40));
        }
      }
      // Each sag: a dark bowl in the silk.
      for (const d of dips) {
        if (d.depth < 0.03) continue;
        for (let r = 4; r >= 1; r--) { g.fillStyle(DROP, 0.07 * d.depth * (5 - r) * 0.6); g.fillEllipse(d.x, d.y + 6, 60 * r * (0.5 + d.depth * 0.5), 40 * r * (0.5 + d.depth * 0.5)); }
      }
      // The weave itself, every thread pulled toward the sags — you can read the slope off it.
      const step = 44;
      for (let y = top + 10; y < H; y += step) {
        g.lineStyle(1, SILK_LIT, 0.22); g.beginPath();
        for (let x = 0; x <= W; x += 24) {
          const o = sagAt(x, y);
          if (x === 0) g.moveTo(x + o.dx, y + o.dy); else g.lineTo(x + o.dx, y + o.dy);
        }
        g.strokePath();
      }
      for (let x = 20; x < W; x += step) {
        g.lineStyle(1, SILK_DARK, 0.2); g.beginPath();
        for (let y = top; y <= H; y += 24) {
          const o = sagAt(x, y);
          if (y === top) g.moveTo(x + o.dx, y + o.dy); else g.lineTo(x + o.dx, y + o.dy);
        }
        g.strokePath();
      }
      for (const b of bobbins) shadow(g, b.x, b.y + 5, 30, 9, 0.28);
      for (const p of pegs) shadow(g, p.x, p.y + 2, 24, 7);
    },

    drawAir(g, time) {
      for (const p of pegs) drawPeg(g, p, time, W, H, top);
      for (const b of bobbins) drawBobbin(g, b, time);
      for (const s of splinters) {
        const k = (time - s.at) / 700;
        for (let i = 0; i < 7; i++) {
          const a = i * 0.9 + s.x;
          g.fillStyle(i % 2 ? PLANK_LIT : s.tint, 1 - k);
          g.fillRect(s.x + Math.cos(a) * 30 * k - 2, s.y - 8 + Math.sin(a) * 18 * k - 10 * k, 4, 2);
        }
        g.lineStyle(1, s.tint, 0.8 * (1 - k)); g.beginPath(); g.moveTo(s.x, s.y - 8);
        for (let i = 1; i < 8; i++) g.lineTo(s.x + Math.sin(i * 1.3) * 18 * k, s.y - 8 + i * 4 * k);
        g.strokePath();
      }
    },

    drawHud(g, time) {
      // Two hammocks — how deep each of you has sunk — and the racks' spill clock.
      const y = top + 18;
      dips.forEach((d, i) => {
        const x = W / 2 - 70 + i * 140;
        g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x - 40, y - 14, 80, 28, 6);
        g.lineStyle(2, PLANK_LIT, 1); g.lineBetween(x - 34, y - 8, x - 34, y + 8); g.lineBetween(x + 34, y - 8, x + 34, y + 8);
        g.lineStyle(2, i === 0 ? SILK_LIT : BRUISE_LIT, 1); g.beginPath(); g.moveTo(x - 34, y - 6);
        for (let k = 1; k <= 10; k++) g.lineTo(x - 34 + k * 6.8, y - 6 + Math.sin((k / 10) * Math.PI) * (2 + d.depth * 12));
        g.strokePath();
        g.fillStyle(i === 0 ? SILK_LIT : BRUISE_LIT, 1); g.fillCircle(x, y - 4 + 2 + d.depth * 12, 3);
      });
      const k = clamp(1 - (nextSpill - time) / (cut ? 1000 : 1700), 0, 1);
      g.fillStyle(0x000000, 0.5); g.fillCircle(W / 2, y, 11);
      g.lineStyle(2.5, GOLD_THREAD, 1); g.beginPath(); g.arc(W / 2, y, 9, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
      g.fillStyle(PLANK, 1); g.fillRect(W / 2 - 3, y - 4, 6, 8);
    },

    destroy() { for (const p of pegs) p.t.remove(); },
  };
}

/** A stay-peg: a fang of bone driven through the Sheet's hem, its stay-rope running off to a trunk. */
function drawPeg(g: G, p: Peg, time: number, W: number, H: number, top: number): void {
  const slack = p.slackUntil > time;
  const lean = slack ? 0.5 : 0;
  const ox = p.x < W / 2 ? -1 : 1, oy = p.y < (top + H) / 2 ? -1 : 1;
  // The stay: taut and straight, or hanging in a loose belly once struck.
  const far = { x: p.x + ox * 60, y: p.y + oy * 40 };
  g.lineStyle(2.5, ROPE_DARK, 1);
  if (slack) {
    g.beginPath(); g.moveTo(p.x, p.y - 22);
    for (let i = 1; i <= 8; i++) { const t = i / 8; g.lineTo(p.x + (far.x - p.x) * t, p.y - 22 + (far.y - p.y + 22) * t + Math.sin(t * Math.PI) * 22); }
    g.strokePath();
  } else g.lineBetween(p.x, p.y - 22, far.x, far.y);
  g.lineStyle(1, ROPE, 0.8); g.lineBetween(p.x, p.y - 21, p.x + (far.x - p.x) * 0.5, p.y - 21 + (far.y - p.y + 21) * 0.5 + (slack ? 11 : 0));
  // The peg, leaning when its corner has gone.
  const tipX = p.x - ox * lean * 8;
  g.fillStyle(dim(BONE, 0.25), 1); g.fillTriangle(p.x - 6, p.y, p.x + 6, p.y, tipX, p.y - 30);
  g.fillStyle(BONE, 1); g.fillTriangle(p.x - 4, p.y, p.x + 2, p.y, tipX - 1, p.y - 28);
  g.lineStyle(1, dim(BONE, 0.4), 1); g.lineBetween(p.x - 3, p.y - 10, p.x + 3, p.y - 12);
  // The hem it holds: a doubled fold of silk, gathered where the peg goes through.
  g.fillStyle(SILK_LIT, 0.9); g.fillEllipse(p.x, p.y + 1, 22, 6);
  g.lineStyle(1, SILK_SHADE, 1); g.strokeEllipse(p.x, p.y + 1, 22, 6);
  g.fillStyle(SPIDER_GOLD, 1); g.fillCircle(p.x, p.y - 22, 2.5);
  if (slack) glow(g, p.x, p.y - 12, 16, SILK_LIT, 0.06, 2);
}

/** A full bobbin lying on its side, rolling: two flanged ends and the wound silk between. */
function drawBobbin(g: G, b: Bobbin, time: number): void {
  const sp = Math.hypot(b.vx, b.vy);
  const a = sp > 4 ? Math.atan2(b.vy, b.vx) + Math.PI / 2 : 0.4;
  const ux = Math.cos(a), uy = Math.sin(a) * 0.7;
  const cx = b.x, cy = b.y - 8;
  const hot = sp >= HURT_SPEED;
  const e1 = { x: cx - ux * 11, y: cy - uy * 11 }, e2 = { x: cx + ux * 11, y: cy + uy * 11 };
  // The wound silk, striped by the roll.
  g.lineStyle(14, dim(b.tint, 0.3), 1); g.lineBetween(e1.x, e1.y, e2.x, e2.y);
  g.lineStyle(10, b.tint, 1); g.lineBetween(e1.x, e1.y - 1, e2.x, e2.y - 1);
  for (let k = 0; k < 4; k++) {
    const t = ((k / 4 + b.roll * 0.08) % 1) * 2 - 1;
    g.lineStyle(1, lit(b.tint, 0.4), 0.8);
    g.lineBetween(cx - ux * 10 + -uy * t * 6, cy - uy * 10 + ux * t * 6, cx + ux * 10 + -uy * t * 6, cy + uy * 10 + ux * t * 6);
  }
  // The two wooden flanges.
  for (const e of [e1, e2]) {
    g.fillStyle(PLANK_DARK, 1); g.fillEllipse(e.x, e.y, 9, 18);
    g.fillStyle(PLANK, 1); g.fillEllipse(e.x, e.y - 1, 7, 15);
    g.fillStyle(PLANK_DARK, 1); g.fillCircle(e.x, e.y - 1, 1.8);
  }
  // A loose end flicking behind it when it runs fast — the sign it will bowl you over.
  if (hot) {
    const back = Math.atan2(-b.vy, -b.vx);
    g.lineStyle(1, b.tint, 0.8); g.beginPath(); g.moveTo(cx, cy);
    for (let i = 1; i < 6; i++) g.lineTo(cx + Math.cos(back) * i * 6 + Math.sin(time / 50 + i) * 3, cy + Math.sin(back) * i * 6 + Math.cos(time / 50 + i) * 3);
    g.strokePath();
  }
}

export const FALLEN_SLACK: GimmickDef = {
  id: ID,
  rules: 'Stand still and the Sheet sags under you; spilled bobbins roll into the deepest sag and bowl you over. Strike a corner peg to tip the floor that way.',
  make,
};
