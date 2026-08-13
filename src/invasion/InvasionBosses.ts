import type { Fighter } from '../entities/Fighter';
import type { Husk } from './Husk';
import type { BossKind } from './HuskVariants';

/**
 * The three things the tenth wave sends, and the only three elements the
 * elemental lightning is not allowed to brand.
 *
 * ⚖️  THE ARBITER (justice) — a magistrate that has already decided. It walks
 *     you down, drops gavels on the floor you are standing on, reads a Verdict
 *     that fills the room, chains you where you stand and, late on, calls its
 *     bailiffs in to hold you for it.
 * 🌙  THE DREAMER (dream) — never comes near you. It sings the room to sleep,
 *     lobs orbs that turn to follow, dreams wisps into being and, late on,
 *     sleepwalks across the room leaving a nightmare on the floor behind it.
 * ⚛️  THE PARADOX (quantum) — every outcome at once. It scatters phase orbs,
 *     collapses onto you out of nowhere, forks off echoes of decisions it did
 *     not take and, late on, superimposes itself onto another husk entirely.
 *
 * Each comes in three tiers (waves 10 / 20 / 30+): a tier is a stat premium
 * *and* one more move in the rotation. A boss that spawns into a room the
 * corruption has taken comes up **infected** — everything above, harder, plus
 * one move that only an infected boss has.
 *
 * The brain owns the moves and the pacing; every effect it wants belongs to the
 * arena, so it asks for them through the optional boss half of `HuskWorld`.
 * That keeps the six other HuskWorld implementers (the Disgraced King's court,
 * the boss toolkit, the Graveyard, Soul's corpses, the Summoner mutation and
 * the campaign horde format) untouched — none of them ever raises a boss.
 */

/** Cadence multiplier per tier: the same boss, thinking faster. */
const TIER_CADENCE = [1, 0.85, 0.72];
/** An infected boss is quicker again on top of its tier. */
const INFECTED_CADENCE = 0.82;

/** Bosses hold still while a big move telegraphs, so the wind-up reads. */
interface Scheduled {
  at: number;
  run: () => void;
}

interface BossMove {
  id: string;
  /** Lowest tier that has this move. 4 = infected only. */
  minTier: number;
  infectedOnly?: boolean;
  cooldownMs: number;
  /** Seconds of standing still after the cast, so the wind-up is readable. */
  rootMs?: number;
  /** Played on the cast, and only if you are in the room to hear it. */
  sfx?: string;
  run: (target: Fighter, time: number) => void;
}

export class BossBrain {
  private moves: BossMove[] = [];
  private readyAt = new Map<string, number>();
  /** Global gate — one move at a time, whatever their individual cooldowns say. */
  private nextMoveAt = 0;
  private rootUntil = 0;
  private queue: Scheduled[] = [];
  /** Rotates the Paradox's orb spiral and the Arbiter's slam pattern. */
  private spin = 0;
  private started = false;

  constructor(
    private husk: Husk,
    public readonly kind: BossKind,
    public readonly tier: 1 | 2 | 3,
  ) {}

  /** Damage unit for every move — difficulty, tier and infection already folded in. */
  private get hit(): number {
    return this.husk.biteDamage;
  }

  private get color(): number {
    return this.husk.variant.color;
  }

  private get infected(): boolean {
    return this.husk.infected;
  }

  private get cadence(): number {
    return TIER_CADENCE[this.tier - 1] * (this.infected ? INFECTED_CADENCE : 1);
  }

  /** Somewhere in the room the boss could stand, falling back to where it is. */
  private point(): { x: number; y: number } {
    return this.husk.world?.bossWanderPoint?.(this.husk) ?? { x: this.husk.x, y: this.husk.y };
  }

  private say(text: string): void {
    const hex = `#${this.color.toString(16).padStart(6, '0')}`;
    this.husk.world?.bossSay?.(this.husk, text, hex);
  }

  private after(time: number, ms: number, run: () => void): void {
    this.queue.push({ at: time + ms, run });
  }

  // ── Frame ─────────────────────────────────────────────────────────

  update(target: Fighter, dist: number, time: number): void {
    if (!this.started) {
      this.started = true;
      this.buildMoves();
      // A beat of grace on arrival — nobody is gavelled the frame a boss lands.
      this.nextMoveAt = time + 1600;
    }

    // Anything a previous cast queued up (extra slams, the triple blink).
    for (let i = this.queue.length - 1; i >= 0; i--) {
      if (time < this.queue[i].at) continue;
      const job = this.queue[i];
      this.queue.splice(i, 1);
      if (this.husk.active && this.husk.hp > 0) job.run();
    }

    this.move(target, dist, time);
    if (time >= this.nextMoveAt) this.pickMove(target, time);
  }

  /** Cleared with the husk, so a queued slam can never outlive the match. */
  clear(): void {
    this.queue = [];
  }

  /**
   * The Paradox's host died and it is a separate thing again. Its own move gate
   * has been idle the whole time it was superimposed, so it is re-armed here
   * rather than firing the instant it reappears.
   */
  onPossessionEnded(time: number): void {
    this.nextMoveAt = Math.max(this.nextMoveAt, time + 1400);
    this.readyAt.set('superposition', time + 13000 * this.cadence);
  }

  private move(target: Fighter, dist: number, time: number): void {
    if (time < this.rootUntil) {
      this.husk.holdStill();
      return;
    }
    switch (this.kind) {
      case 'arbiter':
        // It does not hurry, and it does not stop.
        this.husk.moveToward(target, 1);
        this.husk.tryBite(target, dist, time, 62);
        break;
      case 'dreamer':
        this.husk.kite(target, dist, this.husk.variant.preferredRange ?? 300);
        this.husk.tryBite(target, dist, time);
        break;
      case 'paradox':
        this.husk.kite(target, dist, 210);
        this.husk.tryBite(target, dist, time);
        break;
    }
  }

  /** First ready move in rotation order, so late-tier moves lead when they are up. */
  private pickMove(target: Fighter, time: number): void {
    const usable = this.moves.filter((m) => {
      if (m.infectedOnly && !this.infected) return false;
      if (!m.infectedOnly && m.minTier > this.tier) return false;
      return time >= (this.readyAt.get(m.id) ?? 0);
    });
    if (usable.length === 0) {
      this.nextMoveAt = time + 400;
      return;
    }
    // Longest-waiting first, so a rotation never starves its heavy moves.
    usable.sort((a, b) => (this.readyAt.get(a.id) ?? 0) - (this.readyAt.get(b.id) ?? 0));
    const move = usable[0];
    this.readyAt.set(move.id, time + move.cooldownMs * this.cadence);
    this.nextMoveAt = time + 1200 * this.cadence;
    if (move.rootMs) this.rootUntil = time + move.rootMs;
    if (move.sfx) this.husk.world?.bossSfx?.(this.husk, move.sfx);
    this.spin += 0.7;
    move.run(target, time);
  }

  // ── The rotations ─────────────────────────────────────────────────

  private buildMoves(): void {
    switch (this.kind) {
      case 'arbiter': this.moves = this.arbiterMoves(); break;
      case 'dreamer': this.moves = this.dreamerMoves(); break;
      case 'paradox': this.moves = this.paradoxMoves(); break;
    }
  }

  // ⚖️ THE ARBITER ───────────────────────────────────────────────────

  private arbiterMoves(): BossMove[] {
    const w = (): Husk['world'] => this.husk.world;
    return [
      {
        // GAVEL — it strikes the floor where you are, and then where it thinks
        // you will be. Tier decides how many times.
        id: 'gavel', minTier: 1, cooldownMs: 4600, rootMs: 700, sfx: 'hammer-forge',
        run: (target, time) => {
          this.say('⚖️ GAVEL');
          const slams = this.tier >= 3 ? 5 : this.tier >= 2 ? 3 : 1;
          for (let i = 0; i < slams; i++) {
            // Each later slam lands further along the way the target is running.
            const lead = i * 78;
            const a = Math.atan2(target.y - this.husk.y, target.x - this.husk.x) + Math.sin(this.spin + i) * 0.9;
            const x = target.x + Math.cos(a) * lead;
            const y = target.y + Math.sin(a) * lead;
            this.after(time, i * 420, () => {
              w()?.bossAoe?.(this.husk, {
                x, y, radius: 104, damage: Math.round(this.hit * 2.2),
                color: this.color, warnMs: 780,
              });
            });
          }
        },
      },
      {
        // VERDICT — the whole room is in the dock. Stand outside the ring or eat it.
        id: 'verdict', minTier: 1, cooldownMs: 7600, rootMs: 1300, sfx: 'judgement',
        run: () => {
          this.say('⚖️ VERDICT');
          w()?.bossAoe?.(this.husk, {
            x: this.husk.x, y: this.husk.y,
            radius: 236 + this.tier * 22,
            damage: Math.round(this.hit * 1.9),
            color: this.color, warnMs: 1250, ring: true,
          });
        },
      },
      {
        // CONTEMPT — chained where you stand, and fined for it. The chain is
        // thrown along a lane you get a beat to leave: it only closes on
        // whoever is still inside its reach when it lands.
        id: 'contempt', minTier: 2, cooldownMs: 8600, rootMs: 620, sfx: 'chain',
        run: (target, time) => {
          this.say('⛓️ CONTEMPT OF COURT');
          const reach = 400;
          w()?.telegraph(this.husk.x, this.husk.y, target.x, target.y, this.color, 480);
          this.after(time, 480, () => {
            if (!target.active || target.hp <= 0) return;
            if (Math.hypot(target.x - this.husk.x, target.y - this.husk.y) > reach) return;
            w()?.bossHit?.(this.husk, target, Math.round(this.hit * 1.1), this.color);
            w()?.bossSlow?.(0.32, 1700 + this.tier * 200);
          });
        },
      },
      {
        // BAILIFFS — it stops arguing and has you held.
        id: 'bailiffs', minTier: 3, cooldownMs: 12000, rootMs: 600, sfx: 'holy-chord',
        run: () => {
          this.say('⚖️ BAILIFFS!');
          w()?.bossSpawn?.(this.husk, 'boss-bailiff', 3);
        },
      },
      {
        // THE DOCK — infected only. Four sentences burned into the floor around
        // it, so the room itself becomes the punishment.
        id: 'the-dock', minTier: 4, infectedOnly: true, cooldownMs: 10000, rootMs: 900, sfx: 'curse-cast',
        run: (_target, time) => {
          this.say('👁️ THE DOCK');
          for (let i = 0; i < 4; i++) {
            const a = (i / 4) * Math.PI * 2 + this.spin;
            const x = this.husk.x + Math.cos(a) * 132;
            const y = this.husk.y + Math.sin(a) * 132;
            this.after(time, i * 160, () => {
              w()?.bossZone?.(this.husk, x, y, 74, this.color, 5600, Math.round(this.hit * 0.35));
            });
          }
        },
      },
    ];
  }

  // 🌙 THE DREAMER ───────────────────────────────────────────────────

  private dreamerMoves(): BossMove[] {
    const w = (): Husk['world'] => this.husk.world;
    return [
      {
        // SANDMAN'S VOLLEY — a fan of orbs that all turn to follow you.
        id: 'volley', minTier: 1, cooldownMs: 3800, rootMs: 400, sfx: 'dream-chime',
        run: (target) => {
          const shots = this.tier >= 3 ? 7 : this.tier >= 2 ? 5 : 3;
          const base = Math.atan2(target.y - this.husk.y, target.x - this.husk.x);
          for (let i = 0; i < shots; i++) {
            const t = (i / Math.max(1, shots - 1)) * 2 - 1;
            w()?.bossShot?.(this.husk, base + t * 0.5, {
              speed: 168, damage: Math.round(this.hit * 0.85),
              color: this.color, radius: 10, homing: true, lifetimeMs: 4200,
            });
          }
        },
      },
      {
        // LULLABY — a slow, soft wave. Getting caught costs you your legs.
        id: 'lullaby', minTier: 1, cooldownMs: 6800, rootMs: 1400, sfx: 'pillow',
        run: () => {
          this.say('🌙 LULLABY');
          w()?.bossAoe?.(this.husk, {
            x: this.husk.x, y: this.husk.y,
            radius: 250 + this.tier * 20,
            damage: Math.round(this.hit * 1.2),
            color: 0xb9a8ff, warnMs: 1350, ring: true,
            slowMult: 0.42, slowMs: 2800,
          });
        },
      },
      {
        // NIGHTMARES — it dreams three fast little things into the room.
        id: 'nightmares', minTier: 2, cooldownMs: 9500, rootMs: 700, sfx: 'nightmare',
        run: () => {
          this.say('💤 NIGHTMARES');
          w()?.bossSpawn?.(this.husk, 'boss-wisp', this.tier >= 3 ? 5 : 3);
        },
      },
      {
        // SLEEPWALK — it fades out of one corner and into another, and the bed
        // it left behind is still warm.
        id: 'sleepwalk', minTier: 3, cooldownMs: 10500, rootMs: 300, sfx: 'teleport',
        run: () => {
          this.say('🌙 SLEEPWALK');
          const from = { x: this.husk.x, y: this.husk.y };
          const to = this.point();
          w()?.bossZone?.(this.husk, from.x, from.y, 86, 0x6a52c8, 5200, Math.round(this.hit * 0.3), 0.6);
          w()?.bossBlink?.(this.husk, to.x, to.y, this.color);
        },
      },
      {
        // NIGHT TERROR — infected only. It stops dreaming softly.
        id: 'night-terror', minTier: 4, infectedOnly: true, cooldownMs: 13000, rootMs: 1100, sfx: 'ghost-wail',
        run: (_target, time) => {
          this.say('👁️ NIGHT TERROR');
          for (let i = 0; i < 6; i++) {
            this.after(time, i * 140, () => {
              const p = this.point();
              w()?.bossZone?.(this.husk, p.x, p.y, 78, 0x3a2a6a, 6200, Math.round(this.hit * 0.4), 0.55);
            });
          }
        },
      },
    ];
  }

  // ⚛️ THE PARADOX ───────────────────────────────────────────────────

  private paradoxMoves(): BossMove[] {
    const w = (): Husk['world'] => this.husk.world;
    return [
      {
        // UNCERTAINTY — orbs in every direction at once, because it did not
        // pick one.
        id: 'uncertainty', minTier: 1, cooldownMs: 3600, rootMs: 350, sfx: 'glitch',
        run: () => {
          const shots = this.tier >= 3 ? 9 : this.tier >= 2 ? 7 : 5;
          for (let i = 0; i < shots; i++) {
            w()?.bossShot?.(this.husk, this.spin + (i / shots) * Math.PI * 2, {
              speed: 230, damage: Math.round(this.hit * 0.7),
              color: this.color, radius: 8, lifetimeMs: 3000,
            });
          }
        },
      },
      {
        // COLLAPSE — it stops being everywhere and is suddenly right here.
        id: 'collapse', minTier: 1, cooldownMs: 6200, rootMs: 800, sfx: 'blink',
        run: (target, time) => {
          this.say('⚛️ COLLAPSE');
          const a = this.spin;
          const x = target.x + Math.cos(a) * 96;
          const y = target.y + Math.sin(a) * 96;
          w()?.bossBlink?.(this.husk, x, y, this.color);
          this.after(time, 120, () => {
            w()?.bossAoe?.(this.husk, {
              x: this.husk.x, y: this.husk.y, radius: 132,
              damage: Math.round(this.hit * 2.1),
              color: this.color, warnMs: 560,
            });
          });
        },
      },
      {
        // ECHOES — the outcomes it did not take, standing there arguing for
        // themselves. They pay nothing, because they are not really here.
        id: 'echoes', minTier: 2, cooldownMs: 9800, rootMs: 600, sfx: 'portal',
        run: () => {
          this.say('⚛️ ECHOES');
          w()?.bossSpawn?.(this.husk, 'boss-echo', this.tier >= 3 ? 3 : 2);
        },
      },
      {
        // SUPERPOSITION — it stops being a separate thing from one of its own
        // husks. Untouchable until you take the husk apart.
        id: 'superposition', minTier: 3, cooldownMs: 13000, sfx: 'time-warp',
        run: () => {
          const victim = w()?.findPossessTarget(this.husk) ?? null;
          if (!victim) {
            // Nothing to superimpose onto — fork one and try again shortly.
            w()?.bossSpawn?.(this.husk, 'boss-echo', 1);
            this.readyAt.set('superposition', 0);
            return;
          }
          this.say('⚛️ SUPERPOSITION');
          w()?.possess(this.husk, victim);
        },
      },
      {
        // DECOHERENCE — infected only. Three blinks, and it leaves the shape of
        // itself behind at every stop.
        id: 'decoherence', minTier: 4, infectedOnly: true, cooldownMs: 8200, rootMs: 300, sfx: 'glitch',
        run: (_target, time) => {
          this.say('👁️ DECOHERENCE');
          for (let i = 0; i < 3; i++) {
            this.after(time, i * 320, () => {
              const from = { x: this.husk.x, y: this.husk.y };
              const p = this.point();
              w()?.bossBlink?.(this.husk, p.x, p.y, this.color);
              w()?.bossAoe?.(this.husk, {
                x: from.x, y: from.y, radius: 104,
                damage: Math.round(this.hit * 1.2),
                color: this.color, warnMs: 420,
              });
            });
          }
        },
      },
    ];
  }
}
