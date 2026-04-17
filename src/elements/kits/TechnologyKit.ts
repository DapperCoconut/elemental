import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';

// ── TechArenaApi ──────────────────────────────────────────────────────────

export interface TechArenaApi {
  readonly player: Fighter;
  readonly npc: Fighter;
  readonly scene: Phaser.Scene;
  readonly projectiles: Phaser.Physics.Arcade.Group;
  readonly elementId: string;
  readonly npcElementId: string;
  readonly eKey: Phaser.Input.Keyboard.Key;
  readonly rKey: Phaser.Input.Keyboard.Key;
  readonly fKey: Phaser.Input.Keyboard.Key;
  readonly qKey: Phaser.Input.Keyboard.Key;
  readonly nukeChanneling: boolean;
  readonly mutations: ReadonlySet<string>;
  spawnHitFlash(x: number, y: number, color: number): void;
  spawnDamageNumber(x: number, y: number, amount: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  spawnFloatingText(x: number, y: number, text: string, color: string): void;
  buildPlayerContext(x: number, y: number): CastContext;
  buildNpcContext(x: number, y: number): CastContext;
  dealAoeDamageFromOwner(x: number, y: number, radius: number, damage: number, owner: 'player' | 'npc'): void;
  resetPhysicsBounds(): void;
}

// ── TechnologyKit ─────────────────────────────────────────────────────────

export class TechnologyKit {
  // ── Dev.Console ───────────────────────────────────────────────────────
  private techConsoleActive = false;
  private techConsoleEndAt = 0;
  private techConsoleKeyCount = 0;
  private techConsoleBox: Phaser.GameObjects.Rectangle | null = null;
  private techConsoleText: Phaser.GameObjects.Text | null = null;
  private techConsoleKeyListener: ((e: KeyboardEvent) => void) | null = null;
  private npcTechConsoleActive = false;
  private npcTechConsoleEndAt = 0;
  private npcTechConsoleKeyCount = 0;
  private npcTechConsoleNextTypeAt = 0;
  private npcTechConsoleTypeRate = 100;
  private npcTechConsoleBox: Phaser.GameObjects.Rectangle | null = null;
  private npcTechConsoleText: Phaser.GameObjects.Text | null = null;

  // ── Abuse meter ────────────────────────────────────────────────────────
  private playerAbuse = 0;
  private playerTechSpeedBonus = 0;
  private playerTechDamageBonus = 0;
  private playerTechHackExpiries: number[] = [];
  private playerAbuseBarBg: Phaser.GameObjects.Rectangle | null = null;
  private playerAbuseBarFill: Phaser.GameObjects.Rectangle | null = null;
  private npcAbuse = 0;
  private npcTechSpeedBonus = 0;
  private npcTechDamageBonus = 0;
  private npcTechHackExpiries: number[] = [];
  private npcAbuseBarBg: Phaser.GameObjects.Rectangle | null = null;
  private npcAbuseBarFill: Phaser.GameObjects.Rectangle | null = null;

  // ── OP.Self phases (0=inactive, 1=godmode, 2=invis, 3=jail) ─────────
  private playerOpSelfPhase: 0 | 1 | 2 | 3 = 0;
  private playerOpSelfPhaseEnd = 0;
  private playerOpSelfInvisActive = false;
  private npcOpSelfPhase: 0 | 1 | 2 | 3 = 0;
  private npcOpSelfPhaseEnd = 0;
  private npcOpSelfInvisActive = false;

  // ── Jail boxes ────────────────────────────────────────────────────────
  private techJailBoxNpc: { graphics: Phaser.GameObjects.Graphics | null; x: number; y: number; w: number; h: number; lastDmgAt: number } | null = null;
  private techJailBoxPlayer: { graphics: Phaser.GameObjects.Graphics | null; x: number; y: number; w: number; h: number; lastDmgAt: number } | null = null;

  // ── Domain Expansion ──────────────────────────────────────────────────
  private techDomainActive = false;
  private techDomainExpiry = 0;
  private techDomainCenterX = 0;
  private techDomainCenterY = 0;
  private readonly techDomainBaseRadius = 220;
  private techDomainInstability = 0;
  private techDomainBias = 0;
  private techDomainCollapse = 0;
  private techDomainAbuse = 0;
  private techDomainOverlay: Phaser.GameObjects.Rectangle | null = null;
  private techDomainCircle: Phaser.GameObjects.Graphics | null = null;
  private techDomainShards: Phaser.GameObjects.Image[] = [];
  private techDomainShardAngleOffset = 0;
  private techDomainSliderBgs: Phaser.GameObjects.Rectangle[] = [];
  private techDomainSliderFills: Phaser.GameObjects.Rectangle[] = [];
  private techDomainSliderKnobs: Phaser.GameObjects.Rectangle[] = [];
  private techDomainSliderLabels: Phaser.GameObjects.Text[] = [];
  private techDomainAbuseBarBg: Phaser.GameObjects.Rectangle | null = null;
  private techDomainAbuseBarFill: Phaser.GameObjects.Rectangle | null = null;
  private techDomainAbuseLabel: Phaser.GameObjects.Text | null = null;
  private techDomainDraggingSlider = -1;
  private techDomainExplosionAccum = 0;
  private techDomainShardProjAccum = 0;
  private techDomainBorderTickAccum = 0;
  private techDomainSavedPlayerX = 0;
  private techDomainSavedPlayerY = 0;
  private techDomainSavedNpcX = 0;
  private techDomainSavedNpcY = 0;

  // ── Angry Protestors ──────────────────────────────────────────────────
  private playerProtestorsSpawned = false;
  private npcProtestorsSpawned = false;
  private protestors: Array<{ sprite: Phaser.GameObjects.Sprite; hpBar: Phaser.GameObjects.Graphics; hp: number; maxHp: number; target: 'player' | 'npc'; nextHitAt: number }> = [];

  // ── Gift permanent buffs ───────────────────────────────────────────────
  private npcTechGiftSpeedBonus = 0;
  private npcTechGiftDamageBonus = 0;
  private playerTechGiftSpeedBonus = 0;
  private playerTechGiftDamageBonus = 0;

  // ── Gear.Give (item box & active weapon) ──────────────────────────────
  private techClickArmed = false;
  private techGearBoxActive = false;
  private techGearBoxWeapon = 0; // 0=sword-whip 1=disc-dancer 2=helix-shot 3=code-cruncher
  private techGearBoxCycleAccum = 0;
  private techGearBoxGraphics: Phaser.GameObjects.Graphics | null = null;
  private techGearBoxLabel: Phaser.GameObjects.Text | null = null;
  private techActiveWeapon: -1 | 0 | 1 | 2 | 3 = -1;
  private techActiveWeaponExpiry = 0;
  private techWeaponLastFireAt = 0;
  private techHelixToggle = false;

  // ── Disc Dancer projectile pairs ──────────────────────────────────────
  private techDiscPairs: Array<{
    s1: Phaser.GameObjects.Sprite; s2: Phaser.GameObjects.Sprite;
    x1: number; y1: number; x2: number; y2: number;
    vx: number; vy: number;
    perpX: number; perpY: number;
    offset: number; // current perpendicular spread (px)
    phase: number; // 0=parallel 1=converge1 2=spread1 3=parallel2 4=converge2 5=done
    phaseTimer: number;
    owner: 'player' | 'npc';
    lastHitAt: number;
  }> = [];

  // ── Code Cruncher sticky grenades ─────────────────────────────────────
  private techStickyGrenades: Array<{
    sprite: Phaser.GameObjects.Sprite;
    x: number; y: number;
    vx: number; vy: number;
    stuck: boolean;
    stuckToNpc: boolean;
    explodeAt: number;
    owner: 'player' | 'npc';
  }> = [];

  // ── Dev.Console new effects ───────────────────────────────────────────
  private techVirusEndAt = 0;
  private techVirusNextTickAt = 0;
  private npcTechVirusEndAt = 0;
  private npcTechVirusNextTickAt = 0;
  private techRansomwareTarget: 'player' | 'npc' | null = null;
  private techRansomwareExpiry = 0;
  private techTrojanDrops: Array<{
    sprite: Phaser.GameObjects.Sprite | null;
    shadow: Phaser.GameObjects.Ellipse | null;
    x: number; y: number;
    landed: boolean;
    landAt: number;
    hitbox: Phaser.GameObjects.Rectangle | null;
    lastHitAt: number;
    owner: 'player' | 'npc';
  }> = [];

  constructor(private arena: TechArenaApi) {}

  // ── Public accessors ──────────────────────────────────────────────────

  getPlayerAbuse(): number { return this.playerAbuse; }
  getNpcAbuse(): number { return this.npcAbuse; }
  getPlayerOpSelfPhase(): 0 | 1 | 2 | 3 { return this.playerOpSelfPhase; }
  getNpcOpSelfPhase(): 0 | 1 | 2 | 3 { return this.npcOpSelfPhase; }
  getPlayerTechSpeedBonus(): number { return this.playerTechSpeedBonus; }
  getNpcTechSpeedBonus(): number { return this.npcTechSpeedBonus; }
  getPlayerTechGiftSpeedBonus(): number { return this.playerTechGiftSpeedBonus; }
  getNpcTechGiftSpeedBonus(): number { return this.npcTechGiftSpeedBonus; }
  isTechDomainActive(): boolean { return this.techDomainActive; }
  getTechDomainBias(): number { return this.techDomainBias; }
  getTechRansomwareTarget(): 'player' | 'npc' | null { return this.techRansomwareTarget; }
  getTechRansomwareExpiry(): number { return this.techRansomwareExpiry; }

  // ── reset() ───────────────────────────────────────────────────────────

  reset(): void {
    if (this.techDomainActive) this.techEndDomain();

    if (this.techConsoleKeyListener) { window.removeEventListener('keydown', this.techConsoleKeyListener); this.techConsoleKeyListener = null; }
    if (this.techConsoleBox) { this.techConsoleBox.destroy(); this.techConsoleBox = null; }
    if (this.techConsoleText) { this.techConsoleText.destroy(); this.techConsoleText = null; }
    if (this.npcTechConsoleBox) { this.npcTechConsoleBox.destroy(); this.npcTechConsoleBox = null; }
    if (this.npcTechConsoleText) { this.npcTechConsoleText.destroy(); this.npcTechConsoleText = null; }
    this.techConsoleActive = false; this.techConsoleEndAt = 0; this.techConsoleKeyCount = 0;
    this.npcTechConsoleActive = false; this.npcTechConsoleEndAt = 0; this.npcTechConsoleKeyCount = 0; this.npcTechConsoleNextTypeAt = 0;
    this.playerAbuse = 0; this.playerTechSpeedBonus = 0; this.playerTechDamageBonus = 0; this.playerTechHackExpiries = [];
    if (this.playerAbuseBarBg) { this.playerAbuseBarBg.destroy(); this.playerAbuseBarBg = null; }
    if (this.playerAbuseBarFill) { this.playerAbuseBarFill.destroy(); this.playerAbuseBarFill = null; }
    this.npcAbuse = 0; this.npcTechSpeedBonus = 0; this.npcTechDamageBonus = 0; this.npcTechHackExpiries = [];
    if (this.npcAbuseBarBg) { this.npcAbuseBarBg.destroy(); this.npcAbuseBarBg = null; }
    if (this.npcAbuseBarFill) { this.npcAbuseBarFill.destroy(); this.npcAbuseBarFill = null; }
    this.playerOpSelfPhase = 0; this.playerOpSelfPhaseEnd = 0; this.playerOpSelfInvisActive = false;
    this.npcOpSelfPhase = 0; this.npcOpSelfPhaseEnd = 0; this.npcOpSelfInvisActive = false;
    if (this.techJailBoxNpc) { this.techJailBoxNpc.graphics?.destroy(); this.techJailBoxNpc = null; }
    if (this.techJailBoxPlayer) { this.techJailBoxPlayer.graphics?.destroy(); this.techJailBoxPlayer = null; }
    this.techDomainActive = false; this.techDomainExpiry = 0;
    this.techDomainInstability = 0; this.techDomainBias = 0; this.techDomainCollapse = 0; this.techDomainAbuse = 0;
    this.techDomainShardAngleOffset = 0; this.techDomainExplosionAccum = 0;
    this.techDomainShardProjAccum = 0; this.techDomainBorderTickAccum = 0; this.techDomainDraggingSlider = -1;
    this.playerProtestorsSpawned = false; this.npcProtestorsSpawned = false;
    for (const p of this.protestors) { p.sprite.destroy(); p.hpBar.destroy(); }
    this.protestors = [];
    this.npcTechGiftSpeedBonus = 0; this.npcTechGiftDamageBonus = 0;
    this.playerTechGiftSpeedBonus = 0; this.playerTechGiftDamageBonus = 0;
    this.techClickArmed = false;
    this.techGearBoxActive = false; this.techGearBoxWeapon = 0; this.techGearBoxCycleAccum = 0;
    if (this.techGearBoxGraphics) { this.techGearBoxGraphics.destroy(); this.techGearBoxGraphics = null; }
    if (this.techGearBoxLabel) { this.techGearBoxLabel.destroy(); this.techGearBoxLabel = null; }
    this.techActiveWeapon = -1; this.techActiveWeaponExpiry = 0; this.techWeaponLastFireAt = 0; this.techHelixToggle = false;
    for (const dp of this.techDiscPairs) { dp.s1.destroy(); dp.s2.destroy(); }
    this.techDiscPairs = [];
    for (const g of this.techStickyGrenades) g.sprite.destroy();
    this.techStickyGrenades = [];
    this.techVirusEndAt = 0; this.techVirusNextTickAt = 0;
    this.npcTechVirusEndAt = 0; this.npcTechVirusNextTickAt = 0;
    this.techRansomwareTarget = null; this.techRansomwareExpiry = 0;
    for (const d of this.techTrojanDrops) {
      d.sprite?.destroy(); d.shadow?.destroy(); d.hitbox?.destroy();
    }
    this.techTrojanDrops = [];
  }

  // ── handleInput (formerly handleTechnologyInput) ──────────────────────

  handleInput(time: number, _pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    if (this.arena.nukeChanneling) return;
    const ctx = this.arena.buildPlayerContext(mouseX, mouseY);
    const ransomwared = this.techRansomwareTarget === 'player' && time < this.techRansomwareExpiry;
    const ptr = this.arena.scene.input.activePointer;
    const clickDown = ptr.leftButtonDown();
    const clickJustDown = clickDown && !this.techClickArmed;
    if (clickJustDown) this.techClickArmed = true;
    if (!clickDown) this.techClickArmed = false;

    // Click: Gear.Give box open/select, or active weapon attack
    let clickConsumedByBox = false;
    if (clickJustDown) {
      if (this.techGearBoxActive) {
        // Select displayed weapon — consume this click
        this.doTechGearGiveActivate('player');
        clickConsumedByBox = true;
      } else if (this.techActiveWeapon === -1) {
        // Open item box
        this.doTechGearGiveActivate('player');
        clickConsumedByBox = true;
      }
    }
    // Weapon attacks (some need just-down, helix-shot needs held)
    if (!clickConsumedByBox && this.techActiveWeapon >= 0 && time < this.techActiveWeaponExpiry) {
      const w = this.techActiveWeapon;
      if (w === 0 && clickJustDown) this.doTechSwordWhip('player', mouseX, mouseY, time);
      else if (w === 1 && clickJustDown) this.doTechDiscDancer('player', mouseX, mouseY);
      else if (w === 2 && clickDown) this.doTechHelixShot('player', mouseX, mouseY, time);
      else if (w === 3 && clickJustDown) this.doTechCodeCruncher('player', mouseX, mouseY);
    }

    // E: Dev.Console
    if (Phaser.Input.Keyboard.JustDown(this.arena.eKey) && !this.techConsoleActive && this.arena.player.getCooldownRatio('tech-devconsole') >= 1) {
      this.arena.player.castAbility('tech-devconsole', ctx);
    }

    // R: Randomize.Exe (blocked by ransomware)
    if (Phaser.Input.Keyboard.JustDown(this.arena.rKey) && !ransomwared) {
      this.arena.player.castAbility('tech-random-r', ctx);
    }

    // F: Player.Gift (blocked by ransomware)
    if (Phaser.Input.Keyboard.JustDown(this.arena.fKey) && !ransomwared) {
      this.arena.player.castAbility('tech-gift', ctx);
    }

    // Q: Domain.Expansion (blocked by ransomware)
    if (Phaser.Input.Keyboard.JustDown(this.arena.qKey) && !this.techDomainActive && this.techDomainDraggingSlider < 0 && !ransomwared) {
      this.arena.player.castAbility('tech-domain', ctx);
    }

    void time;
  }

  // ── Public do* methods ────────────────────────────────────────────────

  doTechDevConsoleOpen(owner: 'player' | 'npc'): void {
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const now = this.arena.scene.time.now;

    if (owner === 'player') {
      this.techConsoleActive = true;
      this.techConsoleEndAt = now + 3000;
      this.techConsoleKeyCount = 0;

      // Create console box above player
      this.techConsoleBox = this.arena.scene.add.rectangle(caster.x, caster.y - 60, 160, 36, 0x002211, 0.85)
        .setStrokeStyle(2, 0x44ccaa).setDepth(25);
      this.techConsoleText = this.arena.scene.add.text(caster.x, caster.y - 60, '> _ [0]', {
        fontSize: '14px', color: '#44ffcc', fontFamily: 'monospace',
      }).setOrigin(0.5).setDepth(26);

      // Install DOM keydown listener — count unique key presses (no auto-repeat)
      const listener = (e: KeyboardEvent) => {
        if (!this.techConsoleActive) return;
        if (e.repeat) return; // ignore key-repeat events
        if (e.key.length === 1) { // printable character
          this.techConsoleKeyCount++;
        }
      };
      this.techConsoleKeyListener = listener;
      // Delay listener by one frame so the E keydown that opened the console isn't counted
      this.arena.scene.time.delayedCall(50, () => { if (this.techConsoleActive) window.addEventListener('keydown', listener); });
    } else {
      this.npcTechConsoleActive = true;
      this.npcTechConsoleEndAt = now + 3000;
      this.npcTechConsoleKeyCount = 0;
      this.npcTechConsoleNextTypeAt = now + 80;
      this.npcTechConsoleTypeRate = 60 + Math.floor(Math.random() * 100);

      this.npcTechConsoleBox = this.arena.scene.add.rectangle(caster.x, caster.y - 60, 160, 36, 0x002211, 0.85)
        .setStrokeStyle(2, 0x44ccaa).setDepth(25);
      this.npcTechConsoleText = this.arena.scene.add.text(caster.x, caster.y - 60, '> _ [0]', {
        fontSize: '14px', color: '#44ffcc', fontFamily: 'monospace',
      }).setOrigin(0.5).setDepth(26);
    }
  }

  private closeTechDevConsole(owner: 'player' | 'npc'): void {
    const now = this.arena.scene.time.now;
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const target = owner === 'player' ? this.arena.npc : this.arena.player;
    const keyCount = owner === 'player' ? this.techConsoleKeyCount : this.npcTechConsoleKeyCount;
    const damageMult = owner === 'player' ? (1 + this.playerTechDamageBonus) : (1 + this.npcTechDamageBonus);
    const ptr = this.arena.scene.input.activePointer;
    const tx = owner === 'player' ? ptr.worldX : this.arena.player.x;
    const ty = owner === 'player' ? ptr.worldY : this.arena.player.y;

    if (keyCount === 0) {
      // 0 chars: screen-wide beam
      const W = this.arena.scene.scale.width;
      const beamDmg = Math.round(10 * damageMult);
      const beam = this.arena.scene.add.rectangle(W / 2, caster.y, W, 20, 0x44ccaa, 0.7).setDepth(18);
      if (Math.abs(target.y - caster.y) <= 24) {
        target.takeDamage(beamDmg);
        this.arena.spawnDamageNumber(target.x, target.y - 28, beamDmg);
        this.arena.spawnHitFlash(target.x, target.y, 0x44ccaa);
      }
      this.arena.scene.time.delayedCall(200, () => { beam.destroy(); });
    } else if (keyCount <= 9) {
      // 1-9 chars: VIRUS — self tick damage for 5s
      if (owner === 'player') {
        this.techVirusEndAt = now + 5000;
        this.techVirusNextTickAt = now + 500;
      } else {
        this.npcTechVirusEndAt = now + 5000;
        this.npcTechVirusNextTickAt = now + 500;
      }
    } else if (keyCount <= 20) {
      // 10-20 chars: MALWARE — large blue square projectile (20 dmg)
      const angle = Math.atan2(ty - caster.y, tx - caster.x);
      const malware = this.arena.projectiles.create(caster.x, caster.y, 'proj-tech-malware') as Phaser.Physics.Arcade.Sprite;
      malware.setDepth(14).setScale(1.2);
      (malware as unknown as { isFromPlayer: boolean }).isFromPlayer = (owner === 'player');
      (malware as unknown as { damage: number }).damage = Math.round(20 * damageMult);
      (malware as unknown as { hitEnemy: boolean }).hitEnemy = false;
      malware.setRotation(angle);
      (malware.body as Phaser.Physics.Arcade.Body).setVelocity(Math.cos(angle) * 220, Math.sin(angle) * 220);
      this.arena.scene.time.delayedCall(3000, () => { if (malware.active) malware.destroy(); });
    } else if (keyCount <= 40) {
      // 21-40 chars: RANSOMWARE — orange circle, locks enemy non-click abilities 5s
      const angle = Math.atan2(ty - caster.y, tx - caster.x);
      const ransom = this.arena.scene.add.sprite(caster.x, caster.y, 'proj-tech-ransomware').setDepth(15);
      const speed = 200;
      let vx = Math.cos(angle) * speed;
      let vy = Math.sin(angle) * speed;
      let rx = caster.x; let ry = caster.y;
      const hitRadius = 20;
      const ransomTarget = owner === 'player' ? this.arena.npc : this.arena.player;
      // Move each frame via update listener
      const moveId = setInterval(() => {
        rx += vx * 0.016; ry += vy * 0.016;
        ransom.setPosition(rx, ry);
        const hit = Phaser.Math.Distance.Between(rx, ry, ransomTarget.x, ransomTarget.y) < hitRadius + 20;
        const { width: W, height: H } = this.arena.scene.scale;
        const outOfBounds = rx < 0 || rx > W || ry < 0 || ry > H;
        if (hit || outOfBounds) {
          clearInterval(moveId);
          if (ransom.active) {
            this.arena.spawnHitFlash(rx, ry, 0xff6600);
            if (hit) {
              this.techRansomwareTarget = owner === 'player' ? 'npc' : 'player';
              this.techRansomwareExpiry = this.arena.scene.time.now + 5000;
              this.arena.spawnFloatingText(ransomTarget.x, ransomTarget.y - 36, 'RANSOMWARE!', '#ff6600');
            }
            ransom.destroy();
          }
        }
        void vx; void vy;
      }, 16);
      this.arena.scene.time.delayedCall(4000, () => { clearInterval(moveId); if (ransom.active) ransom.destroy(); });
    } else {
      // 41-60+ chars: TROJAN SUPPLY DROP
      const { width: W, height: H } = this.arena.scene.scale;
      const dropX = Phaser.Math.Clamp(target.x + (Math.random() - 0.5) * 80, 60, W - 60);
      const dropY = Phaser.Math.Clamp(target.y + (Math.random() - 0.5) * 40, 60, H - 60);
      const shadow = this.arena.scene.add.ellipse(dropX, dropY, 48, 16, 0x000000, 0.4).setDepth(8);
      const trojanSprite = this.arena.scene.add.sprite(dropX, dropY - 200, 'proj-tech-trojan').setDepth(22);
      const hitbox = this.arena.scene.add.rectangle(dropX, dropY, 28, 26, 0x000000, 0).setDepth(22);
      const drop = { sprite: trojanSprite, shadow, x: dropX, y: dropY, landed: false, landAt: now + 1200, hitbox, lastHitAt: 0, owner };
      this.techTrojanDrops.push(drop);
      this.arena.scene.tweens.add({
        targets: trojanSprite,
        y: dropY,
        duration: 1100,
        ease: 'Quad.easeIn',
        onComplete: () => { drop.landed = true; },
      });
    }

    // Cleanup console UI
    if (owner === 'player') {
      if (this.techConsoleKeyListener) { window.removeEventListener('keydown', this.techConsoleKeyListener); this.techConsoleKeyListener = null; }
      if (this.techConsoleBox) { this.techConsoleBox.destroy(); this.techConsoleBox = null; }
      if (this.techConsoleText) { this.techConsoleText.destroy(); this.techConsoleText = null; }
      this.techConsoleActive = false;
    } else {
      if (this.npcTechConsoleBox) { this.npcTechConsoleBox.destroy(); this.npcTechConsoleBox = null; }
      if (this.npcTechConsoleText) { this.npcTechConsoleText.destroy(); this.npcTechConsoleText = null; }
      this.npcTechConsoleActive = false;
    }
    void now;
  }

  doTechHackAttribute(owner: 'player' | 'npc'): void {
    const now = this.arena.scene.time.now;
    if (owner === 'player') {
      this.playerTechHackExpiries.push(now + 5000);
      this.playerAbuse = Math.min(100, this.playerAbuse + 10);
      const caster = this.arena.player;
      this.arena.spawnFloatingText(caster.x, caster.y - 36, '+5% SPD/DMG (5s)', '#44ffcc');
    } else {
      this.npcTechHackExpiries.push(now + 5000);
      this.npcAbuse = Math.min(100, this.npcAbuse + 10);
    }
  }

  doTechPlayerGift(owner: 'player' | 'npc'): void {
    // Gift goes to the opponent
    const target = owner === 'player' ? this.arena.npc : this.arena.player;
    const roll = Math.floor(Math.random() * 3);
    let giftText = '';
    if (roll === 0) {
      if (owner === 'player') { this.npcTechGiftSpeedBonus += 0.05; giftText = 'Speed+5%'; }
      else { this.playerTechGiftSpeedBonus += 0.05; giftText = 'Speed+5%'; }
    } else if (roll === 1) {
      if (owner === 'player') { this.npcTechGiftDamageBonus += 0.05; giftText = 'DMG+5%'; }
      else { this.playerTechGiftDamageBonus += 0.05; giftText = 'DMG+5%'; }
    } else {
      target.heal(5);
      target.maxHp = target.maxHp + 5;
      giftText = 'MaxHP+5';
    }

    if (owner === 'player') {
      this.playerAbuse = Math.max(0, this.playerAbuse - 20);
      this.arena.spawnFloatingText(this.arena.npc.x, this.arena.npc.y - 36, `GIFT: ${giftText}`, '#ffdd44');
      this.arena.spawnFloatingText(this.arena.player.x, this.arena.player.y - 36, '-20 Abuse', '#44ffcc');
    } else {
      this.npcAbuse = Math.max(0, this.npcAbuse - 20);
      this.arena.spawnFloatingText(this.arena.player.x, this.arena.player.y - 36, `GIFT: ${giftText}`, '#ffdd44');
    }
  }

  doTechStartDomain(owner: 'player' | 'npc'): void {
    if (this.techDomainActive) return;
    const { width: W, height: H } = this.arena.scene.scale;
    const cx = W / 2, cy = H / 2;
    const isPlayer = owner === 'player';
    this.techDomainSavedPlayerX = this.arena.player.x; this.techDomainSavedPlayerY = this.arena.player.y;
    this.techDomainSavedNpcX = this.arena.npc.x; this.techDomainSavedNpcY = this.arena.npc.y;
    this.arena.player.setPosition(cx - 60, cy);
    this.arena.npc.setPosition(cx + 60, cy);
    this.techDomainCenterX = cx; this.techDomainCenterY = cy;
    this.techDomainOverlay = this.arena.scene.add.rectangle(cx, cy, W, H, 0x000000, 0.35).setDepth(50);
    this.techDomainCircle = this.arena.scene.add.graphics().setDepth(51);
    this.techDomainShards = [];
    for (let si = 0; si < 24; si++) {
      this.techDomainShards.push(this.arena.scene.add.image(0, 0, 'domain-shard').setDepth(52).setScale(1.4));
    }
    this.techDomainInstability = 0; this.techDomainBias = 0; this.techDomainCollapse = 0;
    this.techDomainAbuse = 0; this.techDomainShardAngleOffset = 0;
    this.techDomainExplosionAccum = 0; this.techDomainShardProjAccum = 0;
    this.techDomainBorderTickAccum = 0; this.techDomainDraggingSlider = -1;
    if (isPlayer) {
      // Slider UI (top-left) — only for player caster
      const SLIDER_X = 20, SLIDER_W = 140, SLIDER_H = 10, KNOB_W = 14, KNOB_H = 20, DEPTH_UI = 58;
      const sliderColors = [0xff4400, 0xcc44ff, 0x0088ff];
      const sliderNames = ['Instability', 'Bias', 'Collapse'];
      this.techDomainSliderBgs = []; this.techDomainSliderFills = [];
      this.techDomainSliderKnobs = []; this.techDomainSliderLabels = [];
      for (let i = 0; i < 3; i++) {
        const y = 45 + i * 38;
        const lbl = this.arena.scene.add.text(SLIDER_X, y - 14, sliderNames[i], { fontSize: '12px', color: '#ccaaff', fontFamily: 'monospace' }).setDepth(DEPTH_UI).setScrollFactor(0);
        const bg = this.arena.scene.add.rectangle(SLIDER_X + SLIDER_W / 2, y, SLIDER_W, SLIDER_H, 0x111111, 0.9).setDepth(DEPTH_UI).setScrollFactor(0);
        const fill = this.arena.scene.add.rectangle(SLIDER_X, y, 0, SLIDER_H, sliderColors[i], 0.9).setDepth(DEPTH_UI + 1).setOrigin(0, 0.5).setScrollFactor(0);
        const knob = this.arena.scene.add.rectangle(SLIDER_X, y, KNOB_W, KNOB_H, 0xeeeeff, 1).setDepth(DEPTH_UI + 2).setScrollFactor(0);
        knob.setInteractive({ draggable: true, useHandCursor: true });
        const idx = i;
        this.arena.scene.input.setDraggable(knob);
        knob.on('drag', (_ptr: Phaser.Input.Pointer, dragX: number) => {
          const val = Math.round((Phaser.Math.Clamp(dragX, SLIDER_X, SLIDER_X + SLIDER_W) - SLIDER_X) / SLIDER_W * 100);
          if (idx === 0) this.techDomainInstability = val;
          else if (idx === 1) this.techDomainBias = val;
          else this.techDomainCollapse = val;
          this.techDomainDraggingSlider = idx;
        });
        knob.on('dragend', () => { this.techDomainDraggingSlider = -1; });
        this.techDomainSliderBgs.push(bg); this.techDomainSliderFills.push(fill);
        this.techDomainSliderKnobs.push(knob); this.techDomainSliderLabels.push(lbl);
      }
      const abuseY = 45 + 3 * 38;
      this.techDomainAbuseLabel = this.arena.scene.add.text(SLIDER_X, abuseY - 14, 'Abuse', { fontSize: '12px', color: '#ff4422', fontFamily: 'monospace' }).setDepth(DEPTH_UI).setScrollFactor(0);
      this.techDomainAbuseBarBg = this.arena.scene.add.rectangle(SLIDER_X + SLIDER_W / 2, abuseY, SLIDER_W, SLIDER_H, 0x330000, 0.9).setDepth(DEPTH_UI).setScrollFactor(0);
      this.techDomainAbuseBarFill = this.arena.scene.add.rectangle(SLIDER_X, abuseY, 0, SLIDER_H, 0xff2222, 0.95).setDepth(DEPTH_UI + 1).setOrigin(0, 0.5).setScrollFactor(0);
    }
    this.techDomainActive = true;
    this.techDomainExpiry = this.arena.scene.time.now + 15000;
    this.arena.showFloatingText(cx, cy - 60, '💻 Domain.Expansion', '#44ccaa');
  }

  private techEndDomain(): void {
    if (!this.techDomainActive) return;
    this.techDomainActive = false;
    if (this.techDomainOverlay) { this.techDomainOverlay.destroy(); this.techDomainOverlay = null; }
    if (this.techDomainCircle) { this.techDomainCircle.destroy(); this.techDomainCircle = null; }
    for (const s of this.techDomainShards) s.destroy();
    this.techDomainShards = [];
    for (const o of this.techDomainSliderBgs) o.destroy(); this.techDomainSliderBgs = [];
    for (const o of this.techDomainSliderFills) o.destroy(); this.techDomainSliderFills = [];
    for (const o of this.techDomainSliderKnobs) { o.removeAllListeners(); o.destroy(); } this.techDomainSliderKnobs = [];
    for (const o of this.techDomainSliderLabels) o.destroy(); this.techDomainSliderLabels = [];
    if (this.techDomainAbuseBarBg) { this.techDomainAbuseBarBg.destroy(); this.techDomainAbuseBarBg = null; }
    if (this.techDomainAbuseBarFill) { this.techDomainAbuseBarFill.destroy(); this.techDomainAbuseBarFill = null; }
    if (this.techDomainAbuseLabel) { this.techDomainAbuseLabel.destroy(); this.techDomainAbuseLabel = null; }
    const { width: W, height: H } = this.arena.scene.scale;
    this.arena.resetPhysicsBounds();
    this.arena.player.setPosition(this.techDomainSavedPlayerX, this.techDomainSavedPlayerY);
    this.arena.npc.setPosition(this.techDomainSavedNpcX, this.techDomainSavedNpcY);
    this.techDomainInstability = 0; this.techDomainBias = 0; this.techDomainCollapse = 0;
    this.techDomainExplosionAccum = 0;
    this.techDomainShardProjAccum = 0; this.techDomainBorderTickAccum = 0; this.techDomainDraggingSlider = -1;
    const flash = this.arena.scene.add.circle(W / 2, H / 2, this.techDomainBaseRadius, 0x004433, 0.7).setDepth(55);
    this.arena.scene.tweens.add({ targets: flash, scaleX: 2, scaleY: 2, alpha: 0, duration: 500, onComplete: () => flash.destroy() });
    this.arena.showFloatingText(W / 2, H / 2 - 40, '💻 Domain Collapsed', '#44ffcc');
    if (this.arena.elementId === 'technology') this.arena.player.triggerCooldown('tech-domain');
    else this.arena.npc.triggerCooldown('tech-domain');
  }

  doTechOpSelfBegin(owner: 'player' | 'npc'): void {
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const now = this.arena.scene.time.now;
    if (owner === 'player') {
      this.playerOpSelfPhase = 1;
      this.playerOpSelfPhaseEnd = now + 5000;
      // GodMode: invulnerable
      this.arena.player.damageAbsorber = () => false;
      caster.setTint(0xffdd44);
      this.arena.spawnFloatingText(caster.x, caster.y - 40, 'GOD MODE', '#ffdd44');
    } else {
      this.npcOpSelfPhase = 1;
      this.npcOpSelfPhaseEnd = now + 5000;
      this.arena.npc.damageAbsorber = () => false;
      caster.setTint(0xffdd44);
    }
  }

  doTechRandomEffect(owner: 'player' | 'npc'): void {
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const now = this.arena.scene.time.now;
    const roll = Math.floor(Math.random() * 3) + 1 as 1 | 2 | 3; // 1=invinc, 2=invis+speed, 3=jail

    if (owner === 'player') {
      this.playerAbuse = Math.min(100, this.playerAbuse + 30);
      this.playerOpSelfPhase = roll;
      if (roll === 1) {
        this.playerOpSelfPhaseEnd = now + 3000;
        this.arena.player.damageAbsorber = () => false;
        caster.setTint(0xffdd44);
        this.arena.spawnFloatingText(caster.x, caster.y - 40, 'INVINCIBLE', '#ffdd44');
      } else if (roll === 2) {
        this.playerOpSelfPhaseEnd = now + 5000;
        this.playerOpSelfInvisActive = true;
        this.arena.player.setAlpha(0.15);
        this.arena.spawnFloatingText(caster.x, caster.y - 40, 'INVISIBLE', '#aaffdd');
      } else {
        this.playerOpSelfPhaseEnd = now + 5000;
        const jailW = 240; const jailH = 240;
        const jailGfx = this.arena.scene.add.graphics().setDepth(16);
        jailGfx.lineStyle(3, 0x44ccaa, 0.9);
        jailGfx.strokeRect(this.arena.npc.x - jailW / 2, this.arena.npc.y - jailH / 2, jailW, jailH);
        this.techJailBoxNpc = { graphics: jailGfx, x: this.arena.npc.x, y: this.arena.npc.y, w: jailW, h: jailH, lastDmgAt: 0 };
        this.arena.spawnFloatingText(this.arena.npc.x, this.arena.npc.y - 40, 'JAILED', '#44ccaa');
      }
    } else {
      this.npcAbuse = Math.min(100, this.npcAbuse + 30);
      this.npcOpSelfPhase = roll;
      if (roll === 1) {
        this.npcOpSelfPhaseEnd = now + 3000;
        this.arena.npc.damageAbsorber = () => false;
        caster.setTint(0xffdd44);
      } else if (roll === 2) {
        this.npcOpSelfPhaseEnd = now + 5000;
        this.npcOpSelfInvisActive = true;
        this.arena.npc.setAlpha(0.15);
      } else {
        this.npcOpSelfPhaseEnd = now + 5000;
        const jailW = 240; const jailH = 240;
        const jailGfx = this.arena.scene.add.graphics().setDepth(16);
        jailGfx.lineStyle(3, 0x44ccaa, 0.9);
        jailGfx.strokeRect(this.arena.player.x - jailW / 2, this.arena.player.y - jailH / 2, jailW, jailH);
        this.techJailBoxPlayer = { graphics: jailGfx, x: this.arena.player.x, y: this.arena.player.y, w: jailW, h: jailH, lastDmgAt: 0 };
      }
    }
  }

  doTechGearGiveActivate(owner: 'player' | 'npc'): void {
    if (owner !== 'player') return;
    const caster = this.arena.player;
    if (this.techGearBoxActive) {
      // Select displayed weapon
      this.techActiveWeapon = this.techGearBoxWeapon as 0 | 1 | 2 | 3;
      this.techActiveWeaponExpiry = this.arena.scene.time.now + 20000;
      this.techGearBoxActive = false;
      if (this.techGearBoxGraphics) { this.techGearBoxGraphics.destroy(); this.techGearBoxGraphics = null; }
      if (this.techGearBoxLabel) { this.techGearBoxLabel.destroy(); this.techGearBoxLabel = null; }
      const weaponNames = ['Sword Whip', 'Disc Dancer', 'Helix Shot', 'Code Cruncher'];
      this.arena.spawnFloatingText(caster.x, caster.y - 36, weaponNames[this.techActiveWeapon], '#44ffcc');
    } else if (this.techActiveWeapon === -1) {
      // Open item box
      this.techGearBoxActive = true;
      this.techGearBoxWeapon = 0;
      this.techGearBoxCycleAccum = 0;
      this.techGearBoxGraphics = this.arena.scene.add.graphics().setDepth(28);
      this.techGearBoxLabel = this.arena.scene.add.text(caster.x, caster.y - 56, '?', {
        fontSize: '13px', color: '#ffffff', fontFamily: 'monospace', stroke: '#000033', strokeThickness: 2,
      }).setOrigin(0.5).setDepth(29);
    }
  }

  doTechNpcGearGiveAttack(): void {
    // NPC simplified: fire a single tech bullet toward the player
    const angle = Math.atan2(this.arena.player.y - this.arena.npc.y, this.arena.player.x - this.arena.npc.x);
    const aimOff = 0; // aimOffsetDeg handled in NpcOpponent — not accessible here
    const finalAngle = angle + (Math.random() - 0.5) * 2 * aimOff;
    const bullet = this.arena.projectiles.create(this.arena.npc.x, this.arena.npc.y, 'proj-tech-bullet') as Phaser.Physics.Arcade.Sprite;
    bullet.setDepth(12);
    (bullet as unknown as { isFromPlayer: boolean }).isFromPlayer = false;
    (bullet as unknown as { damage: number }).damage = Math.round(12 * (1 + this.npcTechDamageBonus));
    (bullet as unknown as { hitEnemy: boolean }).hitEnemy = false;
    bullet.setRotation(finalAngle);
    (bullet.body as Phaser.Physics.Arcade.Body).setVelocity(Math.cos(finalAngle) * 280, Math.sin(finalAngle) * 280);
    this.arena.scene.time.delayedCall(2000, () => { if (bullet.active) bullet.destroy(); });
  }

  // ── Private weapon helpers ────────────────────────────────────────────

  private doTechWeaponAttack(owner: 'player' | 'npc', weapon: number, tx: number, ty: number, time: number): void {
    if (weapon === 0) this.doTechSwordWhip(owner, tx, ty, time);
    else if (weapon === 1) this.doTechDiscDancer(owner, tx, ty);
    else if (weapon === 2) this.doTechHelixShot(owner, tx, ty, time);
    else if (weapon === 3) this.doTechCodeCruncher(owner, tx, ty);
  }

  private doTechSwordWhip(owner: 'player' | 'npc', tx: number, ty: number, time: number): void {
    if (time - this.techWeaponLastFireAt < 500) return;
    this.techWeaponLastFireAt = time;
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const target = owner === 'player' ? this.arena.npc : this.arena.player;
    const angle = Math.atan2(ty - caster.y, tx - caster.x);
    const RANGE = 110;
    // Visual whip arc
    const gfx = this.arena.scene.add.graphics().setDepth(18);
    gfx.lineStyle(4, 0xffee44, 0.9);
    gfx.beginPath();
    gfx.moveTo(caster.x, caster.y);
    const tipX = caster.x + Math.cos(angle) * RANGE;
    const tipY = caster.y + Math.sin(angle) * RANGE;
    gfx.lineTo(tipX, tipY);
    gfx.strokePath();
    // Mid bulge
    gfx.lineStyle(2, 0xffffff, 0.6);
    gfx.strokeCircle(
      caster.x + Math.cos(angle) * RANGE * 0.6,
      caster.y + Math.sin(angle) * RANGE * 0.6,
      4,
    );
    this.arena.scene.tweens.add({ targets: gfx, alpha: 0, duration: 200, onComplete: () => gfx.destroy() });
    // Damage check — hit if target is within range and within ±55° of swing direction
    const dist = Phaser.Math.Distance.Between(caster.x, caster.y, target.x, target.y);
    if (dist <= RANGE + 20) {
      const targetAngle = Math.atan2(target.y - caster.y, target.x - caster.x);
      const angDiff = Math.abs(Phaser.Math.Angle.ShortestBetween(
        Phaser.Math.RadToDeg(angle), Phaser.Math.RadToDeg(targetAngle),
      ));
      if (angDiff <= 55) {
        const dmg = Math.round(22 * (owner === 'player' ? (1 + this.playerTechDamageBonus) : (1 + this.npcTechDamageBonus)));
        target.takeDamage(dmg);
        this.arena.spawnDamageNumber(target.x, target.y - 28, dmg);
        this.arena.spawnHitFlash(target.x, target.y, 0xffee44);
      }
    }
  }

  private doTechDiscDancer(owner: 'player' | 'npc', tx: number, ty: number): void {
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const angle = Math.atan2(ty - caster.y, tx - caster.x);
    const perpAngle = angle + Math.PI / 2;
    const perpX = Math.cos(perpAngle);
    const perpY = Math.sin(perpAngle);
    const OFFSET = 14;
    const s1 = this.arena.scene.add.sprite(caster.x + perpX * OFFSET, caster.y + perpY * OFFSET, 'proj-tech-disc').setDepth(14);
    const s2 = this.arena.scene.add.sprite(caster.x - perpX * OFFSET, caster.y - perpY * OFFSET, 'proj-tech-disc').setDepth(14);
    const SPEED = 3.5;
    this.techDiscPairs.push({
      s1, s2,
      x1: s1.x, y1: s1.y,
      x2: s2.x, y2: s2.y,
      vx: Math.cos(angle) * SPEED,
      vy: Math.sin(angle) * SPEED,
      perpX, perpY,
      offset: OFFSET,
      phase: 0,
      phaseTimer: 0,
      owner,
      lastHitAt: 0,
    });
  }

  private doTechHelixShot(owner: 'player' | 'npc', tx: number, ty: number, time: number): void {
    if (time - this.techWeaponLastFireAt < 80) return;
    this.techWeaponLastFireAt = time;
    this.techHelixToggle = !this.techHelixToggle;
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const angle = Math.atan2(ty - caster.y, tx - caster.x);
    const perpAngle = angle + Math.PI / 2;
    const offsetSign = this.techHelixToggle ? 1 : -1;
    const PERP_OFFSET = 12;
    const ox = Math.cos(perpAngle) * PERP_OFFSET * offsetSign;
    const oy = Math.sin(perpAngle) * PERP_OFFSET * offsetSign;
    const bullet = this.arena.projectiles.create(caster.x + ox, caster.y + oy, 'proj-tech-bullet') as Phaser.Physics.Arcade.Sprite;
    bullet.setDepth(12);
    (bullet as unknown as { isFromPlayer: boolean }).isFromPlayer = (owner === 'player');
    (bullet as unknown as { damage: number }).damage = Math.round(5 * (owner === 'player' ? (1 + this.playerTechDamageBonus) : (1 + this.npcTechDamageBonus)));
    (bullet as unknown as { hitEnemy: boolean }).hitEnemy = false;
    const speed = 260;
    bullet.setRotation(angle);
    (bullet.body as Phaser.Physics.Arcade.Body).setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    this.arena.scene.time.delayedCall(1500, () => { if (bullet.active) bullet.destroy(); });
  }

  private doTechCodeCruncher(owner: 'player' | 'npc', tx: number, ty: number): void {
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const angle = Math.atan2(ty - caster.y, tx - caster.x);
    const speed = 220;
    const sprite = this.arena.scene.add.sprite(caster.x, caster.y, 'proj-tech-grenade').setDepth(14);
    this.techStickyGrenades.push({
      sprite,
      x: caster.x, y: caster.y,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      stuck: false,
      stuckToNpc: false,
      explodeAt: 0,
      owner,
    });
  }

  private createTechAbuseBar(owner: 'player' | 'npc'): void {
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const barW = 50;
    const barH = 6;
    const y = caster.y - 44;
    if (owner === 'player') {
      if (this.playerAbuseBarBg) return;
      this.playerAbuseBarBg = this.arena.scene.add.rectangle(caster.x, y, barW, barH, 0x330000, 0.8).setDepth(20);
      this.playerAbuseBarFill = this.arena.scene.add.rectangle(caster.x - barW / 2, y, 0, barH, 0xff2222, 0.9)
        .setOrigin(0, 0.5).setDepth(21);
    } else {
      if (this.npcAbuseBarBg) return;
      this.npcAbuseBarBg = this.arena.scene.add.rectangle(caster.x, y, barW, barH, 0x330000, 0.8).setDepth(20);
      this.npcAbuseBarFill = this.arena.scene.add.rectangle(caster.x - barW / 2, y, 0, barH, 0xff2222, 0.9)
        .setOrigin(0, 0.5).setDepth(21);
    }
  }

  private spawnTechProtestors(target: 'player' | 'npc'): void {
    const W = this.arena.scene.scale.width;
    const H = this.arena.scene.scale.height;
    const pad = 32;
    const edges: Array<[number, number]> = [
      [pad + Math.random() * (W - 2 * pad), pad - 20],
      [pad + Math.random() * (W - 2 * pad), H - pad + 20],
      [pad - 20, pad + Math.random() * (H - 2 * pad)],
    ];
    for (const [ex, ey] of edges) {
      const sprite = this.arena.scene.add.sprite(ex, ey, 'proj-tech-protestor').setDepth(15);
      const hpBar = this.arena.scene.add.graphics().setDepth(16);
      this.protestors.push({ sprite, hpBar, hp: 25, maxHp: 25, target, nextHitAt: 0 });
    }
  }

  // ── update (formerly updateTechnologyState) ───────────────────────────

  update(time: number, delta: number): void {
    const isPlayerTech = this.arena.elementId === 'technology';
    const isNpcTech = this.arena.npcElementId === 'technology';

    // ── Lazily create abuse bars ─────────────────────────────────
    if (isPlayerTech && !this.playerAbuseBarBg) this.createTechAbuseBar('player');
    if (isNpcTech && !this.npcAbuseBarBg) this.createTechAbuseBar('npc');

    // ── Hack.Attribute buff expiry ────────────────────────────────
    if (isPlayerTech) {
      this.playerTechHackExpiries = this.playerTechHackExpiries.filter(e => time < e);
      const activeHacks = this.playerTechHackExpiries.length;
      this.playerTechSpeedBonus = activeHacks * 0.05;
      this.playerTechDamageBonus = activeHacks * 0.05;
    }
    if (isNpcTech) {
      this.npcTechHackExpiries = this.npcTechHackExpiries.filter(e => time < e);
      const activeHacksN = this.npcTechHackExpiries.length;
      this.npcTechSpeedBonus = activeHacksN * 0.05;
      this.npcTechDamageBonus = activeHacksN * 0.05;
    }

    // ── Abuse drain ──────────────────────────────────────────────
    if (isPlayerTech) {
      const pa = this.playerAbuse; // snapshot before drain for condition checks
      this.playerAbuse = Math.max(0, this.playerAbuse - 3 * delta / 1000);
      // Update bar
      if (this.playerAbuseBarBg && this.playerAbuseBarFill) {
        const barW = 50;
        this.playerAbuseBarBg.setPosition(this.arena.player.x, this.arena.player.y - 44);
        this.playerAbuseBarFill.setPosition(this.arena.player.x - barW / 2, this.arena.player.y - 44);
        this.playerAbuseBarFill.setSize(barW * (pa / 100), 6);
      }
      // ── Tiered penalties ─────────────────────────────────────────
      // Tier 1 (40+): +20% dmg taken
      // Tier 2 (70+): +40% dmg taken
      // Tier 3 (100): +65% dmg taken + protestors
      if (pa >= 100) {
        this.arena.player.incomingDamageMultiplier = 1.65;
        this.arena.player.setTint(0xff4422);
      } else if (pa >= 70) {
        this.arena.player.incomingDamageMultiplier = 1.4;
        this.arena.player.setTint(0xff8844);
      } else if (pa >= 40) {
        this.arena.player.incomingDamageMultiplier = 1.2;
        this.arena.player.setTint(0xffccaa);
      } else {
        this.arena.player.incomingDamageMultiplier = this.arena.mutations.has('deadly') ? 1.5 : 1.0;
        if (this.playerOpSelfPhase === 0) this.arena.player.clearTint();
      }
      // Protestor spawn at 100
      if (pa >= 100 && !this.playerProtestorsSpawned) {
        this.spawnTechProtestors('player');
        this.playerProtestorsSpawned = true;
        this.arena.spawnFloatingText(this.arena.player.x, this.arena.player.y - 50, '⚠ PROTESTERS!', '#ff3333');
      }
      if (pa < 50) this.playerProtestorsSpawned = false;
    }
    if (isNpcTech) {
      this.npcAbuse = Math.max(0, this.npcAbuse - 3 * delta / 1000);
      const na = this.npcAbuse;
      if (this.npcAbuseBarBg && this.npcAbuseBarFill) {
        const barW = 50;
        this.npcAbuseBarBg.setPosition(this.arena.npc.x, this.arena.npc.y - 44);
        this.npcAbuseBarFill.setPosition(this.arena.npc.x - barW / 2, this.arena.npc.y - 44);
        this.npcAbuseBarFill.setSize(barW * (na / 100), 6);
      }
      if (na >= 100) {
        this.arena.npc.incomingDamageMultiplier = 1.65;
      } else if (na >= 70) {
        this.arena.npc.incomingDamageMultiplier = 1.4;
      } else if (na >= 40) {
        this.arena.npc.incomingDamageMultiplier = 1.2;
      } else {
        this.arena.npc.incomingDamageMultiplier = 1.0;
      }
      if (na >= 100 && !this.npcProtestorsSpawned) {
        this.spawnTechProtestors('npc');
        this.npcProtestorsSpawned = true;
      }
      if (na < 50) this.npcProtestorsSpawned = false;
    }

    // ── Dev.Console NPC auto-typing ──────────────────────────────
    if (this.npcTechConsoleActive) {
      if (time >= this.npcTechConsoleNextTypeAt) {
        this.npcTechConsoleKeyCount++;
        this.npcTechConsoleNextTypeAt = time + this.npcTechConsoleTypeRate;
      }
      if (this.npcTechConsoleBox) this.npcTechConsoleBox.setPosition(this.arena.npc.x, this.arena.npc.y - 60);
      if (this.npcTechConsoleText) this.npcTechConsoleText.setPosition(this.arena.npc.x, this.arena.npc.y - 60)
        .setText(`> _ [${this.npcTechConsoleKeyCount}]`);
    }

    // ── Dev.Console player text update ──────────────────────────
    if (this.techConsoleActive) {
      if (this.techConsoleBox) this.techConsoleBox.setPosition(this.arena.player.x, this.arena.player.y - 60);
      if (this.techConsoleText) this.techConsoleText.setPosition(this.arena.player.x, this.arena.player.y - 60)
        .setText(`> _ [${this.techConsoleKeyCount}]`);
    }

    // ── Dev.Console timeout ──────────────────────────────────────
    if (this.techConsoleActive && time >= this.techConsoleEndAt) {
      this.closeTechDevConsole('player');
    }
    if (this.npcTechConsoleActive && time >= this.npcTechConsoleEndAt) {
      this.closeTechDevConsole('npc');
    }

    // ── Randomize.Exe (R) phase expiry ───────────────────────────────
    if (isPlayerTech && this.playerOpSelfPhase > 0 && time >= this.playerOpSelfPhaseEnd) {
      // End whichever phase was active (single-phase — no cycling)
      if (this.playerOpSelfPhase === 1) {
        // End invincibility
        this.arena.player.damageAbsorber = null;
        this.arena.player.clearTint();
      } else if (this.playerOpSelfPhase === 2) {
        // End invis+speed
        this.playerOpSelfInvisActive = false;
        this.arena.player.setAlpha(1);
      } else if (this.playerOpSelfPhase === 3) {
        // End jail
        if (this.techJailBoxNpc) { this.techJailBoxNpc.graphics?.destroy(); this.techJailBoxNpc = null; }
      }
      this.playerOpSelfPhase = 0;
    }

    if (isNpcTech && this.npcOpSelfPhase > 0 && time >= this.npcOpSelfPhaseEnd) {
      if (this.npcOpSelfPhase === 1) {
        this.arena.npc.damageAbsorber = null;
        this.arena.npc.clearTint();
      } else if (this.npcOpSelfPhase === 2) {
        this.npcOpSelfInvisActive = false;
        this.arena.npc.setAlpha(1);
      } else if (this.npcOpSelfPhase === 3) {
        if (this.techJailBoxPlayer) { this.techJailBoxPlayer.graphics?.destroy(); this.techJailBoxPlayer = null; }
      }
      this.npcOpSelfPhase = 0;
    }

    // ── Gear.Give item box cycling ────────────────────────────────
    if (isPlayerTech && this.techGearBoxActive) {
      this.techGearBoxCycleAccum += delta;
      if (this.techGearBoxCycleAccum >= 500) {
        this.techGearBoxCycleAccum -= 500;
        this.techGearBoxWeapon = (this.techGearBoxWeapon + 1) % 4;
      }
      const weaponColors = [0xffee44, 0x2299ff, 0x44ff77, 0xff4433];
      const weaponLabels = ['⚔ Sword', '⊕ Disc', '~ Helix', '💣 Crunch'];
      const boxX = this.arena.player.x;
      const boxY = this.arena.player.y - 56;
      if (this.techGearBoxGraphics) {
        this.techGearBoxGraphics.clear();
        this.techGearBoxGraphics.fillStyle(weaponColors[this.techGearBoxWeapon], 0.85);
        this.techGearBoxGraphics.fillRect(boxX - 26, boxY - 14, 52, 28);
        this.techGearBoxGraphics.lineStyle(2, 0xffffff, 0.9);
        this.techGearBoxGraphics.strokeRect(boxX - 26, boxY - 14, 52, 28);
      }
      if (this.techGearBoxLabel) {
        this.techGearBoxLabel.setPosition(boxX, boxY).setText(weaponLabels[this.techGearBoxWeapon]);
      }
    }
    // Weapon expiry
    if (isPlayerTech && this.techActiveWeapon >= 0 && time >= this.techActiveWeaponExpiry) {
      this.techActiveWeapon = -1;
    }

    // ── Disc Dancer pair updates ──────────────────────────────────
    const DISC_CONVERGE_RATE = 0.8; // px per frame toward center
    const DISC_SPREAD_RATE = 1.2;
    this.techDiscPairs = this.techDiscPairs.filter(pair => {
      if (pair.phase >= 5) { pair.s1.destroy(); pair.s2.destroy(); return false; }
      const target = pair.owner === 'player' ? this.arena.npc : this.arena.player;
      const dmgMult = pair.owner === 'player' ? (1 + this.playerTechDamageBonus) : (1 + this.npcTechDamageBonus);

      // Advance position
      pair.x1 += pair.vx; pair.y1 += pair.vy;
      pair.x2 += pair.vx; pair.y2 += pair.vy;

      pair.phaseTimer += delta;

      if (pair.phase === 0) {
        // Parallel travel: 400ms
        if (pair.phaseTimer >= 400) { pair.phase = 1; pair.phaseTimer = 0; }
      } else if (pair.phase === 1) {
        // Converge
        pair.offset = Math.max(0, pair.offset - DISC_CONVERGE_RATE * (delta / 16));
        if (pair.offset <= 0) {
          // Explosion at midpoint
          const mx = (pair.x1 + pair.x2) / 2;
          const my = (pair.y1 + pair.y2) / 2;
          this.arena.spawnHitFlash(mx, my, 0x2299ff);
          this.arena.dealAoeDamageFromOwner(mx, my, 50, Math.round(16 * dmgMult), pair.owner);
          pair.phase = 2; pair.phaseTimer = 0;
        }
      } else if (pair.phase === 2) {
        // Spread back: 200ms
        pair.offset = Math.min(14, pair.offset + DISC_SPREAD_RATE * (delta / 16));
        if (pair.phaseTimer >= 200) { pair.phase = 3; pair.phaseTimer = 0; }
      } else if (pair.phase === 3) {
        // 2nd parallel travel: 300ms
        if (pair.phaseTimer >= 300) { pair.phase = 4; pair.phaseTimer = 0; }
      } else if (pair.phase === 4) {
        // 2nd converge
        pair.offset = Math.max(0, pair.offset - DISC_CONVERGE_RATE * (delta / 16));
        if (pair.offset <= 0) {
          const mx = (pair.x1 + pair.x2) / 2;
          const my = (pair.y1 + pair.y2) / 2;
          this.arena.spawnHitFlash(mx, my, 0x2299ff);
          this.arena.dealAoeDamageFromOwner(mx, my, 50, Math.round(16 * dmgMult), pair.owner);
          pair.phase = 5;
        }
      }

      // Update sprite positions with perpendicular offset
      pair.s1.setPosition(pair.x1 + pair.perpX * pair.offset, pair.y1 + pair.perpY * pair.offset);
      pair.s2.setPosition(pair.x2 - pair.perpX * pair.offset, pair.y2 - pair.perpY * pair.offset);
      pair.s1.setRotation(pair.s1.rotation + 0.1);
      pair.s2.setRotation(pair.s2.rotation - 0.1);

      // Individual disc hit test
      if (time - pair.lastHitAt >= 200) {
        for (const pos of [[pair.s1.x, pair.s1.y], [pair.s2.x, pair.s2.y]]) {
          if (Phaser.Math.Distance.Between(pos[0], pos[1], target.x, target.y) < 24) {
            const dmg = Math.round(8 * dmgMult);
            target.takeDamage(dmg);
            this.arena.spawnDamageNumber(target.x, target.y - 28, dmg);
            pair.lastHitAt = time;
            break;
          }
        }
      }

      // Out of bounds
      const { width: W2, height: H2 } = this.arena.scene.scale;
      if (pair.x1 < -50 || pair.x1 > W2 + 50 || pair.y1 < -50 || pair.y1 > H2 + 50) {
        pair.s1.destroy(); pair.s2.destroy(); return false;
      }
      return true;
    });

    // ── Sticky grenade updates ────────────────────────────────────
    this.techStickyGrenades = this.techStickyGrenades.filter(g => {
      const target = g.owner === 'player' ? this.arena.npc : this.arena.player;
      const dmgMult = g.owner === 'player' ? (1 + this.playerTechDamageBonus) : (1 + this.npcTechDamageBonus);
      const FRAME_STEP = delta / 1000;

      if (!g.stuck) {
        // Move
        g.x += g.vx * FRAME_STEP;
        g.y += g.vy * FRAME_STEP;
        g.vy += 180 * FRAME_STEP; // gravity
        g.sprite.setPosition(g.x, g.y);
        g.sprite.setRotation(g.sprite.rotation + 0.08);

        // Check wall bounds
        const { width: W2, height: H2 } = this.arena.scene.scale;
        if (g.x <= 36 || g.x >= W2 - 36 || g.y >= H2 - 36) {
          g.stuck = true; g.stuckToNpc = false;
          g.explodeAt = time + 3000;
          g.vx = 0; g.vy = 0;
        }
        // Check enemy hit
        if (Phaser.Math.Distance.Between(g.x, g.y, target.x, target.y) < 24) {
          g.stuck = true; g.stuckToNpc = true;
          g.explodeAt = time + 3000;
          g.vx = 0; g.vy = 0;
        }
        // Fell off screen
        if (g.y > H2 + 40) { g.sprite.destroy(); return false; }
      } else {
        // If stuck to NPC, follow NPC
        if (g.stuckToNpc) { g.x = target.x; g.y = target.y - 16; }
        g.sprite.setPosition(g.x, g.y);
        // Blink when close to exploding
        if (g.explodeAt - time < 1000) g.sprite.setAlpha(Math.sin(time * 0.015) > 0 ? 1 : 0.3);
        // Explode
        if (time >= g.explodeAt) {
          const eDmg = Math.round(35 * dmgMult);
          this.arena.dealAoeDamageFromOwner(g.x, g.y, 65, eDmg, g.owner);
          this.arena.spawnHitFlash(g.x, g.y, 0x558800);
          g.sprite.destroy();
          return false;
        }
      }
      return true;
    });

    // ── Virus tick damage ─────────────────────────────────────────
    if (isPlayerTech && this.techVirusEndAt > 0 && time < this.techVirusEndAt) {
      if (time >= this.techVirusNextTickAt) {
        this.techVirusNextTickAt = time + 500;
        this.arena.player.takeDamage(3);
        this.arena.spawnDamageNumber(this.arena.player.x, this.arena.player.y - 28, 3);
      }
    } else if (isPlayerTech && this.techVirusEndAt > 0 && time >= this.techVirusEndAt) {
      this.techVirusEndAt = 0;
    }
    if (isNpcTech && this.npcTechVirusEndAt > 0 && time < this.npcTechVirusEndAt) {
      if (time >= this.npcTechVirusNextTickAt) {
        this.npcTechVirusNextTickAt = time + 500;
        this.arena.npc.takeDamage(3);
        this.arena.spawnDamageNumber(this.arena.npc.x, this.arena.npc.y - 28, 3);
      }
    } else if (isNpcTech && this.npcTechVirusEndAt > 0 && time >= this.npcTechVirusEndAt) {
      this.npcTechVirusEndAt = 0;
    }

    // ── Trojan supply drop interaction ───────────────────────────
    for (let di = this.techTrojanDrops.length - 1; di >= 0; di--) {
      const drop = this.techTrojanDrops[di];
      if (!drop.landed) continue;
      const player = this.arena.player;
      const npc = this.arena.npc;
      const dropper = drop.owner;
      // Expiry (8 seconds after landing)
      if (drop.landAt > 0 && time > drop.landAt + 8000) {
        drop.sprite?.destroy(); drop.shadow?.destroy(); drop.hitbox?.destroy();
        this.techTrojanDrops.splice(di, 1);
        continue;
      }
      // Enemy touches it = cluster bombs
      const enemy = dropper === 'player' ? npc : player;
      const ally = dropper === 'player' ? player : npc;
      if (time - drop.lastHitAt > 500) {
        if (Phaser.Math.Distance.Between(drop.x, drop.y, enemy.x, enemy.y) < 30) {
          // Cluster explosion
          drop.lastHitAt = time;
          const dmgMult = dropper === 'player' ? (1 + this.playerTechDamageBonus) : (1 + this.npcTechDamageBonus);
          const cDmg = Math.round(8 * dmgMult);
          for (let ci = 0; ci < 8; ci++) {
            const cAngle = (ci / 8) * Math.PI * 2;
            const cbullet = this.arena.projectiles.create(drop.x, drop.y, 'proj-tech-cluster') as Phaser.Physics.Arcade.Sprite;
            cbullet.setDepth(14);
            (cbullet as unknown as { isFromPlayer: boolean }).isFromPlayer = (dropper === 'player');
            (cbullet as unknown as { damage: number }).damage = cDmg;
            (cbullet as unknown as { hitEnemy: boolean }).hitEnemy = false;
            (cbullet.body as Phaser.Physics.Arcade.Body).setVelocity(Math.cos(cAngle) * 180, Math.sin(cAngle) * 180);
            this.arena.scene.time.delayedCall(1200, () => { if (cbullet.active) cbullet.destroy(); });
          }
          this.arena.spawnHitFlash(drop.x, drop.y, 0xff3300);
          drop.sprite?.destroy(); drop.shadow?.destroy(); drop.hitbox?.destroy();
          this.techTrojanDrops.splice(di, 1);
          continue;
        }
        // Ally (tech player) touches it = -25 abuse
        if (Phaser.Math.Distance.Between(drop.x, drop.y, ally.x, ally.y) < 30) {
          drop.lastHitAt = time;
          if (dropper === 'player') { this.playerAbuse = Math.max(0, this.playerAbuse - 25); }
          else { this.npcAbuse = Math.max(0, this.npcAbuse - 25); }
          drop.sprite?.destroy(); drop.shadow?.destroy(); drop.hitbox?.destroy();
          this.techTrojanDrops.splice(di, 1);
          continue;
        }
      }
    }

    // ── Ransomware expiry ─────────────────────────────────────────
    if (this.techRansomwareTarget !== null && time >= this.techRansomwareExpiry) {
      this.techRansomwareTarget = null;
    }
    // NPC ransomware check — block special abilities is enforced in NPC AI side by checking techRansomwareTarget

    // ── Jail box: clamp prisoner, deal wall damage ────────────────
    if (this.techJailBoxNpc) {
      const box = this.techJailBoxNpc;
      const halfW = box.w / 2; const halfH = box.h / 2;
      const minX = box.x - halfW; const maxX = box.x + halfW;
      const minY = box.y - halfH; const maxY = box.y + halfH;
      const outX = this.arena.npc.x < minX || this.arena.npc.x > maxX;
      const outY = this.arena.npc.y < minY || this.arena.npc.y > maxY;
      if (outX || outY) {
        this.arena.npc.setPosition(
          Phaser.Math.Clamp(this.arena.npc.x, minX, maxX),
          Phaser.Math.Clamp(this.arena.npc.y, minY, maxY),
        );
        if (time - box.lastDmgAt >= 500) {
          this.arena.npc.takeDamage(5);
          this.arena.spawnDamageNumber(this.arena.npc.x, this.arena.npc.y - 28, 5);
          box.lastDmgAt = time;
        }
      }
      // Redraw box at fixed position
      box.graphics?.clear();
      box.graphics?.lineStyle(3, 0x44ccaa, 0.9);
      box.graphics?.strokeRect(box.x - halfW, box.y - halfH, box.w, box.h);
    }
    if (this.techJailBoxPlayer) {
      const box = this.techJailBoxPlayer;
      const halfW = box.w / 2; const halfH = box.h / 2;
      const minX = box.x - halfW; const maxX = box.x + halfW;
      const minY = box.y - halfH; const maxY = box.y + halfH;
      const outX = this.arena.player.x < minX || this.arena.player.x > maxX;
      const outY = this.arena.player.y < minY || this.arena.player.y > maxY;
      if (outX || outY) {
        this.arena.player.setPosition(
          Phaser.Math.Clamp(this.arena.player.x, minX, maxX),
          Phaser.Math.Clamp(this.arena.player.y, minY, maxY),
        );
        if (time - box.lastDmgAt >= 500) {
          this.arena.player.takeDamage(5);
          this.arena.spawnDamageNumber(this.arena.player.x, this.arena.player.y - 28, 5);
          box.lastDmgAt = time;
        }
      }
      box.graphics?.clear();
      box.graphics?.lineStyle(3, 0x44ccaa, 0.9);
      box.graphics?.strokeRect(box.x - halfW, box.y - halfH, box.w, box.h);
    }

    // ── Domain.Expansion per-frame ────────────────────────────────
    if (this.techDomainActive) {
      const dcx = this.techDomainCenterX, dcy = this.techDomainCenterY;
      const currentRadius = this.techDomainBaseRadius * (1 - this.techDomainCollapse / 100 * 0.6);

      // Rotating border shards
      this.techDomainShardAngleOffset += delta * 0.001;
      for (let si = 0; si < this.techDomainShards.length; si++) {
        const ang = (si / this.techDomainShards.length) * Math.PI * 2 + this.techDomainShardAngleOffset;
        this.techDomainShards[si].setPosition(dcx + Math.cos(ang) * currentRadius, dcy + Math.sin(ang) * currentRadius).setRotation(ang);
      }

      // Redraw circle
      if (this.techDomainCircle) {
        this.techDomainCircle.clear();
        this.techDomainCircle.fillStyle(0x001a0e, 0.3);
        this.techDomainCircle.fillCircle(dcx, dcy, currentRadius);
        this.techDomainCircle.lineStyle(3, 0x00cc66, 1);
        this.techDomainCircle.strokeCircle(dcx, dcy, currentRadius);
      }

      // Circular clamping
      for (const fighter of [this.arena.player, this.arena.npc]) {
        const fdx = fighter.x - dcx, fdy = fighter.y - dcy;
        const fdist = Math.sqrt(fdx * fdx + fdy * fdy);
        if (fdist > currentRadius - 22) {
          const ang = Math.atan2(fdy, fdx);
          fighter.setPosition(dcx + Math.cos(ang) * (currentRadius - 22), dcy + Math.sin(ang) * (currentRadius - 22));
        }
      }

      // Border shard damage — NPC (or player if NPC owns domain) hits the edge
      const domainOwner = isPlayerTech ? 'npc' : 'player';
      const borderTarget = domainOwner === 'npc' ? this.arena.npc : this.arena.player;
      const borderDist = Phaser.Math.Distance.Between(borderTarget.x, borderTarget.y, dcx, dcy);
      if (borderDist > currentRadius - 30) {
        this.techDomainBorderTickAccum += delta;
        if (this.techDomainBorderTickAccum >= 200) {
          this.techDomainBorderTickAccum -= 200;
          borderTarget.takeDamage(4);
          this.arena.spawnHitFlash(borderTarget.x, borderTarget.y, 0x004422);
          this.arena.showFloatingText(borderTarget.x, borderTarget.y - 18, '-4 shard', '#00ff88');
        }
      } else { this.techDomainBorderTickAccum = 0; }

      // Domain Bias — damage multiplier (speed handled in speed-mult section)
      if (this.techDomainBias > 0) {
        const biasBonus = 1 + this.techDomainBias / 100 * 0.5;
        if (isPlayerTech) this.arena.npc.incomingDamageMultiplier = Math.max(this.arena.npc.incomingDamageMultiplier, biasBonus);
        else this.arena.player.incomingDamageMultiplier = Math.max(this.arena.player.incomingDamageMultiplier, biasBonus);
      }

      // Domain Instability effects
      if (this.techDomainInstability > 0) {
        const explosionInterval = Math.max(500, 2000 - this.techDomainInstability * 15);
        this.techDomainExplosionAccum += delta;
        if (this.techDomainExplosionAccum >= explosionInterval) {
          this.techDomainExplosionAccum -= explosionInterval;
          const eAng = Math.random() * Math.PI * 2;
          const ex = dcx + Math.cos(eAng) * Math.random() * currentRadius * 0.8;
          const ey = dcy + Math.sin(eAng) * Math.random() * currentRadius * 0.8;
          const expl = this.arena.scene.add.circle(ex, ey, 10, 0x003322, 0.9).setDepth(54);
          this.arena.scene.tweens.add({ targets: expl, scaleX: 5, scaleY: 5, alpha: 0, duration: 350, onComplete: () => expl.destroy() });
          if (Phaser.Math.Distance.Between(ex, ey, this.arena.npc.x, this.arena.npc.y) <= 40) {
            this.arena.npc.takeDamage(8); this.arena.spawnHitFlash(this.arena.npc.x, this.arena.npc.y, 0x004433);
            this.arena.showFloatingText(this.arena.npc.x, this.arena.npc.y - 20, '-8 chaos', '#00ff88');
          }
          if (Phaser.Math.Distance.Between(ex, ey, this.arena.player.x, this.arena.player.y) <= 40) {
            this.arena.player.takeDamage(4);
            this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 20, '-4 chaos', '#44ffcc');
          }
        }
        const shardInterval = Math.max(500, 1500 - this.techDomainInstability * 10);
        this.techDomainShardProjAccum += delta;
        if (this.techDomainShardProjAccum >= shardInterval) {
          this.techDomainShardProjAccum -= shardInterval;
          const sAng = Math.random() * Math.PI * 2;
          const sx = dcx + Math.cos(sAng) * (currentRadius - 5);
          const sy = dcy + Math.sin(sAng) * (currentRadius - 5);
          const spd = 400 + Math.random() * 200;
          const shardProj = this.arena.projectiles.create(sx, sy, 'domain-shard') as Phaser.Physics.Arcade.Image;
          shardProj.setDepth(53).setScale(1.6).setData('owner', isPlayerTech ? 'player' : 'npc').setData('damage', 6).setData('type', 'domain-shard');
          (shardProj.body as Phaser.Physics.Arcade.Body).setVelocity(Math.cos(sAng + Math.PI) * spd, Math.sin(sAng + Math.PI) * spd);
        }
      }

      // Abuse accumulation — feeds directly into the persistent playerAbuse / npcAbuse
      let abuseRate = 0;
      for (const v of [this.techDomainInstability, this.techDomainBias, this.techDomainCollapse]) {
        if (v > 0 && v <= 50) abuseRate += 3;
        else if (v > 50) abuseRate += 10;
      }
      if (isPlayerTech) {
        this.playerAbuse = Math.min(100, this.playerAbuse + abuseRate * (delta / 1000));
        this.techDomainAbuse = this.playerAbuse;
      } else {
        this.npcAbuse = Math.min(100, this.npcAbuse + abuseRate * (delta / 1000));
        this.techDomainAbuse = this.npcAbuse;
      }

      // Update slider UI
      if (isPlayerTech) {
        const SLIDER_X = 20, SLIDER_W = 140;
        const sliderVals = [this.techDomainInstability, this.techDomainBias, this.techDomainCollapse];
        for (let i = 0; i < 3; i++) {
          const ratio = sliderVals[i] / 100;
          if (this.techDomainSliderFills[i]) this.techDomainSliderFills[i].setSize(SLIDER_W * ratio, 10);
          if (this.techDomainSliderKnobs[i]) this.techDomainSliderKnobs[i].setPosition(SLIDER_X + SLIDER_W * ratio, this.techDomainSliderBgs[i]?.y ?? 0);
        }
        if (this.techDomainAbuseBarFill) this.techDomainAbuseBarFill.setSize(SLIDER_W * (this.playerAbuse / 100), 10);
      }

      // End check — domain ends at 15s or 100% abuse
      if (time >= this.techDomainExpiry || this.techDomainAbuse >= 100) {
        this.techEndDomain();
      }
    }

    // ── Protestors update ─────────────────────────────────────────
    for (let i = this.protestors.length - 1; i >= 0; i--) {
      const p = this.protestors[i];
      if (p.hp <= 0) {
        p.sprite.destroy();
        p.hpBar.destroy();
        this.protestors.splice(i, 1);
        continue;
      }
      const target = p.target === 'player' ? this.arena.player : this.arena.npc;
      // Chase
      const pdx = target.x - p.sprite.x;
      const pdy = target.y - p.sprite.y;
      const pd = Math.hypot(pdx, pdy) || 1;
      const speed = 80;
      p.sprite.setPosition(p.sprite.x + (pdx / pd) * speed * delta / 1000,
                           p.sprite.y + (pdy / pd) * speed * delta / 1000);
      // Health bar
      const barW = 30;
      const barH = 4;
      const bx = p.sprite.x - barW / 2;
      const by = p.sprite.y - 22;
      p.hpBar.clear();
      p.hpBar.fillStyle(0x333333, 0.8);
      p.hpBar.fillRect(bx, by, barW, barH);
      p.hpBar.fillStyle(0xff2222, 1);
      p.hpBar.fillRect(bx, by, barW * (p.hp / p.maxHp), barH);
      // Melee
      if (pd <= 36 && time >= p.nextHitAt) {
        target.takeDamage(8);
        this.arena.spawnDamageNumber(target.x, target.y - 28, 8);
        p.nextHitAt = time + 500;
      }
      // Check overlap with player projectiles to damage protestors
      this.arena.projectiles.getChildren().forEach((obj) => {
        const proj = obj as Phaser.Physics.Arcade.Sprite & { isFromPlayer?: boolean; damage?: number };
        if (!proj.active) return;
        const isPlayerProj = proj.isFromPlayer === true;
        if (isPlayerProj && p.target === 'player') {
          const d = Math.hypot(proj.x - p.sprite.x, proj.y - p.sprite.y);
          if (d <= 20) {
            p.hp -= proj.damage ?? 10;
            proj.destroy();
          }
        }
      });
    }

    // ── Invis: NPC aim scatter ────────────────────────────────────
    // (handled in NPC AI — the NpcOpponent uses player pos, but we can't inject jitter here easily.
    //  Visual effect only: NPC bullets veer off randomly when playerOpSelfInvisActive)
    // This is implemented by checking playerOpSelfInvisActive in the projectile-spawn helpers.
    void this.playerOpSelfInvisActive;
    void this.npcOpSelfInvisActive;

    // Suppress unused warning for doTechWeaponAttack (used indirectly via NPC path)
    void (this.doTechWeaponAttack);
  }
}
