import Phaser from 'phaser';
import type { Fighter } from '../../entities/Fighter';
import { getItem, ItemBehavior, ItemEffect } from '../../data/Items';

export interface ItemsArenaApi {
  get scene(): Phaser.Scene;
  get player(): Fighter;
  /** The 1v1 opponent. Never read in run mode (see `foes`). */
  readonly npc?: Fighter;
  applySelfDamage(amount: number): void;
  applyPlayerSpeedMult(f: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  /**
   * Run mode (City invasion): every foe the player can currently reach. When present the kit
   * never touches `npc` — enemy-side effects land on each foe as it shows up, hits dealt arrive
   * through `onHitDealt`, and absorbers go on `player.relicAbsorbers` so element kits clearing
   * `damageAbsorber` cannot unhook them.
   */
  foes?(): Fighter[];
  /** Run mode: may this sim change foes' stats? False on a co-op guest, whose husks are replicas. */
  readonly foeAuthority?: boolean;
}

/** Enemy-side multipliers an item set carries, stamped onto each foe in run mode. */
interface FoeMods { maxHp: number; speed: number; damage: number; statusDur: number; statusDmg: number }
const NO_FOE_MODS: FoeMods = { maxHp: 1, speed: 1, damage: 1, statusDur: 1, statusDmg: 1 };

/** One line of a wave-end refresh, for the caller's pop-ups. */
export interface ItemRefreshLine { emoji: string; name: string; text: string }

/** Run mode: how far a reflected hit / a sear / a slow reaches for a foe. */
const RUN_REACH = 260;

/** HUD band — sits with the rest of the arena chrome, above the playfield. */
const HUD_DEPTH = 22;

/**
 * Applies campaign shop items at match start and runs the few that need a heartbeat.
 *
 * Everything an item can do is expressed as an `ItemEffect` in `Items.ts`; this kit is
 * the single place those fields become real. Items that hook a fighter callback
 * (`lifestealFrac`, `reviveHpFrac`) **chain** the existing handler rather than replacing
 * it, so an element kit that already owns the slot keeps working.
 */
export class ItemsKit {
  private selfDamagePerSec = 0;
  private tickAccum = 0;

  private lifestealFrac = 0;
  private lifestealPool = 0;

  private reviveFrac = 0;
  private reviveUsed = false;

  private hudText: Phaser.GameObjects.Text | null = null;
  private activeIds: string[] = [];

  // Run mode only.
  private foeMods: FoeMods = { ...NO_FOE_MODS };
  private foeStamped = new WeakMap<Fighter, FoeMods>();
  private runReflect = 0;
  private openingInvincibleMs = 0;
  private absorber: ((amount: number) => boolean) | null = null;
  private absorberOn: Fighter | null = null;
  private hooked = { lifesteal: false, revive: false, hitTaken: false, hitDealt: false, cast: false, reflect: false };

  /** Live triggered behaviors, with their firing bookkeeping. */
  private behaviors: { b: ItemBehavior; emoji: string; lastFiredAt: number; fired: boolean }[] = [];
  private sears: { remaining: number; perTick: number; nextAt: number; target: Fighter }[] = [];
  private elapsedMs = 0;

  constructor(private api: ItemsArenaApi) {}

  /** City invasion: the kit runs against a crowd rather than one opponent. */
  private get runMode(): boolean { return !!this.api.foes; }

  /** Everything an enemy-side effect may land on right now. */
  private foeList(): Fighter[] {
    if (this.api.foes) return this.api.foes().filter((f) => f.active && f.hp > 0);
    const npc = this.api.npc;
    return npc && npc.active && npc.hp > 0 ? [npc] : [];
  }

  private nearestFoe(x: number, y: number, reach = Infinity): Fighter | null {
    let best: Fighter | null = null;
    let bestD = reach;
    for (const f of this.foeList()) {
      const d = Phaser.Math.Distance.Between(x, y, f.x, f.y);
      if (d <= bestD) { bestD = d; best = f; }
    }
    return best;
  }

  reset(): void {
    if (this.absorber && this.absorberOn) {
      this.absorberOn.relicAbsorbers = this.absorberOn.relicAbsorbers.filter((f) => f !== this.absorber);
    }
    this.absorber = null;
    this.absorberOn = null;
    this.foeMods = { ...NO_FOE_MODS };
    this.foeStamped = new WeakMap();
    this.runReflect = 0;
    this.openingInvincibleMs = 0;
    this.hooked = { lifesteal: false, revive: false, hitTaken: false, hitDealt: false, cast: false, reflect: false };
    // Run mode lives inside one scene, so its strip may still be up.
    if (this.runMode && this.hudText?.scene) this.hudText.destroy();
    this.selfDamagePerSec = 0;
    this.tickAccum = 0;
    this.lifestealFrac = 0;
    this.lifestealPool = 0;
    this.reviveFrac = 0;
    this.reviveUsed = false;
    this.activeIds = [];
    this.behaviors = [];
    this.sears = [];
    this.elapsedMs = 0;
    // GameObjects do not survive a scene restart — drop the stale handle so the
    // next applyConsumed() rebuilds the strip instead of writing to a dead Text.
    this.hudText = null;
  }

  applyConsumed(consumed: Set<string>): void {
    if (consumed.size === 0) return;
    const { player } = this.api;

    for (const id of consumed) this.addInternal(id);
    if (this.activeIds.length === 0) return;
    this.installHooks();
    if (!this.hudText?.active) this.buildHud();

    // One consolidated pop-up rather than one per item — the strip carries the detail.
    const label = this.activeIds
      .map((id) => getItem(id)?.emoji ?? '')
      .join(' ');
    this.api.showFloatingText(player.x, player.y - 46, label, '#7cf5d8');
  }

  /**
   * Run mode: one item, taken mid-run (a City draft card). Applies exactly what a match start
   * would, once, and it stays for the rest of the run. Returns false for an unknown or
   * already-held id.
   */
  addItem(id: string): boolean {
    if (this.activeIds.includes(id)) return false;
    if (!this.addInternal(id)) return false;
    this.installHooks();
    if (!this.hudText?.active) this.buildHud();
    else this.refreshHud();
    return true;
  }

  get itemIds(): readonly string[] { return this.activeIds; }

  private addInternal(id: string): boolean {
    const def = getItem(id);
    if (!def) return false;
    this.activeIds.push(id);
    // Copy-on-write, so foes stamped with the old set see a different object and catch up.
    this.foeMods = { ...this.foeMods };
    this.applyEffect(def.effect);
    for (const b of def.effect.behaviors ?? []) {
      this.behaviors.push({ b, emoji: def.emoji, lastFiredAt: -Infinity, fired: false });
    }
    return true;
  }

  /** Hooks are idempotent — a mid-run item only adds the ones nothing has installed yet. */
  private installHooks(): void {
    if (this.lifestealFrac > 0 && !this.hooked.lifesteal) { this.hooked.lifesteal = true; if (!this.runMode) this.hookLifesteal(); }
    if (this.runMode) {
      if ((this.reviveFrac > 0 || this.api.player.dodgeChance > 0) && !this.hooked.revive) {
        this.hooked.revive = true;
        this.hookRunAbsorber();
      }
      if (this.runReflect > 0 && !this.hooked.reflect) { this.hooked.reflect = true; this.hookRunReflect(); }
    } else if (this.reviveFrac > 0 && !this.hooked.revive) {
      this.hooked.revive = true;
      this.hookRevive();
    }
    this.hookBehaviors();
  }

  /**
   * The consumable half of every held item, put back at the end of a City wave: shield charges
   * and shield HP topped back up to what the items grant, dodge chance (which wears down by
   * 0.2 on every dodge) restored, a spent revive re-armed, and once-per-match triggers reset.
   * Tops up rather than adds, so a wave you finish untouched does not bank a pile of charges.
   * Everything else an item does is permanent and never needs refreshing.
   */
  refreshForWave(): ItemRefreshLine[] {
    const { player } = this.api;
    const out: ItemRefreshLine[] = [];
    let charges = player.shieldCharges; let chargeNeed = 0;
    let shield = player.shieldHp; let shieldNeed = 0;
    let dodge = player.dodgeChance; let dodgeNeed = 0;
    for (const id of this.activeIds) {
      const def = getItem(id);
      if (!def) continue;
      const e = def.effect;
      const say = (text: string): void => { out.push({ emoji: def.emoji, name: def.name, text }); };
      if (e.shieldCharges) {
        chargeNeed += e.shieldCharges;
        if (charges < chargeNeed) { say(`+${chargeNeed - charges} shield charge${chargeNeed - charges === 1 ? '' : 's'}`); charges = chargeNeed; }
      }
      if (e.shieldHp) {
        shieldNeed += e.shieldHp;
        if (shield < shieldNeed) { say(`+${Math.round(shieldNeed - shield)} shield`); shield = shieldNeed; }
      }
      if (e.dodgeChance) {
        dodgeNeed += e.dodgeChance;
        if (dodge < dodgeNeed - 0.001) { say(`dodge back to ${Math.round(dodgeNeed * 100)}%`); dodge = dodgeNeed; }
      }
      if (e.reviveHpFrac && this.reviveUsed) say('second wind re-armed');
      if ((e.behaviors ?? []).some((b) => b.oncePerMatch ?? b.trigger === 'onLowHp')) {
        if (this.behaviors.some((s) => s.emoji === def.emoji && s.fired && (s.b.oncePerMatch ?? s.b.trigger === 'onLowHp'))) {
          say('ready again');
        }
      }
    }
    player.shieldCharges = charges;
    player.shieldHp = shield;
    player.dodgeChance = dodge;
    this.reviveUsed = false;
    for (const s of this.behaviors) {
      if (s.b.oncePerMatch ?? s.b.trigger === 'onLowHp') s.fired = false;
    }
    this.refreshHud();
    return out;
  }

  /** Run mode: opening invincibility belongs to the start of every wave, not the end of one. */
  onWaveBegan(): void {
    if (this.openingInvincibleMs > 0 && this.api.player.active && this.api.player.hp > 0) {
      this.grantOpeningInvincibility(this.openingInvincibleMs);
    }
  }

  /** Run mode: the local player's hit landed on a foe (the City feeds this from its hit hook). */
  onHitDealt(amount: number): void {
    if (amount <= 0) return;
    if (this.lifestealFrac > 0) this.lifestealFrom(amount);
    this.tryFire('onHitDealt');
  }

  private applyEffect(e: ItemEffect): void {
    const { player } = this.api;
    const npc = this.runMode ? undefined : this.api.npc;

    // ── Vitals ──────────────────────────────────────────────────────
    if (e.maxHp) player.setMaxHp(Math.max(10, player.maxHp + e.maxHp));
    if (e.shieldCharges) player.shieldCharges += e.shieldCharges;
    if (e.shieldHp) player.shieldHp += e.shieldHp;
    if (e.regenPerSecond) player.regenPerSecond += e.regenPerSecond;
    if (e.lifestealFrac) this.lifestealFrac += e.lifestealFrac;
    if (e.reviveHpFrac) this.reviveFrac = Math.max(this.reviveFrac, e.reviveHpFrac);

    // ── Offence ─────────────────────────────────────────────────────
    if (e.damageMult) player.cardOutgoingDamageMult *= e.damageMult;
    if (e.critChance) player.critChance += e.critChance;
    if (e.critMult) player.critMult = Math.max(player.critMult, e.critMult);
    // Status potency lives on the *victim* — that is where ArenaScene reads it from.
    if (e.statusDurMult) { if (npc) npc.statusDurMult *= e.statusDurMult; this.foeMods.statusDur *= e.statusDurMult; }
    if (e.statusDmgMult) { if (npc) npc.statusDmgMult *= e.statusDmgMult; this.foeMods.statusDmg *= e.statusDmgMult; }

    // ── Defence ─────────────────────────────────────────────────────
    if (e.damageTakenMult) player.cardDamageTakenMult *= e.damageTakenMult;
    if (e.dodgeChance) player.dodgeChance += e.dodgeChance;
    if (e.reflectFraction) {
      // Reflect stacks multiplicatively on what gets *through*, so two sources never exceed 100%.
      // Run mode keeps its own: ArenaScene's thorns hook sends player.reflectFraction at the npc
      // slot, which in co-op invasion is the ally.
      if (this.runMode) this.runReflect = 1 - (1 - this.runReflect) * (1 - e.reflectFraction);
      else player.reflectFraction = 1 - (1 - player.reflectFraction) * (1 - e.reflectFraction);
    }
    if (e.invincibleMs) {
      if (this.runMode) this.openingInvincibleMs = Math.max(this.openingInvincibleMs, e.invincibleMs);
      else this.grantOpeningInvincibility(e.invincibleMs);
    }

    // ── Tempo ───────────────────────────────────────────────────────
    if (e.speedMult) this.api.applyPlayerSpeedMult(e.speedMult);
    if (e.cooldownMult) player.cooldownMult *= e.cooldownMult;
    if (e.ultimateCooldownMult) player.ultimateCooldownMult *= e.ultimateCooldownMult;

    // ── Costs ───────────────────────────────────────────────────────
    if (e.selfDamagePerSec) this.selfDamagePerSec += e.selfDamagePerSec;

    // ── Sabotage ────────────────────────────────────────────────────
    if (e.enemyMaxHpMult) { if (npc) npc.setMaxHp(Math.max(10, Math.round(npc.maxHp * e.enemyMaxHpMult))); this.foeMods.maxHp *= e.enemyMaxHpMult; }
    if (e.enemySpeedMult) { if (npc) npc.walkSpeedMult *= e.enemySpeedMult; this.foeMods.speed *= e.enemySpeedMult; }
    if (e.enemyDamageMult) { if (npc) npc.outgoingDamageMult *= e.enemyDamageMult; this.foeMods.damage *= e.enemyDamageMult; }
  }

  /**
   * Run mode: every foe carries the item set's enemy-side multipliers. Each foe remembers what
   * it was last given, so an item drafted mid-wave reaches the husks already on the street by
   * the ratio alone. Health scales proportionally rather than refilling.
   */
  private stampFoes(): void {
    if (!this.runMode || this.api.foeAuthority === false) return;
    const want = this.foeMods;
    if (want.maxHp === 1 && want.speed === 1 && want.damage === 1 && want.statusDur === 1 && want.statusDmg === 1) return;
    for (const f of this.foeList()) {
      const had = this.foeStamped.get(f) ?? NO_FOE_MODS;
      if (had === want) continue;
      if (want.maxHp !== had.maxHp) {
        const frac = f.hp / Math.max(1, f.maxHp);
        const max = Math.max(10, Math.round(f.maxHp * (want.maxHp / had.maxHp)));
        f.setMaxHp(max);
        f.hp = Math.max(1, Math.round(max * frac));
      }
      if (want.speed !== had.speed) f.walkSpeedMult *= want.speed / had.speed;
      if (want.damage !== had.damage) {
        // A husk's bite and shot both read biteDamage; anything else reads the generic mult.
        const biter = f as Fighter & { biteDamage?: number };
        if (typeof biter.biteDamage === 'number') biter.biteDamage *= want.damage / had.damage;
        else f.outgoingDamageMult *= want.damage / had.damage;
      }
      if (want.statusDur !== had.statusDur) f.statusDurMult *= want.statusDur / had.statusDur;
      if (want.statusDmg !== had.statusDmg) f.statusDmgMult *= want.statusDmg / had.statusDmg;
      this.foeStamped.set(f, want);
    }
  }

  /**
   * Opening invincibility. Cleared on a timer only if nothing else has claimed the
   * flag in the meantime — an element that goes invincible mid-window keeps its own.
   */
  private grantOpeningInvincibility(ms: number): void {
    const { scene, player } = this.api;
    player.isInvincible = true;
    let tint: Phaser.GameObjects.Arc | null = scene.add
      .circle(player.x, player.y, 30, 0xffffcc, 0.18)
      .setDepth(4);
    const follow = scene.time.addEvent({
      delay: 16, loop: true,
      callback: () => { if (tint && player.active) tint.setPosition(player.x, player.y); },
    });
    scene.time.delayedCall(ms, () => {
      player.isInvincible = false;
      follow.remove();
      tint?.destroy();
      tint = null;
      if (player.active) this.api.showFloatingText(player.x, player.y - 40, 'EXPOSED', '#ffcc66');
    });
  }

  /** Heal a share of every real hit landed on the opponent. */
  private hookLifesteal(): void {
    const npc = this.api.npc;
    if (!npc) return;
    const prev = npc.onDamaged;
    npc.onDamaged = (amount: number) => {
      prev?.(amount);
      this.lifestealFrom(amount);
    };
  }

  private lifestealFrom(amount: number): void {
    const { player } = this.api;
    if (!player.active || player.hp <= 0) return;
    // Fractional healing is banked and paid out in whole HP so the bar never
    // creeps by invisible amounts.
    this.lifestealPool += amount * this.lifestealFrac;
    const whole = Math.floor(this.lifestealPool);
    if (whole >= 1) {
      this.lifestealPool -= whole;
      player.heal(whole);
    }
  }

  /**
   * Run mode's one absorber: a dodge roll (husk bites never roll `dodgeChance` on their own),
   * then the revive. Lives on `relicAbsorbers`, out of reach of kits that null `damageAbsorber`.
   */
  private hookRunAbsorber(): void {
    const { player } = this.api;
    const fn = (amount: number): boolean => {
      if (amount <= 0 || player.hp <= 0) return false;
      if (player.dodgeChance > 0 && player.rollDodge()) {
        this.api.showFloatingText(player.x, player.y - 40, 'DODGE', '#aee8ff');
        return true;
      }
      return this.tryRevive(amount);
    };
    this.absorber = fn;
    this.absorberOn = player;
    player.relicAbsorbers.push(fn);
  }

  /** Run mode thorns: a share of every hit taken goes back at the nearest foe. */
  private hookRunReflect(): void {
    const { player } = this.api;
    const prev = player.onDamaged;
    player.onDamaged = (amount: number) => {
      prev?.(amount);
      if (amount <= 0 || this.runReflect <= 0) return;
      const foe = this.nearestFoe(player.x, player.y, RUN_REACH);
      if (!foe) return;
      const reflected = Math.max(1, Math.round(amount * this.runReflect));
      foe.takeDamage(reflected);
      this.api.showFloatingText(foe.x, foe.y - 20, `🌵 ${reflected}`, '#88cc44');
    };
  }

  /**
   * Cancel one lethal hit. Checked against every layer that would have soaked it, so a
   * hit a shield could have eaten never spends the revive.
   */
  private hookRevive(): void {
    const { player } = this.api;
    const prev = player.damageAbsorber;
    player.damageAbsorber = (amount: number) => {
      if (prev && prev(amount)) return true;
      return this.tryRevive(amount);
    };
  }

  private tryRevive(amount: number): boolean {
    const { player } = this.api;
    if (this.reviveFrac <= 0 || this.reviveUsed || player.hp <= 0) return false;
    if (player.shieldCharges > 0) return false;
    const soak = player.shieldHp + player.weakHp + player.clottedHp * 2;
    if (amount < player.hp + soak) return false;

    this.reviveUsed = true;
    player.hp = Math.max(1, Math.round(player.maxHp * this.reviveFrac));
    player.shieldHp = 0;
    player.weakHp = 0;
    player.clottedHp = 0;
    this.api.showFloatingText(player.x, player.y - 46, '✦ SECOND WIND', '#ffdd66');
    this.api.scene.cameras.main.flash(280, 255, 220, 120);
    this.refreshHud();
    return true;
  }

  // ── Triggered behaviors ────────────────────────────────────────────

  /** Wire the event-driven triggers. Callbacks chain — never replace. */
  private hookBehaviors(): void {
    const { player } = this.api;
    const npc = this.runMode ? undefined : this.api.npc;
    if (!this.hooked.hitTaken && this.behaviors.some((s) => s.b.trigger === 'onHitTaken')) {
      this.hooked.hitTaken = true;
      const prev = player.onDamaged;
      player.onDamaged = (amount: number) => {
        prev?.(amount);
        if (amount > 0) this.tryFire('onHitTaken');
      };
    }
    // Run mode's hits dealt come in through onHitDealt instead.
    if (npc && !this.hooked.hitDealt && this.behaviors.some((s) => s.b.trigger === 'onHitDealt')) {
      this.hooked.hitDealt = true;
      const prev = npc.onDamaged;
      npc.onDamaged = (amount: number) => {
        prev?.(amount);
        if (amount > 0) this.tryFire('onHitDealt');
      };
    }
    if (!this.hooked.cast && this.behaviors.some((s) => s.b.trigger === 'onCast')) {
      this.hooked.cast = true;
      const prev = player.onCastStamp;
      player.onCastStamp = (abilityId, aim) => {
        prev?.(abilityId, aim);
        this.tryFire('onCast');
      };
    }
  }

  private tryFire(trigger: ItemBehavior['trigger']): void {
    const now = this.elapsedMs;
    for (const s of this.behaviors) {
      if (s.b.trigger !== trigger) continue;
      if (s.fired && (s.b.oncePerMatch ?? trigger === 'onLowHp')) continue;
      if (now - s.lastFiredAt < (s.b.cooldownSec ?? 0) * 1000) continue;
      if (s.b.chance !== undefined && Math.random() > s.b.chance) continue;
      s.lastFiredAt = now;
      s.fired = true;
      this.runAction(s.b, s.emoji);
    }
  }

  private runAction(b: ItemBehavior, emoji: string): void {
    const { scene, player } = this.api;
    if (!player.active || player.hp <= 0) return;

    switch (b.action) {
      case 'burstAoe': {
        const radius = b.radius ?? 120;
        const ring = scene.add.circle(player.x, player.y, radius, 0xffb347, 0.35).setDepth(18).setScale(0.25);
        scene.tweens.add({ targets: ring, scaleX: 1, scaleY: 1, alpha: 0, duration: 320, onComplete: () => ring.destroy() });
        for (const foe of this.foeList()) {
          if (Phaser.Math.Distance.Between(player.x, player.y, foe.x, foe.y) <= radius) foe.takeDamage(b.amount ?? 20);
        }
        break;
      }
      case 'healBurst':
        player.heal(b.amount ?? 15);
        break;
      case 'tempHaste': {
        const mult = b.mult ?? 1.3;
        this.api.applyPlayerSpeedMult(mult);
        scene.time.delayedCall(b.durationMs ?? 3000, () => this.api.applyPlayerSpeedMult(1 / mult));
        break;
      }
      case 'tempDamage': {
        const mult = b.mult ?? 1.3;
        player.cardOutgoingDamageMult *= mult;
        scene.time.delayedCall(b.durationMs ?? 3000, () => { player.cardOutgoingDamageMult /= mult; });
        break;
      }
      case 'shieldCharge':
        player.shieldCharges += b.amount ?? 1;
        break;
      case 'cooldownRefund':
        player.reduceCooldowns(b.amount ?? 1000);
        break;
      case 'sear': {
        const target = this.runMode ? this.nearestFoe(player.x, player.y, RUN_REACH * 2) : this.api.npc;
        if (!target) break;
        const durationMs = b.durationMs ?? 3000;
        const ticks = Math.max(1, Math.round(durationMs / 500));
        this.sears.push({
          remaining: ticks,
          perTick: Math.max(1, Math.round((b.amount ?? 15) / ticks)),
          nextAt: this.elapsedMs + 500,
          target,
        });
        break;
      }
      case 'slowEnemy': {
        // A co-op guest's husks are replicas — the host owns their speed.
        if (this.runMode && this.api.foeAuthority === false) break;
        const mult = b.mult ?? 0.7;
        const slowed = this.runMode
          ? this.foeList().filter((f) => Phaser.Math.Distance.Between(player.x, player.y, f.x, f.y) <= RUN_REACH)
          : this.foeList();
        for (const f of slowed) f.walkSpeedMult *= mult;
        scene.time.delayedCall(b.durationMs ?? 2000, () => {
          for (const f of slowed) if (f.active) f.walkSpeedMult /= mult;
        });
        break;
      }
    }
    this.api.showFloatingText(player.x, player.y - 52, emoji, '#7cf5d8');
  }

  // ── HUD ───────────────────────────────────────────────────────────

  private buildHud(): void {
    const { scene } = this.api;
    this.hudText = scene.add.text(14, scene.scale.height - 12, '', {
      fontSize: '15px',
      fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
      color: '#7cf5d8',
      stroke: '#04121a',
      strokeThickness: 3,
    }).setOrigin(0, 1).setDepth(HUD_DEPTH).setScrollFactor(0);
    this.refreshHud();
  }

  private refreshHud(): void {
    if (!this.hudText || !this.hudText.active) return;
    const icons = this.activeIds.map((id) => {
      const def = getItem(id);
      if (!def) return '';
      // A spent revive greys out rather than vanishing — the slot stays legible.
      if (def.effect.reviveHpFrac && this.reviveUsed) return `${def.emoji}✕`;
      return def.emoji;
    }).filter(Boolean).join(' ');
    this.hudText.setText(icons ? `🎒 ${icons}` : '');
  }

  update(dt: number): void {
    this.elapsedMs += dt;
    const { player } = this.api;
    this.stampFoes();

    // Clock triggers + the low-HP latch.
    for (const s of this.behaviors) {
      if (s.b.trigger === 'everyNSec') {
        const period = (s.b.periodSec ?? 5) * 1000;
        if (this.elapsedMs - s.lastFiredAt >= period && player.active && player.hp > 0) {
          if (s.lastFiredAt === -Infinity) { s.lastFiredAt = this.elapsedMs; continue; }
          s.lastFiredAt = this.elapsedMs;
          if (s.b.chance === undefined || Math.random() <= s.b.chance) this.runAction(s.b, s.emoji);
        }
      }
      if (s.b.trigger === 'onLowHp' && !s.fired && player.active && player.hp > 0
        && player.hp / Math.max(1, player.maxHp) < (s.b.thresholdFrac ?? 0.3)) {
        s.fired = true;
        s.lastFiredAt = this.elapsedMs;
        this.runAction(s.b, s.emoji);
      }
    }

    // Sear DoTs.
    for (const sear of this.sears) {
      if (this.elapsedMs < sear.nextAt) continue;
      sear.nextAt = this.elapsedMs + 500;
      sear.remaining--;
      if (sear.target.active && sear.target.hp > 0) sear.target.takeDamage(sear.perTick);
    }
    this.sears = this.sears.filter((s) => s.remaining > 0);

    if (this.selfDamagePerSec <= 0) return;
    if (!player.active || player.hp <= 0) return;
    this.tickAccum += dt;
    while (this.tickAccum >= 1000) {
      this.tickAccum -= 1000;
      this.api.applySelfDamage(this.selfDamagePerSec);
    }
  }
}
