import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { lit } from '../../../../../art/IsleArt';
import { shedHusk } from '../art';
import { SLOUGH, VENOM, VENOM_LIT } from '../palette';
import { alive, clamp, dist, segDist, stepDt } from '../util';

/**
 * Shed Skin — Sloughmother Vipra.
 *
 * Vipra runs the moulting racks, where the court's serpents are brought to shed and their skins
 * taken for the Moult-Tithe. In her yard everyone moults. Every few seconds each fighter sheds:
 * a hollow skin is left standing where they were, and they step out of it fresh and quick.
 *
 * A skin is a body as far as a blow is concerned: it takes the next hit aimed at it — a shot
 * stops on it, a swing lands in it — and crumbles. Vipra hides behind hers, always keeping one
 * between you. Yours stand for you just the same; and an old skin can be stepped back into: walk
 * into one of your own and pull it on again, and it closes over your wounds.
 */

const MAX_PER = 3;
const SKIN_LIFE = 9000;
const SKIN_R = 24;
const FRESH_MS = 1200;
const FRESH_MULT = 1.28;
const REDON_HEAL = 5;

interface Skin {
  owner: Fighter; x: number; y: number; born: number; target: StrikeTarget | null; crumbleAt: number;
  /** Its owner has walked clear of it — only then can it be stepped back into. */
  left: boolean;
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  const SHED_MS = ctx.hard ? 4300 : 5200;
  const skins: Skin[] = [];
  const next = new Map<Fighter, number>();
  const fresh = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  const tint = (f: Fighter) => (f === player ? 0x9ad0ff : 0xe0a0ff);
  let started = false;

  function crumble(s: Skin, time: number, why: string, color = '#e8e4c8'): void {
    if (s.crumbleAt) return;
    s.crumbleAt = time;
    s.target?.remove();
    s.target = null;
    if (why) ctx.float(s.x, s.y - 40, why, color);
  }

  function shed(f: Fighter, time: number): void {
    const own = skins.filter((s) => s.owner === f && !s.crumbleAt);
    if (own.length >= MAX_PER) crumble(own[0], time, '');
    const s: Skin = { owner: f, x: f.x, y: f.y, born: time, target: null, crumbleAt: 0, left: false };
    s.target = ctx.target({
      x: f.x, y: f.y - 6, r: SKIN_R,
      onStruck: () => {
        const now = ctx.scene.time.now;
        crumble(s, now, 'HOLLOW', '#f0ecd0');
        ctx.sfx('crystal-shatter');
      },
    });
    skins.push(s);
    fresh.set(f, time + FRESH_MS);
    ctx.sfx('snap-back');
  }

  return {
    update(time, dtRaw) {
      stepDt(dtRaw);
      if (!started) {
        started = true;
        next.set(player, time + SHED_MS * 0.5);
        next.set(npc, time + SHED_MS * 0.25);
      }
      for (const f of [player, npc]) {
        if (!alive(f)) continue;
        if (time >= (next.get(f) ?? 0)) { next.set(f, time + SHED_MS); shed(f, time); }
      }
      for (let i = skins.length - 1; i >= 0; i--) {
        const s = skins[i];
        if (s.crumbleAt) { if (time - s.crumbleAt > 600) skins.splice(i, 1); continue; }
        if (time - s.born > SKIN_LIFE) { crumble(s, time, ''); continue; }
        // Step back into your own old skin (not the one you just left) to pull it on again.
        const o = s.owner;
        if (alive(o) && dist(o.x, o.y, s.x, s.y) > 70) s.left = true;
        if (alive(o) && s.left && dist(o.x, o.y, s.x, s.y) < 20) {
          crumble(s, time, 'SKIN PULLED ON', '#d8f088');
          ctx.heal(o, REDON_HEAL);
          ctx.sfx('heal');
        }
      }
    },

    playerSpeedMult() { return ctx.scene.time.now < (fresh.get(player) ?? 0) ? FRESH_MULT : 1; },
    npcSpeedMult() { return ctx.scene.time.now < (fresh.get(npc) ?? 0) ? FRESH_MULT : 1; },

    npcSeek() {
      if (!alive(player)) return null;
      // Vipra stands behind one of her own skins, on the far side from you.
      let best: { x: number; y: number } | null = null, bd = Infinity;
      for (const s of skins) {
        if (s.owner !== npc || s.crumbleAt) continue;
        const a = Math.atan2(s.y - player.y, s.x - player.x);
        const x = s.x + Math.cos(a) * 54, y = s.y + Math.sin(a) * 54;
        const d = dist(npc.x, npc.y, x, y);
        // Only skins that are not already between her and you are worth the walk; prefer near ones.
        const covered = segDist(s.x, s.y, player.x, player.y, npc.x, npc.y) < SKIN_R;
        const score = d - (covered ? 120 : 0);
        if (score < bd) { bd = score; best = { x, y }; }
      }
      if (!best) return null;
      return { x: clamp(best.x, 60, W - 60), y: clamp(best.y, top + 50, H - 40) };
    },

    drawGround(g, time) {
      // The moult-ring: a pale scuff where each skin stands.
      for (const s of skins) {
        const a = s.crumbleAt ? clamp(1 - (time - s.crumbleAt) / 600, 0, 1) : 1;
        g.lineStyle(1.5, lit(SLOUGH, 0.2), 0.35 * a); g.strokeEllipse(s.x, s.y + 18, 46, 14);
        if (!s.crumbleAt && s.owner === npc && alive(player)) {
          // Where her skin shades her from you: a faint line, so you can read the cover.
          const covered = segDist(s.x, s.y, player.x, player.y, npc.x, npc.y) < SKIN_R;
          if (covered) { g.lineStyle(2, VENOM, 0.25); g.lineBetween(s.x, s.y, npc.x, npc.y); }
        }
      }
      // The shedding moment: a burst of scales under the fighter.
      for (const [f, until] of fresh) {
        if (!alive(f)) continue;
        const k = 1 - clamp((until - time) / FRESH_MS, 0, 1);
        if (k >= 1) continue;
        g.lineStyle(2, VENOM_LIT, 0.6 * (1 - k)); g.strokeEllipse(f.x, f.y + 16, 30 + k * 50, 10 + k * 16);
      }
    },

    drawAir(g, time) {
      for (const s of skins) {
        const age = time - s.born;
        const a = s.crumbleAt ? clamp(1 - (time - s.crumbleAt) / 600, 0, 1) : clamp(1 - (age - SKIN_LIFE + 1200) / 1200, 0.25, 1);
        const crumbleK = s.crumbleAt ? clamp((time - s.crumbleAt) / 600, 0, 1) : 0;
        shedHusk(g, s.x, s.y - 4, tint(s.owner), a, time, crumbleK);
      }
      // A fresh skin glistens.
      for (const [f, until] of fresh) {
        if (!alive(f) || time >= until) continue;
        const k = (until - time) / FRESH_MS;
        for (let i = 0; i < 5; i++) {
          const ang = time / 200 + i * 1.26;
          g.fillStyle(0xffffff, 0.6 * k); g.fillCircle(f.x + Math.cos(ang) * 16, f.y - 6 + Math.sin(ang) * 20, 1.5);
        }
      }
    },

    drawHud(g, time) {
      // Each fighter's moult clock: a little snake biting its own tail, closing as the next shed comes.
      for (const [f, x] of [[player, 34], [npc, W - 34]] as [Fighter, number][]) {
        const due = next.get(f) ?? 0;
        const k = clamp(1 - (due - time) / SHED_MS, 0, 1);
        const y = top + 26;
        g.fillStyle(0x000000, 0.45); g.fillCircle(x, y, 15);
        g.lineStyle(4, tint(f), 0.9);
        g.beginPath(); g.arc(x, y, 10, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
        const ha = -Math.PI / 2 + k * Math.PI * 2;
        g.fillStyle(tint(f), 1); g.fillCircle(x + Math.cos(ha) * 10, y + Math.sin(ha) * 10, 3.5);
        g.fillStyle(0x101010, 1); g.fillCircle(x + Math.cos(ha) * 11, y + Math.sin(ha) * 11, 1);
      }
    },
  };
}

export const SHED_SKIN: GimmickDef = {
  id: 'fang-shed-skin',
  rules: 'Every few seconds each fighter sheds, leaving a hollow skin that takes the next blow aimed at it. Walk back into your own old skin to pull it on and heal.',
  make,
};
