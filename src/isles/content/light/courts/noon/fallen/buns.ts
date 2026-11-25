import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { dim, glow, lit, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { noonShadow, sunburst } from '../art';
import { GOLD, GOLD_LIT, IRON, IRON_DARK, IRON_LIT, MARBLE_DARK, SCORCH_DARK } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Baked on the Stones — Tansy Moule, of the Sunrise Bun.
 *
 * The plaza is hot enough to bake on, and in the star's telling the Sunrise Bun's under-baker
 * did: she set her trays out on the bare marble in the endless noon and sold the buns to the
 * crowd at the bleachings — and told the Shade-Warden which customers asked for theirs wrapped.
 *
 * Iron trays lie about the yard and bake on the stone: pale dough, then a short golden window,
 * then black. Walk over a golden tray to eat it — it mends you, and for a few seconds your blows
 * bite deeper — and get off a black one: it bursts in a ring of cinders. She eats them too.
 *
 * The exploit is the stone's heat. Strike a tray and it jumps a stage: raw dough to golden, a
 * golden tray to black. Burn the one she is walking to. Halfway down the oven doors open: the
 * trays bake faster and a burst throws hot crusts across the yard.
 */

const ID = fallenId('noon', 'buns');
const DOUGH_MS = 3800;
const DOUGH_LATE_MS = 2700;
const GOLD_MS = 2600;
const BURNT_MS = 1150;
const EMPTY_MS = 1900;
const EAT_R = 34;
const BURST_R = 80;
const FED_MS = 5500;
const DMG = 14;
const DMG_NPC = 18;

type Stage = 'empty' | 'dough' | 'gold' | 'burnt';

interface Tray { x: number; y: number; stage: Stage; at: number; struck: number; target: StrikeTarget | null; seed: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk, rng } = ctx;
  const spots: Pt[] = [
    { x: 170, y: top + 110 }, { x: W / 2, y: top + 90 }, { x: W - 170, y: top + 110 },
    { x: 300, y: (top + H) / 2 + 40 }, { x: W - 300, y: (top + H) / 2 + 40 },
    { x: 180, y: H - 80 }, { x: W / 2, y: H - 110 }, { x: W - 180, y: H - 80 },
  ];
  const trays: Tray[] = spots.map((p, i) => ({ ...p, stage: 'empty', at: -i * 450, struck: -1e9, target: null, seed: i * 7 + 3 }));
  let playerFed = 0, npcFed = 0;
  let open = false;
  let started = false;
  const crumbs: { x: number; y: number; at: number }[] = [];

  const doughMs = (): number => (open ? DOUGH_LATE_MS : DOUGH_MS);

  function burst(t: Tray, time: number): void {
    t.stage = 'empty'; t.at = time;
    ctx.sfx('explosion-small');
    tk.boom(t.x, t.y, BURST_R, SCORCH_DARK);
    if (alive(player) && dist(player.x, player.y, t.x, t.y) < BURST_R + 16) tk.hitPlayer(DMG, player.x, player.y);
    if (alive(npc) && dist(npc.x, npc.y, t.x, t.y) < BURST_R + 16) { ctx.hit(npc, DMG_NPC, npc.x, npc.y); ctx.flash(npc.x, npc.y - 20, 0xff7a2e); }
    crumbs.push({ x: t.x, y: t.y, at: time });
    if (crumbs.length > 8) crumbs.shift();
    if (open) {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + rng() * 0.4;
        tk.spawnBullet({ x: t.x, y: t.y, angle: a, speed: 230, damage: 6, r: 6, lifeMs: 1800, color: 0x8a4a1e, hits: [player, npc] });
      }
    }
  }

  return {
    update(time, dtRaw) {
      stepDt(dtRaw);
      if (!started) {
        started = true;
        for (const t of trays) {
          t.at = time + t.at;
          t.target = ctx.target({
            x: t.x, y: t.y - 6, r: 26,
            onStruck() {
              const now = tk.now;
              if (now - t.struck < 420) return;
              t.struck = now;
              if (t.stage === 'dough') { t.stage = 'gold'; t.at = now; ctx.sfx('sizzle'); }
              else if (t.stage === 'gold') { t.stage = 'burnt'; t.at = now; ctx.sfx('flame-burst'); }
            },
          });
        }
      }
      if (!open && npc.hp < npc.maxHp * 0.5) { open = true; ctx.banner('THE OVEN DOORS OPEN', '#ffb35a'); ctx.sfx('inferno'); }

      for (const t of trays) {
        const el = time - t.at;
        if (t.stage === 'empty' && el >= EMPTY_MS) { t.stage = 'dough'; t.at = time; ctx.sfx('slime-splat'); }
        else if (t.stage === 'dough' && el >= doughMs()) { t.stage = 'gold'; t.at = time; }
        else if (t.stage === 'gold' && el >= GOLD_MS) { t.stage = 'burnt'; t.at = time; ctx.sfx('sizzle'); }
        else if (t.stage === 'burnt' && el >= tk.warn(BURNT_MS)) burst(t, time);
        if (t.stage !== 'gold') continue;
        // Eating: whoever reaches a golden tray first takes it.
        for (const [f, who] of [[player, 'p'], [npc, 'n']] as const) {
          if (!alive(f) || dist(f.x, f.y, t.x, t.y) > EAT_R) continue;
          ctx.heal(f, f.maxHp * 0.05);
          if (who === 'p') playerFed = time + FED_MS; else npcFed = time + FED_MS;
          t.stage = 'empty'; t.at = time;
          ctx.sfx('heal');
          break;
        }
      }
    },

    npcTakenMult() { return tk.now < playerFed ? 1.3 : 1; },
    playerTakenMult() { return tk.now < npcFed ? 1.3 : 1; },

    npcSeek() {
      if (!alive(npc)) return null;
      const now = tk.now;
      // A golden tray she can reach before it turns, and before you do.
      let best: Tray | null = null, bd = Infinity;
      for (const t of trays) {
        if (t.stage !== 'gold') continue;
        const dn = dist(npc.x, npc.y, t.x, t.y), dp = dist(player.x, player.y, t.x, t.y);
        const left = GOLD_MS - (now - t.at);
        if ((dn / 190) * 1000 > left || dn > dp * 1.25) continue;
        if (dn < bd) { bd = dn; best = t; }
      }
      if (best) return { x: best.x, y: best.y };
      // Off any black tray.
      for (const t of trays) {
        if (t.stage !== 'burnt') continue;
        const d = dist(npc.x, npc.y, t.x, t.y);
        if (d < BURST_R + 60) return { x: tk.clampX(npc.x + ((npc.x - t.x) / (d || 1)) * 140), y: tk.clampY(npc.y + ((npc.y - t.y) / (d || 1)) * 140) };
      }
      // Wait by the dough that is nearest to turning.
      let soon: Tray | null = null, sl = Infinity;
      for (const t of trays) {
        if (t.stage !== 'dough') continue;
        const left = doughMs() - (now - t.at);
        if (left < sl) { sl = left; soon = t; }
      }
      return soon && sl < 1400 ? { x: soon.x + (soon.x < W / 2 ? 50 : -50), y: soon.y } : null;
    },

    drawGround(g, time) {
      for (const c of crumbs) {
        const k = clamp(1 - (time - c.at) / 4500, 0, 1);
        if (k <= 0) continue;
        g.fillStyle(SCORCH_DARK, 0.25 * k); g.fillEllipse(c.x, c.y, BURST_R * 1.6, BURST_R * 0.9);
        for (let i = 0; i < 9; i++) {
          const a = i * 0.7 + c.x * 0.01, r = 20 + ((i * 13) % 50);
          g.fillStyle(0x6a3a18, 0.6 * k); g.fillCircle(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r * 0.55, 2);
        }
      }
      for (const t of trays) {
        if (t.stage === 'burnt') {
          const k = clamp((time - t.at) / tk.warn(BURNT_MS), 0, 1);
          g.fillStyle(0xff5a1e, 0.06 + k * 0.12); g.fillCircle(t.x, t.y, BURST_R);
          g.lineStyle(2, 0xff7a2e, 0.4 + k * 0.5); g.strokeCircle(t.x, t.y, BURST_R);
          g.lineStyle(3, 0xffd08a, 0.8); g.beginPath(); g.arc(t.x, t.y, BURST_R, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
        } else if (t.stage === 'gold') {
          g.lineStyle(2, GOLD_LIT, 0.35 + Math.sin(time / 150) * 0.15); g.strokeCircle(t.x, t.y, EAT_R + 6);
        }
        drawTray(g, t, time, doughMs());
      }
    },

    drawAir(g, time) {
      for (const t of trays) {
        const el = time - t.at;
        if (t.stage === 'gold') {
          // Steam curling off golden buns.
          for (let i = 0; i < 3; i++) {
            const f = ((time / 1300 + i / 3) % 1);
            g.fillStyle(0xffffff, 0.3 * (1 - f));
            g.fillCircle(t.x - 12 + i * 12 + Math.sin(time / 300 + i) * 4, t.y - 12 - f * 34, 4 + f * 5);
          }
        } else if (t.stage === 'burnt') {
          for (let i = 0; i < 4; i++) {
            const f = ((time / 700 + i / 4) % 1);
            g.fillStyle(0x2a2420, 0.45 * (1 - f));
            g.fillCircle(t.x - 14 + i * 9 + Math.sin(time / 200 + i) * 5, t.y - 10 - f * 46, 5 + f * 8);
          }
          if (Math.floor(time / 90) % 3 === 0) { g.fillStyle(0xffb35a, 0.9); g.fillCircle(t.x + Math.sin(time) * 14, t.y - 8 - (time % 300) / 10, 1.6); }
        } else if (t.stage === 'empty' && el > EMPTY_MS - 500) {
          // The next batch, tossed in from the bakery side in a high arc.
          const k = clamp((el - (EMPTY_MS - 500)) / 500, 0, 1);
          const sx = t.x + (t.x < W / 2 ? -160 : 160), sy = t.y - 20;
          const x = sx + (t.x - sx) * k, y = sy + (t.y - sy) * k - Math.sin(k * Math.PI) * 90;
          g.fillStyle(0xf4e4c0, 1); g.fillEllipse(x, y, 16, 12);
          g.fillStyle(0xffffff, 0.6); g.fillEllipse(x - 3, y - 3, 6, 3);
        }
      }
    },

    drawHud(g) {
      // Two buns with fed-time bars: yours and hers.
      const x0 = 30, y = top + 28;
      g.fillStyle(0x000000, 0.45); g.fillRoundedRect(x0 - 14, y - 20, 210, 40, 8);
      ([[playerFed, 0x9fd8ff, 0], [npcFed, 0xffb35a, 104]] as [number, number, number][]).forEach(([until, col, dx]) => {
        const x = x0 + dx;
        const k = clamp((until - tk.now) / FED_MS, 0, 1);
        g.fillStyle(k > 0 ? 0xc8862e : 0x5a4a3a, 1); g.fillEllipse(x + 4, y, 20, 15);
        g.fillStyle(k > 0 ? GOLD_LIT : 0x7a6a5a, 0.8); g.fillEllipse(x + 1, y - 3, 8, 4);
        g.lineStyle(1.5, dim(0xc8862e, 0.4), 1); g.lineBetween(x - 2, y, x + 10, y);
        g.fillStyle(IRON_DARK, 1); g.fillRect(x + 18, y - 3, 64, 6);
        g.fillStyle(col, 1); g.fillRect(x + 18, y - 3, 64 * k, 6);
      });
    },

    destroy() { for (const t of trays) t.target?.remove(); },
  };
}

/** An iron baking sheet on the marble and its six buns, drawn at whatever stage the stone has them. */
function drawTray(g: G, t: Tray, time: number, doughMs: number): void {
  const { x, y } = t;
  noonShadow(g, x, y + 10, 64, 0.25);
  g.fillStyle(IRON_DARK, 1); g.fillRoundedRect(x - 32, y - 18, 64, 38, 5);
  g.fillStyle(IRON, 1); g.fillRoundedRect(x - 29, y - 15, 58, 32, 4);
  g.lineStyle(1, IRON_LIT, 0.7); g.strokeRoundedRect(x - 29, y - 15, 58, 32, 4);
  g.fillStyle(MARBLE_DARK, 0.3); g.fillRect(x - 26, y + 13, 52, 2);
  if (t.stage === 'empty') {
    for (let i = 0; i < 5; i++) { g.fillStyle(0xc8a878, 0.7); g.fillCircle(x - 18 + ((i * 11 + t.seed) % 36), y - 6 + ((i * 7) % 18), 1.4); }
    return;
  }
  const el = time - t.at;
  for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) {
    const bx = x - 18 + c * 18, by = y - 6 + r * 14;
    if (t.stage === 'dough') {
      // Pale dough, rising a little as it proves, dusted with flour.
      const rise = clamp(el / doughMs, 0, 1);
      const rr = 6 + rise * 2;
      g.fillStyle(0xd8c8a4, 1); g.fillEllipse(bx, by + 1, rr * 2 + 1, rr * 1.5);
      g.fillStyle(0xf4e8cc, 1); g.fillEllipse(bx, by, rr * 2, rr * 1.4);
      g.fillStyle(0xffffff, 0.7); g.fillCircle(bx - 2, by - 2, 1.2); g.fillCircle(bx + 2, by - 1, 0.9);
      // A blush of colour coming through near the end.
      g.fillStyle(0xe8b060, rise * 0.4); g.fillEllipse(bx, by - 1, rr * 1.4, rr * 0.8);
    } else if (t.stage === 'gold') {
      g.fillStyle(0x8a5418, 1); g.fillEllipse(bx, by + 1, 19, 14);
      g.fillStyle(0xd08a30, 1); g.fillEllipse(bx, by, 18, 13);
      g.fillStyle(GOLD, 1); g.fillEllipse(bx - 1, by - 1, 12, 8);
      g.fillStyle(lit(GOLD_LIT, 0.4), 0.9); g.fillEllipse(bx - 3, by - 3, 5, 2.5);
      // The Sunrise Bun's sunburst scored into every top.
      sunburst(g, bx, by, 5, 8, 0.55, 0xf4d080);
    } else {
      // Black, cracked, red where it splits.
      const k = clamp(el / 1200, 0, 1);
      g.fillStyle(0x1a120c, 1); g.fillEllipse(bx, by + 1, 19, 14);
      g.fillStyle(0x3a2416, 1); g.fillEllipse(bx, by, 17, 12);
      g.lineStyle(1.5, 0xff6a1e, 0.5 + k * 0.5);
      g.lineBetween(bx - 5, by - 2, bx + 1, by + 1); g.lineBetween(bx + 1, by + 1, bx + 5, by - 3);
      glow(g, bx, by, 8, 0xff6a1e, 0.05 + k * 0.08, 2);
    }
  }
  if (t.stage === 'gold') glow(g, x, y, 40, GOLD_LIT, 0.05, 3);
}

export const FALLEN_BUNS: GimmickDef = {
  id: ID,
  rules: 'Buns bake on the stones: walk over a golden tray to eat (a mend, harder blows); a black one bursts. Strike a tray to jump it a stage.',
  make,
};
