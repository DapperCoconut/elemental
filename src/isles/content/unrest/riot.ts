import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../IslesTypes';
import { alive, clamp, dist, drawMob, firePatch, flame, frameClock, RIOT, rioter } from './riotArt';

/**
 * The six street-fights of a court in anarchy. Each insurgent brings one; a court's insurgents never share
 * one. Every rule comes in two strengths — `unrest-<id>` and `unrest-<id>-strong` (after the King's fall).
 */

type Make = (ctx: GimmickCtx, strong: boolean) => EncounterGimmick;

function pair(id: string, rules: string, make: Make): GimmickDef[] {
  return [
    { id: `unrest-${id}`, rules, make: (ctx) => make(ctx, false) },
    { id: `unrest-${id}-strong`, rules, make: (ctx) => make(ctx, true) },
  ];
}

// ── Firebombs ────────────────────────────────────────────────────────
// The crowd lobs bottles at where you stand. What they leave burning burns anyone — walk him into it.

const molotov: Make = (ctx, strong) => {
  const { W, H, top, tk } = ctx;
  const step = frameClock();
  const R = 60;
  const every = strong ? 1900 : 2500;
  const FLIGHT = 1150;
  interface Bottle { sx: number; sy: number; tx: number; ty: number; at: number; seed: number }
  interface Fire { x: number; y: number; until: number; born: number; tickP: number; tickN: number; seed: number }
  const bottles: Bottle[] = [];
  const fires: Fire[] = [];
  const throwers = [0.14, 0.38, 0.62, 0.86].flatMap((k) => [{ x: W * k, y: top + 30, up: true }, { x: W * k, y: H - 14, up: false }]);
  let next = 0;
  let windup: { i: number; until: number } | null = null;
  let n = 0;
  return {
    update(time) {
      step(time);
      if (!next) next = time + 1800;
      const { player, npc } = ctx;
      if (time >= next && alive(player)) {
        next = time + every;
        // The nearest hand on the rail throws.
        let bi = 0, bd = Infinity;
        throwers.forEach((th, i) => { const d = dist(th.x, th.y, player.x, player.y) + ((i * 53 + n * 97) % 160); if (d < bd) { bd = d; bi = i; } });
        const th = throwers[bi];
        windup = { i: bi, until: time + 320 };
        bottles.push({ sx: th.x, sy: th.y - 34, tx: tk.clampX(player.x, 60), ty: tk.clampY(player.y, 60), at: time + 320, seed: n++ });
        ctx.sfx('grenade-throw');
      }
      for (let i = bottles.length - 1; i >= 0; i--) {
        const b = bottles[i];
        if (time < b.at + FLIGHT) continue;
        bottles.splice(i, 1);
        ctx.sfx('explosion-small');
        ctx.flash(b.tx, b.ty, 0xff8a3a);
        if (alive(player) && dist(player.x, player.y, b.tx, b.ty) < R) tk.hitPlayer(strong ? 14 : 11, b.tx, b.ty);
        if (alive(npc) && dist(npc.x, npc.y, b.tx, b.ty) < R) ctx.hit(npc, 14, b.tx, b.ty);
        fires.push({ x: b.tx, y: b.ty, until: time + 6500, born: time, tickP: time + 500, tickN: time + 500, seed: b.seed });
        if (fires.length > 6) fires.shift();
      }
      for (let i = fires.length - 1; i >= 0; i--) {
        const f = fires[i];
        if (time >= f.until) { fires.splice(i, 1); continue; }
        if (alive(player) && time >= f.tickP && dist(player.x, player.y, f.x, f.y) < R - 6) { f.tickP = time + 600; tk.hitPlayer(5, player.x, player.y); }
        if (alive(npc) && time >= f.tickN && dist(npc.x, npc.y, f.x, f.y) < R - 6) { f.tickN = time + 600; ctx.hit(npc, 7, npc.x, npc.y); }
      }
    },
    npcSeek() {
      // He knows better than to stand in it.
      const { npc } = ctx;
      const f = fires.find((q) => dist(npc.x, npc.y, q.x, q.y) < R + 14);
      if (!f) return null;
      const a = Math.atan2(npc.y - f.y, npc.x - f.x) || 0.4;
      return { x: tk.clampX(f.x + Math.cos(a) * (R + 70)), y: tk.clampY(f.y + Math.sin(a) * (R + 70)) };
    },
    drawGround(g, time) {
      for (const f of fires) firePatch(g, f.x, f.y, R, time, clamp((f.until - time) / 1500, 0, 1), f.seed);
      for (const b of bottles) {
        const p = clamp((time - b.at) / FLIGHT, 0, 1);
        // Where it will land: a wobbling ring that tightens as the bottle comes down.
        g.lineStyle(2, 0xff8a3a, 0.35 + 0.5 * p); g.strokeCircle(b.tx, b.ty, R * (1.25 - 0.25 * p));
        g.fillStyle(0xff5a1a, 0.08 + 0.12 * p); g.fillCircle(b.tx, b.ty, R);
        g.fillStyle(0x000000, 0.25 * p); g.fillEllipse(b.sx + (b.tx - b.sx) * p, b.sy + (b.ty - b.sy) * p + 6, 14, 5);
      }
    },
    drawAir(g, time) {
      drawMob(g, W, H, top, time, 0.35);
      throwers.forEach((th, i) => {
        const w = windup && windup.i === i && time < windup.until + 260 ? clamp(1 - (windup.until - time) / 320, 0, 1) : 0.35;
        rioter(g, th.x, th.y, 0.95, i * 13 + 3, time, { arm: w, face: th.x < W / 2 ? 1 : -1 });
      });
      for (const b of bottles) {
        if (time < b.at) continue;
        const p = clamp((time - b.at) / FLIGHT, 0, 1);
        const x = b.sx + (b.tx - b.sx) * p, y = b.sy + (b.ty - b.sy) * p - Math.sin(p * Math.PI) * 130;
        const a = time / 90 + b.seed;
        const cx = Math.cos(a), sy = Math.sin(a);
        g.lineStyle(7, 0x3a6a4a, 1); g.lineBetween(x - cx * 7, y - sy * 7, x + cx * 5, y + sy * 5);
        g.lineStyle(3.5, 0x5a9a6a, 1); g.lineBetween(x + cx * 5, y + sy * 5, x + cx * 10, y + sy * 10);
        g.lineStyle(2, 0xe8dcc8, 1); g.lineBetween(x + cx * 10, y + sy * 10, x + cx * 15, y + sy * 15);
        flame(g, x + cx * 15, y + sy * 15, 4.5, time + b.seed * 31);
      }
    },
  };
};

// ── The Barricade ────────────────────────────────────────────────────
// He fights from cover. Break the cover; the street rebuilds it.

const barricade: Make = (ctx, strong) => {
  const { W, H, top, tk } = ctx;
  const step = frameClock();
  const fy = (k: number) => top + (H - top) * k;
  const HP = strong ? 60 : 45;
  const REBUILD = strong ? 8000 : 10000;
  const COVER_R = 120;
  interface Wall { x: number; y: number; hp: number; downAt: number; hurtAt: number; target: StrikeTarget | null; seed: number }
  const walls: Wall[] = [
    { x: W * 0.5, y: fy(0.24) }, { x: W * 0.24, y: fy(0.56) }, { x: W * 0.76, y: fy(0.56) }, { x: W * 0.5, y: fy(0.86) },
  ].map((p, i) => ({ ...p, hp: HP, downAt: 0, hurtAt: 0, target: null, seed: i }));
  const raise = (w: Wall) => {
    w.hp = HP; w.downAt = 0;
    w.target = ctx.target({
      x: w.x, y: w.y - 14, r: 44,
      onStruck(by, amount) {
        if (by !== 'player' || w.hp <= 0) return;
        w.hp -= amount; w.hurtAt = ctx.scene.time.now;
        if (w.hp <= 0) {
          w.downAt = ctx.scene.time.now;
          w.target?.remove(); w.target = null;
          ctx.sfx('stone-slam'); ctx.flash(w.x, w.y - 14, 0xc8a070);
        } else ctx.sfx('hit-medium');
      },
    });
  };
  walls.forEach(raise);
  const inCover = (): boolean => walls.some((w) => w.hp > 0 && dist(ctx.npc.x, ctx.npc.y, w.x, w.y) < COVER_R);
  return {
    update(time) {
      step(time);
      for (const w of walls) if (w.hp <= 0 && w.downAt && time - w.downAt >= REBUILD) { raise(w); ctx.sfx('hammer-forge'); }
    },
    npcTakenMult: () => (inCover() ? 0.5 : 1),
    npcSeek() {
      const { npc, player } = ctx;
      let best: Wall | null = null, bd = Infinity;
      for (const w of walls) { if (w.hp <= 0) continue; const d = dist(npc.x, npc.y, w.x, w.y); if (d < bd) { bd = d; best = w; } }
      if (!best) return null;
      const a = Math.atan2(best.y - player.y, best.x - player.x);
      return { x: tk.clampX(best.x + Math.cos(a) * 62), y: tk.clampY(best.y + Math.sin(a) * 62) };
    },
    drawGround(g, time) {
      for (const w of walls) {
        if (w.hp <= 0) continue;
        const on = dist(ctx.npc.x, ctx.npc.y, w.x, w.y) < COVER_R;
        g.lineStyle(2, on ? 0xffd27a : 0x8a7a66, on ? 0.5 + Math.sin(time / 160) * 0.2 : 0.18); g.strokeEllipse(w.x, w.y, COVER_R * 2, COVER_R * 1.5);
      }
    },
    drawAir(g, time) {
      drawMob(g, W, H, top, time, 0.15);
      for (const w of walls) {
        const x = w.x, y = w.y;
        if (w.hp <= 0) {
          // Wreckage, and the street putting it back together.
          const k = clamp((time - w.downAt) / REBUILD, 0, 1);
          g.fillStyle(0x000000, 0.25); g.fillEllipse(x, y + 2, 96, 22);
          for (let i = 0; i < 7; i++) {
            const a = i * 0.9 + w.seed, r = 16 + (i * 13) % 34;
            g.lineStyle(5, i % 2 ? RIOT.wood : RIOT.woodDark, 1);
            g.lineBetween(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.4, x + Math.cos(a) * r + Math.cos(a * 2.3) * 16, y + Math.sin(a) * r * 0.4 + Math.sin(a * 2.3) * 6);
          }
          if (k > 0.35) {
            rioter(g, x - 30, y + 4, 0.8, w.seed * 5 + 1, time, { arm: 0.5 + Math.sin(time / 110) * 0.5, face: 1 });
            rioter(g, x + 32, y + 6, 0.8, w.seed * 5 + 2, time + 300, { arm: 0.5 + Math.cos(time / 130) * 0.5, face: -1 });
          }
          g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x - 30, y - 44, 60, 6, 3);
          g.fillStyle(0xc8a070, 1); g.fillRoundedRect(x - 29, y - 43, 58 * k, 4, 2);
          continue;
        }
        const shake = time - w.hurtAt < 160 ? Math.sin(time / 12) * 3 : 0;
        const bx = x + shake;
        g.fillStyle(0x000000, 0.35); g.fillEllipse(bx, y + 4, 110, 24);
        // An overturned cart on its side…
        g.fillStyle(RIOT.woodDark, 1); g.fillRoundedRect(bx - 46, y - 40, 60, 40, 3);
        g.fillStyle(RIOT.wood, 1);
        for (let i = 0; i < 4; i++) g.fillRect(bx - 44 + i * 14.5, y - 38, 12, 36);
        g.lineStyle(3, RIOT.iron, 1); g.strokeCircle(bx - 32, y - 44, 13);
        g.lineBetween(bx - 45, y - 44, bx - 19, y - 44); g.lineBetween(bx - 32, y - 57, bx - 32, y - 31);
        // …a door wedged against it, a barrel, two crates and a spar of timber through the lot.
        g.fillStyle(0x4a5a4a, 1); g.fillRect(bx + 2, y - 52, 26, 52);
        g.fillStyle(0x3a463a, 1); g.fillRect(bx + 6, y - 46, 8, 16); g.fillRect(bx + 16, y - 46, 8, 16);
        g.fillStyle(0xc8a040, 1); g.fillCircle(bx + 24, y - 24, 2);
        g.fillStyle(0x7a5430, 1); g.fillRoundedRect(bx + 26, y - 30, 22, 30, 5);
        g.fillStyle(RIOT.iron, 1); g.fillRect(bx + 26, y - 24, 22, 3); g.fillRect(bx + 26, y - 10, 22, 3);
        g.fillStyle(0x8a6a3a, 1); g.fillRect(bx - 20, y - 58, 20, 18);
        g.lineStyle(1.5, RIOT.woodDark, 1); g.strokeRect(bx - 20, y - 58, 20, 18); g.lineBetween(bx - 20, y - 58, bx, y - 40);
        g.lineStyle(6, RIOT.woodDark, 1); g.lineBetween(bx - 52, y - 8, bx + 50, y - 46);
        g.lineStyle(3, RIOT.wood, 1); g.lineBetween(bx - 52, y - 9, bx + 50, y - 47);
        // What is left of it.
        const k = clamp(w.hp / HP, 0, 1);
        g.fillStyle(0x000000, 0.5); g.fillRoundedRect(bx - 30, y - 72, 60, 6, 3);
        g.fillStyle(k > 0.4 ? 0xe8c070 : 0xe07040, 1); g.fillRoundedRect(bx - 29, y - 71, 58 * k, 4, 2);
      }
    },
    destroy() { for (const w of walls) w.target?.remove(); },
  };
};

// ── Looters ──────────────────────────────────────────────────────────
// The mob backs whoever is carrying more. Sacks fall, sacks get grabbed, and a hard hit shakes them loose.

const looters: Make = (ctx, strong) => {
  const { W, H, top, tk } = ctx;
  const step = frameClock();
  const PER = strong ? 0.12 : 0.1;
  const SHAKE = 26;
  interface Sack { x: number; y: number; born: number; thief: { sx: number; t0: number } | null; seed: number }
  const sacks: Sack[] = [];
  let mine = 0, his = 0;
  let next = 0, n = 0;
  let hurtP = 0, hurtN = 0;
  const drop = (x: number, y: number, time: number) => {
    sacks.push({ x: tk.clampX(x, 70), y: tk.clampY(y, 70), born: time, thief: null, seed: n++ });
  };
  const lead = () => clamp(mine - his, -5, 5);
  return {
    update(time) {
      step(time);
      if (!next) next = time + 1200;
      const { player, npc } = ctx;
      if (time >= next && sacks.length < 4) {
        next = time + (strong ? 2800 : 3400);
        drop(90 + ctx.rng() * (W - 180), top + 70 + ctx.rng() * (H - top - 150), time);
        ctx.sfx('money');
      }
      for (let i = sacks.length - 1; i >= 0; i--) {
        const s = sacks[i];
        if (time - s.born < 350) continue;
        if (alive(player) && dist(player.x, player.y, s.x, s.y) < 34) { mine++; sacks.splice(i, 1); ctx.sfx('sparkle'); continue; }
        if (alive(npc) && dist(npc.x, npc.y, s.x, s.y) < 34) { his++; sacks.splice(i, 1); ctx.sfx('money'); continue; }
        // Left lying too long, a looter runs in from the nearer rail and is gone with it.
        if (!s.thief && time - s.born > 7000) s.thief = { sx: s.x < W / 2 ? -30 : W + 30, t0: time };
        if (s.thief && time - s.thief.t0 > 1500) sacks.splice(i, 1);
      }
    },
    onPlayerHurt(amount) {
      hurtP += amount;
      if (hurtP >= SHAKE && mine > 0) { hurtP = 0; mine--; drop(ctx.player.x + (ctx.rng() - 0.5) * 160, ctx.player.y + (ctx.rng() - 0.5) * 160, ctx.scene.time.now); }
    },
    onNpcHurt(amount) {
      hurtN += amount;
      if (hurtN >= SHAKE && his > 0) { hurtN = 0; his--; drop(ctx.npc.x + (ctx.rng() - 0.5) * 160, ctx.npc.y + (ctx.rng() - 0.5) * 160, ctx.scene.time.now); }
    },
    npcTakenMult: () => 1 + Math.max(0, lead()) * PER,
    playerTakenMult: () => 1 + Math.max(0, -lead()) * PER,
    npcSeek() {
      const { npc } = ctx;
      let best: Pt | null = null, bd = Infinity;
      for (const s of sacks) { if (s.thief) continue; const d = dist(npc.x, npc.y, s.x, s.y); if (d < bd) { bd = d; best = s; } }
      return best ? { x: best.x, y: best.y } : null;
    },
    drawGround(g, time) {
      for (const s of sacks) {
        const pop = clamp((time - s.born) / 300, 0, 1);
        const y = s.y - (1 - pop) * 40;
        g.fillStyle(0x000000, 0.3); g.fillEllipse(s.x, s.y + 8, 30, 9);
        if (s.thief) {
          const p = clamp((time - s.thief.t0) / 1500, 0, 1);
          const out = p > 0.55;
          const tx = out ? s.x + (s.thief.sx - s.x) * ((p - 0.55) / 0.45) : s.thief.sx + (s.x - s.thief.sx) * (p / 0.55);
          rioter(g, tx, s.y + 6, 0.9, s.seed * 3 + 5, time * 2, { arm: out ? 0.9 : 0.2, face: (s.thief.sx < s.x) === out ? -1 : 1 });
          if (out) { sack(g, tx, s.y - 30, 0.8); continue; }
        }
        sack(g, s.x, y, 1);
        g.fillStyle(0xffe08a, 0.5 + Math.sin(time / 200 + s.seed) * 0.3); g.fillCircle(s.x + 10, y - 14, 1.6);
      }
    },
    drawAir(g, time) {
      drawMob(g, W, H, top, time, clamp(Math.abs(lead()) / 5, 0, 1));
    },
    drawHud(g) {
      // Two heaps under the HUD strip: yours on the left, his on the right, and which way the crowd leans.
      const y = top + 16;
      const heap = (x: number, n2: number, dir: number, tint: number) => {
        for (let i = 0; i < Math.min(n2, 8); i++) sack(g, x + dir * (i % 4) * 15, y + 14 - Math.floor(i / 4) * 12, 0.62);
        g.lineStyle(2, tint, 0.9); g.lineBetween(x - dir * 14, y + 24, x + dir * 64, y + 24);
      };
      heap(W / 2 - 120, mine, -1, 0x9dd8ff);
      heap(W / 2 + 120, his, 1, 0xff9a78);
      const l = lead();
      g.fillStyle(0x000000, 0.45); g.fillRoundedRect(W / 2 - 62, y + 4, 124, 12, 6);
      g.fillStyle(l >= 0 ? 0x9dd8ff : 0xff9a78, 1);
      g.fillRoundedRect(W / 2 + (l >= 0 ? 0 : (l / 5) * 60), y + 6, Math.max(2, (Math.abs(l) / 5) * 60), 8, 4);
      g.fillStyle(0xffffff, 0.9); g.fillRect(W / 2 - 1, y + 2, 2, 16);
    },
  };
};

/** A tied sack of plunder, base at (x, y). */
function sack(g: Phaser.GameObjects.Graphics, x: number, y: number, s: number): void {
  g.fillStyle(0x8a6a3a, 1); g.fillEllipse(x, y, 24 * s, 20 * s);
  g.fillStyle(0xa8854a, 1); g.fillEllipse(x - 3 * s, y - 2 * s, 15 * s, 13 * s);
  g.fillStyle(0x8a6a3a, 1); g.fillTriangle(x - 6 * s, y - 9 * s, x + 6 * s, y - 9 * s, x, y - 18 * s);
  g.lineStyle(2 * s, 0x3a2814, 1); g.lineBetween(x - 5 * s, y - 10 * s, x + 5 * s, y - 10 * s);
  g.fillStyle(0xffd23a, 1); g.fillCircle(x + 2 * s, y - 17 * s, 2.2 * s); g.fillCircle(x - 3 * s, y - 16 * s, 1.8 * s);
}

// ── Smoke ────────────────────────────────────────────────────────────
// He fights from inside it. Kick the canisters out.

const smoke: Make = (ctx, strong) => {
  const { W, H, top, tk } = ctx;
  const step = frameClock();
  const R = strong ? 124 : 110;
  const LIFE = 15000;
  interface Can { x: number; y: number; born: number; outAt: number; target: StrikeTarget | null; seed: number }
  const cans: Can[] = [];
  let next = 0, n = 0;
  const thick = (c: Can, time: number): number => {
    const grow = clamp((time - c.born - 500) / 900, 0, 1);
    const fade = c.outAt ? clamp(1 - (time - c.outAt) / 900, 0, 1) : 1;
    return grow * fade;
  };
  const hidden = (time: number): boolean => cans.some((c) => thick(c, time) > 0.6 && dist(ctx.npc.x, ctx.npc.y, c.x, c.y) < R - 12);
  let nowMs = 0;
  return {
    update(time) {
      step(time);
      nowMs = time;
      if (!next) next = time + 1500;
      const { npc } = ctx;
      if (time >= next && cans.filter((c) => !c.outAt).length < 3 && alive(npc)) {
        next = time + (strong ? 4400 : 5600);
        const a = ctx.rng() * Math.PI * 2, r = 40 + ctx.rng() * 90;
        const c: Can = { x: tk.clampX(npc.x + Math.cos(a) * r, 90), y: tk.clampY(npc.y + Math.sin(a) * r, 90), born: time, outAt: 0, target: null, seed: n++ };
        c.target = ctx.target({
          x: c.x, y: c.y, r: 22, passThrough: true,
          onStruck(by) {
            if (by !== 'player' || c.outAt) return;
            c.outAt = ctx.scene.time.now;
            c.target?.remove(); c.target = null;
            ctx.sfx('clang'); ctx.flash(c.x, c.y, 0xd8d8d8);
          },
        });
        cans.push(c);
        ctx.sfx('smoke');
      }
      for (let i = cans.length - 1; i >= 0; i--) {
        const c = cans[i];
        if (!c.outAt && time - c.born > LIFE) { c.outAt = time; c.target?.remove(); c.target = null; }
        if (c.outAt && time - c.outAt > 900) cans.splice(i, 1);
      }
    },
    npcTakenMult: () => (hidden(nowMs) ? 0.5 : 1),
    npcSeek() {
      const { npc } = ctx;
      let best: Can | null = null, bd = Infinity;
      for (const c of cans) { if (c.outAt) continue; const d = dist(npc.x, npc.y, c.x, c.y); if (d < bd) { bd = d; best = c; } }
      return best ? { x: best.x + 26, y: best.y + 10 } : null;
    },
    drawGround(g, time) {
      for (const c of cans) {
        const kicked = c.outAt ? clamp((time - c.outAt) / 500, 0, 1) : 0;
        const x = c.x + kicked * 60, y = c.y - Math.sin(kicked * Math.PI) * 40;
        g.fillStyle(0x000000, 0.3); g.fillEllipse(c.x + kicked * 60, c.y + 8, 22, 7);
        // The canister: a dented tin with a pull-ring, hissing.
        g.fillStyle(0x5a6a5a, 1); g.fillRoundedRect(x - 8, y - 12, 16, 22, 4);
        g.fillStyle(0x7a8a7a, 1); g.fillRect(x - 6, y - 10, 5, 18);
        g.fillStyle(0xd8c040, 1); g.fillRect(x - 8, y - 3, 16, 4);
        g.fillStyle(0x2a2a2a, 1); g.fillRect(x - 3, y - 16, 6, 4);
        g.lineStyle(1.5, 0xc8c8c8, 1); g.strokeCircle(x + 6, y - 16, 3);
        if (!c.outAt) { g.lineStyle(2, 0xffe08a, 0.35 + Math.sin(time / 140) * 0.25); g.strokeCircle(c.x, c.y, 22); }
      }
    },
    drawAir(g, time) {
      drawMob(g, W, H, top, time, 0.1);
      for (const c of cans) {
        const k = thick(c, time);
        if (k <= 0.01) continue;
        // Rolling banks: a slow turning ring of puffs over a dense core. Thick enough to lose a man in.
        g.fillStyle(0x6a6e72, 0.5 * k); g.fillCircle(c.x, c.y, R * 0.98);
        g.fillStyle(0x8a8e92, 0.62 * k); g.fillCircle(c.x, c.y, R * 0.8);
        for (let i = 0; i < 14; i++) {
          const a = (i / 14) * Math.PI * 2 + time / 2600 * (i % 2 ? 1 : -1) + c.seed;
          const rr = R * (0.5 + ((i * 29) % 10) / 24);
          const pr = 34 + ((i * 17) % 20) + Math.sin(time / 500 + i) * 5;
          g.fillStyle(i % 3 ? 0x9a9ea2 : 0xb4b8bc, 0.6 * k); g.fillCircle(c.x + Math.cos(a) * rr, c.y + Math.sin(a) * rr * 0.86, pr);
        }
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 - time / 1900 + c.seed * 2;
          g.fillStyle(0xc8ccd0, 0.5 * k); g.fillCircle(c.x + Math.cos(a) * R * 0.34, c.y + Math.sin(a) * R * 0.3, 30);
        }
      }
    },
    destroy() { for (const c of cans) c.target?.remove(); },
  };
};

// ── The Loudhailer ───────────────────────────────────────────────────
// The crowd runs down whoever the voice on the post names. Take the post.

const hailer: Make = (ctx, strong) => {
  const { W, H, top, tk } = ctx;
  const step = frameClock();
  const post = { x: W / 2, y: top + (H - top) * 0.5 };
  const HALF = 58;
  const every = strong ? 5200 : 6800;
  const WARN = tk.warn(1300);
  let against: 'player' | 'npc' = 'player';
  let flipAt = -9999;
  let next = 0;
  let rush: { y: number; dir: 1 | -1; fireAt: number; who: 'player' | 'npc'; done: boolean } | null = null;
  const target = ctx.target({
    x: post.x, y: post.y - 30, r: 26,
    onStruck(by) {
      const now = ctx.scene.time.now;
      if (now - flipAt < 1200) return;
      const want = by === 'player' ? 'npc' : 'player';
      if (want === against) return;
      against = want; flipAt = now;
      ctx.sfx('screech'); ctx.flash(post.x, post.y - 60, by === 'player' ? 0x9dd8ff : 0xff9a78);
    },
  });
  return {
    update(time) {
      step(time);
      if (!next) next = time + 2400;
      const { player, npc } = ctx;
      if (!rush && time >= next) {
        const f = against === 'player' ? player : npc;
        rush = { y: clamp(f.y, top + HALF, H - 40 - HALF * 0.4), dir: ctx.rng() < 0.5 ? 1 : -1, fireAt: time + WARN, who: against, done: false };
        ctx.sfx('drum-hit');
      }
      if (rush && !rush.done && time >= rush.fireAt) {
        rush.done = true;
        ctx.sfx('roar');
        const f = rush.who === 'player' ? player : npc;
        if (alive(f) && Math.abs(f.y - rush.y) < HALF + 14) {
          if (rush.who === 'player') tk.hitPlayer(strong ? 16 : 13, f.x, f.y);
          else ctx.hit(f, 18, f.x, f.y);
          ctx.nudge(f, rush.dir * 110, 0);
        }
      }
      if (rush && time >= rush.fireAt + 900) { rush = null; next = time + every - 900; }
    },
    npcSeek() {
      // Named by his own crowd, he goes for the post.
      return against === 'npc' ? { x: post.x + 34, y: post.y + 8 } : null;
    },
    drawGround(g, time) {
      if (!rush) return;
      const p = clamp(1 - (rush.fireAt - time) / WARN, 0, 1);
      const col = rush.who === 'player' ? 0xff6a3a : 0x6ac8ff;
      if (!rush.done) {
        g.fillStyle(col, 0.08 + 0.16 * p); g.fillRect(0, rush.y - HALF, W, HALF * 2);
        g.lineStyle(2, col, 0.5 + 0.4 * p); g.lineBetween(0, rush.y - HALF, W, rush.y - HALF); g.lineBetween(0, rush.y + HALF, W, rush.y + HALF);
        // Chevrons show which way they will come.
        for (let i = 0; i < 9; i++) {
          const x = ((i / 9) * W + (time / 6) * rush.dir + W * 4) % W;
          g.lineStyle(3, col, 0.35 + 0.4 * p);
          g.lineBetween(x - 8 * rush.dir, rush.y - 12, x + 4 * rush.dir, rush.y); g.lineBetween(x + 4 * rush.dir, rush.y, x - 8 * rush.dir, rush.y + 12);
        }
      } else {
        g.fillStyle(0x000000, 0.14); g.fillRect(0, rush.y - HALF, W, HALF * 2);
      }
    },
    drawAir(g, time) {
      drawMob(g, W, H, top, time, rush ? 0.9 : 0.3);
      // The post: a lamp-standard with a tin horn lashed to it, swung at whoever it is naming.
      const x = post.x, y = post.y;
      g.fillStyle(0x000000, 0.35); g.fillEllipse(x, y + 4, 34, 10);
      g.fillStyle(RIOT.iron, 1); g.fillRect(x - 4, y - 78, 8, 82); g.fillRoundedRect(x - 12, y - 6, 24, 10, 3);
      g.fillStyle(0x6a6a74, 1); g.fillRect(x - 3, y - 78, 3, 80);
      const f = against === 'player' ? ctx.player : ctx.npc;
      const want = Math.atan2(f.y - (y - 72), f.x - x);
      const swing = clamp((time - flipAt) / 350, 0, 1);
      const a = want + (1 - swing) * Math.PI * 0.9;
      const col = against === 'player' ? 0xff7a4a : 0x7ac8ff;
      const hx = x + Math.cos(a) * 12, hy = y - 72 + Math.sin(a) * 12;
      const mx = x + Math.cos(a) * 44, my = y - 72 + Math.sin(a) * 44;
      const px = -Math.sin(a), py = Math.cos(a);
      g.fillStyle(0xb8963a, 1);
      g.fillTriangle(hx + px * 5, hy + py * 5, hx - px * 5, hy - py * 5, mx + px * 19, my + py * 19);
      g.fillTriangle(hx - px * 5, hy - py * 5, mx - px * 19, my - py * 19, mx + px * 19, my + py * 19);
      g.lineStyle(3, 0x7a6222, 1); g.lineBetween(mx + px * 19, my + py * 19, mx - px * 19, my - py * 19);
      g.lineStyle(2.5, RIOT.rag, 1); g.lineBetween(x - 5, y - 70, x + 5, y - 76); g.lineBetween(x - 5, y - 76, x + 5, y - 70);
      for (let i = 1; i <= 3; i++) {
        const p = ((time / 500 + i / 3) % 1);
        g.lineStyle(2, col, (1 - p) * 0.7);
        g.beginPath(); g.arc(mx, my, 10 + p * 34, a - 0.6, a + 0.6); g.strokePath();
      }
      g.lineStyle(2, col, 0.6 + Math.sin(time / 150) * 0.25); g.strokeCircle(x, y - 30, 26);
      if (rush && rush.done) {
        // The crowd going through.
        const p = clamp((time - rush.fireAt) / 900, 0, 1);
        for (let i = 0; i < 22; i++) {
          const lag = (i % 11) * 46 + (i * 71) % 40;
          const xx = rush.dir > 0 ? -60 + p * (W + 620) - lag : W + 60 - p * (W + 620) + lag;
          if (xx < -30 || xx > W + 30) continue;
          rioter(g, xx, rush.y - HALF + 16 + ((i * 37) % (HALF * 2 - 20)), 0.95, i, time * 2.4, { arm: 0.9, torch: i % 5 === 0, face: rush.dir });
        }
      } else if (rush) {
        const ex = rush.dir > 0 ? 26 : W - 26;
        for (let i = 0; i < 5; i++) rioter(g, ex + ((i * 9) % 20) * -rush.dir, rush.y - HALF + 18 + i * ((HALF * 2 - 24) / 5), 0.95, i, time * 1.6, { arm: 0.6 + Math.sin(time / 90 + i) * 0.4, torch: i === 2, face: rush.dir });
      }
    },
    destroy() { target.remove(); },
  };
};

// ── Tripwires ────────────────────────────────────────────────────────
// He strung the street before you came. Dash the wires, or shoot out a post.

const tripwire: Make = (ctx, strong) => {
  const { W, H, top, tk } = ctx;
  const step = frameClock();
  const MAX = strong ? 4 : 3;
  interface Wire { ax: number; ay: number; bx: number; by: number; side: number; born: number; snapAt: number; posts: StrikeTarget[] }
  const wires: Wire[] = [];
  let next = 0;
  const sideOf = (w: Wire, x: number, y: number) => Math.sign((w.bx - w.ax) * (y - w.ay) - (w.by - w.ay) * (x - w.ax));
  const along = (w: Wire, x: number, y: number) => {
    const dx = w.bx - w.ax, dy = w.by - w.ay;
    return ((x - w.ax) * dx + (y - w.ay) * dy) / (dx * dx + dy * dy);
  };
  const snap = (w: Wire) => {
    if (w.snapAt) return;
    w.snapAt = ctx.scene.time.now;
    for (const p of w.posts) p.remove();
    w.posts = [];
  };
  const string = (time: number) => {
    for (let tries = 0; tries < 12; tries++) {
      const cx = 130 + ctx.rng() * (W - 260), cy = top + 90 + ctx.rng() * (H - top - 190);
      const a = ctx.rng() * Math.PI, half = 105 + ctx.rng() * 45;
      const w: Wire = {
        ax: tk.clampX(cx - Math.cos(a) * half, 60), ay: tk.clampY(cy - Math.sin(a) * half, 60),
        bx: tk.clampX(cx + Math.cos(a) * half, 60), by: tk.clampY(cy + Math.sin(a) * half, 60),
        side: 0, born: time, snapAt: 0, posts: [],
      };
      if (dist(cx, cy, ctx.player.x, ctx.player.y) < 110) continue;
      if (wires.some((o) => dist((o.ax + o.bx) / 2, (o.ay + o.by) / 2, cx, cy) < 120)) continue;
      w.side = sideOf(w, ctx.player.x, ctx.player.y);
      for (const [x, y] of [[w.ax, w.ay], [w.bx, w.by]]) {
        w.posts.push(ctx.target({
          x, y: y - 10, r: 17, passThrough: true,
          onStruck(by) { if (by === 'player' && !w.snapAt) { snap(w); ctx.sfx('snap-back'); ctx.flash(x, y - 10, 0xe8e8e8); } },
        }));
      }
      wires.push(w);
      ctx.sfx('trap-set');
      return;
    }
  };
  return {
    update(time) {
      step(time);
      if (!next) next = time + 600;
      const { player } = ctx;
      if (time >= next && wires.filter((w) => !w.snapAt).length < MAX) { next = time + (strong ? 3600 : 4800); string(time); }
      for (let i = wires.length - 1; i >= 0; i--) {
        const w = wires[i];
        if (w.snapAt) { if (time - w.snapAt > 500) wires.splice(i, 1); continue; }
        const s = sideOf(w, player.x, player.y);
        const k = along(w, player.x, player.y);
        if (time - w.born > 700 && s !== 0 && w.side !== 0 && s !== w.side && k > 0 && k < 1 && alive(player)) {
          if (ctx.dashing(player)) { w.side = s; continue; }
          snap(w);
          ctx.root(player, strong ? 1100 : 850);
          tk.hitPlayer(strong ? 9 : 7, player.x, player.y);
          ctx.sfx('trap-snap');
        }
        if (s !== 0 && (k <= 0 || k >= 1 || !w.side)) w.side = s;
      }
    },
    npcSeek() {
      // He stands where a wire lies between you.
      const { player, npc } = ctx;
      let best: Wire | null = null, bd = Infinity;
      for (const w of wires) {
        if (w.snapAt) continue;
        const d = dist((w.ax + w.bx) / 2, (w.ay + w.by) / 2, (player.x + npc.x) / 2, (player.y + npc.y) / 2);
        if (d < bd) { bd = d; best = w; }
      }
      if (!best) return null;
      const mx = (best.ax + best.bx) / 2, my = (best.ay + best.by) / 2;
      const a = Math.atan2(my - player.y, mx - player.x);
      return { x: tk.clampX(mx + Math.cos(a) * 130), y: tk.clampY(my + Math.sin(a) * 130) };
    },
    drawGround(g, time) {
      for (const w of wires) {
        const up = clamp((time - w.born) / 700, 0, 1);
        for (const [x, y] of [[w.ax, w.ay], [w.bx, w.by]]) {
          g.fillStyle(0x000000, 0.3); g.fillEllipse(x, y + 3, 16, 6);
          g.fillStyle(RIOT.woodDark, 1); g.fillRect(x - 3, y - 20 * up, 6, 20 * up + 2);
          g.fillStyle(RIOT.wood, 1); g.fillRect(x - 3, y - 20 * up, 2.5, 20 * up + 2);
          g.fillStyle(RIOT.iron, 1); g.fillCircle(x, y - 20 * up, 3);
        }
        if (w.snapAt) {
          // The two halves whipping back to their posts.
          const p = clamp((time - w.snapAt) / 500, 0, 1);
          const mx = (w.ax + w.bx) / 2, my = (w.ay + w.by) / 2;
          g.lineStyle(1.5, 0xe8e8e8, 1 - p);
          g.lineBetween(w.ax, w.ay - 12, w.ax + (mx - w.ax) * (1 - p), w.ay - 12 + (my - w.ay) * (1 - p) + Math.sin(p * 9) * 8);
          g.lineBetween(w.bx, w.by - 12, w.bx + (mx - w.bx) * (1 - p), w.by - 12 + (my - w.by) * (1 - p) - Math.sin(p * 9) * 8);
          continue;
        }
        if (up < 1) continue;
        // The wire: nearly nothing, but it catches the light as a glint runs along it.
        g.lineStyle(1.2, 0xd0d4d8, 0.34); g.lineBetween(w.ax, w.ay - 12, w.bx, w.by - 12);
        const gl = (time / 1400 + w.ax * 0.01) % 1;
        const gx = w.ax + (w.bx - w.ax) * gl, gy = w.ay - 12 + (w.by - w.ay) * gl;
        g.fillStyle(0xffffff, 0.85); g.fillCircle(gx, gy, 2);
        g.lineStyle(1, 0xffffff, 0.6); g.lineBetween(gx - 5, gy, gx + 5, gy); g.lineBetween(gx, gy - 5, gx, gy + 5);
        for (let i = 1; i < 4; i++) {
          const tx = w.ax + (w.bx - w.ax) * (i / 4), ty = w.ay - 12 + (w.by - w.ay) * (i / 4);
          g.fillStyle(RIOT.rag, 0.75); g.fillTriangle(tx - 3, ty, tx + 3, ty, tx, ty + 7 + Math.sin(time / 200 + i) * 1.5);
        }
      }
    },
    drawAir(g, time) { drawMob(g, W, H, top, time, 0.12); },
    destroy() { for (const w of wires) for (const p of w.posts) p.remove(); },
  };
};

export const RIOT_RULES: { id: string; name: string; rules: string }[] = [
  { id: 'molotov', name: 'Firebombs', rules: 'The mob lobs firebombs where you stand. What they leave burning burns anyone in it — him included.' },
  { id: 'barricade', name: 'The Barricade', rules: 'Near a standing barricade he takes half damage. Smash them down — the street rebuilds each one.' },
  { id: 'looters', name: 'Looters', rules: 'Grab the loot sacks. Whoever holds fewer takes more damage for every sack behind. Hard hits shake sacks loose.' },
  { id: 'smoke', name: 'Smoke', rules: 'Inside his smoke he takes half damage and you lose sight of him. Strike a canister to kick it out.' },
  { id: 'hailer', name: 'The Loudhailer', rules: 'The mob runs down whoever the loudhailer names. Strike it to turn the crowd on him — he will strike it back.' },
  { id: 'tripwire', name: 'Tripwires', rules: 'Walk into a wire and you are snared and cut. Dash over them, or strike a post to drop the wire.' },
];

const MAKERS: Record<string, Make> = { molotov, barricade, looters, smoke, hailer, tripwire };

export const RIOT_GIMMICKS: GimmickDef[] = RIOT_RULES.flatMap((r) => pair(r.id, r.rules, MAKERS[r.id]));
