import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, glow, lit, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { chalkLine } from '../art';
import { GOLD, GOLD_DARK, GOLD_LIT, ROBE, ROBE_DARK, ROBE_LIT, SIDE_YOU, SUN, SUN_HOT, WAX } from '../palette';
import { alive, clamp, dist, segDist, stepDt, wrapAngle } from '../util';

/**
 * Tread on the Hem — Train-Bearer Wendeline Sprackling.
 *
 * For twenty years Sprackling walked three paces behind Prince Verdict holding up the hem of his
 * train, so that the court's violet never touched the court's floor. In the star's telling she
 * was given the train for her own, and she wears it now: forty feet of violet and gold dragging
 * behind her wherever she goes.
 *
 * The train follows her like a rope. Every few beats she gathers it (its sweep is chalked on the
 * floor) and turns on her heel: the whole train swings round her through a wide arc, clouting and
 * throwing everyone it crosses. Hug her or leave the arc.
 *
 * The exploit is the hem. Its gilt last yards drag on the floor behind her: step onto them and you
 * have trodden on the Prince's train. She is jerked up short — held where she stands and open to
 * every blow — and a held train cannot swing, so treading on it during the gather spoils the turn.
 * At half the train is let out longer and the turn sweeps there and back.
 */

const ID = fallenId('tribunal', 'train');
const SEG = 20;
const NODES = 15;
const NODES_LATE = 20;
const HEM = 5;
const TREAD_R = 26;
const PIN_MS = 1500;
const PIN_CD = 4200;
const PIN_MULT = 1.35;
const BEAT_MS = 4300;
const GATHER_MS = 1050;
const SWING_MS = 520;
const ARC = Math.PI * 1.15;
const HALF_W = 20;
const DMG_YOU = 14;

function make(ctx: GimmickCtx): EncounterGimmick {
  const { player, npc, tk } = ctx;
  let nodes: Pt[] = [];
  for (let i = 0; i < NODES; i++) nodes.push({ x: npc.x, y: npc.y + i * SEG * 0.5 });
  let late = false;
  let started = false;
  let nextBeat = 0;
  // The turn: gathering → swinging (one way, then back if late) → idle.
  let phase: 'idle' | 'gather' | 'swing' | 'back' = 'idle';
  let phaseAt = 0, a0 = 0, a1 = 0, swingAng = 0;
  let hitThisSwing = false;
  let pinnedUntil = 0, lastPin = -1e9;
  let pinAt: Pt = { x: 0, y: 0 };

  const length = () => (nodes.length - 1) * SEG;
  const pinned = (t: number) => t < pinnedUntil;

  function startGather(time: number): void {
    phase = 'gather'; phaseAt = time;
    // The arc opens from where the train lies toward you, the long way round through you.
    const tail = nodes[nodes.length - 1];
    const from = Math.atan2(tail.y - npc.y, tail.x - npc.x);
    const toYou = Math.atan2(player.y - npc.y, player.x - npc.x);
    const dir = wrapAngle(toYou - from) >= 0 ? 1 : -1;
    a0 = from; a1 = from + dir * ARC;
    hitThisSwing = false;
    ctx.sfx('whoosh');
  }

  /** Is a point under the swinging train at angle `a`? (Hugging her, inside 44 px, is under it.) */
  const underTrain = (a: number, px: number, py: number) => {
    const L = length();
    return segDist(px, py, npc.x + Math.cos(a) * 44, npc.y + Math.sin(a) * 44, npc.x + Math.cos(a) * L, npc.y + Math.sin(a) * L) < HALF_W + 18;
  };

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextBeat = time + 2600; }
      if (!late && npc.hp < npc.maxHp * 0.5) {
        late = true;
        ctx.banner('THE TRAIN IS LET OUT', '#e8c860');
        ctx.sfx('wings');
        const t = nodes[nodes.length - 1];
        while (nodes.length < NODES_LATE) nodes.push({ x: t.x, y: t.y });
      }
      if (!alive(npc)) return;
      // The train follows her like a rope; when pinned, the hem stays under your foot.
      nodes[0].x = npc.x; nodes[0].y = npc.y;
      if (phase === 'swing' || phase === 'back') {
        const k = clamp((time - phaseAt) / SWING_MS, 0, 1);
        const e = k * k * (3 - 2 * k);
        swingAng = phase === 'swing' ? a0 + (a1 - a0) * e : a1 + (a0 - a1) * e;
        for (let i = 1; i < nodes.length; i++) { nodes[i].x = npc.x + Math.cos(swingAng) * i * SEG; nodes[i].y = npc.y + Math.sin(swingAng) * i * SEG; }
        if (!hitThisSwing && alive(player) && underTrain(swingAng, player.x, player.y)) {
          hitThisSwing = true;
          tk.hitPlayer(DMG_YOU, player.x, player.y);
          const s = phase === 'swing' ? Math.sign(a1 - a0) : Math.sign(a0 - a1);
          ctx.nudge(player, -Math.sin(swingAng) * s * 60, Math.cos(swingAng) * s * 60);
          ctx.sfx('whip');
        }
        if (k >= 1) {
          if (phase === 'swing' && late) { phase = 'back'; phaseAt = time + 0; hitThisSwing = false; ctx.sfx('whoosh'); }
          else { phase = 'idle'; nextBeat = time + BEAT_MS; }
        }
      } else {
        for (let i = 1; i < nodes.length; i++) {
          const p = nodes[i - 1], n = nodes[i];
          const d = Math.max(0.01, dist(p.x, p.y, n.x, n.y));
          if (d > SEG) { n.x = p.x + ((n.x - p.x) / d) * SEG; n.y = p.y + ((n.y - p.y) / d) * SEG; }
        }
        if (pinned(time)) {
          const h = nodes[nodes.length - 1];
          h.x = pinAt.x; h.y = pinAt.y;
        }
      }
      // Pinned, she is held: the train is taut from her to your foot.
      if (pinned(time)) ctx.root(npc, 160);

      // Treading on the hem.
      if (alive(player) && !pinned(time) && time - lastPin > PIN_CD && phase !== 'swing' && phase !== 'back') {
        for (let i = nodes.length - HEM; i < nodes.length; i++) {
          if (dist(player.x, player.y, nodes[i].x, nodes[i].y) > TREAD_R) continue;
          pinnedUntil = time + PIN_MS; lastPin = time;
          pinAt = { x: nodes[nodes.length - 1].x, y: nodes[nodes.length - 1].y };
          ctx.sfx('snap-back'); ctx.flash(npc.x, npc.y - 20, GOLD_LIT);
          if (phase === 'gather') { phase = 'idle'; nextBeat = time + BEAT_MS * 0.6; ctx.banner('THE TURN IS SPOILED', '#ffd860'); }
          break;
        }
      }

      // The train's beat: gather, then the turn.
      if (phase === 'idle' && time >= nextBeat && !pinned(time) && alive(player)) startGather(time);
      if (phase === 'gather' && time - phaseAt >= tk.warn(GATHER_MS)) { phase = 'swing'; phaseAt = time; ctx.sfx('gust'); }

    },

    npcTakenMult: () => (pinned(tk.now) ? PIN_MULT : 1),

    npcSeek() {
      if (!alive(npc) || !alive(player)) return null;
      // Keep you in front of her, the train trailing away: back off along the line to you, so the
      // hem is drawn after her and out from under your feet.
      const hem = nodes[nodes.length - 1];
      const d = dist(player.x, player.y, hem.x, hem.y);
      const a = Math.atan2(npc.y - player.y, npc.x - player.x);
      if (d < 150) {
        const away = Math.atan2(npc.y - hem.y, npc.x - hem.x);
        return { x: tk.clampX(npc.x + Math.cos(away) * 140), y: tk.clampY(npc.y + Math.sin(away) * 140) };
      }
      // During the gather, close in so the arc goes through you.
      if (phase === 'gather') return { x: tk.clampX(player.x + Math.cos(a) * length() * 0.55), y: tk.clampY(player.y + Math.sin(a) * length() * 0.55) };
      return { x: tk.clampX(player.x + Math.cos(a) * 190), y: tk.clampY(player.y + Math.sin(a) * 170) };
    },

    drawGround(g, time) {
      if (phase === 'gather') {
        // The chalked sweep: a fan of the train's arc, filling as she gathers it.
        const k = clamp((time - phaseAt) / Math.max(1, tk.warn(GATHER_MS)), 0, 1);
        const L = length();
        const steps = 22;
        const pts: Pt[] = [{ x: npc.x, y: npc.y }];
        for (let i = 0; i <= steps; i++) { const a = a0 + ((a1 - a0) * i) / steps; pts.push({ x: npc.x + Math.cos(a) * (L + HALF_W), y: npc.y + Math.sin(a) * (L + HALF_W) }); }
        g.fillStyle(SUN_HOT, 0.06 + k * 0.14); g.fillPoints(pts, true);
        for (let i = 0; i < steps; i++) {
          const p = pts[i + 1], q = pts[i + 2];
          chalkLine(g, p.x, p.y, q.x, q.y, 0.5 + k * 0.5, 2);
        }
        chalkLine(g, npc.x, npc.y, pts[1].x, pts[1].y, 0.7, 2);
        chalkLine(g, npc.x, npc.y, pts[pts.length - 1].x, pts[pts.length - 1].y, 0.7, 2);
        if (late) {
          // Arrows both ways: it comes back.
          const m = pts[Math.floor(pts.length / 2)];
          g.lineStyle(2, SUN, 0.8); g.strokeCircle(m.x, m.y, 8);
        }
        // The safe eye at her feet.
        g.lineStyle(1.5, SIDE_YOU, 0.6); g.strokeCircle(npc.x, npc.y, 44);
      }
      drawTrain(g, nodes, time, pinned(time), phase === 'swing' || phase === 'back');
    },

    drawAir(g, time) {
      if (pinned(time)) {
        // The train drawn taut from her shoulders to the hem under your foot.
        g.lineStyle(2, GOLD_LIT, 0.8); g.lineBetween(npc.x, npc.y - 28, nodes[1].x, nodes[1].y - 4);
        glow(g, npc.x, npc.y - 20, 30, GOLD_LIT, 0.05 + Math.sin(time / 70) * 0.02, 3);
      }
      if (phase === 'swing' || phase === 'back') {
        // The air the train cuts through.
        const L = length();
        for (let i = 1; i <= 3; i++) {
          const a = swingAng - Math.sign(a1 - a0) * (phase === 'swing' ? 1 : -1) * i * 0.12;
          g.lineStyle(3, ROBE_LIT, 0.25 / i); g.lineBetween(npc.x + Math.cos(a) * 50, npc.y + Math.sin(a) * 50 - 6, npc.x + Math.cos(a) * L, npc.y + Math.sin(a) * L - 6);
        }
      }
    },

    drawHud(g) {
      // The beat to her next turn, and the pin pip.
      const top = ctx.top, x0 = 24, y = top + 26;
      g.fillStyle(0x000000, 0.45); g.fillRoundedRect(x0 - 10, y - 14, 140, 28, 8);
      const k = phase === 'idle' ? clamp(1 - (nextBeat - tk.now) / BEAT_MS, 0, 1) : 1;
      g.fillStyle(0x2a2420, 1); g.fillRect(x0, y - 4, 100, 8);
      g.fillStyle(phase === 'gather' ? 0xe8642a : ROBE_LIT, 1); g.fillRect(x0, y - 4, 100 * k, 8);
      const ready = tk.now - lastPin > PIN_CD;
      g.fillStyle(pinned(tk.now) ? GOLD_LIT : ready ? GOLD : 0x5a5248, 1);
      g.fillTriangle(x0 + 112, y + 6, x0 + 126, y + 6, x0 + 119, y - 7);
    },
  };
}

/** The train: violet velvet in a ribbon that narrows to a gilt-fringed hem, gold piping down both edges. */
function drawTrain(g: G, nodes: Pt[], time: number, pinned: boolean, swinging: boolean): void {
  const n = nodes.length;
  const left: Pt[] = [], right: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const p = nodes[i], q = nodes[Math.min(n - 1, i + 1)], o = nodes[Math.max(0, i - 1)];
    const tx = q.x - o.x, ty = q.y - o.y;
    const l = Math.hypot(tx, ty) || 1;
    const w = 9 + (i / (n - 1)) * 17;
    const ripple = swinging ? 0 : Math.sin(time / 260 + i * 0.7) * 1.5;
    left.push({ x: p.x - (ty / l) * (w + ripple), y: p.y + (tx / l) * (w + ripple) });
    right.push({ x: p.x + (ty / l) * w, y: p.y - (tx / l) * w });
  }
  const poly = [...left, ...right.reverse()];
  g.fillStyle(0x3a3048, 0.25); g.fillPoints(poly.map((p) => ({ x: p.x + 2, y: p.y + 4 })), true);
  g.fillStyle(ROBE_DARK, 1); g.fillPoints(poly, true);
  // The nap of the velvet: lighter folds across it.
  for (let i = 1; i < n - 1; i += 2) {
    const a = left[i], b = right[right.length - 1 - i];
    g.lineStyle(3, ROBE, 0.9); g.lineBetween(a.x * 0.75 + b.x * 0.25, a.y * 0.75 + b.y * 0.25, a.x * 0.25 + b.x * 0.75, a.y * 0.25 + b.y * 0.75);
  }
  g.lineStyle(1.5, ROBE_LIT, 0.6);
  for (let i = 0; i < n - 1; i++) g.lineBetween(nodes[i].x, nodes[i].y, nodes[i + 1].x, nodes[i + 1].y);
  // Gold piping down both edges.
  g.lineStyle(2, GOLD, 1);
  for (let i = 0; i < n - 1; i++) { g.lineBetween(left[i].x, left[i].y, left[i + 1].x, left[i + 1].y); }
  const r = right.slice().reverse();
  for (let i = 0; i < n - 1; i++) g.lineBetween(r[i].x, r[i].y, r[i + 1].x, r[i + 1].y);
  // The hem: gilt fringe and the court's suns embroidered on the last yards.
  for (let i = n - HEM; i < n; i++) {
    const p = nodes[i];
    g.fillStyle(GOLD_DARK, 1); g.fillCircle(p.x, p.y, 4.5);
    g.fillStyle(pinned ? lit(GOLD, 0.5) : GOLD, 1); g.fillCircle(p.x, p.y, 3);
  }
  const tail = nodes[n - 1], pre = nodes[n - 2];
  const ta = Math.atan2(tail.y - pre.y, tail.x - pre.x);
  for (let k = -5; k <= 5; k++) {
    const px = tail.x + Math.cos(ta + Math.PI / 2) * k * 2.6, py = tail.y + Math.sin(ta + Math.PI / 2) * k * 2.6;
    g.lineStyle(1.5, GOLD_LIT, 0.9); g.lineBetween(px, py, px + Math.cos(ta) * 7, py + Math.sin(ta) * 7);
  }
  g.fillStyle(WAX, 1); g.fillCircle(tail.x - Math.cos(ta) * 8, tail.y - Math.sin(ta) * 8, 2.5);
  if (pinned) glow(g, tail.x, tail.y, 26, SUN, 0.08, 3);
  else glow(g, tail.x, tail.y, 18, dim(GOLD, 0.1), 0.04 + Math.sin(time / 200) * 0.015, 2);
}

export const FALLEN_TRAIN: GimmickDef = {
  id: ID,
  rules: 'Her long train swings round her on the turn, clouting all it crosses: hug her or leave the arc. Tread on its gilt hem to hold her and spoil the turn.',
  make,
};
