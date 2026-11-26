import Phaser from 'phaser';
import { FONT_DISPLAY, FONT_UI } from '../../ui';
import { Sfx } from '../../audio';
import * as Save from '../IslesSave';
import { allFish, getFishery, getIsleItem, getRod } from '../IslesRegistry';
import type { FishDef, FisheryDef, Pt } from '../IslesTypes';
import * as Quests from '../systems/Quests';

/**
 * Fishing: cast, wait for the bite, strike, then the reel — keep the catch band (held key raises
 * it, gravity drops it) over a fish that darts about the gauge. Fill the line meter to land it.
 * A thrashing fish (`fight` 5) moves fast and erratically; a better rod gives a wider band.
 */

type Phase = 'idle' | 'cast' | 'wait' | 'bite' | 'reel' | 'done';

const Z = 29000;
const GAUGE_H = 260;

const WATER_TINT: Record<FisheryDef['kind'], number> = {
  sea: 0x6ac8ff, lava: 0xff7a2f, pond: 0x7ad8c8, wax: 0xffe2a8, steam: 0xd8e8f0, oil: 0x6a5a3a,
  ice: 0xc8f0ff, ink: 0x2a2a3a, abyss: 0x3a6ab8, bog: 0x6a7a3a, syrup: 0xd88a3a,
  cloud: 0xf4f8ff, aurora: 0x8ae8d8, sand: 0xe0c080, cavern: 0x2a4a5a,
  charged: 0x8ad8ff, coolant: 0x7aff8a, quantum: 0xc8a8ff,
  venom: 0x9ae04a, blackwater: 0x1a1a24,
  gilded: 0xffd24a, lethe: 0xd8dce8,
  resonant: 0x7ab8e8, still: 0xb8c4d0,
  sunpool: 0xfff2b8, mana: 0x9ad8ff,
};

export class Fishing {
  private phase: Phase = 'idle';
  private fishery: FisheryDef | null = null;
  private bob: Pt = { x: 0, y: 0 };
  private from: Pt = { x: 0, y: 0 };
  private t = 0;
  private biteAt = 0;
  private biteUntil = 0;
  private fish: FishDef | null = null;
  // Reel state
  private bandY = 0.5;
  private bandV = 0;
  private fishY = 0.5;
  private fishV = 0;
  private fishTarget = 0.5;
  private progress = 0.3;
  private nextDart = 0;
  private gWorld: Phaser.GameObjects.Graphics;
  private gHud: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private onEnd: ((msg: string[]) => void) | null = null;

  constructor(private scene: Phaser.Scene) {
    this.gWorld = scene.add.graphics().setDepth(9500);
    this.gHud = scene.add.graphics().setScrollFactor(0).setDepth(Z);
    this.label = scene.add.text(0, 0, '', {
      fontFamily: FONT_DISPLAY, fontSize: '16px', color: '#ffffff', stroke: '#000', strokeThickness: 4, align: 'center',
    }).setScrollFactor(0).setDepth(Z + 1).setOrigin(0.5).setVisible(false);
  }

  get busy(): boolean { return this.phase !== 'idle'; }

  /** Why this water can't be fished right now, or null if it can. */
  static blocker(fisheryId: string): string | null {
    const fy = getFishery(fisheryId);
    if (!fy) return 'Nothing bites here.';
    const rodId = Save.S().rod;
    if (!rodId) return 'You need a fishing rod — any port\'s tackle stall sells them.';
    const rod = getRod(rodId);
    if (!rod?.kinds.includes(fy.kind)) {
      return fy.kind === 'lava' ? 'Your rod would melt in that. Only an obsidian rod fishes lava.'
        : fy.kind === 'abyss' ? 'The line runs out before it finds the bottom. Only a whalebone rod reaches the trench.'
        : fy.kind === 'syrup' ? 'Your line gums up and sets solid. Only a briarwood rod fishes syrup.'
        : fy.kind === 'cloud' ? 'The line just blows sideways in the updraft. Only a skyline rod casts into cloud.'
        : fy.kind === 'aurora' ? 'Your line frays to light the moment it touches. Only a skyline rod holds in starlight.'
        : fy.kind === 'sand' ? 'The hook just skitters over the dune. Only a delver rod\'s drill-lure bites into sand.'
        : fy.kind === 'cavern' ? 'Your line runs out halfway down the shaft. Only a delver rod reaches the black lake.'
        : fy.kind === 'charged' ? 'The line jumps in your hands and the rod sparks. Only an insulated rod fishes live water.'
        : fy.kind === 'coolant' ? 'The line glows, then goes brittle and snaps. Only an insulated rod holds in coolant.'
        : fy.kind === 'quantum' ? 'Your hook is in the well and also not. Only an insulated rod settles the question.'
        : fy.kind === 'venom' ? 'The line hisses and eats through where it touches. Only an antivenin rod fishes the fen.'
        : fy.kind === 'blackwater' ? 'Your line goes into the black and comes back without a shadow. Only an antivenin rod holds.'
        : fy.kind === 'gilded' ? 'The hook just rings off the coins and comes up bare. Only a fortune rod fishes gilded water.'
        : fy.kind === 'lethe' ? 'You cast, and forget why you are holding a rod. Only a fortune rod remembers the line.'
        : fy.kind === 'resonant' ? 'The pool rings when the line touches and the fish scatter. Only a tuning rod casts in tune.'
        : fy.kind === 'still' ? 'Your cast shatters the mirror and nothing will rise to it. Only a tuning rod falls silent.'
        : fy.kind === 'sunpool' ? 'The glare off the pool blinds you; you cannot even find your float. Only a prism rod splits it.'
        : fy.kind === 'mana' ? 'The line unravels into light where it touches the font. Only a prism rod holds in it.' : `Your ${rod?.name ?? 'rod'} can't handle ${fy.kind} water.`;
    }
    return null;
  }

  start(fisheryId: string, from: Pt, to: Pt, onEnd: (msg: string[]) => void): void {
    this.fishery = getFishery(fisheryId) ?? null;
    if (!this.fishery) return;
    this.onEnd = onEnd;
    this.from = { ...from };
    this.bob = { ...to };
    this.phase = 'cast';
    this.t = 0;
    this.fish = null;
    Sfx.play('whoosh');
  }

  private pick(): FishDef | null {
    const fy = this.fishery!;
    const rod = getRod(Save.S().rod ?? '');
    const pool = allFish().filter((f) => f.fisheries.includes(fy.id) && (!f.rod || f.rod === rod?.id || rodRank(rod?.id) >= rodRank(f.rod)) && Save.test(f.when));
    if (!pool.length) return null;
    const total = pool.reduce((a, f) => a + f.weight, 0);
    let r = Math.random() * total;
    for (const f of pool) { r -= f.weight; if (r <= 0) return f; }
    return pool[pool.length - 1];
  }

  /** `strike` = the action key went down this frame; `hold` = it is held. */
  update(dtMs: number, strike: boolean, hold: boolean, cancel: boolean): void {
    if (this.phase === 'idle') return;
    const dt = dtMs / 1000;
    this.t += dt;
    if (cancel && this.phase !== 'done') { this.end(['You reel in your line.']); return; }

    if (this.phase === 'cast' && this.t > 0.55) {
      this.phase = 'wait';
      this.biteAt = this.t + 1.6 + Math.random() * 4.2;
      Sfx.play('splash');
    } else if (this.phase === 'wait') {
      if (strike) { this.end(['Too early — the water goes still.']); return; }
      if (this.t >= this.biteAt) {
        this.fish = this.pick();
        if (!this.fish) { this.end(['Nothing is biting here.']); return; }
        this.phase = 'bite';
        this.biteUntil = this.t + 0.85;
        Sfx.play('ui-toast');
      }
    } else if (this.phase === 'bite') {
      if (strike) {
        this.phase = 'reel';
        this.bandY = 0.5; this.bandV = 0; this.fishY = 0.5; this.fishV = 0; this.fishTarget = 0.5;
        this.progress = 0.3; this.nextDart = this.t;
        Sfx.play('whip');
      } else if (this.t > this.biteUntil) {
        this.end(['It got away before you struck.']);
        return;
      }
    } else if (this.phase === 'reel') {
      this.reel(dt, hold);
    }
    this.draw();
  }

  private reel(dt: number, hold: boolean): void {
    const f = this.fish!;
    const rod = getRod(Save.S().rod ?? '');
    const control = rod?.control ?? 1;
    const bandHalf = 0.09 + 0.05 * control - f.fight * 0.008;
    // The band: hold to rise, release to sink.
    this.bandV += (hold ? 1.9 : -1.6) * dt;
    this.bandV *= Math.pow(0.18, dt);
    this.bandY = Phaser.Math.Clamp(this.bandY + this.bandV * dt * 1.6, bandHalf, 1 - bandHalf);
    if (this.bandY <= bandHalf || this.bandY >= 1 - bandHalf) this.bandV *= -0.3;
    // The fish darts between targets; stronger fish dart more often and further.
    if (this.t >= this.nextDart) {
      const reach = 0.18 + f.fight * 0.12;
      this.fishTarget = Phaser.Math.Clamp(this.fishY + (Math.random() * 2 - 1) * reach, 0.06, 0.94);
      this.nextDart = this.t + Math.max(0.35, 1.5 - f.fight * 0.22) * (0.6 + Math.random() * 0.8);
    }
    const pull = 2.2 + f.fight * 1.1;
    this.fishV += (this.fishTarget - this.fishY) * pull * dt * 6;
    this.fishV *= Math.pow(0.08, dt);
    this.fishY = Phaser.Math.Clamp(this.fishY + this.fishV * dt, 0.03, 0.97);
    const inBand = Math.abs(this.fishY - this.bandY) <= bandHalf;
    this.progress += (inBand ? 0.32 : -0.22 - f.fight * 0.03) * dt;
    if (this.progress >= 1) this.land();
    else if (this.progress <= 0) this.end([`The ${getIsleItem(f.id)?.name ?? 'fish'} snapped free.`]);
  }

  private land(): void {
    const f = this.fish!;
    const it = getIsleItem(f.id);
    const size = Math.round(f.size[0] + Math.random() * (f.size[1] - f.size[0]));
    const best = Save.S().fishLog[f.id]?.best ?? 0;
    const first = !Save.S().fishLog[f.id];
    Save.give(f.id, 1);
    Save.logFish(f.id, size);
    Sfx.play('reward-big');
    const msg = [`🎣 ${it?.emoji ?? '🐟'} ${it?.name ?? f.id} — ${size} cm${first ? '  (new!)' : size > best ? '  (record!)' : ''}`];
    msg.push(...Quests.notify({ kind: 'fish', fish: f.id }));
    this.end(msg);
  }

  private end(msg: string[]): void {
    this.phase = 'idle';
    this.gWorld.clear();
    this.gHud.clear();
    this.label.setVisible(false);
    const cb = this.onEnd;
    this.onEnd = null;
    cb?.(msg);
  }

  private draw(): void {
    const g = this.gWorld, h = this.gHud;
    g.clear(); h.clear();
    const tint = WATER_TINT[this.fishery?.kind ?? 'sea'];
    // Line + bobber.
    const k = this.phase === 'cast' ? Math.min(1, this.t / 0.55) : 1;
    const bx = this.from.x + (this.bob.x - this.from.x) * k;
    const by = this.from.y + (this.bob.y - this.from.y) * k - Math.sin(k * Math.PI) * 80;
    const tug = this.phase === 'bite' ? Math.sin(this.t * 40) * 3 : this.phase === 'reel' ? Math.sin(this.t * 25) * 2 : Math.sin(this.t * 3) * 1.2;
    g.lineStyle(1, 0xf2f2f2, 0.7);
    g.lineBetween(this.from.x + 14, this.from.y - 36, bx, by + tug);
    if (this.phase !== 'cast') {
      for (let r = 0; r < 3; r++) {
        const ph = ((this.t * 0.8 + r / 3) % 1);
        g.lineStyle(1.5, tint, (1 - ph) * 0.6);
        g.strokeEllipse(bx, by + 2, 10 + ph * 34, 4 + ph * 12);
      }
    }
    g.fillStyle(0xffffff, 1); g.fillCircle(bx, by + tug - 2, 4);
    g.fillStyle(0xe03a2a, 1); g.fillCircle(bx, by + tug + 1, 4);

    const W = this.scene.scale.width, H = this.scene.scale.height;
    if (this.phase === 'bite') {
      this.label.setVisible(true).setPosition(W / 2, H * 0.28).setText('❗ STRIKE! [E / click]').setScale(1 + Math.sin(this.t * 20) * 0.08);
    } else if (this.phase === 'wait') {
      this.label.setVisible(true).setPosition(W / 2, H * 0.28).setScale(1).setText('…wait for the bite…');
      this.label.setAlpha(0.6);
    } else {
      this.label.setVisible(false).setAlpha(1);
    }
    if (this.phase !== 'reel') return;
    this.label.setAlpha(1);
    const f = this.fish!;
    const gx = W - 150, gy = H / 2 - GAUGE_H / 2;
    h.fillStyle(0x000000, 0.45); h.fillRoundedRect(gx - 36, gy - 50, 120, GAUGE_H + 90, 14);
    h.fillStyle(0x1a2a34, 1); h.fillRoundedRect(gx - 14, gy, 36, GAUGE_H, 10);
    const rod = getRod(Save.S().rod ?? '');
    const bandHalf = 0.09 + 0.05 * (rod?.control ?? 1) - f.fight * 0.008;
    const yOf = (v: number) => gy + GAUGE_H - v * GAUGE_H;
    const inBand = Math.abs(this.fishY - this.bandY) <= bandHalf;
    h.fillStyle(inBand ? 0x6aff9a : 0x9ad8ff, 0.55);
    h.fillRoundedRect(gx - 12, yOf(this.bandY + bandHalf), 32, bandHalf * 2 * GAUGE_H, 6);
    h.lineStyle(2, 0xffffff, 0.8); h.strokeRoundedRect(gx - 12, yOf(this.bandY + bandHalf), 32, bandHalf * 2 * GAUGE_H, 6);
    // Fish icon
    const fy = yOf(this.fishY);
    h.fillStyle(tint, 1); h.fillEllipse(gx + 4, fy, 22, 11);
    h.fillTriangle(gx + 14, fy, gx + 22, fy - 6, gx + 22, fy + 6);
    h.fillStyle(0x000000, 1); h.fillCircle(gx - 2, fy - 1, 1.6);
    // Progress
    h.fillStyle(0x2a1a10, 1); h.fillRoundedRect(gx + 34, gy, 12, GAUGE_H, 5);
    h.fillStyle(this.progress > 0.66 ? 0x6aff9a : this.progress > 0.33 ? 0xffd27a : 0xff7a5a, 1);
    h.fillRoundedRect(gx + 34, gy + GAUGE_H * (1 - this.progress), 12, GAUGE_H * this.progress, 5);
    this.label.setVisible(true).setPosition(gx + 18, gy - 26).setScale(0.85).setText('HOLD [E / mouse]');
    void FONT_UI;
  }
}

const rodRank = (id?: string): number => (id === 'rod-obsidian' ? 3 : id === 'rod-iron' ? 2 : id ? 1 : 0);
