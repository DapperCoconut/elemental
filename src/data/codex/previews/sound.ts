import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import {
  SOUND, SONG_COLORS, SONG_NAMES, SONG_ORDER, SONG_PALE, SoundAvatar, SoundFx, musicNote, musicNoteLayered,
  PIANO, drawPiano, drawPianoAirborne, drawPianoTarget, drawAutotuneToggle,
} from '../../../elements/kits/SoundVisuals';

/**
 * Sound's showcases (the 2026-10-15 marching-band rework).
 *
 * The baton, the stage, the trail and the Out of Tune line are all Graphics painted per frame by
 * the static painters in `SoundVisuals`, so these loops keep a tiny copy of the same state, step it
 * with the kit's numbers and paint it with the same functions. Nothing here fires a sprite, so
 * `ctx.fly` is unused throughout.
 *
 * Containment: anything built inside `ctx.at` / `ctx.onFrame` goes through `ctx.adopt`; `SoundFx`
 * carries a sticky sink.
 */

// ── Kit numbers the loops replay ────────────────────────────────────────
const BEAT_MS = 1100;
const WINDOW_MS = 380;
const BATON_RANGE = 170;
const BATON_DMG = 3;
const BATON_DMG_SPIN = 9;
const SPIN_PER_HIT = 0.13;
const DANCE_MS = 2000;
const WAVE_RADIUS = 180;
const SOLO_SCROLL = 0.32;
const PERFECT_MS = 70;

const hex = (c: number): string => `#${c.toString(16).padStart(6, '0')}`;

// ── Staging ───────────────────────────────────────────────────────────

function stage(ctx: PreviewCtx): { fx: SoundFx; av: SoundAvatar } {
  const fx = ctx.capture(() => new SoundFx(ctx.scene, ctx.tint).setSink(ctx.sink));
  const av = ctx.useAvatar(() => new SoundAvatar(ctx.scene, ctx.tint, 'player')) as SoundAvatar;
  av.setFacing(ctx.aim);
  return { fx, av };
}

function dummyAt(ctx: PreviewCtx, at: { x: number; y: number }): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
  ctx.onFrame(() => {
    g.clear();
    g.fillStyle(0x2b2f3d, 1); g.fillCircle(at.x, at.y, 17);
    g.fillStyle(0x3c4254, 1); g.fillCircle(at.x, at.y, 13);
    g.fillStyle(0x8e97ad, 0.9); g.fillCircle(at.x - 5, at.y - 4, 3.2); g.fillCircle(at.x + 5, at.y - 4, 3.2);
  });
}

function float(ctx: PreviewCtx, x: number, y: number, text: string, color: string, size = 11): void {
  const t = ctx.adopt(ctx.scene.add.text(x, y, text, {
    fontSize: `${size}px`, fontFamily: 'Arial Black', color, stroke: '#0b0306', strokeThickness: 3,
  }).setOrigin(0.5).setDepth(19));
  ctx.scene.tweens.add({ targets: t, y: y - 16, alpha: 0, duration: 900 });
}

/** A miniature of the kit's baton: chases `aim` on the 170px leash, spinning at `spin`. */
interface Baton { x: number; y: number; rot: number; spin: number; aim: { x: number; y: number }; hidden: boolean; song: number }

function batonLayer(ctx: PreviewCtx, b: Baton, victim: { x: number; y: number } | null, onHit?: (dmg: number) => void): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
  let lastHit = -1000;
  ctx.onFrame((dt, elapsed) => {
    const c = ctx.casterAt();
    let tx = b.aim.x, ty = b.aim.y;
    const dx = tx - c.x, dy = ty - c.y, d = Math.hypot(dx, dy);
    if (d > BATON_RANGE) { tx = c.x + dx / d * BATON_RANGE; ty = c.y + dy / d * BATON_RANGE; }
    const speed = 280 + 640 * b.spin;
    const ex = tx - b.x, ey = ty - b.y, ed = Math.hypot(ex, ey), step = speed * dt / 1000;
    if (ed <= step) { b.x = tx; b.y = ty; } else { b.x += ex / ed * step; b.y += ey / ed * step; }
    b.rot += (3 + 25 * b.spin) * dt / 1000;
    g.clear();
    if (!b.hidden) SoundFx.drawBaton(g, ctx.tint, b.x, b.y, b.rot, b.spin, elapsed / 1000, 1, b.song);
    if (victim && !b.hidden && Phaser.Math.Distance.Between(b.x, b.y, victim.x, victim.y) < 40 && elapsed - lastHit > 300) {
      lastHit = elapsed;
      onHit?.(Math.round(BATON_DMG + BATON_DMG_SPIN * b.spin));
    }
  });
}

/**
 * The beat bar, drawn along the top of the box; `onBeat` is the loop's "click". With `perfect`, the
 * Musical Perfection sliver is drawn and the beats it names are clicked dead in its middle.
 */
function beatBar(
  ctx: PreviewCtx, hits: (beat: number) => boolean, onClick: (hit: boolean, perfect: boolean) => void,
  perfect?: (beat: number) => boolean,
): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(18));
  const barW = 220, barX = ctx.cx - barW / 2, y = 22;
  let lastBeat = -1;
  let flash = 0;
  let bad = 0;
  ctx.onFrame((dt, elapsed) => {
    const idx = Math.floor(elapsed / BEAT_MS);
    const phase = elapsed - idx * BEAT_MS;
    // Click a little inside the window when the script says this beat is played, early when not.
    const isPerfect = !!perfect?.(idx);
    const clickAt = hits(idx) ? BEAT_MS - WINDOW_MS * (perfect && !isPerfect ? 0.22 : 0.5) : BEAT_MS * 0.4;
    if (idx !== lastBeat && phase >= clickAt) {
      lastBeat = idx;
      const ok = hits(idx);
      if (ok) flash = 1; else bad = 1;
      onClick(ok, ok && isPerfect);
    }
    flash = Math.max(0, flash - dt / 300);
    bad = Math.max(0, bad - dt / 300);
    g.clear();
    g.fillStyle(ctx.tint(SOUND.shade), 0.9);
    g.fillRoundedRect(barX - 6, y - 11, barW + 12, 22, 5);
    g.fillStyle(ctx.tint(SOUND.night), 1);
    g.fillRoundedRect(barX, y - 7, barW, 14, 4);
    const winX = barX + barW * (1 - WINDOW_MS / BEAT_MS);
    g.fillStyle(ctx.tint(SOUND.gold), phase >= BEAT_MS - WINDOW_MS ? 0.55 + flash * 0.4 : 0.22);
    g.fillRoundedRect(winX, y - 7, barX + barW - winX, 14, 4);
    if (perfect) {
      const pw = barW * PERFECT_MS / BEAT_MS;
      g.fillStyle(ctx.tint(SOUND.goldRich), 0.8);
      g.fillRect(barX + barW * (1 - WINDOW_MS / 2 / BEAT_MS) - pw / 2, y - 6, pw, 12);
    }
    if (bad > 0) { g.fillStyle(ctx.tint(SOUND.sour), 0.35 * bad); g.fillRoundedRect(barX, y - 7, barW, 14, 4); }
    g.lineStyle(1, ctx.tint(SOUND.maroonHi), 0.9);
    g.strokeRoundedRect(barX, y - 7, barW, 14, 4);
    g.fillStyle(ctx.tint(SOUND.ivory), 1);
    musicNote(g, barX + 6 + (barW - 12) * (phase / BEAT_MS), y + 3, 5, -0.15, { flags: 1 });
  });
}

// ══ Click — Baton ══════════════════════════════════════════════════════

export const baton: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  caption: 'Click on the metronome\'s notes to spin the baton up — it chases the cursor 170px out and hits for 3, up to 12 at full spin',
  run(ctx) {
    const { fx, av } = stage(ctx);
    const target = { x: ctx.cx + 150, y: ctx.cy + 10 };
    dummyAt(ctx, target);
    const b: Baton = { x: ctx.cx + 40, y: ctx.cy, rot: 0, spin: 0, aim: { x: target.x, y: target.y }, hidden: false, song: SOUND.staccato };
    batonLayer(ctx, b, target, (dmg) => {
      fx.waveBurst(target.x, target.y, 0, 0.5 + b.spin * 0.6, 9, b.spin > 0.6 ? SOUND.gold : SOUND.maroonPale);
      float(ctx, target.x, target.y - 26, `${dmg}`, hex(b.spin > 0.6 ? SOUND.goldHi : SOUND.maroonPale), 11);
    });
    beatBar(ctx, (i) => i !== 3, (ok) => {
      b.spin = ok ? Math.min(1, b.spin + SPIN_PER_HIT * 1.6) : Math.max(0, b.spin - 0.08);
      if (ok) fx.batonFlourish(b.x, b.y - 10); else fx.batonFumble(b.x, b.y - 10);
      av.play('punch', Math.atan2(b.y - ctx.cy, b.x - ctx.cx), 200);
    });
    // The cursor drifts around the dummy, so the baton sweeps through it.
    ctx.onFrame((_dt, el) => {
      b.aim.x = target.x + Math.cos(el / 600) * 40;
      b.aim.y = target.y + Math.sin(el / 600) * 30;
      av.setHold('reach', Math.atan2(b.y - ctx.cy, b.x - ctx.cx));
    });
  },
};

// ══ E — Crescendo ══════════════════════════════════════════════════════

export const crescendo: PreviewScript = {
  duration: 5200,
  scale: 0.9,
  caption: 'E — dance for 2s, speeding up to 2.4×, a stave of music trailing behind; then a wave hits everything within 180px for 30',
  run(ctx) {
    const { fx, av } = stage(ctx);
    const target = { x: ctx.cx + 230, y: ctx.cy };
    dummyAt(ctx, target);
    const from = { x: ctx.cx - 200, y: ctx.cy + 20 };
    ctx.moveCaster(from.x, from.y);
    const trail: { x: number; y: number; at: number }[] = [];
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
    let dancing = false;
    let start = 0;
    ctx.onFrame((_dt, el) => {
      g.clear();
      const c = ctx.casterAt();
      if (dancing) {
        const last = trail[trail.length - 1];
        if (!last || Math.hypot(c.x - last.x, c.y - last.y) > 10) trail.push({ x: c.x, y: c.y + 8, at: el });
        av.setDance(Phaser.Math.Clamp((el - start) / DANCE_MS, 0.3, 1));
      } else av.setDance(0);
      while (trail.length && el - trail[0].at > 1300) trail.shift();
      SoundFx.drawMusicTrail(g, ctx.tint, trail, el, 1300, SOUND.staccato);
    });
    ctx.at(300, () => {
      dancing = true;
      start = 300;
      av.play('raise', undefined, 500);
      av.setHold('ride');
      float(ctx, from.x, from.y - 50, '♪ CRESCENDO', hex(SOUND.goldHi));
      // An ease-in glide is the acceleration: slow off the mark, fast at the end.
      ctx.glideCaster({ to: { x: target.x - 90, y: ctx.cy - 10 }, ms: DANCE_MS, ease: 'in' });
    });
    ctx.at(300 + DANCE_MS, () => {
      dancing = false;
      av.setHold(null);
      const c = ctx.casterAt();
      fx.musicWave(c.x, c.y, WAVE_RADIUS, SOUND.staccato);
      av.play('flex', undefined, 420);
      ctx.at(200, () => float(ctx, target.x, target.y - 30, '30', hex(SOUND.goldHi), 13));
    });
  },
};

// ══ R — Fermata ════════════════════════════════════════════════════════

export const fermata: PreviewScript = {
  duration: 7000,
  scale: 0.9,
  caption: 'R — dash to the baton and slam it at the cursor: 20 and Out of Tune for 8s (25% of abilities misfire). R again: detonate for 25 and a 0.5s stun',
  run(ctx) {
    const { fx, av } = stage(ctx);
    const target = { x: ctx.cx + 220, y: ctx.cy };
    dummyAt(ctx, target);
    ctx.moveCaster(ctx.cx - 160, ctx.cy);
    const b: Baton = { x: ctx.cx + 20, y: ctx.cy + 10, rot: 0, spin: 0.5, aim: { x: ctx.cx + 20, y: ctx.cy + 10 }, hidden: false, song: SOUND.staccato };
    batonLayer(ctx, b, null);
    let tunedUntil = -1;
    const tune = ctx.adopt(ctx.scene.add.graphics().setDepth(10));
    ctx.onFrame((_dt, el) => {
      tune.clear();
      if (el < tunedUntil) SoundFx.drawOutOfTune(tune, ctx.tint, target.x, target.y, el / 1000, 1);
    });
    ctx.at(500, () => {
      const c = ctx.casterAt();
      fx.dashTrail(c.x, c.y, b.x, b.y, SOUND.maroonHi, 12, 4);
      ctx.glideCaster({ to: { x: b.x - 4, y: b.y }, ms: 170, ease: 'out' });
    });
    ctx.at(700, () => {
      const c = ctx.casterAt();
      const ang = Math.atan2(target.y - c.y, target.x - c.x);
      const ix = c.x + Math.cos(ang) * 26, iy = c.y + Math.sin(ang) * 26;
      av.play('slam', ang, 380);
      fx.slam(ix, iy, ang, 130, 40, SOUND.maroonHi);
      b.x = ix; b.y = iy; b.aim = { x: ix + 40, y: iy };
      tunedUntil = 4800;
      float(ctx, target.x, target.y - 30, '20', hex(SOUND.maroonPale), 12);
      float(ctx, target.x, target.y - 50, '♭ OUT OF TUNE', hex(SOUND.sour));
    });
    ctx.at(2100, () => { fx.misfire(target.x, target.y); float(ctx, target.x, target.y - 50, '♭ MISFIRE', hex(SOUND.sour)); });
    ctx.at(3400, () => {
      tunedUntil = -1;
      av.play('clap', undefined, 360);
      fx.sprout(target.x, target.y - 4, SOUND.gold);
      float(ctx, target.x, target.y - 32, '25', hex(SOUND.goldHi), 13);
      float(ctx, target.x, target.y - 54, '♪ RESOLVED — STUNNED', hex(SOUND.goldHi));
    });
  },
};

// ══ F — Hum ════════════════════════════════════════════════════════════

export const hum: PreviewScript = {
  duration: 6000,
  scale: 0.9,
  caption: 'F — change the soul song. Staccato (red) +20% damage · Melody (blue) +25% speed, 20% shorter cooldowns · Smooth (green) 20% resistance, 3 HP/s',
  run(ctx) {
    const { fx, av } = stage(ctx);
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    let idx = 0;
    const path: { x: number; y: number }[] = [];
    av.setSong(SONG_COLORS.staccato, SONG_PALE.staccato);
    ctx.onFrame((_dt, el) => {
      const c = ctx.casterAt();
      const last = path[0];
      if (!last || Math.hypot(c.x - last.x, c.y - last.y) > 4) { path.unshift({ x: c.x, y: c.y }); if (path.length > 40) path.pop(); }
      g.clear();
      const want = [22, 38, 54];
      let acc = 0, wi = 0, prev = { x: c.x, y: c.y };
      const pts: { x: number; y: number }[] = [];
      for (const p of path) {
        acc += Math.hypot(p.x - prev.x, p.y - prev.y); prev = p;
        while (wi < 3 && acc >= want[wi]) { pts.push(p); wi++; }
        if (wi >= 3) break;
      }
      const song = SONG_ORDER[idx];
      pts.forEach((p, i) => musicNoteLayered(g, ctx.tint, p.x, p.y - 14 + Math.sin(el / 250 + i) * 3, 5 - i * 0.6, 0, SONG_COLORS[song], 0.9 - i * 0.18, { flags: i % 2 ? 2 : 1 }));
    });
    // Walk a loop so the notes have somewhere to follow.
    ctx.onFrame((_dt, el) => {
      ctx.moveCaster(ctx.cx + Math.cos(el / 700) * 150, ctx.cy + Math.sin(el / 700) * 40);
    });
    for (const [at, i] of [[800, 1], [2800, 2], [4800, 0]] as const) {
      ctx.at(at, () => {
        idx = i;
        const song = SONG_ORDER[i];
        av.setSong(SONG_COLORS[song], SONG_PALE[song]);
        av.play('flex', undefined, 360);
        const c = ctx.casterAt();
        fx.ripple(c.x, c.y, 10, 40, SONG_COLORS[song], 360, 3, 7, 7);
        fx.notes(c.x, c.y - 16, 6, { speed: 90, size: 7, color: SONG_COLORS[song], rise: 40, angle: -Math.PI / 2, spread: 1.2 });
        float(ctx, c.x, c.y - 52, `♪ ${SONG_NAMES[song]}`, hex(SONG_COLORS[song]));
      });
    }
  },
};

// ══ Q — Call of the Void ═══════════════════════════════════════════════

export const callOfTheVoid: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  caption: 'Q — a 15s bugle solo, untouchable on stage: pick the line with W/S, click on the bar. 15 a note, wherever the enemy is; slurs are held',
  run(ctx) {
    const { fx, av } = stage(ctx);
    const target = { x: ctx.cx + 240, y: ctx.cy + 20 };
    dummyAt(ctx, target);
    const sx = ctx.cx - 220, sy = ctx.cy + 20;
    ctx.moveCaster(sx, sy, { facing: 0 });
    const st = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
    const hud = ctx.adopt(ctx.scene.add.graphics().setDepth(18));
    // A short chart: quarters, eighths, then a slur that moves line.
    const notes = [
      { at: 900, lane: 1, flags: 0, len: 0, to: 1 }, { at: 1500, lane: 1, flags: 0, len: 0, to: 1 },
      { at: 2100, lane: 0, flags: 0, len: 0, to: 0 }, { at: 2700, lane: 1, flags: 1, len: 0, to: 1 },
      { at: 3030, lane: 2, flags: 1, len: 0, to: 2 }, { at: 3360, lane: 2, flags: 1, len: 0, to: 2 },
      { at: 3900, lane: 1, flags: 0, len: 800, to: 0 }, { at: 5200, lane: 0, flags: 2, len: 0, to: 0 },
      { at: 5375, lane: 1, flags: 2, len: 0, to: 1 }, { at: 5550, lane: 2, flags: 2, len: 0, to: 2 },
      { at: 5725, lane: 1, flags: 2, len: 0, to: 1 }, { at: 6300, lane: 1, flags: 0, len: 900, to: 2 },
    ];
    const done = new Set<number>();
    let lane = 1;
    av.setInstrument('bugle');
    av.setHold('brace', 0);
    fx.fanfare(sx, sy);
    ctx.onFrame((_dt, el) => {
      st.clear();
      SoundFx.drawStage(st, ctx.tint, sx, sy + 16, el / 1000);
      ctx.moveCaster(sx, sy, { facing: 0 });
      // The player's line follows the chart, switching a beat early like a person would.
      const next = notes.find((n) => el < n.at + n.len + 60);
      if (next) lane = el > next.at + next.len * 0.5 ? next.to : next.lane;
      hud.clear();
      const left = ctx.cx - 260, top = 6, w = 520, h = 70, gap = 18, mid = top + h / 2;
      const ly = (i: number) => mid + (i - 1) * gap;
      const hitX = left + 50;
      hud.fillStyle(ctx.tint(SOUND.shade), 0.85); hud.fillRoundedRect(left, top, w, h, 8);
      hud.lineStyle(1.6, ctx.tint(SOUND.gold), 0.9); hud.strokeRoundedRect(left, top, w, h, 8);
      hud.fillStyle(ctx.tint(SOUND.gold), 0.12); hud.fillRect(left + 6, ly(lane) - gap / 2 + 2, w - 12, gap - 4);
      for (let i = 0; i < 3; i++) {
        hud.lineStyle(i === lane ? 2 : 1.2, ctx.tint(i === lane ? SOUND.goldHi : SOUND.maroonPale), 0.8);
        hud.lineBetween(left + 10, ly(i), left + w - 10, ly(i));
      }
      hud.lineStyle(2.4, ctx.tint(SOUND.goldHi), 0.95); hud.lineBetween(hitX, top + 6, hitX, top + h - 6);
      notes.forEach((n, i) => {
        const x = hitX + (n.at - el) * SOLO_SCROLL;
        const tx = hitX + (n.at + n.len - el) * SOLO_SCROLL;
        if (x > left + w + 10 || (n.len === 0 && x < left + 4) || tx < left + 4) return;
        const hit = done.has(i);
        const c = hit ? SOUND.goldHi : n.len > 0 ? SOUND.melodyPale : SOUND.ivory;
        if (n.len > 0) {
          const mx = hitX + (n.at + n.len * 0.5 - el) * SOLO_SCROLL;
          hud.fillStyle(ctx.tint(c), 0.5);
          hud.fillRect(Math.max(left + 6, x), ly(n.lane) - 3, Math.max(0, Math.min(mx, left + w - 10) - Math.max(left + 6, x)), 6);
          if (mx < left + w - 10) hud.fillRect(Math.max(left + 6, mx), ly(n.to) - 3, Math.max(0, Math.min(tx, left + w - 10) - Math.max(left + 6, mx)), 6);
        }
        if (x >= left + 4) { hud.fillStyle(ctx.tint(c), hit ? 0.35 : 1); musicNote(hud, x, ly(n.lane), 6, -0.25, { flags: n.flags, stemDown: n.lane === 0 }); }
        if (!hit && el >= n.at + n.len) {
          done.add(i);
          fx.noteShot(sx + 50, sy - 2, target.x, target.y, n.len > 0 ? SOUND.goldHi : SOUND.staccato, n.len > 0);
          ctx.at(300, () => float(ctx, target.x, target.y - 28, n.len > 0 ? '15 +15' : '15', hex(SOUND.goldHi), 12));
        }
      });
    });
  },
};

// ══ Passives ═══════════════════════════════════════════════════════════

export const theMetronome: PreviewScript = {
  duration: 8000,
  scale: 0.9,
  caption: 'The metronome never stops: a note crosses the bar every 1.1s. Click inside the gold third to spin up; an early click or a dropped beat spins it down',
  run(ctx) {
    const { fx, av } = stage(ctx);
    const b: Baton = { x: ctx.cx + 60, y: ctx.cy, rot: 0, spin: 0, aim: { x: ctx.cx + 110, y: ctx.cy - 10 }, hidden: false, song: SOUND.staccato };
    batonLayer(ctx, b, null);
    beatBar(ctx, (i) => i % 4 !== 3, (ok) => {
      b.spin = ok ? Math.min(1, b.spin + SPIN_PER_HIT * 1.5) : Math.max(0, b.spin - 0.08);
      if (ok) { fx.batonFlourish(b.x, b.y - 10); float(ctx, b.x, b.y - 36, `SPIN ${Math.round(b.spin * 100)}%`, hex(SOUND.goldHi), 10); }
      else { fx.batonFumble(b.x, b.y - 10); float(ctx, b.x, b.y - 36, 'FUMBLE', hex(SOUND.sour), 10); }
    });
    ctx.onFrame((_dt, el) => {
      b.aim.x = ctx.cx + 110 + Math.cos(el / 900) * 30;
      av.setHold('reach', Math.atan2(b.y - ctx.cy, b.x - ctx.cx));
    });
  },
};

export const outOfTune: PreviewScript = {
  duration: 5200,
  scale: 0.9,
  caption: 'Out of Tune: a discordant line through the victim. A quarter of their abilities misfire — the cooldown is spent and nothing happens',
  run(ctx) {
    const { fx } = stage(ctx);
    const target = { x: ctx.cx + 140, y: ctx.cy };
    dummyAt(ctx, target);
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(10));
    ctx.onFrame((_dt, el) => { g.clear(); SoundFx.drawOutOfTune(g, ctx.tint, target.x, target.y, el / 1000, 1); });
    for (const at of [900, 2600, 4100]) {
      ctx.at(at, () => { fx.misfire(target.x, target.y); float(ctx, target.x, target.y - 50, '♭ MISFIRE', hex(SOUND.sour)); });
    }
  },
};

// ══ Perks ══════════════════════════════════════════════════════════════

export const perkHarmony: PreviewScript = {
  duration: 6000,
  scale: 0.9,
  caption: 'Harmony — every 8th beat in a row lobs a resonator at the baton: 20 in 100px, and +15% move and attack speed for 20s per hit (to 4)',
  run(ctx) {
    const { fx } = stage(ctx);
    const target = { x: ctx.cx + 170, y: ctx.cy };
    dummyAt(ctx, target);
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    const gren = { x: ctx.cx, y: ctx.cy, live: false, fuseAt: 0 };
    ctx.onFrame((_dt, el) => {
      g.clear();
      if (gren.live) SoundFx.drawGrenade(g, ctx.tint, gren.x, gren.y, el / 1000, gren.fuseAt > 0 ? Phaser.Math.Clamp(1 - (gren.fuseAt - el) / 900, 0, 1) : 0);
    });
    ctx.at(600, () => {
      float(ctx, ctx.cx, ctx.cy - 50, '×8', hex(SOUND.goldHi));
      gren.live = true;
      ctx.scene.tweens.add({ targets: gren, x: target.x, y: target.y, duration: 380, onComplete: () => { gren.fuseAt = 980 + 900; } });
    });
    ctx.at(1900, () => {
      gren.live = false;
      fx.boom(target.x, target.y, 100, { color: SOUND.gold, petals: 9, notes: 6 });
      float(ctx, target.x, target.y - 30, '20', hex(SOUND.goldHi), 13);
      float(ctx, ctx.cx, ctx.cy - 50, '🌟 HARMONY ×1', hex(SOUND.goldHi));
    });
  },
};

export const perkBass: PreviewScript = {
  duration: 5000,
  scale: 0.9,
  caption: 'Bass — a Fermata slam while Staccato plays lays 5 water charges down the line; each goes off for 10',
  run(ctx) {
    const { fx, av } = stage(ctx);
    const target = { x: ctx.cx + 150, y: ctx.cy };
    dummyAt(ctx, target);
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
    const charges: { x: number; y: number; at: number; boom: number }[] = [];
    ctx.onFrame((_dt, el) => {
      g.clear();
      for (let i = charges.length - 1; i >= 0; i--) {
        const c = charges[i];
        if (el >= c.boom) {
          charges.splice(i, 1);
          fx.boom(c.x, c.y, 48, { color: SOUND.aqua, petals: 7, notes: 3, duration: 380 });
          if (Math.abs(c.x - target.x) < 50) float(ctx, target.x, target.y - 30, '10', hex(SOUND.foam), 12);
          continue;
        }
        SoundFx.drawBassCharge(g, ctx.tint, c.x, c.y, el / 1000, Phaser.Math.Clamp((c.boom - el) / (c.boom - c.at), 0, 1));
      }
    });
    ctx.at(600, () => {
      const ix = ctx.cx + 26, iy = ctx.cy;
      av.play('slam', 0, 380);
      fx.slam(ix, iy, 0, 130, 40, SOUND.maroonHi);
      for (let i = 0; i < 5; i++) charges.push({ x: ix + 97 + (i - 2) * 52, y: iy, at: 600, boom: 600 + 480 + i * 80 });
    });
  },
};

// ══ Shop upgrades ══════════════════════════════════════════════════════

export const batonUpgraded: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  caption: 'Click+ Musical Perfection — the richer gold sliver mid-window spins the baton up 22%; tap yourself with the baton for +35% speed',
  run(ctx) {
    const { fx, av } = stage(ctx);
    const b: Baton = { x: ctx.cx + 80, y: ctx.cy, rot: 0, spin: 0, aim: { x: ctx.cx + 110, y: ctx.cy }, hidden: false, song: SOUND.staccato };
    batonLayer(ctx, b, null);
    beatBar(ctx, (i) => i !== 4, (ok, perfect) => {
      b.spin = ok ? Math.min(1, b.spin + (perfect ? 0.22 : SPIN_PER_HIT)) : Math.max(0, b.spin - 0.08);
      if (perfect) {
        fx.batonFlourish(b.x, b.y - 10, SOUND.goldRich);
        fx.sparkle(b.x, b.y - 12, 6, 22, 11, SOUND.goldRichHi);
        float(ctx, b.x, b.y - 36, '✦ PERFECT +22%', hex(SOUND.goldRich), 10);
      } else if (ok) {
        fx.batonFlourish(b.x, b.y - 10);
        float(ctx, b.x, b.y - 36, '+13%', hex(SOUND.goldHi), 10);
      } else fx.batonFumble(b.x, b.y - 10);
    }, (i) => i % 2 === 0);
    // Twice, the cursor comes home: the baton taps the drum major, who sprints off.
    let tapped = -1;
    ctx.onFrame((_dt, el) => {
      const c = ctx.casterAt();
      const home = (el > 2400 && el < 3300) || (el > 6000 && el < 6900);
      b.aim = home ? { x: c.x, y: c.y } : { x: c.x + 110, y: c.y + Math.sin(el / 500) * 30 };
      av.setHold('reach', Math.atan2(b.y - c.y, b.x - c.x));
      if (home && Math.hypot(b.x - c.x, b.y - c.y) < 30 && el - tapped > 1500) {
        tapped = el;
        fx.batonFlourish(c.x, c.y - 12, SOUND.goldRich);
        fx.ripple(c.x, c.y, 8, 30, SOUND.staccato, 260, 2.4, 7, 6);
        float(ctx, c.x, c.y - 46, '♪ TEMPO! +35%', hex(SOUND.goldRichHi), 10);
        ctx.glideCaster({ to: { x: c.x + (c.x < ctx.cx ? 160 : -160), y: c.y }, ms: 420, ease: 'out' });
      }
    });
    ctx.moveCaster(ctx.cx - 80, ctx.cy);
  },
};

export const crescendoUpgraded: PreviewScript = {
  duration: 5600,
  scale: 0.9,
  caption: 'E+ Infectious Moves — everyone the wave hits dances for 2s: they can still move, but cannot attack',
  run(ctx) {
    const { fx, av } = stage(ctx);
    const target = { x: ctx.cx + 120, y: ctx.cy };
    dummyAt(ctx, target);
    ctx.moveCaster(ctx.cx - 160, ctx.cy);
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(5));
    let danceUntil = -1;
    ctx.onFrame((_dt, el) => {
      g.clear();
      if (el < danceUntil) {
        target.x = ctx.cx + 120 + Math.sin(el / 160) * 10;
        SoundFx.drawDancing(g, ctx.tint, target.x, target.y, el / 1000, SOUND.staccato, Math.min(1, (danceUntil - el) / 300));
      }
    });
    ctx.at(200, () => {
      av.play('raise', undefined, 500);
      av.setHold('ride');
      av.setDance(0.6);
      ctx.glideCaster({ to: { x: ctx.cx - 20, y: ctx.cy + 10 }, ms: DANCE_MS, ease: 'in' });
    });
    ctx.at(200 + DANCE_MS, () => {
      av.setHold(null);
      av.setDance(0);
      const c = ctx.casterAt();
      fx.musicWave(c.x, c.y, WAVE_RADIUS, SOUND.staccato);
      av.play('flex', undefined, 420);
      danceUntil = 200 + DANCE_MS + 2000;
      float(ctx, target.x, target.y - 30, '30', hex(SOUND.goldHi), 13);
      float(ctx, target.x, target.y - 50, '💃 DANCE!', hex(SOUND.goldHi));
    });
    ctx.at(200 + DANCE_MS + 900, () => float(ctx, target.x, target.y - 50, '🚫 can\'t attack', hex(SOUND.maroonPale), 10));
  },
};

export const fermataUpgraded: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  caption: 'R+ Harmony — R with the baton on top of you: In Tune. An echo baton circles, the song plays 50% stronger, regen falls 12 → 0 → hurting. Recast for the net as a burst',
  run(ctx) {
    const { fx, av } = stage(ctx);
    const target = { x: ctx.cx + 60, y: ctx.cy - 20 };
    dummyAt(ctx, target);
    const b: Baton = { x: ctx.cx + 30, y: ctx.cy, rot: 0, spin: 0.3, aim: { x: ctx.cx, y: ctx.cy }, hidden: false, song: SOUND.smooth };
    batonLayer(ctx, b, null);
    av.setSong(SONG_COLORS.smooth, SONG_PALE.smooth);
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    const start = 900;
    let on = false, net = 0, acc = 0, ang = 0, lastHit = -1000;
    ctx.onFrame((dt, el) => {
      g.clear();
      if (!on) return;
      const c = ctx.casterAt();
      const secs = (el - start) / 1000 * 1.6; // run at 1.6× so the turn arrives inside the loop
      const rate = 12 - 2 * secs;
      acc += rate * dt / 1000 * 1.6;
      while (acc >= 1) { acc -= 1; net += 1; }
      while (acc <= -1) { acc += 1; net -= 1; }
      SoundFx.drawInTune(g, ctx.tint, c.x, c.y, el / 1000, rate / 12, SOUND.smooth, 1);
      ang += 4.2 * dt / 1000;
      const ex = c.x + Math.cos(ang) * 62, ey = c.y + Math.sin(ang) * 50;
      SoundFx.drawBaton(g, ctx.tint, ex, ey, el / 200, 0.8, el / 1000, 0.6, SOUND.smoothPale);
      if (Math.hypot(ex - target.x, ey - target.y) < 38 && el - lastHit > 450) {
        lastHit = el;
        fx.waveBurst(target.x, target.y, Math.atan2(target.y - ey, target.x - ex), 0.6, 9, SOUND.smoothPale);
        float(ctx, target.x, target.y - 28, '6', hex(SOUND.smoothPale), 11);
      }
    });
    ctx.at(start, () => {
      on = true;
      av.play('raise', undefined, 500);
      fx.ripple(ctx.cx, ctx.cy, 10, 56, SOUND.smooth, 520, 3, 9, 8);
      float(ctx, ctx.cx, ctx.cy - 56, '♪ IN TUNE', hex(SOUND.goldHi), 12);
    });
    for (const at of [1900, 2900, 3900]) ctx.at(at, () => float(ctx, ctx.cx - 30, ctx.cy - 40, `+${net} so far`, hex(SOUND.smoothPale), 10));
    ctx.at(start + 3750, () => {
      on = false;
      av.play('clap', undefined, 360);
      fx.ripple(ctx.cx, ctx.cy, 12, 70, SOUND.smooth, 560, 4, 9, 9);
      fx.sparkle(ctx.cx, ctx.cy, 10, 36, 11, SOUND.smoothPale);
      float(ctx, ctx.cx, ctx.cy - 58, `♪ RESOLVED +${net}`, hex(SOUND.smoothPale), 13);
    });
  },
};

export const humUpgraded: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  caption: 'F+ Practice Makes Perfect — every beat hit levels the song you are playing (5 beats a level, 8% stronger each, to 10). Each song levels on its own',
  run(ctx) {
    const { fx, av } = stage(ctx);
    const b: Baton = { x: ctx.cx + 80, y: ctx.cy, rot: 0, spin: 0.4, aim: { x: ctx.cx + 100, y: ctx.cy + 20 }, hidden: false, song: SOUND.staccato };
    batonLayer(ctx, b, null);
    let hits = 0;
    const tab = ctx.adopt(ctx.scene.add.graphics().setDepth(18));
    const label = ctx.adopt(ctx.scene.add.text(ctx.cx - 34, 44, '', {
      fontSize: '9px', fontFamily: 'Arial Black', color: hex(SOUND.staccato), stroke: '#0b0306', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(19));
    ctx.onFrame(() => {
      const lvl = Math.floor(hits / 2); // two beats a level here, so it climbs inside the loop
      tab.clear();
      tab.fillStyle(ctx.tint(SOUND.maroonDeep), 0.94); tab.fillRoundedRect(ctx.cx - 75, 38, 150, 12, 5);
      tab.lineStyle(1, ctx.tint(SOUND.gold), 0.85); tab.strokeRoundedRect(ctx.cx - 75, 38, 150, 12, 5);
      for (let i = 0; i < 10; i++) {
        tab.fillStyle(ctx.tint(SOUND.night), 1); tab.fillCircle(ctx.cx + 12 + i * 6, 44, 2.3);
        if (i < lvl) { tab.fillStyle(ctx.tint(SOUND.staccato), 1); tab.fillCircle(ctx.cx + 12 + i * 6, 44, 2.1); }
      }
      label.setText(`STACCATO · LV ${lvl}`);
    });
    let sparkAt = 0;
    ctx.onFrame((_dt, el) => {
      const lvl = Math.floor(hits / 2);
      const c = ctx.casterAt();
      av.setHold('reach', Math.atan2(b.y - c.y, b.x - c.x));
      if (lvl > 0 && el >= sparkAt) {
        sparkAt = el + Math.max(150, 1000 - lvl * 85);
        fx.sparkle(c.x, c.y, 1 + Math.floor(lvl / 3), 22 + lvl * 2, 7, SOUND.staccato);
      }
    });
    beatBar(ctx, () => true, (ok) => {
      if (!ok) return;
      fx.batonFlourish(b.x, b.y - 10, SOUND.staccato);
      hits++;
      if (hits % 2 === 0) {
        const c = ctx.casterAt();
        fx.notes(c.x, c.y - 16, 4 + hits / 2, { speed: 110, size: 6, color: SOUND.staccato, rise: 50, angle: -Math.PI / 2, spread: 1.5 });
        float(ctx, c.x, c.y - 56, `♪ STACCATO LV ${hits / 2}`, hex(SOUND.staccato), 11);
      }
    });
  },
};

export const callOfTheVoidUpgraded: PreviewScript = {
  duration: 7000,
  scale: 0.9,
  caption: 'Q+ Big Finish! — hold Space to speed the solo up (never back down). At the end: a gong for up to 150 by flair — then Deaf for 8s, dealing no damage',
  run(ctx) {
    const { fx, av } = stage(ctx);
    const target = { x: ctx.cx + 240, y: ctx.cy + 20 };
    dummyAt(ctx, target);
    const sx = ctx.cx - 160, sy = ctx.cy + 20;
    ctx.moveCaster(sx, sy, { facing: 0 });
    const st = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
    const hud = ctx.adopt(ctx.scene.add.graphics().setDepth(18));
    const fg = ctx.adopt(ctx.scene.add.graphics().setDepth(10));
    let tempo = 1;
    let soloing = true;
    let gongAt = -1;
    let deafUntil = -1;
    let flair = 0;
    av.setInstrument('bugle');
    av.setHold('brace', 0);
    let noteAt = 400;
    ctx.onFrame((dt, el) => {
      st.clear(); hud.clear(); fg.clear();
      if (soloing) {
        SoundFx.drawStage(st, ctx.tint, sx, sy + 16, el / 1000);
        if (el > 800) tempo = Math.min(2, tempo + 0.3 * dt / 1000);
        if (el >= noteAt) {
          noteAt = el + 420 / tempo;
          fx.noteShot(sx + 50, sy - 2, target.x, target.y, SOUND.staccato, false);
        }
        const fw = 160, fx0 = ctx.cx - fw / 2, fy = 16, k = tempo - 1;
        hud.fillStyle(ctx.tint(SOUND.night), 0.95); hud.fillRoundedRect(fx0, fy, fw, 9, 3);
        hud.fillStyle(ctx.tint(k > 0.66 ? SOUND.goldRich : SOUND.bronze), 1);
        if (k > 0) hud.fillRoundedRect(fx0, fy, Math.max(4, fw * k), 9, 3);
        hud.lineStyle(1, ctx.tint(SOUND.goldHi), 0.8); hud.strokeRoundedRect(fx0, fy, fw, 9, 3);
      }
      if (gongAt >= 0) {
        const k = Phaser.Math.Clamp((el - gongAt) / 560, 0, 1);
        const ring = el - gongAt - 560;
        SoundFx.drawGong(st, ctx.tint, sx + 70, sy, 1, el / 1000, k, ring > 0 ? ring : 0, flair, 1);
      }
      if (el < deafUntil) SoundFx.drawDeaf(fg, ctx.tint, sx, sy - 30, el / 1000, 1);
    });
    ctx.at(900, () => float(ctx, ctx.cx, 40, 'holding Space…', hex(SOUND.goldRichHi), 10));
    ctx.at(3600, () => {
      soloing = false;
      flair = tempo - 1;
      av.setInstrument('none');
      av.setHold('reach', 0);
      av.play('raise', undefined, 560);
      gongAt = 3600;
      float(ctx, sx, sy - 62, `🔔 BIG FINISH ×${tempo.toFixed(2)}`, hex(SOUND.goldRichHi), 12);
    });
    ctx.at(4160, () => {
      av.play('slam', 0, 380);
      fx.boom(sx + 70, sy - 6, 90 + flair * 90, { color: SOUND.bronzeHi, petals: 10, notes: 8, duration: 620 });
      ctx.at(160, () => float(ctx, target.x, target.y - 30, `${Math.round(150 * flair)}`, hex(SOUND.goldRichHi), 15));
      float(ctx, sx + 70, sy - 70, 'BONG!', hex(SOUND.goldRichHi), 16);
      deafUntil = 4160 + 2600;
      ctx.at(300, () => float(ctx, sx, sy - 46, '🔇 DEAF — 0 damage', hex(SOUND.steel), 10));
    });
  },
};

// ══ Mastery ════════════════════════════════════════════════════════════

export const masteryAutotune: PreviewScript = {
  duration: 8000,
  scale: 0.9,
  caption: 'Autotune — the song picks itself: Melody when far and healthy, Staccato in fighting distance, Smooth whenever HP is low. A switch under the HP bar turns it off',
  run(ctx) {
    const { fx, av } = stage(ctx);
    av.setMastered(true);
    const foe = { x: ctx.cx + 230, y: ctx.cy };
    dummyAt(ctx, foe);
    let song: (typeof SONG_ORDER)[number] = 'melody';
    let hp = 1;
    av.setSong(SONG_COLORS.melody, SONG_PALE.melody);
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(18));
    ctx.onFrame((_dt, el) => {
      g.clear();
      drawAutotuneToggle(g, ctx.tint, ctx.cx, 22, 124, 16, true, SONG_COLORS[song], 0);
      // A small HP bar over the drum major, draining for the last act.
      const c = ctx.casterAt();
      g.fillStyle(ctx.tint(SOUND.night), 0.9); g.fillRect(c.x - 24, c.y - 70, 48, 6);
      g.fillStyle(hp < 0.35 ? 0xdd4444 : 0x22dd55, 1); g.fillRect(c.x - 24, c.y - 70, 48 * hp, 6);
      void el;
    });
    const set = (next: typeof song): void => {
      song = next;
      av.setSong(SONG_COLORS[next], SONG_PALE[next]);
      av.play('flex', undefined, 360);
      const c = ctx.casterAt();
      fx.ripple(c.x, c.y, 10, 40, SONG_COLORS[next], 360, 3, 7, 7);
      fx.notes(c.x, c.y - 16, 6, { speed: 90, size: 7, color: SONG_COLORS[next], rise: 40, angle: -Math.PI / 2, spread: 1.2 });
      float(ctx, c.x, c.y - 52, `♪ AUTOTUNE · ${SONG_NAMES[next]}`, hex(SONG_COLORS[next]));
    };
    // Walk in from afar (Melody), close the gap (Staccato), get hurt and back off (Smooth).
    ctx.moveCaster(ctx.cx - 260, ctx.cy);
    ctx.at(600, () => ctx.glideCaster({ to: { x: foe.x - 150, y: foe.y }, ms: 1800, ease: 'out' }));
    ctx.at(2100, () => set('staccato'));
    ctx.at(3600, () => { hp = 0.3; float(ctx, ctx.casterAt().x, ctx.casterAt().y - 30, '−40', '#ff6677', 12); });
    ctx.at(3800, () => set('smooth'));
    ctx.at(4400, () => ctx.glideCaster({ to: { x: ctx.cx - 260, y: ctx.cy }, ms: 1800, ease: 'out' }));
    ctx.at(5000, () => { hp = 0.45; });
    ctx.at(6000, () => { hp = 0.7; });
    ctx.at(6300, () => set('melody'));
  },
};

export const masteryFortePiano: PreviewScript = {
  duration: 10500,
  scale: 0.8,
  caption: 'Forte Piano — 5s at a grand piano: melodious keys charge it. Fling it, and 2s later it crashes on the cursor (20–110). At 60%+ they are Out of Tune; with a Fermata stack too they are Dissonant — slowed, bleeding, and both stacks detonate at once',
  run(ctx) {
    const { fx, av } = stage(ctx);
    av.setMastered(true);
    const seat = { x: ctx.cx - 150, y: ctx.cy - 20 };
    const foe = { x: ctx.cx + 200, y: ctx.cy + 40 };
    dummyAt(ctx, foe);
    ctx.moveCaster(seat.x, seat.y);
    const st = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
    const air = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    const flash = new Array(13).fill(0);
    let charge = 0;
    let phase: 'play' | 'fly' | 'done' = 'play';
    let flyAt = 0;
    let tuned = false;
    let dissonant = false;
    // A tune that climbs and comes home to C: C E G E F A G C.
    const tune = [0, 2, 4, 2, 3, 5, 4, 7];
    const left = seat.x - (PIANO.whiteKeys * PIANO.keyW) / 2;
    tune.forEach((k, i) => ctx.at(500 + i * 520, () => {
      flash[k] = 1;
      charge = Math.min(1, charge + 0.105);
      const kx = left + (k + 0.5) * PIANO.keyW;
      fx.notes(kx, seat.y + PIANO.top - 4, 2, { speed: 60, size: 6, life: 700, color: SOUND.goldRich, rise: 36 });
    }));
    ctx.at(4900, () => {
      charge = Math.min(1, charge + 0.08);
      phase = 'fly';
      flyAt = 4900;
      av.play('raise', undefined, 500);
      float(ctx, seat.x, seat.y - 100, `🎹 FORTE! ${Math.round(charge * 100)}%`, hex(SOUND.goldRichHi), 13);
    });
    ctx.at(6900, () => {
      phase = 'done';
      fx.pianoCrash(foe.x, foe.y, 90, charge);
      fx.boom(foe.x, foe.y, 100, { color: SOUND.goldRich, petals: 10, notes: 10, duration: 560 });
      float(ctx, foe.x, foe.y - 64, `🎹 CRASH! ${Math.round(20 + 90 * charge)}`, hex(SOUND.goldRichHi), 14);
      tuned = true;
      float(ctx, foe.x, foe.y - 40, '♭ OUT OF TUNE', hex(SOUND.sour));
    });
    // The slam lands on top: two stacks, Dissonance.
    ctx.at(7700, () => {
      fx.slam(foe.x - 40, foe.y, 0, 90, 30, SOUND.maroonHi);
      dissonant = true;
      float(ctx, foe.x, foe.y - 62, '♭♭ DISSONANCE', hex(SOUND.sour), 12);
    });
    for (const at of [8300, 8800]) ctx.at(at, () => float(ctx, foe.x + 14, foe.y - 30, '3', hex(SOUND.sour), 10));
    ctx.at(9300, () => {
      tuned = false; dissonant = false;
      av.play('clap', undefined, 360);
      fx.sprout(foe.x, foe.y - 4, SOUND.gold);
      fx.sprout(foe.x + 10, foe.y - 10, SOUND.goldRich);
      float(ctx, foe.x, foe.y - 48, '♪♪ DOUBLE RESOLVE 55', hex(SOUND.goldRichHi), 12);
    });
    ctx.onFrame((dt, el) => {
      const t = el / 1000;
      for (let i = 0; i < flash.length; i++) flash[i] = Math.max(0, flash[i] - dt / 220);
      st.clear();
      air.clear();
      if (phase === 'play') {
        ctx.moveCaster(seat.x, seat.y);
        drawPiano(st, ctx.tint, seat.x, seat.y, flash, charge, t);
      } else if (phase === 'fly') {
        const k = Phaser.Math.Clamp((el - flyAt) / 2000, 0, 1);
        // The cursor sweeps onto the dummy, then the mark locks.
        const tx = Phaser.Math.Linear(ctx.cx, foe.x, Math.min(1, k * 1.6));
        drawPianoTarget(st, ctx.tint, tx, foe.y, 90, k, k > 0.78, t);
        if (k < 0.22) {
          const u = k / 0.22;
          drawPiano(st, ctx.tint, seat.x, seat.y, flash, charge, t, 1 - u, u * 3);
          drawPianoAirborne(air, ctx.tint, seat.x, seat.y - 60 - u * u * 300, 1.4 - u * 0.5, u * 2.5, t);
        } else if (k > 0.78) {
          const u = (k - 0.78) / 0.22;
          drawPianoAirborne(air, ctx.tint, tx, foe.y - (1 - u * u) * 300, 0.7 + u * 0.8, (1 - u) * 3 + 0.2, t);
        }
      }
      if (tuned) SoundFx.drawOutOfTune(air, ctx.tint, foe.x, foe.y, t, 1);
      if (dissonant) SoundFx.drawOutOfTune(air, ctx.tint, foe.x + 3, foe.y - 12, t * 1.37 + 0.5, 0.85);
    });
  },
};
