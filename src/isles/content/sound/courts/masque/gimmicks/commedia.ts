import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { dim, type G } from '../../../../../art/IsleArt';
import { mask } from '../art';
import {
  GILT, GILT_DARK, HARLE_GREEN, HARLE_RED, HARLE_YELLOW, OAK, OAK_DARK, PORCELAIN, SILK_WHITE, TEAR, VELVET, VELVET_DARK,
  VELVET_LIT,
} from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Commedia — Harlequin Patch.
 *
 * A little stage stands at the back of the floor, and the stock characters of the commedia take
 * turns on it. Whoever is on changes the rule until they go off:
 *
 * • **Pierrot** weeps, and everyone weeps with him — both fighters slowed, tears running.
 * • **Harlequin** cracks his slapstick on the beat: CRACK — the two fighters swap places, and the
 *   stick comes down on the strip of floor in front of the stage. Stand in that strip when the
 *   crack comes, and it is your foe who lands there under the stick.
 * • **Columbine** throws hearts out over the floor. A heart's shadow shows where it will land;
 *   whoever is standing there when it comes down catches it and is healed.
 *
 * Don't like the act? Boo it off. Strike the character on stage and they tumble off into the
 * wings, and the next one comes on at once. Patch will do the same if the act suits you.
 */

type Act = 'pierrot' | 'harlequin' | 'columbine';
const ACTS: Act[] = ['pierrot', 'harlequin', 'columbine'];
const ACT_MS = 7500;
const ENTER_MS = 1100;
const CRACK_EVERY = 2300;
const CRACK_WARN = 750;
const HEART_HEAL = 10;

interface Heart { x: number; y: number; fromX: number; at: number; landAt: number; done: boolean }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const STAGE = { x: W / 2 - 170, y: top, w: 340, h: 92 };
  const SLAP = { x: STAGE.x + 10, y: STAGE.y + STAGE.h, w: STAGE.w - 20, h: 70 };
  const actorAt: Pt = { x: W / 2, y: STAGE.y + 70 };
  let act: Act = ACTS[Math.floor(rng() * 3)];
  let actAt = 0;
  let started = false;
  let target: StrikeTarget | null = null;
  let booedAt = -9999;
  let booedAct: Act = act;
  let nextCrack = 0;
  let crackAt = -9999;
  let nextHeart = 0;
  const hearts: Heart[] = [];
  const caught: { x: number; y: number; at: number }[] = [];

  const inSlap = (f: Fighter) => f.x > SLAP.x && f.x < SLAP.x + SLAP.w && f.y > SLAP.y - 10 && f.y < SLAP.y + SLAP.h;
  const onStage = (time: number) => time - actAt >= ENTER_MS;

  function begin(next: Act, time: number): void {
    act = next;
    actAt = time;
    nextCrack = time + ENTER_MS + CRACK_EVERY;
    nextHeart = time + ENTER_MS + 300;
    const names: Record<Act, string> = { pierrot: 'ENTER PIERROT — ALL WEEP', harlequin: 'ENTER HARLEQUIN — CRACK!', columbine: 'ENTER COLUMBINE — CATCH A HEART' };
    ctx.banner(names[next], next === 'pierrot' ? '#9ad4ff' : next === 'harlequin' ? '#f0c838' : '#ff8ab4');
    ctx.sfx('holy-chord');
  }

  function nextAct(time: number): void {
    begin(ACTS[(ACTS.indexOf(act) + 1) % ACTS.length], time);
  }

  function boo(by: 'player' | 'npc'): void {
    const time = ctx.scene.time.now;
    if (!onStage(time)) return;
    booedAt = time;
    booedAct = act;
    ctx.float(actorAt.x, actorAt.y - 50, by === 'player' ? 'BOOED OFF!' : 'PATCH BOOS!', '#ffd24a');
    ctx.sfx('boing');
    nextAct(time);
  }

  function crack(time: number): void {
    crackAt = time;
    ctx.sfx('whip');
    if (alive(player) && alive(npc)) {
      const dx = npc.x - player.x, dy = npc.y - player.y;
      ctx.nudge(player, dx, dy);
      ctx.nudge(npc, -dx, -dy);
      ctx.flash(player.x, player.y, HARLE_YELLOW);
      ctx.flash(npc.x, npc.y, HARLE_YELLOW);
    }
    // The stick comes down in front of the stage — after the swap.
    ctx.tk.schedule(90, () => {
      if (alive(player) && inSlap(player)) { ctx.tk.hitPlayer(11, player.x, player.y); ctx.stun(player, 450); }
      if (alive(npc) && inSlap(npc)) { ctx.hit(npc, 11, npc.x, npc.y); ctx.stun(npc, 450); ctx.float(npc.x, npc.y - 46, 'SLAPSTICK!', '#f0c838'); }
    });
  }

  return {
    update(time, dtRaw) {
      stepDt(dtRaw);
      if (!started) {
        started = true;
        begin(act, time);
        target = ctx.target({ x: actorAt.x, y: actorAt.y - 10, r: 26, onStruck: (by) => boo(by) });
      }
      if (time - actAt > ACT_MS) nextAct(time);
      if (!onStage(time)) return;

      if (act === 'harlequin' && time >= nextCrack) {
        nextCrack = time + (ctx.hard ? 1900 : CRACK_EVERY);
        crack(time);
      }
      if (act === 'columbine' && time >= nextHeart) {
        nextHeart = time + (ctx.hard ? 1100 : 1300);
        const near = rng() < 0.5 ? player : npc;
        const x = clamp(near.x + (rng() - 0.5) * 260, 70, W - 70);
        const y = clamp(near.y + (rng() - 0.5) * 200, SLAP.y + 30, H - 50);
        hearts.push({ x, y, fromX: actorAt.x + (rng() - 0.5) * 60, at: time, landAt: time + 1200, done: false });
        ctx.sfx('whoosh');
      }
      for (const h of hearts) {
        if (h.done || time < h.landAt) continue;
        h.done = true;
        // Whoever is under it catches it; if both are, nobody does.
        const p = alive(player) && dist(player.x, player.y, h.x, h.y) < 36;
        const n = alive(npc) && dist(npc.x, npc.y, h.x, h.y) < 36;
        if (p !== n) {
          const f = p ? player : npc;
          ctx.heal(f, HEART_HEAL);
          caught.push({ x: h.x, y: h.y, at: time });
          ctx.sfx('heal');
        }
      }
      for (let i = hearts.length - 1; i >= 0; i--) if (hearts[i].done && time - hearts[i].landAt > 400) hearts.splice(i, 1);
      for (let i = caught.length - 1; i >= 0; i--) if (time - caught[i].at > 700) caught.splice(i, 1);
    },

    playerSpeedMult() { return act === 'pierrot' && onStage(ctx.scene.time.now) ? 0.62 : 1; },
    npcSpeedMult() { return act === 'pierrot' && onStage(ctx.scene.time.now) ? 0.62 : 1; },

    npcSeek() {
      const time = ctx.scene.time.now;
      if (!onStage(time)) return null;
      if (act === 'columbine') {
        let best: Heart | null = null;
        for (const h of hearts) if (!h.done && (!best || dist(h.x, h.y, npc.x, npc.y) < dist(best.x, best.y, npc.x, npc.y))) best = h;
        return best ? { x: best.x, y: best.y } : null;
      }
      if (act === 'harlequin') {
        // Into the slap strip just before the crack, so YOU land in it; out of it if you are there.
        if (inSlap(player)) return { x: clamp(player.x, 80, W - 80), y: SLAP.y + SLAP.h + 120 };
        if (nextCrack - time < 1100) return { x: clamp(npc.x, SLAP.x + 30, SLAP.x + SLAP.w - 30), y: SLAP.y + SLAP.h / 2 };
        return null;
      }
      // Pierrot suits nobody: boo him off when near enough.
      return { x: actorAt.x + (npc.x < actorAt.x ? -60 : 60), y: SLAP.y + SLAP.h + 30 };
    },

    drawGround(g, time) {
      // The slap strip, painted like the boards' edge.
      const cracking = act === 'harlequin' && onStage(time);
      const k = cracking ? clamp(1 - (nextCrack - time) / CRACK_WARN, 0, 1) : 0;
      g.fillStyle(HARLE_YELLOW, cracking ? 0.08 + k * 0.25 : 0.04); g.fillRect(SLAP.x, SLAP.y, SLAP.w, SLAP.h);
      for (let x = SLAP.x; x < SLAP.x + SLAP.w; x += 24) {
        const c = [HARLE_RED, HARLE_GREEN, HARLE_YELLOW][Math.floor((x - SLAP.x) / 24) % 3];
        g.fillStyle(c, cracking ? 0.35 + k * 0.4 : 0.15);
        g.fillTriangle(x, SLAP.y + SLAP.h, x + 12, SLAP.y + SLAP.h - 10, x + 24, SLAP.y + SLAP.h);
      }
      if (time - crackAt < 300) { g.fillStyle(0xffffff, 0.5 * (1 - (time - crackAt) / 300)); g.fillRect(SLAP.x, SLAP.y, SLAP.w, SLAP.h); }
      // Tears on the floor under Pierrot.
      if (act === 'pierrot' && onStage(time)) {
        for (const f of [player, npc]) if (alive(f)) { g.fillStyle(TEAR, 0.18); g.fillEllipse(f.x, f.y + 4, 46, 14); }
      }
      // Heart shadows, swelling as they fall.
      for (const h of hearts) {
        if (h.done) continue;
        const kk = clamp((time - h.at) / (h.landAt - h.at), 0, 1);
        g.fillStyle(VELVET, 0.15 + kk * 0.25); g.fillEllipse(h.x, h.y, 20 + kk * 30, 8 + kk * 12);
        g.lineStyle(1.5, VELVET_LIT, 0.5 + kk * 0.4); g.strokeEllipse(h.x, h.y, 72, 26);
      }
    },

    drawAir(g, time) {
      // The stage itself, across the back.
      g.fillStyle(OAK_DARK, 1); g.fillRect(STAGE.x - 6, STAGE.y + STAGE.h - 14, STAGE.w + 12, 16);
      g.fillStyle(OAK, 1); g.fillRect(STAGE.x - 6, STAGE.y + STAGE.h - 18, STAGE.w + 12, 6);
      for (let i = 0; i < 9; i++) {
        const fx = STAGE.x + 20 + i * ((STAGE.w - 40) / 8);
        g.fillStyle(0x8a8a8a, 1); g.fillTriangle(fx - 5, STAGE.y + STAGE.h - 16, fx + 5, STAGE.y + STAGE.h - 16, fx, STAGE.y + STAGE.h - 23);
        g.fillStyle(0xffd890, 0.9); g.fillCircle(fx, STAGE.y + STAGE.h - 21, 2);
      }
      for (const k of [-1, 1]) {
        const cx = k < 0 ? STAGE.x : STAGE.x + STAGE.w;
        g.fillStyle(GILT_DARK, 1); g.fillRect(cx - 7, STAGE.y, 14, STAGE.h);
        g.fillStyle(GILT, 1); g.fillRect(cx - 4, STAGE.y, 8, STAGE.h);
        g.fillStyle(VELVET_DARK, 1); g.fillRect(k < 0 ? cx + 7 : cx - 57, STAGE.y, 50, STAGE.h - 18);
        for (let f = 0; f < 5; f++) { g.fillStyle(f % 2 ? VELVET : VELVET_LIT, 0.8); g.fillRect((k < 0 ? cx + 7 : cx - 57) + f * 10, STAGE.y, 4, STAGE.h - 18); }
      }
      // The actor: enters from the wings, plays, or tumbles off if booed.
      const enterK = clamp((time - actAt) / ENTER_MS, 0, 1);
      const ax = actorAt.x + (1 - enterK) * (STAGE.w / 2 - 40), ay = actorAt.y;
      drawActor(g, ax, ay, act, time, nextCrack);
      if (time - booedAt < 700) {
        const kk = (time - booedAt) / 700;
        drawActor(g, actorAt.x - kk * 180, actorAt.y - Math.sin(kk * Math.PI) * 40, booedAct, time, 0, kk * 6);
      }
      // Hearts in flight.
      for (const h of hearts) {
        if (h.done) continue;
        const kk = clamp((time - h.at) / (h.landAt - h.at), 0, 1);
        const x = h.fromX + (h.x - h.fromX) * kk, y = actorAt.y + (h.y - actorAt.y) * kk - Math.sin(kk * Math.PI) * 120;
        heart(g, x, y, 9, VELVET_LIT);
      }
      for (const c of caught) { const kk = (time - c.at) / 700; heart(g, c.x, c.y - 30 - kk * 30, 9 + kk * 8, 0xffb0c8, 1 - kk); }
      // Tears running down both faces under Pierrot.
      if (act === 'pierrot' && onStage(time)) {
        for (const f of [player, npc]) {
          if (!alive(f)) continue;
          const ph = (time / 500) % 1;
          g.fillStyle(TEAR, 0.9 * (1 - ph)); g.fillCircle(f.x - 7, f.y - 34 + ph * 18, 2.2); g.fillCircle(f.x + 7, f.y - 30 + ((ph + 0.5) % 1) * 18, 2.2);
        }
      }
    },

    destroy() { target?.remove(); },
  };
}

/** A stage heart. */
function heart(g: G, x: number, y: number, r: number, c: number, a = 1): void {
  g.fillStyle(c, a);
  g.fillCircle(x - r * 0.5, y - r * 0.2, r * 0.6);
  g.fillCircle(x + r * 0.5, y - r * 0.2, r * 0.6);
  g.fillTriangle(x - r * 1.08, y, x + r * 1.08, y, x, y + r * 1.1);
  g.fillStyle(0xffffff, a * 0.5); g.fillCircle(x - r * 0.55, y - r * 0.35, r * 0.2);
}

/** One of the stock characters on the boards. */
function drawActor(g: G, x: number, y: number, act: Act, time: number, nextCrack: number, spin = 0): void {
  const bob = Math.sin(time / 180) * 2;
  g.fillStyle(0x000000, 0.25); g.fillEllipse(x, y + 2, 34, 8);
  const lean = Math.sin(spin) * 10;
  if (act === 'pierrot') {
    // White smock with big black buttons, a ruff, a white face and a painted tear.
    g.fillStyle(SILK_WHITE, 1); g.fillTriangle(x - 16 + lean, y, x + 16 + lean, y, x + lean, y - 36);
    g.fillStyle(0xdedede, 1); g.fillRect(x - 10 + lean, y - 36, 20, 20);
    for (let i = 0; i < 3; i++) { g.fillStyle(0x101010, 1); g.fillCircle(x + lean, y - 30 + i * 9, 2.2); }
    g.fillStyle(SILK_WHITE, 1); g.fillEllipse(x + lean, y - 38, 30, 8);
    mask(g, x + lean, y - 48 + bob, 0.42, 'tragedy', PORCELAIN, 0x101010);
    g.fillStyle(0x101010, 1); g.fillEllipse(x + lean, y - 58 + bob, 16, 6);
  } else if (act === 'harlequin') {
    // Motley diamonds, a black half-mask, and the slapstick — raised before each crack.
    const cs = [HARLE_RED, HARLE_GREEN, HARLE_YELLOW];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 3; c++) {
        const dx = x - 10 + c * 10 + lean, dy = y - 6 - r * 9;
        g.fillStyle(cs[(r + c) % 3], 1);
        g.fillTriangle(dx - 5, dy, dx, dy - 5, dx + 5, dy); g.fillTriangle(dx - 5, dy, dx, dy + 5, dx + 5, dy);
      }
    }
    mask(g, x + lean, y - 48 + bob, 0.42, 'harlequin');
    g.fillStyle(0x101010, 1); g.fillEllipse(x + lean, y - 58 + bob, 18, 7);
    const raise = nextCrack > 0 ? clamp(1 - (nextCrack - time) / CRACK_WARN, 0, 1) : 0;
    const sa = -0.4 - raise * 1.6;
    g.lineStyle(4, dim(OAK, 0.1), 1);
    g.lineBetween(x + 12 + lean, y - 30, x + 12 + lean + Math.cos(sa) * 40, y - 30 + Math.sin(sa) * 40);
    g.lineStyle(2, HARLE_YELLOW, 1);
    g.lineBetween(x + 12 + lean + Math.cos(sa) * 20, y - 30 + Math.sin(sa) * 20, x + 12 + lean + Math.cos(sa) * 40, y - 30 + Math.sin(sa) * 40);
  } else {
    // Columbine: a full skirt of rose silk, an apron, a feathered half-mask and a basket of hearts.
    g.fillStyle(VELVET_LIT, 1); g.fillTriangle(x - 18 + lean, y, x + 18 + lean, y, x + lean, y - 34);
    g.fillStyle(SILK_WHITE, 0.9); g.fillTriangle(x - 8 + lean, y - 2, x + 8 + lean, y - 2, x + lean, y - 26);
    g.fillStyle(VELVET, 1); g.fillRect(x - 7 + lean, y - 40, 14, 12);
    mask(g, x + lean, y - 48 + bob, 0.42, 'colombina', PORCELAIN, GILT);
    g.fillStyle(OAK, 1); g.fillEllipse(x + 18 + lean, y - 22, 16, 8);
    heart(g, x + 16 + lean, y - 27, 4, VELVET); heart(g, x + 21 + lean, y - 26, 4, VELVET_LIT);
  }
}

export const COMMEDIA: GimmickDef = {
  id: 'masque-commedia',
  rules: 'Stock characters take the stage: Pierrot (all slowed), Harlequin (crack: fighters swap, the stick lands before the stage), Columbine (catch hearts to heal). Strike the actor to boo the act off.',
  make,
};
