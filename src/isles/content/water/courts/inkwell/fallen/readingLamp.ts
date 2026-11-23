import Phaser from 'phaser';
import type { EncounterGimmick, Fighter, GimmickCtx, GimmickDef, Pt } from '../gimmicks/shared';
import { live } from '../gimmicks/shared';
import type { StrikeTarget } from '../../../../../IslesTypes';
import type { G } from '../../../../../art/IsleArt';
import { BLUE, BLUE_DEEP, BLUE_LIT, BLUE_WASH, CSS_BLUE, CSS_BLUE_LIT, GREY, INK, INK_LIT, PAPER, WHITE } from '../palette';
import { inkShadow, queenSeal } from '../inkArt';
import { fallenId } from '../../../../meteor/spec';

/**
 * The Reading Lamp — Lampwarden Vey's fight (light).
 *
 * The censors' towers burn a blue reading-lamp all night, and its beam reads the town through
 * the windows. In this fight the lamp hangs from the tower gallery at the top of the page and its
 * beam sweeps the floor like a slow pendulum. Standing in it is safe — but **every spell cast
 * inside the beam is read**: a blue eye opens over the caster. The third eye CENSORS them —
 * a strip of the Queen's tape over the mouth: silenced (basic attacks only) and fined.
 * Eyes close one at a time out of the light.
 *
 * Down the beam slides its burning-glass focus — a white-hot spot that scorches whoever it
 * crosses. Walk round it.
 *
 * The lamp's shutter is a strike target on the gallery: strike it and the sweep reverses — swing
 * the beam back over Vey just as she casts. At half health a second lamp is lit on the south
 * gallery, sweeping the other way.
 */

const ID = fallenId('inkwell', 'reading-lamp');
const HALF = 0.19;
const SWEEP = 0.5;
const LEN = 760;
const READS_TO_CENSOR = 3;
const CENSOR_MS = 2600;
const CENSOR_FINE = 9;
const FADE_MS = 4200;
const FOCUS_R = 30;
const FOCUS_DMG = 13;

interface Lamp { x: number; y: number; base: number; ang: number; dir: number; shutter: StrikeTarget; flipAt: number; phase: number }
interface Reader { eyes: number; lastEyeAt: number; censoredAt: number; focusHitAt: number }

export const READING_LAMP: GimmickDef = {
  id: ID,
  rules: 'Cast inside the sweeping lamp-beam and you are read; three reads and you are censored. Strike the shutter to swing the beam back.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const { W, H, top } = ctx;
    const lamps: Lamp[] = [];
    const readers: Record<'p' | 'n', Reader> = {
      p: { eyes: 0, lastEyeAt: 0, censoredAt: -9999, focusHitAt: -9999 },
      n: { eyes: 0, lastEyeAt: 0, censoredAt: -9999, focusHitAt: -9999 },
    };
    let second = false;

    const addLamp = (x: number, y: number, base: number, dir: number): void => {
      const lamp: Lamp = { x, y, base, ang: base + Math.PI / 2, dir, flipAt: -9999, phase: ctx.rng() * 6, shutter: null as unknown as StrikeTarget };
      lamp.shutter = ctx.target({
        x, y: y + (base > 0 ? 18 : -18), r: 22,
        onStruck() {
          const t = ctx.scene.time.now;
          if (t - lamp.flipAt < 700) return;
          lamp.flipAt = t;
          lamp.dir = -lamp.dir;
          ctx.sfx('clang');
        },
      });
      lamps.push(lamp);
    };
    addLamp(W / 2, top + 4, 0, 1);

    const inBeam = (l: Lamp, p: Pt): boolean => {
      const d = Phaser.Math.Distance.Between(l.x, l.y, p.x, p.y);
      if (d > LEN) return false;
      const a = Math.atan2(p.y - l.y, p.x - l.x);
      return Math.abs(Phaser.Math.Angle.Wrap(a - l.ang)) < HALF + 18 / Math.max(40, d);
    };
    const lit = (f: Fighter): boolean => lamps.some((l) => inBeam(l, f));
    const focusOf = (l: Lamp, time: number): Pt => {
      const d = 150 + (Math.sin(time / 1300 + l.phase) * 0.5 + 0.5) * 420;
      return { x: l.x + Math.cos(l.ang) * d, y: l.y + Math.sin(l.ang) * d };
    };

    const read = (f: Fighter, k: 'p' | 'n'): void => {
      const r = readers[k];
      const t = ctx.scene.time.now;
      if (!live(f) || !lit(f) || t - r.censoredAt < CENSOR_MS) return;
      r.eyes++;
      r.lastEyeAt = t;
      ctx.sfx('crystal-chime');
      if (r.eyes >= READS_TO_CENSOR) {
        r.eyes = 0;
        r.censoredAt = t;
        ctx.silence(f, CENSOR_MS);
        ctx.hit(f, CENSOR_FINE, f.x, f.y);
        ctx.sfx('judgement');
        ctx.float(f.x, f.y - 50, k === 'n' ? 'VEY IS CENSORED' : 'CENSORED', k === 'n' ? CSS_BLUE_LIT : CSS_BLUE);
      }
    };

    const drawEyes = (g: G, f: Fighter, r: Reader, time: number): void => {
      for (let i = 0; i < r.eyes; i++) {
        const ex = f.x - (r.eyes - 1) * 9 + i * 18, ey = f.y - 62;
        g.fillStyle(WHITE, 1); g.fillEllipse(ex, ey, 15, 9);
        g.lineStyle(1.5, INK, 1); g.strokeEllipse(ex, ey, 15, 9);
        g.fillStyle(BLUE, 1); g.fillCircle(ex, ey, 3.2);
        g.fillStyle(INK, 1); g.fillCircle(ex, ey, 1.4);
        g.lineStyle(1, INK, 0.8);
        for (let l = -1; l <= 1; l++) g.lineBetween(ex + l * 4, ey - 5, ex + l * 5, ey - 8);
      }
      if (time - r.censoredAt < CENSOR_MS) {
        // The censor's tape across the mouth, sealed in blue.
        g.fillStyle(PAPER, 1); g.fillRect(f.x - 17, f.y - 4, 34, 9);
        g.lineStyle(1.2, INK, 1); g.strokeRect(f.x - 17, f.y - 4, 34, 9);
        g.fillStyle(INK, 0.85); g.fillRect(f.x - 13, f.y - 1, 26, 3);
        queenSeal(g, f.x + 15, f.y + 1, 5);
      }
    };

    return {
      update(time, dt) {
        if (!second && ctx.npc.hp <= ctx.npc.maxHp * 0.5) {
          second = true;
          addLamp(W / 2, H - 4, Math.PI, -lamps[0].dir);
          ctx.banner('The south gallery lights its lamp. Two beams read the floor now.', CSS_BLUE);
          ctx.sfx('light-beam');
        }
        for (const l of lamps) {
          // Sweep between the gallery's two stops, reversing at either end.
          const lo = l.base + 0.32, hi = l.base + Math.PI - 0.32;
          l.ang += l.dir * SWEEP * dt;
          if (l.ang < lo) { l.ang = lo; l.dir = 1; }
          if (l.ang > hi) { l.ang = hi; l.dir = -1; }
          const fp = focusOf(l, time);
          for (const [f, k] of [[ctx.player, 'p'], [ctx.npc, 'n']] as [Fighter, 'p' | 'n'][]) {
            const r = readers[k];
            if (live(f) && Phaser.Math.Distance.Between(f.x, f.y, fp.x, fp.y) < FOCUS_R + 18 && time - r.focusHitAt > 750) {
              r.focusHitAt = time;
              ctx.hit(f, FOCUS_DMG, f.x, f.y);
              ctx.sfx('sizzle');
            }
          }
        }
        for (const [f, k] of [[ctx.player, 'p'], [ctx.npc, 'n']] as [Fighter, 'p' | 'n'][]) {
          const r = readers[k];
          if (r.eyes > 0 && !lit(f) && time - r.lastEyeAt > FADE_MS) { r.eyes--; r.lastEyeAt = time; }
        }
      },

      onPlayerCast() { read(ctx.player, 'p'); },
      onNpcCast() { read(ctx.npc, 'n'); },

      npcSeek() {
        const n = ctx.npc;
        const t = ctx.scene.time.now;
        for (const l of lamps) {
          const fp = focusOf(l, t);
          if (Phaser.Math.Distance.Between(n.x, n.y, fp.x, fp.y) < FOCUS_R + 70) {
            const a = Math.atan2(n.y - fp.y, n.x - fp.x);
            return { x: ctx.tk.clampX(n.x + Math.cos(a) * 120), y: ctx.tk.clampY(n.y + Math.sin(a) * 120) };
          }
        }
        // Out of the light before she speaks: step off the beam against its sweep.
        const l = lamps.find((lp) => inBeam(lp, n));
        if (l && readers.n.eyes >= 1) {
          const d = Phaser.Math.Distance.Between(l.x, l.y, n.x, n.y);
          const a = l.ang - l.dir * (HALF + 0.35);
          return { x: ctx.tk.clampX(l.x + Math.cos(a) * d), y: ctx.tk.clampY(l.y + Math.sin(a) * d) };
        }
        return null;
      },

      drawGround(g, time) {
        for (const l of lamps) {
          // The beam: three nested wedges of wash, ray-strokes inside, dust caught in it.
          for (const [w, a] of [[HALF * 1.25, 0.07], [HALF, 0.12], [HALF * 0.55, 0.12]] as [number, number][]) {
            g.fillStyle(BLUE_WASH, a);
            g.fillTriangle(l.x, l.y, l.x + Math.cos(l.ang - w) * LEN, l.y + Math.sin(l.ang - w) * LEN, l.x + Math.cos(l.ang + w) * LEN, l.y + Math.sin(l.ang + w) * LEN);
          }
          g.lineStyle(1, BLUE_LIT, 0.35);
          for (let i = -3; i <= 3; i++) {
            const a = l.ang + (i / 3) * HALF * 0.9;
            g.lineBetween(l.x + Math.cos(a) * 30, l.y + Math.sin(a) * 30, l.x + Math.cos(a) * LEN, l.y + Math.sin(a) * LEN);
          }
          g.lineStyle(2, BLUE, 0.55);
          for (const s of [-1, 1]) g.lineBetween(l.x, l.y, l.x + Math.cos(l.ang + s * HALF) * LEN, l.y + Math.sin(l.ang + s * HALF) * LEN);
          for (let i = 0; i < 14; i++) {
            const d = 60 + ((i * 53 + time / 18) % (LEN - 80));
            const off = Math.sin(i * 2.3 + time / 700) * HALF * 0.8;
            g.fillStyle(WHITE, 0.6); g.fillCircle(l.x + Math.cos(l.ang + off) * d, l.y + Math.sin(l.ang + off) * d, 1.3);
          }
          // The focus: a scorch ring on the page with a white-hot heart.
          const fp = focusOf(l, time);
          inkShadow(g, fp.x, fp.y + 4, FOCUS_R * 2.2, FOCUS_R * 0.9, 0.35);
          g.fillStyle(BLUE_LIT, 0.35); g.fillCircle(fp.x, fp.y, FOCUS_R + 6);
          g.fillStyle(WHITE, 0.85); g.fillCircle(fp.x, fp.y, FOCUS_R * 0.6);
          g.lineStyle(2, BLUE, 0.9); g.strokeCircle(fp.x, fp.y, FOCUS_R);
          for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2 + time / 300;
            g.lineStyle(1.5, BLUE_DEEP, 0.7);
            g.lineBetween(fp.x + Math.cos(a) * (FOCUS_R + 3), fp.y + Math.sin(a) * (FOCUS_R + 3), fp.x + Math.cos(a) * (FOCUS_R + 10), fp.y + Math.sin(a) * (FOCUS_R + 10));
          }
        }
      },

      drawAir(g, time) {
        for (const l of lamps) {
          // The tower gallery's iron bracket and the lantern: cage, lens, louvered shutter.
          const s = l.base > 0 ? -1 : 1;
          g.fillStyle(INK, 1); g.fillRect(l.x - 60, l.y - s * 4 - 3, 120, 6);
          for (let i = -50; i <= 50; i += 12) g.lineBetween(l.x + i, l.y - s * 4, l.x + i + 6, l.y - s * 10);
          g.fillStyle(INK, 1); g.fillRoundedRect(l.x - 16, l.y - 14, 32, 28, 6);
          g.lineStyle(2, GREY, 1); g.strokeRoundedRect(l.x - 16, l.y - 14, 32, 28, 6);
          const lx = l.x + Math.cos(l.ang) * 14, ly = l.y + Math.sin(l.ang) * 14;
          g.fillStyle(BLUE_LIT, 1); g.fillCircle(lx, ly, 9);
          g.fillStyle(WHITE, 1); g.fillCircle(lx - 2, ly - 2, 3.5);
          const sh = time - l.flipAt < 400 ? 1 - (time - l.flipAt) / 400 : 0;
          const sx = l.x, sy = l.y + s * 18;
          g.fillStyle(INK_LIT, 1); g.fillRect(sx - 14, sy - 6, 28, 12);
          g.lineStyle(1, PAPER, 0.7);
          for (let i = -1; i <= 1; i++) g.lineBetween(sx - 12, sy + i * 3 + sh * 3, sx + 12, sy + i * 3 - sh * 3);
          g.lineStyle(2, BLUE, 0.4 + 0.3 * Math.sin(time / 200)); g.strokeCircle(sx, sy, 22);
          // An arrow ticked on the shutter shows which way it sweeps.
          g.fillStyle(WHITE, 0.9);
          g.fillTriangle(sx + l.dir * s * -20, sy, sx + l.dir * s * -12, sy - 5, sx + l.dir * s * -12, sy + 5);
        }
        drawEyes(g, ctx.player, readers.p, time);
        drawEyes(g, ctx.npc, readers.n, time);
      },

      drawHud(g) {
        // Two reading slips: three eye-pips for each side.
        const y = 104;
        for (const [k, x0] of [['p', W / 2 - 150], ['n', W / 2 + 70]] as ['p' | 'n', number][]) {
          g.fillStyle(PAPER, 0.95); g.fillRect(x0, y - 8, 80, 18);
          g.lineStyle(1, INK, 1); g.strokeRect(x0, y - 8, 80, 18);
          for (let i = 0; i < READS_TO_CENSOR; i++) {
            const on = readers[k].eyes > i;
            g.fillStyle(on ? BLUE : WHITE, 1); g.fillEllipse(x0 + 16 + i * 24, y + 1, 16, 9);
            g.lineStyle(1, INK, 1); g.strokeEllipse(x0 + 16 + i * 24, y + 1, 16, 9);
            if (on) { g.fillStyle(INK, 1); g.fillCircle(x0 + 16 + i * 24, y + 1, 2); }
          }
        }
      },

      destroy() { for (const l of lamps) l.shutter.remove(); },
    };
  },
};
