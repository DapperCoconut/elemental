import Phaser from 'phaser';
import { mix } from '../ui';
import type { DecoKind, TowerDeco } from './StrongholdTypes';

/**
 * The bits of kit an upgrade paints onto a tower. Every upgrade names one `DecoKind`; this file
 * knows where each kind lives on the tower and how to draw it at a given tier, so a tower that
 * has bought 4-0-2 visibly carries four things from its top path and two from its bottom one.
 *
 * Homes:
 *   head  — stacked above the rig (crowns, halos, horns...)
 *   orbit — circling the rig, more of them each tier
 *   base  — on the plinth, painted once into the plinth graphics
 *   side  — hung off the tower's flank; the path picks the flank
 */

export type DecoHome = 'head' | 'orbit' | 'base' | 'side';

const HOME: Record<DecoKind, DecoHome> = {
  crown: 'head', halo: 'head', horns: 'head', antenna: 'head', hat: 'head', eye: 'head', star: 'head',
  moon: 'head', sun: 'head', skull: 'head', flame: 'head',
  orbit: 'orbit', sparks: 'orbit', bubbles: 'orbit', coins: 'orbit', leaves: 'orbit', motes: 'orbit',
  notes: 'orbit', bees: 'orbit', cards: 'orbit',
  spikes: 'base', runes: 'base', gears: 'base', chains: 'base', crystals: 'base', roots: 'base',
  bricks: 'base', 'gold-trim': 'base', moat: 'base', bones: 'base',
  banner: 'side', shield: 'side', barrel: 'side', scope: 'side', drum: 'side', book: 'side',
  wings: 'side', cape: 'side', lantern: 'side', sack: 'side', pennant: 'side',
};

export function decoHome(kind: DecoKind): DecoHome { return HOME[kind]; }

/** One owned deco: what it is, which path bought it, and that upgrade's tier (1–5). */
export interface OwnedDeco { deco: TowerDeco; path: number; tier: number }

/**
 * Collapse a tower's owned decos: the same kind bought twice on one path is drawn once, at the
 * higher tier, so a path that keeps buying "spikes" grows bigger spikes rather than a pile.
 */
export function collapseDecos(list: OwnedDeco[]): OwnedDeco[] {
  const best = new Map<string, OwnedDeco>();
  for (const d of list) {
    const key = `${d.path}:${d.deco.kind}`;
    const cur = best.get(key);
    if (!cur || d.tier > cur.tier) best.set(key, d);
  }
  return [...best.values()].sort((a, b) => a.tier - b.tier);
}

const pts = (arr: number[][]): Phaser.Types.Math.Vector2Like[] => arr.map(([x, y]) => ({ x, y }));

/** Plinth decorations, painted once whenever the tower's upgrades change. */
export function paintBaseDecos(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, decos: OwnedDeco[], towerColor: number): void {
  for (const d of decos) {
    if (HOME[d.deco.kind] !== 'base') continue;
    const c = d.deco.color ?? towerColor;
    const s = 0.7 + d.tier * 0.1;
    // Each path takes its own arc of the plinth so two base decos never sit on each other.
    const a0 = [Math.PI * 0.62, Math.PI * 1.5, Math.PI * 0.38][d.path] ?? 0;
    const spread = Math.PI * 0.42;
    const n = 1 + Math.ceil(d.tier / 2);
    const at = (i: number): { px: number; py: number; ang: number } => {
      const ang = a0 + (n === 1 ? 0 : (i / (n - 1) - 0.5) * spread);
      return { px: x + Math.cos(ang) * (r - 1), py: y + Math.sin(ang) * (r - 1) * 0.8, ang };
    };
    switch (d.deco.kind) {
      case 'spikes':
        for (let i = 0; i < n + 1; i++) {
          const { px, py, ang } = at(Math.min(i, n - 1) + (i === n ? 0.5 : 0));
          const ox = Math.cos(ang) * 9 * s, oy = Math.sin(ang) * 7 * s;
          g.fillStyle(mix(c, 0x000000, 0.3), 1);
          g.fillTriangle(px - Math.sin(ang) * 4, py + Math.cos(ang) * 3, px + Math.sin(ang) * 4, py - Math.cos(ang) * 3, px + ox, py + oy - 4 * s);
          g.fillStyle(mix(c, 0xffffff, 0.45), 1); g.fillCircle(px + ox, py + oy - 4 * s, 1.2);
        }
        break;
      case 'runes':
        g.lineStyle(1.5, c, 0.85); g.strokeCircle(x, y + 2, r + 3 + d.tier);
        for (let i = 0; i < n + 2; i++) {
          const ang = a0 + (i - (n + 1) / 2) * 0.35;
          const px = x + Math.cos(ang) * (r + 3 + d.tier), py = y + 2 + Math.sin(ang) * (r + 3 + d.tier);
          g.lineStyle(1.5, mix(c, 0xffffff, 0.5), 1);
          g.lineBetween(px - 3, py - 3, px + 3, py + 3); g.lineBetween(px - 3, py + 3, px, py - 4);
        }
        break;
      case 'gears':
        for (let i = 0; i < n; i++) {
          const { px, py } = at(i);
          const gr = 5 * s;
          g.fillStyle(mix(c, 0x444444, 0.5), 1); g.fillCircle(px, py, gr);
          for (let k = 0; k < 6; k++) { const ka = k * Math.PI / 3; g.fillRect(px + Math.cos(ka) * gr - 1.5, py + Math.sin(ka) * gr - 1.5, 3, 3); }
          g.fillStyle(0x111111, 1); g.fillCircle(px, py, gr * 0.35);
        }
        break;
      case 'chains': {
        const { px, py } = at(0);
        const { px: qx, py: qy } = at(n - 1);
        const links = 3 + d.tier;
        for (let i = 0; i <= links; i++) {
          const t = i / links;
          const lx = px + (qx - px) * t, ly = py + (qy - py) * t + Math.sin(t * Math.PI) * 6;
          g.lineStyle(1.5, mix(c, 0xaaaaaa, 0.5), 1); g.strokeEllipse(lx, ly, 5, 3.5);
        }
        break;
      }
      case 'crystals':
        for (let i = 0; i < n; i++) {
          const { px, py } = at(i);
          const h = (8 + (i % 2) * 4) * s;
          g.fillStyle(mix(c, 0x000000, 0.2), 1); g.fillTriangle(px - 3 * s, py, px + 3 * s, py, px, py - h);
          g.fillStyle(mix(c, 0xffffff, 0.5), 0.9); g.fillTriangle(px - 1, py, px + 2 * s, py, px, py - h);
        }
        break;
      case 'roots':
        g.lineStyle(2 * s, 0x5a3a1e, 1);
        for (let i = 0; i < n + 1; i++) {
          const ang = a0 + (i - n / 2) * 0.4;
          const px = x + Math.cos(ang) * r * 0.6, py = y + Math.sin(ang) * r * 0.5;
          g.beginPath(); g.moveTo(px, py);
          g.lineTo(px + Math.cos(ang) * 10 * s, py + Math.sin(ang) * 6 * s + 3);
          g.lineTo(px + Math.cos(ang) * 16 * s, py + Math.sin(ang) * 8 * s + 1);
          g.strokePath();
        }
        g.fillStyle(c, 0.9); g.fillCircle(at(0).px, at(0).py - 2, 2.5 * s);
        break;
      case 'bricks':
        for (let i = 0; i < n + 1; i++) {
          const { px, py } = at(Math.min(i, n - 1));
          const bx = px + (i === n ? 6 : 0), by = py + (i === n ? -5 : 0);
          g.fillStyle(mix(c, 0x6a3a2a, 0.6), 1); g.fillRect(bx - 5 * s, by - 3 * s, 10 * s, 6 * s);
          g.lineStyle(1, 0x000000, 0.4); g.strokeRect(bx - 5 * s, by - 3 * s, 10 * s, 6 * s);
        }
        break;
      case 'gold-trim':
        g.lineStyle(1 + d.tier * 0.6, 0xffd700, 0.95); g.strokeCircle(x, y + 2, r - 2);
        g.lineStyle(1, 0xfff2a8, 0.7); g.strokeCircle(x, y + 2, r - 4 - d.tier * 0.4);
        break;
      case 'moat':
        g.lineStyle(3 + d.tier, mix(c, 0x2a6aa8, 0.5), 0.55); g.strokeEllipse(x, y + 6, (r + 8 + d.tier * 2) * 2, (r + 4 + d.tier) * 1.3);
        g.lineStyle(1, 0xbfe6ff, 0.5); g.strokeEllipse(x, y + 6, (r + 8 + d.tier * 2) * 2, (r + 4 + d.tier) * 1.3);
        break;
      case 'bones':
        for (let i = 0; i < n; i++) {
          const { px, py, ang } = at(i);
          const dx = Math.cos(ang + 1.2) * 5 * s, dy = Math.sin(ang + 1.2) * 3 * s;
          g.lineStyle(2.5, 0xeee6d0, 1); g.lineBetween(px - dx, py - dy, px + dx, py + dy);
          g.fillStyle(0xeee6d0, 1); g.fillCircle(px - dx, py - dy, 2); g.fillCircle(px + dx, py + dy, 2);
        }
        break;
      default: break;
    }
  }
}

/** Head, orbit and side decorations, painted every frame (flyers move, orbits turn). */
export function paintLiveDecos(g: Phaser.GameObjects.Graphics, x: number, y: number, time: number, decos: OwnedDeco[], towerColor: number): void {
  let headY = y - 34;
  for (const d of decos) {
    const home = HOME[d.deco.kind];
    if (home === 'base') continue;
    const c = d.deco.color ?? towerColor;
    const s = 0.7 + d.tier * 0.1;
    if (home === 'head') { paintHead(g, d.deco.kind, x, headY, s, c, time, d.tier); headY -= 9 * s; continue; }
    if (home === 'orbit') { paintOrbit(g, d.deco.kind, x, y - 12, s, c, time, d.tier, d.path); continue; }
    // Side: top path on the left, bottom path on the right, middle path up behind the shoulder.
    const sx = d.path === 0 ? x - 22 : d.path === 2 ? x + 22 : x + 14;
    const sy = d.path === 1 ? y - 24 : y - 8;
    paintSide(g, d.deco.kind, sx, sy, s, c, time, d.path === 0 ? -1 : 1);
  }
}

function paintHead(g: Phaser.GameObjects.Graphics, kind: DecoKind, x: number, y: number, s: number, c: number, time: number, tier: number): void {
  switch (kind) {
    case 'crown': {
      const w = 9 * s;
      g.fillStyle(0xffd700, 1);
      g.fillPoints(pts([[x - w, y + 3], [x - w, y - 4], [x - w / 2, y], [x, y - 6], [x + w / 2, y], [x + w, y - 4], [x + w, y + 3]]), true);
      g.fillStyle(c, 1); g.fillCircle(x, y - 1, 1.6 * s);
      if (tier >= 4) { g.fillStyle(0xffffff, 0.8); g.fillCircle(x - w + 1, y - 4, 1.2); g.fillCircle(x + w - 1, y - 4, 1.2); }
      break;
    }
    case 'halo':
      g.lineStyle(2 * s, mix(c, 0xffffff, 0.6), 0.9); g.strokeEllipse(x, y + 2, 20 * s, 6 * s);
      g.lineStyle(4 * s, c, 0.2); g.strokeEllipse(x, y + 2, 22 * s, 7 * s);
      break;
    case 'horns':
      g.fillStyle(mix(c, 0x222222, 0.4), 1);
      g.fillTriangle(x - 8 * s, y + 4, x - 4 * s, y + 4, x - 11 * s, y - 7 * s);
      g.fillTriangle(x + 8 * s, y + 4, x + 4 * s, y + 4, x + 11 * s, y - 7 * s);
      break;
    case 'antenna': {
      g.lineStyle(1.5, 0xcccccc, 1); g.lineBetween(x, y + 4, x, y - 8 * s);
      const on = Math.sin(time / 180) > 0;
      g.fillStyle(on ? c : mix(c, 0x000000, 0.5), 1); g.fillCircle(x, y - 8 * s, 2.4 * s);
      if (tier >= 3) { g.lineStyle(1, c, 0.5 * (on ? 1 : 0.3)); g.strokeCircle(x, y - 8 * s, 5 * s); }
      break;
    }
    case 'hat':
      g.fillStyle(mix(c, 0x111111, 0.55), 1); g.fillRect(x - 10 * s, y + 1, 20 * s, 3);
      g.fillRect(x - 6 * s, y - 8 * s, 12 * s, 9 * s);
      g.fillStyle(c, 1); g.fillRect(x - 6 * s, y - 2, 12 * s, 2);
      break;
    case 'eye': {
      const blink = Math.sin(time / 900) > 0.95 ? 0.2 : 1;
      g.fillStyle(0xffffff, 0.95); g.fillEllipse(x, y, 13 * s, 8 * s * blink);
      g.fillStyle(c, 1); g.fillCircle(x + Math.sin(time / 700) * 2, y, 2.6 * s * blink);
      break;
    }
    case 'star': {
      const r = 6 * s, a0 = time / 900;
      const p: number[][] = [];
      for (let i = 0; i < 10; i++) { const rr = i % 2 ? r * 0.45 : r; const a = a0 - Math.PI / 2 + i * Math.PI / 5; p.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); }
      g.fillStyle(mix(c, 0xffffff, 0.4), 1); g.fillPoints(pts(p), true);
      break;
    }
    case 'moon':
      g.fillStyle(0xf4f0d8, 1); g.fillCircle(x, y, 6 * s);
      g.fillStyle(mix(c, 0x0a0a14, 0.6), 1); g.fillCircle(x + 3 * s, y - 1.5 * s, 5 * s);
      break;
    case 'sun': {
      g.fillStyle(0xffd24a, 1); g.fillCircle(x, y, 4.5 * s);
      g.lineStyle(1.5, 0xffe88a, 0.9);
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + time / 1500; g.lineBetween(x + Math.cos(a) * 6 * s, y + Math.sin(a) * 6 * s, x + Math.cos(a) * 9 * s, y + Math.sin(a) * 9 * s); }
      break;
    }
    case 'skull':
      g.fillStyle(0xeee6d0, 1); g.fillCircle(x, y, 5.5 * s); g.fillRect(x - 3.5 * s, y + 3 * s, 7 * s, 3 * s);
      g.fillStyle(0x111111, 1); g.fillCircle(x - 2 * s, y, 1.5 * s); g.fillCircle(x + 2 * s, y, 1.5 * s);
      g.fillStyle(c, 0.8); g.fillCircle(x - 2 * s, y, 0.8 * s); g.fillCircle(x + 2 * s, y, 0.8 * s);
      break;
    case 'flame': {
      const f = Math.sin(time / 90) * 1.5;
      g.fillStyle(0xff5a1e, 0.9); g.fillTriangle(x - 5 * s, y + 4, x + 5 * s, y + 4, x + f, y - 10 * s);
      g.fillStyle(0xffd27a, 0.95); g.fillTriangle(x - 2.5 * s, y + 4, x + 2.5 * s, y + 4, x - f * 0.5, y - 5 * s);
      break;
    }
    default: break;
  }
}

function paintOrbit(g: Phaser.GameObjects.Graphics, kind: DecoKind, x: number, y: number, s: number, c: number, time: number, tier: number, path: number): void {
  const n = 1 + tier;
  const rad = 24 + path * 5;
  const dir = path === 1 ? -1 : 1;
  for (let i = 0; i < n; i++) {
    const a = dir * time / (700 + path * 160) + (i / n) * Math.PI * 2;
    const px = x + Math.cos(a) * rad, py = y + Math.sin(a) * rad * 0.45;
    const front = Math.sin(a) > 0;
    const al = front ? 1 : 0.55;
    switch (kind) {
      case 'orbit':
        g.fillStyle(mix(c, 0x000000, 0.25), al); g.fillCircle(px, py, 3.2 * s);
        g.fillStyle(mix(c, 0xffffff, 0.4), al); g.fillCircle(px - 1, py - 1, 1.2 * s);
        break;
      case 'sparks':
        g.lineStyle(1.5, mix(c, 0xffffff, 0.5), al);
        g.lineBetween(px - 3, py, px + 3, py); g.lineBetween(px, py - 3, px, py + 3);
        break;
      case 'bubbles':
        g.lineStyle(1, mix(c, 0xffffff, 0.6), al * 0.9); g.strokeCircle(px, py + Math.sin(time / 300 + i) * 2, 2.5 * s);
        break;
      case 'coins':
        g.fillStyle(0x8a6a10, al); g.fillEllipse(px, py + 1, 6 * s, 6 * s * Math.abs(Math.cos(a * 2)) + 1);
        g.fillStyle(0xffd700, al); g.fillEllipse(px, py, 6 * s, 6 * s * Math.abs(Math.cos(a * 2)) + 1);
        break;
      case 'leaves':
        g.fillStyle(mix(c, 0x2f8f3e, 0.5), al); g.fillEllipse(px, py, 6 * s, 3 * s);
        break;
      case 'motes':
        g.fillStyle(mix(c, 0xffffff, 0.3), al * 0.8); g.fillCircle(px, py + Math.sin(time / 260 + i * 2) * 3, 1.8 * s);
        break;
      case 'notes':
        g.fillStyle(mix(c, 0xffffff, 0.3), al); g.fillEllipse(px, py + 2, 4 * s, 3 * s); g.fillRect(px + 1.5 * s, py - 5 * s, 1.2, 6 * s);
        break;
      case 'bees':
        g.fillStyle(0xffdd33, al); g.fillEllipse(px, py, 5 * s, 3.5 * s);
        g.fillStyle(0x222222, al); g.fillRect(px - 0.5, py - 1.5 * s, 1, 3 * s);
        g.fillStyle(0xffffff, al * 0.6); g.fillEllipse(px - 1, py - 2.5 * s, 3 * s, 1.6 * s);
        break;
      case 'cards':
        g.fillStyle(0xffffff, al); g.fillRect(px - 2.5 * s, py - 3.5 * s, 5 * s, 7 * s);
        g.fillStyle(i % 2 ? 0xcc2244 : 0x222222, al); g.fillCircle(px, py, 1.3 * s);
        break;
      default: break;
    }
  }
}

function paintSide(g: Phaser.GameObjects.Graphics, kind: DecoKind, x: number, y: number, s: number, c: number, time: number, side: number): void {
  switch (kind) {
    case 'banner': {
      const wave = Math.sin(time / 250) * 2;
      g.lineStyle(1.5, 0x6a5030, 1); g.lineBetween(x, y + 14, x, y - 16 * s);
      g.fillStyle(c, 0.95);
      g.fillPoints(pts([[x, y - 16 * s], [x + side * 11 * s, y - 14 * s + wave], [x + side * 11 * s, y - 4 * s + wave], [x + side * 5 * s, y - 6 * s + wave], [x, y - 3 * s]]), true);
      break;
    }
    case 'pennant': {
      const wave = Math.sin(time / 200) * 2;
      g.lineStyle(1.5, 0x8a7a60, 1); g.lineBetween(x, y + 14, x, y - 18 * s);
      g.fillStyle(c, 1); g.fillTriangle(x, y - 18 * s, x, y - 10 * s, x + side * 13 * s, y - 14 * s + wave);
      break;
    }
    case 'shield':
      g.fillStyle(mix(c, 0x333344, 0.4), 1);
      g.fillPoints(pts([[x - 6 * s, y - 6 * s], [x + 6 * s, y - 6 * s], [x + 6 * s, y + 2 * s], [x, y + 8 * s], [x - 6 * s, y + 2 * s]]), true);
      g.lineStyle(1.5, mix(c, 0xffffff, 0.5), 1);
      g.strokePoints(pts([[x - 6 * s, y - 6 * s], [x + 6 * s, y - 6 * s], [x + 6 * s, y + 2 * s], [x, y + 8 * s], [x - 6 * s, y + 2 * s]]), true);
      break;
    case 'barrel':
      g.fillStyle(0x6a4a2a, 1); g.fillRoundedRect(x - 5 * s, y - 2 * s, 10 * s, 13 * s, 2);
      g.lineStyle(1, 0x2a1a0a, 1); g.lineBetween(x - 5 * s, y + 2 * s, x + 5 * s, y + 2 * s); g.lineBetween(x - 5 * s, y + 7 * s, x + 5 * s, y + 7 * s);
      g.fillStyle(c, 1); g.fillCircle(x, y - 2 * s, 2 * s);
      break;
    case 'scope':
      g.fillStyle(0x333a44, 1); g.fillRect(x - 2 * s, y - 10 * s, 4 * s, 14 * s);
      g.fillStyle(c, 0.9); g.fillCircle(x, y - 10 * s, 3 * s);
      g.fillStyle(0xffffff, 0.7); g.fillCircle(x - 1, y - 11 * s, 1);
      break;
    case 'drum':
      g.fillStyle(mix(c, 0x6a2a1a, 0.5), 1); g.fillEllipse(x, y + 4, 14 * s, 12 * s);
      g.fillStyle(0xf4ead0, 1); g.fillEllipse(x, y - 1 * s, 14 * s, 5 * s);
      g.lineStyle(1, 0xffd700, 0.9); g.lineBetween(x - 7 * s, y + 1, x + 7 * s, y + 7 * s);
      break;
    case 'book':
      g.fillStyle(mix(c, 0x2a1a3a, 0.5), 1); g.fillRect(x - 6 * s, y - 4 * s, 12 * s, 9 * s);
      g.fillStyle(0xf4ead0, 1); g.fillRect(x - 5 * s, y - 3 * s, 4.5 * s, 7 * s); g.fillRect(x + 0.5 * s, y - 3 * s, 4.5 * s, 7 * s);
      g.lineStyle(1, c, 1); g.lineBetween(x - 4 * s, y - 1, x - 1.5 * s, y - 1); g.lineBetween(x + 1.5 * s, y + 1, x + 4 * s, y + 1);
      break;
    case 'wings': {
      const flap = Math.sin(time / 160) * 3;
      g.fillStyle(mix(c, 0xffffff, 0.5), 0.85);
      g.fillTriangle(x - side * 2, y - 4, x - side * 2 + side * 16 * s, y - 14 * s - flap, x - side * 2 + side * 12 * s, y + 4 * s);
      g.fillTriangle(x - side * 2, y - 4, x - side * 2 + side * 10 * s, y - 18 * s - flap, x - side * 2 + side * 6 * s, y + 2 * s);
      break;
    }
    case 'cape': {
      const wave = Math.sin(time / 300) * 2;
      g.fillStyle(mix(c, 0x000000, 0.25), 0.9);
      g.fillPoints(pts([[x - side * 6, y - 14 * s], [x + side * 4, y - 14 * s], [x + side * 8 * s + wave, y + 14 * s], [x - side * 10 * s + wave, y + 12 * s]]), true);
      break;
    }
    case 'lantern': {
      const glow = 0.5 + Math.sin(time / 220) * 0.2;
      g.lineStyle(1, 0x888888, 1); g.lineBetween(x, y - 14 * s, x, y - 8 * s);
      g.fillStyle(c, glow * 0.4); g.fillCircle(x, y - 3 * s, 8 * s);
      g.fillStyle(0x333333, 1); g.fillRect(x - 4 * s, y - 8 * s, 8 * s, 2);
      g.fillStyle(mix(c, 0xffffff, 0.4), 1); g.fillRect(x - 3 * s, y - 6 * s, 6 * s, 7 * s);
      break;
    }
    case 'sack':
      g.fillStyle(0x8a6a3a, 1); g.fillCircle(x, y + 4 * s, 7 * s); g.fillTriangle(x - 3 * s, y - 2 * s, x + 3 * s, y - 2 * s, x, y - 6 * s);
      g.fillStyle(0xffd700, 1); g.fillCircle(x, y + 4 * s, 2.5 * s);
      break;
    default: break;
  }
}
