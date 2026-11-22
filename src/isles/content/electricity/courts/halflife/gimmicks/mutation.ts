import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { glow } from '../../../../../art/IsleArt';
import { glowcaps } from '../art';
import { AMBER_LIT, CAP, CAP_DIM, CAP_STEM, CHEREN_LIT, GLOW, GLOW_LIT, IRON, IRON_LIT, LEAD_DARK, SLAG } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Mutation — Botanist Glow.
 *
 * The Glowcap Gardens breathe out spores, and every few seconds both fighters *mutate*: a strain
 * takes hold of each for a while and shows on them —
 * • **huge** (slow, hard to hurt, and a shoulder-barge that bowls the other fighter over on contact),
 * • **tiny** (quick, fragile, and too small to be barged),
 * • **quick**, **slow**, **glass** (every blow lands half again as hard) or **iron** (blows glance off).
 *
 * Glow grows a *mutagen bloom* somewhere in the bed after each mutation — a great glowing cap in a
 * ring of spores. Whoever stands in its ring when the next mutation takes rolls twice and keeps
 * the better strain. Glow knows it and goes for the bloom; beat her to it, or stand in it with her
 * and make it a fair fight.
 */

type Trait = 'huge' | 'tiny' | 'quick' | 'slow' | 'glass' | 'iron';
const TRAITS: Trait[] = ['huge', 'tiny', 'quick', 'slow', 'glass', 'iron'];
/** Best first — what a fighter would keep, given the choice. */
const RANK: Record<Trait, number> = { iron: 5, quick: 4, huge: 3, tiny: 2, slow: 1, glass: 0 };
const LABEL: Record<Trait, string> = { huge: 'HUGE', tiny: 'TINY', quick: 'QUICK', slow: 'SLOW', glass: 'GLASS', iron: 'IRON' };
const CSS: Record<Trait, string> = { huge: '#9aff7a', tiny: '#d8ffb0', quick: '#ffe08a', slow: '#8ab0c8', glass: '#b8ecff', iron: '#c0c4cc' };
const SPEED: Record<Trait, number> = { huge: 0.8, tiny: 1.3, quick: 1.5, slow: 0.6, glass: 1, iron: 0.85 };
const TAKEN: Record<Trait, number> = { huge: 0.8, tiny: 1.25, quick: 1, slow: 1, glass: 1.6, iron: 0.55 };

const LAST_MS = 6000;
const WARN_MS = 1400;
const BLOOM_R = 70;
const BARGE_R = 54;

interface Strain { trait: Trait | null; until: number; at: number; picked: boolean }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng, tk } = ctx;
  const every = ctx.hard ? 6200 : 7600;
  const strains = new Map<Fighter, Strain>([[player, { trait: null, until: 0, at: 0, picked: false }], [npc, { trait: null, until: 0, at: 0, picked: false }]]);
  let nextRoll = 0;
  let warnAt = -1;
  let bloom: Pt | null = null;
  let bloomAt = 0;
  let bargeReady = 0;
  let bargeFx: { x: number; y: number; at: number } | null = null;
  let started = false;
  const live = (f: Fighter): Trait | null => {
    const s = strains.get(f);
    return s && s.trait && ctx.scene.time.now < s.until ? s.trait : null;
  };

  function roll(prev: Trait | null): Trait {
    const pool = TRAITS.filter((t) => t !== prev);
    return pool[Math.floor(rng() * pool.length)];
  }

  function placeBloom(time: number): void {
    for (let tries = 0; tries < 20; tries++) {
      const x = 110 + rng() * (W - 220), y = top + 90 + rng() * (H - top - 160);
      if (dist(x, y, player.x, player.y) < 160 || dist(x, y, npc.x, npc.y) < 160) continue;
      bloom = { x, y };
      bloomAt = time;
      return;
    }
    bloom = { x: W / 2, y: (top + H) / 2 };
    bloomAt = time;
  }

  function mutate(time: number): void {
    for (const f of [player, npc]) {
      if (!alive(f)) continue;
      const s = strains.get(f);
      if (!s) continue;
      let t = roll(s.trait);
      const lucky = !!bloom && dist(f.x, f.y, bloom.x, bloom.y) < BLOOM_R;
      if (lucky) { const t2 = roll(s.trait); if (RANK[t2] > RANK[t]) t = t2; }
      s.trait = t; s.until = time + LAST_MS; s.at = time; s.picked = lucky;
      ctx.float(f.x, f.y - 56, lucky ? `${LABEL[t]} (SELECTED)` : LABEL[t], CSS[t]);
    }
    tk.sfx('spore');
    placeBloom(time);
  }

  return {
    update(time, dtRaw) {
      stepDt(dtRaw);
      if (!started) { started = true; nextRoll = time + 3200; placeBloom(time); }
      if (warnAt < 0 && time >= nextRoll - WARN_MS) { warnAt = time; ctx.banner('THE SPORES ARE RISING', '#9aff7a'); tk.sfx('status-buff'); }
      if (time >= nextRoll) { nextRoll = time + every; warnAt = -1; mutate(time); }

      // The barge: a huge fighter bowls over whoever they touch (not the tiny).
      if (alive(player) && alive(npc) && time >= bargeReady) {
        const d = dist(player.x, player.y, npc.x, npc.y);
        if (d < BARGE_R) {
          const pt = live(player), nt = live(npc);
          const pair: [Fighter, Fighter][] = [];
          if (pt === 'huge' && nt !== 'tiny' && nt !== 'huge') pair.push([player, npc]);
          if (nt === 'huge' && pt !== 'tiny' && pt !== 'huge') pair.push([npc, player]);
          for (const [big, small] of pair) {
            const a = Math.atan2(small.y - big.y, small.x - big.x);
            ctx.nudge(small, Math.cos(a) * 90, Math.sin(a) * 90);
            if (small === player) tk.hitPlayer(6, small.x, small.y); else ctx.hit(small, 6, small.x, small.y);
            ctx.stun(small, 350);
            bargeFx = { x: (big.x + small.x) / 2, y: (big.y + small.y) / 2, at: time };
            tk.sfx('stone-slam');
            bargeReady = time + 900;
          }
        }
      }
    },

    playerSpeedMult() { const t = live(player); return t ? SPEED[t] : 1; },
    npcSpeedMult() { const t = live(npc); return t ? SPEED[t] : 1; },
    playerTakenMult() { const t = live(player); return t ? TAKEN[t] : 1; },
    npcTakenMult() { const t = live(npc); return t ? TAKEN[t] : 1; },

    npcSeek() {
      const time = ctx.scene.time.now;
      // The bloom, when the spores are about to rise (or as soon as it is up, if she is near it).
      if (bloom && (time >= nextRoll - WARN_MS - 2200 || dist(bloom.x, bloom.y, npc.x, npc.y) < 260)) return bloom;
      const mine = live(npc), yours = live(player);
      if (mine === 'huge' && yours !== 'tiny') return { x: player.x, y: player.y };
      if (mine === 'glass' || yours === 'huge') {
        const a = Math.atan2(npc.y - player.y, npc.x - player.x);
        return { x: clamp(player.x + Math.cos(a) * 330, 60, W - 60), y: clamp(player.y + Math.sin(a) * 300, top + 50, H - 40) };
      }
      const want = yours === 'glass' ? 120 : 230;
      const a = Math.atan2(npc.y - player.y, npc.x - player.x);
      return { x: clamp(player.x + Math.cos(a) * want, 60, W - 60), y: clamp(player.y + Math.sin(a) * want, top + 50, H - 40) };
    },

    drawGround(g, time) {
      if (bloom) {
        const grow = clamp((time - bloomAt) / 900, 0, 1);
        const due = warnAt >= 0 ? clamp((time - warnAt) / WARN_MS, 0, 1) : 0;
        g.fillStyle(CAP_DIM, 0.12 + due * 0.15); g.fillCircle(bloom.x, bloom.y, BLOOM_R * grow);
        g.lineStyle(2 + due * 2, CAP, 0.4 + due * 0.5); g.strokeCircle(bloom.x, bloom.y, BLOOM_R * grow);
        // A ring of spore-puffs round the rim.
        for (let i = 0; i < 14; i++) {
          const a = (i / 14) * Math.PI * 2 + time / 2400;
          g.fillStyle(CAP, 0.25 + due * 0.4); g.fillCircle(bloom.x + Math.cos(a) * BLOOM_R * grow, bloom.y + Math.sin(a) * BLOOM_R * grow, 3 + due * 2);
        }
      }
      // A slow ooze under the slow, sparks under the quick.
      for (const f of [player, npc]) {
        const t = live(f);
        if (!alive(f) || !t) continue;
        if (t === 'slow') { g.fillStyle(0x6a8a9a, 0.35); g.fillEllipse(f.x, f.y + 14, 50, 14); }
        if (t === 'huge') { g.fillStyle(0x000000, 0.25); g.fillEllipse(f.x, f.y + 16, 70, 20); }
      }
    },

    drawAir(g, time) {
      if (bloom) {
        const grow = clamp((time - bloomAt) / 900, 0, 1);
        // The mutagen bloom itself: one great cap among small ones.
        const bx = bloom.x, by = bloom.y + 10;
        glow(g, bx, by - 30, 50 * grow, CAP, 0.06, 3);
        g.lineStyle(6 * grow, CAP_STEM, 1); g.lineBetween(bx, by, bx + 2, by - 34 * grow);
        g.fillStyle(CAP_DIM, 1); g.fillEllipse(bx, by - 34 * grow + 2, 48 * grow, 18 * grow);
        g.fillStyle(CAP, 1); g.fillEllipse(bx, by - 36 * grow, 46 * grow, 22 * grow);
        for (let i = 0; i < 6; i++) { g.fillStyle(0xffffff, 0.8); g.fillCircle(bx - 15 * grow + i * 6 * grow, by - 38 * grow + (i % 2) * 3, 1.4); }
        if (grow > 0.6) glowcaps(g, bx + 20, by + 4, 3, () => 0.5, 0.7);
      }
      // Each fighter's strain, drawn on them.
      for (const f of [player, npc]) {
        if (!alive(f)) continue;
        const s = strains.get(f);
        const t = live(f);
        const x = f.x, y = f.y - 4;
        if (warnAt >= 0) {
          // The roll: strains flickering over the head like a dial spinning.
          const k = Math.floor((time - warnAt) / 90) % TRAITS.length;
          g.fillStyle(0x000000, 0.4); g.fillRoundedRect(x - 12, y - 64, 24, 14, 4);
          g.fillStyle(GLOW, 0.8); g.fillCircle(x - 6 + (k % 3) * 6, y - 57, 2.5);
        }
        if (!t || !s) continue;
        const k = clamp((s.until - time) / LAST_MS, 0, 1);
        switch (t) {
          case 'huge': {
            // A swollen green membrane, bulging.
            for (let i = 0; i < 8; i++) {
              const a = (i / 8) * Math.PI * 2 + time / 900;
              g.fillStyle(GLOW, 0.12); g.fillCircle(x + Math.cos(a) * 30, y + Math.sin(a) * 28, 16);
            }
            g.lineStyle(3, GLOW, 0.7); g.strokeCircle(x, y, 40 + Math.sin(time / 200) * 3);
            break;
          }
          case 'tiny': {
            g.lineStyle(2, GLOW_LIT, 0.8); g.strokeCircle(x, y, 14);
            for (let i = 0; i < 4; i++) {
              const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
              g.lineStyle(2, GLOW_LIT, 0.7); g.lineBetween(x + Math.cos(a) * 30, y + Math.sin(a) * 30, x + Math.cos(a) * 18, y + Math.sin(a) * 18);
            }
            break;
          }
          case 'quick': {
            for (let i = 0; i < 4; i++) {
              const ph = ((time / 160) + i / 4) % 1;
              g.lineStyle(2, AMBER_LIT, 0.7 * (1 - ph)); g.lineBetween(x - 20 - ph * 30, y - 10 + i * 7, x - 34 - ph * 30, y - 10 + i * 7);
            }
            break;
          }
          case 'slow': {
            for (let i = 0; i < 3; i++) {
              const ph = ((time / 900) + i / 3) % 1;
              g.fillStyle(0x8ab0c8, 0.7 * (1 - ph)); g.fillCircle(x - 12 + i * 12, y + 10 + ph * 16, 3);
            }
            break;
          }
          case 'glass': {
            // Crystal facets over the body, cracked.
            for (let i = 0; i < 6; i++) {
              const a = (i / 6) * Math.PI * 2;
              g.lineStyle(1.5, CHEREN_LIT, 0.8);
              g.lineBetween(x + Math.cos(a) * 24, y + Math.sin(a) * 24, x + Math.cos(a + 1.05) * 24, y + Math.sin(a + 1.05) * 24);
              g.lineBetween(x, y, x + Math.cos(a) * 24, y + Math.sin(a) * 24);
            }
            g.fillStyle(CHEREN_LIT, 0.12); g.fillCircle(x, y, 24);
            break;
          }
          case 'iron': {
            g.lineStyle(5, IRON, 0.8); g.strokeCircle(x, y, 25);
            for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.fillStyle(IRON_LIT, 1); g.fillCircle(x + Math.cos(a) * 25, y + Math.sin(a) * 25, 2); }
            break;
          }
        }
        // The strain's name, and a draining bar of how long it has.
        g.fillStyle(LEAD_DARK, 0.8); g.fillRect(x - 18, y - 52, 36, 4);
        g.fillStyle(s.picked ? CAP : GLOW, 1); g.fillRect(x - 18, y - 52, 36 * k, 4);
      }
      if (bargeFx && time - bargeFx.at < 450) {
        const k = (time - bargeFx.at) / 450;
        g.lineStyle(4 * (1 - k), SLAG, 1 - k); g.strokeCircle(bargeFx.x, bargeFx.y, 14 + k * 40);
      }
    },

    drawHud(g) {
      // Both strains, as lettered chips at the top corners.
      for (const [f, x] of [[player, 20], [npc, W - 20 - 90]] as [Fighter, number][]) {
        const t = live(f);
        g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x, top + 6, 90, 16, 6);
        g.fillStyle(t ? GLOW : LEAD_DARK, t ? 0.8 : 0.6); g.fillRoundedRect(x + 3, top + 9, 10, 10, 3);
        if (t) {
          const n = RANK[t] + 1;
          for (let i = 0; i < n; i++) { g.fillStyle(GLOW_LIT, 0.9); g.fillRect(x + 18 + i * 11, top + 11, 8, 6); }
        }
      }
    },
  };
}

export const MUTATION: GimmickDef = {
  id: 'halflife-mutation',
  rules: 'Every few seconds both fighters mutate: huge, tiny, quick, slow, glass or iron. Stand in Glow\'s mutagen bloom as the spores rise to roll twice and keep the better.',
  make,
};
