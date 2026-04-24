import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';

// ── Type definitions ──────────────────────────────────────────────────────────

interface DeathWisp {
  sprite: Phaser.GameObjects.Arc;
  hp: number;
  maxHp: number;
  owner: 'player' | 'npc';
  isDaemon: boolean;
  lastContactTick: number;
  daemonBarrageAccum: number;
  hpBarBg: Phaser.GameObjects.Rectangle | null;
  hpBarFill: Phaser.GameObjects.Rectangle | null;
}

interface LoomingScythe {
  gfx: Phaser.GameObjects.Graphics;
  target: Fighter | DeathWisp;
  orbitAngle: number;
  cutAt: number;
  tickAccum: number;
  owner: 'player' | 'npc';
}

interface TrailSegment {
  gfx: Phaser.GameObjects.Arc;
  x: number;
  y: number;
  radius: number;
  expiresAt: number;
  tickAccum: number;
  owner: 'player' | 'npc';
}

type JudgementTier =
  | 'limbo' | 'lust' | 'gluttony' | 'greed' | 'anger'
  | 'heresy' | 'violence' | 'fraud' | 'treachery';

interface JudgementHole {
  gfx: Phaser.GameObjects.Arc;
  tendrilGfx: Phaser.GameObjects.Graphics;
  chainGfx: Phaser.GameObjects.Graphics | null;
  chainBall: Phaser.GameObjects.Arc | null;
  squareOverlay: Phaser.GameObjects.Rectangle | null;
  darkAura: Phaser.GameObjects.Arc | null;
  x: number;
  y: number;
  armAt: number;
  holeEndsAt: number;
  armed: boolean;
  sucking: boolean;
  suckReleaseAt: number;
  suckedFighter: Fighter | null;
  tier: JudgementTier;
  tierEndAt: number;
  violenceTicks: number;
  nextViolenceTick: number;
  owner: 'player' | 'npc';
}

interface BeastHead {
  hp: number; maxHp: number;
  neckAngle: number;
  neckBaseLen: number;
  neckLen: number;
  x: number; y: number;
  gfx: Phaser.GameObjects.Graphics;
  hpBarBg: Phaser.GameObjects.Rectangle;
  hpBarFill: Phaser.GameObjects.Rectangle;
  neckGfx: Phaser.GameObjects.Graphics;
  nextActionAt: number;
  mode: 'idle' | 'lunge' | 'barrage';
  modeEndsAt: number;
  lastContactAt: number;
}

interface BeastState {
  heads: BeastHead[];
  anchorX: number;
  anchorY: number;
  owner: 'player' | 'npc';
}

interface FerrymanState {
  boatGfx: Phaser.GameObjects.Graphics;
  ringGfx: Phaser.GameObjects.Graphics;
  ringX: number;
  ringY: number;
  ringRadius: number;
  ringVisible: boolean;
  ringActiveUntil: number;
  ringReappearAt: number;
  playerInsideRing: boolean;
}

// ── Arena API ─────────────────────────────────────────────────────────────────

export interface DeathArenaApi {
  readonly player: Fighter;
  readonly npc: Fighter;
  readonly scene: Phaser.Scene;
  readonly projectiles: Phaser.Physics.Arcade.Group;
  readonly eKey: Phaser.Input.Keyboard.Key;
  readonly fKey: Phaser.Input.Keyboard.Key;
  readonly rKey: Phaser.Input.Keyboard.Key;
  readonly qKey: Phaser.Input.Keyboard.Key;
  readonly pointerWasDown: boolean;
  readonly nukeChanneling: boolean;
  readonly elementId: string;
  readonly npcElementId: string;
  hasUpgrade(slot: string): boolean;
  applyNpcSpeedMult(factor: number): void;
  applyPlayerSpeedMult(factor: number): void;
  spawnHitFlash(x: number, y: number, color: number): void;
  spawnDamageNumber(x: number, y: number, amount: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  spawnFloatingText(x: number, y: number, text: string, color: string): void;
  dealAoeDamageFromOwner(x: number, y: number, radius: number, damage: number, owner: 'player' | 'npc'): void;
  buildPlayerContext(x: number, y: number): CastContext;
  buildNpcContext(x: number, y: number): CastContext;
}

// ── DeathKit ──────────────────────────────────────────────────────────────────

export class DeathKit {
  // ── Wisps ─────────────────────────────────────────────────────────────────
  private wisps: DeathWisp[] = [];
  private daemonAlive = false;
  private npcDaemonAlive = false;

  // ── Kill counters ─────────────────────────────────────────────────────────
  private kills = 0;
  private npcKills = 0;
  private killsText: Phaser.GameObjects.Text | null = null;

  // ── E hold state ──────────────────────────────────────────────────────────
  private eHeld = false;
  private eHoldAccum = 0;
  private npcEHoldAccum = 0;

  // ── River Styx ───────────────────────────────────────────────────────────
  private riverBg: Phaser.GameObjects.Rectangle | null = null;
  private riverWaves: Array<{ gfx: Phaser.GameObjects.Triangle; x: number }> = [];
  private riverTickAccum = 0;
  private playerOnRiver = false;
  private npcOnRiver = false;

  // ── Looming Dread ────────────────────────────────────────────────────────
  private playerScythe: LoomingScythe | null = null;
  private npcScythe: LoomingScythe | null = null;

  // ── Trail Dash ───────────────────────────────────────────────────────────
  private trailDashUntil = 0;
  private npcTrailDashUntil = 0;
  private trailSegments: TrailSegment[] = [];

  // ── Judgement Day ────────────────────────────────────────────────────────
  private playerHole: JudgementHole | null = null;
  private npcHole: JudgementHole | null = null;

  // ── E+ Ferryman ───────────────────────────────────────────────────────────
  private ferryman: FerrymanState | null = null;
  private ferrymanInRingActive = false;
  private ferrymanShopOpen = false;
  private ferrymanShopGfx: Phaser.GameObjects.Graphics | null = null;
  private ferrymanShopLabels: Phaser.GameObjects.Text[] = [];
  private ferrymanBtnAreas: Array<{ x: number; y: number; w: number; h: number; idx: number }> = [];
  private wispArmorOwned = false;
  private wispScreamersOwned = false;
  private swiftScytheOwned = false;
  private critSuccessOwned = false;
  private wispBaneOwned = false;
  private daemonKingOwned = false;
  private bladeApexOwned = false;
  private edgeFinalityOwned = false;

  // ── Click+ ────────────────────────────────────────────────────────────────
  private clickCounter = 0;

  // ── R+ execute ────────────────────────────────────────────────────────────
  private playerExecuteThreshold = 0.12;
  private static readonly EXECUTE_CAP = 0.30;

  // ── F+ Beast ──────────────────────────────────────────────────────────────
  private playerBeast: BeastState | null = null;
  private triDashEnabled = false;

  // ── Q+ picker ────────────────────────────────────────────────────────────
  private qMenuOpen = false;
  private qMenuGfx: Phaser.GameObjects.Graphics | null = null;
  private qMenuLabels: Phaser.GameObjects.Text[] = [];
  private qMenuBtnAreas: Array<{ tier: JudgementTier; x: number; y: number; w: number; h: number; cost: number }> = [];
  private static readonly TIER_COSTS: Record<JudgementTier, number> = {
    limbo: 0, lust: 5, gluttony: 10, greed: 15, anger: 20,
    heresy: 25, violence: 30, fraud: 35, treachery: 40,
  };
  private static readonly TIERS_ORDER: readonly JudgementTier[] = [
    'limbo', 'lust', 'gluttony', 'greed', 'anger', 'heresy', 'violence', 'fraud', 'treachery',
  ];

  constructor(private arena: DeathArenaApi) {}

  // ── Public accessors ──────────────────────────────────────────────────────

  getKills(owner: 'player' | 'npc'): number {
    return owner === 'player' ? this.kills : this.npcKills;
  }

  initKillsHud(cx: number): void {
    if (this.killsText) { this.killsText.destroy(); this.killsText = null; }
    this.killsText = this.arena.scene.add.text(cx, 52, '💀 0  ×1', {
      fontSize: '18px', fontFamily: '"Arial Black", sans-serif',
      color: '#cc88ff', stroke: '#220044', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(20);
  }

  isTrailDashActive(owner: 'player' | 'npc'): boolean {
    const now = this.arena.scene.time.now;
    return owner === 'player' ? now < this.trailDashUntil : now < this.npcTrailDashUntil;
  }

  // ── Reset ─────────────────────────────────────────────────────────────────

  reset(): void {
    const scene = this.arena.scene;

    // Wisps
    for (const w of this.wisps) {
      w.sprite.destroy();
      w.hpBarBg?.destroy();
      w.hpBarFill?.destroy();
    }
    this.wisps = [];
    this.daemonAlive = false;
    this.npcDaemonAlive = false;

    // Kill counters
    this.kills = 0;
    this.npcKills = 0;
    if (this.killsText) { this.killsText.destroy(); this.killsText = null; }

    // E state
    this.eHeld = false;
    this.eHoldAccum = 0;
    this.npcEHoldAccum = 0;

    // River Styx
    if (this.riverBg) { this.riverBg.destroy(); this.riverBg = null; }
    for (const w of this.riverWaves) w.gfx.destroy();
    this.riverWaves = [];
    this.riverTickAccum = 0;
    this.playerOnRiver = false;
    this.npcOnRiver = false;

    // Looming Dread
    if (this.playerScythe) { this.playerScythe.gfx.destroy(); this.playerScythe = null; }
    if (this.npcScythe) { this.npcScythe.gfx.destroy(); this.npcScythe = null; }

    // Trail Dash
    this.trailDashUntil = 0;
    this.npcTrailDashUntil = 0;
    for (const seg of this.trailSegments) seg.gfx.destroy();
    this.trailSegments = [];

    // Judgement Day
    this.destroyHole(this.playerHole);
    this.playerHole = null;
    this.destroyHole(this.npcHole);
    this.npcHole = null;

    // Clear any outgoing damage mult or aim bonus that may be active
    this.arena.npc.outgoingDamageMult = 1;
    this.arena.player.outgoingDamageMult = 1;
    this.arena.npc.aimOffsetBonusDeg = 0;
    this.arena.npc.aimOffsetBonusUntil = 0;
    this.arena.player.aimOffsetBonusDeg = 0;
    this.arena.player.aimOffsetBonusUntil = 0;

    // E+ Ferryman
    this.closeFerrymanShop();
    if (this.ferryman) {
      this.ferryman.boatGfx.destroy();
      this.ferryman.ringGfx.destroy();
      this.ferryman = null;
    }
    this.ferrymanInRingActive = false;
    this.wispArmorOwned = false;
    this.wispScreamersOwned = false;
    this.swiftScytheOwned = false;
    this.critSuccessOwned = false;
    this.wispBaneOwned = false;
    this.daemonKingOwned = false;
    this.bladeApexOwned = false;
    this.edgeFinalityOwned = false;

    // Click+
    this.clickCounter = 0;

    // R+
    this.playerExecuteThreshold = 0.12;

    // F+ Beast
    this.destroyBeast(this.playerBeast);
    this.playerBeast = null;
    this.triDashEnabled = false;

    // Q+
    this.closeQMenu();

    void scene;
    this.spawnRiver();
    if (this.arena.hasUpgrade('e')) this.spawnFerryman();
  }

  // ── Input ─────────────────────────────────────────────────────────────────

  handleInput(
    time: number,
    pointer: Phaser.Input.Pointer,
    mouseX: number,
    mouseY: number,
  ): void {
    void time;
    if (this.arena.nukeChanneling) return;
    const { player, eKey, fKey, rKey, qKey, pointerWasDown } = this.arena;
    const ctx = () => this.arena.buildPlayerContext(mouseX, mouseY);

    // Block casting while player is on the River Styx
    const onRiver = player.y <= 80;

    // ── Click ────────────────────────────────────────────────────────────────
    if (pointer.isDown && !pointerWasDown) {
      // Ferryman shop click
      if (this.ferrymanShopOpen) {
        this.handleFerrymanShopClick(pointer.x, pointer.y);
      } else if (this.qMenuOpen) {
        this.handleQMenuClick(pointer.x, pointer.y, mouseX, mouseY);
      } else if (!onRiver && !this.ferrymanInRingActive) {
        const target = this.findClickTarget(mouseX, mouseY, 'player');
        if (target) {
          player.castAbility('death-1000-blades', ctx());
        }
        if (this.playerScythe) {
          const tx = this.scytheTargetX(this.playerScythe.target);
          const ty = this.scytheTargetY(this.playerScythe.target);
          const d = Phaser.Math.Distance.Between(mouseX, mouseY, tx, ty);
          if (d <= 80) {
            this.playerScythe.cutAt = Math.max(this.arena.scene.time.now, this.playerScythe.cutAt - 200);
          }
        }
        if (this.playerHole && !this.playerHole.armed) {
          const d = Phaser.Math.Distance.Between(mouseX, mouseY, this.playerHole.x, this.playerHole.y);
          if (d <= 40) {
            this.playerHole.armAt = Math.max(this.arena.scene.time.now, this.playerHole.armAt - 200);
          }
        }
      }
    }

    // ── E: Summon Wisps or Ferryman shop ─────────────────────────────────────
    if (Phaser.Input.Keyboard.JustDown(eKey)) {
      if (this.arena.hasUpgrade('e') && this.ferrymanInRingActive) {
        if (this.ferrymanShopOpen) this.closeFerrymanShop();
        else this.openFerrymanShop();
      } else if (!this.ferrymanInRingActive) {
        this.doSummonWisps(3, 'player');
        this.eHeld = true;
        this.eHoldAccum = 0;
      }
    }
    if (!eKey.isDown) this.eHeld = false;

    // ── R: Looming Dread ─────────────────────────────────────────────────────
    if (Phaser.Input.Keyboard.JustDown(rKey)) {
      if (!onRiver && !this.ferrymanInRingActive) this.doDeathLoomingDread('player', mouseX, mouseY);
    }

    // ── F: Wisp Daemon / Three-Headed Beast / Trail Dash ─────────────────────
    if (Phaser.Input.Keyboard.JustDown(fKey)) {
      if (!onRiver && !this.ferrymanInRingActive) {
        if (this.isTrailDashActive('player')) {
          player.castAbility('death-trail-dash', ctx());
        } else if (this.daemonAlive || this.playerBeast) {
          this.arena.showFloatingText(player.x, player.y - 30, '⚠ Beast Active', '#ff6644');
        } else {
          player.castAbility('death-wisp-daemon', ctx());
        }
      }
    }

    // ── Q: Judgement Day / Predestination picker ──────────────────────────────
    if (Phaser.Input.Keyboard.JustDown(qKey)) {
      if (this.qMenuOpen) {
        this.autoPickQMenu(mouseX, mouseY);
      } else if (!onRiver && !this.ferrymanInRingActive) {
        player.castAbility('death-judgement', ctx());
      }
    }
  }

  // ── Per-frame update ──────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    this.updateRiver(time, delta);
    this.updateEHold(time, delta);
    this.updateWisps(time, delta);
    this.updateScythes(time, delta);
    this.updateTrailSegments(time, delta);
    this.updateHoles(time, delta);
    this.updatePayloadEffects(time, delta);
    this.updateBeast(time, delta);
    this.updateFerrymanRing(time);
  }

  // ── Public do* methods (called from ArenaScene CastContext wiring) ─────────

  doDeath1000Blades(tx: number, ty: number, owner: 'player' | 'npc'): void {
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const target = this.findClickTarget(tx, ty, owner);
    if (!target) return;

    let dmg = this.getClickDamage(owner);
    const clickPlus = owner === 'player' && this.arena.hasUpgrade('click');
    const isBeastHead = this.isBeastHead(target);
    const isWisp = !isBeastHead && !(target instanceof Fighter);

    // Wisp Bane: 2× damage against wisps and beast heads
    if (owner === 'player' && this.wispBaneOwned && (isWisp || isBeastHead)) dmg *= 2;

    // Critical Success: every 10th click deals 2× damage
    if (owner === 'player' && this.critSuccessOwned) {
      this.clickCounter++;
      if (this.clickCounter % 10 === 0) {
        dmg *= 2;
        this.arena.showFloatingText(caster.x, caster.y - 30, '⚡ CRITICAL!', '#ffff00');
      }
    }

    const { scene } = this.arena;
    const hitX = target instanceof Fighter ? target.x : (isBeastHead ? (target as BeastHead).x : (target as DeathWisp).sprite.x);
    const hitY = target instanceof Fighter ? target.y : (isBeastHead ? (target as BeastHead).y : (target as DeathWisp).sprite.y);

    // Slash visual — larger with Click+
    const angle = Math.atan2(hitY - caster.y, hitX - caster.x);
    const sw = clickPlus ? 44 : 24, sh = clickPlus ? 14 : 8;
    const gfx = scene.add.graphics();
    gfx.fillStyle(0x8b4513, 0.9);
    gfx.save();
    gfx.translateCanvas(hitX, hitY);
    gfx.rotateCanvas(angle);
    gfx.fillRect(-sw / 2, -sh / 2, sw, sh);
    gfx.restore();
    gfx.setDepth(7);
    scene.tweens.add({ targets: gfx, alpha: 0, duration: 150, onComplete: () => gfx.destroy() });

    // Apply primary damage
    const applyHit = (f: Fighter, d: number): void => {
      const rd = Math.round(d * f.incomingDamageMultiplier);
      f.takeDamage(rd);
      this.arena.spawnHitFlash(f.x, f.y, 0x8b4513);
      this.arena.spawnDamageNumber(f.x, f.y - 20, rd);
    };
    if (target instanceof Fighter) {
      applyHit(target, dmg);
    } else if (isBeastHead) {
      const head = target as BeastHead;
      head.hp -= dmg;
      this.arena.spawnHitFlash(head.x, head.y, 0x8b4513);
      this.arena.spawnDamageNumber(head.x, head.y - 20, dmg);
    } else {
      const wisp = target as DeathWisp;
      wisp.hp -= dmg;
      this.arena.spawnHitFlash(wisp.sprite.x, wisp.sprite.y, 0x8b4513);
    }

    // Click+: Splash within 55px of the hit point
    if (clickPlus) {
      const splashR = 55;
      const opponent = owner === 'player' ? this.arena.npc : this.arena.player;
      if (!(target instanceof Fighter)) {
        const d = Phaser.Math.Distance.Between(hitX, hitY, opponent.x, opponent.y);
        if (d <= splashR && opponent.active && opponent.hp > 0) {
          applyHit(opponent, dmg);
          this.arena.showFloatingText(opponent.x, opponent.y - 30, 'SPLASH', '#cc8844');
        }
      }
      for (const w of this.wisps) {
        if (w.owner !== owner) continue;
        if (!isWisp || w !== target) {
          const dw = Phaser.Math.Distance.Between(hitX, hitY, w.sprite.x, w.sprite.y);
          if (dw <= splashR) {
            w.hp -= dmg;
            this.arena.spawnHitFlash(w.sprite.x, w.sprite.y, 0x8b4513);
          }
        }
      }
      if (this.playerBeast && !isBeastHead) {
        for (const head of this.playerBeast.heads) {
          const dh = Phaser.Math.Distance.Between(hitX, hitY, head.x, head.y);
          if (dh <= splashR) {
            head.hp -= dmg;
            this.arena.spawnHitFlash(head.x, head.y, 0x8b4513);
          }
        }
      }
    }
  }

  doDeathSummonWisps(count: number, owner: 'player' | 'npc'): void {
    this.doSummonWisps(count, owner);
  }

  doDeathLoomingDread(owner: 'player' | 'npc', cursorX?: number, cursorY?: number): void {
    if ((owner === 'player' && this.playerScythe) || (owner === 'npc' && this.npcScythe)) return;

    const defaultTarget = owner === 'player' ? this.arena.npc : this.arena.player;
    let target: Fighter | DeathWisp = defaultTarget;

    if (cursorX !== undefined && cursorY !== undefined) {
      const hovered = this.findLoomingTarget(cursorX, cursorY, owner);
      if (hovered) target = hovered;
    }

    const { scene } = this.arena;
    const gfx = scene.add.graphics().setDepth(8);
    const fuseDuration = (owner === 'player' && this.swiftScytheOwned) ? 3000 : 5000;
    const scythe: LoomingScythe = {
      gfx,
      target,
      orbitAngle: 0,
      cutAt: scene.time.now + fuseDuration,
      tickAccum: 0,
      owner,
    };
    if (owner === 'player') this.playerScythe = scythe;
    else this.npcScythe = scythe;

    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    this.arena.showFloatingText(caster.x, caster.y - 30, '☠ LOOMING DREAD', '#cc44ff');
  }

  doDeathWispDaemon(owner: 'player' | 'npc'): void {
    if (owner === 'player' && this.arena.hasUpgrade('f')) {
      if (this.playerBeast) return;
      this.spawnBeast(owner);
      this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 40, '💀 BEAST SUMMONED', '#cc44ff');
      return;
    }
    if (owner === 'player') this.daemonAlive = true;
    else this.npcDaemonAlive = true;
    this.doSummonWisps(1, owner, true);
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    this.arena.showFloatingText(caster.x, caster.y - 40, '👹 DAEMON SUMMONED', '#ff3366');
  }

  doDeathTrailDash(tx: number, ty: number, owner: 'player' | 'npc'): void {
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const { scene } = this.arena;

    const dx = tx - caster.x, dy = ty - caster.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = dx / len, ny = dy / len;

    const body = caster.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(nx * 650, ny * 650);
    caster.isInvincible = true;
    scene.time.delayedCall(275, () => {
      if (caster.active) { caster.isInvincible = false; body.setVelocity(0, 0); }
    });

    const trailDuration = (owner === 'player' && this.bladeApexOwned) ? 10000 : 5000;
    const useTriDash = owner === 'player' && this.triDashEnabled;

    if (useTriDash) {
      // 3-slash variant: place 3 rays of segments behind the dash
      const dashAngle = Math.atan2(ny, nx);
      const behindAngle = dashAngle + Math.PI;
      const startX = caster.x, startY = caster.y;
      const angles = [behindAngle - Math.PI / 4, behindAngle, behindAngle + Math.PI / 4];
      for (const ang of angles) {
        for (let j = 1; j <= 3; j++) {
          const sx = startX + Math.cos(ang) * j * 35;
          const sy = startY + Math.sin(ang) * j * 35;
          const seg: TrailSegment = {
            gfx: scene.add.circle(sx, sy, 30, 0x8b4513, 0.4).setDepth(2) as Phaser.GameObjects.Arc,
            x: sx, y: sy, radius: 30,
            expiresAt: scene.time.now + trailDuration,
            tickAccum: 0, owner,
          };
          this.trailSegments.push(seg);
        }
      }
    } else {
      for (let i = 0; i < 5; i++) {
        scene.time.delayedCall(i * 55, () => {
          if (!caster.active) return;
          const seg: TrailSegment = {
            gfx: scene.add.circle(caster.x, caster.y, 30, 0x8b4513, 0.4).setDepth(2) as Phaser.GameObjects.Arc,
            x: caster.x, y: caster.y, radius: 30,
            expiresAt: scene.time.now + trailDuration,
            tickAccum: 0, owner,
          };
          this.trailSegments.push(seg);
        });
      }
    }
  }

  doDeathJudgement(owner: 'player' | 'npc'): void {
    // Q+: open picker menu instead of spawning immediately
    if (owner === 'player' && this.arena.hasUpgrade('q') && !this.qMenuOpen) {
      this.openQMenu();
      this.arena.player.resetCooldown('death-judgement');
      return;
    }

    const existing = owner === 'player' ? this.playerHole : this.npcHole;
    if (existing) this.destroyHole(existing);

    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const kills = owner === 'player' ? this.kills : this.npcKills;
    const tier = owner === 'player' && this.arena.hasUpgrade('q')
      ? this.getTierByChoice(kills)
      : this.getTier(kills);
    this.spawnHoleForTier(tier, owner, caster.x, caster.y);
    this.arena.showFloatingText(caster.x, caster.y - 40, `⚫ JUDGEMENT (${tier.toUpperCase()})`, '#cc44ff');
  }

  private spawnHoleForTier(tier: JudgementTier, owner: 'player' | 'npc', hx: number, hy: number): void {
    const color = this.tierColor(tier);
    const { scene } = this.arena;
    const armDelay = (owner === 'player' && this.edgeFinalityOwned) ? 5000 : 15000;

    const gfx = scene.add.circle(hx, hy, 28, color, 0.85)
      .setDepth(4)
      .setStrokeStyle(3, 0x000000) as Phaser.GameObjects.Arc;
    scene.tweens.add({ targets: gfx, scaleX: 1.15, scaleY: 1.15, yoyo: true, repeat: -1, duration: 600 });

    const hole: JudgementHole = {
      gfx,
      tendrilGfx: scene.add.graphics().setDepth(6),
      chainGfx: null, chainBall: null, squareOverlay: null, darkAura: null,
      x: hx, y: hy,
      armAt: scene.time.now + armDelay,
      holeEndsAt: 0, armed: false, sucking: false,
      suckReleaseAt: 0, suckedFighter: null, tier,
      tierEndAt: 0, violenceTicks: 0, nextViolenceTick: 0,
      owner,
    };
    if (owner === 'player') this.playerHole = hole;
    else this.npcHole = hole;
  }

  // ── River Styx ────────────────────────────────────────────────────────────

  private spawnRiver(): void {
    const { scene } = this.arena;
    const W = scene.scale.width;
    const H = 80;
    this.riverBg = scene.add.rectangle(W / 2, H / 2, W, H, 0x1144aa, 0.5).setDepth(1);

    const waveCount = 10;
    for (let i = 0; i < waveCount; i++) {
      const x = (i / waveCount) * W;
      const tri = scene.add.triangle(
        x, 40, 0, 8, 16, 0, 0, -8, 0x88ccff, 0.7,
      ).setDepth(2);
      this.riverWaves.push({ gfx: tri, x });
    }
  }

  private updateRiver(time: number, delta: number): void {
    if (!this.riverBg) return;

    const { scene } = this.arena;
    const W = scene.scale.width;
    const SPEED = 40; // px/s scroll speed

    for (const wave of this.riverWaves) {
      wave.x += SPEED * delta / 1000;
      if (wave.x > W + 16) wave.x -= W + 32;
      wave.gfx.setPosition(wave.x, 40);
    }

    const { player, npc, elementId, npcElementId } = this.arena;

    // ── Player-on-river ───────────────────────────────────────────
    const playerDeath = elementId === 'death';
    const npcDeath = npcElementId === 'death';

    const playerInRiver = player.y <= 80;
    const npcInRiver = npc.y <= 80;

    // Player protection (player is Death)
    if (playerDeath) {
      if (playerInRiver) {
        if (!this.playerOnRiver) {
          this.playerOnRiver = true;
          player.setAlpha(0.5);
        }
        player.isInvincible = true;
        const body = player.body as Phaser.Physics.Arcade.Body;
        body.velocity.x = Math.max(body.velocity.x, 140);
      } else if (this.playerOnRiver) {
        this.playerOnRiver = false;
        player.isInvincible = false;
        player.setAlpha(1);
      }
    }

    // NPC protection (NPC is Death)
    if (npcDeath) {
      if (npcInRiver) {
        if (!this.npcOnRiver) this.npcOnRiver = true;
        npc.isInvincible = true;
        const body = npc.body as Phaser.Physics.Arcade.Body;
        body.velocity.x = Math.max(body.velocity.x, 140);
      } else if (this.npcOnRiver) {
        this.npcOnRiver = false;
        npc.isInvincible = false;
      }
    }

    // ── Hazard ticks (enemy stepping in river) ────────────────────
    this.riverTickAccum += delta;
    if (this.riverTickAccum >= 250) {
      this.riverTickAccum -= 250;

      // Enemy of the Death player takes damage in the river
      if (playerDeath && npcInRiver && npc.active && npc.hp > 0) {
        npc.takeDamage(2);
        this.arena.spawnHitFlash(npc.x, npc.y, 0x2266aa);
        this.arena.spawnDamageNumber(npc.x, npc.y - 20, 2);
      }
      if (npcDeath && playerInRiver && player.active && player.hp > 0) {
        player.takeDamage(2);
        this.arena.spawnHitFlash(player.x, player.y, 0x2266aa);
        this.arena.spawnDamageNumber(player.x, player.y - 20, 2);
      }
    }

    void time;
  }

  // ── E hold tick ───────────────────────────────────────────────────────────

  private updateEHold(_time: number, delta: number): void {
    if (this.eHeld && this.arena.elementId === 'death') {
      this.eHoldAccum += delta;
      if (this.eHoldAccum >= 1000) {
        this.eHoldAccum -= 1000;
        this.doSummonWisps(1, 'player');
      }
    }
    // NPC E hold is handled via AI tick in doDeathAbilities
  }

  // ── Wisp helpers ──────────────────────────────────────────────────────────

  private doSummonWisps(count: number, owner: 'player' | 'npc', isDaemon = false): void {
    const { scene } = this.arena;
    const W = scene.scale.width;

    for (let i = 0; i < count; i++) {
      const ox = 20 + Math.random() * (W - 40);
      const oy = 10 + Math.random() * 60;
      let hp = isDaemon ? 80 : 30;
      // Daemon King: daemon HP ×2
      if (isDaemon && owner === 'player' && this.daemonKingOwned) hp *= 2;
      // Wisp Armor: normal wisp HP ×1.5
      if (!isDaemon && owner === 'player' && this.wispArmorOwned) hp = Math.round(hp * 1.5);
      const radius = isDaemon ? 27 : 18;
      const color = isDaemon ? 0xff3366 : 0xaa55cc;
      const sprite = scene.add.circle(ox, oy, radius, color, 0.85).setDepth(5) as Phaser.GameObjects.Arc;
      scene.tweens.add({ targets: sprite, alpha: 0.5, yoyo: true, repeat: -1, duration: isDaemon ? 400 : 600 });
      this.wisps.push({
        sprite, hp, maxHp: hp, owner, isDaemon,
        lastContactTick: 0, daemonBarrageAccum: 0,
        hpBarBg: null, hpBarFill: null,
      });
    }
  }

  private updateWisps(time: number, delta: number): void {
    for (let i = this.wisps.length - 1; i >= 0; i--) {
      const w = this.wisps[i];
      if (w.hp <= 0) {
        this.awardKill(w.owner, w.isDaemon, time);
        w.sprite.destroy();
        w.hpBarBg?.destroy();
        w.hpBarFill?.destroy();
        this.wisps.splice(i, 1);
        continue;
      }
      this.tickWisp(w, time, delta);
    }
  }

  private tickWisp(w: DeathWisp, time: number, delta: number): void {
    const summoner = w.owner === 'player' ? this.arena.player : this.arena.npc;
    const speed = w.isDaemon ? 60 : 70;

    const dx = summoner.x - w.sprite.x, dy = summoner.y - w.sprite.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 5) {
      const nx = dx / dist, ny = dy / dist;
      w.sprite.x += nx * speed * delta / 1000;
      w.sprite.y += ny * speed * delta / 1000;
    }
    const pad = 34, W = this.arena.scene.scale.width, H = this.arena.scene.scale.height;
    w.sprite.x = Phaser.Math.Clamp(w.sprite.x, pad, W - pad);
    w.sprite.y = Phaser.Math.Clamp(w.sprite.y, pad, H - pad);

    // Contact damage to summoner
    const contactRange = w.isDaemon ? 55 : 43;
    const contactDmg = w.isDaemon ? 25 : 15;
    if (time - w.lastContactTick >= 1000) {
      const d2 = Phaser.Math.Distance.Between(w.sprite.x, w.sprite.y, summoner.x, summoner.y);
      if (d2 <= contactRange) {
        summoner.takeDamage(contactDmg);
        this.arena.spawnHitFlash(summoner.x, summoner.y, 0xaa55cc);
        this.arena.spawnDamageNumber(summoner.x, summoner.y - 20, contactDmg);
        w.lastContactTick = time;
      }
    }

    // Daemon barrage — 3 bolts toward summoner every 4s
    // Wisp Screamers: non-daemon wisps also fire (1 bolt, every 4s)
    const canBarrage = w.isDaemon || (w.owner === 'player' && this.wispScreamersOwned);
    if (canBarrage) {
      w.daemonBarrageAccum += delta;
      const interval = w.isDaemon ? 4000 : 4000;
      if (w.daemonBarrageAccum >= interval) {
        w.daemonBarrageAccum = 0;
        const baseAngle = Math.atan2(summoner.y - w.sprite.y, summoner.x - w.sprite.x);
        const spread = w.isDaemon ? [-1, 0, 1] : [0];
        for (const i of spread) {
          const angle = baseAngle + i * 0.25;
          const bolt = this.arena.projectiles.get(w.sprite.x, w.sprite.y, 'proj-death-bolt') as any;
          if (bolt) {
            bolt.setActive(true).setVisible(true).setDepth(6);
            bolt.isFromPlayer = (w.owner === 'player');
            bolt.isDeathSource = true;
            bolt.damage = Math.round((w.isDaemon ? 12 : 6) * (1 + Math.floor(this.getKills(w.owner) / 5)));
            (bolt.body as Phaser.Physics.Arcade.Body).setVelocity(Math.cos(angle) * 320, Math.sin(angle) * 320);
          }
        }
      }
    }

    // HP bar
    const BAR_W = w.isDaemon ? 40 : 28, BAR_H = 4;
    const barColor = w.isDaemon ? 0xff3366 : 0xaa55cc;
    const bx = w.sprite.x, by = w.sprite.y - (w.isDaemon ? 35 : 26);
    if (!w.hpBarBg) {
      w.hpBarBg = this.arena.scene.add.rectangle(bx, by, BAR_W, BAR_H, 0x220022, 0.85).setDepth(6).setOrigin(0.5, 0.5);
      w.hpBarFill = this.arena.scene.add.rectangle(bx - BAR_W / 2, by, 0, BAR_H, barColor, 1).setDepth(7).setOrigin(0, 0.5);
    }
    const ratio = Math.max(0, w.hp / w.maxHp);
    w.hpBarBg!.setPosition(bx, by);
    w.hpBarFill!.setPosition(bx - BAR_W / 2, by).setSize(BAR_W * ratio, BAR_H);
  }

  private awardKill(owner: 'player' | 'npc', isDaemon: boolean, time: number): void {
    let kills = isDaemon ? 10 : 1;
    // Wisp Armor: normal wisps give 2× kills
    if (!isDaemon && owner === 'player' && this.wispArmorOwned) kills *= 2;
    // Wisp Screamers: normal wisps give 2× kills
    if (!isDaemon && owner === 'player' && this.wispScreamersOwned) kills = Math.max(kills, kills * 2);
    if (owner === 'player') {
      this.kills += kills;
      if (isDaemon) {
        this.daemonAlive = false;
        const dashDuration = this.daemonKingOwned ? 60000 : 30000;
        this.trailDashUntil = time + dashDuration;
        this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 50, `💨 TRAIL DASH ${dashDuration / 1000}s!`, '#ff3366');
      } else {
        this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 30, `+${kills} 💀  ×${this.getClickDamage('player')}`, '#cc88ff');
      }
      this.updateKillsHud();
    } else {
      this.npcKills += kills;
      if (isDaemon) {
        this.npcDaemonAlive = false;
        this.npcTrailDashUntil = time + 30000;
      }
    }
    void time;
  }

  private updateKillsHud(): void {
    if (this.killsText) {
      this.killsText.setText(`💀 ${this.kills}  ×${this.getClickDamage('player')}`);
    }
  }

  private getClickDamage(owner: 'player' | 'npc'): number {
    return 1 + Math.floor(this.getKills(owner) / 5);
  }

  // ── Looming Dread ─────────────────────────────────────────────────────────

  private updateScythes(time: number, delta: number): void {
    this.tickScythe(this.playerScythe, time, delta, 'player');
    this.tickScythe(this.npcScythe, time, delta, 'npc');
    // Clear null references after ticking
    if (this.playerScythe && time >= this.playerScythe.cutAt) this.playerScythe = null;
    if (this.npcScythe && time >= this.npcScythe.cutAt) this.npcScythe = null;
  }

  private scytheTargetX(target: Fighter | DeathWisp): number {
    return target instanceof Fighter ? target.x : target.sprite.x;
  }

  private scytheTargetY(target: Fighter | DeathWisp): number {
    return target instanceof Fighter ? target.y : target.sprite.y;
  }

  private tickScythe(sc: LoomingScythe | null, time: number, delta: number, owner: 'player' | 'npc'): void {
    if (!sc) return;

    sc.orbitAngle += 0.002 * delta;
    const ORBIT_R = 45;
    const tx = this.scytheTargetX(sc.target);
    const ty = this.scytheTargetY(sc.target);
    const sx = tx + Math.cos(sc.orbitAngle) * ORBIT_R;
    const sy = ty + Math.sin(sc.orbitAngle) * ORBIT_R;

    // Draw scythe glyph
    const gfx = sc.gfx;
    gfx.clear();
    // Blade arc
    gfx.lineStyle(3, 0xcc44ff, 0.9);
    gfx.beginPath();
    gfx.arc(sx, sy, 14, sc.orbitAngle + Math.PI * 0.6, sc.orbitAngle + Math.PI * 1.6, false);
    gfx.strokePath();
    // Handle
    gfx.lineStyle(2, 0x880055, 0.8);
    gfx.beginPath();
    gfx.moveTo(sx, sy);
    gfx.lineTo(sx - Math.cos(sc.orbitAngle) * 18, sy - Math.sin(sc.orbitAngle) * 18);
    gfx.strokePath();

    // Orbit-damage tick — damage own wisps near the scythe
    sc.tickAccum += delta;
    if (sc.tickAccum >= 250) {
      sc.tickAccum -= 250;
      for (const w of this.wisps) {
        if (w.owner !== owner) continue;
        if (w === sc.target) continue;
        const d = Phaser.Math.Distance.Between(sx, sy, w.sprite.x, w.sprite.y);
        if (d <= 60) {
          w.hp -= 6;
          this.arena.spawnHitFlash(w.sprite.x, w.sprite.y, 0xcc44ff);
        }
      }
    }

    // Resolve cut
    if (time >= sc.cutAt) {
      sc.gfx.destroy();
      const target = sc.target;
      const hitX = this.scytheTargetX(target);
      const hitY = this.scytheTargetY(target);

      if (target instanceof Fighter) {
        let executed = false;
        if (owner === 'player' && this.arena.hasUpgrade('r')) {
          if (target.hp / target.maxHp <= this.playerExecuteThreshold) {
            target.takeDamage(target.hp);
            this.arena.spawnHitFlash(hitX, hitY, 0xcc44ff);
            this.arena.spawnDamageNumber(hitX, hitY - 24, target.maxHp);
            this.arena.showFloatingText(hitX, hitY - 40, '💀 EXECUTE!', '#cc44ff');
            this.playerExecuteThreshold = Math.min(DeathKit.EXECUTE_CAP, this.playerExecuteThreshold + 0.03);
            executed = true;
          } else {
            target.takeDamage(35);
            this.arena.spawnHitFlash(hitX, hitY, 0xcc44ff);
            this.arena.spawnDamageNumber(hitX, hitY - 24, 35);
            this.arena.showFloatingText(hitX, hitY - 40, '💀 LOOMING CUT', '#cc44ff');
            this.playerExecuteThreshold = 0.12;
          }
        } else {
          const dmg = 35;
          target.takeDamage(dmg);
          this.arena.spawnHitFlash(hitX, hitY, 0xcc44ff);
          this.arena.spawnDamageNumber(hitX, hitY - 24, dmg);
          this.arena.showFloatingText(hitX, hitY - 40, '💀 LOOMING CUT', '#cc44ff');
        }
        void executed;
      } else {
        // Wisp target: deal 35 direct HP to the wisp
        const dmg = 35;
        target.hp -= dmg;
        this.arena.spawnHitFlash(hitX, hitY, 0xcc44ff);
        this.arena.spawnDamageNumber(hitX, hitY - 24, dmg);
        this.arena.showFloatingText(hitX, hitY - 40, '💀 LOOMING CUT', '#cc44ff');
      }

      if (owner === 'player') this.playerScythe = null;
      else this.npcScythe = null;
    }
  }

  // ── Trail segments ────────────────────────────────────────────────────────

  private updateTrailSegments(time: number, delta: number): void {
    const { player, npc } = this.arena;
    for (let i = this.trailSegments.length - 1; i >= 0; i--) {
      const seg = this.trailSegments[i];
      if (time >= seg.expiresAt) {
        seg.gfx.destroy();
        this.trailSegments.splice(i, 1);
        continue;
      }
      // Tick damage to enemy in segment
      const enemy = seg.owner === 'player' ? npc : player;
      const d = Phaser.Math.Distance.Between(seg.x, seg.y, enemy.x, enemy.y);
      if (d <= seg.radius && enemy.active && enemy.hp > 0) {
        seg.tickAccum += delta;
        if (seg.tickAccum >= 500) {
          seg.tickAccum -= 500;
          const dmg = this.getClickDamage(seg.owner);
          enemy.takeDamage(dmg);
          this.arena.spawnHitFlash(enemy.x, enemy.y, 0x8b4513);
          this.arena.spawnDamageNumber(enemy.x, enemy.y - 20, dmg);
        }
      }
      // Also damage enemy wisps inside the trail
      for (const w of this.wisps) {
        if (w.owner === seg.owner) continue;
        const wd = Phaser.Math.Distance.Between(seg.x, seg.y, w.sprite.x, w.sprite.y);
        if (wd <= seg.radius) {
          seg.tickAccum; // already incremented above
        }
      }
    }
  }

  // ── Judgement Day holes ───────────────────────────────────────────────────

  private updateHoles(time: number, delta: number): void {
    void delta;
    const { player, npc, scene } = this.arena;

    const processHole = (hole: JudgementHole | null, owner: 'player' | 'npc'): JudgementHole | null => {
      if (!hole) return null;
      const enemy = owner === 'player' ? npc : player;

      // Arm phase
      if (!hole.armed) {
        if (time >= hole.armAt) {
          hole.armed = true;
          hole.holeEndsAt = time + 10000;
          // Flash the hole
          scene.tweens.add({ targets: hole.gfx, scaleX: 1.5, scaleY: 1.5, duration: 200, yoyo: true });
          this.arena.showFloatingText(hole.x, hole.y - 40, '⚫ HOLE ARMED!', '#cc44ff');
          hole.sucking = true;
        } else {
          // Pulse the unarmed hole slightly
          hole.gfx.setPosition(hole.x, hole.y);
          return hole;
        }
      }

      // Hole expiry
      if (time >= hole.holeEndsAt) {
        this.destroyHole(hole);
        return null;
      }

      hole.gfx.setPosition(hole.x, hole.y);

      // Sucking phase — draw tendril, then pull enemy in
      if (hole.sucking && !hole.suckedFighter) {
        const dist = Phaser.Math.Distance.Between(hole.x, hole.y, enemy.x, enemy.y);
        // Draw tendril toward enemy
        hole.tendrilGfx.clear();
        hole.tendrilGfx.lineStyle(2, 0x440066, 0.7);
        hole.tendrilGfx.beginPath();
        hole.tendrilGfx.moveTo(hole.x, hole.y);
        hole.tendrilGfx.lineTo(enemy.x, enemy.y);
        hole.tendrilGfx.strokePath();

        const suckRange = (owner === 'player' && this.edgeFinalityOwned) ? 300 : 200;
        if (dist <= suckRange || time >= hole.armAt + 1000) {
          // Pull enemy in
          hole.suckedFighter = enemy;
          hole.suckReleaseAt = time + 3000;
          enemy.isInvincible = true;
          enemy.forceInvisible = true;
          enemy.setAlpha(0);
          enemy.applyDisarm(3000);
          enemy.earthStunnedUntil = time + 3000;
          const body = enemy.body as Phaser.Physics.Arcade.Body;
          body.setVelocity(0, 0);
          body.reset(hole.x, hole.y);
          hole.tendrilGfx.clear();
        }
      }

      // Hold sucked fighter at hole
      if (hole.suckedFighter) {
        const f = hole.suckedFighter;
        const body = f.body as Phaser.Physics.Arcade.Body;
        body.setVelocity(0, 0);
        body.reset(hole.x, hole.y);

        if (time >= hole.suckReleaseAt) {
          // Release
          f.isInvincible = false;
          f.forceInvisible = false;
          f.setAlpha(1);
          hole.suckedFighter = null;
          hole.sucking = false;
          // Apply payload
          this.applyPayload(hole, f, owner, time);
        }
      }

      return hole;
    };

    this.playerHole = processHole(this.playerHole, 'player');
    this.npcHole = processHole(this.npcHole, 'npc');
  }

  private applyPayload(hole: JudgementHole, target: Fighter, _owner: 'player' | 'npc', time: number): void {
    const { scene } = this.arena;

    switch (hole.tier) {
      case 'limbo':
        target.takeDamage(35);
        this.arena.spawnHitFlash(target.x, target.y, 0x55cc55);
        this.arena.spawnDamageNumber(target.x, target.y - 30, 35);
        this.arena.showFloatingText(target.x, target.y - 50, '🟢 LIMBO 35', '#55cc55');
        break;

      case 'lust':
        target.outgoingDamageMult = 0.5;
        hole.tierEndAt = time + 6000;
        this.arena.showFloatingText(target.x, target.y - 50, '🩷 LUST -50% DMG', '#ff77cc');
        break;

      case 'gluttony':
        target.sizeMult = 1.2;
        target.applySizeMult();
        hole.tierEndAt = time + 6000;
        this.arena.showFloatingText(target.x, target.y - 50, '🟤 GLUTTONY +SIZE', '#996633');
        break;

      case 'greed': {
        hole.tierEndAt = time + 6000;
        hole.chainBall = scene.add.circle(target.x + 40, target.y + 40, 14, 0xddaa22, 0.9).setDepth(5) as Phaser.GameObjects.Arc;
        hole.chainGfx = scene.add.graphics().setDepth(5);
        this.arena.showFloatingText(target.x, target.y - 50, '🟡 GREED CHAIN', '#ddaa22');
        break;
      }

      case 'anger':
        target.aimOffsetBonusDeg = 40;
        target.aimOffsetBonusUntil = time + 6000;
        hole.tierEndAt = time + 6000;
        this.arena.showFloatingText(target.x, target.y - 50, '🔴 ANGER INACCURATE', '#cc2244');
        break;

      case 'heresy':
        target.applyDisarm(6000);
        this.arena.showFloatingText(target.x, target.y - 50, '⬜ HERESY DISARMED', '#aaaaaa');
        break;

      case 'violence':
        hole.tierEndAt = time + 6000;
        hole.violenceTicks = 3;
        hole.nextViolenceTick = time + 2000;
        this.arena.showFloatingText(target.x, target.y - 50, '⚪ VIOLENCE SELF-HARM', '#eeeeee');
        break;

      case 'fraud': {
        const origTexture = target.texture.key;
        target.setTexture('elem-death'); // use death icon as "cursed square" visual substitute
        hole.squareOverlay = scene.add.rectangle(target.x, target.y, 44, 44, 0x000000, 0).setStrokeStyle(3, 0xee8833).setDepth(9);
        hole.tierEndAt = time + 6000;
        scene.time.delayedCall(6000, () => { if (target.active) target.setTexture(origTexture); });
        this.arena.showFloatingText(target.x, target.y - 50, '🟠 FRAUD SQUARED', '#ee8833');
        break;
      }

      case 'treachery':
        target.toxicUntil = Number.MAX_SAFE_INTEGER;
        target.toxicDps = 3;
        target.toxicTickAccum = 0;
        // Dark aura
        hole.darkAura = scene.add.circle(target.x, target.y, 30, 0x111111, 0.6).setDepth(4) as Phaser.GameObjects.Arc;
        scene.tweens.add({ targets: hole.darkAura, alpha: 0.25, yoyo: true, repeat: -1, duration: 400 });
        this.arena.showFloatingText(target.x, target.y - 50, '⚫ TREACHERY ETERNAL', '#330011');
        break;
    }
  }

  private updatePayloadEffects(time: number, delta: number): void {
    const { npc, player, scene } = this.arena;

    const processPayload = (hole: JudgementHole | null, owner: 'player' | 'npc'): void => {
      if (!hole || hole.sucking || hole.suckedFighter) return;
      if (hole.tierEndAt === 0 && hole.tier !== 'treachery') return;

      const target = owner === 'player' ? npc : player;

      // Per-frame effects that need to keep running
      switch (hole.tier) {
        case 'gluttony':
          if (time < hole.tierEndAt) {
            if (owner === 'player') this.arena.applyNpcSpeedMult(0.8);
            else this.arena.applyPlayerSpeedMult(0.8);
          } else if (hole.tierEndAt > 0) {
            target.sizeMult = 1;
            target.applySizeMult();
            hole.tierEndAt = 0;
          }
          break;

        case 'greed':
          if (time < hole.tierEndAt) {
            if (owner === 'player') this.arena.applyNpcSpeedMult(0.5);
            else this.arena.applyPlayerSpeedMult(0.5);
            // Update chain visual
            if (hole.chainBall && hole.chainGfx) {
              const lx = target.x + 36, ly = target.y + 36;
              hole.chainBall.setPosition(lx, ly);
              hole.chainGfx.clear();
              this.drawChainLine(hole.chainGfx, target.x, target.y, lx, ly, 0xddaa22);
            }
          } else if (hole.tierEndAt > 0) {
            hole.chainBall?.destroy(); hole.chainBall = null;
            hole.chainGfx?.destroy(); hole.chainGfx = null;
            hole.tierEndAt = 0;
          }
          break;

        case 'lust':
          if (time >= hole.tierEndAt && hole.tierEndAt > 0) {
            target.outgoingDamageMult = 1;
            hole.tierEndAt = 0;
          }
          break;

        case 'anger':
          if (time >= hole.tierEndAt && hole.tierEndAt > 0) {
            target.aimOffsetBonusDeg = 0;
            target.aimOffsetBonusUntil = 0;
            hole.tierEndAt = 0;
          }
          break;

        case 'fraud':
          if (time < hole.tierEndAt && hole.squareOverlay) {
            hole.squareOverlay.setPosition(target.x, target.y);
            // Axis-lock movement
            const body = target.body as Phaser.Physics.Arcade.Body;
            if (Math.abs(body.velocity.x) >= Math.abs(body.velocity.y)) {
              body.velocity.y = 0;
            } else {
              body.velocity.x = 0;
            }
          } else if (hole.tierEndAt > 0 && time >= hole.tierEndAt) {
            hole.squareOverlay?.destroy(); hole.squareOverlay = null;
            hole.tierEndAt = 0;
          }
          break;

        case 'violence':
          if (hole.violenceTicks > 0 && time >= hole.nextViolenceTick) {
            hole.violenceTicks--;
            hole.nextViolenceTick = time + 2000;
            target.applySelfDamage(15);
            this.arena.spawnDamageNumber(target.x, target.y - 30, 15);
            // Dagger flash
            const dagger = scene.add.text(target.x + (Math.random() - 0.5) * 20, target.y, '🗡', { fontSize: '18px' })
              .setOrigin(0.5).setDepth(15);
            scene.tweens.add({ targets: dagger, y: dagger.y - 25, alpha: 0, duration: 600, onComplete: () => dagger.destroy() });
          }
          break;

        case 'treachery':
          if (hole.darkAura) hole.darkAura.setPosition(target.x, target.y);
          // Stop when target dies
          if (target.hp <= 0) {
            target.toxicUntil = 0;
            hole.darkAura?.destroy(); hole.darkAura = null;
          }
          break;
      }

      void delta;
    };

    processPayload(this.playerHole, 'player');
    processPayload(this.npcHole, 'npc');
  }

  private getTier(kills: number): JudgementTier {
    if (kills < 5)  return 'limbo';
    if (kills < 10) return 'lust';
    if (kills < 15) return 'gluttony';
    if (kills < 20) return 'greed';
    if (kills < 25) return 'anger';
    if (kills < 30) return 'heresy';
    if (kills < 35) return 'violence';
    if (kills < 40) return 'fraud';
    return 'treachery';
  }

  private tierColor(tier: JudgementTier): number {
    const map: Record<JudgementTier, number> = {
      limbo: 0x55cc55,
      lust: 0xff77cc,
      gluttony: 0x996633,
      greed: 0xddaa22,
      anger: 0xcc2244,
      heresy: 0x777777,
      violence: 0xeeeeee,
      fraud: 0xee8833,
      treachery: 0x111111,
    };
    return map[tier];
  }

  private destroyHole(hole: JudgementHole | null): void {
    if (!hole) return;
    hole.gfx.destroy();
    hole.tendrilGfx.destroy();
    hole.chainBall?.destroy();
    hole.chainGfx?.destroy();
    hole.squareOverlay?.destroy();
    hole.darkAura?.destroy();
    if (hole.suckedFighter) {
      const f = hole.suckedFighter;
      f.isInvincible = false;
      f.forceInvisible = false;
      f.setAlpha(1);
    }
  }

  // ── Click-target finder ───────────────────────────────────────────────────

  private findClickTarget(
    mx: number,
    my: number,
    owner: 'player' | 'npc',
  ): Fighter | DeathWisp | BeastHead | null {
    const opponent = owner === 'player' ? this.arena.npc : this.arena.player;
    const RANGE = (owner === 'player' && this.arena.hasUpgrade('click')) ? 80 : 50;

    const distToOpponent = Phaser.Math.Distance.Between(mx, my, opponent.x, opponent.y);
    if (distToOpponent <= RANGE && opponent.active && opponent.hp > 0) return opponent;

    // Player-owned beast heads (F+ beast attacks player, player fights back)
    if (owner === 'player' && this.playerBeast) {
      for (const head of this.playerBeast.heads) {
        const dh = Phaser.Math.Distance.Between(mx, my, head.x, head.y);
        if (dh <= RANGE) return head;
      }
    }

    // Check own wisps (they chase and attack the summoner, so the summoner must kill them)
    for (const w of this.wisps) {
      if (w.owner !== owner) continue;
      const dw = Phaser.Math.Distance.Between(mx, my, w.sprite.x, w.sprite.y);
      if (dw <= RANGE) return w;
    }
    return null;
  }

  private findLoomingTarget(
    mx: number,
    my: number,
    owner: 'player' | 'npc',
  ): Fighter | DeathWisp | null {
    const RANGE = 80;
    const opponent = owner === 'player' ? this.arena.npc : this.arena.player;
    const distToOpponent = Phaser.Math.Distance.Between(mx, my, opponent.x, opponent.y);
    if (distToOpponent <= RANGE && opponent.active && opponent.hp > 0) return opponent;

    for (const w of this.wisps) {
      if (w.owner !== owner) continue;
      const dw = Phaser.Math.Distance.Between(mx, my, w.sprite.x, w.sprite.y);
      if (dw <= RANGE) return w;
    }
    return null;
  }

  private isBeastHead(target: Fighter | DeathWisp | BeastHead): target is BeastHead {
    return !(target instanceof Fighter) && 'neckAngle' in target;
  }

  // ── Chain drawing helper ──────────────────────────────────────────────────

  private drawChainLine(
    gfx: Phaser.GameObjects.Graphics,
    x1: number, y1: number,
    x2: number, y2: number,
    color: number,
  ): void {
    const d = Phaser.Math.Distance.Between(x1, y1, x2, y2) || 1;
    const dx = x2 - x1, dy = y2 - y1;
    const segments = Math.max(3, Math.floor(d / 20));
    const perpX = -dy / d, perpY = dx / d;
    gfx.lineStyle(3, color, 0.8);
    gfx.beginPath();
    gfx.moveTo(x1, y1);
    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      const px = x1 + dx * t, py = y1 + dy * t;
      const side = i % 2 === 0 ? 1 : -1;
      gfx.lineTo(px + perpX * side * 7, py + perpY * side * 7);
    }
    gfx.strokePath();
  }

  // ── Q+ helpers ────────────────────────────────────────────────────────────

  private getTierByChoice(kills: number): JudgementTier {
    // Pick the highest tier the player can afford (Q+ halved costs)
    let best: JudgementTier = 'limbo';
    for (const tier of DeathKit.TIERS_ORDER) {
      const cost = Math.floor(DeathKit.TIER_COSTS[tier] / 2);
      if (kills >= cost) best = tier;
    }
    return best;
  }

  private openQMenu(): void {
    if (this.qMenuOpen) return;
    const { scene } = this.arena;
    const W = scene.scale.width;
    const panelW = 220, rowH = 30, panelH = DeathKit.TIERS_ORDER.length * rowH + 16;
    const px = W - panelW - 10, py = 90;

    this.qMenuGfx = scene.add.graphics().setDepth(48);
    this.qMenuGfx.fillStyle(0x110022, 0.92);
    this.qMenuGfx.fillRect(px, py, panelW, panelH);
    this.qMenuGfx.lineStyle(2, 0xcc44ff, 1);
    this.qMenuGfx.strokeRect(px, py, panelW, panelH);

    this.qMenuBtnAreas = [];
    this.qMenuLabels = [];

    DeathKit.TIERS_ORDER.forEach((tier, i) => {
      const cost = Math.floor(DeathKit.TIER_COSTS[tier] / 2);
      const canAfford = this.kills >= cost;
      const ry = py + 8 + i * rowH;
      const tierHex = this.tierColor(tier).toString(16).padStart(6, '0');
      const label = scene.add.text(
        px + 8, ry + rowH / 2,
        `${tier.toUpperCase()}  (${cost} 💀)`,
        { fontSize: '13px', fontFamily: 'Arial', color: canAfford ? `#${tierHex}` : '#555555', stroke: '#000000', strokeThickness: 2 },
      ).setOrigin(0, 0.5).setDepth(49);
      this.qMenuLabels.push(label);
      this.qMenuBtnAreas.push({ tier, x: px, y: ry, w: panelW, h: rowH, cost });
    });

    this.qMenuOpen = true;
  }

  private closeQMenu(): void {
    this.qMenuGfx?.destroy(); this.qMenuGfx = null;
    for (const l of this.qMenuLabels) l.destroy();
    this.qMenuLabels = [];
    this.qMenuBtnAreas = [];
    this.qMenuOpen = false;
  }

  private handleQMenuClick(px: number, py: number, mouseX: number, mouseY: number): void {
    void mouseX; void mouseY;
    for (const btn of this.qMenuBtnAreas) {
      if (px >= btn.x && px <= btn.x + btn.w && py >= btn.y && py <= btn.y + btn.h) {
        if (this.kills >= btn.cost) {
          this.kills -= btn.cost;
          this.updateKillsHud();
          const caster = this.arena.player;
          this.spawnHoleForTier(btn.tier, 'player', caster.x, caster.y);
          this.arena.showFloatingText(caster.x, caster.y - 40, `⚫ JUDGEMENT (${btn.tier.toUpperCase()})`, '#cc44ff');
          this.arena.player.triggerCooldown('death-judgement');
        } else {
          this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 30, '⚠ Not enough souls', '#ff6644');
        }
        this.closeQMenu();
        return;
      }
    }
  }

  private autoPickQMenu(mouseX: number, mouseY: number): void {
    void mouseX; void mouseY;
    // Find highest-cost affordable tier
    let bestTier: JudgementTier = 'limbo';
    let bestCost = 0;
    for (const btn of this.qMenuBtnAreas) {
      if (this.kills >= btn.cost && btn.cost >= bestCost) {
        bestTier = btn.tier;
        bestCost = btn.cost;
      }
    }
    this.kills -= bestCost;
    this.updateKillsHud();
    const caster = this.arena.player;
    this.spawnHoleForTier(bestTier, 'player', caster.x, caster.y);
    this.arena.showFloatingText(caster.x, caster.y - 40, `⚫ JUDGEMENT (${bestTier.toUpperCase()})`, '#cc44ff');
    this.arena.player.triggerCooldown('death-judgement');
    this.closeQMenu();
  }

  // ── E+ Ferryman ────────────────────────────────────────────────────────────

  private spawnFerryman(): void {
    const { scene } = this.arena;
    const ringX = 165, ringY = 52, ringRadius = 28;

    const boatGfx = scene.add.graphics().setDepth(3);
    // Boat hull
    boatGfx.fillStyle(0x5c3a1e, 1);
    boatGfx.fillRect(55, 44, 85, 16);
    // Ferryman figure
    boatGfx.fillStyle(0x222222, 1);
    boatGfx.fillRect(88, 30, 10, 18); // body
    boatGfx.fillCircle(93, 27, 7);    // hood/head

    const ringGfx = scene.add.graphics().setDepth(3);
    this.drawFerrymanRing(ringGfx, ringX, ringY, ringRadius, 0x44ff88, 0.7);

    this.ferryman = {
      boatGfx, ringGfx,
      ringX, ringY, ringRadius,
      ringVisible: true,
      ringActiveUntil: 0,
      ringReappearAt: 0,
      playerInsideRing: false,
    };
  }

  private drawFerrymanRing(gfx: Phaser.GameObjects.Graphics, x: number, y: number, r: number, color: number, alpha: number): void {
    gfx.clear();
    gfx.lineStyle(3, color, alpha);
    gfx.strokeCircle(x, y, r);
    gfx.fillStyle(color, alpha * 0.2);
    gfx.fillCircle(x, y, r);
  }

  private updateFerrymanRing(time: number): void {
    if (!this.ferryman || this.arena.elementId !== 'death') return;
    const f = this.ferryman;
    const { player } = this.arena;

    // Ring reappear check
    if (!f.ringVisible && f.ringReappearAt > 0 && time >= f.ringReappearAt) {
      f.ringVisible = true;
      f.playerInsideRing = false;
      f.ringActiveUntil = 0;
      f.ringReappearAt = 0;
      this.drawFerrymanRing(f.ringGfx, f.ringX, f.ringY, f.ringRadius, 0x44ff88, 0.7);
    }

    // Ring active timer expiry
    if (f.ringActiveUntil > 0 && time >= f.ringActiveUntil) {
      f.ringVisible = false;
      f.ringGfx.clear();
      f.ringReappearAt = time + 8000;
      f.playerInsideRing = false;
      this.ferrymanInRingActive = false;
      player.isInvincible = false; // river will re-set it next frame if still in river
      this.closeFerrymanShop();
      return;
    }

    if (!f.ringVisible) return;

    // Player proximity check
    const d = Phaser.Math.Distance.Between(player.x, player.y, f.ringX, f.ringY);
    if (d <= f.ringRadius) {
      if (!f.playerInsideRing) {
        f.playerInsideRing = true;
        f.ringActiveUntil = time + 3000;
        this.ferrymanInRingActive = true;
        this.drawFerrymanRing(f.ringGfx, f.ringX, f.ringY, f.ringRadius, 0x44ff88, 1.0);
        this.arena.showFloatingText(player.x, player.y - 35, '⛵ Press E for shop', '#44ff88');
      }
      player.isInvincible = true;
    } else {
      if (f.playerInsideRing && f.ringActiveUntil === 0) {
        // Stepped out before timer expired — should not happen since timer set on entry
      }
      if (!f.playerInsideRing) this.ferrymanInRingActive = false;
    }
  }

  private openFerrymanShop(): void {
    if (this.ferrymanShopOpen) return;
    const { scene } = this.arena;
    const W = scene.scale.width, H = scene.scale.height;
    const cols = 3, rows = 3;
    const cellW = 170, cellH = 65;
    const panelW = cols * cellW + 16, panelH = rows * cellH + 16 + 24;
    const px = (W - panelW) / 2, py = (H - panelH) / 2;

    this.ferrymanShopGfx = scene.add.graphics().setDepth(50);
    this.ferrymanShopGfx.fillStyle(0x110022, 0.95);
    this.ferrymanShopGfx.fillRect(px, py, panelW, panelH);
    this.ferrymanShopGfx.lineStyle(2, 0x44ff88, 1);
    this.ferrymanShopGfx.strokeRect(px, py, panelW, panelH);

    const title = scene.add.text(px + panelW / 2, py + 12, '⛵ Ferryman\'s Wares', {
      fontSize: '14px', fontFamily: 'Arial', color: '#44ff88', stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5, 0).setDepth(51);
    this.ferrymanShopLabels.push(title);

    const products = this.ferrymanProducts();
    this.ferrymanBtnAreas = [];

    products.forEach((p, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const cx = px + 8 + col * cellW;
      const cy = py + 32 + row * cellH;
      const owned = p.owned ? p.owned() : false;
      const canAfford = this.kills >= p.cost;

      // Card bg
      const cardColor = owned ? 0x222222 : (canAfford ? 0x002211 : 0x110000);
      this.ferrymanShopGfx!.fillStyle(cardColor, 1);
      this.ferrymanShopGfx!.fillRect(cx, cy, cellW - 4, cellH - 4);
      this.ferrymanShopGfx!.lineStyle(1, owned ? 0x555555 : (canAfford ? 0x44ff88 : 0x441111), 0.8);
      this.ferrymanShopGfx!.strokeRect(cx, cy, cellW - 4, cellH - 4);

      const nameColor = owned ? '#555555' : (canAfford ? '#ffffff' : '#883333');
      const nameLabel = scene.add.text(cx + 4, cy + 6, p.name, {
        fontSize: '11px', fontFamily: 'Arial', color: nameColor, stroke: '#000000', strokeThickness: 2,
      }).setDepth(51);
      const costLabel = scene.add.text(cx + 4, cy + 22, owned ? 'OWNED' : `${p.cost} 💀`, {
        fontSize: '11px', fontFamily: 'Arial', color: owned ? '#555555' : '#cc88ff', stroke: '#000000', strokeThickness: 1,
      }).setDepth(51);
      const descLabel = scene.add.text(cx + 4, cy + 38, p.desc, {
        fontSize: '9px', fontFamily: 'Arial', color: '#888888', wordWrap: { width: cellW - 10 },
      }).setDepth(51);
      this.ferrymanShopLabels.push(nameLabel, costLabel, descLabel);

      if (!owned || p.repeatable) {
        this.ferrymanBtnAreas.push({ x: cx, y: cy, w: cellW - 4, h: cellH - 4, idx: i });
      }
    });

    this.ferrymanShopOpen = true;
  }

  private closeFerrymanShop(): void {
    this.ferrymanShopGfx?.destroy(); this.ferrymanShopGfx = null;
    for (const l of this.ferrymanShopLabels) l.destroy();
    this.ferrymanShopLabels = [];
    this.ferrymanBtnAreas = [];
    this.ferrymanShopOpen = false;
  }

  private handleFerrymanShopClick(px: number, py: number): void {
    for (const btn of this.ferrymanBtnAreas) {
      if (px >= btn.x && px <= btn.x + btn.w && py >= btn.y && py <= btn.y + btn.h) {
        const products = this.ferrymanProducts();
        const p = products[btn.idx];
        if (p && this.kills >= p.cost) {
          const owned = p.owned ? p.owned() : false;
          if (!owned || p.repeatable) {
            this.kills -= p.cost;
            this.updateKillsHud();
            p.apply(this.arena.scene.time.now);
            this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 30, `-${p.cost} 💀 ${p.name}`, '#44ff88');
          }
        } else {
          this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 30, '⚠ Not enough souls', '#ff6644');
        }
        // Redraw shop to reflect updated state
        this.closeFerrymanShop();
        this.openFerrymanShop();
        return;
      }
    }
  }

  private ferrymanProducts(): Array<{ name: string; cost: number; desc: string; repeatable?: boolean; owned?: () => boolean; apply: (time: number) => void }> {
    return [
      {
        name: 'Wisp Armor', cost: 10, desc: 'Wisps: HP ×1.5, give ×2 kills',
        owned: () => this.wispArmorOwned,
        apply: () => { this.wispArmorOwned = true; },
      },
      {
        name: 'Wisp Screamers', cost: 10, desc: 'Wisps fire bolts, give ×2 kills',
        owned: () => this.wispScreamersOwned,
        apply: () => { this.wispScreamersOwned = true; },
      },
      {
        name: 'Swift Scythe', cost: 5, desc: 'R fuses in 3s instead of 5s',
        owned: () => this.swiftScytheOwned,
        apply: () => { this.swiftScytheOwned = true; },
      },
      {
        name: 'Critical Success', cost: 15, desc: 'Every 10th click deals ×2',
        owned: () => this.critSuccessOwned,
        apply: () => { this.critSuccessOwned = true; },
      },
      {
        name: 'Wisp Bane', cost: 20, desc: 'Clicks vs wisps/beast deal ×2',
        owned: () => this.wispBaneOwned,
        apply: () => { this.wispBaneOwned = true; },
      },
      {
        name: 'Daemon King', cost: 5, desc: 'Daemon HP ×2, Trail Dash ×2 duration',
        owned: () => this.daemonKingOwned,
        apply: () => { this.daemonKingOwned = true; },
      },
      {
        name: 'Blade Apex', cost: 10, desc: 'Trail slashes last 10s (vs 5s)',
        owned: () => this.bladeApexOwned,
        apply: () => { this.bladeApexOwned = true; },
      },
      {
        name: 'Edge of Finality', cost: 25, desc: 'Hole arms in 5s, bigger suck range',
        owned: () => this.edgeFinalityOwned,
        apply: () => { this.edgeFinalityOwned = true; },
      },
      {
        name: 'Splice', cost: 5, desc: 'Gain Trail Dash for 10s', repeatable: true,
        apply: (time: number) => {
          this.trailDashUntil = Math.max(this.trailDashUntil, time + 10000);
          this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 50, '💨 SOUL SPLICE 10s!', '#cc88ff');
        },
      },
    ];
  }

  // ── F+ Three-Headed Beast ─────────────────────────────────────────────────

  private spawnBeast(owner: 'player' | 'npc'): void {
    const { scene } = this.arena;
    const W = scene.scale.width;
    const anchorX = W / 2, anchorY = 100;
    const neckBaseLen = 50;

    const heads: BeastHead[] = [-Math.PI / 6, 0, Math.PI / 6].map((neckAngle, _i) => {
      const hx = anchorX + Math.sin(neckAngle) * neckBaseLen;
      const hy = anchorY + Math.cos(neckAngle) * neckBaseLen;
      const gfx = scene.add.graphics().setDepth(6);
      const neckGfx = scene.add.graphics().setDepth(5);
      const hpBarBg = scene.add.rectangle(hx, hy - 22, 36, 5, 0x220022, 0.85).setDepth(7).setOrigin(0.5, 0.5);
      const hpBarFill = scene.add.rectangle(hx - 18, hy - 22, 36, 5, 0xff3366, 1).setDepth(8).setOrigin(0, 0.5);
      return { hp: 50, maxHp: 50, neckAngle, neckBaseLen, neckLen: neckBaseLen, x: hx, y: hy, gfx, neckGfx, hpBarBg, hpBarFill, nextActionAt: scene.time.now + 1000 + Math.random() * 2000, mode: 'idle' as const, modeEndsAt: 0, lastContactAt: 0 };
    });

    this.playerBeast = { heads, anchorX, anchorY, owner };
  }

  private updateBeast(time: number, delta: number): void {
    if (!this.playerBeast) return;
    const beast = this.playerBeast;
    const { player, scene } = this.arena;

    for (let hi = beast.heads.length - 1; hi >= 0; hi--) {
      const head = beast.heads[hi];

      // Dead head cleanup
      if (head.hp <= 0) {
        head.gfx.destroy();
        head.neckGfx.destroy();
        head.hpBarBg.destroy();
        head.hpBarFill.destroy();
        beast.heads.splice(hi, 1);
        this.arena.showFloatingText(head.x, head.y, 'HEAD DESTROYED!', '#cc44ff');
        continue;
      }

      // Action selection (idle heads pick next action)
      if (head.mode === 'idle' && time >= head.nextActionAt) {
        if (Math.random() < 0.5) {
          head.mode = 'lunge';
          head.modeEndsAt = time + 800;
          head.lastContactAt = 0;
        } else {
          head.mode = 'barrage';
          head.modeEndsAt = time + 400;
          // Fire immediately
          const baseAngle = Math.atan2(player.y - head.y, player.x - head.x);
          for (let i = -1; i <= 1; i++) {
            const angle = baseAngle + i * 0.25;
            const bolt = this.arena.projectiles.get(head.x, head.y, 'proj-death-bolt') as any;
            if (bolt) {
              bolt.setActive(true).setVisible(true).setDepth(6);
              bolt.isFromPlayer = false; // hurts the player
              bolt.isDeathSource = true;
              bolt.damage = 8;
              (bolt.body as Phaser.Physics.Arcade.Body).setVelocity(Math.cos(angle) * 300, Math.sin(angle) * 300);
            }
          }
        }
      }

      // Lunge animation
      if (head.mode === 'lunge') {
        const t = Phaser.Math.Clamp(1 - (head.modeEndsAt - time) / 800, 0, 1);
        head.neckLen = head.neckBaseLen + (130 - head.neckBaseLen) * Math.sin(t * Math.PI);
        // Contact check
        if (head.neckLen > 80 && time - head.lastContactAt > 500) {
          const d = Phaser.Math.Distance.Between(head.x, head.y, player.x, player.y);
          if (d <= 38 && player.active && player.hp > 0) {
            player.takeDamage(12);
            this.arena.spawnHitFlash(player.x, player.y, 0xff3366);
            this.arena.spawnDamageNumber(player.x, player.y - 20, 12);
            head.lastContactAt = time;
          }
        }
        if (time >= head.modeEndsAt) {
          head.mode = 'idle';
          head.neckLen = head.neckBaseLen;
          head.nextActionAt = time + 1500 + Math.random() * 1500;
        }
      }

      if (head.mode === 'barrage' && time >= head.modeEndsAt) {
        head.mode = 'idle';
        head.nextActionAt = time + 2000 + Math.random() * 2000;
      }

      // Update head position
      head.x = beast.anchorX + Math.sin(head.neckAngle) * head.neckLen;
      head.y = beast.anchorY + Math.cos(head.neckAngle) * head.neckLen;

      // Draw neck
      head.neckGfx.clear();
      head.neckGfx.lineStyle(4, 0x440044, 0.9);
      head.neckGfx.beginPath();
      head.neckGfx.moveTo(beast.anchorX, beast.anchorY);
      head.neckGfx.lineTo(head.x, head.y);
      head.neckGfx.strokePath();

      // Draw head circle
      head.gfx.clear();
      head.gfx.fillStyle(0xff3366, 0.9);
      head.gfx.fillCircle(head.x, head.y, 14);
      head.gfx.lineStyle(2, 0xcc0044, 1);
      head.gfx.strokeCircle(head.x, head.y, 14);

      // HP bar
      const ratio = Math.max(0, head.hp / head.maxHp);
      head.hpBarBg.setPosition(head.x, head.y - 22);
      head.hpBarFill.setPosition(head.x - 18, head.y - 22).setSize(36 * ratio, 5);

      void delta;
    }

    // Check if all heads are dead
    if (beast.heads.length === 0) {
      this.playerBeast = null;
      this.daemonAlive = false;
      // Grant reward
      const time2 = scene.time.now;
      this.kills += 10;
      const dashDuration = this.daemonKingOwned ? 60000 : 30000;
      this.trailDashUntil = time2 + dashDuration;
      this.triDashEnabled = true;
      this.updateKillsHud();
      this.arena.showFloatingText(player.x, player.y - 50, '💀 BEAST SLAIN! +10 💀', '#cc44ff');
      this.arena.showFloatingText(player.x, player.y - 70, '💨 3-SLASH TRAIL DASH!', '#ff3366');
    }
  }

  private destroyBeast(beast: BeastState | null): void {
    if (!beast) return;
    for (const head of beast.heads) {
      head.gfx.destroy();
      head.neckGfx.destroy();
      head.hpBarBg.destroy();
      head.hpBarFill.destroy();
    }
  }
}
