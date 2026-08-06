import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import type { CustomStatus } from './StatusHudKit';
import { Sfx } from '../../audio';

type Owner = 'player' | 'npc';

// ── Instability ──────────────────────────────────────────────────────────────
/** One point of vulnerability per hit taken, regardless of how big the hit was. */
const INSTABILITY_PER_HIT = 1;
/** The ceiling. At 50 the fighter takes half again as much of everything. */
const INSTABILITY_MAX = 50;
/** Milliseconds to shed a single point. */
const INSTABILITY_DECAY_MS = 2000;
/** Swapping at or above this is what tears — below it the collapse is clean. */
const UNSTABLE_SWAP_THRESHOLD = 40;
/** What a torn swap costs the fighter doing it. */
const UNSTABLE_SWAP_DAMAGE = 25;

// ── Collapse (the swap itself) ───────────────────────────────────────────────
/** How long the collapse ring is on screen. Cosmetic only — the swap itself is instant. */
const COLLAPSE_MS = 380;
const COLLAPSE_R = 76;

// ── NPC bond handling ────────────────────────────────────────────────────────
/**
 * How often an npc Quantum collapses its bond, by difficulty (1–5). Easy barely uses the
 * second half at all; Nightmare rotates fast enough that both kits are genuinely live.
 */
const NPC_SWAP_PERIOD_MS = [16000, 13000, 10000, 7500, 5500];
/** Random slack either side of the period, so two Quantum npcs never swap in lockstep. */
const NPC_SWAP_JITTER_MS = 2500;
/** Below this HP fraction the npc spends its one out-of-rhythm swap. */
const NPC_PANIC_HP = 0.45;

/** Colour of the bond readout and the collapse ring. Matches `quantumElement.color`. */
const Q_CYAN = 0x7df9ff;

/** HUD geometry. Depth 21–23 is the arena's tray band — see `ArenaScene.createHUD`. */
const HUD_DEPTH = 23;
/** Per bond slot, so the plate grows when Third State adds a third stop rather than cramping. */
const HUD_SLOT_W = 86;
const HUD_H = 40;

/**
 * The id of Quantum's own third stop. It is the element id, not a sentinel: a bond wearing it
 * really is `ELEMENT_MAP['quantum']`, whose five abilities `QuantumCoreKit` supplies.
 */
const THIRD_STATE = 'quantum';

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
  /** True when the *player* picked Quantum (as opposed to the npc having it). */
  get playerIsQuantum(): boolean;
  get npcIsQuantum(): boolean;
  /** 1–5, driving how briskly an npc Quantum rotates its bond. */
  get npcDifficultyLevel(): number;
  /**
   * True when the player owns Quantum's one upgrade, Third State — which is the only thing that
   * puts a third stop on the cycle. Read once per fight in `setPlayerBond`, because a shop
   * purchase mid-match is not a thing that can happen.
   */
  get playerHasThirdState(): boolean;
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
  showFloatingText(x: number, y: number, text: string, color: string): void;
  spawnHitFlash(x: number, y: number, color: number): void;
  setStatusIndicator(id: string, status: CustomStatus | null): void;
  /** Element display names, for the bond readout. */
  elementName(id: string): string;
  elementColor(id: string): number;
  elementEmoji(id: string): string;
}

/**
 * QuantumKit — the bond, the swap, and the price of carrying two kits.
 *
 * Quantum owns no abilities. What it owns is a pair of element ids and a pointer at one of
 * them; the dodge key moves the pointer, and `applyPlayerElement` does the rest. Both halves
 * share one Fighter, so HP, shields, status effects and cooldown timestamps are common by
 * construction — there is no "merge" step because there was never a second body.
 *
 * The cost is Quantum Instability. Every hit taken adds a point of incoming-damage
 * vulnerability up to 50, and a point bleeds off every two seconds. Collapsing the bond at 40
 * or above tears the body doing it for {@link UNSTABLE_SWAP_DAMAGE}, which is what stops the
 * swap from being a free reset on a bad matchup.
 *
 * Instability is tracked for both sides: an npc Quantum pays exactly what the player does.
 */
export class QuantumKit {
  private api: QuantumArenaApi;
  private dormantTicks: DormantTicks;

  /** `[first, second]` as the player ordered them. Index 0 is what the fight starts as. */
  private playerBond: [string, string] | null = null;
  private npcBond: [string, string] | null = null;
  /**
   * Every stop on the cycle in order — the two bonded elements, plus Quantum itself when the
   * fighter owns Third State. This, not the bond, is what the collapse walks; the bond stays a
   * pair because that is what the Entanglement Lab researched and what the save records.
   */
  private playerForms: string[] = [];
  private npcForms: string[] = [];
  private playerIdx = 0;
  private npcIdx = 0;

  private instability: Record<Owner, number> = { player: 0, npc: 0 };
  /** Carries the sub-millisecond remainder so decay is frame-rate independent. */
  private decayAccum: Record<Owner, number> = { player: 0, npc: 0 };
  /** Fighters already wired to the `damaged` event, so a restart never double-counts. */
  private tracked = new WeakSet<Fighter>();

  /** Scene time the npc is next allowed to collapse its bond. */
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
   * Every match start. The bonds come from whoever set up the fight, so they are handed in
   * rather than read here — see `ArenaScene.create`.
   */
  reset(): void {
    this.playerBond = null;
    this.npcBond = null;
    this.playerForms = [];
    this.npcForms = [];
    this.playerIdx = 0;
    this.npcIdx = 0;
    this.instability = { player: 0, npc: 0 };
    this.decayAccum = { player: 0, npc: 0 };
    this.npcNextSwapAt = 0;
    this.npcPanicSwapUsed = false;
    this.tracked = new WeakSet<Fighter>();
    this.hud?.destroy(); this.hud = null;
    for (const t of this.hudLabels) t.destroy();
    this.hudLabels = [];
  }

  /** Called from `create()` once the bond for this fight is known. */
  setPlayerBond(a: string, b: string): void {
    this.playerBond = [a, b];
    this.playerForms = this.api.playerHasThirdState ? [a, b, THIRD_STATE] : [a, b];
    this.playerIdx = 0;
  }

  /**
   * The npc side never grows a third stop of its own: Third State is a shop purchase and a bot
   * has no save to buy it from. An *online* opponent who owns it is handled the other way
   * round — their collapses arrive as `qswap` messages naming the element, and
   * {@link noteNpcSwapped} adopts whatever they became, Quantum included.
   */
  setNpcBond(a: string, b: string): void {
    this.npcBond = [a, b];
    this.npcForms = [a, b];
    this.npcIdx = 0;
  }

  // ── Queries ────────────────────────────────────────────────────────────────

  getPlayerBond(): [string, string] | null {
    return this.playerBond;
  }

  getNpcBond(): [string, string] | null {
    return this.npcBond;
  }

  /** Every stop the player's cycle visits, in order. Two entries, or three with Third State. */
  getPlayerForms(): string[] {
    return this.playerForms;
  }

  /** Which stop the player is on right now. */
  getPlayerFormIndex(): number {
    return this.playerIdx;
  }

  /** The form the player is currently wearing, or null when the player is not Quantum. */
  playerActiveElement(): string | null {
    return this.playerForms[this.playerIdx] ?? null;
  }

  /**
   * The forms the player is *not* wearing — the ones that need a dormant tick. With Third State
   * there are two of them, which is exactly why this is a list.
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

  /**
   * Collapses the player's bond onto its other half. Called from `ArenaScene.executeDodge`,
   * so the swap rides the dodge rather than costing a separate key — the dash still happens
   * either way, and a Quantum with no bond simply dodges like anyone else.
   */
  swapPlayer(): void {
    if (this.playerForms.length < 2) return;
    this.playerIdx = (this.playerIdx + 1) % this.playerForms.length;
    const next = this.playerForms[this.playerIdx];
    this.api.applyPlayerElement(next);
    this.onCollapse('player', this.api.player, next);
  }

  /** The npc-side equivalent, driven by `NpcOpponent`'s dodge. */
  swapNpc(): void {
    if (this.npcForms.length < 2) return;
    this.npcIdx = (this.npcIdx + 1) % this.npcForms.length;
    const next = this.npcForms[this.npcIdx];
    this.api.applyNpcElement(next);
    this.onCollapse('npc', this.api.npc, next);
  }

  /**
   * Everything a collapse does beyond the re-key: the ring, the announcement, and the tear
   * if the body was already unstable when it was asked to be something else.
   */
  private onCollapse(owner: Owner, who: Fighter, nextId: string): void {
    if (!who?.active) return;
    this.collapseRing(who.x, who.y, this.api.elementColor(nextId));
    Sfx.playAt('teleport', who.x);

    const name = this.api.elementName(nextId);
    const emoji = this.api.elementEmoji(nextId);
    this.api.showFloatingText(who.x, who.y - 52, `${emoji} ${name}`, '#7df9ff');

    if (this.instability[owner] >= UNSTABLE_SWAP_THRESHOLD) {
      // Self-inflicted so the online damage gate lets it through — the peer's sim has no
      // copy of this hit to relay, and blocking it would delete the ability's whole cost.
      who.takeDamage(UNSTABLE_SWAP_DAMAGE, { selfInflicted: true });
      this.api.spawnHitFlash(who.x, who.y, 0xff5577);
      this.api.showFloatingText(who.x, who.y - 74, `⚛️ Unstable! −${UNSTABLE_SWAP_DAMAGE}`, '#ff5577');
    }
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
    this.drawHud();
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
        const carries = owner === 'player' ? this.playerBond : this.npcBond;
        if (!carries) return;
        this.instability[owner] = Math.min(INSTABILITY_MAX, this.instability[owner] + INSTABILITY_PER_HIT);
      });
    };
    if (this.playerBond) wire('player', this.api.player);
    if (this.npcBond) wire('npc', this.api.npc);
  }

  /** Bleeds a point every {@link INSTABILITY_DECAY_MS} and pushes the result onto the Fighter. */
  private tickInstability(owner: Owner, who: Fighter, delta: number): void {
    const bond = owner === 'player' ? this.playerBond : this.npcBond;
    if (!bond) return;

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
    const tearing = v >= UNSTABLE_SWAP_THRESHOLD;
    this.api.setStatusIndicator('quantum-instability', {
      name: 'Instability',
      emoji: '⚛️',
      color: tearing ? 0xff5577 : Q_CYAN,
      description: tearing
        ? `Taking ${v}% more damage. Collapsing the bond now costs ${UNSTABLE_SWAP_DAMAGE} HP.`
        : `Taking ${v}% more damage. Bleeds off 1 every ${INSTABILITY_DECAY_MS / 1000}s.`,
      count: v,
      suffix: '%',
      priority: 60,
    });
  }

  /**
   * Advances whichever halves are not being played. The tick functions come from ArenaScene
   * and are the same per-frame work those elements do normally, minus the character rig and
   * the HUD — see `DormantTicks`.
   */
  private tickDormant(time: number, delta: number): void {
    // One tick per element per frame, however many dormant slots point at it. Third State makes
    // that a real possibility rather than a theoretical one: with three stops on the player's
    // cycle and two on the npc's, four dormant slots are live at once.
    const done = new Set<string>();
    const run = (ids: string[]): void => {
      for (const id of ids) {
        if (done.has(id)) continue;
        done.add(id);
        this.dormantTicks[id]?.(time, delta);
      }
    };
    if (this.api.playerIsQuantum) run(this.playerDormantElements());
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
   *
   * It will not collapse into a tear it cannot afford — an npc sitting on high instability
   * waits rather than paying 25 HP, the same call a player would make.
   */
  private maybeSwapNpc(time: number): void {
    if (!this.npcBond) return;
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

    // Would the collapse tear? Pay it only if there is comfortably enough health to.
    const wouldTear = this.instability.npc >= UNSTABLE_SWAP_THRESHOLD;
    if (wouldTear && npc.hp <= UNSTABLE_SWAP_DAMAGE * 2) {
      // Not worth dying to change shape. Check back shortly.
      this.npcNextSwapAt = time + 1200;
      return;
    }

    if (panicking) this.npcPanicSwapUsed = true;
    this.swapNpc();
    this.npcNextSwapAt = time + period + (Math.random() * 2 - 1) * NPC_SWAP_JITTER_MS;
  }

  /**
   * Online: the opponent's sim already collapsed their bond and re-keyed their own side, and
   * ArenaScene has just re-keyed our replica of them. All that is left is to move our idea of
   * which half they are wearing, so the dormant tick follows them.
   *
   * Deliberately does not run {@link onCollapse}: the tear damage was paid on their machine,
   * and paying it again here would double it.
   */
  noteNpcSwapped(elementId: string): void {
    if (!this.npcBond) {
      // A peer whose bond we never learned — adopt it from the swap so the readout still works.
      this.npcBond = [this.api.npcElementId, elementId];
      this.npcForms = [...this.npcBond];
      this.npcIdx = 1;
      return;
    }
    // A peer who owns Third State has a stop we were never told about, since their bond came
    // over the wire as a pair. Grow the cycle the first time they land on it rather than
    // ignoring a form we can plainly see them wearing.
    let at = this.npcForms.indexOf(elementId);
    if (at < 0) {
      this.npcForms.push(elementId);
      at = this.npcForms.length - 1;
    }
    this.npcIdx = at;
    if (this.api.npc?.active) this.collapseRing(this.api.npc.x, this.api.npc.y, this.api.elementColor(elementId));
  }

  // ── Bond readout ───────────────────────────────────────────────────────────

  /**
   * A slot per stop on the cycle, above the ability tray: the live one lit and named, the
   * dormant ones dimmed. Screen-space, so it does not move with the camera. Two slots normally,
   * three once Third State is bought — the plate is sized off `playerForms` rather than being a
   * fixed width, so the third stop widens it instead of squeezing the other two.
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
        fontSize: '11px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
      }).setOrigin(0.5).setDepth(HUD_DEPTH).setScrollFactor(0));
    }

    const g = this.hud;
    g.clear();
    g.fillStyle(0x061014, 0.88);
    g.fillRoundedRect(cx - half, y - HUD_H / 2, totalW, HUD_H, 8);
    g.lineStyle(1.5, Q_CYAN, 0.55);
    g.strokeRoundedRect(cx - half, y - HUD_H / 2, totalW, HUD_H, 8);

    // The live stop gets a filled slot in its own element's colour; the dormant ones a hairline.
    for (let i = 0; i < forms.length; i++) {
      const live = i === this.playerIdx;
      const sx = cx - half + 6 + i * HUD_SLOT_W;
      const sw = HUD_SLOT_W - 8;
      const col = this.api.elementColor(forms[i]);
      if (live) {
        g.fillStyle(col, 0.34);
        g.fillRoundedRect(sx, y - HUD_H / 2 + 6, sw, HUD_H - 12, 6);
        g.lineStyle(1.5, col, 0.95);
      } else {
        g.lineStyle(1, col, 0.3);
      }
      g.strokeRoundedRect(sx, y - HUD_H / 2 + 6, sw, HUD_H - 12, 6);

      const t = this.hudLabels[i];
      t.setPosition(sx + sw / 2, y);
      t.setText(`${this.api.elementEmoji(forms[i])} ${this.api.elementName(forms[i])}`);
      t.setColor(live ? '#ffffff' : '#5d7076');
      t.setAlpha(live ? 1 : 0.75);
      t.setVisible(true);
    }
    for (let i = forms.length; i < this.hudLabels.length; i++) this.hudLabels[i].setVisible(false);
  }
}
