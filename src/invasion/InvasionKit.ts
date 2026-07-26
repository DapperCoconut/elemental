import Phaser from 'phaser';
import { Husk, HuskWorld } from './Husk';
import { Fighter } from '../entities/Fighter';
import { Projectile } from '../combat/Projectile';
import { HP_SCALE } from '../data/Balance';
import {
  HuskVariantDef,
  BASIC_HUSK,
  rollHuskVariant,
  rollBossVariant,
  isBossWave,
  huskVariantIndex,
} from './HuskVariants';

/** Narrow surface the invasion kit needs from ArenaScene. */
export interface InvasionArenaApi {
  get scene(): Phaser.Scene;
  get player(): Fighter;
  get enemies(): Fighter[];
  /** Register a husk with the arena's enemies list + physics enemy group. */
  addEnemy(husk: Husk): void;
  /** Remove a husk from the arena's enemies list + physics enemy group. */
  removeEnemy(husk: Husk): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  spawnHitFlash(x: number, y: number, color: number): void;
  spawnDamageNumber(x: number, y: number, amount: number): void;
  /** End the run now (banks shards earned and shows the results screen). */
  endRun(): void;
  /** Life's plants — husks prefer these over the player, and bites land on them. */
  plantTargets(): Fighter[];
  /** Player upgrade check, for on-hit status gates (e.g. fire's Flameshredder). */
  hasUpgrade(slot: string): boolean;
  /**
   * Apply one frost stack to an arbitrary fighter. ArenaScene's own
   * addFrostStack() only speaks 'player' | 'npc', and a husk is neither.
   */
  addFrostStackTo(target: Fighter): void;
  /** Bleed aura + drips on a fighter (ArenaScene owns the visual lifecycle). */
  applyBleedVisual(target: Fighter): void;
  /** Silence: player is invisible / away in the hallway — husks can't target them. */
  isSilencePlayerHidden(): boolean;
  /** Silence: an invisible player has stalkers out — husks fire blind to hunt them. */
  silenceStalkerHunt(): boolean;
  /** Silence: a husk shot landed here — kills a player stalker in radius. Returns true if it did. */
  tryHitSilenceStalker(x: number, y: number, radius: number): boolean;
  /** Soul: a real husk died — feeds the player's corpse queue if they're playing Soul. */
  notifyHuskDefeated?(husk: Husk): void;
}

const INTERMISSION_MS = 3000;
const FIRST_WAVE_DELAY_MS = 2500;

/** Husk projectiles (spitter/ranger shots). */
const SHOT_SPEED = 290;
const SHOT_LIFETIME_MS = 3200;
const SHOT_RADIUS = 7;
const SHOT_HIT_RADIUS = 22;

const BLASTER_BOOM_RADIUS = 130;
/** Blaster damage to *other husks*, as a fraction of its damage to players. */
const BLASTER_HUSK_DAMAGE_FRAC = 1.5;

const POSSESS_HP_MULT = 2.5;
const POSSESS_SPEED_MULT = 1.8;
const POSSESS_DAMAGE_MULT = 2;
const POSSESS_SIZE_MULT = 1.25;
const POSSESS_TINT = 0xaa1133;

/** Speedsters would otherwise become literally undodgeable in the late game. */
const MAX_HUSK_SPEED = 430;

/** Ceiling on titan-summoned adds, so a long boss fight can't spiral. */
const MAX_LIVE_HUSKS = 45;

/**
 * The arena's player health bar is centred at y=18 and 24px tall, so anything
 * above y≈34 collides with it. Both the wave/husk readout and the big wave
 * banner sit below it.
 */
export const WAVE_LABEL_Y = 46;
export const WAVE_BANNER_Y = 96;

/**
 * Shared by the solo director and the co-op guest so both HUDs read identically.
 * During an intermission (no husks left) the wave number stays on screen instead
 * of the whole readout blanking out.
 */
export function formatWaveLabel(wave: number, remaining: number): string {
  if (wave <= 0) return '';
  return remaining > 0 ? `WAVE ${wave}  —  🧟 ${remaining}` : `WAVE ${wave} CLEARED`;
}

export type InvasionDifficultyId = 'normal' | 'brutal' | 'masochistic';

export interface InvasionDifficultyDef {
  id: InvasionDifficultyId;
  label: string;
  description: string;
  /** 0xRRGGBB, for UI accents (button strokes, etc.). */
  color: number;
  /** '#rrggbb', for Phaser Text color strings. */
  colorHex: string;
  hpMult: number;
  dmgMult: number;
  shardMult: number;
}

export const INVASION_DIFFICULTIES: InvasionDifficultyDef[] = [
  {
    id: 'normal', label: 'NORMAL', color: 0x88cc44, colorHex: '#88cc44',
    description: 'Standard husk waves.',
    hpMult: 1, dmgMult: 1, shardMult: 1,
  },
  {
    id: 'brutal', label: 'BRUTAL', color: 0xff8844, colorHex: '#ff8844',
    description: '2× husk health.  More mutated husks.  2× corrupt shards.',
    hpMult: 2, dmgMult: 1, shardMult: 2,
  },
  {
    id: 'masochistic', label: 'MASOCHISTIC', color: 0xff2244, colorHex: '#ff2244',
    description: '3× husk health.  2× husk damage.  Far more mutated husks.  3× corrupt shards.',
    hpMult: 3, dmgMult: 2, shardMult: 3,
  },
];

export function getInvasionDifficulty(id: string | undefined): InvasionDifficultyDef {
  return INVASION_DIFFICULTIES.find((d) => d.id === id) ?? INVASION_DIFFICULTIES[0];
}

/**
 * One-shot visual effects the co-op guest replays locally. Husk *behaviour* is
 * simulated only on the host, so these carry just enough to look right — the
 * host stays the sole authority on any damage they represent.
 */
/**
 * An on-hit status a player's projectile inflicts on a husk. Sent over the
 * wire when a co-op guest lands the hit, since only the host simulates husks.
 */
export type HuskStatus =
  | { k: 'burn'; ms: number }
  | { k: 'toxic'; ms: number; dps: number }
  | { k: 'frost'; stacks: number; shatter: boolean }
  | { k: 'bleed'; ms: number }
  // Silence remaster: click-only lockout, 20% attack whiffs, permanent grabber slow.
  | { k: 'silence'; ms: number }
  | { k: 'halluc'; ms: number }
  | { k: 'atkslow'; mult: number }
  // Silence E+ seeker cone: stabs on a panicked target drain only 50 stealth.
  | { k: 'panic'; ms: number };

export type InvasionFx =
  | { k: 'boom'; x: number; y: number; r: number }
  | { k: 'lane'; x: number; y: number; x2: number; y2: number; c: number; ms: number }
  | { k: 'heal'; x: number; y: number; r: number }
  | { k: 'shot'; x: number; y: number; vx: number; vy: number; ms: number }
  | { k: 'possess'; x: number; y: number };

/**
 * Invasion co-op hooks — wired in by InvasionCoopKit on the host side only.
 * Lets InvasionKit stay the single source of truth for wave/husk simulation
 * while the co-op layer handles all networking.
 */
export interface InvasionCoopHooks {
  /** Multiplies wave spawn counts (2× for co-op, to balance the extra player). */
  spawnMultiplier: number;
  /** Extra chase/bite targets besides the local player (the ally replica). */
  extraTargets: () => Fighter[];
  /** A husk hurt a target that isn't the local player — forward the hit to them. */
  onAllyBite: (damage: number, x: number, y: number) => void;
  onHuskDefeated: (husk: Husk, reward: number) => void;
  onWaveCleared: (wave: number, bonus: number) => void;
  /** Mirror a one-shot visual onto the guest's screen. */
  onFx: (fx: InvasionFx) => void;
  /** A boss just spawned — the guest shows the same banner. */
  onBossSpawned: (name: string, colorHex: string) => void;
}

interface HuskShot {
  gfx: Phaser.GameObjects.Arc;
  vx: number;
  vy: number;
  damage: number;
  expiresAt: number;
}

/**
 * Invasion mode director: endless waves of husks. Each wave spawns more
 * (and slightly tougher, faster, meaner) husks than the last, and mixes in
 * progressively rarer mutated variants — see HuskVariants.ts. Every tenth
 * wave adds a boss on top. Every kill pays corrupt shards; clearing a wave
 * pays a bonus.
 */
export class InvasionKit implements HuskWorld {
  private wave = 0;
  private pendingSpawns = 0;
  private nextSpawnAt = 0;
  /** Boss queued for the current wave, spawned alongside the first regular husks. */
  private pendingBoss: HuskVariantDef | null = null;
  /** > 0 while counting down to the next wave; 0 while a wave is live. */
  private intermissionUntil = 0;
  private shards = 0;
  private clearedWaves = 0;
  /** Husks still owed this wave: alive on the field + not yet spawned. */
  private remaining = 0;
  private difficulty: InvasionDifficultyDef = INVASION_DIFFICULTIES[0];
  private coopHooks: InvasionCoopHooks | null = null;
  private nextHuskId = 1;
  private shots: HuskShot[] = [];

  private waveBanner: Phaser.GameObjects.Text | null = null;
  private waveLabel: Phaser.GameObjects.Text | null = null;
  private shardLabel: Phaser.GameObjects.Text | null = null;
  private difficultyLabel: Phaser.GameObjects.Text | null = null;
  private leaveBtn: Phaser.GameObjects.Rectangle | null = null;
  private leaveLabel: Phaser.GameObjects.Text | null = null;

  constructor(private arena: InvasionArenaApi) {}

  get shardsEarned(): number { return this.shards; }
  get wavesCompleted(): number { return this.clearedWaves; }

  reset(difficulty: InvasionDifficultyDef = INVASION_DIFFICULTIES[0], coopHooks: InvasionCoopHooks | null = null): void {
    const scene = this.arena.scene;
    this.wave = 0;
    this.pendingSpawns = 0;
    this.nextSpawnAt = 0;
    this.pendingBoss = null;
    this.shards = 0;
    this.clearedWaves = 0;
    this.remaining = 0;
    this.difficulty = difficulty;
    this.coopHooks = coopHooks;
    this.nextHuskId = 1;
    this.intermissionUntil = scene.time.now + FIRST_WAVE_DELAY_MS;
    for (const s of this.shots) s.gfx.destroy();
    this.shots = [];

    const { width } = scene.scale;
    this.waveBanner?.destroy();
    this.waveBanner = scene.add.text(width / 2, WAVE_BANNER_Y, '', {
      fontSize: '28px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
      color: '#88cc44', stroke: '#1d2e0f', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(25);
    this.waveLabel?.destroy();
    this.waveLabel = scene.add.text(width / 2, WAVE_LABEL_Y, '', {
      fontSize: '14px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#aacc88',
      stroke: '#101c08', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(25);
    this.shardLabel?.destroy();
    this.shardLabel = scene.add.text(width - 16, 16, '🩸 0', {
      fontSize: '16px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#cc44ff',
    }).setOrigin(1, 0).setDepth(25);

    // Difficulty badge — only shown for the two non-default modes so a normal
    // run's HUD stays exactly as it was before difficulties existed.
    this.difficultyLabel?.destroy();
    this.difficultyLabel = difficulty.id === 'normal' ? null : scene.add.text(
      width - 16, 38, difficulty.label,
      { fontSize: '12px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: difficulty.colorHex },
    ).setOrigin(1, 0).setDepth(25);

    // Leave button — retreat with the shards earned so far
    this.leaveBtn?.destroy();
    this.leaveLabel?.destroy();
    this.leaveBtn = scene.add.rectangle(62, 30, 92, 30, 0x221111, 0.9)
      .setStrokeStyle(1, 0xcc4444).setDepth(25).setInteractive({ useHandCursor: true });
    this.leaveLabel = scene.add.text(62, 30, '🚪 LEAVE', {
      fontSize: '13px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#cc6666',
    }).setOrigin(0.5).setDepth(26);
    this.leaveBtn
      .on('pointerover', () => { this.leaveBtn!.setStrokeStyle(2, 0xff8888); this.leaveLabel!.setColor('#ffaaaa'); })
      .on('pointerout',  () => { this.leaveBtn!.setStrokeStyle(1, 0xcc4444); this.leaveLabel!.setColor('#cc6666'); })
      .on('pointerdown', () => this.arena.endRun());
  }

  update(time: number, delta: number): void {
    const player = this.arena.player;
    const alive = this.livingHusks();

    // Wave cleared → pay bonus, start intermission
    if (this.wave > 0 && this.pendingSpawns === 0 && !this.pendingBoss && alive.length === 0 && this.intermissionUntil === 0) {
      this.clearedWaves = this.wave;
      const bonus = Math.round(this.wave * 3 * this.difficulty.shardMult);
      this.shards += bonus;
      this.arena.showFloatingText(player.x, player.y - 50, `WAVE ${this.wave} CLEARED  +${bonus} 🩸`, '#88ff44');
      this.intermissionUntil = time + INTERMISSION_MS;
      this.coopHooks?.onWaveCleared(this.wave, bonus);
    }

    // Intermission over → next wave
    if (this.intermissionUntil > 0 && time >= this.intermissionUntil) {
      this.intermissionUntil = 0;
      this.startWave(this.wave + 1, time);
    }

    // Trickle out this wave's spawns
    while ((this.pendingSpawns > 0 || this.pendingBoss) && time >= this.nextSpawnAt) {
      if (this.pendingBoss) {
        const boss = this.pendingBoss;
        this.pendingBoss = null;
        this.spawnHusk(boss);
        this.announceBoss(boss);
      } else {
        this.pendingSpawns--;
        this.spawnHusk(rollHuskVariant(this.wave, this.difficulty.id, Math.random));
      }
      this.nextSpawnAt = time + Math.max(250, 900 - this.wave * 40);
    }

    // Life's plants pull aggro: while any are standing, husks ignore the players.
    const targets = this.currentTargets();
    const stalkerHunt = this.arena.silenceStalkerHunt();
    for (const husk of alive) {
      husk.huntInvisibleTargets = stalkerHunt;
      husk.update(targets, time, delta);
    }

    this.updateShots(time, delta, targets);

    this.shardLabel?.setText(`🩸 ${this.shards}`);
    this.remaining = alive.length + this.pendingSpawns + (this.pendingBoss ? 1 : 0);
    this.waveLabel?.setText(formatWaveLabel(this.wave, this.remaining));
  }

  private livingHusks(): Husk[] {
    return this.arena.enemies.filter((e): e is Husk => e instanceof Husk && e.active && e.hp > 0);
  }

  /** Who husks chase and shoot at right now (plants take priority over players). */
  private currentTargets(): Fighter[] {
    const plants = this.arena.plantTargets();
    if (plants.length > 0) return plants;
    const player = this.arena.player;
    const locals = this.arena.isSilencePlayerHidden() ? [] : [player];
    return this.coopHooks ? [...locals, ...this.coopHooks.extraTargets()] : locals;
  }

  /** Route husk-sourced damage to whichever fighter ate it (ally hits go over the wire). */
  private damageTarget(target: Fighter, amount: number): void {
    if (target === this.arena.player || this.arena.plantTargets().includes(target)) {
      // Husks are the one thing that may hit a co-op player through their
      // friendly-fire block.
      Fighter.asNonAllyDamage(() => target.takeDamage(amount));
      this.arena.spawnHitFlash(target.x, target.y, 0x88aa33);
    } else {
      // Co-op: hit the ally, not the local player — forward it to them.
      this.coopHooks?.onAllyBite(amount, target.x, target.y);
    }
  }

  private startWave(waveNum: number, time: number): void {
    this.wave = waveNum;
    this.pendingSpawns = Math.round((4 + 3 * (waveNum - 1)) * (this.coopHooks?.spawnMultiplier ?? 1));
    this.pendingBoss = isBossWave(waveNum) ? rollBossVariant(Math.random) : null;
    this.nextSpawnAt = time;

    if (!this.waveBanner) return;
    this.waveBanner.setText(`WAVE ${waveNum}`).setAlpha(1);
    this.arena.scene.tweens.killTweensOf(this.waveBanner);
    this.arena.scene.tweens.add({ targets: this.waveBanner, alpha: 0, delay: 1600, duration: 600 });
  }

  private announceBoss(boss: HuskVariantDef): void {
    const hex = `#${boss.color.toString(16).padStart(6, '0')}`;
    this.showBossBanner(boss.name, hex);
    this.coopHooks?.onBossSpawned(boss.name, hex);
  }

  /** Also called on the guest side (via the co-op kit) so both players see it. */
  showBossBanner(name: string, colorHex: string): void {
    const scene = this.arena.scene;
    const { width } = scene.scale;
    const text = scene.add.text(width / 2, WAVE_BANNER_Y + 40, `☠  ${name}  ☠`, {
      fontSize: '30px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
      color: colorHex, stroke: '#000000', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(26);
    scene.tweens.add({ targets: text, alpha: 0, scaleX: 1.3, scaleY: 1.3, delay: 1400, duration: 800, onComplete: () => text.destroy() });
    scene.cameras.main.shake(400, 0.006);
  }

  private spawnHusk(variant: HuskVariantDef = BASIC_HUSK, at?: { x: number; y: number }): void {
    const scene = this.arena.scene;
    const pos = at ?? this.pickEdgeSpawn();
    const hp = Math.round((16 + 7 * (this.wave - 1)) * this.difficulty.hpMult * HP_SCALE * variant.hpMult);
    const baseSpeed = Math.min(185, 78 + 6 * (this.wave - 1));
    const speed = Math.min(MAX_HUSK_SPEED, baseSpeed * variant.speedMult);
    const biteDamage = Math.round((5 + Math.floor(this.wave / 2)) * this.difficulty.dmgMult * variant.damageMult);

    const husk = new Husk(scene, pos.x, pos.y, hp, speed, biteDamage, 950, variant);
    husk.netId = this.nextHuskId++;
    husk.world = this;
    husk.onBite = (dmg, target) => this.damageTarget(target, dmg);
    husk.on('damaged', (amount: number) => {
      if (amount > 0 && husk.active) this.arena.spawnDamageNumber(husk.x, husk.y - 20, amount);
    });
    husk.once('defeated', () => this.onHuskKilled(husk));
    this.arena.addEnemy(husk);

    // Spawn poof
    const poof = scene.add.circle(pos.x, pos.y, 26 * variant.sizeMult, variant.color, 0.5).setDepth(4);
    scene.tweens.add({ targets: poof, scaleX: 0.2, scaleY: 0.2, alpha: 0, duration: 350, onComplete: () => poof.destroy() });
  }

  /** Random point on one of the four arena edges, inside the physics bounds. */
  private pickEdgeSpawn(): { x: number; y: number } {
    const wb = (this.arena.scene as Phaser.Scene & { physics: Phaser.Physics.Arcade.ArcadePhysics }).physics.world.bounds;
    const inset = 30;
    const edge = Phaser.Math.Between(0, 3);
    switch (edge) {
      case 0: return { x: Phaser.Math.Between(wb.x + inset, wb.right - inset), y: wb.y + inset };
      case 1: return { x: Phaser.Math.Between(wb.x + inset, wb.right - inset), y: wb.bottom - inset };
      case 2: return { x: wb.x + inset, y: Phaser.Math.Between(wb.y + inset, wb.bottom - inset) };
      default: return { x: wb.right - inset, y: Phaser.Math.Between(wb.y + inset, wb.bottom - inset) };
    }
  }

  private onHuskKilled(husk: Husk): void {
    this.arena.removeEnemy(husk);

    // A demon riding this husk is set loose rather than dying with it.
    husk.possessedBy?.releasePossession(this.arena.scene.time.now);
    // Cleaning up a demon mid-possession must not strand its victim's flag.
    if (husk.possessing) { husk.possessing.possessedBy = null; husk.possessing = null; }

    if (husk.variant.explodes) this.detonate(husk);

    const base = 1 + Math.floor((this.wave - 1) / 3);
    const reward = Math.round(base * this.difficulty.shardMult * (husk.variant.isBoss ? 10 : 1));
    this.shards += reward;
    this.arena.showFloatingText(husk.x, husk.y - 30, `+${reward} 🩸`, '#cc44ff');
    this.coopHooks?.onHuskDefeated(husk, reward);
    this.arena.notifyHuskDefeated?.(husk);
    husk.hideHealthBar();
    husk.setTint(0x334411);
    this.arena.scene.tweens.add({
      targets: husk,
      scaleX: 0.3,
      scaleY: 0.3,
      alpha: 0,
      duration: 350,
      ease: 'Power2',
      onComplete: () => { if (husk.scene) husk.destroy(); },
    });
  }

  /** Blaster death blast — hurts players *and* other husks caught in it. */
  private detonate(blaster: Husk): void {
    const r = BLASTER_BOOM_RADIUS;
    const dmg = blaster.biteDamage * 2;
    this.boomVisual(blaster.x, blaster.y, r, 0xff5522);
    this.coopHooks?.onFx({ k: 'boom', x: blaster.x, y: blaster.y, r });

    for (const t of this.currentTargets()) {
      if (Phaser.Math.Distance.Between(blaster.x, blaster.y, t.x, t.y) <= r) this.damageTarget(t, dmg);
    }
    for (const other of this.livingHusks()) {
      if (other === blaster) continue;
      if (Phaser.Math.Distance.Between(blaster.x, blaster.y, other.x, other.y) <= r) {
        other.takeDamage(Math.round(dmg * BLASTER_HUSK_DAMAGE_FRAC));
      }
    }
  }

  private boomVisual(x: number, y: number, radius: number, color: number): void {
    const scene = this.arena.scene;
    const ring = scene.add.circle(x, y, radius, color, 0.45).setDepth(6).setScale(0.25);
    scene.tweens.add({ targets: ring, scaleX: 1, scaleY: 1, alpha: 0, duration: 320, onComplete: () => ring.destroy() });
    scene.cameras.main.shake(160, 0.004);
  }

  // ── HuskWorld (variant world-effects) ────────────────────────────

  fireShot(from: Husk, tx: number, ty: number, damage: number): void {
    const scene = this.arena.scene;
    const ang = Math.atan2(ty - from.y, tx - from.x);
    const vx = Math.cos(ang) * SHOT_SPEED;
    const vy = Math.sin(ang) * SHOT_SPEED;
    const gfx = scene.add.circle(from.x, from.y, SHOT_RADIUS, from.variant.color, 1)
      .setDepth(7).setStrokeStyle(2, 0x220022, 0.8);
    this.shots.push({ gfx, vx, vy, damage, expiresAt: scene.time.now + SHOT_LIFETIME_MS });
    this.coopHooks?.onFx({ k: 'shot', x: from.x, y: from.y, vx, vy, ms: SHOT_LIFETIME_MS });
  }

  summon(count: number, x: number, y: number): void {
    // A titan summons on a fixed timer, so a long boss fight would otherwise
    // pile up husks without bound and stall the frame rate. Past the cap it
    // just skips the summon until the field thins out again.
    const alive = this.livingHusks().length;
    if (alive >= MAX_LIVE_HUSKS) return;
    count = Math.min(count, MAX_LIVE_HUSKS - alive);

    for (let i = 0; i < count; i++) {
      const ang = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const d = 70 + Math.random() * 40;
      this.spawnHusk(BASIC_HUSK, { x: x + Math.cos(ang) * d, y: y + Math.sin(ang) * d });
    }
    this.arena.showFloatingText(x, y - 50, 'SUMMON!', '#bb88ff');
  }

  healNearbyHusks(source: Husk, radius: number, frac: number): void {
    const scene = this.arena.scene;
    const ring = scene.add.circle(source.x, source.y, radius, 0x66ff88, 0.18).setDepth(3).setScale(0.4);
    scene.tweens.add({ targets: ring, scaleX: 1, scaleY: 1, alpha: 0, duration: 500, onComplete: () => ring.destroy() });
    this.coopHooks?.onFx({ k: 'heal', x: source.x, y: source.y, r: radius });

    for (const other of this.livingHusks()) {
      if (other === source || other.hp >= other.maxHp) continue;
      if (this.arena.scene.time.now < other.purgedUntil) continue;
      if (Phaser.Math.Distance.Between(source.x, source.y, other.x, other.y) > radius) continue;
      other.heal(Math.max(1, Math.round(other.maxHp * frac)));
      this.arena.showFloatingText(other.x, other.y - 26, '+', '#66ff88');
    }
  }

  telegraph(x1: number, y1: number, x2: number, y2: number, color: number, durationMs: number): void {
    this.drawLane(x1, y1, x2, y2, color, durationMs);
    this.coopHooks?.onFx({ k: 'lane', x: x1, y: y1, x2, y2, c: color, ms: durationMs });
  }

  /** Also called on the guest side to replay a rusher telegraph. */
  drawLane(x1: number, y1: number, x2: number, y2: number, color: number, durationMs: number): void {
    const scene = this.arena.scene;
    const line = scene.add.line(0, 0, x1, y1, x2, y2, color, 0.55)
      .setOrigin(0, 0).setLineWidth(6).setDepth(3);
    scene.tweens.add({
      targets: line,
      alpha: { from: 0.25, to: 0.85 },
      duration: durationMs / 2,
      yoyo: true,
      onComplete: () => line.destroy(),
    });
  }

  findPossessTarget(demon: Husk): Husk | null {
    let best: Husk | null = null;
    let bestDist = Infinity;
    for (const h of this.livingHusks()) {
      if (h === demon || h.variant.isBoss || h.possessedBy) continue;
      const d = Phaser.Math.Distance.Between(demon.x, demon.y, h.x, h.y);
      if (d < bestDist) { bestDist = d; best = h; }
    }
    return best;
  }

  possess(demon: Husk, victim: Husk): void {
    demon.possessing = victim;
    victim.possessedBy = demon;

    victim.setMaxHp(Math.round(victim.maxHp * POSSESS_HP_MULT));
    victim.speed = Math.min(MAX_HUSK_SPEED, victim.speed * POSSESS_SPEED_MULT);
    victim.biteDamage = Math.round(victim.biteDamage * POSSESS_DAMAGE_MULT);
    victim.sizeMult *= POSSESS_SIZE_MULT;
    victim.applySizeMult();
    victim.setTint(POSSESS_TINT);

    // Untouchable and hidden while riding — the only way to hurt it is to kill the host.
    demon.isInvincible = true;
    demon.setVisible(false);
    demon.hideHealthBar();

    this.arena.showFloatingText(victim.x, victim.y - 44, 'POSSESSED!', '#ff4466');
    this.boomVisual(victim.x, victim.y, 60, 0x880022);
    this.coopHooks?.onFx({ k: 'possess', x: victim.x, y: victim.y });
  }

  // ── Husk projectiles ─────────────────────────────────────────────

  private updateShots(time: number, delta: number, targets: Fighter[]): void {
    if (this.shots.length === 0) return;
    const dt = delta / 1000;
    const wb = (this.arena.scene as Phaser.Scene & { physics: Phaser.Physics.Arcade.ArcadePhysics }).physics.world.bounds;

    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i];
      s.gfx.x += s.vx * dt;
      s.gfx.y += s.vy * dt;

      let done = time >= s.expiresAt
        || s.gfx.x < wb.x || s.gfx.x > wb.right || s.gfx.y < wb.y || s.gfx.y > wb.bottom;

      // Blind-fire shots can clip a silence stalker — one hit kills it.
      if (!done && this.arena.tryHitSilenceStalker(s.gfx.x, s.gfx.y, SHOT_HIT_RADIUS)) done = true;

      if (!done) {
        for (const t of targets) {
          if (!t.active || t.hp <= 0 || t.downed) continue;
          if (Phaser.Math.Distance.Between(s.gfx.x, s.gfx.y, t.x, t.y) <= SHOT_HIT_RADIUS + 22 * t.sizeMult) {
            this.damageTarget(t, s.damage);
            done = true;
            break;
          }
        }
      }

      if (done) {
        s.gfx.destroy();
        this.shots.splice(i, 1);
      }
    }
  }

  /**
   * Co-op **guest-only** player-projectile hit path (solo runs and the host
   * route husks through ArenaScene.applyProjectileToEnemy — the same full
   * pipeline that hits the 1v1 npc). Guests can't simulate: they deal
   * feedback-only ghost damage (reported to the host via onGhostDamage) and
   * report any inflicted status via onGhostStatus the same way.
   */
  onProjectileHitHusk(proj: Projectile, husk: Husk): void {
    if (proj.isHeal) return;
    // A possessing demon is untouchable — shots pass straight through it.
    if (husk.possessing) return;
    const player = this.arena.player;
    husk.setIncomingCritContext(player.critChance, player.critMult);
    husk.takeDamage(Math.round(proj.damage * player.cardOutgoingDamageMult));
    const status = this.statusForProjectile(proj, husk);
    if (status) husk.onGhostStatus?.(status);
    this.arena.spawnHitFlash(proj.x, proj.y, 0xff6600);
    proj.setActive(false).setVisible(false);
    (proj.body as Phaser.Physics.Arcade.Body).stop();
  }

  /**
   * Which status (if any) this projectile inflicts — the co-op guest's wire
   * mirror of the applyProjectileToEnemy gates, using the guest's own
   * upgrades (they're the attacker). Kit-internal effects (thorn vine, water
   * cut, disarm…) aren't mirrored: the guest's raw damage still lands, and
   * the host remains authoritative for everything else.
   */
  private statusForProjectile(proj: Projectile, husk: Husk): HuskStatus | null {
    switch (proj.texture.key) {
      case 'proj-fire':
        // Flameshredder (Click+): fireball hits also apply the burning DOT.
        return this.arena.hasUpgrade('click')
          ? { k: 'burn', ms: Math.round(3000 * husk.statusDurMult) }
          : null;
      case 'proj-hunt-silver':
        return { k: 'bleed', ms: Math.round(8000 * husk.statusDurMult) };
      case 'proj-ice':
        return {
          k: 'frost',
          stacks: proj.isPowered ? 2 : 1,
          // Shattering a freeze pays out three stacks instead of one.
          shatter: husk.frozenUntil > this.arena.scene.time.now,
        };
      default:
        return null;
    }
  }

  /** Apply a status to a real (host-side or solo) husk. */
  applyHuskStatus(husk: Husk, s: HuskStatus): void {
    const now = this.arena.scene.time.now;
    switch (s.k) {
      case 'burn':
        husk.burningUntil = Math.max(husk.burningUntil, now + s.ms);
        break;
      case 'toxic':
        husk.toxicUntil = now + s.ms;
        husk.toxicDps = s.dps;
        husk.toxicTickAccum = 0;
        break;
      case 'frost':
        if (s.shatter) husk.frozenUntil = 0;
        for (let i = 0; i < (s.shatter ? 3 : s.stacks); i++) this.arena.addFrostStackTo(husk);
        break;
      case 'bleed':
        husk.bleeding = true;
        husk.bleedingUntil = Math.max(husk.bleedingUntil, now + s.ms);
        this.arena.applyBleedVisual(husk);
        break;
      // Silence statuses are Date.now()-based (checked against Date.now() in Husk).
      case 'silence':
        husk.silencedUntil = Math.max(husk.silencedUntil, Date.now() + s.ms);
        break;
      case 'halluc':
        husk.hallucinatingUntil = Math.max(husk.hallucinatingUntil, Date.now() + s.ms);
        break;
      case 'atkslow':
        husk.attackIntervalMult *= s.mult;
        husk.cooldownMult *= s.mult;
        break;
      case 'panic':
        husk.panickedUntil = Math.max(husk.panickedUntil, Date.now() + s.ms);
        break;
    }
  }

  /** Co-op host: apply a status the guest's projectile inflicted. */
  applyNetworkStatus(huskId: number, s: HuskStatus): void {
    const husk = this.arena.enemies.find((e): e is Husk => e instanceof Husk && e.netId === huskId);
    if (!husk || husk.possessing) return;
    this.applyHuskStatus(husk, s);
  }

  /** Co-op host: apply a damage report from the guest to one of our real husks. */
  applyNetworkDamage(huskId: number, amount: number): void {
    const husk = this.arena.enemies.find((e): e is Husk => e instanceof Husk && e.netId === huskId);
    if (!husk || husk.possessing) return;
    husk.takeDamage(amount);
  }

  /**
   * Co-op host: the guest's Silence Mastery has taken hold of one of our husks. Hold
   * its AI off (`Husk.update` yields on `puppetControlledUntil`) and put the body where
   * the guest says it is — they are driving their replica and streaming it back.
   */
  applyNetworkPuppet(huskId: number, on: boolean, x: number, y: number): void {
    const husk = this.arena.enemies.find((e): e is Husk => e instanceof Husk && e.netId === huskId);
    if (!husk || !husk.active) return;
    if (!on) {
      husk.puppetControlledUntil = 0;
      return;
    }
    // Generous window: at 20 Hz a dropped packet or two must not hand control back.
    husk.puppetControlledUntil = this.arena.scene.time.now + 400;
    (husk.body as Phaser.Physics.Arcade.Body | null)?.reset(x, y);
  }

  get currentWave(): number { return this.wave; }

  /** Husks left in the current wave, including ones still queued to spawn. */
  get remainingThisWave(): number { return this.remaining; }

  /** Variant index per live husk, for the co-op snapshot. */
  variantIndexOf(husk: Husk): number { return huskVariantIndex(husk.variant); }
}
