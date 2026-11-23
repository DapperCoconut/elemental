import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { glow } from '../../../../../art/IsleArt';
import { cuckooBird, cuckooClock, hand } from '../art';
import { BLUED, BLUED_LIT, CUCKOO_CREAM, CUCKOO_RED, GILT, TIMBER_DARK } from '../palette';
import { alive, clamp, dist } from '../util';

/**
 * Cuckoo — Cuckoo-Keeper Chirp.
 *
 * Chirp's great cuckoo clock hangs on the north wall, and its long blued hour-hand reaches out of
 * the dial to point straight at one of you. The minute hand goes round once an "hour" (a few
 * seconds), and on the hour the doors fly open and the bird bursts out — once at one o'clock,
 * twice at two, three times at three — diving each time at whoever the hour-hand names. Each dive
 * is drawn on the floor first, a line from the door through its mark and on to the far wall, and
 * anyone on that line when the bird comes is pecked, whether it meant them or not.
 *
 * The bird is a glutton: every peck fattens it, and a fat bird hits a wider line. Strike the end of
 * the hour-hand (up by the clock, or with a shot) and it swings round to point at the other
 * fighter. Chirp will try to do the same. Whoever holds the hand at the hour is safe — mostly.
 */

const PECK_DMG = 11;
const DIVE_SPEED = 950;
const TURN_CD = 900;

interface Dive { tx: number; ty: number; ex: number; ey: number; warnAt: number; flyAt: number; doneAt: number; hit: Set<Fighter>; angle: number; called: boolean }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  const S = 1.4;
  const CX = W / 2, BASE = top + 112;
  const DIAL: Pt = { x: CX, y: BASE - 64 * S + 0.56 * 64 * S };
  const DOOR: Pt = { x: CX, y: BASE - 64 * S + 0.1 * 64 * S };
  const HAND_LEN = 64;
  const HOUR_MS = ctx.hard ? 5600 : 7000;
  const WARN = ctx.hard ? 560 : 680;
  let aimAt: Fighter = player;
  let turnedAt = -9999;
  let hourStart = -1;
  let hour = 0;
  let dives: Dive[] = [];
  let fat = 1;
  let doorOpenUntil = 0;
  let tip: StrikeTarget | null = null;
  const turnFx: { at: number }[] = [];

  const handAngle = () => (alive(aimAt) ? Math.atan2(aimAt.y - DIAL.y, aimAt.x - DIAL.x) : Math.PI / 2);
  const tipPos = (): Pt => { const a = handAngle(); return { x: DIAL.x + Math.cos(a) * HAND_LEN, y: DIAL.y + Math.sin(a) * HAND_LEN }; };

  function turn(time: number, by: 'player' | 'npc'): void {
    if (time - turnedAt < TURN_CD) return;
    turnedAt = time;
    aimAt = aimAt === player ? npc : player;
    turnFx.push({ at: time });
    ctx.sfx('clock-tick');
    ctx.float(DIAL.x, DIAL.y + 60, by === 'player' ? 'HAND TURNED' : 'CHIRP TURNS THE HAND', '#8aa4f0');
  }

  /** Plan one dive at whoever the hand names now: through their spot and on to the wall. */
  function plan(time: number, k: number): Dive {
    const f = aimAt;
    const tx = alive(f) ? f.x : W / 2, ty = alive(f) ? f.y : H / 2;
    const a = Math.atan2(ty - DOOR.y, tx - DOOR.x);
    // Run on until the line leaves the floor.
    let ex = tx, ey = ty;
    for (let s = 0; s < 1400; s += 20) { ex = DOOR.x + Math.cos(a) * s; ey = DOOR.y + Math.sin(a) * s; if (ex < 20 || ex > W - 20 || ey > H - 20) break; }
    const flyAt = time + WARN + k * 820;
    const len = dist(DOOR.x, DOOR.y, ex, ey);
    return { tx, ty, ex, ey, warnAt: time + k * 820, flyAt, doneAt: flyAt + (len / DIVE_SPEED) * 1000 + 600, hit: new Set(), angle: a, called: false };
  }

  const birdAt = (d: Dive, time: number): Pt | null => {
    if (time < d.flyAt) return null;
    const len = dist(DOOR.x, DOOR.y, d.ex, d.ey);
    const s = ((time - d.flyAt) / 1000) * DIVE_SPEED;
    if (s > len) return null;
    return { x: DOOR.x + Math.cos(d.angle) * s, y: DOOR.y + Math.sin(d.angle) * s };
  };

  return {
    update(time) {
      if (hourStart < 0) {
        hourStart = time;
        tip = ctx.target({ x: tipPos().x, y: tipPos().y, r: 22, onStruck: (by) => turn(ctx.scene.time.now, by) });
      }
      tip?.moveTo(tipPos().x, tipPos().y);
      if (time - hourStart >= HOUR_MS) {
        hourStart = time;
        hour = (hour % 3) + 1;
        // Later dives of the hour re-read the hand, so it can still be turned between them.
        dives = [plan(time, 0)];
        for (let k = 1; k < hour; k++) {
          const kk = k;
          ctx.tk.schedule(kk * 820, () => { dives.push(plan(ctx.scene.time.now, 0)); });
        }
        doorOpenUntil = time + hour * 820 + WARN + 500;
        ctx.banner(`CUCKOO! — ${hour} O'CLOCK`, '#f2e2c0');
        ctx.sfx('countdown-tick');
      }
      for (const d of dives) {
        const b = birdAt(d, time);
        if (!b) continue;
        if (!d.called) { d.called = true; ctx.sfx('screech'); }
        const reach = 26 * fat + 18;
        for (const f of [player, npc]) {
          if (!alive(f) || d.hit.has(f)) continue;
          if (dist(b.x, b.y, f.x, f.y) < reach) {
            d.hit.add(f);
            ctx.hit(f, PECK_DMG * (ctx.hard ? 1.15 : 1), f.x, f.y);
            ctx.float(f.x, f.y - 46, 'PECKED', '#f2e2c0');
            ctx.sfx('stab');
            fat = Math.min(1.7, fat + 0.12);
          }
        }
      }
      dives = dives.filter((d) => time < d.doneAt);
      for (let i = turnFx.length - 1; i >= 0; i--) if (time - turnFx[i].at > 500) turnFx.splice(i, 1);
    },

    npcSeek() {
      if (!alive(npc) || !alive(player)) return null;
      // Named by the hand: go and turn it.
      if (aimAt === npc) { const t = tipPos(); return { x: clamp(t.x, 60, W - 60), y: clamp(t.y + 34, top + 60, H - 50) }; }
      // Otherwise stand off the line from the door to the player.
      const a = Math.atan2(player.y - DOOR.y, player.x - DOOR.x);
      const side = npc.x < player.x ? -1 : 1;
      return { x: clamp(player.x - Math.sin(a) * 200 * side, 60, W - 60), y: clamp(player.y + Math.cos(a) * 200 * side, top + 60, H - 50) };
    },

    drawGround(g, time) {
      for (const d of dives) {
        if (time < d.warnAt) continue;
        const k = clamp((time - d.warnAt) / Math.max(1, d.flyAt - d.warnAt), 0, 1);
        const flying = time >= d.flyAt;
        const reach = 26 * fat + 18;
        // The dive line: a feathered lane from the door through the mark.
        g.fillStyle(CUCKOO_RED, flying ? 0.1 : 0.08 + k * 0.12);
        const nx = -Math.sin(d.angle) * reach, ny = Math.cos(d.angle) * reach;
        g.fillTriangle(DOOR.x + nx, DOOR.y + ny, DOOR.x - nx, DOOR.y - ny, d.ex + nx, d.ey + ny);
        g.fillTriangle(DOOR.x - nx, DOOR.y - ny, d.ex + nx, d.ey + ny, d.ex - nx, d.ey - ny);
        g.lineStyle(2, CUCKOO_RED, 0.3 + k * 0.5);
        g.lineBetween(DOOR.x + nx, DOOR.y + ny, d.ex + nx, d.ey + ny); g.lineBetween(DOOR.x - nx, DOOR.y - ny, d.ex - nx, d.ey - ny);
        // Feather marks along it, and the target ring.
        const len = dist(DOOR.x, DOOR.y, d.ex, d.ey);
        for (let s = 60; s < len; s += 46) {
          const x = DOOR.x + Math.cos(d.angle) * s, y = DOOR.y + Math.sin(d.angle) * s;
          g.fillStyle(CUCKOO_CREAM, 0.25 + k * 0.3); g.fillEllipse(x, y, 10, 4);
        }
        g.lineStyle(3, CUCKOO_CREAM, 0.5 + k * 0.4); g.strokeCircle(d.tx, d.ty, 20 + (1 - k) * 30);
      }
      // A faint pointer line from the hand to whoever it names.
      if (alive(aimAt)) {
        const t = tipPos();
        g.lineStyle(1.5, BLUED_LIT, 0.25 + Math.sin(time / 160) * 0.1);
        const dd = dist(t.x, t.y, aimAt.x, aimAt.y);
        for (let s = 0; s < dd - 24; s += 18) {
          const x = t.x + ((aimAt.x - t.x) * s) / dd, y = t.y + ((aimAt.y - t.y) * s) / dd;
          g.lineBetween(x, y, x + ((aimAt.x - t.x) * 8) / dd, y + ((aimAt.y - t.y) * 8) / dd);
        }
        g.lineStyle(2, BLUED_LIT, 0.4); g.strokeEllipse(aimAt.x, aimAt.y + 18, 46, 16);
      }
    },

    drawAir(g, time) {
      const k = clamp((time - Math.max(0, hourStart)) / HOUR_MS, 0, 1);
      const open = time < doorOpenUntil ? 1 : 0;
      // The clock on the wall: its own minute hand shows the hour coming round.
      g.fillStyle(TIMBER_DARK, 0.5); g.fillRect(CX - 70, top, 140, 8);
      cuckooClock(g, CX, BASE, S, (hour / 12) * Math.PI * 2, k * Math.PI * 2, open);
      if (k > 0.8 && !open) glow(g, DOOR.x, DOOR.y, 18, CUCKOO_CREAM, 0.06 + (k - 0.8) * 0.3, 2);
      // The long hour-hand, reaching out of the dial at its fighter.
      const a = handAngle();
      const t = tipPos();
      const turning = turnFx.length ? 1 - (time - turnFx[turnFx.length - 1].at) / 500 : 0;
      hand(g, DIAL.x, DIAL.y, a, HAND_LEN, 4, BLUED);
      g.fillStyle(GILT, 1); g.fillCircle(DIAL.x, DIAL.y, 4);
      g.lineStyle(2, BLUED_LIT, 0.5 + turning * 0.5); g.strokeCircle(t.x, t.y, 14 + turning * 10);
      // A bird in its doorway while it waits, or out on its dives.
      let out = false;
      for (const d of dives) {
        const b = birdAt(d, time);
        if (b) { out = true; cuckooBird(g, b.x, b.y, 1.1, d.angle, time / 30, fat); }
      }
      if (open && !out) cuckooBird(g, DOOR.x, DOOR.y + 6, 0.8, Math.PI / 2, time / 40, fat);
      // "Cuckoo!" ringing out on each dive.
      for (const d of dives) {
        const since = time - d.flyAt;
        if (since < 0 || since > 500) continue;
        const kk = since / 500;
        g.lineStyle(2, CUCKOO_CREAM, 1 - kk);
        for (let r = 0; r < 2; r++) { g.beginPath(); g.arc(DOOR.x, DOOR.y, 20 + kk * 40 + r * 10, -2.6, -0.5, false); g.strokePath(); }
      }
    },

    destroy() { tip?.remove(); },
  };
}

export const CUCKOO: GimmickDef = {
  id: 'clockwork-cuckoo',
  rules: 'On each hour the cuckoo dives (once, twice, thrice) at whoever the hour-hand points to. Strike the end of the hand to turn it on your foe.',
  make,
};
