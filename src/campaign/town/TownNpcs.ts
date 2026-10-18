import Phaser from 'phaser';
import { FONT_UI, mix } from '../../ui';
import { Pt, Rect, Road, TownLayout, mulberry32 } from './TownLayout';
import { HatKind, TownTheme } from './TownTheme';
import { Z_OVERLAY } from './TownRenderer';

/**
 * The townsfolk: wanderers who stroll the streets, the shopkeepers at their counters,
 * and the sentry outside the castle. Each is a small hand-drawn body — round torso, ball
 * hands, tracking eyes, a hat in the town's fashion — redrawn only while on screen.
 *
 * Wanderers walk the road polylines (which the layout guarantees are clear of buildings),
 * so they never need collision. Walk near one and it says something local.
 */

type G = Phaser.GameObjects.Graphics;

const dk = (c: number, t: number) => mix(c, 0x000000, t);
const lt = (c: number, t: number) => mix(c, 0xffffff, t);

type NpcKind = 'walker' | 'keeper' | 'guard';

interface Npc {
  kind: NpcKind;
  x: number; y: number;
  color: number;
  hat: HatKind;
  g: G;
  road?: Road;
  seg: number;
  t: number;
  dir: 1 | -1;
  lane: number;
  speed: number;
  idleUntil: number;
  phase: number;
  facing: number;
  moving: boolean;
  lines: () => string[];
  nextTalkAt: number;
  bubble?: { g: G; text: Phaser.GameObjects.Text; until: number };
  size: number;
}

export class TownNpcs {
  private npcs: Npc[] = [];
  private rng: () => number;
  private time = 0;

  constructor(
    private scene: Phaser.Scene,
    private L: TownLayout,
    private th: TownTheme,
    seed: number,
    extras: { guardLines: () => string[]; keeperLines: () => string[] },
  ) {
    this.rng = mulberry32(seed);
    const r = this.rng;
    const walkable = L.roads.filter((rd) => rd.pts.length >= 2);
    const count = 14 + Math.floor(r() * 6);
    for (let i = 0; i < count; i++) {
      const road = walkable[Math.floor(r() * walkable.length)];
      const seg = Math.floor(r() * (road.pts.length - 1));
      this.npcs.push(this.make('walker', 0, 0, {
        road, seg, t: r(), lane: (r() - 0.5) * road.w * 0.6,
        lines: () => th.lines,
      }));
    }
    const S = L.spots;
    this.npcs.push(this.make('keeper', S.shopKeeper.x, S.shopKeeper.y, { lines: extras.keeperLines }));
    this.npcs.push(this.make('keeper', S.stallKeeper.x, S.stallKeeper.y, { lines: extras.keeperLines }));
    this.npcs.push(this.make('guard', S.guard.x, S.guard.y, { lines: extras.guardLines }));
  }

  private make(kind: NpcKind, x: number, y: number, o: {
    road?: Road; seg?: number; t?: number; lane?: number; lines: () => string[];
  }): Npc {
    const r = this.rng;
    const cols = this.th.npcColors;
    const n: Npc = {
      kind, x, y,
      color: kind === 'guard' ? mix(this.th.castleWall, 0x8a8a90, 0.4) : cols[Math.floor(r() * cols.length)],
      hat: kind === 'guard' ? 'helmet' : kind === 'keeper' ? 'cap' : (r() < 0.75 ? this.th.npcHat : 'none'),
      g: this.scene.add.graphics(),
      road: o.road, seg: o.seg ?? 0, t: o.t ?? 0, dir: r() < 0.5 ? 1 : -1, lane: o.lane ?? 0,
      speed: 34 + r() * 30,
      idleUntil: 0,
      phase: r() * 10,
      facing: Math.PI / 2,
      moving: false,
      lines: o.lines,
      nextTalkAt: r() * 4,
      size: kind === 'walker' ? 0.85 + r() * 0.3 : 1.05,
    };
    if (n.road) this.place(n);
    return n;
  }

  private place(n: Npc): void {
    const pts = n.road!.pts;
    const a = pts[n.seg], b = pts[n.seg + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const ux = (b.x - a.x) / len, uy = (b.y - a.y) / len;
    n.x = a.x + (b.x - a.x) * n.t - uy * n.lane;
    n.y = a.y + (b.y - a.y) * n.t + ux * n.lane;
  }

  update(dtMs: number, player: Pt, view: Rect): void {
    const dt = dtMs / 1000;
    this.time += dt;
    const P = this.L.plaza;
    for (const n of this.npcs) {
      // ── Move ──
      if (n.kind === 'walker' && n.road) {
        if (this.time < n.idleUntil) {
          n.moving = false;
        } else {
          if (this.rng() < dt * 0.06) {
            n.idleUntil = this.time + 1.2 + this.rng() * 2.8;
          }
          const pts = n.road.pts;
          const a = pts[n.seg], b = pts[n.seg + 1];
          const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
          n.t += (n.dir * n.speed * dt) / len;
          if (n.t > 1) {
            if (n.seg + 2 < pts.length) { n.seg++; n.t = 0; }
            else if (n.road.kind === 'ring') { n.seg = 0; n.t = 0; }
            else { n.t = 1; n.dir = -1; }
          } else if (n.t < 0) {
            if (n.seg > 0) { n.seg--; n.t = 1; }
            else if (n.road.kind === 'ring') { n.seg = pts.length - 2; n.t = 1; }
            else { n.t = 0; n.dir = 1; }
          }
          const ox = n.x, oy = n.y;
          this.place(n);
          // Turn back before walking off the map or into the monument.
          if (n.x < 40 || n.y < 50 || n.x > this.L.W - 40 || n.y > this.L.H - 40
            || Math.hypot(n.x - P.x, n.y - P.y) < P.r * 0.4) {
            n.dir = (n.dir === 1 ? -1 : 1);
            n.x = ox; n.y = oy;
          }
          n.moving = true;
          if (Math.hypot(n.x - ox, n.y - oy) > 0.01) n.facing = Math.atan2(n.y - oy, n.x - ox);
        }
      } else {
        // Stationary folk watch the player.
        n.facing = Math.atan2(player.y - n.y, player.x - n.x);
        n.moving = false;
      }

      const d = Math.hypot(player.x - n.x, player.y - n.y);
      if (d < 90 && n.kind === 'walker') n.facing = Math.atan2(player.y - n.y, player.x - n.x);

      // ── Talk ──
      if (d < (n.kind === 'walker' ? 70 : 110) && this.time > n.nextTalkAt && !n.bubble) {
        const lines = n.lines();
        if (lines.length > 0) this.say(n, lines[Math.floor(this.rng() * lines.length)]);
        n.nextTalkAt = this.time + 9 + this.rng() * 8;
      }
      if (n.bubble) {
        if (this.time > n.bubble.until) {
          n.bubble.g.destroy(); n.bubble.text.destroy(); n.bubble = undefined;
        } else {
          this.positionBubble(n);
        }
      }

      // ── Draw (only on screen) ──
      const vis = n.x > view.x - 40 && n.x < view.x + view.w + 40 && n.y > view.y - 60 && n.y < view.y + view.h + 40;
      n.g.setVisible(vis);
      if (!vis) continue;
      n.g.setDepth(n.y);
      this.draw(n);
    }
  }

  private say(n: Npc, line: string): void {
    const text = this.scene.add.text(0, 0, line, {
      fontSize: '10px', fontFamily: FONT_UI, color: '#1a1420', align: 'center',
      wordWrap: { width: 170 },
    }).setOrigin(0.5, 1).setDepth(Z_OVERLAY + 2);
    const g = this.scene.add.graphics().setDepth(Z_OVERLAY + 1);
    n.bubble = { g, text, until: this.time + 3.2 };
    this.positionBubble(n);
  }

  private positionBubble(n: Npc): void {
    const b = n.bubble!;
    const x = n.x, y = n.y - 34 * n.size - 12;
    b.text.setPosition(x, y - 4);
    const w = b.text.width + 14, h = b.text.height + 8;
    b.g.clear();
    b.g.fillStyle(0x000000, 0.25); b.g.fillRoundedRect(x - w / 2 + 2, y - h + 2, w, h, 6);
    b.g.fillStyle(0xfff8ec, 0.96); b.g.fillRoundedRect(x - w / 2, y - h, w, h, 6);
    b.g.fillTriangle(x - 5, y - 1, x + 5, y - 1, x, y + 7);
    b.g.lineStyle(1.5, mix(this.th.trim, 0x000000, 0.4), 0.8); b.g.strokeRoundedRect(x - w / 2, y - h, w, h, 6);
  }

  private draw(n: Npc): void {
    const g = n.g;
    const s = n.size;
    const t = this.time + n.phase;
    const walk = n.moving ? Math.sin(t * 10) : 0;
    const bob = n.moving ? Math.abs(Math.sin(t * 10)) * 2 : Math.sin(t * 2) * 0.8;
    const x = n.x, y = n.y;
    const by = y - 12 * s - bob;
    const c = n.color;
    g.clear();
    g.fillStyle(0x000000, 0.3); g.fillEllipse(x, y, 22 * s, 7 * s);
    // Feet.
    g.fillStyle(dk(c, 0.6), 1);
    g.fillEllipse(x - 4 * s + walk * 2, y - 1, 6 * s, 4 * s);
    g.fillEllipse(x + 4 * s - walk * 2, y - 1, 6 * s, 4 * s);
    // Body.
    g.fillStyle(dk(c, 0.35), 1); g.fillCircle(x, by, 10.5 * s);
    g.fillStyle(c, 1); g.fillCircle(x - 0.6, by - 0.8, 9.5 * s);
    g.fillStyle(lt(c, 0.3), 0.8); g.fillCircle(x - 3 * s, by - 4 * s, 3 * s);
    if (n.kind === 'keeper') {
      g.fillStyle(0xf4ecd8, 1); g.fillRoundedRect(x - 5 * s, by - 1 * s, 10 * s, 10 * s, 2);
      g.lineStyle(1, 0xc0b090, 1); g.beginPath(); g.moveTo(x - 5 * s, by + 1); g.lineTo(x - 7 * s, by - 7 * s); g.moveTo(x + 5 * s, by + 1); g.lineTo(x + 7 * s, by - 7 * s); g.strokePath();
    }
    // Eyes track the facing.
    const fx = Math.cos(n.facing), fy = Math.sin(n.facing);
    const ex = x + fx * 2.5 * s, ey = by - 2 * s + Math.max(-1, fy) * 1.5 * s;
    for (const sd of [-1, 1]) {
      g.fillStyle(0xffffff, 0.95); g.fillCircle(ex + sd * 3.6 * s, ey, 2.6 * s);
      g.fillStyle(0x140c18, 1); g.fillCircle(ex + sd * 3.6 * s + fx * 0.9 * s, ey + fy * 0.9 * s, 1.3 * s);
    }
    // Hands swing with the stride.
    g.fillStyle(lt(c, 0.12), 1);
    g.fillCircle(x - 12 * s, by + 3 * s + walk * 2.5, 3.2 * s);
    g.fillCircle(x + 12 * s, by + 3 * s - walk * 2.5, 3.2 * s);
    if (n.kind === 'guard') {
      g.lineStyle(2, 0x5a3a20, 1); g.beginPath(); g.moveTo(x + 13 * s, by + 10 * s); g.lineTo(x + 13 * s, by - 26 * s); g.strokePath();
      g.fillStyle(0xc0c0c8, 1); g.fillTriangle(x + 10 * s, by - 24 * s, x + 16 * s, by - 24 * s, x + 13 * s, by - 34 * s);
    }
    this.hat(g, n.hat, x, by - 9 * s, s, c);
  }

  private hat(g: G, hat: HatKind, x: number, y: number, s: number, body: number): void {
    const trim = this.th.trim;
    switch (hat) {
      case 'hood':
        g.fillStyle(dk(body, 0.45), 1); g.slice(x, y + 6 * s, 10 * s, Math.PI, 0, false); g.fillPath();
        g.fillTriangle(x - 4 * s, y - 2 * s, x + 4 * s, y - 2 * s, x + 2 * s, y - 9 * s);
        break;
      case 'cap':
        g.fillStyle(this.th.roof, 1); g.slice(x, y + 2 * s, 7 * s, Math.PI, 0, false); g.fillPath();
        g.fillRect(x - 2 * s, y + 1 * s, 10 * s, 2.5 * s);
        break;
      case 'horns':
        g.fillStyle(0xe8e0c8, 1);
        g.fillTriangle(x - 7 * s, y + 2 * s, x - 3 * s, y + 1 * s, x - 9 * s, y - 7 * s);
        g.fillTriangle(x + 7 * s, y + 2 * s, x + 3 * s, y + 1 * s, x + 9 * s, y - 7 * s);
        break;
      case 'helmet':
        g.fillStyle(0x8a8c94, 1); g.slice(x, y + 4 * s, 9 * s, Math.PI, 0, false); g.fillPath();
        g.fillStyle(0xb0b4bc, 1); g.fillRect(x - 9 * s, y + 3 * s, 18 * s, 2 * s);
        g.fillStyle(this.th.castleRoof, 1); g.fillRect(x - 1 * s, y - 8 * s, 2 * s, 4 * s);
        break;
      case 'pointy':
        g.fillStyle(dk(body, 0.3), 1); g.fillTriangle(x - 8 * s, y + 3 * s, x + 8 * s, y + 3 * s, x + 3 * s, y - 16 * s);
        g.fillStyle(trim, 0.9); g.fillRect(x - 8 * s, y + 1 * s, 16 * s, 2 * s);
        break;
      case 'tophat':
        g.fillStyle(0x1a1418, 1); g.fillRect(x - 9 * s, y + 1 * s, 18 * s, 2.5 * s); g.fillRect(x - 5.5 * s, y - 10 * s, 11 * s, 11 * s);
        g.fillStyle(trim, 1); g.fillRect(x - 5.5 * s, y - 2 * s, 11 * s, 2 * s);
        break;
      case 'leaf':
        g.fillStyle(0x4ab040, 1); g.fillEllipse(x + 2 * s, y - 2 * s, 6 * s, 12 * s);
        g.lineStyle(1, 0x2a6a2a, 1); g.beginPath(); g.moveTo(x + 2 * s, y + 3 * s); g.lineTo(x + 2 * s, y - 7 * s); g.strokePath();
        break;
      case 'halo':
        g.lineStyle(2, 0xfff0a0, 0.9); g.strokeEllipse(x, y - 6 * s, 14 * s, 4 * s);
        break;
      case 'antenna':
        g.lineStyle(1.2, 0x3a3a44, 1); g.beginPath(); g.moveTo(x, y + 2 * s); g.lineTo(x + 2 * s, y - 10 * s); g.strokePath();
        g.fillStyle(this.th.glow, 1); g.fillCircle(x + 2 * s, y - 11 * s, 2 * s);
        break;
      case 'crown':
        g.fillStyle(0xffc44d, 1);
        g.beginPath(); g.moveTo(x - 6 * s, y + 2 * s); g.lineTo(x - 6 * s, y - 4 * s); g.lineTo(x - 3 * s, y - 1 * s); g.lineTo(x, y - 6 * s); g.lineTo(x + 3 * s, y - 1 * s); g.lineTo(x + 6 * s, y - 4 * s); g.lineTo(x + 6 * s, y + 2 * s); g.closePath(); g.fillPath();
        break;
      case 'band':
        g.fillStyle(trim, 1); g.fillRect(x - 9 * s, y + 1 * s, 18 * s, 2.5 * s);
        g.fillTriangle(x + 8 * s, y + 1 * s, x + 13 * s, y + 4 * s, x + 9 * s, y + 4 * s);
        break;
      case 'straw':
        g.fillStyle(0xd8b050, 1); g.fillEllipse(x, y + 2 * s, 22 * s, 5 * s);
        g.slice(x, y + 2 * s, 6 * s, Math.PI, 0, false); g.fillPath();
        g.fillStyle(0xa03a2a, 1); g.fillRect(x - 6 * s, y, 12 * s, 1.5 * s);
        break;
      case 'mask':
        g.fillStyle(0xf4f0ff, 0.9); g.fillEllipse(x, y + 7 * s, 14 * s, 7 * s);
        g.fillStyle(0x000000, 0.7); g.fillCircle(x - 3 * s, y + 7 * s, 1.5 * s); g.fillCircle(x + 3 * s, y + 7 * s, 1.5 * s);
        break;
      case 'none':
      default:
        break;
    }
  }

  destroy(): void {
    for (const n of this.npcs) {
      n.g.destroy();
      if (n.bubble) { n.bubble.g.destroy(); n.bubble.text.destroy(); }
    }
    this.npcs = [];
  }
}
