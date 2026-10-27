import Phaser from 'phaser';
import type { Fighter } from '../../../../../entities/Fighter';
import type { SignatureMove, WorldBossDef } from '../../../../../boss/framework/BossDefs';
import type { BossToolkit } from '../../../../../boss/framework/BossToolkit';
import { mixC } from '../../../../art/IsleArt';
import { CAL, basaltColumn, hexPts } from './palette';

/**
 * Prince Basalt, the Molten Heir — King Ashgrave's eldest, governor of the Caldera Court and
 * the last prince before the Kiln. He is stone that remembers being liquid: a body of cooled
 * basalt crowned with hexagonal columns, lava showing only in his seams.
 *
 * Phase one, *Bedrock*: rooted like the crater floor, he makes the floor fight for him —
 * columns rising in a three-beat honeycomb, channels cut and flooded, obsidian slivers hung
 * in the air and loosed. Phase two, *The Caldera Wakes*: he comes after you while the rim of
 * the floor caves into the lava lake sector by sector, and lobs molten bombs that spatter.
 * Hard mode, *Obsidian Heir*: he quenches himself into black glass. The armour shrugs off
 * most of what you do — it cracks only when he erupts, and for a few seconds after each
 * eruption he is split open and takes far more.
 */

const BASALT = 0x3c3a44;
const BASALT_LIT = 0x8a8696;
const BASALT_DARK = 0x16141a;
const MAGMA = 0xff6a1e;

/**
 * The hard-mode armour's live state, shared between the Heir signature (which drives it) and
 * `drawDecor` (which paints it). One prince fight runs at a time, and the signature resets it
 * on every phase change, so a module-level record is all this needs.
 */
const heir = { armoured: false, crackedFrom: 0, crackedUntil: 0 };

/** The fighter in the npc slot — the prince's body — for the Heir armour multiplier. */
function princeBody(tk: BossToolkit): Fighter | null {
  return (tk.scene as unknown as { npc?: Fighter }).npc ?? null;
}

const FIELD_TOP = 96;

// ── Signature: Basalt Lattice ────────────────────────────────────────
// A honeycomb of hex cells is laid around you, each marked with one, two or three pips.
// The ones go up as columns, then the twos, then the threes — a three-beat rhythm. Stand on
// a later beat, then step onto a cell that has already gone up and come back down.

const lattice = (tk: BossToolkit): SignatureMove => {
  const CELL = 46;
  const BEAT = 640;
  const WARN = 1250;
  let cells: { x: number; y: number; group: number }[] = [];
  let bornAt = 0;
  let active = false;
  const firedAt = [0, 0, 0];
  return {
    durationMs: WARN + BEAT * 2 + 700,
    windupMs: 600,
    gesture: 'slam',
    tell: 'BASALT LATTICE',
    cast(time) {
      tk.sfx('stone-rise');
      bornAt = time;
      active = true;
      firedAt.fill(0);
      const p = tk.player;
      const cx = p.x, cy = p.y;
      cells = [];
      for (let r = -5; r <= 5; r++) {
        for (let q = -6; q <= 6; q++) {
          const x = cx + CELL * Math.sqrt(3) * (q + r / 2);
          const y = cy + CELL * 1.5 * r;
          if (Math.hypot(x - cx, y - cy) > 250) continue;
          if (x < 30 || x > tk.W - 30 || y < FIELD_TOP + 10 || y > tk.H - 20) continue;
          cells.push({ x, y, group: (((q - r) % 3) + 3) % 3 });
        }
      }
      const warn = tk.warn(WARN);
      for (let gi = 0; gi < 3; gi++) {
        tk.schedule(warn + gi * BEAT, () => {
          firedAt[gi] = tk.now;
          tk.sfx('stone-slam');
          const pl = tk.player;
          for (const c of cells) {
            if (c.group !== gi) continue;
            if (Math.hypot(pl.x - c.x, pl.y - c.y) < CELL * 0.82) { tk.hitPlayer(20, pl.x, pl.y); break; }
          }
        });
      }
      tk.schedule(warn + BEAT * 2 + 700, () => { active = false; });
    },
    drawGround(g, time) {
      if (!active) return;
      const k = Math.min(1, (time - bornAt) / tk.warn(WARN));
      for (const c of cells) {
        const fired = firedAt[c.group];
        const since = fired ? time - fired : -1;
        if (since >= 0 && since < 520) continue; // standing as a column — drawn in air
        const done = since >= 520;
        g.lineStyle(2, done ? BASALT_LIT : mixC(BASALT_LIT, MAGMA, k), done ? 0.25 : 0.5 + k * 0.4);
        g.strokePoints(hexPts(c.x, c.y, CELL * 0.92, 0, 1), true, true);
        if (done) continue;
        // Which beat: one, two or three glowing pips.
        const next = firedAt.findIndex((f) => f === 0);
        const urgent = c.group === next;
        for (let i = 0; i <= c.group; i++) {
          g.fillStyle(urgent ? CAL.lavaHot : MAGMA, urgent ? 0.6 + Math.sin(time / 70) * 0.35 : 0.55);
          g.fillCircle(c.x + (i - c.group / 2) * 9, c.y, 3.2);
        }
        if (urgent) {
          g.fillStyle(MAGMA, 0.12 + k * 0.12);
          g.fillPoints(hexPts(c.x, c.y, CELL * 0.88, 0, 1), true, true);
        }
      }
    },
    drawAir(g, time) {
      if (!active) return;
      for (const c of cells) {
        const fired = firedAt[c.group];
        if (!fired) continue;
        const since = time - fired;
        if (since < 0 || since >= 520) continue;
        const h = Math.sin((since / 520) * Math.PI) * 64;
        basaltColumn(g, c.x, c.y + CELL * 0.3, CELL * 0.7, h, (c.group * 0.2), 0.6);
      }
    },
    onPhaseEnd() { active = false; cells = []; },
  };
};

// ── Signature: Lava Channels ─────────────────────────────────────────
// Three parallel cuts are scored across the floor, aimed down your line. The cuts widen,
// glow, then flood: lava runs along them for a few seconds. The gaps between them are dry.

const channels = (tk: BossToolkit): SignatureMove => {
  const HALF_W = 32;
  const WARN = 1300;
  const FLOW = 2700;
  let lines: { x: number; y: number; a: number }[] = [];
  let bornAt = 0;
  let floodAt = 0;
  let endAt = 0;
  let lastHit = 0;
  return {
    durationMs: 1600,
    windupMs: 650,
    gesture: 'sweep',
    tell: 'LAVA CHANNELS',
    cast(time) {
      tk.sfx('quake');
      const p = tk.player;
      const a = tk.angleToPlayer() + (Math.random() - 0.5) * 0.5;
      const nx = -Math.sin(a), ny = Math.cos(a);
      const shift = (Math.random() - 0.5) * 60;
      lines = [-150, 0, 150].map((o) => ({ x: p.x + nx * (o + shift), y: p.y + ny * (o + shift), a }));
      bornAt = time;
      floodAt = time + tk.warn(WARN);
      endAt = floodAt + FLOW;
      lastHit = 0;
    },
    update(time) {
      if (time < floodAt || time > endAt) return;
      if (time - lastHit < 420) return;
      const p = tk.player;
      for (const l of lines) {
        const d = Math.abs(-Math.sin(l.a) * (p.x - l.x) + Math.cos(l.a) * (p.y - l.y));
        if (d < HALF_W) { lastHit = time; tk.hitPlayer(8, p.x, p.y); tk.slowPlayer(0.7, 500); break; }
      }
    },
    drawGround(g, time) {
      if (time > endAt + 600 || !lines.length) return;
      const L = 1300;
      for (const l of lines) {
        const ux = Math.cos(l.a), uy = Math.sin(l.a);
        const ax = l.x - ux * L, ay = l.y - uy * L, bx = l.x + ux * L, by = l.y + uy * L;
        if (time < floodAt) {
          // Being cut: a crack that widens, rimmed with tossed-up crust.
          const k = (time - bornAt) / (floodAt - bornAt);
          g.lineStyle(HALF_W * 2 * k + 6, BASALT_DARK, 0.7);
          g.lineBetween(ax, ay, bx, by);
          g.lineStyle(2 + k * 4, MAGMA, 0.4 + k * 0.5);
          g.lineBetween(ax, ay, bx, by);
        } else if (time <= endAt) {
          g.lineStyle(HALF_W * 2 + 8, BASALT_DARK, 0.9);
          g.lineBetween(ax, ay, bx, by);
          g.lineStyle(HALF_W * 2, CAL.lava, 0.95);
          g.lineBetween(ax, ay, bx, by);
          g.lineStyle(HALF_W * 0.7, CAL.lavaLit, 0.8);
          g.lineBetween(ax, ay, bx, by);
          // Flow chevrons, running away from the prince.
          const nx = -uy, ny = ux;
          for (let i = -24; i < 24; i++) {
            const d = i * 56 + ((time / 4) % 56);
            const cx = l.x + ux * d, cy = l.y + uy * d;
            if (cx < -20 || cx > tk.W + 20 || cy < FIELD_TOP - 20 || cy > tk.H + 20) continue;
            g.lineStyle(3, CAL.lavaHot, 0.7);
            g.lineBetween(cx - ux * 10 + nx * 14, cy - uy * 10 + ny * 14, cx, cy);
            g.lineBetween(cx - ux * 10 - nx * 14, cy - uy * 10 - ny * 14, cx, cy);
          }
        } else {
          const k = 1 - (time - endAt) / 600;
          g.lineStyle(HALF_W * 2, CAL.crustMid, k * 0.8);
          g.lineBetween(ax, ay, bx, by);
        }
      }
    },
    onPhaseEnd() { lines = []; endAt = 0; },
  };
};

// ── Signature: Obsidian Volley ───────────────────────────────────────
// He shears black glass off his own shoulders. The slivers fan out, stop dead in a crescent
// and hang there, each drawing a hairline on where you stand — then all loose at once.

const shards = (tk: BossToolkit): SignatureMove => {
  interface Shard { x: number; y: number; ox: number; oy: number; tx: number; ty: number; vx: number; vy: number; state: 'out' | 'hang' | 'fly'; dead: boolean }
  let list: Shard[] = [];
  let bornAt = 0;
  let hangAt = 0;
  let loseAt = 0;
  return {
    durationMs: 2200,
    windupMs: 550,
    gesture: 'raise',
    tell: 'OBSIDIAN VOLLEY',
    cast(time) {
      tk.sfx('crystal-shatter');
      bornAt = time;
      hangAt = time + 480;
      loseAt = hangAt + tk.warn(760);
      const aim = tk.angleToPlayer();
      const n = tk.hard ? 13 : 11;
      list = [];
      for (let i = 0; i < n; i++) {
        const a = aim + (i - (n - 1) / 2) * 0.2;
        const r = 120 + Math.abs(i - (n - 1) / 2) * 8;
        list.push({
          x: tk.bossX, y: tk.bossY, ox: tk.bossX, oy: tk.bossY,
          tx: tk.clampX(tk.bossX + Math.cos(a) * r, 20), ty: tk.clampY(tk.bossY + Math.sin(a) * r, 20),
          vx: 0, vy: 0, state: 'out', dead: false,
        });
      }
    },
    update(time, dt) {
      if (!list.length) return;
      const p = tk.player;
      for (const s of list) {
        if (s.dead) continue;
        if (s.state === 'out') {
          const k = Math.min(1, (time - bornAt) / (hangAt - bornAt));
          const e = 1 - (1 - k) * (1 - k);
          s.x = s.ox + (s.tx - s.ox) * e; s.y = s.oy + (s.ty - s.oy) * e;
          if (k >= 1) s.state = 'hang';
        } else if (s.state === 'hang') {
          if (time >= loseAt) {
            const a = Math.atan2(p.y - s.y, p.x - s.x);
            s.vx = Math.cos(a) * 360; s.vy = Math.sin(a) * 360;
            s.state = 'fly';
          }
        } else {
          s.x += s.vx * dt; s.y += s.vy * dt;
          if (Math.hypot(p.x - s.x, p.y - s.y) < 22) { tk.hitPlayer(10, s.x, s.y); s.dead = true; }
          if (s.x < -30 || s.x > tk.W + 30 || s.y < FIELD_TOP - 30 || s.y > tk.H + 30) s.dead = true;
        }
      }
      if (list.every((s) => s.dead)) list = [];
    },
    drawAir(g, time) {
      const p = tk.player;
      for (const s of list) {
        if (s.dead) continue;
        const a = s.state === 'fly' ? Math.atan2(s.vy, s.vx) : Math.atan2(p.y - s.y, p.x - s.x);
        if (s.state === 'hang') {
          const k = (time - hangAt) / Math.max(1, loseAt - hangAt);
          g.lineStyle(1, 0xd8c8ff, 0.15 + k * 0.45);
          g.lineBetween(s.x, s.y, s.x + Math.cos(a) * 900, s.y + Math.sin(a) * 900);
        }
        const ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
        // A long black-glass sliver with one white edge and a violet sheen.
        g.fillStyle(0x0b0910, 1);
        g.fillTriangle(s.x + ux * 16, s.y + uy * 16, s.x - ux * 12 + nx * 5, s.y - uy * 12 + ny * 5, s.x - ux * 12 - nx * 5, s.y - uy * 12 - ny * 5);
        g.fillStyle(0x6a4c9c, 0.6);
        g.fillTriangle(s.x + ux * 14, s.y + uy * 14, s.x - ux * 8 + nx * 3, s.y - uy * 8 + ny * 3, s.x - ux * 2, s.y - uy * 2);
        g.lineStyle(1.2, 0xffffff, 0.85);
        g.lineBetween(s.x + ux * 16, s.y + uy * 16, s.x - ux * 12 + nx * 5, s.y - uy * 12 + ny * 5);
        if (s.state === 'fly') {
          g.lineStyle(2, 0xb9a9d8, 0.3);
          g.lineBetween(s.x - ux * 14, s.y - uy * 14, s.x - ux * 40, s.y - uy * 40);
        }
      }
    },
    onPhaseEnd() { list = []; },
  };
};

// ── Signature: The Caldera Wakes ─────────────────────────────────────
// The floor's rim is eight great plates around a sound centre. Three of them — always
// including the one you stand on — crack, shed pebbles, and cave into the lava lake beneath.
// They stay molten for a long while; the room you can stand in shrinks and shifts.

const cavein = (tk: BossToolkit): SignatureMove => {
  const SECTORS = 8;
  const INNER = 205;
  const OUTER = 640;
  const WARN = 1500;
  const MOLTEN = 7200;
  interface Cave { idx: number; crackAt: number; caveAt: number; until: number }
  let caves: Cave[] = [];
  let lastHit = 0;
  const cx = (): number => tk.W / 2;
  const cy = (): number => (FIELD_TOP + tk.H) / 2;
  const sectorOf = (x: number, y: number): number => {
    const d = Math.hypot(x - cx(), y - cy());
    if (d < INNER) return -1;
    const a = Phaser.Math.Angle.Wrap(Math.atan2(y - cy(), x - cx())) + Math.PI;
    return Math.floor((a / (Math.PI * 2)) * SECTORS) % SECTORS;
  };
  const sectorAngles = (i: number): [number, number] => {
    const a0 = (i / SECTORS) * Math.PI * 2 - Math.PI;
    return [a0, a0 + (Math.PI * 2) / SECTORS];
  };
  const wedge = (i: number, r0: number, r1: number): Phaser.Geom.Point[] => {
    const [a0, a1] = sectorAngles(i);
    const pts: Phaser.Geom.Point[] = [];
    for (let k = 0; k <= 8; k++) { const a = a0 + ((a1 - a0) * k) / 8; pts.push(new Phaser.Geom.Point(cx() + Math.cos(a) * r1, cy() + Math.sin(a) * r1)); }
    for (let k = 8; k >= 0; k--) { const a = a0 + ((a1 - a0) * k) / 8; pts.push(new Phaser.Geom.Point(cx() + Math.cos(a) * r0, cy() + Math.sin(a) * r0)); }
    return pts;
  };
  return {
    durationMs: 1900,
    windupMs: 700,
    hold: 'brace',
    tell: 'THE CALDERA WAKES',
    cast(time) {
      tk.sfx('quake');
      const p = tk.player;
      const mine = sectorOf(p.x, p.y);
      const pick = new Set<number>();
      if (mine >= 0) pick.add(mine);
      while (pick.size < (tk.hard ? 4 : 3)) pick.add(Math.floor(Math.random() * SECTORS));
      const warn = tk.warn(WARN);
      // A sector already molten simply has its clock extended.
      caves = caves.filter((c) => !pick.has(c.idx) && c.until > time);
      for (const idx of pick) caves.push({ idx, crackAt: time, caveAt: time + warn, until: time + warn + MOLTEN });
      tk.schedule(warn, () => tk.sfx('explosion-medium'));
    },
    update(time) {
      if (!caves.length || time - lastHit < 450) return;
      const p = tk.player;
      const s = sectorOf(p.x, p.y);
      if (s < 0) return;
      if (caves.some((c) => c.idx === s && time >= c.caveAt && time < c.until)) {
        lastHit = time;
        tk.hitPlayer(8, p.x, p.y);
        tk.slowPlayer(0.65, 500);
      }
    },
    drawGround(g, time) {
      if (!caves.length) return;
      // The sound centre is ringed so you always know where the floor will hold.
      g.lineStyle(3, BASALT_LIT, 0.35);
      g.strokeCircle(cx(), cy(), INNER);
      for (const c of caves) {
        if (time >= c.until + 800) continue;
        const [a0, a1] = sectorAngles(c.idx);
        if (time < c.caveAt) {
          const k = (time - c.crackAt) / (c.caveAt - c.crackAt);
          g.fillStyle(MAGMA, 0.08 + k * 0.18); g.fillPoints(wedge(c.idx, INNER, OUTER), true, true);
          g.lineStyle(2 + k * 3, mixC(CAL.seam, CAL.lavaHot, k), 0.8);
          for (let j = 1; j < 5; j++) {
            const a = a0 + ((a1 - a0) * j) / 5;
            g.lineBetween(cx() + Math.cos(a) * INNER, cy() + Math.sin(a) * INNER, cx() + Math.cos(a) * (INNER + 260 * k), cy() + Math.sin(a) * (INNER + 260 * k));
          }
          g.lineStyle(4, CAL.lavaHot, 0.5 + Math.sin(time / 60) * 0.3);
          g.strokePoints(wedge(c.idx, INNER, OUTER), true, true);
        } else if (time < c.until) {
          g.fillStyle(CAL.lava, 0.92); g.fillPoints(wedge(c.idx, INNER, OUTER), true, true);
          g.fillStyle(CAL.lavaLit, 0.45); g.fillPoints(wedge(c.idx, INNER + 30, OUTER - 120), true, true);
          // Sunk rubble turning over in the melt.
          for (let j = 0; j < 7; j++) {
            const a = a0 + (a1 - a0) * ((j * 0.37 + 0.1) % 1);
            const r = INNER + 40 + ((j * 71 + time / 30) % 300);
            g.fillStyle(CAL.crust, 0.85);
            g.fillEllipse(cx() + Math.cos(a) * r, cy() + Math.sin(a) * r, 18, 8);
          }
          g.lineStyle(3, CAL.crust, 1);
          g.strokePoints(wedge(c.idx, INNER, OUTER), true, true);
        } else {
          const k = 1 - (time - c.until) / 800;
          g.fillStyle(CAL.crustMid, k * 0.8); g.fillPoints(wedge(c.idx, INNER, OUTER), true, true);
        }
      }
    },
    drawAir(g, time) {
      // Pebbles dropping into the cracks during the warning.
      for (const c of caves) {
        if (time >= c.caveAt) continue;
        const [a0, a1] = sectorAngles(c.idx);
        for (let j = 0; j < 5; j++) {
          const ph = ((time / 400) + j / 5) % 1;
          const a = a0 + (a1 - a0) * ((j * 0.29 + 0.2) % 1);
          const r = INNER + 60 + j * 50;
          g.fillStyle(BASALT_LIT, 1 - ph);
          g.fillCircle(cx() + Math.cos(a) * r, cy() + Math.sin(a) * r - (1 - ph) * 20, 2.5);
        }
      }
    },
    onPhaseEnd() { caves = []; },
  };
};

// ── Signature: Lava Bombs ────────────────────────────────────────────
// Five crusted gobbets of magma lobbed high, each with its shadow growing where it will land.
// On landing a bomb bursts and throws a short ring of spatter — step out of the shadow, then
// step through the spatter's gaps.

const bombs = (tk: BossToolkit): SignatureMove => {
  interface Bomb { fx: number; fy: number; x: number; y: number; at: number; lands: number; done: boolean }
  let list: Bomb[] = [];
  return {
    durationMs: 2100,
    windupMs: 500,
    gesture: 'punch',
    tell: 'LAVA BOMBS',
    cast(time) {
      tk.sfx('mortar-launch');
      const p = tk.player;
      list = [];
      const n = tk.hard ? 6 : 5;
      for (let i = 0; i < n; i++) {
        const off = i === 0 ? 0 : 80 + Math.random() * 110;
        const a = Math.random() * Math.PI * 2;
        const at = time + i * 230;
        list.push({ fx: tk.bossX, fy: tk.bossY - 30, x: tk.clampX(p.x + Math.cos(a) * off), y: tk.clampY(p.y + Math.sin(a) * off), at, lands: at + tk.warn(1150), done: false });
      }
    },
    update(time) {
      for (const b of list) {
        if (b.done || time < b.lands) continue;
        b.done = true;
        tk.explode(b.x, b.y, 50, 18, MAGMA);
        tk.sfx('explosion-small');
        const a0 = Math.random() * Math.PI;
        for (let k = 0; k < 6; k++) {
          const a = a0 + (k / 6) * Math.PI * 2;
          tk.spawnBullet({ x: b.x + Math.cos(a) * 20, y: b.y + Math.sin(a) * 20, angle: a, speed: 170, damage: 7, r: 5, lifeMs: 950, color: CAL.lavaLit });
        }
        tk.spawnPool({ x: b.x, y: b.y, radius: 30, lifeMs: 3000, damage: 5 });
      }
      if (list.length && list.every((b) => b.done)) list = [];
    },
    drawGround(g, time) {
      for (const b of list) {
        if (b.done || time < b.at) continue;
        const k = (time - b.at) / (b.lands - b.at);
        g.fillStyle(0x000000, 0.2 + k * 0.4); g.fillEllipse(b.x, b.y, 100 * (0.3 + k * 0.7), 50 * (0.3 + k * 0.7));
        g.lineStyle(2, MAGMA, 0.5 + k * 0.5); g.strokeEllipse(b.x, b.y, 100, 50);
      }
    },
    drawAir(g, time) {
      for (const b of list) {
        if (b.done || time < b.at) continue;
        const k = (time - b.at) / (b.lands - b.at);
        const x = b.fx + (b.x - b.fx) * k;
        const y = b.fy + (b.y - b.fy) * k - Math.sin(k * Math.PI) * 260;
        // Smoke trail.
        for (let i = 1; i <= 4; i++) {
          const kk = Math.max(0, k - i * 0.04);
          const tx = b.fx + (b.x - b.fx) * kk, ty = b.fy + (b.y - b.fy) * kk - Math.sin(kk * Math.PI) * 260;
          g.fillStyle(0x3a3036, 0.3 - i * 0.05); g.fillCircle(tx, ty, 6 + i * 2);
        }
        g.fillStyle(CAL.lava, 1); g.fillCircle(x, y, 13);
        g.fillStyle(CAL.lavaHot, 0.9); g.fillCircle(x - 3, y - 3, 6);
        // Crust plates riding the gobbet.
        const r = time / 120;
        for (let i = 0; i < 3; i++) {
          const a = r + i * 2.1;
          g.fillStyle(CAL.crust, 1); g.fillEllipse(x + Math.cos(a) * 8, y + Math.sin(a) * 8, 9, 6);
        }
      }
    },
    onPhaseEnd() { list = []; },
  };
};

// ── Signature: Obsidian Heir (hard) ──────────────────────────────────
// The armour's engine. First use quenches him into black glass: from then on he takes a
// fraction of every hit. Each cast he plants, a ring of splitting glass marks his reach,
// and he erupts from inside the armour — everything in the ring burns, the floor around him
// boils, and the armour hangs open, glowing, for a few seconds. That is your window.

const heirMove = (tk: BossToolkit): SignatureMove => {
  const R = 210;
  const WARN = 1550;
  const OPEN_MS = 4300;
  let ringAt = 0;
  let eruptAt = 0;
  let rx = 0, ry = 0;
  const setMult = (m: number): void => { const b = princeBody(tk); if (b) b.bossWardIncomingMult = m; };
  return {
    durationMs: 2300,
    windupMs: 500,
    hold: 'charge',
    locksBody: true,
    tell: 'THE HEIR ERUPTS',
    cast(time) {
      if (!heir.armoured) {
        heir.armoured = true;
        tk.host.showFloatingText(tk.bossX, tk.bossY - 60, 'OBSIDIAN ARMOUR', '#c9b8ff');
      }
      tk.sfx('beam-charge');
      ringAt = time;
      eruptAt = time + tk.warn(WARN);
      rx = tk.bossX; ry = tk.bossY;
      tk.schedule(eruptAt - time, () => {
        tk.sfx('explosion-large');
        tk.explode(rx, ry, R, 26, MAGMA);
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2 + Math.random() * 0.4;
          const d = 110 + Math.random() * 80;
          tk.spawnPool({ x: tk.clampX(rx + Math.cos(a) * d), y: tk.clampY(ry + Math.sin(a) * d), radius: 34, lifeMs: 3800, damage: 6 });
        }
        heir.crackedFrom = tk.now;
        heir.crackedUntil = tk.now + OPEN_MS;
        tk.host.showFloatingText(rx, ry - 64, 'CRACKED!', '#ffb347');
      });
    },
    update(time) {
      if (!heir.armoured) return;
      setMult(time < heir.crackedUntil && time >= heir.crackedFrom ? 1.7 : 0.3);
    },
    drawGround(g, time) {
      if (time < ringAt || time > eruptAt + 400) return;
      if (time <= eruptAt) {
        const k = (time - ringAt) / Math.max(1, eruptAt - ringAt);
        g.fillStyle(MAGMA, 0.06 + k * 0.14); g.fillCircle(rx, ry, R);
        // Glass splitting outward to the ring's edge.
        g.lineStyle(2, 0xd8c8ff, 0.6);
        for (let i = 0; i < 14; i++) {
          const a = (i / 14) * Math.PI * 2 + i * 0.3;
          g.lineBetween(rx + Math.cos(a) * 30, ry + Math.sin(a) * 30, rx + Math.cos(a) * (30 + (R - 30) * k), ry + Math.sin(a) * (30 + (R - 30) * k));
        }
        g.lineStyle(4, k > 0.75 ? CAL.lavaHot : 0xb9a9d8, 0.6 + Math.sin(time / 60) * 0.3);
        g.strokeCircle(rx, ry, R);
      } else {
        const k = (time - eruptAt) / 400;
        g.fillStyle(CAL.lavaHot, 0.5 * (1 - k)); g.fillCircle(rx, ry, R * (0.6 + k * 0.4));
      }
    },
    onPhaseEnd() {
      heir.armoured = false;
      heir.crackedFrom = 0;
      heir.crackedUntil = 0;
      setMult(1);
    },
  };
};

// ── The def ──────────────────────────────────────────────────────────

export const BASALT_BOSS: WorldBossDef = {
  worldId: 'isle:basalt',
  name: 'Prince Basalt',
  title: 'the Molten Heir',
  color: BASALT,
  colorLit: BASALT_LIT,
  colorDark: BASALT_DARK,
  accent: MAGMA,
  damageMult: 1.1,

  intro: [
    'You climbed into a volcano to find me. Most come in a cart.',
    'Kneel on the crust, little brand. It holds the ones who are still.',
  ],
  banter: [
    'My father burns people. I only keep them busy until he needs them.',
    'Every block of glass in the Kiln was cut by someone who begged me for a day off.',
    'Stone does not hurry. Stone does not forgive. Stone is the heir.',
    'Five of my siblings fell to you? They were always soft. They were born above ground.',
    'Listen. The lake is listening too.',
    'I was liquid once. I learned better.',
  ],
  defeatLine: 'THE BEDROCK BREAKS',
  resumeLine: 'Another one. The crater is patient. So am I.',

  phases: [
    {
      name: 'Bedrock',
      line: 'Stand where I say. The floor will see to the rest.',
      hp: 400,
      cycle: [
        'sig:lattice', 'volley', 'sig:channels', 'barrage',
        'sig:shards', 'lanes', 'sig:lattice', 'quake',
      ],
      harass: ['h-snipe', 'h-rune', 'h-flak'],
      restMs: 1150,
      harassMs: 3300,
    },
    {
      name: 'The Caldera Wakes',
      line: 'Enough standing. Let the crater open its mouth.',
      hp: 480,
      cycle: [
        'sig:cavein', 'sig:bombs', 'slamchain', 'sig:channels',
        'hazard', 'sig:cavein', 'spiral', 'sig:bombs', 'charge',
      ],
      harass: ['h-snipe', 'h-mines', 'h-rune', 'h-lane'],
      restMs: 980,
      harassMs: 2800,
    },
  ],

  hard: {
    introLine: 'THE HEIR HAS QUENCHED HIMSELF',
    extraPhase: {
      name: 'Obsidian Heir',
      line: 'Glass, now. Black and whole. Break it, if you can make me break it.',
      hp: 350,
      cycle: [
        'sig:heir', 'sig:shards', 'sig:lattice', 'sig:heir',
        'sig:bombs', 'quake', 'sig:heir', 'sig:channels', 'stream',
      ],
      harass: ['h-orbs', 'h-snipe', 'h-rune', 'h-mines'],
      restMs: 800,
      harassMs: 2400,
    },
  },

  tuning: {
    volley: { count: 7, spreadRad: 0.16, speed: 230 },
    barrage: { count: 7, radius: 54 },
    quake: { rings: 3, gapHalf: 0.55 },
    lanes: { halfW: 30 },
  },

  signatures: {
    lattice,
    channels,
    shards,
    cavein,
    bombs,
    heir: heirMove,
  },

  /**
   * The Heir's own floor: a black obsidian disc cut into hexagons around a sunken centre,
   * lava showing in the joints, the crater's basalt columns standing round the rim.
   */
  drawArena(g, W, H) {
    g.fillStyle(CAL.obsidian, 1); g.fillRect(0, 0, W, H);
    const cx = W / 2, cy = (FIELD_TOP + H) / 2;
    // Lava joints first, then the hex flags laid over them.
    g.fillStyle(CAL.seam, 0.9); g.fillCircle(cx, cy, 300);
    const S = 38;
    for (let r = -9; r <= 9; r++) {
      for (let q = -12; q <= 12; q++) {
        const x = cx + S * Math.sqrt(3) * (q + r / 2);
        const y = cy + S * 1.5 * r;
        const d = Math.hypot(x - cx, y - cy);
        if (d > 300) continue;
        const shade = ((q * 7 + r * 13) % 5 + 5) % 5;
        g.fillStyle(mixC(CAL.obsidianMid, CAL.obsidianLit, shade / 8 + (d < 90 ? 0.15 : 0)), 1);
        g.fillPoints(hexPts(x, y, S - 3, 0, 1), true, true);
        if (shade === 0) {
          g.lineStyle(1, CAL.glassGleam, 0.25);
          g.lineBetween(x - S * 0.4, y - S * 0.3, x + S * 0.1, y - S * 0.5);
        }
      }
    }
    g.lineStyle(6, CAL.basaltDark, 1); g.strokeCircle(cx, cy, 302);
    g.lineStyle(2, MAGMA, 0.5); g.strokeCircle(cx, cy, 309);
    // Crusted lava between the disc and the walls.
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      const r = 330 + (i % 4) * 30;
      g.fillStyle(i % 3 ? CAL.crust : CAL.crustMid, 0.9);
      g.fillEllipse(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.9, 60, 24);
    }
    // Basalt columns standing at the four corners and along the top wall.
    const cols: [number, number, number, number][] = [
      [40, FIELD_TOP + 70, 26, 70], [86, FIELD_TOP + 40, 22, 54], [W - 40, FIELD_TOP + 70, 26, 74], [W - 88, FIELD_TOP + 44, 22, 50],
      [44, H - 20, 28, 56], [W - 44, H - 22, 28, 60], [W / 2 - 300, FIELD_TOP + 22, 20, 40], [W / 2 + 300, FIELD_TOP + 24, 20, 44],
    ];
    for (const [x, y, r, h] of cols) basaltColumn(g, x, y, r, h, (x % 3) / 6, 0.35);
    // His seal at the centre: a hexagon within a broken ring — the heir's mark under the King's.
    g.lineStyle(3, MAGMA, 0.55);
    g.strokePoints(hexPts(cx, cy, 44, 0, 1), true, true);
    g.lineStyle(2, MAGMA, 0.35);
    g.beginPath(); g.arc(cx, cy, 62, -Math.PI * 0.35, Math.PI * 1.35, false); g.strokePath();
  },

  look: { crest: 'none', pattern: 'cracks', aura: 'smoke', hands: 'gauntlet', torsoR: 38, mouth: 'line', eyes: 2, eyeColor: 0xffa133 },

  /**
   * The crown of basalt columns — five hexagonal pillars of uneven height standing out of his
   * skull, lava glowing in the joints between them. In the second phase the columns run hot
   * and drip; as the Obsidian Heir his whole front is sheathed in black glass plates that
   * split open, seams blazing, while the armour is cracked.
   */
  drawDecor(g, s) {
    const t = s.t;
    const crownY = s.y - s.radius * 0.72;
    const heights = [16, 26, 34, 24, 14];
    const hot = s.phaseIdx >= 1;
    for (let i = 0; i < 5; i++) {
      const ox = (i - 2) * s.radius * 0.3;
      const h = heights[i] * (s.enraged ? 1.15 : 1);
      const x = s.x + ox, y = crownY + Math.abs(i - 2) * 4;
      const seam = hot ? 0.5 + Math.sin(t / 150 + i) * 0.3 : 0.2 + s.castGlow * 0.6;
      basaltColumn(g, x, y, s.radius * 0.16, h, i / 10, seam);
    }
    // Lava between the columns.
    g.fillStyle(MAGMA, 0.35 + s.castGlow * 0.5);
    g.fillEllipse(s.x, crownY + 2, s.radius * 1.4, 7);
    if (hot && !(s.hard && s.phaseIdx >= 2)) {
      // Molten drips running out of his seams and falling off his chin.
      for (let i = 0; i < 3; i++) {
        const ph = ((t / 900) + i / 3) % 1;
        const x = s.x + (i - 1) * s.radius * 0.45;
        g.fillStyle(CAL.lavaLit, 1 - ph);
        g.fillCircle(x, s.y + s.radius * 0.6 + ph * 22, 2.6 * (1 - ph * 0.5));
      }
    }
    if (s.hard && s.phaseIdx >= 2) {
      const cracked = t >= heir.crackedFrom && t < heir.crackedUntil;
      const split = cracked ? 5 : 0;
      const plates: [number, number, number][] = [[-0.45, -0.25, 0], [0.45, -0.25, 1], [-0.5, 0.35, 2], [0.5, 0.35, 3], [0, 0.55, 4]];
      if (cracked) {
        g.fillStyle(CAL.lavaHot, 0.55 + Math.sin(t / 50) * 0.3);
        g.fillCircle(s.x, s.y + 4, s.radius * 0.75);
      }
      for (const [px, py, k] of plates) {
        const x = s.x + px * s.radius + Math.sign(px || 0.0001) * split;
        const y = s.y + py * s.radius + (py > 0 ? split : -split * 0.4);
        const pts = hexPts(x, y, s.radius * 0.36, k * 0.4, 0.8);
        g.fillStyle(0x0a080e, 0.95); g.fillPoints(pts, true, true);
        g.fillStyle(0x4b3a6e, 0.45); g.fillTriangle(pts[0].x, pts[0].y, pts[1].x, pts[1].y, x, y);
        g.lineStyle(1.4, cracked ? CAL.lavaHot : 0xe6dcff, cracked ? 0.95 : 0.6);
        g.strokePoints(pts, true, true);
      }
    }
  },

  phaseStyles: [
    { movement: 'anchor', gimmick: 'none' },
    { movement: 'stalk', gimmick: 'tremor', tint: 'hot', look: { aura: 'flame', pattern: 'drip', mouth: 'grate' } },
    { movement: 'rush', gimmick: 'none', tint: 'void', look: { aura: 'sparks', pattern: 'facets', hands: 'blade', eyeColor: 0xd8c8ff } },
  ],
};
