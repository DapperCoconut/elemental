import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { glow, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { conscript, sandbags } from '../art';
import {
  BRONZE, BRONZE_LIT, COAT, COAT_DARK, IRON_DARK, IRON_LIT, IVORY, IVORY_DARK, LAMP, MUD_DARK, RED, RED_LIT, TIMBER,
  TIMBER_DARK, TIMBER_LIT, INK,
} from '../palette';
import { alive, clamp, dist } from '../util';

/**
 * Shell by Shell — Magazine-Corporal Petronel Shank, who kept the powder under the barracks and in
 * the King's telling counted the drafted boys out to the guns by the shell: one boy, one shell.
 *
 * A chain of conscripts stands across the yard from the sandbagged magazine to the mortar pit,
 * and shells go up it hand to hand — you can watch each one travel. Every shell that reaches the
 * mortar is lobbed at you: its ring marks the ground while it climbs and falls.
 *
 * Strike a man in the chain and he fumbles: the shell in his hands drops at his feet, fizzes and
 * bursts, and while he is down every shell handed to him drops too. So the chain is two things —
 * the battery's supply, and a row of bombs laid across the yard waiting for someone to jostle the
 * right man. Break it beside Shank. Past half the chain passes quicker. The bot keeps clear of
 * fizzing shells and goes to break the link nearest you.
 */

const ID = fallenId('war', 'shell-by-shell');
const MEN = 7;
const DROP_R = 78;
const DOWN_MS = 2400;

interface Man { x: number; y: number; face: number; shell: number; downUntil: number; drops: number; t: StrikeTarget | null }
interface Shell { id: number; at: number; from: Pt; passAt: number }
interface Bomb { x: number; y: number; at: number; blowAt: number; lob: boolean; from: Pt }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, top, player, npc, tk } = ctx;
  const MAG: Pt = { x: 92, y: 548 };
  const PIT: Pt = { x: 862, y: 196 };
  const dx = PIT.x - MAG.x, dy = PIT.y - MAG.y, L = Math.hypot(dx, dy);
  const nx = -dy / L, ny = dx / L;
  const men: Man[] = [];
  for (let i = 0; i < MEN; i++) {
    const t = (i + 1) / (MEN + 1), bend = Math.sin(t * Math.PI) * 84;
    men.push({ x: MAG.x + dx * t - nx * bend, y: MAG.y + dy * t - ny * bend, face: i % 2 ? -1 : 1, shell: -1, downUntil: 0, drops: 0, t: null });
  }
  const shells: Shell[] = [];
  const bombs: Bomb[] = [];
  let quick = false;
  let started = false;
  let nextPass = 0, nextIssue = 0, sid = 1;
  const passMs = () => (quick ? 430 : 620);
  const isDown = (m: Man) => tk.now < m.downUntil;
  const posOf = (at: number): Pt => (at < 0 ? MAG : at >= MEN ? PIT : { x: men[at].x + men[at].face * 7, y: men[at].y - 26 });

  function drop(m: Man, time: number): void {
    bombs.push({ x: m.x + m.face * 12, y: m.y + 6, at: time, blowAt: time + tk.warn(1100), lob: false, from: { x: m.x, y: m.y - 26 } });
    m.drops++;
    ctx.sfx('sizzle');
  }

  men.forEach((m) => {
    m.t = ctx.target({
      x: m.x, y: m.y - 20, r: 20, passThrough: true,
      onStruck() {
        if (isDown(m)) return;
        m.downUntil = tk.now + DOWN_MS; m.drops = 0;
        ctx.sfx('hit-light');
        if (m.shell >= 0) {
          const i = shells.findIndex((s) => s.id === m.shell);
          if (i >= 0) shells.splice(i, 1);
          m.shell = -1;
          drop(m, tk.now);
        }
      },
    });
  });

  function burst(b: Bomb): void {
    const r = b.lob ? (quick ? 84 : 72) : DROP_R;
    ctx.sfx(b.lob ? 'explosion-medium' : 'explosion-small');
    tk.explode(b.x, b.y, r, b.lob ? 22 : 20, RED);
    if (alive(npc) && dist(npc.x, npc.y, b.x, b.y) < r + 20) {
      ctx.hit(npc, 30, npc.x, npc.y);
      ctx.float(npc.x, npc.y - 56, b.lob ? 'OWN BATTERY' : 'FUMBLED', '#ffb070');
    }
  }

  return {
    update(time) {
      if (!started) { started = true; nextIssue = time + 600; nextPass = time + 900; }
      if (!quick && npc.hp < npc.maxHp * 0.5) { quick = true; ctx.banner('PASS THEM QUICKER', '#ffb070'); ctx.sfx('drum-hit'); }
      // The magazine issues a shell to the first man when his hands are free.
      if (time >= nextIssue) {
        const m0 = men[0];
        if (m0.shell < 0 && shells.length < MEN) {
          const s: Shell = { id: sid++, at: 0, from: MAG, passAt: time };
          shells.push(s);
          if (isDown(m0)) { shells.pop(); if (m0.drops < 2) drop(m0, time); } else m0.shell = s.id;
        }
        nextIssue = time + (quick ? 1050 : 1500);
      }
      // Every beat each shell goes one pair of hands up the chain, the front of the chain first.
      if (time >= nextPass) {
        nextPass = time + passMs();
        const order = [...shells].sort((a, b) => b.at - a.at);
        for (const s of order) {
          const cur = men[s.at];
          if (s.at + 1 >= MEN) {
            cur.shell = -1;
            shells.splice(shells.indexOf(s), 1);
            const aim = alive(player) ? { x: player.x, y: player.y } : { x: W / 2, y: 400 };
            bombs.push({ x: aim.x, y: aim.y, at: time, blowAt: time + tk.warn(1250), lob: true, from: PIT });
            ctx.sfx('mortar-launch');
            continue;
          }
          const nxt = men[s.at + 1];
          if (nxt.shell >= 0) continue;
          s.from = posOf(s.at); s.passAt = time;
          cur.shell = -1; s.at++;
          if (isDown(nxt)) {
            shells.splice(shells.indexOf(s), 1);
            if (nxt.drops < 2) drop(nxt, time);
          } else nxt.shell = s.id;
        }
      }
      for (let i = bombs.length - 1; i >= 0; i--) {
        if (time >= bombs[i].blowAt) { burst(bombs[i]); bombs.splice(i, 1); }
      }
    },

    npcSeek(): Pt | null {
      if (!alive(npc)) return null;
      for (const b of bombs) {
        const r = (b.lob ? 84 : DROP_R) + 40;
        if (dist(npc.x, npc.y, b.x, b.y) < r) {
          const a = Math.atan2(npc.y - b.y, npc.x - b.x);
          return { x: tk.clampX(b.x + Math.cos(a) * (r + 50)), y: tk.clampY(b.y + Math.sin(a) * (r + 50)) };
        }
      }
      if (!alive(player)) return null;
      let best: Man | null = null, bd = 120;
      for (const m of men) {
        if (isDown(m) || m.shell < 0) continue;
        const d = dist(m.x, m.y, player.x, player.y);
        if (d < bd) { bd = d; best = m; }
      }
      if (!best) return null;
      const a = Math.atan2(best.y - player.y, best.x - player.x);
      return { x: tk.clampX(best.x + Math.cos(a) * 120), y: tk.clampY(best.y + Math.sin(a) * 120) };
    },

    drawGround(g, time) {
      // The trodden line of the chain, straw strewn where the boys stand.
      g.lineStyle(10, MUD_DARK, 0.35);
      g.beginPath(); g.moveTo(MAG.x, MAG.y);
      for (const m of men) g.lineTo(m.x, m.y);
      g.lineTo(PIT.x, PIT.y); g.strokePath();
      for (const m of men) for (let i = 0; i < 5; i++) { g.lineStyle(1, 0xd8c078, 0.6); const a = i * 1.3 + m.x; g.lineBetween(m.x + Math.cos(a) * 14, m.y + 4 + Math.sin(a) * 5, m.x + Math.cos(a) * 22, m.y + 2 + Math.sin(a) * 7); }
      drawMagazine(g, MAG.x, MAG.y);
      drawPit(g, PIT.x, PIT.y, bombs.some((b) => b.lob && time - b.at < 300));
      for (const b of bombs) {
        const span = b.blowAt - b.at, k = clamp((time - b.at) / span, 0, 1);
        const r = b.lob ? (quick ? 84 : 72) : DROP_R;
        g.fillStyle(RED, 0.07 + k * 0.15); g.fillCircle(b.x, b.y, r);
        g.lineStyle(2, IVORY, 0.4 + k * 0.5); g.strokeCircle(b.x, b.y, r);
        g.lineStyle(4, RED_LIT, 0.9); g.beginPath(); g.arc(b.x, b.y, r - 6, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); g.strokePath();
        if (!b.lob) drawShell(g, b.x, b.y - 4, 1, time, true);
        else shadow(g, b.x, b.y, 18 + k * 18, 6 + k * 6, 0.2 + k * 0.3);
      }
    },

    drawAir(g, time) {
      for (const m of men) {
        if (isDown(m)) drawFallen(g, m, time);
        else conscript(g, m.x, m.y, 0.85, m.face, Math.sin(time / 300 + m.x) * 0.2, COAT);
      }
      for (const s of shells) {
        const to = posOf(s.at), k = clamp((time - s.passAt) / 220, 0, 1);
        const x = s.from.x + (to.x - s.from.x) * k, y = s.from.y + (to.y - s.from.y) * k - Math.sin(k * Math.PI) * 14;
        drawShell(g, x, y, 0.9, time, false);
      }
      for (const b of bombs) {
        if (!b.lob) continue;
        const k = clamp((time - b.at) / (b.blowAt - b.at), 0, 1);
        const x = b.from.x + (b.x - b.from.x) * k, y = b.from.y + (b.y - b.from.y) * k - Math.sin(k * Math.PI) * 240;
        drawShell(g, x, y, 1.1, time, true);
      }
    },

    drawHud(g) {
      const x = W / 2 - 70, y = top + 18;
      g.fillStyle(0x000000, 0.55); g.fillRoundedRect(x - 12, y - 13, 164, 26, 6);
      for (let i = 0; i < MEN; i++) {
        const m = men[i], px = x + i * 18;
        g.fillStyle(isDown(m) ? 0x555555 : COAT, 1); g.fillRoundedRect(px - 5, y - 8, 10, 16, 3);
        if (m.shell >= 0) { g.fillStyle(IRON_DARK, 1); g.fillCircle(px, y, 4); g.fillStyle(LAMP, 1); g.fillCircle(px + 2, y - 4, 1.4); }
      }
      g.fillStyle(BRONZE, 1); g.fillEllipse(x + 140, y + 2, 16, 12); g.fillStyle(IRON_DARK, 1); g.fillEllipse(x + 140, y, 9, 6);
    },

    destroy() { for (const m of men) m.t?.remove(); },
  };
}

/** A common shell: an iron ball with a wooden fuse plug, the fuse spitting when it is lit. */
function drawShell(g: G, x: number, y: number, s: number, time: number, lit: boolean): void {
  g.fillStyle(IRON_DARK, 1); g.fillCircle(x, y, 7 * s);
  g.fillStyle(IRON_LIT, 0.5); g.fillCircle(x - 2.5 * s, y - 2.5 * s, 2.4 * s);
  g.fillStyle(TIMBER, 1); g.fillRect(x - 2 * s, y - 10 * s, 4 * s, 4 * s);
  if (lit) {
    const f = 0.6 + Math.sin(time / 35 + x) * 0.4;
    g.fillStyle(LAMP, f); g.fillCircle(x, y - 12 * s, 2.6 * s);
    g.fillStyle(0xffffff, f); g.fillCircle(x, y - 12 * s, 1.2 * s);
    for (let i = 0; i < 3; i++) { const a = time / 60 + i * 2.1; g.lineStyle(1, LAMP, 0.8); g.lineBetween(x, y - 12 * s, x + Math.cos(a) * 6 * s, y - 12 * s + Math.sin(a) * 6 * s); }
  }
}

/** A man of the chain knocked flat: coat in the mud, shako rolled off, legs kicking up. */
function drawFallen(g: G, m: Man, time: number): void {
  shadow(g, m.x, m.y + 2, 46, 10);
  g.fillStyle(IVORY_DARK, 1); g.fillRect(m.x + m.face * 10, m.y - 6, 16 * m.face, 5);
  g.fillStyle(INK, 1); g.fillRect(m.x + m.face * 22, m.y - 7, 6 * m.face, 6);
  g.fillStyle(COAT_DARK, 1); g.fillEllipse(m.x, m.y - 4, 30, 12);
  g.fillStyle(COAT, 1); g.fillEllipse(m.x, m.y - 5, 27, 10);
  g.lineStyle(2, IVORY, 0.9); g.lineBetween(m.x - 10, m.y - 8, m.x + 8, m.y - 2);
  g.fillStyle(0xd8b08a, 1); g.fillCircle(m.x - m.face * 16, m.y - 5, 5);
  const roll = (time / 400) % 1;
  g.fillStyle(INK, 1); g.fillRect(m.x - m.face * (26 + roll * 4) - 4, m.y - 4, 8, 7);
  g.fillStyle(BRONZE_LIT, 1); g.fillCircle(m.x - m.face * (26 + roll * 4), m.y - 1, 1.5);
}

/** The magazine: a sandbagged bunker with a timber lintel, shell boxes stacked outside, the red powder flag. */
function drawMagazine(g: G, x: number, y: number): void {
  shadow(g, x, y + 6, 120, 34);
  g.fillStyle(0x1a140e, 1); g.fillRect(x - 18, y - 30, 36, 30);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 24, y - 36, 48, 7);
  g.fillStyle(TIMBER_LIT, 1); g.fillRect(x - 24, y - 36, 48, 2);
  for (const s of [-1, 1]) { g.fillStyle(TIMBER, 1); g.fillRect(x + s * 20 - 3, y - 32, 6, 32); }
  sandbags(g, x - 44, y, 40, 4); sandbags(g, x + 44, y, 40, 4);
  for (const [bx, by] of [[x + 52, y + 16], [x + 70, y + 16], [x + 61, y + 6]] as [number, number][]) {
    g.fillStyle(TIMBER, 1); g.fillRect(bx - 8, by - 8, 16, 10); g.lineStyle(1, TIMBER_DARK, 1); g.strokeRect(bx - 8, by - 8, 16, 10);
    g.fillStyle(IRON_DARK, 1); g.fillCircle(bx, by - 9, 3);
  }
  g.lineStyle(2, TIMBER_DARK, 1); g.lineBetween(x - 40, y - 34, x - 40, y - 74);
  g.fillStyle(RED, 1); g.fillTriangle(x - 40, y - 74, x - 14, y - 67, x - 40, y - 60);
  g.fillStyle(IVORY, 0.9); g.fillCircle(x - 33, y - 67, 2.5);
}

/** The mortar pit: a ring of sandbags round a squat bronze mortar on its bed, cocked to the sky. */
function drawPit(g: G, x: number, y: number, firing: boolean): void {
  g.fillStyle(MUD_DARK, 1); g.fillEllipse(x, y, 110, 66);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    g.fillStyle(0x857452, 1); g.fillEllipse(x + Math.cos(a) * 52, y + Math.sin(a) * 30 + 1, 20, 11);
    g.fillStyle(0xb6a276, 1); g.fillEllipse(x + Math.cos(a) * 52, y + Math.sin(a) * 30, 18, 9);
  }
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 22, y - 8, 44, 18);
  g.fillStyle(TIMBER, 1); g.fillRect(x - 20, y - 8, 40, 6);
  g.fillStyle(BRONZE, 1); g.fillEllipse(x - 4, y - 10, 34, 26);
  g.fillStyle(BRONZE_LIT, 1); g.fillEllipse(x - 8, y - 14, 14, 8);
  g.fillStyle(IRON_DARK, 1); g.fillEllipse(x - 2, y - 16, 18, 12);
  g.fillStyle(0x000000, 1); g.fillEllipse(x - 2, y - 17, 13, 8);
  if (firing) {
    glow(g, x, y - 20, 50, LAMP, 0.12, 3);
    for (let i = 0; i < 6; i++) { g.fillStyle(0xd8d0c4, 0.6); g.fillCircle(x - 2 + Math.sin(i * 2.4) * 14, y - 30 - i * 8, 10 + i * 2); }
  }
}

export const FALLEN_SHELL_BY_SHELL: GimmickDef = {
  id: ID,
  rules: 'Conscripts pass shells hand to hand to the mortar, which lobs each at you. Strike a man and he drops his: it bursts at his feet. Jostle one by Shank.',
  make,
};
