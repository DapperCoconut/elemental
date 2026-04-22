import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import { Projectile } from '../../combat/Projectile';
import { adrenalineSkateAbilities } from '../adrenaline';

// ── Shared bar-entry type (mirrors ArenaScene's AbilityBarEntry) ──────────

export interface AdrenalineBarEntry {
  fill: Phaser.GameObjects.Rectangle;
  abilityId: string;
  maxWidth: number;
  lbl?: Phaser.GameObjects.Text;
  baseFillColor?: number;
}

// ── AdrenalineArenaApi ─────────────────────────────────────────────────────

export interface AdrenalineArenaApi {
  readonly player: Fighter;
  readonly npc: Fighter;
  readonly scene: Phaser.Scene;
  readonly projectiles: Phaser.Physics.Arcade.Group;
  readonly eKey: Phaser.Input.Keyboard.Key;
  readonly fKey: Phaser.Input.Keyboard.Key;
  readonly rKey: Phaser.Input.Keyboard.Key;
  readonly qKey: Phaser.Input.Keyboard.Key;
  readonly pointerWasDown: boolean;
  readonly isDodging: boolean;
  readonly gauntletSpeedMult: number;
  readonly width: number;
  readonly height: number;
  setIsDodging(v: boolean): void;
  setPlayerSpeedMult(v: number): void;
  applyPlayerSpeedMult(f: number): void;
  applyNpcSpeedMult(f: number): void;
  setAbilityBars(fills: AdrenalineBarEntry[]): void;
  hasUpgrade(slot: string): boolean;
  spawnHitFlash(x: number, y: number, color: number): void;
  spawnDamageNumber(x: number, y: number, amount: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  buildPlayerContext(x: number, y: number): CastContext;
  buildNpcContext(x: number, y: number): CastContext;
  getNearestEnemy(x: number, y: number): Fighter;
}

// ── Constants ─────────────────────────────────────────────────────────────

const RANK_LETTERS  = ['F', 'D', 'C', 'B', 'A', 'S', 'P'] as const;
const RANK_THRESH   = [8, 18, 30, 45, 65, Infinity, Infinity] as const;
const RANK_COLORS   = ['#888888', '#44dd44', '#44aaff', '#aa44ff', '#ff8800', '#ffee00', '#ff66ff'] as const;
const STYLE_DRAIN   = 3; // pts/sec constant drain
const ADREN_RANK_SPD = [1.0, 1.08, 1.16, 1.24, 1.32, 1.40, 1.50] as const; // speed mult per rank (P=1.50)
const P_ENTRY_MS    = 10000; // ms at S uninterrupted to enter P

const SKATE_FILL_COLORS: Record<string, number> = {
  'adrenaline-rush':          0xffee44,
  'adrenaline-ramp':          0xffdd66,
  'adrenaline-trick':         0xffaa22,
  'adrenaline-wall-teleport': 0xffbb44,
  'adrenaline-skate-toggle':  0xff8800,
};

// ── AdrenalineKit ─────────────────────────────────────────────────────────

export class AdrenalineKit {
  // ── Player style state ──────────────────────────────────────────────
  private adrenalineRank = 0;
  private adrenalineProgress = 0;
  private adrenalineLastStyleTime = 0;
  private adrenalineLastHitTime = 0;
  private adrenalineComboCount = 0;
  private adrenalineGoldPendingSet: Set<Phaser.Physics.Arcade.Sprite> = new Set();
  private adrenalineShotStreak = 0;
  private adrenalineHyperWindowExpiry = 0;
  private adrenalineHyperchargeReady = false;
  private adrenalineHyperchargeExpiry = 0;
  private adrenalineHyperchargeVisual: Phaser.GameObjects.Arc | null = null;

  // ── Player inject state ─────────────────────────────────────────────
  private adrenalineInjectPhase: 0 | 1 | 2 | 3 = 0;
  private adrenalineInjectPhaseEnd = 0;
  private adrenalineInjectDamageMult = 1;
  private adrenalineInjectAura: Phaser.GameObjects.Arc | null = null;
  private adrenalineCrashSlowUntil = 0;

  // ── Player styled-on state ──────────────────────────────────────────
  private adrenalineStyledOnChain = 0;
  private adrenalineStyledOnWindowEnd = 0;

  // ── Player skate state ──────────────────────────────────────────────
  private adrenalineSkateActive = false;
  private adrenalineSkateVelX = 0;
  private adrenalineSkateVelY = 0;
  private adrenalineSkateAirborneUntil = 0;
  private adrenalineRushUntil = 0;
  private adrenalineRampBoostUntil = 0;
  private adrenalineSkateHitAt: Map<Phaser.GameObjects.GameObject, number> = new Map();
  private adrenalineWallTpRemaining = 0;
  private adrenalineWallTpNextAt = 0;
  private adrenalineWallTpLocked = false;
  private adrenalineRamps: Array<{ id: number; x: number; y: number; expiresAt: number; scoreCdUntil: number; sprite: Phaser.GameObjects.Rectangle }> = [];

  // ── Dash rect state (E + Q) ─────────────────────────────────────────
  private adrenalineDashEndAt = 0;
  private adrenalineDashDirX = 0;
  private adrenalineDashDirY = 0;
  private adrenalineDashHit = false;
  private adrenalineDashRect: Phaser.GameObjects.Rectangle | null = null;
  private adrenalineStyledOnDashEndAt = 0;
  private adrenalineStyledOnDashDirX = 0;
  private adrenalineStyledOnDashDirY = 0;
  private adrenalineStyledOnDashHit = false;
  private adrenalineStyledOnDashRect: Phaser.GameObjects.Rectangle | null = null;

  // ── Skate accel meter visuals ───────────────────────────────────────
  private adrenalineAccelMeterBg: Phaser.GameObjects.Rectangle | null = null;
  private adrenalineAccelMeterFg: Phaser.GameObjects.Rectangle | null = null;

  // ── Reason text pool (style gain feedback below bar) ────────────────
  private adrenalineReasonTexts: Array<{ text: Phaser.GameObjects.Text; expireAt: number }> = [];

  // ── Click+ weapon cycle ─────────────────────────────────────────────
  private adrenalineWeapon: 0 | 1 | 2 = 0; // 0=pistol 1=shotgun 2=nailgun
  private adrenalineFreshUntil = 0;
  private adrenalineFreshLabel: Phaser.GameObjects.Text | null = null;

  // ── R+ skate mastery ────────────────────────────────────────────────
  private adrenalineRushAccelUntil = 0;
  private adrenalineSuperZoomUntil = 0;
  private adrenalineLastRampId = -1;
  private adrenalineLastRampRiddenAt = 0;

  // ── F+ compound inject ──────────────────────────────────────────────
  private adrenalineInjectExtendCount = 0;
  private adrenalineInjectPhase2DurMult = 1;

  // ── Q+ P tier ───────────────────────────────────────────────────────
  private adrenalineSSinceMs = 0; // timestamp when S was reached
  private adrenalineLastHitForP = 0;
  private adrenalinePAura: Phaser.GameObjects.Arc | null = null;
  private adrenalinePHitBar: Phaser.GameObjects.Graphics | null = null;

  // ── All-upgrades cosmetic (blue tint + 3 yellow diamonds) ───────────
  private adrenalineAllUpgradesActive = false;
  private adrenalineDiamonds: Phaser.GameObjects.Triangle[] = [];

  // ── NPC knockback (set by trick, read by ArenaScene velocity override) ─
  private npcSkateKnockbackUntil = 0;
  private npcSkateKnockbackVX = 0;
  private npcSkateKnockbackVY = 0;
  private npcSkateSlowUntil = 0;

  // ── NPC mirrors ─────────────────────────────────────────────────────
  private npcAdrenalineRank = 0;
  private npcAdrenalineProgress = 0;
  private npcAdrenalineLastStyleTime = 0;
  private npcAdrenalineLastHitTime = 0;
  private npcAdrenalineComboCount = 0;
  private npcAdrenalineShotStreak = 0;
  private npcAdrenalineHyperWindowExpiry = 0;
  private npcAdrenalineHyperchargeReady = false;
  private npcAdrenalineHyperchargeExpiry = 0;
  private npcAdrenalineInjectPhase: 0 | 1 | 2 | 3 = 0;
  private npcAdrenalineInjectPhaseEnd = 0;
  private npcAdrenalineInjectDamageMult = 1;
  private npcAdrenalineStyledOnChain = 0;
  private npcAdrenalineStyledOnWindowEnd = 0;

  // ── HUD objects ─────────────────────────────────────────────────────
  private adrenalineHudBar: Phaser.GameObjects.Graphics | null = null;
  private adrenalineHudRankLabel: Phaser.GameObjects.Text | null = null;
  private adrenalineHudLadder: Phaser.GameObjects.Text | null = null;
  private adrenalineNormalHudCards: Phaser.GameObjects.GameObject[] = [];
  private adrenalineSkateHudCards: Phaser.GameObjects.GameObject[] = [];
  private adrenalineNormalFills: AdrenalineBarEntry[] = [];
  private adrenalineSkateFills: AdrenalineBarEntry[] = [];

  constructor(private readonly arena: AdrenalineArenaApi) {}

  // ── Public accessors ──────────────────────────────────────────────────

  isSkateActive(): boolean { return this.adrenalineSkateActive; }
  isWallTpLocked(): boolean { return this.adrenalineWallTpLocked; }
  getNpcSkateSlowUntil(): number { return this.npcSkateSlowUntil; }
  getSkateVelX(): number { return this.adrenalineSkateVelX; }
  getSkateVelY(): number { return this.adrenalineSkateVelY; }
  getInjectPhase(): number { return this.adrenalineInjectPhase; }

  applyNpcKnockbackIfActive(time: number): void {
    if (this.npcSkateKnockbackUntil > time) {
      (this.arena.npc.body as Phaser.Physics.Arcade.Body).setVelocity(
        this.npcSkateKnockbackVX,
        this.npcSkateKnockbackVY,
      );
    }
  }

  // ── HUD initialisation (called from ArenaScene.create / createHUD) ─────

  /** Creates the style bar area (ladder + rank label + progress bar). Call before createHUD. */
  initStyleBar(cx: number): void {
    const scene = this.arena.scene;
    this.adrenalineHudLadder = scene.add.text(cx, 52, 'F  D  C  B  A  S', {
      fontSize: '16px', fontFamily: '"Arial Black", sans-serif',
      color: '#888888', stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(20);
    this.adrenalineHudRankLabel = scene.add.text(cx, 72, 'F', {
      fontSize: '22px', fontFamily: '"Arial Black", sans-serif',
      color: '#888888', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(20);
    this.adrenalineHudBar = scene.add.graphics().setDepth(20);
    this.refreshHud();
  }

  /** Call AFTER the normal ability-card loop in createHUD, passing the gathered cards/fills. */
  setNormalCards(cards: Phaser.GameObjects.GameObject[], fills: AdrenalineBarEntry[]): void {
    this.adrenalineNormalHudCards = cards;
    this.adrenalineNormalFills = fills;
  }

  /** Creates the SK8-mode HUD cards (hidden until skate is active). Call from createHUD. */
  createSkateHud(startX: number, hudY: number, cardW: number): void {
    const scene = this.arena.scene;
    this.adrenalineSkateFills = [];
    this.adrenalineSkateHudCards = [];
    adrenalineSkateAbilities.forEach((ab, i) => {
      const x = startX + i * cardW;
      const fillColor = SKATE_FILL_COLORS[ab.id] ?? 0xffbb22;
      const bg = scene.add.rectangle(x, hudY, cardW - 4, 44, 0x221100)
        .setStrokeStyle(1, 0xffaa22).setDepth(21).setVisible(false);
      const fill = scene.add.rectangle(x - (cardW - 4) / 2, hudY, 0, 44, fillColor, 0.5)
        .setOrigin(0, 0.5).setDepth(22).setVisible(false);
      const lbl = scene.add.text(x, hudY - 6, `[${ab.displayKey}] ${ab.name}`, {
        fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#ffddaa',
      }).setOrigin(0.5).setDepth(23).setVisible(false);
      const desc = scene.add.text(x, hudY + 8, ab.description, {
        fontSize: '9px', color: '#000000', wordWrap: { width: cardW - 12 }, maxLines: 2, align: 'center',
      }).setOrigin(0.5).setDepth(23).setVisible(false);
      this.adrenalineSkateFills.push({ fill, abilityId: ab.id, maxWidth: cardW - 4, lbl, baseFillColor: fillColor });
      this.adrenalineSkateHudCards.push(bg, fill, lbl, desc);
    });
  }

  // ── Reset ──────────────────────────────────────────────────────────────

  reset(): void {
    this.adrenalineRank = 0;
    this.adrenalineProgress = 0;
    this.adrenalineLastStyleTime = 0;
    this.adrenalineLastHitTime = 0;
    this.adrenalineComboCount = 0;
    this.adrenalineGoldPendingSet.clear();
    this.adrenalineShotStreak = 0;
    this.adrenalineHyperWindowExpiry = 0;
    this.adrenalineHyperchargeReady = false;
    this.adrenalineHyperchargeExpiry = 0;
    if (this.adrenalineHyperchargeVisual) { this.adrenalineHyperchargeVisual.destroy(); this.adrenalineHyperchargeVisual = null; }
    this.adrenalineInjectPhase = 0;
    this.adrenalineInjectPhaseEnd = 0;
    this.adrenalineInjectDamageMult = 1;
    if (this.adrenalineInjectAura) { this.adrenalineInjectAura.destroy(); this.adrenalineInjectAura = null; }
    this.adrenalineCrashSlowUntil = 0;
    this.adrenalineStyledOnChain = 0;
    this.adrenalineStyledOnWindowEnd = 0;
    if (this.adrenalineSkateActive) { this.arena.player.setRotation(0); }
    this.adrenalineSkateActive = false;
    this.adrenalineSkateVelX = 0;
    this.adrenalineSkateVelY = 0;
    this.adrenalineSkateAirborneUntil = 0;
    this.adrenalineRushUntil = 0;
    this.adrenalineRampBoostUntil = 0;
    this.adrenalineCrashSlowUntil = 0;
    this.adrenalineSkateHitAt.clear();
    this.adrenalineWallTpRemaining = 0;
    this.adrenalineWallTpNextAt = 0;
    this.adrenalineWallTpLocked = false;
    for (const r of this.adrenalineRamps) r.sprite.destroy();
    this.adrenalineRamps = [];
    if (this.adrenalineDashRect) { this.adrenalineDashRect.destroy(); this.adrenalineDashRect = null; }
    this.adrenalineDashEndAt = 0; this.adrenalineDashHit = false;
    if (this.adrenalineStyledOnDashRect) { this.adrenalineStyledOnDashRect.destroy(); this.adrenalineStyledOnDashRect = null; }
    this.adrenalineStyledOnDashEndAt = 0; this.adrenalineStyledOnDashHit = false;
    if (this.adrenalineAccelMeterBg) { this.adrenalineAccelMeterBg.destroy(); this.adrenalineAccelMeterBg = null; }
    if (this.adrenalineAccelMeterFg) { this.adrenalineAccelMeterFg.destroy(); this.adrenalineAccelMeterFg = null; }
    for (const r of this.adrenalineReasonTexts) r.text.destroy();
    this.adrenalineReasonTexts = [];
    this.adrenalineWeapon = 0;
    this.adrenalineFreshUntil = 0;
    if (this.adrenalineFreshLabel) { this.adrenalineFreshLabel.destroy(); this.adrenalineFreshLabel = null; }
    this.adrenalineRushAccelUntil = 0;
    this.adrenalineSuperZoomUntil = 0;
    this.adrenalineLastRampId = -1;
    this.adrenalineLastRampRiddenAt = 0;
    this.adrenalineInjectExtendCount = 0;
    this.adrenalineInjectPhase2DurMult = 1;
    this.adrenalineSSinceMs = 0;
    this.adrenalineLastHitForP = 0;
    if (this.adrenalinePAura) { this.adrenalinePAura.destroy(); this.adrenalinePAura = null; }
    if (this.adrenalinePHitBar) { this.adrenalinePHitBar.destroy(); this.adrenalinePHitBar = null; }
    this.adrenalineAllUpgradesActive = false;
    for (const d of this.adrenalineDiamonds) d.destroy();
    this.adrenalineDiamonds = [];
    this.npcSkateKnockbackUntil = 0;
    this.npcSkateKnockbackVX = 0;
    this.npcSkateKnockbackVY = 0;
    this.npcSkateSlowUntil = 0;
    this.npcAdrenalineRank = 0;
    this.npcAdrenalineProgress = 0;
    this.npcAdrenalineLastStyleTime = 0;
    this.npcAdrenalineLastHitTime = 0;
    this.npcAdrenalineComboCount = 0;
    this.npcAdrenalineShotStreak = 0;
    this.npcAdrenalineHyperWindowExpiry = 0;
    this.npcAdrenalineHyperchargeReady = false;
    this.npcAdrenalineHyperchargeExpiry = 0;
    this.npcAdrenalineInjectPhase = 0;
    this.npcAdrenalineInjectPhaseEnd = 0;
    this.npcAdrenalineInjectDamageMult = 1;
    this.npcAdrenalineStyledOnChain = 0;
    this.npcAdrenalineStyledOnWindowEnd = 0;
    // HUD objects
    this.adrenalineNormalHudCards = [];
    this.adrenalineSkateHudCards = [];
    this.adrenalineNormalFills = [];
    this.adrenalineSkateFills = [];
    if (this.adrenalineHudBar) { this.adrenalineHudBar.destroy(); this.adrenalineHudBar = null; }
    if (this.adrenalineHudRankLabel) { this.adrenalineHudRankLabel.destroy(); this.adrenalineHudRankLabel = null; }
    if (this.adrenalineHudLadder) { this.adrenalineHudLadder.destroy(); this.adrenalineHudLadder = null; }
  }

  // ── Style helpers ──────────────────────────────────────────────────────

  addStyle(pts: number, lbl: string, col?: string): void {
    const time = this.arena.scene.time.now;
    if (this.arena.hasUpgrade('click') && time < this.adrenalineFreshUntil) pts = Math.round(pts * 1.5);
    this.adrenalineLastStyleTime = time;
    this.adrenalineProgress += pts;
    while (this.adrenalineRank < 5 && this.adrenalineProgress >= RANK_THRESH[this.adrenalineRank]) {
      this.adrenalineProgress -= RANK_THRESH[this.adrenalineRank];
      this.adrenalineRank++;
      this.arena.showFloatingText(
        this.arena.player.x, this.arena.player.y - 55,
        `RANK ${RANK_LETTERS[this.adrenalineRank]}!`, '#ffee00',
      );
    }
    if (lbl) {
      const color = col ?? RANK_COLORS[this.adrenalineRank];
      this.arena.showFloatingText(
        this.arena.player.x - 10 + Math.random() * 20,
        this.arena.player.y - 35,
        lbl, color,
      );
      this.spawnReasonText(`+${pts} ${lbl}`, color);
    }
    if (time < this.adrenalineStyledOnWindowEnd) {
      this.arena.player.reduceCooldown('adrenaline-styled-on', 999999999);
    }
    this.refreshHud();
  }

  private spawnReasonText(label: string, color: string): void {
    if (!this.adrenalineHudBar) return;
    const scene = this.arena.scene;
    const cx = scene.scale.width / 2;
    // keep at most 2 visible; remove oldest if at cap
    while (this.adrenalineReasonTexts.length >= 2) {
      const old = this.adrenalineReasonTexts.shift()!;
      old.text.destroy();
    }
    const yOff = 94 + this.adrenalineReasonTexts.length * 14;
    const txt = scene.add.text(cx, yOff, label, {
      fontSize: '11px', fontFamily: 'Arial, sans-serif', color,
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(21).setAlpha(1);
    scene.tweens.add({ targets: txt, alpha: 0, duration: 900, onComplete: () => txt.destroy() });
    this.adrenalineReasonTexts.push({ text: txt, expireAt: scene.time.now + 900 });
  }

  npcAddStyle(pts: number, _lbl: string, _col?: string): void {
    this.npcAdrenalineLastStyleTime = this.arena.scene.time.now;
    this.npcAdrenalineProgress += pts;
    while (this.npcAdrenalineRank < 5 && this.npcAdrenalineProgress >= RANK_THRESH[this.npcAdrenalineRank]) {
      this.npcAdrenalineProgress -= RANK_THRESH[this.npcAdrenalineRank];
      this.npcAdrenalineRank++;
    }
    if (this.arena.scene.time.now < this.npcAdrenalineStyledOnWindowEnd) {
      this.arena.npc.reduceCooldown('adrenaline-styled-on', 999999999);
    }
  }

  registerShotHit(owner: 'player' | 'npc'): void {
    const time = this.arena.scene.time.now;
    if (owner === 'player') {
      this.adrenalineLastHitForP = time;
      this.adrenalineComboCount = (time - this.adrenalineLastHitTime < 1000) ? this.adrenalineComboCount + 1 : 1;
      this.adrenalineLastHitTime = time;
      this.adrenalineShotStreak++;
      if      (this.adrenalineComboCount === 2) this.addStyle(4, '', '#44ddff');
      else if (this.adrenalineComboCount >= 3)  this.addStyle(7, '', '#ff44ff');
      else                                       this.addStyle(2, '', '#ffcc44');
    } else {
      this.npcAdrenalineComboCount = (time - this.npcAdrenalineLastHitTime < 1000) ? this.npcAdrenalineComboCount + 1 : 1;
      this.npcAdrenalineLastHitTime = time;
      this.npcAdrenalineShotStreak++;
      if      (this.npcAdrenalineComboCount === 2) this.npcAddStyle(4, 'Double!');
      else if (this.npcAdrenalineComboCount >= 3)  this.npcAddStyle(7, 'Triple!');
      else                                          this.npcAddStyle(2, '');
    }
  }

  registerShotMiss(owner: 'player' | 'npc'): void {
    if (owner === 'player') { this.adrenalineComboCount = 0; this.adrenalineShotStreak = 0; }
    else { this.npcAdrenalineComboCount = 0; this.npcAdrenalineShotStreak = 0; }
  }

  /** Called when a player golden-shot projectile hits the NPC. Returns true if handled. */
  onPlayerShotHitNpc(proj: Phaser.Physics.Arcade.Sprite): boolean {
    if (proj.texture.key !== 'proj-adrenaline-shot') return false;
    if (!this.adrenalineGoldPendingSet.has(proj)) return false;
    this.adrenalineGoldPendingSet.delete(proj);
    this.registerShotHit('player');
    this.adrenalineHyperWindowExpiry = this.arena.scene.time.now + 800;
    return true;
  }

  /** Called when NPC golden-shot projectile hits the player. */
  onNpcShotHitPlayer(projKey: string): void {
    if (projKey !== 'proj-adrenaline-shot') return;
    this.registerShotHit('npc');
    this.npcAdrenalineHyperWindowExpiry = this.arena.scene.time.now + 800;
  }

  /** Checks if a deactivated/off-screen projectile was a pending golden shot (miss). */
  checkProjectileMiss(proj: Phaser.Physics.Arcade.Sprite): boolean {
    if (!this.adrenalineGoldPendingSet.has(proj)) return false;
    this.adrenalineGoldPendingSet.delete(proj);
    this.registerShotMiss('player');
    return true;
  }

  // ── Damage multiplier ──────────────────────────────────────────────────

  private getDamageMult(owner: 'player' | 'npc'): number {
    const rank    = owner === 'player' ? this.adrenalineRank           : this.npcAdrenalineRank;
    const injectM = owner === 'player' ? this.adrenalineInjectDamageMult : this.npcAdrenalineInjectDamageMult;
    return (1.0 + 0.1 * rank) * injectM;
  }

  // ── HUD refresh ────────────────────────────────────────────────────────

  private refreshHud(): void {
    if (!this.adrenalineHudLadder || !this.adrenalineHudRankLabel || !this.adrenalineHudBar) return;
    const rank = this.adrenalineRank;
    this.adrenalineHudRankLabel.setText(RANK_LETTERS[rank]).setColor(RANK_COLORS[rank]);
    // Ladder: show P only if Q+ equipped
    const letters = this.arena.hasUpgrade('q') ? RANK_LETTERS : RANK_LETTERS.slice(0, 6);
    const parts = (letters as readonly string[]).map((l, i) => i === rank ? `[${l}]` : ` ${l} `).join('');
    this.adrenalineHudLadder.setText(parts);
    this.adrenalineHudBar.clear();
    const barW = 100; const barH = 8;
    const cx = this.arena.scene.scale.width / 2;
    const barX = cx - barW / 2;
    const barY = 82;
    const thresh = (rank < 5) ? RANK_THRESH[rank] : 1;
    const fill = (rank >= 5) ? 1 : Math.min(1, this.adrenalineProgress / thresh);
    this.adrenalineHudBar.fillStyle(0x333333, 0.7);
    this.adrenalineHudBar.fillRect(barX, barY, barW, barH);
    const fillColor = parseInt(RANK_COLORS[rank].replace('#', ''), 16);
    this.adrenalineHudBar.fillStyle(fillColor, 1);
    this.adrenalineHudBar.fillRect(barX, barY, Math.floor(barW * fill), barH);
  }

  // ── Ability implementations ────────────────────────────────────────────

  doGoldenShot(tx: number, ty: number, owner: 'player' | 'npc'): void {
    const { scene, projectiles, player, npc } = this.arena;
    const caster = owner === 'player' ? player : npc;
    const dx = tx - caster.x;
    const dy = ty - caster.y;
    const len = Math.hypot(dx, dy) || 1;
    const isHyper = owner === 'player'
      ? this.adrenalineHyperchargeReady && scene.time.now < this.adrenalineHyperchargeExpiry
      : this.npcAdrenalineHyperchargeReady && scene.time.now < this.npcAdrenalineHyperchargeExpiry;
    const freshMult = (owner === 'player' && scene.time.now < this.adrenalineFreshUntil) ? 1.5 : 1;

    // Click+: weapon dispatch
    if (owner === 'player' && this.arena.hasUpgrade('click')) {
      if (this.adrenalineWeapon === 1) {
        // Shotgun: 3 projectiles ±12°
        const baseAngle = Math.atan2(dy, dx);
        for (const spread of [-12, 0, 12]) {
          const a = baseAngle + spread * (Math.PI / 180);
          const dmg3 = Math.round(15 * 0.6 * this.getDamageMult(owner) * freshMult);
          const p3 = new Projectile(scene, caster.x, caster.y, 'proj-adrenaline-shot', dmg3, true);
          projectiles.add(p3);
          p3.launch(Math.cos(a) * 600, Math.sin(a) * 600);
          this.adrenalineGoldPendingSet.add(p3 as unknown as Phaser.Physics.Arcade.Sprite);
        }
        return;
      } else if (this.adrenalineWeapon === 2) {
        // Nail gun: low dmg, fast
        const dmg2 = Math.round(15 * 0.3 * this.getDamageMult(owner) * freshMult);
        const p2 = new Projectile(scene, caster.x, caster.y, 'proj-adrenaline-shot', dmg2, true);
        projectiles.add(p2);
        p2.launch((dx / len) * 800, (dy / len) * 800);
        this.adrenalineGoldPendingSet.add(p2 as unknown as Phaser.Physics.Arcade.Sprite);
        return;
      }
    }

    const dmg = Math.round(15 * this.getDamageMult(owner) * (isHyper ? 2 : 1) * freshMult);
    const proj = new Projectile(scene, caster.x, caster.y, 'proj-adrenaline-shot', dmg, owner === 'player');
    if (isHyper) proj.setScale(1.4);
    projectiles.add(proj);
    proj.launch((dx / len) * 600, (dy / len) * 600);
    if (owner === 'player') {
      if (isHyper) {
        this.adrenalineHyperchargeReady = false;
        if (this.adrenalineHyperchargeVisual) { this.adrenalineHyperchargeVisual.destroy(); this.adrenalineHyperchargeVisual = null; }
        this.arena.showFloatingText(caster.x, caster.y - 45, 'HYPER SHOT!', '#ffee00');
      }
      this.adrenalineGoldPendingSet.add(proj as unknown as Phaser.Physics.Arcade.Sprite);
    }
  }

  doDash(tx: number, ty: number, owner: 'player' | 'npc'): void {
    const { scene, player, npc } = this.arena;
    const caster = owner === 'player' ? player : npc;
    const dx = tx - caster.x;
    const dy = ty - caster.y;
    const len = Math.hypot(dx, dy) || 1;
    const ndx = dx / len; const ndy = dy / len;
    const body = caster.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(ndx * 350, ndy * 350);
    caster.isInvincible = true;
    if (owner === 'player') this.arena.setIsDodging(true);
    const time = scene.time.now;
    if (owner === 'player') {
      if (time < this.adrenalineHyperWindowExpiry) {
        this.adrenalineHyperchargeReady = true;
        this.adrenalineHyperchargeExpiry = time + 2000;
        if (!this.adrenalineHyperchargeVisual) {
          this.adrenalineHyperchargeVisual = scene.add.circle(caster.x, caster.y, 28, 0xffee44, 0).setDepth(4);
          scene.tweens.add({ targets: this.adrenalineHyperchargeVisual, alpha: 0.5, yoyo: true, repeat: -1, duration: 250 });
        }
        this.arena.showFloatingText(caster.x, caster.y - 45, 'HYPER!', '#ffee00');
      }
      // Sword-thrust rectangle visual
      if (this.adrenalineDashRect) this.adrenalineDashRect.destroy();
      this.adrenalineDashRect = scene.add.rectangle(
        caster.x + ndx * 30, caster.y + ndy * 30, 60, 18, 0xffbb22, 0.75,
      ).setRotation(Math.atan2(ndy, ndx)).setDepth(4);
      this.adrenalineDashEndAt = time + 280;
      this.adrenalineDashDirX = ndx;
      this.adrenalineDashDirY = ndy;
      this.adrenalineDashHit = false;
    } else {
      if (time < this.npcAdrenalineHyperWindowExpiry) {
        this.npcAdrenalineHyperchargeReady = true;
        this.npcAdrenalineHyperchargeExpiry = time + 2000;
      }
    }
    scene.time.delayedCall(280, () => {
      if (!caster.active) return;
      caster.isInvincible = false;
      if (owner === 'player') {
        this.arena.setIsDodging(false);
        if (this.adrenalineDashRect) { this.adrenalineDashRect.destroy(); this.adrenalineDashRect = null; }
        this.adrenalineDashEndAt = 0;
        if (!this.adrenalineDashHit) this.addStyle(2, '');
      } else {
        const target = player;
        const dist = Phaser.Math.Distance.Between(caster.x, caster.y, target.x, target.y);
        if (dist <= 40) {
          const dmg = Math.round(18 * this.getDamageMult(owner));
          target.takeDamage(dmg);
          this.npcAddStyle(4, 'Rush Hit!');
        } else {
          this.npcAddStyle(2, '');
        }
      }
    });
  }

  doToggleSkate(owner: 'player' | 'npc'): void {
    if (owner !== 'player') return;
    const { scene, player } = this.arena;
    const entering = !this.adrenalineSkateActive;
    this.adrenalineSkateActive = entering;
    if (entering) {
      this.adrenalineSkateVelX = 0;
      this.adrenalineSkateVelY = 0;
      player.isInvincible = true;
      scene.time.delayedCall(200, () => { if (player.active) player.isInvincible = false; });
      for (const o of this.adrenalineNormalHudCards) (o as unknown as { setVisible: (v: boolean) => void }).setVisible(false);
      for (const o of this.adrenalineSkateHudCards)  (o as unknown as { setVisible: (v: boolean) => void }).setVisible(true);
      this.arena.setAbilityBars(this.adrenalineSkateFills);
      // Accel meter
      this.adrenalineAccelMeterBg = scene.add.rectangle(player.x, player.y - 42, 48, 4, 0x222222, 0.85).setDepth(10);
      this.adrenalineAccelMeterFg = scene.add.rectangle(player.x - 24, player.y - 42, 0, 4, 0xffee44, 1).setOrigin(0, 0.5).setDepth(11);
    } else {
      for (const o of this.adrenalineSkateHudCards)  (o as unknown as { setVisible: (v: boolean) => void }).setVisible(false);
      for (const o of this.adrenalineNormalHudCards) (o as unknown as { setVisible: (v: boolean) => void }).setVisible(true);
      this.arena.setAbilityBars(this.adrenalineNormalFills);
      player.setRotation(0);
      this.adrenalineSkateVelX = 0;
      this.adrenalineSkateVelY = 0;
      if (this.adrenalineAccelMeterBg) { this.adrenalineAccelMeterBg.destroy(); this.adrenalineAccelMeterBg = null; }
      if (this.adrenalineAccelMeterFg) { this.adrenalineAccelMeterFg.destroy(); this.adrenalineAccelMeterFg = null; }
    }
  }

  doSelfInject(owner: 'player' | 'npc'): void {
    const { scene, player, npc } = this.arena;
    const time = scene.time.now;
    const caster = owner === 'player' ? player : npc;
    if (owner === 'player') {
      this.adrenalineInjectPhase = 1;
      this.adrenalineInjectPhaseEnd = time + 4000;
      this.adrenalineInjectExtendCount = 0;
      this.adrenalineInjectPhase2DurMult = 1;
      this.adrenalineInjectDamageMult = 1.5;
      this.arena.setPlayerSpeedMult(2.0);
      player.cooldownMult = 0.5;
      if (!this.adrenalineInjectAura) {
        this.adrenalineInjectAura = scene.add.circle(caster.x, caster.y, 32, 0xff6600, 0).setDepth(4);
        scene.tweens.add({ targets: this.adrenalineInjectAura, alpha: 0.45, yoyo: true, repeat: -1, duration: 300 });
      }
      this.arena.showFloatingText(caster.x, caster.y - 45, 'INJECTED!', '#ff6600');
    } else {
      this.npcAdrenalineInjectPhase = 1;
      this.npcAdrenalineInjectPhaseEnd = time + 4000;
      this.npcAdrenalineInjectDamageMult = 1.5;
    }
  }

  doStyledOn(tx: number, ty: number, owner: 'player' | 'npc'): void {
    const { scene, player, npc } = this.arena;
    const caster = owner === 'player' ? player : npc;
    const target = owner === 'player' ? this.arena.getNearestEnemy(caster.x, caster.y) : player;
    const dx = tx - caster.x;
    const dy = ty - caster.y;
    const len = Math.hypot(dx, dy) || 1;
    const ndx = dx / len; const ndy = dy / len;
    const body = caster.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(ndx * 375, ndy * 375);
    caster.isInvincible = true;
    if (owner === 'player') {
      this.arena.setIsDodging(true);
      // Sword-thrust rectangle visual for Q
      if (this.adrenalineStyledOnDashRect) this.adrenalineStyledOnDashRect.destroy();
      this.adrenalineStyledOnDashRect = scene.add.rectangle(
        caster.x + ndx * 30, caster.y + ndy * 30, 60, 18, 0xff8800, 0.75,
      ).setRotation(Math.atan2(ndy, ndx)).setDepth(4);
      this.adrenalineStyledOnDashEndAt = scene.time.now + 300;
      this.adrenalineStyledOnDashDirX = ndx;
      this.adrenalineStyledOnDashDirY = ndy;
      this.adrenalineStyledOnDashHit = false;
    }
    scene.time.delayedCall(300, () => {
      if (!caster.active) return;
      caster.isInvincible = false;
      if (owner === 'player') {
        this.arena.setIsDodging(false);
        body.setVelocity(0, 0);
        if (this.adrenalineStyledOnDashRect) { this.adrenalineStyledOnDashRect.destroy(); this.adrenalineStyledOnDashRect = null; }
        this.adrenalineStyledOnDashEndAt = 0;
        if (!this.adrenalineStyledOnDashHit) {
          const dist = Phaser.Math.Distance.Between(caster.x, caster.y, target.x, target.y);
          if (dist > 45) return;
          this.applyStyledOnHit(caster, target, owner);
        }
        return;
      }
      body.setVelocity(0, 0);
      const dist = Phaser.Math.Distance.Between(caster.x, caster.y, target.x, target.y);
      if (dist > 45) return;
      this.applyStyledOnHit(caster, target, owner);
    });
  }

  private applyStyledOnHit(caster: Fighter, target: Fighter, owner: 'player' | 'npc'): void {
    if (owner === 'player') this.adrenalineLastHitForP = this.arena.scene.time.now;
    const dmg = Math.round(30 * this.getDamageMult(owner));
    target.takeDamage(dmg);
    this.arena.spawnHitFlash(target.x, target.y, 0xff8800);
    const now = this.arena.scene.time.now;
    if (owner === 'player') {
      this.adrenalineStyledOnChain++;
      this.adrenalineStyledOnWindowEnd = now + 2000;
      if (this.adrenalineStyledOnChain >= 5) {
        this.arena.showFloatingText(caster.x, caster.y - 55, 'Parry this!', '#ff4400');
        this.addStyle(12, '');
        this.adrenalineStyledOnChain = 0;
      } else {
        this.arena.showFloatingText(caster.x, caster.y - 40, `${dmg}`, '#ff8800');
        this.addStyle(5, 'Styled On!', '#ff8800');
      }
    } else {
      this.npcAdrenalineStyledOnChain++;
      this.npcAdrenalineStyledOnWindowEnd = now + 2000;
      if (this.npcAdrenalineStyledOnChain >= 5) this.npcAdrenalineStyledOnChain = 0;
      this.npcAddStyle(5, 'Styled On!');
    }
  }

  doOllie(owner: 'player' | 'npc'): void {
    if (owner !== 'player') return;
    const { scene, player } = this.arena;
    player.isInvincible = true;
    this.adrenalineSkateAirborneUntil = scene.time.now + 250;
    scene.time.delayedCall(250, () => { if (player.active) player.isInvincible = false; });
    this.addStyle(2, 'Air!', '#88eecc');
    this.arena.spawnHitFlash(player.x, player.y, 0xffcc44);
  }

  doRamp(owner: 'player' | 'npc'): void {
    if (owner !== 'player') return;
    const { scene, player } = this.arena;
    const hasRPlus = this.arena.hasUpgrade('r');
    let nx = this.adrenalineSkateVelX;
    let ny = this.adrenalineSkateVelY;
    let len = Math.hypot(nx, ny);
    if (len < 1) {
      const ptr = scene.input.activePointer;
      nx = ptr.worldX - player.x;
      ny = ptr.worldY - player.y;
      len = Math.hypot(nx, ny) || 1;
    }
    nx /= len; ny /= len;
    const rampX = player.x + nx * 60;
    const rampY = player.y + ny * 60;
    const angle = Math.atan2(ny, nx);
    const rampSprite = scene.add.rectangle(rampX, rampY, 60, 20, 0xcc8800).setRotation(angle).setDepth(3);
    const lifetime = hasRPlus ? 10000 : 5000;
    const maxRamps = hasRPlus ? 2 : 1;
    // Remove oldest if over limit
    while (this.adrenalineRamps.length >= maxRamps) {
      const oldest = this.adrenalineRamps.shift()!;
      oldest.sprite.destroy();
    }
    const rampId = scene.time.now; // unique ID per ramp
    this.adrenalineRamps.push({ id: rampId, x: rampX, y: rampY, expiresAt: scene.time.now + lifetime, scoreCdUntil: 0, sprite: rampSprite });
  }

  doTrick(owner: 'player' | 'npc'): void {
    if (owner !== 'player') return;
    const { scene, player, npc } = this.arena;
    const time = scene.time.now;
    const hasRPlus = this.arena.hasUpgrade('r');
    const superZoom = hasRPlus && time < this.adrenalineSuperZoomUntil;
    const rampBoosted = time < this.adrenalineRampBoostUntil;
    const radius = 120;
    let baseDmg = 8;
    if (superZoom) baseDmg = 60;
    else if (rampBoosted && hasRPlus) baseDmg = 35;
    else if (rampBoosted) baseDmg = 25;
    const dmg = Math.round(baseDmg * this.getDamageMult('player'));
    const d = Phaser.Math.Distance.Between(player.x, player.y, npc.x, npc.y);
    const hitSet = new Set<Fighter>();
    if (d <= radius && !hitSet.has(npc)) {
      hitSet.add(npc);
      npc.takeDamage(dmg);
      this.arena.spawnHitFlash(npc.x, npc.y, 0xffee44);
      const kdx = npc.x - player.x;
      const kdy = npc.y - player.y;
      const kl = Math.hypot(kdx, kdy) || 1;
      this.npcSkateKnockbackVX = (kdx / kl) * 900;
      this.npcSkateKnockbackVY = (kdy / kl) * 900;
      this.npcSkateKnockbackUntil = time + 400;
      if (superZoom) {
        this.npcSkateSlowUntil = time + 5000;
        this.adrenalineRampBoostUntil = 0;
        this.adrenalineSuperZoomUntil = 0;
        this.addStyle(100, 'UBER TRICK!', '#ff44ff');
      } else if (rampBoosted) {
        this.npcSkateSlowUntil = time + 5000;
        this.adrenalineRampBoostUntil = 0;
        this.addStyle(50, 'Big Trick!', '#ffee00');
      } else {
        this.addStyle(25, 'Trick!', '#ffee44');
      }
    }
    const aoeRing = scene.add.circle(player.x, player.y, 10, 0xffee44, 0.7).setDepth(8);
    scene.tweens.add({ targets: aoeRing, scaleX: radius / 10, scaleY: radius / 10, alpha: 0, duration: 300, onComplete: () => aoeRing.destroy() });
    this.arena.spawnHitFlash(player.x, player.y, 0xffee44);
  }

  doWallTeleport(_tx: number, _ty: number, owner: 'player' | 'npc'): void {
    if (owner !== 'player') return;
    this.adrenalineWallTpRemaining = 5;
    this.adrenalineWallTpNextAt = this.arena.scene.time.now;
    this.adrenalineWallTpLocked = true;
    this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 40, '🌀 WALL TELEPORT!', '#ffbb22');
  }

  doRush(): void {
    const { scene, player } = this.arena;
    this.adrenalineRushUntil = scene.time.now + 1000;
    if (this.arena.hasUpgrade('r')) this.adrenalineRushAccelUntil = scene.time.now + 1000;
    this.arena.spawnHitFlash(player.x, player.y, 0xffee88);
    const rushGlow = scene.add.circle(player.x, player.y, 14, 0xffcc22, 0.85).setDepth(9);
    scene.tweens.add({ targets: rushGlow, scaleX: 4, scaleY: 4, alpha: 0, duration: 400, onComplete: () => rushGlow.destroy() });
    this.arena.showFloatingText(player.x, player.y - 36, '⚡ RUSH!', '#ffee22');
  }

  handleSkateContact(): void {
    const { scene, npc } = this.arena;
    const time = scene.time.now;
    const last = this.adrenalineSkateHitAt.get(npc) ?? 0;
    if (time - last < 250) return;
    this.adrenalineSkateHitAt.set(npc, time);
    const rushActive = time < this.adrenalineRushUntil;
    const baseDmg = rushActive ? 25 : 10;
    const dmg = Math.round(baseDmg * this.getDamageMult('player'));
    npc.takeDamage(dmg);
    this.arena.spawnHitFlash(npc.x, npc.y, 0xffaa22);
    if (rushActive) this.addStyle(25, 'Rush!', '#ffee00');
  }

  // ── SK8 physics ────────────────────────────────────────────────────────

  /** Applies skate momentum movement. Call from ArenaScene's movement block when isSkateActive && !isDodging. */
  applySkateMovement(delta: number, playerSpeedMult: number, gauntletSpeedMult: number): void {
    const { scene, player } = this.arena;
    const playerBody = player.body as Phaser.Physics.Arcade.Body;
    const ptr = scene.input.activePointer;
    const ACCEL = (this.arena.hasUpgrade('r') && scene.time.now < this.adrenalineRushAccelUntil) ? 1600 : 800;
    const MAX = player.speed * 1.6;
    const DAMP = 0.96;
    const dt = delta / 1000;
    const dx = ptr.worldX - player.x;
    const dy = ptr.worldY - player.y;
    const len = Math.hypot(dx, dy) || 1;
    this.adrenalineSkateVelX += (dx / len) * ACCEL * dt;
    this.adrenalineSkateVelY += (dy / len) * ACCEL * dt;
    this.adrenalineSkateVelX *= DAMP;
    this.adrenalineSkateVelY *= DAMP;
    const sp = Math.hypot(this.adrenalineSkateVelX, this.adrenalineSkateVelY);
    const boostMult = scene.time.now < this.adrenalineRampBoostUntil ? 1.5 : 1;
    const maxSp = MAX * playerSpeedMult * gauntletSpeedMult * boostMult;
    if (sp > maxSp) {
      this.adrenalineSkateVelX *= maxSp / sp;
      this.adrenalineSkateVelY *= maxSp / sp;
    }
    playerBody.setVelocity(this.adrenalineSkateVelX, this.adrenalineSkateVelY);
    player.setRotation(Math.atan2(this.adrenalineSkateVelY, this.adrenalineSkateVelX));
  }

  // ── Input handler ──────────────────────────────────────────────────────

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    const { eKey, fKey, rKey, qKey, pointerWasDown, player, scene } = this.arena;
    const playerCtx = this.arena.buildPlayerContext(mouseX, mouseY);
    const kb = scene.input.keyboard!;

    // Click+ weapon cycle (1/2/3)
    if (this.arena.hasUpgrade('click')) {
      const k1 = kb.addKey(Phaser.Input.Keyboard.KeyCodes.ONE);
      const k2 = kb.addKey(Phaser.Input.Keyboard.KeyCodes.TWO);
      const k3 = kb.addKey(Phaser.Input.Keyboard.KeyCodes.THREE);
      if (Phaser.Input.Keyboard.JustDown(k1) && this.adrenalineWeapon !== 0) {
        this.adrenalineWeapon = 0; this.setFresh(time);
      } else if (Phaser.Input.Keyboard.JustDown(k2) && this.adrenalineWeapon !== 1) {
        this.adrenalineWeapon = 1; this.setFresh(time);
      } else if (Phaser.Input.Keyboard.JustDown(k3) && this.adrenalineWeapon !== 2) {
        this.adrenalineWeapon = 2; this.setFresh(time);
      }
    }

    if (this.adrenalineSkateActive) {
      if (pointer.isDown && !pointerWasDown)              player.castAbility('adrenaline-rush',          playerCtx);
      if (Phaser.Input.Keyboard.JustDown(eKey))           player.castAbility('adrenaline-ramp',          playerCtx);
      if (Phaser.Input.Keyboard.JustDown(fKey))           player.castAbility('adrenaline-trick',         playerCtx);
      if (Phaser.Input.Keyboard.JustDown(rKey))           player.castAbility('adrenaline-skate-toggle',  playerCtx);
      if (Phaser.Input.Keyboard.JustDown(qKey))           player.castAbility('adrenaline-wall-teleport', playerCtx);
    } else {
      if (pointer.isDown && !pointerWasDown)              player.castAbility('adrenaline-golden-shot',   playerCtx);
      if (Phaser.Input.Keyboard.JustDown(eKey))           player.castAbility('adrenaline-dash',          playerCtx);
      if (Phaser.Input.Keyboard.JustDown(rKey))           player.castAbility('adrenaline-skate-toggle',  playerCtx);
      // F: inject or F+ extend during phase 1
      if (Phaser.Input.Keyboard.JustDown(fKey)) {
        if (this.adrenalineInjectPhase === 0) {
          player.castAbility('adrenaline-self-inject', playerCtx);
        } else if (this.adrenalineInjectPhase === 1 && this.arena.hasUpgrade('f') && this.adrenalineInjectExtendCount < 3) {
          this.extendInjectPhase1(time);
        }
      }
      if (Phaser.Input.Keyboard.JustDown(qKey))           player.castAbility('adrenaline-styled-on',     playerCtx);
    }
  }

  private setFresh(time: number): void {
    this.adrenalineFreshUntil = time + 1500;
    const cx = this.arena.scene.scale.width / 2;
    if (!this.adrenalineFreshLabel) {
      this.adrenalineFreshLabel = this.arena.scene.add.text(cx + 60, 94, 'Fresh!', {
        fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#44ff88',
        stroke: '#000000', strokeThickness: 2,
      }).setOrigin(0.5).setDepth(21);
    }
    this.adrenalineFreshLabel.setText('Fresh!').setColor('#44ff88');
  }

  private extendInjectPhase1(time: number): void {
    this.adrenalineInjectPhaseEnd = time + 4000;
    this.adrenalineInjectExtendCount++;
    this.adrenalineInjectPhase2DurMult *= 2;
    this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 45,
      `EXTEND ×${this.adrenalineInjectExtendCount}!`, '#ff8800');
  }

  // ── Per-frame update ───────────────────────────────────────────────────

  update(time: number, delta: number, isPlayerAdren: boolean, isNpcAdren: boolean): void {
    const { scene, player, npc } = this.arena;
    const dt = delta / 1000;

    // ── Player ──────────────────────────────────────────────────────
    if (isPlayerAdren) {
      // Constant style drain
      if (this.adrenalineProgress > 0 || this.adrenalineRank > 0) {
        this.adrenalineProgress = Math.max(0, this.adrenalineProgress - STYLE_DRAIN * dt);
        if (this.adrenalineProgress === 0 && this.adrenalineRank > 0) {
          this.adrenalineRank--;
          this.adrenalineProgress = this.adrenalineRank < 5 ? RANK_THRESH[this.adrenalineRank] * 0.5 : 0;
          this.arena.showFloatingText(player.x, player.y - 50, 'RANK DOWN', '#ff4444');
        }
      }
      if (time - this.adrenalineLastHitTime > 1000) this.adrenalineComboCount = 0;

      // Rank speed bonus
      this.arena.applyPlayerSpeedMult(ADREN_RANK_SPD[this.adrenalineRank]);

      // Hypercharge expiry
      if (this.adrenalineHyperchargeReady && time > this.adrenalineHyperchargeExpiry) {
        this.adrenalineHyperchargeReady = false;
        if (this.adrenalineHyperchargeVisual) { this.adrenalineHyperchargeVisual.destroy(); this.adrenalineHyperchargeVisual = null; }
      }
      if (this.adrenalineHyperchargeVisual) this.adrenalineHyperchargeVisual.setPosition(player.x, player.y);

      // E dash rect: move with player + per-frame hit detection
      if (this.adrenalineDashRect && time < this.adrenalineDashEndAt) {
        this.adrenalineDashRect.setPosition(
          player.x + this.adrenalineDashDirX * 30,
          player.y + this.adrenalineDashDirY * 30,
        );
        if (!this.adrenalineDashHit) {
          const rectBounds = this.adrenalineDashRect.getBounds();
          const npcBounds = npc.getBounds();
          if (Phaser.Geom.Rectangle.Overlaps(rectBounds, npcBounds) ||
              Phaser.Math.Distance.Between(player.x, player.y, npc.x, npc.y) <= 40) {
            this.adrenalineDashHit = true;
            this.adrenalineLastHitForP = time;
            const dmg = Math.round(18 * this.getDamageMult('player'));
            npc.takeDamage(dmg);
            this.arena.spawnHitFlash(npc.x, npc.y, 0xffaa22);
            this.arena.showFloatingText(player.x, player.y - 40, `${dmg}`, '#ffaa22');
            this.addStyle(4, 'Rush Hit!', '#ffaa22');
          }
          // 1b: dash hitting own projectile → red tint boost (only if E+ is NOT parrying)
          if (!this.adrenalineDashHit && !this.arena.hasUpgrade('e')) {
            this.arena.projectiles.getChildren().forEach((go) => {
              const proj = go as Phaser.Physics.Arcade.Sprite & { isFromPlayer?: boolean };
              if (!proj.active || proj.texture.key !== 'proj-adrenaline-shot' || !proj.isFromPlayer) return;
              const d = Phaser.Math.Distance.Between(
                player.x + this.adrenalineDashDirX * 30,
                player.y + this.adrenalineDashDirY * 30,
                proj.x, proj.y,
              );
              if (d < 38) {
                proj.setTint(0xff3333);
                this.adrenalineDashHit = true;
                this.addStyle(2, 'Redirect!', '#ff5555');
              }
            });
          }
          // E+: parry enemy projectiles
          if (this.arena.hasUpgrade('e')) {
            this.arena.projectiles.getChildren().forEach((go) => {
              if (this.adrenalineDashHit) return;
              const proj = go as Phaser.Physics.Arcade.Sprite & { isFromPlayer?: boolean };
              if (!proj.active || (proj as { isFromPlayer?: boolean }).isFromPlayer) return;
              const d = Phaser.Math.Distance.Between(
                player.x + this.adrenalineDashDirX * 30,
                player.y + this.adrenalineDashDirY * 30,
                proj.x, proj.y,
              );
              if (d < 40) {
                // Deactivate enemy projectile
                proj.setActive(false).setVisible(false);
                (proj.body as Phaser.Physics.Arcade.Body).stop();
                // Spawn parried ball toward npc
                const parried = new Projectile(scene, player.x, player.y, 'proj-adrenaline-parry', 30, true);
                this.arena.projectiles.add(parried);
                const pdx = npc.x - player.x; const pdy = npc.y - player.y;
                const pl = Math.hypot(pdx, pdy) || 1;
                parried.launch((pdx / pl) * 900, (pdy / pl) * 900);
                this.addStyle(10, 'Feedback!', '#ffcc44');
                this.adrenalineDashHit = true;
              }
            });
          }
        }
      }

      // Q dash rect: move with player + per-frame hit detection
      if (this.adrenalineStyledOnDashRect && time < this.adrenalineStyledOnDashEndAt) {
        this.adrenalineStyledOnDashRect.setPosition(
          player.x + this.adrenalineStyledOnDashDirX * 30,
          player.y + this.adrenalineStyledOnDashDirY * 30,
        );
        if (!this.adrenalineStyledOnDashHit) {
          const rectBounds = this.adrenalineStyledOnDashRect.getBounds();
          const npcBounds = npc.getBounds();
          if (Phaser.Geom.Rectangle.Overlaps(rectBounds, npcBounds) ||
              Phaser.Math.Distance.Between(player.x, player.y, npc.x, npc.y) <= 45) {
            this.adrenalineStyledOnDashHit = true;
            this.applyStyledOnHit(player, npc, 'player');
          }
        }
      }

      // Self Inject state machine
      if (this.adrenalineInjectPhase === 1 && time >= this.adrenalineInjectPhaseEnd) {
        this.adrenalineInjectDamageMult = 1;
        this.arena.setPlayerSpeedMult(1);
        player.cooldownMult = 1;
        // Phase 2 always runs; F+ scales duration
        const phase2Dur = 2000 * this.adrenalineInjectPhase2DurMult;
        this.adrenalineInjectPhase = 2;
        this.adrenalineInjectPhaseEnd = time + phase2Dur;
        player.incomingDamageMultiplier = 0.5;
        this.adrenalineCrashSlowUntil = time + phase2Dur;
        if (this.adrenalineInjectAura) this.adrenalineInjectAura.setFillStyle(0x4488ff, 0);
        this.arena.showFloatingText(player.x, player.y - 40, 'CRASH!', '#4488ff');
      } else if (this.adrenalineInjectPhase === 2 && time >= this.adrenalineInjectPhaseEnd) {
        this.adrenalineInjectPhase = 3;
        this.adrenalineInjectPhaseEnd = time + 1000;
        player.incomingDamageMultiplier = 1;
        this.adrenalineCrashSlowUntil = 0;
        if (this.adrenalineInjectAura) { this.adrenalineInjectAura.destroy(); this.adrenalineInjectAura = null; }
        this.arena.showFloatingText(player.x, player.y - 40, 'Recovered', '#88ff88');
      } else if (this.adrenalineInjectPhase === 3 && time >= this.adrenalineInjectPhaseEnd) {
        this.adrenalineInjectPhase = 0;
      }
      if (this.adrenalineInjectAura) this.adrenalineInjectAura.setPosition(player.x, player.y);
      // Crash slow
      if (time < this.adrenalineCrashSlowUntil) this.arena.applyPlayerSpeedMult(0.3);

      // Styled On window expiry
      if (time > this.adrenalineStyledOnWindowEnd && this.adrenalineStyledOnChain > 0) {
        this.adrenalineStyledOnChain = 0;
      }

      // Ramps: TTL + ride detection (2s score cd per ramp)
      for (let i = this.adrenalineRamps.length - 1; i >= 0; i--) {
        const r = this.adrenalineRamps[i];
        if (time >= r.expiresAt) {
          r.sprite.destroy();
          this.adrenalineRamps.splice(i, 1);
          continue;
        }
        if (this.adrenalineSkateActive) {
          const dist = Phaser.Math.Distance.Between(player.x, player.y, r.x, r.y);
          if (dist < 42) {
            this.adrenalineSkateVelX *= 1.5;
            this.adrenalineSkateVelY *= 1.5;
            this.adrenalineRampBoostUntil = time + 1000;
            if (time >= r.scoreCdUntil) {
              r.scoreCdUntil = time + 2000;
              // R+: Super Zoom if different ramp than last (within 4s)
              if (this.arena.hasUpgrade('r') && r.id !== this.adrenalineLastRampId && time - this.adrenalineLastRampRiddenAt < 4000) {
                this.adrenalineSuperZoomUntil = time + 3000;
                this.addStyle(20, 'Super Zoom!', '#ff88ff');
              } else {
                this.addStyle(5, 'Zoom!', '#ffee88');
              }
              this.adrenalineLastRampId = r.id;
              this.adrenalineLastRampRiddenAt = time;
            }
          }
        }
      }

      // Accel meter update
      if (this.adrenalineSkateActive && this.adrenalineAccelMeterBg && this.adrenalineAccelMeterFg) {
        const boostMult = time < this.adrenalineRampBoostUntil ? 1.5 : 1;
        const maxSp = (player.speed * 1.6) * this.arena.gauntletSpeedMult * boostMult;
        const curSp = Math.hypot(this.adrenalineSkateVelX, this.adrenalineSkateVelY);
        const ratio = Math.min(1, curSp / (maxSp || 1));
        this.adrenalineAccelMeterBg.setPosition(player.x, player.y - 42);
        this.adrenalineAccelMeterFg.setPosition(player.x - 24, player.y - 42);
        this.adrenalineAccelMeterFg.setSize(Math.round(48 * ratio), 4);
      }

      // Wall teleport sequence driver
      if (this.adrenalineWallTpRemaining > 0) {
        if (!this.adrenalineSkateActive) {
          this.adrenalineWallTpRemaining = 0;
          this.adrenalineWallTpLocked = false;
        } else if (time >= this.adrenalineWallTpNextAt) {
          this.executeWallTp();
          this.adrenalineWallTpRemaining--;
          const interval = this.arena.hasUpgrade('r') ? 1000 : 1500;
          this.adrenalineWallTpNextAt = time + interval;
          if (this.adrenalineWallTpRemaining === 0) this.adrenalineWallTpLocked = false;
        }
      }
      // Lock player during wall teleport
      if (this.adrenalineWallTpLocked) {
        (player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
        this.adrenalineSkateVelX = 0;
        this.adrenalineSkateVelY = 0;
      }

      // Q+: P tier logic
      if (this.arena.hasUpgrade('q')) {
        if (this.adrenalineRank === 5) {
          if (this.adrenalineSSinceMs === 0) this.adrenalineSSinceMs = time;
          if (time - this.adrenalineSSinceMs >= P_ENTRY_MS) {
            this.adrenalineRank = 6;
            this.adrenalineLastHitForP = time;
            player.setTint(0x8822cc);
            this.arena.showFloatingText(player.x, player.y - 60, '✦ P TIER ✦', '#ff66ff');
            if (!this.adrenalinePAura) {
              this.adrenalinePAura = scene.add.circle(player.x, player.y, 35, 0xff44ff, 0).setDepth(3);
              scene.tweens.add({ targets: this.adrenalinePAura, alpha: 0.35, yoyo: true, repeat: -1, duration: 500 });
            }
            if (!this.adrenalinePHitBar) this.adrenalinePHitBar = scene.add.graphics().setDepth(21);
          }
        } else if (this.adrenalineRank !== 5) {
          this.adrenalineSSinceMs = 0;
        }
        if (this.adrenalineRank === 6) {
          this.arena.applyPlayerSpeedMult(1.5);
          if (this.adrenalinePAura) this.adrenalinePAura.setPosition(player.x, player.y);
          // Must hit every 1s
          if (time - this.adrenalineLastHitForP > 1000) {
            this.adrenalineRank = 5;
            this.adrenalineSSinceMs = 0;
            player.clearTint();
            if (this.adrenalinePAura) { this.adrenalinePAura.destroy(); this.adrenalinePAura = null; }
            if (this.adrenalinePHitBar) { this.adrenalinePHitBar.destroy(); this.adrenalinePHitBar = null; }
            this.arena.showFloatingText(player.x, player.y - 55, 'P LOST', '#ff4488');
          } else if (this.adrenalinePHitBar) {
            const elapsed = time - this.adrenalineLastHitForP;
            const ratio = Math.max(0, 1 - elapsed / 1000);
            const cx2 = scene.scale.width / 2;
            this.adrenalinePHitBar.clear();
            this.adrenalinePHitBar.fillStyle(0x330000, 0.6);
            this.adrenalinePHitBar.fillRect(cx2 - 50, 93, 100, 4);
            this.adrenalinePHitBar.fillStyle(0xff2255, 1);
            this.adrenalinePHitBar.fillRect(cx2 - 50, 93, Math.floor(100 * ratio), 4);
          }
        }
      } else if (this.adrenalineRank === 6) {
        // Downgrade P if Q+ removed
        this.adrenalineRank = 5;
      }
      if (this.adrenalineRank !== 6) {
        if (this.adrenalinePAura) { this.adrenalinePAura.destroy(); this.adrenalinePAura = null; }
        if (this.adrenalinePHitBar) { this.adrenalinePHitBar.destroy(); this.adrenalinePHitBar = null; }
      }

      // P damage mult
      if (this.adrenalineRank === 6) {
        this.adrenalineInjectDamageMult = Math.max(this.adrenalineInjectDamageMult, 2.0);
      }

      // Fresh label update
      if (this.adrenalineFreshLabel) {
        if (time >= this.adrenalineFreshUntil) {
          this.adrenalineFreshLabel.setText('stale').setColor('#888888');
        }
        const cx2 = scene.scale.width / 2;
        this.adrenalineFreshLabel.setPosition(cx2 + 60, 94);
      }

      // All-upgrades cosmetic
      const allUp = this.arena.hasUpgrade('click') && this.arena.hasUpgrade('e') &&
                    this.arena.hasUpgrade('r') && this.arena.hasUpgrade('f') && this.arena.hasUpgrade('q');
      if (allUp && !this.adrenalineAllUpgradesActive) {
        this.adrenalineAllUpgradesActive = true;
        player.setTint(0x4488ff);
        for (const d of this.adrenalineDiamonds) d.destroy();
        this.adrenalineDiamonds = [
          scene.add.triangle(player.x - 16, player.y - 8, 0, -5, 5, 0, -5, 0, 0xffee00).setDepth(5),
          scene.add.triangle(player.x - 16, player.y,     0, -5, 5, 0, -5, 0, 0xffee00).setDepth(5),
          scene.add.triangle(player.x - 16, player.y + 8, 0, -5, 5, 0, -5, 0, 0xffee00).setDepth(5),
        ];
      } else if (!allUp && this.adrenalineAllUpgradesActive) {
        this.adrenalineAllUpgradesActive = false;
        player.clearTint();
        for (const d of this.adrenalineDiamonds) d.destroy();
        this.adrenalineDiamonds = [];
      }
      if (this.adrenalineAllUpgradesActive && this.adrenalineRank !== 6) {
        for (let di = 0; di < this.adrenalineDiamonds.length; di++) {
          this.adrenalineDiamonds[di].setPosition(player.x - 16, player.y - 8 + di * 8);
        }
      }

      // Clean up expired reason texts
      this.adrenalineReasonTexts = this.adrenalineReasonTexts.filter((r) => {
        if (time >= r.expireAt) { return false; }
        return true;
      });

      this.refreshHud();
    }

    // ── NPC ─────────────────────────────────────────────────────────
    if (isNpcAdren) {
      if (this.npcAdrenalineRank > 0 && time - this.npcAdrenalineLastStyleTime > 3000) {
        this.npcAdrenalineRank--;
        this.npcAdrenalineProgress = RANK_THRESH[this.npcAdrenalineRank] * 0.5;
        this.npcAdrenalineLastStyleTime = time;
      }
      if (time - this.npcAdrenalineLastHitTime > 1000) this.npcAdrenalineComboCount = 0;
      if (this.npcAdrenalineHyperchargeReady && time > this.npcAdrenalineHyperchargeExpiry) {
        this.npcAdrenalineHyperchargeReady = false;
      }
      if (this.npcAdrenalineInjectPhase === 1 && time >= this.npcAdrenalineInjectPhaseEnd) {
        this.npcAdrenalineInjectDamageMult = 1;
        // Phase 2 always runs (1c)
        this.npcAdrenalineInjectPhase = 2;
        this.npcAdrenalineInjectPhaseEnd = time + 2000;
        npc.incomingDamageMultiplier = 0.5;
      } else if (this.npcAdrenalineInjectPhase === 2 && time >= this.npcAdrenalineInjectPhaseEnd) {
        this.npcAdrenalineInjectPhase = 3;
        this.npcAdrenalineInjectPhaseEnd = time + 1000;
        npc.incomingDamageMultiplier = 1;
      } else if (this.npcAdrenalineInjectPhase === 3 && time >= this.npcAdrenalineInjectPhaseEnd) {
        this.npcAdrenalineInjectPhase = 0;
      }
      if (time > this.npcAdrenalineStyledOnWindowEnd && this.npcAdrenalineStyledOnChain > 0) {
        this.npcAdrenalineStyledOnChain = 0;
      }
    }
  }

  // ── Wall teleport execution ────────────────────────────────────────────

  private executeWallTp(): void {
    const { scene, player, npc } = this.arena;
    const W = this.arena.width;
    const H = this.arena.height;
    const pBody = player.body as Phaser.Physics.Arcade.Body;
    const playerR = Math.max(pBody.width, pBody.height) / 2;
    const pad = 32 + playerR + 4;
    const ox = player.x;
    const oy = player.y;
    const ptr = scene.input.activePointer;
    const dx = ptr.worldX - ox;
    const dy = ptr.worldY - oy;
    const len = Math.hypot(dx, dy) || 1;
    const ndx = dx / len;
    const ndy = dy / len;
    let wallT = 4000;
    if (ndx > 0.001)       wallT = Math.min(wallT, (W - pad - ox) / ndx);
    else if (ndx < -0.001) wallT = Math.min(wallT, (pad - ox) / ndx);
    if (ndy > 0.001)       wallT = Math.min(wallT, (H - pad - oy) / ndy);
    else if (ndy < -0.001) wallT = Math.min(wallT, (pad - oy) / ndy);
    wallT = Math.max(0, wallT);
    const endX = Phaser.Math.Clamp(ox + ndx * wallT, pad, W - pad);
    const endY = Phaser.Math.Clamp(oy + ndy * wallT, pad, H - pad);
    // Sweep: damage enemies whose perp distance < 40
    const perp = this.segmentDist(npc.x, npc.y, ox, oy, endX, endY);
    if (perp < 40) {
      const dmg = Math.round(15 * this.getDamageMult('player'));
      npc.takeDamage(dmg);
      this.arena.spawnHitFlash(npc.x, npc.y, 0xffbb22);
      this.addStyle(15, "You're too slow!", '#ffbb22');
    }
    // R+: ramp on ray path → WOAH
    if (this.arena.hasUpgrade('r')) {
      for (let ri = this.adrenalineRamps.length - 1; ri >= 0; ri--) {
        const rmp = this.adrenalineRamps[ri];
        if (this.segmentDist(rmp.x, rmp.y, ox, oy, endX, endY) < 30) {
          rmp.sprite.destroy();
          this.adrenalineRamps.splice(ri, 1);
          const burst = scene.add.circle(rmp.x, rmp.y, 10, 0xffcc66, 0.9).setDepth(8);
          scene.tweens.add({ targets: burst, scaleX: 15, scaleY: 15, alpha: 0, duration: 400, onComplete: () => burst.destroy() });
          const aoeRange = 150;
          const dd = Phaser.Math.Distance.Between(npc.x, npc.y, rmp.x, rmp.y);
          if (dd <= aoeRange) {
            npc.takeDamage(40);
            this.arena.spawnHitFlash(npc.x, npc.y, 0xffcc44);
          }
          this.addStyle(50, 'WOAH!', '#ffcc44');
          break;
        }
      }
    }
    const tg = scene.add.graphics().setDepth(9);
    tg.lineStyle(4, 0xffcc44, 0.8);
    tg.lineBetween(ox, oy, endX, endY);
    scene.tweens.add({ targets: tg, alpha: 0, duration: 400, onComplete: () => tg.destroy() });
    pBody.reset(endX, endY);
    this.arena.spawnHitFlash(endX, endY, 0xffbb22);
  }

  private segmentDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
    const abx = bx - ax; const aby = by - ay;
    const len2 = abx * abx + aby * aby;
    if (len2 < 1) return Math.hypot(px - ax, py - ay);
    const t = Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / len2));
    return Math.hypot(px - (ax + t * abx), py - (ay + t * aby));
  }
}
