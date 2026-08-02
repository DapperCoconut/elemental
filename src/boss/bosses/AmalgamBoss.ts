import Phaser from 'phaser';
import { SignatureMove, WorldBossDef } from '../framework/BossDefs';
import { BossToolkit } from '../framework/BossToolkit';
import { getAllWorldBossDefs } from './index';

/**
 * THE AMALGAM — the thing the Voice Beneath made out of the Sovereigns it ate
 * first, waiting at the heart of the Corrupt Realm behind all forty-seven
 * thrones.
 *
 * It has no moveset of its own. That is the entire point of it: every
 * signature move in the game lives on its owner's `WorldBossDef`, and the
 * Amalgam reaches the whole registry through `getAllWorldBossDefs()` and
 * replays them through its own toolkit. Fighting it is being made to answer
 * for the whole campaign at once.
 *
 * Two consequences shape the code:
 *  - The Amalgam is deliberately NOT in the WORLD_BOSSES map, or its own
 *    signatures would end up in its own stolen pool.
 *  - Stolen moves gate themselves on their own state and expect `update` and
 *    the draw hooks every frame for the whole fight, so the pool fans those
 *    out to every move it has ever instantiated. Exactly one signature drives
 *    that fan-out; the others would triple-tick it.
 */

const FLESH = 0x8a1420;
const FLESH_LIT = 0xff6a7a;
const FLESH_DARK = 0x180408;
const SUTURE = 0xd8c8a0;

// ── The stolen pool ──────────────────────────────────────────────────

interface Stolen { id: string; owner: string; ownerColor: number; move: SignatureMove }

interface Pool {
  /** Every stolen move that has been needed at least once. */
  live: Stolen[];
  /** Shuffled draw order over the whole registry, so a run sees variety. */
  order: { worldId: string; name: string; color: number; sigId: string }[];
  next: number;
  /** Who last spoke, for the banner over the body. */
  lastOwner: string;
  lastOwnerAt: number;
  /** Set by whichever signature is elected to fan out update/draw. */
  driver: SignatureMove | null;
}

const POOLS = new WeakMap<BossToolkit, Pool>();

function poolFor(tk: BossToolkit): Pool {
  const existing = POOLS.get(tk);
  if (existing) return existing;
  const order: Pool['order'] = [];
  for (const def of getAllWorldBossDefs()) {
    for (const sigId of Object.keys(def.signatures)) {
      order.push({ worldId: def.worldId, name: def.name, color: def.colorLit, sigId });
    }
  }
  // Shuffled once per fight. A fixed order would make the second phase of
  // every attempt identical, and the whole promise here is "all of them".
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const pool: Pool = { live: [], order, next: 0, lastOwner: '', lastOwnerAt: 0, driver: null };
  POOLS.set(tk, pool);
  return pool;
}

/** Instantiate (once) and return the next stolen move in the draw order. */
function drawStolen(tk: BossToolkit): Stolen | null {
  const pool = poolFor(tk);
  if (pool.order.length === 0) return null;
  const pick = pool.order[pool.next % pool.order.length];
  pool.next++;
  const key = `${pick.worldId}:${pick.sigId}`;
  const already = pool.live.find((s) => s.id === key);
  if (already) return already;
  const def = getAllWorldBossDefs().find((d) => d.worldId === pick.worldId);
  const factory = def?.signatures[pick.sigId];
  if (!factory) return null;
  const stolen: Stolen = { id: key, owner: pick.name, ownerColor: pick.color, move: factory(tk) };
  pool.live.push(stolen);
  return stolen;
}

function castStolen(tk: BossToolkit, time: number): number {
  const stolen = drawStolen(tk);
  if (!stolen) return 900;
  const pool = poolFor(tk);
  pool.lastOwner = stolen.owner;
  pool.lastOwnerAt = time;
  tk.host.showFloatingText(tk.bossX, tk.bossY - 78, stolen.owner.toUpperCase(), '#ff6a7a');
  stolen.move.cast(time);
  return stolen.move.durationMs;
}

// ── Signature: Remember ──────────────────────────────────────────────
// One stolen move, named as it is used. This is the signature elected to
// drive the pool's per-frame fan-out.

const remember = (tk: BossToolkit): SignatureMove => {
  const self: SignatureMove = {
    durationMs: 2400,
    cast(time: number) {
      tk.sfx('ghost-wail');
      self.durationMs = castStolen(tk, time);
    },
    update(time: number, dt: number) {
      const pool = poolFor(tk);
      if (pool.driver === null) pool.driver = self;
      if (pool.driver !== self) return;
      for (const s of pool.live) s.move.update?.(time, dt);
    },
    drawGround(g, time) {
      const pool = poolFor(tk);
      if (pool.driver !== self) return;
      for (const s of pool.live) s.move.drawGround?.(g, time);
    },
    drawAir(g, time) {
      const pool = poolFor(tk);
      if (pool.driver !== self) return;
      for (const s of pool.live) s.move.drawAir?.(g, time);
      // Whoever it is wearing this second, named over the body.
      if (time - pool.lastOwnerAt < 1600 && pool.lastOwner) {
        const fade = 1 - (time - pool.lastOwnerAt) / 1600;
        g.lineStyle(2, FLESH_LIT, fade * 0.5);
        g.strokeCircle(tk.bossX, tk.bossY, 54 + (1 - fade) * 40);
      }
    },
    onPhaseEnd() {
      const pool = poolFor(tk);
      for (const s of pool.live) s.move.onPhaseEnd?.();
      pool.live = [];
      pool.driver = null;
    },
  };
  return self;
};

// ── Signature: The Graft ─────────────────────────────────────────────
// Two Sovereigns at once, stitched into one beat. The parts do not agree with
// each other, which is the only reason this is survivable.

const graft = (tk: BossToolkit): SignatureMove => {
  const self: SignatureMove = {
    durationMs: 3200,
    cast(time: number) {
      tk.sfx('torment');
      const a = castStolen(tk, time);
      let b = 0;
      tk.schedule(420, () => { b = castStolen(tk, tk.now); void b; });
      self.durationMs = Math.max(a, 2600);
    },
    onPhaseEnd() { /* the pool is cleared by `remember`, which owns it */ },
  };
  return self;
};

// ── Signature: The Chorus ────────────────────────────────────────────
// Every Sovereign it ate, at once, around the rim of the hall — silhouettes
// it wears one after another, each firing the way its owner used to.

const chorus = (tk: BossToolkit): SignatureMove => {
  interface Face { x: number; y: number; color: number; name: string; firesAt: number; fired: boolean }
  let faces: Face[] = [];
  return {
    durationMs: 4200,
    cast(time: number) {
      tk.sfx('ghost-wail');
      faces = [];
      const defs = getAllWorldBossDefs();
      const n = 7;
      for (let i = 0; i < n; i++) {
        const def = defs[Math.floor(Math.random() * defs.length)];
        const a = (Math.PI * 2 * i) / n + Math.random() * 0.3;
        faces.push({
          x: tk.clampX(tk.W / 2 + Math.cos(a) * 360, 60),
          y: tk.clampY(tk.H / 2 + Math.sin(a) * 250, 130),
          color: def?.colorLit ?? FLESH_LIT,
          name: def?.name ?? '',
          firesAt: time + 1500 + i * 330,
          fired: false,
        });
      }
    },
    update(time: number) {
      for (const f of faces) {
        if (f.fired || time < f.firesAt) continue;
        f.fired = true;
        tk.sfx('curse-cast');
        const p = tk.player;
        const aim = Math.atan2(p.y - f.y, p.x - f.x);
        for (let i = -2; i <= 2; i++) {
          tk.spawnBullet({
            x: f.x + Math.cos(aim) * 24, y: f.y + Math.sin(aim) * 24,
            angle: aim + i * 0.2, speed: 250, damage: 10, color: f.color,
          });
        }
      }
      faces = faces.filter((f) => time < f.firesAt + 900);
    },
    drawAir(g, time) {
      for (const f of faces) {
        const t = Phaser.Math.Clamp(1 - (f.firesAt - time) / 1500, 0, 1);
        const alpha = f.fired ? 0.25 : 0.2 + t * 0.5;
        // A borrowed silhouette: a hood, two lights, and nothing underneath.
        g.fillStyle(f.color, alpha * 0.35);
        g.fillCircle(f.x, f.y, 34);
        g.fillStyle(FLESH_DARK, alpha);
        g.beginPath();
        g.moveTo(f.x - 20, f.y + 24);
        g.lineTo(f.x - 14, f.y - 14);
        g.lineTo(f.x, f.y - 26);
        g.lineTo(f.x + 14, f.y - 14);
        g.lineTo(f.x + 20, f.y + 24);
        g.closePath();
        g.fillPath();
        g.fillStyle(f.color, alpha + 0.2);
        g.fillCircle(f.x - 6, f.y - 8, 3);
        g.fillCircle(f.x + 6, f.y - 8, 3);
        g.lineStyle(1.5, f.color, alpha);
        g.strokeCircle(f.x, f.y, 30 + Math.sin(time / 200 + f.x) * 2);
      }
    },
    onPhaseEnd() { faces = []; },
  };
};

// ── Signature: The Unmaking ──────────────────────────────────────────
// Its own move, and the only one it did not steal: it takes the hall apart
// into the shapes the Sovereigns were made of, and puts them back wrong.

const unmaking = (tk: BossToolkit): SignatureMove => {
  let active = false;
  let firesAt = 0;
  let safeA = 0;
  const SPOKES = 6;
  return {
    durationMs: 3800,
    cast(time: number) {
      tk.sfx('black-hole');
      active = true;
      firesAt = time + 2900;
      // The hall is cut into six wedges; one of them is left alone, and it is
      // lit for the whole wind-up.
      safeA = tk.angleToPlayer() + Math.PI + (Math.random() - 0.5) * 1.2;
      tk.host.showFloatingText(tk.bossX, tk.bossY - 84, 'UNMAKING', '#ff6a7a');
      tk.schedule(2900, () => {
        active = false;
        tk.sfx('explosion-large');
        tk.scene.cameras.main.shake(520, 0.009);
        tk.scene.cameras.main.flash(300, 180, 20, 40);
        const p = tk.player;
        if (p.active) {
          const a = Math.atan2(p.y - tk.bossY, p.x - tk.bossX);
          const off = Math.abs(Phaser.Math.Angle.Wrap(a - safeA));
          if (off > Math.PI / SPOKES) {
            tk.hitPlayer(48, p.x, p.y);
            tk.slowPlayer(0.55, 1500);
          }
        }
        // And then the pieces come back, from the rim, all at once.
        for (let i = 0; i < 16; i++) {
          const a = (Math.PI * 2 * i) / 16;
          tk.spawnBullet({
            x: tk.bossX + Math.cos(a) * 520, y: tk.bossY + Math.sin(a) * 520,
            angle: a + Math.PI, speed: 230, damage: 12, r: 7, color: FLESH_LIT,
          });
        }
      });
    },
    drawGround(g, time) {
      if (!active) return;
      const t = Phaser.Math.Clamp(1 - (firesAt - time) / 2900, 0, 1);
      const len = Math.hypot(tk.W, tk.H);
      for (let i = 0; i < SPOKES; i++) {
        const a = safeA + (Math.PI * 2 * i) / SPOKES;
        const safe = i === 0;
        g.fillStyle(safe ? 0x2a5a3a : FLESH, safe ? 0.1 + t * 0.08 : 0.08 + t * 0.3);
        g.beginPath();
        g.moveTo(tk.bossX, tk.bossY);
        g.arc(tk.bossX, tk.bossY, len, a - Math.PI / SPOKES, a + Math.PI / SPOKES, false);
        g.closePath();
        g.fillPath();
        g.lineStyle(2, safe ? 0x8affa0 : FLESH_LIT, 0.3 + t * 0.5);
        g.lineBetween(tk.bossX, tk.bossY,
          tk.bossX + Math.cos(a - Math.PI / SPOKES) * len, tk.bossY + Math.sin(a - Math.PI / SPOKES) * len);
      }
      // Suture stitches running along the seams as they are pulled open.
      for (let i = 0; i < SPOKES; i++) {
        const a = safeA + (Math.PI * 2 * i) / SPOKES + Math.PI / SPOKES;
        for (let k = 1; k < 9; k++) {
          const r = k * 70;
          g.lineStyle(2, SUTURE, (0.4 - k * 0.03) * t);
          g.lineBetween(
            tk.bossX + Math.cos(a) * r - Math.sin(a) * 9, tk.bossY + Math.sin(a) * r + Math.cos(a) * 9,
            tk.bossX + Math.cos(a) * r + Math.sin(a) * 9, tk.bossY + Math.sin(a) * r - Math.cos(a) * 9,
          );
        }
      }
    },
    onPhaseEnd() { active = false; },
  };
};

export const AMALGAM_BOSS: WorldBossDef = {
  worldId: 'amalgam',
  name: 'The Amalgam',
  title: 'What the Voice Made of the Ones It Ate First',
  color: FLESH,
  colorLit: FLESH_LIT,
  colorDark: FLESH_DARK,
  accent: SUTURE,
  bodyR: 36,
  damageMult: 0.92,

  intro: [
    'I AM THE COURT. All of it. Every throne you knelt at, I have already been wearing.',
  ],
  banter: [
    'You freed forty-seven of them. I kept the FIRST seventeen, and I kept the best parts.',
    'Do you recognise this one? You should. You beat it. You will beat it again, and again, and again.',
    'There is no move I have that you have not already survived. Survive them ALL, then.',
    'When I have finished, I will wear you too, and the next one up the stairs will find you swinging at them.',
    'The Herald talks about thrones. There is one throne. I am sitting in all of it.',
  ],
  defeatLine: 'IT COMES APART',
  resumeLine: 'Another one steps up. Of course. I have worn that one too.',

  phases: [
    {
      name: 'The Stitching',
      line: 'Let me find a face you will answer to.',
      hp: 620,
      cycle: [
        'sig:remember', 'volley', 'sig:chorus', 'sig:remember',
        'lanes', 'sig:remember', 'radial', 'homing',
      ],
      harass: ['h-flak', 'h-orbs', 'h-snipe'],
      restMs: 1000,
      harassMs: 3000,
      moveSpeed: 54,
      holdDist: 300,
    },
    {
      name: 'The Whole Court',
      line: 'All of them, then. You have met all of them. This should be FAMILIAR.',
      hp: 700,
      cycle: [
        'sig:graft', 'sig:remember', 'sig:chorus', 'sig:remember',
        'barrage', 'sig:graft', 'spiral', 'sig:remember', 'quake',
      ],
      harass: ['h-flak', 'h-orbs', 'h-lane', 'h-rune'],
      restMs: 880,
      harassMs: 2500,
      moveSpeed: 66,
      holdDist: 275,
    },
    {
      name: 'The Voice Beneath',
      line: 'Enough borrowed hands. This part is MINE.',
      hp: 640,
      cycle: [
        'sig:unmaking', 'sig:graft', 'sig:remember', 'sig:chorus',
        'sig:unmaking', 'sig:graft', 'sanctuary', 'sig:remember', 'spiral',
      ],
      harass: ['h-orbs', 'h-rune', 'h-flak', 'h-lane'],
      restMs: 800,
      harassMs: 2300,
      moveSpeed: 76,
      holdDist: 255,
    },
  ],

  hard: {
    hpMult: 1.3,
    introLine: 'IT HAS STOPPED PRETENDING TO BE ANYONE',
    extraPhase: {
      name: 'The Last Door',
      line: 'They are all standing behind you. I can SEE them. Let them watch this.',
      hp: 560,
      cycle: [
        'sig:unmaking', 'sig:graft', 'sig:graft', 'sig:chorus',
        'sig:unmaking', 'sig:remember', 'sanctuary', 'sig:graft',
      ],
      harass: ['h-orbs', 'h-rune', 'h-lane', 'h-mines'],
      restMs: 660,
      harassMs: 2000,
      moveSpeed: 88,
      holdDist: 235,
    },
  },

  signatures: {
    remember,
    graft,
    chorus,
    unmaking,
  },

  drawArena(g, W, H) {
    g.fillStyle(0x0a0206, 0.72);
    g.fillRect(0, 0, W, H);
    // The heart of the scar: forty-seven empty thrones in a ring, all of them
    // facing inward, and a floor that has been stitched back together badly.
    const cx = W / 2;
    const cy = H * 0.56;
    for (let i = 0; i < 17; i++) {
      const a = (Math.PI * 2 * i) / 17 - Math.PI / 2;
      const x = cx + Math.cos(a) * (W * 0.42);
      const y = cy + Math.sin(a) * (H * 0.4);
      g.fillStyle(0x1a0a10, 0.85);
      g.fillRect(x - 9, y - 6, 18, 22);
      g.fillRect(x - 11, y - 22, 22, 18);
      g.fillStyle(FLESH, 0.08);
      g.fillCircle(x, y - 14, 6);
    }
    // Sutures across the floor, holding the realm's own pieces together.
    for (let i = 0; i < 7; i++) {
      const y = 130 + i * ((H - 170) / 6);
      g.lineStyle(2, SUTURE, 0.06);
      g.lineBetween(30, y, W - 30, y);
      for (let k = 0; k < 14; k++) {
        const x = 50 + k * ((W - 100) / 13);
        g.lineStyle(2, SUTURE, 0.1);
        g.lineBetween(x - 7, y - 7, x + 7, y + 7);
      }
    }
    // Something enormous under the floor, breathing.
    for (let i = 0; i < 4; i++) {
      g.lineStyle(3, FLESH, 0.05);
      g.strokeEllipse(cx, cy, 220 + i * 110, 150 + i * 80);
    }
    g.fillStyle(FLESH_DARK, 0.6);
    g.fillEllipse(cx, cy, 190, 130);
  },

  drawBody(g, s) {
    const t = s.t;
    g.fillStyle(0x000000, 0.5);
    g.fillEllipse(s.x, s.y + 54, 132, 22);

    const dirX = Math.cos(s.facing);
    const heave = Math.sin(t / 430) * 4;

    // A mass with too many donors: overlapping lobes, each a different colour
    // borrowed off a Sovereign, held together at the seams.
    const lobes: [number, number, number, number][] = [
      [-34, 2, 34, 0xc4392c], [30, -6, 30, 0x4a4468], [2, 26, 32, 0x46b93f],
      [-14, -28, 26, 0xd8a531], [22, 24, 24, 0x0e8f9c], [-30, 30, 22, 0x9b4dff],
    ];
    for (let i = 0; i < lobes.length; i++) {
      const [ox, oy, r, col] = lobes[i];
      const pulse = Math.sin(t / (380 + i * 60) + i) * 3;
      g.fillStyle(FLESH_DARK, 1);
      g.fillCircle(s.x + ox, s.y + oy + heave * 0.4, r + 4 + pulse);
      g.fillStyle(col, 0.55);
      g.fillCircle(s.x + ox, s.y + oy + heave * 0.4, r + pulse);
      g.fillStyle(FLESH, 0.4);
      g.fillCircle(s.x + ox, s.y + oy + heave * 0.4, r * 0.6 + pulse);
    }
    // The sutures. Every seam between two donors, stitched by something that
    // had no idea what it was making.
    for (let i = 0; i < lobes.length; i++) {
      const [ox, oy] = lobes[i];
      const [px, py] = lobes[(i + 1) % lobes.length];
      const mx = s.x + (ox + px) / 2;
      const my = s.y + (oy + py) / 2 + heave * 0.4;
      const a = Math.atan2(py - oy, px - ox);
      g.lineStyle(2, SUTURE, 0.75);
      for (let k = -3; k <= 3; k++) {
        const sx = mx + Math.cos(a) * k * 9;
        const sy = my + Math.sin(a) * k * 9;
        g.lineBetween(sx - Math.sin(a) * 7, sy + Math.cos(a) * 7, sx + Math.sin(a) * 7, sy - Math.cos(a) * 7);
      }
    }

    // Arms it did not grow: a chain, a blade, a hand, a stalk of coral. They
    // move on separate clocks because they are separate arguments.
    const limbs: [number, number, number][] = [[-1, 18, 0], [1, 26, 1], [-1, -14, 2], [1, -6, 3]];
    for (const [side, oy, kind] of limbs) {
      const sway = Math.sin(t / (380 + kind * 90) + kind) * 9;
      const ax = s.x + side * (56 + Math.abs(sway) * 0.4);
      const ay = s.y + oy + sway * 0.5;
      if (kind === 0) {
        for (let i = 1; i <= 4; i++) {
          g.lineStyle(3, i % 2 ? 0xe0b743 : 0x8a5a2a, 0.9);
          g.strokeEllipse(ax + side * i * 11, ay + i * 4, 11, 7);
        }
      } else if (kind === 1) {
        g.fillStyle(0xb8b2a4, 1);
        g.fillTriangle(ax, ay - 8, ax + side * 42, ay - 2, ax, ay + 8);
        g.lineStyle(1.5, FLESH_LIT, 0.6);
        g.lineBetween(ax, ay - 4, ax + side * 38, ay - 1);
      } else if (kind === 2) {
        g.fillStyle(0xd8b898, 1);
        g.fillCircle(ax + side * 22, ay, 11);
        for (let f = 0; f < 4; f++) {
          g.lineStyle(4, 0xd8b898, 1);
          g.lineBetween(ax + side * 26, ay - 6 + f * 4, ax + side * 40, ay - 10 + f * 6 + sway * 0.3);
        }
      } else {
        g.fillStyle(0xff8ac4, 0.9);
        for (let i = 0; i < 5; i++) {
          g.fillCircle(ax + side * i * 9, ay - i * 5 + Math.sin(t / 300 + i) * 3, 8 - i);
        }
      }
    }

    // Faces. Not one — several, surfacing and sinking, each briefly recognisable
    // as somebody you have already put down.
    const donors = [0xffb347, 0x7ce8f0, 0xb9a9e8, 0xffd27a, 0xd8b0ff, 0xb8ff9a, 0xffe08a];
    for (let i = 0; i < 4; i++) {
      const ph = ((t + i * 1700) % 6800) / 6800;
      const surface = Math.sin(ph * Math.PI);
      if (surface < 0.15) continue;
      const a = i * 1.7 + t / 2600;
      const fx = s.x + Math.cos(a) * 26 + dirX * 4;
      const fy = s.y + Math.sin(a) * 22 - 6;
      const col = donors[(i + Math.floor(t / 6800)) % donors.length];
      g.fillStyle(col, surface * 0.5);
      g.fillEllipse(fx, fy, 26 * surface, 30 * surface);
      g.fillStyle(FLESH_DARK, surface * 0.9);
      g.fillCircle(fx - 6 * surface, fy - 3, 3 * surface);
      g.fillCircle(fx + 6 * surface, fy - 3, 3 * surface);
      g.lineStyle(2, FLESH_DARK, surface * 0.7);
      g.lineBetween(fx - 6 * surface, fy + 9 * surface, fx + 6 * surface, fy + 9 * surface);
    }

    // The Voice's own eye, dead centre, which never sinks and never blinks.
    const ey = s.y - 4;
    g.fillStyle(FLESH_DARK, 1);
    g.fillCircle(s.x + dirX * 3, ey, 20 + s.castGlow * 4);
    g.fillStyle(s.hurt ? 0xffffff : FLESH_LIT, 0.9);
    g.fillCircle(s.x + dirX * 5, ey, 12 + s.castGlow * 4);
    g.fillStyle(0x000000, 1);
    g.fillEllipse(s.x + dirX * 6, ey, 6, 15);
    g.lineStyle(2, SUTURE, 0.5);
    g.strokeCircle(s.x + dirX * 3, ey, 22 + s.castGlow * 4);
    // Mouths along the underside, all of them mid-sentence.
    for (let i = 0; i < 5; i++) {
      const mx = s.x - 40 + i * 20;
      const open = Math.abs(Math.sin(t / (200 + i * 70) + i)) * 6;
      g.fillStyle(0x000000, 0.85);
      g.fillEllipse(mx, s.y + 46 + heave * 0.4, 13, 4 + open);
      g.fillStyle(SUTURE, 0.6);
      for (let k = 0; k < 3; k++) g.fillCircle(mx - 4 + k * 4, s.y + 44 + heave * 0.4, 1.2);
    }

    if (s.enraged) {
      // The last phase: the seams are giving, and the light behind them is not
      // the colour of anything that was stitched in.
      for (let i = 0; i < 5; i++) {
        const a = t / 900 + (Math.PI * 2 * i) / 5;
        g.lineStyle(3, 0xff2a4a, 0.25 + Math.sin(t / 130 + i) * 0.15);
        g.lineBetween(s.x, s.y, s.x + Math.cos(a) * 74, s.y + Math.sin(a) * 74);
      }
    }
    if (s.hurt) {
      g.fillStyle(0xffffff, 0.2);
      g.fillCircle(s.x, s.y, 74);
    }
  },
};
