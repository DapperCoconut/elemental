import Phaser from 'phaser';

/**
 * The mansion the invasion defends: a central hall with four rooms off it.
 *
 * Each room is one full screen. Doors sit on the edge shared with the hall;
 * walking onto one fades the screen and teleports you through, so the camera
 * never scrolls and every HUD in the game keeps working untouched. Husks pour
 * in through the windows of whichever room the wave targets, and a room that
 * takes too much damage is abandoned — boarded up, husk-free, and never
 * targeted again. Lose all four outer rooms and the mansion falls.
 *
 * This class owns layout, art, room HP and the minimap. It deliberately knows
 * nothing about husks or waves — InvasionKit (solo/host) and InvasionCoopKit
 * (guest) drive it and feed the minimap.
 */

export type RoomDir = 'n' | 's' | 'e' | 'w';

export interface RoomMeta {
  name: string;
  emoji: string;
  /** Direction of the hall door that leads here (from the hall's point of view). */
  dirFromHall: RoomDir;
  accent: number;
}

/** Index 0 is the hall — targetable by waves like any room, but indestructible. */
export const ROOM_META: RoomMeta[] = [
  { name: 'GRAND HALL', emoji: '🕯️', dirFromHall: 'n', accent: 0xb08d4f },
  { name: 'KITCHEN', emoji: '🍳', dirFromHall: 'n', accent: 0xd9b26a },
  { name: 'CELLAR', emoji: '🛢️', dirFromHall: 's', accent: 0x7a5c38 },
  { name: 'STUDY', emoji: '📚', dirFromHall: 'e', accent: 0x9a5a34 },
  { name: 'OBSERVATORY', emoji: '🔭', dirFromHall: 'w', accent: 0x4f9a7a },
];

export const HALL_ROOM = 0;
export const OUTER_ROOMS = [1, 2, 3, 4];
export const ROOM_MAX_HP = 300;

const WALL = 34;               // decorative wall thickness, px
const DOOR_HALF = 34;          // half-width of a doorway opening
const DOOR_TRIGGER = 46;       // how close the player must stand to travel
const TRAVEL_COOLDOWN_MS = 700;
const FADE_MS = 170;

const OPPOSITE: Record<RoomDir, RoomDir> = { n: 's', s: 'n', e: 'w', w: 'e' };

interface Door {
  dir: RoomDir;
  toRoom: number;
  x: number;
  y: number;
}

export interface MansionHooks {
  /** Fired after a completed door travel, with the room just entered. */
  onRoomChanged?: (room: number) => void;
}

export class Mansion {
  /** HP per room index; the hall (0) can be invaded but never damaged. */
  hp: number[] = [];
  lost: boolean[] = [];
  currentRoom = HALL_ROOM;
  targetRoom = -1;

  private floorG: Phaser.GameObjects.Graphics | null = null;
  private trimG: Phaser.GameObjects.Graphics | null = null;
  private doorPulseG: Phaser.GameObjects.Graphics | null = null;
  private roomLabel: Phaser.GameObjects.Text | null = null;
  private fadeRect: Phaser.GameObjects.Rectangle | null = null;
  private travelBlockedUntil = 0;
  private traveling = false;

  /** Campaign world hue the whole manor is washed toward; null = classic look. */
  private themeColor: number | null = null;

  // Minimap
  private mapG: Phaser.GameObjects.Graphics | null = null;
  private mapCounts: Phaser.GameObjects.Text[] = [];
  private mapSkull: Phaser.GameObjects.Text | null = null;

  constructor(private scene: Phaser.Scene, private hooks: MansionHooks = {}) {}

  private get W(): number { return this.scene.scale.width; }
  private get H(): number { return this.scene.scale.height; }

  /** Set before reset(). A campaign invasion tints the manor toward its world's element. */
  setTheme(color: number | null): void {
    this.themeColor = color;
  }

  /**
   * Shift `base` toward the theme hue while keeping its brightness, so every
   * room keeps its light-and-shadow structure but reads as the element's
   * world. The theme colour is first rescaled to the base colour's luminance —
   * without that, dark floors would blow out toward a bright element colour.
   */
  private themedColor(base: number): number {
    const t = this.themeColor;
    if (t === null) return base;
    const r = (base >> 16) & 0xff, g = (base >> 8) & 0xff, b = base & 0xff;
    const tr = (t >> 16) & 0xff, tg = (t >> 8) & 0xff, tb = t & 0xff;
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const themeLum = Math.max(24, 0.299 * tr + 0.587 * tg + 0.114 * tb);
    const k = lum / themeLum;
    const MIX = 0.5;
    const ch = (c: number, tc: number): number =>
      Math.max(0, Math.min(255, Math.round(c + (tc * k - c) * MIX)));
    return (ch(r, tr) << 16) | (ch(g, tg) << 8) | ch(b, tb);
  }

  /**
   * Route every colour painted on `g` through the theme mixer. Only the room
   * art layers get this — door pulses, the minimap and HP bars keep their
   * signal colours.
   */
  private themeGraphics(g: Phaser.GameObjects.Graphics): void {
    if (this.themeColor === null) return;
    const fill = g.fillStyle.bind(g);
    const line = g.lineStyle.bind(g);
    g.fillStyle = (color: number, alpha?: number) => fill(this.themedColor(color), alpha);
    g.lineStyle = (width: number, color: number, alpha?: number) =>
      line(width, this.themedColor(color), alpha);
  }

  reset(): void {
    this.hp = [Infinity, ROOM_MAX_HP, ROOM_MAX_HP, ROOM_MAX_HP, ROOM_MAX_HP];
    this.lost = [false, false, false, false, false];
    this.currentRoom = HALL_ROOM;
    this.targetRoom = -1;
    this.travelBlockedUntil = 0;
    this.traveling = false;

    this.floorG?.destroy();
    this.floorG = this.scene.add.graphics().setDepth(0.6);
    this.themeGraphics(this.floorG);
    this.trimG?.destroy();
    this.trimG = this.scene.add.graphics().setDepth(1.4);
    this.themeGraphics(this.trimG);
    this.doorPulseG?.destroy();
    this.doorPulseG = this.scene.add.graphics().setDepth(1.6);
    this.roomLabel?.destroy();
    // Sits directly under the minimap cross; the foot of the screen belongs
    // to the ability tray.
    this.roomLabel = this.scene.add.text(16, 152, '', {
      fontSize: '13px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
      color: '#d8c8a0', stroke: '#171008', strokeThickness: 3,
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
    this.doorPulseG?.destroy(); this.doorPulseG = null;
    this.roomLabel?.destroy(); this.roomLabel = null;
    this.fadeRect?.destroy(); this.fadeRect = null;
    this.mapG?.destroy(); this.mapG = null;
    for (const t of this.mapCounts) t.destroy();
    this.mapCounts = [];
    this.mapSkull?.destroy(); this.mapSkull = null;
  }

  // ── Layout ────────────────────────────────────────────────────────

  /** Doors of a room, at world positions on the current screen. */
  doorsOf(room: number): Door[] {
    const W = this.W, H = this.H;
    const at = (dir: RoomDir): { x: number; y: number } => (
      dir === 'n' ? { x: W / 2, y: WALL + 8 }
        : dir === 's' ? { x: W / 2, y: H - WALL - 8 }
          : dir === 'e' ? { x: W - WALL - 8, y: H / 2 }
            : { x: WALL + 8, y: H / 2 });
    if (room === HALL_ROOM) {
      return OUTER_ROOMS.map((r) => {
        const dir = ROOM_META[r].dirFromHall;
        return { dir, toRoom: r, ...at(dir) };
      });
    }
    const dir = OPPOSITE[ROOM_META[room].dirFromHall];
    return [{ dir, toRoom: HALL_ROOM, ...at(dir) }];
  }

  /**
   * Window positions of a room — where husks climb in. Spread along the walls
   * that don't hold its door, pushed just inside the playfield.
   */
  windowsOf(room: number): Array<{ x: number; y: number; dir: RoomDir }> {
    const W = this.W, H = this.H;
    const doorDirs = new Set(this.doorsOf(room).map((d) => d.dir));
    const spots: Array<{ x: number; y: number; dir: RoomDir }> = [];
    const y0 = WALL + 12, y1 = H - WALL - 12, x0 = WALL + 12, x1 = W - WALL - 12;
    if (!doorDirs.has('n')) { spots.push({ x: W * 0.28, y: y0, dir: 'n' }, { x: W * 0.72, y: y0, dir: 'n' }); }
    else { spots.push({ x: W * 0.16, y: y0, dir: 'n' }, { x: W * 0.84, y: y0, dir: 'n' }); }
    if (!doorDirs.has('s')) { spots.push({ x: W * 0.28, y: y1, dir: 's' }, { x: W * 0.72, y: y1, dir: 's' }); }
    else { spots.push({ x: W * 0.16, y: y1, dir: 's' }, { x: W * 0.84, y: y1, dir: 's' }); }
    if (!doorDirs.has('e')) spots.push({ x: x1, y: H * 0.5, dir: 'e' });
    else spots.push({ x: x1, y: H * 0.22, dir: 'e' });
    if (!doorDirs.has('w')) spots.push({ x: x0, y: H * 0.5, dir: 'w' });
    else spots.push({ x: x0, y: H * 0.22, dir: 'w' });
    return spots;
  }

  /** A random window spawn point of `room`, jittered a step into the floor. */
  windowSpawn(room: number, rand: () => number): { x: number; y: number } {
    const w = this.windowsOf(room);
    const s = w[Math.floor(rand() * w.length)] ?? w[0];
    const jx = (rand() - 0.5) * 26;
    const jy = (rand() - 0.5) * 26;
    const inX = s.dir === 'w' ? 26 : s.dir === 'e' ? -26 : 0;
    const inY = s.dir === 'n' ? 26 : s.dir === 's' ? -26 : 0;
    return { x: s.x + inX + jx, y: s.y + inY + jy };
  }

  // ── State ─────────────────────────────────────────────────────────

  /** Rooms a wave may still target. */
  standingRooms(): number[] {
    return OUTER_ROOMS.filter((r) => !this.lost[r]);
  }

  allOuterRoomsLost(): boolean {
    return this.standingRooms().length === 0;
  }

  setTarget(room: number): void {
    this.targetRoom = room;
  }

  /**
   * Chip a room. Returns true the moment this call is the one that loses it.
   * The hall can't be damaged.
   */
  damageRoom(room: number, amount: number): boolean {
    if (room === HALL_ROOM || this.lost[room] || amount <= 0) return false;
    this.hp[room] = Math.max(0, this.hp[room] - amount);
    if (this.hp[room] > 0) return false;
    this.lost[room] = true;
    if (this.targetRoom === room) this.targetRoom = -1;
    if (this.currentRoom === room) this.drawRoom();
    return true;
  }

  /** Guest-side: adopt the host's authoritative room state. */
  applyRemoteState(hp: number[], lostMask: number, target: number): void {
    let repaint = false;
    for (const r of OUTER_ROOMS) {
      const wasLost = this.lost[r];
      this.hp[r] = hp[r - 1] ?? this.hp[r];
      this.lost[r] = (lostMask & (1 << (r - 1))) !== 0;
      if (this.lost[r] !== wasLost && this.currentRoom === r) repaint = true;
    }
    this.targetRoom = target;
    if (repaint) this.drawRoom();
  }

  // ── Door travel ───────────────────────────────────────────────────

  /**
   * Per-frame: door pulses, room label, minimap refresh, and door travel for
   * the local player. `huskCounts` feeds the minimap badges.
   */
  update(
    time: number,
    player: { x: number; y: number; body: Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | null },
    huskCounts: number[],
  ): void {
    this.drawDoorPulses(time);
    this.updateMinimap(time, huskCounts);

    if (this.traveling || time < this.travelBlockedUntil) return;
    for (const door of this.doorsOf(this.currentRoom)) {
      if (Phaser.Math.Distance.Between(player.x, player.y, door.x, door.y) > DOOR_TRIGGER) continue;
      this.travel(door, player);
      break;
    }
  }

  private travel(
    door: Door,
    player: { x: number; y: number; body: Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | null },
  ): void {
    this.traveling = true;
    const dest = door.toRoom;
    // Arrive just inside the matching door of the destination room.
    const arrival = this.doorsOf(dest).find((d) => d.toRoom === this.currentRoom)
      ?? this.doorsOf(dest)[0];
    const inset = 64;
    const ax = arrival.x + (arrival.dir === 'w' ? inset : arrival.dir === 'e' ? -inset : 0);
    const ay = arrival.y + (arrival.dir === 'n' ? inset : arrival.dir === 's' ? -inset : 0);

    const fade = this.fadeRect;
    if (!fade) { this.traveling = false; return; }
    fade.setVisible(true).setAlpha(0);
    this.scene.tweens.add({
      targets: fade, alpha: 1, duration: FADE_MS, ease: 'Quad.easeIn',
      onComplete: () => {
        this.currentRoom = dest;
        (player.body as Phaser.Physics.Arcade.Body | null)?.reset(ax, ay);
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

  // ── Room painting ─────────────────────────────────────────────────

  drawRoom(): void {
    const g = this.floorG, t = this.trimG;
    if (!g || !t) return;
    g.clear();
    t.clear();
    const room = this.currentRoom;
    switch (room) {
      case 1: this.paintKitchen(g, t); break;
      case 2: this.paintCellar(g, t); break;
      case 3: this.paintStudy(g, t); break;
      case 4: this.paintGreenhouse(g, t); break;
      default: this.paintHall(g, t); break;
    }
    this.paintWalls(t, room);
    const meta = ROOM_META[room];
    this.roomLabel?.setText(
      this.lost[room] ? `${meta.emoji} ${meta.name} — ABANDONED` : `${meta.emoji} ${meta.name}`,
    ).setColor(this.lost[room] ? '#aa5544' : '#d8c8a0');
    // An abandoned room is washed in a cold grey pall.
    if (this.lost[room]) {
      t.fillStyle(0x1a1d22, 0.45);
      t.fillRect(0, 0, this.W, this.H);
    }
  }

  /** Wall frame, doorway arches and windows — shared by every room. */
  private paintWalls(t: Phaser.GameObjects.Graphics, room: number): void {
    const W = this.W, H = this.H;
    const doorDirs = new Map(this.doorsOf(room).map((d) => [d.dir, d] as const));

    // Wall band: dark timber with a lit inner trim.
    t.fillStyle(0x241a10, 1);
    t.fillRect(0, 0, W, WALL);
    t.fillRect(0, H - WALL, W, WALL);
    t.fillRect(0, 0, WALL, H);
    t.fillRect(W - WALL, 0, WALL, H);
    t.lineStyle(3, 0x4a3620, 1);
    t.strokeRect(WALL, WALL, W - WALL * 2, H - WALL * 2);
    t.lineStyle(1, 0x6a5232, 0.7);
    t.strokeRect(WALL + 4, WALL + 4, W - (WALL + 4) * 2, H - (WALL + 4) * 2);
    // Panel seams along the walls.
    t.lineStyle(1, 0x120c06, 0.8);
    for (let x = WALL; x < W - WALL; x += 72) { t.lineBetween(x, 0, x, WALL); t.lineBetween(x, H - WALL, x, H); }
    for (let y = WALL; y < H - WALL; y += 72) { t.lineBetween(0, y, WALL, y); t.lineBetween(W - WALL, y, W, y); }

    // Doorways: carve the opening, lay a warm threshold and a stone arch.
    for (const [dir, door] of doorDirs) {
      const horizontal = dir === 'n' || dir === 's';
      const dx = door.x, dy = dir === 'n' ? WALL / 2 : dir === 's' ? H - WALL / 2 : door.y;
      t.fillStyle(0x0c0804, 1);
      if (horizontal) t.fillRect(dx - DOOR_HALF, dir === 'n' ? 0 : H - WALL, DOOR_HALF * 2, WALL);
      else t.fillRect(dir === 'w' ? 0 : W - WALL, door.y - DOOR_HALF, WALL, DOOR_HALF * 2);
      t.fillStyle(0xc79b52, 0.16);
      t.fillCircle(door.x, door.y, 30);
      t.lineStyle(4, 0x8a6a3a, 1);
      if (horizontal) {
        t.lineBetween(dx - DOOR_HALF, dir === 'n' ? WALL : H - WALL, dx - DOOR_HALF, dir === 'n' ? 2 : H - 2);
        t.lineBetween(dx + DOOR_HALF, dir === 'n' ? WALL : H - WALL, dx + DOOR_HALF, dir === 'n' ? 2 : H - 2);
      } else {
        t.lineBetween(dir === 'w' ? WALL : W - WALL, door.y - DOOR_HALF, dir === 'w' ? 2 : W - 2, door.y - DOOR_HALF);
        t.lineBetween(dir === 'w' ? WALL : W - WALL, door.y + DOOR_HALF, dir === 'w' ? 2 : W - 2, door.y + DOOR_HALF);
      }
      void dy;
    }

    // Windows — leaded panes; boarded over once the room is lost.
    for (const win of this.windowsOf(room)) {
      const horizontal = win.dir === 'n' || win.dir === 's';
      const wx = win.x, wy = win.dir === 'n' ? WALL / 2 : win.dir === 's' ? H - WALL / 2 : win.y;
      const cx = win.dir === 'w' ? WALL / 2 : win.dir === 'e' ? W - WALL / 2 : wx;
      const halfL = 26, halfT = 9;
      const rw = horizontal ? halfL : halfT, rh = horizontal ? halfT : halfL;
      if (this.lost[room]) {
        t.fillStyle(0x3a2c1a, 1);
        t.fillRect(cx - rw, wy - rh, rw * 2, rh * 2);
        t.lineStyle(3, 0x5a4426, 1);
        t.lineBetween(cx - rw, wy - rh, cx + rw, wy + rh);
        t.lineBetween(cx - rw, wy + rh, cx + rw, wy - rh);
      } else {
        t.fillStyle(0x101c2c, 1);
        t.fillRect(cx - rw, wy - rh, rw * 2, rh * 2);
        t.fillStyle(0x2c4a72, 0.8);
        t.fillRect(cx - rw + 2, wy - rh + 2, rw * 2 - 4, rh * 2 - 4);
        t.lineStyle(1, 0x0a1220, 1);
        if (horizontal) {
          t.lineBetween(cx - rw / 2, wy - rh, cx - rw / 2, wy + rh);
          t.lineBetween(cx, wy - rh, cx, wy + rh);
          t.lineBetween(cx + rw / 2, wy - rh, cx + rw / 2, wy + rh);
        } else {
          t.lineBetween(cx - rw, wy - rh / 2, cx + rw, wy - rh / 2);
          t.lineBetween(cx - rw, wy, cx + rw, wy);
          t.lineBetween(cx - rw, wy + rh / 2, cx + rw, wy + rh / 2);
        }
        // Moonlight spilling onto the floor beneath the glass.
        t.fillStyle(0x9ab8e0, 0.05);
        const spillX = win.dir === 'w' ? WALL : win.dir === 'e' ? W - WALL - 40 : cx - 22;
        const spillY = win.dir === 'n' ? WALL : win.dir === 's' ? H - WALL - 40 : wy - 22;
        t.fillRect(spillX, spillY, horizontal ? 44 : 40, horizontal ? 40 : 44);
      }
    }
  }

  private paintHall(g: Phaser.GameObjects.Graphics, t: Phaser.GameObjects.Graphics): void {
    const W = this.W, H = this.H;
    // Checkered marble.
    const tile = 56;
    for (let x = 0; x < W; x += tile) {
      for (let y = 0; y < H; y += tile) {
        const even = ((x / tile) + (y / tile)) % 2 === 0;
        g.fillStyle(even ? 0x2a2622 : 0x38322c, 1);
        g.fillRect(x, y, tile, tile);
        g.lineStyle(1, 0x1c1814, 0.6);
        g.strokeRect(x, y, tile, tile);
      }
    }
    // The great crimson rug, fringed and bordered.
    const rw = W * 0.42, rh = H * 0.44;
    g.fillStyle(0x5a1620, 1);
    g.fillRect(W / 2 - rw / 2, H / 2 - rh / 2, rw, rh);
    g.fillStyle(0x76202c, 1);
    g.fillRect(W / 2 - rw / 2 + 10, H / 2 - rh / 2 + 10, rw - 20, rh - 20);
    g.lineStyle(2, 0xc79b52, 0.9);
    g.strokeRect(W / 2 - rw / 2 + 16, H / 2 - rh / 2 + 16, rw - 32, rh - 32);
    g.lineStyle(1, 0xc79b52, 0.55);
    g.strokeCircle(W / 2, H / 2, Math.min(rw, rh) * 0.26);
    g.strokeCircle(W / 2, H / 2, Math.min(rw, rh) * 0.2);
    // Rug medallion.
    g.fillStyle(0xc79b52, 0.85);
    g.fillCircle(W / 2, H / 2, 5);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      g.lineBetween(
        W / 2 + Math.cos(a) * 10, H / 2 + Math.sin(a) * 10,
        W / 2 + Math.cos(a) * Math.min(rw, rh) * 0.18, H / 2 + Math.sin(a) * Math.min(rw, rh) * 0.18,
      );
    }
    // Chandelier pool of candlelight (the fitting itself is "above" the view).
    t.fillStyle(0xffdf9a, 0.07);
    t.fillCircle(W / 2, H / 2, 170);
    t.fillStyle(0xffdf9a, 0.05);
    t.fillCircle(W / 2, H / 2, 110);
    // Column bases flanking each doorway direction.
    t.fillStyle(0x4a4038, 1);
    for (const [cx, cy] of [
      [W * 0.2, H * 0.2], [W * 0.8, H * 0.2], [W * 0.2, H * 0.8], [W * 0.8, H * 0.8],
    ] as const) {
      t.fillCircle(cx, cy, 13);
      t.lineStyle(2, 0x2a241e, 1);
      t.strokeCircle(cx, cy, 13);
      t.lineStyle(1, 0x6a5e52, 0.8);
      t.strokeCircle(cx, cy, 8);
    }
  }

  private paintKitchen(g: Phaser.GameObjects.Graphics, t: Phaser.GameObjects.Graphics): void {
    const W = this.W, H = this.H;
    // Warm terracotta tile.
    const tile = 46;
    for (let x = 0; x < W; x += tile) {
      for (let y = 0; y < H; y += tile) {
        const even = ((x / tile) + (y / tile)) % 2 === 0;
        g.fillStyle(even ? 0x6a4a30 : 0x5e4028, 1);
        g.fillRect(x, y, tile, tile);
      }
    }
    g.lineStyle(1, 0x40301e, 0.5);
    for (let x = 0; x < W; x += tile) g.lineBetween(x, 0, x, H);
    for (let y = 0; y < H; y += tile) g.lineBetween(0, y, W, y);

    // The long prep counter down the left third, scarred by knife work.
    const cx = W * 0.22, cw = 64, cy0 = H * 0.2, cy1 = H * 0.68;
    t.fillStyle(0x3a2c1c, 1);
    t.fillRect(cx - cw / 2 - 3, cy0 - 3, cw + 6, cy1 - cy0 + 6);
    t.fillStyle(0x8a6a44, 1);
    t.fillRect(cx - cw / 2, cy0, cw, cy1 - cy0);
    t.lineStyle(1, 0x5e462c, 0.9);
    for (let y = cy0 + 12; y < cy1; y += 16) t.lineBetween(cx - cw / 2 + 4, y, cx + cw / 2 - 4, y);
    // Knife scars + a cleaver left buried in the wood.
    t.lineStyle(1, 0x4a3520, 0.9);
    t.lineBetween(cx - 14, cy0 + 22, cx + 8, cy0 + 30);
    t.lineBetween(cx - 6, cy0 + 44, cx + 16, cy0 + 40);
    t.fillStyle(0xb8c4cc, 1);
    t.fillTriangle(cx + 2, cy1 - 30, cx + 22, cy1 - 38, cx + 20, cy1 - 24);
    t.fillStyle(0x2c2018, 1);
    t.fillRect(cx + 20, cy1 - 33, 14, 4);

    // The iron stove on the right wall, fire glowing in its grate.
    const sx = W * 0.82, sy = H * 0.32;
    t.fillStyle(0x1c1c20, 1);
    t.fillRect(sx - 34, sy - 26, 68, 52);
    t.lineStyle(2, 0x3a3a42, 1);
    t.strokeRect(sx - 34, sy - 26, 68, 52);
    t.fillStyle(0xff7a22, 0.9);
    t.fillRect(sx - 22, sy - 6, 44, 18);
    t.fillStyle(0xffc24d, 0.9);
    t.fillTriangle(sx - 14, sy + 12, sx - 8, sy - 2, sx - 2, sy + 12);
    t.fillTriangle(sx + 0, sy + 12, sx + 7, sy - 4, sx + 14, sy + 12);
    t.lineStyle(2, 0x0c0c10, 1);
    for (let i = -18; i <= 18; i += 9) t.lineBetween(sx + i, sy - 6, sx + i, sy + 12);
    t.fillStyle(0xff8a33, 0.08);
    t.fillCircle(sx, sy, 90);

    // Big soup pot with steam, and hanging pans along the top wall.
    const px = W * 0.6, py = H * 0.72;
    t.fillStyle(0x2e3038, 1);
    t.fillEllipse(px, py, 58, 40);
    t.fillStyle(0x474a56, 1);
    t.fillEllipse(px, py - 8, 50, 22);
    t.fillStyle(0x6a8a4a, 0.9);
    t.fillEllipse(px, py - 8, 40, 15);
    t.lineStyle(3, 0x22242a, 1);
    t.strokeEllipse(px, py, 58, 40);
    t.lineStyle(2, 0x9aa0ac, 0.35);
    t.strokeEllipse(px - 8, py - 26, 10, 16);
    t.strokeEllipse(px + 10, py - 34, 8, 14);
    for (let i = 0; i < 4; i++) {
      const hx = W * 0.36 + i * 52;
      t.fillStyle(0x3a3a42, 1);
      t.fillCircle(hx, WALL + 22, 12);
      t.fillStyle(0x24242a, 1);
      t.fillCircle(hx, WALL + 22, 7);
      t.lineStyle(2, 0x50505a, 1);
      t.lineBetween(hx + 10, WALL + 16, hx + 20, WALL + 8);
    }
    // A sack of flour and scattered onions by the counter.
    t.fillStyle(0xd8cdb4, 1);
    t.fillEllipse(W * 0.34, H * 0.78, 34, 26);
    t.fillStyle(0xbfb296, 1);
    t.fillEllipse(W * 0.34, H * 0.72, 22, 12);
    for (const [ox, oy] of [[W * 0.4, H * 0.82], [W * 0.43, H * 0.78], [W * 0.38, H * 0.86]] as const) {
      t.fillStyle(0xc9a25a, 1);
      t.fillCircle(ox, oy, 6);
      t.lineStyle(1, 0x8a6a34, 1);
      t.lineBetween(ox, oy - 6, ox, oy - 9);
    }
  }

  private paintCellar(g: Phaser.GameObjects.Graphics, t: Phaser.GameObjects.Graphics): void {
    const W = this.W, H = this.H;
    // Cold flagstones in broken courses.
    g.fillStyle(0x23262b, 1);
    g.fillRect(0, 0, W, H);
    g.lineStyle(1, 0x15171b, 1);
    const rowH = 40;
    for (let y = 0, row = 0; y < H; y += rowH, row++) {
      g.lineBetween(0, y, W, y);
      const off = row % 2 === 0 ? 0 : 44;
      for (let x = off; x < W; x += 88) g.lineBetween(x, y, x, y + rowH);
    }
    g.fillStyle(0x2e3238, 0.5);
    for (let i = 0; i < 14; i++) {
      g.fillRect(((i * 173) % W), ((i * 97 + 60) % H), 30, 18);
    }
    // Damp patches seeping through the stone.
    g.fillStyle(0x1a2228, 0.55);
    g.fillEllipse(W * 0.7, H * 0.75, 150, 80);
    g.fillEllipse(W * 0.2, H * 0.3, 100, 60);

    // Barrel rows on the left, banded in iron.
    for (const [bx, by] of [
      [W * 0.16, H * 0.24], [W * 0.24, H * 0.28], [W * 0.16, H * 0.4],
      [W * 0.25, H * 0.46], [W * 0.17, H * 0.58],
    ] as const) {
      t.fillStyle(0x101010, 0.4);
      t.fillEllipse(bx + 3, by + 16, 40, 12);
      t.fillStyle(0x5e442a, 1);
      t.fillEllipse(bx, by, 40, 34);
      t.fillStyle(0x74563a, 1);
      t.fillEllipse(bx, by - 4, 34, 24);
      t.lineStyle(2, 0x2c2c30, 1);
      t.strokeEllipse(bx, by, 40, 34);
      t.lineStyle(2, 0x3c3c44, 1);
      t.strokeEllipse(bx, by - 3, 37, 29);
      t.fillStyle(0x352513, 1);
      t.fillCircle(bx, by - 4, 5);
    }
    // Crates stacked by the far wall, one pried open.
    for (const [kx, ky, kw] of [
      [W * 0.74, H * 0.22, 54], [W * 0.83, H * 0.24, 44], [W * 0.78, H * 0.34, 50],
    ] as const) {
      t.fillStyle(0x4e3a22, 1);
      t.fillRect(kx - kw / 2, ky - kw / 3, kw, kw * 0.66);
      t.lineStyle(2, 0x332613, 1);
      t.strokeRect(kx - kw / 2, ky - kw / 3, kw, kw * 0.66);
      t.lineBetween(kx - kw / 2, ky - kw / 3, kx + kw / 2, ky + kw / 3);
      t.lineBetween(kx - kw / 2, ky + kw / 3, kx + kw / 2, ky - kw / 3);
    }
    t.fillStyle(0xd8c890, 0.55);
    t.fillEllipse(W * 0.78, H * 0.31, 26, 8);

    // A lonely lantern on a hook, its pool of light the only warmth down here.
    const lx = W * 0.52, ly = H * 0.5;
    t.fillStyle(0xffc86a, 0.1);
    t.fillCircle(lx, ly, 130);
    t.fillStyle(0xffc86a, 0.07);
    t.fillCircle(lx, ly, 70);
    t.fillStyle(0x2c2c30, 1);
    t.fillRect(lx - 5, ly - 16, 10, 22);
    t.fillStyle(0xffdf9a, 0.95);
    t.fillRect(lx - 3, ly - 12, 6, 12);
    t.lineStyle(2, 0x2c2c30, 1);
    t.strokeCircle(lx, ly - 18, 4);
    // Cobwebs in the corners.
    t.lineStyle(1, 0x9aa0ac, 0.28);
    for (const [cxx, cyy, sx, sy] of [
      [WALL, WALL, 1, 1], [W - WALL, WALL, -1, 1],
    ] as const) {
      for (let i = 1; i <= 3; i++) {
        t.strokeCircle(cxx, cyy, i * 12);
      }
      t.lineBetween(cxx, cyy, cxx + 38 * sx, cyy + 10 * sy);
      t.lineBetween(cxx, cyy, cxx + 10 * sx, cyy + 38 * sy);
      t.lineBetween(cxx, cyy, cxx + 27 * sx, cyy + 27 * sy);
    }
  }

  private paintStudy(g: Phaser.GameObjects.Graphics, t: Phaser.GameObjects.Graphics): void {
    const W = this.W, H = this.H;
    // Long dark floorboards.
    g.fillStyle(0x3c2c1c, 1);
    g.fillRect(0, 0, W, H);
    g.lineStyle(1, 0x291d12, 1);
    for (let y = 0; y < H; y += 26) g.lineBetween(0, y, W, y);
    g.lineStyle(1, 0x241a10, 0.7);
    for (let i = 0; i < 20; i++) g.lineBetween(((i * 199) % W), (i % 8) * 26 * 2.6, ((i * 199) % W), (i % 8) * 26 * 2.6 + 26);
    // A worn green reading rug.
    g.fillStyle(0x1e3a2a, 1);
    g.fillEllipse(W * 0.5, H * 0.55, W * 0.34, H * 0.3);
    g.lineStyle(2, 0xc79b52, 0.5);
    g.strokeEllipse(W * 0.5, H * 0.55, W * 0.3, H * 0.26);

    // Bookshelf banks along the top wall — spines in mismatched leathers.
    const shelfY = WALL + 4;
    for (let sx = W * 0.14; sx < W * 0.86; sx += 150) {
      t.fillStyle(0x2c1e10, 1);
      t.fillRect(sx, shelfY, 130, 44);
      t.lineStyle(2, 0x18100a, 1);
      t.strokeRect(sx, shelfY, 130, 44);
      t.lineBetween(sx, shelfY + 22, sx + 130, shelfY + 22);
      const spineColors = [0x7a3a2a, 0x3a5a7a, 0x5a7a3a, 0x7a6a3a, 0x5a3a6a, 0x8a5a2a];
      for (let row = 0; row < 2; row++) {
        let bx = sx + 4;
        let i = row * 3;
        while (bx < sx + 122) {
          const bw = 7 + ((i * 37) % 8);
          t.fillStyle(spineColors[i % spineColors.length], 1);
          t.fillRect(bx, shelfY + 3 + row * 22, bw, 17);
          t.lineStyle(1, 0x18100a, 0.7);
          t.lineBetween(bx + bw / 2, shelfY + 6 + row * 22, bx + bw / 2, shelfY + 9 + row * 22);
          bx += bw + 2;
          i++;
        }
      }
    }

    // The great desk — green leather top, strewn papers, inkwell and candle.
    const dx = W * 0.5, dy = H * 0.34;
    t.fillStyle(0x101010, 0.35);
    t.fillEllipse(dx + 4, dy + 30, 170, 30);
    t.fillStyle(0x4a3018, 1);
    t.fillRect(dx - 90, dy - 34, 180, 64);
    t.fillStyle(0x1e4030, 1);
    t.fillRect(dx - 80, dy - 26, 160, 48);
    t.lineStyle(2, 0xc79b52, 0.6);
    t.strokeRect(dx - 80, dy - 26, 160, 48);
    for (const [pxx, pyy, rot] of [[dx - 40, dy - 6, -0.2], [dx - 18, dy + 4, 0.15], [dx + 34, dy - 8, 0.3]] as const) {
      t.save();
      t.translateCanvas(pxx, pyy);
      t.rotateCanvas(rot);
      t.fillStyle(0xe8dfc8, 1);
      t.fillRect(-13, -9, 26, 18);
      t.lineStyle(1, 0x8a8068, 0.9);
      t.lineBetween(-9, -4, 9, -4);
      t.lineBetween(-9, 0, 9, 0);
      t.lineBetween(-9, 4, 4, 4);
      t.restore();
    }
    t.fillStyle(0x14161c, 1);
    t.fillCircle(dx + 62, dy - 12, 6);
    t.fillStyle(0x2a66aa, 0.9);
    t.fillCircle(dx + 62, dy - 12, 3);
    t.fillStyle(0xe8dfc8, 1);
    t.fillRect(dx + 52, dy + 6, 4, 12);
    t.fillStyle(0xffc24d, 1);
    t.fillTriangle(dx + 54, dy + 2, dx + 51, dy + 8, dx + 57, dy + 8);
    t.fillStyle(0xffdf9a, 0.09);
    t.fillCircle(dx + 54, dy + 4, 80);

    // The standing globe in its wooden ring.
    const gx = W * 0.82, gy = H * 0.62;
    t.fillStyle(0x101010, 0.35);
    t.fillEllipse(gx + 2, gy + 26, 46, 12);
    t.fillStyle(0x2a4668, 1);
    t.fillCircle(gx, gy, 22);
    t.fillStyle(0x4a7a4a, 1);
    t.fillEllipse(gx - 6, gy - 6, 14, 10);
    t.fillEllipse(gx + 9, gy + 4, 10, 12);
    t.fillEllipse(gx - 2, gy + 12, 12, 7);
    t.lineStyle(2, 0x8a6a3a, 1);
    t.strokeCircle(gx, gy, 22);
    t.strokeEllipse(gx, gy, 22, 8);
    t.lineStyle(3, 0x5e462c, 1);
    t.lineBetween(gx - 24, gy - 8, gx - 20, gy + 24);
    t.lineBetween(gx + 24, gy - 8, gx + 20, gy + 24);
    t.lineBetween(gx - 20, gy + 24, gx + 20, gy + 24);
  }

  private paintGreenhouse(g: Phaser.GameObjects.Graphics, t: Phaser.GameObjects.Graphics): void {
    const W = this.W, H = this.H;
    // Slate floor washed in green glass-light.
    g.fillStyle(0x24322a, 1);
    g.fillRect(0, 0, W, H);
    g.lineStyle(1, 0x18241c, 1);
    for (let x = 0; x < W; x += 52) g.lineBetween(x, 0, x, H);
    for (let y = 0; y < H; y += 52) g.lineBetween(0, y, W, y);
    g.fillStyle(0x9ae8b0, 0.05);
    g.fillRect(0, 0, W, H);
    // The star skylight: a great round pane of night sky in the floor's centre
    // (the dome above, reflected in the polished stone).
    const cx = W * 0.5, cy = H * 0.44, R = Math.min(W, H) * 0.21;
    g.fillStyle(0x0c1428, 0.92);
    g.fillCircle(cx, cy, R);
    g.lineStyle(3, 0x8aa0b8, 0.9);
    g.strokeCircle(cx, cy, R);
    g.lineStyle(1, 0x8aa0b8, 0.45);
    g.strokeCircle(cx, cy, R * 0.66);
    g.lineBetween(cx - R, cy, cx + R, cy);
    g.lineBetween(cx, cy - R, cx, cy + R);
    for (let i = 0; i < 26; i++) {
      const a = (i * 137.5) * (Math.PI / 180);
      const r = ((i * 61) % 100) / 100 * R * 0.92;
      const sxx = cx + Math.cos(a) * r, syy = cy + Math.sin(a) * r;
      g.fillStyle(0xe8f0ff, i % 5 === 0 ? 0.95 : 0.6);
      g.fillCircle(sxx, syy, i % 5 === 0 ? 1.8 : 1);
    }
    g.fillStyle(0xd8e8ff, 0.9);
    g.fillCircle(cx + R * 0.4, cy - R * 0.3, 6);
    g.fillStyle(0x0c1428, 0.9);
    g.fillCircle(cx + R * 0.4 + 3, cy - R * 0.3 - 2, 5);

    // Planter troughs down both sides, leaves spilling over the brick.
    for (const side of [0.14, 0.86]) {
      const px = W * side;
      t.fillStyle(0x5e3a2a, 1);
      t.fillRect(px - 30, H * 0.2, 60, H * 0.5);
      t.lineStyle(2, 0x3c2418, 1);
      t.strokeRect(px - 30, H * 0.2, 60, H * 0.5);
      for (let y = H * 0.2; y < H * 0.7; y += 18) t.lineBetween(px - 30, y, px + 30, y);
      t.fillStyle(0x2a1c10, 1);
      t.fillRect(px - 24, H * 0.22, 48, H * 0.46);
      for (let i = 0; i < 9; i++) {
        const py = H * 0.24 + i * (H * 0.42 / 9);
        const lx = px + ((i % 2 === 0) ? -8 : 8);
        t.fillStyle(i % 3 === 0 ? 0x4a9a4a : 0x3a7a3a, 1);
        t.fillEllipse(lx, py, 22, 12);
        t.fillEllipse(lx + 10, py + 4, 14, 8);
        t.fillEllipse(lx - 10, py + 3, 14, 8);
        if (i % 4 === 1) {
          t.fillStyle(0xff8ab0, 1);
          t.fillCircle(lx + 4, py - 4, 3.5);
          t.fillStyle(0xffe0a0, 1);
          t.fillCircle(lx + 4, py - 4, 1.5);
        }
      }
    }

    // The brass telescope on its dais, aimed up through the dome.
    const tx = W * 0.5, ty = H * 0.78;
    t.fillStyle(0x101010, 0.35);
    t.fillEllipse(tx, ty + 18, 90, 18);
    t.fillStyle(0x4a4038, 1);
    t.fillEllipse(tx, ty + 12, 76, 20);
    t.fillStyle(0x5a5048, 1);
    t.fillEllipse(tx, ty + 8, 60, 14);
    t.lineStyle(4, 0x8a6a3a, 1);
    t.lineBetween(tx - 14, ty + 8, tx, ty - 10);
    t.lineBetween(tx + 14, ty + 8, tx, ty - 10);
    t.save();
    t.translateCanvas(tx, ty - 12);
    t.rotateCanvas(-0.62);
    t.fillStyle(0xc79b52, 1);
    t.fillRect(-8, -34, 16, 40);
    t.fillStyle(0xa87e3e, 1);
    t.fillRect(-10, -42, 20, 10);
    t.fillStyle(0x3a2c1c, 1);
    t.fillRect(-6, 4, 12, 6);
    t.lineStyle(1, 0x6a4e26, 1);
    t.lineBetween(-8, -20, 8, -20);
    t.lineBetween(-8, -8, 8, -8);
    t.restore();
    // Fireflies drifting between the planters.
    for (const [fx, fy] of [
      [W * 0.3, H * 0.3], [W * 0.68, H * 0.62], [W * 0.36, H * 0.7], [W * 0.66, H * 0.26],
    ] as const) {
      t.fillStyle(0xd8ff8a, 0.8);
      t.fillCircle(fx, fy, 2);
      t.fillStyle(0xd8ff8a, 0.18);
      t.fillCircle(fx, fy, 6);
    }
  }

  private drawDoorPulses(time: number): void {
    const g = this.doorPulseG;
    if (!g) return;
    g.clear();
    const pulse = 0.35 + Math.sin(time / 260) * 0.2;
    for (const door of this.doorsOf(this.currentRoom)) {
      const toLost = this.lost[door.toRoom];
      // The door glowing hot is the one that leads toward the targeted room.
      const leadsToTarget = this.targetRoom >= 0 && (
        door.toRoom === this.targetRoom
        || (this.currentRoom !== HALL_ROOM && door.toRoom === HALL_ROOM && this.targetRoom !== this.currentRoom));
      const color = toLost ? 0x555a60 : leadsToTarget ? 0xff5544 : 0xc79b52;
      g.lineStyle(2, color, leadsToTarget ? pulse + 0.3 : pulse);
      g.strokeCircle(door.x, door.y, 24 + Math.sin(time / 260) * 3);
      if (leadsToTarget) {
        g.lineStyle(3, 0xff5544, 0.75);
        const a = door.dir === 'n' ? -Math.PI / 2 : door.dir === 's' ? Math.PI / 2 : door.dir === 'e' ? 0 : Math.PI;
        const ax = door.x + Math.cos(a) * -46, ay = door.y + Math.sin(a) * -46;
        const tipX = door.x + Math.cos(a) * -30, tipY = door.y + Math.sin(a) * -30;
        g.lineBetween(ax, ay, tipX, tipY);
        g.lineBetween(tipX, tipY, tipX + Math.cos(a + 2.6) * 9, tipY + Math.sin(a + 2.6) * 9);
        g.lineBetween(tipX, tipY, tipX + Math.cos(a - 2.6) * 9, tipY + Math.sin(a - 2.6) * 9);
      }
    }
  }

  // ── Minimap ───────────────────────────────────────────────────────

  private mapCellRect(room: number): { x: number; y: number; w: number; h: number } {
    // Cross layout anchored top-left, below the LEAVE button — the top-right
    // corner belongs to the shard/difficulty labels and the status effect tray.
    const cw = 34, ch = 24, gap = 3;
    const cx = 16 + cw + gap;
    const cy = 92;
    switch (room) {
      case 1: return { x: cx, y: cy - ch - gap, w: cw, h: ch };            // kitchen — up
      case 2: return { x: cx, y: cy + ch + gap, w: cw, h: ch };            // cellar — down
      case 3: return { x: cx + cw + gap, y: cy, w: cw, h: ch };            // study — right
      case 4: return { x: cx - cw - gap, y: cy, w: cw, h: ch };            // observatory — left
      default: return { x: cx, y: cy, w: cw, h: ch };                       // hall — centre
    }
  }

  private buildMinimap(): void {
    this.mapG?.destroy();
    this.mapG = this.scene.add.graphics().setDepth(25);
    for (const t of this.mapCounts) t.destroy();
    this.mapCounts = [];
    for (let r = 0; r < 5; r++) {
      const c = this.mapCellRect(r);
      const txt = this.scene.add.text(c.x + c.w / 2, c.y + c.h / 2, '', {
        fontSize: '11px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
        color: '#c8ffa0', stroke: '#101c08', strokeThickness: 2,
      }).setOrigin(0.5).setDepth(26);
      this.mapCounts.push(txt);
    }
    this.mapSkull?.destroy();
    this.mapSkull = this.scene.add.text(0, 0, '🧟', { fontSize: '13px' })
      .setOrigin(0.5).setDepth(27).setVisible(false);
  }

  private updateMinimap(time: number, huskCounts: number[]): void {
    const g = this.mapG;
    if (!g) return;
    g.clear();
    for (let r = 0; r < 5; r++) {
      const c = this.mapCellRect(r);
      const isTarget = r === this.targetRoom;
      const flash = isTarget && Math.sin(time / 140) > 0;
      const fill = this.lost[r] ? 0x33262a : flash ? 0x6a2020 : 0x1e2416;
      g.fillStyle(fill, 0.92);
      g.fillRect(c.x, c.y, c.w, c.h);
      const stroke = this.lost[r] ? 0x6a4a50 : r === this.currentRoom ? 0xd8c8a0 : isTarget ? 0xff5544 : 0x5a6a42;
      g.lineStyle(r === this.currentRoom ? 2 : 1, stroke, 1);
      g.strokeRect(c.x, c.y, c.w, c.h);
      if (r !== HALL_ROOM) {
        // Room HP bar under the cell.
        const frac = this.lost[r] ? 0 : Math.max(0, this.hp[r]) / ROOM_MAX_HP;
        g.fillStyle(0x000000, 0.7);
        g.fillRect(c.x, c.y + c.h + 1, c.w, 3);
        g.fillStyle(frac > 0.5 ? 0x88cc44 : frac > 0.25 ? 0xffaa33 : 0xff4444, 1);
        g.fillRect(c.x, c.y + c.h + 1, c.w * frac, 3);
      }
      if (this.lost[r]) {
        g.lineStyle(2, 0xcc4444, 0.9);
        g.lineBetween(c.x + 4, c.y + 4, c.x + c.w - 4, c.y + c.h - 4);
        g.lineBetween(c.x + 4, c.y + c.h - 4, c.x + c.w - 4, c.y + 4);
      }
      if (r === this.currentRoom) {
        g.fillStyle(0x88ff88, 1);
        g.fillCircle(c.x + 6, c.y + 6, 3);
      }
      const count = huskCounts[r] ?? 0;
      this.mapCounts[r]?.setText(this.lost[r] ? '' : count > 0 ? String(count) : '');
    }
    if (this.mapSkull) {
      if (this.targetRoom >= 0) {
        const c = this.mapCellRect(this.targetRoom);
        this.mapSkull.setVisible(true).setPosition(c.x + c.w - 7, c.y + 7);
      } else {
        this.mapSkull.setVisible(false);
      }
    }
  }
}
