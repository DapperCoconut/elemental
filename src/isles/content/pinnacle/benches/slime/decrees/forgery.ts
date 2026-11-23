import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { glow } from '../../../../../art/IsleArt';
import { OBS, seam } from '../../../../../art/PinnacleArt';
import { glassDrop } from '../art';
import { B, VEN, VEN_CSS, VEN_DARK, VEN_DEEP, VEN_LIT, VEN_LIT_CSS, VIOLET_CSS, alive, clamp, dist } from '../palette';

/**
 * Seat of the Informer's Fee — the Decree of the Forged Warrant.
 *
 * On Fangmire a household was passed over because a paper said so, and half the papers were forged.
 * Here the councilor serves warrants on the floor around you: green-sealed circles that close on a
 * clock. Some are genuine — they serve (hurt, and silence you while you are held for questioning).
 * The rest are his forgeries and do nothing at all. He always knows which, so he stands in a
 * forgery: watch his feet. And the forger is careless: a genuine seal is pressed with the Mark's
 * TWO fang-pricks and its clock runs sunwise; a forgery has THREE and runs the wrong way.
 *
 * Strike a forgery's seal and it is exposed and re-served on the forger — a genuine warrant under
 * his feet on a short fuse. Strike a genuine seal and it serves at once, wherever it is.
 */

const ID = `${B.id}-forged-warrant`;

interface Warrant { x: number; y: number; genuine: boolean; at: number; due: number; target: StrikeTarget; done: boolean; onForger: boolean }

const make = (ctx: GimmickCtx): EncounterGimmick => {
  const { W, H, top, tk } = ctx;
  const R = 78;
  const FUSE = ctx.hard ? 1600 : 1900;
  const PERIOD = ctx.hard ? 5200 : 6200;
  const warrants: Warrant[] = [];
  const fx: { x: number; y: number; at: number; genuine: boolean }[] = [];
  let next = 0;

  const serve = (w: Warrant, time: number) => {
    if (w.done) return;
    w.done = true;
    w.target.remove();
    fx.push({ x: w.x, y: w.y, at: time, genuine: w.genuine });
    if (!w.genuine) { ctx.sfx('smoke'); return; }
    ctx.sfx('judgement');
    const p = ctx.player, n = ctx.npc;
    if (alive(p) && dist(p.x, p.y, w.x, w.y) < R) { tk.hitPlayer(16, w.x, w.y); ctx.silence(p, 1500); ctx.float(p.x, p.y - 50, 'SERVED', VIOLET_CSS); }
    if (alive(n) && dist(n.x, n.y, w.x, w.y) < R) {
      ctx.hit(n, Math.max(12, n.maxHp * (w.onForger ? 0.08 : 0.06)), w.x, w.y); ctx.silence(n, 1500);
      ctx.float(n.x, n.y - 50, w.onForger ? 'HIS OWN FORGERY' : 'SERVED', VEN_LIT_CSS);
    }
  };

  const place = (x: number, y: number, genuine: boolean, fuse: number, time: number, onForger = false) => {
    const w: Warrant = {
      x: clamp(x, R, W - R), y: clamp(y, top + R * 0.7, H - R * 0.7), genuine, at: time, due: time + tk.warn(fuse), done: false, onForger,
      target: undefined as unknown as StrikeTarget,
    };
    w.target = ctx.target({
      x: w.x, y: w.y, r: 22, passThrough: true,
      onStruck(by) {
        if (w.done) return;
        const now = ctx.scene.time.now;
        if (w.genuine) { serve(w, now); return; }
        // A forgery exposed: void here, and served genuine on the forger.
        w.done = true; w.target.remove();
        fx.push({ x: w.x, y: w.y, at: now, genuine: false });
        ctx.sfx('glitch');
        ctx.float(w.x, w.y - 30, by === 'player' ? 'FORGERY — EXPOSED' : 'HE BURNS IT', by === 'player' ? VEN_LIT_CSS : VIOLET_CSS);
        if (by === 'player' && alive(ctx.npc)) place(ctx.npc.x, ctx.npc.y, true, 900, now, true);
      },
    });
    warrants.push(w);
  };

  const issue = (time: number) => {
    const p = ctx.player;
    const spots: Pt[] = [{ x: p.x, y: p.y }];
    for (let i = 0; i < 2; i++) {
      const a = ctx.rng() * Math.PI * 2;
      spots.push({ x: p.x + Math.cos(a) * 150, y: p.y + Math.sin(a) * 120 });
    }
    const nGenuine = ctx.rng() < 0.5 ? 1 : 2;
    const order = [0, 1, 2].sort(() => ctx.rng() - 0.5);
    spots.forEach((s, i) => place(s.x, s.y, order.indexOf(i) < nGenuine, FUSE, time));
    ctx.sfx('trap-set');
  };

  const pts = (g: Phaser.GameObjects.Graphics, x: number, y: number, n: number, c: number) => {
    for (let i = 0; i < n; i++) { g.fillStyle(c, 1); g.fillCircle(x + (i - (n - 1) / 2) * 6, y, 1.8); }
  };

  return {
    update(time) {
      if (next === 0) { next = time + 3000; ctx.banner('WARRANTS ARE SERVED — SOME ARE FORGED. WATCH HIS FEET', VEN_CSS); }
      if (time >= next) { issue(time); next = time + PERIOD; }
      for (const w of warrants) if (!w.done && time >= w.due) serve(w, time);
      for (let i = warrants.length - 1; i >= 0; i--) if (warrants[i].done) warrants.splice(i, 1);
      while (fx.length && time - fx[0].at > 800) fx.shift();
    },
    npcSeek() {
      // He knows his own paper: he waits in a forgery, out of every genuine one.
      const live = warrants.filter((w) => !w.done);
      if (!live.length) return null;
      const n = ctx.npc;
      const inGenuine = live.find((w) => w.genuine && dist(n.x, n.y, w.x, w.y) < R + 20);
      const forged = live.filter((w) => !w.genuine && !w.onForger);
      if (forged.length) {
        const f = forged.reduce((b, w) => (dist(n.x, n.y, w.x, w.y) < dist(n.x, n.y, b.x, b.y) ? w : b), forged[0]);
        if (dist(n.x, n.y, f.x, f.y) < 300 || inGenuine) return { x: f.x, y: f.y };
      }
      if (inGenuine) {
        const a = Math.atan2(n.y - inGenuine.y, n.x - inGenuine.x);
        return { x: clamp(inGenuine.x + Math.cos(a) * (R + 70), 60, W - 60), y: clamp(inGenuine.y + Math.sin(a) * (R + 70), top + 50, H - 50) };
      }
      return null;
    },
    drawGround(g, time) {
      for (const w of warrants) {
        if (w.done) continue;
        const k = clamp((time - w.at) / Math.max(1, w.due - w.at), 0, 1);
        // Both kinds look alike at a glance: a green ring closing on a clock.
        g.fillStyle(VEN, 0.06 + k * 0.14); g.fillCircle(w.x, w.y, R);
        g.lineStyle(2, k > 0.75 && Math.floor(time / 90) % 2 ? VEN_LIT : VEN, 0.85); g.strokeCircle(w.x, w.y, R);
        // The clock: genuine runs sunwise, a forgery the wrong way round.
        const dirn = w.genuine ? 1 : -1;
        g.lineStyle(4, VEN_LIT, 0.7); g.beginPath();
        g.arc(w.x, w.y, R - 6, -Math.PI / 2, -Math.PI / 2 + dirn * k * Math.PI * 2, dirn < 0); g.strokePath();
        // The warrant's ruled lines, struck name and seal.
        g.lineStyle(1, OBS.seam, 0.35);
        for (let i = -2; i <= 2; i++) g.lineBetween(w.x - R * 0.6, w.y + i * 12, w.x + R * 0.6, w.y + i * 12);
        seam(g, [{ x: w.x - R * 0.5, y: w.y - 12 }, { x: w.x + R * 0.5, y: w.y - 14 }], 1, 0.6, 0, OBS.seam);
        g.fillStyle(VEN_DEEP, 1); g.fillCircle(w.x, w.y + 22, 13);
        g.fillStyle(VEN, 1); g.fillCircle(w.x, w.y + 21, 10.5);
        g.lineStyle(1.2, OBS.edge, 0.6); g.strokeCircle(w.x, w.y + 22, 13);
        pts(g, w.x, w.y + 21, w.genuine ? 2 : 3, VEN_DARK);
      }
    },
    drawAir(g, time) {
      for (const f of fx) {
        const k = (time - f.at) / 800;
        if (f.genuine) {
          g.lineStyle(5, VEN_LIT, 1 - k); g.strokeCircle(f.x, f.y, R * (0.5 + k * 0.6));
          glow(g, f.x, f.y, R, VEN, 0.08 * (1 - k), 3);
          for (let i = 0; i < 8; i++) glassDrop(g, f.x + Math.cos(i) * R * k, f.y + Math.sin(i) * R * 0.7 * k, 2.6, 1 - k);
        } else {
          // A forgery curls up and burns away to nothing.
          for (let i = 0; i < 6; i++) {
            g.fillStyle(OBS.facet, 0.8 * (1 - k));
            g.fillTriangle(f.x + (i - 3) * 12, f.y - k * 50 - i * 4, f.x + (i - 3) * 12 + 8, f.y - k * 50 - i * 4 + 4, f.x + (i - 3) * 12 + 2, f.y - k * 50 - i * 4 + 10);
          }
          g.lineStyle(2, OBS.seamLit, 1 - k); g.lineBetween(f.x - 30, f.y - 30, f.x + 30, f.y + 30); g.lineBetween(f.x + 30, f.y - 30, f.x - 30, f.y + 30);
        }
      }
    },
    drawHud(g, time) {
      const cx = W / 2, cy = top + 16;
      const k = clamp(1 - (next - time) / PERIOD, 0, 1);
      g.fillStyle(0x030503, 0.85); g.fillRoundedRect(cx - 80, cy - 11, 160, 22, 8);
      g.lineStyle(1.5, OBS.edge, 0.6); g.strokeRoundedRect(cx - 80, cy - 11, 160, 22, 8);
      g.fillStyle(VEN_DARK, 1); g.fillRect(cx - 40, cy - 3, 110, 6);
      g.fillStyle(VEN, 1); g.fillRect(cx - 40, cy - 3, 110 * k, 6);
      g.fillStyle(VEN, 1); g.fillCircle(cx - 60, cy, 8);
      pts(g, cx - 60, cy, 2, VEN_DARK);
    },
    destroy() { for (const w of warrants) w.target.remove(); },
  };
};

export const DECREE_FORGED_WARRANT: GimmickDef = {
  id: ID,
  rules: 'Warrants shall be served, and some shall be forged; a genuine seal bears two pricks, and a forgery exposed is served on its forger.',
  make,
};
