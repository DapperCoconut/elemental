import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import { Projectile } from '../../combat/Projectile';

// ── Type definitions ──────────────────────────────────────────────────────────

type WeaponType =
  | 'pistol' | 'ar' | 'shotgun' | 'rifle' | 'grenade' | 'machinegun'
  | 'flamethrower' | 'rpg' | 'minigun' | 'sniper' | 'raygun' | 'freezeray' | 'gunblade';

interface WeaponDef {
  type: WeaponType;
  name: string;
  emoji: string;
  desc: string;
}

const WEAPON_DEFS: Record<WeaponType, WeaponDef> = {
  pistol: { type: 'pistol', name: 'Pistol', emoji: '🔫', desc: 'Hitscan, 10 dmg. Each copy: -10% Fire at Will cooldown.' },
  ar: { type: 'ar', name: 'AR', emoji: '💥', desc: '3 hitscan shots in quick succession, 6 dmg each.' },
  shotgun: { type: 'shotgun', name: 'Shotgun', emoji: '💨', desc: 'Cone of 10 pellets, 2 dmg each, short range.' },
  rifle: { type: 'rifle', name: 'Rifle', emoji: '🎯', desc: 'Large hitscan, 15 dmg. Each copy: +25% Musket Shot damage.' },
  grenade: { type: 'grenade', name: 'Grenade Launcher', emoji: '💣', desc: 'Lobs a grenade that explodes after a short fuse.' },
  machinegun: { type: 'machinegun', name: 'Machine Gun', emoji: '🔥', desc: '20 hitscan shots, 2 dmg each, up to 10° inaccurate.' },
  flamethrower: { type: 'flamethrower', name: 'Flamethrower', emoji: '🧯', desc: '10 flame clouds, 3 dmg each, fade in 3s or on contact. Each copy: muskets cool 20% slower.' },
  rpg: { type: 'rpg', name: 'RPG', emoji: '🚀', desc: 'Explosive rocket, 20 dmg in a large AOE. Each copy: +20% Fire at Will cooldown.' },
  minigun: { type: 'minigun', name: 'Minigun', emoji: '🌪️', desc: '30 hitscan shots, 2 dmg each. Slows you 50% while firing. Each copy: muskets cool 35% slower.' },
  sniper: { type: 'sniper', name: 'Sniper', emoji: '🔭', desc: 'Hitscan, 20 dmg. Only fires every other Fire at Will (red slot = will skip next).' },
  raygun: { type: 'raygun', name: 'Ray-Gun', emoji: '🟢', desc: 'Bouncy piercing bullet, 5 dmg + knockback, up to 3 hits before it burns out.' },
  freezeray: { type: 'freezeray', name: 'Freeze-Ray', emoji: '❄️', desc: 'Hitscan, 3 dmg + 1s stun. Each copy: muskets cool 20% faster.' },
  gunblade: { type: 'gunblade', name: 'Gunblade', emoji: '⚔️', desc: 'Long shot (10 dmg) or point-blank slash (15 dmg). Grants 20% damage reduction for 2s after firing.' },
};
const BASE_WEAPON_TYPES: WeaponType[] = ['pistol', 'ar', 'shotgun', 'rifle', 'grenade', 'machinegun'];
const EXTRA_WEAPON_TYPES: WeaponType[] = ['flamethrower', 'rpg', 'minigun', 'sniper', 'raygun', 'freezeray', 'gunblade'];

const MUSKET_MAX_AMMO = 3;
const ARSENAL_MAX = 3;
const ARSENAL_MAX_R_UPGRADED = 6;
const FIRE_AT_WILL_BASE_CD = 9000;

// ── BlunderBlast (Q) — a silver vacuum cone that swallows enemy projectiles for
//    5s, then coughs the whole hoard back out (double damage) on the next shot. ──
const BLUNDERBLAST_DURATION = 5000;
const BLUNDERBLAST_RADIUS = 180;
const BLUNDERBLAST_HALF_ANGLE = Math.PI / 12; // 15° half → 30° cone
const BLUNDERBLAST_RADIUS_Q = 240;
const BLUNDERBLAST_HALF_ANGLE_Q = Math.PI / 8; // 22.5° half → 45° cone (Q+)
const BLUNDERBLAST_BLAST_SPREAD = Math.PI / 6; // 30° fan when the hoard is coughed back out
const BLUNDERBLAST_COLOR = 0xcfd4da; // silver
const BLUNDERBLAST_MAX_CAPTURE = 30;

// ── Gunpowder Mastery — Quickdraw (passive) ───────────────────────────────────
// Every QUICKDRAW_DAMAGE_STEP damage taken (cumulative, carried between hits) snaps
// a holdout laser at the closest enemy.
const QUICKDRAW_DAMAGE_STEP = 30;
const QUICKDRAW_DAMAGE = 10;
const QUICKDRAW_RANGE = 900;
const QUICKDRAW_COLOR = 0xffe08a;

// ── Gunpowder Mastery — Overload (bindable) ───────────────────────────────────
const OVERLOAD_COOLDOWN_MS = 16000;
const OVERLOAD_AIM_MS = 2000;
const OVERLOAD_SHOT_DAMAGE = 15;
const OVERLOAD_EXTRA_HEAT_MS = 3000;
const OVERLOAD_BURN_DAMAGE = 20;
const OVERLOAD_BURN_RADIUS = 30;
const OVERLOAD_BURN_INTERVAL_MS = 1000;
const OVERLOAD_LASER_COLOR = 0xff3322;

// Musket heat colors — dropped muskets fade hot red -> orange -> normal as they cool.
const MUSKET_HOT_FILL = 0xdd2222;
const MUSKET_WARM_FILL = 0xff8800;
const MUSKET_COOL_FILL = 0x5c4326;
const MUSKET_HOT_STROKE = 0x881111;
const MUSKET_WARM_STROKE = 0xcc5500;
const MUSKET_COOL_STROKE = 0x8b6b3d;

function lerpColor(from: number, to: number, t: number): number {
  const r1 = (from >> 16) & 0xff, g1 = (from >> 8) & 0xff, b1 = from & 0xff;
  const r2 = (to >> 16) & 0xff, g2 = (to >> 8) & 0xff, b2 = to & 0xff;
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return (r << 16) | (g << 8) | b;
}

function musketColorAt(progress: number, hot: number, warm: number, cool: number): number {
  const p = Phaser.Math.Clamp(progress, 0, 1);
  return p < 0.5 ? lerpColor(hot, warm, p / 0.5) : lerpColor(warm, cool, (p - 0.5) / 0.5);
}

interface DroppedMusket {
  gfx: Phaser.GameObjects.Rectangle;
  x: number;
  y: number;
  droppedAt: number;
  hotUntil: number;
  cooled: boolean;
  owner: 'player' | 'npc';
  // Click+ Attached Bayonet fields — only set when this musket was thrown, not fired.
  isBayonet?: boolean;
  flying?: boolean;
  vx?: number;
  vy?: number;
  angle?: number;
  targetX?: number;
  targetY?: number;
  bayonetGfx?: Phaser.GameObjects.Triangle;
  lastGroundHitAt?: number;
  // Overload (mastery) fields.
  /** Timestamp of the volley this musket is currently lining up for, 0 when it isn't aiming. */
  aimingFor?: number;
  /** While `time` is under this, the musket is scalding and burns its own owner on contact. */
  overloadBurnUntil?: number;
  lastOwnerBurnAt?: number;
}

/** One Overload cast: every grounded musket of that owner aims, then fires together. */
interface OverloadVolley {
  owner: 'player' | 'npc';
  startedAt: number;
  firesAt: number;
}

interface Grenade {
  sprite: Phaser.GameObjects.Arc;
  x: number;
  y: number;
  vx: number;
  vy: number;
  explodeAt: number;
  owner: 'player' | 'npc';
}

interface Rocket {
  sprite: Phaser.GameObjects.Arc;
  x: number;
  y: number;
  vx: number;
  vy: number;
  spawnX: number;
  spawnY: number;
  spawnAt: number;
  owner: 'player' | 'npc';
}

interface FlameCloud {
  sprite: Phaser.GameObjects.Arc;
  x: number;
  y: number;
  vx: number;
  vy: number;
  expiresAt: number;
  owner: 'player' | 'npc';
}

interface RayBullet {
  sprite: Phaser.GameObjects.Arc;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hits: number;
  lastHitAt: number;
  spawnAt: number;
  owner: 'player' | 'npc';
}

/** A projectile swallowed by BlunderBlast — only its texture + damage are kept so it
 *  can be re-spawned facing the other way when the hoard is released. */
interface CapturedShot {
  textureKey: string;
  damage: number;
}

interface ArsenalSlot {
  type: WeaponType;
  /** R+: marked for removal via right-click — fires one last volley, then is deleted after. */
  pendingRemoval?: boolean;
  /** Sniper: toggles every Fire at Will cast so it only fires every other volley. */
  skipFire?: boolean;
}

interface ArsenalMenuBtn {
  x: number;
  y: number;
  w: number;
  h: number;
  type: WeaponType;
}

interface ArsenalHudSlot {
  x: number;
  y: number;
  w: number;
  h: number;
  idx: number;
}

// ── Arena API ─────────────────────────────────────────────────────────────────

export interface GunpowderArenaApi {
  readonly player: Fighter;
  readonly npc: Fighter;
  readonly scene: Phaser.Scene;
  readonly projectiles: Phaser.Physics.Arcade.Group;
  readonly eKey: Phaser.Input.Keyboard.Key;
  readonly fKey: Phaser.Input.Keyboard.Key;
  readonly rKey: Phaser.Input.Keyboard.Key;
  readonly qKey: Phaser.Input.Keyboard.Key;
  readonly pointerWasDown: boolean;
  readonly nukeChanneling: boolean;
  readonly elementId: string;
  readonly npcElementId: string;
  /** Player-only: skips WASD movement while true, so a burst dash isn't overwritten same-frame. */
  isDodging: boolean;
  hasUpgrade(slot: string): boolean;
  hasPerk(owner: 'player' | 'npc', perkId: string): boolean;
  applyNpcSpeedMult(factor: number): void;
  applyPlayerSpeedMult(factor: number): void;
  spawnHitFlash(x: number, y: number, color: number): void;
  spawnDamageNumber(x: number, y: number, amount: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  spawnFloatingText(x: number, y: number, text: string, color: string): void;
  dealAoeDamageFromOwner(x: number, y: number, radius: number, damage: number, owner: 'player' | 'npc'): void;
  buildPlayerContext(x: number, y: number): CastContext;
  buildNpcContext(x: number, y: number): CastContext;
  /** True only when the player is gunpowder AND Gunpowder Mastery is switched on. */
  readonly masteryActive: boolean;
  /** Online: true when the remote opponent is a gunpowder player with mastery on. */
  readonly npcMasteryActive: boolean;
  /** Mastery enhancement id bound over the given ability slot, or null if that slot is unchanged. */
  masteryBindFor(slot: string): string | null;
  /** Online: broadcast a bindable mastery cast so the peer's sim replays it. */
  broadcastMasteryCast(enhId: string): void;
  recordMasteryStat(key: string, amount: number): void;
  /** Ratchet a "best single instance" mastery stat. */
  recordMasteryBestStat(key: string, value: number): void;
  getMasteryStat(key: string): number;
}

// ── GunpowderKit (Gunpowder) ────────────────────────────────────────────────────

export class GunpowderKit {
  // ── Muskets ───────────────────────────────────────────────────────────────
  private playerAmmo = MUSKET_MAX_AMMO;
  private npcAmmo = MUSKET_MAX_AMMO;
  private muskets: DroppedMusket[] = [];

  // ── Arsenal ───────────────────────────────────────────────────────────────
  private playerArsenal: ArsenalSlot[] = [];
  private npcArsenal: ArsenalSlot[] = [];

  // ── Arsenal picker menu (player only) ────────────────────────────────────
  private menuOpen = false;
  private menuOffered: WeaponType[] = [];
  private menuGfx: Phaser.GameObjects.Graphics | null = null;
  private menuLabels: Phaser.GameObjects.Text[] = [];
  private menuBtnAreas: ArsenalMenuBtn[] = [];

  // ── Arsenal HUD ───────────────────────────────────────────────────────────
  private arsenalHudCx = 0;
  private arsenalHudTexts: Phaser.GameObjects.Text[] = [];
  private arsenalHudBgs: Phaser.GameObjects.Rectangle[] = [];
  private arsenalHudAreas: ArsenalHudSlot[] = [];
  private wasRightDown = false;

  // ── Weapon projectiles ──────────────────────────────────────────────────────
  private grenades: Grenade[] = [];
  private rockets: Rocket[] = [];
  private flameClouds: FlameCloud[] = [];
  private rayBullets: RayBullet[] = [];

  // ── BlunderBlast (Q) ──────────────────────────────────────────────────────
  private playerVacuumUntil = 0;
  private npcVacuumUntil = 0;
  private playerVacuumCone: Phaser.GameObjects.Graphics | null = null;
  private npcVacuumCone: Phaser.GameObjects.Graphics | null = null;
  private playerCaptured: CapturedShot[] = [];
  private npcCaptured: CapturedShot[] = [];
  private lastMouseX = 0;
  private lastMouseY = 0;

  // ── Stun (this codebase's earthStunnedUntil field isn't consumed by NPC
  // movement or player input anywhere, so we enforce our own stun by zeroing
  // velocity every frame — same approach FateKit uses for its Lightning stun). ──
  private playerStunUntil = 0;
  private npcStunUntil = 0;

  // ── Transient weapon buffs ────────────────────────────────────────────────
  private playerDamageReductionUntil = 0;
  private npcDamageReductionUntil = 0;
  private playerMinigunFiringUntil = 0;
  private npcMinigunFiringUntil = 0;

  // ── Mastery: Quickdraw (passive) ──────────────────────────────────────────
  // Damage taken is read as an HP delta each frame, so every source counts — hits,
  // burns, self-inflicted blasts — without having to hook each one.
  private playerLastHp = -1;
  private npcLastHp = -1;
  private playerQuickdrawAccum = 0;
  private npcQuickdrawAccum = 0;

  // ── Mastery: Overload (bindable) ──────────────────────────────────────────
  private overloadLastCastAt = -OVERLOAD_COOLDOWN_MS;
  private overloadVolleys: OverloadVolley[] = [];
  private overloadGfx: Phaser.GameObjects.Graphics | null = null;

  constructor(private arena: GunpowderArenaApi) {}

  // ── Public accessors ──────────────────────────────────────────────────────

  getArsenalSize(owner: 'player' | 'npc'): number {
    return (owner === 'player' ? this.playerArsenal : this.npcArsenal).length;
  }

  // ── Reset ─────────────────────────────────────────────────────────────────

  reset(): void {
    for (const m of this.muskets) { m.gfx.destroy(); m.bayonetGfx?.destroy(); }
    this.muskets = [];
    this.playerAmmo = MUSKET_MAX_AMMO;
    this.npcAmmo = MUSKET_MAX_AMMO;

    for (const g of this.grenades) g.sprite.destroy();
    this.grenades = [];
    for (const r of this.rockets) r.sprite.destroy();
    this.rockets = [];
    for (const c of this.flameClouds) c.sprite.destroy();
    this.flameClouds = [];
    for (const b of this.rayBullets) b.sprite.destroy();
    this.rayBullets = [];

    this.playerVacuumCone?.destroy();
    this.npcVacuumCone?.destroy();
    this.playerVacuumCone = null;
    this.npcVacuumCone = null;
    this.playerVacuumUntil = 0;
    this.npcVacuumUntil = 0;
    this.playerCaptured = [];
    this.npcCaptured = [];

    this.playerArsenal = [];
    this.npcArsenal = [];
    this.closeArsenalMenu();
    this.destroyArsenalHud();

    this.playerStunUntil = 0;
    this.npcStunUntil = 0;
    this.playerDamageReductionUntil = 0;
    this.npcDamageReductionUntil = 0;
    this.playerMinigunFiringUntil = 0;
    this.npcMinigunFiringUntil = 0;
    this.wasRightDown = false;

    this.playerLastHp = -1;
    this.npcLastHp = -1;
    this.playerQuickdrawAccum = 0;
    this.npcQuickdrawAccum = 0;

    // Readiness is measured against the absolute clock, so a 0 here would lock the
    // ability out for the first OVERLOAD_COOLDOWN_MS of the match.
    this.overloadLastCastAt = -OVERLOAD_COOLDOWN_MS;
    this.overloadVolleys = [];
    this.overloadGfx?.destroy();
    this.overloadGfx = null;
  }

  // ── Input ─────────────────────────────────────────────────────────────────

  handleInput(
    time: number,
    pointer: Phaser.Input.Pointer,
    mouseX: number,
    mouseY: number,
  ): void {
    void time;
    this.lastMouseX = mouseX;
    this.lastMouseY = mouseY;
    if (this.arena.nukeChanneling) return;
    const { player, eKey, fKey, rKey, qKey, pointerWasDown } = this.arena;
    const ctx = () => this.arena.buildPlayerContext(mouseX, mouseY);

    // Right-click: discard a weapon from the arsenal HUD.
    const rightDown = pointer.rightButtonDown();
    if (rightDown && !this.wasRightDown && !this.menuOpen) {
      this.tryRemoveArsenalWeapon(pointer.x, pointer.y);
    }
    this.wasRightDown = rightDown;

    // ── Click: Musket Shot / menu selection ──────────────────────────────
    if (pointer.isDown && !pointerWasDown) {
      if (this.menuOpen) {
        this.handleMenuClick(pointer.x, pointer.y);
      } else {
        player.castAbility('gunpowder-musket-shot', ctx());
      }
    }

    // Gunpowder Mastery — Overload may be bound over any of E/R/F/Q, suppressing that slot's base ability.
    const ovSlot = this.arena.masteryActive ? this.overloadSlot() : null;

    // ── E: Explosive Retreat ─────────────────────────────────────────────
    if (Phaser.Input.Keyboard.JustDown(eKey) && !this.menuOpen) {
      if (ovSlot === 'e') this.tryCastOverload();
      else player.castAbility('gunpowder-explosive-retreat', ctx());
    }

    // ── R: Fire at Will ──────────────────────────────────────────────────
    if (Phaser.Input.Keyboard.JustDown(rKey) && !this.menuOpen) {
      if (ovSlot === 'r') this.tryCastOverload();
      else player.castAbility('gunpowder-fire-at-will', ctx());
    }

    // ── F: Arsenal Expansion ─────────────────────────────────────────────
    if (Phaser.Input.Keyboard.JustDown(fKey)) {
      if (this.menuOpen) this.autoPickArsenalMenu();
      else if (ovSlot === 'f') this.tryCastOverload();
      else player.castAbility('gunpowder-arsenal-expansion', ctx());
    }

    // ── Q: BlunderBlast ──────────────────────────────────────────────────
    if (Phaser.Input.Keyboard.JustDown(qKey) && !this.menuOpen) {
      if (ovSlot === 'q') this.tryCastOverload();
      else player.castAbility('gunpowder-blunderblast', ctx());
    }
  }

  // ── Per-frame update ──────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    this.updateMuskets(time, delta);
    this.updateGrenades(time, delta);
    this.updateRockets(time, delta);
    this.updateFlameClouds(time, delta);
    this.updateRayBullets(time, delta);
    this.updateBlunderBlast(time);
    this.updateStuns(time);
    this.updateBuffs(time);
    this.updateOverload(time);
    this.updateQuickdraw(time);
  }

  private updateStuns(time: number): void {
    if (time < this.playerStunUntil) {
      (this.arena.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    }
    if (time < this.npcStunUntil) {
      (this.arena.npc.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    }
  }

  /** Weapon-passive windows (Gunblade damage reduction, Minigun slow) — self-contained toggles
   * that only touch shared Fighter fields while their own timer is active, and reset exactly
   * once on natural expiry, so they never clobber another element's use of the same field. */
  private updateBuffs(time: number): void {
    if (this.playerDamageReductionUntil > 0) {
      if (time < this.playerDamageReductionUntil) this.arena.player.incomingDamageMultiplier = 0.8;
      else { this.arena.player.incomingDamageMultiplier = 1; this.playerDamageReductionUntil = 0; }
    }
    if (this.npcDamageReductionUntil > 0) {
      if (time < this.npcDamageReductionUntil) this.arena.npc.incomingDamageMultiplier = 0.8;
      else { this.arena.npc.incomingDamageMultiplier = 1; this.npcDamageReductionUntil = 0; }
    }
    if (this.playerMinigunFiringUntil > 0) {
      if (time < this.playerMinigunFiringUntil) this.arena.applyPlayerSpeedMult(0.5);
      else this.playerMinigunFiringUntil = 0;
    }
    if (this.npcMinigunFiringUntil > 0) {
      if (time < this.npcMinigunFiringUntil) this.arena.applyNpcSpeedMult(0.5);
      else this.npcMinigunFiringUntil = 0;
    }
  }

  /** F+ weapons in the arsenal that adjust how long a dropped musket stays hot (stacking). */
  private musketCoolMult(): number {
    let mult = 1;
    for (const s of this.playerArsenal) {
      if (s.type === 'flamethrower') mult += 0.2;
      else if (s.type === 'minigun') mult += 0.35;
      else if (s.type === 'freezeray') mult -= 0.2;
    }
    return Math.max(0.2, mult);
  }

  // ── Public do* methods (called from ArenaScene CastContext wiring) ─────────

  doGunpowderMusketShot(tx: number, ty: number, owner: 'player' | 'npc'): void {
    // BlunderBlast: if a swallowed hoard is armed, this shot coughs it all back out
    // *instead* of firing a musket ball — no ammo spent, no musket dropped.
    if (this.releaseBlunderHoard(tx, ty, owner)) return;

    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const ammo = owner === 'player' ? this.playerAmmo : this.npcAmmo;
    if (ammo <= 0) {
      this.arena.showFloatingText(caster.x, caster.y - 30, '🔫 Empty!', '#886644');
      return;
    }
    if (owner === 'player') this.playerAmmo--;
    else this.npcAmmo--;
    if (owner === 'player') this.rebuildArsenalHud();

    const dx = tx - caster.x, dy = ty - caster.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = dx / len, ny = dy / len;
    const angle = Math.atan2(ny, nx);
    const { scene } = this.arena;
    const hotMs = 12000 * (owner === 'player' ? this.musketCoolMult() : 1);

    // Fire the bullet — always, regardless of the Click+ bayonet upgrade.
    const rifleCount = (owner === 'player' ? this.playerArsenal : this.npcArsenal).filter((s) => s.type === 'rifle').length;
    const dmg = Math.round(35 * (1 + 0.25 * rifleCount));

    const proj = new Projectile(this.arena.scene, caster.x, caster.y, 'proj-gunpowder-musket', dmg, owner === 'player');
    (proj as unknown as { isMusketShot?: boolean }).isMusketShot = true;
    this.arena.projectiles.add(proj);
    proj.launch(nx * 900, ny * 900);
    proj.setRotation(angle);

    // Click+ Attached Bayonet: instead of dropping the spent musket behind, hurl it to the cursor.
    if (owner === 'player' && this.arena.hasUpgrade('click')) {
      const speed = 640;
      const gfx = scene.add.rectangle(caster.x, caster.y, 40, 6, MUSKET_HOT_FILL, 0.95)
        .setStrokeStyle(1, MUSKET_HOT_STROKE, 1).setDepth(3).setRotation(angle) as Phaser.GameObjects.Rectangle;
      const tipX = caster.x + Math.cos(angle) * 22, tipY = caster.y + Math.sin(angle) * 22;
      const bayonetGfx = scene.add.triangle(tipX, tipY, 0, -5, 0, 5, 12, 0, 0x999999, 1)
        .setDepth(4).setRotation(angle) as Phaser.GameObjects.Triangle;
      const droppedAt = scene.time.now;
      this.muskets.push({
        gfx, x: caster.x, y: caster.y, droppedAt, hotUntil: droppedAt + hotMs, cooled: false, owner,
        isBayonet: true, flying: true, vx: nx * speed, vy: ny * speed, angle, targetX: tx, targetY: ty,
        bayonetGfx, lastGroundHitAt: 0,
      });
      return;
    }

    // Drop the spent musket behind the caster — hot (red, fading through orange to normal) then pick-up-able.
    const dropX = caster.x - nx * 68, dropY = caster.y - ny * 68;
    const gfx = scene.add.rectangle(dropX, dropY, 40, 6, MUSKET_HOT_FILL, 0.95)
      .setStrokeStyle(1, MUSKET_HOT_STROKE, 1).setDepth(3).setRotation(angle) as Phaser.GameObjects.Rectangle;
    const droppedAt = scene.time.now;
    this.muskets.push({ gfx, x: dropX, y: dropY, droppedAt, hotUntil: droppedAt + hotMs, cooled: false, owner });
  }

  doGunpowderExplosiveRetreat(tx: number, ty: number, owner: 'player' | 'npc'): void {
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const { scene } = this.arena;
    const dx = tx - caster.x, dy = ty - caster.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = dx / len, ny = dy / len;
    const doubleBarrel = owner === 'player' && this.arena.hasUpgrade('e');

    const blastAt = (bx: number, by: number): void => {
      const boom = scene.add.circle(bx, by, 12, 0xffaa33, 0.9).setDepth(9);
      scene.tweens.add({ targets: boom, scaleX: 5, scaleY: 5, alpha: 0, duration: 250, onComplete: () => boom.destroy() });
      this.arena.dealAoeDamageFromOwner(bx, by, 45, 20, owner);
    };

    const frontX = caster.x + nx * 65, frontY = caster.y + ny * 65;
    blastAt(frontX, frontY);

    if (doubleBarrel) {
      const backX = caster.x - nx * 65, backY = caster.y - ny * 65;
      blastAt(backX, backY);
      const target = owner === 'player' ? this.arena.npc : this.arena.player;
      if (target.active && target.hp > 0) {
        const d = Phaser.Math.Distance.Between(backX, backY, target.x, target.y);
        if (d <= 45) (target.body as Phaser.Physics.Arcade.Body).setVelocity(-nx * 300, -ny * 300);
      }
    }

    const body = caster.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(-nx * 620, -ny * 620);
    caster.isInvincible = true;
    if (owner === 'player') this.arena.isDodging = true;
    scene.time.delayedCall(220, () => {
      if (caster.active) { caster.isInvincible = false; body.setVelocity(0, 0); }
      if (owner === 'player') this.arena.isDodging = false;
    });
    this.arena.showFloatingText(caster.x, caster.y - 30, '💥 EXPLOSIVE RETREAT', '#ffaa33');
  }

  doGunpowderFireAtWill(tx: number, ty: number, owner: 'player' | 'npc'): void {
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const arsenal = owner === 'player' ? this.playerArsenal : this.npcArsenal;
    if (arsenal.length === 0) {
      this.arena.showFloatingText(caster.x, caster.y - 30, '⚠ Arsenal Empty', '#ff6644');
      return;
    }
    const angle = Math.atan2(ty - caster.y, tx - caster.x);
    const now = this.arena.scene.time.now;

    let pistolCount = 0, rpgCount = 0, hasGunblade = false;
    const toRemove: number[] = [];

    arsenal.forEach((slot, idx) => {
      // Sniper only fires every other Fire at Will — toggle first, so a fresh sniper fires immediately.
      if (slot.type === 'sniper') {
        if (slot.skipFire) { slot.skipFire = false; return; }
        slot.skipFire = true;
      }
      this.fireWeapon(slot.type, owner, angle);
      if (slot.type === 'pistol') pistolCount++;
      if (slot.type === 'rpg') rpgCount++;
      if (slot.type === 'gunblade') hasGunblade = true;
      if (owner === 'player' && slot.pendingRemoval) toRemove.push(idx);
    });

    for (let i = toRemove.length - 1; i >= 0; i--) arsenal.splice(toRemove[i], 1);
    if (owner === 'player' && toRemove.length > 0) this.rebuildArsenalHud();

    if (pistolCount > 0) caster.reduceCooldown('gunpowder-fire-at-will', pistolCount * FIRE_AT_WILL_BASE_CD * 0.10);
    if (rpgCount > 0) caster.reduceCooldown('gunpowder-fire-at-will', -rpgCount * FIRE_AT_WILL_BASE_CD * 0.20);
    if (hasGunblade) {
      if (owner === 'player') this.playerDamageReductionUntil = now + 2000;
      else this.npcDamageReductionUntil = now + 2000;
    }

    this.arena.showFloatingText(caster.x, caster.y - 40, '🔥 FIRE AT WILL', '#dd8833');
  }

  doGunpowderArsenalExpansion(owner: 'player' | 'npc'): void {
    const arsenal = owner === 'player' ? this.playerArsenal : this.npcArsenal;
    const max = owner === 'player' && this.arena.hasUpgrade('r') ? ARSENAL_MAX_R_UPGRADED : ARSENAL_MAX;
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;

    if (arsenal.length >= max) {
      caster.resetCooldown('gunpowder-arsenal-expansion');
      this.arena.showFloatingText(caster.x, caster.y - 30, '⚠ Arsenal Full', '#ff6644');
      return;
    }

    if (owner === 'npc') {
      const pick = BASE_WEAPON_TYPES[Math.floor(Math.random() * BASE_WEAPON_TYPES.length)];
      arsenal.push({ type: pick });
      this.arena.showFloatingText(caster.x, caster.y - 30, `+${WEAPON_DEFS[pick].name}`, '#ffaa44');
      return;
    }

    this.openArsenalMenu();
    caster.resetCooldown('gunpowder-arsenal-expansion');
  }

  doGunpowderBlunderBlast(tx: number, ty: number, owner: 'player' | 'npc'): void {
    void tx; void ty; // aim is read live each frame while the cone is open
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const { scene } = this.arena;
    const now = scene.time.now;

    if (owner === 'player') {
      this.playerVacuumUntil = now + BLUNDERBLAST_DURATION;
      this.playerCaptured = [];
      if (!this.playerVacuumCone) this.playerVacuumCone = scene.add.graphics().setDepth(2);
    } else {
      this.npcVacuumUntil = now + BLUNDERBLAST_DURATION;
      this.npcCaptured = [];
      if (!this.npcVacuumCone) this.npcVacuumCone = scene.add.graphics().setDepth(2);
    }
    this.arena.showFloatingText(caster.x, caster.y - 40, '🌀 BLUNDERBLAST', '#cfd4da');
  }

  // ── BlunderBlast per-frame vacuum ──────────────────────────────────────────

  private updateBlunderBlast(time: number): void {
    this.updateVacuumCone('player', time);
    this.updateVacuumCone('npc', time);
  }

  private updateVacuumCone(owner: 'player' | 'npc', time: number): void {
    const cone = owner === 'player' ? this.playerVacuumCone : this.npcVacuumCone;
    const until = owner === 'player' ? this.playerVacuumUntil : this.npcVacuumUntil;
    if (time >= until) { cone?.clear(); return; } // window closed — hoard stays armed for the next shot

    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    // Player aims at the cursor; the NPC aims at the player.
    const aimX = owner === 'player' ? this.lastMouseX : this.arena.player.x;
    const aimY = owner === 'player' ? this.lastMouseY : this.arena.player.y;
    const dir = Math.atan2(aimY - caster.y, aimX - caster.x);
    const upgraded = owner === 'player' && this.arena.hasUpgrade('q');
    const radius = upgraded ? BLUNDERBLAST_RADIUS_Q : BLUNDERBLAST_RADIUS;
    const half = upgraded ? BLUNDERBLAST_HALF_ANGLE_Q : BLUNDERBLAST_HALF_ANGLE;

    if (cone) {
      const alpha = 0.14 + 0.06 * Math.sin(time / 110);
      cone.clear();
      cone.fillStyle(BLUNDERBLAST_COLOR, alpha);
      cone.lineStyle(2, BLUNDERBLAST_COLOR, 0.75);
      cone.beginPath();
      cone.moveTo(caster.x, caster.y);
      cone.arc(caster.x, caster.y, radius, dir - half, dir + half, false);
      cone.closePath();
      cone.fillPath();
      cone.strokePath();
    }

    // Swallow the opponent's projectiles that drift into the cone.
    const captured = owner === 'player' ? this.playerCaptured : this.npcCaptured;
    if (captured.length >= BLUNDERBLAST_MAX_CAPTURE) return;
    const wantFromPlayer = owner === 'npc'; // capture the *other* fighter's shots
    for (const obj of this.arena.projectiles.getChildren().slice()) {
      const p = obj as Projectile;
      if (!p.active || p.isHeal || p.isFromPlayer !== wantFromPlayer) continue;
      if (Phaser.Math.Distance.Between(caster.x, caster.y, p.x, p.y) > radius) continue;
      const ang = Math.atan2(p.y - caster.y, p.x - caster.x);
      if (Math.abs(Phaser.Math.Angle.Wrap(ang - dir)) > half) continue;
      captured.push({ textureKey: p.texture.key, damage: p.damage });
      if (owner === 'player') this.arena.recordMasteryStat('bulletsVacuumed', 1);
      this.arena.spawnHitFlash(p.x, p.y, BLUNDERBLAST_COLOR);
      p.destroy();
      if (captured.length >= BLUNDERBLAST_MAX_CAPTURE) break;
    }
  }

  /** On the first shot after the vacuum window closes, cough the whole hoard back out
   *  in a cone toward the aim point, each shot dealing 100% more damage (150% with Q+). */
  private releaseBlunderHoard(tx: number, ty: number, owner: 'player' | 'npc'): boolean {
    const now = this.arena.scene.time.now;
    const until = owner === 'player' ? this.playerVacuumUntil : this.npcVacuumUntil;
    if (now < until) return false; // still vacuuming — not armed yet
    const captured = owner === 'player' ? this.playerCaptured : this.npcCaptured;
    if (captured.length === 0) return false;

    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const upgraded = owner === 'player' && this.arena.hasUpgrade('q');
    const dmgMult = upgraded ? 2.5 : 2;
    const baseAngle = Math.atan2(ty - caster.y, tx - caster.x);
    const n = captured.length;
    const spread = Math.min(BLUNDERBLAST_BLAST_SPREAD, 0.16 * (n - 1)); // fan widens with the hoard, capped at 30°

    for (let i = 0; i < n; i++) {
      const c = captured[i];
      const t = n === 1 ? 0 : i / (n - 1) - 0.5; // -0.5..0.5 across the fan
      const ang = baseAngle + t * spread;
      const dmg = Math.max(1, Math.round(c.damage * dmgMult));
      const proj = new Projectile(this.arena.scene, caster.x, caster.y, c.textureKey, dmg, owner === 'player');
      this.arena.projectiles.add(proj);
      proj.launch(Math.cos(ang) * 820, Math.sin(ang) * 820);
      proj.setRotation(ang);
    }

    if (owner === 'player') this.playerCaptured = [];
    else this.npcCaptured = [];
    this.arena.showFloatingText(caster.x, caster.y - 55, `🌀 BLUNDERBLAST ×${n}`, '#cfd4da');
    return true;
  }

  // ── Weapon firing (used by Fire at Will) ────────────────────────────────────

  private fireWeapon(type: WeaponType, owner: 'player' | 'npc', angle: number): void {
    const { scene } = this.arena;
    switch (type) {
      case 'pistol':
        this.resolveHitscan(owner, angle, 500, 20, 10, 0xcccccc);
        break;
      case 'ar':
        for (let i = 0; i < 3; i++) {
          scene.time.delayedCall(i * 110, () => this.resolveHitscan(owner, angle, 450, 20, 6, 0xddaa66));
        }
        break;
      case 'shotgun': {
        const pelletCount = 10;
        for (let i = 0; i < pelletCount; i++) {
          const off = (-22 + (44 * i) / (pelletCount - 1)) * (Math.PI / 180);
          this.resolveHitscan(owner, angle + off, 160, 12, 2, 0xcc8844);
        }
        break;
      }
      case 'rifle':
        this.resolveHitscan(owner, angle, 700, 35, 15, 0x995522);
        break;
      case 'grenade':
        this.launchGrenade(owner, angle);
        break;
      case 'machinegun':
        for (let i = 0; i < 20; i++) {
          scene.time.delayedCall(i * 18, () => {
            const off = (Math.random() * 20 - 10) * (Math.PI / 180);
            this.resolveHitscan(owner, angle + off, 400, 18, 2, 0xaa6633);
          });
        }
        break;
      case 'flamethrower':
        this.launchFlamethrower(owner, angle);
        break;
      case 'rpg':
        this.launchRocket(owner, angle);
        break;
      case 'minigun': {
        for (let i = 0; i < 30; i++) {
          scene.time.delayedCall(i * 15, () => {
            const off = (Math.random() * 20 - 10) * (Math.PI / 180);
            this.resolveHitscan(owner, angle + off, 400, 18, 2, 0xaa3399);
          });
        }
        const until = scene.time.now + 460;
        if (owner === 'player') this.playerMinigunFiringUntil = Math.max(this.playerMinigunFiringUntil, until);
        else this.npcMinigunFiringUntil = Math.max(this.npcMinigunFiringUntil, until);
        break;
      }
      case 'sniper':
        this.resolveHitscan(owner, angle, 900, 10, 20, 0x66ccff);
        break;
      case 'raygun':
        this.launchRayBullet(owner, angle);
        break;
      case 'freezeray': {
        const hit = this.resolveHitscan(owner, angle, 700, 14, 3, 0x66eeff);
        if (hit) {
          if (owner === 'player') this.npcStunUntil = Math.max(this.npcStunUntil, scene.time.now + 1000);
          else this.playerStunUntil = Math.max(this.playerStunUntil, scene.time.now + 1000);
        }
        break;
      }
      case 'gunblade': {
        const caster = owner === 'player' ? this.arena.player : this.arena.npc;
        const target = owner === 'player' ? this.arena.npc : this.arena.player;
        const dist = Phaser.Math.Distance.Between(caster.x, caster.y, target.x, target.y);
        if (dist <= 100 && target.active && target.hp > 0) {
          const rd = Math.round(15 * target.incomingDamageMultiplier);
          target.takeDamage(rd);
          this.arena.spawnHitFlash(target.x, target.y, 0xdddddd);
          this.maybeExecute(owner, target);
        } else {
          this.resolveHitscan(owner, angle, 700, 12, 10, 0xbbbbbb);
        }
        break;
      }
    }
  }

  private resolveHitscan(
    owner: 'player' | 'npc',
    angle: number,
    range: number,
    halfWidth: number,
    dmg: number,
    color: number,
  ): boolean {
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const target = owner === 'player' ? this.arena.npc : this.arena.player;
    const dx = Math.cos(angle), dy = Math.sin(angle);
    const { scene } = this.arena;

    const gfx = scene.add.graphics().setDepth(9);
    gfx.lineStyle(2, color, 0.85);
    gfx.beginPath();
    gfx.moveTo(caster.x, caster.y);
    gfx.lineTo(caster.x + dx * range, caster.y + dy * range);
    gfx.strokePath();
    scene.tweens.add({ targets: gfx, alpha: 0, duration: 100, onComplete: () => gfx.destroy() });

    if (!target.active || target.hp <= 0) return false;
    const tx = target.x - caster.x, ty = target.y - caster.y;
    const proj = tx * dx + ty * dy;
    if (proj < 0 || proj > range) return false;
    const perpX = tx - dx * proj, perpY = ty - dy * proj;
    if (Math.sqrt(perpX * perpX + perpY * perpY) > halfWidth) return false;

    const rd = Math.round(dmg * target.incomingDamageMultiplier);
    target.takeDamage(rd);
    this.arena.spawnHitFlash(target.x, target.y, color);
    this.maybeExecute(owner, target);
    return true;
  }

  private launchGrenade(owner: 'player' | 'npc', angle: number): void {
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const { scene } = this.arena;
    const speed = 380;
    const sprite = scene.add.circle(caster.x, caster.y, 8, 0x445522, 0.95)
      .setStrokeStyle(2, 0x223311, 1).setDepth(8) as Phaser.GameObjects.Arc;
    this.grenades.push({
      sprite, x: caster.x, y: caster.y,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      explodeAt: scene.time.now + 900, owner,
    });
  }

  private explodeGrenade(g: Grenade): void {
    g.sprite.destroy();
    const { scene } = this.arena;
    const boom = scene.add.circle(g.x, g.y, 10, 0xffaa33, 0.9).setDepth(9);
    scene.tweens.add({ targets: boom, scaleX: 6, scaleY: 6, alpha: 0, duration: 300, onComplete: () => boom.destroy() });
    this.arena.dealAoeDamageFromOwner(g.x, g.y, 60, 25, g.owner);

    const target = g.owner === 'player' ? this.arena.npc : this.arena.player;
    if (target.active && target.hp > 0 && Phaser.Math.Distance.Between(g.x, g.y, target.x, target.y) <= 60) {
      this.maybeExecute(g.owner, target);
    }
  }

  /** F+ RPG: explosive rocket that detonates on proximity to the enemy, or at its max range/lifetime. */
  private launchRocket(owner: 'player' | 'npc', angle: number): void {
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const { scene } = this.arena;
    const speed = 520;
    const sprite = scene.add.circle(caster.x, caster.y, 9, 0xaa3311, 0.95)
      .setStrokeStyle(2, 0x551100, 1).setDepth(8) as Phaser.GameObjects.Arc;
    this.rockets.push({
      sprite, x: caster.x, y: caster.y,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      spawnX: caster.x, spawnY: caster.y, spawnAt: scene.time.now, owner,
    });
  }

  private explodeRocket(r: Rocket): void {
    r.sprite.destroy();
    const { scene } = this.arena;
    const boom = scene.add.circle(r.x, r.y, 14, 0xff6633, 0.9).setDepth(9);
    scene.tweens.add({ targets: boom, scaleX: 6, scaleY: 6, alpha: 0, duration: 320, onComplete: () => boom.destroy() });
    this.arena.dealAoeDamageFromOwner(r.x, r.y, 70, 20, r.owner);
  }

  /** F+ Flamethrower: a barrage of short-lived flame clouds that vanish on their first hit. */
  private launchFlamethrower(owner: 'player' | 'npc', angle: number): void {
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const { scene } = this.arena;
    const now = scene.time.now;
    for (let i = 0; i < 10; i++) {
      const off = (-18 + Math.random() * 36) * (Math.PI / 180);
      const a = angle + off;
      const speed = 150 + Math.random() * 90;
      const sprite = scene.add.circle(caster.x, caster.y, 9, 0xff6622, 0.75)
        .setStrokeStyle(1, 0xffaa33, 0.7).setDepth(8) as Phaser.GameObjects.Arc;
      this.flameClouds.push({
        sprite, x: caster.x, y: caster.y,
        vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
        expiresAt: now + 3000, owner,
      });
    }
  }

  /** F+ Ray-Gun: bounces off arena walls, pierces through the enemy up to 3 total hits. */
  private launchRayBullet(owner: 'player' | 'npc', angle: number): void {
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const { scene } = this.arena;
    const speed = 460;
    const sprite = scene.add.circle(caster.x, caster.y, 7, 0x33ff77, 0.95)
      .setStrokeStyle(2, 0x116622, 1).setDepth(8) as Phaser.GameObjects.Arc;
    this.rayBullets.push({
      sprite, x: caster.x, y: caster.y,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      hits: 0, lastHitAt: 0, spawnAt: scene.time.now, owner,
    });
  }

  /** R+ / Execution Volley: any weapon hit that leaves the enemy at or below 15% HP finishes them off. */
  private maybeExecute(owner: 'player' | 'npc', target: Fighter): void {
    if (owner !== 'player' || !this.arena.hasUpgrade('r')) return;
    if (target.active && target.hp > 0 && target.hp / target.maxHp <= 0.15) {
      target.takeDamage(target.hp);
      this.arena.showFloatingText(target.x, target.y - 40, '☠ EXECUTED', '#ff2222');
    }
  }

  // ── Muskets ──────────────────────────────────────────────────────────────

  private updateMuskets(time: number, delta: number): void {
    for (let i = this.muskets.length - 1; i >= 0; i--) {
      const m = this.muskets[i];

      if (m.flying) {
        m.x += (m.vx! * delta) / 1000;
        m.y += (m.vy! * delta) / 1000;
        m.gfx.setPosition(m.x, m.y);
        m.bayonetGfx?.setPosition(m.x + Math.cos(m.angle!) * 22, m.y + Math.sin(m.angle!) * 22);

        const target = m.owner === 'player' ? this.arena.npc : this.arena.player;
        if (target.active && target.hp > 0 && Phaser.Math.Distance.Between(m.x, m.y, target.x, target.y) <= 24) {
          const rd = Math.round(10 * target.incomingDamageMultiplier);
          target.takeDamage(rd);
          this.arena.spawnHitFlash(target.x, target.y, 0xcccccc);
          m.flying = false;
        }

        if (m.flying && Phaser.Math.Distance.Between(m.x, m.y, m.targetX!, m.targetY!) <= 12) {
          m.flying = false;
        }
        if (m.flying) continue;
      }

      if (!m.cooled) {
        if (time >= m.hotUntil) {
          m.cooled = true;
          m.gfx.setFillStyle(MUSKET_COOL_FILL, 1);
          m.gfx.setStrokeStyle(1, MUSKET_COOL_STROKE, 1);
        } else {
          const progress = (time - m.droppedAt) / (m.hotUntil - m.droppedAt);
          m.gfx.setFillStyle(musketColorAt(progress, MUSKET_HOT_FILL, MUSKET_WARM_FILL, MUSKET_COOL_FILL), 0.95);
          m.gfx.setStrokeStyle(1, musketColorAt(progress, MUSKET_HOT_STROKE, MUSKET_WARM_STROKE, MUSKET_COOL_STROKE), 1);
        }
      }

      // Attached Bayonet: grounded muskets damage anyone who steps over them (1s cooldown).
      if (m.isBayonet) {
        const target = m.owner === 'player' ? this.arena.npc : this.arena.player;
        if (target.active && target.hp > 0 && time >= (m.lastGroundHitAt ?? 0) + 1000
          && Phaser.Math.Distance.Between(m.x, m.y, target.x, target.y) <= 26) {
          const rd = Math.round(10 * target.incomingDamageMultiplier);
          target.takeDamage(rd);
          this.arena.spawnHitFlash(target.x, target.y, 0xaaaaaa);
          m.lastGroundHitAt = time;
        }
      }

      // Overload (mastery): the volley leaves the barrel glowing — its own owner
      // scalds themselves for walking over it, once a second at most.
      if (m.overloadBurnUntil) {
        if (time >= m.overloadBurnUntil) {
          m.overloadBurnUntil = 0;
        } else {
          const ownerFighter = m.owner === 'player' ? this.arena.player : this.arena.npc;
          if (ownerFighter.active && ownerFighter.hp > 0
            && time >= (m.lastOwnerBurnAt ?? 0) + OVERLOAD_BURN_INTERVAL_MS
            && Phaser.Math.Distance.Between(m.x, m.y, ownerFighter.x, ownerFighter.y) <= OVERLOAD_BURN_RADIUS) {
            ownerFighter.takeDamage(OVERLOAD_BURN_DAMAGE);
            this.arena.spawnHitFlash(ownerFighter.x, ownerFighter.y, 0xff5522);
            this.arena.showFloatingText(m.x, m.y - 22, '🔥 SCALDING', '#ff7733');
            m.lastOwnerBurnAt = time;
          }
        }
      }

      if (!m.cooled) continue;

      const caster = m.owner === 'player' ? this.arena.player : this.arena.npc;
      const ammo = m.owner === 'player' ? this.playerAmmo : this.npcAmmo;
      if (ammo >= MUSKET_MAX_AMMO) continue;

      const d = Phaser.Math.Distance.Between(caster.x, caster.y, m.x, m.y);
      if (d <= 30) {
        if (m.owner === 'player') { this.playerAmmo++; this.rebuildArsenalHud(); }
        else this.npcAmmo++;
        this.arena.showFloatingText(m.x, m.y - 20, '+1 🔫', '#dd9944');
        m.gfx.destroy();
        m.bayonetGfx?.destroy();
        this.muskets.splice(i, 1);
      }
    }
  }

  // ── Grenades ─────────────────────────────────────────────────────────────

  private updateGrenades(time: number, delta: number): void {
    for (let i = this.grenades.length - 1; i >= 0; i--) {
      const g = this.grenades[i];
      g.x += (g.vx * delta) / 1000;
      g.y += (g.vy * delta) / 1000;
      g.sprite.setPosition(g.x, g.y);
      if (time >= g.explodeAt) {
        this.explodeGrenade(g);
        this.grenades.splice(i, 1);
      }
    }
  }

  // ── Rockets (RPG) ────────────────────────────────────────────────────────

  private updateRockets(time: number, delta: number): void {
    const wb = this.arena.scene.physics.world.bounds;
    for (let i = this.rockets.length - 1; i >= 0; i--) {
      const r = this.rockets[i];
      r.x += (r.vx * delta) / 1000;
      r.y += (r.vy * delta) / 1000;
      r.sprite.setPosition(r.x, r.y);

      const target = r.owner === 'player' ? this.arena.npc : this.arena.player;
      const hitTarget = target.active && target.hp > 0 && Phaser.Math.Distance.Between(r.x, r.y, target.x, target.y) <= 30;
      const traveled = Phaser.Math.Distance.Between(r.spawnX, r.spawnY, r.x, r.y);
      const outOfBounds = r.x < wb.x || r.x > wb.x + wb.width || r.y < wb.y || r.y > wb.y + wb.height;

      if (hitTarget) { this.explodeRocket(r); this.rockets.splice(i, 1); continue; }
      if (traveled > 620 || time - r.spawnAt > 1600 || outOfBounds) {
        this.explodeRocket(r);
        this.rockets.splice(i, 1);
      }
    }
  }

  // ── Flame clouds (Flamethrower) ──────────────────────────────────────────

  private updateFlameClouds(time: number, delta: number): void {
    for (let i = this.flameClouds.length - 1; i >= 0; i--) {
      const c = this.flameClouds[i];
      c.x += (c.vx * delta) / 1000;
      c.y += (c.vy * delta) / 1000;
      c.sprite.setPosition(c.x, c.y);

      const target = c.owner === 'player' ? this.arena.npc : this.arena.player;
      const hit = target.active && target.hp > 0 && Phaser.Math.Distance.Between(c.x, c.y, target.x, target.y) <= 20;
      if (hit) {
        const rd = Math.round(3 * target.incomingDamageMultiplier);
        target.takeDamage(rd);
        this.arena.spawnHitFlash(target.x, target.y, 0xff6622);
      }
      if (hit || time >= c.expiresAt) {
        c.sprite.destroy();
        this.flameClouds.splice(i, 1);
      }
    }
  }

  // ── Ray bullets (Ray-Gun) ────────────────────────────────────────────────

  private updateRayBullets(time: number, delta: number): void {
    const wb = this.arena.scene.physics.world.bounds;
    for (let i = this.rayBullets.length - 1; i >= 0; i--) {
      const b = this.rayBullets[i];
      b.x += (b.vx * delta) / 1000;
      b.y += (b.vy * delta) / 1000;

      if (b.x < wb.x) { b.x = wb.x; b.vx *= -1; }
      else if (b.x > wb.x + wb.width) { b.x = wb.x + wb.width; b.vx *= -1; }
      if (b.y < wb.y) { b.y = wb.y; b.vy *= -1; }
      else if (b.y > wb.y + wb.height) { b.y = wb.y + wb.height; b.vy *= -1; }
      b.sprite.setPosition(b.x, b.y);

      const target = b.owner === 'player' ? this.arena.npc : this.arena.player;
      if (target.active && target.hp > 0 && time >= b.lastHitAt + 350
        && Phaser.Math.Distance.Between(b.x, b.y, target.x, target.y) <= 20) {
        const rd = Math.round(5 * target.incomingDamageMultiplier);
        target.takeDamage(rd);
        this.arena.spawnHitFlash(target.x, target.y, 0x33ff77);
        (target.body as Phaser.Physics.Arcade.Body).setVelocity(b.vx * 0.5, b.vy * 0.5);
        b.hits++;
        b.lastHitAt = time;
      }

      if (b.hits >= 3 || time - b.spawnAt > 5000) {
        b.sprite.destroy();
        this.rayBullets.splice(i, 1);
      }
    }
  }

  // ── Arsenal picker menu (F) ──────────────────────────────────────────────

  private openArsenalMenu(): void {
    if (this.menuOpen) return;
    const pool = this.arena.hasUpgrade('f') ? [...BASE_WEAPON_TYPES, ...EXTRA_WEAPON_TYPES] : BASE_WEAPON_TYPES;
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    this.menuOffered = shuffled.slice(0, 3);

    const { scene } = this.arena;
    const W = scene.scale.width;
    const panelW = 260, rowH = 46, panelH = this.menuOffered.length * rowH + 16;
    const px = (W - panelW) / 2, py = 110;

    this.menuGfx = scene.add.graphics().setDepth(48).setScrollFactor(0);
    this.menuGfx.fillStyle(0x1a1208, 0.94);
    this.menuGfx.fillRect(px, py, panelW, panelH);
    this.menuGfx.lineStyle(2, 0xdd9944, 1);
    this.menuGfx.strokeRect(px, py, panelW, panelH);

    this.menuLabels = [];
    this.menuBtnAreas = [];
    this.menuOffered.forEach((type, i) => {
      const def = WEAPON_DEFS[type];
      const ry = py + 8 + i * rowH;
      const label = scene.add.text(px + 12, ry + rowH / 2 - 8, `${def.emoji} ${def.name}`, {
        fontSize: '15px', fontFamily: 'Arial', color: '#ffddaa', stroke: '#000000', strokeThickness: 2,
      }).setOrigin(0, 0.5).setDepth(49).setScrollFactor(0);
      const desc = scene.add.text(px + 12, ry + rowH / 2 + 10, def.desc, {
        fontSize: '10px', fontFamily: 'Arial', color: '#aaaaaa',
      }).setOrigin(0, 0.5).setDepth(49).setScrollFactor(0);
      this.menuLabels.push(label, desc);
      this.menuBtnAreas.push({ x: px, y: ry, w: panelW, h: rowH, type });
    });

    this.menuOpen = true;
  }

  private closeArsenalMenu(): void {
    this.menuGfx?.destroy(); this.menuGfx = null;
    for (const l of this.menuLabels) l.destroy();
    this.menuLabels = [];
    this.menuBtnAreas = [];
    this.menuOpen = false;
  }

  private handleMenuClick(px: number, py: number): void {
    for (const btn of this.menuBtnAreas) {
      if (px >= btn.x && px <= btn.x + btn.w && py >= btn.y && py <= btn.y + btn.h) {
        this.commitArsenalPick(btn.type);
        return;
      }
    }
  }

  private autoPickArsenalMenu(): void {
    if (!this.menuOpen || this.menuBtnAreas.length === 0) return;
    const btn = this.menuBtnAreas[Math.floor(Math.random() * this.menuBtnAreas.length)];
    this.commitArsenalPick(btn.type);
  }

  private commitArsenalPick(type: WeaponType): void {
    this.playerArsenal.push({ type });
    this.noteWeaponCollected(type);
    if (this.playerArsenal.length >= ARSENAL_MAX_R_UPGRADED) this.arena.recordMasteryStat('fullArsenals', 1);
    this.closeArsenalMenu();
    this.arena.player.triggerCooldown('gunpowder-arsenal-expansion');
    this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 30, `+${WEAPON_DEFS[type].name}`, '#ffaa44');
    this.rebuildArsenalHud();
  }

  private tryRemoveArsenalWeapon(px: number, py: number): void {
    for (const area of this.arsenalHudAreas) {
      if (px >= area.x && px <= area.x + area.w && py >= area.y && py <= area.y + area.h) {
        if (area.idx < this.playerArsenal.length) {
          const slot = this.playerArsenal[area.idx];
          if (this.arena.hasUpgrade('r')) {
            if (!slot.pendingRemoval) {
              slot.pendingRemoval = true;
              this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 30, `${WEAPON_DEFS[slot.type].name} misfiring...`, '#ffaa66');
              this.rebuildArsenalHud();
            }
          } else {
            const removed = this.playerArsenal.splice(area.idx, 1)[0];
            this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 30, `-${WEAPON_DEFS[removed.type].name}`, '#ff8866');
            this.rebuildArsenalHud();
          }
        }
        return;
      }
    }
  }

  // ── Arsenal / ammo HUD ───────────────────────────────────────────────────

  initArsenalHud(cx: number): void {
    this.arsenalHudCx = cx;
    this.rebuildArsenalHud();
  }

  private destroyArsenalHud(): void {
    for (const t of this.arsenalHudTexts) t.destroy();
    this.arsenalHudTexts = [];
    for (const b of this.arsenalHudBgs) b.destroy();
    this.arsenalHudBgs = [];
    this.arsenalHudAreas = [];
  }

  private rebuildArsenalHud(): void {
    this.destroyArsenalHud();
    const { scene } = this.arena;
    const maxSlots = this.arena.hasUpgrade('r') ? ARSENAL_MAX_R_UPGRADED : ARSENAL_MAX;
    const slotSize = 32, gap = 6;
    const totalW = maxSlots * slotSize + (maxSlots - 1) * gap;
    const startX = this.arsenalHudCx - totalW / 2;
    const y = 74;

    for (let i = 0; i < maxSlots; i++) {
      const x = startX + i * (slotSize + gap);
      const slot = this.playerArsenal[i];
      const flagged = !!(slot && (slot.pendingRemoval || slot.skipFire));
      const bgFill = slot ? (flagged ? 0x3a1a12 : 0x2a1e10) : 0x14100a;
      const bgStroke = slot ? (flagged ? 0xdd5533 : 0xdd9944) : 0x554433;
      const bg = scene.add.rectangle(x + slotSize / 2, y, slotSize, slotSize, bgFill, 0.9)
        .setStrokeStyle(1.5, bgStroke, 0.9).setDepth(20).setScrollFactor(0);
      this.arsenalHudBgs.push(bg);
      if (slot) {
        const icon = scene.add.text(x + slotSize / 2, y, WEAPON_DEFS[slot.type].emoji, { fontSize: '18px' })
          .setOrigin(0.5).setDepth(21).setScrollFactor(0);
        this.arsenalHudTexts.push(icon);
      }
      this.arsenalHudAreas.push({ x, y: y - slotSize / 2, w: slotSize, h: slotSize, idx: i });
    }

    const ammoText = scene.add.text(this.arsenalHudCx, y - 22, `🔫 ${this.playerAmmo}/${MUSKET_MAX_AMMO}`, {
      fontSize: '13px', fontFamily: '"Arial Black", sans-serif', color: '#dd9944', stroke: '#220044', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(21).setScrollFactor(0);
    this.arsenalHudTexts.push(ammoText);
  }

  // ── Mastery requirement tracking ─────────────────────────────────────────

  /** ArenaScene's projectile-hit choke point — counts Musket Shot balls that connect. */
  onPlayerProjectileHit(proj: Projectile): void {
    if ((proj as unknown as { isMusketShot?: boolean }).isMusketShot) {
      this.arena.recordMasteryStat('musketHits', 1);
    }
  }

  /**
   * "Collect every weapon type at least once" is a set, not a counter, so each type
   * gets its own persisted flag and the requirement key is re-derived as their sum —
   * monotonic, so it rides the existing best-value ratchet.
   */
  private noteWeaponCollected(type: WeaponType): void {
    this.arena.recordMasteryBestStat(`gpWeapon_${type}`, 1);
    let owned = 0;
    for (const t of [...BASE_WEAPON_TYPES, ...EXTRA_WEAPON_TYPES]) {
      if (this.arena.getMasteryStat(`gpWeapon_${t}`) > 0) owned++;
    }
    this.arena.recordMasteryBestStat('weaponTypes', owned);
  }

  // ── Mastery: Quickdraw (passive) ─────────────────────────────────────────

  private updateQuickdraw(time: number): void {
    this.tickQuickdraw('player', this.arena.masteryActive, time);
    // Online only: the remote gunpowder player's own reflex shots must resolve on this
    // (victim) sim, since hits on their replica never touch their real HP.
    this.tickQuickdraw('npc', this.arena.npcMasteryActive && this.arena.npcElementId === 'gunpowder', time);
  }

  private tickQuickdraw(owner: 'player' | 'npc', enabled: boolean, time: number): void {
    const self = owner === 'player' ? this.arena.player : this.arena.npc;
    const prev = owner === 'player' ? this.playerLastHp : this.npcLastHp;
    const hp = self.hp;

    // Track HP every frame regardless, so switching the passive on mid-match can't
    // cash in damage taken before it was live.
    if (enabled && prev >= 0 && hp < prev && self.active && hp > 0) {
      let accum = (owner === 'player' ? this.playerQuickdrawAccum : this.npcQuickdrawAccum) + (prev - hp);
      while (accum >= QUICKDRAW_DAMAGE_STEP) {
        accum -= QUICKDRAW_DAMAGE_STEP;
        this.fireQuickdrawShot(owner);
      }
      if (owner === 'player') this.playerQuickdrawAccum = accum;
      else this.npcQuickdrawAccum = accum;
    }

    if (owner === 'player') this.playerLastHp = hp;
    else this.npcLastHp = hp;
  }

  /** A holdout pistol snapped from the hip: thin gold hitscan beam, no wind-up. */
  private fireQuickdrawShot(owner: 'player' | 'npc'): void {
    const shooter = owner === 'player' ? this.arena.player : this.arena.npc;
    const target = owner === 'player' ? this.arena.npc : this.arena.player;
    if (!shooter.active || !target.active || target.hp <= 0) return;

    const dx = target.x - shooter.x, dy = target.y - shooter.y;
    const dist = Math.hypot(dx, dy);
    if (dist > QUICKDRAW_RANGE) return;
    const angle = Math.atan2(dy, dx);
    const { scene } = this.arena;

    // Fire from the hip: offset perpendicular to the shooting line so the beam
    // reads as a second, hidden gun rather than the musket.
    const hipX = shooter.x + Math.cos(angle + Math.PI / 2) * 12;
    const hipY = shooter.y + Math.sin(angle + Math.PI / 2) * 12;

    const beam = scene.add.graphics().setDepth(10);
    beam.lineStyle(5, QUICKDRAW_COLOR, 0.18);
    beam.lineBetween(hipX, hipY, target.x, target.y);
    beam.lineStyle(2, QUICKDRAW_COLOR, 0.6);
    beam.lineBetween(hipX, hipY, target.x, target.y);
    beam.lineStyle(1, 0xffffff, 0.95);
    beam.lineBetween(hipX, hipY, target.x, target.y);
    scene.tweens.add({ targets: beam, alpha: 0, duration: 160, onComplete: () => beam.destroy() });

    // Muzzle flare — a stubby cone kicking out of the hip.
    const flare = scene.add.triangle(hipX, hipY, 0, -5, 0, 5, 16, 0, 0xfff3c4, 0.95)
      .setDepth(11).setRotation(angle);
    scene.tweens.add({
      targets: flare, scaleX: 1.8, scaleY: 0.5, alpha: 0, duration: 130,
      onComplete: () => flare.destroy(),
    });

    // Impact sparks fanning back along the beam.
    for (let i = 0; i < 4; i++) {
      const a = angle + Math.PI + (Math.random() - 0.5) * 1.6;
      const spark = scene.add.rectangle(target.x, target.y, 6, 1.5, QUICKDRAW_COLOR, 0.9)
        .setDepth(11).setRotation(a);
      scene.tweens.add({
        targets: spark, x: target.x + Math.cos(a) * (14 + Math.random() * 12),
        y: target.y + Math.sin(a) * (14 + Math.random() * 12), alpha: 0,
        duration: 200 + Math.random() * 120, onComplete: () => spark.destroy(),
      });
    }

    target.takeDamage(QUICKDRAW_DAMAGE);
    this.arena.spawnHitFlash(target.x, target.y, QUICKDRAW_COLOR);
    this.arena.showFloatingText(shooter.x, shooter.y - 46, '⚡ QUICKDRAW', '#ffe08a');
  }

  // ── Mastery: Overload (bindable) ─────────────────────────────────────────

  /** The slot Overload is bound over this match, or null when it isn't bound anywhere. */
  private overloadSlot(): 'e' | 'r' | 'f' | 'q' | null {
    for (const s of ['e', 'r', 'f', 'q'] as const) {
      if (this.arena.masteryBindFor(s) === 'overload') return s;
    }
    return null;
  }

  /** 0 = just cast, 1 = ready. Drives the HUD bar when Overload is bound to a slot. */
  getOverloadCooldownRatio(time: number): number {
    return Math.min(1, (time - this.overloadLastCastAt) / OVERLOAD_COOLDOWN_MS);
  }

  private tryCastOverload(): void {
    const time = this.arena.scene.time.now;
    if (time - this.overloadLastCastAt < OVERLOAD_COOLDOWN_MS) return;
    if (!this.beginOverload('player')) {
      const p = this.arena.player;
      this.arena.showFloatingText(p.x, p.y - 30, '⚠ No Muskets Down', '#ff6644');
      return; // nothing to aim — the cooldown isn't spent
    }
    this.overloadLastCastAt = time;
    // Private timer, so this cast never flows through onCastStamp — broadcast it by hand.
    this.arena.broadcastMasteryCast('overload');
  }

  /** Online replay: the remote gunpowder player overloaded their muskets at us. */
  doNpcOverload(): void {
    this.beginOverload('npc');
  }

  private beginOverload(owner: 'player' | 'npc'): boolean {
    const { scene } = this.arena;
    const now = scene.time.now;
    const grounded = this.muskets.filter((m) => m.owner === owner && !m.flying);
    if (grounded.length === 0) return false;

    const firesAt = now + OVERLOAD_AIM_MS;
    for (const m of grounded) m.aimingFor = firesAt;
    this.overloadVolleys.push({ owner, startedAt: now, firesAt });
    // Above the fighters (depth 5) so the laser sight and crosshair aren't buried
    // under the sprite they're aimed at.
    if (!this.overloadGfx) this.overloadGfx = scene.add.graphics().setDepth(9);

    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    this.arena.showFloatingText(caster.x, caster.y - 44, `🔫 OVERLOAD ×${grounded.length}`, '#dddddd');
    return true;
  }

  private updateOverload(time: number): void {
    if (this.overloadGfx) this.overloadGfx.clear();
    this.drawOverloadEmbers(time);
    if (this.overloadVolleys.length === 0) return;

    for (let i = this.overloadVolleys.length - 1; i >= 0; i--) {
      const v = this.overloadVolleys[i];
      const aiming = this.muskets.filter((m) => m.owner === v.owner && m.aimingFor === v.firesAt);
      if (aiming.length === 0) { this.overloadVolleys.splice(i, 1); continue; }

      const target = v.owner === 'player' ? this.arena.npc : this.arena.player;
      if (time < v.firesAt) {
        const t = Phaser.Math.Clamp((time - v.startedAt) / OVERLOAD_AIM_MS, 0, 1);
        for (const m of aiming) this.drawOverloadAim(m, target, t, time);
        continue;
      }

      for (const m of aiming) this.fireOverloadShot(m, target, time);
      this.arena.scene.cameras.main.shake(200, 0.005);
      this.overloadVolleys.splice(i, 1);
    }
  }

  /**
   * A musket lining up its shot: the barrel swings onto the target and trembles harder
   * as the hammer pulls back, a laser sight burns in from faint to solid, and the
   * crosshair over the target draws tighter the closer the volley gets.
   */
  private drawOverloadAim(m: DroppedMusket, target: Fighter, t: number, time: number): void {
    const gfx = this.overloadGfx;
    const angle = Math.atan2(target.y - m.y, target.x - m.x);
    const shake = 0.05 * t * Math.sin(time / 22 + m.droppedAt);
    m.gfx.setRotation(angle + shake);
    m.gfx.setPosition(m.x + Math.cos(time / 26) * 1.5 * t, m.y + Math.sin(time / 19) * 1.5 * t);
    m.gfx.setFillStyle(lerpColor(MUSKET_COOL_FILL, MUSKET_HOT_FILL, t), 0.95);
    m.gfx.setStrokeStyle(1, lerpColor(MUSKET_COOL_STROKE, MUSKET_HOT_STROKE, t), 1);
    if (!gfx) return;

    const muzzleX = m.x + Math.cos(angle) * 22;
    const muzzleY = m.y + Math.sin(angle) * 22;

    // Laser sight: wide haze, body, hot core — each tighter and brighter than the last.
    gfx.lineStyle(6, OVERLOAD_LASER_COLOR, 0.06 + 0.10 * t);
    gfx.lineBetween(muzzleX, muzzleY, target.x, target.y);
    gfx.lineStyle(2, OVERLOAD_LASER_COLOR, 0.18 + 0.35 * t);
    gfx.lineBetween(muzzleX, muzzleY, target.x, target.y);
    gfx.lineStyle(1, 0xffaa88, 0.25 + 0.6 * t);
    gfx.lineBetween(muzzleX, muzzleY, target.x, target.y);

    // Heat blooming out of the breech as the charge builds.
    gfx.fillStyle(0xff4422, 0.10 + 0.22 * t);
    gfx.fillCircle(m.x, m.y, 6 + 7 * t + Math.sin(time / 90) * 1.5);

    // Converging crosshair over the target — four ticks closing in, rotating slowly.
    // Stays wider than the sprite it sits on so the tightening still reads.
    const ring = 46 - 20 * t;
    const spin = time / 400;
    gfx.lineStyle(1.5, OVERLOAD_LASER_COLOR, 0.35 + 0.5 * t);
    for (let k = 0; k < 4; k++) {
      const a = spin + (k * Math.PI) / 2;
      gfx.lineBetween(
        target.x + Math.cos(a) * ring, target.y + Math.sin(a) * ring,
        target.x + Math.cos(a) * (ring + 8), target.y + Math.sin(a) * (ring + 8),
      );
    }
    gfx.strokeCircle(target.x, target.y, ring);
  }

  /** The volley itself: one musket ball each, then the barrel is left glowing. */
  private fireOverloadShot(m: DroppedMusket, target: Fighter, time: number): void {
    const { scene } = this.arena;
    m.aimingFor = 0;

    const angle = Math.atan2(target.y - m.y, target.x - m.x);
    const nx = Math.cos(angle), ny = Math.sin(angle);
    const isPlayer = m.owner === 'player';

    const proj = new Projectile(scene, m.x + nx * 20, m.y + ny * 20, 'proj-gunpowder-musket', OVERLOAD_SHOT_DAMAGE, isPlayer);
    (proj as unknown as { isMusketShot?: boolean }).isMusketShot = true;
    this.arena.projectiles.add(proj);
    proj.launch(nx * 900, ny * 900);
    proj.setRotation(angle);

    // Muzzle blast: a bright cone that stretches and dies in a few frames.
    const flash = scene.add.triangle(m.x + nx * 22, m.y + ny * 22, 0, -8, 0, 8, 26, 0, 0xffddaa, 1)
      .setDepth(11).setRotation(angle);
    scene.tweens.add({
      targets: flash, scaleX: 2.2, scaleY: 0.4, alpha: 0, duration: 170,
      onComplete: () => flash.destroy(),
    });
    const shock = scene.add.circle(m.x + nx * 22, m.y + ny * 22, 7, 0xffbb66, 0.55).setDepth(10);
    scene.tweens.add({
      targets: shock, scaleX: 3.4, scaleY: 3.4, alpha: 0, duration: 260,
      onComplete: () => shock.destroy(),
    });

    // Powder smoke rolling off the barrel.
    for (let i = 0; i < 4; i++) {
      const a = angle + (Math.random() - 0.5) * 1.1;
      const puff = scene.add.circle(m.x + nx * 18, m.y + ny * 18, 4 + Math.random() * 4, 0x9a9a9a, 0.45).setDepth(9);
      scene.tweens.add({
        targets: puff, x: puff.x + Math.cos(a) * (26 + Math.random() * 22),
        y: puff.y + Math.sin(a) * (26 + Math.random() * 22),
        scaleX: 2.2, scaleY: 2.2, alpha: 0, duration: 620 + Math.random() * 260,
        onComplete: () => puff.destroy(),
      });
    }

    // Recoil kick, then settle back onto the musket's real position.
    m.gfx.setPosition(m.x - nx * 10, m.y - ny * 10);
    scene.tweens.add({ targets: m.gfx, x: m.x, y: m.y, duration: 220, ease: 'Back.easeOut' });

    // Straight back to full heat, plus the Overload surcharge on top.
    const hotMs = 12000 * (isPlayer ? this.musketCoolMult() : 1) + OVERLOAD_EXTRA_HEAT_MS;
    m.droppedAt = time;
    m.hotUntil = time + hotMs;
    m.cooled = false;
    m.overloadBurnUntil = m.hotUntil;
    m.lastOwnerBurnAt = 0;
  }

  /** Overloaded muskets sit on the floor radiating heat until they finally cool. */
  private drawOverloadEmbers(time: number): void {
    const gfx = this.overloadGfx;
    if (!gfx) return;
    for (const m of this.muskets) {
      if (!m.overloadBurnUntil || time >= m.overloadBurnUntil || m.flying) continue;
      const pulse = 0.5 + 0.5 * Math.sin(time / 160 + m.droppedAt);
      gfx.fillStyle(0xff4411, 0.05 + 0.07 * pulse);
      gfx.fillCircle(m.x, m.y, OVERLOAD_BURN_RADIUS);
      gfx.fillStyle(0xff7722, 0.10 + 0.10 * pulse);
      gfx.fillCircle(m.x, m.y, 15);
      // Embers drifting up off the barrel.
      for (let k = 0; k < 3; k++) {
        const phase = (time / 900 + k / 3 + m.droppedAt / 5000) % 1;
        const ex = m.x + Math.sin(time / 220 + k * 2.1) * 9;
        const ey = m.y - phase * 22;
        gfx.fillStyle(0xffcc55, (1 - phase) * 0.75);
        gfx.fillCircle(ex, ey, 1.6);
      }
    }
  }
}
