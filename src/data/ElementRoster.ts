/**
 * The element roster — every element the game can offer, and the rules for which of
 * them a save may actually pick.
 *
 * This used to live inside MenuScene, which meant the campaign and gauntlet pickers each
 * kept their own hand-copied lists and quietly fell years behind it. Every screen that
 * offers an element now reads this one table, so a new element appears everywhere the
 * moment it lands here.
 */
import * as PlayerData from './PlayerData';
import { isCheatMode } from './Cheats';
import { Element } from '../elements/Element';
import { fireElement } from '../elements/fire';
import { waterElement } from '../elements/water';
import { lifeElement } from '../elements/life';
import { airElement } from '../elements/air';
import { earthElement } from '../elements/earth';
import { oilElement } from '../elements/oil';
import { shadowElement } from '../elements/shadow';
import { iceElement } from '../elements/ice';
import { growthElement } from '../elements/growth';
import { crystalElement } from '../elements/crystal';
import { soulElement } from '../elements/soul';
import { huntElement } from '../elements/hunt';
import { sandElement } from '../elements/sand';
import { gravityElement } from '../elements/gravity';
import { creationElement } from '../elements/creation';
import { electricityElement } from '../elements/electricity';
import { slimeElement } from '../elements/slime';
import { fateElement } from '../elements/fate';
import { soundElement } from '../elements/sound';
import { lightElement } from '../elements/light';
import { magnetElement } from '../elements/magnet';
import { metalElement } from '../elements/metal';
import { plasmaElement } from '../elements/plasma';
import { gunpowderElement } from '../elements/gunpowder';
import { rubberElement } from '../elements/rubber';
import { magicElement } from '../elements/magic';
import { technologyElement } from '../elements/technology';
import { silenceElement } from '../elements/silence';
import { echoElement } from '../elements/echo';
import { subterfugeElement } from '../elements/subterfuge';
import { quantumElement } from '../elements/quantum';
import { dummyElement } from '../elements/dummy';
import { justiceElement } from '../elements/justice';
import { dreamElement } from '../elements/dream';
import { chalkElement } from '../elements/chalk';
import { magmaElement } from '../elements/magma';
import { illusionElement } from '../elements/illusion';
import { depthsElement } from '../elements/depths';
import { ruinElement } from '../elements/ruin';
import { duneElement } from '../elements/dune';
import { paperElement } from '../elements/paper';
import { conquestElement } from '../elements/conquest';
import { passionElement } from '../elements/passion';
import { deathElement } from '../elements/death';
import { fortuneElement } from '../elements/fortune';
import { marrowElement } from '../elements/marrow';
import { psychicElement } from '../elements/psychic';
import { radiationElement } from '../elements/radiation';
import { bindElement } from '../elements/bind';
import { gumElement } from '../elements/gum';
import { gluttonyElement } from '../elements/gluttony';

/**
 * Ability data for every element that has a definition file. Keyed by element id — the
 * info and customization panels read abilities out of here.
 */
export const ELEMENT_DATA_MAP: Record<string, Element> = {
  fire: fireElement, water: waterElement, life: lifeElement, air: airElement,
  earth: earthElement, oil: oilElement, shadow: shadowElement, ice: iceElement,
  growth: growthElement, crystal: crystalElement, soul: soulElement, hunt: huntElement,
  sand: sandElement, gravity: gravityElement, creation: creationElement,
  electricity: electricityElement,
  slime: slimeElement,
  fate: fateElement,
  sound: soundElement,
  light: lightElement,
  magnet: magnetElement,
  metal: metalElement,
  plasma: plasmaElement,
  gunpowder: gunpowderElement,
  rubber: rubberElement,
  magic: magicElement,
  technology: technologyElement,
  silence: silenceElement,
  echo: echoElement,
  subterfuge: subterfugeElement,
  quantum: quantumElement,
  dummy: dummyElement,
  // Kit-less for now, but their info panels are the whole point of unlocking
  // them — leaving these out would make the ℹ button on the card do nothing.
  justice: justiceElement,
  dream: dreamElement,
  chalk: chalkElement,
  magma: magmaElement,
  illusion: illusionElement,
  depths: depthsElement,
  ruin: ruinElement,
  dune: duneElement,
  conquest: conquestElement,
  passion: passionElement,
  paper: paperElement,
  death: deathElement,
  fortune: fortuneElement,
  marrow: marrowElement,
  psychic: psychicElement,
  radiation: radiationElement,
  bind: bindElement,
  gum: gumElement,
  gluttony: gluttonyElement,
};

export interface ElementDef {
  id: string;
  name: string;
  emoji: string;
  color: number;
  available: boolean;
}

export const ELEMENTS: ElementDef[] = [
  { id: 'fire',  name: 'Fire',  emoji: '🔥', color: 0xff4400, available: true  },
  { id: 'water', name: 'Water', emoji: '💧', color: 0x0088ff, available: true  },
  { id: 'life',  name: 'Life',  emoji: '🌿', color: 0x44cc44, available: true  },
  { id: 'air',   name: 'Air',   emoji: '💨', color: 0xaaddff, available: true  },
  { id: 'earth', name: 'Earth', emoji: '🪨', color: 0x887755, available: true  },
];

export const COMBINED_ELEMENTS: ElementDef[] = [
  { id: 'oil',    name: 'Oil',    emoji: '🛢️', color: 0x664400, available: true },
  { id: 'shadow', name: 'Shadow', emoji: '🌑', color: 0x330044, available: true },
  { id: 'ice',    name: 'Ice',    emoji: '🧊', color: 0x88ccff, available: true },
  { id: 'growth',  name: 'Growth',  emoji: '🦠', color: 0x88bb22, available: true },
  { id: 'crystal', name: 'Crystal', emoji: '💎', color: 0x88ccff, available: true },
  { id: 'soul',    name: 'Soul',    emoji: '👻', color: 0xccaaff, available: true },
  { id: 'hunt',    name: 'Hunt',    emoji: '🐺', color: 0xcc4400, available: true },
  { id: 'sand',    name: 'Time',    emoji: '⏳', color: 0xffdd44, available: true },
  { id: 'gravity', name: 'Gravity', emoji: '🌌', color: 0x8844cc, available: true },
  { id: 'creation', name: 'Creation', emoji: '⚒️', color: 0xcc6622, available: true },
];

/** Abstract elements unlocked by beating a gauntlet. Each entry maps to the gauntlet ID needed. */
export const ABSTRACT_ELEMENT_UNLOCK_MAP: Record<string, string> = {
  electricity: 'fire',
  slime: 'water',
  fate: 'life',
  sound: 'air',
  light: 'earth',
};

export const ABSTRACT_ELEMENTS: ElementDef[] = [
  { id: 'electricity', name: 'Electricity', emoji: '⚡', color: 0xffee00, available: true },
  { id: 'slime', name: 'Acid', emoji: '🟢', color: 0x66cc44, available: true },
  { id: 'fate', name: 'Fate', emoji: '🃏', color: 0x88eecc, available: true },
  { id: 'sound', name: 'Sound', emoji: '🔊', color: 0xff66cc, available: true },
  { id: 'light', name: 'Light', emoji: '✨', color: 0xfff4a8, available: true },
];

/**
 * The two endings of the Devourer of Kings. Killing it grants Justice, sparing
 * it grants Dream — one run can only ever take one ending, so most saves will
 * only ever show one of these.
 *
 * Both now have kits behind them, so both are playable.
 */
export const DIVINE_ELEMENTS: ElementDef[] = [
  { id: 'justice', name: 'Justice', emoji: '⚖️', color: 0xf0d68a, available: true },
  { id: 'dream',   name: 'Dream',   emoji: '🌙', color: 0x9fb8ff, available: true },
];

/**
 * The sealed element, cut out from behind the Amalgam by finishing the campaign. Its own
 * roster because it is the only element that is not a thing on its own: a Quantum is whatever
 * pair has been bonded to it in the Entanglement Lab.
 */
export const FINALE_ELEMENTS: ElementDef[] = [
  { id: 'quantum', name: 'Quantum', emoji: '⚛️', color: 0x7df9ff, available: true },
];

/**
 * The finale elements this profile may pick, for every roster in the game.
 *
 * Cheat mode counts as unlocked rather than being asked to prove it. A cheat profile is
 * minted once by `createCheatSave()` and never topped up, so anything added to the grant list
 * afterwards is missing from every profile that already exists — the ↻ rebuild button on the
 * title screen exists for that, but a roster that quietly hides content until someone finds
 * that button is worse than one that trusts the mode.
 */
export function unlockedFinaleElements(): ElementDef[] {
  if (isCheatMode()) return FINALE_ELEMENTS;
  return FINALE_ELEMENTS.filter((e) => PlayerData.isElementUnlocked(e.id));
}

/**
 * Elements that have no obtainment yet.
 *
 * These are playable, finished kits with nothing in the game that hands them out — so the
 * only way to reach one is a cheat-mode save, which is what `isCheatMode()` gates below.
 * Deliberately *not* routed through `PlayerData.unlockElement`: an entry here is invisible
 * to every unlock, recipe and reward path in the game until it is given a real one, at which
 * point it moves out of this list and into whichever roster it actually belongs to.
 */
/**
 * Elements whose ability list is really two or three kits sharing five keys. The info panel
 * gives them a form selector rather than ten or fifteen rows in one column, and reads
 * `element.abilities` in blocks of five in exactly the order the tabs are listed here.
 */
export const ELEMENT_FORM_TABS: Record<string,
  Array<{ label: string; accent: number; text: string; hint: string }>> = {
  hunt: [
    {
      label: '🏹 HUMAN', accent: 0xcc6622, text: '#ffbb88',
      hint: 'The beast comes out on its own after 30s — Q is a clock, not a button.',
    },
    {
      label: '🐺 BEAST', accent: 0xcc2233, text: '#ff9999',
      hint: 'Beast form lasts 12s, then 50s before it takes you again.',
    },
    {
      label: '🌗 HYBRID', accent: 0x99a3ad, text: '#dde4ec',
      hint: 'Hybrid form needs the Q+ upgrade. The beast seizes the controls every 10s.',
    },
  ],
  gluttony: [
    {
      label: '👨‍🍳 CHEF', accent: 0xd6dee6, text: '#f6f2e8',
      hint: 'The grill is in the middle of the arena and the prep strip is at the top of the screen. Click a tile to hold that ingredient; right-click eats it.',
    },
    {
      label: '🔪 BUTCHER', accent: 0xa81f2b, text: '#ff9aa2',
      hint: '30 seconds, and damage comes off the hunger bar instead of your health. Eating is the only way to put time back on it.',
    },
  ],
  justice: [
    {
      label: '⚖️ GROUND', accent: 0xc9a13a, text: '#f0d68a',
      hint: 'The magistrate. F takes off — it needs 5 Willpower and runs a 2.5s cooldown.',
    },
    {
      label: '🕊️ FLIGHT', accent: 0x2f7bff, text: '#a8ccff',
      hint: '+33% speed and +20% damage taken, for 2 Willpower a second. F lands you again.',
    },
  ],
};

export const TEST_ELEMENTS: ElementDef[] = [
  { id: 'chalk', name: 'Chalk', emoji: '🖍️', color: 0xf4f1e6, available: true },
  { id: 'magma', name: 'Magma', emoji: '🌋', color: 0xff5a1e, available: true },
  { id: 'illusion', name: 'Illusion', emoji: '🎭', color: 0xb45cff, available: true },
  { id: 'depths', name: 'Depths', emoji: '🐟', color: 0x0e8f9c, available: true },
  { id: 'conquest', name: 'Conquest', emoji: '🏰', color: 0xc23a2e, available: true },
  { id: 'passion', name: 'Passion', emoji: '💘', color: 0xff5fa2, available: true },
  { id: 'ruin', name: 'Ruin', emoji: '🧱', color: 0xc4392c, available: true },
  { id: 'dune', name: 'Sand', emoji: '🏜️', color: 0xe8c87a, available: true },
  { id: 'paper', name: 'Paper', emoji: '📄', color: 0xf2ead6, available: true },
  { id: 'death', name: 'Death', emoji: '⚰️', color: 0x4a4468, available: true },
  { id: 'fortune', name: 'Fortune', emoji: '🪙', color: 0xd8a531, available: true },
  { id: 'marrow', name: 'Marrow', emoji: '🦴', color: 0xd1435c, available: true },
  { id: 'psychic', name: 'Psychic', emoji: '👁️', color: 0x9b4dff, available: true },
  { id: 'radiation', name: 'Radiation', emoji: '☢️', color: 0x7cff3d, available: true },
  { id: 'bind', name: 'Bind', emoji: '⛓️', color: 0xe0b743, available: true },
  // Slime keeps the id `gum` — `slime` still belongs to Acid, which kept the old name's slot.
  { id: 'gum', name: 'Slime', emoji: '🫠', color: 0x46b93f, available: true },
  { id: 'gluttony', name: 'Gluttony', emoji: '🍖', color: 0xd8452f, available: true },
];

/** Abstract combined elements — created by fusing two abstract elements in a Lvl 1+ Lab. */
export const ABSTRACT_COMBINED_ELEMENTS: ElementDef[] = [
  { id: 'magnet', name: 'Magnet', emoji: '🧲', color: 0xcc2244, available: true },
  { id: 'metal',  name: 'Metal',  emoji: '⚙️',  color: 0x8899aa, available: true },
  { id: 'plasma', name: 'Plasma', emoji: '🔮',  color: 0xaa22ff, available: true },
  { id: 'gunpowder', name: 'Gunpowder', emoji: '💀',  color: 0x440066, available: true },
  { id: 'echo',   name: 'Echo',   emoji: '🦇',  color: 0xccccff, available: true },
  { id: 'rubber', name: 'Rubber', emoji: '🪀', color: 0xff5577, available: true },
  { id: 'magic', name: 'Magic', emoji: '📖', color: 0x9944ff, available: true },
  { id: 'technology', name: 'Technology', emoji: '💻', color: 0x44ccaa, available: true },
  { id: 'silence', name: 'Silence', emoji: '🫥', color: 0x1a0022, available: true },
  { id: 'subterfuge', name: 'Subterfuge', emoji: '🕴️', color: 0xcc2233, available: true },
];

/**
 * Every non-base element this save may play, in roster order.
 *
 * Shared by the main menu, the campaign, the gauntlet and Quantum's bond builder — the
 * page-2-and-beyond roster is the same everywhere, so it is decided once, here.
 */
export function unlockedExtraElements(): ElementDef[] {
  const completedGauntlets = PlayerData.getCompletedGauntlets();
  const unlockedCombined = COMBINED_ELEMENTS.filter((e) => PlayerData.isElementUnlocked(e.id));
  const unlockedAbstract = ABSTRACT_ELEMENTS.filter((e) => {
    const neededGauntlet = ABSTRACT_ELEMENT_UNLOCK_MAP[e.id];
    return neededGauntlet ? completedGauntlets.includes(neededGauntlet) : false;
  });
  const unlockedAbstractCombined = ABSTRACT_COMBINED_ELEMENTS.filter((e) => PlayerData.isElementUnlocked(e.id));
  // Earned from the Devourer. Listed last so the rarest thing in the game sits
  // at the end of the roster rather than in the middle of it.
  const unlockedDivine = DIVINE_ELEMENTS.filter((e) => PlayerData.isElementUnlocked(e.id));
  const unlockedFinale = unlockedFinaleElements();
  // Elements with no obtainment yet. Gated on cheat mode rather than on a save flag, so a
  // legitimate profile can never see one however it was reached.
  const testElements = isCheatMode() ? TEST_ELEMENTS : [];
  return [
    ...unlockedCombined, ...unlockedAbstract, ...unlockedAbstractCombined, ...unlockedDivine,
    ...unlockedFinale, ...testElements,
  ];
}

/** The base five plus everything this save has unlocked — the full pickable roster. */
export function allSelectableElements(): ElementDef[] {
  return [...ELEMENTS, ...unlockedExtraElements()];
}

/**
 * The card for an element id, unlocked or not. Covers every roster including the ones a
 * save may not own, because this is also how an *opponent* is named on a versus line.
 */
export function findElementDef(id: string): ElementDef | undefined {
  if (id === 'dummy') return { id: 'dummy', name: 'Dummy', emoji: '🎯', color: 0x888888, available: true };
  return ELEMENTS.find((e) => e.id === id)
    ?? COMBINED_ELEMENTS.find((e) => e.id === id)
    ?? ABSTRACT_ELEMENTS.find((e) => e.id === id)
    ?? ABSTRACT_COMBINED_ELEMENTS.find((e) => e.id === id)
    ?? DIVINE_ELEMENTS.find((e) => e.id === id)
    ?? FINALE_ELEMENTS.find((e) => e.id === id)
    ?? TEST_ELEMENTS.find((e) => e.id === id);
}
