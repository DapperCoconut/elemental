import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { glow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { crater, sandbags } from '../art';
import { BAG_DARK, BRASS, BRASS_LIT, IRON_LIT, IVORY, LAMP, MUD, MUD_DARK, MUD_LIT, MUD_WET, RED, RED_LIT, TIMBER, TIMBER_DARK, TIMBER_LIT } from '../palette';
import { alive, clamp, dist, segDist } from '../util';

/**
 * Countermine — Sapper Idris Mattock, who dug the galleries under the trench line, and who in the
 * King's telling dug one under the barracks the night Number Nine refused his draw.
 *
 * The sappers drive galleries in from the sap along the yard's edge. You see each one coming: the
 * ground heaves in a ridge behind a moving face, run straight at where you stood when it was
 * begun. When the face arrives it stops, a powder hose is run up the gallery (a spark creeping
 * along the ridge shows how long), and the chamber blows in a ring.
 *
 * Strike the face to break in from above: the gallery is lost — the camouflet slumps its whole
 * length a beat later, half-burying whoever stands on the ridge. So let a gallery chase you across
 * the yard with the Sapper at your heels, and break in when he is standing on it. The chamber's
 * blast doesn't care whose feet are over it either. Past half the sap is dug along the south edge
 * too, and galleries come from both. The bot keeps off charged rings and slumping ridges, and
 * runs to a face to break in when you stand on its gallery.
 */

const ID = fallenId('war', 'countermine');
const RING = 92;
const RIDGE = 42;
const MOUTHS = [130, 320, 500, 680, 850];

type GState = 'digging' | 'charged' | 'blown' | 'collapsing' | 'fallen';
interface Gallery {
  ox: number; oy: number; ax: number; ay: number; fx: number; fy: number;
  state: GState; at: number; t: StrikeTarget | null; seed: number;
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const gals: Gallery[] = [];
  let both = false;
  let nextDig = 0;
  let started = false;
  let fromSouth = false;
  let seed = 1;
  const northY = top + 16, southY = H - 14;
  const speed = () => (both ? 125 : 105);

  const onRidge = (gl: Gallery, f: Fighter, pad = 0) => segDist(f.x, f.y, gl.ox, gl.oy, gl.fx, gl.fy) < RIDGE + pad;

  function begin(time: number): void {
    const south = both && fromSouth;
    fromSouth = !fromSouth;
    const ox = MOUTHS.reduce((b, m) => (Math.abs(m - player.x) < Math.abs(b - player.x) ? m : b), MOUTHS[0]);
    const oy = south ? southY : northY;
    const ax = tk.clampX(player.x, 70), ay = clamp(player.y, top + 90, H - 80);
    if (Math.abs(ay - oy) < 90) return;
    const gl: Gallery = { ox, oy, ax, ay, fx: ox, fy: oy, state: 'digging', at: time, t: null, seed: seed++ };
    gl.t = ctx.target({
      x: ox, y: oy, r: 24,
      onStruck() {
        if (gl.state !== 'digging' && gl.state !== 'charged') return;
        gl.state = 'collapsing'; gl.at = tk.now + tk.warn(650);
        gl.t?.remove(); gl.t = null;
        ctx.sfx('quake');
        ctx.float(gl.fx, gl.fy - 30, 'BROKEN IN', '#ffe2a8');
      },
    });
    gals.push(gl);
    ctx.sfx('rock-throw');
  }

  function blow(gl: Gallery): void {
    ctx.sfx('explosion-large');
    if (alive(player) && dist(player.x, player.y, gl.ax, gl.ay) < RING + 18) {
      tk.hitPlayer(both ? 28 : 24, player.x, player.y);
      const a = Math.atan2(player.y - gl.ay, player.x - gl.ax);
      ctx.nudge(player, Math.cos(a) * 50, Math.sin(a) * 50);
    }
    if (alive(npc) && dist(npc.x, npc.y, gl.ax, gl.ay) < RING + 18) {
      ctx.hit(npc, 34, npc.x, npc.y);
      ctx.float(npc.x, npc.y - 56, 'HOIST BY HIS MINE', '#ffb070');
    }
    ctx.flash(gl.ax, gl.ay, LAMP);
  }

  function slump(gl: Gallery): void {
    ctx.sfx('stone-slam');
    const bury = (f: Fighter, isP: boolean) => {
      if (!alive(f) || !onRidge(gl, f, 18)) return;
      if (isP) tk.hitPlayer(16, f.x, f.y); else { ctx.hit(npc, 26, f.x, f.y); ctx.float(f.x, f.y - 56, 'BURIED', '#ffb070'); }
      ctx.root(f, 900);
    };
    bury(player, true); bury(npc, false);
  }

  return {
    update(time, dt) {
      if (!started) { started = true; nextDig = time + 1600; }
      if (!both && npc.hp < npc.maxHp * 0.5) { both = true; ctx.banner('THE SOUTH SAP OPENS', '#ffb070'); ctx.sfx('quake'); }
      if (time >= nextDig && alive(player)) {
        if (gals.filter((g) => g.state === 'digging' || g.state === 'charged').length < (both ? 3 : 2)) begin(time);
        nextDig = time + (both ? 3300 : 4200);
      }
      for (const gl of gals) {
        if (gl.state === 'digging') {
          const L = dist(gl.ox, gl.oy, gl.ax, gl.ay), d = dist(gl.ox, gl.oy, gl.fx, gl.fy) + speed() * Math.min(dt, 0.1);
          const k = Math.min(1, d / L);
          gl.fx = gl.ox + (gl.ax - gl.ox) * k; gl.fy = gl.oy + (gl.ay - gl.oy) * k;
          gl.t?.moveTo(gl.fx, gl.fy);
          if (k >= 1) { gl.state = 'charged'; gl.at = time + tk.warn(1150); ctx.sfx('countdown-tick'); }
        } else if (gl.state === 'charged' && time >= gl.at) {
          gl.state = 'blown'; gl.at = time; gl.t?.remove(); gl.t = null; blow(gl);
        } else if (gl.state === 'collapsing' && time >= gl.at) {
          gl.state = 'fallen'; gl.at = time; slump(gl);
        }
      }
      for (let i = gals.length - 1; i >= 0; i--) {
        const gl = gals[i];
        if ((gl.state === 'blown' || gl.state === 'fallen') && time - gl.at > 5000) gals.splice(i, 1);
      }
    },

    npcSeek(): Pt | null {
      if (!alive(npc)) return null;
      for (const gl of gals) {
        if (gl.state === 'charged' && dist(npc.x, npc.y, gl.ax, gl.ay) < RING + 50) {
          const a = Math.atan2(npc.y - gl.ay, npc.x - gl.ax);
          return { x: tk.clampX(gl.ax + Math.cos(a) * (RING + 90)), y: tk.clampY(gl.ay + Math.sin(a) * (RING + 90)) };
        }
        if (gl.state === 'collapsing' && onRidge(gl, npc, 40)) {
          const dx = gl.fx - gl.ox, dy = gl.fy - gl.oy, l = Math.hypot(dx, dy) || 1;
          const nx = -dy / l, ny = dx / l, s = (npc.x - gl.ox) * nx + (npc.y - gl.oy) * ny >= 0 ? 1 : -1;
          return { x: tk.clampX(npc.x + nx * s * 100), y: tk.clampY(npc.y + ny * s * 100) };
        }
      }
      if (!alive(player)) return null;
      for (const gl of gals) {
        if ((gl.state !== 'digging' && gl.state !== 'charged') || !onRidge(gl, player) || onRidge(gl, npc, 30)) continue;
        if (dist(npc.x, npc.y, gl.fx, gl.fy) > 340) continue;
        const a = Math.atan2(npc.y - gl.fy, npc.x - gl.fx);
        return { x: tk.clampX(gl.fx + Math.cos(a) * 60), y: tk.clampY(gl.fy + Math.sin(a) * 60) };
      }
      return null;
    },

    drawGround(g, time) {
      drawSap(g, W, northY, true);
      if (both) drawSap(g, W, southY, false);
      for (const gl of gals) {
        if (gl.state === 'blown') { const k = clamp((time - gl.at) / 5000, 0, 1); crater(g, gl.ax, gl.ay, 34, 1 - k); continue; }
        if (gl.state === 'fallen') { drawSlumped(g, gl, 1 - clamp((time - gl.at) / 5000, 0, 1)); continue; }
        drawRidge(g, gl);
        if (gl.state === 'charged') {
          const k = clamp(1 - (gl.at - time) / tk.warn(1150), 0, 1);
          drawCharge(g, gl, k, time);
        }
        if (gl.state === 'collapsing') {
          const k = clamp(1 - (gl.at - time) / tk.warn(650), 0, 1);
          drawCracks(g, gl, k);
        }
      }
    },

    drawAir(g, time) {
      for (const gl of gals) {
        if (gl.state === 'blown') {
          const k = (time - gl.at) / 900;
          if (k < 1) drawColumn(g, gl.ax, gl.ay, k, gl.seed);
        }
        if (gl.state === 'digging') drawFace(g, gl, time);
        if (gl.state === 'fallen') { const k = (time - gl.at) / 700; if (k < 1) drawDust(g, gl, k); }
      }
    },

    drawHud(g, time) {
      // The geophone: a listening drum on a stake, and a pip for every gallery heard.
      const x = W / 2 - 40, y = top + 18;
      g.fillStyle(0x000000, 0.55); g.fillRoundedRect(x - 18, y - 14, 120, 28, 6);
      g.fillStyle(BRASS, 1); g.fillEllipse(x, y + 2, 20, 12); g.fillStyle(BRASS_LIT, 1); g.fillEllipse(x, y - 1, 20, 7);
      g.lineStyle(2, TIMBER_LIT, 1); g.lineBetween(x, y + 7, x, y + 12);
      g.lineStyle(1.5, IVORY, 0.9); g.beginPath(); g.arc(x + 4, y - 6, 8, -1.2, 0.2); g.strokePath();
      let i = 0;
      for (const gl of gals) {
        if (gl.state !== 'digging' && gl.state !== 'charged') continue;
        const px = x + 22 + i * 18;
        const flash = gl.state === 'charged' ? 0.5 + Math.sin(time / 60) * 0.5 : 1;
        g.fillStyle(gl.state === 'charged' ? RED_LIT : MUD_LIT, flash); g.fillCircle(px, y, 6);
        g.lineStyle(1.5, TIMBER_DARK, 1); g.strokeCircle(px, y, 6);
        i++;
      }
      g.fillStyle(both ? RED : 0x444444, 1); g.fillTriangle(x + 92, y - 8, x + 98, y - 8, x + 95, y + 8);
    },

    destroy() { for (const gl of gals) gl.t?.remove(); },
  };
}

/** The sap along the yard's edge: a revetted trench, sandbagged, with a timbered shaft at each mouth. */
function drawSap(g: G, W: number, y: number, north: boolean): void {
  g.fillStyle(MUD_DARK, 1); g.fillRect(0, y - 12, W, 22);
  g.fillStyle(MUD_WET, 1); g.fillRect(0, y - 6, W, 10);
  for (let x = 4; x < W; x += 22) { g.fillStyle(TIMBER_DARK, 1); g.fillRect(x, north ? y + 6 : y - 14, 18, 6); g.lineStyle(1, TIMBER, 1); g.lineBetween(x + 2, north ? y + 9 : y - 11, x + 16, north ? y + 9 : y - 11); }
  for (const mx of MOUTHS) {
    g.fillStyle(0x1a140e, 1); g.fillRect(mx - 15, y - 10, 30, 18);
    g.lineStyle(4, TIMBER, 1); g.strokeRect(mx - 17, y - 12, 34, 22);
    g.lineStyle(2, TIMBER_LIT, 1); g.lineBetween(mx - 20, y - 15, mx + 20, y - 15);
    g.fillStyle(IRON_LIT, 1); g.fillCircle(mx - 20, y - 15, 2.5); g.fillCircle(mx + 20, y - 15, 2.5);
  }
  sandbags(g, W * 0.25, north ? y + 26 : y - 12, 70, 2);
  sandbags(g, W * 0.75, north ? y + 26 : y - 12, 70, 2);
}

/** Points down a gallery with a little wander, for drawing the heaved ground. */
function ridgePts(gl: Gallery, upto: number): Pt[] {
  const dx = gl.fx - gl.ox, dy = gl.fy - gl.oy, L = Math.hypot(dx, dy);
  const nx = L ? -dy / L : 0, ny = L ? dx / L : 0;
  const pts: Pt[] = [];
  const n = Math.max(2, Math.ceil((L * upto) / 14));
  for (let i = 0; i <= n; i++) {
    const k = (i / n) * upto, w = Math.sin(k * L * 0.045 + gl.seed) * 5;
    pts.push({ x: gl.ox + dx * k + nx * w, y: gl.oy + dy * k + ny * w });
  }
  return pts;
}

/** The heaved ridge over a live gallery: clods, a pale crest, cracks either side, shoring showing through. */
function drawRidge(g: G, gl: Gallery): void {
  const pts = ridgePts(gl, 1);
  for (const [i, p] of pts.entries()) {
    g.fillStyle(MUD_DARK, 0.9); g.fillEllipse(p.x, p.y + 3, 34, 20);
    g.fillStyle(MUD, 1); g.fillEllipse(p.x, p.y, 30, 16);
    g.fillStyle(MUD_LIT, 0.8); g.fillEllipse(p.x - 2, p.y - 3, 16, 6);
    if (i % 4 === 2) { g.fillStyle(TIMBER_DARK, 1); g.fillRect(p.x - 7, p.y - 2, 14, 4); g.fillStyle(TIMBER, 1); g.fillRect(p.x - 6, p.y - 2, 12, 2); }
    if (i % 3 === 1) {
      for (const s of [-1, 1]) { g.lineStyle(1.2, 0x2a2016, 0.8); g.lineBetween(p.x + s * 14, p.y + 2, p.x + s * 20, p.y - 3); g.lineBetween(p.x + s * 20, p.y - 3, p.x + s * 24, p.y + 4); }
    }
  }
}

/** The working face: a bulge that breaks the ground, spitting clods, a mattock-blade glinting through. */
function drawFace(g: G, gl: Gallery, time: number): void {
  const x = gl.fx, y = gl.fy;
  g.fillStyle(MUD_DARK, 1); g.fillEllipse(x, y + 4, 46, 28);
  g.fillStyle(MUD_LIT, 1); g.fillEllipse(x, y - 2, 38, 20);
  for (let i = 0; i < 6; i++) {
    const ph = ((time / 420 + i / 6 + gl.seed * 0.13) % 1);
    const a = i * 1.05 + gl.seed;
    g.fillStyle(i % 2 ? MUD : MUD_DARK, 1 - ph);
    g.fillCircle(x + Math.cos(a) * ph * 26, y - 4 - Math.sin(ph * Math.PI) * 18 + Math.sin(a) * ph * 10, 3.5 - ph * 2);
  }
  if (Math.sin(time / 130 + gl.seed) > 0.4) {
    g.fillStyle(IRON_LIT, 1); g.fillTriangle(x - 4, y - 6, x + 8, y - 14, x + 4, y - 2);
    g.fillStyle(0xffffff, 0.8); g.fillCircle(x + 7, y - 13, 1.5);
  }
}

/** The charge laid: chalk ring on the ground, the powder hose glowing up the gallery as the spark runs. */
function drawCharge(g: G, gl: Gallery, k: number, time: number): void {
  g.fillStyle(RED, 0.08 + k * 0.16); g.fillCircle(gl.ax, gl.ay, RING);
  for (let i = 0; i < 24; i++) {
    const a0 = (i / 24) * Math.PI * 2, a1 = a0 + Math.PI / 30;
    g.lineStyle(3, IVORY, 0.5 + k * 0.4);
    g.beginPath(); g.arc(gl.ax, gl.ay, RING, a0, a1); g.strokePath();
  }
  g.lineStyle(3, RED_LIT, 0.9); g.beginPath(); g.arc(gl.ax, gl.ay, RING - 8, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); g.strokePath();
  const sx = gl.ox + (gl.ax - gl.ox) * k, sy = gl.oy + (gl.ay - gl.oy) * k;
  g.lineStyle(2, BAG_DARK, 1); g.lineBetween(gl.ox, gl.oy, gl.ax, gl.ay);
  g.lineStyle(2, LAMP, 0.8); g.lineBetween(gl.ox, gl.oy, sx, sy);
  glow(g, sx, sy, 18, LAMP, 0.12, 3);
  g.fillStyle(0xfff0c0, 0.7 + Math.sin(time / 40) * 0.3); g.fillCircle(sx, sy, 3.5);
}

/** Cracks racing down the ridge from the broken-in face toward the sap. */
function drawCracks(g: G, gl: Gallery, k: number): void {
  g.fillStyle(RED, 0.08 + k * 0.12);
  const pts = ridgePts(gl, 1);
  for (const p of pts) g.fillCircle(p.x, p.y, RIDGE);
  const n = pts.length;
  for (let i = n - 1; i >= Math.floor((n - 1) * (1 - k)); i--) {
    const p = pts[i], s = i % 2 ? 1 : -1;
    g.lineStyle(2, 0x1a120c, 1); g.lineBetween(p.x - 10, p.y + s * 4, p.x + 10, p.y - s * 4);
  }
}

/** A slumped gallery: a sunken groove of churned earth, settling. */
function drawSlumped(g: G, gl: Gallery, a: number): void {
  for (const p of ridgePts(gl, 1)) { g.fillStyle(0x2a2016, 0.7 * a); g.fillEllipse(p.x, p.y, 28, 14); g.fillStyle(MUD_WET, 0.6 * a); g.fillEllipse(p.x, p.y + 2, 18, 6); }
}

/** The dust thrown up along a slumping gallery. */
function drawDust(g: G, gl: Gallery, k: number): void {
  for (const [i, p] of ridgePts(gl, 1).entries()) if (i % 2 === 0) { g.fillStyle(MUD_LIT, 0.45 * (1 - k)); g.fillCircle(p.x, p.y - k * 24, 10 + k * 14); }
}

/** The mine going up: a column of earth and smoke, clods flung out. */
function drawColumn(g: G, x: number, y: number, k: number, seed: number): void {
  const h = 160 * Math.sin(Math.min(1, k * 1.4) * Math.PI / 2);
  g.fillStyle(MUD_DARK, 0.85 * (1 - k)); g.fillEllipse(x, y - h / 2, 70 + k * 40, h);
  g.fillStyle(0xb8b0a4, 0.6 * (1 - k)); g.fillCircle(x, y - h, 40 + k * 30);
  for (let i = 0; i < 12; i++) {
    const a = -Math.PI / 2 + (((i * 37 + seed * 11) % 23) / 23 - 0.5) * 2.6, r = k * (90 + (i % 4) * 30);
    g.fillStyle(i % 2 ? MUD : TIMBER_DARK, 1 - k); g.fillCircle(x + Math.cos(a) * r, y + Math.sin(a) * r + k * k * 120, 4);
  }
  glow(g, x, y, 90, LAMP, 0.1 * (1 - k), 3);
}

export const FALLEN_COUNTERMINE: GimmickDef = {
  id: ID,
  rules: 'Galleries dig in toward where you stood and blow a ring. Strike a face to break in: the ridge slumps a beat later, burying all on it. Bury him.',
  make,
};
