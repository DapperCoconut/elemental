import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { Projectile } from '../../combat/Projectile';
import type { CastContext } from '../Ability';

// Stub context passed to castAbility() so that cast() calls become no-ops.
// FateKit handles the real logic itself; cast() just needs to not throw.
const FATE_STUB_CTX: CastContext = new Proxy({} as CastContext, {
  get: (_t, _k) => () => {},
});

// ── Card catalogue ────────────────────────────────────────────────────────────

export type FateCardType =
  | 'laser' | 'burst' | 'barrier' | 'explosion' | 'infect'
  | 'coin' | 'heal' | 'buff' | 'lightning' | 'slots';

interface FateCardDef {
  type: FateCardType;
  name: string;
  emoji: string;
  color: number;
  blurb: string;
}

const FATE_CARD_DEFS: FateCardDef[] = [
  { type: 'laser',     name: 'Laser',     emoji: '🔴', color: 0xff3333, blurb: '15 dmg hitscan laser' },
  { type: 'burst',     name: 'Burst',     emoji: '💥', color: 0xff8800, blurb: '5× 5 dmg cone blast' },
  { type: 'barrier',   name: 'Barrier',   emoji: '🛡️', color: 0x4488ff, blurb: '15× 3 dmg bullet ring' },
  { type: 'explosion', name: 'Explosion', emoji: '💣', color: 0xcc2222, blurb: '20 dmg AoE bomb' },
  { type: 'infect',    name: 'Infect',    emoji: '☠️', color: 0x55cc55, blurb: '3× 5 dmg + poison' },
  { type: 'coin',      name: 'Coin',      emoji: '🪙', color: 0xffcc00, blurb: 'Reflects bullets ×2 dmg' },
  { type: 'heal',      name: 'Heal',      emoji: '💚', color: 0x44dd88, blurb: '12 orbs, 8 HP each' },
  { type: 'buff',      name: 'Buff',      emoji: '💪', color: 0xdd88ff, blurb: '+10% spd/dmg/DR (8s)' },
  { type: 'lightning', name: 'Lightning', emoji: '⚡', color: 0xffee44, blurb: '20 dmg + 2s stun' },
  { type: 'slots',     name: 'Slots',     emoji: '🎰', color: 0xff66cc, blurb: 'Summon a slot machine' },
];
const FATE_CARD_TYPES: FateCardType[] = FATE_CARD_DEFS.map((d) => d.type);
const DEF_BY_TYPE = new Map<FateCardType, FateCardDef>(FATE_CARD_DEFS.map((d) => [d.type, d]));
const ATTACK_TYPES: FateCardType[] = ['laser', 'burst', 'barrier', 'explosion', 'infect', 'lightning'];
const BASE_DMG: Record<FateCardType, number> = {
  laser: 15, burst: 5, barrier: 3, explosion: 20, infect: 5,
  coin: 0, heal: 8, buff: 0, lightning: 20, slots: 0,
};

const HAND_SIZE = 6;
const DRAW_INTERVAL_MS = 5000;

interface FateCard {
  type: FateCardType;
  preserved: boolean;
  enchanted: boolean;
}

function drawCard(): FateCard {
  return { type: FATE_CARD_TYPES[Math.floor(Math.random() * FATE_CARD_TYPES.length)], preserved: false, enchanted: false };
}

type FateModStat = 'dmgTaken' | 'dmgDealt' | 'speed' | 'cd' | 'size';
interface FateMod { stat: FateModStat; mult: number; until: number; }

interface FateHealOrb {
  sprite: Phaser.GameObjects.Arc;
  x: number; y: number;
  owner: 'player' | 'npc';
  expiresAt: number;
}

interface FateCoinToken {
  sprite: Phaser.GameObjects.Image;
  x: number; y: number;
  vy: number;
  risingUntil: number;
  expiresAt: number;
  owner: 'player' | 'npc';
  pairId: number;
}

interface FateSlotMachine {
  sprite: Phaser.GameObjects.Arc;
  label: Phaser.GameObjects.Text;
  barBg: Phaser.GameObjects.Rectangle;
  barFill: Phaser.GameObjects.Rectangle;
  x: number; y: number;
  owner: 'player' | 'npc';
  cycleDmgPlayer: number;
  cycleDmgNpc: number;
  cycleEnd: number;
}

interface FateAllIn {
  sprite: Phaser.GameObjects.Arc;
  owner: 'player' | 'npc';
  activatesAt: number;
  orbitAngle: number;
}

interface FateLightningStrike {
  ring: Phaser.GameObjects.Arc;
  x: number; y: number;
  owner: 'player' | 'npc';
  dmg: number;
  stunMs: number;
  resolveAt: number;
}

interface FatePoison {
  until: number;
  dps: number;
  tickAccum: number;
  visual: Phaser.GameObjects.Text | null;
}

// ── Arena API ────────────────────────────────────────────────────────────────

export interface FateArenaApi {
  get player(): Fighter;
  get npc(): Fighter;
  readonly enemies: Fighter[];
  get scene(): Phaser.Scene;
  get projectiles(): Phaser.Physics.Arcade.Group;
  get eKey(): Phaser.Input.Keyboard.Key;
  get rKey(): Phaser.Input.Keyboard.Key;
  get fKey(): Phaser.Input.Keyboard.Key;
  get qKey(): Phaser.Input.Keyboard.Key;
  get nukeChanneling(): boolean;
  get rightPointerWasDown(): boolean;
  hasPerk(perkId: string): boolean;
  applyPlayerSpeedMult(f: number): void;
  applyNpcSpeedMult(f: number): void;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  spawnDamageNumber(x: number, y: number, amount: number): void;
}

// ── FateKit ──────────────────────────────────────────────────────────────────

export class FateKit {
  // ── Hands ─────────────────────────────────────────────────────────
  private playerHand: FateCard[] = [];
  private npcHand: FateCard[] = [];
  private playerSelected = 0;
  private playerDrawAccum = 0;
  private npcDrawAccum = 0;

  // ── Timed stat modifiers (Buff card, Slots rolls) ──────────────────
  private playerMods: FateMod[] = [];
  private npcMods: FateMod[] = [];

  // ── World objects ─────────────────────────────────────────────────
  private healOrbs: FateHealOrb[] = [];
  private coins: FateCoinToken[] = [];
  private coinPairCounter = 0;
  private slotMachines: FateSlotMachine[] = [];
  private lightningStrikes: FateLightningStrike[] = [];
  private playerAllIn: FateAllIn | null = null;
  private npcAllIn: FateAllIn | null = null;

  // ── Stun (earthStunnedUntil isn't actually consumed by NPC movement or
  // player input anywhere in this codebase, so Lightning enforces its stun
  // itself by zeroing velocity every frame from update()). ─────────────
  private playerStunUntil = 0;
  private npcStunUntil = 0;

  // ── Poison (Infect) ────────────────────────────────────────────────
  private poison = new Map<Fighter, FatePoison>();

  // ── UI: card selection bar ─────────────────────────────────────────
  private barSlots: {
    bg: Phaser.GameObjects.Rectangle;
    icon: Phaser.GameObjects.Text;
    name: Phaser.GameObjects.Text;
  }[] = [];
  private barBounds = { x1: 0, y1: 0, x2: 0, y2: 0 };
  private numberKeys: Phaser.Input.Keyboard.Key[] = [];

  private lastMouseX = 0;
  private lastMouseY = 0;
  private clickWasDown = false;

  constructor(private arena: FateArenaApi) {
    this.reset();
  }

  // ── Lifecycle ─────────────────────────────────────────────────────

  reset(): void {
    this.playerHand = Array.from({ length: HAND_SIZE }, () => drawCard());
    this.npcHand = Array.from({ length: HAND_SIZE }, () => drawCard());
    this.playerSelected = 0;
    this.playerDrawAccum = 0;
    this.npcDrawAccum = 0;

    this.playerMods = [];
    this.npcMods = [];
    this.playerStunUntil = 0;
    this.npcStunUntil = 0;

    for (const o of this.healOrbs) if (o.sprite.active) o.sprite.destroy();
    this.healOrbs = [];
    for (const c of this.coins) if (c.sprite.active) c.sprite.destroy();
    this.coins = [];
    for (const sm of this.slotMachines) { sm.sprite.destroy(); sm.label.destroy(); sm.barBg.destroy(); sm.barFill.destroy(); }
    this.slotMachines = [];
    for (const ls of this.lightningStrikes) if (ls.ring.active) ls.ring.destroy();
    this.lightningStrikes = [];
    if (this.playerAllIn?.sprite.active) this.playerAllIn.sprite.destroy();
    if (this.npcAllIn?.sprite.active) this.npcAllIn.sprite.destroy();
    this.playerAllIn = null;
    this.npcAllIn = null;

    for (const p of this.poison.values()) if (p.visual?.active) p.visual.destroy();
    this.poison.clear();

    this.teardownBar();
    this.buildBar();
    this.setupNumberKeys();

    this.lastMouseX = 0;
    this.lastMouseY = 0;
    this.clickWasDown = false;
  }

  // ── Card selection bar (mirrors Life's seed bar) ──────────────────

  private teardownBar(): void {
    for (const s of this.barSlots) { s.bg.destroy(); s.icon.destroy(); s.name.destroy(); }
    this.barSlots = [];
    this.barBounds = { x1: 0, y1: 0, x2: 0, y2: 0 };
  }

  private buildBar(): void {
    const scene = this.arena.scene;
    const slotW = 60;
    const gap = 8;
    const total = HAND_SIZE * slotW + (HAND_SIZE - 1) * gap;
    const startX = scene.scale.width / 2 - total / 2 + slotW / 2;
    const y = 46;
    this.barBounds = {
      x1: startX - slotW / 2, y1: y - 30,
      x2: startX - slotW / 2 + total, y2: y + 30,
    };

    for (let i = 0; i < HAND_SIZE; i++) {
      const x = startX + i * (slotW + gap);
      const bg = scene.add.rectangle(x, y, slotW, 52, 0x141420, 0.85)
        .setStrokeStyle(2, 0x88eecc, 0.7)
        .setDepth(200)
        .setScrollFactor(0)
        .setInteractive({ useHandCursor: true });
      const icon = scene.add.text(x, y - 8, '', { fontSize: '20px' })
        .setOrigin(0.5).setDepth(201).setScrollFactor(0);
      const name = scene.add.text(x, y + 16, '', { fontSize: '8px', color: '#bbddcc' })
        .setOrigin(0.5).setDepth(201).setScrollFactor(0);
      bg.on('pointerdown', () => {
        if (i < this.playerHand.length) this.playerSelected = i;
      });
      this.barSlots.push({ bg, icon, name });
    }
  }

  private refreshBar(): void {
    for (let i = 0; i < this.barSlots.length; i++) {
      const slot = this.barSlots[i];
      const card = this.playerHand[i];
      if (!card) {
        slot.bg.setVisible(false); slot.icon.setVisible(false); slot.name.setVisible(false);
        continue;
      }
      slot.bg.setVisible(true); slot.icon.setVisible(true); slot.name.setVisible(true);
      const def = DEF_BY_TYPE.get(card.type)!;
      const isSel = i === this.playerSelected;
      const borderColor = card.enchanted ? 0xaa44ff : card.preserved ? 0xffee44 : def.color;
      slot.bg.setFillStyle(isSel ? 0x2a2a44 : 0x141420, isSel ? 0.95 : 0.85);
      slot.bg.setStrokeStyle(isSel ? 3 : 2, borderColor, 1);
      slot.bg.setScale(isSel ? 1.15 : 1);
      slot.icon.setText(def.emoji).setScale(isSel ? 1.2 : 1);
      slot.name.setText(def.name);
      slot.name.setColor(isSel ? '#ffffff' : '#88aa99');
    }
  }

  private setupNumberKeys(): void {
    const kb = this.arena.scene.input.keyboard;
    if (!kb) return;
    const codes = [
      Phaser.Input.Keyboard.KeyCodes.ONE, Phaser.Input.Keyboard.KeyCodes.TWO,
      Phaser.Input.Keyboard.KeyCodes.THREE, Phaser.Input.Keyboard.KeyCodes.FOUR,
      Phaser.Input.Keyboard.KeyCodes.FIVE, Phaser.Input.Keyboard.KeyCodes.SIX,
    ];
    this.numberKeys = codes.map((c) => kb.addKey(c));
  }

  /** True when the pointer is over the card bar — clicks there must never fire an attack. */
  consumedPointer(): boolean {
    const b = this.barBounds;
    return this.lastMouseX >= b.x1 && this.lastMouseX <= b.x2
      && this.lastMouseY >= b.y1 && this.lastMouseY <= b.y2;
  }

  // ── Input (player only) ───────────────────────────────────────────

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    this.lastMouseX = mouseX;
    this.lastMouseY = mouseY;
    if (this.arena.nukeChanneling) { this.clickWasDown = pointer.isDown; return; }

    const player = this.arena.player;

    // ── Number keys: select card by slot ────────────────────────────
    for (let i = 0; i < this.numberKeys.length; i++) {
      if (Phaser.Input.Keyboard.JustDown(this.numberKeys[i]) && i < this.playerHand.length) {
        this.playerSelected = i;
      }
    }

    // ── Right-click: Paper perk card throw ──────────────────────────
    const rightJustDown = pointer.rightButtonDown() && !this.arena.rightPointerWasDown;
    if (rightJustDown && this.arena.hasPerk('paper') && time >= this.paperCooldownUntil) {
      this.doPaperCardThrow(mouseX, mouseY, time);
    }

    // ── Click (hold): throw the highlighted card ────────────────────
    if (pointer.isDown && !this.consumedPointer()) {
      if (player.castAbility('fate-card-throw', FATE_STUB_CTX)) {
        this.doThrowCard(mouseX, mouseY, 'player');
      }
    }
    this.clickWasDown = pointer.isDown;

    // ── F: Enchant ───────────────────────────────────────────────────
    if (Phaser.Input.Keyboard.JustDown(this.arena.fKey)) {
      if (player.castAbility('fate-enchant', FATE_STUB_CTX)) this.doEnchant('player');
    }

    // ── Q: All In ────────────────────────────────────────────────────
    if (Phaser.Input.Keyboard.JustDown(this.arena.qKey)) {
      if (player.castAbility('fate-all-in', FATE_STUB_CTX)) this.doAllIn('player');
    }

    this.refreshBar();
  }

  onEKey(): void {
    if (this.arena.player.castAbility('fate-reroll', FATE_STUB_CTX)) this.doReroll('player');
  }

  onRKey(): void {
    if (this.arena.player.castAbility('fate-preserve', FATE_STUB_CTX)) this.doPreserve('player');
  }

  // ── Public accessors ───────────────────────────────────────────────

  getNpcHandTypes(): FateCardType[] { return this.npcHand.map((c) => c.type); }

  // ── Per-frame update ───────────────────────────────────────────────

  update(time: number, delta: number, isPlayer: boolean, isNpc: boolean): void {
    // Draw timers
    if (isPlayer) {
      this.playerDrawAccum += delta;
      if (this.playerDrawAccum >= DRAW_INTERVAL_MS) {
        this.playerDrawAccum -= DRAW_INTERVAL_MS;
        if (this.playerHand.length < HAND_SIZE) this.playerHand.push(drawCard());
      }
      this.refreshBar();
    }
    if (isNpc) {
      this.npcDrawAccum += delta;
      if (this.npcDrawAccum >= DRAW_INTERVAL_MS) {
        this.npcDrawAccum -= DRAW_INTERVAL_MS;
        if (this.npcHand.length < HAND_SIZE) this.npcHand.push(drawCard());
      }
    }

    // Timed stat modifiers
    if (isPlayer) this.recomputeMods('player', time);
    if (isNpc) this.recomputeMods('npc', time);

    // Stun enforcement
    if (time < this.playerStunUntil) (this.arena.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    if (time < this.npcStunUntil) (this.arena.npc.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);

    // Poison ticks
    this.updatePoison(time, delta);

    // Heal orbs
    this.updateHealOrbs(time);

    // Coins + slot machines share a single pass over active projectiles
    this.updateProjectileInteractions(time);
    this.updateCoins(time, delta);
    this.updateSlotMachines(time);

    // Lightning strikes
    this.updateLightningStrikes(time);

    // All In orbits
    if (this.playerAllIn) this.updateAllIn(this.playerAllIn, time, 'player');
    if (this.npcAllIn) this.updateAllIn(this.npcAllIn, time, 'npc');
  }

  // ── Mods (Buff card, Slots rolls) ─────────────────────────────────

  private addMod(owner: 'player' | 'npc', stat: FateModStat, mult: number, durationMs: number): void {
    const now = this.arena.scene.time.now;
    const list = owner === 'player' ? this.playerMods : this.npcMods;
    list.push({ stat, mult, until: now + durationMs });
  }

  private combinedMult(owner: 'player' | 'npc', stat: FateModStat, time: number): number {
    const list = owner === 'player' ? this.playerMods : this.npcMods;
    let m = 1;
    for (const mod of list) if (mod.stat === stat && mod.until > time) m *= mod.mult;
    return m;
  }

  private recomputeMods(owner: 'player' | 'npc', time: number): void {
    const list = owner === 'player' ? this.playerMods : this.npcMods;
    for (let i = list.length - 1; i >= 0; i--) if (list[i].until <= time) list.splice(i, 1);

    const fighter = owner === 'player' ? this.arena.player : this.arena.npc;
    const speedMult = this.combinedMult(owner, 'speed', time);
    fighter.incomingDamageMultiplier = this.combinedMult(owner, 'dmgTaken', time);
    fighter.cooldownMult = this.combinedMult(owner, 'cd', time);
    const sizeMult = this.combinedMult(owner, 'size', time);
    if (fighter.sizeMult !== sizeMult) { fighter.sizeMult = sizeMult; fighter.applySizeMult(); }

    if (owner === 'player') this.arena.applyPlayerSpeedMult(speedMult);
    else this.arena.applyNpcSpeedMult(speedMult);
  }

  private dmgMultFor(owner: 'player' | 'npc', time: number): number {
    return this.combinedMult(owner, 'dmgDealt', time);
  }

  // ── Card actions ───────────────────────────────────────────────────

  private pickNpcIndex(hand: FateCard[]): number {
    if (hand.length === 0) return -1;
    const hpRatio = this.arena.npc.hp / this.arena.npc.maxHp;
    let bestIdx = 0;
    let bestScore = -Infinity;
    hand.forEach((c, i) => {
      let s = Math.random();
      if (ATTACK_TYPES.includes(c.type)) s += 2;
      if (c.type === 'heal' && hpRatio < 0.5) s += 3;
      if (c.enchanted) s += 1;
      if (s > bestScore) { bestScore = s; bestIdx = i; }
    });
    return bestIdx;
  }

  doThrowCard(tx: number, ty: number, owner: 'player' | 'npc'): void {
    const hand = owner === 'player' ? this.playerHand : this.npcHand;
    const idx = owner === 'player' ? this.playerSelected : this.pickNpcIndex(hand);
    if (idx < 0 || idx >= hand.length) return;
    const card = hand[idx];
    const time = this.arena.scene.time.now;

    this.executeCard(card, tx, ty, owner, time);

    if (card.enchanted) card.enchanted = false;
    if (card.preserved) {
      card.preserved = false;
    } else {
      hand.splice(idx, 1);
      if (owner === 'player' && this.playerSelected >= hand.length) {
        this.playerSelected = Math.max(0, hand.length - 1);
      }
    }
  }

  doReroll(owner: 'player' | 'npc'): void {
    const hand: FateCard[] = Array.from({ length: HAND_SIZE }, () => drawCard());
    if (owner === 'player') this.playerHand = hand; else this.npcHand = hand;
    if (owner === 'player') {
      this.playerSelected = 0;
      this.playerDrawAccum = 0;
      this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 36, '🔄 Reroll!', '#88eecc');
    } else {
      this.npcDrawAccum = 0;
    }
  }

  doPreserve(owner: 'player' | 'npc'): void {
    const hand = owner === 'player' ? this.playerHand : this.npcHand;
    const idx = owner === 'player' ? this.playerSelected : this.pickNpcIndex(hand);
    if (idx < 0 || idx >= hand.length) return;
    hand[idx].preserved = true;
    if (owner === 'player') this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 36, '✨ Preserved!', '#ffee44');
  }

  doEnchant(owner: 'player' | 'npc'): void {
    const hand = owner === 'player' ? this.playerHand : this.npcHand;
    const idx = owner === 'player' ? this.playerSelected : this.pickNpcIndex(hand);
    if (idx < 0 || idx >= hand.length) return;
    hand[idx].enchanted = true;
    if (owner === 'player') this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 36, '🔮 Enchanted!', '#cc88ff');
  }

  private executeCard(card: FateCard, tx: number, ty: number, owner: 'player' | 'npc', time: number): void {
    const mult = card.enchanted ? 2 : 1;
    const dmg = Math.round(BASE_DMG[card.type] * mult * this.dmgMultFor(owner, time));
    switch (card.type) {
      case 'laser': this.castLaser(tx, ty, owner, dmg); break;
      case 'burst': this.castBurst(tx, ty, owner, dmg); break;
      case 'barrier': this.castBarrier(owner, dmg); break;
      case 'explosion': this.castExplosion(tx, ty, owner, dmg); break;
      case 'infect': this.castInfect(tx, ty, owner, dmg, card.enchanted); break;
      case 'coin': this.castCoin(owner, card.enchanted); break;
      case 'heal': this.castHeal(owner, dmg); break;
      case 'buff': this.castBuff(owner, card.enchanted); break;
      case 'lightning': this.castLightning(tx, ty, owner, dmg, card.enchanted ? 4000 : 2000); break;
      case 'slots': this.castSlots(tx, ty, owner, card.enchanted); break;
    }
  }

  private opponentsOf(owner: 'player' | 'npc'): Fighter[] {
    return owner === 'player' ? this.arena.enemies : [this.arena.player];
  }

  // ── Laser ──────────────────────────────────────────────────────────

  private castLaser(tx: number, ty: number, owner: 'player' | 'npc', dmg: number): void {
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const dx = tx - caster.x;
    const dy = ty - caster.y;
    const angle = Math.atan2(dy, dx);
    const range = 1400;
    const endX = caster.x + Math.cos(angle) * range;
    const endY = caster.y + Math.sin(angle) * range;

    let hitAny = false;
    for (const target of this.opponentsOf(owner)) {
      if (!target.active || target.hp <= 0) continue;
      const perpDist = this.pointToSegmentDist(target.x, target.y, caster.x, caster.y, endX, endY);
      const forwardDot = (target.x - caster.x) * Math.cos(angle) + (target.y - caster.y) * Math.sin(angle);
      if (perpDist <= 28 && forwardDot > 0) {
        target.takeDamage(dmg);
        this.arena.spawnHitFlash(target.x, target.y, 0xff3333);
        this.arena.spawnDamageNumber(target.x, target.y - 20, dmg);
        hitAny = true;
      }
    }
    void hitAny;

    const scene = this.arena.scene;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const beam = scene.add.rectangle(caster.x + (endX - caster.x) / 2, caster.y + (endY - caster.y) / 2, range, 4, 0xff3333, 0.9)
      .setRotation(angle).setDepth(9);
    void len;
    scene.tweens.add({ targets: beam, alpha: 0, duration: 180, onComplete: () => beam.destroy() });
  }

  private pointToSegmentDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
    const dx = bx - ax; const dy = by - ay;
    const lenSq = dx * dx + dy * dy || 1;
    let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const cx = ax + t * dx; const cy = ay + t * dy;
    return Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
  }

  // ── Burst ──────────────────────────────────────────────────────────

  private castBurst(tx: number, ty: number, owner: 'player' | 'npc', dmg: number): void {
    const isPlayer = owner === 'player';
    const caster = isPlayer ? this.arena.player : this.arena.npc;
    const baseAngle = Math.atan2(ty - caster.y, tx - caster.x);
    const speed = 480;
    for (const deg of [-24, -12, 0, 12, 24]) {
      const angle = baseAngle + deg * (Math.PI / 180);
      const proj = new Projectile(this.arena.scene, caster.x, caster.y, 'proj-fate-burst', dmg, isPlayer);
      this.arena.projectiles.add(proj);
      proj.launch(Math.cos(angle) * speed, Math.sin(angle) * speed);
      proj.setRotation(angle);
    }
  }

  // ── Barrier ────────────────────────────────────────────────────────

  private castBarrier(owner: 'player' | 'npc', dmg: number): void {
    const isPlayer = owner === 'player';
    const caster = isPlayer ? this.arena.player : this.arena.npc;
    const speed = 380;
    const count = 15;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const proj = new Projectile(this.arena.scene, caster.x, caster.y, 'proj-fate-barrier', dmg, isPlayer);
      this.arena.projectiles.add(proj);
      proj.launch(Math.cos(angle) * speed, Math.sin(angle) * speed);
      proj.setRotation(angle);
    }
  }

  // ── Explosion ──────────────────────────────────────────────────────

  private castExplosion(tx: number, ty: number, owner: 'player' | 'npc', dmg: number): void {
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const scene = this.arena.scene;
    const dist = Phaser.Math.Distance.Between(caster.x, caster.y, tx, ty);
    const travelMs = Math.max(150, (dist / 500) * 1000);

    const bomb = scene.add.circle(caster.x, caster.y, 8, 0xcc2222, 1).setStrokeStyle(2, 0xffaa00).setDepth(8);
    scene.tweens.add({
      targets: bomb, x: tx, y: ty, duration: travelMs,
      onComplete: () => {
        bomb.destroy();
        const radius = 90;
        for (const target of this.opponentsOf(owner)) {
          if (!target.active || target.hp <= 0) continue;
          if (Phaser.Math.Distance.Between(tx, ty, target.x, target.y) <= radius) {
            target.takeDamage(dmg);
            this.arena.spawnDamageNumber(target.x, target.y - 20, dmg);
          }
        }
        const ring = scene.add.circle(tx, ty, 10, 0xff8800, 0.6).setDepth(9);
        scene.tweens.add({ targets: ring, scaleX: radius / 10, scaleY: radius / 10, alpha: 0, duration: 350, onComplete: () => ring.destroy() });
        this.arena.spawnHitFlash(tx, ty, 0xff4400);
      },
    });
  }

  // ── Infect ─────────────────────────────────────────────────────────

  private castInfect(tx: number, ty: number, owner: 'player' | 'npc', dmg: number, enchanted: boolean): void {
    const isPlayer = owner === 'player';
    const caster = isPlayer ? this.arena.player : this.arena.npc;
    const dotDps = enchanted ? 6 : 3;
    for (let i = 0; i < 3; i++) {
      this.arena.scene.time.delayedCall(i * 100, () => {
        if (!caster.active) return;
        const dx = tx - caster.x;
        const dy = ty - caster.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const proj = new Projectile(this.arena.scene, caster.x, caster.y, 'proj-fate-infect', dmg, isPlayer);
        (proj as any).fateInfectDps = dotDps;
        this.arena.projectiles.add(proj);
        proj.launch((dx / len) * 460, (dy / len) * 460);
      });
    }
  }

  /** Called from ArenaScene's hit pipeline when a proj-fate-infect projectile connects. */
  applyPoison(target: Fighter, dps: number, time: number): void {
    let p = this.poison.get(target);
    if (!p) {
      const visual = this.arena.scene.add.text(target.x, target.y - 44, '☠️', { fontSize: '13px' }).setOrigin(0.5).setDepth(10);
      p = { until: 0, dps: 0, tickAccum: 0, visual };
      this.poison.set(target, p);
    }
    p.until = time + 3000;
    p.dps = Math.max(p.dps, dps);
  }

  private updatePoison(time: number, delta: number): void {
    for (const [target, p] of this.poison) {
      if (time > p.until) {
        if (p.visual?.active) p.visual.destroy();
        this.poison.delete(target);
        continue;
      }
      if (p.visual?.active) p.visual.setPosition(target.x, target.y - 44);
      p.tickAccum += delta;
      if (p.tickAccum >= 1000) {
        p.tickAccum -= 1000;
        if (target.active && target.hp > 0) {
          target.takeDamage(p.dps);
          this.arena.spawnDamageNumber(target.x, target.y - 20, p.dps);
        }
      }
    }
  }

  // ── Coin ───────────────────────────────────────────────────────────

  private castCoin(owner: 'player' | 'npc', enchanted: boolean): void {
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const scene = this.arena.scene;
    const time = scene.time.now;
    const count = enchanted ? 2 : 1;
    const pairId = this.coinPairCounter++;
    for (let i = 0; i < count; i++) {
      const sprite = scene.add.image(caster.x + (i - (count - 1) / 2) * 26, caster.y, 'proj-fate-coin').setScale(2.4).setDepth(8);
      this.coins.push({
        sprite, x: sprite.x, y: sprite.y, vy: -260,
        risingUntil: time + 500, expiresAt: time + 6000,
        owner, pairId,
      });
    }
  }

  private updateCoins(time: number, delta: number): void {
    const bottom = this.arena.scene.scale.height - 40;
    const dt = delta / 1000;
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      if (time > c.expiresAt) { c.sprite.destroy(); this.coins.splice(i, 1); continue; }
      if (time < c.risingUntil) {
        c.y += c.vy * dt;
      } else {
        c.vy = 50;
        c.y = Math.min(bottom, c.y + c.vy * dt);
      }
      c.sprite.setPosition(c.x, c.y);
    }
  }

  /** Reflects an owner-matching projectile off a coin into a 2× (4× if paired/enchanted) hitscan laser. */
  private tryReflectOffCoin(proj: Projectile, time: number): boolean {
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      const sameOwner = (c.owner === 'player') === proj.isFromPlayer;
      if (!sameOwner) continue;
      if (Phaser.Math.Distance.Between(proj.x, proj.y, c.x, c.y) > 18) continue;

      const partner = this.coins.find((o, j) => j !== i && o.pairId === c.pairId);
      const damage = proj.damage * (partner ? 4 : 2);
      const caster = c.owner === 'player' ? this.arena.player : this.arena.npc;
      const target = this.opponentsOf(c.owner)[0] ?? (c.owner === 'player' ? this.arena.npc : this.arena.player);

      const scene = this.arena.scene;
      const drawLine = (x1: number, y1: number, x2: number, y2: number) => {
        const midX = (x1 + x2) / 2; const midY = (y1 + y2) / 2;
        const len = Phaser.Math.Distance.Between(x1, y1, x2, y2);
        const ang = Math.atan2(y2 - y1, x2 - x1);
        const line = scene.add.rectangle(midX, midY, len, 3, 0xffee00, 0.95).setRotation(ang).setDepth(9);
        scene.tweens.add({ targets: line, alpha: 0, duration: 220, onComplete: () => line.destroy() });
      };
      if (partner) drawLine(caster.x, caster.y, partner.x, partner.y);
      drawLine(c.x, c.y, target.x, target.y);

      if (target.active && target.hp > 0) {
        target.takeDamage(damage);
        this.arena.spawnHitFlash(target.x, target.y, 0xffee00);
        this.arena.spawnDamageNumber(target.x, target.y - 20, damage);
      }

      const toRemove = partner ? [i, this.coins.indexOf(partner)] : [i];
      toRemove.sort((a, b) => b - a);
      for (const idx of toRemove) { this.coins[idx].sprite.destroy(); this.coins.splice(idx, 1); }
      void time;
      return true;
    }
    return false;
  }

  // ── Heal ───────────────────────────────────────────────────────────

  private castHeal(owner: 'player' | 'npc', amountPerOrb: number): void {
    const scene = this.arena.scene;
    const time = scene.time.now;
    const W = scene.scale.width; const H = scene.scale.height;
    for (let i = 0; i < 12; i++) {
      const x = Phaser.Math.Between(60, W - 60);
      const y = Phaser.Math.Between(90, H - 60);
      const sprite = scene.add.circle(x, y, 8, 0x44dd88, 0.85).setStrokeStyle(2, 0xffffff, 0.6).setDepth(4);
      scene.tweens.add({ targets: sprite, y: y - 10, yoyo: true, repeat: -1, duration: 700 });
      this.healOrbs.push({ sprite, x, y, owner, expiresAt: time + 8000 });
      (sprite as any).fateHealAmount = amountPerOrb;
    }
  }

  private updateHealOrbs(time: number): void {
    for (let i = this.healOrbs.length - 1; i >= 0; i--) {
      const o = this.healOrbs[i];
      if (time > o.expiresAt) { o.sprite.destroy(); this.healOrbs.splice(i, 1); continue; }
      const fighter = o.owner === 'player' ? this.arena.player : this.arena.npc;
      if (Phaser.Math.Distance.Between(fighter.x, fighter.y, o.x, o.y) <= 24) {
        const amount = (o.sprite as any).fateHealAmount ?? 8;
        fighter.heal(amount);
        this.arena.showFloatingText(o.x, o.y - 16, `+${amount} HP`, '#44dd88');
        o.sprite.destroy();
        this.healOrbs.splice(i, 1);
      }
    }
  }

  // ── Buff ───────────────────────────────────────────────────────────

  private castBuff(owner: 'player' | 'npc', enchanted: boolean): void {
    const pct = enchanted ? 0.20 : 0.10;
    const duration = 8000;
    this.addMod(owner, 'speed', 1 + pct, duration);
    this.addMod(owner, 'dmgDealt', 1 + pct, duration);
    this.addMod(owner, 'dmgTaken', 1 - pct, duration);
    if (owner === 'player') this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 36, `💪 +${Math.round(pct * 100)}%`, '#dd88ff');
  }

  // ── Lightning ──────────────────────────────────────────────────────

  private castLightning(tx: number, ty: number, owner: 'player' | 'npc', dmg: number, stunMs: number): void {
    const scene = this.arena.scene;
    const ring = scene.add.circle(tx, ty, 70, 0xffee44, 0.25).setStrokeStyle(2, 0xffee44, 0.9).setDepth(6);
    scene.tweens.add({ targets: ring, alpha: 0.5, yoyo: true, repeat: -1, duration: 300 });
    this.lightningStrikes.push({ ring, x: tx, y: ty, owner, dmg, stunMs, resolveAt: scene.time.now + 2000 });
  }

  private updateLightningStrikes(time: number): void {
    for (let i = this.lightningStrikes.length - 1; i >= 0; i--) {
      const s = this.lightningStrikes[i];
      if (time < s.resolveAt) continue;
      s.ring.destroy();
      this.lightningStrikes.splice(i, 1);

      const scene = this.arena.scene;
      const bolt = scene.add.rectangle(s.x, Math.max(0, s.y - 200), 6, 400, 0xffffaa, 0.95).setDepth(11);
      scene.tweens.add({ targets: bolt, alpha: 0, duration: 200, onComplete: () => bolt.destroy() });
      this.arena.spawnHitFlash(s.x, s.y, 0xffee44);

      for (const target of this.opponentsOf(s.owner)) {
        if (!target.active || target.hp <= 0) continue;
        if (Phaser.Math.Distance.Between(s.x, s.y, target.x, target.y) <= 70) {
          target.takeDamage(s.dmg);
          this.arena.spawnDamageNumber(target.x, target.y - 20, s.dmg);
          if (target === this.arena.player) this.playerStunUntil = Math.max(this.playerStunUntil, time + s.stunMs);
          else this.npcStunUntil = Math.max(this.npcStunUntil, time + s.stunMs);
          this.arena.showFloatingText(target.x, target.y - 40, '⚡ STUNNED', '#ffee44');
        }
      }
    }
  }

  // ── Slots ──────────────────────────────────────────────────────────

  private castSlots(tx: number, ty: number, owner: 'player' | 'npc', enchanted: boolean): void {
    const scene = this.arena.scene;
    const time = scene.time.now;
    const count = enchanted ? 2 : 1;
    for (let i = 0; i < count; i++) {
      const ownSame = this.slotMachines.filter((sm) => sm.owner === owner);
      if (ownSame.length >= 2) {
        const oldest = ownSame[0];
        const idx = this.slotMachines.indexOf(oldest);
        oldest.sprite.destroy(); oldest.label.destroy(); oldest.barBg.destroy(); oldest.barFill.destroy();
        this.slotMachines.splice(idx, 1);
      }
      const x = tx + (i - (count - 1) / 2) * 50;
      const y = ty;
      const sprite = scene.add.circle(x, y, 22, 0xff66cc, 0.65).setStrokeStyle(2, 0xffcc44, 0.9).setDepth(2);
      const label = scene.add.text(x, y, '🎰', { fontSize: '18px' }).setOrigin(0.5).setDepth(3);
      const barBg = scene.add.rectangle(x, y - 32, 40, 5, 0x222222, 0.8).setDepth(3);
      const barFill = scene.add.rectangle(x - 20, y - 32, 0, 5, 0xffee00, 0.95).setOrigin(0, 0.5).setDepth(4);
      this.slotMachines.push({ sprite, label, barBg, barFill, x, y, owner, cycleDmgPlayer: 0, cycleDmgNpc: 0, cycleEnd: time + 10000 });
    }
  }

  private updateSlotMachines(time: number): void {
    for (const sm of this.slotMachines) {
      const total = sm.cycleDmgPlayer + sm.cycleDmgNpc;
      sm.barFill.setSize(Math.min(40, (total / 50) * 40), 5);
      if (time < sm.cycleEnd) continue;

      sm.cycleEnd = time + 10000;
      if (total <= 0) { sm.cycleDmgPlayer = 0; sm.cycleDmgNpc = 0; continue; }

      const winner: 'player' | 'npc' = sm.cycleDmgPlayer >= sm.cycleDmgNpc ? 'player' : 'npc';
      const fighter = winner === 'player' ? this.arena.player : this.arena.npc;
      const isBuff = total >= 25;
      const pct = total >= 50 ? 0.35 : 0.15;
      const stat: FateModStat = (['dmgTaken', 'speed', 'size', 'cd', 'dmgDealt'] as FateModStat[])[Math.floor(Math.random() * 5)];
      const mult = isBuff
        ? (stat === 'dmgTaken' ? 1 - pct : stat === 'size' ? 1 - pct : stat === 'cd' ? 1 - pct : 1 + pct)
        : (stat === 'dmgTaken' ? 1 + pct : stat === 'size' ? 1 + pct : stat === 'cd' ? 1 + pct : stat === 'dmgDealt' ? 1 - pct : 1 - pct);
      this.addMod(winner, stat, mult, 10000);

      const label = isBuff ? (total >= 50 ? `🎰 JACKPOT +${Math.round(pct * 100)}%!` : `🎰 +${Math.round(pct * 100)}%`) : `🎰 -${Math.round(pct * 100)}%`;
      this.arena.showFloatingText(fighter.x, fighter.y - 40, label, isBuff ? '#ffee00' : '#ff6666');
      sm.cycleDmgPlayer = 0;
      sm.cycleDmgNpc = 0;
    }
  }

  // ── Shared projectile-interaction pass (coins + slot machines) ────

  private updateProjectileInteractions(time: number): void {
    if (this.coins.length === 0 && this.slotMachines.length === 0) return;
    const children = this.arena.projectiles.getChildren() as Projectile[];
    for (const proj of children) {
      if (!proj.active) continue;
      if (this.coins.length > 0 && this.tryReflectOffCoin(proj, time)) {
        proj.setActive(false).setVisible(false);
        (proj.body as Phaser.Physics.Arcade.Body).stop();
        continue;
      }
      for (const sm of this.slotMachines) {
        if (Phaser.Math.Distance.Between(proj.x, proj.y, sm.x, sm.y) > 26) continue;
        if (proj.isFromPlayer) sm.cycleDmgPlayer += proj.damage; else sm.cycleDmgNpc += proj.damage;
        this.arena.spawnHitFlash(sm.x, sm.y, 0xffcc44);
        proj.setActive(false).setVisible(false);
        (proj.body as Phaser.Physics.Arcade.Body).stop();
        break;
      }
    }
  }

  // ── All In (Q) ─────────────────────────────────────────────────────

  doAllIn(owner: 'player' | 'npc'): void {
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const scene = this.arena.scene;
    const sprite = scene.add.circle(caster.x + 100, caster.y, 50, 0xffcc44, 0.4).setStrokeStyle(3, 0xffaa00, 0.9).setDepth(6);
    const allIn: FateAllIn = { sprite, owner, activatesAt: scene.time.now + 3000, orbitAngle: 0 };
    if (owner === 'player') this.playerAllIn = allIn; else this.npcAllIn = allIn;
    this.arena.showFloatingText(caster.x, caster.y - 36, '🎰 All In! (50 HP)', '#ffcc44');
  }

  private updateAllIn(allIn: FateAllIn, time: number, owner: 'player' | 'npc'): void {
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const orbitR = 100;
    if (owner === 'player') {
      const dx = this.lastMouseX - caster.x;
      const dy = this.lastMouseY - caster.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      allIn.orbitAngle = Math.atan2(dy / len, dx / len);
    }
    const ax = caster.x + Math.cos(allIn.orbitAngle) * orbitR;
    const ay = caster.y + Math.sin(allIn.orbitAngle) * orbitR;
    allIn.sprite.setPosition(ax, ay);

    if (time < allIn.activatesAt) return;

    const target = owner === 'player' ? this.arena.npc : this.arena.player;
    const hitRadius = allIn.sprite.width / 2;
    const hit = Phaser.Math.Distance.Between(ax, ay, target.x, target.y) <= hitRadius;
    if (hit) {
      target.takeDamage(50);
      caster.heal(75);
      this.arena.spawnHitFlash(target.x, target.y, 0xffcc44);
      this.arena.showFloatingText(caster.x, caster.y - 50, '🎰 HIT! +75 HP', '#ffee44');
    } else {
      caster.applySelfDamage(50);
      this.arena.showFloatingText(caster.x, caster.y - 50, '🎰 MISS! -50 HP', '#ff8888');
    }

    allIn.sprite.setFillStyle(hit ? 0xffee00 : 0x333333, 0.7);
    this.arena.scene.tweens.add({
      targets: allIn.sprite, scaleX: 2, scaleY: 2, alpha: 0, duration: 500,
      onComplete: () => allIn.sprite.destroy(),
    });
    if (owner === 'player') this.playerAllIn = null; else this.npcAllIn = null;
  }

  // ── Paper perk (right-click poker hand throw) ─────────────────────

  private paperCooldownUntil = 0;

  private evaluatePokerHand(cards: { rank: number; suit: number }[]): { name: string; dmg: number } {
    const ranks = cards.map((c) => c.rank).sort((a, b) => a - b);
    const suits = cards.map((c) => c.suit);
    const rankCounts: Record<number, number> = {};
    for (const r of ranks) rankCounts[r] = (rankCounts[r] ?? 0) + 1;
    const counts = Object.values(rankCounts).sort((a, b) => b - a);
    const isFlush = suits.every((s) => s === suits[0]);
    const isStrRanks = ranks[4] - ranks[0] === 4 && counts[0] === 1;
    const isWheelStraight = JSON.stringify(ranks) === JSON.stringify([2, 3, 4, 5, 14]);
    const isStraight = isStrRanks || isWheelStraight;
    const isRoyal = isFlush && JSON.stringify(ranks) === JSON.stringify([10, 11, 12, 13, 14]);

    if (isRoyal) return { name: 'ROYAL FLUSH!', dmg: 40 };
    if (isFlush && isStraight) return { name: 'STRAIGHT FLUSH!', dmg: 30 };
    if (counts[0] === 4) return { name: 'FOUR OF A KIND!', dmg: 20 };
    if (counts[0] === 3 && counts[1] === 2) return { name: 'FULL HOUSE!', dmg: 14 };
    if (isFlush) return { name: 'FLUSH!', dmg: 10 };
    if (isStraight) return { name: 'STRAIGHT!', dmg: 8 };
    if (counts[0] === 3) return { name: 'THREE OF A KIND!', dmg: 6 };
    if (counts[0] === 2 && counts[1] === 2) return { name: 'TWO PAIR!', dmg: 4 };
    if (counts[0] === 2) return { name: 'PAIR!', dmg: 2 };
    return { name: 'HIGH CARD', dmg: 1 };
  }

  private doPaperCardThrow(tx: number, ty: number, time: number): void {
    const scene = this.arena.scene;
    const player = this.arena.player;
    const RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
    const cards: { rank: number; suit: number }[] = [];
    for (let i = 0; i < 5; i++) {
      cards.push({ rank: RANKS[Math.floor(Math.random() * RANKS.length)], suit: Math.floor(Math.random() * 4) });
    }
    const { name, dmg } = this.evaluatePokerHand(cards);
    const baseAngle = Math.atan2(ty - player.y, tx - player.x);
    for (const deg of [-24, -12, 0, 12, 24]) {
      const angle = baseAngle + deg * (Math.PI / 180);
      const proj = new Projectile(scene, player.x, player.y, 'proj-fate-card', dmg, true);
      this.arena.projectiles.add(proj);
      proj.launch(Math.cos(angle) * 500, Math.sin(angle) * 500);
      proj.setRotation(angle);
    }
    this.arena.showFloatingText(player.x, player.y - 48, `🃏 ${name} ×${dmg}`, '#eeddbb');
    this.paperCooldownUntil = time + 2000;
  }
}
