import type { StrikeTarget } from '../../../../../../boss/framework/StrikeTargets';
import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import type { G } from '../../../../../art/IsleArt';
import { OBS } from '../../../../../art/PinnacleArt';
import { NOON } from '../art';
import { SIDE, SIDE_CSS, WHO, type Who, alive, clamp, dist, fighterOf, otherOf } from './util';

/**
 * DECREE OF THE LETTERS PATENT — Councilor Henrietta Gauge, Seat of the Specification (Creation).
 *
 * She drafted the Mirror Specification and ran the Patent Office that owned every invention on
 * Solmara — including the mirrors that held the sun. Here the Office owns your hands.
 *   - THE OFFICE OPENS on a clock: every patent lapses, and the letters patent for the keys —
 *     CLICK, E, R, F, Q — come down from the ceiling and land about the floor (shadows first).
 *     The Bench always reserves one key for itself before anyone else can move.
 *   - Strike a letter and that key's patent is yours (anything that hits it files it).
 *   - Use a key whose patent the other side holds and you pay them a ROYALTY: you are hurt and
 *     they are healed. Click royalties are small, and charged at most twice a second.
 * She casts all five of her keys all fight long, and she knows it, so she runs for the letters.
 * The trick: she will infringe anything you hold — she cannot help it. File her keys, not yours.
 */

type Key = 'click' | 'e' | 'r' | 'f' | 'q';
const KEYS: Key[] = ['click', 'e', 'r', 'f', 'q'];
/** The councilor's own keys (Creation): which press is which patent. */
const CREATION_SLOT: Record<string, Key> = { 'dagger-spray': 'click', 'charged-bolt': 'e', 'wrench-plans': 'r', 'creation-block': 'f', 'self-destruct': 'q' };

interface Letter { key: Key; x: number; y: number; landAt: number; target: StrikeTarget | null; filed: Who | null; filedAt: number }
interface Coin { x0: number; y0: number; to: Who; at: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, rng } = ctx;
  const EVERY = ctx.hard ? 15000 : 18000;
  const DROP = 900;
  const ROYALTY = ctx.hard ? 10 : 8;
  const patent: Record<Key, Who | null> = { click: null, e: null, r: null, f: null, q: null };
  const gate: Record<Who, Record<Key, number>> = { player: { click: 0, e: 0, r: 0, f: 0, q: 0 }, npc: { click: 0, e: 0, r: 0, f: 0, q: 0 } };
  let letters: Letter[] = [];
  const coins: Coin[] = [];
  let nextOpen = 0;
  let started = false;

  function clearLetters(): void {
    for (const l of letters) l.target?.remove();
    letters = [];
  }

  function open(now: number): void {
    clearLetters();
    for (const k of KEYS) patent[k] = null;
    // The Bench reserves one key (never the click) before the doors open.
    const reserved = KEYS[1 + Math.floor(rng() * 4)];
    patent[reserved] = 'npc';
    const stations: { x: number; y: number }[] = [];
    for (const fx of [0.18, 0.5, 0.82]) for (const fy of [0.22, 0.55, 0.86]) stations.push({ x: W * fx, y: top + (H - top) * fy });
    for (let i = stations.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [stations[i], stations[j]] = [stations[j], stations[i]]; }
    let si = 0;
    for (const k of KEYS) {
      if (k === reserved) { letters.push({ key: k, x: W / 2, y: top + 10, landAt: now, target: null, filed: 'npc', filedAt: now }); continue; }
      const st = stations[si++];
      const x = st.x + (rng() - 0.5) * 50, y = st.y + (rng() - 0.5) * 40;
      letters.push({ key: k, x, y, landAt: now + ctx.tk.warn(DROP), target: null, filed: null, filedAt: 0 });
    }
    ctx.banner(`THE OFFICE OPENS — THE BENCH RESERVES ${reserved.toUpperCase()}`, '#fff2b0');
    ctx.sfx('gear-turn');
  }

  function file(l: Letter, by: Who): void {
    if (l.filed) return;
    l.filed = by;
    l.filedAt = ctx.scene.time.now;
    patent[l.key] = by;
    l.target?.remove();
    l.target = null;
    ctx.float(l.x, l.y - 40, `PATENT: ${l.key.toUpperCase()}`, SIDE_CSS[by]);
    ctx.sfx('hammer-forge');
  }

  function royalty(payer: Who, key: Key): void {
    const now = ctx.scene.time.now;
    if (patent[key] !== otherOf(payer) || now < gate[payer][key]) return;
    const click = key === 'click';
    gate[payer][key] = now + (click ? 500 : 250);
    const f = fighterOf(ctx, payer), holder = fighterOf(ctx, otherOf(payer));
    if (!alive(f)) return;
    const amt = click ? 2 : ROYALTY;
    ctx.hit(f, amt, f.x, f.y);
    if (alive(holder)) ctx.heal(holder, Math.round(amt * 0.6));
    coins.push({ x0: f.x, y0: f.y, to: otherOf(payer), at: now });
    if (!click) { ctx.float(f.x, f.y - 50, `ROYALTY — ${key.toUpperCase()}`, SIDE_CSS[otherOf(payer)]); ctx.sfx('money'); }
  }

  return {
    update(time) {
      if (!started) { started = true; nextOpen = time + 900; }
      if (time >= nextOpen) { open(time); nextOpen = time + EVERY; }
      for (const l of letters) {
        if (!l.filed && !l.target && time >= l.landAt) {
          l.target = ctx.target({ x: l.x, y: l.y, r: 26, passThrough: true, onStruck: (by) => file(l, by) });
          ctx.sfx('anvil');
        }
      }
      for (let i = coins.length - 1; i >= 0; i--) if (time - coins[i].at > 650) coins.splice(i, 1);
    },

    onPlayerCast(_id, slot) {
      if (slot && (KEYS as string[]).includes(slot)) royalty('player', slot as Key);
    },
    onNpcCast(id) {
      const k = CREATION_SLOT[id];
      if (k) royalty('npc', k);
    },

    npcSeek() {
      const n = ctx.npc, now = ctx.scene.time.now;
      let best: Letter | null = null, bd = Infinity;
      for (const l of letters) {
        if (l.filed || now < l.landAt) continue;
        const d = dist(n.x, n.y, l.x, l.y);
        if (d < bd) { bd = d; best = l; }
      }
      return best ? { x: best.x, y: best.y + 30 } : null;
    },

    destroy() { clearLetters(); },

    drawGround(g, time) {
      for (const l of letters) {
        if (l.filed) continue;
        if (time < l.landAt) {
          // Its shadow swelling as it comes down.
          const k = clamp(1 - (l.landAt - time) / ctx.tk.warn(DROP), 0, 1);
          g.fillStyle(0x000000, 0.15 + k * 0.3); g.fillEllipse(l.x, l.y + 22, 20 + k * 30, 6 + k * 8);
          g.lineStyle(1, NOON.gold, 0.4 + k * 0.4); g.strokeEllipse(l.x, l.y + 22, 54, 16);
        } else {
          g.fillStyle(0x000000, 0.4); g.fillEllipse(l.x, l.y + 24, 52, 14);
          g.lineStyle(1.5, NOON.brass, 0.5 + 0.3 * Math.sin(time / 200)); g.strokeEllipse(l.x, l.y + 24, 64, 18);
        }
      }
    },

    drawAir(g, time) {
      for (const l of letters) {
        if (l.filed) continue;
        const y = time < l.landAt ? l.y - 300 * (1 - clamp(1 - (l.landAt - time) / ctx.tk.warn(DROP), 0, 1)) : l.y;
        drawLetter(g, l.key, l.x, y, null, time);
      }
      // Royalty coins: an arc of gold from the payer to the holder.
      for (const c of coins) {
        const h = fighterOf(ctx, c.to);
        const k = clamp((time - c.at) / 650, 0, 1);
        for (let i = 0; i < 3; i++) {
          const kk = clamp(k - i * 0.08, 0, 1);
          const x = c.x0 + (h.x - c.x0) * kk, y = c.y0 + (h.y - c.y0) * kk - Math.sin(kk * Math.PI) * 70;
          g.fillStyle(NOON.brassDark, 1); g.fillEllipse(x, y, 9, 7);
          g.fillStyle(NOON.gold, 1); g.fillEllipse(x - 0.5, y - 0.5, 7, 5);
        }
      }
    },

    drawHud(g, time) {
      // The register: five plaques along the top, each sealed in its holder's colour.
      const x0 = W / 2 - 150, y = top + 20;
      g.fillStyle(OBS.glass, 0.85); g.fillRoundedRect(x0 - 14, y - 16, 328, 32, 8);
      g.lineStyle(1.5, NOON.brass, 0.9); g.strokeRoundedRect(x0 - 14, y - 16, 328, 32, 8);
      KEYS.forEach((k, i) => {
        const px = x0 + 10 + i * 60;
        const who = patent[k];
        g.fillStyle(0xe8dcae, who ? 1 : 0.35); g.fillRect(px - 14, y - 12, 28, 24);
        g.lineStyle(1, NOON.brassDark, 1); g.strokeRect(px - 14, y - 12, 28, 24);
        keyGlyph(g, k, px - 4, y, 7, 0x2a2010);
        if (who) {
          const l = letters.find((q) => q.key === k);
          const pop = l ? clamp((time - l.filedAt) / 250, 0, 1) : 1;
          g.fillStyle(SIDE[who], 1); g.fillCircle(px + 10, y + 7, 4 + (1 - pop) * 4);
          g.lineStyle(1, 0x2a2010, 0.8); g.strokeCircle(px + 10, y + 7, 4);
        }
      });
      // The Office clock: a brass needle sweeping round to the next opening.
      const cx = x0 + 330, cy = y;
      const k = clamp(1 - (nextOpen - time) / EVERY, 0, 1);
      g.fillStyle(OBS.glass, 0.9); g.fillCircle(cx, cy, 13);
      g.lineStyle(1.5, NOON.brass, 1); g.strokeCircle(cx, cy, 13);
      const a = -Math.PI / 2 + k * Math.PI * 2;
      g.lineStyle(2, NOON.gold, 1); g.lineBetween(cx, cy, cx + Math.cos(a) * 10, cy + Math.sin(a) * 10);
    },
  };

  /** A letter patent: a gold-leaf sheet in a black-glass frame, a ribbon and a blank seal waiting. */
  function drawLetter(g: G, k: Key, x: number, y: number, seal: Who | null, time: number): void {
    const sway = Math.sin(time / 300 + x) * 2;
    g.fillStyle(NOON.gold, 0.08); g.fillCircle(x, y - 18, 34);
    g.fillStyle(OBS.glass, 1); g.fillRect(x - 17 + sway, y - 46, 34, 44);
    g.lineStyle(1.2, OBS.edge, 0.7); g.strokeRect(x - 17 + sway, y - 46, 34, 44);
    g.fillStyle(0xeadfb4, 1); g.fillRect(x - 13 + sway, y - 42, 26, 36);
    g.lineStyle(1, 0x8a6a2a, 0.5);
    for (let i = 0; i < 3; i++) g.lineBetween(x - 9 + sway, y - 14 + i * 3, x + 9 + sway, y - 14 + i * 3);
    keyGlyph(g, k, x + sway, y - 28, 8, 0x3a2810);
    // Ribbon and seal.
    g.fillStyle(0x8a1a1a, 1); g.fillTriangle(x - 4 + sway, y - 4, x + 1 + sway, y - 4, x - 6 + sway, y + 8);
    g.fillTriangle(x + 1 + sway, y - 4, x + 6 + sway, y - 4, x + 7 + sway, y + 8);
    g.fillStyle(seal ? SIDE[seal] : NOON.brass, 1); g.fillCircle(x + sway, y - 4, 5);
    g.lineStyle(1, NOON.brassDark, 1); g.strokeCircle(x + sway, y - 4, 5);
  }
}

/** A key's name drawn in strokes (no font in the arena): a mouse for CLICK, letter-forms for the rest. */
function keyGlyph(g: G, k: Key, x: number, y: number, s: number, c: number): void {
  g.lineStyle(Math.max(1.2, s * 0.22), c, 1);
  const L = x - s * 0.45, R = x + s * 0.45, T = y - s * 0.7, B = y + s * 0.7;
  switch (k) {
    case 'click':
      g.strokeRoundedRect(x - s * 0.45, y - s * 0.75, s * 0.9, s * 1.5, s * 0.4);
      g.lineBetween(x, y - s * 0.75, x, y - s * 0.1);
      g.fillStyle(c, 1); g.fillRect(x - s * 0.42, y - s * 0.7, s * 0.42, s * 0.6);
      break;
    case 'e': g.lineBetween(L, T, L, B); g.lineBetween(L, T, R, T); g.lineBetween(L, y, R - s * 0.15, y); g.lineBetween(L, B, R, B); break;
    case 'f': g.lineBetween(L, T, L, B); g.lineBetween(L, T, R, T); g.lineBetween(L, y, R - s * 0.15, y); break;
    case 'r':
      g.lineBetween(L, T, L, B); g.lineBetween(L, T, R - s * 0.2, T); g.lineBetween(L, y, R - s * 0.2, y);
      g.beginPath(); g.arc(R - s * 0.2, (T + y) / 2, (y - T) / 2, -Math.PI / 2, Math.PI / 2, false); g.strokePath();
      g.lineBetween(x - s * 0.05, y, R, B);
      break;
    case 'q':
      g.strokeEllipse(x, y, s * 0.95, s * 1.35);
      g.lineBetween(x + s * 0.1, y + s * 0.3, R + s * 0.1, B + s * 0.1);
      break;
  }
}

export const LETTERS_PATENT: GimmickDef = {
  id: 'bench-light-letters-patent',
  rules: 'When the Office opens, strike a letter patent to hold that key; whoever uses a key the other holds pays them a royalty in blood.',
  make,
};
