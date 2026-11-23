import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { glow, lit } from '../../../../../art/IsleArt';
import { rune } from '../art';
import { FONT, FONT_DEEP, FONT_RIM, MANA, MANA_DEEP, MANA_LIT, SCORCH, SLATE_DEEP } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Mana Font — Font-Keeper Wellspring.
 *
 * Springs of liquid light crack up through the flags — three at a time, four on hard. Stand in a
 * font and it soaks into you: your cooldowns run more than twice as fast. But a font *fills* while
 * anyone stands in it (a ring of light climbs round its rim) and an overfull font bursts — a pillar
 * of light that hurts, throws and staggers whoever is still in it — and then dries up and springs
 * again somewhere else. Two in one font fill it twice as fast.
 *
 * Every so often Wellspring kneels and *taps* the springs: every font on the floor jumps toward
 * full at once. Drink, and get out in time — or step out just as she steps in.
 */

const FONT_R = 50;
const FILL_PER_S = 22;
const DRAIN_PER_S = 6;
const RISE_MS = 1000;
const LIFE_MS = 16000;
const BURST_DMG = 18;
const TAP_WARN = 1300;
const TAP_FILL = 30;

interface Font {
  x: number; y: number;
  bornAt: number;
  fill: number;
  /** 0 = still springing, 1 = live, 2 = burst/dried (fading). */
  state: 0 | 1 | 2;
  endAt: number;
  burst: boolean;
  seed: number;
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const maxFonts = ctx.hard ? 4 : 3;
  let fonts: Font[] = [];
  let nextSpring = 0;
  let nextTap = 0;
  let tapWarnAt = -1;
  let started = false;
  const now = () => ctx.scene.time.now;

  const live = () => fonts.filter((f) => f.state === 1);
  const inFont = (who: Fighter): Font | null => {
    if (!alive(who)) return null;
    for (const f of fonts) if (f.state === 1 && dist(who.x, who.y, f.x, f.y) < FONT_R) return f;
    return null;
  };

  function spring(time: number): void {
    let p: Pt = { x: W / 2, y: (H + top) / 2 };
    for (let i = 0; i < 12; i++) {
      p = { x: 110 + rng() * (W - 220), y: top + 90 + rng() * (H - top - 160) };
      if (fonts.every((f) => dist(f.x, f.y, p.x, p.y) > FONT_R * 3) && dist(p.x, p.y, player.x, player.y) > 70) break;
    }
    fonts.push({ x: p.x, y: p.y, bornAt: time, fill: 0, state: 0, endAt: time + RISE_MS + LIFE_MS, burst: false, seed: rng() * 10 });
    ctx.sfx('geyser');
  }

  function burst(f: Font, time: number): void {
    f.state = 2; f.burst = true; f.endAt = time + 700;
    ctx.sfx('explosion-medium');
    ctx.flash(f.x, f.y, 0xfff4c8);
    for (const who of [player, npc]) {
      if (!alive(who) || dist(who.x, who.y, f.x, f.y) > FONT_R + 10) continue;
      const a = Math.atan2(who.y - f.y, who.x - f.x) || rng() * Math.PI * 2;
      ctx.hit(who, BURST_DMG, who.x, who.y);
      ctx.nudge(who, Math.cos(a) * 90, Math.sin(a) * 90);
      ctx.stun(who, 380);
      ctx.float(who.x, who.y - 50, 'OVERFLOW', '#fff4c8');
    }
    nextSpring = Math.min(nextSpring, time + 1500);
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) {
        started = true;
        for (let i = 0; i < maxFonts; i++) spring(time - RISE_MS * (i === 0 ? 1 : 0));
        nextSpring = time + 4000;
        nextTap = time + (ctx.hard ? 8000 : 10000);
      }
      for (const f of fonts) {
        if (f.state === 0 && time - f.bornAt >= RISE_MS) f.state = 1;
        if (f.state !== 1) continue;
        const n = (inFont(player) === f ? 1 : 0) + (inFont(npc) === f ? 1 : 0);
        f.fill = clamp(f.fill + (n ? FILL_PER_S * n : -DRAIN_PER_S) * dt, 0, 100);
        if (f.fill >= 100) burst(f, time);
        else if (time >= f.endAt) { f.state = 2; f.endAt = time + 700; }
      }
      fonts = fonts.filter((f) => f.state !== 2 || time < f.endAt);
      if (time >= nextSpring && fonts.length < maxFonts) { spring(time); nextSpring = time + 1800; }
      // Wellspring taps the springs.
      if (tapWarnAt < 0 && time >= nextTap - TAP_WARN) {
        tapWarnAt = time;
        ctx.banner('WELLSPRING TAPS THE SPRINGS', '#fff4c8');
        ctx.sfx('beam-charge');
      }
      if (time >= nextTap) {
        tapWarnAt = -1;
        nextTap = time + (ctx.hard ? 8000 : 10000);
        for (const f of live()) { f.fill = Math.min(100, f.fill + TAP_FILL); if (f.fill >= 100) burst(f, time); }
        ctx.sfx('splash');
      }
    },

    playerCooldownRate() { return inFont(player) ? 2.2 : 1; },
    npcCooldownRate() { return inFont(npc) ? 2.2 : 1; },

    npcSeek() {
      const mine = inFont(npc);
      const t = now();
      const tapping = tapWarnAt >= 0 || nextTap - t < 1600;
      // Overfull, or a tap coming: get out, away from the spring.
      if (mine && (mine.fill > 72 || (tapping && mine.fill > 40))) {
        const a = Math.atan2(npc.y - mine.y, npc.x - mine.x);
        return { x: clamp(mine.x + Math.cos(a) * 130, 60, W - 60), y: clamp(mine.y + Math.sin(a) * 130, top + 50, H - 40) };
      }
      if (mine) return { x: mine.x, y: mine.y };
      // Otherwise the emptiest font you are not standing in.
      const yours = inFont(player);
      let best: Font | null = null, bs = Infinity;
      for (const f of live()) {
        if (f === yours || f.fill > 60) continue;
        const s = f.fill * 4 + dist(f.x, f.y, npc.x, npc.y);
        if (s < bs) { bs = s; best = f; }
      }
      return best ? { x: best.x, y: best.y } : null;
    },

    drawGround(g, time) {
      const tapK = tapWarnAt >= 0 ? clamp((time - tapWarnAt) / TAP_WARN, 0, 1) : 0;
      for (const f of fonts) {
        const rise = clamp((time - f.bornAt) / RISE_MS, 0, 1);
        const fade = f.state === 2 ? clamp((f.endAt - time) / 700, 0, 1) : 1;
        const k = f.fill / 100;
        // The crack in the slate it wells up through.
        g.fillStyle(SCORCH, 0.25 * fade); g.fillEllipse(f.x, f.y + 4, FONT_R * 2.4, FONT_R * 1.3);
        for (let i = 0; i < 7; i++) {
          const a = f.seed + i * 0.9;
          g.lineStyle(2, FONT_DEEP, 0.6 * fade); g.lineBetween(f.x, f.y, f.x + Math.cos(a) * FONT_R * 1.15, f.y + Math.sin(a) * FONT_R * 0.7);
        }
        if (f.state === 0) {
          // Springing: light bleeding along the cracks, a ring closing in.
          g.lineStyle(2, MANA_LIT, 0.4 + rise * 0.5); g.strokeEllipse(f.x, f.y, FONT_R * 2 * (1.6 - rise * 0.6), FONT_R * 1.2 * (1.6 - rise * 0.6));
          g.fillStyle(FONT, 0.3 * rise); g.fillEllipse(f.x, f.y, FONT_R * 1.4 * rise, FONT_R * 0.8 * rise);
          continue;
        }
        // The pool of liquid light, brightening as it fills, trembling near full.
        const shake = k > 0.75 ? Math.sin(time / 30 + f.seed) * (k - 0.75) * 12 : 0;
        g.fillStyle(FONT_DEEP, 0.8 * fade); g.fillEllipse(f.x + shake, f.y, FONT_R * 2, FONT_R * 1.15);
        g.fillStyle(FONT_RIM, 0.85 * fade); g.fillEllipse(f.x + shake, f.y - 1, FONT_R * 1.8, FONT_R * 1.0);
        g.fillStyle(lit(FONT, k * 0.6), (0.6 + k * 0.4) * fade); g.fillEllipse(f.x + shake, f.y - 2, FONT_R * (0.9 + k * 0.8), FONT_R * (0.5 + k * 0.45));
        for (let i = 0; i < 3; i++) {
          const ph = (time / 1400 + i / 3 + f.seed) % 1;
          g.lineStyle(1.5, 0xffffff, 0.5 * (1 - ph) * fade); g.strokeEllipse(f.x, f.y - 2, FONT_R * 0.4 + ph * FONT_R * 1.5, FONT_R * 0.25 + ph * FONT_R * 0.85);
        }
        // Rune-motes turning in it.
        for (let i = 0; i < 4; i++) {
          const a = time / 1800 + f.seed + i * 1.57;
          rune(g, f.x + Math.cos(a) * FONT_R * 0.55, f.y + Math.sin(a) * FONT_R * 0.32, 4, i + Math.floor(f.seed), MANA_DEEP, 0.55 * fade, 1.2);
        }
        // The fill meter: a ring round the rim, gold, going white near full.
        g.lineStyle(4, SLATE_DEEP, 0.6 * fade); g.strokeEllipse(f.x, f.y, FONT_R * 2 + 14, FONT_R * 1.15 + 12);
        g.lineStyle(4, k > 0.75 ? 0xffffff : 0xf0c850, 0.9 * fade);
        g.beginPath();
        for (let s = 0; s <= 32 * k; s++) {
          const a = -Math.PI / 2 + (s / 32) * Math.PI * 2;
          const px = f.x + Math.cos(a) * (FONT_R + 7), py = f.y + Math.sin(a) * (FONT_R * 0.575 + 6);
          if (s === 0) g.moveTo(px, py); else g.lineTo(px, py);
        }
        g.strokePath();
        // The tap's warning: ripples racing in from the edge of every font.
        if (tapK > 0 && f.state === 1) { g.lineStyle(2, FONT, 0.3 + tapK * 0.6); g.strokeEllipse(f.x, f.y, (FONT_R * 2 + 60) * (1 - tapK) + FONT_R * 2 * tapK, (FONT_R * 1.15 + 34) * (1 - tapK) + FONT_R * 1.15 * tapK); }
      }
    },

    drawAir(g, time) {
      for (const f of fonts) {
        if (f.state === 0) continue;
        const k = f.fill / 100;
        if (f.state === 2 && f.burst) {
          // A pillar of light where it burst.
          const b = clamp((f.endAt - time) / 700, 0, 1);
          glow(g, f.x, f.y - 60, 60, FONT, 0.12 * b, 4);
          g.fillStyle(0xffffff, 0.7 * b); g.fillRect(f.x - FONT_R * 0.5 * b, f.y - 220, FONT_R * b, 220);
          g.fillStyle(FONT, 0.5 * b); g.fillRect(f.x - FONT_R * 0.8 * b, f.y - 200, FONT_R * 1.6 * b, 200);
          g.lineStyle(3, 0xffffff, b); g.strokeEllipse(f.x, f.y, FONT_R * 2 * (2 - b), FONT_R * 1.15 * (2 - b));
          continue;
        }
        if (f.state !== 1) continue;
        // The spout: a little gout of light, taller the fuller it is.
        const h = 14 + k * 46 + Math.sin(time / 160 + f.seed) * 4;
        glow(g, f.x, f.y - h * 0.6, 20 + k * 16, MANA, 0.04 + k * 0.05, 3);
        g.fillStyle(0xffffff, 0.45 + k * 0.4); g.fillEllipse(f.x, f.y - h * 0.5, 8 + k * 6, h);
        for (let i = 0; i < 5; i++) {
          const ph = (time / 700 + i / 5 + f.seed) % 1;
          const a = f.seed + i * 1.3;
          g.fillStyle(FONT, 0.8 * (1 - ph)); g.fillCircle(f.x + Math.cos(a) * ph * (18 + k * 16), f.y - h + ph * ph * (h + 10), 2.2 * (1 - ph) + 0.6);
        }
        // Anyone drinking glows.
        for (const who of [player, npc]) {
          if (inFont(who) !== f) continue;
          for (let i = 0; i < 3; i++) {
            const ph = (time / 600 + i / 3) % 1;
            g.fillStyle(MANA_LIT, 0.7 * (1 - ph)); g.fillCircle(who.x + Math.sin(i * 2.1 + time / 300) * 12, who.y - ph * 40, 2);
          }
        }
      }
    },

    drawHud(g) {
      // A vial: how full your font is (empty when you are not in one).
      const f = inFont(player);
      const x = 30, y = top + 12, h = 56;
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x - 10, y - 4, 20, h + 8, 6);
      g.lineStyle(1.5, FONT_RIM, 0.9); g.strokeRoundedRect(x - 8, y, 16, h, 5);
      if (f) {
        const k = f.fill / 100;
        g.fillStyle(k > 0.75 ? 0xffffff : FONT, 0.95); g.fillRoundedRect(x - 6, y + h - 2 - (h - 4) * k, 12, Math.max(3, (h - 4) * k), 4);
        g.fillStyle(MANA, 1); g.fillTriangle(x + 14, y + 10, x + 20, y + 4, x + 20, y + 16);
      }
    },
  };
}

export const MANA_FONT: GimmickDef = {
  id: 'arcane-mana-font',
  rules: 'Stand in a font of liquid light for much faster cooldowns — but it fills while you drink, and an overfull font bursts on whoever is in it.',
  make,
};
