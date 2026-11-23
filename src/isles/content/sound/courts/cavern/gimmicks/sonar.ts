import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { glow } from '../../../../../art/IsleArt';
import { bat } from '../art';
import { GLOW, GLOW_SOFT } from '../palette';
import { alive, clamp, dist, stepDt } from '../../../../life/courts/bloom/util';

/**
 * Sonar — Batkeeper Chirrup.
 *
 * The Bat Hollow is dark — black dark, the lamps put out. Every cast anyone makes is a *chirp*:
 * a ping ring spreads from the caster, lighting the rock as it passes, and the caster glows for
 * a moment where they stood. And the Batkeeper's colony hunts by the ping. The swarm flies to
 * wherever the last ping came from, and bites whoever is there when it arrives.
 *
 * So every cast gives you away and calls the bats down on the spot you cast from. Cast, then
 * move. Or cast right beside him and step clear: the bats come to the ping and he is still
 * standing in it. Chirrup knows the trick — he dances off his own pings.
 */

const CELL = 32;
const DARK = 0.88;
const PING_R = 320;
const PING_MS = 900;
const LIT_MS = 1300;
const SWARM_SPEED = 230;
const BITE_R = 72;
const BITE_MS = 1400;

interface Ping { x: number; y: number; at: number; by: Fighter }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  const pings: Ping[] = [];
  const litAt = new Map<Fighter, number>([[player, -9999], [npc, -9999]]);
  const swarm = { x: W / 2, y: top + 60, tx: W / 2, ty: top + 60, state: 'roost' as 'roost' | 'fly' | 'bite', biteUntil: 0, nextBite: 0, target: null as Ping | null };
  const bats = Array.from({ length: ctx.hard ? 16 : 12 }, (_, i) => ({ a: i * 2.39, r: 10 + (i % 5) * 7, s: 0.8 + (i % 3) * 0.2 }));
  let started = false;
  let lastPingBy: Fighter | null = null;
  /** Fixed glowworm specks on the roof line — the only light that never goes out. */
  const worms: Pt[] = Array.from({ length: 22 }, (_, i) => ({ x: 20 + ((i * 197) % (W - 40)), y: top + 6 + ((i * 53) % 20) }));

  function ping(by: Fighter): void {
    if (!alive(by)) return;
    const now = ctx.scene.time.now;
    const p = { x: by.x, y: by.y, at: now, by };
    pings.push(p);
    litAt.set(by, now);
    lastPingBy = by;
    swarm.target = p;
    swarm.tx = p.x; swarm.ty = p.y;
    if (swarm.state !== 'bite') swarm.state = 'fly';
    ctx.sfx('sonic-pulse');
    if (by === npc) ctx.float(by.x, by.y - 48, 'chirp!', '#bfe8ff');
  }

  /** How much light reaches a point, 0..1. */
  function lightAt(x: number, y: number, time: number): number {
    let dark = 1;
    // Your own faint sense of yourself.
    if (alive(player)) dark *= 1 - 0.45 * clamp(1 - dist(x, y, player.x, player.y) / 80, 0, 1);
    for (const f of [player, npc]) {
      const k = 1 - (time - (litAt.get(f) ?? -9999)) / LIT_MS;
      if (k <= 0 || !alive(f)) continue;
      dark *= 1 - 0.95 * k * clamp(1 - dist(x, y, f.x, f.y) / 130, 0, 1);
    }
    for (const p of pings) {
      const k = (time - p.at) / PING_MS;
      if (k >= 1) continue;
      const rad = k * PING_R;
      const d = Math.abs(dist(x, y, p.x, p.y) - rad);
      dark *= 1 - 0.8 * (1 - k) * clamp(1 - d / 40, 0, 1);
    }
    return 1 - dark;
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; ctx.banner('EVERY CAST PINGS — AND THE BATS COME TO THE PING', '#bfe8ff'); }
      for (let i = pings.length - 1; i >= 0; i--) if (time - pings[i].at > PING_MS) pings.splice(i, 1);
      // The swarm.
      const d = dist(swarm.x, swarm.y, swarm.tx, swarm.ty);
      if (swarm.state === 'fly') {
        const step = Math.min(d, SWARM_SPEED * (ctx.hard ? 1.15 : 1) * dt);
        if (d > 1) { swarm.x += ((swarm.tx - swarm.x) / d) * step; swarm.y += ((swarm.ty - swarm.y) / d) * step; }
        if (d < 24) { swarm.state = 'bite'; swarm.biteUntil = time + BITE_MS; swarm.nextBite = time; ctx.sfx('screech'); }
      } else if (swarm.state === 'bite') {
        if (time >= swarm.nextBite) {
          swarm.nextBite = time + 470;
          for (const f of [player, npc]) {
            if (!alive(f) || dist(f.x, f.y, swarm.x, swarm.y) > BITE_R) continue;
            ctx.hit(f, ctx.hard ? 8 : 6, f.x, f.y);
            ctx.float(f.x, f.y - 46, 'BITE', f === player ? '#ff9a9a' : '#bfe8ff');
            litAt.set(f, Math.max(litAt.get(f) ?? 0, time - LIT_MS * 0.6));
          }
        }
        if (time >= swarm.biteUntil) {
          // Back to circling wherever it is, waiting for the next chirp — unless one came meanwhile.
          swarm.state = swarm.target && swarm.target.at > swarm.biteUntil - BITE_MS && dist(swarm.target.x, swarm.target.y, swarm.x, swarm.y) > 30 ? 'fly' : 'roost';
        }
      } else {
        // Roosting: drift lazily in circles where it is.
        swarm.x += Math.cos(time / 700) * 20 * dt;
        swarm.y += Math.sin(time / 900) * 14 * dt;
      }
      swarm.x = clamp(swarm.x, 30, W - 30); swarm.y = clamp(swarm.y, top + 20, H - 20);
    },

    onPlayerCast() { ping(player); },
    onNpcCast() { ping(npc); },

    npcSeek() {
      // Off his own chirp before the bats arrive, sideways to the player so he stays in reach.
      if (lastPingBy === npc && swarm.state !== 'roost' && dist(npc.x, npc.y, swarm.tx, swarm.ty) < BITE_R + 50) {
        const a = Math.atan2(npc.y - player.y, npc.x - player.x) + Math.PI / 2;
        return { x: clamp(swarm.tx + Math.cos(a) * 200, 60, W - 60), y: clamp(swarm.ty + Math.sin(a) * 200, top + 50, H - 40) };
      }
      // Keep away from the swarm wherever it is.
      if (dist(npc.x, npc.y, swarm.x, swarm.y) < BITE_R + 60) {
        const a = Math.atan2(npc.y - swarm.y, npc.x - swarm.x);
        return { x: clamp(npc.x + Math.cos(a) * 160, 60, W - 60), y: clamp(npc.y + Math.sin(a) * 160, top + 50, H - 40) };
      }
      return null;
    },

    drawGround(g, time) {
      // Ping rings across the rock.
      for (const p of pings) {
        const k = (time - p.at) / PING_MS;
        g.lineStyle(3 * (1 - k) + 1, p.by === player ? GLOW : 0xd8c8ff, 0.7 * (1 - k)); g.strokeCircle(p.x, p.y, k * PING_R);
        g.lineStyle(1, GLOW_SOFT, 0.4 * (1 - k)); g.strokeCircle(p.x, p.y, k * PING_R * 0.8);
      }
      // Where the bats are going.
      if (swarm.state === 'fly') {
        g.lineStyle(2, 0xff6a6a, 0.6); g.strokeCircle(swarm.tx, swarm.ty, BITE_R);
        g.lineStyle(1, 0xff6a6a, 0.3); g.strokeCircle(swarm.tx, swarm.ty, BITE_R * (0.5 + 0.5 * Math.sin(time / 100)));
      }
    },

    drawAir(g, time) {
      // The dark, cell by cell, thinned where light falls.
      for (let y = top; y < H; y += CELL) {
        for (let x = 0; x < W; x += CELL) {
          const a = DARK * (1 - lightAt(x + CELL / 2, y + CELL / 2, time));
          if (a < 0.02) continue;
          g.fillStyle(0x020206, a); g.fillRect(x, y, CELL, CELL);
        }
      }
      // Glowworm specks on the roof.
      for (const w of worms) { g.fillStyle(GLOW, 0.5 + Math.sin(time / 300 + w.x) * 0.3); g.fillCircle(w.x, w.y, 1.4); }
      // The swarm: always seen by its eyes, and by its wings when it is near light.
      const n = bats.length;
      for (let i = 0; i < n; i++) {
        const b = bats[i];
        const spin = time / (swarm.state === 'bite' ? 160 : 420);
        const a = b.a + spin * (i % 2 ? 1 : -1);
        const x = swarm.x + Math.cos(a) * b.r * (swarm.state === 'bite' ? 1.8 : 1.2), y = swarm.y + Math.sin(a) * b.r * 0.8;
        bat(g, x, y, b.s, 0.5 + Math.sin(time / 50 + i) * 0.5);
      }
      if (swarm.state === 'bite') glow(g, swarm.x, swarm.y, BITE_R, 0xff4a4a, 0.03, 2);
      // A caster's afterglow on top of the dark.
      for (const f of [player, npc]) {
        const k = 1 - (time - (litAt.get(f) ?? -9999)) / LIT_MS;
        if (k <= 0 || !alive(f)) continue;
        g.lineStyle(2, f === player ? GLOW : 0xd8c8ff, k * 0.8); g.strokeCircle(f.x, f.y, 26 + (1 - k) * 10);
      }
    },
  };
}

export const SONAR: GimmickDef = {
  id: 'cavern-sonar',
  rules: 'The hollow is dark. Every cast pings, lighting the caster — and the bat swarm flies to the last ping and bites whoever is standing there.',
  make,
};
