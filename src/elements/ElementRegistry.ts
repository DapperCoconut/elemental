import { Element } from './Element';
import { airElement } from './air';
import { marrowElement } from './marrow';
import { bindElement } from './bind';
import { chalkElement } from './chalk';
import { conquestElement } from './conquest';
import { creationElement } from './creation';
import { crystalElement } from './crystal';
import { deathElement } from './death';
import { depthsElement } from './depths';
import { dreamElement } from './dream';
import { earthElement } from './earth';
import { echoElement } from './echo';
import { electricityElement } from './electricity';
import { fateElement } from './fate';
import { fireElement } from './fire';
import { fortuneElement } from './fortune';
import { duneElement } from './dune';
import { gluttonyElement } from './gluttony';
import { gravityElement } from './gravity';
import { growthElement } from './growth';
import { gumElement } from './gum';
import { gunpowderElement } from './gunpowder';
import { huntElement } from './hunt';
import { iceElement } from './ice';
import { illusionElement } from './illusion';
import { justiceElement } from './justice';
import { kingElement } from './king';
import { lifeElement } from './life';
import { lightElement } from './light';
import { magicElement } from './magic';
import { magmaElement } from './magma';
import { magnetElement } from './magnet';
import { metalElement } from './metal';
import { oilElement } from './oil';
import { paperElement } from './paper';
import { passionElement } from './passion';
import { plasmaElement } from './plasma';
import { psychicElement } from './psychic';
import { quantumElement } from './quantum';
import { radiationElement } from './radiation';
import { rubberElement } from './rubber';
import { ruinElement } from './ruin';
import { sandElement } from './sand';
import { shadowElement } from './shadow';
import { silenceElement } from './silence';
import { slimeElement } from './slime';
import { soulElement } from './soul';
import { soundElement } from './sound';
import { subterfugeElement } from './subterfuge';
import { technologyElement } from './technology';
import { waterElement } from './water';

/**
 * Every element in the game, by id.
 *
 * Lifted out of ArenaScene so that things which are not scenes can ask what an element is
 * called or what abilities it has — bond research (`QuantumBonds.ts`) composes its quests out
 * of real ability names, and a data module cannot import a Phaser scene to find them.
 */
export const ELEMENT_MAP: Record<string, Element> = {
  fire:   fireElement,
  water:  waterElement,
  life:   lifeElement,
  air:    airElement,
  earth:  earthElement,
  oil:    oilElement,
  shadow: shadowElement,
  ice:     iceElement,
  growth:  growthElement,
  crystal: crystalElement,
  soul:    soulElement,
  hunt:    huntElement,
  sand:    sandElement,
  gravity: gravityElement,
  creation: creationElement,
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
  king: kingElement,
  // Rewards for the two endings of the Devourer fight. Their kits are not
  // written yet, so MenuScene lists them as unavailable — these entries exist
  // so the info panel and any future wiring have a real Element to read.
  justice: justiceElement,
  dream: dreamElement,
  // Late-roster elements: the unstable ten out of the Disgraced Lab, and the seven behind
  // the Vault's mimic chests — see `ElementRoster.VAULT_ELEMENTS`.
  chalk: chalkElement,
  magma: magmaElement,
  illusion: illusionElement,
  depths: depthsElement,
  conquest: conquestElement,
  passion: passionElement,
  ruin: ruinElement,
  dune: duneElement,
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
