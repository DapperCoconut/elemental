import Phaser from 'phaser';
import type { EncounterGimmick, Fighter, GimmickCtx, GimmickDef, Pt } from './shared';
import { lastPressWasClick, live } from './shared';
import { BLUE, BLUE_DEEP, BLUE_LIT, INK, PAPER, PAPER_SHADE, WHITE } from '../palette';
import { CSS_BLUE, CSS_BLUE_LIT, CSS_PAPER } from '../palette';
import { glyph, queenSeal } from '../inkArt';

/**
 * Decree — Herald Proclam's fight.
 *
 * Every few seconds Proclam reads a decree. "HEAR YE" is a short grace while the scroll unrolls;
 * then the decree is **in force** and whoever breaks it is fined in health, every half second:
 * • NO RUNNING — moving at more than a stroll (stand, or step and stop);
 * • NO STANDING STILL — stopping;
 * • NO MAGIC — casting any spell (basic attacks are allowed);
 * • NO STRIKING — landing a blow (you are fined half of it).
 *
 * As each decree is read the Queen's **seal** is pressed into the floor somewhere. Whoever stands
 * on the seal is "under seal" — above the law — and the seal admits one: the first there holds it
 * and shoulders the other off.
 *
 * Proclam keeps his own decrees, scrupulously — off the seal, he strolls when running is banned
 * and folds his hands when magic or striking is. That is the loophole: take the seal from him
 * during NO STRIKING and he will stand there and let you hit him.
 */

type DecreeId = 'run' | 'still' | 'magic' | 'strike';

const DECREES: Record<DecreeId, { text: string; short: string }> = {
  run: { text: 'NO RUNNING', short: 'stand, or step slowly' },
  still: { text: 'NO STANDING STILL', short: 'keep moving' },
  magic: { text: 'NO MAGIC', short: 'basic attacks only' },
  strike: { text: 'NO STRIKING', short: 'hands to yourself' },
};

const READ_MS = 1700;
const SEAL_R = 46;
const RUN_LIMIT = 110;
const STILL_LIMIT = 28;

export const DECREE: GimmickDef = {
  id: 'inkwell-decree',
  rules: 'Proclam reads a decree every few seconds; breaking it costs health. The seal on the floor puts its holder above the law.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const { W, H, top, hard } = ctx;
    const forceMs = hard ? 4800 : 4300;
    const gapMs = hard ? 900 : 1300;
    const tickFine = hard ? 5 : 4;
    const magicFine = hard ? 12 : 10;

    let decree: DecreeId = 'run';
    let readAt = ctx.scene.time.now + 2000;
    let forceAt = readAt + READ_MS;
    let endAt = forceAt + forceMs;
    let phase: 'idle' | 'read' | 'force' = 'idle';
    let seal: (Pt & { born: number }) | null = null;
    let holder: 'p' | 'n' | null = null;
    let lastTick = 0;
    let busy = false;
    const pos = { p: { x: ctx.player.x, y: ctx.player.y }, n: { x: ctx.npc.x, y: ctx.npc.y } };
    const speed = { p: 0, n: 0 };
    const pressBase = { p: 0, n: 0 };
    const fines = { p: 0, n: 0 };
    const fineFx: { x: number; y: number; at: number }[] = [];
    let orbit = 0;
    // The decree in plain words, set on the scroll (Graphics can only draw the glyphs).
    const label = ctx.scene.add.text(W / 2, 111, '', {
      fontFamily: '"Times New Roman", Georgia, serif', fontSize: '17px', color: '#111116', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(41).setScrollFactor(0);

    const fOf = (k: 'p' | 'n'): Fighter => (k === 'p' ? ctx.player : ctx.npc);
    const onSeal = (f: Fighter): boolean => !!seal && Phaser.Math.Distance.Between(f.x, f.y, seal.x, seal.y) < SEAL_R;
    const exempt = (k: 'p' | 'n'): boolean => holder === k;

    const fine = (k: 'p' | 'n', amount: number, why: string): void => {
      const f = fOf(k);
      if (!live(f) || exempt(k)) return;
      busy = true;
      ctx.hit(f, amount, f.x, f.y);
      busy = false;
      fines[k] += amount;
      fineFx.push({ x: f.x, y: f.y - 30, at: ctx.scene.time.now });
      ctx.float(f.x, f.y - 46, `FINED ${amount} — ${why}`, k === 'p' ? CSS_BLUE_LIT : CSS_PAPER);
      ctx.sfx('money');
    };

    const placeSeal = (time: number): void => {
      const p = ctx.player, n = ctx.npc;
      let best: Pt = { x: W / 2, y: (top + H) / 2 };
      let bestErr = Infinity;
      for (let i = 0; i < 14; i++) {
        const x = 110 + ctx.rng() * (W - 220), y = top + 80 + ctx.rng() * (H - top - 150);
        const dp = Phaser.Math.Distance.Between(x, y, p.x, p.y);
        const dn = Phaser.Math.Distance.Between(x, y, n.x, n.y);
        // Fair: about as far from both of you, and not underfoot for either.
        const err = Math.abs(dp - dn) + (Math.min(dp, dn) < 160 ? 400 : 0);
        if (err < bestErr) { bestErr = err; best = { x, y }; }
      }
      seal = { ...best, born: time };
      holder = null;
    };

    return {
      update(time, dt) {
        // Speeds (smoothed), for the running/standing decrees.
        for (const k of ['p', 'n'] as const) {
          const f = fOf(k);
          const d = Phaser.Math.Distance.Between(f.x, f.y, pos[k].x, pos[k].y);
          pos[k] = { x: f.x, y: f.y };
          speed[k] = speed[k] * 0.85 + (dt > 0 ? d / dt : 0) * 0.15;
        }

        // The clerk's clock: read → in force → adjourned → read the next.
        if (phase === 'idle' && time >= readAt) {
          phase = 'read';
          const pool = (Object.keys(DECREES) as DecreeId[]).filter((d) => d !== decree);
          decree = pool[Math.floor(ctx.rng() * pool.length)];
          ctx.banner(`HEAR YE — ${DECREES[decree].text}`, CSS_PAPER);
          ctx.sfx('judgement');
          placeSeal(time);
        }
        if (phase === 'read' && time >= forceAt) {
          phase = 'force';
          lastTick = time;
          pressBase.p = Date.now(); pressBase.n = Date.now();
          ctx.sfx('countdown-go');
        }
        if (phase === 'force' && time >= endAt) {
          phase = 'idle';
          seal = null;
          holder = null;
          readAt = time + gapMs;
          forceAt = readAt + READ_MS;
          endAt = forceAt + forceMs;
          ctx.float(W / 2, top + 30, 'ADJOURNED', CSS_BLUE);
        }

        // The seal admits one.
        if (seal) {
          if (holder && !onSeal(fOf(holder))) holder = null;
          if (!holder) {
            const p = onSeal(ctx.player), n = onSeal(ctx.npc);
            if (p && !n) holder = 'p'; else if (n && !p) holder = 'n';
            if (holder) { ctx.float(fOf(holder).x, fOf(holder).y - 44, 'UNDER SEAL', CSS_BLUE_LIT); ctx.sfx('holy-chord'); }
          }
          if (holder) {
            const other = fOf(holder === 'p' ? 'n' : 'p');
            const d = Phaser.Math.Distance.Between(other.x, other.y, seal.x, seal.y);
            if (d < SEAL_R + 10) {
              const a = Math.atan2(other.y - seal.y, other.x - seal.x) || 0.5;
              ctx.nudge(other, Math.cos(a) * 240 * dt, Math.sin(a) * 240 * dt);
            }
          }
        }

        // Enforcement.
        if (phase === 'force') {
          if (decree === 'magic') {
            for (const k of ['p', 'n'] as const) {
              const f = fOf(k);
              if ((f.lastPressAt ?? 0) > pressBase[k]) {
                pressBase[k] = f.lastPressAt;
                if (!lastPressWasClick(f)) fine(k, magicFine, 'MAGIC');
              }
            }
          }
          if (time - lastTick >= 500) {
            lastTick = time;
            for (const k of ['p', 'n'] as const) {
              if (decree === 'run' && speed[k] > RUN_LIMIT) fine(k, tickFine, 'RUNNING');
              if (decree === 'still' && speed[k] < STILL_LIMIT) fine(k, tickFine, 'IDLING');
            }
          }
          // Proclam keeps the law when he is not above it.
          if (holder !== 'n' && (decree === 'magic' || decree === 'strike')) {
            ctx.npc.disarmedUntil = Math.max(ctx.npc.disarmedUntil, Date.now() + 150);
          }
        }
        orbit += dt * 1.6;
        while (fineFx.length && time - fineFx[0].at > 700) fineFx.shift();
      },

      onNpcHurt(amount) {
        if (busy || phase !== 'force' || decree !== 'strike') return;
        fine('p', Math.max(3, Math.round(amount * 0.5)), 'STRIKING');
      },
      onPlayerHurt(amount) {
        if (busy || phase !== 'force' || decree !== 'strike') return;
        fine('n', Math.max(3, Math.round(amount * 0.5)), 'STRIKING');
      },

      npcSpeedMult: () => (phase === 'force' && decree === 'run' && holder !== 'n' ? 0.4 : 1),

      npcSeek() {
        const n = ctx.npc;
        // The seal, always — he is the Queen's herald and it is the Queen's seal.
        if (seal && holder !== 'p') {
          if (holder === 'n' && decree === 'still' && phase === 'force') {
            // Exempt, but he paces the seal's rim out of habit.
            return { x: seal.x + Math.cos(orbit) * 18, y: seal.y + Math.sin(orbit) * 14 };
          }
          return seal;
        }
        // Lost the seal: keep the law.
        if (phase === 'force' && decree === 'still') {
          return { x: Phaser.Math.Clamp(n.x + Math.cos(orbit) * 120, 60, W - 60), y: Phaser.Math.Clamp(n.y + Math.sin(orbit) * 90, top + 50, H - 50) };
        }
        return null;
      },

      drawGround(g, time) {
        if (!seal) return;
        const age = time - seal.born;
        const k = Phaser.Math.Clamp(age / 400, 0, 1);
        // Wax spreading as the seal is pressed, then the seal itself.
        g.fillStyle(BLUE_DEEP, 0.9 * k); g.fillCircle(seal.x, seal.y + 3, SEAL_R * (0.5 + 0.55 * k));
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * Math.PI * 2 + 0.3;
          g.fillCircle(seal.x + Math.cos(a) * SEAL_R * 1.02 * k, seal.y + 3 + Math.sin(a) * SEAL_R * 1.02 * k, 7 * k);
        }
        queenSeal(g, seal.x, seal.y, SEAL_R * 0.86 * k, 1);
        if (holder) {
          g.lineStyle(3, holder === 'p' ? WHITE : INK, 0.7 + Math.sin(time / 120) * 0.25);
          g.strokeCircle(seal.x, seal.y, SEAL_R + 8);
        } else {
          g.lineStyle(1.5, BLUE_LIT, 0.6);
          for (let i = 0; i < 24; i++) {
            const a = (i / 24) * Math.PI * 2 + time / 900;
            g.lineBetween(seal.x + Math.cos(a) * (SEAL_R + 8), seal.y + Math.sin(a) * (SEAL_R + 8), seal.x + Math.cos(a) * (SEAL_R + 14), seal.y + Math.sin(a) * (SEAL_R + 14));
          }
        }
      },

      drawAir(g, time) {
        // Fines: a coin of ink falling off the fined fighter.
        for (const f of fineFx) {
          const k = (time - f.at) / 700;
          g.fillStyle(INK, 1 - k); g.fillCircle(f.x + k * 10, f.y + k * 30, 6);
          g.fillStyle(WHITE, 1 - k); g.fillCircle(f.x + k * 10 - 2, f.y + k * 30 - 2, 2);
        }
        // Proclam's scroll above his head while he reads.
        if (phase === 'read') {
          const n = ctx.npc;
          const k = Phaser.Math.Clamp((time - readAt) / 400, 0, 1);
          const w = 90 * k;
          g.fillStyle(PAPER, 1); g.fillRect(n.x - w / 2, n.y - 86, w, 26);
          g.lineStyle(2, INK, 1); g.strokeRect(n.x - w / 2, n.y - 86, w, 26);
          g.fillStyle(INK, 1); g.fillCircle(n.x - w / 2, n.y - 73, 5); g.fillCircle(n.x + w / 2, n.y - 73, 5);
          if (k >= 1) for (let i = 0; i < 6; i++) glyph(g, n.x - 34 + i * 13, n.y - 73, 9, decree.length * 7 + i, INK, 1, 1.5);
        }
        // A folded-hands tell when Proclam is keeping the law.
        if (phase === 'force' && holder !== 'n' && (decree === 'magic' || decree === 'strike')) {
          const n = ctx.npc;
          g.lineStyle(2, INK, 0.9); g.strokeCircle(n.x, n.y - 48, 9);
          g.lineBetween(n.x - 6, n.y - 54, n.x + 6, n.y - 42);
        }
      },

      destroy() { label.destroy(); },

      drawHud(g, time) {
        // The scroll of the day's decree across the top of the page.
        const x = W / 2, y = 112;
        const w = 380, h = 30;
        g.fillStyle(INK, 0.75); g.fillRect(x - w / 2 - 6, y - h / 2 - 4, w + 12, h + 8);
        g.fillStyle(phase === 'idle' ? PAPER_SHADE : PAPER, 1); g.fillRect(x - w / 2, y - h / 2, w, h);
        if (phase === 'idle') label.setText('— adjourned —');
        g.fillStyle(INK, 1); g.fillCircle(x - w / 2, y, 8); g.fillCircle(x + w / 2, y, 8);
        g.fillStyle(WHITE, 1); g.fillCircle(x - w / 2, y, 3); g.fillCircle(x + w / 2, y, 3);
        if (phase !== 'idle') {
          label.setText(phase === 'read' ? `HEAR YE — ${DECREES[decree].text}` : `${DECREES[decree].text} · ${DECREES[decree].short}`);
          // Time left in force: a blue rule shrinking under the text.
          const t = ctx.scene.time.now;
          const k = phase === 'read' ? 1 : Phaser.Math.Clamp((endAt - t) / forceMs, 0, 1);
          g.lineStyle(3, phase === 'read' ? BLUE_LIT : BLUE, 1);
          g.lineBetween(x - (w / 2 - 14) * k, y + 11, x + (w / 2 - 14) * k, y + 11);
          if (phase === 'read' && Math.floor(time / 160) % 2) { g.fillStyle(BLUE, 1); g.fillCircle(x + w / 2 + 22, y, 5); }
        }
        // Who holds the seal.
        if (holder) queenSeal(g, holder === 'p' ? x - w / 2 - 34 : x + w / 2 + 34, y, 11);
      },
    };
  },
};
