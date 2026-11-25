import Phaser from 'phaser';
import { isCheatMode } from '../../data/Cheats';
import { FONT_DISPLAY, FONT_UI } from '../../ui';
import { Sfx } from '../../audio';
import * as Save from '../IslesSave';
import { getArea, courtOfArea, isleOf, getIsle, ALL_ISLE_IDS, ISLES, benchSeats, courtChampions } from '../IslesRegistry';
import { benchOf } from '../content/pinnacle/spec';
import { drawPinnacle, OBS } from '../art/PinnacleArt';
import { findElementDef } from '../../data/ElementRoster';
import type { Pt } from '../IslesTypes';

/**
 * M: the isle map (where everything is, how each court stands, fast travel between attuned
 * waystones) and, on the second tab, the sea chart of all ten isles, the Far Wastes and the
 * Obsidian Pinnacle. Drawn as an old chart: parchment, ink coastlines, a compass rose.
 */

/** Where each area sits on its isle's chart (960×640 canvas). */
const ISLE_LAYOUT: Record<string, { pos: Record<string, Pt>; roads: [string, string][] }> = {
  fire: {
    pos: {
      caldera: { x: 480, y: 168 }, kiln: { x: 480, y: 108 },
      boilerworks: { x: 300, y: 300 }, hearth: { x: 480, y: 310 }, corona: { x: 660, y: 300 },
      powder: { x: 300, y: 450 }, emberport: { x: 480, y: 486 }, candlewick: { x: 660, y: 450 },
    },
    roads: [
      ['emberport', 'hearth'], ['emberport', 'powder'], ['emberport', 'candlewick'], ['hearth', 'caldera'],
      ['hearth', 'boilerworks'], ['hearth', 'corona'], ['boilerworks', 'powder'], ['corona', 'candlewick'], ['caldera', 'kiln'],
    ],
  },
  water: {
    pos: {
      abyssal: { x: 480, y: 168 }, undertow: { x: 480, y: 108 },
      inkwell: { x: 300, y: 300 }, tidewater: { x: 480, y: 310 }, rimefast: { x: 660, y: 300 },
      sailmaker: { x: 300, y: 450 }, brinehollow: { x: 480, y: 486 }, slickharbor: { x: 660, y: 450 },
    },
    roads: [
      ['brinehollow', 'tidewater'], ['brinehollow', 'sailmaker'], ['brinehollow', 'slickharbor'], ['tidewater', 'abyssal'],
      ['tidewater', 'inkwell'], ['tidewater', 'rimefast'], ['inkwell', 'sailmaker'], ['rimefast', 'slickharbor'], ['abyssal', 'undertow'],
    ],
  },
  life: {
    pos: {
      heartwood: { x: 480, y: 178 }, glasshouse: { x: 480, y: 104 },
      spore: { x: 300, y: 300 }, bloom: { x: 480, y: 310 }, ossuary: { x: 660, y: 300 },
      confection: { x: 300, y: 450 }, mossgate: { x: 480, y: 486 }, wildhunt: { x: 660, y: 450 },
    },
    roads: [
      ['mossgate', 'bloom'], ['mossgate', 'confection'], ['mossgate', 'wildhunt'], ['bloom', 'heartwood'],
      ['bloom', 'spore'], ['bloom', 'ossuary'], ['spore', 'confection'], ['ossuary', 'wildhunt'], ['heartwood', 'glasshouse'],
    ],
  },
  air: {
    pos: {
      starfall: { x: 480, y: 178 }, lung: { x: 480, y: 104 },
      slumber: { x: 300, y: 300 }, galeward: { x: 480, y: 310 }, stormeye: { x: 660, y: 300 },
      fable: { x: 300, y: 450 }, windlass: { x: 480, y: 486 }, orbit: { x: 660, y: 450 },
    },
    roads: [
      ['windlass', 'galeward'], ['windlass', 'fable'], ['windlass', 'orbit'], ['galeward', 'starfall'],
      ['galeward', 'slumber'], ['galeward', 'stormeye'], ['slumber', 'fable'], ['stormeye', 'orbit'], ['starfall', 'lung'],
    ],
  },
  earth: {
    pos: {
      rubble: { x: 480, y: 178 }, sepulchre: { x: 480, y: 104 },
      potter: { x: 300, y: 300 }, stonehold: { x: 480, y: 310 }, forge: { x: 660, y: 300 },
      dunesea: { x: 300, y: 450 }, quarrymouth: { x: 480, y: 486 }, geode: { x: 660, y: 450 },
    },
    roads: [
      ['quarrymouth', 'stonehold'], ['quarrymouth', 'dunesea'], ['quarrymouth', 'geode'], ['stonehold', 'rubble'],
      ['stonehold', 'potter'], ['stonehold', 'forge'], ['potter', 'dunesea'], ['forge', 'geode'], ['rubble', 'sepulchre'],
    ],
  },
  electricity: {
    pos: {
      superposition: { x: 480, y: 178 }, crowncoil: { x: 480, y: 104 },
      circuit: { x: 300, y: 300 }, dynamo: { x: 480, y: 310 }, lodestar: { x: 660, y: 300 },
      bounce: { x: 300, y: 450 }, terminus: { x: 480, y: 486 }, halflife: { x: 660, y: 450 },
    },
    roads: [
      ['terminus', 'dynamo'], ['terminus', 'bounce'], ['terminus', 'halflife'], ['dynamo', 'superposition'],
      ['dynamo', 'circuit'], ['dynamo', 'lodestar'], ['circuit', 'bounce'], ['lodestar', 'halflife'], ['superposition', 'crowncoil'],
    ],
  },
  slime: {
    pos: {
      grave: { x: 480, y: 178 }, slough: { x: 480, y: 104 },
      web: { x: 300, y: 300 }, fang: { x: 480, y: 310 }, cloak: { x: 660, y: 300 },
      shackle: { x: 300, y: 450 }, stilthaven: { x: 480, y: 486 }, umbral: { x: 660, y: 450 },
    },
    roads: [
      ['stilthaven', 'fang'], ['stilthaven', 'shackle'], ['stilthaven', 'umbral'], ['fang', 'grave'],
      ['fang', 'web'], ['fang', 'cloak'], ['web', 'shackle'], ['cloak', 'umbral'], ['grave', 'slough'],
    ],
  },
  fate: {
    pos: {
      war: { x: 480, y: 178 }, house: { x: 480, y: 104 },
      clockwork: { x: 300, y: 300 }, card: { x: 480, y: 310 }, remembrance: { x: 660, y: 300 },
      treasury: { x: 300, y: 450 }, tosswater: { x: 480, y: 486 }, mind: { x: 660, y: 450 },
    },
    roads: [
      ['tosswater', 'card'], ['tosswater', 'treasury'], ['tosswater', 'mind'], ['card', 'war'],
      ['card', 'clockwork'], ['card', 'remembrance'], ['clockwork', 'treasury'], ['remembrance', 'mind'], ['war', 'house'],
    ],
  },
  sound: {
    pos: {
      cathedral: { x: 480, y: 178 }, organ: { x: 480, y: 104 },
      cavern: { x: 300, y: 300 }, brass: { x: 480, y: 310 }, masque: { x: 660, y: 300 },
      libretto: { x: 300, y: 450 }, carillon: { x: 480, y: 486 }, hush: { x: 660, y: 450 },
    },
    roads: [
      ['carillon', 'brass'], ['carillon', 'libretto'], ['carillon', 'hush'], ['brass', 'cathedral'],
      ['brass', 'cavern'], ['brass', 'masque'], ['cavern', 'libretto'], ['masque', 'hush'], ['cathedral', 'organ'],
    ],
  },
  light: {
    pos: {
      tribunal: { x: 480, y: 178 }, heliostat: { x: 480, y: 104 },
      lantern: { x: 300, y: 300 }, noon: { x: 480, y: 310 }, workshop: { x: 660, y: 300 },
      mural: { x: 300, y: 450 }, meridian: { x: 480, y: 486 }, arcane: { x: 660, y: 450 },
    },
    roads: [
      ['meridian', 'noon'], ['meridian', 'mural'], ['meridian', 'arcane'], ['noon', 'tribunal'],
      ['noon', 'lantern'], ['noon', 'workshop'], ['lantern', 'mural'], ['workshop', 'arcane'], ['tribunal', 'heliostat'],
    ],
  },
  /** The Obsidian Pinnacle: no island — the stair zig-zags up the drawn spire, bench over bench, to the hall. */
  pinnacle: {
    pos: {
      'pin-landing': { x: 640, y: 548 },
      'bench-fire': { x: 360, y: 500 }, 'bench-water': { x: 600, y: 462 }, 'bench-life': { x: 360, y: 424 },
      'bench-air': { x: 600, y: 386 }, 'bench-earth': { x: 360, y: 348 }, 'bench-electricity': { x: 600, y: 310 },
      'bench-slime': { x: 360, y: 272 }, 'bench-fate': { x: 600, y: 234 }, 'bench-sound': { x: 360, y: 196 },
      'bench-light': { x: 600, y: 158 }, 'pin-summit': { x: 480, y: 104 },
    },
    roads: [
      ['pin-landing', 'bench-fire'], ['bench-fire', 'bench-water'], ['bench-water', 'bench-life'], ['bench-life', 'bench-air'],
      ['bench-air', 'bench-earth'], ['bench-earth', 'bench-electricity'], ['bench-electricity', 'bench-slime'],
      ['bench-slime', 'bench-fate'], ['bench-fate', 'bench-sound'], ['bench-sound', 'bench-light'], ['bench-light', 'pin-summit'],
    ],
  },
};

export class IslesMapScene extends Phaser.Scene {
  private from = '';
  private tab: 'isle' | 'sea' = 'isle';
  private sel = '';
  private g!: Phaser.GameObjects.Graphics;
  private dyn: Phaser.GameObjects.GameObject[] = [];
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private note = '';

  constructor() { super({ key: 'IslesMapScene' }); }

  init(data: { from: string }): void {
    this.from = data?.from ?? Save.S().area;
    this.sel = this.from;
    this.tab = 'isle';
    this.note = '';
  }

  create(): void {
    this.g = this.add.graphics();
    this.keys = this.input.keyboard!.addKeys('W,S,A,D,UP,DOWN,LEFT,RIGHT,E,SPACE,ENTER,ESC,M,Q,TAB') as Record<string, Phaser.Input.Keyboard.Key>;
    this.render();
  }

  private layout() {
    return ISLE_LAYOUT[isleOf(this.from) ?? 'fire'] ?? ISLE_LAYOUT.fire;
  }

  private close(): void {
    this.scene.resume('IsleWorldScene');
    this.scene.stop();
  }

  update(time: number): void {
    const k = this.keys, JD = Phaser.Input.Keyboard.JustDown;
    if (JD(k.ESC) || JD(k.M) || JD(k.Q)) { this.close(); return; }
    if (JD(k.TAB)) { this.tab = this.tab === 'isle' ? 'sea' : 'isle'; Sfx.play('ui-tab'); this.render(); }
    if (this.tab === 'isle') {
      const dir = (dx: number, dy: number) => {
        const L = this.layout();
        const cur = L.pos[this.sel] ?? { x: 480, y: 320 };
        let best = '', bd = Infinity;
        for (const [id, p] of Object.entries(L.pos)) {
          if (id === this.sel || !getArea(id)) continue;
          const vx = p.x - cur.x, vy = p.y - cur.y;
          const along = vx * dx + vy * dy;
          if (along <= 0) continue;
          const d = Math.hypot(vx, vy) + Math.abs(vx * dy - vy * dx) * 1.5;
          if (d < bd) { bd = d; best = id; }
        }
        if (best) { this.sel = best; Sfx.play('ui-hover'); this.render(); }
      };
      if (JD(k.W) || JD(k.UP)) dir(0, -1);
      if (JD(k.S) || JD(k.DOWN)) dir(0, 1);
      if (JD(k.A) || JD(k.LEFT)) dir(-1, 0);
      if (JD(k.D) || JD(k.RIGHT)) dir(1, 0);
      if (JD(k.E) || JD(k.SPACE) || JD(k.ENTER)) this.travel(this.sel);
    }
    this.draw(time / 1000);
  }

  private travel(id: string): void {
    const a = getArea(id);
    if (!a) return;
    if (id === this.from) { this.close(); return; }
    if (!Save.S().waystones.includes(id) && !isCheatMode()) { Sfx.play('ui-denied'); this.note = `Walk to ${a.name} and touch its waystone first.`; this.render(); return; }
    const ws = a.pois.find((p) => p.kind === 'waystone');
    const pos = ws && 'at' in ws ? { x: ws.at.x, y: ws.at.y + 46 } : a.spawn;
    Sfx.play('teleport');
    Save.setPlace(id, pos);
    this.scene.stop('IsleWorldScene');
    this.scene.start('IsleWorldScene', { area: id, pos });
  }

  private draw(t: number): void {
    const W = this.scale.width, H = this.scale.height;
    const g = this.g;
    g.clear();
    // Parchment
    g.fillStyle(0x000000, 0.7); g.fillRect(0, 0, W, H);
    g.fillStyle(0x2a1c10, 1); g.fillRoundedRect(26, 26, W - 52, H - 52, 18);
    g.fillStyle(0xd9c49a, 1); g.fillRoundedRect(34, 34, W - 68, H - 68, 14);
    g.fillStyle(0xc8b088, 0.6);
    for (let i = 0; i < 40; i++) g.fillCircle(60 + ((i * 197) % (W - 120)), 60 + ((i * 131) % (H - 120)), 10 + (i % 7) * 6);
    // Sea hatch
    g.lineStyle(1, 0x8a7a5a, 0.35);
    for (let y = 50; y < H - 40; y += 16) {
      g.beginPath();
      for (let x = 44; x < W - 44; x += 12) { const yy = y + Math.sin(x * 0.05 + y + t * 0.6) * 2; if (x === 44) g.moveTo(x, yy); else g.lineTo(x, yy); }
      g.strokePath();
    }
    if (this.tab === 'isle') this.drawIsle(g, t);
    else this.drawSea(g, t);
    // Compass rose
    const cx = W - 96, cy = H - 96;
    g.fillStyle(0x6a4a2a, 1);
    g.fillTriangle(cx, cy - 36, cx - 7, cy, cx + 7, cy);
    g.fillStyle(0x3a2814, 1);
    g.fillTriangle(cx, cy + 36, cx - 7, cy, cx + 7, cy);
    g.fillTriangle(cx - 36, cy, cx, cy - 7, cx, cy + 7);
    g.fillTriangle(cx + 36, cy, cx, cy - 7, cx, cy + 7);
    g.lineStyle(1.5, 0x3a2814, 1); g.strokeCircle(cx, cy, 22);
  }

  private drawIsle(g: Phaser.GameObjects.Graphics, t: number): void {
    const L = this.layout();
    const here = isleOf(this.from) ?? 'fire';
    // The island outline (the Pinnacle has none: it is all spire).
    const pts: Phaser.Geom.Point[] = [];
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      const r = 1 + Math.sin(a * 3 + 1) * 0.06 + Math.sin(a * 7) * 0.035;
      pts.push(new Phaser.Geom.Point(480 + Math.cos(a) * 300 * r, 315 + Math.sin(a) * 230 * r));
    }
    if (here !== 'pinnacle') {
      g.fillStyle(0xb89a6a, 1); g.fillPoints(pts, true, true);
      g.lineStyle(3, 0x4a3218, 1); g.strokePoints(pts, true, true);
      g.lineStyle(1, 0x4a3218, 0.4);
      g.strokePoints(pts.map((p) => new Phaser.Geom.Point(480 + (p.x - 480) * 1.05, 315 + (p.y - 315) * 1.05)), true, true);
    }
    if (here === 'pinnacle') {
      this.drawSpireChart(g, t);
    } else if (here === 'water') {
      // The maelstrom off the trench, and the half-drowned low shore.
      for (let i = 0; i < 5; i++) {
        g.lineStyle(2.5 - i * 0.3, 0x2a5a7a, 0.8 - i * 0.12);
        g.beginPath(); g.arc(480, 104, 12 + i * 9, t * 1.4 + i, t * 1.4 + i + Math.PI * 1.4, false); g.strokePath();
      }
      g.fillStyle(0x0a1a2a, 1); g.fillCircle(480, 104, 6);
      g.fillStyle(0x7aa8b8, 0.35); g.fillEllipse(480, 520, 360, 50);
    } else if (here === 'life') {
      // The Heartwood: one colossal tree on the crown, the Glasshouse dome glinting in its branches.
      g.fillStyle(0x5a3a1e, 1); g.fillRect(470, 150, 20, 60);
      for (const [dx, dy, r] of [[0, -36, 52], [-40, -14, 34], [42, -16, 36], [-18, -60, 30], [22, -58, 28]] as const) {
        g.fillStyle(0x4a7a3a, 1); g.fillCircle(480 + dx, 150 + dy, r);
        g.fillStyle(0x6a9a4a, 0.6); g.fillCircle(480 + dx - r * 0.25, 150 + dy - r * 0.25, r * 0.5);
      }
      g.fillStyle(0xd8f0f0, 0.75 + Math.sin(t * 2) * 0.15); g.fillEllipse(480, 104, 34, 18);
      g.lineStyle(1, 0x3a4a3a, 1); g.strokeEllipse(480, 104, 34, 18); g.lineBetween(480, 95, 480, 113);
    } else if (here === 'air') {
      // The spire: one needle of rock through a ring of cloud, the Lung's windmill sails turning on top.
      g.fillStyle(0x7a7a84, 1); g.fillTriangle(452, 236, 508, 236, 480, 112);
      g.fillStyle(0x9a9aa4, 1); g.fillTriangle(466, 236, 486, 236, 480, 120);
      for (let i = 0; i < 7; i++) {
        const cx = 400 + i * 27, cy = 196 + Math.sin(i * 1.9) * 5;
        g.fillStyle(0xffffff, 0.85); g.fillCircle(cx + Math.sin(t * 0.6 + i) * 3, cy, 14 + (i % 3) * 3);
      }
      g.fillStyle(0x5a4a3a, 1); g.fillRect(476, 100, 8, 14);
      g.lineStyle(2.5, 0xe8e0d0, 1);
      for (let k = 0; k < 4; k++) { const a = t * 1.2 + k * Math.PI / 2; g.lineBetween(480, 104, 480 + Math.cos(a) * 18, 104 + Math.sin(a) * 18); }
      g.fillStyle(0x3a3a42, 1); g.fillCircle(480, 104, 3);
    } else if (here === 'electricity') {
      // The Crown Coil: a copper tower of stacked rings on a black peak, arcs jumping off its crown
      // into the storm, the Grid's cables sagging away down the slopes.
      g.fillStyle(0x1e2230, 1); g.fillTriangle(390, 236, 570, 236, 480, 120);
      g.lineStyle(1.5, 0xc87a3a, 0.7);
      for (const [x1, y1] of [[330, 290], [640, 290], [300, 440], [660, 440]]) { g.beginPath(); g.moveTo(480, 150); g.lineTo((480 + x1) / 2, (150 + y1) / 2 + 14); g.lineTo(x1, y1); g.strokePath(); }
      g.fillStyle(0x8a5a2a, 1); g.fillRect(474, 96, 12, 40);
      for (let k = 0; k < 4; k++) { g.lineStyle(3, 0xd88a4a, 1); g.strokeEllipse(480, 132 - k * 9, 34 - k * 6, 8 - k); }
      g.fillStyle(0xd8e8ff, 1); g.fillCircle(480, 92, 6);
      if ((t * 1.7) % 1 < 0.35) {
        g.lineStyle(2, 0xbfe8ff, 1);
        for (const dir of [-1, 1]) { g.beginPath(); g.moveTo(480, 92); g.lineTo(480 + dir * 14, 80); g.lineTo(480 + dir * 10, 70); g.lineTo(480 + dir * 26, 58); g.strokePath(); }
      }
    } else if (here === 'slime') {
      // The deep mire on the crown: a black pool with the Slough lying coiled in it — the Matriarch's
      // cast skin, pale and scaled, wound round on itself with its hollow head raised at the top —
      // rows of great white fangs standing out of the swamp, and marsh gas bubbling up.
      g.fillStyle(0x0e1a10, 1); g.fillEllipse(480, 150, 230, 120);
      g.fillStyle(0x1a2e1a, 1); g.fillEllipse(480, 146, 200, 98);
      g.lineStyle(9, 0xb8b498, 1);
      g.beginPath();
      for (let k = 0; k <= 60; k++) { const u = k / 60, a = u * Math.PI * 4.2 + 0.4, rr = 66 - u * 52; const px = 480 + Math.cos(a) * rr, py = 146 + Math.sin(a) * rr * 0.42; if (k === 0) g.moveTo(px, py); else g.lineTo(px, py); }
      g.strokePath();
      g.lineStyle(1, 0x7a7a60, 0.8);
      for (let k = 2; k < 60; k += 3) { const u = k / 60, a = u * Math.PI * 4.2 + 0.4, rr = 66 - u * 52; const px = 480 + Math.cos(a) * rr, py = 146 + Math.sin(a) * rr * 0.42; g.strokeEllipse(px, py, 5, 3); }
      g.lineStyle(7, 0xd8d4b8, 1); g.lineBetween(486, 144, 482, 120);
      g.fillStyle(0xd8d4b8, 1); g.fillEllipse(480, 112, 30, 18);
      g.fillStyle(0x1a1a14, 1); g.fillCircle(473, 109, 2.5); g.fillCircle(487, 109, 2.5);
      g.fillStyle(0x0a0a08, 1); g.fillEllipse(480, 118, 14, 4);
      for (const [fx, fy, h] of [[372, 214, 26], [392, 222, 20], [410, 212, 30], [550, 212, 30], [568, 222, 20], [588, 214, 26], [262, 380, 18], [700, 380, 18]] as const) {
        g.fillStyle(0x8a8470, 1); g.fillTriangle(fx - 6, fy, fx + 6, fy, fx + 3, fy - h);
        g.fillStyle(0xf4eedc, 1); g.fillTriangle(fx - 5, fy, fx + 4, fy, fx + 2, fy - h + 2);
        g.fillStyle(0x7ad83a, 0.7); g.fillCircle(fx + 2.5, fy - h + 4 + ((t * 0.6 + fx * 0.01) % 1) * 8, 1.5);
      }
      for (let i = 0; i < 6; i++) {
        const k = (t * 0.5 + i / 6) % 1, bx = 420 + ((i * 47) % 120), by = 176 - k * 18;
        g.lineStyle(1, 0x9af05a, 0.6 * (1 - k)); g.strokeCircle(bx, by, 2 + k * 3);
      }
      g.fillStyle(0x2a3a1a, 0.35); g.fillEllipse(480, 400, 420, 120);
    } else if (here === 'fate') {
      // The House on the summit: a gilt-domed casino-palace on a terrace of black and red squares, its
      // great roulette Wheel standing on the roof and turning, red and black wedges round a gilt hub with
      // the ball running the rim; hedges clipped into the four suits on the lawns below.
      for (let row = 0; row < 3; row++) for (let k = 0; k < 14; k++) {
        g.fillStyle((row + k) % 2 ? 0x1a1418 : 0x9a2a2a, 0.75); g.fillRect(410 + k * 10, 208 + row * 6, 10, 6);
      }
      g.fillStyle(0x6a5a40, 1); g.fillRect(400, 150, 160, 58);
      g.fillStyle(0xe8dcc0, 1); g.fillRect(404, 154, 152, 52);
      g.fillStyle(0xb89a5a, 1); g.fillRect(398, 148, 164, 6); g.fillRect(398, 200, 164, 8);
      for (let k = 0; k < 9; k++) { g.fillStyle(0xc8b898, 1); g.fillRect(410 + k * 17, 158, 5, 42); g.fillStyle(0x3a2a1a, 0.6); g.fillRect(417 + k * 17, 166, 7, 26); }
      g.fillStyle(0x2a1a0c, 1); g.fillRoundedRect(470, 178, 20, 24, { tl: 10, tr: 10, bl: 0, br: 0 });
      for (const dx of [-66, 66]) {
        g.fillStyle(0xc8a040, 1); g.beginPath(); g.arc(480 + dx, 148, 14, Math.PI, 0, false); g.closePath(); g.fillPath();
        g.fillStyle(0xf0d070, 0.8); g.fillEllipse(480 + dx - 5, 141, 6, 4);
        g.lineStyle(1.5, 0x6a4a1a, 1); g.lineBetween(480 + dx, 134, 480 + dx, 126); g.fillStyle(0xe8c050, 1); g.fillCircle(480 + dx, 125, 2);
      }
      // The Wheel's stand and the wheel itself.
      g.fillStyle(0x6a4a1a, 1); g.fillTriangle(452, 150, 470, 150, 480, 104); g.fillTriangle(490, 150, 508, 150, 480, 104);
      const WR = 40, spin = t * 0.9;
      g.fillStyle(0x3a2410, 1); g.fillCircle(480, 104, WR + 5);
      g.fillStyle(0xc8a040, 1); g.fillCircle(480, 104, WR + 2);
      for (let k = 0; k < 18; k++) {
        const a0 = spin + k * (Math.PI * 2 / 18);
        g.fillStyle(k === 0 ? 0x2a8a3a : k % 2 ? 0x1a1418 : 0xb8202a, 1);
        g.slice(480, 104, WR, a0, a0 + Math.PI * 2 / 18, false); g.fillPath();
      }
      g.lineStyle(1, 0xe8c050, 0.9);
      for (let k = 0; k < 18; k++) { const a = spin + k * (Math.PI * 2 / 18); g.lineBetween(480 + Math.cos(a) * 22, 104 + Math.sin(a) * 22, 480 + Math.cos(a) * WR, 104 + Math.sin(a) * WR); }
      g.lineStyle(2, 0xe8c050, 1); g.strokeCircle(480, 104, WR);
      const ba = -t * 2.3;
      g.fillStyle(0xffffff, 1); g.fillCircle(480 + Math.cos(ba) * (WR - 3), 104 + Math.sin(ba) * (WR - 3), 2.4);
      for (let k = 0; k < 8; k++) { const a = spin + k * Math.PI / 4; g.fillStyle(0xf0d070, 1); g.fillCircle(480 + Math.cos(a) * (WR + 2), 104 + Math.sin(a) * (WR + 2), 1.6); }
      // Hedges in the four suits.
      const suit = (x: number, y: number, k: number) => {
        g.fillStyle(0x3a6a2a, 1);
        if (k === 0) { g.fillCircle(x - 5, y - 3, 6); g.fillCircle(x + 5, y - 3, 6); g.fillTriangle(x - 11, y - 1, x + 11, y - 1, x, y + 12); }
        else if (k === 1) { g.fillTriangle(x, y - 12, x - 9, y, x + 9, y); g.fillTriangle(x, y + 12, x - 9, y, x + 9, y); }
        else if (k === 2) { g.fillCircle(x, y - 6, 5.5); g.fillCircle(x - 6, y + 2, 5.5); g.fillCircle(x + 6, y + 2, 5.5); g.fillRect(x - 1.5, y, 3, 10); }
        else { g.fillTriangle(x, y - 12, x - 10, y + 2, x + 10, y + 2); g.fillCircle(x - 5, y + 2, 5); g.fillCircle(x + 5, y + 2, 5); g.fillRect(x - 1.5, y + 2, 3, 9); }
        g.fillStyle(0x6a9a4a, 0.6); g.fillCircle(x - 3, y - 4, 2.5);
      };
      suit(390, 380, 0); suit(570, 380, 1); suit(240, 375, 2); suit(720, 375, 3);
    } else if (here === 'sound') {
      // Choirholm's summit: snow-capped concert-hall terraces stepping up to the Maestro's cathedral —
      // twin belfries, a rose window, a long nave of lancets — with the Great Organ's pipes rising out of
      // its roof like a crown of silver spears, mouths glowing as it plays and notes drifting off it;
      // bell-buoys rocking in the swell below.
      for (let k = 0; k < 4; k++) {
        const w = 420 - k * 80, cy = 250 - k * 22;
        g.fillStyle(k % 2 ? 0x5a5a68 : 0x4a4a58, 1); g.fillEllipse(480, cy, w, 46 - k * 4);
        g.fillStyle(0xeef2f8, 0.85); g.fillEllipse(480, cy - 8 + k, w * 0.96, 16 - k * 2);
        g.lineStyle(1, 0x8a8a9a, 0.6);
        for (let s = 0; s < 9 - k; s++) { const sx = 480 - w * 0.4 + s * (w * 0.8 / (8 - k)); g.lineBetween(sx, cy - 2, sx + 3, cy + 8); }
      }
      // The nave and its lancets.
      g.fillStyle(0x3a3440, 1); g.fillRect(424, 150, 112, 54);
      g.fillStyle(0x8a8478, 1); g.fillRect(428, 154, 104, 50);
      g.fillStyle(0x5a3a4a, 1); g.fillTriangle(420, 154, 540, 154, 480, 128);
      g.fillStyle(0xeef2f8, 0.8); g.fillTriangle(436, 150, 524, 150, 480, 132);
      for (let k = 0; k < 6; k++) {
        const lx = 436 + k * 17, c = [0xc8202a, 0x2a4ad8, 0xe8b830, 0x2a9a5a][k % 4];
        g.fillStyle(0x2a2430, 1); g.fillRect(lx, 166, 8, 26); g.fillTriangle(lx, 166, lx + 8, 166, lx + 4, 160);
        g.fillStyle(c, 0.6 + Math.sin(t * 1.3 + k) * 0.15); g.fillRect(lx + 1.5, 167, 5, 23);
      }
      g.fillStyle(0x1a1418, 1); g.fillRoundedRect(472, 182, 16, 22, { tl: 8, tr: 8, bl: 0, br: 0 });
      // Twin belfries with their bells swinging.
      for (const dx of [-62, 62]) {
        const bx = 480 + dx;
        g.fillStyle(0x3a3440, 1); g.fillRect(bx - 12, 120, 24, 84);
        g.fillStyle(0x9a9488, 1); g.fillRect(bx - 10, 122, 20, 82);
        g.fillStyle(0x2a2430, 1); g.fillRect(bx - 6, 130, 12, 14);
        const sw = Math.sin(t * 1.6 + dx) * 2;
        g.fillStyle(0xb8823a, 1); g.fillTriangle(bx - 5 + sw, 142, bx + 5 + sw, 142, bx + sw, 132); g.fillEllipse(bx + sw, 142, 11, 3);
        g.fillStyle(0x5a3a4a, 1); g.fillTriangle(bx - 14, 122, bx + 14, 122, bx, 92);
        g.fillStyle(0xeef2f8, 0.8); g.fillTriangle(bx - 8, 116, bx + 2, 116, bx - 2, 100);
        g.fillStyle(0xe8c050, 1); g.fillCircle(bx, 90, 2);
      }
      // The rose window.
      g.fillStyle(0x2a2430, 1); g.fillCircle(480, 146, 11);
      for (let k = 0; k < 8; k++) { const a0 = t * 0.2 + k * (Math.PI / 4); g.fillStyle([0xc8202a, 0x2a4ad8, 0xe8b830, 0x8a3ac8][k % 4], 0.85); g.slice(480, 146, 9, a0, a0 + Math.PI / 4, false); g.fillPath(); }
      g.lineStyle(1, 0x2a2430, 1); g.strokeCircle(480, 146, 9); g.fillStyle(0xe8c050, 1); g.fillCircle(480, 146, 2);
      // The Great Organ's pipes: a crown of silver spears through the roof, tallest in the middle.
      const playing = Math.floor(t * 2.2) % 9;
      for (let k = 0; k < 9; k++) {
        const off = k - 4, px = 480 + off * 7, h = 62 - Math.abs(off) * 7, top = 136 - h;
        g.fillStyle(0x4a4a56, 1); g.fillRect(px - 3, top - 1, 6, h + 1);
        g.fillStyle(0xc8ccd8, 1); g.fillRect(px - 2.4, top, 4.8, h);
        g.fillStyle(0x8a8e9a, 1); g.fillRect(px + 0.6, top, 1.8, h);
        g.fillStyle(0xffffff, 0.7); g.fillRect(px - 1.6, top + 2, 0.8, h - 8);
        g.fillStyle(0xc8ccd8, 1); g.fillTriangle(px - 3, top, px + 3, top, px, top - 7);
        const on = k === playing;
        g.fillStyle(on ? 0xfff0b0 : 0x14141a, 1); g.fillRect(px - 1.6, 126, 3.2, 3);
        if (on) { g.fillStyle(0xffd870, 0.3); g.fillCircle(px, 127, 6); }
      }
      // Notes drifting off the Organ on the wind.
      for (let i = 0; i < 4; i++) {
        const k = (t * 0.25 + i / 4) % 1, nx = 480 + (i % 2 ? 1 : -1) * (14 + k * 70) + Math.sin(t * 2 + i) * 4, ny = 84 - k * 40;
        g.fillStyle(0xf4ecd8, 0.8 * (1 - k)); g.fillEllipse(nx, ny, 5, 3.6);
        g.lineStyle(1, 0xf4ecd8, 0.8 * (1 - k)); g.lineBetween(nx + 2.3, ny, nx + 2.3, ny - 9);
        if (i % 2) g.lineBetween(nx + 2.3, ny - 9, nx + 5.5, ny - 5);
      }
      // Bell-buoys in the swell.
      for (const [bx, by] of [[230, 520], [730, 520], [140, 300], [820, 300]] as const) {
        const rock = Math.sin(t * 1.4 + bx) * 0.25;
        g.fillStyle(0xffffff, 0.2); g.fillEllipse(bx, by + 6, 26, 6);
        g.fillStyle(0xb8202a, 1); g.fillEllipse(bx, by + 2, 16, 7);
        g.lineStyle(1.5, 0x3a2a20, 1); g.lineBetween(bx - 5, by, bx - 3 + rock * 10, by - 14); g.lineBetween(bx + 5, by, bx + 3 + rock * 10, by - 14);
        g.fillStyle(0xb8823a, 1); g.fillTriangle(bx - 4 + rock * 8, by - 4, bx + 4 + rock * 8, by - 4, bx + rock * 9, by - 12);
      }
    } else if (here === 'light') {
      // Solmara's summit: white limestone terraces stepping up, gilded domes on them, to the Heliostat —
      // an iron crown of lattice legs and arms, each arm holding a great mirror that tilts on its pivot —
      // and above it the sun, pinned overhead on its chain, blazing; beams strike down off the mirrors
      // and glint as each one turns to the light. Mirror-buoys flash in the white sea below.
      const SX = 480, SY = 64;
      // Terraces of white stone with gilded domes.
      for (let k = 0; k < 4; k++) {
        const w = 420 - k * 84, cy = 252 - k * 24;
        g.fillStyle(k % 2 ? 0xc8bca0 : 0xb8ac90, 1); g.fillEllipse(480, cy + 4, w, 44 - k * 4);
        g.fillStyle(0xf4eedc, 1); g.fillEllipse(480, cy - 4, w * 0.97, 30 - k * 3);
        g.fillStyle(0xffffff, 0.5); g.fillEllipse(480 - w * 0.12, cy - 8, w * 0.5, 6);
        g.lineStyle(1, 0xa89a7a, 0.6);
        for (let s = 0; s < 10 - k * 2; s++) { const sx = 480 - w * 0.42 + s * (w * 0.84 / (9 - k * 2)); g.lineBetween(sx, cy + 4, sx, cy + 14 - k); }
      }
      for (const [dx, dy, r] of [[-150, 232, 9], [140, 236, 8], [-86, 206, 7], [92, 208, 7], [-40, 186, 6], [44, 184, 6]] as const) {
        const dxp = 480 + dx;
        g.fillStyle(0xe8dcc0, 1); g.fillRect(dxp - r, dy - 2, r * 2, 8);
        g.fillStyle(0xb88a2a, 1); g.beginPath(); g.arc(dxp, dy - 2, r, Math.PI, 0, false); g.closePath(); g.fillPath();
        g.fillStyle(0xf8d860, 1); g.beginPath(); g.arc(dxp, dy - 2, r * 0.8, Math.PI * 1.05, Math.PI * 1.5, false); g.lineTo(dxp, dy - 2); g.closePath(); g.fillPath();
        g.fillStyle(0xfff4b0, 1); g.fillCircle(dxp, dy - 2 - r - 1.5, 1.4);
        const gl = Math.max(0, Math.sin(t * 1.7 + dx * 0.05));
        if (gl > 0.9) { const s = (gl - 0.9) * 60; g.lineStyle(1, 0xffffff, 0.9); g.lineBetween(dxp - r * 0.4 - s, dy - r * 0.6, dxp - r * 0.4 + s, dy - r * 0.6); g.lineBetween(dxp - r * 0.4, dy - r * 0.6 - s, dxp - r * 0.4, dy - r * 0.6 + s); }
      }
      // The sun's glare washing the summit.
      g.fillStyle(0xfff4c0, 0.22 + 0.06 * Math.sin(t * 1.3)); g.fillCircle(SX, SY + 40, 120);
      g.fillStyle(0xfff8e0, 0.18); g.fillCircle(SX, SY + 20, 70);
      // The Heliostat's iron legs: a lattice cone rising from the summit to its crown ring.
      const ringY = 130, ringR = 70;
      for (const k of [-1, -0.45, 0.45, 1]) {
        const fx = 480 + k * 92, tx2 = 480 + k * 54;
        g.lineStyle(4, 0x2a2a30, 1); g.lineBetween(fx, 210, tx2, ringY + 8);
        g.lineStyle(1.6, 0x6a6a74, 1); g.lineBetween(fx - 1, 210, tx2 - 1, ringY + 8);
        g.lineStyle(1, 0x3a3a44, 0.9);
        for (let s = 0; s < 4; s++) {
          const u0 = s / 4, u1 = (s + 1) / 4;
          const ax = Phaser.Math.Linear(fx, tx2, u0), ay = Phaser.Math.Linear(210, ringY + 8, u0), bx = Phaser.Math.Linear(fx, tx2, u1), by = Phaser.Math.Linear(210, ringY + 8, u1);
          g.lineBetween(ax - 5, ay, bx + 5, by); g.lineBetween(ax + 5, ay, bx - 5, by);
        }
      }
      // Crown ring (back half), then the mirrors on their arms, then the front half of the ring.
      g.lineStyle(5, 0x22222a, 1); g.beginPath(); g.arc(480, ringY, ringR, Math.PI, Math.PI * 2, false); g.strokePath();
      const mirrors: { x: number; y: number; tilt: number; front: boolean }[] = [];
      for (let k = 0; k < 9; k++) {
        const a = Math.PI + (k / 8) * Math.PI, mx = 480 + Math.cos(a) * ringR, my = ringY + Math.sin(a) * ringR * 0.35;
        mirrors.push({ x: mx, y: my - 16, tilt: Math.sin(t * 0.6 + k * 0.8), front: false });
      }
      for (let k = 0; k < 4; k++) {
        const a = (k + 0.5) / 4 * Math.PI, mx = 480 + Math.cos(a) * ringR, my = ringY + Math.sin(a) * ringR * 0.35;
        mirrors.push({ x: mx, y: my - 14, tilt: Math.sin(t * 0.6 + k * 1.3 + 2), front: true });
      }
      const drawMirror = (m: { x: number; y: number; tilt: number }, i: number) => {
        const w = 6 + Math.abs(m.tilt) * 6, h = 18;
        g.lineStyle(2, 0x2a2a30, 1); g.lineBetween(m.x, m.y + h / 2, m.x, m.y + h / 2 + 10);
        g.fillStyle(0x3a3a44, 1); g.fillRect(m.x - w - 1.5, m.y - h / 2 - 1.5, w * 2 + 3, h + 3);
        const face = m.tilt > 0 ? 0xdce8f0 : 0xa8b8c8;
        g.fillStyle(face, 1); g.fillRect(m.x - w, m.y - h / 2, w * 2, h);
        g.fillStyle(0xffffff, 0.55); g.fillTriangle(m.x - w, m.y - h / 2, m.x - w + w * 0.9, m.y - h / 2, m.x - w, m.y + h * 0.1);
        g.fillStyle(0xc8a050, 1); g.fillCircle(m.x, m.y + h / 2 + 1, 1.6);
        // Glint as it turns face-on to the sun.
        if (m.tilt > 0.9) {
          const k = (m.tilt - 0.9) * 10, s = 4 + k * 8;
          g.fillStyle(0xffffff, 0.9 * k); g.fillCircle(m.x, m.y - 2, 2.4);
          g.lineStyle(1, 0xffffff, 0.85 * k); g.lineBetween(m.x - s, m.y - 2, m.x + s, m.y - 2); g.lineBetween(m.x, m.y - 2 - s, m.x, m.y - 2 + s);
        }
        // The beam it throws down onto the isle.
        const ba = 0.07 + 0.06 * Math.sin(t * 0.9 + i * 1.7);
        const tx3 = m.x + (m.x - 480) * 0.9 + m.tilt * 20, ty3 = 220 + (i % 3) * 22;
        g.fillStyle(0xfff4c8, ba); g.fillTriangle(m.x - 3, m.y, m.x + 3, m.y, tx3, ty3);
      };
      mirrors.filter((m) => !m.front).forEach((m, i) => drawMirror(m, i));
      // The chain up to the sun, swaying a little.
      const csw = Math.sin(t * 0.7) * 1.5;
      for (let k = 0; k < 7; k++) {
        const ly = ringY - 20 - k * 6, lx = SX + csw * (k / 7);
        g.lineStyle(1.6, 0x2a2a30, 1); if (k % 2) g.strokeEllipse(lx, ly, 3, 6); else g.strokeEllipse(lx, ly, 5, 4);
      }
      g.lineStyle(5, 0x22222a, 1); g.beginPath(); g.arc(480, ringY, ringR, 0, Math.PI, false); g.strokePath();
      g.lineStyle(1.5, 0x8a8a96, 0.9); g.beginPath(); g.arc(480, ringY - 1.5, ringR, 0.2, Math.PI - 0.2, false); g.strokePath();
      for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; g.fillStyle(0x5a5a66, 1); g.fillCircle(480 + Math.cos(a) * ringR, ringY + Math.sin(a) * ringR * 0.35, 1.6); }
      mirrors.filter((m) => m.front).forEach((m, i) => drawMirror(m, i + 9));
      // The pinned sun: corona, slowly turning rays, a white-gold disc.
      const pul = 0.85 + 0.15 * Math.sin(t * 2.2);
      g.fillStyle(0xffe890, 0.16 * pul); g.fillCircle(SX, SY, 30);
      g.fillStyle(0xfff0b0, 0.3 * pul); g.fillCircle(SX, SY, 20);
      for (let k = 0; k < 16; k++) {
        const a = t * 0.25 + k * (Math.PI / 8), l = k % 2 ? 20 : 27;
        g.fillStyle(k % 2 ? 0xffe070 : 0xffc840, 0.85);
        g.fillTriangle(SX + Math.cos(a - 0.1) * 12, SY + Math.sin(a - 0.1) * 12, SX + Math.cos(a + 0.1) * 12, SY + Math.sin(a + 0.1) * 12, SX + Math.cos(a) * l * pul, SY + Math.sin(a) * l * pul);
      }
      g.fillStyle(0xd88a1a, 1); g.fillCircle(SX, SY, 13);
      g.fillStyle(0xffd040, 1); g.fillCircle(SX, SY, 12);
      g.fillStyle(0xfff4c0, 1); g.fillCircle(SX - 2, SY - 2, 8);
      g.fillStyle(0xffffff, 1); g.fillCircle(SX - 3, SY - 3, 4);
      g.lineStyle(1.5, 0x2a2a30, 1); g.strokeEllipse(SX + csw, SY + 15, 4, 5);
      // Mirror-buoys flashing in the sea.
      for (const [bx, by] of [[230, 520], [730, 520], [140, 300], [820, 300]] as const) {
        const fl = Math.max(0, Math.sin(t * 1.9 + bx * 0.03));
        g.fillStyle(0xffffff, 0.2); g.fillEllipse(bx, by + 6, 26, 6);
        g.fillStyle(0xf4eedc, 1); g.fillEllipse(bx, by + 2, 16, 7);
        g.lineStyle(1.5, 0x3a3a44, 1); g.lineBetween(bx, by, bx, by - 12);
        g.fillStyle(0xc8d8e8, 1); g.fillRect(bx - 4, by - 18, 8, 7);
        g.lineStyle(1, 0x3a3a44, 1); g.strokeRect(bx - 4, by - 18, 8, 7);
        if (fl > 0.8) {
          const k = (fl - 0.8) * 5, s = 4 + k * 10;
          g.fillStyle(0xffffff, 0.35 * k); g.fillCircle(bx, by - 14, 10 * k + 2);
          g.lineStyle(1.2, 0xffffff, k); g.lineBetween(bx - s, by - 14, bx + s, by - 14); g.lineBetween(bx, by - 14 - s, bx, by - 14 + s);
        }
      }
    } else if (here === 'earth') {
      // The mesa: a flat-topped mountain of banded stone, the Sepulchre's sealed gate cut in its face.
      g.fillStyle(0x6a5a48, 1); g.fillTriangle(380, 236, 580, 236, 540, 128); g.fillTriangle(380, 236, 420, 128, 540, 128);
      g.fillStyle(0x8a7860, 1); g.fillRect(420, 128, 120, 10);
      g.lineStyle(1.5, 0x4a3a2a, 0.7);
      for (const y of [150, 172, 196, 218]) g.lineBetween(420 - (y - 128) * 0.37, y, 540 + (y - 128) * 0.44, y);
      g.fillStyle(0x2a2018, 1); g.fillRoundedRect(468, 92, 24, 26, 4);
      g.fillStyle(0xa89878, 1); g.fillRect(471, 95, 18, 20);
      g.lineStyle(1, 0x5a4a3a, 1); g.strokeRect(474, 98, 12, 14);
      g.fillStyle(0xe0c080, 0.5 + Math.sin(t * 1.5) * 0.15); g.fillEllipse(300, 470, 90, 22);
    } else {
      // Volcano
      g.fillStyle(0x6a4a30, 1); g.fillTriangle(400, 210, 560, 210, 480, 90);
      g.fillStyle(0xd85a1a, 0.7 + Math.sin(t * 2) * 0.2); g.fillEllipse(480, 96, 30, 8);
    }
    // Roads (dashed)
    for (const [a, b] of L.roads) {
      const p = L.pos[a], q = L.pos[b];
      if (!p || !q) continue;
      const n = Math.floor(Math.hypot(q.x - p.x, q.y - p.y) / 12);
      g.fillStyle(here === 'pinnacle' ? OBS.seamLit : 0x4a3218, 0.8);
      for (let i = 0; i < n; i += 2) g.fillCircle(p.x + ((q.x - p.x) * i) / n, p.y + ((q.y - p.y) * i) / n, 1.8);
    }
    const s = Save.S();
    for (const [id, p] of Object.entries(L.pos)) {
      const a = getArea(id);
      const court = courtOfArea(id);
      const bench = benchOf(id);
      const freed = court ? s.princes.includes(court.prince.id) : bench ? Save.courtReady(id) : false;
      const attuned = s.waystones.includes(id);
      const col = court ? findElementDef(court.element)?.color ?? 0x8a4a2a : bench ? bench.color : here === 'pinnacle' ? OBS.facet : 0x6a4a3a;
      const on = id === this.sel;
      if (on) { g.fillStyle(0xffffff, 0.35 + Math.sin(t * 5) * 0.15); g.fillCircle(p.x, p.y, 30); }
      g.fillStyle(0x2a1a0c, 1); g.fillCircle(p.x, p.y, 20);
      g.fillStyle(a ? col : 0x7a6a5a, 1); g.fillCircle(p.x, p.y, 16);
      if (freed) { g.fillStyle(0xffffff, 1); g.fillRect(p.x + 10, p.y - 30, 2, 18); g.fillStyle(0x6aff9a, 1); g.fillTriangle(p.x + 12, p.y - 30, p.x + 26, p.y - 25, p.x + 12, p.y - 20); }
      if (attuned) { g.lineStyle(2, 0x3a8ad8, 1); g.strokeCircle(p.x, p.y, 23); }
      if (id === this.from) {
        const bob = Math.sin(t * 4) * 3;
        g.fillStyle(0xc81a1a, 1); g.fillTriangle(p.x - 7, p.y - 34 + bob, p.x + 7, p.y - 34 + bob, p.x, p.y - 22 + bob);
      }
    }
  }

  /**
   * The Pinnacle's isle tab: no coastline, only the spire as the sailors chart it — glass shoals round
   * its foot, the black shingle of the Landing with the Muster's ten boats drawn up on it, and the spire
   * itself rising the height of the chart, a lamp on every bench broken and the throne-light at its tip.
   */
  private drawSpireChart(g: Phaser.GameObjects.Graphics, t: number): void {
    g.fillStyle(0x3a3448, 0.3); g.fillEllipse(480, 566, 600, 76);
    g.lineStyle(1.5, 0x2a1a3a, 0.55); g.strokeEllipse(480, 566, 600, 76);
    g.lineStyle(1, 0x2a1a3a, 0.3); g.strokeEllipse(480, 566, 650, 92);
    for (let i = 0; i < 18; i++) {
      const a = i * 0.35 + 0.2, x = 480 + Math.cos(a * 3.1) * 270, y = 566 + Math.sin(a * 2.3) * 32;
      g.lineStyle(1, 0x2a1a3a, 0.4); g.lineBetween(x - 4, y, x + 4, y);
    }
    // The Landing's shingle and the Muster drawn up on it.
    g.fillStyle(0x2a2430, 1); g.fillEllipse(650, 562, 170, 26);
    g.fillStyle(0x4a4058, 1); g.fillEllipse(646, 557, 150, 14);
    for (let i = 0; i < 22; i++) { g.fillStyle(i % 3 ? 0x6a5e84 : 0x1a141c, 1); g.fillCircle(580 + ((i * 37) % 140), 553 + ((i * 13) % 12), 1.3); }
    if (Save.test({ monarchs: 10 })) {
      ISLES.slice(0, 10).forEach((isle, i) => {
        const bx = 586 + i * 13, by = 572 + (i % 2) * 5;
        g.fillStyle(0x3a2a1e, 1); g.fillEllipse(bx, by, 9, 4);
        g.lineStyle(1, 0x2a1a10, 1); g.lineBetween(bx, by, bx, by - 8);
        g.fillStyle(isle.color, 1); g.fillTriangle(bx + 0.5, by - 8, bx + 0.5, by - 2, bx + 5, by - 3);
      });
    }
    drawPinnacle(g, 480, 566, 480, { t, lit: Math.floor(Save.seatsWon() / 6), open: Save.test({ monarch: 'obsidian-king' }) });
  }

  private drawSea(g: Phaser.GameObjects.Graphics, t: number): void {
    const W = this.scale.width;
    const cx = W / 2, cy = 320;
    // The Pinnacle in the middle: wrapped in the Shroud until the tenth crown falls, then bare, a lamp
    // on every bench broken, its tip a star once the King is down. A ring of glass shoals round its foot.
    const shroud = !Save.test({ monarchs: 10 });
    g.fillStyle(0x3a3448, 0.3); g.fillEllipse(cx, cy + 26, 120, 22);
    g.lineStyle(1, 0x2a1a3a, 0.5); g.strokeEllipse(cx, cy + 26, 120, 22); g.strokeEllipse(cx, cy + 26, 140, 28);
    drawPinnacle(g, cx, cy + 26, 100, { t, storm: shroud ? 1 : 0, lit: Math.floor(Save.seatsWon() / 6), open: Save.test({ monarch: 'obsidian-king' }) });
    ALL_ISLE_IDS.forEach((id, i) => {
      const a = -Math.PI / 2 + (i / ALL_ISLE_IDS.length) * Math.PI * 2;
      const x = cx + Math.cos(a) * 250, y = cy + Math.sin(a) * 190;
      const isle = getIsle(id);
      const col = findElementDef(id)?.color ?? 0x888888;
      const pts: Phaser.Geom.Point[] = [];
      for (let k = 0; k < 14; k++) { const b = (k / 14) * Math.PI * 2; const r = 26 * (1 + Math.sin(b * 3 + i) * 0.18); pts.push(new Phaser.Geom.Point(x + Math.cos(b) * r, y + Math.sin(b) * r * 0.75)); }
      g.fillStyle(isle ? 0xb89a6a : 0xa89a80, isle ? 1 : 0.5); g.fillPoints(pts, true, true);
      g.lineStyle(2, isle ? col : 0x6a5a4a, isle ? 1 : 0.5); g.strokePoints(pts, true, true);
      if (Save.S().monarchs.some((m) => ISLES.find((s) => s.id === id)?.monarch.id === m)) { g.fillStyle(0x6aff9a, 1); g.fillCircle(x, y, 5); }
    });
    // The Far Wastes
    g.fillStyle(0x2a3a4a, 0.35); g.fillEllipse(cx, 600, 520, 40);
  }

  private render(): void {
    for (const d of this.dyn) d.destroy();
    this.dyn = [];
    const W = this.scale.width;
    const txt = (x: number, y: number, s: string, st: Phaser.Types.GameObjects.Text.TextStyle) => { const t = this.add.text(x, y, s, st); this.dyn.push(t); return t; };
    const isle = getIsle(isleOf(this.from) ?? 'fire');
    txt(56, 46, this.tab === 'isle' ? `${isle?.name ?? 'The Isle'}` : 'THE TEN ISLES', { fontFamily: FONT_DISPLAY, fontSize: '26px', color: '#3a2412' });
    txt(56, 78, this.tab === 'isle' ? `Held by ${isle?.monarch.name}, ${isle?.monarch.title}` : `Sea chart — ${ISLES.length} of ${ALL_ISLE_IDS.length} isles charted`, { fontFamily: FONT_UI, fontSize: '14px', color: '#5a3a1e' });
    txt(W - 60, 48, '[TAB] ' + (this.tab === 'isle' ? 'Sea chart' : 'Isle map'), { fontFamily: FONT_DISPLAY, fontSize: '13px', color: '#5a3a1e' }).setOrigin(1, 0);
    if (this.tab === 'isle') {
      const L = this.layout();
      const s = Save.S();
      for (const [id, p] of Object.entries(L.pos)) {
        const a = getArea(id);
        const court = courtOfArea(id);
        const label = a?.name ?? id;
        let sub = '';
        if (court) sub = s.princes.includes(court.prince.id) ? 'freed' : `${courtChampions(court).filter((e) => s.encounters.includes(e.id)).length}/${courtChampions(court).length} · ${court.prince.name}`;
        else if (benchSeats(id).length) sub = `${benchSeats(id).filter((e) => s.encounters.includes(e)).length}/${benchSeats(id).length} seats`;
        const t = txt(p.x, p.y + 24, `${label}${sub ? `\n${sub}` : ''}`, { fontFamily: FONT_UI, fontSize: '12px', color: id === this.sel ? '#1a0a00' : '#3a2412', align: 'center', fontStyle: id === this.sel ? 'bold' : 'normal' }).setOrigin(0.5, 0);
        const z = this.add.zone(p.x, p.y, 48, 48).setInteractive({ useHandCursor: true });
        z.on('pointerdown', () => { if (this.sel === id) this.travel(id); else { this.sel = id; this.render(); } });
        this.dyn.push(z);
        void t;
      }
      const a = getArea(this.sel);
      const attuned = Save.S().waystones.includes(this.sel) || isCheatMode();
      txt(56, 560, a ? `${a.name} — ${a.subtitle}` : '', { fontFamily: FONT_DISPLAY, fontSize: '15px', color: '#3a2412' });
      txt(56, 584, this.sel === this.from ? 'You are here.' : attuned ? '[E] Fast travel — waystone attuned' : 'Not attuned: walk there and touch its waystone.', { fontFamily: FONT_UI, fontSize: '13px', color: attuned ? '#1a5a8a' : '#6a4a2a' });
    } else {
      const cx = W / 2, cy = 320;
      ALL_ISLE_IDS.forEach((id, i) => {
        const a = -Math.PI / 2 + (i / ALL_ISLE_IDS.length) * Math.PI * 2;
        const x = cx + Math.cos(a) * 250, y = cy + Math.sin(a) * 190;
        const isle = getIsle(id);
        txt(x, y + 26, isle ? isle.name : `${findElementDef(id)?.name ?? id} Isle\n(uncharted)`, { fontFamily: FONT_UI, fontSize: '12px', color: isle ? '#2a1408' : '#7a6a5a', align: 'center' }).setOrigin(0.5, 0);
      });
      const pinState = !Save.test({ monarchs: 10 }) ? '(behind the Shroud)'
        : Save.test({ monarch: 'obsidian-king' }) ? 'the star is out' : `${Save.seatsWon()}/60 seats`;
      txt(cx, cy + 34, `The Obsidian Pinnacle\n${pinState}`, { fontFamily: FONT_DISPLAY, fontSize: '12px', color: '#2a1a3a', align: 'center' }).setOrigin(0.5, 0);
      txt(cx, 580, 'The Far Wastes', { fontFamily: FONT_DISPLAY, fontSize: '13px', color: '#2a3a4a' }).setOrigin(0.5);
    }
    if (this.note) txt(W / 2, 612, this.note, { fontFamily: FONT_DISPLAY, fontSize: '13px', color: '#8a1a0a' }).setOrigin(0.5);
    txt(W / 2 - 40, 612 - (this.note ? 22 : 0), 'Arrows choose · E travel · TAB chart · M/ESC close', { fontFamily: FONT_UI, fontSize: '12px', color: '#5a3a1e' }).setOrigin(0.5);
  }
}
