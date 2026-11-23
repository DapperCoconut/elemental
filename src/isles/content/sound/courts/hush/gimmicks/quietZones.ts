import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { dim, glow, lit } from '../../../../../art/IsleArt';
import { HUSH, HUSH_DEEP, IRON, LAMP, LAMP_GLOW, SILK, WARDEN } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Quiet Zones — Shusher Felt.
 *
 * Shusher walks the Lantern Lane with the wardens' hooded lanterns, and wherever a lantern hangs
 * there is a circle of hush under it. In the fight three of them drift on their chains across the
 * floor, each throwing a grey disc of hush. **Cast inside one and you are silenced for a beat** —
 * the lantern hears you and shuts your mouth. Every few seconds Shusher pinches his candle-wicks
 * and every lantern *breathes out*: whoever is under one then is silenced too, and scalded with
 * wax.
 *
 * The lanterns hang low enough to hit. Strike one and it swings away from you on its chain,
 * dragging its circle of hush with it — straight at the foe, if you stood right.
 */

const ZONE_R = 92;
const CAST_SILENCE = 1400;
const BREATH_SILENCE = 1000;
const BREATH_DMG = 5;
const KICK = 290;

interface Zone {
  x: number; y: number;
  vx: number; vy: number;
  /** Swinging after a blow: extra velocity, decaying. */
  kx: number; ky: number;
  seed: number;
  target: StrikeTarget | null;
  /** Last time it silenced someone (for the flare). */
  flareAt: number;
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const zones: Zone[] = [];
  const n = ctx.hard ? 4 : 3;
  const breathEvery = ctx.hard ? 5800 : 7000;
  const BREATH_WARN = 1300;
  let nextBreath = 0;
  let breathWarnAt = -1;
  let breathAt = -9999;
  let started = false;
  /** Per-fighter grace so one burst of casts is one silence. */
  const lastHushed = new Map<Fighter, number>([[player, -9999], [npc, -9999]]);

  const inZone = (f: Fighter): Zone | null => {
    for (const z of zones) if (dist(z.x, z.y, f.x, f.y) < ZONE_R) return z;
    return null;
  };

  function hush(f: Fighter, z: Zone, ms: number, time: number, label: string): void {
    if (!alive(f) || time - (lastHushed.get(f) ?? 0) < 1600) return;
    lastHushed.set(f, time);
    z.flareAt = time;
    ctx.silence(f, ms);
    ctx.float(f.x, f.y - 48, label, '#dfe6ee');
    ctx.sfx('hush');
  }

  function onCast(f: Fighter): void {
    const z = inZone(f);
    if (z) hush(f, z, ctx.hard ? CAST_SILENCE + 300 : CAST_SILENCE, ctx.scene.time.now, 'SHHH');
  }

  function spawn(i: number): void {
    const a = rng() * Math.PI * 2;
    const z: Zone = {
      x: W * (0.22 + (i % 4) * 0.19) + (rng() - 0.5) * 40,
      y: top + 110 + ((i * 173) % Math.max(1, H - top - 220)),
      vx: Math.cos(a) * 42, vy: Math.sin(a) * 42, kx: 0, ky: 0, seed: rng() * 10, target: null, flareAt: -9999,
    };
    z.target = ctx.target({
      x: z.x, y: z.y, r: 22, passThrough: true,
      onStruck(by) {
        // Swing away from whoever struck it.
        const f = by === 'player' ? player : npc;
        const d = Math.max(1, dist(f.x, f.y, z.x, z.y));
        z.kx = ((z.x - f.x) / d) * KICK; z.ky = ((z.y - f.y) / d) * KICK;
        ctx.sfx('clang');
        ctx.float(z.x, z.y - 70, 'SWUNG', '#ffd88a');
      },
    });
    zones.push(z);
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) {
        started = true;
        for (let i = 0; i < n; i++) spawn(i);
        nextBreath = time + breathEvery;
      }
      for (const z of zones) {
        z.x += (z.vx + z.kx + Math.sin(time / 1300 + z.seed) * 12) * dt;
        z.y += (z.vy + z.ky + Math.cos(time / 1700 + z.seed) * 10) * dt;
        const k = Math.exp(-dt * 2.2);
        z.kx *= k; z.ky *= k;
        if (z.x < 70 || z.x > W - 70) { z.vx = -z.vx; z.kx = -z.kx * 0.6; }
        if (z.y < top + 60 || z.y > H - 60) { z.vy = -z.vy; z.ky = -z.ky * 0.6; }
        z.x = clamp(z.x, 70, W - 70); z.y = clamp(z.y, top + 60, H - 60);
        z.target?.moveTo(z.x, z.y);
      }
      // Shusher pinches the wicks: every lantern breathes out.
      if (breathWarnAt < 0 && time >= nextBreath - BREATH_WARN) {
        breathWarnAt = time;
        ctx.banner('SHUSHER PINCHES THE WICKS', '#dfe6ee');
        ctx.sfx('curse-cast');
      }
      if (time >= nextBreath) {
        nextBreath = time + breathEvery;
        breathWarnAt = -1;
        breathAt = time;
        for (const f of [player, npc]) {
          const z = inZone(f);
          if (!z || !alive(f)) continue;
          hush(f, z, BREATH_SILENCE, time, 'HUSHED');
          ctx.hit(f, BREATH_DMG, f.x, f.y);
        }
      }
    },

    onPlayerCast() { onCast(player); },
    onNpcCast() { onCast(npc); },

    npcSeek() {
      if (!alive(player)) return null;
      // Out of the hush first.
      const mine = inZone(npc);
      if (mine) {
        const d = Math.max(1, dist(npc.x, npc.y, mine.x, mine.y));
        return { x: clamp(mine.x + ((npc.x - mine.x) / d) * (ZONE_R + 50), 60, W - 60), y: clamp(mine.y + ((npc.y - mine.y) / d) * (ZONE_R + 50), top + 50, H - 40) };
      }
      // A lantern near you: stand behind it, so a blow (or a shot through it) swings it onto you.
      let best: Zone | null = null, bd = 300;
      for (const z of zones) { const d = dist(z.x, z.y, player.x, player.y); if (d < bd && d > ZONE_R * 0.6) { bd = d; best = z; } }
      if (best) {
        const d = Math.max(1, dist(best.x, best.y, player.x, player.y));
        return { x: clamp(best.x + ((best.x - player.x) / d) * (ZONE_R + 30), 60, W - 60), y: clamp(best.y + ((best.y - player.y) / d) * (ZONE_R + 30), top + 50, H - 40) };
      }
      return null;
    },

    drawGround(g, time) {
      const warn = breathWarnAt >= 0 ? clamp((time - breathWarnAt) / BREATH_WARN, 0, 1) : 0;
      const breathK = clamp((time - breathAt) / 600, 0, 1);
      for (const z of zones) {
        // The pool of hush: a grey disc, the lantern's light warm at its heart.
        g.fillStyle(HUSH_DEEP, 0.2 + warn * 0.15); g.fillCircle(z.x, z.y, ZONE_R);
        g.fillStyle(HUSH, 0.12); g.fillCircle(z.x, z.y, ZONE_R * 0.75);
        glow(g, z.x, z.y, ZONE_R * 0.5, LAMP_GLOW, 0.03, 3);
        // A dashed rim, turning slowly — and tightening as the wicks are pinched.
        const rim = ZONE_R - warn * 10;
        for (let i = 0; i < 20; i++) {
          const a = (i / 20) * Math.PI * 2 + time / 4000 + z.seed;
          g.lineStyle(2 + warn * 2, i % 2 ? SILK : HUSH, 0.5 + warn * 0.4);
          g.beginPath(); g.arc(z.x, z.y, rim, a, a + 0.18, false); g.strokePath();
        }
        // The little "shh" marks of a hush: closed brackets facing in.
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2 + z.seed;
          const mx = z.x + Math.cos(a) * ZONE_R * 0.55, my = z.y + Math.sin(a) * ZONE_R * 0.55;
          g.lineStyle(1.5, SILK, 0.35);
          g.beginPath(); g.arc(mx, my, 6, a + Math.PI * 0.7, a + Math.PI * 1.3, false); g.strokePath();
        }
        // Wax drips spattered under the lantern.
        for (let i = 0; i < 5; i++) {
          g.fillStyle(0xf0e6c8, 0.5); g.fillCircle(z.x + Math.cos(z.seed + i * 1.7) * 14, z.y + Math.sin(z.seed + i * 1.7) * 9, 2 + (i % 2));
        }
        // A breath going out: a soft ring rolling to the rim.
        if (breathK < 1) { g.lineStyle(6 * (1 - breathK), SILK, 0.6 * (1 - breathK)); g.strokeCircle(z.x, z.y, ZONE_R * (0.3 + breathK * 0.7)); }
        if (time - z.flareAt < 500) { const k = (time - z.flareAt) / 500; g.fillStyle(SILK, 0.25 * (1 - k)); g.fillCircle(z.x, z.y, ZONE_R); }
      }
    },

    drawAir(g, time) {
      for (const z of zones) {
        // Each lantern hangs on a long chain from the dark above the HUD, swaying with its swing.
        const lean = clamp(z.kx / KICK, -1, 1) * 26;
        const lx = z.x + lean, ly = z.y - 64;
        g.lineStyle(2, IRON, 0.85); g.lineBetween(z.x - lean * 0.2, top - 10, lx, ly - 18);
        for (let k = 0; k < 6; k++) {
          const cy = top + ((ly - 18 - top) * k) / 6;
          g.lineStyle(1.5, dim(IRON, 0.2), 0.8); g.strokeEllipse(z.x - lean * 0.2 + (lx - z.x + lean * 0.2) * (k / 6), cy, 3, 5);
        }
        // Light down to the floor.
        g.fillStyle(LAMP, 0.05); g.fillTriangle(lx - 8, ly + 6, lx + 8, ly + 6, z.x + ZONE_R * 0.7, z.y);
        g.fillStyle(LAMP, 0.05); g.fillTriangle(lx - 8, ly + 6, lx + 8, ly + 6, z.x - ZONE_R * 0.7, z.y);
        // The hooded lantern: cage, flame, cowl, felt collar.
        const flick = 0.8 + Math.sin(time / 90 + z.seed) * 0.2;
        glow(g, lx, ly, 26, LAMP_GLOW, 0.07 * flick, 3);
        g.fillStyle(WARDEN, 1); g.fillRect(lx - 7, ly - 16, 14, 4);
        g.fillStyle(LAMP, 0.9); g.fillRect(lx - 6, ly - 12, 12, 16);
        g.fillStyle(lit(LAMP, 0.5), 1); g.fillEllipse(lx, ly - 2, 4, 8 * flick);
        g.lineStyle(1.5, IRON, 1); g.strokeRect(lx - 7, ly - 13, 14, 18); g.lineBetween(lx, ly - 13, lx, ly + 5);
        g.fillStyle(IRON, 1); g.fillTriangle(lx - 11, ly - 12, lx + 11, ly - 12, lx, ly - 24);
        g.fillStyle(IRON, 1); g.fillRect(lx - 3, ly + 5, 6, 3);
        // Wax creeping down the cage.
        g.fillStyle(0xf0e6c8, 0.9); g.fillRect(lx - 5, ly + 4, 2, 4 + Math.sin(time / 700 + z.seed) * 1.5); g.fillRect(lx + 3, ly + 4, 2, 3);
      }
      // Over anyone silenced by a lantern: a finger to the lips.
      for (const f of [player, npc]) {
        if (!alive(f)) continue;
        const since = time - (lastHushed.get(f) ?? -9999);
        if (since > CAST_SILENCE) continue;
        const a = 1 - since / CAST_SILENCE;
        g.fillStyle(SILK, 0.9 * a); g.fillEllipse(f.x, f.y - 44, 14, 8);
        g.lineStyle(2.5, HUSH_DEEP, a); g.lineBetween(f.x, f.y - 52, f.x, f.y - 38);
      }
    },
  };
}

export const QUIET_ZONES: GimmickDef = {
  id: 'hush-quiet-zones',
  rules: 'Lanterns drift on chains, a circle of hush under each. Cast inside one and you are silenced. Strike a lantern to swing its hush away from you.',
  make,
};
