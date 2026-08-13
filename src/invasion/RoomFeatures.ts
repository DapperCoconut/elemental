import Phaser from 'phaser';
import { Fighter } from '../entities/Fighter';
import { Sfx } from '../audio';
import { HALL_ROOM } from './Mansion';

/**
 * The things in the mansion you can walk up to and use.
 *
 * Five props across the four wings, each on the same contract: stand close,
 * press E. The kit owns their art (a static layer repainted when you change
 * rooms, an animated layer redrawn every frame) and the proximity prompt; what
 * pressing E actually *does* is entirely the hooks' business, so InvasionKit
 * keeps the journal, the tonics, the eye, the telescope and the gramophone
 * wired to itself.
 *
 * The one prop that isn't a tap is the cellar's eye: it wants five unbroken
 * seconds of E, and letting go anywhere in that time throws the progress away.
 * The cellar holds the other odd one too — the gramophone in the far right
 * corner, as far from the goo as the room goes.
 */

export type FeatureKind = 'journal' | 'tonic' | 'eye' | 'telescope' | 'record';

interface Feature {
  kind: FeatureKind;
  room: number;
  x: number;
  y: number;
  radius: number;
  /** Index into `tonicsLeft` for tonic features; -1 otherwise. */
  slot: number;
}

export interface RoomFeatureHooks {
  readonly scene: Phaser.Scene;
  readonly player: Fighter;
  /** Room the local player is standing in. */
  currentRoom(): number;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  /** E on the Study table. */
  openJournal(): void;
  /** E on the telescope. */
  openTelescope(): void;
  /** E on the gramophone in the cellar's far corner. */
  openRecordPlayer(): void;
  /** E on a tonic that is still on the shelf. `slot` is 0–2. */
  drinkTonic(slot: number): void;
  /** Five seconds of E on the eye, completed. */
  wakeTheEye(): void;
  /** True once the apocalypse is running — the eye is spent and goes quiet. */
  apocalypseActive(): boolean;
  /** Overlays swallow interaction (you can't sip a tonic through the journal). */
  overlayOpen(): boolean;
  /** E again while the book or the sky is up shuts it. */
  closeOverlays(): void;
}

const PROMPT_RANGE = 68;
const EYE_HOLD_MS = 5000;

export class RoomFeatures {
  /** Three tonics for the whole house — and, in co-op, for the whole team. */
  tonicsLeft = [true, true, true];
  /** Set once anybody has discovered what the tonics have turned into. */
  private tonicTasted = false;

  private features: Feature[] = [];
  private staticG: Phaser.GameObjects.Graphics | null = null;
  private animG: Phaser.GameObjects.Graphics | null = null;
  private prompt: Phaser.GameObjects.Text | null = null;
  private paintedRoom = -1;

  /** ms of unbroken E already banked on the eye. */
  private eyeHold = 0;
  private eyeDone = false;

  constructor(private hooks: RoomFeatureHooks) {}

  reset(): void {
    const scene = this.hooks.scene;
    const W = scene.scale.width, H = scene.scale.height;
    this.tonicsLeft = [true, true, true];
    this.tonicTasted = false;
    this.eyeHold = 0;
    this.eyeDone = false;
    this.paintedRoom = -1;

    this.features = [
      // Kitchen — three bottles up on the high shelf along the top wall.
      { kind: 'tonic', room: 1, x: W * 0.40, y: 138, radius: 52, slot: 0 },
      { kind: 'tonic', room: 1, x: W * 0.50, y: 138, radius: 52, slot: 1 },
      { kind: 'tonic', room: 1, x: W * 0.60, y: 138, radius: 52, slot: 2 },
      // Cellar — the goo and the eye, back in the far corner…
      { kind: 'eye', room: 2, x: W * 0.14, y: H * 0.82, radius: 78, slot: -1 },
      // …and the gramophone diagonally opposite it, in the bottom right.
      { kind: 'record', room: 2, x: W * 0.84, y: H * 0.80, radius: 72, slot: -1 },
      // Study — the reading table with the journal open on it.
      { kind: 'journal', room: 3, x: W * 0.22, y: H * 0.74, radius: 66, slot: -1 },
      // Observatory — the telescope on its dais.
      { kind: 'telescope', room: 4, x: W * 0.5, y: H * 0.74, radius: 76, slot: -1 },
    ];

    this.staticG?.destroy();
    this.staticG = scene.add.graphics().setDepth(1.5);
    this.animG?.destroy();
    this.animG = scene.add.graphics().setDepth(1.55);
    this.prompt?.destroy();
    this.prompt = scene.add.text(0, 0, '', {
      fontSize: '13px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
      color: '#ffe6a0', stroke: '#1a1006', strokeThickness: 4,
      // Above the apocalypse fog (19) — the prompt must stay readable in the dark.
    }).setOrigin(0.5).setDepth(19.5).setVisible(false);
  }

  destroy(): void {
    this.staticG?.destroy(); this.staticG = null;
    this.animG?.destroy(); this.animG = null;
    this.prompt?.destroy(); this.prompt = null;
  }

  /** Guest-side: the host owns the shelf. */
  applyRemoteTonics(mask: number): void {
    for (let i = 0; i < 3; i++) this.tonicsLeft[i] = (mask & (1 << i)) !== 0;
    this.paintedRoom = -1; // force a repaint so an emptied slot clears
  }

  /** Bitmask of tonics still on the shelf, for the co-op snapshot. */
  tonicMask(): number {
    let m = 0;
    for (let i = 0; i < 3; i++) if (this.tonicsLeft[i]) m |= 1 << i;
    return m;
  }

  /** Progress on the eye, 0–1, for the on-screen ring. */
  get eyeProgress(): number { return Math.min(1, this.eyeHold / EYE_HOLD_MS); }

  // ── Frame ─────────────────────────────────────────────────────────

  /**
   * Interaction pass. Returns true when this frame's E belonged to a prop, so
   * ArenaScene can hold the element's ability input for that frame instead of
   * casting an E ability into the wine cellar.
   */
  handleInput(eKey: Phaser.Input.Keyboard.Key, delta: number): boolean {
    if (this.hooks.overlayOpen()) {
      this.eyeHold = 0;
      // Same key closes it — otherwise the only way out is the ✕.
      if (Phaser.Input.Keyboard.JustDown(eKey)) this.hooks.closeOverlays();
      return true;
    }
    const near = this.nearest();
    if (!near) { this.eyeHold = 0; return false; }

    if (near.kind === 'eye') {
      if (this.eyeDone || this.hooks.apocalypseActive()) return false;
      if (!eKey.isDown) { this.eyeHold = 0; return false; }
      const was = this.eyeHold;
      this.eyeHold += delta;
      // A heartbeat under the hold, quickening as it fills.
      const step = 900 - this.eyeProgress * 500;
      if (Math.floor(was / step) !== Math.floor(this.eyeHold / step)) {
        Sfx.play('drum-hit', { rate: 0.6 + this.eyeProgress * 0.5 });
        this.hooks.scene.cameras.main.shake(90, 0.0015 + this.eyeProgress * 0.004);
      }
      if (this.eyeHold >= EYE_HOLD_MS) {
        this.eyeDone = true;
        this.eyeHold = 0;
        this.hooks.wakeTheEye();
      }
      return true;
    }

    if (!Phaser.Input.Keyboard.JustDown(eKey)) return false;
    switch (near.kind) {
      case 'journal':
        this.hooks.openJournal();
        return true;
      case 'telescope':
        this.hooks.openTelescope();
        return true;
      case 'record':
        this.hooks.openRecordPlayer();
        return true;
      case 'tonic':
        if (!this.tonicsLeft[near.slot]) return false;
        this.tonicTasted = true;
        this.hooks.drinkTonic(near.slot);
        this.paintedRoom = -1;
        return true;
      default:
        return false;
    }
  }

  /** Host-side bookkeeping when a tonic is actually taken off the shelf. */
  consumeTonic(slot: number): void {
    if (slot < 0 || slot > 2) return;
    this.tonicsLeft[slot] = false;
    this.tonicTasted = true;
    this.paintedRoom = -1;
  }

  update(time: number): void {
    const room = this.hooks.currentRoom();
    if (room !== this.paintedRoom) {
      this.paintedRoom = room;
      this.paintStatic(room);
    }
    this.paintAnimated(room, time);
    this.updatePrompt();
  }

  // ── Proximity ─────────────────────────────────────────────────────

  private nearest(): Feature | null {
    const room = this.hooks.currentRoom();
    if (room === HALL_ROOM) return null;
    const p = this.hooks.player;
    let best: Feature | null = null;
    let bestD = Infinity;
    for (const f of this.features) {
      if (f.room !== room) continue;
      if (f.kind === 'eye' && (this.eyeDone || this.hooks.apocalypseActive())) continue;
      if (f.kind === 'tonic' && !this.tonicsLeft[f.slot]) continue;
      const d = Phaser.Math.Distance.Between(p.x, p.y, f.x, f.y);
      if (d <= Math.min(f.radius, PROMPT_RANGE) && d < bestD) { bestD = d; best = f; }
    }
    return best;
  }

  private updatePrompt(): void {
    const t = this.prompt;
    if (!t) return;
    if (this.hooks.overlayOpen()) { t.setVisible(false); return; }
    const near = this.nearest();
    if (!near) { t.setVisible(false); return; }
    const text = near.kind === 'journal' ? '[E]  READ THE JOURNAL'
      : near.kind === 'telescope' ? '[E]  LOOK THROUGH THE TELESCOPE'
        : near.kind === 'record' ? '[E]  PUT THE NEEDLE DOWN'
          : near.kind === 'eye'
            ? (this.eyeHold > 0
              ? `HOLD [E]…  ${Math.round(this.eyeProgress * 100)}%`
              : '[E]  TOUCH IT  (hold)')
            : this.tonicTasted ? '[E]  DRINK  (spoiled)' : '[E]  DRINK THE TONIC';
    // Props near the ceiling get their label underneath, so it never lands in
    // the wave banner or the health bar at the top of the screen.
    const above = near.y > this.hooks.scene.scale.height * 0.34;
    t.setText(text)
      .setColor(near.kind === 'eye' ? '#ff8899' : this.tonicTasted && near.kind === 'tonic' ? '#c9a06a' : '#ffe6a0')
      .setPosition(near.x, near.y + (above ? -48 : 54))
      .setVisible(true);
  }

  // ── Art ───────────────────────────────────────────────────────────

  private paintStatic(room: number): void {
    const g = this.staticG;
    if (!g) return;
    g.clear();
    switch (room) {
      case 1: this.paintShelf(g); break;
      case 2: this.paintGoo(g); this.paintGramophone(g); break;
      case 3: this.paintTable(g); break;
      case 4: this.paintTelescope(g); break;
      default: break;
    }
  }

  /** Kitchen: the high shelf, the three bottles, and the gaps where one was. */
  private paintShelf(g: Phaser.GameObjects.Graphics): void {
    const shelfY = 154;
    const x0 = this.hooks.scene.scale.width * 0.34;
    const x1 = this.hooks.scene.scale.width * 0.66;
    // Bracketed plank.
    g.fillStyle(0x000000, 0.3);
    g.fillRect(x0, shelfY + 5, x1 - x0, 7);
    g.fillStyle(0x6a4c2c, 1);
    g.fillRect(x0, shelfY, x1 - x0, 8);
    g.fillStyle(0x8a6a44, 1);
    g.fillRect(x0, shelfY, x1 - x0, 3);
    g.lineStyle(2, 0x3a2a18, 1);
    g.strokeRect(x0, shelfY, x1 - x0, 8);
    for (const bx of [x0 + 14, x1 - 14]) {
      g.fillStyle(0x4a3a26, 1);
      g.fillTriangle(bx - 6, shelfY, bx + 6, shelfY, bx, shelfY - 16);
    }

    for (let i = 0; i < 3; i++) {
      const f = this.features.find((ft) => ft.kind === 'tonic' && ft.slot === i);
      if (!f) continue;
      const bx = f.x, by = shelfY;
      if (!this.tonicsLeft[i]) {
        // Just the dust ring it left behind.
        g.fillStyle(0x2a1c10, 0.55);
        g.fillEllipse(bx, by - 1, 20, 6);
        g.lineStyle(1, 0x8a7a5a, 0.4);
        g.strokeEllipse(bx, by - 2, 22, 7);
        continue;
      }
      // A round-shouldered apothecary bottle with a wax-sealed cork.
      g.fillStyle(0x000000, 0.35);
      g.fillEllipse(bx + 2, by - 1, 24, 7);
      g.fillStyle(0x1f4a2c, 1);                    // glass
      g.fillRoundedRect(bx - 11, by - 34, 22, 33, 5);
      g.fillStyle(0x8a2438, 1);                    // the tonic itself
      g.fillRoundedRect(bx - 8, by - 24, 16, 22, 4);
      g.fillStyle(0xcc3a54, 0.75);
      g.fillRect(bx - 8, by - 24, 16, 4);
      g.fillStyle(0xa8d8b8, 0.35);                 // highlight down the glass
      g.fillRect(bx - 8, by - 32, 4, 26);
      g.lineStyle(1.5, 0x0e2a18, 1);
      g.strokeRoundedRect(bx - 11, by - 34, 22, 33, 5);
      g.fillStyle(0x1f4a2c, 1);                    // neck
      g.fillRect(bx - 5, by - 42, 10, 9);
      g.fillStyle(0x6a4a2a, 1);                    // cork
      g.fillRect(bx - 5, by - 47, 10, 6);
      g.fillStyle(0x7a1a28, 1);                    // wax seal
      g.fillEllipse(bx, by - 47, 13, 5);
      // A paper label, tied on, with a cross on it.
      g.fillStyle(0xe0d6bc, 1);
      g.fillRect(bx - 9, by - 22, 18, 12);
      g.lineStyle(1, 0xa89878, 1);
      g.strokeRect(bx - 9, by - 22, 18, 12);
      g.fillStyle(0x8a2438, 1);
      g.fillRect(bx - 1.5, by - 20, 3, 8);
      g.fillRect(bx - 5, by - 17.5, 10, 3);
    }
  }

  /** Cellar: the goo pool and the eye sitting in the middle of it. */
  private paintGoo(g: Phaser.GameObjects.Graphics): void {
    const f = this.features.find((ft) => ft.kind === 'eye');
    if (!f) return;
    const { x, y } = f;
    if (this.eyeDone || this.hooks.apocalypseActive()) {
      // Spent: a dry black scab and a socket with nothing in it.
      g.fillStyle(0x0e0408, 1);
      g.fillEllipse(x, y, 96, 66);
      g.fillStyle(0x1a0810, 1);
      g.fillEllipse(x, y - 4, 40, 26);
      g.lineStyle(2, 0x3a1020, 1);
      g.strokeEllipse(x, y, 96, 66);
      return;
    }
    // The goo: black, wet, and creeping out of the corner joint in lobes.
    g.fillStyle(0x0a0208, 1);
    g.fillEllipse(x, y, 132, 92);
    g.fillStyle(0x140410, 1);
    g.fillEllipse(x - 26, y + 18, 74, 46);
    g.fillEllipse(x + 32, y - 14, 58, 40);
    g.fillEllipse(x + 10, y + 34, 50, 26);
    // Wet sheen.
    g.fillStyle(0x3a1030, 0.5);
    g.fillEllipse(x - 22, y - 16, 30, 14);
    g.fillStyle(0x5a1840, 0.3);
    g.fillEllipse(x + 26, y + 10, 22, 10);
    // Strands reaching up the wall.
    g.lineStyle(3, 0x140410, 1);
    for (const [ax, ay] of [[-46, -34], [-20, -44], [14, -40], [40, -28]] as const) {
      g.lineBetween(x + ax * 0.5, y + ay * 0.4, x + ax, y + ay);
      g.fillStyle(0x140410, 1);
      g.fillCircle(x + ax, y + ay, 4);
    }
  }

  /**
   * Cellar, bottom right: a walnut gramophone on a low crate, brass horn
   * craning up out of it, with a stack of records leaning against the side.
   * Somebody carried this down here to listen to it, and then stopped.
   */
  private paintGramophone(g: Phaser.GameObjects.Graphics): void {
    const f = this.features.find((ft) => ft.kind === 'record');
    if (!f) return;
    const { x, y } = f;

    // The crate it stands on.
    g.fillStyle(0x000000, 0.4);
    g.fillEllipse(x, y + 40, 112, 22);
    g.fillStyle(0x3e2c1a, 1);
    g.fillRect(x - 46, y + 8, 92, 32);
    g.fillStyle(0x503c24, 1);
    g.fillRect(x - 46, y + 8, 92, 6);
    g.lineStyle(2, 0x1e1409, 1);
    g.strokeRect(x - 46, y + 8, 92, 32);
    g.lineStyle(1, 0x241808, 0.8);
    g.lineBetween(x - 46, y + 20, x + 46, y + 20);
    g.lineBetween(x - 46, y + 40, x + 46, y + 8);

    // The cabinet, and the felt platter set into its top.
    g.fillStyle(0x4a3220, 1);
    g.fillRoundedRect(x - 40, y - 14, 80, 26, 4);
    g.fillStyle(0x63432a, 1);
    g.fillRoundedRect(x - 40, y - 14, 80, 7, 4);
    g.lineStyle(1.5, 0x241608, 1);
    g.strokeRoundedRect(x - 40, y - 14, 80, 26, 4);
    g.fillStyle(0x7a2030, 1);
    g.fillEllipse(x - 4, y - 12, 56, 17);

    // The record, seen at the same slant as everything else in the room.
    g.fillStyle(0x120c0c, 1);
    g.fillEllipse(x - 4, y - 13, 52, 15);
    g.lineStyle(0.8, 0x2e2422, 0.8);
    for (let r = 8; r < 26; r += 5) g.strokeEllipse(x - 4, y - 13, r * 2, r * 0.58);
    g.fillStyle(0xa8362e, 1);
    g.fillEllipse(x - 4, y - 13, 16, 5);

    // Brass horn: a tapered cone opening up and away over the cabinet.
    g.fillStyle(0x8a6a2a, 1);
    g.fillTriangle(x + 26, y - 16, x + 46, y - 62, x + 62, y - 30);
    g.fillStyle(0xc79b52, 1);
    g.fillTriangle(x + 28, y - 18, x + 45, y - 58, x + 57, y - 32);
    g.fillStyle(0x2a1c0a, 1);
    g.fillEllipse(x + 52, y - 45, 20, 32);
    g.fillStyle(0x18100a, 1);
    g.fillEllipse(x + 52, y - 45, 14, 24);
    g.lineStyle(1.5, 0xdfc07a, 1);
    g.strokeTriangle(x + 26, y - 16, x + 46, y - 62, x + 62, y - 30);
    g.strokeEllipse(x + 52, y - 45, 20, 32);

    // Tone arm reaching back across the platter, needle down.
    g.lineStyle(2.5, 0xa87e3e, 1);
    g.lineBetween(x + 26, y - 16, x - 16, y - 12);
    g.fillStyle(0xdfc07a, 1);
    g.fillCircle(x + 26, y - 16, 3.5);
    g.fillStyle(0xe8e0d0, 1);
    g.fillTriangle(x - 19, y - 15, x - 13, y - 15, x - 16, y - 8);

    // A leaning stack of sleeves against the crate.
    for (let i = 0; i < 3; i++) {
      g.fillStyle(i === 1 ? 0x6a4436 : 0x3a3028, 1);
      g.fillRect(x - 70 + i * 3, y + 4 + i, 22, 34);
      g.lineStyle(1, 0x1a1410, 1);
      g.strokeRect(x - 70 + i * 3, y + 4 + i, 22, 34);
    }
    g.fillStyle(0x120c0c, 1);
    g.fillCircle(x - 48, y + 20, 9);
    g.fillStyle(0xa8362e, 1);
    g.fillCircle(x - 48, y + 20, 3);
  }

  /** Study: the reading table with the book open on it. */
  private paintTable(g: Phaser.GameObjects.Graphics): void {
    const f = this.features.find((ft) => ft.kind === 'journal');
    if (!f) return;
    const { x, y } = f;
    // Shadow and legs first.
    g.fillStyle(0x000000, 0.35);
    g.fillEllipse(x, y + 30, 110, 22);
    g.fillStyle(0x3a2a18, 1);
    g.fillRect(x - 44, y + 8, 8, 26);
    g.fillRect(x + 36, y + 8, 8, 26);
    g.lineStyle(3, 0x3a2a18, 1);
    g.lineBetween(x - 40, y + 24, x + 40, y + 24);
    // Table top, quarter-sawn.
    g.fillStyle(0x5e4128, 1);
    g.fillRect(x - 56, y - 14, 112, 26);
    g.fillStyle(0x74532f, 1);
    g.fillRect(x - 56, y - 14, 112, 8);
    g.lineStyle(2, 0x2e2012, 1);
    g.strokeRect(x - 56, y - 14, 112, 26);
    g.lineStyle(1, 0x4a3320, 0.9);
    for (let i = -40; i < 48; i += 16) g.lineBetween(x + i, y - 14, x + i, y + 12);

    // The journal, lying open: two vellum leaves with a red ribbon marker.
    g.fillStyle(0x2a1a10, 1);
    g.fillRect(x - 40, y - 30, 80, 22);           // the binding, seen edge-on
    g.fillStyle(0xe4d7b4, 1);
    g.fillRect(x - 38, y - 28, 37, 19);
    g.fillRect(x + 1, y - 28, 37, 19);
    g.lineStyle(1, 0xa89468, 1);
    g.strokeRect(x - 38, y - 28, 37, 19);
    g.strokeRect(x + 1, y - 28, 37, 19);
    // Handwriting: short ruled scratches, and a little sketch on the right leaf.
    g.lineStyle(1, 0x6a5436, 0.85);
    for (let i = 0; i < 5; i++) {
      g.lineBetween(x - 34, y - 25 + i * 3.6, x - 34 + 20 + (i % 2) * 8, y - 25 + i * 3.6);
    }
    g.fillStyle(0x4a7a3a, 0.8);
    g.fillCircle(x + 19, y - 20, 5);
    g.fillStyle(0x2a2a2a, 1);
    g.fillCircle(x + 17, y - 21, 1.2);
    g.fillCircle(x + 21, y - 21, 1.2);
    g.lineStyle(1, 0x6a5436, 0.85);
    for (let i = 0; i < 2; i++) g.lineBetween(x + 8, y - 13 + i * 3.4, x + 32, y - 13 + i * 3.4);
    // Ribbon.
    g.fillStyle(0x8a2438, 1);
    g.fillRect(x + 6, y - 28, 3, 26);
    // A quill lying across the top corner.
    g.lineStyle(2, 0xe8e0d0, 1);
    g.lineBetween(x + 30, y - 34, x + 48, y - 46);
    g.fillStyle(0xe8e0d0, 1);
    g.fillTriangle(x + 44, y - 41, x + 50, y - 49, x + 47, y - 39);
  }

  /** Observatory: a brass surround for the telescope already painted in the room. */
  private paintTelescope(g: Phaser.GameObjects.Graphics): void {
    const f = this.features.find((ft) => ft.kind === 'telescope');
    if (!f) return;
    const { x, y } = f;
    // A ring of star-chart tiles set into the floor around the dais.
    g.lineStyle(2, 0xc79b52, 0.5);
    g.strokeCircle(x, y + 34, 72);
    g.lineStyle(1, 0xc79b52, 0.3);
    g.strokeCircle(x, y + 34, 60);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.lineBetween(
        x + Math.cos(a) * 60, y + 34 + Math.sin(a) * 60,
        x + Math.cos(a) * 72, y + 34 + Math.sin(a) * 72,
      );
    }
    // The eyepiece the player actually leans into, sticking out toward them.
    g.fillStyle(0xa87e3e, 1);
    g.fillCircle(x + 18, y + 6, 9);
    g.fillStyle(0x2a2418, 1);
    g.fillCircle(x + 18, y + 6, 5);
    g.lineStyle(2, 0xdfc07a, 1);
    g.strokeCircle(x + 18, y + 6, 9);
    // A stack of charts and a brass dividers beside the dais.
    g.fillStyle(0xd8cfb4, 1);
    g.fillRect(x - 78, y + 20, 34, 24);
    g.fillStyle(0xc4b998, 1);
    g.fillRect(x - 76, y + 16, 34, 24);
    g.lineStyle(1, 0x8a8068, 1);
    g.strokeRect(x - 76, y + 16, 34, 24);
    g.fillStyle(0x1a2a4a, 1);
    for (const [sx, sy] of [[-68, 22], [-58, 30], [-50, 20], [-62, 34]] as const) {
      g.fillCircle(x + sx, y + sy, 1.4);
    }
    g.lineStyle(2, 0xc79b52, 1);
    g.lineBetween(x - 40, y + 44, x - 30, y + 26);
    g.lineBetween(x - 40, y + 44, x - 48, y + 26);
  }

  /** Per-frame shimmer: bottle glints, the eye's stare, telescope sparkle. */
  private paintAnimated(room: number, time: number): void {
    const g = this.animG;
    if (!g) return;
    g.clear();

    if (room === 1) {
      for (let i = 0; i < 3; i++) {
        if (!this.tonicsLeft[i]) continue;
        const f = this.features.find((ft) => ft.kind === 'tonic' && ft.slot === i);
        if (!f) continue;
        // The liquid stirs on its own, which is the tell.
        const bob = Math.sin(time / 520 + i * 2) * 1.6;
        g.fillStyle(0xcc3a54, 0.5 + Math.sin(time / 400 + i) * 0.18);
        g.fillEllipse(f.x, 154 - 24 + bob, 15, 3.5);
        g.fillStyle(0xffffff, 0.5 + Math.sin(time / 300 + i * 1.7) * 0.3);
        g.fillCircle(f.x - 7, 154 - 30, 1.4);
      }
      return;
    }

    if (room === 2) {
      // The gramophone first — it keeps turning whatever the eye is doing.
      const rec = this.features.find((ft) => ft.kind === 'record');
      if (rec) {
        const a = time / 700;
        // A glint travelling round the grooves, and the label's four marks turning.
        g.fillStyle(0xd6d0c0, 0.8);
        for (let i = 0; i < 4; i++) {
          const t = a + (i / 4) * Math.PI * 2;
          g.fillCircle(rec.x - 4 + Math.cos(t) * 6, rec.y - 13 + Math.sin(t) * 1.8, 0.9);
        }
        g.fillStyle(0xffffff, 0.10);
        g.fillTriangle(
          rec.x - 4, rec.y - 13,
          rec.x - 4 + Math.cos(a) * 26, rec.y - 13 + Math.sin(a) * 7.5,
          rec.x - 4 + Math.cos(a + 0.6) * 26, rec.y - 13 + Math.sin(a + 0.6) * 7.5,
        );
        // Sound coming out of the horn, in rings, going nowhere.
        for (let i = 0; i < 3; i++) {
          const phase = ((time / 1100) + i / 3) % 1;
          g.lineStyle(1.4, 0xdfc07a, 0.32 * (1 - phase));
          g.strokeEllipse(rec.x + 56 + phase * 22, rec.y - 45, 14 + phase * 26, 24 + phase * 40);
        }
      }

      const f = this.features.find((ft) => ft.kind === 'eye');
      if (!f || this.eyeDone || this.hooks.apocalypseActive()) return;
      const { x, y } = f;
      const prog = this.eyeProgress;
      // Goo breathing.
      const breathe = 1 + Math.sin(time / 900) * 0.04 + prog * 0.12;
      g.fillStyle(0x1a0614, 0.55);
      g.fillEllipse(x, y, 128 * breathe, 88 * breathe);
      // The eye itself: sclera, iris, slit pupil — widening as it wakes.
      const R = 21 + prog * 7;
      g.fillStyle(0x2a0010, 0.5 + prog * 0.4);
      g.fillCircle(x, y - 6, R + 12 + Math.sin(time / 260) * 3);
      g.fillStyle(0xe8d8d8, 1);
      g.fillEllipse(x, y - 6, R * 2, R * 1.45);
      // Bloodshot veins.
      g.lineStyle(1, 0xaa2233, 0.6);
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 + time / 4000;
        g.lineBetween(
          x + Math.cos(a) * R * 0.45, y - 6 + Math.sin(a) * R * 0.32,
          x + Math.cos(a) * R * 0.98, y - 6 + Math.sin(a) * R * 0.7,
        );
      }
      g.fillStyle(0xcc1133, 1);
      g.fillCircle(x, y - 6, R * 0.62);
      g.fillStyle(0xff3355, 0.8 + Math.sin(time / 180) * 0.2);
      g.fillCircle(x, y - 6, R * 0.44);
      g.fillStyle(0x08000a, 1);
      g.fillEllipse(x, y - 6, R * 0.28, R * (0.86 - prog * 0.35));
      g.fillStyle(0xffffff, 0.8);
      g.fillCircle(x - R * 0.34, y - 6 - R * 0.3, 2.6);
      // The hold ring.
      if (prog > 0) {
        g.lineStyle(4, 0xcc1133, 0.9);
        g.beginPath();
        g.arc(x, y - 6, R + 22, -Math.PI / 2, -Math.PI / 2 + prog * Math.PI * 2, false);
        g.strokePath();
        // Tendrils reaching for the hand that is touching it.
        const p = this.hooks.player;
        g.lineStyle(2, 0x8a1030, 0.5 + prog * 0.5);
        for (let i = 0; i < 4; i++) {
          const k = (i - 1.5) * 0.18;
          const mx = (x + p.x) / 2 + Math.sin(time / 300 + i) * 20;
          const my = (y + p.y) / 2 + Math.cos(time / 340 + i) * 20;
          g.lineBetween(x + k * 40, y - 6, mx, my);
          g.lineBetween(mx, my, p.x + k * 20, p.y);
        }
      }
      return;
    }

    if (room === 4) {
      const f = this.features.find((ft) => ft.kind === 'telescope');
      if (!f) return;
      for (let i = 0; i < 5; i++) {
        const a = time / 1400 + i * 1.257;
        const r = 46 + Math.sin(time / 700 + i) * 8;
        g.fillStyle(0xd8e8ff, 0.35 + Math.sin(time / 260 + i * 2) * 0.3);
        g.fillCircle(f.x + Math.cos(a) * r, f.y - 20 + Math.sin(a) * r * 0.4, 1.6);
      }
      g.fillStyle(0xffe8b0, 0.25 + Math.sin(time / 500) * 0.12);
      g.fillCircle(f.x + 18, f.y + 6, 6);
    }
  }
}
