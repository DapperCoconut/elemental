import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import { Projectile } from '../../combat/Projectile';

// ── Shared bar-entry type (mirrors ArenaScene's AbilityBarEntry) ──────────

export interface SilenceBarEntry {
  fill: Phaser.GameObjects.Rectangle;
  abilityId: string;
  maxWidth: number;
  lbl?: Phaser.GameObjects.Text;
  baseFillColor?: number;
}

// ── SilenceArenaApi ────────────────────────────────────────────────────────

export interface SilenceArenaApi {
  readonly player: Fighter;
  readonly npc: Fighter;
  readonly scene: Phaser.Scene;
  readonly projectiles: Phaser.Physics.Arcade.Group;
  readonly eKey: Phaser.Input.Keyboard.Key;
  readonly fKey: Phaser.Input.Keyboard.Key;
  readonly rKey: Phaser.Input.Keyboard.Key;
  readonly qKey: Phaser.Input.Keyboard.Key;
  readonly pointerWasDown: boolean;
  readonly enemies: Fighter[];
  readonly width: number;
  readonly height: number;
  setIsDodging(v: boolean): void;
  applyPlayerSpeedMult(f: number): void;
  applyNpcSpeedMult(f: number): void;
  setAbilityBars(fills: SilenceBarEntry[]): void;
  hasUpgrade(slot: string): boolean;
  hasPerk(owner: 'player' | 'npc', perkId: string): boolean;
  spawnHitFlash(x: number, y: number, color: number): void;
  spawnDamageNumber(x: number, y: number, amount: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  buildPlayerContext(x: number, y: number): CastContext;
  buildNpcContext(x: number, y: number): CastContext;
  getNearestEnemy(x: number, y: number): Fighter;
  setNukeChanneling(v: boolean, endAt: number): void;
  setPlayerYankUntil(t: number): void;
}

// ── SilenceKit ─────────────────────────────────────────────────────────────

export class SilenceKit {
  // ── Player state ───────────────────────────────────────────────────
  private silenceSlasherActive = false;
  private silenceSlasherHp = 0;
  private silenceSlasherPips: Phaser.GameObjects.Arc[] = [];
  private silenceMaskSprite: Phaser.GameObjects.Image | null = null;
  private silenceFearCharging = false;
  private silenceFear = 0;
  private silenceFearReleaseQueued = false;
  private silenceFearBarBg: Phaser.GameObjects.Rectangle | null = null;
  private silenceFearBarFill: Phaser.GameObjects.Rectangle | null = null;
  private silenceConeGraphic: Phaser.GameObjects.Graphics | null = null;
  private silenceConeAngle = 0;
  private silenceConeExpiry = 0;
  private silenceConeTickAccum = 0;
  private silenceConeContinuousStart = 0;
  private silencePossessedUntil = 0;
  private silenceWatchChanneling = false;
  private silenceWatchExpiry = 0;
  private silenceWatchGoopRects: Phaser.GameObjects.Rectangle[] = [];
  private silenceWatchEyes: Phaser.GameObjects.Image[] = [];
  private silenceWatchTickAccum = 0;
  private silenceWatchTendrilCd = 0;
  private silenceHookConnected = false;
  private silenceHookWindowExpiry = 0;
  private silenceHookProj: Projectile | null = null;
  private silenceHookTarget: Fighter | null = null;
  private silenceNpcYankUntil = 0;
  private silenceMortalWindupUntil = 0;
  private silenceMortalTelegraph: Phaser.GameObjects.Rectangle | null = null;
  private silenceMortalSelfSlowUntil = 0;
  private silenceSlashEmUpActive = false;
  private silenceSlashEmUpStep = 0;
  private silenceSlashEmUpTrees: Phaser.GameObjects.Image[] = [];
  private silenceSlashEmUpFilter: Phaser.GameObjects.Rectangle | null = null;

  // ── Click+: Fear Blast / Charged Machete ──────────────────────────
  private silenceMacheteChargeStart = 0;
  private silenceMacheteCharging = false;

  // ── E+: Statue / Slam Hook ─────────────────────────────────────────
  private silenceConeAngleGrown = 20; // degrees, starts at 20
  private silenceHookSlamReady = false;

  // ── R+: Voodoo doll ───────────────────────────────────────────────
  private silenceVoodooDoll: Phaser.GameObjects.Image | null = null;
  private silenceVoodooX = 0;
  private silenceVoodooY = 0;
  private silenceVoodooActive = false;
  private silenceRedBonusPip: Phaser.GameObjects.Arc | null = null;
  private silenceRedBonusHp = false;

  // ── F+: Abandon ───────────────────────────────────────────────────
  private silenceFQPermanentlyLocked = false;
  private silenceFHoldStart = 0;
  private silenceSlasherFConsumed = false; // F was held when entering slasher; ignore until released

  // ── Q+: Goop Form / Impale Click ──────────────────────────────────
  private silenceGoopFormActive = false;
  private silenceGoopCoverStart = 0; // when player started covering enemy
  private silenceEntombed = false;
  private silenceEntombTexts: Phaser.GameObjects.Text[] = [];
  private silenceImpaleReady = false;
  private silenceImpaleWindowUntil = 0;
  private silenceImpaleSparkle: Phaser.GameObjects.Graphics | null = null;
  private silenceImpaleAboveUntil = 0;

  // ── NPC mirror state ───────────────────────────────────────────────
  private npcSilenceSlasherActive = false;
  private npcSilenceSlasherHp = 10;
  private npcSilenceHookConnected = false;
  private npcSilenceConeGraphic: Phaser.GameObjects.Graphics | null = null;
  private npcSilenceConeAngle = 0;
  private npcSilenceConeExpiry = 0;
  private npcSilenceConeTickAccum = 0;
  private npcSilenceConeContinuousStart = 0;
  private npcSilenceMaskSprite: Phaser.GameObjects.Image | null = null;

  // ── HUD objects ────────────────────────────────────────────────────
  private silenceNormalHudCards: Phaser.GameObjects.GameObject[] = [];
  private silenceSlasherHudCards: Phaser.GameObjects.GameObject[] = [];
  private silenceNormalFills: SilenceBarEntry[] = [];
  private silenceSlasherFills: SilenceBarEntry[] = [];

  constructor(private readonly arena: SilenceArenaApi) {}

  // ── Public accessors ───────────────────────────────────────────────

  isSlasherActive(): boolean { return this.silenceSlasherActive; }
  isWatchChanneling(): boolean { return this.silenceWatchChanneling; }
  /** Player-yank timestamp is stored in ArenaScene via setPlayerYankUntil/setPlayerYankUntil.
   *  ArenaScene reads it directly from its own field; this accessor is a no-op stub. */
  getPlayerYankUntil(): number { return 0; }
  getNpcYankUntil(): number { return this.silenceNpcYankUntil; }
  getMortalWindupUntil(): number { return this.silenceMortalWindupUntil; }
  isFearCharging(): boolean { return this.silenceFearCharging; }
  isHookConnected(): boolean { return this.silenceHookConnected; }
  getHookWindowExpiry(): number { return this.silenceHookWindowExpiry; }
  isNpcSlasherActive(): boolean { return this.npcSilenceSlasherActive; }
  getNpcSlasherHp(): number { return this.npcSilenceSlasherHp; }
  isNpcHookConnected(): boolean { return this.npcSilenceHookConnected; }

  // ── HUD initialisation ─────────────────────────────────────────────

  /** Call AFTER normal ability-card loop in createHUD, passing cards+fills for the normal kit. */
  setNormalCards(cards: Phaser.GameObjects.GameObject[], fills: SilenceBarEntry[]): void {
    this.silenceNormalHudCards = cards;
    this.silenceNormalFills = fills;
  }

  /** Creates the Slasher-mode HUD cards (hidden until entering slasher). Call from createHUD. */
  createSlasherHud(
    startX: number,
    hudY: number,
    cardW: number,
    slasherAbilities: Array<{ id: string; displayKey: string; name: string; description: string }>,
    fillColors: Record<string, number>,
  ): void {
    const scene = this.arena.scene;
    const cardH = 48;
    this.silenceSlasherFills = [];
    this.silenceSlasherHudCards = [];
    slasherAbilities.forEach((ab, i) => {
      const x = startX + i * cardW;
      const bg = scene.add.rectangle(x, hudY, cardW - 4, cardH - 4, 0x1a0800)
        .setStrokeStyle(1, 0x884422).setDepth(21).setVisible(false);
      const fill = scene.add.rectangle(x - (cardW - 4) / 2, hudY, 0, cardH - 4, fillColors[ab.id] ?? 0x662211, 0.5)
        .setOrigin(0, 0.5).setDepth(22).setVisible(false);
      const lbl = scene.add.text(x, hudY - 6, `[${ab.displayKey}] ${ab.name}`, {
        fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#ffccaa',
      }).setOrigin(0.5, 0.5).setDepth(23).setVisible(false);
      const desc = scene.add.text(x, hudY + 8, ab.description, {
        fontSize: '9px', color: '#000000', wordWrap: { width: cardW - 12 }, maxLines: 2, align: 'center',
      }).setOrigin(0.5, 0.5).setDepth(23).setVisible(false);
      this.silenceSlasherFills.push({ fill, abilityId: ab.id, maxWidth: cardW - 4, lbl });
      this.silenceSlasherHudCards.push(bg, fill, lbl, desc);
    });
  }

  // ── Reset ──────────────────────────────────────────────────────────

  reset(): void {
    this.silenceSlasherActive = false;
    this.silenceSlasherHp = 0;
    for (const p of this.silenceSlasherPips) p.destroy();
    this.silenceSlasherPips = [];
    if (this.silenceMaskSprite) { this.silenceMaskSprite.destroy(); this.silenceMaskSprite = null; }
    if (this.npcSilenceMaskSprite) { this.npcSilenceMaskSprite.destroy(); this.npcSilenceMaskSprite = null; }
    this.silenceFearCharging = false;
    this.silenceFear = 0;
    this.silenceFearReleaseQueued = false;
    if (this.silenceFearBarBg) { this.silenceFearBarBg.destroy(); this.silenceFearBarBg = null; }
    if (this.silenceFearBarFill) { this.silenceFearBarFill.destroy(); this.silenceFearBarFill = null; }
    if (this.silenceConeGraphic) { this.silenceConeGraphic.destroy(); this.silenceConeGraphic = null; }
    this.silenceConeExpiry = 0;
    this.silencePossessedUntil = 0;
    this.silenceWatchChanneling = false;
    this.silenceWatchExpiry = 0;
    for (const r of this.silenceWatchGoopRects) r.destroy();
    this.silenceWatchGoopRects = [];
    for (const e of this.silenceWatchEyes) e.destroy();
    this.silenceWatchEyes = [];
    this.silenceHookConnected = false;
    this.silenceHookWindowExpiry = 0;
    if (this.silenceHookProj) { this.silenceHookProj.destroy(); this.silenceHookProj = null; }
    this.silenceHookTarget = null;
    this.silenceNpcYankUntil = 0;
    this.silenceMortalWindupUntil = 0;
    if (this.silenceMortalTelegraph) { this.silenceMortalTelegraph.destroy(); this.silenceMortalTelegraph = null; }
    this.silenceMortalSelfSlowUntil = 0;
    this.silenceSlashEmUpActive = false;
    this.silenceSlashEmUpStep = 0;
    for (const t of this.silenceSlashEmUpTrees) t.destroy();
    this.silenceSlashEmUpTrees = [];
    if (this.silenceSlashEmUpFilter) { this.silenceSlashEmUpFilter.destroy(); this.silenceSlashEmUpFilter = null; }
    // Upgrade state
    this.silenceMacheteChargeStart = 0; this.silenceMacheteCharging = false;
    this.silenceConeAngleGrown = 20; this.silenceHookSlamReady = false;
    if (this.silenceVoodooDoll) { this.silenceVoodooDoll.destroy(); this.silenceVoodooDoll = null; }
    this.silenceVoodooActive = false;
    if (this.silenceRedBonusPip) { this.silenceRedBonusPip.destroy(); this.silenceRedBonusPip = null; }
    this.silenceRedBonusHp = false;
    this.silenceFQPermanentlyLocked = false; this.silenceFHoldStart = 0; this.silenceSlasherFConsumed = false;
    this.silenceGoopFormActive = false; this.silenceGoopCoverStart = 0; this.silenceEntombed = false;
    for (const t of this.silenceEntombTexts) t.destroy(); this.silenceEntombTexts = [];
    this.silenceImpaleReady = false; this.silenceImpaleWindowUntil = 0; this.silenceImpaleAboveUntil = 0;
    if (this.silenceImpaleSparkle) { this.silenceImpaleSparkle.destroy(); this.silenceImpaleSparkle = null; }
    // NPC state
    this.npcSilenceSlasherActive = false;
    this.npcSilenceSlasherHp = 10;
    this.npcSilenceHookConnected = false;
    if (this.npcSilenceConeGraphic) { this.npcSilenceConeGraphic.destroy(); this.npcSilenceConeGraphic = null; }
    this.npcSilenceConeExpiry = 0;
    // HUD
    this.silenceNormalHudCards = [];
    this.silenceSlasherHudCards = [];
    this.silenceNormalFills = [];
    this.silenceSlasherFills = [];
    void this.silenceFearReleaseQueued;
    void this.silenceSlashEmUpStep;
  }

  // ── Private helpers ────────────────────────────────────────────────

  private silenceToggleSlasherHud(toSlasher: boolean): void {
    for (const o of this.silenceNormalHudCards) (o as unknown as { setVisible: (v: boolean) => void }).setVisible(!toSlasher);
    for (const o of this.silenceSlasherHudCards) (o as unknown as { setVisible: (v: boolean) => void }).setVisible(toSlasher);
    this.arena.setAbilityBars(toSlasher ? this.silenceSlasherFills : this.silenceNormalFills);
  }

  private drawSilenceCone(g: Phaser.GameObjects.Graphics, x: number, y: number, angleRad: number, halfAngleDeg = 10): void {
    const W = this.arena.width;
    const H = this.arena.height;
    const maxLen = Math.max(W, H) * 1.5;
    const halfAngle = halfAngleDeg * (Math.PI / 180);
    g.clear();
    g.fillStyle(0x000000, 0.32);
    g.beginPath();
    g.moveTo(x, y);
    const steps = 12;
    for (let si = 0; si <= steps; si++) {
      const a = (angleRad - halfAngle) + si * (halfAngle * 2 / steps);
      g.lineTo(x + Math.cos(a) * maxLen, y + Math.sin(a) * maxLen);
    }
    g.closePath();
    g.fillPath();
  }

  private isInSilenceCone(px: number, py: number, ox: number, oy: number, coneAngle: number, halfAngleDeg = 10): boolean {
    const dx4 = px - ox, dy4 = py - oy;
    if (Math.sqrt(dx4 * dx4 + dy4 * dy4) < 5) return false;
    const angle4 = Math.atan2(dy4, dx4);
    const diff = Math.abs(Phaser.Math.Angle.ShortestBetween(
      Phaser.Math.RadToDeg(angle4),
      Phaser.Math.RadToDeg(coneAngle),
    ));
    return diff <= halfAngleDeg;
  }

  private updateSilenceSlasherPips(): void {
    for (let pi = 0; pi < this.silenceSlasherPips.length; pi++) {
      const active = pi < this.silenceSlasherHp;
      this.silenceSlasherPips[pi].setFillStyle(active ? 0x44ff44 : 0x224422, active ? 0.9 : 0.3);
    }
  }

  // ── Ability implementations ────────────────────────────────────────

  /** Player cast: Fire Possess projectile */
  doFirePossess(angleRad: number, owner: 'player' | 'npc'): void {
    const { scene, projectiles, player, npc } = this.arena;
    const caster = owner === 'player' ? player : npc;
    const speed = owner === 'player' ? 320 : 320;
    const proj = new Projectile(scene, caster.x, caster.y, 'proj-silence-eye', 12, owner === 'player');
    projectiles.add(proj);
    proj.launch(Math.cos(angleRad) * speed, Math.sin(angleRad) * speed);
    scene.time.delayedCall(2500, () => {
      if (proj.active) { proj.setActive(false).setVisible(false); (proj.body as Phaser.Physics.Arcade.Body).stop(); }
    });
    if (owner === 'player') {
      const flash = scene.add.circle(caster.x, caster.y, 12, 0x660088, 0.7).setDepth(9);
      scene.tweens.add({ targets: flash, scaleX: 2, scaleY: 2, alpha: 0, duration: 250, onComplete: () => flash.destroy() });
    }
  }

  /** Player: Enter Slasher mode */
  doEnterSlasher(owner: 'player' | 'npc'): void {
    const { scene, player, npc } = this.arena;
    if (owner === 'player') {
      this.silenceSlasherActive = true;
      this.silenceSlasherHp = 10;
      player.setTint(0x440044);
      player.setScale(1.15);
      // Create pip overlay
      for (const p of this.silenceSlasherPips) p.destroy();
      this.silenceSlasherPips = [];
      for (let pi = 0; pi < 10; pi++) {
        const pip = scene.add.circle(0, 0, 5, 0x44ff44, 0.9).setDepth(15);
        this.silenceSlasherPips.push(pip);
      }
      // Install damageAbsorber: 1 pip per hit
      player.damageAbsorber = (_amount: number) => {
        if (!this.silenceSlasherActive) return false;
        this.silenceSlasherHp = Math.max(0, this.silenceSlasherHp - 1);
        this.updateSilenceSlasherPips();
        if (this.silenceSlasherHp <= 0) {
          scene.time.delayedCall(50, () => {
            this.arena.buildPlayerContext(npc.x, npc.y).silenceExitSlasher(false);
          });
        }
        return true;
      };
      this.silenceToggleSlasherHud(true);
      if (this.silenceMaskSprite) this.silenceMaskSprite.destroy();
      this.silenceMaskSprite = scene.add.image(player.x, player.y - 4, 'mask-silence').setDepth(12);
      const burst = scene.add.circle(player.x, player.y, 20, 0x660044, 0.8).setDepth(8);
      scene.tweens.add({ targets: burst, scaleX: 3, scaleY: 3, alpha: 0, duration: 380, onComplete: () => burst.destroy() });
      this.arena.showFloatingText(player.x, player.y - 30, '🔪 Slasher Mode!', '#ffcc88');
    } else {
      // NPC
      this.npcSilenceSlasherActive = true;
      this.npcSilenceSlasherHp = 10;
      npc.setTint(0x440044);
      npc.setScale(1.15);
      npc.damageAbsorber = (_amount: number) => {
        if (!this.npcSilenceSlasherActive) return false;
        this.npcSilenceSlasherHp = Math.max(0, this.npcSilenceSlasherHp - 1);
        if (this.npcSilenceSlasherHp <= 0) {
          scene.time.delayedCall(50, () => {
            this.arena.buildNpcContext(player.x, player.y).silenceExitSlasher(false);
          });
        }
        return true;
      };
      if (this.npcSilenceMaskSprite) this.npcSilenceMaskSprite.destroy();
      this.npcSilenceMaskSprite = scene.add.image(npc.x, npc.y - 4, 'mask-silence').setDepth(12);
      const burst = scene.add.circle(npc.x, npc.y, 20, 0x660044, 0.8).setDepth(8);
      scene.tweens.add({ targets: burst, scaleX: 3, scaleY: 3, alpha: 0, duration: 380, onComplete: () => burst.destroy() });
    }
  }

  /** Player/NPC: Exit Slasher mode */
  doExitSlasher(voluntary: boolean, owner: 'player' | 'npc'): void {
    const { scene, player, npc } = this.arena;
    if (owner === 'player') {
      if (!this.silenceSlasherActive) return;
      const pipsLost = 10 - this.silenceSlasherHp;
      const recoil = voluntary ? pipsLost * 10 : 100;
      this.silenceSlasherActive = false;
      this.silenceSlasherHp = 0;
      player.clearTint();
      player.setScale(1.0);
      player.damageAbsorber = null;
      for (const p of this.silenceSlasherPips) p.destroy();
      this.silenceSlasherPips = [];
      this.silenceToggleSlasherHud(false);
      if (this.silenceMaskSprite) { this.silenceMaskSprite.destroy(); this.silenceMaskSprite = null; }
      if (recoil > 0) {
        player.takeDamage(recoil);
        this.arena.showFloatingText(player.x, player.y - 30, `-${recoil} recoil`, '#ff4422');
      }
      player.triggerCooldown('silence-thriller');
      const burst = scene.add.circle(player.x, player.y, 20, 0x440033, 0.7).setDepth(8);
      scene.tweens.add({ targets: burst, scaleX: 2.5, scaleY: 2.5, alpha: 0, duration: 320, onComplete: () => burst.destroy() });
      this.arena.showFloatingText(player.x, player.y - 50, '💀 Left slasher', '#ccaaff');
    } else {
      // NPC
      if (!this.npcSilenceSlasherActive) return;
      const pipsLost = 10 - this.npcSilenceSlasherHp;
      const recoil = voluntary ? pipsLost * 10 : 100;
      this.npcSilenceSlasherActive = false;
      this.npcSilenceSlasherHp = 10;
      npc.clearTint();
      npc.setScale(1.0);
      npc.damageAbsorber = null;
      if (this.npcSilenceMaskSprite) { this.npcSilenceMaskSprite.destroy(); this.npcSilenceMaskSprite = null; }
      if (recoil > 0) npc.takeDamage(recoil);
      npc.triggerCooldown('silence-thriller');
    }
  }

  /** Player: Start They Watch channeling */
  doStartWatch(owner: 'player' | 'npc'): void {
    if (owner !== 'player') return; // NPC has no watch ability
    const { scene, player } = this.arena;
    const W = this.arena.width;
    const H = this.arena.height;
    this.silenceWatchChanneling = true;
    this.silenceWatchExpiry = scene.time.now + 10000;
    this.silenceWatchTickAccum = 0;
    this.silenceWatchTendrilCd = 0;
    player.isInvincible = true;
    (player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    // Goop borders
    const GOOP = 48;
    const goopColor = 0x0a0a0a;
    const tops = [
      scene.add.rectangle(W / 2, GOOP / 2, W, GOOP, goopColor, 0.85).setDepth(5),
      scene.add.rectangle(W / 2, H - GOOP / 2, W, GOOP, goopColor, 0.85).setDepth(5),
      scene.add.rectangle(GOOP / 2, H / 2, GOOP, H, goopColor, 0.85).setDepth(5),
      scene.add.rectangle(W - GOOP / 2, H / 2, GOOP, H, goopColor, 0.85).setDepth(5),
    ];
    this.silenceWatchGoopRects = tops;
    // Scatter eyes along inner border
    this.silenceWatchEyes = [];
    for (let ei = 0; ei < 18; ei++) {
      const edge = Math.floor(Math.random() * 4);
      let ex = 0, ey = 0;
      if (edge === 0) { ex = Phaser.Math.Between(60, W - 60); ey = Phaser.Math.Between(10, GOOP - 10); }
      else if (edge === 1) { ex = Phaser.Math.Between(60, W - 60); ey = Phaser.Math.Between(H - GOOP + 10, H - 10); }
      else if (edge === 2) { ex = Phaser.Math.Between(10, GOOP - 10); ey = Phaser.Math.Between(60, H - 60); }
      else { ex = Phaser.Math.Between(W - GOOP + 10, W - 10); ey = Phaser.Math.Between(60, H - 60); }
      const eyeImg = scene.add.image(ex, ey, 'eye-silence').setDepth(6).setScale(1.2 + Math.random() * 0.8);
      scene.tweens.add({ targets: eyeImg, scaleX: `+=${(Math.random() - 0.5) * 0.3}`, scaleY: `+=${(Math.random() - 0.5) * 0.3}`, yoyo: true, repeat: -1, duration: 600 + Math.random() * 400 });
      this.silenceWatchEyes.push(eyeImg);
    }
    this.arena.showFloatingText(player.x, player.y - 40, '👁 They Watch...', '#330044');
  }

  /** Player: Fire a Watch tendril toward cursor */
  doWatchTendril(tx: number, ty: number, owner: 'player' | 'npc'): void {
    if (owner !== 'player') return; // NPC has no watch tendril
    const { scene, npc } = this.arena;
    const W = this.arena.width;
    const H = this.arena.height;
    const GOOP = 48;
    const candidates = [
      { x: tx < W / 2 ? GOOP : W - GOOP, y: ty },
      { x: tx, y: ty < H / 2 ? GOOP : H - GOOP },
    ];
    const origin = candidates.sort((a, b) =>
      Phaser.Math.Distance.Between(a.x, a.y, tx, ty) - Phaser.Math.Distance.Between(b.x, b.y, tx, ty),
    )[0];
    const gOuter = scene.add.graphics().setDepth(12);
    gOuter.lineStyle(18, 0x660099, 0.35);
    gOuter.beginPath(); gOuter.moveTo(origin.x, origin.y); gOuter.lineTo(tx, ty); gOuter.strokePath();
    const gMid = scene.add.graphics().setDepth(13);
    gMid.lineStyle(8, 0xaa00ff, 0.8);
    gMid.beginPath(); gMid.moveTo(origin.x, origin.y); gMid.lineTo(tx, ty); gMid.strokePath();
    const gCore = scene.add.graphics().setDepth(14);
    gCore.lineStyle(3, 0xeeccff, 1.0);
    gCore.beginPath(); gCore.moveTo(origin.x, origin.y); gCore.lineTo(tx, ty); gCore.strokePath();
    const flash = scene.add.circle(tx, ty, 22, 0xcc44ff, 0.85).setDepth(15);
    scene.tweens.add({ targets: [gOuter, gMid, gCore, flash], alpha: 0, duration: 500, onComplete: () => {
      gOuter.destroy(); gMid.destroy(); gCore.destroy(); flash.destroy();
    }});
    if (Phaser.Math.Distance.Between(tx, ty, npc.x, npc.y) <= 70) {
      npc.takeDamage(10);
      this.arena.spawnHitFlash(npc.x, npc.y, 0x660088);
      this.arena.showFloatingText(npc.x, npc.y - 20, '👁 10', '#cc66ff');
    }
  }

  /** Player/NPC: Machete sweep */
  doMachete(angleRad: number, owner: 'player' | 'npc'): void {
    const { scene, player, npc } = this.arena;
    const RANGE = 80;
    if (owner === 'player') {
      for (const t of this.arena.enemies) {
        if (!t.active || t.hp <= 0) continue;
        const dist2t = Phaser.Math.Distance.Between(player.x, player.y, t.x, t.y);
        if (dist2t <= RANGE) {
          const angleDiff = Math.abs(Phaser.Math.Angle.ShortestBetween(
            Phaser.Math.RadToDeg(angleRad),
            Phaser.Math.RadToDeg(Math.atan2(t.y - player.y, t.x - player.x)),
          ));
          if (angleDiff <= 45) {
            t.takeDamage(14);
            this.arena.spawnHitFlash(t.x, t.y, 0xffcc88);
          }
        }
      }
      const g = scene.add.graphics().setDepth(9);
      g.lineStyle(4, 0xccaa88, 0.85);
      g.beginPath();
      g.arc(player.x, player.y, 55, angleRad - Math.PI / 4, angleRad + Math.PI / 4);
      g.strokePath();
      scene.tweens.add({ targets: g, alpha: 0, duration: 180, onComplete: () => g.destroy() });
    } else {
      // NPC
      const dist2player = Phaser.Math.Distance.Between(npc.x, npc.y, player.x, player.y);
      if (dist2player <= RANGE) {
        const angleDiff = Math.abs(Phaser.Math.Angle.ShortestBetween(
          Phaser.Math.RadToDeg(angleRad),
          Phaser.Math.RadToDeg(Math.atan2(player.y - npc.y, player.x - npc.x)),
        ));
        if (angleDiff <= 45) {
          player.takeDamage(14);
          this.arena.spawnHitFlash(player.x, player.y, 0xffcc88);
        }
      }
      const g = scene.add.graphics().setDepth(9);
      g.lineStyle(4, 0xccaa88, 0.85);
      g.beginPath();
      g.arc(npc.x, npc.y, 55, angleRad - Math.PI / 4, angleRad + Math.PI / 4);
      g.strokePath();
      scene.tweens.add({ targets: g, alpha: 0, duration: 180, onComplete: () => g.destroy() });
    }
  }

  /** Player/NPC: Throw Meat Hook */
  doThrowHook(angleRad: number, owner: 'player' | 'npc'): void {
    const { scene, projectiles, player, npc } = this.arena;
    if (owner === 'player') {
      if (this.silenceHookConnected) return;
      const speed = 550;
      const proj = new Projectile(scene, player.x, player.y, 'proj-silence-hook', 8, true);
      projectiles.add(proj);
      proj.launch(Math.cos(angleRad) * speed, Math.sin(angleRad) * speed);
      this.silenceHookProj = proj;
      scene.time.delayedCall(1200, () => {
        if (proj.active) {
          proj.setActive(false).setVisible(false);
          (proj.body as Phaser.Physics.Arcade.Body).stop();
          this.silenceHookProj = null;
        }
      });
    } else {
      // NPC
      if (this.npcSilenceHookConnected) return;
      const speed = 400;
      const proj = new Projectile(scene, npc.x, npc.y, 'proj-silence-hook', 8, false);
      projectiles.add(proj);
      proj.launch(Math.cos(angleRad) * speed, Math.sin(angleRad) * speed);
      scene.time.delayedCall(800, () => {
        if (proj.active) {
          proj.setActive(false).setVisible(false);
          (proj.body as Phaser.Physics.Arcade.Body).stop();
        }
      });
    }
  }

  /** Player: Yank hooked target to player */
  doYankHook(owner: 'player' | 'npc'): void {
    if (owner === 'player') {
      if (!this.silenceHookConnected) return;
      this.silenceHookConnected = false;
      // Per-frame update steers NPC all the way to player; 2s safety cap
      this.silenceNpcYankUntil = this.arena.scene.time.now + 2000;
      this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 30, '🪝 Yanked!', '#cc9933');
    } else {
      // NPC yank: immediately shove player toward NPC
      if (!this.npcSilenceHookConnected) return;
      this.npcSilenceHookConnected = false;
      const { player, npc } = this.arena;
      const dx3 = npc.x - player.x, dy3 = npc.y - player.y;
      const len3 = Math.sqrt(dx3 * dx3 + dy3 * dy3) || 1;
      (player.body as Phaser.Physics.Arcade.Body).setVelocity((dx3 / len3) * 900, (dy3 / len3) * 900);
      this.arena.setPlayerYankUntil(this.arena.scene.time.now + 2000);
      this.arena.scene.time.delayedCall(250, () => {
        if (player.active) (player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      });
    }
  }

  /** Player/NPC: Mortal Wound — 1.5s windup, telegraph, then 5-slash or miss penalty */
  doMortalWound(angleRad: number, owner: 'player' | 'npc'): void {
    const { scene, player, npc } = this.arena;
    if (owner === 'player') {
      if (!this.silenceSlasherActive) return;
      const pBody = player.body as Phaser.Physics.Arcade.Body;
      pBody.setVelocity(0, 0);
      this.arena.applyPlayerSpeedMult(0);
      this.silenceMortalWindupUntil = scene.time.now + 1500;
      // Telegraph rectangle
      if (this.silenceMortalTelegraph) this.silenceMortalTelegraph.destroy();
      this.silenceMortalTelegraph = scene.add.rectangle(
        player.x + Math.cos(angleRad) * 100,
        player.y + Math.sin(angleRad) * 100,
        200, 50, 0xff6644, 0.4,
      ).setRotation(angleRad).setDepth(3);
      scene.time.delayedCall(1500, () => {
        if (!player.active) return;
        if (this.silenceMortalTelegraph) { this.silenceMortalTelegraph.destroy(); this.silenceMortalTelegraph = null; }
        this.silenceMortalWindupUntil = 0;
        // OBB hit test (inflate by 25px)
        const dist = Phaser.Math.Distance.Between(player.x, player.y, npc.x, npc.y);
        const hitW = 200 + 50, hitH = 50 + 50;
        const relX = npc.x - player.x;
        const relY = npc.y - player.y;
        const localX = relX * Math.cos(-angleRad) - relY * Math.sin(-angleRad);
        const localY = relX * Math.sin(-angleRad) + relY * Math.cos(-angleRad);
        const hit = dist < 250 && Math.abs(localX) < hitW / 2 && Math.abs(localY) < hitH / 2;
        if (hit) {
          // 5 teleport-slashes at 150ms intervals
          let step = 0;
          const doSlash = () => {
            if (!player.active || !npc.active || step >= 5) return;
            const offX = (Math.random() - 0.5) * 50;
            const offY = (Math.random() - 0.5) * 50;
            (player.body as Phaser.Physics.Arcade.Body).reset(npc.x + offX, npc.y + offY);
            player.isInvincible = true;
            npc.takeDamage(8);
            this.arena.spawnHitFlash(npc.x, npc.y, 0xff2200);
            this.arena.showFloatingText(npc.x, npc.y - 25, '💀 -8', '#ff2200');
            const arc = scene.add.graphics().setDepth(9);
            arc.lineStyle(3, 0xff2200, 0.9);
            arc.strokeCircle(npc.x, npc.y, 20 + step * 8);
            scene.tweens.add({ targets: arc, alpha: 0, duration: 300, onComplete: () => arc.destroy() });
            step++;
            scene.time.delayedCall(150, doSlash);
          };
          doSlash();
          scene.time.delayedCall(750, () => {
            if (player.active) player.isInvincible = false;
            // R+: apply heal-stop and red bonus pip after slash sequence
            if (this.arena.hasUpgrade('r')) {
              npc.healStopUntil = Math.max(npc.healStopUntil, scene.time.now + 10000);
              this.arena.showFloatingText(npc.x, npc.y - 45, '🩸 Heal Stopped!', '#ff3333');
              if (!this.silenceRedBonusHp) {
                this.silenceRedBonusHp = true;
                const redPip = scene.add.circle(0, 0, 5, 0xff2222, 0.9).setDepth(15);
                this.silenceRedBonusPip = redPip;
                this.arena.showFloatingText(player.x, player.y - 40, '❤ Red Pip!', '#ff2222');
              }
            }
          });
        } else {
          // Miss penalty
          this.silenceMortalSelfSlowUntil = scene.time.now + 2000;
          this.arena.showFloatingText(player.x, player.y - 35, '💢 Missed!', '#ff6644');
        }
      });
    } else {
      // NPC version: instant 5-slash if close enough (no windup for AI)
      if (Phaser.Math.Distance.Between(npc.x, npc.y, player.x, player.y) < 140) {
        npc.isInvincible = true;
        scene.time.delayedCall(750, () => { if (npc.active) npc.isInvincible = false; });
        let step = 0;
        const doSlash = () => {
          if (!npc.active || !player.active || step >= 5) return;
          const offX = (Math.random() - 0.5) * 50;
          const offY = (Math.random() - 0.5) * 50;
          (npc.body as Phaser.Physics.Arcade.Body).reset(player.x + offX, player.y + offY);
          player.takeDamage(8);
          this.arena.spawnHitFlash(player.x, player.y, 0xff2200);
          step++;
          scene.time.delayedCall(150, doSlash);
        };
        doSlash();
      }
    }
  }

  /** Player: Slash Em Up — 5 teleport-slashes */
  doSlashEmUp(owner: 'player' | 'npc'): void {
    const { scene, player, npc } = this.arena;
    const W = this.arena.width;
    const H = this.arena.height;
    if (owner === 'player') {
      if (this.silenceSlashEmUpActive) return;
      this.silenceSlashEmUpActive = true;
      this.silenceSlashEmUpStep = 0;
      player.isInvincible = true;
      // Screen tint
      if (this.silenceSlashEmUpFilter) this.silenceSlashEmUpFilter.destroy();
      this.silenceSlashEmUpFilter = scene.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.45).setDepth(50);
      // Spawn trees along border
      for (const t of this.silenceSlashEmUpTrees) t.destroy();
      this.silenceSlashEmUpTrees = [];
      for (let ti = 0; ti < 5; ti++) {
        const edge = Math.floor(Math.random() * 4);
        let tx2 = 0, ty2 = 0;
        if (edge === 0) { tx2 = Phaser.Math.Between(50, W - 50); ty2 = 50; }
        else if (edge === 1) { tx2 = W - 50; ty2 = Phaser.Math.Between(50, H - 80); }
        else if (edge === 2) { tx2 = Phaser.Math.Between(50, W - 50); ty2 = H - 80; }
        else { tx2 = 50; ty2 = Phaser.Math.Between(50, H - 80); }
        const tree = scene.add.image(tx2, ty2, 'tree-silence').setDepth(6);
        this.silenceSlashEmUpTrees.push(tree);
      }
      // 5 sequential teleport-slashes
      for (let si = 0; si < 5; si++) {
        scene.time.delayedCall(si * 1000, () => {
          if (!player.active || !this.silenceSlashEmUpActive) return;
          const tree = this.silenceSlashEmUpTrees[si % this.silenceSlashEmUpTrees.length];
          player.setPosition(tree.x, tree.y);
          scene.time.delayedCall(200, () => {
            if (!player.active) return;
            player.setPosition(npc.x + (Math.random() - 0.5) * 30, npc.y + (Math.random() - 0.5) * 30);
            const slashDist = Phaser.Math.Distance.Between(player.x, player.y, npc.x, npc.y);
            if (slashDist <= 80) {
              npc.takeDamage(10);
              this.arena.spawnHitFlash(npc.x, npc.y, 0x884422);
            }
            const arc = scene.add.circle(player.x, player.y, 20, 0xccaa88, 0.75).setDepth(9);
            scene.tweens.add({ targets: arc, scaleX: 3, scaleY: 0.7, alpha: 0, duration: 240, onComplete: () => arc.destroy() });
          });
        });
      }
      // Cleanup after 5 seconds (or hand off to Q+ impale flow)
      scene.time.delayedCall(5200, () => {
        this.silenceSlashEmUpActive = false;
        for (const t of this.silenceSlashEmUpTrees) t.destroy();
        this.silenceSlashEmUpTrees = [];
        if (this.silenceSlashEmUpFilter) { this.silenceSlashEmUpFilter.destroy(); this.silenceSlashEmUpFilter = null; }
        if (this.arena.hasUpgrade('q') && player.active && npc.active) {
          // Q+: impale above-lock (1500ms follow above npc, then sparkle window)
          this.silenceImpaleReady = true;
          this.silenceImpaleAboveUntil = scene.time.now + 1500;
          this.arena.showFloatingText(player.x, player.y - 40, '⬆ Above lock!', '#ffee00');
        } else {
          player.isInvincible = false;
        }
      });
    } else {
      // NPC Slash Em Up: 5 teleport-slashes at player position
      npc.isInvincible = true;
      const npcTreePositions: { x: number; y: number }[] = [];
      const sW = W, sH = H;
      for (let si = 0; si < 5; si++) {
        const edge = Math.floor(Math.random() * 4);
        let tx = 0, ty = 0;
        if (edge === 0) { tx = Phaser.Math.Between(40, sW - 40); ty = 40; }
        else if (edge === 1) { tx = sW - 40; ty = Phaser.Math.Between(40, sH - 40); }
        else if (edge === 2) { tx = Phaser.Math.Between(40, sW - 40); ty = sH - 100; }
        else { tx = 40; ty = Phaser.Math.Between(40, sH - 40); }
        npcTreePositions.push({ x: tx, y: ty });
      }
      for (let si = 0; si < 5; si++) {
        scene.time.delayedCall(si * 1000, () => {
          if (!npc.active) return;
          const pos = npcTreePositions[si % npcTreePositions.length];
          npc.setPosition(pos.x, pos.y);
          scene.time.delayedCall(200, () => {
            if (!npc.active) return;
            npc.setPosition(player.x + (Math.random() - 0.5) * 40, player.y + (Math.random() - 0.5) * 40);
            const dist3 = Phaser.Math.Distance.Between(npc.x, npc.y, player.x, player.y);
            if (dist3 <= 60) {
              player.takeDamage(10);
              this.arena.spawnHitFlash(player.x, player.y, 0x884422);
            }
          });
        });
      }
      scene.time.delayedCall(5100, () => {
        if (npc.active) npc.isInvincible = false;
      });
    }
  }

  /** NPC: Fade — brief invincibility + proximity AOE */
  doNpcStartFade(): void {
    const { scene, npc, player } = this.arena;
    npc.isInvincible = true;
    npc.setAlpha(0.12);
    scene.time.delayedCall(500, () => {
      if (!npc.active) return;
      npc.isInvincible = false;
      npc.setAlpha(1);
      if (Phaser.Math.Distance.Between(npc.x, npc.y, player.x, player.y) <= 100) {
        player.takeDamage(12);
        this.arena.spawnHitFlash(player.x, player.y, 0x440066);
      }
      const burst = scene.add.circle(npc.x, npc.y, 10, 0x440066, 0.8).setDepth(8);
      scene.tweens.add({ targets: burst, scaleX: 9, scaleY: 9, alpha: 0, duration: 350, onComplete: () => burst.destroy() });
    });
  }

  /** Player: Cast Don't Look cone */
  doCastDontLook(angleRad: number, owner: 'player' | 'npc'): void {
    const { scene } = this.arena;
    if (owner === 'player') {
      if (this.silenceConeGraphic) this.silenceConeGraphic.destroy();
      this.silenceConeAngle = angleRad;
      this.silenceConeExpiry = scene.time.now + 5000;
      this.silenceConeContinuousStart = scene.time.now;
      this.silenceConeTickAccum = 0;
      this.silenceConeGraphic = scene.add.graphics().setDepth(4);
      this.drawSilenceCone(this.silenceConeGraphic, this.arena.player.x, this.arena.player.y, this.silenceConeAngle);
    } else {
      if (this.npcSilenceConeGraphic) this.npcSilenceConeGraphic.destroy();
      this.npcSilenceConeAngle = angleRad;
      this.npcSilenceConeExpiry = scene.time.now + 5000;
      this.npcSilenceConeContinuousStart = scene.time.now;
      this.npcSilenceConeTickAccum = 0;
      this.npcSilenceConeGraphic = scene.add.graphics().setDepth(4);
      this.drawSilenceCone(this.npcSilenceConeGraphic, this.arena.npc.x, this.arena.npc.y, this.npcSilenceConeAngle);
    }
  }

  // ── Projectile hit callbacks ───────────────────────────────────────

  /** Called when proj-silence-eye hits an enemy (NPC or CorruptedBase). */
  onSilenceEyeHitEnemy(proj: Projectile, owner: 'player' | 'npc'): void {
    if (owner === 'player') {
      this.silencePossessedUntil = this.arena.scene.time.now + 8000;
      this.arena.showFloatingText(this.arena.npc.x, this.arena.npc.y - 30, '👁 Possessed!', '#cc66ff');
      const eyeFlash = this.arena.scene.add.circle(this.arena.npc.x, this.arena.npc.y, 16, 0x660088, 0.8).setDepth(9);
      this.arena.scene.tweens.add({ targets: eyeFlash, scaleX: 3, scaleY: 3, alpha: 0, duration: 400, onComplete: () => eyeFlash.destroy() });
      // R+: spawn voodoo doll at hit location
      if (this.arena.hasUpgrade('r')) {
        if (this.silenceVoodooDoll) this.silenceVoodooDoll.destroy();
        this.silenceVoodooDoll = this.arena.scene.add.image(this.arena.npc.x, this.arena.npc.y, 'doll-silence').setDepth(11);
        this.silenceVoodooX = this.arena.npc.x;
        this.silenceVoodooY = this.arena.npc.y;
        this.silenceVoodooActive = true;
        this.arena.showFloatingText(this.arena.npc.x, this.arena.npc.y - 50, '🪆 Voodoo Doll!', '#cc44ff');
      }
    } else {
      this.arena.npc.silencePossessedUntil = this.arena.scene.time.now + 8000;
      this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 30, '👁 Possessed!', '#cc66ff');
    }
    proj.setActive(false).setVisible(false);
    (proj.body as Phaser.Physics.Arcade.Body).stop();
  }

  /** Called when proj-silence-hook hits an enemy. */
  onSilenceHookHitEnemy(proj: Projectile, owner: 'player' | 'npc'): void {
    if (owner === 'player') {
      this.silenceHookConnected = true;
      this.silenceHookTarget = this.arena.npc;
      this.silenceHookWindowExpiry = this.arena.scene.time.now + 5000;
      this.silenceHookProj = null;
      this.arena.showFloatingText(this.arena.npc.x, this.arena.npc.y - 20, '🪝 Hooked!', '#cc9933');
      this.arena.npc.takeDamage(8);
      this.arena.spawnHitFlash(this.arena.npc.x, this.arena.npc.y, 0xaa7733);
    } else {
      this.npcSilenceHookConnected = true;
      this.arena.player.takeDamage(8);
      this.arena.spawnHitFlash(proj.x, proj.y, 0xaa7733);
    }
    proj.setActive(false).setVisible(false);
    (proj.body as Phaser.Physics.Arcade.Body).stop();
  }

  /** Called when proj-silence-eye hits a CorruptedBase (invasion). */
  onSilenceEyeHitCorrupted(proj: Projectile, cx: number, cy: number): void {
    this.silencePossessedUntil = this.arena.scene.time.now + 8000;
    this.arena.showFloatingText(cx, cy - 30, '👁 Possessed!', '#cc66ff');
    const eyeFlash = this.arena.scene.add.circle(cx, cy, 16, 0x660088, 0.8).setDepth(9);
    this.arena.scene.tweens.add({ targets: eyeFlash, scaleX: 3, scaleY: 3, alpha: 0, duration: 400, onComplete: () => eyeFlash.destroy() });
    proj.setActive(false).setVisible(false);
    (proj.body as Phaser.Physics.Arcade.Body).stop();
  }

  /** Called when proj-silence-hook hits a CorruptedBase (invasion). */
  onSilenceHookHitCorrupted(proj: Projectile, target: Fighter, cx: number, cy: number): void {
    this.silenceHookConnected = true;
    this.silenceHookTarget = target;
    this.silenceHookWindowExpiry = this.arena.scene.time.now + 5000;
    this.silenceHookProj = null;
    this.arena.showFloatingText(cx, cy - 20, '🪝 Hooked!', '#cc9933');
    this.arena.spawnHitFlash(cx, cy, 0xaa7733);
    proj.setActive(false).setVisible(false);
    (proj.body as Phaser.Physics.Arcade.Body).stop();
  }

  // ── NPC cast-id reactions ──────────────────────────────────────────

  /** Call from ArenaScene's npcCastId block for silence cast IDs.
   *
   *  NOTE: 'silence-thriller' is intentionally NOT handled here because
   *  buildNpcContext.silenceEnterSlasher() already runs the full enter-slasher
   *  logic (flags, tint, scale, damageAbsorber, mask, burst) when the NPC casts
   *  the ability. The ArenaScene npcCastId block for that ID is legacy duplication.
   */
  handleNpcCastId(npcCastId: string | null, time: number): void {
    if (!npcCastId) return;

    if (npcCastId === 'silence-retire' || npcCastId === 'silence-thriller-exit') {
      this.doExitSlasher(true, 'npc');
      const npc = this.arena.npc;
      const sRevert = this.arena.scene.add.circle(npc.x, npc.y, 20, 0x330033, 0.7).setDepth(8);
      this.arena.scene.tweens.add({ targets: sRevert, scaleX: 2.5, scaleY: 2.5, alpha: 0, duration: 300, onComplete: () => sRevert.destroy() });
    }
    if (npcCastId === 'silence-slash-em-up') {
      this.doSlashEmUp('npc');
    }
    if (npcCastId === 'silence-dont-look') {
      const { player, npc } = this.arena;
      if (this.npcSilenceConeGraphic) this.npcSilenceConeGraphic.destroy();
      const dx2 = player.x - npc.x, dy2 = player.y - npc.y;
      this.npcSilenceConeAngle = Math.atan2(dy2, dx2);
      this.npcSilenceConeExpiry = time + 5000;
      this.npcSilenceConeContinuousStart = time;
      this.npcSilenceConeTickAccum = 0;
      this.npcSilenceConeGraphic = this.arena.scene.add.graphics().setDepth(4);
      this.drawSilenceCone(this.npcSilenceConeGraphic, npc.x, npc.y, this.npcSilenceConeAngle);
    }
    if (npcCastId === 'silence-meat-hook-yank') {
      this.npcSilenceHookConnected = false;
      // Per-frame code steers player toward NPC via setPlayerYankUntil
      this.arena.setPlayerYankUntil(this.arena.scene.time.now + 2000);
    }
  }

  // ── Input handler ──────────────────────────────────────────────────

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    const { eKey, fKey, rKey, qKey, pointerWasDown, player, scene } = this.arena;
    const playerCtx = this.arena.buildPlayerContext(mouseX, mouseY);

    if (!this.silenceSlasherActive && !this.silenceWatchChanneling) {
      // ── Normal horror kit ─────────────────────────────────────────
      // Click: Fade (hold to charge fear, release to AOE)
      if (pointer.isDown && !this.silenceFearCharging) {
        this.silenceFearCharging = true;
        this.silenceFear = 0;
        player.setAlpha(0.08);
      }
      if (!pointer.isDown && this.silenceFearCharging) {
        this.silenceFearCharging = false;
        player.setAlpha(1);
        if (player.getCooldownRatio('silence-fade') >= 1) {
          player.triggerCooldown('silence-fade');
          const baseDmg = 8;
          const bonusDmg = Math.round(this.silenceFear * 0.04);
          const totalDmg = baseDmg + bonusDmg;
          let hit = false;
          for (const t of this.arena.enemies) {
            if (!t.active || t.hp <= 0) continue;
            if (Phaser.Math.Distance.Between(player.x, player.y, t.x, t.y) <= 90) {
              t.takeDamage(totalDmg);
              this.arena.spawnHitFlash(t.x, t.y, 0x440066);
              hit = true;
            }
          }
          if (hit) this.arena.showFloatingText(player.x, player.y - 30, `👁 ${totalDmg} fear!`, '#cc88ff');
          const burst = this.arena.scene.add.circle(player.x, player.y, 10, 0x440066, 0.8).setDepth(8);
          this.arena.scene.tweens.add({ targets: burst, scaleX: 9, scaleY: 9, alpha: 0, duration: 350, onComplete: () => burst.destroy() });
        }
        this.silenceFear = 0;
      }
      // Click+: Fear Blast (Space at >50% fear)
      if (this.arena.hasUpgrade('click') && this.silenceFear > 250 && !this.silenceFearCharging) {
        const spaceKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        if (Phaser.Input.Keyboard.JustDown(spaceKey) && player.getCooldownRatio('silence-fade') >= 1) {
          player.triggerCooldown('silence-fade');
          this.arena.showFloatingText(player.x, player.y - 40, '😱 FEAR BLAST', '#cc44ff');
          for (const t of this.arena.enemies) {
            if (!t.active || t.hp <= 0) continue;
            if (Phaser.Math.Distance.Between(player.x, player.y, t.x, t.y) <= 160) {
              t.forceRetreatUntil = time + 3000;
              this.arena.spawnHitFlash(t.x, t.y, 0x9900cc);
            }
          }
          this.silenceFear = 0;
          const burst = scene.add.circle(player.x, player.y, 10, 0x9900cc, 0.7).setDepth(8);
          scene.tweens.add({ targets: burst, scaleX: 16, scaleY: 16, alpha: 0, duration: 400, onComplete: () => burst.destroy() });
        }
      }
      // E: DON'T LOOK
      if (Phaser.Input.Keyboard.JustDown(eKey)) {
        const dx = mouseX - player.x, dy = mouseY - player.y;
        if (player.castAbility('silence-dont-look', playerCtx)) {
          void (dx + dy);
        }
      }
      // R: Possess
      if (Phaser.Input.Keyboard.JustDown(rKey)) {
        player.castAbility('silence-possess', playerCtx);
      }
      // F: Thriller → enter slasher
      if (Phaser.Input.Keyboard.JustDown(fKey) && !this.silenceFQPermanentlyLocked) {
        if (player.getCooldownRatio('silence-thriller') >= 1) {
          playerCtx.silenceEnterSlasher();
          this.silenceSlasherFConsumed = true;
        }
      }
      // Q: They Watch (blocked if FQ locked)
      if (Phaser.Input.Keyboard.JustDown(qKey) && !this.silenceFQPermanentlyLocked) {
        player.castAbility('silence-watch', playerCtx);
      }
    } else if (this.silenceWatchChanneling) {
      // ── They Watch channel — click (tendril), or Q+ goop ─────────
      if (pointer.isDown && !pointerWasDown) {
        // Q+ impale click check
        if (this.silenceImpaleReady && time < this.silenceImpaleWindowUntil) {
          this.doImpaleSlam();
        } else if (!this.silenceGoopFormActive) {
          const now = time;
          if (now >= this.silenceWatchTendrilCd) {
            playerCtx.silenceWatchTendril(mouseX, mouseY);
            this.silenceWatchTendrilCd = now + 2000;
          }
        }
      }
    } else {
      // ── Slasher kit ───────────────────────────────────────────────
      // Click: Machete (click+ = charge)
      if (this.arena.hasUpgrade('click')) {
        if (pointer.isDown && !pointerWasDown && !this.silenceMacheteCharging) {
          this.silenceMacheteCharging = true;
          this.silenceMacheteChargeStart = time;
        }
        if (!pointer.isDown && this.silenceMacheteCharging) {
          this.silenceMacheteCharging = false;
          const chargeMs = time - this.silenceMacheteChargeStart;
          const extraDmg = Math.min(chargeMs / 1000, 2) * 14;
          const totalDmg = Math.round(14 + extraDmg);
          const npc = this.arena.npc;
          const dist = Phaser.Math.Distance.Between(player.x, player.y, npc.x, npc.y);
          if (dist <= 80) {
            npc.takeDamage(totalDmg);
            this.arena.spawnHitFlash(npc.x, npc.y, 0xcc0000);
            const glow = chargeMs > 500 ? 0xff6600 : 0xcc4400;
            const arc = scene.add.graphics().setDepth(9);
            arc.lineStyle(3 + Math.min(chargeMs / 500, 4), glow, 0.9);
            arc.strokeCircle(npc.x, npc.y, 16 + Math.min(chargeMs / 200, 20));
            scene.tweens.add({ targets: arc, alpha: 0, duration: 350, onComplete: () => arc.destroy() });
          }
          player.triggerCooldown('silence-machete');
        }
      } else {
        if (pointer.isDown && !pointerWasDown) {
          player.castAbility('silence-machete', playerCtx);
        }
      }
      // E: Meat Hook / Yank / Slam (E+)
      if (Phaser.Input.Keyboard.JustDown(eKey)) {
        if (this.silenceHookSlamReady && this.arena.hasUpgrade('e')) {
          // Slam
          const npc = this.arena.npc;
          npc.takeDamage(12);
          npc.earthStunnedUntil = time + 1000;
          this.arena.spawnHitFlash(npc.x, npc.y, 0xff4400);
          this.arena.showFloatingText(npc.x, npc.y - 30, '💥 SLAM', '#ff4400');
          this.silenceHookSlamReady = false;
          this.silenceHookConnected = false;
          player.triggerCooldown('silence-meat-hook');
        } else if (this.silenceHookConnected && time < this.silenceHookWindowExpiry) {
          playerCtx.silenceYankHook();
          if (this.arena.hasUpgrade('e')) this.silenceHookSlamReady = true;
        } else {
          player.castAbility('silence-meat-hook', playerCtx);
          this.silenceHookSlamReady = false;
        }
      }
      // R: Mortal Wound
      if (Phaser.Input.Keyboard.JustDown(rKey) && time >= this.silenceMortalWindupUntil) {
        player.castAbility('silence-mortal-wound', playerCtx);
      }
      // F: Retire (hold ≥ 800ms = F+ Abandon; tap = regular retire)
      // Clear the entry-consumed flag once F is fully released after entering slasher
      if (this.silenceSlasherFConsumed && !fKey.isDown) this.silenceSlasherFConsumed = false;
      if (!this.silenceFQPermanentlyLocked && !this.silenceSlasherFConsumed) {
        if (this.arena.hasUpgrade('f')) {
          if (fKey.isDown) {
            if (this.silenceFHoldStart === 0) this.silenceFHoldStart = time;
            if (time - this.silenceFHoldStart >= 800) {
              this.silenceAbandon(playerCtx);
              this.silenceFHoldStart = 0;
            }
          } else {
            if (this.silenceFHoldStart > 0 && time - this.silenceFHoldStart < 800) {
              if (Phaser.Input.Keyboard.JustUp(fKey)) playerCtx.silenceExitSlasher(true);
            }
            if (!fKey.isDown) this.silenceFHoldStart = 0;
          }
        } else if (Phaser.Input.Keyboard.JustDown(fKey)) {
          playerCtx.silenceExitSlasher(true);
        }
      }
      // Q: Slash Em Up (blocked if FQ locked)
      if (Phaser.Input.Keyboard.JustDown(qKey) && !this.silenceFQPermanentlyLocked) {
        player.castAbility('silence-slash-em-up', playerCtx);
      }
    }
  }

  private silenceAbandon(ctx: CastContext): void {
    const { player, scene } = this.arena;
    // Exit slasher without HP loss
    player.damageAbsorber = null;
    if (this.silenceMaskSprite) { this.silenceMaskSprite.destroy(); this.silenceMaskSprite = null; }
    for (const p of this.silenceSlasherPips) p.destroy(); this.silenceSlasherPips = [];
    if (this.silenceRedBonusPip) { this.silenceRedBonusPip.destroy(); this.silenceRedBonusPip = null; }
    this.silenceRedBonusHp = false;
    this.silenceSlasherActive = false;
    this.silenceFQPermanentlyLocked = true;
    scene.time.delayedCall(0, () => { void ctx; }); // suppress unused warning
    this.arena.showFloatingText(player.x, player.y - 40, 'ABANDONED — F/Q LOCKED', '#ff4444');
  }

  private doImpaleSlam(): void {
    const { scene, player, npc } = this.arena;
    if (this.silenceImpaleSparkle) { this.silenceImpaleSparkle.destroy(); this.silenceImpaleSparkle = null; }
    this.silenceImpaleReady = false;
    this.silenceImpaleAboveUntil = 0;
    // Teleport to enemy, sword sprite, stun, bleed
    (player.body as Phaser.Physics.Arcade.Body).reset(npc.x, npc.y);
    const sword = scene.add.rectangle(npc.x, npc.y - 40, 4, 80, 0xdddddd).setDepth(10);
    scene.tweens.add({ targets: sword, alpha: 0, duration: 600, onComplete: () => sword.destroy() });
    npc.takeDamage(15);
    npc.earthStunnedUntil = scene.time.now + 2000;
    this.arena.spawnHitFlash(npc.x, npc.y, 0xdd0000);
    this.arena.showFloatingText(npc.x, npc.y - 40, '⚔ IMPALE!', '#dd0000');
    // Bleed every 250ms for 2s
    for (let bi = 0; bi < 8; bi++) {
      scene.time.delayedCall(bi * 250, () => {
        if (!npc.active) return;
        npc.takeDamage(3);
        this.arena.spawnHitFlash(npc.x, npc.y, 0xaa0000);
        const pool = scene.add.graphics().setDepth(2);
        pool.fillStyle(0x660000, 0.7);
        pool.fillEllipse(npc.x + (Math.random() - 0.5) * 20, npc.y + (Math.random() - 0.5) * 10, 12, 6);
        scene.tweens.add({ targets: pool, alpha: 0, delay: 3000, duration: 1000, onComplete: () => pool.destroy() });
      });
    }
    scene.time.delayedCall(2100, () => { if (player.active) player.isInvincible = false; });
  }

  // ── Per-frame update ───────────────────────────────────────────────

  update(time: number, delta: number, isPlayerSilence: boolean, isNpcSilence: boolean): void {
    const { scene, player, npc } = this.arena;

    // ── Player Silence per-frame ─────────────────────────────────────
    if (isPlayerSilence) {
      // Fear accumulation while holding click
      if (this.silenceFearCharging) {
        const nearestEnemy = this.arena.getNearestEnemy(player.x, player.y);
        const fadeDist = Phaser.Math.Distance.Between(player.x, player.y, nearestEnemy.x, nearestEnemy.y);
        const fadeFactor = Math.max(0, 1 - fadeDist / 500);
        const chargeRate = 20 + fadeFactor * fadeFactor * 280;
        this.silenceFear = Math.min(500, this.silenceFear + chargeRate * (delta / 1000));
        // Fear bar above player
        const BAR_W = 48; const BAR_H = 6; const BY = player.y - 46;
        if (!this.silenceFearBarBg) {
          this.silenceFearBarBg = scene.add.rectangle(player.x, BY, BAR_W, BAR_H, 0x220033, 0.85).setDepth(12).setOrigin(0.5, 0.5);
          this.silenceFearBarFill = scene.add.rectangle(player.x - BAR_W / 2, BY, 0, BAR_H, 0xcc44ff, 0.95).setDepth(13).setOrigin(0, 0.5);
        }
        const ratio = this.silenceFear / 500;
        this.silenceFearBarBg.setPosition(player.x, BY);
        this.silenceFearBarFill!.setPosition(player.x - BAR_W / 2, BY);
        this.silenceFearBarFill!.setSize(BAR_W * ratio, BAR_H);
      } else if (this.silenceFearBarBg) {
        this.silenceFearBarBg.destroy(); this.silenceFearBarBg = null;
        this.silenceFearBarFill!.destroy(); this.silenceFearBarFill = null;
      }

      // Possess: mirror player velocity to all enemies
      if (time < this.silencePossessedUntil) {
        const pb = player.body as Phaser.Physics.Arcade.Body;
        for (const t of this.arena.enemies) {
          if (!t.active || t.hp <= 0) continue;
          (t.body as Phaser.Physics.Arcade.Body).setVelocity(pb.velocity.x, pb.velocity.y);
        }
      }

      // Yank: steer hooked target toward player each frame
      if (time < this.silenceNpcYankUntil && this.silenceHookTarget) {
        const ht = this.silenceHookTarget;
        if (!ht.active || ht.hp <= 0) {
          this.silenceNpcYankUntil = 0;
          this.silenceHookTarget = null;
        } else {
          const ydx = player.x - ht.x, ydy = player.y - ht.y;
          const ydist = Math.sqrt(ydx * ydx + ydy * ydy);
          if (ydist <= 65) {
            this.silenceNpcYankUntil = 0;
            this.silenceHookTarget = null;
            (ht.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
          } else {
            (ht.body as Phaser.Physics.Arcade.Body).setVelocity((ydx / ydist) * 900, (ydy / ydist) * 900);
          }
        }
      }

      // DON'T LOOK cone processing (player's cone)
      if (this.silenceConeGraphic && this.silenceConeExpiry > 0) {
        const ptr = scene.input.activePointer;
        this.silenceConeAngle = Math.atan2(ptr.worldY - player.y, ptr.worldX - player.x);
        // E+: cone angle grows while enemies are in it
        const ePlus = this.arena.hasUpgrade('e');
        const coneHalfDeg = (ePlus ? this.silenceConeAngleGrown : 20) / 2;
        this.drawSilenceCone(this.silenceConeGraphic, player.x, player.y, this.silenceConeAngle, coneHalfDeg);
        const enemiesInCone = this.arena.enemies.filter(t =>
          t.active && t.hp > 0 &&
          this.isInSilenceCone(t.x, t.y, player.x, player.y, this.silenceConeAngle, coneHalfDeg),
        );
        if (enemiesInCone.length > 0) {
          // E+: grow cone angle up to 80°
          if (ePlus) {
            this.silenceConeAngleGrown = Math.min(80, this.silenceConeAngleGrown + 4 * (delta / 1000));
          }
          this.silenceConeTickAccum += delta;
          if (this.silenceConeTickAccum >= 250) {
            this.silenceConeTickAccum -= 250;
            for (const t of enemiesInCone) {
              t.takeDamage(2);
              this.arena.spawnHitFlash(t.x, t.y, 0x220033);
            }
          }
        } else {
          this.silenceConeTickAccum = 0;
          this.silenceConeContinuousStart = time;
          // E+: reset cone angle when enemy leaves
          if (ePlus) this.silenceConeAngleGrown = 20;
        }
        // Full 5s unbroken → stun all enemies currently in cone
        if (enemiesInCone.length > 0 && time - this.silenceConeContinuousStart >= 5000) {
          this.silenceConeExpiry = 0;
          if (this.silenceConeGraphic) { this.silenceConeGraphic.destroy(); this.silenceConeGraphic = null; }
          for (const t of enemiesInCone) {
            if (ePlus) {
              // E+: statue (broken by damage) instead of freeze
              t.statueUntil = time + 5000;
              this.arena.showFloatingText(t.x, t.y - 30, '🗿 STATUE', '#aaaaaa');
            } else {
              t.frozenUntil = Math.max(t.frozenUntil, time + 3000);
              const stunCirc = scene.add.circle(t.x, t.y, 20, 0x000022, 0.8).setDepth(9);
              scene.tweens.add({ targets: stunCirc, scaleX: 3, scaleY: 3, alpha: 0, duration: 400, onComplete: () => stunCirc.destroy() });
              this.arena.showFloatingText(t.x, t.y - 30, '⬛ Stunned!', '#8888ff');
            }
            if (ePlus) this.silenceConeAngleGrown = 20;
          }
        } else if (time >= this.silenceConeExpiry) {
          this.silenceConeGraphic.destroy();
          this.silenceConeGraphic = null;
          this.silenceConeExpiry = 0;
        }
      }

      // NPC statue lock: enforce zero velocity
      if (npc.statueUntil > time) {
        (npc.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      } else if (npc.statueUntil > 0 && npc.statueUntil <= time) {
        npc.statueUntil = 0;
      }

      // NPC force retreat (from Fear Blast)
      if (npc.forceRetreatUntil > time) {
        const dx = npc.x - player.x, dy = npc.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const spd = npc.speed;
        (npc.body as Phaser.Physics.Arcade.Body).setVelocity((dx / dist) * spd, (dy / dist) * spd);
      }

      // R+: Voodoo doll — per-frame projectile collision check
      if (this.silenceVoodooActive && this.silenceVoodooDoll && this.arena.hasUpgrade('r')) {
        const dollX = this.silenceVoodooX, dollY = this.silenceVoodooY;
        this.arena.projectiles.getChildren().forEach((go) => {
          const proj = go as unknown as { isFromPlayer?: boolean; active?: boolean; x: number; y: number; damage?: number; deactivate?: () => void };
          if (!proj.isFromPlayer || !proj.active) return;
          if (Phaser.Math.Distance.Between(proj.x, proj.y, dollX, dollY) < 20) {
            const dmg = Math.round((proj.damage ?? 10) * 1.2);
            npc.takeDamage(dmg);
            this.arena.showFloatingText(npc.x, npc.y - 40, '🪆 Voodoo!', '#cc44ff');
            if (this.silenceVoodooDoll) { this.silenceVoodooDoll.destroy(); this.silenceVoodooDoll = null; }
            this.silenceVoodooActive = false;
            if (typeof proj.deactivate === 'function') proj.deactivate();
          }
        });
      }

      // R+: Red bonus pip — follow player, speed bonus
      if (this.silenceRedBonusHp && this.silenceSlasherActive) {
        if (this.silenceRedBonusPip) {
          const pip = this.silenceRedBonusPip;
          const baseX = player.x - 60;
          pip.setPosition(baseX + (this.silenceSlasherPips.length) * 12, player.y - 52);
        }
        this.arena.applyPlayerSpeedMult(1.25);
      }

      // They Watch per-frame
      if (this.silenceWatchChanneling) {
        const qPlus = this.arena.hasUpgrade('q');
        // Q+: goop form
        if (qPlus) {
          if (!this.silenceGoopFormActive) {
            this.silenceGoopFormActive = true;
            player.setScale(2.5);
            player.setTexture('goop-silence-form');
          }
          // Allow slow movement in goop form
          this.arena.applyPlayerSpeedMult(0.3);
          // Cover check: player within 40px of npc for 2s
          if (Phaser.Math.Distance.Between(player.x, player.y, npc.x, npc.y) < 40) {
            if (this.silenceGoopCoverStart === 0) this.silenceGoopCoverStart = time;
            else if (time - this.silenceGoopCoverStart >= 2000 && !this.silenceEntombed) {
              this.silenceEntombed = true;
              npc.statueUntil = Number.MAX_SAFE_INTEGER;
              this.arena.showFloatingText(npc.x, npc.y - 40, 'ONE OF US', '#990000');
              // Cycle entomb texts every 2s
              const entombMessages = ['ONE OF US', 'WE SEE YOU', 'LET US IN'];
              let msgIdx = 0;
              const cycleEntomb = (): void => {
                if (!this.silenceEntombed) return;
                msgIdx = (msgIdx + 1) % entombMessages.length;
                const txt = scene.add.text(npc.x, npc.y - 40, entombMessages[msgIdx], {
                  fontSize: '18px', fontFamily: 'Arial', color: '#990000',
                }).setOrigin(0.5, 0.5).setDepth(30).setAlpha(0.9);
                this.silenceEntombTexts.push(txt);
                scene.time.delayedCall(2000, cycleEntomb);
              };
              scene.time.delayedCall(2000, cycleEntomb);
            }
          } else {
            this.silenceGoopCoverStart = 0;
          }
          // Entombed: keep npc statue-locked
          if (this.silenceEntombed) {
            npc.statueUntil = Number.MAX_SAFE_INTEGER;
            (npc.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
          }
        } else {
          // Base: full freeze
          (player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
        }
        const W3 = this.arena.width;
        const H3 = this.arena.height;
        const GOOP3 = 48;
        const npcOnGoop = npc.x < GOOP3 + 20 || npc.x > W3 - GOOP3 - 20 ||
                          npc.y < GOOP3 + 20 || npc.y > H3 - GOOP3 - 20;
        if (npcOnGoop && !this.silenceEntombed) {
          this.silenceWatchTickAccum += delta;
          if (this.silenceWatchTickAccum >= 250) {
            this.silenceWatchTickAccum -= 250;
            npc.takeDamage(2);
            this.arena.spawnHitFlash(npc.x, npc.y, 0x0a0a0a);
          }
        }
        if (time >= this.silenceWatchExpiry) {
          this.silenceWatchChanneling = false;
          player.isInvincible = false;
          // Q+: restore form
          if (this.silenceGoopFormActive) {
            this.silenceGoopFormActive = false;
            this.silenceGoopCoverStart = 0;
            player.setScale(1);
            player.setTexture('player');
            if (this.silenceEntombed) {
              this.silenceEntombed = false;
              npc.statueUntil = 0;
              for (const t of this.silenceEntombTexts) t.destroy();
              this.silenceEntombTexts = [];
            }
          }
          for (const r of this.silenceWatchGoopRects) r.destroy();
          this.silenceWatchGoopRects = [];
          for (const e of this.silenceWatchEyes) e.destroy();
          this.silenceWatchEyes = [];
        }
      }

      // Q+: impale above-lock — follow npc, show CLICK hint
      if (this.silenceImpaleAboveUntil > 0) {
        if (time < this.silenceImpaleAboveUntil) {
          (player.body as Phaser.Physics.Arcade.Body).reset(npc.x, npc.y - 60);
          this.arena.applyPlayerSpeedMult(0);
        } else if (this.silenceImpaleReady && this.silenceImpaleWindowUntil === 0) {
          // Start sparkle window
          this.silenceImpaleWindowUntil = time + 250;
          this.silenceImpaleAboveUntil = 0;
          if (!this.silenceImpaleSparkle) {
            const sparkle = scene.add.graphics().setDepth(15);
            this.silenceImpaleSparkle = sparkle;
            const COLORS = [0xffee00, 0xffffff, 0xff8800];
            const drawSparkle = (): void => {
              sparkle.clear();
              for (let si = 0; si < 8; si++) {
                const a = (si / 8) * Math.PI * 2 + scene.time.now * 0.01;
                const r2 = 16 + (si % 2) * 8;
                sparkle.fillStyle(COLORS[si % COLORS.length], 0.9);
                sparkle.fillCircle(npc.x + Math.cos(a) * r2, npc.y + Math.sin(a) * r2, 4);
              }
            };
            const sparkleTick = scene.time.addEvent({ delay: 30, loop: true, callback: drawSparkle });
            scene.time.delayedCall(250, () => {
              sparkleTick.remove();
              if (this.silenceImpaleSparkle) { this.silenceImpaleSparkle.destroy(); this.silenceImpaleSparkle = null; }
              if (this.silenceImpaleReady) {
                // Missed window — just restore invincibility
                this.silenceImpaleReady = false;
                if (player.active) player.isInvincible = false;
              }
              this.silenceImpaleWindowUntil = 0;
            });
          }
          this.arena.showFloatingText(npc.x, npc.y - 70, 'CLICK!', '#ffee00');
        } else if (time >= this.silenceImpaleAboveUntil) {
          this.silenceImpaleAboveUntil = 0;
          this.silenceImpaleReady = false;
        }
      }

      // Slasher pip overlay + mask: follow player position
      if (this.silenceMaskSprite) {
        this.silenceMaskSprite.setPosition(player.x, player.y - 4);
      }
      if (this.silenceSlasherPips.length > 0) {
        const pipSpacing = 12;
        const totalW = (this.silenceSlasherPips.length - 1) * pipSpacing;
        for (let pi = 0; pi < this.silenceSlasherPips.length; pi++) {
          this.silenceSlasherPips[pi].setPosition(
            player.x - totalW / 2 + pi * pipSpacing,
            player.y - 52,
          );
        }
      }

      // Hook window expiry
      if (this.silenceHookConnected && time > this.silenceHookWindowExpiry) {
        this.silenceHookConnected = false;
      }

      // Speed: slasher dread aura (applied via applyNpcSpeedMult), mortal wound windup lock, and miss slow
      if (this.silenceSlasherActive) {
        const silDist = Phaser.Math.Distance.Between(player.x, player.y, npc.x, npc.y);
        const AURA_RADIUS = 260;
        if (silDist <= AURA_RADIUS) {
          const t2 = 1 - silDist / AURA_RADIUS;
          this.arena.applyNpcSpeedMult(1 - t2 * 0.65);
        }
      }
      // Mortal wound windup: lock caster in place
      if (time < this.silenceMortalWindupUntil) {
        this.arena.applyPlayerSpeedMult(0);
        (player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
        // Move telegraph with player
        if (this.silenceMortalTelegraph) {
          const dir = this.silenceMortalTelegraph.rotation;
          this.silenceMortalTelegraph.setPosition(
            player.x + Math.cos(dir) * 100,
            player.y + Math.sin(dir) * 100,
          );
        }
      }
      // Miss slow
      if (time < this.silenceMortalSelfSlowUntil) {
        this.arena.applyPlayerSpeedMult(0.75);
      }
    }

    // ── NPC Silence per-frame ────────────────────────────────────────
    if (isNpcSilence) {
      // NPC DON'T LOOK cone (affects player)
      if (this.npcSilenceConeGraphic && this.npcSilenceConeExpiry > 0) {
        this.drawSilenceCone(this.npcSilenceConeGraphic, npc.x, npc.y, this.npcSilenceConeAngle);
        const playerInCone = this.isInSilenceCone(player.x, player.y, npc.x, npc.y, this.npcSilenceConeAngle);
        if (playerInCone) {
          this.npcSilenceConeTickAccum += delta;
          if (this.npcSilenceConeTickAccum >= 250) {
            this.npcSilenceConeTickAccum -= 250;
            player.takeDamage(2);
            this.arena.spawnHitFlash(player.x, player.y, 0x220033);
          }
        } else {
          this.npcSilenceConeTickAccum = 0;
          this.npcSilenceConeContinuousStart = time;
        }
        // 5s unbroken → stun player (lock channeling via nukeChanneling)
        if (playerInCone && time - this.npcSilenceConeContinuousStart >= 5000) {
          this.npcSilenceConeExpiry = 0;
          if (this.npcSilenceConeGraphic) { this.npcSilenceConeGraphic.destroy(); this.npcSilenceConeGraphic = null; }
          this.arena.setNukeChanneling(true, time + 3000);
        } else if (time >= this.npcSilenceConeExpiry) {
          this.npcSilenceConeGraphic.destroy();
          this.npcSilenceConeGraphic = null;
          this.npcSilenceConeExpiry = 0;
        }
      }

      // NPC possess: mirror NPC velocity to player
      if (time < npc.silencePossessedUntil) {
        const nb2 = npc.body as Phaser.Physics.Arcade.Body;
        const pb2 = player.body as Phaser.Physics.Arcade.Body;
        pb2.setVelocity(nb2.velocity.x, nb2.velocity.y);
      }

      // NPC slasher dread aura on player
      if (this.npcSilenceSlasherActive) {
        const silDist2 = Phaser.Math.Distance.Between(npc.x, npc.y, player.x, player.y);
        const AURA_RADIUS2 = 260;
        if (silDist2 <= AURA_RADIUS2) {
          const t2 = 1 - silDist2 / AURA_RADIUS2;
          this.arena.applyPlayerSpeedMult(1 - t2 * 0.65);
        }
      }

      // NPC slasher mask: follow NPC
      if (this.npcSilenceMaskSprite) {
        this.npcSilenceMaskSprite.setPosition(npc.x, npc.y - 4);
      }
    }
  }
}
