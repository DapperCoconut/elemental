import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import { dim, glow, lit } from '../../../../../art/IsleArt';
import { HAND_COLORS, HAND_SHAPES, HAND_WORDS, handShape, type HandShape } from '../art';
import { PLASTER, PLASTER_DARK, SILK } from '../palette';
import { alive, clamp, dist } from '../util';

/**
 * Sign Language — Signer Palm.
 *
 * Palm teaches the four permitted shapes at the Sign School, and he fights in them. Before every
 * Word he *signs* one — STOP, HOLD, GO or HUSH — big over his head; a moment later the Word goes
 * out across the whole floor, a wave of thought that strikes and silences everyone it finds. The
 * floor is tiled with the four shapes: **stand on a tile that matches his sign and the Word
 * passes over you.** After each Word, some tiles turn over to show a different shape.
 *
 * Palm knows his sign first and walks to his tile. But a signer needs his hands: hit him hard
 * enough while he is signing and he fumbles the shape — and a fumbled Word comes back on the
 * one who spoke it, wherever he stands.
 */

const TILE_W = 98;
const TILE_H = 78;
const FUMBLE_DMG = 9;

interface Tile { x: number; y: number; shape: HandShape; flipAt: number; from: HandShape }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const every = ctx.hard ? 4600 : 5400;
  const warn = ctx.hard ? 1550 : 1850;
  const dmg = ctx.hard ? 15 : 12;
  const tiles: Tile[] = [];
  let sign: HandShape = 'palm';
  let signAt = -1;
  let wordAt = 0;
  let nextSign = 0;
  let hurtInSign = 0;
  let fumbled = false;
  let started = false;
  const struckAt = new Map<Fighter, number>([[player, -9999], [npc, -9999]]);
  const shieldedAt = new Map<Fighter, number>([[player, -9999], [npc, -9999]]);

  function layTiles(): void {
    const cols = [0.13, 0.37, 0.63, 0.87], rows = [0.2, 0.52, 0.84];
    const deck: HandShape[] = [];
    for (let i = 0; i < 3; i++) deck.push(...HAND_SHAPES);
    for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
    let k = 0;
    for (const ry of rows) for (const cx of cols) {
      const s = deck[k++];
      tiles.push({ x: W * cx + (rng() - 0.5) * 30, y: top + (H - top) * ry + (rng() - 0.5) * 20, shape: s, flipAt: -9999, from: s });
    }
  }

  const onTile = (f: Fighter, s: HandShape): boolean =>
    tiles.some((t) => t.shape === s && Math.abs(f.x - t.x) < TILE_W / 2 + 8 && Math.abs(f.y - t.y) < TILE_H / 2 + 8);

  function word(time: number): void {
    ctx.sfx('sonic-pulse');
    if (fumbled) {
      ctx.banner('THE WORD COMES BACK ON PALM', '#e8c8ff');
      if (alive(npc)) { ctx.hit(npc, dmg + 4, npc.x, npc.y); ctx.silence(npc, 1500); struckAt.set(npc, time); }
    } else {
      for (const f of [player, npc]) {
        if (!alive(f)) continue;
        if (onTile(f, sign)) { shieldedAt.set(f, time); continue; }
        ctx.hit(f, dmg, f.x, f.y);
        ctx.silence(f, 1200);
        struckAt.set(f, time);
        ctx.float(f.x, f.y - 50, HAND_WORDS[sign], '#e8c8ff');
      }
    }
    // Some tiles turn over.
    const flips = ctx.hard ? 5 : 4;
    for (let i = 0; i < flips; i++) {
      const t = tiles[Math.floor(rng() * tiles.length)];
      t.from = t.shape;
      t.shape = HAND_SHAPES[(HAND_SHAPES.indexOf(t.shape) + 1 + Math.floor(rng() * 3)) % 4];
      t.flipAt = time;
    }
  }

  return {
    update(time) {
      if (!started) { started = true; layTiles(); nextSign = time + 2200; }
      if (signAt < 0 && time >= nextSign && alive(npc)) {
        sign = HAND_SHAPES[Math.floor(rng() * 4)];
        signAt = time;
        wordAt = time + warn;
        hurtInSign = 0;
        fumbled = false;
        ctx.banner(`PALM SIGNS ${HAND_WORDS[sign]}`, '#e8c8ff');
        ctx.sfx('whoosh');
      }
      if (signAt >= 0 && time >= wordAt) {
        word(time);
        signAt = -1;
        nextSign = time + every - warn;
      }
    },

    onNpcHurt(amount) {
      if (signAt < 0 || fumbled) return;
      hurtInSign += amount;
      if (hurtInSign >= FUMBLE_DMG) {
        fumbled = true;
        ctx.float(npc.x, npc.y - 60, 'FUMBLED!', '#ffe2a8');
        ctx.sfx('glitch');
      }
    },

    npcSeek() {
      if (signAt < 0 || fumbled) return null;
      // Walk to the nearest tile of his own sign.
      let best: Tile | null = null, bd = Infinity;
      for (const t of tiles) {
        if (t.shape !== sign) continue;
        const d = dist(t.x, t.y, npc.x, npc.y);
        if (d < bd) { bd = d; best = t; }
      }
      return best ? { x: best.x, y: best.y } : null;
    },

    drawGround(g, time) {
      const live = signAt >= 0;
      const k = live ? clamp((time - signAt) / warn, 0, 1) : 0;
      for (const t of tiles) {
        const flip = clamp((time - t.flipAt) / 420, 0, 1);
        const sx = flip < 1 ? Math.abs(Math.cos(flip * Math.PI)) : 1;
        const shape = flip < 0.5 ? t.from : t.shape;
        const w = TILE_W * sx;
        const match = live && !fumbled && shape === sign;
        // A school slate tile: plaster with a felt border, the shape inked in its colour.
        g.fillStyle(0x000000, 0.15); g.fillRoundedRect(t.x - w / 2 + 3, t.y - TILE_H / 2 + 4, w, TILE_H, 8);
        g.fillStyle(PLASTER_DARK, 1); g.fillRoundedRect(t.x - w / 2, t.y - TILE_H / 2, w, TILE_H, 8);
        g.fillStyle(match ? lit(PLASTER, 0.4) : PLASTER, 1); g.fillRoundedRect(t.x - w / 2 + 4, t.y - TILE_H / 2 + 4, w - 8, TILE_H - 8, 6);
        g.lineStyle(2, dim(HAND_COLORS[shape], 0.2), 0.7); g.strokeRoundedRect(t.x - w / 2 + 7, t.y - TILE_H / 2 + 7, w - 14, TILE_H - 14, 5);
        if (sx > 0.3) handShape(g, t.x, t.y - 4, 1.05 * sx, shape, HAND_COLORS[shape], 0.9);
        if (match) {
          glow(g, t.x, t.y, 56, HAND_COLORS[shape], 0.05 + k * 0.05, 3);
          g.lineStyle(3, HAND_COLORS[shape], 0.5 + k * 0.5); g.strokeRoundedRect(t.x - w / 2 - 3, t.y - TILE_H / 2 - 3, w + 6, TILE_H + 6, 10);
        }
      }
      // The Word going out: a wash of violet across everything, the matching tiles left bare.
      const since = time - (signAt < 0 ? wordAt : -99999);
      if (signAt < 0 && since < 600) {
        const f = 1 - since / 600;
        g.fillStyle(0xb890e8, 0.22 * f); g.fillRect(0, top, W, H - top);
        for (let r = 0; r < 3; r++) { g.lineStyle(4, 0xe8c8ff, 0.5 * f); g.strokeCircle(npc.x, npc.y, 80 + since * 1.4 + r * 40); }
      }
    },

    drawAir(g, time) {
      // The sign itself, held up over Palm's head — two big hands, the shape between them.
      if (signAt >= 0 && alive(npc)) {
        const k = clamp((time - signAt) / warn, 0, 1);
        const x = npc.x, y = npc.y - 86 - Math.sin(k * Math.PI) * 6;
        const shake = fumbled ? Math.sin(time / 30) * 4 : 0;
        g.fillStyle(0x000000, 0.4); g.fillRoundedRect(x - 40, y - 34, 80, 66, 12);
        g.fillStyle(SILK, 0.95); g.fillRoundedRect(x - 36, y - 30, 72, 58, 10);
        handShape(g, x + shake, y - 4, 1.5, sign, fumbled ? 0x8a8a8a : HAND_COLORS[sign]);
        if (fumbled) { g.lineStyle(4, 0xa83a3a, 0.9); g.lineBetween(x - 28, y - 22, x + 28, y + 20); }
        // The Word's fuse: a ring closing round the card.
        g.lineStyle(3, 0xe8c8ff, 0.9);
        g.beginPath(); g.arc(x, y, 44, -Math.PI / 2, -Math.PI / 2 + (1 - k) * Math.PI * 2, false); g.strokePath();
      }
      // Struck, and sheltered.
      for (const f of [player, npc]) {
        if (!alive(f)) continue;
        const s = time - (struckAt.get(f) ?? -9999);
        if (s < 500) { const k = s / 500; g.lineStyle(3, 0xe8c8ff, 1 - k); g.strokeCircle(f.x, f.y - 6, 20 + k * 30); }
        const sh = time - (shieldedAt.get(f) ?? -9999);
        if (sh < 700) {
          const k = sh / 700;
          g.lineStyle(2.5, 0xffffff, 0.8 * (1 - k)); g.beginPath(); g.arc(f.x, f.y - 6, 30, Math.PI, 0, false); g.strokePath();
        }
      }
    },

    drawHud(g) {
      if (signAt < 0) return;
      // The sign, small, at the top of the screen, so it reads wherever you are looking.
      const x = W / 2, y = top + 22;
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x - 26, y - 18, 52, 36, 8);
      handShape(g, x, y - 3, 0.85, sign, fumbled ? 0x8a8a8a : HAND_COLORS[sign]);
    },
  };
}

export const SIGN_LANGUAGE: GimmickDef = {
  id: 'hush-sign-language',
  rules: 'Palm signs a shape, then speaks the Word: it strikes and silences everyone not standing on a matching tile. Hit him while he signs and he fumbles — the Word strikes only him.',
  make,
};
