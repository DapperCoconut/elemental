import Phaser from 'phaser';
import type { EncounterGimmick, Fighter, GimmickCtx, GimmickDef, Pt } from './shared';
import { live } from './shared';
import { BLUE, BLUE_LIT, GREY, INK, INK_SOFT, PAPER, WHITE } from '../palette';
import { CSS_BLUE_LIT, CSS_PAPER } from '../palette';
import { hatchRect, polyline, splashRing } from '../inkArt';

/**
 * Squid Pens — Squidherder Murk's fight.
 *
 * Four netted pens are sunk in the corners of the floor, a milked squid in each. A squid notices
 * anyone who comes near its pen, swells up (it visibly fills with black), and spits a glob of ink
 * at where they are standing. The glob lands as a **cloud**: inside one, the world goes dark round
 * you — the player sees only a small circle, and a blinded Murk loses you and swings wide (his
 * hits land at 55%). Clouds drift and thin out after a few seconds.
 *
 * Murk smells of herring, so his girls never spit at him; and every few seconds he **whistles**,
 * and the squid nearest you fires whatever the distance. But herring is the whole trick: a bucket
 * of herring heads turns up on the floor now and then. Whoever grabs it smells of fish for a
 * while — the squids leave them alone and go looking for the *other* one. Get to the bucket first
 * and Murk's own pens will hunt him.
 */

const PEN_W = 120;
const PEN_H = 84;
const NOTICE_R = 175;
const SWELL_MS = 720;
const FLIGHT_MS = 520;
const CLOUD_R = 92;
const HERRING_MS = 7000;
const BUCKET_EVERY = 9000;

interface Squid { x: number; y: number; state: 'idle' | 'swell'; at: number; target: Pt; who: 'p' | 'n'; readyAt: number; face: number }
interface Glob { fx: number; fy: number; tx: number; ty: number; at: number }
interface Cloud { x: number; y: number; born: number; dieAt: number; vx: number; vy: number; seed: number }

export const SQUID_PENS: GimmickDef = {
  id: 'inkwell-squid-pens',
  rules: 'Squids spit ink at anyone near their pens; inside a cloud you cannot see. Grab the herring and they hunt the other one.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const { W, H, top, hard } = ctx;
    const reload = hard ? 2600 : 3300;
    const cloudLife = hard ? 6000 : 5000;
    const splashDmg = hard ? 9 : 7;
    const whistleEvery = hard ? 6000 : 7500;

    const squids: Squid[] = [
      { x: 130, y: top + 80 }, { x: W - 130, y: top + 80 }, { x: 130, y: H - 70 }, { x: W - 130, y: H - 70 },
    ].map((p, i) => ({ ...p, state: 'idle' as const, at: 0, target: { x: 0, y: 0 }, who: 'p' as const, readyAt: ctx.scene.time.now + 1500 + i * 500, face: 0 }));
    let globs: Glob[] = [];
    let clouds: Cloud[] = [];
    let bucket: (Pt & { at: number }) | null = null;
    let bucketAt = ctx.scene.time.now + 4000;
    const herring = { p: 0, n: 0 };
    const inked = { p: false, n: false };
    let whistleAt = ctx.scene.time.now + whistleEvery;
    let whistleFx = -99999;
    let wander: Pt = { x: W / 2, y: (top + H) / 2 };

    const fOf = (k: 'p' | 'n'): Fighter => (k === 'p' ? ctx.player : ctx.npc);
    const inCloud = (x: number, y: number): boolean =>
      clouds.some((c) => Phaser.Math.Distance.Between(x, y, c.x, c.y) < CLOUD_R * 0.85);
    const smells = (k: 'p' | 'n', t: number): boolean => herring[k] > t || (k === 'n' && herring.p <= t);

    const swell = (s: Squid, k: 'p' | 'n', time: number): void => {
      const f = fOf(k);
      s.state = 'swell';
      s.at = time;
      s.who = k;
      s.target = { x: Phaser.Math.Clamp(f.x, 40, W - 40), y: Phaser.Math.Clamp(f.y, top + 30, H - 30) };
      ctx.sfx('bubble');
    };

    return {
      update(time, dt) {
        // Squids: notice, swell, spit.
        for (const s of squids) {
          if (s.state === 'swell') {
            if (time - s.at >= SWELL_MS) {
              s.state = 'idle';
              s.readyAt = time + reload;
              globs.push({ fx: s.x, fy: s.y - 10, tx: s.target.x, ty: s.target.y, at: time });
              ctx.sfx('slime-splat');
            }
            continue;
          }
          if (time < s.readyAt) continue;
          // Who is in reach and does not smell of herring? (Murk always does, unless you do.)
          let pick: 'p' | 'n' | null = null;
          let best = Infinity;
          for (const k of ['p', 'n'] as const) {
            const f = fOf(k);
            if (!live(f) || smells(k, time)) continue;
            const r = herring[k === 'p' ? 'n' : 'p'] > time ? NOTICE_R * 1.5 : NOTICE_R;
            const d = Phaser.Math.Distance.Between(f.x, f.y, s.x, s.y);
            if (d < r && d < best) { best = d; pick = k; }
          }
          if (pick) swell(s, pick, time);
          s.face = Math.atan2(ctx.player.y - s.y, ctx.player.x - s.x);
        }

        // Murk's whistle: the squid nearest the player fires, however far.
        if (time >= whistleAt) {
          whistleAt = time + whistleEvery;
          if (herring.p <= time) {
            const p = ctx.player;
            const s = squids.slice().sort((a, b) => Phaser.Math.Distance.Between(a.x, a.y, p.x, p.y) - Phaser.Math.Distance.Between(b.x, b.y, p.x, p.y))[0];
            if (s && s.state === 'idle') {
              swell(s, 'p', time);
              whistleFx = time;
              ctx.float(ctx.npc.x, ctx.npc.y - 46, 'WHEEEET!', CSS_PAPER);
            }
          }
        }

        // Globs land and bloom into clouds.
        globs = globs.filter((gl) => {
          if (time - gl.at < FLIGHT_MS) return true;
          ctx.sfx('splash');
          clouds.push({
            x: gl.tx, y: gl.ty, born: time, dieAt: time + cloudLife,
            vx: (ctx.rng() - 0.5) * 18, vy: (ctx.rng() - 0.5) * 12, seed: Math.floor(ctx.rng() * 999),
          });
          for (const k of ['p', 'n'] as const) {
            const f = fOf(k);
            if (live(f) && Phaser.Math.Distance.Between(f.x, f.y, gl.tx, gl.ty) < 44) ctx.hit(f, splashDmg, f.x, f.y);
          }
          return false;
        });
        for (const c of clouds) {
          c.x = Phaser.Math.Clamp(c.x + c.vx * dt, 30, W - 30);
          c.y = Phaser.Math.Clamp(c.y + c.vy * dt, top + 20, H - 20);
        }
        clouds = clouds.filter((c) => time < c.dieAt);

        // The herring bucket.
        if (!bucket && time >= bucketAt) {
          for (let i = 0; i < 8; i++) {
            const x = 200 + ctx.rng() * (W - 400), y = top + 80 + ctx.rng() * (H - top - 160);
            if (!inCloud(x, y)) { bucket = { x, y, at: time }; break; }
          }
          if (bucket) { ctx.float(bucket.x, bucket.y - 30, 'HERRING!', CSS_BLUE_LIT); ctx.sfx('splash'); }
          else bucketAt = time + 1500;
        }
        if (bucket) {
          for (const k of ['p', 'n'] as const) {
            const f = fOf(k);
            if (!live(f) || Phaser.Math.Distance.Between(f.x, f.y, bucket.x, bucket.y) > 34) continue;
            herring[k] = time + HERRING_MS;
            ctx.float(f.x, f.y - 44, k === 'p' ? 'YOU SMELL OF HERRING' : 'MURK GRABS THE HERRING', CSS_PAPER);
            ctx.sfx('status-buff');
            bucket = null;
            bucketAt = time + BUCKET_EVERY;
            break;
          }
        }

        // Who is inked.
        for (const k of ['p', 'n'] as const) {
          const f = fOf(k);
          const now = live(f) && inCloud(f.x, f.y);
          if (now && !inked[k] && k === 'n') ctx.float(f.x, f.y - 40, 'MURK IS BLIND', CSS_BLUE_LIT);
          inked[k] = now;
        }
      },

      /** A blinded Murk swings at where you were. */
      playerTakenMult: () => (inked.n ? 0.55 : 1),

      npcSeek() {
        const n = ctx.npc, p = ctx.player;
        const t = ctx.scene.time.now;
        if (inked.n) {
          // Blind: blunder about in the cloud until he finds its edge.
          if (Phaser.Math.Distance.Between(n.x, n.y, wander.x, wander.y) < 26) {
            wander = { x: Phaser.Math.Clamp(n.x + (ctx.rng() - 0.5) * 260, 60, W - 60), y: Phaser.Math.Clamp(n.y + (ctx.rng() - 0.5) * 200, top + 40, H - 40) };
          }
          return wander;
        }
        // Herring first, if he can get there before you.
        if (bucket) {
          const dn = Phaser.Math.Distance.Between(n.x, n.y, bucket.x, bucket.y);
          const dp = Phaser.Math.Distance.Between(p.x, p.y, bucket.x, bucket.y);
          if (dn < dp * 1.3) return bucket;
        }
        // You smell of herring: his own girls are after him. Stay clear of every pen.
        if (herring.p > t) {
          const s = squids.slice().sort((a, b) => Phaser.Math.Distance.Between(a.x, a.y, n.x, n.y) - Phaser.Math.Distance.Between(b.x, b.y, n.x, n.y))[0];
          if (s && Phaser.Math.Distance.Between(s.x, s.y, n.x, n.y) < NOTICE_R * 1.6) {
            const a = Math.atan2(n.y - s.y, n.x - s.x);
            return { x: s.x + Math.cos(a) * NOTICE_R * 1.8, y: s.y + Math.sin(a) * NOTICE_R * 1.8 };
          }
          return null;
        }
        // Herd: stand on the far side of you from the nearest pen, so retreating takes you to it.
        const s = squids.slice().sort((a, b) => Phaser.Math.Distance.Between(a.x, a.y, p.x, p.y) - Phaser.Math.Distance.Between(b.x, b.y, p.x, p.y))[0];
        if (!s) return null;
        const a = Math.atan2(p.y - s.y, p.x - s.x);
        return { x: Phaser.Math.Clamp(p.x + Math.cos(a) * 150, 60, W - 60), y: Phaser.Math.Clamp(p.y + Math.sin(a) * 120, top + 40, H - 40) };
      },

      drawGround(g, time) {
        // Pens: plank frames, black water, a net.
        for (const s of squids) {
          const x0 = s.x - PEN_W / 2, y0 = s.y - PEN_H / 2;
          g.fillStyle(INK, 1); g.fillRect(x0 - 8, y0 - 8, PEN_W + 16, PEN_H + 16);
          g.fillStyle(WHITE, 1);
          g.fillRect(x0 - 6, y0 - 6, PEN_W + 12, 6); g.fillRect(x0 - 6, y0 + PEN_H, PEN_W + 12, 6);
          g.fillRect(x0 - 6, y0 - 6, 6, PEN_H + 12); g.fillRect(x0 + PEN_W, y0 - 6, 6, PEN_H + 12);
          g.lineStyle(1, INK, 0.7);
          for (let k = x0; k < x0 + PEN_W; k += 14) { g.lineBetween(k, y0 - 6, k, y0); g.lineBetween(k, y0 + PEN_H, k, y0 + PEN_H + 6); }
          g.fillStyle(INK, 1); g.fillRect(x0, y0, PEN_W, PEN_H);
          g.lineStyle(1, GREY, 0.45);
          for (let k = 10; k < PEN_W; k += 14) g.lineBetween(x0 + k, y0, x0 + k, y0 + PEN_H);
          for (let k = 10; k < PEN_H; k += 14) g.lineBetween(x0, y0 + k, x0 + PEN_W, y0 + k);
          // The squid's notice radius, a dotted blue rule round the pen.
          g.fillStyle(BLUE, 0.35);
          for (let i = 0; i < 40; i++) {
            const a = (i / 40) * Math.PI * 2 + time / 4000;
            g.fillCircle(s.x + Math.cos(a) * NOTICE_R, s.y + Math.sin(a) * NOTICE_R, 1.6);
          }
        }
        // Where each spit will land.
        for (const s of squids) {
          if (s.state !== 'swell') continue;
          const k = Phaser.Math.Clamp((time - s.at) / SWELL_MS, 0, 1);
          g.lineStyle(2, INK, 0.4 + 0.5 * k); g.strokeCircle(s.target.x, s.target.y, 44);
          hatchRect(g, { x: s.target.x - 30, y: s.target.y - 30, w: 60, h: 60 }, 6, INK, 0.12 + k * 0.2);
          g.lineStyle(1, BLUE, 0.6); g.strokeCircle(s.target.x, s.target.y, CLOUD_R * (0.3 + 0.7 * k));
        }
        for (const gl of globs) {
          g.lineStyle(2, INK, 0.7); g.strokeCircle(gl.tx, gl.ty, 44);
        }
        // Herring bucket: a pail, heads sticking out, a blue tag.
        if (bucket) {
          const b = bucket;
          const bob = Math.sin(time / 180) * 1.5;
          g.fillStyle(INK, 0.3); g.fillEllipse(b.x, b.y + 12, 40, 12);
          g.fillStyle(INK, 1); g.fillRect(b.x - 15, b.y - 14 + bob, 30, 26);
          g.fillStyle(WHITE, 1); g.fillRect(b.x - 12, b.y - 11 + bob, 24, 20);
          g.lineStyle(1.5, INK, 1); g.lineBetween(b.x - 12, b.y - 3 + bob, b.x + 12, b.y - 3 + bob);
          for (const hx of [-7, 2, 8]) {
            g.fillStyle(WHITE, 1); g.fillTriangle(b.x + hx - 4, b.y - 12 + bob, b.x + hx + 4, b.y - 12 + bob, b.x + hx, b.y - 24 + bob);
            g.lineStyle(1.2, INK, 1); g.strokeTriangle(b.x + hx - 4, b.y - 12 + bob, b.x + hx + 4, b.y - 12 + bob, b.x + hx, b.y - 24 + bob);
          }
          g.fillStyle(BLUE, 1); g.fillRect(b.x + 10, b.y - 2 + bob, 8, 6);
          g.lineStyle(1, BLUE_LIT, 0.4 + 0.3 * Math.sin(time / 120)); g.strokeCircle(b.x, b.y, 30);
        }
        // Herring stink: wavy lines rising off whoever carries it.
        for (const k of ['p', 'n'] as const) {
          if (herring[k] <= time) continue;
          const f = fOf(k);
          for (let i = 0; i < 3; i++) {
            const ph = ((time / 900) + i / 3) % 1;
            const pts: Pt[] = [];
            for (let j = 0; j <= 5; j++) pts.push({ x: f.x - 12 + i * 12 + Math.sin(j * 1.4 + time / 200) * 3, y: f.y - 30 - ph * 30 - j * 4 });
            g.lineStyle(1.2, INK, 0.6 * (1 - ph)); polyline(g, pts);
          }
        }
      },

      drawAir(g, time) {
        // Squids: a white mantle that fills black as it swells, tracking eyes, waving arms.
        for (const s of squids) {
          const sw = s.state === 'swell' ? Phaser.Math.Clamp((time - s.at) / SWELL_MS, 0, 1) : 0;
          const R = 15 + sw * 7;
          for (let a = 0; a < 6; a++) {
            const base = Math.PI / 2 + (a - 2.5) * 0.34;
            const pts: Pt[] = [];
            for (let k = 0; k <= 5; k++) {
              const d = 10 + k * 6;
              pts.push({ x: s.x + Math.cos(base) * d + Math.sin(time / 260 + a + k) * k, y: s.y + 8 + Math.sin(base) * d * 0.7 });
            }
            g.lineStyle(4, INK, 1); polyline(g, pts);
            g.lineStyle(2, WHITE, 1); polyline(g, pts);
          }
          g.fillStyle(WHITE, 1); g.fillEllipse(s.x, s.y - 6, R * 1.6, R * 2.2);
          if (sw > 0) { g.fillStyle(INK, 0.3 + sw * 0.7); g.fillEllipse(s.x, s.y - 6 + R * (1 - sw) * 0.6, R * 1.6 * sw, R * 2.2 * sw); }
          g.lineStyle(2.5, INK, 1); g.strokeEllipse(s.x, s.y - 6, R * 1.6, R * 2.2);
          for (const ex of [-6, 6]) {
            g.fillStyle(WHITE, 1); g.fillEllipse(s.x + ex, s.y + 2, 9, 11);
            g.lineStyle(1.3, INK, 1); g.strokeEllipse(s.x + ex, s.y + 2, 9, 11);
            g.fillStyle(INK, 1); g.fillCircle(s.x + ex + Math.cos(s.face) * 2, s.y + 3 + Math.sin(s.face) * 2, 2.6);
          }
        }
        // Globs in flight: an arcing black drop with a white glint.
        for (const gl of globs) {
          const k = Phaser.Math.Clamp((time - gl.at) / FLIGHT_MS, 0, 1);
          const x = gl.fx + (gl.tx - gl.fx) * k, y = gl.fy + (gl.ty - gl.fy) * k - Math.sin(Math.PI * k) * 110;
          g.fillStyle(INK, 1); g.fillCircle(x, y, 9);
          g.fillStyle(WHITE, 0.8); g.fillCircle(x - 3, y - 3, 2.5);
        }
        // Clouds: overlapping black puffs with white toon rims; they thin as they age.
        for (const c of clouds) {
          const age = time - c.born, left = c.dieAt - time;
          const grow = Phaser.Math.Clamp(age / 380, 0, 1);
          const fade = Phaser.Math.Clamp(left / 900, 0, 1);
          const R = CLOUD_R * (0.35 + 0.65 * grow);
          if (age < 300) splashRing(g, c.x, c.y, R * 1.2, 1 - age / 300, 12);
          for (let i = 0; i < 7; i++) {
            const a = (i / 7) * Math.PI * 2 + c.seed + time / 3000;
            const px = c.x + Math.cos(a) * R * 0.45, py = c.y + Math.sin(a) * R * 0.35;
            g.fillStyle(INK, 0.85 * fade); g.fillCircle(px, py, R * 0.55);
          }
          g.fillStyle(INK_SOFT, 0.9 * fade); g.fillCircle(c.x, c.y, R * 0.6);
          g.lineStyle(1.5, WHITE, 0.3 * fade);
          for (let i = 0; i < 3; i++) {
            const a = c.seed + i * 2 + time / 1400;
            g.beginPath(); g.arc(c.x + Math.cos(a) * R * 0.3, c.y + Math.sin(a) * R * 0.25, R * 0.3, a, a + 1.4, false); g.strokePath();
          }
        }
        // The whistle: notes flying from Murk.
        if (time - whistleFx < 700) {
          const k = (time - whistleFx) / 700;
          const n = ctx.npc;
          for (let i = 0; i < 3; i++) {
            const x = n.x + 14 + i * 12 + k * 30, y = n.y - 40 - i * 8 - k * 26;
            g.fillStyle(INK, 1 - k); g.fillEllipse(x, y, 7, 5);
            g.lineStyle(1.5, INK, 1 - k); g.lineBetween(x + 3, y, x + 3, y - 12);
          }
        }
      },

      drawHud(g, time) {
        // Inked: the world goes black round you but for a small circle.
        if (inked.p) {
          const p = ctx.player;
          const r = 74 + Math.sin(time / 300) * 4;
          g.lineStyle(1400, INK, 0.93); g.strokeCircle(p.x, p.y, r + 700);
          g.lineStyle(14, INK, 0.5); g.strokeCircle(p.x, p.y, r - 6);
          g.lineStyle(2, WHITE, 0.25); g.strokeCircle(p.x, p.y, r - 14);
        }
        // Herring timers.
        const x = W / 2, y = 108;
        for (const [k, dx] of [['p', -30], ['n', 30]] as const) {
          const left = Math.max(0, herring[k] - time) / HERRING_MS;
          g.fillStyle(INK, 0.6); g.fillRoundedRect(x + dx - 18, y - 8, 36, 16, 6);
          g.fillStyle(left > 0 ? BLUE : PAPER, 1); g.fillRoundedRect(x + dx - 15, y - 5, 30 * Math.max(0.08, left), 10, 4);
        }
        g.fillStyle(WHITE, 1); g.fillTriangle(x - 6, y - 4, x - 6, y + 4, x + 2, y);
        g.fillStyle(INK, 1); g.fillCircle(x + 5, y, 4);
      },
    };
  },
};
