import Phaser from 'phaser';
import { FONT_DISPLAY, FONT_UI, FONT_MONO } from '../../ui';
import { Music, Sfx } from '../../audio';
import { findElementDef, ELEMENT_DATA_MAP } from '../../data/ElementRoster';
import * as Save from '../IslesSave';
import { boats, getUber, allUbers, getIsle, getArea } from '../IslesRegistry';
import type { BoatDef, IsleDef, Pt } from '../IslesTypes';

/**
 * Sailing. The boat never stops: the sea scrolls toward you and you steer through it, shooting
 * rocks apart with your element and scooping up what floats. Hull reaches zero and the boat is
 * lost — and the boat was what you paid for.
 *
 * `dest: 'wastes'` is the Far Wastes: endless, banded by depth (the Shallows, the Grey Reach,
 * the Drowned Dark, the Abyssal Line), each band thicker with danger and richer in loot, with sea
 * beasts surfacing in the deep. Turn for home (H) any time to keep what is in the hold.
 *
 * Any other `dest` is an isle id: a *crossing* — the same sea, kept to the upper two bands, that
 * ends in landfall at that isle's port once `CROSSING_M` metres are behind you. A crossing to one
 * of the abstract isles (`IsleDef.outer`) runs the Outer Sea instead: longer, in black water, with a
 * swell that shoves the boat about, storm flashes, and breakers rolling in to thread.
 */

/** How long a crossing between two isles is. */
const CROSSING_M = 2600;
/** Hazards stop spawning this far from landfall, so the coast comes up clear. */
const COAST_M = 480;
/** A crossing of the Outer Sea, out to the abstract isles beyond the Breakwater. */
const OUTER_CROSSING_M = 3800;
/** Seconds a venom glob is in the air before it lands as a slick, and how long the slick lasts after. */
const SLICK_FLIGHT = 0.9;
const SLICK_LIFE = 7.5;
/** The Hydra Prow: seconds a head takes to grow back after it bites, and how far each one reaches. */
const PROW_REGROW = 8;
const PROW_REACH = 120;
/** Half the width of the trough a breaker leaves to slip through. */
const BREAKER_GAP = 78;
/** The Wheelback's dice: seconds a die tumbles before it lands, seconds per pip as it counts down, and its burst radius. */
const DIE_ROLL = 0.9;
/** The Cantor's sound-rings: how fast one spreads (px/s), the half-width of each rest (radians) and how far it carries. */
const RING_SPEED = 175;
const RING_REST = 0.2;
const RING_MAX = 1050;
/** The Foghorn Bow: seconds between blasts, how far the blast shoves drift and mines, and how long it holds the sea ahead. */
const HORN_EVERY = 8;
const HORN_REACH = 430;
const HORN_HOLD = 2;
/** The Lensback's burning spots: seconds the glint swells before the beam, how long the beam lands, and how long the scorch burns after. */
const BURN_WARN = 1.15;
const BURN_BEAM = 0.25;
const BURN_LINGER = 1.1;
/** The Burning Glass Prow: seconds between lances, and how far ahead the lens reaches. */
const GLASS_EVERY = 7;
const GLASS_REACH = 470;
/** The Cantor's half-width along its length, from the tip of its head (0) to the tail stock (1). */
const CANTOR_PROFILE: [number, number][] = [[0, 16], [0.07, 36], [0.18, 52], [0.36, 60], [0.55, 54], [0.75, 36], [0.9, 19], [1, 11]];
const DIE_TICK = 0.6;
const DIE_RING = 84;
/** The Fortune Helm: seconds between spins, and how long the little wheel whirls before it lands. */
const HELM_EVERY = 7;
const HELM_WHIRL = 1;
/** Where the pips sit on a die face for each count, in units of a third of the face. */
const PIPS: Record<number, [number, number][]> = {
  1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
  5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
};
/** The Fortune Helm's three boons, in wheel order. */
const HELM_BOONS = ['gust', 'ward', 'broadside'] as const;
type HelmBoon = (typeof HELM_BOONS)[number];

/**
 * Sea beasts, by the `beast` id an isle's `UberDef` names. Each guards its isle's Uber-upgrade
 * and only surfaces once you have landed on that isle. `shot` tints its spit; `spawn` is what
 * its third attack throws on the water.
 */
const BEASTS: Record<string, { name: string; shot: number; bar: number; spawn: 'driftwall' | 'whirls' | 'brambles' | 'gusts' | 'rockfall' | 'arcs' | 'slicks' | 'dice' | 'rings' | 'burns' }> = {
  magmaw: { name: 'THE MAGMAW', shot: 0xff5a1a, bar: 0xff6a2a, spawn: 'driftwall' },
  wyrm: { name: 'THE MAELSTROM WYRM', shot: 0x6ad8ff, bar: 0x4ab8ff, spawn: 'whirls' },
  brambleback: { name: 'THE BRAMBLEBACK', shot: 0x9ad84a, bar: 0x7ac83a, spawn: 'brambles' },
  skyray: { name: 'THE SKYRAY', shot: 0xe8f8ff, bar: 0x9ad8ff, spawn: 'gusts' },
  cragjaw: { name: 'THE CRAGJAW', shot: 0xc8b090, bar: 0xb89a6a, spawn: 'rockfall' },
  galvaneel: { name: 'THE GALVANEEL', shot: 0x8ad8ff, bar: 0x5ab8ff, spawn: 'arcs' },
  hydra: { name: 'THE MIRE HYDRA', shot: 0x8ae03a, bar: 0x6ac82a, spawn: 'slicks' },
  wheelback: { name: 'THE WHEELBACK', shot: 0xe8c050, bar: 0xd83a3a, spawn: 'dice' },
  cantor: { name: 'THE CANTOR', shot: 0xf0dca0, bar: 0xc8a050, spawn: 'rings' },
  lensback: { name: 'THE LENSBACK', shot: 0xfff4c8, bar: 0xf0c848, spawn: 'burns' },
};

/** `bramble`: a floating mat of thorn-vine the Brambleback sheds; it snags (stops your drift) and scratches, but can be shot apart. */
/** `gust`: a gust front the Skyray's wake throws across the water — a band the width of the sea that shoves the boat toward `seed`'s sign; it cannot be shot. */
/** `arc`: a live line the Galvaneel strings across the water between two charged floats (`x - r` to `x + r`); it crackles on a beat (live while `armed` > 0) and shocks a boat crossing it while live; it cannot be shot. */
/** `breaker`: an Outer Sea roller — a wall of white water the width of the sea rolling in faster than the swell, with one trough (`seed` = its x) to steer through; it cannot be shot or rammed. */
/** `boulder`: a boulder the Cragjaw shrugs off its back — a shadow on the water first; when it lands it smashes whatever is under it and settles as a rock. */
/** `slick`: a glob of venom the Mire Hydra spits — in the air for `SLICK_FLIGHT` s (its shadow on the water), then a sheen of venom spreading on the sea; crossing it corrodes the hull once (`armed` 2 once it has) and drags the boat while you are in it; it thins and fades over `SLICK_LIFE` s; it cannot be shot. `seed` is the x it was spat from. */
/** `die`: a boat-sized die the Wheelback rolls onto the sea — it tumbles in from `seed` (an x) for `DIE_ROLL` s and lands at `x` showing `maxHp` pips; `armed` is the pips left, one ticking off every `DIE_TICK` s (`tick` counts down to the next), and at zero it bursts in a ring of spray `DIE_RING` wide that damages a boat inside it. It CAN be shot: each hit knocks a pip off (a tumbling die is knocked flat where it is), so shooting it out early bursts it well ahead of the boat. */
/** `ring`: a sound-ring the Cantor sings — centred where it sounded (it does not drift with the sea), its radius `r` spreading at `RING_SPEED` from `t` 0, broken by two rests at the angles in `gaps` (each `RING_REST` either side); a boat it meets outside a rest loses a plank and is shoved outward (`armed` 1 once it has met the boat). It cannot be shot. */
/** `burn`: a burning spot the Lensback focuses on the sea — fixed where it was aimed (it does not drift with the sea); a glint swells for `BURN_WARN` s, then the beam lands for `BURN_BEAM` s and the scorch burns `BURN_LINGER` s more; a boat inside `r` while it burns loses a plank (`armed` 1 once it has; `tick` set once the beam has landed). It cannot be shot. */
type HazardKind = 'rock' | 'reef' | 'mine' | 'whirl' | 'drift' | 'tentacle' | 'spout' | 'bramble' | 'gust' | 'boulder' | 'breaker' | 'arc' | 'slick' | 'die' | 'ring' | 'burn';
/** `held`: seconds the Foghorn Bow still holds this hazard (its own motion and timers stop; it still drifts with the sea). */
interface Hazard { kind: HazardKind; x: number; y: number; r: number; hp: number; maxHp: number; t: number; seed: number; dead: boolean; armed?: number; tick?: number; gaps?: number[]; held?: number }
interface Loot { kind: 'crate' | 'barrel' | 'orb' | 'bottle'; x: number; y: number; t: number; taken: boolean }
interface Shot { x: number; y: number; vx: number; vy: number; dmg: number; life: number; big?: boolean; foe?: boolean }
interface Beast {
  name: string; x: number; y: number; hp: number; maxHp: number; t: number;
  nextAttack: number; phase: 'rise' | 'fight' | 'sink'; attack: string | null; attackT: number;
  dropsUber: string;
  /** Key into `BEASTS`. */
  kind: string;
}

const BANDS = [
  { at: 0, name: 'The Shallows', sea: 0x1c4a6a, deep: 0x123850, foam: 0x9ad8ff },
  { at: 900, name: 'The Grey Reach', sea: 0x1a3448, deep: 0x0e2234, foam: 0x7ab8d8 },
  { at: 2000, name: 'The Drowned Dark', sea: 0x10202e, deep: 0x08121c, foam: 0x5a8aa8 },
  { at: 3400, name: 'The Abyssal Line', sea: 0x080e18, deep: 0x04060c, foam: 0x4a6aa0 },
];

/** The Outer Sea's bands: darker, colder blues with bright whitecaps; a crossing goes all three deep. */
const OUTER_BANDS = [
  { at: 0, name: 'The Outer Swell', sea: 0x0b2240, deep: 0x07162c, foam: 0xbfe2ff },
  { at: 1200, name: 'The Breakers', sea: 0x081a34, deep: 0x050f22, foam: 0xd4eeff },
  { at: 2600, name: 'The Black Rollers', sea: 0x05112a, deep: 0x030918, foam: 0xe4f4ff },
];

export class SeaVoyageScene extends Phaser.Scene {
  private dest = 'wastes';
  private from = 'emberport';
  private fromPos: Pt = { x: -1, y: -1 };
  private boat!: BoatDef;
  private bx = 480;
  private by = 500;
  private bvx = 0;
  private heading = 0;
  private speed = 150;
  private hull = 3;
  private maxHull = 3;
  private dist = 0;
  private haul = 0;
  private orbs = 0;
  private hazards: Hazard[] = [];
  private loot: Loot[] = [];
  private shots: Shot[] = [];
  private beast: Beast | null = null;
  private nextSpawn = 0;
  private nextLoot = 0;
  private fireCd = 0;
  private burstCd = 0;
  private turretCd = 0;
  private invuln = 0;
  private over = false;
  private wake: Pt[] = [];
  private beastChecks = 0;
  private g!: Phaser.GameObjects.Graphics;
  private gHud!: Phaser.GameObjects.Graphics;
  private hudText!: Phaser.GameObjects.Text;
  private bandText!: Phaser.GameObjects.Text;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private elementColor = 0xff7a2f;
  private shotName = 'Bolt';
  private lastBand = -1;
  private rng: () => number = Math.random;
  /** The isle a crossing makes for; null in the Far Wastes. */
  private crossing: IsleDef | null = null;
  /** Seconds since the Figurehead last threw its bow wave (drawn as a spreading arc). */
  private bowWaveT = 9;
  /** True on an Outer Sea crossing. */
  private rough = false;
  /** Seconds of swell; drives the sideways heave. */
  private swellT = 0;
  /** Pixels of sea until the next breaker rolls in. */
  private nextBreaker = 0;
  /** Seconds until the next storm flash. */
  private nextFlash = 0;
  /** Seconds since the last storm flash (drawn as the fork of lightning). */
  private flashT = 9;
  private flashX = 480;

  constructor() { super({ key: 'SeaVoyageScene' }); }

  init(data: { dest: string; from: string; pos: Pt }): void {
    this.dest = data?.dest ?? 'wastes';
    this.from = data?.from ?? 'emberport';
    this.fromPos = data?.pos ?? { x: -1, y: -1 };
    this.crossing = this.dest === 'wastes' ? null : getIsle(this.dest) ?? null;
    if (!this.crossing) this.dest = 'wastes';
    this.rough = !!this.crossing?.outer;
    this.swellT = 0; this.nextBreaker = 1400; this.nextFlash = 4; this.flashT = 9;
    this.bowWaveT = 9; this.hornT = 9; this.glassT = 9; this.glassHits = [];
    this.slickDrag = 0; this.prowReady = [0, 0, 0];
    this.helmBoon = null; this.helmWard = false; this.helmT = 9; this.helmAngle = 0; this.helmPending = false;
    this.over = false;
    this.hazards = []; this.loot = []; this.shots = []; this.wake = [];
    this.beast = null;
    this.dist = 0; this.haul = 0; this.orbs = 0; this.beastChecks = 0; this.lastBand = -1;
  }

  private up(id: string): number { return Save.S().boat.upgrades[id] ?? 0; }

  create(): void {
    Music.play('gauntlet');
    const s = Save.S();
    this.boat = boats().find((b) => b.id === s.boat.owned) ?? boats()[0];
    this.maxHull = this.boat.hull + this.up('hull') * 2;
    this.hull = this.maxHull;
    this.speed = this.boat.speed * (1 + this.up('sails') * 0.12);
    this.elementColor = findElementDef(s.element)?.color ?? 0xff7a2f;
    this.shotName = ELEMENT_DATA_MAP[s.element]?.abilities[0]?.name ?? 'Bolt';
    this.bx = 480; this.by = 500;
    this.g = this.add.graphics();
    this.gHud = this.add.graphics().setDepth(10);
    this.hudText = this.add.text(16, 12, '', { fontFamily: FONT_MONO, fontSize: '14px', color: '#e8f4ff', stroke: '#000', strokeThickness: 4 }).setDepth(11);
    this.bandText = this.add.text(480, 120, '', { fontFamily: FONT_DISPLAY, fontSize: '26px', color: '#d8eeff', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5).setDepth(11).setAlpha(0);
    this.add.text(480, 626, `A/D steer · W/S trim · CLICK/SPACE ${this.shotName} · E Tidal Burst · H head home`, { fontFamily: FONT_UI, fontSize: '12px', color: '#b8d0e8', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5, 1).setDepth(11);
    this.keys = this.input.keyboard!.addKeys('A,D,W,S,LEFT,RIGHT,UP,DOWN,SPACE,E,H,ESC') as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.keyboard!.addCapture('SPACE');
    this.rng = Math.random;
    this.nextSpawn = 600;
    this.nextLoot = 400;
    Save.S().stats.voyages += 1;
    Save.persist();
    this.cameras.main.fadeIn(400, 0, 0, 0);
  }

  private bands(): typeof BANDS { return this.rough ? OUTER_BANDS : BANDS; }

  private band(): number {
    let b = 0;
    this.bands().forEach((x, i) => { if (this.dist >= x.at) b = i; });
    // A crossing keeps to the charted lanes: never deeper than the Grey Reach. The Outer Sea has no lanes.
    return this.crossing && !this.rough ? Math.min(b, 1) : b;
  }

  /** Metres left to landfall on a crossing (Infinity in the Wastes). */
  private toLand(): number { return this.crossing ? (this.rough ? OUTER_CROSSING_M : CROSSING_M) - this.dist : Infinity; }

  update(time: number, deltaRaw: number): void {
    const dt = Math.min(deltaRaw, 40) / 1000;
    if (this.over) { this.draw(time / 1000); return; }
    const k = this.keys;
    const steer = (k.A.isDown || k.LEFT.isDown ? -1 : 0) + (k.D.isDown || k.RIGHT.isDown ? 1 : 0);
    const trim = (k.W.isDown || k.UP.isDown ? 1 : 0) - (k.S.isDown || k.DOWN.isDown ? 1 : 0);
    const handling = this.boat.handling * (1 + this.up('rudder') * 0.15);
    this.bvx += steer * handling * 260 * dt;
    this.bvx *= Math.pow(0.12, dt);
    this.bx = Phaser.Math.Clamp(this.bx + this.bvx * dt, 40, 920);
    this.heading = Phaser.Math.Clamp(this.bvx / 400, -0.5, 0.5);
    this.sailT += dt;
    this.slickDrag = Math.max(0, this.slickDrag - dt);
    const fwd = this.speed * (1 + trim * 0.25) * (this.sailT < 1.1 ? 1.7 : 1) * (this.slickDrag > 0 ? 0.55 : 1);
    this.by = Phaser.Math.Linear(this.by, 500 - trim * 40, 0.04);
    this.dist += fwd * dt / 10;

    // Band change banner.
    const bi = this.band();
    if (bi !== this.lastBand) {
      this.lastBand = bi;
      this.bandText.setText(this.bands()[bi].name.toUpperCase()).setAlpha(1);
      this.tweens.add({ targets: this.bandText, alpha: 0, delay: 1800, duration: 700 });
      if (bi > 0) Sfx.play('boss-phase');
    }

    // Scroll the world toward the boat.
    const scroll = fwd * dt;
    for (const h of this.hazards) {
      if (h.kind !== 'ring' && h.kind !== 'burn') h.y += scroll;
      if ((h.held ?? 0) > 0) h.held = (h.held ?? 0) - dt; else h.t += dt;
    }
    for (const l of this.loot) { l.y += scroll; l.t += dt; }
    if (this.beast) { this.beast.t += dt; }
    this.hazards = this.hazards.filter((h) => !h.dead && h.y < 720);
    this.loot = this.loot.filter((l) => !l.taken && l.y < 700);

    // Spawning, thicker with depth.
    this.nextSpawn -= scroll;
    if (this.nextSpawn <= 0 && !(this.beast && this.beast.phase !== 'sink') && this.toLand() > COAST_M) {
      this.spawnRow(bi);
      this.nextSpawn = Math.max(90, 260 - bi * 45 - this.dist * 0.01) * (0.7 + this.rng() * 0.6) * (this.rough ? 0.8 : 1);
    }
    if (this.rough) this.roughWater(dt, scroll, bi);
    this.nextLoot -= scroll;
    if (this.nextLoot <= 0) {
      const r = this.rng();
      const kind: Loot['kind'] = r < 0.08 + bi * 0.04 ? 'orb' : r < 0.25 ? 'barrel' : r < 0.32 ? 'bottle' : 'crate';
      this.loot.push({ kind, x: 60 + this.rng() * 840, y: -40, t: 0, taken: false });
      this.nextLoot = 220 + this.rng() * 260;
    }

    // Sea beasts in the deep.
    if (this.dest === 'wastes' && !this.beast && this.dist > 1400 + this.beastChecks * 700) {
      this.beastChecks += 1;
      if (this.rng() < 0.45 + bi * 0.1) this.summonBeast();
    }

    // Weapons.
    this.fireCd -= dt; this.burstCd -= dt; this.turretCd -= dt;
    const cannon = this.up('cannon');
    if ((this.input.activePointer.isDown || k.SPACE.isDown) && this.fireCd <= 0) {
      const p = this.input.activePointer;
      const aim = this.input.activePointer.isDown ? Math.atan2(p.worldY - this.by, p.worldX - this.bx) : -Math.PI / 2;
      this.shots.push({ x: this.bx, y: this.by - 26, vx: Math.cos(aim) * 520, vy: Math.sin(aim) * 520, dmg: 1 + cannon * 0.5, life: 1.2 });
      this.fireCd = 0.34 - cannon * 0.06;
      Sfx.play('fireball');
    }
    if (Phaser.Input.Keyboard.JustDown(k.E) && this.burstCd <= 0) {
      this.burstCd = 7;
      Sfx.play('explosion-large');
      this.cameras.main.shake(200, 0.006);
      const ring = this.add.circle(this.bx, this.by, 170, this.elementColor, 0.25).setScale(0.2);
      this.tweens.add({ targets: ring, scale: 1, alpha: 0, duration: 380, onComplete: () => ring.destroy() });
      for (const h of this.hazards) if (h.kind === 'die' && !h.dead && Math.hypot(h.x - this.bx, h.y - this.by) < 170) this.knockDie(h, 2);
      for (const h of this.hazards) if (Math.hypot(h.x - this.bx, h.y - this.by) < 170 && h.kind !== 'die' && h.kind !== 'reef' && h.kind !== 'gust' && h.kind !== 'breaker' && h.kind !== 'arc' && h.kind !== 'slick' && h.kind !== 'ring' && h.kind !== 'burn') this.damageHazard(h, 4);
      if (this.beast && Math.hypot(this.beast.x - this.bx, this.beast.y - this.by) < 230) this.hitBeast(6);
    }
    this.bowWaveT += dt;
    this.helmT += dt;
    if (this.helmPending && this.helmT >= HELM_WHIRL) this.helmLand();
    if (Save.S().boat.uber && this.turretCd <= 0) this.uberTick();

    // Shots.
    for (const sh of this.shots) {
      sh.x += sh.vx * dt; sh.y += sh.vy * dt; sh.life -= dt;
      if (sh.foe) {
        if (Math.hypot(sh.x - this.bx, sh.y - this.by) < 20) { sh.life = 0; this.damageBoat(1); }
        continue;
      }
      for (const h of this.hazards) {
        if (h.dead || h.kind === 'whirl' || h.kind === 'reef' || h.kind === 'gust' || h.kind === 'boulder' || h.kind === 'breaker' || h.kind === 'arc' || h.kind === 'slick' || h.kind === 'ring' || h.kind === 'burn') continue;
        if (h.kind === 'die') {
          const at = this.dieAt(h);
          if (Math.hypot(sh.x - at.x, sh.y - at.y) < h.r + 6) { this.knockDie(h, 1); sh.life = 0; break; }
          continue;
        }
        if (Math.hypot(sh.x - h.x, sh.y - h.y) < h.r + 6) { this.damageHazard(h, sh.dmg); sh.life = 0; break; }
      }
      if (this.beast && sh.life > 0 && this.beast.phase === 'fight' && Math.hypot(sh.x - this.beast.x, sh.y - this.beast.y) < 56) { this.hitBeast(sh.dmg); sh.life = 0; }
    }
    this.shots = this.shots.filter((s) => s.life > 0 && s.y > -40 && s.y < 700 && s.x > -40 && s.x < 1000);

    // Collisions + hazard behaviour.
    this.invuln -= dt;
    for (const h of this.hazards) {
      if (h.dead) continue;
      const d = Math.hypot(h.x - this.bx, h.y - this.by);
      // Held by the Foghorn: only the solid things still bar the way; everything that moves or counts waits.
      const held = (h.held ?? 0) > 0;
      if (held && h.kind !== 'rock' && h.kind !== 'reef' && h.kind !== 'drift' && h.kind !== 'bramble' && h.kind !== 'mine') continue;
      if (h.kind === 'ring') { this.ringTouch(h, d); continue; }
      if (h.kind === 'burn') { this.burnTouch(h, d); continue; }
      if (h.kind === 'whirl') {
        if (d < h.r * 2.6) { const pull = (1 - d / (h.r * 2.6)) * 220; this.bvx += Math.sign(h.x - this.bx) * pull * dt * 2; }
        if (d < h.r * 0.5) this.damageBoat(1);
        continue;
      }
      if (h.kind === 'spout') { if (d < h.r + 14) this.bvx += Math.sign(this.bx - h.x || 1) * 900 * dt; continue; }
      if (h.kind === 'tentacle') {
        if (h.t > 1.1 && h.t < 1.6 && d < h.r + 16) this.damageBoat(2);
        if (h.t > 2.2) h.dead = true;
        continue;
      }
      if (h.kind === 'bramble') {
        if (d < h.r + 14) { this.bvx *= 0.2; this.damageBoat(1); }
        continue;
      }
      if (h.kind === 'gust') {
        if (Math.abs(h.y - this.by) < h.r) this.bvx += h.seed * 1100 * dt;
        if (h.t > 6) h.dead = true;
        continue;
      }
      if (h.kind === 'arc') {
        // Live for 1.1 s, guttering for 0.7 s: cross while it is dark.
        const live = (h.t + h.seed) % 1.8 < 1.1;
        h.armed = live ? 1 : 0;
        if (live && Math.abs(h.y - this.by) < 14 && Math.abs(this.bx - h.x) < h.r) { this.damageBoat(1); Sfx.play('zap'); }
        continue;
      }
      if (h.kind === 'slick') {
        if (h.t < SLICK_FLIGHT) continue;
        if (!h.armed) {
          // Splash down: a burst of venom, and the sheen starts to spread.
          h.armed = 1; this.explode(h.x, h.y, h.r * 0.7); Sfx.play('splash');
        }
        if (h.t > SLICK_FLIGHT + SLICK_LIFE) { h.dead = true; continue; }
        const thin = this.slickStrength(h), rr = this.slickRadius(h);
        const ex = (this.bx - h.x) / rr, ey = (this.by - h.y) / (rr * 0.55);
        if (ex * ex + ey * ey < 1 && thin > 0.15) {
          // In the venom: the boat wallows (sideways way bleeds off, forward speed drops), and the
          // first touch of a fresh slick eats into the hull.
          this.slickDrag = 0.25;
          this.bvx *= Math.pow(0.2, dt);
          if (h.armed === 1 && thin > 0.35) { h.armed = 2; this.damageBoat(1); this.float(this.bx, this.by - 36, 'the hull corrodes', '#9af05a'); Sfx.play('status-poison'); }
        }
        continue;
      }
      if (h.kind === 'die') {
        if (h.t < DIE_ROLL) continue;
        if (h.tick === undefined) {
          // Down it comes: it lands showing its pips and starts to count.
          h.tick = DIE_TICK; h.armed ??= h.maxHp; this.explode(h.x, h.y, h.r + 6); Sfx.play('dice');
        }
        h.tick -= dt;
        if (h.tick <= 0) { h.tick += DIE_TICK; h.armed = (h.armed ?? 1) - 1; }
        if ((h.armed ?? 0) <= 0) { this.burstDie(h); continue; }
        // Bumping a landed die shoves the boat off it; it is too heavy to ram.
        if (d < h.r + 16) this.bvx = Math.sign(this.bx - h.x || 1) * 240;
        continue;
      }
      if (h.kind === 'breaker') {
        // It rolls in faster than the sea; caught outside the trough, it breaks over the boat.
        h.y += (90 + this.band() * 25) * dt;
        if (!h.armed && Math.abs(h.y - this.by) < h.r + 12) {
          h.armed = 1;
          if (Math.abs(this.bx - h.seed) > BREAKER_GAP) {
            this.damageBoat(1);
            this.bvx += Math.sign(this.bx - h.seed || 1) * 520;
            this.float(this.bx, this.by - 36, 'swamped!', '#d4eeff'); Sfx.play('splash');
          } else this.float(this.bx, this.by - 36, 'through the trough', '#9dd8ff');
        }
        continue;
      }
      if (h.kind === 'boulder') {
        if (h.t < 1.2) continue;
        // Down it comes: a smash where it lands, then it sits in the sea as an ordinary rock.
        this.explode(h.x, h.y, h.r + 24); this.cameras.main.shake(120, 0.005); Sfx.play('stone-slam');
        if (d < h.r + 22) this.damageBoat(2);
        h.kind = 'rock'; h.hp = h.maxHp = 3;
        continue;
      }
      if (h.kind === 'mine' && d < 90 && h.armed === undefined && !held) h.armed = 0.6;
      if (h.kind === 'mine' && h.armed !== undefined && !held) {
        h.armed -= dt;
        if (h.armed <= 0) { this.explode(h.x, h.y, 80); h.dead = true; if (d < 80) this.damageBoat(2); continue; }
      }
      if (d < h.r + 16 && h.kind !== 'reef' && Save.S().boat.uber === 'uber-cragplate') {
        // The Cragplate Ram: the stone prow smashes rocks, drift and mines aside unharmed.
        h.dead = true; this.explode(h.x, h.y, 34); Sfx.play('rock-throw');
        if (h.kind === 'rock' && this.rng() < 0.3) this.loot.push({ kind: 'crate', x: h.x, y: h.y, t: 0, taken: false });
        continue;
      }
      if (d < h.r + 16) {
        this.damageBoat(h.kind === 'drift' ? 1 : h.kind === 'reef' ? 2 : 1);
        if (h.kind !== 'reef') { h.dead = true; this.explode(h.x, h.y, 30); }
        else this.bvx = Math.sign(this.bx - h.x || 1) * 260;
      }
    }

    // Loot.
    const reach = 26 + this.up('net') * 26;
    for (const l of this.loot) {
      const d = Math.hypot(l.x - this.bx, l.y - this.by);
      if (d < reach * 2.2 && this.up('net') > 0) { l.x += (this.bx - l.x) * dt * 2; l.y += (this.by - l.y) * dt * 2; }
      if (d < reach) {
        l.taken = true;
        const deep = 1 + this.band() * 0.6;
        if (l.kind === 'crate') { const c = Math.round((8 + this.rng() * 10) * deep * this.boat.hold); this.haul += c; this.float(l.x, l.y, `+${c} 🪙`, '#ffd27a'); Sfx.play('money'); }
        if (l.kind === 'barrel') { this.hull = Math.min(this.maxHull, this.hull + 1); this.float(l.x, l.y, '+1 hull', '#9dffb0'); Sfx.play('heal'); }
        if (l.kind === 'orb') { this.orbs += 1; this.float(l.x, l.y, '+1 🔮', '#d0a8ff'); Sfx.play('sparkle'); }
        if (l.kind === 'bottle') { const c = Math.round(30 * deep); this.haul += c; this.float(l.x, l.y, `Message in a bottle: +${c} 🪙`, '#ffe8c0'); Sfx.play('jackpot'); }
      }
    }

    // Pump.
    if (this.up('pump') > 0 && this.hull < this.maxHull) {
      this.pumpT = (this.pumpT ?? 0) + dt;
      if (this.pumpT > 16 - this.up('pump') * 5) { this.pumpT = 0; this.hull += 1; this.float(this.bx, this.by - 30, 'pumped +1', '#9dffb0'); }
    }

    this.updateBeast(dt);

    this.wake.unshift({ x: this.bx, y: this.by + 24 });
    if (this.wake.length > 28) this.wake.pop();
    for (const w of this.wake) w.y += scroll;

    if (this.crossing && this.toLand() <= 0) { this.landfall(); return; }
    if (Phaser.Input.Keyboard.JustDown(k.H) || Phaser.Input.Keyboard.JustDown(k.ESC)) this.finish(false);
    this.draw(time / 1000);
  }

  private pumpT = 0;

  /**
   * The Outer Sea: a swell that heaves the boat side to side (stronger the deeper the band),
   * breakers rolling in with one trough to thread, and the storm overhead flashing.
   */
  private roughWater(dt: number, scroll: number, bi: number): void {
    this.swellT += dt;
    const heave = Math.sin(this.swellT * 0.62) * 0.7 + Math.sin(this.swellT * 1.37 + 1.1) * 0.3;
    this.bvx += heave * (150 + bi * 60) * dt;
    this.nextBreaker -= scroll;
    if (this.nextBreaker <= 0 && this.toLand() > COAST_M && !(this.beast && this.beast.phase !== 'sink')) {
      const gap = 110 + this.rng() * 740;
      this.hazards.push({ kind: 'breaker', x: 480, y: -70, r: 20, hp: 999, maxHp: 999, t: 0, seed: gap, dead: false });
      this.nextBreaker = (1250 - bi * 220) * (0.75 + this.rng() * 0.5);
    }
    this.flashT += dt;
    this.nextFlash -= dt;
    if (this.nextFlash <= 0) {
      this.nextFlash = 5 + this.rng() * 7;
      this.flashT = 0; this.flashX = 80 + this.rng() * 800;
      this.cameras.main.flash(140, 200, 220, 255);
      Sfx.play('thunder');
    }
  }

  private spawnRow(bi: number): void {
    const r = this.rng;
    const n = 1 + Math.floor(r() * (2 + bi));
    for (let i = 0; i < n; i++) {
      const roll = r();
      let kind: HazardKind = 'rock';
      if (roll < 0.1 + bi * 0.03) kind = 'mine';
      else if (roll < 0.18 + bi * 0.05) kind = 'whirl';
      else if (roll < 0.3) kind = 'drift';
      else if (roll < 0.38 + bi * 0.03) kind = 'reef';
      else if (bi >= 2 && roll < 0.5) kind = 'tentacle';
      else if (bi >= 1 && roll < 0.55) kind = 'spout';
      const x = 50 + r() * 860;
      const rr = kind === 'reef' ? 46 + r() * 30 : kind === 'whirl' ? 30 : kind === 'drift' ? 14 : kind === 'mine' ? 13 : kind === 'tentacle' ? 22 : kind === 'spout' ? 18 : 18 + r() * 18;
      const hp = kind === 'rock' ? Math.ceil(rr / 12) + bi : kind === 'drift' ? 1 : kind === 'mine' ? 1 : 999;
      const y = kind === 'tentacle' ? 120 + r() * 300 : -60 - r() * 120;
      this.hazards.push({ kind, x: kind === 'tentacle' ? Phaser.Math.Clamp(this.bx + (r() - 0.5) * 300, 60, 900) : x, y, r: rr, hp, maxHp: hp, t: 0, seed: r() * 1000, dead: false });
    }
  }

  private damageHazard(h: Hazard, d: number): void {
    h.hp -= d;
    if (h.hp <= 0 && !h.dead) {
      h.dead = true;
      if (h.kind === 'mine') { this.explode(h.x, h.y, 80); if (Math.hypot(h.x - this.bx, h.y - this.by) < 80) this.damageBoat(2); }
      else { this.explode(h.x, h.y, h.r + 10); Sfx.play('stone-slam'); if (h.kind === 'rock' && this.rng() < 0.3) this.loot.push({ kind: 'crate', x: h.x, y: h.y, t: 0, taken: false }); }
    } else Sfx.play('hit-light');
  }

  private damageBoat(n: number): void {
    if (this.invuln > 0 || this.over) return;
    if (this.helmWard && Save.S().boat.uber === 'uber-fortunehelm') {
      this.helmWard = false; this.invuln = 0.9;
      this.float(this.bx, this.by - 34, 'the ward holds', '#ffe08a'); Sfx.play('shield-block');
      return;
    }
    if (this.plateReady && Save.S().boat.uber === 'uber-cragplate') {
      this.plateReady = false; this.invuln = 0.9; this.turretCd = 8;
      this.float(this.bx, this.by - 34, 'the cragplate holds', '#e0c8a0'); Sfx.play('shield-block');
      return;
    }
    this.hull -= n;
    this.invuln = 0.9;
    this.cameras.main.shake(180, 0.008);
    this.cameras.main.flash(120, 255, 60, 40);
    Sfx.play('hit-heavy');
    if (this.hull <= 0) { this.sink(); return; }
    if (Save.S().boat.uber === 'uber-greenwood') this.thornBurst();
  }

  private explode(x: number, y: number, r: number): void {
    const c = this.add.circle(x, y, r, 0xffe8c0, 0.45).setScale(0.3);
    this.tweens.add({ targets: c, scale: 1, alpha: 0, duration: 300, onComplete: () => c.destroy() });
  }

  private float(x: number, y: number, s: string, color: string): void {
    const t = this.add.text(x, y, s, { fontFamily: FONT_DISPLAY, fontSize: '14px', color, stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setDepth(12);
    this.tweens.add({ targets: t, y: y - 40, alpha: 0, duration: 1100, onComplete: () => t.destroy() });
  }

  private uberTick(): void {
    const uber = Save.S().boat.uber;
    if (uber === 'uber-brazier') this.uberTurret();
    else if (uber === 'uber-figurehead') this.uberBowWave();
    else if (uber === 'uber-greenwood') this.uberRegrow();
    else if (uber === 'uber-windcatcher') this.uberSail();
    else if (uber === 'uber-cragplate') this.uberPlate();
    else if (uber === 'uber-stormmast') this.uberMast();
    else if (uber === 'uber-hydraprow') this.uberProw();
    else if (uber === 'uber-fortunehelm') this.uberHelm();
    else if (uber === 'uber-foghorn') this.uberHorn();
    else if (uber === 'uber-burningglass') this.uberGlass();
    else this.turretCd = 99;
  }

  /** Where the Stormglass Mast's last bolt forked to (drawn while `mastT` < 0.3). */
  private mastBolts: Pt[] = [];
  private mastT = 9;

  /**
   * The Stormglass Mast takes the storm every six seconds and forks a bolt to the three nearest
   * hazards ahead: rocks, drift, mines and bramble mats are smashed, and a beast close by is scorched.
   */
  private uberMast(): void {
    const ahead = this.hazards
      .filter((h) => !h.dead && h.y < this.by && h.y > -20 && (h.kind === 'rock' || h.kind === 'drift' || h.kind === 'mine' || h.kind === 'bramble'))
      .sort((a, b) => Math.hypot(a.x - this.bx, a.y - this.by) - Math.hypot(b.x - this.bx, b.y - this.by))
      .slice(0, 3);
    this.mastBolts = ahead.map((h) => ({ x: h.x, y: h.y }));
    for (const h of ahead) { h.dead = true; this.explode(h.x, h.y, 30); }
    if (this.beast?.phase === 'fight' && Math.hypot(this.beast.x - this.bx, this.beast.y - this.by) < 420) {
      this.hitBeast(3); this.mastBolts.push({ x: this.beast.x, y: this.beast.y });
    }
    if (!this.mastBolts.length) { this.turretCd = 0.5; return; }
    this.turretCd = 6;
    this.mastT = 0;
    Sfx.play('thunder');
  }

  /** Seconds the boat is still wallowing in a venom slick (forward speed cut while > 0). */
  private slickDrag = 0;

  /** How much venom is left in a slick, 1 fresh to 0 gone: it thins out over its life. */
  private slickStrength(h: Hazard): number {
    return Phaser.Math.Clamp(1 - (h.t - SLICK_FLIGHT) / SLICK_LIFE, 0, 1);
  }

  /** A slick's spread: it runs out fast on landing, then thins (and shrinks a little) as it fades. */
  private slickRadius(h: Hazard): number {
    const age = h.t - SLICK_FLIGHT;
    return h.r * Math.min(1, 0.3 + age / 0.6) * (0.75 + 0.25 * this.slickStrength(h));
  }

  /** The Hydra Prow's three heads (left, centre, right): scene-seconds each grows back at. */
  private prowReady = [0, 0, 0];
  /** Each head's last bite — where it struck and when (drawn as a lunge). */
  private prowBite: { x: number; y: number; at: number }[] = [{ x: 0, y: 0, at: -9 }, { x: 0, y: 0, at: -9 }, { x: 0, y: 0, at: -9 }];

  /** Where the prow's head `i` (0 left, 1 centre, 2 right) sits on the bow, in boat-local units. */
  private prowMount(i: number): Pt {
    const L = this.boat.len;
    return i === 1 ? { x: 0, y: -L / 2 - 10 } : { x: (i - 1) * L * 0.26, y: -L * 0.36 };
  }

  /**
   * The Hydra Prow: each of the three carved heads bites the first hazard to come into reach on its
   * own side — left, centre or right — and smashes it (rocks, drift, mines, bramble mats, tentacles),
   * then needs eight seconds to grow back.
   */
  private uberProw(): void {
    this.turretCd = 0.05;
    const now = this.time.now / 1000;
    for (let i = 0; i < 3; i++) {
      if (now < this.prowReady[i]) continue;
      const m = this.prowMount(i), hx = this.bx + m.x, hy = this.by + m.y;
      let best: Hazard | null = null, bd = PROW_REACH;
      for (const h of this.hazards) {
        if (h.dead || !(h.kind === 'rock' || h.kind === 'drift' || h.kind === 'mine' || h.kind === 'bramble' || h.kind === 'tentacle')) continue;
        const dx = h.x - this.bx;
        const side = dx < -34 ? 0 : dx > 34 ? 2 : 1;
        if (side !== i || h.y > this.by + 10) continue;
        const d = Math.hypot(h.x - hx, h.y - hy) - h.r;
        if (d < bd) { bd = d; best = h; }
      }
      if (!best) continue;
      best.dead = true;
      this.explode(best.x, best.y, best.r + 14);
      if (best.kind === 'rock' && this.rng() < 0.3) this.loot.push({ kind: 'crate', x: best.x, y: best.y, t: 0, taken: false });
      this.prowBite[i] = { x: best.x, y: best.y, at: now };
      this.prowReady[i] = now + PROW_REGROW;
      Sfx.play(best.kind === 'mine' ? 'explosion-large' : 'rock-throw');
    }
  }

  /** Where a die is right now: sliding in from `seed` while it tumbles, at rest at `x` once it lands. */
  private dieAt(h: Hazard): Pt {
    if (h.t >= DIE_ROLL) return { x: h.x, y: h.y };
    const k = Phaser.Math.Clamp(h.t / DIE_ROLL, 0, 1), e = 1 - (1 - k) * (1 - k);
    return { x: Phaser.Math.Linear(h.seed, h.x, e), y: h.y - Math.abs(Math.sin(k * Math.PI * 3)) * (1 - k) * 22 };
  }

  /**
   * Knock `n` pips off a die. A die still tumbling is knocked flat where it is (and lands there);
   * one knocked to zero bursts on the spot.
   */
  private knockDie(h: Hazard, n: number): void {
    if (h.dead) return;
    if (h.t < DIE_ROLL) { h.x = this.dieAt(h).x; h.t = DIE_ROLL; }
    h.tick = DIE_TICK;
    h.armed = (h.armed ?? h.maxHp) - n;
    if (h.armed <= 0) this.burstDie(h);
    else Sfx.play('hit-light');
  }

  /** A die comes up empty: it bursts in a ring of spray, and a boat inside the ring is struck. */
  private burstDie(h: Hazard): void {
    h.dead = true;
    this.explode(h.x, h.y, h.r + 14);
    const ring = this.add.circle(h.x, h.y, DIE_RING, 0xd8f0ff, 0.14).setStrokeStyle(5, 0xffffff, 0.85).setScale(0.25);
    this.tweens.add({ targets: ring, scale: 1, alpha: 0, duration: 360, onComplete: () => ring.destroy() });
    Sfx.play('splash');
    if (Math.hypot(this.bx - h.x, this.by - h.y) < DIE_RING) { this.damageBoat(1); this.float(this.bx, this.by - 36, 'snake eyes!', '#ffd27a'); }
  }

  /** The Fortune Helm's last boon (null before its first spin) and the wedge angle it landed on. */
  private helmBoon: HelmBoon | null = null;
  private helmAngle = 0;
  /** Seconds since the helm last began to spin: it whirls for `HELM_WHIRL`, then lands and the boon's badge shows a moment. */
  private helmT = 9;
  /** The helm is whirling and has not landed yet. */
  private helmPending = false;
  /** The helm landed on *ward*: the next blow to the hull is shrugged off. */
  private helmWard = false;

  /**
   * The Fortune Helm: the boat's wheel is a little roulette wheel that spins itself every seven
   * seconds and lands on a boon — `gust` a burst of speed, `ward` shrug off the next blow (kept until
   * it is used, so a held ward re-spins between the other two), `broadside` a heavy shot at the
   * nearest hazard ahead (or the beast, if nothing is in the way). The wheel whirls for a second
   * first; `helmLand` pays the boon out when it stops.
   */
  private uberHelm(): void {
    this.turretCd = HELM_EVERY;
    const pool = HELM_BOONS.filter((b) => !(b === 'ward' && this.helmWard));
    this.helmBoon = pool[Math.floor(this.rng() * pool.length)];
    this.helmAngle = -Math.PI / 2 - (HELM_BOONS.indexOf(this.helmBoon) + 0.5) * (Math.PI * 2 / HELM_BOONS.length) + (this.rng() - 0.5) * 0.9;
    this.helmT = 0;
    this.helmPending = true;
    Sfx.play('dice');
  }

  /** The Fortune Helm stops on its boon and pays it out. */
  private helmLand(): void {
    this.helmPending = false;
    const boon = this.helmBoon;
    if (!boon || this.over) return;
    Sfx.play('jackpot');
    if (boon === 'gust') {
      this.sailT = 0;
      this.float(this.bx, this.by - 40, 'GUST!', '#e8f8ff'); Sfx.play('gust');
    } else if (boon === 'ward') {
      this.helmWard = true;
      this.float(this.bx, this.by - 40, 'WARD!', '#ffe08a'); Sfx.play('sparkle');
    } else {
      let best: { x: number; y: number } | null = null, bd = 460;
      for (const h of this.hazards) {
        if (h.dead || h.y > this.by - 20 || h.y < -20 || !(h.kind === 'rock' || h.kind === 'drift' || h.kind === 'mine' || h.kind === 'bramble' || h.kind === 'die')) continue;
        const at = h.kind === 'die' ? this.dieAt(h) : h, d = Math.hypot(at.x - this.bx, at.y - this.by);
        if (d < bd) { bd = d; best = at; }
      }
      if (!best && this.beast?.phase === 'fight') best = this.beast;
      const a = best ? Math.atan2(best.y - this.by, best.x - this.bx) : -Math.PI / 2;
      this.shots.push({ x: this.bx, y: this.by - 20, vx: Math.cos(a) * 560, vy: Math.sin(a) * 560, dmg: 3, life: 1.4, big: true });
      this.float(this.bx, this.by - 40, 'BROADSIDE!', '#ffb07a'); Sfx.play('flame-burst');
    }
  }

  /** Seconds since the Foghorn Bow last sounded (drawn as the spreading blast while < 1.6). */
  private hornT = 9;

  /**
   * The Foghorn Bow sounds a long low blast every eight seconds: drift and mines inside its ring are
   * shoved out of the boat's lane, and every hazard ahead — the Cantor's rings with them — is held
   * still for two seconds (timers stop, nothing rolls, spins, arms or spreads).
   */
  private uberHorn(): void {
    this.turretCd = HORN_EVERY;
    this.hornT = 0;
    let held = 0;
    for (const h of this.hazards) {
      if (h.dead) continue;
      const dx = h.x - this.bx, d = Math.hypot(dx, h.y - this.by);
      if ((h.kind === 'drift' || h.kind === 'mine') && d < HORN_REACH) {
        h.x = Phaser.Math.Clamp(h.x + (Math.sign(dx) || (this.rng() < 0.5 ? -1 : 1)) * (110 - Math.min(80, Math.abs(dx) * 0.4)), 30, 930);
      }
      const ahead = h.kind === 'ring' ? d > h.r : h.y < this.by - 10 && h.y > -80;
      if (ahead) { h.held = HORN_HOLD; held++; }
    }
    if (held) this.float(this.bx, this.by - 44, 'the sea holds its breath', '#e8dcb0');
    Sfx.play('sonic-pulse');
    this.cameras.main.shake(260, 0.003);
  }

  /** Seconds since the Burning Glass Prow last lanced (drawn as the beams while < 0.5), and where its beams struck. */
  private glassT = 9;
  private glassHits: Pt[] = [];

  /**
   * The Burning Glass Prow: the lens on the bow gathers the sun and every seven seconds lances a beam
   * ahead at the two nearest hazards in front of the boat — rocks, drift, mines, bramble mats,
   * tentacles, dice and venom slicks are burned away. With nothing in the way it scorches a beast
   * ahead instead; with nothing at all it waits and tries again shortly.
   */
  private uberGlass(): void {
    const at = (h: Hazard): Pt => (h.kind === 'die' ? this.dieAt(h) : h);
    const burnable = (h: Hazard) => h.kind === 'rock' || h.kind === 'drift' || h.kind === 'mine' || h.kind === 'bramble'
      || h.kind === 'tentacle' || h.kind === 'die' || (h.kind === 'slick' && h.t >= SLICK_FLIGHT);
    const ahead = this.hazards
      .filter((h) => {
        if (h.dead || !burnable(h)) return false;
        const p = at(h), dy = this.by - p.y;
        return dy > 10 && dy < GLASS_REACH && p.y > -30 && Math.abs(p.x - this.bx) < 70 + dy * 0.6;
      })
      .sort((a, b) => Math.hypot(at(a).x - this.bx, at(a).y - this.by) - Math.hypot(at(b).x - this.bx, at(b).y - this.by))
      .slice(0, 2);
    this.glassHits = ahead.map((h) => ({ ...at(h) }));
    for (const h of ahead) {
      const p = at(h);
      h.dead = true; this.explode(p.x, p.y, h.r + 12);
      if (h.kind === 'rock' && this.rng() < 0.3) this.loot.push({ kind: 'crate', x: h.x, y: h.y, t: 0, taken: false });
    }
    if (!ahead.length && this.beast?.phase === 'fight' && this.beast.y < this.by && this.by - this.beast.y < GLASS_REACH + 60 && Math.abs(this.beast.x - this.bx) < 260) {
      this.hitBeast(3); this.glassHits.push({ x: this.beast.x, y: this.beast.y });
    }
    if (!this.glassHits.length) { this.turretCd = 0.5; return; }
    this.turretCd = GLASS_EVERY;
    this.glassT = 0;
    Sfx.play('light-beam');
  }

  /** A Lensback burning spot: the glint swells, then the beam lands and the scorch burns; inside it while it burns costs a plank, once. */
  private burnTouch(h: Hazard, d: number): void {
    if (h.t > BURN_WARN + BURN_BEAM + BURN_LINGER) { h.dead = true; return; }
    if (h.t < BURN_WARN) return;
    if (h.tick === undefined) { h.tick = 1; this.explode(h.x, h.y, h.r * 0.8); Sfx.play('light-beam'); }
    if (h.armed || d > h.r + 8) return;
    h.armed = 1;
    this.damageBoat(1);
    this.float(this.bx, this.by - 36, 'scorched by the glass!', '#fff4c8'); Sfx.play('status-burn');
  }

  /** A Cantor ring meeting the boat: through a rest it passes; anywhere else it costs a plank and shoves the boat outward. */
  private ringTouch(h: Hazard, d: number): void {
    if (h.t < 0) return;
    h.r = 30 + h.t * RING_SPEED;
    if (h.r > RING_MAX) { h.dead = true; return; }
    if (h.armed || Math.abs(d - h.r) > 14) return;
    h.armed = 1;
    const a = Math.atan2(this.by - h.y, this.bx - h.x);
    const inRest = (h.gaps ?? []).some((gp) => Math.abs(Phaser.Math.Angle.Wrap(a - gp)) < RING_REST);
    if (inRest) { this.float(this.bx, this.by - 36, 'through the rest', '#f0dca0'); return; }
    this.damageBoat(1);
    this.bvx += Math.cos(a) * 640;
    this.by = Math.min(590, this.by + Math.max(0, Math.sin(a)) * 34);
    this.float(this.bx, this.by - 36, 'a plank sings loose!', '#f0dca0'); Sfx.play('sonic-pulse');
  }

  /** The Cragplate has hardened: the next hit on the hull is shrugged off. */
  private plateReady = false;

  /** The Cragplate Ram hardens again eight seconds after it last took a blow. */
  private uberPlate(): void {
    this.turretCd = 8;
    if (this.plateReady) return;
    this.plateReady = true;
    this.float(this.bx, this.by - 30, 'the cragplate hardens', '#e0c8a0');
    Sfx.play('stone-rise');
  }

  /** Seconds since the Windcatcher Sail last filled (speed burst while < 1.1; drawn as a billow). */
  private sailT = 9;

  /**
   * The Windcatcher Sail fills every few seconds: a burst of speed forward, and every foe shot
   * close to the boat is blown back along the way it came — as the boat's own shot.
   */
  private uberSail(): void {
    this.sailT = 0;
    this.turretCd = 4.2;
    let turned = 0;
    for (const sh of this.shots) {
      if (!sh.foe || Math.hypot(sh.x - this.bx, sh.y - this.by) > 240) continue;
      sh.vx = -sh.vx * 1.4; sh.vy = -sh.vy * 1.4; sh.foe = false; sh.dmg = 2; sh.life = 2; turned++;
    }
    if (turned) this.float(this.bx, this.by - 40, `blown back ×${turned}`, '#e8f8ff');
    Sfx.play('gust');
  }

  /** The Greenwood Keel regrows: one hull back every ten seconds while it is damaged. */
  private uberRegrow(): void {
    this.turretCd = 10;
    if (this.hull >= this.maxHull) return;
    this.hull += 1;
    this.float(this.bx, this.by - 30, 'the keel regrows +1', '#9dffb0');
    Sfx.play('heal');
  }

  /**
   * The Greenwood Keel's other half: whenever the hull is struck, thorns burst out of the living
   * wood — every rock, drift, mine and bramble mat close by is torn, and a near beast is raked.
   */
  private thornBurst(): void {
    const R = 150;
    for (const h of this.hazards) {
      if (h.dead || h.kind === 'whirl' || h.kind === 'reef' || h.kind === 'tentacle' || h.kind === 'spout' || h.kind === 'gust' || h.kind === 'boulder' || h.kind === 'breaker' || h.kind === 'arc' || h.kind === 'slick' || h.kind === 'ring' || h.kind === 'burn') continue;
      if (Math.hypot(h.x - this.bx, h.y - this.by) < R + h.r) { if (h.kind === 'die') this.knockDie(h, 1); else this.damageHazard(h, 3); }
    }
    if (this.beast?.phase === 'fight' && Math.hypot(this.beast.x - this.bx, this.beast.y - this.by) < 260) this.hitBeast(4);
    this.thornT = 0;
    Sfx.play('thorn');
  }

  private thornT = 9;

  /**
   * The Undertow Figurehead: every few seconds the carved queen on the bow throws a wave ahead.
   * Rocks, drift and mines in the cone take a beating and are shoved out of the lane, whirlpools
   * in it are broken up, and floating loot ahead is drawn in toward the hull.
   */
  private uberBowWave(): void {
    const reach = 330;
    let any = false;
    for (const h of this.hazards) {
      if (h.dead) continue;
      const dx = h.x - this.bx, dy = h.y - this.by;
      if (dy > -20 || dy < -reach || Math.abs(dx) > 70 + (-dy) * 0.45) continue;
      any = true;
      if (h.kind === 'whirl') { h.dead = true; this.explode(h.x, h.y, h.r * 1.6); continue; }
      if (h.kind === 'reef' || h.kind === 'tentacle' || h.kind === 'spout' || h.kind === 'gust' || h.kind === 'boulder' || h.kind === 'breaker' || h.kind === 'arc' || h.kind === 'slick' || h.kind === 'ring' || h.kind === 'burn') continue;
      if (h.kind === 'die') { if (h.t >= DIE_ROLL) h.x = Phaser.Math.Clamp(h.x + (Math.sign(dx) || 1) * 70, 30, 930); this.knockDie(h, 1); continue; }
      h.x = Phaser.Math.Clamp(h.x + (Math.sign(dx) || 1) * 70, 30, 930);
      this.damageHazard(h, 2);
    }
    for (const l of this.loot) {
      const dx = l.x - this.bx, dy = l.y - this.by;
      if (dy < 0 && dy > -reach - 80 && Math.abs(dx) < 260) { l.x += (this.bx - l.x) * 0.55; l.y += (this.by - l.y) * 0.45; }
    }
    if (this.beast?.phase === 'fight' && this.beast.y < this.by && Math.abs(this.beast.x - this.bx) < 200) { this.hitBeast(3); any = true; }
    this.bowWaveT = 0;
    this.turretCd = any ? 3.2 : 1.2;
    if (any) Sfx.play('water-jet');
  }

  private uberTurret(): void {
    let best: { x: number; y: number } | null = null, bd = 380;
    for (const h of this.hazards) {
      if (h.dead || h.kind === 'whirl' || h.kind === 'reef' || h.kind === 'spout' || h.kind === 'tentacle' || h.kind === 'gust' || h.kind === 'boulder' || h.kind === 'breaker' || h.kind === 'arc' || h.kind === 'slick' || h.kind === 'ring' || h.kind === 'burn' || h.y > this.by) continue;
      const d = Math.hypot(h.x - this.bx, h.y - this.by);
      if (d < bd) { bd = d; best = h; }
    }
    if (this.beast?.phase === 'fight') best = this.beast;
    if (!best) { this.turretCd = 0.3; return; }
    const a = Math.atan2(best.y - this.by, best.x - this.bx);
    this.shots.push({ x: this.bx, y: this.by - 10, vx: Math.cos(a) * 420, vy: Math.sin(a) * 420, dmg: 2, life: 1.4, big: true });
    this.turretCd = 1.1;
    Sfx.play('flame-burst');
  }

  // ── Sea beast ────────────────────────────────────────────────────────

  private summonBeast(): void {
    // Each isle's beast guards that isle's Uber-upgrade, and only hunts sailors who have landed
    // there. Brandmark — where every voyage begins — always counts.
    const s = Save.S();
    const known = allUbers().filter((u) => BEASTS[u.beast] && (u.isle === 'fire' || s.waystones.includes(getIsle(u.isle)?.port ?? '')));
    const uber = known[Math.floor(this.rng() * known.length)] ?? allUbers()[0];
    const kind = uber && BEASTS[uber.beast] ? uber.beast : 'magmaw';
    const hp = 70 + this.band() * 25 + (kind === 'magmaw' ? 0 : 30);
    this.beast = {
      name: BEASTS[kind].name, x: 480, y: -120, hp, maxHp: hp, t: 0, nextAttack: 2.5, phase: 'rise', attack: null, attackT: 0,
      dropsUber: uber?.id ?? 'uber-brazier', kind,
    };
    this.bandText.setText(`⚠ SEA BEAST — ${BEASTS[kind].name}`).setAlpha(1);
    this.tweens.add({ targets: this.bandText, alpha: 0, delay: 2200, duration: 700 });
    Sfx.play('roar');
    this.cameras.main.shake(500, 0.006);
  }

  private hitBeast(d: number): void {
    const b = this.beast;
    if (!b || b.phase !== 'fight') return;
    b.hp -= d;
    Sfx.play('hit-medium');
    if (b.hp <= 0) {
      b.phase = 'sink';
      b.t = 0;
      Sfx.play('victory');
      this.cameras.main.flash(400, 255, 200, 120);
      const s = Save.S();
      const reward = 120 + this.band() * 60;
      this.haul += reward;
      this.orbs += 3;
      if (!s.boat.ubers.includes(b.dropsUber)) {
        s.boat.ubers.push(b.dropsUber);
        Save.persist();
        const u = getUber(b.dropsUber);
        this.float(480, 260, `UBER-UPGRADE: ${u?.name ?? b.dropsUber}! Fit it at the docks.`, '#ff9d5c');
      }
      this.float(480, 300, `+${reward} 🪙  +3 🔮`, '#ffd27a');
    }
  }

  private updateBeast(dt: number): void {
    const b = this.beast;
    if (!b) return;
    if (b.phase === 'rise') {
      b.y = Phaser.Math.Linear(b.y, 150, 0.03);
      if (b.y > 140) { b.phase = 'fight'; b.t = 0; }
      return;
    }
    if (b.phase === 'sink') {
      b.y += 60 * dt;
      if (b.t > 3) this.beast = null;
      return;
    }
    b.x = 480 + Math.sin(b.t * 0.7) * 300;
    b.y = 150 + Math.sin(b.t * 1.3) * 30;
    b.nextAttack -= dt;
    if (b.attack) {
      b.attackT += dt;
      if (b.attack === 'spit' && b.attackT > 0.6 && b.attackT - dt <= 0.6) {
        for (let i = -2; i <= 2; i++) {
          const a = Math.atan2(this.by - b.y, this.bx - b.x) + i * 0.22;
          this.shots.push({ x: b.x, y: b.y + 30, vx: Math.cos(a) * 240, vy: Math.sin(a) * 240, dmg: 1, life: 3, foe: true });
        }
        Sfx.play(b.kind === 'wyrm' ? 'water-jet' : b.kind === 'brambleback' ? 'thorn' : b.kind === 'skyray' ? 'whoosh' : b.kind === 'cragjaw' ? 'rock-throw' : b.kind === 'galvaneel' ? 'zap' : b.kind === 'hydra' ? 'status-poison' : b.kind === 'wheelback' ? 'dice' : b.kind === 'cantor' ? 'sonic-pulse' : b.kind === 'lensback' ? 'light-beam' : 'fireball');
      }
      if (b.attack === 'slam' && b.attackT > 1.0 && b.attackT - dt <= 1.0) {
        for (let i = 0; i < 3; i++) this.hazards.push({ kind: 'tentacle', x: Phaser.Math.Clamp(this.bx + (i - 1) * 110, 60, 900), y: this.by - 20, r: 26, hp: 999, maxHp: 999, t: 0, seed: i, dead: false });
      }
      if (b.attack === 'wave' && b.attackT > 0.8 && b.attackT - dt <= 0.8 && BEASTS[b.kind]?.spawn === 'rockfall') {
        // The Cragjaw heaves its back: boulders shrug off the basalt pillars and arc down at the
        // boat — one aimed where it is, two either side; read the shadows and slip between.
        for (const off of [0, -150, 150]) {
          const x = Phaser.Math.Clamp(this.bx + off + (this.rng() - 0.5) * 40, 50, 910);
          this.hazards.push({ kind: 'boulder', x, y: this.by - 150 - this.rng() * 60, r: 26, hp: 999, maxHp: 999, t: 0, seed: off, dead: false });
        }
        Sfx.play('quake');
      } else if (b.attack === 'wave' && b.attackT > 0.8 && b.attackT - dt <= 0.8 && BEASTS[b.kind]?.spawn === 'arcs') {
        // The Galvaneel lights its cells and strings three arcs across the water, staggered so their
        // dark beats differ: read each one and cross it while it gutters.
        for (let i = 0; i < 3; i++) {
          const span = 220 + this.rng() * 160, cx = Phaser.Math.Clamp(this.bx + (this.rng() - 0.5) * 360, span / 2, 960 - span / 2);
          this.hazards.push({ kind: 'arc', x: cx, y: -40 - i * 150, r: span / 2, hp: 999, maxHp: 999, t: 0, seed: i * 0.6, dead: false, armed: 1 });
        }
        Sfx.play('electric-charge');
      } else if (b.attack === 'wave' && b.attackT > 0.8 && b.attackT - dt <= 0.8 && BEASTS[b.kind]?.spawn === 'slicks') {
        // The Hydra's heads spit globs of venom in a ragged volley — one at the boat, the rest either
        // side and further up the sea — that land as slicks; the gaps between them are the way through.
        const offs = [0, -170, 170, (this.rng() < 0.5 ? -1 : 1) * 320];
        offs.forEach((off, i) => {
          const x = Phaser.Math.Clamp(this.bx + off + (this.rng() - 0.5) * 50, 50, 910);
          this.hazards.push({ kind: 'slick', x, y: this.by - 170 - i * 70 - this.rng() * 40, r: 58 + this.rng() * 18, hp: 999, maxHp: 999, t: -i * 0.18, seed: b.x + (i - 1.5) * 50, dead: false });
        });
        Sfx.play('acid-spray');
      } else if (b.attack === 'wave' && b.attackT > 0.8 && b.attackT - dt <= 0.8 && BEASTS[b.kind]?.spawn === 'dice') {
        // The Wheelback's wheel throws its dice: a line of them tumbling out across the sea, one
        // rolling right into the boat's lane, each set to burst about when the boat reaches it —
        // slip into a gap between the rings, or shoot a die out early.
        for (let k = -3; k <= 3; k++) {
          const x = this.bx + k * 230 + (this.rng() - 0.5) * 30;
          if (x < 50 || x > 910) continue;
          const pips = 2 + Math.floor(this.rng() * 3);
          const y = this.by - this.speed * (DIE_ROLL + pips * DIE_TICK) - 30 - this.rng() * 40;
          const from = Phaser.Math.Clamp(x + (x < b.x ? 1 : -1) * 190, 20, 940);
          this.hazards.push({ kind: 'die', x, y, r: 22, hp: 999, maxHp: pips, t: -Math.abs(k) * 0.08, seed: from, dead: false, armed: pips });
        }
        Sfx.play('dice');
      } else if (b.attack === 'wave' && b.attackT > 0.8 && b.attackT - dt <= 0.8 && BEASTS[b.kind]?.spawn === 'rings') {
        // The Cantor sings a phrase: three sound-rings spreading from its throat one after another, each
        // broken by two rests — one near the boat's line but never on it, so you steer for each in turn.
        const cx = b.x, cy = b.y + 78, aim = Math.atan2(this.by - cy, this.bx - cx);
        for (let i = 0; i < 3; i++) {
          const g1 = aim + (this.rng() < 0.5 ? -1 : 1) * (0.28 + this.rng() * 0.45);
          const g2 = g1 + (this.rng() < 0.5 ? -1 : 1) * (1.0 + this.rng() * 0.7);
          this.hazards.push({ kind: 'ring', x: cx, y: cy, r: 30, hp: 999, maxHp: 999, t: -i * 0.95, seed: i, dead: false, gaps: [g1, g2] });
        }
        Sfx.play('sonic-pulse');
      } else if (b.attack === 'wave' && b.attackT > 0.8 && b.attackT - dt <= 0.8 && BEASTS[b.kind]?.spawn === 'burns') {
        // The Lensback tilts its glass dome to the noon sun and walks burning spots across the boat's
        // line: one right under the boat, then pairs further out on a slant, each glinting before its
        // beam lands — slip into a gap between them before they burn.
        const slant = this.rng() < 0.5 ? -1 : 1;
        [0, -1, 1, -2, 2].forEach((k) => {
          const x = Phaser.Math.Clamp(this.bx + k * 140 + (this.rng() - 0.5) * 24, 40, 920);
          this.hazards.push({ kind: 'burn', x, y: this.by - 8 + k * slant * 12, r: 46, hp: 999, maxHp: 999, t: -Math.abs(k) * 0.45, seed: k, dead: false });
        });
        Sfx.play('light-beam');
      } else if (b.attack === 'wave' && b.attackT > 0.8 && b.attackT - dt <= 0.8 && BEASTS[b.kind]?.spawn === 'gusts') {
        // The Skyray's wake: two gust fronts rolling down the sea, each shoving the other way —
        // ride them out by steering against the push.
        const dir = this.rng() < 0.5 ? -1 : 1;
        this.hazards.push({ kind: 'gust', x: 480, y: -40, r: 34, hp: 999, maxHp: 999, t: 0, seed: dir, dead: false });
        this.hazards.push({ kind: 'gust', x: 480, y: -230, r: 34, hp: 999, maxHp: 999, t: 0, seed: -dir, dead: false });
        Sfx.play('gust');
      } else if (b.attack === 'wave' && b.attackT > 0.8 && b.attackT - dt <= 0.8 && BEASTS[b.kind]?.spawn === 'brambles') {
        // The Brambleback sheds the thicket off its shell: a staggered line of thorn mats with one
        // gap, drifting down at the boat. They can be shot apart, but slowly.
        const gap = 120 + this.rng() * 720;
        for (let x = 70; x < 920; x += 110) if (Math.abs(x - gap) > 90) this.hazards.push({ kind: 'bramble', x: x + (this.rng() - 0.5) * 30, y: -40 - this.rng() * 60, r: 34, hp: 3, maxHp: 3, t: 0, seed: x, dead: false });
        Sfx.play('thorn');
      } else if (b.attack === 'wave' && b.attackT > 0.8 && b.attackT - dt <= 0.8 && BEASTS[b.kind]?.spawn === 'whirls') {
        // The Wyrm's coils stir the sea into a pair of whirlpools that close on the boat.
        for (const side of [-1, 1]) this.hazards.push({ kind: 'whirl', x: Phaser.Math.Clamp(this.bx + side * (150 + this.rng() * 60), 60, 900), y: this.by - 260, r: 30, hp: 999, maxHp: 999, t: 0, seed: side, dead: false });
        Sfx.play('tornado');
      } else if (b.attack === 'wave' && b.attackT > 0.8 && b.attackT - dt <= 0.8) {
        const gap = 80 + this.rng() * 800;
        for (let x = 40; x < 940; x += 46) if (Math.abs(x - gap) > 80) this.hazards.push({ kind: 'drift', x, y: -30, r: 16, hp: 2, maxHp: 2, t: 0, seed: x, dead: false });
        Sfx.play('splash');
      }
      if (b.attackT > 1.6) { b.attack = null; b.nextAttack = 1.4 + this.rng() * 1.2; }
    } else if (b.nextAttack <= 0) {
      const opts = ['spit', 'slam', 'wave'];
      b.attack = opts[Math.floor(this.rng() * opts.length)];
      b.attackT = 0;
    }
  }

  // ── Ending ───────────────────────────────────────────────────────────

  private sink(): void {
    if (this.over) return;
    this.over = true;
    const s = Save.S();
    const lost = boats().find((x) => x.id === s.boat.owned);
    s.boat.owned = null;
    s.stats.sunk += 1;
    if (!this.crossing) s.wastesBest = Math.max(s.wastesBest, Math.round(this.dist));
    Save.persist();
    Sfx.play('defeat');
    this.cameras.main.shake(600, 0.012);
    this.endCard('SUNK', [`${lost?.name ?? 'Your boat'} went down at ${Math.round(this.dist)} m.`, `The hold (${this.haul} 🪙) sank with it.`, 'A fisherman dragged you back to port.'], '#ff8a7a');
  }

  private finish(_arrived: boolean): void {
    if (this.over) return;
    this.over = true;
    const s = Save.S();
    Save.addCoins(this.haul);
    Save.addOrbs(this.orbs);
    if (!this.crossing) s.wastesBest = Math.max(s.wastesBest, Math.round(this.dist));
    Save.persist();
    Sfx.play('reward-big');
    this.endCard(this.crossing ? 'TURNED BACK' : 'HOME AGAIN', [this.crossing ? `Put about ${Math.round(this.toLand())} m short of ${this.crossing.name}.` : `Reached ${Math.round(this.dist)} m (best ${s.wastesBest} m).`, `Hold: +${this.haul} 🪙${this.orbs ? `  +${this.orbs} 🔮` : ''}`, `Hull ${this.hull}/${this.maxHull}`], '#9dffb0');
  }

  /** A crossing made: the hold is banked and you step off at the new isle's mooring. */
  private landfall(): void {
    if (this.over || !this.crossing) return;
    this.over = true;
    const isle = this.crossing;
    const s = Save.S();
    Save.addCoins(this.haul);
    Save.addOrbs(this.orbs);
    const port = getArea(isle.port);
    const moor = port?.pois.find((p) => p.kind === 'mooring');
    const at = moor && 'at' in moor ? moor.at : port?.spawn ?? { x: -1, y: -1 };
    const first = !s.waystones.includes(isle.port);
    Save.touchWaystone(isle.port);
    Save.setPlace(isle.port, at);
    Save.persist();
    this.from = isle.port;
    this.fromPos = at;
    Sfx.play('reward-big');
    this.cameras.main.flash(500, 255, 250, 230);
    this.endCard('LANDFALL', [
      first ? `${isle.name} — first landing.` : `${isle.name} again.`,
      `Hold: +${this.haul} 🪙${this.orbs ? `  +${this.orbs} 🔮` : ''}`,
      `Hull ${this.hull}/${this.maxHull}`,
    ], '#9dd8ff');
  }

  private endCard(title: string, lines: string[], color: string): void {
    const W = this.scale.width;
    const bg = this.add.rectangle(W / 2, 320, 520, 240, 0x08121c, 0.92).setDepth(20).setStrokeStyle(2, 0x6ac8ff);
    const t = this.add.text(W / 2, 240, title, { fontFamily: FONT_DISPLAY, fontSize: '36px', color, stroke: '#000', strokeThickness: 6 }).setOrigin(0.5).setDepth(21);
    const b = this.add.text(W / 2, 320, lines.join('\n'), { fontFamily: FONT_UI, fontSize: '16px', color: '#e8f4ff', align: 'center', lineSpacing: 6 }).setOrigin(0.5).setDepth(21);
    const h = this.add.text(W / 2, 412, 'Press any key', { fontFamily: FONT_UI, fontSize: '13px', color: '#9ab8d0' }).setOrigin(0.5).setDepth(21);
    void bg; void t; void b; void h;
    this.time.delayedCall(900, () => {
      const go = () => this.scene.start('IsleWorldScene', { area: this.from, pos: this.fromPos });
      this.input.keyboard?.once('keydown', go);
      this.input.once('pointerdown', go);
    });
  }

  // ── Drawing ──────────────────────────────────────────────────────────

  private draw(t: number): void {
    const W = this.scale.width, H = this.scale.height;
    const g = this.g;
    g.clear();
    const bi = this.band();
    const bands = this.bands();
    const B = bands[bi], N = bands[Math.min(bands.length - 1, bi + 1)];
    const k = bi < bands.length - 1 ? Phaser.Math.Clamp((this.dist - B.at) / (N.at - B.at), 0, 1) : 0;
    const sea = Phaser.Display.Color.Interpolate.ColorWithColor(Phaser.Display.Color.ValueToColor(B.sea), Phaser.Display.Color.ValueToColor(N.sea), 100, k * 100);
    const seaC = Phaser.Display.Color.GetColor(sea.r, sea.g, sea.b);
    g.fillStyle(seaC, 1); g.fillRect(0, 0, W, H);
    // Swell bands scrolling with distance.
    const off = (this.dist * 10) % 60;
    for (let y = -60 + off; y < H; y += 60) {
      g.lineStyle(2, B.foam, 0.12);
      g.beginPath();
      for (let x = 0; x <= W; x += 24) { const yy = y + Math.sin(x * 0.015 + t + y * 0.01) * 6; if (x === 0) g.moveTo(x, yy); else g.lineTo(x, yy); }
      g.strokePath();
    }
    for (let i = 0; i < 40; i++) {
      const x = (i * 211) % W, y = ((i * 97 + this.dist * 10) % (H + 20)) - 10;
      g.fillStyle(B.foam, 0.18); g.fillEllipse(x, y, 14, 3);
    }
    if (this.rough) this.drawRoughWater(g, t, B);
    // Wake
    for (let i = 1; i < this.wake.length; i++) {
      const a = this.wake[i - 1], b = this.wake[i];
      g.lineStyle(10 - i * 0.3, 0xffffff, 0.25 * (1 - i / this.wake.length));
      g.lineBetween(a.x, a.y, b.x, b.y);
    }
    if (this.crossing && this.toLand() < COAST_M + 200) this.drawCoast(g, t);
    for (const l of this.loot) this.drawLoot(g, l, t);
    for (const h of this.hazards) this.drawHazard(g, h, t);
    if (this.beast) {
      if (this.beast.kind === 'wyrm') this.drawWyrm(g, this.beast, t);
      else if (this.beast.kind === 'brambleback') this.drawBrambleback(g, this.beast, t);
      else if (this.beast.kind === 'skyray') this.drawSkyray(g, this.beast, t);
      else if (this.beast.kind === 'cragjaw') this.drawCragjaw(g, this.beast, t);
      else if (this.beast.kind === 'galvaneel') this.drawGalvaneel(g, this.beast, t);
      else if (this.beast.kind === 'hydra') this.drawHydra(g, this.beast, t);
      else if (this.beast.kind === 'wheelback') this.drawWheelback(g, this.beast, t);
      else if (this.beast.kind === 'cantor') this.drawCantor(g, this.beast, t);
      else if (this.beast.kind === 'lensback') this.drawLensback(g, this.beast, t);
      else this.drawBeast(g, this.beast, t);
    }
    if (this.thornT < 0.45) {
      this.thornT += 1 / 60;
      const k = this.thornT / 0.45;
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2, r0 = 22 + k * 40, r1 = r0 + 18 + k * 70;
        g.lineStyle(3 * (1 - k) + 1, 0x7aa83a, 1 - k);
        g.lineBetween(this.bx + Math.cos(a) * r0, this.by + Math.sin(a) * r0, this.bx + Math.cos(a) * r1, this.by + Math.sin(a) * r1);
      }
    }
    if (this.sailT < 0.7) {
      // The Windcatcher fills: wind streaks rush past the boat from astern.
      const k = this.sailT / 0.7;
      for (let i = 0; i < 10; i++) {
        const sx = this.bx + (i - 4.5) * 22, sy = this.by + 40 - k * 220 - (i % 3) * 18;
        g.lineStyle(2, 0xffffff, 0.6 * (1 - k)); g.lineBetween(sx, sy, sx, sy + 40);
      }
    }
    if (this.mastT < 0.3) {
      this.mastT += 1 / 60;
      const a = 1 - this.mastT / 0.3;
      for (const p of this.mastBolts) {
        for (const [w, c] of [[4, 0x6ab8ff], [1.5, 0xffffff]] as const) {
          g.lineStyle(w, c, a); g.beginPath(); g.moveTo(this.bx, this.by - 30);
          for (let k = 1; k <= 6; k++) { const u = k / 6; g.lineTo(Phaser.Math.Linear(this.bx, p.x, u) + (k < 6 ? Math.sin(p.x + k * 4.1) * 12 : 0), Phaser.Math.Linear(this.by - 30, p.y, u)); }
          g.strokePath();
        }
      }
    }
    if (this.hornT < 1.6) {
      // The Foghorn's blast: a long low ring of grey-gold air rolling out from the prow, wobbling with
      // the note, a fainter second ring behind it, and fog breathing from the horn's mouth.
      this.hornT += 1 / 60;
      const k = Math.min(1, this.hornT / 1.6), R = 30 + (1 - (1 - k) * (1 - k)) * HORN_REACH, a = 1 - k;
      const pts = (rr: number, wob: number) => {
        const out: Phaser.Geom.Point[] = [];
        for (let i = 0; i <= 48; i++) { const an = (i / 48) * Math.PI * 2, w = rr + Math.sin(an * 6 + this.hornT * 9) * wob; out.push(new Phaser.Geom.Point(this.bx + Math.cos(an) * w, this.by - 20 + Math.sin(an) * w * 0.9)); }
        return out;
      };
      g.lineStyle(16 * a + 2, 0xe8dcb0, 0.12 * a); g.strokePoints(pts(R, 4), true);
      g.lineStyle(4 * a + 1, 0xf4ecd0, 0.55 * a); g.strokePoints(pts(R, 4), true);
      if (R > 90) { g.lineStyle(2, 0xd8d0b8, 0.3 * a); g.strokePoints(pts(R - 60, 3), true); }
      const mouth = { x: this.bx + Math.sin(this.heading) * (this.boat.len / 2 + 14), y: this.by - Math.cos(this.heading) * (this.boat.len / 2 + 14) };
      for (let i = 0; i < 6; i++) {
        const q = Math.min(1, this.hornT * 1.5) * (0.4 + i * 0.12);
        g.fillStyle(0xe8e4d8, 0.22 * a); g.fillCircle(mouth.x + Math.sin(i * 2.1) * q * 18, mouth.y - q * 40 - i * 4, 5 + q * 12);
      }
    }
    if (this.glassT < 0.5) {
      // The Burning Glass Prow lances: a white-hot beam from the prow lens to each target — a gold
      // halo, a bright body and a white core, flickering — with a flash and a spray of sparks where it burns.
      this.glassT += 1 / 60;
      const k = this.glassT / 0.5, a = 1 - k * k, fl = 0.8 + 0.2 * Math.sin(this.glassT * 90);
      const lens = { x: this.bx + Math.sin(this.heading) * (this.boat.len / 2 + 4), y: this.by - Math.cos(this.heading) * (this.boat.len / 2 + 4) };
      for (const p of this.glassHits) {
        g.lineStyle(14, 0xffd060, 0.18 * a); g.lineBetween(lens.x, lens.y, p.x, p.y);
        g.lineStyle(6, 0xfff4c8, 0.6 * a * fl); g.lineBetween(lens.x, lens.y, p.x, p.y);
        g.lineStyle(2, 0xffffff, a); g.lineBetween(lens.x, lens.y, p.x, p.y);
        g.fillStyle(0xffffff, 0.8 * a); g.fillCircle(p.x, p.y, 10 * (1 - k) + 4);
        g.lineStyle(2, 0xffe890, a); g.strokeCircle(p.x, p.y, 10 + k * 34);
        for (let i = 0; i < 8; i++) {
          const sa = i * (Math.PI / 4) + p.x * 0.1, d = 6 + k * 30;
          g.fillStyle(i % 2 ? 0xffffff : 0xffc860, a); g.fillCircle(p.x + Math.cos(sa) * d, p.y + Math.sin(sa) * d + k * k * 10, 1.6);
        }
        for (let i = 0; i < 3; i++) { g.fillStyle(0xe8e4dc, 0.25 * a); g.fillCircle(p.x + (i - 1) * 8, p.y - 8 - k * 30 - i * 4, 5 + k * 9); }
      }
      g.fillStyle(0xffffff, 0.7 * a); g.fillCircle(lens.x, lens.y, 9 * a + 3);
    }
    if (this.bowWaveT < 0.6) {
      const k = this.bowWaveT / 0.6;
      g.lineStyle(6 * (1 - k) + 2, 0xd8f4ff, 0.7 * (1 - k));
      g.beginPath(); g.arc(this.bx, this.by - 10, 40 + k * 290, -Math.PI / 2 - 0.55, -Math.PI / 2 + 0.55, false); g.strokePath();
    }
    for (const s of this.shots) {
      const c = s.foe ? BEASTS[this.beast?.kind ?? 'magmaw']?.shot ?? 0xff5a1a : this.elementColor;
      g.fillStyle(c, 0.35); g.fillCircle(s.x, s.y, s.big ? 10 : 7);
      g.fillStyle(0xffffff, 0.9); g.fillCircle(s.x, s.y, s.big ? 4 : 3);
    }
    if (!this.over || this.hull > 0) this.drawBoat(g, t);
    // Deep vignette
    if (bi >= 2) {
      for (let r = 0; r < 6; r++) { g.lineStyle(60, 0x000000, 0.08 + bi * 0.03); g.strokeCircle(this.bx, this.by, 360 + r * 60 - bi * 30); }
    }
    this.drawHud();
  }

  /**
   * The Outer Sea under the boat: deep swell troughs rolling down in dark bands, whitecaps tearing
   * off their crests, slanting rain, and a fork of lightning on each storm flash.
   */
  private drawRoughWater(g: Phaser.GameObjects.Graphics, t: number, B: (typeof BANDS)[number]): void {
    const W = this.scale.width, H = this.scale.height;
    const off = (this.dist * 10 * 0.8) % 150;
    for (let y = -150 + off; y < H + 150; y += 150) {
      g.fillStyle(B.deep, 0.55);
      g.beginPath(); g.moveTo(0, y + 60);
      for (let x = 0; x <= W; x += 32) g.lineTo(x, y + Math.sin(x * 0.008 + t * 0.9 + y * 0.02) * 16);
      g.lineTo(W, y + 60); g.closePath(); g.fillPath();
      g.lineStyle(3, B.foam, 0.3);
      g.beginPath();
      for (let x = 0; x <= W; x += 24) { const yy = y + Math.sin(x * 0.008 + t * 0.9 + y * 0.02) * 16; if (x === 0) g.moveTo(x, yy); else g.lineTo(x, yy); }
      g.strokePath();
      for (let i = 0; i < 9; i++) {
        const cx = ((i * 137 + y * 3.1) % W + W) % W, cy = y + Math.sin(cx * 0.008 + t * 0.9 + y * 0.02) * 16;
        const tear = (t * 1.6 + i * 0.37) % 1;
        g.fillStyle(0xffffff, 0.55 * (1 - tear)); g.fillEllipse(cx + tear * 14, cy - 2 - tear * 6, 18 - tear * 8, 4);
      }
    }
    for (let i = 0; i < 70; i++) {
      const rx = ((i * 173 + t * 260) % (W + 80)) - 40, ry = ((i * 89 + t * 900) % (H + 60)) - 30;
      g.lineStyle(1, 0xc8dcf0, 0.28); g.lineBetween(rx, ry, rx - 7, ry + 18);
    }
    if (this.flashT < 0.25) {
      const a = 1 - this.flashT / 0.25;
      let lx = this.flashX, ly = -10;
      g.lineStyle(3, 0xeaf4ff, a);
      g.beginPath(); g.moveTo(lx, ly);
      for (let i = 0; i < 7; i++) { lx += (Math.sin(this.flashX + i * 7.3) * 34); ly += 26 + (i % 2) * 10; g.lineTo(lx, ly); }
      g.strokePath();
      g.fillStyle(0xd8e8ff, 0.12 * a); g.fillRect(0, 0, W, H);
    }
  }

  private drawBoat(g: Phaser.GameObjects.Graphics, t: number): void {
    const b = this.boat, x = this.bx, y = this.by;
    const L = b.len, flick = this.invuln > 0 && Math.floor(t * 20) % 2 === 0;
    if (flick) return;
    const rot = this.heading;
    const pt = (dx: number, dy: number) => new Phaser.Geom.Point(x + dx * Math.cos(rot) - dy * Math.sin(rot), y + dx * Math.sin(rot) + dy * Math.cos(rot));
    g.fillStyle(0x000000, 0.25); g.fillEllipse(x + 4, y + 6, L * 0.7, L * 1.1);
    const hull = [pt(0, -L / 2 - 6), pt(L * 0.3, -L * 0.1), pt(L * 0.26, L / 2), pt(-L * 0.26, L / 2), pt(-L * 0.3, -L * 0.1)];
    g.fillStyle(Phaser.Display.Color.ValueToColor(b.color).darken(30).color, 1); g.fillPoints(hull, true, true);
    g.fillStyle(b.color, 1); g.fillPoints(hull.map((p) => new Phaser.Geom.Point(x + (p.x - x) * 0.82, y + (p.y - y) * 0.86)), true, true);
    // Planks
    g.lineStyle(1, 0x2a1a0a, 0.5);
    for (let i = -2; i <= 2; i++) { const a = pt(i * L * 0.08, -L * 0.3), c = pt(i * L * 0.08, L * 0.42); g.lineBetween(a.x, a.y, c.x, c.y); }
    // Sails
    for (let s = 0; s < Math.max(1, b.sails); s++) {
      const sy = -L * 0.12 + s * L * 0.28 - (b.sails > 1 ? L * 0.12 : 0);
      const billow = Math.sin(t * 2 + s) * 3;
      const m = pt(0, sy);
      g.fillStyle(0x3a2a1a, 1); g.fillCircle(m.x, m.y, 3);
      if (b.sails > 0) {
        const l = pt(-L * 0.42, sy + 4 + billow), r = pt(L * 0.42, sy + 4 + billow), c = pt(0, sy - 10 + billow);
        g.fillStyle(0xe8dcc0, 0.95); g.fillTriangle(l.x, l.y, r.x, r.y, c.x, c.y);
        g.fillStyle(this.elementColor, 0.8); g.fillCircle(c.x, (l.y + c.y) / 2, 4);
      }
    }
    // Bow cannon / brazier
    const bow = pt(0, -L / 2 + 4);
    g.fillStyle(0x2a2a2e, 1); g.fillCircle(bow.x, bow.y, 5);
    if (Save.S().boat.uber === 'uber-brazier') {
      const br = pt(0, L * 0.3);
      g.fillStyle(0x3a2a20, 1); g.fillRect(br.x - 6, br.y - 4, 12, 8);
      g.fillStyle(0xff8a2a, 0.9); g.fillTriangle(br.x - 5, br.y - 4, br.x + 5, br.y - 4, br.x, br.y - 14 - Math.sin(t * 14) * 3);
    }
    if (Save.S().boat.uber === 'uber-figurehead') {
      // A carved queen leaning out over the bow, her crown green with sea-brass.
      const fh = pt(0, -L / 2 - 4), fh2 = pt(0, -L / 2 - 12);
      g.fillStyle(0x2a5a7a, 1); g.fillEllipse(fh.x, fh.y, 9, 12);
      g.fillStyle(0xd8c8a0, 1); g.fillCircle(fh2.x, fh2.y, 4.5);
      g.fillStyle(0x6ac8a8, 1); g.fillTriangle(fh2.x - 4, fh2.y - 3, fh2.x + 4, fh2.y - 3, fh2.x, fh2.y - 9);
    }
    if (Save.S().boat.uber === 'uber-greenwood') {
      // Living wood: green shoots along the gunwales, a leafy crown on the bow.
      for (let i = -2; i <= 2; i++) for (const side of [-1, 1]) {
        const p0 = pt(side * L * 0.27, i * L * 0.16), p1 = pt(side * (L * 0.27 + 7), i * L * 0.16 - 5 + Math.sin(t * 3 + i) * 2);
        g.lineStyle(2, 0x5a8a2a, 1); g.lineBetween(p0.x, p0.y, p1.x, p1.y);
        g.fillStyle(0x8ad84a, 1); g.fillEllipse(p1.x, p1.y, 6, 4);
      }
      const crown = pt(0, -L / 2 - 6);
      g.fillStyle(0x6ab83a, 1); g.fillCircle(crown.x, crown.y, 6); g.fillStyle(0xa8e86a, 1); g.fillCircle(crown.x - 2, crown.y - 2, 3);
    }
    if (Save.S().boat.uber === 'uber-windcatcher') {
      // A wing-shaped sail of grey ray-skin stretched over the deck; it bellies out when it fills.
      const fill = this.sailT < 1.1 ? 1 - this.sailT / 1.1 : 0;
      const l = pt(-L * 0.62, L * 0.05), r = pt(L * 0.62, L * 0.05), tip = pt(0, -L * 0.36 - fill * 10), tail = pt(0, L * 0.2);
      g.fillStyle(0x8aa0b8, 0.75); g.fillTriangle(l.x, l.y, tip.x, tip.y, tail.x, tail.y); g.fillTriangle(r.x, r.y, tip.x, tip.y, tail.x, tail.y);
      g.lineStyle(1.5, 0xe8f4ff, 0.8 + fill * 0.2); g.lineBetween(l.x, l.y, tip.x, tip.y); g.lineBetween(r.x, r.y, tip.x, tip.y);
      g.fillStyle(0xffffff, 0.8); g.fillCircle(pt(-L * 0.18, -L * 0.06).x, pt(-L * 0.18, -L * 0.06).y, 1.6); g.fillCircle(pt(L * 0.18, -L * 0.06).x, pt(L * 0.18, -L * 0.06).y, 1.6);
    }
    if (Save.S().boat.uber === 'uber-cragplate') {
      // A ram of the Cragjaw's jaw-stone bolted over the bow; it glints amber while hardened.
      const tip = pt(0, -L / 2 - 12), l = pt(-L * 0.24, -L * 0.3), r = pt(L * 0.24, -L * 0.3);
      g.fillStyle(0x5a5048, 1); g.fillTriangle(tip.x, tip.y, l.x, l.y, r.x, r.y);
      g.fillStyle(0x8a7c6a, 1); g.fillTriangle(tip.x, tip.y, l.x, l.y, pt(0, -L * 0.3).x, pt(0, -L * 0.3).y);
      g.lineStyle(2, this.plateReady ? 0xffc870 : 0x3a322a, this.plateReady ? 0.6 + Math.sin(t * 6) * 0.3 : 1);
      g.strokeTriangle(tip.x, tip.y, l.x, l.y, r.x, r.y);
    }
    if (Save.S().boat.uber === 'uber-hydraprow') {
      // Three carved serpent heads on the bow — left, centre and right — on short necks of dark
      // green-stained wood with yellow-painted eyes. One that has bitten lunges at its target and
      // snaps back; while it grows back it is a stump with a new head budding out of it.
      const now = this.time.now / 1000;
      for (let i = 0; i < 3; i++) {
        const m = this.prowMount(i), base = pt(m.x * 0.85, m.y + 10);
        const regrow = this.prowReady[i] > now ? 1 - (this.prowReady[i] - now) / PROW_REGROW : 1;
        const bite = this.prowBite[i], since = now - bite.at;
        let hx = pt(m.x, m.y).x, hy = pt(m.x, m.y).y;
        if (since < 0.3) {
          const k = Math.sin((since / 0.3) * Math.PI);
          hx = Phaser.Math.Linear(hx, bite.x, k * 0.85); hy = Phaser.Math.Linear(hy, bite.y, k * 0.85);
        }
        const grown = since < 0.3 ? 1 : regrow;
        const ang = Math.atan2(hy - base.y, hx - base.x);
        // Neck.
        g.lineStyle(6, 0x1a2a14, 1); g.lineBetween(base.x, base.y, Phaser.Math.Linear(base.x, hx, grown), Phaser.Math.Linear(base.y, hy, grown));
        g.lineStyle(3, 0x3a5a2a, 1); g.lineBetween(base.x, base.y, Phaser.Math.Linear(base.x, hx, grown), Phaser.Math.Linear(base.y, hy, grown));
        if (grown < 1) {
          // A splintered stump with a green bud swelling out of it.
          g.fillStyle(0x5a3a1e, 1); g.fillCircle(base.x, base.y, 4);
          g.fillStyle(0x8ad84a, 0.4 + grown * 0.6); g.fillCircle(Phaser.Math.Linear(base.x, hx, grown), Phaser.Math.Linear(base.y, hy, grown), 1.5 + grown * 4);
          continue;
        }
        const ca = Math.cos(ang), sa = Math.sin(ang), gape = since < 0.3 ? Math.sin((since / 0.3) * Math.PI) : 0;
        g.fillStyle(0x1a2a14, 1); g.fillEllipse(hx, hy, 11, 11);
        g.fillStyle(0x3a5a2a, 1); g.fillEllipse(hx - ca * 1, hy - sa * 1, 9, 9);
        g.fillStyle(0x2a1a0a, 1); g.fillTriangle(hx + ca * 3 - sa * 2 * gape, hy + sa * 3 + ca * 2 * gape, hx + ca * 3 + sa * 2 * gape, hy + sa * 3 - ca * 2 * gape, hx + ca * (7 + gape * 3), hy + sa * (7 + gape * 3));
        g.fillStyle(0xffd83a, 1); g.fillCircle(hx - sa * 2.5, hy + ca * 2.5, 1.2); g.fillCircle(hx + sa * 2.5, hy - ca * 2.5, 1.2);
        if (gape > 0.3) { g.fillStyle(0xf4eedc, 1); g.fillCircle(hx + ca * 6, hy + sa * 6, 1); }
      }
    }
    if (Save.S().boat.uber === 'uber-fortunehelm') {
      // The ship's wheel is a little roulette wheel on a gilt pedestal: red and black pockets, a gold
      // rim with spoke-handles, three boon marks (a white gust curl, a gold ward, a red broadside
      // ball) and a pointer at the top. It whirls and clicks to a stop on its boon, which flashes.
      const c = pt(0, L * 0.2), R = 9;
      const whirl = this.helmPending ? 1 - Phaser.Math.Clamp(this.helmT / HELM_WHIRL, 0, 1) : 0;
      const ang = this.helmAngle - whirl * whirl * whirl * 16 + rot;
      g.fillStyle(0x000000, 0.3); g.fillCircle(c.x + 1.5, c.y + 2, R + 3);
      for (let k = 0; k < 6; k++) {
        const a = ang + k * (Math.PI / 3);
        g.lineStyle(2, 0xb88a2a, 1); g.lineBetween(c.x, c.y, c.x + Math.cos(a) * (R + 4), c.y + Math.sin(a) * (R + 4));
        g.fillStyle(0xe8c050, 1); g.fillCircle(c.x + Math.cos(a) * (R + 4), c.y + Math.sin(a) * (R + 4), 1.8);
      }
      g.fillStyle(0xc8a040, 1); g.fillCircle(c.x, c.y, R + 1.5);
      for (let k = 0; k < 12; k++) {
        const a0 = ang + k * (Math.PI / 6);
        g.fillStyle(k % 2 ? 0x1a1418 : 0xb8202a, 1); g.slice(c.x, c.y, R, a0, a0 + Math.PI / 6, false); g.fillPath();
      }
      for (let i = 0; i < HELM_BOONS.length; i++) {
        const a = ang + (i + 0.5) * (Math.PI * 2 / HELM_BOONS.length), mx = c.x + Math.cos(a) * R * 0.66, my = c.y + Math.sin(a) * R * 0.66;
        const lit = !this.helmPending && this.helmBoon === HELM_BOONS[i] && this.helmT < HELM_WHIRL + 1.2;
        g.fillStyle(i === 0 ? 0xe8f8ff : i === 1 ? 0xffd84a : 0xff7a4a, 1); g.fillCircle(mx, my, lit ? 2.6 + Math.sin(t * 20) * 0.6 : 1.8);
      }
      g.fillStyle(0xe8c050, 1); g.fillCircle(c.x, c.y, 2.6); g.fillStyle(0xfff0b0, 1); g.fillCircle(c.x - 0.8, c.y - 0.8, 1);
      const tip = pt(0, L * 0.2 - R - 4), tl = pt(-3, L * 0.2 - R - 9), tr = pt(3, L * 0.2 - R - 9);
      g.fillStyle(0xfff0b0, 1); g.fillTriangle(tip.x, tip.y, tl.x, tl.y, tr.x, tr.y);
      // The boon it landed on, as a badge over the boat for a moment.
      const since = this.helmT - HELM_WHIRL;
      if (!this.helmPending && this.helmBoon && since >= 0 && since < 1.4) {
        const k = since / 1.4, bx = x, by = y - L * 0.8 - k * 18, a = Math.min(1, (1 - k) * 3);
        g.fillStyle(0x1a1418, 0.7 * a); g.fillCircle(bx, by, 12);
        g.lineStyle(2, 0xe8c050, a); g.strokeCircle(bx, by, 12);
        if (this.helmBoon === 'gust') {
          g.lineStyle(2, 0xe8f8ff, a);
          g.beginPath(); g.arc(bx - 1, by, 6, Math.PI * 0.9, Math.PI * 2.4, false); g.strokePath();
          g.lineBetween(bx - 8, by + 4, bx + 6, by + 4); g.lineBetween(bx - 6, by - 4, bx + 2, by - 4);
        } else if (this.helmBoon === 'ward') {
          g.fillStyle(0xffd84a, a); g.fillTriangle(bx - 6, by - 6, bx + 6, by - 6, bx, by + 8); g.fillRect(bx - 6, by - 7, 12, 4);
          g.fillStyle(0xfff4c0, a); g.fillTriangle(bx - 3, by - 4, bx, by - 4, bx - 1, by + 3);
        } else {
          g.fillStyle(0x2a2a2e, a); g.fillCircle(bx - 1, by + 1, 5);
          g.fillStyle(0xff7a2a, a); g.fillTriangle(bx + 3, by - 3, bx + 9, by - 8, bx + 6, by - 1);
          g.fillStyle(0xffffff, 0.6 * a); g.fillCircle(bx - 2.5, by - 0.5, 1.4);
        }
      }
      if (this.helmWard) {
        // The ward held in reserve: a faint gold shimmer arched over the bow.
        g.lineStyle(2, 0xffd84a, 0.35 + Math.sin(t * 4) * 0.2);
        g.beginPath(); g.arc(x, y, L * 0.72, -Math.PI / 2 - 0.9 + rot, -Math.PI / 2 + 0.9 + rot, false); g.strokePath();
        g.lineStyle(1, 0xfff4c0, 0.25); g.beginPath(); g.arc(x, y, L * 0.78, -Math.PI / 2 - 0.6 + rot, -Math.PI / 2 + 0.6 + rot, false); g.strokePath();
      }
    }
    if (Save.S().boat.uber === 'uber-foghorn') {
      // A brass foghorn mounted on the prow: a curled tube from a bellows-box on the deck, flaring to a
      // wide bell over the bow, a dark mouth and a bright rim; it shudders and glows as it sounds.
      const blast = this.hornT < 1.2 ? 1 - this.hornT / 1.2 : 0, sh = blast * Math.sin(t * 60) * 0.8;
      const box = pt(0, -L * 0.12), c1 = pt(-5, -L * 0.24), c2 = pt(4 + sh, -L * 0.36), neck = pt(sh, -L / 2 + 2);
      g.fillStyle(0x3a2414, 1); g.fillRect(box.x - 6, box.y - 4, 12, 8);
      g.fillStyle(0x7a5430, 1); g.fillRect(box.x - 6, box.y - 4, 12, 2);
      g.lineStyle(4.5, 0x5a3a14, 1); g.beginPath(); g.moveTo(box.x, box.y - 3); g.lineTo(c1.x, c1.y); g.lineTo(c2.x, c2.y); g.lineTo(neck.x, neck.y); g.strokePath();
      g.lineStyle(3, 0xc8963a, 1); g.beginPath(); g.moveTo(box.x, box.y - 3); g.lineTo(c1.x, c1.y); g.lineTo(c2.x, c2.y); g.lineTo(neck.x, neck.y); g.strokePath();
      g.lineStyle(1, 0xfff0b0, 0.7); g.lineBetween(c1.x - 1, c1.y, c2.x - 1, c2.y);
      const bl = pt(-9 + sh, -L / 2 - 12), br = pt(9 + sh, -L / 2 - 12), bm = pt(sh, -L / 2 - 13);
      g.fillStyle(0x5a3a14, 1); g.fillTriangle(neck.x, neck.y, bl.x, bl.y, br.x, br.y);
      g.fillStyle(0xd8a848, 1); g.fillTriangle(neck.x, neck.y + 0.5, pt(-7.5 + sh, -L / 2 - 11).x, pt(-7.5 + sh, -L / 2 - 11).y, pt(7.5 + sh, -L / 2 - 11).x, pt(7.5 + sh, -L / 2 - 11).y);
      g.fillStyle(0xffe8a0, 0.7); g.fillTriangle(neck.x, neck.y, pt(-6 + sh, -L / 2 - 11).x, pt(-6 + sh, -L / 2 - 11).y, pt(-2 + sh, -L / 2 - 11).x, pt(-2 + sh, -L / 2 - 11).y);
      g.fillStyle(0xe8c060, 1); g.fillEllipse(bm.x, bm.y, 19, 6);
      g.fillStyle(0x1a0e06, 1); g.fillEllipse(bm.x, bm.y, 14, 3.6);
      if (blast > 0) { g.fillStyle(0xfff0c0, 0.5 * blast); g.fillEllipse(bm.x, bm.y - 2, 22 + blast * 8, 8 + blast * 4); }
      else if (this.turretCd < 1) { g.fillStyle(0xffe8a0, 0.25 * (1 - this.turretCd)); g.fillEllipse(bm.x, bm.y, 20, 7); }
    }
    if (Save.S().boat.uber === 'uber-burningglass') {
      // The Burning Glass Prow: a round lens in a brass ring standing on a forked yoke at the bow, a
      // counterweight box on the deck behind it; as it charges, sunlight gathers into it in converging
      // rays and its heart brightens to white, and it flares as it lances.
      const charge = 1 - Phaser.Math.Clamp(this.turretCd / GLASS_EVERY, 0, 1), fire = this.glassT < 0.4 ? 1 - this.glassT / 0.4 : 0;
      const base = pt(0, -L * 0.3), fork0 = pt(-6, -L / 2 + 2), fork1 = pt(6, -L / 2 + 2), lc = pt(0, -L / 2 - 4);
      g.fillStyle(0x3a2414, 1); g.fillRect(base.x - 5, base.y - 4, 10, 8);
      g.fillStyle(0x7a5430, 1); g.fillRect(base.x - 5, base.y - 4, 10, 2);
      g.lineStyle(3, 0x5a3a14, 1); g.lineBetween(base.x, base.y - 2, lc.x, lc.y + 4); g.lineBetween(fork0.x, fork0.y, lc.x - 7, lc.y); g.lineBetween(fork1.x, fork1.y, lc.x + 7, lc.y);
      g.lineStyle(1.6, 0xc8963a, 1); g.lineBetween(base.x, base.y - 2, lc.x, lc.y + 4); g.lineBetween(fork0.x, fork0.y, lc.x - 7, lc.y); g.lineBetween(fork1.x, fork1.y, lc.x + 7, lc.y);
      if (charge > 0.2 && fire === 0) {
        g.lineStyle(1, 0xfff4c8, 0.35 * charge);
        for (let i = -2; i <= 2; i++) { const s = pt(i * 14, -L / 2 - 44); g.lineBetween(s.x, s.y, lc.x, lc.y); }
      }
      g.fillStyle(0xffd060, (0.08 + 0.25 * charge) + 0.4 * fire); g.fillCircle(lc.x, lc.y, 12 + charge * 4 + fire * 8);
      g.fillStyle(0x9ad8d0, 0.6); g.fillCircle(lc.x, lc.y, 7);
      g.fillStyle(0xffffff, 0.25 + 0.7 * Math.max(charge * charge, fire)); g.fillCircle(lc.x, lc.y, 2 + charge * 3 + fire * 3);
      g.lineStyle(1.2, 0xffffff, 0.7); g.beginPath(); g.arc(lc.x, lc.y, 5, Math.PI * 1.05, Math.PI * 1.5); g.strokePath();
      g.lineStyle(2.4, 0x6a4a1a, 1); g.strokeCircle(lc.x, lc.y, 7.5);
      g.lineStyle(1.4, 0xe8b848, 1); g.strokeCircle(lc.x, lc.y, 7.5);
      if (charge > 0.97 || fire > 0) {
        const s = 5 + Math.sin(t * 9) * 2 + fire * 8;
        g.lineStyle(1, 0xffffff, 0.8); g.lineBetween(lc.x - s, lc.y, lc.x + s, lc.y); g.lineBetween(lc.x, lc.y - s, lc.x, lc.y + s);
      }
    }
    // The captain: a dot of your element at the tiller.
    const cap = pt(0, L * 0.4);
    g.fillStyle(this.elementColor, 1); g.fillCircle(cap.x, cap.y, 5);
  }

  private drawHazard(g: Phaser.GameObjects.Graphics, h: Hazard, t: number): void {
    const { x, y, r } = h;
    if ((h.held ?? 0) > 0) this.drawHeld(g, h, t);
    switch (h.kind) {
      case 'burn': {
        if (h.t < 0) break;
        // A Lensback burning spot. Glint: the sea inside the focus whitens and shimmers, a ring of light
        // tightening onto it, caustic threads drawn in toward the centre and a four-point glint swelling
        // there. Beam: a column of white noon light slants down from the beast's dome onto the spot, the
        // water flashing and boiling. Scorch: a seething patch of white-gold water steaming away.
        const held = (h.held ?? 0) > 0;
        if (h.t < BURN_WARN) {
          const k = h.t / BURN_WARN, e = k * k, tw = 0.6 + 0.4 * Math.sin(t * 18 + h.seed);
          g.fillStyle(0xfff0b0, 0.05 + 0.12 * e); g.fillEllipse(x, y, r * 2, r * 1.2);
          g.lineStyle(1.2, 0xfff4c8, 0.25 + 0.35 * e);
          for (let i = 0; i < 16; i++) {
            const a = i * (Math.PI / 8) + h.seed;
            g.lineBetween(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.6, x + Math.cos(a) * (r - 4), y + Math.sin(a) * (r - 4) * 0.6);
          }
          g.lineStyle(2, 0xffe890, 0.4 + 0.4 * e); g.strokeEllipse(x, y, r * 2, r * 1.2);
          const rr = r * (1.6 - k * 1.2);
          g.lineStyle(3, 0xffffff, 0.15 + 0.45 * k); g.strokeEllipse(x, y, rr * 2, rr * 1.2);
          for (let i = 0; i < 7; i++) {
            const a = i * 0.9 + t * 0.6 + h.seed, d0 = r * (0.95 - ((t * 0.8 + i * 0.14) % 1) * 0.8);
            g.lineStyle(1, 0xffffff, 0.35 * e);
            g.lineBetween(x + Math.cos(a) * d0, y + Math.sin(a) * d0 * 0.6, x + Math.cos(a + 0.25) * d0 * 0.65, y + Math.sin(a + 0.25) * d0 * 0.39);
          }
          const s = 4 + e * 18 * tw;
          g.fillStyle(0xffffff, 0.25 + 0.5 * e); g.fillEllipse(x, y, 6 + e * 18, 3 + e * 10);
          g.lineStyle(1.5, 0xffffff, 0.5 + 0.5 * e); g.lineBetween(x - s, y, x + s, y); g.lineBetween(x, y - s * 0.6, x, y + s * 0.6);
          g.lineStyle(1, 0xffffff, 0.3 * e); g.lineBetween(x - s * 0.5, y - s * 0.3, x + s * 0.5, y + s * 0.3); g.lineBetween(x - s * 0.5, y + s * 0.3, x + s * 0.5, y - s * 0.3);
          break;
        }
        const bt = h.t - BURN_WARN;
        if (bt < BURN_BEAM) {
          const k = bt / BURN_BEAM, a = 1 - k * 0.3;
          const src = this.beast && this.beast.phase !== 'sink' ? { x: this.beast.x, y: this.beast.y - 10 } : { x: x + 60, y: -40 };
          const ang = Math.atan2(y - src.y, x - src.x), nx = -Math.sin(ang), ny = Math.cos(ang);
          const beam = (w0: number, w1: number, c: number, al: number) => {
            g.fillStyle(c, al);
            g.fillTriangle(src.x + nx * w0, src.y + ny * w0, src.x - nx * w0, src.y - ny * w0, x - nx * w1, y - ny * w1);
            g.fillTriangle(src.x + nx * w0, src.y + ny * w0, x - nx * w1, y - ny * w1, x + nx * w1, y + ny * w1);
          };
          beam(34, r * 0.9, 0xfff0b0, 0.14 * a); beam(22, r * 0.55, 0xfff8e0, 0.35 * a); beam(10, r * 0.28, 0xffffff, 0.85 * a);
          g.fillStyle(0xffffff, 0.35 * a); g.fillEllipse(x, y, r * 2.6, r * 1.5);
          g.fillStyle(0xffffff, 0.95); g.fillEllipse(x, y, r * 1.3, r * 0.8);
          g.lineStyle(3, 0xffe890, 0.8 * (1 - k)); g.strokeEllipse(x, y, r * (2 + k * 1.2), r * (1.2 + k * 0.7));
          for (let i = 0; i < 10; i++) {
            const sa = i * 0.63 + h.seed, d0 = r * (0.5 + k * 0.9);
            g.fillStyle(0xffffff, 0.9 * (1 - k)); g.fillCircle(x + Math.cos(sa) * d0, y + Math.sin(sa) * d0 * 0.6 - k * 10, 1.6);
          }
          break;
        }
        const lk = (bt - BURN_BEAM) / BURN_LINGER, a = (1 - lk) * (held ? 0.6 : 1);
        g.fillStyle(0xff8a2a, 0.18 * a); g.fillEllipse(x, y, r * 2.1, r * 1.25);
        g.fillStyle(0xffd060, 0.35 * a); g.fillEllipse(x, y, r * 1.6, r * 0.95);
        g.fillStyle(0xfff4d0, 0.55 * a); g.fillEllipse(x, y, r * 0.9, r * 0.5);
        g.lineStyle(2, 0xffb040, 0.6 * a); g.strokeEllipse(x, y, r * 2, r * 1.2);
        for (let i = 0; i < 12; i++) {
          const ph = (t * 3 + i * 0.37) % 1, ba = i * 0.52 + h.seed, d0 = r * 0.75 * ((i * 7 % 10) / 10);
          const bx = x + Math.cos(ba) * d0, by = y + Math.sin(ba) * d0 * 0.6;
          g.lineStyle(1, 0xffffff, 0.6 * a * (1 - ph)); g.strokeCircle(bx, by, 1 + ph * 3);
        }
        for (let i = 0; i < 6; i++) {
          const ph = ((lk * 1.6 + i / 6) % 1), sx = x + Math.sin(i * 2.3 + t) * r * 0.5;
          g.fillStyle(0xf4f0e8, 0.22 * a * (1 - ph)); g.fillCircle(sx + ph * 8, y - ph * 46, 5 + ph * 10);
        }
        break;
      }
      case 'ring': {
        if (h.t < 0) break;
        // A sound-ring: a band of shoved, glittering water spreading from where the Cantor sang, a
        // bright crest with a trough of darker water inside it and a fainter echo behind, broken by its
        // two rests — each gap capped with curls of foam and marked by a little hovering rest sign.
        const held = (h.held ?? 0) > 0, fade = Math.min(1, (RING_MAX - r) / 260) * Math.min(1, h.t * 4);
        const gaps = (h.gaps ?? []).map((gp) => Phaser.Math.Angle.Normalize(gp)).sort((a, b) => a - b);
        const runs: [number, number][] = gaps.length === 2
          ? [[gaps[0] + RING_REST, gaps[1] - RING_REST], [gaps[1] + RING_REST, gaps[0] + Math.PI * 2 - RING_REST]]
          : [[0, Math.PI * 2]];
        const crest = held ? 0xc8d0d8 : 0xf4f0dc, sheen = held ? 0x8a98a8 : 0xbfe0ff;
        const arcs = (rr: number, w: number, c: number, a: number) => {
          g.lineStyle(w, c, a);
          for (const [a0, a1] of runs) { g.beginPath(); g.arc(x, y, rr, a0, a1, false); g.strokePath(); }
        };
        arcs(r + 5, 12, sheen, 0.12 * fade);
        arcs(r - 6, 6, 0x05101e, 0.25 * fade);
        arcs(r, 4, crest, 0.7 * fade);
        arcs(r + 2, 1.2, 0xffffff, 0.55 * fade);
        if (r > 60) arcs(r - 34, 2, sheen, 0.2 * fade);
        if (!held) {
          for (let k = 0; k < 40; k++) {
            const a = k * (Math.PI / 20) + h.seed * 0.37, inRun = runs.some(([a0, a1]) => (a >= a0 && a <= a1) || (a + Math.PI * 2 >= a0 && a + Math.PI * 2 <= a1));
            if (!inRun) continue;
            const tw = Math.max(0, Math.sin(t * 7 + k * 2.3 + h.seed));
            if (tw < 0.6) continue;
            const px = x + Math.cos(a) * (r + Math.sin(k * 1.7) * 3), py = y + Math.sin(a) * (r + Math.sin(k * 1.7) * 3);
            if (py < -20 || py > 680 || px < -20 || px > 980) continue;
            g.fillStyle(0xffffff, (tw - 0.6) * 2 * fade); g.fillCircle(px, py, 1.6);
            g.lineStyle(1, 0xffffff, (tw - 0.6) * 1.5 * fade); g.lineBetween(px - 4, py, px + 4, py); g.lineBetween(px, py - 4, px, py + 4);
          }
        }
        for (const gp of gaps) {
          for (const side of [-1, 1]) {
            const a = gp + side * RING_REST, px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
            g.fillStyle(crest, 0.8 * fade); g.fillCircle(px, py, 3.2); g.fillStyle(0xffffff, 0.5 * fade); g.fillCircle(px - side * Math.sin(a) * 3, py + side * Math.cos(a) * 3, 2);
          }
          // The rest sign: a little quaver rest hovering in the gap.
          const mx = x + Math.cos(gp) * r, my = y + Math.sin(gp) * r + Math.sin(t * 3 + gp) * 2;
          if (my > -20 && my < 680) {
            g.lineStyle(2, 0xf0dca0, 0.75 * fade);
            g.beginPath(); g.moveTo(mx - 3, my - 5); g.lineTo(mx + 3, my - 4); g.lineTo(mx - 1, my + 6); g.strokePath();
            g.fillStyle(0xf0dca0, 0.75 * fade); g.fillCircle(mx - 3, my - 5, 1.8);
          }
        }
        break;
      }
      case 'rock': {
        g.fillStyle(0xffffff, 0.2); g.fillEllipse(x, y + r * 0.5, r * 2.6, r * 0.9);
        const pts: Phaser.Geom.Point[] = [];
        for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; const k = 0.75 + ((Math.sin(h.seed + i * 3.1) + 1) / 2) * 0.35; pts.push(new Phaser.Geom.Point(x + Math.cos(a) * r * k, y + Math.sin(a) * r * k * 0.85)); }
        g.fillStyle(0x2a2420, 1); g.fillPoints(pts, true, true);
        g.fillStyle(0x4a4038, 1); g.fillPoints(pts.map((p) => new Phaser.Geom.Point(x + (p.x - x) * 0.8, y + (p.y - y) * 0.8 - 2)), true, true);
        if (h.hp < h.maxHp) { g.lineStyle(1.5, 0x1a1410, 1); g.lineBetween(x - r * 0.4, y - r * 0.3, x + r * 0.2, y + r * 0.3); }
        break;
      }
      case 'reef':
        g.fillStyle(0xffffff, 0.15); g.fillEllipse(x, y, r * 2.4, r * 1.2);
        g.fillStyle(0x6a3a3a, 0.9); g.fillEllipse(x, y, r * 2, r);
        for (let i = 0; i < 6; i++) { g.fillStyle(0xd86a5a, 1); g.fillCircle(x + Math.sin(h.seed + i) * r * 0.8, y + Math.cos(h.seed + i * 2) * r * 0.35, 4 + (i % 3) * 2); }
        break;
      case 'mine': {
        const blink = h.armed !== undefined && Math.floor(t * 12) % 2 === 0;
        g.fillStyle(0x1a1a1e, 1); g.fillCircle(x, y, r);
        for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; g.fillRect(x + Math.cos(a) * r - 2, y + Math.sin(a) * r - 2, 4, 4); }
        g.fillStyle(blink ? 0xff3a1a : 0x8a1a1a, 1); g.fillCircle(x, y, 4);
        break;
      }
      case 'whirl':
        for (let i = 0; i < 4; i++) {
          g.lineStyle(3, 0xbfe8ff, 0.4 - i * 0.07);
          g.beginPath(); g.arc(x, y, r * (0.5 + i * 0.6), t * 3 + i, t * 3 + i + Math.PI * 1.3, false); g.strokePath();
        }
        g.fillStyle(0x020408, 0.8); g.fillCircle(x, y, r * 0.35);
        break;
      case 'drift':
        g.fillStyle(0x6a4a2a, 1); g.fillRoundedRect(x - r * 1.4, y - r * 0.35, r * 2.8, r * 0.7, 4);
        g.lineStyle(1, 0x3a2a14, 1); g.lineBetween(x - r, y, x + r, y);
        break;
      case 'tentacle': {
        const rise = Phaser.Math.Clamp((h.t - 0.0) / 1.1, 0, 1);
        if (h.t < 1.1) {
          g.lineStyle(2, 0xff5a3a, 0.4 + rise * 0.5); g.strokeCircle(x, y, r + 10 - rise * 8);
          g.fillStyle(0x000000, 0.3 * rise); g.fillCircle(x, y, r);
        } else {
          const k = Math.min(1, (h.t - 1.1) / 0.2);
          g.fillStyle(0x5a1a2a, 1);
          g.fillTriangle(x - r * 0.6, y + 10, x + r * 0.6, y + 10, x + Math.sin(h.seed) * 10, y - 70 * k);
          for (let i = 0; i < 4; i++) { g.fillStyle(0xd88a9a, 1); g.fillCircle(x + Math.sin(h.seed) * 10 * (i / 4), y - 60 * k * (i / 4) + 4, 3); }
        }
        break;
      }
      case 'bramble': {
        // A floating knot of thorn-vine: a dark mat, looping stems, pale hooked thorns.
        g.fillStyle(0xffffff, 0.12); g.fillEllipse(x, y + 6, r * 2.4, r * 0.9);
        g.fillStyle(0x23361a, 0.95); g.fillEllipse(x, y, r * 2.1, r * 1.3);
        for (let i = 0; i < 7; i++) {
          const a = h.seed + i * 0.9;
          g.lineStyle(3, i % 2 ? 0x4a6a2a : 0x3a5a22, 1);
          g.beginPath(); g.arc(x + Math.cos(a) * r * 0.45, y + Math.sin(a) * r * 0.28, r * 0.4, a, a + 3.2, false); g.strokePath();
          g.fillStyle(0xe8dcb0, 1);
          const tx = x + Math.cos(a) * r * 0.85, ty = y + Math.sin(a) * r * 0.5;
          g.fillTriangle(tx - 3, ty + 2, tx + 3, ty + 2, tx + Math.cos(a) * 6, ty + Math.sin(a) * 5 - 3);
        }
        if (h.hp < h.maxHp) { g.fillStyle(0x8ad84a, 0.6); g.fillCircle(x + Math.sin(t * 9) * 6, y, 3); }
        break;
      }
      case 'boulder': {
        // In the air: a shadow swelling on the water under a boulder dropping in from above.
        const k = Math.min(1, h.t / 1.2), fall = (1 - k) * 260;
        g.fillStyle(0x000000, 0.15 + k * 0.3); g.fillEllipse(x, y + 6, r * (1 + k) * 1.4, r * (0.5 + k * 0.4));
        g.lineStyle(2, 0xffd0a0, 0.3 + k * 0.5); g.strokeCircle(x, y, r + 22);
        g.fillStyle(0x5a4a3a, 1); g.fillCircle(x, y - fall, r * (0.7 + k * 0.3));
        g.fillStyle(0x7a6a58, 1); g.fillCircle(x - r * 0.2, y - fall - r * 0.2, r * 0.5);
        break;
      }
      case 'gust': {
        // A gust front: a band of flattened, ruffled water racing across, streaks showing the push.
        const dir = h.seed;
        g.fillStyle(0xd8f0ff, 0.08); g.fillRect(0, y - r, 960, r * 2);
        g.lineStyle(1, 0xffffff, 0.35); g.lineBetween(0, y - r, 960, y - r); g.lineBetween(0, y + r, 960, y + r);
        for (let i = 0; i < 26; i++) {
          const sx = ((i * 83 + h.t * 520 * dir) % 1000 + 1000) % 1000 - 20, sy = y - r + 6 + ((i * 37) % (r * 2 - 12));
          g.lineStyle(2, 0xffffff, 0.55); g.lineBetween(sx, sy, sx - dir * 34, sy);
          g.lineBetween(sx, sy, sx - dir * 7, sy - 4); g.lineBetween(sx, sy, sx - dir * 7, sy + 4);
        }
        break;
      }
      case 'arc': {
        // Two charged floats bobbing, the line between them a jagged double fork while live,
        // a dim sagging wire with the odd spark while it gutters.
        const live = !!h.armed, x0 = x - r, x1 = x + r;
        for (const fx of [x0, x1]) {
          g.fillStyle(0x1a2a3a, 1); g.fillCircle(fx, y + 2, 10);
          g.fillStyle(0xd8e0e8, 1); g.fillRect(fx - 3, y - 16, 6, 16);
          g.fillStyle(live ? 0xbfe8ff : 0x4a6a8a, 1); g.fillCircle(fx, y - 18, 5);
          if (live) { g.fillStyle(0x8ad8ff, 0.3); g.fillCircle(fx, y - 18, 12); }
        }
        if (live) {
          for (const [w, c, a] of [[6, 0x4a9aff, 0.35], [3, 0x9ad8ff, 0.8], [1.2, 0xffffff, 1]] as const) {
            g.lineStyle(w, c, a); g.beginPath(); g.moveTo(x0, y - 18);
            for (let k = 1; k < 14; k++) g.lineTo(x0 + (x1 - x0) * (k / 14), y - 18 + Math.sin(t * 40 + k * 2.3 + h.seed) * 9);
            g.lineTo(x1, y - 18); g.strokePath();
          }
        } else {
          g.lineStyle(1.5, 0x4a6a8a, 0.8); g.beginPath(); g.moveTo(x0, y - 18);
          for (let k = 1; k <= 10; k++) g.lineTo(x0 + (x1 - x0) * (k / 10), y - 18 + Math.sin((k / 10) * Math.PI) * 10);
          g.strokePath();
          const sk = (t * 3) % 1; g.fillStyle(0xbfe8ff, 1 - sk); g.fillCircle(x0 + (x1 - x0) * sk, y - 18 + Math.sin(sk * Math.PI) * 10, 2.5);
        }
        break;
      }
      case 'breaker': {
        // A rolling wall of white water across the whole sea: a dark face, a curling crest throwing
        // spray, and one glassy trough (marked by its calm, darker water) to steer through.
        const gap = h.seed, spent = !!h.armed;
        const edge = (x0: number, x1: number) => {
          if (x1 <= x0) return;
          g.fillStyle(0x041024, 0.55); g.fillRect(x0, y - r * 1.6, x1 - x0, r * 1.6);
          g.fillStyle(0xbfe2ff, spent ? 0.35 : 0.75);
          g.beginPath(); g.moveTo(x0, y);
          for (let x = x0; x <= x1; x += 16) g.lineTo(x, y - r * 0.6 + Math.sin(x * 0.05 + t * 6) * 4);
          g.lineTo(x1, y + r * 0.5); g.lineTo(x0, y + r * 0.5); g.closePath(); g.fillPath();
          for (let x = x0 + 8; x < x1; x += 22) {
            const k = (t * 2 + x * 0.013) % 1;
            g.fillStyle(0xffffff, (spent ? 0.3 : 0.8) * (1 - k)); g.fillCircle(x + k * 6, y - r * 0.7 - k * 14, 3 + k * 3);
          }
        };
        edge(0, gap - BREAKER_GAP);
        edge(gap + BREAKER_GAP, 960);
        if (!spent) {
          g.lineStyle(2, 0x9dd8ff, 0.5 + Math.sin(t * 8) * 0.25);
          g.lineBetween(gap - BREAKER_GAP + 6, y + r, gap - BREAKER_GAP + 6, y - r * 1.4);
          g.lineBetween(gap + BREAKER_GAP - 6, y + r, gap + BREAKER_GAP - 6, y - r * 1.4);
        }
        break;
      }
      case 'slick': {
        if (h.t < 0) break;
        if (h.t < SLICK_FLIGHT) {
          // In the air: a glob of venom lobbed in a high arc from the Hydra, a shadow swelling on the
          // water where it will land, and a faint ring marking the spot.
          const k = h.t / SLICK_FLIGHT, gx = Phaser.Math.Linear(h.seed, x, k), gy = Phaser.Math.Linear(170, y, k) - Math.sin(k * Math.PI) * 150;
          g.fillStyle(0x0a1a08, 0.12 + k * 0.3); g.fillEllipse(x, y, r * (0.4 + k * 0.8), r * (0.2 + k * 0.35));
          g.lineStyle(1.5, 0x9af05a, 0.2 + k * 0.4); g.strokeEllipse(x, y, r * 2, r * 1.1);
          for (let i = 1; i <= 4; i++) {
            const kk = Math.max(0, k - i * 0.04), tx = Phaser.Math.Linear(h.seed, x, kk), ty = Phaser.Math.Linear(170, y, kk) - Math.sin(kk * Math.PI) * 150;
            g.fillStyle(0x7ad83a, 0.5 - i * 0.1); g.fillCircle(tx, ty, 5 - i);
          }
          g.fillStyle(0x3a7a1a, 1); g.fillEllipse(gx, gy, 16, 13 + Math.sin(t * 20) * 2);
          g.fillStyle(0x8ae03a, 1); g.fillEllipse(gx - 1, gy - 1, 12, 9);
          g.fillStyle(0xe8ffc0, 0.9); g.fillCircle(gx - 3, gy - 3, 2.2);
          break;
        }
        // On the water: a spreading sheen of venom with a ragged, creeping edge — dark green in the
        // middle, oily rainbow bands round it, bubbles rising and popping; it thins as it fades.
        const st = this.slickStrength(h), rr = this.slickRadius(h), age = h.t - SLICK_FLIGHT;
        const edge = (sc: number, wob: number) => {
          const pts: Phaser.Geom.Point[] = [];
          for (let i = 0; i < 18; i++) {
            const a = (i / 18) * Math.PI * 2, k = sc * (1 + Math.sin(a * 3 + h.seed + t * 0.8) * wob + Math.sin(a * 5 - t * 1.1) * wob * 0.5);
            pts.push(new Phaser.Geom.Point(x + Math.cos(a) * rr * k, y + Math.sin(a) * rr * 0.55 * k));
          }
          return pts;
        };
        g.fillStyle(0x1a3a0e, 0.45 * st); g.fillPoints(edge(1, 0.08), true, true);
        g.fillStyle(0x3a7a1a, 0.45 * st); g.fillPoints(edge(0.78, 0.07), true, true);
        g.fillStyle(0x6ab82a, 0.35 * st); g.fillPoints(edge(0.5, 0.06), true, true);
        for (const [sc, c] of [[0.95, 0xc8ff6a], [0.85, 0xb88aff], [0.68, 0xffe86a]] as const) {
          g.lineStyle(1.5, c, 0.35 * st); g.strokePoints(edge(sc, 0.08), true, true);
        }
        for (let i = 0; i < 6; i++) {
          const k = (t * 0.9 + i / 6 + h.seed * 0.01) % 1, a = i * 1.9 + h.seed;
          const bx = x + Math.cos(a) * rr * 0.55 * ((i % 3) / 3 + 0.2), by = y + Math.sin(a) * rr * 0.3 * ((i % 3) / 3 + 0.2);
          if (k < 0.8) { g.lineStyle(1, 0xc8ff8a, 0.7 * st); g.strokeCircle(bx, by, 1.5 + k * 3); }
          else { g.lineStyle(1, 0xe8ffc0, 0.6 * st * (1 - (k - 0.8) / 0.2)); g.strokeCircle(bx, by, 6 + (k - 0.8) * 30); }
        }
        g.fillStyle(0xffffff, 0.25 * st); g.fillEllipse(x - rr * 0.3, y - rr * 0.12, rr * 0.5, rr * 0.08);
        if (age < 0.5) {
          // The splash: a crown of venom thrown up and falling back.
          const k = age / 0.5;
          for (let i = 0; i < 10; i++) {
            const a = (i / 10) * Math.PI * 2, d = 10 + k * rr * 0.6;
            g.fillStyle(0x9af05a, 0.9 * (1 - k)); g.fillCircle(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.5 - Math.sin(k * Math.PI) * 26, 3 - k * 1.5);
          }
          g.lineStyle(3 * (1 - k) + 1, 0xc8ff8a, 0.8 * (1 - k)); g.strokeEllipse(x, y, rr * 2 * k, rr * 1.1 * k);
        }
        break;
      }
      case 'die': {
        if (h.t < 0) break;
        const pipsAt = (cx: number, cy: number, half: number, n: number, ang: number, col: number) => {
          const q = half * 0.52, pr = Math.max(1.6, half * 0.17), ca = Math.cos(ang), sa = Math.sin(ang);
          for (const [u, v] of PIPS[Math.max(1, Math.min(6, n))]) {
            const px = cx + (u * ca - v * sa) * q, py = cy + (u * sa + v * ca) * q;
            g.fillStyle(col, 1); g.fillCircle(px, py, n === 1 ? pr * 1.5 : pr);
            g.fillStyle(0xffffff, 0.3); g.fillCircle(px - pr * 0.3, py - pr * 0.3, pr * 0.35);
          }
        };
        const face = (cx: number, cy: number, half: number, ang: number, top: number, side: number) => {
          const corner = (k: number, s: number) => {
            const a = ang + Math.PI / 4 + k * (Math.PI / 2);
            return [cx + Math.cos(a) * half * Math.SQRT2 * s, cy + Math.sin(a) * half * Math.SQRT2 * s] as const;
          };
          const c = [0, 1, 2, 3].map((k) => corner(k, 1));
          g.fillStyle(side, 1);
          g.fillTriangle(c[0][0] + 3, c[0][1] + 5, c[1][0] + 3, c[1][1] + 5, c[2][0] + 3, c[2][1] + 5);
          g.fillTriangle(c[0][0] + 3, c[0][1] + 5, c[2][0] + 3, c[2][1] + 5, c[3][0] + 3, c[3][1] + 5);
          g.fillStyle(top, 1); g.fillTriangle(c[0][0], c[0][1], c[1][0], c[1][1], c[2][0], c[2][1]); g.fillTriangle(c[0][0], c[0][1], c[2][0], c[2][1], c[3][0], c[3][1]);
          const inner = [0, 1, 2, 3].map((k) => corner(k, 0.84));
          g.fillStyle(0xfffaf0, 0.55); g.fillTriangle(inner[2][0], inner[2][1], inner[3][0], inner[3][1], cx + (inner[2][0] + inner[3][0] - 2 * cx) * 0.35, cy + (inner[2][1] + inner[3][1] - 2 * cy) * 0.35);
          g.lineStyle(1.2, 0x8a7a60, 0.9); g.strokePoints(c.map(([px, py]) => new Phaser.Geom.Point(px, py)), true, true);
        };
        const half = r * 0.82;
        if (h.t < DIE_ROLL) {
          // Tumbling in: it bounds across the water spinning end over end, a splash at each bounce,
          // its shadow skating under it and a faint ring already marking where it will burst.
          const k = h.t / DIE_ROLL, at = this.dieAt(h), dir = Math.sign(h.x - h.seed) || 1;
          g.lineStyle(1.5, 0xffe8b0, 0.15 + k * 0.25); g.strokeEllipse(x, y, DIE_RING * 2, DIE_RING * 1.4);
          g.fillStyle(0x000000, 0.25); g.fillEllipse(at.x + 3, y + 8, r * 2.2 * (0.7 + 0.3 * (1 - (y - at.y) / 22)), r * 0.8);
          for (let i = 1; i <= 3; i++) {
            const kk = i / 3;
            if (k < kk) continue;
            const bx = Phaser.Math.Linear(h.seed, h.x, 1 - (1 - kk) * (1 - kk)), age = (k - kk) * DIE_ROLL;
            if (age < 0.35) { g.lineStyle(2, 0xe8f6ff, 0.7 * (1 - age / 0.35)); g.strokeEllipse(bx, y + 4, 20 + age * 90, 6 + age * 26); }
          }
          const spin = (1 - k) * Math.PI * 3 * dir;
          face(at.x, at.y, half, spin, 0xf4ecd8, 0xb8ac90);
          pipsAt(at.x, at.y, half, 1 + (Math.floor(k * 9) % 6), spin, 0x1a1418);
          break;
        }
        // Landed: a die riding the swell, the count of pips on its face ticking down, a warning ring of
        // spray on the water round it that pulses faster and reddens as the count runs out.
        const left = Math.max(1, h.armed ?? 1), urgent = 1 - left / Math.max(1, h.maxHp);
        const bob = Math.sin(t * 3 + h.seed) * 1.5, tilt = Math.sin(t * 1.4 + h.seed) * 0.06;
        const pulse = 0.5 + 0.5 * Math.sin(t * (4 + urgent * 10));
        const ringC = left <= 1 ? 0xff5a3a : 0xffe8b0;
        g.fillStyle(ringC, 0.04 + urgent * 0.06 * pulse); g.fillEllipse(x, y, DIE_RING * 2, DIE_RING * 1.4);
        g.lineStyle(2, ringC, 0.35 + 0.4 * pulse);
        for (let s = 0; s < 16; s++) {
          const a0 = t * 0.6 + s * (Math.PI / 8);
          g.beginPath(); g.arc(x, y, DIE_RING, a0, a0 + Math.PI / 14, false); g.strokePath();
        }
        g.fillStyle(0xffffff, 0.22); g.fillEllipse(x, y + half + 4, half * 3, half * 0.8);
        for (let i = 0; i < 6; i++) { const k = (t * 1.2 + i / 6) % 1, a = i * 1.05 + h.seed; g.fillStyle(0xe8f6ff, 0.5 * (1 - k)); g.fillCircle(x + Math.cos(a) * (half * 1.3 + k * 10), y + bob + Math.sin(a) * (half * 0.8 + k * 6), 1.6); }
        face(x, y + bob, half, tilt, 0xf4ecd8, 0xb8ac90);
        pipsAt(x, y + bob, half, left, tilt, left <= 1 ? 0xc81a2a : 0x1a1418);
        if ((h.tick ?? 0) > DIE_TICK - 0.12) { g.fillStyle(0xffffff, 0.5); g.fillCircle(x, y + bob, half * 1.1); }
        break;
      }
      case 'spout':
        g.fillStyle(0xd8f0ff, 0.5); g.fillCircle(x, y, r);
        for (let i = 0; i < 6; i++) { const k = ((t * 1.5 + i / 6) % 1); g.fillStyle(0xffffff, (1 - k) * 0.6); g.fillCircle(x + Math.sin(i * 2 + t) * 8, y - k * 40, 4 + k * 4); }
        break;
    }
  }

  /**
   * A hazard the Foghorn holds: a pale fermata (the musical "hold") hangs over it with three still,
   * unmoving ripple lines round it, fading as the hold runs out.
   */
  private drawHeld(g: Phaser.GameObjects.Graphics, h: Hazard, t: number): void {
    const a = Math.min(1, (h.held ?? 0) / 0.5);
    let fx = h.x, fy = h.y - h.r - 14;
    if (h.kind === 'ring') {
      const ang = Math.atan2(this.by - h.y, this.bx - h.x);
      fx = h.x + Math.cos(ang) * h.r; fy = h.y + Math.sin(ang) * h.r - 16;
    } else {
      for (let k = 0; k < 3; k++) { g.lineStyle(1, 0xe8dcb0, (0.35 - k * 0.1) * a); g.strokeEllipse(h.x, h.y, h.r * 2.4 + k * 12, h.r * 1.4 + k * 7); }
    }
    if (fy < -20 || fy > 680) return;
    const bob = Math.sin(t * 2) * 1;
    g.lineStyle(2.5, 0x1a1410, 0.5 * a); g.beginPath(); g.arc(fx + 1, fy + 1 + bob, 8, Math.PI, Math.PI * 2, false); g.strokePath();
    g.lineStyle(2.5, 0xf0e4c0, 0.9 * a); g.beginPath(); g.arc(fx, fy + bob, 8, Math.PI, Math.PI * 2, false); g.strokePath();
    g.fillStyle(0xf0e4c0, 0.9 * a); g.fillCircle(fx, fy - 2 + bob, 2);
  }

  /**
   * The Cantor: a humpback the size of a cathedral, seen from above with its head toward the boat —
   * slate-dark and knobbed with tubercles, long white pectoral fins rowing slow, flukes lifting with a
   * ragged trailing edge, bronze bells barnacled over its hide, a rank of organ pipes standing on its
   * back and its throat-pleats ribbed like pipes along the jaw. Before each note every pipe and pleat
   * glows from within; as it sounds the bells shake and the pipes breathe out rings of air.
   */
  private drawCantor(g: Phaser.GameObjects.Graphics, b: Beast, t: number): void {
    const { x, y } = b;
    const hide = 0x28323e, hideD = 0x161c24, hideL = 0x46566a, white = 0xd8dee4, bronze = 0xb8823a;
    const wind = b.attack ? Math.min(1, b.attackT / 0.8) : 0;
    const after = b.attack && b.attackT > 0.8 ? Math.max(0, 1 - (b.attackT - 0.8) * 2.2) : 0;
    const glow = b.attack && b.attackT <= 0.8 ? wind * wind : after;
    const sung = after > 0 ? after : 0;
    const HEAD = 88, LEN = 192;
    const prof = CANTOR_PROFILE;
    const W = (s: number) => {
      for (let i = 1; i < prof.length; i++) if (s <= prof[i][0]) { const k = (s - prof[i - 1][0]) / (prof[i][0] - prof[i - 1][0]); return prof[i - 1][1] + (prof[i][1] - prof[i - 1][1]) * k; }
      return 11;
    };
    const sway = (s: number) => Math.sin(t * 1.1 - s * 2.4) * 5 * s;
    const Y = (s: number) => y + HEAD - s * LEN;
    const P = (s: number, side: number, k = 1) => new Phaser.Geom.Point(x + sway(s) + side * W(s) * k, Y(s));
    // Water: the wake round the body and its shadow beneath.
    g.fillStyle(0xffffff, 0.12); g.fillEllipse(x, y + 10, 200, 300);
    for (let i = 0; i < 3; i++) { const k = (t * 0.4 + i / 3) % 1; g.lineStyle(2, 0xe8f0ff, 0.25 * (1 - k)); g.strokeEllipse(x, y, 170 + k * 140, 260 + k * 90); }
    g.fillStyle(0x000000, 0.32); g.fillEllipse(x + 8, y + 10, 150, 250);
    // Flukes at the tail: two broad blades with a notch, the trailing edge ragged, white beneath.
    const ts = Y(1) - 4, wag = Math.sin(t * 1.1 - 2.4) * 10, lift = 0.75 + 0.25 * Math.sin(t * 1.1);
    for (const side of [-1, 1]) {
      const root = { x: x + sway(1) + wag * 0.3, y: ts }, tip = { x: x + wag + side * 70, y: ts - 34 * lift + Math.abs(side * 4) };
      const back = { x: x + wag + side * 12, y: ts - 30 * lift };
      g.fillStyle(hideD, 1); g.fillTriangle(root.x, root.y + 2, tip.x + side * 2, tip.y - 2, back.x, back.y - 3);
      g.fillStyle(hide, 1); g.fillTriangle(root.x, root.y, tip.x, tip.y, back.x, back.y);
      g.fillStyle(white, 0.55); g.fillTriangle(root.x + side * 10, root.y - 10, tip.x - side * 10, tip.y + 3, back.x + side * 6, back.y + 2);
      for (let k = 1; k <= 5; k++) {
        const u = k / 6, ex = Phaser.Math.Linear(back.x, tip.x, u), ey = Phaser.Math.Linear(back.y, tip.y, u);
        g.fillStyle(hideD, 1); g.fillTriangle(ex - 3, ey + 1, ex + 3, ey + 1, ex + side * 1, ey - 4);
      }
    }
    // Pectoral fins: very long, knobbed along the leading edge, white with a dark trailing edge, rowing.
    for (const side of [-1, 1]) {
      const st = Math.sin(t * 0.9 + (side > 0 ? 0 : Math.PI)) * 0.18, s0 = 0.27;
      const rx = x + sway(s0) + side * W(s0) * 0.8, ry = Y(s0);
      const len = 108, tipX = rx + side * len * Math.cos(0.55 - st), tipY = ry - len * Math.sin(0.55 - st) * 0.9;
      const lead0 = { x: rx, y: ry + 12 }, trail0 = { x: rx - side * 2, y: ry - 14 };
      g.fillStyle(hideD, 1); g.fillTriangle(lead0.x, lead0.y + 2, trail0.x, trail0.y - 2, tipX + side * 3, tipY);
      g.fillStyle(white, 1); g.fillTriangle(lead0.x, lead0.y, trail0.x, trail0.y, tipX, tipY);
      g.fillStyle(hide, 0.8); g.fillTriangle(trail0.x, trail0.y, Phaser.Math.Linear(trail0.x, tipX, 0.6), Phaser.Math.Linear(trail0.y, tipY, 0.6) - 2, Phaser.Math.Linear(lead0.x, tipX, 0.35), Phaser.Math.Linear(lead0.y, tipY, 0.35) - 3);
      for (let k = 1; k <= 6; k++) {
        const u = k / 7, kx = Phaser.Math.Linear(lead0.x, tipX, u), ky = Phaser.Math.Linear(lead0.y, tipY, u);
        g.fillStyle(0xeef2f4, 1); g.fillCircle(kx, ky + 1, 3.2 - u * 1.6);
        g.fillStyle(0x9aa4ac, 0.8); g.fillCircle(kx + 0.8, ky + 2, 1);
      }
      g.fillStyle(0xffffff, 0.15 * (0.5 + 0.5 * Math.sin(t * 0.9))); g.fillEllipse(tipX, tipY + 6, 30, 9);
    }
    // The body: outline, hide, a paler flank line and the darker spine.
    const outline: Phaser.Geom.Point[] = [], body: Phaser.Geom.Point[] = [], spine: Phaser.Geom.Point[] = [];
    for (let i = 0; i <= 16; i++) outline.push(P(i / 16, -1, 1.05));
    for (let i = 16; i >= 0; i--) outline.push(P(i / 16, 1, 1.05));
    for (let i = 0; i <= 16; i++) body.push(P(i / 16, -1));
    for (let i = 16; i >= 0; i--) body.push(P(i / 16, 1));
    for (let i = 1; i <= 15; i++) spine.push(P(i / 16, -1, 0.32));
    for (let i = 15; i >= 1; i--) spine.push(P(i / 16, 1, 0.32));
    g.fillStyle(hideD, 1); g.fillPoints(outline, true, true);
    g.fillStyle(hide, 1); g.fillPoints(body, true, true);
    g.fillStyle(hideD, 0.6); g.fillPoints(spine, true, true);
    g.fillStyle(hideL, 0.45); for (let i = 2; i < 14; i++) { const p = P(i / 16, -1, 0.7); g.fillEllipse(p.x, p.y, 8, 12); }
    // Throat pleats down both sides of the jaw, ribbed like organ pipes — they glow before each note.
    for (const side of [-1, 1]) {
      for (let k = 0; k < 6; k++) {
        const kk = 0.74 + k * 0.05;
        const a0 = P(0.04, side, kk * 0.9), a1 = P(0.34, side, kk);
        g.lineStyle(2.4, k % 2 ? 0x6a7a88 : 0x8a9aa8, 1); g.lineBetween(a0.x, a0.y, a1.x, a1.y);
        if (glow > 0) { g.lineStyle(1.4, 0xffe8a0, glow * (0.6 + 0.4 * Math.sin(t * 20 + k))); g.lineBetween(a0.x, a0.y, a1.x, a1.y); }
        const m = P(0.08 + (k % 3) * 0.02, side, kk * 0.92);
        g.fillStyle(glow > 0 ? 0xfff0b0 : 0x0e1218, glow > 0 ? 0.4 + glow * 0.6 : 0.8); g.fillEllipse(m.x, m.y, 2.6, 4);
      }
      if (glow > 0) { const c = P(0.18, side, 0.95); g.fillStyle(0xffd870, 0.12 * glow); g.fillEllipse(c.x, c.y, 30, 70); }
    }
    // Tubercles: rows of knobs over the rostrum.
    for (let row = 0; row < 3; row++) for (let k = -2; k <= 2; k++) {
      const s = 0.03 + row * 0.05, p = P(s, k / 2.6, 0.75);
      g.fillStyle(hideD, 1); g.fillCircle(p.x + 0.6, p.y + 0.8, 2.4); g.fillStyle(hideL, 1); g.fillCircle(p.x, p.y, 2);
    }
    // Blowholes, and a spout every few seconds drifting off on the wind.
    const bh = P(0.22, 0);
    for (const d of [-1, 1]) { g.fillStyle(0x0a0e12, 1); g.fillEllipse(bh.x + d * 3.5, bh.y, 3, 7); }
    const sp = (t % 6.5) / 6.5;
    if (sp < 0.22) {
      const k = sp / 0.22;
      for (let i = 0; i < 8; i++) { const a = -Math.PI / 2 + (i - 3.5) * 0.18; g.fillStyle(0xe8f4ff, 0.5 * (1 - k)); g.fillCircle(bh.x + Math.cos(a) * k * 30 + k * 10, bh.y + Math.sin(a) * k * 34, 3 + k * 6); }
    }
    // Eyes at the corners of the jaw.
    for (const side of [-1, 1]) {
      const e = P(0.16, side, 0.92);
      g.fillStyle(0xc8d0d8, 1); g.fillEllipse(e.x, e.y, 7, 5); g.fillStyle(0x0a0a0e, 1); g.fillCircle(e.x, e.y + 0.5, 1.8); g.fillStyle(0xffffff, 0.8); g.fillCircle(e.x - 0.8, e.y - 0.4, 0.7);
    }
    // White barnacle clusters.
    for (const [s, k] of [[0.06, -0.5], [0.1, 0.6], [0.3, -0.85], [0.47, 0.82], [0.62, -0.6], [0.8, 0.4]] as const) {
      const p = P(s, k);
      for (let j = 0; j < 4; j++) { const bx = p.x + Math.cos(j * 1.7) * 3.5, by = p.y + Math.sin(j * 1.7) * 3; g.fillStyle(0xd8d0c0, 1); g.fillCircle(bx, by, 2); g.fillStyle(0x4a4438, 1); g.fillCircle(bx, by, 0.7); }
    }
    // Bronze bells barnacled over the hide: domed, a lip, a dark mouth and a clapper; they shake when it sings.
    for (const [s, k, sz] of [[0.12, -0.7, 7], [0.24, 0.72, 8], [0.42, -0.78, 9], [0.52, 0.66, 7], [0.68, -0.5, 6], [0.72, 0.5, 6], [0.35, 0.3, 5]] as const) {
      const p = P(s, k), sh = sung > 0 ? Math.sin(t * 40 + s * 30) * 1.6 * sung : Math.sin(t * 1.5 + s * 9) * 0.4;
      const bx = p.x + sh, by = p.y;
      g.fillStyle(0x000000, 0.3); g.fillEllipse(bx + 1.5, by + 2, sz * 1.5, sz * 0.7);
      g.fillStyle(0x4a2c12, 1); g.fillTriangle(bx - sz * 0.75, by + sz * 0.45, bx + sz * 0.75, by + sz * 0.45, bx, by - sz * 0.75);
      g.fillStyle(bronze, 1); g.fillEllipse(bx, by - sz * 0.2, sz * 0.9, sz * 1.0); g.fillTriangle(bx - sz * 0.68, by + sz * 0.4, bx + sz * 0.68, by + sz * 0.4, bx, by - sz * 0.45);
      g.fillStyle(0xe8c070, 0.8); g.fillEllipse(bx - sz * 0.2, by - sz * 0.35, sz * 0.25, sz * 0.4);
      g.fillStyle(0x5aa88a, 0.5); g.fillCircle(bx + sz * 0.22, by + sz * 0.05, sz * 0.14);
      g.fillStyle(0x1a0e06, 1); g.fillEllipse(bx, by + sz * 0.42, sz * 1.3, sz * 0.3);
      g.fillStyle(0x2a2420, 1); g.fillCircle(bx + sh * 0.6, by + sz * 0.55, sz * 0.13);
      g.lineStyle(1.2, 0x3a2410, 1); g.strokeEllipse(bx, by - sz * 0.78, sz * 0.35, sz * 0.25);
      if (sung > 0.3) { g.lineStyle(1, 0xf0dca0, sung * 0.6); g.strokeCircle(bx, by, sz * (1.4 + (1 - sung) * 1.5)); }
    }
    // The organ on its back: a rank of pipes standing up from the spine, tallest in the middle; their
    // mouths glow before each note and breathe rings of air as it sounds.
    const base = P(0.44, 0);
    const n = 7;
    for (let i = 0; i < n; i++) {
      const off = i - (n - 1) / 2, px = base.x + off * 9, pb = base.y + Math.abs(off) * 3 + 8;
      const ph = 26 + (3 - Math.abs(off)) * 9, top = pb - ph, hw = 3.4;
      g.fillStyle(0x000000, 0.3); g.fillRect(px - hw + 3, pb - 2, hw * 2, 5);
      g.fillStyle(0x3a3a44, 1); g.fillRect(px - hw - 1, top - 1, hw * 2 + 2, ph + 1);
      g.fillStyle(0xb8bcc8, 1); g.fillRect(px - hw, top, hw * 2, ph);
      g.fillStyle(0x7a7e8a, 1); g.fillRect(px + hw * 0.3, top, hw * 0.7, ph);
      g.fillStyle(0xf0f2f8, 0.8); g.fillRect(px - hw * 0.6, top + 2, 1.2, ph - 6);
      g.fillStyle(0x8a8e9a, 1); g.fillEllipse(px, top, hw * 2.2, 2.6);
      g.fillStyle(0x14141a, 1); g.fillEllipse(px, top, hw * 1.4, 1.4);
      const my = pb - 9;
      g.fillStyle(glow > 0 ? 0xfff0b0 : 0x14141a, 1); g.fillRect(px - hw * 0.6, my, hw * 1.2, 3.4);
      g.fillStyle(0x5a5e6a, 1); g.fillTriangle(px - hw * 0.6, my + 3.4, px + hw * 0.6, my + 3.4, px, my + 6);
      if (glow > 0) {
        g.fillStyle(0xffd870, 0.25 * glow); g.fillCircle(px, my + 1.5, 6 + glow * 3);
        g.fillStyle(0xfff4c8, 0.2 * glow); g.fillRect(px - hw, top, hw * 2, ph);
      }
      if (sung > 0) {
        for (let k = 0; k < 2; k++) { const q = ((1 - sung) + k * 0.4) % 1; g.lineStyle(1.2, 0xf4ecd0, 0.5 * (1 - q)); g.strokeEllipse(px, top - q * 18, 6 + q * 16, 3 + q * 7); }
      }
    }
    g.fillStyle(0x4a2c18, 1); g.fillRect(base.x - 34, base.y + 6 + 8, 68, 5);
    g.fillStyle(bronze, 1); g.fillRect(base.x - 34, base.y + 6 + 8, 68, 1.5);
    if (wind > 0 && b.attack === 'wave') { g.lineStyle(2, 0xffe8a0, 0.4 * wind); g.strokeEllipse(x, y, 150 + wind * 20, 260 + wind * 20); }
    if (b.attack === 'slam') { g.lineStyle(3, 0xf0dca0, 0.6); g.strokeCircle(this.bx, this.by - 20, 60 + Math.sin(t * 20) * 6); }
    if (b.phase === 'fight') {
      g.fillStyle(0x000000, 0.6); g.fillRect(280, 70, 400, 12);
      g.fillStyle(BEASTS.cantor.bar, 1); g.fillRect(282, 72, 396 * Math.max(0, b.hp / b.maxHp), 8);
    }
  }

  /**
   * The Lensback: a sea turtle the size of a harbour, seen from above with its head toward the boat.
   * Its shell is a dome of leaded glass — a hexagonal crown pane, a ring of six and a ring of twelve,
   * each pane faintly tinted and held in dark lead, the old turtle's ribs showing through as shadows —
   * set in a riveted rim of verdigrised bronze marginal plates crusted with barnacles. Long front
   * flippers row slow; a beaked, plated head sways out in front. The dome sways a little to keep the
   * sun; before it burns it tilts toward the boat, the sun gathers in a white-hot point on the glass and
   * the whole dome lights up from within.
   */
  private drawLensback(g: Phaser.GameObjects.Graphics, b: Beast, t: number): void {
    const { x, y } = b;
    const hide = 0x5a6a52, hideD = 0x34402e, hideL = 0x8a9a78, lead = 0x22262c, bronze = 0x8a7040, verd = 0x5aa88a;
    const wind = b.attack === 'wave' ? Math.min(1, b.attackT / 0.8) : 0;
    const after = b.attack === 'wave' && b.attackT > 0.8 ? Math.max(0, 1 - (b.attackT - 0.8) * 1.4) : 0;
    const glow = b.attack === 'wave' ? (b.attackT <= 0.8 ? wind * wind : after) : b.attack === 'spit' ? Math.max(0, Math.sin(Math.min(1, b.attackT / 0.8) * Math.PI)) * 0.5 : 0;
    const RX = 104, RY = 90, cx = x, cy = y - 8;
    const toB = Math.atan2(this.by - cy, this.bx - cx);
    const tiltK = 0.25 + 0.75 * Math.max(wind, after);
    const tx = Math.cos(toB) * tiltK * 0.6 + Math.sin(t * 0.5) * 0.25 * (1 - tiltK), ty = Math.sin(toB) * tiltK * 0.6 + Math.cos(t * 0.37) * 0.15 * (1 - tiltK);
    const D = (a: number, rr: number) => {
      const bulge = (1 - rr * rr) * 14;
      return new Phaser.Geom.Point(cx + Math.cos(a) * rr * RX + tx * bulge, cy + Math.sin(a) * rr * RY + ty * bulge - (1 - rr * rr) * 6);
    };
    // Water: a broad wake, the shadow, ripples, and the dome's glare dancing on the sea beside it.
    g.fillStyle(0xffffff, 0.1); g.fillEllipse(x, y + 10, 330, 290);
    for (let i = 0; i < 3; i++) { const k = (t * 0.35 + i / 3) % 1; g.lineStyle(2, 0xe8f4ff, 0.22 * (1 - k)); g.strokeEllipse(x, y + 6, 250 + k * 160, 220 + k * 110); }
    g.fillStyle(0x000000, 0.32); g.fillEllipse(x + 10, y + 14, 230, 210);
    for (let i = 0; i < 5; i++) {
      const a = t * 0.3 + i * 1.26, gx = x + Math.cos(a) * 150, gy = y + Math.sin(a) * 120, sp = 0.5 + 0.5 * Math.sin(t * 3 + i * 2);
      g.fillStyle(0xfff8e0, 0.12 * sp + 0.2 * glow); g.fillEllipse(gx, gy, 26, 7);
      g.fillStyle(0xffffff, 0.35 * sp); g.fillEllipse(gx, gy, 8, 2);
    }
    // Flippers: long front paddles rowing, short rear ones; leading edges scaled, a claw or two.
    const flipper = (side: number, sx: number, sy: number, len: number, ang: number, w: number) => {
      const dx = side * Math.cos(ang), dy = Math.sin(ang), nx = dy * side, ny = -dx * side;
      const P = (u: number, v: number) => new Phaser.Geom.Point(sx + dx * len * u + nx * w * v, sy + dy * len * u + ny * w * v);
      const out = [P(0, -1.1), P(0.45, -0.95), P(0.85, -0.45), P(1.04, 0), P(0.6, 0.6), P(0.2, 0.75), P(0, 0.75)];
      const inn = [P(0.02, -0.9), P(0.45, -0.78), P(0.83, -0.36), P(0.98, 0), P(0.58, 0.48), P(0.2, 0.6), P(0.02, 0.6)];
      g.fillStyle(hideD, 1); g.fillPoints(out, true, true);
      g.fillStyle(hide, 1); g.fillPoints(inn, true, true);
      g.fillStyle(hideL, 0.5); g.fillPoints([P(0.05, -0.75), P(0.45, -0.65), P(0.8, -0.3), P(0.45, -0.3), P(0.05, -0.2)], true, true);
      for (let k = 1; k <= 7; k++) {
        const u = k / 8, p = P(u, -0.82 + u * 0.55);
        g.fillStyle(hideD, 1); g.fillEllipse(p.x + 0.6, p.y + 0.8, 7 - u * 3, 5 - u * 2);
        g.fillStyle(hideL, 1); g.fillEllipse(p.x, p.y, 6 - u * 3, 4 - u * 2);
      }
      for (let k = 1; k <= 4; k++) { const p = P(0.2 + k * 0.15, 0.15); g.fillStyle(hideD, 0.6); g.fillEllipse(p.x, p.y, 5, 3.5); }
      for (const u of [0.4, 0.55]) { const p = P(u, -1.0); g.fillStyle(0xd8ccb0, 1); g.fillCircle(p.x, p.y, 1.8); }
    };
    const row = Math.sin(t * 0.85) * 0.38;
    for (const side of [-1, 1]) {
      flipper(side, cx + side * 72, cy - RY * 0.62, 46, -0.85 - Math.sin(t * 0.85 + 1) * 0.2, 13);
      flipper(side, cx + side * 78, cy + RY * 0.42, 120, 0.15 + row, 22);
      const tip = { x: cx + side * (78 + Math.cos(0.15 + row) * 124), y: cy + RY * 0.42 + Math.sin(0.15 + row) * 124 };
      g.fillStyle(0xffffff, 0.14 * (0.5 + 0.5 * Math.sin(t * 0.85))); g.fillEllipse(tip.x, tip.y + 4, 34, 10);
    }
    // Tail.
    const tw = Math.sin(t * 1.1) * 5;
    g.fillStyle(hideD, 1); g.fillTriangle(cx - 12, cy - RY * 0.9, cx + 12, cy - RY * 0.9, cx + tw, cy - RY - 30);
    g.fillStyle(hide, 1); g.fillTriangle(cx - 9, cy - RY * 0.9, cx + 9, cy - RY * 0.9, cx + tw, cy - RY - 26);
    // Head and neck, out in front toward the boat.
    const sway = Math.sin(t * 0.7) * 8, gape = b.attack === 'spit' ? Math.max(0, Math.sin(Math.min(1, b.attackT / 0.8) * Math.PI)) : 0;
    const hx = cx + sway, hy = cy + RY + 34;
    g.fillStyle(hideD, 1); g.fillEllipse(cx + sway * 0.4, cy + RY * 0.92, 54, 40);
    g.fillStyle(hide, 1); g.fillEllipse(cx + sway * 0.4, cy + RY * 0.92, 48, 34);
    for (let k = 0; k < 4; k++) { g.lineStyle(1.5, hideD, 0.7); g.beginPath(); g.arc(cx + sway * 0.45, cy + RY * 0.88 + k * 6, 20 - k * 2, Math.PI * 0.2, Math.PI * 0.8, false); g.strokePath(); }
    g.fillStyle(hideD, 1); g.fillEllipse(hx, hy, 50, 54);
    g.fillStyle(hide, 1); g.fillEllipse(hx, hy - 1, 45, 49);
    g.fillStyle(hideD, 1); g.fillTriangle(hx - 15, hy + 16, hx + 15, hy + 16, hx, hy + 36);
    g.fillStyle(0x9a9478, 1); g.fillTriangle(hx - 12, hy + 16, hx + 12, hy + 16, hx, hy + 33);
    g.fillStyle(0xd8d0b0, 0.7); g.fillTriangle(hx - 8, hy + 17, hx - 1, hy + 17, hx - 1, hy + 30);
    if (gape > 0) { g.fillStyle(0x1a0e0a, 1); g.fillEllipse(hx, hy + 19, 22, 4 + gape * 8); g.fillStyle(0xfff4c8, 0.6 * gape); g.fillEllipse(hx, hy + 19, 12, 2 + gape * 5); }
    // Head scutes: a mosaic of plates.
    const plates: [number, number, number, number][] = [[0, -12, 14, 11], [-11, -2, 11, 10], [11, -2, 11, 10], [0, 2, 12, 10], [-7, 10, 9, 7], [7, 10, 9, 7], [-15, -13, 8, 8], [15, -13, 8, 8]];
    for (const [ox, oy, w, h] of plates) {
      g.fillStyle(hideD, 1); g.fillEllipse(hx + ox + 0.5, hy + oy + 0.8, w + 1, h + 1);
      g.fillStyle(hideL, 0.9); g.fillEllipse(hx + ox, hy + oy, w, h);
      g.fillStyle(0xffffff, 0.15); g.fillEllipse(hx + ox - w * 0.18, hy + oy - h * 0.2, w * 0.45, h * 0.3);
    }
    for (const side of [-1, 1]) {
      const ex = hx + side * 20, ey = hy + 6;
      g.fillStyle(hideD, 1); g.fillEllipse(ex, ey, 12, 10);
      g.fillStyle(0x1a1408, 1); g.fillEllipse(ex, ey + 0.5, 8, 6);
      g.fillStyle(0xffd860, 0.6 + 0.4 * glow); g.fillCircle(ex + side * 0.5, ey + 0.5, 2.4);
      g.fillStyle(0x000000, 1); g.fillEllipse(ex + side * 0.5, ey + 0.5, 1, 3.4);
      g.fillStyle(0xffffff, 0.8); g.fillCircle(ex - side * 1.5, ey - 1, 0.9);
      g.fillStyle(hide, 1); g.fillEllipse(ex, ey - 4, 13, 4);
    }
    // The dome. First the rim of bronze marginal plates, then the glass interior.
    const rim: Phaser.Geom.Point[] = [], rimIn: Phaser.Geom.Point[] = [];
    for (let i = 0; i < 48; i++) { const a = (i / 48) * Math.PI * 2; rim.push(new Phaser.Geom.Point(cx + Math.cos(a) * (RX + 6), cy + Math.sin(a) * (RY + 6))); }
    g.fillStyle(0x1a1a16, 1); g.fillPoints(rim, true, true);
    for (let i = 0; i < 24; i++) {
      const a0 = (i / 24) * Math.PI * 2, a1 = ((i + 1) / 24) * Math.PI * 2, am = (a0 + a1) / 2;
      const pts = [D(a0, 0.86), D(a1, 0.86),
        new Phaser.Geom.Point(cx + Math.cos(a1) * (RX + 4), cy + Math.sin(a1) * (RY + 4)),
        new Phaser.Geom.Point(cx + Math.cos(am) * (RX + 7), cy + Math.sin(am) * (RY + 7)),
        new Phaser.Geom.Point(cx + Math.cos(a0) * (RX + 4), cy + Math.sin(a0) * (RY + 4))];
      const lightSide = Math.max(0, -Math.cos(am - 3.9));
      g.fillStyle(i % 2 ? bronze : 0x9a8050, 1); g.fillPoints(pts, true, true);
      g.fillStyle(0xffe8b0, 0.25 * lightSide); g.fillPoints(pts, true, true);
      g.lineStyle(1, 0x3a2a14, 0.9); g.strokePoints(pts, true, true);
      const rv = new Phaser.Geom.Point(cx + Math.cos(am) * (RX + 1), cy + Math.sin(am) * (RY + 1));
      g.fillStyle(0x3a2a14, 1); g.fillCircle(rv.x, rv.y, 1.6); g.fillStyle(0xf0d898, 0.8); g.fillCircle(rv.x - 0.4, rv.y - 0.4, 0.7);
      if (i % 3 === 1) { g.fillStyle(verd, 0.55); g.fillEllipse(rv.x + Math.cos(am) * -4, rv.y + Math.sin(am) * -4, 7, 4); }
    }
    for (let i = 0; i < 36; i++) { const a = (i / 36) * Math.PI * 2; rimIn.push(D(a, 0.86)); }
    const inner = Phaser.Display.Color.Interpolate.ColorWithColor(Phaser.Display.Color.ValueToColor(0x1a2a30), Phaser.Display.Color.ValueToColor(0xfff0b0), 100, glow * 100);
    g.fillStyle(Phaser.Display.Color.GetColor(inner.r, inner.g, inner.b), 1); g.fillPoints(rimIn, true, true);
    // The turtle beneath, seen through the glass: spine and rib shadows.
    g.lineStyle(5, 0x0e161a, 0.45 * (1 - glow * 0.6));
    { const s0 = D(-Math.PI / 2, 0.8), s1 = D(Math.PI / 2, 0.8); g.lineBetween(s0.x, s0.y, s1.x, s1.y); }
    g.lineStyle(3, 0x0e161a, 0.35 * (1 - glow * 0.6));
    for (let k = -3; k <= 3; k++) for (const side of [-1, 1]) {
      const p0 = D(Math.PI / 2 + k * 0.32, 0.1), a = side > 0 ? k * 0.32 : Math.PI - k * 0.32, p1 = D(a, 0.78);
      g.lineBetween(p0.x, p0.y, p1.x, p1.y);
    }
    // Glass panes: a crown hexagon, a ring of six, a ring of twelve.
    const tints = [0xd8f0f0, 0xc8e4f4, 0xf2e8c8, 0xdcf2dc, 0xf4e0c8, 0xd0dcf4, 0xe8f4f8];
    const hlA = t * 0.12 + 3.9;
    const cells: { pts: Phaser.Geom.Point[]; a: number; rr: number; tint: number }[] = [];
    const hex: Phaser.Geom.Point[] = []; for (let k = 0; k < 6; k++) hex.push(D(k * Math.PI / 3, 0.28));
    cells.push({ pts: hex, a: 0, rr: 0, tint: tints[6] });
    for (let k = 0; k < 6; k++) {
      const a0 = k * Math.PI / 3, pts = [D(a0, 0.28), D(a0 + Math.PI / 3, 0.28)];
      for (let j = 4; j >= 0; j--) pts.push(D(a0 + j * Math.PI / 12, 0.58));
      cells.push({ pts, a: a0 + Math.PI / 6, rr: 0.43, tint: tints[k % 6] });
    }
    for (let k = 0; k < 12; k++) {
      const a0 = k * Math.PI / 6 + Math.PI / 12, pts: Phaser.Geom.Point[] = [];
      for (let j = 0; j <= 2; j++) pts.push(D(a0 + j * Math.PI / 12, 0.58));
      for (let j = 2; j >= 0; j--) pts.push(D(a0 + j * Math.PI / 12, 0.86));
      cells.push({ pts, a: a0 + Math.PI / 12, rr: 0.72, tint: tints[(k * 5 + 2) % 6] });
    }
    for (const c of cells) {
      const face = c.rr === 0 ? 0.6 : Math.max(0, Math.cos(c.a - hlA)) * c.rr + Math.max(0, Math.cos(c.a - toB)) * glow * 0.6;
      g.fillStyle(c.tint, 0.5 + glow * 0.2); g.fillPoints(c.pts, true, true);
      if (face > 0.05) { g.fillStyle(0xffffff, Math.min(0.55, face * 0.45)); g.fillPoints(c.pts, true, true); }
      const p0 = c.pts[0], p1 = c.pts[c.pts.length - 1], mid = c.pts[Math.floor(c.pts.length / 2)];
      g.lineStyle(1, 0xffffff, 0.35); g.lineBetween(Phaser.Math.Linear(p0.x, mid.x, 0.2), Phaser.Math.Linear(p0.y, mid.y, 0.2), Phaser.Math.Linear(p1.x, mid.x, 0.5), Phaser.Math.Linear(p1.y, mid.y, 0.5));
    }
    for (const c of cells) { g.lineStyle(3, lead, 1); g.strokePoints(c.pts, true, true); }
    for (const c of cells) { g.lineStyle(1, 0x6a7078, 0.6); g.strokePoints(c.pts.map((p) => new Phaser.Geom.Point(p.x - 0.6, p.y - 0.6)), true, true); }
    // Solder knots where the leads meet.
    for (let k = 0; k < 6; k++) { const p = D(k * Math.PI / 3, 0.28); g.fillStyle(0x3a3e46, 1); g.fillCircle(p.x, p.y, 2.4); g.fillStyle(0x9aa0aa, 0.8); g.fillCircle(p.x - 0.6, p.y - 0.6, 0.9); }
    for (let k = 0; k < 12; k++) { const p = D(k * Math.PI / 6 + Math.PI / 12, 0.58); g.fillStyle(0x3a3e46, 1); g.fillCircle(p.x, p.y, 2.2); g.fillStyle(0x9aa0aa, 0.8); g.fillCircle(p.x - 0.5, p.y - 0.5, 0.8); }
    // The sun's reflection sliding over the dome, and its focal point when it means to burn.
    const sun = D(hlA, 0.55);
    g.fillStyle(0xffffff, 0.3); g.fillEllipse(sun.x, sun.y, 30, 16);
    g.fillStyle(0xffffff, 0.8); g.fillEllipse(sun.x, sun.y, 9, 5);
    { const s = 9 + Math.sin(t * 4) * 3; g.lineStyle(1, 0xffffff, 0.7); g.lineBetween(sun.x - s, sun.y, sun.x + s, sun.y); g.lineBetween(sun.x, sun.y - s * 0.7, sun.x, sun.y + s * 0.7); }
    if (glow > 0) {
      const f = D(toB, 0.4), fl = 0.85 + 0.15 * Math.sin(t * 30);
      g.fillStyle(0xfff0b0, 0.25 * glow); g.fillEllipse(cx, cy, RX * 2, RY * 2);
      g.fillStyle(0xffe890, 0.4 * glow * fl); g.fillCircle(f.x, f.y, 22 + glow * 14);
      g.fillStyle(0xffffff, 0.9 * glow); g.fillCircle(f.x, f.y, 6 + glow * 6);
      for (let k = 0; k < 8; k++) {
        const a = k * (Math.PI / 4) + t * 0.8, l = (16 + glow * 26) * (k % 2 ? 0.6 : 1);
        g.lineStyle(1.5, 0xffffff, 0.7 * glow); g.lineBetween(f.x, f.y, f.x + Math.cos(a) * l, f.y + Math.sin(a) * l * 0.8);
      }
    }
    // Barnacles crusting the rim.
    for (const [a, n] of [[0.4, 4], [1.9, 3], [2.8, 5], [3.7, 3], [4.6, 4], [5.6, 3]] as const) {
      const p = new Phaser.Geom.Point(cx + Math.cos(a) * (RX + 3), cy + Math.sin(a) * (RY + 3));
      for (let j = 0; j < n; j++) { const bx = p.x + Math.cos(j * 1.9 + a) * 4, by = p.y + Math.sin(j * 1.9 + a) * 3; g.fillStyle(0xd8d0c0, 1); g.fillCircle(bx, by, 2.1); g.fillStyle(0x4a4438, 1); g.fillCircle(bx, by, 0.8); }
    }
    if (b.attack === 'slam') { g.lineStyle(3, 0xfff0b0, 0.6); g.strokeCircle(this.bx, this.by - 20, 60 + Math.sin(t * 20) * 6); }
    if (b.phase === 'fight') {
      g.fillStyle(0x000000, 0.6); g.fillRect(280, 70, 400, 12);
      g.fillStyle(BEASTS.lensback.bar, 1); g.fillRect(282, 72, 396 * Math.max(0, b.hp / b.maxHp), 8);
    }
  }

  private drawLoot(g: Phaser.GameObjects.Graphics, l: Loot, t: number): void {
    const bob = Math.sin(t * 3 + l.x) * 2;
    if (l.kind === 'crate') { g.fillStyle(0x8a6a3a, 1); g.fillRect(l.x - 9, l.y - 9 + bob, 18, 18); g.lineStyle(2, 0x4a3218, 1); g.strokeRect(l.x - 9, l.y - 9 + bob, 18, 18); g.fillStyle(0xffd27a, 1); g.fillCircle(l.x, l.y + bob, 3); }
    if (l.kind === 'barrel') { g.fillStyle(0x6a4a2a, 1); g.fillEllipse(l.x, l.y + bob, 22, 14); g.fillStyle(0x9dffb0, 1); g.fillRect(l.x - 2, l.y - 5 + bob, 4, 10); g.fillRect(l.x - 5, l.y - 2 + bob, 10, 4); }
    if (l.kind === 'orb') { g.fillStyle(0xd0a8ff, 0.3); g.fillCircle(l.x, l.y + bob, 14); g.fillStyle(0xd0a8ff, 1); g.fillCircle(l.x, l.y + bob, 6); }
    if (l.kind === 'bottle') { g.fillStyle(0x7ac8a8, 0.9); g.fillRoundedRect(l.x - 4, l.y - 10 + bob, 8, 18, 3); g.fillStyle(0xe8dcc0, 1); g.fillRect(l.x - 2, l.y - 4 + bob, 4, 8); }
  }

  private drawBeast(g: Phaser.GameObjects.Graphics, b: Beast, t: number): void {
    const { x, y } = b;
    // Body under the surface
    g.fillStyle(0x000000, 0.3); g.fillEllipse(x, y + 40, 220, 70);
    g.fillStyle(0x3a1408, 1); g.fillEllipse(x, y, 180, 110);
    g.fillStyle(0x6a2410, 1); g.fillEllipse(x, y - 8, 150, 80);
    // Cracks of magma
    g.lineStyle(3, 0xff7a2a, 0.8 + Math.sin(t * 6) * 0.2);
    for (let i = 0; i < 5; i++) { const a = -0.9 + i * 0.45; g.lineBetween(x + Math.cos(a) * 30, y + Math.sin(a) * 20, x + Math.cos(a) * 80, y + Math.sin(a) * 40); }
    // Maw
    const open = b.attack === 'spit' ? Math.min(1, b.attackT * 2) : 0.2 + Math.sin(t * 2) * 0.1;
    g.fillStyle(0x1a0402, 1); g.fillEllipse(x, y + 30, 90, 20 + open * 40);
    g.fillStyle(0xff8a2a, 0.5 + open * 0.5); g.fillEllipse(x, y + 32, 60, 8 + open * 26);
    for (let i = -3; i <= 3; i++) { g.fillStyle(0xf2e6c8, 1); g.fillTriangle(x + i * 12 - 5, y + 22 - open * 18, x + i * 12 + 5, y + 22 - open * 18, x + i * 12, y + 34 - open * 10); }
    // Eyes
    g.fillStyle(0xffe08a, 1); g.fillCircle(x - 40, y - 24, 9); g.fillCircle(x + 40, y - 24, 9);
    g.fillStyle(0x1a0402, 1); g.fillEllipse(x - 40, y - 24, 3, 12); g.fillEllipse(x + 40, y - 24, 3, 12);
    if (b.attack === 'slam') { g.lineStyle(3, 0xff3a1a, 0.6); g.strokeCircle(this.bx, this.by - 20, 60 + Math.sin(t * 20) * 6); }
    // HP bar
    if (b.phase === 'fight') {
      g.fillStyle(0x000000, 0.6); g.fillRect(280, 70, 400, 12);
      g.fillStyle(0xff6a2a, 1); g.fillRect(282, 72, 396 * Math.max(0, b.hp / b.maxHp), 8);
    }
  }

  /** The shore rising over the horizon as a crossing nears its end. */
  private drawCoast(g: Phaser.GameObjects.Graphics, t: number): void {
    const W = this.scale.width;
    const k = Phaser.Math.Clamp(1 - (this.toLand() - 0) / (COAST_M + 200), 0, 1);
    const shore = -40 + k * 300;
    const land = this.crossing?.color ?? 0x8aa86a;
    g.fillStyle(0xe8d8a8, 1);
    g.beginPath(); g.moveTo(0, -10);
    for (let x = 0; x <= W; x += 32) g.lineTo(x, shore + Math.sin(x * 0.012 + 1.3) * 22);
    g.lineTo(W, -10); g.closePath(); g.fillPath();
    g.fillStyle(Phaser.Display.Color.ValueToColor(land).darken(35).color, 1);
    g.beginPath(); g.moveTo(0, -10);
    for (let x = 0; x <= W; x += 32) g.lineTo(x, shore - 34 + Math.sin(x * 0.009) * 28);
    g.lineTo(W, -10); g.closePath(); g.fillPath();
    for (let x = 0; x <= W; x += 40) {
      g.fillStyle(0xffffff, 0.5 + Math.sin(t * 3 + x) * 0.2);
      g.fillEllipse(x + Math.sin(t + x) * 6, shore + Math.sin(x * 0.012 + 1.3) * 22 + 6, 30, 5);
    }
  }

  /**
   * The Brambleback: a sea turtle the size of a hill, its shell grown over with a thorn forest
   * (trees, briars and a ruined shrine on top); a beaked head with mossy eyes pushes out in front.
   */
  private drawBrambleback(g: Phaser.GameObjects.Graphics, b: Beast, t: number): void {
    const { x, y } = b;
    const shell = 0x4a3a22, moss = 0x3a6a2a, leaf = 0x6aa83a;
    for (const side of [-1, 1]) {
      const sw = Math.sin(t * 1.6 + side) * 0.4;
      g.fillStyle(0x5a6a3a, 1); g.fillEllipse(x + side * 92, y + 20 + sw * 20, 70, 26);
    }
    g.fillStyle(0xffffff, 0.16); g.fillEllipse(x, y + 46, 230, 40);
    g.fillStyle(0x000000, 0.3); g.fillEllipse(x, y + 30, 210, 70);
    g.fillStyle(shell, 1); g.fillEllipse(x, y, 190, 116);
    g.lineStyle(2, 0x2a2014, 0.8);
    for (let i = -2; i <= 2; i++) g.strokeEllipse(x + i * 34, y - 4 + Math.abs(i) * 6, 40, 34);
    g.fillStyle(moss, 1); g.fillEllipse(x, y - 14, 150, 70);
    // The forest on its back.
    for (let i = 0; i < 9; i++) {
      const tx = x - 66 + i * 16.5, ty = y - 24 - Math.sin(i * 1.7) * 14;
      const sway = Math.sin(t * 1.1 + i) * 2;
      g.fillStyle(0x3a2a18, 1); g.fillRect(tx - 1.5, ty - 4, 3, 12);
      g.fillStyle(i % 2 ? leaf : 0x4a8a2e, 1); g.fillCircle(tx + sway, ty - 10, 9 + (i % 3) * 2);
    }
    g.fillStyle(0xb8b0a0, 1); g.fillRect(x - 8, y - 46, 16, 14); g.fillTriangle(x - 11, y - 46, x + 11, y - 46, x, y - 56);
    // Briars round the shell rim.
    g.lineStyle(2, 0x2a3a1a, 1);
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; g.lineBetween(x + Math.cos(a) * 92, y + Math.sin(a) * 56, x + Math.cos(a) * 104, y + Math.sin(a) * 64); }
    // Head, beak and mossy eyes.
    const open = b.attack === 'spit' ? Math.min(1, b.attackT * 2) : 0.1 + Math.sin(t * 2) * 0.06;
    const hy = y + 62;
    g.fillStyle(0x6a7a4a, 1); g.fillEllipse(x, hy, 70, 46);
    g.fillStyle(0x3a2a1a, 1); g.fillTriangle(x - 16, hy + 10, x + 16, hy + 10, x, hy + 26 + open * 6);
    g.fillStyle(0x1a1208, 1); g.fillEllipse(x, hy + 16, 28, 4 + open * 16);
    g.fillStyle(0xd8ff7a, 0.8 + Math.sin(t * 3) * 0.2); g.fillCircle(x - 20, hy - 6, 6); g.fillCircle(x + 20, hy - 6, 6);
    g.fillStyle(0x1a1208, 1); g.fillCircle(x - 20, hy - 6, 2.5); g.fillCircle(x + 20, hy - 6, 2.5);
    if (b.attack === 'slam') { g.lineStyle(3, 0x9ad84a, 0.6); g.strokeCircle(this.bx, this.by - 20, 60 + Math.sin(t * 20) * 6); }
    if (b.phase === 'fight') {
      g.fillStyle(0x000000, 0.6); g.fillRect(280, 70, 400, 12);
      g.fillStyle(BEASTS.brambleback.bar, 1); g.fillRect(282, 72, 396 * Math.max(0, b.hp / b.maxHp), 8);
    }
  }

  /**
   * The Skyray: a manta as wide as a sail-field. Every few seconds it leaps clear of the sea and
   * glides — its shadow stays on the water while the body lifts, wings rippling, whip tail behind.
   */
  private drawSkyray(g: Phaser.GameObjects.Graphics, b: Beast, t: number): void {
    const { x, y } = b;
    const leap = Math.max(0, Math.sin(t * 0.9)) ** 2 * 70;
    const flap = Math.sin(t * 3.2) * (0.25 + leap / 140);
    g.fillStyle(0x000000, 0.28 - leap / 500); g.fillEllipse(x, y + 26, 300 - leap * 0.6, 70 - leap * 0.2);
    if (leap < 8) { g.lineStyle(3, 0xffffff, 0.35); g.strokeEllipse(x, y + 18, 280, 60); }
    const by = y - leap;
    const span = 150, belly = 0xe8eef4, back = 0x3a4a62;
    // Wings: two curved triangles whose tips rise and fall.
    for (const side of [-1, 1]) {
      const tipX = x + side * span, tipY = by - 10 - flap * 40;
      g.fillStyle(back, 1);
      g.beginPath(); g.moveTo(x, by - 34); g.lineTo(x + side * span * 0.55, by - 22 - flap * 20); g.lineTo(tipX, tipY);
      g.lineTo(x + side * span * 0.5, by + 18); g.lineTo(x, by + 30); g.closePath(); g.fillPath();
      g.lineStyle(1.5, 0x8ab0d8, 0.6);
      g.lineBetween(x, by - 10, tipX - side * 18, tipY + 6); g.lineBetween(x, by + 8, tipX - side * 30, tipY + 14);
      g.fillStyle(0xe8f4ff, 0.5); g.fillCircle(x + side * span * 0.42, by - 6 - flap * 14, 3);
    }
    g.fillStyle(0x4a5c78, 1); g.fillEllipse(x, by - 2, 74, 76);
    g.fillStyle(belly, 0.25); g.fillEllipse(x, by + 8, 50, 40);
    // Cephalic fins curling forward, and eyes.
    for (const side of [-1, 1]) {
      g.fillStyle(back, 1); g.fillEllipse(x + side * 20, by + 40, 12, 26);
      g.fillStyle(0xd8f4ff, 0.9); g.fillCircle(x + side * 26, by + 22, 4); g.fillStyle(0x0a1020, 1); g.fillCircle(x + side * 26, by + 23, 2);
    }
    // Whip tail streaming back (up the screen, away from the boat).
    g.lineStyle(3, back, 1); g.beginPath(); g.moveTo(x, by - 36);
    for (let i = 1; i <= 8; i++) g.lineTo(x + Math.sin(t * 4 + i * 0.7) * i * 2.4, by - 36 - i * 11);
    g.strokePath();
    if (b.attack === 'spit') { g.fillStyle(0xe8f8ff, 0.4 + 0.3 * Math.sin(t * 20)); g.fillCircle(x, by + 46, 10 + b.attackT * 8); }
    if (b.phase === 'fight') {
      g.fillStyle(0x000000, 0.6); g.fillRect(280, 70, 400, 12);
      g.fillStyle(BEASTS.skyray.bar, 1); g.fillRect(282, 72, 396 * Math.max(0, b.hp / b.maxHp), 8);
    }
  }

  /**
   * The Cragjaw: a living sea-stack — a leviathan whose back is a crag of basalt pillars, gulls
   * wheeling over it, surf breaking round its flanks; a slab-toothed jaw grinds at the front.
   */
  /**
   * The Galvaneel: a blue-black eel as long as a harbour wall, coiling through the swell — rows of
   * glowing cells down its flanks that brighten as it charges, a lantern-lure on its brow, a fanged jaw.
   */
  private drawGalvaneel(g: Phaser.GameObjects.Graphics, b: Beast, t: number): void {
    const { x, y } = b;
    const body = 0x101c2e, belly = 0x2a3e5a;
    const charge = b.attack === 'wave' ? Math.min(1, b.attackT / 0.8) : b.attack === 'spit' ? Math.min(1, b.attackT / 0.6) : 0.25 + Math.sin(t * 3) * 0.1;
    const seg = (i: number) => ({ sx: x - 150 + i * 22, sy: y + Math.sin(t * 2.4 - i * 0.55) * 22 });
    g.fillStyle(0xffffff, 0.15); g.fillEllipse(x, y + 34, 360, 40);
    for (let i = 0; i < 14; i++) {
      const { sx, sy } = seg(i), rr = 14 + Math.sin((i / 13) * Math.PI) * 12;
      g.fillStyle(body, 1); g.fillCircle(sx, sy, rr);
      g.fillStyle(belly, 1); g.fillEllipse(sx, sy + rr * 0.45, rr * 1.4, rr * 0.6);
      g.fillStyle(0x8ad8ff, 0.35 + charge * 0.6); g.fillCircle(sx, sy - rr * 0.35, 3 + charge * 2);
      if (charge > 0.8) { g.fillStyle(0xbfe8ff, 0.25); g.fillCircle(sx, sy - rr * 0.35, 9); }
    }
    // Tail fin trailing off the last segment.
    const tl = seg(0);
    g.fillStyle(body, 1); g.fillTriangle(tl.sx, tl.sy, tl.sx - 34, tl.sy - 18, tl.sx - 30, tl.sy + 16);
    // Head: a wedge with a lantern-lure on its brow and a fanged jaw that gapes when it spits.
    const hd = seg(13), hx = hd.sx + 26, hy = hd.sy;
    g.fillStyle(body, 1); g.fillEllipse(hx, hy, 64, 40);
    const open = b.attack === 'spit' ? Math.min(1, b.attackT * 2) : 0.1;
    g.fillStyle(0x05080e, 1); g.fillTriangle(hx + 8, hy + 2, hx + 34, hy - 4 - open * 6, hx + 34, hy + 8 + open * 10);
    g.fillStyle(0xe8f4ff, 1);
    for (let k = 0; k < 3; k++) { const fx = hx + 14 + k * 7; g.fillTriangle(fx, hy - 2 - open * 2, fx + 3, hy - 2 - open * 2, fx + 1.5, hy + 4); }
    g.fillStyle(0xffd04a, 1); g.fillCircle(hx + 4, hy - 8, 4); g.fillStyle(0x101010, 1); g.fillCircle(hx + 5, hy - 8, 1.6);
    g.lineStyle(2, 0x3a4a5a, 1); g.beginPath(); g.moveTo(hx - 6, hy - 18); g.lineTo(hx + 4, hy - 40); g.lineTo(hx + 18, hy - 44); g.strokePath();
    g.fillStyle(0xbfe8ff, 0.6 + 0.4 * Math.sin(t * 6)); g.fillCircle(hx + 18, hy - 44, 6);
    g.fillStyle(0x8ad8ff, 0.2); g.fillCircle(hx + 18, hy - 44, 16);
    if (charge > 0.6) {
      g.lineStyle(1.5, 0xffffff, charge);
      for (let i = 2; i < 13; i += 3) { const a2 = seg(i), b2 = seg(i + 1); g.lineBetween(a2.sx, a2.sy - 20, b2.sx + Math.sin(t * 30 + i) * 6, b2.sy - 26); }
    }
    if (b.phase === 'fight') {
      g.fillStyle(0x000000, 0.6); g.fillRect(280, 70, 400, 12);
      g.fillStyle(BEASTS.galvaneel.bar, 1); g.fillRect(282, 72, 396 * Math.max(0, b.hp / b.maxHp), 8);
    }
  }

  /**
   * The Mire Hydra: one sunken body under a scum of weed, and five heads rising out of it on necks
   * like mangrove trunks — gnarled, rooted where they meet the water — black-green scales, yellow
   * eyes, and each head hooded differently: a cobra hood, a frill, a crest of horns, a fin-sail,
   * and a bare viper's head with horned brows. They sway out of step, gape when they spit, and rear
   * back before a volley of venom.
   */
  private drawHydra(g: Phaser.GameObjects.Graphics, b: Beast, t: number): void {
    const { x, y } = b;
    const scale = 0x14241a, bark = 0x2a3020, lit = 0x3a5a2e, dark = 0x08100a;
    const rear = b.attack === 'wave' ? Math.sin(Math.min(1, b.attackT / 0.8) * Math.PI * 0.5) * (b.attackT > 0.8 ? Math.max(0, 1 - (b.attackT - 0.8) * 3) : 1) : 0;
    const open = b.attack === 'spit' ? Math.min(1, b.attackT * 2) : b.attack === 'wave' && b.attackT > 0.75 ? 1 : 0.1 + Math.sin(t * 1.8) * 0.06;
    // The sunken body: a dark mound in a ring of ripples and floating weed.
    g.fillStyle(0xffffff, 0.14); g.fillEllipse(x, y + 40, 300 + Math.sin(t * 2) * 10, 54);
    for (let i = 0; i < 3; i++) { const k = (t * 0.4 + i / 3) % 1; g.lineStyle(2, 0xc8e8d0, 0.3 * (1 - k)); g.strokeEllipse(x, y + 34, 220 + k * 160, 40 + k * 30); }
    g.fillStyle(dark, 0.6); g.fillEllipse(x, y + 32, 250, 66);
    g.fillStyle(scale, 1); g.fillEllipse(x, y + 22, 220, 54);
    g.fillStyle(lit, 1); for (let i = -4; i <= 4; i++) g.fillEllipse(x + i * 22, y + 12 + Math.abs(i) * 2, 14, 7);
    for (let i = 0; i < 8; i++) { g.fillStyle(i % 2 ? 0x4a6a2a : 0x6a8a3a, 0.8); g.fillEllipse(x - 120 + i * 34 + Math.sin(t + i) * 4, y + 44 + (i % 3) * 4, 18, 5); }
    // The five necks, outer ones first so the middle one stands in front.
    const hoods = ['frill', 'horns', 'cobra', 'fin', 'viper'] as const;
    for (const i of [0, 4, 1, 3, 2]) {
      const bx0 = x + (i - 2) * 44, by0 = y + 20;
      const lean = (i - 2) * 22, sway = Math.sin(t * (1.1 + i * 0.17) + i * 1.9) * 16;
      const hgt = 72 + (2 - Math.abs(i - 2)) * 16 + rear * 20;
      const hx = bx0 + lean + sway - (i - 2) * rear * 6, hy = by0 - hgt;
      const neck = (u: number) => ({ px: bx0 + (lean + sway) * u * u + Math.sin(u * Math.PI * 2 + t * 1.5 + i) * 6 * (1 - u), py: by0 - hgt * u });
      // Root-flare where the neck meets the water: gnarled buttresses like a mangrove's.
      for (const d of [-1, 1]) {
        g.lineStyle(6, bark, 1); g.beginPath(); g.moveTo(bx0, by0 - 18);
        g.lineTo(bx0 + d * 10, by0 - 6); g.lineTo(bx0 + d * 20, by0 + 6); g.strokePath();
      }
      // The trunk: thick at the root, tapering to the head, bark-ridged.
      for (let k = 0; k <= 12; k++) {
        const u = k / 12, { px, py } = neck(u), w = 15 - u * 6;
        g.fillStyle(k % 3 === 0 ? bark : scale, 1); g.fillCircle(px, py, w);
        g.fillStyle(lit, 0.8); g.fillEllipse(px - w * 0.35, py, w * 0.5, w * 0.9);
        if (k % 2 === 0) { g.lineStyle(1, dark, 0.8); g.lineBetween(px - w * 0.8, py + 2, px + w * 0.6, py - 2); }
      }
      g.fillStyle(0x6a8a3a, 0.7); g.fillEllipse(neck(0.12).px + 8, neck(0.12).py, 7, 12);
      // The hood, behind the head.
      const hood = hoods[i];
      if (hood === 'cobra') {
        g.fillStyle(scale, 1); g.fillEllipse(hx, hy + 8, 58, 54);
        g.fillStyle(0x2a4a24, 1); g.fillEllipse(hx, hy + 10, 44, 42);
        g.lineStyle(2, 0xd8c84a, 0.9); g.strokeCircle(hx - 10, hy + 12, 5); g.strokeCircle(hx + 10, hy + 12, 5);
        g.lineBetween(hx - 5, hy + 12, hx + 5, hy + 12);
      } else if (hood === 'frill') {
        for (let k = 0; k < 9; k++) {
          const a = Math.PI + 0.1 + (k / 8) * (Math.PI - 0.2), fx = hx + Math.cos(a) * 34, fy = hy + 4 + Math.sin(a) * 26;
          g.lineStyle(2, dark, 1); g.lineBetween(hx, hy + 4, fx, fy);
          g.fillStyle(k % 2 ? 0x8a2a3a : 0xb83a4a, 0.85); g.fillTriangle(hx, hy + 4, fx, fy, hx + Math.cos(a + 0.18) * 32, hy + 4 + Math.sin(a + 0.18) * 24);
        }
      } else if (hood === 'horns') {
        for (let k = -2; k <= 2; k++) {
          g.fillStyle(0xd8ccb0, 1); g.fillTriangle(hx + k * 8 - 3, hy - 6, hx + k * 8 + 3, hy - 6, hx + k * 11, hy - 26 + Math.abs(k) * 4);
          g.fillStyle(0x8a7a5a, 1); g.fillRect(hx + k * 8 - 3, hy - 8, 6, 3);
        }
      } else if (hood === 'fin') {
        g.fillStyle(0x2a5a6a, 0.9);
        g.beginPath(); g.moveTo(hx - 14, hy - 2);
        for (let k = 0; k <= 6; k++) g.lineTo(hx - 14 + k * 5, hy - 22 - Math.sin((k / 6) * Math.PI) * 12 + (k % 2) * 5);
        g.lineTo(hx + 16, hy - 2); g.closePath(); g.fillPath();
        g.lineStyle(1, 0x8ac8c8, 0.8); for (let k = 1; k < 6; k++) g.lineBetween(hx - 14 + k * 5, hy - 2, hx - 14 + k * 5, hy - 22 - Math.sin((k / 6) * Math.PI) * 10);
      }
      // The head: a wedge with a heavy jaw that gapes when it spits.
      g.fillStyle(scale, 1); g.fillEllipse(hx, hy, 34, 26);
      g.fillStyle(lit, 1); g.fillEllipse(hx, hy - 4, 24, 12);
      g.fillStyle(scale, 1); g.fillEllipse(hx, hy + 12 + open * 8, 24, 12);
      if (open > 0.2) {
        g.fillStyle(0x3a0a14, 1); g.fillEllipse(hx, hy + 8 + open * 3, 20, 4 + open * 10);
        g.fillStyle(0xf4eedc, 1); g.fillTriangle(hx - 7, hy + 6, hx - 4, hy + 6, hx - 5.5, hy + 12 + open * 3); g.fillTriangle(hx + 4, hy + 6, hx + 7, hy + 6, hx + 5.5, hy + 12 + open * 3);
        g.fillStyle(0x8ae03a, 0.8); g.fillCircle(hx, hy + 12 + open * 6, 3);
      }
      if (hood === 'viper') {
        for (const d of [-1, 1]) { g.fillStyle(0xd8ccb0, 1); g.fillTriangle(hx + d * 8, hy - 8, hx + d * 13, hy - 8, hx + d * 15, hy - 20); }
      }
      // Yellow slit eyes.
      for (const d of [-1, 1]) {
        g.fillStyle(0xffd83a, 1); g.fillEllipse(hx + d * 8, hy - 4, 7, 5);
        g.fillStyle(0x0a0a0a, 1); g.fillRect(hx + d * 8 - 0.8, hy - 6.5, 1.6, 5);
        if (rear > 0.3) { g.fillStyle(0xffe86a, 0.3 * rear); g.fillCircle(hx + d * 8, hy - 4, 7); }
      }
      // A drip of venom off the jaw.
      const dk = (t * 0.7 + i * 0.23) % 1;
      g.fillStyle(0x8ae03a, 0.8 * (1 - dk)); g.fillEllipse(hx + 2, hy + 16 + open * 8 + dk * 30, 3, 4);
    }
    if (b.attack === 'slam') { g.lineStyle(3, 0x8ae03a, 0.6); g.strokeCircle(this.bx, this.by - 20, 60 + Math.sin(t * 20) * 6); }
    if (b.phase === 'fight') {
      g.fillStyle(0x000000, 0.6); g.fillRect(280, 70, 400, 12);
      g.fillStyle(BEASTS.hydra.bar, 1); g.fillRect(282, 72, 396 * Math.max(0, b.hp / b.maxHp), 8);
    }
  }

  /**
   * The Wheelback: a sea turtle the size of a reef whose shell is carved and inlaid as a roulette
   * wheel — a mahogany rim studded with gilt, a ball-track the ball runs round, a ring of red and
   * black pockets (one green) with gold frets, a gilt cone and a turning cross-handled hub — the whole
   * wheel spinning as it swims, faster as it winds up to throw its dice. Barnacled with stacks of
   * gambling chips; great mottled flippers row at the sides and a beaked head pushes out in front.
   */
  private drawWheelback(g: Phaser.GameObjects.Graphics, b: Beast, t: number): void {
    const { x, y } = b;
    const skin = 0x5a7a5a, skinD = 0x3a5a40, skinL = 0x8aa888;
    const windup = b.attack === 'wave' ? Math.min(1, b.attackT / 0.8) : 0;
    const spin = t * (0.8 + windup * 5) + (b.attack === 'wave' ? b.attackT * b.attackT * 3 : 0);
    const RX = 116, RY = 72, sy = y - 6;
    const P = (a: number, rr: number): [number, number] => [x + Math.cos(a) * rr * RX, sy + Math.sin(a) * rr * RY];
    // Water: wake round the shell and its shadow.
    g.fillStyle(0xffffff, 0.15); g.fillEllipse(x, y + 44, 300 + Math.sin(t * 2) * 10, 50);
    for (let i = 0; i < 3; i++) { const k = (t * 0.45 + i / 3) % 1; g.lineStyle(2, 0xe8f0ff, 0.28 * (1 - k)); g.strokeEllipse(x, y + 10, 250 + k * 150, 150 + k * 60); }
    g.fillStyle(0x000000, 0.3); g.fillEllipse(x + 6, y + 18, 260, 160);
    // Flippers: the front pair rowing big strokes, the rear pair paddling, and a stub of tail.
    for (const side of [-1, 1]) {
      const st = Math.sin(t * 1.8 + (side > 0 ? Math.PI : 0)), fx = x + side * RX * 0.88, fy = y + RY * 0.42;
      const tipX = fx + side * (56 + st * 8), tipY = fy + 34 + st * 22;
      g.fillStyle(skinD, 1); g.fillTriangle(fx - side * 10, fy - 16, fx + side * 6, fy + 18, tipX, tipY);
      g.fillStyle(skin, 1); g.fillTriangle(fx - side * 6, fy - 10, fx + side * 4, fy + 12, tipX - side * 4, tipY - 4);
      g.fillStyle(skinL, 0.7); for (let k = 1; k <= 3; k++) g.fillCircle(Phaser.Math.Linear(fx, tipX, k / 4), Phaser.Math.Linear(fy, tipY, k / 4) - 3, 3 - k * 0.5);
      const rs = Math.sin(t * 1.8 + 1 + (side > 0 ? 0 : Math.PI)), rx = x + side * RX * 0.66, ry = y - RY * 0.72;
      g.fillStyle(skinD, 1); g.fillTriangle(rx, ry + 8, rx + side * 8, ry - 10, rx + side * (34 + rs * 6), ry - 22 - rs * 8);
      g.fillStyle(0xffffff, 0.18 * (0.5 + 0.5 * st)); g.fillEllipse(tipX, tipY + 4, 26, 8);
    }
    g.fillStyle(skinD, 1); g.fillTriangle(x - 10, y - RY - 2, x + 10, y - RY - 2, x + Math.sin(t * 2.4) * 8, y - RY - 26);
    // Head and neck in front, beak opening when it spits.
    const open = b.attack === 'spit' ? Math.min(1, b.attackT * 2) : 0.08 + Math.sin(t * 1.7) * 0.05;
    const hx = x + Math.sin(t * 0.9) * 6, hy = y + RY + 24;
    g.fillStyle(skinD, 1); g.fillEllipse(x, y + RY + 2, 54, 36);
    g.lineStyle(1.5, 0x2a4030, 0.8); for (let k = 0; k < 3; k++) g.strokeEllipse(x, y + RY - 2 + k * 6, 44 - k * 4, 10);
    g.fillStyle(skin, 1); g.fillEllipse(hx, hy, 58, 44);
    g.fillStyle(skinL, 0.6); for (const [dx, dy, rr] of [[-14, -8, 5], [10, -12, 4], [16, 2, 3.5], [-6, 4, 3]] as const) g.fillCircle(hx + dx, hy + dy, rr);
    g.fillStyle(0x3a3020, 1); g.fillTriangle(hx - 14, hy + 10, hx + 14, hy + 10, hx, hy + 28 + open * 4);
    g.fillStyle(0x5a4a30, 1); g.fillTriangle(hx - 10, hy + 11, hx + 4, hy + 11, hx - 2, hy + 22);
    if (open > 0.15) { g.fillStyle(0x1a0a08, 1); g.fillEllipse(hx, hy + 14, 22, 3 + open * 14); g.fillStyle(0xe8c050, 0.6 * open); g.fillCircle(hx, hy + 15, 3 + open * 3); }
    for (const d of [-1, 1]) {
      g.fillStyle(0xffd860, 1); g.fillEllipse(hx + d * 16, hy - 6, 11, 8);
      g.fillStyle(0x1a1008, 1); g.fillRect(hx + d * 16 - 1, hy - 9.5, 2, 7);
      g.fillStyle(0xffffff, 0.8); g.fillCircle(hx + d * 16 - 2, hy - 8, 1.2);
      g.lineStyle(2, skinD, 1); g.lineBetween(hx + d * 9, hy - 12, hx + d * 22, hy - 11);
    }
    // The shell: a mahogany rim with barnacles, gilt studs and the ball-track.
    g.fillStyle(0x2a140a, 1); g.fillEllipse(x, sy + 6, RX * 2 + 18, RY * 2 + 16);
    g.fillStyle(0x6a3018, 1); g.fillEllipse(x, sy, RX * 2 + 12, RY * 2 + 10);
    g.fillStyle(0x8a4422, 1); g.fillEllipse(x, sy - 2, RX * 2, RY * 2);
    g.lineStyle(1, 0x4a2010, 0.7); for (let k = 0; k < 24; k++) { const a = k * (Math.PI / 12) + 0.1; const [ax, ay] = P(a, 0.93), [bx2, by2] = P(a + 0.12, 1.02); g.lineBetween(ax, ay, bx2, by2); }
    for (let k = 0; k < 16; k++) { const [px, py] = P(spin + k * (Math.PI / 8), 0.97); g.fillStyle(0xe8c050, 1); g.fillCircle(px, py, 2.2); g.fillStyle(0xfff4c0, 0.8); g.fillCircle(px - 0.6, py - 0.6, 0.8); }
    g.fillStyle(0xb07a40, 1); g.fillEllipse(x, sy - 2, RX * 1.8, RY * 1.8);
    g.fillStyle(0xc8925a, 0.5); g.fillEllipse(x - RX * 0.1, sy - RY * 0.12, RX * 1.6, RY * 1.4);
    // The pockets: eighteen wedges round the wheel, red and black with one green, gold frets between.
    const N = 18;
    for (let k = 0; k < N; k++) {
      const a0 = spin + k * (Math.PI * 2 / N), a1 = a0 + Math.PI * 2 / N;
      const [o0x, o0y] = P(a0, 0.86), [o1x, o1y] = P(a1, 0.86), [i0x, i0y] = P(a0, 0.6), [i1x, i1y] = P(a1, 0.6);
      g.fillStyle(k === 0 ? 0x1a7a3a : k % 2 ? 0x141014 : 0xb01c28, 1);
      g.fillTriangle(o0x, o0y, o1x, o1y, i1x, i1y); g.fillTriangle(o0x, o0y, i1x, i1y, i0x, i0y);
      g.lineStyle(1.5, 0xe8c050, 1); g.lineBetween(o0x, o0y, i0x, i0y);
      const [nx, ny] = P(a0 + Math.PI / N, 0.78); g.fillStyle(0xf4ecd8, 0.75); g.fillRect(nx - 1.5, ny - 1, 3, 2);
    }
    g.lineStyle(2, 0xe8c050, 1); g.strokeEllipse(x, sy, RX * 1.72, RY * 1.72); g.strokeEllipse(x, sy, RX * 1.2, RY * 1.2);
    // The cone and hub: gilt rings rising to a cross-handled turret turning against the wheel.
    g.fillStyle(0x8a5a2a, 1); g.fillEllipse(x, sy, RX * 1.18, RY * 1.18);
    g.fillStyle(0xc8a040, 1); g.fillEllipse(x, sy - 3, RX * 0.7, RY * 0.7);
    g.fillStyle(0xe8c860, 1); g.fillEllipse(x - 4, sy - 7, RX * 0.42, RY * 0.4);
    const hub = -spin * 1.6;
    for (let k = 0; k < 4; k++) {
      const a = hub + k * (Math.PI / 2), ex = x + Math.cos(a) * 26, ey = sy - 12 + Math.sin(a) * 16;
      g.lineStyle(4, 0x8a6a2a, 1); g.lineBetween(x, sy - 12, ex, ey);
      g.lineStyle(2, 0xf0d070, 1); g.lineBetween(x, sy - 13, ex, ey - 1);
      g.fillStyle(0xe8c050, 1); g.fillCircle(ex, ey, 4.5); g.fillStyle(0xfff4c0, 0.9); g.fillCircle(ex - 1.2, ey - 1.2, 1.5);
    }
    g.fillStyle(0xd8b048, 1); g.fillCircle(x, sy - 12, 7); g.fillStyle(0xfff0b0, 1); g.fillCircle(x - 2, sy - 14, 2.4);
    // The ball, racing the other way round the track.
    const ba = -t * (2.6 + windup * 3), [bpx, bpy] = P(ba, 0.9);
    g.fillStyle(0x000000, 0.3); g.fillCircle(bpx + 1, bpy + 2, 4); g.fillStyle(0xffffff, 1); g.fillCircle(bpx, bpy, 3.6);
    g.fillStyle(0xd8d8e0, 1); g.fillCircle(bpx + 1, bpy + 1, 1.6);
    // Barnacles of chips: little stacks crusted round the rim, and white barnacles between.
    const chips = [[0.4, 0xc81a2a, 4], [1.25, 0x2a5ab8, 3], [2.2, 0x1a1418, 5], [3.5, 0x2a8a3a, 3], [4.3, 0xc81a2a, 2], [5.3, 0xe8e0d0, 4]] as const;
    for (const [a, c, n] of chips) {
      const [cx, cy] = P(a, 1.04), edge = Phaser.Display.Color.ValueToColor(c).darken(30).color;
      for (let k = 0; k < n; k++) {
        g.fillStyle(edge, 1); g.fillEllipse(cx, cy - k * 3 + 1.5, 13, 5.5);
        g.fillStyle(c, 1); g.fillEllipse(cx, cy - k * 3, 13, 5);
        g.fillStyle(0xffffff, 0.8); g.fillRect(cx - 5.5, cy - k * 3 - 0.6, 2, 1.2); g.fillRect(cx + 3.5, cy - k * 3 - 0.6, 2, 1.2);
      }
    }
    for (let k = 0; k < 10; k++) {
      const [cx, cy] = P(0.9 + k * 0.58, 1.02 + (k % 2) * 0.04);
      g.fillStyle(0xd8d0c0, 1); g.fillTriangle(cx - 3, cy + 2, cx + 3, cy + 2, cx, cy - 4); g.fillStyle(0x5a5040, 1); g.fillCircle(cx, cy - 2, 0.9);
    }
    if (windup > 0) { g.lineStyle(2, 0xffe8a0, 0.5 * windup); g.strokeEllipse(x, sy, RX * 2 + 24 + windup * 10, RY * 2 + 20 + windup * 8); }
    if (b.attack === 'slam') { g.lineStyle(3, 0xe8c050, 0.6); g.strokeCircle(this.bx, this.by - 20, 60 + Math.sin(t * 20) * 6); }
    if (b.phase === 'fight') {
      g.fillStyle(0x000000, 0.6); g.fillRect(280, 70, 400, 12);
      g.fillStyle(BEASTS.wheelback.bar, 1); g.fillRect(282, 72, 396 * Math.max(0, b.hp / b.maxHp), 8);
    }
  }

  private drawCragjaw(g: Phaser.GameObjects.Graphics, b: Beast, t: number): void {
    const { x, y } = b;
    const stone = 0x5a5048, lit = 0x8a7c6a, dark = 0x2e2824;
    const heave = b.attack === 'wave' ? Math.sin(Math.min(1, b.attackT / 0.8) * Math.PI) * 10 : 0;
    g.fillStyle(0xffffff, 0.2); g.fillEllipse(x, y + 40, 260 + Math.sin(t * 2) * 8, 46);
    g.fillStyle(0x000000, 0.3); g.fillEllipse(x, y + 28, 240, 70);
    g.fillStyle(dark, 1); g.fillEllipse(x, y + 4 - heave, 220, 110);
    g.fillStyle(stone, 1); g.fillEllipse(x, y - 4 - heave, 200, 92);
    // Basalt pillars crowding its back, tallest in the middle.
    for (let i = 0; i < 11; i++) {
      const px = x - 80 + i * 16, hgt = 26 + (5 - Math.abs(i - 5)) * 9 + ((i * 7) % 3) * 4, top = y - 20 - heave - hgt;
      g.fillStyle(i % 2 ? stone : 0x4a423a, 1); g.fillRect(px - 7, top, 14, hgt + 14);
      g.fillStyle(lit, 1); g.fillRect(px - 7, top, 14, 4);
      g.lineStyle(1, dark, 0.8); g.lineBetween(px - 7, top, px - 7, top + hgt + 14);
    }
    // Gulls wheeling over the crag.
    for (let i = 0; i < 3; i++) {
      const a = t * (0.9 + i * 0.2) + i * 2, gx = x + Math.cos(a) * (60 + i * 20), gy = y - 110 - heave + Math.sin(a) * 18;
      g.lineStyle(1.5, 0xf4f4f0, 0.9); g.lineBetween(gx - 6, gy - 2 + Math.sin(t * 8 + i) * 2, gx, gy); g.lineBetween(gx, gy, gx + 6, gy - 2 + Math.sin(t * 8 + i) * 2);
    }
    // The jaw: a slab-toothed underbite, grinding open when it spits.
    const open = b.attack === 'spit' ? Math.min(1, b.attackT * 2) : 0.1 + Math.sin(t * 1.6) * 0.06;
    g.fillStyle(dark, 1); g.fillRoundedRect(x - 56, y + 30 - heave, 112, 22 + open * 22, 8);
    g.fillStyle(0x1a0e0a, 1); g.fillRect(x - 46, y + 34 - heave, 92, 4 + open * 18);
    g.fillStyle(0xd8ccb0, 1);
    for (let k = -2; k <= 2; k++) { g.fillRect(x + k * 18 - 5, y + 30 - heave, 10, 8); g.fillRect(x + k * 18 - 5, y + 44 + open * 18 - heave, 10, 8); }
    for (const side of [-1, 1]) { g.fillStyle(0xffb040, 0.9); g.fillCircle(x + side * 40, y + 18 - heave, 5); g.fillStyle(0x2a1a0a, 1); g.fillCircle(x + side * 40, y + 19 - heave, 2); }
    if (b.phase === 'fight') {
      g.fillStyle(0x000000, 0.6); g.fillRect(280, 70, 400, 12);
      g.fillStyle(BEASTS.cragjaw.bar, 1); g.fillRect(282, 72, 396 * Math.max(0, b.hp / b.maxHp), 8);
    }
  }

  /** The Maelstrom Wyrm: coils breaking the surface in a slow sine, a finned head in front. */
  private drawWyrm(g: Phaser.GameObjects.Graphics, b: Beast, t: number): void {
    const { x, y } = b;
    const scale = 0x1a4a6a, belly = 0x5ab8c8, fin = 0x2a8a9a;
    for (let i = 4; i >= 1; i--) {
      const hx = x + Math.sin(t * 1.2 + i * 1.3) * 40 + (i % 2 ? -1 : 1) * i * 38;
      const hy = y - 30 - i * 22;
      g.fillStyle(0xffffff, 0.18); g.fillEllipse(hx, hy + 12, 74 - i * 6, 14);
      g.fillStyle(scale, 1); g.beginPath(); g.arc(hx, hy + 10, 34 - i * 3, Math.PI, 0, false); g.closePath(); g.fillPath();
      g.fillStyle(fin, 1); g.fillTriangle(hx - 8, hy - 18 + i * 3, hx + 8, hy - 18 + i * 3, hx + 2, hy - 34 + i * 2);
      g.lineStyle(2, belly, 0.5); g.beginPath(); g.arc(hx, hy + 10, 26 - i * 3, Math.PI * 1.15, Math.PI * 1.85, false); g.strokePath();
    }
    g.fillStyle(0x000000, 0.3); g.fillEllipse(x, y + 36, 170, 50);
    g.fillStyle(scale, 1); g.fillEllipse(x, y, 130, 96);
    g.fillStyle(Phaser.Display.Color.ValueToColor(scale).lighten(12).color, 1); g.fillEllipse(x, y - 10, 100, 60);
    for (const side of [-1, 1]) {
      g.fillStyle(fin, 1); g.fillTriangle(x + side * 50, y - 20, x + side * 96, y - 50 + Math.sin(t * 4) * 6, x + side * 70, y + 6);
    }
    const open = b.attack === 'spit' ? Math.min(1, b.attackT * 2) : 0.15 + Math.sin(t * 2) * 0.08;
    g.fillStyle(0x04121c, 1); g.fillEllipse(x, y + 28, 70, 14 + open * 36);
    g.fillStyle(0x9af0ff, 0.35 + open * 0.5); g.fillEllipse(x, y + 30, 46, 6 + open * 22);
    for (let i = -2; i <= 2; i++) { g.fillStyle(0xe8f4f0, 1); g.fillTriangle(x + i * 12 - 4, y + 20 - open * 14, x + i * 12 + 4, y + 20 - open * 14, x + i * 12, y + 30 - open * 8); }
    const glow = 0.7 + Math.sin(t * 5) * 0.3;
    g.fillStyle(0xbff8ff, glow); g.fillCircle(x - 30, y - 18, 8); g.fillCircle(x + 30, y - 18, 8);
    g.fillStyle(0x04121c, 1); g.fillEllipse(x - 30, y - 18, 10, 3); g.fillEllipse(x + 30, y - 18, 10, 3);
    if (b.attack === 'slam') { g.lineStyle(3, 0x6ad8ff, 0.6); g.strokeCircle(this.bx, this.by - 20, 60 + Math.sin(t * 20) * 6); }
    if (b.phase === 'fight') {
      g.fillStyle(0x000000, 0.6); g.fillRect(280, 70, 400, 12);
      g.fillStyle(BEASTS.wyrm.bar, 1); g.fillRect(282, 72, 396 * Math.max(0, b.hp / b.maxHp), 8);
    }
  }

  private drawHud(): void {
    const g = this.gHud;
    g.clear();
    g.fillStyle(0x000000, 0.45); g.fillRoundedRect(8, 6, 300, 54, 8);
    for (let i = 0; i < this.maxHull; i++) {
      g.fillStyle(i < this.hull ? 0x8ad8a0 : 0x3a2a2a, 1); g.fillRoundedRect(16 + i * 18, 40, 14, 12, 3);
    }
    const leg = this.crossing ? `  → ${this.crossing.name} ${Math.max(0, Math.round(this.toLand()))} m` : `  ${Math.round(this.dist)} m`;
    this.hudText.setText(`${this.boat.name}${leg}\nHold ${this.haul} 🪙  ${this.orbs ? this.orbs + ' 🔮' : ''}`);
    if (this.burstCd > 0) { g.fillStyle(0x000000, 0.45); g.fillRect(840, 12, 104, 10); g.fillStyle(this.elementColor, 1); g.fillRect(842, 14, 100 * (1 - this.burstCd / 7), 6); }
    if (Save.S().boat.uber === 'uber-fortunehelm') {
      // The Fortune Helm's dial: a gold arc filling toward the next spin, the last boon's colour in the
      // hub, and a gold pip while a ward is held.
      const cx = 926, cy = 46, k = this.helmPending ? 1 : 1 - Phaser.Math.Clamp(this.turretCd / HELM_EVERY, 0, 1);
      g.fillStyle(0x000000, 0.45); g.fillCircle(cx, cy, 15);
      g.lineStyle(3, 0x3a2a14, 1); g.strokeCircle(cx, cy, 11);
      g.lineStyle(3, 0xe8c050, 1); g.beginPath(); g.arc(cx, cy, 11, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
      const boon = this.helmBoon;
      g.fillStyle(boon === 'gust' ? 0xe8f8ff : boon === 'ward' ? 0xffd84a : boon === 'broadside' ? 0xff7a4a : 0x5a4a3a, 1); g.fillCircle(cx, cy, 5);
      if (this.helmWard) { g.fillStyle(0xffd84a, 1); g.fillTriangle(cx - 22, cy - 6, cx - 14, cy - 6, cx - 18, cy + 4); }
    }
    if (Save.S().boat.uber === 'uber-foghorn') {
      // The Foghorn's dial: a brass arc filling toward the next blast round a little horn mark.
      const cx = 926, cy = 46, k = 1 - Phaser.Math.Clamp(this.turretCd / HORN_EVERY, 0, 1);
      g.fillStyle(0x000000, 0.45); g.fillCircle(cx, cy, 15);
      g.lineStyle(3, 0x3a2a14, 1); g.strokeCircle(cx, cy, 11);
      g.lineStyle(3, 0xd8a848, 1); g.beginPath(); g.arc(cx, cy, 11, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
      g.fillStyle(0xd8a848, 1); g.fillTriangle(cx - 5, cy - 1.5, cx - 5, cy + 1.5, cx + 3, cy - 5); g.fillTriangle(cx - 5, cy + 1.5, cx + 3, cy + 5, cx + 3, cy - 5);
      g.fillStyle(0x1a0e06, 1); g.fillEllipse(cx + 3, cy, 2.4, 9);
    }
    if (Save.S().boat.uber === 'uber-burningglass') {
      // The Burning Glass's dial: a gold arc filling toward the next lance round a little lens whose
      // heart brightens as it charges.
      const cx = 926, cy = 46, k = 1 - Phaser.Math.Clamp(this.turretCd / GLASS_EVERY, 0, 1);
      g.fillStyle(0x000000, 0.45); g.fillCircle(cx, cy, 15);
      g.lineStyle(3, 0x3a2a14, 1); g.strokeCircle(cx, cy, 11);
      g.lineStyle(3, 0xf0c848, 1); g.beginPath(); g.arc(cx, cy, 11, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
      g.fillStyle(0x9ad8d0, 0.7); g.fillCircle(cx, cy, 5.5);
      g.lineStyle(1.5, 0xd8a848, 1); g.strokeCircle(cx, cy, 5.5);
      g.fillStyle(0xffffff, 0.3 + 0.7 * k * k); g.fillCircle(cx, cy, 1.5 + k * 2);
    }
  }
}
