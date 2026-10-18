import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { ELEMENT_MAP } from '../../elements/ElementRegistry';
import { Element } from '../../elements/Element';
import { BaseAvatar, ArmGesture } from '../../elements/kits/ElementVisuals';
import { makeElementAvatar, elementBodyTexture } from '../../elements/kits/ElementAvatars';
import { allSelectableElements } from '../../data/ElementRoster';
import { Sfx } from '../../audio';
import { Husk } from '../Husk';
import { BASIC_HUSK, huskTextureKey } from '../HuskVariants';
import { CityMap, CITY_MAIN, CITY_LANES } from './CityMap';
import type { NetBotState } from '../../network/NetworkManager';

/**
 * The bot half of a City party. A companion is a light defender: it wears its
 * element's real body and rig, but instead of running that element's kit it
 * fights with one of five simple attack styles, painted in the element's
 * colour. It picks a district to hold, walks there through the gates, fights
 * husks it finds, can be downed and picked back up.
 *
 * Companions are never in the arena's `enemies` or its physics groups, so no
 * player ability can hurt one, and they hurt husks by calling `takeDamage`
 * directly — the husk's own death handler pays the shards.
 */

export type CompanionStyle = 'bolt' | 'cleave' | 'nova' | 'lob' | 'mend';

/** How each element fights when a bot is wearing it. Anything unlisted throws bolts. */
const STYLE_OF: Record<string, CompanionStyle> = {
  // Melee bruisers and blades.
  earth: 'cleave', metal: 'cleave', hunt: 'cleave', ruin: 'cleave', death: 'cleave',
  cloth: 'cleave', conquest: 'cleave', subterfuge: 'cleave', shadow: 'cleave', justice: 'cleave',
  rubber: 'cleave', marrow: 'cleave', clay: 'cleave', bind: 'cleave', silence: 'cleave',
  // Pulses around the body.
  gravity: 'nova', radiation: 'nova', soul: 'nova', psychic: 'nova', dream: 'nova',
  echo: 'nova', sound: 'nova', magnet: 'nova', myth: 'nova', tempest: 'nova', glass: 'nova',
  // Arcing throws that burst where they land.
  gunpowder: 'lob', magma: 'lob', oil: 'lob', slime: 'lob', gum: 'lob', depths: 'lob',
  fortune: 'lob', chalk: 'lob', gluttony: 'lob', paper: 'lob', wax: 'lob', dune: 'lob',
  // Menders.
  life: 'mend', growth: 'mend', passion: 'mend', creation: 'mend', crystal: 'mend', water: 'mend',
};

const STYLE_RANGE: Record<CompanionStyle, number> = { bolt: 250, cleave: 44, nova: 70, lob: 270, mend: 210 };
const STYLE_GESTURE: Record<CompanionStyle, ArmGesture> = {
  bolt: 'punch', cleave: 'sweep', nova: 'clap', lob: 'slam', mend: 'punch',
};

const COMPANION_HP = 260;
const COMPANION_SPEED = 175;
const GATE_STEP = 30;
const REVIVE_RADIUS = 64;
const PLAYER_REVIVE_MS = 2500;
const BOT_REVIVE_MS = 3200;
/** A downed player who nobody reaches stands back up at the plinth after this. */
const PLAYER_RESPAWN_MS = 15000;
/** A downed bot nobody picks up stands itself back up at the plinth after this. */
const BOT_RESPAWN_MS = 30000;
const REASSIGN_MS = 1200;
const NAME_FONT = '"Arial Black", "Segoe UI Black", Impact, sans-serif';

/** A bot picked up a draft card: these are the only things it can get better at. */
export type CompanionBoon = 'move' | 'damage' | 'haste' | 'vigor';

export class Companion extends Fighter {
  roomIndex = CITY_MAIN;
  post = CITY_MAIN;
  readonly elementId: string;
  readonly style: CompanionStyle;
  readonly tint: number;
  /** 1 = primary only; 2 adds the secondary; 3 the ultimate. Raised by ability cards. */
  tier = 1;
  dmgMult = 1;
  cdMult = 1;
  avatar: BaseAvatar | null = null;
  nameTag: Phaser.GameObjects.Text;
  nextPrimaryAt = 0;
  nextSecondaryAt = 0;
  nextUltAt = 0;
  reviveProgress = 0;
  /** When it went down — after BOT_RESPAWN_MS it gets itself back up at the plinth. */
  downedAt = 0;
  /** Bumped every swing — the co-op guest plays one for each. */
  attackSeq = 0;
  /** Whirlwind / mend aura: until when the channel runs. */
  channelUntil = 0;
  nextChannelTickAt = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, elementId: string, index: number) {
    const el: Element = ELEMENT_MAP[elementId] ?? ELEMENT_MAP.fire;
    const tex = elementBodyTexture(scene, elementId) ?? huskTextureKey(BASIC_HUSK);
    super(scene, x, y, tex, el, COMPANION_HP, COMPANION_SPEED);
    this.elementId = elementId;
    this.style = STYLE_OF[elementId] ?? 'bolt';
    this.tint = el.color;
    // A body-painting element (Magma, Cloth, Marrow) gets its torso from the rig.
    if (!elementBodyTexture(scene, elementId)) this.setAlpha(0);
    this.avatar = makeElementAvatar(elementId, scene, (c) => c);
    this.nameTag = scene.add.text(x, y - 44, `🤖 ${el.name.toUpperCase()}`, {
      fontSize: '10px', fontFamily: NAME_FONT,
      color: `#${el.color.toString(16).padStart(6, '0')}`, stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(9);
    // Stagger their opening swings so a party doesn't fire in lockstep.
    this.nextPrimaryAt = index * 180;
  }

  get bodyless(): boolean { return !elementBodyTexture(this.scene, this.elementId); }

  destroy(fromScene?: boolean): void {
    this.avatar?.destroy();
    this.avatar = null;
    this.nameTag?.destroy();
    super.destroy(fromScene);
  }
}

/** A bot's name tag: its element, or a skull and the seconds until it gets itself back up. */
export function companionTag(c: Companion, time: number): string {
  return c.downed
    ? `💀 ${c.element.name.toUpperCase()}  ${Math.max(0, Math.ceil((BOT_RESPAWN_MS - (time - c.downedAt)) / 1000))}s`
    : `🤖 ${c.element.name.toUpperCase()}`;
}

/** A thrown thing in flight. Orbs fly straight and hit the first husk; bombs arc to a point and burst. */
interface CShot {
  kind: 'orb' | 'bomb';
  room: number;
  x: number; y: number;
  vx: number; vy: number;
  sx: number; sy: number; tx: number; ty: number;
  t: number; dur: number;
  dmg: number;
  radius: number;
  color: number;
  /** Bombs that leave a burning pool behind (lob secondary). */
  pool?: boolean;
}

/** A one-shot painted effect: a slash, a ring, a beam, a pool. */
interface CFx {
  kind: 'slash' | 'ring' | 'beam' | 'burst' | 'pool' | 'plus';
  room: number;
  x: number; y: number;
  x2?: number; y2?: number;
  r: number;
  a?: number;
  color: number;
  t: number;
  dur: number;
  /** Pools tick damage on husks while they last. */
  dps?: number;
}

export interface CompanionWorld {
  readonly scene: Phaser.Scene;
  readonly map: CityMap;
  readonly player: Fighter;
  readonly core: Fighter | null;
  readonly elementId: string;
  livingHusks(): Husk[];
  showFloatingText(x: number, y: number, text: string, color: string): void;
  /** The run's wave — companions hit a little harder as the night goes on. */
  readonly wave: number;
}

export class CompanionKit {
  readonly list: Companion[] = [];
  private shots: CShot[] = [];
  private fx: CFx[] = [];
  private fxG: Phaser.GameObjects.Graphics | null = null;
  private nextAssignAt = 0;

  /** The local player's own down state — the city has no co-op kit to own it. */
  private playerDowned = false;
  private playerDownedAt = 0;
  private playerReviveProgress = 0;
  private downedLabel: Phaser.GameObjects.Text | null = null;
  private reviveHint: Phaser.GameObjects.Text | null = null;
  private readonly onPlayerDefeated = (): void => this.downPlayer();
  /** False in co-op, where InvasionCoopKit owns both humans' down state. */
  private ownsPlayerDown = true;

  constructor(private world: CompanionWorld) {}

  get isPlayerDowned(): boolean { return this.playerDowned; }

  /** `bots` is how many seats to fill; `ownsPlayerDown` is false in co-op. */
  reset(bots: number, ownsPlayerDown = true): void {
    this.destroyAll();
    this.ownsPlayerDown = ownsPlayerDown;
    const scene = this.world.scene;
    this.fxG = scene.add.graphics().setDepth(6.5);
    this.downedLabel = scene.add.text(scene.scale.width / 2, scene.scale.height / 2 + 60, '', {
      fontSize: '18px', fontFamily: NAME_FONT, color: '#ff7766', stroke: '#000000', strokeThickness: 4,
      align: 'center',
    }).setOrigin(0.5).setDepth(30).setVisible(false);
    this.reviveHint = scene.add.text(scene.scale.width / 2, scene.scale.height - 92, '', {
      fontSize: '13px', fontFamily: NAME_FONT, color: '#88ff99', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(30);

    const picks = this.pickElements(Math.max(0, bots));
    const at = this.world.map.allElementPos();
    picks.forEach((id, i) => {
      const c = new Companion(scene, at.x - 90 + i * 90, at.y + 120, id, i);
      this.list.push(c);
    });

    this.playerDowned = false;
    this.playerReviveProgress = 0;
    const p = this.world.player;
    p.off('defeated', this.onPlayerDefeated);
    if (ownsPlayerDown) {
      p.downed = false;
      p.on('defeated', this.onPlayerDefeated);
    }
    this.nextAssignAt = 0;
  }

  /** Bots wear elements the host has unlocked — never the host's own, never twice. */
  private pickElements(n: number): string[] {
    const own = this.world.elementId;
    const pool = allSelectableElements()
      .filter((e) => e.available !== false && e.id !== own && e.id !== 'quantum' && ELEMENT_MAP[e.id])
      .map((e) => e.id);
    Phaser.Utils.Array.Shuffle(pool);
    return pool.slice(0, n);
  }

  destroyAll(): void {
    for (const c of this.list) c.destroy();
    this.list.length = 0;
    this.shots = [];
    this.fx = [];
    this.fxG?.destroy(); this.fxG = null;
    this.downedLabel?.destroy(); this.downedLabel = null;
    this.reviveHint?.destroy(); this.reviveHint = null;
    this.world.player.off('defeated', this.onPlayerDefeated);
  }

  /** Living, standing companions in a room — the husks' extra targets. */
  inRoom(room: number): Fighter[] {
    return this.list.filter((c) => c.active && c.roomIndex === room);
  }

  owns(f: Fighter): boolean {
    return f instanceof Companion && this.list.includes(f);
  }

  /** A draft card a bot picked. */
  grant(c: Companion, boon: CompanionBoon): string {
    switch (boon) {
      case 'move':
        if (c.tier < 3) { c.tier++; return c.tier === 2 ? 'NEW MOVE' : 'ULTIMATE'; }
        c.dmgMult *= 1.15;
        return '+15% DAMAGE';
      case 'damage': c.dmgMult *= 1.2; return '+20% DAMAGE';
      case 'haste': c.cdMult *= 0.85; return 'FASTER ATTACKS';
      default:
        c.increaseMaxHp(60);
        c.heal(60);
        return '+60 MAX HP';
    }
  }

  /** Wave over: everyone who went down gets back up, half-mended. */
  onWaveCleared(): void {
    for (const c of this.list) {
      if (c.downed) this.reviveCompanion(c, 0.5);
      else c.heal(Math.round(c.maxHp * 0.25));
    }
    if (this.playerDowned) this.revivePlayer(0.5);
  }

  // ── The local player's down state ─────────────────────────────────

  private downPlayer(): void {
    if (this.playerDowned) return;
    const p = this.world.player;
    this.playerDowned = true;
    this.playerDownedAt = this.world.scene.time.now;
    this.playerReviveProgress = 0;
    p.downed = true;
    p.hp = 0;
    p.setAlpha(0.45);
    Sfx.play('defeat', { volume: 0.5 });
    this.world.showFloatingText(p.x, p.y - 50, 'DOWNED!', '#ff6666');
  }

  private revivePlayer(frac: number): void {
    if (!this.playerDowned) return;
    const p = this.world.player;
    this.playerDowned = false;
    p.downed = false;
    p.hp = Math.max(1, Math.round(p.maxHp * frac));
    p.setAlpha(1);
    this.downedLabel?.setVisible(false);
    this.world.showFloatingText(p.x, p.y - 50, 'BACK ON YOUR FEET!', '#66ff88');
  }

  private reviveCompanion(c: Companion, frac: number): void {
    c.downed = false;
    c.hp = Math.max(1, Math.round(c.maxHp * frac));
    c.reviveProgress = 0;
    c.setAngle(0);
    if (c.visible) this.world.showFloatingText(c.x, c.y - 40, 'REVIVED!', '#66ff88');
  }

  // ── Per frame ─────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    const view = this.world.map.currentRoom;
    const husks = this.world.livingHusks().filter((h) => !h.possessing);

    if (time >= this.nextAssignAt) {
      this.nextAssignAt = time + REASSIGN_MS;
      this.assignPosts(husks);
    }

    for (const c of this.list) {
      if (!c.active) continue;
      if (c.hp <= 0 && !c.downed) {
        c.downed = true;
        c.downedAt = time;
        c.setAngle(90);
        (c.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
        if (c.roomIndex === view) this.world.showFloatingText(c.x, c.y - 40, `${c.element.name.toUpperCase()} IS DOWN`, '#ff7766');
      }
      if (c.downed) {
        (c.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      } else {
        this.think(c, husks, time);
      }
      this.paintCompanion(c, view, delta, time);
    }

    this.tickRevives(delta, time, view);
    this.updateShots(delta, husks, view);
    this.updateFx(delta, husks, view);
  }

  /**
   * Who holds which district. Main Street weighs heaviest — the All-Element is
   * there — and every bot already heading somewhere makes it less attractive to
   * the next, so a party spreads across the lanes instead of clumping.
   */
  private assignPosts(husks: Husk[]): void {
    const counts = new Map<number, number>();
    for (const h of husks) counts.set(h.roomIndex, (counts.get(h.roomIndex) ?? 0) + 1);
    const taken = new Map<number, number>();
    const playerRoom = this.world.map.currentRoom;
    for (const c of this.list) {
      if (c.downed) continue;
      let best = CITY_MAIN;
      let bestScore = -Infinity;
      for (const r of [CITY_MAIN, ...CITY_LANES]) {
        const n = counts.get(r) ?? 0;
        let score = r === CITY_MAIN ? n * 2.5 + 0.5 : n;
        score -= (taken.get(r) ?? 0) * 3;
        if (this.playerDowned && r === playerRoom) score += 8;
        if (this.list.some((o) => o !== c && o.downed && o.roomIndex === r)) score += 3;
        if (c.style === 'mend' && r === playerRoom) score += 4;
        // A little stickiness, so nobody ping-pongs on a tie.
        if (r === c.post) score += 0.75;
        if (score > bestScore) { bestScore = score; best = r; }
      }
      c.post = best;
      taken.set(best, (taken.get(best) ?? 0) + 1);
    }
  }

  private think(c: Companion, husks: Husk[], time: number): void {
    const body = c.body as Phaser.Physics.Arcade.Body;
    const map = this.world.map;

    // On the way somewhere else: walk to the right gate and step through.
    if (c.post !== c.roomIndex) {
      const gate = c.roomIndex === CITY_MAIN
        ? map.gatesOf(CITY_MAIN).find((g) => g.toRoom === c.post)!
        : map.laneExit(c.roomIndex);
      // Still fight anything right in the way.
      const close = this.nearestHusk(c, husks, 120);
      if (close) this.attack(c, close, husks, time);
      this.steer(c, gate.x, gate.y, 1);
      if (Phaser.Math.Distance.Between(c.x, c.y, gate.x, gate.y) <= GATE_STEP) {
        const from = c.roomIndex;
        c.roomIndex = c.roomIndex === CITY_MAIN ? c.post : CITY_MAIN;
        const at = c.roomIndex === CITY_MAIN ? map.mainArrival(from) : map.laneArrival(c.roomIndex);
        body.reset(at.x + Phaser.Math.Between(-14, 14), at.y + Phaser.Math.Between(-14, 14));
      }
      return;
    }

    // A downed friend here, and nothing close enough to punish stopping: go pick them up.
    const p = this.world.player;
    const downedHere: Fighter | undefined = (this.playerDowned && map.currentRoom === c.roomIndex)
      ? p
      : this.list.find((o) => o !== c && o.downed && o.roomIndex === c.roomIndex);
    if (downedHere && !this.nearestHusk(c, husks, 140)) {
      if (Phaser.Math.Distance.Between(c.x, c.y, downedHere.x, downedHere.y) > REVIVE_RADIUS * 0.6) {
        this.steer(c, downedHere.x, downedHere.y, 1);
      } else {
        body.setVelocity(0, 0);
      }
      return;
    }

    // Fight: on Main Street go for whatever is closest to the All-Element.
    const core = this.world.core;
    const target = c.roomIndex === CITY_MAIN && core
      ? this.huskNearest(core.x, core.y, husks.filter((h) => h.roomIndex === CITY_MAIN))
      : this.nearestHusk(c, husks, Infinity);
    if (!target) {
      // Nothing here. Lanes: hold near the gate. Main Street: stand by the plinth.
      const home = c.roomIndex === CITY_MAIN && core
        ? { x: core.x + (this.list.indexOf(c) - 1) * 70, y: core.y + 110 }
        : map.laneArrival(c.roomIndex);
      if (Phaser.Math.Distance.Between(c.x, c.y, home.x, home.y) > 24) this.steer(c, home.x, home.y, 0.7);
      else body.setVelocity(0, 0);
      return;
    }
    const d = Phaser.Math.Distance.Between(c.x, c.y, target.x, target.y);
    const range = STYLE_RANGE[c.style];
    if (d > range * 1.1) this.steer(c, target.x, target.y, 1);
    else if (d < range * 0.6 && c.style !== 'cleave' && c.style !== 'nova') this.steer(c, target.x, target.y, -0.8);
    else body.setVelocity(0, 0);
    this.attack(c, target, husks, time);
  }

  private steer(c: Companion, x: number, y: number, sign: number): void {
    const body = c.body as Phaser.Physics.Arcade.Body;
    const dx = x - c.x, dy = y - c.y;
    const d = Math.hypot(dx, dy) || 1;
    const spd = c.speed * sign;
    body.setVelocity((dx / d) * spd, (dy / d) * spd);
    if (sign > 0) c.facingAngle = Math.atan2(dy, dx);
  }

  private nearestHusk(c: Companion, husks: Husk[], within: number): Husk | null {
    const here = husks.filter((h) => h.roomIndex === c.roomIndex);
    const h = this.huskNearest(c.x, c.y, here);
    return h && Phaser.Math.Distance.Between(c.x, c.y, h.x, h.y) <= within ? h : null;
  }

  private huskNearest(x: number, y: number, list: Husk[]): Husk | null {
    let best: Husk | null = null;
    let bd = Infinity;
    for (const h of list) {
      const d = Phaser.Math.Distance.Between(x, y, h.x, h.y);
      if (d < bd) { bd = d; best = h; }
    }
    return best;
  }

  // ── Attacks ───────────────────────────────────────────────────────

  private dmg(c: Companion, base: number): number {
    // Husks keep their stats all night; bots keep pace a little as the waves climb.
    return base * c.dmgMult * (1 + this.world.wave * 0.04);
  }

  private attack(c: Companion, target: Husk, husks: Husk[], time: number): void {
    const ang = Math.atan2(target.y - c.y, target.x - c.x);
    c.facingAngle = ang;
    const d = Phaser.Math.Distance.Between(c.x, c.y, target.x, target.y);
    const range = STYLE_RANGE[c.style];

    // Ultimate first, when there is a crowd worth it.
    if (c.tier >= 3 && time >= c.nextUltAt) {
      const crowd = husks.filter((h) => h.roomIndex === c.roomIndex
        && Phaser.Math.Distance.Between(c.x, c.y, h.x, h.y) < 260).length;
      if (crowd >= 4 || (c.style === 'mend' && this.someoneHurt(c, 0.5))) {
        c.nextUltAt = time + 15000 * c.cdMult;
        this.ultimate(c, target, time);
        return;
      }
    }
    if (c.tier >= 2 && time >= c.nextSecondaryAt && d <= range * 1.6) {
      c.nextSecondaryAt = time + 5000 * c.cdMult;
      this.secondary(c, target, ang, time);
      return;
    }
    if (time >= c.nextPrimaryAt && d <= range * 1.25) {
      const cd = { bolt: 650, cleave: 760, nova: 1100, lob: 1250, mend: 800 }[c.style];
      c.nextPrimaryAt = time + cd * c.cdMult;
      this.primary(c, target, ang, husks);
    }
    // Menders also keep the room topped up on their own clock.
    if (c.style === 'mend' && time >= c.nextChannelTickAt && this.someoneHurt(c, 0.85)) {
      c.nextChannelTickAt = time + 2500 * c.cdMult;
      this.mendLowest(c, 18 * c.dmgMult);
    }
  }

  private gesture(c: Companion, ang: number, g?: ArmGesture): void {
    c.attackSeq++;
    c.avatar?.play(g ?? STYLE_GESTURE[c.style], ang);
  }

  /** Co-op: what the guest needs to draw the party. */
  snapshot(): NetBotState[] {
    return this.list.map((c) => ({
      e: c.elementId, x: Math.round(c.x), y: Math.round(c.y), hp: Math.round(c.hp), mhp: c.maxHp,
      r: c.roomIndex, d: c.downed, f: Math.round(c.facingAngle * 100) / 100, a: c.attackSeq,
    }));
  }

  private primary(c: Companion, target: Husk, ang: number, husks: Husk[]): void {
    this.gesture(c, ang);
    switch (c.style) {
      case 'cleave':
        this.slash(c, ang, 72, 1.6, this.dmg(c, 14), husks);
        break;
      case 'nova':
        this.nova(c, 110, this.dmg(c, 8), husks, 0);
        break;
      case 'lob':
        this.throwBomb(c, target.x, target.y, this.dmg(c, 12), 62, false);
        break;
      default:
        this.throwOrb(c, ang, this.dmg(c, c.style === 'mend' ? 6 : 9));
        break;
    }
  }

  private secondary(c: Companion, target: Husk, ang: number, time: number): void {
    const husks = this.world.livingHusks();
    switch (c.style) {
      case 'cleave': {
        // Lunge: a line of damage straight through the target.
        this.gesture(c, ang, 'dash');
        const len = 170;
        const x2 = Phaser.Math.Clamp(c.x + Math.cos(ang) * len, 50, this.world.scene.scale.width - 50);
        const y2 = Phaser.Math.Clamp(c.y + Math.sin(ang) * len, 50, this.world.scene.scale.height - 50);
        for (const h of husks) {
          if (h.roomIndex !== c.roomIndex) continue;
          if (distToSegment(h.x, h.y, c.x, c.y, x2, y2) <= 34) h.takeForeignDamage(Math.round(this.dmg(c, 22)));
        }
        this.pushFx({ kind: 'beam', room: c.roomIndex, x: c.x, y: c.y, x2, y2, r: 14, color: c.tint, t: 0, dur: 260 });
        (c.body as Phaser.Physics.Arcade.Body).reset(x2, y2);
        break;
      }
      case 'nova':
        // A dragging pulse: hurts and slows everything near.
        this.gesture(c, ang, 'flex');
        this.nova(c, 150, this.dmg(c, 12), husks, 0.45);
        break;
      case 'lob':
        this.gesture(c, ang, 'slam');
        this.throwBomb(c, target.x, target.y, this.dmg(c, 10), 72, true);
        break;
      case 'mend':
        this.gesture(c, ang, 'raise');
        c.channelUntil = time + 4000;
        break;
      default: {
        // A fan of three.
        for (const off of [-0.22, 0, 0.22]) this.throwOrb(c, ang + off, this.dmg(c, 9));
        break;
      }
    }
  }

  private ultimate(c: Companion, target: Husk, time: number): void {
    const husks = this.world.livingHusks();
    this.gesture(c, c.facingAngle, 'raise');
    if (c.roomIndex === this.world.map.currentRoom) {
      this.world.showFloatingText(c.x, c.y - 56, `✦ ${c.element.name.toUpperCase()} ULTIMATE`, `#${c.tint.toString(16).padStart(6, '0')}`);
    }
    switch (c.style) {
      case 'cleave':
        // Whirlwind: spins for a moment, cutting everything around it.
        c.channelUntil = time + 1600;
        break;
      case 'nova':
        this.nova(c, 230, this.dmg(c, 40), husks, 0.3);
        break;
      case 'lob':
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          this.throwBomb(c, target.x + Math.cos(a) * 70, target.y + Math.sin(a) * 70, this.dmg(c, 16), 64, false);
        }
        break;
      case 'mend': {
        // Mends everyone in the room and drags the fallen back up.
        for (const f of this.friendsIn(c.roomIndex)) {
          if (f === this.world.player && this.playerDowned) this.revivePlayer(0.4);
          else if (f instanceof Companion && f.downed) this.reviveCompanion(f, 0.4);
          else f.heal(Math.round(80 * c.dmgMult));
          this.pushFx({ kind: 'plus', room: c.roomIndex, x: f.x, y: f.y, r: 30, color: 0x66ff88, t: 0, dur: 700 });
        }
        this.pushFx({ kind: 'ring', room: c.roomIndex, x: c.x, y: c.y, r: 260, color: 0x88ffaa, t: 0, dur: 600 });
        break;
      }
      default:
        for (let i = 0; i < 12; i++) this.throwOrb(c, (i / 12) * Math.PI * 2, this.dmg(c, 14));
        break;
    }
  }

  private someoneHurt(c: Companion, below: number): boolean {
    return this.friendsIn(c.roomIndex).some((f) => f.downed || f.hp < f.maxHp * below);
  }

  /** The player (when standing in that room), and every companion there, downed or not. */
  private friendsIn(room: number): Fighter[] {
    const out: Fighter[] = this.list.filter((o) => o.active && o.roomIndex === room);
    if (this.world.map.currentRoom === room) out.push(this.world.player);
    return out;
  }

  private mendLowest(c: Companion, amount: number): void {
    const hurt = this.friendsIn(c.roomIndex)
      .filter((f) => !f.downed && f.hp < f.maxHp && Phaser.Math.Distance.Between(c.x, c.y, f.x, f.y) < 300)
      .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
    if (!hurt) return;
    hurt.heal(Math.round(amount));
    this.pushFx({ kind: 'beam', room: c.roomIndex, x: c.x, y: c.y, x2: hurt.x, y2: hurt.y, r: 5, color: 0x77ff99, t: 0, dur: 380 });
    this.pushFx({ kind: 'plus', room: c.roomIndex, x: hurt.x, y: hurt.y, r: 22, color: 0x77ff99, t: 0, dur: 600 });
  }

  private slash(c: Companion, ang: number, r: number, arc: number, dmg: number, husks: Husk[]): void {
    for (const h of husks) {
      if (h.roomIndex !== c.roomIndex) continue;
      const d = Phaser.Math.Distance.Between(c.x, c.y, h.x, h.y);
      if (d > r + 18) continue;
      const da = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(h.y - c.y, h.x - c.x) - ang));
      if (da <= arc / 2 || d < 26) h.takeForeignDamage(Math.round(dmg));
    }
    this.pushFx({ kind: 'slash', room: c.roomIndex, x: c.x, y: c.y, r, a: ang, color: c.tint, t: 0, dur: 220 });
    if (c.roomIndex === this.world.map.currentRoom) Sfx.play('slash', { volume: 0.35 });
  }

  private nova(c: Companion, r: number, dmg: number, husks: Husk[], slow: number): void {
    for (const h of husks) {
      if (h.roomIndex !== c.roomIndex) continue;
      if (Phaser.Math.Distance.Between(c.x, c.y, h.x, h.y) > r) continue;
      h.takeForeignDamage(Math.round(dmg));
      if (slow > 0) {
        h.effectSpeedMult = Math.min(h.effectSpeedMult, 1 - slow);
        h.effectHasteUntil = this.world.scene.time.now + 2000;
      }
    }
    this.pushFx({ kind: 'ring', room: c.roomIndex, x: c.x, y: c.y, r, color: c.tint, t: 0, dur: 360 });
  }

  private throwOrb(c: Companion, ang: number, dmg: number): void {
    const speed = 430;
    this.shots.push({
      kind: 'orb', room: c.roomIndex, x: c.x, y: c.y,
      vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed,
      sx: c.x, sy: c.y, tx: 0, ty: 0, t: 0, dur: 1100,
      dmg, radius: 7, color: c.tint,
    });
  }

  private throwBomb(c: Companion, tx: number, ty: number, dmg: number, radius: number, pool: boolean): void {
    const dist = Phaser.Math.Distance.Between(c.x, c.y, tx, ty);
    this.shots.push({
      kind: 'bomb', room: c.roomIndex, x: c.x, y: c.y, vx: 0, vy: 0,
      sx: c.x, sy: c.y, tx, ty, t: 0, dur: 380 + dist * 0.9,
      dmg, radius, color: c.tint, pool,
    });
  }

  private pushFx(f: CFx): void {
    this.fx.push(f);
  }

  // ── Revives ───────────────────────────────────────────────────────

  private tickRevives(delta: number, time: number, view: number): void {
    const p = this.world.player;
    let hint = '';

    // The player picking up a downed bot.
    if (!this.playerDowned) {
      const fallen = this.list.find((c) => c.downed && c.roomIndex === view
        && Phaser.Math.Distance.Between(p.x, p.y, c.x, c.y) <= REVIVE_RADIUS);
      for (const c of this.list) if (c !== fallen && c.downed && !this.botReviverNear(c)) c.reviveProgress = 0;
      if (fallen) {
        fallen.reviveProgress += delta;
        hint = `REVIVING ${fallen.element.name.toUpperCase()}… ${Math.min(100, Math.round((fallen.reviveProgress / PLAYER_REVIVE_MS) * 100))}%`;
        if (fallen.reviveProgress >= PLAYER_REVIVE_MS) this.reviveCompanion(fallen, 0.5);
      }
    }

    // Bots picking each other up; nobody comes, and the plinth does it.
    for (const c of this.list) {
      if (!c.downed) continue;
      if (this.botReviverNear(c)) {
        c.reviveProgress += delta;
        if (c.reviveProgress >= BOT_REVIVE_MS) { this.reviveCompanion(c, 0.5); continue; }
      }
      if (time - c.downedAt >= BOT_RESPAWN_MS) this.respawnCompanionAtPlinth(c, view);
    }

    // Bots picking the player up; otherwise the plinth stands them back up.
    if (this.playerDowned) {
      const helper = this.list.find((c) => !c.downed && c.roomIndex === view
        && Phaser.Math.Distance.Between(p.x, p.y, c.x, c.y) <= REVIVE_RADIUS);
      if (helper) this.playerReviveProgress += delta;
      else this.playerReviveProgress = Math.max(0, this.playerReviveProgress - delta * 0.5);
      const left = Math.max(0, PLAYER_RESPAWN_MS - (time - this.playerDownedAt));
      this.downedLabel?.setVisible(true).setText(helper
        ? `DOWNED — ${helper.element.name.toUpperCase()} IS PICKING YOU UP… ${Math.min(100, Math.round((this.playerReviveProgress / BOT_REVIVE_MS) * 100))}%`
        : `DOWNED — back on your feet at the plinth in ${Math.ceil(left / 1000)}s`);
      if (this.playerReviveProgress >= BOT_REVIVE_MS) {
        this.revivePlayer(0.5);
      } else if (left <= 0) {
        this.respawnAtPlinth();
      }
    }
    this.reviveHint?.setText(hint);
  }

  private botReviverNear(c: Companion): boolean {
    return this.list.some((o) => o !== c && !o.downed && o.roomIndex === c.roomIndex
      && Phaser.Math.Distance.Between(o.x, o.y, c.x, c.y) <= REVIVE_RADIUS);
  }

  /**
   * Nobody came. The All-Element stands its defender back up beside it — on
   * Main Street, which means a walk back out to whatever lane you fell in.
   */
  private respawnAtPlinth(): void {
    const map = this.world.map;
    const p = this.world.player;
    const at = map.allElementPos();
    if (map.currentRoom !== CITY_MAIN) map.jumpTo(CITY_MAIN);
    (p.body as Phaser.Physics.Arcade.Body | null)?.reset(at.x, at.y + 90);
    this.revivePlayer(0.6);
  }

  /** A bot down for BOT_RESPAWN_MS gets back up beside the All-Element. */
  private respawnCompanionAtPlinth(c: Companion, view: number): void {
    const at = this.world.map.allElementPos();
    c.roomIndex = CITY_MAIN;
    (c.body as Phaser.Physics.Arcade.Body | null)?.reset(at.x + Phaser.Math.Between(-60, 60), at.y + 90);
    const seen = c.visible;
    this.reviveCompanion(c, 0.6);
    if (!seen && view === CITY_MAIN) this.world.showFloatingText(c.x, c.y - 40, `${c.element.name.toUpperCase()} IS BACK`, '#66ff88');
  }

  // ── Painting ──────────────────────────────────────────────────────

  private paintCompanion(c: Companion, view: number, delta: number, time: number): void {
    const visible = c.roomIndex === view;
    c.setVisible(visible);
    c.setHealthBarVisible(visible);
    c.nameTag.setVisible(visible).setPosition(c.x, c.y - 44);
    const tag = companionTag(c, time);
    if (c.nameTag.text !== tag) c.nameTag.setText(tag);
    if (c.bodyless) c.setAlpha(0);
    else c.setAlpha(c.downed ? 0.5 : 1);

    // Channels: the whirlwind cuts, the mend aura heals.
    if (!c.downed && time < c.channelUntil && time >= c.nextChannelTickAt) {
      c.nextChannelTickAt = time + 250;
      if (c.style === 'cleave') {
        for (const h of this.world.livingHusks()) {
          if (h.roomIndex === c.roomIndex && Phaser.Math.Distance.Between(c.x, c.y, h.x, h.y) <= 95) {
            h.takeForeignDamage(Math.round(this.dmg(c, 6)));
          }
        }
        this.pushFx({ kind: 'ring', room: c.roomIndex, x: c.x, y: c.y, r: 95, color: c.tint, t: 0, dur: 240 });
      } else if (c.style === 'mend') {
        for (const f of this.friendsIn(c.roomIndex)) {
          if (!f.downed && Phaser.Math.Distance.Between(c.x, c.y, f.x, f.y) <= 150) f.heal(Math.max(1, Math.round(1.5 * c.dmgMult)));
        }
        this.pushFx({ kind: 'ring', room: c.roomIndex, x: c.x, y: c.y, r: 150, color: 0x66ff88, t: 0, dur: 260 });
      }
    }

    const a = c.avatar;
    if (!a) return;
    a.setFacing(c.facingAngle);
    a.update(delta, c.x, c.y, visible ? (c.downed ? 0.45 : 1) : 0);
  }

  private updateShots(delta: number, husks: Husk[], view: number): void {
    const dt = delta / 1000;
    const W = this.world.scene.scale.width, H = this.world.scene.scale.height;
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i];
      s.t += delta;
      let done = s.t >= s.dur;
      if (s.kind === 'orb') {
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        if (s.x < 0 || s.x > W || s.y < 0 || s.y > H) done = true;
        if (!done) {
          for (const h of husks) {
            if (h.roomIndex !== s.room) continue;
            if (Phaser.Math.Distance.Between(s.x, s.y, h.x, h.y) <= 20 * h.sizeMult + s.radius) {
              h.takeForeignDamage(Math.round(s.dmg));
              this.pushFx({ kind: 'burst', room: s.room, x: s.x, y: s.y, r: 16, color: s.color, t: 0, dur: 200 });
              done = true;
              break;
            }
          }
        }
      } else {
        const k = Math.min(1, s.t / s.dur);
        s.x = Phaser.Math.Linear(s.sx, s.tx, k);
        s.y = Phaser.Math.Linear(s.sy, s.ty, k);
        if (k >= 1) {
          for (const h of husks) {
            if (h.roomIndex === s.room && Phaser.Math.Distance.Between(s.tx, s.ty, h.x, h.y) <= s.radius + 14) {
              h.takeForeignDamage(Math.round(s.dmg));
            }
          }
          this.pushFx({ kind: 'burst', room: s.room, x: s.tx, y: s.ty, r: s.radius, color: s.color, t: 0, dur: 320 });
          if (s.pool) {
            this.pushFx({ kind: 'pool', room: s.room, x: s.tx, y: s.ty, r: s.radius, color: s.color, t: 0, dur: 4000, dps: s.dmg * 0.4 });
          }
          if (s.room === view) Sfx.play('explosion-small', { volume: 0.25 });
          done = true;
        }
      }
      if (done) this.shots.splice(i, 1);
    }
  }

  private updateFx(delta: number, husks: Husk[], view: number): void {
    const g = this.fxG;
    if (!g) return;
    g.clear();
    for (let i = this.fx.length - 1; i >= 0; i--) {
      const f = this.fx[i];
      const prevT = f.t;
      f.t += delta;
      // Pools tick once a second (on each whole-second boundary they cross).
      if (f.kind === 'pool' && f.dps && Math.floor(f.t / 1000) > Math.floor(prevT / 1000)) {
        for (const h of husks) {
          if (h.roomIndex === f.room && Phaser.Math.Distance.Between(f.x, f.y, h.x, h.y) <= f.r) {
            h.takeForeignDamage(Math.max(1, Math.round(f.dps)));
          }
        }
      }
      if (f.t >= f.dur) { this.fx.splice(i, 1); continue; }
      if (f.room !== view) continue;
      this.paintFx(g, f);
    }
    // Shots in flight.
    for (const s of this.shots) {
      if (s.room !== view) continue;
      if (s.kind === 'orb') {
        const a = Math.atan2(s.vy, s.vx);
        g.fillStyle(s.color, 0.3);
        g.fillCircle(s.x - Math.cos(a) * 9, s.y - Math.sin(a) * 9, s.radius * 0.8);
        g.fillStyle(s.color, 0.18);
        g.fillCircle(s.x - Math.cos(a) * 17, s.y - Math.sin(a) * 17, s.radius * 0.6);
        g.fillStyle(s.color, 1);
        g.fillCircle(s.x, s.y, s.radius);
        g.fillStyle(0xffffff, 0.85);
        g.fillCircle(s.x - 2, s.y - 2, s.radius * 0.4);
      } else {
        const k = Math.min(1, s.t / s.dur);
        const lift = Math.sin(k * Math.PI) * 70;
        // Shadow on the ground, the bomb above it on an arc.
        g.fillStyle(0x000000, 0.3);
        g.fillEllipse(s.x, s.y, 16, 7);
        g.fillStyle(s.color, 1);
        g.fillCircle(s.x, s.y - lift, 8);
        g.lineStyle(2, 0x000000, 0.6);
        g.strokeCircle(s.x, s.y - lift, 8);
        g.fillStyle(0xffffff, 0.7);
        g.fillCircle(s.x - 3, s.y - lift - 3, 2.5);
        // Landing marker.
        g.lineStyle(1, s.color, 0.5);
        g.strokeCircle(s.tx, s.ty, s.radius * (0.4 + k * 0.6));
      }
    }
  }

  private paintFx(g: Phaser.GameObjects.Graphics, f: CFx): void {
    const k = f.t / f.dur;
    switch (f.kind) {
      case 'slash': {
        const a = f.a ?? 0;
        g.fillStyle(f.color, 0.45 * (1 - k));
        g.slice(f.x, f.y, f.r, a - 0.8, a + 0.8, false);
        g.fillPath();
        g.lineStyle(3, 0xffffff, 0.8 * (1 - k));
        g.beginPath();
        g.arc(f.x, f.y, f.r * (0.8 + k * 0.2), a - 0.8 + k * 0.4, a + 0.8);
        g.strokePath();
        break;
      }
      case 'ring':
        g.lineStyle(4, f.color, 0.8 * (1 - k));
        g.strokeCircle(f.x, f.y, f.r * (0.3 + k * 0.7));
        g.fillStyle(f.color, 0.12 * (1 - k));
        g.fillCircle(f.x, f.y, f.r * (0.3 + k * 0.7));
        break;
      case 'beam':
        g.lineStyle(f.r, f.color, 0.7 * (1 - k));
        g.lineBetween(f.x, f.y, f.x2 ?? f.x, f.y2 ?? f.y);
        g.lineStyle(Math.max(1, f.r * 0.35), 0xffffff, 0.8 * (1 - k));
        g.lineBetween(f.x, f.y, f.x2 ?? f.x, f.y2 ?? f.y);
        break;
      case 'burst':
        g.fillStyle(f.color, 0.55 * (1 - k));
        g.fillCircle(f.x, f.y, f.r * (0.4 + k * 0.6));
        g.lineStyle(2, 0xffffff, 0.6 * (1 - k));
        g.strokeCircle(f.x, f.y, f.r * (0.5 + k * 0.5));
        break;
      case 'pool': {
        const fade = k > 0.8 ? (1 - k) / 0.2 : 1;
        g.fillStyle(f.color, 0.28 * fade);
        g.fillEllipse(f.x, f.y, f.r * 2, f.r * 1.3);
        g.lineStyle(2, f.color, 0.6 * fade);
        g.strokeEllipse(f.x, f.y, f.r * 2, f.r * 1.3);
        // Bubbles.
        for (let b = 0; b < 4; b++) {
          const bx = f.x + Math.cos(b * 1.7 + f.t / 300) * f.r * 0.5;
          const by = f.y + Math.sin(b * 2.3 + f.t / 260) * f.r * 0.3;
          g.fillStyle(0xffffff, 0.25 * fade);
          g.fillCircle(bx, by, 2.5);
        }
        break;
      }
      case 'plus': {
        const y = f.y - 20 - k * 26;
        g.fillStyle(f.color, 1 - k);
        g.fillRect(f.x - 2, y - 7, 4, 14);
        g.fillRect(f.x - 7, y - 2, 14, 4);
        break;
      }
    }
  }
}

function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy || 1;
  const t = Phaser.Math.Clamp(((px - x1) * dx + (py - y1) * dy) / len2, 0, 1);
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}
