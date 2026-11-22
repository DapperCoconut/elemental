import type { EncounterDef, EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../IslesTypes';
import type { Fighter } from '../../../../../entities/Fighter';
import { dim, lit } from '../../../../art/IsleArt';
import {
  EYE, SERPENT, SERPENT_BELLY, SKIN, SKIN_DARK, SKIN_LIT, VENOM, VENOM_DEEP, VENOM_LIT,
  clutchEgg, hangingSkin, milkingRack, serpentBody,
} from './art';

/**
 * The Slough's three wardens — the Matriarch's household, one at the head of each hall of her cast
 * skin.
 *
 * Each fight is the hall it closes. The Milkmaster keeps the racks to the drum, because a serpent
 * milked on the beat gives more; the Skinwarden keeps the old skins, every one the Matriarch ever
 * shed, and wears whichever suits her; the Broodnurse keeps the Clutch warm. Every rule cuts both
 * ways: a player who reads it turns it on the warden.
 */

type Who = 'player' | 'npc';
const WHO: Who[] = ['player', 'npc'];
const alive = (f: Fighter): boolean => f.active && f.hp > 0;
const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(ax - bx, ay - by);
const clampN = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

// ── Warden 1: Spit on the Beat ───────────────────────────────────────

/**
 * Six serpents hang on milking racks along the head of the shed and the Milkmaster beats a drum.
 * On the first beat of every bar some of them are hooded — marked to spit; they rear on beats two
 * and three, and on the fourth they spit a column of venom straight down the shed (14 damage, either
 * side). Strike a hooded serpent before it spits to *milk* it: it spits nothing, and the striker
 * takes a pail of its venom — the next blow they land on the other fighter is venom-edged (+8).
 * Every third bar is a Full Rack: all but two neighbouring serpents are hooded.
 */
const spitOnTheBeat = (ctx: GimmickCtx): EncounterGimmick => {
  const top = ctx.top;
  const BEAT = ctx.hard ? 540 : 640;
  const N = 6;
  const HALF = 34;
  const DMG = ctx.hard ? 16 : 14;
  const EDGE = 8;
  const PAIL_MAX = 3;
  const RACK_Y = top + 86;
  const xs = Array.from({ length: N }, (_, i) => 120 + i * ((ctx.W - 240) / (N - 1)));

  interface Snake { x: number; hooded: boolean; milkedAt: number; spatAt: number; target: StrikeTarget | null }
  const snakes: Snake[] = xs.map((x) => ({ x, hooded: false, milkedAt: -9999, spatAt: -9999, target: null }));
  const pail: Record<Who, number> = { player: 0, npc: 0 };
  const edgeFlash: Record<Who, number> = { player: 0, npc: 0 };
  let started = 0;
  let bar = -1;
  let beat = -1;
  let inner = false;
  let splashes: { x: number; at: number }[] = [];

  const fighter = (w: Who): Fighter => (w === 'player' ? ctx.player : ctx.npc);
  const hit = (f: Fighter, n: number, x?: number, y?: number) => { inner = true; ctx.hit(f, n, x, y); inner = false; };

  const milk = (s: Snake, by: Who) => {
    const now = ctx.scene.time.now;
    if (!s.hooded) { ctx.float(s.x, RACK_Y - 20, 'DRY', '#a8a088'); return; }
    s.hooded = false;
    s.milkedAt = now;
    pail[by] = Math.min(PAIL_MAX, pail[by] + 1);
    ctx.float(s.x, RACK_Y - 24, by === 'player' ? 'MILKED' : 'SHE MILKS IT', '#c8f07a');
    ctx.sfx('slime-splat');
  };

  for (const s of snakes) {
    s.target = ctx.target({ x: s.x, y: RACK_Y + 8, r: 24, passThrough: true, onStruck: (by) => milk(s, by) });
  }

  const startBar = () => {
    bar++;
    const full = bar % 3 === 2;
    for (const s of snakes) s.hooded = false;
    if (full) {
      const safe = Math.floor(ctx.rng() * (N - 1));
      snakes.forEach((s, i) => { s.hooded = i !== safe && i !== safe + 1; });
      ctx.banner('FULL RACK', '#d8ff8a');
    } else {
      const count = ctx.hard ? 4 : 3;
      const order = snakes.map((_, i) => i).sort(() => ctx.rng() - 0.5).slice(0, count);
      for (const i of order) snakes[i].hooded = true;
    }
    ctx.sfx('drum-hit');
  };

  const spit = (time: number) => {
    for (const s of snakes) {
      if (!s.hooded) continue;
      s.hooded = false;
      s.spatAt = time;
      splashes.push({ x: s.x, at: time });
      for (const w of WHO) {
        const f = fighter(w);
        if (alive(f) && Math.abs(f.x - s.x) < HALF + 12 && f.y > RACK_Y - 10) {
          hit(f, DMG, f.x, f.y);
          ctx.float(f.x, f.y - 50, 'SPAT ON', '#b8ff6a');
        }
      }
    }
    ctx.sfx('slime-splat');
    splashes = splashes.filter((p) => time - p.at < 2400);
  };

  /** 0–1 how far into the current bar's rear-up a hooded serpent is. */
  const rear = (time: number): number => {
    if (beat < 1) return 0;
    const inBar = (time - started) % (BEAT * 4);
    return clampN((inBar - BEAT) / (BEAT * 2), 0, 1);
  };

  const spend = (w: Who) => {
    if (pail[w] <= 0) return;
    const other = fighter(w === 'player' ? 'npc' : 'player');
    if (!alive(other)) return;
    pail[w]--;
    edgeFlash[w] = ctx.scene.time.now;
    hit(other, EDGE, other.x, other.y);
    ctx.float(other.x, other.y - 60, 'VENOM-EDGED', '#c8f07a');
  };

  return {
    update(time) {
      if (started === 0) { started = time + 1600; return; }
      if (time < started) return;
      const b = Math.floor((time - started) / BEAT);
      if (b === beat) return;
      beat = b;
      const inBar = b % 4;
      if (inBar === 0) startBar();
      else if (inBar === 3) spit(time);
      else ctx.sfx('drum-hit');
    },
    onNpcHurt() { if (!inner) spend('player'); },
    onPlayerHurt() { if (!inner) spend('npc'); },
    npcSeek() {
      const n = ctx.npc;
      if (beat < 0) return null;
      const inBar = beat % 4;
      // Short of venom and there is a hooded serpent: go and milk it before the fourth beat.
      if (pail.npc < 2 && inBar < 3) {
        let best: Snake | null = null, bd = Infinity;
        for (const s of snakes) {
          if (!s.hooded) continue;
          const d = Math.abs(s.x - n.x);
          if (d < bd) { bd = d; best = s; }
        }
        if (best && bd < 260) return { x: best.x, y: RACK_Y + 90 };
      }
      // Otherwise stand in a column that will not spit.
      let sx = n.x, sd = Infinity;
      for (let i = 0; i <= N; i++) {
        const x = i === 0 ? 60 : i === N ? ctx.W - 60 : (xs[i - 1] + xs[i]) / 2;
        const clear = snakes.every((s) => !s.hooded || Math.abs(s.x - x) > HALF + 30);
        const d = Math.abs(x - n.x);
        if (clear && d < sd) { sd = d; sx = x; }
      }
      return { x: sx, y: clampN(n.y, RACK_Y + 120, ctx.H - 60) };
    },
    drawGround(g, time) {
      const k = rear(time);
      for (const s of snakes) {
        if (!s.hooded) continue;
        // The column it will spit down: a wet stripe darkening as the beat comes.
        g.fillStyle(VENOM_DEEP, 0.12 + k * 0.22); g.fillRect(s.x - HALF, RACK_Y, HALF * 2, ctx.H - RACK_Y);
        g.lineStyle(2, VENOM, 0.3 + k * 0.5);
        for (let y = RACK_Y + 10; y < ctx.H; y += 26) {
          g.lineBetween(s.x - HALF, y, s.x - HALF, y + 12); g.lineBetween(s.x + HALF, y, s.x + HALF, y + 12);
        }
        if (k > 0.7 && Math.floor(time / 90) % 2 === 0) { g.lineStyle(3, VENOM_LIT, 0.7); g.strokeRect(s.x - HALF, RACK_Y, HALF * 2, ctx.H - RACK_Y); }
      }
      // Where it fell: a run of venom down the column, soaking in.
      for (const p of splashes) {
        const f = (time - p.at) / 2400;
        if (f < 0 || f > 1) continue;
        g.fillStyle(VENOM, 0.35 * (1 - f)); g.fillRect(p.x - HALF * 0.7, RACK_Y + 20, HALF * 1.4, ctx.H - RACK_Y - 20);
        for (let i = 0; i < 6; i++) { g.fillStyle(VENOM_LIT, 0.4 * (1 - f)); g.fillEllipse(p.x + Math.sin(i * 2.1) * HALF * 0.6, RACK_Y + 60 + i * 80, 18, 7); }
      }
    },
    drawAir(g, time) {
      const t = time / 1000;
      const k = rear(time);
      for (const s of snakes) {
        const milked = time - s.milkedAt < 900;
        milkingRack(g, s.x, RACK_Y, 74, 1, t + s.x * 0.01, s.hooded ? k : milked ? 0.3 : 0, s.x < ctx.W / 2 ? 1 : -1);
        if (s.hooded) {
          // The hood: flared skin round the head, an eye-spot on it.
          const hy = RACK_Y - 18 + k * 6;
          g.fillStyle(SERPENT, 0.9); g.fillEllipse(s.x, hy, 22 + k * 10, 14 + k * 6);
          g.fillStyle(SERPENT_BELLY, 0.9); g.fillCircle(s.x, hy, 3 + k * 2);
          g.fillStyle(EYE, 0.4 + k * 0.6); g.fillCircle(s.x - 6, hy + 4, 2); g.fillCircle(s.x + 6, hy + 4, 2);
        }
        if (milked) {
          const f = (time - s.milkedAt) / 900;
          for (let i = 0; i < 5; i++) { g.fillStyle(VENOM_LIT, 1 - f); g.fillCircle(s.x + (i - 2) * 5, RACK_Y - 8 + f * 30 + i * 3, 2); }
        }
        const since = time - s.spatAt;
        if (since >= 0 && since < 380) {
          // The spit: a jet arcing out of the jaws and down the shed.
          const f = since / 380;
          g.fillStyle(VENOM, 0.75 * (1 - f)); g.fillRect(s.x - 10, RACK_Y - 6, 20, (ctx.H - RACK_Y) * Math.min(1, f * 2.5));
          g.fillStyle(VENOM_LIT, 0.8 * (1 - f)); g.fillRect(s.x - 4, RACK_Y - 6, 8, (ctx.H - RACK_Y) * Math.min(1, f * 2.5));
        }
      }
      // A pail at the belt of whoever carries venom.
      for (const w of WHO) {
        const f = fighter(w);
        if (!alive(f) || pail[w] <= 0) continue;
        for (let i = 0; i < pail[w]; i++) {
          const px = f.x - 20 + i * 10, py = f.y + 16;
          g.fillStyle(0x6a5a3a, 1); g.fillRect(px - 4, py - 6, 8, 8);
          g.fillStyle(VENOM, 1); g.fillRect(px - 3, py - 6, 6, 2);
        }
        if (time - edgeFlash[w] < 300) { g.lineStyle(3, VENOM_LIT, 1 - (time - edgeFlash[w]) / 300); g.strokeCircle(f.x, f.y, 30); }
      }
    },
    drawHud(g, time) {
      if (started === 0 || time < started) return;
      const cx = ctx.W / 2, cy = top + 20;
      g.fillStyle(0x10140a, 0.88); g.fillRoundedRect(cx - 92, cy - 14, 184, 28, 10);
      g.lineStyle(2, VENOM_DEEP, 1); g.strokeRoundedRect(cx - 92, cy - 14, 184, 28, 10);
      const inBar = beat % 4;
      const pulse = 1 - clampN(((time - started) % BEAT) / BEAT, 0, 1);
      for (let i = 0; i < 4; i++) {
        const x = cx - 60 + i * 40;
        const on = i === inBar;
        g.fillStyle(i === 3 ? VENOM : 0xd8c8a0, on ? 0.6 + pulse * 0.4 : 0.25);
        g.fillCircle(x, cy, on ? 8 + pulse * 3 : 6);
      }
    },
    destroy() { for (const s of snakes) s.target?.remove(); },
  };
};

// ── Warden 2: Hanging Skins ──────────────────────────────────────────

/**
 * Old cast skins hang in the dark of the Hollow, empty heads at their feet. Anyone who *passes*
 * under one (moving within 56px) sets it twitching, and a moment later it drops and coils on whoever
 * is beneath: 13 damage and rooted 0.9s. A dropped skin lies on the floor as a slough for 5s (slows
 * whoever wades it) and is then hauled back up. Stand *still* under a hanging skin and you wear it:
 * you take 40% less. Strike a hanging skin and it drops at once — on whoever is wearing it.
 */
const hangingSkins = (ctx: GimmickCtx): EncounterGimmick => {
  const top = ctx.top;
  const TWITCH = ctx.hard ? 520 : 680;
  const STRUCK_TWITCH = 280;
  const DOWN_MS = 5000;
  const REHANG = 900;
  const PASS_R = 56;
  const WEAR_R = 46;
  const DMG = ctx.hard ? 15 : 13;
  const MOVING = 30;

  type State = 'hung' | 'twitch' | 'down' | 'rising';
  interface Skin { x: number; y: number; len: number; state: State; at: number; target: StrikeTarget | null }
  const skins: Skin[] = [];
  const count = ctx.hard ? 8 : 7;
  for (let tries = 0; skins.length < count && tries < 400; tries++) {
    const x = 110 + ctx.rng() * (ctx.W - 220), y = top + 130 + ctx.rng() * (ctx.H - top - 190);
    if (skins.some((s) => dist(s.x, s.y, x, y) < 170)) continue;
    skins.push({ x, y, len: 60 + ctx.rng() * 40, state: 'hung', at: 0, target: null });
  }
  const last: Record<Who, Pt> = { player: { x: 0, y: 0 }, npc: { x: 0, y: 0 } };
  const speed: Record<Who, number> = { player: 0, npc: 0 };
  const fighter = (w: Who): Fighter => (w === 'player' ? ctx.player : ctx.npc);

  const twitch = (s: Skin, time: number, ms: number) => {
    if (s.state !== 'hung') return;
    s.state = 'twitch';
    s.at = time + ms;
    ctx.sfx('whip');
  };
  for (const s of skins) {
    s.target = ctx.target({
      x: s.x, y: s.y - 30, r: 22, passThrough: true,
      onStruck: () => { if (s.state === 'hung') { twitch(s, ctx.scene.time.now, STRUCK_TWITCH); ctx.float(s.x, s.y - 80, 'CUT DOWN', '#e8e2c0'); } },
    });
  }

  const wearing = (w: Who): Skin | null => {
    const f = fighter(w);
    if (!alive(f) || speed[w] > MOVING) return null;
    for (const s of skins) if (s.state === 'hung' && dist(f.x, f.y, s.x, s.y) < WEAR_R) return s;
    return null;
  };
  const wading = (w: Who): boolean => {
    const f = fighter(w);
    return skins.some((s) => s.state === 'down' && dist(f.x, f.y, s.x, s.y) < 52);
  };

  return {
    update(time, dt) {
      for (const w of WHO) {
        const f = fighter(w);
        const d = dist(f.x, f.y, last[w].x, last[w].y);
        speed[w] = speed[w] * 0.8 + (dt > 0 ? d / dt : 0) * 0.2;
        last[w] = { x: f.x, y: f.y };
      }
      for (const s of skins) {
        if (s.state === 'hung') {
          for (const w of WHO) {
            const f = fighter(w);
            if (alive(f) && speed[w] > MOVING && dist(f.x, f.y, s.x, s.y) < PASS_R) { twitch(s, time, TWITCH); break; }
          }
        } else if (s.state === 'twitch' && time >= s.at) {
          s.state = 'down';
          s.at = time + DOWN_MS;
          ctx.sfx('trap-snap');
          for (const w of WHO) {
            const f = fighter(w);
            if (!alive(f) || dist(f.x, f.y, s.x, s.y) > 60) continue;
            ctx.hit(f, DMG, f.x, f.y);
            ctx.root(f, 900);
            ctx.float(f.x, f.y - 52, 'COILED', '#e8e2c0');
          }
        } else if (s.state === 'down' && time >= s.at) {
          s.state = 'rising';
          s.at = time + REHANG;
        } else if (s.state === 'rising' && time >= s.at) {
          s.state = 'hung';
        }
      }
    },
    playerSpeedMult() { return wading('player') ? 0.65 : 1; },
    npcSpeedMult() { return wading('npc') ? 0.65 : 1; },
    playerTakenMult() { return wearing('player') ? 0.6 : 1; },
    npcTakenMult() { return wearing('npc') ? 0.6 : 1; },
    npcSeek() {
      const n = ctx.npc, p = ctx.player;
      // The player is wearing a skin: get in range to cut it down on them, from outside its drop.
      const worn = wearing('player');
      if (worn) {
        const a = Math.atan2(n.y - worn.y, n.x - worn.x);
        return { x: clampN(worn.x + Math.cos(a) * 130, 60, ctx.W - 60), y: clampN(worn.y + Math.sin(a) * 130, top + 60, ctx.H - 60) };
      }
      // Otherwise: slip under the hanging skin furthest from the player, and keep still in it.
      let best: Skin | null = null, bs = -Infinity;
      for (const s of skins) {
        if (s.state !== 'hung') continue;
        const score = dist(s.x, s.y, p.x, p.y) - dist(s.x, s.y, n.x, n.y) * 0.6;
        if (score > bs) { bs = score; best = s; }
      }
      return best ? { x: best.x, y: best.y } : null;
    },
    drawGround(g, time) {
      // The Hollow is dark: a wash over the floor, the skins' own pale shadows the only marks in it.
      g.fillStyle(0x060806, 0.38); g.fillRect(0, top, ctx.W, ctx.H - top);
      for (const s of skins) {
        if (s.state === 'down') {
          // The fallen slough, coiled loose on the floor.
          const f = clampN(1 - (s.at - time) / DOWN_MS, 0, 1);
          g.lineStyle(10, SKIN_DARK, 0.7 * (1 - f * 0.4));
          g.beginPath(); g.arc(s.x, s.y, 34, 0, Math.PI * 1.7, false); g.strokePath();
          g.lineStyle(7, SKIN, 0.7 * (1 - f * 0.4));
          g.beginPath(); g.arc(s.x, s.y, 34, 0, Math.PI * 1.7, false); g.strokePath();
          g.beginPath(); g.arc(s.x + 6, s.y + 2, 18, Math.PI, Math.PI * 2.8, false); g.strokePath();
          g.fillStyle(SKIN_LIT, 0.7); g.fillEllipse(s.x + 34, s.y - 4, 18, 12);
          g.fillStyle(0x000000, 0.8); g.fillCircle(s.x + 31, s.y - 6, 2); g.fillCircle(s.x + 37, s.y - 6, 2);
          continue;
        }
        const tw = s.state === 'twitch';
        g.fillStyle(0x000000, tw ? 0.45 : 0.25); g.fillEllipse(s.x, s.y + 4, 64, 22);
        g.lineStyle(1.5, SKIN_LIT, tw ? 0.8 : 0.18); g.strokeCircle(s.x, s.y, tw ? 60 : WEAR_R);
        if (tw && Math.floor(time / 80) % 2 === 0) { g.fillStyle(SKIN_LIT, 0.15); g.fillCircle(s.x, s.y, 60); }
      }
    },
    drawAir(g, time) {
      const t = time / 1000;
      for (const s of skins) {
        if (s.state === 'down') continue;
        let drop = 0, a = 1;
        if (s.state === 'twitch') drop = 0.25 + Math.abs(Math.sin(time / 40)) * 0.25;
        if (s.state === 'rising') { const f = clampN((s.at - time) / REHANG, 0, 1); drop = 0; a = 1 - f * 0.7; }
        hangingSkin(g, s.x, s.y, s.len, t, drop, a);
      }
      for (const w of WHO) {
        const f = fighter(w);
        if (!alive(f)) continue;
        if (wearing(w)) {
          // Wrapped in the old skin: a pale mantle over the shoulders.
          g.lineStyle(5, SKIN, 0.55); g.strokeEllipse(f.x, f.y - 10, 44, 54);
          g.lineStyle(1, SKIN_LIT, 0.6); g.strokeEllipse(f.x, f.y - 10, 40, 50);
        }
      }
    },
    destroy() { for (const s of skins) s.target?.remove(); },
  };
};

// ── Warden 3: The Clutch ─────────────────────────────────────────────

/**
 * The Clutch's eggs stand round the room, as tall as a man. Linger within 110px of one and it
 * warms (the Broodnurse warms them half again as fast); a full egg hatches — the shell bursts (12 to
 * anyone within 90) and a hatchling slithers after whoever is nearest and bites (9, and its venom
 * numbs: silenced 1.5s). Strike a hatchling to kill it; strike an egg to chill it. Seven seconds
 * after a hatching she lays a new egg somewhere else.
 */
const theClutch = (ctx: GimmickCtx): EncounterGimmick => {
  const top = ctx.top;
  const WARM_R = 110;
  const WARM = 0.2;
  const COOL = 0.08;
  const NURSE = 1.5;
  const BURST_R = 90;
  const HATCH_SPEED = ctx.hard ? 175 : 150;
  const LAY_MS = 7000;
  const cx = ctx.W / 2, cy = (top + ctx.H) / 2 + 10;

  interface Egg { x: number; y: number; warmth: number; broken: number; target: StrikeTarget | null; chilledAt: number }
  interface Hatchling { x: number; y: number; born: number; dies: number; trail: Pt[]; target: StrikeTarget | null; done: boolean }
  const eggs: Egg[] = [];
  let lings: Hatchling[] = [];
  const fighter = (w: Who): Fighter => (w === 'player' ? ctx.player : ctx.npc);

  const placeEgg = (x: number, y: number, warmth: number): Egg => {
    const e: Egg = { x, y, warmth, broken: 0, target: null, chilledAt: -9999 };
    e.target = ctx.target({
      x, y: y - 30, r: 24,
      onStruck: () => {
        if (e.broken) return;
        e.warmth = Math.max(0, e.warmth - 0.35);
        e.chilledAt = ctx.scene.time.now;
        ctx.float(e.x, e.y - 80, 'CHILLED', '#c8e0ff');
      },
    });
    eggs.push(e);
    return e;
  };
  const n0 = ctx.hard ? 6 : 5;
  for (let i = 0; i < n0; i++) {
    const a = (i / n0) * Math.PI * 2 + ctx.rng() * 0.4;
    placeEgg(clampN(cx + Math.cos(a) * 300, 90, ctx.W - 90), clampN(cy + Math.sin(a) * 170, top + 90, ctx.H - 50), ctx.rng() * 0.3);
  }

  const hatch = (e: Egg, time: number) => {
    e.broken = time;
    e.target?.remove();
    e.target = null;
    ctx.sfx('crystal-shatter');
    ctx.flash(e.x, e.y - 30, 0xffd8a0);
    for (const w of WHO) {
      const f = fighter(w);
      if (alive(f) && dist(f.x, f.y, e.x, e.y) < BURST_R) { ctx.hit(f, 12, f.x, f.y); ctx.float(f.x, f.y - 50, 'SHELL!', '#ffd8a0'); }
    }
    const h: Hatchling = { x: e.x, y: e.y - 6, born: time, dies: time + 6000, trail: [], target: null, done: false };
    h.target = ctx.target({ x: h.x, y: h.y, r: 16, onStruck: () => { if (!h.done) { h.done = true; ctx.float(h.x, h.y - 20, 'SQUASHED', '#c8f07a'); ctx.sfx('slime-splat'); } } });
    lings.push(h);
    ctx.float(e.x, e.y - 90, 'HATCHED', '#ffb04a');
  };

  const lay = () => {
    for (let tries = 0; tries < 60; tries++) {
      const x = 100 + ctx.rng() * (ctx.W - 200), y = top + 110 + ctx.rng() * (ctx.H - top - 160);
      if (eggs.some((e) => !e.broken && dist(e.x, e.y, x, y) < 150)) continue;
      if (WHO.some((w) => dist(fighter(w).x, fighter(w).y, x, y) < 140)) continue;
      placeEgg(x, y, 0);
      ctx.float(x, y - 90, 'LAID', '#e8d0a0');
      ctx.sfx('heartbeat');
      return;
    }
  };

  const nearestTo = (x: number, y: number): Fighter | null => {
    let best: Fighter | null = null, bd = Infinity;
    for (const w of WHO) {
      const f = fighter(w);
      if (!alive(f)) continue;
      const d = dist(f.x, f.y, x, y);
      if (d < bd) { bd = d; best = f; }
    }
    return best;
  };

  return {
    update(time, dt) {
      const step = clampN(dt, 0, 0.05);
      for (const e of eggs) {
        if (e.broken) continue;
        let heat = 0;
        for (const w of WHO) {
          const f = fighter(w);
          if (alive(f) && dist(f.x, f.y, e.x, e.y) < WARM_R) heat += w === 'npc' ? NURSE : 1;
        }
        e.warmth = heat > 0 ? Math.min(1, e.warmth + WARM * heat * step) : Math.max(0, e.warmth - COOL * step);
        if (e.warmth >= 1) hatch(e, time);
      }
      // Lay a new egg for every broken shell that has lain long enough.
      for (const e of eggs) {
        if (e.broken && time - e.broken > LAY_MS && e.broken > 0) { e.broken = -1; lay(); }
      }
      for (let i = eggs.length - 1; i >= 0; i--) if (eggs[i].broken === -1) eggs.splice(i, 1);
      for (const h of lings) {
        if (h.done) continue;
        if (time >= h.dies) { h.done = true; continue; }
        const f = nearestTo(h.x, h.y);
        if (!f) continue;
        const a = Math.atan2(f.y - h.y, f.x - h.x);
        const wig = Math.sin(time / 90) * 0.5;
        h.x += Math.cos(a + wig) * HATCH_SPEED * step;
        h.y += Math.sin(a + wig) * HATCH_SPEED * step;
        h.trail.unshift({ x: h.x, y: h.y });
        if (h.trail.length > 9) h.trail.pop();
        h.target?.moveTo(h.x, h.y);
        if (dist(f.x, f.y, h.x, h.y) < 26) {
          h.done = true;
          ctx.hit(f, 9, f.x, f.y);
          ctx.silence(f, 1500);
          ctx.float(f.x, f.y - 52, 'BITTEN — NUMB', '#d8ff8a');
          ctx.sfx('stab');
        }
      }
      for (const h of lings) if (h.done && h.target) { h.target.remove(); h.target = null; }
      lings = lings.filter((h) => !h.done || time - h.born < 7000);
    },
    npcSeek() {
      const n = ctx.npc, p = ctx.player;
      // A hatchling on her heels: run it at the player so it picks them instead.
      const chased = lings.some((h) => !h.done && dist(h.x, h.y, n.x, n.y) < dist(h.x, h.y, p.x, p.y));
      if (chased) return { x: p.x, y: p.y };
      // The player is lingering by a warm egg: she brings her warmth to it from its far side.
      let best: Egg | null = null, bw = -1;
      for (const e of eggs) {
        if (e.broken || dist(p.x, p.y, e.x, e.y) > WARM_R + 30) continue;
        if (e.warmth > bw) { bw = e.warmth; best = e; }
      }
      if (best) {
        // Close enough to warm it; once it is nearly ready, step back out of the burst.
        const a = Math.atan2(best.y - p.y, best.x - p.x);
        const r = best.warmth > 0.8 ? BURST_R + 50 : WARM_R - 30;
        return { x: clampN(best.x + Math.cos(a) * r, 60, ctx.W - 60), y: clampN(best.y + Math.sin(a) * r, top + 60, ctx.H - 60) };
      }
      return null;
    },
    drawGround(g, time) {
      for (const e of eggs) {
        if (e.broken) {
          // The burst shell, splayed in its nest.
          for (let i = 0; i < 7; i++) {
            const a = (i / 7) * Math.PI * 2;
            g.fillStyle(SKIN_LIT, 0.8); g.fillTriangle(e.x + Math.cos(a) * 16, e.y - 4 + Math.sin(a) * 6, e.x + Math.cos(a + 0.4) * 26, e.y - 2 + Math.sin(a + 0.4) * 8, e.x + Math.cos(a) * 30, e.y - 14 + Math.sin(a) * 6);
          }
          g.fillStyle(0xd8c880, 0.5); g.fillEllipse(e.x, e.y, 50, 14);
          continue;
        }
        // The warmth it gives off, ring by ring — the burst ring flickers when it is nearly full.
        g.fillStyle(0xffa040, 0.04 + e.warmth * 0.1); g.fillCircle(e.x, e.y, WARM_R);
        g.lineStyle(2, 0xffc87a, 0.15 + e.warmth * 0.35);
        g.beginPath(); g.arc(e.x, e.y, WARM_R, -Math.PI / 2, -Math.PI / 2 + e.warmth * Math.PI * 2, false); g.strokePath();
        if (e.warmth > 0.75 && Math.floor(time / 100) % 2 === 0) { g.lineStyle(3, 0xff7a4a, 0.7); g.strokeCircle(e.x, e.y, BURST_R); }
      }
    },
    drawAir(g, time) {
      const t = time / 1000;
      for (const e of eggs) {
        if (e.broken) continue;
        clutchEgg(g, e.x, e.y, 1, e.warmth, t, e.warmth > 0.75 ? (e.warmth - 0.75) * 4 : 0);
        if (time - e.chilledAt < 600) {
          const f = (time - e.chilledAt) / 600;
          g.lineStyle(2, 0xc8e0ff, 1 - f); g.strokeEllipse(e.x, e.y - 36, 50 + f * 20, 76 + f * 20);
        }
      }
      for (const h of lings) {
        if (h.done || h.trail.length < 2) continue;
        serpentBody(g, h.trail, 4, dim(SERPENT, 0.1), lit(SERPENT_BELLY, 0.2), 0.5);
      }
    },
    destroy() {
      for (const e of eggs) e.target?.remove();
      for (const h of lings) h.target?.remove();
    },
  };
};

// ── Defs ─────────────────────────────────────────────────────────────

export const SLOUGH_GIMMICKS: GimmickDef[] = [
  {
    id: 'slough-spit-on-the-beat',
    rules: 'Hooded serpents spit down their column on the 4th beat. Strike one first to milk it: your next blow is venom-edged.',
    make: spitOnTheBeat,
  },
  {
    id: 'slough-hanging-skins',
    rules: 'Pass under a hanging skin and it drops and coils (rooted). Stand still beneath one: -40% taken. Strike it to drop it.',
    make: hangingSkins,
  },
  {
    id: 'slough-the-clutch',
    rules: 'Linger by an egg and it warms, bursts and hatches a biter (silence). She warms them faster. Strike eggs to chill them.',
    make: theClutch,
  },
];

export const SLOUGH_WARDENS: EncounterDef[] = [
  {
    id: 'slough-warden-1', court: 'slough', name: 'Spit on the Beat',
    foeName: 'Milkmaster Grisel Vatch', foeElement: 'pressure', difficulty: 5, hpMult: 1.15,
    gimmick: 'slough-spit-on-the-beat', at: { x: 900, y: 1800 }, coins: 150,
    look: { body: 0x8a9a6a, accent: 0x3a2a1a, hat: 'plague', traits: ['apron', 'tool'], size: 1.2, eye: 0xd8ff8a },
    challenge: [
      'Hear that? One, two, three — spit. Forty years I have kept the racks to that drum. They give more on the beat.',
      'Every drop in every Draught on this isle came down one of my troughs. Every one.',
      'You are standing in a column, by the by. I would mind the fourth beat.',
    ],
    beaten: [
      'You milked my own serpents at me. On the beat, too. I would have hired you, once.',
      'Go on, then. The Hollow is up the neck. Mind the old skins. She never could bear to throw one out.',
    ],
  },
  {
    id: 'slough-warden-2', court: 'slough', name: 'Hanging Skins',
    foeName: 'Skinwarden Ysolde Hask', foeElement: 'cloth', difficulty: 5, hpMult: 1.2,
    gimmick: 'slough-hanging-skins', at: { x: 900, y: 1140 }, coins: 150,
    look: { body: 0xd8d0b0, accent: 0x4a3a5a, hat: 'cowl', traits: ['scarf', 'satchel'], size: 1.05, eye: 0xe8e2c0 },
    challenge: [
      'Shh. Walk softly. Every skin in here is one she wore, and they still remember how to bite.',
      'I keep them aired and hung. I sew up the splits. Sometimes I wear one. It is very warm inside a queen.',
      'Pass under them, little thing. Go on. Pass under.',
    ],
    beaten: [
      'You cut one down on me. My favourite, too — the year she ate the Tithe-clerks.',
      'Leave me with them. I will hang them back. The Clutch is through the gullet. The eggs are listening.',
    ],
  },
  {
    id: 'slough-warden-3', court: 'slough', name: 'The Clutch',
    foeName: 'Broodnurse Ambry Ophel', foeElement: 'creation', difficulty: 5, hpMult: 1.25,
    gimmick: 'slough-the-clutch', at: { x: 900, y: 440 }, coins: 150,
    look: { body: 0xc8a888, accent: 0x6a2a3a, hat: 'snake', traits: ['apron', 'lantern'], size: 1.15, eye: 0xffb04a },
    challenge: [
      'Hush. They are nearly ready. Can you feel how warm it is? I sit with each one until it moves.',
      'Her next broodling is in one of these. Seven princes, there will be. Six were not enough, it seems.',
      'Stay a while, dear. Linger. They like company.',
    ],
    beaten: [
      'Cold. You have let them all go cold. ...Perhaps that is kinder. Perhaps I should have, years ago.',
      'She is in the skull, round her still. She will offer you a dose. Do not drink it. Nobody ever stops.',
    ],
  },
];
