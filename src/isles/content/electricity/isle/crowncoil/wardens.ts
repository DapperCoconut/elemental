import type { EncounterDef, EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../IslesTypes';
import type { Fighter } from '../../../../../entities/Fighter';
import { dim, glow } from '../../../../art/IsleArt';
import {
  AMBER, ARC, ARC_CORE, BRASS, BRASS_DARK, COPPER, COPPER_DARK, IRON, IRON_DARK, IRON_LIT, VIOLET, WARN_RED,
  bolt, crackle, faradayCage, leydenJar, meterDial, treadwheel,
} from './art';

/**
 * The Crown Coil's three wardens — one at the head of each hall of the Empress's tower.
 *
 * Each fight is the hall it guards. The Overseer keeps the Draw: crank your quota before the
 * Bell or be switched off. The Capacitrix keeps the jars, and a jar full of storm goes to
 * whoever stands nearest. The Turnkey keeps the cages, and when the storm comes in, a cage is
 * the only safe place — and holds one. Every rule cuts both ways.
 */

type Who = 'player' | 'npc';
const WHO: Who[] = ['player', 'npc'];
const alive = (f: Fighter): boolean => f.active && f.hp > 0;
const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(ax - bx, ay - by);
const clampN = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
const stepOf = (dt: number): number => clampN(dt, 0, 0.05);

// ── Warden 1: The Quota ──────────────────────────────────────────────

/**
 * Two treadwheels stand on the gallery floor. Stand in one and you crank your Draw — the wheel
 * rolls you back toward its mouth, so you have to keep walking into it. Every 10s the Brownout
 * Bell rings: anyone who has cranked less than the quota (3s) since the last Bell is *switched
 * off* — 12 damage, stunned 1.1s, and +35% damage taken for 3s. Taking a hit while in a wheel
 * knocks you off your rhythm (−0.6s of Draw). The Overseer cranks too; knock him off his.
 */
const theQuota = (ctx: GimmickCtx): EncounterGimmick => {
  const top = ctx.top;
  const BELL_MS = ctx.hard ? 8500 : 10000;
  const QUOTA = ctx.hard ? 3.4 : 3;
  const KNOCK = 0.6;
  const OFF_MS = 3000;
  const ROLL = 80;
  const midY = (top + ctx.H) / 2 + 20;
  const WHEELS: Pt[] = [{ x: ctx.W * 0.27, y: midY }, { x: ctx.W * 0.73, y: midY }];
  const WR = 58; // wheel half-width on the floor
  const WD = 34; // wheel half-depth on the floor
  const fighter = (w: Who): Fighter => (w === 'player' ? ctx.player : ctx.npc);
  const draw: Record<Who, number> = { player: 0, npc: 0 };
  const offUntil: Record<Who, number> = { player: 0, npc: 0 };
  const inWheel: Record<Who, number> = { player: -1, npc: -1 };
  const knockAt: Record<Who, number> = { player: 0, npc: 0 };
  let bellAt = 0;
  let rungAt = -9999;
  const spin = [0, 0];
  let ticked = false;

  const wheelOf = (f: Fighter): number => WHEELS.findIndex((w) => Math.abs(f.x - w.x) <= WR && Math.abs(f.y - w.y) <= WD);

  const ring = (time: number) => {
    rungAt = time;
    ctx.sfx('clang');
    ctx.banner('THE BROWNOUT BELL', '#ffc85a');
    for (const w of WHO) {
      const f = fighter(w);
      if (!alive(f)) continue;
      if (draw[w] < QUOTA) {
        ctx.hit(f, 12, f.x, f.y);
        ctx.stun(f, 1100);
        offUntil[w] = time + OFF_MS;
        ctx.float(f.x, f.y - 52, 'SWITCHED OFF', '#8a96b0');
        ctx.flash(f.x, f.y, 0x2a3040);
      } else {
        ctx.float(f.x, f.y - 52, 'QUOTA MET', '#ffd27a');
      }
      draw[w] = 0;
    }
    ctx.sfx('status-shock');
  };

  const knock = (w: Who) => {
    if (inWheel[w] < 0) return;
    draw[w] = Math.max(0, draw[w] - KNOCK);
    const now = ctx.scene.time.now;
    if (now - knockAt[w] > 500) {
      const f = fighter(w);
      ctx.float(f.x, f.y - 40, 'OFF THE BEAT', '#ffb070');
      knockAt[w] = now;
    }
  };

  return {
    update(time, dtRaw) {
      const dt = stepOf(dtRaw);
      if (bellAt === 0) bellAt = time + BELL_MS;
      for (const w of WHO) {
        const f = fighter(w);
        const i = alive(f) ? wheelOf(f) : -1;
        inWheel[w] = i;
        if (i < 0) continue;
        draw[w] = Math.min(QUOTA + 2, draw[w] + dt);
        spin[i] += dt * 5;
        // The wheel rolls you back toward its mouth (south): keep walking into it.
        ctx.nudge(f, 0, ROLL * dt);
      }
      if (time >= bellAt) { ring(time); bellAt = time + BELL_MS; ticked = false; }
      if (!ticked && bellAt - time < 2000) { ticked = true; ctx.sfx('countdown-tick'); }
    },
    onPlayerHurt() { knock('player'); },
    onNpcHurt() { knock('npc'); },
    playerTakenMult() { return ctx.scene.time.now < offUntil.player ? 1.35 : 1; },
    npcTakenMult() { return ctx.scene.time.now < offUntil.npc ? 1.35 : 1; },
    npcSeek() {
      const n = ctx.npc;
      const left = (bellAt - ctx.scene.time.now) / 1000;
      const need = QUOTA - draw.npc;
      if (need <= 0) return null;
      // He goes to crank when the Bell is close enough that it matters, to the wheel you are not in.
      if (left > need + 4.5 && !ctx.hard) return null;
      let best = 0, bd = Infinity;
      WHEELS.forEach((w, i) => {
        const d = dist(n.x, n.y, w.x, w.y) + (inWheel.player === i ? 400 : 0);
        if (d < bd) { bd = d; best = i; }
      });
      // Aim a little north of the wheel's centre, so the roll keeps him inside.
      return { x: WHEELS[best].x, y: WHEELS[best].y - 10 };
    },
    drawGround(g, time) {
      WHEELS.forEach((w, i) => {
        const busy = inWheel.player === i || inWheel.npc === i;
        // The tread on the floor: a sunken trough of slats sliding south.
        g.fillStyle(IRON_DARK, 1); g.fillRoundedRect(w.x - WR - 6, w.y - WD - 6, (WR + 6) * 2, (WD + 6) * 2, 8);
        g.fillStyle(IRON, 1); g.fillRect(w.x - WR, w.y - WD, WR * 2, WD * 2);
        const off = (spin[i] * 14) % 12;
        g.lineStyle(2, busy ? AMBER : IRON_LIT, busy ? 0.7 : 0.5);
        for (let y = w.y - WD + off; y < w.y + WD; y += 12) g.lineBetween(w.x - WR + 2, y, w.x + WR - 2, y);
        g.lineStyle(2, COPPER, 1); g.strokeRect(w.x - WR, w.y - WD, WR * 2, WD * 2);
        // A chevron at the mouth: in from the south, walk north.
        g.fillStyle(AMBER, 0.6); g.fillTriangle(w.x - 12, w.y + WD + 18, w.x + 12, w.y + WD + 18, w.x, w.y + WD + 6);
        // The wheel stands over the trough; whoever cranks it is inside its rim.
        treadwheel(g, w.x, w.y + WD, 52, spin[i], 0, time / 1000, false);
        // The dynamo's lamp: lit while someone is cranking.
        if (busy) glow(g, w.x + 52 * 0.55 + 13, w.y + WD - 26, 22, AMBER, 0.08, 3);
      });
    },
    drawAir(g, time) {
      const now = ctx.scene.time.now;
      // The Bell over the hall: it swings harder as the Draw comes due.
      const k = clampN(1 - (bellAt - time) / BELL_MS, 0, 1);
      const bx = ctx.W / 2, by = top + 26;
      const sw = Math.sin(time / (420 - k * 260)) * (0.08 + k * 0.4) + (time - rungAt < 600 ? Math.sin((time - rungAt) / 40) * 0.6 : 0);
      g.lineStyle(3, IRON_LIT, 1); g.lineBetween(bx, top, bx + Math.sin(sw) * 20, by);
      g.fillStyle(BRASS_DARK, 1); g.fillTriangle(bx + Math.sin(sw) * 26 - 22, by + 30, bx + Math.sin(sw) * 26 + 22, by + 30, bx + Math.sin(sw) * 20, by);
      g.fillStyle(BRASS, 1); g.fillTriangle(bx + Math.sin(sw) * 26 - 18, by + 28, bx + Math.sin(sw) * 26 + 18, by + 28, bx + Math.sin(sw) * 20, by + 3);
      g.fillStyle(BRASS_DARK, 1); g.fillCircle(bx + Math.sin(sw) * 30, by + 32, 5);
      if (time - rungAt < 700) {
        const r = (time - rungAt) / 700;
        g.lineStyle(3, AMBER, 1 - r); g.strokeCircle(bx, by + 18, 30 + r * 220);
      }
      for (const w of WHO) {
        const f = fighter(w);
        if (!alive(f)) continue;
        if (now < offUntil[w]) {
          // A dead bulb over the switched-off: grey glass, a broken filament.
          g.fillStyle(0x3a3e48, 0.9); g.fillCircle(f.x, f.y - 58, 9);
          g.fillStyle(0x2a2a2a, 1); g.fillRect(f.x - 5, f.y - 50, 10, 6);
          g.lineStyle(1.5, 0x8a8a90, 1); g.lineBetween(f.x - 4, f.y - 58, f.x, f.y - 62); g.lineBetween(f.x + 1, f.y - 60, f.x + 4, f.y - 56);
        } else if (inWheel[w] >= 0) {
          // Sparks off the dynamo brush while cranking.
          crackle(g, f.x + 18, f.y - 30, 10, Math.floor(time / 60) + (w === 'npc' ? 7 : 0), AMBER, 0.8, 3);
        }
      }
    },
    drawHud(g) {
      const cy = top + 24;
      const meters: [Who, number][] = [['player', ctx.W / 2 - 150], ['npc', ctx.W / 2 + 150]];
      for (const [w, x] of meters) {
        const k = clampN(draw[w] / QUOTA, 0, 1);
        g.fillStyle(0x0a0c12, 0.85); g.fillRoundedRect(x - 70, cy - 14, 140, 28, 8);
        g.lineStyle(2, w === 'player' ? ARC : WARN_RED, 0.9); g.strokeRoundedRect(x - 70, cy - 14, 140, 28, 8);
        meterDial(g, x - 52, cy, 11, k * 0.8 + (k >= 1 ? 0.15 : 0));
        g.fillStyle(0x1a1e28, 1); g.fillRect(x - 34, cy - 5, 96, 10);
        g.fillStyle(k >= 1 ? AMBER : dim(AMBER, 0.4), 1); g.fillRect(x - 34, cy - 5, 96 * k, 10);
        g.lineStyle(2, 0xffffff, 0.8); g.lineBetween(x + 62, cy - 8, x + 62, cy + 8);
      }
      const left = clampN((bellAt - ctx.scene.time.now) / BELL_MS, 0, 1);
      g.fillStyle(0x0a0c12, 0.85); g.fillCircle(ctx.W / 2, cy, 16);
      g.lineStyle(4, left < 0.2 ? WARN_RED : BRASS, 1);
      g.beginPath(); g.arc(ctx.W / 2, cy, 12, -Math.PI / 2, -Math.PI / 2 + left * Math.PI * 2, false); g.strokePath();
    },
  };
};

// ── Warden 2: The Leyden Jars ────────────────────────────────────────

/**
 * Four Leyden jars stand at the corners, filling with storm in turn. A full jar is PRIMED for
 * 1.2s — a dotted line shows who it is choosing, the nearest fighter — then discharges into them:
 * 16 damage and a 0.35s stun. If the other fighter stands within 170px of the one struck, the
 * arc jumps on to them for 10. Keep the Capacitrix between you and a full jar.
 */
const leydenJars = (ctx: GimmickCtx): EncounterGimmick => {
  const top = ctx.top;
  const FILL_S = ctx.hard ? 6 : 7.5;
  const PRIME_MS = ctx.hard ? 1000 : 1200;
  const DMG = 16;
  const CHAIN = 170;
  const CHAIN_DMG = 10;
  const REACH = 620;
  interface Jar { x: number; y: number; charge: number; primeAt: number; firedAt: number; to: Pt; target: Who | null }
  const pad = 96;
  const jars: Jar[] = [
    { x: pad, y: top + 140 }, { x: ctx.W - pad, y: top + 140 }, { x: pad, y: ctx.H - 60 }, { x: ctx.W - pad, y: ctx.H - 60 },
  ].map((p, i) => ({ ...p, charge: i * 0.25, primeAt: 0, firedAt: -9999, to: { x: 0, y: 0 }, target: null }));
  const fighter = (w: Who): Fighter => (w === 'player' ? ctx.player : ctx.npc);
  /** The ball on top of a jar — where the arc leaves from. */
  const ball = (j: Jar): Pt => ({ x: j.x, y: j.y - 109 });

  const nearest = (j: Jar): Who | null => {
    let best: Who | null = null, bd = REACH;
    for (const w of WHO) {
      const f = fighter(w);
      if (!alive(f)) continue;
      const d = dist(f.x, f.y, j.x, j.y);
      if (d < bd) { bd = d; best = w; }
    }
    return best;
  };

  const discharge = (j: Jar, time: number) => {
    j.charge = 0;
    j.primeAt = 0;
    j.firedAt = time;
    const w = nearest(j);
    j.target = w;
    if (!w) { j.to = { x: j.x, y: j.y + 20 }; return; }
    const f = fighter(w);
    j.to = { x: f.x, y: f.y };
    ctx.hit(f, DMG, f.x, f.y);
    ctx.stun(f, 350);
    ctx.float(f.x, f.y - 50, 'DISCHARGED', '#bfe8ff');
    ctx.sfx('thunder');
    const o = fighter(w === 'player' ? 'npc' : 'player');
    if (alive(o) && dist(o.x, o.y, f.x, f.y) <= CHAIN) {
      ctx.hit(o, CHAIN_DMG, o.x, o.y);
      ctx.float(o.x, o.y - 44, 'CHAINED', '#bfe8ff');
      ctx.flash(o.x, o.y, ARC);
    }
  };

  return {
    update(time, dtRaw) {
      const dt = stepOf(dtRaw);
      for (const j of jars) {
        if (j.primeAt > 0) {
          if (time >= j.primeAt) discharge(j, time);
          continue;
        }
        j.charge = Math.min(1, j.charge + dt / FILL_S);
        if (j.charge >= 1) {
          j.primeAt = time + ctx.tk.warn(PRIME_MS);
          ctx.sfx('electric-charge');
          ctx.float(j.x, j.y - 140, 'PRIMED', '#ffe08a');
        }
      }
    },
    npcSeek() {
      // She stands where the next jar to fire would rather have you: farther from it than you are.
      const primed = jars.filter((j) => j.primeAt > 0).sort((a, b) => a.primeAt - b.primeAt)[0];
      const soon = primed ?? jars.reduce((a, b) => (b.charge > a.charge ? b : a));
      if (!primed && soon.charge < 0.75) return null;
      const p = ctx.player;
      const dp = dist(p.x, p.y, soon.x, soon.y);
      const ax = p.x - soon.x, ay = p.y - soon.y;
      const l = Math.hypot(ax, ay) || 1;
      // A point on the far side of you from the jar, outside the chain's reach.
      const want = dp + CHAIN + 30;
      return { x: clampN(soon.x + (ax / l) * want, 60, ctx.W - 60), y: clampN(soon.y + (ay / l) * want, top + 40, ctx.H - 40) };
    },
    drawGround(g) {
      for (const j of jars) {
        // Earthing chain from each jar's foot, and the copper plate it stands on.
        g.fillStyle(COPPER_DARK, 0.8); g.fillEllipse(j.x, j.y + 4, 120, 36);
        g.lineStyle(2, COPPER, 0.6); g.strokeEllipse(j.x, j.y + 4, 120, 36);
        // Its reach on the floor, brightening as it fills.
        g.lineStyle(1.5, ARC, 0.06 + j.charge * 0.18); g.strokeCircle(j.x, j.y, 120 + j.charge * 60);
      }
    },
    drawAir(g, time) {
      const t = time / 1000;
      for (const j of jars) {
        const primed = j.primeAt > 0;
        const k = primed ? 1 : j.charge;
        leydenJar(g, j.x, j.y, 0.62, k, t);
        if (primed) {
          // The choice: a dotted line to whoever is nearest, re-chosen every frame until it fires.
          const w = nearest(j);
          const b = ball(j);
          if (w) {
            const f = fighter(w);
            const n = Math.floor(dist(b.x, b.y, f.x, f.y) / 18);
            const flick = Math.floor(time / 90) % 2 === 0;
            for (let i = 1; i < n; i++) {
              const fr = i / n;
              g.fillStyle(w === 'player' ? 0xffe08a : WARN_RED, flick ? 0.9 : 0.5);
              g.fillCircle(b.x + (f.x - b.x) * fr, b.y + (f.y - b.y) * fr, 2.5);
            }
            g.lineStyle(2, w === 'player' ? 0xffe08a : WARN_RED, 0.8); g.strokeCircle(f.x, f.y, 26 + Math.sin(time / 60) * 3);
          }
          glow(g, b.x, b.y, 40, ARC, 0.08, 3);
        }
        if (time - j.firedAt < 260) {
          const a = 1 - (time - j.firedAt) / 260;
          const b = ball(j);
          bolt(g, b.x, b.y, j.to.x, j.to.y, Math.floor(time / 30) + j.x, ARC, 4, a, 0.2, 3);
          // The chain jump, if it went on.
          const o = j.target ? fighter(j.target === 'player' ? 'npc' : 'player') : null;
          if (o && alive(o) && dist(o.x, o.y, j.to.x, j.to.y) <= CHAIN) bolt(g, j.to.x, j.to.y, o.x, o.y, Math.floor(time / 30) + 3, ARC, 2.5, a, 0.25, 1);
          glow(g, j.to.x, j.to.y, 60, ARC_CORE, 0.1 * a, 3);
        }
      }
    },
    drawHud(g) {
      // Four little jar gauges along the top, in the order they stand.
      const cy = top + 20;
      jars.forEach((j, i) => {
        const x = ctx.W / 2 - 96 + i * 64;
        g.fillStyle(0x0a0c12, 0.85); g.fillRoundedRect(x - 14, cy - 14, 28, 28, 6);
        g.fillStyle(j.primeAt > 0 ? 0xffe08a : ARC, 0.85); g.fillRect(x - 8, cy + 10 - 20 * j.charge, 16, 20 * j.charge);
        g.lineStyle(2, j.primeAt > 0 ? 0xffe08a : 0x6a8aa8, 1); g.strokeRoundedRect(x - 10, cy - 12, 20, 24, 5);
      });
    },
  };
};

// ── Warden 3: The Storm Comes In ─────────────────────────────────────

/**
 * Every 9s the Turnkey lets the storm in. First a Faraday cage is lowered somewhere on the floor
 * (its shadow grows for 2.2s), then for 5s the sky strikes — a strike every 0.55s at whoever is
 * outside a cage (0.7s telegraph, 13 damage). Inside a cage the current goes round you. A cage
 * holds one: the first in locks it, and anyone else touching the bars is bitten (8, thrown off).
 */
const stormComesIn = (ctx: GimmickCtx): EncounterGimmick => {
  const top = ctx.top;
  const CYCLE = ctx.hard ? 8000 : 9000;
  const DROP_MS = ctx.hard ? 1800 : 2200;
  const STORM_MS = 5000;
  const STRIKE_EVERY = ctx.hard ? 480 : 550;
  const STRIKE_WARN = 700;
  const STRIKE_R = 52;
  const STRIKE_DMG = 13;
  const CW = 64; // cage half-width
  const CH = 50; // cage half-depth
  const BITE = 8;
  const fighter = (w: Who): Fighter => (w === 'player' ? ctx.player : ctx.npc);

  let state: 'calm' | 'drop' | 'storm' = 'calm';
  let at = 0;
  let cage: Pt = { x: ctx.W / 2, y: (top + ctx.H) / 2 };
  let holder: Who | null = null;
  let lastStrike = 0;
  let turn: Who = 'player';
  let biteAt: Record<Who, number> = { player: 0, npc: 0 };
  interface Strike { x: number; y: number; at: number; done: boolean }
  let strikes: Strike[] = [];

  const inCage = (f: Fighter): boolean => Math.abs(f.x - cage.x) <= CW && Math.abs(f.y - cage.y) <= CH;
  const nearBars = (f: Fighter): boolean => Math.abs(f.x - cage.x) <= CW + 22 && Math.abs(f.y - cage.y) <= CH + 22;

  const placeCage = () => {
    // Somewhere about as far from you as from the Turnkey, so it is a race.
    let best: Pt = cage, score = Infinity;
    for (let i = 0; i < 10; i++) {
      const p = { x: 140 + ctx.rng() * (ctx.W - 280), y: top + 110 + ctx.rng() * (ctx.H - top - 200) };
      const dp = dist(p.x, p.y, ctx.player.x, ctx.player.y), dn = dist(p.x, p.y, ctx.npc.x, ctx.npc.y);
      const s = Math.abs(dp - dn) + (dp < 160 ? 300 : 0) + (dn < 160 ? 300 : 0);
      if (s < score) { score = s; best = p; }
    }
    cage = best;
  };

  return {
    update(time) {
      if (at === 0) at = time + 3000;
      if (state === 'calm' && time >= at) {
        placeCage();
        holder = null;
        state = 'drop';
        at = time + ctx.tk.warn(DROP_MS);
        ctx.banner('THE STORM COMES IN — GET IN THE CAGE', '#c8b0ff');
        ctx.sfx('chain');
        return;
      }
      if (state === 'drop' && time >= at) {
        state = 'storm';
        at = time + STORM_MS;
        lastStrike = time;
        ctx.sfx('clang');
        ctx.flash(cage.x, cage.y, VIOLET);
      }
      if (state === 'storm' || state === 'drop') {
        // Lock and bars.
        for (const w of WHO) {
          const f = fighter(w);
          if (!alive(f) || state !== 'storm') continue;
          const inside = inCage(f);
          if (holder === null && inside) {
            holder = w;
            ctx.float(cage.x, cage.y - CH - 50, w === 'player' ? 'LOCKED IN' : 'THE TURNKEY HAS IT', '#c8b0ff');
            ctx.sfx('trap-snap');
          } else if (holder === w && !inside) {
            holder = null;
          } else if (holder !== null && holder !== w && nearBars(f) && time - biteAt[w] > 700) {
            biteAt[w] = time;
            ctx.hit(f, BITE, f.x, f.y);
            const dx = f.x - cage.x, dy = f.y - cage.y;
            const l = Math.hypot(dx, dy) || 1;
            ctx.nudge(f, (dx / l) * 70, (dy / l) * 70);
            ctx.float(f.x, f.y - 44, 'THE BARS BITE', '#c8b0ff');
          }
        }
      }
      if (state === 'storm') {
        if (time - lastStrike >= STRIKE_EVERY) {
          lastStrike = time;
          // Strikes come down by turns on whoever is outside the cage, a little off where they stand.
          turn = turn === 'player' ? 'npc' : 'player';
          let w: Who = turn;
          if (holder === w || !alive(fighter(w))) w = w === 'player' ? 'npc' : 'player';
          const f = fighter(w);
          if (holder !== w && alive(f)) {
            const a = ctx.rng() * Math.PI * 2, r = ctx.rng() * 50;
            strikes.push({ x: clampN(f.x + Math.cos(a) * r, 40, ctx.W - 40), y: clampN(f.y + Math.sin(a) * r, top + 30, ctx.H - 30), at: time + ctx.tk.warn(STRIKE_WARN), done: false });
          }
        }
        if (time >= at) { state = 'calm'; at = time + CYCLE - STORM_MS - DROP_MS; holder = null; ctx.sfx('chain'); }
      }
      for (const s of strikes) {
        if (s.done || time < s.at) continue;
        s.done = true;
        ctx.sfx('zap');
        for (const w of WHO) {
          const f = fighter(w);
          if (!alive(f) || (holder === w && inCage(f))) continue;
          if (dist(f.x, f.y, s.x, s.y) <= STRIKE_R + 16) {
            ctx.hit(f, STRIKE_DMG, f.x, f.y);
            ctx.float(f.x, f.y - 46, 'STRUCK', '#e8f4ff');
          }
        }
      }
      strikes = strikes.filter((s) => time < s.at + 400);
    },
    npcSeek() {
      if (state === 'calm') return null;
      // He goes for the cage — unless you have it, in which case he waits off the bars' reach.
      if (holder === 'player') {
        const n = ctx.npc;
        const dx = n.x - cage.x, dy = n.y - cage.y;
        const l = Math.hypot(dx, dy) || 1;
        return { x: clampN(cage.x + (dx / l) * 180, 60, ctx.W - 60), y: clampN(cage.y + (dy / l) * 180, top + 40, ctx.H - 40) };
      }
      return { x: cage.x, y: cage.y };
    },
    drawGround(g, time) {
      // Strike telegraphs: a ring closing on the spot, a cross of static.
      for (const s of strikes) {
        if (s.done) continue;
        const k = clampN(1 - (s.at - time) / ctx.tk.warn(STRIKE_WARN), 0, 1);
        g.fillStyle(0xc8d8ff, 0.08 + k * 0.18); g.fillCircle(s.x, s.y, STRIKE_R);
        g.lineStyle(2, 0xe8f0ff, 0.5 + k * 0.4); g.strokeCircle(s.x, s.y, STRIKE_R * (1.6 - k * 0.6));
        g.lineStyle(1.5, ARC, 0.6); g.lineBetween(s.x - 10, s.y, s.x + 10, s.y); g.lineBetween(s.x, s.y - 10, s.x, s.y + 10);
      }
      if (state === 'calm') return;
      // The cage's footprint, growing dark and sharp as it is lowered.
      const k = state === 'drop' ? clampN(1 - (at - time) / ctx.tk.warn(DROP_MS), 0, 1) : 1;
      g.fillStyle(0x000000, 0.15 + k * 0.25); g.fillRect(cage.x - CW * (0.6 + k * 0.4), cage.y - CH * (0.6 + k * 0.4), CW * 2 * (0.6 + k * 0.4), CH * 2 * (0.6 + k * 0.4));
      g.lineStyle(2, VIOLET, 0.3 + k * 0.5); g.strokeRect(cage.x - CW, cage.y - CH, CW * 2, CH * 2);
    },
    drawAir(g, time) {
      const t = time / 1000;
      // The storm darkens the hall while it is in.
      if (state === 'storm') { g.fillStyle(0x060812, 0.25); g.fillRect(0, top, ctx.W, ctx.H - top); }
      if (state !== 'calm') {
        const lift = state === 'drop' ? clampN((at - time) / ctx.tk.warn(DROP_MS), 0, 1) : 0;
        faradayCage(g, cage.x, cage.y + CH, CW * 2, CH * 2, lift, state === 'storm' && holder !== null ? 1 : 0.25, t, 3);
        if (holder) {
          const f = fighter(holder);
          g.lineStyle(2, holder === 'player' ? ARC : WARN_RED, 0.8); g.strokeCircle(f.x, f.y - 10, 30);
        }
      }
      for (const s of strikes) {
        if (!s.done || time - s.at > 300) continue;
        const a = 1 - (time - s.at) / 300;
        bolt(g, s.x + Math.sin(s.at) * 60, top - 10, s.x, s.y, Math.floor(s.at), ARC, 4, a, 0.22, 3);
        glow(g, s.x, s.y, 70, ARC_CORE, 0.12 * a, 3);
        g.lineStyle(3, 0xffffff, a); g.strokeCircle(s.x, s.y, STRIKE_R * (1 - a * 0.5));
      }
    },
    drawHud(g, time) {
      if (state === 'calm') return;
      const cx = ctx.W / 2, cy = top + 20;
      const k = state === 'drop' ? clampN((at - time) / ctx.tk.warn(DROP_MS), 0, 1) : clampN((at - time) / STORM_MS, 0, 1);
      g.fillStyle(0x0a0812, 0.88); g.fillRoundedRect(cx - 120, cy - 12, 240, 24, 8);
      g.lineStyle(2, VIOLET, 1); g.strokeRoundedRect(cx - 120, cy - 12, 240, 24, 8);
      g.fillStyle(state === 'drop' ? 0xc8b0ff : ARC, 1); g.fillRoundedRect(cx - 112, cy - 5, 224 * k, 10, 4);
    },
    destroy() { strikes = []; biteAt = { player: 0, npc: 0 }; },
  };
};

// ── Defs ─────────────────────────────────────────────────────────────

export const CROWNCOIL_GIMMICKS: GimmickDef[] = [
  {
    id: 'crowncoil-quota',
    rules: 'Crank a treadwheel 3s before each Brownout Bell or be switched off (stun, +35% taken). Getting hit in a wheel costs Draw.',
    make: theQuota,
  },
  {
    id: 'crowncoil-leyden-jars',
    rules: 'Four jars fill in turn. A full jar discharges into the NEAREST fighter, and the arc jumps to anyone within 170px of them.',
    make: leydenJars,
  },
  {
    id: 'crowncoil-storm-cage',
    rules: 'The storm comes in: a Faraday cage drops, then lightning strikes whoever is outside it. A cage holds one; its bars bite the rest.',
    make: stormComesIn,
  },
];

export const CROWNCOIL_WARDENS: EncounterDef[] = [
  {
    id: 'crowncoil-warden-1', court: 'crowncoil', name: 'The Quota',
    foeName: 'Overseer Brannock Crankshaw', foeElement: 'metal', difficulty: 5, hpMult: 1.2,
    gimmick: 'crowncoil-quota', at: { x: 900, y: 1760 }, coins: 140,
    look: { body: 0x4a4e58, accent: 0xc87a3a, hat: 'tophat', traits: ['cane', 'glasses', 'beard'], size: 1.2, eye: 0xffc85a },
    challenge: [
      'You walked UP the belts. Do you know what that is? That is four hundred turns of Draw, wasted on yourself.',
      'Every wheel in this gallery is counted. Every turn. Every half-turn, docked.',
      'You owe the Grid. Get in a wheel. When the Bell goes, we shall see who has cranked enough.',
    ],
    beaten: [
      'Short. I came up short. Forty years I have docked people for that and I came up short.',
      'Go on, then. Up the stair. The Banks are above. Mind the jars — they do not care whose quota it was.',
    ],
  },
  {
    id: 'crowncoil-warden-2', court: 'crowncoil', name: 'The Leyden Jars',
    foeName: 'Capacitrix Leyda Mirrow', foeElement: 'plasma', difficulty: 5, hpMult: 1.25,
    gimmick: 'crowncoil-leyden-jars', at: { x: 900, y: 1140 }, coins: 140,
    look: { body: 0xd8e0f0, accent: 0x3a6ac8, hat: 'goggles', traits: ['apron', 'glasses'], size: 1.05, eye: 0xa8e0ff },
    challenge: [
      'You earthed my banks. Both of them. Do you know how long it takes to charge a bank?',
      'A full jar is the most honest thing in the world. It does not choose. It goes to whoever is nearest.',
      'So the question is only ever this: who is nearest? Let us find out. Over and over.',
    ],
    beaten: [
      '...you kept me nearer. Every time. You let my own jars choose me.',
      'The Cages are above. When the storm comes in, get in a cage. In a cage, the current goes round you.',
    ],
  },
  {
    id: 'crowncoil-warden-3', court: 'crowncoil', name: 'The Storm Comes In',
    foeName: 'Turnkey Osric Mesh', foeElement: 'bind', difficulty: 5, hpMult: 1.3,
    gimmick: 'crowncoil-storm-cage', at: { x: 900, y: 415 }, coins: 140,
    look: { body: 0x3a3e48, accent: 0x8a6ad8, hat: 'helmet', traits: ['satchel', 'mask', 'tool'], size: 1.15, eye: 0xc8b0ff },
    challenge: [
      'Twelve years I have turned the keys on these cages. The lamplighters first. They wept at the bars.',
      'And then the storm came in, and they stopped weeping, and they held on to the bars and thanked me.',
      'I have one cage for us, visitor. One. And the storm is coming in.',
    ],
    beaten: [
      'You beat me to the cage. Twelve years and nobody ever beat me to the cage.',
      'She is above. The last ring. When the power fails up there, there is no cage. There is only her.',
    ],
  },
];

