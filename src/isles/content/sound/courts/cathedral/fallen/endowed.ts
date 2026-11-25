import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { dim, glow, lit, shadow } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import {
  ASHLAR, ASHLAR_DARK, ASHLAR_DEEP, ASHLAR_LIT, CANDLELIGHT, GILT, GILT_DARK, GILT_LIT, OAK, OAK_DARK, OAK_LIT,
} from '../palette';
import { alive, stepDt } from '../util';
import { FOE, MINE, vellum } from './common';

/**
 * Endowed — Chantry-Priest Florian Gelt.
 *
 * Round the nave stand the chantry chapels: little rooms of iron grille, each with its founder's
 * tomb and a priest paid to sing for that founder's soul and no one else's. Father Gelt sings for
 * whoever has paid. Strike a chantry's alms-box and you have endowed it: its grille is yours. Inside
 * your own chantry your foe's shots die on the ironwork, and a trespasser in someone else's stands
 * where no mass is sung for them and takes harder blows. Past half, the chantries mend their
 * founders while they kneel inside.
 *
 * Gelt holes up in his own chapels. Buy one out from under him at its door: the moment you strike
 * the box he is a trespasser in your chantry, behind a grille that now lets your shots through and
 * stops his.
 */

const CW = 150, CH = 96;
const BARS = 42;              // drawn height of the grille
const TRESPASS = 1.35;
const HEAL_EVERY = 600;

type Side = 'player' | 'npc' | 'none';
interface Chantry { x: number; y: number; door: 'n' | 's'; owner: Side; at: number; box: StrikeTarget | null; healAt: number; coins: number }
interface Spark { x: number; y: number; at: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  const yN = top + 34, yS = H - CH - 40;
  const chantries: Chantry[] = [
    { x: 96, y: yN, door: 's', owner: 'none', at: -9999, box: null, healAt: 0, coins: -9999 },
    { x: W - 96 - CW, y: yN, door: 's', owner: 'npc', at: -9999, box: null, healAt: 0, coins: -9999 },
    { x: 96, y: yS, door: 'n', owner: 'none', at: -9999, box: null, healAt: 0, coins: -9999 },
    { x: W - 96 - CW, y: yS, door: 'n', owner: 'none', at: -9999, box: null, healAt: 0, coins: -9999 },
  ];
  const sparks: Spark[] = [];
  let started = false;
  const half = () => npc.hp < npc.maxHp * 0.5;
  const sideOf = (f: Fighter): Side => (f === player ? 'player' : 'npc');
  const inside = (f: Fighter, c: Chantry, pad = 0) => f.x > c.x - pad && f.x < c.x + CW + pad && f.y > c.y - pad && f.y < c.y + CH + pad;
  const boxAt = (c: Chantry): Pt => ({ x: c.x + CW / 2, y: c.door === 's' ? c.y + CH + 12 : c.y - 12 });
  const colOf = (s: Side) => (s === 'player' ? MINE : s === 'npc' ? FOE : ASHLAR_DARK);
  const trespassing = (f: Fighter) => chantries.some((c) => c.owner !== 'none' && c.owner !== sideOf(f) && inside(f, c));

  return {
    update(time, dtRaw) {
      stepDt(dtRaw);
      if (!started) {
        started = true;
        for (const c of chantries) {
          const b = boxAt(c);
          c.box = ctx.target({
            x: b.x, y: b.y - 10, r: 22,
            onStruck: (by) => {
              const now = ctx.scene.time.now;
              if (c.owner === by || now - c.at < 1000) return;
              c.owner = by; c.at = now; c.coins = now;
              ctx.sfx('money');
            },
          });
        }
      }
      for (const c of chantries) {
        if (c.owner === 'none') continue;
        // The grille stops every shot of the side that has not paid for it.
        for (const s of ctx.shotsNear(c.x + CW / 2, c.y + CH / 2, CW * 0.62)) {
          if (s.owner === c.owner) continue;
          if (s.x < c.x - 8 || s.x > c.x + CW + 8 || s.y < c.y - 8 || s.y > c.y + CH + 8) continue;
          s.block();
          sparks.push({ x: s.x, y: s.y, at: time });
          ctx.sfx('clang');
        }
        // Past half, a founder kneeling in their own chantry is mended.
        const founder = c.owner === 'player' ? player : npc;
        if (half() && alive(founder) && inside(founder, c) && time >= c.healAt) {
          c.healAt = time + HEAL_EVERY;
          ctx.heal(founder, 2);
        }
      }
      for (let i = sparks.length - 1; i >= 0; i--) if (time - sparks[i].at > 400) sparks.splice(i, 1);
    },

    playerTakenMult: () => (trespassing(player) ? TRESPASS : 1),
    npcTakenMult: () => (trespassing(npc) ? TRESPASS : 1),

    npcSeek(): Pt | null {
      if (!alive(npc)) return null;
      const d = (p: Pt) => Math.hypot(p.x - npc.x, p.y - npc.y);
      // You are sheltering in your own chantry: go and buy it out at its door.
      const yours = chantries.find((c) => c.owner === 'player' && inside(player, c));
      if (yours) return boxAt(yours);
      // Standing in yours himself: get out, or take it.
      const trap = chantries.find((c) => c.owner === 'player' && inside(npc, c));
      if (trap) return boxAt(trap);
      // Hurt: into the nearest of his own.
      if (npc.hp < npc.maxHp * 0.7) {
        const own = chantries.filter((c) => c.owner === 'npc').sort((a, b) => d({ x: a.x + CW / 2, y: a.y + CH / 2 }) - d({ x: b.x + CW / 2, y: b.y + CH / 2 }))[0];
        if (own && !inside(npc, own)) return { x: own.x + CW / 2, y: own.y + CH / 2 };
        if (own) return null;
      }
      // Buy up a chapel that is close and not yet his.
      const near = chantries.filter((c) => c.owner !== 'npc').sort((a, b) => d(boxAt(a)) - d(boxAt(b)))[0];
      if (near && d(boxAt(near)) < 260) return boxAt(near);
      return null;
    },

    drawGround(g, time) {
      for (const c of chantries) {
        const col = colOf(c.owner);
        shadow(g, c.x + CW / 2, c.y + CH + 6, CW + 20, 18, 0.25);
        // Oak boards.
        g.fillStyle(OAK_DARK, 1); g.fillRect(c.x, c.y, CW, CH);
        for (let i = 0; i < 6; i++) {
          g.fillStyle(i % 2 ? OAK : dim(OAK, 0.08), 1); g.fillRect(c.x + 1, c.y + 1 + i * 16, CW - 2, 15);
          g.lineStyle(1, OAK_LIT, 0.3); g.lineBetween(c.x + 8 + ((i * 37) % 60), c.y + 6 + i * 16, c.x + 60 + ((i * 37) % 60), c.y + 9 + i * 16);
        }
        if (c.owner !== 'none') { g.fillStyle(col, 0.12); g.fillRect(c.x, c.y, CW, CH); }
        // The altar against the back wall, a cross and two prickets.
        const back = c.door === 's' ? c.y + 6 : c.y + CH - 22;
        g.fillStyle(ASHLAR_DARK, 1); g.fillRect(c.x + CW / 2 - 26, back, 52, 16);
        g.fillStyle(ASHLAR_LIT, 1); g.fillRect(c.x + CW / 2 - 26, back, 52, 4);
        g.fillStyle(GILT, 1); g.fillRect(c.x + CW / 2 - 1.5, back - 14, 3, 14); g.fillRect(c.x + CW / 2 - 6, back - 10, 12, 3);
        for (const k of [-18, 18]) {
          g.fillStyle(GILT_DARK, 1); g.fillRect(c.x + CW / 2 + k - 1, back - 8, 2, 8);
          const lit2 = c.owner !== 'none';
          g.fillStyle(lit2 ? CANDLELIGHT : ASHLAR, 1); g.fillRect(c.x + CW / 2 + k - 2, back - 15, 4, 7);
          if (lit2) { g.fillStyle(0xffe08a, 0.9 + 0.1 * Math.sin(time / 90 + k)); g.fillEllipse(c.x + CW / 2 + k, back - 18, 3, 6); }
        }
        // The founder's tomb: a chest with the founder's arms, the effigy lying on its lid.
        const ty = c.y + CH / 2 - 8;
        g.fillStyle(ASHLAR_DEEP, 1); g.fillRect(c.x + 30, ty + 6, CW - 60, 22);
        g.fillStyle(ASHLAR, 1); g.fillRect(c.x + 28, ty, CW - 56, 10);
        g.fillStyle(ASHLAR_LIT, 0.8); g.fillRect(c.x + 28, ty, CW - 56, 2);
        for (let i = 0; i < 3; i++) {
          const sx = c.x + 44 + i * 30;
          g.fillStyle(ASHLAR_DARK, 1); g.fillRect(sx - 7, ty + 12, 14, 14);
          g.fillStyle(c.owner === 'none' ? ASHLAR : col, 1);
          g.fillTriangle(sx - 5, ty + 14, sx + 5, ty + 14, sx, ty + 24);
          g.fillRect(sx - 5, ty + 14, 10, 4);
        }
        // The effigy: pillow, head, joined hands, folds of the gown, a little dog at the feet.
        const ex0 = c.x + 38, ex1 = c.x + CW - 38;
        g.fillStyle(ASHLAR_LIT, 1); g.fillEllipse(ex0 + 4, ty + 3, 12, 7);
        g.fillStyle(lit(ASHLAR, 0.2), 1); g.fillCircle(ex0 + 7, ty + 1, 4.5);
        g.fillStyle(ASHLAR_LIT, 1); g.fillRoundedRect(ex0 + 11, ty - 3, ex1 - ex0 - 24, 9, 4);
        g.lineStyle(1, ASHLAR_DARK, 0.6);
        for (let k = ex0 + 18; k < ex1 - 16; k += 7) g.lineBetween(k, ty - 2, k + 3, ty + 5);
        g.fillStyle(ASHLAR, 1); g.fillTriangle(ex0 + 26, ty - 6, ex0 + 30, ty - 6, ex0 + 28, ty - 12);
        g.fillStyle(ASHLAR_DARK, 1); g.fillEllipse(ex1 - 9, ty + 1, 10, 7); g.fillCircle(ex1 - 5, ty - 2, 3);
      }
      // The alms-box at every door, its coins jumping when it is paid.
      for (const c of chantries) {
        const b = boxAt(c);
        g.fillStyle(OAK_DARK, 1); g.fillRect(b.x - 2, b.y - 16, 4, 16);
        g.fillStyle(OAK, 1); g.fillRect(b.x - 11, b.y - 30, 22, 16);
        g.fillStyle(OAK_LIT, 1); g.fillRect(b.x - 11, b.y - 30, 22, 3);
        g.lineStyle(1.5, 0x3a3a40, 1); g.strokeRect(b.x - 11, b.y - 30, 22, 16); g.lineBetween(b.x - 11, b.y - 22, b.x + 11, b.y - 22);
        g.fillStyle(0x16100a, 1); g.fillRect(b.x - 5, b.y - 29, 10, 2);
        g.fillStyle(GILT_DARK, 1); g.fillCircle(b.x, b.y - 18, 2);
        const k = (time - c.coins) / 700;
        if (k >= 0 && k < 1) {
          for (let i = 0; i < 6; i++) {
            const a = -Math.PI / 2 + (i - 2.5) * 0.35;
            const px = b.x + Math.cos(a) * 30 * k, py = b.y - 30 + Math.sin(a) * 34 * k + 40 * k * k;
            g.fillStyle(GILT_LIT, 1 - k); g.fillEllipse(px, py, 5, 3 + 2 * Math.abs(Math.sin(k * 12 + i)));
          }
          glow(g, b.x, b.y - 24, 40, GILT, 0.08 * (1 - k), 3);
        }
      }
    },

    drawAir(g, time) {
      for (const c of chantries) {
        const col = colOf(c.owner);
        const iron = c.owner === 'none' ? 0x3a3a44 : dim(col, 0.55);
        const gap0 = c.x + CW / 2 - 28, gap1 = c.x + CW / 2 + 28;
        const doorY = c.door === 's' ? c.y + CH : c.y;
        const backY = c.door === 's' ? c.y : c.y + CH;
        const bar = (x: number, y: number) => {
          g.lineStyle(2, iron, 1); g.lineBetween(x, y, x, y - BARS);
          g.fillStyle(GILT, 1); g.fillTriangle(x - 2.5, y - BARS, x + 2.5, y - BARS, x, y - BARS - 6);
        };
        // Back and both sides, then the door side with its opening.
        for (let x = c.x; x <= c.x + CW; x += 9) bar(x, backY);
        for (let y = c.y; y <= c.y + CH; y += 9) { bar(c.x, y); bar(c.x + CW, y); }
        for (let x = c.x; x <= c.x + CW; x += 9) if (x < gap0 || x > gap1) bar(x, doorY);
        for (const y of [backY, doorY]) {
          g.lineStyle(2.5, iron, 1);
          if (y === doorY) { g.lineBetween(c.x, y - BARS, gap0, y - BARS); g.lineBetween(gap1, y - BARS, c.x + CW, y - BARS); g.lineBetween(c.x, y - 12, gap0, y - 12); g.lineBetween(gap1, y - 12, c.x + CW, y - 12); }
          else { g.lineBetween(c.x, y - BARS, c.x + CW, y - BARS); g.lineBetween(c.x, y - 12, c.x + CW, y - 12); }
        }
        // Scrolls of wrought iron in the frieze, and a corner post with a pinnacle at each corner.
        g.lineStyle(1.2, iron, 0.9);
        for (let x = c.x + 9; x < c.x + CW - 9; x += 18) { g.beginPath(); g.arc(x, backY - BARS + 6, 4, 0, Math.PI * 1.5); g.strokePath(); }
        for (const [px, py] of [[c.x, c.y], [c.x + CW, c.y], [c.x, c.y + CH], [c.x + CW, c.y + CH]]) {
          g.fillStyle(dim(iron, 0.2), 1); g.fillRect(px - 3, py - BARS - 6, 6, BARS + 6);
          g.fillStyle(GILT, 1); g.fillTriangle(px - 4, py - BARS - 6, px + 4, py - BARS - 6, px, py - BARS - 18);
          g.fillStyle(GILT_LIT, 1); g.fillCircle(px, py - BARS - 19, 1.8);
        }
        // The founder's banner on the door post.
        if (c.owner !== 'none') {
          const bx = gap1 + 4, by = doorY - BARS - 4;
          const sway = Math.sin(time / 500 + c.x) * 2;
          g.fillStyle(col, 1);
          g.fillTriangle(bx, by, bx + 18 + sway, by + 4, bx, by + 22);
          g.fillStyle(lit(col, 0.4), 1); g.fillCircle(bx + 6, by + 10, 3);
          g.fillStyle(GILT_DARK, 1); g.fillCircle(bx + 6, by + 10, 1.4);
        }
      }
      for (const s of sparks) {
        const k = (time - s.at) / 400;
        for (let i = 0; i < 6; i++) {
          const a = i * 1.05 + s.x * 0.1;
          g.fillStyle(i % 2 ? GILT_LIT : 0xffffff, 1 - k);
          g.fillCircle(s.x + Math.cos(a) * 14 * k, s.y + Math.sin(a) * 14 * k - 6 * k, 1.8 * (1 - k) + 0.4);
        }
      }
    },

    drawHud(g) {
      const x = W / 2, y = top + 4;
      vellum(g, x, y, 150, 30);
      // A little plan of the nave: the four chapels where they stand, in their founders' colours.
      g.fillStyle(ASHLAR_LIT, 1); g.fillRect(x - 40, y + 6, 80, 20);
      chantries.forEach((c) => {
        const px = c.x < W / 2 ? x - 36 : x + 18, py = c.y < H / 2 ? y + 8 : y + 17;
        g.fillStyle(colOf(c.owner), 1); g.fillRect(px, py, 18, 7);
        g.lineStyle(1, 0x2a2a30, 1); g.strokeRect(px, py, 18, 7);
      });
      g.lineStyle(1, ASHLAR_DARK, 1); g.strokeRect(x - 40, y + 6, 80, 20);
      // Past half the chapels mend: a little gilt heart on each side.
      if (half()) {
        for (const hx of [x - 56, x + 56]) {
          g.fillStyle(GILT, 1); g.fillCircle(hx - 2.5, y + 13, 3.4); g.fillCircle(hx + 2.5, y + 13, 3.4);
          g.fillTriangle(hx - 6, y + 14, hx + 6, y + 14, hx, y + 21);
        }
      }
    },

    destroy() { for (const c of chantries) c.box?.remove(); },
  };
}

export const FALLEN_ENDOWED: GimmickDef = {
  id: fallenId('cathedral', 'endowed'),
  rules: 'Strike a chantry\'s alms-box to endow it: in your own, your foe\'s shots die on the grille. Trespassers take more. Past half, chantries mend founders.',
  make,
};
