import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import type { CustomStatus } from './StatusHudKit';
import { Sfx } from '../../audio';
import { FONT_DISPLAY } from '../../ui/Theme';
import { QuantumLoadout, QuantumSixth, QuantumSlot, loadoutElements } from '../../data/QuantumLoadout';
import { QuantumAvatar } from './QuantumAvatar';

type Owner = 'player' | 'npc';

/** Which key the player last routed through: one of the five slots, or `'x6'` for the mastery's sixth key (G). */
export type QuantumLiveSlot = QuantumSlot | 'x6';

// ── Instability ──────────────────────────────────────────────────────────────
/** One point of vulnerability per hit taken, regardless of how big the hit was. */
const INSTABILITY_PER_HIT = 1;
/** The ceiling. At 50 the fighter takes half again as much of everything. */
const INSTABILITY_MAX = 50;
/** Milliseconds to shed a single point. */
const INSTABILITY_DECAY_MS = 2000;
/** At or above this the status box turns red — a warning that hits are landing much harder. */
const INSTABILITY_WARN = 40;

// ── Collapse (the swap itself) ───────────────────────────────────────────────
/** How long the collapse ring is on screen. Cosmetic only — the swap itself is instant. */
const COLLAPSE_MS = 380;
const COLLAPSE_R = 76;

// ── NPC rotation ─────────────────────────────────────────────────────────────
/**
 * How often an npc Quantum rotates onto its next element, by difficulty (1–5). Easy barely
 * leaves its first element; Nightmare rotates fast enough that every kit it carries is live.
 */
const NPC_SWAP_PERIOD_MS = [16000, 13000, 10000, 7500, 5500];
/** Random slack either side of the period, so two Quantum npcs never swap in lockstep. */
const NPC_SWAP_JITTER_MS = 2500;
/** Below this HP fraction the npc spends its one out-of-rhythm swap. */
const NPC_PANIC_HP = 0.45;

/** Colour of the loadout readout and the shift ring. Matches `quantumElement.color`. */
const Q_CYAN = 0x7df9ff;

/** HUD geometry. Depth 21–23 is the arena's tray band — see `ArenaScene.createHUD`. */
const HUD_DEPTH = 23;
/** Per element carried, so the plate grows with the loadout rather than cramping. */
const HUD_SLOT_W = 86;
const HUD_H = 40;

/** The one body texture a Quantum wears, whatever element is live — see `QuantumAvatar`. */
const BODY_TEXTURE = 'quantum-body';
/** Ability index on the live element (Click, E, R, F, Q) -> the rig's cast gesture. */
const CAST_GESTURES = ['punch', 'dash', 'sweep', 'clap', 'raise'] as const;

/**
 * The per-frame tick for whichever half is *not* currently being played. Keyed by element id
 * and supplied by ArenaScene, which is the only place that holds every kit. Advancing the
 * dormant half is what keeps a Fire pool burning while its owner is off being Water; the
 * functions themselves are responsible for leaving that half's rig and HUD torn down.
 */
export type DormantTicks = Record<string, (time: number, delta: number) => void>;

export interface QuantumArenaApi {
  get scene(): Phaser.Scene;
  get player(): Fighter;
  get npc(): Fighter;
  get width(): number;
  get height(): number;
  /** The half currently being played — already re-keyed, so this is never `'quantum'`. */
  get elementId(): string;
  get npcElementId(): string;
  /** The live pointer, for the player rig's aim. */
  get pointer(): Phaser.Input.Pointer;
  /** True when the *player* picked Quantum (as opposed to the npc having it). */
  get playerIsQuantum(): boolean;
  get npcIsQuantum(): boolean;
  /** 1–5, driving how briskly an npc Quantum rotates its elements. */
  get npcDifficultyLevel(): number;
  /** Online: the "npc" is a remote human, so nothing local may decide when it swaps. */
  get isOnline(): boolean;
  /**
   * Re-keys the whole player side onto another element: `playerElement`, `Fighter.element`,
   * the active upgrade list, the mastery binds, the equipped skin and the ability tray all
   * follow. This is the entire swap — everything else in this kit is presentation and cost.
   */
  applyPlayerElement(id: string): void;
  /** The npc-side equivalent, for an npc Quantum. */
  applyNpcElement(id: string): void;
  /**
   * Which key the player's live element was reached through. Called *before* the re-key on
   * every routed press — the arena keys the sixth slot's mastery bind and the G-for-F key swap
   * off it, so it has to be current by the time the kit downstream reads its keys.
   */
  setLiveSlot(slot: QuantumLiveSlot): void;
  /** Quantum's own mastery grind — shifts, and the slots used in a fight. */
  recordMasteryStat(key: string, amount: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  spawnHitFlash(x: number, y: number, color: number): void;
  setStatusIndicator(id: string, status: CustomStatus | null): void;
  /** Element display names, for the loadout readout. */
  elementName(id: string): string;
  elementColor(id: string): number;
  elementEmoji(id: string): string;
}

/**
 * QuantumKit — the loadout's key routing, the npc's rotation, and the price of carrying
 * several kits.
 *
 * Quantum owns no abilities. What it owns is a slot table — key -> element — and a pointer at
 * whichever element is live; a key press moves the pointer ({@link routeInput}) and
 * `applyPlayerElement` does the rest. Every element carried shares one Fighter, so HP,
 * shields, status effects and cooldown timestamps are common by construction — there is no
 * "merge" step because there was never a second body.
 *
 * The cost is Quantum Instability. Every hit taken adds a point of incoming-damage
 * vulnerability up to 50, and a point bleeds off every two seconds.
 *
 * An npc Quantum has no keys to route: it carries a short list of elements and rotates
 * through them on a rhythm ({@link maybeSwapNpc}), paying the same instability the player
 * does and nothing more.
 */
export class QuantumKit {
  private api: QuantumArenaApi;
  private dormantTicks: DormantTicks;

  /** Slot key -> element. Set once per fight; `playerForms` is derived from it. */
  private playerSlots: Record<QuantumSlot, string> | null = null;
  /** Mastered Quantum: the sixth key's mastery ability, routed like a slot of its own. */
  private playerSixth: QuantumSixth | null = null;
  /** The slots pressed so far this fight — the Full Spread mastery requirement reads it on a win. */
  private slotsUsed = new Set<QuantumLiveSlot>();
  /**
   * Every element the player carries, Click's first — that is the element the fight opens as
   * and whose body texture the fighter wears. The dormant tick and the readout walk this.
   */
  private playerForms: string[] = [];
  /** An npc Quantum's rotation, in order. Index 0 is what it starts as. */
  private npcForms: string[] = [];
  private playerIdx = 0;
  private npcIdx = 0;

  private instability: Record<Owner, number> = { player: 0, npc: 0 };
  /** Carries the sub-millisecond remainder so decay is frame-rate independent. */
  private decayAccum: Record<Owner, number> = { player: 0, npc: 0 };
  /** Fighters already wired to the `damaged` event, so a restart never double-counts. */
  private tracked = new WeakSet<Fighter>();
  /** Quantum's own character per side, built the first frame that side is a Quantum. */
  private avatars: Record<Owner, QuantumAvatar | null> = { player: null, npc: null };
  private playerMastered = false;

  /** Scene time the npc is next allowed to rotate. */
  private npcNextSwapAt = 0;
  /** An npc gets one free "things are going badly" swap per fight, outside its rhythm. */
  private npcPanicSwapUsed = false;

  private hud: Phaser.GameObjects.Graphics | null = null;
  /** One label per stop on the cycle, built to match `playerForms` the first time it is drawn. */
  private hudLabels: Phaser.GameObjects.Text[] = [];

  constructor(api: QuantumArenaApi, dormantTicks: DormantTicks) {
    this.api = api;
    this.dormantTicks = dormantTicks;
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  /**
   * Every match start. The loadouts come from whoever set up the fight, so they are handed in
   * rather than read here — see `ArenaScene.create`.
   */
  reset(): void {
    this.playerSlots = null;
    this.playerSixth = null;
    this.slotsUsed = new Set();
    this.playerForms = [];
    this.npcForms = [];
    this.playerIdx = 0;
    this.npcIdx = 0;
    this.instability = { player: 0, npc: 0 };
    this.decayAccum = { player: 0, npc: 0 };
    this.npcNextSwapAt = 0;
    this.npcPanicSwapUsed = false;
    this.tracked = new WeakSet<Fighter>();
    this.avatars.player?.destroy();
    this.avatars.npc?.destroy();
    this.avatars = { player: null, npc: null };
    this.playerMastered = false;
    this.hud?.destroy(); this.hud = null;
    for (const t of this.hudLabels) t.destroy();
    this.hudLabels = [];
  }

  /** Called from `create()` once the loadout for this fight is known. */
  setPlayerLoadout(lo: QuantumLoadout): void {
    this.playerSlots = { ...lo.slots };
    this.playerSixth = lo.sixth;
    this.playerForms = loadoutElements(lo);
    this.playerIdx = 0;
    this.playerMastered = lo.mastered;
  }

  /** How many distinct keys (the five slots and the sixth) the player has routed through this fight. */
  playerSlotsUsed(): number {
    return this.slotsUsed.size;
  }

  /**
   * An npc Quantum's rotation. A bot is handed a random handful; an online opponent's list is
   * whatever their lobby selection carried (their loadout's elements, Click's first), and their
   * shifts then arrive as `qswap` messages — {@link noteNpcSwapped} adopts anything new.
   */
  setNpcForms(forms: string[]): void {
    this.npcForms = [...new Set(forms)];
    this.npcIdx = 0;
  }

  // ── Queries ────────────────────────────────────────────────────────────────

  /** Every element the player carries, Click's first. */
  getPlayerForms(): string[] {
    return this.playerForms;
  }

  /** The form the player is currently wearing, or null when the player is not Quantum. */
  playerActiveElement(): string | null {
    return this.playerForms[this.playerIdx] ?? null;
  }

  /**
   * The forms the player is *not* wearing — the ones that need a dormant tick. Up to four of
   * them with a five-element loadout.
   */
  playerDormantElements(): string[] {
    return this.playerForms.filter((_, i) => i !== this.playerIdx);
  }

  npcActiveElement(): string | null {
    return this.npcForms[this.npcIdx] ?? null;
  }

  npcDormantElements(): string[] {
    return this.npcForms.filter((_, i) => i !== this.npcIdx);
  }

  getInstability(owner: Owner): number {
    return this.instability[owner];
  }

  // ── The swap ───────────────────────────────────────────────────────────────

  /** Rotates an npc Quantum onto its next element. Driven by {@link maybeSwapNpc}. */
  swapNpc(): void {
    if (this.npcForms.length < 2) return;
    this.npcIdx = (this.npcIdx + 1) % this.npcForms.length;
    const next = this.npcForms[this.npcIdx];
    this.api.applyNpcElement(next);
    this.onCollapse(this.api.npc, next);
  }

  /**
   * The player's whole input model, run every frame *before* ArenaScene hands the keys to
   * the live element's kit. A fresh E/R/F/Q press makes the player the element that owns
   * that slot; with no fresh press, a held mouse button makes them Click's element. The kit
   * then sees the very same press and casts as it always does — the re-key is what makes the
   * generic `this.elementId === 'x'` dispatch pick the right kit.
   *
   * The presses are *peeked*, not consumed: `Phaser.Input.Keyboard.JustDown` clears the flag,
   * and the kit downstream still needs to read it. Two presses in one frame: the later key wins.
   *
   * A shift costs nothing in itself; the incoming-damage vulnerability is the whole price.
   */
  routeInput(
    keys: Record<Exclude<QuantumSlot, 'click'>, Phaser.Input.Keyboard.Key> & { x6: Phaser.Input.Keyboard.Key },
    pointerDown: boolean,
  ): void {
    const slots = this.playerSlots;
    if (!slots) return;
    const justDown = (k: Phaser.Input.Keyboard.Key): boolean => (k as unknown as { _justDown: boolean })._justDown;
    let want: string | null = null;
    let via: QuantumLiveSlot | null = null;
    for (const k of ['e', 'r', 'f', 'q'] as const) {
      if (justDown(keys[k])) { want = slots[k]; via = k; }
    }
    // The sixth key only exists with the mastery; without one it is an ordinary unused key.
    if (this.playerSixth && justDown(keys.x6)) { want = this.playerSixth.elementId; via = 'x6'; }
    if (!want && pointerDown) { want = slots.click; via = 'click'; }
    if (!want || !via) return;
    const at = this.playerForms.indexOf(want);
    if (at < 0) return;
    this.slotsUsed.add(via);
    // The slot is reported even when the element does not change — Fire on F and Fire's
    // mastery ability on G are the same element reached two ways, and only the slot tells the
    // arena which of the two the kit should see.
    this.api.setLiveSlot(via);
    if (want === this.api.elementId) return;
    this.playerIdx = at;
    this.api.applyPlayerElement(want);
    this.api.recordMasteryStat('shifts', 1);
    const who = this.api.player;
    if (who?.active) this.collapseRing(who.x, who.y, this.api.elementColor(want));
  }

  /** Everything an npc collapse does beyond the re-key: the ring and the announcement. */
  private onCollapse(who: Fighter, nextId: string): void {
    if (!who?.active) return;
    this.collapseRing(who.x, who.y, this.api.elementColor(nextId));
    Sfx.playAt('teleport', who.x);

    const name = this.api.elementName(nextId);
    const emoji = this.api.elementEmoji(nextId);
    this.api.showFloatingText(who.x, who.y - 52, `${emoji} ${name}`, '#7df9ff');
  }

  /** A ring that snaps outward and a counter-ring that closes in — a collapse, not a bloom. */
  private collapseRing(x: number, y: number, tint: number): void {
    const g = this.api.scene.add.graphics().setDepth(9);
    this.api.scene.tweens.addCounter({
      from: 0, to: 1, duration: COLLAPSE_MS,
      onUpdate: (tw) => {
        if (!g.active) return;
        const t = Number(tw.getValue());
        g.clear();
        g.lineStyle(3 * (1 - t), Q_CYAN, 0.9 * (1 - t));
        g.strokeCircle(x, y, COLLAPSE_R * t);
        g.lineStyle(2, tint, 0.85 * (1 - t));
        g.strokeCircle(x, y, COLLAPSE_R * (1 - t));
        // Three orbit ticks that spin as the ring travels, so it reads as an atom.
        g.lineStyle(1.5, Q_CYAN, 0.5 * (1 - t));
        for (let i = 0; i < 3; i++) {
          const a = t * Math.PI * 2 + (i * Math.PI * 2) / 3;
          const r = COLLAPSE_R * t;
          g.beginPath();
          g.moveTo(x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6);
          g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
          g.strokePath();
        }
      },
      onComplete: () => g.destroy(),
    });
  }

  // ── Per-frame ──────────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    this.trackHits();
    this.tickInstability('player', this.api.player, delta);
    this.tickInstability('npc', this.api.npc, delta);
    this.maybeSwapNpc(time);
    this.tickDormant(time, delta);
    this.updateBody('player', this.api.player, delta);
    this.updateBody('npc', this.api.npc, delta);
    this.drawHud();
  }

  /**
   * Keeps a Quantum looking like Quantum. Every carried kit's rig is vetoed at the fighter's
   * position (ArenaScene's `BaseAvatar.rigFilter`) and this side's own rig drawn instead; and
   * any element body texture a kit puts on the fighter (Click's at spawn, a form swap, a
   * restore of a "previous" texture) is put back to the one Quantum body. Non-element textures
   * — an enemy's polymorph, say — are left alone.
   */
  private updateBody(owner: Owner, who: Fighter, delta: number): void {
    if (!this.carrying(owner) || !who) return;
    const key = who.texture?.key ?? '';
    if (who.active && key !== BODY_TEXTURE && (key.startsWith('elem-') || key.startsWith('silence-'))) {
      who.setTexture(BODY_TEXTURE);
    }
    let rig = this.avatars[owner];
    if (!rig) {
      rig = this.avatars[owner] = new QuantumAvatar(this.api.scene);
    }
    if (owner === 'player') {
      const p = this.api.pointer;
      if (p) rig.setFacing(Math.atan2(p.worldY - who.y, p.worldX - who.x));
      rig.setMastered(this.playerMastered);
    } else {
      const foe = this.api.player;
      if (foe?.active) rig.setFacing(Math.atan2(foe.y - who.y, foe.x - who.x));
    }
    rig.update(delta, who.x, who.y, who.active && who.visible ? who.alpha : 0);
  }

  /**
   * Wires the `damaged` event on both fighters once each. Counting hits (not damage) has to
   * happen at the source — `takeDamage` is the only place that knows a hit landed at all
   * after shields, absorbers and invincibility have had their say.
   */
  private trackHits(): void {
    const wire = (owner: Owner, who: Fighter): void => {
      if (!who?.active || this.tracked.has(who)) return;
      this.tracked.add(who);
      who.on('damaged', (amount: number) => {
        if (amount <= 0) return;
        if (!this.carrying(owner)) return;
        this.instability[owner] = Math.min(INSTABILITY_MAX, this.instability[owner] + INSTABILITY_PER_HIT);
      });
      who.on('cast', (abilityId: string) => {
        const i = who.element?.abilities.findIndex((a) => a.id === abilityId) ?? -1;
        this.avatars[owner]?.play(CAST_GESTURES[Math.max(0, Math.min(CAST_GESTURES.length - 1, i))]);
      });
    };
    if (this.carrying('player')) wire('player', this.api.player);
    if (this.carrying('npc')) wire('npc', this.api.npc);
  }

  /** Whether that side is a Quantum at all. */
  private carrying(owner: Owner): boolean {
    return owner === 'player' ? this.playerForms.length > 0 : this.npcForms.length > 0;
  }

  /** Bleeds a point every {@link INSTABILITY_DECAY_MS} and pushes the result onto the Fighter. */
  private tickInstability(owner: Owner, who: Fighter, delta: number): void {
    if (!this.carrying(owner)) return;

    if (this.instability[owner] > 0) {
      this.decayAccum[owner] += delta;
      while (this.decayAccum[owner] >= INSTABILITY_DECAY_MS && this.instability[owner] > 0) {
        this.decayAccum[owner] -= INSTABILITY_DECAY_MS;
        this.instability[owner] -= 1;
      }
    } else {
      this.decayAccum[owner] = 0;
    }

    if (who?.active) who.quantumIncomingMult = 1 + this.instability[owner] / 100;

    if (owner === 'player') this.showInstabilityStatus();
  }

  /**
   * One status box, rewritten in place. Hidden entirely at zero so a clean Quantum is not
   * carrying a permanent empty meter, and it turns red once a swap would start costing HP.
   */
  private showInstabilityStatus(): void {
    const v = this.instability.player;
    if (v <= 0) {
      this.api.setStatusIndicator('quantum-instability', null);
      return;
    }
    this.api.setStatusIndicator('quantum-instability', {
      name: 'Instability',
      emoji: '⚛️',
      color: v >= INSTABILITY_WARN ? 0xff5577 : Q_CYAN,
      description: `Taking ${v}% more damage. Bleeds off 1 every ${INSTABILITY_DECAY_MS / 1000}s.`,
      count: v,
      suffix: '%',
      priority: 60,
    });
  }

  /**
   * Advances an npc Quantum's elements that are not being worn. The tick functions come from
   * ArenaScene and are the same per-frame work those elements do normally, minus the character
   * rig and the HUD — see `DormantTicks`.
   */
  private tickDormant(time: number, delta: number): void {
    // One tick per element per frame, however many dormant slots point at it — the player's
    // list and the npc's can overlap.
    const done = new Set<string>();
    const run = (ids: string[]): void => {
      for (const id of ids) {
        if (done.has(id)) continue;
        done.add(id);
        this.dormantTicks[id]?.(time, delta);
      }
    };
    // Player side: nothing to do. ArenaScene's per-element gates read `playerIs`, which is
    // true for every element in the loadout, so the main dispatch already ticks all of them —
    // forms, auras and passives included. Only an npc Quantum's dormant elements need this.
    if (this.api.npcIsQuantum) run(this.npcDormantElements());
  }

  /**
   * An npc Quantum's whole brain. Everything else about fighting as the active half is
   * already handled — `NpcOpponent.doAI` dispatches on `element.id`, which the re-key has
   * already pointed at that half — so the only decision left is *when* to be the other one.
   *
   * Deliberately a rhythm rather than a read of the fight: an npc that swapped in reaction
   * to whatever the player just did would be unreadable, and the player needs to be able to
   * learn "it is about to become the other thing" from watching. The one exception is the
   * panic swap, which fires once when the fight turns against it.
   */
  private maybeSwapNpc(time: number): void {
    if (this.npcForms.length < 2) return;
    // Online: the opponent is a person. Their collapses arrive as `qswap` messages and land
    // in `noteNpcSwapped` — deciding one for them here would fight the relay.
    if (this.api.isOnline) return;
    const npc = this.api.npc;
    if (!npc?.active) return;

    const level = Math.max(1, Math.min(5, this.api.npcDifficultyLevel));
    const period = NPC_SWAP_PERIOD_MS[level - 1];

    // First call of a fight sets the clock rather than swapping — an npc should not collapse
    // on frame one, before the player has seen what it started as.
    if (this.npcNextSwapAt === 0) {
      this.npcNextSwapAt = time + period;
      return;
    }

    const hpRatio = npc.maxHp > 0 ? npc.hp / npc.maxHp : 1;
    const panicking = !this.npcPanicSwapUsed && hpRatio < NPC_PANIC_HP;
    if (time < this.npcNextSwapAt && !panicking) return;

    if (panicking) this.npcPanicSwapUsed = true;
    this.swapNpc();
    this.npcNextSwapAt = time + period + (Math.random() * 2 - 1) * NPC_SWAP_JITTER_MS;
  }

  /**
   * Online: the opponent's sim already shifted element and re-keyed their own side, and
   * ArenaScene has just re-keyed our replica of them. All that is left is to move our idea of
   * which half they are wearing, so the dormant tick follows them.
   *
   * Only the ring is drawn, the same as for the player's own shifts.
   */
  noteNpcSwapped(elementId: string): void {
    if (!this.npcForms.length) {
      // A peer whose loadout we never learned — adopt it from the shift so the readout still works.
      this.npcForms = [this.api.npcElementId, elementId];
      this.npcIdx = 1;
      return;
    }
    // Grow the list the first time they land on something we were not told about, rather than
    // ignoring a form we can plainly see them wearing.
    let at = this.npcForms.indexOf(elementId);
    if (at < 0) {
      this.npcForms.push(elementId);
      at = this.npcForms.length - 1;
    }
    this.npcIdx = at;
    if (this.api.npc?.active) this.collapseRing(this.api.npc.x, this.api.npc.y, this.api.elementColor(elementId));
  }

  // ── Loadout readout ────────────────────────────────────────────────────────

  /**
   * A slot per element carried, above the ability tray: the live one lit and named, the
   * dormant ones dimmed. Screen-space, so it does not move with the camera. The plate is sized
   * off `playerForms`, so a fuller loadout widens it instead of squeezing the slots.
   */
  private drawHud(): void {
    const forms = this.playerForms;
    if (forms.length < 2 || !this.api.playerIsQuantum) return;

    const cx = this.api.width / 2;
    const y = this.api.height - 92;
    const totalW = HUD_SLOT_W * forms.length;
    const half = totalW / 2;

    if (!this.hud) {
      this.hud = this.api.scene.add.graphics().setDepth(HUD_DEPTH - 1).setScrollFactor(0);
    }
    while (this.hudLabels.length < forms.length) {
      this.hudLabels.push(this.api.scene.add.text(0, y, '', {
        fontSize: '11px', fontFamily: FONT_DISPLAY, stroke: '#031018', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(HUD_DEPTH).setScrollFactor(0));
    }

    const t = this.api.scene.time.now / 1000;
    const g = this.hud;
    g.clear();
    const left = cx - half, top = y - HUD_H / 2;

    // Plate: drop shadow, deep cyan glass, a faint standing wave across it, a double rim and
    // corner brackets — a readout off a lab instrument.
    g.fillStyle(0x000000, 0.4);
    g.fillRoundedRect(left + 2, top + 3, totalW, HUD_H, 9);
    g.fillStyle(0x041016, 0.92);
    g.fillRoundedRect(left, top, totalW, HUD_H, 9);
    g.fillStyle(0x0d3a52, 0.35);
    g.fillRoundedRect(left + 3, top + 3, totalW - 6, HUD_H / 2 - 3, { tl: 7, tr: 7, bl: 0, br: 0 });
    g.lineStyle(1, Q_CYAN, 0.16);
    for (let k = 0; k < 2; k++) {
      g.beginPath();
      for (let xx = 0; xx <= totalW - 12; xx += 4) {
        const yy = y + Math.sin(xx * 0.09 + t * (2.2 + k) + k * 1.7) * (HUD_H * 0.28) * Math.sin(t * 0.8 + k);
        if (xx === 0) g.moveTo(left + 6 + xx, yy); else g.lineTo(left + 6 + xx, yy);
      }
      g.strokePath();
    }
    g.lineStyle(1.5, Q_CYAN, 0.6);
    g.strokeRoundedRect(left, top, totalW, HUD_H, 9);
    g.lineStyle(1, 0xb07dff, 0.35);
    g.strokeRoundedRect(left + 2.5, top + 2.5, totalW - 5, HUD_H - 5, 7);
    const br = 7;
    g.lineStyle(2, 0xeaffff, 0.85);
    for (const [bx, by, sx, sy] of [[left, top, 1, 1], [left + totalW, top, -1, 1], [left, top + HUD_H, 1, -1], [left + totalW, top + HUD_H, -1, -1]]) {
      g.beginPath();
      g.moveTo(bx + sx * br, by + sy * 1);
      g.lineTo(bx + sx * 1, by + sy * 1);
      g.lineTo(bx + sx * 1, by + sy * br);
      g.strokePath();
    }

    // Entanglement between neighbouring stops: a wavy link with a photon running along it.
    for (let i = 0; i < forms.length - 1; i++) {
      const jx = left + (i + 1) * HUD_SLOT_W + 2;
      g.lineStyle(1.2, Q_CYAN, 0.5);
      g.beginPath();
      for (let k = 0; k <= 8; k++) {
        const yy = top + 7 + (k / 8) * (HUD_H - 14);
        const xx = jx + Math.sin(k * 1.2 + t * 6) * 2.2;
        if (k === 0) g.moveTo(xx, yy); else g.lineTo(xx, yy);
      }
      g.strokePath();
      const ph = (t * 1.4 + i * 0.5) % 1;
      g.fillStyle(0xeaffff, 0.9);
      g.fillCircle(jx + Math.sin(ph * 9.6 + t * 6) * 2.2, top + 7 + ph * (HUD_H - 14), 1.6);
    }

    // The live stop is a lit capsule in its own colour with an electron circling it; the
    // dormant ones are ghosts — a hairline with a faint offset double, plainly "somewhere else".
    for (let i = 0; i < forms.length; i++) {
      const live = i === this.playerIdx;
      const sx = left + 6 + i * HUD_SLOT_W;
      const sw = HUD_SLOT_W - 8;
      const sy = top + 6, sh = HUD_H - 12;
      const col = this.api.elementColor(forms[i]);
      if (live) {
        const pulse = 0.85 + 0.15 * Math.sin(t * 4);
        g.fillStyle(col, 0.16 * pulse);
        g.fillRoundedRect(sx - 3, sy - 3, sw + 6, sh + 6, 9);
        g.fillStyle(col, 0.38 * pulse);
        g.fillRoundedRect(sx, sy, sw, sh, 6);
        g.fillStyle(0xffffff, 0.14);
        g.fillRoundedRect(sx + 2, sy + 1.5, sw - 4, sh * 0.4, { tl: 5, tr: 5, bl: 0, br: 0 });
        g.lineStyle(1.6, col, 0.95);
        g.strokeRoundedRect(sx, sy, sw, sh, 6);
        // Electron on an orbit round the capsule.
        const oa = t * 3.2;
        const ex = sx + sw / 2 + Math.cos(oa) * (sw / 2 + 1);
        const ey = sy + sh / 2 + Math.sin(oa) * (sh / 2 + 1);
        g.lineStyle(0.8, col, 0.4);
        g.strokeEllipse(sx + sw / 2, sy + sh / 2, sw + 2, sh + 2);
        g.fillStyle(col, 0.5);
        g.fillCircle(ex, ey, 3.4);
        g.fillStyle(0xffffff, 1);
        g.fillCircle(ex, ey, 1.6);
      } else {
        const jx = Math.sin(t * 2.3 + i * 1.7) * 1.5, jy = Math.cos(t * 1.9 + i) * 1;
        g.lineStyle(1, 0xb07dff, 0.22);
        g.strokeRoundedRect(sx + jx, sy + jy, sw, sh, 6);
        g.fillStyle(col, 0.06);
        g.fillRoundedRect(sx, sy, sw, sh, 6);
        g.lineStyle(1, col, 0.32);
        g.strokeRoundedRect(sx, sy, sw, sh, 6);
      }

      const label = this.hudLabels[i];
      label.setPosition(sx + sw / 2, y);
      label.setText(`${this.api.elementEmoji(forms[i])} ${this.api.elementName(forms[i])}`);
      label.setColor(live ? '#ffffff' : '#6f8a92');
      label.setAlpha(live ? 1 : 0.75);
      label.setVisible(true);
    }
    for (let i = forms.length; i < this.hudLabels.length; i++) this.hudLabels[i].setVisible(false);
  }
}
