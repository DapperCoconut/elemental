import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import { Projectile } from '../../combat/Projectile';

// ── Crystal type definitions ────────────────────────────────────────────────

export interface CrystalNode {
  sprite: Phaser.GameObjects.Rectangle;
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
}

export interface CrystalPortalGate {
  sprite: Phaser.GameObjects.Arc;
  label: Phaser.GameObjects.Text;
  x: number;
  y: number;
  owner: 'player' | 'npc';
}

export interface CrystalClone {
  sprite: Phaser.GameObjects.Arc;
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
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  buildPlayerContext(x: number, y: number): CastContext;
}

// ── CrystalKit ────────────────────────────────────────────────────────────

export class CrystalKit {
  // Crystal — player
  private crystalNodes: CrystalNode[] = [];
  private crystalPortals: CrystalPortalGate[] = [];
  private crystalClones: CrystalClone[] = [];
  private crystalTrickEnd = 0;
  private crystalBarrageActive = false;
  private crystalBarrageEnd = 0;
  private crystalBarrageAccum = 0;
  private crystalBarrageShots = 0;
  private crystalBarrageTX = 0;
  private crystalBarrageTY = 0;
  private crystalPortalCooldown = 0;
  // Crystal — NPC
  private npcCrystalNodes: CrystalNode[] = [];
  private npcCrystalPortals: CrystalPortalGate[] = [];
  private npcCrystalClones: CrystalClone[] = [];
  private npcCrystalTrickEnd = 0;
  private npcCrystalBarrageActive = false;
  private npcCrystalBarrageEnd = 0;
  private npcCrystalBarrageAccum = 0;
  private npcCrystalBarrageShots = 0;
  private npcCrystalBarrageTX = 0;
  private npcCrystalBarrageTY = 0;
  private npcCrystalPortalCooldown = 0;
  // Crystal — upgrade state
  private crystalRealmActive = false;              // Click+: Crystal Realm mode (walls act as mirrors)
  private crystalRealmGfx: Phaser.GameObjects.Graphics | null = null; // Click+: blue wall visual
  private crystalPortalLaserCooldown = -99999;     // cooldown for shooting through portal
  private npcCrystalPortalLaserCooldown = -99999;
  private crystalPortalSpeedBuffUntil = -99999;    // F+: speed boost after teleport

  // Diamond Shard (kite projectile) per-projectile bounce state
  private kiteState = new Map<Projectile, { lastBounceObj: CrystalNode | CrystalPortalGate | null; trailing: boolean; trailAccum: number }>();
  // Targets already pierced by a given kite, so a single pass can't multi-tick the same enemy
  private kitePierceHitSets = new Map<Projectile, Set<Fighter>>();

  constructor(private arena: CrystalArenaApi) {
    // Wall bounce (Crystal Realm / Shredder upgrade): a player-fired kite may bounce off
    // the arena bounds exactly once (×1.5 dmg), then wall collision is disabled for it so
    // it exits normally next time — mirror bounces stay unlimited, only the wall is capped.
    // Registered once — the kit itself is only constructed once per ArenaScene lifetime
    // (see wiring in ArenaScene.create()).
    this.arena.scene.physics.world.on('worldbounds', (body: Phaser.Physics.Arcade.Body) => {
      const go = body.gameObject;
      if (go instanceof Projectile && go.active && go.texture.key === 'proj-crystal-kite' && go.isFromPlayer) {
        go.damage = Math.round(go.damage * 1.5);
        this.arena.spawnHitFlash(go.x, go.y, 0x88eeff);
        // One wall bounce only — disable further wall collision so the next time it
        // reaches the bounds it exits the arena for good (mirror bounces stay unlimited).
        body.setCollideWorldBounds(false);
      }
    });
  }

  // ── Public accessors ──────────────────────────────────────────────────

  getPortalSpeedBuffUntil(): number { return this.crystalPortalSpeedBuffUntil; }
  getNpcCrystalNodeCount(): number { return this.npcCrystalNodes.length; }

  reset(): void {
    for (const n of this.crystalNodes) n.sprite.destroy();
    for (const p of this.crystalPortals) { p.sprite.destroy(); p.label.destroy(); }
    for (const c of this.crystalClones) { c.sprite.destroy(); c.hpBar.destroy(); c.hpBg.destroy(); c.dirIndicator.destroy(); }
    this.crystalNodes = []; this.crystalPortals = []; this.crystalClones = [];
    this.crystalTrickEnd = 0; this.crystalBarrageActive = false;
    this.crystalPortalCooldown = 0;
    this.crystalRealmActive = false;
    if (this.crystalRealmGfx) { this.crystalRealmGfx.destroy(); this.crystalRealmGfx = null; }
    this.crystalPortalLaserCooldown = -99999; this.crystalPortalSpeedBuffUntil = -99999;

    for (const n of this.npcCrystalNodes) n.sprite.destroy();
    for (const p of this.npcCrystalPortals) { p.sprite.destroy(); p.label.destroy(); }
    for (const c of this.npcCrystalClones) { c.sprite.destroy(); c.hpBar.destroy(); c.hpBg.destroy(); c.dirIndicator.destroy(); }
    this.npcCrystalNodes = []; this.npcCrystalPortals = []; this.npcCrystalClones = [];
    this.npcCrystalTrickEnd = 0; this.npcCrystalBarrageActive = false;
    this.npcCrystalPortalCooldown = 0; this.npcCrystalPortalLaserCooldown = -99999;

    this.kiteState.clear();
    this.kitePierceHitSets.clear();
  }

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    const { player, eKey, fKey, rKey, qKey } = this.arena;
    const playerCtx = this.arena.buildPlayerContext(mouseX, mouseY);
    const playerBody = player.body as Phaser.Physics.Arcade.Body;

    if (this.arena.nukeChanneling) return;

    // Click+: Crystal Realm (walls act as mirrors) is always on while the upgrade is owned
    this.crystalRealmActive = this.arena.hasUpgrade('click');
    if (pointer.isDown) {
      player.castAbility('crystal-laser', playerCtx);
    }
    if (Phaser.Input.Keyboard.JustDown(eKey)) {
      // E+: if any moving crystals exist, halt them; otherwise place new crystal
      if (this.arena.hasUpgrade('e') && this.crystalNodes.some((n) => n.moving)) {
        for (const n of this.crystalNodes) { n.vx = 0; n.vy = 0; n.moving = false; }
      } else {
        player.castAbility('crystal-place', playerCtx);
      }
    }
    if (Phaser.Input.Keyboard.JustDown(rKey)) {
      player.castAbility('crystal-barrage', playerCtx);
    }
    if (Phaser.Input.Keyboard.JustDown(fKey)) {
      // F+: with 2 portals active → teleport to nearest portal instead of placing a new one
      const playerPortals = this.crystalPortals.filter((p) => p.owner === 'player');
      if (this.arena.hasUpgrade('f') && playerPortals.length >= 2 && time - this.crystalPortalCooldown > 1000) {
        let nearest = playerPortals[0];
        let nearestDist = Phaser.Math.Distance.Between(player.x, player.y, nearest.x, nearest.y);
        for (const p of playerPortals) {
          const d = Phaser.Math.Distance.Between(player.x, player.y, p.x, p.y);
          if (d < nearestDist) { nearestDist = d; nearest = p; }
        }
        player.setPosition(nearest.x, nearest.y);
        playerBody.setVelocity(0, 0);
        this.crystalPortalCooldown = time;
        this.crystalPortalSpeedBuffUntil = time + 3000;
        const flash = this.arena.scene.add.circle(nearest.x, nearest.y, 22, 0xcc88ff, 0.7).setDepth(15);
        this.arena.scene.tweens.add({ targets: flash, scaleX: 2.5, alpha: 0, duration: 320, onComplete: () => flash.destroy() });
        this.arena.showFloatingText(nearest.x, nearest.y - 30, '⚡ PORTAL DASH', '#cc88ff');
      } else {
        player.castAbility('crystal-portal', playerCtx);
      }
    }
    if (Phaser.Input.Keyboard.JustDown(qKey)) {
      player.castAbility('crystal-trick', playerCtx);
    }
  }

  update(time: number, delta: number, mouseX: number, mouseY: number): void {
    if (this.arena.elementId !== 'crystal' && this.arena.npcElementId !== 'crystal') return;

    const { player, npc, scene } = this.arena;
    const BARRAGE_INTERVAL = 100; // 15 shots over 1.5s
    const allCrystals = [...this.crystalNodes, ...this.npcCrystalNodes];
    const allActiveProj = this.arena.projectiles.getChildren();

    // Move crystal nodes (all nodes travel from spawn, stop at target unless E+)
    for (const node of [...this.crystalNodes, ...this.npcCrystalNodes]) {
      if (node.moving) {
        node.x += node.vx * (delta / 1000);
        node.y += node.vy * (delta / 1000);
        node.sprite.setPosition(node.x, node.y);
        // Stop at target (non-E+ base behavior)
        if (isFinite(node.targetX)) {
          const toTargetX = node.targetX - node.x, toTargetY = node.targetY - node.y;
          const pastTarget = (toTargetX * node.vx + toTargetY * node.vy) <= 0;
          if (pastTarget) {
            node.x = node.targetX; node.y = node.targetY;
            node.sprite.setPosition(node.x, node.y);
            node.vx = 0; node.vy = 0; node.moving = false;
          }
        }
        // Stop at arena bounds
        const W = scene.scale.width, H = scene.scale.height;
        if (node.x < 10 || node.x > W - 10 || node.y < 10 || node.y > H - 10) {
          node.x = Phaser.Math.Clamp(node.x, 10, W - 10);
          node.y = Phaser.Math.Clamp(node.y, 10, H - 10);
          node.sprite.setPosition(node.x, node.y);
          node.vx = 0; node.vy = 0; node.moving = false;
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
          node.x = other.x; node.y = other.y;
          node.sprite.setPosition(node.x, node.y);
          node.lastPortalTime = time;
          const flash = scene.add.circle(other.x, other.y, 16, 0xcc88ff, 0.6).setDepth(9);
          scene.tweens.add({ targets: flash, scaleX: 2, scaleY: 2, alpha: 0, duration: 260, onComplete: () => flash.destroy() });
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
          node.x = other.x; node.y = other.y;
          node.sprite.setPosition(node.x, node.y);
          node.lastPortalTime = time;
          break;
        }
      }
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

    // Player barrage ticks
    if (this.crystalBarrageActive) {
      if (time >= this.crystalBarrageEnd || this.crystalBarrageShots >= 15) {
        this.crystalBarrageActive = false;
      } else {
        this.crystalBarrageAccum += delta;
        while (this.crystalBarrageAccum >= BARRAGE_INTERVAL && this.crystalBarrageShots < 15) {
          this.crystalBarrageAccum -= BARRAGE_INTERVAL;
          this.crystalBarrageShots++;
          // Q+: also shoot from 4th source (far right)
          const sources: { x: number; y: number }[] = [{ x: player.x, y: player.y }];
          for (const cl of this.crystalClones) sources.push({ x: player.x + cl.offsetX, y: player.y + cl.offsetY });
          if (this.arena.hasUpgrade('q') && this.crystalClones.length > 0) {
            sources.push({ x: player.x + 80, y: player.y });
          }
          for (const src of sources) {
            const baseAngle = Math.atan2(this.crystalBarrageTY - src.y, this.crystalBarrageTX - src.x);
            const angle = baseAngle + (Math.random() - 0.5) * 0.85;
            const proj = new Projectile(scene, src.x, src.y, 'proj-crystal-shard', 4, true);
            this.arena.projectiles.add(proj);
            proj.launch(Math.cos(angle) * 430, Math.sin(angle) * 430);
            // R+: 1s after shard fires, explode in fireworks at its current position
            if (this.arena.hasUpgrade('r')) {
              const trackedProj = proj;
              scene.time.delayedCall(1000, () => {
                if (!scene.scene.isActive() || !trackedProj.active) return;
                const fx = trackedProj.x, fy = trackedProj.y;
                trackedProj.setActive(false).setVisible(false);
                for (let fwi = 0; fwi < 4; fwi++) {
                  const fwa = (fwi / 4) * Math.PI * 2;
                  const fwp = new Projectile(scene, fx, fy, 'proj-crystal-shard', 1, true);
                  this.arena.projectiles.add(fwp);
                  fwp.launch(Math.cos(fwa) * 200, Math.sin(fwa) * 200);
                }
                const fwExp = scene.add.circle(fx, fy, 8, 0xffee88, 0.8).setDepth(10);
                scene.tweens.add({ targets: fwExp, scaleX: 3, scaleY: 3, alpha: 0, duration: 300, onComplete: () => fwExp.destroy() });
              });
            }
          }
        }
      }
    }

    // NPC barrage ticks
    if (this.npcCrystalBarrageActive) {
      if (time >= this.npcCrystalBarrageEnd || this.npcCrystalBarrageShots >= 15) {
        this.npcCrystalBarrageActive = false;
      } else {
        this.npcCrystalBarrageAccum += delta;
        while (this.npcCrystalBarrageAccum >= BARRAGE_INTERVAL && this.npcCrystalBarrageShots < 15) {
          this.npcCrystalBarrageAccum -= BARRAGE_INTERVAL;
          this.npcCrystalBarrageShots++;
          const baseAngle = Math.atan2(this.npcCrystalBarrageTY - npc.y, this.npcCrystalBarrageTX - npc.x);
          const angle = baseAngle + (Math.random() - 0.5) * 0.85;
          const proj = new Projectile(scene, npc.x, npc.y, 'proj-crystal-shard', 4, false);
          this.arena.projectiles.add(proj);
          proj.launch(Math.cos(angle) * 430, Math.sin(angle) * 430);
          for (const cl of this.npcCrystalClones) {
            const cx = npc.x + cl.offsetX, cy = npc.y + cl.offsetY;
            const ca = Math.atan2(this.npcCrystalBarrageTY - cy, this.npcCrystalBarrageTX - cx) + (Math.random() - 0.5) * 0.85;
            const cp = new Projectile(scene, cx, cy, 'proj-crystal-shard', 4, false);
            this.arena.projectiles.add(cp);
            cp.launch(Math.cos(ca) * 430, Math.sin(ca) * 430);
          }
        }
      }
    }

    // Crystal shard hits crystal node → explosion (or gateway passthrough)
    for (const go of allActiveProj) {
      const proj = go as Projectile;
      if (!proj.active || proj.texture.key !== 'proj-crystal-shard') continue;
      for (const node of allCrystals) {
        if (Phaser.Math.Distance.Between(proj.x, proj.y, node.x, node.y) <= 18) {
          if (node.isGateway && node.owner === (proj.isFromPlayer ? 'player' : 'npc')) {
            // Gateway: shard passes through — boost speed and damage once per node
            const pb = proj.body as Phaser.Physics.Arcade.Body;
            pb.setVelocity(pb.velocity.x * 1.2, pb.velocity.y * 1.2);
            proj.perkBoost = Math.min(proj.perkBoost * 1.3, 5);
            scene.tweens.add({ targets: node.sprite, alpha: 1, scaleX: 1.5, scaleY: 1.5, duration: 90, yoyo: true });
            this.arena.showFloatingText(node.x, node.y - 14, '+BOOST', '#aaeeff');
          } else {
            const tgt = proj.isFromPlayer ? npc : player;
            const isRUpgrade = proj.isFromPlayer && this.arena.hasUpgrade('r');
            const aoeRange = isRUpgrade ? 180 : 90;
            const aoeDmg = Math.round(2 * proj.perkBoost);
            if (Phaser.Math.Distance.Between(node.x, node.y, tgt.x, tgt.y) <= aoeRange) {
              tgt.takeDamage(aoeDmg);
              this.arena.spawnHitFlash(tgt.x, tgt.y, 0x88eeff);
            }
            const expScale = isRUpgrade ? 18 : 9;
            const exp = scene.add.circle(node.x, node.y, 10, 0x88eeff, 0.5).setDepth(8);
            scene.tweens.add({ targets: exp, scaleX: expScale, scaleY: expScale, alpha: 0, duration: 260, onComplete: () => exp.destroy() });
            scene.tweens.add({ targets: node.sprite, alpha: 1, scaleX: 1.3, scaleY: 1.3, duration: 90, yoyo: true });
            // R+: also release fireworks at mirror on hit
            if (isRUpgrade) {
              const fx = node.x, fy = node.y;
              for (let fwi = 0; fwi < 4; fwi++) {
                const fwa = (fwi / 4) * Math.PI * 2;
                const fwp = new Projectile(scene, fx, fy, 'proj-crystal-shard', 1, true);
                this.arena.projectiles.add(fwp);
                fwp.launch(Math.cos(fwa) * 200, Math.sin(fwa) * 200);
              }
              const fwExp = scene.add.circle(fx, fy, 8, 0xffee88, 0.8).setDepth(10);
              scene.tweens.add({ targets: fwExp, scaleX: 3, scaleY: 3, alpha: 0, duration: 300, onComplete: () => fwExp.destroy() });
            }
            proj.setActive(false).setVisible(false);
          }
          break;
        }
      }
    }

    // Player mirrors deflect enemy projectiles
    if (this.arena.elementId === 'crystal' && this.crystalNodes.length > 0) {
      for (const go of allActiveProj) {
        const proj = go as Projectile;
        if (!proj.active || proj.isFromPlayer || proj.texture.key === 'proj-crystal-shard') continue;
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
            scene.tweens.add({ targets: node.sprite, alpha: 1, scaleX: 1.3, scaleY: 1.3, duration: 80, yoyo: true });
            this.arena.showFloatingText(node.x, node.y - 14, 'DEFLECT!', '#aaeeff');
            break;
          }
        }
      }
    }

    // Barrage shards TP through player portals (+50% dmg)
    if (this.arena.elementId === 'crystal' && this.crystalPortals.length === 2) {
      for (const go of allActiveProj) {
        const proj = go as Projectile;
        if (!proj.active || !proj.isFromPlayer || proj.texture.key !== 'proj-crystal-shard' || proj.portalUsed) continue;
        for (let pi = 0; pi < 2; pi++) {
          const gate = this.crystalPortals[pi];
          if (Phaser.Math.Distance.Between(proj.x, proj.y, gate.x, gate.y) <= 22) {
            const other = this.crystalPortals[1 - pi];
            proj.setPosition(other.x, other.y);
            proj.portalUsed = true;
            proj.damage = Math.round(proj.damage * 1.5);
            proj.perkBoost = Math.min(proj.perkBoost * 1.5, 10);
            const flash = scene.add.circle(other.x, other.y, 14, 0xcc88ff, 0.6).setDepth(9);
            scene.tweens.add({ targets: flash, scaleX: 2, scaleY: 2, alpha: 0, duration: 200, onComplete: () => flash.destroy() });
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
            const flash = scene.add.circle(other.x, other.y, 14, 0xcc88ff, 0.7).setDepth(9);
            scene.tweens.add({ targets: flash, scaleX: 2.5, scaleY: 2.5, alpha: 0, duration: 250, onComplete: () => flash.destroy() });
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
        for (const p of playerPortals) { p.sprite.destroy(); p.label.destroy(); }
        this.crystalPortals = this.crystalPortals.filter((p) => p.owner !== 'player');
        npc.earthStunnedUntil = Math.max(npc.earthStunnedUntil, time + 2000);
        this.arena.showFloatingText(npc.x, npc.y - 30, '💥 STUNNED', '#aa44ff');
        const stExp = scene.add.circle(npc.x, npc.y, 25, 0xaa44ff, 0.5).setDepth(9);
        scene.tweens.add({ targets: stExp, scaleX: 2.5, scaleY: 2.5, alpha: 0, duration: 400, onComplete: () => stExp.destroy() });
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
          const flash = scene.add.circle(other.x, other.y, 22, 0xcc88ff, 0.7).setDepth(15);
          scene.tweens.add({ targets: flash, scaleX: 2.5, alpha: 0, duration: 320, onComplete: () => flash.destroy() });
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
          const flash = scene.add.circle(other.x, other.y, 22, 0xcc88ff, 0.6).setDepth(15);
          scene.tweens.add({ targets: flash, scaleX: 2.5, alpha: 0, duration: 320, onComplete: () => flash.destroy() });
          break;
        }
      }
    }

    // Portal auto-aim cooldown tint: gray when on cooldown, original color when ready
    if (this.arena.elementId === 'crystal') {
      const portalColors = [0xaa44ff, 0xff44aa];
      const onCd = time - this.crystalPortalLaserCooldown < 2000;
      for (let pi = 0; pi < this.crystalPortals.length; pi++) {
        const spr = this.crystalPortals[pi].sprite;
        if (onCd) {
          spr.setFillStyle(0x888888, 0.4).setStrokeStyle(3, 0x888888, 0.6);
        } else {
          spr.setFillStyle(portalColors[pi % 2], 0.5).setStrokeStyle(3, portalColors[pi % 2], 0.9);
        }
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
        // Check NPC projectile hits
        for (const go of allActiveProj) {
          const proj = go as Projectile;
          if (!proj.active || proj.isFromPlayer) continue;
          if (Phaser.Math.Distance.Between(proj.x, proj.y, cx, cy) <= 20) {
            cl.hp -= proj.damage;
            proj.setActive(false).setVisible(false);
            if (cl.hp <= 0) {
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
        cl.sprite.setPosition(cx, cy);
        cl.hpBg.setPosition(cx, cy - 28);
        const barW = Math.max(0, (cl.hp / cl.maxHp) * 30);
        cl.hpBar.setSize(barW, 4).setPosition(cx - 15 + barW / 2, cy - 28);
        // Dir indicator: face player
        const ndAngle = Math.atan2(player.y - cy, player.x - cx) * 180 / Math.PI + 90;
        cl.dirIndicator.setPosition(cx + Math.cos((ndAngle - 90) * Math.PI / 180) * 18, cy + Math.sin((ndAngle - 90) * Math.PI / 180) * 18).setAngle(ndAngle);
        for (const go of allActiveProj) {
          const proj = go as Projectile;
          if (!proj.active || !proj.isFromPlayer) continue;
          if (proj.texture.key === 'proj-crystal-shard') continue; // handled in shard-vs-node check
          if (Phaser.Math.Distance.Between(proj.x, proj.y, cx, cy) <= 20) {
            cl.hp -= proj.damage;
            proj.setActive(false).setVisible(false);
            if (cl.hp <= 0) {
              cl.sprite.destroy(); cl.hpBar.destroy(); cl.hpBg.destroy(); cl.dirIndicator.destroy();
              this.npcCrystalClones.splice(ci, 1);
            }
            break;
          }
        }
      }
    }

    // Diamond Shard (kite) bounce / portal / mine-trail logic
    this.updateKiteProjectiles(time, delta);
  }

  // ── Public do* methods — called from ArenaScene context builders ───────

  fireCrystalLaser(isPlayer: boolean, tx: number, ty: number): void {
    const { player, npc } = this.arena;
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
        playerNodes[0].sprite.destroy();
        this.crystalNodes.splice(this.crystalNodes.indexOf(playerNodes[0]), 1);
      }
      const dx = tx - player.x, dy = ty - player.y;
      const angleDeg = Math.atan2(dy, dx) * 180 / Math.PI;
      const isGW = this.arena.hasPerk('player', 'gateway');
      const [nW, nH] = isGW ? [9, 84] : [6, 56];
      const gwColor = 0xaaeeff;
      if (this.arena.hasUpgrade('e')) {
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const speed = 134;
        const vx = (dx / dist) * speed, vy = (dy / dist) * speed;
        const spr = scene.add.rectangle(player.x, player.y, nW, nH, gwColor, 0.9)
          .setStrokeStyle(isGW ? 2 : 1, 0xeeffff, 1).setDepth(4).setAngle(angleDeg);
        scene.tweens.add({ targets: spr, scaleX: 1.3, scaleY: 1.3, duration: 120, yoyo: true });
        this.crystalNodes.push({ sprite: spr, x: player.x, y: player.y, owner: 'player', vx, vy, moving: true, targetX: Infinity, targetY: Infinity, lastPortalTime: -99999, isGateway: isGW });
        if (isGW) this.arena.showFloatingText(player.x, player.y - 20, '🌀 GATEWAY', '#aaeeff');
      } else {
        const spr = scene.add.rectangle(tx, ty, nW, nH, gwColor, 0.9)
          .setStrokeStyle(isGW ? 2 : 1, 0xeeffff, 1).setDepth(4).setAngle(angleDeg);
        scene.tweens.add({ targets: spr, scaleX: 1.3, scaleY: 1.3, duration: 120, yoyo: true });
        this.crystalNodes.push({ sprite: spr, x: tx, y: ty, owner: 'player', vx: 0, vy: 0, moving: false, targetX: tx, targetY: ty, lastPortalTime: -99999, isGateway: isGW });
        if (isGW) this.arena.showFloatingText(tx, ty - 20, '🌀 GATEWAY', '#aaeeff');
      }
    } else {
      if (this.npcCrystalNodes.length >= 3) {
        this.npcCrystalNodes[0].sprite.destroy();
        this.npcCrystalNodes.shift();
      }
      const ndx = tx - npc.x, ndy = ty - npc.y;
      const ndist = Math.sqrt(ndx * ndx + ndy * ndy) || 1;
      const nvx = (ndx / ndist) * 120, nvy = (ndy / ndist) * 120;
      const ntAngleDeg = Math.atan2(ndy, ndx) * 180 / Math.PI;
      const isNpcGW = this.arena.hasPerk('npc', 'gateway');
      const [npcNW, npcNH] = isNpcGW ? [9, 84] : [6, 56];
      const spr = scene.add.rectangle(npc.x, npc.y, npcNW, npcNH, 0x99ccee, 0.7)
        .setStrokeStyle(isNpcGW ? 2 : 1, 0xaaeeff, 0.7).setDepth(4).setAngle(ntAngleDeg);
      this.npcCrystalNodes.push({ sprite: spr, x: npc.x, y: npc.y, owner: 'npc', vx: nvx, vy: nvy, moving: true, targetX: tx, targetY: ty, lastPortalTime: -99999, isGateway: isNpcGW });
    }
  }

  startCrystalBarrage(isPlayer: boolean, tx: number, ty: number): void {
    const { scene } = this.arena;
    if (isPlayer) {
      this.crystalBarrageActive = true;
      this.crystalBarrageEnd = scene.time.now + 1500; // half as long
      this.crystalBarrageAccum = 0;
      this.crystalBarrageShots = 0;
      this.crystalBarrageTX = tx;
      this.crystalBarrageTY = ty;
    } else {
      this.npcCrystalBarrageActive = true;
      this.npcCrystalBarrageEnd = scene.time.now + 1500;
      this.npcCrystalBarrageAccum = 0;
      this.npcCrystalBarrageShots = 0;
      this.npcCrystalBarrageTX = tx;
      this.npcCrystalBarrageTY = ty;
    }
  }

  placeCrystalPortal(isPlayer: boolean, tx: number, ty: number): void {
    const { scene } = this.arena;
    if (isPlayer) {
      const playerPortals = this.crystalPortals.filter((p) => p.owner === 'player');
      if (playerPortals.length >= 2) {
        playerPortals[0].sprite.destroy(); playerPortals[0].label.destroy();
        this.crystalPortals.splice(this.crystalPortals.indexOf(playerPortals[0]), 1);
      }
      const idx = this.crystalPortals.filter((p) => p.owner === 'player').length;
      const color = idx === 0 ? 0xaa44ff : 0xff44aa;
      const lbl = idx === 0 ? 'A' : 'B';
      const spr = scene.add.circle(tx, ty, 18, color, 0.5)
        .setStrokeStyle(3, color, 0.9).setDepth(4);
      scene.tweens.add({ targets: spr, alpha: 0.2, yoyo: true, repeat: -1, duration: 700 });
      const lblObj = scene.add.text(tx, ty, lbl, {
        fontSize: '13px', fontFamily: '"Arial Black", sans-serif', color: '#ffffff',
      }).setOrigin(0.5).setDepth(5);
      this.crystalPortals.push({ sprite: spr, label: lblObj, x: tx, y: ty, owner: 'player' });
    } else {
      if (this.npcCrystalPortals.length >= 2) {
        this.npcCrystalPortals[0].sprite.destroy(); this.npcCrystalPortals[0].label.destroy();
        this.npcCrystalPortals.shift();
      }
      const idx = this.npcCrystalPortals.length;
      const color = idx === 0 ? 0xaa44ff : 0xff44aa;
      const lbl = idx === 0 ? 'A' : 'B';
      const spr = scene.add.circle(tx, ty, 18, color, 0.35)
        .setStrokeStyle(3, color, 0.7).setDepth(4);
      scene.tweens.add({ targets: spr, alpha: 0.1, yoyo: true, repeat: -1, duration: 700 });
      const lblObj = scene.add.text(tx, ty, lbl, {
        fontSize: '13px', fontFamily: '"Arial Black", sans-serif', color: '#888888',
      }).setOrigin(0.5).setDepth(5);
      this.npcCrystalPortals.push({ sprite: spr, label: lblObj, x: tx, y: ty, owner: 'npc' });
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
      for (const off of baseOffsets) {
        const hpBg = scene.add.rectangle(cx, cy - 28, 30, 5, 0x222222).setDepth(12);
        const hpBar = scene.add.rectangle(cx - 15, cy - 28, 30, 5, 0x44ff88).setDepth(13).setOrigin(0, 0.5);
        const spr = scene.add.circle(cx, cy, 16, 0x88ccff, 0.85)
          .setStrokeStyle(2, 0xaaeeff).setDepth(11);
        const dir = scene.add.rectangle(cx, cy - 20, 4, 10, 0xffffff, 0.8).setDepth(14);
        this.crystalClones.push({ sprite: spr, hp: 50, maxHp: 50, baseOffsetX: off.x, baseOffsetY: off.y, offsetX: off.x, offsetY: off.y, hpBar, hpBg, dirIndicator: dir });
      }
    } else {
      for (const cl of this.npcCrystalClones) { cl.sprite.destroy(); cl.hpBar.destroy(); cl.hpBg.destroy(); cl.dirIndicator.destroy(); }
      this.npcCrystalClones = [];
      this.npcCrystalTrickEnd = scene.time.now + 12000;
      const ncx = npc.x, ncy = npc.y;
      for (const off of [{ x: -58, y: 0 }, { x: 58, y: 0 }]) {
        const hpBg = scene.add.rectangle(ncx, ncy - 28, 30, 4, 0x333333).setDepth(12);
        const hpBar = scene.add.rectangle(ncx - 15, ncy - 28, 30, 4, 0x44aaff).setDepth(13).setOrigin(0, 0.5);
        const spr = scene.add.circle(ncx, ncy, 16, 0x88ccff, 0.65)
          .setStrokeStyle(2, 0xaaeeff).setDepth(11);
        const dir = scene.add.rectangle(ncx, ncx - 20, 4, 10, 0x88ccff, 0.6).setDepth(14); // pre-existing bug: uses ncx twice not ncy — preserved as-is
        this.npcCrystalClones.push({ sprite: spr, hp: 50, maxHp: 50, baseOffsetX: off.x, baseOffsetY: off.y, offsetX: off.x, offsetY: off.y, hpBar, hpBg, dirIndicator: dir });
      }
    }
  }

  // ── Diamond Shard (kite) helpers ────────────────────────────────────────

  private spawnKite(x: number, y: number, tx: number, ty: number, damage: number, isFromPlayer: boolean, wallBounce: boolean): void {
    const { scene } = this.arena;
    const dx = tx - x, dy = ty - y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
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
    }
  }

  // Moving-mirror bounce: instead of leaving lingering mines behind, blast the area
  // immediately — big radius, big damage, no persistent object left on the field.
  private spawnAoeBlast(x: number, y: number, owner: 'player' | 'npc'): void {
    const { scene } = this.arena;
    const RADIUS = 85, DAMAGE = 18;
    const targets = owner === 'player' ? this.arena.enemies : [this.arena.player];
    for (const tgt of targets) {
      if (!tgt.active || tgt.hp <= 0) continue;
      if (Phaser.Math.Distance.Between(x, y, tgt.x, tgt.y) <= RADIUS) {
        tgt.takeDamage(DAMAGE);
        this.arena.spawnHitFlash(tgt.x, tgt.y, 0xffcc44);
      }
    }
    const startR = RADIUS * 0.2;
    const blast = scene.add.circle(x, y, startR, 0xffcc44, 0.6).setStrokeStyle(2, 0xffee88, 0.8).setDepth(9);
    scene.tweens.add({ targets: blast, scaleX: RADIUS / startR, scaleY: RADIUS / startR, alpha: 0, duration: 280, onComplete: () => blast.destroy() });
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
    // proj intentionally left active — updateKiteProjectiles/generic OOB cleanup own its lifetime
  }

  // Crystal mirrors are long thin rectangles (up to 84px), not points — a fixed-radius
  // circle around their center point misses hits anywhere near their length, letting the
  // (now much larger) kite sail straight through. Treat the mirror as a capsule: find the
  // closest point on its actual rotated long axis and test distance against that instead.
  private closestPointOnMirror(node: CrystalNode, px: number, py: number): { x: number; y: number } {
    const half = node.sprite.height / 2; // long axis half-length (unrotated local height)
    const rad = Phaser.Math.DegToRad(node.sprite.angle);
    const ex = -Math.sin(rad) * half, ey = Math.cos(rad) * half; // half-extent along the rotated long axis
    const ax = node.x - ex, ay = node.y - ey, bx = node.x + ex, by = node.y + ey;
    const abx = bx - ax, aby = by - ay;
    const abLenSq = abx * abx + aby * aby || 1;
    const t = Phaser.Math.Clamp(((px - ax) * abx + (py - ay) * aby) / abLenSq, 0, 1);
    return { x: ax + abx * t, y: ay + aby * t };
  }

  private updateKiteProjectiles(time: number, delta: number): void {
    // KITE_HIT_R = mirror half-width + the (tripled) kite's own half-extent, so contact
    // registers when the shard's edge actually reaches the mirror's surface, not its center.
    const KITE_HIT_R = 26, PORTAL_R = 20, EXIT_MARGIN = 6;
    const { player, npc, scene } = this.arena;
    const allProj = this.arena.projectiles.getChildren() as Projectile[];
    for (const go of allProj) {
      const proj = go as Projectile;
      if (!proj.active || proj.texture.key !== 'proj-crystal-kite') { this.kiteState.delete(proj); this.kitePierceHitSets.delete(proj); continue; }
      let st = this.kiteState.get(proj);
      if (!st) { st = { lastBounceObj: null, trailing: false, trailAccum: 0 }; this.kiteState.set(proj, st); }

      const body = proj.body as Phaser.Physics.Arcade.Body;
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
          st.trailing = false; // any new bounce/passthrough stops a prior mine trail
          proj.damage = Math.round(proj.damage * 1.5); // every crystal hit (bounce or gateway) scales damage, matching prior laser convention
          this.arena.spawnHitFlash(cp.x, cp.y, 0x88eeff);
          scene.tweens.add({ targets: node.sprite, alpha: 1, scaleX: 1.3, scaleY: 1.3, duration: 80, yoyo: true });
          if (node.isGateway) {
            // Gateway: pass straight through, no direction change
            this.arena.showFloatingText(node.x, node.y - 18, '+BOOST', '#aaeeff');
          } else {
            // Reflect velocity off the mirror's actual surface normal at the contact point
            // (perpendicular to its rotated long axis, not radial from its center) — this is
            // what makes bounces along the mirror's length look correct instead of "weird".
            let nx: number, ny: number;
            if (dist > 0.01) {
              nx = (proj.x - cp.x) / dist; ny = (proj.y - cp.y) / dist;
            } else {
              const rad = Phaser.Math.DegToRad(node.sprite.angle);
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
            const flash = scene.add.circle(other.x, other.y, 14, 0xcc88ff, 0.6).setDepth(9);
            scene.tweens.add({ targets: flash, scaleX: 2, scaleY: 2, alpha: 0, duration: 200, onComplete: () => flash.destroy() });
            st.lastBounceObj = other; // proj is now physically at `other` — exclude it, not the gate it entered from
            break;
          }
        }
      }
    }
  }
}
