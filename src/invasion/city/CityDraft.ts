import Phaser from 'phaser';
import * as PlayerData from '../../data/PlayerData';
import { getElementUpgrades } from '../../data/Upgrades';
import { getPerkById, perkSlotsFor } from '../../data/Perks';
import { ALT_ULTS, ALT_ULT_SLOT, hasAltUlt } from '../../data/AltUlts';
import { getMasteryDef, isMasteryComplete } from '../../data/Mastery';
import { MUTATIONS } from '../../data/Mutations';
import { Sfx } from '../../audio';
import { C, DEPTH, FONT_DISPLAY, FONT_UI, hex, mix, addCardPlate } from '../../ui';
import { draftableMutations, playerMutationDesc } from './CityMutations';

/**
 * The City's wave-end draft. Every cleared wave puts five cards on the table
 * and you keep one. A city run starts bare — Click and E, nothing else — and
 * the whole build is drafted from what you have earned in normal play:
 *
 *   ability   unlock one of your locked keys (R, F, Q)          — most common
 *   upgrade   one of your bought Shop upgrades
 *   perk      a perk you have forged, into a free perk slot
 *   mutation  a mutation on yourself, for the rest of the run (twice = ★)
 *   mastery   your element's mastery, if you have earned it
 *   alt-ult   your alternate ultimate replaces Q for the run      — rarest
 *
 * Only what is unlocked can show up. If the table would be short (late in a
 * run, everything taken), plain boons fill it.
 */

export type DraftKind = 'ability' | 'upgrade' | 'perk' | 'mutation' | 'mastery' | 'alt-ult' | 'boon';

export interface DraftCard {
  kind: DraftKind;
  /** Key for an ability, slot for an upgrade, id for the rest. */
  id: string;
  emoji: string;
  title: string;
  desc: string;
}

/** Relative odds of each kind turning up in a slot. */
const KIND_WEIGHT: Record<Exclude<DraftKind, 'boon'>, number> = {
  ability: 34, upgrade: 26, perk: 16, mutation: 12, mastery: 8, 'alt-ult': 4,
};

const KIND_STYLE: Record<DraftKind, { color: number; label: string }> = {
  ability: { color: C.frost, label: 'ABILITY' },
  upgrade: { color: C.gold, label: 'UPGRADE' },
  perk: { color: C.verdant, label: 'PERK' },
  mutation: { color: C.blood, label: 'MUTATION' },
  mastery: { color: 0xffaa00, label: 'MASTERY' },
  'alt-ult': { color: C.arcane, label: 'ALT ULTIMATE' },
  boon: { color: C.steel, label: 'BOON' },
};

/** What the draft can read and change about the local player's run. */
export interface CityLoadoutApi {
  readonly elementId: string;
  /** The player's R/F/Q abilities, and whether each is still sealed. */
  abilityKeys(): Array<{ key: string; name: string; description: string; locked: boolean }>;
  unlockKey(key: string): void;
  activeUpgrades(): string[];
  /** Adds an upgrade slot (or `ALT_ULT_SLOT`) to the run. */
  addUpgrade(slot: string): void;
  perkIds(): string[];
  addPerk(id: string): void;
  masteryOn(): boolean;
  enableMastery(): void;
}

/** Everything a card can be resolved against. */
export interface DraftContext {
  loadout: CityLoadoutApi;
  mutationTaken(id: string): boolean;
  mutationStarred(id: string): boolean;
}

/** Roll five (or fewer, padded with boons) distinct cards. */
export function rollDraft(ctx: DraftContext, count = 5): DraftCard[] {
  const pools: Record<Exclude<DraftKind, 'boon'>, DraftCard[]> = {
    ability: abilityCards(ctx),
    upgrade: upgradeCards(ctx),
    perk: perkCards(ctx),
    mutation: mutationCards(ctx),
    mastery: masteryCards(ctx),
    'alt-ult': altUltCards(ctx),
  };
  const out: DraftCard[] = [];
  for (let i = 0; i < count; i++) {
    const kinds = (Object.keys(pools) as Array<keyof typeof pools>).filter((k) => pools[k].length > 0);
    if (kinds.length === 0) break;
    const total = kinds.reduce((s, k) => s + KIND_WEIGHT[k], 0);
    let roll = Math.random() * total;
    let kind = kinds[0];
    for (const k of kinds) { roll -= KIND_WEIGHT[k]; if (roll <= 0) { kind = k; break; } }
    const pool = pools[kind];
    out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  const boons = boonCards();
  while (out.length < count && boons.length > 0) out.push(boons.shift()!);
  return out;
}

function abilityCards(ctx: DraftContext): DraftCard[] {
  return ctx.loadout.abilityKeys().filter((a) => a.locked).map((a) => ({
    kind: 'ability', id: a.key, emoji: '🔓',
    title: `${a.key} · ${a.name}`, desc: a.description,
  }));
}

function upgradeCards(ctx: DraftContext): DraftCard[] {
  const el = ctx.loadout.elementId;
  const have = new Set(ctx.loadout.activeUpgrades());
  // An upgrade to a key still sealed is a card for nothing — it waits for its ability card.
  const sealed = sealedKeys(ctx);
  return getElementUpgrades(el)
    .filter((u) => PlayerData.isUpgradeOwned(el, u.slot) && !have.has(u.slot) && !sealed.has(u.displayKey.toUpperCase()))
    .map((u) => ({ kind: 'upgrade', id: u.slot, emoji: '⬆️', title: `${u.displayKey}+ · ${u.name}`, desc: u.description }));
}

/** The R/F/Q keys the run hasn't drafted yet. */
function sealedKeys(ctx: DraftContext): Set<string> {
  return new Set(ctx.loadout.abilityKeys().filter((a) => a.locked).map((a) => a.key.toUpperCase()));
}

function perkCards(ctx: DraftContext): DraftCard[] {
  const el = ctx.loadout.elementId;
  const equipped = ctx.loadout.perkIds();
  if (equipped.length >= perkSlotsFor(el)) return [];
  return PlayerData.getUnlockedPerks(el)
    .filter((id) => !equipped.includes(id))
    .map((id) => getPerkById(id))
    .filter((p): p is NonNullable<ReturnType<typeof getPerkById>> => !!p)
    .map((p) => ({ kind: 'perk', id: p.id, emoji: p.emoji, title: p.name, desc: p.description }));
}

function mutationCards(ctx: DraftContext): DraftCard[] {
  return draftableMutations()
    .filter((m) => !ctx.mutationStarred(m.id))
    .map((m) => {
      const star = ctx.mutationTaken(m.id);
      return {
        kind: 'mutation' as const, id: m.id, emoji: m.emoji,
        title: star ? `★ ${m.name}` : m.name,
        desc: `${star ? 'Star it: every number on it grows by 75%' : 'You carry it for the rest of the run'}  ·  ${playerMutationDesc(m.id)}`,
      };
    });
}

function masteryCards(ctx: DraftContext): DraftCard[] {
  const el = ctx.loadout.elementId;
  const def = getMasteryDef(el);
  if (!def || ctx.loadout.masteryOn() || !isMasteryComplete(el)) return [];
  const passives = def.enhancements.filter((e) => !e.bindable).map((e) => e.name);
  return [{
    kind: 'mastery', id: el, emoji: def.enhancedEmoji, title: def.name,
    desc: `Your element, mastered, for the rest of the run${passives.length ? `: ${passives.join(', ')}` : ''}. Bound mastery abilities come with it.`,
  }];
}

function altUltCards(ctx: DraftContext): DraftCard[] {
  const el = ctx.loadout.elementId;
  if (!hasAltUlt(el) || !PlayerData.isAltUltUnlocked(el)) return [];
  if (ctx.loadout.activeUpgrades().includes(ALT_ULT_SLOT) || sealedKeys(ctx).has('Q')) return [];
  const a = ALT_ULTS[el];
  return [{ kind: 'alt-ult', id: el, emoji: a.emoji, title: `Q · ${a.name}`, desc: `Replaces ${a.baseName} for the rest of the run. ${a.description}` }];
}

function boonCards(): DraftCard[] {
  return Phaser.Utils.Array.Shuffle([
    { kind: 'boon' as const, id: 'vigor', emoji: '❤️', title: 'Vigor', desc: '+60 max health, and a full heal.' },
    { kind: 'boon' as const, id: 'mend-core', emoji: '✦', title: 'Mend the Dreamer', desc: 'The All-Element recovers 120 health.' },
    { kind: 'boon' as const, id: 'drill', emoji: '🤖', title: 'Drill the Bots', desc: 'Every bot in your party hits 20% harder.' },
  ]);
}

/** Text for the card's footer: how rare its kind is. */
function rarityOf(kind: DraftKind): string {
  if (kind === 'boon') return '';
  const w = KIND_WEIGHT[kind];
  return w >= 30 ? 'COMMON' : w >= 20 ? 'UNCOMMON' : w >= 10 ? 'RARE' : w >= 6 ? 'EPIC' : 'LEGENDARY';
}

/** A mutation's display name, for the curse strip. */
export function mutationName(id: string): string {
  return MUTATIONS.find((m) => m.id === id)?.name ?? id;
}

/**
 * The overlay: five leaning plates across the middle of the screen. Click one
 * or press 1–5. The arena keeps running underneath (the wave is clear, and the
 * menu guard cuts any stray damage to 5%).
 */
export class DraftOverlay {
  private objects: Phaser.GameObjects.GameObject[] = [];
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private resolve: ((card: DraftCard) => void) | null = null;
  private cards: DraftCard[] = [];

  constructor(private scene: Phaser.Scene, private onPick?: () => void) {}

  get isOpen(): boolean { return this.objects.length > 0; }

  open(cards: DraftCard[], wave: number, botNotes: string[]): Promise<DraftCard> {
    this.close();
    this.cards = cards;
    const scene = this.scene;
    const { width: W, height: H } = scene.scale;
    const depth = 45;

    const dim = scene.add.rectangle(W / 2, H / 2, W + 4, H + 4, 0x05050c, 0.72).setDepth(depth).setInteractive();
    const title = scene.add.text(W / 2, 92, `WAVE ${wave} HELD  —  CHOOSE ONE`, {
      fontSize: '26px', fontFamily: FONT_DISPLAY, color: '#ffe9a8', stroke: '#000000', strokeThickness: 5, letterSpacing: 3,
    }).setOrigin(0.5).setDepth(depth + 1);
    const sub = scene.add.text(W / 2, 124, 'click a card, or press 1 – 5', {
      fontSize: '12px', fontFamily: FONT_UI, color: '#a8a8c8',
    }).setOrigin(0.5).setDepth(depth + 1);
    this.objects.push(dim, title, sub);

    const cw = 168, ch = 250, gap = 14;
    const total = cards.length * cw + (cards.length - 1) * gap;
    cards.forEach((card, i) => {
      const x = W / 2 - total / 2 + cw / 2 + i * (cw + gap);
      const y = H / 2 + 14;
      const style = KIND_STYLE[card.kind];
      const plate = addCardPlate(scene, { x, y, w: cw, h: ch, accent: style.color, depth: depth + 1, cut: 16 });
      const ribbon = scene.add.text(x, y - ch / 2 + 18, style.label, {
        fontSize: '11px', fontFamily: FONT_DISPLAY, color: hex(mix(style.color, 0xffffff, 0.35)), letterSpacing: 2,
      }).setOrigin(0.5).setDepth(depth + 2);
      const icon = scene.add.text(x, y - 62, card.emoji, { fontSize: '40px' }).setOrigin(0.5).setDepth(depth + 2);
      const name = scene.add.text(x, y - 18, card.title, {
        fontSize: '14px', fontFamily: FONT_DISPLAY, color: '#ffffff', align: 'center',
        wordWrap: { width: cw - 20 },
      }).setOrigin(0.5).setDepth(depth + 2);
      const desc = scene.add.text(x, y + 14, card.desc, {
        fontSize: '10px', fontFamily: FONT_UI, color: '#c8c8e0', align: 'center',
        wordWrap: { width: cw - 22 }, lineSpacing: 2, maxLines: 8,
      }).setOrigin(0.5, 0).setDepth(depth + 2);
      const foot = scene.add.text(x, y + ch / 2 - 16, `${i + 1}${rarityOf(card.kind) ? `  ·  ${rarityOf(card.kind)}` : ''}`, {
        fontSize: '10px', fontFamily: FONT_DISPLAY, color: hex(style.color), letterSpacing: 1.5,
      }).setOrigin(0.5).setDepth(depth + 2);
      const hit = scene.add.rectangle(x, y, cw, ch, 0xffffff, 0).setDepth(depth + 3).setInteractive({ useHandCursor: true });
      hit.on('pointerover', () => {
        plate.paint('hover');
        Sfx.play('ui-hover', { volume: 0.5 });
      });
      hit.on('pointerout', () => plate.paint('idle'));
      hit.on('pointerdown', () => this.pick(i));
      this.objects.push(plate.g, ribbon, icon, name, desc, foot, hit);
    });

    if (botNotes.length > 0) {
      const notes = scene.add.text(W / 2, H / 2 + 14 + ch / 2 + 22, botNotes.join('     '), {
        fontSize: '11px', fontFamily: FONT_UI, color: '#9adfa8', align: 'center', wordWrap: { width: W - 80 },
      }).setOrigin(0.5, 0).setDepth(depth + 1);
      this.objects.push(notes);
    }

    this.keyHandler = (e: KeyboardEvent) => {
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= this.cards.length) this.pick(n - 1);
    };
    scene.input.keyboard?.on('keydown', this.keyHandler);
    Sfx.play('ui-open', { volume: 0.7 });
    return new Promise((res) => { this.resolve = res; });
  }

  private pick(i: number): void {
    const card = this.cards[i];
    const res = this.resolve;
    if (!card || !res) return;
    this.resolve = null;
    this.onPick?.();
    Sfx.play('ui-equip');
    this.close();
    res(card);
  }

  close(): void {
    if (this.keyHandler) this.scene.input.keyboard?.off('keydown', this.keyHandler);
    this.keyHandler = null;
    for (const o of this.objects) o.destroy();
    this.objects = [];
  }
}
