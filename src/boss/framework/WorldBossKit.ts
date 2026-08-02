import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { Sfx } from '../../audio';
import {
  BossBodyState, BossResumeState, HarassId, LibTuning, LibMoveId, MoveRef,
  SignatureMove, WorldBossDef, WorldBossPhase, hardKnobs,
} from './BossDefs';
import { BossPalette, BossToolkit, BossToolkitHost } from './BossToolkit';
import { HARASS_MOVES, LIB_MOVES } from './AttackLibrary';

/**
 * The engine every world Sovereign fights through.
 *
 * Modelled on DisgracedKingKit and using its load-bearing decision: the boss's
 * damageable body IS ArenaScene's npc, so all ~40 element kits hit it with no
 * per-kit work. What the King hand-rolls — the telegraphed move cycle with rest
 * beats, the independent harassment clock, the phase machine with a wreck
 * interlude and rotting heal orbs, the boss bar — lives here once, driven by a
 * WorldBossDef. The def brings numbers, lines, a palette, a drawn body and its
 * signature moves; this class brings the fight.
 */

export interface WorldBossArenaApi {
  get scene(): Phaser.Scene;
  get player(): Fighter;
  /** The boss body — the npc slot, taken over for the duration. */
  get npc(): Fighter;
  get width(): number;
  get height(): number;
  addEnemy(f: Fighter): void;
  removeEnemy(f: Fighter): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  spawnHitFlash(x: number, y: number, color: number): void;
  bossVictory(): void;
}

const INTRO_MS = 2600;
const INTERLUDE_MS = 2800;
const HARASS_GRACE_MS = 3600;
const HEAL_ORB_COUNT = 3;
const HEAL_ORB_AMOUNT = 15;
const ENRAGE_REST_FRAC = 0.55;
const BANTER_MIN_MS = 16000;
const BANTER_SPAN_MS = 9000;

type FlowPhase = 'intro' | 'fight' | 'interlude' | 'done';

const hex = (n: number): string => `#${n.toString(16).padStart(6, '0')}`;

export class WorldBossKit {
  private def!: WorldBossDef;
  private hard = false;

  private flow: FlowPhase = 'intro';
  private phaseIdx = 0;
  private phases: WorldBossPhase[] = [];

  // Choreographer
  private cycleIdx = 0;
  private busyUntil = 0;
  private nextMoveAt = 0;
  private harassIdx = 0;
  private harassNextAt = 0;
  private interludeEndsAt = 0;
  private nextBanterAt = 0;
  private banterIdx = 0;
  private enrageAnnounced = false;
  private hurtFlashUntil = 0;

  // Body
  private bx = 0;
  private by = 0;
  private strafeDir = 1;
  private nextStrafeFlipAt = 0;

  private tk: BossToolkit | null = null;
  private signatures = new Map<string, SignatureMove>();

  // Layers
  private arenaG: Phaser.GameObjects.Graphics | null = null;
  private groundG: Phaser.GameObjects.Graphics | null = null;
  private bodyG: Phaser.GameObjects.Graphics | null = null;
  private projG: Phaser.GameObjects.Graphics | null = null;
  private barG: Phaser.GameObjects.Graphics | null = null;
  private barLabel: Phaser.GameObjects.Text | null = null;

  constructor(private arena: WorldBossArenaApi) {}

  // ── Lifecycle ──────────────────────────────────────────────────────

  /**
   * @param resume Pledge fights: the body a fallen element left behind. The Sovereign
   *   picks up on that phase with that much HP rather than standing back up whole.
   */
  reset(def: WorldBossDef, hard: boolean, resume?: BossResumeState | null): void {
    this.clearWorld();
    const scene = this.arena.scene;
    const W = this.arena.width;
    const H = this.arena.height;
    const now = scene.time.now;

    this.def = def;
    this.hard = hard;
    this.phases = [...def.phases];
    if (hard && def.hard?.extraPhase) this.phases.push(def.hard.extraPhase);

    this.flow = 'intro';
    this.phaseIdx = resume
      ? Phaser.Math.Clamp(resume.phaseIdx, 0, this.phases.length - 1)
      : 0;
    this.cycleIdx = 0;
    this.harassIdx = 0;
    this.banterIdx = 0;
    this.busyUntil = 0;
    this.nextMoveAt = now + INTRO_MS;
    this.harassNextAt = now + INTRO_MS + HARASS_GRACE_MS;
    this.nextBanterAt = now + INTRO_MS + BANTER_MIN_MS;
    this.enrageAnnounced = false;
    this.hurtFlashUntil = 0;
    this.interludeEndsAt = 0;
    this.bx = W / 2;
    this.by = H * 0.32;
    this.strafeDir = Math.random() < 0.5 ? 1 : -1;
    this.nextStrafeFlipAt = now + 4000;

    const palette: BossPalette = {
      main: def.color, lit: def.colorLit, dark: def.colorDark, accent: def.accent,
    };
    const kit = this;
    const host: BossToolkitHost = {
      scene,
      get W() { return kit.arena.width; },
      get H() { return kit.arena.height; },
      player: () => this.arena.player,
      bossX: () => this.bx,
      bossY: () => this.by,
      setBossPos: (x, y) => { this.bx = x; this.by = y; },
      stopped: () => this.flow === 'done',
      addEnemy: (f) => this.arena.addEnemy(f),
      removeEnemy: (f) => this.arena.removeEnemy(f),
      healBoss: (amount) => {
        const npc = this.arena.npc;
        if (!npc.active || npc.hp <= 0) return;
        npc.hp = Math.min(npc.maxHp, npc.hp + amount);
        npc.emit('damaged', 0);
      },
      spawnHitFlash: (x, y, c) => this.arena.spawnHitFlash(x, y, c),
      showFloatingText: (x, y, t, c) => this.arena.showFloatingText(x, y, t, c),
    };
    this.tk = new BossToolkit(host, palette, hard);
    this.tk.damageScale = (def.damageMult ?? 1) * (hard ? hardKnobs(def).damageMult : 1);

    // Signatures are born once per fight, with the toolkit they act through.
    this.signatures.clear();
    for (const [id, factory] of Object.entries(def.signatures)) {
      this.signatures.set(id, factory(this.tk));
    }

    // ── Layers. Campaign already paints the world's backdrop at depth -100;
    // the arena dressing sits over it, telegraphs under the fighters (5),
    // the body just over them, projectiles and HUD above.
    this.arenaG = scene.add.graphics().setDepth(-50);
    if (def.drawArena) {
      def.drawArena(this.arenaG, W, H);
    } else {
      this.drawDefaultArena(this.arenaG, W, H, palette);
    }
    this.groundG = scene.add.graphics().setDepth(3);
    this.bodyG = scene.add.graphics().setDepth(6);
    this.projG = scene.add.graphics().setDepth(17);

    // ── The body: hidden outright, pinned, drawn per-frame by the def.
    const npc = this.arena.npc;
    npc.setMaxHp(this.phaseHp(this.phaseIdx));
    // A resumed body keeps its wounds — `setMaxHp` fills it, so cut it back down after.
    if (resume) npc.hp = Phaser.Math.Clamp(resume.hp, 1, npc.maxHp);
    npc.isInvincible = true; // dropped when the intro ends
    npc.setAlpha(0);
    npc.forceInvisible = true;
    npc.hideHealthBar();
    npc.setActive(true).setVisible(false);
    const body = npc.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    body.setCollideWorldBounds(false);
    body.setImmovable(true);
    body.moves = false;
    this.setBodyRadius(this.phases[this.phaseIdx].bodyR ?? def.bodyR ?? 26);
    body.reset(this.bx, this.by);

    npc.on('damaged', (amount: number) => {
      if (amount > 0) this.hurtFlashUntil = scene.time.now + 120;
    });
    npc.on('defeated', () => this.onBodyDefeated());

    // ── HUD: the boss bar owns the foot of the screen (player HP owns y=18).
    this.barG = scene.add.graphics().setDepth(25);
    this.barLabel = scene.add.text(W / 2, H - 46, '', {
      fontSize: '13px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
      color: hex(def.colorLit), stroke: '#0a0510', strokeThickness: 4, letterSpacing: 3,
    }).setOrigin(0.5).setDepth(26);

    // ── The introduction. A resumed body is mid-fight, not newly met: it gets the same
    // grace period (the intro is what keeps it invincible while the new element finds its
    // feet) but none of the ceremony, and it names the phase it is standing in.
    if (resume) {
      this.banner(`${def.name.toUpperCase()}  ·  ${this.currentPhase().name.toUpperCase()}`,
        hex(def.colorLit), 24);
      scene.time.delayedCall(1100, () => {
        if (this.flow === 'done') return;
        this.speak(def.resumeLine ?? 'Another one. Good. I was not finished.');
      });
      scene.cameras.main.shake(300, 0.003);
      return;
    }

    this.banner(`${def.name.toUpperCase()}`, hex(def.colorLit), 32);
    scene.time.delayedCall(1100, () => {
      if (this.flow === 'done') return;
      this.banner(def.title, hex(def.color), 18);
    });
    if (hard && def.hard?.introLine) {
      scene.time.delayedCall(2100, () => {
        if (this.flow === 'done') return;
        this.banner(def.hard!.introLine!, '#ffa0b2', 20);
      });
    }
    if (def.intro[0]) {
      scene.time.delayedCall(2000, () => {
        if (this.flow === 'done') return;
        this.speak(def.intro[0]);
      });
    }
    scene.cameras.main.shake(hard ? 650 : 480, hard ? 0.006 : 0.004);
  }

  /**
   * The body as it stands, for a pledge fight's next element to inherit. Null once the
   * Sovereign is down — nothing to hand on.
   */
  getResumeState(): BossResumeState | null {
    if (this.flow === 'done') return null;
    const npc = this.arena.npc;
    // Mid-interlude the current pool is spent and the next has not been dealt yet; hand on
    // the next phase at full, which is exactly where the fight would have picked up.
    if (this.flow === 'interlude') {
      const idx = Math.min(this.phaseIdx + 1, this.phases.length - 1);
      return { phaseIdx: idx, hp: this.phaseHp(idx) };
    }
    return { phaseIdx: this.phaseIdx, hp: Math.max(1, Math.round(npc.hp)) };
  }

  /**
   * Direct circle, never `applySizeMult` — that pair scales the radius twice
   * (sprite scale × body circle) and swallows the arena at boss sizes.
   */
  private setBodyRadius(r: number): void {
    const npc = this.arena.npc;
    npc.sizeMult = 1;
    npc.setScale(1);
    const body = npc.body as Phaser.Physics.Arcade.Body | null;
    body?.setCircle(r, 24 - r, 24 - r);
  }

  private phaseHp(idx: number): number {
    const base = this.phases[idx].hp;
    return Math.round(base * (this.hard ? hardKnobs(this.def).hpMult : 1));
  }

  private clearWorld(): void {
    for (const g of [this.arenaG, this.groundG, this.bodyG, this.projG, this.barG]) g?.destroy();
    this.arenaG = this.groundG = this.bodyG = this.projG = this.barG = null;
    this.barLabel?.destroy();
    this.barLabel = null;
    for (const sig of this.signatures.values()) sig.onPhaseEnd?.();
    this.signatures.clear();
    this.tk?.destroy();
    this.tk = null;
  }

  // ── Frame ──────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    if (!this.tk || this.flow === 'done') return;
    const dt = delta / 1000;

    if (this.flow === 'intro' && time >= this.nextMoveAt) {
      this.flow = 'fight';
      this.arena.npc.isInvincible = false;
      const p = this.currentPhase();
      if (p.line) this.speak(p.line);
      this.scheduleNext(time, 400);
    }

    if (this.flow === 'interlude' && time >= this.interludeEndsAt) {
      this.beginPhase(time, this.phaseIdx + 1);
    }

    if (this.flow === 'fight') {
      this.driveBody(time, dt);
      this.updateChoreography(time);
      this.updateHarass(time);
      this.updateBanter(time);
      this.updateEnrage();
    }

    this.tk.update(time, delta);
    for (const sig of this.signatures.values()) sig.update?.(time, dt);
    this.draw(time);
    this.drawBossBar();
  }

  /** Folded into ArenaScene's per-frame speed rebuild — pulled, never pushed. */
  getPlayerSpeedMult(): number {
    return this.tk?.getPlayerSpeedMult() ?? 1;
  }

  // ── Choreography ───────────────────────────────────────────────────

  private currentPhase(): WorldBossPhase { return this.phases[this.phaseIdx]; }

  private updateChoreography(time: number): void {
    if (time < this.nextMoveAt || time < this.busyUntil) return;
    const phase = this.currentPhase();
    const move = phase.cycle[this.cycleIdx % phase.cycle.length];
    this.cycleIdx++;
    this.castMove(time, move);
  }

  private castMove(time: number, move: MoveRef): void {
    if (!this.tk) return;
    if (move.startsWith('sig:')) {
      const sig = this.signatures.get(move.slice(4));
      if (!sig) { this.scheduleNext(time, 300); return; }
      sig.cast(time);
      this.scheduleNext(time, sig.durationMs);
      return;
    }
    const id = move as LibMoveId;
    const cast = LIB_MOVES[id];
    if (!cast) { this.scheduleNext(time, 300); return; }
    const duration = cast(this.tk, time, this.tuningFor(id));
    this.scheduleNext(time, duration);
  }

  private tuningFor(id: LibMoveId): LibTuning {
    return {
      ...(this.def.tuning?.[id] ?? {}),
      ...(this.hard ? this.def.hard?.tuning?.[id] ?? {} : {}),
    };
  }

  private scheduleNext(time: number, moveDurationMs: number): void {
    this.busyUntil = time + moveDurationMs;
    const phase = this.currentPhase();
    const rest = this.isEnraged()
      ? (phase.restEnragedMs ?? phase.restMs * ENRAGE_REST_FRAC)
      : phase.restMs;
    const restMult = this.hard ? hardKnobs(this.def).restMult : 1;
    this.nextMoveAt = this.busyUntil + rest * restMult;
  }

  private isEnraged(): boolean {
    const npc = this.arena.npc;
    return npc.maxHp > 0 && npc.hp / npc.maxHp <= 0.5;
  }

  private updateEnrage(): void {
    if (this.enrageAnnounced || !this.isEnraged()) return;
    this.enrageAnnounced = true;
    this.banner('IT QUICKENS', hex(this.def.accent), 16);
    this.arena.scene.cameras.main.shake(280, 0.004);
  }

  private updateHarass(time: number): void {
    if (!this.tk || time < this.harassNextAt) return;
    const phase = this.currentPhase();
    if (phase.harass.length === 0) { this.harassNextAt = time + 2000; return; }
    const move: HarassId = phase.harass[this.harassIdx % phase.harass.length];
    this.harassIdx++;
    HARASS_MOVES[move]?.(this.tk);
    const restMult = this.hard ? hardKnobs(this.def).restMult : 1;
    this.harassNextAt = time + phase.harassMs * (this.isEnraged() ? 0.68 : 1) * restMult;
  }

  private updateBanter(time: number): void {
    if (time < this.nextBanterAt || this.def.banter.length === 0) return;
    this.speak(this.def.banter[this.banterIdx % this.def.banter.length]);
    this.banterIdx++;
    this.nextBanterAt = time + BANTER_MIN_MS + Math.random() * BANTER_SPAN_MS;
  }

  // ── Body movement ──────────────────────────────────────────────────

  private driveBody(time: number, dt: number): void {
    const phase = this.currentPhase();
    const speed = phase.moveSpeed ?? 0;
    const W = this.arena.width;
    const H = this.arena.height;

    if (speed > 0) {
      const p = this.arena.player;
      if (time >= this.nextStrafeFlipAt) {
        this.strafeDir *= -1;
        this.nextStrafeFlipAt = time + 2600 + Math.random() * 3200;
      }
      const hold = phase.holdDist ?? 240;
      const away = Math.atan2(this.by - p.y, this.bx - p.x) + this.strafeDir * 0.55 * dt * 2;
      const tx = Phaser.Math.Clamp(p.x + Math.cos(away) * hold, 80, W - 80);
      const ty = Phaser.Math.Clamp(p.y + Math.sin(away) * hold, 120, H - 90);
      const dx = tx - this.bx;
      const dy = ty - this.by;
      const d = Math.hypot(dx, dy);
      if (d > 8) {
        const step = Math.min(speed * dt, d);
        this.bx += (dx / d) * step;
        this.by += (dy / d) * step;
      }
    }

    // Hover sway, and the hitbox tracks the drawn body.
    const swayX = Math.sin(time / 1100) * 5;
    const swayY = Math.sin(time / 800) * 4;
    (this.arena.npc.body as Phaser.Physics.Arcade.Body | null)?.reset(this.bx + swayX, this.by + swayY);
  }

  // ── Phase flow ─────────────────────────────────────────────────────

  private onBodyDefeated(): void {
    const time = this.arena.scene.time.now;
    if (this.flow !== 'fight') return;
    if (this.phaseIdx + 1 < this.phases.length) {
      this.beginInterlude(time);
    } else {
      this.beginVictory(time);
    }
  }

  private beginInterlude(time: number): void {
    if (!this.tk) return;
    this.flow = 'interlude';
    this.interludeEndsAt = time + INTERLUDE_MS;
    const npc = this.arena.npc;
    npc.isInvincible = true;

    this.tk.clearHazards();
    for (const sig of this.signatures.values()) sig.onPhaseEnd?.();

    const scene = this.arena.scene;
    scene.cameras.main.shake(500, 0.008);
    Sfx.playAt('explosion-large', this.bx);
    for (let i = 0; i < 5; i++) {
      scene.time.delayedCall(i * 130, () => {
        if (this.flow === 'done' || !this.tk) return;
        const a = Math.random() * Math.PI * 2;
        this.tk.boom(this.bx + Math.cos(a) * 40, this.by + Math.sin(a) * 34, 34, this.def.colorLit);
      });
    }

    // Repair cells rot — standing off to regenerate between phases is not on
    // offer, and in hard mode they are not offered at all.
    if (!(this.hard && hardKnobs(this.def).noHeals)) {
      for (let i = 0; i < HEAL_ORB_COUNT; i++) {
        const a = Math.PI * 2 * (i / HEAL_ORB_COUNT) + Math.random() * 0.6;
        this.tk.spawnHealOrb(
          this.bx + Math.cos(a) * 150, this.by + Math.sin(a) * 120, HEAL_ORB_AMOUNT,
        );
      }
    }

    const next = this.phases[this.phaseIdx + 1];
    scene.time.delayedCall(900, () => {
      if (this.flow === 'done') return;
      this.banner(next.name.toUpperCase(), hex(this.def.colorLit), 26);
      if (next.line) scene.time.delayedCall(900, () => {
        if (this.flow === 'done') return;
        this.speak(next.line!);
      });
    });
  }

  private beginPhase(time: number, idx: number): void {
    this.flow = 'fight';
    this.phaseIdx = idx;
    this.cycleIdx = 0;
    this.harassIdx = 0;
    this.enrageAnnounced = false;
    const phase = this.phases[idx];
    const npc = this.arena.npc;
    npc.setMaxHp(this.phaseHp(idx));
    npc.isInvincible = false;
    this.setBodyRadius(phase.bodyR ?? this.def.bodyR ?? 26);
    this.scheduleNext(time, 500);
    this.harassNextAt = time + HARASS_GRACE_MS * 0.6;
  }

  private beginVictory(time: number): void {
    if (!this.tk) return;
    this.flow = 'done';
    const scene = this.arena.scene;
    this.tk.clearHazards();
    for (const sig of this.signatures.values()) sig.onPhaseEnd?.();

    this.banner(this.def.defeatLine, '#ffe9a8', 26);
    scene.cameras.main.flash(600, 255, 255, 255);
    scene.cameras.main.shake(700, 0.012);
    this.tk.boom(this.bx, this.by, 200, this.def.colorLit);
    for (let i = 0; i < 6; i++) {
      scene.time.delayedCall(i * 110, () => {
        const a = (i / 6) * Math.PI * 2;
        this.tk?.boom(this.bx + Math.cos(a) * 44, this.by - 30 + Math.sin(a) * 30, 28, this.def.color);
      });
    }
    scene.time.delayedCall(1600, () => this.arena.bossVictory());
    void time;
  }

  // ── Presentation ───────────────────────────────────────────────────

  private banner(text: string, color: string, size: number): void {
    const scene = this.arena.scene;
    const t = scene.add.text(this.arena.width / 2, 132, text, {
      fontSize: `${size}px`, fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
      color, stroke: '#0a0510', strokeThickness: 6, letterSpacing: 2,
    }).setOrigin(0.5).setDepth(27).setAlpha(0);
    scene.tweens.add({ targets: t, alpha: 1, duration: 220 });
    scene.tweens.add({
      targets: t, alpha: 0, scaleX: 1.18, scaleY: 1.18, delay: 1500, duration: 700,
      onComplete: () => t.destroy(),
    });
  }

  /** A Sovereign's line — smaller than a banner, hung under the headline slot. */
  private speak(text: string): void {
    const scene = this.arena.scene;
    const t = scene.add.text(this.arena.width / 2, 168, `“${text}”`, {
      fontSize: '14px', fontFamily: 'Georgia, serif', fontStyle: 'italic',
      color: hex(this.def.colorLit), stroke: '#0a0510', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(27).setAlpha(0);
    scene.tweens.add({ targets: t, alpha: 0.95, duration: 300 });
    scene.tweens.add({
      targets: t, alpha: 0, y: 160, delay: 2400, duration: 600,
      onComplete: () => t.destroy(),
    });
  }

  private drawDefaultArena(g: Phaser.GameObjects.Graphics, W: number, H: number, p: BossPalette): void {
    // A fighting circle, not a new room — the world's own backdrop stays.
    g.fillStyle(0x000000, 0.28);
    g.fillRect(0, 0, W, H);
    g.lineStyle(2, p.main, 0.22);
    g.strokeCircle(W / 2, H * 0.55, Math.min(W, H) * 0.42);
    g.lineStyle(1, p.accent, 0.14);
    g.strokeCircle(W / 2, H * 0.55, Math.min(W, H) * 0.34);
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI * 2 * i) / 8 + Math.PI / 8;
      const r = Math.min(W, H) * 0.42;
      const x = W / 2 + Math.cos(a) * r;
      const y = H * 0.55 + Math.sin(a) * r;
      g.fillStyle(p.main, 0.3);
      g.fillCircle(x, y, 3);
    }
  }

  private draw(time: number): void {
    if (!this.tk) return;
    const gG = this.groundG;
    const pG = this.projG;
    const bG = this.bodyG;
    if (!gG || !pG || !bG) return;

    gG.clear();
    this.tk.drawGround(gG, time);
    for (const sig of this.signatures.values()) sig.drawGround?.(gG, time);

    pG.clear();
    this.tk.drawAir(pG, time);
    for (const sig of this.signatures.values()) sig.drawAir?.(pG, time);

    bG.clear();
    const npc = this.arena.npc;
    const p = this.arena.player;
    const alive = this.flow === 'fight' || this.flow === 'intro';
    const state: BossBodyState = {
      x: this.bx + Math.sin(time / 1100) * 5,
      y: this.by + Math.sin(time / 800) * 4,
      t: time,
      hpRatio: alive ? Phaser.Math.Clamp(npc.hp / Math.max(1, npc.maxHp), 0, 1)
        : this.flow === 'interlude' ? 0 : 1,
      enraged: alive && this.isEnraged(),
      hurt: time < this.hurtFlashUntil,
      phaseIdx: this.phaseIdx,
      hard: this.hard,
      facing: Math.atan2(p.y - this.by, p.x - this.bx),
      castGlow: Phaser.Math.Clamp((this.busyUntil - time) / 600, 0, 1),
    };
    this.def.drawBody(bG, state);
  }

  private drawBossBar(): void {
    const g = this.barG;
    if (!g || !this.barLabel) return;
    const W = this.arena.width;
    const H = this.arena.height;
    const npc = this.arena.npc;
    const def = this.def;
    g.clear();

    const barW = Math.min(560, W - 220);
    const barH = 13;
    const x = W / 2 - barW / 2;
    const y = H - 30;

    g.fillStyle(0x08060e, 0.85);
    g.fillRect(x - 3, y - 3, barW + 6, barH + 6);
    g.lineStyle(1, def.color, 0.7);
    g.strokeRect(x - 3, y - 3, barW + 6, barH + 6);

    const frac = this.flow === 'interlude' ? 0
      : Phaser.Math.Clamp(npc.hp / Math.max(1, npc.maxHp), 0, 1);
    g.fillStyle(def.colorDark, 1);
    g.fillRect(x, y, barW, barH);
    g.fillStyle(this.isEnraged() ? def.accent : def.color, 1);
    g.fillRect(x, y, barW * frac, barH);
    g.fillStyle(0xffffff, 0.22);
    g.fillRect(x, y, barW * frac, 3);

    // Phase pips — one diamond per remaining body.
    const remaining = this.phases.length - this.phaseIdx - (this.flow === 'interlude' ? 1 : 0);
    for (let i = 0; i < this.phases.length; i++) {
      const px = x + barW + 16 + i * 14;
      const lit = i < remaining;
      g.fillStyle(lit ? def.colorLit : 0x2a2434, lit ? 1 : 0.6);
      g.fillCircle(px, y + barH / 2, 4);
    }

    const phaseName = this.currentPhase()?.name ?? '';
    this.barLabel.setText(
      `${this.hard ? '☠ ' : ''}${def.name.toUpperCase()}  ·  ${phaseName.toUpperCase()}`,
    );
  }
}
