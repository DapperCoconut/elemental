import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { Projectile } from '../../combat/Projectile';
import type { CastContext } from '../Ability';

// Stub context passed to castAbility() so that cast() calls become no-ops.
// FateKit handles the real logic itself; cast() just needs to not throw.
const FATE_STUB_CTX: CastContext = new Proxy({} as CastContext, {
  get: (_t, _k) => () => {},
});

// ── Slots buff types (exported for ArenaScene to use in speed/cd calc) ───────

export type FateSlotsBuffKey = 'speed+' | 'speed-' | 'hp+' | 'hp-' | 'dr+' | 'dr-' | 'cd-' | 'cd+' | 'size-' | 'size+' | 'crit+' | 'critRx+';
export interface FateSlotsBuff { key: FateSlotsBuffKey; }

export const FATE_SLOTS_GOOD_KEYS: FateSlotsBuffKey[] = ['speed+', 'hp+', 'dr+', 'cd-', 'size-', 'crit+'];
export const FATE_SLOTS_BAD_KEYS: FateSlotsBuffKey[] = ['speed-', 'hp-', 'dr-', 'cd+', 'size+', 'critRx+'];
const FATE_SLOTS_ALL_KEYS: FateSlotsBuffKey[] = [...FATE_SLOTS_GOOD_KEYS, ...FATE_SLOTS_BAD_KEYS];

export const FATE_SLOTS_BUFF_LABELS: Record<FateSlotsBuffKey, string> = {
  'speed+': '+15% Speed',   'speed-': '-10% Speed',
  'hp+':    '+15 Max HP',   'hp-':    '-10 Max HP',
  'dr+':    '10% DMG Red',  'dr-':    '+10% DMG Taken',
  'cd-':    '-10% CD',      'cd+':    '+10% CD',
  'size-':  '-15% Size',    'size+':  '+15% Size',
  'crit+':  '+15% Crit',    'critRx+': '+15% Crit Taken',
};

// ── Arena API ────────────────────────────────────────────────────────────────

export interface FateArenaApi {
  get player(): Fighter;
  get npc(): Fighter;
  get scene(): Phaser.Scene;
  get projectiles(): Phaser.Physics.Arcade.Group;
  get spaceKey(): Phaser.Input.Keyboard.Key;
  get fKey(): Phaser.Input.Keyboard.Key;
  get qKey(): Phaser.Input.Keyboard.Key;
  get nukeChanneling(): boolean;
  hasUpgrade(slot: string): boolean;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  dealAoeDamageToNpc(cx: number, cy: number, radius: number, damage: number): void;
  dealAoeDamageToPlayer(cx: number, cy: number, radius: number, damage: number): void;
  /** Write back to ArenaScene's playerFateBaseSpeedMult (used in speed calc loop). */
  setPlayerFateSpeedMult(mult: number): void;
  getPlayerFateSpeedMult(): number;
  getNpcBaseHp(): number;
}

// ── Internal types ───────────────────────────────────────────────────────────

interface SlotMachine {
  sprite: Phaser.GameObjects.Arc;
  label: Phaser.GameObjects.Text;
  coinBar: Phaser.GameObjects.Rectangle | null;
  x: number;
  y: number;
  owner: 'player' | 'npc';
  isSpinning: boolean;
  spinStartAt: number;
  storedCoins: number;
  autoSpinAt: number;
}

interface CoinPile {
  sprite: Phaser.GameObjects.Arc;
  x: number;
  y: number;
  expiresAt: number;
}

interface AutoAimCoin {
  proj: Projectile;
  owner: 'player' | 'npc';
}

interface AllInCircle {
  sprite: Phaser.GameObjects.Arc;
  owner: 'player' | 'npc';
  activatesAt: number;
  coinsBet: number;
  orbitAngle: number;
}

// ── Kit class ────────────────────────────────────────────────────────────────

export class FateKit {
  // ── Coin economy ──────────────────────────────────────────────────
  private playerCoins = 5;
  private npcCoins = 5;
  private playerCoinAccum = 0;
  private npcCoinAccum = 0;
  private coinHud: Phaser.GameObjects.Text | null = null;

  // ── Lucky state ───────────────────────────────────────────────────
  private playerLucky: 'coin-toss' | 'slots' | 'dice' | 'all-in' | null = null;
  private npcLucky: 'coin-toss' | 'slots' | 'dice' | 'all-in' | null = null;
  private playerLuckyPending = false;
  private playerLuckyIcon: Phaser.GameObjects.Text | null = null;

  // ── Slot machines ─────────────────────────────────────────────────
  private playerSlotMachines: SlotMachine[] = [];
  private npcSlotMachines: SlotMachine[] = [];
  private spaceWasDown = false;
  private playerSpinCandidateAt = 0; // time when nearby slot was detected

  // ── Slots buffs ───────────────────────────────────────────────────
  private playerSlotsBuffs: FateSlotsBuff[] = [];
  private npcSlotsBuffs: FateSlotsBuff[] = [];

  // ── Auto-aim coins ────────────────────────────────────────────────
  private autoAimCoins: AutoAimCoin[] = [];

  // ── All In circle ─────────────────────────────────────────────────
  private playerAllIn: AllInCircle | null = null;
  private npcAllIn: AllInCircle | null = null;
  private lastMouseX = 0;
  private lastMouseY = 0;

  // ── Upgrade state ─────────────────────────────────────────────────
  private debtCoins = 0;
  // Oozing Luck (R+)
  private oozingLuckUntil = 0;
  private oozingLuckCooldownUntil = 0;
  private oozingLuckPrevAbsorber: Fighter['damageAbsorber'] = null;
  private oozingLuckCoinAccum = 0;
  // Slot feeder (E+)
  private feedAccum = 0;
  // Loaded dice (F+)
  private fWasDown = false;
  private fHoldStart = 0;
  private fHoldVisual: Phaser.GameObjects.Arc | null = null;
  // Bet-typing all-in (Q+)
  private qBetActive = false;
  private currentBet = 0;
  private qBetString = '';
  private qBetKeyHandler: ((e: KeyboardEvent) => void) | null = null;
  private qBetText: Phaser.GameObjects.Text | null = null;
  private qWasDown = false;
  // Coin piles (R+)
  private coinPiles: CoinPile[] = [];

  constructor(private arena: FateArenaApi) {}

  // ── Public accessors ──────────────────────────────────────────────

  getPlayerCoins(): number { return this.playerCoins; }
  getNpcCoins(): number { return this.npcCoins; }
  getPlayerSlotsBuffs(): FateSlotsBuff[] { return this.playerSlotsBuffs; }
  getNpcSlotsBuffs(): FateSlotsBuff[] { return this.npcSlotsBuffs; }
  getPlayerSlotMachines(): SlotMachine[] { return this.playerSlotMachines; }
  getNpcSlotMachines(): SlotMachine[] { return this.npcSlotMachines; }
  isNpcLucky(): boolean { return this.npcLucky !== null; }

  // ── Lifecycle ─────────────────────────────────────────────────────

  reset(): void {
    this.playerCoins = 5;
    this.npcCoins = 5;
    this.playerCoinAccum = 0;
    this.npcCoinAccum = 0;
    if (this.coinHud?.active) this.coinHud.destroy();
    this.coinHud = null;

    this.playerLucky = null;
    this.npcLucky = null;
    this.playerLuckyPending = false;
    if (this.playerLuckyIcon?.active) this.playerLuckyIcon.destroy();
    this.playerLuckyIcon = null;

    for (const sm of this.playerSlotMachines) { sm.sprite.destroy(); sm.label.destroy(); }
    for (const sm of this.npcSlotMachines) { sm.sprite.destroy(); sm.label.destroy(); }
    this.playerSlotMachines = [];
    this.npcSlotMachines = [];
    this.spaceWasDown = false;
    this.playerSpinCandidateAt = 0;

    this.playerSlotsBuffs = [];
    this.npcSlotsBuffs = [];
    this.autoAimCoins = [];

    if (this.playerAllIn) { if (this.playerAllIn.sprite.active) this.playerAllIn.sprite.destroy(); this.playerAllIn = null; }
    if (this.npcAllIn) { if (this.npcAllIn.sprite.active) this.npcAllIn.sprite.destroy(); this.npcAllIn = null; }

    this.debtCoins = 0;
    this.oozingLuckUntil = 0;
    this.oozingLuckCooldownUntil = 0;
    this.oozingLuckPrevAbsorber = null;
    this.oozingLuckCoinAccum = 0;
    this.feedAccum = 0;
    this.fWasDown = false;
    this.fHoldStart = 0;
    if (this.fHoldVisual?.active) this.fHoldVisual.destroy();
    this.fHoldVisual = null;
    if (this.qBetKeyHandler) {
      this.arena.scene.input.keyboard?.off('keydown', this.qBetKeyHandler);
      this.qBetKeyHandler = null;
    }
    this.qBetActive = false;
    this.currentBet = 0;
    this.qBetString = '';
    if (this.qBetText?.active) this.qBetText.destroy();
    this.qBetText = null;
    this.qWasDown = false;
    this.coinPiles.forEach(p => { if (p.sprite.active) p.sprite.destroy(); });
    this.coinPiles = [];
  }

  // ── Input (player only) ───────────────────────────────────────────

  handleInput(
    time: number,
    pointer: Phaser.Input.Pointer,
    mouseX: number,
    mouseY: number,
  ): void {
    this.lastMouseX = mouseX;
    this.lastMouseY = mouseY;
    if (this.arena.nukeChanneling) {
      this.spaceWasDown = this.arena.spaceKey.isDown;
      return;
    }
    const player = this.arena.player;

    // ── Click: Coin Toss ────────────────────────────────────────────
    if (pointer.isDown) {
      const ctx = FATE_STUB_CTX;
      if (player.castAbility('fate-coin-toss', ctx)) {
        this.doCoinToss(mouseX, mouseY, 'player');
      }
    }

    // ── Space: spin / feed slot machine ────────────────────────────
    const spaceDown = this.arena.spaceKey.isDown;
    const nearSlot = this.findNearestOwnSlot('player', 80);
    if (this.arena.hasUpgrade('e') && spaceDown && nearSlot) {
      // E+: hold Space to feed coins into machine
      this.feedAccum += time - (this.spaceWasDown ? 0 : -16); // approximate delta
      if (!this.spaceWasDown) this.feedAccum = 0; // reset on fresh press
    }
    if (spaceDown && !this.spaceWasDown) {
      // Just pressed space
      if (nearSlot && !nearSlot.isSpinning) {
        if (!this.arena.hasUpgrade('e')) {
          // Base: just spin
          if (this.playerCoins >= 1) {
            this.playerCoins -= 1;
            nearSlot.isSpinning = true;
            nearSlot.spinStartAt = time;
            this.arena.showFloatingText(nearSlot.x, nearSlot.y - 30, '🎰 Spinning...', '#ffcc44');
          } else {
            this.arena.showFloatingText(player.x, player.y - 30, '💸 Not enough coins!', '#ff8888');
          }
        }
        // E+: feeding starts on hold, handled below
      }
    }
    // E+: feed coins while holding Space near a machine
    if (this.arena.hasUpgrade('e') && spaceDown && nearSlot) {
      this.feedAccum += 16; // ~1 frame worth; actual delta not passed, use approx
      if (this.feedAccum >= 500) {
        this.feedAccum -= 500;
        if (this.playerCoins >= 2) {
          this.playerCoins -= 2;
          nearSlot.storedCoins += 2;
          this.arena.showFloatingText(nearSlot.x, nearSlot.y - 20, '+2🪙', '#ffcc44');
        }
      }
    } else if (!spaceDown) {
      this.feedAccum = 0;
    }
    this.spaceWasDown = spaceDown;

    // ── F: Dice (tap) or Loaded Dice (hold 1s, F+) ─────────────────
    const fDown = this.arena.fKey.isDown;
    if (fDown && !this.fWasDown) {
      this.fHoldStart = time;
    }
    if (!fDown && this.fWasDown) {
      // F released
      const holdMs = time - this.fHoldStart;
      if (this.arena.hasUpgrade('f') && holdMs >= 1000 && this.playerCoins >= 5) {
        // Loaded dice
        this.playerCoins -= 5;
        this.doLoadedDice(mouseX, mouseY);
      } else {
        // Normal dice tap
        if (player.castAbility('fate-dice', FATE_STUB_CTX)) {
          this.doDice(mouseX, mouseY, 'player');
        }
      }
      this.fHoldStart = 0;
      if (this.fHoldVisual?.active) { this.fHoldVisual.destroy(); this.fHoldVisual = null; }
    }
    this.fWasDown = fDown;

    // ── Q: All-In or Bet-Typing All-In (Q+) ────────────────────────
    const qDown = this.arena.qKey.isDown;
    if (qDown && !this.qWasDown) {
      // Q pressed
      if (this.arena.hasUpgrade('q')) {
        this.startQBet();
      } else {
        if (player.castAbility('fate-all-in', FATE_STUB_CTX)) this.doAllIn('player');
      }
    }
    if (!qDown && this.qWasDown && this.arena.hasUpgrade('q') && this.qBetActive) {
      // Q released in bet mode
      this.fireQBet(mouseX, mouseY);
    }
    this.qWasDown = qDown;
  }

  /** Called from ArenaScene's fate handleInput when E key is pressed */
  onEKey(mouseX: number, mouseY: number): void {
    const player = this.arena.player;
    if (player.castAbility('fate-slots', FATE_STUB_CTX)) {
      this.doSpawnSlotMachine(mouseX, mouseY, 'player');
    }
  }

  onRKey(): void {
    const player = this.arena.player;
    const now = this.arena.scene.time.now;
    // R+: casting R while lucky is active triggers Oozing Luck
    if (this.arena.hasUpgrade('r') && (this.playerLucky !== null || this.playerLuckyPending)
        && now >= this.oozingLuckCooldownUntil && this.oozingLuckUntil <= now) {
      this.enterOozingLuck(now);
      return;
    }
    if (player.castAbility('fate-luck', FATE_STUB_CTX)) {
      this.doLuck('player');
    }
  }

  onFKey(mouseX: number, mouseY: number): void {
    const player = this.arena.player;
    if (player.castAbility('fate-dice', FATE_STUB_CTX)) {
      this.doDice(mouseX, mouseY, 'player');
    }
  }

  onQKey(): void {
    const player = this.arena.player;
    if (player.castAbility('fate-all-in', FATE_STUB_CTX)) {
      this.doAllIn('player');
    }
  }

  // ── Per-frame update ──────────────────────────────────────────────

  update(time: number, delta: number, isPlayer: boolean, isNpc: boolean): void {
    // Coin income
    if (isPlayer) {
      this.playerCoinAccum += delta;
      if (this.playerCoinAccum >= 5000) {
        this.playerCoinAccum -= 5000;
        this.grantCoins(1);
      }
    }
    if (isNpc) {
      this.npcCoinAccum += delta;
      if (this.npcCoinAccum >= 5000) {
        this.npcCoinAccum -= 5000;
        this.npcCoins++;
      }
    }

    // Coin HUD
    if (isPlayer) {
      const debtSuffix = this.debtCoins > 0 ? ` [−${this.debtCoins}]` : '';
      const hudText = `🪙 ${this.playerCoins}${debtSuffix}`;
      if (!this.coinHud || !this.coinHud.active) {
        this.coinHud = this.arena.scene.add.text(
          this.arena.scene.scale.width / 2, 10, hudText,
          { fontSize: '18px', color: '#ffcc00', fontFamily: 'Arial Black', stroke: '#000000', strokeThickness: 3 },
        ).setOrigin(0.5, 0).setDepth(20).setScrollFactor(0);
      } else {
        this.coinHud.setText(hudText);
        this.coinHud.setColor(this.debtCoins > 0 ? '#ff8844' : '#ffcc00');
      }
    }

    // Lucky icon
    if (isPlayer) this.updateLuckyIcon();

    // Slot machine updates
    if (isPlayer) this.updateSlotMachines(this.playerSlotMachines, 'player', time);
    if (isNpc) this.updateSlotMachines(this.npcSlotMachines, 'npc', time);

    // NPC slot machine auto-spin
    if (isNpc) this.updateNpcSlotSpin(time);

    // Auto-aim coins
    this.updateAutoAimCoins(delta);

    // All In circles
    if (isPlayer && this.playerAllIn) this.updateAllIn(this.playerAllIn, time, 'player');
    if (isNpc && this.npcAllIn) this.updateAllIn(this.npcAllIn, time, 'npc');

    // Oozing Luck (R+)
    if (isPlayer && time < this.oozingLuckUntil) {
      this.oozingLuckCoinAccum += delta;
      if (this.oozingLuckCoinAccum >= 1000) {
        this.oozingLuckCoinAccum -= 1000;
        if (Math.random() < 0.20) this.spawnCoinPile(time);
      }
    } else if (isPlayer && this.oozingLuckUntil > 0 && time >= this.oozingLuckUntil) {
      this.exitOozingLuck();
      this.oozingLuckUntil = -1;
    }

    // Coin pile overlap check
    if (isPlayer) {
      for (let i = this.coinPiles.length - 1; i >= 0; i--) {
        const pile = this.coinPiles[i];
        if (time > pile.expiresAt) {
          pile.sprite.destroy();
          this.coinPiles.splice(i, 1);
          continue;
        }
        const player = this.arena.player;
        if (Phaser.Math.Distance.Between(player.x, player.y, pile.x, pile.y) <= 24) {
          this.grantCoins(2);
          this.arena.showFloatingText(pile.x, pile.y - 16, '+2 🪙', '#ffcc00');
          pile.sprite.destroy();
          this.coinPiles.splice(i, 1);
        }
      }
    }

    // F hold visual update
    if (isPlayer && this.fHoldStart > 0) {
      const ratio = Math.min(1, (time - this.fHoldStart) / 1000);
      const player = this.arena.player;
      if (!this.fHoldVisual || !this.fHoldVisual.active) {
        const scene = this.arena.scene;
        this.fHoldVisual = scene.add.arc(player.x, player.y, 22, 270, 270, false, 0xff4444, 0.6).setDepth(15);
      }
      this.fHoldVisual.setPosition(player.x, player.y);
      this.fHoldVisual.setEndAngle(270 + ratio * 360);
    }

    // Q bet text follow player
    if (isPlayer && this.qBetActive && this.qBetText?.active) {
      this.qBetText.setPosition(this.arena.player.x, this.arena.player.y - 50);
    }
  }

  // ── Ability implementations ───────────────────────────────────────

  doCoinToss(tx: number, ty: number, owner: 'player' | 'npc'): void {
    const isPlayer = owner === 'player';
    if (isPlayer && this.playerLuckyPending) { this.playerLucky = 'coin-toss'; this.playerLuckyPending = false; }
    const coins = isPlayer ? this.playerCoins : this.npcCoins;
    if (coins < 2) {
      // H.1: loan when 0 coins, Click+ owned, no existing debt
      if (isPlayer && this.arena.hasUpgrade('click') && this.playerCoins === 0 && this.debtCoins === 0) {
        this.playerCoins += 5;
        this.debtCoins = 3;
        this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 30, '+5 LOAN (−3 debt)', '#ffcc44');
      } else {
        if (isPlayer) this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 30, '💸 Need 2 coins!', '#ff8888');
        return;
      }
    }
    if (isPlayer) this.playerCoins -= 2;
    else this.npcCoins -= 2;

    const caster = isPlayer ? this.arena.player : this.arena.npc;
    const autoAim = isPlayer ? this.playerLucky === 'coin-toss' : this.npcLucky === 'coin-toss';
    if (autoAim) {
      if (isPlayer) this.playerLucky = null;
      else this.npcLucky = null;
    }

    const dx = tx - caster.x;
    const dy = ty - caster.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;

    for (let i = 0; i < 3; i++) {
      this.arena.scene.time.delayedCall(i * 300, () => {
        const spread = (i - 1) * 12;
        const perpX = -dy / len;
        const perpY = dx / len;
        const ox = caster.x + perpX * spread;
        const oy = caster.y + perpY * spread;
        const coin = new Projectile(this.arena.scene, ox, oy, 'proj-fate-coin', 8, isPlayer);
        (coin as any).fateAutoAim = autoAim;
        (coin as any).fateCoinOwner = owner;
        this.arena.projectiles.add(coin);
        coin.launch((dx / len) * 480, (dy / len) * 480);
        if (autoAim) {
          this.autoAimCoins.push({ proj: coin, owner });
        }
      });
    }
  }

  doSpawnSlotMachine(x: number, y: number, owner: 'player' | 'npc'): void {
    if (owner === 'player' && this.playerLuckyPending) { this.playerLucky = 'slots'; this.playerLuckyPending = false; }
    const list = owner === 'player' ? this.playerSlotMachines : this.npcSlotMachines;
    if (list.length >= 2) {
      const oldest = list.shift()!;
      oldest.sprite.destroy();
      oldest.label.destroy();
    }
    const scene = this.arena.scene;
    const sprite = scene.add.circle(x, y, 24, 0xffcc44, 0.7)
      .setStrokeStyle(2, 0xff88cc, 0.9).setDepth(2);
    scene.tweens.add({ targets: sprite, scaleX: 1.06, scaleY: 1.06, alpha: 0.55, yoyo: true, repeat: -1, duration: 900 });
    const label = scene.add.text(x, y, '🎰', { fontSize: '20px' }).setOrigin(0.5).setDepth(3);
    list.push({ sprite, label, coinBar: null, x, y, owner, isSpinning: false, spinStartAt: 0, storedCoins: 0, autoSpinAt: 0 });
    this.arena.showFloatingText(x, y - 30, '🎰 Placed!', '#ffcc44');
  }

  doLuck(owner: 'player' | 'npc'): void {
    if (owner === 'npc') {
      this.npcLucky = 'slots';
      return;
    }
    this.playerLuckyPending = true;
    this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 40, '🍀 Lucky!', '#44ffcc');
  }

  doDice(tx: number, ty: number, owner: 'player' | 'npc'): void {
    const isPlayer = owner === 'player';
    if (isPlayer && this.playerLuckyPending) { this.playerLucky = 'dice'; this.playerLuckyPending = false; }
    const coins = isPlayer ? this.playerCoins : this.npcCoins;
    if (coins < 3) {
      if (isPlayer) this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 30, '💸 Need 3 coins!', '#ff8888');
      return;
    }
    if (isPlayer) this.playerCoins -= 3;
    else this.npcCoins -= 3;

    const caster = isPlayer ? this.arena.player : this.arena.npc;
    const dx = tx - caster.x;
    const dy = ty - caster.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;

    // Lucky dice always rolls 6
    const forceSix = isPlayer ? this.playerLucky === 'dice' : this.npcLucky === 'dice';
    if (forceSix) {
      if (isPlayer) this.playerLucky = null;
      else this.npcLucky = null;
    }

    const proj = new Projectile(this.arena.scene, caster.x, caster.y, 'proj-fate-dice', 0, isPlayer);
    (proj as any).fateDiceOwner = owner;
    (proj as any).fateDiceForceSix = forceSix;
    this.arena.projectiles.add(proj);
    proj.launch((dx / len) * 400, (dy / len) * 400);
  }

  doAllIn(owner: 'player' | 'npc'): void {
    const isPlayer = owner === 'player';
    if (isPlayer && this.playerLuckyPending) { this.playerLucky = 'all-in'; this.playerLuckyPending = false; }
    const coins = isPlayer ? this.playerCoins : this.npcCoins;
    if (coins <= 0) {
      if (isPlayer) this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 30, '💸 No coins!', '#ff8888');
      return;
    }

    const coinsBet = coins;
    if (isPlayer) this.playerCoins = 0;
    else this.npcCoins = 0;

    const caster = isPlayer ? this.arena.player : this.arena.npc;
    const scene = this.arena.scene;
    const circleX = caster.x + 100;
    const circleY = caster.y;
    const sprite = scene.add.circle(circleX, circleY, 50, 0xffcc44, 0.4)
      .setStrokeStyle(3, 0xffaa00, 0.9).setDepth(6);

    const allIn: AllInCircle = {
      sprite, owner,
      activatesAt: scene.time.now + 3000,
      coinsBet,
      orbitAngle: 0,
    };

    if (isPlayer) this.playerAllIn = allIn;
    else this.npcAllIn = allIn;

    this.arena.showFloatingText(caster.x, caster.y - 36, `🎰 All In! (${coinsBet} coins)`, '#ffcc44');
  }

  // ── Projectile callbacks (called from ArenaScene hit handlers) ────

  onCoinHitEnemy(owner: 'player' | 'npc'): void {
    if (owner === 'player') this.grantCoins(1);
    else this.npcCoins++;
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    this.arena.showFloatingText(caster.x, caster.y - 20, '+1 🪙', '#ffcc00');
  }

  onDiceHitEnemy(
    proj: Projectile,
    hitX: number,
    hitY: number,
    owner: 'player' | 'npc',
  ): void {
    const forceSix = (proj as any).fateDiceForceSix === true;
    const roll = forceSix ? 6 : Math.ceil(Math.random() * 6);
    if (owner === 'player') this.grantCoins(roll);
    else this.npcCoins += roll;

    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const target = owner === 'player' ? this.arena.npc : this.arena.player;

    if (roll === 6) {
      target.takeDamage(30);
      const flash = this.arena.scene.add.circle(hitX, hitY, 80, 0xffee00, 0.5).setDepth(8);
      this.arena.scene.tweens.add({
        targets: flash, scaleX: 2, scaleY: 2, alpha: 0, duration: 350,
        onComplete: () => flash.destroy(),
      });
      this.arena.showFloatingText(hitX, hitY - 20, `🎲 6!`, '#ffee00');
      this.arena.showFloatingText(caster.x, caster.y - 36, '💥 JACKPOT!', '#ffee00');
    } else {
      target.takeDamage(15);
      this.arena.showFloatingText(hitX, hitY - 20, `🎲 ${roll}!`, '#ffcc44');
    }
  }

  // ── Private helpers ───────────────────────────────────────────────

  private updateSlotMachines(list: SlotMachine[], owner: 'player' | 'npc', time: number): void {
    const scene = this.arena.scene;
    for (const sm of list) {
      sm.sprite.setPosition(sm.x, sm.y);
      sm.label.setPosition(sm.x, sm.y);

      if (sm.isSpinning && time - sm.spinStartAt >= 3000) {
        sm.isSpinning = false;
        this.spinSlotMachine(sm, owner);
      }

      // E+: auto-spin from stored coins
      if (owner === 'player' && this.arena.hasUpgrade('e') && sm.storedCoins > 0 && !sm.isSpinning && time >= sm.autoSpinAt) {
        sm.storedCoins -= 1;
        sm.isSpinning = true;
        sm.spinStartAt = time;
        sm.autoSpinAt = time + 2000;
      }

      // E+: coin bar visual
      if (owner === 'player' && this.arena.hasUpgrade('e') && sm.storedCoins > 0) {
        const barW = Math.min(48, sm.storedCoins * 4);
        if (!sm.coinBar || !sm.coinBar.active) {
          sm.coinBar = scene.add.rectangle(sm.x - 24, sm.y - 32, 0, 4, 0xffcc44, 0.9)
            .setOrigin(0, 0.5).setDepth(4);
        }
        sm.coinBar.setPosition(sm.x - 24, sm.y - 32);
        sm.coinBar.setSize(barW, 4);
      } else if (sm.coinBar?.active && sm.storedCoins === 0) {
        sm.coinBar.destroy();
        sm.coinBar = null;
      }
    }
  }

  private updateNpcSlotSpin(time: number): void {
    if (this.npcSlotMachines.length === 0) return;
    const npc = this.arena.npc;
    const nearSlot = this.npcSlotMachines.find(sm =>
      !sm.isSpinning &&
      Phaser.Math.Distance.Between(npc.x, npc.y, sm.x, sm.y) <= 80,
    );
    if (nearSlot && this.npcCoins >= 1) {
      this.npcCoins -= 1;
      nearSlot.isSpinning = true;
      nearSlot.spinStartAt = time;
    }
  }

  private spinSlotMachine(sm: SlotMachine, owner: 'player' | 'npc'): void {
    const isPlayer = owner === 'player';
    const lucky = isPlayer ? this.playerLucky === 'slots' : this.npcLucky === 'slots';

    let key: FateSlotsBuffKey;
    if (lucky) {
      const potency = 3;
      if (isPlayer) this.playerLucky = null;
      else this.npcLucky = null;
      // Apply the same good buff 3 times
      const goodKey = FATE_SLOTS_GOOD_KEYS[Math.floor(Math.random() * FATE_SLOTS_GOOD_KEYS.length)];
      const buffs = isPlayer ? this.playerSlotsBuffs : this.npcSlotsBuffs;
      for (let i = 0; i < potency; i++) buffs.push({ key: goodKey });
      this.recomputeSlotsBuffs(owner);
      const label = FATE_SLOTS_BUFF_LABELS[goodKey];
      this.arena.showFloatingText(sm.x, sm.y - 36, `✅✅✅ ${label} ×3!`, '#aaffcc');
      this.arena.spawnHitFlash(sm.x, sm.y, 0x44ffaa);
      return;
    }

    key = FATE_SLOTS_ALL_KEYS[Math.floor(Math.random() * FATE_SLOTS_ALL_KEYS.length)];
    const buffs = isPlayer ? this.playerSlotsBuffs : this.npcSlotsBuffs;
    // E+: double potency when storedCoins > 10
    const doublePotency = isPlayer && this.arena.hasUpgrade('e') && sm.storedCoins > 10 && Math.random() < 0.5;
    buffs.push({ key });
    if (doublePotency) buffs.push({ key });
    this.recomputeSlotsBuffs(owner);

    const label = FATE_SLOTS_BUFF_LABELS[key];
    const isGood = FATE_SLOTS_GOOD_KEYS.includes(key);
    const color = isGood ? '#aaffcc' : '#ffaaaa';
    const prefix = doublePotency ? '⚡⚡ ' : (isGood ? '✅ ' : '❌ ');
    this.arena.showFloatingText(sm.x, sm.y - 36, prefix + label + (doublePotency ? ' ×2!' : ''), color);
    this.arena.spawnHitFlash(sm.x, sm.y, isGood ? 0x44ffaa : 0xff4444);
  }

  private recomputeSlotsBuffs(owner: 'player' | 'npc'): void {
    const isPlayer = owner === 'player';
    const fighter = isPlayer ? this.arena.player : this.arena.npc;
    const buffs = isPlayer ? this.playerSlotsBuffs : this.npcSlotsBuffs;

    let speedMult = isPlayer ? this.arena.getPlayerFateSpeedMult() : 1;
    let cdMult = 1;
    let dmgTakenMult = 1;
    let sizeMult = 1;
    let critChance = 0;
    let critRxBonus = 0;
    let hpMod = 0;

    for (const b of buffs) {
      switch (b.key) {
        case 'speed+': speedMult *= 1.15; break;
        case 'speed-': speedMult *= 0.90; break;
        case 'hp+': hpMod += 15; break;
        case 'hp-': hpMod -= 10; break;
        case 'dr+': dmgTakenMult *= 0.90; break;
        case 'dr-': dmgTakenMult *= 1.10; break;
        case 'cd-': cdMult *= 0.90; break;
        case 'cd+': cdMult *= 1.10; break;
        case 'size-': sizeMult *= 0.85; break;
        case 'size+': sizeMult *= 1.15; break;
        case 'crit+': critChance += 0.15; break;
        case 'critRx+': critRxBonus += 0.15; break;
      }
    }

    const baseMaxHp = isPlayer ? 100 : this.arena.getNpcBaseHp();
    const newMaxHp = Math.max(10, Math.round(baseMaxHp + hpMod));
    const hpRatio = fighter.hp / fighter.maxHp;
    fighter.maxHp = newMaxHp;
    fighter.hp = Math.max(1, Math.round(newMaxHp * hpRatio));
    fighter.cooldownMult = cdMult;
    fighter.incomingDamageMultiplier = dmgTakenMult;
    fighter.critChance = Math.min(0.95, critChance);
    fighter.incomingCritBonus = critRxBonus;
    fighter.sizeMult = sizeMult;
    fighter.applySizeMult();

    if (isPlayer) {
      this.arena.setPlayerFateSpeedMult(speedMult);
    }
    // NPC speed is set via npcSpeedMult which is recomputed each frame;
    // store NPC speed factor on fighter for ArenaScene to pick up
    if (!isPlayer) {
      (fighter as any).fateSlotsSpeedMult = speedMult;
    }
  }

  private updateAllIn(allIn: AllInCircle, time: number, owner: 'player' | 'npc'): void {
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

    if (time >= allIn.activatesAt) {
      const hitRadius = allIn.sprite.width / 2;
      const dmg = allIn.coinsBet * 5;
      const target = owner === 'player' ? this.arena.npc : this.arena.player;
      const inRange = Phaser.Math.Distance.Between(ax, ay, target.x, target.y) <= hitRadius;
      if (inRange) {
        target.takeDamage(dmg);
        this.arena.spawnHitFlash(target.x, target.y, 0xffcc44);
      }

      // Lucky Q: always 150% return
      const forceGood = owner === 'player' ? this.playerLucky === 'all-in' : this.npcLucky === 'all-in';
      if (forceGood) {
        if (owner === 'player') this.playerLucky = null;
        else this.npcLucky = null;
      }

      // Bet variant (Q+): hit = 2× bet, miss = 0
      const isBetVariant = (allIn as any).isBetVariant === true;
      let returnCoins: number;
      let good: boolean;
      if (isBetVariant) {
        good = inRange;
        returnCoins = good ? allIn.coinsBet * 2 : 0;
      } else {
        good = forceGood || Math.random() < 0.5;
        const returnFactor = good ? 1.5 : 0.5;
        returnCoins = Math.floor(allIn.coinsBet * returnFactor);
      }
      if (owner === 'player') this.grantCoins(returnCoins);
      else this.npcCoins += returnCoins;

      this.arena.showFloatingText(caster.x, caster.y - 50, `+${returnCoins}🪙`, good ? '#ffee44' : '#ff8888');

      allIn.sprite.setFillStyle(good ? 0xffee00 : 0x333333, 0.7);
      this.arena.scene.tweens.add({
        targets: allIn.sprite, scaleX: 2, scaleY: 2, alpha: 0, duration: 500,
        onComplete: () => allIn.sprite.destroy(),
      });

      if (owner === 'player') this.playerAllIn = null;
      else this.npcAllIn = null;
    }
  }

  private updateAutoAimCoins(delta: number): void {
    for (let i = this.autoAimCoins.length - 1; i >= 0; i--) {
      const ac = this.autoAimCoins[i];
      if (!ac.proj.active) { this.autoAimCoins.splice(i, 1); continue; }
      const target = ac.owner === 'player' ? this.arena.npc : this.arena.player;
      const dx = target.x - ac.proj.x;
      const dy = target.y - ac.proj.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const speed = 480;
      (ac.proj.body as Phaser.Physics.Arcade.Body).setVelocity(
        (dx / len) * speed,
        (dy / len) * speed,
      );
      void delta;
    }
  }

  private updateLuckyIcon(): void {
    const scene = this.arena.scene;
    const player = this.arena.player;
    const active = this.playerLuckyPending || this.playerLucky !== null;
    if (active) {
      const labels: Record<string, string> = {
        'coin-toss': '🪙✨',
        'slots': '🎰✨',
        'dice': '🎲✨',
        'all-in': '🎰💰',
      };
      const text = this.playerLuckyPending ? '🍀' : (labels[this.playerLucky!] ?? '✨');
      if (!this.playerLuckyIcon || !this.playerLuckyIcon.active) {
        this.playerLuckyIcon = scene.add.text(player.x, player.y - 44, text, { fontSize: '14px' })
          .setOrigin(0.5).setDepth(10);
      } else {
        this.playerLuckyIcon.setText(text).setPosition(player.x, player.y - 44);
      }
    } else {
      if (this.playerLuckyIcon?.active) { this.playerLuckyIcon.destroy(); this.playerLuckyIcon = null; }
    }
  }

  private findNearestOwnSlot(owner: 'player' | 'npc', maxDist: number): SlotMachine | null {
    const list = owner === 'player' ? this.playerSlotMachines : this.npcSlotMachines;
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    let best: SlotMachine | null = null;
    let bestDist = maxDist;
    for (const sm of list) {
      const d = Phaser.Math.Distance.Between(caster.x, caster.y, sm.x, sm.y);
      if (d < bestDist) { bestDist = d; best = sm; }
    }
    return best;
  }

  private grantCoins(n: number): void {
    if (this.debtCoins > 0) {
      const payOff = Math.min(n, this.debtCoins);
      this.debtCoins -= payOff;
      n -= payOff;
    }
    this.playerCoins += n;
  }

  private enterOozingLuck(now: number): void {
    const player = this.arena.player;
    this.oozingLuckUntil = now + 10000;
    this.oozingLuckCooldownUntil = now + 25000;
    this.oozingLuckCoinAccum = 0;
    player.critChance = Math.min(0.95, player.critChance + 0.20);
    player.critMult += 0.5;
    this.oozingLuckPrevAbsorber = player.damageAbsorber;
    player.damageAbsorber = (amount) => {
      if (Math.random() < 0.25) {
        this.arena.showFloatingText(player.x, player.y - 30, '✨ Dodged!', '#44ffcc');
        return true;
      }
      return this.oozingLuckPrevAbsorber ? this.oozingLuckPrevAbsorber(amount) : false;
    };
    this.arena.showFloatingText(player.x, player.y - 36, '🍀 Oozing Luck!', '#44ffcc');
  }

  private exitOozingLuck(): void {
    const player = this.arena.player;
    player.critChance = Math.max(0, player.critChance - 0.20);
    player.critMult = Math.max(2, player.critMult - 0.5);
    if (player.damageAbsorber !== this.oozingLuckPrevAbsorber) {
      player.damageAbsorber = this.oozingLuckPrevAbsorber;
    }
    this.oozingLuckPrevAbsorber = null;
  }

  private spawnCoinPile(time: number): void {
    const player = this.arena.player;
    const scene = this.arena.scene;
    const ox = player.x + (Math.random() - 0.5) * 160;
    const oy = player.y + (Math.random() - 0.5) * 160;
    const spr = scene.add.circle(ox, oy, 8, 0xffcc44, 0.85)
      .setStrokeStyle(2, 0xffffff, 0.6).setDepth(4);
    scene.tweens.add({ targets: spr, y: oy - 20, yoyo: true, repeat: -1, duration: 600 });
    this.coinPiles.push({ sprite: spr, x: ox, y: oy, expiresAt: time + 8000 });
  }

  private doLoadedDice(tx: number, ty: number): void {
    const player = this.arena.player;
    if (this.playerLuckyPending) { this.playerLucky = 'dice'; this.playerLuckyPending = false; }
    const dx = tx - player.x;
    const dy = ty - player.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const proj = new Projectile(this.arena.scene, player.x, player.y, 'proj-fate-dice', 0, true);
    (proj as any).fateDiceOwner = 'player';
    (proj as any).fateDiceForceSix = true;
    (proj as any).setTint(0xff4444);
    this.arena.projectiles.add(proj);
    proj.launch((dx / len) * 400, (dy / len) * 400);
    this.arena.showFloatingText(player.x, player.y - 30, '🎲 Loaded!', '#ff4444');
  }

  private startQBet(): void {
    if (this.qBetActive) return;
    this.qBetActive = true;
    this.currentBet = 0;
    this.qBetString = '';
    const player = this.arena.player;
    const scene = this.arena.scene;
    this.qBetText = scene.add.text(player.x, player.y - 50, 'BET: 0', {
      fontSize: '16px', color: '#ffcc00', fontFamily: 'Arial Black',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(20);
    this.qBetKeyHandler = (e: KeyboardEvent) => {
      if (!this.qBetActive) return;
      if (e.key >= '0' && e.key <= '9') {
        this.qBetString += e.key;
        this.currentBet = Math.min(this.playerCoins, parseInt(this.qBetString, 10) || 0);
        if (this.qBetText?.active) this.qBetText.setText(`BET: ${this.currentBet}`);
      } else if (e.key === 'Backspace') {
        this.qBetString = this.qBetString.slice(0, -1);
        this.currentBet = Math.min(this.playerCoins, parseInt(this.qBetString, 10) || 0);
        if (this.qBetText?.active) this.qBetText.setText(`BET: ${this.currentBet}`);
      }
    };
    scene.input.keyboard?.on('keydown', this.qBetKeyHandler);
  }

  private fireQBet(mouseX: number, mouseY: number): void {
    if (!this.qBetActive) return;
    if (this.qBetKeyHandler) {
      this.arena.scene.input.keyboard?.off('keydown', this.qBetKeyHandler);
      this.qBetKeyHandler = null;
    }
    if (this.qBetText?.active) { this.qBetText.destroy(); this.qBetText = null; }
    this.qBetActive = false;

    if (this.currentBet <= 0) {
      // Normal all-in
      const player = this.arena.player;
      if (player.castAbility('fate-all-in', FATE_STUB_CTX)) this.doAllIn('player');
      return;
    }

    const betAmount = this.currentBet;
    this.playerCoins -= betAmount;
    this.currentBet = 0;

    // Shrunken all-in circle: radius shrinks proportional to bet
    const player = this.arena.player;
    const scene = this.arena.scene;
    const shrinkRatio = betAmount / Math.max(1, betAmount + this.playerCoins);
    const circleRadius = Math.max(15, 50 - shrinkRatio * 35);

    if (this.playerLuckyPending) { this.playerLucky = 'all-in'; this.playerLuckyPending = false; }

    const circleX = player.x + 100;
    const circleY = player.y;
    const sprite = scene.add.circle(circleX, circleY, circleRadius, 0xff4444, 0.5)
      .setStrokeStyle(3, 0xff8800, 0.9).setDepth(6);

    const allIn: AllInCircle = {
      sprite, owner: 'player',
      activatesAt: scene.time.now + 3000,
      coinsBet: betAmount,
      orbitAngle: 0,
    };
    this.playerAllIn = allIn;

    // Override updateAllIn result: hit = 2× bet, miss = lose bet
    (allIn as any).isBetVariant = true;
    void mouseX; void mouseY;
    this.arena.showFloatingText(player.x, player.y - 36, `🎰 BET ${betAmount}!`, '#ff4444');
  }
}
