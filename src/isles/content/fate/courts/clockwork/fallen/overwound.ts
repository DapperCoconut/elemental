import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { glow, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { gear } from '../art';
import {
  BLUED_DARK, BLUED_LIT, BRASS, BRASS_DARK, BRASS_LIT, CARD_RED, IRON, IRON_DARK, IRON_LIT, STONE_DARK,
} from '../palette';
import { alive, clamp, dist } from '../util';

/**
 * Overwound — Key-Wife Dimity Ruddle of Cuckoo Row, who walks the Row every dawn with a ring of
 * keys and winds the families' gable clocks. In the King's telling she wound *people*: the drawn
 * who could not keep up their hours were given a key in the back and sent to work until they ran
 * down.
 *
 * In her yard both fighters are wound like clockwork. Your spring runs down as the seconds go: wound
 * tight you are brisk (quicker cooldowns, a quicker step), run low you drag, and run out you stop
 * dead — held where you stand until a turn comes back to you. Four great winding keys stand in iron
 * sockets about the yard. Strike one and it gives a full turn to *whoever stands nearest it* — and a
 * spring wound past its last turn snaps, whipping steel through its owner.
 *
 * So the keys are a gift and a gun. Wind yourself when he is far from the key; when he is full and
 * standing by one, strike it from across the yard. Halfway down, her keys turn harder and every
 * spring runs down faster.
 */

const ID = fallenId('clockwork', 'overwound');
const POST_R = 26;
const POST_CD = 1100;
const LOW = 35;
const BRISK = 78;
const EMBER = 0xe8823a;

interface Post { x: number; y: number; t: StrikeTarget | null; turnAt: number; readyAt: number; who: Fighter | null }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const fy = (k: number) => top + (H - top) * k;
  const posts: Post[] = [
    { x: W * 0.18, y: fy(0.27) }, { x: W * 0.82, y: fy(0.27) }, { x: W * 0.3, y: fy(0.8) }, { x: W * 0.7, y: fy(0.8) },
  ].map((p) => ({ ...p, t: null, turnAt: -1e9, readyAt: 0, who: null }));
  const spring = new Map<Fighter, number>([[player, 70], [npc, 70]]);
  const downUntil = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  const snapAt = new Map<Fighter, number>([[player, -1e9], [npc, -1e9]]);
  let hard = false;
  let started = false;

  const sp = (f: Fighter): number => spring.get(f) ?? 0;
  const nearestTo = (p: Pt): Fighter | null => {
    const cands = [player, npc].filter(alive);
    if (!cands.length) return null;
    return cands.reduce((a, b) => (dist(a.x, a.y, p.x, p.y) <= dist(b.x, b.y, p.x, p.y) ? a : b));
  };
  const speedOf = (f: Fighter): number => {
    const s = sp(f);
    if (tk.now < (downUntil.get(f) ?? 0)) return 1;
    return s < LOW ? 0.55 + 0.45 * (s / LOW) : s > BRISK ? 1.1 : 1;
  };
  const rateOf = (f: Fighter): number => {
    const s = sp(f);
    return s < LOW ? 0.6 + 0.4 * (s / LOW) : s > BRISK ? 1.3 : 1;
  };

  function snap(f: Fighter, time: number): void {
    snapAt.set(f, time);
    spring.set(f, 45);
    if (f === player) tk.hitPlayer(18, f.x, f.y);
    else { ctx.hit(npc, 30, f.x, f.y); ctx.float(f.x, f.y - 56, 'OVERWOUND', '#8aa4f0'); }
    ctx.stun(f, 900);
    ctx.flash(f.x, f.y, BLUED_LIT);
    ctx.sfx('snap-back');
  }

  function wind(p: Post, time: number): void {
    if (time < p.readyAt) return;
    const f = nearestTo(p);
    if (!f) return;
    p.readyAt = time + POST_CD;
    p.turnAt = time;
    p.who = f;
    ctx.sfx('gear-turn');
    const s = sp(f) + (hard ? 46 : 38);
    if (s > 100) snap(f, time);
    else spring.set(f, s);
  }

  return {
    update(time, dt) {
      const d = clamp(dt, 0, 0.1);
      if (!started) {
        started = true;
        for (const p of posts) { const pp = p; pp.t = ctx.target({ x: pp.x, y: pp.y - 40, r: POST_R, onStruck: () => wind(pp, ctx.scene.time.now) }); }
      }
      if (!hard && npc.hp < npc.maxHp * 0.5) {
        hard = true;
        ctx.banner('THE KEYS TURN HARDER', '#8aa4f0');
        ctx.sfx('gear-turn');
      }
      for (const f of [player, npc]) {
        if (!alive(f)) continue;
        const until = downUntil.get(f) ?? 0;
        if (time < until) continue;
        if (until > 0 && sp(f) <= 0) { spring.set(f, 30); downUntil.set(f, 0); ctx.sfx('clock-tick'); continue; }
        const s = sp(f) - (hard ? 7 : 5.5) * d;
        if (s <= 0) {
          spring.set(f, 0);
          downUntil.set(f, time + 1400);
          ctx.root(f, 1400);
          ctx.sfx('status-slow');
          if (f === npc) ctx.float(f.x, f.y - 56, 'RUN DOWN', '#c8c8c0');
        } else spring.set(f, s);
      }
    },

    playerSpeedMult: () => speedOf(player),
    npcSpeedMult: () => speedOf(npc),
    playerCooldownRate: () => rateOf(player),
    npcCooldownRate: () => rateOf(npc),

    npcSeek() {
      if (!alive(npc) || !alive(player)) return null;
      // Running low: stand at the key nearest it, closer than you.
      if (sp(npc) < 40) {
        const p = posts.reduce((a, b) => (dist(npc.x, npc.y, a.x, a.y) <= dist(npc.x, npc.y, b.x, b.y) ? a : b));
        return { x: tk.clampX(p.x + (npc.x < p.x ? -30 : 30)), y: tk.clampY(p.y + 14) };
      }
      // You are wound full by a key: get the key between us, so blows at you turn it on you.
      if (sp(player) > 58) {
        const p = posts.reduce((a, b) => (dist(player.x, player.y, a.x, a.y) <= dist(player.x, player.y, b.x, b.y) ? a : b));
        const dp = dist(player.x, player.y, p.x, p.y);
        if (dp < 240) {
          const ux = (p.x - player.x) / (dp || 1), uy = (p.y - player.y) / (dp || 1);
          const r = Math.max(90, dp + 50);
          return { x: tk.clampX(p.x + ux * r), y: tk.clampY(p.y + uy * r) };
        }
      }
      return null;
    },

    drawGround(g, time) {
      for (const p of posts) drawPost(g, p, time, time < p.readyAt);
      for (const f of [player, npc]) if (alive(f)) drawCoil(g, f.x, f.y + 20, sp(f), f === player ? BLUED_LIT : EMBER, time);
    },

    drawAir(g, time) {
      for (const p of posts) drawKeyBow(g, p, time, p.who === player ? BLUED_LIT : EMBER);
      for (const f of [player, npc]) {
        if (!alive(f)) continue;
        drawBackKey(g, f.x + 16, f.y - 30, sp(f), time, time < (downUntil.get(f) ?? 0));
        const k = (time - (snapAt.get(f) ?? -1e9)) / 600;
        if (k >= 0 && k < 1) drawSnap(g, f.x, f.y, k);
      }
    },

    drawHud(g, time) {
      const y = top + 18;
      for (const f of [player, npc]) {
        const x = W / 2 + (f === player ? -40 : 40);
        const s = sp(f);
        g.fillStyle(0x000000, 0.55); g.fillCircle(x, y, 17);
        g.fillStyle(IRON_DARK, 1); g.fillCircle(x, y, 14);
        // The barrel's spring: more turns, tighter, as it winds.
        spiral(g, x, y, 12, 1.2 + s / 30, s > 90 ? CARD_RED : f === player ? BLUED_LIT : EMBER, 1.5, time / 600 * (s / 60));
        // Tension arc round the barrel, with the red mark at the last turn.
        g.lineStyle(3, s < LOW ? 0xa8a8a0 : f === player ? BLUED_LIT : EMBER, 0.9);
        g.beginPath(); g.arc(x, y, 17, -Math.PI / 2, -Math.PI / 2 + (Math.min(100, s) / 100) * Math.PI * 2, false); g.strokePath();
        g.fillStyle(CARD_RED, 1); g.fillCircle(x, y - 17, 2.5);
      }
    },

    destroy() { for (const p of posts) p.t?.remove(); },
  };
}

/** An Archimedean spiral: the mainspring seen end-on. */
function spiral(g: G, x: number, y: number, r: number, turns: number, color: number, w: number, a0: number, sq = 1): void {
  g.lineStyle(w, color, 0.95);
  g.beginPath();
  const n = Math.ceil(turns * 24);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = a0 + t * turns * Math.PI * 2;
    const rr = 2 + t * (r - 2);
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr * sq;
    if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
  }
  g.strokePath();
}

/** The fighter's mainspring laid flat round their feet: loose and grey when run down, tight and bright when wound. */
function drawCoil(g: G, x: number, y: number, s: number, color: number, time: number): void {
  const col = s > 90 ? CARD_RED : s < LOW ? 0x8a8a84 : color;
  spiral(g, x, y, 30, 1 + s / 28, col, 1.6, -time / 700 * (0.3 + s / 80), 0.36);
  if (s > 90) glow(g, x, y, 30, CARD_RED, 0.04 + Math.sin(time / 70) * 0.02, 2);
}

/** A winding key in the fighter's back: a brass bow on a short shaft, turning as the spring runs down. */
function drawBackKey(g: G, x: number, y: number, s: number, time: number, down: boolean): void {
  const spin = down ? 0 : time / (260 + (100 - Math.min(100, s)) * 9);
  const w = Math.cos(spin) * 11;
  g.lineStyle(3, BRASS_DARK, 1); g.lineBetween(x - 8, y + 6, x, y);
  g.fillStyle(down ? 0x8a8070 : BRASS, 1);
  g.fillEllipse(x + 2, y - 6, Math.abs(w) * 2 + 3, 16);
  g.fillStyle(down ? 0x5a5448 : BRASS_DARK, 1);
  g.fillEllipse(x + 2, y - 6, Math.abs(w) * 1.1 + 1, 7);
  g.lineStyle(1, BRASS_LIT, 0.8); g.strokeEllipse(x + 2, y - 6, Math.abs(w) * 2 + 3, 16);
}

/** A great winding key in its iron socket: ratchet wheel, click, and a square arbor. */
function drawPost(g: G, p: Post, time: number, cocking: boolean): void {
  shadow(g, p.x, p.y + 4, 90, 26, 0.34);
  g.fillStyle(STONE_DARK, 1); g.fillEllipse(p.x, p.y, 84, 30);
  g.fillStyle(IRON_DARK, 1); g.fillEllipse(p.x, p.y - 2, 70, 24);
  const k = clamp((time - p.turnAt) / 500, 0, 1);
  gear(g, p.x, p.y - 4, 32, 18, k * Math.PI + p.x * 0.01, IRON, 0.34, 4);
  // The click: a pawl that lifts while the ratchet re-cocks.
  const lift = cocking ? 0.5 : 0;
  g.lineStyle(4, IRON_LIT, 1);
  g.lineBetween(p.x + 34, p.y - 6, p.x + 24 - lift * 4, p.y - 10 - lift * 8);
  g.fillStyle(BRASS, 1); g.fillCircle(p.x + 34, p.y - 6, 3);
  // The arbor rising out of the socket.
  g.fillStyle(IRON_DARK, 1); g.fillRect(p.x - 5, p.y - 36, 10, 32);
  g.fillStyle(IRON_LIT, 0.6); g.fillRect(p.x - 4, p.y - 36, 3, 32);
}

/** The key's bow, turning with each wind, its owner's colour flashing on the turn. */
function drawKeyBow(g: G, p: Post, time: number, flashColor: number): void {
  const k = clamp((time - p.turnAt) / 500, 0, 1);
  const a = k < 1 ? k * Math.PI : 0;
  const w = Math.cos(a) * 26;
  const bx = p.x, by = p.y - 54;
  g.fillStyle(BRASS_DARK, 1); g.fillRect(bx - 6, by + 6, 12, 14);
  g.fillStyle(BRASS_DARK, 1); g.fillEllipse(bx, by - 4, Math.abs(w) * 2 + 6, 40);
  g.fillStyle(BRASS, 1); g.fillEllipse(bx, by - 6, Math.abs(w) * 2 + 4, 36);
  // Trefoil cut-outs in the bow.
  if (Math.abs(w) > 6) {
    for (const [ox, oy] of [[0, -12], [-0.45, 2], [0.45, 2]] as [number, number][]) {
      g.fillStyle(BLUED_DARK, 1); g.fillEllipse(bx + ox * w, by - 6 + oy, Math.abs(w) * 0.5, 9);
    }
  }
  g.lineStyle(1.5, BRASS_LIT, 0.9); g.strokeEllipse(bx, by - 6, Math.abs(w) * 2 + 4, 36);
  if (k < 1 && p.who) glow(g, bx, by - 6, 34, flashColor, 0.08 * (1 - k), 2);
}

/** A snapped mainspring: blued steel whipping out of the fighter in loose coils. */
function drawSnap(g: G, x: number, y: number, k: number): void {
  for (let i = 0; i < 5; i++) {
    const a0 = i * 1.26;
    g.lineStyle(3 - k * 2, i % 2 ? BLUED_LIT : IRON_LIT, 1 - k);
    g.beginPath();
    for (let t = 0; t <= 12; t++) {
      const rr = 10 + t * (4 + k * 7);
      const a = a0 + t * 0.32;
      const px = x + Math.cos(a) * rr, py = y - 10 + Math.sin(a) * rr * 0.7;
      if (t === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.strokePath();
  }
}

export const FALLEN_OVERWOUND: GimmickDef = {
  id: ID,
  rules: 'Your spring runs down: wound tight you are brisk, run out you stop dead. Strike a key to wind whoever is nearest it. Past the last turn it snaps.',
  make,
};
