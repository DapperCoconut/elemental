import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { Projectile } from '../../combat/Projectile';
import { CastContext } from '../Ability';
import { SummonPurgeTarget } from '../../combat/SummonPurge';
import { stretchAllEffects } from '../../combat/StatusEffects';
import type { CustomStatus } from './StatusHudKit';
import { Sfx } from '../../audio';
import {
  QC, orbitShell, splicerBlade, splitWall, parasiteBody, cutFlash, stateBloom, coreAura,
} from './QuantumCoreVisuals';

type Owner = 'player' | 'npc';

// ── Atom Splicers (Click) ────────────────────────────────────────────────────
const SPLICER_COUNT = 5;
const SPLICER_DAMAGE = 8;
/** Blade length, and therefore its reach past the point it orbits on. */
const SPLICER_LEN = 30;
const SPLICER_IDLE_R = 48;
const SPLICER_WIDE_R = 112;
const SPLICER_IDLE_SPIN = 1.7;
const SPLICER_WIDE_SPIN = 5.4;
/**
 * How fast the ring converges on its target radius and speed. Deliberately soft: the wind-out
 * is the tell that the button is down, and a ring that snapped would give the player nothing
 * to read.
 */
const SPLICER_LERP = 4.2;
/**
 * A `cast` marks the ring wide for slightly longer than the ability's own cooldown, so a held
 * button keeps it out there continuously while a single tap lets it fall back in.
 */
const SPLICER_WIDE_MS = 1150;
/** Per blade, per target. Five blades sharing one gate would make the ring a single big hit. */
const SPLICER_GATE_MS = 500;

// ── Arena Split (R) ──────────────────────────────────────────────────────────
const SPLIT_MS = 15000;
const SPLIT_HALF_W = 10;
/**
 * The band a projectile is killed in, wider than the wall itself. A fast shot covers ~15px in a
 * frame, so testing only the wall's own width would let the quickest projectiles in the game
 * tunnel straight through it.
 */
const SPLIT_KILL_BAND = 20;

// ── Effect Split (F) ─────────────────────────────────────────────────────────
const EFFECT_DURATION_MULT = 2.5;
/**
 * The potency window when there was nothing timed to stretch. The halving still has work to do —
 * plenty of multipliers are rewritten every frame by their kit and carry no expiry at all — so
 * pressing F on a clean body is weak rather than wasted.
 */
const EFFECT_FLOOR_MS = 4000;

// ── Quantum Parasite (Q) ─────────────────────────────────────────────────────
const WORM_SEGMENTS = 10;
const SEG_HP = 35;
const WORM_DAMAGE = 35;
const WORM_LIFE_MS = 15000;
const WORM_SPEED = 215;
const WORM_SEG_GAP = 18;
const WORM_SEG_R = 11;
const WORM_CONTACT_GATE_MS = 800;
/**
 * One. A cut next to the mouth leaves a single bead, and that bead is the mouth — which cannot
 * be killed, so it keeps going as a worm of length one until its timer runs out. Discarding it
 * as debris would be the one case where cutting a parasite *did* kill its mouth.
 */
const WORM_MIN_SEGS = 1;

const ARENA_PAD = 26;
const CUT_FLASH_MS = 420;
const BLOOM_MS = 460;

interface Ring {
  ang: number;
  r: number;
  spin: number;
  wideUntil: number;
  /** One contact gate per blade, so the ring cuts five times a revolution and not five at once. */
  gates: Map<Fighter, number>[];
}

interface Split {
  owner: Owner;
  x: number;
  until: number;
  /** Which side of the seam the owner's enemies are pinned to: -1 left, +1 right. */
  side: number;
  seed: number;
}

interface Seg { x: number; y: number; r: number; hp: number; maxHp: number }

interface Worm {
  owner: Owner;
  segs: Seg[];
  ang: number;
  diesAt: number;
  gate: Map<Fighter, number>;
  seed: number;
}

interface Burst { x: number; y: number; ang: number; bornAt: number; seed: number; kind: 'cut' | 'bloom'; tint: number; r: number }

// ── Arena API ────────────────────────────────────────────────────────────────

export interface QuantumCoreArenaApi {
  get scene(): Phaser.Scene;
  get player(): Fighter;
  get npc(): Fighter;
  /** Everything the player is allowed to hurt — husks in Invasion, the npc in a plain 1v1. */
  get enemies(): Fighter[];
  get projectiles(): Phaser.Physics.Arcade.Group;
  get eKey(): Phaser.Input.Keyboard.Key;
  get rKey(): Phaser.Input.Keyboard.Key;
  get fKey(): Phaser.Input.Keyboard.Key;
  get qKey(): Phaser.Input.Keyboard.Key;
  /** The half the player is currently wearing — `'quantum'` exactly when the third state is live. */
  get elementId(): string;
  get npcElementId(): string;
  get width(): number;
  get height(): number;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  setStatusIndicator(id: string, status: CustomStatus | null): void;
}

/**
 * QuantumCoreKit — the Third State.
 *
 * Every other element's kit is about a subject: fire burns, water flows, chalk is drawn on the
 * floor. This one has no subject. It is the kit the *bond itself* supplies once the player has
 * bought Third State, and all five of its abilities do the same thing to five different nouns:
 * they split something in two.
 *
 * - **Atom Splicers** split the caster into a ring of five orbiting blades. Holding drives them
 *   out wide and fast; the damage per cut never changes, so the button buys coverage, not power.
 * - **Ability Split** halves the next cooldown. The charge is banked on `Fighter`, not here, so
 *   it survives a bond collapse — arm it as Quantum, spend it as whatever you become.
 * - **Arena Split** stands a standing wave down the middle of the room. The enemy cannot cross
 *   it and neither can anything either side shoots; the caster walks through freely.
 * - **Effect Split** halves the strength of everything riding on the caster and stretches it to
 *   two and a half times as long, via the two generic chokepoints Ruin's spikes already use.
 * - **Quantum Parasite** is the one that means it: a ten-bead worm whose eight middle beads can
 *   be cut by *anybody*, and every cut leaves two worms where there was one. The mouth and the
 *   tail cannot be killed, so a cut can never do anything but multiply the problem.
 *
 * Both sides are simulated. An npc never buys the upgrade, but an online opponent can, and the
 * peer's collapse onto Quantum re-keys our replica of them the same way ours re-keys us.
 */
export class QuantumCoreKit implements SummonPurgeTarget {
  private api: QuantumCoreArenaApi;

  private rings: Record<Owner, Ring | null> = { player: null, npc: null };
  private splits: Split[] = [];
  private worms: Worm[] = [];
  private bursts: Burst[] = [];
  private vizT = 0;

  /** Body layer: under the fighters (depth 5), so the aura lights the sprite rather than hiding it. */
  private bodyGfx: Phaser.GameObjects.Graphics | null = null;
  /** Wall layer: over the fighters, because a field you cannot cross should occlude you. */
  private wallGfx: Phaser.GameObjects.Graphics | null = null;
  /** Blades, parasites and cut flashes. */
  private airGfx: Phaser.GameObjects.Graphics | null = null;
  /** Fighters this kit has wired its Ability-Split callback onto. */
  private wired = new WeakSet<Fighter>();

  constructor(api: QuantumCoreArenaApi) {
    this.api = api;
  }

  // ── Small helpers ──────────────────────────────────────────────────────────

  private get now(): number { return this.api.scene.time.now; }

  private fighter(owner: Owner): Fighter {
    return owner === 'player' ? this.api.player : this.api.npc;
  }

  private alive(f: Fighter | null | undefined): boolean {
    return !!f && f.active && f.hp > 0;
  }

  /** True while that side is actually wearing the third state. */
  private isCore(owner: Owner): boolean {
    return owner === 'player' ? this.api.elementId === 'quantum' : this.api.npcElementId === 'quantum';
  }

  /** Everything this side is allowed to hurt. */
  private targetsOf(owner: Owner): Fighter[] {
    const list = owner === 'player' ? this.api.enemies : [this.api.player];
    return list.filter((f) => this.alive(f));
  }

  private radiusOf(f: Fighter): number {
    return 18 * (f.sizeMult ?? 1);
  }

  private hex(color: number): string {
    return `#${color.toString(16).padStart(6, '0')}`;
  }

  private get left(): number { return ARENA_PAD; }
  private get right(): number { return this.api.width - ARENA_PAD; }
  private get top(): number { return ARENA_PAD; }
  private get bottom(): number { return this.api.height - ARENA_PAD; }

  private ensureLayers(): void {
    if (!this.bodyGfx) this.bodyGfx = this.api.scene.add.graphics().setDepth(4);
    if (!this.wallGfx) this.wallGfx = this.api.scene.add.graphics().setDepth(6);
    if (!this.airGfx) this.airGfx = this.api.scene.add.graphics().setDepth(9);
  }

  private bloom(x: number, y: number, tint: number, r = 70): void {
    this.bursts.push({ x, y, ang: 0, bornAt: this.now, seed: Math.random() * 999, kind: 'bloom', tint, r });
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  reset(): void {
    this.rings = { player: null, npc: null };
    this.splits = [];
    this.worms = [];
    this.bursts = [];
    this.vizT = 0;
    this.bodyGfx?.destroy(); this.bodyGfx = null;
    this.wallGfx?.destroy(); this.wallGfx = null;
    this.airGfx?.destroy(); this.airGfx = null;
    this.wired = new WeakSet<Fighter>();

    // Both of these live on `Fighter` so they can outlive a bond collapse, which means nothing
    // else clears them between matches either.
    for (const f of [this.api.player, this.api.npc]) {
      if (!f) continue;
      f.nextCastCooldownMult = 1;
      f.effectSplitUntil = 0;
      f.onCooldownSplitSpent = null;
    }

    for (const id of [
      'quantum-splicers', 'quantum-ability-split', 'quantum-arena-split',
      'quantum-effect-split', 'quantum-parasite',
    ]) this.api.setStatusIndicator(id, null);
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  /**
   * The third state's own key handling. ArenaScene routes here only while `elementId` is
   * `'quantum'`, so there is no need to re-test it per key — but the pointer branch does need
   * to be a plain `isDown` rather than a just-pressed check: holding is the whole Click ability,
   * and the 900ms cooldown is what paces the re-cast.
   */
  handleInput(_time: number, pointer: Phaser.Input.Pointer, _mx: number, _my: number, ctx: CastContext): void {
    const p = this.api.player;
    if (!this.alive(p)) return;
    if (pointer.isDown) p.castAbility('quantum-splicers', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.eKey)) p.castAbility('quantum-ability-split', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.rKey)) p.castAbility('quantum-arena-split', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.fKey)) p.castAbility('quantum-effect-split', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.qKey)) p.castAbility('quantum-parasite', ctx);
  }

  // ── Casts ──────────────────────────────────────────────────────────────────

  /** Click: kick the ring out wide. The blades themselves are permanent while the form is worn. */
  doSplicers(owner: Owner): void {
    const ring = this.ensureRing(owner);
    if (!ring) return;
    ring.wideUntil = this.now + SPLICER_WIDE_MS;
    const f = this.fighter(owner);
    if (this.alive(f)) Sfx.playAt('slash', f.x, { rate: 1.45, volume: 0.4 });
  }

  /**
   * E: bank a halved cooldown on the body. Set here rather than at the press because
   * `castAbility` stamps *before* it casts — by the time this runs, E's own cooldown is already
   * on the clock and cannot eat its own charge.
   */
  doAbilitySplit(owner: Owner): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    f.nextCastCooldownMult = 0.5;
    this.wire(f);
    this.bloom(f.x, f.y, QC.ghost, 58);
    this.api.showFloatingText(f.x, f.y - 46, '⚛️ Ability Split', this.hex(QC.ghost));
    Sfx.playAt('teleport', f.x, { rate: 1.6, volume: 0.55 });
  }

  /** R: stand the seam up the middle and pin everyone this side is fighting to one half. */
  doArenaSplit(owner: Owner): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const x = this.api.width / 2;
    const victims = this.targetsOf(owner);
    const primary = victims[0] ?? (owner === 'player' ? this.api.npc : this.api.player);
    // Whichever half they are standing in is the half they are staying in. A victim sitting
    // exactly on the line is pushed away from the caster, which is the reading that never
    // traps somebody in the caster's own lap.
    const side = Math.sign((primary?.x ?? x) - x) || (f.x <= x ? 1 : -1);

    this.splits = this.splits.filter((s) => s.owner !== owner);
    this.splits.push({ owner, x, until: this.now + SPLIT_MS, side, seed: Math.random() * 999 });

    this.bloom(x, this.api.height / 2, QC.core, 150);
    this.api.showFloatingText(f.x, f.y - 46, '⚛️ Arena Split', this.hex(QC.core));
    Sfx.playAt('ice-shatter', x, { rate: 0.65, volume: 0.8 });
  }

  /**
   * F: split every effect on the caster along its own length. The duration half is done through
   * the shared status table; the potency half is a single timestamp read by `Fighter.takeDamage`
   * and ArenaScene's speed aggregate, which between them cover every generic multiplier in the
   * game without any kit having to cooperate.
   */
  doEffectSplit(owner: Owner): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const { stretched, longestMs } = stretchAllEffects(
      f, Date.now(), this.now, EFFECT_DURATION_MULT,
    );
    const window = Math.max(longestMs, EFFECT_FLOOR_MS);
    f.effectSplitUntil = Math.max(f.effectSplitUntil, this.now + window);

    this.bloom(f.x, f.y, QC.hot, 76);
    this.api.showFloatingText(f.x, f.y - 46,
      stretched.length > 0 ? `⚛️ Split ×${stretched.length}` : '⚛️ Effect Split',
      this.hex(QC.hot));
    Sfx.playAt('stretch', f.x, { rate: 0.85, volume: 0.7 });
  }

  /** Q: tear a parasite out of the floor, heading at the aim point. */
  doParasite(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const ang = Math.atan2(ty - f.y, tx - f.x);
    const segs: Seg[] = [];
    for (let i = 0; i < WORM_SEGMENTS; i++) {
      segs.push({
        x: f.x - Math.cos(ang) * i * WORM_SEG_GAP,
        y: f.y - Math.sin(ang) * i * WORM_SEG_GAP,
        r: WORM_SEG_R,
        hp: SEG_HP,
        maxHp: SEG_HP,
      });
    }
    this.worms.push({
      owner, segs, ang, diesAt: this.now + WORM_LIFE_MS,
      gate: new Map<Fighter, number>(), seed: Math.random() * 999,
    });
    this.bloom(f.x, f.y, QC.core, 90);
    this.api.showFloatingText(f.x, f.y - 46, '⚛️ Quantum Parasite', this.hex(QC.core));
    Sfx.playAt('claw', f.x, { rate: 0.6, volume: 0.9 });
  }

  // ── Per-frame ──────────────────────────────────────────────────────────────

  update(_time: number, delta: number): void {
    this.ensureLayers();
    this.vizT += delta / 1000;
    this.updateRings(delta);
    this.updateSplits();
    this.updateWorms(delta);
    this.draw();
    this.pushStatuses();
  }

  // ── Atom Splicers ──────────────────────────────────────────────────────────

  private ensureRing(owner: Owner): Ring | null {
    if (!this.isCore(owner)) return null;
    let ring = this.rings[owner];
    if (!ring) {
      ring = {
        ang: Math.random() * Math.PI * 2,
        r: SPLICER_IDLE_R,
        spin: SPLICER_IDLE_SPIN,
        wideUntil: 0,
        gates: Array.from({ length: SPLICER_COUNT }, () => new Map<Fighter, number>()),
      };
      this.rings[owner] = ring;
    }
    return ring;
  }

  private updateRings(delta: number): void {
    const dt = delta / 1000;
    const time = this.now;

    for (const owner of ['player', 'npc'] as Owner[]) {
      const f = this.fighter(owner);
      if (!this.isCore(owner) || !this.alive(f)) {
        // Leaving the form takes the blades with it: they are the body, not a summon.
        this.rings[owner] = null;
        continue;
      }
      const ring = this.ensureRing(owner);
      if (!ring) continue;
      this.wire(f);

      const wide = time < ring.wideUntil;
      const k = Math.min(1, dt * SPLICER_LERP);
      ring.r += ((wide ? SPLICER_WIDE_R : SPLICER_IDLE_R) - ring.r) * k;
      ring.spin += ((wide ? SPLICER_WIDE_SPIN : SPLICER_IDLE_SPIN) - ring.spin) * k;
      ring.ang += ring.spin * dt;

      const targets = this.targetsOf(owner);
      if (targets.length === 0) continue;

      for (let i = 0; i < SPLICER_COUNT; i++) {
        const a = ring.ang + (i * Math.PI * 2) / SPLICER_COUNT;
        // The blade's *tip* is what cuts: the sprite sits on the orbit and reaches outward.
        const bx = f.x + Math.cos(a) * (ring.r + SPLICER_LEN * 0.3);
        const by = f.y + Math.sin(a) * (ring.r + SPLICER_LEN * 0.3);
        const gate = ring.gates[i];
        for (const t of targets) {
          if (Phaser.Math.Distance.Between(bx, by, t.x, t.y) > SPLICER_LEN * 0.55 + this.radiusOf(t)) continue;
          if (time < (gate.get(t) ?? 0)) continue;
          gate.set(t, time + SPLICER_GATE_MS);
          t.takeDamage(SPLICER_DAMAGE);
          this.api.spawnHitFlash(t.x, t.y, QC.core);
          Sfx.playAt('slash', t.x, { rate: 1.7, volume: 0.35 });
        }
      }
    }
  }

  // ── Arena Split ────────────────────────────────────────────────────────────

  private updateSplits(): void {
    const time = this.now;

    for (let i = this.splits.length - 1; i >= 0; i--) {
      const s = this.splits[i];
      if (time >= s.until) {
        this.bloom(s.x, this.api.height / 2, QC.ghost, 120);
        Sfx.playAt('ice-shatter', s.x, { rate: 1.3, volume: 0.4 });
        this.splits.splice(i, 1);
        continue;
      }

      // ── Bodies: only the caster's enemies are held ──
      for (const t of this.targetsOf(s.owner)) {
        const pad = SPLIT_HALF_W + this.radiusOf(t);
        const body = t.body as Phaser.Physics.Arcade.Body | null;
        if (s.side < 0 && t.x > s.x - pad) {
          t.x = s.x - pad;
          if (body && body.velocity.x > 0) body.setVelocityX(0);
        } else if (s.side > 0 && t.x < s.x + pad) {
          t.x = s.x + pad;
          if (body && body.velocity.x < 0) body.setVelocityX(0);
        }
      }

      // ── Shots: everybody's, including the caster's ──
      // Snapshotted because `destroy()` splices the group out from under the loop.
      for (const child of [...this.api.projectiles.getChildren()]) {
        const proj = child as Projectile;
        if (!proj.active) continue;
        if (Math.abs(proj.x - s.x) > SPLIT_KILL_BAND) continue;
        this.api.spawnHitFlash(proj.x, proj.y, QC.core);
        this.bursts.push({
          x: proj.x, y: proj.y, ang: Math.PI / 2, bornAt: time,
          seed: Math.random() * 999, kind: 'bloom', tint: QC.hot, r: 26,
        });
        proj.destroy();
      }
    }
  }

  // ── Quantum Parasite ───────────────────────────────────────────────────────

  private updateWorms(delta: number): void {
    const dt = delta / 1000;
    const time = this.now;

    for (let i = this.worms.length - 1; i >= 0; i--) {
      const w = this.worms[i];
      if (time >= w.diesAt || w.segs.length < WORM_MIN_SEGS) {
        const h = w.segs[0];
        if (h) {
          this.bloom(h.x, h.y, QC.ghost, 46);
          Sfx.playAt('slime-splat', h.x, { rate: 1.2, volume: 0.4 });
        }
        this.worms.splice(i, 1);
        continue;
      }

      // ── Mouth leads, walls turn it ──
      const head = w.segs[0];
      head.x += Math.cos(w.ang) * WORM_SPEED * dt;
      head.y += Math.sin(w.ang) * WORM_SPEED * dt;
      if (head.x < this.left) { head.x = this.left; w.ang = Math.PI - w.ang; }
      if (head.x > this.right) { head.x = this.right; w.ang = Math.PI - w.ang; }
      if (head.y < this.top) { head.y = this.top; w.ang = -w.ang; }
      if (head.y > this.bottom) { head.y = this.bottom; w.ang = -w.ang; }

      // ── The rest follows at a fixed spacing ──
      for (let k = 1; k < w.segs.length; k++) {
        const prev = w.segs[k - 1];
        const sg = w.segs[k];
        const a = Math.atan2(sg.y - prev.y, sg.x - prev.x);
        sg.x = prev.x + Math.cos(a) * WORM_SEG_GAP;
        sg.y = prev.y + Math.sin(a) * WORM_SEG_GAP;
      }

      // ── Bite: the mouth, and only the mouth ──
      for (const t of this.targetsOf(w.owner)) {
        if (Phaser.Math.Distance.Between(head.x, head.y, t.x, t.y) > head.r * 1.6 + this.radiusOf(t)) continue;
        if (time < (w.gate.get(t) ?? 0)) continue;
        w.gate.set(t, time + WORM_CONTACT_GATE_MS);
        t.takeDamage(WORM_DAMAGE);
        this.api.spawnHitFlash(t.x, t.y, QC.core);
        Sfx.playAt('claw', t.x, { rate: 0.85, volume: 0.8 });
      }
    }

    this.tickWormDamage();
    this.bounceWorms();
  }

  /**
   * Anything in flight can cut a parasite, whoever threw it — that is the whole point of the
   * ability, since a cut is a *reward* and the caster is allowed to farm their own worm for
   * more worms. The mouth and the tail swallow a shot without taking any of it, so a body can
   * always be split but never quite killed.
   */
  private tickWormDamage(): void {
    if (this.worms.length === 0) return;
    for (const child of [...this.api.projectiles.getChildren()]) {
      const proj = child as Projectile;
      if (!proj.active) continue;

      let best: { w: Worm; idx: number; d: number } | null = null;
      for (const w of this.worms) {
        for (let i = 0; i < w.segs.length; i++) {
          const s = w.segs[i];
          const d = Phaser.Math.Distance.Between(proj.x, proj.y, s.x, s.y);
          if (d > s.r + 6) continue;
          if (!best || d < best.d) best = { w, idx: i, d };
        }
      }
      if (!best) continue;

      const { w, idx } = best;
      const attacker: Owner = proj.isFromPlayer ? 'player' : 'npc';
      const immortal = idx === 0 || idx === w.segs.length - 1;
      this.api.spawnHitFlash(proj.x, proj.y, immortal ? QC.hot : QC.blood);
      proj.destroy();
      if (immortal) {
        Sfx.playAt('ice-shatter', w.segs[idx].x, { rate: 1.6, volume: 0.3 });
        continue;
      }

      const seg = w.segs[idx];
      seg.hp -= Math.max(1, proj.damage);
      if (seg.hp > 0) {
        Sfx.playAt('slime-splat', seg.x, { rate: 1.35, volume: 0.4 });
        continue;
      }
      this.splitWorm(w, idx, attacker);
    }
  }

  /**
   * A bead spent: the body comes apart where it broke and both halves live on. The back half is
   * reversed so its old tail becomes its new mouth, which is why a cut parasite immediately
   * turns around and comes back at whoever cut it.
   *
   * Nothing caps how often this can happen. Every cut spends the bead it happened at and both
   * new ends become immortal, so the population is bounded by the eight cuttable beads the worm
   * started with — nine parasites at the very most, out of one press.
   */
  private splitWorm(w: Worm, idx: number, attacker: Owner): void {
    const at = this.worms.indexOf(w);
    if (at < 0) return;
    const cut = w.segs[idx];
    this.worms.splice(at, 1);

    this.bursts.push({
      x: cut.x, y: cut.y, ang: w.ang, bornAt: this.now,
      seed: Math.random() * 999, kind: 'cut', tint: QC.hot, r: 0,
    });
    Sfx.playAt('slime-splat', cut.x, { rate: 0.7, volume: 0.9 });

    const front = w.segs.slice(0, idx);
    const back = w.segs.slice(idx + 1).reverse();
    const spread = 0.85 + Math.random() * 0.6;

    const push = (segs: Seg[], ang: number): void => {
      if (segs.length < WORM_MIN_SEGS) return;
      this.worms.push({
        owner: w.owner, segs, ang, diesAt: w.diesAt,
        gate: new Map<Fighter, number>(), seed: Math.random() * 999,
      });
    };
    push(front, w.ang + spread);
    push(back, w.ang + Math.PI - spread);

    this.api.showFloatingText(cut.x, cut.y - 26, '⚛️ SPLIT!',
      attacker === 'player' ? this.hex(QC.core) : this.hex(QC.blood));
  }

  /** Two mouths meeting shove each other apart rather than passing through. */
  private bounceWorms(): void {
    for (let a = 0; a < this.worms.length; a++) {
      for (let b = a + 1; b < this.worms.length; b++) {
        const ha = this.worms[a].segs[0];
        const hb = this.worms[b].segs[0];
        if (!ha || !hb) continue;
        const d = Phaser.Math.Distance.Between(ha.x, ha.y, hb.x, hb.y);
        if (d > ha.r + hb.r) continue;
        const away = Math.atan2(ha.y - hb.y, ha.x - hb.x);
        this.worms[a].ang = away;
        this.worms[b].ang = away + Math.PI;
        ha.x += Math.cos(away) * 6; ha.y += Math.sin(away) * 6;
        hb.x -= Math.cos(away) * 6; hb.y -= Math.sin(away) * 6;
      }
    }
  }

  // ── Ability Split feedback ─────────────────────────────────────────────────

  /**
   * Claims a fighter for this kit, once each. Two things happen here: the Click is marked exempt
   * so a held mouse button cannot eat an armed Ability Split, and the spend callback is
   * installed — `Fighter` spends the split at the stamp, which is the only place that knows
   * *which* ability got it, so this is how the kit finds out in time to draw it.
   *
   * Called from `updateRings` as well as `doAbilitySplit` because the exemption has to be in
   * place from the moment the form is worn, and `reset()` runs before the fighters even exist.
   */
  private wire(f: Fighter): void {
    if (this.wired.has(f)) return;
    this.wired.add(f);
    f.splitExemptAbilities.add('quantum-splicers');
    f.onCooldownSplitSpent = () => {
      if (!this.alive(f)) return;
      this.bloom(f.x, f.y, QC.ghost, 52);
      this.api.showFloatingText(f.x, f.y - 60, '⚛️ Halved!', this.hex(QC.ghost));
      Sfx.playAt('teleport', f.x, { rate: 2.1, volume: 0.45 });
    };
  }

  // ── Cross-cutting ──────────────────────────────────────────────────────────

  /**
   * Ruin's Spikes of Ruin. The parasites are summons and go; the blades are not — they are the
   * caster's own body while the form is worn, and the seam is a field rather than a structure.
   */
  purgeSummons(
    x: number, y: number, radius: number, exceptOwner: Owner,
    report?: (px: number, py: number) => void,
  ): number {
    let killed = 0;
    for (let i = this.worms.length - 1; i >= 0; i--) {
      const w = this.worms[i];
      if (w.owner === exceptOwner) continue;
      const h = w.segs[0];
      if (!h || Phaser.Math.Distance.Between(x, y, h.x, h.y) > radius) continue;
      report?.(h.x, h.y);
      this.bloom(h.x, h.y, QC.ghost, 46);
      this.worms.splice(i, 1);
      killed++;
    }
    return killed;
  }

  // ── HUD ────────────────────────────────────────────────────────────────────

  private pushStatuses(): void {
    const p = this.api.player;
    const time = this.now;

    const ring = this.rings.player;
    this.api.setStatusIndicator('quantum-splicers', ring ? {
      name: 'Atom Splicers',
      emoji: '🗡️',
      color: QC.core,
      description: `${SPLICER_COUNT} blades orbiting you, ${SPLICER_DAMAGE} damage a cut. Hold Click to drive them out wide and fast.`,
      count: SPLICER_COUNT,
      priority: 150,
    } : null);

    this.api.setStatusIndicator('quantum-ability-split', p && p.nextCastCooldownMult !== 1 ? {
      name: 'Ability Split',
      emoji: '⚛️',
      color: QC.ghost,
      description: 'Your next ability comes back in half the time — whichever half of the bond you are wearing when you use it.',
      priority: 118,
    } : null);

    const mySplit = this.splits.find((s) => s.owner === 'player');
    this.api.setStatusIndicator('quantum-arena-split', mySplit ? {
      name: 'Arena Split',
      emoji: '🧱',
      color: QC.core,
      description: 'The room is cut in half. They cannot cross the seam and no shot from either side can either — but you can walk straight through it.',
      until: mySplit.until,
      priority: 119,
    } : null);

    this.api.setStatusIndicator('quantum-effect-split', p && time < p.effectSplitUntil ? {
      name: 'Effect Split',
      emoji: '🌗',
      color: QC.hot,
      description: 'Everything on you is running at half strength for two and a half times as long. Buffs and debuffs both.',
      until: p.effectSplitUntil,
      priority: 117,
    } : null);

    const mine = this.worms.filter((w) => w.owner === 'player');
    const beads = mine.reduce((n, w) => n + w.segs.length, 0);
    this.api.setStatusIndicator('quantum-parasite', mine.length > 0 ? {
      name: 'Quantum Parasite',
      emoji: '🪱',
      color: QC.core,
      description: `${mine.length} parasite${mine.length === 1 ? '' : 's'} loose, ${beads} segments between them. Cut a middle segment — yours or theirs — and it becomes two.`,
      count: mine.length,
      priority: 116,
    } : null);
  }

  // ── Draw ───────────────────────────────────────────────────────────────────

  private draw(): void {
    const t = this.vizT;
    const time = this.now;

    // ── Body layer ──
    const bg = this.bodyGfx;
    if (bg) {
      bg.clear();
      for (const owner of ['player', 'npc'] as Owner[]) {
        const f = this.fighter(owner);
        if (!this.isCore(owner) || !this.alive(f)) continue;
        coreAura(bg, f.x, f.y, this.radiusOf(f), t, owner === 'player' ? 0 : 2.4);
      }
    }

    // ── Wall layer ──
    const wg = this.wallGfx;
    if (wg) {
      wg.clear();
      for (const s of this.splits) {
        const left = s.until - time;
        const fade = Phaser.Math.Clamp(left / 600, 0, 1);
        splitWall(wg, s.x, this.top, this.bottom, SPLIT_HALF_W, t, fade, s.seed);
      }
    }

    // ── Air layer ──
    const ag = this.airGfx;
    if (!ag) return;
    ag.clear();

    // Parasites first, so a blade sweeping over one is legible on top of it.
    for (const w of this.worms) parasiteBody(ag, w.segs, w.ang, t, 1, w.seed);

    // Blade rings.
    for (const owner of ['player', 'npc'] as Owner[]) {
      const ring = this.rings[owner];
      const f = this.fighter(owner);
      if (!ring || !this.alive(f)) continue;
      const spinK = Phaser.Math.Clamp(
        (ring.spin - SPLICER_IDLE_SPIN) / (SPLICER_WIDE_SPIN - SPLICER_IDLE_SPIN), 0, 1,
      );
      orbitShell(ag, f.x, f.y, ring.r, t, 0.6 + spinK * 0.4);
      for (let i = 0; i < SPLICER_COUNT; i++) {
        const a = ring.ang + (i * Math.PI * 2) / SPLICER_COUNT;
        splicerBlade(ag,
          f.x + Math.cos(a) * ring.r, f.y + Math.sin(a) * ring.r,
          a, SPLICER_LEN, spinK, t, 1, i * 1.7);
      }
    }

    // Bursts, newest last.
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const b = this.bursts[i];
      const life = b.kind === 'cut' ? CUT_FLASH_MS : BLOOM_MS;
      const k = (time - b.bornAt) / life;
      if (k >= 1) { this.bursts.splice(i, 1); continue; }
      if (b.kind === 'cut') cutFlash(ag, b.x, b.y, b.ang, k, b.seed);
      else stateBloom(ag, b.x, b.y, k, b.tint, b.r);
    }
  }
}
