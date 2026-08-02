import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import { Projectile } from '../../combat/Projectile';
import {
  MAGNET, MagnetAura, MagnetAvatar, MagnetColorFn, MagnetFx, RodKind, rodColor,
} from './MagnetVisuals';

// ── Magnet type definitions ────────────────────────────────────────────────
//
// Every world object here is plain data painted into the kit's own Graphics layers — nothing
// owns a sprite, so a rod can smear, an orb can dent and a compactor can wear hazard stripes.

export interface MagnetRod {
  x: number;
  y: number;
  vx: number;
  vy: number;
  contactCooldownPlayer: number;
  contactCooldownNpc: number;
  bouncing: boolean;
  bounceUntil: number;
  owner: 'player' | 'npc';
  destroyOnHit?: boolean;
  permDamageBonus: number;
  isSword?: boolean;
  /** What it is made of — drives its colour and hatching. Defaults to plain steel. */
  kind?: RodKind;
  /**
   * Electromagnet (divine perk): `scene.time.now` stamp until which this rod is live —
   * `Infinity` once the Smasher is enhanced. A charged rod arcs into anyone standing near it
   * and stuns whatever it hits, instead of being flung across the arena.
   */
  chargedUntil?: number;
  /** Next time this charged rod may arc. Rods zap on their own clock, not in unison. */
  nextZapAt?: number;
}

export interface MagnetNail {
  vx: number;
  vy: number;
  x: number;
  y: number;
  inEnemy: boolean;
  implantedUntil: number;
  owner: 'player' | 'npc';
  /** Gold for the E+ triple shot, plain iron otherwise. */
  color: number;
}

export interface MagnetShieldOrb {
  angle: number;
  hp: number;
}

export interface MagnetAtomSmasher {
  x: number;
  y: number;
  fireAt: number;
  walls: Array<{ x: number; vx: number; vy: number; active: boolean; hitCooldown: number }>;
  exploded: boolean;
  crossed: boolean;
  owner: 'player' | 'npc';
}

/** Half-height of a compactor plate — its reach, and how tall it is drawn. */
const COMPACTOR_WALL_HALF_H = 80;

// ── Arena API interface ────────────────────────────────────────────────────

export interface MagnetArenaApi {
  readonly player: Fighter;
  readonly npc: Fighter;
  readonly scene: Phaser.Scene;
  readonly projectiles: Phaser.Physics.Arcade.Group;
  readonly eKey: Phaser.Input.Keyboard.Key;
  readonly fKey: Phaser.Input.Keyboard.Key;
  readonly rKey: Phaser.Input.Keyboard.Key;
  readonly qKey: Phaser.Input.Keyboard.Key;
  readonly pointerWasDown: boolean;
  readonly rightPointerWasDown: boolean;
  hasUpgrade(slot: string): boolean;
  hasPerk(owner: 'player' | 'npc', perkId: string): boolean;
  setIsDodging(v: boolean): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  buildPlayerContext(x: number, y: number): CastContext;
  buildNpcContext(x: number, y: number): CastContext;
  /** `(owner, base) => displayed` — the owner's skin, or the identity. */
  magnetColor(owner: 'player' | 'npc', base: number): number;
  /** True only when the player is magnet AND Magnet Mastery is switched on. */
  get masteryActive(): boolean;
  /** True only when the online opponent is magnet AND has Magnet Mastery on. */
  get npcMasteryActive(): boolean;
  masteryBindFor(slot: string): string | null;
  recordMasteryStat(key: string, amount: number): void;
}

// ── Electromagnet (divine perk) ───────────────────────────────────────────────
/** How long a compacted rod stays live — with the Smasher enhanced, forever instead. */
const ELECTROMAGNET_CHARGE_MS = 10000;
const ELECTROMAGNET_ZAP_RANGE = 96;
const ELECTROMAGNET_ZAP_DAMAGE = 6;
const ELECTROMAGNET_ZAP_GAP_MS = 700;
const ELECTROMAGNET_STUN_MS = 500;

// ── Mastery: Metal Detector passive + Mag-Lev bindable ────────────────────────
const ANCIENT_ROD_COUNT = 2;
const ANCIENT_EXPOSE_RADIUS = 62;      // a pulse within this of a hidden rod exposes it
const ANCIENT_LASER_INTERVAL_MS = 3000;
const ANCIENT_LASER_DAMAGE = 5;
const ANCIENT_ACTIVATE_Y_BAND = 100;   // atom-smasher wall must sweep within this of the rod
const MAGLEV_SHIELD = 50;
const MAGLEV_BASH_DMG = 15;
const MAGLEV_BASH_RADIUS = 36;
const MAGLEV_BASH_CD_MS = 400;
const MAGLEV_SLING_SPEED = 950;
const MAGLEV_COOLDOWN_MS = 6000;       // gate on re-mounting; dismount is always allowed

interface AncientRod {
  hx: number;            // hidden position
  hy: number;
  exposed: boolean;
  activated: boolean;
  laserAccum: number;
  rod: MagnetRod | null; // the live rod once exposed
}

// ── MagnetKit ─────────────────────────────────────────────────────────────

export class MagnetKit {
  // ── Visuals ────────────────────────────────────────────────────────────
  /** Colour mappers + effect painters, one per owner so a skin recolours one side. */
  private readonly pcol: MagnetColorFn;
  private readonly ncol: MagnetColorFn;
  private readonly pfx: MagnetFx;
  private readonly nfx: MagnetFx;
  /** The polarised rig (north hand, south hand, horseshoe crown) for each magnet fighter. */
  private playerAvatar: MagnetAvatar | null = null;
  private npcAvatar: MagnetAvatar | null = null;
  /** Field tells, per side where both can carry one. */
  private playerMagnetizedAura: MagnetAura | null = null;
  private npcMagnetizedAura: MagnetAura | null = null;
  private playerProtectAura: MagnetAura | null = null;
  private npcProtectAura: MagnetAura | null = null;
  private playerMagLevAura: MagnetAura | null = null;
  private npcMagLevAura: MagnetAura | null = null;
  private playerReflectAura: MagnetAura | null = null;
  private npcReflectAura: MagnetAura | null = null;
  /**
   * Two layers, because these objects are not all in the same place. Rods, buried finds and the
   * hoverboard lie on the floor and pass *under* the fighters; nails, bearings and the compactor
   * plates are in the air and must pass over.
   */
  private groundGfx: Phaser.GameObjects.Graphics | null = null;
  private airGfx: Phaser.GameObjects.Graphics | null = null;
  /** Shared animation clock for every per-frame painter in this kit. */
  private vizT = 0;
  /** Last cursor position, cached in handleInput — `update` has no pointer to face. */
  private lastAimX = 0;
  private lastAimY = 0;

  private magnetRods: MagnetRod[] = [];
  /** Electromagnet: fighters a charged rod has locked up, and when each lock lapses. */
  private electroStunned = new Map<Fighter, number>();
  private magnetPlayerNail: MagnetNail | null = null;
  private magnetNpcNail: MagnetNail | null = null;
  private magnetPlayerShieldOrbs: MagnetShieldOrb[] = [];
  private magnetNpcShieldOrbs: MagnetShieldOrb[] = [];
  private magnetPlayerAtomSmasher: MagnetAtomSmasher | null = null;
  private magnetNpcAtomSmasher: MagnetAtomSmasher | null = null;
  private magnetPlayerMagnetized = false;
  private magnetPlayerMagnetizedUntil = 0;
  private magnetNpcMagnetized = false;
  private magnetNpcMagnetizedUntil = 0;
  private magnetPlayerSpeedBuffUntil = 0;
  private magnetNpcSpeedBuffUntil = 0;
  private magnetOrbOrbitAngle = 0;
  private magnetNpcOrbOrbitAngle = 0;
  private magnetNailPullUntil = 0;
  private magnetNailPullVX = 0;
  private magnetNailPullVY = 0;
  // Upgrade state
  private magnetPlayerNails: MagnetNail[] = [];
  private magnetNpcNails: MagnetNail[] = [];
  private magnetPlayerPullStacks = 0;
  private magnetNpcPullStacks = 0;
  private magnetCopperSpawnAccumPlayer = 0;
  private magnetCopperSpawnAccumNpc = 0;
  private magnetReflectUntilPlayer = 0;
  private magnetReflectCenterPlayerX = 0;
  private magnetReflectCenterPlayerY = 0;
  private magnetReflectUntilNpc = 0;
  private magnetReflectCenterNpcX = 0;
  private magnetReflectCenterNpcY = 0;

  // ── Mastery: Metal Detector (ancient rods) + Mag-Lev ──────────────────
  private ancientRods: AncientRod[] = [];
  private ancientRodsInit = false;
  private magLevMounted = false;
  private magLevPreShield = 0;
  private magLevBashCd: Map<Fighter, number> = new Map();
  private magLevLastMountAt = -MAGLEV_COOLDOWN_MS;
  private npcMagLevMounted = false;
  private npcMagLevPreShield = 0;
  private npcMagLevBashCd: Map<Fighter, number> = new Map();

  constructor(private arena: MagnetArenaApi) {
    // Built here, not as field initialisers, so they see the injected arena.
    this.pcol = (base) => arena.magnetColor('player', base);
    this.ncol = (base) => arena.magnetColor('npc', base);
    this.pfx = new MagnetFx(arena.scene, this.pcol);
    this.nfx = new MagnetFx(arena.scene, this.ncol);
  }

  // ── Visual helpers ─────────────────────────────────────────────────────

  /** Effect painter for a side. */
  private fx(owner: 'player' | 'npc'): MagnetFx { return owner === 'player' ? this.pfx : this.nfx; }
  /** Colour mapper for a side. */
  private col(owner: 'player' | 'npc'): MagnetColorFn { return owner === 'player' ? this.pcol : this.ncol; }
  /** The rig for a side, if that side is playing Magnet. */
  private avatar(owner: 'player' | 'npc'): MagnetAvatar | null {
    return owner === 'player' ? this.playerAvatar : this.npcAvatar;
  }

  /** The floor layer, under the fighters. Rebuilt lazily after a reset. */
  private ground(): Phaser.GameObjects.Graphics {
    if (!this.groundGfx || !this.groundGfx.active) {
      this.groundGfx = this.arena.scene.add.graphics().setDepth(4);
    }
    return this.groundGfx;
  }

  /** The airborne layer, over the fighters. Rebuilt lazily after a reset. */
  private air(): Phaser.GameObjects.Graphics {
    if (!this.airGfx || !this.airGfx.active) {
      this.airGfx = this.arena.scene.add.graphics().setDepth(9);
    }
    return this.airGfx;
  }

  // ── Public accessors for cross-cutting arena state ─────────────────────

  pushRod(rod: MagnetRod): void { this.magnetRods.push(rod); }

  /**
   * The four rods a magnet match starts with, one in each corner. Lives here rather than in
   * ArenaScene so the rod's art and the rod's data stay in one place.
   */
  spawnCornerRods(width: number, height: number, owner: 'player' | 'npc', isSword: boolean): void {
    const pad = 80;
    for (const c of [
      { x: pad, y: pad }, { x: width - pad, y: pad },
      { x: pad, y: height - pad }, { x: width - pad, y: height - pad },
    ]) {
      this.magnetRods.push({
        x: c.x, y: c.y, vx: 0, vy: 0,
        contactCooldownPlayer: 0, contactCooldownNpc: 0,
        bouncing: false, bounceUntil: 0, owner, permDamageBonus: 0,
        isSword, kind: 'steel',
      });
    }
  }

  getNailPullUntil(): number { return this.magnetNailPullUntil; }
  getNailPullVX(): number { return this.magnetNailPullVX; }
  getNailPullVY(): number { return this.magnetNailPullVY; }

  reset(): void {
    const scene = this.arena.scene;
    // Visuals — every GameObject dies with the old scene run, so rebuild lazily in update().
    if (this.playerAvatar) { this.playerAvatar.destroy(); this.playerAvatar = null; }
    if (this.npcAvatar) { this.npcAvatar.destroy(); this.npcAvatar = null; }
    for (const a of [
      this.playerMagnetizedAura, this.npcMagnetizedAura, this.playerProtectAura, this.npcProtectAura,
      this.playerMagLevAura, this.npcMagLevAura, this.playerReflectAura, this.npcReflectAura,
    ]) a?.destroy();
    this.playerMagnetizedAura = null; this.npcMagnetizedAura = null;
    this.playerProtectAura = null; this.npcProtectAura = null;
    this.playerMagLevAura = null; this.npcMagLevAura = null;
    this.playerReflectAura = null; this.npcReflectAura = null;
    if (this.groundGfx) { this.groundGfx.destroy(); this.groundGfx = null; }
    if (this.airGfx) { this.airGfx.destroy(); this.airGfx = null; }
    this.vizT = 0;

    this.magnetRods = [];
    this.electroStunned = new Map<Fighter, number>();
    this.magnetPlayerNail = null;
    this.magnetNpcNail = null;
    this.magnetPlayerShieldOrbs = [];
    this.magnetNpcShieldOrbs = [];
    this.magnetPlayerAtomSmasher = null;
    this.magnetNpcAtomSmasher = null;
    this.magnetPlayerMagnetized = false; this.magnetPlayerMagnetizedUntil = 0;
    this.magnetNpcMagnetized = false; this.magnetNpcMagnetizedUntil = 0;
    this.magnetPlayerSpeedBuffUntil = 0; this.magnetNpcSpeedBuffUntil = 0;
    this.magnetOrbOrbitAngle = 0; this.magnetNpcOrbOrbitAngle = 0;
    this.magnetNailPullUntil = 0; this.magnetNailPullVX = 0; this.magnetNailPullVY = 0;
    this.magnetPlayerNails = [];
    this.magnetNpcNails = [];
    this.magnetPlayerPullStacks = 0; this.magnetNpcPullStacks = 0;
    this.magnetCopperSpawnAccumPlayer = 0; this.magnetCopperSpawnAccumNpc = 0;
    this.magnetReflectUntilPlayer = 0; this.magnetReflectUntilNpc = 0;
    // Mastery — Metal Detector + Mag-Lev
    this.ancientRods = [];
    this.ancientRodsInit = false;
    this.magLevMounted = false; this.magLevPreShield = 0;
    this.magLevBashCd = new Map();
    this.magLevLastMountAt = -MAGLEV_COOLDOWN_MS;
    this.npcMagLevMounted = false; this.npcMagLevPreShield = 0;
    this.npcMagLevBashCd = new Map();
    void scene;
  }

  handleInput(
    time: number,
    pointer: Phaser.Input.Pointer,
    mouseX: number,
    mouseY: number,
  ): void {
    const { player, eKey, fKey, rKey, qKey, pointerWasDown, rightPointerWasDown } = this.arena;
    const playerCtx = this.arena.buildPlayerContext(mouseX, mouseY);
    this.lastAimX = mouseX;
    this.lastAimY = mouseY;

    // ── Mastery — Mag-Lev takes over whichever slot it's bound to ────────
    const magLevSlot = this.arena.masteryActive ? this.magLevSlot() : null;
    if (magLevSlot) {
      const mk = magLevSlot === 'e' ? eKey : magLevSlot === 'r' ? rKey : magLevSlot === 'f' ? fKey : qKey;
      if (Phaser.Input.Keyboard.JustDown(mk)) this.toggleMagLev(time);
    }

    if (pointer.isDown && !pointerWasDown) {
      // While riding the board, click slings you toward the cursor instead of pulsing.
      if (this.magLevMounted) this.magLevSling(mouseX, mouseY);
      else player.castAbility('mag-pulse', playerCtx);
    }

    // Click+: right-click Repulse
    if (pointer.rightButtonDown() && !rightPointerWasDown && this.arena.hasUpgrade('click')) {
      this.doMagnetRepulse(mouseX, mouseY, 'player');
    }

    if (magLevSlot !== 'e' && Phaser.Input.Keyboard.JustDown(eKey)) {
      if (this.arena.hasUpgrade('e')) {
        // E+ barrage: recall any implanted nails, or fire barrage
        const implanted = this.magnetPlayerNails.filter(n => n.inEnemy);
        if (implanted.length > 0) {
          const { npc } = this.arena;
          for (const nail of implanted) {
            const dmg = 18;
            const hx = npc.x, hy = npc.y;
            npc.takeDamage(dmg);
            // Torn back out: the nail rips free along the line back to your hand.
            this.pfx.grasp(player.x, player.y, hx, hy, MAGNET.gold, 300);
            this.pfx.sparks(hx, hy, 6, Math.atan2(player.y - hy, player.x - hx), 10, MAGNET.goldHi);
            void nail;
          }
          this.playerAvatar?.play('punch', Math.atan2(npc.y - player.y, npc.x - player.x));
          this.arena.recordMasteryStat('nailTears', implanted.length);
          this.magnetPlayerNails = this.magnetPlayerNails.filter(n => !n.inEnemy);
          this.arena.showFloatingText(this.arena.npc.x, this.arena.npc.y - 36, '🔩 RECALLED', '#ccddee');
          player.reduceCooldown('nail-implant', 2000);
        } else if (this.magnetPlayerNails.length < 3) {
          player.castAbility('nail-implant', playerCtx);
        }
      } else {
        if (this.magnetPlayerNail && this.magnetPlayerNail.inEnemy) {
          const nail = this.magnetPlayerNail;
          const dmg = 18;
          const { npc } = this.arena;
          const hx = npc.x, hy = npc.y;
          npc.takeDamage(dmg);
          this.pfx.grasp(player.x, player.y, hx, hy, MAGNET.steel, 300);
          this.pfx.sparks(hx, hy, 6, Math.atan2(player.y - hy, player.x - hx), 10, MAGNET.chrome);
          this.playerAvatar?.play('punch', Math.atan2(hy - player.y, hx - player.x));
          this.arena.recordMasteryStat('nailTears', 1);
          this.arena.showFloatingText(npc.x, npc.y - 36, '🔩 RECALLED', '#ccddee');
          void nail;
          this.magnetPlayerNail = null;
          player.reduceCooldown('nail-implant', 2000);
        } else if (!this.magnetPlayerNail) {
          player.castAbility('nail-implant', playerCtx);
        }
      }
    }

    if (magLevSlot !== 'f' && Phaser.Input.Keyboard.JustDown(fKey)) {
      player.castAbility('magnetize', playerCtx);
    }

    if (magLevSlot !== 'r' && Phaser.Input.Keyboard.JustDown(rKey)) {
      // R+: Reflect Burst — consume 3 orbs instead of normal protect cast
      if (this.arena.hasUpgrade('r') && this.magnetPlayerShieldOrbs.length >= 3) {
        this.doMagnetReflectBurst('player');
      } else {
        player.castAbility('protect', playerCtx);
      }
    }

    if (magLevSlot !== 'q' && Phaser.Input.Keyboard.JustDown(qKey)) {
      player.castAbility('atom-smasher', playerCtx);
    }

    void time;
  }

  update(time: number, delta: number, isPlayerMagnet = false, isNpcMagnet = false): void {
    this.vizT += delta / 1000;
    this.updateMagnetRods(time, delta);
    this.updateMagnetNails(time, delta);
    this.updateMagnetShieldOrbs(time);
    this.updateMagnetAtomSmashers(time, delta);
    this.updateMagnetMagnetized(time, delta);
    this.updateMagnetReflectBurst(time);
    this.updateMagnetSpeedBuff(time);
    this.updateMasteryMetalDetector(time, delta);
    this.updateMagLev(time, delta);
    // After every movement source for the frame, so a charged rod's stun always wins.
    this.enforceElectroStuns(time);
    this.paintWorld(time);
    this.updateAvatars(delta, isPlayerMagnet, isNpcMagnet);
  }

  /**
   * Every per-frame painter in one pass. Both layers are cleared and redrawn from live state, so
   * a rod smears with its own velocity and a compactor plate wears its hazard stripes rather
   * than any of it sitting there as a sprite.
   */
  private paintWorld(time: number): void {
    const { player, npc } = this.arena;
    // Nothing magnetic in play — don't build the layers at all in a non-magnet match.
    const idle = this.magnetRods.length === 0 && this.ancientRods.length === 0
      && !this.magLevMounted && !this.npcMagLevMounted
      && !this.magnetPlayerAtomSmasher && !this.magnetNpcAtomSmasher
      && this.magnetPlayerShieldOrbs.length === 0 && this.magnetNpcShieldOrbs.length === 0
      && this.magnetPlayerNails.length === 0 && this.magnetNpcNails.length === 0
      && !this.magnetPlayerNail && !this.magnetNpcNail;
    if (idle && !this.groundGfx && !this.airGfx) return;

    const g = this.ground();
    g.clear();
    // Buried ancient finds, under everything — they are meant to be nearly invisible.
    for (const ar of this.ancientRods) {
      if (!ar.exposed) MagnetFx.drawBuriedRod(g, this.pcol, ar.hx, ar.hy, this.vizT);
    }
    for (const rod of this.magnetRods) {
      MagnetFx.drawRod(
        g, this.col(rod.owner), rod.x, rod.y, rod.vx, rod.vy,
        rod.kind ?? 'steel', rod.bouncing, rod.permDamageBonus, rod.isSword === true, this.vizT,
        this.isCharged(rod, time),
      );
    }
    if (this.magLevMounted) {
      MagnetFx.drawMagLevBoard(g, this.pcol, player.x, player.y + 18,
        Phaser.Math.Clamp((player.body as Phaser.Physics.Arcade.Body).velocity.x / 900, -0.35, 0.35),
        this.vizT);
    }
    if (this.npcMagLevMounted) {
      MagnetFx.drawMagLevBoard(g, this.ncol, npc.x, npc.y + 18,
        Phaser.Math.Clamp((npc.body as Phaser.Physics.Arcade.Body).velocity.x / 900, -0.35, 0.35),
        this.vizT);
    }

    const a = this.air();
    a.clear();
    // Compactors: the drum while it winds up, then the two plates closing on it.
    for (const sm of [this.magnetPlayerAtomSmasher, this.magnetNpcAtomSmasher]) {
      if (!sm) continue;
      const tint = this.col(sm.owner);
      if (!sm.crossed && time < sm.fireAt) {
        MagnetFx.drawCompactor(a, tint, sm.x, sm.y, 1 - (sm.fireAt - time) / 3000, this.vizT);
      }
      for (const w of sm.walls) {
        if (!w.active) continue;
        MagnetFx.drawCompactorWall(a, tint, w.x, sm.y, COMPACTOR_WALL_HALF_H, w.vx > 0 ? 1 : -1);
      }
    }
    // Bearings.
    for (const [orbs, caster, tint] of [
      [this.magnetPlayerShieldOrbs, player, this.pcol],
      [this.magnetNpcShieldOrbs, npc, this.ncol],
    ] as [MagnetShieldOrb[], Fighter, MagnetColorFn][]) {
      for (const orb of orbs) {
        MagnetFx.drawShieldOrb(a, tint,
          caster.x + Math.cos(orb.angle) * 52, caster.y + Math.sin(orb.angle) * 52,
          Phaser.Math.Clamp(orb.hp / 5, 0, 1), this.vizT);
      }
    }
    // Nails, each still tethered to whoever threw it.
    for (const [nails, owner] of [
      [this.magnetPlayerNails, 'player'], [this.magnetNpcNails, 'npc'],
    ] as [MagnetNail[], 'player' | 'npc'][]) {
      const caster = owner === 'player' ? player : npc;
      for (const n of nails) {
        MagnetFx.drawNail(a, this.col(owner), n.x, n.y, Math.atan2(n.vy, n.vx), n.color,
          n.inEnemy, caster.x, caster.y, this.vizT);
      }
    }
    for (const [n, owner] of [
      [this.magnetPlayerNail, 'player'], [this.magnetNpcNail, 'npc'],
    ] as [MagnetNail | null, 'player' | 'npc'][]) {
      if (!n) continue;
      const caster = owner === 'player' ? player : npc;
      MagnetFx.drawNail(a, this.col(owner), n.x, n.y, Math.atan2(n.vy, n.vx), n.color,
        n.inEnemy, caster.x, caster.y, this.vizT);
    }
  }

  /**
   * The character rigs and every field aura. Built lazily so a scene restart (which destroys
   * them all) simply rebuilds on the next frame, and torn down the moment a side stops being
   * Magnet — except the auras, which follow the *victim* and so can outlive either rig.
   */
  private updateAvatars(delta: number, isPlayerMagnet: boolean, isNpcMagnet: boolean): void {
    const { scene, player, npc } = this.arena;

    if (isPlayerMagnet && player.active) {
      if (!this.playerAvatar) this.playerAvatar = new MagnetAvatar(scene, this.pcol, 'player');
      this.playerAvatar.setFacing(Math.atan2(this.lastAimY - player.y, this.lastAimX - player.x));
      this.playerAvatar.setIntensity(this.magLevMounted ? 1.3 : this.magnetPlayerShieldOrbs.length > 0 ? 1.15 : 1);
      this.playerAvatar.setMastered(this.arena.masteryActive);
      // Single owner of setHold: riding the board throws the arms out for balance, and a live
      // orb shell has both hands working to keep it turning.
      this.playerAvatar.setHold(
        this.magLevMounted ? 'ride' : this.magnetPlayerShieldOrbs.length > 0 ? 'brace' : null);
      this.playerAvatar.update(delta, player.x, player.y, player.forceInvisible ? 0 : player.alpha);
    } else if (this.playerAvatar) {
      this.playerAvatar.destroy();
      this.playerAvatar = null;
    }

    if (isNpcMagnet && npc.active) {
      if (!this.npcAvatar) this.npcAvatar = new MagnetAvatar(scene, this.ncol, 'npc');
      this.npcAvatar.setFacing(Math.atan2(player.y - npc.y, player.x - npc.x));
      this.npcAvatar.setIntensity(this.npcMagLevMounted ? 1.3 : 1);
      this.npcAvatar.setMastered(this.arena.npcMasteryActive);
      this.npcAvatar.setHold(this.npcMagLevMounted ? 'ride' : null);
      this.npcAvatar.update(delta, npc.x, npc.y, npc.forceInvisible ? 0 : npc.alpha);
    } else if (this.npcAvatar) {
      this.npcAvatar.destroy();
      this.npcAvatar = null;
    }

    const now = scene.time.now;
    // Magnetized rides on the *victim*, so the player's aura sits on the npc and vice versa.
    this.syncAura('npcMagnetized', this.magnetNpcMagnetized, npc, delta,
      Phaser.Math.Clamp((this.magnetNpcMagnetizedUntil - now) / 2000, 0, 1));
    this.syncAura('playerMagnetized', this.magnetPlayerMagnetized, player, delta,
      Phaser.Math.Clamp((this.magnetPlayerMagnetizedUntil - now) / 2000, 0, 1));
    this.syncAura('playerProtect', this.magnetPlayerShieldOrbs.length > 0, player, delta, 1);
    this.syncAura('npcProtect', this.magnetNpcShieldOrbs.length > 0, npc, delta, 1);
    this.syncAura('playerMagLev', this.magLevMounted, player, delta, 1);
    this.syncAura('npcMagLev', this.npcMagLevMounted, npc, delta, 1);
    this.syncAura('playerReflect', now < this.magnetReflectUntilPlayer, player, delta,
      Phaser.Math.Clamp((this.magnetReflectUntilPlayer - now) / 1500, 0, 1));
    this.syncAura('npcReflect', now < this.magnetReflectUntilNpc, npc, delta,
      Phaser.Math.Clamp((this.magnetReflectUntilNpc - now) / 1500, 0, 1));
  }

  /** Build/tear down one field aura from a single "is it up?" flag. */
  private syncAura(
    key: 'playerMagnetized' | 'npcMagnetized' | 'playerProtect' | 'npcProtect'
      | 'playerMagLev' | 'npcMagLev' | 'playerReflect' | 'npcReflect',
    on: boolean, f: Fighter, delta: number, intensity: number,
  ): void {
    const spec = {
      // Magnetize rides on the *victim*: the field around the player was cast by the npc, so
      // it wears the npc's colours, and vice versa.
      // 180 is the real rod-attraction range, so the ring is a gameplay tell, not decoration.
      playerMagnetized: ['magnetized', 180, 3, this.ncol] as const,
      npcMagnetized: ['magnetized', 180, 3, this.pcol] as const,
      playerProtect: ['protect', 52, 3, this.pcol] as const,
      npcProtect: ['protect', 52, 3, this.ncol] as const,
      playerMagLev: ['maglev', 26, 3, this.pcol] as const,
      npcMagLev: ['maglev', 26, 3, this.ncol] as const,
      playerReflect: ['reflect', 90, 5, this.pcol] as const,
      npcReflect: ['reflect', 90, 5, this.ncol] as const,
    }[key];

    let aura = this[`${key}Aura` as const] as MagnetAura | null;
    if (!on) {
      if (aura) { aura.destroy(); this[`${key}Aura` as const] = null; }
      return;
    }
    if (!aura || !f.active) {
      if (!f.active) return;
      aura = new MagnetAura(this.arena.scene, spec[3], spec[0], spec[1], spec[2]);
      this[`${key}Aura` as const] = aura;
    }
    aura.setIntensity(intensity);
    aura.update(delta, f.x, f.y, f.forceInvisible ? 0 : f.alpha);
  }

  // ── Public do* methods — called from ArenaScene context builders ───────

  doMagnetPulse(x: number, y: number, owner: 'player' | 'npc'): void {
    const { player, npc, scene } = this.arena;
    const caster = owner === 'player' ? player : npc;
    const target = owner === 'player' ? npc : player;

    // Mastery — Metal Detector: a pulse landing on a hidden ancient rod exposes it.
    if (owner === 'player' && this.arena.masteryActive) this.tryExposeAncientRod(x, y);

    // The pulse itself: field lines springing out of the cursor and filings kicked up with them.
    const fx = this.fx(owner);
    fx.pulse(x, y, 80, MAGNET.rose, 380, 7, 12);
    fx.flash(x, y, 16, 8, MAGNET.rose);
    this.avatar(owner)?.play('punch', Math.atan2(y - caster.y, x - caster.x));

    const pullRange = 380;
    for (const rod of this.magnetRods) {
      if (rod.owner !== owner) continue;
      const dist = Phaser.Math.Distance.Between(rod.x, rod.y, x, y);
      if (dist <= pullRange) {
        const angle = Math.atan2(y - rod.y, x - rod.x);
        const pulseSpeed = rod.isSword ? 1360 : 680;
        rod.vx = Math.cos(angle) * pulseSpeed;
        rod.vy = Math.sin(angle) * pulseSpeed;
      }
    }

    // Nailed enemies get yanked toward the pulse point — stronger with each nail.
    const implantCount = this.countImplantedNails(owner);
    if (implantCount > 0) {
      const pullAng = Math.atan2(y - target.y, x - target.x);
      const pullSpeed = 220 + (implantCount - 1) * 140;
      if (owner === 'player') {
        this.magnetNailPullVX = Math.cos(pullAng) * pullSpeed;
        this.magnetNailPullVY = Math.sin(pullAng) * pullSpeed;
        this.magnetNailPullUntil = Math.max(this.magnetNailPullUntil, scene.time.now + 350);
      } else if (!target.knockbackImmune) {
        (target.body as Phaser.Physics.Arcade.Body).setVelocity(
          Math.cos(pullAng) * pullSpeed, Math.sin(pullAng) * pullSpeed,
        );
      }
    }

    const shieldOrbs = owner === 'player' ? this.magnetPlayerShieldOrbs : this.magnetNpcShieldOrbs;
    const distToCursor = Phaser.Math.Distance.Between(caster.x, caster.y, x, y);
    if (shieldOrbs.length > 0 && distToCursor <= pullRange) {
      const dx = x - caster.x;
      const dy = y - caster.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const dashSpeed = 1200;
      const dashMs = Phaser.Math.Clamp((dist / dashSpeed) * 1000, 40, 320);
      const body = caster.body as Phaser.Physics.Arcade.Body;
      body.setVelocity((dx / dist) * dashSpeed, (dy / dist) * dashSpeed);
      if (owner === 'player') {
        this.arena.setIsDodging(true);
        player.isInvincible = true;
        scene.time.delayedCall(dashMs, () => {
          if (player.active) {
            player.isInvincible = false;
            this.arena.setIsDodging(false);
            (player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
          }
        });
        this.magnetPlayerSpeedBuffUntil = scene.time.now + 3000;
      } else {
        this.magnetNpcSpeedBuffUntil = scene.time.now + 3000;
      }
      this.arena.showFloatingText(caster.x, caster.y - 26, '🔗 MAGNET DASH', '#cc2244');
    }
  }

  doMagnetNailAction(tx: number, ty: number, owner: 'player' | 'npc'): void {
    const { player, npc } = this.arena;
    const caster = owner === 'player' ? player : npc;
    const speed = 520;

    if (this.arena.hasUpgrade('e') && owner === 'player') {
      // E+: fire 3 golden nails in a 12° spread
      const baseAngle = Math.atan2(ty - caster.y, tx - caster.x);
      const spreadAngles = [-6, 0, 6].map(d => baseAngle + d * (Math.PI / 180));
      for (const ang of spreadAngles) {
        const nail: MagnetNail = {
          color: MAGNET.gold,
          vx: Math.cos(ang) * speed,
          vy: Math.sin(ang) * speed,
          x: caster.x,
          y: caster.y,
          inEnemy: false,
          implantedUntil: 0,
          owner,
        };
        this.magnetPlayerNails.push(nail);
      }
      this.pfx.sparks(caster.x, caster.y, 6, baseAngle, 10, MAGNET.goldHi);
      this.avatar(owner)?.play('punch', baseAngle);
    } else {
      const existing = owner === 'player' ? this.magnetPlayerNail : this.magnetNpcNail;
      if (existing) return;
      const dx = tx - caster.x;
      const dy = ty - caster.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      this.fx(owner).sparks(caster.x, caster.y, 4, Math.atan2(dy, dx), 10, MAGNET.steel);
      this.avatar(owner)?.play('punch', Math.atan2(dy, dx));
      const nail: MagnetNail = {
        color: MAGNET.iron,
        vx: (dx / len) * speed,
        vy: (dy / len) * speed,
        x: caster.x,
        y: caster.y,
        inEnemy: false,
        implantedUntil: 0,
        owner,
      };
      if (owner === 'player') this.magnetPlayerNail = nail;
      else this.magnetNpcNail = nail;
    }
  }

  doMagnetMagnetize(tx: number, ty: number, owner: 'player' | 'npc'): void {
    const { player, npc, scene } = this.arena;
    const target = owner === 'player' ? npc : player;
    const dist = Phaser.Math.Distance.Between(tx, ty, target.x, target.y);
    if (dist <= 80) {
      const duration = 8000;
      if (owner === 'player') {
        this.magnetNpcMagnetized = true;
        this.magnetNpcMagnetizedUntil = scene.time.now + duration;
      } else {
        this.magnetPlayerMagnetized = true;
        this.magnetPlayerMagnetizedUntil = scene.time.now + duration;
      }
      // Grabbed: field lines reach out and clamp onto whoever was under the cursor.
      const caster = owner === 'player' ? player : npc;
      const fx = this.fx(owner);
      fx.grasp(caster.x, caster.y, target.x, target.y, MAGNET.rose);
      fx.pulse(target.x, target.y, 90, MAGNET.red, 420, 6, 10, true);
      this.avatar(owner)?.play('sweep', Math.atan2(target.y - caster.y, target.x - caster.x));
      this.arena.showFloatingText(target.x, target.y - 28, '🔗 MAGNETIZED', '#ff4488');
    }
  }

  doMagnetProtect(owner: 'player' | 'npc'): void {
    const { player, npc } = this.arena;
    const caster = owner === 'player' ? player : npc;
    const orbArray = owner === 'player' ? this.magnetPlayerShieldOrbs : this.magnetNpcShieldOrbs;
    orbArray.length = 0;

    const count = 10;
    for (let i = 0; i < count; i++) {
      orbArray.push({ angle: (i / count) * Math.PI * 2, hp: 5 });
    }
    // The bearings snapping into orbit around you.
    const fx = this.fx(owner);
    fx.pulse(caster.x, caster.y, 52, MAGNET.azure, 380, 6, 10, true);
    fx.sparks(caster.x, caster.y, 8, 0, 10, MAGNET.sky);
    this.avatar(owner)?.play('flex');
    this.arena.showFloatingText(caster.x, caster.y - 36, '🛡 PROTECT', '#4488cc');
  }

  /** How many of `owner`'s nails are currently implanted in the enemy. */
  private countImplantedNails(owner: 'player' | 'npc'): number {
    const single = owner === 'player' ? this.magnetPlayerNail : this.magnetNpcNail;
    const array = owner === 'player' ? this.magnetPlayerNails : this.magnetNpcNails;
    let count = single && single.inEnemy ? 1 : 0;
    count += array.filter(n => n.inEnemy).length;
    return count;
  }

  /** Rip out all of `owner`'s implanted nails (destroying their sprites); returns how many. */
  private removeImplantedNails(owner: 'player' | 'npc'): number {
    let removed = 0;
    const single = owner === 'player' ? this.magnetPlayerNail : this.magnetNpcNail;
    if (single && single.inEnemy) {
      if (owner === 'player') this.magnetPlayerNail = null;
      else this.magnetNpcNail = null;
      removed++;
    }
    if (owner === 'player') {
      for (const n of this.magnetPlayerNails) {
        if (n.inEnemy) removed++;
      }
      this.magnetPlayerNails = this.magnetPlayerNails.filter(n => !n.inEnemy);
      if (removed > 0) this.magnetPlayerPullStacks = 0;
    } else {
      for (const n of this.magnetNpcNails) {
        if (n.inEnemy) removed++;
      }
      this.magnetNpcNails = this.magnetNpcNails.filter(n => !n.inEnemy);
    }
    return removed;
  }

  doMagnetAtomSmasher(x: number, y: number, owner: 'player' | 'npc'): void {
    const { scene } = this.arena;
    const W = scene.scale.width;
    const smasher: MagnetAtomSmasher = {
      x, y,
      fireAt: scene.time.now + 3000,
      walls: [
        { x: -20,    vx: 900,  vy: 0, active: false, hitCooldown: 0 },
        { x: W + 20, vx: -900, vy: 0, active: false, hitCooldown: 0 },
      ],
      exploded: false,
      crossed: false,
      owner,
    };

    // Dropped, not thrown: the drum lands and immediately starts hauling everything in.
    const fx = this.fx(owner);
    fx.flash(x, y, 30, 9, MAGNET.plateHi);
    fx.pulse(x, y, 150, MAGNET.rose, 520, 6, 12, true);
    fx.filingsMark(x, y, 90, 3);
    this.avatar(owner)?.play('slam', Math.atan2(y - (owner === 'player' ? this.arena.player.y : this.arena.npc.y), x - (owner === 'player' ? this.arena.player.x : this.arena.npc.x)));
    scene.cameras.main.shake(180, 0.004);

    if (owner === 'player') this.magnetPlayerAtomSmasher = smasher;
    else this.magnetNpcAtomSmasher = smasher;

    this.arena.showFloatingText(x, y - 40, '🗜 TRASH COMPACTOR', '#aabbcc');
  }

  // ── Private per-frame update helpers ─────────────────────────────────────

  // ── Electromagnet (divine perk) ────────────────────────────────────────

  /** True while a rod is holding a charge. */
  private isCharged(rod: MagnetRod, time: number): boolean {
    return rod.chargedUntil !== undefined && time < rod.chargedUntil;
  }

  /** A live rod arcs into whoever is standing too close to it. */
  private zapFromRod(rod: MagnetRod, time: number): void {
    rod.nextZapAt = time + ELECTROMAGNET_ZAP_GAP_MS;
    // The kit only ever knows the two duellists — same as every other rod interaction here.
    const victim = rod.owner === 'player' ? this.arena.npc : this.arena.player;
    const fx = this.fx(rod.owner);
    let arced = false;
    if (victim?.active && victim.hp > 0
      && Phaser.Math.Distance.Between(rod.x, rod.y, victim.x, victim.y) <= ELECTROMAGNET_ZAP_RANGE) {
      victim.takeDamage(ELECTROMAGNET_ZAP_DAMAGE);
      // The arc itself, jumping the gap from the rod to the body.
      fx.sparks(victim.x, victim.y, 4, Math.atan2(rod.y - victim.y, rod.x - victim.x), 9, MAGNET.spark);
      arced = true;
    }
    // A dry crackle even when it catches nobody, so a live rod is never silent on the floor.
    fx.sparks(rod.x, rod.y, arced ? 5 : 2, Math.random() * Math.PI * 2, 9, MAGNET.live);
  }

  /**
   * A charged rod that connects doesn't just hurt — it locks the target up for half a second.
   * Written to the generic stun field, and enforced for either side by `enforceElectroStuns`
   * (ArenaScene only consumes it for the npc).
   */
  private electroStun(rod: MagnetRod, victim: Fighter, time: number): void {
    if (!this.isCharged(rod, time) || victim.unstoppable) return;
    victim.earthStunnedUntil = Math.max(victim.earthStunnedUntil, time + ELECTROMAGNET_STUN_MS);
    this.electroStunned.set(victim, victim.earthStunnedUntil);
    this.arena.showFloatingText(victim.x, victim.y - 34, '⚡ Stunned!', '#66ffff');
  }

  /** Zero the velocity of anything a charged rod has locked up. Runs after movement resolves. */
  private enforceElectroStuns(time: number): void {
    for (const [f, until] of this.electroStunned) {
      if (time >= until || !f.active || f.unstoppable) { this.electroStunned.delete(f); continue; }
      (f.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    }
  }

  private updateMagnetRods(time: number, delta: number): void {
    const { player, npc, scene } = this.arena;
    const dt = delta / 1000;
    const W = scene.scale.width;
    const H = scene.scale.height;
    const pad = 20;
    const friction = 0.88;
    const movingThreshold = 30;

    for (const rod of this.magnetRods) {
      const wasMoving = Math.abs(rod.vx) > movingThreshold || Math.abs(rod.vy) > movingThreshold;

      if (rod.bouncing && time > rod.bounceUntil) {
        rod.bouncing = false;
        rod.vx *= 0.3; rod.vy *= 0.3;
      }

      rod.x += rod.vx * dt;
      rod.y += rod.vy * dt;

      if (rod.x < pad) { rod.x = pad; rod.vx = Math.abs(rod.vx); }
      if (rod.x > W - pad) { rod.x = W - pad; rod.vx = -Math.abs(rod.vx); }
      if (rod.y < pad) { rod.y = pad; rod.vy = Math.abs(rod.vy); }
      if (rod.y > H - pad) { rod.y = H - pad; rod.vy = -Math.abs(rod.vy); }

      // Bouncing rods barely lose speed so they ricochet around for the full window.
      const rodFriction = rod.bouncing ? 0.995 : friction;
      rod.vx *= rodFriction;
      rod.vy *= rodFriction;
      if (Math.abs(rod.vx) < 2) rod.vx = 0;
      if (Math.abs(rod.vy) < 2) rod.vy = 0;

      // Colour, heading and smear all come off this data in paintWorld — see rodColor().
      const isMoving = Math.abs(rod.vx) > movingThreshold || Math.abs(rod.vy) > movingThreshold;

      // Electromagnet: a live rod arcs into anything standing next to it, whether or not the
      // rod is moving — it is a floor hazard, not a projectile.
      if (rod.chargedUntil !== undefined) {
        if (time >= rod.chargedUntil) {
          rod.chargedUntil = undefined;
          rod.nextZapAt = undefined;
        } else if (time >= (rod.nextZapAt ?? 0)) {
          this.zapFromRod(rod, time);
        }
      }

      if (isMoving || wasMoving) {
        const baseHit = rod.isSword ? 16 : 8;
        const baseDmg = rod.bouncing ? baseHit * 2 : baseHit;
        const tempBonus = rod.bouncing ? baseHit : 0; // Q+ bonus during bounce
        const dmg = baseDmg + rod.permDamageBonus + (this.arena.hasUpgrade('q') ? tempBonus : 0);
        if (rod.owner === 'player') {
          const npcDist = Phaser.Math.Distance.Between(rod.x, rod.y, npc.x, npc.y);
          if (npcDist <= 28 && time > rod.contactCooldownNpc) {
            const hx = npc.x, hy = npc.y;
            npc.takeDamage(dmg);
            // Metal on metal: sparks off the point of contact, thrown along the rod's travel.
            this.pfx.sparks(hx, hy, 5 + (rod.bouncing ? 4 : 0), Math.atan2(rod.vy, rod.vx) + Math.PI, 10);
            this.arena.recordMasteryStat('rodSmashes', 1);
            rod.contactCooldownNpc = time + 500;
            this.electroStun(rod, npc, time);
            if (rod.destroyOnHit) {
              this.pfx.shrapnel(rod.x, rod.y, 4, { speed: 190, size: 9, color: rodColor(rod.kind ?? 'steel', rod.bouncing, rod.permDamageBonus) });
              this.magnetRods.splice(this.magnetRods.indexOf(rod), 1);
            }
          }
        } else {
          const playerDist = Phaser.Math.Distance.Between(rod.x, rod.y, player.x, player.y);
          if (playerDist <= 28 && time > rod.contactCooldownPlayer) {
            const hx = player.x, hy = player.y;
            player.takeDamage(dmg);
            this.nfx.sparks(hx, hy, 5 + (rod.bouncing ? 4 : 0), Math.atan2(rod.vy, rod.vx) + Math.PI, 10);
            rod.contactCooldownPlayer = time + 500;
            this.electroStun(rod, player, time);
            if (rod.destroyOnHit) {
              this.nfx.shrapnel(rod.x, rod.y, 4, { speed: 190, size: 9, color: rodColor(rod.kind ?? 'steel', rod.bouncing, rod.permDamageBonus) });
              this.magnetRods.splice(this.magnetRods.indexOf(rod), 1);
            }
          }
        }
      }

      for (const other of this.magnetRods) {
        if (other === rod) continue;
        const distBetween = Phaser.Math.Distance.Between(rod.x, rod.y, other.x, other.y);
        const minDist = 26;
        if (distBetween < minDist && distBetween > 0) {
          const ang = Math.atan2(rod.y - other.y, rod.x - other.x);
          rod.x = other.x + Math.cos(ang) * minDist;
          rod.y = other.y + Math.sin(ang) * minDist;
          const tmpVx = rod.vx; const tmpVy = rod.vy;
          rod.vx = other.vx * 0.8; rod.vy = other.vy * 0.8;
          other.vx = tmpVx * 0.8; other.vy = tmpVy * 0.8;
        }
      }

      const isMagnetized = rod.owner === 'player' ? this.magnetNpcMagnetized : this.magnetPlayerMagnetized;
      if (isMagnetized) {
        const magTarget = rod.owner === 'player' ? npc : player;
        const magRange = 180;
        const magDist = Phaser.Math.Distance.Between(rod.x, rod.y, magTarget.x, magTarget.y);
        if (magDist <= magRange && magDist > 10) {
          const falloff = Math.max(1, magDist);
          const magnetMult = rod.isSword ? 2 : 1;
          const accel = Math.min(1600 * magnetMult, (600 * 200 * magnetMult) / falloff);
          const magAng = Math.atan2(magTarget.y - rod.y, magTarget.x - rod.x);
          rod.vx += Math.cos(magAng) * accel * dt;
          rod.vy += Math.sin(magAng) * accel * dt;
          const spd = Math.sqrt(rod.vx * rod.vx + rod.vy * rod.vy);
          const speedCap = rod.isSword ? 1400 : 900;
          if (spd > speedCap) { rod.vx = (rod.vx / spd) * speedCap; rod.vy = (rod.vy / spd) * speedCap; }

          // Blade perk: overshoot — extra impulse when passing close to target at speed
          if (rod.isSword) {
            const spd2 = Math.sqrt(rod.vx ** 2 + rod.vy ** 2);
            if (spd2 > 600) {
              const distToTarget = Phaser.Math.Distance.Between(rod.x, rod.y, magTarget.x, magTarget.y);
              if (distToTarget < 30) {
                rod.vx *= 1.3;
                rod.vy *= 1.3;
              }
            }
          }
        }
      }
    }
  }

  private updateMagnetNails(time: number, delta: number): void {
    const { player, npc } = this.arena;
    const dt = delta / 1000;
    const W = this.arena.scene.scale.width;
    const H = this.arena.scene.scale.height;

    // E+ multi-nail array (player only)
    for (let i = this.magnetPlayerNails.length - 1; i >= 0; i--) {
      const nail = this.magnetPlayerNails[i];
      const target = npc;
      if (nail.inEnemy) {
        nail.x = target.x; nail.y = target.y;
        if (time > nail.implantedUntil) this.magnetPlayerNails.splice(i, 1);
        const tDist = Phaser.Math.Distance.Between(target.x, target.y, player.x, player.y);
        if (tDist > 80 && !target.knockbackImmune) {
          const tAng = Math.atan2(player.y - target.y, player.x - target.x);
          // Pull stacks scale the pull strength
          const stackMult = 1 + 0.5 * this.magnetPlayerPullStacks;
          const pull = 180 * stackMult * dt;
          const body = target.body as Phaser.Physics.Arcade.Body;
          body.setVelocity(body.velocity.x + Math.cos(tAng) * pull, body.velocity.y + Math.sin(tAng) * pull);
        }
      } else {
        nail.x += nail.vx * dt; nail.y += nail.vy * dt;
        if (nail.x < 0 || nail.x > W || nail.y < 0 || nail.y > H) {
          this.magnetPlayerNails.splice(i, 1); continue;
        }
        const isMag = this.magnetNpcMagnetized;
        if (isMag) {
          const toTargetX = target.x - nail.x, toTargetY = target.y - nail.y;
          const toLen = Math.sqrt(toTargetX * toTargetX + toTargetY * toTargetY) || 1;
          if (toLen < 150) {
            nail.vx += (toTargetX / toLen) * 600 * dt;
            nail.vy += (toTargetY / toLen) * 600 * dt;
            const spd = Math.sqrt(nail.vx * nail.vx + nail.vy * nail.vy);
            if (spd > 700) { nail.vx = (nail.vx / spd) * 700; nail.vy = (nail.vy / spd) * 700; }
          }
        }
        const hitDist = Phaser.Math.Distance.Between(nail.x, nail.y, target.x, target.y);
        if (hitDist <= 24) {
          const hx = target.x, hy = target.y;
          target.takeDamage(18);
          // Driven home: sparks at the entry point and the nail bites in.
          this.pfx.sparks(hx, hy, 6, Math.atan2(nail.vy, nail.vx) + Math.PI, 10, MAGNET.goldHi);
          this.pfx.flash(hx, hy, 12, 9, MAGNET.gold);
          this.arena.showFloatingText(target.x, target.y - 36, '🔩 NAILED', '#ffd060');
          nail.inEnemy = true;
          nail.implantedUntil = time + 10000;
          nail.x = target.x; nail.y = target.y;
          this.magnetPlayerPullStacks = Math.min(3, this.magnetPlayerPullStacks + 1);
        }
      }
    }

    for (const [nail, owner] of [[this.magnetPlayerNail, 'player'], [this.magnetNpcNail, 'npc']] as [MagnetNail | null, 'player' | 'npc'][]) {
      if (!nail) continue;
      const target = owner === 'player' ? npc : player;

      if (nail.inEnemy) {
        nail.x = target.x;
        nail.y = target.y;
        if (time > nail.implantedUntil) {
          if (owner === 'player') this.magnetPlayerNail = null;
          else this.magnetNpcNail = null;
        }
        const casterForNail = owner === 'player' ? player : npc;
        const tDist = Phaser.Math.Distance.Between(target.x, target.y, casterForNail.x, casterForNail.y);
        if (tDist > 80 && !target.knockbackImmune) {
          const tAng = Math.atan2(casterForNail.y - target.y, casterForNail.x - target.x);
          const pull = 180 * dt;
          const body = target.body as Phaser.Physics.Arcade.Body;
          body.setVelocity(
            body.velocity.x + Math.cos(tAng) * pull,
            body.velocity.y + Math.sin(tAng) * pull,
          );
        }
      } else {
        nail.x += nail.vx * dt;
        nail.y += nail.vy * dt;

        if (nail.x < 0 || nail.x > W || nail.y < 0 || nail.y > H) {
          if (owner === 'player') this.magnetPlayerNail = null;
          else this.magnetNpcNail = null;
          continue;
        }

        const isMag = owner === 'player' ? this.magnetNpcMagnetized : this.magnetPlayerMagnetized;
        if (isMag) {
          const toTargetX = target.x - nail.x;
          const toTargetY = target.y - nail.y;
          const toLen = Math.sqrt(toTargetX * toTargetX + toTargetY * toTargetY) || 1;
          const homingRange = 150;
          if (Math.sqrt(toTargetX * toTargetX + toTargetY * toTargetY) < homingRange) {
            nail.vx += (toTargetX / toLen) * 600 * dt;
            nail.vy += (toTargetY / toLen) * 600 * dt;
            const spd = Math.sqrt(nail.vx * nail.vx + nail.vy * nail.vy);
            if (spd > 700) { nail.vx = (nail.vx / spd) * 700; nail.vy = (nail.vy / spd) * 700; }
          }
        }

        const hitDist = Phaser.Math.Distance.Between(nail.x, nail.y, target.x, target.y);
        if (hitDist <= 24) {
          const dmg = 18;
          const hx = target.x, hy = target.y;
          target.takeDamage(dmg);
          this.fx(owner).sparks(hx, hy, 6, Math.atan2(nail.vy, nail.vx) + Math.PI, 10, MAGNET.steel);
          this.fx(owner).flash(hx, hy, 12, 9, MAGNET.iron);
          this.arena.showFloatingText(target.x, target.y - 36, '🔩 NAILED', '#ccddee');
          nail.inEnemy = true;
          nail.implantedUntil = time + 10000;
          nail.x = target.x; nail.y = target.y;
        }
      }
    }
  }

  private updateMagnetShieldOrbs(time: number): void {
    const { player, npc, projectiles } = this.arena;

    if (this.magnetPlayerShieldOrbs.length > 0) {
      this.magnetOrbOrbitAngle += 0.025;
      const r = 52;
      const total = this.magnetPlayerShieldOrbs.length;
      for (let i = total - 1; i >= 0; i--) {
        const orb = this.magnetPlayerShieldOrbs[i];
        orb.angle = this.magnetOrbOrbitAngle + (i / total) * Math.PI * 2;
        const ox = player.x + Math.cos(orb.angle) * r;
        const oy = player.y + Math.sin(orb.angle) * r;

        if (projectiles) {
          let orbDestroyed = false;
          for (const go of projectiles.getChildren()) {
            if (orbDestroyed) break;
            const proj = go as Projectile;
            if (!proj.active || proj.isFromPlayer) continue;
            const d = Phaser.Math.Distance.Between(proj.x, proj.y, ox, oy);
            if (d <= 12) {
              orb.hp -= proj.damage;
              proj.setActive(false).setVisible(false);
              // A bearing eating a shot: sparks off it, and shrapnel if it finally breaks.
              this.pfx.sparks(ox, oy, 4, Math.atan2(oy - player.y, ox - player.x), 10, MAGNET.sky);
              this.arena.recordMasteryStat('protectBlocks', 1);
              if (orb.hp <= 0) {
                this.pfx.shrapnel(ox, oy, 4, { speed: 150, size: 7, color: MAGNET.azure, depth: 10 });
                this.magnetPlayerShieldOrbs.splice(i, 1);
                orbDestroyed = true;
              }
            }
          }
        }
      }
    }

    if (this.magnetNpcShieldOrbs.length > 0) {
      this.magnetNpcOrbOrbitAngle += 0.025;
      const r = 52;
      const total = this.magnetNpcShieldOrbs.length;
      for (let i = total - 1; i >= 0; i--) {
        const orb = this.magnetNpcShieldOrbs[i];
        orb.angle = this.magnetNpcOrbOrbitAngle + (i / total) * Math.PI * 2;
        const ox = npc.x + Math.cos(orb.angle) * r;
        const oy = npc.y + Math.sin(orb.angle) * r;

        if (projectiles) {
          let orbDestroyed = false;
          for (const go of projectiles.getChildren()) {
            if (orbDestroyed) break;
            const proj = go as Projectile;
            if (!proj.active || !proj.isFromPlayer) continue;
            const d = Phaser.Math.Distance.Between(proj.x, proj.y, ox, oy);
            if (d <= 12) {
              orb.hp -= proj.damage;
              proj.setActive(false).setVisible(false);
              this.nfx.sparks(ox, oy, 4, Math.atan2(oy - npc.y, ox - npc.x), 10, MAGNET.sky);
              if (orb.hp <= 0) {
                this.nfx.shrapnel(ox, oy, 4, { speed: 150, size: 7, color: MAGNET.azure, depth: 10 });
                this.magnetNpcShieldOrbs.splice(i, 1);
                orbDestroyed = true;
              }
            }
          }
        }
      }
    }

    const dt = (1000 / 60) / 1000;
    if (this.magnetPlayerShieldOrbs.length > 0 && this.magnetNpcMagnetized) {
      const pullTarget = npc;
      const dist = Phaser.Math.Distance.Between(player.x, player.y, pullTarget.x, pullTarget.y);
      if (dist > 30) {
        const ang = Math.atan2(pullTarget.y - player.y, pullTarget.x - player.x);
        const strength = Math.min(1400, (900 * 180) / Math.max(1, dist));
        const body = player.body as Phaser.Physics.Arcade.Body;
        body.setVelocity(
          body.velocity.x + Math.cos(ang) * strength * dt,
          body.velocity.y + Math.sin(ang) * strength * dt,
        );
      }
    }
    if (this.magnetNpcShieldOrbs.length > 0 && this.magnetPlayerMagnetized) {
      const pullTarget = player;
      const dist = Phaser.Math.Distance.Between(npc.x, npc.y, pullTarget.x, pullTarget.y);
      if (dist > 30) {
        const ang = Math.atan2(pullTarget.y - npc.y, pullTarget.x - npc.x);
        const strength = Math.min(1400, (900 * 180) / Math.max(1, dist));
        const body = npc.body as Phaser.Physics.Arcade.Body;
        body.setVelocity(
          body.velocity.x + Math.cos(ang) * strength * dt,
          body.velocity.y + Math.sin(ang) * strength * dt,
        );
      }
    }

    void time;
  }

  private updateMagnetAtomSmashers(time: number, delta: number): void {
    const { player, npc, scene } = this.arena;
    const dt = delta / 1000;
    const W = scene.scale.width;

    for (const [smasher, isPlayer] of [[this.magnetPlayerAtomSmasher, true], [this.magnetNpcAtomSmasher, false]] as [MagnetAtomSmasher | null, boolean][]) {
      if (!smasher) continue;

      const owner = smasher.owner;
      const target = owner === 'player' ? npc : player;

      // ── Charging phase ──────────────────────────────────────────────
      if (time < smasher.fireAt) {
        // Strongly suck the enemy in — even harder for every nail implanted in them.
        // (This runs after the NPC AI each frame, so setting velocity wins.)
        const dragDist = Phaser.Math.Distance.Between(smasher.x, smasher.y, target.x, target.y);
        if (dragDist <= 320 && dragDist > 4 && !target.knockbackImmune) {
          const dragAng = Math.atan2(smasher.y - target.y, smasher.x - target.x);
          const nailBoost = this.countImplantedNails(owner);
          const pullSpeed = Math.min(dragDist / dt, 260 + nailBoost * 170);
          (target.body as Phaser.Physics.Arcade.Body).setVelocity(
            Math.cos(dragAng) * pullSpeed, Math.sin(dragAng) * pullSpeed,
          );
        }
        // Drag owned rods hard into the compactor so they're primed to launch.
        for (const rod of this.magnetRods) {
          if (rod.owner !== owner) continue;
          const rodDist = Phaser.Math.Distance.Between(smasher.x, smasher.y, rod.x, rod.y);
          if (rodDist <= 340 && rodDist > 4) {
            const dragAng = Math.atan2(smasher.y - rod.y, smasher.x - rod.x);
            const pull = Math.min(rodDist / dt, 560);
            rod.vx = Math.cos(dragAng) * pull;
            rod.vy = Math.sin(dragAng) * pull;
          }
        }
        continue;
      }

      // ── Wall phase ──────────────────────────────────────────────────
      // Activate walls on the first frame after fireAt
      for (const wall of smasher.walls) {
        if (!wall.active && !smasher.crossed) {
          wall.active = true;
          wall.x = wall.vx > 0 ? -20 : W + 20;
        }
      }

      // Move active walls; remove them if they exit the arena
      let anyActive = false;
      for (const wall of smasher.walls) {
        if (!wall.active) continue;
        wall.x += wall.vx * dt;
        if (wall.x < -80 || wall.x > W + 80) {
          wall.active = false;
          continue;
        }
        anyActive = true;
      }

      // Contact damage with per-wall 500ms cooldown; after crossing, walls despawn on hit
      for (const wall of smasher.walls) {
        if (!wall.active) continue;
        const wallDist = Phaser.Math.Distance.Between(wall.x, smasher.y, target.x, target.y);
        if (wallDist <= 50 && time > wall.hitCooldown) {
          const hx = target.x, hy = target.y;
          target.takeDamage(15);
          // Rammed by a plate: sparks off the face and shrapnel torn loose.
          this.fx(owner).sparks(hx, hy, 7, wall.vx > 0 ? 0 : Math.PI, 10, MAGNET.amber);
          this.fx(owner).shrapnel(hx, hy, 3, { speed: 200, angle: wall.vx > 0 ? 0 : Math.PI, spread: 0.9, color: MAGNET.rust, depth: 10 });
          wall.hitCooldown = time + 500;
          if (smasher.crossed) wall.active = false;
        }
      }

      // One-shot AoE + rod bounce when walls first cross the center
      if (!smasher.crossed) {
        const lw = smasher.walls[0];
        const rw = smasher.walls[1];
        if ((lw.active && lw.x >= smasher.x) || (rw.active && rw.x <= smasher.x)) {
          smasher.crossed = true;

          // Mastery — Metal Detector: the player's atom smash activates any exposed
          // ancient rod its walls swept over, turning it into a laser turret.
          if (owner === 'player' && this.arena.masteryActive) this.activateAncientRods(smasher.y);

          const aeoRadius = 120;
          const aeoDist = Phaser.Math.Distance.Between(smasher.x, smasher.y, target.x, target.y);
          if (aeoDist <= aeoRadius) {
            // Anyone caught in the crusher takes 35.
            const hx = target.x, hy = target.y;
            target.takeDamage(35);
            this.fx(owner).boom(hx, hy, 90, { color: MAGNET.red, shrapnel: 10, mark: false });
            if (owner === 'player') this.arena.recordMasteryStat('atomSmashes', 1);
            // Implanted enemies get their nails ripped out for +30 damage.
            const ripped = this.removeImplantedNails(owner);
            if (ripped > 0) {
              target.takeDamage(30);
              this.arena.showFloatingText(target.x, target.y - 54, '🔩 IMPLANT CRUSHED +30', '#ffd060');
            }
          }
          // The plates meeting: everything caught between them comes apart at once. Q+ Forged
          // Rods is re-tempering every rod in the blast, so the crush is visibly a bigger event
          // — wider, longer, more metal thrown, and a harder shake — not merely a stronger one.
          const forged = owner === 'player' && this.arena.hasUpgrade('q');
          this.fx(owner).boom(smasher.x, smasher.y, forged ? 210 : 150, {
            color: forged ? MAGNET.blue : MAGNET.hot,
            shrapnel: forged ? 26 : 16,
            duration: forged ? 620 : 480,
          });
          scene.cameras.main.shake(forged ? 460 : 320, forged ? 0.013 : 0.009);
          this.arena.showFloatingText(smasher.x, smasher.y - 40, '💥 COMPACTED', '#aabbcc');

          for (const rod of this.magnetRods) {
            if (rod.owner !== owner) continue;
            const rodDist = Phaser.Math.Distance.Between(smasher.x, smasher.y, rod.x, rod.y);
            if (rodDist <= 200) {
              // Electromagnet: the compaction charges the rod instead of flinging it. It keeps
              // its place on the floor and becomes a live hazard — and with the Smasher enhanced
              // the charge never leaks away.
              if (this.arena.hasPerk(owner, 'electromagnet')) {
                const permanent = owner === 'player' ? this.arena.hasUpgrade('q') : false;
                rod.chargedUntil = permanent ? Infinity : time + ELECTROMAGNET_CHARGE_MS;
                rod.nextZapAt = time + Math.random() * ELECTROMAGNET_ZAP_GAP_MS;
                this.fx(owner).sparks(rod.x, rod.y, 7, Math.random() * Math.PI * 2, 10, MAGNET.spark);
                this.arena.showFloatingText(rod.x, rod.y - 24,
                  permanent ? '⚡ CHARGED' : '⚡ Charged', '#66ccff');
                continue;
              }
              rod.bouncing = true;
              rod.bounceUntil = time + 3000;
              // Fling ballistically in scattered directions — they ricochet off walls.
              const bounceAng = Math.atan2(rod.y - smasher.y, rod.x - smasher.x) + (Math.random() - 0.5) * 1.4;
              const speed = 750 + Math.random() * 300;
              rod.vx = Math.cos(bounceAng) * speed;
              rod.vy = Math.sin(bounceAng) * speed;
              // Q+: Forged Rods — permanent bonus + blue-glow bounce window.
              if (this.arena.hasUpgrade('q')) rod.permDamageBonus += 2;
            }
          }
        }
      }

      // Clean up smasher once all walls are gone
      if (!anyActive) {
        if (isPlayer) this.magnetPlayerAtomSmasher = null;
        else this.magnetNpcAtomSmasher = null;
      }
    }
  }

  private updateMagnetMagnetized(time: number, delta: number): void {
    const { player, npc } = this.arena;

    // The field tell itself is a MagnetAura, built and torn down in updateAvatars; all that
    // is left here is expiring the state it reads.
    if (this.magnetNpcMagnetized && time > this.magnetNpcMagnetizedUntil) {
      this.magnetNpcMagnetized = false;
    }
    if (this.magnetPlayerMagnetized && time > this.magnetPlayerMagnetizedUntil) {
      this.magnetPlayerMagnetized = false;
    }

    // F+: Copper Barrage — spawn a copper rod from magnetized enemy toward caster
    if (this.arena.hasUpgrade('f')) {
      if (this.magnetNpcMagnetized) {
        this.magnetCopperSpawnAccumPlayer += delta;
        if (this.magnetCopperSpawnAccumPlayer >= 1200) {
          this.magnetCopperSpawnAccumPlayer = 0;
          const ang = Math.atan2(player.y - npc.y, player.x - npc.x) + (Math.random() - 0.5) * 0.6;
          const speed = 250;
          const copper: MagnetRod = {
            kind: 'copper',
            x: npc.x, y: npc.y,
            vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed,
            contactCooldownPlayer: 0, contactCooldownNpc: 0,
            bouncing: false, bounceUntil: 0,
            owner: 'player',
            destroyOnHit: true,
            permDamageBonus: 0,
            isSword: false,
          };
          this.magnetRods.push(copper);
          this.pfx.sparks(npc.x, npc.y, 4, ang, 10, MAGNET.copperHi);
        }
      } else {
        this.magnetCopperSpawnAccumPlayer = 0;
      }
    }

    void delta;
  }

  private updateMagnetSpeedBuff(time: number): void {
    if (time < this.magnetPlayerSpeedBuffUntil) {
      // Speed buff applied passively via arena speed mult
    }
    if (time < this.magnetNpcSpeedBuffUntil) {
      // NPC speed boost handled in AI speed mult
    }
    void time;
  }

  // ── Upgrade ability implementations ──────────────────────────────

  private doMagnetRepulse(mx: number, my: number, owner: 'player' | 'npc'): void {
    const { player, npc } = this.arena;
    const caster = owner === 'player' ? player : npc;
    const target = owner === 'player' ? npc : player;
    const repulseRange = 320;

    // VFX
    // Reversing polarity: the field lines flip and shove everything metal away.
    const fx = this.fx(owner);
    fx.pulse(caster.x, caster.y, repulseRange * 0.55, MAGNET.blush, 400, 6, 14);
    fx.flash(caster.x, caster.y, 22, 8, MAGNET.blush);
    this.avatar(owner)?.play('clap');
    this.arena.showFloatingText(caster.x, caster.y - 30, '💢 REPULSE', '#ff4466');

    void mx; void my;

    // Knock rods outward from caster
    for (const rod of this.magnetRods) {
      if (rod.owner !== owner) continue;
      const dist = Phaser.Math.Distance.Between(rod.x, rod.y, caster.x, caster.y);
      if (dist <= repulseRange) {
        const ang = Math.atan2(rod.y - caster.y, rod.x - caster.x);
        rod.vx = Math.cos(ang) * 680;
        rod.vy = Math.sin(ang) * 680;
      }
    }

    // Knock back nailed enemy
    const nail = owner === 'player' ? this.magnetPlayerNail : this.magnetNpcNail;
    const nails = owner === 'player' ? this.magnetPlayerNails : this.magnetNpcNails;
    const hasNailed = (nail && nail.inEnemy) || nails.some(n => n.inEnemy);
    if (hasNailed && !target.knockbackImmune) {
      const ang = Math.atan2(target.y - caster.y, target.x - caster.x);
      const body = target.body as Phaser.Physics.Arcade.Body;
      body.setVelocity(Math.cos(ang) * 500, Math.sin(ang) * 500);
    }

    // Shove opponent if inside caster's orb ring
    const orbArray = owner === 'player' ? this.magnetPlayerShieldOrbs : this.magnetNpcShieldOrbs;
    const orbitRadius = 52 + 28; // orb radius + target radius
    const distToTarget = Phaser.Math.Distance.Between(caster.x, caster.y, target.x, target.y);
    if (orbArray.length > 0 && distToTarget <= orbitRadius && !target.knockbackImmune) {
      const ang = Math.atan2(target.y - caster.y, target.x - caster.x);
      const body = target.body as Phaser.Physics.Arcade.Body;
      body.setVelocity(Math.cos(ang) * 600, Math.sin(ang) * 600);
    }
  }

  private doMagnetReflectBurst(owner: 'player' | 'npc'): void {
    const { player, npc, scene } = this.arena;
    const caster = owner === 'player' ? player : npc;
    const orbArray = owner === 'player' ? this.magnetPlayerShieldOrbs : this.magnetNpcShieldOrbs;

    // Consume 3 orbs
    for (let i = 0; i < 3; i++) orbArray.pop();

    // Set reflect state
    if (owner === 'player') {
      this.magnetReflectUntilPlayer = scene.time.now + 1500;
      this.magnetReflectCenterPlayerX = caster.x;
      this.magnetReflectCenterPlayerY = caster.y;
    } else {
      this.magnetReflectUntilNpc = scene.time.now + 1500;
      this.magnetReflectCenterNpcX = caster.x;
      this.magnetReflectCenterNpcY = caster.y;
    }

    // Three bearings spent to slam a shell up around you.
    const fx = this.fx(owner);
    fx.pulse(caster.x, caster.y, 180, MAGNET.sky, 520, 6, 14);
    fx.flash(caster.x, caster.y, 40, 8, MAGNET.azure);
    this.avatar(owner)?.play('flex');
    this.arena.showFloatingText(caster.x, caster.y - 40, '🔵 REFLECT FIELD', '#4488cc');
  }

  private updateMagnetReflectBurst(time: number): void {
    const { projectiles } = this.arena;
    if (!projectiles) return;

    for (const [untilTime, cx, cy, isPlayer] of [
      [this.magnetReflectUntilPlayer, this.magnetReflectCenterPlayerX, this.magnetReflectCenterPlayerY, true],
      [this.magnetReflectUntilNpc, this.magnetReflectCenterNpcX, this.magnetReflectCenterNpcY, false],
    ] as [number, number, number, boolean][]) {
      if (time > untilTime) continue;
      const reflectRadius = 180;
      const projOwner = isPlayer ? 'npc' : 'player'; // reflect enemy projectiles

      for (const go of projectiles.getChildren()) {
        const proj = go as unknown as Projectile;
        if (!proj.active) continue;
        const isEnemyProj = isPlayer ? !proj.isFromPlayer : proj.isFromPlayer;
        if (!isEnemyProj) continue;
        const d = Phaser.Math.Distance.Between(proj.x, proj.y, cx, cy);
        if (d <= reflectRadius) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (proj as any).isFromPlayer = isPlayer;
          void projOwner;
          const body = proj.body as Phaser.Physics.Arcade.Body | null;
          if (body) body.setVelocity(-body.velocity.x, -body.velocity.y);
          // The shell visibly hitting back at the point the shot turned round.
          (isPlayer ? this.pfx : this.nfx).sparks(proj.x, proj.y, 4, Math.atan2(cy - proj.y, cx - proj.x) + Math.PI, 10, MAGNET.sky);
        }
      }
    }
  }

  // ── Mastery — Metal Detector (ancient rods) ───────────────────────────

  private ensureAncientRods(): void {
    if (this.ancientRodsInit || !this.arena.masteryActive) return;
    this.ancientRodsInit = true;
    const W = this.arena.scene.scale.width, H = this.arena.scene.scale.height;
    for (let i = 0; i < ANCIENT_ROD_COUNT; i++) {
      this.ancientRods.push({
        hx: Phaser.Math.Between(80, W - 80),
        hy: Phaser.Math.Between(80, H - 80),
        exposed: false, activated: false, laserAccum: 0, rod: null,
      });
    }
  }

  /** A mag-pulse landing on a hidden ancient rod exposes it — it becomes a real, brown rod. */
  private tryExposeAncientRod(x: number, y: number): void {
    for (const ar of this.ancientRods) {
      if (ar.exposed) continue;
      if (Phaser.Math.Distance.Between(x, y, ar.hx, ar.hy) > ANCIENT_EXPOSE_RADIUS) continue;
      ar.exposed = true;
      const rod: MagnetRod = {
        kind: 'ancient', x: ar.hx, y: ar.hy, vx: 0, vy: 0,
        contactCooldownPlayer: 0, contactCooldownNpc: 0, bouncing: false, bounceUntil: 0,
        owner: 'player', permDamageBonus: 0,
      };
      ar.rod = rod;
      this.magnetRods.push(rod);
      this.arena.showFloatingText(ar.hx, ar.hy - 20, '⛏ ANCIENT ROD!', '#bb8844');
      // Dug up: dirt and filings blown off whatever was buried there.
      this.pfx.flash(ar.hx, ar.hy, 20, 8, MAGNET.bronzeHi);
      this.pfx.shrapnel(ar.hx, ar.hy, 6, { speed: 170, size: 8, color: MAGNET.bronze, depth: 8 });
      this.pfx.filingsMark(ar.hx, ar.hy, 34, 3, MAGNET.bronzeHi);
    }
  }

  /** The player's atom smash sweeping over an exposed ancient rod turns it into a laser turret. */
  private activateAncientRods(smasherY: number): void {
    for (const ar of this.ancientRods) {
      if (!ar.exposed || ar.activated || !ar.rod) continue;
      if (Math.abs(ar.rod.y - smasherY) > ANCIENT_ACTIVATE_Y_BAND) continue;
      ar.activated = true;
      ar.rod.kind = 'ancient-live';
      // Coming online: the rod's own field snaps up around it.
      this.pfx.pulse(ar.rod.x, ar.rod.y, 60, MAGNET.amber, 460, 7, 10);
      this.arena.showFloatingText(ar.rod.x, ar.rod.y - 24, '⚡ ROD ONLINE', '#ffcc44');
    }
  }

  private updateMasteryMetalDetector(_time: number, delta: number): void {
    if (!this.arena.masteryActive) return;
    this.ensureAncientRods();
    const { npc } = this.arena;
    // Only fires at an enemy with magnetic properties: magnetized, or carrying our nails.
    const npcMagnetic = this.magnetNpcMagnetized || this.countImplantedNails('player') > 0;
    for (const ar of this.ancientRods) {
      if (!ar.activated || !ar.rod) continue;
      ar.laserAccum += delta;
      if (ar.laserAccum < ANCIENT_LASER_INTERVAL_MS) continue;
      ar.laserAccum -= ANCIENT_LASER_INTERVAL_MS;
      if (!npcMagnetic || !npc.active || npc.hp <= 0) continue;
      const hx = npc.x, hy = npc.y;
      npc.takeDamage(ANCIENT_LASER_DAMAGE);
      this.pfx.laser(ar.rod.x, ar.rod.y, hx, hy, MAGNET.amber);
      this.arena.showFloatingText(npc.x, npc.y - 30, `⚡ ${ANCIENT_LASER_DAMAGE}`, '#ffcc44');
    }
  }

  // ── Mastery — Mag-Lev ─────────────────────────────────────────────────

  private magLevSlot(): 'e' | 'r' | 'f' | 'q' | null {
    for (const s of ['e', 'r', 'f', 'q'] as const) {
      if (this.arena.masteryBindFor(s) === 'mag-lev') return s;
    }
    return null;
  }

  getMagLevCooldownRatio(time: number): number {
    return Math.min(1, (time - this.magLevLastMountAt) / MAGLEV_COOLDOWN_MS);
  }

  private toggleMagLev(time: number): void {
    if (this.magLevMounted) {
      this.dismountMagLev('player');
      this.arena.player.triggerCooldown('mag-lev'); // broadcast the toggle online
      return;
    }
    if (time - this.magLevLastMountAt < MAGLEV_COOLDOWN_MS) return;
    this.magLevLastMountAt = time;
    this.mountMagLev('player');
    this.arena.player.triggerCooldown('mag-lev');
  }

  /** Online replay: the remote magnet player toggled their board. */
  doNpcMagLev(): void {
    if (this.npcMagLevMounted) this.dismountMagLev('npc');
    else this.mountMagLev('npc');
  }

  private mountMagLev(owner: 'player' | 'npc'): void {
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    if (owner === 'player') {
      this.magLevMounted = true; this.magLevPreShield = caster.shieldHp;
      this.magLevBashCd = new Map();
    } else {
      this.npcMagLevMounted = true; this.npcMagLevPreShield = caster.shieldHp;
      this.npcMagLevBashCd = new Map();
    }
    caster.shieldHp += MAGLEV_SHIELD;
    // Stepping on: the cushion snaps in underneath and lifts you clear of the floor.
    const fx = this.fx(owner);
    fx.pulse(caster.x, caster.y + 16, 46, MAGNET.lilac, 420, 6, 10, true);
    fx.sparks(caster.x, caster.y + 16, 5, -Math.PI / 2, 10, MAGNET.lilac);
    this.avatar(owner)?.play('flex');
    this.arena.showFloatingText(caster.x, caster.y - 40, '🛴 MAG-LEV', '#aa66ff');
  }

  private dismountMagLev(owner: 'player' | 'npc'): void {
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    caster.shieldHp = 0; // dismounting removes all shield HP you have
    if (owner === 'player') this.magLevMounted = false;
    else this.npcMagLevMounted = false;
    // The cushion collapsing — the board comes apart into the field it was made of.
    this.fx(owner).shrapnel(caster.x, caster.y + 16, 5, { speed: 150, size: 9, color: MAGNET.violet, depth: 8 });
    this.arena.showFloatingText(caster.x, caster.y - 40, '🛴 DISMOUNT', '#8877aa');
  }

  private magLevSling(mouseX: number, mouseY: number): void {
    const p = this.arena.player;
    const dx = mouseX - p.x, dy = mouseY - p.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    (p.body as Phaser.Physics.Arcade.Body).setVelocity((dx / len) * MAGLEV_SLING_SPEED, (dy / len) * MAGLEV_SLING_SPEED);
    // Kicking off: field lines thrown backwards out from under the deck.
    const ang = Math.atan2(dy, dx);
    this.pfx.pulse(p.x, p.y + 14, 52, MAGNET.lilac, 340, 6, 8);
    this.pfx.sparks(p.x, p.y + 14, 6, ang + Math.PI, 10, MAGNET.lilac);
    this.playerAvatar?.play('dash', ang);
    this.arena.setIsDodging(true);
    this.arena.scene.time.delayedCall(200, () => this.arena.setIsDodging(false));
  }

  private updateMagLev(time: number, _delta: number): void {
    const { player, npc } = this.arena;
    if (this.magLevMounted) {
      if (player.shieldHp <= this.magLevPreShield) {
        this.dismountMagLev('player'); // board shield spent
      } else if (npc.active && npc.hp > 0
        && Phaser.Math.Distance.Between(player.x, player.y, npc.x, npc.y) <= MAGLEV_BASH_RADIUS
        && time > (this.magLevBashCd.get(npc) ?? 0)) {
        this.magLevBashCd.set(npc, time + MAGLEV_BASH_CD_MS);
        const hx = npc.x, hy = npc.y;
        npc.takeDamage(MAGLEV_BASH_DMG);
        this.pfx.sparks(hx, hy, 6, Math.atan2(hy - player.y, hx - player.x), 10, MAGNET.lilac);
        this.arena.showFloatingText(npc.x, npc.y - 30, `🛴 ${MAGLEV_BASH_DMG}`, '#cc99ff');
      }
    }
    if (this.npcMagLevMounted) {
      if (npc.shieldHp <= this.npcMagLevPreShield) {
        this.dismountMagLev('npc');
      } else if (player.active && player.hp > 0
        && Phaser.Math.Distance.Between(npc.x, npc.y, player.x, player.y) <= MAGLEV_BASH_RADIUS
        && time > (this.npcMagLevBashCd.get(player) ?? 0)) {
        this.npcMagLevBashCd.set(player, time + MAGLEV_BASH_CD_MS);
        const hx = player.x, hy = player.y;
        player.takeDamage(MAGLEV_BASH_DMG);
        this.nfx.sparks(hx, hy, 6, Math.atan2(hy - npc.y, hx - npc.x), 10, MAGNET.lilac);
      }
    }
  }
}
