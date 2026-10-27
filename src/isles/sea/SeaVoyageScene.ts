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
 * ends in landfall at that isle's port once `CROSSING_M` metres are behind you.
 */

/** How long a crossing between two isles is. */
const CROSSING_M = 2600;
/** Hazards stop spawning this far from landfall, so the coast comes up clear. */
const COAST_M = 480;

/**
 * Sea beasts, by the `beast` id an isle's `UberDef` names. Each guards its isle's Uber-upgrade
 * and only surfaces once you have landed on that isle. `shot` tints its spit; `spawn` is what
 * its third attack throws on the water.
 */
const BEASTS: Record<string, { name: string; shot: number; bar: number; spawn: 'driftwall' | 'whirls' | 'brambles' | 'gusts' }> = {
  magmaw: { name: 'THE MAGMAW', shot: 0xff5a1a, bar: 0xff6a2a, spawn: 'driftwall' },
  wyrm: { name: 'THE MAELSTROM WYRM', shot: 0x6ad8ff, bar: 0x4ab8ff, spawn: 'whirls' },
  brambleback: { name: 'THE BRAMBLEBACK', shot: 0x9ad84a, bar: 0x7ac83a, spawn: 'brambles' },
  skyray: { name: 'THE SKYRAY', shot: 0xe8f8ff, bar: 0x9ad8ff, spawn: 'gusts' },
};

/** `bramble`: a floating mat of thorn-vine the Brambleback sheds; it snags (stops your drift) and scratches, but can be shot apart. */
/** `gust`: a gust front the Skyray's wake throws across the water — a band the width of the sea that shoves the boat toward `seed`'s sign; it cannot be shot. */
type HazardKind = 'rock' | 'reef' | 'mine' | 'whirl' | 'drift' | 'tentacle' | 'spout' | 'bramble' | 'gust';
interface Hazard { kind: HazardKind; x: number; y: number; r: number; hp: number; maxHp: number; t: number; seed: number; dead: boolean; armed?: number }
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

  constructor() { super({ key: 'SeaVoyageScene' }); }

  init(data: { dest: string; from: string; pos: Pt }): void {
    this.dest = data?.dest ?? 'wastes';
    this.from = data?.from ?? 'emberport';
    this.fromPos = data?.pos ?? { x: -1, y: -1 };
    this.crossing = this.dest === 'wastes' ? null : getIsle(this.dest) ?? null;
    if (!this.crossing) this.dest = 'wastes';
    this.bowWaveT = 9;
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

  private band(): number {
    let b = 0;
    BANDS.forEach((x, i) => { if (this.dist >= x.at) b = i; });
    // A crossing keeps to the charted lanes: never deeper than the Grey Reach.
    return this.crossing ? Math.min(b, 1) : b;
  }

  /** Metres left to landfall on a crossing (Infinity in the Wastes). */
  private toLand(): number { return this.crossing ? CROSSING_M - this.dist : Infinity; }

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
    const fwd = this.speed * (1 + trim * 0.25) * (this.sailT < 1.1 ? 1.7 : 1);
    this.by = Phaser.Math.Linear(this.by, 500 - trim * 40, 0.04);
    this.dist += fwd * dt / 10;

    // Band change banner.
    const bi = this.band();
    if (bi !== this.lastBand) {
      this.lastBand = bi;
      this.bandText.setText(BANDS[bi].name.toUpperCase()).setAlpha(1);
      this.tweens.add({ targets: this.bandText, alpha: 0, delay: 1800, duration: 700 });
      if (bi > 0) Sfx.play('boss-phase');
    }

    // Scroll the world toward the boat.
    const scroll = fwd * dt;
    for (const h of this.hazards) { h.y += scroll; h.t += dt; }
    for (const l of this.loot) { l.y += scroll; l.t += dt; }
    if (this.beast) { this.beast.t += dt; }
    this.hazards = this.hazards.filter((h) => !h.dead && h.y < 720);
    this.loot = this.loot.filter((l) => !l.taken && l.y < 700);

    // Spawning, thicker with depth.
    this.nextSpawn -= scroll;
    if (this.nextSpawn <= 0 && !(this.beast && this.beast.phase !== 'sink') && this.toLand() > COAST_M) {
      this.spawnRow(bi);
      this.nextSpawn = Math.max(90, 260 - bi * 45 - this.dist * 0.01) * (0.7 + this.rng() * 0.6);
    }
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
      for (const h of this.hazards) if (Math.hypot(h.x - this.bx, h.y - this.by) < 170 && h.kind !== 'reef' && h.kind !== 'gust') this.damageHazard(h, 4);
      if (this.beast && Math.hypot(this.beast.x - this.bx, this.beast.y - this.by) < 230) this.hitBeast(6);
    }
    this.bowWaveT += dt;
    if (Save.S().boat.uber && this.turretCd <= 0) this.uberTick();

    // Shots.
    for (const sh of this.shots) {
      sh.x += sh.vx * dt; sh.y += sh.vy * dt; sh.life -= dt;
      if (sh.foe) {
        if (Math.hypot(sh.x - this.bx, sh.y - this.by) < 20) { sh.life = 0; this.damageBoat(1); }
        continue;
      }
      for (const h of this.hazards) {
        if (h.dead || h.kind === 'whirl' || h.kind === 'reef' || h.kind === 'gust') continue;
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
      if (h.kind === 'mine' && d < 90 && h.armed === undefined) h.armed = 0.6;
      if (h.kind === 'mine' && h.armed !== undefined) {
        h.armed -= dt;
        if (h.armed <= 0) { this.explode(h.x, h.y, 80); h.dead = true; if (d < 80) this.damageBoat(2); continue; }
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
    else this.turretCd = 99;
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
      if (h.dead || h.kind === 'whirl' || h.kind === 'reef' || h.kind === 'tentacle' || h.kind === 'spout' || h.kind === 'gust') continue;
      if (Math.hypot(h.x - this.bx, h.y - this.by) < R + h.r) this.damageHazard(h, 3);
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
      if (h.kind === 'reef' || h.kind === 'tentacle' || h.kind === 'spout' || h.kind === 'gust') continue;
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
      if (h.dead || h.kind === 'whirl' || h.kind === 'reef' || h.kind === 'spout' || h.kind === 'tentacle' || h.kind === 'gust' || h.y > this.by) continue;
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
        Sfx.play(b.kind === 'wyrm' ? 'water-jet' : b.kind === 'brambleback' ? 'thorn' : b.kind === 'skyray' ? 'whoosh' : 'fireball');
      }
      if (b.attack === 'slam' && b.attackT > 1.0 && b.attackT - dt <= 1.0) {
        for (let i = 0; i < 3; i++) this.hazards.push({ kind: 'tentacle', x: Phaser.Math.Clamp(this.bx + (i - 1) * 110, 60, 900), y: this.by - 20, r: 26, hp: 999, maxHp: 999, t: 0, seed: i, dead: false });
      }
      if (b.attack === 'wave' && b.attackT > 0.8 && b.attackT - dt <= 0.8 && BEASTS[b.kind]?.spawn === 'gusts') {
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
    const B = BANDS[bi], N = BANDS[Math.min(BANDS.length - 1, bi + 1)];
    const k = bi < BANDS.length - 1 ? Phaser.Math.Clamp((this.dist - B.at) / (N.at - B.at), 0, 1) : 0;
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
    // The captain: a dot of your element at the tiller.
    const cap = pt(0, L * 0.4);
    g.fillStyle(this.elementColor, 1); g.fillCircle(cap.x, cap.y, 5);
  }

  private drawHazard(g: Phaser.GameObjects.Graphics, h: Hazard, t: number): void {
    const { x, y, r } = h;
    switch (h.kind) {
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
      case 'spout':
        g.fillStyle(0xd8f0ff, 0.5); g.fillCircle(x, y, r);
        for (let i = 0; i < 6; i++) { const k = ((t * 1.5 + i / 6) % 1); g.fillStyle(0xffffff, (1 - k) * 0.6); g.fillCircle(x + Math.sin(i * 2 + t) * 8, y - k * 40, 4 + k * 4); }
        break;
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
  }
}
