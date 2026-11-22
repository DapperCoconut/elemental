import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, glow, mixC } from '../../../../../art/IsleArt';
import { stretchPost } from '../art';
import { CREPE, LATEX_LIT, TOY_BLUE, TOY_RED, TOY_YELLOW } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Rubber Band — Slinger Elastica.
 *
 * Elastica loops one of the Stretching Walk's great bands round both of you. Close together it
 * hangs slack; past its length it pulls you both together, harder the further it stretches.
 * Keep it stretched and it builds *tension* (the meter at the top); full, it creaks white for a
 * moment and then *snaps* — and whoever is not holding on is flung bodily down it into the
 * other in a slam.
 *
 * Holding on means standing at one of the three iron posts. The one at a post when the band goes
 * is the anchor and barely feels it; the other one is the slingshot. Both at posts, or neither,
 * and you meet in the middle and both hurt. Elastica fights from the posts and backs away to
 * stretch the band — so take a post of your own, and let her do the stretching. Now and then
 * she takes up the slack, and the band's length shrinks for a few seconds.
 */

const REST = 230;
const REST_SHORT = 150;
const TENSE_FROM = 320;
const POST_HOLD = 64;
const MAX_PULL = 150;
const CREAK_MS = 750;
const FLING_MS = 320;

interface Fling { f: Fighter; fx: number; fy: number; tx: number; ty: number; start: number; anchor: Fighter | null }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  const posts: Pt[] = [{ x: 210, y: top + 150 }, { x: W - 210, y: top + 150 }, { x: W / 2, y: H - 80 }];
  let tension = 0;
  let creakAt = -1;
  let flings: Fling[] = [];
  let graceUntil = 0;
  let slackUntil = 0;
  let nextSlack = 0;
  let snapFx = -9999;
  let snapAt: Pt = { x: 0, y: 0 };
  let started = false;
  const slackEvery = ctx.hard ? 7400 : 9000;

  const restLen = (time: number) => (time < slackUntil ? REST_SHORT : REST);
  const postOf = (f: Fighter): Pt | null => {
    let best: Pt | null = null;
    let bd = POST_HOLD;
    for (const p of posts) { const d = dist(f.x, f.y, p.x, p.y); if (d < bd) { bd = d; best = p; } }
    return best;
  };

  function snap(time: number): void {
    const pp = postOf(player), np = postOf(npc);
    snapAt = { x: (player.x + npc.x) / 2, y: (player.y + npc.y) / 2 };
    snapFx = time;
    tension = 0;
    creakAt = -1;
    graceUntil = time + 2200;
    ctx.sfx('snap-back');
    if (pp && !np) flings = [{ f: npc, fx: npc.x, fy: npc.y, tx: 0, ty: 0, start: time, anchor: player }];
    else if (np && !pp) flings = [{ f: player, fx: player.x, fy: player.y, tx: 0, ty: 0, start: time, anchor: npc }];
    else flings = [player, npc].map((f) => ({ f, fx: f.x, fy: f.y, tx: 0, ty: 0, start: time, anchor: null }));
    for (const fl of flings) {
      const to = fl.anchor ? { x: fl.anchor.x, y: fl.anchor.y } : snapAt;
      const a = Math.atan2(to.y - fl.fy, to.x - fl.fx);
      const stop = fl.anchor ? 44 : 26;
      fl.tx = to.x - Math.cos(a) * stop; fl.ty = to.y - Math.sin(a) * stop;
    }
    ctx.banner(flings.length === 1 ? (flings[0].f === player ? 'SNAP! YOU\'RE THE SLINGSHOT' : 'SNAP! ELASTICA IS FLUNG') : 'SNAP!', '#ffe2a8');
  }

  function slam(fl: Fling): void {
    const f = fl.f;
    if (!alive(f)) return;
    if (fl.anchor) {
      ctx.hit(f, ctx.hard ? 20 : 16, f.x, f.y);
      ctx.stun(f, 700);
      ctx.float(f.x, f.y - 46, 'SLAM!', '#ffb070');
      if (alive(fl.anchor)) ctx.hit(fl.anchor, 4, fl.anchor.x, fl.anchor.y);
    } else {
      ctx.hit(f, ctx.hard ? 11 : 9, f.x, f.y);
      const o = f === player ? npc : player;
      const a = Math.atan2(f.y - o.y, f.x - o.x);
      ctx.nudge(f, Math.cos(a) * 70, Math.sin(a) * 70);
    }
    ctx.flash(f.x, f.y, TOY_RED);
    ctx.sfx('stone-slam');
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextSlack = time + slackEvery; graceUntil = time + 1500; }
      if (!alive(player) || !alive(npc)) return;

      // Flung fighters fly down the band.
      if (flings.length) {
        for (const fl of flings) {
          const k = clamp((time - fl.start) / FLING_MS, 0, 1);
          const e = k * k;
          ctx.nudge(fl.f, fl.fx + (fl.tx - fl.fx) * e - fl.f.x, fl.fy + (fl.ty - fl.fy) * e - fl.f.y);
          ctx.root(fl.f, 80);
        }
        if (time - flings[0].start >= FLING_MS) { for (const fl of flings) slam(fl); flings = []; }
        return;
      }

      // Elastica takes up the slack.
      if (time >= nextSlack) {
        nextSlack = time + slackEvery;
        slackUntil = time + 3200;
        ctx.banner('ELASTICA TAKES UP THE SLACK', '#ffd0a0');
        ctx.sfx('whip');
      }

      const d = dist(player.x, player.y, npc.x, npc.y);
      const rest = restLen(time);
      if (d > rest) {
        const pull = Math.min(MAX_PULL, (d - rest) * 1.05) * dt;
        const a = Math.atan2(npc.y - player.y, npc.x - player.x);
        // An anchored fighter holds; the pull all goes to the other.
        const pa = postOf(player) ? 0.25 : 1, na = postOf(npc) ? 0.25 : 1;
        ctx.nudge(player, Math.cos(a) * pull * pa, Math.sin(a) * pull * pa);
        ctx.nudge(npc, -Math.cos(a) * pull * na, -Math.sin(a) * pull * na);
      }
      if (creakAt >= 0) {
        if (time - creakAt >= CREAK_MS) snap(time);
        return;
      }
      if (time < graceUntil) { tension = Math.max(0, tension - dt * 0.5); return; }
      if (d > TENSE_FROM) tension += ((d - TENSE_FROM) / 160) * (ctx.hard ? 0.55 : 0.45) * dt + 0.06 * dt;
      else tension -= 0.22 * dt;
      tension = clamp(tension, 0, 1);
      if (tension >= 1) {
        creakAt = time;
        ctx.float((player.x + npc.x) / 2, (player.y + npc.y) / 2 - 20, 'CREAK…', '#ffffff');
        ctx.sfx('countdown-tick');
      }
    },

    npcSeek() {
      // She fights from the post farthest from you, and stays on it once the band creaks.
      let best = posts[0];
      let bs = -1;
      for (const p of posts) { const s = dist(p.x, p.y, player.x, player.y); if (s > bs) { bs = s; best = p; } }
      if (creakAt >= 0) { const mine = postOf(npc); if (mine) return mine; }
      return { x: best.x + (npc.x < best.x ? -8 : 8), y: best.y + 10 };
    },

    drawGround(g, time) {
      for (const p of posts) {
        const held = (postOf(player) === p) || (postOf(npc) === p);
        g.fillStyle(0x000000, 0.25); g.fillCircle(p.x, p.y, POST_HOLD);
        g.lineStyle(2, held ? TOY_YELLOW : 0x6a6a74, held ? 0.8 : 0.4); g.strokeCircle(p.x, p.y, POST_HOLD);
        // Chalked grip marks round the foot of the post.
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + time / 4000;
          g.fillStyle(LATEX_LIT, 0.3); g.fillRect(p.x + Math.cos(a) * (POST_HOLD - 8) - 2, p.y + Math.sin(a) * (POST_HOLD - 8) - 1, 4, 2);
        }
      }
      // The band's shadow on the floor.
      if (alive(player) && alive(npc)) {
        g.lineStyle(6, 0x000000, 0.25); g.lineBetween(player.x, player.y + 14, npc.x, npc.y + 14);
      }
    },

    drawAir(g, time) {
      for (const p of posts) stretchPost(g, p.x, p.y + 20);
      if (!alive(player) || !alive(npc)) return;
      // The band: round both waists, thick and amber when slack, thin and white near snapping.
      const d = dist(player.x, player.y, npc.x, npc.y);
      const stretch = clamp((d - restLen(time)) / 300, 0, 1);
      const creak = creakAt >= 0 ? (time - creakAt) / CREAK_MS : 0;
      const shake = creak > 0 ? Math.sin(time / 18) * 4 * creak : 0;
      const ax = player.x, ay = player.y - 8, bx = npc.x, by = npc.y - 8;
      const mx = (ax + bx) / 2 + shake, my = (ay + by) / 2 + (1 - stretch) * 26 + shake;
      const w = Math.max(2.5, 9 - stretch * 6);
      const c = creak > 0 ? mixC(CREPE, 0xffffff, 0.5 + Math.sin(time / 40) * 0.5) : mixC(CREPE, TOY_RED, tension * 0.7);
      for (const [x1, y1, x2, y2] of [[ax, ay, mx, my], [mx, my, bx, by]] as [number, number, number, number][]) {
        g.lineStyle(w + 3, dim(c, 0.45), 1); g.lineBetween(x1, y1, x2, y2);
        g.lineStyle(w, c, 1); g.lineBetween(x1, y1, x2, y2);
        g.lineStyle(1, LATEX_LIT, 0.6); g.lineBetween(x1, y1 - w * 0.3, x2, y2 - w * 0.3);
      }
      // A loop round each waist.
      for (const f of [player, npc]) { g.lineStyle(w * 0.7, c, 1); g.strokeEllipse(f.x, f.y - 6, 40, 14); }
      if (creak > 0) glow(g, mx, my, 30, 0xffffff, 0.08, 3);
      // The snap: a whip-crack of light at the middle.
      const sk = (time - snapFx) / 450;
      if (sk >= 0 && sk < 1) {
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2;
          g.lineStyle(3 * (1 - sk), 0xffffff, 1 - sk);
          g.lineBetween(snapAt.x + Math.cos(a) * 10, snapAt.y + Math.sin(a) * 10, snapAt.x + Math.cos(a) * (20 + sk * 60), snapAt.y + Math.sin(a) * (20 + sk * 60));
        }
      }
      for (const fl of flings) {
        g.lineStyle(3, TOY_YELLOW, 0.6);
        g.lineBetween(fl.f.x, fl.f.y, fl.f.x - (fl.tx - fl.fx) * 0.25, fl.f.y - (fl.ty - fl.fy) * 0.25);
      }
    },

    drawHud(g, time) {
      const w = 220, x0 = W / 2 - w / 2, y = top + 10;
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x0 - 4, y - 4, w + 8, 16, 6);
      const c = creakAt >= 0 ? (Math.sin(time / 50) > 0 ? 0xffffff : TOY_RED) : mixC(TOY_YELLOW, TOY_RED, tension);
      g.fillStyle(c, 1); g.fillRoundedRect(x0, y, Math.max(4, w * tension), 8, 4);
      // Two little posts at the meter's ends, and who is holding one.
      for (const [f, x] of [[player, x0 - 16], [npc, x0 + w + 16]] as [Fighter, number][]) {
        g.fillStyle(postOf(f) ? TOY_YELLOW : 0x555560, 1); g.fillRect(x - 2, y - 4, 4, 16);
        g.fillStyle(f === player ? TOY_BLUE : TOY_RED, 1); g.fillCircle(x, y - 6, 3);
      }
    },
  };
}

export const RUBBER_BAND: GimmickDef = {
  id: 'bounce-rubber-band',
  rules: 'A band ties you together: stretched, it pulls and builds tension until it snaps. Whoever isn\'t holding a post is flung into the other.',
  make,
};
