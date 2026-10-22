import Phaser from 'phaser';
import * as PlayerData from '../data/PlayerData';
import { findElementDef } from '../data/ElementRoster';
import {
  C, T, DEPTH, FONT_DISPLAY, FONT_MONO, FONT_UI, hex, mix,
  addButton, addModal, addIconButton, drawIcon, drawMeter, fillNotched, strokeNotched, ALL_CORNERS,
  showToast, UiButton,
} from '../ui';
import { Music, Sfx } from '../audio';
import { TOWER_DEFS } from '../stronghold/StrongholdTowers';
import {
  BODY_LABEL, ROLE_LABEL, TARGET_MODES, TowerAbilityDef, TowerDef, TowerSlot,
} from '../stronghold/StrongholdTypes';
import { Tower } from '../stronghold/Tower';
import { RoadHusk } from '../stronghold/RoadHusk';
import { TowerCombat, TowerShot } from '../stronghold/TowerCombat';
import { HuskRoadTraits } from '../stronghold/HuskRoadTraits';
import {
  drawMap, distToPath, inField, isHazard, isWater, keepPoint, setActiveMap, getStrongholdMap, StrongholdMapDef,
  TOWER_PATH_CLEARANCE, TOWER_SPACING, FIELD_BOTTOM,
} from '../stronghold/StrongholdMap';
import {
  getStrongholdDifficulty, planWave, recordKey, shardsForRun, StrongholdDifficultyDef, StrongholdDifficultyId, WavePlan,
} from '../stronghold/StrongholdWaves';
import { HuskVariantDef } from '../invasion/HuskVariants';
import { STRONGHOLD_ACCENT } from './StrongholdSetupScene';

export interface StrongholdSceneData {
  elements: string[];
  difficulty: StrongholdDifficultyId;
  map?: string;
}

type RunState = 'prep' | 'active' | 'over';

const FIRST_PREP_MS = 25000;
const PREP_MS = 12000;
const TRAY_Y = 606;
const HUD_H = 56;
const MAX_HUSKS = 150;
/** Ability kinds Echo repeats — the instant ones, not the things that stay on the field. */
const ECHOABLE = new Set(['bolt', 'splash', 'line', 'chain', 'nova', 'execute', 'beam']);

const MODE_LABEL: Record<string, string> = { first: 'FIRST', last: 'LAST', strong: 'STRONG', close: 'CLOSE' };

/**
 * Stronghold — the tower-defense mode.
 *
 * A single scene owns the run: the map's roads, the husks walking them, the towers beside them,
 * the gold and the lives. Husks are the invasion's `Husk` bodies (dressed as the dead element
 * players they are in Invasion) driven along the roads here rather than by their own AI; each
 * brand's road trait runs in `HuskRoadTraits`; towers cast through `TowerCombat`. Nothing in
 * here touches ArenaScene.
 *
 * The sim is kept to plain data (lists of towers, husks, a wave plan with an injectable RNG) so
 * a host-authoritative multiplayer layer can sit on top of it later.
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
  private readonly rand = (): number => Math.random();
  /** Husk families already introduced this run. */
  private seenFamilies = new Set<string>();
  private introQueue: Array<{ title: string; body: string; color: number }> = [];
  private introUntil = 0;
  private introObjs: Phaser.GameObjects.GameObject[] = [];

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
  private trayCards: Array<{ id: string; paint: (gold: number) => void; zone: Phaser.GameObjects.Zone }> = [];
  private panelObjects: Phaser.GameObjects.GameObject[] = [];
  private panelTower: Tower | null = null;
  private panelTier = -1;
  private panelGold = -1;
  private panelMode = '';
  private keepG!: Phaser.GameObjects.Graphics;
  private keepFlashUntil = 0;
  private bannerText: Phaser.GameObjects.Text | null = null;
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
    this.towers = [];
    this.husks = [];
    this.trayCards = [];
    this.selected = null;
    this.placing = null;
    this.aiming = null;
    this.hoverTower = null;
    this.panelTower = null;
    this.panelTier = -1;
    this.panelGold = -1;
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
    this.state = 'prep';
    this.plan = null;
    this.spawnIdx = 0;
    this.nextWaveAt = this.time.now + FIRST_PREP_MS;

    this.cameras.main.setBackgroundColor('#0a0a14');
    this.makeTextures();

    this.animateMap = drawMap(this).animate;
    this.keepG = this.add.graphics().setDepth(1.6);

    this.huskGroup = this.physics.add.group();
    this.projectiles = this.physics.add.group();
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
      addGold: (amount, x, y) => { scene.gold += amount; scene.floatText(x, y, `+${amount} 🪙`, '#ffd700', 13); },
      claimHusk: (h) => scene.onHuskKilled(h, true),
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
    this.wireInput();

    this.showBanner(`${this.map.name}  —  BUILD`, STRONGHOLD_ACCENT, 2600);
    if (this.map.tracks.length > 1) {
      this.time.delayedCall(2800, () => this.showBanner('TWO ROADS  —  HOLD BOTH', C.blood, 2200));
    }

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());
  }

  private teardown(): void {
    this.combat?.destroy();
    this.traits?.destroy();
    for (const t of this.towers) t.destroy();
    this.towers = [];
    for (const h of this.husks) h.destroy();
    this.husks = [];
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
    fillNotched(this.hudG, 0, FIELD_BOTTOM + 6, width, height - FIELD_BOTTOM - 6, mix(C.bg, STRONGHOLD_ACCENT, 0.06), 0.97, 0, ALL_CORNERS);
    this.hudG.lineBetween(0, FIELD_BOTTOM + 6, width, FIELD_BOTTOM + 6);

    const mk = (x: number, color: string, size = 17, originX = 0): Phaser.GameObjects.Text => this.add.text(x, HUD_H / 2 - 2, '', {
      fontSize: `${size}px`, fontFamily: FONT_MONO, color,
    }).setOrigin(originX, 0.5).setDepth(DEPTH.content + 1);

    drawIcon(this.hudG, 'heart', 30, HUD_H / 2 - 2, 11, C.blood);
    this.livesText = mk(46, T.bright);
    drawIcon(this.hudG, 'coin', 150, HUD_H / 2 - 2, 11, C.gold);
    this.goldText = mk(166, T.gold);
    this.waveText = this.add.text(this.scale.width / 2, HUD_H / 2 - 12, '', {
      fontSize: '15px', fontFamily: FONT_DISPLAY, color: T.bright, letterSpacing: 2,
    }).setOrigin(0.5).setDepth(DEPTH.content + 1);
    this.remainText = this.add.text(this.scale.width / 2, HUD_H / 2 + 9, '', {
      fontSize: '11px', fontFamily: FONT_UI, color: T.dim,
    }).setOrigin(0.5).setDepth(DEPTH.content + 1);

    this.nextWaveBtn = addButton(this, {
      x: width - 150, y: HUD_H / 2 - 2, w: 196, h: 36,
      label: 'NEXT WAVE', accent: C.verdant, variant: 'solid', fontSize: 13, cut: 8, iconArt: 'play',
      depth: DEPTH.content + 1,
      onClick: () => this.callWave(),
    });
    addIconButton(this, {
      x: width - 30, y: HUD_H / 2 - 2, r: 16, iconArt: 'cross', accent: C.steel, tooltip: 'Abandon the run',
      depth: DEPTH.content + 1,
      onClick: () => this.confirmLeave(),
    });
    this.add.text(width - 16, FIELD_BOTTOM + 16, `${this.map.name}  ·  ${this.diff.label}`, {
      fontSize: '8px', fontFamily: FONT_DISPLAY, color: T.faint, letterSpacing: 2,
    }).setOrigin(1, 0.5).setDepth(DEPTH.content + 1);
  }

  private refreshHud(): void {
    this.livesText.setText(`${this.lives}`);
    this.goldText.setText(`${this.gold}`);
    if (this.state === 'prep') {
      const left = Math.max(0, Math.ceil((this.nextWaveAt - this.time.now) / 1000));
      this.waveText.setText(this.wave === 0 ? 'PREPARE' : `WAVE ${this.wave} CLEARED`);
      this.remainText.setText(`wave ${this.wave + 1} in ${left}s`);
      this.nextWaveBtn.setLabel(`NEXT WAVE  ·  +${this.earlyBonus()} GOLD`);
      this.nextWaveBtn.setDisabled(false);
    } else if (this.state === 'active') {
      const total = this.plan?.spawns.length ?? 0;
      const left = total - this.spawnIdx + this.husks.length;
      const tag = this.plan?.isBoss ? '  ·  BOSS' : this.plan?.theme ? `  ·  ${this.plan.theme.title}` : '';
      this.waveText.setText(`WAVE ${this.wave}${tag}`);
      this.remainText.setText(`🧟 ${left} remaining`);
      this.nextWaveBtn.setLabel('IN PROGRESS');
      this.nextWaveBtn.setDisabled(true);
    }
    for (const c of this.trayCards) c.paint(this.gold);
    const t = this.panelTower;
    if (t && (t.tier !== this.panelTier || this.gold !== this.panelGold || t.targetMode !== this.panelMode)) this.renderPanel();
  }

  private earlyBonus(): number {
    return Math.max(0, Math.floor((this.nextWaveAt - this.time.now) / 1000)) * 2;
  }

  // ── Build tray ────────────────────────────────────────────────────

  private buildTray(): void {
    const { width } = this.scale;
    const n = this.loadout.length;
    const slotW = 136, gap = 8;
    const x0 = width / 2 - ((slotW + gap) * n - gap) / 2 + slotW / 2;
    this.loadout.forEach((id, i) => {
      const def = TOWER_DEFS[id];
      const el = findElementDef(id);
      const color = el?.color ?? 0xffffff;
      const x = x0 + i * (slotW + gap);
      const y = TRAY_Y;
      const g = this.add.graphics().setDepth(DEPTH.content);
      const tex = `elem-${id}`;
      const img = this.textures.exists(tex) ? this.add.image(x - 44, y, tex).setScale(0.66).setDepth(DEPTH.content + 1) : null;
      const name = this.add.text(x - 22, y - 15, (el?.name ?? id).toUpperCase(), {
        fontSize: '11px', fontFamily: FONT_DISPLAY, color: hex(mix(color, 0xffffff, 0.45)), letterSpacing: 1,
      }).setOrigin(0, 0.5).setDepth(DEPTH.content + 1);
      const role = this.add.text(x - 22, y, `${ROLE_LABEL[def.role]} · ${BODY_LABEL[def.body.kind]}`, {
        fontSize: '7px', fontFamily: FONT_DISPLAY, color: T.faint, letterSpacing: 1,
      }).setOrigin(0, 0.5).setDepth(DEPTH.content + 1);
      void role;
      const cost = this.add.text(x - 22, y + 14, `🪙 ${def.cost}`, {
        fontSize: '11px', fontFamily: FONT_MONO, color: T.gold,
      }).setOrigin(0, 0.5).setDepth(DEPTH.content + 1);
      this.add.text(x + slotW / 2 - 8, y - 20, `${i + 1}`, {
        fontSize: '10px', fontFamily: FONT_DISPLAY, color: T.faint,
      }).setOrigin(1, 0.5).setDepth(DEPTH.content + 1);
      let lastState = '';
      const paint = (gold: number): void => {
        const can = gold >= def.cost;
        const active = this.placing === id;
        const st = `${can}-${active}`;
        if (st === lastState) return;
        lastState = st;
        g.clear();
        fillNotched(g, x - slotW / 2, y - 30, slotW, 60, active ? mix(C.plate, color, 0.35) : can ? mix(C.plate, color, 0.14) : mix(C.plate, 0x000000, 0.4), 1, 8, ALL_CORNERS);
        strokeNotched(g, x - slotW / 2, y - 30, slotW, 60, active ? mix(color, 0xffffff, 0.3) : can ? color : C.line, active ? 1 : 0.7, active ? 2 : 1, 8, ALL_CORNERS);
        img?.setAlpha(can ? 1 : 0.35);
        name.setAlpha(can ? 1 : 0.45);
        cost.setColor(can ? T.gold : T.bad);
      };
      paint(this.gold);
      const zone = this.add.zone(x, y, slotW, 60).setInteractive({ useHandCursor: true }).setDepth(DEPTH.content + 2);
      zone.on('pointerdown', (p: Phaser.Input.Pointer) => { if (p.rightButtonDown()) return; this.beginPlacing(id); });
      this.trayCards.push({ id, paint, zone });
    });
    this.add.text(16, FIELD_BOTTOM + 16, 'PRESS 1–6 OR CLICK A TOWER, THEN THE FIELD  ·  NAVAL TOWERS BUILD IN WATER  ·  CLICK A TOWER TO UPGRADE', {
      fontSize: '8px', fontFamily: FONT_DISPLAY, color: T.ghost, letterSpacing: 1,
    }).setOrigin(0, 0.5).setDepth(DEPTH.content + 1);
  }

  // ── Input ─────────────────────────────────────────────────────────

  private wireInput(): void {
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onPointerDown(p));
    const kb = this.input.keyboard!;
    for (let i = 0; i < this.loadout.length; i++) {
      kb.on(`keydown-${['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX'][i]}`, () => this.beginPlacing(this.loadout[i]));
    }
    kb.on('keydown-ESC', () => {
      if (this.aiming) { this.aiming = null; return; }
      if (this.placing) { this.cancelPlacing(); return; }
      if (this.selected) { this.select(null); return; }
      this.confirmLeave();
    });
    kb.on('keydown-SPACE', () => { if (this.state === 'prep') this.callWave(); });
    kb.on('keydown-U', () => { if (this.selected) this.upgradeSelected(); });
    kb.on('keydown-X', () => { if (this.selected) this.sellSelected(); });
    kb.on('keydown-TAB', (e: KeyboardEvent) => { e.preventDefault?.(); if (this.selected) this.cycleMode(this.selected); });
  }

  private onPointerDown(p: Phaser.Input.Pointer): void {
    if (this.state === 'over') return;
    p.updateWorldPoint(this.cameras.main);
    const x = p.worldX, y = p.worldY;
    if (p.rightButtonDown()) { this.aiming = null; this.cancelPlacing(); this.select(null); return; }
    if (y < HUD_H || y > FIELD_BOTTOM + 6) return;
    if (this.aiming) { this.setAim(this.aiming, x, y); return; }
    if (this.placing) { this.tryPlace(this.placing, x, y); return; }
    if (this.panelTower && this.pointInPanel(x, y)) return;
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
    if (this.gold < def.cost) { Sfx.denied(); showToast(this, `${findElementDef(id)?.name ?? id} costs ${def.cost} gold.`, { accent: C.blood, y: 520 }); return; }
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
    if (this.gold < def.cost) { Sfx.denied(); this.cancelPlacing(); return; }
    this.gold -= def.cost;
    const tower = new Tower(this, id, def, x, y);
    this.towers.push(tower);
    this.combat.ring(x, y, 36, tower.color, 420);
    this.floatText(x, y - 40, `${tower.name.toUpperCase()}  ·  ${tower.tierName}`, hex(mix(tower.color, 0xffffff, 0.5)), 11);
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

  private upgradeSelected(): void {
    const t = this.selected;
    if (!t || t.isMaxed) return;
    const cost = t.nextTierCost;
    if (this.gold < cost) { Sfx.denied(); showToast(this, `${t.def.tiers[t.tier + 1]} costs ${cost} gold.`, { accent: C.blood, y: 520 }); return; }
    this.gold -= cost;
    t.upgrade();
    const slot = (['click', 'e', 'r', 'f', 'q'] as TowerSlot[])[t.tier];
    const info = t.slotInfo().find((s) => s.slot === slot)!;
    this.floatText(t.x, t.y - 46, `${t.tierName.toUpperCase()}  ·  ${info.key}: ${info.name}`, hex(mix(t.color, 0xffffff, 0.5)), 12);
    this.combat.ring(t.x, t.y, 44, t.color, 500);
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

  private renderPanel(): void {
    for (const o of this.panelObjects) o.destroy();
    this.panelObjects = [];
    const t = this.selected;
    this.panelTower = t;
    if (!t) { this.panelRect = { x: 0, y: 0, w: 0, h: 0 }; return; }
    this.panelTier = t.tier;
    this.panelGold = this.gold;
    this.panelMode = t.targetMode;

    const w = 270, h = 476;
    const x = t.padX > this.scale.width / 2 ? 12 : this.scale.width - w - 12;
    const y = HUD_H + 6;
    this.panelRect = { x, y, w, h };
    const depth = 40;
    const g = this.add.graphics().setDepth(depth);
    fillNotched(g, x, y, w, h, mix(C.plate, t.color, 0.12), 0.96, 10, ALL_CORNERS);
    strokeNotched(g, x, y, w, h, t.color, 0.8, 1.5, 10, ALL_CORNERS);
    this.panelObjects.push(g);

    const add = <O extends Phaser.GameObjects.GameObject>(o: O): O => { this.panelObjects.push(o); return o; };
    const tx = x + 14;
    add(this.add.text(tx, y + 16, t.name.toUpperCase(), {
      fontSize: '16px', fontFamily: FONT_DISPLAY, color: hex(mix(t.color, 0xffffff, 0.45)), letterSpacing: 2,
    }).setOrigin(0, 0.5).setDepth(depth + 1));
    add(this.add.text(x + w - 14, y + 16, `${ROLE_LABEL[t.def.role]} · ${BODY_LABEL[t.def.body.kind]}`, {
      fontSize: '8px', fontFamily: FONT_DISPLAY, color: T.faint, letterSpacing: 1,
    }).setOrigin(1, 0.5).setDepth(depth + 1));
    add(this.add.text(tx, y + 33, t.tierName.toUpperCase(), {
      fontSize: '10px', fontFamily: FONT_DISPLAY, color: T.gold, letterSpacing: 2,
    }).setOrigin(0, 0.5).setDepth(depth + 1));
    const pg = add(this.add.graphics().setDepth(depth + 1));
    for (let i = 0; i < 5; i++) {
      pg.fillStyle(i <= t.tier ? t.color : C.line, 1);
      pg.fillCircle(x + w - 14 - (4 - i) * 12, y + 33, 4);
    }
    add(this.add.text(tx, y + 48, `range ${Math.round(t.baseRange)}  ·  kills ${t.kills}  ·  dealt ${Math.round(t.damageDealt)}${t.detect ? '  ·  DETECTS' : ''}`, {
      fontSize: '9px', fontFamily: FONT_MONO, color: T.dim,
    }).setOrigin(0, 0.5).setDepth(depth + 1));
    // Signature.
    add(this.add.text(tx, y + 60, `✦ ${t.def.signature.name}: ${t.def.signature.desc}`, {
      fontSize: '8px', fontFamily: FONT_UI, color: hex(mix(t.color, 0xffffff, 0.55)), wordWrap: { width: w - 28 }, lineSpacing: 1,
    }).setOrigin(0, 0).setDepth(depth + 1));

    // Targeting and aiming.
    const by0 = y + 98;
    add(addButton(this, {
      x: tx + 60, y: by0, w: 120, h: 24,
      label: `TARGET  ${MODE_LABEL[t.targetMode]}`, accent: STRONGHOLD_ACCENT, variant: 'ghost', fontSize: 9, cut: 6, depth: depth + 2,
      onClick: () => this.cycleMode(t),
    }).container);
    if (t.def.role === 'artillery') {
      add(addButton(this, {
        x: tx + 186, y: by0, w: 100, h: 24,
        label: t.aimPoint ? 'MOVE TARGET' : 'SET TARGET', accent: C.blood, variant: this.aiming === t ? 'solid' : 'ghost', fontSize: 9, cut: 6, depth: depth + 2,
        onClick: () => { this.aiming = t; this.floatText(t.x, t.y - 50, 'CLICK THE FIELD', '#ffffff', 11); },
      }).container);
    }

    // Ability rows.
    let ry = y + 116;
    for (const s of t.slotInfo()) {
      const rowH = s.upgradeName ? 50 : 42;
      const rg = add(this.add.graphics().setDepth(depth + 1));
      fillNotched(rg, tx, ry, w - 28, rowH - 4, s.unlocked ? mix(C.well, t.color, 0.08) : C.well, s.unlocked ? 0.9 : 0.5, 6, ALL_CORNERS);
      fillNotched(rg, tx + 6, ry + 7, 34, 18, s.unlocked ? t.color : C.line, s.unlocked ? 0.9 : 0.6, 4, ALL_CORNERS);
      add(this.add.text(tx + 23, ry + 16, s.key.toUpperCase(), {
        fontSize: '9px', fontFamily: FONT_DISPLAY, color: s.unlocked ? '#0a0a14' : T.faint,
      }).setOrigin(0.5).setDepth(depth + 2));
      add(this.add.text(tx + 48, ry + 10, s.name, {
        fontSize: '11px', fontFamily: FONT_DISPLAY, color: s.unlocked ? T.bright : T.faint,
      }).setOrigin(0, 0.5).setDepth(depth + 2));
      add(this.add.text(tx + 48, ry + 19, s.unlocked ? s.desc : `Unlocks at ${s.unlocksAt}`, {
        fontSize: '8px', fontFamily: FONT_UI, color: s.unlocked ? T.normal : T.ghost, wordWrap: { width: w - 90 },
      }).setOrigin(0, 0).setDepth(depth + 2));
      if (s.upgradeName) {
        add(this.add.text(tx + 48, ry + rowH - 12, `★ ${s.upgradeName} — ${s.upgradeNote}`, {
          fontSize: '8px', fontFamily: FONT_UI, color: T.gold, wordWrap: { width: w - 90 },
        }).setOrigin(0, 0.5).setDepth(depth + 2));
      }
      ry += rowH;
    }
    const extras: string[] = [];
    if (t.masteryOn && t.def.mastery) extras.push(`M  ${t.def.mastery.name}: ${t.def.mastery.desc}`);
    if (t.perkName) extras.push(`✦  Perk ${t.perkName}: +10% damage, +6% range, faster casts`);
    if (extras.length) {
      add(this.add.text(tx, ry + 2, extras.join('\n'), {
        fontSize: '8px', fontFamily: FONT_UI, color: hex(mix(t.color, 0xffffff, 0.5)), wordWrap: { width: w - 28 }, lineSpacing: 2,
      }).setOrigin(0, 0).setDepth(depth + 2));
    }

    const by = y + h - 24;
    if (!t.isMaxed) {
      const can = this.gold >= t.nextTierCost;
      add(addButton(this, {
        x: x + 14 + 82, y: by, w: 164, h: 32,
        label: `UPGRADE  →  ${t.def.tiers[t.tier + 1].toUpperCase()}`, trailing: `${t.nextTierCost} 🪙`,
        trailingColor: can ? T.gold : T.bad,
        accent: can ? C.verdant : C.steel, variant: can ? 'solid' : 'ghost', fontSize: 10, cut: 8, depth: depth + 2,
        onClick: () => this.upgradeSelected(),
      }).container);
    } else {
      add(this.add.text(x + 14 + 82, by, 'FULLY BUILT', {
        fontSize: '11px', fontFamily: FONT_DISPLAY, color: T.gold, letterSpacing: 2,
      }).setOrigin(0.5).setDepth(depth + 2));
    }
    add(addButton(this, {
      x: x + w - 14 - 40, y: by, w: 80, h: 32,
      label: `SELL ${t.sellValue}`, accent: C.blood, variant: 'quiet', fontSize: 10, cut: 8, depth: depth + 2,
      onClick: () => this.sellSelected(),
    }).container);
  }

  // ── Waves ─────────────────────────────────────────────────────────

  private callWave(): void {
    if (this.state !== 'prep') return;
    const bonus = this.earlyBonus();
    if (bonus > 0) { this.gold += bonus; this.floatText(this.scale.width / 2, HUD_H + 30, `EARLY CALL  +${bonus} 🪙`, '#ffd700', 13); }
    this.startWave();
  }

  private startWave(): void {
    this.wave++;
    this.plan = planWave(this.wave, this.diff, this.map, this.rand);
    this.spawnIdx = 0;
    this.waveStartedAt = this.time.now;
    this.state = 'active';
    const th = this.plan.theme;
    if (this.plan.isBoss) this.showBanner(`WAVE ${this.wave}  —  A BOSS WALKS`, C.blood, 1800);
    else if (th) {
      this.showBanner(`WAVE ${this.wave}  —  ${th.title}`, C.gold, 2200);
      showToast(this, th.hint, { accent: C.gold, y: 500, holdMs: 3200 });
    } else this.showBanner(`WAVE ${this.wave}`, STRONGHOLD_ACCENT, 1800);
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

  /** The first time a branded family shows up this run, say what it does. */
  private introduce(v: HuskVariantDef, h: RoadHusk): void {
    const tr = h.trait;
    if (!tr || tr.id === 'decoy' || this.seenFamilies.has(tr.id)) return;
    this.seenFamilies.add(tr.id);
    const who = v.isBoss ? v.name : v.name.replace(/ (II|III)$/, '');
    this.introQueue.push({ title: `${who.toUpperCase()}  ·  ${tr.name.toUpperCase()}`, body: tr.desc, color: v.color });
  }

  private tickIntro(time: number): void {
    if (time < this.introUntil) return;
    for (const o of this.introObjs) o.destroy();
    this.introObjs = [];
    const next = this.introQueue.shift();
    if (!next) return;
    this.introUntil = time + 4200;
    const w = 300, h = 54, x = 14, y = FIELD_BOTTOM - h - 10;
    const g = this.add.graphics().setDepth(36);
    fillNotched(g, x, y, w, h, mix(C.plate, next.color, 0.15), 0.94, 8, ALL_CORNERS);
    strokeNotched(g, x, y, w, h, next.color, 0.85, 1.5, 8, ALL_CORNERS);
    const tag = this.add.text(x + 12, y + 12, 'NEW HUSK', { fontSize: '8px', fontFamily: FONT_DISPLAY, color: T.faint, letterSpacing: 2 }).setOrigin(0, 0.5).setDepth(37);
    const title = this.add.text(x + 74, y + 12, next.title, { fontSize: '10px', fontFamily: FONT_DISPLAY, color: hex(mix(next.color, 0xffffff, 0.5)), letterSpacing: 1 }).setOrigin(0, 0.5).setDepth(37);
    const body = this.add.text(x + 12, y + 24, next.body, { fontSize: '9px', fontFamily: FONT_UI, color: T.normal, wordWrap: { width: w - 24 } }).setOrigin(0, 0).setDepth(37);
    this.introObjs = [g, tag, title, body];
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
    // Harvest's plunder: the richest nearby plunderer takes its cut.
    let plunder = 0;
    for (const t of this.towers) {
      const p = t.def.traits.plunder;
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
    const loss = this.traits.breachFor(h);
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

  private waveCleared(): void {
    const plan = this.plan!;
    this.wavesCleared = this.wave;
    let pay = plan.clearBonus;
    // Gardens and banks pay out.
    let income = 0;
    let interestRate = 0;
    for (const t of this.towers) {
      const inc = t.def.traits.income;
      if (inc) {
        const amt = inc.perWave + inc.perTier * t.tier;
        income += amt;
        this.floatText(t.x, t.y - 46, `+${amt} 🪙`, '#ffd700', 12);
      }
      if (t.def.traits.interest) interestRate = Math.max(interestRate, t.def.traits.interest + t.tier * 0.01);
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
      this.floatText(this.scale.width / 2, HUD_H + 60, `${shards} 💎 BANKED SO FAR`, '#ffc44d', 13);
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

  update(time: number, delta: number): void {
    this.animateMap?.(time);
    if (this.state === 'over') {
      for (const t of this.towers) t.update(time, delta);
      this.combat.draw(time);
      return;
    }
    const dt = Math.min(delta, 50);

    if (this.state === 'prep' && time >= this.nextWaveAt) this.startWave();
    if (this.state === 'active') this.spawnDue(time);

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
      if (!target) continue;
      const aim = t.def.role === 'artillery' && t.aimPoint ? t.aimPoint : undefined;
      for (const slot of t.unlockedSlots()) {
        if (time < t.readyAt[slot]) continue;
        let a = t.resolve(slot, time);
        if (slot === 'click' && t.def.traits.mimic) a = this.mimicFor(t, time) ?? a;
        this.combat.cast(t, slot, a, target, time, aim);
        t.readyAt[slot] = time + a.cooldown;
        this.echo(t, slot, a, target, aim);
      }
      if (time >= t.masteryReadyAt) {
        const m = t.resolveMastery(time);
        if (m) { this.combat.cast(t, 'mastery', m, target, time, aim); t.masteryReadyAt = time + m.cooldown; }
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

  /** Support auras: every tower's buffs from the aura towers around it, rebuilt each frame. */
  private applyAuras(): void {
    for (const t of this.towers) { t.auraFireRate = 1; t.auraDamage = 1; t.auraRange = 1; t.auraDetect = false; t.auraPierce = 0; }
    for (const src of this.towers) {
      const a = src.def.traits.aura;
      if (!a) continue;
      const r = a.radius * (1 + src.tier * 0.08);
      for (const t of this.towers) {
        if (Math.hypot(t.padX - src.padX, t.padY - src.padY) > r) continue;
        if (a.fireRate) t.auraFireRate = Math.max(t.auraFireRate, a.fireRate + (t === src ? 0 : src.tier * 0.02));
        if (a.damage) t.auraDamage = Math.max(t.auraDamage, a.damage + src.tier * 0.02);
        if (a.range) t.auraRange = Math.max(t.auraRange, a.range);
        if (a.detect) t.auraDetect = true;
        if (a.pierce) t.auraPierce = Math.max(t.auraPierce, a.pierce);
      }
    }
  }

  /** Where hover, drift and roam towers head this frame. */
  private steer(t: Tower, time: number): void {
    const k = t.def.body.kind;
    if (k !== 'heli' && k !== 'drift' && k !== 'roam') return;
    const leash = (t.def.body.leash ?? 150) + t.baseRange;
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

  /** Illusion's Click: the nearest other tower's Click, cast as its own. */
  private mimicFor(t: Tower, time: number): TowerAbilityDef | null {
    let near: Tower | null = null, bd = Infinity;
    for (const o of this.towers) {
      if (o === t || o.def.traits.mimic) continue;
      const d = Math.hypot(o.padX - t.padX, o.padY - t.padY);
      if (d < bd) { bd = d; near = o; }
    }
    if (!near || bd > 260) return null;
    const src = near.def.abilities.click;
    return t.resolveForeign({ ...src, cooldown: Math.max(400, src.cooldown) }, time);
  }

  /** Echo's signature: repeat an instant cast a beat later at reduced strength. */
  private echo(t: Tower, slot: TowerSlot, a: TowerAbilityDef, target: RoadHusk, aim?: { x: number; y: number }): void {
    const e = t.def.traits.echo;
    if (!e || !ECHOABLE.has(a.fx.kind)) return;
    this.time.delayedCall(e.delayMs, () => {
      if (this.state === 'over' || !this.towers.includes(t)) return;
      const tgt = target.active && target.hp > 0 ? target : this.pickTarget(t, this.time.now);
      if (!tgt) return;
      this.combat.cast(t, slot, { ...a, damage: a.damage * e.mult }, tgt, this.time.now, aim);
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
    if (this.aiming) {
      const t = this.aiming;
      const ok = Math.hypot(x - t.padX, y - t.padY) <= t.range;
      g.lineStyle(1.5, ok ? t.color : 0xff4455, 0.6); g.strokeCircle(t.padX, t.padY, t.range);
      g.lineStyle(2, ok ? 0xffffff : 0xff4455, 0.9); g.strokeCircle(x, y, 16);
      g.lineBetween(x - 22, y, x + 22, y); g.lineBetween(x, y - 22, x, y + 22);
      this.ghostText.setPosition(x, y - 30).setText(ok ? 'SET TARGET' : 'OUT OF RANGE').setColor(ok ? '#ffffff' : '#ff6b85');
      return;
    }
    if (this.placing) {
      const def = TOWER_DEFS[this.placing];
      const inBand = y > HUD_H && y < FIELD_BOTTOM;
      const why = inBand ? this.placementProblem(def, x, y) : 'OUT OF BOUNDS';
      const ok = !why;
      const color = ok ? (findElementDef(this.placing)?.color ?? 0xffffff) : 0xff4455;
      this.ghostImg?.setPosition(x, y).setVisible(inBand).setTint(ok ? 0xffffff : 0xff6677);
      const reach = def.range > 900 ? 60 : def.range;
      g.fillStyle(color, 0.08); g.fillCircle(x, y, reach);
      g.lineStyle(1.5, color, 0.6); g.strokeCircle(x, y, reach);
      const k = def.body.kind;
      if (k === 'ace') { g.lineStyle(1, color, 0.35); g.strokeEllipse(x, y, (def.body.leash ?? 120) * 2, (def.body.leash ?? 120) * 0.9); }
      if (k === 'heli' || k === 'drift' || k === 'roam') { g.lineStyle(1, color, 0.3); g.strokeCircle(x, y, def.body.leash ?? 150); }
      g.lineStyle(2, color, 0.9); g.strokeCircle(x, y, 26);
      if (!ok) { g.lineStyle(3, 0xff4455, 0.9); g.lineBetween(x - 12, y - 12, x + 12, y + 12); g.lineBetween(x + 12, y - 12, x - 12, y + 12); }
      this.ghostText.setPosition(x, y + 36).setText(inBand && why ? why : '').setColor('#ff6b85');
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

  private showBanner(text: string, color: number, ms: number): void {
    this.bannerText?.destroy();
    const t = this.add.text(this.scale.width / 2, 110, text, {
      fontSize: '24px', fontFamily: FONT_DISPLAY, color: hex(mix(color, 0xffffff, 0.5)), letterSpacing: 4,
      stroke: hex(mix(color, 0x000000, 0.75)), strokeThickness: 6,
    }).setOrigin(0.5).setDepth(35).setAlpha(0);
    this.bannerText = t;
    this.tweens.add({ targets: t, alpha: 1, scale: { from: 0.85, to: 1 }, duration: 220, ease: 'Back.easeOut' });
    this.tweens.add({ targets: t, alpha: 0, delay: ms, duration: 400, onComplete: () => { if (this.bannerText === t) this.bannerText = null; t.destroy(); } });
  }
}
