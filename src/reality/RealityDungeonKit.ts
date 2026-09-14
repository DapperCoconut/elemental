import Phaser from 'phaser';
import { Fighter } from '../entities/Fighter';
import { TypewriterBox } from '../ui/TypewriterBox';
import * as PlayerData from '../data/PlayerData';
import {
  REALITY_ROOMS, ROOM_INTRO_LINES, REALITY_BLUE, REALITY_GLOW, REALITY_WHITE,
} from './RealityTypes';
import {
  drawRoomShell, drawDoor, drawTorchBracket, drawTorchFlame,
  drawFountain, drawFountainWater,
} from './RealityArt';
import { RealityJump } from './RealityJump';
import { RealityHusks } from './RealityHusks';

/**
 * The five trial rooms and the fountain between the crack and the chapel.
 *
 * Runs inside ArenaScene as a mode, the way InvasionKit does: one full screen
 * per room, no camera scroll, doors travel with a fade. The player brings one
 * element through the whole run; the 1v1 `npc` slot is parked until the fifth
 * room wakes it for the mirror duel. Dying anywhere sends the run back to the
 * first room via a scene restart — the fountain past the duel is the only
 * checkpoint, and it is a save flag.
 */

export interface RealityDungeonArenaApi {
  scene: Phaser.Scene;
  player: Fighter;
  npc: Fighter;
  width: number;
  height: number;
  spaceDown(): boolean;
  addEnemy(f: Fighter): void;
  removeEnemy(f: Fighter): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  spawnHitFlash(x: number, y: number, color: number): void;
  setPointerLatched(latched: boolean): void;
  /** Death anywhere in the trials — scene restart at room zero. */
  restartTrials(): void;
  /** The chapel door past the fountain. */
  enterBoss(): void;
  /** Walk away — back to the title screen. */
  leave(): void;
  /**
   * Give the parked npc a real element (id, texture, kit gates) — called once,
   * when the fifth room wakes it as the mirror.
   */
  setNpcElement(id: string): void;
}

/** One in-flight wall arrow in the trap room. */
interface TrapArrow {
  x: number;
  y: number;
}

const PLAYER_R = 16;

export class RealityDungeonKit {
  private api: RealityDungeonArenaApi;

  private roomIdx = 0;
  private doorOpen = false;
  private doorRect: Phaser.Geom.Rectangle | null = null;
  private traveling = false;

  /** Static room art, rebuilt per room. */
  private roomG: Phaser.GameObjects.Graphics | null = null;
  /** Cleared and repainted every frame — flames, shadows, reveals, water. */
  private fxG: Phaser.GameObjects.Graphics | null = null;
  private box: TypewriterBox | null = null;

  readonly jump = new RealityJump();
  private torches: Array<{ x: number; y: number }> = [];

  // Room 0 — the spike pit.
  private pitX0 = 0;
  private pitX1 = 0;
  private pitSlabs: Phaser.Geom.Rectangle[] = [];
  private hazardGraceUntil = 0;

  // Room 1 — flame jets + wall arrows.
  private flameXs: number[] = [];
  private flameOffsets: number[] = [];
  private arrowYs: number[] = [];
  private nextArrowAt: number[] = [];
  private arrows: TrapArrow[] = [];
  private flameTickAt = 0;

  // Room 3 — the memory path.
  private gridX0 = 0;
  private gridY0 = 0;
  private gridCols = 0;
  private gridRows = 0;
  private gridTile = 46;
  private pathTiles = new Set<string>();
  private revealUntil = 0;

  // Room 2 — the glitched wave. Two pulls, walls first.
  private husks: RealityHusks | null = null;
  private huskWavesLeft = 0;
  private nextHuskWaveAt = 0;

  // Room 4 — the mirror duel.
  private duelStarted = false;
  private mirrorId: string | null = null;

  // Room 5 — the fountain.
  private fountainLit = false;

  constructor(api: RealityDungeonArenaApi) {
    this.api = api;
  }

  // ── Lifecycle ───────────────────────────────────────────────────────

  /** Fresh match state. The scene restart already destroyed last run's display objects. */
  reset(roomIdx: number, mirrorId: string | null): void {
    this.roomIdx = roomIdx;
    this.mirrorId = mirrorId;
    this.traveling = false;
    this.arrows = [];
    this.hazardGraceUntil = 0;
    this.duelStarted = false;
    this.fountainLit = false;
    this.jump.setEnabled(false);

    this.roomG = this.api.scene.add.graphics().setDepth(-60);
    this.fxG = this.api.scene.add.graphics().setDepth(6);
    if (!this.husks) {
      const api = this.api;
      this.husks = new RealityHusks({
        get scene() { return api.scene; },
        get player() { return api.player; },
        get width() { return api.width; },
        get height() { return api.height; },
        addEnemy: (f) => api.addEnemy(f),
        removeEnemy: (f) => api.removeEnemy(f),
        showFloatingText: (x, y, t, c) => api.showFloatingText(x, y, t, c),
        spawnHitFlash: (x, y, c) => api.spawnHitFlash(x, y, c),
      });
    }
    this.husks.reset();
    this.huskWavesLeft = 0;
    this.box = new TypewriterBox(this.api.scene, {
      accent: REALITY_BLUE,
      onOpenChange: (open) => this.api.setPointerLatched(open),
    });

    this.parkNpc();
    this.buildLeaveButton();
    this.buildRoom(roomIdx);
  }

  /**
   * Top-right: the one honest way out. The dungeon holds no progress except
   * the fountain, and the button says so.
   */
  private buildLeaveButton(): void {
    const btn = this.api.scene.add.text(this.api.width - 22, 26, '⏏ LEAVE', {
      fontSize: '13px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
      color: '#8a8ab0', stroke: '#04060f', strokeThickness: 4, letterSpacing: 1,
    }).setOrigin(1, 0.5).setDepth(255).setInteractive({ useHandCursor: true });
    btn.on('pointerover', () => btn.setColor('#c8c8e4'));
    btn.on('pointerout', () => btn.setColor('#8a8ab0'));
    btn.on('pointerdown', () => {
      // Latch so the click that leaves does not also cast on the way out.
      this.api.setPointerLatched(true);
      this.api.leave();
    });
  }

  /** The duel's opponent stays parked and unkillable until its room. */
  private parkNpc(): void {
    const npc = this.api.npc;
    npc.setHealthBarVisible(false);
    npc.setActive(false).setVisible(false);
    (npc.body as Phaser.Physics.Arcade.Body).enable = false;
    npc.immortal = true;
  }

  /** True while the 1v1 bot should not think — every room but a live duel. */
  npcDormant(): boolean {
    return !this.duelStarted;
  }

  /** True while Space belongs to the jump rather than the dodge roll. */
  claimsSpace(): boolean {
    return this.jump.isEnabled();
  }

  /** The mirror duel ended — ArenaScene's npc `defeated` handler routes here. */
  onDuelWon(): void {
    if (this.roomIdx !== REALITY_ROOMS.duel || this.doorOpen) return;
    this.doorOpen = true;
    this.redrawDoor();
    this.api.showFloatingText(this.api.width / 2, this.api.height / 2 - 60,
      '⚖ THE TRIAL IS ANSWERED', '#9fc2ff');
  }

  // ── Rooms ───────────────────────────────────────────────────────────

  private buildRoom(idx: number): void {
    const { width: W, height: H } = this.api;
    const g = this.roomG!;
    g.clear();
    this.torches = [];
    this.doorOpen = false;
    this.doorRect = null;

    drawRoomShell(g, { W, H, seed: 9000 + idx * 131, door: idx === REALITY_ROOMS.fountain ? 'none' : 'right' });

    // Sconces flank every room; their flames burn in the fx pass.
    for (const tx of [W * 0.18, W * 0.5, W * 0.82]) {
      drawTorchBracket(g, tx, 44);
      this.torches.push({ x: tx, y: 40 });
    }

    // The player walks in on the left, whatever just happened.
    const p = this.api.player;
    p.setPosition(90, H / 2);
    (p.body as Phaser.Physics.Arcade.Body).reset(90, H / 2);

    switch (idx) {
      case REALITY_ROOMS.spikes: this.buildSpikeRoom(); break;
      case REALITY_ROOMS.traps: this.buildTrapRoom(); break;
      case REALITY_ROOMS.husks: this.buildHuskRoom(); break;
      case REALITY_ROOMS.puzzle: this.buildPuzzleRoom(); break;
      case REALITY_ROOMS.duel: this.buildDuelRoom(); break;
      case REALITY_ROOMS.fountain: this.buildFountainRoom(); break;
    }

    this.redrawDoor();

    const line = ROOM_INTRO_LINES[idx];
    if (line) void this.box!.say([line], { speaker: '???' });
  }

  private redrawDoor(): void {
    if (this.roomIdx === REALITY_ROOMS.fountain && !this.fountainLit) {
      this.doorRect = null;
      return;
    }
    this.doorRect = drawDoor(this.roomG!, this.api.width, this.api.height, this.doorOpen);
  }

  private buildSpikeRoom(): void {
    const { width: W, height: H } = this.api;
    const g = this.roomG!;
    this.jump.setEnabled(true);

    this.pitX0 = W * 0.34;
    this.pitX1 = W * 0.66;
    const pad = 32;

    // The pit: a dark trench full of upturned iron.
    g.fillStyle(0x05060e, 1);
    g.fillRect(this.pitX0, pad, this.pitX1 - this.pitX0, H - pad * 2);
    g.lineStyle(2, 0x2c3560, 1);
    g.lineBetween(this.pitX0, pad, this.pitX0, H - pad);
    g.lineBetween(this.pitX1, pad, this.pitX1, H - pad);
    for (let y = pad + 10; y < H - pad; y += 18) {
      for (let x = this.pitX0 + 8; x < this.pitX1 - 8; x += 16) {
        const jx = ((x * 7 + y * 13) % 9) - 4;
        g.fillStyle(0x39415f, 1);
        g.fillTriangle(x + jx - 4, y + 8, x + jx + 4, y + 8, x + jx, y - 4);
        g.fillStyle(0x9aa5c9, 0.7);
        g.fillTriangle(x + jx - 1.5, y + 2, x + jx + 1.5, y + 2, x + jx, y - 4);
      }
    }

    // Two standing slabs — the stepping stones of a three-jump crossing.
    this.pitSlabs = [];
    const slabW = 52;
    const span = this.pitX1 - this.pitX0;
    for (const frac of [1 / 3, 2 / 3]) {
      const cx = this.pitX0 + span * frac;
      const cy = H / 2 + (frac < 0.5 ? -36 : 36);
      const rect = new Phaser.Geom.Rectangle(cx - slabW / 2, cy - slabW / 2, slabW, slabW);
      this.pitSlabs.push(rect);
      // Drawn as a raised top face with a column dropping toward the viewer.
      g.fillStyle(0x0a0d1c, 1);
      g.fillRect(rect.x + 4, rect.y + 10, rect.width, rect.height + 10);
      g.fillStyle(0x232a48, 1);
      g.fillRect(rect.x, rect.y, rect.width, rect.height);
      g.lineStyle(2, 0x3d4670, 1);
      g.strokeRect(rect.x, rect.y, rect.width, rect.height);
      g.lineStyle(1, 0x545f8f, 0.6);
      g.lineBetween(rect.x + 6, rect.y + 8, rect.right - 6, rect.y + 8);
    }

    this.doorOpen = true;
    this.api.showFloatingText(this.api.width / 2, 84, '⭾ SPACE TO JUMP', '#9fc2ff');
  }

  private buildTrapRoom(): void {
    const { width: W, height: H } = this.api;
    const g = this.roomG!;
    this.jump.setEnabled(true);

    this.flameXs = [W * 0.32, W * 0.5, W * 0.68];
    this.flameOffsets = [0, 1200, 2400];
    this.flameTickAt = 0;

    // Nozzle housings top and bottom of each column.
    for (const fx of this.flameXs) {
      for (const [ny, flip] of [[32, 1], [H - 32, -1]] as Array<[number, number]>) {
        g.fillStyle(0x2a2540, 1);
        g.fillRect(fx - 12, ny - (flip > 0 ? 0 : 14), 24, 14);
        g.fillStyle(0x161228, 1);
        g.fillCircle(fx, ny + flip * 10, 7);
        g.lineStyle(1, 0x4a4370, 1);
        g.strokeCircle(fx, ny + flip * 10, 7);
      }
    }

    // Arrow slits in the left wall.
    this.arrowYs = [H * 0.38, H * 0.62];
    this.nextArrowAt = [800, 1600];
    this.arrows = [];
    for (const ay of this.arrowYs) {
      g.fillStyle(0x000000, 1);
      g.fillRect(20, ay - 12, 12, 24);
      g.lineStyle(1, 0x4a4370, 1);
      g.strokeRect(20, ay - 12, 12, 24);
    }

    this.doorOpen = true;
  }

  private buildHuskRoom(): void {
    const { width: W } = this.api;
    const g = this.roomG!;

    // Cracks in the walls where they will come through.
    for (const [cx2, cy2] of [[60, 120], [W - 60, 160], [60, 480], [W - 60, 440], [W / 2, 52]]) {
      g.lineStyle(2, 0x2c3560, 1);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + 0.4;
        g.lineBetween(cx2, cy2, cx2 + Math.cos(a) * (10 + i * 4), cy2 + Math.sin(a) * (8 + i * 3));
      }
    }

    // Two pulls: four now, four more when the first four are down.
    this.huskWavesLeft = 2;
    this.nextHuskWaveAt = this.api.scene.time.now + 1600;
    this.doorOpen = false;
    this.api.showFloatingText(W / 2, 84, '👾 THE WALLS REMEMBER', '#ff6b85');
  }

  private buildPuzzleRoom(): void {
    const { width: W, height: H } = this.api;
    const pad = 32;
    this.gridTile = 46;
    this.gridCols = 10;
    this.gridRows = Math.floor((H - pad * 2 - 20) / this.gridTile);
    this.gridX0 = W * 0.24;
    this.gridY0 = pad + 10 + ((H - pad * 2 - 20) - this.gridRows * this.gridTile) / 2;

    // Carve the safe path: a random walk, left column to right column, that
    // only ever moves right or sideways — it cannot trap itself.
    this.pathTiles.clear();
    let row = Phaser.Math.Between(1, this.gridRows - 2);
    let col = 0;
    this.pathTiles.add(`${col},${row}`);
    while (col < this.gridCols - 1) {
      const moves: Array<[number, number]> = [[1, 0]];
      if (row > 0 && !this.pathTiles.has(`${col},${row - 1}`)) moves.push([0, -1]);
      if (row < this.gridRows - 1 && !this.pathTiles.has(`${col},${row + 1}`)) moves.push([0, 1]);
      const [dc, dr] = moves[Math.random() < 0.55 ? 0 : Phaser.Math.Between(0, moves.length - 1)];
      col += dc;
      row += dr;
      this.pathTiles.add(`${col},${row}`);
    }

    // The corrupted band the grid sits over.
    const g = this.roomG!;
    g.fillStyle(0x070812, 1);
    g.fillRect(this.gridX0, pad, this.gridCols * this.gridTile, H - pad * 2);
    for (let c = 0; c < this.gridCols; c++) {
      for (let r = 0; r < this.gridRows; r++) {
        const x = this.gridX0 + c * this.gridTile;
        const y = this.gridY0 + r * this.gridTile;
        g.fillStyle(0x0d1024, 0.9);
        g.fillRect(x + 2, y + 2, this.gridTile - 4, this.gridTile - 4);
        g.lineStyle(1, 0x1c2344, 0.8);
        g.strokeRect(x + 2, y + 2, this.gridTile - 4, this.gridTile - 4);
      }
    }

    this.revealUntil = this.api.scene.time.now + 2500;
    this.doorOpen = false;
    this.api.showFloatingText(W / 2, 84, '👁 REMEMBER THE WAY', '#9fc2ff');
  }

  private buildDuelRoom(): void {
    const { width: W, height: H } = this.api;
    const npc = this.api.npc;

    // The parked opponent wakes as whatever has beaten this save the most —
    // only NOW does it become that element, so its kit's furniture (Fortune's
    // shop, Conquest's board…) has not been standing since room one.
    if (this.mirrorId) this.api.setNpcElement(this.mirrorId);
    npc.setActive(true).setVisible(true);
    (npc.body as Phaser.Physics.Arcade.Body).enable = true;
    npc.setPosition(W - 140, H / 2);
    (npc.body as Phaser.Physics.Arcade.Body).reset(W - 140, H / 2);
    npc.immortal = false;
    npc.setHealthBarVisible(true);
    this.duelStarted = true;

    this.api.showFloatingText(W - 140, H / 2 - 70, '☠ AN OLD DEFEAT TAKES SHAPE', '#ff6b85');
    this.doorOpen = false;
  }

  private buildFountainRoom(): void {
    const { width: W, height: H } = this.api;
    this.fountainLit = PlayerData.isRealityFountainLit();
    drawFountain(this.roomG!, W / 2, H / 2, this.fountainLit);
    if (this.fountainLit) {
      this.doorOpen = true;
    } else {
      this.api.showFloatingText(W / 2, H / 2 - 90, '⛲ A DRY FOUNTAIN', '#8a8ab0');
    }
  }

  // ── Per-frame ───────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    const fx = this.fxG;
    if (!fx) return;
    fx.clear();

    const dtSec = delta / 1000;
    const t = time / 1000;
    const p = this.api.player;

    for (const torch of this.torches) drawTorchFlame(fx, torch.x, torch.y, t);

    if (!this.traveling) {
      this.jump.update(dtSec, this.api.spaceDown());
      this.jump.drawShadow(fx, p.x, p.y);

      switch (this.roomIdx) {
        case REALITY_ROOMS.spikes: this.updateSpikeRoom(time); break;
        case REALITY_ROOMS.traps: this.updateTrapRoom(time, dtSec, fx); break;
        case REALITY_ROOMS.husks: this.updateHuskRoom(time, delta); break;
        case REALITY_ROOMS.puzzle: this.updatePuzzleRoom(time, fx); break;
        case REALITY_ROOMS.fountain: this.updateFountainRoom(t, fx); break;
      }

      // The lit way out breathes.
      if (this.doorOpen && this.doorRect) {
        const r = this.doorRect;
        fx.fillStyle(REALITY_GLOW, 0.10 + Math.sin(t * 3) * 0.05);
        fx.fillRect(r.x - 8, r.y - 8, r.width + 16, r.height + 16);
        if (this.playerAtDoor()) this.travelNext();
      }
    }
  }

  private playerAtDoor(): boolean {
    const r = this.doorRect;
    if (!r) return false;
    const p = this.api.player;
    // The physics bounds hold the body's ~22px circle inside the wall band, so
    // the player can only reach ~W-54 — the trigger must reach further into
    // the room than the arch stones themselves, or it can never fire.
    return p.x > r.x - PLAYER_R - 18 && p.y > r.y - PLAYER_R - 6 && p.y < r.bottom + PLAYER_R + 6;
  }

  private travelNext(): void {
    if (this.traveling) return;
    this.traveling = true;
    const cam = this.api.scene.cameras.main;
    // The fountain's arch is the chapel door — a scene change, not a room.
    if (this.roomIdx === REALITY_ROOMS.fountain) {
      cam.fadeOut(600, 255, 255, 255);
      cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.api.enterBoss());
      return;
    }
    cam.fadeOut(280, 0, 0, 0);
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.roomIdx += 1;
      this.buildRoom(this.roomIdx);
      cam.fadeIn(280, 0, 0, 0);
      this.traveling = false;
    });
  }

  // Room 0 — standing in the pit is the mistake.
  private updateSpikeRoom(time: number): void {
    const p = this.api.player;
    if (time < this.hazardGraceUntil || this.jump.isAirborne()) return;
    if (p.x < this.pitX0 - 6 || p.x > this.pitX1 + 6) return;
    for (const slab of this.pitSlabs) {
      if (slab.contains(p.x, p.y)) return;
    }
    this.hazardGraceUntil = time + 1200;
    p.takeDamage(35);
    this.api.spawnHitFlash(p.x, p.y, 0x9aa5c9);
    this.api.showFloatingText(p.x, p.y - 30, '⚠ SPIKES 35', '#ff6b85');
    p.setPosition(this.pitX0 - 60, p.y);
    (p.body as Phaser.Physics.Arcade.Body).reset(this.pitX0 - 60, p.y);
  }

  // Room 1 — timed jets and bolts.
  private updateTrapRoom(time: number, dtSec: number, fx: Phaser.GameObjects.Graphics): void {
    const { width: W, height: H } = this.api;
    const p = this.api.player;
    const pad = 32;

    const FLAME_PERIOD = 3600;
    const FLAME_ON = 1500;
    const FLAME_WARN = 450;

    for (let i = 0; i < this.flameXs.length; i++) {
      const fxX = this.flameXs[i];
      const phase = (time + this.flameOffsets[i]) % FLAME_PERIOD;
      const firing = phase < FLAME_ON;
      const warning = !firing && phase > FLAME_PERIOD - FLAME_WARN;

      if (warning) {
        const a = 0.12 + 0.12 * Math.sin(time / 40);
        fx.fillStyle(REALITY_BLUE, a);
        fx.fillRect(fxX - 6, pad, 12, H - pad * 2);
      }
      if (firing) {
        // A full-height jet, white-hot at the core, waving slightly.
        const wave = Math.sin(time / 60 + i) * 3;
        fx.fillStyle(REALITY_BLUE, 0.28);
        fx.fillRect(fxX - 15 + wave, pad, 30, H - pad * 2);
        fx.fillStyle(REALITY_GLOW, 0.5);
        fx.fillRect(fxX - 8 + wave, pad, 16, H - pad * 2);
        fx.fillStyle(REALITY_WHITE, 0.9);
        fx.fillRect(fxX - 3 + wave, pad, 6, H - pad * 2);

        if (!this.jump.isAirborne() && Math.abs(p.x - fxX) < 15 + PLAYER_R
            && time >= this.flameTickAt) {
          this.flameTickAt = time + 250;
          p.takeDamage(14);
          this.api.spawnHitFlash(p.x, p.y, REALITY_GLOW);
          this.api.showFloatingText(p.x, p.y - 30, '🔥 14', '#9fc2ff');
        }
      }
    }

    // Bolts out of the left wall.
    for (let i = 0; i < this.arrowYs.length; i++) {
      if (time >= this.nextArrowAt[i]) {
        this.nextArrowAt[i] = time + 1600;
        this.arrows.push({ x: 36, y: this.arrowYs[i] });
      }
    }
    const ARROW_SPEED = 330;
    this.arrows = this.arrows.filter((a) => {
      a.x += ARROW_SPEED * dtSec;
      if (a.x > W - pad) return false;
      // Steel bolt: shaft, head, fletching.
      fx.lineStyle(3, 0x8b93b8, 1);
      fx.lineBetween(a.x - 14, a.y, a.x + 8, a.y);
      fx.fillStyle(0xd7dcf2, 1);
      fx.fillTriangle(a.x + 8, a.y - 4, a.x + 8, a.y + 4, a.x + 16, a.y);
      fx.lineStyle(2, 0x4a5480, 1);
      fx.lineBetween(a.x - 14, a.y - 4, a.x - 9, a.y);
      fx.lineBetween(a.x - 14, a.y + 4, a.x - 9, a.y);

      if (!this.jump.isAirborne()
          && Math.abs(a.x - p.x) < PLAYER_R + 8 && Math.abs(a.y - p.y) < PLAYER_R + 6) {
        p.takeDamage(30);
        this.api.spawnHitFlash(p.x, p.y, 0xd7dcf2);
        this.api.showFloatingText(p.x, p.y - 30, '🏹 30', '#ff6b85');
        return false;
      }
      return true;
    });
  }

  // Room 2 — survive both pulls.
  private updateHuskRoom(time: number, delta: number): void {
    this.husks!.update(time, delta);
    if (this.doorOpen) return;

    if (this.huskWavesLeft > 0 && time >= this.nextHuskWaveAt && this.husks!.aliveCount() === 0) {
      this.huskWavesLeft -= 1;
      this.husks!.spawnWave(4);
      this.nextHuskWaveAt = time + 800;
      return;
    }
    if (this.huskWavesLeft === 0 && this.husks!.aliveCount() === 0) {
      this.doorOpen = true;
      this.redrawDoor();
      this.api.showFloatingText(this.api.width / 2, this.api.height / 2 - 60,
        '👾 THE WALLS GO QUIET', '#9fc2ff');
    }
  }

  // Room 3 — walk the remembered path.
  private updatePuzzleRoom(time: number, fx: Phaser.GameObjects.Graphics): void {
    const p = this.api.player;
    const bandX1 = this.gridX0 + this.gridCols * this.gridTile;
    const revealed = time < this.revealUntil;

    if (revealed) {
      for (const key of this.pathTiles) {
        const [c, r] = key.split(',').map(Number);
        const x = this.gridX0 + c * this.gridTile;
        const y = this.gridY0 + r * this.gridTile;
        const a = 0.35 + 0.2 * Math.sin(time / 150 + c);
        fx.fillStyle(REALITY_BLUE, a);
        fx.fillRect(x + 4, y + 4, this.gridTile - 8, this.gridTile - 8);
        fx.lineStyle(1, REALITY_GLOW, 0.8);
        fx.strokeRect(x + 4, y + 4, this.gridTile - 8, this.gridTile - 8);
      }
    }

    if (this.doorOpen || time < this.hazardGraceUntil) return;

    // Cleared the band — the arch lights.
    if (p.x > bandX1 + 10) {
      this.doorOpen = true;
      this.redrawDoor();
      this.api.showFloatingText(p.x, p.y - 40, '👁 REMEMBERED', '#9fc2ff');
      return;
    }

    if (p.x < this.gridX0 || revealed) return;

    // A point is safe outside the band (left, right — the far side is the
    // exit, not a tile — or beyond the row coverage) or on a path tile.
    const isPathAt = (x: number, y: number): boolean => {
      const c = Math.floor((x - this.gridX0) / this.gridTile);
      const r = Math.floor((y - this.gridY0) / this.gridTile);
      if (c < 0 || c >= this.gridCols) return true;
      if (r < 0 || r >= this.gridRows) return true;
      return this.pathTiles.has(`${c},${r}`);
    };
    // Sample a small cross rather than the bare centre: a corner clipped by a
    // few pixels while turning along the path is not a wrong step.
    const M = 10;
    if (isPathAt(p.x, p.y) || isPathAt(p.x - M, p.y) || isPathAt(p.x + M, p.y)
        || isPathAt(p.x, p.y - M) || isPathAt(p.x, p.y + M)) return;

    // Wrong stone: it bites, throws you back, and deigns to show the way once more.
    this.hazardGraceUntil = time + 900;
    this.revealUntil = time + 1500;
    p.takeDamage(25);
    this.api.spawnHitFlash(p.x, p.y, REALITY_BLUE);
    this.api.showFloatingText(p.x, p.y - 30, '✖ FORGOTTEN 25', '#ff6b85');
    const backX = this.gridX0 - 50;
    p.setPosition(backX, p.y);
    (p.body as Phaser.Physics.Arcade.Body).reset(backX, p.y);
  }

  // Room 5 — touch the water.
  private updateFountainRoom(t: number, fx: Phaser.GameObjects.Graphics): void {
    const { width: W, height: H } = this.api;
    if (this.fountainLit) {
      drawFountainWater(fx, W / 2, H / 2, t);
      return;
    }
    const p = this.api.player;
    if (Phaser.Math.Distance.Between(p.x, p.y, W / 2, H / 2) < 78) {
      this.fountainLit = true;
      PlayerData.lightRealityFountain();
      // Repaint the basin full and open the way to the chapel.
      drawFountain(this.roomG!, W / 2, H / 2, true);
      this.doorOpen = true;
      this.redrawDoor();
      this.api.spawnHitFlash(W / 2, H / 2 - 40, REALITY_GLOW);
      this.api.showFloatingText(W / 2, H / 2 - 96, '⛲ YOUR PLACE IS HELD', '#9fc2ff');
    }
  }
}
