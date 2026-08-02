import Phaser from 'phaser';
import type { Player } from '../../entities/Player';
import type { Fighter } from '../../entities/Fighter';
import { getItem, ItemBehavior, ItemEffect } from '../../data/Items';

export interface ItemsArenaApi {
  get scene(): Phaser.Scene;
  get player(): Player;
  get npc(): Fighter;
  applySelfDamage(amount: number): void;
  applyPlayerSpeedMult(f: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
}

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

  /** Live triggered behaviors, with their firing bookkeeping. */
  private behaviors: { b: ItemBehavior; emoji: string; lastFiredAt: number; fired: boolean }[] = [];
  private sears: { remaining: number; perTick: number; nextAt: number }[] = [];
  private elapsedMs = 0;

  constructor(private api: ItemsArenaApi) {}

  reset(): void {
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

    for (const id of consumed) {
      const def = getItem(id);
      if (!def) continue;
      this.activeIds.push(id);
      this.applyEffect(def.effect);
      for (const b of def.effect.behaviors ?? []) {
        this.behaviors.push({ b, emoji: def.emoji, lastFiredAt: -Infinity, fired: false });
      }
    }

    if (this.activeIds.length === 0) return;

    if (this.lifestealFrac > 0) this.hookLifesteal();
    if (this.reviveFrac > 0) this.hookRevive();
    this.hookBehaviors();

    this.buildHud();

    // One consolidated pop-up rather than one per item — the strip carries the detail.
    const label = this.activeIds
      .map((id) => getItem(id)?.emoji ?? '')
      .join(' ');
    this.api.showFloatingText(player.x, player.y - 46, label, '#7cf5d8');
  }

  private applyEffect(e: ItemEffect): void {
    const { player, npc } = this.api;

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
    if (e.statusDurMult) npc.statusDurMult *= e.statusDurMult;
    if (e.statusDmgMult) npc.statusDmgMult *= e.statusDmgMult;

    // ── Defence ─────────────────────────────────────────────────────
    if (e.damageTakenMult) player.cardDamageTakenMult *= e.damageTakenMult;
    if (e.dodgeChance) player.dodgeChance += e.dodgeChance;
    if (e.reflectFraction) {
      // Reflect stacks multiplicatively on what gets *through*, so two sources never exceed 100%.
      player.reflectFraction = 1 - (1 - player.reflectFraction) * (1 - e.reflectFraction);
    }
    if (e.invincibleMs) this.grantOpeningInvincibility(e.invincibleMs);

    // ── Tempo ───────────────────────────────────────────────────────
    if (e.speedMult) this.api.applyPlayerSpeedMult(e.speedMult);
    if (e.cooldownMult) player.cooldownMult *= e.cooldownMult;
    if (e.ultimateCooldownMult) player.ultimateCooldownMult *= e.ultimateCooldownMult;

    // ── Costs ───────────────────────────────────────────────────────
    if (e.selfDamagePerSec) this.selfDamagePerSec += e.selfDamagePerSec;

    // ── Sabotage ────────────────────────────────────────────────────
    if (e.enemyMaxHpMult) npc.setMaxHp(Math.max(10, Math.round(npc.maxHp * e.enemyMaxHpMult)));
    if (e.enemySpeedMult) npc.walkSpeedMult *= e.enemySpeedMult;
    if (e.enemyDamageMult) npc.outgoingDamageMult *= e.enemyDamageMult;
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
    const { player, npc } = this.api;
    const prev = npc.onDamaged;
    npc.onDamaged = (amount: number) => {
      prev?.(amount);
      if (!player.active || player.hp <= 0) return;
      // Fractional healing is banked and paid out in whole HP so the bar never
      // creeps by invisible amounts.
      this.lifestealPool += amount * this.lifestealFrac;
      const whole = Math.floor(this.lifestealPool);
      if (whole >= 1) {
        this.lifestealPool -= whole;
        player.heal(whole);
      }
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
      if (this.reviveUsed || player.hp <= 0) return false;
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
    };
  }

  // ── Triggered behaviors ────────────────────────────────────────────

  /** Wire the event-driven triggers. Callbacks chain — never replace. */
  private hookBehaviors(): void {
    const { player, npc } = this.api;
    if (this.behaviors.some((s) => s.b.trigger === 'onHitTaken')) {
      const prev = player.onDamaged;
      player.onDamaged = (amount: number) => {
        prev?.(amount);
        if (amount > 0) this.tryFire('onHitTaken');
      };
    }
    if (this.behaviors.some((s) => s.b.trigger === 'onHitDealt')) {
      const prev = npc.onDamaged;
      npc.onDamaged = (amount: number) => {
        prev?.(amount);
        if (amount > 0) this.tryFire('onHitDealt');
      };
    }
    if (this.behaviors.some((s) => s.b.trigger === 'onCast')) {
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
    const { scene, player, npc } = this.api;
    if (!player.active || player.hp <= 0) return;

    switch (b.action) {
      case 'burstAoe': {
        const radius = b.radius ?? 120;
        const ring = scene.add.circle(player.x, player.y, radius, 0xffb347, 0.35).setDepth(18).setScale(0.25);
        scene.tweens.add({ targets: ring, scaleX: 1, scaleY: 1, alpha: 0, duration: 320, onComplete: () => ring.destroy() });
        if (npc.active && npc.hp > 0 && Phaser.Math.Distance.Between(player.x, player.y, npc.x, npc.y) <= radius) {
          npc.takeDamage(b.amount ?? 20);
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
        const durationMs = b.durationMs ?? 3000;
        const ticks = Math.max(1, Math.round(durationMs / 500));
        this.sears.push({
          remaining: ticks,
          perTick: Math.max(1, Math.round((b.amount ?? 15) / ticks)),
          nextAt: this.elapsedMs + 500,
        });
        break;
      }
      case 'slowEnemy': {
        const mult = b.mult ?? 0.7;
        npc.walkSpeedMult *= mult;
        scene.time.delayedCall(b.durationMs ?? 2000, () => {
          if (npc.active) npc.walkSpeedMult /= mult;
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
    const { player, npc } = this.api;

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
      if (npc.active && npc.hp > 0) npc.takeDamage(sear.perTick);
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
