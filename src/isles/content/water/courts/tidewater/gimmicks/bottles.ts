import type Phaser from 'phaser';
import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import { dim, lit } from '../../../../../art/IsleArt';
import { BRASS_LIT, FOAM, PAINT_CREAM, PILE, ROPE_DARK, SEA_DEEP, SEA_LIT, SEA_SHALLOW, WEED } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Message in a Bottle — Beachcomber Wren.
 *
 * Bottles wash up on every wave. Walk into one and it breaks; the note inside is read out over
 * your head and does what it says, for a few seconds, to whoever broke it — a fair wind, a
 * fortune, a safe harbour, or a shipwreck, a becalming, a kraken coming up through the sand.
 *
 * The glass is the tell. **Green** bottles are mostly good news and **brown** mostly bad. Wren
 * has combed this beach for thirty years and only ever goes for the green; you can race her to
 * them, and leave the brown where they lie.
 */

const LANDED_R = 26;
const DUR_MS = 6000;
const MAX_ON_BEACH = 4;
const KRAKEN_WARN = 1150;
const KRAKEN_R = 62;

type NoteId = 'wind' | 'eight' | 'harbour' | 'calm' | 'becalmed' | 'wreck' | 'kraken' | 'leak';
type Glass = 'green' | 'brown';

interface Note { id: NoteId; title: string; line: string; good: boolean; color: string }

const NOTES: Record<NoteId, Note> = {
  wind: { id: 'wind', title: 'FAIR WIND', line: 'Make all sail.', good: true, color: '#a6e8c6' },
  eight: { id: 'eight', title: 'PIECES OF EIGHT', line: 'X marks the spot.', good: true, color: '#f2d58a' },
  harbour: { id: 'harbour', title: 'SAFE HARBOUR', line: 'Come home.', good: true, color: '#9fe6e8' },
  calm: { id: 'calm', title: 'CALM SEAS', line: 'Not a ripple.', good: true, color: '#cfe6f5' },
  becalmed: { id: 'becalmed', title: 'BECALMED', line: 'No wind for nine days.', good: false, color: '#c8b89a' },
  wreck: { id: 'wreck', title: 'SHIPWRECK', line: 'She broke on the Teeth.', good: false, color: '#ff9a7a' },
  kraken: { id: 'kraken', title: 'THE KRAKEN', line: 'It came up under us.', good: false, color: '#d68ab8' },
  leak: { id: 'leak', title: 'SPRUNG A LEAK', line: 'Bail, lads, bail.', good: false, color: '#9fb6c8' },
};
const GOOD: NoteId[] = ['wind', 'eight', 'harbour', 'calm'];
const BAD: NoteId[] = ['becalmed', 'wreck', 'kraken', 'leak'];

interface Bottle {
  x: number; y: number;
  fromY: number;
  bornAt: number; landAt: number;
  glass: Glass;
  note: NoteId;
  seed: number;
  tilt: number;
}

interface Effect { note: NoteId; until: number }
interface Reading { x: number; y: number; at: number; note: NoteId; who: Fighter }
interface Kraken { x: number; y: number; at: number; dealt: boolean }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const every = ctx.hard ? 3400 : 4200;
  const dur = ctx.hard ? 5000 : DUR_MS;
  const bottles: Bottle[] = [];
  const effects = new Map<Fighter, Effect[]>([[player, []], [npc, []]]);
  const readings: Reading[] = [];
  const krakens: Kraken[] = [];
  const shards: { x: number; y: number; vx: number; vy: number; at: number; c: number }[] = [];
  let nextWash = 0;
  let started = false;
  const leakAcc = new Map<Fighter, number>([[player, 0], [npc, 0]]);

  const has = (f: Fighter, id: NoteId, time: number) => (effects.get(f) ?? []).some((e) => e.note === id && e.until > time);

  function wash(time: number): void {
    const glass: Glass = rng() < 0.5 ? 'green' : 'brown';
    // Three in four honest: green is usually good, brown usually bad.
    const honest = rng() < 0.75;
    const pool = (glass === 'green') === honest ? GOOD : BAD;
    const note = pool[Math.floor(rng() * pool.length)];
    let x = 80 + rng() * (W - 160);
    let y = top + 90 + rng() * (H - top - 170);
    for (let tries = 0; tries < 8 && bottles.some((b) => dist(b.x, b.y, x, y) < 90); tries++) {
      x = 80 + rng() * (W - 160);
      y = top + 90 + rng() * (H - top - 170);
    }
    bottles.push({ x, y, fromY: H + 20, bornAt: time, landAt: time + 1300, glass, note, seed: rng() * 10, tilt: (rng() - 0.5) * 1.4 });
    ctx.sfx('bubble');
  }

  function apply(f: Fighter, note: NoteId, time: number): void {
    const list = effects.get(f);
    if (!list) return;
    const n = NOTES[note];
    readings.push({ x: f.x, y: f.y, at: time, note, who: f });
    ctx.float(f.x, f.y - 58, n.title, n.color);
    ctx.float(f.x, f.y - 120, `"${n.line}"`, '#e8dcc0');
    if (note === 'harbour') { ctx.heal(f, ctx.hard ? 12 : 15); ctx.sfx('heal'); return; }
    if (note === 'kraken') {
      krakens.push({ x: f.x, y: f.y, at: time, dealt: false });
      ctx.sfx('curse-cast');
      return;
    }
    // Same note again only refreshes it.
    const cur = list.find((e) => e.note === note);
    if (cur) cur.until = time + dur; else list.push({ note, until: time + dur });
    ctx.sfx(n.good ? 'status-buff' : 'status-debuff');
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextWash = time + 1200; }
      if (time >= nextWash) {
        nextWash = time + every;
        if (bottles.filter((b) => time >= b.landAt).length < MAX_ON_BEACH) wash(time);
      }
      // Breaking.
      for (let i = bottles.length - 1; i >= 0; i--) {
        const b = bottles[i];
        if (time < b.landAt) continue;
        for (const f of [player, npc]) {
          if (!alive(f) || dist(f.x, f.y + 8, b.x, b.y) > LANDED_R) continue;
          bottles.splice(i, 1);
          ctx.sfx('crystal-shatter');
          for (let k = 0; k < 8; k++) {
            const a = rng() * Math.PI * 2, sp = 60 + rng() * 90;
            shards.push({ x: b.x, y: b.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, at: time, c: b.glass === 'green' ? 0x5fae6a : 0x9a6a34 });
          }
          apply(f, b.note, time);
          break;
        }
      }
      // The kraken: a ring of sand churns, then a tentacle comes up through it.
      for (const k of krakens) {
        if (k.dealt || time < k.at + KRAKEN_WARN) continue;
        k.dealt = true;
        ctx.sfx('stone-rise');
        ctx.flash(k.x, k.y, 0xb0466a);
        for (const f of [player, npc]) {
          if (alive(f) && dist(f.x, f.y, k.x, k.y) < KRAKEN_R) ctx.hit(f, ctx.hard ? 19 : 15, f.x, f.y);
        }
      }
      for (let i = krakens.length - 1; i >= 0; i--) if (time > krakens[i].at + KRAKEN_WARN + 900) krakens.splice(i, 1);
      // Leaks.
      for (const f of [player, npc]) {
        if (!alive(f) || !has(f, 'leak', time)) { leakAcc.set(f, 0); continue; }
        let a = (leakAcc.get(f) ?? 0) + dt * 3;
        if (a >= 2) { ctx.hit(f, Math.floor(a), f.x, f.y); a -= Math.floor(a); }
        leakAcc.set(f, a);
      }
      for (const [f, list] of effects) effects.set(f, list.filter((e) => e.until > time));
      for (let i = readings.length - 1; i >= 0; i--) if (time - readings[i].at > 1500) readings.splice(i, 1);
      for (const s of shards) { s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 260 * dt; }
      for (let i = shards.length - 1; i >= 0; i--) if (time - shards[i].at > 700) shards.splice(i, 1);
    },

    playerSpeedMult() {
      const t = ctx.scene.time.now;
      return (has(player, 'wind', t) ? 1.35 : 1) * (has(player, 'becalmed', t) ? 0.6 : 1);
    },
    npcSpeedMult() {
      const t = ctx.scene.time.now;
      return (has(npc, 'wind', t) ? 1.35 : 1) * (has(npc, 'becalmed', t) ? 0.6 : 1);
    },
    // Taken: your fortune makes them take more; your calm or their wreck changes what lands on you.
    playerTakenMult() {
      const t = ctx.scene.time.now;
      return (has(npc, 'eight', t) ? 1.35 : 1) * (has(player, 'calm', t) ? 0.6 : 1) * (has(player, 'wreck', t) ? 1.35 : 1);
    },
    npcTakenMult() {
      const t = ctx.scene.time.now;
      return (has(player, 'eight', t) ? 1.35 : 1) * (has(npc, 'calm', t) ? 0.6 : 1) * (has(npc, 'wreck', t) ? 1.35 : 1);
    },

    npcSeek() {
      const time = ctx.scene.time.now;
      // Never stand on a kraken.
      for (const k of krakens) {
        if (!k.dealt && dist(npc.x, npc.y, k.x, k.y) < KRAKEN_R + 20) {
          const a = Math.atan2(npc.y - k.y, npc.x - k.x);
          return { x: clamp(k.x + Math.cos(a) * 140, 50, W - 50), y: clamp(k.y + Math.sin(a) * 140, top + 50, H - 50) };
        }
      }
      // The nearest green bottle on the sand.
      let best: Bottle | null = null;
      let bd = 520;
      for (const b of bottles) {
        if (time < b.landAt - 300 || b.glass !== 'green') continue;
        const d = dist(npc.x, npc.y, b.x, b.y);
        if (d < bd) { bd = d; best = b; }
      }
      return best ? { x: best.x, y: best.y } : null;
    },

    drawGround(g, time) {
      // Wrack along the sea edge, where every bottle comes in.
      g.fillStyle(SEA_SHALLOW, 0.5); g.fillRect(0, H - 22, W, 22);
      g.lineStyle(2, FOAM, 0.55);
      g.beginPath(); g.moveTo(0, H - 22);
      for (let x = 0; x <= W; x += 14) g.lineTo(x, H - 22 + Math.sin(x * 0.04 + time / 300) * 3);
      g.strokePath();
      for (const b of bottles) {
        if (time < b.landAt) {
          // Riding a little wave in: a wake of foam behind it.
          const k = (time - b.bornAt) / (b.landAt - b.bornAt);
          const y = b.fromY + (b.y - b.fromY) * k;
          g.fillStyle(SEA_SHALLOW, 0.4 * (1 - k)); g.fillEllipse(b.x, y + 10, 60, 18);
          g.lineStyle(2, FOAM, 0.6 * (1 - k)); g.strokeEllipse(b.x, y + 10, 50, 12);
          // Where it will fetch up.
          g.lineStyle(1.5, FOAM, 0.25 + k * 0.4); g.strokeCircle(b.x, b.y, LANDED_R);
          continue;
        }
        g.fillStyle(0x000000, 0.25); g.fillEllipse(b.x, b.y + 6, 30, 8);
        g.fillStyle(WEED, 0.6); g.fillEllipse(b.x + 10, b.y + 6, 14, 4);
        // A wet ring of sand round it.
        g.lineStyle(1, dim(SEA_LIT, 0.3), 0.4); g.strokeEllipse(b.x, b.y + 4, 40, 12);
      }
      for (const k of krakens) {
        if (k.dealt) continue;
        const f = clamp((time - k.at) / KRAKEN_WARN, 0, 1);
        g.fillStyle(SEA_DEEP, 0.22 + f * 0.3); g.fillCircle(k.x, k.y, KRAKEN_R * (0.5 + f * 0.5));
        g.lineStyle(2.5, 0xd68ab8, 0.5 + f * 0.5); g.strokeCircle(k.x, k.y, KRAKEN_R);
        // Sand churning in a spiral.
        for (let i = 0; i < 8; i++) {
          const a = time / 160 + i * 0.8;
          const r = KRAKEN_R * (0.2 + ((i * 0.13 + time / 1200) % 0.8));
          g.fillStyle(0x6c5f4a, 0.7); g.fillCircle(k.x + Math.cos(a) * r, k.y + Math.sin(a) * r * 0.6, 2.5);
        }
        if (f > 0.8 && Math.floor(time / 80) % 2 === 0) { g.lineStyle(4, 0xffffff, 0.6); g.strokeCircle(k.x, k.y, KRAKEN_R + 3); }
      }
    },

    drawAir(g, time) {
      for (const b of bottles) {
        const landed = time >= b.landAt;
        const k = landed ? 1 : (time - b.bornAt) / (b.landAt - b.bornAt);
        const y = landed ? b.y : b.fromY + (b.y - b.fromY) * k;
        const bob = landed ? 0 : Math.sin(time / 120 + b.seed) * 3;
        drawBottle(g, b.x, y + bob - 4, b.glass, landed ? b.tilt : Math.sin(time / 200 + b.seed) * 0.5, time, b.seed);
      }
      for (const s of shards) {
        g.fillStyle(lit(s.c, 0.3), 1 - (time - s.at) / 700);
        g.fillTriangle(s.x, s.y, s.x + 3, s.y + 1, s.x + 1, s.y + 4);
      }
      // Notes unrolling over whoever read them.
      for (const r of readings) {
        const k = (time - r.at) / 1500;
        const unroll = clamp(k / 0.25, 0, 1);
        const x = r.who.x, y = r.who.y - 92 - k * 10;
        const w = 72 * unroll;
        g.fillStyle(0x000000, 0.25 * (1 - k)); g.fillRect(x - w / 2 + 3, y + 3, w, 26);
        g.fillStyle(PAINT_CREAM, 0.95 * (1 - k * 0.6)); g.fillRect(x - w / 2, y, w, 26);
        g.fillStyle(dim(PAINT_CREAM, 0.2), 1 - k); g.fillCircle(x - w / 2, y + 13, 4); g.fillCircle(x + w / 2, y + 13, 4);
        g.lineStyle(1, 0x5a4a3a, 0.7 * (1 - k));
        for (let l = 0; l < 3; l++) g.lineBetween(x - w / 2 + 8, y + 7 + l * 6, x + w / 2 - 8 - l * 6, y + 7 + l * 6);
      }
      // Krakens: the tentacle itself, up through the sand and down again.
      for (const k of krakens) {
        if (!k.dealt) continue;
        const f = clamp((time - k.at - KRAKEN_WARN) / 900, 0, 1);
        const h = Math.sin(f * Math.PI) * 110;
        for (let i = 0; i < 12; i++) {
          const t = i / 11;
          const x = k.x + Math.sin(t * 3 + time / 140) * 16 * t;
          const y = k.y - h * t;
          const r = 15 * (1 - t * 0.75);
          g.fillStyle(0x8a3a6a, 1); g.fillCircle(x, y, r);
          g.fillStyle(0xd68ab8, 1); g.fillCircle(x - r * 0.35, y, r * 0.38);
        }
      }
      // Active notes: a little sigil each, worn over the head.
      for (const f of [player, npc]) {
        if (!alive(f)) continue;
        const list = effects.get(f) ?? [];
        list.forEach((e, i) => drawNoteSigil(g, f.x - (list.length - 1) * 9 + i * 18, f.y - 52, e.note, time));
        if (has(f, 'wind', time)) {
          for (let i = 0; i < 3; i++) {
            const ph = ((time / 240) + i / 3) % 1;
            g.lineStyle(1.5, 0xe8fff0, 0.7 * (1 - ph)); g.lineBetween(f.x - 26 - ph * 20, f.y - 10 + i * 8, f.x - 10 - ph * 20, f.y - 10 + i * 8);
          }
        }
        if (has(f, 'calm', time)) { g.lineStyle(2, 0xcfe6f5, 0.5); g.strokeEllipse(f.x, f.y + 14, 52, 14); }
      }
    },

    drawHud(g, time) {
      // Note slips under each corner: what is on you and how long it has left.
      for (const [f, x0, d] of [[player, 18, 1], [npc, W - 18, -1]] as [Fighter, number, number][]) {
        (effects.get(f) ?? []).forEach((e, i) => {
          const n = NOTES[e.note];
          const x = d > 0 ? x0 + i * 46 : x0 - (i + 1) * 46;
          const y = top + 10;
          g.fillStyle(0x000000, 0.45); g.fillRoundedRect(x, y, 42, 14, 4);
          g.fillStyle(n.good ? 0x5fae6a : 0x9a6a34, 0.95);
          g.fillRect(x + 3, y + 3, 36 * clamp((e.until - time) / dur, 0, 1), 8);
        });
      }
    },
  };
}

function drawBottle(g: Phaser.GameObjects.Graphics, x: number, y: number, glass: Glass, tilt: number, time: number, seed: number): void {
  const body = glass === 'green' ? 0x4f9a5c : 0x8a5a2c;
  const c = Math.cos(tilt), s = Math.sin(tilt);
  const pt = (dx: number, dy: number) => ({ x: x + dx * c - dy * s, y: y + dx * s + dy * c });
  // Glass body.
  const a = pt(-7, 8), b = pt(7, 8), d = pt(7, -6), e = pt(-7, -6);
  g.fillStyle(dim(body, 0.3), 0.95);
  g.fillTriangle(a.x, a.y, b.x, b.y, d.x, d.y); g.fillTriangle(a.x, a.y, d.x, d.y, e.x, e.y);
  const a2 = pt(-5.5, 7), b2 = pt(5.5, 7), d2 = pt(5.5, -5), e2 = pt(-5.5, -5);
  g.fillStyle(body, 0.85);
  g.fillTriangle(a2.x, a2.y, b2.x, b2.y, d2.x, d2.y); g.fillTriangle(a2.x, a2.y, d2.x, d2.y, e2.x, e2.y);
  // The rolled note inside.
  const n0 = pt(-2, 4), n1 = pt(2, -3);
  g.lineStyle(3, PAINT_CREAM, 0.9); g.lineBetween(n0.x, n0.y, n1.x, n1.y);
  // Neck and cork.
  const k0 = pt(0, -6), k1 = pt(0, -14);
  g.lineStyle(5, dim(body, 0.2), 0.95); g.lineBetween(k0.x, k0.y, k1.x, k1.y);
  const ck = pt(0, -16);
  g.fillStyle(0xb08a5a, 1); g.fillCircle(ck.x, ck.y, 2.8);
  g.lineStyle(1, ROPE_DARK, 1); g.lineBetween(ck.x - 3, ck.y + 2, ck.x + 3, ck.y + 2);
  // A glint that walks along the glass.
  const gl = pt(-3 + Math.sin(time / 400 + seed) * 2, 0);
  g.fillStyle(0xffffff, 0.6); g.fillEllipse(gl.x, gl.y, 2, 6);
}

/** A tiny mark per note: a sail, a coin, an anchor, a wave, a broken hull, a drip. */
function drawNoteSigil(g: Phaser.GameObjects.Graphics, x: number, y: number, note: NoteId, time: number): void {
  g.fillStyle(0x000000, 0.4); g.fillCircle(x, y, 8);
  switch (note) {
    case 'wind':
      g.fillStyle(0xe8fff0, 1); g.fillTriangle(x - 4, y + 5, x + 4, y + 5, x - 3, y - 6);
      g.lineStyle(1, PILE, 1); g.lineBetween(x - 4, y - 6, x - 4, y + 6);
      break;
    case 'eight':
      g.fillStyle(BRASS_LIT, 1); g.fillCircle(x, y, 5);
      g.lineStyle(1, 0x7f5f22, 1); g.strokeCircle(x, y, 3);
      break;
    case 'calm':
      g.lineStyle(1.5, 0xcfe6f5, 1); g.lineBetween(x - 5, y, x + 5, y); g.lineBetween(x - 4, y + 3, x + 4, y + 3);
      break;
    case 'becalmed':
      g.lineStyle(1.8, 0xc8b89a, 1);
      g.lineBetween(x, y - 5, x, y + 4); g.lineBetween(x - 3, y - 3, x + 3, y - 3);
      g.beginPath(); g.arc(x, y, 5, Math.PI * 0.15, Math.PI * 0.85, false); g.strokePath();
      break;
    case 'wreck':
      g.fillStyle(0xff9a7a, 1); g.fillTriangle(x - 5, y - 1, x + 5, y - 1, x + 3, y + 4);
      g.lineStyle(1.5, 0x2a1a14, 1); g.lineBetween(x - 1, y - 2, x + 2, y + 3);
      break;
    case 'leak': {
      const ph = (time / 500) % 1;
      g.fillStyle(0x9fb6c8, 1); g.fillCircle(x, y - 2 + ph * 5, 3);
      g.fillTriangle(x - 3, y - 2 + ph * 5, x + 3, y - 2 + ph * 5, x, y - 7 + ph * 5);
      break;
    }
    default:
      break;
  }
}

export const MESSAGE_IN_A_BOTTLE: GimmickDef = {
  id: 'tidewater-bottle',
  rules: 'Bottles wash up; walk into one to break it and read the note — a boon or a curse for a few seconds. Green glass is mostly good news, brown mostly bad. Wren goes for the green.',
  make,
};
