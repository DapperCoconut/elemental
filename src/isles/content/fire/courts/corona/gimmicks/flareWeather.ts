import Phaser from 'phaser';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import { SHADE, STONE, STONE_LIT, SUN, SUN_CORE, SUN_RIM, GLASS_CRACK } from '../palette';

/**
 * Flare Weather — Flare-Chaser Zenith's fight.
 *
 * Three standing stones, and a sun that crawls across the sky. The stones throw hard, ink-black
 * shadows that swing round as the sun moves. A **flare meter** fills; past the warning line the
 * light hardens, and when it breaks the flare scorches **everyone** who is not standing in a
 * stone's shadow. Each flare the sun starts from somewhere new.
 *
 * Each shadow shelters **one** body. Whoever reaches it first during the warning claims it
 * (a pale rim marks the owner), and anyone else in it is jostled out. Zenith races for the
 * nearest free shade — get there first, or claim the one it is running for and leave it in
 * the light.
 */

const STONE_R = 22;
const STONE_W = 48;
const SHADOW_L = 160;

interface Stone extends Pt { owner: Fighter | null }

export const FLARE_WEATHER: GimmickDef = {
  id: 'corona-flare-weather',
  rules: 'When the flare meter breaks, only stone shadows are safe. Each shadow shelters one — claim it first.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const { W, H, top, hard } = ctx;
    const stones: Stone[] = [
      { x: W * 0.26, y: top + 150, owner: null },
      { x: W * 0.74, y: top + 160, owner: null },
      { x: W * 0.5, y: H - 150, owner: null },
    ];
    const buildMs = hard ? 7200 : 9000;
    const warnK = 0.68;
    const dmg = hard ? 26 : 22;
    const sweep = hard ? 1.05 : 0.8; // radians the sun moves over one build

    let startAt = ctx.scene.time.now;
    let theta0 = ctx.rng() * Math.PI * 2;
    let warned = false;
    let glareAt = -99999;

    const k = (time: number): number => Phaser.Math.Clamp((time - startAt) / buildMs, 0, 1);
    /** Direction the light travels (shadows point this way). */
    const theta = (time: number): number => theta0 + sweep * k(time);

    const inShadow = (s: Stone, x: number, y: number, th: number): boolean => {
      const dx = Math.cos(th), dy = Math.sin(th);
      const rx = x - s.x, ry = y - s.y;
      const t = rx * dx + ry * dy;
      if (t < -6 || t > SHADOW_L) return false;
      const lat = Math.abs(-rx * dy + ry * dx);
      return lat < (STONE_W / 2) * (1 - 0.18 * (t / SHADOW_L)) + 4;
    };

    const shadeOf = (f: Fighter, th: number): Stone | null =>
      stones.find((s) => inShadow(s, f.x, f.y, th)) ?? null;

    const shadeCentre = (s: Stone, th: number): Pt => ({
      x: s.x + Math.cos(th) * SHADOW_L * 0.42, y: s.y + Math.sin(th) * SHADOW_L * 0.42,
    });

    const flare = (time: number): void => {
      const th = theta(time);
      glareAt = time;
      ctx.sfx('light-beam');
      ctx.banner('FLARE', '#fff3b0');
      for (const f of [ctx.player, ctx.npc]) {
        if (!f.active || f.hp <= 0) continue;
        if (shadeOf(f, th)) ctx.float(f.x, f.y - 32, 'SHADED', '#c9c2d6');
        else ctx.hit(f, dmg, f.x, f.y);
      }
      for (const s of stones) s.owner = null;
      startAt = time;
      theta0 = theta0 + Math.PI * (0.55 + ctx.rng() * 0.9);
      warned = false;
    };

    return {
      update(time, dt) {
        const kk = k(time);
        const th = theta(time);
        if (!warned && kk >= warnK) {
          warned = true;
          ctx.float(W / 2, top + 30, 'FLARE RISING — FIND SHADE', '#ffd54a');
          ctx.sfx('beam-charge');
        }
        // Stones are solid: shove anyone standing in a footing back out.
        for (const f of [ctx.player, ctx.npc]) {
          if (!f.active) continue;
          for (const s of stones) {
            const d = Phaser.Math.Distance.Between(f.x, f.y, s.x, s.y);
            if (d < STONE_R + 14 && d > 0.01) {
              const push = STONE_R + 14 - d;
              ctx.nudge(f, ((f.x - s.x) / d) * push, ((f.y - s.y) / d) * push);
            }
          }
        }
        if (warned) {
          // Claims: the first body in a shadow owns it; a second one is jostled out sideways.
          for (const s of stones) {
            if (s.owner && !inShadow(s, s.owner.x, s.owner.y, th)) s.owner = null;
          }
          for (const f of [ctx.player, ctx.npc]) {
            if (!f.active || f.hp <= 0) continue;
            const s = shadeOf(f, th);
            if (!s) continue;
            if (!s.owner) {
              s.owner = f;
              ctx.float(f.x, f.y - 30, 'CLAIMED', f === ctx.player ? '#c9f0ff' : '#ffb070');
            } else if (s.owner !== f) {
              const dx = Math.cos(th), dy = Math.sin(th);
              const side = Math.sign(-(f.x - s.x) * dy + (f.y - s.y) * dx) || 1;
              const push = 130 * dt;
              ctx.nudge(f, -dy * side * push, dx * side * push);
            }
          }
        }
        if (kk >= 1) flare(time);
      },

      npcSeek() {
        const t = ctx.scene.time.now;
        if (k(t) < 0.5) return null;
        const th = theta(t);
        const n = ctx.npc;
        let best: Stone | null = null;
        let bd = Infinity;
        for (const s of stones) {
          if (s.owner && s.owner !== n) continue;
          const c = shadeCentre(s, th);
          const d = Phaser.Math.Distance.Between(n.x, n.y, c.x, c.y);
          if (d < bd) { bd = d; best = s; }
        }
        // Lead the shadow: aim where it will be a moment from now.
        return best ? shadeCentre(best, th + sweep * (500 / buildMs)) : null;
      },

      drawGround(g, time) {
        const kk = k(time);
        const th = theta(time);
        // The glare: the glass floor whitens as the flare builds.
        g.fillStyle(SUN, 0.03 + kk * kk * 0.16);
        g.fillRect(0, top, W, H - top);
        // Hard shadows — crisp black quads, ownership rimmed.
        const dx = Math.cos(th), dy = Math.sin(th);
        for (const s of stones) {
          const half = STONE_W / 2, tip = half * 0.82;
          const pts = [
            new Phaser.Geom.Point(s.x - dy * half, s.y + dx * half),
            new Phaser.Geom.Point(s.x + dy * half, s.y - dx * half),
            new Phaser.Geom.Point(s.x + dx * SHADOW_L + dy * tip, s.y + dy * SHADOW_L - dx * tip),
            new Phaser.Geom.Point(s.x + dx * SHADOW_L - dy * tip, s.y + dy * SHADOW_L + dx * tip),
          ];
          g.fillStyle(SHADE, 0.55 + kk * 0.35);
          g.fillPoints(pts, true, true);
          if (s.owner) {
            g.lineStyle(2, s.owner === ctx.player ? 0xc9f0ff : SUN_RIM, 0.85);
            g.strokePoints(pts, true, true);
          }
        }
        // Flash after the break: scorched glass for a beat.
        const since = time - glareAt;
        if (since < 600) { g.fillStyle(SUN_CORE, 0.5 * (1 - since / 600)); g.fillRect(0, top, W, H - top); }
      },

      drawAir(g, time) {
        const th = theta(time);
        // The stones: a lit face toward the sun, a dark face away, a carved sun-ring.
        const lx = -Math.cos(th);
        for (const s of stones) {
          const bx = s.x, by = s.y;
          g.fillStyle(0x000000, 0.4); g.fillEllipse(bx, by + 3, STONE_W + 8, 14);
          g.fillStyle(STONE, 1);
          g.fillPoints([
            new Phaser.Geom.Point(bx - STONE_W / 2, by), new Phaser.Geom.Point(bx + STONE_W / 2, by),
            new Phaser.Geom.Point(bx + STONE_W / 2 - 6, by - 92), new Phaser.Geom.Point(bx - 4, by - 104),
            new Phaser.Geom.Point(bx - STONE_W / 2 + 4, by - 88),
          ], true, true);
          // Sun-side face.
          const sideX = lx >= 0 ? bx + 4 : bx - STONE_W / 2 + 2;
          g.fillStyle(STONE_LIT, 0.55 + Math.abs(lx) * 0.3);
          g.fillRect(sideX, by - 86, STONE_W / 2 - 6, 84);
          g.lineStyle(2, GLASS_CRACK, 0.6);
          g.strokeCircle(bx, by - 58, 9);
          g.lineBetween(bx, by - 67, bx, by - 49);
        }
        // The sun, riding the arena edge opposite the shadows.
        const cx = W / 2 - Math.cos(th) * 600, cy = (top + H) / 2 - Math.sin(th) * 600;
        const sx = Phaser.Math.Clamp(cx, 26, W - 26), sy = Phaser.Math.Clamp(cy, top + 18, H - 22);
        const kk = k(time);
        const r = 14 + kk * 10 + (warned ? Math.sin(time / 60) * 2 : 0);
        g.fillStyle(SUN_RIM, 0.3); g.fillCircle(sx, sy, r + 10);
        g.fillStyle(SUN, 1); g.fillCircle(sx, sy, r);
        g.fillStyle(SUN_CORE, 1); g.fillCircle(sx, sy, r * 0.55);
        // Rays toward the room.
        for (let i = -2; i <= 2; i++) {
          const a = th + i * 0.18;
          g.lineStyle(2, SUN, 0.25 + kk * 0.4);
          g.lineBetween(sx + Math.cos(a) * (r + 4), sy + Math.sin(a) * (r + 4), sx + Math.cos(a) * (r + 30 + kk * 30), sy + Math.sin(a) * (r + 30 + kk * 30));
        }
      },

      drawHud(g, time) {
        // A thermometer of flare, warning line marked.
        const x = W / 2 - 150, y = 104, w = 300, h = 10;
        const kk = k(time);
        g.fillStyle(0x000000, 0.55); g.fillRect(x - 3, y - 3, w + 6, h + 6);
        g.fillStyle(kk >= warnK ? (Math.floor(time / 110) % 2 ? SUN_CORE : SUN_RIM) : SUN, 1);
        g.fillRect(x, y, w * kk, h);
        g.fillStyle(SHADE, 1); g.fillRect(x + w * warnK - 1, y - 4, 2, h + 8);
      },
    };
  },
};
