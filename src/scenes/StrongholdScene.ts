import Phaser from 'phaser';
import * as PlayerData from '../data/PlayerData';
import { findElementDef } from '../data/ElementRoster';
import {
  C, T, DEPTH, FONT_DISPLAY, FONT_MONO, FONT_UI, hex, mix,
  addButton, addModal, addIconButton, drawIcon, drawMeter, fillNotched, strokeNotched, ALL_CORNERS,
  UiButton,
} from '../ui';
import { Music, Sfx } from '../audio';
import { TOWER_DEFS } from '../stronghold/StrongholdTowers';
import {
  BODY_LABEL, ROLE_LABEL, TARGET_MODES, TowerAbilityDef, TowerDef, PATH_MAX_TIER,
} from '../stronghold/StrongholdTypes';
import { Tower, PATH_TINT, attackName } from '../stronghold/Tower';
import { RoadHusk } from '../stronghold/RoadHusk';
import { TowerCombat, TowerShot } from '../stronghold/TowerCombat';
import { HuskRoadTraits } from '../stronghold/HuskRoadTraits';
import { buildFor } from '../stronghold/HuskBuilds';
import {
  drawMap, distToPath, inField, isHazard, isWater, keepPoint, setActiveMap, getStrongholdMap, StrongholdMapDef,
  TOWER_PATH_CLEARANCE, TOWER_SPACING, FIELD_BOTTOM,
} from '../stronghold/StrongholdMap';
import {
  getStrongholdDifficulty, planWave, recordKey, shardsForRun, StrongholdDifficultyDef, StrongholdDifficultyId, WavePlan,
} from '../stronghold/StrongholdWaves';
import { HuskVariantDef } from '../invasion/HuskVariants';
import { STRONGHOLD_ACCENT } from './StrongholdSetupScene';
import type { StrongholdJournalData } from './StrongholdJournalScene';

export interface StrongholdSceneData {
  elements: string[];
  difficulty: StrongholdDifficultyId;
  map?: string;
}

type RunState = 'prep' | 'active' | 'over';

const FIRST_PREP_MS = 25000;
const PREP_MS = 12000;
const HUD_H = 56;
const MAX_HUSKS = 150;
/** Ability kinds Echo repeats — the instant ones, not the things that stay on the field. */
const ECHOABLE = new Set(['bolt', 'splash', 'line', 'chain', 'nova', 'execute', 'beam']);
const MODE_LABEL: Record<string, string> = { first: 'FIRST', last: 'LAST', strong: 'STRONG', close: 'CLOSE' };
const SPEEDS = [1, 2, 3];

// Bottom band layout.
const BAND_Y = FIELD_BOTTOM + 6;
const CARD_W = 112;
const CARD_H = 58;
const CARD_Y = 604;
const DOCK_X = 724;
const DOCK_SLOTS = 5;
const DOCK_KEYS = ['Q', 'W', 'E', 'R', 'T'];
// Tower panel.
const PANEL_W = 300;
const PANEL_H = FIELD_BOTTOM - HUD_H - 8;
const PATH_KEYS = ['Z', 'X', 'C'];

/** One button in the ability dock: every tower carrying the same ability shares it. */
interface DockGroup { key: string; name: string; color: number; towers: Tower[] }

/**
 * Stronghold — the tower-defense mode.
 *
 * A single scene owns the run: the map's roads, the husks walking them, the towers beside them,
 * the gold and the lives. Husks are the invasion's `Husk` bodies (dressed as the dead element
 * players they are in Invasion) driven along the roads here rather than by their own AI; each
 * brand's road trait runs in `HuskRoadTraits`; towers cast through `TowerCombat`. Nothing in
 * here touches ArenaScene.
 *
 * The run keeps its own clock (`simNow`) hooked in front of the scene's Clock, so the speed
 * toggle and pause (and the journal, which pauses) stretch every timer the sim reads without
 * any of them knowing.
 *
 * Screen: the HUD band on top (lives, gold, wave, controls), the field, and the bottom band
 * (build cards on the left, the ability dock on the right). A selected tower's panel docks to
 * the side of the field away from it; banners, notices and the NEW HUSK card always sit in the
 * free part of the field so nothing is drawn under the panel.
 */
export class StrongholdScene extends Phaser.Scene {
  private loadout: string[] = [];
  private diff: StrongholdDifficultyDef = getStrongholdDifficulty('normal');
  private map: StrongholdMapDef = getStrongholdMap('kingsroad');

  private towers: Tower[] = [];
  private husks: RoadHusk[] = [];
  private huskGroup!: Phaser.Physics.Arcade.Group;
  private projectiles!: Phaser.Physics.Arcade.Group;
  private combat!: TowerCombat;
  private traits!: HuskRoadTraits;
  private animateMap: ((time: number) => void) | null = null;

  private gold = 0;
  private lives = 0;
  private wave = 0;
  private wavesCleared = 0;
  private kills = 0;
  private state: RunState = 'prep';
  private nextWaveAt = 0;
  private plan: WavePlan | null = null;
  private spawnIdx = 0;
  private waveStartedAt = 0;
  /** Breaches the keep wards can still soak this wave. */
  private wardLeft = 0;
  private trickleAccum = 0;
  private readonly rand = (): number => Math.random();
  /** Husk families already introduced this run. */
  private seenFamilies = new Set<string>();
  private introQueue: Array<{ title: string; body: string; build: string; color: number }> = [];
  private introUntil = 0;
  private introObjs: Phaser.GameObjects.GameObject[] = [];

  // Clock
  private simNow = 0;
  private speedIdx = 0;
  private paused = false;
  private journalOpen = false;
  private clockHook: ((time: number, delta: number) => void) | null = null;

  // Interaction
  private selected: Tower | null = null;
  private placing: string | null = null;
  private aiming: Tower | null = null;
  private ghostImg: Phaser.GameObjects.Image | null = null;
  private ghostG!: Phaser.GameObjects.Graphics;
  private ghostText!: Phaser.GameObjects.Text;
  private hoverTower: Tower | null = null;

  // HUD
  private hudG!: Phaser.GameObjects.Graphics;
  private livesText!: Phaser.GameObjects.Text;
  private goldText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private remainText!: Phaser.GameObjects.Text;
  private nextWaveBtn!: UiButton;
  private speedBtn!: UiButton;
  private pauseBtn!: UiButton;
  private hintText!: Phaser.GameObjects.Text;
  private pauseVeil: Phaser.GameObjects.GameObject[] = [];
  private trayCards: Array<{ id: string; paint: (gold: number) => void; zone: Phaser.GameObjects.Zone }> = [];
  private tipObjs: Phaser.GameObjects.GameObject[] = [];
  // Ability dock
  private dockG!: Phaser.GameObjects.Graphics;
  private dockObjs: Phaser.GameObjects.GameObject[] = [];
  private dockGroups: DockGroup[] = [];
  private dockKey = '';
  // Tower panel
  private panelObjects: Phaser.GameObjects.GameObject[] = [];
  private panelTower: Tower | null = null;
  private panelKey = '';
  private panelStats: Phaser.GameObjects.Text | null = null;
  private panelActive: { btn: UiButton; tower: Tower } | null = null;
  private keepG!: Phaser.GameObjects.Graphics;
  private keepFlashUntil = 0;
  private bannerText: Phaser.GameObjects.Text | null = null;
  private noticeText: Phaser.GameObjects.Text | null = null;
  private pendingDmg = new Map<RoadHusk, { amount: number; at: number }>();

  constructor() {
    super({ key: 'StrongholdScene' });
  }

  init(data: StrongholdSceneData): void {
    this.loadout = (data?.elements ?? ['fire']).filter((id) => !!TOWER_DEFS[id]).slice(0, 6);
    if (this.loadout.length === 0) this.loadout = ['fire'];
    this.diff = getStrongholdDifficulty(data?.difficulty);
    this.map = getStrongholdMap(data?.map);
  }

  create(): void {
    Music.play('invasion', { intensity: 0.35 });
    setActiveMap(this.map);
    this.installClock();
    this.towers = [];
    this.husks = [];
    this.trayCards = [];
    this.tipObjs = [];
    this.dockObjs = [];
    this.dockGroups = [];
    this.dockKey = '';
    this.pauseVeil = [];
    this.selected = null;
    this.placing = null;
    this.aiming = null;
    this.hoverTower = null;
    this.panelTower = null;
    this.panelKey = '';
    this.panelStats = null;
    this.panelActive = null;
    this.noticeText = null;
    this.bannerText = null;
    this.pendingDmg.clear();
    this.seenFamilies.clear();
    this.introQueue = [];
    this.introObjs = [];
    this.introUntil = 0;
    this.gold = this.diff.startGold;
    this.lives = this.diff.lives;
    this.wave = 0;
    this.wavesCleared = 0;
    this.kills = 0;
    this.wardLeft = 0;
    this.trickleAccum = 0;
    this.state = 'prep';
    this.plan = null;
    this.spawnIdx = 0;
    this.paused = false;
    this.journalOpen = false;
    this.speedIdx = 0;
    this.nextWaveAt = this.time.now + FIRST_PREP_MS;

    this.cameras.main.setBackgroundColor('#0a0a14');
    this.makeTextures();

    this.animateMap = drawMap(this).animate;
    this.keepG = this.add.graphics().setDepth(1.6);

    this.huskGroup = this.physics.add.group();
    this.projectiles = this.physics.add.group();
    this.physics.world.timeScale = 1;
    this.physics.world.resume();
    const scene = this;
    this.traits = new HuskRoadTraits({
      scene,
      husks: () => scene.husks,
      towers: () => scene.towers,
      spawnChild: (variant, track, pathDist, opts) => scene.spawnChild(variant, track, pathDist, opts),
      floatText: (x, y, text, color, size) => scene.floatText(x, y, text, color, size),
      eatShots: (x, y, r) => scene.combat.eatShots(x, y, r),
      bendShots: (h, r) => scene.combat.bendShots(h, r),
      hurtHusk: (h, amount) => scene.combat.hitHusk(h, amount, undefined, null, true, true, 'blast'),
      ring: (x, y, r, color, ms) => scene.combat.ring(x, y, r, color, ms),
      zap: (x1, y1, x2, y2, color) => scene.combat.zap(x1, y1, x2, y2, color),
    });
    this.combat = new TowerCombat({
      scene,
      husks: () => scene.husks,
      towers: () => scene.towers,
      projectiles: this.projectiles,
      traits: this.traits,
      floatText: (x, y, text, color, size) => scene.floatText(x, y, text, color, size),
      addGold: (amount, x, y) => { scene.gold += amount; scene.floatText(x, y, `+${amount} 🪙`, '#ffd700', 12); },
      claimHusk: (h) => scene.onHuskKilled(h, true),
      mendKeep: (amount) => scene.mendKeep(amount),
      banish: (h) => { h.pathDist = 0; h.place(); },
    });
    this.physics.add.overlap(this.projectiles, this.huskGroup, (a, b) => {
      const shot = a as TowerShot;
      const husk = b as RoadHusk;
      if (shot instanceof TowerShot && husk instanceof RoadHusk) this.combat.onShotHit(shot, husk);
    });

    this.ghostG = this.add.graphics().setDepth(9);
    this.ghostText = this.add.text(0, 0, '', {
      fontSize: '10px', fontFamily: FONT_DISPLAY, color: '#ff6b85', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(9.5);
    this.buildHud();
    this.buildTray();
    this.buildDock();
    this.wireInput();

    this.showBanner(`${this.map.name}  —  BUILD`, STRONGHOLD_ACCENT, 2600);
    if (this.map.tracks.length > 1) {
      this.time.delayedCall(2800, () => this.showBanner('TWO ROADS  —  HOLD BOTH', C.blood, 2200));
    }

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());
  }

  private teardown(): void {
    if (this.clockHook) this.sys.events.off(Phaser.Scenes.Events.UPDATE, this.clockHook, this);
    this.clockHook = null;
    this.combat?.destroy();
    this.traits?.destroy();
    for (const t of this.towers) t.destroy();
    this.towers = [];
    for (const h of this.husks) h.destroy();
    this.husks = [];
  }

  // ── Clock ─────────────────────────────────────────────────────────

  /**
   * Put the run's own clock in front of the scene's: every `time.now` the sim reads, and every
   * delayed call, advances by real time × speed, and not at all while paused.
   */
  private installClock(): void {
    const clock = this.time;
    const events = this.sys.events;
    events.off(Phaser.Scenes.Events.UPDATE, clock.update, clock);
    if (this.clockHook) events.off(Phaser.Scenes.Events.UPDATE, this.clockHook, this);
    this.simNow = clock.now;
    this.clockHook = (_time: number, delta: number): void => {
      const d = this.paused ? 0 : delta * this.speed;
      this.simNow += d;
      Phaser.Time.Clock.prototype.update.call(clock, this.simNow, d);
    };
    events.on(Phaser.Scenes.Events.UPDATE, this.clockHook, this);
  }

  private get speed(): number { return SPEEDS[this.speedIdx]; }

  private cycleSpeed(): void {
    this.speedIdx = (this.speedIdx + 1) % SPEEDS.length;
    this.physics.world.timeScale = 1 / this.speed;
    this.speedBtn.setLabel(`${this.speed}×`);
    Sfx.click();
  }

  private setPaused(on: boolean, veil = true): void {
    if (this.state === 'over' && on) return;
    this.paused = on;
    if (on) this.physics.world.pause(); else this.physics.world.resume();
    this.pauseBtn.setLabel(on ? 'RESUME' : 'PAUSE');
    for (const o of this.pauseVeil) o.destroy();
    this.pauseVeil = [];
    if (on && veil) {
      const { width } = this.scale;
      const r = this.freeRect();
      const g = this.add.graphics().setDepth(34);
      g.fillStyle(0x000000, 0.35); g.fillRect(0, HUD_H, width, FIELD_BOTTOM - HUD_H + 6);
      const t = this.add.text(r.cx, HUD_H + 150, 'PAUSED', {
        fontSize: '30px', fontFamily: FONT_DISPLAY, color: T.bright, letterSpacing: 8, stroke: '#000000', strokeThickness: 6,
      }).setOrigin(0.5).setDepth(35);
      const s = this.add.text(r.cx, HUD_H + 184, 'P or the RESUME button to carry on', {
        fontSize: '11px', fontFamily: FONT_UI, color: T.dim,
      }).setOrigin(0.5).setDepth(35);
      this.pauseVeil = [g, t, s];
    }
  }

  private openJournal(focus?: string): void {
    if (this.journalOpen) return;
    this.journalOpen = true;
    this.cancelPlacing();
    const wasPaused = this.paused;
    this.setPaused(true, false);
    this.input.enabled = false;
    const data: StrongholdJournalData = {
      loadout: this.loadout,
      focus: focus ?? this.selected?.elementId,
      seen: [...this.seenFamilies],
      caller: 'StrongholdScene',
      onClose: () => {
        this.journalOpen = false;
        this.input.enabled = true;
        if (!wasPaused) this.setPaused(false);
        else this.setPaused(true);
      },
    };
    this.scene.launch('StrongholdJournalScene', data);
    this.scene.bringToTop('StrongholdJournalScene');
  }

  /** Procedural projectile looks. */
  private makeTextures(): void {
    const make = (key: string, w: number, h: number, draw: (g: Phaser.GameObjects.Graphics) => void): void => {
      if (this.textures.exists(key)) return;
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      draw(g);
      g.generateTexture(key, w, h);
      g.destroy();
    };
    make('sh-orb', 14, 14, (g) => { g.fillStyle(0xffffff, 1); g.fillCircle(7, 7, 6); g.fillStyle(0xffffff, 0.5); g.fillCircle(7, 7, 7); });
    make('sh-dart', 18, 6, (g) => { g.fillStyle(0xffffff, 1); g.fillTriangle(0, 1, 0, 5, 18, 3); g.fillStyle(0xdddddd, 1); g.fillRect(0, 0, 4, 6); });
    make('sh-needle', 22, 4, (g) => { g.fillStyle(0xffffff, 1); g.fillTriangle(0, 1, 0, 3, 22, 2); g.fillRect(0, 1, 16, 2); });
    make('sh-fan', 18, 18, (g) => {
      g.fillStyle(0xffffff, 1);
      g.slice(9, 9, 9, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(340), false); g.fillPath();
      g.lineStyle(1, 0x8899aa, 1); for (let i = 0; i < 5; i++) { const a = Phaser.Math.DegToRad(205 + i * 32); g.lineBetween(9, 9, 9 + Math.cos(a) * 8, 9 + Math.sin(a) * 8); }
    });
    make('sh-card', 10, 14, (g) => { g.fillStyle(0xffffff, 1); g.fillRoundedRect(0, 0, 10, 14, 2); g.fillStyle(0xcc2244, 1); g.fillTriangle(5, 3, 2, 7, 5, 11); g.fillTriangle(5, 3, 8, 7, 5, 11); });
    make('sh-shell', 12, 12, (g) => { g.fillStyle(0x222222, 1); g.fillCircle(6, 6, 6); g.fillStyle(0xffffff, 0.5); g.fillCircle(4, 4, 2); });
    make('sh-star', 16, 16, (g) => {
      g.fillStyle(0xffffff, 1);
      const pts: Phaser.Types.Math.Vector2Like[] = [];
      for (let i = 0; i < 10; i++) { const r = i % 2 ? 3 : 8; const a = -Math.PI / 2 + i * Math.PI / 5; pts.push({ x: 8 + Math.cos(a) * r, y: 8 + Math.sin(a) * r }); }
      g.fillPoints(pts, true);
    });
    make('sh-note', 12, 16, (g) => { g.fillStyle(0xffffff, 1); g.fillEllipse(4, 12, 8, 6); g.fillRect(7, 1, 2, 12); g.fillTriangle(8, 1, 12, 4, 8, 6); });
    make('sh-coin', 12, 12, (g) => { g.fillStyle(0xffffff, 1); g.fillCircle(6, 6, 6); g.lineStyle(1, 0x999999, 1); g.strokeCircle(6, 6, 4); });
    make('sh-bubble', 14, 14, (g) => { g.lineStyle(2, 0xffffff, 1); g.strokeCircle(7, 7, 6); g.fillStyle(0xffffff, 0.6); g.fillCircle(5, 5, 2); });
    make('sh-feather', 18, 8, (g) => { g.fillStyle(0xffffff, 1); g.fillEllipse(9, 4, 18, 6); g.lineStyle(1, 0x999999, 1); g.lineBetween(0, 4, 18, 4); });
    make('sh-bone', 18, 8, (g) => { g.fillStyle(0xffffff, 1); g.fillRect(3, 3, 12, 2); g.fillCircle(3, 2.5, 2.5); g.fillCircle(3, 5.5, 2.5); g.fillCircle(15, 2.5, 2.5); g.fillCircle(15, 5.5, 2.5); });
    make('sh-shard', 16, 8, (g) => { g.fillStyle(0xffffff, 1); g.fillTriangle(0, 4, 6, 0, 16, 4); g.fillStyle(0xdddddd, 1); g.fillTriangle(0, 4, 6, 8, 16, 4); });
    make('sh-bolt', 22, 6, (g) => { g.fillStyle(0xffffff, 1); g.fillRoundedRect(0, 1, 22, 4, 2); g.fillStyle(0xffffff, 0.4); g.fillRoundedRect(0, 0, 22, 6, 3); });
    make('sh-plane', 18, 14, (g) => { g.fillStyle(0xffffff, 1); g.fillTriangle(0, 0, 18, 7, 0, 14); g.fillStyle(0xcccccc, 1); g.fillTriangle(0, 7, 18, 7, 4, 10); });
    make('sh-bee', 14, 10, (g) => { g.fillStyle(0xffffff, 1); g.fillEllipse(7, 6, 12, 8); g.fillStyle(0x222222, 1); g.fillRect(5, 2, 2, 8); g.fillRect(9, 2, 2, 8); g.fillStyle(0xffffff, 0.6); g.fillEllipse(6, 1, 6, 3); });
    make('sh-pawn', 10, 14, (g) => { g.fillStyle(0xffffff, 1); g.fillCircle(5, 4, 3.5); g.fillTriangle(1, 13, 9, 13, 5, 5); g.fillRect(0, 12, 10, 2); });
  }

  // ── HUD ───────────────────────────────────────────────────────────

  private buildHud(): void {
    const { width, height } = this.scale;
    this.hudG = this.add.graphics().setDepth(DEPTH.content);
    fillNotched(this.hudG, 0, 0, width, HUD_H - 4, mix(C.bg, STRONGHOLD_ACCENT, 0.06), 0.97, 0, ALL_CORNERS);
    this.hudG.lineStyle(1, mix(STRONGHOLD_ACCENT, C.line, 0.5), 0.8);
    this.hudG.lineBetween(0, HUD_H - 4, width, HUD_H - 4);
    fillNotched(this.hudG, 0, BAND_Y, width, height - BAND_Y, mix(C.bg, STRONGHOLD_ACCENT, 0.06), 0.97, 0, ALL_CORNERS);
    this.hudG.lineBetween(0, BAND_Y, width, BAND_Y);
    // The dock's well, so the right of the band reads as a separate tray.
    fillNotched(this.hudG, DOCK_X - 8, BAND_Y + 18, width - DOCK_X, CARD_H + 6, mix(C.well, STRONGHOLD_ACCENT, 0.05), 0.9, 8, ALL_CORNERS);

    const cy = HUD_H / 2 - 2;
    // Lives and gold sit in two chips on the left.
    fillNotched(this.hudG, 10, cy - 15, 96, 30, mix(C.well, C.blood, 0.12), 1, 6, ALL_CORNERS);
    fillNotched(this.hudG, 112, cy - 15, 124, 30, mix(C.well, C.gold, 0.12), 1, 6, ALL_CORNERS);
    drawIcon(this.hudG, 'heart', 28, cy, 10, C.blood);
    drawIcon(this.hudG, 'coin', 130, cy, 10, C.gold);
    const mk = (x: number, color: string, size = 17): Phaser.GameObjects.Text => this.add.text(x, cy, '', {
      fontSize: `${size}px`, fontFamily: FONT_MONO, color,
    }).setOrigin(0, 0.5).setDepth(DEPTH.content + 1);
    this.livesText = mk(44, T.bright);
    this.goldText = mk(146, T.gold);

    // The centre column runs between the resource chips and the control group.
    const midX = 377;
    this.waveText = this.add.text(midX, cy - 8, '', {
      fontSize: '15px', fontFamily: FONT_DISPLAY, color: T.bright, letterSpacing: 2,
    }).setOrigin(0.5).setDepth(DEPTH.content + 1);
    this.remainText = this.add.text(midX, cy + 11, '', {
      fontSize: '10px', fontFamily: FONT_UI, color: T.dim,
    }).setOrigin(0.5).setDepth(DEPTH.content + 1);

    addButton(this, {
      x: width - 398, y: cy, w: 88, h: 30, label: 'JOURNAL', iconArt: 'book', accent: C.gold, variant: 'ghost',
      fontSize: 10, cut: 6, depth: DEPTH.content + 1, onClick: () => this.openJournal(),
    });
    this.pauseBtn = addButton(this, {
      x: width - 310, y: cy, w: 70, h: 30, label: 'PAUSE', accent: C.steel, variant: 'ghost',
      fontSize: 10, cut: 6, depth: DEPTH.content + 1, onClick: () => this.setPaused(!this.paused),
    });
    this.speedBtn = addButton(this, {
      x: width - 246, y: cy, w: 40, h: 30, label: '1×', accent: STRONGHOLD_ACCENT, variant: 'ghost',
      fontSize: 11, cut: 6, depth: DEPTH.content + 1, onClick: () => this.cycleSpeed(),
    });
    this.nextWaveBtn = addButton(this, {
      x: width - 134, y: cy, w: 170, h: 34,
      label: 'NEXT WAVE', accent: C.verdant, variant: 'solid', fontSize: 12, cut: 8, iconArt: 'play',
      depth: DEPTH.content + 1,
      onClick: () => this.callWave(),
    });
    addIconButton(this, {
      x: width - 28, y: cy, r: 15, iconArt: 'cross', accent: C.steel, tooltip: 'Abandon the run',
      depth: DEPTH.content + 1,
      onClick: () => this.confirmLeave(),
    });
    this.add.text(width - 12, BAND_Y + 9, `${this.map.name}  ·  ${this.diff.label}`, {
      fontSize: '8px', fontFamily: FONT_DISPLAY, color: T.faint, letterSpacing: 2,
    }).setOrigin(1, 0.5).setDepth(DEPTH.content + 1);
    this.hintText = this.add.text(12, BAND_Y + 9, '', {
      fontSize: '8px', fontFamily: FONT_DISPLAY, color: T.ghost, letterSpacing: 1,
    }).setOrigin(0, 0.5).setDepth(DEPTH.content + 1);
  }

  private refreshHud(): void {
    this.livesText.setText(`${this.lives}`);
    this.goldText.setText(`${this.gold}`);
    const now = this.time.now;
    if (this.state === 'prep') {
      const left = Math.max(0, Math.ceil((this.nextWaveAt - now) / 1000));
      this.waveText.setText(this.wave === 0 ? 'PREPARE' : `WAVE ${this.wave} CLEARED`);
      this.remainText.setText(`wave ${this.wave + 1} in ${left}s`);
      this.nextWaveBtn.setLabel(`NEXT WAVE  +${this.earlyBonus()}`);
      this.nextWaveBtn.setDisabled(false);
    } else if (this.state === 'active') {
      const total = this.plan?.spawns.length ?? 0;
      const left = total - this.spawnIdx + this.husks.length;
      const tag = this.plan?.isBoss ? 'BOSS  ·  ' : this.plan?.theme ? `${this.plan.theme.title}  ·  ` : '';
      this.waveText.setText(`WAVE ${this.wave}`);
      this.remainText.setText(`${tag}${left} husk${left === 1 ? '' : 's'} left${this.wardLeft > 0 ? `  ·  ward ${this.wardLeft}` : ''}`);
      this.nextWaveBtn.setLabel('IN PROGRESS');
      this.nextWaveBtn.setDisabled(true);
    }
    this.hintText.setText(this.hint());
    for (const c of this.trayCards) c.paint(this.gold);
    const t = this.panelTower;
    if (t) {
      if (this.panelKeyFor(t) !== this.panelKey) this.renderPanel();
      else this.refreshPanelLive(t);
    }
    this.refreshDock();
  }

  /** The one line of help the bottom band shows, for whatever the player is doing. */
  private hint(): string {
    if (this.aiming) return 'CLICK THE FIELD TO AIM  ·  ESC TO CANCEL';
    if (this.placing) {
      const def = TOWER_DEFS[this.placing];
      const naval = def.body.kind === 'water' ? '  ·  NAVAL: BUILD IN WATER' : '';
      return `CLICK THE FIELD TO BUILD  ·  RIGHT-CLICK OR ESC TO CANCEL${naval}`;
    }
    if (this.selected) return 'Z / X / C  UPGRADE A PATH  ·  F ABILITY  ·  TAB TARGET  ·  DEL SELL  ·  J JOURNAL';
    return '1–6 BUILD  ·  CLICK A TOWER TO UPGRADE  ·  SPACE NEXT WAVE  ·  P PAUSE  ·  J JOURNAL';
  }

  private earlyBonus(): number {
    return Math.max(0, Math.floor((this.nextWaveAt - this.time.now) / 1000)) * 2;
  }

  // ── Build tray ────────────────────────────────────────────────────

  /** What a tower costs to build at a spot, after any temple discount around it. */
  private placeCost(id: string, x?: number, y?: number): number {
    const def = TOWER_DEFS[id];
    if (x === undefined || y === undefined) return def.cost;
    return Math.round(def.cost * this.discountAt(x, y));
  }

  private discountAt(x: number, y: number): number {
    let m = 1;
    for (const t of this.towers) {
      const d = t.traits.discount;
      if (d && Math.hypot(t.padX - x, t.padY - y) <= d.radius) m = Math.min(m, d.mult);
    }
    return m;
  }

  private buildTray(): void {
    const n = this.loadout.length;
    const gap = 6;
    this.loadout.forEach((id, i) => {
      const def = TOWER_DEFS[id];
      const el = findElementDef(id);
      const color = el?.color ?? 0xffffff;
      const x = 10 + CARD_W / 2 + i * (CARD_W + gap);
      const y = CARD_Y;
      const g = this.add.graphics().setDepth(DEPTH.content);
      const tex = `elem-${id}`;
      const img = this.textures.exists(tex) ? this.add.image(x - 36, y + 1, tex).setScale(0.6).setDepth(DEPTH.content + 1) : null;
      const name = this.add.text(x - 16, y - 14, (el?.name ?? id).toUpperCase(), {
        fontSize: '10px', fontFamily: FONT_DISPLAY, color: hex(mix(color, 0xffffff, 0.45)), letterSpacing: 1,
      }).setOrigin(0, 0.5).setDepth(DEPTH.content + 1);
      this.add.text(x - 16, y, ROLE_LABEL[def.role], {
        fontSize: '7px', fontFamily: FONT_DISPLAY, color: T.faint, letterSpacing: 1,
      }).setOrigin(0, 0.5).setDepth(DEPTH.content + 1);
      const cost = this.add.text(x - 16, y + 14, `${def.cost} 🪙`, {
        fontSize: '11px', fontFamily: FONT_MONO, color: T.gold,
      }).setOrigin(0, 0.5).setDepth(DEPTH.content + 1);
      this.add.text(x + CARD_W / 2 - 6, y - CARD_H / 2 + 8, `${i + 1}`, {
        fontSize: '9px', fontFamily: FONT_DISPLAY, color: T.faint,
      }).setOrigin(1, 0.5).setDepth(DEPTH.content + 1);
      let lastState = '';
      const paint = (gold: number): void => {
        const can = gold >= def.cost;
        const active = this.placing === id;
        const st = `${can}-${active}`;
        if (st === lastState) return;
        lastState = st;
        g.clear();
        fillNotched(g, x - CARD_W / 2, y - CARD_H / 2, CARD_W, CARD_H, active ? mix(C.plate, color, 0.35) : can ? mix(C.plate, color, 0.14) : mix(C.plate, 0x000000, 0.4), 1, 8, ALL_CORNERS);
        strokeNotched(g, x - CARD_W / 2, y - CARD_H / 2, CARD_W, CARD_H, active ? mix(color, 0xffffff, 0.3) : can ? color : C.line, active ? 1 : 0.7, active ? 2 : 1, 8, ALL_CORNERS);
        img?.setAlpha(can ? 1 : 0.35);
        name.setAlpha(can ? 1 : 0.45);
        cost.setColor(can ? T.gold : T.bad);
      };
      paint(this.gold);
      const zone = this.add.zone(x, y, CARD_W, CARD_H).setInteractive({ useHandCursor: true }).setDepth(DEPTH.content + 2);
      zone.on('pointerdown', (p: Phaser.Input.Pointer) => { if (p.rightButtonDown()) return; this.beginPlacing(id); });
      zone.on('pointerover', () => this.showTowerTip(id, x));
      zone.on('pointerout', () => this.hideTip());
      this.trayCards.push({ id, paint, zone });
    });
    void n;
  }

  /** Hovering a build card: what the tower is, above the band. */
  private showTowerTip(id: string, cardX: number): void {
    this.hideTip();
    const def = TOWER_DEFS[id];
    const el = findElementDef(id);
    const color = el?.color ?? 0xffffff;
    const w = 280, h = 104;
    const x = Phaser.Math.Clamp(cardX - w / 2, 8, this.scale.width - w - 8);
    const y = BAND_Y - h - 8;
    const g = this.add.graphics().setDepth(45);
    fillNotched(g, x, y, w, h, mix(C.plate, color, 0.12), 0.97, 8, ALL_CORNERS);
    strokeNotched(g, x, y, w, h, color, 0.8, 1.5, 8, ALL_CORNERS);
    const reach = def.range > 900 ? 'whole map' : `${def.range}`;
    const a = this.add.text(x + 12, y + 12, `${(el?.name ?? id).toUpperCase()}  ·  ${def.cost} 🪙`, {
      fontSize: '12px', fontFamily: FONT_DISPLAY, color: hex(mix(color, 0xffffff, 0.45)), letterSpacing: 1,
    }).setOrigin(0, 0.5).setDepth(46);
    const b = this.add.text(x + 12, y + 28, `${ROLE_LABEL[def.role]}  ·  ${BODY_LABEL[def.body.kind]}  ·  RANGE ${reach}`, {
      fontSize: '8px', fontFamily: FONT_DISPLAY, color: T.faint, letterSpacing: 1,
    }).setOrigin(0, 0.5).setDepth(46);
    const c = this.add.text(x + 12, y + 40, `${def.blurb}\n✦ ${def.signature.name}: ${def.signature.desc}\nPaths: ${def.paths.map((p) => p.name).join(' · ')}`, {
      fontSize: '9px', fontFamily: FONT_UI, color: T.normal, wordWrap: { width: w - 24 }, lineSpacing: 2,
    }).setOrigin(0, 0).setDepth(46);
    this.tipObjs = [g, a, b, c];
  }

  private hideTip(): void {
    for (const o of this.tipObjs) o.destroy();
    this.tipObjs = [];
  }

  // ── Ability dock ──────────────────────────────────────────────────

  private buildDock(): void {
    this.dockG = this.add.graphics().setDepth(DEPTH.content + 1);
    this.add.text(DOCK_X, BAND_Y + 25, 'ABILITIES', {
      fontSize: '7px', fontFamily: FONT_DISPLAY, color: T.faint, letterSpacing: 2,
    }).setOrigin(0, 0.5).setDepth(DEPTH.content + 1);
  }

  /** Abilities grouped by name: towers sharing one share a button, and it fires the readiest. */
  private computeDockGroups(): DockGroup[] {
    const map = new Map<string, DockGroup>();
    for (const t of this.towers) {
      const a = t.active;
      if (!a) continue;
      const key = `${t.elementId}:${a.name}`;
      let g = map.get(key);
      if (!g) { g = { key, name: a.name, color: t.color, towers: [] }; map.set(key, g); }
      g.towers.push(t);
    }
    return [...map.values()].slice(0, DOCK_SLOTS);
  }

  private refreshDock(): void {
    const groups = this.computeDockGroups();
    const key = groups.map((g) => `${g.key}×${g.towers.length}`).join('|');
    if (key !== this.dockKey) {
      this.dockKey = key;
      this.dockGroups = groups;
      for (const o of this.dockObjs) o.destroy();
      this.dockObjs = [];
      groups.forEach((g, i) => {
        const cx = DOCK_X + 22 + i * 44, cy = CARD_Y + 6;
        const zone = this.add.zone(cx, cy, 40, 40).setInteractive({ useHandCursor: true }).setDepth(DEPTH.content + 3);
        zone.on('pointerdown', () => this.fireDock(i));
        zone.on('pointerover', () => this.showDockTip(g, cx));
        zone.on('pointerout', () => this.hideTip());
        const label = this.add.text(cx, cy, g.name.split(/\s+/).map((w) => w[0]).join('').slice(0, 3).toUpperCase(), {
          fontSize: '11px', fontFamily: FONT_DISPLAY, color: '#ffffff', stroke: '#000000', strokeThickness: 3,
        }).setOrigin(0.5).setDepth(DEPTH.content + 2);
        const keyT = this.add.text(cx - 18, cy - 18, DOCK_KEYS[i], {
          fontSize: '8px', fontFamily: FONT_DISPLAY, color: T.faint,
        }).setOrigin(0, 0).setDepth(DEPTH.content + 2);
        const count = g.towers.length > 1 ? this.add.text(cx + 18, cy + 18, `×${g.towers.length}`, {
          fontSize: '8px', fontFamily: FONT_MONO, color: T.gold,
        }).setOrigin(1, 1).setDepth(DEPTH.content + 2) : null;
        this.dockObjs.push(zone, label, keyT);
        if (count) this.dockObjs.push(count);
      });
    }
    // Cooldown sweeps.
    const g = this.dockG;
    g.clear();
    const now = this.time.now;
    if (this.dockGroups.length === 0) {
      return;
    }
    this.dockGroups.forEach((grp, i) => {
      const cx = DOCK_X + 22 + i * 44, cy = CARD_Y + 6;
      const best = this.readiest(grp);
      const cd = best?.active?.cooldown ?? 1;
      const left = best ? Math.max(0, best.activeReadyAt - now) : cd;
      const ready = left <= 0;
      g.fillStyle(ready ? mix(grp.color, 0x000000, 0.25) : mix(C.well, grp.color, 0.15), 1);
      g.fillCircle(cx, cy, 18);
      if (!ready) {
        g.fillStyle(0x000000, 0.55);
        g.slice(cx, cy, 18, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (left / cd), false);
        g.fillPath();
      }
      g.lineStyle(ready ? 2.5 : 1.5, ready ? mix(grp.color, 0xffffff, 0.5) : C.line, ready ? 0.6 + Math.sin(now / 200) * 0.3 : 0.8);
      g.strokeCircle(cx, cy, 18);
    });
  }

  private readiest(g: DockGroup): Tower | null {
    let best: Tower | null = null;
    for (const t of g.towers) if (!best || t.activeReadyAt < best.activeReadyAt) best = t;
    return best;
  }

  private showDockTip(g: DockGroup, cx: number): void {
    this.hideTip();
    const a = g.towers[0].active;
    if (!a) return;
    const w = 240, h = 62;
    const x = Phaser.Math.Clamp(cx - w / 2, 8, this.scale.width - w - 8);
    const y = BAND_Y - h - 8;
    const bg = this.add.graphics().setDepth(45);
    fillNotched(bg, x, y, w, h, mix(C.plate, g.color, 0.14), 0.97, 8, ALL_CORNERS);
    strokeNotched(bg, x, y, w, h, g.color, 0.8, 1.5, 8, ALL_CORNERS);
    const t1 = this.add.text(x + 10, y + 12, `${a.name.toUpperCase()}  ·  ${Math.round(a.cooldown / 1000)}s`, {
      fontSize: '11px', fontFamily: FONT_DISPLAY, color: hex(mix(g.color, 0xffffff, 0.5)), letterSpacing: 1,
    }).setOrigin(0, 0.5).setDepth(46);
    const t2 = this.add.text(x + 10, y + 24, a.desc, {
      fontSize: '9px', fontFamily: FONT_UI, color: T.normal, wordWrap: { width: w - 20 },
    }).setOrigin(0, 0).setDepth(46);
    this.tipObjs = [bg, t1, t2];
  }

  private fireDock(i: number): void {
    const g = this.dockGroups[i];
    if (!g) return;
    const now = this.time.now;
    const t = g.towers.filter((x) => x.activeReady(now)).sort((a, b) => a.activeReadyAt - b.activeReadyAt)[0];
    if (!t) { Sfx.denied(); return; }
    this.activate(t);
  }

  /** Press a tower's ability. */
  private activate(t: Tower): void {
    const a = t.active;
    const now = this.time.now;
    if (!a || this.state === 'over') return;
    if (!t.activeReady(now)) { Sfx.denied(); this.floatText(t.x, t.y - 50, 'RECHARGING', '#ff6b85', 11); return; }
    if (t.stunned) { Sfx.denied(); this.floatText(t.x, t.y - 50, 'STUNNED', '#ff6b85', 11); return; }
    const cast = t.resolveActive(now);
    let target: RoadHusk | null = this.pickTarget(t, now);
    if (!target && (a.global || cast)) target = this.leadHusk(now, a.global ? 99999 : t.range * 1.6, t);
    if (cast && !target && !a.selfBuff && !['field', 'mend', 'rally', 'gold', 'overclock', 'nova', 'aura'].includes(cast.fx.kind)) {
      Sfx.denied(); this.floatText(t.x, t.y - 50, 'NO TARGET', '#ff6b85', 11); return;
    }
    t.activeReadyAt = now + a.cooldown;
    if (a.selfBuff) t.addBuff({ until: now + a.selfBuff.ms, fireRateMult: a.selfBuff.fireRateMult ?? 1, damageMult: a.selfBuff.damageMult ?? 1, rangeMult: a.selfBuff.rangeMult });
    if (cast) this.combat.cast(t, cast, target, now, undefined, true);
    else t.gesture('active');
    this.combat.ring(t.x, t.y, 46, t.color, 500);
    this.floatText(t.x, t.y - 54, a.name.toUpperCase(), hex(mix(t.color, 0xffffff, 0.5)), 14);
    Sfx.playAt('status-buff', t.x, { volume: 0.6 });
  }

  /** The husk furthest along within `reach` of the tower (the whole map for a global ability). */
  private leadHusk(now: number, reach: number, t: Tower): RoadHusk | null {
    let lead: RoadHusk | null = null;
    for (const h of this.husks) {
      if (!h.targetable(now, true) || Math.hypot(h.x - t.x, h.y - t.y) > reach) continue;
      if (!lead || h.pathDist / h.track.length > lead.pathDist / lead.track.length) lead = h;
    }
    return lead;
  }

  // ── Input ─────────────────────────────────────────────────────────

  private wireInput(): void {
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onPointerDown(p));
    const kb = this.input.keyboard!;
    const on = (key: string, fn: (e: KeyboardEvent) => void): void => {
      kb.on(`keydown-${key}`, (e: KeyboardEvent) => { if (this.journalOpen || this.state === 'over') return; fn(e); });
    };
    for (let i = 0; i < this.loadout.length; i++) {
      on(['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX'][i], () => this.beginPlacing(this.loadout[i]));
    }
    on('ESC', () => {
      if (this.aiming) { this.aiming = null; return; }
      if (this.placing) { this.cancelPlacing(); return; }
      if (this.selected) { this.select(null); return; }
      this.confirmLeave();
    });
    on('SPACE', () => { if (this.state === 'prep') this.callWave(); });
    on('P', () => this.setPaused(!this.paused));
    on('J', () => this.openJournal());
    on('Z', () => { if (this.selected) this.buyPath(0); });
    on('X', () => { if (this.selected) this.buyPath(1); });
    on('C', () => { if (this.selected) this.buyPath(2); });
    on('COMMA', () => { if (this.selected) this.buyPath(0); });
    on('PERIOD', () => { if (this.selected) this.buyPath(1); });
    on('FORWARD_SLASH', () => { if (this.selected) this.buyPath(2); });
    on('F', () => { if (this.selected?.active) this.activate(this.selected); });
    on('DELETE', () => { if (this.selected) this.sellSelected(); });
    on('BACKSPACE', () => { if (this.selected) this.sellSelected(); });
    on('TAB', (e) => { e.preventDefault?.(); if (this.selected) this.cycleMode(this.selected); });
    DOCK_KEYS.forEach((k, i) => on(k, () => this.fireDock(i)));
  }

  private onPointerDown(p: Phaser.Input.Pointer): void {
    if (this.state === 'over' || this.journalOpen) return;
    p.updateWorldPoint(this.cameras.main);
    const x = p.worldX, y = p.worldY;
    if (p.rightButtonDown()) { this.aiming = null; this.cancelPlacing(); this.select(null); return; }
    if (y < HUD_H || y > FIELD_BOTTOM + 6) return;
    if (this.panelTower && this.pointInPanel(x, y)) return;
    if (this.aiming) { this.setAim(this.aiming, x, y); return; }
    if (this.placing) { this.tryPlace(this.placing, x, y); return; }
    const hit = this.towers.find((t) => t.contains(x, y)) ?? null;
    this.select(hit);
  }

  private setAim(t: Tower, x: number, y: number): void {
    if (Math.hypot(x - t.padX, y - t.padY) > t.range) {
      Sfx.denied();
      this.floatText(x, y - 16, 'OUT OF RANGE', '#ff6b85', 11);
      return;
    }
    t.aimPoint = { x, y };
    this.aiming = null;
    this.combat.ring(x, y, 24, t.color, 400);
    Sfx.click();
  }

  private beginPlacing(id: string): void {
    if (this.state === 'over') return;
    const def = TOWER_DEFS[id];
    if (this.gold < Math.round(def.cost * 0.5)) {
      Sfx.denied();
      this.notice(`${findElementDef(id)?.name ?? id} costs ${def.cost} gold.`, C.blood);
      return;
    }
    this.select(null);
    this.aiming = null;
    this.placing = id;
    this.ghostImg?.destroy();
    const tex = `elem-${id}`;
    this.ghostImg = this.textures.exists(tex) ? this.add.image(0, 0, tex).setScale(0.82).setAlpha(0.65).setDepth(9) : null;
    Sfx.play('ui-drag');
    for (const c of this.trayCards) c.paint(this.gold);
  }

  private cancelPlacing(): void {
    if (!this.placing) return;
    this.placing = null;
    this.ghostImg?.destroy();
    this.ghostImg = null;
    this.ghostG.clear();
    this.ghostText.setText('');
    for (const c of this.trayCards) c.paint(this.gold);
  }

  /** Why a tower can't stand here, or null when it can. */
  private placementProblem(def: TowerDef, x: number, y: number): string | null {
    if (!inField(x, y)) return 'OUT OF BOUNDS';
    if (distToPath(x, y) < TOWER_PATH_CLEARANCE) return 'TOO CLOSE TO THE ROAD';
    const k = keepPoint();
    if (Math.hypot(x - k.x - 10, y - k.y) < 70) return 'TOO CLOSE TO THE KEEP';
    for (const t of this.towers) if (Math.hypot(t.padX - x, t.padY - y) < TOWER_SPACING) return 'TOO CLOSE TO A TOWER';
    if (isHazard(x, y)) return 'LAVA';
    const wet = isWater(x, y, 4);
    const kind = def.body.kind;
    if (kind === 'water' && !wet) return 'NAVAL — BUILD IN WATER';
    if (kind !== 'water' && kind !== 'amphibious' && isWater(x, y, -6)) return 'NOT IN WATER';
    return null;
  }

  private tryPlace(id: string, x: number, y: number): void {
    const def = TOWER_DEFS[id];
    const why = this.placementProblem(def, x, y);
    if (why) { Sfx.denied(); this.floatText(x, y - 20, why, '#ff6b85', 11); return; }
    const cost = this.placeCost(id, x, y);
    if (this.gold < cost) { Sfx.denied(); this.floatText(x, y - 20, `NEED ${cost} 🪙`, '#ff6b85', 11); return; }
    this.gold -= cost;
    const tower = new Tower(this, id, def, x, y, cost);
    this.towers.push(tower);
    this.combat.ring(x, y, 36, tower.color, 420);
    this.floatText(x, y - 40, `${tower.name.toUpperCase()}${cost < def.cost ? `  ·  -${def.cost - cost} 🪙` : ''}`, hex(mix(tower.color, 0xffffff, 0.5)), 11);
    Sfx.playAt('stone-rise', x, { volume: 0.6 });
    if (this.gold < def.cost) this.cancelPlacing();
  }

  private select(t: Tower | null): void {
    if (this.selected === t) return;
    this.selected?.setSelected(false);
    this.selected = t;
    t?.setSelected(true);
    if (t) Sfx.click();
    this.renderPanel();
  }

  private cycleMode(t: Tower): void {
    const i = TARGET_MODES.indexOf(t.targetMode);
    t.targetMode = TARGET_MODES[(i + 1) % TARGET_MODES.length];
    Sfx.click();
    this.renderPanel();
  }

  private buyPath(path: number): void {
    const t = this.selected;
    if (!t) return;
    const why = t.pathBlocked(path);
    if (why) { Sfx.denied(); this.notice(why === 'MAXED' ? 'That path is complete.' : `${t.def.paths[path].name}: ${why.toLowerCase()}.`, C.blood); return; }
    const u = t.nextUpgrade(path);
    if (!u) return;
    const cost = t.upgradeCost(path);
    if (this.gold < cost) { Sfx.denied(); this.notice(`${u.name} costs ${cost} gold.`, C.blood); return; }
    this.gold -= cost;
    t.buyPath(path, cost);
    this.floatText(t.x, t.y - 56, `${u.name.toUpperCase()}`, hex(mix(PATH_TINT[path], 0xffffff, 0.4)), 13);
    if (u.active) this.floatText(t.x, t.y - 72, `NEW ABILITY  ·  ${u.active.name.toUpperCase()}`, '#7ad0ff', 11);
    this.combat.ring(t.x, t.y, 44, PATH_TINT[path], 500);
    Sfx.play('level-up');
    this.renderPanel();
  }

  private sellSelected(): void {
    const t = this.selected;
    if (!t) return;
    this.gold += t.sellValue;
    this.floatText(t.x, t.y - 30, `SOLD  +${t.sellValue} 🪙`, '#ffd700', 12);
    this.towers = this.towers.filter((x) => x !== t);
    this.combat.dropTower(t);
    if (this.aiming === t) this.aiming = null;
    t.destroy();
    this.select(null);
    Sfx.play('shard-gain');
  }

  // ── Tower panel ───────────────────────────────────────────────────

  private panelRect = { x: 0, y: 0, w: 0, h: 0 };

  private pointInPanel(x: number, y: number): boolean {
    const r = this.panelRect;
    return this.panelTower !== null && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  }

  /** The part of the field the panel leaves free; notices centre on it. */
  private freeRect(): { x: number; w: number; cx: number } {
    const { width } = this.scale;
    const r = this.panelRect;
    if (!this.panelTower || r.w === 0) return { x: 0, w: width, cx: width / 2 };
    if (r.x < width / 2) { const x = r.x + r.w; return { x, w: width - x, cx: x + (width - x) / 2 }; }
    return { x: 0, w: r.x, cx: r.x / 2 };
  }

  /** Everything that changes what the panel draws (gold only through what is affordable). */
  private panelKeyFor(t: Tower): string {
    const afford = [0, 1, 2].map((p) => (this.gold >= t.upgradeCost(p) ? 1 : 0)).join('');
    return `${t.id}|${t.tierCode}|${t.targetMode}|${afford}|${this.aiming === t}|${t.aimPoint ? 1 : 0}`;
  }

  /** Numbers that tick while the panel is open, without rebuilding it. */
  private refreshPanelLive(t: Tower): void {
    this.panelStats?.setText(this.statLine(t));
    const pa = this.panelActive;
    if (pa && pa.tower === t && t.active) {
      const left = Math.max(0, t.activeReadyAt - this.time.now);
      pa.btn.setTrailing(left > 0 ? `${Math.ceil(left / 1000)}s` : 'READY', left > 0 ? T.dim : T.good);
    }
  }

  private statLine(t: Tower): string {
    const reach = t.baseRange > 900 ? 'map' : `${Math.round(t.baseRange)}`;
    return `range ${reach}  ·  kills ${t.kills}  ·  dealt ${Math.round(t.damageDealt)}${t.detect ? '  ·  DETECTS' : ''}`;
  }

  private renderPanel(): void {
    for (const o of this.panelObjects) o.destroy();
    this.panelObjects = [];
    this.panelStats = null;
    this.panelActive = null;
    const t = this.selected;
    this.panelTower = t;
    if (!t) { this.panelRect = { x: 0, y: 0, w: 0, h: 0 }; this.panelKey = ''; return; }
    this.panelKey = this.panelKeyFor(t);
    this.hideTip();

    const w = PANEL_W, h = PANEL_H;
    const x = t.padX > this.scale.width / 2 ? 8 : this.scale.width - w - 8;
    const y = HUD_H + 4;
    this.panelRect = { x, y, w, h };
    const depth = 40;
    const add = <O extends Phaser.GameObjects.GameObject>(o: O): O => { this.panelObjects.push(o); return o; };
    const g = add(this.add.graphics().setDepth(depth));
    fillNotched(g, x, y, w, h, mix(C.plate, t.color, 0.1), 0.97, 10, ALL_CORNERS);
    strokeNotched(g, x, y, w, h, t.color, 0.8, 1.5, 10, ALL_CORNERS);
    // A blocker so clicks on the panel never fall through to the field.
    add(this.add.zone(x + w / 2, y + h / 2, w, h).setInteractive().setDepth(depth));
    const tx = x + 12;
    const txt = (px: number, py: number, s: string, size: number, color: string, font = FONT_UI, ox = 0, oy = 0.5, wrap?: number): Phaser.GameObjects.Text =>
      add(this.add.text(px, py, s, {
        fontSize: `${size}px`, fontFamily: font, color, wordWrap: wrap ? { width: wrap } : undefined, lineSpacing: 1,
        letterSpacing: font === FONT_DISPLAY ? 1 : 0,
      }).setOrigin(ox, oy).setDepth(depth + 2));

    // Header: name, tier code, role.
    txt(tx, y + 16, t.name.toUpperCase(), 16, hex(mix(t.color, 0xffffff, 0.45)), FONT_DISPLAY);
    const codeG = add(this.add.graphics().setDepth(depth + 1));
    fillNotched(codeG, x + w - 74, y + 6, 62, 20, C.well, 1, 5, ALL_CORNERS);
    txt(x + w - 43, y + 16, t.tierCode, 12, T.gold, FONT_MONO, 0.5);
    txt(tx, y + 33, `${ROLE_LABEL[t.def.role]}  ·  ${BODY_LABEL[t.body.kind]}`, 8, T.faint, FONT_DISPLAY);
    this.panelStats = txt(tx, y + 46, this.statLine(t), 9, T.dim, FONT_MONO);

    // Targeting row.
    const by0 = y + 66;
    add(addButton(this, {
      x: tx + 62, y: by0, w: 124, h: 22,
      label: `TARGET  ${MODE_LABEL[t.targetMode]}`, accent: STRONGHOLD_ACCENT, variant: 'ghost', fontSize: 9, cut: 5, depth: depth + 2,
      onClick: () => this.cycleMode(t),
    }).container);
    if (t.def.role === 'artillery') {
      add(addButton(this, {
        x: tx + 196, y: by0, w: 88, h: 22,
        label: t.aimPoint ? 'RE-AIM' : 'SET AIM', accent: C.blood, variant: this.aiming === t ? 'solid' : 'ghost', fontSize: 9, cut: 5, depth: depth + 2,
        onClick: () => { this.aiming = t; this.renderPanel(); },
      }).container);
    }

    // What it does now: signature, then its attacks.
    const attackLines = t.attackIds.map((id) => {
      const a = t.attackDef(id)!;
      return `•  ${attackName(id, a)} — ${a.desc}`;
    });
    const shown = attackLines.slice(0, 4);
    if (attackLines.length > 4) shown.push(`•  +${attackLines.length - 4} more (see the journal)`);
    const sig = txt(tx, y + 84, `✦ ${t.def.signature.name}: ${t.def.signature.desc}`, 8, hex(mix(t.color, 0xffffff, 0.55)), FONT_UI, 0, 0, w - 24);
    const atk = txt(tx, sig.y + sig.height + 3, shown.join('\n'), 8, T.normal, FONT_UI, 0, 0, w - 24);
    let py = Math.min(y + 196, atk.y + atk.height + 8);
    if (atk.y + atk.height + 8 > y + 196) atk.setCrop(0, 0, w - 24, y + 192 - atk.y);

    // Three path cards.
    const cardH = 82;
    for (let p = 0; p < 3; p++) {
      this.paintPathCard(t, p, x + 8, py, w - 16, cardH, depth, add, txt);
      py += cardH + 4;
    }

    // Ability and sell.
    const by = y + h - 20;
    if (t.active) {
      const ready = t.activeReady(this.time.now);
      const btn = addButton(this, {
        x: x + 8 + 92, y: by, w: 184, h: 28,
        label: `F  ${t.active.name.toUpperCase()}`, trailing: ready ? 'READY' : '', trailingColor: T.good,
        accent: 0x7ad0ff, variant: ready ? 'solid' : 'ghost', fontSize: 9, cut: 6, depth: depth + 2,
        onClick: () => this.activate(t),
      });
      this.panelActive = { btn, tower: t };
      this.panelObjects.push(btn.container);
    }
    add(addButton(this, {
      x: x + w - 8 - 50, y: by, w: 100, h: 28,
      label: `SELL  ${t.sellValue}`, accent: C.blood, variant: 'quiet', fontSize: 9, cut: 6, depth: depth + 2,
      onClick: () => this.sellSelected(),
    }).container);
    this.refreshPanelLive(t);
  }

  private paintPathCard(
    t: Tower, p: number, x: number, y: number, w: number, h: number, depth: number,
    add: <O extends Phaser.GameObjects.GameObject>(o: O) => O,
    txt: (px: number, py: number, s: string, size: number, color: string, font?: string, ox?: number, oy?: number, wrap?: number) => Phaser.GameObjects.Text,
  ): void {
    const path = t.def.paths[p];
    const tier = t.tiers[p];
    const tint = PATH_TINT[p];
    const block = t.pathBlocked(p);
    const next = t.nextUpgrade(p);
    const cost = t.upgradeCost(p);
    const can = !block && !!next && this.gold >= cost;
    const g = add(this.add.graphics().setDepth(depth + 1));
    fillNotched(g, x, y, w, h, mix(C.well, tint, block && block !== 'MAXED' ? 0.02 : 0.08), block && block !== 'MAXED' ? 0.6 : 0.95, 6, ALL_CORNERS);
    strokeNotched(g, x, y, w, h, tint, can ? 0.9 : 0.35, can ? 1.5 : 1, 6, ALL_CORNERS);
    // Key chip, path name and five pips.
    fillNotched(g, x + 6, y + 5, 16, 14, tint, 0.9, 3, ALL_CORNERS);
    txt(x + 14, y + 12, PATH_KEYS[p], 9, '#0a0a14', FONT_DISPLAY, 0.5);
    txt(x + 28, y + 12, path.name.toUpperCase(), 10, hex(mix(tint, 0xffffff, 0.45)), FONT_DISPLAY);
    for (let i = 0; i < PATH_MAX_TIER; i++) {
      const px = x + w - 12 - (PATH_MAX_TIER - 1 - i) * 13;
      g.fillStyle(i < tier ? tint : 0x0a0a14, 1); g.fillCircle(px, y + 12, 4.5);
      g.lineStyle(1, tint, 0.6); g.strokeCircle(px, y + 12, 4.5);
    }
    const owned = tier > 0 ? path.upgrades[tier - 1].name : null;
    if (!next) {
      txt(x + 10, y + 32, 'PATH COMPLETE', 10, T.gold, FONT_DISPLAY);
      txt(x + 10, y + 46, `Owns ${path.upgrades.map((u) => u.name).join(' · ')}`, 8, T.dim, FONT_UI, 0, 0, w - 20);
      return;
    }
    txt(x + 10, y + 29, `${tier + 1}. ${next.name}`, 11, block ? T.faint : T.bright, FONT_DISPLAY);
    const d = txt(x + 10, y + 38, next.desc, 8, block ? T.ghost : T.normal, FONT_UI, 0, 0, w - 104);
    if (d.height > h - 42) d.setCrop(0, 0, w - 104, h - 42);
    if (owned) txt(x + 10, y + h - 7, `owned: ${owned}`, 7, T.faint, FONT_UI);
    if (block) {
      txt(x + w - 10, y + h / 2 + 6, block === 'TWO PATHS ALREADY CHOSEN' ? 'LOCKED\n2 paths chosen' : 'LOCKED\nmax tier 2', 8, T.bad, FONT_DISPLAY, 1, 0.5);
      return;
    }
    const btn = addButton(this, {
      x: x + w - 50, y: y + h / 2 + 8, w: 88, h: 34,
      label: `${cost}`, iconArt: 'coin', sublabel: cost < next.cost ? `was ${next.cost}` : undefined,
      accent: can ? C.verdant : C.steel, variant: can ? 'solid' : 'ghost', fontSize: 12, cut: 6, depth: depth + 2,
      onClick: () => this.buyPath(p),
    });
    add(btn.container);
  }

  // ── Waves ─────────────────────────────────────────────────────────

  private callWave(): void {
    if (this.state !== 'prep') return;
    const bonus = this.earlyBonus();
    if (bonus > 0) { this.gold += bonus; this.floatText(this.freeRect().cx, HUD_H + 30, `EARLY CALL  +${bonus} 🪙`, '#ffd700', 13); }
    this.startWave();
  }

  private startWave(): void {
    this.wave++;
    this.plan = planWave(this.wave, this.diff, this.map, this.rand);
    this.spawnIdx = 0;
    this.waveStartedAt = this.time.now;
    this.state = 'active';
    // Keep wards refill each wave; gold-on-hit caps reset.
    this.wardLeft = this.towers.reduce((s, t) => s + (t.traits.keepWard ?? 0), 0);
    for (const t of this.towers) { t.hitGoldThisWave = 0; t.hitGoldAccum = 0; }
    const th = this.plan.theme;
    if (this.plan.isBoss) this.showBanner(`WAVE ${this.wave}  —  A BOSS WALKS`, C.blood, 1800);
    else if (th) {
      this.showBanner(`WAVE ${this.wave}  —  ${th.title}`, C.gold, 2200);
      this.notice(th.hint, C.gold, 3600);
    } else this.showBanner(`WAVE ${this.wave}`, STRONGHOLD_ACCENT, 1500);
    Sfx.play(this.plan.isBoss ? 'boss-intro' : 'countdown-go');
    Music.play('invasion', { intensity: Math.min(1, 0.35 + this.wave * 0.03) });
  }

  private spawnDue(time: number): void {
    const plan = this.plan;
    if (!plan) return;
    while (this.spawnIdx < plan.spawns.length && plan.spawns[this.spawnIdx].at <= time - this.waveStartedAt) {
      const s = plan.spawns[this.spawnIdx++];
      const h = this.addHusk(new RoadHusk(this, s.variant, s.hp, s.speed, s.bounty, s.breach, s.track, 0));
      if (s.variant.isBoss) {
        this.floatText(h.x + 60, h.y - 40, `${s.variant.name.toUpperCase()}`, hex(mix(s.variant.color, 0xffffff, 0.4)), 14);
      }
    }
  }

  private addHusk(h: RoadHusk): RoadHusk {
    this.husks.push(h);
    this.huskGroup.add(h);
    h.on('damaged', (amt: number) => this.queueDamageNumber(h, amt));
    h.once('defeated', () => this.onHuskKilled(h));
    this.traits.onSpawn(h);
    this.introduce(h.variant, h);
    return h;
  }

  /** A child husk (splits, echoes, decoys, a boss's court). */
  private spawnChild(variant: HuskVariantDef, track: number, pathDist: number, opts: { hp: number; noReward?: boolean; alpha?: number }): RoadHusk | null {
    if (this.husks.length >= MAX_HUSKS) return null;
    const speed = Math.min(200, 84 * variant.speedMult * this.diff.speedMult * (1 + this.wave * 0.012));
    const bounty = opts.noReward ? 0 : 3;
    const h = new RoadHusk(this, variant, Math.max(1, Math.round(opts.hp)), speed, bounty, variant.tier === 3 ? 2 : 1, track, pathDist);
    if (opts.noReward) h.noRewardKill = true;
    if (opts.alpha !== undefined) h.setAlpha(opts.alpha);
    return this.addHusk(h);
  }

  /** The first time a branded family shows up this run, say what it does and how it walks. */
  private introduce(v: HuskVariantDef, h: RoadHusk): void {
    const tr = h.trait;
    if (!tr || tr.id === 'decoy' || this.seenFamilies.has(tr.id)) return;
    this.seenFamilies.add(tr.id);
    const who = v.isBoss ? v.name : v.name.replace(/ (II|III)$/, '');
    const b = buildFor(v);
    this.introQueue.push({ title: `${who.toUpperCase()}  ·  ${tr.name.toUpperCase()}`, body: tr.desc, build: v.isBoss ? 'BOSS' : b.label, color: v.color });
  }

  private tickIntro(time: number): void {
    if (time < this.introUntil) return;
    for (const o of this.introObjs) o.destroy();
    this.introObjs = [];
    const next = this.introQueue.shift();
    if (!next) return;
    this.introUntil = time + 4200 * this.speed;
    const free = this.freeRect();
    const w = Math.min(320, free.w - 16), h = 58, x = free.x + 8, y = HUD_H + 8;
    const g = this.add.graphics().setDepth(36);
    fillNotched(g, x, y, w, h, mix(C.plate, next.color, 0.15), 0.94, 8, ALL_CORNERS);
    strokeNotched(g, x, y, w, h, next.color, 0.85, 1.5, 8, ALL_CORNERS);
    const tag = this.add.text(x + 10, y + 12, 'NEW HUSK', { fontSize: '8px', fontFamily: FONT_DISPLAY, color: T.faint, letterSpacing: 2 }).setOrigin(0, 0.5).setDepth(37);
    const title = this.add.text(x + 70, y + 12, next.title, { fontSize: '10px', fontFamily: FONT_DISPLAY, color: hex(mix(next.color, 0xffffff, 0.5)), letterSpacing: 1 }).setOrigin(0, 0.5).setDepth(37);
    const build = this.add.text(x + w - 10, y + 12, next.build, { fontSize: '8px', fontFamily: FONT_DISPLAY, color: T.gold, letterSpacing: 1 }).setOrigin(1, 0.5).setDepth(37);
    const body = this.add.text(x + 10, y + 24, `${next.body}  (J: journal)`, { fontSize: '9px', fontFamily: FONT_UI, color: T.normal, wordWrap: { width: w - 20 } }).setOrigin(0, 0).setDepth(37);
    this.introObjs = [g, tag, title, build, body];
    for (const o of this.introObjs) (o as unknown as Phaser.GameObjects.Components.Alpha).setAlpha?.(0);
    this.tweens.add({ targets: this.introObjs, alpha: 1, duration: 220 });
    this.tweens.add({ targets: this.introObjs, alpha: 0, delay: 3800, duration: 350 });
  }

  private onHuskKilled(h: RoadHusk, claimed = false): void {
    if (!this.husks.includes(h)) return;
    const time = this.time.now;
    this.kills++;
    let bounty = h.bounty;
    if (h.goldMarkUntil > time) bounty = Math.round(bounty * h.goldMarkMult);
    // Plunder: the greediest nearby plunderer takes its cut.
    let plunder = 0;
    for (const t of this.towers) {
      const p = t.traits.plunder;
      if (p && Math.hypot(t.x - h.x, t.y - h.y) <= t.range + 30) plunder = Math.max(plunder, p);
    }
    bounty = Math.round(bounty * (1 + plunder));
    this.gold += bounty;
    if (bounty > 0) this.floatText(h.x, h.y - 48, `+${bounty} 🪙`, h.goldMarkUntil > time ? '#ffee66' : '#ffd700', 12);
    if (!claimed) {
      this.combat.onHuskDeath(h);
      this.traits.onDeath(h);
    }
    this.removeHusk(h, true);
  }

  private removeHusk(h: RoadHusk, died: boolean): void {
    this.husks = this.husks.filter((x) => x !== h);
    this.huskGroup.remove(h, false, false);
    this.pendingDmg.delete(h);
    h.setHealthBarVisible(false);
    (h.body as Phaser.Physics.Arcade.Body | null)?.stop();
    h.setActive(false);
    if (died) {
      this.tweens.add({ targets: h, alpha: 0, scaleX: h.scaleX * 1.4, scaleY: h.scaleY * 0.2, duration: 260, onComplete: () => h.destroy() });
    } else {
      this.tweens.add({ targets: h, alpha: 0, duration: 160, onComplete: () => h.destroy() });
    }
  }

  private onBreach(h: RoadHusk): void {
    let loss = this.traits.breachFor(h);
    if (loss > 0 && this.wardLeft > 0) {
      // Keep wards soak breaches first.
      const soak = Math.min(this.wardLeft, loss);
      this.wardLeft -= soak;
      loss -= soak;
      const k = keepPoint();
      this.floatText(k.x + 10, k.y - 96, `WARDED  ·  ${soak}`, '#9fd8ff', 13);
      this.combat.ring(k.x + 10, k.y - 20, 60, 0x9fd8ff, 500);
    }
    if (loss > 0) {
      this.lives = Math.max(0, this.lives - loss);
      this.keepFlashUntil = this.time.now + 500;
      this.cameras.main.shake(180, 0.004);
      const k = keepPoint();
      this.floatText(k.x + 10, k.y - 80, `-${loss} ❤`, '#ff6b85', 16);
      Sfx.play('low-health', { volume: 0.7 });
    }
    this.removeHusk(h, false);
    if (this.lives <= 0) this.endRun();
  }

  /** Lives back to the keep, never above where the run started. */
  private mendKeep(amount: number): number {
    const got = Math.max(0, Math.min(amount, this.diff.lives - this.lives));
    this.lives += got;
    return got;
  }

  private waveCleared(): void {
    const plan = this.plan!;
    this.wavesCleared = this.wave;
    let pay = plan.clearBonus;
    // Gardens and banks pay out; veterans grow.
    let income = 0;
    let interestRate = 0;
    for (const t of this.towers) {
      t.wavesSurvived++;
      const inc = t.traits.income;
      if (inc) {
        income += inc;
        this.floatText(t.x, t.y - 46, `+${inc} 🪙`, '#ffd700', 12);
      }
      if (t.traits.interest) interestRate = Math.max(interestRate, t.traits.interest);
    }
    const interest = Math.min(50 + this.wave * 2, Math.round(this.gold * interestRate));
    pay += income + interest;
    this.gold += pay;
    this.state = 'prep';
    this.nextWaveAt = this.time.now + PREP_MS;
    const extra = income + interest > 0 ? `  (+${income + interest} INCOME)` : '';
    this.showBanner(`WAVE ${this.wave} CLEARED   +${pay} 🪙${extra}`, C.verdant, 2000);
    Sfx.play('victory', { volume: 0.5 });
    if (this.wave % 10 === 0) {
      const shards = shardsForRun(this.wavesCleared, this.diff, this.map);
      this.floatText(this.freeRect().cx, HUD_H + 60, `${shards} 💎 BANKED SO FAR`, '#ffc44d', 13);
    }
  }

  // ── Run end ───────────────────────────────────────────────────────

  private endRun(): void {
    if (this.state === 'over') return;
    this.state = 'over';
    this.cancelPlacing();
    this.select(null);
    const shards = shardsForRun(this.wavesCleared, this.diff, this.map);
    if (shards > 0) PlayerData.addShards(shards);
    const record = PlayerData.recordStrongholdBest(recordKey(this.map.id, this.diff.id), this.wavesCleared);
    Sfx.play('defeat');
    this.cameras.main.flash(400, 120, 0, 20);

    const { width, height } = this.scale;
    addModal(this, { w: 520, h: 330, accent: C.blood, title: 'THE STRONGHOLD HAS FALLEN', glow: 0.5, scrimAlpha: 0.7 });
    const cx = width / 2, cy = height / 2;
    const line = (dy: number, text: string, color: string, size = 14, font = FONT_UI): Phaser.GameObjects.Text => this.add.text(cx, cy + dy, text, {
      fontSize: `${size}px`, fontFamily: font, color, align: 'center',
    }).setOrigin(0.5).setDepth(DEPTH.modalContent);
    line(-82, `${this.map.name}  ·  ${this.diff.label}`, T.dim, 11, FONT_DISPLAY);
    line(-64, this.loadout.map((id) => findElementDef(id)?.name ?? id).join(' / '), T.faint, 10, FONT_DISPLAY);
    line(-36, `WAVES CLEARED   ${this.wavesCleared}`, T.bright, 22, FONT_DISPLAY);
    line(-4, `${this.kills} husks put down  ·  ${this.towers.length} towers standing`, T.normal, 12);
    line(28, shards > 0 ? `+${shards} 💎 SHARDS BANKED` : 'No shards — clear a wave to earn some.', shards > 0 ? T.gold : T.faint, 15, FONT_DISPLAY);
    if (record) line(54, '★  NEW RECORD FOR THIS MAP AND DIFFICULTY', T.good, 11, FONT_DISPLAY);

    const data: StrongholdSceneData = { elements: this.loadout, difficulty: this.diff.id, map: this.map.id };
    addButton(this, {
      x: cx - 150, y: cy + 110, w: 150, h: 40, label: 'RETRY', iconArt: 'refresh', accent: C.verdant, variant: 'solid', fontSize: 13, cut: 8, depth: DEPTH.modalContent,
      onClick: () => this.scene.restart(data),
    });
    addButton(this, {
      x: cx, y: cy + 110, w: 150, h: 40, label: 'LOADOUT', iconArt: 'castle', accent: STRONGHOLD_ACCENT, variant: 'ghost', fontSize: 13, cut: 8, depth: DEPTH.modalContent,
      onClick: () => this.scene.start('StrongholdSetupScene', { picks: this.loadout, difficulty: this.diff.id, map: this.map.id }),
    });
    addButton(this, {
      x: cx + 150, y: cy + 110, w: 150, h: 40, label: 'TITLE', accent: C.steel, variant: 'quiet', fontSize: 13, cut: 8, depth: DEPTH.modalContent,
      onClick: () => this.scene.start('TitleScene'),
    });
  }

  private confirmLeave(): void {
    if (this.state === 'over') return;
    const { width, height } = this.scale;
    const cx = width / 2, cy = height / 2;
    const objs: Phaser.GameObjects.GameObject[] = [];
    const modal = addModal(this, { w: 420, h: 190, accent: C.blood, title: 'ABANDON THE ROAD?', glow: 0.4, scrimAlpha: 0.6, onScrimClick: () => close() });
    objs.push(modal.scrim, ...modal.objects);
    const shards = shardsForRun(this.wavesCleared, this.diff, this.map);
    objs.push(this.add.text(cx, cy - 10, `You keep what ${this.wavesCleared} cleared wave${this.wavesCleared === 1 ? '' : 's'} earned: ${shards} 💎`, {
      fontSize: '12px', fontFamily: FONT_UI, color: T.normal, align: 'center',
    }).setOrigin(0.5).setDepth(DEPTH.modalContent));
    const close = (): void => { for (const o of objs) o.destroy(); };
    objs.push(addButton(this, {
      x: cx - 90, y: cy + 50, w: 150, h: 36, label: 'LEAVE', accent: C.blood, variant: 'solid', fontSize: 12, cut: 8, depth: DEPTH.modalContent,
      onClick: () => { close(); this.endRun(); },
    }).container);
    objs.push(addButton(this, {
      x: cx + 90, y: cy + 50, w: 150, h: 36, label: 'KEEP FIGHTING', accent: C.verdant, variant: 'ghost', fontSize: 12, cut: 8, depth: DEPTH.modalContent,
      onClick: () => close(),
    }).container);
  }

  // ── Frame ─────────────────────────────────────────────────────────

  update(_time: number, delta: number): void {
    const time = this.time.now;
    this.animateMap?.(time);
    if (this.state === 'over' || this.paused) {
      for (const t of this.towers) t.update(time, 0);
      this.combat.draw(time);
      this.drawGhost();
      if (this.state !== 'over') this.refreshHud();
      return;
    }
    const dt = Math.min(delta * this.speed, 50 * this.speed);

    if (this.state === 'prep' && time >= this.nextWaveAt) this.startWave();
    if (this.state === 'active') {
      this.spawnDue(time);
      // Trickle: gold every second the wave is on.
      const trickle = this.towers.reduce((s, t) => s + (t.traits.trickle ?? 0), 0);
      if (trickle > 0) {
        this.trickleAccum += trickle * dt / 1000;
        if (this.trickleAccum >= 1) { const n = Math.floor(this.trickleAccum); this.trickleAccum -= n; this.gold += n; }
      }
    }

    // Husk traits act before they walk (sprints, blinks, dives).
    this.traits.update(time, dt);

    // Husks walk.
    for (const h of this.husks.slice()) {
      if (!h.active || h.hp <= 0) continue;
      const statusMult = h.tickStatus(time, dt);
      if (!h.active || h.hp <= 0) continue;
      let mult = statusMult * h.modeSpeedMult(time);
      const confused = h.confusedUntil > time;
      const barrier = confused ? null : this.combat.barrierAhead(h);
      h.blocked = !!barrier;
      if (barrier) { mult = 0; this.combat.chew(h, barrier, dt); }
      if (mult > 0) {
        const step = h.roadSpeed * mult * (dt / 1000);
        h.pathDist = confused ? Math.max(0, h.pathDist - step * 0.6) : h.pathDist + step;
        h.place();
      } else {
        (h.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      }
      if (h.reachedKeep) this.onBreach(h);
    }
    if ((this.state as RunState) === 'over') return;

    this.applyAuras();

    // Towers act.
    for (const t of this.towers) {
      this.steer(t, time);
      t.update(time, dt);
      if (t.stunned) continue;
      const target = this.pickTarget(t, time);
      const aim = t.def.role === 'artillery' && t.aimPoint ? t.aimPoint : undefined;
      const ids = t.firingIds();
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        if (time < (t.readyAt.get(id) ?? 0)) continue;
        let a = t.resolve(id, time);
        if (!a) continue;
        // Economy and support casts run on their timer whether or not a husk is near.
        const selfish = a.fx.kind === 'gold' || a.fx.kind === 'mend' || a.fx.kind === 'rally' || a.fx.kind === 'overclock' || a.fx.kind === 'aura';
        if (!target && !selfish && !aim) continue;
        if (!target && !selfish && aim && this.husks.length === 0) continue;
        if (i === 0 && t.traits.mimic) a = this.mimicFor(t, time) ?? a;
        this.combat.cast(t, a, target, time, aim);
        t.readyAt.set(id, time + a.cooldown);
        t.lastCastAt.set(id, time);
        if (target) this.echo(t, a, target, aim);
      }
    }

    this.combat.update(time, dt);
    this.combat.draw(time);
    this.flushDamageNumbers(time);
    this.drawGhost();
    this.drawKeep(time);
    this.tickIntro(time);

    if (this.state === 'active' && this.plan && this.spawnIdx >= this.plan.spawns.length && this.husks.length === 0) this.waveCleared();
    this.refreshHud();
  }

  /** Support auras and discounts: rebuilt each frame from every tower that has one. */
  private applyAuras(): void {
    for (const t of this.towers) { t.auraFireRate = 1; t.auraDamage = 1; t.auraRange = 1; t.auraDetect = false; t.auraPierce = 0; }
    for (const src of this.towers) {
      const a = src.traits.aura;
      if (!a) continue;
      for (const t of this.towers) {
        if (Math.hypot(t.padX - src.padX, t.padY - src.padY) > a.radius) continue;
        if (a.fireRate) t.auraFireRate = Math.max(t.auraFireRate, a.fireRate);
        if (a.damage) t.auraDamage = Math.max(t.auraDamage, a.damage);
        if (a.range) t.auraRange = Math.max(t.auraRange, a.range);
        if (a.detect) t.auraDetect = true;
        if (a.pierce) t.auraPierce = Math.max(t.auraPierce, a.pierce);
      }
    }
    for (const t of this.towers) t.discountMult = this.discountAt(t.padX, t.padY);
  }

  /** Where hover, drift and roam towers head this frame. */
  private steer(t: Tower, time: number): void {
    const k = t.body.kind;
    if (k !== 'heli' && k !== 'drift' && k !== 'roam') return;
    const leash = (t.body.leash ?? 150) + t.baseRange;
    let goal: { x: number; y: number } | null = null;
    if (k === 'drift') {
      // The thickest knot of husks within reach of the pad.
      let best = 0;
      for (const h of this.husks) {
        if (!h.targetable(time, true) || Math.hypot(h.x - t.padX, h.y - t.padY) > leash) continue;
        let n = 0;
        for (const o of this.husks) if (Math.hypot(o.x - h.x, o.y - h.y) < 80) n++;
        if (n > best) { best = n; goal = { x: h.x, y: h.y }; }
      }
    } else {
      let lead: RoadHusk | null = null;
      for (const h of this.husks) {
        if (!h.targetable(time, t.detect) || Math.hypot(h.x - t.padX, h.y - t.padY) > leash) continue;
        if (!lead || h.pathDist > lead.pathDist) lead = h;
      }
      if (lead) goal = { x: lead.x, y: lead.y };
    }
    t.setGoal(goal);
  }

  /** Pick a target by the tower's mode, among husks it can see and reach. */
  private pickTarget(t: Tower, time: number): RoadHusk | null {
    const r = t.range;
    const detect = t.detect;
    const mode = t.effectiveMode;
    let best: RoadHusk | null = null;
    let bestScore = -Infinity;
    for (const h of this.husks) {
      if (!h.targetable(time, detect)) continue;
      const d = Math.hypot(h.x - t.x, h.y - t.y);
      if (d > r + 20 * h.sizeMult) continue;
      const progress = h.pathDist / Math.max(1, h.track.length);
      const score = mode === 'first' ? progress
        : mode === 'last' ? -progress
          : mode === 'strong' ? h.hp + h.shieldHp + (h.variant.isBoss ? 1e6 : 0)
            : -d;
      if (score > bestScore) { bestScore = score; best = h; }
    }
    return best;
  }

  /** Illusion's mimic: the nearest other tower's first attack, cast as its own. */
  private mimicFor(t: Tower, time: number): TowerAbilityDef | null {
    let near: Tower | null = null, bd = Infinity;
    for (const o of this.towers) {
      if (o === t || o.traits.mimic) continue;
      const d = Math.hypot(o.padX - t.padX, o.padY - t.padY);
      if (d < bd) { bd = d; near = o; }
    }
    if (!near || bd > 260) return null;
    const src = near.attackDef(near.attackIds[0]);
    if (!src) return null;
    return t.resolveForeign({ ...src, cooldown: Math.max(400, src.cooldown) }, time);
  }

  /** Echo: repeat an instant cast a beat later at reduced strength. */
  private echo(t: Tower, a: TowerAbilityDef, target: RoadHusk, aim?: { x: number; y: number }): void {
    const e = t.traits.echo;
    if (!e || !ECHOABLE.has(a.fx.kind)) return;
    this.time.delayedCall(e.delayMs, () => {
      if (this.state === 'over' || !this.towers.includes(t)) return;
      const tgt = target.active && target.hp > 0 ? target : this.pickTarget(t, this.time.now);
      if (!tgt) return;
      this.combat.cast(t, { ...a, damage: a.damage * e.mult }, tgt, this.time.now, aim);
    });
  }

  private drawGhost(): void {
    const g = this.ghostG;
    g.clear();
    const p = this.input.activePointer;
    p.updateWorldPoint(this.cameras.main);
    const x = p.worldX, y = p.worldY;
    // Mortar reticles.
    for (const t of this.towers) {
      if (!t.aimPoint) continue;
      const sel = t === this.selected;
      g.lineStyle(sel ? 2 : 1, t.color, sel ? 0.9 : 0.4);
      g.strokeCircle(t.aimPoint.x, t.aimPoint.y, 14);
      g.lineBetween(t.aimPoint.x - 20, t.aimPoint.y, t.aimPoint.x - 8, t.aimPoint.y);
      g.lineBetween(t.aimPoint.x + 8, t.aimPoint.y, t.aimPoint.x + 20, t.aimPoint.y);
      g.lineBetween(t.aimPoint.x, t.aimPoint.y - 20, t.aimPoint.x, t.aimPoint.y - 8);
      g.lineBetween(t.aimPoint.x, t.aimPoint.y + 8, t.aimPoint.x, t.aimPoint.y + 20);
    }
    // Temple discounts show while placing, so you know where building is cheap.
    if (this.placing) {
      for (const t of this.towers) {
        const d = t.traits.discount;
        if (!d) continue;
        g.lineStyle(1, 0xffd700, 0.35); g.strokeCircle(t.padX, t.padY, d.radius);
      }
    }
    if (this.aiming) {
      const t = this.aiming;
      const ok = Math.hypot(x - t.padX, y - t.padY) <= t.range;
      g.lineStyle(1.5, ok ? t.color : 0xff4455, 0.6); g.strokeCircle(t.padX, t.padY, Math.min(t.range, 1400));
      g.lineStyle(2, ok ? 0xffffff : 0xff4455, 0.9); g.strokeCircle(x, y, 16);
      g.lineBetween(x - 22, y, x + 22, y); g.lineBetween(x, y - 22, x, y + 22);
      this.ghostText.setPosition(x, y - 30).setText(ok ? 'SET TARGET' : 'OUT OF RANGE').setColor(ok ? '#ffffff' : '#ff6b85');
      return;
    }
    if (this.placing) {
      const def = TOWER_DEFS[this.placing];
      const inBand = y > HUD_H && y < FIELD_BOTTOM && !this.pointInPanel(x, y);
      const why = inBand ? this.placementProblem(def, x, y) : 'OUT OF BOUNDS';
      const cost = this.placeCost(this.placing, x, y);
      const broke = this.gold < cost;
      const ok = !why && !broke;
      const color = ok ? (findElementDef(this.placing)?.color ?? 0xffffff) : 0xff4455;
      this.ghostImg?.setPosition(x, y).setVisible(inBand).setTint(ok ? 0xffffff : 0xff6677);
      const reach = def.range > 900 ? 60 : def.range;
      g.fillStyle(color, 0.08); g.fillCircle(x, y, reach);
      g.lineStyle(1.5, color, 0.6); g.strokeCircle(x, y, reach);
      const k = def.body.kind;
      if (k === 'ace') { g.lineStyle(1, color, 0.35); g.strokeEllipse(x, y, (def.body.leash ?? 120) * 2, (def.body.leash ?? 120) * 0.9); }
      if (k === 'heli' || k === 'drift' || k === 'roam') { g.lineStyle(1, color, 0.3); g.strokeCircle(x, y, def.body.leash ?? 150); }
      g.lineStyle(2, color, 0.9); g.strokeCircle(x, y, 26);
      if (!ok && inBand) { g.lineStyle(3, 0xff4455, 0.9); g.lineBetween(x - 12, y - 12, x + 12, y + 12); g.lineBetween(x + 12, y - 12, x - 12, y + 12); }
      const label = !inBand ? '' : why ? why : broke ? `NEED ${cost} 🪙` : cost < def.cost ? `${cost} 🪙  (TEMPLE DISCOUNT)` : `${cost} 🪙`;
      this.ghostText.setPosition(x, y + 36).setText(label).setColor(ok ? '#ffd700' : '#ff6b85');
      return;
    }
    this.ghostText.setText('');
    const hov = this.towers.find((t) => t.contains(x, y)) ?? null;
    if (hov !== this.hoverTower) {
      if (this.hoverTower && this.hoverTower !== this.selected) this.hoverTower.setSelected(false);
      this.hoverTower = hov;
      if (hov) hov.setSelected(true);
    }
  }

  private drawKeep(time: number): void {
    const g = this.keepG;
    g.clear();
    const k = keepPoint();
    const ratio = this.lives / this.diff.lives;
    drawMeter(g, k.x - 30, k.y - 132, 80, 7, ratio, ratio > 0.5 ? C.verdant : ratio > 0.25 ? C.gold : C.blood);
    if (this.keepFlashUntil > time) {
      g.fillStyle(0xff2244, 0.35 * ((this.keepFlashUntil - time) / 500));
      g.fillRect(k.x - 26, k.y - 70, 72, 110);
    }
  }

  // ── Text ──────────────────────────────────────────────────────────

  private queueDamageNumber(h: RoadHusk, amount: number): void {
    if (amount <= 0) return;
    const cur = this.pendingDmg.get(h);
    if (cur) cur.amount += amount;
    else this.pendingDmg.set(h, { amount, at: this.time.now });
  }

  /** Merge each husk's hits over ~140ms into one number so DOTs and auras do not wallpaper the road. */
  private flushDamageNumbers(time: number): void {
    for (const [h, p] of this.pendingDmg) {
      if (time - p.at < 140 && h.active) continue;
      this.pendingDmg.delete(h);
      if (!h.active && h.hp > 0) continue;
      const n = Math.round(p.amount);
      if (n <= 0) continue;
      const big = n >= 40;
      this.floatText(h.x + (Math.random() - 0.5) * 16, h.y - 30, `${n}`, big ? '#ffee66' : '#ffffff', big ? 16 : 12);
    }
  }

  floatText(x: number, y: number, text: string, color: string, size = 13): void {
    const t = this.add.text(x, y, text, {
      fontSize: `${size}px`, fontFamily: FONT_DISPLAY, color, stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(30);
    this.tweens.add({ targets: t, y: y - 26, alpha: { from: 1, to: 0 }, duration: 900, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
  }

  /** A big line across the free part of the field. */
  private showBanner(text: string, color: number, ms: number): void {
    this.bannerText?.destroy();
    const free = this.freeRect();
    const t = this.add.text(free.cx, HUD_H + 96, text, {
      fontSize: free.w < 700 ? '18px' : '22px', fontFamily: FONT_DISPLAY, color: hex(mix(color, 0xffffff, 0.5)), letterSpacing: 3,
      stroke: hex(mix(color, 0x000000, 0.75)), strokeThickness: 6, align: 'center', wordWrap: { width: free.w - 30 },
    }).setOrigin(0.5).setDepth(35).setAlpha(0);
    this.bannerText = t;
    this.tweens.add({ targets: t, alpha: 1, scale: { from: 0.85, to: 1 }, duration: 220, ease: 'Back.easeOut' });
    this.tweens.add({ targets: t, alpha: 0, delay: ms, duration: 400, onComplete: () => { if (this.bannerText === t) this.bannerText = null; t.destroy(); } });
  }

  /** A short message in a pill just above the bottom band, in the free part of the field. */
  private notice(text: string, color: number, ms = 2400): void {
    this.noticeText?.destroy();
    const free = this.freeRect();
    const t = this.add.text(free.cx, FIELD_BOTTOM - 22, text, {
      fontSize: '11px', fontFamily: FONT_UI, color: hex(mix(color, 0xffffff, 0.55)),
      backgroundColor: '#0c0c18', padding: { x: 10, y: 5 }, align: 'center', wordWrap: { width: free.w - 40 },
    }).setOrigin(0.5).setDepth(38).setAlpha(0);
    this.noticeText = t;
    this.tweens.add({ targets: t, alpha: 1, duration: 160 });
    this.tweens.add({ targets: t, alpha: 0, delay: ms, duration: 300, onComplete: () => { if (this.noticeText === t) this.noticeText = null; t.destroy(); } });
  }
}
