import Phaser from 'phaser';
import type { InvasionMap, MapRoomMeta } from '../InvasionMap';

/**
 * The City — Invasion's main map. One full screen per district, the same
 * no-scroll contract as the Mansion: gates teleport with a fade, so every HUD
 * in the game keeps working.
 *
 *   room 0  MAIN STREET  the plaza, with the All-Element on its plinth at the top
 *   room 1  RED LANE     through the red gate on the west side of the plaza
 *   room 2  GREEN LANE   through the green gate at the foot of the plaza
 *   room 3  YELLOW LANE  through the yellow gate on the east side
 *
 * Husks only ever come up out of the rift at the far end of a lane. They walk
 * the lane to its gate, step through onto Main Street and make for the
 * All-Element. Nothing here is destructible except the All-Element itself, which
 * belongs to the CityDirector, not the map.
 */

export const CITY_MAIN = 0;
export const CITY_RED = 1;
export const CITY_GREEN = 2;
export const CITY_YELLOW = 3;
export const CITY_LANES = [CITY_RED, CITY_GREEN, CITY_YELLOW];
export const CITY_ROOM_COUNT = 4;

type GateSide = 'n' | 's' | 'e' | 'w';

interface CityRoomMeta extends MapRoomMeta {
  accent: number;
  /** Which side of Main Street this lane's gate is cut into. */
  side?: GateSide;
  /** Text-colour version of `accent`, for banners and the room label. */
  hex: string;
}

export const CITY_META: CityRoomMeta[] = [
  { name: 'MAIN STREET', emoji: '🏛️', accent: 0xd8c8a0, hex: '#e8dcb8' },
  { name: 'RED LANE', emoji: '🟥', accent: 0xe0443a, side: 'w', hex: '#ff7766' },
  { name: 'GREEN LANE', emoji: '🟩', accent: 0x4ccf5a, side: 's', hex: '#88ee88' },
  { name: 'YELLOW LANE', emoji: '🟨', accent: 0xf2c94c, side: 'e', hex: '#ffe27a' },
];

const OPPOSITE: Record<GateSide, GateSide> = { n: 's', s: 'n', e: 'w', w: 'e' };

const KERB = 30;              // building band around the screen edge
const GATE_TRIGGER = 46;
const TRAVEL_COOLDOWN_MS = 700;
const FADE_MS = 170;

/** Where the All-Element stands on Main Street, as fractions of the screen. */
export const ALL_ELEMENT_FX = 0.5;
export const ALL_ELEMENT_FY = 0.2;

export interface CityGate {
  side: GateSide;
  toRoom: number;
  x: number;
  y: number;
}

export interface CityMapHooks {
  onRoomChanged?: (room: number) => void;
}

export class CityMap implements InvasionMap {
  hp: number[] = [];
  lost: boolean[] = [];
  currentRoom = CITY_MAIN;
  /** Every lane the current wave is pouring out of. */
  private targets = new Set<number>();

  private floorG: Phaser.GameObjects.Graphics | null = null;
  private trimG: Phaser.GameObjects.Graphics | null = null;
  private pulseG: Phaser.GameObjects.Graphics | null = null;
  private roomLabel: Phaser.GameObjects.Text | null = null;
  private fadeRect: Phaser.GameObjects.Rectangle | null = null;
  private mapG: Phaser.GameObjects.Graphics | null = null;
  private mapCounts: Phaser.GameObjects.Text[] = [];
  private travelBlockedUntil = 0;
  private traveling = false;
  private themeColor: number | null = null;

  constructor(private scene: Phaser.Scene, private hooks: CityMapHooks = {}) {}

  private get W(): number { return this.scene.scale.width; }
  private get H(): number { return this.scene.scale.height; }

  // ── InvasionMap ───────────────────────────────────────────────────

  get isApocalypse(): boolean { return false; }
  setApocalypse(_on: boolean): void { /* the city has no eye in its cellar */ }
  setCorruptionReadout(_levels: number[]): void { /* nor any corruption */ }
  setTheme(color: number | null): void { this.themeColor = color; }

  roomMeta(room: number): MapRoomMeta {
    return CITY_META[room] ?? CITY_META[0];
  }

  reset(): void {
    // The lanes are roads, not rooms with walls — nothing here can be gnawed down.
    this.hp = CITY_META.map(() => Infinity);
    this.lost = CITY_META.map(() => false);
    this.currentRoom = CITY_MAIN;
    this.targets.clear();
    this.travelBlockedUntil = 0;
    this.traveling = false;

    this.floorG?.destroy();
    this.floorG = this.scene.add.graphics().setDepth(0.6);
    this.trimG?.destroy();
    this.trimG = this.scene.add.graphics().setDepth(1.4);
    this.pulseG?.destroy();
    this.pulseG = this.scene.add.graphics().setDepth(1.6);
    this.roomLabel?.destroy();
    this.roomLabel = this.scene.add.text(16, 142, '', {
      fontSize: '13px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
      color: '#e8dcb8', stroke: '#171008', strokeThickness: 3,
    }).setDepth(25);
    this.fadeRect?.destroy();
    this.fadeRect = this.scene.add.rectangle(this.W / 2, this.H / 2, this.W + 4, this.H + 4, 0x000000, 1)
      .setDepth(40).setAlpha(0).setVisible(false);
    this.buildMinimap();
    this.drawRoom();
  }

  destroyHud(): void {
    this.floorG?.destroy(); this.floorG = null;
    this.trimG?.destroy(); this.trimG = null;
    this.pulseG?.destroy(); this.pulseG = null;
    this.roomLabel?.destroy(); this.roomLabel = null;
    this.fadeRect?.destroy(); this.fadeRect = null;
    this.mapG?.destroy(); this.mapG = null;
    for (const t of this.mapCounts) t.destroy();
    this.mapCounts = [];
  }

  standingRooms(): number[] { return [...CITY_LANES]; }
  allOuterRoomsLost(): boolean { return false; }
  damageRoom(_room: number, _amount: number): boolean { return false; }

  setTarget(room: number, second = -1): void {
    this.targets.clear();
    if (room >= 0) this.targets.add(room);
    if (second >= 0) this.targets.add(second);
  }

  /** A city wave may come out of all three lanes at once. */
  setTargets(rooms: number[]): void {
    this.targets = new Set(rooms.filter((r) => r >= 0));
  }

  isTargeted(room: number): boolean { return this.targets.has(room); }

  /** Where husks climb out: the rift at the far end of a lane. */
  windowSpawn(room: number, rand: () => number): { x: number; y: number } {
    const r = this.riftOf(room);
    const along = (rand() - 0.5) * r.spread;
    const jitter = (rand() - 0.5) * 24;
    return r.vertical
      ? { x: r.x + along, y: r.y + jitter }
      : { x: r.x + jitter, y: r.y + along };
  }

  // ── Layout ────────────────────────────────────────────────────────

  private gatePos(side: GateSide): { x: number; y: number } {
    const W = this.W, H = this.H;
    switch (side) {
      case 'n': return { x: W / 2, y: KERB + 6 };
      case 's': return { x: W / 2, y: H - KERB - 6 };
      case 'e': return { x: W - KERB - 6, y: H * 0.62 };
      default:  return { x: KERB + 6, y: H * 0.62 };
    }
  }

  /** Lane gates sit mid-side: the lane road runs straight through the screen. */
  private laneGatePos(side: GateSide): { x: number; y: number } {
    const W = this.W, H = this.H;
    switch (side) {
      case 'n': return { x: W / 2, y: KERB + 6 };
      case 's': return { x: W / 2, y: H - KERB - 6 };
      case 'e': return { x: W - KERB - 6, y: H / 2 };
      default:  return { x: KERB + 6, y: H / 2 };
    }
  }

  gatesOf(room: number): CityGate[] {
    if (room === CITY_MAIN) {
      return CITY_LANES.map((r) => {
        const side = CITY_META[r].side!;
        return { side, toRoom: r, ...this.gatePos(side) };
      });
    }
    const side = OPPOSITE[CITY_META[room].side!];
    return [{ side, toRoom: CITY_MAIN, ...this.laneGatePos(side) }];
  }

  /** A lane's way out onto Main Street. Husks march here when nobody is in reach. */
  laneExit(room: number): { x: number; y: number } {
    return this.gatesOf(room)[0];
  }

  /** Where something stepping through `fromLane`'s gate lands on Main Street. */
  mainArrival(fromLane: number): { x: number; y: number } {
    const side = CITY_META[fromLane].side!;
    const g = this.gatePos(side);
    const inset = 64;
    return {
      x: g.x + (side === 'w' ? inset : side === 'e' ? -inset : 0),
      y: g.y + (side === 's' ? -inset : side === 'n' ? inset : 0),
    };
  }

  /** Where something stepping off Main Street into `lane` lands. */
  laneArrival(lane: number): { x: number; y: number } {
    const g = this.laneExit(lane);
    const side = OPPOSITE[CITY_META[lane].side!];
    const inset = 64;
    return {
      x: g.x + (side === 'w' ? inset : side === 'e' ? -inset : 0),
      y: g.y + (side === 's' ? -inset : side === 'n' ? inset : 0),
    };
  }

  /** The All-Element's plinth. */
  allElementPos(): { x: number; y: number } {
    return { x: this.W * ALL_ELEMENT_FX, y: this.H * ALL_ELEMENT_FY };
  }

  private riftOf(room: number): { x: number; y: number; spread: number; vertical: boolean } {
    const W = this.W, H = this.H;
    switch (room) {
      case CITY_RED:    return { x: KERB + 40, y: H / 2, spread: H * 0.42, vertical: false };
      case CITY_GREEN:  return { x: W / 2, y: H - KERB - 40, spread: W * 0.4, vertical: true };
      case CITY_YELLOW: return { x: W - KERB - 40, y: H / 2, spread: H * 0.42, vertical: false };
      default:          return { x: W / 2, y: H / 2, spread: 60, vertical: true };
    }
  }

  // ── Travel ────────────────────────────────────────────────────────

  update(
    time: number,
    player: { x: number; y: number; body: Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | null },
    huskCounts: number[],
  ): void {
    this.drawGatePulses(time);
    this.updateMinimap(time, huskCounts);
    if (this.traveling || time < this.travelBlockedUntil) return;
    for (const gate of this.gatesOf(this.currentRoom)) {
      if (Phaser.Math.Distance.Between(player.x, player.y, gate.x, gate.y) > GATE_TRIGGER) continue;
      this.travel(gate, player);
      break;
    }
  }

  private travel(
    gate: CityGate,
    player: { x: number; y: number; body: Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | null },
  ): void {
    this.traveling = true;
    const from = this.currentRoom;
    const dest = gate.toRoom;
    const arrival = dest === CITY_MAIN ? this.mainArrival(from) : this.laneArrival(dest);
    const fade = this.fadeRect;
    if (!fade) { this.traveling = false; return; }
    fade.setVisible(true).setAlpha(0);
    this.scene.tweens.add({
      targets: fade, alpha: 1, duration: FADE_MS, ease: 'Quad.easeIn',
      onComplete: () => {
        this.currentRoom = dest;
        (player.body as Phaser.Physics.Arcade.Body | null)?.reset(arrival.x, arrival.y);
        this.drawRoom();
        this.hooks.onRoomChanged?.(dest);
        this.scene.tweens.add({
          targets: fade, alpha: 0, duration: FADE_MS, ease: 'Quad.easeOut',
          onComplete: () => {
            fade.setVisible(false);
            this.traveling = false;
            this.travelBlockedUntil = this.scene.time.now + TRAVEL_COOLDOWN_MS;
          },
        });
      },
    });
  }

  /** Instant move with no gate — the plinth standing a fallen defender back up. */
  jumpTo(room: number): void {
    if (room === this.currentRoom) return;
    this.currentRoom = room;
    this.drawRoom();
    this.hooks.onRoomChanged?.(room);
  }

  // ── Painting ──────────────────────────────────────────────────────

  drawRoom(): void {
    const g = this.floorG, t = this.trimG;
    if (!g || !t) return;
    g.clear();
    t.clear();
    if (this.currentRoom === CITY_MAIN) this.paintMain(g, t);
    else this.paintLane(g, t, this.currentRoom);
    for (const gate of this.gatesOf(this.currentRoom)) this.paintGate(t, gate);
    if (this.themeColor !== null) {
      t.fillStyle(this.themeColor, 0.08);
      t.fillRect(0, 0, this.W, this.H);
    }
    const meta = CITY_META[this.currentRoom];
    this.roomLabel?.setText(`${meta.emoji} ${meta.name}`).setColor(meta.hex);
  }

  /** Deterministic noise so a district looks the same every visit. */
  private rng(seed: number): () => number {
    let s = seed * 9973 + 12345;
    return () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s / 0x7fffffff;
    };
  }

  /** Cobbles: offset rows of rounded stones with a lit top edge. */
  private paintCobbles(g: Phaser.GameObjects.Graphics, x0: number, y0: number, x1: number, y1: number,
    base: number, light: number, rnd: () => number): void {
    g.fillStyle(base, 1);
    g.fillRect(x0, y0, x1 - x0, y1 - y0);
    const cw = 26, ch = 16;
    for (let y = y0, row = 0; y < y1; y += ch, row++) {
      for (let x = x0 - (row % 2 ? cw / 2 : 0); x < x1; x += cw) {
        const shade = 0.08 + rnd() * 0.12;
        g.fillStyle(light, shade);
        g.fillRoundedRect(Math.max(x0, x + 2), y + 2, Math.min(cw - 4, x1 - x - 2), ch - 4, 4);
      }
    }
  }

  /** A top-down roof block: slab, ridge, parapet, a chimney or a vent, lit windows on the street face. */
  private paintBuilding(t: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number,
    roof: number, accent: number, rnd: () => number, streetFace: GateSide): void {
    t.fillStyle(0x000000, 0.35);
    t.fillRect(x + 5, y + 5, w, h);
    t.fillStyle(roof, 1);
    t.fillRect(x, y, w, h);
    t.lineStyle(2, Phaser.Display.Color.ValueToColor(roof).darken(30).color, 1);
    t.strokeRect(x, y, w, h);
    // Parapet inset and a ridge line down the long axis.
    t.lineStyle(1, Phaser.Display.Color.ValueToColor(roof).lighten(18).color, 0.8);
    t.strokeRect(x + 5, y + 5, w - 10, h - 10);
    if (w > h) t.lineBetween(x + 8, y + h / 2, x + w - 8, y + h / 2);
    else t.lineBetween(x + w / 2, y + 8, x + w / 2, y + h - 8);
    // Chimney or a rooftop vent.
    const cx = x + 10 + rnd() * Math.max(1, w - 30);
    const cy = y + 10 + rnd() * Math.max(1, h - 30);
    if (rnd() < 0.5) {
      t.fillStyle(0x5a3a2a, 1);
      t.fillRect(cx, cy, 12, 12);
      t.fillStyle(0x1a1010, 1);
      t.fillRect(cx + 3, cy + 3, 6, 6);
    } else {
      t.fillStyle(0x6a7078, 1);
      t.fillCircle(cx + 6, cy + 6, 7);
      t.lineStyle(1, 0x30343a, 1);
      t.lineBetween(cx, cy + 6, cx + 12, cy + 6);
      t.lineBetween(cx + 6, cy, cx + 6, cy + 12);
    }
    // An awning in the district colour along the face that looks at the street.
    t.fillStyle(accent, 0.85);
    const stripes = 6;
    if (streetFace === 's' || streetFace === 'n') {
      const ay = streetFace === 's' ? y + h - 2 : y - 6;
      for (let i = 0; i < stripes; i++) {
        t.fillStyle(i % 2 ? accent : 0xf0e8d8, 0.9);
        t.fillRect(x + 6 + (i * (w - 12)) / stripes, ay, (w - 12) / stripes, 8);
      }
    } else {
      const ax = streetFace === 'e' ? x + w - 2 : x - 6;
      for (let i = 0; i < stripes; i++) {
        t.fillStyle(i % 2 ? accent : 0xf0e8d8, 0.9);
        t.fillRect(ax, y + 6 + (i * (h - 12)) / stripes, 8, (h - 12) / stripes);
      }
    }
  }

  private paintLamp(t: Phaser.GameObjects.Graphics, x: number, y: number, glow: number): void {
    t.fillStyle(glow, 0.1);
    t.fillCircle(x, y, 46);
    t.fillStyle(glow, 0.14);
    t.fillCircle(x, y, 26);
    t.fillStyle(0x22262c, 1);
    t.fillCircle(x, y, 7);
    t.fillStyle(0xfff2c0, 1);
    t.fillCircle(x, y, 4);
  }

  private paintMain(g: Phaser.GameObjects.Graphics, t: Phaser.GameObjects.Graphics): void {
    const W = this.W, H = this.H;
    const rnd = this.rng(1);
    // Asphalt everywhere, then the plaza and the three roads on top.
    g.fillStyle(0x2a2c30, 1);
    g.fillRect(0, 0, W, H);
    const road = 120;
    g.fillStyle(0x34373c, 1);
    g.fillRect(0, H * 0.62 - road / 2, W, road);            // the cross street, red ↔ yellow
    g.fillRect(W / 2 - road / 2, H * 0.3, road, H * 0.7);   // the avenue, green → plaza
    // Lane markings.
    g.fillStyle(0xd8c070, 0.7);
    for (let x = 40; x < W - 40; x += 46) {
      if (Math.abs(x + 12 - W / 2) < road / 2 + 10) continue;
      g.fillRect(x, H * 0.62 - 2, 24, 4);
    }
    for (let y = H * 0.62 + road / 2 + 20; y < H - 40; y += 46) g.fillRect(W / 2 - 2, y, 4, 24);
    // Zebra crossing where the avenue meets the cross street.
    g.fillStyle(0xe8e4d8, 0.55);
    for (let i = 0; i < 7; i++) g.fillRect(W / 2 - road / 2 + 6 + i * 16, H * 0.62 + road / 2 + 4, 9, 22);

    // The plaza: a cobbled circle around the plinth, a ring of paving, kerbs.
    const p = this.allElementPos();
    g.fillStyle(0x56504a, 1);
    g.fillCircle(p.x, p.y + 20, 150);
    const plaza = this.rng(7);
    for (let ring = 0; ring < 6; ring++) {
      const r = 30 + ring * 20;
      const n = 10 + ring * 7;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + ring * 0.2;
        g.fillStyle(0x8a8276, 0.18 + plaza() * 0.16);
        g.fillCircle(p.x + Math.cos(a) * r, p.y + 20 + Math.sin(a) * r * 0.9, 7);
      }
    }
    g.lineStyle(4, 0xa89c88, 1);
    g.strokeCircle(p.x, p.y + 20, 150);
    g.lineStyle(1, 0x2a2420, 0.8);
    g.strokeCircle(p.x, p.y + 20, 146);

    // Sidewalks along the cross street.
    g.fillStyle(0x6a665e, 1);
    g.fillRect(0, H * 0.62 - road / 2 - 18, W / 2 - road / 2, 18);
    g.fillRect(W / 2 + road / 2, H * 0.62 - road / 2 - 18, W / 2 - road / 2, 18);
    g.fillRect(0, H * 0.62 + road / 2, W / 2 - road / 2, 18);
    g.fillRect(W / 2 + road / 2, H * 0.62 + road / 2, W / 2 - road / 2, 18);

    // Buildings: two blocks flanking the plaza, two below the cross street.
    this.paintBuilding(t, KERB + 6, KERB + 6, W / 2 - 180 - KERB, H * 0.62 - road / 2 - 30 - KERB, 0x5a4a5e, 0xe0443a, rnd, 's');
    this.paintBuilding(t, W / 2 + 174, KERB + 6, W / 2 - 180 - KERB, H * 0.62 - road / 2 - 30 - KERB, 0x4e5a4a, 0xf2c94c, rnd, 's');
    this.paintBuilding(t, KERB + 6, H * 0.62 + road / 2 + 30, W / 2 - road / 2 - KERB - 34, H - (H * 0.62 + road / 2 + 30) - KERB - 6, 0x4a4e5e, 0x4ccf5a, rnd, 'n');
    this.paintBuilding(t, W / 2 + road / 2 + 28, H * 0.62 + road / 2 + 30, W / 2 - road / 2 - KERB - 34, H - (H * 0.62 + road / 2 + 30) - KERB - 6, 0x5e504a, 0x4ccf5a, rnd, 'n');

    // Streetlamps at the plaza mouth and along the cross street.
    for (const [lx, ly] of [[W / 2 - 160, H * 0.4], [W / 2 + 160, H * 0.4], [W * 0.2, H * 0.62 - road / 2 - 9],
      [W * 0.8, H * 0.62 - road / 2 - 9], [W * 0.2, H * 0.62 + road / 2 + 9], [W * 0.8, H * 0.62 + road / 2 + 9]] as const) {
      this.paintLamp(t, lx, ly, 0xffd890);
    }
    this.paintEdge(t);
  }

  private paintLane(g: Phaser.GameObjects.Graphics, t: Phaser.GameObjects.Graphics, room: number): void {
    const W = this.W, H = this.H;
    const meta = CITY_META[room];
    const rnd = this.rng(room + 3);
    const vertical = room === CITY_GREEN;
    const roadW = 200;
    // Each district has its own ground: red brick terraces, a green park, a yellow market.
    const ground = room === CITY_RED ? 0x3a2622 : room === CITY_GREEN ? 0x24362a : 0x3a3422;
    g.fillStyle(ground, 1);
    g.fillRect(0, 0, W, H);
    if (room === CITY_GREEN) {
      // Park lawns: tufts of grass and two round flower beds.
      for (let i = 0; i < 140; i++) {
        g.fillStyle(0x3a5a34, 0.4 + rnd() * 0.4);
        g.fillCircle(rnd() * W, rnd() * H, 2 + rnd() * 3);
      }
    }
    // The road itself.
    if (vertical) this.paintCobbles(g, W / 2 - roadW / 2, 0, W / 2 + roadW / 2, H, 0x3c3a36, 0xb0a890, rnd);
    else this.paintCobbles(g, 0, H / 2 - roadW / 2, W, H / 2 + roadW / 2, 0x3c3a36, 0xb0a890, rnd);
    // Gutters in the district colour.
    g.fillStyle(meta.accent, 0.35);
    if (vertical) { g.fillRect(W / 2 - roadW / 2 - 4, 0, 4, H); g.fillRect(W / 2 + roadW / 2, 0, 4, H); }
    else { g.fillRect(0, H / 2 - roadW / 2 - 4, W, 4); g.fillRect(0, H / 2 + roadW / 2, W, 4); }

    // Buildings on both sides of the road.
    const roofs = room === CITY_RED ? [0x6a3a30, 0x5a3028, 0x7a4436]
      : room === CITY_GREEN ? [0x3e5a3a, 0x4a6040, 0x36503a]
        : [0x6a5a30, 0x7a6838, 0x5e5028];
    if (vertical) {
      for (let y = KERB + 10, i = 0; y < H - KERB - 60; y += 150, i++) {
        const bh = 120;
        if (room === CITY_GREEN && i % 2 === 1) {
          // Park beds instead of every other block.
          t.fillStyle(0x2a4426, 1);
          t.fillCircle(W / 4 - 10, y + bh / 2, 46);
          t.fillCircle(W * 0.75 + 10, y + bh / 2, 46);
          for (let f = 0; f < 18; f++) {
            const a = rnd() * Math.PI * 2, r = rnd() * 40;
            t.fillStyle([0xff88aa, 0xffee66, 0xffffff][f % 3], 0.9);
            t.fillCircle(W / 4 - 10 + Math.cos(a) * r, y + bh / 2 + Math.sin(a) * r, 3);
            t.fillCircle(W * 0.75 + 10 + Math.sin(a) * r, y + bh / 2 + Math.cos(a) * r, 3);
          }
          continue;
        }
        this.paintBuilding(t, KERB + 6, y, W / 2 - roadW / 2 - KERB - 30, bh, roofs[i % 3], meta.accent, rnd, 'e');
        this.paintBuilding(t, W / 2 + roadW / 2 + 24, y, W / 2 - roadW / 2 - KERB - 30, bh, roofs[(i + 1) % 3], meta.accent, rnd, 'w');
      }
      for (let y = 80; y < H - 40; y += 160) {
        this.paintLamp(t, W / 2 - roadW / 2 - 14, y, meta.accent);
        this.paintLamp(t, W / 2 + roadW / 2 + 14, y + 80, meta.accent);
      }
    } else {
      for (let x = KERB + 90, i = 0; x < W - KERB - 120; x += 170, i++) {
        const bw = 140;
        if (room === CITY_YELLOW && i % 2 === 0) {
          // Market stalls: striped canopies with crates under them.
          for (const sy of [H / 2 - roadW / 2 - 70, H / 2 + roadW / 2 + 20]) {
            for (let s = 0; s < 7; s++) {
              t.fillStyle(s % 2 ? meta.accent : 0xf0e8d8, 0.95);
              t.fillRect(x + s * (bw / 7), sy, bw / 7, 46);
            }
            t.lineStyle(2, 0x3a2a10, 1);
            t.strokeRect(x, sy, bw, 46);
          }
          continue;
        }
        this.paintBuilding(t, x, KERB + 6, bw, H / 2 - roadW / 2 - KERB - 30, roofs[i % 3], meta.accent, rnd, 's');
        this.paintBuilding(t, x, H / 2 + roadW / 2 + 24, bw, H / 2 - roadW / 2 - KERB - 30, roofs[(i + 1) % 3], meta.accent, rnd, 'n');
      }
      for (let x = 120; x < W - 60; x += 200) {
        this.paintLamp(t, x, H / 2 - roadW / 2 - 14, meta.accent);
        this.paintLamp(t, x + 100, H / 2 + roadW / 2 + 14, meta.accent);
      }
    }
    this.paintRift(t, room);
    this.paintEdge(t);
  }

  /** The tear in the street the husks come up out of, at the far end of a lane. */
  private paintRift(t: Phaser.GameObjects.Graphics, room: number): void {
    const r = this.riftOf(room);
    const meta = CITY_META[room];
    const rnd = this.rng(room * 31);
    const len = r.spread + 40;
    t.save();
    t.translateCanvas(r.x, r.y);
    if (!r.vertical) t.rotateCanvas(Math.PI / 2);
    // Scorched ground first, then the jagged opening, then a sick inner glow.
    t.fillStyle(0x000000, 0.4);
    t.fillEllipse(0, 0, len + 60, 90);
    const pts: Phaser.Math.Vector2[] = [];
    const steps = 14;
    for (let i = 0; i <= steps; i++) {
      const x = -len / 2 + (i / steps) * len;
      pts.push(new Phaser.Math.Vector2(x, -10 - rnd() * 18 * Math.sin((i / steps) * Math.PI)));
    }
    for (let i = steps; i >= 0; i--) {
      const x = -len / 2 + (i / steps) * len;
      pts.push(new Phaser.Math.Vector2(x, 10 + rnd() * 18 * Math.sin((i / steps) * Math.PI)));
    }
    t.fillStyle(0x0a040c, 1);
    t.fillPoints(pts, true);
    t.lineStyle(3, meta.accent, 0.8);
    t.strokePoints(pts, true);
    t.fillStyle(meta.accent, 0.22);
    t.fillEllipse(0, 0, len * 0.8, 14);
    // Broken paving tipped into the tear.
    for (let i = 0; i < 8; i++) {
      t.fillStyle(0x5a554c, 1);
      const x = -len / 2 + rnd() * len;
      const y = (rnd() < 0.5 ? -1 : 1) * (22 + rnd() * 14);
      t.fillRect(x, y, 10 + rnd() * 10, 7);
    }
    t.restore();
  }

  /** The kerb band around the screen, so nothing reads as walking off the map. */
  private paintEdge(t: Phaser.GameObjects.Graphics): void {
    const W = this.W, H = this.H;
    t.fillStyle(0x16181c, 1);
    t.fillRect(0, 0, W, KERB);
    t.fillRect(0, H - KERB, W, KERB);
    t.fillRect(0, 0, KERB, H);
    t.fillRect(W - KERB, 0, KERB, H);
    t.lineStyle(2, 0x4a4e56, 1);
    t.strokeRect(KERB, KERB, W - KERB * 2, H - KERB * 2);
  }

  private paintGate(t: Phaser.GameObjects.Graphics, gate: CityGate): void {
    const laneRoom = gate.toRoom === CITY_MAIN ? this.currentRoom : gate.toRoom;
    const color = CITY_META[laneRoom].accent;
    const horizontal = gate.side === 'n' || gate.side === 's';
    const half = 46;
    // Clear the kerb, lay a threshold, raise two pillars and a lintel bar.
    t.fillStyle(0x34373c, 1);
    if (horizontal) t.fillRect(gate.x - half, gate.side === 'n' ? 0 : this.H - KERB, half * 2, KERB);
    else t.fillRect(gate.side === 'w' ? 0 : this.W - KERB, gate.y - half, KERB, half * 2);
    t.fillStyle(color, 0.25);
    t.fillCircle(gate.x, gate.y, 30);
    const pillars = horizontal
      ? [[gate.x - half - 8, gate.y], [gate.x + half + 8, gate.y]]
      : [[gate.x, gate.y - half - 8], [gate.x, gate.y + half + 8]];
    for (const [px, py] of pillars) {
      t.fillStyle(0x000000, 0.4);
      t.fillCircle(px + 3, py + 3, 13);
      t.fillStyle(0x8a8478, 1);
      t.fillCircle(px, py, 13);
      t.fillStyle(color, 1);
      t.fillCircle(px, py, 8);
      t.fillStyle(0xffffff, 0.5);
      t.fillCircle(px - 3, py - 3, 3);
    }
    t.lineStyle(6, color, 0.9);
    t.lineBetween(pillars[0][0], pillars[0][1], pillars[1][0], pillars[1][1]);
    t.lineStyle(2, 0xffffff, 0.35);
    t.lineBetween(pillars[0][0], pillars[0][1], pillars[1][0], pillars[1][1]);
  }

  private drawGatePulses(time: number): void {
    const g = this.pulseG;
    if (!g) return;
    g.clear();
    const pulse = 0.35 + Math.sin(time / 260) * 0.2;
    for (const gate of this.gatesOf(this.currentRoom)) {
      const lane = gate.toRoom === CITY_MAIN ? this.currentRoom : gate.toRoom;
      const hot = gate.toRoom === CITY_MAIN ? false : this.targets.has(gate.toRoom);
      const color = CITY_META[lane].accent;
      g.lineStyle(hot ? 3 : 2, hot ? 0xff5544 : color, hot ? pulse + 0.35 : pulse);
      g.strokeCircle(gate.x, gate.y, 24 + Math.sin(time / 260) * 3);
      if (!hot) continue;
      const a = gate.side === 'n' ? -Math.PI / 2 : gate.side === 's' ? Math.PI / 2 : gate.side === 'e' ? 0 : Math.PI;
      const ax = gate.x + Math.cos(a) * -54, ay = gate.y + Math.sin(a) * -54;
      const tipX = gate.x + Math.cos(a) * -34, tipY = gate.y + Math.sin(a) * -34;
      g.lineStyle(3, 0xff5544, 0.8);
      g.lineBetween(ax, ay, tipX, tipY);
      g.lineBetween(tipX, tipY, tipX + Math.cos(a + 2.6) * 9, tipY + Math.sin(a + 2.6) * 9);
      g.lineBetween(tipX, tipY, tipX + Math.cos(a - 2.6) * 9, tipY + Math.sin(a - 2.6) * 9);
    }
    // In a targeted lane, the rift itself breathes.
    if (this.currentRoom !== CITY_MAIN && this.targets.has(this.currentRoom)) {
      const r = this.riftOf(this.currentRoom);
      const len = r.spread + 40;
      g.fillStyle(CITY_META[this.currentRoom].accent, 0.12 + Math.sin(time / 180) * 0.08);
      if (r.vertical) g.fillEllipse(r.x, r.y, len, 60);
      else g.fillEllipse(r.x, r.y, 60, len);
    }
  }

  // ── Minimap ───────────────────────────────────────────────────────

  private mapCell(room: number): { x: number; y: number; w: number; h: number } {
    const cw = 30, ch = 22, gap = 3;
    const cx = 16 + cw + gap, cy = 84;
    switch (room) {
      case CITY_RED:    return { x: cx - cw - gap, y: cy, w: cw, h: ch };
      case CITY_GREEN:  return { x: cx, y: cy + ch + gap, w: cw, h: ch };
      case CITY_YELLOW: return { x: cx + cw + gap, y: cy, w: cw, h: ch };
      default:          return { x: cx, y: cy, w: cw, h: ch };
    }
  }

  private buildMinimap(): void {
    this.mapG?.destroy();
    this.mapG = this.scene.add.graphics().setDepth(25);
    for (const t of this.mapCounts) t.destroy();
    this.mapCounts = [];
    for (let r = 0; r < CITY_ROOM_COUNT; r++) {
      const c = this.mapCell(r);
      this.mapCounts.push(this.scene.add.text(c.x + c.w / 2, c.y + c.h / 2, '', {
        fontSize: '11px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
        color: '#ffffff', stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(26));
    }
  }

  private updateMinimap(time: number, huskCounts: number[]): void {
    const g = this.mapG;
    if (!g) return;
    g.clear();
    for (let r = 0; r < CITY_ROOM_COUNT; r++) {
      const c = this.mapCell(r);
      const meta = CITY_META[r];
      const hot = this.targets.has(r) && Math.sin(time / 140) > 0;
      g.fillStyle(hot ? 0x6a2020 : 0x1a1c20, 0.92);
      g.fillRect(c.x, c.y, c.w, c.h);
      g.fillStyle(meta.accent, 0.35);
      g.fillRect(c.x, c.y + c.h - 4, c.w, 4);
      g.lineStyle(r === this.currentRoom ? 2 : 1, r === this.currentRoom ? 0xffffff : meta.accent, 1);
      g.strokeRect(c.x, c.y, c.w, c.h);
      if (r === this.currentRoom) {
        g.fillStyle(0x88ff88, 1);
        g.fillCircle(c.x + 5, c.y + 5, 3);
      }
      if (r === CITY_MAIN) {
        // The All-Element's mote, top-centre of its cell.
        g.fillStyle(0xffffff, 0.6 + Math.sin(time / 300) * 0.3);
        g.fillCircle(c.x + c.w / 2, c.y + 5, 2.5);
      }
      const n = huskCounts[r] ?? 0;
      this.mapCounts[r]?.setText(n > 0 ? String(n) : '');
    }
  }
}
