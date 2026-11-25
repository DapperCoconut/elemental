import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { dim, glow, lit } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { soulWisp } from '../art';
import { BRASS, BRASS_DARK, BRASS_LIT, GLASS, GLASS_EDGE, IRON, IRON_LIT, SOUL, SOUL_DARK, SOUL_LIT } from '../palette';
import { alive, clamp, dist } from '../util';
import { THEM, wirePlate, YOU } from './common';

/**
 * Shaken Loose — Orabel Penhallow, Deathbed-Sitter.
 *
 * Orabel sits up with the dying, and when the moment comes she shakes the soul loose so the catchers
 * can have it in a lantern before it slips away into the dark. In her yard every third blow a
 * fighter takes shakes their soul half out of them: a pale double hangs where they were struck,
 * tied to them by a fraying silver cord. Until they walk back into it they are hollow — blows land
 * harder and their cooldowns drag.
 *
 * The loose soul does not wait. It drifts toward the nearest of four open catching-lanterns on
 * their posts, and if it gets there the little door shuts on it: its owner is silenced and stays
 * hollow until they strike that lantern open (twice), or until Orabel files it and the filing hurts.
 * The other fighter can strike a loose soul to bat it on toward a lantern.
 *
 * Orabel also rings her deathbed bell over you every few seconds — a ring that counts as a blow if
 * you are in it. Turn it round: shake her soul loose, bat it into a lantern, and stand between her
 * and the post while she tries to get it back. Past half she shakes souls loose at two blows.
 */

const POSTS: Pt[] = [{ x: 200, y: 230 }, { x: 760, y: 230 }, { x: 200, y: 560 }, { x: 760, y: 560 }];
const REJOIN = 30;
const BAT = 110;
const FILE_MS = 7000;
const BELL_EVERY = 6500;
const BELL_WARN = 950;
const BELL_R = 70;

type Side = 'player' | 'npc';
interface Soul { x: number; y: number; bornAt: number; target: StrikeTarget | null; batAt: number }
interface State { count: number; graceUntil: number; loose: Soul | null; caught: { post: number; at: number; cracks: number; hushAt: number } | null; selfHitAt: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  const st: Record<Side, State> = {
    player: { count: 0, graceUntil: 0, loose: null, caught: null, selfHitAt: -1e9 },
    npc: { count: 0, graceUntil: 0, loose: null, caught: null, selfHitAt: -1e9 },
  };
  const posts: { x: number; y: number; target: StrikeTarget; shutAt: number }[] = [];
  const fighter = (s: Side): Fighter => (s === 'player' ? player : npc);
  const other = (s: Side): Side => (s === 'player' ? 'npc' : 'player');
  let late = false;
  let bell: { x: number; y: number; at: number } | null = null;
  let nextBell = 0;
  let started = false;

  const need = () => (late ? 2 : 3);
  const nearestPost = (x: number, y: number): number => {
    let bi = 0;
    for (let i = 1; i < POSTS.length; i++) if (dist(x, y, POSTS[i].x, POSTS[i].y) < dist(x, y, POSTS[bi].x, POSTS[bi].y)) bi = i;
    return bi;
  };
  const occupied = (i: number) => st.player.caught?.post === i || st.npc.caught?.post === i;

  function hitSelf(s: Side, n: number): void {
    st[s].selfHitAt = ctx.scene.time.now;
    const f = fighter(s);
    ctx.hit(f, n, f.x, f.y);
  }

  function shakeLoose(s: Side): void {
    const f = fighter(s), o = fighter(other(s));
    const a = Math.atan2(f.y - o.y, f.x - o.x);
    const soul: Soul = { x: clamp(f.x + Math.cos(a) * 60, 50, W - 50), y: clamp(f.y + Math.sin(a) * 60, top + 40, H - 40), bornAt: ctx.scene.time.now, target: null, batAt: -1e9 };
    soul.target = ctx.target({
      x: soul.x, y: soul.y, r: 20, passThrough: true,
      onStruck: (by) => {
        if (by === s || st[s].loose !== soul) return;
        const p = POSTS[nearestPost(soul.x, soul.y)];
        const d = dist(soul.x, soul.y, p.x, p.y) || 1;
        const step = Math.min(BAT, d - 4);
        soul.x += (p.x - soul.x) / d * step;
        soul.y += (p.y - soul.y) / d * step;
        soul.batAt = ctx.scene.time.now;
        soul.target?.moveTo(soul.x, soul.y);
        ctx.sfx('whoosh');
      },
    });
    st[s].loose = soul;
    st[s].count = 0;
    ctx.sfx('wings');
  }

  function rejoin(s: Side): void {
    st[s].loose?.target?.remove();
    st[s].loose = null;
    st[s].caught = null;
    st[s].count = 0;
    st[s].graceUntil = ctx.scene.time.now + 1500;
    ctx.sfx('heal');
  }

  function counted(s: Side, amount: number): void {
    const now = ctx.scene.time.now;
    const S = st[s];
    if (amount < 4 || S.loose || S.caught || now < S.graceUntil || now - S.selfHitAt < 60) return;
    S.count++;
    if (S.count >= need()) shakeLoose(s);
  }

  POSTS.forEach((p, i) => {
    posts.push({
      x: p.x, y: p.y, shutAt: -1e9,
      target: ctx.target({
        x: p.x, y: p.y - 40, r: 18,
        onStruck: (by) => {
          const S = st[by];
          if (!S.caught || S.caught.post !== i) return;
          S.caught.cracks++;
          ctx.sfx(S.caught.cracks >= 2 ? 'ice-shatter' : 'crystal-chime');
          if (S.caught.cracks >= 2) rejoin(by);
        },
      }),
    });
  });

  return {
    update(time, dtRaw) {
      const dt = clamp(dtRaw, 0, 0.1);
      if (!started) { started = true; nextBell = time + 3500; }
      if (!late && alive(npc) && npc.hp <= npc.maxHp * 0.5) { late = true; ctx.banner('TWO BLOWS SHAKE A SOUL LOOSE', '#e4f5ff'); ctx.sfx('boss-phase'); }

      for (const s of ['player', 'npc'] as Side[]) {
        const S = st[s], f = fighter(s);
        if (S.loose) {
          const so = S.loose;
          if (time - so.bornAt > 400 && dist(f.x, f.y, so.x, so.y) < REJOIN) { rejoin(s); continue; }
          // Drifting to the nearest free catching-lantern.
          let pi = nearestPost(so.x, so.y);
          if (occupied(pi)) pi = POSTS.map((_, i) => i).filter((i) => !occupied(i)).sort((a, b) => dist(so.x, so.y, POSTS[a].x, POSTS[a].y) - dist(so.x, so.y, POSTS[b].x, POSTS[b].y))[0] ?? pi;
          const p = POSTS[pi];
          const d = dist(so.x, so.y, p.x, p.y - 40);
          const sp = late ? 74 : 60;
          if (d < 16) {
            S.loose.target?.remove();
            S.loose = null;
            S.caught = { post: pi, at: time, cracks: 0, hushAt: -1e9 };
            posts[pi].shutAt = time;
            ctx.sfx('trap-snap');
          } else {
            so.x += (p.x - so.x) / d * sp * dt;
            so.y += (p.y - 40 - so.y) / d * sp * dt;
            so.target?.moveTo(so.x, so.y);
          }
        }
        if (S.caught) {
          if (time - S.caught.hushAt >= 1000) { S.caught.hushAt = time; ctx.tk.silence(1100, f); }
          if (time - S.caught.at > FILE_MS) {
            hitSelf(s, 18);
            ctx.sfx('judgement');
            rejoin(s);
          }
        }
      }

      // Orabel's deathbed bell, rung over you.
      if (!bell && time >= nextBell && alive(player)) { bell = { x: player.x, y: player.y, at: time + BELL_WARN }; ctx.sfx('heartbeat'); }
      if (bell && time >= bell.at) {
        if (alive(player) && dist(player.x, player.y, bell.x, bell.y) < BELL_R + 18) {
          hitSelf('player', 8);
          st.player.selfHitAt = -1e9;
          counted('player', 8);
          st.player.selfHitAt = time;
        }
        ctx.sfx('sonic-pulse');
        bell = null;
        nextBell = time + (late ? 5200 : BELL_EVERY);
      }
    },

    onPlayerHurt(n) { counted('player', n); },
    onNpcHurt(n) { counted('npc', n); },
    playerTakenMult() { return st.player.loose || st.player.caught ? 1.35 : 1; },
    npcTakenMult() { return st.npc.loose || st.npc.caught ? 1.35 : 1; },
    playerCooldownRate() { return st.player.loose || st.player.caught ? 0.6 : 1; },
    npcCooldownRate() { return st.npc.loose || st.npc.caught ? 0.6 : 1; },

    npcSeek() {
      const N = st.npc, P = st.player;
      if (N.loose) return { x: N.loose.x, y: N.loose.y };
      if (N.caught) { const p = POSTS[N.caught.post]; return { x: p.x + (npc.x < p.x ? -40 : 40), y: p.y + 10 }; }
      if (bell && dist(npc.x, npc.y, bell.x, bell.y) < BELL_R + 30) {
        const a = Math.atan2(npc.y - bell.y, npc.x - bell.x);
        return { x: clamp(bell.x + Math.cos(a) * 130, 60, W - 60), y: clamp(bell.y + Math.sin(a) * 130, top + 40, H - 40) };
      }
      if (P.loose) {
        // Stand between the stranger and their soul — near enough to bat it on.
        const so = P.loose;
        const d = dist(player.x, player.y, so.x, so.y) || 1;
        return { x: clamp(so.x + (player.x - so.x) / d * 44, 60, W - 60), y: clamp(so.y + (player.y - so.y) / d * 44, top + 40, H - 40) };
      }
      if (P.caught) { const p = POSTS[P.caught.post]; return { x: clamp((p.x + player.x) / 2, 60, W - 60), y: clamp((p.y + player.y) / 2, top + 40, H - 40) }; }
      const a = Math.atan2(npc.y - player.y, npc.x - player.x);
      return { x: clamp(player.x + Math.cos(a) * 190, 60, W - 60), y: clamp(player.y + Math.sin(a) * 170, top + 40, H - 40) };
    },

    drawGround(g, time) {
      // The bell's ring: a bronze circle tightening onto where it was rung.
      if (bell) {
        const k = clamp(1 - (bell.at - time) / BELL_WARN, 0, 1);
        g.fillStyle(SOUL_DARK, 0.08 + k * 0.14); g.fillCircle(bell.x, bell.y, BELL_R);
        g.lineStyle(2.5, BRASS, 0.5 + k * 0.5); g.strokeCircle(bell.x, bell.y, BELL_R);
        g.lineStyle(1.5, SOUL_LIT, 0.7); g.strokeCircle(bell.x, bell.y, BELL_R * (1.6 - k * 0.6));
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          g.lineBetween(bell.x + Math.cos(a) * (BELL_R - 6), bell.y + Math.sin(a) * (BELL_R - 6), bell.x + Math.cos(a) * (BELL_R + 4), bell.y + Math.sin(a) * (BELL_R + 4));
        }
      }
      // Post footings, and a hollow fighter's fraying cord to their soul.
      for (const p of POSTS) { g.fillStyle(0x000000, 0.25); g.fillEllipse(p.x, p.y + 2, 28, 9); g.fillStyle(IRON, 0.8); g.fillEllipse(p.x, p.y, 18, 6); }
      for (const s of ['player', 'npc'] as Side[]) {
        const so = st[s].loose, f = fighter(s);
        if (!so) continue;
        const col = s === 'player' ? YOU : THEM;
        const n = 12;
        for (let i = 0; i < n; i++) {
          const k0 = i / n, k1 = (i + 0.6) / n;
          const wob = Math.sin(time / 120 + i * 1.3) * 5 * Math.sin(k0 * Math.PI);
          g.lineStyle(1.4, i % 3 === 1 ? col : SOUL_LIT, 0.55);
          g.lineBetween(f.x + (so.x - f.x) * k0 + wob, f.y - 14 + (so.y - f.y + 14) * k0, f.x + (so.x - f.x) * k1 + wob, f.y - 14 + (so.y - f.y + 14) * k1);
        }
      }
    },

    drawAir(g, time) {
      const t = time / 1000;
      // The catching-lanterns: tall iron posts, a glass lantern with its little door.
      POSTS.forEach((p, i) => {
        const owner: Side | null = st.player.caught?.post === i ? 'player' : st.npc.caught?.post === i ? 'npc' : null;
        g.fillStyle(IRON, 1); g.fillRect(p.x - 3, p.y - 70, 6, 70);
        g.fillStyle(IRON_LIT, 0.7); g.fillRect(p.x - 2, p.y - 70, 1.3, 70);
        g.lineStyle(3, IRON, 1); g.lineBetween(p.x, p.y - 70, p.x + 14, p.y - 74); g.lineBetween(p.x + 14, p.y - 74, p.x + 14, p.y - 66);
        const lx = p.x + 14, ly = p.y - 66;
        if (owner) glow(g, lx, ly + 20, 34, owner === 'player' ? YOU : THEM, 0.08, 3);
        g.fillStyle(BRASS_DARK, 1); g.fillTriangle(lx - 15, ly + 4, lx + 15, ly + 4, lx, ly - 8);
        g.fillStyle(owner ? SOUL_DARK : dim(GLASS, 0.15), owner ? 0.7 : 0.45); g.fillRect(lx - 13, ly + 4, 26, 34);
        if (owner) {
          soulWisp(g, lx, ly + 22, 7, t, owner === 'player' ? lit(YOU, 0.3) : lit(THEM, 0.3), 0.9, true, Math.sin(t * 3));
          const c = st[owner].caught;
          if (c) {
            // Cracks from strikes, and Orabel's filing clock round the cap.
            g.lineStyle(1, 0xffffff, 0.9);
            if (c.cracks >= 1) { g.lineBetween(lx - 8, ly + 8, lx + 2, ly + 22); g.lineBetween(lx + 2, ly + 22, lx - 4, ly + 34); g.lineBetween(lx + 2, ly + 22, lx + 10, ly + 28); }
            const k = clamp((time - c.at) / FILE_MS, 0, 1);
            g.lineStyle(2.5, k > 0.75 ? 0xff7050 : BRASS_LIT, 0.9);
            g.beginPath(); g.arc(lx, ly + 21, 24, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
          }
        }
        g.fillStyle(GLASS, 0.2); g.fillRect(lx - 13, ly + 4, 26, 34);
        g.lineStyle(1.6, BRASS_DARK, 1); g.strokeRect(lx - 13, ly + 4, 26, 34);
        // The door: open on its hinge, or shut and latched.
        const shut = !!owner;
        const sk = clamp((time - posts[i].shutAt) / 160, 0, 1);
        const ang = shut ? (1 - sk) * 1.2 : 1.2;
        g.lineStyle(2, BRASS, 1);
        g.lineBetween(lx + 13, ly + 6, lx + 13 - Math.cos(ang) * 22, ly + 6 + 0);
        g.lineBetween(lx + 13, ly + 36, lx + 13 - Math.cos(ang) * 22, ly + 36);
        g.lineStyle(1, GLASS_EDGE, 0.8); g.lineBetween(lx + 13 - Math.cos(ang) * 22, ly + 6, lx + 13 - Math.cos(ang) * 22, ly + 36);
        if (shut) { g.fillStyle(BRASS_LIT, 1); g.fillRect(lx - 15, ly + 19, 5, 5); }
        g.fillStyle(BRASS, 1); g.fillRect(lx - 15, ly + 38, 30, 4);
      });
      // Loose souls: a pale double of the fighter, hands out, drifting for the lanterns.
      for (const s of ['player', 'npc'] as Side[]) {
        const so = st[s].loose;
        if (!so) continue;
        const col = s === 'player' ? YOU : THEM;
        const bob = Math.sin(t * 4 + so.x) * 3;
        const x = so.x, y = so.y - 16 + bob;
        glow(g, x, y, 34, SOUL, 0.06, 3);
        g.fillStyle(SOUL_LIT, 0.38);
        g.fillTriangle(x - 13, y + 18, x + 13, y + 18, x, y - 6);
        for (let i = 0; i < 3; i++) g.fillCircle(x - 9 + i * 9, y + 18 + Math.sin(t * 8 + i) * 2, 4.5);
        g.fillStyle(SOUL_LIT, 0.55); g.fillCircle(x, y - 10, 9);
        g.lineStyle(2, SOUL_LIT, 0.5); g.lineBetween(x - 9, y + 2, x - 20, y - 6 + bob); g.lineBetween(x + 9, y + 2, x + 20, y - 6 - bob);
        g.fillStyle(SOUL_DARK, 0.85); g.fillEllipse(x - 3.2, y - 11, 2.6, 4); g.fillEllipse(x + 3.2, y - 11, 2.6, 4);
        g.lineStyle(1.6, col, 0.8); g.strokeCircle(x, y - 10, 11);
        if (time - so.batAt < 300) {
          const k = (time - so.batAt) / 300;
          g.lineStyle(2, 0xffffff, 1 - k); g.strokeCircle(x, y, 16 + k * 20);
        }
      }
    },

    drawHud(g, time) {
      const cx = W / 2, y = top + 8;
      wirePlate(g, cx, y, 230, 30);
      (['player', 'npc'] as Side[]).forEach((s, n) => {
        const S = st[s];
        const x0 = cx - 100 + n * 112;
        const col = s === 'player' ? YOU : THEM;
        g.fillStyle(col, 1); g.fillCircle(x0, y + 15, 4);
        g.lineStyle(1, BRASS_DARK, 1); g.strokeCircle(x0, y + 15, 4);
        for (let i = 0; i < need(); i++) {
          const on = i < S.count || !!S.loose || !!S.caught;
          const fx = x0 + 14 + i * 14;
          g.fillStyle(on ? SOUL_DEEP_HUD : 0xcfc6b0, 1);
          g.fillTriangle(fx - 4, y + 20, fx + 4, y + 20, fx, y + 9);
          g.fillCircle(fx, y + 19, 4);
        }
        // Loose: a little drifting double; caught: a shut lantern with its filing arc.
        const ix = x0 + 64;
        if (S.loose) { soulWisp(g, ix, y + 15 + Math.sin(time / 200) * 2, 5, time / 1000, SOUL, 1, true, 0); }
        else if (S.caught) {
          g.fillStyle(BRASS_DARK, 1); g.fillRect(ix - 6, y + 8, 12, 14);
          g.fillStyle(col, 1); g.fillRect(ix - 4, y + 10, 8, 10);
          const k = clamp((time - S.caught.at) / FILE_MS, 0, 1);
          g.lineStyle(2, 0xff7050, 1); g.beginPath(); g.arc(ix, y + 15, 10, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
        }
      });
    },

    destroy() {
      for (const p of posts) p.target.remove();
      st.player.loose?.target?.remove();
      st.npc.loose?.target?.remove();
    },
  };
}

/** The HUD's lit soul-pip. */
const SOUL_DEEP_HUD = 0x4a8fc4;

export const FALLEN_SHAKEN_LOOSE: GimmickDef = {
  id: fallenId('lantern', 'shaken-loose'),
  rules: 'Every third blow shakes your soul loose: walk back into it before it drifts into a lantern. Strike hers on; strike yours free.',
  make,
};
