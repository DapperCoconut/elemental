import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import { glow } from '../../../../../art/IsleArt';
import { GOLD, GOLD_DARK, GOLD_LIT, INK, PARCH, PARCH_DARK, SIDE_FOE, SIDE_YOU, WAX } from '../palette';
import { alive, clamp } from '../util';

/**
 * Objection! — Advocate Rebuttal.
 *
 * Rebuttal is an echo: everything said in his court comes back. Here, whenever a fighter casts,
 * the *other* fighter is given the floor for a moment — "OBJECTION?" hangs over their head with a
 * ring running down. Cast inside that window and the objection is sustained: the first cast is
 * overruled, every one of its shots near the objector is turned round and sent back at its owner,
 * and the overruled side takes a sting of its own echo. A cast made *as* an objection cannot itself
 * be objected to.
 *
 * Three sustained objections against the same side and the bench holds them in contempt: stunned
 * for a beat. So the rule is a duel of timing — cast right after he does, and never cast into his
 * window when your shots are flying at his face.
 */

const WINDOW_MS = 1000;
const REFLECT_R = 300;
const ECHO_DMG = 6;
const CONTEMPT_AT = 3;

interface Floor { until: number; openedAt: number; against: Fighter | null }
interface Fx { kind: 'sustained' | 'overruled' | 'contempt'; x: number; y: number; at: number; side: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  const floors = new Map<Fighter, Floor>([[player, { until: 0, openedAt: 0, against: null }], [npc, { until: 0, openedAt: 0, against: null }]]);
  const strikes = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  const fx: Fx[] = [];
  // Your floor is a touch longer than his: the bot casts on a clock, you cast on purpose.
  const winFor = (f: Fighter) => (f === player ? (ctx.hard ? 900 : WINDOW_MS) : (ctx.hard ? 800 : 650));
  const other = (f: Fighter) => (f === player ? npc : player);
  /** Rebuttal's own echo-rings, expanding from each cast so you can see the floor change hands. */
  const echoes: { x: number; y: number; at: number; side: number }[] = [];

  function cast(by: Fighter): void {
    const time = ctx.scene.time.now;
    if (!alive(by)) return;
    const mine = floors.get(by);
    if (mine && time < mine.until && mine.against) { sustain(by, mine.against, time); mine.until = 0; mine.against = null; return; }
    // An ordinary cast: the floor passes to the other side.
    const o = other(by);
    if (!alive(o)) return;
    floors.set(o, { until: time + winFor(o), openedAt: time, against: by });
    echoes.push({ x: by.x, y: by.y, at: time, side: by === player ? 1 : -1 });
    if (echoes.length > 8) echoes.shift();
  }

  function sustain(objector: Fighter, caster: Fighter, time: number): void {
    const owner = caster === player ? 'player' : 'npc';
    let turned = 0;
    for (const s of ctx.shotsNear(objector.x, objector.y, REFLECT_R)) {
      if (s.owner !== owner) continue;
      if (s.reflect()) turned++;
    }
    ctx.sfx('judgement');
    ctx.banner(objector === player ? 'OBJECTION! — SUSTAINED' : 'REBUTTAL OBJECTS — SUSTAINED', objector === player ? '#ffd860' : '#c8a0ff');
    if (alive(caster)) { ctx.hit(caster, ECHO_DMG + turned * 2, caster.x, caster.y); ctx.float(caster.x, caster.y - 48, 'OVERRULED', '#f2e6c4'); }
    fx.push({ kind: 'sustained', x: objector.x, y: objector.y, at: time, side: objector === player ? 1 : -1 });
    fx.push({ kind: 'overruled', x: caster.x, y: caster.y, at: time, side: caster === player ? 1 : -1 });
    const n = (strikes.get(caster) ?? 0) + 1;
    if (n >= CONTEMPT_AT) {
      strikes.set(caster, 0);
      ctx.stun(caster, ctx.hard ? 1000 : 850);
      ctx.float(caster.x, caster.y - 64, 'HELD IN CONTEMPT', '#ff9a8a');
      ctx.sfx('anvil');
      fx.push({ kind: 'contempt', x: caster.x, y: caster.y, at: time, side: 0 });
    } else strikes.set(caster, n);
    // Your floor is spent either way.
    const f = floors.get(caster);
    if (f) { f.until = 0; f.against = null; }
  }

  return {
    update(time) {
      for (let i = fx.length - 1; i >= 0; i--) if (time - fx[i].at > 1100) fx.splice(i, 1);
      for (let i = echoes.length - 1; i >= 0; i--) if (time - echoes[i].at > 900) echoes.splice(i, 1);
      // The floor lapses if the window runs out.
      for (const fl of floors.values()) if (fl.against && time >= fl.until) fl.against = null;
    },

    onPlayerCast() { cast(player); },
    onNpcCast() { cast(npc); },

    npcSeek() {
      // Close enough that your shots are near him when he objects, off your line of fire.
      const a = Math.atan2(npc.y - player.y, npc.x - player.x) + 0.5;
      return { x: clamp(player.x + Math.cos(a) * 230, 60, W - 60), y: clamp(player.y + Math.sin(a) * 200, top + 50, H - 40) };
    },

    drawGround(g, time) {
      // Echo rings from every cast — Rebuttal hears everything.
      for (const e of echoes) {
        const k = clamp((time - e.at) / 900, 0, 1);
        const c = e.side > 0 ? SIDE_YOU : SIDE_FOE;
        for (let r = 0; r < 3; r++) {
          const kk = clamp(k - r * 0.15, 0, 1);
          if (kk <= 0) continue;
          g.lineStyle(2, c, 0.5 * (1 - kk)); g.strokeCircle(e.x, e.y, 20 + kk * 120);
        }
      }
      // The reach of an objection while the floor is open.
      for (const [f, fl] of floors) {
        if (!fl.against || !alive(f)) continue;
        g.lineStyle(1.5, f === player ? SIDE_YOU : SIDE_FOE, 0.25 + Math.sin(time / 80) * 0.1);
        g.strokeCircle(f.x, f.y, REFLECT_R);
      }
    },

    drawAir(g, time) {
      // "OBJECTION?" — a speech bubble over whoever holds the floor, its ring running down.
      for (const [f, fl] of floors) {
        if (!fl.against || !alive(f)) continue;
        const k = clamp((fl.until - time) / Math.max(1, fl.until - fl.openedAt), 0, 1);
        const x = f.x, y = f.y - 66;
        const c = f === player ? SIDE_YOU : SIDE_FOE;
        g.fillStyle(PARCH_DARK, 1); g.fillRoundedRect(x - 30, y - 14, 60, 24, 8);
        g.fillStyle(PARCH, 1); g.fillRoundedRect(x - 29, y - 15, 58, 22, 8);
        g.fillTriangle(x - 6, y + 6, x + 6, y + 6, x, y + 16);
        // The bubble's glyph: a pointing finger and a question mark.
        g.fillStyle(INK, 1); g.fillRect(x - 20, y - 5, 14, 4); g.fillRoundedRect(x - 10, y - 8, 8, 10, 2);
        g.lineStyle(2.5, INK, 1); g.beginPath(); g.arc(x + 12, y - 6, 4, Math.PI, Math.PI * 2.4, false); g.strokePath();
        g.fillStyle(INK, 1); g.fillCircle(x + 13, y + 3, 1.6);
        g.lineStyle(3, c, 0.9); g.beginPath(); g.arc(x, y - 2, 36, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
      }
      for (const e of fx) {
        const k = clamp((time - e.at) / 1100, 0, 1);
        if (e.kind === 'sustained') {
          // A comic burst: gold rays, a slanted placard with a pointing hand.
          const c = e.side > 0 ? SIDE_YOU : SIDE_FOE;
          for (let i = 0; i < 12; i++) {
            const a = (i / 12) * Math.PI * 2;
            const r0 = 26 + k * 20, r1 = 60 + k * 60;
            g.lineStyle(3, i % 2 ? GOLD_LIT : c, 1 - k);
            g.lineBetween(e.x + Math.cos(a) * r0, e.y - 30 + Math.sin(a) * r0, e.x + Math.cos(a) * r1, e.y - 30 + Math.sin(a) * r1);
          }
          g.fillStyle(GOLD_DARK, 1 - k); g.fillTriangle(e.x - 46, e.y - 80, e.x + 50, e.y - 92, e.x + 46, e.y - 62);
          g.fillStyle(GOLD, 1 - k); g.fillTriangle(e.x - 46, e.y - 80, e.x + 46, e.y - 62, e.x - 50, e.y - 54);
          g.fillStyle(PARCH, 1 - k); g.fillRect(e.x + 30, e.y - 80, 22, 6); g.fillRoundedRect(e.x + 48, e.y - 84, 10, 14, 3);
          glow(g, e.x, e.y - 30, 50, GOLD_LIT, 0.08 * (1 - k), 3);
        } else if (e.kind === 'overruled') {
          // A red wax stamp slammed down over the overruled caster.
          const s = 1 + (1 - Math.min(1, k * 4)) * 0.8;
          g.fillStyle(WAX, (1 - k) * 0.9); g.fillCircle(e.x, e.y - 30, 18 * s);
          g.lineStyle(2, 0x6a0e14, 1 - k); g.strokeCircle(e.x, e.y - 30, 14 * s);
          g.lineStyle(3, PARCH, 1 - k); g.lineBetween(e.x - 9 * s, e.y - 30 - 9 * s, e.x + 9 * s, e.y - 30 + 9 * s); g.lineBetween(e.x + 9 * s, e.y - 30 - 9 * s, e.x - 9 * s, e.y - 30 + 9 * s);
        } else {
          g.lineStyle(4, WAX, 1 - k); g.strokeCircle(e.x, e.y - 6, 30 + k * 30);
          for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + k; g.fillStyle(GOLD, 1 - k); g.fillRect(e.x + Math.cos(a) * 34 - 4, e.y - 6 + Math.sin(a) * 34 - 4, 8, 8); }
        }
      }
    },

    drawHud(g) {
      // The docket: three seals a side — sustained objections against that side.
      for (const [f, x0, d] of [[player, 24, 1], [npc, W - 24, -1]] as [Fighter, number, number][]) {
        const n = strikes.get(f) ?? 0;
        for (let i = 0; i < CONTEMPT_AT; i++) {
          const x = x0 + d * i * 22, y = top + 14;
          g.fillStyle(0x000000, 0.45); g.fillCircle(x, y, 9);
          g.fillStyle(i < n ? WAX : 0x5a5450, 1); g.fillCircle(x, y, 7);
          if (i < n) { g.lineStyle(1.5, PARCH, 0.9); g.strokeCircle(x, y, 4); }
        }
      }
    },
  };
}

export const OBJECTION: GimmickDef = {
  id: 'tribunal-objection',
  rules: 'When one fighter casts, the other has a moment to object: cast back in time to overrule it — its shots near you turn back. Three overruled and you are held in contempt.',
  make,
};
