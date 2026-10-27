import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, glow, lit } from '../../../../../art/IsleArt';
import { GINGER, GINGER_DARK, GINGER_PALE, ICING, IRON, dist, drips, gingerbreadMan } from '../art';

/**
 * Gingerbread — Baker Snap's bakehouse yard.
 *
 * The great oven stands at the top of the yard. Every few seconds it heats — the door glows, the
 * latch rattles — and then it bangs open and a batch of gingerbread men tumble out, still hot,
 * and run at *whoever is nearest*. Each one changes its mind the moment someone else is closer.
 * One that reaches you clings on and nibbles, and slows you; three on one fighter gang up and
 * go off together in a burst of hot crumb.
 *
 * Fighting crumbles them. Every blow you land on Snap jolts one off you (or scatters the nearest
 * one coming for you), and every blow he lands on you does the same for him.
 *
 * Snap knows his batch. When the oven heats he puts you between himself and the door; when they
 * come for him he runs past you, so you are the nearest. Do it back to him.
 */

const CYCLE_MS = 7000;
const CYCLE_HARD_MS = 5800;
const HEAT_MS = 1700;
const BATCH = 3;
const BATCH_HARD = 4;
const RUN_SPEED = 150;
const RETARGET_MS = 350;
const CLING_R = 24;
const NIBBLE_MS = 650;
const NIBBLE = 1.5;
const SLOW_PER = 0.1;
const GANG_AT = 3;
const GANG_DAMAGE = 18;
const GANG_HARD_DAMAGE = 22;
const GANG_STUN_MS = 600;
const STALE_MS = 13000;
const SCATTER_R = 220;

interface Man {
  x: number; y: number;
  target: Fighter;
  retargetAt: number;
  clingTo: Fighter | null;
  slot: number;
  bornAt: number;
  lastNibble: number;
  seed: number;
  frown: boolean;
}
interface Crumb { x: number; y: number; vx: number; vy: number; at: number; big: boolean }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, top, rng } = ctx;
  const door: Pt = { x: W / 2, y: top + 62 };
  const cycleMs = ctx.hard ? CYCLE_HARD_MS : CYCLE_MS;
  const batch = ctx.hard ? BATCH_HARD : BATCH;
  const gangDamage = ctx.hard ? GANG_HARD_DAMAGE : GANG_DAMAGE;

  let men: Man[] = [];
  let crumbs: Crumb[] = [];
  let heatAt = 2400;
  let openAt = heatAt + HEAT_MS;
  let bangAt = -9999;
  let announced = false;
  let selfHit = false;

  const nearestFighter = (x: number, y: number): Fighter => {
    const p = ctx.player, n = ctx.npc;
    const pd = p.active && p.hp > 0 ? dist(x, y, p.x, p.y) : Infinity;
    const nd = n.active && n.hp > 0 ? dist(x, y, n.x, n.y) : Infinity;
    return pd <= nd ? p : n;
  };
  const clingers = (f: Fighter): Man[] => men.filter((m) => m.clingTo === f);

  const crumble = (m: Man, big = false): void => {
    men = men.filter((q) => q !== m);
    const now = ctx.scene.time.now;
    for (let i = 0; i < (big ? 10 : 6); i++) {
      const a = rng() * Math.PI * 2, s = 40 + rng() * (big ? 160 : 90);
      crumbs.push({ x: m.x, y: m.y - 10, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, at: now, big: i < 2 });
    }
  };

  const hitSelf = (f: Fighter, n: number): void => {
    selfHit = true;
    try { ctx.hit(f, n, f.x, f.y); } finally { selfHit = false; }
  };

  /** A blow landed by `striker`: one of the gingerbread men on them (or after them) crumbles. */
  const jolt = (striker: Fighter): void => {
    const on = clingers(striker);
    let m: Man | null = on.length ? on[on.length - 1] : null;
    if (!m) {
      let bd = SCATTER_R;
      for (const q of men) {
        if (q.clingTo || q.target !== striker) continue;
        const d = dist(q.x, q.y, striker.x, striker.y);
        if (d < bd) { bd = d; m = q; }
      }
    }
    if (!m) return;
    crumble(m);
    ctx.sfx('hit-light');
    ctx.float(m.x, m.y - 30, 'CRUMBLED', striker === ctx.player ? '#ffe0b0' : '#c8a080');
  };

  return {
    update(time, dt) {
      if (!announced) { announced = true; ctx.banner('OVEN\'S HOT', '#ffcf9a'); }

      // The oven: heat, then bang, then a batch.
      if (time >= heatAt && time < openAt && time - dt * 1000 < heatAt) { ctx.sfx('countdown-tick'); ctx.float(door.x, door.y - 30, 'THE OVEN IS HEATING', '#ffb070'); }
      if (time >= openAt) {
        bangAt = time;
        ctx.sfx('explosion-small');
        ctx.scene.cameras.main.shake(100, 0.004);
        for (let i = 0; i < batch; i++) {
          const a = Math.PI * 0.5 + (i - (batch - 1) / 2) * 0.45;
          const x = door.x + Math.cos(a) * 26, y = door.y + Math.sin(a) * 18 + 10;
          men.push({ x, y, target: nearestFighter(x, y), retargetAt: time + 200, clingTo: null, slot: 0, bornAt: time, lastNibble: time, seed: rng() * 10, frown: rng() < 0.25 });
        }
        heatAt = time + cycleMs - HEAT_MS;
        openAt = time + cycleMs;
      }

      for (const m of [...men]) {
        if (time - m.bornAt > STALE_MS) { crumble(m); continue; }
        if (m.clingTo) {
          const f = m.clingTo;
          if (!f.active || f.hp <= 0) { crumble(m); continue; }
          const a = (m.slot / GANG_AT) * Math.PI * 2 + time / 900;
          m.x = f.x + Math.cos(a) * 20; m.y = f.y + 6 + Math.sin(a) * 9;
          if (time - m.lastNibble > NIBBLE_MS) { m.lastNibble = time; hitSelf(f, NIBBLE); }
          continue;
        }
        if (time >= m.retargetAt) { m.target = nearestFighter(m.x, m.y); m.retargetAt = time + RETARGET_MS; }
        const f = m.target;
        const d = dist(m.x, m.y, f.x, f.y + 6);
        if (d < CLING_R) {
          const on = clingers(f);
          m.clingTo = f; m.slot = on.length; m.lastNibble = time;
          ctx.sfx('hit-light');
          if (on.length + 1 >= GANG_AT) {
            // The gang goes off together.
            for (const q of [...on, m]) crumble(q, true);
            hitSelf(f, gangDamage);
            ctx.stun(f, GANG_STUN_MS);
            ctx.sfx('explosion-medium');
            ctx.float(f.x, f.y - 56, f === ctx.player ? 'GANGED UP!' : 'THEY GOT HIM!', f === ctx.player ? '#ff9a6a' : '#9df5c8');
            ctx.scene.cameras.main.shake(140, 0.006);
          }
          continue;
        }
        m.x += ((f.x - m.x) / d) * RUN_SPEED * dt;
        m.y += ((f.y + 6 - m.y) / d) * RUN_SPEED * dt;
      }

      for (const c of crumbs) { c.x += c.vx * dt; c.y += c.vy * dt; c.vy += 260 * dt; c.vx *= 0.96; }
      crumbs = crumbs.filter((c) => time - c.at < 700);
    },

    onNpcHurt() { if (!selfHit) jolt(ctx.player); },
    onPlayerHurt() { if (!selfHit) jolt(ctx.npc); },

    playerSpeedMult: () => Math.max(0.55, 1 - clingers(ctx.player).length * SLOW_PER),
    npcSpeedMult: () => Math.max(0.55, 1 - clingers(ctx.npc).length * SLOW_PER),

    npcSeek(): Pt | null {
      const n = ctx.npc, p = ctx.player;
      const now = ctx.scene.time.now;
      // The oven is heating: put the player between himself and the door.
      if (now >= heatAt && now < openAt + 300) {
        const ux = p.x - door.x, uy = p.y - door.y, l = Math.hypot(ux, uy) || 1;
        return { x: p.x + (ux / l) * 140, y: p.y + (uy / l) * 140 };
      }
      // Men running at him: run past the player so the player is nearest.
      const after = men.filter((m) => !m.clingTo && m.target === n);
      if (after.length) {
        const m = after[0];
        const ux = p.x - m.x, uy = p.y - m.y, l = Math.hypot(ux, uy) || 1;
        return { x: p.x + (ux / l) * 110, y: p.y + (uy / l) * 110 };
      }
      return null;
    },

    drawGround(g, time) {
      // The hearth apron before the oven door, scorched; a warm spill when it bangs.
      g.fillStyle(0x3a2418, 0.35); g.fillEllipse(door.x, door.y + 30, 230, 60);
      const k = (time - bangAt) / 600;
      if (k >= 0 && k < 1) { g.fillStyle(0xffa040, 0.3 * (1 - k)); g.fillEllipse(door.x, door.y + 40, 260 + k * 120, 70 + k * 30); }
      // Crumb trails behind running men.
      for (const m of men) {
        if (m.clingTo) continue;
        g.fillStyle(GINGER_PALE, 0.4);
        g.fillCircle(m.x + Math.sin(time / 60 + m.seed) * 4, m.y + 4, 1.6);
      }
    },

    drawAir(g, time) {
      const t = time / 1000;
      // The oven: a brick dome faced with gingerbread, piped round the door.
      const ox = door.x, oy = door.y;
      g.fillStyle(0x000000, 0.25); g.fillEllipse(ox, oy + 6, 220, 30);
      g.fillStyle(dim(0x8a3a24, 0.4), 1); g.fillEllipse(ox, oy - 26, 210, 120);
      g.fillStyle(0x8a3a24, 1); g.fillEllipse(ox, oy - 28, 200, 112);
      for (let r = 0; r < 4; r++) for (let c = 0; c < 9; c++) {
        const bx = ox - 88 + c * 22 + (r % 2) * 11, by = oy - 70 + r * 16;
        if (Math.hypot((bx - ox) / 100, (by - oy + 28) / 56) > 0.95) continue;
        g.lineStyle(1, 0x5a2414, 0.7); g.strokeRect(bx, by, 20, 13);
      }
      // Gingerbread facade and iced arch.
      g.fillStyle(GINGER_DARK, 1); g.fillRect(ox - 74, oy - 30, 148, 36);
      g.fillStyle(GINGER, 1); g.fillRect(ox - 70, oy - 28, 140, 32);
      drips(g, ox - 70, ox + 70, oy - 28, 6, () => 0.5);
      const heating = time >= heatAt && time < openAt;
      const hk = heating ? (time - heatAt) / HEAT_MS : 0;
      const open = time - bangAt < 900;
      // The mouth.
      g.fillStyle(open ? 0xffb050 : heating ? lit(0x6a2a10, hk * 0.6) : 0x2a140c, 1);
      g.fillRoundedRect(ox - 34, oy - 22, 68, 30, { tl: 16, tr: 16, bl: 0, br: 0 });
      if (heating || open) glow(g, ox, oy - 8, 50 + hk * 20, 0xff8a30, 0.05 + hk * 0.05, 4);
      // The iron door: shut and rattling while it heats, swung down when it bangs.
      if (!open) {
        const rattle = heating ? Math.sin(time / 30) * 2 * hk : 0;
        g.fillStyle(IRON, 1); g.fillRoundedRect(ox - 32 + rattle, oy - 20, 64, 28, { tl: 14, tr: 14, bl: 0, br: 0 });
        g.fillStyle(lit(IRON, 0.25), 1); g.fillRect(ox - 26 + rattle, oy - 14, 52, 3);
        g.fillStyle(0xd8c070, 1); g.fillCircle(ox + 20 + rattle, oy - 4, 3);
      } else {
        g.fillStyle(IRON, 1); g.fillRect(ox - 32, oy + 8, 64, 10);
        g.fillStyle(0xffd080, 0.6); for (let i = 0; i < 4; i++) g.fillCircle(ox - 18 + i * 12, oy - 6 - Math.sin(t * 9 + i) * 4, 3);
      }
      g.lineStyle(3, ICING, 1);
      g.beginPath(); g.arc(ox, oy - 6, 38, Math.PI, 0, false); g.strokePath();
      // Chimney smoke.
      for (let i = 0; i < 4; i++) {
        const ph = (t * 0.4 + i / 4) % 1;
        g.fillStyle(0xd8c8c0, 0.25 * (1 - ph)); g.fillCircle(ox + 60 + ph * 20, oy - 90 - ph * 40, 8 + ph * 12);
      }

      // Running and clinging men.
      for (const m of men) {
        const run = m.clingTo ? Math.sin(time / 90 + m.seed) * 0.4 : Math.sin(time / 70 + m.seed);
        const fresh = Math.min(1, (time - m.bornAt) / 200);
        gingerbreadMan(g, m.x, m.y, 12 * fresh, run, 1, m.frown || !!m.clingTo, m.target === ctx.player ? 0x4aa8f0 : 0xe0283c);
        if (!m.clingTo && time - m.bornAt < 900) {
          // Still steaming from the oven.
          g.fillStyle(0xffffff, 0.3 * (1 - (time - m.bornAt) / 900)); g.fillCircle(m.x, m.y - 30 - (time - m.bornAt) / 30, 5);
        }
      }
      // A gang count over anyone with men on them.
      for (const f of [ctx.player, ctx.npc]) {
        const n = clingers(f).length;
        if (!n || !f.active) continue;
        for (let i = 0; i < GANG_AT; i++) {
          const x = f.x - 12 + i * 12, y = f.y - 56;
          g.fillStyle(0x2a140c, 0.6); g.fillCircle(x, y, 5);
          if (i < n) { g.fillStyle(n === GANG_AT - 1 && Math.floor(time / 150) % 2 ? 0xff7040 : GINGER_PALE, 1); g.fillCircle(x, y, 4); }
        }
      }
      for (const c of crumbs) {
        const k = (time - c.at) / 700;
        g.fillStyle(c.big ? GINGER : GINGER_PALE, 1 - k); g.fillCircle(c.x, c.y, c.big ? 3.5 : 2);
      }
    },
  };
}

export const GINGERBREAD: GimmickDef = {
  id: 'confection-gingerbread',
  rules: 'The oven bangs open and gingerbread men run at whoever is NEAREST. Three on one fighter gang up and burst. Land hits to crumble yours.',
  make,
};
