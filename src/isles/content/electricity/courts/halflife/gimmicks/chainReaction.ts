import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { glow } from '../../../../../art/IsleArt';
import { core } from '../art';
import { AMBER, AMBER_LIT, CHEREN, CHEREN_LIT, GLOW, GLOW_LIT, HAZARD_BLACK, LEAD, LEAD_DARK, LEAD_LIT } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Chain Reaction — Fissioner Uran.
 *
 * Fuel pellets lie scattered about the cask yard, and neutrons — tiny blue-white sparks — bounce
 * round it off the walls. A neutron that strikes a pellet splits it: the pellet is gone and *two*
 * neutrons fly out where there was one. A neutron that strikes a fighter is soaked up, and stings.
 *
 * Uran fires neutrons into the pellets nearest you, so the chain blooms round your feet. Watch
 * the count: when enough neutrons are loose at once the yard goes *critical* — the neutrons'
 * centre of mass glows white and blows. Soak neutrons with your own body to keep the count down,
 * or let it run and make sure the swarm is round him when it goes.
 */

const N_R = 5;
const N_SPEED = 260;
const PELLET_R = 9;
const N_LIFE = 7000;
const N_CAP = 40;
const CRIT_WARN = 1300;
const CRIT_R = 190;
const CRIT_DMG = 18;

interface Neutron { x: number; y: number; vx: number; vy: number; bornAt: number }
interface Pellet { x: number; y: number; bornAt: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng, tk } = ctx;
  const MAX_PELLETS = ctx.hard ? 12 : 10;
  const CRIT = ctx.hard ? 9 : 10;
  const fireEvery = ctx.hard ? 2000 : 2600;
  const neutrons: Neutron[] = [];
  const pellets: Pellet[] = [];
  const splits: { x: number; y: number; at: number }[] = [];
  let nextFire = 0;
  let aimAt: Pt | null = null;
  let aimSince = 0;
  let nextPellet = 0;
  let crit: { x: number; y: number; at: number } | null = null;
  let critCooldown = 0;
  let blastAt = -9999;
  let blastPt: Pt = { x: 0, y: 0 };
  let started = false;

  const X0 = 40, X1 = W - 40, Y0 = top + 14, Y1 = H - 30;

  function addPellet(time: number): void {
    for (let tries = 0; tries < 20; tries++) {
      const x = 90 + rng() * (W - 180), y = top + 70 + rng() * (H - top - 130);
      if (pellets.some((p) => dist(p.x, p.y, x, y) < 70)) continue;
      if (dist(x, y, player.x, player.y) < 60 || dist(x, y, npc.x, npc.y) < 60) continue;
      pellets.push({ x, y, bornAt: time });
      return;
    }
  }

  function fire(fromX: number, fromY: number, a: number, time: number): void {
    if (neutrons.length >= N_CAP) return;
    neutrons.push({ x: fromX, y: fromY, vx: Math.cos(a) * N_SPEED, vy: Math.sin(a) * N_SPEED, bornAt: time });
  }

  const hurt = (f: Fighter, n: number) => { if (f === player) tk.hitPlayer(n, f.x, f.y); else ctx.hit(f, n, f.x, f.y); };

  function centroid(): Pt {
    let x = 0, y = 0;
    for (const n of neutrons) { x += n.x; y += n.y; }
    return { x: x / Math.max(1, neutrons.length), y: y / Math.max(1, neutrons.length) };
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) {
        started = true;
        for (let i = 0; i < MAX_PELLETS - 2; i++) addPellet(time - 1000);
        nextFire = time + 1600;
        nextPellet = time + 2400;
      }
      if (time >= nextPellet) { nextPellet = time + 2400; if (pellets.length < MAX_PELLETS) addPellet(time); }

      // Uran aims at the pellet nearest you, then fires.
      if (!aimAt && time >= nextFire - 520 && alive(npc)) {
        let best: Pt | null = null;
        let bd = Infinity;
        for (const p of pellets) { const d = dist(p.x, p.y, player.x, player.y); if (d < bd) { bd = d; best = p; } }
        aimAt = best ? { x: best.x, y: best.y } : { x: player.x, y: player.y };
        aimSince = time;
      }
      if (aimAt && time >= nextFire) {
        nextFire = time + fireEvery;
        if (alive(npc)) {
          const a = Math.atan2(aimAt.y - npc.y, aimAt.x - npc.x);
          fire(npc.x + Math.cos(a) * 26, npc.y + Math.sin(a) * 26, a, time);
          if (ctx.hard) fire(npc.x, npc.y, a + 0.25, time);
          tk.sfx('plasma-arc');
        }
        aimAt = null;
      }

      // Neutrons fly, bounce, split pellets, sting fighters.
      for (let i = neutrons.length - 1; i >= 0; i--) {
        const n = neutrons[i];
        n.x += n.vx * dt; n.y += n.vy * dt;
        if (n.x < X0) { n.x = X0; n.vx = Math.abs(n.vx); }
        if (n.x > X1) { n.x = X1; n.vx = -Math.abs(n.vx); }
        if (n.y < Y0) { n.y = Y0; n.vy = Math.abs(n.vy); }
        if (n.y > Y1) { n.y = Y1; n.vy = -Math.abs(n.vy); }
        if (!crit && time - n.bornAt > N_LIFE) { neutrons.splice(i, 1); continue; }
        let gone = false;
        for (const f of [player, npc]) {
          if (!alive(f) || dist(f.x, f.y, n.x, n.y) > 22 + N_R) continue;
          hurt(f, 4);
          gone = true;
          break;
        }
        if (gone) { neutrons.splice(i, 1); continue; }
        if (crit) continue;
        for (let k = pellets.length - 1; k >= 0; k--) {
          const p = pellets[k];
          if (time - p.bornAt < 600 || dist(p.x, p.y, n.x, n.y) > PELLET_R + N_R) continue;
          pellets.splice(k, 1);
          const a = Math.atan2(n.vy, n.vx);
          const s = 0.5 + rng() * 0.5;
          neutrons.splice(i, 1);
          fire(p.x, p.y, a + s, time);
          fire(p.x, p.y, a - s, time);
          splits.push({ x: p.x, y: p.y, at: time });
          tk.sfx('zap');
          break;
        }
      }
      for (let i = splits.length - 1; i >= 0; i--) if (time - splits[i].at > 400) splits.splice(i, 1);

      // Critical mass.
      if (!crit && time >= critCooldown && neutrons.length >= CRIT) {
        const c = centroid();
        crit = { x: clamp(c.x, 80, W - 80), y: clamp(c.y, top + 60, H - 60), at: time };
        ctx.banner('CRITICAL MASS', '#d8ffb0');
        tk.sfx('beam-charge');
      }
      if (crit) {
        // The swarm is drawn in toward the core while it builds.
        for (const n of neutrons) {
          const a = Math.atan2(crit.y - n.y, crit.x - n.x);
          n.vx += Math.cos(a) * 600 * dt; n.vy += Math.sin(a) * 600 * dt;
          const sp = Math.hypot(n.vx, n.vy);
          if (sp > N_SPEED) { n.vx *= N_SPEED / sp; n.vy *= N_SPEED / sp; }
        }
        if (time - crit.at >= CRIT_WARN) {
          blastAt = time;
          blastPt = { x: crit.x, y: crit.y };
          for (const f of [player, npc]) if (alive(f) && dist(f.x, f.y, crit.x, crit.y) < CRIT_R) { hurt(f, CRIT_DMG); ctx.float(f.x, f.y - 50, 'FISSION!', '#ffffff'); }
          for (let k = pellets.length - 1; k >= 0; k--) if (dist(pellets[k].x, pellets[k].y, crit.x, crit.y) < CRIT_R) pellets.splice(k, 1);
          neutrons.length = 0;
          crit = null;
          critCooldown = time + 4000;
          ctx.flash(blastPt.x, blastPt.y, GLOW_LIT);
          tk.sfx('explosion-large');
        }
      }
    },

    npcSeek() {
      if (crit) {
        // Run from the core — and drag the fight with him, if he can.
        const a = Math.atan2(npc.y - crit.y, npc.x - crit.x);
        return { x: clamp(crit.x + Math.cos(a) * (CRIT_R + 90), 60, W - 60), y: clamp(crit.y + Math.sin(a) * (CRIT_R + 90), top + 50, H - 40) };
      }
      // Stand off at range, on the side of you with fewest pellets (he wants the bloom on you).
      let best: Pt | null = null;
      let bs = -Infinity;
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const x = clamp(player.x + Math.cos(a) * 260, 60, W - 60), y = clamp(player.y + Math.sin(a) * 220, top + 50, H - 40);
        const crowd = pellets.reduce((m, p) => m + (dist(p.x, p.y, x, y) < 120 ? 1 : 0), 0) + neutrons.reduce((m, n) => m + (dist(n.x, n.y, x, y) < 90 ? 1 : 0), 0);
        const s = -crowd * 40 - dist(x, y, npc.x, npc.y) * 0.2;
        if (s > bs) { bs = s; best = { x, y }; }
      }
      return best;
    },

    drawGround(g, time) {
      // Pellets: lead-jacketed fuel slugs, their tips glowing.
      for (const p of pellets) {
        const k = clamp((time - p.bornAt) / 600, 0, 1);
        g.fillStyle(0x000000, 0.3 * k); g.fillEllipse(p.x, p.y + 6, 20, 6);
        g.fillStyle(LEAD_DARK, k); g.fillRoundedRect(p.x - 6, p.y - 9, 12, 16, 4);
        g.fillStyle(LEAD, k); g.fillRect(p.x - 4, p.y - 8, 3, 13);
        g.fillStyle(GLOW, (0.7 + Math.sin(time / 160 + p.x) * 0.2) * k); g.fillEllipse(p.x, p.y - 8, 10, 5);
        glow(g, p.x, p.y - 6, 16, GLOW, 0.04 * k, 2);
      }
      // Uran's aim.
      if (aimAt && alive(npc)) {
        const k = clamp((time - aimSince) / 520, 0, 1);
        g.lineStyle(1.5, CHEREN_LIT, 0.2 + k * 0.6);
        const dx = aimAt.x - npc.x, dy = aimAt.y - npc.y, len = Math.hypot(dx, dy) || 1;
        for (let d = 30; d < len; d += 18) g.lineBetween(npc.x + (dx / len) * d, npc.y + (dy / len) * d, npc.x + (dx / len) * (d + 8), npc.y + (dy / len) * (d + 8));
        g.lineStyle(2, CHEREN, 0.5 + k * 0.4); g.strokeCircle(aimAt.x, aimAt.y, 18 - k * 6);
      }
      // The critical core's danger ring.
      if (crit) {
        const k = clamp((time - crit.at) / CRIT_WARN, 0, 1);
        g.fillStyle(GLOW, 0.08 + k * 0.14); g.fillCircle(crit.x, crit.y, CRIT_R);
        g.lineStyle(3, GLOW_LIT, 0.4 + k * 0.5); g.strokeCircle(crit.x, crit.y, CRIT_R);
        g.lineStyle(2, AMBER, 0.6);
        g.beginPath(); g.arc(crit.x, crit.y, CRIT_R + 8, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
      }
      if (time - blastAt < 700) {
        const k = (time - blastAt) / 700;
        g.fillStyle(GLOW_LIT, 0.5 * (1 - k)); g.fillCircle(blastPt.x, blastPt.y, CRIT_R * (0.5 + k * 0.7));
        g.lineStyle(6 * (1 - k), 0xffffff, 1 - k); g.strokeCircle(blastPt.x, blastPt.y, CRIT_R * (0.6 + k * 0.8));
      }
    },

    drawAir(g, time) {
      for (const n of neutrons) {
        const sp = Math.hypot(n.vx, n.vy) || 1;
        g.lineStyle(2, CHEREN, 0.45); g.lineBetween(n.x, n.y, n.x - (n.vx / sp) * 16, n.y - (n.vy / sp) * 16);
        g.fillStyle(CHEREN, 0.35); g.fillCircle(n.x, n.y, N_R + 3);
        g.fillStyle(CHEREN_LIT, 1); g.fillCircle(n.x, n.y, N_R - 1);
      }
      for (const s of splits) {
        const k = (time - s.at) / 400;
        g.lineStyle(2, GLOW_LIT, 1 - k); g.strokeCircle(s.x, s.y, 8 + k * 26);
        for (let i = 0; i < 6; i++) { const a = i * 1.05; g.fillStyle(GLOW, 1 - k); g.fillCircle(s.x + Math.cos(a) * k * 22, s.y + Math.sin(a) * k * 22, 2); }
      }
      if (crit) {
        const k = clamp((time - crit.at) / CRIT_WARN, 0, 1);
        core(g, crit.x, crit.y, 8 + k * 18, k > 0.7 ? GLOW_LIT : GLOW, 0.6 + k * 0.4);
      }
    },

    drawHud(g, time) {
      // The pile's neutron count, a bar of sparks filling toward critical.
      const x = W / 2 - 110, y = top + 8;
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x - 6, y - 4, 232, 22, 8);
      for (let i = 0; i < CRIT; i++) {
        const on = i < neutrons.length;
        const cx = x + 10 + i * (200 / CRIT);
        g.fillStyle(on ? (neutrons.length >= CRIT - 2 ? GLOW_LIT : CHEREN_LIT) : LEAD_LIT, on ? 1 : 0.25);
        g.fillCircle(cx, y + 7, on ? 5 : 3);
      }
      g.fillStyle(crit ? AMBER_LIT : AMBER, crit ? 0.6 + Math.sin(time / 60) * 0.4 : 0.8);
      g.fillTriangle(x + 214, y, x + 224, y + 7, x + 214, y + 14);
      g.fillStyle(HAZARD_BLACK, 1); g.fillCircle(x + 217, y + 7, 1.5);
    },
  };
}

export const CHAIN_REACTION: GimmickDef = {
  id: 'halflife-chain-reaction',
  rules: 'Neutrons bounce round the yard; one that strikes a fuel pellet splits it into two more. Too many loose at once and their centre goes critical and blows.',
  make,
};
