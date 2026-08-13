import Phaser from 'phaser';
import { Fighter } from '../entities/Fighter';
import { Husk } from './Husk';
import { Sfx, Music } from '../audio';
import { ROOM_META, ROOM_COUNT, HALL_ROOM, CORNER_ROOMS } from './Mansion';

/**
 * Apocalypse mode — what the mansion becomes once the eye in the cellar opens.
 *
 * Everything in here is layered *on top of* the ordinary invasion rather than
 * replacing it: the waves still come, the rooms still have health, the husks are
 * still husks. What changes is the house and what is in it.
 *
 *  · **The dark.** Vision collapses to a torch: a pool of light around you and a
 *    cone in front of your cursor. Your co-op ally's torch cuts the same hole in
 *    your fog, so you can see where they are by the light they throw.
 *  · **Traps.** Wall dispensers firing bolts down the length of a room, pressure
 *    plates that spike whoever stands on them, and spiked balls swinging from
 *    chains bolted to the ceiling. Deterministic per room, so a room can be
 *    learned rather than merely survived.
 *  · **Infection.** A share of every wave arrives infected: a red eye opens in
 *    the husk and static crawls over it, and it is markedly tougher and faster.
 *  · **Corruption.** A room is chosen now and then and starts filling with black.
 *    Corrupt-kin are grown in it and sit motionless until somebody walks in.
 *    Kill every one of them and the room comes back. Leave them and the room is
 *    taken: everything that spawns there is infected, and it grows more kin.
 *
 * The corner wings themselves are the Mansion's business (it owns layout and
 * paint); this kit owns the ruin's *behaviour*, plus the floating eyes and the
 * creeping black that make a corrupted room read at a glance.
 */

export interface ApocalypseWorld {
  readonly scene: Phaser.Scene;
  readonly player: Fighter;
  /** Room the local player is looking at. */
  currentRoom(): number;
  /**
   * Who a trap in `room` may hurt — the **local** player (and their plants) only.
   * Traps are simulated on both sides of a co-op wire and each side hurts only
   * itself, which is why this is deliberately narrower than the husk sim's
   * `targetsInRoom`: two clients each springing the same plate on both players
   * would double every hit.
   */
  localTargets(room: number): Fighter[];
  /** Route hazard damage — goes through the kit so a co-op ally's hits forward. */
  damageTarget(target: Fighter, amount: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  livingHusks(): Husk[];
  /** Whether anything a husk in `room` could chase is standing there right now. */
  huntableIn(room: number): boolean;
  /** Grow one corrupt-kin in `room`. Null when the field is too crowded. */
  spawnCorruptKin(x: number, y: number, room: number): Husk | null;
  /** Rooms that still stand (hall included) — corruption picks from these. */
  corruptibleRooms(): number[];
  /** The Kindled Torch constellation widens the light. */
  torchMult(): number;
  /** Where the local player is aiming, in radians — the torch points there. */
  aimAngle(): number;
  /** Co-op: the ally's torch, or null when solo / they're in another room. */
  allyTorch(): { x: number; y: number; angle: number } | null;
  /**
   * Only the husk-simulating side (solo, or the co-op host) advances corruption:
   * it grows corrupt-kin, and husks have exactly one owner. Traps run on both.
   */
  ownsCorruption(): boolean;
  /** Host → guest: a room's corruption crossed a threshold worth announcing. */
  onCorruptionEvent?(room: number, kind: 'seeded' | 'taken' | 'cleansed'): void;
}

// ── Tuning ──────────────────────────────────────────────────────────

/**
 * Just enough spill at the bearer's feet to see their own boots. Deliberately
 * small — the beam is the light, and a wide pool here reads as "circle with a
 * smear attached" rather than as a torch.
 */
const TORCH_FOOT_RADIUS = 68;
/** How far the beam reaches. */
const TORCH_CONE = 350;
/** Half-width of the beam, and of the brighter core down the middle of it. */
const TORCH_HALF_DEG = 25;
const TORCH_CORE_DEG = 9;
/**
 * The shoulder of the beam: [half-angle°, reach as a fraction of TORCH_CONE].
 * A bare 25° wedge is only about 25px across where it leaves the player, which
 * makes the lit area look like it starts a stride in front of them. These wash
 * the ground immediately around the bearer and taper down into the beam proper,
 * so the cone reads as coming out of their hand.
 */
const TORCH_SHOULDER: Array<[number, number]> = [[68, 0.24], [50, 0.36], [36, 0.5]];
const FOG_COLOR = 0x05010c;
const FOG_ALPHA = 0.955;

const ARROW_SPEED = 330;
const ARROW_DAMAGE = 11;
const ARROW_PERIOD_MS = 2600;
const SPIKE_ARM_MS = 420;
const SPIKE_OUT_MS = 620;
const SPIKE_DAMAGE = 20;
const SPIKE_RESET_MS = 1600;
const FLAIL_DAMAGE = 15;
const FLAIL_CONTACT_MS = 800;
const TRAP_ROOM_COOLDOWN_MS = 700;

/** How fast an unattended corruption fills, in fraction per second. */
const CORRUPTION_RATE = 0.022;
/** How fast a cleared room drains back to nothing. */
const CORRUPTION_DECAY = 0.5;
const CORRUPTION_SEED_MIN_MS = 22000;
const CORRUPTION_SEED_MAX_MS = 40000;
/** A taken room grows another kin on this cadence. */
const TAKEN_SPAWN_MS = 13000;
const MAX_KIN_PER_ROOM = 5;

const INFECT_CHANCE = 0.24;
const INFECT_HP_MULT = 1.75;
const INFECT_SPEED_MULT = 1.35;
const INFECT_DAMAGE_MULT = 1.2;

/**
 * A boss is not infected by a room that merely has something growing in it —
 * the corruption has to be most of the way to owning the place. Below this the
 * tenth wave arrives clean however unlucky the roll.
 */
const BOSS_INFECT_LEVEL = 0.6;
/** And an infected boss is worse than an infected husk, on top of the shared brand. */
const BOSS_INFECT_HP_MULT = 1.35;
const BOSS_INFECT_DAMAGE_MULT = 1.15;

type TrapKind = 'arrow' | 'spike' | 'flail';

interface Trap {
  kind: TrapKind;
  room: number;
  x: number;
  y: number;
  /** Arrow: fire direction. Flail: current arm angle. */
  angle: number;
  /** Flail: arm length and sweep speed. */
  arm: number;
  spin: number;
  nextAt: number;
  /** Spike plate: 0 idle, 1 arming, 2 out. */
  phase: number;
  phaseEnd: number;
}

interface Bolt {
  x: number;
  y: number;
  vx: number;
  vy: number;
  room: number;
  expiresAt: number;
}

interface RoomCorruption {
  level: number;
  /** True once the corruption has taken the room outright. */
  taken: boolean;
  nextKinAt: number;
}

export class ApocalypseKit {
  private active = false;
  private corruption: RoomCorruption[] = [];
  private traps: Trap[] = [];
  private bolts: Bolt[] = [];
  private infected = new Set<Husk>();
  private nextSeedAt = 0;
  private contactCooldown = new Map<Fighter, number>();
  private lastRoomHitAt = new Map<number, number>();

  private fog: Phaser.GameObjects.RenderTexture | null = null;
  /** Off-list Graphics the fog is erased with — same rig as the Apprehension map. */
  private eraser: Phaser.GameObjects.Graphics | null = null;
  /** Ground-level layer: corruption stain, tendrils, trap bodies, floating eyes. */
  private groundG: Phaser.GameObjects.Graphics | null = null;
  /** Above the fighters: infection static, bolts, spikes. */
  private overG: Phaser.GameObjects.Graphics | null = null;
  private vignette: Phaser.GameObjects.Graphics | null = null;

  constructor(private world: ApocalypseWorld) {}

  get isActive(): boolean { return this.active; }

  /** Corruption per room, 0–1 — the minimap's stain and the co-op wire both read this. */
  corruptionLevels(): number[] {
    return this.corruption.map((c) => c.level);
  }

  /** True in a room the corruption owns outright: everything spawning here is infected. */
  isRoomTaken(room: number): boolean {
    return this.active && !!this.corruption[room]?.taken;
  }

  /** Guest-side: adopt the host's corruption readout. */
  applyRemoteCorruption(levels: number[]): void {
    for (let r = 0; r < ROOM_COUNT; r++) {
      const c = this.corruption[r];
      if (!c) continue;
      c.level = levels[r] ?? 0;
      c.taken = c.level >= 0.999;
    }
  }

  reset(): void {
    this.active = false;
    this.corruption = Array.from({ length: ROOM_COUNT }, () => ({ level: 0, taken: false, nextKinAt: 0 }));
    this.traps = [];
    this.bolts = [];
    this.infected.clear();
    this.nextSeedAt = 0;
    this.contactCooldown.clear();
    this.lastRoomHitAt.clear();
    this.teardownVisuals();
  }

  destroy(): void {
    this.reset();
  }

  private teardownVisuals(): void {
    this.fog?.destroy(); this.fog = null;
    this.eraser?.destroy(); this.eraser = null;
    this.groundG?.destroy(); this.groundG = null;
    this.overG?.destroy(); this.overG = null;
    this.vignette?.destroy(); this.vignette = null;
  }

  // ── Waking it ─────────────────────────────────────────────────────

  /**
   * The eye opens. Called on both sides of a co-op wire (the guest gets it from
   * the host's snap), so it only builds visuals and state — the mansion's own
   * repaint and the wave director's retuning are InvasionKit's to do.
   */
  activate(): void {
    if (this.active) return;
    this.active = true;
    const scene = this.world.scene;
    const { width, height } = scene.scale;

    Sfx.play('boss-intro');
    Sfx.play('ghost-wail');
    Music.setIntensity(1);
    scene.cameras.main.flash(700, 180, 0, 20);
    scene.cameras.main.shake(1400, 0.012);

    const banner = scene.add.text(width / 2, height / 2 - 30, '👁️  APOCALYPSE', {
      fontSize: '54px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
      color: '#cc1133', stroke: '#000000', strokeThickness: 8,
    }).setOrigin(0.5).setDepth(58).setScale(0.4);
    const sub = scene.add.text(width / 2, height / 2 + 24,
      'THE HOUSE HAS MORE ROOMS THAN YOU THOUGHT', {
        fontSize: '17px', fontFamily: '"Arial Black", sans-serif', color: '#ff8899',
        stroke: '#180008', strokeThickness: 5,
      }).setOrigin(0.5).setDepth(58).setAlpha(0);
    scene.tweens.add({ targets: banner, scaleX: 1, scaleY: 1, duration: 700, ease: 'Back.easeOut' });
    scene.tweens.add({ targets: sub, alpha: 1, duration: 600, delay: 500 });
    scene.tweens.add({
      targets: [banner, sub], alpha: 0, delay: 2600, duration: 900,
      onComplete: () => { banner.destroy(); sub.destroy(); },
    });

    this.buildVisuals();
    this.buildTraps();
    this.nextSeedAt = scene.time.now + 16000;
  }

  private buildVisuals(): void {
    const scene = this.world.scene;
    const { width, height } = scene.scale;
    this.teardownVisuals();

    this.groundG = scene.add.graphics().setDepth(1.7);
    this.overG = scene.add.graphics().setDepth(8.5);

    // Sits above the world and its projectiles, below every HUD layer (20+).
    this.fog = scene.add.renderTexture(0, 0, width, height)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(19);
    this.eraser = scene.add.graphics({ x: 0, y: 0 }).setVisible(false);

    // A permanent red bruise around the edge of the screen, over the fog.
    this.vignette = scene.add.graphics().setDepth(19.1);
    for (let i = 0; i < 22; i++) {
      const k = i / 22;
      this.vignette.lineStyle(14, 0x3a0010, 0.055 * (1 - k));
      this.vignette.strokeRect(-k * 90, -k * 90, width + k * 180, height + k * 180);
    }
  }

  // ── Traps ─────────────────────────────────────────────────────────

  /**
   * One fixed trap set per room, drawn from a seed made of the room index, so a
   * corridor you have crossed twice is the same corridor the third time. The
   * corner wings get an extra of everything — they were built for this.
   */
  private buildTraps(): void {
    const { width: W, height: H } = this.world.scene.scale;
    const WALLIN = 76;
    this.traps = [];
    for (let room = 0; room < ROOM_COUNT; room++) {
      let seed = room * 7919 + 104729;
      const rnd = (): number => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
      const corner = CORNER_ROOMS.includes(room);
      const arrows = room === HALL_ROOM ? 2 : corner ? 4 : 3;
      const spikes = room === HALL_ROOM ? 2 : corner ? 5 : 3;
      const flails = room === HALL_ROOM ? 1 : corner ? 2 : 1;

      for (let i = 0; i < arrows; i++) {
        // Bolted to a wall, firing straight across the room.
        const horizontal = rnd() < 0.5;
        const near = rnd() < 0.5;
        const along = WALLIN + rnd() * ((horizontal ? H : W) - WALLIN * 2);
        this.traps.push({
          kind: 'arrow', room,
          x: horizontal ? (near ? 46 : W - 46) : along,
          y: horizontal ? along : (near ? 46 : H - 46),
          angle: horizontal ? (near ? 0 : Math.PI) : (near ? Math.PI / 2 : -Math.PI / 2),
          arm: 0, spin: 0,
          nextAt: 1400 + rnd() * ARROW_PERIOD_MS,
          phase: 0, phaseEnd: 0,
        });
      }
      for (let i = 0; i < spikes; i++) {
        this.traps.push({
          kind: 'spike', room,
          x: WALLIN + rnd() * (W - WALLIN * 2),
          y: WALLIN + rnd() * (H - WALLIN * 2),
          angle: 0, arm: 30 + rnd() * 12, spin: 0,
          nextAt: 0, phase: 0, phaseEnd: 0,
        });
      }
      for (let i = 0; i < flails; i++) {
        this.traps.push({
          kind: 'flail', room,
          x: W * (0.3 + rnd() * 0.4),
          y: H * (0.3 + rnd() * 0.4),
          angle: rnd() * Math.PI * 2,
          arm: 76 + rnd() * 46,
          spin: (rnd() < 0.5 ? -1 : 1) * (1.0 + rnd() * 0.7),
          nextAt: 0, phase: 0, phaseEnd: 0,
        });
      }
    }
  }

  private tickTraps(time: number, delta: number): void {
    const dt = delta / 1000;
    const { width: W, height: H } = this.world.scene.scale;

    for (const t of this.traps) {
      const targets = this.world.localTargets(t.room);
      switch (t.kind) {
        case 'arrow': {
          if (time < t.nextAt) break;
          t.nextAt = time + ARROW_PERIOD_MS;
          // A dispenser in an empty room still fires; it just hits nothing.
          this.bolts.push({
            x: t.x + Math.cos(t.angle) * 18,
            y: t.y + Math.sin(t.angle) * 18,
            vx: Math.cos(t.angle) * ARROW_SPEED,
            vy: Math.sin(t.angle) * ARROW_SPEED,
            room: t.room,
            expiresAt: time + 4000,
          });
          if (t.room === this.world.currentRoom()) Sfx.play('spear-throw', { volume: 0.35 });
          break;
        }
        case 'spike': {
          if (t.phase === 0) {
            // Arms when something stands on the plate.
            const on = targets.some((f) => Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y) <= t.arm);
            if (on && time >= t.nextAt) {
              t.phase = 1;
              t.phaseEnd = time + SPIKE_ARM_MS;
              if (t.room === this.world.currentRoom()) Sfx.play('trap-set', { volume: 0.5 });
            }
          } else if (t.phase === 1 && time >= t.phaseEnd) {
            t.phase = 2;
            t.phaseEnd = time + SPIKE_OUT_MS;
            if (t.room === this.world.currentRoom()) Sfx.play('trap-snap');
            for (const f of targets) {
              if (Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y) > t.arm + 6) continue;
              this.hurt(f, SPIKE_DAMAGE, t.room, '🩸');
            }
          } else if (t.phase === 2 && time >= t.phaseEnd) {
            t.phase = 0;
            t.nextAt = time + SPIKE_RESET_MS;
          }
          break;
        }
        case 'flail': {
          t.angle += t.spin * dt;
          const bx = t.x + Math.cos(t.angle) * t.arm;
          const by = t.y + Math.sin(t.angle) * t.arm;
          for (const f of targets) {
            if (Phaser.Math.Distance.Between(f.x, f.y, bx, by) > 22 + 20 * f.sizeMult) continue;
            const cd = this.contactCooldown.get(f) ?? 0;
            if (time < cd) continue;
            this.contactCooldown.set(f, time + FLAIL_CONTACT_MS);
            this.hurt(f, FLAIL_DAMAGE, t.room, '⛓️');
            // Shoved off the ball rather than ground against it.
            const ang = Math.atan2(f.y - by, f.x - bx);
            (f.body as Phaser.Physics.Arcade.Body | null)?.setVelocity(Math.cos(ang) * 300, Math.sin(ang) * 300);
          }
          break;
        }
      }
    }

    // Bolts in flight.
    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const b = this.bolts[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      let done = time >= b.expiresAt || b.x < 20 || b.x > W - 20 || b.y < 20 || b.y > H - 20;
      if (!done) {
        for (const f of this.world.localTargets(b.room)) {
          if (Phaser.Math.Distance.Between(b.x, b.y, f.x, f.y) > 14 + 20 * f.sizeMult) continue;
          this.hurt(f, ARROW_DAMAGE, b.room, '🏹');
          done = true;
          break;
        }
      }
      // Bolts also stick into husks — the house does not take sides.
      if (!done) {
        for (const h of this.world.livingHusks()) {
          if (h.roomIndex !== b.room) continue;
          if (Phaser.Math.Distance.Between(b.x, b.y, h.x, h.y) > 14 + 20 * h.sizeMult) continue;
          h.takeDamage(ARROW_DAMAGE);
          done = true;
          break;
        }
      }
      if (done) this.bolts.splice(i, 1);
    }
  }

  /** Trap damage, rate-limited per room so two hazards can't chain-stun you. */
  private hurt(target: Fighter, amount: number, room: number, emoji: string): void {
    const now = this.world.scene.time.now;
    if (now - (this.lastRoomHitAt.get(room) ?? -9999) < TRAP_ROOM_COOLDOWN_MS) return;
    this.lastRoomHitAt.set(room, now);
    this.world.damageTarget(target, amount);
    if (room === this.world.currentRoom()) {
      this.world.showFloatingText(target.x, target.y - 34, emoji, '#ff8899');
      this.world.scene.cameras.main.shake(120, 0.003);
    }
  }

  // ── Corruption ────────────────────────────────────────────────────

  private tickCorruption(time: number, delta: number): void {
    const dt = delta / 1000;

    // Seed a new one now and then, somewhere that isn't already taken.
    if (time >= this.nextSeedAt) {
      this.nextSeedAt = time + CORRUPTION_SEED_MIN_MS
        + Math.random() * (CORRUPTION_SEED_MAX_MS - CORRUPTION_SEED_MIN_MS);
      const options = this.world.corruptibleRooms().filter((r) => (this.corruption[r]?.level ?? 1) <= 0.01);
      const room = options[Math.floor(Math.random() * options.length)];
      if (room !== undefined) this.seedCorruption(room, time);
    }

    for (let room = 0; room < ROOM_COUNT; room++) {
      const c = this.corruption[room];
      if (!c || c.level <= 0) continue;
      const kin = this.kinInRoom(room);

      if (kin === 0) {
        // Cleared: the black drains back out of the walls.
        c.level = Math.max(0, c.level - CORRUPTION_DECAY * dt);
        if (c.level <= 0) {
          const wasTaken = c.taken;
          c.taken = false;
          this.announce(room, 'cleansed', wasTaken);
        }
        continue;
      }

      if (!c.taken) {
        c.level = Math.min(1, c.level + CORRUPTION_RATE * dt);
        if (c.level >= 1) {
          c.taken = true;
          c.nextKinAt = time + TAKEN_SPAWN_MS;
          this.announce(room, 'taken', false);
        }
      } else if (time >= c.nextKinAt) {
        c.nextKinAt = time + TAKEN_SPAWN_MS;
        if (kin < MAX_KIN_PER_ROOM) this.growKin(room, 1);
      }
    }
  }

  private seedCorruption(room: number, time: number): void {
    const c = this.corruption[room];
    if (!c) return;
    c.level = 0.06;
    c.taken = false;
    c.nextKinAt = time + TAKEN_SPAWN_MS;
    this.growKin(room, 2);
    this.announce(room, 'seeded', false);
  }

  /** Corrupt-kin sprout in the corners of the room and then do not move. */
  private growKin(room: number, count: number): void {
    const { width: W, height: H } = this.world.scene.scale;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const x = Phaser.Math.Clamp(W / 2 + Math.cos(a) * (W * 0.3), 70, W - 70);
      const y = Phaser.Math.Clamp(H / 2 + Math.sin(a) * (H * 0.3), 70, H - 70);
      const kin = this.world.spawnCorruptKin(x, y, room);
      if (kin && room === this.world.currentRoom()) {
        const scene = this.world.scene;
        const burst = scene.add.circle(x, y, 40, 0x1a0210, 0.7).setDepth(4);
        scene.tweens.add({
          targets: burst, scaleX: 0.1, scaleY: 0.1, alpha: 0, duration: 480,
          onComplete: () => burst.destroy(),
        });
      }
    }
  }

  private kinInRoom(room: number): number {
    let n = 0;
    for (const h of this.world.livingHusks()) {
      if (h.roomIndex === room && h.variant.id === 'corrupt-kin') n++;
    }
    return n;
  }

  private announce(room: number, kind: 'seeded' | 'taken' | 'cleansed', wasTaken: boolean): void {
    const scene = this.world.scene;
    const meta = ROOM_META[room];
    const { width } = scene.scale;
    const line: { text: string; color: string; sfx: string } =
      kind === 'seeded'
        ? { text: `👁️ THE ${meta.name} IS BEING CORRUPTED — GO AND CUT IT OUT`, color: '#cc44aa', sfx: 'status-curse' }
        : kind === 'taken'
          ? { text: `🕳️ THE ${meta.name} HAS BEEN TAKEN`, color: '#ff2244', sfx: 'boss-phase' }
          : {
            text: wasTaken ? `✨ THE ${meta.name} IS CLEAN AGAIN` : `✨ THE ${meta.name} IS CLEAN`,
            color: '#88ffcc', sfx: 'holy-chord',
          };
    Sfx.play(line.sfx);
    const t = scene.add.text(width / 2, 138, line.text, {
      fontSize: '17px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
      color: line.color, stroke: '#12000a', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(26);
    scene.tweens.add({ targets: t, alpha: 0, delay: 2400, duration: 800, onComplete: () => t.destroy() });
    if (kind === 'taken') scene.cameras.main.shake(500, 0.008);
    this.world.onCorruptionEvent?.(room, kind);
  }

  /** Also called on the guest so both players see the same news. */
  showCorruptionBanner(room: number, kind: 'seeded' | 'taken' | 'cleansed'): void {
    this.announce(room, kind, false);
  }

  // ── Infection ─────────────────────────────────────────────────────

  /** Whether a husk spawning into `room` right now should come up infected. */
  shouldInfect(room: number): boolean {
    if (!this.active) return false;
    if (this.isRoomTaken(room)) return true;
    return Math.random() < INFECT_CHANCE * (1 + (this.corruption[room]?.level ?? 0));
  }

  /**
   * Whether a *boss* spawning into `room` comes up infected. Deliberately a
   * threshold rather than a roll: the tenth wave is the one fight you can see
   * coming, so whether it arrives wearing the eye should be something you did
   * — let a room rot and the Arbiter walks out of it changed.
   */
  shouldInfectBoss(room: number): boolean {
    if (!this.active) return false;
    if (this.isRoomTaken(room)) return true;
    return (this.corruption[room]?.level ?? 0) >= BOSS_INFECT_LEVEL;
  }

  /**
   * Brand a husk: tougher, faster, and wearing the eye. A boss gets a second
   * helping on top, and its brain reads `husk.infected` to unlock the move it
   * only has when the corruption is in it.
   */
  infect(husk: Husk, boss = false): void {
    if (this.infected.has(husk)) return;
    this.infected.add(husk);
    husk.infected = true;
    const hpMult = INFECT_HP_MULT * (boss ? BOSS_INFECT_HP_MULT : 1);
    const dmgMult = INFECT_DAMAGE_MULT * (boss ? BOSS_INFECT_DAMAGE_MULT : 1);
    husk.setMaxHp(Math.round(husk.maxHp * hpMult));
    husk.hp = husk.maxHp;
    husk.speed *= INFECT_SPEED_MULT;
    husk.biteDamage = Math.round(husk.biteDamage * dmgMult);
    husk.setTint(0xff5577);
  }

  isInfected(husk: Husk): boolean { return this.infected.has(husk); }

  /** Kill cleanup, so the set doesn't hold dead sprites for the run's length. */
  forget(husk: Husk): void {
    this.infected.delete(husk);
    husk.infected = false;
    this.contactCooldown.delete(husk);
  }

  // ── Frame ─────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    if (!this.active) return;

    // Traps run on both sides; each client only ever hurts its own player.
    this.tickTraps(time, delta);
    if (this.world.ownsCorruption()) {
      this.tickCorruption(time, delta);
      this.holdDormantKin();
    }
    this.drawGround(time);
    this.drawOver(time);
    this.drawFog();
  }

  /**
   * Corrupt-kin wait. With nobody in their room the husk AI falls through to its
   * confused-wander, which would have them milling about in the dark; this runs
   * after the husk update and pins them where they were grown.
   */
  private holdDormantKin(): void {
    for (const h of this.world.livingHusks()) {
      if (h.variant.id !== 'corrupt-kin') continue;
      if (this.world.huntableIn(h.roomIndex)) continue;
      (h.body as Phaser.Physics.Arcade.Body | null)?.setVelocity(0, 0);
    }
  }

  // ── Drawing ───────────────────────────────────────────────────────

  private drawGround(time: number): void {
    const g = this.groundG;
    if (!g) return;
    g.clear();
    const room = this.world.currentRoom();
    const { width: W, height: H } = this.world.scene.scale;

    // Corruption: black creeping in from the edges, with eyes and tentacles in it.
    const level = this.corruption[room]?.level ?? 0;
    if (level > 0.005) {
      const reach = 40 + level * 300;
      g.fillStyle(0x08000a, Math.min(0.9, 0.2 + level * 0.7));
      // Four lobed banks, one per wall, rolling further in as it grows.
      for (const side of [0, 1, 2, 3]) {
        for (let i = 0; i <= 10; i++) {
          const t = i / 10;
          const bulge = reach * (0.6 + 0.4 * Math.sin(t * Math.PI * 3 + side + time / 1600));
          if (side === 0) g.fillCircle(t * W, 0, bulge);
          else if (side === 1) g.fillCircle(t * W, H, bulge);
          else if (side === 2) g.fillCircle(0, t * H, bulge);
          else g.fillCircle(W, t * H, bulge);
        }
      }
      // Tentacles feeling their way toward the middle of the room.
      const arms = Math.round(3 + level * 7);
      g.lineStyle(4, 0x140218, Math.min(0.95, 0.3 + level * 0.6));
      for (let i = 0; i < arms; i++) {
        const a = (i / arms) * Math.PI * 2 + time / 5200;
        let px = W / 2 + Math.cos(a) * (W * 0.5);
        let py = H / 2 + Math.sin(a) * (H * 0.5);
        for (let s = 0; s < 5; s++) {
          const k = 1 - (s + 1) / 6;
          const wob = Math.sin(time / 620 + i * 2 + s) * 22;
          const nx = W / 2 + Math.cos(a) * (W * 0.5 * k) + Math.cos(a + 1.57) * wob;
          const ny = H / 2 + Math.sin(a) * (H * 0.5 * k) + Math.sin(a + 1.57) * wob;
          g.lineStyle(Math.max(1, 5 - s), 0x140218, Math.min(0.95, 0.3 + level * 0.6));
          g.lineBetween(px, py, nx, ny);
          px = nx; py = ny;
        }
        // A little eye on the tip of every third arm.
        if (i % 3 === 0 && level > 0.35) {
          g.fillStyle(0xe8dcdc, 0.9);
          g.fillEllipse(px, py, 9, 6);
          g.fillStyle(0xcc1133, 1);
          g.fillCircle(px, py, 2.6);
        }
      }
      // Eyes opening in the black itself.
      const eyes = Math.round(level * 9);
      for (let i = 0; i < eyes; i++) {
        const a = (i * 2.399) + time / 9000;
        const r = 60 + ((i * 61) % 100) / 100 * (Math.min(W, H) * 0.42);
        const ex = W / 2 + Math.cos(a) * r * 1.3;
        const ey = H / 2 + Math.sin(a) * r * 0.8;
        // Blinks: shut for a beat every few seconds, out of phase per eye.
        const open = 0.5 + 0.5 * Math.sin(time / 700 + i * 1.9);
        if (open < 0.12) continue;
        g.fillStyle(0xe8dcdc, 0.92);
        g.fillEllipse(ex, ey, 20, 13 * open);
        g.fillStyle(0xcc1133, 1);
        g.fillCircle(ex, ey, 5.4 * Math.min(1, open * 1.6));
        g.fillStyle(0x08000a, 1);
        g.fillEllipse(ex, ey, 2.4, 6 * open);
      }
    }

    // Free-floating eyes drift through the corner wings whether corrupted or not.
    if (CORNER_ROOMS.includes(room)) {
      for (let i = 0; i < 7; i++) {
        const ph = time / (2600 + i * 340) + i * 1.7;
        const ex = W * (0.5 + 0.42 * Math.sin(ph));
        const ey = H * (0.5 + 0.36 * Math.sin(ph * 1.31 + i));
        const open = 0.35 + 0.65 * Math.abs(Math.sin(time / 900 + i * 2.1));
        g.fillStyle(0x8a1030, 0.16);
        g.fillCircle(ex, ey, 22);
        g.fillStyle(0xe8dcdc, 0.85);
        g.fillEllipse(ex, ey, 17, 12 * open);
        g.fillStyle(0xcc1133, 1);
        g.fillCircle(ex, ey, 4.6 * Math.min(1, open * 1.5));
        g.fillStyle(0x08000a, 1);
        g.fillEllipse(ex, ey, 2, 5.4 * open);
      }
    }

    // Trap bodies for this room.
    for (const t of this.traps) {
      if (t.room !== room) continue;
      if (t.kind === 'arrow') {
        // A slot in the wall with a bolt sitting in it.
        g.fillStyle(0x1c1610, 1);
        g.fillCircle(t.x, t.y, 13);
        g.lineStyle(2, 0x5a4a30, 1);
        g.strokeCircle(t.x, t.y, 13);
        g.fillStyle(0x080604, 1);
        g.fillCircle(t.x + Math.cos(t.angle) * 4, t.y + Math.sin(t.angle) * 4, 6);
        g.lineStyle(2, 0x8a2a2a, 0.5);
        g.lineBetween(t.x, t.y, t.x + Math.cos(t.angle) * 34, t.y + Math.sin(t.angle) * 34);
      } else if (t.kind === 'spike') {
        // The plate. Its teeth are drawn on the layer above the fighters.
        g.fillStyle(0x15100c, 1);
        g.fillCircle(t.x, t.y, t.arm);
        g.lineStyle(2, t.phase === 1 ? 0xff4444 : 0x4a3a26, t.phase === 1 ? 0.9 : 0.7);
        g.strokeCircle(t.x, t.y, t.arm);
        g.lineStyle(1, 0x2a2018, 0.8);
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          g.lineBetween(
            t.x + Math.cos(a) * t.arm * 0.35, t.y + Math.sin(a) * t.arm * 0.35,
            t.x + Math.cos(a) * t.arm * 0.9, t.y + Math.sin(a) * t.arm * 0.9,
          );
        }
        if (t.phase === 1) {
          g.fillStyle(0xff3344, 0.18 + Math.sin(time / 60) * 0.1);
          g.fillCircle(t.x, t.y, t.arm);
        }
      } else {
        // Flail: the ceiling mount and the chain running out to the ball.
        const bx = t.x + Math.cos(t.angle) * t.arm;
        const by = t.y + Math.sin(t.angle) * t.arm;
        g.fillStyle(0x000000, 0.3);
        g.fillEllipse(bx + 6, by + 12, 34, 12);
        g.fillStyle(0x2a2620, 1);
        g.fillCircle(t.x, t.y, 9);
        g.lineStyle(2, 0x6a6258, 1);
        g.strokeCircle(t.x, t.y, 9);
        g.lineStyle(3, 0x7a7268, 0.95);
        const seg = 8;
        for (let i = 0; i < seg; i++) {
          const t0 = i / seg, t1 = (i + 0.62) / seg;
          g.lineBetween(
            t.x + (bx - t.x) * t0, t.y + (by - t.y) * t0,
            t.x + (bx - t.x) * t1, t.y + (by - t.y) * t1,
          );
        }
      }
    }
  }

  private drawOver(time: number): void {
    const g = this.overG;
    if (!g) return;
    g.clear();
    const room = this.world.currentRoom();

    // Spikes standing out of a sprung plate.
    for (const t of this.traps) {
      if (t.room !== room || t.kind !== 'spike' || t.phase !== 2) continue;
      const k = Phaser.Math.Clamp((t.phaseEnd - this.world.scene.time.now) / SPIKE_OUT_MS, 0, 1);
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2 + t.x;
        const d = t.arm * 0.55 * (0.4 + (i % 3) * 0.3);
        const px = t.x + Math.cos(a) * d;
        const py = t.y + Math.sin(a) * d;
        const hgt = (14 + (i % 4) * 5) * (0.6 + k * 0.4);
        g.fillStyle(0xb8c0c8, 1);
        g.fillTriangle(px - 4, py + 3, px + 4, py + 3, px, py - hgt);
        g.fillStyle(0x7a8288, 1);
        g.fillTriangle(px, py + 3, px + 4, py + 3, px, py - hgt);
        g.fillStyle(0x8a1020, 0.8);
        g.fillTriangle(px - 1.6, py - hgt + 5, px + 1.6, py - hgt + 5, px, py - hgt);
      }
    }

    // Flail heads, spikes and all.
    for (const t of this.traps) {
      if (t.room !== room || t.kind !== 'flail') continue;
      const bx = t.x + Math.cos(t.angle) * t.arm;
      const by = t.y + Math.sin(t.angle) * t.arm;
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        g.fillStyle(0x9aa2aa, 1);
        g.fillTriangle(
          bx + Math.cos(a) * 10, by + Math.sin(a) * 10,
          bx + Math.cos(a + 0.5) * 10, by + Math.sin(a + 0.5) * 10,
          bx + Math.cos(a + 0.25) * 22, by + Math.sin(a + 0.25) * 22,
        );
      }
      g.fillStyle(0x3a3a40, 1);
      g.fillCircle(bx, by, 14);
      g.fillStyle(0x55555e, 1);
      g.fillCircle(bx - 4, by - 4, 6);
      g.lineStyle(2, 0x1a1a20, 1);
      g.strokeCircle(bx, by, 14);
    }

    // Bolts in flight.
    for (const b of this.bolts) {
      if (b.room !== room) continue;
      const a = Math.atan2(b.vy, b.vx);
      g.lineStyle(3, 0x6a5a3a, 1);
      g.lineBetween(b.x - Math.cos(a) * 16, b.y - Math.sin(a) * 16, b.x, b.y);
      g.fillStyle(0xc8ccd0, 1);
      g.fillTriangle(
        b.x + Math.cos(a) * 8, b.y + Math.sin(a) * 8,
        b.x + Math.cos(a + 2.5) * 6, b.y + Math.sin(a + 2.5) * 6,
        b.x + Math.cos(a - 2.5) * 6, b.y + Math.sin(a - 2.5) * 6,
      );
      g.fillStyle(0xd8d0b8, 0.9);
      g.fillTriangle(
        b.x - Math.cos(a) * 16, b.y - Math.sin(a) * 16,
        b.x - Math.cos(a) * 22 + Math.cos(a + 1.57) * 5, b.y - Math.sin(a) * 22 + Math.sin(a + 1.57) * 5,
        b.x - Math.cos(a) * 22 - Math.cos(a + 1.57) * 5, b.y - Math.sin(a) * 22 - Math.sin(a + 1.57) * 5,
      );
    }

    // Infected husks: the eye, and the static crawling over the body.
    for (const h of this.infected) {
      if (!h.active || h.hp <= 0 || h.roomIndex !== room || !h.visible) continue;
      const r = 26 * h.sizeMult;
      // Static: short bright bars that jump every frame.
      g.fillStyle(0xff5577, 0.5);
      for (let i = 0; i < 6; i++) {
        const yy = h.y - r + ((i * 7 + Math.floor(time / 40) * 5) % (r * 2));
        const w = r * (0.4 + ((i * 37 + Math.floor(time / 60)) % 10) / 14);
        g.fillRect(h.x - w / 2, yy, w, 1.6);
      }
      // The eye, riding just above the head, tracking the player.
      const p = this.world.player;
      const ang = Math.atan2(p.y - h.y, p.x - h.x);
      const ex = h.x, ey = h.y - r - 8;
      g.fillStyle(0x8a1030, 0.3);
      g.fillCircle(ex, ey, 13);
      g.fillStyle(0xe8dcdc, 1);
      g.fillEllipse(ex, ey, 17, 11);
      g.fillStyle(0xcc1133, 1);
      g.fillCircle(ex + Math.cos(ang) * 3, ey + Math.sin(ang) * 2, 4.6);
      g.fillStyle(0x08000a, 1);
      g.fillEllipse(ex + Math.cos(ang) * 3, ey + Math.sin(ang) * 2, 2, 5);
      g.lineStyle(1, 0x8a1030, 0.9);
      g.strokeEllipse(ex, ey, 17, 11);
    }
  }

  /**
   * The dark. Fill the screen, then erase a soft pool at the torch bearer and a
   * cone out toward where they are aiming. A co-op ally standing in the same
   * room cuts their own hole, which is the only way to find each other in here.
   */
  private drawFog(): void {
    const rt = this.fog;
    const er = this.eraser;
    if (!rt || !er) return;
    rt.clear();
    rt.fill(FOG_COLOR, FOG_ALPHA);
    er.clear();

    const mult = this.world.torchMult();
    const p = this.world.player;
    this.cutLight(er, p.x, p.y, this.world.aimAngle(), mult, 1);

    // Your ally's torch cuts your fog too — in here it is the only way to find
    // each other, and the only way to tell which door they went through.
    const ally = this.world.allyTorch();
    if (ally) this.cutLight(er, ally.x, ally.y, ally.angle, mult, 0.8);

    rt.erase(er, 0, 0);
  }

  /**
   * One torch. A small pool at the bearer's feet, then the beam: a cone opening
   * toward their aim, with a brighter core down its axis.
   *
   * Every shape is painted at a low alpha and the fog is removed in proportion
   * to what lands here, so overlapping wedges both soften the edges and set the
   * falloff — no gradient texture needed. The wedge radii are spaced on a square
   * root so they bunch up toward the far end: the near two-thirds of the beam
   * collects nearly every pass and stays bright, and only the last stretch fades
   * out into the dark.
   */
  private cutLight(
    er: Phaser.GameObjects.Graphics,
    x: number, y: number, angle: number, mult: number, strength: number,
  ): void {
    /**
     * A pie slice with its point on the bearer.
     *
     * Built as an explicit polygon rather than `moveTo` + `arc` + `fillPath`:
     * Phaser's `Graphics.arc` **starts a fresh path**, so the preceding `moveTo`
     * is discarded and what gets filled is the arc's chord segment — a lens
     * floating out at the cone's radius with nothing joining it to the player.
     */
    const wedge = (radius: number, halfDeg: number, alpha: number): void => {
      const half = Phaser.Math.DegToRad(halfDeg);
      const SEGS = 14;
      const pts: Array<{ x: number; y: number }> = [{ x, y }];
      for (let i = 0; i <= SEGS; i++) {
        const a = angle - half + (half * 2) * (i / SEGS);
        pts.push({ x: x + Math.cos(a) * radius, y: y + Math.sin(a) * radius });
      }
      er.fillStyle(0xffffff, alpha);
      er.fillPoints(pts, true);
    };

    const len = TORCH_CONE * mult;

    // The shoulder first: broad and short, so the light leaves the bearer as a
    // wash rather than a slit.
    for (const [halfDeg, reach] of TORCH_SHOULDER) {
      wedge(len * reach, halfDeg, strength * 0.15);
    }

    const STEPS = 9;
    for (let i = STEPS; i >= 1; i--) {
      wedge(len * Math.sqrt(i / STEPS), TORCH_HALF_DEG, strength * 0.17);
    }
    // The hot core: narrower, and it reaches the full length of the beam.
    for (let i = 3; i >= 1; i--) {
      wedge(len * (0.55 + 0.15 * i), TORCH_CORE_DEG, strength * 0.22);
    }

    // Feet last: a small pool under the bearer so they can see themselves, and
    // so there is no dark ring between them and the shoulder of the beam.
    const R = TORCH_FOOT_RADIUS * mult;
    for (let i = 4; i >= 1; i--) {
      const k = i / 4;
      er.fillStyle(0xffffff, strength * (0.12 + 0.24 * (1 - k)));
      er.fillCircle(x, y, R * k);
    }
  }
}
