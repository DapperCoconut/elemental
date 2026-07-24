import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';

// ── Arena API ────────────────────────────────────────────────────────────────

export interface SubterfugeArenaApi {
  get player(): Fighter;
  get npc(): Fighter;
  get scene(): Phaser.Scene;
  get pointer(): Phaser.Input.Pointer;
  get eKey(): Phaser.Input.Keyboard.Key;
  get rKey(): Phaser.Input.Keyboard.Key;
  get fKey(): Phaser.Input.Keyboard.Key;
  get qKey(): Phaser.Input.Keyboard.Key;
  get projectiles(): Phaser.Physics.Arcade.Group;
  get nukeChanneling(): boolean;
  get elementId(): string;
  get npcElementId(): string;
  get sceneWidth(): number;
  get sceneHeight(): number;
  hasUpgrade(slot: string): boolean;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  dealAoeDamage(owner: 'player' | 'npc', cx: number, cy: number, radius: number, damage: number): void;
  // ── Dark Treachery routing ──
  /** Cast the given element's Q through the owner's regular CastContext. Returns false if the element has no ultimate. */
  castForeignQ(elementId: string, owner: 'player' | 'npc'): boolean;
  earthGolem(owner: 'player' | 'npc'): void;
  oilTrain(owner: 'player' | 'npc'): void;
  iceFrozenSolidNoFrost(owner: 'player' | 'npc', tx: number, ty: number): void;
  timeAlwaysNoonForced(owner: 'player' | 'npc'): void;
  lightSpeedOLight(owner: 'player' | 'npc'): void;
  echoEclipseDirect(owner: 'player' | 'npc'): void;
  magicNecronomicon(owner: 'player' | 'npc'): void;
  crystalClonePositions(owner: 'player' | 'npc'): Array<{ x: number; y: number }>;
}

// ── Internal types ───────────────────────────────────────────────────────────

interface SubDagger {
  sprite: Phaser.GameObjects.Rectangle;
  owner: 'player' | 'npc';
  color: 'red' | 'black';
  x: number;
  y: number;
  destX: number;
  destY: number;
  dirX: number;
  dirY: number;
  state: 'flying' | 'planted' | 'returning';
  hitSet: Set<Fighter>;
}

interface Lackey {
  owner: 'player' | 'npc';
  sprite: Phaser.GameObjects.Arc;
  tie: Phaser.GameObjects.Rectangle;
  barBg: Phaser.GameObjects.Rectangle;
  barFill: Phaser.GameObjects.Rectangle;
  x: number;
  y: number;
  loyaltyMs: number;
  loyaltyMaxMs: number;
  bullets: number;
  reloadingUntil: number;
  nextShotAt: number;
  strafeDir: number;
  ignited: boolean;
  igniteAura: Phaser.GameObjects.Arc | null;
}

interface DiscoBall {
  owner: 'player' | 'npc';
  sprite: Phaser.GameObjects.Arc;
  shine: Phaser.GameObjects.Graphics;
  endsAt: number;
  nextShotAt: number;
}

/** Preserved Atom-Nhilego state (see note at the nhilego section below). */
interface NhilegoShadow {
  circle: Phaser.GameObjects.Arc;
  x: number;
  y: number;
  radius: number;
  fireAt: number;
  owner: 'player' | 'npc';
}

// ── Constants ────────────────────────────────────────────────────────────────

const MONEY_MAX = 3;
const MONEY_START = 2;
const MONEY_TICK_MS = 5000;

const DAGGER_SPEED = 900;
const DAGGER_THROW_DMG = 8;
const DAGGER_RETURN_DMG = 12;
const DAGGER_MAX = 3;
const DAGGER_ARRIVE_R = 12;
const DAGGER_FILL: Record<'red' | 'black', number> = { red: 0xdd2233, black: 0x1a1a1a };

const SPRAY_CONE_HALF = Phaser.Math.DegToRad(7.5); // 15° total cone
const SPRAY_DMG = 2;
const SPRAY_INTERVAL_MS = 80;
const SPRAY_RANGE = 520;
const BULLETS_MAX = 50;
const BULLETS_START = 25;
const BULLETS_RELOAD = 25;
const AMMO_PER_10_DMG = 3;

const LACKEY_LOYALTY_MS = 20000;
const LACKEY_BRIBE_BONUS = 1.2; // bribe refills to 120% of base
const LACKEY_DMG = 1;
const LACKEY_MAG = 25;
const LACKEY_RELOAD_MS = 5000;
const LACKEY_SHOT_INTERVAL = 140;
const LACKEY_RANGE = 560;
const LACKEY_PROJ_HIT_LOSS_MS = 2000;
const LACKEY_IGNITE_EXTRA_PER_SEC = 2000; // Soul copy: +2s loyalty lost per second

const BRIBE_MS = 8000;
const BRIBE_DMG_MULT = 0.75; // bribed enemy deals 25% less

const TREACHERY_DELAY_MS = 2000;

const DISCO_MS = 12000;
const DISCO_SHOT_INTERVAL = 3000;
const DISCO_DMG = 10;

const LINK_MS = 5000;                 // Life copy: lackey damage-link duration
const LINK_LOYALTY_MS_PER_DMG = 150;  // each split damage point costs a lackey 0.15s loyalty

const OVERCHARGE_MS = 5000;           // Electricity copy
const ACID_RAIN_MS = 8000;            // Acid copy: whole screen, ¼ damage (6 dmg/0.5s → 1.5)
const ACID_RAIN_TICK_MS = 500;
const ACID_RAIN_TICK_DMG = 1.5;

// ── Kit ──────────────────────────────────────────────────────────────────────

export class SubterfugeKit {
  private api: SubterfugeArenaApi;

  // ── Money ────────────────────────────────────────────────────────────────
  private money = MONEY_START;
  private npcMoney = MONEY_START;
  private moneyAccumMs = 0;
  private npcMoneyAccumMs = 0;
  private moneyIcons: Phaser.GameObjects.Text[] = [];
  private npcMoneyIcons: Phaser.GameObjects.Text[] = [];

  // ── Molecular Cutter daggers (Click — unchanged from Quantum) ────────────
  private playerDaggers: SubDagger[] = [];
  private npcDaggers: SubDagger[] = [];
  private npcDaggerNextThrowAt = 0;
  private pointerWasDown = false;

  // ── Spray (E) ────────────────────────────────────────────────────────────
  private bullets = BULLETS_START;
  private npcBullets = BULLETS_START;
  private nextSprayShotAt = 0;
  private sprayHeld = false;
  private sprayDmgAccum = 0;
  private npcSprayDmgAccum = 0;
  private bulletCounterText: Phaser.GameObjects.Text | null = null;
  private lastSprayShotAt = 0;

  // ── Lackeys (R) ──────────────────────────────────────────────────────────
  private lackeys: Lackey[] = [];

  // ── Bribe (F) ────────────────────────────────────────────────────────────
  private npcBribedUntil = 0;      // player bribed the npc
  private playerBribedUntil = 0;   // npc bribed the player
  private npcCensorBar: Phaser.GameObjects.Rectangle | null = null;
  private playerCensorBar: Phaser.GameObjects.Rectangle | null = null;

  // ── Dark Treachery (Q) ───────────────────────────────────────────────────
  private treacheryFiresAt = 0;        // player channel
  private npcTreacheryFiresAt = 0;     // npc channel
  private treacheryFogNextAt = 0;
  private npcTreacheryFogNextAt = 0;

  // Copied-Q states
  private discoBalls: DiscoBall[] = [];
  private linkUntil = 0;               // Life copy (player)
  private npcLinkUntil = 0;
  private overchargeUntil = 0;         // Electricity copy (player)
  private npcOverchargeUntil = 0;
  private overchargeAura: Phaser.GameObjects.Arc | null = null;
  private npcOverchargeAura: Phaser.GameObjects.Arc | null = null;
  private acidRainUntil = 0;           // Acid copy (player-owned rain)
  private npcAcidRainUntil = 0;
  private acidRainTickAccum = 0;
  private npcAcidRainTickAccum = 0;
  private acidRainDmgAccum = 0;
  private npcAcidRainDmgAccum = 0;
  private acidRainDropAccum = 0;

  // ── Atom-Nhilego (preserved from Quantum — NOT currently bound to any input.
  //    Kept intact per request: it will return as a new ability soon. Call
  //    doPlayerAtomNhilego()/doNpcAtomNhilego() to activate. ────────────────
  private playerNhilegoActive = false;
  private playerNhilegoRadius = 70;
  private playerNhilegoSuccessCount = 0;
  private playerNhilegoShadow: NhilegoShadow | null = null;
  private npcNhilegoActive = false;
  private npcNhilegoRadius = 70;
  private npcNhilegoSuccessCount = 0;
  private npcNhilegoShadow: NhilegoShadow | null = null;

  constructor(api: SubterfugeArenaApi) {
    this.api = api;
  }

  // ── Public getters (NPC AI / ArenaScene) ─────────────────────────────────

  getNpcMoney(): number { return this.npcMoney; }
  getNpcBullets(): number { return this.npcBullets; }
  getNpcLackeyCount(): number { return this.lackeys.filter(l => l.owner === 'npc').length; }
  getPlayerMoney(): number { return this.money; }

  // ── Reset ────────────────────────────────────────────────────────────────

  reset(): void {
    this.money = MONEY_START;
    this.npcMoney = MONEY_START;
    this.moneyAccumMs = 0;
    this.npcMoneyAccumMs = 0;
    for (const t of this.moneyIcons) { if (t?.active) t.destroy(); }
    this.moneyIcons = [];
    for (const t of this.npcMoneyIcons) { if (t?.active) t.destroy(); }
    this.npcMoneyIcons = [];

    for (const d of this.playerDaggers) { if (d.sprite?.active) d.sprite.destroy(); }
    this.playerDaggers = [];
    for (const d of this.npcDaggers) { if (d.sprite?.active) d.sprite.destroy(); }
    this.npcDaggers = [];
    this.npcDaggerNextThrowAt = 0;
    this.pointerWasDown = false;

    this.bullets = BULLETS_START;
    this.npcBullets = BULLETS_START;
    this.nextSprayShotAt = 0;
    this.sprayHeld = false;
    this.sprayDmgAccum = 0;
    this.npcSprayDmgAccum = 0;
    this.lastSprayShotAt = 0;
    if (this.bulletCounterText?.active) this.bulletCounterText.destroy();
    this.bulletCounterText = null;

    for (const l of this.lackeys) this._destroyLackeyVisuals(l);
    this.lackeys = [];

    this.npcBribedUntil = 0;
    this.playerBribedUntil = 0;
    if (this.npcCensorBar?.active) this.npcCensorBar.destroy();
    this.npcCensorBar = null;
    if (this.playerCensorBar?.active) this.playerCensorBar.destroy();
    this.playerCensorBar = null;
    this.api.player.bribeIncomingMult = 1;
    this.api.npc.bribeIncomingMult = 1;

    this.treacheryFiresAt = 0;
    this.npcTreacheryFiresAt = 0;
    this.treacheryFogNextAt = 0;
    this.npcTreacheryFogNextAt = 0;

    for (const b of this.discoBalls) {
      if (b.sprite?.active) b.sprite.destroy();
      if (b.shine?.active) b.shine.destroy();
    }
    this.discoBalls = [];
    this.linkUntil = 0;
    this.npcLinkUntil = 0;
    this.overchargeUntil = 0;
    this.npcOverchargeUntil = 0;
    if (this.overchargeAura?.active) this.overchargeAura.destroy();
    this.overchargeAura = null;
    if (this.npcOverchargeAura?.active) this.npcOverchargeAura.destroy();
    this.npcOverchargeAura = null;
    this.acidRainUntil = 0;
    this.npcAcidRainUntil = 0;
    this.acidRainTickAccum = 0;
    this.npcAcidRainTickAccum = 0;
    this.acidRainDmgAccum = 0;
    this.npcAcidRainDmgAccum = 0;
    this.acidRainDropAccum = 0;

    this.playerNhilegoActive = false;
    this.playerNhilegoRadius = 70;
    this.playerNhilegoSuccessCount = 0;
    if (this.playerNhilegoShadow?.circle?.active) this.playerNhilegoShadow.circle.destroy();
    this.playerNhilegoShadow = null;
    this.npcNhilegoActive = false;
    this.npcNhilegoRadius = 70;
    this.npcNhilegoSuccessCount = 0;
    if (this.npcNhilegoShadow?.circle?.active) this.npcNhilegoShadow.circle.destroy();
    this.npcNhilegoShadow = null;
  }

  // ── Input (player only) ──────────────────────────────────────────────────

  handleInput(time: number, _delta: number, pointer: Phaser.Input.Pointer): void {
    const { api } = this;
    if (api.elementId !== 'quantum') return;
    if (api.nukeChanneling) return;

    const { player } = api;

    // ── E: Spray — hold to fire; press with 0 bullets to buy a reload ────
    if (Phaser.Input.Keyboard.JustDown(api.eKey)) {
      if (this.bullets <= 0 && player.getCooldownRatio('sub-spray') >= 1) {
        if (this.money >= 1) {
          this.money -= 1;
          this.bullets = BULLETS_RELOAD;
          player.startCooldown('sub-spray');
          api.showFloatingText(player.x, player.y - 40, '💵 Reloaded!', '#ff5555');
        } else {
          api.showFloatingText(player.x, player.y - 40, 'No money!', '#888888');
        }
      }
    }
    if (api.eKey.isDown && this.bullets > 0) {
      if (!this.sprayHeld && player.getCooldownRatio('sub-spray') < 1) {
        // still cooling down from the previous burst
      } else {
        this.sprayHeld = true;
        if (time >= this.nextSprayShotAt) {
          this.nextSprayShotAt = time + SPRAY_INTERVAL_MS;
          this._fireSprayShot('player', pointer.worldX, pointer.worldY);
        }
      }
    } else if (this.sprayHeld) {
      this.sprayHeld = false;
      player.startCooldown('sub-spray');
    }

    // ── R: Recruit ───────────────────────────────────────────────────────
    if (Phaser.Input.Keyboard.JustDown(api.rKey)) {
      if (player.getCooldownRatio('sub-recruit') >= 1) {
        if (this.money >= 1) {
          this.money -= 1;
          this._spawnLackey('player');
          player.startCooldown('sub-recruit');
        } else {
          api.showFloatingText(player.x, player.y - 40, 'No money!', '#888888');
        }
      }
    }

    // ── F: Bribe ─────────────────────────────────────────────────────────
    if (Phaser.Input.Keyboard.JustDown(api.fKey)) {
      if (player.getCooldownRatio('sub-bribe') >= 1) {
        if (this.money >= 1) {
          if (this._doBribe('player', pointer.worldX, pointer.worldY, time)) {
            this.money -= 1;
            player.startCooldown('sub-bribe');
          }
        } else {
          api.showFloatingText(player.x, player.y - 40, 'No money!', '#888888');
        }
      }
    }

    // ── Q: Dark Treachery ────────────────────────────────────────────────
    if (Phaser.Input.Keyboard.JustDown(api.qKey)) {
      if (this.treacheryFiresAt === 0 && player.getCooldownRatio('sub-treachery') >= 1) {
        player.startCooldown('sub-treachery');
        this.treacheryFiresAt = time + TREACHERY_DELAY_MS;
        this.treacheryFogNextAt = time;
        api.showFloatingText(player.x, player.y - 44, '🌫️ Dark Treachery...', '#552255');
      }
    }

    // ── Click: Molecular Cutter — throw, or recall once the max are out ──
    const isDown = pointer.isDown;
    if (isDown && !this.pointerWasDown) {
      this._playerClickDaggers(pointer.worldX, pointer.worldY);
    }
    this.pointerWasDown = isDown;
  }

  // ── Per-frame update ─────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    const { api } = this;
    const dt = delta / 1000;
    const isPlayerSub = api.elementId === 'quantum';
    const isNpcSub = api.npcElementId === 'quantum';

    if (isPlayerSub) {
      this._tickMoney('player', delta);
      this._renderMoneyHud('player');
      this._renderBulletCounter(time);
      this._tickTreacheryChannel('player', time);
    }
    if (isNpcSub) {
      this._tickMoney('npc', delta);
      this._renderMoneyHud('npc');
      this._tickTreacheryChannel('npc', time);
    }

    this._updateDaggers(this.playerDaggers, 'player', dt);
    this._updateDaggers(this.npcDaggers, 'npc', dt);
    this._updateLackeys(time, delta);
    this._updateBribes(time);
    this._updateDiscoBalls(time);
    this._updateOvercharge(time);
    this._updateAcidRain(time, delta);
    this._updateLinks(time);

    if (this.playerNhilegoActive) this._tickNhilego(time, 'player');
    if (this.npcNhilegoActive) this._tickNhilego(time, 'npc');
  }

  // ── Money ────────────────────────────────────────────────────────────────

  private _tickMoney(owner: 'player' | 'npc', delta: number): void {
    if (owner === 'player') {
      if (this.money >= MONEY_MAX) { this.moneyAccumMs = 0; return; }
      this.moneyAccumMs += delta;
      if (this.moneyAccumMs >= MONEY_TICK_MS) {
        this.moneyAccumMs -= MONEY_TICK_MS;
        this.money = Math.min(MONEY_MAX, this.money + 1);
      }
    } else {
      if (this.npcMoney >= MONEY_MAX) { this.npcMoneyAccumMs = 0; return; }
      this.npcMoneyAccumMs += delta;
      if (this.npcMoneyAccumMs >= MONEY_TICK_MS) {
        this.npcMoneyAccumMs -= MONEY_TICK_MS;
        this.npcMoney = Math.min(MONEY_MAX, this.npcMoney + 1);
      }
    }
  }

  private _addMoney(owner: 'player' | 'npc', amount: number): void {
    if (owner === 'player') this.money = Math.min(MONEY_MAX, this.money + amount);
    else this.npcMoney = Math.min(MONEY_MAX, this.npcMoney + amount);
  }

  private _renderMoneyHud(owner: 'player' | 'npc'): void {
    const fighter = owner === 'player' ? this.api.player : this.api.npc;
    const icons = owner === 'player' ? this.moneyIcons : this.npcMoneyIcons;
    const amount = owner === 'player' ? this.money : this.npcMoney;
    if (icons.length === 0) {
      for (let i = 0; i < MONEY_MAX; i++) {
        const t = this.api.scene.add.text(0, 0, '💵', { fontSize: '13px' })
          .setOrigin(0.5).setDepth(21).setTint(0xff4444) as Phaser.GameObjects.Text;
        icons.push(t);
      }
    }
    for (let i = 0; i < icons.length; i++) {
      const t = icons[i];
      if (!t.active) continue;
      t.setPosition(fighter.x + (i - 1) * 16, fighter.y - 44);
      t.setAlpha(i < amount ? 1 : 0.15);
    }
  }

  // ── Spray ────────────────────────────────────────────────────────────────

  private _fireSprayShot(owner: 'player' | 'npc', tx: number, ty: number): void {
    const caster = owner === 'player' ? this.api.player : this.api.npc;
    if (owner === 'player') {
      if (this.bullets <= 0) return;
      this.bullets -= 1;
    } else {
      if (this.npcBullets <= 0) return;
      this.npcBullets -= 1;
    }
    this.lastSprayShotAt = this.api.scene.time.now;
    const baseAngle = Math.atan2(ty - caster.y, tx - caster.x);
    this._hitscanBeam(owner, caster.x, caster.y, baseAngle + Phaser.Math.FloatBetween(-SPRAY_CONE_HALF, SPRAY_CONE_HALF), SPRAY_DMG, 0xff3333);

    // Crystal copy: active clones also shoot guns with E
    for (const pos of this.api.crystalClonePositions(owner)) {
      const cloneAngle = Math.atan2(ty - pos.y, tx - pos.x);
      this._hitscanBeam(owner, pos.x, pos.y, cloneAngle + Phaser.Math.FloatBetween(-SPRAY_CONE_HALF, SPRAY_CONE_HALF), SPRAY_DMG, 0xff8888);
    }
  }

  /** Hitscan beam: damages the first enemy near the ray, draws a fading tracer. */
  private _hitscanBeam(owner: 'player' | 'npc', sx: number, sy: number, angle: number, dmg: number, color: number): void {
    const ex = sx + Math.cos(angle) * SPRAY_RANGE;
    const ey = sy + Math.sin(angle) * SPRAY_RANGE;
    const targets: Fighter[] = owner === 'player' ? [this.api.npc] : [this.api.player];
    for (const t of targets) {
      if (!t.active || t.hp <= 0) continue;
      if (this._pointToSegmentDist(t.x, t.y, sx, sy, ex, ey) <= 24) {
        t.takeDamage(dmg);
        this.api.spawnHitFlash(t.x, t.y, color);
        this._addSprayAmmoFromDamage(owner, dmg);
      }
    }
    // A player's spray also stings enemy lackeys (NPC subterfuge mirror)
    const enemyLackeys = this.lackeys.filter(l => l.owner !== owner);
    for (const l of enemyLackeys) {
      if (this._pointToSegmentDist(l.x, l.y, sx, sy, ex, ey) <= 20) {
        l.loyaltyMs -= 500;
        this.api.spawnHitFlash(l.x, l.y, color);
      }
    }
    const gfx = this.api.scene.add.graphics().setDepth(8);
    gfx.lineStyle(2, color, 0.9);
    gfx.beginPath();
    gfx.moveTo(sx, sy);
    gfx.lineTo(ex, ey);
    gfx.strokePath();
    this.api.scene.tweens.add({ targets: gfx, alpha: 0, duration: 120, onComplete: () => gfx.destroy() });
  }

  /** Every 10 damage dealt (daggers + spray) grants 3 bullets. */
  private _addSprayAmmoFromDamage(owner: 'player' | 'npc', dmg: number): void {
    if (owner === 'player') {
      this.sprayDmgAccum += dmg;
      while (this.sprayDmgAccum >= 10) {
        this.sprayDmgAccum -= 10;
        this.bullets = Math.min(BULLETS_MAX, this.bullets + AMMO_PER_10_DMG);
      }
    } else {
      this.npcSprayDmgAccum += dmg;
      while (this.npcSprayDmgAccum >= 10) {
        this.npcSprayDmgAccum -= 10;
        this.npcBullets = Math.min(BULLETS_MAX, this.npcBullets + AMMO_PER_10_DMG);
      }
    }
  }

  private _renderBulletCounter(time: number): void {
    const { player, scene } = this.api;
    const visible = this.api.eKey.isDown || time - this.lastSprayShotAt < 800;
    if (!this.bulletCounterText || !this.bulletCounterText.active) {
      this.bulletCounterText = scene.add.text(player.x, player.y - 58, '', {
        fontSize: '14px', fontFamily: '"Arial Black"', color: '#ff3333',
        stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(22);
    }
    this.bulletCounterText.setVisible(visible);
    if (visible) {
      this.bulletCounterText.setText(`${this.bullets}`).setPosition(player.x, player.y - 58);
    }
  }

  private _pointToSegmentDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
    const dx = bx - ax, dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(px - ax, py - ay);
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  }

  // ── Lackeys ──────────────────────────────────────────────────────────────

  private _spawnLackey(owner: 'player' | 'npc'): void {
    const { scene } = this.api;
    const caster = owner === 'player' ? this.api.player : this.api.npc;
    const angle = Math.random() * Math.PI * 2;
    const x = caster.x + Math.cos(angle) * 50;
    const y = caster.y + Math.sin(angle) * 50;
    const sprite = scene.add.circle(x, y, 14, 0x222222, 1)
      .setStrokeStyle(2, owner === 'player' ? 0xdd2233 : 0x992222, 1).setDepth(7) as Phaser.GameObjects.Arc;
    const tie = scene.add.rectangle(x, y + 2, 4, 10, 0xdd2233).setDepth(8) as Phaser.GameObjects.Rectangle;
    const barBg = scene.add.rectangle(x, y - 24, 32, 5, 0x333311, 0.8).setDepth(11) as Phaser.GameObjects.Rectangle;
    const barFill = scene.add.rectangle(x - 16, y - 24, 32, 5, 0xffdd33, 0.95).setOrigin(0, 0.5).setDepth(12) as Phaser.GameObjects.Rectangle;
    this.lackeys.push({
      owner, sprite, tie, barBg, barFill, x, y,
      loyaltyMs: LACKEY_LOYALTY_MS, loyaltyMaxMs: LACKEY_LOYALTY_MS,
      bullets: LACKEY_MAG, reloadingUntil: 0, nextShotAt: 0,
      strafeDir: Math.random() < 0.5 ? 1 : -1,
      ignited: false, igniteAura: null,
    });
    this.api.showFloatingText(x, y - 34, '🕴️ Lackey!', '#dd2233');
  }

  private _destroyLackeyVisuals(l: Lackey): void {
    if (l.sprite?.active) l.sprite.destroy();
    if (l.tie?.active) l.tie.destroy();
    if (l.barBg?.active) l.barBg.destroy();
    if (l.barFill?.active) l.barFill.destroy();
    if (l.igniteAura?.active) l.igniteAura.destroy();
  }

  private _updateLackeys(time: number, delta: number): void {
    const dt = delta / 1000;
    const W = this.api.sceneWidth;
    const H = this.api.sceneHeight;

    for (let i = this.lackeys.length - 1; i >= 0; i--) {
      const l = this.lackeys[i];
      const enemy = l.owner === 'player' ? this.api.npc : this.api.player;

      // Loyalty drain (Soul copy: ignited lackeys lose an extra 2s per second)
      l.loyaltyMs -= delta * (l.ignited ? 1 + LACKEY_IGNITE_EXTRA_PER_SEC / 1000 : 1);

      // Enemy projectile hits: -2s loyalty each, projectile consumed
      for (const go of [...this.api.projectiles.getChildren()]) {
        const p = go as Phaser.Physics.Arcade.Sprite & { isFromPlayer?: boolean };
        if (!p.active) continue;
        if ((l.owner === 'player') === (p.isFromPlayer === true)) continue;
        if (Phaser.Math.Distance.Between(p.x, p.y, l.x, l.y) <= 18) {
          p.destroy();
          l.loyaltyMs -= LACKEY_PROJ_HIT_LOSS_MS;
          this.api.spawnHitFlash(l.x, l.y, 0xffdd33);
          this.api.showFloatingText(l.x, l.y - 28, '-2s', '#ffdd33');
        }
      }

      if (l.loyaltyMs <= 0) {
        if (l.ignited) this._lackeyBurnout(l);
        else this.api.showFloatingText(l.x, l.y - 20, '👋 Quit', '#999999');
        this._destroyLackeyVisuals(l);
        this.lackeys.splice(i, 1);
        continue;
      }

      // Movement: hover at mid range from the enemy
      if (enemy.active && enemy.hp > 0) {
        const dx = enemy.x - l.x, dy = enemy.y - l.y;
        const dist = Math.hypot(dx, dy) || 1;
        const speed = 150;
        let mx = 0, my = 0;
        if (dist < 200) { mx = -dx / dist; my = -dy / dist; }
        else if (dist > 320) { mx = dx / dist; my = dy / dist; }
        else { mx = (-dy / dist) * 0.5 * l.strafeDir; my = (dx / dist) * 0.5 * l.strafeDir; }
        l.x = Phaser.Math.Clamp(l.x + mx * speed * dt, 20, W - 20);
        l.y = Phaser.Math.Clamp(l.y + my * speed * dt, 20, H - 20);
      }

      // Firing: 15° cone, 1 dmg pellets, 25-round mag then 5s reload
      if (l.reloadingUntil > 0 && time >= l.reloadingUntil) {
        l.reloadingUntil = 0;
        l.bullets = LACKEY_MAG;
      }
      if (l.reloadingUntil === 0 && l.bullets > 0 && enemy.active && enemy.hp > 0
          && time >= l.nextShotAt
          && Phaser.Math.Distance.Between(l.x, l.y, enemy.x, enemy.y) <= LACKEY_RANGE) {
        l.nextShotAt = time + LACKEY_SHOT_INTERVAL;
        l.bullets -= 1;
        const angle = Math.atan2(enemy.y - l.y, enemy.x - l.x) + Phaser.Math.FloatBetween(-SPRAY_CONE_HALF, SPRAY_CONE_HALF);
        this._lackeyHitscan(l, angle, enemy);
        if (l.bullets <= 0) l.reloadingUntil = time + LACKEY_RELOAD_MS;
      }

      // Visuals
      l.sprite.setPosition(l.x, l.y);
      l.tie.setPosition(l.x, l.y + 2);
      l.barBg.setPosition(l.x, l.y - 24);
      const ratio = Phaser.Math.Clamp(l.loyaltyMs / l.loyaltyMaxMs, 0, 1);
      l.barFill.setPosition(l.x - 16, l.y - 24).setSize(32 * ratio, 5);
      if (l.reloadingUntil > 0) l.sprite.setAlpha(0.6);
      else l.sprite.setAlpha(1);
      if (l.igniteAura?.active) l.igniteAura.setPosition(l.x, l.y);
    }
  }

  private _lackeyHitscan(l: Lackey, angle: number, enemy: Fighter): void {
    const sx = l.x, sy = l.y;
    const ex = sx + Math.cos(angle) * LACKEY_RANGE;
    const ey = sy + Math.sin(angle) * LACKEY_RANGE;
    if (enemy.active && enemy.hp > 0 && this._pointToSegmentDist(enemy.x, enemy.y, sx, sy, ex, ey) <= 24) {
      enemy.takeDamage(LACKEY_DMG);
      this.api.spawnHitFlash(enemy.x, enemy.y, 0xdd6633);
    }
    const gfx = this.api.scene.add.graphics().setDepth(7);
    gfx.lineStyle(1, 0xdd8855, 0.8);
    gfx.beginPath();
    gfx.moveTo(sx, sy);
    gfx.lineTo(ex, ey);
    gfx.strokePath();
    this.api.scene.tweens.add({ targets: gfx, alpha: 0, duration: 100, onComplete: () => gfx.destroy() });
  }

  /** Soul copy: an ignited lackey erupts in a burning AoE when it expires. */
  private _lackeyBurnout(l: Lackey): void {
    const { scene } = this.api;
    this.api.dealAoeDamage(l.owner, l.x, l.y, 90, 20);
    const ring = scene.add.circle(l.x, l.y, 14, 0xff5522, 0.75).setDepth(9);
    scene.tweens.add({ targets: ring, scaleX: 6.5, scaleY: 6.5, alpha: 0, duration: 450, onComplete: () => ring.destroy() });
    this.api.showFloatingText(l.x, l.y - 24, '🔥 Burnout!', '#ff5522');
  }

  private _igniteLackeys(owner: 'player' | 'npc'): void {
    let any = false;
    for (const l of this.lackeys) {
      if (l.owner !== owner || l.ignited) continue;
      l.ignited = true;
      any = true;
      if (l.igniteAura?.active) l.igniteAura.destroy();
      l.igniteAura = this.api.scene.add.circle(l.x, l.y, 20, 0xff4400, 0.35)
        .setStrokeStyle(2, 0xff8844, 0.8).setDepth(6) as Phaser.GameObjects.Arc;
      this.api.scene.tweens.add({
        targets: l.igniteAura, scaleX: 1.25, scaleY: 1.25, yoyo: true, repeat: -1, duration: 320,
      });
    }
    const caster = owner === 'player' ? this.api.player : this.api.npc;
    this.api.showFloatingText(caster.x, caster.y - 40, any ? '🔥 Lackeys Ignited!' : 'No lackeys to ignite', '#ff5522');
  }

  // ── Bribe ────────────────────────────────────────────────────────────────

  /** Returns true if a target was bribed (money is only spent on success). */
  private _doBribe(owner: 'player' | 'npc', cursorX: number, cursorY: number, time: number): boolean {
    const enemy = owner === 'player' ? this.api.npc : this.api.player;
    const ownLackeys = this.lackeys.filter(l => l.owner === owner);

    // Direct cursor hits first, else nearest of enemy / own lackey to the cursor.
    let target: 'enemy' | Lackey | null = null;
    if (enemy.active && enemy.hp > 0 && Phaser.Math.Distance.Between(cursorX, cursorY, enemy.x, enemy.y) <= 36) {
      target = 'enemy';
    } else {
      const hovered = ownLackeys.find(l => Phaser.Math.Distance.Between(cursorX, cursorY, l.x, l.y) <= 30);
      if (hovered) target = hovered;
    }
    if (!target) {
      let best: { kind: 'enemy' | Lackey; d: number } | null = null;
      if (enemy.active && enemy.hp > 0) best = { kind: 'enemy', d: Phaser.Math.Distance.Between(cursorX, cursorY, enemy.x, enemy.y) };
      for (const l of ownLackeys) {
        const d = Phaser.Math.Distance.Between(cursorX, cursorY, l.x, l.y);
        if (!best || d < best.d) best = { kind: l, d };
      }
      target = best ? best.kind : null;
    }
    if (!target) return false;

    if (target === 'enemy') {
      if (owner === 'player') this.npcBribedUntil = time + BRIBE_MS;
      else this.playerBribedUntil = time + BRIBE_MS;
      this.api.showFloatingText(enemy.x, enemy.y - 34, '💵 Bribed! -25% dmg', '#66dd66');
    } else {
      target.loyaltyMs = target.loyaltyMaxMs * LACKEY_BRIBE_BONUS;
      this.api.showFloatingText(target.x, target.y - 30, '💵 Loyalty +120%!', '#ffdd33');
    }
    return true;
  }

  private _updateBribes(time: number): void {
    // Bribed enemies deal 25% less damage — applied victim-side (1v1: identical outcome).
    const npcBribed = time < this.npcBribedUntil;
    const playerBribed = time < this.playerBribedUntil;
    this.api.player.bribeIncomingMult = npcBribed ? BRIBE_DMG_MULT : 1;
    this.api.npc.bribeIncomingMult = playerBribed ? BRIBE_DMG_MULT : 1;

    this.npcCensorBar = this._syncCensorBar(this.npcCensorBar, this.api.npc, npcBribed);
    this.playerCensorBar = this._syncCensorBar(this.playerCensorBar, this.api.player, playerBribed);
  }

  private _syncCensorBar(bar: Phaser.GameObjects.Rectangle | null, fighter: Fighter, active: boolean): Phaser.GameObjects.Rectangle | null {
    if (!active) {
      if (bar?.active) bar.destroy();
      return null;
    }
    if (!bar || !bar.active) {
      bar = this.api.scene.add.rectangle(fighter.x, fighter.y - 6, 30, 8, 0x000000, 0.95)
        .setStrokeStyle(1, 0x222222, 1).setDepth(15) as Phaser.GameObjects.Rectangle;
    }
    bar.setPosition(fighter.x, fighter.y - 6);
    return bar;
  }

  // ── Dark Treachery ───────────────────────────────────────────────────────

  private _tickTreacheryChannel(owner: 'player' | 'npc', time: number): void {
    const firesAt = owner === 'player' ? this.treacheryFiresAt : this.npcTreacheryFiresAt;
    if (firesAt === 0) return;
    const caster = owner === 'player' ? this.api.player : this.api.npc;

    // Black fog accumulating around the caster during the 2s channel
    const fogNextAt = owner === 'player' ? this.treacheryFogNextAt : this.npcTreacheryFogNextAt;
    if (time >= fogNextAt) {
      if (owner === 'player') this.treacheryFogNextAt = time + 130;
      else this.npcTreacheryFogNextAt = time + 130;
      const angle = Math.random() * Math.PI * 2;
      const r = 55 + Math.random() * 25;
      const fog = this.api.scene.add.circle(
        caster.x + Math.cos(angle) * r, caster.y + Math.sin(angle) * r,
        8 + Math.random() * 8, 0x110011, 0.55,
      ).setDepth(9);
      this.api.scene.tweens.add({
        targets: fog, x: caster.x, y: caster.y, alpha: 0, scaleX: 0.4, scaleY: 0.4,
        duration: 320, onComplete: () => fog.destroy(),
      });
    }

    if (time >= firesAt) {
      if (owner === 'player') this.treacheryFiresAt = 0;
      else this.npcTreacheryFiresAt = 0;
      this._executeTreachery(owner, time);
    }
  }

  /** NPC AI entry: begin the 2s channel. */
  doNpcTreachery(): void {
    if (this.npcTreacheryFiresAt > 0) return;
    const time = this.api.scene.time.now;
    this.npcTreacheryFiresAt = time + TREACHERY_DELAY_MS;
    this.npcTreacheryFogNextAt = time;
    this.api.showFloatingText(this.api.npc.x, this.api.npc.y - 44, '🌫️ Dark Treachery...', '#552255');
  }

  private _executeTreachery(owner: 'player' | 'npc', time: number): void {
    const { api } = this;
    const caster = owner === 'player' ? api.player : api.npc;
    const enemyId = owner === 'player' ? api.npcElementId : api.elementId;

    switch (enemyId) {
      // ── Fully custom copies ──
      case 'quantum': // mirror match: gain 3 money instantly
        this._addMoney(owner, 3);
        api.showFloatingText(caster.x, caster.y - 40, '💵💵💵 Insider Trading!', '#ff5555');
        break;
      case 'metal': // just gain an extra 50 shield health
        caster.shieldHp += 50;
        api.showFloatingText(caster.x, caster.y - 40, '🛡️ +50 Shield', '#aaaacc');
        break;
      case 'growth': // spawn 2 lackeys for free
        this._spawnLackey(owner);
        this._spawnLackey(owner);
        break;
      case 'soul': // ignite lackeys: extra loyalty drain + burning AoE on burnout
        this._igniteLackeys(owner);
        break;
      case 'life': // link to all lackeys: incoming damage split across them instead
        if (owner === 'player') this.linkUntil = time + LINK_MS;
        else this.npcLinkUntil = time + LINK_MS;
        this._armLinkAbsorber(owner);
        api.showFloatingText(caster.x, caster.y - 40, '🔗 Linked to Lackeys!', '#66ff66');
        break;
      case 'sound': // just the disco ball: 12s, shoots every 3s for 10
        this._spawnDiscoBall(owner);
        break;
      case 'electricity': // overcharge: die within 5s → respawn at 25% health
        if (owner === 'player') this.overchargeUntil = time + OVERCHARGE_MS;
        else this.npcOverchargeUntil = time + OVERCHARGE_MS;
        this._armOvercharge(owner);
        break;
      case 'slime': // acid pours over the entire screen at ¼ damage
        if (owner === 'player') { this.acidRainUntil = time + ACID_RAIN_MS; this.acidRainTickAccum = 0; }
        else { this.npcAcidRainUntil = time + ACID_RAIN_MS; this.npcAcidRainTickAccum = 0; }
        api.showFloatingText(api.sceneWidth / 2, 80, '☠️ Acid Downpour!', '#66ff33');
        break;

      // ── Kit-routed copies ──
      case 'earth': api.earthGolem(owner); break;
      case 'oil': api.oilTrain(owner); break;
      case 'ice': {
        const target = owner === 'player' ? api.npc : api.player;
        api.iceFrozenSolidNoFrost(owner, target.x, target.y);
        break;
      }
      case 'time': api.timeAlwaysNoonForced(owner); break;
      case 'light': api.lightSpeedOLight(owner); break;
      case 'echo': api.echoEclipseDirect(owner); break;
      case 'magic': api.magicNecronomicon(owner); break;

      // ── Not yet supported ──
      case 'gunpowder':
      case 'rubber':
        api.showFloatingText(caster.x, caster.y - 40, '🚫 No Contract', '#888888');
        break;

      // ── Everything else: cast the enemy's Q through the normal context ──
      default:
        if (!api.castForeignQ(enemyId, owner)) {
          api.showFloatingText(caster.x, caster.y - 40, '🚫 No Contract', '#888888');
        }
        break;
    }
  }

  // ── Life copy: damage-link to lackeys ────────────────────────────────────

  private _armLinkAbsorber(owner: 'player' | 'npc'): void {
    const fighter = owner === 'player' ? this.api.player : this.api.npc;
    fighter.damageAbsorber = (amount: number) => {
      const until = owner === 'player' ? this.linkUntil : this.npcLinkUntil;
      if (this.api.scene.time.now >= until) return false;
      const own = this.lackeys.filter(l => l.owner === owner);
      if (own.length === 0) return false;
      const share = amount / own.length;
      for (const l of own) {
        l.loyaltyMs -= share * LINK_LOYALTY_MS_PER_DMG;
        this.api.spawnHitFlash(l.x, l.y, 0x66ff66);
      }
      this.api.showFloatingText(fighter.x, fighter.y - 30, 'Linked!', '#66ff66');
      return true;
    };
  }

  private _updateLinks(time: number): void {
    if (this.linkUntil > 0 && time >= this.linkUntil) {
      this.linkUntil = 0;
      if (this.api.player.damageAbsorber) this.api.player.damageAbsorber = null;
    }
    if (this.npcLinkUntil > 0 && time >= this.npcLinkUntil) {
      this.npcLinkUntil = 0;
      if (this.api.npc.damageAbsorber) this.api.npc.damageAbsorber = null;
    }
  }

  // ── Electricity copy: overcharge revive ──────────────────────────────────

  private _armOvercharge(owner: 'player' | 'npc'): void {
    const fighter = owner === 'player' ? this.api.player : this.api.npc;
    this.api.showFloatingText(fighter.x, fighter.y - 40, '⚡ OVERCHARGED', '#ffee00');
    const aura = this.api.scene.add.circle(fighter.x, fighter.y, 30, 0xffee00, 0.25)
      .setStrokeStyle(2, 0xffff88, 0.9).setDepth(8) as Phaser.GameObjects.Arc;
    this.api.scene.tweens.add({ targets: aura, scaleX: 1.2, scaleY: 1.2, yoyo: true, repeat: -1, duration: 300 });
    if (owner === 'player') {
      if (this.overchargeAura?.active) this.overchargeAura.destroy();
      this.overchargeAura = aura;
    } else {
      if (this.npcOverchargeAura?.active) this.npcOverchargeAura.destroy();
      this.npcOverchargeAura = aura;
    }
    fighter.damageAbsorber = (amount: number) => {
      const until = owner === 'player' ? this.overchargeUntil : this.npcOverchargeUntil;
      if (this.api.scene.time.now >= until) return false;
      if (fighter.hp - amount > 0) return false;
      // Lethal hit while overcharged → respawn at 25% health instead.
      fighter.hp = Math.ceil(fighter.maxHp * 0.25);
      if (owner === 'player') this.overchargeUntil = 0;
      else this.npcOverchargeUntil = 0;
      fighter.damageAbsorber = null;
      this.api.showFloatingText(fighter.x, fighter.y - 40, '⚡ RESTART!', '#ffee00');
      const flash = this.api.scene.add.circle(fighter.x, fighter.y, 20, 0xffee00, 0.9).setDepth(12);
      this.api.scene.tweens.add({ targets: flash, scaleX: 4, scaleY: 4, alpha: 0, duration: 500, onComplete: () => flash.destroy() });
      return true;
    };
  }

  private _updateOvercharge(time: number): void {
    if (this.overchargeAura?.active) {
      if (time >= this.overchargeUntil) {
        this.overchargeAura.destroy();
        this.overchargeAura = null;
        if (this.api.player.damageAbsorber) this.api.player.damageAbsorber = null;
      } else {
        this.overchargeAura.setPosition(this.api.player.x, this.api.player.y);
      }
    }
    if (this.npcOverchargeAura?.active) {
      if (time >= this.npcOverchargeUntil) {
        this.npcOverchargeAura.destroy();
        this.npcOverchargeAura = null;
        if (this.api.npc.damageAbsorber) this.api.npc.damageAbsorber = null;
      } else {
        this.npcOverchargeAura.setPosition(this.api.npc.x, this.api.npc.y);
      }
    }
  }

  // ── Sound copy: disco ball ───────────────────────────────────────────────

  private _spawnDiscoBall(owner: 'player' | 'npc'): void {
    const { scene } = this.api;
    const time = scene.time.now;
    const x = this.api.sceneWidth / 2;
    const y = 90;
    const sprite = scene.add.circle(x, y, 22, 0xcccccc, 1)
      .setStrokeStyle(2, 0xffffff, 1).setDepth(10) as Phaser.GameObjects.Arc;
    const shine = scene.add.graphics().setDepth(9);
    this.discoBalls.push({ owner, sprite, shine, endsAt: time + DISCO_MS, nextShotAt: time + DISCO_SHOT_INTERVAL });
    this.api.showFloatingText(x, y - 36, '🪩 Disco!', '#ff66cc');
  }

  private _updateDiscoBalls(time: number): void {
    for (let i = this.discoBalls.length - 1; i >= 0; i--) {
      const b = this.discoBalls[i];
      if (time >= b.endsAt) {
        if (b.sprite?.active) b.sprite.destroy();
        if (b.shine?.active) b.shine.destroy();
        this.discoBalls.splice(i, 1);
        continue;
      }
      // sparkle
      b.shine.clear();
      const hue = (time * 0.15) % 360;
      const color = Phaser.Display.Color.HSLToColor(hue / 360, 0.8, 0.6).color;
      b.shine.lineStyle(2, color, 0.6);
      for (let s = 0; s < 4; s++) {
        const a = (time * 0.002) + (s / 4) * Math.PI * 2;
        b.shine.lineBetween(b.sprite.x, b.sprite.y, b.sprite.x + Math.cos(a) * 34, b.sprite.y + Math.sin(a) * 34);
      }
      if (time >= b.nextShotAt) {
        b.nextShotAt = time + DISCO_SHOT_INTERVAL;
        const enemy = b.owner === 'player' ? this.api.npc : this.api.player;
        if (enemy.active && enemy.hp > 0) {
          enemy.takeDamage(DISCO_DMG);
          this.api.spawnHitFlash(enemy.x, enemy.y, color);
          const gfx = this.api.scene.add.graphics().setDepth(11);
          gfx.lineStyle(3, color, 0.9);
          gfx.lineBetween(b.sprite.x, b.sprite.y, enemy.x, enemy.y);
          this.api.scene.tweens.add({ targets: gfx, alpha: 0, duration: 250, onComplete: () => gfx.destroy() });
        }
      }
    }
  }

  // ── Acid copy: whole-screen rain at ¼ damage ─────────────────────────────

  private _updateAcidRain(time: number, delta: number): void {
    for (const owner of ['player', 'npc'] as const) {
      const until = owner === 'player' ? this.acidRainUntil : this.npcAcidRainUntil;
      if (time >= until) continue;
      const enemy = owner === 'player' ? this.api.npc : this.api.player;

      let tickAccum = (owner === 'player' ? this.acidRainTickAccum : this.npcAcidRainTickAccum) + delta;
      if (tickAccum >= ACID_RAIN_TICK_MS) {
        tickAccum -= ACID_RAIN_TICK_MS;
        if (enemy.active && enemy.hp > 0) {
          let dmgAccum = (owner === 'player' ? this.acidRainDmgAccum : this.npcAcidRainDmgAccum) + ACID_RAIN_TICK_DMG;
          const whole = Math.floor(dmgAccum);
          dmgAccum -= whole;
          if (whole > 0) {
            enemy.takeDamage(whole);
            this.api.spawnHitFlash(enemy.x, enemy.y, 0x66ff33);
          }
          if (owner === 'player') this.acidRainDmgAccum = dmgAccum;
          else this.npcAcidRainDmgAccum = dmgAccum;
        }
      }
      if (owner === 'player') this.acidRainTickAccum = tickAccum;
      else this.npcAcidRainTickAccum = tickAccum;

      // Falling drops across the whole screen
      this.acidRainDropAccum += delta;
      if (this.acidRainDropAccum >= 60) {
        this.acidRainDropAccum -= 60;
        const dx = Math.random() * this.api.sceneWidth;
        const dy = Math.random() * this.api.sceneHeight;
        const drop = this.api.scene.add.circle(dx, dy - 90, 3, 0x66ff33, 0.9).setDepth(6);
        this.api.scene.tweens.add({ targets: drop, y: dy, alpha: 0.2, duration: 300, onComplete: () => drop.destroy() });
      }
    }
  }

  // ── Molecular Cutter daggers (Click — behavior unchanged from Quantum) ───

  private _pickBalancedColor(owner: 'player' | 'npc'): 'red' | 'black' {
    const list = owner === 'player' ? this.playerDaggers : this.npcDaggers;
    let r = 0, b = 0;
    for (const d of list) { if (d.state === 'returning') continue; if (d.color === 'red') r++; else b++; }
    return r <= b ? 'red' : 'black';
  }

  private _throwDagger(owner: 'player' | 'npc', tx: number, ty: number, color: 'red' | 'black', originX?: number, originY?: number): void {
    const { scene } = this.api;
    const caster = owner === 'player' ? this.api.player : this.api.npc;
    const ox = originX ?? caster.x;
    const oy = originY ?? caster.y;
    const dx = tx - ox, dy = ty - oy;
    const d = Math.hypot(dx, dy) || 1;
    const sprite = scene.add.rectangle(ox, oy, 16, 4, DAGGER_FILL[color])
      .setDepth(10).setRotation(Math.atan2(dy, dx)) as Phaser.GameObjects.Rectangle;
    sprite.setStrokeStyle(1, color === 'red' ? 0xffffff : 0xdd2233, 0.7);
    const list = owner === 'player' ? this.playerDaggers : this.npcDaggers;
    list.push({
      sprite, owner, color,
      x: ox, y: oy,
      destX: tx, destY: ty, dirX: dx / d, dirY: dy / d,
      state: 'flying', hitSet: new Set<Fighter>(),
    });
  }

  private _recallDaggers(owner: 'player' | 'npc'): void {
    const list = owner === 'player' ? this.playerDaggers : this.npcDaggers;
    let any = false;
    for (const d of list) { if (d.state !== 'returning') { d.state = 'returning'; d.hitSet.clear(); any = true; } }
    if (any) {
      const caster = owner === 'player' ? this.api.player : this.api.npc;
      this.api.showFloatingText(caster.x, caster.y - 34, 'Recall!', '#ffaaaa');
    }
  }

  private _playerClickDaggers(tx: number, ty: number): void {
    const out = this.playerDaggers.filter(d => d.state !== 'returning').length;
    if (out >= DAGGER_MAX) { this._recallDaggers('player'); return; }
    this._throwDagger('player', tx, ty, this._pickBalancedColor('player'));
    // Crystal copy: active clones also throw daggers (extras beyond the 3-dagger cap)
    for (const pos of this.api.crystalClonePositions('player')) {
      this._throwDagger('player', tx, ty, this._pickBalancedColor('player'), pos.x, pos.y);
    }
  }

  private _updateDaggers(list: SubDagger[], owner: 'player' | 'npc', dt: number): void {
    const caster = owner === 'player' ? this.api.player : this.api.npc;
    const enemies: Fighter[] = owner === 'player' ? [this.api.npc] : [this.api.player];
    for (let i = list.length - 1; i >= 0; i--) {
      const d = list[i];
      if (!d.sprite?.active) { list.splice(i, 1); continue; }
      if (d.state === 'flying') {
        d.x += d.dirX * DAGGER_SPEED * dt;
        d.y += d.dirY * DAGGER_SPEED * dt;
        const remaining = (d.destX - d.x) * d.dirX + (d.destY - d.y) * d.dirY;
        if (remaining <= 0 || Phaser.Math.Distance.Between(d.x, d.y, d.destX, d.destY) <= DAGGER_ARRIVE_R) {
          d.x = d.destX; d.y = d.destY; d.state = 'planted';
        }
        this._daggerHit(d, enemies, DAGGER_THROW_DMG);
      } else if (d.state === 'returning') {
        const dx = caster.x - d.x, dy = caster.y - d.y;
        const dist = Math.hypot(dx, dy) || 1;
        d.dirX = dx / dist; d.dirY = dy / dist;
        d.x += d.dirX * DAGGER_SPEED * dt;
        d.y += d.dirY * DAGGER_SPEED * dt;
        d.sprite.setRotation(Math.atan2(dy, dx));
        this._daggerHit(d, enemies, DAGGER_RETURN_DMG);
        if (dist <= DAGGER_ARRIVE_R + 6) { d.sprite.destroy(); list.splice(i, 1); continue; }
      }
      d.sprite.setPosition(d.x, d.y);
    }
  }

  private _daggerHit(d: SubDagger, enemies: Fighter[], dmg: number): void {
    for (const t of enemies) {
      if (!t.active || t.hp <= 0 || d.hitSet.has(t)) continue;
      if (Phaser.Math.Distance.Between(d.x, d.y, t.x, t.y) <= 20) {
        d.hitSet.add(t);
        t.takeDamage(dmg);
        this.api.spawnHitFlash(t.x, t.y, DAGGER_FILL[d.color]);
        this._addSprayAmmoFromDamage(d.owner, dmg);
      }
    }
  }

  // ── CastContext dispatchers ──────────────────────────────────────────────

  doPlayerCutter(tx: number, ty: number): void {
    if (this.api.elementId !== 'quantum') return;
    this._playerClickDaggers(tx, ty);
  }

  /** NPC Molecular Cutter — throws daggers on a cadence, recalling once the max are out. */
  doNpcCutter(tx: number, ty: number): void {
    const time = this.api.scene.time.now;
    if (time < this.npcDaggerNextThrowAt) return;
    const out = this.npcDaggers.filter(d => d.state !== 'returning').length;
    if (out >= DAGGER_MAX) {
      if (this.npcDaggers.some(d => d.state === 'planted')) this._recallDaggers('npc');
      this.npcDaggerNextThrowAt = time + 400;
      return;
    }
    this._throwDagger('npc', tx, ty, this._pickBalancedColor('npc'));
    this.npcDaggerNextThrowAt = time + 350;
  }

  /** NPC Spray — a short burst toward the target; buys a reload when dry. */
  doNpcSpray(tx: number, ty: number): void {
    const { scene, npc } = this.api;
    if (this.npcBullets <= 0) {
      if (this.npcMoney >= 1) {
        this.npcMoney -= 1;
        this.npcBullets = BULLETS_RELOAD;
        this.api.showFloatingText(npc.x, npc.y - 40, '💵 Reloaded!', '#ff5555');
      }
      return;
    }
    const shots = Math.min(8, this.npcBullets);
    for (let i = 0; i < shots; i++) {
      scene.time.delayedCall(i * 60, () => {
        if (!npc.active || npc.hp <= 0) return;
        this._fireSprayShot('npc', tx, ty);
      });
    }
  }

  doNpcRecruit(): void {
    if (this.npcMoney < 1) return;
    this.npcMoney -= 1;
    this._spawnLackey('npc');
  }

  doNpcBribe(tx: number, ty: number): void {
    if (this.npcMoney < 1) return;
    if (this._doBribe('npc', tx, ty, this.api.scene.time.now)) this.npcMoney -= 1;
  }

  // ── Atom-Nhilego (preserved — will be rewired to a new ability soon) ─────

  doPlayerAtomNhilego(): void {
    if (this.playerNhilegoActive) return;
    const t = this.api.scene.time.now;
    this.playerNhilegoActive = true;
    this.playerNhilegoRadius = 70;
    this.playerNhilegoSuccessCount = 0;
    this._spawnNhilegoShadow('player', t);
    this.api.showFloatingText(this.api.player.x, this.api.player.y - 35, 'Atom-Nhilego!', '#8844cc');
  }

  doNpcAtomNhilego(): void {
    if (this.npcNhilegoActive) return;
    const t = this.api.scene.time.now;
    this.npcNhilegoActive = true;
    this.npcNhilegoRadius = 70;
    this.npcNhilegoSuccessCount = 0;
    this._spawnNhilegoShadow('npc', t);
  }

  private _tickNhilego(time: number, owner: 'player' | 'npc'): void {
    const shadow = owner === 'player' ? this.playerNhilegoShadow : this.npcNhilegoShadow;
    if (!shadow || !shadow.circle?.active) return;
    if (time < shadow.fireAt) return;
    this._nhilegoImpact(shadow, owner, time);
  }

  private _nhilegoImpact(shadow: NhilegoShadow, owner: 'player' | 'npc', time: number): void {
    const { api } = this;
    const { scene } = api;
    const { x, y, radius } = shadow;
    const caster = owner === 'player' ? api.player : api.npc;

    const flash = scene.add.circle(x, y, radius, 0xcc88ff, 0.8).setDepth(12) as Phaser.GameObjects.Arc;
    scene.time.delayedCall(300, () => { if (flash?.active) flash.destroy(); });
    api.dealAoeDamage(owner, x, y, radius, 25);

    const dist = Math.hypot(caster.x - x, caster.y - y);
    if (dist <= radius) {
      if (owner === 'player') {
        this.playerNhilegoRadius *= 1.1;
        this.playerNhilegoSuccessCount++;
      } else {
        this.npcNhilegoRadius *= 1.1;
        this.npcNhilegoSuccessCount++;
      }
      const successCount = owner === 'player' ? this.playerNhilegoSuccessCount : this.npcNhilegoSuccessCount;
      api.showFloatingText(x, y - 30, `Hit! (${successCount})`, '#cc88ff');
      shadow.circle.destroy();
      this._spawnNhilegoShadow(owner, time);
    } else {
      shadow.circle.destroy();
      if (owner === 'player') this.playerNhilegoShadow = null;
      else this.npcNhilegoShadow = null;

      const successCount = owner === 'player' ? this.playerNhilegoSuccessCount : this.npcNhilegoSuccessCount;
      if (owner === 'player') this.playerNhilegoActive = false;
      else this.npcNhilegoActive = false;

      const healAmt = successCount * 10;
      if (healAmt > 0) {
        caster.heal(healAmt);
        api.showFloatingText(caster.x, caster.y - 35, `+${healAmt}`, '#aaffaa');
      }
    }
  }

  private _spawnNhilegoShadow(owner: 'player' | 'npc', time: number): void {
    const { scene } = this.api;
    const radius = owner === 'player' ? this.playerNhilegoRadius : this.npcNhilegoRadius;
    const W = this.api.sceneWidth;
    const H = this.api.sceneHeight;
    const pad = 100;
    const x = pad + Math.random() * (W - pad * 2);
    const y = pad + Math.random() * (H - pad * 2);

    const circle = scene.add
      .circle(x, y, radius, 0x221144, 0.7)
      .setDepth(4) as Phaser.GameObjects.Arc;
    circle.setStrokeStyle(2, 0x8844cc, 0.8);

    scene.tweens.add({
      targets: circle,
      scaleX: 0.9, scaleY: 0.9,
      yoyo: true, repeat: -1,
      duration: 700,
      ease: 'Sine.easeInOut',
    });

    const shadowObj: NhilegoShadow = { circle, x, y, radius, fireAt: time + 3000, owner };
    if (owner === 'player') this.playerNhilegoShadow = shadowObj;
    else this.npcNhilegoShadow = shadowObj;
  }
}
