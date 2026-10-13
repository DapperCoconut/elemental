import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { ColorFn } from './ElementVisuals';
import { EarthFx, EARTH } from './EarthVisuals';
import {
  BIOME, BIOME_INFO, BIOME_KINDS, EarthBiome, bnoise,
  drawApple, drawBiomeArrival, drawBiomeFloor, drawBiomeGlyph, drawBiomeLive, drawFlyingSpike,
  drawRiteDais, drawSeedStone, drawSpike, drawStalactite,
} from './EarthBiomeVisuals';

/**
 * Biome Builder — Earth's Q.
 *
 * The caster is drawn to the middle of the arena, stands untouchable on a dais for up to five
 * seconds, and is offered four seed stones, one per quarter of the arena. Each stone they click
 * slams into the floor and that quarter becomes the climate carved on it for twenty seconds.
 * The five climates are hazards for everyone *else*: lava burns, ice slows, the ocean drags
 * toward the caster, the mountain grows spikes, and the jungle drops apples only the owner
 * may eat. Symbiosis (Q+) then pays the owner for standing in their own weather.
 *
 * Everything lives here rather than in EarthKit so the kit only has to forward input, cast
 * signals and a handful of reads. The kit still owns the two things a biome reaches back into:
 * the damage it deals (Symbiosis lava) and the shield (Symbiosis mountain).
 */

type Owner = 'player' | 'npc';

export interface BiomeWorldApi {
  readonly scene: Phaser.Scene;
  readonly player: Fighter;
  readonly npc: Fighter;
  readonly enemies: Fighter[];
  readonly width: number;
  readonly height: number;
  fx(owner: Owner): EarthFx;
  tint(owner: Owner): ColorFn;
  isEarth(owner: Owner): boolean;
  /** Owns the Q+ Symbiosis upgrade. */
  hasSymbiosis(owner: Owner): boolean;
  spawnHitFlash(x: number, y: number, color: number): void;
  /** The rite takes the body: cancel whatever movement the arena had in flight. */
  onRiteStart(owner: Owner): void;
  /** A quarter of the arena just became terrain, a stone just slammed — the rig reacts. */
  onSlam(owner: Owner, kind: EarthBiome): void;
  /** Symbiosis — jungle: 1 health, so the kit can route it through its own heal path. */
  heal(owner: Owner, amount: number): void;
}

const PAD = 32;
const SELECT_MS = 5000;
const GLIDE_MS = 320;
const NPC_CHANNEL_MS = 1100;
const SLAM_MS = 240;
const ZONE_MS = 20000;
const FADE_MS = 2000;
const ARRIVE_MS = 520;
const STONE_PICK_R = 44;

const LAVA_TICK_MS = 500;
const LAVA_TICK_DMG = 3;
const ICE_SLOW = 0.5;
const OCEAN_PULL = 70;
const APPLE_HEAL = 25;
const APPLE_FALL_MS = 650;
const SPIKE_COUNT = 9;
const SPIKE_DMG = 8;
const SPIKE_TOUCH_R = 22;
const SPIKE_HIT_CD = 850;
const SPIKE_LAUNCH_RANGE = 125;
const SPIKE_LAUNCH_ARC = Phaser.Math.DegToRad(42);
const SPIKE_LAUNCH_SPEED = 520;
const SPIKE_LAUNCH_DMG = 30;
const RAIN_DMG = 14;
const RAIN_R = 36;
const SYMBIOSIS_REGEN_MS = 200;

const STONE_OFFSETS: Array<[number, number]> = [[-96, -68], [96, -68], [-96, 68], [96, 68]];

interface SeedStone {
  kind: EarthBiome;
  /** 0 NW, 1 NE, 2 SW, 3 SE — the quarter the stone hangs over. */
  quadrant: number;
  x: number;
  y: number;
  seed: number;
  bornAt: number;
  /** Set when picked; the stone drops and the quarter arrives when this time passes. */
  slamAt: number;
  slammed: boolean;
}

interface Rite {
  owner: Owner;
  startedAt: number;
  fromX: number;
  fromY: number;
  /** Selection window closes; for a bot this is also when its picks slam. */
  until: number;
  stones: SeedStone[];
  wasInvincible: boolean;
  label: Phaser.GameObjects.Text | null;
  /** The bot decides instantly; its stones slam staggered from here. */
  npcSlamFrom: number;
  /** The dais has punched up under the caster — fired once, on the frame the glide lands. */
  arrived: boolean;
}

interface Spike {
  x: number;
  y: number;
  h: number;
  seed: number;
  bornAt: number;
  hitCd: Map<Fighter, number>;
}

interface Zone {
  owner: Owner;
  kind: EarthBiome;
  quadrant: number;
  rect: Phaser.Geom.Rectangle;
  seed: number;
  bornAt: number;
  expiresAt: number;
  floor: Phaser.GameObjects.Graphics;
  maskG: Phaser.GameObjects.Graphics | null;
  tickAccum: number;
  nextAppleAt: number;
  spikes: Spike[];
}

interface Apple {
  owner: Owner;
  x: number;
  groundY: number;
  spawnedAt: number;
  landAt: number;
  expiresAt: number;
}

interface Rain {
  owner: Owner;
  quadrant: number;
  until: number;
  nextAt: number;
}

interface Stalactite {
  owner: Owner;
  x: number;
  y: number;
  spawnedAt: number;
  landAt: number;
  seed: number;
}

interface FlyingSpike {
  owner: Owner;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  spawnedAt: number;
  seed: number;
}

export class BiomeWorld {
  private rites: Partial<Record<Owner, Rite>> = {};
  private zones: Zone[] = [];
  private apples: Apple[] = [];
  private rains: Rain[] = [];
  private stalactites: Stalactite[] = [];
  private flying: FlyingSpike[] = [];
  private regenAccum: Record<Owner, number> = { player: 0, npc: 0 };
  private liveG: Phaser.GameObjects.Graphics | null = null;
  private objG: Phaser.GameObjects.Graphics | null = null;
  private airG: Phaser.GameObjects.Graphics | null = null;
  private riteG: Phaser.GameObjects.Graphics | null = null;
  private hoverX = 0;
  private hoverY = 0;
  private t = 0;

  constructor(private api: BiomeWorldApi) {}

  // ── Reads ────────────────────────────────────────────────────────────────

  isRiteActive(owner: Owner): boolean { return !!this.rites[owner]; }

  /** Anything on the field at all — keeps the kit ticking after a borrowed cast. */
  hasActiveWorld(): boolean {
    return !!this.rites.player || !!this.rites.npc || this.zones.length > 0 || this.apples.length > 0
      || this.stalactites.length > 0 || this.flying.length > 0 || this.rains.length > 0;
  }

  /** The owner's own biome under their feet, when Symbiosis is owned. */
  symbiosisBiome(owner: Owner): EarthBiome | null {
    if (!this.api.isEarth(owner) || !this.api.hasSymbiosis(owner)) return null;
    const f = this.fighter(owner);
    return this.zoneAt(owner, f.x, f.y)?.kind ?? null;
  }

  damageMult(owner: Owner): number { return this.symbiosisBiome(owner) === 'lava' ? 1.2 : 1; }
  shieldStrength(owner: Owner): number { return this.symbiosisBiome(owner) === 'mountain' ? 1.25 : 1; }
  shieldRegenMult(owner: Owner): number { return this.symbiosisBiome(owner) === 'mountain' ? 1.2 : 1; }

  /** Ocean's Symbiosis haste, and the ice an *enemy* laid under this fighter. */
  speedMult(owner: Owner): number {
    let m = this.symbiosisBiome(owner) === 'ocean' ? 1.2 : 1;
    const other: Owner = owner === 'player' ? 'npc' : 'player';
    const f = this.fighter(owner);
    if (this.zoneAt(other, f.x, f.y, 'ice')) m *= ICE_SLOW;
    return m;
  }

  zoneCount(owner: Owner): number { return this.zones.filter((z) => z.owner === owner).length; }

  /** Bot synergy: the target stands in the bot's own mountain, so a Quake there rains rock. */
  npcMountainQuakePoint(): { x: number; y: number } | null {
    const target = this.api.player;
    if (!target.active || target.hp <= 0) return null;
    const z = this.zoneAt('npc', target.x, target.y, 'mountain');
    return z ? { x: target.x, y: target.y } : null;
  }

  /** Bot synergy: a spike sits inside launch reach along the bot's shield facing. */
  npcSpikeReady(shieldAngle: number): boolean {
    const npc = this.api.npc;
    return !!this.findLaunchable('npc', npc.x, npc.y, shieldAngle);
  }

  /** Bot synergy (Symbiosis): the nearest own biome to go and stand in. */
  npcBiomePoint(): { x: number; y: number } | null {
    if (!this.api.hasSymbiosis('npc')) return null;
    const npc = this.api.npc;
    if (this.zoneAt('npc', npc.x, npc.y)) return null;
    let best: Zone | null = null;
    let bestD = Infinity;
    for (const z of this.zones) {
      if (z.owner !== 'npc' || z.kind === 'jungle') continue;
      const d = Phaser.Math.Distance.Between(npc.x, npc.y, z.rect.centerX, z.rect.centerY);
      if (d < bestD) { best = z; bestD = d; }
    }
    return best ? { x: best.rect.centerX, y: best.rect.centerY } : null;
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────

  reset(): void {
    for (const owner of ['player', 'npc'] as Owner[]) {
      const r = this.rites[owner];
      if (r) { r.label?.destroy(); }
      const f = this.fighter(owner);
      if (f) f.earthBiomeIncomingMult = 1;
    }
    this.rites = {};
    for (const z of this.zones) { z.floor.destroy(); z.maskG?.destroy(); }
    this.zones = [];
    this.apples = [];
    this.rains = [];
    this.stalactites = [];
    this.flying = [];
    this.regenAccum = { player: 0, npc: 0 };
    this.liveG?.destroy(); this.liveG = null;
    this.objG?.destroy(); this.objG = null;
    this.airG?.destroy(); this.airG = null;
    this.riteG?.destroy(); this.riteG = null;
    this.t = 0;
  }

  /** The cast. The body is pulled to centre and the stones are offered. */
  startRite(owner: Owner, time: number): void {
    if (this.rites[owner]) return;
    const f = this.fighter(owner);
    this.api.onRiteStart(owner);
    const kinds = this.shuffledKinds();
    const stones: SeedStone[] = kinds.map((kind, i) => ({
      kind, quadrant: i, x: this.cx + STONE_OFFSETS[i][0], y: this.cy + STONE_OFFSETS[i][1],
      seed: Math.random() * 100, bornAt: time + GLIDE_MS + i * 70, slamAt: 0, slammed: false,
    }));
    const rite: Rite = {
      owner, startedAt: time, fromX: f.x, fromY: f.y,
      until: time + (owner === 'player' ? SELECT_MS : NPC_CHANNEL_MS + 4 * 170 + SLAM_MS),
      stones, wasInvincible: f.isInvincible, label: null,
      npcSlamFrom: time + NPC_CHANNEL_MS, arrived: false,
    };
    if (owner === 'player') {
      rite.label = this.api.scene.add.text(this.cx, this.cy - 128, '', {
        fontSize: '13px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
        color: '#f4dfb1', stroke: '#24170d', strokeThickness: 4, align: 'center',
      }).setOrigin(0.5).setDepth(13);
    } else {
      // The bot picks on the spot; its stones drop one after another once the channel is done.
      for (let i = 0; i < stones.length; i++) stones[i].slamAt = rite.npcSlamFrom + i * 170;
    }
    this.rites[owner] = rite;
    f.isInvincible = true;
    this.api.fx(owner).ring(f.x, f.y, 10, 90, EARTH.gold, 420, 5, 9);
    this.api.scene.cameras.main.shake(260, 0.006);
    this.announce(this.cx, this.cy - 96, owner === 'player' ? '🗺️ BUILD THE WORLD' : '🗺️ BIOME BUILDER', '#f4dfb1', 14, 1300);
  }

  /** Dark Treachery hands the ability over with no input router: four random quarters, now. */
  castForeign(owner: Owner, time: number): void {
    const kinds = this.shuffledKinds();
    kinds.forEach((kind, i) => this.spawnZone(owner, kind, i, time));
    const f = this.fighter(owner);
    this.api.fx(owner).ring(f.x, f.y, 24, 130, EARTH.gold, 700, 5, 9);
    this.api.scene.cameras.main.shake(500, 0.014);
  }

  /** Ruin's Second Skin and the kit's own Q-again: close the rite where it stands. */
  endRite(owner: Owner, time: number): boolean {
    const rite = this.rites[owner];
    if (!rite) return false;
    const f = this.fighter(owner);
    f.isInvincible = rite.wasInvincible;
    rite.label?.destroy();
    // Stones that were never chosen crumble where they hang.
    for (const s of rite.stones) {
      if (s.slammed) continue;
      this.api.fx(owner).debris(s.x, s.y - 6, 7, { speed: 90, life: 520, fall: 40, depth: 9 });
      this.api.fx(owner).dust(s.x, s.y, 2, 22, 8);
    }
    delete this.rites[owner];
    return true;
  }

  /** Quake cast: if it lands in (or is cast from) the owner's mountain, the ceiling answers. */
  onQuake(owner: Owner, x: number, y: number, durationMs: number, time: number): void {
    const f = this.fighter(owner);
    const zone = this.zoneAt(owner, x, y, 'mountain') ?? this.zoneAt(owner, f.x, f.y, 'mountain');
    if (!zone) return;
    this.rains = this.rains.filter((r) => !(r.owner === owner && r.quadrant === zone.quadrant));
    this.rains.push({ owner, quadrant: zone.quadrant, until: time + durationMs, nextAt: time + 120 });
    this.announce(zone.rect.centerX, zone.rect.y + 40, '⛰️ THE MOUNTAIN ANSWERS', BIOME_INFO.mountain.text, 12, 1400);
    this.api.scene.cameras.main.shake(300, 0.008);
  }

  /** Click with the shield facing a spike inside reach: the spike becomes the shot. */
  tryLaunchSpike(owner: Owner, aimAngle: number, time: number): boolean {
    const f = this.fighter(owner);
    const found = this.findLaunchable(owner, f.x, f.y, aimAngle);
    if (!found) return false;
    const { zone, spike } = found;
    zone.spikes.splice(zone.spikes.indexOf(spike), 1);
    this.flying.push({
      owner, x: spike.x, y: spike.y - spike.h * 0.4, angle: aimAngle,
      vx: Math.cos(aimAngle) * SPIKE_LAUNCH_SPEED, vy: Math.sin(aimAngle) * SPIKE_LAUNCH_SPEED,
      spawnedAt: time, seed: spike.seed,
    });
    const fx = this.api.fx(owner);
    fx.impact(spike.x, spike.y, 34, { shards: 5, dust: 1, crater: false, depth: 6, duration: 260 });
    fx.muzzleRubble(spike.x, spike.y - 6, aimAngle, 1.1, 8);
    this.announce(spike.x, spike.y - 30, '⛰️ LAUNCH', BIOME_INFO.mountain.text, 11, 900);
    return true;
  }

  // ── Input ─────────────────────────────────────────────────────────────────

  /** The player's rite owns the mouse and the Q key. Returns true while it does. */
  handleInput(time: number, pointer: Phaser.Input.Pointer, pointerWasDown: boolean, mx: number, my: number, qJustDown: boolean): boolean {
    const rite = this.rites.player;
    if (!rite) return false;
    this.hoverX = mx;
    this.hoverY = my;
    if (qJustDown) { this.endRite('player', time); return true; }
    if (pointer.isDown && !pointerWasDown && time >= rite.startedAt + GLIDE_MS) {
      const stone = this.hoveredStone(rite, mx, my);
      if (stone) this.pickStone(rite, stone, time);
    }
    return true;
  }

  // ── Per frame ─────────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    this.t += delta / 1000;
    this.ensureLayers();
    for (const owner of ['player', 'npc'] as Owner[]) this.updateRite(owner, time);
    this.updateZones(time, delta);
    this.updateSymbiosis(delta);
    this.updateApples(time);
    this.updateRains(time);
    this.updateStalactites(time);
    this.updateFlying(time, delta);
    this.paint(time);
  }

  private updateRite(owner: Owner, time: number): void {
    const rite = this.rites[owner];
    if (!rite) return;
    const f = this.fighter(owner);
    if (!f.active || f.hp <= 0) { this.endRite(owner, time); return; }
    const body = f.body as Phaser.Physics.Arcade.Body;
    // Drawn to the dais, then held on it.
    const g = Phaser.Math.Clamp((time - rite.startedAt) / GLIDE_MS, 0, 1);
    const e = 1 - (1 - g) * (1 - g);
    f.setPosition(Phaser.Math.Linear(rite.fromX, this.cx, e), Phaser.Math.Linear(rite.fromY, this.cy, e));
    body.reset(f.x, f.y);
    body.setVelocity(0, 0);
    f.isInvincible = true;
    if (g >= 1 && !rite.arrived) {
      rite.arrived = true;
      // Arrival: the dais punches up.
      const fx = this.api.fx(owner);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        fx.pillar(this.cx + Math.cos(a) * 56, this.cy + 8 + Math.sin(a) * 22, 9, 30, 9);
      }
      fx.impact(this.cx, this.cy + 6, 60, { shards: 8, dust: 3, crater: false, depth: 8 });
    }
    // Stones that were picked drop on their timer.
    for (const s of rite.stones) {
      if (s.slamAt > 0 && !s.slammed && time >= s.slamAt) this.slamStone(rite, s, time);
    }
    if (rite.label) {
      const picked = rite.stones.filter((s) => s.slamAt > 0).length;
      const left = Math.max(0, (rite.until - time) / 1000);
      rite.label.setText(`CHOOSE YOUR BIOMES  ${picked}/4\n${left.toFixed(1)}s  ·  Q to finish`);
    }
    const allDown = rite.stones.every((s) => s.slammed);
    if (time >= rite.until || allDown) this.endRite(owner, time);
  }

  private hoveredStone(rite: Rite, mx: number, my: number): SeedStone | null {
    let best: SeedStone | null = null;
    let bestD = STONE_PICK_R;
    for (const s of rite.stones) {
      if (s.slamAt > 0) continue;
      const d = Phaser.Math.Distance.Between(mx, my, s.x, s.y - 6);
      if (d <= bestD) { best = s; bestD = d; }
    }
    return best;
  }

  private pickStone(rite: Rite, stone: SeedStone, time: number): void {
    stone.slamAt = time + SLAM_MS;
    const info = BIOME_INFO[stone.kind];
    this.api.fx(rite.owner).ring(stone.x, stone.y - 8, 20, 56, info.color, 300, 4, 11);
    this.announce(stone.x, stone.y - 44, `✓ ${info.name}`, info.text, 12, 900);
  }

  private slamStone(rite: Rite, stone: SeedStone, time: number): void {
    stone.slammed = true;
    this.spawnZone(rite.owner, stone.kind, stone.quadrant, time);
    const fx = this.api.fx(rite.owner);
    fx.impact(stone.x, stone.y + 10, 52, { shards: 9, dust: 2, depth: 8, duration: 420 });
    fx.ring(stone.x, stone.y + 10, 14, 120, BIOME_INFO[stone.kind].color, 520, 6, 9);
    this.api.scene.cameras.main.shake(220, 0.012);
    this.api.onSlam(rite.owner, stone.kind);
  }

  // ── Zones ─────────────────────────────────────────────────────────────────

  private spawnZone(owner: Owner, kind: EarthBiome, quadrant: number, time: number): void {
    const old = this.zones.find((z) => z.owner === owner && z.quadrant === quadrant);
    if (old) this.destroyZone(old, time, false);
    const rect = this.quadrantRect(quadrant);
    const seed = Math.random() * 1000;
    const floor = this.api.scene.add.graphics().setDepth(1);
    drawBiomeFloor(floor, this.api.tint(owner), kind, rect, seed);
    // The quarter sweeps in from the centre: a growing circle mask over the painted floor.
    const maskG = this.api.scene.make.graphics({ x: 0, y: 0 }, false);
    floor.setMask(maskG.createGeometryMask());
    const zone: Zone = {
      owner, kind, quadrant, rect, seed, bornAt: time, expiresAt: time + ZONE_MS,
      floor, maskG, tickAccum: 0, nextAppleAt: time + Phaser.Math.Between(1600, 2600), spikes: [],
    };
    if (kind === 'mountain') {
      for (let i = 0; i < SPIKE_COUNT; i++) {
        zone.spikes.push({
          x: rect.x + 34 + bnoise(seed, 10 + i) * (rect.width - 68),
          y: rect.y + 44 + bnoise(seed, 30 + i) * (rect.height - 70),
          h: 30 + bnoise(seed, 50 + i) * 18, seed: seed + i * 1.3,
          bornAt: time + 120 + i * 45, hitCd: new Map(),
        });
      }
    }
    this.zones.push(zone);
    const info = BIOME_INFO[kind];
    this.announce(rect.centerX, rect.centerY - 10, `${info.name} RISES`, info.text, 13, 1500);
  }

  private destroyZone(zone: Zone, time: number, crumble: boolean): void {
    if (crumble) {
      const fx = this.api.fx(zone.owner);
      for (let i = 0; i < 5; i++) {
        fx.dust(zone.rect.x + Math.random() * zone.rect.width, zone.rect.y + Math.random() * zone.rect.height, 2, 40, 3);
      }
      for (const s of zone.spikes) fx.debris(s.x, s.y - 10, 6, { speed: 80, life: 500, fall: 40, depth: 5 });
    }
    zone.floor.destroy();
    zone.maskG?.destroy();
    this.zones.splice(this.zones.indexOf(zone), 1);
    this.apples = this.apples.filter((a) => !(a.owner === zone.owner && this.quadrantAt(a.x, a.groundY) === zone.quadrant));
    this.rains = this.rains.filter((r) => !(r.owner === zone.owner && r.quadrant === zone.quadrant));
    void time;
  }

  private updateZones(time: number, delta: number): void {
    for (let i = this.zones.length - 1; i >= 0; i--) {
      const z = this.zones[i];
      if (time >= z.expiresAt) { this.destroyZone(z, time, true); continue; }
      // Arrival sweep, then the mask is dropped so the floor costs nothing to draw.
      if (z.maskG) {
        const p = Phaser.Math.Clamp((time - z.bornAt) / ARRIVE_MS, 0, 1);
        const far = Math.hypot(this.api.width / 2, this.api.height / 2);
        z.maskG.clear();
        z.maskG.fillStyle(0xffffff, 1);
        z.maskG.fillCircle(this.cx, this.cy, 1 + (1 - (1 - p) * (1 - p)) * far);
        if (p >= 1) { z.floor.clearMask(true); z.maskG = null; }
      }
      const fade = Math.min(1, (z.expiresAt - time) / FADE_MS);
      z.floor.setAlpha(fade);
      const victims = this.targetsOf(z.owner).filter((t) => z.rect.contains(t.x, t.y));
      const fx = this.api.fx(z.owner);

      switch (z.kind) {
        case 'lava': {
          if (victims.length === 0) { z.tickAccum = 0; break; }
          z.tickAccum += delta;
          while (z.tickAccum >= LAVA_TICK_MS) {
            z.tickAccum -= LAVA_TICK_MS;
            for (const t of victims) {
              t.lastDamageOwner = z.owner;
              t.takeDamage(LAVA_TICK_DMG, { fireDot: true, source: z, sourceX: t.x, sourceY: t.y });
              this.api.spawnHitFlash(t.x, t.y, BIOME.melt);
              fx.grit(t.x, t.y + 8, 3, { speed: 50, size: 1.8, life: 420, fall: -30, depth: 7, molten: true });
            }
          }
          break;
        }
        case 'ice': {
          // Fighters the arena drives through a speed multiplier get it pulled from the kit;
          // husks and anything else on the field are slowed by hand.
          for (const t of victims) {
            if (t === this.api.player || t === this.api.npc) continue;
            const b = t.body as Phaser.Physics.Arcade.Body;
            b.velocity.x *= ICE_SLOW; b.velocity.y *= ICE_SLOW;
          }
          break;
        }
        case 'ocean': {
          const caster = this.fighter(z.owner);
          const dt = delta / 1000;
          for (const t of victims) {
            if (t.knockbackImmune || t === caster) continue;
            const dx = caster.x - t.x, dy = caster.y - t.y;
            const len = Math.hypot(dx, dy) || 1;
            if (len < 40) continue;
            t.setPosition(t.x + (dx / len) * OCEAN_PULL * dt, t.y + (dy / len) * OCEAN_PULL * dt);
          }
          break;
        }
        case 'jungle': {
          if (time >= z.nextAppleAt) {
            const x = z.rect.x + 26 + Math.random() * (z.rect.width - 52);
            const y = z.rect.y + 40 + Math.random() * (z.rect.height - 66);
            this.apples.push({ owner: z.owner, x, groundY: y, spawnedAt: time, landAt: time + APPLE_FALL_MS, expiresAt: z.expiresAt });
            z.nextAppleAt = time + Phaser.Math.Between(2400, 3600);
          }
          break;
        }
        case 'mountain': {
          for (const s of z.spikes) {
            if (time < s.bornAt + 300) continue;
            for (const t of victims) {
              if (Phaser.Math.Distance.Between(s.x, s.y, t.x, t.y) > SPIKE_TOUCH_R) continue;
              if (time < (s.hitCd.get(t) ?? 0)) continue;
              s.hitCd.set(t, time + SPIKE_HIT_CD);
              t.lastDamageOwner = z.owner;
              t.takeDamage(SPIKE_DMG, { source: s, sourceX: s.x, sourceY: s.y });
              this.api.spawnHitFlash(t.x, t.y, BIOME.ridgeLit);
              fx.grit(s.x, s.y - s.h * 0.5, 4, { speed: 70, size: 2, life: 380, fall: 50, depth: 7 });
            }
          }
          break;
        }
      }
    }
  }

  private updateSymbiosis(delta: number): void {
    for (const owner of ['player', 'npc'] as Owner[]) {
      const f = this.fighter(owner);
      if (!f) continue;
      const kind = this.symbiosisBiome(owner);
      f.earthBiomeIncomingMult = kind === 'ice' ? 0.8 : 1;
      if (kind === 'jungle') {
        this.regenAccum[owner] += delta;
        while (this.regenAccum[owner] >= SYMBIOSIS_REGEN_MS) {
          this.regenAccum[owner] -= SYMBIOSIS_REGEN_MS;
          this.api.heal(owner, 1);
        }
      } else {
        this.regenAccum[owner] = 0;
      }
    }
  }

  private updateApples(time: number): void {
    for (let i = this.apples.length - 1; i >= 0; i--) {
      const a = this.apples[i];
      if (time >= a.expiresAt) { this.apples.splice(i, 1); continue; }
      if (time < a.landAt) continue;
      const eater = this.fighter(a.owner);
      if (eater.active && eater.hp > 0 && Phaser.Math.Distance.Between(a.x, a.groundY, eater.x, eater.y) <= 28) {
        this.api.heal(a.owner, APPLE_HEAL);
        this.announce(eater.x, eater.y - 40, `🍎 +${APPLE_HEAL}`, BIOME_INFO.jungle.text, 12, 1000);
        this.api.fx(a.owner).ring(a.x, a.groundY, 6, 34, BIOME.leafLit, 320, 3, 8);
        this.apples.splice(i, 1);
        continue;
      }
      // An enemy treading on it is denial, not a snack.
      const crusher = this.targetsOf(a.owner).find((t) => Phaser.Math.Distance.Between(a.x, a.groundY, t.x, t.y) <= 22);
      if (crusher) {
        this.api.fx(a.owner).grit(a.x, a.groundY, 6, { speed: 60, size: 2.2, life: 400, fall: 30, depth: 7 });
        this.announce(a.x, a.groundY - 26, 'SQUASHED', '#c9b9a0', 10, 700);
        this.apples.splice(i, 1);
      }
    }
  }

  private updateRains(time: number): void {
    for (let i = this.rains.length - 1; i >= 0; i--) {
      const r = this.rains[i];
      const zone = this.zones.find((z) => z.owner === r.owner && z.quadrant === r.quadrant && z.kind === 'mountain');
      if (time >= r.until || !zone) { this.rains.splice(i, 1); continue; }
      if (time >= r.nextAt) {
        r.nextAt = time + Phaser.Math.Between(380, 620);
        // Drop near a victim when one is inside; otherwise anywhere on the quarter.
        const victim = this.targetsOf(r.owner).find((t) => zone.rect.contains(t.x, t.y));
        const x = victim ? Phaser.Math.Clamp(victim.x + (Math.random() - 0.5) * 90, zone.rect.x + 20, zone.rect.right - 20)
          : zone.rect.x + 24 + Math.random() * (zone.rect.width - 48);
        const y = victim ? Phaser.Math.Clamp(victim.y + (Math.random() - 0.5) * 90, zone.rect.y + 30, zone.rect.bottom - 20)
          : zone.rect.y + 30 + Math.random() * (zone.rect.height - 56);
        this.stalactites.push({ owner: r.owner, x, y, spawnedAt: time, landAt: time + 620, seed: Math.random() * 100 });
      }
    }
  }

  private updateStalactites(time: number): void {
    for (let i = this.stalactites.length - 1; i >= 0; i--) {
      const s = this.stalactites[i];
      if (time < s.landAt) continue;
      const fx = this.api.fx(s.owner);
      for (const t of this.targetsOf(s.owner)) {
        if (Phaser.Math.Distance.Between(s.x, s.y, t.x, t.y) > RAIN_R) continue;
        t.lastDamageOwner = s.owner;
        t.takeDamage(RAIN_DMG, { source: s, sourceX: s.x, sourceY: s.y });
        this.api.spawnHitFlash(t.x, t.y, BIOME.ridgeLit);
      }
      fx.impact(s.x, s.y, 46, { shards: 7, dust: 2, depth: 6, duration: 340 });
      this.stalactites.splice(i, 1);
    }
  }

  private updateFlying(time: number, delta: number): void {
    const dt = delta / 1000;
    for (let i = this.flying.length - 1; i >= 0; i--) {
      const s = this.flying[i];
      s.x += s.vx * dt; s.y += s.vy * dt;
      const target = this.targetsOf(s.owner).find((t) => Phaser.Math.Distance.Between(s.x, s.y, t.x, t.y) < 28);
      const out = time - s.spawnedAt > 1500 || s.x < PAD - 10 || s.y < PAD - 10 || s.x > this.api.width - PAD + 10 || s.y > this.api.height - PAD + 10;
      if (!target && !out) continue;
      const fx = this.api.fx(s.owner);
      if (target) {
        target.lastDamageOwner = s.owner;
        target.takeDamage(SPIKE_LAUNCH_DMG, { source: s, sourceX: s.x, sourceY: s.y });
        this.api.spawnHitFlash(target.x, target.y, BIOME.ridgeLit);
        const b = target.body as Phaser.Physics.Arcade.Body;
        if (!target.knockbackImmune) b.setVelocity(Math.cos(s.angle) * 220, Math.sin(s.angle) * 220);
        this.announce(target.x, target.y - 34, `⛰️ SPIKE ${SPIKE_LAUNCH_DMG}`, BIOME_INFO.mountain.text, 11, 900);
      }
      fx.shatter(s.x, s.y, s.angle, EARTH.sand, 8, 8);
      fx.impact(s.x, s.y, 36, { shards: 6, dust: 1, crater: false, depth: 7, duration: 280 });
      this.flying.splice(i, 1);
    }
  }

  // ── Painting ──────────────────────────────────────────────────────────────

  private paint(time: number): void {
    const live = this.liveG!, obj = this.objG!, air = this.airG!, rite = this.riteG!;
    live.clear(); obj.clear(); air.clear(); rite.clear();

    for (const z of this.zones) {
      const tint = this.api.tint(z.owner);
      const fade = Math.min(1, (z.expiresAt - time) / FADE_MS);
      const arrive = Phaser.Math.Clamp((time - z.bornAt) / ARRIVE_MS, 0, 1);
      if (arrive < 1) drawBiomeArrival(live, tint, z.kind, z.rect, this.cx, this.cy, arrive, 1);
      else drawBiomeLive(live, tint, z.kind, z.rect, this.t + z.seed, z.seed, fade);
      // A small glyph at the quarter's outer corner names it without a word of text.
      const gx = z.rect.centerX < this.cx ? z.rect.x + 22 : z.rect.right - 22;
      const gy = z.rect.centerY < this.cy ? z.rect.y + 22 : z.rect.bottom - 22;
      live.fillStyle(tint(EARTH.crevice), 0.45 * fade * arrive);
      live.fillCircle(gx, gy, 15);
      drawBiomeGlyph(live, tint, z.kind, gx, gy, 9, 0.9 * fade * arrive, this.t);
      for (const s of z.spikes) {
        drawSpike(obj, tint, s.x, s.y, s.h, s.seed, Phaser.Math.Clamp((time - s.bornAt) / 300, 0, 1), fade);
      }
    }

    for (const a of this.apples) {
      const tint = this.api.tint(a.owner);
      const fall = Phaser.Math.Clamp((time - a.spawnedAt) / APPLE_FALL_MS, 0, 1);
      const y = Phaser.Math.Linear(a.groundY - 110, a.groundY, fall * fall);
      const bob = fall >= 1 ? Math.sin(time / 180 + a.x) * 1.2 : 0;
      const fade = Math.min(1, (a.expiresAt - time) / 600);
      if (fall < 1) drawApple(air, tint, a.x, y, a.groundY, 1, fall);
      else drawApple(obj, tint, a.x, y + bob, a.groundY, fade, 1);
    }

    for (const s of this.stalactites) {
      const tint = this.api.tint(s.owner);
      const fall = Phaser.Math.Clamp((time - s.spawnedAt) / (s.landAt - s.spawnedAt), 0, 1);
      // The landing mark grows under it so the drop is dodgeable on sight.
      obj.lineStyle(2, tint(BIOME.ridgeLit), 0.35 + fall * 0.45);
      obj.strokeCircle(s.x, s.y, RAIN_R * (0.4 + fall * 0.6));
      obj.fillStyle(tint(EARTH.crevice), 0.12 + fall * 0.3);
      obj.fillEllipse(s.x, s.y + 4, 22 * fall + 6, 9 * fall + 3);
      drawStalactite(air, tint, s.x, Phaser.Math.Linear(s.y - 150, s.y, fall * fall), s.seed, 1);
    }

    for (const s of this.flying) drawFlyingSpike(air, this.api.tint(s.owner), s.x, s.y, s.angle, s.seed, 1);

    for (const owner of ['player', 'npc'] as Owner[]) {
      const r = this.rites[owner];
      if (!r) continue;
      const tint = this.api.tint(owner);
      const grow = Phaser.Math.Clamp((time - r.startedAt) / GLIDE_MS, 0, 1);
      const progress = owner === 'player' ? Phaser.Math.Clamp((r.until - time) / SELECT_MS, 0, 1)
        : Phaser.Math.Clamp((time - r.startedAt) / (r.until - r.startedAt), 0, 1);
      drawRiteDais(rite, tint, this.cx, this.cy, this.t, grow, progress, 1);
      for (const s of r.stones) {
        if (s.slammed) continue;
        const sg = Phaser.Math.Clamp((time - s.bornAt) / 260, 0, 1);
        if (sg <= 0) continue;
        if (s.slamAt > 0) {
          // Picked: it rises for a beat and comes down hard.
          const p = Phaser.Math.Clamp((time - (s.slamAt - SLAM_MS)) / SLAM_MS, 0, 1);
          const y = p < 0.35 ? s.y - p / 0.35 * 26 : s.y - 26 + ((p - 0.35) / 0.65) ** 2 * 36;
          drawSeedStone(rite, tint, s.kind, s.x, y, this.t, s.seed, 1, true, 1);
          continue;
        }
        const hover = owner === 'player' && Phaser.Math.Distance.Between(this.hoverX, this.hoverY, s.x, s.y - 6) <= STONE_PICK_R;
        drawSeedStone(rite, tint, s.kind, s.x, s.y, this.t, s.seed, sg, hover, 1);
        if (hover) {
          const info = BIOME_INFO[s.kind];
          rite.fillStyle(tint(EARTH.crevice), 0.8);
          rite.fillRoundedRect(s.x - 86, s.y + 30, 172, 20, 5);
          rite.lineStyle(1.5, tint(info.color), 0.9);
          rite.strokeRoundedRect(s.x - 86, s.y + 30, 172, 20, 5);
        }
      }
      // A hovered stone's rule, as text, so the choice is informed.
      if (owner === 'player') {
        const hov = this.hoveredStone(r, this.hoverX, this.hoverY);
        if (r.label) {
          const picked = r.stones.filter((s) => s.slamAt > 0).length;
          const left = Math.max(0, (r.until - time) / 1000);
          const line = hov ? `${BIOME_INFO[hov.kind].name} — ${BIOME_INFO[hov.kind].rule}` : 'click a stone to raise its biome';
          r.label.setText(`CHOOSE YOUR BIOMES  ${picked}/4  ·  ${left.toFixed(1)}s\n${line}`);
        }
      }
    }
  }

  private ensureLayers(): void {
    if (!this.liveG?.active) this.liveG = this.api.scene.add.graphics().setDepth(1.6);
    if (!this.objG?.active) this.objG = this.api.scene.add.graphics().setDepth(4);
    if (!this.airG?.active) this.airG = this.api.scene.add.graphics().setDepth(9);
    if (!this.riteG?.active) this.riteG = this.api.scene.add.graphics().setDepth(10);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private get cx(): number { return this.api.width / 2; }
  private get cy(): number { return this.api.height / 2; }

  private fighter(owner: Owner): Fighter { return owner === 'player' ? this.api.player : this.api.npc; }

  private targetsOf(owner: Owner): Fighter[] {
    const list = owner === 'player' ? this.api.enemies : [this.api.player];
    return list.filter((f) => f && f.active && f.hp > 0);
  }

  private shuffledKinds(): EarthBiome[] {
    return [...BIOME_KINDS].sort(() => Math.random() - 0.5).slice(0, 4);
  }

  private quadrantRect(q: number): Phaser.Geom.Rectangle {
    const left = q % 2 === 0;
    const top = q < 2;
    const x = left ? PAD : this.cx;
    const y = top ? PAD : this.cy;
    const r = left ? this.cx : this.api.width - PAD;
    const b = top ? this.cy : this.api.height - PAD;
    return new Phaser.Geom.Rectangle(x, y, r - x, b - y);
  }

  private quadrantAt(x: number, y: number): number {
    return (y < this.cy ? 0 : 2) + (x < this.cx ? 0 : 1);
  }

  private zoneAt(owner: Owner, x: number, y: number, kind?: EarthBiome): Zone | undefined {
    const q = this.quadrantAt(x, y);
    return this.zones.find((z) => z.owner === owner && z.quadrant === q && (!kind || z.kind === kind)
      && z.rect.contains(x, y));
  }

  private findLaunchable(owner: Owner, fx: number, fy: number, aim: number): { zone: Zone; spike: Spike } | null {
    let best: { zone: Zone; spike: Spike; d: number } | null = null;
    for (const zone of this.zones) {
      if (zone.owner !== owner || zone.kind !== 'mountain') continue;
      for (const spike of zone.spikes) {
        const d = Phaser.Math.Distance.Between(fx, fy, spike.x, spike.y);
        if (d > SPIKE_LAUNCH_RANGE) continue;
        const diff = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(spike.y - fy, spike.x - fx) - aim));
        if (diff > SPIKE_LAUNCH_ARC) continue;
        if (!best || d < best.d) best = { zone, spike, d };
      }
    }
    return best ? { zone: best.zone, spike: best.spike } : null;
  }

  /** The kit's own pop-up: ArenaScene's is a no-op, and these few are worth reading. */
  private announce(x: number, y: number, text: string, color: string, size: number, ms: number): void {
    const scene = this.api.scene;
    const t = scene.add.text(x, y, text, {
      fontSize: `${size}px`, fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
      color, stroke: '#140d08', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(14);
    scene.tweens.add({ targets: t, y: y - 26, alpha: 0, duration: ms, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
  }
}
