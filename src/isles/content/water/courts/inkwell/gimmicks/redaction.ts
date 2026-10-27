import Phaser from 'phaser';
import type { EncounterGimmick, Fighter, GimmickCtx, GimmickDef, Pt } from './shared';
import { BLUE, BLUE_LIT, BLUE_WASH, INK, PAPER, WHITE } from '../palette';
import { CSS_BLUE, CSS_PAPER } from '../palette';
import { hatchRect, scribble } from '../inkArt';
import { mulberry } from '../../../../../art/IsleArt';

/**
 * Redaction — Censor Quill's fight.
 *
 * Quill rules black bars across the page, the way the censors black out a name. Each ruling is
 * pencilled first — a faint outline with a blue rule-line running down its middle and the ruler
 * sliding along it — then the bar SLAMS. Whoever is inside when it slams is stamped (a little
 * damage) and **redacted** for as long as they stay inside the bar:
 * • a redacted fighter cannot cast anything at all (the censor's bar is over their mouth);
 * • a redacted fighter is struck from the record — hits on them land at 40%;
 * • a redacted fighter is unseen — the bar is drawn over them, and the other side loses track.
 * Bars stand for a few seconds, then lift and blow away like a torn strip.
 *
 * Quill aims his rulings through the line you are standing on, and keeps himself out of them.
 * The trick is that his ruler only knows lines: a bar through your row is a bar through anyone
 * else on that row. Pull him level with you before it slams and he is gagged alongside you — or
 * step out at the last instant and leave him inside, mute, while you hit his margin.
 */

const BAR_W_H = 74; // thickness of a horizontal bar
const BAR_W_V = 84; // thickness of a vertical bar
const WARN_MS = 1250;
const STAND_MS = 3000;
const LIFT_MS = 420;
const REDACTED_TAKEN = 0.4;

interface Bar {
  /** Rect of the bar. */
  x: number; y: number; w: number; h: number;
  vertical: boolean;
  born: number;
  slamAt: number;
  liftAt: number;
  slammed: boolean;
  /** Ghost handwriting under the bar, so a lifted bar leaves a scrap of censored text. */
  seed: number;
}

export const REDACTION: GimmickDef = {
  id: 'inkwell-redaction',
  rules: 'Black bars slam across the page. Caught inside one you are redacted: unseen, struck at 40%, unable to cast.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const { W, H, top, hard } = ctx;
    const every = hard ? 2600 : 3300;
    const slamDmg = hard ? 11 : 8;
    let bars: Bar[] = [];
    let nextAt = ctx.scene.time.now + 2200;
    let rulings = 0;
    const redacted = { p: false, n: false };
    const announced = { p: false, n: false };
    /** Where the bot believes the player is while it cannot see them. */
    let lastSeen: Pt = { x: ctx.player.x, y: ctx.player.y };
    let searchAt: Pt = { x: W / 2, y: (top + H) / 2 };

    const inside = (b: Bar, f: Fighter): boolean =>
      f.x > b.x - 8 && f.x < b.x + b.w + 8 && f.y > b.y - 8 && f.y < b.y + b.h + 8;

    const rule = (time: number, aim: Pt, vertical: boolean): void => {
      const seed = Math.floor(ctx.rng() * 1e6);
      if (vertical) {
        const x = Phaser.Math.Clamp(aim.x - BAR_W_V / 2, 20, W - 20 - BAR_W_V);
        bars.push({ x, y: top + 4, w: BAR_W_V, h: H - top - 10, vertical, born: time, slamAt: time + WARN_MS, liftAt: time + WARN_MS + STAND_MS, slammed: false, seed });
      } else {
        const y = Phaser.Math.Clamp(aim.y - BAR_W_H / 2, top + 4, H - 6 - BAR_W_H);
        bars.push({ x: 14, y, w: W - 28, h: BAR_W_H, vertical, born: time, slamAt: time + WARN_MS, liftAt: time + WARN_MS + STAND_MS, slammed: false, seed });
      }
    };

    const fighters = (): [Fighter, 'p' | 'n'][] => [[ctx.player, 'p'], [ctx.npc, 'n']];

    return {
      update(time) {
        // A new ruling: through the player's line, alternating rows and columns, with a stray
        // second bar on the later rulings.
        if (time >= nextAt) {
          nextAt = time + every;
          rulings++;
          const p = ctx.player;
          const vertical = rulings % 2 === 0;
          rule(time, { x: p.x, y: p.y }, vertical);
          if (rulings > 2 && (hard || rulings % 3 === 0)) {
            const off = vertical ? (p.x < W / 2 ? 1 : -1) * (180 + ctx.rng() * 140) : (p.y < (top + H) / 2 ? 1 : -1) * (150 + ctx.rng() * 70);
            rule(time, { x: p.x + (vertical ? off : 0), y: p.y + (vertical ? 0 : off) }, !vertical);
          }
          ctx.sfx('trap-set');
        }

        // Slams.
        for (const b of bars) {
          if (!b.slammed && time >= b.slamAt) {
            b.slammed = true;
            ctx.sfx('stone-slam');
            for (const [f] of fighters()) {
              if (f.active && f.hp > 0 && inside(b, f)) {
                ctx.hit(f, slamDmg, f.x, f.y);
                ctx.float(f.x, f.y - 40, 'REDACTED', CSS_PAPER);
              }
            }
          }
        }
        bars = bars.filter((b) => time < b.liftAt + LIFT_MS);

        // Who is under a standing bar right now.
        for (const [f, k] of fighters()) {
          const was = redacted[k];
          redacted[k] = f.active && f.hp > 0 && bars.some((b) => b.slammed && time < b.liftAt && inside(b, f));
          if (redacted[k]) {
            // The bar is over their mouth: renew the cast lock a beat at a time while inside.
            f.disarmedUntil = Math.max(f.disarmedUntil, Date.now() + 260);
            if (!announced[k]) { announced[k] = true; if (k === 'n') ctx.float(f.x, f.y - 52, 'QUILL IS GAGGED', CSS_BLUE); }
          } else {
            announced[k] = false;
            if (was) ctx.float(f.x, f.y - 40, 'on the record', '#b4b0a6');
          }
        }
        if (!redacted.p) lastSeen = { x: ctx.player.x, y: ctx.player.y };
      },

      playerTakenMult: () => (redacted.p ? REDACTED_TAKEN : 1),
      npcTakenMult: () => (redacted.n ? REDACTED_TAKEN : 1),

      npcSeek() {
        const n = ctx.npc;
        const t = ctx.scene.time.now;
        // Pending rulings: get out of every pencilled bar, sideways along its short axis.
        for (const b of bars) {
          if (b.slammed || t > b.slamAt) continue;
          if (inside(b, n)) {
            if (b.vertical) {
              const left = b.x - 40, right = b.x + b.w + 40;
              return { x: n.x - left < right - n.x && left > 30 ? left : right, y: n.y };
            }
            const up = b.y - 40, down = b.y + b.h + 40;
            return { x: n.x, y: n.y - up < down - n.y && up > top + 20 ? up : down };
          }
        }
        // If he is gagged under a standing bar, walk out of it the short way.
        if (redacted.n) {
          const b = bars.find((bb) => bb.slammed && inside(bb, n));
          if (b) return b.vertical ? { x: n.x < b.x + b.w / 2 ? b.x - 30 : b.x + b.w + 30, y: n.y } : { x: n.x, y: n.y < b.y + b.h / 2 ? b.y - 30 : b.y + b.h + 30 };
        }
        // The player is redacted — Quill cannot see them. He prowls round where they vanished.
        if (redacted.p) {
          if (Phaser.Math.Distance.Between(n.x, n.y, searchAt.x, searchAt.y) < 30) {
            searchAt = { x: Phaser.Math.Clamp(lastSeen.x + (ctx.rng() - 0.5) * 260, 60, W - 60), y: Phaser.Math.Clamp(lastSeen.y + (ctx.rng() - 0.5) * 200, top + 40, H - 40) };
          }
          return searchAt;
        }
        return null;
      },

      drawGround(g, time) {
        for (const b of bars) {
          if (b.slammed) continue;
          const k = Phaser.Math.Clamp((time - b.born) / Math.max(1, b.slamAt - b.born), 0, 1);
          // Pencilled outline, filling with hatch as the slam nears.
          g.lineStyle(1.5, INK, 0.35 + k * 0.4);
          g.strokeRect(b.x, b.y, b.w, b.h);
          hatchRect(g, { x: b.x, y: b.y, w: b.w, h: b.h }, Math.max(5, 16 - k * 11), INK, 0.12 + k * 0.25, 1);
          // The blue rule-line down the middle, and the ruler sliding along it.
          g.lineStyle(2, BLUE, 0.5 + k * 0.4);
          if (b.vertical) {
            const cx = b.x + b.w / 2;
            g.lineBetween(cx, b.y, cx, b.y + b.h);
            const ry = b.y + (b.h - 90) * k;
            g.fillStyle(WHITE, 0.95); g.fillRect(cx - 8, ry, 16, 90);
            g.lineStyle(1.5, INK, 1); g.strokeRect(cx - 8, ry, 16, 90);
            for (let m = 0; m < 90; m += 9) g.lineBetween(cx - 8, ry + m, cx - (m % 27 === 0 ? 1 : 4), ry + m);
          } else {
            const cy = b.y + b.h / 2;
            g.lineBetween(b.x, cy, b.x + b.w, cy);
            const rx = b.x + (b.w - 120) * k;
            g.fillStyle(WHITE, 0.95); g.fillRect(rx, cy - 8, 120, 16);
            g.lineStyle(1.5, INK, 1); g.strokeRect(rx, cy - 8, 120, 16);
            for (let m = 0; m < 120; m += 10) g.lineBetween(rx + m, cy - 8, rx + m, cy - (m % 30 === 0 ? 1 : 4));
          }
        }
        // Lifted bars leave the censored text showing for a moment.
        for (const b of bars) {
          if (time < b.liftAt) continue;
          const k = (time - b.liftAt) / LIFT_MS;
          const r = mulberry(b.seed);
          const rows = Math.floor(b.h / 18);
          for (let i = 0; i < rows; i++) scribble(g, b.x + 8, b.y + 12 + i * 18, b.w - 16, r, INK, 0.5 * (1 - k));
        }
      },

      drawAir(g, time) {
        // Standing bars cover whoever is under them — that is what "unseen" means.
        for (const b of bars) {
          if (!b.slammed) continue;
          let x = b.x, y = b.y, w = b.w, h = b.h, a = 1;
          if (time >= b.liftAt) {
            // Torn away: the strip peels and blows off toward the margin.
            const k = (time - b.liftAt) / LIFT_MS;
            a = 1 - k;
            if (b.vertical) { x += k * 120; h *= 1 - k * 0.3; } else { y -= k * 60; w *= 1 - k * 0.3; x += k * 80; }
          }
          const since = time - b.slamAt;
          const squash = since < 120 ? 1 + (1 - since / 120) * 0.12 : 1;
          if (b.vertical) { x -= (w * (squash - 1)) / 2; w *= squash; } else { y -= (h * (squash - 1)) / 2; h *= squash; }
          g.fillStyle(INK, a); g.fillRect(x, y, w, h);
          // A ragged brush edge and a wet gloss stripe — ink, not a void.
          g.lineStyle(3, INK, a);
          const edge = (x0: number, y0: number, x1: number, y1: number): void => {
            const n = 12;
            g.beginPath();
            for (let i = 0; i <= n; i++) {
              const t = i / n;
              const j = Math.sin(i * 2.7 + b.seed) * 2.5;
              const px = x0 + (x1 - x0) * t + (b.vertical ? j : 0);
              const py = y0 + (y1 - y0) * t + (b.vertical ? 0 : j);
              if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
            }
            g.strokePath();
          };
          if (b.vertical) { edge(x, y, x, y + h); edge(x + w, y, x + w, y + h); } else { edge(x, y, x + w, y); edge(x, y + h, x + w, y + h); }
          g.lineStyle(2, WHITE, 0.35 * a);
          if (b.vertical) g.lineBetween(x + w * 0.25, y + 10, x + w * 0.25, y + h - 10); else g.lineBetween(x + 10, y + h * 0.25, x + w - 10, y + h * 0.25);
          // The bar's stamp: the Queen's blue in one corner.
          g.fillStyle(BLUE, a); g.fillCircle(b.vertical ? x + w / 2 : x + 26, b.vertical ? y + 26 : y + h / 2, 8);
          g.fillStyle(BLUE_LIT, a); g.fillCircle(b.vertical ? x + w / 2 - 2 : x + 24, b.vertical ? y + 24 : y + h / 2 - 2, 2.5);
          if (since >= 0 && since < 260) {
            const k = since / 260;
            g.lineStyle(4 * (1 - k), INK, 1 - k);
            g.strokeRect(x - k * 18, y - k * 18, w + k * 36, h + k * 36);
          }
        }
        // A redacted fighter shows only as two white eyes in the black.
        for (const [f, k] of fighters()) {
          if (!redacted[k]) continue;
          const blink = Math.floor(time / 1800 + (k === 'p' ? 0 : 0.5)) % 4 === 0 && (time % 1800) < 140;
          if (blink) continue;
          for (const ex of [-6, 6]) {
            g.fillStyle(WHITE, 0.9); g.fillEllipse(f.x + ex, f.y - 8, 7, 9);
            g.fillStyle(INK, 1); g.fillCircle(f.x + ex + 1, f.y - 7, 2);
          }
        }
      },

      drawHud(g, time) {
        // The censor's ledger: a strip of paper whose ruled line fills toward the next ruling.
        const t = ctx.scene.time.now;
        const k = Phaser.Math.Clamp(1 - (nextAt - t) / every, 0, 1);
        const x = W / 2 - 120, y = 102, w = 240;
        g.fillStyle(INK, 0.7); g.fillRect(x - 4, y - 4, w + 8, 22);
        g.fillStyle(PAPER, 1); g.fillRect(x, y, w, 14);
        g.lineStyle(1, BLUE_LIT, 0.8); g.lineBetween(x, y + 7, x + w, y + 7);
        g.fillStyle(INK, 1); g.fillRect(x, y + 2, w * k, 10);
        if (k > 0.82) { g.fillStyle(BLUE, 0.6 + 0.4 * Math.sin(time / 60)); g.fillCircle(x + w + 12, y + 7, 5); }
        // Pips: is either side redacted right now?
        g.fillStyle(redacted.p ? INK : BLUE_WASH, 1); g.fillRect(x - 26, y + 1, 14, 12);
        g.lineStyle(1, INK, 1); g.strokeRect(x - 26, y + 1, 14, 12);
        g.fillStyle(redacted.n ? INK : BLUE_WASH, 1); g.fillRect(x + w + 22, y + 1, 14, 12);
        g.strokeRect(x + w + 22, y + 1, 14, 12);
      },
    };
  },
};
