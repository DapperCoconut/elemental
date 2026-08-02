import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { GimmickSpec, WorldGimmick, getWorldGimmick } from '../../data/WorldGimmicks';

/**
 * Runs a campaign world's standing arena rule — see WorldGimmicks.ts for the
 * per-world table. One kit, twelve archetypes, all state and drawing owned
 * here. The rule applies to both fighters; the NPC gets no exemption and no
 * favours.
 *
 * Movement-style effects (slick, pulse, bouncy) are positional nudges, never
 * velocity writes — ArenaScene rebuilds both fighters' velocity every frame,
 * and this kit's update runs after movement, so a nudge is the only thing that
 * survives to the draw.
 */

export interface GimmickArenaApi {
  get scene(): Phaser.Scene;
  get player(): Fighter;
  get npc(): Fighter;
  get width(): number;
  get height(): number;
  showFloatingText(x: number, y: number, text: string, color: string): void;
}

interface Vent { x: number; y: number; nextAt: number; firesAt: number }
interface FallZone { x: number; y: number; firesAt: number }
interface Spark { x: number; y: number; vx: number; vy: number; dieAt: number }

const FIELD_TOP = 96;

export class GimmickKit {
  private gimmick: WorldGimmick | null = null;
  private g: Phaser.GameObjects.Graphics | null = null;
  private fogG: Phaser.GameObjects.Graphics | null = null;
  private startedAt = 0;

  private vents: Vent[] = [];
  private falls: FallZone[] = [];
  private nextFallAt = 0;
  private sparks: Spark[] = [];
  private nextSparkAt = 0;
  private patches: { x: number; y: number; r: number }[] = [];
  private springs: { x: number; y: number; r: number }[] = [];
  private healAccum = { player: 0, npc: 0 };
  private pulseUntil = 0;
  private nextPulseAt = 0;
  private nextBeatAt = 0;
  private hillX = 0;
  private hillY = 0;
  private hillMovedAt = 0;
  private hillTickAt = 0;
  private still = {
    player: { x: 0, y: 0, since: 0, lastTickAt: 0 },
    npc: { x: 0, y: 0, since: 0, lastTickAt: 0 },
  };

  constructor(private api: GimmickArenaApi) {}

  /** Active gimmick's display name, or null — read by briefing/HUD callers. */
  get name(): string | null { return this.gimmick?.name ?? null; }

  reset(worldId: string | null): void {
    this.clear();
    this.gimmick = worldId ? (getWorldGimmick(worldId) ?? null) : null;
    if (!this.gimmick) return;

    const scene = this.api.scene;
    const now = scene.time.now;
    const W = this.api.width;
    const H = this.api.height;
    this.startedAt = now;
    this.g = scene.add.graphics().setDepth(2);
    const spec = this.gimmick.spec;

    // Fixed placements are seeded off the world so a world's floor is *its*
    // floor — learnable across attempts, different from its neighbours'.
    const rnd = new Phaser.Math.RandomDataGenerator([`gimmick-${worldId}`]);
    const spot = (): { x: number; y: number } => ({
      x: rnd.integerInRange(120, W - 120),
      y: rnd.integerInRange(FIELD_TOP + 60, H - 90),
    });

    if (spec.arch === 'vents') {
      this.vents = Array.from({ length: spec.count }, (_, i) => ({
        ...spot(), nextAt: now + 2600 + i * (spec.intervalMs / spec.count), firesAt: 0,
      }));
    }
    if (spec.arch === 'rockfall') this.nextFallAt = now + 2600;
    if (spec.arch === 'sparks') this.nextSparkAt = now + 3000;
    if (spec.arch === 'slick') {
      this.patches = Array.from({ length: spec.count }, () => ({ ...spot(), r: rnd.integerInRange(46, 66) }));
    }
    if (spec.arch === 'springs') {
      this.springs = Array.from({ length: spec.count }, () => ({ ...spot(), r: rnd.integerInRange(40, 52) }));
    }
    if (spec.arch === 'pulse') this.nextPulseAt = now + spec.intervalMs;
    if (spec.arch === 'metronome') this.nextBeatAt = now + spec.intervalMs;
    if (spec.arch === 'hill') {
      const p = spot();
      this.hillX = p.x;
      this.hillY = p.y;
      this.hillMovedAt = now;
    }
    if (spec.arch === 'fog') {
      this.fogG = scene.add.graphics().setDepth(18);
    }
    if (spec.arch === 'decay') {
      this.still.player = { x: 0, y: 0, since: now, lastTickAt: 0 };
      this.still.npc = { x: 0, y: 0, since: now, lastTickAt: 0 };
    }

    // Announce the house rule.
    scene.time.delayedCall(600, () => {
      if (!this.gimmick) return;
      this.api.showFloatingText(W / 2, 150, `⚖ ${this.gimmick.name.toUpperCase()}`, '#d8d2e8');
    });
  }

  update(time: number, delta: number): void {
    const gm = this.gimmick;
    if (!gm || !this.g) return;
    const dt = delta / 1000;
    const spec = gm.spec;
    this.g.clear();

    switch (spec.arch) {
      case 'vents': this.updateVents(time, spec); break;
      case 'sweep': this.updateSweep(time, spec); break;
      case 'rockfall': this.updateRockfall(time, spec); break;
      case 'slick': this.updateSlick(dt, spec); break;
      case 'springs': this.updateSprings(time, dt, spec); break;
      case 'pulse': this.updatePulse(time, dt, spec); break;
      case 'metronome': this.updateMetronome(time, spec); break;
      case 'sparks': this.updateSparks(time, dt, spec); break;
      case 'fog': this.updateFog(time, spec); break;
      case 'hill': this.updateHill(time, spec); break;
      case 'decay': this.updateDecay(time, spec); break;
      case 'bouncy': this.updateBouncy(dt, spec); break;
    }
  }

  private fighters(): Fighter[] {
    const out: Fighter[] = [];
    const p = this.api.player;
    const n = this.api.npc;
    if (p.active && p.hp > 0) out.push(p);
    if (n.active && n.hp > 0) out.push(n);
    return out;
  }

  /** Positional nudge that respects the arena bounds. */
  private nudge(f: Fighter, dx: number, dy: number): void {
    f.x = Phaser.Math.Clamp(f.x + dx, 44, this.api.width - 44);
    f.y = Phaser.Math.Clamp(f.y + dy, FIELD_TOP, this.api.height - 44);
  }

  // ── Archetypes ─────────────────────────────────────────────────────

  private updateVents(time: number, s: Extract<GimmickSpec, { arch: 'vents' }>): void {
    const g = this.g!;
    for (const v of this.vents) {
      // Idle plate.
      g.lineStyle(1.5, s.color, 0.3);
      g.strokeCircle(v.x, v.y, s.radius * 0.55);
      if (v.firesAt === 0 && time >= v.nextAt) {
        v.firesAt = time + 1250;
      }
      if (v.firesAt > 0) {
        const charge = Phaser.Math.Clamp(1 - (v.firesAt - time) / 1250, 0, 1);
        g.lineStyle(2, s.color, 0.3 + charge * 0.6);
        g.strokeCircle(v.x, v.y, s.radius);
        g.fillStyle(s.color, 0.1 + charge * 0.25);
        g.fillCircle(v.x, v.y, s.radius * charge);
        if (time >= v.firesAt) {
          v.firesAt = 0;
          v.nextAt = time + s.intervalMs + Phaser.Math.Between(-800, 800);
          const ring = this.api.scene.add.circle(v.x, v.y, s.radius, s.color, 0.5).setDepth(8).setScale(0.3);
          this.api.scene.tweens.add({ targets: ring, scaleX: 1, scaleY: 1, alpha: 0, duration: 320, onComplete: () => ring.destroy() });
          for (const f of this.fighters()) {
            if (Phaser.Math.Distance.Between(v.x, v.y, f.x, f.y) <= s.radius) f.takeDamage(s.damage);
          }
        }
      }
    }
  }

  private updateSweep(time: number, s: Extract<GimmickSpec, { arch: 'sweep' }>): void {
    const W = this.api.width;
    const H = this.api.height;
    const cycle = (time - this.startedAt) % s.intervalMs;
    const travelMs = 2600;
    const warnMs = 1400;
    const g = this.g!;
    if (cycle < warnMs) {
      // The tide announces its edge.
      const fromLeft = Math.floor((time - this.startedAt) / s.intervalMs) % 2 === 0;
      const x = fromLeft ? 30 : W - 30;
      g.lineStyle(3, s.color, 0.25 + (cycle / warnMs) * 0.5);
      g.lineBetween(x, FIELD_TOP, x, H - 30);
    } else if (cycle < warnMs + travelMs) {
      const t = (cycle - warnMs) / travelMs;
      const fromLeft = Math.floor((time - this.startedAt) / s.intervalMs) % 2 === 0;
      const x = fromLeft ? 30 + (W - 60) * t : W - 30 - (W - 60) * t;
      g.fillStyle(s.color, 0.3);
      g.fillRect(x - s.halfW, FIELD_TOP, s.halfW * 2, H - FIELD_TOP - 30);
      g.lineStyle(2, s.color, 0.8);
      g.lineBetween(x, FIELD_TOP, x, H - 30);
      for (const f of this.fighters()) {
        if (Math.abs(f.x - x) < s.halfW) {
          // One shove + one hit per crossing, gated by a short immunity window.
          const key = f === this.api.player ? 'player' : 'npc';
          const st = this.still[key]; // reuse the timestamp slot as a rehit gate
          if (time - st.lastTickAt > 1200) {
            st.lastTickAt = time;
            f.takeDamage(s.damage);
            this.nudge(f, (fromLeft ? 1 : -1) * 34, 0);
          }
        }
      }
    }
  }

  private updateRockfall(time: number, s: Extract<GimmickSpec, { arch: 'rockfall' }>): void {
    const g = this.g!;
    if (time >= this.nextFallAt) {
      this.nextFallAt = time + s.intervalMs + Phaser.Math.Between(-600, 600);
      // Bias drops toward the fighters so the rule stays present without
      // carpet-bombing the whole floor.
      const target = Math.random() < 0.6 ? this.fighters()[Math.floor(Math.random() * this.fighters().length)] : null;
      const x = target ? target.x + Phaser.Math.Between(-90, 90) : Phaser.Math.Between(100, this.api.width - 100);
      const y = target ? target.y + Phaser.Math.Between(-70, 70) : Phaser.Math.Between(FIELD_TOP + 40, this.api.height - 80);
      this.falls.push({
        x: Phaser.Math.Clamp(x, 60, this.api.width - 60),
        y: Phaser.Math.Clamp(y, FIELD_TOP + 20, this.api.height - 60),
        firesAt: time + 1350,
      });
    }
    for (const fz of this.falls) {
      const charge = Phaser.Math.Clamp(1 - (fz.firesAt - time) / 1350, 0, 1);
      g.lineStyle(2, s.color, 0.3 + charge * 0.55);
      g.strokeCircle(fz.x, fz.y, s.radius);
      g.fillStyle(s.color, 0.9);
      g.fillCircle(fz.x, fz.y - (1 - charge) * 150 - 8, 4);
      if (time >= fz.firesAt) {
        const ring = this.api.scene.add.circle(fz.x, fz.y, s.radius, s.color, 0.5).setDepth(8).setScale(0.3);
        this.api.scene.tweens.add({ targets: ring, scaleX: 1, scaleY: 1, alpha: 0, duration: 300, onComplete: () => ring.destroy() });
        for (const f of this.fighters()) {
          if (Phaser.Math.Distance.Between(fz.x, fz.y, f.x, f.y) <= s.radius) f.takeDamage(s.damage);
        }
      }
    }
    this.falls = this.falls.filter((fz) => time < fz.firesAt);
  }

  private updateSlick(dt: number, s: Extract<GimmickSpec, { arch: 'slick' }>): void {
    const g = this.g!;
    for (const p of this.patches) {
      g.fillStyle(s.color, 0.3);
      g.fillEllipse(p.x, p.y, p.r * 2, p.r * 1.5);
      g.lineStyle(1, 0xffffff, 0.1);
      g.strokeEllipse(p.x, p.y, p.r * 1.6, p.r * 1.1);
    }
    for (const f of this.fighters()) {
      const on = this.patches.some((p) => Phaser.Math.Distance.Between(p.x, p.y, f.x, f.y) < p.r);
      if (!on) continue;
      const body = f.body as Phaser.Physics.Arcade.Body | null;
      const vx = body?.velocity.x ?? 0;
      const vy = body?.velocity.y ?? 0;
      const v = Math.hypot(vx, vy);
      if (v > 20) this.nudge(f, (vx / v) * s.push * dt, (vy / v) * s.push * dt);
    }
  }

  private updateSprings(time: number, dt: number, s: Extract<GimmickSpec, { arch: 'springs' }>): void {
    const g = this.g!;
    for (const sp of this.springs) {
      const pulse = 1 + Math.sin(time / 400) * 0.06;
      g.lineStyle(1.5, s.color, 0.5);
      g.strokeCircle(sp.x, sp.y, sp.r * pulse);
      g.fillStyle(s.color, 0.12);
      g.fillCircle(sp.x, sp.y, sp.r);
    }
    for (const f of this.fighters()) {
      const on = this.springs.some((sp) => Phaser.Math.Distance.Between(sp.x, sp.y, f.x, f.y) < sp.r);
      if (!on) continue;
      const key = f === this.api.player ? 'player' : 'npc';
      this.healAccum[key] += s.healPerSec * dt;
      if (this.healAccum[key] >= 1) {
        const whole = Math.floor(this.healAccum[key]);
        this.healAccum[key] -= whole;
        f.heal(whole);
      }
    }
  }

  private updatePulse(time: number, dt: number, s: Extract<GimmickSpec, { arch: 'pulse' }>): void {
    const W = this.api.width;
    const H = this.api.height;
    const cx = W / 2;
    const cy = (H + FIELD_TOP) / 2;
    const g = this.g!;
    if (time >= this.nextPulseAt) {
      this.nextPulseAt = time + s.intervalMs;
      this.pulseUntil = time + s.durationMs;
    }
    // Warning ring breathes ahead of the pulse.
    const untilNext = this.nextPulseAt - time;
    if (untilNext < 1400 && time > this.pulseUntil) {
      g.lineStyle(2, s.color, 0.5 * (1 - untilNext / 1400));
      g.strokeCircle(cx, cy, 60 + untilNext / 8);
    }
    if (time < this.pulseUntil) {
      for (let i = 0; i < 3; i++) {
        const ph = ((time * (s.inward ? -1 : 1)) / 500 + i / 3) % 1;
        const r = 40 + Math.abs(ph) * 220;
        g.lineStyle(1.5, s.color, 0.35 * (1 - Math.abs(ph)));
        g.strokeCircle(cx, cy, r);
      }
      for (const f of this.fighters()) {
        const dx = cx - f.x;
        const dy = cy - f.y;
        const d = Math.hypot(dx, dy);
        if (d < 26) continue;
        const dir = s.inward ? 1 : -1;
        this.nudge(f, (dx / d) * s.strength * dt * dir, (dy / d) * s.strength * dt * dir);
      }
    }
  }

  private updateMetronome(time: number, s: Extract<GimmickSpec, { arch: 'metronome' }>): void {
    const g = this.g!;
    const untilBeat = this.nextBeatAt - time;
    // The pendulum tell: a diamond swinging toward the beat.
    const W = this.api.width;
    const t = 1 - Phaser.Math.Clamp(untilBeat / s.intervalMs, 0, 1);
    const x = W / 2 + Math.sin(t * Math.PI * 2) * 40;
    g.fillStyle(s.color, 0.5);
    g.fillTriangle(x - 5, 78, x + 5, 78, x, 88);
    if (time >= this.nextBeatAt) {
      this.nextBeatAt = time + s.intervalMs;
      for (const f of this.fighters()) f.reduceCooldowns(s.cooldownMs);
      this.api.showFloatingText(W / 2, 96, '♪ BEAT', `#${s.color.toString(16).padStart(6, '0')}`);
    }
  }

  private updateSparks(time: number, dt: number, s: Extract<GimmickSpec, { arch: 'sparks' }>): void {
    const W = this.api.width;
    const H = this.api.height;
    const g = this.g!;
    if (time >= this.nextSparkAt) {
      this.nextSparkAt = time + s.intervalMs + Phaser.Math.Between(-500, 500);
      const edge = Math.floor(Math.random() * 4);
      const x = edge === 0 ? 36 : edge === 1 ? W - 36 : Phaser.Math.Between(60, W - 60);
      const y = edge === 2 ? FIELD_TOP : edge === 3 ? H - 36 : Phaser.Math.Between(FIELD_TOP + 20, H - 60);
      // Aimed loosely across the arena, not at anyone in particular.
      const a = Math.atan2((H + FIELD_TOP) / 2 - y, W / 2 - x) + Phaser.Math.FloatBetween(-0.6, 0.6);
      this.sparks.push({ x, y, vx: Math.cos(a) * s.speed, vy: Math.sin(a) * s.speed, dieAt: time + 4000 });
    }
    for (const sp of this.sparks) {
      sp.x += sp.vx * dt;
      sp.y += sp.vy * dt;
      g.fillStyle(s.color, 0.35);
      g.fillCircle(sp.x, sp.y, 6);
      g.fillStyle(s.color, 0.95);
      g.fillCircle(sp.x, sp.y, 3);
      for (const f of this.fighters()) {
        if (Phaser.Math.Distance.Between(sp.x, sp.y, f.x, f.y) < 22) {
          f.takeDamage(s.damage);
          sp.dieAt = 0;
        }
      }
    }
    this.sparks = this.sparks.filter((sp) =>
      this.api.scene.time.now < sp.dieAt && sp.x > -40 && sp.x < W + 40 && sp.y > -40 && sp.y < H + 40);
  }

  private updateFog(time: number, s: Extract<GimmickSpec, { arch: 'fog' }>): void {
    if (!this.fogG) return;
    const phase = (Math.sin(((time - this.startedAt) / s.periodMs) * Math.PI * 2) + 1) / 2;
    const alpha = s.minAlpha + (s.maxAlpha - s.minAlpha) * phase;
    this.fogG.clear();
    this.fogG.fillStyle(s.color, alpha);
    this.fogG.fillRect(0, 0, this.api.width, this.api.height);
    // A clear ring around the player keeps the fight readable at peak dark.
    const p = this.api.player;
    if (p.active && alpha > 0.25) {
      this.fogG.fillStyle(0xffffff, 0);
      this.fogG.lineStyle(1.5, 0xffffff, (alpha - 0.25) * 0.4);
      this.fogG.strokeCircle(p.x, p.y, 90);
    }
  }

  private updateHill(time: number, s: Extract<GimmickSpec, { arch: 'hill' }>): void {
    const g = this.g!;
    if (time - this.hillMovedAt >= s.moveEveryMs) {
      this.hillMovedAt = time;
      this.hillX = Phaser.Math.Between(140, this.api.width - 140);
      this.hillY = Phaser.Math.Between(FIELD_TOP + 70, this.api.height - 100);
      this.api.showFloatingText(this.hillX, this.hillY, '⚑ MOVED', '#d8d2e8');
    }
    const pulse = 1 + Math.sin(time / 350) * 0.04;
    g.lineStyle(2, s.color, 0.6);
    g.strokeCircle(this.hillX, this.hillY, s.radius * pulse);
    g.fillStyle(s.color, 0.1);
    g.fillCircle(this.hillX, this.hillY, s.radius);
    g.lineStyle(1, s.color, 0.3);
    g.strokeCircle(this.hillX, this.hillY, s.radius * 0.6);

    if (time - this.hillTickAt >= 1000) {
      this.hillTickAt = time;
      for (const f of this.fighters()) {
        if (Phaser.Math.Distance.Between(this.hillX, this.hillY, f.x, f.y) < s.radius) {
          f.heal(2);
          f.reduceCooldowns(350);
        }
      }
    }
  }

  private updateDecay(time: number, s: Extract<GimmickSpec, { arch: 'decay' }>): void {
    const g = this.g!;
    for (const f of this.fighters()) {
      const key = f === this.api.player ? 'player' : 'npc';
      const st = this.still[key];
      if (Phaser.Math.Distance.Between(st.x, st.y, f.x, f.y) > 34) {
        st.x = f.x;
        st.y = f.y;
        st.since = time;
        continue;
      }
      const held = time - st.since;
      if (held > s.stillMs * 0.55) {
        // The warning circle closes in as the toll approaches.
        const t = Phaser.Math.Clamp((held - s.stillMs * 0.55) / (s.stillMs * 0.45), 0, 1);
        g.lineStyle(1.5, s.color, 0.25 + t * 0.5);
        g.strokeCircle(f.x, f.y, 46 - t * 16);
      }
      if (held >= s.stillMs && time - st.lastTickAt >= s.tickMs) {
        st.lastTickAt = time;
        f.takeDamage(s.damage);
        this.api.showFloatingText(f.x, f.y - 36, '⌛', `#${s.color.toString(16).padStart(6, '0')}`);
      }
    }
  }

  private updateBouncy(dt: number, s: Extract<GimmickSpec, { arch: 'bouncy' }>): void {
    const W = this.api.width;
    const H = this.api.height;
    const margin = 64;
    const g = this.g!;
    g.lineStyle(3, s.color, 0.35);
    g.strokeRect(margin - 12, FIELD_TOP + margin - 60, W - (margin - 12) * 2, H - FIELD_TOP - margin * 2 + 60);
    for (const f of this.fighters()) {
      let dx = 0;
      let dy = 0;
      if (f.x < margin) dx = 1;
      if (f.x > W - margin) dx = -1;
      if (f.y < FIELD_TOP + margin - 40) dy = 1;
      if (f.y > H - margin) dy = -1;
      if (dx !== 0 || dy !== 0) this.nudge(f, dx * s.push * dt, dy * s.push * dt);
    }
  }

  // ── Teardown ───────────────────────────────────────────────────────

  private clear(): void {
    this.g?.destroy();
    this.g = null;
    this.fogG?.destroy();
    this.fogG = null;
    this.vents = [];
    this.falls = [];
    this.sparks = [];
    this.patches = [];
    this.springs = [];
    this.healAccum = { player: 0, npc: 0 };
    this.pulseUntil = 0;
    this.still.player = { x: 0, y: 0, since: 0, lastTickAt: 0 };
    this.still.npc = { x: 0, y: 0, since: 0, lastTickAt: 0 };
  }
}
