import Phaser from 'phaser';
import { C, mix, lighten, darken, tintPlate } from './Theme';
import {
  ALL_CORNERS, fillNotched, fillNotchedGradient, strokeNotched, drawSheen, drawGlow,
  drawCornerBrackets, fillDiamond, fillStar,
} from './Shapes';

/**
 * The in-match combat HUD furniture: the ability tray band, each ability card's face, the
 * live overlay that animates those cards, and the top-centre player health gauge.
 *
 * ArenaScene still owns the *data* objects — each card's cooldown fill is a plain Rectangle
 * that thirty kits resize and recolour directly, and the HP bar's fills are rectangles the
 * scene sizes every frame. Everything here only reads those objects and paints around them,
 * so no kit had to learn a new API for the tray to look better.
 */

/** Corner cut of an ability card. */
export const CARD_CUT = 8;

/** The bits of an ability-tray entry the overlay reads. Structural, so ArenaScene's entry fits. */
export interface TrayCard {
  fill: Phaser.GameObjects.Rectangle;
  maxWidth: number;
  baseFillColor?: number;
}

// ── Tray band ─────────────────────────────────────────────────────────

/** The band's tint for a given element colour. */
function trayTone(accent: number): number {
  return mix(C.arcane, accent, 0.55);
}

/** The band's colour just behind the cards' top and bottom corners — what the overlay masks with. */
export function trayCornerColors(accent: number): [number, number] {
  const tone = trayTone(accent);
  return [mix(C.void_, tone, 0.13), mix(C.void_, tone, 0.025)];
}

/**
 * The band the five cards sit in: a dark machined rail tinted by the player's element, lit
 * along its top edge, with an etched scale and a crest plate at each end.
 */
export function drawAbilityTrayBand(
  g: Phaser.GameObjects.Graphics, W: number, top: number, h: number, accent: number,
): void {
  const tone = trayTone(accent);
  fillNotchedGradient(g, 0, top, W, h,
    mix(C.void_, tone, 0.14), mix(C.void_, tone, 0.02), 0.97, 0, ALL_CORNERS, 12);

  // Lit top rail with a soft bloom below it.
  g.fillStyle(tone, 0.08);
  g.fillRect(0, top, W, 6);
  g.lineStyle(2, tone, 0.55);
  g.beginPath(); g.moveTo(12, top); g.lineTo(W - 12, top); g.strokePath();
  g.lineStyle(1, lighten(tone, 0.5), 0.35);
  g.beginPath(); g.moveTo(60, top + 1); g.lineTo(W - 60, top + 1); g.strokePath();

  // Etched scale, longer every fifth tick.
  for (let tx = 24, i = 0; tx < W - 24; tx += 12, i++) {
    const long = i % 5 === 0;
    g.lineStyle(1, tone, long ? 0.22 : 0.12);
    g.beginPath(); g.moveTo(tx, top + 3); g.lineTo(tx, top + (long ? 9 : 5)); g.strokePath();
  }

  // Centre ornament riding the rail.
  fillDiamond(g, W / 2, top, 5, darken(tone, 0.3), 1);
  fillDiamond(g, W / 2, top, 3.5, lighten(tone, 0.35), 0.95);
  for (const s of [-1, 1]) {
    fillDiamond(g, W / 2 + s * 14, top, 2, tone, 0.8);
    fillDiamond(g, W / 2 + s * 24, top, 1.5, tone, 0.6);
  }
}

/** The dodge key's keycap, parked at the right end of the tray. */
export function drawDodgeKeycap(
  g: Phaser.GameObjects.Graphics, cx: number, cy: number, accent: number,
): void {
  const w = 54;
  const h = 34;
  const x = cx - w / 2;
  const y = cy - h / 2;
  fillNotched(g, x, y + 3, w, h, 0x000000, 0.45, 6);
  fillNotchedGradient(g, x, y, w, h,
    mix(tintPlate(accent, 0.2), 0xffffff, 0.08), darken(tintPlate(accent, 0.1), 0.45), 1, 6, ALL_CORNERS, 10);
  strokeNotched(g, x, y, w, h, accent, 0.5, 1.5, 6);
  // The keycap's dished face.
  fillNotched(g, x + 5, y + 4, w - 10, h - 12, 0xffffff, 0.05, 4);
  drawSheen(g, x, y, w, h, lighten(accent, 0.7), 0.3, 6);
}

// ── Ability card face ─────────────────────────────────────────────────

/**
 * The static face of one ability card: a drop-shadowed, bevelled plate tinted by the
 * ability's colour, with an accent spine, rivets in the cut corners and a lit top edge. A
 * mastery ability that has taken the slot gets a gilded frame and corner brackets.
 */
export function drawAbilityCardPlate(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number, w: number, h: number,
  accent: number, bound = false,
): void {
  const cut = CARD_CUT;
  const frame = bound ? C.gold : accent;

  // Drop shadow, so the card sits *on* the rail rather than in it.
  fillNotched(g, x + 1, y + 3, w, h, 0x000000, 0.5, cut);
  if (bound) drawGlow(g, x, y, w, h, C.gold, 0.35, 3, 2, cut);

  fillNotchedGradient(g, x, y, w, h,
    mix(tintPlate(accent, 0.24), 0xffffff, 0.06),
    mix(tintPlate(accent, 0.1), 0x000000, 0.55), 1, cut, ALL_CORNERS, 14);

  // Inner bevel: a dark inset ring with a lit ring just inside it.
  strokeNotched(g, x + 3, y + 3, w - 6, h - 6, 0x000000, 0.35, 1, cut - 2);
  strokeNotched(g, x + 4, y + 4, w - 8, h - 8, lighten(accent, 0.3), 0.08, 1, cut - 3);

  // Accent spine down the left and a stripe along the foot.
  g.fillStyle(accent, 0.75);
  g.fillRect(x + 1, y + cut, 2, h - cut * 2);
  g.lineStyle(1.5, accent, 0.5);
  g.beginPath(); g.moveTo(x + cut + 4, y + h - 2.5); g.lineTo(x + w - cut - 4, y + h - 2.5); g.strokePath();

  // Rivets sitting in each cut corner.
  const rv = lighten(frame, 0.35);
  for (const [rx, ry] of [[x + 4, y + 4], [x + w - 4, y + 4], [x + w - 4, y + h - 4], [x + 4, y + h - 4]]) {
    g.fillStyle(0x000000, 0.5); g.fillCircle(rx, ry + 0.6, 1.6);
    g.fillStyle(rv, 0.7); g.fillCircle(rx, ry, 1.3);
  }

  strokeNotched(g, x, y, w, h, frame, bound ? 0.95 : 0.6, 1.5, cut);
  drawSheen(g, x, y, w, h, lighten(frame, 0.7), 0.3, cut);
  if (bound) {
    drawCornerBrackets(g, x - 2, y - 2, w + 4, h + 4, lighten(C.gold, 0.25), 0.9, 1.5, 9, cut + 1);
    fillStar(g, x + w - 12, y + 9, 4, C.gold, 0.9);
  }
}

// ── Live tray overlay ─────────────────────────────────────────────────

interface CardState { prev: number; readyAt: number }

/**
 * Paints over the live cooldown fills every frame, between the fill and the card text:
 * hatched "recharging" veil over the empty part, a bright leading edge riding the fill,
 * glass highlight, and — once an ability is up — a breathing outline, a periodic sheen sweep
 * and a one-shot flash the moment it comes off cooldown.
 *
 * It reads `abilityBars` through a getter on purpose: form-swapping elements reassign that
 * array, and hidden rows are skipped because their fills are invisible.
 */
export class AbilityTrayFx {
  private g: Phaser.GameObjects.Graphics;
  private state = new WeakMap<Phaser.GameObjects.Rectangle, CardState>();

  constructor(
    scene: Phaser.Scene,
    private getCards: () => TrayCard[],
    /** Tray colour behind the cards' top and bottom corners, for masking the fill's square corners. */
    private cornerTop: number,
    private cornerBottom: number,
  ) {
    this.g = scene.add.graphics().setDepth(22.5);
  }

  update(time: number): void {
    const g = this.g;
    if (!g.active) return;
    g.clear();
    const cards = this.getCards();
    for (let i = 0; i < cards.length; i++) {
      const c = cards[i];
      const f = c.fill;
      if (!f.active || !f.visible) continue;
      this.drawCard(g, c, i, time);
    }
  }

  private drawCard(g: Phaser.GameObjects.Graphics, c: TrayCard, idx: number, time: number): void {
    const f = c.fill;
    const w = c.maxWidth;
    const h = f.height;
    const x0 = f.x;
    const top = f.y - h / 2;
    const bot = top + h;
    const cut = CARD_CUT;
    const r = Phaser.Math.Clamp(w > 0 ? f.width / w : 0, 0, 1);
    const col = f.fillColor;
    const frame = c.baseFillColor ?? col;
    const ready = r >= 0.995;

    let st = this.state.get(f);
    if (!st) { st = { prev: r, readyAt: -99999 }; this.state.set(f, st); }
    if (ready && st.prev < 0.995) st.readyAt = time;
    st.prev = r;

    const edge = x0 + w * r;

    if (!ready) {
      // Recharging veil with slow-scrolling hatch.
      g.fillStyle(0x000000, 0.3);
      g.fillRect(edge, top, x0 + w - edge, h);
      g.lineStyle(1, 0xffffff, 0.05);
      const step = 7;
      const lean = h * 0.45;
      const shift = (time * 0.012) % step;
      for (let lx = edge - lean + shift; lx < x0 + w; lx += step) {
        const ax = Math.max(lx, edge);
        const bx = Math.min(lx + lean, x0 + w);
        if (bx <= ax) continue;
        // Keep the slope while clamping both ends into the veil.
        const ay = bot - ((ax - lx) / lean) * h;
        const by = bot - ((bx - lx) / lean) * h;
        g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.strokePath();
      }
      if (r > 0.01) {
        const hot = lighten(col, 0.55);
        g.fillStyle(hot, 0.18);
        g.fillRect(edge - 6, top + 2, 6, h - 4);
        g.fillStyle(hot, 0.9);
        g.fillRect(edge - 1, top + 2, 2, h - 4);
        const sy = top + h / 2 + Math.sin(time * 0.006 + idx) * (h * 0.32);
        g.fillStyle(0xffffff, 0.85);
        g.fillCircle(edge, sy, 1.6);
        g.fillStyle(hot, 0.35);
        g.fillCircle(edge, sy, 3.5);
      }
    }

    // Glass: a soft highlight across the top third, a shade along the foot.
    g.fillStyle(0xffffff, 0.06);
    g.fillRect(x0 + cut, top + 2, w - cut * 2, h * 0.26);
    g.fillStyle(0x000000, 0.12);
    g.fillRect(x0 + 2, bot - h * 0.2, w - 4, h * 0.2 - 1);

    // Mask the fill rectangle's square corners back to the card's cut silhouette.
    g.fillStyle(this.cornerTop, 1);
    g.fillTriangle(x0 - 1, top - 1, x0 + cut, top - 1, x0 - 1, top + cut);
    g.fillTriangle(x0 + w + 1, top - 1, x0 + w - cut, top - 1, x0 + w + 1, top + cut);
    g.fillStyle(this.cornerBottom, 1);
    g.fillTriangle(x0 - 1, bot + 1, x0 + cut, bot + 1, x0 - 1, bot - cut);
    g.fillTriangle(x0 + w + 1, bot + 1, x0 + w - cut, bot + 1, x0 + w + 1, bot - cut);

    if (ready) {
      const pulse = 0.5 + 0.5 * Math.sin(time * 0.004 + idx * 1.3);
      strokeNotched(g, x0 - 2, top - 2, w + 4, h + 4, lighten(frame, 0.3), 0.18 + 0.3 * pulse, 2, cut + 1);

      // Sheen sweep every few seconds, staggered per card.
      const period = 2800;
      const phase = ((time + idx * 450) % period) / period;
      if (phase < 0.3) {
        const k = phase / 0.3;
        const lean = h * 0.5;
        const sx = x0 - lean + k * (w + lean);
        const clampX = (v: number) => Phaser.Math.Clamp(v, x0 + 2, x0 + w - 2);
        g.fillStyle(0xffffff, 0.14 * Math.sin(k * Math.PI));
        g.fillPoints([
          new Phaser.Geom.Point(clampX(sx), bot - 2),
          new Phaser.Geom.Point(clampX(sx + 12), bot - 2),
          new Phaser.Geom.Point(clampX(sx + 12 + lean), top + 2),
          new Phaser.Geom.Point(clampX(sx + lean), top + 2),
        ], true, true);
      }
    }

    // Comes-off-cooldown flash: a bright ring that blooms outward and fades.
    const since = time - st.readyAt;
    if (since >= 0 && since < 420) {
      const k = since / 420;
      const o = 1 + k * 7;
      strokeNotched(g, x0 - o, top - o, w + o * 2, h + o * 2, lighten(frame, 0.6), (1 - k) * 0.9, 2, cut + o);
      g.fillStyle(0xffffff, (1 - k) * 0.18);
      g.fillRect(x0 + 2, top + 2, w - 4, h - 4);
    }

    // Re-stroke the frame on top of the fill so the card edge never disappears under it.
    strokeNotched(g, x0, top, w, h, frame, ready ? 0.85 : 0.5, 1.5, cut);
  }

  destroy(): void {
    this.g.destroy();
  }
}

// ── Player health gauge ───────────────────────────────────────────────

/**
 * Everything around the top HP bar's fills: the armoured housing with an element crest at
 * the left end, a lagging "damage ghost" that shows the chunk you just lost before draining
 * away, gloss and segment ticks over the fill, a travelling shine, and a heartbeat glow once
 * health is low.
 *
 * The scene still sizes and colours the fill rectangles; `update` is told the ratios it used.
 */
export class PlayerHpGauge {
  private under: Phaser.GameObjects.Graphics;
  private over: Phaser.GameObjects.Graphics;
  private housing: Phaser.GameObjects.Graphics;
  private ghost = 1;
  private ghostHoldUntil = 0;
  private lastRatio = 1;
  private healFlashAt = -99999;
  private lastTime = -1;

  constructor(
    scene: Phaser.Scene,
    private left: number,
    private cy: number,
    private w: number,
    private h: number,
    private accent: number,
  ) {
    this.housing = scene.add.graphics().setDepth(20);
    this.under = scene.add.graphics().setDepth(20.5);
    this.over = scene.add.graphics().setDepth(21.5);
    this.drawHousing();
  }

  private drawHousing(): void {
    const g = this.housing;
    const { left, cy, w, h, accent } = this;
    const frame = mix(C.frost, accent, 0.45);
    const hx = left - 6;
    const hy = cy - h / 2 - 6;
    const hw = w + 12;
    const hh = h + 12;

    // Drop shadow + bloom + plate.
    fillNotched(g, hx, hy + 3, hw, hh, 0x000000, 0.5, 9);
    drawGlow(g, hx, hy, hw, hh, frame, 0.25, 3, 3, 9);
    fillNotchedGradient(g, hx, hy, hw, hh,
      mix(C.void_, frame, 0.16), mix(C.void_, frame, 0.03), 0.96, 9, ALL_CORNERS, 10);
    strokeNotched(g, hx, hy, hw, hh, frame, 0.65, 2, 9);
    drawCornerBrackets(g, hx - 2, hy - 2, hw + 4, hh + 4, lighten(frame, 0.35), 0.85, 2, 14, 10);

    // Trough the fill runs in: recessed, with a dark inner lip.
    g.fillStyle(0x020206, 1);
    g.fillRect(left, cy - h / 2, w, h);
    g.lineStyle(1, 0x000000, 0.9);
    g.strokeRect(left - 0.5, cy - h / 2 - 0.5, w + 1, h + 1);
    g.lineStyle(1, lighten(frame, 0.2), 0.18);
    g.beginPath(); g.moveTo(left, cy + h / 2 + 1.5); g.lineTo(left + w, cy + h / 2 + 1.5); g.strokePath();

    // End caps: rivets top and bottom at the right end.
    for (const ry of [hy + 5, hy + hh - 5]) {
      g.fillStyle(0x000000, 0.5); g.fillCircle(hx + hw - 14, ry + 0.6, 1.8);
      g.fillStyle(lighten(frame, 0.4), 0.8); g.fillCircle(hx + hw - 14, ry, 1.4);
    }

    // Element crest at the left end: a faceted gem in the player's colour, set in a frame.
    const gx = hx - 6;
    const gy = cy;
    const R = h * 0.95;
    const hexPts = (rad: number) => {
      const pts: Phaser.Geom.Point[] = [];
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i + Math.PI / 6;
        pts.push(new Phaser.Geom.Point(gx + Math.cos(a) * rad, gy + Math.sin(a) * rad));
      }
      return pts;
    };
    g.fillStyle(0x000000, 0.5); g.fillPoints(hexPts(R + 3).map((p) => new Phaser.Geom.Point(p.x, p.y + 2)), true, true);
    g.fillStyle(mix(C.void_, frame, 0.25), 1); g.fillPoints(hexPts(R + 3), true, true);
    g.lineStyle(2, frame, 0.85); g.strokePoints(hexPts(R + 3), true, true);
    g.fillStyle(darken(accent, 0.35), 1); g.fillPoints(hexPts(R - 2), true, true);
    g.fillStyle(accent, 1); g.fillPoints(hexPts(R - 5), true, true);
    // Facets: lit top-left, shaded bottom-right.
    g.fillStyle(0xffffff, 0.35);
    g.fillTriangle(gx, gy, gx - (R - 5) * 0.87, gy - (R - 5) * 0.5, gx, gy - (R - 5));
    g.fillStyle(0x000000, 0.25);
    g.fillTriangle(gx, gy, gx + (R - 5) * 0.87, gy + (R - 5) * 0.5, gx, gy + (R - 5));
    g.fillStyle(0xffffff, 0.8); g.fillCircle(gx - R * 0.28, gy - R * 0.32, 2);
  }

  /**
   * @param ratio        health / max
   * @param clotRatio    clotted slice, riding after health
   * @param shieldRatio  shield slice, riding after clotted
   */
  update(time: number, ratio: number, clotRatio: number, shieldRatio: number, fillColor: number): void {
    if (!this.over.active) return;
    const { left, cy, w, h } = this;
    const top = cy - h / 2;

    // Damage ghost: hold briefly at the old value, then drain toward the real one.
    if (ratio < this.lastRatio - 0.0005) {
      if (this.ghost < this.lastRatio) this.ghost = this.lastRatio;
      this.ghostHoldUntil = time + 380;
    } else if (ratio > this.lastRatio + 0.002) {
      this.healFlashAt = time;
    }
    this.lastRatio = ratio;
    const dt = this.lastTime < 0 ? 0 : Math.min(100, Math.max(0, time - this.lastTime));
    this.lastTime = time;
    if (this.ghost < ratio) this.ghost = ratio;
    // Drains at 40% of the bar per second once the hold expires.
    else if (time > this.ghostHoldUntil) this.ghost = Math.max(ratio, this.ghost - dt * 0.0004);

    const u = this.under;
    u.clear();
    if (this.ghost > ratio + 0.001) {
      const gx = left + w * ratio;
      const gw = w * (this.ghost - ratio);
      u.fillStyle(0xfff1d6, 0.85);
      u.fillRect(gx, top, gw, h);
      u.fillStyle(0xff5a3c, 0.45);
      u.fillRect(gx, top + h * 0.55, gw, h * 0.45);
    }

    const g = this.over;
    g.clear();
    const filled = Math.min(1, ratio + clotRatio + shieldRatio);
    const fw = w * filled;
    if (fw > 0.5) {
      // Gloss: bright upper band, darker foot.
      g.fillStyle(0xffffff, 0.22);
      g.fillRect(left, top + 1, fw, h * 0.3);
      g.fillStyle(0xffffff, 0.08);
      g.fillRect(left, top + h * 0.3, fw, h * 0.12);
      g.fillStyle(0x000000, 0.22);
      g.fillRect(left, top + h * 0.72, fw, h * 0.28);

      // Travelling shine across the filled part.
      const period = 3200;
      const k = (time % period) / period;
      const sx = left - 40 + k * (w + 80);
      if (sx < left + fw) {
        for (let i = 0; i < 6; i++) {
          const bx = sx + i * 5;
          if (bx < left || bx > left + fw - 3) continue;
          g.fillStyle(0xffffff, 0.05 + 0.03 * (3 - Math.abs(i - 2.5)));
          g.fillRect(bx, top + 1, 4, h - 2);
        }
      }

      // Leading edge of the health fill.
      const ex = left + w * ratio;
      if (ratio > 0.005 && ratio < 0.999) {
        g.fillStyle(lighten(fillColor, 0.6), 0.9);
        g.fillRect(ex - 2, top + 1, 2, h - 2);
      }
    }

    // Segment ticks: every eighth of the bar, heavier at the quarters.
    for (let s = 1; s < 8; s++) {
      const sx = left + (w / 8) * s;
      const quarter = s % 2 === 0;
      g.lineStyle(quarter ? 2 : 1, 0x000000, quarter ? 0.45 : 0.3);
      g.beginPath(); g.moveTo(sx, top + (quarter ? 0 : h * 0.45)); g.lineTo(sx, top + h); g.strokePath();
    }

    // Heal shimmer.
    const since = time - this.healFlashAt;
    if (since >= 0 && since < 500) {
      g.fillStyle(0x9dffb8, (1 - since / 500) * 0.35);
      g.fillRect(left, top, w * ratio, h);
    }

    // Low-health heartbeat: a red pulse around the housing.
    if (ratio > 0 && ratio <= 0.25) {
      const beat = (time % 900) / 900;
      const a = beat < 0.15 ? beat / 0.15 : beat < 0.3 ? 1 - (beat - 0.15) / 0.15 : 0;
      const o = 7 + a * 4;
      strokeNotched(g, left - o, top - o, w + o * 2, h + o * 2, 0xff2a2a, 0.15 + a * 0.55, 2, 9 + o - 6);
      g.fillStyle(0xff2a2a, a * 0.12);
      g.fillRect(left, top, w, h);
    }
  }

  destroy(): void {
    this.under.destroy();
    this.over.destroy();
    this.housing.destroy();
  }
}
