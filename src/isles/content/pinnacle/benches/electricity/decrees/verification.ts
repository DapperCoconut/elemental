import Phaser from 'phaser';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import type { G } from '../../../../../art/IsleArt';
import { OBS, councilMask } from '../../../../../art/PinnacleArt';
import { ARC_CORE, COPPER, COPPER_LIT, SIDE_NPC, SIDE_PLAYER, VOLT, VOLT_LIT, bolt, glyph, leydenJar } from '../art';
import { type Who, WHO, alive, clamp, dist } from '../util';

/**
 * DECREE OF VERIFICATION — Councilor Ada Tabulae, Seat of the Tabulator (technology).
 *
 * Tabulae wrote the clause that made every household *prove* it had cranked — a form, a stamp, a
 * check. Her room asks the same of you. Every few seconds the floor becomes a three-by-three
 * check: SELECT ALL SQUARES WITH JARS (or sparks, or masks, or cables, or stars). When the clock
 * runs out, whoever stands on a right square is VERIFIED — every cooldown runs fast; whoever stands
 * on a wrong one is a ROBOT: zapped, silenced and rate-limited; whoever stood outside the grid did
 * not answer and is throttled. Three verifications running and the room trusts your device: the
 * next check passes you on sight.
 *
 * She is, of course, not a robot. She reads every check perfectly — after she has looked at it.
 * The REFRESH key on the wall is anyone's: strike it late, and the squares she is standing on mean
 * something else while she is still reading.
 */

type Icon = 'jars' | 'sparks' | 'masks' | 'cables' | 'stars';
const ICONS: Icon[] = ['jars', 'sparks', 'masks', 'cables', 'stars'];
const COLS = 3, ROWS = 3;

interface Mark { tile: number; ok: boolean; at: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, rng } = ctx;
  const GX = 180, GY = top + 40;
  const TW = (W - GX * 2) / COLS, TH = (H - 36 - GY) / ROWS;
  const CHECK = ctx.tk.warn(ctx.hard ? 3000 : 3600);
  const IDLE = ctx.hard ? 3000 : 3800;
  const EFFECT = 5000;
  const READ_MS = ctx.hard ? 550 : 750;

  let state: 'idle' | 'check' = 'idle';
  let at = -1;
  let checkStart = 0;
  let answer: Icon = 'jars';
  /** What each tile shows. */
  let tiles: Icon[] = [];
  let refreshed = false;
  let refreshFx = 0;
  const streak: Record<Who, number> = { player: 0, npc: 0 };
  const trusted: Record<Who, boolean> = { player: false, npc: false };
  const rate: Record<Who, { mult: number; until: number }> = { player: { mult: 1, until: 0 }, npc: { mult: 1, until: 0 } };
  let marks: Mark[] = [];
  const fighter = (w: Who): Fighter => (w === 'player' ? ctx.player : ctx.npc);

  const tileAt = (x: number, y: number): number => {
    if (x < GX || x >= W - GX || y < GY || y >= GY + TH * ROWS) return -1;
    return Math.floor((y - GY) / TH) * COLS + Math.floor((x - GX) / TW);
  };
  const tileCentre = (i: number): Pt => ({ x: GX + (i % COLS) * TW + TW / 2, y: GY + Math.floor(i / COLS) * TH + TH / 2 });

  const deal = () => {
    let a = ICONS[Math.floor(rng() * ICONS.length)];
    if (a === answer) a = ICONS[(ICONS.indexOf(a) + 1) % ICONS.length];
    answer = a;
    const right = 3 + Math.floor(rng() * 2);
    const idx = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    for (let i = idx.length - 1; i > 0; i--) { const k = Math.floor(rng() * (i + 1)); [idx[i], idx[k]] = [idx[k], idx[i]]; }
    tiles = new Array<Icon>(9);
    const decoys = ICONS.filter((c) => c !== answer);
    idx.forEach((t, n) => { tiles[t] = n < right ? answer : decoys[Math.floor(rng() * decoys.length)]; });
  };

  const refresh = ctx.target({
    x: W - 70, y: top + 70, r: 28, passThrough: false,
    onStruck: (by) => {
      if (state !== 'check' || refreshed) return;
      refreshed = true;
      refreshFx = ctx.scene.time.now;
      deal();
      checkStart = ctx.scene.time.now;
      at = Math.max(at, ctx.scene.time.now + 1100) + 500;
      ctx.sfx('glitch');
      ctx.banner(`REFRESHED — SELECT ALL SQUARES WITH ${answer.toUpperCase()}`, by === 'player' ? '#8fe8ff' : '#c9a0ff');
    },
  });

  const verify = (time: number) => {
    marks = [];
    for (const w of WHO) {
      const f = fighter(w);
      if (!alive(f)) continue;
      const tile = tileAt(f.x, f.y);
      const ok = trusted[w] || (tile >= 0 && tiles[tile] === answer);
      if (trusted[w]) {
        trusted[w] = false;
        ctx.float(f.x, f.y - 56, 'TRUSTED DEVICE', '#fff6c4');
      }
      if (ok) {
        rate[w] = { mult: 1.7, until: time + EFFECT };
        streak[w]++;
        if (tile >= 0) marks.push({ tile, ok: true, at: time });
        ctx.float(f.x, f.y - 40, 'VERIFIED', w === 'player' ? '#8fe8ff' : '#c9a0ff');
        if (streak[w] >= 3) { streak[w] = 0; trusted[w] = true; ctx.float(f.x, f.y - 72, 'DEVICE REMEMBERED', '#ffe14a'); }
      } else if (tile >= 0) {
        rate[w] = { mult: 0.55, until: time + EFFECT };
        streak[w] = 0;
        marks.push({ tile, ok: false, at: time });
        ctx.hit(f, 10, f.x, f.y);
        ctx.silence(f, 1500);
        ctx.flash(f.x, f.y, 0xff6a4a);
        ctx.float(f.x, f.y - 40, 'ROBOT DETECTED', '#ff8a6a');
      } else {
        rate[w] = { mult: 0.7, until: time + EFFECT };
        streak[w] = 0;
        ctx.float(f.x, f.y - 40, 'NO ANSWER — THROTTLED', '#d8c8ff');
      }
    }
    ctx.sfx('judgement');
  };

  const rateOf = (w: Who): number => (ctx.scene.time.now < rate[w].until ? rate[w].mult : 1);

  /** Draws one icon kind at a point in a tile — the pictures in the check. */
  const icon = (g: G, kind: Icon, x: number, y: number, s: number, t: number, a: number) => {
    switch (kind) {
      case 'jars': leydenJar(g, x, y + 22 * s, 0.34 * s, 0.7, t, VOLT); break;
      case 'sparks': glyph(g, 'electricity', x, y, 15 * s, VOLT, a); break;
      case 'masks': councilMask(g, x, y, 16 * s, { slit: VOLT, alpha: a }); break;
      case 'cables': {
        g.lineStyle(5 * s, 0x2a2232, a);
        g.beginPath();
        for (let i = 0; i <= 20; i++) {
          const k = i / 20;
          const px = x - 22 * s + k * 44 * s, py = y + Math.sin(k * Math.PI * 3) * 10 * s;
          if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
        }
        g.strokePath();
        g.lineStyle(1.5 * s, COPPER_LIT, a);
        for (let i = 0; i < 5; i++) { const px = x - 18 * s + i * 9 * s; g.lineBetween(px, y + Math.sin(((px - x + 22 * s) / (44 * s)) * Math.PI * 3) * 10 * s - 4 * s, px, y + Math.sin(((px - x + 22 * s) / (44 * s)) * Math.PI * 3) * 10 * s + 4 * s); }
        g.fillStyle(COPPER, a); g.fillCircle(x + 22 * s, y, 3 * s);
        break;
      }
      case 'stars': {
        g.fillStyle(OBS.star, 0.2 * a); g.fillCircle(x, y, 16 * s);
        g.fillStyle(OBS.star, a);
        const pts: Phaser.Geom.Point[] = [];
        for (let i = 0; i < 8; i++) { const r = i % 2 ? 5 * s : 15 * s; const an = -Math.PI / 2 + (i / 8) * Math.PI * 2; pts.push(new Phaser.Geom.Point(x + Math.cos(an) * r, y + Math.sin(an) * r)); }
        g.fillPoints(pts, true);
        g.fillStyle(OBS.starCore, a); g.fillCircle(x, y, 3 * s);
        break;
      }
    }
  };

  return {
    update(time) {
      if (at < 0) {
        at = time + 2600;
        ctx.banner('DECREE OF VERIFICATION — PROVE YOU ARE NOT A ROBOT', '#ffe14a');
        return;
      }
      if (state === 'idle' && time >= at) {
        state = 'check';
        refreshed = false;
        deal();
        checkStart = time;
        at = time + CHECK;
        ctx.banner(`SELECT ALL SQUARES WITH ${answer.toUpperCase()}`, '#fff6c4');
        ctx.sfx('countdown-tick');
      } else if (state === 'check' && time >= at) {
        verify(time);
        state = 'idle';
        at = time + IDLE;
      }
    },
    playerCooldownRate() { return rateOf('player'); },
    npcCooldownRate() { return rateOf('npc'); },
    npcSeek(): Pt | null {
      if (state !== 'check') return null;
      const now = ctx.scene.time.now;
      // She looks before she answers.
      if (now - checkStart < READ_MS || trusted.npc) return null;
      const n = ctx.npc;
      let best: Pt | null = null, bd = Infinity;
      tiles.forEach((k, i) => {
        if (k !== answer) return;
        const c = tileCentre(i);
        const d = dist(n.x, n.y, c.x, c.y);
        if (d < bd) { bd = d; best = c; }
      });
      return best;
    },
    drawGround(g, time) {
      const t = time / 1000;
      const checking = state === 'check';
      const k = checking ? clamp((time - checkStart) / Math.max(1, at - checkStart), 0, 1) : 0;
      // The frame of the check — copper rails between nine panes of black glass.
      for (let i = 0; i < 9; i++) {
        const x = GX + (i % COLS) * TW, y = GY + Math.floor(i / COLS) * TH;
        g.fillStyle(OBS.glass, checking ? 0.5 : 0.22); g.fillRect(x + 4, y + 4, TW - 8, TH - 8);
        if (checking) {
          g.fillStyle(OBS.facet, 0.35); g.fillTriangle(x + 4, y + 4, x + TW * 0.5, y + 4, x + 4, y + TH * 0.5);
        }
      }
      g.lineStyle(3, COPPER, checking ? 0.8 : 0.3);
      for (let c = 0; c <= COLS; c++) g.lineBetween(GX + c * TW, GY, GX + c * TW, GY + TH * ROWS);
      for (let r = 0; r <= ROWS; r++) g.lineBetween(GX, GY + r * TH, W - GX, GY + r * TH);
      g.lineStyle(1, COPPER_LIT, checking ? 0.6 : 0.2);
      for (let c = 0; c <= COLS; c++) g.lineBetween(GX + c * TW - 1, GY, GX + c * TW - 1, GY + TH * ROWS);
      // A scan line sweeps the panes while the check is open.
      if (checking) {
        const sy = GY + ((time / 1100) % 1) * TH * ROWS;
        g.fillStyle(VOLT, 0.06); g.fillRect(GX, sy - 10, W - GX * 2, 20);
        g.lineStyle(1, VOLT_LIT, 0.35); g.lineBetween(GX, sy, W - GX, sy);
        tiles.forEach((kind, i) => {
          const c = tileCentre(i);
          // Three of the thing in each square, the way the checks always show them.
          const pick = (n: number) => ((i * 7 + n * 3) % 5) / 5;
          for (let n = 0; n < 3; n++) {
            const ox = (pick(n) - 0.4) * TW * 0.55 + (n - 1) * TW * 0.22;
            const oy = (pick(n + 2) - 0.5) * TH * 0.4;
            icon(g, kind, c.x + ox, c.y + oy, 0.85 + pick(n + 1) * 0.3, t + i, 0.9);
          }
        });
        // The last stretch: the frame starts to blink.
        if (k > 0.75 && Math.floor(time / 120) % 2 === 0) {
          g.lineStyle(4, 0xffffff, 0.5); g.strokeRect(GX, GY, W - GX * 2, TH * ROWS);
        }
      }
      // Ticks and crosses where the fighters stood.
      marks = marks.filter((m) => time - m.at < 1500);
      for (const m of marks) {
        const c = tileCentre(m.tile);
        const a = 1 - (time - m.at) / 1500;
        g.fillStyle(m.ok ? 0x6aff9a : 0xff5a4a, 0.18 * a); g.fillRect(c.x - TW / 2 + 4, c.y - TH / 2 + 4, TW - 8, TH - 8);
        g.lineStyle(8, m.ok ? 0x6aff9a : 0xff5a4a, a);
        if (m.ok) { g.lineBetween(c.x - 30, c.y, c.x - 8, c.y + 24); g.lineBetween(c.x - 8, c.y + 24, c.x + 36, c.y - 26); }
        else { g.lineBetween(c.x - 28, c.y - 28, c.x + 28, c.y + 28); g.lineBetween(c.x + 28, c.y - 28, c.x - 28, c.y + 28); }
      }
      // The REFRESH key on the east wall.
      const rx = refresh.x, ry = refresh.y;
      const live = checking && !refreshed;
      g.fillStyle(0x000000, 0.4); g.fillEllipse(rx + 3, ry + 26, 60, 14);
      g.fillStyle(OBS.glass, 1); g.fillCircle(rx, ry, 28);
      g.lineStyle(3, live ? VOLT : 0x4a4258, 1); g.strokeCircle(rx, ry, 28);
      const spin = time / (live ? 300 : 1200);
      g.lineStyle(4, live ? VOLT_LIT : 0x5a5268, 1);
      g.beginPath(); g.arc(rx, ry, 15, spin, spin + Math.PI * 1.5, false); g.strokePath();
      const ax = rx + Math.cos(spin + Math.PI * 1.5) * 15, ay = ry + Math.sin(spin + Math.PI * 1.5) * 15;
      g.fillStyle(live ? VOLT_LIT : 0x5a5268, 1);
      g.fillTriangle(ax + Math.cos(spin) * 7, ay + Math.sin(spin) * 7, ax - Math.cos(spin) * 7, ay - Math.sin(spin) * 7, ax + Math.cos(spin + Math.PI * 1.5 + Math.PI / 2) * 9, ay + Math.sin(spin + Math.PI * 1.5 + Math.PI / 2) * 9);
      if (time - refreshFx < 400) bolt(g, rx, ry, GX + TW * 1.5, GY + TH * 1.5, Math.floor(time / 40), 2, VOLT, 1 - (time - refreshFx) / 400, 2);
    },
    drawAir(g, time) {
      // Streak pips and the trusted-device seal over each fighter.
      for (const w of WHO) {
        const f = fighter(w);
        if (!alive(f)) continue;
        const c = w === 'player' ? SIDE_PLAYER : SIDE_NPC;
        for (let i = 0; i < 3; i++) {
          g.fillStyle(i < streak[w] ? c : 0x2a2436, i < streak[w] ? 1 : 0.6);
          g.fillRect(f.x - 14 + i * 10, f.y - 46, 7, 4);
        }
        if (trusted[w]) {
          g.fillStyle(VOLT, 0.2 + 0.1 * Math.sin(time / 150)); g.fillCircle(f.x, f.y, 34);
          g.lineStyle(2, VOLT, 0.8); g.strokeCircle(f.x, f.y, 34);
        }
        if (ctx.scene.time.now < rate[w].until) {
          const fast = rate[w].mult > 1;
          const ph = (time / (fast ? 220 : 700)) % 1;
          g.lineStyle(1.5, fast ? ARC_CORE : 0xff8a6a, 0.6 * (1 - ph));
          g.strokeCircle(f.x, f.y, 24 + ph * 12);
        }
      }
    },
    drawHud(g, time) {
      if (state !== 'check') return;
      const cx = W / 2, cy = top + 18;
      const k = clamp((at - time) / Math.max(1, at - checkStart), 0, 1);
      g.fillStyle(OBS.glass, 0.9); g.fillRoundedRect(cx - 150, cy - 13, 300, 26, 6);
      g.lineStyle(2, COPPER, 1); g.strokeRoundedRect(cx - 150, cy - 13, 300, 26, 6);
      icon(g, answer, cx - 128, cy, 0.5, time / 1000, 1);
      g.fillStyle(0x1a1626, 1); g.fillRect(cx - 104, cy - 5, 240, 10);
      g.fillStyle(k < 0.25 ? 0xff8a6a : VOLT, 1); g.fillRect(cx - 104, cy - 5, 240 * k, 10);
    },
    destroy() { refresh.remove(); },
  };
}

export const DECREE_VERIFICATION: GimmickDef = {
  id: 'bench-electricity-verification',
  rules: 'Prove you are not a robot: when the check closes, stand on a square showing what it names. Right: fast cooldowns. Wrong: zapped, silenced.',
  make,
};
