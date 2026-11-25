import Phaser from 'phaser';
import type { CourtUnrest } from '../IslesSave';
import type { AreaDef, CourtDef, EncounterDef, NpcDef, Pt, Rect } from '../IslesTypes';
import { courtOfArea, getIsle } from '../IslesRegistry';
import { hashStr, mulberry } from '../art/IsleArt';
import * as Unrest from '../systems/Unrest';
import { darkDealer, darkShopIdOf } from '../content/unrest/darkMarket';
import { CLOSED_LINES, COWER_LINES, DEALER_LINES, REVOLT_BARKS, UNEASY_LINES } from '../content/unrest/lines';
import { flame, RIOT, rioter } from '../content/unrest/riotArt';

/**
 * The unrest as you walk through it: what a court in revolt or in anarchy looks like, who is on its
 * streets, and what its people say. `IsleWorldScene` builds one per area and asks it questions; an area
 * at peace (or that is not a court) answers "nothing" to all of them.
 *
 * Anarchy is drawn over the court's own painter rather than replacing it — scorch, rubble, torn paper and
 * a struck-through crown painted on the ground, boards across doorways, fires that burn, smoke across the
 * view and a dark grade over everything — so every one of the sixty courts has a ruined version without
 * sixty more paintings.
 */

type G = Phaser.GameObjects.Graphics;

const DEALER = 'dark-dealer-';

interface Decal { x: number; y: number; kind: number; s: number; seed: number }
interface Blaze { x: number; y: number; kind: 'barrel' | 'cart' | 'pile'; g: G; seed: number }

/** A foe that walks its patch instead of standing on a mark. */
export interface Roamer { home: Pt; x: number; y: number; tx: number; ty: number; moving: boolean; idleUntil: number; face: number }

export class UnrestWorld {
  readonly court: CourtDef | undefined;
  readonly u: CourtUnrest | undefined;
  private blazes: Blaze[] = [];
  private gSmoke: G | null = null;
  private listeners: { x: number; y: number; seed: number; g: G }[] = [];
  private warned = new Set<string>();
  private talkN = 0;

  constructor(private scene: Phaser.Scene, private def: AreaDef, private blocked: (x: number, y: number, r: number) => boolean) {
    this.court = courtOfArea(def.id);
    this.u = this.court ? Unrest.stateOf(this.court.id) : undefined;
  }

  get anarchy(): boolean { return this.u?.state === 'anarchy'; }
  get revolt(): boolean { return this.u?.state === 'revolt'; }

  /** The rebels standing here now. */
  foes(): EncounterDef[] { return this.court && this.u ? Unrest.standing(this.court.id) : []; }

  // ── People ───────────────────────────────────────────────────────────

  isDealer(n: NpcDef): boolean { return n.id.startsWith(DEALER); }
  /** Townsfolk hide while the court is in anarchy (the dealer does not: this is their weather). */
  cowers(n: NpcDef): boolean { return this.anarchy && !this.isDealer(n); }

  /** The dark market's keeper, set up at `spot` — only while the court is in anarchy. */
  dealer(spot: Pt): NpcDef | null {
    if (!this.anarchy || !this.court) return null;
    const d = darkDealer(this.court.id, 0x8a5ad8);
    return {
      id: `${DEALER}${this.court.id}`, name: d.name, title: 'Dark Market', look: d.look, at: spot, wander: 0,
      talks: DEALER_LINES.map((lines) => ({ lines })),
      role: { kind: 'shop', id: darkShopIdOf(this.court.id) },
      barks: [{ lines: ['Charms. Stronger than the honest kind.', 'Everything has a price. Mine are written down.'] }],
    };
  }

  private line(pool: string[]): string {
    return Unrest.fillLine(pool[Math.floor(Math.random() * pool.length)], this.court?.id ?? '');
  }

  /**
   * What someone says instead of (anarchy) or before (revolt) their usual talk. `closed` means their
   * counter is shut: no trade until the court is quiet.
   */
  talkFor(n: NpcDef): { lines: string[]; replace: boolean; closed: boolean } | null {
    if (!this.court || !this.u || this.isDealer(n)) return null;
    if (this.anarchy) {
      const lines = [this.line(COWER_LINES)];
      // Every third frightened person tells you what it is like on this isle in particular.
      if (this.talkN++ % 3 === 1) lines.push(Unrest.isleVoice(this.court.isle).cower);
      if (n.role) lines.push(this.line(CLOSED_LINES));
      const lead = Unrest.leaderOf(this.court.id);
      if (!n.role && lead && this.talkN % 4 === 0) lines.push(`They say the one behind it is called ${lead.foeName}.`);
      return { lines, replace: true, closed: !!n.role };
    }
    if (this.warned.has(n.id)) return null;
    this.warned.add(n.id);
    return { lines: [this.line(UNEASY_LINES)], replace: false, closed: false };
  }

  /** The isle's wanderer, on what is happening here. */
  wandererLine(): string | null {
    if (!this.court || !this.u) return null;
    const v = Unrest.isleVoice(this.court.isle);
    return this.anarchy ? v.wandererAnarchy : v.wandererRevolt;
  }

  /** Crowd barks while a revolt is brewing. */
  barks(): string[] | null {
    return this.revolt && this.court ? REVOLT_BARKS.map((l) => Unrest.fillLine(l, this.court!.id)) : null;
  }

  /** The line under the area's name as you walk in. */
  subtitle(): string | null {
    if (!this.court || !this.u) return null;
    const isle = getIsle(this.court.isle);
    return this.anarchy ? `IN ANARCHY — ${isle?.name ?? ''}` : `IN REVOLT — ${Unrest.hudLine(this.court.id).replace('⚠ REVOLT — ', '')}`;
  }

  // ── Roaming ──────────────────────────────────────────────────────────

  roamer(at: Pt): Roamer { return { home: { ...at }, x: at.x, y: at.y, tx: at.x, ty: at.y, moving: false, idleUntil: 0, face: Math.PI / 2 }; }

  /** Walk an insurgent about its patch: a few steps, a look round, a few more. */
  roam(r: Roamer, dt: number, now: number): void {
    if (!r.moving && now > r.idleUntil) {
      const a = Math.random() * Math.PI * 2, d = 40 + Math.random() * 110;
      const tx = r.home.x + Math.cos(a) * d, ty = r.home.y + Math.sin(a) * d;
      if (!this.blocked(tx, ty, 16)) { r.tx = tx; r.ty = ty; r.moving = true; } else r.idleUntil = now + 400;
    }
    if (!r.moving) return;
    const dx = r.tx - r.x, dy = r.ty - r.y, d = Math.hypot(dx, dy);
    if (d < 3) { r.moving = false; r.idleUntil = now + 900 + Math.random() * 2600; return; }
    const sp = 58 * dt / 1000;
    const nx = r.x + (dx / d) * sp, ny = r.y + (dy / d) * sp;
    if (this.blocked(nx, ny, 14)) { r.moving = false; r.idleUntil = now + 600; return; }
    r.x = nx; r.y = ny; r.face = Math.atan2(dy, dx);
  }

  // ── The look of it ───────────────────────────────────────────────────

  /** Open ground: `n` seeded points nothing is built on. */
  private scatter(n: number, salt: string, pad: number): Pt[] {
    const r = mulberry(hashStr(`${salt}:${this.def.id}`) ^ (this.u?.seed ?? 0));
    const out: Pt[] = [];
    for (let k = 0; k < n * 12 && out.length < n; k++) {
      const x = 70 + r() * (this.def.w - 140), y = 90 + r() * (this.def.h - 180);
      if (this.blocked(x, y, pad)) continue;
      if (out.some((p) => Math.hypot(p.x - x, p.y - y) < pad * 2.2)) continue;
      out.push({ x, y });
    }
    return out;
  }

  build(): void {
    if (!this.court || !this.u) return;
    if (this.revolt) { this.buildRevolt(); return; }
    const r = mulberry(hashStr(`ruin:${this.def.id}`) ^ this.u.seed);
    // Ground: drawn once, over the court's own baked ground and under everything that moves.
    const g = this.scene.add.graphics().setDepth(-9400);
    const decals: Decal[] = this.scatter(54, 'decal', 26).map((p, i) => ({ ...p, kind: i % 6, s: 0.8 + r() * 0.6, seed: i }));
    for (const d of decals) drawDecal(g, d, this.court.color);
    // Boards across the doorways: the south face of every big building.
    let boards = 0;
    for (const s of this.def.solids) {
      if (s.kind !== 'rect' || s.w < 90 || s.h < 50 || s.w > 420 || boards >= 10) continue;
      const bx = s.x + s.w / 2, by = s.y + s.h + 2;
      if (this.blocked(bx, by + 22, 10)) continue;
      const bg = this.scene.add.graphics().setDepth(by + 1);
      boarded(bg, bx, by, boards);
      boards++;
    }
    // Things that are still burning. Each is its own y-sorted graphic, redrawn every frame it is on screen.
    this.scatter(9, 'blaze', 60).forEach((p, i) => {
      this.blazes.push({ ...p, kind: (['barrel', 'cart', 'pile'] as const)[i % 3], g: this.scene.add.graphics().setDepth(p.y), seed: i });
    });
    // A dark grade over the whole view, heavier at the edges.
    const W = this.scene.scale.width, H = this.scene.scale.height;
    const grade = this.scene.add.graphics().setScrollFactor(0).setDepth(9700);
    grade.fillStyle(0x140604, 0.2); grade.fillRect(0, 0, W, H);
    for (let k = 0; k < 8; k++) {
      grade.fillStyle(0x2a0a04, 0.035);
      grade.fillRect(0, 0, W, 26 + k * 12); grade.fillRect(0, H - 26 - k * 12, W, 26 + k * 12);
      grade.fillRect(0, 0, 30 + k * 14, H); grade.fillRect(W - 30 - k * 14, 0, 30 + k * 14, H);
    }
    this.gSmoke = this.scene.add.graphics().setDepth(9050);
  }

  /** A revolt: nothing is broken yet. A crate to shout from, a ring of listeners, paper underfoot. */
  private buildRevolt(): void {
    if (!this.court) return;
    const foe = this.foes()[0];
    if (!foe) return;
    const r = mulberry(hashStr(`revolt:${this.def.id}`) ^ (this.u?.seed ?? 0));
    const g = this.scene.add.graphics().setDepth(-9400);
    for (const p of this.scatter(26, 'paper', 18)) pamphlet(g, p.x, p.y, r() * Math.PI, 1);
    for (let i = 0; i < 16; i++) {
      const a = r() * Math.PI * 2, d = 30 + r() * 150;
      const x = foe.at.x + Math.cos(a) * d, y = foe.at.y + Math.sin(a) * d * 0.7;
      if (!this.blocked(x, y, 8)) pamphlet(g, x, y, r() * Math.PI, 1.1);
    }
    // The soapbox, under the agitator's feet.
    const box = this.scene.add.graphics().setDepth(foe.at.y - 1);
    box.fillStyle(0x000000, 0.3); box.fillEllipse(foe.at.x, foe.at.y + 12, 56, 16);
    box.fillStyle(RIOT.woodDark, 1); box.fillRect(foe.at.x - 22, foe.at.y + 2, 44, 14);
    box.fillStyle(RIOT.wood, 1); box.fillRect(foe.at.x - 22, foe.at.y, 44, 5);
    box.lineStyle(1.5, RIOT.woodDark, 1);
    for (let i = 1; i < 4; i++) box.lineBetween(foe.at.x - 22 + i * 11, foe.at.y + 5, foe.at.x - 22 + i * 11, foe.at.y + 16);
    // The crowd that has stopped to listen.
    for (let i = 0; i < 9; i++) {
      const a = Math.PI * (0.12 + (i / 8) * 0.76), d = 74 + (i % 3) * 22;
      const x = foe.at.x + Math.cos(a) * d * 1.25, y = foe.at.y + Math.sin(a) * d * 0.8 + 18;
      if (this.blocked(x, y, 10)) continue;
      this.listeners.push({ x, y, seed: i * 11 + 2, g: this.scene.add.graphics().setDepth(y) });
    }
  }

  update(now: number, view: Rect): void {
    const inView = (x: number, y: number) => x > view.x - 60 && x < view.x + view.w + 60 && y > view.y - 80 && y < view.y + view.h + 80;
    for (const l of this.listeners) {
      l.g.clear();
      if (inView(l.x, l.y)) rioter(l.g, l.x, l.y, 0.95, l.seed, now, { arm: l.seed % 3 === 0 ? 0.5 + Math.sin(now / 200 + l.seed) * 0.4 : 0.05, face: 0 });
    }
    for (const b of this.blazes) {
      b.g.clear();
      if (inView(b.x, b.y)) drawBlaze(b.g, b, now);
    }
    const g = this.gSmoke;
    if (!g) return;
    g.clear();
    // Smoke blowing across the view in slow banks, and sparks going up through it.
    const t = now / 1000;
    for (let i = 0; i < 16; i++) {
      const sp = 14 + (i % 5) * 7;
      const x = view.x + ((i * 173.3 + t * sp) % (view.w + 300)) - 150;
      const y = view.y + ((i * 97.7) % view.h) + Math.sin(t * 0.4 + i) * 26;
      const rr = 70 + (i % 4) * 26;
      g.fillStyle(0x1c1614, 0.075); g.fillEllipse(x, y, rr * 2.2, rr);
      g.fillStyle(0x2a2220, 0.06); g.fillEllipse(x + rr * 0.5, y - rr * 0.2, rr * 1.5, rr * 0.7);
    }
    for (let i = 0; i < 34; i++) {
      const p = (t * (0.11 + (i % 6) * 0.03) + i * 0.137) % 1;
      const x = view.x + ((i * 61.9) % view.w) + Math.sin(t * 1.3 + i * 2) * 18;
      const y = view.y + view.h - p * (view.h + 40);
      g.fillStyle(i % 3 ? 0xff9a3a : 0xffd27a, (1 - p) * 0.75); g.fillCircle(x, y, 1.2 + (i % 3) * 0.5);
    }
  }
}

// ── Drawing ────────────────────────────────────────────────────────────

/** A sheet of cheap print, face down in the road. */
function pamphlet(g: G, x: number, y: number, a: number, s: number): void {
  const c = Math.cos(a), sn = Math.sin(a) * 0.6;
  const w = 7 * s, h = 9 * s;
  const pts = [[-w, -h], [w, -h], [w, h], [-w, h]].map(([px, py]) => ({ x: x + px * c - py * sn, y: y + (px * sn + py * c) * 0.7 }));
  g.fillStyle(0x000000, 0.18); g.fillPoints(pts.map((p) => ({ x: p.x + 2, y: p.y + 2 })) as Phaser.Types.Math.Vector2Like[], true);
  g.fillStyle(0xe6dcc4, 0.95); g.fillPoints(pts as Phaser.Types.Math.Vector2Like[], true);
  g.lineStyle(1, 0x3a2a20, 0.7);
  for (let i = 0; i < 3; i++) {
    const k = -0.5 + i * 0.5;
    g.lineBetween(x - w * 0.6 * c - h * k * sn, y + (-w * 0.6 * sn + h * k * c) * 0.7, x + w * 0.6 * c - h * k * sn, y + (w * 0.6 * sn + h * k * c) * 0.7);
  }
  g.fillStyle(0xb81a1a, 0.9); g.fillCircle(x, y - h * 0.3, 1.8 * s);
}

function drawDecal(g: G, d: Decal, tint: number): void {
  const { x, y, s } = d;
  const r = mulberry(d.seed * 977 + 13);
  switch (d.kind) {
    case 0: { // Scorch: a burnt patch with a paler ash heart and flecks thrown off it.
      g.fillStyle(0x0e0a08, 0.5); g.fillEllipse(x, y, 96 * s, 54 * s);
      g.fillStyle(0x1a1410, 0.5); g.fillEllipse(x + 6, y - 2, 64 * s, 34 * s);
      g.fillStyle(0x5a5650, 0.35); g.fillEllipse(x, y, 30 * s, 14 * s);
      for (let i = 0; i < 12; i++) { const a = r() * Math.PI * 2, q = (30 + r() * 34) * s; g.fillStyle(0x0e0a08, 0.5); g.fillCircle(x + Math.cos(a) * q, y + Math.sin(a) * q * 0.55, 1.5 + r() * 2.5); }
      break;
    }
    case 1: { // Rubble: pried-up cobbles.
      g.fillStyle(0x000000, 0.22); g.fillEllipse(x, y + 4, 60 * s, 18 * s);
      for (let i = 0; i < 9; i++) {
        const px = x + (r() - 0.5) * 50 * s, py = y + (r() - 0.5) * 18 * s, q = (5 + r() * 6) * s;
        g.fillStyle(i % 2 ? 0x6a665e : 0x565048, 1); g.fillRoundedRect(px - q, py - q * 0.7, q * 2, q * 1.4, 2);
        g.fillStyle(0x8a867c, 1); g.fillRect(px - q + 1, py - q * 0.7 + 1, q * 1.2, 2);
      }
      break;
    }
    case 2: { // A stove-in crate and its staves.
      g.fillStyle(0x000000, 0.22); g.fillEllipse(x, y + 6, 52 * s, 14 * s);
      g.fillStyle(RIOT.woodDark, 1); g.fillRect(x - 14 * s, y - 10 * s, 22 * s, 16 * s);
      g.fillStyle(RIOT.wood, 1); g.fillRect(x - 14 * s, y - 10 * s, 22 * s, 4 * s); g.fillRect(x - 14 * s, y - 2 * s, 12 * s, 3 * s);
      for (let i = 0; i < 5; i++) {
        const a = r() * Math.PI, q = (14 + r() * 16) * s;
        g.lineStyle(3.5 * s, i % 2 ? RIOT.wood : RIOT.woodDark, 1);
        g.lineBetween(x + 10 * s + Math.cos(a) * 4, y + Math.sin(a) * 3, x + 10 * s + Math.cos(a) * q, y + Math.sin(a) * q * 0.4);
      }
      break;
    }
    case 3: { // Paper everywhere.
      for (let i = 0; i < 6; i++) pamphlet(g, x + (r() - 0.5) * 70 * s, y + (r() - 0.5) * 34 * s, r() * Math.PI, 0.9 + r() * 0.3);
      break;
    }
    case 4: { // The crown, painted on the road and struck through.
      const q = 26 * s;
      g.fillStyle(0xb81a1a, 0.16); g.fillEllipse(x, y, q * 3.4, q * 1.9);
      g.fillStyle(tint, 0.5);
      g.fillRect(x - q, y, q * 2, q * 0.5);
      g.fillTriangle(x - q, y, x - q, y - q * 0.75, x - q * 0.4, y);
      g.fillTriangle(x - q * 0.35, y, x, y - q * 0.95, x + q * 0.35, y);
      g.fillTriangle(x + q * 0.4, y, x + q, y - q * 0.75, x + q, y);
      g.lineStyle(7 * s, 0xb81a1a, 0.8); g.lineBetween(x - q * 1.4, y + q * 0.7, x + q * 1.4, y - q * 0.9);
      g.lineStyle(3 * s, 0xb81a1a, 0.6); g.lineBetween(x - q * 1.2, y + q * 0.9, x - q * 1.25, y + q * 1.3); g.lineBetween(x + q * 0.6, y - q * 0.2, x + q * 0.62, y + q * 0.5);
      break;
    }
    default: { // A cart wheel and a snapped shaft.
      g.fillStyle(0x000000, 0.22); g.fillEllipse(x, y + 5, 54 * s, 14 * s);
      g.lineStyle(4 * s, RIOT.woodDark, 1); g.strokeEllipse(x, y, 34 * s, 20 * s);
      g.lineStyle(2 * s, RIOT.wood, 1);
      for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI; g.lineBetween(x - Math.cos(a) * 17 * s, y - Math.sin(a) * 10 * s, x + Math.cos(a) * 17 * s, y + Math.sin(a) * 10 * s); }
      g.fillStyle(RIOT.iron, 1); g.fillCircle(x, y, 3 * s);
      g.lineStyle(4 * s, RIOT.wood, 1); g.lineBetween(x + 20 * s, y + 6 * s, x + 48 * s, y - 4 * s);
      break;
    }
  }
}

/** Planks nailed across a doorway, and the notice on them. */
function boarded(g: G, x: number, y: number, seed: number): void {
  g.fillStyle(0x0c0806, 0.85); g.fillRect(x - 15, y - 44, 30, 44);
  g.lineStyle(6, RIOT.woodDark, 1);
  g.lineBetween(x - 21, y - 38, x + 21, y - 30); g.lineBetween(x - 21, y - 12, x + 21, y - 22); g.lineBetween(x - 20, y - 6, x + 20, y - 42);
  g.lineStyle(2.5, RIOT.wood, 1);
  g.lineBetween(x - 21, y - 39, x + 21, y - 31); g.lineBetween(x - 21, y - 13, x + 21, y - 23); g.lineBetween(x - 20, y - 7, x + 20, y - 43);
  g.fillStyle(0x9a9a9a, 1);
  for (const [nx, ny] of [[-18, -37], [18, -31], [-18, -13], [18, -22]]) g.fillCircle(x + nx, y + ny, 1.4);
  if (seed % 2 === 0) {
    g.fillStyle(0xe6dcc4, 1); g.fillRect(x - 9, y - 30, 18, 13);
    g.lineStyle(1.5, 0xb81a1a, 1); g.lineBetween(x - 6, y - 27, x + 6, y - 20); g.lineBetween(x + 6, y - 27, x - 6, y - 20);
  }
}

function drawBlaze(g: G, b: Blaze, now: number): void {
  const { x, y } = b;
  g.fillStyle(0xff6a1e, 0.05 + Math.sin(now / 130 + b.seed) * 0.015); g.fillCircle(x, y - 20, 120);
  g.fillStyle(0xffa040, 0.05); g.fillCircle(x, y - 20, 70);
  g.fillStyle(0x000000, 0.35); g.fillEllipse(x, y + 4, b.kind === 'cart' ? 96 : 44, b.kind === 'cart' ? 22 : 14);
  if (b.kind === 'barrel') {
    g.fillStyle(0x4a3420, 1); g.fillRoundedRect(x - 14, y - 34, 28, 38, 5);
    g.fillStyle(0x6a4a2c, 1); g.fillRect(x - 11, y - 32, 6, 34);
    g.fillStyle(RIOT.iron, 1); g.fillRect(x - 14, y - 27, 28, 3); g.fillRect(x - 14, y - 8, 28, 3);
    g.fillStyle(0x0c0806, 1); g.fillEllipse(x, y - 34, 26, 8);
    for (let i = 0; i < 3; i++) flame(g, x - 8 + i * 8, y - 34, 7 + (i % 2) * 3, now + i * 211 + b.seed * 97);
  } else if (b.kind === 'cart') {
    // On its side, bed to the sky, one wheel still turning in the heat.
    g.fillStyle(RIOT.woodDark, 1); g.fillRoundedRect(x - 44, y - 36, 78, 36, 3);
    g.fillStyle(0x2a1c10, 1); for (let i = 0; i < 5; i++) g.fillRect(x - 42 + i * 15.5, y - 34, 12, 32);
    g.fillStyle(0x0c0806, 0.6); g.fillRect(x - 44, y - 36, 78, 12);
    g.lineStyle(3.5, 0x2a2a30, 1); g.strokeCircle(x + 40, y - 30, 15);
    const a = now / 900 + b.seed;
    for (let i = 0; i < 4; i++) { const q = a + (i / 4) * Math.PI; g.lineStyle(2, 0x2a2a30, 1); g.lineBetween(x + 40 - Math.cos(q) * 15, y - 30 - Math.sin(q) * 15, x + 40 + Math.cos(q) * 15, y - 30 + Math.sin(q) * 15); }
    for (let i = 0; i < 5; i++) flame(g, x - 36 + i * 16, y - 36, 8 + (i % 3) * 3, now + i * 173 + b.seed * 61);
  } else {
    // A heap of what was indoors yesterday: a chair, a shutter, a drawer.
    g.fillStyle(0x2a1c10, 1); g.fillEllipse(x, y - 4, 50, 18);
    g.lineStyle(4, RIOT.woodDark, 1);
    g.lineBetween(x - 20, y, x - 12, y - 30); g.lineBetween(x - 12, y - 30, x + 2, y - 26); g.lineBetween(x + 2, y - 26, x + 6, y - 2);
    g.lineBetween(x - 16, y - 16, x + 4, y - 13);
    g.fillStyle(0x3a463a, 1); g.fillRect(x + 4, y - 22, 18, 20);
    g.lineStyle(1.5, 0x1c241c, 1); for (let i = 0; i < 4; i++) g.lineBetween(x + 5, y - 19 + i * 5, x + 21, y - 19 + i * 5);
    for (let i = 0; i < 4; i++) flame(g, x - 16 + i * 11, y - 18 - (i % 2) * 8, 7 + (i % 2) * 3, now + i * 251 + b.seed * 43);
  }
  // Smoke off the top.
  for (let i = 0; i < 5; i++) {
    const p = ((now / 2400 + i / 5 + b.seed * 0.13) % 1);
    g.fillStyle(0x1c1614, (1 - p) * 0.32); g.fillCircle(x + Math.sin(p * 5 + i) * 14 + p * 26, y - 44 - p * 96, 9 + p * 20);
  }
}
