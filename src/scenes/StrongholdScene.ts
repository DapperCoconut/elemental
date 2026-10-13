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
import { TowerSlot } from '../stronghold/StrongholdTypes';
import { Tower } from '../stronghold/Tower';
import { RoadHusk } from '../stronghold/RoadHusk';
import { TowerCombat, TowerShot } from '../stronghold/TowerCombat';
import {
  drawMap, distToPath, inField, KEEP, TOWER_PATH_CLEARANCE, TOWER_SPACING, FIELD_BOTTOM,
} from '../stronghold/StrongholdMap';
import {
  getStrongholdDifficulty, planWave, shardsForRun, StrongholdDifficultyDef, StrongholdDifficultyId, WavePlan,
} from '../stronghold/StrongholdWaves';
import { STRONGHOLD_ACCENT } from './StrongholdSetupScene';

export interface StrongholdSceneData {
  elements: string[];
  difficulty: StrongholdDifficultyId;
}

type RunState = 'prep' | 'active' | 'over';

const FIRST_PREP_MS = 25000;
const PREP_MS = 12000;
const TRAY_Y = 606;
const HUD_H = 56;

/**
 * Stronghold — the tower-defense mode.
 *
 * A single scene owns the run: the road, the husks walking it, the towers beside it, the gold
 * and the lives. Husks are the invasion's `Husk` bodies driven along the road here rather than
 * by their own AI; towers cast through `TowerCombat`. Nothing in here touches ArenaScene.
 *
 * The sim is deliberately kept to plain data (lists of towers, husks, a wave plan with a
 * seeded RNG) so a host-authoritative multiplayer layer can sit on top of it later.
 */
export class StrongholdScene extends Phaser.Scene {
  private loadout: string[] = [];
  private diff: StrongholdDifficultyDef = getStrongholdDifficulty('normal');

  private towers: Tower[] = [];
  private husks: RoadHusk[] = [];
  private huskGroup!: Phaser.Physics.Arcade.Group;
  private projectiles!: Phaser.Physics.Arcade.Group;
  private combat!: TowerCombat;

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

  // Interaction
  private selected: Tower | null = null;
  private placing: string | null = null;
  private ghostImg: Phaser.GameObjects.Image | null = null;
  private ghostG!: Phaser.GameObjects.Graphics;
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
  private keepG!: Phaser.GameObjects.Graphics;
  private keepFlashUntil = 0;
  private bannerText: Phaser.GameObjects.Text | null = null;
  private pendingDmg = new Map<RoadHusk, { amount: number; at: number }>();
  private readonly wasdKeys: Phaser.Input.Keyboard.Key[] = [];

  constructor() {
    super({ key: 'StrongholdScene' });
  }

  init(data: StrongholdSceneData): void {
    this.loadout = (data?.elements ?? ['fire']).filter((id) => !!TOWER_DEFS[id]).slice(0, 6);
    if (this.loadout.length === 0) this.loadout = ['fire'];
    this.diff = getStrongholdDifficulty(data?.difficulty);
  }

  create(): void {
    Music.play('invasion', { intensity: 0.35 });
    this.towers = [];
    this.husks = [];
    this.selected = null;
    this.placing = null;
    this.hoverTower = null;
    this.panelTower = null;
    this.panelTier = -1;
    this.panelGold = -1;
    this.pendingDmg.clear();
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
    if (!this.textures.exists('sh-orb')) {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(0xffffff, 1); g.fillCircle(7, 7, 6);
      g.fillStyle(0xffffff, 0.5); g.fillCircle(7, 7, 7);
      g.generateTexture('sh-orb', 14, 14);
      g.destroy();
    }

    drawMap(this);
    this.keepG = this.add.graphics().setDepth(1.6);

    this.huskGroup = this.physics.add.group();
    this.projectiles = this.physics.add.group();
    const scene = this;
    this.combat = new TowerCombat({
      scene,
      husks: () => scene.husks,
      towers: () => scene.towers,
      projectiles: this.projectiles,
      floatText: (x, y, text, color, size) => scene.floatText(x, y, text, color, size),
      addGold: (amount, x, y) => { scene.gold += amount; scene.floatText(x, y, `+${amount} 🪙`, '#ffd700', 13); },
    });
    this.physics.add.overlap(this.projectiles, this.huskGroup, (a, b) => {
      const shot = a as TowerShot;
      const husk = b as RoadHusk;
      if (shot instanceof TowerShot && husk instanceof RoadHusk) this.combat.onShotHit(shot, husk);
    });

    this.ghostG = this.add.graphics().setDepth(9);
    this.buildHud();
    this.buildTray();
    this.wireInput();

    this.showBanner(`THE ROAD IS QUIET  —  BUILD`, STRONGHOLD_ACCENT, 2600);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());
  }

  private teardown(): void {
    this.combat?.destroy();
    for (const t of this.towers) t.destroy();
    this.towers = [];
    for (const h of this.husks) h.destroy();
    this.husks = [];
  }

  // ── HUD ───────────────────────────────────────────────────────────

  private buildHud(): void {
    const { width, height } = this.scale;
    this.hudG = this.add.graphics().setDepth(DEPTH.content);
    // Top band and tray band.
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
    this.add.text(width - 16, FIELD_BOTTOM + 16, `${this.diff.label}  ·  ${this.loadout.length} TOWER TYPES`, {
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
      this.waveText.setText(`WAVE ${this.wave}${this.plan?.isBoss ? '  ·  BOSS' : ''}`);
      this.remainText.setText(`🧟 ${left} remaining`);
      this.nextWaveBtn.setLabel('IN PROGRESS');
      this.nextWaveBtn.setDisabled(true);
    }
    for (const c of this.trayCards) c.paint(this.gold);
    if (this.panelTower && (this.panelTower.tier !== this.panelTier || this.gold !== this.panelGold)) this.renderPanel();
  }

  private earlyBonus(): number {
    return Math.max(0, Math.floor((this.nextWaveAt - this.time.now) / 1000)) * 2;
  }

  // ── Build tray ────────────────────────────────────────────────────

  private buildTray(): void {
    const { width } = this.scale;
    const n = this.loadout.length;
    const slotW = 130, gap = 10;
    const x0 = width / 2 - ((slotW + gap) * n - gap) / 2 + slotW / 2;
    this.loadout.forEach((id, i) => {
      const def = TOWER_DEFS[id];
      const el = findElementDef(id);
      const color = el?.color ?? 0xffffff;
      const x = x0 + i * (slotW + gap);
      const y = TRAY_Y;
      const g = this.add.graphics().setDepth(DEPTH.content);
      const tex = `elem-${id}`;
      const img = this.textures.exists(tex) ? this.add.image(x - 42, y, tex).setScale(0.68).setDepth(DEPTH.content + 1) : null;
      const name = this.add.text(x - 20, y - 12, (el?.name ?? id).toUpperCase(), {
        fontSize: '11px', fontFamily: FONT_DISPLAY, color: hex(mix(color, 0xffffff, 0.45)), letterSpacing: 1,
      }).setOrigin(0, 0.5).setDepth(DEPTH.content + 1);
      const cost = this.add.text(x - 20, y + 8, `🪙 ${def.cost}`, {
        fontSize: '11px', fontFamily: FONT_MONO, color: T.gold,
      }).setOrigin(0, 0.5).setDepth(DEPTH.content + 1);
      const key = this.add.text(x + slotW / 2 - 10, y - slotW / 8 - 6, `${i + 1}`, {
        fontSize: '10px', fontFamily: FONT_DISPLAY, color: T.faint,
      }).setOrigin(1, 0.5).setDepth(DEPTH.content + 1);
      void key;
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
    this.add.text(16, FIELD_BOTTOM + 16, 'CLICK A TOWER OR PRESS 1–6, THEN CLICK THE FIELD  ·  RIGHT-CLICK CANCELS  ·  CLICK A PLACED TOWER TO UPGRADE', {
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
      if (this.placing) { this.cancelPlacing(); return; }
      if (this.selected) { this.select(null); return; }
      this.confirmLeave();
    });
    kb.on('keydown-SPACE', () => { if (this.state === 'prep') this.callWave(); });
    kb.on('keydown-U', () => { if (this.selected) this.upgradeSelected(); });
    kb.on('keydown-X', () => { if (this.selected) this.sellSelected(); });
  }

  private onPointerDown(p: Phaser.Input.Pointer): void {
    if (this.state === 'over') return;
    p.updateWorldPoint(this.cameras.main);
    const x = p.worldX, y = p.worldY;
    if (p.rightButtonDown()) { this.cancelPlacing(); this.select(null); return; }
    if (y < HUD_H || y > FIELD_BOTTOM + 6) return; // HUD and tray handle their own clicks
    if (this.placing) { this.tryPlace(this.placing, x, y); return; }
    // Clicking the open panel must not fall through to the field.
    if (this.panelTower && this.pointInPanel(x, y)) return;
    const hit = this.towers.find((t) => t.contains(x, y)) ?? null;
    this.select(hit);
  }

  private beginPlacing(id: string): void {
    if (this.state === 'over') return;
    const def = TOWER_DEFS[id];
    if (this.gold < def.cost) { Sfx.denied(); showToast(this, `${findElementDef(id)?.name ?? id} costs ${def.cost} gold.`, { accent: C.blood, y: 520 }); return; }
    this.select(null);
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
    for (const c of this.trayCards) c.paint(this.gold);
  }

  private placementValid(x: number, y: number): boolean {
    if (!inField(x, y)) return false;
    if (distToPath(x, y) < TOWER_PATH_CLEARANCE) return false;
    if (Math.hypot(x - KEEP.x - 10, y - KEEP.y) < 70) return false;
    for (const t of this.towers) if (Math.hypot(t.x - x, t.y - y) < TOWER_SPACING) return false;
    return true;
  }

  private tryPlace(id: string, x: number, y: number): void {
    const def = TOWER_DEFS[id];
    if (!this.placementValid(x, y)) { Sfx.denied(); this.floatText(x, y - 20, 'CAN\'T BUILD HERE', '#ff6b85', 11); return; }
    if (this.gold < def.cost) { Sfx.denied(); this.cancelPlacing(); return; }
    this.gold -= def.cost;
    const tower = new Tower(this, id, def, x, y);
    this.towers.push(tower);
    this.combat.ring(x, y, 36, tower.color, 420);
    this.floatText(x, y - 40, `${tower.name.toUpperCase()}  ·  ${tower.tierName}`, hex(mix(tower.color, 0xffffff, 0.5)), 11);
    Sfx.playAt('stone-rise', x, { volume: 0.6 });
    // Keep placing if the same tower is still affordable — classic TD flow.
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

    const w = 262, h = 400;
    const x = t.x > this.scale.width / 2 ? 14 : this.scale.width - w - 14;
    const y = HUD_H + 8;
    this.panelRect = { x, y, w, h };
    const depth = 40;
    const g = this.add.graphics().setDepth(depth);
    fillNotched(g, x, y, w, h, mix(C.plate, t.color, 0.12), 0.96, 10, ALL_CORNERS);
    strokeNotched(g, x, y, w, h, t.color, 0.8, 1.5, 10, ALL_CORNERS);
    this.panelObjects.push(g);

    const add = (o: Phaser.GameObjects.GameObject): void => { this.panelObjects.push(o); };
    const tx = x + 14;
    add(this.add.text(tx, y + 16, t.name.toUpperCase(), {
      fontSize: '16px', fontFamily: FONT_DISPLAY, color: hex(mix(t.color, 0xffffff, 0.45)), letterSpacing: 2,
    }).setOrigin(0, 0.5).setDepth(depth + 1));
    add(this.add.text(x + w - 14, y + 16, `TIER ${t.tier + 1}`, {
      fontSize: '10px', fontFamily: FONT_DISPLAY, color: T.faint, letterSpacing: 2,
    }).setOrigin(1, 0.5).setDepth(depth + 1));
    add(this.add.text(tx, y + 34, t.tierName.toUpperCase(), {
      fontSize: '10px', fontFamily: FONT_DISPLAY, color: T.gold, letterSpacing: 2,
    }).setOrigin(0, 0.5).setDepth(depth + 1));
    // Tier pips.
    const pg = this.add.graphics().setDepth(depth + 1);
    for (let i = 0; i < 5; i++) {
      pg.fillStyle(i <= t.tier ? t.color : C.line, 1);
      pg.fillCircle(x + w - 14 - (4 - i) * 12, y + 34, 4);
    }
    add(pg);
    add(this.add.text(tx, y + 50, `range ${Math.round(t.range)}  ·  kills ${t.kills}  ·  dealt ${Math.round(t.damageDealt)}`, {
      fontSize: '9px', fontFamily: FONT_MONO, color: T.dim,
    }).setOrigin(0, 0.5).setDepth(depth + 1));

    // Ability rows.
    let ry = y + 70;
    for (const s of t.slotInfo()) {
      const rowH = s.upgradeName ? 46 : 38;
      const rg = this.add.graphics().setDepth(depth + 1);
      fillNotched(rg, tx, ry, w - 28, rowH - 4, s.unlocked ? mix(C.well, t.color, 0.08) : C.well, s.unlocked ? 0.9 : 0.5, 6, ALL_CORNERS);
      // Key cap.
      fillNotched(rg, tx + 6, ry + 7, 34, 18, s.unlocked ? t.color : C.line, s.unlocked ? 0.9 : 0.6, 4, ALL_CORNERS);
      add(rg);
      add(this.add.text(tx + 23, ry + 16, s.key.toUpperCase(), {
        fontSize: '9px', fontFamily: FONT_DISPLAY, color: s.unlocked ? '#0a0a14' : T.faint,
      }).setOrigin(0.5).setDepth(depth + 2));
      add(this.add.text(tx + 48, ry + 10, s.name, {
        fontSize: '11px', fontFamily: FONT_DISPLAY, color: s.unlocked ? T.bright : T.faint,
      }).setOrigin(0, 0.5).setDepth(depth + 2));
      add(this.add.text(tx + 48, ry + 24, s.unlocked ? s.desc : `Unlocks at ${s.unlocksAt}`, {
        fontSize: '8px', fontFamily: FONT_UI, color: s.unlocked ? T.normal : T.ghost, wordWrap: { width: w - 90 },
      }).setOrigin(0, 0.5).setDepth(depth + 2));
      if (s.upgradeName) {
        add(this.add.text(tx + 48, ry + 36, `★ ${s.upgradeName} — ${s.upgradeNote}`, {
          fontSize: '8px', fontFamily: FONT_UI, color: T.gold, wordWrap: { width: w - 90 },
        }).setOrigin(0, 0.5).setDepth(depth + 2));
      }
      ry += rowH;
    }
    // Mastery and perk lines.
    const extras: string[] = [];
    if (t.masteryOn && t.def.mastery) extras.push(`M  ${t.def.mastery.name}: ${t.def.mastery.desc}`);
    if (t.perkName) extras.push(`✦  Perk ${t.perkName}: +10% damage, +6% range, faster casts`);
    if (extras.length) {
      add(this.add.text(tx, ry + 2, extras.join('\n'), {
        fontSize: '8px', fontFamily: FONT_UI, color: hex(mix(t.color, 0xffffff, 0.5)), wordWrap: { width: w - 28 }, lineSpacing: 2,
      }).setOrigin(0, 0).setDepth(depth + 2));
    }

    // Buttons.
    const by = y + h - 28;
    if (!t.isMaxed) {
      const can = this.gold >= t.nextTierCost;
      add(addButton(this, {
        x: x + 14 + 78, y: by, w: 156, h: 34,
        label: `UPGRADE  →  ${t.def.tiers[t.tier + 1].toUpperCase()}`, trailing: `${t.nextTierCost} 🪙`,
        trailingColor: can ? T.gold : T.bad,
        accent: can ? C.verdant : C.steel, variant: can ? 'solid' : 'ghost', fontSize: 10, cut: 8, depth: depth + 2,
        onClick: () => this.upgradeSelected(),
      }).container);
    } else {
      add(this.add.text(x + 14 + 78, by, 'FULLY BUILT', {
        fontSize: '11px', fontFamily: FONT_DISPLAY, color: T.gold, letterSpacing: 2,
      }).setOrigin(0.5).setDepth(depth + 2));
    }
    add(addButton(this, {
      x: x + w - 14 - 40, y: by, w: 80, h: 34,
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
    this.plan = planWave(this.wave, this.diff, this.rand);
    this.spawnIdx = 0;
    this.waveStartedAt = this.time.now;
    this.state = 'active';
    this.showBanner(this.plan.isBoss ? `WAVE ${this.wave}  —  A BOSS WALKS` : `WAVE ${this.wave}`, this.plan.isBoss ? C.blood : STRONGHOLD_ACCENT, 1800);
    Sfx.play(this.plan.isBoss ? 'boss-intro' : 'countdown-go');
    Music.play('invasion', { intensity: Math.min(1, 0.35 + this.wave * 0.03) });
  }

  private spawnDue(time: number): void {
    const plan = this.plan;
    if (!plan) return;
    while (this.spawnIdx < plan.spawns.length && plan.spawns[this.spawnIdx].at <= time - this.waveStartedAt) {
      const s = plan.spawns[this.spawnIdx++];
      const h = new RoadHusk(this, s.variant, s.hp, s.speed, s.bounty, s.breach);
      this.husks.push(h);
      this.huskGroup.add(h);
      h.on('damaged', (amt: number) => this.queueDamageNumber(h, amt));
      h.once('defeated', () => this.onHuskKilled(h));
      if (s.variant.isBoss) {
        this.floatText(h.x + 60, h.y - 40, `${s.variant.name.toUpperCase()}`, hex(mix(s.variant.color, 0xffffff, 0.4)), 14);
      } else if (s.variant.tier && s.variant.tier >= 2) {
        this.floatText(h.x + 50, h.y - 36, `${s.variant.emoji ?? ''} ${s.variant.name}`, hex(mix(s.variant.color, 0xffffff, 0.4)), 10);
      }
    }
  }

  private onHuskKilled(h: RoadHusk): void {
    if (!this.husks.includes(h)) return;
    this.kills++;
    this.gold += h.bounty;
    this.floatText(h.x, h.y - 48, `+${h.bounty} 🪙`, '#ffd700', 12);
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
    this.lives = Math.max(0, this.lives - h.breach);
    this.keepFlashUntil = this.time.now + 500;
    this.cameras.main.shake(180, 0.004);
    this.floatText(KEEP.x + 10, KEEP.y - 80, `-${h.breach} ❤`, '#ff6b85', 16);
    Sfx.play('low-health', { volume: 0.7 });
    this.removeHusk(h, false);
    if (this.lives <= 0) this.endRun();
  }

  private waveCleared(): void {
    const plan = this.plan!;
    this.wavesCleared = this.wave;
    this.gold += plan.clearBonus;
    this.state = 'prep';
    this.nextWaveAt = this.time.now + PREP_MS;
    this.showBanner(`WAVE ${this.wave} CLEARED   +${plan.clearBonus} 🪙`, C.verdant, 2000);
    Sfx.play('victory', { volume: 0.5 });
    if (this.wave % 10 === 0) {
      const shards = shardsForRun(this.wavesCleared, this.diff);
      this.floatText(this.scale.width / 2, HUD_H + 60, `${shards} 💎 BANKED SO FAR`, '#ffc44d', 13);
    }
  }

  // ── Run end ───────────────────────────────────────────────────────

  private endRun(): void {
    if (this.state === 'over') return;
    this.state = 'over';
    this.cancelPlacing();
    this.select(null);
    const shards = shardsForRun(this.wavesCleared, this.diff);
    if (shards > 0) PlayerData.addShards(shards);
    const record = PlayerData.recordStrongholdBest(this.diff.id, this.wavesCleared);
    Sfx.play('defeat');
    this.cameras.main.flash(400, 120, 0, 20);

    const { width, height } = this.scale;
    const modal = addModal(this, {
      w: 520, h: 330, accent: C.blood, title: 'THE STRONGHOLD HAS FALLEN', glow: 0.5, scrimAlpha: 0.7,
    });
    void modal;
    const cx = width / 2, cy = height / 2;
    const line = (dy: number, text: string, color: string, size = 14, font = FONT_UI): Phaser.GameObjects.Text => this.add.text(cx, cy + dy, text, {
      fontSize: `${size}px`, fontFamily: font, color, align: 'center',
    }).setOrigin(0.5).setDepth(DEPTH.modalContent);
    line(-70, `${this.diff.label}  ·  ${this.loadout.map((id) => findElementDef(id)?.name ?? id).join(' / ')}`, T.dim, 11, FONT_DISPLAY);
    line(-36, `WAVES CLEARED   ${this.wavesCleared}`, T.bright, 22, FONT_DISPLAY);
    line(-4, `${this.kills} husks put down  ·  ${this.towers.length} towers standing`, T.normal, 12);
    line(28, shards > 0 ? `+${shards} 💎 SHARDS BANKED` : 'No shards — clear a wave to earn some.', shards > 0 ? T.gold : T.faint, 15, FONT_DISPLAY);
    if (record) line(54, '★  NEW RECORD FOR THIS DIFFICULTY', T.good, 11, FONT_DISPLAY);

    addButton(this, {
      x: cx - 150, y: cy + 110, w: 150, h: 40, label: 'RETRY', iconArt: 'refresh', accent: C.verdant, variant: 'solid', fontSize: 13, cut: 8, depth: DEPTH.modalContent,
      onClick: () => this.scene.restart({ elements: this.loadout, difficulty: this.diff.id }),
    });
    addButton(this, {
      x: cx, y: cy + 110, w: 150, h: 40, label: 'LOADOUT', iconArt: 'castle', accent: STRONGHOLD_ACCENT, variant: 'ghost', fontSize: 13, cut: 8, depth: DEPTH.modalContent,
      onClick: () => this.scene.start('StrongholdSetupScene', { picks: this.loadout, difficulty: this.diff.id }),
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
    const shards = shardsForRun(this.wavesCleared, this.diff);
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
    if (this.state === 'over') {
      for (const t of this.towers) t.update(time, delta);
      this.combat.draw(time);
      return;
    }
    const dt = Math.min(delta, 50);

    if (this.state === 'prep' && time >= this.nextWaveAt) this.startWave();
    if (this.state === 'active') this.spawnDue(time);

    // Husks walk.
    for (const h of this.husks.slice()) {
      if (!h.active || h.hp <= 0) continue;
      const statusMult = h.tickStatus(time, dt);
      if (!h.active || h.hp <= 0) continue; // a DOT finished it
      let mult = statusMult * h.modeSpeedMult(time);
      const barrier = this.combat.barrierAhead(h);
      h.blocked = !!barrier;
      if (barrier) { mult = 0; this.combat.chew(h, barrier, time, dt); }
      if (mult > 0) {
        h.pathDist += h.roadSpeed * mult * (dt / 1000);
        h.place();
      } else {
        (h.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      }
      if (h.reachedKeep) this.onBreach(h);
    }
    if ((this.state as RunState) === 'over') return;

    // Towers act.
    for (const t of this.towers) {
      t.update(time, dt);
      const target = this.firstInRange(t);
      if (!target) continue;
      for (const slot of t.unlockedSlots()) {
        if (time < t.readyAt[slot]) continue;
        const a = t.resolve(slot, time);
        this.combat.cast(t, slot, a, target, time);
        t.readyAt[slot] = time + a.cooldown;
      }
      if (time >= t.masteryReadyAt) {
        const m = t.resolveMastery(time);
        if (m) { this.combat.cast(t, 'mastery', m, target, time); t.masteryReadyAt = time + m.cooldown; }
      }
    }

    this.combat.update(time, dt);
    this.combat.draw(time);
    this.flushDamageNumbers(time);
    this.drawGhost();
    this.drawKeep(time);

    if (this.state === 'active' && this.plan && this.spawnIdx >= this.plan.spawns.length && this.husks.length === 0) this.waveCleared();
    this.refreshHud();
  }

  /** The husk furthest down the road that this tower can reach. */
  private firstInRange(t: Tower): RoadHusk | null {
    let best: RoadHusk | null = null;
    const r = t.range;
    for (const h of this.husks) {
      if (!h.active || h.hp <= 0) continue;
      if (Math.hypot(h.x - t.x, h.y - t.y) > r + 20 * h.sizeMult) continue;
      if (!best || h.pathDist > best.pathDist) best = h;
    }
    return best;
  }

  private drawGhost(): void {
    const g = this.ghostG;
    g.clear();
    const p = this.input.activePointer;
    // Between events the pointer's cached world point is in backbuffer pixels (the
    // supersampled camera); ArenaScene refreshes it the same way every frame.
    p.updateWorldPoint(this.cameras.main);
    const x = p.worldX, y = p.worldY;
    if (this.placing) {
      const def = TOWER_DEFS[this.placing];
      const ok = this.placementValid(x, y) && y > HUD_H && y < FIELD_BOTTOM;
      const color = ok ? (findElementDef(this.placing)?.color ?? 0xffffff) : 0xff4455;
      this.ghostImg?.setPosition(x, y).setVisible(y > HUD_H && y < FIELD_BOTTOM + 6).setTint(ok ? 0xffffff : 0xff6677);
      g.fillStyle(color, 0.08); g.fillCircle(x, y, def.range);
      g.lineStyle(1.5, color, 0.6); g.strokeCircle(x, y, def.range);
      g.lineStyle(2, color, 0.9); g.strokeCircle(x, y, 26);
      if (!ok) { g.lineStyle(3, 0xff4455, 0.9); g.lineBetween(x - 12, y - 12, x + 12, y + 12); g.lineBetween(x + 12, y - 12, x - 12, y + 12); }
      return;
    }
    // Hover ring on towers.
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
    const ratio = this.lives / this.diff.lives;
    drawMeter(g, KEEP.x - 30, KEEP.y - 132, 80, 7, ratio, ratio > 0.5 ? C.verdant : ratio > 0.25 ? C.gold : C.blood);
    if (this.keepFlashUntil > time) {
      g.fillStyle(0xff2244, 0.35 * ((this.keepFlashUntil - time) / 500));
      g.fillRect(KEEP.x - 26, KEEP.y - 70, 72, 110);
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
