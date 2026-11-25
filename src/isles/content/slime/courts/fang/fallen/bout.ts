import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { dim, lit, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { risenCobra } from '../art';
import { BRASS, FANG_LIT, MUD_DARK, MUD_LIT, VENOM, VENOM_LIT } from '../palette';
import { alive, clamp, dist, segDist, stepDt } from '../util';

/**
 * The Pit-Bout — Bout-Master Crispin Moyle, in the King's telling the man who ran the cobra-and-
 * mongoose bouts at the Prince's table and took the court's bets on them.
 *
 * Moyle has let a cobra and a mongoose loose in the yard. The mongoose hunts the cobra; the
 * cobra, which is no fool, hides at the feet of whoever stands nearest it — putting that fighter
 * between itself and the mongoose. So the shelter is the target: the mongoose crouches, a line
 * runs from it to the cobra, and it pounces down that line, bowling over everyone on it. If it
 * reaches the cobra the two scrap in a cloud of dust that cuts anyone close. While the mongoose
 * trots near, the cobra hoods and spits at it, and the spit crosses whoever is in between.
 *
 * The exploit: strike the cobra and it bolts away from you and takes shelter with your foe, and
 * clings to him a while. Make it his snake. Halfway down Moyle looses a second mongoose.
 */

const ID = fallenId('fang', 'bout');
const COBRA_SPEED = 165;
const TROT = 120;
const POUNCE = 560;
const CROUCH_MS = 720;
const SCRAP_MS = 1600;
const SCRAP_R = 70;
const BOWL = 12;
const SCRAP = 5;
const SPIT = 7;
const SPIT_WARN = 560;
const LOCK_MS = 4000;
const MONGOOSE = 0x9a8058;
const MONGOOSE_DARK = 0x5e4a30;

type MState = 'trot' | 'crouch' | 'pounce' | 'scrap' | 'rest';
/** A mongoose: where it is, what it is doing, and the line of its pounce. */
interface Mongoose { x: number; y: number; state: MState; at: number; ax: number; ay: number; bx: number; by: number; bowled: Set<Fighter>; nextScrapTick: number; trotFrom: number; seed: number }
/** A spit lane in the air: from the cobra, toward a mongoose. */
interface Spit { ax: number; ay: number; bx: number; by: number; at: number; fired: boolean }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const cobra = { x: W / 2, y: (top + H) / 2, shelter: player as Fighter, lockUntil: 0, boltX: 0, boltY: 0, boltUntil: 0, nextSpit: 0, held: false, face: 0 };
  let target: StrikeTarget | null = null;
  const goose: Mongoose[] = [];
  const spits: Spit[] = [];
  const tally = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  let npcSlowUntil = 0;
  let second = false;
  const now = (): number => ctx.scene.time.now;
  const other = (f: Fighter): Fighter => (f === player ? npc : player);

  function addMongoose(x: number, y: number, time: number, delay: number): void {
    goose.push({ x, y, state: 'rest', at: time + delay, ax: 0, ay: 0, bx: 0, by: 0, bowled: new Set(), nextScrapTick: 0, trotFrom: time, seed: rng() * 6 });
  }

  function strikeCobra(by: 'player' | 'npc'): void {
    if (cobra.held) return;
    const s = by === 'player' ? player : npc;
    const a = Math.atan2(cobra.y - s.y, cobra.x - s.x);
    cobra.boltX = clamp(cobra.x + Math.cos(a) * 150, 60, W - 60);
    cobra.boltY = clamp(cobra.y + Math.sin(a) * 150, top + 40, H - 40);
    cobra.boltUntil = now() + 420;
    cobra.shelter = other(s);
    cobra.lockUntil = now() + LOCK_MS;
    ctx.sfx('whip');
    ctx.float(cobra.x, cobra.y - 40, 'BOLTS', '#e8d890');
  }

  function hurt(f: Fighter, dmg: number, word: string): void {
    ctx.hit(f, dmg, f.x, f.y);
    tally.set(f, (tally.get(f) ?? 0) + 1);
    ctx.float(f.x, f.y - 46, word, '#f0d890');
  }

  const nearestGoose = (x: number, y: number): Mongoose | null => {
    let best: Mongoose | null = null, bd = Infinity;
    for (const m of goose) { const d = dist(m.x, m.y, x, y); if (d < bd) { bd = d; best = m; } }
    return best;
  };

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!target) {
        target = ctx.target({ x: cobra.x, y: cobra.y - 10, r: 20, passThrough: true, onStruck: (by) => strikeCobra(by) });
        addMongoose(W / 2, top + 40, time, 1400);
        cobra.nextSpit = time + 3000;
      }
      if (!second && npc.hp / npc.maxHp < 0.5) {
        second = true;
        addMongoose(W / 2, H - 40, time, 600);
        ctx.banner('Moyle looses a second mongoose', '#f0d890'); ctx.sfx('roar');
      }
      // The cobra: choose its shelter, then slide in behind it, away from the nearest mongoose.
      if (time > cobra.lockUntil && alive(player) && alive(npc)) {
        const dp = dist(player.x, player.y, cobra.x, cobra.y), dn = dist(npc.x, npc.y, cobra.x, cobra.y);
        if (cobra.shelter === player ? dn < dp - 40 : dp < dn - 40) cobra.shelter = cobra.shelter === player ? npc : player;
      }
      if (!alive(cobra.shelter)) cobra.shelter = other(cobra.shelter);
      if (!cobra.held) {
        let tx: number, ty: number, sp = COBRA_SPEED;
        if (time < cobra.boltUntil) { tx = cobra.boltX; ty = cobra.boltY; sp = 400; }
        else {
          const s = cobra.shelter, m = nearestGoose(s.x, s.y);
          const a = m ? Math.atan2(s.y - m.y, s.x - m.x) : 0;
          tx = s.x + Math.cos(a) * 38; ty = s.y + Math.sin(a) * 24 + 10;
        }
        const d = dist(cobra.x, cobra.y, tx, ty);
        if (d > 4) { const st = Math.min(d, sp * dt); cobra.face = Math.atan2(ty - cobra.y, tx - cobra.x); cobra.x += ((tx - cobra.x) / d) * st; cobra.y += ((ty - cobra.y) / d) * st; }
        cobra.x = clamp(cobra.x, 50, W - 50); cobra.y = clamp(cobra.y, top + 30, H - 30);
      }
      target?.moveTo(cobra.x, cobra.y - 10);

      // Mongooses.
      cobra.held = false;
      for (const m of goose) {
        if (time < m.at) continue;
        switch (m.state) {
          case 'rest': m.state = 'trot'; m.trotFrom = time; break;
          case 'trot': {
            const a = Math.atan2(m.y - cobra.y, m.x - cobra.x);
            const tx = cobra.x + Math.cos(a) * 210, ty = cobra.y + Math.sin(a) * 210;
            const d = dist(m.x, m.y, tx, ty);
            if (d > 6) { m.x += ((tx - m.x) / d) * Math.min(d, TROT * dt); m.y += ((ty - m.y) / d) * Math.min(d, TROT * dt); }
            m.x = clamp(m.x, 40, W - 40); m.y = clamp(m.y, top + 24, H - 24);
            const dc = dist(m.x, m.y, cobra.x, cobra.y);
            if (time - m.trotFrom > (second ? 1500 : 1900) && dc > 120 && dc < 340) {
              m.state = 'crouch'; m.at = time;
              const b = Math.atan2(cobra.y - m.y, cobra.x - m.x);
              m.ax = m.x; m.ay = m.y; m.bx = clamp(cobra.x + Math.cos(b) * 40, 40, W - 40); m.by = clamp(cobra.y + Math.sin(b) * 40, top + 24, H - 24);
              m.bowled.clear();
              ctx.sfx('trap-set');
            }
            break;
          }
          case 'crouch':
            if (time - m.at >= CROUCH_MS) { m.state = 'pounce'; m.at = time; ctx.sfx('dash'); }
            break;
          case 'pounce': {
            const len = dist(m.ax, m.ay, m.bx, m.by);
            const k = clamp(((time - m.at) / 1000) * POUNCE / Math.max(1, len), 0, 1);
            m.x = m.ax + (m.bx - m.ax) * k; m.y = m.ay + (m.by - m.ay) * k;
            for (const f of [player, npc]) {
              if (!alive(f) || m.bowled.has(f) || dist(f.x, f.y, m.x, m.y) > 44) continue;
              m.bowled.add(f);
              hurt(f, BOWL, 'BOWLED OVER');
              const nx = -(m.by - m.ay) / Math.max(1, len), ny = (m.bx - m.ax) / Math.max(1, len);
              const side = (f.x - m.x) * nx + (f.y - m.y) * ny >= 0 ? 1 : -1;
              ctx.nudge(f, nx * side * 50, ny * side * 50);
              ctx.stun(f, 350);
              ctx.sfx('hit-medium');
            }
            if (k >= 1) {
              if (dist(m.x, m.y, cobra.x, cobra.y) < 56) { m.state = 'scrap'; m.at = time; m.nextScrapTick = time + 400; ctx.sfx('screech'); }
              else { m.state = 'rest'; m.at = time + 600; }
            }
            break;
          }
          case 'scrap':
            cobra.held = true;
            cobra.x += (m.x - cobra.x) * 0.2; cobra.y += (m.y - cobra.y) * 0.2;
            if (time >= m.nextScrapTick) {
              m.nextScrapTick = time + 500;
              for (const f of [player, npc]) if (alive(f) && dist(f.x, f.y, m.x, m.y) < SCRAP_R) hurt(f, SCRAP, 'CLAWED');
              ctx.sfx('slash');
            }
            if (time - m.at >= SCRAP_MS) {
              m.state = 'rest'; m.at = time + 700;
              const a = Math.atan2(cobra.shelter.y - m.y, cobra.shelter.x - m.x);
              cobra.boltX = clamp(m.x + Math.cos(a) * 130, 60, W - 60); cobra.boltY = clamp(m.y + Math.sin(a) * 130, top + 40, H - 40);
              cobra.boltUntil = time + 400;
            }
            break;
        }
      }

      // The cobra spits at a trotting mongoose that comes close.
      const near = goose.find((m) => m.state === 'trot' && time >= m.at && dist(m.x, m.y, cobra.x, cobra.y) < 240);
      if (near && time >= cobra.nextSpit && !cobra.held) {
        const a = Math.atan2(near.y - cobra.y, near.x - cobra.x);
        spits.push({ ax: cobra.x, ay: cobra.y - 10, bx: cobra.x + Math.cos(a) * 300, by: cobra.y - 10 + Math.sin(a) * 300, at: time, fired: false });
        cobra.nextSpit = time + 2600;
        ctx.sfx('sizzle');
      }
      for (const s of [...spits]) {
        if (!s.fired && time - s.at >= SPIT_WARN) {
          s.fired = true;
          ctx.sfx('slime-splat');
          for (const f of [player, npc]) {
            if (!alive(f) || segDist(f.x, f.y, s.ax, s.ay, s.bx, s.by) > 26) continue;
            hurt(f, SPIT, 'SPAT');
            if (f === player) ctx.tk.slowPlayer(0.7, 1200); else npcSlowUntil = time + 1200;
          }
        }
        if (time - s.at > SPIT_WARN + 300) spits.splice(spits.indexOf(s), 1);
      }
    },

    npcSpeedMult: () => (now() < npcSlowUntil ? 0.7 : 1),

    npcSeek() {
      if (!alive(player)) return null;
      // Out of any line about to go.
      for (const m of goose) {
        if (m.state !== 'crouch') continue;
        if (segDist(npc.x, npc.y, m.ax, m.ay, m.bx, m.by) < 56) {
          const len = Math.max(1, dist(m.ax, m.ay, m.bx, m.by));
          const nx = -(m.by - m.ay) / len, ny = (m.bx - m.ax) / len;
          const side = (npc.x - m.ax) * nx + (npc.y - m.ay) * ny >= 0 ? 1 : -1;
          return { x: clamp(npc.x + nx * side * 90, 60, W - 60), y: clamp(npc.y + ny * side * 90, top + 40, H - 40) };
        }
      }
      // Keep the player nearer the cobra than himself: stand beyond the player, on the far side from it.
      const a = Math.atan2(player.y - cobra.y, player.x - cobra.x);
      const r = cobra.shelter === npc ? 240 : 200;
      let p: Pt = { x: player.x + Math.cos(a) * r, y: player.y + Math.sin(a) * r };
      if (p.x < 60 || p.x > W - 60 || p.y < top + 40 || p.y > H - 40) {
        const b = a + Math.PI / 2;
        p = { x: player.x + Math.cos(b) * r, y: player.y + Math.sin(b) * r };
      }
      return { x: clamp(p.x, 60, W - 60), y: clamp(p.y, top + 40, H - 40) };
    },

    drawGround(g, time) {
      // The bout ring Moyle chalked, and the odds-post where he chalks the bets.
      g.lineStyle(2, MUD_LIT, 0.35); g.strokeEllipse(W / 2, (top + H) / 2 + 10, W - 120, H - top - 70);
      for (const m of goose) {
        if (m.state === 'crouch') {
          const k = clamp((time - m.at) / CROUCH_MS, 0, 1);
          g.lineStyle(44, VENOM, 0.04 + k * 0.08); g.lineBetween(m.ax, m.ay, m.bx, m.by);
          g.lineStyle(2, FANG_LIT, 0.3 + k * 0.5); g.lineBetween(m.ax, m.ay, m.ax + (m.bx - m.ax) * k, m.ay + (m.by - m.ay) * k);
          // Claw-scratches chalked along it.
          const len = dist(m.ax, m.ay, m.bx, m.by), n = Math.floor(len / 40);
          for (let i = 1; i < n; i++) {
            const t = i / n, x = m.ax + (m.bx - m.ax) * t, y = m.ay + (m.by - m.ay) * t;
            g.lineStyle(1.2, MUD_DARK, 0.6); for (let j = -1; j <= 1; j++) g.lineBetween(x + j * 4 - 3, y - 4, x + j * 4 + 3, y + 4);
          }
        }
        if (m.state === 'scrap') {
          const k = clamp((time - m.at) / SCRAP_MS, 0, 1);
          g.fillStyle(MUD_LIT, 0.22); g.fillCircle(m.x, m.y, SCRAP_R);
          g.lineStyle(2, MUD_LIT, 0.6 * (1 - k)); g.strokeCircle(m.x, m.y, SCRAP_R);
        }
        if (time >= m.at || m.state === 'rest') shadow(g, m.x, m.y + 6, 34, 9, 0.28);
      }
      for (const s of spits) {
        const k = clamp((time - s.at) / SPIT_WARN, 0, 1);
        if (!s.fired) { g.lineStyle(30, VENOM, 0.05 + k * 0.08); g.lineBetween(s.ax, s.ay, s.bx, s.by); g.lineStyle(1.5, VENOM_LIT, 0.3 + k * 0.5); g.lineBetween(s.ax, s.ay, s.bx, s.by); }
      }
      // The shelter: a faint brass ring at the feet of whoever the cobra is hiding behind.
      const sh = cobra.shelter;
      if (alive(sh)) { g.lineStyle(2, BRASS, 0.55 + Math.sin(time / 200) * 0.2); g.strokeEllipse(sh.x, sh.y + 16, 56, 18); }
      shadow(g, cobra.x, cobra.y + 4, 30, 9, 0.3);
    },

    drawAir(g, time) {
      const hood = goose.some((m) => m.state === 'trot' && dist(m.x, m.y, cobra.x, cobra.y) < 260) || spits.some((s) => !s.fired);
      // The cobra: low and gliding, or reared with its hood out when the mongoose is near.
      if (hood || cobra.held) risenCobra(g, cobra.x, cobra.y, cobra.held ? 30 : 40, Math.sin(time / 120) * (cobra.held ? 1 : 0.3), spits.some((s) => !s.fired) ? 0.8 : 0.2, 0.8);
      else drawGlide(g, cobra.x, cobra.y, cobra.face, time);
      for (const s of spits) {
        if (!s.fired || time - s.at > SPIT_WARN + 300) continue;
        const k = clamp((time - s.at - SPIT_WARN) / 300, 0, 1);
        for (let i = 0; i < 6; i++) {
          const t = clamp(k * 1.2 - i * 0.05, 0, 1);
          g.fillStyle(i % 2 ? VENOM_LIT : VENOM, 0.9 - k * 0.5); g.fillCircle(s.ax + (s.bx - s.ax) * t, s.ay + (s.by - s.ay) * t + Math.sin(i) * 3, 3 - i * 0.3);
        }
      }
      for (const m of goose) drawMongoose(g, m, time);
    },

    drawHud(g) {
      // Bottom-left: Moyle's slate — chalk tallies of who the bout has hurt, and whose snake it is.
      const x0 = 18, y0 = H - 54;
      g.fillStyle(0x2a2a26, 0.92); g.fillRoundedRect(x0, y0, 150, 42, 4);
      g.lineStyle(3, 0x6a5030, 1); g.strokeRoundedRect(x0, y0, 150, 42, 4);
      const rows: [Fighter, number][] = [[player, 0x9ad0ff], [npc, 0xff9a70]];
      for (const [i, [f, c]] of rows.entries()) {
        const y = y0 + 12 + i * 18;
        g.fillStyle(c, 1); g.fillCircle(x0 + 12, y, 4);
        if (cobra.shelter === f) { g.lineStyle(1.5, BRASS, 1); g.strokeCircle(x0 + 12, y, 7); }
        const n = Math.min(20, tally.get(f) ?? 0);
        for (let j = 0; j < n; j++) {
          const grp = Math.floor(j / 5), r = j % 5, x = x0 + 26 + grp * 26 + r * 4;
          g.lineStyle(1.5, 0xe8e4d8, 0.9);
          if (r < 4) g.lineBetween(x, y - 5, x, y + 5); else g.lineBetween(x - 17, y - 4, x - 1, y + 4);
        }
      }
    },
  };

  /** The cobra gliding low: a long S of banded body, the head a little up. */
  function drawGlide(g: G, x: number, y: number, a: number, time: number): void {
    const c = Math.cos(a), s = Math.sin(a);
    for (let i = 11; i >= 0; i--) {
      const t = i / 11, w = Math.sin(time / 110 - i * 0.9) * 7 * t;
      const px = x - c * i * 5 + -s * w, py = y - s * i * 5 + c * w;
      g.fillStyle(dim(0x8a6a2a, 0.3), 1); g.fillCircle(px, py + 1, 5 - t * 2);
      g.fillStyle(i % 3 === 0 ? dim(0x8a6a2a, 0.45) : 0x8a6a2a, 1); g.fillCircle(px, py, 4.5 - t * 2);
    }
    g.fillStyle(0x8a6a2a, 1); g.fillEllipse(x + c * 5, y + s * 5 - 4, 11, 8);
    g.fillStyle(0xf2d232, 1); g.fillCircle(x + c * 7 - 2, y - 5, 1.2); g.fillCircle(x + c * 7 + 2, y - 5, 1.2);
  }

  /** A mongoose: long low body, bottle-brush tail, small round ears; flattened and bristling to pounce. */
  function drawMongoose(g: G, m: Mongoose, time: number): void {
    if (m.state === 'rest' && time < m.at && m.at - time > 500) return;
    const toward = m.state === 'crouch' || m.state === 'pounce' ? Math.atan2(m.by - m.ay, m.bx - m.ax) : Math.atan2(cobra.y - m.y, cobra.x - m.x);
    const c = Math.cos(toward), dir = c >= 0 ? 1 : -1;
    const crouch = m.state === 'crouch' ? clamp((time - m.at) / CROUCH_MS, 0, 1) : 0;
    const stretch = m.state === 'pounce' ? 1.35 : 1;
    const bob = m.state === 'trot' ? Math.abs(Math.sin(time / 90 + m.seed)) * 3 : 0;
    const x = m.x, y = m.y - 8 + crouch * 4 - bob;
    if (m.state === 'scrap') {
      // A ball of dust and fur, the cobra's hood showing through.
      for (let i = 0; i < 9; i++) {
        const b = time / 80 + i * 0.7, r = 18 + Math.sin(time / 60 + i) * 6;
        g.fillStyle(i % 2 ? MUD_LIT : lit(MUD_LIT, 0.2), 0.5); g.fillCircle(x + Math.cos(b) * r, y + Math.sin(b) * r * 0.6, 10);
      }
      g.fillStyle(MONGOOSE, 1); g.fillEllipse(x + Math.cos(time / 70) * 10, y, 26, 12);
      g.lineStyle(4, MONGOOSE_DARK, 1); g.lineBetween(x - 10, y, x - 24 + Math.sin(time / 50) * 6, y - 10);
      return;
    }
    // Tail.
    for (let i = 0; i < 6; i++) {
      const t = i / 5;
      g.fillStyle(i === 5 ? MONGOOSE_DARK : dim(MONGOOSE, 0.1), 1);
      g.fillCircle(x - dir * (14 + t * 18) * stretch, y + 2 - t * (6 + crouch * 6) + Math.sin(time / 120 + i) * 1.5, 4.5 - t * 1.2 + crouch * 1.5);
    }
    // Body, grizzled.
    g.fillStyle(MONGOOSE_DARK, 1); g.fillEllipse(x, y + 1, 32 * stretch, 13 - crouch * 2);
    g.fillStyle(MONGOOSE, 1); g.fillEllipse(x, y, 30 * stretch, 11 - crouch * 2);
    for (let i = 0; i < 7; i++) { g.lineStyle(1, lit(MONGOOSE, 0.3), 0.6); g.lineBetween(x - 12 + i * 4, y - 4, x - 13 + i * 4, y - 1); }
    // Legs.
    if (m.state !== 'pounce') for (const k of [-9, 9]) { g.lineStyle(3, MONGOOSE_DARK, 1); g.lineBetween(x + k, y + 3, x + k + Math.sin(time / 80 + k) * 3 * (m.state === 'trot' ? 1 : 0), y + 9 - crouch * 3); }
    // Head: pointed, ears, a red-brown eye.
    const hx = x + dir * 18 * stretch, hy = y - 3;
    g.fillStyle(MONGOOSE, 1); g.fillEllipse(hx, hy, 13, 9);
    g.fillTriangle(hx + dir * 4, hy - 3, hx + dir * 4, hy + 3, hx + dir * 12, hy + 1);
    g.fillStyle(0x201a14, 1); g.fillCircle(hx + dir * 12, hy + 1, 1.4);
    g.fillStyle(MONGOOSE_DARK, 1); g.fillCircle(hx - dir * 2, hy - 5, 2.4);
    g.fillStyle(0xb04020, 1); g.fillCircle(hx + dir * 3, hy - 2, 1.4);
    if (crouch > 0.3) for (let i = 0; i < 5; i++) { g.lineStyle(1, MONGOOSE_DARK, crouch); g.lineBetween(x - 10 + i * 5, y - 6, x - 11 + i * 5, y - 10 - crouch * 2); }
  }
}

export const FALLEN_BOUT: GimmickDef = {
  id: ID,
  rules: 'The cobra hides at the feet of whoever is nearest; the mongoose pounces through them to reach it. Strike the cobra to send it to your foe.',
  make,
};
