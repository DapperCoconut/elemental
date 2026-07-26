import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import { Projectile } from '../../combat/Projectile';
import {
  ATTUNED_TONES, CLEAR_TONES, CRYSTAL, CrystalAvatar, CrystalColorFn, CrystalFx, CrystalHalo,
  CrystalTones, NPC_TONES, tonesFor,
} from './CrystalVisuals';

/**
 * Every crystal ability — the player's and the NPC's alike — is cast through the `do*`-style
 * methods below, so each one drives its own arm gesture right where it fires. That covers the
 * local player, the AI opponent and an online peer's replayed casts from one place, which is
 * why this kit has no separate npc-cast-id gesture table.
 */

// ── Crystal type definitions ────────────────────────────────────────────────

export interface CrystalNode {
  /** Redrawn every frame — a cut lance with a chromatic fringe and a light sliding along it. */
  gfx: Phaser.GameObjects.Graphics;
  /** Long-axis orientation, in radians. The lance is drawn perpendicular to the placing aim. */
  angleRad: number;
  /** Cross-section and length of the lance. */
  w: number;
  h: number;
  x: number;
  y: number;
  owner: 'player' | 'npc';
  vx: number;
  vy: number;
  moving: boolean;
  targetX: number; // destination to stop at (non-E+); Infinity = keep going
  targetY: number;
  lastPortalTime: number; // prevents re-entry on same portal frame
  isGateway?: boolean;    // Gateway quad perk: passthrough + beam-widen instead of bounce
  // R+ Lattice Lace state
  attuned?: boolean;          // purple/longer/slower; can no longer be halted by E
  attuneSpeed?: number;       // fixed post-attune travel speed (set once, reused on re-redirects)
  attuneFrozenUntil?: number; // paused & pointing at attuneOwner's aim until this timestamp, then redirects
  attuneOwner?: 'player' | 'npc'; // whose aim point to redirect toward
  circling?: boolean;         // orbiting an enemy it collided with
  circlingUntil?: number;
  circlingAngle?: number;
  circlingRadius?: number;
  resumeVx?: number;          // velocity to resume once the orbit ends
  resumeVy?: number;
  hasOrbited?: boolean;       // already locked onto an enemy once — can't attach again
}

export interface CrystalPortalGate {
  /** Redrawn every frame — an aperture falling inward inside a ring of standing prisms. */
  gfx: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
  /** Gate colour: violet for A, magenta for B, gray while the laser link is on cooldown. */
  hue: number;
  x: number;
  y: number;
  owner: 'player' | 'npc';
}

export interface CrystalClone {
  /** Repositioned and repainted every frame — a hollow prism figure, visibly an illusion. */
  sprite: Phaser.GameObjects.Graphics;
  hp: number;
  maxHp: number;
  baseOffsetX: number; // offset in "player-faces-up" local space
  baseOffsetY: number;
  offsetX: number;     // current world-space offset (updated per frame)
  offsetY: number;
  hpBar: Phaser.GameObjects.Rectangle;
  hpBg: Phaser.GameObjects.Rectangle;
  dirIndicator: Phaser.GameObjects.Rectangle;
}

// ── Arena API interface ────────────────────────────────────────────────────

export interface CrystalArenaApi {
  readonly player: Fighter;
  readonly npc: Fighter;
  readonly enemies: Fighter[];
  readonly scene: Phaser.Scene;
  readonly projectiles: Phaser.Physics.Arcade.Group;
  readonly eKey: Phaser.Input.Keyboard.Key;
  readonly fKey: Phaser.Input.Keyboard.Key;
  readonly rKey: Phaser.Input.Keyboard.Key;
  readonly qKey: Phaser.Input.Keyboard.Key;
  readonly nukeChanneling: boolean;
  readonly elementId: string;
  readonly npcElementId: string;
  hasUpgrade(slot: string): boolean;
  hasPerk(owner: 'player' | 'npc', perkId: string): boolean;
  /** Cosmetics: maps a crystal visual color through the owner's color cosmetic. */
  crystalColor(owner: 'player' | 'npc', base: number): number;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  buildPlayerContext(x: number, y: number): CastContext;
  /** True only when the player is crystal AND Crystal Mastery is switched on. */
  get masteryActive(): boolean;
  /** Mastery enhancement id bound over the given ability slot, or null if that slot is unchanged. */
  masteryBindFor(slot: string): string | null;
  recordMasteryStat(key: string, amount: number): void;
}

interface CrystalShredder {
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;
  moving: boolean;
  angle: number;
  radius: number;
  shardCount: number;
  shardsAlive: boolean[];
  /** Redrawn every frame — hub, blades, motion blur and the parked reticle all come from here. */
  gfx: Phaser.GameObjects.Graphics;
  spawnAt: number;
  /** Throttles the dust the chakram sheds while it is travelling. */
  trailAccum: number;
  /** 'player' chakrams shred enemies; 'npc' (online replay) shreds the local player. */
  owner: 'player' | 'npc';
}

// ── CrystalKit ────────────────────────────────────────────────────────────

export class CrystalKit {
  // ── Visuals ───────────────────────────────────────────────────────────
  /** Colour mappers + effect painters, one per owner so a colour cosmetic recolours one side. */
  private readonly pcol: CrystalColorFn;
  private readonly ncol: CrystalColorFn;
  private readonly pfx: CrystalFx;
  private readonly nfx: CrystalFx;
  /** The crystal character rig (gem arms, eyes, prism crown) for each crystal fighter. */
  private playerAvatar: CrystalAvatar | null = null;
  private npcAvatar: CrystalAvatar | null = null;
  /** Last aim point, cached in handleInput so the per-frame avatar update can face it. */
  private aimX = 0;
  private aimY = 0;
  private kiteGlintAccum = 0;
  /** Crystal Mastery — Resonance: an always-on prism halo while mastery is enabled. */
  private masteryHalo: CrystalHalo | null = null;

  // Crystal — player
  private crystalNodes: CrystalNode[] = [];
  private crystalPortals: CrystalPortalGate[] = [];
  private crystalClones: CrystalClone[] = [];
  private crystalTrickEnd = 0;
  private crystalPortalCooldown = 0;
  // Crystal — NPC
  private npcCrystalNodes: CrystalNode[] = [];
  private npcCrystalPortals: CrystalPortalGate[] = [];
  private npcCrystalClones: CrystalClone[] = [];
  private npcCrystalTrickEnd = 0;
  private npcCrystalPortalCooldown = 0;
  // Crystal — upgrade state
  private crystalRealmActive = false;              // Click+: Crystal Realm mode (walls act as mirrors)
  private crystalRealmGfx: Phaser.GameObjects.Graphics | null = null; // Click+: blue wall visual
  private crystalPortalLaserCooldown = -99999;     // cooldown for shooting through portal
  private npcCrystalPortalLaserCooldown = -99999;
  private crystalPortalSpeedBuffUntil = -99999;    // F+: speed boost after teleport

  // Diamond Shard (kite projectile) per-projectile bounce state
  private kiteState = new Map<Projectile, {
    lastBounceObj: CrystalNode | CrystalPortalGate | null;
    trailing: boolean;
    trailAccum: number;
    hadWallBounce?: boolean;     // spawned with a wall-bounce charge (Shredder upgrade) — lets Atune know it's eligible for a refresh
    frozenUntil?: number;        // Atune: stopped in place until this timestamp, then launches at attuneOwner's cursor/target
    attuneOwner?: 'player' | 'npc';
    bounceCount?: number;        // Mastery: how many times this shard has bounced off a wall or crystal
  }>();
  // Targets already pierced by a given kite, so a single pass can't multi-tick the same enemy
  private kitePierceHitSets = new Map<Projectile, Set<Fighter>>();

  // ── Crystal Mastery state ───────────────────────────────────────────────
  private shardOverloadArmed = false;               // Overload requirement: edge-triggered latch on 25+ shards
  private resonanceSpeedUntil = -99999;              // Resonance passive: 3x speed window
  private shredders: CrystalShredder[] = [];         // Crystal Shredder bindable (player + Trick of the Light minis)
  private shredderLastCastAt = -Infinity;
  private shredderRelaunchRequested = false;         // Atune (R) requests an idle shredder be relaunched at the cursor

  constructor(private arena: CrystalArenaApi) {
    this.pcol = (base) => arena.crystalColor('player', base);
    this.ncol = (base) => arena.crystalColor('npc', base);
    this.pfx = new CrystalFx(arena.scene, this.pcol);
    this.nfx = new CrystalFx(arena.scene, this.ncol);
    // Wall bounce (Crystal Realm / Shredder upgrade): a player-fired kite may bounce off
    // the arena bounds exactly once (×1.5 dmg), then wall collision is disabled for it so
    // it exits normally next time — mirror bounces stay unlimited, only the wall is capped.
    // Registered once — the kit itself is only constructed once per ArenaScene lifetime
    // (see wiring in ArenaScene.create()).
    this.arena.scene.physics.world.on('worldbounds', (body: Phaser.Physics.Arcade.Body) => {
      const go = body.gameObject;
      if (go instanceof Projectile && go.active && go.texture.key === 'proj-crystal-kite' && go.isFromPlayer) {
        go.damage = Math.round(go.damage * 1.5);
        this.arena.spawnHitFlash(go.x, go.y, CRYSTAL.prism);
        // A wall bounce is a reflection, so it flares like one.
        this.pfx.glint(go.x, go.y, 34, 9, CLEAR_TONES);
        this.pfx.shards(go.x, go.y, 4, { speed: 120, size: 2.4, life: 340, fall: 20, depth: 8 });
        this.arena.showFloatingText(go.x, go.y - 16, '💎 ×1.5', '#88eeff');
        const st = this.kiteState.get(go);
        if (st) st.bounceCount = (st.bounceCount ?? 0) + 1;
        // One wall bounce only — disable further wall collision so the next time it
        // reaches the bounds it exits the arena for good (mirror bounces stay unlimited).
        body.setCollideWorldBounds(false);
      }
    });
  }

  // ── Public accessors ──────────────────────────────────────────────────

  /** Colour mapper for a side. */
  private col(owner: 'player' | 'npc'): CrystalColorFn { return owner === 'player' ? this.pcol : this.ncol; }
  /** Effect painter for a side. */
  private fx(owner: 'player' | 'npc'): CrystalFx { return owner === 'player' ? this.pfx : this.nfx; }

  /**
   * Builds (on first frame) and drives the gem-arm avatar for whichever fighters are crystal.
   * The player faces the cursor; the NPC faces whoever it is fighting. The mastery passive's
   * prism halo lives here too, at a lower depth than anything a cast raises, so the two stack
   * into one silhouette rather than fighting each other.
   */
  private updateAvatars(delta: number): void {
    const { player, npc, scene, elementId, npcElementId } = this.arena;

    if (elementId === 'crystal' && player?.active) {
      if (!this.playerAvatar) this.playerAvatar = new CrystalAvatar(scene, this.pcol, CLEAR_TONES);
      const aimX = this.aimX || player.x + 1;
      const aimY = this.aimY || player.y;
      this.playerAvatar.setFacing(Math.atan2(aimY - player.y, aimX - player.x));
      // Standing inside your own lattice or fielding mirages is the character at full stretch.
      this.playerAvatar.setIntensity(this.crystalClones.length > 0 ? 1.35 : this.crystalNodes.length >= 4 ? 1.15 : 1);
      this.playerAvatar.setMastered(this.arena.masteryActive);
      this.playerAvatar.update(delta, player.x, player.y, player.forceInvisible ? 0 : player.alpha);

      if (this.arena.masteryActive) {
        if (!this.masteryHalo) this.masteryHalo = new CrystalHalo(scene, this.pcol, CLEAR_TONES, 44, 0.75, 2, 6);
        this.masteryHalo.update(delta, player.x, player.y, player.alpha);
      } else if (this.masteryHalo) {
        this.masteryHalo.destroy();
        this.masteryHalo = null;
      }
    } else if (this.playerAvatar) {
      this.playerAvatar.destroy();
      this.playerAvatar = null;
      if (this.masteryHalo) { this.masteryHalo.destroy(); this.masteryHalo = null; }
    }

    if (npcElementId === 'crystal' && npc?.active) {
      if (!this.npcAvatar) this.npcAvatar = new CrystalAvatar(scene, this.ncol, NPC_TONES);
      this.npcAvatar.setFacing(Math.atan2(player.y - npc.y, player.x - npc.x));
      this.npcAvatar.setIntensity(this.npcCrystalClones.length > 0 ? 1.35 : 1);
      this.npcAvatar.update(delta, npc.x, npc.y, npc.forceInvisible ? 0 : npc.alpha);
    } else if (this.npcAvatar) {
      this.npcAvatar.destroy();
      this.npcAvatar = null;
    }
  }

  /** Every live Diamond Shard twinkles as it flies, so a screen full of them still reads. */
  private updateKiteGlints(delta: number): void {
    this.kiteGlintAccum += delta;
    if (this.kiteGlintAccum < 120) return;
    this.kiteGlintAccum = 0;
    for (const child of this.arena.projectiles.getChildren()) {
      const proj = child as Projectile;
      if (!proj.active || proj.texture?.key !== 'proj-crystal-kite') continue;
      // Only a fraction each tick — glinting every shard every tick is a light show, not a tell.
      if (Math.random() > 0.35) continue;
      const fx = proj.isFromPlayer ? this.pfx : this.nfx;
      fx.dust(proj.x, proj.y, 1, 8, 5, proj.isFromPlayer ? CLEAR_TONES : NPC_TONES);
    }
  }

  getPortalSpeedBuffUntil(): number { return this.crystalPortalSpeedBuffUntil; }
  getNpcCrystalNodeCount(): number { return this.npcCrystalNodes.length; }

  reset(): void {
    // Visuals — every GameObject dies with the old scene run, so rebuild lazily in update().
    if (this.playerAvatar) { this.playerAvatar.destroy(); this.playerAvatar = null; }
    if (this.npcAvatar) { this.npcAvatar.destroy(); this.npcAvatar = null; }
    if (this.masteryHalo) { this.masteryHalo.destroy(); this.masteryHalo = null; }
    this.aimX = 0;
    this.aimY = 0;
    this.kiteGlintAccum = 0;

    for (const n of this.crystalNodes) n.gfx.destroy();
    for (const p of this.crystalPortals) { p.gfx.destroy(); p.label.destroy(); }
    for (const c of this.crystalClones) { c.sprite.destroy(); c.hpBar.destroy(); c.hpBg.destroy(); c.dirIndicator.destroy(); }
    this.crystalNodes = []; this.crystalPortals = []; this.crystalClones = [];
    this.crystalTrickEnd = 0;
    this.crystalPortalCooldown = 0;
    this.crystalRealmActive = false;
    if (this.crystalRealmGfx) { this.crystalRealmGfx.destroy(); this.crystalRealmGfx = null; }
    this.crystalPortalLaserCooldown = -99999; this.crystalPortalSpeedBuffUntil = -99999;

    for (const n of this.npcCrystalNodes) n.gfx.destroy();
    for (const p of this.npcCrystalPortals) { p.gfx.destroy(); p.label.destroy(); }
    for (const c of this.npcCrystalClones) { c.sprite.destroy(); c.hpBar.destroy(); c.hpBg.destroy(); c.dirIndicator.destroy(); }
    this.npcCrystalNodes = []; this.npcCrystalPortals = []; this.npcCrystalClones = [];
    this.npcCrystalTrickEnd = 0;
    this.npcCrystalPortalCooldown = 0; this.npcCrystalPortalLaserCooldown = -99999;

    this.kiteState.clear();
    this.kitePierceHitSets.clear();

    this.shardOverloadArmed = false;
    this.resonanceSpeedUntil = -99999;
    for (const s of this.shredders) s.gfx.destroy();
    this.shredders = [];
    this.shredderLastCastAt = -Infinity;
    this.shredderRelaunchRequested = false;
  }

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    const { player, eKey, fKey, rKey, qKey } = this.arena;
    const playerCtx = this.arena.buildPlayerContext(mouseX, mouseY);
    const playerBody = player.body as Phaser.Physics.Arcade.Body;
    // Cached for the avatar rig, which runs in update() and has no pointer of its own.
    this.aimX = mouseX;
    this.aimY = mouseY;

    if (this.arena.nukeChanneling) return;

    // Click+: Crystal Realm (walls act as mirrors) is always on while the upgrade is owned
    this.crystalRealmActive = this.arena.hasUpgrade('click');
    if (pointer.isDown) {
      player.castAbility('crystal-laser', playerCtx);
    }

    // ── Crystal Mastery — Crystal Shredder takes over whichever slot it's bound to ──
    const shredderSlot = this.arena.masteryActive ? this.shredderSlot() : null;
    if (shredderSlot) {
      const sKey = shredderSlot === 'e' ? eKey : shredderSlot === 'r' ? rKey : shredderSlot === 'f' ? fKey : qKey;
      if (Phaser.Input.Keyboard.JustDown(sKey)) {
        this.tryCastShredder(time, mouseX, mouseY);
      }
    }

    if (shredderSlot !== 'e' && Phaser.Input.Keyboard.JustDown(eKey)) {
      // E+: if any halt-able (non-attuned) moving crystals exist, halt them; otherwise place a new one.
      // R+ Lattice Lace: an attuned crystal can no longer be halted by E — recasting just adds another.
      if (this.arena.hasUpgrade('e') && this.crystalNodes.some((n) => n.moving && !n.attuned)) {
        for (const n of this.crystalNodes) {
          if (n.moving && !n.attuned) { n.vx = 0; n.vy = 0; n.moving = false; }
        }
      } else {
        player.castAbility('crystal-place', playerCtx);
      }
    }
    if (shredderSlot !== 'r' && Phaser.Input.Keyboard.JustDown(rKey)) {
      player.castAbility('crystal-atune', playerCtx);
    }
    if (shredderSlot !== 'f' && Phaser.Input.Keyboard.JustDown(fKey)) {
      // F+: with 2 portals active → teleport to nearest portal instead of placing a new one
      const playerPortals = this.crystalPortals.filter((p) => p.owner === 'player');
      if (this.arena.hasUpgrade('f') && playerPortals.length >= 2 && time - this.crystalPortalCooldown > 1000) {
        let nearest = playerPortals[0];
        let nearestDist = Phaser.Math.Distance.Between(player.x, player.y, nearest.x, nearest.y);
        for (const p of playerPortals) {
          const d = Phaser.Math.Distance.Between(player.x, player.y, p.x, p.y);
          if (d < nearestDist) { nearestDist = d; nearest = p; }
        }
        const fromX = player.x, fromY = player.y;
        player.setPosition(nearest.x, nearest.y);
        playerBody.setVelocity(0, 0);
        this.crystalPortalCooldown = time;
        this.crystalPortalSpeedBuffUntil = time + 3000;
        this.playerAvatar?.play('dash', Math.atan2(nearest.y - fromY, nearest.x - fromX));
        this.pfx.translate(fromX, fromY, nearest.x, nearest.y, 5, CLEAR_TONES);
        this.arena.showFloatingText(nearest.x, nearest.y - 30, '⚡ PORTAL DASH', '#cc88ff');
      } else {
        player.castAbility('crystal-portal', playerCtx);
      }
    }
    if (shredderSlot !== 'q' && Phaser.Input.Keyboard.JustDown(qKey)) {
      player.castAbility('crystal-trick', playerCtx);
    }
  }

  update(time: number, delta: number, mouseX: number, mouseY: number): void {
    if (this.arena.elementId !== 'crystal' && this.arena.npcElementId !== 'crystal') return;

    const { player, npc, scene } = this.arena;
    this.updateAvatars(delta);
    this.updateKiteGlints(delta);
    const allCrystals = [...this.crystalNodes, ...this.npcCrystalNodes];
    const allActiveProj = this.arena.projectiles.getChildren();

    // Move crystal nodes (all nodes travel from spawn, stop at target unless E+)
    const ATTUNE_ORBIT_RADIUS = 70, ATTUNE_ORBIT_MS = 8000, ATTUNE_ORBIT_SPEED = 2.4; // rad/s
    const ATTUNE_HIT_R = 24;
    for (const node of [...this.crystalNodes, ...this.npcCrystalNodes]) {
      // R+ Lattice Lace: orbiting an enemy it collided with — position is driven by the
      // orbit, not vx/vy, until the 8s window ends and it resumes its prior heading.
      if (node.circling) {
        const target = node.owner === 'player' ? npc : player;
        if (time < node.circlingUntil!) {
          node.circlingAngle = (node.circlingAngle ?? 0) + ATTUNE_ORBIT_SPEED * (delta / 1000);
          node.x = target.x + Math.cos(node.circlingAngle) * node.circlingRadius!;
          node.y = target.y + Math.sin(node.circlingAngle) * node.circlingRadius!;
          node.angleRad = node.circlingAngle;
          continue;
        }
        node.circling = false;
        node.circlingUntil = undefined; node.circlingRadius = undefined; node.circlingAngle = undefined;
        node.vx = node.resumeVx ?? 0; node.vy = node.resumeVy ?? 0;
        node.resumeVx = undefined; node.resumeVy = undefined;
        node.moving = true;
      }

      // R+ Lattice Lace: paused, pointing at the owner's aim, until it redirects and launches
      if (node.attuneFrozenUntil !== undefined) {
        const aimX = node.attuneOwner === 'player' ? mouseX : player.x;
        const aimY = node.attuneOwner === 'player' ? mouseY : player.y;
        node.angleRad = Math.atan2(aimY - node.y, aimX - node.x);
        if (time < node.attuneFrozenUntil) continue;
        const adx = aimX - node.x, ady = aimY - node.y;
        const alen = Math.hypot(adx, ady) || 1;
        const speed = node.attuneSpeed ?? 100.5;
        node.vx = (adx / alen) * speed; node.vy = (ady / alen) * speed;
        node.attuneFrozenUntil = undefined;
        node.attuneOwner = undefined;
        node.moving = true;
      }

      if (node.moving) {
        node.x += node.vx * (delta / 1000);
        node.y += node.vy * (delta / 1000);
        // Stop at target (non-E+ base behavior)
        if (isFinite(node.targetX)) {
          const toTargetX = node.targetX - node.x, toTargetY = node.targetY - node.y;
          const pastTarget = (toTargetX * node.vx + toTargetY * node.vy) <= 0;
          if (pastTarget) {
            node.x = node.targetX; node.y = node.targetY;
            node.vx = 0; node.vy = 0; node.moving = false;
          }
        }
        // Stop at arena bounds
        const W = scene.scale.width, H = scene.scale.height;
        if (node.x < 10 || node.x > W - 10 || node.y < 10 || node.y > H - 10) {
          node.x = Phaser.Math.Clamp(node.x, 10, W - 10);
          node.y = Phaser.Math.Clamp(node.y, 10, H - 10);
          node.vx = 0; node.vy = 0; node.moving = false;
        }
        // R+ Lattice Lace: an attuned crystal that reaches an enemy orbits them a while —
        // but only the first time; once it's orbited once it just flies through afterward.
        if (node.attuned && node.moving && !node.hasOrbited) {
          const target = node.owner === 'player' ? npc : player;
          if (target.active && target.hp > 0 && Phaser.Math.Distance.Between(node.x, node.y, target.x, target.y) <= ATTUNE_HIT_R) {
            node.circling = true;
            node.hasOrbited = true;
            node.circlingUntil = time + ATTUNE_ORBIT_MS;
            node.circlingRadius = ATTUNE_ORBIT_RADIUS;
            node.circlingAngle = Math.atan2(node.y - target.y, node.x - target.x);
            node.resumeVx = node.vx; node.resumeVy = node.vy;
            node.vx = 0; node.vy = 0;
            this.arena.showFloatingText(node.x, node.y - 16, '💎 LOCKED ON', '#cc88ff');
          }
        }
      }
    }

    // Moving crystal nodes teleport through portals
    for (const node of this.crystalNodes) {
      if (!node.moving || this.crystalPortals.length < 2 || time - node.lastPortalTime < 500) continue;
      for (let pi = 0; pi < 2; pi++) {
        const gate = this.crystalPortals[pi];
        if (Phaser.Math.Distance.Between(node.x, node.y, gate.x, gate.y) <= 22) {
          const other = this.crystalPortals[1 - pi];
          this.fx(node.owner).translate(gate.x, gate.y, other.x, other.y, 5, tonesFor(node.owner));
          node.x = other.x; node.y = other.y;
          node.lastPortalTime = time;
          break;
        }
      }
    }
    for (const node of this.npcCrystalNodes) {
      if (!node.moving || this.npcCrystalPortals.length < 2 || time - node.lastPortalTime < 500) continue;
      for (let pi = 0; pi < 2; pi++) {
        const gate = this.npcCrystalPortals[pi];
        if (Phaser.Math.Distance.Between(node.x, node.y, gate.x, gate.y) <= 22) {
          const other = this.npcCrystalPortals[1 - pi];
          this.fx(node.owner).translate(gate.x, gate.y, other.x, other.y, 5, tonesFor(node.owner));
          node.x = other.x; node.y = other.y;
          node.lastPortalTime = time;
          break;
        }
      }
    }

    // Every node and gate is repainted from scratch once their positions have settled.
    for (const node of allCrystals) {
      node.gfx.clear();
      const tones = node.attuned ? ATTUNED_TONES : tonesFor(node.owner);
      CrystalFx.drawNode(
        node.gfx, this.col(node.owner), tones,
        node.x, node.y, node.angleRad, node.w, node.h, time / 1000, node.isGateway ?? false,
      );
    }
    for (const gate of [...this.crystalPortals, ...this.npcCrystalPortals]) {
      gate.gfx.clear();
      CrystalFx.drawPortal(
        gate.gfx, this.col(gate.owner), tonesFor(gate.owner),
        gate.x, gate.y, 18, time / 1000, gate.hue, gate.owner === 'player' ? 1 : 0.75,
      );
    }

    // Update player clone positions (rotated with player facing direction)
    const playerFacing = Math.atan2(mouseY - player.y, mouseX - player.x);
    const pfCos = Math.cos(playerFacing + Math.PI / 2), pfSin = Math.sin(playerFacing + Math.PI / 2);
    for (const cl of this.crystalClones) {
      cl.offsetX = cl.baseOffsetX * pfCos - cl.baseOffsetY * pfSin;
      cl.offsetY = cl.baseOffsetX * pfSin + cl.baseOffsetY * pfCos;
    }
    // Update NPC clone positions (rotated to face player)
    if (this.npcCrystalClones.length > 0) {
      const npcFacing = Math.atan2(player.y - npc.y, player.x - npc.x);
      const nfCos = Math.cos(npcFacing + Math.PI / 2), nfSin = Math.sin(npcFacing + Math.PI / 2);
      for (const cl of this.npcCrystalClones) {
        cl.offsetX = cl.baseOffsetX * nfCos - cl.baseOffsetY * nfSin;
        cl.offsetY = cl.baseOffsetX * nfSin + cl.baseOffsetY * nfCos;
      }
    }

    // Click+: Crystal Realm — pulsing blue border on walls while active
    if (this.arena.elementId === 'crystal' && this.arena.hasUpgrade('click')) {
      if (this.crystalRealmActive) {
        if (!this.crystalRealmGfx) this.crystalRealmGfx = scene.add.graphics().setDepth(2);
        this.crystalRealmGfx.clear();
        const pulse = 0.35 + 0.2 * Math.sin(time / 300);
        this.crystalRealmGfx.lineStyle(6, 0x44aaff, pulse);
        this.crystalRealmGfx.strokeRect(3, 3, scene.scale.width - 6, scene.scale.height - 6);
      } else if (this.crystalRealmGfx) {
        this.crystalRealmGfx.destroy(); this.crystalRealmGfx = null;
      }
    }

    // Player mirrors deflect enemy projectiles
    if (this.arena.elementId === 'crystal' && this.crystalNodes.length > 0) {
      for (const go of allActiveProj) {
        const proj = go as Projectile;
        if (!proj.active || proj.isFromPlayer) continue;
        for (const node of this.crystalNodes) {
          if (Phaser.Math.Distance.Between(proj.x, proj.y, node.x, node.y) <= 18) {
            const pb = proj.body as Phaser.Physics.Arcade.Body;
            const vx = pb.velocity.x, vy = pb.velocity.y;
            const speed = Math.sqrt(vx * vx + vy * vy) || 300;
            const pdx = vx / speed, pdy = vy / speed;
            const distN = Phaser.Math.Distance.Between(proj.x, proj.y, node.x, node.y) || 1;
            const nx = (proj.x - node.x) / distN, ny = (proj.y - node.y) / distN;
            const dot = pdx * nx + pdy * ny;
            const rdx = pdx - 2 * dot * nx, rdy = pdy - 2 * dot * ny;
            pb.stop();
            proj.setActive(false).setVisible(false);
            const reflected = new Projectile(scene, proj.x, proj.y, proj.texture.key, proj.damage, true);
            this.arena.projectiles.add(reflected);
            reflected.launch(rdx * speed, rdy * speed);
            // The mirror flares and the redirected shot leaves a visible refracted path.
            this.fx(node.owner).glint(node.x, node.y, 40, 9, tonesFor(node.owner), node.angleRad);
            this.fx(node.owner).refract(node.x, node.y, node.x + rdx * 120, node.y + rdy * 120, 8, tonesFor(node.owner));
            this.arena.showFloatingText(node.x, node.y - 14, 'DEFLECT!', '#aaeeff');
            break;
          }
        }
      }
    }

    // Enemy projectiles hitting player portals → redirect back at NPC (+50% dmg)
    if (this.arena.elementId === 'crystal' && this.crystalPortals.length === 2) {
      for (const go of allActiveProj) {
        const proj = go as Projectile;
        if (!proj.active || proj.isFromPlayer || proj.portalUsed) continue;
        for (let pi = 0; pi < 2; pi++) {
          const gate = this.crystalPortals[pi];
          if (Phaser.Math.Distance.Between(proj.x, proj.y, gate.x, gate.y) <= 22) {
            const other = this.crystalPortals[1 - pi];
            const pb = proj.body as Phaser.Physics.Arcade.Body;
            const speed = Math.sqrt(pb.velocity.x ** 2 + pb.velocity.y ** 2) || 350;
            pb.stop();
            proj.setActive(false).setVisible(false);
            const tdx = npc.x - other.x, tdy = npc.y - other.y;
            const tdist = Math.sqrt(tdx * tdx + tdy * tdy) || 1;
            const newDmg = Math.round(proj.damage * 1.5);
            const redir = new Projectile(scene, other.x, other.y, proj.texture.key, newDmg, true);
            this.arena.projectiles.add(redir);
            redir.launch((tdx / tdist) * speed, (tdy / tdist) * speed);
            redir.portalUsed = true;
            // The stolen shot visibly comes back out of the far gate, aimed at its owner.
            this.pfx.translate(gate.x, gate.y, other.x, other.y, 8, CLEAR_TONES);
            this.pfx.refract(other.x, other.y, other.x + (tdx / tdist) * 110, other.y + (tdy / tdist) * 110, 8, CLEAR_TONES);
            break;
          }
        }
      }
    }

    // NPC touching player portal → collapse portals and stun NPC 2s
    if (this.arena.elementId === 'crystal' && this.crystalPortals.some((p) => p.owner === 'player')) {
      const playerPortals = this.crystalPortals.filter((p) => p.owner === 'player');
      let portalTriggered = false;
      for (const gate of playerPortals) {
        if (Phaser.Math.Distance.Between(npc.x, npc.y, gate.x, gate.y) <= 25) {
          portalTriggered = true; break;
        }
      }
      if (portalTriggered) {
        // The gates collapse into the intruder rather than simply vanishing.
        for (const p of playerPortals) {
          this.pfx.shatter(p.x, p.y, 70, { shards: 12, dust: 2, duration: 420, tones: CLEAR_TONES });
          p.gfx.destroy(); p.label.destroy();
        }
        this.crystalPortals = this.crystalPortals.filter((p) => p.owner !== 'player');
        npc.earthStunnedUntil = Math.max(npc.earthStunnedUntil, time + 2000);
        this.arena.showFloatingText(npc.x, npc.y - 30, '💥 STUNNED', '#aa44ff');
        this.pfx.bloom(npc.x, npc.y, 44, 12, 9, ATTUNED_TONES);
        scene.cameras.main.shake(220, 0.006);
      }
    }

    // Portal teleportation — player
    const playerBody = player.body as Phaser.Physics.Arcade.Body;
    if (this.crystalPortals.length === 2 && time - this.crystalPortalCooldown > 1000) {
      for (let pi = 0; pi < 2; pi++) {
        const gate = this.crystalPortals[pi];
        const other = this.crystalPortals[1 - pi];
        if (Phaser.Math.Distance.Between(player.x, player.y, gate.x, gate.y) <= 22) {
          player.setPosition(other.x, other.y);
          playerBody.setVelocity(0, 0);
          this.crystalPortalCooldown = time;
          this.crystalPortalSpeedBuffUntil = time + 3000; // always give speed boost on teleport
          this.arena.recordMasteryStat('portalTraversals', 1);
          this.pfx.translate(gate.x, gate.y, other.x, other.y, 5, CLEAR_TONES);
          break;
        }
      }
    }

    // Portal teleportation — NPC
    if (this.npcCrystalPortals.length === 2 && time - this.npcCrystalPortalCooldown > 1000) {
      for (let pi = 0; pi < 2; pi++) {
        const gate = this.npcCrystalPortals[pi];
        const other = this.npcCrystalPortals[1 - pi];
        if (Phaser.Math.Distance.Between(npc.x, npc.y, gate.x, gate.y) <= 22) {
          npc.setPosition(other.x, other.y);
          (npc.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
          this.npcCrystalPortalCooldown = time;
          this.nfx.translate(gate.x, gate.y, other.x, other.y, 5, NPC_TONES);
          break;
        }
      }
    }

    // Portal auto-aim cooldown tint: gray while the laser link is spent, coloured when ready
    if (this.arena.elementId === 'crystal') {
      const portalColors = [CRYSTAL.violet, CRYSTAL.magenta];
      const onCd = time - this.crystalPortalLaserCooldown < 2000;
      for (let pi = 0; pi < this.crystalPortals.length; pi++) {
        this.crystalPortals[pi].hue = onCd ? 0x888888 : portalColors[pi % 2];
      }
    }

    // Player crystal clones — follow player, update HP bars, dir indicator, check incoming projectiles
    if (time > this.crystalTrickEnd && this.crystalClones.length > 0) {
      for (const cl of this.crystalClones) { cl.sprite.destroy(); cl.hpBar.destroy(); cl.hpBg.destroy(); cl.dirIndicator.destroy(); }
      this.crystalClones = [];
    } else {
      for (let ci = this.crystalClones.length - 1; ci >= 0; ci--) {
        const cl = this.crystalClones[ci];
        const cx = player.x + cl.offsetX, cy = player.y + cl.offsetY;
        cl.sprite.setPosition(cx, cy);
        cl.hpBg.setPosition(cx, cy - 28);
        const barW = Math.max(0, (cl.hp / cl.maxHp) * 30);
        cl.hpBar.setSize(barW, 4).setPosition(cx - 15 + barW / 2, cy - 28);
        // Dir indicator: rotate to face cursor
        const dirAngle = Math.atan2(mouseY - cy, mouseX - cx) * 180 / Math.PI + 90;
        cl.dirIndicator.setPosition(cx + Math.cos((dirAngle - 90) * Math.PI / 180) * 18, cy + Math.sin((dirAngle - 90) * Math.PI / 180) * 18).setAngle(dirAngle);
        // The Graphics carries the clone's world position (getClonePositions reads it), so the
        // mirage itself is painted at the local origin.
        cl.sprite.clear();
        CrystalFx.drawMirage(cl.sprite, this.pcol, CLEAR_TONES, 0, 0, 16,
          (dirAngle - 90) * Math.PI / 180, time / 1000, Phaser.Math.Clamp(cl.hp / cl.maxHp, 0.35, 1));
        // Check NPC projectile hits
        for (const go of allActiveProj) {
          const proj = go as Projectile;
          if (!proj.active || proj.isFromPlayer) continue;
          if (Phaser.Math.Distance.Between(proj.x, proj.y, cx, cy) <= 20) {
            cl.hp -= proj.damage;
            proj.setActive(false).setVisible(false);
            if (cl.hp <= 0) {
              // An illusion doesn't die — it comes apart into the facets it was made of.
              this.pfx.shatter(cx, cy, 56, { shards: 10, dust: 1, duration: 340, tones: CLEAR_TONES });
              cl.sprite.destroy(); cl.hpBar.destroy(); cl.hpBg.destroy(); cl.dirIndicator.destroy();
              this.crystalClones.splice(ci, 1);
            }
            break;
          }
        }
      }
    }

    // NPC crystal clones — follow NPC, update dir indicator, check player projectile hits
    if (time > this.npcCrystalTrickEnd && this.npcCrystalClones.length > 0) {
      for (const cl of this.npcCrystalClones) { cl.sprite.destroy(); cl.hpBar.destroy(); cl.hpBg.destroy(); cl.dirIndicator.destroy(); }
      this.npcCrystalClones = [];
    } else {
      for (let ci = this.npcCrystalClones.length - 1; ci >= 0; ci--) {
        const cl = this.npcCrystalClones[ci];
        const cx = npc.x + cl.offsetX, cy = npc.y + cl.offsetY;
        cl.hpBg.setPosition(cx, cy - 28);
        const barW = Math.max(0, (cl.hp / cl.maxHp) * 30);
        cl.hpBar.setSize(barW, 4).setPosition(cx - 15 + barW / 2, cy - 28);
        // Dir indicator: face player
        const ndAngle = Math.atan2(player.y - cy, player.x - cx) * 180 / Math.PI + 90;
        cl.dirIndicator.setPosition(cx + Math.cos((ndAngle - 90) * Math.PI / 180) * 18, cy + Math.sin((ndAngle - 90) * Math.PI / 180) * 18).setAngle(ndAngle);
        cl.sprite.setPosition(cx, cy);
        cl.sprite.clear();
        CrystalFx.drawMirage(cl.sprite, this.ncol, NPC_TONES, 0, 0, 16,
          (ndAngle - 90) * Math.PI / 180, time / 1000, Phaser.Math.Clamp(cl.hp / cl.maxHp, 0.35, 1) * 0.8);
        for (const go of allActiveProj) {
          const proj = go as Projectile;
          if (!proj.active || !proj.isFromPlayer) continue;
          if (Phaser.Math.Distance.Between(proj.x, proj.y, cx, cy) <= 20) {
            cl.hp -= proj.damage;
            proj.setActive(false).setVisible(false);
            if (cl.hp <= 0) {
              // An illusion doesn't die — it comes apart into the facets it was made of.
              this.nfx.shatter(cx, cy, 56, { shards: 10, dust: 1, duration: 340, tones: NPC_TONES });
              cl.sprite.destroy(); cl.hpBar.destroy(); cl.hpBg.destroy(); cl.dirIndicator.destroy();
              this.npcCrystalClones.splice(ci, 1);
            }
            break;
          }
        }
      }
    }

    // Diamond Shard (kite) bounce / portal / mine-trail logic
    this.updateKiteProjectiles(time, delta, mouseX, mouseY);

    // ── Crystal Mastery ──────────────────────────────────────────────────
    if (this.arena.elementId === 'crystal') {
      // Overload requirement: 25+ of the player's own shards on screen at once (edge-triggered)
      let playerShardCount = 0;
      for (const go of allActiveProj) {
        const proj = go as Projectile;
        if (proj.active && proj.isFromPlayer && proj.texture.key === 'proj-crystal-kite') playerShardCount++;
      }
      if (playerShardCount >= 25) {
        if (!this.shardOverloadArmed) {
          this.shardOverloadArmed = true;
          this.arena.recordMasteryStat('shardOverload', 1);
          this.arena.showFloatingText(player.x, player.y - 40, '💎 OVERLOAD', '#88eeff');
        }
      } else {
        this.shardOverloadArmed = false;
      }

      // Resonance passive: getting hit by one of your own (already-bounced) shards → 3x speed for 0.2s
      if (this.arena.masteryActive) {
        const RESONANCE_R = 20;
        for (const go of allActiveProj) {
          const proj = go as Projectile;
          if (!proj.active || !proj.isFromPlayer || proj.texture.key !== 'proj-crystal-kite') continue;
          const st = this.kiteState.get(proj);
          if (!st || (st.bounceCount ?? 0) < 1) continue;
          if (Phaser.Math.Distance.Between(proj.x, proj.y, player.x, player.y) <= RESONANCE_R) {
            proj.setActive(false).setVisible(false);
            (proj.body as Phaser.Physics.Arcade.Body).stop();
            this.resonanceSpeedUntil = time + 200;
            this.arena.spawnHitFlash(player.x, player.y, CRYSTAL.magenta);
            // Absorbing your own shard reads as the body drinking the light back in.
            this.pfx.glint(player.x, player.y, 46, 10, ATTUNED_TONES);
            this.pfx.dust(player.x, player.y, 5, 26, 9, ATTUNED_TONES);
            this.arena.showFloatingText(player.x, player.y - 20, '✨ RESONANCE', '#ff88ff');
          }
        }
      }

    }

    // Shredders tick for both owners so an online opponent's chakram can shred our local player.
    this.updateShredders(time, delta, mouseX, mouseY);
  }

  // ── Public do* methods — called from ArenaScene context builders ───────

  fireCrystalLaser(isPlayer: boolean, tx: number, ty: number): void {
    const { player, npc } = this.arena;
    const src = isPlayer ? player : npc;
    // Arms jab first so the shard reads as coming out of a hand.
    (isPlayer ? this.playerAvatar : this.npcAvatar)?.play('punch', Math.atan2(ty - src.y, tx - src.x));
    if (isPlayer) {
      const wallBounce = this.arena.hasUpgrade('click');
      this.spawnKite(player.x, player.y, tx, ty, 15, true, wallBounce);
      for (const cl of this.crystalClones) {
        this.spawnKite(player.x + cl.offsetX, player.y + cl.offsetY, tx, ty, 6, true, wallBounce);
      }
    } else {
      this.spawnKite(npc.x, npc.y, tx, ty, 8, false, false);
      for (const cl of this.npcCrystalClones) {
        this.spawnKite(npc.x + cl.offsetX, npc.y + cl.offsetY, tx, ty, 8, false, false);
      }
    }
  }

  placeCrystalNode(isPlayer: boolean, tx: number, ty: number): void {
    const { player, npc, scene } = this.arena;
    if (isPlayer) {
      const playerNodes = this.crystalNodes.filter((n) => n.owner === 'player');
      if (playerNodes.length >= 6) {
        // The oldest lance is pushed out of the lattice, and it breaks rather than blinking out.
        this.pfx.shatter(playerNodes[0].x, playerNodes[0].y, 44, { shards: 7, dust: 1, duration: 300, splinter: false });
        playerNodes[0].gfx.destroy();
        this.crystalNodes.splice(this.crystalNodes.indexOf(playerNodes[0]), 1);
      }
      const dx = tx - player.x, dy = ty - player.y;
      const angleRad = Math.atan2(dy, dx);
      const isGW = this.arena.hasPerk('player', 'gateway');
      const [nW, nH] = isGW ? [9, 84] : [6, 56];
      // A lance is grown out of the ground, not dropped there.
      this.playerAvatar?.play('sweep', angleRad);
      const moving = this.arena.hasUpgrade('e');
      const sx = moving ? player.x : tx, sy = moving ? player.y : ty;
      this.pfx.bloom(sx, sy, nH * 0.45, 8, 4, CLEAR_TONES);
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const speed = 134;
      this.crystalNodes.push({
        gfx: scene.add.graphics().setDepth(4),
        angleRad, w: nW, h: nH,
        x: sx, y: sy, owner: 'player',
        vx: moving ? (dx / dist) * speed : 0,
        vy: moving ? (dy / dist) * speed : 0,
        moving,
        targetX: moving ? Infinity : tx, targetY: moving ? Infinity : ty,
        lastPortalTime: -99999, isGateway: isGW,
      });
      if (isGW) this.arena.showFloatingText(sx, sy - 20, '🌀 GATEWAY', '#aaeeff');
    } else {
      if (this.npcCrystalNodes.length >= 3) {
        this.npcCrystalNodes[0].gfx.destroy();
        this.npcCrystalNodes.shift();
      }
      const ndx = tx - npc.x, ndy = ty - npc.y;
      const ndist = Math.sqrt(ndx * ndx + ndy * ndy) || 1;
      const isNpcGW = this.arena.hasPerk('npc', 'gateway');
      const [npcNW, npcNH] = isNpcGW ? [9, 84] : [6, 56];
      this.npcAvatar?.play('sweep', Math.atan2(ndy, ndx));
      this.nfx.bloom(npc.x, npc.y, npcNH * 0.45, 8, 4, NPC_TONES);
      this.npcCrystalNodes.push({
        gfx: scene.add.graphics().setDepth(4),
        angleRad: Math.atan2(ndy, ndx), w: npcNW, h: npcNH,
        x: npc.x, y: npc.y, owner: 'npc',
        vx: (ndx / ndist) * 120, vy: (ndy / ndist) * 120,
        moving: true, targetX: tx, targetY: ty, lastPortalTime: -99999, isGateway: isNpcGW,
      });
    }
  }

  /** R: stop every Diamond Shard on screen; after 2s they launch at the caster's aim point.
   * Also refreshes each shard's spent wall-bounce charge (idempotent — can't stack). */
  activateCrystalAtune(isPlayer: boolean): void {
    const { scene, player, npc } = this.arena;
    const owner: 'player' | 'npc' = isPlayer ? 'player' : 'npc';
    const now = scene.time.now;
    const rUpgrade = isPlayer && this.arena.hasUpgrade('r');
    const allProj = this.arena.projectiles.getChildren() as Projectile[];
    for (const go of allProj) {
      const proj = go as Projectile;
      if (!proj.active || proj.texture.key !== 'proj-crystal-kite') continue;
      const body = proj.body as Phaser.Physics.Arcade.Body;
      body.setVelocity(0, 0);
      let st = this.kiteState.get(proj);
      if (!st) { st = { lastBounceObj: null, trailing: false, trailAccum: 0 }; this.kiteState.set(proj, st); }
      if (st.hadWallBounce) body.setCollideWorldBounds(true); // refresh only if this shard ever had a wall-bounce charge
      st.frozenUntil = now + 2000;
      st.attuneOwner = owner;
    }
    // R+ Lattice Lace: also pause & redirect any currently-moving (E+) crystal nodes
    if (rUpgrade) {
      for (const node of this.crystalNodes) {
        if (!node.moving || node.circling) continue;
        if (!node.attuned) {
          node.attuned = true;
          node.attuneSpeed = (Math.hypot(node.vx, node.vy) || 134) * 0.75;
          // Attuning re-cuts the lattice: it grows and runs violet (see ATTUNED_TONES).
          node.h *= 1.25;
          this.pfx.glint(node.x, node.y, 44, 9, ATTUNED_TONES, node.angleRad);
        }
        node.attuneFrozenUntil = now + 2000;
        node.attuneOwner = 'player';
        node.vx = 0; node.vy = 0;
      }
    }
    const src = isPlayer ? player : npc;
    const owner2: 'player' | 'npc' = isPlayer ? 'player' : 'npc';
    this.arena.spawnHitFlash(src.x, src.y, CRYSTAL.prism);
    // Everything on screen is being pulled into alignment, so the caster pulses a front out.
    (isPlayer ? this.playerAvatar : this.npcAvatar)?.play('clap');
    this.fx(owner2).ring(src.x, src.y, 12, 260, CRYSTAL.prism, 620, 5, 6);
    this.fx(owner2).glint(src.x, src.y, 60, 10, tonesFor(owner2));
    this.arena.showFloatingText(src.x, src.y - 30, '💎 ATUNE', '#88eeff');

    // Mastery — Crystal Shredder: Atune also launches any idle shredder back at the cursor
    if (isPlayer && this.arena.masteryActive && this.shredders.length > 0) {
      this.shredderRelaunchRequested = true;
    }
  }

  placeCrystalPortal(isPlayer: boolean, tx: number, ty: number): void {
    const { scene } = this.arena;
    if (isPlayer) {
      const playerPortals = this.crystalPortals.filter((p) => p.owner === 'player');
      if (playerPortals.length >= 2) {
        this.pfx.shatter(playerPortals[0].x, playerPortals[0].y, 56, { shards: 9, dust: 1, duration: 340, splinter: false });
        playerPortals[0].gfx.destroy(); playerPortals[0].label.destroy();
        this.crystalPortals.splice(this.crystalPortals.indexOf(playerPortals[0]), 1);
      }
      const idx = this.crystalPortals.filter((p) => p.owner === 'player').length;
      const lbl = idx === 0 ? 'A' : 'B';
      // Overhead, then driven down — a gate is anchored into the floor.
      this.playerAvatar?.play('slam', Math.atan2(ty - this.arena.player.y, tx - this.arena.player.x));
      this.pfx.channelFacet(tx, ty, 40, 420, undefined, 4, CLEAR_TONES);
      this.pfx.bloom(tx, ty, 34, 8, 4, CLEAR_TONES);
      const lblObj = scene.add.text(tx, ty, lbl, {
        fontSize: '13px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#ffffff',
      }).setOrigin(0.5).setDepth(5);
      this.crystalPortals.push({
        gfx: scene.add.graphics().setDepth(4), label: lblObj,
        hue: idx === 0 ? CRYSTAL.violet : CRYSTAL.magenta,
        x: tx, y: ty, owner: 'player',
      });
    } else {
      if (this.npcCrystalPortals.length >= 2) {
        this.npcCrystalPortals[0].gfx.destroy(); this.npcCrystalPortals[0].label.destroy();
        this.npcCrystalPortals.shift();
      }
      const idx = this.npcCrystalPortals.length;
      const lbl = idx === 0 ? 'A' : 'B';
      this.npcAvatar?.play('slam', Math.atan2(ty - this.arena.npc.y, tx - this.arena.npc.x));
      this.nfx.bloom(tx, ty, 34, 8, 4, NPC_TONES);
      const lblObj = scene.add.text(tx, ty, lbl, {
        fontSize: '13px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#888888',
      }).setOrigin(0.5).setDepth(5);
      this.npcCrystalPortals.push({
        gfx: scene.add.graphics().setDepth(4), label: lblObj,
        hue: idx === 0 ? CRYSTAL.violet : CRYSTAL.magenta,
        x: tx, y: ty, owner: 'npc',
      });
    }
  }

  activateCrystalTrick(isPlayer: boolean): void {
    const { player, npc, scene } = this.arena;
    if (isPlayer) {
      for (const cl of this.crystalClones) { cl.sprite.destroy(); cl.hpBar.destroy(); cl.hpBg.destroy(); cl.dirIndicator.destroy(); }
      this.crystalClones = [];
      this.crystalTrickEnd = scene.time.now + 12000;
      // Base offsets in "player-faces-up" local space (y-up = forward)
      // Q+: 3 forward-shield clones; base: 2 side-flanking clones
      const baseOffsets = this.arena.hasUpgrade('q')
        ? [{ x: 0, y: -50 }, { x: -40, y: -30 }, { x: 40, y: -30 }]
        : [{ x: -58, y: 0 }, { x: 58, y: 0 }];
      const cx = player.x, cy = player.y;
      // Both arms thrust up and hold — the ultimate calls the duplicates into being.
      this.playerAvatar?.play('raise', 0, 900);
      this.pfx.bloom(cx, cy, 60, 14, 6, CLEAR_TONES);
      for (const off of baseOffsets) {
        const hpBg = scene.add.rectangle(cx, cy - 28, 30, 5, 0x222222).setDepth(12);
        const hpBar = scene.add.rectangle(cx - 15, cy - 28, 30, 5, 0x44ff88).setDepth(13).setOrigin(0, 0.5);
        const spr = scene.add.graphics().setDepth(11).setPosition(cx, cy);
        const dir = scene.add.rectangle(cx, cy - 20, 4, 10, 0xffffff, 0.8).setDepth(14);
        this.crystalClones.push({ sprite: spr, hp: 50, maxHp: 50, baseOffsetX: off.x, baseOffsetY: off.y, offsetX: off.x, offsetY: off.y, hpBar, hpBg, dirIndicator: dir });
        // Each mirage is refracted out of the caster, so the link is visible.
        this.pfx.refract(cx, cy, cx + off.x, cy + off.y, 8, CLEAR_TONES);
      }
    } else {
      for (const cl of this.npcCrystalClones) { cl.sprite.destroy(); cl.hpBar.destroy(); cl.hpBg.destroy(); cl.dirIndicator.destroy(); }
      this.npcCrystalClones = [];
      this.npcCrystalTrickEnd = scene.time.now + 12000;
      const ncx = npc.x, ncy = npc.y;
      this.npcAvatar?.play('raise', 0, 900);
      this.nfx.bloom(ncx, ncy, 60, 14, 6, NPC_TONES);
      for (const off of [{ x: -58, y: 0 }, { x: 58, y: 0 }]) {
        const hpBg = scene.add.rectangle(ncx, ncy - 28, 30, 4, 0x333333).setDepth(12);
        const hpBar = scene.add.rectangle(ncx - 15, ncy - 28, 30, 4, 0x44aaff).setDepth(13).setOrigin(0, 0.5);
        const spr = scene.add.graphics().setDepth(11).setPosition(ncx, ncy);
        const dir = scene.add.rectangle(ncx, ncx - 20, 4, 10, 0x88ccff, 0.6).setDepth(14); // pre-existing bug: uses ncx twice not ncy — preserved as-is
        this.npcCrystalClones.push({ sprite: spr, hp: 50, maxHp: 50, baseOffsetX: off.x, baseOffsetY: off.y, offsetX: off.x, offsetY: off.y, hpBar, hpBg, dirIndicator: dir });
      }
    }
  }

  /** Subterfuge Dark Treachery (crystal-Q copy): live clone positions so the kit
   * can mirror dagger throws and Spray shots from each clone. */
  getClonePositions(isPlayer: boolean): Array<{ x: number; y: number }> {
    const list = isPlayer ? this.crystalClones : this.npcCrystalClones;
    return list.filter(cl => cl.sprite?.active && cl.hp > 0).map(cl => ({ x: cl.sprite.x, y: cl.sprite.y }));
  }

  // ── Diamond Shard (kite) helpers ────────────────────────────────────────

  private spawnKite(x: number, y: number, tx: number, ty: number, damage: number, isFromPlayer: boolean, wallBounce: boolean): void {
    const { scene } = this.arena;
    const dx = tx - x, dy = ty - y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const owner: 'player' | 'npc' = isFromPlayer ? 'player' : 'npc';
    this.fx(owner).muzzlePrism(x, y, Math.atan2(dy, dx), 0.9, 7, tonesFor(owner));
    const speed = 520;
    const vx = (dx / dist) * speed, vy = (dy / dist) * speed;
    const proj = new Projectile(scene, x, y, 'proj-crystal-kite', damage, isFromPlayer);
    this.arena.projectiles.add(proj);
    proj.launch(vx, vy);
    if (wallBounce) {
      const body = proj.body as Phaser.Physics.Arcade.Body;
      body.setCollideWorldBounds(true);
      body.setBounce(1, 1);
      body.onWorldBounds = true;
      this.kiteState.set(proj, { lastBounceObj: null, trailing: false, trailAccum: 0, hadWallBounce: true });
    }
  }

  // Moving-mirror bounce: instead of leaving lingering mines behind, blast the area
  // immediately — big radius, big damage, no persistent object left on the field.
  private spawnAoeBlast(x: number, y: number, owner: 'player' | 'npc'): void {
    const RADIUS = 85, DAMAGE = 18;
    const targets = owner === 'player' ? this.arena.enemies : [this.arena.player];
    for (const tgt of targets) {
      if (!tgt.active || tgt.hp <= 0) continue;
      if (Phaser.Math.Distance.Between(x, y, tgt.x, tgt.y) <= RADIUS) {
        tgt.takeDamage(DAMAGE);
        this.arena.spawnHitFlash(tgt.x, tgt.y, CRYSTAL.gold);
      }
    }
    // Charged by a moving mirror, so the blast runs gold rather than clear — a different
    // substance from a normal shatter, and readable as such at a glance.
    const GOLD_TONES: CrystalTones = {
      shell: 0x4a3208, body: CRYSTAL.gold, facet: CRYSTAL.flare,
      lit: CRYSTAL.flare, spark: CRYSTAL.white, fringeA: CRYSTAL.magenta, fringeB: CRYSTAL.prism,
    };
    this.fx(owner).shatter(x, y, RADIUS, { shards: 12, dust: 2, duration: 320, tones: GOLD_TONES });
  }

  /** Called from ArenaScene.applyProjectileToEnemy when a pierced (post-moving-mirror-bounce,
   * red-tinted) kite touches a fighter — deals damage once per target then keeps flying instead
   * of being consumed, so it can carry on through the rest of its pierced targets. */
  onKiteHitEnemy(proj: Projectile, target: Fighter): void {
    let hitSet = this.kitePierceHitSets.get(proj);
    if (!hitSet) { hitSet = new Set(); this.kitePierceHitSets.set(proj, hitSet); }
    if (hitSet.has(target)) return;
    hitSet.add(target);
    target.takeDamage(proj.damage);
    this.arena.spawnHitFlash(target.x, target.y, 0xff2222);
    this.arena.showFloatingText(target.x, target.y - 24, 'PIERCE!', '#ff2222');
    if (proj.isFromPlayer) this.recordDoubleBounceHit(proj);
    // proj intentionally left active — updateKiteProjectiles/generic OOB cleanup own its lifetime
  }

  /** Mastery — Ricochet Marksman: a shard that hit an enemy after bouncing off walls/crystals 2+ times. */
  recordDoubleBounceHit(proj: Projectile): void {
    const st = this.kiteState.get(proj);
    if (st && (st.bounceCount ?? 0) >= 2) {
      this.arena.recordMasteryStat('doubleBounceHits', 1);
    }
  }

  getResonanceSpeedUntil(): number { return this.resonanceSpeedUntil; }

  // Crystal mirrors are long thin rectangles (up to 84px), not points — a fixed-radius
  // circle around their center point misses hits anywhere near their length, letting the
  // (now much larger) kite sail straight through. Treat the mirror as a capsule: find the
  // closest point on its actual rotated long axis and test distance against that instead.
  private closestPointOnMirror(node: CrystalNode, px: number, py: number): { x: number; y: number } {
    const half = node.h / 2; // long axis half-length
    const rad = node.angleRad;
    const ex = -Math.sin(rad) * half, ey = Math.cos(rad) * half; // half-extent along the rotated long axis
    const ax = node.x - ex, ay = node.y - ey, bx = node.x + ex, by = node.y + ey;
    const abx = bx - ax, aby = by - ay;
    const abLenSq = abx * abx + aby * aby || 1;
    const t = Phaser.Math.Clamp(((px - ax) * abx + (py - ay) * aby) / abLenSq, 0, 1);
    return { x: ax + abx * t, y: ay + aby * t };
  }

  private updateKiteProjectiles(time: number, delta: number, mouseX: number, mouseY: number): void {
    // KITE_HIT_R = mirror half-width + the (tripled) kite's own half-extent, so contact
    // registers when the shard's edge actually reaches the mirror's surface, not its center.
    const KITE_HIT_R = 26, PORTAL_R = 20, EXIT_MARGIN = 6, KITE_SPEED = 520;
    const { player, npc, scene } = this.arena;
    const allProj = this.arena.projectiles.getChildren() as Projectile[];
    for (const go of allProj) {
      const proj = go as Projectile;
      if (!proj.active || proj.texture.key !== 'proj-crystal-kite') { this.kiteState.delete(proj); this.kitePierceHitSets.delete(proj); continue; }
      let st = this.kiteState.get(proj);
      if (!st) { st = { lastBounceObj: null, trailing: false, trailAccum: 0 }; this.kiteState.set(proj, st); }

      const body = proj.body as Phaser.Physics.Arcade.Body;

      // Atune: frozen in place, pointing at the caster's aim point, until it launches at it
      if (st.frozenUntil !== undefined) {
        const aimX = st.attuneOwner === 'player' ? mouseX : player.x;
        const aimY = st.attuneOwner === 'player' ? mouseY : player.y;
        if (time < st.frozenUntil) {
          proj.setRotation(Math.atan2(aimY - proj.y, aimX - proj.x) + Math.PI / 2);
          continue;
        }
        const adx = aimX - proj.x, ady = aimY - proj.y;
        const alen = Math.hypot(adx, ady) || 1;
        body.setVelocity((adx / alen) * KITE_SPEED, (ady / alen) * KITE_SPEED);
        st.frozenUntil = undefined;
        st.attuneOwner = undefined;
        st.lastBounceObj = null;
      }

      proj.setRotation(Math.atan2(body.velocity.y, body.velocity.x) + Math.PI / 2); // texture drawn pointing "up"

      const isFromPlayer = proj.isFromPlayer;
      const target = isFromPlayer ? npc : player;
      const allCrystals = [...this.crystalNodes, ...this.npcCrystalNodes];
      const ownPortals = isFromPlayer ? this.crystalPortals : this.npcCrystalPortals;

      // Moving-mirror bounce: periodic large AOE blasts along the flight path while flagged
      if (st.trailing) {
        st.trailAccum += delta;
        if (st.trailAccum >= 90) {
          st.trailAccum -= 90;
          this.spawnAoeBlast(proj.x, proj.y, isFromPlayer ? 'player' : 'npc');
        }
      }

      // Let the projectile leave the radius of whatever it last bounced off before it can bounce off it again
      if (st.lastBounceObj) {
        const isNode = 'moving' in st.lastBounceObj;
        const nearest = isNode ? this.closestPointOnMirror(st.lastBounceObj as CrystalNode, proj.x, proj.y) : st.lastBounceObj;
        const distOut = Phaser.Math.Distance.Between(proj.x, proj.y, nearest.x, nearest.y);
        if (distOut > (isNode ? KITE_HIT_R : PORTAL_R) + EXIT_MARGIN) st.lastBounceObj = null;
      }

      // Crystal node collision (mirror bounce / gateway passthrough)
      let handled = false;
      for (const node of allCrystals) {
        if (st.lastBounceObj === node) continue;
        const cp = this.closestPointOnMirror(node, proj.x, proj.y);
        const dist = Phaser.Math.Distance.Between(proj.x, proj.y, cp.x, cp.y);
        if (dist <= KITE_HIT_R) {
          // A fresh bounce/passthrough normally stops a prior mine trail — but once a kite has
          // been enhanced by a moving mirror (kitePierce), that explosive trail is permanent and
          // survives reflecting off an ordinary stagnant crystal afterward.
          if (!(proj as any).kitePierce) st.trailing = false;
          proj.damage = Math.round(proj.damage * 1.5); // every crystal hit (bounce or gateway) scales damage, matching prior laser convention
          this.arena.spawnHitFlash(cp.x, cp.y, CRYSTAL.prism);
          // The struck face flares — the single clearest read that a bounce happened.
          this.fx(node.owner).glint(cp.x, cp.y, 34, 9, node.attuned ? ATTUNED_TONES : tonesFor(node.owner), node.angleRad);
          if (node.isGateway) {
            // Gateway: pass straight through, no direction change
            this.arena.showFloatingText(node.x, node.y - 18, '+BOOST', '#aaeeff');
          } else {
            // Mastery: track how many times this shard has bounced off a wall or crystal
            st.bounceCount = (st.bounceCount ?? 0) + 1;
            // Reflect velocity off the mirror's actual surface normal at the contact point
            // (perpendicular to its rotated long axis, not radial from its center) — this is
            // what makes bounces along the mirror's length look correct instead of "weird".
            let nx: number, ny: number;
            if (dist > 0.01) {
              nx = (proj.x - cp.x) / dist; ny = (proj.y - cp.y) / dist;
            } else {
              const rad = node.angleRad;
              nx = Math.cos(rad); ny = Math.sin(rad);
            }
            const speed = Math.hypot(body.velocity.x, body.velocity.y) || 300;
            let dirX = body.velocity.x / speed, dirY = body.velocity.y / speed;
            const dot = dirX * nx + dirY * ny;
            dirX -= 2 * dot * nx; dirY -= 2 * dot * ny;
            const rlen = Math.hypot(dirX, dirY) || 1;
            dirX /= rlen; dirY /= rlen;
            // 30° cone auto-aim snap (same behavior as the old laser bounce), recomputed live
            const CONE_COS = Math.cos(Math.PI / 6);
            let bestDist = Infinity, bestX = dirX, bestY = dirY;
            const checkPts: { x: number; y: number }[] = [];
            for (const c of allCrystals) if (c !== node) checkPts.push({ x: c.x, y: c.y });
            checkPts.push({ x: target.x, y: target.y });
            for (const p of ownPortals) checkPts.push({ x: p.x, y: p.y });
            for (const pt of checkPts) {
              const pdx = pt.x - proj.x, pdy = pt.y - proj.y;
              const pd = Math.hypot(pdx, pdy); if (pd < 1) continue;
              if (dirX * (pdx / pd) + dirY * (pdy / pd) >= CONE_COS && pd < bestDist) { bestDist = pd; bestX = pdx / pd; bestY = pdy / pd; }
            }
            body.setVelocity(bestX * speed, bestY * speed);
            if (node.moving) {
              st.trailing = true; // moving mirror → start leaving a trail of AOE blasts
              // Permanently transforms this kite: pierces through enemies from now on, tinted red to show it.
              (proj as any).kitePierce = true;
              proj.setTint(0xff2222);
              // Enhanced kites fly 50% faster — stacks with repeat moving-mirror bounces, same as the ×1.5 dmg bonus.
              body.setVelocity(bestX * speed * 1.5, bestY * speed * 1.5);
              if (isFromPlayer) this.arena.recordMasteryStat('movingMirrorBounces', 1);
            }
          }
          st.lastBounceObj = node;
          handled = true;
          break;
        }
      }
      if (handled) continue;

      // Portal traversal (own side's pair only) — still auto-targets on exit
      if (ownPortals.length === 2) {
        for (const gate of ownPortals) {
          if (st.lastBounceObj === gate) continue;
          if (Phaser.Math.Distance.Between(proj.x, proj.y, gate.x, gate.y) <= PORTAL_R) {
            st.trailing = false; // portal use also stops a prior mine trail
            const other = ownPortals.find((p) => p !== gate)!;
            proj.setPosition(other.x, other.y);
            const speed = Math.hypot(body.velocity.x, body.velocity.y) || 400;
            const portalCd = isFromPlayer ? this.crystalPortalLaserCooldown : this.npcCrystalPortalLaserCooldown;
            if (time - portalCd >= 2000) {
              const tdx = target.x - other.x, tdy = target.y - other.y;
              const tlen = Math.hypot(tdx, tdy) || 1;
              body.setVelocity((tdx / tlen) * speed, (tdy / tlen) * speed);
              if (isFromPlayer) this.crystalPortalLaserCooldown = time; else this.npcCrystalPortalLaserCooldown = time;
            } // else: keep current direction, just relocate
            // The shard visibly comes out of the far gate rather than blinking across.
            const owner: 'player' | 'npc' = isFromPlayer ? 'player' : 'npc';
            this.fx(owner).translate(gate.x, gate.y, other.x, other.y, 8, tonesFor(owner));
            st.lastBounceObj = other; // proj is now physically at `other` — exclude it, not the gate it entered from
            break;
          }
        }
      }
    }
  }

  // ── Crystal Mastery: Crystal Shredder ───────────────────────────────────

  private static readonly SHREDDER_SPEED = 260;
  private static readonly SHREDDER_COOLDOWN_MS = 14000;
  private static readonly SHREDDER_MAIN_SHARDS = 12;
  private static readonly SHREDDER_MINI_SHARDS = 4;
  private static readonly SHREDDER_SHARD_HIT_R = 15;
  private static readonly SHREDDER_ROTATE_SPEED = 3.2; // rad/s

  /** The slot Crystal Shredder is bound over this match, or null when it isn't bound anywhere. */
  private shredderSlot(): 'e' | 'r' | 'f' | 'q' | null {
    for (const s of ['e', 'r', 'f', 'q'] as const) {
      if (this.arena.masteryBindFor(s) === 'crystal-shredder') return s;
    }
    return null;
  }

  /** 0 = just cast, 1 = ready. Drives the HUD bar for the bound slot. */
  getShredderCooldownRatio(time: number): number {
    return Math.min(1, (time - this.shredderLastCastAt) / CrystalKit.SHREDDER_COOLDOWN_MS);
  }

  /** The Shredder runs on the attuned (violet) palette, so it never reads as a stray mirror. */
  private shredderTones(owner: 'player' | 'npc'): CrystalTones {
    return owner === 'player' ? ATTUNED_TONES : NPC_TONES;
  }

  private tryCastShredder(time: number, mouseX: number, mouseY: number): void {
    if (time - this.shredderLastCastAt < CrystalKit.SHREDDER_COOLDOWN_MS) return;
    this.shredderLastCastAt = time;
    const { player } = this.arena;
    player.triggerCooldown('crystal-shredder');
    const aim = Math.atan2(mouseY - player.y, mouseX - player.x);
    this.playerAvatar?.play('sweep', aim);

    this.clearShredders('player');

    // The chakram is forged out of the caster before it is thrown: light gathers in, the blades
    // lock on, and the throw leaves a refracted line along the path it will take.
    const tones = this.shredderTones('player');
    this.pfx.channelFacet(player.x, player.y, 46, 320, undefined, 8, tones);
    this.pfx.refract(player.x, player.y, mouseX, mouseY, 7, tones);
    this.arena.scene.cameras.main.shake(120, 0.003);

    this.spawnShredder(player.x, player.y, mouseX, mouseY, CrystalKit.SHREDDER_MAIN_SHARDS, 'player');
    // Trick of the Light: each active clone also throws a mini shredder
    for (const cl of this.crystalClones) {
      this.spawnShredder(player.x + cl.offsetX, player.y + cl.offsetY, mouseX, mouseY, CrystalKit.SHREDDER_MINI_SHARDS, 'player');
    }
    this.arena.showFloatingText(player.x, player.y - 30, '🔷 CRYSTAL SHREDDER', '#88eeff');
  }

  /** Online replay: the remote crystal player cast Crystal Shredder — hurl a chakram at us. */
  doNpcShredder(tx: number, ty: number): void {
    const { npc } = this.arena;
    this.clearShredders('npc');
    this.npcAvatar?.play('sweep', Math.atan2(ty - npc.y, tx - npc.x));
    this.nfx.refract(npc.x, npc.y, tx, ty, 7, this.shredderTones('npc'));
    this.spawnShredder(npc.x, npc.y, tx, ty, CrystalKit.SHREDDER_MAIN_SHARDS, 'npc');
  }

  private clearShredders(owner: 'player' | 'npc'): void {
    this.shredders = this.shredders.filter((s) => {
      if (s.owner !== owner) return true;
      // Recasting recalls the old chakram — it comes apart rather than blinking out.
      this.fx(owner).shatter(s.x, s.y, s.radius * 2, {
        shards: 8, dust: 1, duration: 300, splinter: false, tones: this.shredderTones(owner),
      });
      s.gfx.destroy();
      return false;
    });
  }

  private spawnShredder(x: number, y: number, tx: number, ty: number, shardCount: number, owner: 'player' | 'npc'): void {
    const { scene } = this.arena;
    const dx = tx - x, dy = ty - y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const vx = (dx / dist) * CrystalKit.SHREDDER_SPEED, vy = (dy / dist) * CrystalKit.SHREDDER_SPEED;
    const radius = shardCount > CrystalKit.SHREDDER_MINI_SHARDS ? 26 : 18;
    // Blade count drives the assembly burst too, so a full chakram visibly out-weighs a mini.
    this.fx(owner).bloom(x, y, radius * 1.5, shardCount, 8, this.shredderTones(owner));
    this.shredders.push({
      x, y, vx, vy, targetX: tx, targetY: ty, moving: true, angle: 0, radius,
      shardCount, shardsAlive: new Array(shardCount).fill(true),
      gfx: scene.add.graphics().setDepth(9),
      spawnAt: scene.time.now,
      trailAccum: 0,
      owner,
    });
  }

  private updateShredders(time: number, delta: number, mouseX: number, mouseY: number): void {
    if (this.shredders.length === 0) { this.shredderRelaunchRequested = false; return; }

    if (this.shredderRelaunchRequested) {
      for (const s of this.shredders) {
        if (s.moving || s.owner !== 'player') continue;
        const rdx = mouseX - s.x, rdy = mouseY - s.y;
        const rlen = Math.hypot(rdx, rdy) || 1;
        s.vx = (rdx / rlen) * CrystalKit.SHREDDER_SPEED;
        s.vy = (rdy / rlen) * CrystalKit.SHREDDER_SPEED;
        s.targetX = mouseX; s.targetY = mouseY;
        s.moving = true;
        // Atune snapping it back out is its own moment, not a silent state change.
        this.pfx.glint(s.x, s.y, s.radius * 2.6, 10, this.shredderTones('player'), Math.atan2(rdy, rdx));
        this.pfx.refract(s.x, s.y, mouseX, mouseY, 7, this.shredderTones('player'));
      }
      this.shredderRelaunchRequested = false;
    }

    for (let si = this.shredders.length - 1; si >= 0; si--) {
      const s = this.shredders[si];
      const tones = this.shredderTones(s.owner);
      s.angle += CrystalKit.SHREDDER_ROTATE_SPEED * (delta / 1000);

      if (s.moving) {
        s.x += s.vx * (delta / 1000);
        s.y += s.vy * (delta / 1000);
        const toX = s.targetX - s.x, toY = s.targetY - s.y;
        if ((toX * s.vx + toY * s.vy) <= 0) {
          s.x = s.targetX; s.y = s.targetY;
          s.vx = 0; s.vy = 0;
          s.moving = false;
          // Landing: it bites into the floor and settles.
          this.fx(s.owner).ring(s.x, s.y, s.radius * 0.4, s.radius * 2.2, tones.lit, 380, 4, 8);
          this.fx(s.owner).splinters(s.x, s.y, s.radius * 1.4, 2, tones);
        }
        // Ground-up dust while it travels, so the flight has weight.
        s.trailAccum += delta;
        if (s.trailAccum >= 70) {
          s.trailAccum -= 70;
          const back = Math.atan2(-s.vy, -s.vx);
          this.fx(s.owner).dust(
            s.x + Math.cos(back) * s.radius * 0.6, s.y + Math.sin(back) * s.radius * 0.6,
            2, s.radius * 0.7, 7, tones,
          );
        }
      }

      // Shard hit tests run against where each *live* blade actually is this frame.
      for (let i = 0; i < s.shardCount; i++) {
        if (!s.shardsAlive[i]) continue;
        const ang = s.angle + (i / s.shardCount) * Math.PI * 2;
        const sx = s.x + Math.cos(ang) * s.radius, sy = s.y + Math.sin(ang) * s.radius;
        const shardTargets = s.owner === 'npc' ? [this.arena.player] : this.arena.enemies;
        for (const t of shardTargets) {
          if (!t.active || t.hp <= 0) continue;
          if (Phaser.Math.Distance.Between(sx, sy, t.x, t.y) > CrystalKit.SHREDDER_SHARD_HIT_R) continue;
          t.takeDamage(2);
          this.arena.spawnHitFlash(t.x, t.y, CRYSTAL.prism);
          s.shardsAlive[i] = false;
          // A blade doesn't disappear — it snaps off into the wound it just cut.
          this.fx(s.owner).glint(sx, sy, s.radius * 1.6, 11, tones, ang);
          this.fx(s.owner).shards(sx, sy, 4, {
            angle: ang + 0.7, spread: 0.8, speed: 150, size: 2.6,
            life: 380, fall: 30, depth: 10, tones,
          });
          break;
        }
      }

      // Repaint from scratch: hub, blades, motion blur and the parked reticle all live here.
      s.gfx.clear();
      CrystalFx.drawShredder(
        s.gfx, this.col(s.owner), tones,
        s.x, s.y, s.radius, s.angle, s.shardsAlive, time / 1000, s.moving,
        Math.min(1, (time - s.spawnAt) / 180),
      );

      if (!s.shardsAlive.some(Boolean)) {
        // The last blade going means the whole chakram comes apart, hub included.
        this.fx(s.owner).shatter(s.x, s.y, s.radius * 2.6, {
          shards: 14, dust: 2, duration: 420, tones,
        });
        this.arena.scene.cameras.main.shake(140, 0.004);
        s.gfx.destroy();
        this.shredders.splice(si, 1);
      }
    }
  }
}
