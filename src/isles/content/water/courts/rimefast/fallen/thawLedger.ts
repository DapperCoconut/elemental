import type Phaser from 'phaser';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import { glow, shadow } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { Clock, R, RCOL, alive, dist, drawGlint, jit } from '../util';

/**
 * THE THAW LEDGER — Tithe-Clerk Ossery Penn (fortune).
 *
 * In Rimefast warmth is licensed, and in the star's telling the clerk who keeps the Thaw Tithe
 * ledger wrote every entry gladly. Here every spell you cast is warmth you have not paid for: it
 * goes into the ledger as a line of arrears, and arrears weigh on you — every unpaid line makes
 * your cooldowns crawl. Thaw coins lie on the ice; walk over one while you owe and it pays a line
 * off. Run up six lines and you are in default: a ring of tithe-ice rises round where you stand,
 * and if you are still inside when it closes you are sealed in like a debtor's door.
 *
 * The clerk keeps a ledger too, and he casts far more than you. Hit him and his purse spills coins
 * you can snatch before he does; starve him and watch his own ring close. Halfway down he turns
 * to double-entry: every coin anyone picks up pays their line and writes one into the other's.
 */

type Side = 'player' | 'npc';

interface Coin { x: number; y: number; fromX: number; fromY: number; born: number; seed: number }
interface Seal { x: number; y: number; t0: number }
interface Body { side: Side; arrears: number; seal: Seal | null; sealedUntil: number; lastLine: number }

const MAX_LINES = 6;
const SEAL_R = 72;
const SEAL_WARN = 1350;
const SEALED_MS = 1500;
const PICK_R = 30;
const TOSS_MS = 420;
const SPILL_EVERY = 38;

export const FALLEN_THAW_LEDGER: GimmickDef = {
  id: fallenId('rimefast', 'thaw-ledger'),
  rules: 'Every cast is a line of arrears that slows your cooldowns; thaw coins pay lines off. Six lines and the tithe-ice rings you in. His ledger too.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const clock = new Clock();
    const { W, H, top, tk, rng } = ctx;
    const coins: Coin[] = [];
    const bodies: Body[] = (['player', 'npc'] as Side[]).map((side) => ({ side, arrears: 1, seal: null, sealedUntil: 0, lastLine: -9999 }));
    const fighterOf = (s: Side): Fighter => (s === 'player' ? ctx.player : ctx.npc);
    const bodyOf = (s: Side): Body => bodies[s === 'player' ? 0 : 1];
    const other = (s: Side): Side => (s === 'player' ? 'npc' : 'player');
    let now = 0;
    let nextCoin = 1200;
    let doubleEntry = false;
    let spillAcc = 0;

    const drop = (x: number, y: number, fromX = x, fromY = y): void => {
      if (coins.length >= 9) return;
      coins.push({ x: tk.clampX(x, 60), y: tk.clampY(Math.max(top + 50, y), 50), fromX, fromY, born: now, seed: rng() * 100 });
    };

    /** A cast writes one line into that fighter's column; the sixth line calls in the debt. */
    const writeLine = (s: Side): void => {
      const b = bodyOf(s);
      if (b.seal || b.sealedUntil > now) return;
      b.arrears = Math.min(MAX_LINES, b.arrears + 1);
      b.lastLine = now;
      if (b.arrears >= MAX_LINES) {
        const f = fighterOf(s);
        b.seal = { x: f.x, y: f.y, t0: now };
        tk.sfx('status-debuff');
        ctx.float(f.x, f.y - 56, s === 'player' ? 'IN DEFAULT — GET OUT' : 'PENN IS IN DEFAULT', s === 'player' ? RCOL.red : RCOL.green);
      }
    };

    const closeSeal = (b: Body): void => {
      const f = fighterOf(b.side), s = b.seal;
      if (!s) return;
      b.seal = null;
      b.arrears = 3;
      ctx.sfx('ice-shatter');
      if (alive(f) && dist(f.x, f.y, s.x, s.y) < SEAL_R) {
        b.sealedUntil = now + SEALED_MS;
        ctx.root(f, SEALED_MS);
        ctx.hit(f, 18, f.x, f.y);
        ctx.flash(f.x, f.y, R.rime);
        ctx.float(f.x, f.y - 56, b.side === 'player' ? 'SEALED FOR ARREARS' : 'SEALED IN HIS OWN ICE', b.side === 'player' ? RCOL.red : RCOL.green);
      } else ctx.float(s.x, s.y - 40, 'SLIPPED THE SEAL', RCOL.frost);
    };

    return {
      update(time: number) {
        const dt = clock.tick(time);
        now = time;
        if (dt === 0) return;
        if (!doubleEntry && ctx.npc.hp < ctx.npc.maxHp * 0.5) {
          doubleEntry = true;
          ctx.banner('DOUBLE-ENTRY — every coin you take is written into the other column', RCOL.warm);
          ctx.sfx('money');
        }
        if (time >= nextCoin) {
          if (coins.length < 5) drop(60 + rng() * (W - 120), top + 60 + rng() * (H - top - 110));
          nextCoin = time + 2300;
        }
        for (const b of bodies) {
          if (b.seal && time - b.seal.t0 >= SEAL_WARN) closeSeal(b);
          const f = fighterOf(b.side);
          if (!alive(f) || b.arrears <= 0) continue;
          for (let i = coins.length - 1; i >= 0; i--) {
            const c = coins[i];
            if (time - c.born < TOSS_MS || dist(f.x, f.y, c.x, c.y) > PICK_R) continue;
            coins.splice(i, 1);
            b.arrears--;
            ctx.sfx('money');
            ctx.float(c.x, c.y - 30, 'PAID', b.side === 'player' ? RCOL.hot : RCOL.steel);
            if (doubleEntry) {
              const o = bodyOf(other(b.side));
              if (!o.seal && o.sealedUntil <= time) writeLine(other(b.side));
            }
            break;
          }
        }
      },

      onPlayerCast() { writeLine('player'); },
      onNpcCast() { writeLine('npc'); },
      onNpcHurt(amount: number) {
        // His purse: every few good blows shakes a coin loose, tossed a stride away from him.
        spillAcc += amount;
        while (spillAcc >= SPILL_EVERY) {
          spillAcc -= SPILL_EVERY;
          const a = rng() * Math.PI * 2, d = 70 + rng() * 50;
          drop(ctx.npc.x + Math.cos(a) * d, ctx.npc.y + Math.sin(a) * d, ctx.npc.x, ctx.npc.y);
          ctx.sfx('jackpot');
        }
      },

      playerCooldownRate: () => 1 - bodyOf('player').arrears * 0.085,
      npcCooldownRate: () => 1 - bodyOf('npc').arrears * 0.085,

      npcSeek(): Pt | null {
        const n = ctx.npc, me = bodyOf('npc');
        // A ring rising round him: straight out of it, away from its middle.
        if (me.seal) {
          const a = Math.atan2(n.y - me.seal.y, n.x - me.seal.x) || 0.5;
          return { x: tk.clampX(me.seal.x + Math.cos(a) * (SEAL_R + 60)), y: tk.clampY(me.seal.y + Math.sin(a) * (SEAL_R + 60)) };
        }
        // Owing: the nearest coin — and he knows his own spilled ones land close.
        if (me.arrears >= 2 && coins.length) {
          let best: Coin | null = null, bd = Infinity;
          for (const c of coins) { const d = dist(c.x, c.y, n.x, n.y); if (d < bd) { bd = d; best = c; } }
          if (best && bd < 420) return { x: best.x, y: best.y };
        }
        // You are being sealed: stand at the ring's mouth to meet you coming out.
        const yours = bodyOf('player').seal;
        if (yours) return { x: tk.clampX(yours.x + 120), y: tk.clampY(yours.y) };
        return null;
      },

      drawGround(g: Phaser.GameObjects.Graphics, time: number) {
        const t = time / 1000;
        for (const c of coins) {
          const k = Math.min(1, (time - c.born) / TOSS_MS);
          if (k < 1) continue;
          // Melted in: a dark wet ring where the warm coin sank a little into the ice.
          g.fillStyle(R.iceDark, 0.35); g.fillEllipse(c.x, c.y + 3, 30, 14);
          g.fillStyle(R.water, 0.25); g.fillEllipse(c.x, c.y + 3, 22, 9);
          g.lineStyle(1, R.iceLit, 0.6); g.strokeEllipse(c.x, c.y + 3, 32, 15);
          const p = (t * 0.7 + c.seed) % 1;
          g.lineStyle(1, R.brass, 0.4 * (1 - p)); g.strokeEllipse(c.x, c.y + 3, 30 + p * 26, 14 + p * 12);
        }
        // Rings of tithe-ice: blocks pushing up through the floor round a debtor.
        for (const b of bodies) {
          const s = b.seal;
          if (!s) continue;
          const k = Math.min(1, (time - s.t0) / SEAL_WARN);
          g.fillStyle(R.blackIce, 0.18 + k * 0.2); g.fillCircle(s.x, s.y, SEAL_R);
          g.lineStyle(2, b.side === 'player' ? R.scarf : R.livery, 0.5 + k * 0.4);
          g.beginPath(); g.arc(s.x, s.y, SEAL_R + 6, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
          // Cracks running inward from each block.
          for (let i = 0; i < 10; i++) {
            const a = (i / 10) * Math.PI * 2;
            g.lineStyle(1.2, R.blackIce, 0.6 * k);
            g.lineBetween(s.x + Math.cos(a) * SEAL_R, s.y + Math.sin(a) * SEAL_R, s.x + Math.cos(a + 0.2) * SEAL_R * (1 - k * 0.5), s.y + Math.sin(a + 0.2) * SEAL_R * (1 - k * 0.5));
          }
        }
      },

      drawAir(g: Phaser.GameObjects.Graphics, time: number) {
        const t = time / 1000;
        for (const c of coins) {
          const k = Math.min(1, (time - c.born) / TOSS_MS);
          const x = c.fromX + (c.x - c.fromX) * k, y = c.fromY + (c.y - c.fromY) * k - Math.sin(k * Math.PI) * 50;
          drawThawCoin(g, x, y, t, c.seed, k < 1);
        }
        // Seal blocks: rough-cut ice cubes rising out of the ring, lit on top, dark down the face.
        for (const b of bodies) {
          const s = b.seal;
          const sealed = b.sealedUntil > time;
          if (!s && !sealed) continue;
          const f = fighterOf(b.side);
          const cx = s ? s.x : f.x, cy = s ? s.y : f.y;
          const k = s ? Math.min(1, (time - s.t0) / SEAL_WARN) : 1;
          for (let i = 0; i < 10; i++) {
            const a = (i / 10) * Math.PI * 2 + 0.15;
            const bx = cx + Math.cos(a) * SEAL_R, by = cy + Math.sin(a) * SEAL_R * 0.86;
            const h = 6 + k * 34 + jit(i, 3) * 6;
            const w = 26;
            g.fillStyle(R.iceDark, 0.9); g.fillRect(bx - w / 2, by - h, w, h);
            g.fillStyle(R.ice, 0.9); g.fillRect(bx - w / 2 + 2, by - h, w - 6, h - 3);
            g.fillStyle(R.iceLit, 1); g.fillRect(bx - w / 2, by - h - 6, w, 7);
            g.lineStyle(1, R.glassLit, 0.8); g.lineBetween(bx - w / 2 + 4, by - h + 3, bx - w / 2 + 4, by - 4);
          }
          if (sealed) {
            // The lid of frost glazed over the top, and the clerk's tithe-stamp on it.
            g.fillStyle(R.rime, 0.35); g.fillEllipse(cx, cy - 40, SEAL_R * 2, SEAL_R * 0.9);
            g.lineStyle(2, R.glassLit, 0.7); g.strokeEllipse(cx, cy - 40, SEAL_R * 2, SEAL_R * 0.9);
            g.lineStyle(2, R.livery, 0.9); g.strokeCircle(cx, cy - 40, 12);
            drawGlint(g, cx, cy - 40, 7, 0.8);
          }
        }
        // His arrears hang over him as a short stack of unpaid tokens.
        const n = ctx.npc, nb = bodyOf('npc');
        if (alive(n)) for (let i = 0; i < nb.arrears; i++) {
          const y = n.y - 50 - i * 5;
          g.fillStyle(R.livery, 1); g.fillEllipse(n.x + 26, y + 1.5, 16, 6);
          g.fillStyle(i >= 4 ? R.scarf : R.kelp, 1); g.fillEllipse(n.x + 26, y, 16, 6);
        }
        if (time - bodyOf('player').lastLine < 300) glow(g, ctx.player.x, ctx.player.y - 10, 26, R.scarf, 0.05, 3);
      },

      drawHud(g: Phaser.GameObjects.Graphics, time: number) {
        // The Thaw Ledger, open at your page and his: one inked line per unpaid warmth.
        const x = 14, y = H - 104;
        shadow(g, x + 92, y + 92, 190, 14, 0.4);
        g.fillStyle(R.livery, 1); g.fillRoundedRect(x - 6, y - 6, 196, 104, 6);
        g.fillStyle(0xe8dcc0, 1); g.fillRect(x, y, 90, 92); g.fillRect(x + 94, y, 90, 92);
        g.fillStyle(0xcfc2a2, 1); g.fillRect(x + 86, y, 8, 92);
        for (let p = 0; p < 2; p++) {
          const b = bodies[p];
          const px = x + p * 94;
          // Page heading: a little drawn hand (yours) or quill (his).
          if (p === 0) { g.fillStyle(0x6a5a4a, 1); g.fillCircle(px + 45, y + 9, 4); g.fillRect(px + 41, y + 9, 8, 5); }
          else { g.lineStyle(2, 0x3a3230, 1); g.lineBetween(px + 38, y + 14, px + 52, y + 4); g.fillStyle(0xe0e0e0, 1); g.fillTriangle(px + 48, y + 7, px + 54, y + 2, px + 52, y + 9); }
          for (let i = 0; i < MAX_LINES; i++) {
            const ly = y + 22 + i * 11;
            g.lineStyle(1, 0xb0a080, 0.7); g.lineBetween(px + 6, ly + 4, px + 84, ly + 4);
            if (i < b.arrears) {
              const danger = b.arrears >= MAX_LINES - 1;
              g.lineStyle(2, danger ? 0x9a2a2a : 0x2a2a3a, 0.95);
              g.lineBetween(px + 8, ly + 2, px + 50 + jit(i, p) * 26, ly + 1 + jit(p, i) * 2);
              g.fillStyle(R.kelp, 1); g.fillCircle(px + 78, ly + 1, 3.2);
            }
          }
          if (b.seal && Math.floor(time / 160) % 2 === 0) { g.lineStyle(2, 0x9a2a2a, 0.9); g.strokeRect(px + 1, y + 1, 88, 90); }
        }
        // The clock-hand of your cooldowns: slows as the page fills.
        const rate = 1 - bodyOf('player').arrears * 0.085;
        const cx = x + 214, cy = y + 46;
        g.fillStyle(0x000000, 0.45); g.fillCircle(cx, cy, 20);
        g.lineStyle(2, R.brass, 1); g.strokeCircle(cx, cy, 18);
        const a = (time / 1000) * Math.PI * rate;
        g.lineStyle(2, rate < 0.65 ? R.scarf : R.iceLit, 1); g.lineBetween(cx, cy, cx + Math.cos(a) * 14, cy + Math.sin(a) * 14);
        g.beginPath(); g.arc(cx, cy, 22, -Math.PI / 2, -Math.PI / 2 + rate * Math.PI * 2, false); g.strokePath();
      },
    };
  },
};

/** A thaw coin: stamped gold with a crowned snowflake, frost on its rim, spinning while it flies. */
function drawThawCoin(g: Phaser.GameObjects.Graphics, x: number, y: number, t: number, seed: number, flying: boolean): void {
  const squash = flying ? Math.abs(Math.cos(t * 14 + seed)) * 0.8 + 0.2 : 1;
  const bob = flying ? 0 : Math.sin(t * 2 + seed) * 1.5;
  const w = 20 * squash;
  if (!flying) glow(g, x, y - 6 + bob, 20, R.brass, 0.05, 3);
  g.fillStyle(0x7a5a1a, 1); g.fillEllipse(x, y - 5 + bob, w + 2, 22);
  g.fillStyle(R.brass, 1); g.fillEllipse(x, y - 6 + bob, w, 20);
  g.fillStyle(0xf0d070, 1); g.fillEllipse(x - w * 0.1, y - 7 + bob, w * 0.72, 14);
  if (squash > 0.6) {
    // The stamp: a six-armed snowflake under a three-point crown.
    g.lineStyle(1, 0x8a6a20, 1);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI;
      g.lineBetween(x - Math.cos(a) * 5 * squash, y - 5 + bob - Math.sin(a) * 5, x + Math.cos(a) * 5 * squash, y - 5 + bob + Math.sin(a) * 5);
    }
    g.fillStyle(0x8a6a20, 1); g.fillTriangle(x - 4 * squash, y - 12 + bob, x + 4 * squash, y - 12 + bob, x, y - 15 + bob);
  }
  g.fillStyle(R.frost, 0.8); g.fillCircle(x + w * 0.35, y - 12 + bob, 1.4);
}
