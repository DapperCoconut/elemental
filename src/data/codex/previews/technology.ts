import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import { BaseAvatar } from '../../../elements/kits/ElementVisuals';
import {
  TECH, TechnologyAvatar, TechnologyFx, bitTileLayered, cableRun, crtGlitch, cruncherHead,
  windowPane,
} from '../../../elements/kits/TechnologyVisuals';

/**
 * Technology's showcases.
 *
 * The two things that have to be legible are the **streak** — the running hit/miss state that
 * every number about the Cruncher hangs off — and the **two screens**, because half this
 * element's abilities render differently depending on who is looking at them. Every popup loop
 * therefore draws both versions side by side and says which is which; anything else would be a
 * lie about the ability.
 *
 * Technology puts no sprite in the world: crunchers, popups, cords, boxes, malware and the byte
 * bomb are all Graphics repainted per frame out of `TechnologyVisuals`, so `ctx.fly` is useless
 * throughout.
 *
 * Containment: `ctx.at` and `ctx.onFrame` run outside the harness's capture window, so anything
 * built inside one goes through `ctx.adopt`. `TechnologyFx` carries a sticky sink.
 */

// ── The kit's constants, mirrored ─────────────────────────────────────

const CRUNCHER_BASE_COOLDOWN = 500;
const CRUNCHER_MIN_COOLDOWN = 150;
const CRUNCHER_BASE_DAMAGE = 7.5;
const CRUNCHER_BASE_SPEED = 420;
const CRUNCHER_HIT_RADIUS = 26;
const FIREWALL_CHARGES = 3;
const FIREWALL_REGEN_MS = 20000;

const ADS_COUNT = 12;
const ADS_LIFETIME_MS = 3000;
const ADS_W = 138;
const ADS_H = 96;
const ADS_SHELTER_DMG_MULT = 0.75;
const VIRUS_DURATION_MS = 5000;
const VIRUS_BASE_DMG = 3;
const GOOSE_POKE_DMG = 12;
const CLIPPY_FAIL_DMG = 20;
const PONG_DMG = 10;
const PONG_SPEED = 260;
const PONG_SPLIT_MS = 5000;

const UPLOAD_SPEED = 620;
const UPLOAD_BOX_DURATION_MS = 6000;
const UPLOAD_PARK_DURATION_MS = 5000;
const UPLOAD_HIT_RADIUS = 22;

const WEBDRAG_DURATION_MS = 6000;
const WEBDRAG_GRAB_RADIUS = 42;
const COIN_DMG = 1;

const ADMIN_WINDOW_MS = 8000;
const ADMIN_STRING_LEN = 6;
const ADMIN_TIERS = [5, 10, 20, 35, 50];
const BREACH_POINTS = 5;

const ADRENALINE_MAX_STACKS = 5;
const ADRENALINE_SPEED_PER_STACK = 0.10;
const ADRENALINE_WIRED_CD_MULT = 0.5;

const VPN_RAMP_MS = 5000;
const VPN_MAX_BONUS = 0.5;

const BYTE_BOMB_FUSE_MS = 8000;
const BYTE_BOMB_CLICK_CUT_MS = 500;
const BYTE_BOMB_BLAST_RADIUS = 120;
const BYTE_BOMB_DAMAGE = 10;
const LAG_DURATION_MS = 10000;

const D_FLOOR = 6;
const D_WORLD = 13;
const D_UI = 19;

interface Mark { x: number; y: number }

function hex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

// ── Shared staging ────────────────────────────────────────────────────

interface Stage { fx: TechnologyFx; av: BaseAvatar; tav: TechnologyAvatar | null; at: Mark }

function stageIt(ctx: PreviewCtx): Stage {
  const fx = ctx.capture(() => new TechnologyFx(ctx.scene, ctx.tint).setSink(ctx.sink));
  const av = ctx.useAvatar(() => new TechnologyAvatar(ctx.scene, ctx.tint));
  av.setFacing(ctx.aim);
  return { fx, av, tav: av instanceof TechnologyAvatar ? av : null, at: { x: ctx.cx, y: ctx.cy } };
}

function drivenCaster(ctx: PreviewCtx, at: Mark): Stage {
  const fx = ctx.capture(() => new TechnologyFx(ctx.scene, ctx.tint).setSink(ctx.sink));
  if (ctx.scene.textures.exists('elem-technology')) {
    const body = ctx.adopt(ctx.scene.add.image(at.x, at.y, 'elem-technology').setDepth(5));
    ctx.onFrame(() => body.setPosition(at.x, at.y));
  }
  const av = ctx.useAvatar(() => new TechnologyAvatar(ctx.scene, ctx.tint));
  av.setFacing(ctx.aim);
  ctx.onFrame((dt) => av.update(dt, at.x, at.y, 1));
  return { fx, av, tav: av instanceof TechnologyAvatar ? av : null, at };
}

function tick(ctx: PreviewCtx, x: number, y: number, text: string, color: number): void {
  const t = ctx.adopt(ctx.scene.add.text(x, y, text, {
    fontSize: '11px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
    color: hex(color), stroke: '#050b0e', strokeThickness: 3,
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

function dummy(ctx: PreviewCtx, at: Mark, o?: { boxed?: () => boolean }): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(5));
  ctx.onFrame((_dt, elapsed) => {
    g.clear();
    if (o?.boxed?.()) {
      // Boxed: they are literally a box now, and boxes move on a grid.
      TechnologyFx.drawBoxed(g, ctx.tint, at.x, at.y, 17, elapsed / 1000, 1);
      return;
    }
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

/** The running Cruncher state — the number the whole element hangs off. */
function streakBar(ctx: PreviewCtx, read: () => { hits: number; misses: number }): void {
  const t = ctx.adopt(ctx.scene.add.text(ctx.w * 0.5, 14, '', {
    fontSize: '10px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
    color: hex(TECH.phosphor),
  }).setOrigin(0.5).setDepth(21));
  ctx.onFrame(() => {
    const st = read();
    const gain = Phaser.Math.Clamp(st.hits * 0.05, 0, 1);
    const loss = Phaser.Math.Clamp(st.misses * 0.05, 0, 1);
    const dmg = CRUNCHER_BASE_DAMAGE * (1 + gain) * (1 - loss);
    const cd = Math.max(CRUNCHER_MIN_COOLDOWN,
      CRUNCHER_BASE_COOLDOWN * (1 - gain) * (1 - Phaser.Math.Clamp(st.misses * 0.1, 0, 1)));
    t.setText(`${dmg.toFixed(1)} dmg  ·  ${Math.round(cd)}ms  ·  ${Math.round(CRUNCHER_BASE_SPEED * (1 + gain) * (1 - loss))} px/s`);
    t.setColor(hex(st.misses > 0 ? TECH.rust : TECH.phosphor));
  });
}

// ── Click — Addicting Cruncher ────────────────────────────────────────

function cruncherLoop(ctx: PreviewCtx, opts: { firewall: boolean }): void {
  const s = stageIt(ctx);
  const foe: Mark = { x: ctx.w * 0.74, y: ctx.h * 0.44 };
  dummy(ctx, foe);
  let hits = 0;
  let misses = 0;
  let charges = FIREWALL_CHARGES;
  streakBar(ctx, () => ({ hits, misses }));

  // The firewall itself, ringing the arena edge.
  const wall = ctx.adopt(ctx.scene.add.graphics().setDepth(D_FLOOR));
  ctx.onFrame((_dt, elapsed) => {
    wall.clear();
    if (!opts.firewall || charges <= 0) return;
    const t = elapsed / 1000;
    for (let i = 0; i < 4; i++) {
      const horiz = i % 2 === 0;
      const y = i === 0 ? 6 : i === 2 ? ctx.h - 6 : 0;
      const x = i === 1 ? ctx.w - 6 : 6;
      for (let k = 0; k < (horiz ? ctx.w : ctx.h); k += 14) {
        bitTileLayered(wall, ctx.tint, horiz ? k : x, horiz ? y : k, 0, 5,
          (k + i) % 2 === 0, TECH.rust, 0.35 + 0.3 * Math.sin(t * 3 + k * 0.1));
      }
    }
  });

  interface Shot { x: number; y: number; vx: number; vy: number; dead: boolean; aimed: boolean }
  const shots: Shot[] = [];
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(D_WORLD));
  ctx.onFrame((dt, elapsed) => {
    const t = elapsed / 1000;
    const step = dt / 1000;
    g.clear();
    for (const p of shots) {
      if (p.dead) continue;
      p.x += p.vx * step;
      p.y += p.vy * step;
      if (p.aimed && Phaser.Math.Distance.Between(p.x, p.y, foe.x, foe.y) <= CRUNCHER_HIT_RADIUS) {
        p.dead = true;
        hits++;
        misses = 0;
        s.fx.bits(p.x, p.y, 6, { color: TECH.phosphor, depth: D_WORLD });
        tick(ctx, foe.x, foe.y - 14,
          `${(CRUNCHER_BASE_DAMAGE * (1 + Math.min(1, hits * 0.05))).toFixed(1)}`, TECH.phosphor);
        tick(ctx, ctx.cx, ctx.cy - 40, `▲ +5% ALL · ×${hits}`, TECH.mint);
        continue;
      }
      if (p.x > ctx.w - 8 || p.y < 8 || p.y > ctx.h - 8) {
        p.dead = true;
        if (opts.firewall && charges > 0) {
          charges--;
          s.fx.bits(p.x, p.y, 8, { color: TECH.rust, depth: D_WORLD });
          tick(ctx, p.x - 24, p.y - 18, `🧱 ABSORBED (${charges})`, TECH.rust);
          if (charges === 0) tick(ctx, ctx.cx, ctx.cy - 58, `REGENERATING · ${FIREWALL_REGEN_MS / 1000}s`, TECH.amber);
          continue;
        }
        misses++;
        hits = 0;
        s.fx.bits(p.x, p.y, 4, { color: TECH.rust, depth: D_WORLD });
        tick(ctx, ctx.cx, ctx.cy - 40, '▼ FASTER, SOFTER', TECH.rust);
        continue;
      }
      cruncherHead(g, ctx.tint, p.x, p.y, Math.atan2(p.vy, p.vx), 9,
        0.5 + 0.5 * Math.sin(t * 14), TECH.phosphor, 1);
      // The binary trail.
      for (let k = 1; k <= 4; k++) {
        bitTileLayered(g, ctx.tint, p.x - p.vx * 0.012 * k, p.y - p.vy * 0.012 * k, 0, 4,
          (Math.floor(t * 12) + k) % 2 === 0, TECH.phosphorDim, 0.5 / k);
      }
    }
  });

  const fire = (at: number, aimed: boolean): void => {
    ctx.at(at, () => {
      const target = aimed ? foe : { x: ctx.w, y: ctx.h * 0.08 };
      const a = Math.atan2(target.y - ctx.cy, target.x - ctx.cx);
      const gain = 1 + Math.min(1, hits * 0.05);
      s.av.play('punch', a);
      shots.push({
        x: ctx.cx, y: ctx.cy,
        vx: Math.cos(a) * CRUNCHER_BASE_SPEED * gain, vy: Math.sin(a) * CRUNCHER_BASE_SPEED * gain,
        dead: false, aimed,
      });
    });
  };

  // Four hits, then two deliberate misses, so both directions of the streak are in frame.
  for (let i = 0; i < 4; i++) fire(400 + i * 620, true);
  fire(3200, false);
  fire(3900, false);
  if (opts.firewall) fire(4600, false);

  label(ctx, ctx.w * 0.5, ctx.h - 8,
    opts.firewall ? `the first ${FIREWALL_CHARGES} misses simply do not count — then ${FIREWALL_REGEN_MS / 1000}s to rebuild`
      : `a hit is +5% cooldown, damage and speed · a miss is +10% cooldown but −5% damage and speed`,
    TECH.wire);
}

export const cruncher: PreviewScript = {
  duration: 6000,
  scale: 0.9,
  caption: 'Click — hitting makes the gun better in three ways; missing makes it faster and worse',
  run(ctx) { cruncherLoop(ctx, { firewall: false }); },
};

export const cruncherUpgraded: PreviewScript = {
  duration: 6600,
  scale: 0.9,
  caption: 'Firewall — an orange binary barrier that eats your first three misses outright',
  run(ctx) { cruncherLoop(ctx, { firewall: true }); },
};

// ── E — Overt Advertisement ───────────────────────────────────────────

function adsLoop(ctx: PreviewCtx, opts: { palware: boolean }): void {
  const s = stageIt(ctx);
  const foe: Mark = { x: ctx.w * 0.78, y: ctx.h * 0.6 };
  dummy(ctx, foe);

  interface Ad { x: number; y: number; born: number; gone: boolean }
  const ads: Ad[] = [];
  const mine = ctx.adopt(ctx.scene.add.graphics().setDepth(D_UI));
  const theirs = ctx.adopt(ctx.scene.add.graphics().setDepth(D_UI + 1));
  const w = ADS_W * 0.34;
  const h = ADS_H * 0.34;

  ctx.onFrame((_dt, elapsed) => {
    const t = elapsed / 1000;
    mine.clear();
    theirs.clear();
    for (const a of ads) {
      if (a.gone) continue;
      if (elapsed - a.born > ADS_LIFETIME_MS) { a.gone = true; continue; }
      // Your side: translucent. Their side: solid. Same object, two renders — which is the
      // whole ability, so the loop draws both and labels them.
      const solid = a.x > ctx.w * 0.5;
      TechnologyFx.drawAd(solid ? theirs : mine, ctx.tint, a.x, a.y, w, h, t, solid ? 1 : 0.3, !solid);
    }
  });

  ctx.at(400, () => {
    s.av.play('sweep', 0);
    for (let i = 0; i < ADS_COUNT; i++) {
      ads.push({
        x: Phaser.Math.Between(Math.floor(w * 0.6), Math.floor(ctx.w - w * 0.6)),
        y: Phaser.Math.Between(Math.floor(h * 0.6 + 20), Math.floor(ctx.h - h * 0.6)),
        born: 400, gone: false,
      });
    }
    tick(ctx, ctx.cx, ctx.cy - 40, `🪟 ${ADS_COUNT} POPUPS · ${ADS_LIFETIME_MS / 1000}s`, TECH.adBlue);
    tick(ctx, ctx.cx, ctx.cy - 58, `SHELTERED · −${Math.round((1 - ADS_SHELTER_DMG_MULT) * 100)}% DAMAGE · INVISIBLE`, TECH.ice);
  });

  // They walk into one and catch a virus — worse the faster they are moving.
  ctx.onFrame((dt, elapsed) => {
    if (elapsed < 900 || elapsed > 2600) return;
    foe.x -= 90 * (dt / 1000);
  });
  ctx.at(2000, () => {
    s.fx.bits(foe.x, foe.y, 8, { color: TECH.plague, depth: D_WORLD });
    tick(ctx, foe.x, foe.y - 30, `🦠 VIRUS · ${VIRUS_DURATION_MS / 1000}s`, TECH.plague);
  });
  for (let i = 1; i <= 4; i++) {
    ctx.at(2000 + i * 1000, () => {
      tick(ctx, foe.x + (Math.random() - 0.5) * 16, foe.y - 12, `${VIRUS_BASE_DMG}`, TECH.plague);
    });
  }

  label(ctx, ctx.w * 0.5, 12, 'LEFT: your screen        RIGHT: theirs', TECH.wire);

  if (!opts.palware) {
    label(ctx, ctx.w * 0.5, ctx.h - 8,
      `${VIRUS_BASE_DMG}/s for ${VIRUS_DURATION_MS / 1000}s, and worse the faster they run from it`, TECH.wire);
    return;
  }

  // Palware: one of three, and which one is not up to you. Mad Pong reads best in a box.
  interface Ball { x: number; y: number; vx: number; vy: number }
  const balls: Ball[] = [];
  const pg = ctx.adopt(ctx.scene.add.graphics().setDepth(D_WORLD));
  let nextSplit = 0;
  ctx.onFrame((dt, elapsed) => {
    const step = dt / 1000;
    pg.clear();
    if (!balls.length) return;
    if (elapsed >= nextSplit && balls.length < 16) {
      nextSplit = elapsed + PONG_SPLIT_MS;
      const n = balls.length;
      for (let i = 0; i < n && balls.length < 16; i++) {
        const a = Math.random() * Math.PI * 2;
        balls.push({ x: balls[i].x, y: balls[i].y, vx: Math.cos(a) * PONG_SPEED, vy: Math.sin(a) * PONG_SPEED });
      }
      tick(ctx, ctx.cx, ctx.cy - 58, `🏓 SPLIT · ${balls.length}`, TECH.violet);
    }
    for (const b of balls) {
      b.x += b.vx * step;
      b.y += b.vy * step;
      if (b.x <= 6 || b.x >= ctx.w - 6) b.vx *= -1;
      if (b.y <= 6 || b.y >= ctx.h - 6) b.vy *= -1;
      b.x = Phaser.Math.Clamp(b.x, 6, ctx.w - 6);
      b.y = Phaser.Math.Clamp(b.y, 6, ctx.h - 6);
      pg.fillStyle(ctx.tint(TECH.violet), 1);
      pg.fillRect(b.x - 4, b.y - 4, 8, 8);
      pg.fillStyle(ctx.tint(TECH.ice), 0.7);
      pg.fillRect(b.x - 4, b.y - 4, 3, 3);
    }
  });
  ctx.at(800, () => {
    balls.push({ x: ctx.cx, y: ctx.cy, vx: PONG_SPEED, vy: -PONG_SPEED * 0.6 });
    nextSplit = 800 + PONG_SPLIT_MS;
    tick(ctx, ctx.cx, ctx.cy - 76, `🏓 MAD PONG · ${PONG_DMG} A HIT`, TECH.violet);
  });

  label(ctx, ctx.w * 0.5, ctx.h - 8,
    `🪿 goose ${GOOSE_POKE_DMG} and steals bullets · 📎 clippy ${CLIPPY_FAIL_DMG} on a failed quiz · 🏓 pong ${PONG_DMG}, splitting to 16`,
    TECH.wire);
}

export const ads: PreviewScript = {
  duration: 6600,
  scale: 0.9,
  caption: 'E — twelve popups. Transparent on your screen, solid on theirs, and touching one is a virus',
  run(ctx) { adsLoop(ctx, { palware: false }); },
};

export const adsUpgraded: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  caption: 'Palware — and one of three pieces of malware installed for twenty seconds',
  run(ctx) { adsLoop(ctx, { palware: true }); },
};

// ── R — Upload ────────────────────────────────────────────────────────

function uploadLoop(ctx: PreviewCtx, opts: { trojan: boolean }): void {
  const s = stageIt(ctx);
  const foe: Mark = { x: ctx.w * 0.72, y: ctx.h * 0.4 };
  let boxedUntil = -9999;
  let now = 0;
  dummy(ctx, foe, { boxed: () => now < boxedUntil });
  ctx.onFrame((_dt, elapsed) => { now = elapsed; });

  const head: Mark = { x: ctx.cx, y: ctx.cy };
  let flying = false;
  let parked = -1;
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(D_WORLD));
  ctx.onFrame((dt, elapsed) => {
    const t = elapsed / 1000;
    const step = dt / 1000;
    g.clear();
    if (!flying && parked < 0 && elapsed >= boxedUntil) return;
    // Always tethered — but only the head has a hitbox, so the cable is decoration.
    cableRun(g, ctx.tint, [{ x: ctx.cx, y: ctx.cy }, { x: head.x, y: head.y }], TECH.wire, 0.8);
    TechnologyFx.drawCord(g, ctx.tint, ctx.cx, ctx.cy, head.x, head.y, t, 1, parked >= 0);
    if (!flying) return;
    const a = Math.atan2(foe.y - ctx.cy, foe.x - ctx.cx);
    head.x += Math.cos(a) * UPLOAD_SPEED * step;
    head.y += Math.sin(a) * UPLOAD_SPEED * step;
    if (Phaser.Math.Distance.Between(head.x, head.y, foe.x, foe.y) <= UPLOAD_HIT_RADIUS) {
      flying = false;
      boxedUntil = elapsed + UPLOAD_BOX_DURATION_MS;
      s.fx.glitch(foe.x, foe.y, 44, 34, TECH.cyan, 320, D_UI);
      tick(ctx, foe.x, foe.y - 30, `📦 BOXED · ${UPLOAD_BOX_DURATION_MS / 1000}s`, TECH.cyan);
      tick(ctx, foe.x, foe.y - 48, 'GRID ONLY · NO DIAGONALS', TECH.ice);
      return;
    }
    if (head.x > ctx.w - 8 || head.y < 8 || head.y > ctx.h - 8) {
      flying = false;
      parked = elapsed;
      tick(ctx, head.x, head.y - 22, `PARKED · ${UPLOAD_PARK_DURATION_MS / 1000}s`, TECH.amber);
    }
  });

  ctx.at(500, () => {
    flying = true;
    head.x = ctx.cx;
    head.y = ctx.cy;
    s.av.play('punch', Math.atan2(foe.y - ctx.cy, foe.x - ctx.cx));
  });

  // Boxed movement: axis-locked, in steps. With Trojan Takeover the arrows are driving.
  let gx = 0;
  ctx.onFrame((_dt, elapsed) => {
    if (elapsed >= boxedUntil) return;
    const phase = Math.floor((elapsed - (boxedUntil - UPLOAD_BOX_DURATION_MS)) / 500);
    if (phase === gx) return;
    gx = phase;
    // No diagonals — one axis at a time, always.
    if (opts.trojan) {
      foe.x = Phaser.Math.Clamp(foe.x - 26, 20, ctx.w - 20);
      if (phase % 2 === 0) foe.y = Phaser.Math.Clamp(foe.y + 16, 20, ctx.h - 20);
    } else if (phase % 2 === 0) {
      foe.x = Phaser.Math.Clamp(foe.x + 22, 20, ctx.w - 20);
    } else {
      foe.y = Phaser.Math.Clamp(foe.y - 18, 20, ctx.h - 20);
    }
  });

  if (opts.trojan) {
    ctx.at(1200, () => {
      tick(ctx, ctx.cx, ctx.cy - 40, '🎮 TROJAN TAKEOVER', TECH.violet);
      tick(ctx, ctx.cx, ctx.cy - 58, 'YOUR ARROW KEYS ARE THEIR LEGS', TECH.ice);
    });
    // They can still shoot at you the whole time.
    for (let i = 0; i < 2; i++) {
      ctx.at(2400 + i * 1400, () => {
        ctx.fly({
          texture: 'proj-fire',
          from: { x: foe.x, y: foe.y },
          to: { x: ctx.cx, y: ctx.cy },
          speed: 520,
          onHit: () => tick(ctx, ctx.cx, ctx.cy - 22, 'THEY CAN STILL FIGHT', TECH.rust),
        });
      });
    }
  }

  label(ctx, ctx.w * 0.5, ctx.h - 8,
    opts.trojan ? 'continuous movement, still axis-locked, and they are aiming at you the entire time'
      : `${UPLOAD_SPEED} px/s, ${UPLOAD_HIT_RADIUS}px head · a miss parks at your cursor for ${UPLOAD_PARK_DURATION_MS / 1000}s`,
    TECH.wire);
}

export const upload: PreviewScript = {
  duration: 7600,
  scale: 0.9,
  caption: 'R — a cord that turns whoever it touches into a box. Boxes move on a grid',
  run(ctx) { uploadLoop(ctx, { trojan: false }); },
};

export const uploadUpgraded: PreviewScript = {
  duration: 8000,
  scale: 0.9,
  caption: 'Trojan Takeover — you stay wired in, and their movement is your arrow keys',
  run(ctx) { uploadLoop(ctx, { trojan: true }); },
};

// ── F — Web Drag ──────────────────────────────────────────────────────

function dragLoop(ctx: PreviewCtx, opts: { surf: boolean }): void {
  const s = stageIt(ctx);
  const foe: Mark = { x: ctx.w * 0.7, y: ctx.h * 0.62 };
  dummy(ctx, foe);

  const cursor: Mark = { x: ctx.w * 0.5, y: ctx.h * 0.3 };
  let dragging = false;
  let dragFrom = -9999;
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(D_UI));
  ctx.onFrame((_dt, elapsed) => {
    g.clear();
    if (elapsed < dragFrom || elapsed > dragFrom + WEBDRAG_DURATION_MS) return;
    // The drag cursor itself — the whole ability is a mouse pointer with a grip on it.
    g.lineStyle(1.6, ctx.tint(dragging ? TECH.amber : TECH.ice), 0.95);
    g.strokeCircle(cursor.x, cursor.y, 6);
    g.lineBetween(cursor.x - 10, cursor.y, cursor.x + 10, cursor.y);
    g.lineBetween(cursor.x, cursor.y - 10, cursor.x, cursor.y + 10);
    g.lineStyle(1, ctx.tint(TECH.wire), 0.3);
    g.strokeCircle(cursor.x, cursor.y, WEBDRAG_GRAB_RADIUS);
  });

  ctx.at(400, () => {
    dragFrom = 400;
    s.av.play('flex');
    tick(ctx, ctx.cx, ctx.cy - 40, `🖱 DRAG CURSOR · ${WEBDRAG_DURATION_MS / 1000}s`, TECH.ice);
  });

  if (!opts.surf) {
    // Grab them and put them somewhere else.
    ctx.onFrame((dt, elapsed) => {
      if (elapsed < 400) return;
      const t = elapsed / 1000;
      if (!dragging) {
        const d = Phaser.Math.Distance.Between(cursor.x, cursor.y, foe.x, foe.y);
        if (d > 4) {
          const step = Math.min(d, 260 * (dt / 1000));
          cursor.x += ((foe.x - cursor.x) / d) * step;
          cursor.y += ((foe.y - cursor.y) / d) * step;
        }
        return;
      }
      cursor.x = ctx.w * 0.5 + Math.cos(t * 1.4) * ctx.w * 0.3;
      cursor.y = ctx.h * 0.4 + Math.sin(t * 1.4) * ctx.h * 0.22;
      foe.x = cursor.x;
      foe.y = cursor.y;
    });
    ctx.at(1400, () => {
      dragging = true;
      s.fx.bits(foe.x, foe.y, 6, { color: TECH.amber, depth: D_WORLD });
      tick(ctx, foe.x, foe.y - 30, '✊ GRABBED', TECH.amber);
    });
    ctx.at(5200, () => {
      dragging = false;
      tick(ctx, foe.x, foe.y - 30, 'DROPPED', TECH.wire);
    });
    label(ctx, ctx.w * 0.5, ctx.h - 8,
      `grab within ${WEBDRAG_GRAB_RADIUS}px · the enemy, your popups, or your parked cord head`, TECH.wire);
    return;
  }

  // Surf the web!: a browser window opens in the middle of the fight.
  let browserFrom = -9999;
  let coins = 0;
  const win = ctx.adopt(ctx.scene.add.graphics().setDepth(D_UI + 2));
  const winText = ctx.adopt(ctx.scene.add.text(0, 0, '', {
    fontSize: '9px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
    color: hex(TECH.amber), align: 'center',
  }).setOrigin(0.5).setDepth(D_UI + 3));
  ctx.onFrame((_dt, elapsed) => {
    const t = elapsed / 1000;
    win.clear();
    winText.setVisible(false);
    if (elapsed < browserFrom) return;
    const bw = Math.min(ctx.w - 30, 260);
    const bh = Math.min(ctx.h - 40, 150);
    windowPane(win, ctx.tint, ctx.w / 2, ctx.h / 2, bw, bh, t, 1);
    // The coins you click out of the page.
    for (let i = 0; i < 6; i++) {
      const cx = ctx.w / 2 - bw / 2 + 24 + ((i * 41 + Math.floor(t * 30)) % (bw - 48));
      const cy = ctx.h / 2 - bh / 2 + 34 + ((i * 29) % (bh - 60));
      if (i < coins) continue;
      win.fillStyle(ctx.tint(TECH.gold), 0.95);
      win.fillCircle(cx, cy, 5);
      win.fillStyle(ctx.tint(TECH.amber), 0.9);
      win.fillCircle(cx - 1.4, cy - 1.4, 2);
    }
    winText.setVisible(true).setPosition(ctx.w / 2, ctx.h / 2 + bh / 2 - 12)
      .setText(`🪙 ${coins}     SHELTERED WHILE OPEN     🚪 the Door`);
  });

  ctx.at(1400, () => {
    browserFrom = 1400;
    tick(ctx, ctx.cx, ctx.cy - 40, '🌐 SURF THE WEB?', TECH.cyan);
  });
  for (let i = 0; i < 5; i++) {
    ctx.at(2200 + i * 500, () => {
      coins++;
      s.fx.bits(ctx.w / 2, ctx.h / 2, 3, { color: TECH.gold, depth: D_UI + 3 });
    });
  }
  ctx.at(5400, () => {
    browserFrom = 99999;
    s.fx.crash(ctx.w / 2, ctx.h / 2, 70, { depth: D_UI + 3 });
    tick(ctx, ctx.cx, ctx.cy - 40, '🚪 THE DOOR', TECH.rust);
    // Every coin you were holding is launched as a projectile.
    for (let i = 0; i < coins; i++) {
      const a = Math.atan2(foe.y - ctx.h / 2, foe.x - ctx.w / 2) + (i / coins - 0.5) * 0.7;
      ctx.at(i * 60, () => {
        s.fx.packet(ctx.w / 2, ctx.h / 2, ctx.w / 2 + Math.cos(a) * 200, ctx.h / 2 + Math.sin(a) * 200,
          { color: TECH.gold, depth: D_WORLD });
        tick(ctx, foe.x + (Math.random() - 0.5) * 20, foe.y - 12, `${COIN_DMG}`, TECH.gold);
      });
    }
  });

  label(ctx, ctx.w * 0.5, ctx.h - 8,
    'bagel 10 · mouse 20 · factory 35 · a Wheel spin 5 — or take the Door and fire the lot', TECH.wire);
}

export const webDrag: PreviewScript = {
  duration: 7000,
  scale: 0.9,
  caption: 'F — your cursor becomes a drag cursor and picks people up',
  run(ctx) { dragLoop(ctx, { surf: false }); },
};

export const webDragUpgraded: PreviewScript = {
  duration: 8000,
  scale: 0.9,
  caption: 'Surf the web! — a browser opens mid-fight, you are sheltered inside it, and there is a Door',
  run(ctx) { dragLoop(ctx, { surf: true }); },
};

// ── Q — Admin Console ─────────────────────────────────────────────────

function adminLoop(ctx: PreviewCtx, opts: { breach: boolean }): void {
  const s = stageIt(ctx);
  const foe: Mark = { x: ctx.w * 0.78, y: ctx.h * 0.4 };
  dummy(ctx, foe);

  let points = 0;
  let typed = '';
  const target = '101101'.slice(0, ADMIN_STRING_LEN);
  const console_ = ctx.adopt(ctx.scene.add.graphics().setDepth(D_UI));
  const text = ctx.adopt(ctx.scene.add.text(ctx.w * 0.5, ctx.h * 0.3, '', {
    fontSize: '12px', fontFamily: 'monospace',
    color: hex(TECH.phosphor), align: 'center',
  }).setOrigin(0.5).setDepth(D_UI + 1));
  const meter = ctx.adopt(ctx.scene.add.text(ctx.w * 0.5, ctx.h * 0.3 + 18, '', {
    fontSize: '10px', fontFamily: 'monospace', color: hex(TECH.amber),
  }).setOrigin(0.5).setDepth(D_UI + 1));

  let open = false;
  ctx.onFrame((_dt, elapsed) => {
    const t = elapsed / 1000;
    console_.clear();
    text.setVisible(open);
    meter.setVisible(open);
    if (!open) return;
    windowPane(console_, ctx.tint, ctx.w * 0.5, ctx.h * 0.3, Math.min(ctx.w - 40, 190), 56, t, 1);
    text.setText(`${target}\n${typed}${'_'.repeat(Math.max(0, ADMIN_STRING_LEN - typed.length))}`);
    meter.setText(`ADMIN POINTS ${points}`);
  });

  ctx.at(400, () => {
    open = true;
    s.av.play('raise');
    s.fx.ring(ctx.cx, ctx.cy, 10, 70, TECH.cyan, 480, D_WORLD, 4);
    tick(ctx, ctx.cx, ctx.cy - 40, `⌨️ ADMIN CONSOLE · ${ADMIN_WINDOW_MS / 1000}s`, TECH.cyan);
    tick(ctx, ctx.cx, ctx.cy - 58, 'INVINCIBLE · CANNOT ATTACK', TECH.ice);
  });
  for (let i = 0; i < ADMIN_STRING_LEN; i++) {
    ctx.at(900 + i * 320, () => {
      typed += target[i];
      points += 1;
    });
  }
  if (opts.breach) {
    for (let i = 0; i < 4; i++) {
      ctx.at(1200 + i * 900, () => {
        points += BREACH_POINTS;
        s.fx.glitch(ctx.cx, ctx.cy, 90, 40, TECH.alert, 320, D_UI + 2);
        crtGlitch(console_, ctx.tint, ctx.w * 0.5, ctx.h * 0.3, ctx.w * 0.6, 40, TECH.alert, 1);
        tick(ctx, ctx.cx, ctx.cy - 76, `💥 Git Haxxed!  +${BREACH_POINTS}`, TECH.alert);
      });
    }
  }

  // The console closes and every tier reached fires, cumulatively.
  ctx.at(400 + ADMIN_WINDOW_MS * 0.7, () => {
    open = false;
    const names = ['🛡️ INVINCIBLE 5s', '👻 INVISIBLE 8s', '💥 35 DAMAGE', '🔒 JAIL', '🔨 BAN'];
    ADMIN_TIERS.forEach((need, i) => {
      if (points < need) return;
      ctx.at(i * 420, () => {
        tick(ctx, ctx.cx, ctx.cy - 34, `${need} — ${names[i]}`, i >= 3 ? TECH.alert : TECH.amber);
        if (i !== 2) return;
        s.fx.ring(foe.x, foe.y, 8, 50, TECH.alert, 380, D_WORLD, 4);
        tick(ctx, foe.x, foe.y - 14, '35', TECH.alert);
      });
    });
  });

  label(ctx, ctx.w * 0.5, ctx.h - 8,
    opts.breach ? `3–4 glitches a console at +${BREACH_POINTS} each — which is what gets the ladder past ${ADMIN_TIERS[1]}`
      : `${ADMIN_STRING_LEN} digits typed perfectly is ${ADMIN_STRING_LEN} points · ban only kills below 15% health`,
    TECH.wire);
}

export const admin: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  caption: 'Q — eight invincible seconds typing binary, then cash the points in cumulatively',
  run(ctx) { adminLoop(ctx, { breach: false }); },
};

export const adminUpgraded: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  caption: 'Security Breach — the console glitches 3–4 times a use and hands you 5 points each',
  run(ctx) { adminLoop(ctx, { breach: true }); },
};

// ── Passives ──────────────────────────────────────────────────────────

export const theCruncherStreak: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  caption: 'A hit is +5% to three numbers; a miss is a faster, softer gun. Neither goes past base',
  run(ctx) { cruncherLoop(ctx, { firewall: false }); },
};

export const twoScreens: PreviewScript = {
  duration: 7000,
  scale: 0.9,
  caption: 'The same popup, rendered twice: a ghost for you, a wall for them',
  run(ctx) {
    const s = stageIt(ctx);
    const mine = ctx.adopt(ctx.scene.add.graphics().setDepth(D_UI));
    const w = ADS_W * 0.38;
    const h = ADS_H * 0.38;
    const spots: Mark[] = [
      { x: ctx.w * 0.24, y: ctx.h * 0.36 }, { x: ctx.w * 0.24, y: ctx.h * 0.72 },
      { x: ctx.w * 0.76, y: ctx.h * 0.36 }, { x: ctx.w * 0.76, y: ctx.h * 0.72 },
    ];
    // Something behind each pane, so "can you see through it" is a question the eye can answer.
    const behind = ctx.adopt(ctx.scene.add.graphics().setDepth(D_UI - 2));
    ctx.onFrame((_dt, elapsed) => {
      const t = elapsed / 1000;
      behind.clear();
      mine.clear();
      for (const sp of spots) {
        behind.fillStyle(0x3c4254, 1);
        behind.fillCircle(sp.x + 8, sp.y + 6, 12);
        behind.fillStyle(0x8e97ad, 0.9);
        behind.fillCircle(sp.x + 4, sp.y + 2, 3);
        behind.fillCircle(sp.x + 12, sp.y + 2, 3);
      }
      for (let i = 0; i < spots.length; i++) {
        const solid = i >= 2;
        TechnologyFx.drawAd(mine, ctx.tint, spots[i].x, spots[i].y, w, h, t, solid ? 1 : 0.28, !solid);
      }
    });

    label(ctx, ctx.w * 0.25, 14, 'YOUR SCREEN', TECH.mint);
    label(ctx, ctx.w * 0.75, 14, 'THEIRS', TECH.alert);
    label(ctx, ctx.w * 0.25, ctx.h - 22, `−${Math.round((1 - ADS_SHELTER_DMG_MULT) * 100)}% damage · invisible`, TECH.ice);
    label(ctx, ctx.w * 0.75, ctx.h - 22, `${ADS_W}×${ADS_H} of solid window`, TECH.rust);
    label(ctx, ctx.w * 0.5, ctx.h - 8,
      `${ADS_COUNT} of them, for ${ADS_LIFETIME_MS / 1000} seconds`, TECH.wire);
    ctx.at(600, () => s.av.play('sweep', 0));
  },
};

// ── Perk — Adrenaline ─────────────────────────────────────────────────

export const perkAdrenaline: PreviewScript = {
  duration: 8000,
  scale: 0.9,
  caption: 'Every Cruncher hit is +10% speed for 5s, and five stacks halves the gun\'s cooldown',
  run(ctx) {
    const s = stageIt(ctx);
    const foe: Mark = { x: ctx.w * 0.76, y: ctx.h * 0.46 };
    dummy(ctx, foe);
    let stacks = 0;

    const bar = ctx.adopt(ctx.scene.add.graphics().setDepth(21));
    const t = ctx.adopt(ctx.scene.add.text(ctx.w * 0.5, 14, '', {
      fontSize: '10px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
      color: hex(TECH.mint),
    }).setOrigin(0.5).setDepth(21));
    ctx.onFrame(() => {
      bar.clear();
      const wired = stacks >= ADRENALINE_MAX_STACKS;
      for (let i = 0; i < ADRENALINE_MAX_STACKS; i++) {
        const x = ctx.w * 0.5 + (i - 2) * 16;
        bar.fillStyle(ctx.tint(i < stacks ? (wired ? TECH.alert : TECH.mint) : TECH.steel), 0.95);
        bar.fillRect(x - 6, 28, 12, 5);
      }
      t.setText(wired
        ? `WIRED  ·  +${ADRENALINE_MAX_STACKS * ADRENALINE_SPEED_PER_STACK * 100}% speed  ·  cooldown ×${ADRENALINE_WIRED_CD_MULT}`
        : `+${Math.round(stacks * ADRENALINE_SPEED_PER_STACK * 100)}% move speed`);
      t.setColor(hex(wired ? TECH.alert : TECH.mint));
    });

    for (let i = 0; i < 5; i++) {
      ctx.at(500 + i * 700, () => {
        s.av.play('punch', ctx.aim);
        s.fx.bits(foe.x, foe.y, 5, { color: TECH.phosphor, depth: D_WORLD });
        stacks = Math.min(ADRENALINE_MAX_STACKS, stacks + 1);
        tick(ctx, foe.x, foe.y - 14, `${CRUNCHER_BASE_DAMAGE}`, TECH.phosphor);
        tick(ctx, ctx.cx, ctx.cy - 40, `💉 ×${stacks}`, TECH.mint);
        if (stacks === ADRENALINE_MAX_STACKS) tick(ctx, ctx.cx, ctx.cy - 58, '⚡ WIRED', TECH.alert);
      });
    }
    ctx.at(4600, () => {
      stacks = Math.max(0, stacks - 1);
      s.fx.bits(ctx.w - 12, ctx.h * 0.2, 4, { color: TECH.rust, depth: D_WORLD });
      tick(ctx, ctx.cx, ctx.cy - 40, 'MISS — A STACK BURNED', TECH.rust);
    });

    label(ctx, ctx.w * 0.5, ctx.h - 8,
      'a miss burns one stack, not the lot — so it decays about as fast as your aim does', TECH.wire);
  },
};

// ── Mastery ───────────────────────────────────────────────────────────

export const masteryVpn: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'Keep moving and you accelerate to +50% over five seconds. Stop once and it is all gone',
  run(ctx) {
    const home: Mark = { x: ctx.w * 0.2, y: ctx.h * 0.6 };
    const s = drivenCaster(ctx, home);
    let boost = 0;
    let moving = true;

    const trail: Mark[] = [];
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(D_FLOOR));
    ctx.onFrame((dt, elapsed) => {
      const t = elapsed / 1000;
      const step = dt / 1000;
      // The ramp, and the cliff.
      boost = moving
        ? Math.min(VPN_MAX_BONUS, boost + (VPN_MAX_BONUS / VPN_RAMP_MS) * dt)
        : 0;
      s.tav?.setVpn(boost / VPN_MAX_BONUS);
      if (moving) {
        home.x += 150 * (1 + boost) * step;
        if (home.x > ctx.w - 20) home.x = 20;
        trail.push({ x: home.x, y: home.y });
      }
      while (trail.length > 4 + Math.floor((boost / VPN_MAX_BONUS) * 18)) trail.shift();
      g.clear();
      trail.forEach((p, i) => {
        const k = i / Math.max(1, trail.length - 1);
        bitTileLayered(g, ctx.tint, p.x, p.y, 0, 4 + (boost / VPN_MAX_BONUS) * 4,
          (i + Math.floor(t * 10)) % 2 === 0, TECH.phosphor, k * (0.3 + boost));
      });
    });

    const meter = ctx.adopt(ctx.scene.add.text(ctx.w * 0.5, 14, '', {
      fontSize: '11px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
    }).setOrigin(0.5).setDepth(21));
    ctx.onFrame(() => {
      meter.setText(`+${Math.round(boost * 100)}% move speed`);
      meter.setColor(hex(boost >= VPN_MAX_BONUS ? TECH.ice : TECH.phosphor));
    });

    ctx.at(VPN_RAMP_MS + 800, () => {
      moving = false;
      trail.length = 0;
      s.fx.glitch(home.x, home.y, 40, 30, TECH.rust, 320, D_WORLD);
      tick(ctx, home.x, home.y - 40, 'TUNNEL DROPPED', TECH.rust);
      tick(ctx, home.x, home.y - 58, 'ALL OF IT, AT ONCE', TECH.alert);
    });
    ctx.at(VPN_RAMP_MS + 2400, () => { moving = true; });

    label(ctx, ctx.w * 0.5, ctx.h - 8,
      `${VPN_RAMP_MS / 1000}s to full · no partial credit, and the trail is the readout`, TECH.wire);
  },
};

export const masteryByteBomb: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  caption: 'An 8-second packet you can click down to nothing — and everything in the blast gets Lag',
  run(ctx) {
    const s = stageIt(ctx);
    const foe: Mark = { x: ctx.w * 0.66, y: ctx.h * 0.44 };
    let lagFrom = -9999;
    let frozen = false;
    let loadingShown = false;
    dummy(ctx, foe);

    const bomb: Mark = { x: ctx.w * 0.62, y: ctx.h * 0.46 };
    let fuse = BYTE_BOMB_FUSE_MS;
    let live = false;
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(D_WORLD));
    const lagG = ctx.adopt(ctx.scene.add.graphics().setDepth(D_UI));
    const history: Mark[] = [];

    ctx.onFrame((dt, elapsed) => {
      const t = elapsed / 1000;
      g.clear();
      lagG.clear();
      if (live) {
        fuse -= dt;
        TechnologyFx.drawByteBomb(g, ctx.tint, bomb.x, bomb.y, Math.max(0, fuse / 1000), t, 1);
        if (fuse <= 0) {
          live = false;
          lagFrom = elapsed;
          s.fx.ring(bomb.x, bomb.y, 10, BYTE_BOMB_BLAST_RADIUS * 0.5, TECH.cyan, 460, D_WORLD, 5);
          s.fx.glitch(foe.x, foe.y, 44, 34, TECH.cyan, 320, D_UI);
          tick(ctx, foe.x, foe.y - 14, `${BYTE_BOMB_DAMAGE}`, TECH.cyan);
          tick(ctx, foe.x, foe.y - 32, `📶 LAG · ${LAG_DURATION_MS / 1000}s`, TECH.alert);
        }
      }
      if (elapsed < lagFrom || elapsed > lagFrom + LAG_DURATION_MS) return;
      // Lag: rubber-banding, freezing under a loading circle, and cooldowns that stop ticking.
      history.push({ x: foe.x, y: foe.y });
      while (history.length > 10) history.shift();
      if (frozen && !loadingShown) {
        loadingShown = true;
        s.fx.loading(foe.x, foe.y - 26, 13, 1000, { color: TECH.alert, depth: D_UI });
      }
      if (!frozen) loadingShown = false;
      lagG.lineStyle(1.4, ctx.tint(TECH.alert), 0.5 + 0.4 * Math.sin(t * 9));
      lagG.strokeCircle(foe.x, foe.y, 24);
    });

    ctx.at(500, () => {
      live = true;
      s.av.play('punch', Math.atan2(bomb.y - ctx.cy, bomb.x - ctx.cx));
      tick(ctx, bomb.x, bomb.y - 30, `💣 ${BYTE_BOMB_FUSE_MS / 1000}s FUSE`, TECH.amber);
    });
    // Clicked down: half a second a click, so a fast mouse detonates it on your terms.
    for (let i = 0; i < 12; i++) {
      ctx.at(1200 + i * 140, () => {
        if (!live) return;
        fuse -= BYTE_BOMB_CLICK_CUT_MS;
        s.fx.bits(bomb.x, bomb.y, 2, { color: TECH.amber, depth: D_WORLD });
        if (i % 4 === 0) tick(ctx, bomb.x + 22, bomb.y - 18, `−${BYTE_BOMB_CLICK_CUT_MS / 1000}s`, TECH.amber);
      });
    }
    // The three things Lag does, in order.
    ctx.at(3400, () => {
      const back = history[0];
      if (back) { foe.x = back.x; foe.y = back.y; }
      tick(ctx, foe.x, foe.y - 44, '↩ REWOUND 1s', TECH.alert);
    });
    ctx.at(4800, () => {
      frozen = true;
      tick(ctx, foe.x, foe.y - 44, '⏳ FROZEN 1s', TECH.alert);
    });
    ctx.at(5800, () => { frozen = false; });
    ctx.at(6400, () => tick(ctx, foe.x, foe.y - 44, '⛔ COOLDOWNS STOPPED 3–4s', TECH.alert));

    label(ctx, ctx.w * 0.5, ctx.h - 8,
      `${BYTE_BOMB_DAMAGE} in ${BYTE_BOMB_BLAST_RADIUS}px — the damage is not the point, the ten seconds are`,
      TECH.wire);
  },
};
