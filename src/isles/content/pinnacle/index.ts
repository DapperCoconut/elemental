import type { IsleBundle, PinnacleTierBundle } from '../../IslesTypes';
import { OBS } from '../../art/PinnacleArt';
import { KING_ID, PIN_LANDING, PIN_SUMMIT } from './spec';
import { PIN_LANDING_BUNDLE } from './landing';
import { PIN_SUMMIT_BUNDLE } from './summit';
import { PIN_CUTSCENES } from './cine';
import { OBSIDIAN_KING } from './king';
import { PIN_FIRE } from './benches/fire';
import { PIN_WATER } from './benches/water';
import { PIN_LIFE } from './benches/life';
import { PIN_AIR } from './benches/air';
import { PIN_EARTH } from './benches/earth';
import { PIN_ELECTRICITY } from './benches/electricity';
import { PIN_SLIME } from './benches/slime';
import { PIN_FATE } from './benches/fate';
import { PIN_SOUND } from './benches/sound';
import { PIN_LIGHT } from './benches/light';

/**
 * The Obsidian Pinnacle — the black spire in the middle of the sea, and the end of the campaign.
 *
 * A landing at its foot, ten benches climbed in the order the isles were freed (six councilors on
 * each: one seat per element, sixty in all, every one of them *perfected*), and the Crownless Hall
 * at the top where the Obsidian King sits. It rides the registry as an eleventh bundle marked
 * `pinnacle` — it has no courts, no genes and no place on the dock's list of isles; its route opens
 * when the tenth monarch falls. Design: `docs/ten-isles/pinnacle.md`.
 */
const TIERS: PinnacleTierBundle[] = [
  PIN_FIRE, PIN_WATER, PIN_LIFE, PIN_AIR, PIN_EARTH, PIN_ELECTRICITY, PIN_SLIME, PIN_FATE, PIN_SOUND, PIN_LIGHT,
];

export const PINNACLE_ISLE: IsleBundle = {
  isle: {
    id: 'pinnacle',
    name: 'The Obsidian Pinnacle',
    // The body under the King's rig — the star he is.
    element: 'astra',
    monarch: { id: KING_ID, name: 'The Obsidian King', title: 'the Throne Above the Sea', artifact: 'art-obsidian-king' },
    courts: [],
    port: PIN_LANDING,
    color: OBS.seam,
    chart: { x: 0.5, y: 0.5 },
    outer: true,
    pinnacle: true,
  },
  wanderer: PIN_LANDING_BUNDLE.wanderer,
  courts: [],
  areas: [PIN_LANDING_BUNDLE.area, ...TIERS.map((t) => t.area), PIN_SUMMIT_BUNDLE.area],
  quests: [],
  encounters: TIERS.flatMap((t) => t.encounters),
  gimmicks: TIERS.flatMap((t) => t.gimmicks),
  bosses: [OBSIDIAN_KING],
  items: [...PIN_LANDING_BUNDLE.items, ...TIERS.flatMap((t) => t.items), ...PIN_SUMMIT_BUNDLE.items],
  scripts: Object.assign({}, PIN_LANDING_BUNDLE.scripts, ...TIERS.map((t) => t.scripts), PIN_SUMMIT_BUNDLE.scripts),
  shops: PIN_LANDING_BUNDLE.shops,
  bakeries: PIN_LANDING_BUNDLE.bakeries,
  fish: [],
  fisheries: [],
  rods: [],
  genes: [],
  ubers: [],
  floors: {
    ...Object.fromEntries(TIERS.map((t) => [t.area.id, t.floor])),
    [PIN_SUMMIT]: PIN_SUMMIT_BUNDLE.floor,
  },
  cutscenes: [
    ...PIN_CUTSCENES, ...PIN_LANDING_BUNDLE.cutscenes, ...TIERS.flatMap((t) => t.cutscenes), ...PIN_SUMMIT_BUNDLE.cutscenes,
  ],
};
