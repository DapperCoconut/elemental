import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../IslesTypes';
import { alive, clamp, dist, drawMob, frameClock, RIOT, rioter } from './riotArt';

/**
 * Mob Rule — the ringleader of a court in anarchy.
 *
 * The whole street fights for them. A rally banner stands somewhere on the floor: while it does, the mob
 * works fast (firebombs, a rush down a lane, thugs over the rail) and the ringleader shrugs off two blows
 * in five. Cut the banner down and for a few seconds there is only the two of you — then a new one goes up
 * somewhere else, and the ringleader goes to stand under it. Under a third of their health the mob stops
 * taking turns and the ring itself starts closing.
 */

export const LEADER_RULES = 'While the rally banner stands he takes 40% less and the mob fights for him. Cut it down to expose him — they raise another.';

function make(ctx: GimmickCtx, strong: boolean): EncounterGimmick {
  const { W, H, top, tk } = ctx;
  const step = frameClock();
  const fy = (k: number) => top + (H - top) * k;
  const SPOTS = [{ x: W * 0.2, y: fy(0.3) }, { x: W * 0.8, y: fy(0.3) }, { x: W * 0.2, y: fy(0.78) }, { x: W * 0.8, y: fy(0.78) }, { x: W * 0.5, y: fy(0.54) }];
  const HP = strong ? 85 : 60;
  const DOWN_MS = strong ? 7000 : 9000;
  let spot = Math.floor(ctx.rng() * SPOTS.length);
  let hp = HP;
  let downAt = 0;
  let raisedAt = 0;
  let hurtAt = 0;
  let target: StrikeTarget | null = null;
  let nextAct = 0;
  let act = 0;
  let lastGasp = false;
  let nextRing = 0;
  let gap = ctx.rng() * Math.PI * 2;
  let heat = 0.3;

  const raise = (time: number) => {
    hp = HP; downAt = 0; raisedAt = time;
    const s = SPOTS[spot];
    target = ctx.target({
      x: s.x, y: s.y - 34, r: 26,
      onStruck(by, amount) {
        if (by !== 'player' || hp <= 0) return;
        hp -= amount; hurtAt = ctx.scene.time.now;
        if (hp <= 0) {
          downAt = ctx.scene.time.now;
          target?.remove(); target = null;
          ctx.banner('THE BANNER FALLS', '#9dffb0');
          ctx.sfx('stone-slam'); ctx.flash(s.x, s.y - 40, 0xffffff);
        } else ctx.sfx('hit-medium');
      },
    });
  };
  const up = () => hp > 0;

  const firebombs = () => {
    const p = ctx.player;
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + ctx.rng() * 1.2, r = i === 0 ? 0 : 110;
      tk.spawnZone({ x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r, radius: 58, warnMs: 1200 + i * 220, damage: strong ? 15 : 12, fall: true, poolMs: 3500, poolDamage: 4 });
    }
    tk.sfx('grenade-throw');
  };
  const rush = () => {
    const p = ctx.player;
    tk.spawnLane({ x: p.x, y: p.y, angle: ctx.rng() < 0.5 ? 0 : Math.PI / 2, halfW: 46, warnMs: 1150, damage: strong ? 16 : 13 });
    tk.sfx('drum-hit');
  };
  const thugs = () => {
    const n = strong ? 2 : 1;
    for (let i = 0; i < n; i++) {
      const left = ctx.rng() < 0.5;
      tk.spawnAdd({ x: left ? 70 : W - 70, y: fy(0.2 + ctx.rng() * 0.6), hp: strong ? 46 : 34, speed: 118, damage: strong ? 8 : 6, maxAlive: strong ? 3 : 2 });
    }
    tk.sfx('roar');
  };

  return {
    update(time) {
      step(time);
      const { npc } = ctx;
      if (!raisedAt) { raise(time); nextAct = time + 2600; }
      if (!up() && time - downAt >= DOWN_MS && alive(npc)) {
        // A new banner, as far from the last as the floor allows.
        const from = SPOTS[spot];
        let best = spot, bd = -1;
        SPOTS.forEach((s, i) => { const d = dist(s.x, s.y, from.x, from.y) + ctx.rng() * 120; if (i !== spot && d > bd) { bd = d; best = i; } });
        spot = best;
        raise(time);
        ctx.banner('THEY RAISE ANOTHER', '#ffb49a');
        ctx.sfx('boss-phase');
      }
      heat += ((up() ? 0.75 : 0.2) - heat) * 0.03;
      if (!alive(npc)) return;
      const low = npc.hp / npc.maxHp < 0.34;
      if (low && !lastGasp) { lastGasp = true; nextRing = time + 800; ctx.banner('THE MOB CLOSES IN', '#ff9a78'); ctx.sfx('boss-phase'); }
      if (time >= nextAct) {
        // With the banner up the mob takes its turns briskly; without it, it mills about.
        nextAct = time + (up() ? (strong ? 2800 : 3400) : (strong ? 4600 : 5400));
        [firebombs, rush, thugs][act % 3]();
        act++;
      }
      if (lastGasp && time >= nextRing) {
        nextRing = time + (strong ? 5200 : 6400);
        gap += (ctx.rng() - 0.5) * 0.7;
        tk.spawnRing({ cx: W / 2, cy: fy(0.5), delayMs: 500, speed: -170, startRadius: 560, gapCentre: gap, gapHalf: 0.55, band: 20, damage: strong ? 15 : 12 });
        tk.sfx('whoosh');
      }
    },
    npcTakenMult: () => (up() ? 0.6 : 1.15),
    npcSeek() {
      // He holds the ground under his banner.
      if (!up()) return null;
      const s = SPOTS[spot];
      const a = Math.atan2(ctx.player.y - s.y, ctx.player.x - s.x);
      return { x: tk.clampX(s.x + Math.cos(a) * 70), y: tk.clampY(s.y + Math.sin(a) * 70) };
    },
    drawGround(g, time) {
      const s = SPOTS[spot];
      if (up()) {
        // The rally ground: a ring trodden into the floor round the pole, pulsing while it holds.
        const k = 0.5 + Math.sin(time / 260) * 0.2;
        g.fillStyle(tk.palette.main, 0.07); g.fillEllipse(s.x, s.y, 240, 150);
        g.lineStyle(2.5, tk.palette.lit, k * 0.6); g.strokeEllipse(s.x, s.y, 240, 150);
        g.lineStyle(1.5, tk.palette.lit, k * 0.35); g.strokeEllipse(s.x, s.y, 200, 124);
      }
    },
    drawAir(g, time) {
      drawMob(g, W, H, top, time, heat);
      const s = SPOTS[spot];
      const x = s.x, y = s.y;
      g.fillStyle(0x000000, 0.35); g.fillEllipse(x, y + 4, 40, 12);
      if (!up()) {
        // Felled: the pole across the ground, the cloth in a heap, and the count until it is up again.
        const p = clamp((time - downAt) / 260, 0, 1);
        const a = -Math.PI / 2 + p * (Math.PI / 2 - 0.12);
        const tx = x + Math.cos(a) * 96, ty = y + Math.sin(a) * 96;
        g.lineStyle(7, RIOT.woodDark, 1); g.lineBetween(x, y, tx, ty);
        g.lineStyle(3, RIOT.wood, 1); g.lineBetween(x, y - 1, tx, ty - 1);
        g.fillStyle(tk.palette.dark, 1); g.fillEllipse(tx - 16, ty + 6, 60, 18);
        g.fillStyle(tk.palette.main, 0.8); g.fillEllipse(tx - 22, ty + 3, 34, 10);
        const k = clamp((time - downAt) / DOWN_MS, 0, 1);
        g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x - 32, y - 30, 64, 7, 3);
        g.fillStyle(0xff9a78, 1); g.fillRoundedRect(x - 31, y - 29, 62 * k, 5, 2);
        return;
      }
      const rise = clamp((time - raisedAt) / 420, 0, 1);
      const shake = time - hurtAt < 180 ? Math.sin(time / 11) * 3 : 0;
      const px = x + shake, topY = y - 104 * rise;
      // Wedged upright in a heap of cobbles, two rioters holding it.
      g.fillStyle(0x5a5650, 1); g.fillEllipse(x, y, 38, 14);
      g.fillStyle(0x76726a, 1); g.fillCircle(x - 9, y - 3, 6); g.fillCircle(x + 8, y - 2, 7); g.fillCircle(x, y - 6, 6);
      rioter(g, x - 24, y + 6, 0.9, 31, time, { arm: 0.8, face: 1 });
      rioter(g, x + 24, y + 8, 0.9, 44, time + 400, { arm: 0.8, face: -1 });
      g.lineStyle(7, RIOT.woodDark, 1); g.lineBetween(px, y - 2, px, topY);
      g.lineStyle(3, RIOT.wood, 1); g.lineBetween(px - 1.5, y - 2, px - 1.5, topY);
      g.fillStyle(0xc8a040, 1); g.fillTriangle(px - 6, topY, px + 6, topY, px, topY - 14);
      // The cloth: the court's colours, torn, with the crown struck through.
      const cw = 62, ch = 46;
      const wave = (k: number) => Math.sin(time / 190 + k * 2.2) * 4 * k;
      g.fillStyle(tk.palette.dark, 1);
      g.fillPoints([
        { x: px, y: topY + 6 }, { x: px + cw * 0.5, y: topY + 4 + wave(0.5) }, { x: px + cw, y: topY + 8 + wave(1) },
        { x: px + cw - 8, y: topY + ch * 0.5 + wave(1) }, { x: px + cw, y: topY + ch + wave(1) },
        { x: px + cw * 0.6, y: topY + ch - 6 + wave(0.6) }, { x: px + cw * 0.3, y: topY + ch + 2 + wave(0.3) }, { x: px, y: topY + ch - 2 },
      ] as Phaser.Types.Math.Vector2Like[], true);
      g.fillStyle(tk.palette.main, 1);
      g.fillPoints([
        { x: px + 3, y: topY + 10 }, { x: px + cw * 0.5, y: topY + 8 + wave(0.5) }, { x: px + cw - 6, y: topY + 12 + wave(1) },
        { x: px + cw - 13, y: topY + ch * 0.5 + wave(1) }, { x: px + cw - 7, y: topY + ch - 5 + wave(1) },
        { x: px + cw * 0.3, y: topY + ch - 4 + wave(0.3) }, { x: px + 3, y: topY + ch - 6 },
      ] as Phaser.Types.Math.Vector2Like[], true);
      const ex = px + cw * 0.46, ey = topY + ch * 0.52 + wave(0.5);
      g.fillStyle(0xffe08a, 1);
      g.fillRect(ex - 11, ey - 1, 22, 8);
      g.fillTriangle(ex - 11, ey - 1, ex - 11, ey - 11, ex - 5, ey - 1);
      g.fillTriangle(ex - 4, ey - 1, ex, ey - 13, ex + 4, ey - 1);
      g.fillTriangle(ex + 5, ey - 1, ex + 11, ey - 11, ex + 11, ey - 1);
      g.lineStyle(4, 0xb81a1a, 1); g.lineBetween(ex - 15, ey + 11, ex + 15, ey - 15);
      // What is left of the banner.
      const k = clamp(hp / HP, 0, 1);
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(px - 32, topY - 28, 64, 7, 3);
      g.fillStyle(k > 0.4 ? 0xffe08a : 0xe07040, 1); g.fillRoundedRect(px - 31, topY - 27, 62 * k, 5, 2);
    },
    destroy() { target?.remove(); },
  };
}

export const LEADER_GIMMICKS: GimmickDef[] = [
  { id: 'unrest-leader', rules: LEADER_RULES, make: (ctx) => make(ctx, false) },
  { id: 'unrest-leader-strong', rules: LEADER_RULES, make: (ctx) => make(ctx, true) },
];
