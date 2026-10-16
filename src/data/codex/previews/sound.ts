import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import {
  SOUND, SONG_COLORS, SONG_NAMES, SONG_ORDER, SONG_PALE, SoundAvatar, SoundFx, musicNote, musicNoteLayered,
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

/** The beat bar, drawn along the top of the box; `onBeat` is the loop's "click". */
function beatBar(ctx: PreviewCtx, hits: (beat: number) => boolean, onClick: (hit: boolean) => void): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(18));
  const barW = 220, barX = ctx.cx - barW / 2, y = 22;
  let lastBeat = -1;
  let flash = 0;
  let bad = 0;
  ctx.onFrame((dt, elapsed) => {
    const idx = Math.floor(elapsed / BEAT_MS);
    const phase = elapsed - idx * BEAT_MS;
    // Click a little inside the window when the script says this beat is played, early when not.
    const clickAt = hits(idx) ? BEAT_MS - WINDOW_MS * 0.5 : BEAT_MS * 0.4;
    if (idx !== lastBeat && phase >= clickAt) {
      lastBeat = idx;
      const ok = hits(idx);
      if (ok) flash = 1; else bad = 1;
      onClick(ok);
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
