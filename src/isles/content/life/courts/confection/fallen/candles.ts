import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { dim, glow, lit, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { CHERRY, ICING, ICING_SHADE, LEMON, MINT, PINK, PINK_PALE, SWEETS, dist, rosette } from '../art';
import { alive, clamp, frameClock } from './util';

/**
 * Blow Out the Candles — Candlewick Fennel, chandler to the Bonbonnière, who in the King's telling
 * kept the Prince's birthday burning all year round, and the town paid for every candle.
 *
 * The floor is the top of the Prince's birthday cake, and six tall twisted candles burn round it.
 * Every lit candle shields Fennel — he takes less from you the more of them are burning. Strike a
 * candle to snuff it; Fennel walks round with his taper relighting them. Snuff all six and the
 * Prince *makes a wish*: Fennel is struck dumb a moment and wide open, then the cake lights itself.
 * Meanwhile the candles spit: one at a time, a lit candle swells and flicks a gout of hot wax at
 * whoever is nearest to it — a marked circle that burns on landing and sets into a slick puddle
 * that drags at your feet.
 *
 * The spit picks the nearest fighter, and Fennel must stand right by a candle to relight it.
 * Halfway, the cake begins to turn: candles orbit, and everyone standing on the cake is carried.
 */

const ID = fallenId('confection', 'candles');
const N = 6;
const RING = 190;
const CAKE_R = 252;
const RELIGHT_R = 52;
const RELIGHT_MS = 900;
const WISH_STUN_MS = 2200;
const WISH_MS = 4200;
const WISH_RELIGHT_MS = 5200;
const SPIT_EVERY_MS = 2900;
const SPIT_WARN_MS = 1150;
const SPIT_R = 58;
const SPIT_PLAYER = 14;
const SPIT_NPC = 26;
const PUDDLE_MS = 4200;
const SPIN = 0.32;

interface Candle { a: number; lit: boolean; relight: number; target: StrikeTarget | null; hue: number; spitFrom: number }
interface Spit { from: Pt; to: Pt; at: number; landAt: number; landed: boolean }
interface Puddle { x: number; y: number; at: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const step = frameClock();
  const c: Pt = { x: W / 2, y: (top + H) / 2 + 6 };
  const candles: Candle[] = Array.from({ length: N }, (_, i) => ({ a: -Math.PI / 2 + (i * Math.PI * 2) / N, lit: true, relight: 0, target: null, hue: SWEETS[i % SWEETS.length], spitFrom: -1e9 }));
  let spits: Spit[] = [];
  let puddles: Puddle[] = [];
  let nextSpit = 0;
  let spitIdx = 0;
  let turned = false;
  let wishAt = -1e9;
  let wishLit = 0;
  let now = 0;
  let started = false;

  const pos = (cd: Candle): Pt => ({ x: c.x + Math.cos(cd.a) * RING, y: c.y + Math.sin(cd.a) * RING * 0.8 });
  const litCount = (): number => candles.filter((cd) => cd.lit).length;
  const wishing = (): boolean => now - wishAt < WISH_MS;
  const inPuddle = (f: Fighter): boolean => puddles.some((p) => dist(f.x, f.y, p.x, p.y) < SPIT_R - 6);

  const snuff = (cd: Candle): void => {
    if (!cd.lit) return;
    cd.lit = false; cd.relight = 0;
    const p = pos(cd);
    ctx.sfx('hush');
    if (litCount() === 0) {
      wishAt = now;
      wishLit = now + WISH_RELIGHT_MS;
      ctx.banner('MAKE A WISH!', '#ffe070');
      ctx.sfx('jackpot');
      ctx.stun(npc, WISH_STUN_MS);
    } else ctx.float(p.x, p.y - 74, `${litCount()} LEFT`, '#fff0c8');
  };

  return {
    update(time) {
      const dt = step(time);
      now = time;
      if (!started) {
        started = true;
        nextSpit = time + 2400;
        for (const cd of candles) {
          const p = pos(cd);
          cd.target = ctx.target({ x: p.x, y: p.y - 30, r: 16, onStruck: (by) => { if (by === 'player') snuff(cd); } });
        }
      }
      if (!turned && npc.hp < npc.maxHp * 0.5) {
        turned = true;
        ctx.banner('THE CAKE TURNS', '#ffe070');
        ctx.sfx('gear-turn');
      }
      if (turned) {
        for (const cd of candles) cd.a += SPIN * dt;
        for (const f of [player, npc]) {
          if (!alive(f)) continue;
          const dx = f.x - c.x, dy = f.y - c.y;
          if (Math.hypot(dx, dy / 0.8) > CAKE_R) continue;
          ctx.nudge(f, -dy * SPIN * dt, dx * SPIN * dt * 0.8);
        }
        for (const p of puddles) {
          const dx = p.x - c.x, dy = p.y - c.y;
          if (Math.hypot(dx, dy / 0.8) <= CAKE_R) { p.x += -dy * SPIN * dt; p.y += dx * SPIN * dt * 0.8; }
        }
      }
      for (const cd of candles) { const p = pos(cd); cd.target?.moveTo(p.x, p.y - 30); }

      // Fennel's taper: stand by a dark candle long enough and it lights.
      if (alive(npc) && !wishing()) {
        for (const cd of candles) {
          if (cd.lit) continue;
          const p = pos(cd);
          if (dist(npc.x, npc.y, p.x, p.y) < RELIGHT_R) {
            cd.relight += dt * 1000;
            if (cd.relight >= RELIGHT_MS) { cd.lit = true; cd.relight = 0; ctx.sfx('sizzle'); }
          } else cd.relight = Math.max(0, cd.relight - dt * 600);
        }
      }
      if (wishLit && time >= wishLit) { wishLit = 0; for (const cd of candles) cd.lit = true; ctx.sfx('flame-burst'); }

      // The spit: one lit candle at a time, at whoever stands nearest to it.
      if (time >= nextSpit) {
        nextSpit = time + SPIT_EVERY_MS * (turned ? 0.8 : 1);
        const litOnes = candles.filter((cd) => cd.lit);
        if (litOnes.length) {
          const cd = litOnes[spitIdx++ % litOnes.length];
          const p = pos(cd);
          const near = [player, npc].filter(alive).sort((a, b) => dist(a.x, a.y, p.x, p.y) - dist(b.x, b.y, p.x, p.y))[0];
          if (near) {
            cd.spitFrom = time;
            spits.push({ from: { x: p.x, y: p.y - 56 }, to: { x: near.x, y: near.y }, at: time, landAt: time + tk.warn(SPIT_WARN_MS), landed: false });
            ctx.sfx('status-burn');
          }
        }
      }
      for (const s of spits) {
        if (s.landed || time < s.landAt) continue;
        s.landed = true;
        ctx.sfx('slime-splat');
        puddles.push({ x: s.to.x, y: s.to.y, at: time });
        if (alive(player) && dist(player.x, player.y, s.to.x, s.to.y) < SPIT_R + 14) tk.hitPlayer(SPIT_PLAYER, s.to.x, s.to.y);
        if (alive(npc) && dist(npc.x, npc.y, s.to.x, s.to.y) < SPIT_R + 14) { ctx.hit(npc, SPIT_NPC, s.to.x, s.to.y); ctx.float(npc.x, npc.y - 60, 'WAXED', '#fff0c8'); }
      }
      spits = spits.filter((s) => !s.landed || time - s.landAt < 300);
      puddles = puddles.filter((p) => time - p.at < PUDDLE_MS);
    },

    npcTakenMult() { return wishing() ? 1.5 : Math.max(0.4, 1 - litCount() * 0.1); },
    playerSpeedMult() { return inPuddle(player) ? 0.6 : 1; },
    npcSpeedMult() { return inPuddle(npc) ? 0.6 : 1; },

    npcSeek() {
      if (!alive(npc) || wishing()) return null;
      const dark = candles.filter((cd) => !cd.lit);
      if (dark.length < 2) return null;
      dark.sort((a, b) => dist(npc.x, npc.y, pos(a).x, pos(a).y) - dist(npc.x, npc.y, pos(b).x, pos(b).y));
      const p = pos(dark[0]);
      return { x: tk.clampX(c.x + (p.x - c.x) * 0.86), y: tk.clampY(c.y + (p.y - c.y) * 0.86) };
    },

    drawGround(g, time) {
      drawCake(g, c, turned ? (time / 1000) * SPIN : 0);
      for (const p of puddles) {
        const k = 1 - (time - p.at) / PUDDLE_MS;
        g.fillStyle(dim(LEMON, 0.2), 0.55 * Math.min(1, k * 3)); g.fillEllipse(p.x, p.y, SPIT_R * 2, SPIT_R * 1.3);
        g.fillStyle(lit(LEMON, 0.5), 0.5 * Math.min(1, k * 3)); g.fillEllipse(p.x - 10, p.y - 6, SPIT_R * 0.9, SPIT_R * 0.4);
        g.lineStyle(2, dim(LEMON, 0.45), 0.6 * k); g.strokeEllipse(p.x, p.y, SPIT_R * 2, SPIT_R * 1.3);
      }
      for (const s of spits) {
        if (s.landed) continue;
        const k = clamp((time - s.at) / (s.landAt - s.at), 0, 1);
        g.lineStyle(2, CHERRY, 0.4 + k * 0.5); g.strokeCircle(s.to.x, s.to.y, SPIT_R);
        g.fillStyle(LEMON, 0.08 + k * 0.12); g.fillCircle(s.to.x, s.to.y, SPIT_R * k);
      }
    },

    drawAir(g, time) {
      const order = [...candles].sort((a, b) => pos(a).y - pos(b).y);
      for (const cd of order) drawCandle(g, pos(cd), cd, time, wishing());
      for (const s of spits) {
        if (s.landed) continue;
        const k = clamp((time - s.at) / (s.landAt - s.at), 0, 1);
        if (k < 0.35) continue;
        const e = (k - 0.35) / 0.65;
        const x = s.from.x + (s.to.x - s.from.x) * e, y = s.from.y + (s.to.y - s.from.y) * e - Math.sin(e * Math.PI) * 90;
        g.fillStyle(dim(LEMON, 0.2), 1); g.fillCircle(x, y, 8);
        g.fillStyle(lit(LEMON, 0.4), 1); g.fillCircle(x - 2, y - 2, 4);
        glow(g, x, y, 16, 0xffb050, 0.06, 2);
      }
    },

    drawHud(g, time) {
      const x = W / 2 - (N * 16) / 2, y = top + 20;
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x - 10, y - 16, N * 16 + 20, 30, 6);
      candles.forEach((cd, i) => {
        const cx = x + i * 16 + 4;
        g.fillStyle(cd.hue, 1); g.fillRect(cx - 3, y - 4, 6, 14);
        if (cd.lit) { g.fillStyle(0xffb050, 1); g.fillTriangle(cx - 3, y - 5, cx + 3, y - 5, cx, y - 13 - Math.sin(time / 90 + i) * 1.5); }
        else { g.fillStyle(0x888888, 0.6); g.fillCircle(cx, y - 9, 2); }
      });
      if (wishing()) { g.lineStyle(2, LEMON, 1); g.strokeRoundedRect(x - 12, y - 18, N * 16 + 24, 34, 7); }
    },

    destroy() { for (const cd of candles) cd.target?.remove(); },
  };
}

/** The cake seen from above: pink icing, a ring of piped rosettes, sprinkles, the lettering ring. */
function drawCake(g: G, c: Pt, turn: number): void {
  shadow(g, c.x, c.y + 10, CAKE_R * 2.1, CAKE_R * 1.7, 0.25);
  g.fillStyle(dim(PINK, 0.3), 1); g.fillEllipse(c.x, c.y + 6, CAKE_R * 2, CAKE_R * 1.6);
  g.fillStyle(PINK_PALE, 1); g.fillEllipse(c.x, c.y, CAKE_R * 2, CAKE_R * 1.6);
  g.fillStyle(lit(PINK_PALE, 0.25), 1); g.fillEllipse(c.x, c.y, CAKE_R * 1.5, CAKE_R * 1.2);
  g.lineStyle(2, ICING_SHADE, 0.8); g.strokeEllipse(c.x, c.y, RING * 2.36, RING * 1.9);
  for (let i = 0; i < 30; i++) {
    const a = turn + (i / 30) * Math.PI * 2;
    rosette(g, c.x + Math.cos(a) * (CAKE_R - 12), c.y + Math.sin(a) * (CAKE_R - 12) * 0.8, 7, i % 2 ? ICING : MINT);
  }
  for (let i = 0; i < 70; i++) {
    const a = turn + i * 2.399, r = 30 + ((i * 41) % 190);
    const x = c.x + Math.cos(a) * r, y = c.y + Math.sin(a) * r * 0.8;
    g.lineStyle(2, SWEETS[i % SWEETS.length], 0.9);
    g.lineBetween(x - Math.cos(i) * 3, y - Math.sin(i) * 3, x + Math.cos(i) * 3, y + Math.sin(i) * 3);
  }
  // A cherry on the middle.
  g.fillStyle(dim(CHERRY, 0.4), 1); g.fillCircle(c.x + 1, c.y + 2, 13);
  g.fillStyle(CHERRY, 1); g.fillCircle(c.x, c.y, 12);
  g.fillStyle(0xffffff, 0.6); g.fillCircle(c.x - 4, c.y - 4, 3);
}

/** A tall twisted birthday candle: spiral stripes, wax runs, a flame or a curl of smoke and a relight glow. */
function drawCandle(g: G, p: Pt, cd: Candle, time: number, wish: boolean): void {
  const h = 58;
  const swell = time - cd.spitFrom < 1150 ? Math.sin(((time - cd.spitFrom) / 1150) * Math.PI) : 0;
  shadow(g, p.x, p.y + 2, 26, 8, 0.35);
  g.fillStyle(dim(cd.hue, 0.35), 1); g.fillRoundedRect(p.x - 7, p.y - h, 14, h, 3);
  g.fillStyle(cd.hue, 1); g.fillRoundedRect(p.x - 6, p.y - h, 11, h, 3);
  for (let i = 0; i < 6; i++) {
    const y = p.y - 6 - i * 9;
    g.lineStyle(3, ICING, 0.9); g.lineBetween(p.x - 6, y, p.x + 6, y - 6);
  }
  for (const dx of [-4, 3]) { g.fillStyle(lit(cd.hue, 0.4), 1); g.fillRoundedRect(p.x + dx, p.y - h, 3, 10 + Math.abs(dx) * 3, 1.5); }
  g.lineStyle(1.5, 0x2a2420, 1); g.lineBetween(p.x, p.y - h, p.x, p.y - h - 6);
  const fy = p.y - h - 6;
  if (cd.lit) {
    const fl = 1 + Math.sin(time / 70 + cd.a * 3) * 0.12 + swell * 0.9;
    g.fillStyle(0xff7a20, 0.9); g.fillEllipse(p.x, fy - 7 * fl, 10 * fl, 18 * fl);
    g.fillStyle(0xffd060, 1); g.fillEllipse(p.x, fy - 6 * fl, 6 * fl, 12 * fl);
    g.fillStyle(0xffffff, 0.9); g.fillEllipse(p.x, fy - 3, 2.5, 5);
    glow(g, p.x, fy - 8, 34 + swell * 30, swell > 0 ? 0xff7a20 : 0xffd060, 0.05, 3);
  } else {
    for (let i = 0; i < 5; i++) {
      const ph = (time / 1300 + i / 5) % 1;
      g.fillStyle(0xb8b0b8, 0.5 * (1 - ph)); g.fillCircle(p.x + Math.sin(ph * 6 + i) * 5, fy - ph * 34, 2 + ph * 4);
    }
    if (cd.relight > 0 && !wish) {
      g.lineStyle(3, 0xffb050, 0.9);
      g.beginPath(); g.arc(p.x, fy - 4, 10, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (cd.relight / RELIGHT_MS), false); g.strokePath();
    }
  }
}

export const FALLEN_CANDLES: GimmickDef = {
  id: ID,
  rules: 'Lit candles shield Fennel: strike them to snuff, he relights. Snuff all six for a wish. Candles spit wax at the nearest. At half, the cake turns.',
  make,
};
