import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, glow, lit } from '../../../../../art/IsleArt';
import { soundArcs } from '../art';
import { BRONZE, BRONZE_DARK, BRONZE_LIT, FLOW, FLOW_DARK, GHOST, GLOW, REPRISE_DARK } from '../palette';
import { alive, clamp, dist, stepDt } from '../../../../life/courts/bloom/util';

/**
 * Whispering Gallery — Gallery-Keeper Murmur.
 *
 * The room is an ellipse, and an ellipse keeps a secret: a whisper at one focus is heard, clear
 * as a bell, at the other. Two bronze ear-plates mark the foci, and the whole ellipse turns
 * slowly, so the plates creep round the room. Land a blow while you stand on one plate and the
 * gallery carries it round the rim — a beat later the same blow arrives again on whoever is
 * standing near the other plate.
 *
 * Murmur knows the gallery. He takes one plate when you are near the other, and his blows
 * come round twice. But the gallery carries anyone's blow: stand on a plate while he is near the
 * far one, and he eats every hit of yours twice.
 */

const PLATE_R = 46;
const RECEIVE_R = 92;
const SPIN = (Math.PI * 2) / 34000;

interface Whisper {
  /** Which plate it set off from (0/1). */
  from: number;
  by: Fighter;
  amount: number;
  at: number;
  arriveAt: number;
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  const cx = W / 2, cy = (top + H) / 2 + 6;
  const RX = W / 2 - 60, RY = (H - top) / 2 - 40;
  const FOCAL = Math.sqrt(RX * RX - RY * RY) * 0.82;
  const DELAY = ctx.hard ? 560 : 720;
  const ECHO_K = ctx.hard ? 1 : 0.8;
  let spin = 0;
  const whispers: Whisper[] = [];
  const landed: { x: number; y: number; at: number; hit: boolean }[] = [];
  /** Set while the gallery itself is dealing an echo, so the echo does not echo. */
  let echoing = false;
  let started = false;

  const plate = (i: number): Pt => {
    const s = i === 0 ? -1 : 1;
    return { x: cx + Math.cos(spin) * FOCAL * s, y: cy + Math.sin(spin) * FOCAL * s * (RY / RX) };
  };
  const onPlate = (f: Fighter): number => {
    for (const i of [0, 1]) { const p = plate(i); if (dist(p.x, p.y, f.x, f.y) < PLATE_R) return i; }
    return -1;
  };

  function launch(by: Fighter, amount: number, time: number): void {
    if (echoing || amount < 2 || !alive(by)) return;
    const from = onPlate(by);
    if (from < 0) return;
    // One whisper in flight per plate at a time; a second blow folds into it.
    const live = whispers.find((w) => w.from === from && w.by === by);
    if (live) { live.amount = Math.min(30, live.amount + amount * 0.5); return; }
    whispers.push({ from, by, amount, at: time, arriveAt: time + DELAY });
    const p = plate(from);
    ctx.float(p.x, p.y - 40, 'whisper…', '#cfe8ff');
    ctx.sfx('hush');
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) {
        started = true;
        ctx.banner('THE GALLERY CARRIES A BLOW FROM PLATE TO PLATE', '#cfe8ff');
      }
      spin += SPIN * dt * 1000;
      for (let i = whispers.length - 1; i >= 0; i--) {
        const w = whispers[i];
        if (time < w.arriveAt) continue;
        whispers.splice(i, 1);
        const to = plate(1 - w.from);
        const dmg = clamp(Math.round(w.amount * ECHO_K), 3, 30);
        let hitAny = false;
        echoing = true;
        for (const f of [player, npc]) {
          if (!alive(f) || dist(to.x, to.y, f.x, f.y) > RECEIVE_R) continue;
          ctx.hit(f, dmg, f.x, f.y);
          ctx.float(f.x, f.y - 50, `ECHO ${dmg}`, f === player ? '#ff9a9a' : '#cfe8ff');
          hitAny = true;
        }
        echoing = false;
        ctx.sfx(hitAny ? 'sonic-pulse' : 'crystal-chime');
        if (!hitAny) ctx.float(to.x, to.y - 30, '…ssh', '#8aa0c0');
        landed.push({ x: to.x, y: to.y, at: time, hit: hitAny });
      }
      for (let i = landed.length - 1; i >= 0; i--) if (time - landed[i].at > 700) landed.splice(i, 1);
    },

    onNpcHurt(amount) { launch(player, amount, ctx.scene.time.now); },
    onPlayerHurt(amount) { launch(npc, amount, ctx.scene.time.now); },

    npcSeek() {
      const a = plate(0), b = plate(1);
      const da = dist(a.x, a.y, player.x, player.y), db = dist(b.x, b.y, player.x, player.y);
      // The player near a plate: take the other one, so every blow comes round onto them.
      if (Math.min(da, db) < RECEIVE_R + 40) return da < db ? b : a;
      // Otherwise sit on the plate farther from them and wait for them to wander onto the near one.
      return da > db ? a : b;
    },

    drawGround(g, time) {
      // The ellipse: a polished flowstone court with a bench line round it.
      g.lineStyle(10, FLOW_DARK, 0.35); g.strokeEllipse(cx, cy, RX * 2 + 10, RY * 2 + 10);
      g.lineStyle(3, FLOW, 0.5); g.strokeEllipse(cx, cy, RX * 2, RY * 2);
      // The turning axis.
      const a = plate(0), b = plate(1);
      g.lineStyle(1.5, BRONZE_DARK, 0.35); g.lineBetween(a.x, a.y, b.x, b.y);
      // Each plate: bronze, an ear cast in it, a ring showing the catch reach.
      for (const i of [0, 1]) {
        const p = plate(i);
        const holder = [player, npc].find((f) => alive(f) && onPlate(f) === i);
        g.lineStyle(1.2, BRONZE, 0.25); g.strokeCircle(p.x, p.y, RECEIVE_R);
        g.fillStyle(BRONZE_DARK, 1); g.fillEllipse(p.x, p.y + 2, PLATE_R * 2, PLATE_R * 0.95);
        g.fillStyle(holder ? BRONZE_LIT : BRONZE, 1); g.fillEllipse(p.x, p.y, PLATE_R * 1.84, PLATE_R * 0.84);
        g.fillStyle(dim(BRONZE, 0.2), 1); g.fillEllipse(p.x, p.y, PLATE_R * 1.2, PLATE_R * 0.52);
        g.lineStyle(3, BRONZE_DARK, 1);
        g.beginPath(); g.arc(p.x, p.y - 2, 10, -Math.PI * 0.55, Math.PI * 0.75, false); g.strokePath();
        g.beginPath(); g.arc(p.x + 1, p.y, 4, -Math.PI * 0.4, Math.PI * 0.8, false); g.strokePath();
        if (holder) {
          const pulse = 0.5 + Math.sin(time / 160) * 0.5;
          g.lineStyle(2, holder === player ? GLOW : 0xff8a8a, 0.4 + pulse * 0.4); g.strokeEllipse(p.x, p.y, PLATE_R * 2.1, PLATE_R * 1);
        }
      }
      // Whispers in flight: sound arcs running round both halves of the rim to the far plate.
      for (const w of whispers) {
        const k = clamp((time - w.at) / (w.arriveAt - w.at), 0, 1);
        const p0 = plate(w.from);
        const a0 = Math.atan2((p0.y - cy) / RY, (p0.x - cx) / RX);
        for (const dir of [-1, 1]) {
          const ang = a0 + dir * k * Math.PI;
          const x = cx + Math.cos(ang) * RX, y = cy + Math.sin(ang) * RY;
          const toward = Math.atan2(y - cy, x - cx) + Math.PI;
          soundArcs(g, x, y, 8, toward + dir * Math.PI / 2, 0.7, w.by === player ? GLOW : 0xff9a9a, 0.8);
          g.fillStyle(lit(GHOST, 0.3), 0.6); g.fillCircle(x, y, 4);
        }
        // The far plate tightening as it arrives.
        const p1 = plate(1 - w.from);
        g.lineStyle(2.5, w.by === player ? GLOW : 0xff9a9a, 0.3 + k * 0.6); g.strokeCircle(p1.x, p1.y, RECEIVE_R * (1.3 - k * 0.3));
      }
      for (const l of landed) {
        const k = (time - l.at) / 700;
        g.lineStyle(3 * (1 - k), l.hit ? 0xffffff : GHOST, 1 - k); g.strokeCircle(l.x, l.y, 20 + k * 90);
      }
    },

    drawAir(g, time) {
      // Two cupped ears of bronze hung from the gallery's dome over the plates, twitching.
      for (const i of [0, 1]) {
        const p = plate(i);
        const y = p.y - 92;
        g.lineStyle(1, BRONZE_DARK, 0.6); g.lineBetween(p.x, top, p.x, y - 10);
        const tw = Math.sin(time / 400 + i * 2) * 0.1;
        g.fillStyle(BRONZE_DARK, 0.9); g.fillEllipse(p.x, y, 22, 28);
        g.fillStyle(BRONZE, 0.9); g.fillEllipse(p.x - 1, y - 1, 18, 24);
        g.lineStyle(2, BRONZE_DARK, 1); g.beginPath(); g.arc(p.x, y, 6, -Math.PI * 0.5 + tw, Math.PI * 0.8 + tw, false); g.strokePath();
        glow(g, p.x, y, 18, GLOW, 0.03, 2);
      }
      // A soft dome-light where the ellipse's edge throws the whisper back.
      g.lineStyle(1, REPRISE_DARK, 0.2); g.strokeEllipse(cx, cy - 4, RX * 2 - 30, RY * 2 - 24);
    },

    drawHud(g) {
      // Two pips at the top centre: lit while you, or he, stand on a plate.
      const pPlate = onPlate(player), nPlate = onPlate(npc);
      const y = top + 14;
      for (const [i, x] of [[0, W / 2 - 18], [1, W / 2 + 18]] as [number, number][]) {
        g.fillStyle(0x000000, 0.5); g.fillCircle(x, y, 9);
        g.fillStyle(pPlate === i ? GLOW : nPlate === i ? 0xff8a8a : BRONZE_DARK, 0.95); g.fillCircle(x, y, 6);
      }
      g.lineStyle(1.5, BRONZE, 0.6); g.lineBetween(W / 2 - 9, y, W / 2 + 9, y);
    },
  };
}

export const WHISPERING_GALLERY: GimmickDef = {
  id: 'cavern-whispering-gallery',
  rules: 'A blow landed while standing on a bronze plate arrives again a beat later on whoever is near the other plate. The plates creep round the room.',
  make,
};
