import Phaser from 'phaser';
import { FONT_DISPLAY, FONT_UI } from '../../ui';
import { Sfx } from '../../audio';
import * as Save from '../IslesSave';
import { getArea, courtOfArea, isleOf, getIsle, ALL_ISLE_IDS, ISLES } from '../IslesRegistry';
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
    if (!Save.S().waystones.includes(id)) { Sfx.play('ui-denied'); this.note = `Walk to ${a.name} and touch its waystone first.`; this.render(); return; }
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
    // The island outline.
    const pts: Phaser.Geom.Point[] = [];
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      const r = 1 + Math.sin(a * 3 + 1) * 0.06 + Math.sin(a * 7) * 0.035;
      pts.push(new Phaser.Geom.Point(480 + Math.cos(a) * 300 * r, 315 + Math.sin(a) * 230 * r));
    }
    g.fillStyle(0xb89a6a, 1); g.fillPoints(pts, true, true);
    g.lineStyle(3, 0x4a3218, 1); g.strokePoints(pts, true, true);
    g.lineStyle(1, 0x4a3218, 0.4);
    g.strokePoints(pts.map((p) => new Phaser.Geom.Point(480 + (p.x - 480) * 1.05, 315 + (p.y - 315) * 1.05)), true, true);
    const here = isleOf(this.from) ?? 'fire';
    if (here === 'water') {
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
      g.fillStyle(0x4a3218, 0.8);
      for (let i = 0; i < n; i += 2) g.fillCircle(p.x + ((q.x - p.x) * i) / n, p.y + ((q.y - p.y) * i) / n, 1.8);
    }
    const s = Save.S();
    for (const [id, p] of Object.entries(L.pos)) {
      const a = getArea(id);
      const court = courtOfArea(id);
      const freed = court && s.princes.includes(court.prince.id);
      const attuned = s.waystones.includes(id);
      const col = court ? findElementDef(court.element)?.color ?? 0x8a4a2a : 0x6a4a3a;
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

  private drawSea(g: Phaser.GameObjects.Graphics, t: number): void {
    const W = this.scale.width;
    const cx = W / 2, cy = 320;
    // The Pinnacle in the middle.
    g.fillStyle(0x1a141c, 1); g.fillTriangle(cx - 20, cy + 26, cx + 20, cy + 26, cx, cy - 46);
    g.fillStyle(0x7a5cff, 0.5 + Math.sin(t * 2) * 0.3); g.fillCircle(cx, cy - 46, 4);
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
        if (court) sub = s.princes.includes(court.prince.id) ? 'freed' : `${court.encounters.filter((e) => s.encounters.includes(e.id)).length}/5 · ${court.prince.name}`;
        const t = txt(p.x, p.y + 24, `${label}${sub ? `\n${sub}` : ''}`, { fontFamily: FONT_UI, fontSize: '12px', color: id === this.sel ? '#1a0a00' : '#3a2412', align: 'center', fontStyle: id === this.sel ? 'bold' : 'normal' }).setOrigin(0.5, 0);
        const z = this.add.zone(p.x, p.y, 48, 48).setInteractive({ useHandCursor: true });
        z.on('pointerdown', () => { if (this.sel === id) this.travel(id); else { this.sel = id; this.render(); } });
        this.dyn.push(z);
        void t;
      }
      const a = getArea(this.sel);
      const attuned = Save.S().waystones.includes(this.sel);
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
      txt(cx, cy + 34, 'The Obsidian Pinnacle', { fontFamily: FONT_DISPLAY, fontSize: '12px', color: '#2a1a3a' }).setOrigin(0.5, 0);
      txt(cx, 580, 'The Far Wastes', { fontFamily: FONT_DISPLAY, fontSize: '13px', color: '#2a3a4a' }).setOrigin(0.5);
    }
    if (this.note) txt(W / 2, 612, this.note, { fontFamily: FONT_DISPLAY, fontSize: '13px', color: '#8a1a0a' }).setOrigin(0.5);
    txt(W / 2 - 40, 612 - (this.note ? 22 : 0), 'Arrows choose · E travel · TAB chart · M/ESC close', { fontFamily: FONT_UI, fontSize: '12px', color: '#5a3a1e' }).setOrigin(0.5);
  }
}
