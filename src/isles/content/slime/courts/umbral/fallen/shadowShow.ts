import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { dim, glow, shadow, type G } from '../../../../../art/IsleArt';
import { BLACKFLAME, CANDLE, IRON, IRON_LIT, MOON, MOON_DIM, TIMBER, TIMBER_DARK, TIMBER_LIT } from '../palette';
import { alive, clamp, dist, segDist } from '../util';
import { fallenId } from '../../../../meteor/spec';

/**
 * The Hand-Shadow Show — Showman Teodric Mumm, who in the King's telling played his magic lantern at
 * the Prince's suppers: a bottled moon behind a lens, and his two hands in front of it, throwing
 * beasts on the wall for the court to laugh at. In the dream the beasts come down off the wall.
 *
 * The lantern stands at the yard's edge and throws a cone of pale light across the floor; at its far
 * end a hand-shadow beast — wolf, hare or hawk, a slide each — hunts the showman's foe and bites
 * whoever it crosses. A beast is only a picture: **step into the beam between lens and beast and you
 * break it** (it fades and has to be thrown again). Strike the lantern and Mumm drops the next slide
 * in — and the new beast springs at *the striker's* foe, until someone strikes the lantern back. Past
 * half a second lantern lights on the far wall and two beasts hunt at once.
 */

const ID = fallenId('umbral', 'shadow-show');
const SLIDE_MS = 9500;
const BREAK_MS = 2200;
const FORM_MS = 900;
const BEAM_HALF = 22;

type Kind = 'wolf' | 'hare' | 'hawk';
const KINDS: Kind[] = ['wolf', 'hare', 'hawk'];

interface Beast {
  kind: Kind; x: number; y: number; quarry: Fighter;
  formedAt: number; brokenUntil: number;
  /** Wolf: snap wind-up. Hare: hop. Hawk: circling then a dive lane. */
  actAt: number; fromX: number; fromY: number; toX: number; toY: number; phase: number;
  bitAt: number;
}
interface Lantern { x: number; y: number; dir: number; slide: number; nextSlide: number; beast: Beast; target: StrikeTarget | null; struckAt: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const ym = (top + H) / 2;
  const foeOf = (f: Fighter): Fighter => (f === player ? npc : player);
  const newBeast = (kind: Kind, x: number, y: number, quarry: Fighter, time: number): Beast => ({
    kind, x, y, quarry, formedAt: time, brokenUntil: 0, actAt: time + 1400, fromX: x, fromY: y, toX: x, toY: y, phase: 0, bitAt: -1e9,
  });
  const lanterns: Lantern[] = [];
  let started = false;
  let two = false;

  function addLantern(x: number, dir: number, time: number, slide: number): void {
    const l: Lantern = { x, y: ym, dir, slide, nextSlide: time + SLIDE_MS, beast: newBeast(KINDS[slide % 3], x + dir * 300, ym, player, time), target: null, struckAt: -1e9 };
    l.target = ctx.target({
      x: x + dir * 8, y: ym - 30, r: 28,
      onStruck: (by) => {
        const t = tk.now;
        if (t - l.struckAt < 600) return;
        l.struckAt = t;
        const striker = by === 'player' ? player : npc;
        changeSlide(l, t, foeOf(striker));
      },
    });
    lanterns.push(l);
  }

  function changeSlide(l: Lantern, time: number, quarry: Fighter): void {
    l.slide++;
    l.nextSlide = time + SLIDE_MS;
    const b = l.beast;
    l.beast = newBeast(KINDS[l.slide % 3], b.x, b.y, quarry, time);
    ctx.sfx('prism');
  }

  const formed = (b: Beast, t: number) => t >= b.formedAt + FORM_MS && t >= b.brokenUntil;

  /** Who stands in the beam between the lens and its beast — the picture breaks on them. */
  function blocker(l: Lantern): Fighter | null {
    const b = l.beast;
    for (const f of [player, npc]) {
      if (!alive(f)) continue;
      if (segDist(f.x, f.y, l.x, l.y, b.x, b.y) < BEAM_HALF + 14 && dist(f.x, f.y, b.x, b.y) > 50 && dist(f.x, f.y, l.x, l.y) > 34) return f;
    }
    return null;
  }

  function bite(f: Fighter, dmg: number, x: number, y: number): void {
    if (!alive(f)) return;
    if (f === player) tk.hitPlayer(dmg, x, y);
    else { ctx.hit(npc, Math.round(dmg * 1.3), x, y); }
  }

  function act(l: Lantern, time: number, dt: number): void {
    const b = l.beast;
    if (!formed(b, time)) return;
    const q = b.quarry;
    if (b.kind === 'wolf') {
      // Runs at its quarry; within reach it rears (jaws open) and snaps a beat later.
      if (b.phase === 0) {
        const d = Math.max(1, dist(b.x, b.y, q.x, q.y));
        const sp = (two ? 150 : 140) * dt;
        b.x += ((q.x - b.x) / d) * Math.min(sp, d); b.y += ((q.y - b.y) / d) * Math.min(sp, d);
        if (d < 56 && time - b.bitAt > 900) { b.phase = 1; b.actAt = time + tk.warn(420); }
      } else if (time >= b.actAt) {
        b.phase = 0; b.bitAt = time;
        ctx.sfx('trap-snap');
        for (const f of [player, npc]) if (dist(f.x, f.y, b.x, b.y) < 40) bite(f, 12, b.x, b.y);
      }
    } else if (b.kind === 'hare') {
      // Hops at its quarry: the landing ring is drawn while it is in the air.
      if (b.phase === 0 && time >= b.actAt) {
        const a = Math.atan2(q.y - b.y, q.x - b.x);
        const hop = Math.min(130, dist(b.x, b.y, q.x, q.y));
        b.fromX = b.x; b.fromY = b.y;
        b.toX = tk.clampX(b.x + Math.cos(a) * hop); b.toY = tk.clampY(b.y + Math.sin(a) * hop);
        b.phase = 1; b.actAt = time + tk.warn(560);
      } else if (b.phase === 1) {
        const k = clamp(1 - (b.actAt - time) / tk.warn(560), 0, 1);
        b.x = b.fromX + (b.toX - b.fromX) * k; b.y = b.fromY + (b.toY - b.fromY) * k;
        if (time >= b.actAt) {
          b.phase = 0; b.actAt = time + 420;
          ctx.sfx('land');
          for (const f of [player, npc]) if (dist(f.x, f.y, b.toX, b.toY) < 44 + 14) bite(f, 14, b.toX, b.toY);
        }
      }
    } else {
      // Circles its quarry; then a lane is chalked through it and the hawk stoops down it.
      if (b.phase === 0) {
        const a = time / 600;
        b.x += (tk.clampX(q.x + Math.cos(a) * 170) - b.x) * Math.min(1, dt * 2.5);
        b.y += (tk.clampY(q.y + Math.sin(a) * 120) - b.y) * Math.min(1, dt * 2.5);
        if (time >= b.actAt) {
          const ang = Math.atan2(q.y - b.y, q.x - b.x);
          b.fromX = b.x; b.fromY = b.y;
          b.toX = tk.clampX(b.x + Math.cos(ang) * 340); b.toY = tk.clampY(b.y + Math.sin(ang) * 340);
          b.phase = 1; b.actAt = time + tk.warn(850);
          ctx.sfx('screech');
        }
      } else if (b.phase === 1 && time >= b.actAt) {
        b.phase = 2; b.actAt = time + 260;
        for (const f of [player, npc]) if (segDist(f.x, f.y, b.fromX, b.fromY, b.toX, b.toY) < 26 + 14) bite(f, 16, f.x, f.y);
      } else if (b.phase === 2) {
        const k = clamp(1 - (b.actAt - time) / 260, 0, 1);
        b.x = b.fromX + (b.toX - b.fromX) * k; b.y = b.fromY + (b.toY - b.fromY) * k;
        if (time >= b.actAt) { b.phase = 0; b.actAt = time + 2200; }
      }
    }
  }

  return {
    update(time, dt) {
      if (!started) { started = true; addLantern(46, 1, time, 0); }
      if (!two && npc.hp < npc.maxHp * 0.5) {
        two = true;
        addLantern(W - 46, -1, time, 1);
        ctx.banner('A SECOND LANTERN', '#c8d8ff');
        ctx.sfx('beam-charge');
      }
      for (const l of lanterns) {
        if (time >= l.nextSlide) changeSlide(l, time, l.beast.quarry);
        const b = l.beast;
        if (formed(b, time)) {
          const k = blocker(l);
          if (k) {
            b.brokenUntil = time + BREAK_MS; b.phase = 0; b.actAt = time + BREAK_MS + 1200;
            ctx.sfx('hush');
          }
        }
        act(l, time, Math.min(dt, 0.1));
      }
    },

    npcSeek() {
      const t = tk.now;
      for (const l of lanterns) {
        const b = l.beast;
        if (b.quarry !== npc || !formed(b, t)) continue;
        // A beast is on him: break it — the beam's middle, or the lantern if that is nearer.
        const mx = (l.x + b.x) / 2, my = (l.y + b.y) / 2;
        if (dist(npc.x, npc.y, l.x, l.y) < dist(npc.x, npc.y, mx, my) * 0.7) return { x: tk.clampX(l.x + l.dir * 70), y: tk.clampY(l.y) };
        return { x: tk.clampX(mx), y: tk.clampY(my) };
      }
      // Otherwise keep out of the beam's line, so he never breaks his own picture.
      for (const l of lanterns) {
        const b = l.beast;
        if (segDist(npc.x, npc.y, l.x, l.y, b.x, b.y) < BEAM_HALF + 50) {
          const nx = -(b.y - l.y), ny = b.x - l.x, n = Math.max(1, Math.hypot(nx, ny));
          const s = (npc.x - l.x) * nx + (npc.y - l.y) * ny >= 0 ? 1 : -1;
          return { x: tk.clampX(npc.x + (nx / n) * s * 110), y: tk.clampY(npc.y + (ny / n) * s * 110) };
        }
      }
      return null;
    },

    drawGround(g, time) {
      for (const l of lanterns) {
        const b = l.beast;
        const live = time >= b.brokenUntil;
        drawBeam(g, l, b, live, time);
        if (b.kind === 'hare' && b.phase === 1) {
          const k = clamp(1 - (b.actAt - time) / tk.warn(560), 0, 1);
          g.lineStyle(2, MOON, 0.4 + 0.5 * k); g.strokeCircle(b.toX, b.toY, 44);
          g.fillStyle(MOON, 0.08 + 0.12 * k); g.fillCircle(b.toX, b.toY, 44 * k);
        }
        if (b.kind === 'hawk' && b.phase === 1) {
          const nx = -(b.toY - b.fromY), ny = b.toX - b.fromX, n = Math.max(1, Math.hypot(nx, ny));
          const ox = (nx / n) * 26, oy = (ny / n) * 26;
          g.fillStyle(MOON, 0.12);
          g.fillPoints([{ x: b.fromX + ox, y: b.fromY + oy }, { x: b.toX + ox, y: b.toY + oy }, { x: b.toX - ox, y: b.toY - oy }, { x: b.fromX - ox, y: b.fromY - oy }], true);
          g.lineStyle(1.5, MOON, 0.7); g.lineBetween(b.fromX + ox, b.fromY + oy, b.toX + ox, b.toY + oy); g.lineBetween(b.fromX - ox, b.fromY - oy, b.toX - ox, b.toY - oy);
        }
        if (live) drawBeast(g, b, clamp((time - Math.max(b.formedAt, b.brokenUntil)) / FORM_MS, 0, 1), time);
      }
    },

    drawAir(g, time) {
      for (const l of lanterns) drawLantern(g, l, time);
    },

    drawHud(g, time) {
      // The slide carrier: three little glass slides, the one in the gate lit, its beast's quarry tinted.
      lanterns.forEach((l, li) => {
        const x0 = W / 2 - 50 + li * 120, y = top + 14;
        g.fillStyle(0x000000, 0.55); g.fillRoundedRect(x0 - 8, y - 11, 84, 22, 5);
        for (let i = 0; i < 3; i++) {
          const on = l.slide % 3 === i;
          g.fillStyle(on ? MOON : MOON_DIM, on ? 1 : 0.35); g.fillRect(x0 + i * 24, y - 7, 20, 14);
          g.fillStyle(BLACKFLAME, on ? 1 : 0.6);
          if (i === 0) g.fillTriangle(x0 + i * 24 + 3, y + 5, x0 + i * 24 + 17, y + 5, x0 + i * 24 + 12, y - 5);
          else if (i === 1) { g.fillEllipse(x0 + i * 24 + 10, y + 2, 12, 7); g.fillRect(x0 + i * 24 + 8, y - 6, 2, 6); g.fillRect(x0 + i * 24 + 11, y - 6, 2, 6); }
          else g.fillTriangle(x0 + i * 24 + 2, y - 3, x0 + i * 24 + 18, y - 3, x0 + i * 24 + 10, y + 5);
        }
        const left = clamp((l.nextSlide - time) / SLIDE_MS, 0, 1);
        g.fillStyle(l.beast.quarry === player ? 0xff9a7a : 0x8ab8ff, 1); g.fillRect(x0, y + 9, 70 * left, 2);
      });
    },

    destroy() { for (const l of lanterns) { l.target?.remove(); l.target = null; } },
  };
}

/** The cone of bottled moonlight from lens to beast, with a bright oval where it falls. */
function drawBeam(g: G, l: Lantern, b: Beast, live: boolean, time: number): void {
  const a = Math.atan2(b.y - l.y, b.x - l.x);
  const nx = -Math.sin(a), ny = Math.cos(a);
  const lx = l.x + l.dir * 18, ly = l.y - 30;
  const w0 = 8, w1 = BEAM_HALF + 18;
  const alpha = live ? 0.1 : 0.035;
  g.fillStyle(MOON, alpha);
  g.fillPoints([{ x: lx + nx * w0, y: ly + ny * w0 }, { x: b.x + nx * w1, y: b.y + ny * w1 }, { x: b.x - nx * w1, y: b.y - ny * w1 }, { x: lx - nx * w0, y: ly - ny * w0 }], true);
  g.lineStyle(1, MOON, live ? 0.35 : 0.12);
  g.lineBetween(lx + nx * w0, ly + ny * w0, b.x + nx * w1, b.y + ny * w1);
  g.lineBetween(lx - nx * w0, ly - ny * w0, b.x - nx * w1, b.y - ny * w1);
  // Dust turning in the beam.
  for (let i = 0; i < 9; i++) {
    const k = ((time / 2400 + i / 9) % 1);
    const s = Math.sin(i * 2.3 + time / 900) * (w0 + (w1 - w0) * k) * 0.7;
    g.fillStyle(MOON, (live ? 0.5 : 0.15) * (1 - k * 0.5));
    g.fillCircle(lx + (b.x - lx) * k + nx * s, ly + (b.y - ly) * k + ny * s, 1.2);
  }
  g.fillStyle(MOON, live ? 0.16 : 0.05); g.fillEllipse(b.x, b.y, 110, 72);
  g.lineStyle(1.5, MOON_DIM, live ? 0.5 : 0.15); g.strokeEllipse(b.x, b.y, 110, 72);
}

/** A beast made of two hands: knuckles, a thumb for a jaw, fingers for ears or feathers. */
function drawBeast(g: G, b: Beast, form: number, time: number): void {
  const a = form;
  const ink = BLACKFLAME;
  const knuckle = dim(MOON_DIM, 0.55);
  const x = b.x, y = b.y;
  const face = Math.atan2(b.quarry.y - y, b.quarry.x - x) > Math.PI / 2 || Math.atan2(b.quarry.y - y, b.quarry.x - x) < -Math.PI / 2 ? -1 : 1;
  if (b.kind === 'wolf') {
    const open = b.phase === 1 ? 0.6 + Math.sin(time / 40) * 0.1 : 0.15;
    g.fillStyle(ink, 0.85 * a);
    g.fillEllipse(x - face * 6, y, 46, 26);                              // the back of the hand: head
    g.fillTriangle(x - face * 22, y - 8, x - face * 10, y - 10, x - face * 18, y - 32);   // ear: two fingers
    g.fillTriangle(x - face * 12, y - 10, x - face * 2, y - 10, x - face * 6, y - 30);
    g.fillTriangle(x + face * 8, y - 8, x + face * 34, y - 2 - open * 4, x + face * 10, y + 4);   // upper jaw: fingers
    g.fillTriangle(x + face * 6, y + 6, x + face * 30, y + 6 + open * 16, x + face * 4, y + 12); // lower jaw: thumb
    g.fillRect(x - face * 34 - 6, y + 6, 18, 12);                           // the wrist
    g.fillStyle(MOON, a); g.fillCircle(x + face * 4, y - 4, 2.2);           // the gap between fingers: an eye
    g.lineStyle(1, knuckle, 0.8 * a);
    for (let i = 0; i < 3; i++) g.lineBetween(x - face * (14 - i * 7), y - 12, x - face * (12 - i * 7), y - 6);
  } else if (b.kind === 'hare') {
    const up = b.phase === 1 ? Math.sin(clamp(1 - (b.actAt - time) / 560, 0, 1) * Math.PI) * 26 : 0;
    const yy = y - up;
    if (up > 0) { g.fillStyle(0x000000, 0.25 * a); g.fillEllipse(x, y + 6, 38, 12); }
    g.fillStyle(ink, 0.85 * a);
    g.fillEllipse(x, yy, 38, 24);                                         // a fist: the body
    g.fillEllipse(x + face * 14, yy - 8, 18, 14);                         // the head: a thumb knuckle
    g.fillTriangle(x + face * 8, yy - 12, x + face * 14, yy - 12, x + face * 2, yy - 46);   // ears: two fingers
    g.fillTriangle(x + face * 14, yy - 12, x + face * 20, yy - 12, x + face * 16, yy - 44);
    g.fillCircle(x - face * 18, yy - 2, 6);                               // the tail: a little finger
    g.fillStyle(MOON, a); g.fillCircle(x + face * 18, yy - 10, 1.8);
    g.lineStyle(1, knuckle, 0.8 * a);
    for (let i = 0; i < 3; i++) g.lineBetween(x - 8 + i * 7, yy - 8, x - 6 + i * 7, yy - 2);
  } else {
    const flap = Math.sin(time / (b.phase === 2 ? 40 : 120)) * 6;
    const ang = b.phase >= 1 ? Math.atan2(b.toY - b.fromY, b.toX - b.fromX) : time / 600 + Math.PI / 2;
    const ux = Math.cos(ang), uy = Math.sin(ang), px = -uy, py = ux;
    g.fillStyle(ink, 0.85 * a);
    g.fillEllipse(x, y, 20, 20);                                          // crossed thumbs: the head
    g.fillTriangle(x + ux * 16, y + uy * 16, x + px * 5, y + py * 5, x - px * 5, y - py * 5);   // beak
    for (const s of [-1, 1]) for (let i = 0; i < 4; i++) {
      // Each wing four fingers, splayed like primaries.
      const fx = x + px * s * (10 + i * 9) - ux * (i * 4), fy = y + py * s * (10 + i * 9) - uy * (i * 4);
      g.fillTriangle(x + px * s * 6, y + py * s * 6, fx + px * s * 8 - ux * (6 + flap), fy + py * s * 8 - uy * (6 + flap), fx - ux * 14, fy - uy * 14);
    }
    g.fillStyle(MOON, a); g.fillCircle(x + ux * 6 + px * 3, y + uy * 6 + py * 3, 1.6);
  }
}

/** Mumm's lantern: a brass drum on a three-legged stand, a lens, a slide gate, smoke off the chimney. */
function drawLantern(g: G, l: Lantern, time: number): void {
  const { x, y, dir } = l;
  shadow(g, x, y + 4, 60, 14, 0.4);
  g.lineStyle(3, TIMBER_DARK, 1);
  g.lineBetween(x, y - 24, x - 20, y + 2); g.lineBetween(x, y - 24, x + 20, y + 2); g.lineBetween(x, y - 24, x, y + 4);
  g.fillStyle(TIMBER, 1); g.fillRect(x - 16, y - 50, 32, 26);
  g.lineStyle(1, TIMBER_LIT, 1); g.strokeRect(x - 16, y - 50, 32, 26);
  g.fillStyle(IRON, 1); g.fillRect(x - 6, y - 64, 12, 14);
  g.fillStyle(IRON_LIT, 1); g.fillRect(x - 8, y - 66, 16, 3);
  // The lens barrel and the slide in its gate.
  g.fillStyle(IRON, 1); g.fillRect(x + dir * 16 - (dir < 0 ? 16 : 0), y - 42, 16, 12);
  g.fillStyle(MOON, 0.9); g.fillCircle(x + dir * 32, y - 36, 6);
  glow(g, x + dir * 32, y - 36, 22, MOON, 0.08, 3);
  g.fillStyle(CANDLE, 0.35); g.fillRect(x + dir * 12 - 2, y - 52, 4, 30);
  // Smoke off the chimney.
  for (let i = 0; i < 4; i++) {
    const k = ((time / 1400 + i / 4) % 1);
    g.fillStyle(0x2a2430, 0.5 * (1 - k)); g.fillCircle(x + Math.sin(time / 500 + i) * 6 * k, y - 70 - k * 40, 4 + k * 6);
  }
  if (time - l.struckAt < 300) { g.lineStyle(2, MOON, 1 - (time - l.struckAt) / 300); g.strokeCircle(x, y - 36, 30); }
}

export const FALLEN_SHADOW_SHOW: GimmickDef = {
  id: ID,
  rules: 'A lantern throws hand-shadow beasts that bite whoever they cross. Stand in the beam to break one. Strike the lantern: the next beast hunts your foe.',
  make,
};
