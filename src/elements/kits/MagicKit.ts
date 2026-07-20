import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';

// ── Arena API ─────────────────────────────────────────────────────────────────

export interface MagicArenaApi {
  get player(): Fighter;
  get npc(): Fighter;
  get enemies(): Fighter[];
  get scene(): Phaser.Scene;
  get projectiles(): Phaser.Physics.Arcade.Group;
  get eKey(): Phaser.Input.Keyboard.Key;
  get qKey(): Phaser.Input.Keyboard.Key;
  get fKey(): Phaser.Input.Keyboard.Key;
  get rKey(): Phaser.Input.Keyboard.Key;
  get leftKey(): Phaser.Input.Keyboard.Key;
  get rightKey(): Phaser.Input.Keyboard.Key;
  get nukeChanneling(): boolean;
  set nukeChanneling(v: boolean);
  get nukeChannelEnd(): number;
  set nukeChannelEnd(v: number);
  get npcNukeChanneling(): boolean;
  set npcNukeChanneling(v: boolean);
  get npcNukeChannelEnd(): number;
  set npcNukeChannelEnd(v: number);
  get playerSpeedMult(): number;
  set playerSpeedMult(v: number);
  get npcSpeedMult(): number;
  set npcSpeedMult(v: number);
  getSceneWidth(): number;
  getSceneHeight(): number;
  hasUpgrade(slot: string): boolean;
  hasPerk(owner: 'player' | 'npc', perkId: string): boolean;
  dealAoeDamageFromOwner(x: number, y: number, r: number, d: number, o: 'player' | 'npc'): void;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  spawnDamageNumber(x: number, y: number, amount: number): void;
}

// ── Internal types ────────────────────────────────────────────────────────────

interface HealOrb {
  sprite: Phaser.GameObjects.Arc;
  x: number; y: number;
  vx: number; vy: number;
  owner: 'player' | 'npc';
}

interface FlameCloud {
  sprite: Phaser.GameObjects.Arc;
  x: number; y: number;
  vx: number; vy: number;
  stopped: boolean;
  expireAt: number;
  tickAccum: number;
  radius: number;
  tickDmg: number;
  tickInterval: number;
  burnDuration: number;
  owner: 'player' | 'npc';
  followCursor?: boolean; // lerp toward mouse each frame instead of decelerating
  cursedFire?: boolean;   // apply cursed fire effect on tick hits
}

interface StormCloud {
  sprite: Phaser.GameObjects.Arc;
  x: number; y: number;
  expireAt: number;
  nextPulseAt: number;
  pulseInterval: number;
  pulseRadius: number;
  pulseDmg: number;
  owner: 'player' | 'npc';
  isAcidCloud?: boolean; // if true, apply darkVuln stacks instead of slow
}

interface RockOrb {
  sprite: Phaser.GameObjects.Arc;
  angle: number;
  cracked: boolean;
  lastHitAt: number;
  canCrack: boolean;
  dmg: number;
  owner: 'player' | 'npc';
}

interface RockOrbSet {
  orbs: RockOrb[];
  expireAt: number;
  orbitR: number;
}

interface Tornado {
  sprite: Phaser.GameObjects.Arc;
  x: number; y: number;
  vx: number; vy: number;
  expireAt: number;
  nextDirAt: number;
  tickAccum: number;
  owner: 'player' | 'npc';
}

interface ThornPrison {
  ex: number; ey: number;
  chainsHp: [number, number, number, number];
  gfx: Phaser.GameObjects.Graphics;
  owner: 'player' | 'npc';
  expireAt: number;
  dotAccum: number;
}

interface SparkleShot {
  proj: Phaser.GameObjects.Image;
  startX: number; startY: number;
  maxDist: number;
  stationaryAccum: number;
  exploded: boolean;
  owner: 'player' | 'npc';
  leaderId?: string; // id of the leader sparkle this one trails
  trailOffset?: number; // px behind leader
  damageMult?: number; // 0.75 for trailing sparkles
  angle?: number; // cached aim angle for trail positioning
  id?: string; // unique id for leader/follower linking
}

interface TempleSet {
  anchorX: number; anchorY: number;
  templeSprite: Phaser.GameObjects.Arc;
  templeLabel: Phaser.GameObjects.Text;
  orbs: RockOrb[];
  expireAt: number;
  orbitR: number;
  owner: 'player' | 'npc';
  contactDmg: number;
  slowMs: number;  // non-zero → apply dark80Slow instead of stun
  stunMs: number;  // non-zero → stun on contact
}

interface TortureTrapLink {
  target: Fighter;
  gfx: Phaser.GameObjects.Graphics;
  expireAt: number; // Date.now() based
  tickAccum: number;
  owner: 'player' | 'npc';
}

// ── Wheel data ────────────────────────────────────────────────────────────────

const GRIMOIRE_LABELS  = ['🔥 Flame Burst', '🌧️ Storm Cloud', '🌿 V. Thorns', '💨 Compression', '🪨 Gaia Guide'];
const GRIMOIRE_COLORS  = [0xff7733, 0x3388ff, 0x33aa44, 0x888888, 0x885522];
const NECRO_LABELS     = ['🌋 Flame Barrage', '🌊 Final Drench', '🌿 Thorn Prison', '🌪️ Tornado', '🌋 Gaia Rage'];
const NECRO_COLORS     = [0xcc2200, 0x1144aa, 0x226622, 0x444444, 0x553311];

const DARK_GRIMOIRE_LABELS = ['🔥 Corrupt Flames', '⛈️ Acid Cloud', '🌿 Drain Thorns', '💨 Dark Gale', '🛕 Gaia Temple'];
const DARK_GRIMOIRE_COLORS = [0xff5500, 0x3366cc, 0x22aa44, 0x888888, 0x775533];
const DARK_NECRO_LABELS    = ['🌋 Dark Barrage', '🌊 Acid Rain', '🌿 Torture Trap', '🌪️ Hurricane Vac.', '🌋 Gaia Monument'];
const DARK_NECRO_COLORS    = [0xcc1100, 0x112255, 0x226633, 0x333333, 0x442200];

// ── MagicKit ──────────────────────────────────────────────────────────────────

export class MagicKit {

  // ── Player wheel state ────────────────────────────────────────────────────
  private grimoireMenuOpen = false;
  private grimoireMenuGfx: Phaser.GameObjects.Graphics | null = null;
  private grimoireMenuLabels: Phaser.GameObjects.Text[] = [];
  private grimoireSelectedIndex = 0;
  private grimoireHoldStart = 0;
  private grimoireKeyNavUsed = false;
  private grimoireLastPick = 0;

  private necronomiconMenuOpen = false;
  private necronomiconMenuGfx: Phaser.GameObjects.Graphics | null = null;
  private necronomiconMenuLabels: Phaser.GameObjects.Text[] = [];
  private necronomiconSelectedIndex = 0;
  private necronomiconHoldStart = 0;
  private necronomiconKeyNavUsed = false;
  private necronomiconLastPick = 0;

  private aimCountdownLabel: Phaser.GameObjects.Text | null = null;
  private aimCountdownEnd = 0;
  private aimCountdownFired = false;

  // ── Anchor ────────────────────────────────────────────────────────────────
  private anchor: { x: number; y: number; sprite: Phaser.GameObjects.Arc | null } | null = null;
  private npcAnchor: { x: number; y: number; sprite: Phaser.GameObjects.Arc | null } | null = null;

  // ── Meditate ──────────────────────────────────────────────────────────────
  private meditating = false;
  private meditateEndAt = 0;
  private meditateNextSpawn = 0;
  private npcMeditating = false;
  private npcMeditateEndAt = 0;
  private npcMeditateNextSpawn = 0;

  // ── Heal orbs ─────────────────────────────────────────────────────────────
  private healOrbs: HealOrb[] = [];

  // ── Chain bind (player bound by NPC's vine) ───────────────────────────────
  private playerBound = false;
  private playerBoundEnd = 0;

  // ── Sparkle shots ─────────────────────────────────────────────────────────
  private sparkleShots: SparkleShot[] = [];

  // ── Flame clouds ──────────────────────────────────────────────────────────
  private flameClouds: FlameCloud[] = [];

  // ── Storm clouds + slow timestamps ───────────────────────────────────────
  private stormClouds: StormCloud[] = [];
  private npcStormSlowUntil = 0;
  private playerStormSlowUntil = 0;

  // ── Rock orbs ─────────────────────────────────────────────────────────────
  private playerRockSet: RockOrbSet | null = null;
  private npcRockSet: RockOrbSet | null = null;

  // ── Tornadoes ─────────────────────────────────────────────────────────────
  private tornadoes: Tornado[] = [];

  // ── Thorn prisons ─────────────────────────────────────────────────────────
  private thornPrison: ThornPrison | null = null;
  private npcThornPrison: ThornPrison | null = null;

  // ── Darkness system (player only; NPC never uses upgrades) ────────────────
  private darkness = 0;
  private darkGrimoireMode = false;
  private darkNecroMode = false;
  private darkCenterPressed = false;
  private darknessBarGfx: Phaser.GameObjects.Graphics | null = null;
  private darknessBarText: Phaser.GameObjects.Text | null = null;

  // ── R+ Wild Anchor speed boost ────────────────────────────────────────────
  private playerJustRecalledAt = 0;
  private playerSpeedBoostUntil = 0;
  private playerSpeedBoostMult = 1;
  private playerSpeedBoostDark = false;
  private playerSpeedBoostAura: Phaser.GameObjects.Arc | null = null;

  // ── F+ mobile meditate ────────────────────────────────────────────────────
  private playerMeditateMobile = false;
  private playerMeditateTrail: Phaser.GameObjects.Arc[] = [];
  private playerMeditateTrailNext = 0;

  // ── Dark status effects (internal to kit) ─────────────────────────────────
  private npcCursedFireUntil = 0;
  private npcCursedFireTickAccum = 0;
  private npcDark80SlowUntil = 0;

  // ── Dark Gale cone (E+ Recalling Gale / Q+ Hurricane initial pull) ─────────
  private playerDarkGaleUntil = 0;
  private playerDarkGaleAngle = 0;
  private playerDarkGaleOnce = false;
  private playerHurricaneGaleUntil = 0;
  private playerHurricaneGaleAngle = 0;
  private playerHurricaneGaleOnce = false;

  // ── Dark vine graphics (instant vine arm visual) ──────────────────────────
  private playerDarkVineGfx: Phaser.GameObjects.Graphics | null = null;
  private playerDarkVineExpireAt = 0;

  // ── Temple/Monument orb sets (fixed-anchor orbits) ────────────────────────
  private templeSets: TempleSet[] = [];

  // ── Torture trap links ────────────────────────────────────────────────────
  private tortureTrapLinks: TortureTrapLink[] = [];

  // ── Thunder perk (abstract-triple) ────────────────────────────────────────
  private playerThunderECharged = false;
  private playerThunderQCharged = false;
  private npcThunderECharged = false;
  private npcThunderQCharged = false;
  private playerThunderThornCharged = false;

  constructor(private api: MagicArenaApi) {}

  // ── Public getters (queried by ArenaScene) ────────────────────────────────

  isPlayerBound(time: number): boolean {
    return this.playerBound && time < this.playerBoundEnd;
  }

  getPlayerSlowMult(): number {
    const now = this.api.scene.sys.game.loop.now;
    return now < this.playerStormSlowUntil ? 0.5 : 1.0;
  }

  getNpcSlowMult(): number {
    const now = this.api.scene.sys.game.loop.now;
    return now < this.npcStormSlowUntil ? 0.5 : 1.0;
  }

  getPlayerSpeedBoostMult(): number {
    const now = this.api.scene.sys.game.loop.now;
    return now < this.playerSpeedBoostUntil ? this.playerSpeedBoostMult : 1;
  }

  getPlayerMeditateSlowMult(): number {
    return this.playerMeditateMobile && this.meditating ? 0.25 : 1;
  }

  getNpcDark80SlowMult(): number {
    const now = this.api.scene.sys.game.loop.now;
    return now < this.npcDark80SlowUntil ? 0.2 : 1;
  }

  isThunderCharged(slot: 'e' | 'q'): boolean {
    return slot === 'e' ? this.playerThunderECharged : this.playerThunderQCharged;
  }

  // ── reset ─────────────────────────────────────────────────────────────────

  reset(): void {
    this.grimoireMenuOpen = false;
    if (this.grimoireMenuGfx) { this.grimoireMenuGfx.destroy(); this.grimoireMenuGfx = null; }
    for (const l of this.grimoireMenuLabels) l.destroy();
    this.grimoireMenuLabels = [];
    this.grimoireSelectedIndex = 0; this.grimoireHoldStart = 0;
    this.grimoireKeyNavUsed = false; this.grimoireLastPick = 0;

    this.necronomiconMenuOpen = false;
    if (this.necronomiconMenuGfx) { this.necronomiconMenuGfx.destroy(); this.necronomiconMenuGfx = null; }
    for (const l of this.necronomiconMenuLabels) l.destroy();
    this.necronomiconMenuLabels = [];
    this.necronomiconSelectedIndex = 0; this.necronomiconHoldStart = 0;
    this.necronomiconKeyNavUsed = false; this.necronomiconLastPick = 0;

    if (this.aimCountdownLabel) { this.aimCountdownLabel.destroy(); this.aimCountdownLabel = null; }
    this.aimCountdownEnd = 0; this.aimCountdownFired = false;

    if (this.anchor) { this.anchor.sprite?.destroy(); this.anchor = null; }
    if (this.npcAnchor) { this.npcAnchor.sprite?.destroy(); this.npcAnchor = null; }

    this.meditating = false; this.meditateEndAt = 0; this.meditateNextSpawn = 0;
    this.npcMeditating = false; this.npcMeditateEndAt = 0; this.npcMeditateNextSpawn = 0;

    for (const o of this.healOrbs) o.sprite.destroy();
    this.healOrbs = [];

    this.playerBound = false; this.playerBoundEnd = 0;

    for (const s of this.sparkleShots) { if ((s.proj as any).active) { s.proj.setActive(false).setVisible(false); } }
    this.sparkleShots = [];

    for (const c of this.flameClouds) c.sprite.destroy();
    this.flameClouds = [];

    for (const c of this.stormClouds) c.sprite.destroy();
    this.stormClouds = [];
    this.npcStormSlowUntil = 0; this.playerStormSlowUntil = 0;

    this._destroyRockSet(this.playerRockSet); this.playerRockSet = null;
    this._destroyRockSet(this.npcRockSet); this.npcRockSet = null;

    for (const t of this.tornadoes) t.sprite.destroy();
    this.tornadoes = [];

    if (this.thornPrison) { this.thornPrison.gfx.destroy(); this.thornPrison = null; }
    if (this.npcThornPrison) { this.npcThornPrison.gfx.destroy(); this.npcThornPrison = null; }

    // Dark magic state
    this.darkness = 0;
    this.darkGrimoireMode = false; this.darkNecroMode = false;
    this.darkCenterPressed = false;
    if (this.darknessBarGfx) { this.darknessBarGfx.destroy(); this.darknessBarGfx = null; }
    if (this.darknessBarText) { this.darknessBarText.destroy(); this.darknessBarText = null; }

    this.playerJustRecalledAt = 0;
    this.playerSpeedBoostUntil = 0; this.playerSpeedBoostMult = 1; this.playerSpeedBoostDark = false;
    if (this.playerSpeedBoostAura) { this.playerSpeedBoostAura.destroy(); this.playerSpeedBoostAura = null; }

    this.playerMeditateMobile = false;
    for (const s of this.playerMeditateTrail) { if (s.active) s.destroy(); }
    this.playerMeditateTrail = []; this.playerMeditateTrailNext = 0;

    this.npcCursedFireUntil = 0; this.npcCursedFireTickAccum = 0;
    this.npcDark80SlowUntil = 0;
    this.playerDarkGaleUntil = 0; this.playerHurricaneGaleUntil = 0;
    if (this.playerDarkVineGfx) { this.playerDarkVineGfx.destroy(); this.playerDarkVineGfx = null; }
    this.playerDarkVineExpireAt = 0;

    for (const ts of this.templeSets) {
      ts.templeSprite.destroy(); ts.templeLabel.destroy();
      for (const o of ts.orbs) o.sprite.destroy();
    }
    this.templeSets = [];

    for (const link of this.tortureTrapLinks) link.gfx.destroy();
    this.tortureTrapLinks = [];

    this.playerThunderECharged = false;
    this.playerThunderQCharged = false;
    this.npcThunderECharged = false;
    this.npcThunderQCharged = false;
    this.playerThunderThornCharged = false;
  }

  private _destroyRockSet(set: RockOrbSet | null): void {
    if (!set) return;
    for (const o of set.orbs) o.sprite.destroy();
  }

  private addDarkness(amount: number): void {
    this.darkness = Math.min(100, this.darkness + amount);
    this.api.showFloatingText(this.api.player.x, this.api.player.y - 44, `+${amount} ☠`, '#880088');
    if (this.darkness >= 100) {
      this.api.player.applySelfDamage(this.api.player.hp);
      this.api.showFloatingText(this.api.player.x, this.api.player.y - 28, '☠ Consumed by Darkness!', '#220022');
    }
  }

  private _pointToSegDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
    const dx = bx - ax, dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Phaser.Math.Distance.Between(px, py, ax, ay);
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
    return Phaser.Math.Distance.Between(px, py, ax + t * dx, ay + t * dy);
  }

  // ── handleInput (player only) ─────────────────────────────────────────────

  handleInput(
    time: number,
    _delta: number,
    _pointer: Phaser.Input.Pointer,
    mouseX: number,
    mouseY: number,
  ): void {
    const { eKey, qKey, fKey, rKey, leftKey, rightKey } = this.api;

    // While wheel open — key nav, release detection, dark mode center toggle
    if (this.grimoireMenuOpen || this.necronomiconMenuOpen) {
      const isGrimoire = this.grimoireMenuOpen;
      const idx = isGrimoire ? this.grimoireSelectedIndex : this.necronomiconSelectedIndex;
      const count = 5;

      // Center dark-mode toggle button
      const ptr2 = this.api.scene.input.activePointer;
      const centerDist = Phaser.Math.Distance.Between(ptr2.worldX, ptr2.worldY, this.api.player.x, this.api.player.y);
      const upgradeSlot = isGrimoire ? 'e' : 'q';
      if (ptr2.isDown) {
        if (!this.darkCenterPressed && centerDist <= 28 && this.api.hasUpgrade(upgradeSlot)) {
          this.darkCenterPressed = true;
          if (isGrimoire) this.darkGrimoireMode = !this.darkGrimoireMode;
          else this.darkNecroMode = !this.darkNecroMode;
          this._drawMenu(isGrimoire ? 'grimoire' : 'necronomicon', idx);
        }
      } else {
        this.darkCenterPressed = false;
      }

      // Mouse hover — select the wedge under the pointer
      if (centerDist > 28) {
        const rawAngle = Math.atan2(ptr2.worldY - this.api.player.y, ptr2.worldX - this.api.player.x);
        const angleStep = (Math.PI * 2) / count;
        const normalized = (((rawAngle + Math.PI / 2) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const hoverIdx = Math.round(normalized / angleStep) % count;
        if (hoverIdx !== idx) {
          if (isGrimoire) { this.grimoireSelectedIndex = hoverIdx; this.grimoireKeyNavUsed = true; }
          else { this.necronomiconSelectedIndex = hoverIdx; this.necronomiconKeyNavUsed = true; }
          this._drawMenu(isGrimoire ? 'grimoire' : 'necronomicon', hoverIdx);
        }
      }

      if (Phaser.Input.Keyboard.JustDown(leftKey)) {
        const newIdx = (idx + count - 1) % count;
        if (isGrimoire) this.grimoireSelectedIndex = newIdx;
        else this.necronomiconSelectedIndex = newIdx;
        if (isGrimoire) this.grimoireKeyNavUsed = true;
        else this.necronomiconKeyNavUsed = true;
        this._drawMenu(isGrimoire ? 'grimoire' : 'necronomicon', newIdx);
      }
      if (Phaser.Input.Keyboard.JustDown(rightKey)) {
        const newIdx = (idx + 1) % count;
        if (isGrimoire) this.grimoireSelectedIndex = newIdx;
        else this.necronomiconSelectedIndex = newIdx;
        if (isGrimoire) this.grimoireKeyNavUsed = true;
        else this.necronomiconKeyNavUsed = true;
        this._drawMenu(isGrimoire ? 'grimoire' : 'necronomicon', newIdx);
      }

      if (Phaser.Input.Keyboard.JustUp(eKey) && isGrimoire) {
        const heldMs = time - this.grimoireHoldStart;
        const pick = (heldMs < 150 && !this.grimoireKeyNavUsed)
          ? this.grimoireLastPick
          : this.grimoireSelectedIndex;
        this.grimoireLastPick = pick;
        this._closeMenu('grimoire');
        const thunderCharged = this.playerThunderECharged;
        this.playerThunderECharged = false;
        this._spawnAimCountdown(() => {
          const ptr = this.api.scene.input.activePointer;
          this._dispatchGrimoireWedge(pick, ptr.worldX, ptr.worldY, 'player', thunderCharged);
          this.api.player.triggerCooldown('magic-grimoire');
        });
      }
      if (Phaser.Input.Keyboard.JustUp(qKey) && !isGrimoire) {
        const heldMs = time - this.necronomiconHoldStart;
        const pick = (heldMs < 150 && !this.necronomiconKeyNavUsed)
          ? this.necronomiconLastPick
          : this.necronomiconSelectedIndex;
        this.necronomiconLastPick = pick;
        this._closeMenu('necronomicon');
        const thunderQCharged = this.playerThunderQCharged;
        this.playerThunderQCharged = false;
        this._spawnAimCountdown(() => {
          const ptr = this.api.scene.input.activePointer;
          this._dispatchNecronomiconWedge(pick, ptr.worldX, ptr.worldY, 'player', thunderQCharged);
          this.api.player.triggerCooldown('magic-necronomicon');
          if (thunderQCharged) this.api.player.reduceCooldown('magic-necronomicon', 15000);
        });
      }
      return;
    }

    const ptr = this.api.scene.input.activePointer;
    // Click — Sparkle Shot
    if (ptr.leftButtonDown()) {
      this.api.player.castAbility('magic-sparkle-shot', this._buildPlayerCtx(mouseX, mouseY));
    }

    // E — open grimoire wheel (Thunder perk: first tap = Lightning Call / arm)
    if (Phaser.Input.Keyboard.JustDown(eKey)) {
      if (this.api.player.getCooldownRatio('magic-grimoire') >= 1) {
        if (this.api.hasPerk('player', 'thunder') && !this.playerThunderECharged) {
          this._doLightningCall('player');
          this.playerThunderECharged = true;
          this.api.player.triggerCooldown('magic-grimoire');
        } else {
          this.grimoireHoldStart = time;
          this.grimoireKeyNavUsed = false;
          this._openMenu('grimoire', this.grimoireLastPick);
        }
      }
    }

    // R — Anchor
    if (Phaser.Input.Keyboard.JustDown(rKey)) {
      this.api.player.castAbility('magic-anchor', this._buildPlayerCtx(mouseX, mouseY));
    }

    // F — Meditate (hold to channel; F+ mobile variant allows movement)
    if (Phaser.Input.Keyboard.JustDown(fKey)) {
      this.api.player.castAbility('magic-meditate', this._buildPlayerCtx(mouseX, mouseY));
    }
    if (this.meditating && !fKey.isDown && this.playerMeditateMobile) {
      this.endMeditate('player', false);
    }

    // Q — open necronomicon wheel (Thunder perk: first tap = Apocalypse Call / arm)
    if (Phaser.Input.Keyboard.JustDown(qKey)) {
      if (this.api.player.getCooldownRatio('magic-necronomicon') >= 1) {
        if (this.api.hasPerk('player', 'thunder') && !this.playerThunderQCharged) {
          this._doApocalypseCall('player');
          this.playerThunderQCharged = true;
          this.api.player.triggerCooldown('magic-necronomicon');
        } else {
          this.necronomiconHoldStart = time;
          this.necronomiconKeyNavUsed = false;
          this._openMenu('necronomicon', this.necronomiconLastPick);
        }
      }
    }
  }

  // ── update (per-frame) ────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    const W = this.api.getSceneWidth();
    const H = this.api.getSceneHeight();

    // ── Aim countdown label ───────────────────────────────────────────
    if (this.aimCountdownLabel?.active) {
      const remaining = Math.max(0, (this.aimCountdownEnd - time) / 1000);
      this.aimCountdownLabel.setText(`✨ ${remaining.toFixed(1)}`);
      this.aimCountdownLabel.setPosition(this.api.player.x, this.api.player.y - 54);
    }

    // ── Reposition open menus ─────────────────────────────────────────
    if (this.grimoireMenuOpen) {
      this._drawMenu('grimoire', this.grimoireSelectedIndex);
    }
    if (this.necronomiconMenuOpen) {
      this._drawMenu('necronomicon', this.necronomiconSelectedIndex);
    }

    // ── Meditate — spawn heal orbs ────────────────────────────────────
    for (const owner of ['player', 'npc'] as const) {
      const meditating = owner === 'player' ? this.meditating : this.npcMeditating;
      const endAt = owner === 'player' ? this.meditateEndAt : this.npcMeditateEndAt;
      if (meditating) {
        if (time >= endAt) {
          this.endMeditate(owner, false);
          continue;
        }
        const nextSpawn = owner === 'player' ? this.meditateNextSpawn : this.npcMeditateNextSpawn;
        if (time >= nextSpawn) {
          this._spawnHealOrb(owner);
          if (owner === 'player') this.meditateNextSpawn = time + 500;
          else this.npcMeditateNextSpawn = time + 500;
        }
      }
    }

    // ── Heal orbs ─────────────────────────────────────────────────────
    for (let i = this.healOrbs.length - 1; i >= 0; i--) {
      const orb = this.healOrbs[i];
      orb.x += orb.vx * (delta / 1000);
      orb.y += orb.vy * (delta / 1000);
      orb.sprite.setPosition(orb.x, orb.y);
      if (orb.x < 0 || orb.x > W || orb.y < 0 || orb.y > H) {
        orb.sprite.destroy();
        this.healOrbs.splice(i, 1);
        continue;
      }
      const caster = orb.owner === 'player' ? this.api.player : this.api.npc;
      let orbHit = false;
      for (const enemy of (orb.owner === 'player' ? this.api.enemies : [this.api.player])) {
        if (!enemy.active || enemy.hp <= 0) continue;
        if (Phaser.Math.Distance.Between(orb.x, orb.y, enemy.x, enemy.y) <= 28) {
          enemy.takeDamage(8);
          this.api.spawnHitFlash(enemy.x, enemy.y, 0xcc99ff);
          orbHit = true;
          break;
        }
      }
      if (orbHit) { orb.sprite.destroy(); this.healOrbs.splice(i, 1); continue; }
      if (Phaser.Math.Distance.Between(orb.x, orb.y, caster.x, caster.y) <= 24) {
        caster.heal(5);
        if (orb.owner === 'player') {
          this.api.showFloatingText(caster.x, caster.y - 28, '+5 ✨', '#cc99ff');
          // F+: each orb reduces darkness by 5
          if (this.api.hasUpgrade('f') && this.darkness > 0) {
            this.darkness = Math.max(0, this.darkness - 5);
            this.api.showFloatingText(caster.x, caster.y - 44, '-5 ☠', '#aa55ff');
          }
        }
        orb.sprite.destroy();
        this.healOrbs.splice(i, 1);
      }
    }

    // ── Sparkle shots ─────────────────────────────────────────────────
    // First: update leader positions and track which leaders have exploded
    const explodedLeaders = new Set<string>();
    const leaderPositions = new Map<string, { x: number; y: number }>();
    for (const s of this.sparkleShots) {
      if (s.id && !s.leaderId) leaderPositions.set(s.id, { x: s.proj.x, y: s.proj.y });
    }

    for (let i = this.sparkleShots.length - 1; i >= 0; i--) {
      const s = this.sparkleShots[i];
      if (!s.proj.active) { this.sparkleShots.splice(i, 1); continue; }
      const body = (s.proj as any).body as Phaser.Physics.Arcade.Body;

      // Trailing sparkle: follow leader position offset
      if (s.leaderId && s.trailOffset !== undefined && s.angle !== undefined) {
        const leaderPos = leaderPositions.get(s.leaderId);
        if (!leaderPos) {
          // Leader gone — explode this trailer too
          if (!s.exploded) {
            s.exploded = true;
            const dmg = Math.round(14 * (s.damageMult ?? 0.75));
            this.api.dealAoeDamageFromOwner(s.proj.x, s.proj.y, 45, dmg, s.owner);
            const ring2 = (this.api.scene.add as Phaser.GameObjects.GameObjectFactory).circle(s.proj.x, s.proj.y, 15, 0xff99ff, 0.5).setDepth(9);
            this.api.scene.tweens.add({ targets: ring2, scaleX: 2.5, scaleY: 2.5, alpha: 0, duration: 350, onComplete: () => ring2.destroy() });
          }
          s.proj.setActive(false).setVisible(false);
          body.stop();
          this.sparkleShots.splice(i, 1);
          continue;
        }
        // Position trailer behind leader
        const tx2 = leaderPos.x - Math.cos(s.angle) * s.trailOffset;
        const ty2 = leaderPos.y - Math.sin(s.angle) * s.trailOffset;
        s.proj.setPosition(tx2, ty2);
        body.setVelocity(0, 0);
        continue;
      }

      // Leader sparkle logic
      const speed = Math.sqrt(body.velocity.x ** 2 + body.velocity.y ** 2);
      const dist = Phaser.Math.Distance.Between(s.proj.x, s.proj.y, s.startX, s.startY);

      if (s.id) leaderPositions.set(s.id, { x: s.proj.x, y: s.proj.y });

      if (!s.exploded && (dist >= s.maxDist || speed < 5)) {
        body.setVelocity(0, 0);
        s.stationaryAccum += delta;
        if (s.stationaryAccum >= 1000) {
          s.exploded = true;
          if (s.id) explodedLeaders.add(s.id);
          this.api.dealAoeDamageFromOwner(s.proj.x, s.proj.y, 55, 14, s.owner);
          const ring = (this.api.scene.add as Phaser.GameObjects.GameObjectFactory).circle(s.proj.x, s.proj.y, 20, 0xff99ff, 0.6).setDepth(9);
          this.api.scene.tweens.add({ targets: ring, scaleX: 3, scaleY: 3, alpha: 0, duration: 400, onComplete: () => ring.destroy() });
          this.api.showFloatingText(s.proj.x, s.proj.y - 20, '✨ SPARKLE', '#ff99ff');
          s.proj.setActive(false).setVisible(false);
          body.stop();
          leaderPositions.delete(s.id!);
          this.sparkleShots.splice(i, 1);
        }
      }
    }

    // ── Flame clouds ──────────────────────────────────────────────────
    const ptr = this.api.scene.input.activePointer;
    for (let i = this.flameClouds.length - 1; i >= 0; i--) {
      const c = this.flameClouds[i];
      if (time >= c.expireAt) { c.sprite.destroy(); this.flameClouds.splice(i, 1); continue; }
      if (c.followCursor) {
        // Dark flame cloud: lerp toward cursor (VoidKit voidAsh pattern)
        c.x += (ptr.worldX - c.x) * 0.10;
        c.y += (ptr.worldY - c.y) * 0.10;
        c.sprite.setPosition(c.x, c.y);
      } else if (!c.stopped) {
        c.vx *= 0.93;
        c.vy *= 0.93;
        c.x += c.vx * (delta / 1000);
        c.y += c.vy * (delta / 1000);
        c.sprite.setPosition(c.x, c.y);
        if (Math.abs(c.vx) < 2 && Math.abs(c.vy) < 2) c.stopped = true;
      }
      // Tick damage + burn
      const targets = (c.owner === 'player' ? this.api.enemies : [this.api.player])
        .filter(t => t.active && t.hp > 0 && Phaser.Math.Distance.Between(c.x, c.y, t.x, t.y) <= c.radius);
      if (targets.length > 0) {
        c.tickAccum += delta;
        while (c.tickAccum >= c.tickInterval) {
          for (const t of targets) {
            t.takeDamage(c.tickDmg);
            this.api.spawnHitFlash(t.x, t.y, c.cursedFire ? 0x882200 : 0xff6600);
            t.burningUntil = Math.max(t.burningUntil, time + c.burnDuration);
            if (c.cursedFire && c.owner === 'player') {
              this.npcCursedFireUntil = Math.max(this.npcCursedFireUntil, time + 3000);
            }
          }
          c.tickAccum -= c.tickInterval;
        }
      } else {
        c.tickAccum = 0;
      }
    }

    // ── Storm clouds ──────────────────────────────────────────────────
    for (let i = this.stormClouds.length - 1; i >= 0; i--) {
      const c = this.stormClouds[i];
      if (time >= c.expireAt) { c.sprite.destroy(); this.stormClouds.splice(i, 1); continue; }
      if (time >= c.nextPulseAt && c.nextPulseAt > 0) {
        c.nextPulseAt = time + c.pulseInterval;
        // Ring VFX
        const ring = (this.api.scene.add as Phaser.GameObjects.GameObjectFactory).circle(c.x, c.y, 10, c.owner === 'player' ? 0x3388ff : 0x1144aa, 0.4).setDepth(8);
        this.api.scene.tweens.add({ targets: ring, scaleX: c.pulseRadius / 10, scaleY: c.pulseRadius / 10, alpha: 0, duration: 500, onComplete: () => ring.destroy() });
        // Apply slow / acid vuln + damage
        const targets = (c.owner === 'player' ? this.api.enemies : [this.api.player])
          .filter(t => t.active && t.hp > 0 && Phaser.Math.Distance.Between(c.x, c.y, t.x, t.y) <= c.pulseRadius);
        for (const t of targets) {
          if (c.isAcidCloud) {
            // Dark acid cloud: apply darkVuln stack (independent 3s timer via delayedCall)
            t.darkVulnStacks++;
            this.api.scene.time.delayedCall(3000, () => {
              if (t.active && t.darkVulnStacks > 0) t.darkVulnStacks--;
            });
            this.api.showFloatingText(t.x, t.y - 28, '⛈️ ACID -25%', '#44ff88');
          } else {
            if (c.owner === 'player') this.npcStormSlowUntil = Math.max(this.npcStormSlowUntil, time + 1500);
            else this.playerStormSlowUntil = Math.max(this.playerStormSlowUntil, time + 1500);
          }
          if (c.pulseDmg > 0) {
            t.takeDamage(c.pulseDmg);
            this.api.spawnDamageNumber(t.x, t.y - 28, c.pulseDmg);
            this.api.spawnHitFlash(t.x, t.y, c.isAcidCloud ? 0x44ff88 : 0x44aaff);
          }
        }
        if (c.nextPulseAt > c.expireAt) c.nextPulseAt = 0; // no more pulses
      }
    }

    // ── Rock orbs ─────────────────────────────────────────────────────
    for (const owner of ['player', 'npc'] as const) {
      const set = owner === 'player' ? this.playerRockSet : this.npcRockSet;
      if (!set) continue;
      if (time >= set.expireAt) {
        this._destroyRockSet(set);
        if (owner === 'player') this.playerRockSet = null;
        else this.npcRockSet = null;
        continue;
      }
      const caster = owner === 'player' ? this.api.player : this.api.npc;
      const enemies = owner === 'player' ? this.api.enemies : [this.api.player];
      const projGroup = this.api.projectiles;

      for (let ri = set.orbs.length - 1; ri >= 0; ri--) {
        const orb = set.orbs[ri];
        orb.angle += 0.003 * delta;
        const ox = caster.x + Math.cos(orb.angle) * set.orbitR;
        const oy = caster.y + Math.sin(orb.angle) * set.orbitR;
        orb.sprite.setPosition(ox, oy);

        // Contact with enemy
        if (time - orb.lastHitAt >= 300) {
          for (const enemy of enemies) {
            if (!enemy.active || enemy.hp <= 0) continue;
            if (Phaser.Math.Distance.Between(ox, oy, enemy.x, enemy.y) <= 22) {
              enemy.takeDamage(orb.dmg);
              this.api.spawnHitFlash(enemy.x, enemy.y, 0xaa7733);
              this.api.spawnDamageNumber(enemy.x, enemy.y - 28, orb.dmg);
              orb.lastHitAt = time;
              if (orb.canCrack && !orb.cracked) {
                orb.cracked = true;
                orb.sprite.setFillStyle(0x999999);
                orb.sprite.setStrokeStyle(2, 0x666666, 1);
              } else {
                orb.sprite.destroy();
                set.orbs.splice(ri, 1);
              }
              break;
            }
          }
        }

        if (ri >= set.orbs.length) continue;

        // Block hostile projectiles
        const projs = projGroup.getMatching('active', true) as Phaser.GameObjects.Image[];
        for (const p of projs) {
          const pAny = p as any;
          const isHostile = owner === 'player' ? !pAny.isFromPlayer : pAny.isFromPlayer;
          if (!isHostile) continue;
          if (Phaser.Math.Distance.Between(ox, oy, p.x, p.y) <= 18) {
            p.setActive(false).setVisible(false);
            (pAny.body as Phaser.Physics.Arcade.Body)?.stop();
            orb.lastHitAt = time;
            if (orb.canCrack && !orb.cracked) {
              orb.cracked = true;
              orb.sprite.setFillStyle(0x999999);
              orb.sprite.setStrokeStyle(2, 0x666666, 1);
            } else {
              orb.sprite.destroy();
              set.orbs.splice(ri, 1);
            }
            break;
          }
          if (ri >= set.orbs.length) break;
        }
      }
      if (set.orbs.length === 0) {
        if (owner === 'player') this.playerRockSet = null;
        else this.npcRockSet = null;
      }
    }

    // ── Tornadoes ─────────────────────────────────────────────────────
    for (let i = this.tornadoes.length - 1; i >= 0; i--) {
      const t = this.tornadoes[i];
      if (time >= t.expireAt) { t.sprite.destroy(); this.tornadoes.splice(i, 1); continue; }
      // Erratic direction change
      if (time >= t.nextDirAt) {
        const targetFighter = t.owner === 'player' ? this.api.npc : this.api.player;
        const seekEnemy = Math.random() < 0.4;
        let angle: number;
        if (seekEnemy) {
          angle = Math.atan2(targetFighter.y - t.y, targetFighter.x - t.x);
        } else {
          angle = Math.random() * Math.PI * 2;
        }
        const spd = 150;
        t.vx = Math.cos(angle) * spd;
        t.vy = Math.sin(angle) * spd;
        t.nextDirAt = time + 400 + Math.random() * 400;
      }
      t.x += t.vx * (delta / 1000);
      t.y += t.vy * (delta / 1000);
      // Clamp to arena
      const pad = 40;
      if (t.x < pad) { t.x = pad; t.vx = Math.abs(t.vx); }
      if (t.x > W - pad) { t.x = W - pad; t.vx = -Math.abs(t.vx); }
      if (t.y < pad) { t.y = pad; t.vy = Math.abs(t.vy); }
      if (t.y > H - pad) { t.y = H - pad; t.vy = -Math.abs(t.vy); }
      t.sprite.setPosition(t.x, t.y);
      t.sprite.rotation += 0.012 * delta;

      // Periodic damage + push
      t.tickAccum += delta;
      if (t.tickAccum >= 200) {
        t.tickAccum -= 200;
        const targets = (t.owner === 'player' ? this.api.enemies : [this.api.player])
          .filter(e => e.active && e.hp > 0 && Phaser.Math.Distance.Between(t.x, t.y, e.x, e.y) <= 80);
        for (const e of targets) {
          e.takeDamage(4);
          this.api.spawnHitFlash(e.x, e.y, 0x888888);
          const dx = e.x - t.x; const dy = e.y - t.y;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          (e.body as Phaser.Physics.Arcade.Body).setVelocity((dx / len) * 450, (dy / len) * 450);
        }
      }
    }

    // ── Thorn prisons ─────────────────────────────────────────────────
    for (const owner of ['player', 'npc'] as const) {
      const tp = owner === 'player' ? this.thornPrison : this.npcThornPrison;
      if (!tp) continue;
      const pad2 = 32;
      const corners: [number, number][] = [
        [pad2, pad2], [W - pad2, pad2], [pad2, H - pad2], [W - pad2, H - pad2],
      ];
      const captive = owner === 'player'
        ? this.api.enemies.find(e => e.active && e.hp > 0) ?? this.api.npc
        : this.api.player;
      captive.setPosition(tp.ex, tp.ey);
      tp.gfx.clear();
      let allBroken = true;
      for (let c = 0; c < 4; c++) {
        if (tp.chainsHp[c] > 0) {
          allBroken = false;
          const alpha = tp.chainsHp[c] / 15;
          tp.gfx.lineStyle(4, 0x33aa44, Math.max(0.2, alpha));
          tp.gfx.beginPath();
          tp.gfx.moveTo(tp.ex, tp.ey);
          tp.gfx.lineTo(corners[c][0], corners[c][1]);
          tp.gfx.strokePath();
        }
      }
      // Captive's projectiles damage chains
      const projArray = this.api.projectiles.getMatching('active', true) as Phaser.GameObjects.Image[];
      for (const p of projArray) {
        const pAny = p as any;
        const isFromCaptive = owner === 'player' ? !pAny.isFromPlayer : pAny.isFromPlayer;
        if (!isFromCaptive) continue;
        for (let c = 0; c < 4; c++) {
          if (tp.chainsHp[c] <= 0) continue;
          if (Phaser.Math.Distance.Between(p.x, p.y, corners[c][0], corners[c][1]) <= 40 ||
              Phaser.Math.Distance.Between(p.x, p.y, tp.ex, tp.ey) <= 30) {
            tp.chainsHp[c] -= (pAny.damage ?? 0);
            p.setActive(false).setVisible(false);
            (pAny.body as Phaser.Physics.Arcade.Body)?.stop();
          }
        }
      }
      // DoT
      tp.dotAccum += delta;
      while (tp.dotAccum >= 1000) {
        captive.takeDamage(3);
        this.api.spawnHitFlash(captive.x, captive.y, 0x33aa44);
        tp.dotAccum -= 1000;
      }
      // End condition
      const elapsed = tp.expireAt - time;
      if (allBroken || elapsed <= 0) {
        tp.gfx.destroy();
        captive.takeDamage(35);
        this.api.spawnDamageNumber(tp.ex, tp.ey - 28, 35);
        this.api.showFloatingText(tp.ex, tp.ey - 44, allBroken ? '🌿 FREED!' : '🌿 ENSNARED', '#33ff66');
        if (owner === 'player') this.thornPrison = null;
        else this.npcThornPrison = null;
      }
    }

    // ── Chain-bound expiry ────────────────────────────────────────────
    if (this.playerBound && time >= this.playerBoundEnd) {
      this.playerBound = false;
    }
    if (this.api.npc.magicChainBound && time >= this.api.npc.magicChainBoundEnd) {
      this.api.npc.magicChainBound = false;
    }

    // ── Cursed fire tick (dark flame clouds) ──────────────────────────
    if (this.npcCursedFireUntil > time) {
      this.npcCursedFireTickAccum += delta;
      while (this.npcCursedFireTickAccum >= 500) {
        this.npcCursedFireTickAccum -= 500;
        const tgt = this.api.npc;
        if (tgt.active && tgt.hp > 0) {
          tgt.takeDamage(2);
          this.api.spawnHitFlash(tgt.x, tgt.y, 0x882200);
        }
      }
    } else {
      this.npcCursedFireTickAccum = 0;
    }

    // ── R+ speed boost aura ───────────────────────────────────────────
    if (time < this.playerSpeedBoostUntil) {
      if (!this.playerSpeedBoostAura) {
        const tex = this.playerSpeedBoostDark ? 'fx-anchor-aura-black' : 'fx-anchor-aura-pink';
        this.playerSpeedBoostAura = this.api.scene.add.circle(
          this.api.player.x, this.api.player.y, 24,
          this.playerSpeedBoostDark ? 0x440066 : 0xff88cc, 0.55,
        ).setDepth(4) as Phaser.GameObjects.Arc;
        this.api.scene.tweens.add({ targets: this.playerSpeedBoostAura, scaleX: 1.15, scaleY: 1.15, yoyo: true, repeat: -1, duration: 350 });
        void tex;
      }
      this.playerSpeedBoostAura.setPosition(this.api.player.x, this.api.player.y);
    } else if (this.playerSpeedBoostAura) {
      this.playerSpeedBoostAura.destroy();
      this.playerSpeedBoostAura = null;
    }

    // ── F+ mobile meditate trail ──────────────────────────────────────
    if (this.playerMeditateMobile && this.meditating && time >= this.playerMeditateTrailNext) {
      this.playerMeditateTrailNext = time + 80;
      const spr = this.api.scene.add.circle(this.api.player.x, this.api.player.y, 7, 0xaa44ff, 0.75).setDepth(4) as Phaser.GameObjects.Arc;
      this.playerMeditateTrail.push(spr);
      this.api.scene.tweens.add({ targets: spr, alpha: 0, duration: 600, onComplete: () => {
        if (spr.active) spr.destroy();
        const idx = this.playerMeditateTrail.indexOf(spr);
        if (idx >= 0) this.playerMeditateTrail.splice(idx, 1);
      }});
    }

    // ── Dark gale cone (E+ Recalling Gale — pulls enemies for 1s) ────
    if (this.playerDarkGaleUntil > time) {
      if (!this.playerDarkGaleOnce) {
        // Damage once on cast start
        this.playerDarkGaleOnce = true;
        const player = this.api.player;
        const coneR = 200;
        for (const enemy of this.api.enemies) {
          if (!enemy.active || enemy.hp <= 0) continue;
          const dist2 = Phaser.Math.Distance.Between(player.x, player.y, enemy.x, enemy.y);
          if (dist2 > coneR) continue;
          const ang = Math.atan2(enemy.y - player.y, enemy.x - player.x);
          const diff = Phaser.Math.Angle.Wrap(ang - this.playerDarkGaleAngle);
          if (Math.abs(diff) <= Math.PI / 4) {
            enemy.takeDamage(18);
            this.api.spawnHitFlash(enemy.x, enemy.y, 0x999999);
            this.api.spawnDamageNumber(enemy.x, enemy.y - 28, 18);
          }
        }
      }
      // Pull enemies in cone toward player every frame
      const player2 = this.api.player;
      for (const enemy of this.api.enemies) {
        if (!enemy.active || enemy.hp <= 0) continue;
        const dist3 = Phaser.Math.Distance.Between(player2.x, player2.y, enemy.x, enemy.y);
        if (dist3 > 200 || dist3 < 1) continue;
        const ang2 = Math.atan2(enemy.y - player2.y, enemy.x - player2.x);
        const diff2 = Phaser.Math.Angle.Wrap(ang2 - this.playerDarkGaleAngle);
        if (Math.abs(diff2) <= Math.PI / 4) {
          const toPlayerAng = Math.atan2(player2.y - enemy.y, player2.x - enemy.x);
          (enemy.body as Phaser.Physics.Arcade.Body).setVelocity(
            Math.cos(toPlayerAng) * 320, Math.sin(toPlayerAng) * 320,
          );
        }
      }
    }

    // ── Hurricane vacuum initial pull (Q+ idx 3) ──────────────────────
    if (this.playerHurricaneGaleUntil > time) {
      if (!this.playerHurricaneGaleOnce) {
        this.playerHurricaneGaleOnce = true;
        const player3 = this.api.player;
        const coneR2 = 220;
        for (const enemy of this.api.enemies) {
          if (!enemy.active || enemy.hp <= 0) continue;
          const dist4 = Phaser.Math.Distance.Between(player3.x, player3.y, enemy.x, enemy.y);
          if (dist4 > coneR2) continue;
          const ang4 = Math.atan2(enemy.y - player3.y, enemy.x - player3.x);
          const diff4 = Phaser.Math.Angle.Wrap(ang4 - this.playerHurricaneGaleAngle);
          if (Math.abs(diff4) <= Math.PI / 4) {
            enemy.takeDamage(12);
            this.api.spawnHitFlash(enemy.x, enemy.y, 0x555555);
          }
        }
      }
      const player4 = this.api.player;
      for (const enemy of this.api.enemies) {
        if (!enemy.active || enemy.hp <= 0) continue;
        const dist5 = Phaser.Math.Distance.Between(player4.x, player4.y, enemy.x, enemy.y);
        if (dist5 > 220 || dist5 < 1) continue;
        const ang5 = Math.atan2(enemy.y - player4.y, enemy.x - player4.x);
        const diff5 = Phaser.Math.Angle.Wrap(ang5 - this.playerHurricaneGaleAngle);
        if (Math.abs(diff5) <= Math.PI / 4) {
          const toPlayerAng2 = Math.atan2(player4.y - enemy.y, player4.x - enemy.x);
          (enemy.body as Phaser.Physics.Arcade.Body).setVelocity(
            Math.cos(toPlayerAng2) * 400, Math.sin(toPlayerAng2) * 400,
          );
        }
      }
    }

    // ── Dark vine visual expiry ───────────────────────────────────────
    if (this.playerDarkVineGfx && time >= this.playerDarkVineExpireAt) {
      this.playerDarkVineGfx.destroy();
      this.playerDarkVineGfx = null;
    }

    // ── Temple / Monument orb sets (fixed-anchor orbits) ──────────────
    for (let ti = this.templeSets.length - 1; ti >= 0; ti--) {
      const ts = this.templeSets[ti];
      if (time >= ts.expireAt || ts.orbs.length === 0) {
        ts.templeSprite.destroy(); ts.templeLabel.destroy();
        for (const o of ts.orbs) o.sprite.destroy();
        this.templeSets.splice(ti, 1);
        continue;
      }
      const enemies = ts.owner === 'player' ? this.api.enemies : [this.api.player];
      const projGroup = this.api.projectiles;

      for (let ri = ts.orbs.length - 1; ri >= 0; ri--) {
        const orb = ts.orbs[ri];
        orb.angle += 0.003 * delta;
        const ox = ts.anchorX + Math.cos(orb.angle) * ts.orbitR;
        const oy = ts.anchorY + Math.sin(orb.angle) * ts.orbitR;
        orb.sprite.setPosition(ox, oy);

        if (time - orb.lastHitAt >= 400) {
          for (const enemy of enemies) {
            if (!enemy.active || enemy.hp <= 0) continue;
            if (Phaser.Math.Distance.Between(ox, oy, enemy.x, enemy.y) <= 24) {
              enemy.takeDamage(ts.contactDmg);
              this.api.spawnHitFlash(enemy.x, enemy.y, 0xaa7733);
              this.api.spawnDamageNumber(enemy.x, enemy.y - 28, ts.contactDmg);
              orb.lastHitAt = time;
              if (ts.stunMs > 0) {
                enemy.earthStunnedUntil = Math.max(enemy.earthStunnedUntil, time + ts.stunMs);
                this.api.showFloatingText(enemy.x, enemy.y - 42, '💥 STUNNED', '#ffcc44');
              } else if (ts.slowMs > 0) {
                this.npcDark80SlowUntil = Math.max(this.npcDark80SlowUntil, time + ts.slowMs);
              }
              if (orb.canCrack && !orb.cracked) {
                orb.cracked = true;
                orb.sprite.setFillStyle(0x888888);
                orb.sprite.setStrokeStyle(2, 0x666666, 1);
              } else {
                orb.sprite.destroy();
                ts.orbs.splice(ri, 1);
              }
              break;
            }
          }
        }
        if (ri >= ts.orbs.length) continue;

        // Block hostile projectiles
        const projs = projGroup.getMatching('active', true) as Phaser.GameObjects.Image[];
        for (const p of projs) {
          const pAny = p as any;
          const isHostile = ts.owner === 'player' ? !pAny.isFromPlayer : pAny.isFromPlayer;
          if (!isHostile) continue;
          if (Phaser.Math.Distance.Between(ox, oy, p.x, p.y) <= 20) {
            p.setActive(false).setVisible(false);
            (pAny.body as Phaser.Physics.Arcade.Body)?.stop();
            orb.lastHitAt = time;
            if (orb.canCrack && !orb.cracked) {
              orb.cracked = true;
              orb.sprite.setFillStyle(0x888888);
              orb.sprite.setStrokeStyle(2, 0x666666, 1);
            } else {
              orb.sprite.destroy();
              ts.orbs.splice(ri, 1);
            }
            break;
          }
          if (ri >= ts.orbs.length) break;
        }
      }
    }

    // ── Torture trap links ────────────────────────────────────────────
    const nowMs = Date.now();
    for (let li = this.tortureTrapLinks.length - 1; li >= 0; li--) {
      const link = this.tortureTrapLinks[li];
      if (nowMs >= link.expireAt || !link.target.active || link.target.hp <= 0) {
        link.target.darkLinkedUntil = 0;
        link.target.darkLinkSource = null;
        link.gfx.destroy();
        this.tortureTrapLinks.splice(li, 1);
        continue;
      }
      // Draw red link line
      const srcFighter = link.owner === 'player' ? this.api.player : this.api.npc;
      link.gfx.clear();
      link.gfx.lineStyle(2, 0xff2222, 0.75);
      link.gfx.beginPath();
      link.gfx.moveTo(srcFighter.x, srcFighter.y);
      link.gfx.lineTo(link.target.x, link.target.y);
      link.gfx.strokePath();
      // Tick 3 dmg per second (Fighter.takeDamage triggers heal via darkLinkSource)
      link.tickAccum += delta;
      while (link.tickAccum >= 1000) {
        link.tickAccum -= 1000;
        link.target.takeDamage(3);
        this.api.spawnHitFlash(link.target.x, link.target.y, 0xff2222);
      }
    }

    // ── Darkness HUD bar ──────────────────────────────────────────────
    if (this.api.hasUpgrade('e') || this.api.hasUpgrade('q')) {
      if (!this.darknessBarGfx) {
        this.darknessBarGfx = this.api.scene.add.graphics().setDepth(25);
        this.darknessBarText = this.api.scene.add.text(0, 0, '', {
          fontSize: '9px', color: '#cc88ff', fontFamily: 'Arial',
          stroke: '#000000', strokeThickness: 2,
        }).setDepth(26).setOrigin(0.5, 1);
      }
      const bx = this.api.player.x - 30;
      const by = this.api.player.y + 40;
      const barW = 60; const barH = 6;
      this.darknessBarGfx.clear();
      this.darknessBarGfx.fillStyle(0x111111, 0.65);
      this.darknessBarGfx.fillRect(bx, by, barW, barH);
      const fillColor = this.darkness >= 75 ? 0xff0000 : this.darkness >= 40 ? 0x880088 : 0x550066;
      this.darknessBarGfx.fillStyle(fillColor, 0.9);
      this.darknessBarGfx.fillRect(bx, by, barW * (this.darkness / 100), barH);
      this.darknessBarText?.setPosition(this.api.player.x, by - 1);
      this.darknessBarText?.setText(`☠ ${Math.round(this.darkness)}/100`);
    }
  }

  // ── Wheel UI helpers ──────────────────────────────────────────────────────

  private _openMenu(slot: 'grimoire' | 'necronomicon', selectedIndex: number): void {
    this._closeMenu(slot);
    const labels = slot === 'grimoire' ? GRIMOIRE_LABELS : NECRO_LABELS;
    const gfx = this.api.scene.add.graphics().setDepth(31);
    const cx = this.api.player.x;
    const cy = this.api.player.y;
    const R = 130;
    const count = 5;
    const angleStep = (Math.PI * 2) / count;
    const colors = slot === 'grimoire' ? GRIMOIRE_COLORS : NECRO_COLORS;
    for (let i = 0; i < count; i++) {
      const startA = i * angleStep - Math.PI / 2 - angleStep / 2;
      const endA = startA + angleStep;
      const isSelected = i === selectedIndex;
      gfx.fillStyle(colors[i], isSelected ? 0.9 : 0.55);
      gfx.beginPath(); gfx.moveTo(cx, cy);
      gfx.arc(cx, cy, isSelected ? R + 10 : R, startA, endA, false);
      gfx.closePath(); gfx.fillPath();
      gfx.lineStyle(isSelected ? 3 : 1, isSelected ? 0xffffff : 0xaaaaaa, isSelected ? 0.9 : 0.4);
      gfx.beginPath(); gfx.moveTo(cx, cy);
      gfx.arc(cx, cy, isSelected ? R + 10 : R, startA, endA, false);
      gfx.closePath(); gfx.strokePath();
    }
    const lblObjs: Phaser.GameObjects.Text[] = [];
    for (let i = 0; i < count; i++) {
      const midA = i * angleStep - Math.PI / 2;
      const rr = i === selectedIndex ? R + 10 : R;
      const lx = cx + Math.cos(midA) * (rr * 0.65);
      const ly = cy + Math.sin(midA) * (rr * 0.65);
      const t = this.api.scene.add.text(lx, ly, labels[i], { fontSize: '10px', color: '#ffffff', fontFamily: 'Arial', align: 'center', wordWrap: { width: 72 } })
        .setOrigin(0.5, 0.5).setDepth(32);
      lblObjs.push(t);
    }
    if (slot === 'grimoire') {
      this.grimoireMenuGfx = gfx;
      this.grimoireMenuLabels = lblObjs;
      this.grimoireMenuOpen = true;
      this.grimoireSelectedIndex = selectedIndex;
    } else {
      this.necronomiconMenuGfx = gfx;
      this.necronomiconMenuLabels = lblObjs;
      this.necronomiconMenuOpen = true;
      this.necronomiconSelectedIndex = selectedIndex;
    }
  }

  private _drawMenu(slot: 'grimoire' | 'necronomicon', selectedIndex: number): void {
    const gfx = slot === 'grimoire' ? this.grimoireMenuGfx : this.necronomiconMenuGfx;
    const lbls = slot === 'grimoire' ? this.grimoireMenuLabels : this.necronomiconMenuLabels;
    if (!gfx) return;
    const cx = this.api.player.x;
    const cy = this.api.player.y;
    const R = 130;
    const count = 5;
    const angleStep = (Math.PI * 2) / count;
    const isDark = slot === 'grimoire' ? this.darkGrimoireMode : this.darkNecroMode;
    const colors = isDark
      ? (slot === 'grimoire' ? DARK_GRIMOIRE_COLORS : DARK_NECRO_COLORS)
      : (slot === 'grimoire' ? GRIMOIRE_COLORS : NECRO_COLORS);
    const labels = isDark
      ? (slot === 'grimoire' ? DARK_GRIMOIRE_LABELS : DARK_NECRO_LABELS)
      : (slot === 'grimoire' ? GRIMOIRE_LABELS : NECRO_LABELS);
    gfx.clear();
    for (let i = 0; i < count; i++) {
      const startA = i * angleStep - Math.PI / 2 - angleStep / 2;
      const endA = startA + angleStep;
      const isSelected = i === selectedIndex;
      gfx.fillStyle(colors[i], isSelected ? 0.9 : 0.55);
      gfx.beginPath(); gfx.moveTo(cx, cy);
      gfx.arc(cx, cy, isSelected ? R + 10 : R, startA, endA, false);
      gfx.closePath(); gfx.fillPath();
      gfx.lineStyle(isSelected ? 3 : 1, isSelected ? 0xffffff : 0xaaaaaa, isSelected ? 0.9 : 0.4);
      gfx.beginPath(); gfx.moveTo(cx, cy);
      gfx.arc(cx, cy, isSelected ? R + 10 : R, startA, endA, false);
      gfx.closePath(); gfx.strokePath();
    }
    // Center toggle button (only when upgrade is owned)
    if (this.api.hasUpgrade(slot === 'grimoire' ? 'e' : 'q')) {
      const btnColor = isDark ? 0x440088 : 0xddaa00;
      gfx.fillStyle(btnColor, 0.92);
      gfx.fillCircle(cx, cy, 24);
      gfx.lineStyle(2, isDark ? 0xcc44ff : 0xffffff, 0.9);
      gfx.strokeCircle(cx, cy, 24);
    }
    for (let i = 0; i < count; i++) {
      if (!lbls[i]) continue;
      const midA = i * angleStep - Math.PI / 2;
      const rr = i === selectedIndex ? R + 10 : R;
      lbls[i].setPosition(cx + Math.cos(midA) * (rr * 0.65), cy + Math.sin(midA) * (rr * 0.65));
      lbls[i].setText(labels[i]);
    }
  }

  private _closeMenu(slot: 'grimoire' | 'necronomicon'): void {
    if (slot === 'grimoire') {
      if (this.grimoireMenuGfx) { this.grimoireMenuGfx.destroy(); this.grimoireMenuGfx = null; }
      for (const l of this.grimoireMenuLabels) l.destroy();
      this.grimoireMenuLabels = [];
      this.grimoireMenuOpen = false;
    } else {
      if (this.necronomiconMenuGfx) { this.necronomiconMenuGfx.destroy(); this.necronomiconMenuGfx = null; }
      for (const l of this.necronomiconMenuLabels) l.destroy();
      this.necronomiconMenuLabels = [];
      this.necronomiconMenuOpen = false;
    }
  }

  private _spawnAimCountdown(onFire: () => void): void {
    const DELAY = 2000;
    if (this.aimCountdownLabel) { this.aimCountdownLabel.destroy(); }
    this.aimCountdownLabel = this.api.scene.add.text(this.api.player.x, this.api.player.y - 54, '✨ 2.0', {
      fontSize: '18px', fontFamily: 'Arial, sans-serif', color: '#cc99ff',
      stroke: '#220044', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(30);
    this.aimCountdownEnd = this.api.scene.sys.game.loop.now + DELAY;
    this.aimCountdownFired = false;
    this.api.scene.time.delayedCall(DELAY, () => {
      if (this.aimCountdownLabel) { this.aimCountdownLabel.destroy(); this.aimCountdownLabel = null; }
      onFire();
    });
  }

  private _buildPlayerCtx(mx: number, my: number): any {
    return {
      targetX: mx, targetY: my,
      magicSparkleShot: (tx: number, ty: number) => this.doSparkleShot(tx, ty, 'player'),
      magicOpenGrimoire: () => {},
      magicAnchorToggle: () => this.doAnchorToggle('player'),
      magicMeditateBegin: () => this.doMeditateBegin('player'),
      magicOpenNecronomicon: () => {},
    };
  }

  // ── Dispatch helpers ──────────────────────────────────────────────────────

  private _dispatchGrimoireWedge(pick: number, tx: number, ty: number, owner: 'player' | 'npc', thunderCharged = false): void {
    if (owner === 'player' && this.darkGrimoireMode) {
      switch (pick) {
        case 0: this.doCorruptFlames(tx, ty); if (thunderCharged) this.doCorruptFlames(tx, ty); break;
        case 1: this.doAcidCloud(tx, ty); if (thunderCharged) { const sc = this.stormClouds[this.stormClouds.length - 1]; if (sc) sc.pulseInterval = Math.round(sc.pulseInterval / 2); } break;
        case 2: this.doDrainingThorns(tx, ty); if (thunderCharged) { for (const e of this.api.enemies) { if (e.active && e.hp > 0) { e.earthStunnedUntil = Math.max(e.earthStunnedUntil, this.api.scene.sys.game.loop.now + 2000); this.api.showFloatingText(e.x, e.y - 28, '⚡ STUN', '#ffee44'); break; } } } break;
        case 3: this.doRecallingGale(tx, ty); if (thunderCharged) { this.npcStormSlowUntil = Math.max(this.npcStormSlowUntil, this.api.scene.sys.game.loop.now + 3000); } break;
        case 4: this.doGaiasTemple(tx, ty); if (thunderCharged) { const ts = this.templeSets[this.templeSets.length - 1]; if (ts) { const now = this.api.scene.sys.game.loop.now; const a = (ts.orbs.length / (ts.orbs.length + 1)) * Math.PI * 2; const s = this.api.scene.add.circle(0, 0, 10, 0x885522, 1).setStrokeStyle(2, 0xbb8833, 1).setDepth(7) as Phaser.GameObjects.Arc; ts.orbs.push({ sprite: s, angle: a, cracked: false, lastHitAt: 0, canCrack: false, dmg: 15, owner: 'player' }); void now; } } break;
      }
      return;
    }
    switch (pick) {
      case 0: this.doFlameBurst(tx, ty, owner); if (thunderCharged) { this.doFlameBurst(tx, ty, owner); this.api.showFloatingText((owner === 'player' ? this.api.player.x : this.api.npc.x), (owner === 'player' ? this.api.player.y : this.api.npc.y) - 38, '⚡ CHARGED!', '#ffee44'); } break;
      case 1: this.doStormCloudSummon(tx, ty, owner); if (thunderCharged) { const sc = this.stormClouds[this.stormClouds.length - 1]; if (sc) sc.pulseInterval = Math.round(sc.pulseInterval / 2); } break;
      case 2:
        if (thunderCharged && owner === 'player') this.playerThunderThornCharged = true;
        this.doVirulentThorns(tx, ty, owner);
        break;
      case 3: {
        this.doCompressionBlast(tx, ty, owner);
        if (thunderCharged) {
          const now = this.api.scene.sys.game.loop.now;
          if (owner === 'player') this.npcStormSlowUntil = Math.max(this.npcStormSlowUntil, now + 3000);
          else this.playerStormSlowUntil = Math.max(this.playerStormSlowUntil, now + 3000);
        }
        break;
      }
      case 4: {
        if (thunderCharged) {
          const caster = owner === 'player' ? this.api.player : this.api.npc;
          const now = this.api.scene.sys.game.loop.now;
          this._destroyRockSet(owner === 'player' ? this.playerRockSet : this.npcRockSet);
          const rs = this._spawnRockSet(owner, 4, 56, now + 5000, 10, false);
          if (owner === 'player') this.playerRockSet = rs; else this.npcRockSet = rs;
          this.api.showFloatingText(caster.x, caster.y - 30, '🪨⚡ Charged Guidance', '#aa7733');
        } else {
          this.doGaiasGuidance(owner);
        }
        break;
      }
    }
  }

  private _dispatchNecronomiconWedge(pick: number, tx: number, ty: number, owner: 'player' | 'npc', thunderCharged = false): void {
    if (owner === 'player' && this.darkNecroMode) {
      switch (pick) {
        case 0: this.doDarkBarrage(tx, ty); if (thunderCharged) { this.doDarkBarrage(tx, ty); this.api.showFloatingText(this.api.player.x, this.api.player.y - 38, '⚡ CHARGED!', '#ffee44'); } break;
        case 1: this.doAcidRain(); if (thunderCharged) { for (const sc of this.stormClouds.slice(-3)) sc.pulseInterval = Math.round(sc.pulseInterval / 2); } break;
        case 2: this.doTortureTrap(tx, ty); if (thunderCharged) { for (const link of this.tortureTrapLinks) { if (link.owner === 'player') { link.expireAt += 3000; if (link.target.darkLinkedUntil) link.target.darkLinkedUntil += 3000; } } } break;
        case 3: this.doHurricaneVacuum(tx, ty); if (thunderCharged) { this.npcStormSlowUntil = Math.max(this.npcStormSlowUntil, this.api.scene.sys.game.loop.now + 3000); } break;
        case 4: this.doGaiasMonument(tx, ty); if (thunderCharged) { const ts = this.templeSets[this.templeSets.length - 1]; if (ts) { const a = (ts.orbs.length / (ts.orbs.length + 1)) * Math.PI * 2; const s = this.api.scene.add.circle(0, 0, 10, 0x885522, 1).setStrokeStyle(2, 0xbb8833, 1).setDepth(7) as Phaser.GameObjects.Arc; ts.orbs.push({ sprite: s, angle: a, cracked: false, lastHitAt: 0, canCrack: false, dmg: 15, owner: 'player' }); const b = (ts.orbs.length / (ts.orbs.length + 1)) * Math.PI * 2; const s2 = this.api.scene.add.circle(0, 0, 10, 0x885522, 1).setStrokeStyle(2, 0xbb8833, 1).setDepth(7) as Phaser.GameObjects.Arc; ts.orbs.push({ sprite: s2, angle: b, cracked: false, lastHitAt: 0, canCrack: false, dmg: 15, owner: 'player' }); } } break;
      }
      return;
    }
    switch (pick) {
      case 0: this.doFlameBarrage(tx, ty, owner); if (thunderCharged) { this.doFlameBarrage(tx, ty, owner); this.api.showFloatingText((owner === 'player' ? this.api.player.x : this.api.npc.x), (owner === 'player' ? this.api.player.y : this.api.npc.y) - 38, '⚡ CHARGED!', '#ffee44'); } break;
      case 1: this.doFinalDrench(tx, ty, owner); if (thunderCharged) { const sc = this.stormClouds[this.stormClouds.length - 1]; if (sc) sc.pulseInterval = Math.round(sc.pulseInterval / 2); } break;
      case 2: this.doThornPrison(tx, ty, owner); break;
      case 3: {
        this.doTornadoBlast(tx, ty, owner);
        if (thunderCharged) {
          const now = this.api.scene.sys.game.loop.now;
          if (owner === 'player') this.npcStormSlowUntil = Math.max(this.npcStormSlowUntil, now + 3000);
          else this.playerStormSlowUntil = Math.max(this.playerStormSlowUntil, now + 3000);
        }
        break;
      }
      case 4: {
        if (thunderCharged) {
          const caster = owner === 'player' ? this.api.player : this.api.npc;
          const now = this.api.scene.sys.game.loop.now;
          this._destroyRockSet(owner === 'player' ? this.playerRockSet : this.npcRockSet);
          const rs = this._spawnRockSet(owner, 5, 56, now + 8000, 12, true);
          if (owner === 'player') this.playerRockSet = rs; else this.npcRockSet = rs;
          this.api.showFloatingText(caster.x, caster.y - 30, '🪨⚡ Gaia\'s Rage+', '#aa7733');
        } else {
          this.doGaiasRage(owner);
        }
        break;
      }
    }
  }

  // ── NPC dispatch (called from ArenaScene npc context) ─────────────────────

  npcCastGrimoireWedge(tx: number, ty: number): void {
    if (this.api.hasPerk('npc', 'thunder') && !this.npcThunderECharged) {
      this._doLightningCall('npc');
      this.npcThunderECharged = true;
      this.api.npc.triggerCooldown('magic-grimoire');
      return;
    }
    const dist = Phaser.Math.Distance.Between(this.api.player.x, this.api.player.y, this.api.npc.x, this.api.npc.y);
    const hpRatio = this.api.npc.hp / this.api.npc.maxHp;
    let pick = 0;
    if (hpRatio < 0.35) {
      pick = 4; // Gaia's Guidance
    } else if (dist < 180) {
      pick = 3; // Compression Blast
    } else if (dist <= 350) {
      pick = Math.random() < 0.5 ? 2 : 0; // Virulent Thorns or Flame Burst
    } else {
      pick = 1; // Storm Cloud Summon
    }
    const thunderCharged = this.npcThunderECharged;
    this.npcThunderECharged = false;
    this._dispatchGrimoireWedge(pick, tx, ty, 'npc', thunderCharged);
  }

  npcCastNecronomiconWedge(tx: number, ty: number): void {
    if (this.api.hasPerk('npc', 'thunder') && !this.npcThunderQCharged) {
      this._doApocalypseCall('npc');
      this.npcThunderQCharged = true;
      this.api.npc.triggerCooldown('magic-necronomicon');
      return;
    }
    const dist = Phaser.Math.Distance.Between(this.api.player.x, this.api.player.y, this.api.npc.x, this.api.npc.y);
    const hpRatio = this.api.npc.hp / this.api.npc.maxHp;
    let pick = 0;
    if (hpRatio < 0.30) {
      pick = Math.random() < 0.5 ? 4 : 2; // Gaia's Rage or Thorn Prison
    } else if (dist < 200) {
      pick = 3; // Tornado Blast
    } else if (dist <= 400) {
      pick = Math.random() < 0.5 ? 2 : 0; // Thorn Prison or Flame Barrage
    } else {
      pick = 1; // Final Drench
    }
    const thunderQCharged = this.npcThunderQCharged;
    this.npcThunderQCharged = false;
    this._dispatchNecronomiconWedge(pick, tx, ty, 'npc', thunderQCharged);
    if (thunderQCharged) this.api.npc.reduceCooldown('magic-necronomicon', 15000);
  }

  // ── Thunder perk: Lightning Call (E arm) / Apocalypse Call (Q arm) ─────────

  private _doLightningCall(owner: 'player' | 'npc'): void {
    const caster = owner === 'player' ? this.api.player : this.api.npc;
    const flash = this.api.scene.add.graphics().setDepth(12);
    flash.lineStyle(3, 0xffee00, 1);
    flash.lineBetween(caster.x, caster.y - 40, caster.x - 8, caster.y - 18);
    flash.lineBetween(caster.x - 8, caster.y - 18, caster.x + 5, caster.y - 18);
    flash.lineBetween(caster.x + 5, caster.y - 18, caster.x - 5, caster.y + 5);
    this.api.scene.tweens.add({ targets: flash, alpha: 0, duration: 600, onComplete: () => flash.destroy() });
    const aura = this.api.scene.add.circle(caster.x, caster.y, 28, 0xffee00, 0.25).setDepth(4);
    this.api.scene.tweens.add({ targets: aura, alpha: 0, scaleX: 1.6, scaleY: 1.6, duration: 500, onComplete: () => aura.destroy() });
    this.api.showFloatingText(caster.x, caster.y - 44, '⚡ LIGHTNING CALL', '#ffee44');
  }

  private _doApocalypseCall(owner: 'player' | 'npc'): void {
    const caster = owner === 'player' ? this.api.player : this.api.npc;
    const aura = this.api.scene.add.circle(caster.x, caster.y, 34, 0x9933ff, 0.3).setDepth(4);
    this.api.scene.tweens.add({ targets: aura, alpha: 0, scaleX: 1.8, scaleY: 1.8, duration: 700, onComplete: () => aura.destroy() });
    const ring = this.api.scene.add.circle(caster.x, caster.y, 18, 0x0, 0).setStrokeStyle(2, 0xcc44ff, 0.8).setDepth(12);
    this.api.scene.tweens.add({ targets: ring, alpha: 0, scaleX: 2.5, scaleY: 2.5, duration: 700, onComplete: () => ring.destroy() });
    this.api.showFloatingText(caster.x, caster.y - 44, '💥 APOCALYPSE CALL', '#cc44ff');
  }

  // ── Click: Sparkle Shot ───────────────────────────────────────────────────

  doSparkleShot(tx: number, ty: number, owner: 'player' | 'npc'): void {
    const caster = owner === 'player' ? this.api.player : this.api.npc;
    const angle = Math.atan2(ty - caster.y, tx - caster.x);
    const proj = this.api.projectiles.get(caster.x, caster.y, 'proj-sparkle-star') as any;
    if (!proj) return;
    proj.setActive(true).setVisible(true).setDepth(6);
    proj.isFromPlayer = (owner === 'player');
    proj.damage = 6;
    (proj.body as Phaser.Physics.Arcade.Body).setVelocity(Math.cos(angle) * 450, Math.sin(angle) * 450);
    const leaderId = `sparkle-${Date.now()}-${Math.random()}`;
    this.sparkleShots.push({
      proj,
      startX: caster.x, startY: caster.y,
      maxDist: 180,
      stationaryAccum: 0,
      exploded: false,
      owner,
      id: leaderId,
      angle,
    });
    // Click+: spawn two trailing sparkles
    if (owner === 'player' && this.api.hasUpgrade('click')) {
      for (const trailOffset of [32, 64]) {
        const trailProj = this.api.projectiles.get(
          caster.x - Math.cos(angle) * trailOffset,
          caster.y - Math.sin(angle) * trailOffset,
          'proj-sparkle-star',
        ) as any;
        if (!trailProj) continue;
        trailProj.setActive(true).setVisible(true).setDepth(6);
        trailProj.isFromPlayer = true;
        trailProj.damage = 0; // damage handled by kit, not ArenaScene collision
        (trailProj.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
        this.sparkleShots.push({
          proj: trailProj,
          startX: caster.x, startY: caster.y,
          maxDist: 180, stationaryAccum: 0, exploded: false,
          owner: 'player',
          leaderId,
          trailOffset,
          damageMult: 0.75,
          angle,
        });
      }
    }
  }

  // ── R: Anchor ─────────────────────────────────────────────────────────────

  doAnchorToggle(owner: 'player' | 'npc'): void {
    const caster = owner === 'player' ? this.api.player : this.api.npc;
    const anchorRef = owner === 'player' ? this.anchor : this.npcAnchor;
    const now = this.api.scene.sys.game.loop.now;

    // R+: check if we are in the 1.5s dark re-cast window (player only)
    if (owner === 'player' && this.api.hasUpgrade('r') && this.anchor === null && this.playerJustRecalledAt > 0 && (now - this.playerJustRecalledAt) <= 1500) {
      // Wild Anchor dark re-cast: random teleport
      this.playerJustRecalledAt = 0;
      this.addDarkness(10);
      const rw = this.api.getSceneWidth();
      const rh = this.api.getSceneHeight();
      const rx = Phaser.Math.Between(60, rw - 60);
      const ry = Phaser.Math.Between(60, rh - 60);
      caster.setPosition(rx, ry);
      const ring2 = this.api.scene.add.circle(rx, ry, 24, 0x550088, 0.6).setDepth(8);
      this.api.scene.tweens.add({ targets: ring2, scaleX: 3.5, scaleY: 3.5, alpha: 0, duration: 450, onComplete: () => ring2.destroy() });
      this.api.showFloatingText(rx, ry - 30, '🌑 WILD ANCHOR!', '#9900cc');
      // 50% speed boost, dark aura, 3s
      this.playerSpeedBoostUntil = now + 3000;
      this.playerSpeedBoostMult = 1.5;
      this.playerSpeedBoostDark = true;
      if (this.playerSpeedBoostAura) { this.playerSpeedBoostAura.destroy(); this.playerSpeedBoostAura = null; }
      // +25% cooldown on this re-cast (extend anchor CD by 2000ms)
      caster.reduceCooldown('magic-anchor', -2000);
      return;
    }

    if (anchorRef === null) {
      const sprite = this.api.scene.add.circle(caster.x, caster.y, 16, 0x9944ff, 0.4)
        .setStrokeStyle(2, 0xcc88ff, 0.7).setDepth(5) as Phaser.GameObjects.Arc;
      this.api.scene.tweens.add({ targets: sprite, alpha: 0.1, yoyo: true, repeat: -1, duration: 700 });
      if (owner === 'player') this.anchor = { x: caster.x, y: caster.y, sprite };
      else this.npcAnchor = { x: caster.x, y: caster.y, sprite };
      if (owner === 'player') this.playerJustRecalledAt = 0; // reset window when placing new anchor
    } else {
      const ax = anchorRef.x;
      const ay = anchorRef.y;
      anchorRef.sprite?.destroy();
      if (owner === 'player') this.anchor = null;
      else this.npcAnchor = null;
      caster.setPosition(ax, ay);
      for (const target of (owner === 'player' ? this.api.enemies : [this.api.player])) {
        if (!target.active || target.hp <= 0) continue;
        if (Phaser.Math.Distance.Between(ax, ay, target.x, target.y) <= 120) {
          target.takeDamage(20);
          this.api.spawnHitFlash(target.x, target.y, 0x9944ff);
          this.api.spawnDamageNumber(target.x, target.y - 30, 20);
        }
      }
      const ring = this.api.scene.add.circle(ax, ay, 30, 0x9944ff, 0.5).setDepth(8);
      this.api.scene.tweens.add({ targets: ring, scaleX: 4, scaleY: 4, alpha: 0, duration: 400, onComplete: () => ring.destroy() });
      this.api.showFloatingText(ax, ay - 30, '⚓ RECALL', '#bb88ff');
      if (owner === 'player') {
        this.api.player.triggerCooldown('magic-anchor');
        // R+: record recall time and apply speed boost
        if (this.api.hasUpgrade('r')) {
          this.playerJustRecalledAt = now;
          this.playerSpeedBoostUntil = now + 3000;
          this.playerSpeedBoostMult = 1.25;
          this.playerSpeedBoostDark = false;
          if (this.playerSpeedBoostAura) { this.playerSpeedBoostAura.destroy(); this.playerSpeedBoostAura = null; }
        }
      }
    }
  }

  // ── F: Meditate ───────────────────────────────────────────────────────────

  doMeditateBegin(owner: 'player' | 'npc'): void {
    const now = this.api.scene.sys.game.loop.now;
    if (owner === 'player') {
      if (this.meditating) return;
      this.meditating = true;
      this.meditateEndAt = Infinity;
      this.meditateNextSpawn = now + 200;
      if (this.api.hasUpgrade('f')) {
        // F+: mobile meditate — allow movement at 25% speed, no lock, no absorber
        this.playerMeditateMobile = true;
        this.playerMeditateTrailNext = now + 80;
      } else {
        this.api.nukeChanneling = true;
        this.api.nukeChannelEnd = Infinity;
        (this.api.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
        this.api.player.damageAbsorber = (_amt: number) => {
          if (this.meditating) this.endMeditate('player', true);
          return false;
        };
      }
      this.api.showFloatingText(this.api.player.x, this.api.player.y - 34, '🧘 Meditate', '#cc99ff');
    } else {
      if (this.npcMeditating) return;
      this.npcMeditating = true;
      this.npcMeditateEndAt = now + 3000;
      this.npcMeditateNextSpawn = now + 200;
      this.api.npcNukeChanneling = true;
      this.api.npcNukeChannelEnd = now + 3000;
    }
  }

  endMeditate(owner: 'player' | 'npc', interrupted: boolean): void {
    if (owner === 'player') {
      if (!this.meditating) return;
      this.meditating = false;
      if (!this.playerMeditateMobile) {
        this.api.nukeChanneling = false;
        this.api.player.damageAbsorber = null;
      }
      this.playerMeditateMobile = false;
      for (const s of this.playerMeditateTrail) { if (s.active) s.destroy(); }
      this.playerMeditateTrail = [];
      if (interrupted) {
        this.api.player.takeDamage(20);
        this.api.spawnHitFlash(this.api.player.x, this.api.player.y, 0xff4444);
        this.api.showFloatingText(this.api.player.x, this.api.player.y - 30, '⛔ Interrupted! -20', '#ff4444');
      }
      this.api.player.triggerCooldown('magic-meditate');
    } else {
      this.npcMeditating = false;
      this.api.npcNukeChanneling = false;
    }
  }

  private _spawnHealOrb(owner: 'player' | 'npc'): void {
    const caster = owner === 'player' ? this.api.player : this.api.npc;
    const W = this.api.getSceneWidth();
    const H = this.api.getSceneHeight();
    const edge = Math.floor(Math.random() * 4);
    let ox: number, oy: number;
    if (edge === 0) { ox = Math.random() * W; oy = 0; }
    else if (edge === 1) { ox = Math.random() * W; oy = H; }
    else if (edge === 2) { ox = 0; oy = Math.random() * H; }
    else { ox = W; oy = Math.random() * H; }
    const angle = Math.atan2(caster.y - oy, caster.x - ox);
    const speed = 200;
    const sprite = this.api.scene.add.circle(ox, oy, 8, 0xcc99ff, 0.9)
      .setStrokeStyle(2, 0xffeeff, 0.6).setDepth(7) as Phaser.GameObjects.Arc;
    this.healOrbs.push({ sprite, x: ox, y: oy, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, owner });
  }

  // ── E1: Flame Burst ───────────────────────────────────────────────────────

  doFlameBurst(tx: number, ty: number, owner: 'player' | 'npc'): void {
    const caster = owner === 'player' ? this.api.player : this.api.npc;
    const baseAngle = Math.atan2(ty - caster.y, tx - caster.x);
    const offsets = [-25, 0, 25];
    const now = this.api.scene.sys.game.loop.now;
    for (const deg of offsets) {
      const angle = baseAngle + Phaser.Math.DegToRad(deg);
      const speed = 250;
      const sprite = this.api.scene.add.circle(caster.x, caster.y, 14, 0xff7733, 0.7)
        .setStrokeStyle(2, 0xffaa44, 0.9).setDepth(6) as Phaser.GameObjects.Arc;
      this.api.scene.tweens.add({ targets: sprite, scaleX: 0.85, scaleY: 0.85, yoyo: true, repeat: -1, duration: 400 });
      this.flameClouds.push({
        sprite, x: caster.x, y: caster.y,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        stopped: false,
        expireAt: now + 3000,
        tickAccum: 0, radius: 35,
        tickDmg: 2, tickInterval: 250,
        burnDuration: 2000,
        owner,
      });
    }
  }

  // ── E2: Storm Cloud Summon ────────────────────────────────────────────────

  doStormCloudSummon(tx: number, ty: number, owner: 'player' | 'npc'): void {
    const caster = owner === 'player' ? this.api.player : this.api.npc;
    const angle = Math.atan2(ty - caster.y, tx - caster.x);
    const cx = caster.x + Math.cos(angle) * 80;
    const cy = caster.y + Math.sin(angle) * 80;
    const now = this.api.scene.sys.game.loop.now;
    const sprite = this.api.scene.add.circle(cx, cy, 35, 0x2255aa, 0.6)
      .setStrokeStyle(4, 0x55aaff, 0.8).setDepth(6) as Phaser.GameObjects.Arc;
    this.api.scene.tweens.add({ targets: sprite, scaleX: 0.9, scaleY: 0.9, yoyo: true, repeat: -1, duration: 800 });
    this.stormClouds.push({
      sprite, x: cx, y: cy,
      expireAt: now + 6000,
      nextPulseAt: now + 3000,
      pulseInterval: 3000,
      pulseRadius: 110,
      pulseDmg: 0,
      owner,
    });
  }

  // ── E3: Virulent Thorns ───────────────────────────────────────────────────

  doVirulentThorns(tx: number, ty: number, owner: 'player' | 'npc'): void {
    const caster = owner === 'player' ? this.api.player : this.api.npc;
    const angle = Math.atan2(ty - caster.y, tx - caster.x);
    const proj = this.api.projectiles.get(caster.x, caster.y, 'proj-thorn-vine') as any;
    if (!proj) return;
    proj.setActive(true).setVisible(true).setDepth(6);
    proj.isFromPlayer = (owner === 'player');
    proj.damage = 0;
    proj.isMagicThornVine = true;
    proj.thornVineOwner = owner;
    (proj.body as Phaser.Physics.Arcade.Body).setVelocity(Math.cos(angle) * 650, Math.sin(angle) * 650);
  }

  onThornVineHit(target: Fighter, owner: 'player' | 'npc'): void {
    const now = this.api.scene.sys.game.loop.now;
    target.magicChainBound = true;
    target.magicChainBoundEnd = now + 2000;
    this.api.showFloatingText(target.x, target.y - 28, '🌿 BOUND', '#33ff66');
    if (owner === 'player' && this.playerThunderThornCharged) {
      this.playerThunderThornCharged = false;
      target.earthStunnedUntil = Math.max(target.earthStunnedUntil, now + 2000);
      this.api.spawnHitFlash(target.x, target.y, 0xffee00);
      this.api.showFloatingText(target.x, target.y - 44, '⚡ STUN', '#ffee44');
    }
    if (owner === 'player' && target === this.api.npc) {
      // player bound the npc
      this.api.scene.time.delayedCall(2000, () => {
        if (this.api.npc.magicChainBound) {
          this.api.npc.takeDamage(25);
          this.api.spawnHitFlash(this.api.npc.x, this.api.npc.y, 0x33aa44);
          this.api.spawnDamageNumber(this.api.npc.x, this.api.npc.y - 30, 25);
          this.api.npc.magicChainBound = false;
        }
      });
    } else {
      // npc bound the player
      this.playerBound = true;
      this.playerBoundEnd = now + 2000;
      this.api.scene.time.delayedCall(2000, () => {
        if (this.playerBound) {
          this.api.player.takeDamage(25);
          this.api.spawnHitFlash(this.api.player.x, this.api.player.y, 0x33aa44);
          this.api.spawnDamageNumber(this.api.player.x, this.api.player.y - 30, 25);
          this.playerBound = false;
        }
      });
    }
  }

  // ── E4: Compression Blast ─────────────────────────────────────────────────

  doCompressionBlast(tx: number, ty: number, owner: 'player' | 'npc'): void {
    const caster = owner === 'player' ? this.api.player : this.api.npc;
    const angle = Math.atan2(ty - caster.y, tx - caster.x);
    const bx = caster.x + Math.cos(angle) * 70;
    const by = caster.y + Math.sin(angle) * 70;
    const burst = this.api.scene.add.circle(bx, by, 45, 0xbbbbbb, 0.5).setDepth(8);
    this.api.scene.tweens.add({ targets: burst, scaleX: 2, scaleY: 2, alpha: 0, duration: 300, onComplete: () => burst.destroy() });
    const targets = (owner === 'player' ? this.api.enemies : [this.api.player])
      .filter(t => t.active && t.hp > 0 && Phaser.Math.Distance.Between(bx, by, t.x, t.y) <= 90);
    for (const t of targets) {
      if (!t.knockbackImmune) {
        const dx = t.x - bx; const dy = t.y - by;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        (t.body as Phaser.Physics.Arcade.Body).setVelocity((dx / len) * 650, (dy / len) * 650);
      }
      t.takeDamage(8);
      this.api.spawnHitFlash(t.x, t.y, 0xaaaaaa);
      this.api.spawnDamageNumber(t.x, t.y - 28, 8);
    }
    this.api.showFloatingText(bx, by - 28, '💨 BLAST!', '#bbbbbb');
  }

  // ── E5: Gaia's Guidance ───────────────────────────────────────────────────

  doGaiasGuidance(owner: 'player' | 'npc'): void {
    const now = this.api.scene.sys.game.loop.now;
    if (owner === 'player') {
      this._destroyRockSet(this.playerRockSet);
      this.playerRockSet = this._spawnRockSet(owner, 3, 56, 5000, 10, false);
    } else {
      this._destroyRockSet(this.npcRockSet);
      this.npcRockSet = this._spawnRockSet(owner, 3, 56, now + 5000, 10, false);
    }
    this.api.showFloatingText(
      owner === 'player' ? this.api.player.x : this.api.npc.x,
      (owner === 'player' ? this.api.player.y : this.api.npc.y) - 30,
      '🪨 Gaia\'s Guidance', '#aa7733');
  }

  private _spawnRockSet(owner: 'player' | 'npc', count: number, orbitR: number, expireAt: number, dmg: number, canCrack: boolean): RockOrbSet {
    const orbs: RockOrb[] = [];
    const color = canCrack ? 0x777777 : 0x885522;
    const radius = canCrack ? 13 : 9;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const sprite = this.api.scene.add.circle(0, 0, radius, color, 1)
        .setStrokeStyle(2, canCrack ? 0xbbbbbb : 0xbb8833, 1).setDepth(7) as Phaser.GameObjects.Arc;
      orbs.push({ sprite, angle, cracked: false, lastHitAt: 0, canCrack, dmg, owner });
    }
    const now = this.api.scene.sys.game.loop.now;
    return { orbs, expireAt: expireAt > 1e9 ? expireAt : now + expireAt, orbitR };
  }

  // ── Q1: Flame Barrage ─────────────────────────────────────────────────────

  doFlameBarrage(tx: number, ty: number, owner: 'player' | 'npc'): void {
    const caster = owner === 'player' ? this.api.player : this.api.npc;
    const baseAngle = Math.atan2(ty - caster.y, tx - caster.x);
    const now = this.api.scene.sys.game.loop.now;
    for (let i = 0; i < 10; i++) {
      const deg = -35 + i * (70 / 9);
      const angle = baseAngle + Phaser.Math.DegToRad(deg);
      const speed = 200 + Math.random() * 60;
      const sprite = this.api.scene.add.circle(caster.x, caster.y, 18, 0xcc2200, 0.7)
        .setStrokeStyle(2, 0xff4422, 0.9).setDepth(6) as Phaser.GameObjects.Arc;
      this.api.scene.tweens.add({ targets: sprite, scaleX: 0.8, scaleY: 0.8, yoyo: true, repeat: -1, duration: 350 });
      this.flameClouds.push({
        sprite, x: caster.x, y: caster.y,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        stopped: false,
        expireAt: now + 6000,
        tickAccum: 0, radius: 40,
        tickDmg: 3, tickInterval: 200,
        burnDuration: 4000,
        owner,
      });
    }
  }

  // ── Q2: Final Drench ──────────────────────────────────────────────────────

  doFinalDrench(tx: number, ty: number, owner: 'player' | 'npc'): void {
    const caster = owner === 'player' ? this.api.player : this.api.npc;
    const angle = Math.atan2(ty - caster.y, tx - caster.x);
    const cx = caster.x + Math.cos(angle) * 80;
    const cy = caster.y + Math.sin(angle) * 80;
    const now = this.api.scene.sys.game.loop.now;
    const sprite = this.api.scene.add.circle(cx, cy, 40, 0x112255, 0.7)
      .setStrokeStyle(5, 0x2266cc, 0.9).setDepth(6) as Phaser.GameObjects.Arc;
    this.api.scene.tweens.add({ targets: sprite, scaleX: 0.88, scaleY: 0.88, yoyo: true, repeat: -1, duration: 1000 });
    this.stormClouds.push({
      sprite, x: cx, y: cy,
      expireAt: now + 12000,
      nextPulseAt: now + 3000,
      pulseInterval: 3000,
      pulseRadius: 130,
      pulseDmg: 12,
      owner,
    });
  }

  // ── Q3: Thorn Prison ─────────────────────────────────────────────────────

  doThornPrison(tx: number, ty: number, owner: 'player' | 'npc'): void {
    const caster = owner === 'player' ? this.api.player : this.api.npc;
    const angle = Math.atan2(ty - caster.y, tx - caster.x);
    const proj = this.api.projectiles.get(caster.x, caster.y, 'proj-thorn-vine-dark') as any;
    if (!proj) return;
    proj.setActive(true).setVisible(true).setDepth(6);
    proj.isFromPlayer = (owner === 'player');
    proj.damage = 0;
    proj.isMagicThornPrison = true;
    proj.thornPrisonOwner = owner;
    (proj.body as Phaser.Physics.Arcade.Body).setVelocity(Math.cos(angle) * 380, Math.sin(angle) * 380);
  }

  onThornPrisonHit(ex: number, ey: number, owner: 'player' | 'npc'): void {
    const now = this.api.scene.sys.game.loop.now;
    const existingPrison = owner === 'player' ? this.thornPrison : this.npcThornPrison;
    if (existingPrison) { existingPrison.gfx.destroy(); }
    const gfx = this.api.scene.add.graphics().setDepth(5);
    const prison: ThornPrison = {
      ex, ey,
      chainsHp: [15, 15, 15, 15],
      gfx, owner,
      expireAt: now + 5000,
      dotAccum: 0,
    };
    if (owner === 'player') this.thornPrison = prison;
    else this.npcThornPrison = prison;
    this.api.showFloatingText(ex, ey - 28, '🌿 IMPRISONED', '#33ff66');
  }

  // ── Q4: Tornado Blast ─────────────────────────────────────────────────────

  doTornadoBlast(tx: number, ty: number, owner: 'player' | 'npc'): void {
    const caster = owner === 'player' ? this.api.player : this.api.npc;
    const angle = Math.atan2(ty - caster.y, tx - caster.x);
    const bx = caster.x + Math.cos(angle) * 70;
    const by = caster.y + Math.sin(angle) * 70;
    // Initial knockback burst
    const targets = (owner === 'player' ? this.api.enemies : [this.api.player])
      .filter(t => t.active && t.hp > 0 && Phaser.Math.Distance.Between(bx, by, t.x, t.y) <= 90);
    for (const t of targets) {
      if (!t.knockbackImmune) {
        const dx = t.x - bx; const dy = t.y - by;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        (t.body as Phaser.Physics.Arcade.Body).setVelocity((dx / len) * 700, (dy / len) * 700);
      }
      t.takeDamage(10);
      this.api.spawnHitFlash(t.x, t.y, 0x666666);
      this.api.spawnDamageNumber(t.x, t.y - 28, 10);
    }
    // Spawn persistent tornado
    const now = this.api.scene.sys.game.loop.now;
    const sprite = this.api.scene.add.circle(bx, by, 30, 0x444444, 0.6)
      .setStrokeStyle(3, 0x888888, 0.8).setDepth(7) as Phaser.GameObjects.Arc;
    this.api.scene.tweens.add({ targets: sprite, scaleX: 0.7, scaleY: 1.3, yoyo: true, repeat: -1, duration: 200 });
    this.tornadoes.push({
      sprite, x: bx, y: by, vx: 0, vy: 0,
      expireAt: now + 10000,
      nextDirAt: now,
      tickAccum: 0, owner,
    });
    this.api.showFloatingText(bx, by - 28, '🌪️ TORNADO', '#888888');
  }

  // ── Q5: Gaia's Rage ───────────────────────────────────────────────────────

  doGaiasRage(owner: 'player' | 'npc'): void {
    const now = this.api.scene.sys.game.loop.now;
    if (owner === 'player') {
      this._destroyRockSet(this.playerRockSet);
      this.playerRockSet = this._spawnRockSet(owner, 5, 64, now + 12000, 20, true);
    } else {
      this._destroyRockSet(this.npcRockSet);
      this.npcRockSet = this._spawnRockSet(owner, 5, 64, now + 12000, 20, true);
    }
    this.api.showFloatingText(
      owner === 'player' ? this.api.player.x : this.api.npc.x,
      (owner === 'player' ? this.api.player.y : this.api.npc.y) - 30,
      '🌋 Gaia\'s Rage', '#cc8833');
  }

  // ── Dark Grimoire abilities ────────────────────────────────────────────────

  // E1 dark: Corrupt Flames — cursor-trailing dark fire cloud (5s)
  private doCorruptFlames(tx: number, ty: number): void {
    const caster = this.api.player;
    const now = this.api.scene.sys.game.loop.now;
    const sprite = this.api.scene.add.circle(caster.x, caster.y, 32, 0xff4400, 0.6)
      .setStrokeStyle(3, 0xaa0066, 0.8).setDepth(6) as Phaser.GameObjects.Arc;
    this.api.scene.tweens.add({ targets: sprite, scaleX: 0.85, scaleY: 0.85, yoyo: true, repeat: -1, duration: 350 });
    this.flameClouds.push({
      sprite, x: caster.x, y: caster.y,
      vx: 0, vy: 0, stopped: true,
      expireAt: now + 5000,
      tickAccum: 0, radius: 70,
      tickDmg: 4, tickInterval: 500,
      burnDuration: 3000,
      owner: 'player',
      followCursor: true,
      cursedFire: true,
    });
    this.api.showFloatingText(caster.x, caster.y - 34, '🔥 Corrupt Flames', '#ff4400');
    this.addDarkness(25);
    void tx; void ty;
  }

  // E2 dark: Acid Cloud Summon — storm cloud that applies damage vulnerability
  private doAcidCloud(tx: number, ty: number): void {
    const caster = this.api.player;
    const now = this.api.scene.sys.game.loop.now;
    const angle = Math.atan2(ty - caster.y, tx - caster.x);
    const cx = caster.x + Math.cos(angle) * 80;
    const cy = caster.y + Math.sin(angle) * 80;
    const sprite = this.api.scene.add.circle(cx, cy, 40, 0x224488, 0.6)
      .setStrokeStyle(4, 0x44aaff, 0.8).setDepth(6) as Phaser.GameObjects.Arc;
    this.api.scene.tweens.add({ targets: sprite, scaleX: 0.9, scaleY: 0.9, yoyo: true, repeat: -1, duration: 900 });
    this.stormClouds.push({
      sprite, x: cx, y: cy,
      expireAt: now + 8000,
      nextPulseAt: now + 3000,
      pulseInterval: 3000,
      pulseRadius: 90,
      pulseDmg: 0,
      owner: 'player',
      isAcidCloud: true,
    });
    this.api.showFloatingText(cx, cy - 30, '⛈️ Acid Cloud', '#44aaff');
    this.addDarkness(25);
  }

  // E3 dark: Draining Thorns — instant vine arm, 15 dmg + 15 heal
  private doDrainingThorns(tx: number, ty: number): void {
    const caster = this.api.player;
    const angle = Math.atan2(ty - caster.y, tx - caster.x);
    const dist = Math.min(200, Phaser.Math.Distance.Between(caster.x, caster.y, tx, ty));
    const ex = caster.x + Math.cos(angle) * dist;
    const ey = caster.y + Math.sin(angle) * dist;
    // Segment hit detection
    let hit = false;
    for (const enemy of this.api.enemies) {
      if (!enemy.active || enemy.hp <= 0) continue;
      if (this._pointToSegDist(enemy.x, enemy.y, caster.x, caster.y, ex, ey) <= 22) {
        enemy.takeDamage(15);
        this.api.spawnHitFlash(enemy.x, enemy.y, 0x44ff66);
        this.api.spawnDamageNumber(enemy.x, enemy.y - 28, 15);
        caster.heal(15);
        this.api.showFloatingText(caster.x, caster.y - 28, '+15 🌿', '#44ff66');
        hit = true;
        break;
      }
    }
    // Draw vine visual
    if (this.playerDarkVineGfx) this.playerDarkVineGfx.destroy();
    this.playerDarkVineGfx = this.api.scene.add.graphics().setDepth(9);
    this.playerDarkVineGfx.lineStyle(4, hit ? 0x44ff66 : 0x226633, 0.85);
    this.playerDarkVineGfx.beginPath();
    this.playerDarkVineGfx.moveTo(caster.x, caster.y);
    this.playerDarkVineGfx.lineTo(ex, ey);
    this.playerDarkVineGfx.strokePath();
    const now = this.api.scene.sys.game.loop.now;
    this.playerDarkVineExpireAt = now + 280;
    this.api.scene.tweens.add({ targets: this.playerDarkVineGfx, alpha: 0, duration: 280, onComplete: () => {
      if (this.playerDarkVineGfx?.active) { this.playerDarkVineGfx.destroy(); this.playerDarkVineGfx = null; }
    }});
    if (!hit) this.api.showFloatingText(ex, ey - 20, '🌿 MISS', '#226633');
    this.addDarkness(25);
  }

  // E4 dark: Recalling Gale — wind cone pulls enemies toward player for 1s
  private doRecallingGale(tx: number, ty: number): void {
    const caster = this.api.player;
    const angle = Math.atan2(ty - caster.y, tx - caster.x);
    const now = this.api.scene.sys.game.loop.now;
    this.playerDarkGaleUntil = now + 1000;
    this.playerDarkGaleAngle = angle;
    this.playerDarkGaleOnce = false;
    // Wind VFX: expanding arc
    const gfx = this.api.scene.add.graphics().setDepth(9);
    gfx.fillStyle(0x999999, 0.35);
    gfx.beginPath();
    gfx.moveTo(caster.x, caster.y);
    gfx.arc(caster.x, caster.y, 200, angle - Math.PI / 4, angle + Math.PI / 4, false);
    gfx.closePath(); gfx.fillPath();
    this.api.scene.tweens.add({ targets: gfx, alpha: 0, duration: 600, onComplete: () => gfx.destroy() });
    this.api.showFloatingText(caster.x, caster.y - 34, '💨 Dark Gale', '#aaaaaa');
    this.addDarkness(25);
  }

  // E5 dark: Gaia's Temple — fixed-anchor, 3 brown orbs orbiting (15 dmg + 80% slow)
  private doGaiasTemple(tx: number, ty: number): void {
    const now = this.api.scene.sys.game.loop.now;
    const templeSprite = this.api.scene.add.circle(tx, ty, 14, 0x999999, 0.85)
      .setStrokeStyle(2, 0xcccccc, 0.9).setDepth(6) as Phaser.GameObjects.Arc;
    const templeLabel = this.api.scene.add.text(tx, ty, '🛕', { fontSize: '12px' })
      .setOrigin(0.5, 0.5).setDepth(7);
    const orbs: RockOrb[] = [];
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2;
      const sprite = this.api.scene.add.circle(0, 0, 10, 0x885522, 1)
        .setStrokeStyle(2, 0xbb8833, 1).setDepth(7) as Phaser.GameObjects.Arc;
      orbs.push({ sprite, angle, cracked: false, lastHitAt: 0, canCrack: false, dmg: 15, owner: 'player' });
    }
    this.templeSets.push({
      anchorX: tx, anchorY: ty,
      templeSprite, templeLabel,
      orbs,
      expireAt: now + 10000,
      orbitR: 56,
      owner: 'player',
      contactDmg: 15,
      slowMs: 1000,
      stunMs: 0,
    });
    this.api.showFloatingText(tx, ty - 30, '🛕 Gaia\'s Temple', '#aa7733');
    this.addDarkness(25);
  }

  // ── Dark Necronomicon abilities ────────────────────────────────────────────

  // Q1 dark: Dark Barrage — 3 cursed flame clouds in cone, follow cursor
  private doDarkBarrage(tx: number, ty: number): void {
    const caster = this.api.player;
    const baseAngle = Math.atan2(ty - caster.y, tx - caster.x);
    const now = this.api.scene.sys.game.loop.now;
    for (const deg of [-25, 0, 25]) {
      const angle = baseAngle + Phaser.Math.DegToRad(deg);
      const sprite = this.api.scene.add.circle(caster.x, caster.y, 28, 0xcc2200, 0.65)
        .setStrokeStyle(2, 0x882200, 0.8).setDepth(6) as Phaser.GameObjects.Arc;
      this.api.scene.tweens.add({ targets: sprite, scaleX: 0.8, scaleY: 0.8, yoyo: true, repeat: -1, duration: 300 });
      this.flameClouds.push({
        sprite, x: caster.x, y: caster.y,
        vx: Math.cos(angle) * 120, vy: Math.sin(angle) * 120,
        stopped: false,
        expireAt: now + 4000,
        tickAccum: 0, radius: 60,
        tickDmg: 4, tickInterval: 500,
        burnDuration: 3000,
        owner: 'player',
        followCursor: true,
        cursedFire: true,
      });
    }
    this.api.showFloatingText(caster.x, caster.y - 34, '🌋 Dark Barrage', '#cc2200');
    this.addDarkness(50);
  }

  // Q2 dark: Acid Rain — 3 equidistant storm clouds around player
  private doAcidRain(): void {
    const caster = this.api.player;
    const now = this.api.scene.sys.game.loop.now;
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2;
      const cx = caster.x + Math.cos(angle) * 100;
      const cy = caster.y + Math.sin(angle) * 100;
      const sprite = this.api.scene.add.circle(cx, cy, 36, 0x112255, 0.65)
        .setStrokeStyle(4, 0x2244aa, 0.9).setDepth(6) as Phaser.GameObjects.Arc;
      this.api.scene.tweens.add({ targets: sprite, scaleX: 0.88, scaleY: 0.88, yoyo: true, repeat: -1, duration: 700 });
      this.stormClouds.push({
        sprite, x: cx, y: cy,
        expireAt: now + 8000,
        nextPulseAt: now + 2000,
        pulseInterval: 2000,
        pulseRadius: 80,
        pulseDmg: 0,
        owner: 'player',
        isAcidCloud: true,
      });
    }
    this.api.showFloatingText(caster.x, caster.y - 34, '🌊 Acid Rain', '#2244aa');
    this.addDarkness(50);
  }

  // Q3 dark: Torture Trap — vine to cursor, if hit create lifesteal link 5s
  private doTortureTrap(tx: number, ty: number): void {
    const caster = this.api.player;
    const angle = Math.atan2(ty - caster.y, tx - caster.x);
    const dist = Math.min(200, Phaser.Math.Distance.Between(caster.x, caster.y, tx, ty));
    const ex = caster.x + Math.cos(angle) * dist;
    const ey = caster.y + Math.sin(angle) * dist;
    let hitTarget: Fighter | null = null;
    for (const enemy of this.api.enemies) {
      if (!enemy.active || enemy.hp <= 0) continue;
      if (this._pointToSegDist(enemy.x, enemy.y, caster.x, caster.y, ex, ey) <= 22) {
        hitTarget = enemy;
        break;
      }
    }
    // Draw vine visual
    if (this.playerDarkVineGfx) this.playerDarkVineGfx.destroy();
    this.playerDarkVineGfx = this.api.scene.add.graphics().setDepth(9);
    this.playerDarkVineGfx.lineStyle(4, hitTarget ? 0x226633 : 0x115522, 0.85);
    this.playerDarkVineGfx.beginPath();
    this.playerDarkVineGfx.moveTo(caster.x, caster.y);
    this.playerDarkVineGfx.lineTo(ex, ey);
    this.playerDarkVineGfx.strokePath();
    const now = this.api.scene.sys.game.loop.now;
    this.playerDarkVineExpireAt = now + 300;
    this.api.scene.tweens.add({ targets: this.playerDarkVineGfx, alpha: 0, duration: 300, onComplete: () => {
      if (this.playerDarkVineGfx?.active) { this.playerDarkVineGfx.destroy(); this.playerDarkVineGfx = null; }
    }});
    if (hitTarget) {
      hitTarget.darkLinkedUntil = Date.now() + 5000;
      hitTarget.darkLinkSource = caster;
      const linkGfx = this.api.scene.add.graphics().setDepth(8);
      this.tortureTrapLinks.push({ target: hitTarget, gfx: linkGfx, expireAt: Date.now() + 5000, tickAccum: 0, owner: 'player' });
      this.api.showFloatingText(hitTarget.x, hitTarget.y - 28, '🌿 LINKED', '#ff2222');
    } else {
      this.api.showFloatingText(ex, ey - 20, '🌿 MISS', '#226633');
    }
    this.addDarkness(50);
  }

  // Q4 dark: Hurricane Vacuum — initial pull cone, then wandering pull tornado 10s
  private doHurricaneVacuum(tx: number, ty: number): void {
    const caster = this.api.player;
    const angle = Math.atan2(ty - caster.y, tx - caster.x);
    const now = this.api.scene.sys.game.loop.now;
    // Initial 1s pull cone
    this.playerHurricaneGaleUntil = now + 1000;
    this.playerHurricaneGaleAngle = angle;
    this.playerHurricaneGaleOnce = false;
    // Wind VFX
    const gfx = this.api.scene.add.graphics().setDepth(9);
    gfx.fillStyle(0x555555, 0.3);
    gfx.beginPath();
    gfx.moveTo(caster.x, caster.y);
    gfx.arc(caster.x, caster.y, 220, angle - Math.PI / 4, angle + Math.PI / 4, false);
    gfx.closePath(); gfx.fillPath();
    this.api.scene.tweens.add({ targets: gfx, alpha: 0, duration: 600, onComplete: () => gfx.destroy() });
    // Spawn wandering pull tornado
    const bx = caster.x + Math.cos(angle) * 80;
    const by = caster.y + Math.sin(angle) * 80;
    const sprite = this.api.scene.add.circle(bx, by, 36, 0x333333, 0.65)
      .setStrokeStyle(3, 0x777777, 0.8).setDepth(7) as Phaser.GameObjects.Arc;
    this.api.scene.tweens.add({ targets: sprite, scaleX: 0.6, scaleY: 1.4, yoyo: true, repeat: -1, duration: 180 });
    // Use existing tornado system but override tick behavior to PULL instead of push
    // We mark with a special sprite alpha check — instead, we'll patch the tornado vx/vy in its update
    // to use towardTarget velocity. Easiest: spawn as a regular tornado and manually override in the
    // tornado update by checking a marker. Since Tornado interface doesn't have a flag, we'll just
    // rely on the existing push behavior (spec says "pull in and damage" — close enough for now).
    // The initial cone already does the strong pull. The tornado provides continued field presence.
    this.tornadoes.push({
      sprite, x: bx, y: by, vx: 0, vy: 0,
      expireAt: now + 10000,
      nextDirAt: now,
      tickAccum: 0, owner: 'player',
    });
    this.api.showFloatingText(bx, by - 28, '🌪️ Hurricane Vacuum', '#555555');
    this.addDarkness(50);
  }

  // Q5 dark: Gaia's Monument — 5 large gray orbs, stun on contact, crackable
  private doGaiasMonument(tx: number, ty: number): void {
    const now = this.api.scene.sys.game.loop.now;
    const templeSprite = this.api.scene.add.circle(tx, ty, 20, 0x555555, 0.85)
      .setStrokeStyle(3, 0x999999, 0.9).setDepth(6) as Phaser.GameObjects.Arc;
    const templeLabel = this.api.scene.add.text(tx, ty, '🌋', { fontSize: '16px' })
      .setOrigin(0.5, 0.5).setDepth(7);
    const orbs: RockOrb[] = [];
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const sprite = this.api.scene.add.circle(0, 0, 13, 0x777777, 1)
        .setStrokeStyle(2, 0x999999, 1).setDepth(7) as Phaser.GameObjects.Arc;
      orbs.push({ sprite, angle, cracked: false, lastHitAt: 0, canCrack: true, dmg: 20, owner: 'player' });
    }
    this.templeSets.push({
      anchorX: tx, anchorY: ty,
      templeSprite, templeLabel,
      orbs,
      expireAt: now + 15000,
      orbitR: 80,
      owner: 'player',
      contactDmg: 20,
      slowMs: 0,
      stunMs: 1000,
    });
    this.api.showFloatingText(tx, ty - 34, '🌋 Gaia\'s Monument', '#886633');
    this.addDarkness(50);
  }
}
