import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { Husk } from '../Husk';
import { Sfx } from '../../audio';
import { HUSK_FAMILIES, CATEGORIES_BY_DIFFICULTY, HuskVariantDef, BOSS_VARIANTS, bossTierForWave } from '../HuskVariants';
import { CityMap, CITY_MAIN, CITY_GREEN, CITY_LANES, CITY_META } from './CityMap';
import { AllElement } from './AllElement';
import { CompanionKit, CompanionBoon } from './Companions';
import { CityMutations } from './CityMutations';
import { CityLoadoutApi, DraftCard, DraftOverlay, rollDraft, mutationName } from './CityDraft';
import { ALT_ULT_SLOT } from '../../data/AltUlts';
import { CityHud } from './CityHud';
import { CityDream } from './CityDream';
import { CityRelics } from './CityRelics';
import type { FoeShot } from '../../elements/kits/ArtifactsKit';
import { getItem } from '../../data/Items';
import { getArtifact } from '../../data/Artifacts';
import type { NetCityState } from '../../network/NetworkManager';

/** Waves until the city is saved; after that the night simply goes on. */
export const CITY_FINAL_WAVE = 20;
/** Elemental husk families a single run draws from. */
const POOL_SIZE = 10;
/** How close to a gate a marching husk must get before it steps through. */
const GATE_STEP = 34;

const BANNER_FONT = '"Arial Black", "Segoe UI Black", Impact, sans-serif';

/** The banner for a wave rising out of `lanes`. Shared with the co-op guest. */
export function cityWarningText(wave: number, lanes: number[]): string {
  const names = lanes.map((l) => CITY_META[l].name);
  const where = names.length === 3 ? 'ALL THREE GATES'
    : names.length === 2 ? `THE ${names[0]} AND THE ${names[1]}`
      : `THE ${names[0] ?? 'GATES'}`;
  return `WAVE ${wave}  —  THEY'RE RISING IN ${where}!`;
}

/** The wave label's "where": every lane this wave is coming out of. */
export function cityLaneLabel(lanes: number[]): string | undefined {
  if (lanes.length === 0) return undefined;
  return lanes.map((l) => `${CITY_META[l].emoji} ${CITY_META[l].name}`).join(' + ');
}

/** What the director needs from InvasionKit. */
export interface CityHost {
  readonly scene: Phaser.Scene;
  readonly player: Fighter;
  livingHusks(): Husk[];
  /** Show or hide one husk to match the room the local player is looking at. */
  syncHuskVisibility(husk: Husk): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  /** Ends the run (banks the shards, results screen). */
  endRun(): void;
  /** The run is already over — the director should stop reacting. */
  readonly ending: boolean;
  markEnding(): void;
  /** The local player's element — bots never wear it. */
  readonly elementId: string;
  /** Current wave number, for the bots' damage ramp. */
  readonly wave: number;
  /** The local player's drafted loadout (null if the arena has none to offer). */
  readonly loadout: CityLoadoutApi | null;
  latchPointer(): void;
  /** The arena's projectile group (the player's shots), for the projectile artifacts. */
  readonly projectiles: Phaser.Physics.Arcade.Group | null;
  /** The husk shots in flight in `room`. */
  huskShots(room: number): FoeShot[];
}

export interface CityRunOptions {
  /** Defenders, humans and bots together: 2–4. */
  partySize: number;
  /** Humans among them (2 in co-op). Bots fill the rest. */
  humans?: number;
}

/**
 * City invasion's rules, layered on InvasionKit's wave engine. The kit still
 * owns spawning, husk AI, shots and effects; the director owns what makes the
 * city a different game from the mansion:
 *
 *  - the All-Element on Main Street, the only thing that can lose you the run;
 *  - lanes: husks rise from a lane's rift, walk to its gate, step through onto
 *    Main Street and go for the All-Element;
 *  - the run's husk pool (ten elemental families, rolled at the start);
 *  - which lanes each wave pours out of, boss waves every fifth, and the
 *    twentieth wave that saves the city before the endless night.
 */
export class CityDirector {
  private core: AllElement | null = null;
  private pool = new Set<string>();
  private lanes: number[] = [];
  private laneCursor = 0;
  private partySize = 2;
  private savedBannerShown = false;
  private wasDowned = false;
  /** The bots filling the party's empty slots. */
  readonly companions: CompanionKit;
  /** Mutations the local player has drafted onto themselves. */
  readonly mutations: CityMutations;
  private draft: DraftOverlay;
  /** Seals over the R/F/Q cards that haven't been drafted yet, and the curse strip. */
  private hud: CityHud | null = null;
  /** The All-Element talking in its sleep. */
  private dream: CityDream | null = null;
  /** The opening lines are still up — the first wave waits on them. */
  private introPending = false;
  /** Campaign items + Vault artifacts the local player has drafted (the late table). */
  readonly relics: CityRelics;
  private coop = false;

  constructor(private host: CityHost, readonly map: CityMap) {
    const dir = this;
    this.companions = new CompanionKit({
      get scene() { return host.scene; },
      get map() { return map; },
      get player() { return host.player; },
      get core() { return dir.core; },
      get elementId() { return host.elementId; },
      get wave() { return host.wave; },
      livingHusks: () => host.livingHusks(),
      showFloatingText: (x, y, t, c) => host.showFloatingText(x, y, t, c),
    });
    this.draft = new DraftOverlay(host.scene, () => host.latchPointer());
    this.mutations = new CityMutations({
      get scene() { return host.scene; },
      get player() { return host.player; },
      currentRoom: () => map.currentRoom,
      livingHusks: () => host.livingHusks(),
      showFloatingText: (x, y, t, c) => host.showFloatingText(x, y, t, c),
      authoritative: true,
    });
    this.relics = new CityRelics({
      get scene() { return host.scene; },
      get player() { return host.player; },
      get projectiles() { return host.projectiles; },
      foes: () => host.livingHusks().filter((h) => h.roomIndex === map.currentRoom),
      foeShots: () => host.huskShots(map.currentRoom),
      showFloatingText: (x, y, t, c) => host.showFloatingText(x, y, t, c),
      authoritative: true,
      get coop() { return dir.coop; },
    });
  }

  get allElement(): AllElement | null { return this.core; }
  get party(): number { return this.partySize; }
  /** The run's ten families, by element id — the lightning may brand only these. */
  get huskPool(): Set<string> { return this.pool; }

  reset(difficultyId: string, opts: CityRunOptions): void {
    this.partySize = Phaser.Math.Clamp(Math.round(opts.partySize), 2, 4);
    this.lanes = [];
    this.laneCursor = 0;
    this.savedBannerShown = false;
    this.pool = this.rollPool(difficultyId);

    this.core?.destroy();
    const at = this.map.allElementPos();
    this.core = new AllElement(this.host.scene, at.x, at.y);
    const humans = Phaser.Math.Clamp(opts.humans ?? 1, 1, 2);
    this.coop = humans === 2;
    this.companions.reset(this.partySize - humans, humans === 1);
    this.mutations.reset();
    this.relics.reset();
    this.draft.close();
    this.buildHud();
    this.dream?.destroy();
    this.dream = new CityDream(this.host.scene, this.host.elementId, (open) => { if (!open) this.host.latchPointer(); });
    this.introPending = true;
    void this.dream.intro().then(() => { this.introPending = false; });
  }

  /** True until the opening dialogue is dismissed. */
  get waitingOnIntro(): boolean { return this.introPending; }
  get isDialogueOpen(): boolean { return !!this.dream?.isOpen; }

  private buildHud(): void {
    this.hud?.destroy();
    this.hud = new CityHud(this.host.scene);
  }

  get isDraftOpen(): boolean { return this.draft.isOpen; }

  // ── The draft ─────────────────────────────────────────────────────

  /** Wave cleared: the bots pick first (it's quick), then the table goes up. */
  beginDraft(wave: number, done: () => void): void {
    const loadout = this.host.loadout;
    const notes = this.botsDraft();
    if (!loadout) { done(); return; }
    const cards = rollDraft({
      loadout,
      mutationTaken: (id) => this.mutations.has(id),
      mutationStarred: (id) => this.mutations.isStarred(id),
      relics: this.relics,
    });
    if (cards.length === 0) { done(); return; }
    void this.draft.open(cards, wave, notes).then((card) => {
      this.applyCard(card, loadout);
      done();
    });
  }

  /** Every bot takes a card from the same kinds of thing the host has unlocked — for a bot, a move or a stat. */
  private botsDraft(): string[] {
    const notes: string[] = [];
    for (const c of this.companions.list) {
      const roll = Math.random();
      const boon: CompanionBoon = c.tier < 3 && roll < 0.45 ? 'move'
        : roll < 0.7 ? 'damage' : roll < 0.85 ? 'haste' : 'vigor';
      notes.push(`🤖 ${c.element.name}: ${this.companions.grant(c, boon)}`);
    }
    return notes;
  }

  private applyCard(card: DraftCard, loadout: CityLoadoutApi): void {
    const p = this.host.player;
    const say = (t: string, c = '#ffe9a8'): void => this.host.showFloatingText(p.x, p.y - 60, t, c);
    switch (card.kind) {
      case 'ability':
        loadout.unlockKey(card.id);
        say(`🔓 ${card.title} UNLOCKED`, '#88ddff');
        break;
      case 'upgrade':
        loadout.addUpgrade(card.id);
        say(`⬆️ ${card.title}`, '#ffd46a');
        break;
      case 'perk':
        loadout.addPerk(card.id);
        say(`${card.emoji} ${card.title}`, '#88ee99');
        break;
      case 'mastery':
        loadout.enableMastery();
        say(`👑 ${card.title}`, '#ffaa00');
        break;
      case 'alt-ult':
        loadout.addUpgrade(ALT_ULT_SLOT);
        say(`${card.emoji} ${card.title}`, '#c9a0ff');
        break;
      case 'mutation': {
        const starred = this.mutations.take(card.id);
        say(`🧬 ${starred ? '★ ' : ''}${mutationName(card.id).toUpperCase()} — YOU MUTATE`, '#ff7788');
        break;
      }
      case 'item':
        this.relics.takeItem(card.id);
        say(`${card.emoji} ${card.title.toUpperCase()}`, '#ffd46a');
        break;
      case 'artifact':
        this.relics.takeArtifact(card.id);
        say(`${card.emoji} ${card.title.toUpperCase()}`, '#c9a0ff');
        break;
      default:
        if (card.id === 'vigor') { p.increaseMaxHp(60); p.heal(p.maxHp); }
        else this.applyShared('boon', card.id);
        say(`${card.emoji} ${card.title}`);
        break;
    }
  }

  /**
   * The half of a boon that lands on the shared world rather than on one player:
   * a mended All-Element, drilled bots. The co-op guest's picks arrive here too.
   */
  applyShared(kind: string, id: string): void {
    if (kind !== 'boon') return;
    if (id === 'mend-core') this.core?.heal(120);
    else if (id === 'drill') for (const c of this.companions.list) c.dmgMult *= 1.2;
  }

  /** Co-op: the guest kept a card. Only the shared half is ours to apply; a mutation is theirs alone. */
  applyRemotePick(kind: string, id: string): void {
    if (kind === 'boon') this.applyShared(kind, id);
    if (kind === 'mutation') {
      const p = this.host.player;
      this.host.showFloatingText(p.x, p.y - 76, `ALLY MUTATES: ${mutationName(id).toUpperCase()}`, '#ff7788');
    }
    // An item or artifact is the guest's own, run on the guest's sim — only the news reaches us.
    if (kind === 'item' || kind === 'artifact') {
      const def = kind === 'item' ? getItem(id) : getArtifact(id);
      const p = this.host.player;
      if (def) this.host.showFloatingText(p.x, p.y - 76, `ALLY TAKES ${def.emoji} ${def.name.toUpperCase()}`, '#ffd46a');
    }
  }

  /** Co-op snapshot of everything the guest draws but cannot simulate. */
  netState(): NetCityState {
    return {
      hp: Math.round(this.core?.hp ?? 0),
      mhp: this.core?.maxHp ?? 0,
      ln: [...this.lanes],
      b: this.companions.snapshot(),
      cu: this.mutations.active.map(({ id, starred }) => (starred ? `*${id}` : id)),
    };
  }

  get currentLanes(): number[] { return [...this.lanes]; }

  // ── Mutations ─────────────────────────────────────────────────────

  /** A hit from the local player landed (bot and relayed hits are filtered out by the caller). */
  onHuskHit(h: Husk, amount: number): void {
    this.mutations.onHuskHit(h, amount);
    this.relics.onHitDealt(h, amount);
  }
  /** Walk speed from the player's mutations, items and artifacts, pulled by InvasionKit. */
  playerSpeedMult(): number { return this.mutations.speedMult() * this.relics.speedMult; }
  /** A new wave is under way (opening invincibility from items). */
  onWaveBegan(): void { this.relics.onWaveBegan(); }

  get isPlayerDowned(): boolean { return this.companions.isPlayerDowned; }

  destroy(): void {
    this.draft.close();
    this.hud?.destroy();
    this.hud = null;
    this.dream?.destroy();
    this.dream = null;
    this.mutations.destroy();
    this.relics.destroy();
    this.companions.destroyAll();
    this.core?.destroy();
    this.core = null;
    this.map.destroyHud();
  }

  /**
   * Ten families out of whatever this difficulty lets the lightning carry —
   * NORMAL picks ten of the fifteen ordinary elements, the harder settings mix
   * the abstract and corrupt ones in. Every run meets a different crowd.
   */
  private rollPool(difficultyId: string): Set<string> {
    const allowed = new Set(CATEGORIES_BY_DIFFICULTY[difficultyId] ?? ['normal']);
    const candidates = HUSK_FAMILIES.filter((f) => allowed.has(f.category)).map((f) => f.elementId);
    Phaser.Utils.Array.Shuffle(candidates);
    return new Set(candidates.slice(0, POOL_SIZE));
  }

  // ── Waves ─────────────────────────────────────────────────────────

  /** Boss every fifth wave — the city has four defenders, not one. */
  isBossWave(wave: number): boolean {
    return wave > 0 && wave % 5 === 0;
  }

  rollBoss(wave: number): HuskVariantDef {
    // Tier by wave, but a wave-5 boss is still a first-tier one.
    const tier = bossTierForWave(Math.max(10, wave * 2 - 10));
    const pool = BOSS_VARIANTS.filter((v) => v.tier === tier);
    return pool[Math.floor(Math.random() * pool.length)] ?? BOSS_VARIANTS[0];
  }

  /** More defenders, more husks — but a bot is not quite a whole player. */
  spawnMultiplier(): number {
    return 0.6 + 0.4 * this.partySize;
  }

  /**
   * Which lanes wave `wave` comes out of. The first two waves use one lane.
   * From wave 3 every wave splits across at least two, from wave 7 all three
   * become more and more likely, and from wave 14 every wave comes from all three.
   */
  pickLanes(wave: number): number[] {
    const shuffled = Phaser.Utils.Array.Shuffle([...CITY_LANES]);
    let n = 1;
    if (wave >= 3) n = 2;
    if (wave >= 14 || (wave >= 7 && Math.random() < 0.35 + (wave - 7) * 0.1)) n = 3;
    // Wave one always comes up the green lane: it is the one you can see
    // straight down from the All-Element.
    if (wave === 1) return [CITY_GREEN];
    return shuffled.slice(0, n);
  }

  setLanes(lanes: number[]): void {
    this.lanes = [...lanes];
    this.laneCursor = 0;
    this.map.setTargets(lanes);
  }

  clearLanes(): void {
    this.lanes = [];
    this.map.setTargets([]);
  }

  /** Round-robin across this wave's lanes, so none is the quiet one. */
  nextSpawnLane(): number {
    if (this.lanes.length === 0) return -1;
    const lane = this.lanes[this.laneCursor % this.lanes.length];
    this.laneCursor++;
    return lane;
  }

  laneLabel(): string | undefined {
    return cityLaneLabel(this.lanes);
  }

  /** The warning banner for a fresh wave. */
  warningText(wave: number): string {
    return cityWarningText(wave, this.lanes);
  }

  /** Wave-clear bookkeeping. Returns bonus shards on top of the usual pay. */
  onWaveCleared(wave: number): number {
    this.companions.onWaveCleared();
    // Items refill what they spend (shields, dodge, revive) every wave held.
    this.relics.onWaveCleared();
    this.dream?.onWaveHeld(wave);
    if (wave === CITY_FINAL_WAVE && !this.savedBannerShown) this.dream?.saved();
    if (wave === CITY_FINAL_WAVE && !this.savedBannerShown) {
      this.savedBannerShown = true;
      this.banner('✦ THE CITY HOLDS ✦', '#fff4c0', 'The night does not end. Hold as long as you can.');
      Sfx.play('victory');
      return 150;
    }
    return 0;
  }

  // ── Targets and damage ────────────────────────────────────────────

  /** What, besides the players, a husk standing in `room` can go for. */
  extraTargets(room: number): Fighter[] {
    const bots = this.companions.inRoom(room);
    if (room === CITY_MAIN && this.core && this.core.active && this.core.hp > 0) return [...bots, this.core];
    return bots;
  }

  /** The director takes hits on everything it owns; the kit handles the rest. */
  owns(target: Fighter): boolean {
    return target === this.core || this.companions.owns(target);
  }

  damage(target: Fighter, amount: number): void {
    if (this.host.ending) return;
    if (target !== this.core) {
      target.takeDamage(amount);
      return;
    }
    target.takeDamage(amount);
    if (this.map.currentRoom === CITY_MAIN) {
      this.host.showFloatingText(target.x + Phaser.Math.Between(-30, 30), target.y - 60, `-${Math.round(amount)}`, '#ff6677');
    }
  }

  // ── Per frame ─────────────────────────────────────────────────────

  update(time: number, delta: number, alive: Husk[]): void {
    const core = this.core;
    if (!core) return;
    core.draw(time, this.map.currentRoom === CITY_MAIN);
    this.paintHud();
    if (this.host.ending) return;
    this.companions.update(time, delta);
    this.dream?.onHealth(core.hp / core.maxHp);
    if (this.companions.isPlayerDowned && !this.wasDowned) this.dream?.downed();
    this.wasDowned = this.companions.isPlayerDowned;
    this.mutations.update(time, delta);
    this.relics.update(delta);

    // The lanes empty onto Main Street. Anything in a lane with nobody to bite
    // walks to its gate and steps through; anything on Main Street goes for the
    // All-Element (it is in their target list there, so marchTo is a fallback
    // for when something — stealth, a decoy — hides it).
    for (const h of alive) {
      if (h.roomIndex === CITY_MAIN) {
        h.marchTo = { x: core.x, y: core.y };
        continue;
      }
      const exit = this.map.laneExit(h.roomIndex);
      h.marchTo = exit;
      if (Phaser.Math.Distance.Between(h.x, h.y, exit.x, exit.y) > GATE_STEP) continue;
      if (h.possessing) continue;   // a rider moves with its host
      const lane = h.roomIndex;
      const arrive = this.map.mainArrival(lane);
      h.roomIndex = CITY_MAIN;
      (h.body as Phaser.Physics.Arcade.Body | null)?.reset(
        arrive.x + Phaser.Math.Between(-18, 18), arrive.y + Phaser.Math.Between(-18, 18));
      // Its rider comes through with it.
      for (const other of alive) if (other.possessing === h) other.roomIndex = CITY_MAIN;
      this.host.syncHuskVisibility(h);
    }

    if (core.hp <= 0) this.onAllElementFallen();
  }

  private paintHud(): void {
    this.hud?.paint(this.host.loadout, this.host.player.element.abilities, this.mutations.active);
  }

  private onAllElementFallen(): void {
    if (this.host.ending) return;
    this.host.markEnding();
    const scene = this.host.scene;
    Sfx.play('boss-phase');
    scene.cameras.main.shake(700, 0.01);
    scene.cameras.main.flash(500, 255, 255, 255);
    this.banner('✦ THE ALL-ELEMENT HAS FALLEN ✦', '#ff6655', this.dream?.fallenLine ?? 'The dream is over.');
    scene.time.delayedCall(2600, () => this.host.endRun());
  }

  private banner(title: string, colorHex: string, sub?: string): void {
    const scene = this.host.scene;
    const { width, height } = scene.scale;
    const t = scene.add.text(width / 2, height / 2 - 50, title, {
      fontSize: '34px', fontFamily: BANNER_FONT, color: colorHex, stroke: '#000000', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(41);
    const s = sub ? scene.add.text(width / 2, height / 2 - 8, sub, {
      fontSize: '16px', fontFamily: BANNER_FONT, color: '#ffffff', stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(41) : null;
    scene.tweens.add({
      targets: s ? [t, s] : t, alpha: 0, delay: 2200, duration: 600,
      onComplete: () => { t.destroy(); s?.destroy(); },
    });
  }
}
