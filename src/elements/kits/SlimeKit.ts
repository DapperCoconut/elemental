import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import { Projectile } from '../../combat/Projectile';
import { addShards } from '../../data/PlayerData';

// ── Interfaces ────────────────────────────────────────────────────────────

interface SlimePuddle {
  sprite: Phaser.GameObjects.Arc;
  x: number;
  y: number;
  radius: number;
  expiresAt: number;
  owner: 'player' | 'npc';
}

interface SulpherSpring {
  sprite: Phaser.GameObjects.Arc;
  x: number;
  y: number;
  radius: number;
  expiresAt: number;
  owner: 'player' | 'npc';
}

export interface SlimeEntity {
  id: number;
  sprite: Phaser.GameObjects.Arc;
  state: 'held' | 'flying-out' | 'deployed' | 'flying-back' | 'shield-active' | 'shield-cooldown';
  level: 1 | 2 | 3;
  xp: number;
  variant: null | 'firey' | 'coral' | 'volatile' | 'photon' | 'prickly' | 'blood';
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;
  shieldHp: number;
  shieldMaxHp: number;
  shieldCooldownUntil: number;
  coralTouchCooldownUntil: number;
  collisionCdUntil: number;
  puddlesHitThisLaunch: Set<SlimePuddle>;
  // Upgrade state
  overleveledUntil?: number;
  photonCdUntil?: number;
  stickyTo?: Fighter | null;
  stickyUntil?: number;
  stickyDmgAccum?: number;
  miniSpawnAccum?: number;
}

interface SlimeSlotUI {
  bg: Phaser.GameObjects.Rectangle;
  lvlText: Phaser.GameObjects.Text;
  emojiText: Phaser.GameObjects.Text;
  xpBarBg: Phaser.GameObjects.Rectangle;
  xpBarFill: Phaser.GameObjects.Rectangle;
}

interface IncubatingSlime {
  slime: SlimeEntity;
  storedSince: number;
  lvl3AchievedAt: number;
  isReadyToOverLevel: boolean;
}

interface SlimeIncubator {
  sprite: Phaser.GameObjects.Arc;
  zoneSprite: Phaser.GameObjects.Arc;
  x: number;
  y: number;
  radius: number;
  storedSlimes: IncubatingSlime[];
  xpAccum: number;
  coinAccum: number;
}

interface MiniSlime {
  sprite: Phaser.GameObjects.Arc;
  x: number;
  y: number;
  vx: number;
  vy: number;
  expiresAt: number;
  contactCdUntil: number;
}

interface PetSlime {
  sprite: Phaser.GameObjects.Arc;
  x: number;
  y: number;
  vx: number;
  vy: number;
  variant: SlimeEntity['variant'];
  contactCooldowns: Map<Fighter, number>;
  photonAccum: number;
  volatileAccum: number;
  coralHealAccum: number;
}

// ── SlimeArenaApi ─────────────────────────────────────────────────────────

export interface SlimeArenaApi {
  readonly player: Fighter;
  readonly npc: Fighter;
  readonly enemies: readonly Fighter[];
  readonly scene: Phaser.Scene;
  readonly projectiles: Phaser.Physics.Arcade.Group;
  readonly eKey: Phaser.Input.Keyboard.Key;
  readonly fKey: Phaser.Input.Keyboard.Key;
  readonly rKey: Phaser.Input.Keyboard.Key;
  readonly qKey: Phaser.Input.Keyboard.Key;
  readonly spaceKey: Phaser.Input.Keyboard.Key;
  readonly pointerWasDown: boolean;
  hasUpgrade(slot: string): boolean;
  hasPerk(owner: 'player' | 'npc', perkId: string): boolean;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  getNearestEnemy(x: number, y: number): Fighter;
  buildPlayerContext(x: number, y: number): CastContext;
}

// ── SlimeKit ──────────────────────────────────────────────────────────────

export class SlimeKit {
  // ── Player state ──────────────────────────────────────────────────────
  private slimes: SlimeEntity[] = [];
  private slimePuddles: SlimePuddle[] = [];
  private sulpherSprings: SulpherSpring[] = [];
  private slimeyRainSlimes: SlimeEntity[] = [];
  private slimeyRainShadows: Array<{ sprite: Phaser.GameObjects.Arc; x: number; y: number }> = [];
  private slimeyRainPhase: 'idle' | 'shadows' | 'landed' = 'idle';
  private slimeyRainLandAt = 0;
  private slimeyRainRecallAt = 0;
  private slimeSplashActiveUntil = 0;
  private slimeSplashDropAccum = 0;
  private slimeSpeedBoostUntil = 0;
  private slimeShieldVisual: Phaser.GameObjects.Arc | null = null;
  private slimeSlotUI: SlimeSlotUI[] = [];
  private slimeHUDBg: Phaser.GameObjects.Rectangle | null = null;
  private playerSlimeConfusedUntil = 0;
  private playerSlimeConfuseVx = 0;
  private playerSlimeConfuseVy = 0;
  private playerSlimeConfuseDirUntil = 0;
  // Upgrade state
  private slimeIncubator: SlimeIncubator | null = null;
  private miniSlimes: MiniSlime[] = [];
  private petSlime: PetSlime | null = null;
  private pricklyShieldCooldowns: Map<Fighter, number> = new Map();

  // ── Blood perk state ──────────────────────────────────────────────────
  private bloodSlashCooldowns: Map<SlimeEntity, number> = new Map();
  private bloodShieldSlashAccum = 0;
  private bloodPetGrowthHp = 0;

  // ── NPC state ─────────────────────────────────────────────────────────
  private enemySlowUntil: Map<Fighter, number> = new Map();

  constructor(private arena: SlimeArenaApi) {}

  // ── Public accessors ──────────────────────────────────────────────────

  getSlimes(): readonly SlimeEntity[] { return this.slimes; }

  shouldSuppressDodge(): boolean {
    if (!this.slimeIncubator || !this.arena.spaceKey.isDown) return false;
    return Phaser.Math.Distance.Between(
      this.arena.player.x, this.arena.player.y,
      this.slimeIncubator.x, this.slimeIncubator.y,
    ) <= this.slimeIncubator.radius * 2;
  }
  getSpeedBoostUntil(): number { return this.slimeSpeedBoostUntil; }
  getNpcSlimeSlowUntil(): number { return this.enemySlowUntil.get(this.arena.npc) ?? 0; }
  setNpcSlimeSlowUntil(v: number): void { this.enemySlowUntil.set(this.arena.npc, v); }
  isEnemySlowed(enemy: Fighter, time: number): boolean { return (this.enemySlowUntil.get(enemy) ?? 0) > time; }
  getPlayerConfusedUntil(): number { return this.playerSlimeConfusedUntil; }
  getPlayerConfuseVx(): number { return this.playerSlimeConfuseVx; }
  getPlayerConfuseVy(): number { return this.playerSlimeConfuseVy; }
  getPlayerConfuseDirUntil(): number { return this.playerSlimeConfuseDirUntil; }
  setPlayerConfuseVx(v: number): void { this.playerSlimeConfuseVx = v; }
  setPlayerConfuseVy(v: number): void { this.playerSlimeConfuseVy = v; }
  setPlayerConfuseDirUntil(v: number): void { this.playerSlimeConfuseDirUntil = v; }

  // ── reset ─────────────────────────────────────────────────────────────

  reset(): void {
    this.slimes.forEach(s => s.sprite.destroy());
    this.slimes = [];
    this.slimePuddles.forEach(p => p.sprite.destroy());
    this.slimePuddles = [];
    this.sulpherSprings.forEach(s => s.sprite.destroy());
    this.sulpherSprings = [];
    this.slimeyRainSlimes.forEach(s => s.sprite.destroy());
    this.slimeyRainSlimes = [];
    this.slimeyRainShadows.forEach(s => s.sprite.destroy());
    this.slimeyRainShadows = [];
    this.slimeyRainPhase = 'idle';
    this.slimeyRainLandAt = 0;
    this.slimeyRainRecallAt = 0;
    this.slimeSplashActiveUntil = 0;
    this.slimeSplashDropAccum = 0;
    this.slimeSpeedBoostUntil = 0;
    if (this.slimeShieldVisual) { this.slimeShieldVisual.destroy(); this.slimeShieldVisual = null; }
    this.slimeSlotUI = [];
    this.slimeHUDBg = null;
    this.playerSlimeConfusedUntil = 0;
    this.playerSlimeConfuseVx = 0;
    this.playerSlimeConfuseVy = 0;
    this.playerSlimeConfuseDirUntil = 0;
    this.enemySlowUntil.clear();
    if (this.slimeIncubator) {
      this.slimeIncubator.sprite.destroy();
      this.slimeIncubator.zoneSprite.destroy();
      for (const entry of this.slimeIncubator.storedSlimes) entry.slime.sprite.destroy();
      this.slimeIncubator = null;
    }
    this.miniSlimes.forEach(m => m.sprite.destroy());
    this.miniSlimes = [];
    if (this.petSlime) { this.petSlime.sprite.destroy(); this.petSlime = null; }
    this.pricklyShieldCooldowns.clear();
    this.bloodSlashCooldowns.clear();
    this.bloodShieldSlashAccum = 0;
    this.bloodPetGrowthHp = 0;
  }

  startMatch(W: number, H: number, isPlayerSlime: boolean): void {
    if (isPlayerSlime) {
      this.initSlimes();
      this.createSlimeHUD(W, H);
      if (this.arena.hasUpgrade('e')) this.spawnIncubator(W, H);
    }
  }

  // ── Private helpers ───────────────────────────────────────────────────

  private initSlimes(): void {
    const scene = this.arena.scene;
    const count = this.arena.hasUpgrade('click') ? 4 : 3;
    for (let i = 0; i < count; i++) {
      const spr = scene.add.circle(-200, -200, 10, 0x66cc44, 0.9)
        .setStrokeStyle(1, 0x44aa22).setDepth(5).setVisible(false);
      this.slimes.push({
        id: i,
        sprite: spr,
        state: 'held',
        level: 1, xp: 0, variant: null,
        x: -200, y: -200,
        vx: 0, vy: 0,
        targetX: -200, targetY: -200,
        shieldHp: 0, shieldMaxHp: 0,
        shieldCooldownUntil: 0,
        coralTouchCooldownUntil: 0,
        collisionCdUntil: 0,
        puddlesHitThisLaunch: new Set(),
      });
    }
  }

  private createSlimeHUD(W: number, H: number): void {
    const scene = this.arena.scene;
    const count = this.arena.hasUpgrade('click') ? 4 : 3;
    const abilityCardH = 48;
    const abilityBarY = H - 30;
    const barY = abilityBarY - abilityCardH - 10;
    const slotW = 62;
    const slotH = 46;
    const gap = 6;
    const totalW = count * slotW + (count - 1) * gap;
    const startX = W / 2 - totalW / 2 + slotW / 2;

    this.slimeHUDBg = scene.add.rectangle(W / 2, barY, totalW + 16, slotH + 10, 0x0a0a18, 0.92)
      .setStrokeStyle(1, 0x223322, 1).setDepth(20);

    this.slimeSlotUI = [];
    for (let i = 0; i < count; i++) {
      const x = startX + i * (slotW + gap);
      const bg = scene.add.rectangle(x, barY, slotW - 2, slotH - 2, 0x1a3020)
        .setStrokeStyle(1, 0x335533).setDepth(21);
      const lvlText = scene.add.text(x - 4, barY + 2, '1', {
        fontSize: '20px', fontFamily: '"Arial Black", sans-serif', color: '#66cc44',
        stroke: '#002200', strokeThickness: 2,
      }).setOrigin(0.5).setDepth(23);
      const emojiText = scene.add.text(x + 16, barY - 12, '', {
        fontSize: '13px',
      }).setOrigin(0.5).setDepth(23);
      const xpBarBg = scene.add.rectangle(x, barY + 17, slotW - 8, 4, 0x112211).setDepth(22);
      const xpBarFill = scene.add.rectangle(x - (slotW - 8) / 2, barY + 17, 0, 4, 0x66cc44, 0.9)
        .setOrigin(0, 0.5).setDepth(23);
      this.slimeSlotUI.push({ bg, lvlText, emojiText, xpBarBg, xpBarFill });
    }
  }

  private refreshSlimeHUD(): void {
    const variantEmojis: Record<string, string> = {
      firey: '🔥', coral: '🪸', volatile: '💥', photon: '☀️', prickly: '🌵', blood: '🩸',
    };
    const variantColors: Record<string, number> = {
      firey: 0x3a1a10, coral: 0x3a1520, volatile: 0x251530, photon: 0x2a2a10, prickly: 0x1a1030, blood: 0x3a0a10,
    };
    const variantTextColors: Record<string, string> = {
      firey: '#ff8844', coral: '#ff88aa', volatile: '#aa88dd', photon: '#ffee88', prickly: '#bb88ff', blood: '#ff3355',
    };

    for (let i = 0; i < this.slimeSlotUI.length && i < this.slimes.length; i++) {
      const slot = this.slimeSlotUI[i];
      const slime = this.slimes[i];

      const isShielding = slime.state === 'shield-active' || slime.state === 'shield-cooldown';
      const isDeployed = slime.state === 'deployed' || slime.state === 'flying-out' || slime.state === 'flying-back';

      let bgColor = slime.variant ? variantColors[slime.variant] ?? 0x1a3020 : 0x1a3020;
      let textColor = slime.variant ? variantTextColors[slime.variant] ?? '#66cc44' : '#66cc44';
      const alpha = isShielding ? 0.4 : isDeployed ? 0.55 : 0.9;

      if (isShielding) {
        bgColor = 0x1a1a1a;
        textColor = '#555555';
      }

      slot.bg.setFillStyle(bgColor, alpha);
      slot.lvlText.setText(String(slime.level)).setColor(textColor);
      slot.emojiText.setText(slime.variant ? variantEmojis[slime.variant] ?? '' : '');

      let xpProgress = 0;
      if (slime.level === 1) xpProgress = Math.min(1, slime.xp / 50);
      else if (slime.level === 2) xpProgress = Math.min(1, (slime.xp - 50) / 100);
      else xpProgress = 1;
      const barW = slot.xpBarBg.width;
      slot.xpBarFill.setSize(barW * xpProgress, 4);
      const xpColor = slime.variant === 'firey' ? 0xff8844
        : slime.variant === 'coral' ? 0xff88aa
        : slime.variant === 'volatile' ? 0xaa88dd
        : slime.variant === 'photon' ? 0xffee88
        : slime.variant === 'prickly' ? 0xbb88ff
        : slime.variant === 'blood' ? 0xff3355
        : 0x66cc44;
      slot.xpBarFill.setFillStyle(xpColor, isShielding ? 0.2 : 0.9);
    }
  }

  private bloodHealGrowth(amount: number): void {
    if (!this.arena.hasPerk('player', 'blood') || !this.arena.hasUpgrade('f')) return;
    this.bloodPetGrowthHp = Math.min(this.bloodPetGrowthHp + amount, 100);
    if (this.petSlime) {
      const scale = 1 + (this.bloodPetGrowthHp / 100) * 1.5;
      this.petSlime.sprite.setRadius(Math.round(10 * scale));
    }
  }

  private getSlimeColor(slime: SlimeEntity): number {
    if (slime.variant === 'firey') return 0xff6622;
    if (slime.variant === 'coral') return 0xff88aa;
    if (slime.variant === 'volatile') return 0xaa44dd;
    if (slime.variant === 'photon') return 0xfff2a0;
    if (slime.variant === 'prickly') return 0x9c6aff;
    if (slime.variant === 'blood') return 0xcc1133;
    return 0x66cc44;
  }

  private checkSlimeLevelUp(slime: SlimeEntity): void {
    if (slime.level === 1 && slime.xp >= 50) {
      slime.level = 2;
      slime.sprite.setRadius(13);
      this.arena.showFloatingText(slime.x, slime.y - 20, '🟢 Level 2!', '#66cc44');
    } else if (slime.level === 2 && slime.xp >= 150) {
      slime.level = 3;
      slime.sprite.setRadius(16);
      this.arena.showFloatingText(slime.x, slime.y - 20, '🟢 Level 3!', '#88ff44');
    }
  }

  private spawnIncubator(W: number, H: number): void {
    const scene = this.arena.scene;
    const x = W / 2;
    const y = 70;
    const radius = 32;
    const zoneSprite = scene.add.circle(x, y, radius * 1.5, 0x88ff44, 0.07)
      .setStrokeStyle(2, 0x88ff44, 0.35).setDepth(2);
    const sprite = scene.add.circle(x, y, radius, 0x44aa22, 0.55)
      .setStrokeStyle(2, 0x66cc44, 0.8).setDepth(3).setInteractive();
    scene.tweens.add({ targets: sprite, scaleX: 1.06, scaleY: 1.06, yoyo: true, repeat: -1, duration: 900 });
    this.slimeIncubator = {
      sprite, zoneSprite,
      x, y, radius,
      storedSlimes: [],
      xpAccum: 0,
      coinAccum: 0,
    };
    sprite.on('pointerdown', () => {
      if (this.slimeIncubator && this.slimeIncubator.storedSlimes.length > 0) this.releaseFromIncubator();
    });
    scene.add.text(x, y - radius - 12, 'Incubator', {
      fontSize: '10px', color: '#88ff44', stroke: '#002200', strokeThickness: 1,
    }).setOrigin(0.5).setDepth(4);
  }

  private releaseFromIncubator(): void {
    const inc = this.slimeIncubator!;
    if (inc.storedSlimes.length === 0) return;
    const entry = inc.storedSlimes.shift()!;
    const { slime } = entry;
    if (entry.isReadyToOverLevel) {
      slime.overleveledUntil = this.arena.scene.time.now + 5000;
      slime.sprite.setRadius(24);
      this.arena.showFloatingText(inc.x, inc.y - 30, '🟢 OVER-LEVELED!', '#00ff44');
    }
    slime.x = inc.x;
    slime.y = inc.y;
    slime.sprite.setPosition(inc.x, inc.y);
    slime.sprite.setVisible(true);
    slime.state = 'flying-back';
    this.slimes.push(slime);
    this.arena.showFloatingText(inc.x, inc.y - 20, '🟢 Released!', '#66cc44');
  }

  private firePhoton(fromX: number, fromY: number, target: Fighter): void {
    const scene = this.arena.scene;
    const dx = target.x - fromX;
    const dy = target.y - fromY;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const speed = 380;
    const proj = new Projectile(scene, fromX, fromY, 'proj-sun', 10, true);
    this.arena.projectiles.add(proj);
    proj.launch((dx / len) * speed, (dy / len) * speed);
  }

  // ── update ────────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    const { player, npc, scene } = this.arena;
    const { width: W, height: H } = scene.scale;
    const pad = 32;

    // Drive flying slimes and rain slimes
    const allSlimes = [...this.slimes, ...this.slimeyRainSlimes];
    for (const s of allSlimes) {
      if (s.state === 'flying-out' || s.state === 'flying-back') {
        const isRainSlime = this.slimeyRainSlimes.includes(s);
        if (s.state === 'flying-back') {
          const dx = player.x - s.x;
          const dy = player.y - s.y;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          s.vx = (dx / len) * 520;
          s.vy = (dy / len) * 520;
        }
        s.x += s.vx * (delta / 1000);
        s.y += s.vy * (delta / 1000);
        s.sprite.setPosition(s.x, s.y);

        const hitRadius = s.level === 3 ? 20 : s.level === 2 ? 17 : 14;
        for (const t of this.arena.enemies) {
          if (!t.active || t.hp <= 0) continue;
          if (Phaser.Math.Distance.Between(s.x, s.y, t.x, t.y) <= hitRadius + 20 && time >= s.collisionCdUntil) {
            let dmg = s.level === 1 ? 8 : s.level === 2 ? 12 : 15;
            if (s.overleveledUntil && time < s.overleveledUntil) dmg *= 2;
            t.takeDamage(dmg);
            this.arena.spawnHitFlash(t.x, t.y, this.getSlimeColor(s));
            this.arena.showFloatingText(t.x, t.y - 20, String(dmg), '#66cc44');
            if (s.level === 3) this.enemySlowUntil.set(t, Math.max(this.enemySlowUntil.get(t) ?? 0, time + 2000));
            if (s.variant === 'firey') t.burningUntil = Math.max(t.burningUntil, time + 3000);
            // Blood Q+: heal on return-contact damage
            if (s.variant === 'blood' && s.state === 'flying-back' && this.arena.hasPerk('player', 'blood') && this.arena.hasUpgrade('q')) {
              const healAmt = Math.floor(dmg * 0.5);
              player.heal(healAmt);
              this.bloodHealGrowth(healAmt);
              this.arena.showFloatingText(player.x, player.y - 30, `🩸 +${healAmt}`, '#ff3355');
            }
            if (s.variant === 'prickly' && !s.stickyTo) {
              s.stickyTo = t;
              s.stickyUntil = time + 2000;
              s.stickyDmgAccum = 0;
              s.state = 'deployed';
              s.vx = 0; s.vy = 0;
            } else {
              s.collisionCdUntil = time + 1000;
            }
          }
        }

        // XP from slime puddles on outgoing flight
        if (s.state === 'flying-out') {
          for (const puddle of this.slimePuddles) {
            if (!s.puddlesHitThisLaunch.has(puddle)) {
              const pDist = Phaser.Math.Distance.Between(s.x, s.y, puddle.x, puddle.y);
              if (pDist <= puddle.radius) {
                s.puddlesHitThisLaunch.add(puddle);
                if (!isRainSlime) {
                  s.xp += 10;
                  this.arena.showFloatingText(s.x, s.y - 15, '+10 XP', '#88dd44');
                  this.checkSlimeLevelUp(s);
                }
              }
            }
          }
        }

        if (s.state === 'flying-back') {
          const pDist = Phaser.Math.Distance.Between(s.x, s.y, player.x, player.y);
          if (pDist <= 24) {
            if (isRainSlime) {
              s.sprite.destroy();
              this.slimeyRainSlimes.splice(this.slimeyRainSlimes.indexOf(s), 1);
            } else {
              s.state = 'held';
              s.sprite.setVisible(false);
              s.puddlesHitThisLaunch = new Set();
              if (s.variant === 'coral') {
                player.heal(5);
                this.bloodHealGrowth(5);
                this.arena.showFloatingText(player.x, player.y - 30, '+5 HP 🪸', '#ff88aa');
              }
            }
          }
        } else if (s.state === 'flying-out') {
          const tDist = Phaser.Math.Distance.Between(s.x, s.y, s.targetX, s.targetY);
          if (tDist <= 14) {
            s.x = Phaser.Math.Clamp(s.targetX, pad, W - pad);
            s.y = Phaser.Math.Clamp(s.targetY, pad, H - pad);
            s.sprite.setPosition(s.x, s.y);
            s.state = 'deployed';
            s.vx = 0; s.vy = 0;
          } else if (s.x < pad || s.x > W - pad || s.y < pad || s.y > H - pad) {
            s.x = Phaser.Math.Clamp(s.x, pad, W - pad);
            s.y = Phaser.Math.Clamp(s.y, pad, H - pad);
            s.sprite.setPosition(s.x, s.y);
            s.state = 'deployed';
            s.vx = 0; s.vy = 0;
          }
        }
      }

      // Blood: deployed blood slime slashes nearby enemies every 1.5s, healing owner
      if (s.state === 'deployed' && s.variant === 'blood' && this.arena.hasPerk('player', 'blood')) {
        const nextSlash = this.bloodSlashCooldowns.get(s) ?? 0;
        if (time >= nextSlash) {
          let slashed = false;
          for (const t of this.arena.enemies) {
            if (!t.active || t.hp <= 0) continue;
            if (Phaser.Math.Distance.Between(s.x, s.y, t.x, t.y) <= 80) {
              this.bloodSlashCooldowns.set(s, time + 1500);
              const dmg = s.level === 1 ? 6 : s.level === 2 ? 9 : 12;
              t.takeDamage(dmg);
              this.arena.spawnHitFlash(t.x, t.y, 0xcc1133);
              this.arena.showFloatingText(s.x, s.y - 20, '🩸 SLASH', '#ff3355');
              const healAmt = Math.floor(dmg * 0.5);
              player.heal(healAmt);
              this.bloodHealGrowth(healAmt);
              this.arena.showFloatingText(player.x, player.y - 30, `❤️ +${healAmt}`, '#ff3355');
              // Draw a brief slash arc
              const slash = scene.add.graphics().setDepth(8);
              slash.lineStyle(2, 0xcc1133, 0.9);
              slash.strokeCircle(s.x, s.y, 12);
              scene.tweens.add({ targets: slash, alpha: 0, scaleX: 2, scaleY: 2, duration: 200, onComplete: () => slash.destroy() });
              slashed = true;
              break;
            }
          }
          if (!slashed) this.bloodSlashCooldowns.set(s, time + 1500);
        }
      }

      // Coral: player touching deployed coral slime heals
      if (s.state === 'deployed' && s.variant === 'coral' && !this.slimeyRainSlimes.includes(s)) {
        const dist = Phaser.Math.Distance.Between(player.x, player.y, s.x, s.y);
        if (dist <= 28 && time > s.coralTouchCooldownUntil) {
          s.coralTouchCooldownUntil = time + 3000;
          player.heal(10);
          this.bloodHealGrowth(10);
          this.arena.showFloatingText(player.x, player.y - 30, '+10 HP 🪸', '#ff88aa');
        }
      }

      // Prickly: pin to enemy, tick damage
      if (s.state === 'deployed' && s.variant === 'prickly' && s.stickyTo) {
        const target = s.stickyTo;
        if (!target.active || target.hp <= 0 || !s.stickyUntil || time >= s.stickyUntil) {
          s.stickyTo = null;
          s.stickyUntil = 0;
          s.state = 'flying-back';
        } else {
          s.x = target.x;
          s.y = target.y;
          s.sprite.setPosition(s.x, s.y);
          s.stickyDmgAccum = (s.stickyDmgAccum ?? 0) + delta;
          if (s.stickyDmgAccum >= 250) {
            s.stickyDmgAccum -= 250;
            target.takeDamage(2);
            this.arena.spawnHitFlash(s.x, s.y, 0x9c6aff);
          }
        }
      }

      // Photon: fire at nearest enemy when stationary (R+ required)
      if (s.state === 'deployed' && s.variant === 'photon' && !this.slimeyRainSlimes.includes(s)
          && this.arena.hasUpgrade('r') && time >= (s.photonCdUntil ?? 0)) {
        const target = this.arena.getNearestEnemy(s.x, s.y);
        if (target.active && target.hp > 0) {
          s.photonCdUntil = time + 2000;
          this.firePhoton(s.x, s.y, target);
          this.arena.showFloatingText(s.x, s.y - 16, '☀️', '#ffee88');
        }
      }

      // Over-leveled: mini-slime spawns
      if (s.state === 'deployed' && s.overleveledUntil && time < s.overleveledUntil) {
        s.sprite.setRadius(24);
        s.miniSpawnAccum = (s.miniSpawnAccum ?? 0) + delta;
        if (s.miniSpawnAccum >= 1500) {
          s.miniSpawnAccum -= 1500;
          this.spawnMiniSlime(s.x, s.y, time);
        }
      }
    }

    // Slimey Splash: drip puddles under deployed slimes
    if (time < this.slimeSplashActiveUntil) {
      this.slimeSplashDropAccum += delta;
      if (this.slimeSplashDropAccum >= 1000) {
        this.slimeSplashDropAccum -= 1000;
        for (const s of this.slimes) {
          if (s.state === 'deployed' || s.state === 'flying-out') {
            const spr = scene.add.circle(s.x, s.y, 28, 0x44aa22, 0.45).setDepth(2);
            scene.tweens.add({ targets: spr, scaleX: 1.2, scaleY: 1.2, alpha: 0.2, duration: 4000 });
            this.slimePuddles.push({ sprite: spr, x: s.x, y: s.y, radius: 28, expiresAt: time + 5000, owner: 'player' });
          }
        }
      }
    }

    // Apply 25% slow to enemies inside slime puddles
    for (const p of this.slimePuddles) {
      for (const t of this.arena.enemies) {
        if (!t.active || t.hp <= 0) continue;
        if (Phaser.Math.Distance.Between(t.x, t.y, p.x, p.y) <= p.radius) {
          this.enemySlowUntil.set(t, Math.max(this.enemySlowUntil.get(t) ?? 0, time + 200));
        }
      }
    }

    // Expire slime puddles
    for (let i = this.slimePuddles.length - 1; i >= 0; i--) {
      const p = this.slimePuddles[i];
      if (time > p.expiresAt) {
        p.sprite.destroy();
        this.slimePuddles.splice(i, 1);
      }
    }

    // Sulpher springs
    for (let i = this.sulpherSprings.length - 1; i >= 0; i--) {
      const spring = this.sulpherSprings[i];
      if (time > spring.expiresAt) {
        spring.sprite.destroy();
        this.sulpherSprings.splice(i, 1);
        continue;
      }
      if (spring.owner === 'player') {
        const pd = Phaser.Math.Distance.Between(spring.x, spring.y, player.x, player.y);
        if (pd <= spring.radius) {
          if (time > this.playerSlimeConfusedUntil) {
            this.arena.showFloatingText(player.x, player.y - 30, '😵 Confused!', '#eedd44');
          }
          this.playerSlimeConfusedUntil = Math.max(this.playerSlimeConfusedUntil, time + 2000);
        }
      }
      if (spring.owner === 'player') {
        for (const t of this.arena.enemies) {
          if (!t.active || t.hp <= 0) continue;
          if (Phaser.Math.Distance.Between(spring.x, spring.y, t.x, t.y) <= spring.radius) {
            if (time > t.slimeConfusedUntil) {
              this.arena.showFloatingText(t.x, t.y - 20, '😵 Confused!', '#eedd44');
            }
            t.slimeConfusedUntil = Math.max(t.slimeConfusedUntil, time + 2000);
          }
        }
      }
      // Slime contact — assign variant, then consume spring
      let springConsumed = false;
      for (const s of this.slimes) {
        if (s.variant !== null) continue;
        if (s.state !== 'deployed' && s.state !== 'flying-out') continue;
        const sd = Phaser.Math.Distance.Between(s.x, s.y, spring.x, spring.y);
        if (sd <= spring.radius) {
          const baseVariants: Array<SlimeEntity['variant']> = ['firey', 'coral', 'volatile'];
          let variants: Array<SlimeEntity['variant']> = this.arena.hasUpgrade('r')
            ? [...baseVariants, 'photon', 'prickly']
            : baseVariants;
          if (this.arena.hasPerk('player', 'blood')) variants = [...variants, 'blood'];
          s.variant = variants[Math.floor(Math.random() * variants.length)];
          s.sprite.setFillStyle(this.getSlimeColor(s));
          const emojis: Record<string, string> = {
            firey: '🔥', coral: '🪸', volatile: '💥', photon: '☀️', prickly: '🌵',
          };
          this.arena.showFloatingText(s.x, s.y - 20, `${emojis[s.variant!] ?? ''} Variant!`, '#eedd44');
          springConsumed = true;
          break;
        }
      }
      if (springConsumed) {
        spring.sprite.destroy();
        this.sulpherSprings.splice(i, 1);
        continue;
      }
    }

    // Shield visual follow player, coral heal
    const shieldingSlime = this.slimes.find(s => s.state === 'shield-active');
    if (shieldingSlime) {
      if (this.slimeShieldVisual) this.slimeShieldVisual.setPosition(player.x, player.y);
      if (shieldingSlime.variant === 'coral') { player.heal(3 * delta / 1000); this.bloodHealGrowth(3 * delta / 1000); }

      // Blood shield: strike nearby enemies every 1s, healing owner
      if (shieldingSlime.variant === 'blood' && this.arena.hasPerk('player', 'blood')) {
        this.bloodShieldSlashAccum += delta;
        if (this.bloodShieldSlashAccum >= 1000) {
          this.bloodShieldSlashAccum -= 1000;
          for (const t of this.arena.enemies) {
            if (!t.active || t.hp <= 0) continue;
            if (Phaser.Math.Distance.Between(player.x, player.y, t.x, t.y) <= 60) {
              const dmg = 6;
              t.takeDamage(dmg);
              this.arena.spawnHitFlash(t.x, t.y, 0xcc1133);
              this.arena.showFloatingText(t.x, t.y - 20, '🩸 STRIKE', '#ff3355');
              const healAmt = Math.floor(dmg * 0.5);
              player.heal(healAmt);
              this.bloodHealGrowth(healAmt);
              this.arena.showFloatingText(player.x, player.y - 30, `❤️ +${healAmt}`, '#ff3355');
            }
          }
        }
      }

      // Prickly shield: damage enemies in range
      if (shieldingSlime.variant === 'prickly' && this.arena.hasUpgrade('r')) {
        for (const t of this.arena.enemies) {
          if (!t.active || t.hp <= 0) continue;
          if (Phaser.Math.Distance.Between(player.x, player.y, t.x, t.y) <= 40) {
            const nextHit = this.pricklyShieldCooldowns.get(t) ?? 0;
            if (time >= nextHit) {
              this.pricklyShieldCooldowns.set(t, time + 1000);
              t.takeDamage(5);
              this.arena.spawnHitFlash(t.x, t.y, 0x9c6aff);
              this.arena.showFloatingText(t.x, t.y - 20, '5 🌵', '#9c6aff');
            }
          }
        }
      }
    } else {
      if (this.slimeShieldVisual) {
        this.slimeShieldVisual.destroy();
        this.slimeShieldVisual = null;
      }
      if (this.petSlime) {
        this.petSlime.sprite.destroy();
        this.petSlime = null;
      }
    }

    // Shield-cooldown expiry → back to held
    for (const s of this.slimes) {
      if (s.state === 'shield-cooldown' && time >= s.shieldCooldownUntil) s.state = 'held';
    }

    // Pet slime update
    if (this.petSlime) {
      const pet = this.petSlime;
      const maxSpeed = 180;
      const targetOffset = 70;
      const dx = player.x - pet.x;
      const dy = player.y - pet.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > targetOffset) {
        const spd = Math.min(maxSpeed, (dist - targetOffset) * 3);
        pet.vx = (dx / dist) * spd;
        pet.vy = (dy / dist) * spd;
      } else {
        pet.vx *= 0.8;
        pet.vy *= 0.8;
      }
      pet.x += pet.vx * (delta / 1000);
      pet.y += pet.vy * (delta / 1000);
      pet.sprite.setPosition(pet.x, pet.y);

      // Contact damage
      for (const t of this.arena.enemies) {
        if (!t.active || t.hp <= 0) continue;
        const cdUntil = pet.contactCooldowns.get(t) ?? 0;
        if (time < cdUntil) continue;
        if (Phaser.Math.Distance.Between(pet.x, pet.y, t.x, t.y) <= 22) {
          pet.contactCooldowns.set(t, time + 1000);
          let dmg = 5;
          if (pet.variant === 'firey') dmg = Math.round(dmg * 1.25);
          if (pet.variant === 'blood') dmg = Math.round(dmg * (1 + (this.bloodPetGrowthHp / 100) * 1.5));
          t.takeDamage(dmg);
          this.arena.spawnHitFlash(t.x, t.y, this.getSlimeColor({ variant: pet.variant } as SlimeEntity));
          this.arena.showFloatingText(t.x, t.y - 20, String(dmg), '#66cc44');
          if (pet.variant === 'firey') t.burningUntil = Math.max(t.burningUntil, time + 3000);
          if (pet.variant === 'blood') {
            const healAmt = Math.floor(dmg * 0.5);
            player.heal(healAmt);
            this.bloodHealGrowth(healAmt);
            this.arena.showFloatingText(player.x, player.y - 30, `🩸 +${healAmt}`, '#ff3355');
          }
        }
      }

      // Variant effects
      if (pet.variant === 'coral') {
        pet.coralHealAccum += delta;
        if (pet.coralHealAccum >= 2000) {
          pet.coralHealAccum -= 2000;
          player.heal(1);
          this.bloodHealGrowth(1);
        }
      }
      if (pet.variant === 'volatile') {
        pet.volatileAccum += delta;
        if (pet.volatileAccum >= 3000) {
          pet.volatileAccum -= 3000;
          const aoe = scene.add.circle(pet.x, pet.y, 10, 0xaa44dd, 0.8).setDepth(4);
          scene.tweens.add({ targets: aoe, scaleX: 8, scaleY: 8, alpha: 0, duration: 500, onComplete: () => aoe.destroy() });
          for (const t of this.arena.enemies) {
            if (!t.active || t.hp <= 0) continue;
            if (Phaser.Math.Distance.Between(pet.x, pet.y, t.x, t.y) <= 80) {
              t.takeDamage(20);
              this.arena.spawnHitFlash(t.x, t.y, 0xaa44dd);
              this.arena.showFloatingText(t.x, t.y - 20, '💥 20', '#aa44dd');
            }
          }
        }
      }
      if (pet.variant === 'photon' && this.arena.hasUpgrade('r')) {
        pet.photonAccum += delta;
        if (pet.photonAccum >= 1500) {
          pet.photonAccum -= 1500;
          const target = this.arena.getNearestEnemy(pet.x, pet.y);
          if (target.active && target.hp > 0) this.firePhoton(pet.x, pet.y, target);
        }
      }
    }

    // Mini slimes
    for (let i = this.miniSlimes.length - 1; i >= 0; i--) {
      const m = this.miniSlimes[i];
      if (time > m.expiresAt) {
        m.sprite.destroy();
        this.miniSlimes.splice(i, 1);
        continue;
      }
      const target = this.arena.getNearestEnemy(m.x, m.y);
      if (target.active && target.hp > 0) {
        const dx = target.x - m.x;
        const dy = target.y - m.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        m.vx = (dx / len) * 200;
        m.vy = (dy / len) * 200;
      }
      m.x += m.vx * (delta / 1000);
      m.y += m.vy * (delta / 1000);
      m.sprite.setPosition(m.x, m.y);
      if (time >= m.contactCdUntil) {
        for (const t of this.arena.enemies) {
          if (!t.active || t.hp <= 0) continue;
          if (Phaser.Math.Distance.Between(m.x, m.y, t.x, t.y) <= 14) {
            t.takeDamage(5);
            this.arena.spawnHitFlash(t.x, t.y, 0x00ff44);
            this.arena.showFloatingText(t.x, t.y - 20, '5', '#00ff44');
            m.contactCdUntil = time + 1000;
            break;
          }
        }
      }
    }

    // Incubator update
    if (this.slimeIncubator) {
      const inc = this.slimeIncubator;

      // Catch incoming flying-out slimes (max 2 stored)
      for (let si = this.slimes.length - 1; si >= 0; si--) {
        const s = this.slimes[si];
        if (s.state !== 'flying-out') continue;
        if (inc.storedSlimes.length < 2 && Phaser.Math.Distance.Between(s.x, s.y, inc.x, inc.y) <= inc.radius + 10) {
          this.slimes.splice(si, 1);
          inc.storedSlimes.push({ slime: s, storedSince: time, lvl3AchievedAt: 0, isReadyToOverLevel: false });
          s.sprite.setVisible(true);
          s.state = 'held';
          this.arena.showFloatingText(inc.x, inc.y - 20, '🟢 Incubating!', '#88dd44');
          break;
        }
      }

      // Passive XP for all stored slimes (slow rate)
      if (inc.storedSlimes.length > 0) {
        inc.xpAccum += delta;
        if (inc.xpAccum >= 3000) {
          inc.xpAccum -= 3000;
          for (const entry of inc.storedSlimes) {
            const prevLevel = entry.slime.level;
            entry.slime.xp += 5;
            this.checkSlimeLevelUp(entry.slime);
            if (entry.slime.level === 3 && prevLevel < 3) {
              entry.lvl3AchievedAt = time;
            }
          }
        }
        // Position stored slimes spread slightly within incubator
        for (let i = 0; i < inc.storedSlimes.length; i++) {
          const offsetX = (i - (inc.storedSlimes.length - 1) / 2) * 14;
          inc.storedSlimes[i].slime.sprite.setPosition(inc.x + offsetX, inc.y);
        }
        // Check over-level readiness per slot
        for (const entry of inc.storedSlimes) {
          if (entry.slime.level === 3 && !entry.isReadyToOverLevel
              && entry.lvl3AchievedAt > 0 && time - entry.lvl3AchievedAt >= 10000) {
            entry.isReadyToOverLevel = true;
            this.arena.showFloatingText(inc.x, inc.y - 30, '⚡ Over-leveled ready!', '#00ff44');
          }
        }
      }

      // Space held near incubator: earn shards, suppress dodge
      const playerDistToInc = Phaser.Math.Distance.Between(player.x, player.y, inc.x, inc.y);
      if (this.arena.spaceKey.isDown && playerDistToInc <= inc.radius * 2) {
        inc.coinAccum += delta;
        while (inc.coinAccum >= 500) {
          inc.coinAccum -= 500;
          addShards(1);
          this.arena.showFloatingText(inc.x, inc.y - 45 + Phaser.Math.Between(-4, 4), '+🪙', '#ffdd44');
        }
      } else {
        inc.coinAccum = 0;
      }
    }

    // Slime Rain phase transitions
    if (this.slimeyRainPhase === 'shadows' && time >= this.slimeyRainLandAt) {
      this.slimeyRainPhase = 'landed';
      this.slimeyRainRecallAt = time + 2000;
      let rainId = 1000 + Date.now() % 10000;
      const hasVariantRain = this.arena.hasUpgrade('q');
      const allVariants: Array<SlimeEntity['variant']> = this.arena.hasUpgrade('r')
        ? ['firey', 'coral', 'volatile', 'photon', 'prickly']
        : ['firey', 'coral', 'volatile'];
      for (const shadow of this.slimeyRainShadows) {
        shadow.sprite.destroy();
        const rainVariant: SlimeEntity['variant'] = hasVariantRain && Math.random() < 0.75
          ? allVariants[Math.floor(Math.random() * allVariants.length)]
          : null;
        const rainColor = rainVariant
          ? this.getSlimeColor({ variant: rainVariant } as SlimeEntity)
          : 0x66cc44;
        const spr = scene.add.circle(shadow.x, shadow.y - 150, 10, rainColor, 0.9)
          .setStrokeStyle(1, 0x44aa22).setDepth(5).setVisible(true);
        scene.tweens.add({ targets: spr, y: shadow.y, duration: 350, ease: 'Quad.easeIn' });
        const rainSlime: SlimeEntity = {
          id: rainId++, sprite: spr, state: 'deployed',
          level: 1, xp: 0, variant: rainVariant,
          x: shadow.x, y: shadow.y,
          vx: 0, vy: 0,
          targetX: shadow.x, targetY: shadow.y,
          shieldHp: 0, shieldMaxHp: 0, shieldCooldownUntil: 0,
          coralTouchCooldownUntil: 0, collisionCdUntil: 0, puddlesHitThisLaunch: new Set(),
        };
        this.slimeyRainSlimes.push(rainSlime);
        const capX = shadow.x, capY = shadow.y;
        const capVariant = rainVariant;
        scene.time.delayedCall(350, () => {
          rainSlime.sprite.setPosition(capX, capY);
          rainSlime.x = capX; rainSlime.y = capY;
          let aoeRadius = 8;
          let aoeDmg = 12;
          if (capVariant === 'volatile') { aoeRadius = 16; aoeDmg = 24; }
          const aoe = scene.add.circle(capX, capY, aoeRadius, rainColor, 0.8).setDepth(4);
          scene.tweens.add({ targets: aoe, scaleX: 6, scaleY: 6, alpha: 0, duration: 500, onComplete: () => aoe.destroy() });
          for (const t of this.arena.enemies) {
            if (!t.active || t.hp <= 0) continue;
            const impactRadius = capVariant === 'volatile' ? 80 : 50;
            if (Phaser.Math.Distance.Between(capX, capY, t.x, t.y) <= impactRadius) {
              t.takeDamage(aoeDmg);
              this.arena.spawnHitFlash(t.x, t.y, rainColor);
              this.arena.showFloatingText(t.x, t.y - 20, String(aoeDmg), '#66cc44');
              if (capVariant === 'firey') t.burningUntil = Math.max(t.burningUntil, scene.time.now + 3000);
            }
          }
        });
      }
      this.slimeyRainShadows = [];
      this.arena.showFloatingText(W / 2, H / 2 - 60, 'Slime Rain!', '#66cc44');
    } else if (this.slimeyRainPhase === 'landed' && time >= this.slimeyRainRecallAt) {
      this.slimeyRainPhase = 'idle';
      for (const s of this.slimeyRainSlimes) {
        // Variant return effects
        if (s.variant === 'coral') {
          player.heal(3);
          this.arena.showFloatingText(player.x, player.y - 30, '+3 HP 🪸', '#ff88aa');
        }
        s.state = 'flying-back';
      }
    }

    this.refreshSlimeHUD();
  }

  private spawnMiniSlime(x: number, y: number, time: number): void {
    const scene = this.arena.scene;
    const spr = scene.add.circle(x, y, 5, 0x00ff44, 0.9)
      .setStrokeStyle(1, 0x44aa22).setDepth(5);
    this.miniSlimes.push({
      sprite: spr, x, y, vx: 0, vy: 0,
      expiresAt: time + 3000,
      contactCdUntil: 0,
    });
  }

  // ── handleInput ───────────────────────────────────────────────────────

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    const { player, npc, scene, eKey, fKey, rKey, qKey, pointerWasDown } = this.arena;
    const playerCtx = this.arena.buildPlayerContext(mouseX, mouseY);

    // Click: Slime Shot or Recall
    if (pointer.isDown && !pointerWasDown) {
      const availableSlime = this.slimes.find(s => s.state === 'held');
      if (availableSlime) {
        if (player.castAbility('slime-shot', playerCtx)) {
          availableSlime.state = 'flying-out';
          availableSlime.x = player.x;
          availableSlime.y = player.y;
          availableSlime.targetX = mouseX;
          availableSlime.targetY = mouseY;
          const dx = mouseX - player.x;
          const dy = mouseY - player.y;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          availableSlime.vx = (dx / len) * 520;
          availableSlime.vy = (dy / len) * 520;
          availableSlime.sprite.setVisible(true);
          availableSlime.sprite.setFillStyle(this.getSlimeColor(availableSlime));
          availableSlime.sprite.setRadius(availableSlime.level === 1 ? 10 : availableSlime.level === 2 ? 13 : 16);
          availableSlime.sprite.setPosition(player.x, player.y);
          availableSlime.collisionCdUntil = 0;
          availableSlime.puddlesHitThisLaunch = new Set();
          availableSlime.stickyTo = null;
          availableSlime.stickyUntil = 0;

          if (availableSlime.variant === 'volatile') {
            const aoe = scene.add.circle(player.x, player.y, 10, 0xaa44dd, 0.8).setDepth(4);
            scene.tweens.add({ targets: aoe, scaleX: 6, scaleY: 6, alpha: 0, duration: 400, onComplete: () => aoe.destroy() });
            for (const t of this.arena.enemies) {
              if (!t.active || t.hp <= 0) continue;
              if (Phaser.Math.Distance.Between(player.x, player.y, t.x, t.y) <= 50) {
                t.takeDamage(12);
                this.arena.spawnHitFlash(t.x, t.y, 0xaa44dd);
                this.arena.showFloatingText(t.x, t.y - 20, '12', '#aa44dd');
              }
            }
          }
        }
      } else {
        // Recall all deployed/flying slimes
        let anyRecalled = false;
        for (const s of this.slimes) {
          if (s.state === 'deployed' || s.state === 'flying-out') {
            // Prickly burst on recall
            if (s.variant === 'prickly' && s.stickyTo && s.stickyUntil && time < s.stickyUntil) {
              s.stickyTo.takeDamage(25);
              this.arena.spawnHitFlash(s.stickyTo.x, s.stickyTo.y, 0x9c6aff);
              this.arena.showFloatingText(s.stickyTo.x, s.stickyTo.y - 20, '25 🌵', '#9c6aff');
              s.stickyTo = null;
              s.stickyUntil = 0;
            }
            s.state = 'flying-back';
            anyRecalled = true;
            if (s.variant === 'volatile') {
              this.slimeSpeedBoostUntil = Math.max(this.slimeSpeedBoostUntil, time + 3000);
            }
          }
        }
        if (anyRecalled && this.slimes.some(s => s.variant === 'volatile' && s.state === 'flying-back')) {
          this.arena.showFloatingText(player.x, player.y - 30, '💥 Speed Boost!', '#aa44dd');
        }
      }
    }

    // E: Slimey Splash
    if (Phaser.Input.Keyboard.JustDown(eKey)) {
      if (player.castAbility('slimey-splash', playerCtx)) {
        this.slimeSplashActiveUntil = time + 3000;
        this.slimeSplashDropAccum = 0;
        this.arena.showFloatingText(player.x, player.y - 30, 'Slimey Splash!', '#88dd66');
      }
    }

    // R: Sulpher Spring
    if (Phaser.Input.Keyboard.JustDown(rKey)) {
      if (player.castAbility('sulpher-spring', playerCtx)) {
        const spr = scene.add.circle(mouseX, mouseY, 40, 0xeedd44, 0.4)
          .setStrokeStyle(2, 0xffee66, 0.7).setDepth(3);
        scene.tweens.add({ targets: spr, scaleX: 1.1, scaleY: 1.1, yoyo: true, repeat: -1, duration: 600 });
        this.sulpherSprings.push({ sprite: spr, x: mouseX, y: mouseY, radius: 40, expiresAt: time + 5000, owner: 'player' });
        this.arena.showFloatingText(mouseX, mouseY - 30, '🧪 Spring!', '#eedd44');
      }
    }

    // F: Slime Shield
    if (Phaser.Input.Keyboard.JustDown(fKey)) {
      const alreadyShielding = this.slimes.some(s => s.state === 'shield-active');
      const shieldCandidate = this.slimes.find(s => s.state === 'held');
      if (alreadyShielding) {
        this.arena.showFloatingText(player.x, player.y - 30, 'Shield already active!', '#ff4444');
      } else if (!shieldCandidate) {
        this.arena.showFloatingText(player.x, player.y - 30, 'No slime available!', '#ff4444');
      } else if (player.castAbility('slime-shield', playerCtx)) {
        const maxHp = shieldCandidate.level === 1 ? 25 : shieldCandidate.level === 2 ? 50 : 75;
        shieldCandidate.state = 'shield-active';
        shieldCandidate.shieldHp = maxHp;
        shieldCandidate.shieldMaxHp = maxHp;
        if (this.slimeShieldVisual) this.slimeShieldVisual.destroy();
        this.slimeShieldVisual = scene.add.circle(player.x, player.y, 30, this.getSlimeColor(shieldCandidate), 0.3)
          .setStrokeStyle(2, this.getSlimeColor(shieldCandidate), 0.6).setDepth(5);
        scene.tweens.add({ targets: this.slimeShieldVisual, alpha: 0.5, yoyo: true, repeat: -1, duration: 500 });

        // F+: spawn pet slime matching shield variant
        if (this.arena.hasUpgrade('f')) {
          if (this.petSlime) this.petSlime.sprite.destroy();
          const petColor = this.getSlimeColor(shieldCandidate);
          const petRadius = shieldCandidate.variant === 'blood'
            ? Math.round(9 * (1 + (this.bloodPetGrowthHp / 100) * 1.5))
            : 9;
          const petSpr = scene.add.circle(player.x, player.y, petRadius, petColor, 0.9)
            .setStrokeStyle(1, 0x44aa22).setDepth(5);
          this.petSlime = {
            sprite: petSpr,
            x: player.x, y: player.y,
            vx: 0, vy: 0,
            variant: shieldCandidate.variant,
            contactCooldowns: new Map(),
            photonAccum: 0,
            volatileAccum: 0,
            coralHealAccum: 0,
          };
        }

        const activeShield = shieldCandidate;
        const kitRef = this;
        player.damageAbsorber = (amount: number) => {
          if (activeShield.state !== 'shield-active') return false;
          if (activeShield.variant === 'firey') {
            const reflect = Math.round(amount * 0.33);
            if (reflect > 0) {
              let reflectTarget: Fighter = npc;
              let nearestDist = Infinity;
              for (const e of kitRef.arena.enemies) {
                if (!e.active || e.hp <= 0) continue;
                const d = Phaser.Math.Distance.Between(player.x, player.y, e.x, e.y);
                if (d < nearestDist) { nearestDist = d; reflectTarget = e; }
              }
              reflectTarget.takeDamage(reflect);
              kitRef.arena.spawnHitFlash(reflectTarget.x, reflectTarget.y, 0xff6622);
              kitRef.arena.showFloatingText(reflectTarget.x, reflectTarget.y - 20, `🔥 ${reflect}`, '#ff6622');
            }
          }
          if (activeShield.variant === 'photon' && kitRef.arena.hasUpgrade('r')) {
            const target = kitRef.arena.getNearestEnemy(player.x, player.y);
            if (target.active && target.hp > 0) kitRef.firePhoton(player.x, player.y, target);
          }
          activeShield.shieldHp -= amount;
          if (activeShield.shieldHp <= 0) {
            activeShield.state = 'shield-cooldown';
            activeShield.shieldCooldownUntil = scene.time.now + 5000;
            if (kitRef.slimeShieldVisual) { kitRef.slimeShieldVisual.destroy(); kitRef.slimeShieldVisual = null; }
            player.damageAbsorber = null;
            kitRef.arena.showFloatingText(player.x, player.y - 30, '🛡️ Shield broken! 5s CD', '#ff4444');
            if (kitRef.petSlime) { kitRef.petSlime.sprite.destroy(); kitRef.petSlime = null; }
          }
          return true;
        };
        this.arena.showFloatingText(player.x, player.y - 30, '🛡️ Slime Shield!', '#66cc44');
      }
    }

    // Q: Slime Rain
    if (Phaser.Input.Keyboard.JustDown(qKey)) {
      if (this.slimeyRainPhase === 'idle' && player.castAbility('slime-rain', playerCtx)) {
        const { width: W2, height: H2 } = scene.scale;
        const rPad = 60;
        this.slimeyRainPhase = 'shadows';
        this.slimeyRainLandAt = time + 1000;
        this.slimeyRainShadows = [];
        for (let i = 0; i < 10; i++) {
          const sx = Phaser.Math.Between(rPad, W2 - rPad);
          const sy = Phaser.Math.Between(rPad, H2 - rPad);
          const shadowSpr = scene.add.circle(sx, sy, 18, 0x66cc44, 0.3)
            .setStrokeStyle(2, 0x66cc44, 0.5).setDepth(2);
          scene.tweens.add({ targets: shadowSpr, alpha: 0.6, yoyo: true, repeat: -1, duration: 280 });
          this.slimeyRainShadows.push({ sprite: shadowSpr, x: sx, y: sy });
        }
        this.arena.showFloatingText(W2 / 2, H2 / 2 - 60, 'Slime Rain incoming!', '#55bb55');
      }
    }
  }
}
