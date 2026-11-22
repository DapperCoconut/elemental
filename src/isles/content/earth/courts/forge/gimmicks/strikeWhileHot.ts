import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { glow } from '../../../../../art/IsleArt';
import { anvil, bellows, slackTub } from '../art';
import { HEAT_ORANGE, HEAT_WHITE, HEAT_YELLOW, IRON_DARK, STEAM, STONE, STONE_DARK } from '../palette';
import { alive, clamp, dist, heatColor, stepDt } from '../util';

/**
 * Strike While Hot — Journeyman Cinder.
 *
 * Every blow you land heats you, like iron on the anvil; the heat bleeds off slowly. Reach full
 * heat and you go *white-hot* for a few seconds: your blows land twice over, but you burn the
 * whole time and you are soft — you take harder knocks too. Then you fall back to a red heat.
 *
 * Two slack-tubs stand at the sides of the yard. Step into one and you cool fast; step in while
 * white-hot and you are quenched — tempered: the burning stops and for a while you take less.
 * And there is the forge's bellows at the top of the yard: stand at it and it stokes you hotter,
 * which is exactly what Cinder does when he wants to come at you white.
 */

const HEAT_PER_HIT = 13;
const DECAY_PER_S = 2.5;
const WHITE_MS = 5000;
const AFTER_HEAT = 45;
const BURN_TICK = 500;
const BURN_DMG = 2;
const SOFT_MULT = 1.2;
const TEMPER_MS = 3500;
const TEMPER_MULT = 0.7;
const TUB_COOL = 48;
const BELLOWS_HEAT = 22;
const TUB_R = 42;
const BELLOWS_R = 46;

interface Heat { heat: number; whiteUntil: number; burnAt: number; temperUntil: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { tk, player, npc, W, H, top } = ctx;
  const tubs: Pt[] = [{ x: 90, y: 470 }, { x: W - 90, y: 470 }];
  const forge: Pt = { x: W / 2, y: top + 64 };
  const heats = new Map<Fighter, Heat>([
    [player, { heat: 0, whiteUntil: 0, burnAt: 0, temperUntil: 0 }],
    [npc, { heat: 20, whiteUntil: 0, burnAt: 0, temperUntil: 0 }],
  ]);
  let own = false;
  let pumpAt = -9999;
  const hissAt = new Map<Fighter, number>();
  let now = 0;

  const other = (f: Fighter) => (f === player ? npc : player);
  const white = (f: Fighter) => now < (heats.get(f)?.whiteUntil ?? 0);
  const hurt = (f: Fighter, n: number) => {
    own = true;
    if (f === player) tk.hitPlayer(n, f.x, f.y); else ctx.hit(f, n, f.x, f.y);
    own = false;
  };

  function heatUp(f: Fighter, n: number): void {
    const h = heats.get(f);
    if (!h || white(f)) return;
    h.heat = Math.min(100, h.heat + n);
    if (h.heat >= 100) {
      h.whiteUntil = now + WHITE_MS;
      h.burnAt = now;
      ctx.float(f.x, f.y - 50, 'WHITE-HOT', '#fff4d8');
      ctx.flash(f.x, f.y, HEAT_WHITE);
      ctx.sfx('flame-burst');
      if (f === npc) ctx.banner('CINDER IS WHITE-HOT', '#fff4d8');
    }
  }

  function landed(striker: Fighter, victim: Fighter, amount: number): void {
    if (own || amount < 2 || !alive(striker)) return;
    if (white(striker) && alive(victim)) {
      // The double blow.
      hurt(victim, Math.min(30, Math.round(amount)));
      ctx.float(victim.x, victim.y - 34, 'STRUCK HOT', '#ffc23a');
    }
    heatUp(striker, HEAT_PER_HIT);
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      now = time;
      for (const [f, h] of heats) {
        if (!alive(f)) continue;
        const inTub = tubs.some((t) => dist(f.x, f.y, t.x, t.y) < TUB_R);
        const atForge = dist(f.x, f.y, forge.x, forge.y) < BELLOWS_R + 20;
        if (white(f)) {
          if (time - h.burnAt > BURN_TICK) { h.burnAt = time; hurt(f, BURN_DMG); }
          if (inTub) {
            h.whiteUntil = 0;
            h.heat = 10;
            h.temperUntil = time + TEMPER_MS;
            hissAt.set(f, time);
            ctx.float(f.x, f.y - 50, 'TEMPERED', '#9ad0ff');
            ctx.sfx('sizzle');
          }
          continue;
        }
        if (h.whiteUntil > 0 && time >= h.whiteUntil) { h.whiteUntil = 0; h.heat = AFTER_HEAT; }
        if (inTub) {
          if (h.heat > 5 && (hissAt.get(f) ?? -9999) < time - 800) { hissAt.set(f, time); ctx.sfx('sizzle'); }
          h.heat = Math.max(0, h.heat - TUB_COOL * dt);
        } else if (atForge) {
          pumpAt = time;
          heatUp(f, BELLOWS_HEAT * dt);
        } else {
          h.heat = Math.max(0, h.heat - DECAY_PER_S * dt);
        }
      }
    },

    onNpcHurt(amount) { landed(player, npc, amount); },
    onPlayerHurt(amount) { landed(npc, player, amount); },

    playerTakenMult() {
      const h = heats.get(player);
      if (!h) return 1;
      if (now < h.temperUntil) return TEMPER_MULT;
      return white(player) ? SOFT_MULT : 1;
    },
    npcTakenMult() {
      const h = heats.get(npc);
      if (!h) return 1;
      if (now < h.temperUntil) return TEMPER_MULT;
      return white(npc) ? SOFT_MULT : 1;
    },

    npcSeek() {
      const me = heats.get(npc);
      const you = heats.get(player);
      if (!me || !you) return null;
      // White-hot: go in hard — then quench before the burn takes too much.
      if (white(npc)) {
        const left = me.whiteUntil - now;
        if (left < 1600 || npc.hp < npc.maxHp * 0.3) {
          const t = tubs.reduce((b, p) => (dist(p.x, p.y, npc.x, npc.y) < dist(b.x, b.y, npc.x, npc.y) ? p : b));
          return { x: t.x, y: t.y };
        }
        return { x: player.x + (npc.x < player.x ? -70 : 70), y: player.y };
      }
      // You are white-hot: keep away until it passes.
      if (white(player)) {
        const a = Math.atan2(npc.y - player.y, npc.x - player.x);
        return { x: clamp(player.x + Math.cos(a) * 300, 60, W - 60), y: clamp(player.y + Math.sin(a) * 260, top + 60, H - 50) };
      }
      // Stoke on purpose when the player is far off; otherwise press in to build heat by hitting.
      if (me.heat > 35 && me.heat < 100 && dist(player.x, player.y, npc.x, npc.y) > 240) return { x: forge.x, y: forge.y + 30 };
      return { x: player.x + (npc.x < player.x ? -110 : 110), y: player.y + 20 };
    },

    drawGround(g, time) {
      // A heat-scorched floor round the anvil in the middle, and the tubs and the bellows pad.
      g.fillStyle(0x000000, 0.2); g.fillEllipse(W / 2, (top + H) / 2 + 40, 220, 80);
      for (const t of tubs) {
        g.lineStyle(2, STEAM, 0.2); g.strokeCircle(t.x, t.y, TUB_R + 6);
        g.fillStyle(STONE_DARK, 1); g.fillEllipse(t.x, t.y + 14, TUB_R * 2.6, TUB_R);
        g.fillStyle(STONE, 0.6); g.fillEllipse(t.x, t.y + 12, TUB_R * 2.4, TUB_R * 0.8);
      }
      const pumping = time - pumpAt < 200;
      g.lineStyle(2, HEAT_ORANGE, pumping ? 0.6 : 0.25); g.strokeCircle(forge.x, forge.y + 30, BELLOWS_R);
      g.fillStyle(HEAT_ORANGE, pumping ? 0.12 : 0.05); g.fillCircle(forge.x, forge.y + 30, BELLOWS_R);
    },

    drawAir(g, time) {
      // The forge hearth and its bellows, pumping while anyone stands at it.
      const pumping = time - pumpAt < 200;
      g.fillStyle(STONE_DARK, 1); g.fillRect(forge.x - 54, forge.y - 26, 108, 40);
      g.fillStyle(STONE, 1); g.fillRect(forge.x - 54, forge.y - 26, 108, 6);
      g.fillStyle(0x140806, 1); g.fillEllipse(forge.x, forge.y - 18, 78, 14);
      g.fillStyle(heatColor(pumping ? 0.85 + Math.sin(time / 60) * 0.1 : 0.55), 1); g.fillEllipse(forge.x, forge.y - 18, 62, 10);
      glow(g, forge.x, forge.y - 20, pumping ? 70 : 44, HEAT_ORANGE, pumping ? 0.06 : 0.03, 3);
      bellows(g, forge.x - 88, forge.y - 8, 1.2, pumping ? (Math.sin(time / 90) + 1) / 2 : 0.15);
      if (pumping) {
        for (let i = 0; i < 6; i++) {
          const ph = (time / 300 + i / 6) % 1;
          g.fillStyle(i % 2 ? HEAT_YELLOW : HEAT_WHITE, 1 - ph); g.fillCircle(forge.x + (i - 2.5) * 9 + Math.sin(time / 100 + i) * 4, forge.y - 22 - ph * 50, 1.6);
        }
      }
      // The anvil in the middle of the yard, with a bar going cold on it.
      anvil(g, W / 2, (top + H) / 2 + 52, 1.4, 0.3 + Math.sin(time / 900) * 0.1);
      for (const t of tubs) {
        slackTub(g, t.x, t.y, TUB_R * 0.7);
        for (let i = 0; i < 3; i++) {
          const ph = (time / 1800 + i / 3) % 1;
          g.fillStyle(STEAM, 0.18 * Math.sin(ph * Math.PI)); g.fillCircle(t.x + Math.sin(time / 700 + i) * 8, t.y - 10 - ph * 40, 7 + ph * 8);
        }
      }
      // Each fighter glows with their heat; white-hot throws off sparks; a hiss of steam on quenching.
      for (const [f, h] of heats) {
        if (!alive(f)) continue;
        const w = white(f);
        const k = w ? 1 : h.heat / 100;
        if (k > 0.2) glow(g, f.x, f.y - 6, 24 + k * 16, w ? HEAT_WHITE : heatColor(k * 0.8), 0.03 + k * 0.04, 3);
        if (w) {
          for (let i = 0; i < 6; i++) {
            const ph = (time / 260 + i / 6) % 1;
            const a = i * 1.1 + time / 400;
            g.fillStyle(i % 2 ? HEAT_YELLOW : HEAT_WHITE, 1 - ph);
            g.fillCircle(f.x + Math.cos(a) * (18 + ph * 20), f.y - 10 + Math.sin(a) * 10 - ph * 28, 1.7);
          }
        }
        if (now < h.temperUntil) { g.lineStyle(2, 0x9ad0ff, 0.5); g.strokeCircle(f.x, f.y - 6, 30); }
        const hs = hissAt.get(f) ?? -9999;
        if (time - hs < 700) {
          const q = (time - hs) / 700;
          for (let i = 0; i < 5; i++) { g.fillStyle(STEAM, 0.4 * (1 - q)); g.fillCircle(f.x + (i - 2) * 9, f.y - 20 - q * 40, 8 + q * 10); }
        }
      }
    },

    drawHud(g, time) {
      // A heat bar each: dull red through to white, flashing at white heat.
      for (const [f, x, d] of [[player, 20, 1], [npc, W - 20, -1]] as [Fighter, number, number][]) {
        const h = heats.get(f);
        if (!h) continue;
        const w = 130;
        const x0 = d > 0 ? x : x - w;
        const y = top + 10;
        const isWhite = time < h.whiteUntil;
        const k = isWhite ? 1 : h.heat / 100;
        g.fillStyle(0x000000, 0.55); g.fillRoundedRect(x0 - 2, y - 2, w + 4, 12, 5);
        g.fillStyle(IRON_DARK, 1); g.fillRoundedRect(x0, y, w, 8, 4);
        const fw = w * (isWhite ? (h.whiteUntil - time) / WHITE_MS : k);
        g.fillStyle(isWhite ? (Math.sin(time / 80) > 0 ? HEAT_WHITE : HEAT_YELLOW) : heatColor(k * 0.85), 1);
        g.fillRoundedRect(d > 0 ? x0 : x0 + w - fw, y, Math.max(2, fw), 8, 4);
        if (time < h.temperUntil) { g.lineStyle(1.5, 0x9ad0ff, 0.9); g.strokeRoundedRect(x0 - 2, y - 2, w + 4, 12, 5); }
      }
    },
  };
}

export const STRIKE_WHILE_HOT: GimmickDef = {
  id: 'forge-strike-while-hot',
  rules: 'Every blow you land heats you. White-hot, your blows land double but you burn and bruise easily. Quench in a slack-tub to temper; the bellows stokes you on purpose.',
  make,
};
