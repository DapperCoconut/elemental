import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import { BaseAvatar } from '../../../elements/kits/ElementVisuals';
import {
  SOUND, SoundAvatar, SoundFx, musicNoteLayered, waveRibbonLayered,
} from '../../../elements/kits/SoundVisuals';

/**
 * Sound's showcases.
 *
 * The metronome is the element, so it is in every loop: a two-second bar with a gold window at
 * the far end of it, and a cast landing inside that window coming out harmonized. A Sound
 * preview without the meter running documents a pink projectile element with unusually good
 * numbers, which is exactly the wrong idea.
 *
 * The other thing every script has to show is that the buffs **stay**. Percentages banked off a
 * boombox or a bugle run never expire, so the loops carry a running total rather than a timer.
 *
 * Sound puts no sprite in the world: shockwaves, records, the boombox and its field, the rhythm
 * bar and the mirror ball are all Graphics repainted per frame out of `SoundVisuals`, so
 * `ctx.fly` is useless throughout.
 *
 * Containment: `ctx.at` and `ctx.onFrame` run outside the harness's capture window, so anything
 * built inside one goes through `ctx.adopt`. `SoundFx` carries a sticky sink.
 */

// ── The kit's constants, mirrored ─────────────────────────────────────

const BEAT_MS = 2000;
const HARMONY_WINDOW = 200;

const STACCATO_DMG = 10;
const STACCATO_HARM_DMG = 15;
const WAVE_SPEED = 780;
const WAVE_RANGE = 470;
const WAVE_SPREAD = 0.1;
const WAVE_THICK = 28;
const STREAK_SIZE_PER = 0.01;

const DISC_RADIUS = 130;
const DISC_DMG = 15;
const DISC_SPEED_PER_HIT = 0.15;
const DISC_BANK_MOVE = 0.03;
const DISC_BANK_DMG = 0.02;
const DISC_BANK_RES = 0.01;

const BOOMBOX_MS = 8000;
const BOOMBOX_RADIUS = 150;
const BOOMBOX_RADIUS_GOLD = 205;
const BOOMBOX_ATK_PER_SEC = 0.01;
const BOOMBOX_MOVE_BONUS = 0.20;
const BOOMBOX_PULSE_MS = 3000;
const BOOMBOX_SHOVE_DIST = 190;
const BOOMBOX_POTENCY = 1.5;
const JUKEBOX_HYPE_COST = 10;
const JUKEBOX_RADIUS_MULT = 1.33;
const JUKEBOX_PULSE_MS = 2000;

const BUGLE_NOTE_GAIN = 0.01;
const BUGLE_SLIP_SPEEDUP = 1.2;
const PERF_NOTE_SPEED = 470;
const PERF_TOLERANCE = 42;
const RED_NOTE_DMG = 0.01;
const HOLD_NOTE_ATK = 0.03;

const CODA_PER_LEVEL = 200;
const CODA_HEAL = [0, 0, 150, 200];
const CODA_BOOST_MULT = [1, 1, 1.25, 1.5];
const CODA_DAMAGE_MULT = [1, 1, 1.3, 1.6];
const SOLO_NOTE_DMG = 12;
const SOLO_ACCENT_DMG = 22;
const PARTY_HOLD_MS = 3000;
const PARTY_MS = 12000;
const PARTY_HYPE_MULT = 2;
const BALL_SWING_DMG = 20;

const HARMONY_FUSE_MS = 900;
const HARMONY_RADIUS = 100;
const HARMONY_DAMAGE = 20;
const HARMONY_BONUS_PER_STACK = 0.15;
const HARMONY_MAX_STACKS = 4;
const HARMONY_BUFF_MS = 20000;

interface Mark { x: number; y: number }

function hex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

// ── Shared staging ────────────────────────────────────────────────────

interface Stage { fx: SoundFx; av: BaseAvatar; sav: SoundAvatar | null; at: Mark }

function stageIt(ctx: PreviewCtx): Stage {
  const fx = ctx.capture(() => new SoundFx(ctx.scene, ctx.tint).setSink(ctx.sink));
  const av = ctx.useAvatar(() => new SoundAvatar(ctx.scene, ctx.tint));
  av.setFacing(ctx.aim);
  return { fx, av, sav: av instanceof SoundAvatar ? av : null, at: { x: ctx.cx, y: ctx.cy } };
}

function drivenCaster(ctx: PreviewCtx, at: Mark): Stage {
  const fx = ctx.capture(() => new SoundFx(ctx.scene, ctx.tint).setSink(ctx.sink));
  if (ctx.scene.textures.exists('elem-sound')) {
    const body = ctx.adopt(ctx.scene.add.image(at.x, at.y, 'elem-sound').setDepth(5));
    ctx.onFrame(() => body.setPosition(at.x, at.y));
  }
  const av = ctx.useAvatar(() => new SoundAvatar(ctx.scene, ctx.tint));
  av.setFacing(ctx.aim);
  ctx.onFrame((dt) => av.update(dt, at.x, at.y, 1));
  return { fx, av, sav: av instanceof SoundAvatar ? av : null, at };
}

function tick(ctx: PreviewCtx, x: number, y: number, text: string, color: number): void {
  const t = ctx.adopt(ctx.scene.add.text(x, y, text, {
    fontSize: '11px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
    color: hex(color), stroke: '#0d030b', strokeThickness: 3,
  }).setOrigin(0.5).setDepth(22));
  const y0 = y;
  let age = 0;
  ctx.onFrame((dt) => {
    age += dt;
    t.setY(y0 - (age / 760) * 20);
    t.setAlpha(Phaser.Math.Clamp(1 - age / 760, 0, 1));
  });
}

function label(ctx: PreviewCtx, x: number, y: number, text: string, color: number): void {
  ctx.adopt(ctx.scene.add.text(x, y, text, {
    fontSize: '9px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
    color: hex(color), align: 'center',
  }).setOrigin(0.5).setDepth(21));
}

function dummy(ctx: PreviewCtx, at: Mark): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(5));
  ctx.onFrame(() => {
    g.clear();
    g.fillStyle(0x2b2f3d, 1);
    g.fillCircle(at.x, at.y, 17);
    g.fillStyle(0x3c4254, 1);
    g.fillCircle(at.x, at.y, 13);
    g.fillStyle(0x8e97ad, 0.9);
    g.fillCircle(at.x - 5, at.y - 4, 3.2);
    g.fillCircle(at.x + 5, at.y - 4, 3.2);
    g.fillStyle(0x11131b, 1);
    g.fillCircle(at.x - 5.6, at.y - 4, 1.6);
    g.fillCircle(at.x + 4.4, at.y - 4, 1.6);
  });
}

/**
 * The metronome meter — a two-second bar with the gold window at the far end. Returns a `beat`
 * function the script calls to restart it, and a `harmonized` test the loops use to decide
 * whether the cast that just went out was on time.
 */
function metronome(ctx: PreviewCtx): { start(at: number): void; harmonized(at: number): boolean } {
  let from = -9999;
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(19));
  const w = () => Math.min(ctx.w - 40, 220);
  ctx.onFrame((_dt, elapsed) => {
    g.clear();
    if (from < 0) return;
    const k = (elapsed - from) / BEAT_MS;
    if (k > 1.2) return;
    const bw = w();
    const x = ctx.w / 2 - bw / 2;
    const y = 14;
    g.fillStyle(ctx.tint(SOUND.shade), 0.9);
    g.fillRect(x - 1, y - 1, bw + 2, 8);
    g.fillStyle(ctx.tint(SOUND.plum), 0.9);
    g.fillRect(x, y, bw, 6);
    // The gold window, at the far end and about a tenth of the bar.
    const gw = bw * (HARMONY_WINDOW / BEAT_MS);
    g.fillStyle(ctx.tint(SOUND.gold), 0.85);
    g.fillRect(x + bw - gw, y, gw, 6);
    g.fillStyle(ctx.tint(SOUND.rose), 1);
    g.fillRect(x, y, bw * Phaser.Math.Clamp(k, 0, 1), 6);
    g.fillStyle(ctx.tint(SOUND.white), 1);
    g.fillRect(x + bw * Phaser.Math.Clamp(k, 0, 1) - 1, y - 2, 2, 10);
  });
  return {
    start(at) { from = at; },
    harmonized(at) { return from >= 0 && at - from >= BEAT_MS - HARMONY_WINDOW && at - from <= BEAT_MS; },
  };
}

/** The banked percentages — the readout every loop in this file needs. */
function bank(ctx: PreviewCtx, read: () => string): void {
  const t = ctx.adopt(ctx.scene.add.text(ctx.w * 0.5, 28, '', {
    fontSize: '10px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
    color: hex(SOUND.mintPale),
  }).setOrigin(0.5).setDepth(21));
  ctx.onFrame(() => t.setText(read()));
}

/** One struck note, flying flat across the arena as the kit's own shockwave painter draws it. */
function shockwave(
  ctx: PreviewCtx, s: Stage, from: Mark, foe: Mark, o: { harm: boolean; streak: number },
): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
  const ang = Math.atan2(foe.y - from.y, foe.x - from.x);
  const p = { x: from.x, y: from.y };
  let run = 0;
  let hit = false;
  const width = 1 + o.streak * STREAK_SIZE_PER;
  ctx.onFrame((dt, elapsed) => {
    g.clear();
    if (run >= WAVE_RANGE) return;
    const step = (WAVE_SPEED * dt) / 1000;
    run += step;
    p.x += Math.cos(ang) * step;
    p.y += Math.sin(ang) * step;
    SoundFx.drawShockwave(g, ctx.tint, p.x, p.y, ang,
      26 * width, WAVE_SPREAD + run / WAVE_RANGE * 0.2, WAVE_THICK * width,
      elapsed / 1000, o.harm ? SOUND.gold : SOUND.magenta, 1);
    if (hit || Phaser.Math.Distance.Between(p.x, p.y, foe.x, foe.y) > 24) return;
    hit = true;
    s.fx.boom(foe.x, foe.y, 34, {});
    tick(ctx, foe.x, foe.y - 16, `${o.harm ? STACCATO_HARM_DMG : STACCATO_DMG}`,
      o.harm ? SOUND.gold : SOUND.magenta);
  });
}

// ── Click — Staccato ──────────────────────────────────────────────────

function staccatoLoop(ctx: PreviewCtx, opts: { streak: boolean }): void {
  const s = stageIt(ctx);
  const foe: Mark = { x: ctx.w * 0.82, y: ctx.h * 0.52 };
  dummy(ctx, foe);
  const metro = metronome(ctx);
  let streak = 0;
  if (opts.streak) bank(ctx, () => `encore streak ${streak}  ·  wave +${streak}% wider`);

  // Casts on the beat, then one deliberately off it.
  const beats = [400, 400 + BEAT_MS, 400 + BEAT_MS * 2, 400 + BEAT_MS * 2 + 900];
  beats.forEach((at, i) => {
    ctx.at(at, () => {
      const harm = metro.harmonized(at);
      metro.start(at);
      s.av.play('punch', ctx.aim);
      s.fx.waveBurst(ctx.cx, ctx.cy, ctx.aim, harm ? 1.2 : 1, 9,
        harm ? SOUND.gold : SOUND.magenta);
      shockwave(ctx, s, { x: ctx.cx, y: ctx.cy }, foe, { harm, streak });
      if (i === 0) return;
      if (harm) {
        streak++;
        tick(ctx, ctx.cx, ctx.cy - 40, '🎵 HARMONIZED', SOUND.gold);
        if (opts.streak) tick(ctx, ctx.cx, ctx.cy - 58, `ENCORE ×${streak}`, SOUND.amber);
        return;
      }
      s.fx.discord(ctx.cx, ctx.cy, 9);
      tick(ctx, ctx.cx, ctx.cy - 40, 'OFF THE BEAT', SOUND.crimson);
      if (!opts.streak) return;
      streak = 0;
      tick(ctx, ctx.cx, ctx.cy - 58, 'STREAK LOST', SOUND.crimson);
    });
  });

  label(ctx, ctx.w * 0.5, ctx.h - 8,
    opts.streak ? `+${STREAK_SIZE_PER * 100}% wave width per point, uncapped — and one off-beat cast resets it`
      : `${STACCATO_DMG} → ${STACCATO_HARM_DMG} on the beat · ${WAVE_SPEED} px/s out to ${WAVE_RANGE}px`,
    SOUND.violet);
}

export const staccato: PreviewScript = {
  duration: 6400,
  scale: 0.9,
  caption: 'Click — 10 damage, or 15 if the cast lands inside the metronome\'s gold window',
  run(ctx) { staccatoLoop(ctx, { streak: false }); },
};

export const staccatoUpgraded: PreviewScript = {
  duration: 6400,
  scale: 0.9,
  caption: 'Encore Streak — every harmonized cast widens the wave 1%, and one slip resets the lot',
  run(ctx) { staccatoLoop(ctx, { streak: true }); },
};

// ── E — Disc Dice ─────────────────────────────────────────────────────

const RECORDS = [
  { name: 'ACCELERANDO', color: SOUND.mint, blurb: '+20% speed · cooldowns 25% faster', bank: `+${DISC_BANK_MOVE * 100}% move` },
  { name: 'BASS', color: SOUND.crimson, blurb: '×1.2 damage', bank: `+${DISC_BANK_DMG * 100}% damage` },
  { name: 'CALM', color: SOUND.flow, blurb: '2 HP a second', bank: `+${DISC_BANK_RES * 100}% resistance` },
];

function discLoop(ctx: PreviewCtx, opts: { system: boolean }): void {
  const s = stageIt(ctx);
  const foes: Mark[] = [
    { x: ctx.cx + 70, y: ctx.cy - 30 },
    { x: ctx.cx - 60, y: ctx.cy + 40 },
    { x: ctx.cx + 30, y: ctx.cy + 60 },
  ];
  for (const f of foes) dummy(ctx, f);
  const metro = metronome(ctx);
  let record = 0;
  let banked = [0, 0, 0];
  let speed = 0;
  bank(ctx, () => (opts.system
    ? `bank  +${(banked[0] * DISC_BANK_MOVE * 100).toFixed(0)}% move · +${(banked[1] * DISC_BANK_DMG * 100).toFixed(0)}% dmg · +${(banked[2] * DISC_BANK_RES * 100).toFixed(0)}% res`
    : `+${Math.round(speed * 100)}% move speed · 3s`));

  // The record on the deck, spinning under the caster.
  const deck = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
  ctx.onFrame((_dt, elapsed) => {
    deck.clear();
    SoundFx.drawRecord(deck, ctx.tint, ctx.cx, ctx.cy + 22, 20, elapsed / 260, RECORDS[record].color, 0.9);
  });
  const deckLabel = ctx.adopt(ctx.scene.add.text(ctx.cx, ctx.cy + 48, '', {
    fontSize: '9px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
  }).setOrigin(0.5).setDepth(21));
  ctx.onFrame(() => {
    deckLabel.setText(`${RECORDS[record].name} — ${RECORDS[record].blurb}`);
    deckLabel.setColor(hex(RECORDS[record].color));
  });

  const cast = (at: number, harm: boolean): void => {
    ctx.at(at, () => {
      metro.start(at);
      s.av.play('sweep', 0);
      s.fx.discSlice(ctx.cx, ctx.cy, DISC_RADIUS, RECORDS[record].color, 8);
      s.fx.ringMark(ctx.cx, ctx.cy, DISC_RADIUS, 2, RECORDS[record].color);
      let cut = 0;
      for (const f of foes) {
        if (Phaser.Math.Distance.Between(f.x, f.y, ctx.cx, ctx.cy) > DISC_RADIUS) continue;
        cut++;
        tick(ctx, f.x + (Math.random() - 0.5) * 16, f.y - 14, `${DISC_DMG}`, RECORDS[record].color);
      }
      speed = Math.min(6, cut) * DISC_SPEED_PER_HIT;
      if (opts.system) {
        banked = banked.map((b, i) => (i === record ? b + cut : b));
        tick(ctx, ctx.cx, ctx.cy - 52, `🏦 ${cut} × ${RECORDS[record].bank}`, RECORDS[record].color);
      } else {
        tick(ctx, ctx.cx, ctx.cy - 52, `+${Math.round(speed * 100)}% SPEED · 3s`, SOUND.mintPale);
      }
      if (!harm) return;
      record = (record + 1) % RECORDS.length;
      s.fx.sparkle(ctx.cx, ctx.cy, 8, 30, 10, SOUND.gold);
      tick(ctx, ctx.cx, ctx.cy - 34, `🎵 ${RECORDS[record].name}`, RECORDS[record].color);
    });
  };

  cast(500, false);
  cast(500 + BEAT_MS, true);
  cast(500 + BEAT_MS * 2, true);
  cast(500 + BEAT_MS * 3, true);

  label(ctx, ctx.w * 0.5, ctx.h - 8,
    opts.system ? 'every fighter cut pays into a bank you keep all match · resistance floored at 75% off'
      : `${DISC_DMG} inside ${DISC_RADIUS}px · +${DISC_SPEED_PER_HIT * 100}% speed per fighter cut, 6 max`,
    SOUND.violet);
}

export const discDice: PreviewScript = {
  duration: 8600,
  scale: 0.9,
  caption: 'E — a record slung around you for 15. Harmonized, it changes what is on the deck',
  run(ctx) { discLoop(ctx, { system: false }); },
};

export const discDiceUpgraded: PreviewScript = {
  duration: 8600,
  scale: 0.9,
  caption: 'Sound System — every fighter a record cuts pays into a bank for the rest of the match',
  run(ctx) { discLoop(ctx, { system: true }); },
};

// ── R — Boombox ───────────────────────────────────────────────────────

function boomboxLoop(ctx: PreviewCtx, opts: { jukebox: boolean }): void {
  const home: Mark = { x: ctx.w * 0.3, y: ctx.h * 0.66 };
  const s = drivenCaster(ctx, home);
  const foe: Mark = { x: ctx.w * 0.62, y: ctx.h * 0.4 };
  dummy(ctx, foe);
  const metro = metronome(ctx);

  const box: Mark = { x: ctx.w * 0.58, y: ctx.h * 0.5 };
  let live = -1;
  let golden = true;
  let coined = false;
  let atk = 0;
  let nextPulse = 0;
  let hype = 60;
  bank(ctx, () => `+${(atk * 100).toFixed(0)}% attack speed banked  ·  hype ${Math.round(hype)}`);

  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
  const air = ctx.adopt(ctx.scene.add.graphics().setDepth(8));
  ctx.onFrame((dt, elapsed) => {
    const t = elapsed / 1000;
    g.clear();
    air.clear();
    if (live < 0 || elapsed - live > BOOMBOX_MS) return;
    const r = (golden ? BOOMBOX_RADIUS_GOLD : BOOMBOX_RADIUS) * (coined ? JUKEBOX_RADIUS_MULT : 1) * 0.5;
    SoundFx.drawBoomboxField(g, ctx.tint, box.x, box.y, r, t, golden, 1,
      Phaser.Math.Clamp((elapsed - nextPulse + (coined ? JUKEBOX_PULSE_MS : BOOMBOX_PULSE_MS)) / 600, 0, 1));
    SoundFx.drawBoombox(air, ctx.tint, box.x, box.y, t, golden, 1, 0);

    // Standing in it banks attack speed, permanently, at 1% a second — ×1.5 if it was gold.
    const inside = Phaser.Math.Distance.Between(home.x, home.y, box.x, box.y) <= r;
    if (inside) atk += BOOMBOX_ATK_PER_SEC * (golden ? BOOMBOX_POTENCY : 1) * (dt / 1000);

    if (elapsed < nextPulse) return;
    nextPulse = elapsed + (coined ? JUKEBOX_PULSE_MS : BOOMBOX_PULSE_MS);
    s.fx.bounceWave(box.x, box.y, r, SOUND.magenta, 8);
    if (Phaser.Math.Distance.Between(foe.x, foe.y, box.x, box.y) > r) return;
    // The pulse throws enemies out of the field, and their bullets with them.
    const a = Math.atan2(foe.y - box.y, foe.x - box.x);
    foe.x = Phaser.Math.Clamp(foe.x + Math.cos(a) * BOOMBOX_SHOVE_DIST * 0.5, 12, ctx.w - 12);
    foe.y = Phaser.Math.Clamp(foe.y + Math.sin(a) * BOOMBOX_SHOVE_DIST * 0.5, 12, ctx.h - 12);
    tick(ctx, foe.x, foe.y - 26, '💥 BOUNCED OUT', SOUND.magenta);
  });

  ctx.at(300, () => metro.start(300));
  ctx.at(300 + BEAT_MS, () => {
    const at = 300 + BEAT_MS;
    golden = metro.harmonized(at);
    metro.start(at);
    live = at;
    nextPulse = at + (coined ? JUKEBOX_PULSE_MS : BOOMBOX_PULSE_MS);
    s.av.play('punch', Math.atan2(box.y - home.y, box.x - home.x));
    s.fx.ripple(box.x, box.y, 10, 90, golden ? SOUND.gold : SOUND.magenta, 480, 5, 6);
    tick(ctx, home.x, home.y - 40, golden ? '🎵 HARMONIZED BOX' : '🔊 BOOMBOX', golden ? SOUND.gold : SOUND.magenta);
    if (golden) tick(ctx, box.x, box.y - 40, `${BOOMBOX_RADIUS_GOLD}px · BUFFS ×${BOOMBOX_POTENCY}`, SOUND.gold);
  });

  // Walk into the field and stand there — the whole ability is the standing.
  ctx.onFrame((dt, elapsed) => {
    if (elapsed < 300 + BEAT_MS + 200) return;
    const d = Phaser.Math.Distance.Between(home.x, home.y, box.x, box.y);
    if (d <= 26) return;
    const step = Math.min(d, 150 * (1 + BOOMBOX_MOVE_BONUS) * (dt / 1000));
    home.x += ((box.x - home.x) / d) * step;
    home.y += ((box.y - home.y) / d) * step;
  });

  if (opts.jukebox) {
    ctx.at(4600, () => {
      coined = true;
      hype -= JUKEBOX_HYPE_COST;
      s.fx.sparkle(box.x, box.y, 12, 40, 10, SOUND.gold);
      tick(ctx, box.x, box.y - 40, `🪙 −${JUKEBOX_HYPE_COST} HYPE`, SOUND.gold);
      tick(ctx, box.x, box.y - 58, `+33% FIELD · PULSE EVERY ${JUKEBOX_PULSE_MS / 1000}s`, SOUND.amber);
    });
  }

  label(ctx, ctx.w * 0.5, ctx.h - 8,
    opts.jukebox ? 'press Space at the box — Space alone, so no dodge comes out · one coin per box'
      : `+${BOOMBOX_ATK_PER_SEC * 100}% attack speed a second, kept forever · +${BOOMBOX_MOVE_BONUS * 100}% move while inside`,
    SOUND.violet);
}

export const boombox: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'R — eight seconds of a field that banks attack speed you never lose, and pulses enemies out',
  run(ctx) { boomboxLoop(ctx, { jukebox: false }); },
};

export const boomboxUpgraded: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'Jukebox — feed it 10 hype and the field swells a third and pulses every 2 seconds',
  run(ctx) { boomboxLoop(ctx, { jukebox: true }); },
};

// ── F — Bugle ─────────────────────────────────────────────────────────

interface TrackNote { x: number; kind: 'note' | 'red' | 'hold'; hit: boolean; missed: boolean }

function bugleLoop(ctx: PreviewCtx, opts: { pitch: boolean }): void {
  const s = stageIt(ctx);
  s.sav?.setInstrument('bugle');
  const metro = metronome(ctx);
  let tempo = 0;
  let dmg = 0;
  let atk = 0;
  let slipUsed = false;
  let speedMult = 1;
  bank(ctx, () => `+${Math.round(tempo * 100)}% move & attack`
    + (opts.pitch ? `  ·  +${Math.round(dmg * 100)}% damage  ·  +${Math.round(atk * 100)}% attack` : ''));

  const notes: TrackNote[] = [];
  const barY = ctx.h * 0.74;
  const hitX = ctx.w * 0.28;
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
  let spawnAt = 0;
  let running = false;

  ctx.onFrame((dt, elapsed) => {
    const t = elapsed / 1000;
    const step = dt / 1000;
    g.clear();
    if (!running) return;

    // The bar itself, and the strike line the notes have to reach.
    g.fillStyle(ctx.tint(SOUND.shade), 0.85);
    g.fillRect(12, barY - 14, ctx.w - 24, 28);
    g.lineStyle(2, ctx.tint(SOUND.gold), 0.8);
    g.lineBetween(hitX, barY - 14, hitX, barY + 14);

    if (elapsed >= spawnAt) {
      spawnAt = elapsed + Phaser.Math.Between(420, 940) / speedMult;
      const roll = Math.random();
      const fancy = opts.pitch && roll < (slipUsed ? 0.34 : 0.16);
      notes.push({
        x: ctx.w - 20,
        kind: fancy ? (Math.random() < 0.5 ? 'red' : 'hold') : 'note',
        hit: false, missed: false,
      });
    }

    for (let i = notes.length - 1; i >= 0; i--) {
      const n = notes[i];
      n.x -= PERF_NOTE_SPEED * speedMult * step * 0.55;
      if (n.x < hitX - PERF_TOLERANCE * 0.6) {
        // A red note pays for being *let go* — playing it is the mistake.
        if (n.kind === 'red' && !n.hit) {
          dmg += RED_NOTE_DMG;
          tick(ctx, hitX, barY - 26, `🔴 +${RED_NOTE_DMG * 100}% DAMAGE`, SOUND.crimson);
        } else if (!n.hit && !n.missed) {
          n.missed = true;
          if (!slipUsed) {
            slipUsed = true;
            speedMult = BUGLE_SLIP_SPEEDUP;
            s.fx.discord(ctx.cx, ctx.cy, 9);
            tick(ctx, ctx.cx, ctx.cy - 40, '🎵 ONE SLIP SPENT · BAR ×1.2', SOUND.amber);
          } else {
            running = false;
            s.fx.discord(ctx.cx, ctx.cy, 9);
            tick(ctx, ctx.cx, ctx.cy - 40, 'DROPPED — THE CALL IS OVER', SOUND.crimson);
          }
        }
        notes.splice(i, 1);
        continue;
      }
      SoundFx.drawTrackNote(g, ctx.tint, 30,
        n.kind === 'red' ? SOUND.crimson : n.kind === 'hold' ? SOUND.mint : SOUND.magenta,
        false, t, n.kind, n.kind === 'hold' ? 150 * 0.5 : 0, 0);
      // Painted at its position along the bar.
      g.fillStyle(ctx.tint(n.kind === 'red' ? SOUND.crimson : n.kind === 'hold' ? SOUND.mint : SOUND.magenta), 1);
      g.fillCircle(n.x, barY, n.kind === 'hold' ? 7 : 5.5);
      if (n.kind === 'hold') {
        g.fillStyle(ctx.tint(SOUND.mint), 0.4);
        g.fillRect(n.x, barY - 4, 150 * 0.5, 8);
      }
    }
  });

  ctx.at(400, () => {
    running = true;
    spawnAt = 400;
    metro.start(400);
    s.av.play('raise');
    tick(ctx, ctx.cx, ctx.cy - 40, '🎺 TAKE THE STAGE', SOUND.brassHi);
    tick(ctx, ctx.cx, ctx.cy - 58, 'HARMONIZED — ONE SLIP ALLOWED', SOUND.gold);
  });

  // The notes being struck on time.
  ctx.onFrame((_dt, elapsed) => {
    if (!running || elapsed < 500) return;
    for (const n of notes) {
      if (n.hit || n.missed || Math.abs(n.x - hitX) > PERF_TOLERANCE * 0.5) continue;
      // A red note is deliberately left alone; everything else is played.
      if (n.kind === 'red') continue;
      n.hit = true;
      s.fx.sparkle(hitX, barY, 5, 18, 10, SOUND.gold);
      if (n.kind === 'hold') {
        atk += HOLD_NOTE_ATK;
        tick(ctx, hitX, barY - 26, `🟢 +${HOLD_NOTE_ATK * 100}% ATTACK`, SOUND.mint);
      } else {
        tempo += BUGLE_NOTE_GAIN;
        tick(ctx, hitX, barY - 26, `+${BUGLE_NOTE_GAIN * 100}% BOTH`, SOUND.brassHi);
      }
    }
  });

  label(ctx, ctx.w * 0.5, ctx.h - 8,
    opts.pitch ? 'a red note pays only if you let it run off · a green hold has to be carried the whole tail'
      : 'every note is +1% move AND +1% attack, banked permanently — and one miss ends the run',
    SOUND.violet);
}

export const bugle: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  caption: 'F — a rhythm bar where every note is a permanent percentage of both your speeds',
  run(ctx) { bugleLoop(ctx, { pitch: false }); },
};

export const bugleUpgraded: PreviewScript = {
  duration: 10000,
  scale: 0.9,
  caption: 'Perfect Pitch — red notes pay for being missed, green holds pay for being carried',
  run(ctx) { bugleLoop(ctx, { pitch: true }); },
};

// ── Q — Coda! ─────────────────────────────────────────────────────────

function codaLoop(ctx: PreviewCtx, opts: { party: boolean }): void {
  const s = stageIt(ctx);
  const foe: Mark = { x: ctx.w * 0.78, y: ctx.h * 0.36 };
  dummy(ctx, foe);
  let level = 1;
  let hype = 0;
  let carried = 260;
  bank(ctx, () => `carried ${Math.round(carried)}%  ·  hype ${Math.round(hype)} / ${CODA_PER_LEVEL}  ·  CODA ${level}`);

  const stage = ctx.adopt(ctx.scene.add.graphics().setDepth(2));
  ctx.onFrame((_dt, elapsed) => {
    stage.clear();
    if (level < 2) return;
    SoundFx.drawStage(stage, ctx.tint, ctx.cx, ctx.cy + 26, 90, elapsed / 1000, 0.7);
  });

  const burn = (at: number, mult: number): void => {
    ctx.at(at, () => {
      const gained = Math.round(carried * mult);
      hype += gained;
      s.fx.sparkle(ctx.cx, ctx.cy, 14, 40, 10, SOUND.gold);
      tick(ctx, ctx.cx, ctx.cy - 40, `🔥 BURNED ${Math.round(carried)}% → ${gained} HYPE`, SOUND.gold);
      carried = 0;
      if (hype < CODA_PER_LEVEL * (level)) return;
      hype -= CODA_PER_LEVEL;
      level++;
      s.sav?.setInstrument(level >= 3 ? 'electric' : 'guitar');
      s.fx.boom(ctx.cx, ctx.cy, 80, {});
      ctx.scene.cameras.main.shake(200, 0.005);
      tick(ctx, ctx.cx, ctx.cy - 58, `🎸 CODA ${level}`, SOUND.neon);
      tick(ctx, ctx.cx, ctx.cy - 76,
        `+${CODA_HEAL[level]} HP · ×${CODA_DAMAGE_MULT[level]} DAMAGE · BOOSTS ×${CODA_BOOST_MULT[level]}`,
        SOUND.amber);
    });
  };

  if (!opts.party) {
    burn(700, 1);
    ctx.at(2200, () => { carried = 210; });
    burn(3400, 1);
    ctx.at(5000, () => {
      // At maximum, Q stops being a button and becomes a rhythm bar.
      tick(ctx, ctx.cx, ctx.cy - 40, '🎸 SOLO', SOUND.neon);
      for (let i = 0; i < 4; i++) {
        ctx.at(i * 500, () => {
          const accent = i === 2;
          s.fx.musicWall(ctx.cx, ctx.cy, ctx.w, accent ? SOUND.gold : SOUND.neon, 9);
          tick(ctx, foe.x, foe.y - 14, `${accent ? SOLO_ACCENT_DMG : SOLO_NOTE_DMG}`,
            accent ? SOUND.gold : SOUND.neon);
        });
      }
    });
    label(ctx, ctx.w * 0.5, ctx.h - 8,
      `${CODA_PER_LEVEL} hype a level · tempo counts twice · Solo throws a wall of music across the whole screen`,
      SOUND.violet);
    return;
  }

  // Raise the Roof: three seconds of holding, then twelve of party.
  let ballFrom = -1;
  const ball = ctx.adopt(ctx.scene.add.graphics().setDepth(10));
  const floor = ctx.adopt(ctx.scene.add.graphics().setDepth(1));
  ctx.onFrame((_dt, elapsed) => {
    const t = elapsed / 1000;
    ball.clear();
    floor.clear();
    if (ballFrom < 0 || elapsed - ballFrom > PARTY_MS) return;
    SoundFx.drawDanceFloor(floor, ctx.tint, ctx.w, ctx.h, t, 0.5);
    const sway = Math.sin(t * 1.6) * 0.5;
    SoundFx.drawDiscoBall(ball, ctx.tint, ctx.w * 0.5, 0,
      ctx.w * 0.5 + Math.sin(t * 1.6) * 40, ctx.h * 0.3, 22, t, sway, 1);
  });

  ctx.at(400, () => tick(ctx, ctx.cx, ctx.cy - 40, `⏳ HOLD ${PARTY_HOLD_MS / 1000}s`, SOUND.amber));
  ctx.at(400 + PARTY_HOLD_MS, () => {
    ballFrom = 400 + PARTY_HOLD_MS;
    s.av.play('raise');
    ctx.scene.cameras.main.shake(240, 0.005);
    tick(ctx, ctx.cx, ctx.cy - 40, '🪩 PARTY MODE', SOUND.neon);
    tick(ctx, foe.x, foe.y - 34, `ALL YOUR BUFFS · ${PARTY_MS / 1000}s`, SOUND.crimson);
  });
  burn(400 + PARTY_HOLD_MS + 400, PARTY_HYPE_MULT);
  ctx.at(400 + PARTY_HOLD_MS + 1600, () => {
    s.fx.waveLance(ctx.w * 0.5, ctx.h * 0.3, foe.x, foe.y, SOUND.mirrorLit, 8, 10);
    tick(ctx, foe.x, foe.y - 16, `${BALL_SWING_DMG}`, SOUND.mirrorLit);
    tick(ctx, ctx.w * 0.5, ctx.h * 0.3 - 26, 'SWUNG', SOUND.glint);
  });

  label(ctx, ctx.w * 0.5, ctx.h - 8,
    `the burn pays ×${PARTY_HYPE_MULT} — and every buff you were carrying is on them for ${PARTY_MS / 1000}s`,
    SOUND.violet);
}

export const coda: PreviewScript = {
  duration: 8000,
  scale: 0.9,
  caption: 'Q — burn every percentage you carry for hype, and climb to a bigger instrument',
  run(ctx) { codaLoop(ctx, { party: false }); },
};

export const codaUpgraded: PreviewScript = {
  duration: 8600,
  scale: 0.9,
  caption: 'Raise the Roof — hold for a mirror ball, hand them all your buffs, and burn at double',
  run(ctx) { codaLoop(ctx, { party: true }); },
};

// ── Passives ──────────────────────────────────────────────────────────

export const theMetronome: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  caption: 'Two seconds, a gold window at the end of it, and a cast that lands inside is harmonized',
  run(ctx) {
    const s = stageIt(ctx);
    const foe: Mark = { x: ctx.w * 0.82, y: ctx.h * 0.5 };
    dummy(ctx, foe);
    const metro = metronome(ctx);

    // On, on, off, on — so both outcomes are in frame.
    const casts = [400, 400 + BEAT_MS, 400 + BEAT_MS * 2, 400 + BEAT_MS * 2 + 800, 400 + BEAT_MS * 3 + 800];
    casts.forEach((at, i) => {
      ctx.at(at, () => {
        const harm = i > 0 && metro.harmonized(at);
        metro.start(at);
        s.av.play('punch', ctx.aim);
        s.fx.waveBurst(ctx.cx, ctx.cy, ctx.aim, harm ? 1.2 : 1, 9, harm ? SOUND.gold : SOUND.magenta);
        shockwave(ctx, s, { x: ctx.cx, y: ctx.cy }, foe, { harm, streak: 0 });
        if (i === 0) return;
        if (harm) {
          s.fx.sparkle(ctx.cx, ctx.cy, 8, 28, 10, SOUND.gold);
          tick(ctx, ctx.cx, ctx.cy - 40, `🎵 HARMONIZED · ${STACCATO_HARM_DMG}`, SOUND.gold);
        } else {
          s.fx.discord(ctx.cx, ctx.cy, 9);
          tick(ctx, ctx.cx, ctx.cy - 40, `OFF THE BEAT · ${STACCATO_DMG}`, SOUND.crimson);
        }
      });
    });

    // The metronome itself, ticking beside the caster.
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(8));
    ctx.onFrame((_dt, elapsed) => {
      g.clear();
      const beat = (elapsed % BEAT_MS) / BEAT_MS;
      SoundFx.drawMetronome(g, ctx.tint, ctx.cx - 46, ctx.cy + 8, 0.7,
        Math.sin(beat * Math.PI * 2) * 0.5, beat, 0.9);
    });

    label(ctx, ctx.w * 0.5, ctx.h - 8,
      `${HARMONY_WINDOW}ms of gold inside a ${BEAT_MS / 1000}s bar · every cast restarts it, hit or miss`,
      SOUND.violet);
  },
};

export const theBank: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  caption: 'Nothing this element gives you goes away — and Coda eats every point of it',
  run(ctx) {
    const s = stageIt(ctx);
    let move = 0;
    let atk = 0;
    let dmg = 0;
    let hype = 0;
    bank(ctx, () => `+${Math.round(move * 100)}% move · +${Math.round(atk * 100)}% attack · +${Math.round(dmg * 100)}% damage`);

    const total = ctx.adopt(ctx.scene.add.text(ctx.w * 0.5, ctx.h - 26, '', {
      fontSize: '11px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
      color: hex(SOUND.gold),
    }).setOrigin(0.5).setDepth(21));
    ctx.onFrame(() => {
      // Tempo counts twice, because it buffs two stats.
      const tempo = Math.min(move, atk);
      const points = Math.round(tempo * 200 + (move - tempo) * 100 + (atk - tempo) * 100 + dmg * 100);
      total.setText(hype > 0 ? `🔥 ${hype} hype` : `worth ${points} hype  —  tempo counts twice`);
    });

    const rows: Array<{ at: number; text: string; color: number; apply: () => void }> = [
      { at: 600, text: '🔊 8s in a boombox', color: SOUND.magenta, apply: () => { atk += 0.08; } },
      { at: 2000, text: '🎺 12 bugle notes', color: SOUND.brassHi, apply: () => { move += 0.12; atk += 0.12; } },
      { at: 3400, text: '💿 4 fighters cut on red', color: SOUND.crimson, apply: () => { dmg += 0.08; } },
      { at: 4800, text: '🎺 9 more notes', color: SOUND.brassHi, apply: () => { move += 0.09; atk += 0.09; } },
    ];
    for (const r of rows) {
      ctx.at(r.at, () => {
        r.apply();
        s.fx.notes(ctx.cx, ctx.cy - 10, 5, { depth: 10, color: r.color, rise: 40 });
        tick(ctx, ctx.cx, ctx.cy - 40, r.text, r.color);
      });
    }
    ctx.at(6600, () => {
      const tempo = Math.min(move, atk);
      hype = Math.round(tempo * 200 + (move - tempo) * 100 + (atk - tempo) * 100 + dmg * 100);
      move = 0;
      atk = 0;
      dmg = 0;
      s.fx.sparkle(ctx.cx, ctx.cy, 16, 44, 10, SOUND.gold);
      s.fx.boom(ctx.cx, ctx.cy, 70, {});
      tick(ctx, ctx.cx, ctx.cy - 40, `🔥 CODA — ${hype} HYPE`, SOUND.gold);
      tick(ctx, ctx.cx, ctx.cy - 58, `${CODA_PER_LEVEL} is a level`, SOUND.amber);
    });

    label(ctx, ctx.w * 0.5, ctx.h - 8,
      'no cap, no decay, and the only thing that spends them is you', SOUND.violet);
  },
};

// ── Perk — Harmony ────────────────────────────────────────────────────

export const perkHarmony: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  caption: 'Every harmonized cast also lobs a resonator — and landing one is +15% to both speeds',
  run(ctx) {
    const s = stageIt(ctx);
    const foe: Mark = { x: ctx.w * 0.76, y: ctx.h * 0.42 };
    dummy(ctx, foe);
    const metro = metronome(ctx);
    let stacks = 0;
    bank(ctx, () => `harmony ×${stacks}  ·  +${Math.round(stacks * HARMONY_BONUS_PER_STACK * 100)}% move & attack  ·  ${HARMONY_BUFF_MS / 1000}s`);

    interface Res { x: number; y: number; born: number; gone: boolean }
    const shots: Res[] = [];
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    ctx.onFrame((_dt, elapsed) => {
      const t = elapsed / 1000;
      g.clear();
      for (const r of shots) {
        if (r.gone) continue;
        const age = elapsed - r.born;
        if (age >= HARMONY_FUSE_MS) {
          r.gone = true;
          s.fx.boom(r.x, r.y, HARMONY_RADIUS * 0.5, {});
          if (Phaser.Math.Distance.Between(r.x, r.y, foe.x, foe.y) <= HARMONY_RADIUS * 0.5) {
            tick(ctx, foe.x, foe.y - 14, `${HARMONY_DAMAGE}`, SOUND.brassHi);
            stacks = Math.min(HARMONY_MAX_STACKS, stacks + 1);
            tick(ctx, ctx.cx, ctx.cy - 40,
              `🎶 ×${stacks} · +${Math.round(stacks * HARMONY_BONUS_PER_STACK * 100)}%`, SOUND.gold);
          }
          continue;
        }
        SoundFx.drawGrenade(g, ctx.tint, r.x, r.y, t, 1 - age / HARMONY_FUSE_MS, 1);
      }
    });

    // One resonator every three seconds, thrown on the beat.
    const casts = [400, 400 + BEAT_MS, 400 + BEAT_MS * 2, 400 + BEAT_MS * 3];
    casts.forEach((at, i) => {
      ctx.at(at, () => {
        const harm = i > 0 && metro.harmonized(at);
        metro.start(at);
        s.av.play('punch', ctx.aim);
        s.fx.waveBurst(ctx.cx, ctx.cy, ctx.aim, 1, 9, harm ? SOUND.gold : SOUND.magenta);
        if (!harm) return;
        shots.push({ x: foe.x + (Math.random() - 0.5) * 26, y: foe.y + (Math.random() - 0.5) * 20, born: at, gone: false });
        tick(ctx, ctx.cx, ctx.cy - 58, '🎶 RESONATOR', SOUND.brass);
      });
    });

    label(ctx, ctx.w * 0.5, ctx.h - 8,
      `${HARMONY_DAMAGE} in ${HARMONY_RADIUS}px after a ${HARMONY_FUSE_MS / 1000}s fuse · one every 3s · 4 stacks`,
      SOUND.violet);
  },
};
