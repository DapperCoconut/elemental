import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import { BaseAvatar } from '../../../elements/kits/ElementVisuals';
import {
  AD_VARIANTS, TECH, TechColorFn, TechnologyAvatar, TechnologyFx, bitTileLayered, crtButton, crtGlitch,
  crtWindow, cruncherHead, windowPane,
} from '../../../elements/kits/TechnologyVisuals';
import { FONT_MONO } from '../../../ui/Theme';

/**
 * Technology's showcases.
 *
 * The two things that have to be legible are the **streak** — the running hit/miss state that
 * every number about the Cruncher hangs off — and the **two screens**, because half this
 * element's abilities happen on somebody's monitor rather than in the arena: popups are a ghost
 * for you and a wall for them, virus critters have to be clicked off by whoever is carrying
 * them, and a Zip Bomb ends in a dialog box. Every loop that leans on that draws the mouse
 * pointer doing the clicking and says whose screen it is; anything else would be a lie about
 * the ability.
 *
 * Technology puts no sprite in the world: crunchers, popups, critters, the zip file, the admin
 * console and its set-pieces are all Graphics repainted per frame out of `TechnologyVisuals`,
 * so `ctx.fly` is useless throughout. Windows that are 300px wide in a match (the console, the
 * restart dialog, a popup) are drawn at a fraction of that so the fight stays in frame.
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
const BUGS_PER_POPUP = 2;
const BUG_INCUBATE_MS = 2500;
const BUG_TICK_MS = 1000;
const BUG_TICK_DMG = 2;
const BUG_BODY_SPEED = 42;
const BUG_BOT_CLEAR_MS: [number, number] = [4500, 7500];

const RANSOM_POPUPS = 3;
const RANSOM_CLICKS = 2;
const RANSOM_BODY_SPEED = 80;

const ZIP_SPEED = 150;
const ZIP_HIT_RADIUS = 30;
const ZIP_BAND_GAP_MS: [number, number] = [1100, 1900];
const ZIP_BAND_BACK_MS = 420;
const ZIP_RESTART_STUN_MS = 3000;
const ZIP_SWELL = 1.33;

const LAG_DURATION_MS = 10000;
const LAG_REWIND_MS = 1000;
const LAG_HISTORY_SAMPLE_MS = 100;
const LAG_FREEZE_MS = 1000;

const WEBDRAG_DURATION_MS = 6000;
const WEBDRAG_GRAB_RADIUS = 42;

const ADMIN_ABUSE_MAX = 100;
const ADMIN_HP_PER_ABUSE = 0.4;
const ADMIN_OVERUSE_STEP = 0.1;
const ADMIN_COMMANDS = [
  { id: 'fling', cost: 10 },
  { id: 'jail', cost: 20 },
  { id: 'fly', cost: 20 },
  { id: 'kill', cost: 25 },
  { id: 'invis', cost: 25 },
  { id: 'give', cost: 50 },
  { id: 'speed', cost: 50 },
  { id: 'invincible', cost: 100 },
  { id: 'ban', cost: 100 },
] as const;
type AdminCmd = (typeof ADMIN_COMMANDS)[number]['id'];
const ADMIN_CHEAPEST = 10;
const ADMIN_WIN_W = 330;
const ADMIN_WIN_H = 226;
const ADMIN_BAR_H = 22;
const ADMIN_BTN_W = 98;
const ADMIN_BTN_H = 38;
const ADMIN_BTN_DX = [60, 165, 270];
const ADMIN_BTN_DY = [82, 126, 170];
const ADMIN_JAIL_SIZE = 150;
const ADMIN_JAIL_MS = 3000;
const ADMIN_KILL_DMG = 20;
const ADMIN_GIVE_MS = 10000;
const ADMIN_GUN_SPEED = 1.6;
const ADMIN_GUN_DMG = 1.5;
const ADMIN_SPEED_MS = 10000;
const ADMIN_SPEED_BONUS = 1.33;
/** The fake source each command scrolls into the corner. */
const ADMIN_CODE: Record<AdminCmd, string[]> = {
  fling: [';fling enemy', 'hrp.Velocity = Vector3.new(9e4, 9e4, 0)', '-- 1 player flung'],
  jail: [';jail enemy', 'local cell = Instance.new("Part", workspace)', 'cell.Anchored = true -- 3s'],
  fly: [';fly me', 'bodyGyro.P = 9e4; bodyVel.MaxForce = INF', '-- gravity: off'],
  kill: [';kill enemy', 'humanoid:TakeDamage(20)', '-- smite.lua OK'],
  invis: [';invis me', 'for _, p in parts do p.Transparency = 1 end', '-- nameplate hidden'],
  give: [';give me phaser', 'tool.Parent = me.Backpack', '-- PacBlaster loaded, 10s'],
  speed: [';speed me 1.33', 'humanoid.WalkSpeed *= 1.33', 'cooldownScale = 0.75'],
  invincible: [';god me', 'humanoid.MaxHealth = math.huge', '-- 5s of god mode'],
  ban: [';ban enemy', 'DataStore:SetAsync(uid, { banned = true })', 'enemy:Kick("Banned by admin")'],
};

const ADRENALINE_MAX_STACKS = 5;
const ADRENALINE_SPEED_PER_STACK = 0.10;
const ADRENALINE_WIRED_CD_MULT = 0.5;


const GLITCH_RUB_MS = 450;
const GLITCH_WINDUP_MS = 520;
const GLITCH_LAUNCH_SPEED = 1500;
const GLITCH_LAUNCH_MAX_MS = 1100;
const GLITCH_COOLDOWN_MS = 8000;
const GLITCH_DAMAGE = 15;
const GLITCH_HIT_RADIUS = 38;

const D_FLOOR = 6;
const D_WORLD = 13;
const D_UI = 19;

type Gfx = Phaser.GameObjects.Graphics;

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

function dummy(ctx: PreviewCtx, at: Mark, o?: { scale?: () => number }): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(5));
  ctx.onFrame(() => {
    const k = o?.scale?.() ?? 1;
    g.clear();
    g.fillStyle(0x2b2f3d, 1);
    g.fillCircle(at.x, at.y, 17 * k);
    g.fillStyle(0x3c4254, 1);
    g.fillCircle(at.x, at.y, 13 * k);
    g.fillStyle(0x8e97ad, 0.9);
    g.fillCircle(at.x - 5 * k, at.y - 4 * k, 3.2 * k);
    g.fillCircle(at.x + 5 * k, at.y - 4 * k, 3.2 * k);
    g.fillStyle(0x11131b, 1);
    g.fillCircle(at.x - 5.6 * k, at.y - 4 * k, 1.6 * k);
    g.fillCircle(at.x + 4.4 * k, at.y - 4 * k, 1.6 * k);
  });
}

/** A mouse pointer. Critters, buttons and dialogs in this element all get clicked by one. */
function drawPointer(g: Gfx, x: number, y: number, press: number): void {
  const pts = [[0, 0], [0, 15], [3.8, 11.4], [6.4, 17], [8.8, 16], [6.2, 10.4], [11, 10.4]];
  const path = (ox: number, oy: number): void => {
    g.beginPath();
    g.moveTo(x + ox, y + oy);
    for (let i = 1; i < pts.length; i++) g.lineTo(x + pts[i][0] + ox, y + pts[i][1] + oy);
    g.closePath();
  };
  g.fillStyle(0x000000, 0.4);
  path(1.5, 2.2);
  g.fillPath();
  g.fillStyle(0xffffff, 1);
  path(0, 0);
  g.fillPath();
  g.lineStyle(1.2, 0x0a1218, 1);
  path(0, 0);
  g.strokePath();
  if (press > 0) {
    g.lineStyle(1.6, TECH.amber, press);
    g.strokeCircle(x, y, 4 + 9 * (1 - press));
  }
}

/**
 * One pointer layer for a loop. `click(at, where, onClick)` slides a pointer onto wherever
 * `where()` is by `at` ms — it can be a moving target — and presses.
 */
function pointerLayer(
  ctx: PreviewCtx,
): (at: number, where: () => Mark | null, onClick: (elapsed: number) => void) => void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(23));
  const jobs: Array<{
    at: number; where: () => Mark | null; onClick: (elapsed: number) => void; done: boolean; last: Mark | null;
  }> = [];
  const LEAD = 420;
  const HOLD = 220;
  ctx.onFrame((_dt, elapsed) => {
    g.clear();
    for (const j of jobs) {
      if (elapsed < j.at - LEAD) continue;
      if (!j.done) {
        const p = j.where();
        if (p) j.last = { x: p.x, y: p.y };
        if (elapsed >= j.at) { j.done = true; j.onClick(elapsed); }
      }
      if (!j.last || elapsed > j.at + HOLD) continue;
      const k = Phaser.Math.Clamp((elapsed - (j.at - LEAD)) / LEAD, 0, 1);
      const e = 1 - (1 - k) * (1 - k);
      const press = elapsed >= j.at ? Phaser.Math.Clamp(1 - (elapsed - j.at) / HOLD, 0, 1) : 0;
      drawPointer(g, j.last.x + 46 * (1 - e), j.last.y + 30 * (1 - e), press);
    }
  });
  return (at, where, onClick) => { jobs.push({ at, where, onClick, done: false, last: null }); };
}

/**
 * A stand-in for the victim's ability tray — Click, E, R, F and the ultimate — riding beside
 * them, because three of this element's effects are things that happen to somebody's cooldowns.
 */
function drawTray(
  g: Gfx, tint: TechColorFn, x: number, y: number, t: number,
  o: { locked?: boolean; cd?: number[]; ult?: number; stalled?: boolean },
): void {
  const n = 5, cap = 12, gap = 3;
  const x0 = x - (n * cap + (n - 1) * gap) / 2;
  for (let i = 0; i < n; i++) {
    const cx = x0 + i * (cap + gap);
    // Ransomware seals everything but the click.
    const sealed = !!o.locked && i > 0;
    const isUlt = i === n - 1;
    g.fillStyle(tint(TECH.night), 0.9);
    g.fillRoundedRect(cx - 1, y - 1, cap + 2, cap + 2, 2.5);
    g.fillStyle(tint(sealed ? 0x441018 : isUlt ? TECH.plum : TECH.steel), 1);
    g.fillRoundedRect(cx, y, cap, cap, 2);
    if (!sealed) {
      g.fillStyle(tint(isUlt ? TECH.amber : TECH.phosphor), 0.9);
      g.fillRect(cx + cap / 2 - 1.5, y + cap / 2 - 1.5, 3, 3);
    }
    // Cooldown: a shade that drains off the top. The ultimate is a charge that fills from below.
    const shade = i === 0 ? 0
      : isUlt ? (o.ult === undefined ? 0 : 1 - o.ult)
        : Phaser.Math.Clamp(o.cd?.[i - 1] ?? 0, 0, 1);
    if (shade > 0 && !sealed) {
      g.fillStyle(tint(TECH.night), 0.8);
      g.fillRect(cx, y, cap, cap * shade);
    }
    if (o.stalled && i > 0) {
      g.lineStyle(1.3, tint(TECH.alert), 0.5 + 0.45 * Math.sin(t * 9));
    } else {
      g.lineStyle(1, tint(sealed ? TECH.alert : TECH.wire), 0.7);
    }
    g.strokeRoundedRect(cx, y, cap, cap, 2);
    if (sealed) {
      g.lineStyle(1.2, tint(TECH.amber), 1);
      g.beginPath();
      g.arc(cx + cap / 2, y + 5, 2.3, Math.PI, 0, false);
      g.strokePath();
      g.fillStyle(tint(TECH.amber), 1);
      g.fillRect(cx + cap / 2 - 3.2, y + 5, 6.4, 4.8);
      g.fillStyle(tint(TECH.night), 1);
      g.fillRect(cx + cap / 2 - 0.7, y + 6.4, 1.4, 2);
    }
  }
}

/** A popup's two pieces of copy, styled the way the kit's pooled ad texts are. */
interface AdCopy { head: Phaser.GameObjects.Text; btn: Phaser.GameObjects.Text }

function adCopy(ctx: PreviewCtx, variant: number, depth: number): AdCopy {
  const v = AD_VARIANTS[variant % AD_VARIANTS.length];
  const head = ctx.adopt(ctx.scene.add.text(0, 0, v.head + '\n' + v.sub, {
    fontSize: '10px', fontFamily: 'Arial, Helvetica, sans-serif', fontStyle: 'bold', align: 'center',
    color: v.ink, wordWrap: { width: 86 }, lineSpacing: -1,
  }).setOrigin(0.5).setDepth(depth).setVisible(false));
  const btn = ctx.adopt(ctx.scene.add.text(0, 0, v.btn, {
    fontSize: '9px', fontFamily: 'Arial, Helvetica, sans-serif', fontStyle: 'bold', color: '#ffffff',
  }).setOrigin(0.5).setDepth(depth).setVisible(false));
  return { head, btn };
}

/** Paint one popup and ride its copy on top, exactly as `paintAds` does. `k` is the window scale. */
function paintAd(
  g: Gfx, tint: TechColorFn, copy: AdCopy,
  x: number, y: number, k: number, t: number, alpha: number, mine: boolean, variant: number, pop = 1,
): void {
  const lay = TechnologyFx.drawAd(g, tint, x, y, ADS_W * k, ADS_H * k, t, alpha, mine, variant);
  copy.head.setVisible(true).setPosition(lay.headX, lay.headY).setScale(k).setAlpha(alpha * pop);
  copy.btn.setVisible(true).setPosition(lay.btnX, lay.btnY).setScale(k).setAlpha(alpha * pop);
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

/** A virus critter (or the Ransomware bug) loose on the dummy. Position is an offset from its body. */
interface Critter {
  kind: 'virus' | 'ransom';
  x: number; y: number; tx: number; ty: number;
  heading: number; pauseUntil: number; born: number;
  clicksLeft: number; hitAt: number; phase: number;
}

function critterWaypoint(b: Critter): void {
  const r = b.kind === 'ransom' ? 30 : 24;
  const a = Math.random() * Math.PI * 2, d = Math.random() * r;
  b.tx = Math.cos(a) * d;
  b.ty = Math.sin(a) * d;
}

function adsLoop(ctx: PreviewCtx, opts: { ransom: boolean }): void {
  const s = stageIt(ctx);
  const foe: Mark = { x: ctx.w * 0.8, y: ctx.h * 0.56 };
  dummy(ctx, foe);
  const click = pointerLayer(ctx);

  // Popups are 138×96 in a match; half that here, so twelve of them leave room for the fight.
  const K = 0.5;
  const w = ADS_W * K;
  const h = ADS_H * K;

  interface Ad { x: number; y: number; variant: number; born: number; gone: boolean; solid: boolean; copy: AdCopy }
  const ads: Ad[] = [];
  const mine = ctx.adopt(ctx.scene.add.graphics().setDepth(D_UI));
  const theirs = ctx.adopt(ctx.scene.add.graphics().setDepth(D_UI + 1));
  const bugG = ctx.adopt(ctx.scene.add.graphics().setDepth(D_UI + 2));

  const bugs: Critter[] = [];
  let touched = 0;
  let drainAt = -1;
  let fed = false;
  // The base loop needs one popup touched; Ransomware needs its third.
  const need = opts.ransom ? RANSOM_POPUPS : 1;

  const closeAd = (a: Ad): void => {
    a.gone = true;
    a.copy.head.setVisible(false);
    a.copy.btn.setVisible(false);
  };

  /** A popup was touched: two critters, and with E+ every third popup a Ransomware bug. */
  const infect = (elapsed: number): void => {
    touched++;
    const spawn = (kind: Critter['kind']): void => {
      const b: Critter = {
        kind, x: Phaser.Math.Between(-18, 18), y: Phaser.Math.Between(-18, 18), tx: 0, ty: 0,
        heading: Math.random() * Math.PI * 2, pauseUntil: 0, born: elapsed,
        clicksLeft: kind === 'ransom' ? RANSOM_CLICKS : 1, hitAt: -9999, phase: Math.random() * 10,
      };
      critterWaypoint(b);
      bugs.push(b);
    };
    for (let i = 0; i < BUGS_PER_POPUP; i++) spawn('virus');
    const ransom = opts.ransom && touched % RANSOM_POPUPS === 0;
    if (ransom) spawn('ransom');
    const color = ransom ? TECH.alert : TECH.plague;
    s.fx.bits(foe.x, foe.y, 8, { speed: 150, size: 9, life: 620, depth: D_UI, color });
    s.fx.glitch(foe.x, foe.y, 60, 48, color, 420, D_UI);
    if (ransom) {
      tick(ctx, foe.x, foe.y - 62, '🔒 RANSOMWARE · ABILITIES ENCRYPTED', TECH.alert);
    } else if (opts.ransom) {
      tick(ctx, foe.x, foe.y - 62, `🪟 POPUP ${touched % RANSOM_POPUPS} OF ${RANSOM_POPUPS}`, TECH.amber);
    } else {
      tick(ctx, foe.x, foe.y - 44, `🦠 ${BUGS_PER_POPUP} CRITTERS LOOSE`, TECH.plague);
    }
  };

  ctx.onFrame((_dt, elapsed) => {
    const t = elapsed / 1000;
    mine.clear();
    theirs.clear();
    for (const a of ads) {
      if (a.gone) continue;
      if (elapsed - a.born > ADS_LIFETIME_MS) {
        // Popups do not fade — they close.
        closeAd(a);
        s.fx.bits(a.x, a.y, 5, { speed: 130, size: 9, life: 380, depth: D_UI, color: TECH.white });
        continue;
      }
      if (a.solid && Math.abs(foe.x - a.x) <= w / 2 && Math.abs(foe.y - a.y) <= h / 2) {
        closeAd(a);
        s.fx.crash(a.x, a.y, 46 * K, { bits: 8, rings: 1, duration: 420, color: TECH.plague, mark: false });
        infect(elapsed);
        continue;
      }
      // Your side: a see-through overlay. Their side: opaque and squarely in the way. Same
      // object, two renders — so the loop draws both and labels them.
      const pop = Phaser.Math.Clamp((elapsed - a.born) / 160, 0, 1);
      paintAd(a.solid ? theirs : mine, ctx.tint, a.copy, a.x, a.y, K * (0.4 + pop * 0.6), t,
        a.solid ? 1 : 0.5, !a.solid, a.variant, pop);
    }
  });

  ctx.at(400, () => {
    s.av.play('sweep', 0);
    const spots: Mark[] = [];
    // The ones standing in their path; the rest land wherever, as they do in a match.
    for (const f of (opts.ransom ? [0.69, 0.61, 0.53] : [0.66])) spots.push({ x: ctx.w * f, y: foe.y });
    const top = Math.floor(h * 0.6 + 20);
    const bottom = Math.floor(ctx.h - h * 0.6 - 14);
    while (spots.length < ADS_COUNT) {
      const x = Phaser.Math.Between(Math.floor(w * 0.6), Math.floor(ctx.w - w * 0.6));
      let y = Phaser.Math.Between(top, bottom);
      // Keep the strays out of the lane, so what they walk into is the one the eye is on.
      if (x > ctx.w * 0.5 && Math.abs(y - foe.y) < h / 2 + 6) {
        y = Math.random() < 0.6
          ? Phaser.Math.Between(top, Math.max(top, Math.floor(foe.y - h / 2 - 6)))
          : Phaser.Math.Between(Math.min(bottom, Math.floor(foe.y + h / 2 + 6)), bottom);
      }
      spots.push({ x, y });
    }
    spots.forEach((p, i) => {
      const solid = p.x > ctx.w * 0.5;
      ads.push({
        x: p.x, y: p.y, variant: i % AD_VARIANTS.length, born: 400, gone: false, solid,
        copy: adCopy(ctx, i, (solid ? D_UI + 1 : D_UI) + 0.2),
      });
    });
    tick(ctx, ctx.cx, ctx.cy - 40, `🪟 ${ADS_COUNT} POPUPS · ${ADS_LIFETIME_MS / 1000}s`, TECH.adBlue);
    tick(ctx, ctx.cx, ctx.cy - 58, `SHELTERED · −${Math.round((1 - ADS_SHELTER_DMG_MULT) * 100)}% DAMAGE · INVISIBLE`, TECH.ice);
  });

  // They walk into the windows they cannot see past.
  ctx.onFrame((dt, elapsed) => {
    if (elapsed < 900 || touched >= need) return;
    foe.x -= 110 * (dt / 1000);
  });

  /** One click on a critter. Ransomware takes two, and bolts after the first. */
  const hitBug = (b: Critter, elapsed: number): void => {
    b.clicksLeft--;
    b.hitAt = elapsed;
    const wx = foe.x + b.x, wy = foe.y + b.y;
    const color = b.kind === 'ransom' ? TECH.alert : TECH.plague;
    if (b.clicksLeft > 0) {
      s.fx.bits(wx, wy, 3, { speed: 120, size: 7, life: 260, depth: D_UI, color });
      critterWaypoint(b);
      b.pauseUntil = 0;
      tick(ctx, wx, wy - 22, `CRACKED · ${b.clicksLeft} MORE`, TECH.amber);
      return;
    }
    s.fx.bits(wx, wy, 7, { speed: 170, size: 8, life: 420, depth: D_UI, color });
    s.fx.ring(wx, wy, 4, 22, color, 240, D_UI, 2);
    bugs.splice(bugs.indexOf(b), 1);
    if (b.kind === 'ransom') tick(ctx, foe.x, foe.y - 62, '🔓 DECRYPTED', TECH.mint);
  };

  ctx.onFrame((dt, elapsed) => {
    const t = elapsed / 1000;
    bugG.clear();
    let hungry = 0;
    let ransomAlive = false;
    for (const b of bugs) {
      const speed = b.kind === 'ransom' ? RANSOM_BODY_SPEED : BUG_BODY_SPEED;
      if (elapsed >= b.pauseUntil) {
        const dx = b.tx - b.x, dy = b.ty - b.y;
        const d = Math.hypot(dx, dy);
        if (d < 3) {
          critterWaypoint(b);
          // Scuttle, stop, scuttle — an insect, not a cursor.
          if (b.kind === 'virus') b.pauseUntil = elapsed + Phaser.Math.Between(120, 700);
        } else {
          const want = Math.atan2(dy, dx) + Math.sin(elapsed / 130 + b.phase) * 0.5;
          b.heading = Phaser.Math.Angle.RotateTo(b.heading, want, dt * 0.012);
          const step = Math.min(d, speed * dt / 1000);
          b.x += Math.cos(b.heading) * step;
          b.y += Math.sin(b.heading) * step;
        }
      }
      const feeding = b.kind === 'virus' && elapsed - b.born >= BUG_INCUBATE_MS;
      if (feeding) hungry++;
      if (b.kind === 'ransom') ransomAlive = true;
      const flinch = Phaser.Math.Clamp(1 - (elapsed - b.hitAt) / 160, 0, 1);
      const scale = 0.62 * (b.kind === 'ransom' ? 1.5 : 1) * (1 + 0.25 * flinch);
      TechnologyFx.drawBug(bugG, ctx.tint, foe.x + b.x, foe.y + b.y, b.heading, t + b.phase, scale,
        b.kind === 'ransom', feeding, elapsed >= b.pauseUntil, b.kind === 'ransom' && b.clicksLeft < RANSOM_CLICKS);
    }

    // One bite a second for the whole swarm, so six critters are one number and not six.
    if (hungry > 0) {
      if (!fed) {
        fed = true;
        tick(ctx, foe.x, foe.y - 44, `INCUBATED · ${BUG_TICK_DMG}/s EACH`, TECH.alert);
      }
      if (drainAt < 0) {
        drainAt = elapsed + BUG_TICK_MS;
      } else if (elapsed >= drainAt) {
        drainAt = elapsed + BUG_TICK_MS;
        tick(ctx, foe.x + (Math.random() - 0.5) * 16, foe.y - 14, `${hungry * BUG_TICK_DMG}`, TECH.plague);
      }
    } else {
      drainAt = -1;
    }

    // E+: files encrypted — nothing but the click works while the red one lives.
    if (opts.ransom) drawTray(bugG, ctx.tint, foe.x, foe.y - 46, t, { locked: ransomAlive });
  });

  // The clicks: the red one first if there is one, then the oldest critter.
  const pick = (): Critter | null => bugs.find((b) => b.kind === 'ransom') ?? bugs[0] ?? null;
  const squash = (at: number): void => {
    click(at, () => {
      const b = pick();
      return b ? { x: foe.x + b.x, y: foe.y + b.y } : null;
    }, (elapsed) => {
      const b = pick();
      if (b) hitBug(b, elapsed);
    });
  };

  label(ctx, ctx.w * 0.5, 12, 'LEFT: your screen        RIGHT: theirs', TECH.wire);

  if (!opts.ransom) {
    squash(6500);
    squash(7400);
    label(ctx, ctx.w * 0.5, ctx.h - 8,
      `harmless for ${BUG_INCUBATE_MS / 1000}s, then ${BUG_TICK_DMG}/s each until clicked off · a bot swats its own after ${BUG_BOT_CLEAR_MS[0] / 1000}–${BUG_BOT_CLEAR_MS[1] / 1000}s`,
      TECH.wire);
    return;
  }

  for (let i = 0; i < RANSOM_CLICKS; i++) squash(4200 + i * 800);
  for (let i = 0; i < RANSOM_POPUPS * BUGS_PER_POPUP; i++) squash(5600 + i * 420);
  label(ctx, ctx.w * 0.5, ctx.h - 8,
    `every ${RANSOM_POPUPS}rd popup touched: a faster red bug that locks every ability but the click · ${RANSOM_CLICKS} clicks to kill`,
    TECH.wire);
}

export const ads: PreviewScript = {
  duration: 8200,
  scale: 0.9,
  caption: 'E — twelve popups. Transparent on your screen, solid on theirs, and touching one lets two virus critters loose',
  run(ctx) { adsLoop(ctx, { ransom: false }); },
};

export const adsUpgraded: PreviewScript = {
  duration: 8800,
  scale: 0.9,
  caption: 'Ransomware — every third popup touched hatches a red bug that seals their abilities until it is clicked twice',
  run(ctx) { adsLoop(ctx, { ransom: true }); },
};

// ── R — Zip Bomb ──────────────────────────────────────────────────────

/** The buffering ring over a frozen fighter's head: a dark disc, a track, and an arc chasing round it. */
function lagSpinner(g: Gfx, tint: TechColorFn, cx: number, cy: number, angle: number): void {
  const R = 13;
  g.fillStyle(0x04121e, 0.75);
  g.fillCircle(cx, cy, R + 4);
  g.lineStyle(3, tint(0x1b4a6b), 0.9);
  g.strokeCircle(cx, cy, R);
  for (let i = 0; i < 3; i++) {
    const a = angle - i * 0.45;
    g.lineStyle(3, tint(0x66ddff), 0.9 - i * 0.28);
    g.beginPath();
    g.arc(cx, cy, R, a - 0.4, a, false);
    g.strokePath();
  }
  g.fillStyle(tint(0xaaffff), 1);
  g.fillCircle(cx + Math.cos(angle) * R, cy + Math.sin(angle) * R, 2.6);
}

/** R+: the selection marquee round a fighter whose hitbox has been unzipped a third bigger. */
function swellMarquee(g: Gfx, tint: TechColorFn, x: number, y: number, t: number): void {
  const r = 24 * ZIP_SWELL + 2 * Math.sin(t * 5);
  g.fillStyle(tint(TECH.gold), 0.08);
  g.fillRect(x - r, y - r, r * 2, r * 2);
  // marching ants
  const dash = 7, per = r * 8, off = (t * 26) % (dash * 2);
  g.fillStyle(tint(TECH.amber), 0.9);
  for (let d = -off; d < per; d += dash * 2) {
    for (let k = 0; k < dash; k += 2.5) {
      const q = d + k;
      if (q < 0 || q >= per) continue;
      const side = Math.floor(q / (r * 2)), u = q % (r * 2);
      const px = side === 0 ? x - r + u : side === 1 ? x + r : side === 2 ? x + r - u : x - r;
      const py = side === 0 ? y - r : side === 1 ? y - r + u : side === 2 ? y + r : y + r - u;
      g.fillRect(px - 1, py - 1, 2, 2);
    }
  }
  // the four resize handles
  for (const [hx, hy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    g.fillStyle(tint(TECH.white), 0.95);
    g.fillRect(x + hx * r - 3, y + hy * r - 3, 6, 6);
    g.lineStyle(1, tint(TECH.night), 0.9);
    g.strokeRect(x + hx * r - 3, y + hy * r - 3, 6, 6);
  }
}

/** The Zip Bomb file in flight, mirrored from the kit's `ZipBomb`. */
interface ZipFile {
  x: number; y: number; vx: number; vy: number;
  born: number; nextBandAt: number;
  history: Array<{ x: number; y: number; t: number }>;
  sample: number;
  bandAt: number; bandX: number; bandY: number;
}

function zipLoop(ctx: PreviewCtx, opts: { big: boolean }): void {
  const s = stageIt(ctx);
  const foe: Mark = { x: ctx.cx + 250, y: ctx.h * 0.5 };
  let swollen = false;
  dummy(ctx, foe, { scale: () => (swollen ? ZIP_SWELL : 1) });
  const click = pointerLayer(ctx);

  const floor = ctx.adopt(ctx.scene.add.graphics().setDepth(D_FLOOR));
  const world = ctx.adopt(ctx.scene.add.graphics().setDepth(D_WORLD));
  const ui = ctx.adopt(ctx.scene.add.graphics().setDepth(D_UI));
  const hud = ctx.adopt(ctx.scene.add.graphics().setDepth(D_UI + 2));

  // Things that happen so long after the file lands, whenever that turns out to be.
  const due: Array<{ at: number; fn: (elapsed: number) => void }> = [];
  ctx.onFrame((_dt, elapsed) => {
    for (let i = due.length - 1; i >= 0; i--) {
      if (elapsed >= due[i].at) due.splice(i, 1)[0].fn(elapsed);
    }
  });

  let file: ZipFile | null = null;
  const shots: Array<{ x: number; y: number; vx: number; vy: number }> = [];
  let lagUntil = -1;
  let freezeUntil = -1;
  let stallUntil = -1;
  let rebootUntil = -1;
  let spin = 0;
  const trail: Array<{ x: number; y: number; t: number }> = [];
  let trailAccum = 0;
  // Their tray: three cooldowns mid-tick and an ultimate half charged.
  const cd = [0.7, 0.3, 0.95];
  const CD_MS = [5000, 7000, 9000];
  let ult = 0.55;

  // The restart dialog, on their screen. 340 wide in a match; 0.6 of that here.
  const P = 0.6;
  const dlg = { x: ctx.w * 0.82, y: 42, open: false, hotAt: 99999 };
  const pStyle = { fontFamily: FONT_MONO, fontStyle: 'bold', stroke: '#0a1218', strokeThickness: 3 };
  const pTexts = [
    ctx.adopt(ctx.scene.add.text(dlg.x + 18 * P, dlg.y - 10 * P, 'System is not responding.\nRestart your computer?', {
      ...pStyle, fontSize: '13px', color: '#ddeeff', align: 'center',
    }).setOrigin(0.5)),
    ctx.adopt(ctx.scene.add.text(dlg.x - 70 * P, dlg.y + 24 * P, 'Restart (3s)', {
      ...pStyle, fontSize: '12px', color: '#ccffdd', strokeThickness: 2,
    }).setOrigin(0.5)),
    ctx.adopt(ctx.scene.add.text(dlg.x + 70 * P, dlg.y + 24 * P, 'Not now', {
      ...pStyle, fontSize: '12px', color: '#ffcccc', strokeThickness: 2,
    }).setOrigin(0.5)),
  ];
  for (const tx of pTexts) tx.setScale(P).setDepth(D_UI + 3).setVisible(false);

  /** Turn it off and on again: the lag is gone, and so are three seconds and every cooldown. */
  const restart = (elapsed: number): void => {
    dlg.open = false;
    lagUntil = -1;
    freezeUntil = -1;
    stallUntil = -1;
    rebootUntil = elapsed + ZIP_RESTART_STUN_MS;
    for (let i = 0; i < cd.length; i++) cd[i] = 1;
    ult = 0;
    s.fx.loading(foe.x, foe.y, 34, ZIP_RESTART_STUN_MS, { color: TECH.ice, depth: D_UI });
    s.fx.glitch(foe.x, foe.y, 60, 54, TECH.ice, 420, D_UI);
    tick(ctx, foe.x, foe.y - 62, `RESTARTING · ${ZIP_RESTART_STUN_MS / 1000}s STUNNED`, TECH.ice);
    tick(ctx, foe.x, foe.y + 66, 'EVERY COOLDOWN FULL · ULTIMATE EMPTIED', TECH.alert);
  };

  /** The archive opens on them: ten seconds of lag, the restart offer, and with R+ the swell. */
  const land = (x: number, y: number, elapsed: number): void => {
    s.fx.crash(foe.x, foe.y, 70, { bits: 18, rings: 2, duration: 520, color: TECH.amber, mark: false });
    s.fx.packet(x, y, foe.x, foe.y, { count: 6, duration: 220, depth: D_UI, color: TECH.gold });
    lagUntil = elapsed + LAG_DURATION_MS;
    swollen = opts.big;
    dlg.open = true;
    tick(ctx, foe.x, foe.y - 62, `📶 LAG · ${LAG_DURATION_MS / 1000}s`, TECH.ice);

    // The three things lag does, one after another.
    due.push({
      at: elapsed + 900,
      fn: (now) => {
        let back = trail[0];
        for (const p of trail) if (now - p.t >= LAG_REWIND_MS) back = p;
        if (!back) return;
        s.fx.packet(foe.x, foe.y, back.x, back.y, { count: 5, duration: 320, depth: 12, color: TECH.ice });
        s.fx.glitch(foe.x, foe.y, 44, 40, TECH.cyan, 300, 12);
        foe.x = back.x;
        foe.y = back.y;
        trail.length = 0;
        tick(ctx, foe.x, foe.y - 44, `↩ REWOUND ${LAG_REWIND_MS / 1000}s`, TECH.ice);
      },
    });
    due.push({
      at: elapsed + 2000,
      fn: (now) => {
        freezeUntil = now + LAG_FREEZE_MS;
        spin = 0;
        tick(ctx, foe.x, foe.y + 66, `⏳ NOT RESPONDING · ${LAG_FREEZE_MS / 1000}s`, TECH.ice);
      },
    });
    due.push({
      at: elapsed + 3200,
      fn: (now) => {
        stallUntil = now + 3500;
        tick(ctx, foe.x, foe.y + 66, '⛔ COOLDOWNS STALLED 3–4s', TECH.alert);
      },
    });
    // …and the way out of it, which costs more than it saves.
    dlg.hotAt = elapsed + 4400 - 260;
    click(elapsed + 4400, () => ({ x: dlg.x - 70 * P, y: dlg.y + 24 * P }), restart);

    if (!opts.big) return;
    tick(ctx, foe.x, foe.y - 80, `DECOMPRESSED · HITBOX ×${ZIP_SWELL}`, TECH.amber);
    // Shots aimed wide of where they used to end now connect.
    for (const at of [500, 1500, 2500]) {
      due.push({
        at: elapsed + at,
        fn: () => {
          const a = Math.atan2(foe.y - 30 - ctx.cy, foe.x - ctx.cx);
          s.av.play('punch', a);
          shots.push({ x: ctx.cx, y: ctx.cy, vx: Math.cos(a) * CRUNCHER_BASE_SPEED, vy: Math.sin(a) * CRUNCHER_BASE_SPEED });
        },
      });
    }
  };

  // The file.
  ctx.onFrame((dt, elapsed) => {
    const t = elapsed / 1000;
    const step = dt / 1000;
    floor.clear();
    world.clear();

    for (let i = shots.length - 1; i >= 0; i--) {
      const p = shots[i];
      p.x += p.vx * step;
      p.y += p.vy * step;
      if (Phaser.Math.Distance.Between(p.x, p.y, foe.x, foe.y) <= CRUNCHER_HIT_RADIUS * (swollen ? ZIP_SWELL : 1)) {
        shots.splice(i, 1);
        s.fx.bits(p.x, p.y, 6, { color: TECH.phosphor, depth: D_WORLD });
        tick(ctx, foe.x, foe.y - 14, `${CRUNCHER_BASE_DAMAGE}`, TECH.phosphor);
        continue;
      }
      if (p.x > ctx.w + 20 || p.y < -20) { shots.splice(i, 1); continue; }
      TechnologyFx.drawCruncher(world, ctx.tint, p.x, p.y, Math.atan2(p.vy, p.vx), t, TECH.phosphor, 1);
    }

    const z = file;
    if (!z) return;
    z.x += z.vx * step;
    z.y += z.vy * step;

    // The file is on a bad connection of its own: every so often it snaps back up its path.
    z.sample += dt;
    if (z.sample >= 70) {
      z.sample = 0;
      z.history.push({ x: z.x, y: z.y, t: elapsed });
      while (z.history.length > 0 && elapsed - z.history[0].t > 1200) z.history.shift();
    }
    if (elapsed >= z.nextBandAt) {
      z.nextBandAt = elapsed + Phaser.Math.Between(ZIP_BAND_GAP_MS[0], ZIP_BAND_GAP_MS[1]);
      let back: { x: number; y: number; t: number } | null = null;
      for (const p of z.history) if (elapsed - p.t >= ZIP_BAND_BACK_MS) back = p;
      if (back) {
        z.bandAt = elapsed; z.bandX = z.x; z.bandY = z.y;
        s.fx.glitch(z.x, z.y, 40, 36, TECH.amber, 260, D_WORLD);
        z.x = back.x; z.y = back.y;
        z.history.length = 0;
        tick(ctx, z.bandX, z.bandY - 30, '↩ RUBBER-BAND', TECH.amber);
      }
    }

    if (Phaser.Math.Distance.Between(z.x, z.y, foe.x, foe.y) <= ZIP_HIT_RADIUS) {
      file = null;
      land(z.x, z.y, elapsed);
      return;
    }

    const grow = Phaser.Math.Clamp((elapsed - z.born) / 220, 0, 1);
    // A rubber-band leaves the file where it *was* for a moment, torn and fading.
    const band = 1 - Phaser.Math.Clamp((elapsed - z.bandAt) / 320, 0, 1);
    if (band > 0) TechnologyFx.drawZip(world, ctx.tint, z.bandX, z.bandY, t, 0.45 * band, 1, true);
    floor.fillStyle(ctx.tint(TECH.night), 0.3);
    floor.fillEllipse(z.x, z.y + 24, 34 * grow, 9 * grow);
    TechnologyFx.drawZip(world, ctx.tint, z.x, z.y + Math.sin(t * 3) * 2.5, t, 1, grow, band > 0.5);
  });

  // What it does to them.
  ctx.onFrame((dt, elapsed) => {
    const t = elapsed / 1000;
    ui.clear();
    hud.clear();
    const lagging = elapsed < lagUntil;
    const frozen = elapsed < freezeUntil;
    const stalled = lagging && elapsed < stallUntil;

    if (lagging) {
      // They keep trying to walk it off, which is what gives the rubber-band somewhere to go.
      if (!frozen) foe.x = Math.min(ctx.cx + 330, foe.x + 26 * (dt / 1000));
      trailAccum += dt;
      if (trailAccum >= LAG_HISTORY_SAMPLE_MS) {
        trailAccum = 0;
        trail.push({ x: foe.x, y: foe.y, t: elapsed });
        while (trail.length > 0 && elapsed - trail[0].t > LAG_REWIND_MS * 1.5) trail.shift();
      }
      // Ghosts of where they were, plus tearing across the body.
      const r = 20;
      for (let i = 1; i <= 3; i++) {
        ui.lineStyle(1.6, ctx.tint(TECH.cyan), 0.3 / i);
        ui.strokeRect(foe.x - r - i * 4, foe.y - r - i * 4, (r + i * 4) * 2, (r + i * 4) * 2);
      }
      crtGlitch(ui, ctx.tint, foe.x, foe.y, r * 2.4, r * 2, TECH.cyan, 0.6, 5);
    }
    if (frozen) {
      spin += dt * 0.009;
      lagSpinner(ui, ctx.tint, foe.x, foe.y - 58, spin);
    }
    if (swollen) {
      swellMarquee(ui, ctx.tint, foe.x, foe.y, t);
      // The hitbox a cruncher has to find: what it was, and what it is now.
      ui.lineStyle(1, ctx.tint(TECH.wire), 0.35);
      ui.strokeCircle(foe.x, foe.y, CRUNCHER_HIT_RADIUS);
      ui.lineStyle(1.2, ctx.tint(TECH.amber), 0.55 + 0.25 * Math.sin(t * 5));
      ui.strokeCircle(foe.x, foe.y, CRUNCHER_HIT_RADIUS * ZIP_SWELL);
    }

    // Stalled cooldowns simply stop; a restart fills every one of them and empties the ultimate.
    if (!stalled) {
      for (let i = 0; i < cd.length; i++) {
        cd[i] -= dt / CD_MS[i];
        if (cd[i] < -0.3) cd[i] = 1;
      }
      ult = Math.min(1, ult + dt / 16000);
    }
    drawTray(ui, ctx.tint, foe.x, foe.y + 42, t, { cd, ult, stalled });

    for (const tx of pTexts) tx.setVisible(dlg.open);
    if (!dlg.open) return;
    const pw = 340 * P, ph = 104 * P;
    crtWindow(hud, ctx.tint, dlg.x - pw / 2, dlg.y - ph / 2, pw, ph, t, {
      bezel: TECH.steel, bar: TECH.adBlue, screen: TECH.board, glow: TECH.cyan, barH: 16 * P,
    });
    // the warning triangle
    const wx = dlg.x - pw / 2 + 34 * P, wy = dlg.y - 8 * P;
    hud.fillStyle(TECH.amber, 1);
    hud.fillTriangle(wx, wy - 13 * P, wx - 13 * P, wy + 10 * P, wx + 13 * P, wy + 10 * P);
    hud.fillStyle(TECH.night, 1);
    hud.fillRect(wx - 1.5 * P, wy - 5 * P, 3 * P, 8 * P);
    hud.fillRect(wx - 1.5 * P, wy + 5 * P, 3 * P, 3 * P);
    crtButton(hud, ctx.tint, dlg.x - 70 * P, dlg.y + 24 * P, 116 * P, 26 * P, 0x226644, elapsed >= dlg.hotAt, t);
    crtButton(hud, ctx.tint, dlg.x + 70 * P, dlg.y + 24 * P, 116 * P, 26 * P, 0x663333, false, t);
  });

  ctx.at(500, () => {
    const a = Math.atan2(foe.y - ctx.cy, foe.x - ctx.cx);
    s.av.play('punch', a);
    const x = ctx.cx + Math.cos(a) * 24, y = ctx.cy + Math.sin(a) * 24;
    file = {
      x, y, vx: Math.cos(a) * ZIP_SPEED, vy: Math.sin(a) * ZIP_SPEED,
      // The first skip is put where the loop can show it; in a match it is somewhere in the range.
      born: 500, nextBandAt: 500 + ZIP_BAND_GAP_MS[0],
      history: [], sample: 0, bandAt: -9999, bandX: x, bandY: y,
    };
    s.fx.bits(ctx.cx, ctx.cy, 4, {
      angle: a, spread: 0.5, speed: 140, size: 8, life: 300, depth: D_WORLD, drift: 0, color: TECH.amber,
    });
  });

  label(ctx, ctx.w * 0.5, ctx.h - 8,
    opts.big ? `their hitbox is ×${ZIP_SWELL} for the whole ${LAG_DURATION_MS / 1000}s — shots that used to slide past now land`
      : `${ZIP_SPEED} px/s, and it skips back along its own path · a restart is ${ZIP_RESTART_STUN_MS / 1000}s stunned, every cooldown full, ultimate emptied`,
    TECH.wire);
}

export const zip: PreviewScript = {
  duration: 10400,
  scale: 0.9,
  caption: 'R — a very slow file. Whoever it reaches lags for ten seconds, and is offered a restart that costs more than it saves',
  run(ctx) { zipLoop(ctx, { big: false }); },
};

export const zipUpgraded: PreviewScript = {
  duration: 10400,
  scale: 0.9,
  caption: 'Decompression — the archive unpacks onto them: a third more hitbox for as long as the lag lasts',
  run(ctx) { zipLoop(ctx, { big: true }); },
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
    s.fx.ring(ctx.cx, ctx.cy, 10, 52, TECH.mint, 420, D_WORLD, 2.6);
    tick(ctx, ctx.cx, ctx.cy - 40, `🖱 DRAG CURSOR · ${WEBDRAG_DURATION_MS / 1000}s`, TECH.ice);
  });

  if (!opts.surf) {
    // Two grabs: the enemy, put somewhere else — then your own Zip Bomb, the slow file that
    // stops being slow the moment a cursor is carrying it.
    const file = { x: 0, y: 0, born: -1, held: false, live: false };
    const zg = ctx.adopt(ctx.scene.add.graphics().setDepth(D_WORLD));
    const zf = ctx.adopt(ctx.scene.add.graphics().setDepth(D_FLOOR));
    let mode: 'seek-foe' | 'carry-foe' | 'seek-file' | 'carry-file' | 'done' = 'seek-foe';
    let since = 0;

    /** Move the cursor toward a point; returns how far is left. */
    const chase = (to: Mark, speed: number, step: number): number => {
      const d = Phaser.Math.Distance.Between(cursor.x, cursor.y, to.x, to.y);
      if (d < 0.5) return 0;
      const m = Math.min(d, speed * step);
      cursor.x += ((to.x - cursor.x) / d) * m;
      cursor.y += ((to.y - cursor.y) / d) * m;
      return d - m;
    };

    ctx.at(1500, () => {
      s.av.play('punch', 0);
      file.x = ctx.cx + 24;
      file.y = ctx.cy;
      file.born = 1500;
      file.live = true;
      s.fx.bits(ctx.cx, ctx.cy, 4, {
        angle: 0, spread: 0.5, speed: 140, size: 8, life: 300, depth: D_WORLD, drift: 0, color: TECH.amber,
      });
    });

    ctx.onFrame((dt, elapsed) => {
      const t = elapsed / 1000;
      const step = dt / 1000;
      zg.clear();
      zf.clear();
      if (file.live) {
        if (!file.held) file.x += ZIP_SPEED * step;
        const grow = Phaser.Math.Clamp((elapsed - file.born) / 220, 0, 1);
        zf.fillStyle(ctx.tint(TECH.night), 0.3);
        zf.fillEllipse(file.x, file.y + 24, 34 * grow, 9 * grow);
        TechnologyFx.drawZip(zg, ctx.tint, file.x, file.y + Math.sin(t * 3) * 2.5, t, 1,
          grow * (file.held ? 1.12 : 1), false);
      }
      if (elapsed < 400) return;

      if (mode === 'seek-foe') {
        if (chase(foe, 260, step) > 4) return;
        mode = 'carry-foe';
        since = elapsed;
        dragging = true;
        s.fx.bits(foe.x, foe.y, 6, { color: TECH.amber, depth: D_WORLD });
        tick(ctx, foe.x, foe.y - 30, '✊ GRABBED', TECH.amber);
      } else if (mode === 'carry-foe') {
        // Swung round the top of the arena, well clear of the file crawling along the floor.
        const k = (elapsed - since) / 1000;
        chase({
          x: ctx.w * 0.52 + Math.cos(k * 1.7) * ctx.w * 0.2,
          y: ctx.h * 0.34 + Math.sin(k * 1.7) * ctx.h * 0.14,
        }, 420, step);
        foe.x = cursor.x;
        foe.y = cursor.y;
        if (elapsed - since < 1900) return;
        mode = 'seek-file';
        dragging = false;
        tick(ctx, foe.x, foe.y - 30, 'DROPPED', TECH.wire);
      } else if (mode === 'seek-file') {
        if (!file.live || chase(file, 320, step) > 4) return;
        mode = 'carry-file';
        file.held = true;
        dragging = true;
        s.fx.bits(file.x, file.y, 6, { color: TECH.amber, depth: D_WORLD });
        tick(ctx, file.x, file.y - 34, '✊ YOUR ZIP BOMB', TECH.amber);
      } else if (mode === 'carry-file') {
        chase(foe, 300, step);
        file.x = cursor.x;
        file.y = cursor.y;
        if (Phaser.Math.Distance.Between(file.x, file.y, foe.x, foe.y) > ZIP_HIT_RADIUS) return;
        // Carried straight into them: it lands exactly as if it had crawled there.
        mode = 'done';
        file.live = false;
        dragging = false;
        s.fx.crash(foe.x, foe.y, 70, { bits: 18, rings: 2, duration: 520, color: TECH.amber, mark: false });
        s.fx.packet(file.x, file.y, foe.x, foe.y, { count: 6, duration: 220, depth: D_UI, color: TECH.gold });
        tick(ctx, foe.x, foe.y - 34, `📶 LAG · ${LAG_DURATION_MS / 1000}s`, TECH.ice);
      }
    });
    label(ctx, ctx.w * 0.5, ctx.h - 8,
      `grab within ${WEBDRAG_GRAB_RADIUS}px · the enemy, a popup, or your own Zip Bomb — a ${ZIP_SPEED} px/s file moves as fast as your mouse`,
      TECH.wire);
    return;
  }

  // Surf the web!: a small PainClicker window you keep fighting round. Click the skull, buy upgrades.
  let winFrom = -9999;
  let pain = 0;
  let perClick = 1;
  let punchAt = -9999;
  const win = { x: ctx.w * 0.74, y: ctx.h * 0.36 };
  const win_ = ctx.adopt(ctx.scene.add.graphics().setDepth(D_UI + 2));
  const winText = ctx.adopt(ctx.scene.add.text(0, 0, '', {
    fontSize: '9px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
    color: hex(TECH.alert), align: 'center',
  }).setOrigin(0.5).setDepth(D_UI + 3));
  ctx.onFrame((_dt, elapsed) => {
    const t = elapsed / 1000;
    win_.clear();
    winText.setVisible(false);
    if (elapsed < winFrom) return;
    const bw = 120, bh = 80;
    windowPane(win_, ctx.tint, win.x, win.y, bw, bh, t, 1, { body: 0x12080e, bar: TECH.plum, accent: TECH.alert, lines: 0 });
    // The skull: bone cranium and jaw, two red-lit sockets.
    const s = 1 - 0.12 * Math.max(0, 1 - (elapsed - punchAt) / 140);
    const sx = win.x - 26, sy = win.y + 6;
    win_.fillStyle(ctx.tint(0xe8dcc4), 1);
    win_.fillCircle(sx, sy - 4 * s, 15 * s);
    win_.fillRoundedRect(sx - 9 * s, sy + 3 * s, 18 * s, 11 * s, 3 * s);
    for (const side of [-1, 1]) {
      win_.fillStyle(ctx.tint(0x1a0a10), 1);
      win_.fillEllipse(sx + side * 6 * s, sy - 3 * s, 8 * s, 7 * s);
      win_.fillStyle(ctx.tint(TECH.alert), 0.7 + 0.3 * Math.sin(t * 5));
      win_.fillCircle(sx + side * 6 * s, sy - 2.5 * s, 1.6 * s);
    }
    // The shop column: four one-time buys.
    for (let i = 0; i < 4; i++) {
      const owned = i === 0 && perClick === 2;
      win_.fillStyle(ctx.tint(owned ? 0x225533 : 0x7a2233), 0.95);
      win_.fillRoundedRect(win.x + 6, win.y - 22 + i * 14, 48, 11, 2);
    }
    winText.setVisible(true).setPosition(win.x, win.y + bh / 2 + 9).setText(`💀 ${pain}`);
  });

  ctx.at(1400, () => {
    winFrom = 1400;
    tick(ctx, ctx.cx, ctx.cy - 40, '🌐 SURF THE WEB?', TECH.cyan);
  });
  // Click, click, click: every click is a point of damage and a pain coin.
  for (let i = 0; i < 8; i++) {
    ctx.at(2000 + i * 300, () => {
      punchAt = 2000 + i * 300;
      pain += perClick;
      s.fx.bits(win.x - 26, win.y + 6, 2, { color: TECH.alert, depth: D_UI + 3 });
      tick(ctx, foe.x + (Math.random() - 0.5) * 20, foe.y - 12, `${perClick}`, TECH.alert);
    });
  }
  ctx.at(3700, () => {
    perClick = 2;
    tick(ctx, win.x + 30, win.y - 36, 'HARDER CLICKS', TECH.phosphor);
  });
  // You keep fighting with it open: the click still throws crunchers.
  ctx.at(4700, () => {
    s.fx.packet(ctx.cx, ctx.cy, foe.x, foe.y, { color: TECH.phosphor, depth: D_WORLD });
  });
  // Web drag picks the window up by its title bar and puts it somewhere else.
  ctx.onFrame((_dt, elapsed) => {
    if (elapsed < 5200 || elapsed > 6200) return;
    const k = (elapsed - 5200) / 1000;
    win.x = ctx.w * (0.74 - 0.46 * k);
    win.y = ctx.h * (0.36 - 0.08 * Math.sin(k * Math.PI));
  });
  ctx.at(6800, () => {
    winFrom = 99999;
    tick(ctx, win.x + 50, win.y - 40, '✕', TECH.alert);
  });

  label(ctx, ctx.w * 0.5, ctx.h - 8,
    'each click: 1 damage + 1 pain · Harder clicks 50 · farm 100 · factory 250 · The Soulution 500', TECH.wire);
}

export const webDrag: PreviewScript = {
  duration: 7000,
  scale: 0.9,
  caption: 'F — your cursor becomes a drag cursor: pick people up, or carry your own Zip Bomb into them',
  run(ctx) { dragLoop(ctx, { surf: false }); },
};

export const webDragUpgraded: PreviewScript = {
  duration: 8000,
  scale: 0.9,
  caption: 'Surf the web! — a little PainClicker window: click the skull to hurt them, buy upgrades, drag it aside',
  run(ctx) { dragLoop(ctx, { surf: true }); },
};

// ── Q — Admin Console ─────────────────────────────────────────────────

function adminLoop(ctx: PreviewCtx, opts: { abuse: boolean; script: Array<[number, AdminCmd]> }): void {
  const s = stageIt(ctx);
  const foe: Mark = { x: ctx.w * 0.8, y: ctx.h * 0.4 };
  dummy(ctx, foe);
  const click = pointerLayer(ctx);

  // The console is 330×226 in a match — most of this box. 0.6 of that leaves the fight visible.
  const A = 0.6;
  const W = ADMIN_WIN_W * A;
  const H = ADMIN_WIN_H * A;
  const x0 = ctx.w * 0.5 - W / 2;
  const y0 = 8;
  const btnAt = (i: number): Mark => ({
    x: x0 + ADMIN_BTN_DX[i % 3] * A,
    y: y0 + ADMIN_BTN_DY[Math.floor(i / 3)] * A,
  });

  let now = 0;
  let open = false;
  let abuse = 0;
  let overuse = 0;
  let closeAt = -1;
  let pressed = -1;
  let pressedAt = -9999;

  /** What a command would be paid with right now — abuse, health (Q+), or nothing (cannot run). */
  const price = (cmd: AdminCmd): { pay: 'abuse' | 'hp'; hp: number } | null => {
    if (!open) return null;
    // Ban needs a target under 15% health, and this one is nowhere near it.
    if (cmd === 'ban') return null;
    const cost = ADMIN_COMMANDS.find((c) => c.id === cmd)?.cost ?? 0;
    if (abuse + cost <= ADMIN_ABUSE_MAX) return { pay: 'abuse', hp: 0 };
    if (!opts.abuse) return null;
    return { pay: 'hp', hp: Math.ceil(cost * ADMIN_HP_PER_ABUSE * (1 + ADMIN_OVERUSE_STEP * overuse)) };
  };

  // ── The fake source scrolling up the bottom-right corner, typed a character at a time ──
  const LOG_ROWS = 4;
  const logX = ctx.w - 236;
  const logY = ctx.h - 30;
  const lines: Array<{ full: string; startAt: number }> = [];
  const logG = ctx.adopt(ctx.scene.add.graphics().setDepth(D_UI + 3));
  const rows = Array.from({ length: LOG_ROWS }, () => ctx.adopt(ctx.scene.add.text(0, 0, '', {
    fontSize: '8px', color: '#ff4a4a', fontFamily: FONT_MONO, fontStyle: 'bold',
  }).setOrigin(0, 0.5).setDepth(D_UI + 4).setVisible(false)));
  const log = (add: string[]): void => {
    // Start after whatever is still being typed, so two commands never interleave.
    let at = now;
    for (const l of lines) at = Math.max(at, l.startAt + l.full.length * 14 + 60);
    add.forEach((line, i) => {
      const full = i === 0 ? `you@admin> ${line}` : `  ${line}`;
      lines.push({ full, startAt: at });
      at += full.length * 14 + 60;
    });
  };
  ctx.onFrame((_dt, elapsed) => {
    const t = elapsed / 1000;
    logG.clear();
    for (let i = lines.length - 1; i >= 0; i--) {
      if (elapsed - lines[i].startAt - lines[i].full.length * 14 > 4200) lines.splice(i, 1);
    }
    const live = lines.filter((l) => elapsed >= l.startAt).slice(-LOG_ROWS);
    let al = 0;
    rows.forEach((row, r) => {
      // Newest line sits on the bottom edge; everything older scrolls up a row.
      const l = live[live.length - LOG_ROWS + r];
      if (!l) { row.setVisible(false); return; }
      const age = elapsed - l.startAt;
      const shown = Phaser.Math.Clamp(Math.floor(age / 14), 0, l.full.length);
      const done = age - l.full.length * 14;
      const a = done > 3600 ? Phaser.Math.Clamp(1 - (done - 3600) / 600, 0, 1) : 1;
      row.setVisible(true).setPosition(logX, logY - (LOG_ROWS - 1 - r) * 10).setAlpha(a)
        .setText(l.full.slice(0, shown) + (shown < l.full.length && shown > 0 ? '█' : ''));
      al = Math.max(al, a);
    });
    if (live.length === 0) return;
    const px = logX - 6, pw = 232, ph = live.length * 10 + 8, py = logY - (live.length - 1) * 10 - 9;
    logG.fillStyle(ctx.tint(TECH.night), 0.82 * al);
    logG.fillRoundedRect(px, py, pw, ph, 4);
    logG.fillStyle(ctx.tint(TECH.alert), 0.06 * al);
    logG.fillRect(px + 2, py + 2, pw - 4, ph - 4);
    logG.fillStyle(ctx.tint(TECH.night), 0.35 * al);
    for (let ly = py + ((t * 18) % 3); ly < py + ph; ly += 3) logG.fillRect(px, ly, pw, 1);
    logG.lineStyle(1.2, ctx.tint(TECH.alert), 0.6 * al);
    logG.strokeRoundedRect(px, py, pw, ph, 4);
    logG.fillStyle(ctx.tint(TECH.alert), al * (Math.sin(t * 9) > 0 ? 0.9 : 0.2));
    logG.fillRect(px + pw - 9, py + ph - 7, 5, 2);
  });

  // ── What the commands do ──
  const jail = { x: 0, y: 0, from: -9999 };
  let smiteAt = -9999;
  let gunFrom = -1;
  let speedUntil = -1;
  let lastFire = -9999;
  const shots: Array<{ x: number; y: number; vx: number; vy: number; trail: number }> = [];
  const world = ctx.adopt(ctx.scene.add.graphics().setDepth(D_WORLD));
  const over = ctx.adopt(ctx.scene.add.graphics().setDepth(D_UI));

  const run = (cmd: AdminCmd): void => {
    log(ADMIN_CODE[cmd]);
    s.av.play('raise');
    switch (cmd) {
      case 'jail':
        // A window slams open around them — the cell is a dialog box they cannot close.
        jail.x = foe.x; jail.y = foe.y; jail.from = now;
        s.fx.crash(foe.x, foe.y, 70, { bits: 10, rings: 2, duration: 520, color: TECH.alert, mark: false });
        break;
      case 'kill':
        smiteAt = now;
        s.fx.crash(foe.x, foe.y, 80, { bits: 16, rings: 3, duration: 560, color: TECH.alert });
        tick(ctx, foe.x, foe.y - 14, `${ADMIN_KILL_DMG}`, TECH.alert);
        break;
      case 'give':
        gunFrom = now;
        s.fx.ring(ctx.cx, ctx.cy, 6, 40, TECH.alert, 320, D_UI, 2.4);
        s.fx.bits(ctx.cx, ctx.cy, 6, { speed: 150, size: 8, life: 380, depth: D_WORLD, color: TECH.alert });
        break;
      case 'speed':
        speedUntil = now + ADMIN_SPEED_MS;
        s.fx.ring(ctx.cx, ctx.cy, 6, 48, TECH.phosphor, 320, D_UI, 2.4);
        s.fx.bits(ctx.cx, ctx.cy, 8, { speed: 220, size: 8, life: 360, depth: D_WORLD, color: TECH.phosphor });
        break;
      default:
        break;
    }
  };

  /** Pay for a command and run it. */
  const use = (i: number): void => {
    const def = ADMIN_COMMANDS[i];
    const p = price(def.id);
    if (!p) return;
    pressed = i;
    pressedAt = now;
    if (p.pay === 'abuse') {
      abuse += def.cost;
    } else {
      overuse++;
      s.fx.bits(ctx.cx, ctx.cy, 5, { speed: 120, size: 8, life: 380, depth: D_WORLD, color: TECH.violet });
      tick(ctx, ctx.cx, ctx.cy - 40, `−${p.hp} HP`, TECH.violet);
    }
    run(def.id);
    // Bar spent and no Admin Abuse to lean on: the console leaves, a beat after its last line.
    if (!opts.abuse && ADMIN_ABUSE_MAX - abuse < ADMIN_CHEAPEST) closeAt = now + 650;
  };

  // ── The console window ──
  const win = ctx.adopt(ctx.scene.add.graphics().setDepth(D_UI + 1));
  const mono = (str: string, size: number, color: string): Phaser.GameObjects.Text =>
    ctx.adopt(ctx.scene.add.text(0, 0, str, {
      fontSize: `${size}px`, color, fontFamily: FONT_MONO, fontStyle: 'bold', align: 'center',
      stroke: '#140006', strokeThickness: 2,
    }).setScale(A).setDepth(D_UI + 2).setVisible(false));
  const title = mono('⌨ admin_console.exe', 12, '#ffd6d6').setOrigin(0, 0.5).setPosition(x0 + 10 * A, y0 + 14 * A);
  const abuseText = mono('', 10, '#ffffff').setOrigin(0.5).setPosition(x0 + W / 2, y0 + (ADMIN_BAR_H + 19) * A);
  const foot = mono(opts.abuse ? 'ADMIN ABUSE: past the bar it costs HP' : 'console closes when the bar is spent', 10, '#cc8888')
    .setOrigin(0, 0.5).setPosition(x0 + 26 * A, y0 + H - 16 * A);
  const labels = ADMIN_COMMANDS.map((_c, i) => {
    const b = btnAt(i);
    return mono('', 11, '#ffffff').setOrigin(0.5).setPosition(b.x, b.y);
  });

  ctx.onFrame((_dt, elapsed) => {
    now = elapsed;
    const t = elapsed / 1000;
    win.clear();
    if (open && closeAt > 0 && elapsed >= closeAt) {
      open = false;
      closeAt = -1;
      log(['exit', '-- session closed']);
      tick(ctx, x0 + W / 2, y0 + H / 2, 'BAR SPENT · CONSOLE CLOSED', TECH.alert);
    }
    // The console visibly swells the rig — you are inside the machine while it is open.
    s.av.setIntensity(open ? 1.25 : 1);
    for (const tx of [title, abuseText, foot, ...labels]) tx.setVisible(open);
    if (!open) return;

    crtWindow(win, ctx.tint, x0, y0, W, H, t, {
      bezel: 0x3a0a14, bar: 0x881122, screen: 0x140006, glow: TECH.alert, barH: ADMIN_BAR_H * A,
    });
    // The abuse bar: ten notches, filling red, throbbing once it is nearly spent.
    const bx = x0 + 14 * A, by = y0 + (ADMIN_BAR_H + 12) * A, bw = (ADMIN_WIN_W - 28) * A, bh = 14 * A;
    const frac = Phaser.Math.Clamp(abuse / ADMIN_ABUSE_MAX, 0, 1);
    win.fillStyle(ctx.tint(TECH.night), 0.95);
    win.fillRect(bx - 2, by - 2, bw + 4, bh + 4);
    win.fillStyle(ctx.tint(0x441018), 1);
    win.fillRect(bx, by, bw, bh);
    win.fillStyle(ctx.tint(TECH.alert), frac > 0.8 ? 0.75 + 0.25 * Math.sin(t * 12) : 0.95);
    win.fillRect(bx, by, bw * frac, bh);
    win.fillStyle(ctx.tint(TECH.white), 0.22);
    win.fillRect(bx, by, bw * frac, bh / 2.4);
    win.lineStyle(1, ctx.tint(TECH.night), 0.7);
    for (let k = 1; k < 10; k++) win.lineBetween(bx + (bw * k) / 10, by, bx + (bw * k) / 10, by + bh);
    win.lineStyle(1.2, ctx.tint(TECH.alert), 0.8);
    win.strokeRect(bx, by, bw, bh);
    abuseText.setText(`ABUSE ${Math.min(abuse, ADMIN_ABUSE_MAX)} / ${ADMIN_ABUSE_MAX}`);

    ADMIN_COMMANDS.forEach((c, i) => {
      const p = price(c.id);
      // Dark: cannot run. Red: paid in abuse. Purple: paid in health.
      const color = !p ? 0x2e2228 : p.pay === 'hp' ? 0x6a1f6a : 0x8a1f2e;
      const b = btnAt(i);
      crtButton(win, ctx.tint, b.x, b.y, ADMIN_BTN_W * A, ADMIN_BTN_H * A, color,
        pressed === i && elapsed - pressedAt < 280, t);
      labels[i].setText(`;${c.id}\n${p?.pay === 'hp' ? `-${p.hp} HP` : `${c.cost} abuse`}`).setAlpha(p ? 1 : 0.4);
    });
    // prompt line along the bottom of the screen
    if (Math.sin(t * 8) > 0) {
      win.fillStyle(ctx.tint(TECH.alert), 0.9);
      win.fillRect(x0 + 14 * A, y0 + H - 22 * A, 7 * A, 11 * A);
    }
  });

  // ── The set-pieces ──
  ctx.onFrame((dt, elapsed) => {
    const t = elapsed / 1000;
    const step = dt / 1000;
    world.clear();
    over.clear();

    // ;jail — an error dialog with the victim inside it, its sentence draining along the sill.
    if (elapsed >= jail.from && elapsed < jail.from + ADMIN_JAIL_MS) {
      const size = ADMIN_JAIL_SIZE;
      windowPane(over, ctx.tint, jail.x, jail.y, size, size, t, 0.32, {
        body: TECH.night, bar: TECH.alert, accent: TECH.alert, lines: 0,
      });
      over.lineStyle(2.4, ctx.tint(TECH.alert), 0.6);
      for (let i = 1; i < 6; i++) {
        const bx = jail.x - size / 2 + (i / 6) * size;
        over.lineBetween(bx, jail.y - size / 2 + 16, bx, jail.y + size / 2);
      }
      const left = 1 - (elapsed - jail.from) / ADMIN_JAIL_MS;
      over.fillStyle(ctx.tint(TECH.alert), 0.9);
      over.fillRect(jail.x - size / 2, jail.y + size / 2 - 3, size * left, 3);
    }

    // ;kill — a column of red from the top of the screen, fat then gone, with a bright core.
    const k = (elapsed - smiteAt) / 520;
    if (k >= 0 && k < 1) {
      const w = 46 * (1 - k) * (0.8 + 0.2 * Math.sin(t * 60));
      over.fillStyle(ctx.tint(TECH.alert), 0.35 * (1 - k));
      over.fillRect(foe.x - w, -10, w * 2, foe.y + 10);
      over.fillStyle(ctx.tint(TECH.alert), 0.85 * (1 - k));
      over.fillRect(foe.x - w / 2, -10, w, foe.y + 10);
      over.fillStyle(ctx.tint(TECH.white), 0.95 * (1 - k));
      over.fillRect(foe.x - w / 6, -10, w / 3, foe.y + 10);
      // error boxes cascading off the impact
      for (let j = 0; j < 5; j++) {
        const a = (j / 5) * Math.PI * 2 + smiteAt;
        const d = 20 + 90 * k;
        windowPane(over, ctx.tint, foe.x + Math.cos(a) * d, foe.y + Math.sin(a) * d * 0.7, 34, 22, t, 0.8 * (1 - k), {
          body: TECH.night, bar: TECH.alert, accent: TECH.alert, lines: 1, scan: false,
        });
      }
    }

    // ;give — the phaser sits in the hand for ten seconds and throws red pac-men: faster, angrier,
    // harder-hitting. ;speed fires a third more of them a second.
    if (gunFrom >= 0 && elapsed < gunFrom + ADMIN_GIVE_MS) {
      const a = Math.atan2(foe.y - ctx.cy, foe.x - ctx.cx);
      const every = CRUNCHER_BASE_COOLDOWN / (elapsed < speedUntil ? ADMIN_SPEED_BONUS : 1);
      if (elapsed - gunFrom > 300 && elapsed - lastFire >= every) {
        lastFire = elapsed;
        const speed = CRUNCHER_BASE_SPEED * ADMIN_GUN_SPEED;
        shots.push({ x: ctx.cx, y: ctx.cy, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, trail: 0 });
        s.fx.bits(ctx.cx, ctx.cy, 3, { angle: a, spread: 0.6, speed: 120, size: 8, life: 320, depth: D_WORLD, drift: 0 });
      }
      TechnologyFx.drawPhaser(world, ctx.tint, ctx.cx, ctx.cy, a, t,
        Phaser.Math.Clamp(1 - (elapsed - lastFire) / 110, 0, 1), 1);
    }
    for (let i = shots.length - 1; i >= 0; i--) {
      const p = shots[i];
      p.x += p.vx * step;
      p.y += p.vy * step;
      if (Phaser.Math.Distance.Between(p.x, p.y, foe.x, foe.y) <= CRUNCHER_HIT_RADIUS) {
        shots.splice(i, 1);
        s.fx.bits(p.x, p.y, 6, { color: TECH.alert, depth: D_WORLD });
        tick(ctx, foe.x + (Math.random() - 0.5) * 18, foe.y - 14,
          `${(CRUNCHER_BASE_DAMAGE * ADMIN_GUN_DMG).toFixed(1)}`, TECH.alert);
        continue;
      }
      p.trail += dt;
      if (p.trail >= 55) {
        p.trail = 0;
        s.fx.bit(p.x - p.vx * 0.018, p.y - p.vy * 0.018, TECH.alert, D_WORLD - 1, 9, 520);
      }
      TechnologyFx.drawPacman(world, ctx.tint, p.x, p.y, Math.atan2(p.vy, p.vx), t, 1);
    }
  });

  ctx.at(400, () => {
    open = true;
    s.av.play('raise');
    s.fx.glitch(ctx.cx, ctx.cy, 70, 60, TECH.alert, 520, D_UI);
    s.fx.ring(ctx.cx, ctx.cy, 12, 64, TECH.alert, 420, D_UI, 2.6);
    log(['-- admin console attached', 'require(script.Admin).elevate(me)']);
  });
  for (const [at, cmd] of opts.script) {
    const i = ADMIN_COMMANDS.findIndex((c) => c.id === cmd);
    click(at, () => btnAt(i), () => use(i));
  }

  label(ctx, ctx.w * 0.5, ctx.h - 8,
    opts.abuse
      ? `past the bar a command costs ${ADMIN_HP_PER_ABUSE} HP per abuse point, +${Math.round(ADMIN_OVERUSE_STEP * 100)}% for every one already paid in health`
      : `${ADMIN_COMMANDS.map((c) => `${c.id} ${c.cost}`).join(' · ')} — out of ${ADMIN_ABUSE_MAX}`,
    TECH.wire);
}

export const admin: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  caption: 'Q — a console of nine commands and a red abuse bar. Every command fills it, and when it is spent the console leaves',
  // Cage first, then smite what cannot dodge, then the last 50 on a phaser.
  run(ctx) { adminLoop(ctx, { abuse: false, script: [[1300, 'jail'], [2500, 'kill'], [3700, 'give']] }); },
};

export const adminUpgraded: PreviewScript = {
  duration: 9500,
  scale: 0.9,
  caption: 'Admin Abuse — the console never closes. Past a full bar, every further command is paid for out of your own health',
  run(ctx) {
    adminLoop(ctx, {
      abuse: true,
      script: [[1200, 'give'], [2100, 'speed'], [3300, 'kill'], [4500, 'jail'], [5700, 'kill']],
    });
  },
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
    const panes = ctx.adopt(ctx.scene.add.graphics().setDepth(D_UI));
    // Big enough here to read the advert: these are real windows, with copy and a button.
    const K = 0.8;
    const y = ctx.h * 0.46;
    const spots = [0.1, 0.4, 0.62, 0.86].map((f, i) => ({
      x: ctx.w * f, y, solid: i >= 2, variant: [0, 3, 0, 3][i],
      copy: adCopy(ctx, [0, 3, 0, 3][i], D_UI + 0.2),
    }));
    // Something behind each pane, so "can you see through it" is a question the eye can answer.
    const behind = ctx.adopt(ctx.scene.add.graphics().setDepth(D_UI - 2));
    ctx.onFrame((_dt, elapsed) => {
      const t = elapsed / 1000;
      behind.clear();
      panes.clear();
      for (const sp of spots) {
        behind.fillStyle(0x3c4254, 1);
        behind.fillCircle(sp.x + 8, sp.y + 6, 12);
        behind.fillStyle(0x8e97ad, 0.9);
        behind.fillCircle(sp.x + 4, sp.y + 2, 3);
        behind.fillCircle(sp.x + 12, sp.y + 2, 3);
      }
      for (const sp of spots) {
        paintAd(panes, ctx.tint, sp.copy, sp.x, sp.y, K, t, sp.solid ? 1 : 0.5, !sp.solid, sp.variant);
      }
    });

    label(ctx, ctx.w * 0.25, 14, 'YOUR SCREEN', TECH.mint);
    label(ctx, ctx.w * 0.74, 14, 'THEIRS', TECH.alert);
    label(ctx, ctx.w * 0.25, ctx.h - 22, `−${Math.round((1 - ADS_SHELTER_DMG_MULT) * 100)}% damage · invisible`, TECH.ice);
    label(ctx, ctx.w * 0.74, ctx.h - 22, `${ADS_W}×${ADS_H} of solid window`, TECH.rust);
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

export const masteryGlitchAbuse: PreviewScript = {
  duration: 6000,
  scale: 0.9,
  caption: 'Grind against the arena wall and the collision gives up: you clip in and out of it, then get spat across the arena at your cursor',
  run(ctx) {
    const { fx } = stageIt(ctx);
    // Where a body stops against the wall.
    const REST = 24;
    const pos: Mark = { x: ctx.cx, y: ctx.cy };
    const cursor: Mark = { x: ctx.w * 0.84, y: ctx.h * 0.3 };
    // The launch runs from the wall to the cursor, and they are standing in the way of it.
    const foe: Mark = {
      x: REST + (cursor.x - REST) * 0.55,
      y: ctx.cy + (cursor.y - ctx.cy) * 0.55,
    };
    dummy(ctx, foe);

    let phase: 'walk' | 'rub' | 'glitch' | 'launch' | 'done' = 'walk';
    let since = 0;
    let dx = 1, dy = 0;
    let struck = false;
    let lastTick = -1;

    const walls = ctx.adopt(ctx.scene.add.graphics().setDepth(D_FLOOR));
    const aim = ctx.adopt(ctx.scene.add.graphics().setDepth(D_UI));

    ctx.onFrame((dt, elapsed) => {
      const step = dt / 1000;

      // The arena wall, and the stretch of it being abused.
      walls.clear();
      walls.fillStyle(ctx.tint(TECH.steel), 1);
      walls.fillRect(0, 0, 7, ctx.h);
      walls.fillRect(ctx.w - 7, 0, 7, ctx.h);
      walls.lineStyle(1.2, ctx.tint(TECH.wire), 0.7);
      walls.lineBetween(7, 0, 7, ctx.h);
      walls.lineBetween(ctx.w - 7, 0, ctx.w - 7, ctx.h);
      for (let y = 6; y < ctx.h; y += 16) {
        walls.fillStyle(ctx.tint(TECH.slate), 1);
        walls.fillRect(1.5, y, 4, 9);
        walls.fillRect(ctx.w - 5.5, y, 4, 9);
      }
      if (phase === 'rub' || phase === 'glitch') {
        const k = phase === 'rub' ? Phaser.Math.Clamp((elapsed - since) / GLITCH_RUB_MS, 0, 1) : 1;
        walls.fillStyle(ctx.tint(phase === 'glitch' && Math.floor(elapsed / 46) % 4 !== 0 ? TECH.alert : TECH.cyan),
          0.35 + 0.5 * k);
        walls.fillRect(0, ctx.cy - 26 * k, 7, 52 * k);
      }

      // Where the mouse is — which is where the launch goes.
      aim.clear();
      aim.lineStyle(1.6, ctx.tint(TECH.ice), 0.95);
      aim.strokeCircle(cursor.x, cursor.y, 6);
      aim.lineBetween(cursor.x - 10, cursor.y, cursor.x + 10, cursor.y);
      aim.lineBetween(cursor.x, cursor.y - 10, cursor.x, cursor.y + 10);

      if (elapsed < 300) return;
      if (phase === 'walk') {
        pos.x = Math.max(REST, pos.x - 230 * step);
        ctx.moveCaster(pos.x, pos.y, { facing: Math.PI });
        if (pos.x > REST) return;
        phase = 'rub';
        since = elapsed;
      } else if (phase === 'rub') {
        // Still walking into it. Sparks off the wall while the rub builds.
        if (Math.random() < 0.3) fx.bit(pos.x - 18, pos.y + (Math.random() - 0.5) * 20, TECH.cyan, D_WORLD, 8, 260);
        if (elapsed - since < GLITCH_RUB_MS) return;
        phase = 'glitch';
        since = elapsed;
      } else if (phase === 'glitch') {
        // In and out of the wall on a ragged clock — the flicker a real clip looks like.
        const n = Math.floor(elapsed / 46);
        const into = n % 2 === 0 ? 20 + (n * 7) % 9 : -8 + (n * 5) % 7;
        const slide = ((n * 13) % 11) - 5;
        ctx.moveCaster(REST - into, ctx.cy + slide, { facing: Math.PI });
        if (n !== lastTick) {
          lastTick = n;
          if (n % 2 === 0) fx.glitch(REST, ctx.cy, 54, 48, n % 4 === 0 ? TECH.cyan : TECH.alert, 90, D_UI);
        }
        if (elapsed - since < GLITCH_WINDUP_MS) return;
        const len = Math.hypot(cursor.x - REST, cursor.y - ctx.cy) || 1;
        dx = (cursor.x - REST) / len;
        dy = (cursor.y - ctx.cy) / len;
        pos.x = REST;
        pos.y = ctx.cy;
        phase = 'launch';
        since = elapsed;
        fx.ring(pos.x, pos.y, 10, 70, TECH.ice, 300, D_UI, 3);
      } else if (phase === 'launch') {
        pos.x += dx * GLITCH_LAUNCH_SPEED * step;
        pos.y += dy * GLITCH_LAUNCH_SPEED * step;
        const landed = pos.x >= ctx.w - REST || pos.y <= REST;
        if (landed) {
          pos.x = Math.min(pos.x, ctx.w - REST);
          pos.y = Math.max(pos.y, REST);
        }
        ctx.moveCaster(pos.x, pos.y, { facing: Math.atan2(dy, dx) });
        fx.bit(pos.x + Phaser.Math.Between(-10, 10), pos.y + Phaser.Math.Between(-10, 10), TECH.ice, D_WORLD - 1, 12, 420);
        if (Math.random() < 0.35) fx.glitch(pos.x, pos.y, 50, 40, TECH.cyan, 200, D_WORLD);
        // Clipping through anybody in the way.
        if (!struck && Phaser.Math.Distance.Between(pos.x, pos.y, foe.x, foe.y) <= GLITCH_HIT_RADIUS) {
          struck = true;
          fx.crash(foe.x, foe.y, 50, { bits: 8, rings: 1, duration: 320, color: TECH.ice, mark: false });
          tick(ctx, foe.x, foe.y - 14, `${GLITCH_DAMAGE}`, TECH.ice);
        }
        if (!landed && elapsed - since <= GLITCH_LAUNCH_MAX_MS) return;
        phase = 'done';
        fx.crash(pos.x, pos.y, 60, { bits: 10, rings: 2, duration: 380, color: TECH.cyan, mark: false });
        tick(ctx, pos.x - 40, pos.y + 34, `READY AGAIN IN ${GLITCH_COOLDOWN_MS / 1000}s`, TECH.wire);
      }
    });

    label(ctx, ctx.w * 0.5, ctx.h - 8,
      `${GLITCH_RUB_MS / 1000}s leaning on a wall · ${GLITCH_WINDUP_MS / 1000}s clipping · ${GLITCH_LAUNCH_SPEED} px/s toward the cursor · ${GLITCH_DAMAGE} to anyone passed through`,
      TECH.wire);
  },
};
