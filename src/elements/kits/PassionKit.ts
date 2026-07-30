import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import type { CustomStatus } from './StatusHudKit';
import { Sfx } from '../../audio';
import {
  GarmentKind, PSN, PassionAvatar, PassionColorFn, PassionFx,
  blush, garment, heart, heartEyes, heartOutline, loveBar, rose as drawRose,
} from './PassionVisuals';

type Owner = 'player' | 'npc';

const ARENA_PAD = 32;

// ── Passive: the love bar ────────────────────────────────────────────────────
/**
 * The bar's ceiling is the victim's max HP at the moment Passion first lays eyes on them, and
 * it is latched there for the rest of the match. A boss with 2000 HP is a long project; an
 * Invasion husk with 40 is two clicks.
 */
const LOVE_BAR_W = 52;
const LOVE_BAR_H = 5;
/** Sits above the health bar (y-38) and above the charge bar that can appear over it. */
const LOVE_BAR_Y = -54;
const STAGE_MARKS = [0.25, 0.5, 0.75];
const STAGE_LABEL = ['', '💗 BLUSHING', '💓 SMITTEN', '💞 LOVESTRUCK'];

// ── Loveshot (Click) ─────────────────────────────────────────────────────────
const SHOT_SPEED = 720;
const SHOT_LIFE_MS = 1500;
const SHOT_HIT_R = 20;
const SHOT_DAMAGE = 12;
const SHOT_LOVE = 15;
/** +2 damage per this much love already on the target. */
const SHOT_LOVE_PER_BONUS = 80;
const SHOT_BONUS_DAMAGE = 2;

// ── Flirt (E) ────────────────────────────────────────────────────────────────
const FLIRT_REACH = 200;
const FLIRT_HALF_ANGLE = 0.66; // ~38°
const FLIRT_LOVE = 30;
/** One extra step of love for each stage the target has already reached. Caps at 45. */
const FLIRT_STAGE_BONUS = 5;

// ── Smooch (R) ───────────────────────────────────────────────────────────────
const SMOOCH_SPEED = 820;
const SMOOCH_MS = 260;
const SMOOCH_REACH = 36;
/** Below this fraction of the bar, the kiss simply doesn't land. */
const SMOOCH_MIN_RATIO = 0.5;
const SMOOCH_LOVE = 30;
const SMOOCH_LOVE_FRACTION = 0.15;

// ── Manipulate (F) ───────────────────────────────────────────────────────────
const ROSE_HOLD_MS = 15000;
/** Each hit taken while the rose is held. Multiplicative, so infinite stacking never hits zero. */
const ROSE_STACK_MULT = 0.95;
const ROSE_STACK_MS = 5000;
const ROSE_THROW_SPEED = 620;
const ROSE_THROW_LIFE_MS = 1700;
const ROSE_THROW_HIT_R = 24;
const ROSE_LOVE_MIN = 20;
const ROSE_LOVE_MAX = 60;
/** At or below this much HP, a thrown rose is worth the full 60. */
const ROSE_LOVE_HP_FLOOR = 50;
/** The bot has no recast key, so the kit throws for it once it has milked the hold. */
const ROSE_NPC_HOLD_MS = 5200;

// ── Exhibition (Q) ───────────────────────────────────────────────────────────
const POSE_MS = 5000;
const POSE_LOVE_PER_SEC = 15;
/** How far off dead-on a victim can be looking and still be counted as watching. */
const POSE_VIEW_HALF_ANGLE = 1.05; // ~60°
const FLASH_INTERVAL_MS = 210;
const CHEER_INTERVAL_MS = 900;
const POSE_TEXT_INTERVAL_MS = 1000;

// ── Exhibition, censored: the clothes ────────────────────────────────────────
/** The order they leave in — hat first, and the trousers last for obvious reasons. */
const GARMENTS: GarmentKind[] = ['hat', 'jacket', 'shirt', 'tie', 'trousers'];
/** Gravity on a tumbling garment. Well under a real one: cloth is supposed to hang. */
const CLOTH_GRAVITY = 620;
const CLOTH_SPEED_MIN = 165;
const CLOTH_SPEED_MAX = 235;
/** How far below the caster's feet a garment comes to rest. */
const CLOTH_FLOOR_DROP = 16;
/** They lie there for the whole pose, then go — the fade is how long "then go" takes. */
const CLOTH_FADE_MS = 500;

// ── World objects ────────────────────────────────────────────────────────────

/** A heart bullet or a thrown rose. The two share every field but what they do on arrival. */
interface Shot {
  owner: Owner;
  kind: 'heart' | 'rose';
  x: number;
  y: number;
  vx: number;
  vy: number;
  diesAt: number;
  spin: number;
  /** Roses only: the love they were worth at the moment they left the caster's teeth. */
  love: number;
}

/** One victim's meter. `max` is latched on first sight and never rewritten. */
interface Love {
  cur: number;
  max: number;
  /** How many of the three thresholds have been announced, so each fires once. */
  stage: number;
  charmed: boolean;
}

/**
 * A garment thrown off at the start of a censored Exhibition. It tumbles, lands, and lies where
 * it landed until the pose ends — the caster can walk away from their own trousers, which is
 * the whole joke and so the piece deliberately does not follow them.
 */
interface Cloth {
  owner: Owner;
  kind: GarmentKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ang: number;
  spin: number;
  /** Where the floor is for this piece, chosen at launch so the pile has depth to it. */
  restY: number;
  /** The angle it slumps to once it is down. */
  restAng: number;
  landed: boolean;
  /** 0–1 flatten, eased in after the landing rather than snapped. */
  settle: number;
  /** The end of the pose: it starts fading here and is gone `CLOTH_FADE_MS` later. */
  fadeAt: number;
}

/** A heart dropped on the floor by a Smooch dash. */
interface Mark {
  x: number;
  y: number;
  ang: number;
  until: number;
  size: number;
}

interface Side {
  owner: Owner;
  // R — Smooch
  dashUntil: number;
  dashVx: number;
  dashVy: number;
  /** Everyone this dash has already kissed, so one cast is one kiss per body. */
  kissed: Fighter[];
  // F — Manipulate
  roseUntil: number;
  roseTakenAt: number;
  /** `rawDamageTaken` watermark — the honest "was I hit since last frame" test. */
  lastRaw: number;
  /** Expiry timestamps of the 5% cuts, one per hit taken while holding the rose. */
  stacks: number[];
  /** True once this side has written a non-1 `passionIncomingMult`, so reset can hand it back. */
  multOwned: boolean;
  // Q — Exhibition
  poseUntil: number;
  nextFlashAt: number;
  nextCheerAt: number;
  nextPoseTextAt: number;
  flashSide: number;
  // Aim
  aimX: number;
  aimY: number;
}

function makeSide(owner: Owner): Side {
  return {
    owner,
    dashUntil: 0, dashVx: 0, dashVy: 0, kissed: [],
    roseUntil: 0, roseTakenAt: 0, lastRaw: 0, stacks: [], multOwned: false,
    poseUntil: 0, nextFlashAt: 0, nextCheerAt: 0, nextPoseTextAt: 0, flashSide: 1,
    aimX: 0, aimY: 0,
  };
}

// ── Arena API ────────────────────────────────────────────────────────────────

export interface PassionArenaApi {
  get scene(): Phaser.Scene;
  get player(): Fighter;
  get npc(): Fighter;
  /** Everything the player is allowed to hurt — husks in Invasion, the npc in a plain 1v1. */
  get enemies(): Fighter[];
  get eKey(): Phaser.Input.Keyboard.Key;
  get rKey(): Phaser.Input.Keyboard.Key;
  get fKey(): Phaser.Input.Keyboard.Key;
  get qKey(): Phaser.Input.Keyboard.Key;
  get pointerWasDown(): boolean;
  get elementId(): string;
  get npcElementId(): string;
  get width(): number;
  get height(): number;
  /** Skins: maps a Passion visual colour through that side's equipped skin. */
  passionColor(owner: Owner, base: number): number;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  getNearestEnemy(fromX: number, fromY: number): Fighter;
  buildPlayerContext(x: number, y: number): CastContext;
  setStatusIndicator(id: string, status: CustomStatus | null): void;
  /** The Exhibition easter egg, unlocked and toggled on the element's info panel. */
  get censoredExhibition(): boolean;
  get masteryActive(): boolean;
  get npcMasteryActive(): boolean;
}

// ── PassionKit ───────────────────────────────────────────────────────────────

export class PassionKit {
  private api: PassionArenaApi;

  // ── Visuals ──
  private readonly pcol: PassionColorFn;
  private readonly ncol: PassionColorFn;
  private readonly pfx: PassionFx;
  private readonly nfx: PassionFx;
  private playerAvatar: PassionAvatar | null = null;
  private npcAvatar: PassionAvatar | null = null;
  /** Kiss marks on the floor — under the fighters. */
  private groundGfx: Phaser.GameObjects.Graphics | null = null;
  /** Bullets, roses and cones — over the fighters. */
  private airGfx: Phaser.GameObjects.Graphics | null = null;
  /**
   * Blush, heart eyes and the meters. Above `HealthBar` (depth 10), because the whole element
   * is unreadable if another element's aura gets to paint over the face it has been working on.
   */
  private faceGfx: Phaser.GameObjects.Graphics | null = null;
  private vizT = 0;

  // ── Sim ──
  private sides: Record<Owner, Side> = { player: makeSide('player'), npc: makeSide('npc') };
  private loves = new Map<Fighter, Love>();
  private shots: Shot[] = [];
  private marks: Mark[] = [];
  private clothes: Cloth[] = [];
  /** Last known heading for anyone without a cursor, so a stationary bot still faces somewhere. */
  private lastFacing = new Map<Fighter, number>();
  /** Both maps are keyed by Fighter, and an Invasion run retires hundreds of them. */
  private nextPruneAt = 0;

  constructor(api: PassionArenaApi) {
    this.api = api;
    this.pcol = (base) => api.passionColor('player', base);
    this.ncol = (base) => api.passionColor('npc', base);
    this.pfx = new PassionFx(api.scene, this.pcol);
    this.nfx = new PassionFx(api.scene, this.ncol);
  }

  // ── Small helpers ──────────────────────────────────────────────────────────

  private get now(): number { return this.api.scene.time.now; }
  private side(owner: Owner): Side { return this.sides[owner]; }
  private fighter(owner: Owner): Fighter { return owner === 'player' ? this.api.player : this.api.npc; }
  private fx(owner: Owner): PassionFx { return owner === 'player' ? this.pfx : this.nfx; }
  private col(owner: Owner): PassionColorFn { return owner === 'player' ? this.pcol : this.ncol; }
  private body(f: Fighter): Phaser.Physics.Arcade.Body { return f.body as Phaser.Physics.Arcade.Body; }

  private get left(): number { return ARENA_PAD; }
  private get right(): number { return this.api.width - ARENA_PAD; }
  private get top(): number { return ARENA_PAD; }
  private get bottom(): number { return this.api.height - ARENA_PAD; }

  private hex(color: number): string {
    return `#${color.toString(16).padStart(6, '0')}`;
  }

  private alive(f: Fighter | null | undefined): boolean {
    return !!f && f.active && f.hp > 0;
  }

  private isPassion(owner: Owner): boolean {
    return owner === 'player' ? this.api.elementId === 'passion' : this.api.npcElementId === 'passion';
  }

  /** Everything this side is allowed to charm. */
  private targetsOf(owner: Owner): Fighter[] {
    const list = owner === 'player' ? this.api.enemies : [this.api.player];
    return list.filter((f) => this.alive(f));
  }

  private avatar(owner: Owner): PassionAvatar | null {
    return owner === 'player' ? this.playerAvatar : this.npcAvatar;
  }

  /**
   * Which way a fighter is looking. The local player's cursor is the honest answer for them;
   * everyone else is judged on where they are actually walking, latched so that standing still
   * doesn't reset them to facing east.
   *
   * `Fighter.facingAngle` is deliberately not used — it is only maintained while Silence is in
   * the match, and Exhibition would silently stop working in every other matchup.
   */
  private facingOf(f: Fighter): number {
    if (f === this.api.player) {
      const p = this.api.scene.input.activePointer;
      return Math.atan2(p.worldY - f.y, p.worldX - f.x);
    }
    const b = this.body(f);
    if (b && Math.hypot(b.velocity.x, b.velocity.y) > 10) {
      const a = Math.atan2(b.velocity.y, b.velocity.x);
      this.lastFacing.set(f, a);
      return a;
    }
    const stored = this.lastFacing.get(f);
    if (stored !== undefined) return stored;
    // Never seen it move: assume it is looking at whoever it is fighting.
    return Math.atan2(this.api.player.y - f.y, this.api.player.x - f.x);
  }

  /** Perpendicular distance from a point to the segment a→b — the Smooch dash's hit test. */
  private distToSegment(ax: number, ay: number, bx: number, by: number, px: number, py: number): number {
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    if (len2 < 1) return Phaser.Math.Distance.Between(ax, ay, px, py);
    const t = Phaser.Math.Clamp(((px - ax) * dx + (py - ay) * dy) / len2, 0, 1);
    return Phaser.Math.Distance.Between(ax + dx * t, ay + dy * t, px, py);
  }

  // ── The love bar ───────────────────────────────────────────────────────────

  /**
   * The meter for one victim, created on first sight. `max` is their max HP *now*, which is why
   * this has to run the frame Passion first sees them rather than lazily on the first hit — a
   * husk that has already been chipped would otherwise get a cheaper bar than one that hasn't.
   */
  private loveOf(f: Fighter): Love {
    let l = this.loves.get(f);
    if (!l) {
      l = { cur: 0, max: Math.max(1, f.maxHp), stage: 0, charmed: false };
      this.loves.set(f, l);
    }
    return l;
  }

  /** 0–1 for anyone Passion is working on, or 0 for anyone it isn't. */
  loveRatio(f: Fighter | null | undefined): number {
    if (!f) return 0;
    const l = this.loves.get(f);
    return l ? Phaser.Math.Clamp(l.cur / l.max, 0, 1) : 0;
  }

  /** How many of the three visible stages a victim has passed. 0–3. */
  private stageOf(ratio: number): number {
    let s = 0;
    for (const mark of STAGE_MARKS) if (ratio >= mark) s++;
    return s;
  }

  /**
   * The one way love is ever added. Nothing anywhere takes it away — no heal, no cleanse, no
   * shield and no death of the Passion user, which is the entire point of the element.
   */
  private addLove(owner: Owner, victim: Fighter, amount: number, label?: string): void {
    if (amount <= 0 || !this.alive(victim)) return;
    const l = this.loveOf(victim);
    if (l.charmed) return;

    l.cur = Math.min(l.max, l.cur + amount);
    const ratio = l.cur / l.max;

    if (label) {
      this.api.showFloatingText(victim.x, victim.y - 34, label, this.hex(PSN.hot));
    }

    const stage = this.stageOf(ratio);
    if (stage > l.stage) {
      l.stage = stage;
      this.api.showFloatingText(victim.x, victim.y - 52, STAGE_LABEL[stage], this.hex(PSN.deep));
      this.fx(owner).hearts(victim.x, victim.y, 4 + stage * 2, 22 + stage * 6, PSN.blush, 620);
      Sfx.playAt('heartbeat', victim.x, { volume: 0.5 + stage * 0.12, rate: 0.9 + stage * 0.15 });
    }

    if (l.cur >= l.max) this.charm(owner, victim);
  }

  /**
   * The bar filled. They are charmed, covered in hearts, and dead in the same frame.
   *
   * `pierce` + `netApplied` together are the only combination in `takeDamage` that means
   * "exactly this number, no mitigation and no absorb layer" — every armour multiplier, shield
   * charge, clotted pool and damage absorber is skipped. That is the requirement: a meter that
   * cannot be lowered would be worth nothing if the kill it pays out could be shielded.
   *
   * Deliberately *not* wrapped in `asNonAllyDamage`: this originates from whoever is playing
   * Passion, which in co-op can be your ally, and their friendly fire has to stay blocked.
   */
  private charm(owner: Owner, victim: Fighter): void {
    const l = this.loveOf(victim);
    if (l.charmed) return;
    l.charmed = true;
    l.cur = l.max;

    this.fx(owner).charm(victim.x, victim.y);
    this.api.showFloatingText(victim.x, victim.y - 56, '💘 CHARMED', this.hex(PSN.hot));
    this.api.spawnHitFlash(victim.x, victim.y, PSN.hot);
    Sfx.playAt('heartbeat', victim.x, { volume: 1, rate: 0.6 });
    Sfx.playAt('crystal-chime', victim.x, { volume: 0.85, rate: 1.35 });

    victim.takeDamage(Math.max(1, victim.hp), { pierce: true, netApplied: true });
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  reset(): void {
    // The rose's damage cut is written onto a Fighter, so it has to be handed back or the next
    // match starts with somebody permanently armoured.
    for (const owner of ['player', 'npc'] as Owner[]) {
      const f = this.fighter(owner);
      if (f && this.sides[owner].multOwned) f.passionIncomingMult = 1;
    }

    this.sides = { player: makeSide('player'), npc: makeSide('npc') };
    this.loves.clear();
    this.lastFacing.clear();
    this.shots = [];
    this.marks = [];
    this.clothes = [];
    this.vizT = 0;

    this.playerAvatar?.destroy(); this.playerAvatar = null;
    this.npcAvatar?.destroy(); this.npcAvatar = null;
    this.groundGfx?.destroy(); this.groundGfx = null;
    this.airGfx?.destroy(); this.airGfx = null;
    this.faceGfx?.destroy(); this.faceGfx = null;
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    if (this.api.elementId !== 'passion') return;
    void time;
    const s = this.sides.player;
    s.aimX = mouseX;
    s.aimY = mouseY;

    const p = this.api.player;
    const ctx = this.api.buildPlayerContext(mouseX, mouseY);
    const clicked = pointer.isDown && !this.api.pointerWasDown;

    if (clicked) p.castAbility('passion-loveshot', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.eKey)) p.castAbility('passion-flirt', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.rKey)) p.castAbility('passion-smooch', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.fKey)) {
      // The throw is a recast, not a second cast: the rose has already paid the cooldown, and
      // routing it back through `castAbility` would strand it in your teeth for ten seconds.
      if (s.roseUntil > this.now) this.throwRose('player', mouseX, mouseY);
      else p.castAbility('passion-manipulate', ctx);
    }
    if (Phaser.Input.Keyboard.JustDown(this.api.qKey)) p.castAbility('passion-exhibition', ctx);
  }

  // ── Ability entry points (called from build*Context) ───────────────────────

  /** Click — Loveshot. The only thing in the kit that deals damage, and it scales off the meter. */
  doLoveshot(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const s = this.side(owner);
    s.aimX = tx;
    s.aimY = ty;

    const ang = Math.atan2(ty - f.y, tx - f.x);
    const av = this.avatar(owner);
    // Fired from the muzzle of the pistol, not from the middle of the body.
    const tip = av?.pistolTip();
    const sx = tip && Number.isFinite(tip.x) ? tip.x : f.x + Math.cos(ang) * 22;
    const sy = tip && Number.isFinite(tip.y) ? tip.y : f.y + Math.sin(ang) * 22;

    this.shots.push({
      owner, kind: 'heart', x: sx, y: sy,
      vx: Math.cos(ang) * SHOT_SPEED, vy: Math.sin(ang) * SHOT_SPEED,
      diesAt: this.now + SHOT_LIFE_MS, spin: 0, love: 0,
    });

    av?.play('punch', ang);
    av?.recoil();
    this.fx(owner).muzzle(sx, sy, ang);
  }

  /**
   * E — Flirt. A cone that does nothing at all except move the meter, and moves it further the
   * further along it already is: the element's snowball, and the reason a Passion user who has
   * survived to 50% is usually going to reach 100%.
   */
  doFlirt(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const s = this.side(owner);
    s.aimX = tx;
    s.aimY = ty;

    const ang = Math.atan2(ty - f.y, tx - f.x);
    let caught = 0;
    for (const t of this.targetsOf(owner)) {
      const d = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y);
      if (d > FLIRT_REACH) continue;
      const off = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(t.y - f.y, t.x - f.x) - ang));
      if (off > FLIRT_HALF_ANGLE) continue;
      // Read the stage *before* this cast lands, so the bonus is what they walked in with.
      const bonus = this.stageOf(this.loveRatio(t)) * FLIRT_STAGE_BONUS;
      this.addLove(owner, t, FLIRT_LOVE + bonus, `+${FLIRT_LOVE + bonus} ❤`);
      caught++;
    }

    this.avatar(owner)?.play('sweep', ang);
    this.fx(owner).flirtCone(f.x, f.y, ang, FLIRT_REACH, FLIRT_HALF_ANGLE);
    this.api.showFloatingText(f.x, f.y - 46, caught ? '😘 FLIRT' : '😐 NOBODY THERE',
      this.hex(caught ? PSN.hot : PSN.wine));
  }

  /** R — Smooch. A gap-closer that refuses to pay out on anyone who isn't already halfway gone. */
  doSmooch(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const s = this.side(owner);
    s.aimX = tx;
    s.aimY = ty;

    const ang = Math.atan2(ty - f.y, tx - f.x);
    s.dashUntil = this.now + SMOOCH_MS;
    s.dashVx = Math.cos(ang) * SMOOCH_SPEED;
    s.dashVy = Math.sin(ang) * SMOOCH_SPEED;
    s.kissed = [];

    this.avatar(owner)?.play('dash', ang);
    this.fx(owner).heartRing(f.x, f.y, 10, 54, PSN.pink, 420);
  }

  /** F — Manipulate. The first press arms the rose; the recast is handled in `handleInput`. */
  doManipulate(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const s = this.side(owner);
    s.aimX = tx;
    s.aimY = ty;
    if (s.roseUntil > this.now) return;

    s.roseUntil = this.now + ROSE_HOLD_MS;
    s.roseTakenAt = this.now;
    s.lastRaw = f.rawDamageTaken;

    this.avatar(owner)?.play('flex');
    this.avatar(owner)?.setRose(true, 0);
    this.fx(owner).petals(f.x, f.y - 10, 6);
    this.api.showFloatingText(f.x, f.y - 46, '🌹 MANIPULATE', this.hex(PSN.deep));
  }

  /** Q — Exhibition. Five seconds of standing there being looked at. */
  doExhibition(owner: Owner): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const s = this.side(owner);

    s.poseUntil = this.now + POSE_MS;
    s.nextFlashAt = this.now;
    s.nextCheerAt = this.now;
    s.nextPoseTextAt = this.now + POSE_TEXT_INTERVAL_MS;

    this.avatar(owner)?.play('raise');
    this.fx(owner).heartRing(f.x, f.y, 14, 120, PSN.hot, 700);
    this.api.showFloatingText(f.x, f.y - 56, '📸 EXHIBITION', this.hex(PSN.gold));

    // The easter-egg version of the pose, and the only one that needs undressing.
    if (owner === 'player' && this.api.censoredExhibition) this.stripClothes(owner);
  }

  /**
   * The suit leaving, all five pieces at once, fanned upward and outward. The avatar stops
   * drawing them the same frame (`setStripped`), so from here until the pose ends the clothes
   * exist only as these world objects.
   */
  private stripClothes(owner: Owner): void {
    const f = this.fighter(owner);
    const fadeAt = this.now + POSE_MS;

    GARMENTS.forEach((kind, i) => {
      // Fanned about straight up, alternating sides so the pile lands spread out rather
      // than stacked on one spot.
      const spread = (i - (GARMENTS.length - 1) / 2) * 0.44;
      const ang = -Math.PI / 2 + spread + (Math.random() - 0.5) * 0.18;
      const speed = Phaser.Math.Linear(CLOTH_SPEED_MIN, CLOTH_SPEED_MAX, Math.random());
      const drop = CLOTH_FLOOR_DROP + (i - 2) * 3 + Math.random() * 6;

      this.clothes.push({
        owner,
        kind,
        x: f.x + Math.cos(ang) * 6,
        y: f.y - 4 + Math.sin(ang) * 6,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
        ang: Math.random() * Math.PI * 2,
        spin: (Math.random() < 0.5 ? -1 : 1) * (3.4 + Math.random() * 3.4),
        restY: Phaser.Math.Clamp(f.y + drop, this.top + 6, this.bottom - 6),
        restAng: (Math.random() - 0.5) * 1.1,
        landed: false,
        settle: 0,
        fadeAt,
      });
    });

    this.fx(owner).hearts(f.x, f.y - 8, 8, 34, PSN.blush, 760);
    this.api.showFloatingText(f.x, f.y - 72, '👔 CLOTHES OFF', this.hex(PSN.hot));
    Sfx.playAt('whoosh', f.x, { volume: 0.6, rate: 1.25 });
  }

  /** The rose leaving the caster's teeth. Worth more the closer they are to dying. */
  private throwRose(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    const s = this.side(owner);
    if (!this.alive(f) || s.roseUntil <= this.now) return;

    // Full health is worth the floor; at or under 50 HP it is worth the ceiling.
    const span = Math.max(1, f.maxHp - ROSE_LOVE_HP_FLOOR);
    const hurt = Phaser.Math.Clamp((f.maxHp - f.hp) / span, 0, 1);
    const love = Math.round(ROSE_LOVE_MIN + (ROSE_LOVE_MAX - ROSE_LOVE_MIN) * hurt);

    const ang = Math.atan2(ty - f.y, tx - f.x);
    this.shots.push({
      owner, kind: 'rose', x: f.x + Math.cos(ang) * 20, y: f.y + Math.sin(ang) * 20,
      vx: Math.cos(ang) * ROSE_THROW_SPEED, vy: Math.sin(ang) * ROSE_THROW_SPEED,
      diesAt: this.now + ROSE_THROW_LIFE_MS, spin: 0, love,
    });

    s.roseUntil = 0;
    this.avatar(owner)?.setRose(false, 0);
    this.avatar(owner)?.play('punch', ang);
    this.api.showFloatingText(f.x, f.y - 46, `🌹 ${love}`, this.hex(PSN.deep));
    Sfx.playAt('whoosh', f.x, { volume: 0.55, rate: 1.3 });
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    const playerIs = this.api.elementId === 'passion';
    const npcIs = this.api.npcElementId === 'passion';
    if (!playerIs && !npcIs) return;

    this.vizT += delta / 1000;
    this.ensureLayers();

    for (const owner of ['player', 'npc'] as Owner[]) {
      if (!this.isPassion(owner)) continue;
      // Sighting the enemy is what latches their bar's ceiling — see `loveOf`.
      for (const t of this.targetsOf(owner)) this.loveOf(t);
      this.updateDash(owner, time);
      this.updateRose(owner, time);
      this.updatePose(owner, time, delta);
    }

    this.updateShots(time, delta);
    this.updateClothes(time, delta);
    this.updateMarks(time);
    this.updateStacks(time);
    this.prune(time);
    this.updateAvatars(delta, playerIs, npcIs);

    this.paintGround();
    this.paintAir();
    this.paintFaces();
    this.pushStatuses(playerIs, time);
  }

  private ensureLayers(): void {
    const { scene } = this.api;
    // Fighters sit at depth 5 and their health bars at 10.
    if (!this.groundGfx) this.groundGfx = scene.add.graphics().setDepth(4);
    if (!this.airGfx) this.airGfx = scene.add.graphics().setDepth(9);
    if (!this.faceGfx) this.faceGfx = scene.add.graphics().setDepth(11);
  }

  /** The Smooch dash. Applied post-movement, so WASD can't cancel it mid-flight. */
  private updateDash(owner: Owner, time: number): void {
    const s = this.side(owner);
    if (s.dashUntil <= time) return;
    const f = this.fighter(owner);
    if (!this.alive(f)) { s.dashUntil = 0; return; }

    const b = this.body(f);
    const fromX = f.x;
    const fromY = f.y;
    b.setVelocity(s.dashVx, s.dashVy);

    // A trail of prints, so the path a kiss travelled is on the floor afterwards.
    if (this.marks.length < 90) {
      this.marks.push({
        x: fromX, y: fromY, ang: Math.atan2(s.dashVy, s.dashVx),
        until: time + 1400, size: 9 + Math.random() * 3,
      });
    }

    const ahead = 1 + SMOOCH_REACH / Math.max(1, Math.hypot(s.dashVx, s.dashVy));
    const toX = fromX + s.dashVx * 0.05 * ahead;
    const toY = fromY + s.dashVy * 0.05 * ahead;

    for (const t of this.targetsOf(owner)) {
      if (s.kissed.includes(t)) continue;
      if (this.distToSegment(fromX, fromY, toX, toY, t.x, t.y) > SMOOCH_REACH) continue;
      s.kissed.push(t);
      this.kiss(owner, t);
    }
  }

  /** A kiss arriving. Refuses anyone under half a bar — that gate is the whole ability. */
  private kiss(owner: Owner, victim: Fighter): void {
    const l = this.loveOf(victim);
    const ratio = l.cur / l.max;
    const ang = Math.atan2(victim.y - this.fighter(owner).y, victim.x - this.fighter(owner).x);

    if (ratio < SMOOCH_MIN_RATIO) {
      this.api.showFloatingText(victim.x, victim.y - 40, '💔 NOT YET', this.hex(PSN.wine));
      Sfx.playAt('ui-denied', victim.x, { volume: 0.5 });
      return;
    }

    const gain = Math.round(SMOOCH_LOVE + l.cur * SMOOCH_LOVE_FRACTION);
    this.fx(owner).smooch(victim.x, victim.y - 6, ang);
    this.marks.push({ x: victim.x, y: victim.y + 12, ang, until: this.now + 3000, size: 13 });
    Sfx.playAt('bubble', victim.x, { volume: 0.9, rate: 0.62 });
    this.addLove(owner, victim, gain, `+${gain} 💋`);
  }

  /**
   * The rose. Holding it converts every hit you take into a permanent-feeling tax on whoever
   * threw it, which is why the ability is worth casting even in a match where it never gets
   * thrown at all.
   */
  private updateRose(owner: Owner, time: number): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (s.roseUntil <= 0) return;

    if (!this.alive(f) || s.roseUntil <= time) {
      if (s.roseUntil > 0 && this.alive(f)) {
        this.api.showFloatingText(f.x, f.y - 44, '🥀 WITHERED', this.hex(PSN.wine));
      }
      s.roseUntil = 0;
      this.avatar(owner)?.setRose(false, 0);
      return;
    }

    // Every point of damage aimed at the holder buys another cut, whether or not it landed.
    if (f.rawDamageTaken > s.lastRaw) {
      s.lastRaw = f.rawDamageTaken;
      s.stacks.push(time + ROSE_STACK_MS);
      this.fx(owner).petals(f.x, f.y - 6, 3);
      const e = this.api.getNearestEnemy(f.x, f.y);
      if (this.alive(e)) {
        this.api.showFloatingText(e.x, e.y - 46, `🥀 -${s.stacks.length * 5}% DMG`, this.hex(PSN.deep));
      }
      Sfx.playAt('thorn', f.x, { volume: 0.5, rate: 1.2 });
    } else {
      s.lastRaw = f.rawDamageTaken;
    }

    // The bot has no recast key. It milks the hold, then throws at whoever is nearest.
    if (owner === 'npc' && time - s.roseTakenAt > ROSE_NPC_HOLD_MS) {
      const e = this.api.getNearestEnemy(f.x, f.y);
      if (this.alive(e)) this.throwRose('npc', e.x, e.y);
      else s.roseUntil = 0;
    }
  }

  /** Prunes expired cuts and rewrites the holder's armour from scratch, every frame. */
  private updateStacks(time: number): void {
    for (const owner of ['player', 'npc'] as Owner[]) {
      const s = this.side(owner);
      const f = this.fighter(owner);
      if (!f) continue;
      if (s.stacks.length) s.stacks = s.stacks.filter((until) => until > time);
      if (s.stacks.length > 0) {
        // Multiplicative: "stacks infinitely" has to mean approaching zero, never reaching it.
        f.passionIncomingMult = ROSE_STACK_MULT ** s.stacks.length;
        s.multOwned = true;
      } else if (s.multOwned) {
        f.passionIncomingMult = 1;
        s.multOwned = false;
      }
    }
  }

  /**
   * Exhibition. The love only flows out of people who are looking, which is the one piece of
   * counterplay in the element that costs the victim nothing but their aim.
   */
  private updatePose(owner: Owner, time: number, delta: number): void {
    const s = this.side(owner);
    if (s.poseUntil <= time) return;
    const f = this.fighter(owner);
    if (!this.alive(f)) { s.poseUntil = 0; return; }

    const dt = delta / 1000;
    let watching = 0;
    for (const t of this.targetsOf(owner)) {
      const toward = Math.atan2(f.y - t.y, f.x - t.x);
      const off = Math.abs(Phaser.Math.Angle.Wrap(this.facingOf(t) - toward));
      if (off > POSE_VIEW_HALF_ANGLE) continue;
      watching++;
      this.addLove(owner, t, POSE_LOVE_PER_SEC * dt);
      if (time >= s.nextPoseTextAt) {
        this.api.showFloatingText(t.x, t.y - 34, `+${POSE_LOVE_PER_SEC} ❤`, this.hex(PSN.hot));
      }
    }
    if (time >= s.nextPoseTextAt) s.nextPoseTextAt = time + POSE_TEXT_INTERVAL_MS;

    // Flashbulbs alternating along the two side walls, aimed inward at the poser.
    if (time >= s.nextFlashAt) {
      s.nextFlashAt = time + FLASH_INTERVAL_MS;
      s.flashSide = -s.flashSide;
      const fx = s.flashSide > 0 ? this.api.width - 14 : 14;
      const fy = Phaser.Math.Between(Math.round(this.top + 30), Math.round(this.bottom - 30));
      this.fx(owner).cameraFlash(fx, fy, Math.atan2(f.y - fy, f.x - fx));
      Sfx.playAt('sparkle', fx, { volume: 0.4, rate: 1.5 });
    }
    // The crowd underneath it all.
    if (time >= s.nextCheerAt) {
      s.nextCheerAt = time + CHEER_INTERVAL_MS;
      Sfx.playAt('rain', f.x, { volume: 0.3, rate: 1.7 });
      if (!watching) {
        this.api.showFloatingText(f.x, f.y - 60, '👀 NOBODY IS LOOKING', this.hex(PSN.wine));
      }
    }
  }

  /** Heart bullets and thrown roses. */
  private updateShots(time: number, delta: number): void {
    const dt = delta / 1000;
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const sh = this.shots[i];
      sh.x += sh.vx * dt;
      sh.y += sh.vy * dt;
      sh.spin += dt * (sh.kind === 'rose' ? 9 : 3);

      if (time >= sh.diesAt || sh.x < this.left - 40 || sh.x > this.right + 40
        || sh.y < this.top - 40 || sh.y > this.bottom + 40) {
        this.shots.splice(i, 1);
        continue;
      }

      const r = sh.kind === 'rose' ? ROSE_THROW_HIT_R : SHOT_HIT_R;
      let hit: Fighter | null = null;
      for (const t of this.targetsOf(sh.owner)) {
        if (Phaser.Math.Distance.Between(sh.x, sh.y, t.x, t.y) > r + 18) continue;
        hit = t;
        break;
      }
      if (!hit) continue;

      this.shots.splice(i, 1);
      const ang = Math.atan2(sh.vy, sh.vx);
      if (sh.kind === 'rose') {
        this.fx(sh.owner).petals(hit.x, hit.y, 12);
        this.api.spawnHitFlash(hit.x, hit.y, PSN.deep);
        this.addLove(sh.owner, hit, sh.love, `+${sh.love} 🌹`);
      } else {
        // The meter feeds the gun: every 80 already on the bar is another two damage.
        const bonus = Math.floor(this.loveOf(hit).cur / SHOT_LOVE_PER_BONUS) * SHOT_BONUS_DAMAGE;
        hit.takeDamage(SHOT_DAMAGE + bonus);
        this.api.spawnHitFlash(hit.x, hit.y, PSN.hot);
        this.fx(sh.owner).hearts(hit.x, hit.y, 4, 18, PSN.hot, 480);
        this.marks.push({ x: hit.x, y: hit.y + 14, ang, until: time + 1600, size: 8 });
        this.addLove(sh.owner, hit, SHOT_LOVE, `+${SHOT_LOVE} ❤`);
      }
    }
  }

  /**
   * Drops the meters of anyone who is gone. A wave-based Invasion run retires husks by the
   * hundred, and these maps hold a strong reference to every Fighter they have ever seen.
   */
  private prune(time: number): void {
    if (time < this.nextPruneAt) return;
    this.nextPruneAt = time + 3000;
    for (const f of [...this.loves.keys()]) if (!f.active) this.loves.delete(f);
    for (const f of [...this.lastFacing.keys()]) if (!f.active) this.lastFacing.delete(f);
  }

  /**
   * The clothes: tumble, land, lie still, fade. Nothing here touches the fight — a garment is
   * scenery, and it is the only thing in the element that is purely that.
   */
  private updateClothes(time: number, delta: number): void {
    const dt = delta / 1000;
    for (let i = this.clothes.length - 1; i >= 0; i--) {
      const c = this.clothes[i];
      if (time >= c.fadeAt + CLOTH_FADE_MS) {
        this.clothes.splice(i, 1);
        continue;
      }

      if (c.landed) {
        c.settle = Math.min(1, c.settle + dt * 4.5);
        // Ease the last of the tumble out into the slump angle instead of snapping to it.
        c.ang += Phaser.Math.Angle.Wrap(c.restAng - c.ang) * Math.min(1, dt * 7);
        continue;
      }

      // Air drag on the horizontal only: cloth keeps falling but stops travelling.
      c.vy += CLOTH_GRAVITY * dt;
      c.vx *= 1 - Math.min(1, dt * 1.6);
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.ang += c.spin * dt;
      c.spin *= 1 - Math.min(1, dt * 0.9);
      c.x = Phaser.Math.Clamp(c.x, this.left + 8, this.right - 8);

      if (c.vy > 0 && c.y >= c.restY) {
        c.y = c.restY;
        c.landed = true;
        this.fx(c.owner).hearts(c.x, c.y, 2, 12, PSN.blush, 500, 4);
        Sfx.playAt('whoosh', c.x, { volume: 0.18, rate: 1.9 });
      }
    }
  }

  /** 1 for the whole pose, then down to 0 across the fade. */
  private clothAlpha(c: Cloth, time: number): number {
    return Phaser.Math.Clamp((c.fadeAt + CLOTH_FADE_MS - time) / CLOTH_FADE_MS, 0, 1);
  }

  private updateMarks(time: number): void {
    for (let i = this.marks.length - 1; i >= 0; i--) {
      if (this.marks[i].until <= time) this.marks.splice(i, 1);
    }
  }

  private updateAvatars(delta: number, playerIs: boolean, npcIs: boolean): void {
    const { scene } = this.api;
    if (playerIs && !this.playerAvatar) this.playerAvatar = new PassionAvatar(scene, this.pcol);
    if (npcIs && !this.npcAvatar) this.npcAvatar = new PassionAvatar(scene, this.ncol);

    for (const owner of ['player', 'npc'] as Owner[]) {
      const av = this.avatar(owner);
      if (!av) continue;
      const f = this.fighter(owner);
      if (!f || !f.active) { av.update(delta, -999, -999, 0); continue; }

      const s = this.side(owner);
      const target = owner === 'player'
        ? { x: s.aimX, y: s.aimY }
        : { x: this.api.player.x, y: this.api.player.y };
      av.setFacing(Math.atan2(target.y - f.y, target.x - f.x));

      const roseLeft = Math.max(0, s.roseUntil - this.now);
      av.setRose(s.roseUntil > this.now, 1 - Phaser.Math.Clamp(roseLeft / ROSE_HOLD_MS, 0, 1));

      const posing = s.poseUntil > this.now;
      const censored = owner === 'player' && this.api.censoredExhibition;
      av.setPosing(posing ? 1 : 0);
      av.setCensored(censored);
      // Undressed for exactly as long as the pose runs — the garments on the floor outlive it
      // only by their fade, by which point the suit is back on.
      av.setStripped(posing && censored);
      // A pose is a held stance, not a gesture — the arms have to stay put for five seconds.
      av.setHold(posing ? 'ride' : null);
      av.setIntensity(posing ? 1.25 : 1);
      av.setMastered(owner === 'player' ? this.api.masteryActive : this.api.npcMasteryActive);
      av.update(delta, f.x, f.y, f.alpha);
    }
  }

  // ── Painting ───────────────────────────────────────────────────────────────

  private paintGround(): void {
    const g = this.groundGfx;
    if (!g) return;
    g.clear();
    const now = this.now;
    for (const m of this.marks) {
      const life = Phaser.Math.Clamp((m.until - now) / 1400, 0, 1);
      heartOutline(g, this.pcol, m.x, m.y, m.size * (0.7 + life * 0.4), m.ang, PSN.deep, life * 0.5, 2);
      g.fillStyle(this.pcol(PSN.hot), life * 0.16);
      g.fillEllipse(m.x, m.y, m.size * 2.2, m.size * 1.1);
    }
    // Clothes that have landed belong under the fighters — you can stand on your own jacket.
    for (const c of this.clothes) {
      if (!c.landed) continue;
      garment(g, this.col(c.owner), c.kind, c.x, c.y, c.ang, this.clothAlpha(c, now), 1, c.settle);
    }
  }

  private paintAir(): void {
    const g = this.airGfx;
    if (!g) return;
    g.clear();
    // Garments still in flight pass in front of everything, so the strip is unmissable.
    for (const c of this.clothes) {
      if (c.landed) continue;
      garment(g, this.col(c.owner), c.kind, c.x, c.y, c.ang, this.clothAlpha(c, this.now));
    }
    for (const sh of this.shots) {
      const tint = this.col(sh.owner);
      const ang = Math.atan2(sh.vy, sh.vx);
      if (sh.kind === 'rose') {
        // Tumbling end over end, with petals shaking loose behind it.
        drawRose(g, tint, sh.x, sh.y, sh.spin, 0.95, 1, 0);
        for (let i = 1; i <= 3; i++) {
          g.fillStyle(tint(PSN.deep), 0.28 / i);
          g.fillEllipse(sh.x - sh.vx * 0.012 * i, sh.y - sh.vy * 0.012 * i, 5 - i, 3.4 - i * 0.5);
        }
      } else {
        // A trail of shrinking hearts, then the bullet itself over the top of them.
        for (let i = 3; i >= 1; i--) {
          heart(g, tint, sh.x - sh.vx * 0.014 * i, sh.y - sh.vy * 0.014 * i,
            9 - i * 1.9, ang, PSN.blush, 0.42 / i);
        }
        g.fillStyle(tint(PSN.hot), 0.22);
        g.fillCircle(sh.x, sh.y, 13);
        heart(g, tint, sh.x, sh.y, 10 + Math.sin(sh.spin * 2.4) * 0.9, ang, PSN.hot, 1, true);
      }
    }
  }

  /**
   * The passive, drawn on everyone Passion is working on: the meter, the blush stage, and the
   * heart eyes at the top end. Everything here is on the *victim*, which is the only place the
   * element's progress is ever visible.
   */
  private paintFaces(): void {
    const g = this.faceGfx;
    if (!g) return;
    g.clear();
    const t = this.vizT;

    for (const owner of ['player', 'npc'] as Owner[]) {
      if (!this.isPassion(owner)) continue;
      const tint = this.col(owner);
      for (const victim of this.targetsOf(owner)) {
        const l = this.loves.get(victim);
        if (!l) continue;
        const ratio = Phaser.Math.Clamp(l.cur / l.max, 0, 1);
        const stage = this.stageOf(ratio);

        loveBar(g, tint, victim.x, victim.y + LOVE_BAR_Y, LOVE_BAR_W, LOVE_BAR_H, ratio, t);

        if (stage >= 1) {
          blush(g, tint, victim.x, victim.y, Math.min(stage, 3) as 1 | 2 | 3, victim.alpha, t);
        }
        if (stage >= 3) {
          heartEyes(g, tint, victim.x, victim.y, victim.alpha, t);
        }
      }
    }
  }

  // ── Status tray ────────────────────────────────────────────────────────────

  private pushStatuses(playerIsPassion: boolean, time: number): void {
    const s = this.sides.player;
    const p = this.api.player;

    this.api.setStatusIndicator('passion-rose', playerIsPassion && s.roseUntil > time ? {
      name: 'Rose', emoji: '🌹', color: PSN.deep,
      description: 'Held in your teeth. Every hit you take cuts the attacker\'s damage by another '
        + '5% for 5s. Press F again to throw it.',
      until: s.roseUntil, priority: 110,
    } : null);

    this.api.setStatusIndicator('passion-pose', playerIsPassion && s.poseUntil > time ? {
      name: 'Exhibition', emoji: '📸', color: PSN.gold,
      description: 'Posing. Anyone facing you is gaining 15 love a second.',
      until: s.poseUntil, priority: 100,
    } : null);

    // Whoever is holding the rose is the one carrying its armour, so this is not player-gated.
    const holder = playerIsPassion ? s : this.sides.npc;
    const mine = playerIsPassion ? s.stacks.length : 0;
    const against = playerIsPassion ? 0 : holder.stacks.length;
    this.api.setStatusIndicator('passion-thorns', mine > 0 ? {
      name: 'Thorns', emoji: '🥀', color: PSN.wine,
      description: `Everything hitting you is dealing ${Math.round((1 - ROSE_STACK_MULT ** mine) * 100)}% less damage.`,
      count: mine, priority: 96,
    } : null);
    this.api.setStatusIndicator('passion-weakened', against > 0 ? {
      name: 'Weakened', emoji: '🥀', color: PSN.wine,
      description: `Their rose has taken ${Math.round((1 - ROSE_STACK_MULT ** against) * 100)}% off everything you deal.`,
      count: against, priority: 30,
    } : null);

    // ── Victim side: the player's own meter, when the bot is the one playing Passion. ──
    const l = this.api.npcElementId === 'passion' ? this.loves.get(p) : undefined;
    this.api.setStatusIndicator('passion-love', l ? {
      name: 'In Love', emoji: '💘', color: PSN.hot,
      description: 'Their love for you fills a bar the size of your starting health. Nothing lowers '
        + 'it, and it kills you outright when it fills. Stop looking at them while they pose.',
      count: Math.round((l.cur / l.max) * 100), suffix: '%', priority: 4,
    } : null);
  }

  // ── Accessors read by ArenaScene / the NPC ─────────────────────────────────

  /** True while the bot already has a rose in its teeth — a second F would do nothing. */
  hasRose(owner: Owner): boolean {
    return this.sides[owner].roseUntil > this.now;
  }

  isPosing(owner: Owner): boolean {
    return this.sides[owner].poseUntil > this.now;
  }

  /**
   * The HUD cards. The rose's fifteen seconds and the pose's five both outlast their own
   * cooldowns, so those two slots count the ability rather than the wait.
   */
  getBarRatio(abilityId: string, time: number): number {
    const s = this.sides.player;
    if (abilityId === 'passion-manipulate' && s.roseUntil > time) {
      return Phaser.Math.Clamp((s.roseUntil - time) / ROSE_HOLD_MS, 0, 1);
    }
    if (abilityId === 'passion-exhibition' && s.poseUntil > time) {
      return Phaser.Math.Clamp((s.poseUntil - time) / POSE_MS, 0, 1);
    }
    return this.api.player.getCooldownRatio(abilityId);
  }
}
