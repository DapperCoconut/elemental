import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { OBS, PAPER, PART_COLORS, PART_NAMES, VOICE_LIT, letter, lit, note, stave } from '../art';
import { type Who, WHO, alive, clamp, dist, fighterOf } from '../util';

/**
 * DECREE OF THE ASSIGNED PART — Councilor Tessitura Bray, Seat of the Part.
 *
 * She drafted the Part: one note per child, pinned at the collar, sung for life. Her room is the
 * choir risers: the floor is three bands — SOPRANO, ALTO, BASS — and each fighter is given a Part
 * (a reed of that colour at the collar, a ring of it underfoot). The Score is read on the beat
 * (1.1 s — the drum major's own metronome): every second beat it calls a band, shown three calls
 * ahead on the score at the top. On the call, the band sings:
 *   - whoever stands in it and holds that Part is IN VOICE — healed, and hitting 25% harder until
 *     the next call;
 *   - whoever stands in it and does not is OUT OF PART — struck and MUTED (abilities locked).
 * Every six calls the Score is RE-SCORED and the Parts handed out again.
 *
 * The Part-Book stands open on a lectern in the band nobody sings. Strike it and the two Parts
 * are TRANSPOSED — swapped on the spot. She does it to you the beat before your own band is
 * called (so you are standing in it holding hers). Read the score and do it to her.
 */

const BEAT = 1100;
const CALL = BEAT * 2;
const AHEAD = 3;
const RESCORE_EVERY = 6;
const MUTE_MS = 1600;
const BOOK_CD = 4200;

const make = (ctx: GimmickCtx): EncounterGimmick => {
  const { W, H, top, rng } = ctx;
  const bandH = (H - top) / 3;
  const bandOf = (y: number): number => clamp(Math.floor((y - top) / bandH), 0, 2);
  const bandMid = (b: number): number => top + bandH * (b + 0.5);
  const dmg = ctx.hard ? 18 : 14;

  const part: Record<Who, number> = { player: 0, npc: 1 };
  const inVoiceUntil: Record<Who, number> = { player: 0, npc: 0 };
  const score: number[] = [];
  let nextAt = 0;
  let calls = 0;
  let started = false;
  let flashBand = -1;
  let flashAt = -9999;
  let book: StrikeTarget | null = null;
  let bookX = W / 2;
  let bookReadyAt = 0;
  let swapFx = -9999;

  const freeBand = (): number => [0, 1, 2].find((b) => b !== part.player && b !== part.npc) ?? 1;

  /** The next band the Score calls: never the same band three times running. */
  const pushCall = () => {
    let b = Math.floor(rng() * 3);
    const n = score.length;
    if (n >= 2 && score[n - 1] === b && score[n - 2] === b) b = (b + 1 + Math.floor(rng() * 2)) % 3;
    score.push(b);
  };

  const placeBook = () => {
    bookX = 180 + rng() * (W - 360);
    const y = bandMid(freeBand());
    if (book) book.moveTo(bookX, y);
    else book = ctx.target({ x: bookX, y, r: 26, onStruck: (by) => transpose(by) });
  };

  const handOut = (announce: boolean) => {
    // Never hand the same Part straight back to the same voice.
    const old = part.player;
    let a = Math.floor(rng() * 3);
    if (announce && a === old) a = (a + 1 + Math.floor(rng() * 2)) % 3;
    let b = Math.floor(rng() * 2);
    if (b >= a) b++;
    part.player = a;
    part.npc = b;
    placeBook();
    if (announce) {
      ctx.banner(`RE-SCORED — YOU SING ${PART_NAMES[part.player]}`, '#ffd2ec');
      ctx.sfx('holy-chord');
    }
  };

  function transpose(by: Who): void {
    const now = ctx.scene.time.now;
    if (now < bookReadyAt) return;
    bookReadyAt = now + BOOK_CD;
    const p = part.player;
    part.player = part.npc;
    part.npc = p;
    swapFx = now;
    ctx.banner(by === 'player' ? `TRANSPOSED — YOU SING ${PART_NAMES[part.player]}` : `SHE TRANSPOSES YOU — NOW ${PART_NAMES[part.player]}`, by === 'player' ? '#ffd2ec' : '#c9b0ff');
    ctx.sfx('crystal-chime');
  }

  const sing = (time: number) => {
    const b = score.shift() ?? 0;
    pushCall();
    flashBand = b;
    flashAt = time;
    ctx.sfx('sonic-pulse');
    for (const w of WHO) {
      const f = fighterOf(ctx, w);
      if (!alive(f) || bandOf(f.y) !== b) continue;
      if (part[w] === b) {
        inVoiceUntil[w] = time + CALL;
        ctx.heal(f, 6);
        ctx.float(f.x, f.y - 50, 'IN VOICE', '#ffd2ec');
      } else {
        ctx.hit(f, dmg, f.x, f.y);
        ctx.silence(f, MUTE_MS);
        ctx.float(f.x, f.y - 50, 'OUT OF PART — MUTED', '#ff9ab0');
        ctx.flash(f.x, f.y, PART_COLORS[b]);
      }
    }
    calls++;
    if (calls % RESCORE_EVERY === 0) handOut(true);
  };

  return {
    update(time) {
      if (!started) {
        started = true;
        handOut(false);
        for (let i = 0; i <= AHEAD; i++) pushCall();
        nextAt = time + CALL * 1.5;
        ctx.banner(`YOU SING ${PART_NAMES[part.player]} · SHE SINGS ${PART_NAMES[part.npc]}`, '#ffd2ec');
      }
      if (time >= nextAt) { nextAt += CALL; sing(time); }
    },

    playerTakenMult() { return ctx.scene.time.now < inVoiceUntil.npc ? 1.25 : 1; },
    npcTakenMult() { return ctx.scene.time.now < inVoiceUntil.player ? 1.25 : 1; },

    npcSeek(): Pt | null {
      const n = ctx.npc, p = ctx.player;
      const now = ctx.scene.time.now;
      const left = nextAt - now;
      const called = score[0];
      // The ploy: your own band is next and you are standing in it — swap your Part out from under you.
      if (book && now >= bookReadyAt && called === part.player && bandOf(p.y) === part.player && left < 1900
        && called !== freeBand() && dist(n.x, n.y, book.x, book.y) < 320) {
        return { x: book.x, y: book.y };
      }
      // Otherwise sing your own Part, level with the foe so the fight goes on across the bands.
      const mine = part.npc;
      if (called !== mine && bandOf(n.y) === called && left < 1500) return { x: clamp(n.x, 80, W - 80), y: bandMid(mine) };
      return { x: clamp(p.x + (n.x < p.x ? -200 : 200), 80, W - 80), y: bandMid(mine) };
    },

    drawGround(g, time) {
      const now = time;
      const left = nextAt - now;
      for (let b = 0; b < 3; b++) {
        const y0 = top + b * bandH;
        const c = PART_COLORS[b];
        const warn = score[0] === b && left < BEAT ? 1 - left / BEAT : 0;
        g.fillStyle(c, 0.05 + warn * 0.14); g.fillRect(0, y0, W, bandH);
        // Risers: the step lines of a choir loft.
        g.lineStyle(1, c, 0.16);
        for (let k = 1; k < 3; k++) g.lineBetween(0, y0 + (bandH * k) / 3, W, y0 + (bandH * k) / 3);
        g.lineStyle(2, OBS.edge, 0.35); g.lineBetween(0, y0, W, y0);
        // The band's name, large and faint, at both ends.
        const ch = PART_NAMES[b][0];
        letter(g, ch, 34, y0 + bandH / 2, 46, 4, c, 0.22 + warn * 0.4);
        letter(g, ch, W - 34, y0 + bandH / 2, 46, 4, c, 0.22 + warn * 0.4);
        // The warning sweep: the band drawing breath, left to right.
        if (warn > 0) {
          const x = warn * W;
          g.fillStyle(c, 0.22); g.fillRect(0, y0, x, bandH);
          g.lineStyle(3, lit(c, 0.4), 0.8); g.lineBetween(x, y0, x, y0 + bandH);
        }
      }
      // The band singing: rings of sound rolling along it.
      const since = now - flashAt;
      if (flashBand >= 0 && since < 520) {
        const k = since / 520;
        const y0 = top + flashBand * bandH;
        g.fillStyle(PART_COLORS[flashBand], 0.3 * (1 - k)); g.fillRect(0, y0, W, bandH);
        for (let i = 0; i < 6; i++) {
          g.lineStyle(3 * (1 - k), lit(PART_COLORS[flashBand], 0.5), 1 - k);
          g.strokeEllipse(80 + i * ((W - 160) / 5), y0 + bandH / 2, 40 + k * 160, (bandH - 10) * (0.4 + k * 0.6));
        }
      }
      // Rings of each fighter's Part underfoot.
      for (const w of WHO) {
        const f = fighterOf(ctx, w);
        if (!alive(f)) continue;
        const own = bandOf(f.y) === part[w];
        g.lineStyle(own ? 3 : 2, PART_COLORS[part[w]], own ? 0.85 : 0.45); g.strokeEllipse(f.x, f.y + 18, 54, 18);
      }
      // The lectern with the Part-Book, in the band nobody sings.
      if (book) {
        const ready = now >= bookReadyAt;
        const bx = book.x, by = book.y;
        g.fillStyle(0x000000, 0.4); g.fillEllipse(bx, by + 22, 50, 14);
        g.fillStyle(OBS.glass, 1); g.fillRect(bx - 3, by - 6, 6, 28);
        g.fillStyle(OBS.facet, 1); g.fillTriangle(bx - 28, by - 4, bx + 28, by - 4, bx, by + 6);
        g.fillStyle(PAPER, ready ? 1 : 0.4); g.fillRect(bx - 26, by - 22, 25, 18); g.fillRect(bx + 1, by - 22, 25, 18);
        stave(g, bx - 24, bx - 3, by - 19, 2.6, 0x3a2a3a, ready ? 0.7 : 0.3, 0.6);
        stave(g, bx + 3, bx + 24, by - 19, 2.6, 0x3a2a3a, ready ? 0.7 : 0.3, 0.6);
        // Two notes, one in each Part's colour: what the book will swap.
        note(g, bx - 13, by - 12, 3, PART_COLORS[part.player], ready ? 1 : 0.4);
        note(g, bx + 13, by - 12, 3, PART_COLORS[part.npc], ready ? 1 : 0.4);
        if (ready) { g.lineStyle(1.5, VOICE_LIT, 0.4 + 0.3 * Math.sin(now / 200)); g.strokeCircle(bx, by - 4, 32); }
      }
    },

    drawAir(g, time) {
      for (const w of WHO) {
        const f = fighterOf(ctx, w);
        if (!alive(f)) continue;
        // The tuning reed at the collar.
        const c = PART_COLORS[part[w]];
        g.fillStyle(OBS.glass, 1); g.fillRect(f.x + 12, f.y - 8, 6, 16);
        g.fillStyle(c, 1); g.fillRect(f.x + 13.5, f.y - 6, 3, 12);
        g.fillStyle(0xffffff, 0.7); g.fillRect(f.x + 13.5, f.y - 6, 1, 6);
        if (time < inVoiceUntil[w]) {
          for (let i = 0; i < 3; i++) {
            const ph = ((time / 700) + i / 3) % 1;
            note(g, f.x - 14 + i * 12, f.y - 34 - ph * 26, 2.6, c, 1 - ph, i % 2 === 0);
          }
        }
      }
      // The swap: the two reeds trading places along an arc.
      const since = time - swapFx;
      if (since < 600 && alive(ctx.player) && alive(ctx.npc)) {
        const k = since / 600;
        const p = ctx.player, n = ctx.npc;
        const mx = (p.x + n.x) / 2, my = (p.y + n.y) / 2 - 80;
        for (const [a, b, c] of [[p, n, PART_COLORS[part.player]], [n, p, PART_COLORS[part.npc]]] as const) {
          const x = (1 - k) * (1 - k) * b.x + 2 * (1 - k) * k * mx + k * k * a.x;
          const y = (1 - k) * (1 - k) * b.y + 2 * (1 - k) * k * my + k * k * a.y;
          g.fillStyle(c, 0.3); g.fillCircle(x, y, 10);
          g.fillStyle(c, 1); g.fillRect(x - 2, y - 7, 4, 14);
        }
      }
    },

    drawHud(g, time) {
      // The Score: three lines, the calls marching left to the playhead, on the beat.
      const cx = W / 2, y0 = top + 8, w = 320, x0 = cx - w / 2;
      g.fillStyle(0x07050c, 0.88); g.fillRoundedRect(x0 - 12, y0 - 4, w + 24, 50, 8);
      g.lineStyle(1.5, OBS.edge, 0.6); g.strokeRoundedRect(x0 - 12, y0 - 4, w + 24, 50, 8);
      for (let b = 0; b < 3; b++) {
        g.lineStyle(1, PART_COLORS[b], 0.55); g.lineBetween(x0, y0 + 9 + b * 14, x0 + w, y0 + 9 + b * 14);
        // Whose Part is whose, as markers at the left: a ring for yours, a slit for hers.
        if (part.player === b) { g.lineStyle(2, PART_COLORS[b], 1); g.strokeCircle(x0 - 4, y0 + 9 + b * 14, 4); }
        if (part.npc === b) { g.fillStyle(OBS.seam, 1); g.fillRect(x0 + w + 1, y0 + 8 + b * 14, 8, 2); }
      }
      // Playhead.
      const px = x0 + 26;
      g.lineStyle(2, VOICE_LIT, 0.9); g.lineBetween(px, y0 + 2, px, y0 + 40);
      const left = nextAt - time;
      score.slice(0, AHEAD + 1).forEach((b, i) => {
        const x = px + ((left + i * CALL) / (CALL * (AHEAD + 1))) * (w - 30);
        if (x > x0 + w) return;
        note(g, x, y0 + 9 + b * 14, 4.2, PART_COLORS[b], i === 0 ? 1 : 0.7);
      });
      // The metronome: a dot on every beat.
      const beat = Math.floor((time % CALL) / BEAT);
      for (let i = 0; i < 2; i++) { g.fillStyle(i === beat ? VOICE_LIT : OBS.edge, i === beat ? 1 : 0.4); g.fillCircle(cx - 6 + i * 12, y0 + 49, 3); }
    },

    destroy() { book?.remove(); book = null; },
  };
};

export const ASSIGNED_PART: GimmickDef = {
  id: 'bench-sound-assigned-part',
  rules: 'Each voice shall sing its Part: three bands, a Part each. A called band heals its own and mutes all others. The Part-Book swaps the Parts.',
  make,
};
