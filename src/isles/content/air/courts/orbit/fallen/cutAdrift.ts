import type { Fighter } from '../gimmicks/shared';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { live } from '../gimmicks/shared';
import { dim, type G } from '../../../../../art/IsleArt';
import {
  BRASS, BRASS_DARK, BRASS_LIT, CLIFF, CLIFF_DARK, CLOUD, CLOUD_SHADE, IRON, IRON_DARK, LODE_WASH, METER, SKY, SKY_DEEP, SKY_PALE, STONE, STONE_LIT,
} from '../palette';
import { chainLite, cloudPuff } from '../orbitArt';
import { fallenId } from '../../../../meteor/spec';

/**
 * Cut Adrift — Bridgewarden Sheer, in the King's telling the warden who burned through the chain
 * bridges of islets in arrears, so a debtor's house drifted off on its tether alone.
 *
 * A gulf of open sky splits the yard, the cloud-sea a mile under it, crossed by three chain
 * bridges. Step off the edge anywhere a bridge isn't and you fall — caught by the tether net and
 * hauled back up to the side you left, bruised and stunned. Each bridge hangs from two iron pins
 * at its north corners: STRIKE a pin and the bridge groans for a breath, then drops away, taking
 * whoever is still on it, until it is re-hung. Sheer cuts with his torch too: a white seam crawls
 * along the bridge nearest you, and molten links rain on its two heads as it goes.
 *
 * Halfway down, the islets drift apart and the gulf widens. Turn it on him: let him start across,
 * then strike a pin. The bot crosses on whole bridges, strikes the pins while you are on one,
 * and never walks off an edge on purpose.
 */

const ID = fallenId('orbit', 'adrift');
const DECK = 30;
const GROAN_MS = 600;
const DOWN_MS = 6000;
const CUT_EVERY = 7600;
const SEAM_MS = 1100;
const FALL_DMG = 16;

type BridgeState = 'up' | 'groan' | 'down';
interface Bridge { y: number; state: BridgeState; until: number; pins: StrikeTarget[]; seamAt: number }
interface Edge { f: Fighter; side: 'w' | 'e'; immune: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const mid = W / 2;
  let half = 42;
  let wide = false;
  let started = false;
  let nextCut = 0;
  let now = 0;
  const gL = (): number => mid - half;
  const gR = (): number => mid + half;
  const bridges: Bridge[] = [top + 92, (top + H) / 2, H - 92].map((y) => ({ y, state: 'up' as BridgeState, until: 0, pins: [], seamAt: -1 }));
  const edges: Edge[] = [
    { f: player, side: player.x < mid ? 'w' : 'e', immune: 0 },
    { f: npc, side: npc.x < mid ? 'w' : 'e', immune: 0 },
  ];
  const pinAt = (b: Bridge, s: number): { x: number; y: number } => ({ x: s < 0 ? gL() - 18 : gR() + 18, y: b.y - DECK - 8 });
  const standing = (b: Bridge): boolean => b.state !== 'down';
  const onDeck = (f: Fighter, b: Bridge): boolean => standing(b) && Math.abs(f.y - b.y) < DECK && f.x > gL() - 6 && f.x < gR() + 6;
  const deckOf = (f: Fighter): Bridge | undefined => bridges.find((b) => onDeck(f, b));
  const inGulf = (f: Fighter): boolean => f.x > gL() && f.x < gR();

  function drop(b: Bridge, why: string): void {
    if (b.state !== 'up') return;
    b.state = 'groan';
    b.until = now + GROAN_MS;
    ctx.sfx('chain');
    ctx.float(mid, b.y - DECK - 30, why, '#ff7a6a');
  }

  for (const b of bridges) {
    for (const s of [-1, 1]) {
      const p = pinAt(b, s);
      b.pins.push(ctx.target({ x: p.x, y: p.y, r: 15, passThrough: true, onStruck: () => drop(b, 'PIN STRUCK') }));
    }
  }

  return {
    update(time) {
      now = time;
      if (!started) { started = true; nextCut = time + 4500; }
      if (!wide && npc.hp < npc.maxHp * 0.5) {
        wide = true;
        half = 66;
        ctx.banner('THE ISLETS DRIFT APART', '#cfe6f8');
        ctx.sfx('gust');
        for (const b of bridges) b.pins.forEach((t, i) => { const p = pinAt(b, i ? 1 : -1); t.moveTo(p.x, p.y); });
      }
      // The torch: a seam along the bridge nearest you, sparks raining on both heads.
      if (time >= nextCut && live(player)) {
        nextCut = time + CUT_EVERY - (wide ? 1600 : 0);
        const up = bridges.filter((b) => b.state === 'up' && b.seamAt < 0);
        if (up.length) {
          const b = up.reduce((m, c) => (Math.abs(c.y - player.y) < Math.abs(m.y - player.y) ? c : m));
          b.seamAt = time;
          ctx.sfx('plasma-arc');
          for (const x of [gL() - 54, gR() + 54]) tk.spawnZone({ x, y: b.y, radius: 52, warnMs: SEAM_MS, damage: 12 });
        }
      }
      for (const b of bridges) {
        if (b.seamAt >= 0 && time - b.seamAt >= SEAM_MS) { b.seamAt = -1; drop(b, 'CUT'); }
        if (b.state === 'groan' && time >= b.until) { b.state = 'down'; b.until = time + DOWN_MS - (wide ? 1000 : 0); ctx.sfx('clang'); }
        else if (b.state === 'down' && time >= b.until) { b.state = 'up'; ctx.sfx('gear-turn'); }
      }
      for (const e of edges) {
        const f = e.f;
        if (!live(f)) continue;
        if (f.x <= gL()) e.side = 'w'; else if (f.x >= gR()) e.side = 'e';
        if (!inGulf(f) || deckOf(f) || time < e.immune) continue;
        e.immune = time + 900;
        const tx = e.side === 'w' ? gL() - 40 : gR() + 40;
        ctx.nudge(f, tx - f.x, 0);
        ctx.sfx('whoosh');
        ctx.float(f.x, f.y - 46, 'FELL', '#cfe6f8');
        if (f === player) tk.hitPlayer(FALL_DMG, f.x, f.y); else ctx.hit(npc, FALL_DMG + 6, f.x, f.y);
        ctx.stun(f, 500);
      }
    },

    npcSeek() {
      if (!live(player) || !live(npc)) return null;
      const ne = edges[1];
      const nSide = ne.side, pSide = edges[0].side;
      const nearX = (s: 'w' | 'e'): number => (s === 'w' ? gL() - 34 : gR() + 34);
      const farX = (s: 'w' | 'e'): number => (s === 'w' ? gR() + 60 : gL() - 60);
      const myDeck = deckOf(npc);
      if (myDeck) return { x: farX(nSide), y: myDeck.y };
      // You are on a bridge: go and strike its pin on my side.
      const yours = deckOf(player);
      if (yours && yours.state === 'up') {
        const p = pinAt(yours, nSide === 'w' ? -1 : 1);
        return { x: p.x + (nSide === 'w' ? -20 : 20), y: p.y };
      }
      if (nSide !== pSide) {
        const ok = bridges.filter((b) => b.state === 'up' && b.seamAt < 0);
        if (!ok.length) return { x: nearX(nSide) + (nSide === 'w' ? -60 : 60), y: player.y };
        const b = ok.reduce((m, c) => (Math.abs(c.y - npc.y) < Math.abs(m.y - npc.y) ? c : m));
        return Math.abs(npc.y - b.y) > 16 || Math.abs(npc.x - nearX(nSide)) > 40 ? { x: nearX(nSide), y: b.y } : { x: farX(nSide), y: b.y };
      }
      // Same side: stay off the lip.
      if (Math.abs(npc.x - mid) < half + 50) return { x: nSide === 'w' ? gL() - 110 : gR() + 110, y: npc.y };
      return null;
    },

    drawGround(g, time) {
      drawGulf(g, gL(), gR(), top, H, time);
      for (const b of bridges) drawBridge(g, b, gL(), gR(), time);
    },

    drawAir(g, time) {
      for (const b of bridges) {
        for (const s of [-1, 1]) { const p = pinAt(b, s); drawPin(g, p.x, p.y, b.state !== 'down', b.state === 'groan', time); }
        if (b.seamAt >= 0) drawSeam(g, b, gL(), gR(), Math.min(1, (time - b.seamAt) / SEAM_MS), time);
      }
    },

    drawHud(g, time) {
      const x0 = W / 2 - 66, y = top + 18;
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x0 - 12, y - 13, 156, 26, 7);
      bridges.forEach((b, i) => {
        const x = x0 + i * 50;
        const col = b.state === 'up' ? (b.seamAt >= 0 ? METER : BRASS_LIT) : b.state === 'groan' ? METER : IRON_DARK;
        g.lineStyle(2, col, 1);
        g.beginPath(); g.moveTo(x, y - 4); g.lineTo(x + 16, y); g.lineTo(x + 32, y - 4); g.strokePath();
        g.fillStyle(col, 1); g.fillRect(x - 2, y - 8, 4, 14); g.fillRect(x + 30, y - 8, 4, 14);
        if (b.state === 'down') {
          const k = Math.max(0, Math.min(1, 1 - (b.until - time) / DOWN_MS));
          g.fillStyle(BRASS, 0.9); g.fillRect(x, y + 7, 32 * k, 3);
        }
      });
    },

    destroy() { for (const b of bridges) for (const t of b.pins) t.remove(); },
  };
}

/** The gulf: open sky in bands, clouds drifting far below, ragged rock lips on both sides. */
function drawGulf(g: G, l: number, r: number, top: number, H: number, time: number): void {
  const w = r - l;
  const bands = [SKY_PALE, SKY, SKY, SKY_DEEP];
  bands.forEach((c, i) => { g.fillStyle(c, 1); g.fillRect(l, top + ((H - top) * i) / bands.length, w, (H - top) / bands.length + 1); });
  for (let i = 0; i < 7; i++) {
    const y = top + (((time / 40) + i * 83) % (H - top));
    cloudPuff(g, l + w * (0.2 + ((i * 37) % 60) / 100), y, 9 + (i % 3) * 4, 0.55, i);
  }
  g.fillStyle(CLOUD, 0.12); g.fillRect(l, top, w, H - top);
  // Rock lips: the cut edge of each islet, with a dark underside and a few stones crumbling off.
  for (const s of [-1, 1]) {
    const ex = s < 0 ? l : r;
    for (let y = top; y < H; y += 18) {
      const j = ((y * 13) % 9) - 4;
      g.fillStyle(CLIFF_DARK, 1); g.fillTriangle(ex, y, ex, y + 18, ex - s * (14 + j), y + 9);
      g.fillStyle(CLIFF, 1); g.fillTriangle(ex - s * 2, y, ex - s * 2, y + 18, ex - s * (8 + j * 0.5), y + 9);
      g.fillStyle(STONE_LIT, 0.6); g.fillRect(ex + s * 2 - 1, y + 2, 2, 12);
    }
    g.lineStyle(2, STONE, 1); g.lineBetween(ex + s * 3, top, ex + s * 3, H);
    const ph = (time / 1100 + (s < 0 ? 0 : 0.5)) % 1;
    g.fillStyle(STONE, 1 - ph); g.fillCircle(ex - s * (4 + ph * 18), top + 140 + ph * 260, 3 - ph * 2);
  }
  g.fillStyle(CLOUD_SHADE, 0.2); g.fillRect(l, H - 60, w, 60);
}

/** A chain bridge: two chain rails, brass-shod planks between — shaking when it groans, stubs when down. */
function drawBridge(g: G, b: Bridge, l: number, r: number, time: number): void {
  const shake = b.state === 'groan' ? Math.sin(time / 25) * 3 : 0;
  if (b.state === 'down') {
    // Chain stubs hanging from each head, swinging over the drop.
    for (const s of [-1, 1]) {
      const hx = s < 0 ? l : r;
      for (const dy of [-DECK + 4, DECK - 4]) {
        const sw = Math.sin(time / 500 + dy) * 6;
        chainLite(g, { x: hx, y: b.y + dy }, { x: hx - s * 6 + sw, y: b.y + dy + 40 }, 2, 0.9);
      }
      g.fillStyle(dim(BRASS_DARK, 0.2), 1); g.fillRect(hx - s * 10 - 3, b.y - DECK, 6, DECK * 2);
    }
    return;
  }
  const y0 = b.y - DECK + shake, y1 = b.y + DECK + shake;
  g.fillStyle(0x000000, 0.18); g.fillRect(l - 4, y0 + 6, r - l + 8, DECK * 2);
  for (let x = l - 6; x < r + 6; x += 11) {
    const sag = Math.sin(((x - l) / (r - l)) * Math.PI) * 4;
    g.fillStyle(b.state === 'groan' ? 0x7a4a2c : 0x8a6440, 1); g.fillRect(x, y0 + 2 + sag, 9, DECK * 2 - 4);
    g.fillStyle(0x5a3e26, 1); g.fillRect(x, y0 + 2 + sag, 9, 2);
    g.fillStyle(BRASS, 1); g.fillRect(x + 1, y0 + 4 + sag, 2, 2); g.fillRect(x + 1, y1 - 6 + sag, 2, 2);
  }
  chainLite(g, { x: l - 10, y: y0 }, { x: r + 10, y: y0 }, 6, 1, b.state === 'groan' ? METER : IRON);
  chainLite(g, { x: l - 10, y: y1 }, { x: r + 10, y: y1 }, 6, 1, b.state === 'groan' ? METER : IRON);
  for (const x of [l - 12, r + 12]) for (const y of [y0, y1]) { g.fillStyle(IRON_DARK, 1); g.fillRect(x - 4, y - 8, 8, 12); g.fillStyle(BRASS_LIT, 1); g.fillRect(x - 4, y - 10, 8, 3); }
}

/** An iron eye-bolt pin with a brass cap and the bridge's shackle through it; empty when the bridge is down. */
function drawPin(g: G, x: number, y: number, holding: boolean, groan: boolean, time: number): void {
  g.fillStyle(0x000000, 0.25); g.fillEllipse(x, y + 12, 22, 7);
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - 4, y - 6, 8, 18);
  g.fillStyle(IRON, 1); g.fillRect(x - 3, y - 6, 3, 18);
  g.lineStyle(3, IRON, 1); g.strokeCircle(x, y - 11, 6);
  g.fillStyle(BRASS, 1); g.fillRect(x - 6, y + 8, 12, 4);
  if (holding) {
    g.lineStyle(3, groan ? METER : BRASS_DARK, 1);
    g.beginPath(); g.arc(x, y - 11, 9, Math.PI * 0.2, Math.PI * 0.8, false); g.strokePath();
    g.lineStyle(1, BRASS_LIT, 0.4 + Math.sin(time / 300) * 0.2); g.strokeCircle(x, y - 11, 12);
  }
}

/** The torch seam: a white-violet bead burning along the north rail, sparks spitting off it. */
function drawSeam(g: G, b: Bridge, l: number, r: number, k: number, time: number): void {
  const y = b.y - DECK;
  const x = l - 10 + (r - l + 20) * k;
  g.lineStyle(3, METER, 0.85); g.lineBetween(l - 10, y, x, y);
  g.lineStyle(1, LODE_WASH, 0.9); g.lineBetween(l - 10, y - 1, x, y - 1);
  g.fillStyle(LODE_WASH, 1); g.fillCircle(x, y, 5 + Math.sin(time / 30) * 1.5);
  g.fillStyle(0xffffff, 0.9); g.fillCircle(x, y, 2.5);
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI / 2 + (i - 3.5) * 0.35 + Math.sin(time / 40 + i) * 0.2;
    const len = 8 + ((time / 20 + i * 7) % 12);
    g.lineStyle(1, i % 2 ? BRASS_LIT : LODE_WASH, 0.8); g.lineBetween(x, y, x + Math.cos(a) * len, y + Math.sin(a) * len + len * 0.4);
  }
}

export const FALLEN_ADRIFT: GimmickDef = {
  id: ID,
  rules: 'A gulf splits the yard; off a bridge you fall. Strike a bridge pin and it drops whoever is on it. His torch cuts the bridge nearest you.',
  make,
};
