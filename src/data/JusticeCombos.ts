/**
 * The Rules of Law — every combo Combo Excelsius pays out for, and what each one is worth.
 *
 * Justice Mastery puts a style meter across the top of the screen. It is not a damage tally:
 * dealing damage is worth nothing at all. What it pays for is *arrangement* — a thing you set up
 * earlier being the reason a thing that just happened worked. Pushing somebody into a wall of
 * fire you laid two seconds ago is style. Shooting them is a Tuesday.
 *
 * ## The ladder
 *
 * Six tiers, 100 style each. The bar fills to 100, the letter goes up, the bar empties and
 * starts again — and it bleeds down the whole time, faster the higher you are, so a rank is
 * something you hold rather than something you reach. Every tier is worth more Willpower
 * regeneration, more movement and more cooldown reduction; **S** is worth one thing more, which
 * is that Judgement Day stops weighing anybody and simply returns the worst verdict there is.
 *
 * ## Adding a combo
 *
 * Add a row to {@link JUSTICE_COMBOS} and award it from JusticeKit with `awardStyle(id)`. The
 * **Rules of Law** tab on Justice's info screen renders this table verbatim, so a combo that is
 * awarded but not listed here is a combo nobody can find out about.
 */

/** How a combo is categorised, for the codex page's section headings. */
export type ComboKind =
  | 'arena'     // the Coliseum, the flame pillar, the arena walls
  | 'chain'     // the grappling chain, a ripped wall, a bind
  | 'spear'     // the stab, the throw, the angel bites, an execution
  | 'nerve'     // surviving something you should not have
  | 'flight'    // things that only happen in the air
  | 'verdict';  // the two set pieces

export interface ComboDef {
  /** Stable id. `awardStyle` takes this. */
  id: string;
  name: string;
  kind: ComboKind;
  /** Style points. Anything under 8 is a flourish; 30+ should be genuinely hard. */
  style: number;
  /** What you have to do. Written so a reader can go and do it. */
  how: string;
  /**
   * Milliseconds this combo may not be re-awarded for. Stops a repeatable interaction — a
   * pillar somebody is standing in, a wall they are pinned against — from being a style tap.
   */
  cooldownMs?: number;
}

export const JUSTICE_COMBOS: ComboDef[] = [
  // ── The arena ──────────────────────────────────────────────────────────────
  {
    id: 'coliseum-pillar', name: 'Trial by Fire', kind: 'arena', style: 30,
    how: 'Raise a Pillar of Flame inside a Coliseum with somebody in it. The ring means they cannot walk out of the fire, which is the entire idea.',
    cooldownMs: 6000,
  },
  {
    id: 'coliseum-trap', name: 'Court Is In Session', kind: 'arena', style: 18,
    how: 'Raise a Coliseum with an enemy already inside the radius. Fencing somebody in is worth style; fencing yourself in alone is not.',
    cooldownMs: 4000,
  },
  {
    id: 'coliseum-shot', name: 'Objection', kind: 'arena', style: 6,
    how: 'A Coliseum wall eats a shot that was aimed at you.',
    cooldownMs: 1200,
  },
  {
    id: 'pillar-pin', name: 'Held to the Fire', kind: 'arena', style: 20,
    how: 'With the R⁺ upgrade making the pillar solid, hold somebody against the burning face of it for a full second.',
    cooldownMs: 3000,
  },
  {
    id: 'spike-kill', name: 'Nailed to the World', kind: 'arena', style: 25,
    how: 'Finish somebody on the E⁺ holy spikes — the arena border, or the leading face of a wall you drove across it.',
  },
  {
    id: 'arena-corner', name: 'No Way Out', kind: 'arena', style: 15,
    how: 'Drive a ripped wall into somebody who is already pressed against a Coliseum. Two of your own walls, and them between them.',
    cooldownMs: 5000,
  },

  // ── The chain ──────────────────────────────────────────────────────────────
  {
    id: 'wall-pillar', name: 'Into the Blaze', kind: 'chain', style: 35,
    how: 'Push somebody into a Pillar of Flame with a ripped-out wall. The wall does the moving, the fire does the rest.',
    cooldownMs: 4000,
  },
  {
    id: 'wall-impact', name: 'Compacted', kind: 'chain', style: 22,
    how: 'Let a ripped wall carry somebody the whole way and take the impact at the far side.',
  },
  {
    id: 'wall-coliseum', name: 'Between a Rock', kind: 'chain', style: 28,
    how: 'Crush somebody between a moving wall and the outside of one of your Coliseums.',
    cooldownMs: 4000,
  },
  {
    id: 'chain-pierce-two', name: 'Strung Together', kind: 'chain', style: 14,
    how: 'Put one grappling chain through two bodies on its way to the wall.',
  },
  {
    id: 'chain-anchor-rip', name: 'Tear It Down', kind: 'chain', style: 8,
    how: 'Hook a wall and rip it out on the recast. The throw is free; using it is the combo.',
    cooldownMs: 2500,
  },
  {
    id: 'bind-then-wall', name: 'Sentenced and Served', kind: 'chain', style: 30,
    how: 'Drive a wall through somebody who is still in chains from a Judgement Day verdict.',
  },

  // ── The spear ──────────────────────────────────────────────────────────────
  {
    id: 'execute', name: 'Executed', kind: 'spear', style: 40,
    how: 'Take somebody apart with the Click⁺ execution. Three angel bites open and their health under 15%.',
  },
  {
    id: 'execute-triple-bite', name: 'Three Counts', kind: 'spear', style: 20,
    how: 'Get three angel bites open on one body at once, at any health.',
    cooldownMs: 5000,
  },
  {
    id: 'stab-through-pillar', name: 'Through the Fire', kind: 'spear', style: 18,
    how: 'Land a thrown spear on somebody standing in your own Pillar of Flame.',
    cooldownMs: 2500,
  },
  {
    id: 'spear-airburst', name: 'Spear of Heaven', kind: 'spear', style: 12,
    how: 'Burst a thrown spear on two or more bodies at once from the air.',
    cooldownMs: 2000,
  },
  {
    id: 'axe-chain', name: 'Death from Above', kind: 'spear', style: 16,
    how: 'Land four F⁺ axe swings on the same body inside the five-second window without missing one.',
  },
  {
    id: 'stab-stunned', name: 'Contempt of Court', kind: 'spear', style: 10,
    how: 'Land a melee hit on somebody who is stunned by one of your own walls or verdicts.',
    cooldownMs: 2000,
  },

  // ── Nerve ──────────────────────────────────────────────────────────────────
  {
    id: 'one-hp-survive', name: 'Sheer Will', kind: 'nerve', style: 45,
    how: 'Survive on 1 health because Indomitable Will refused to let you go below it.',
    cooldownMs: 8000,
  },
  {
    id: 'righteous-spend', name: 'Righteous', kind: 'nerve', style: 12,
    how: 'Cash in the +33% Sheer Will banks for you when somebody hits you while your will is burning.',
    cooldownMs: 1500,
  },
  {
    id: 'low-hp-kill', name: 'Last Word', kind: 'nerve', style: 50,
    how: 'Finish somebody while you are under 10% health yourself.',
  },
  {
    id: 'empty-will-hold', name: 'Nothing Left', kind: 'nerve', style: 20,
    how: 'Land a killing blow within two seconds of your Willpower bar hitting zero.',
  },
  {
    id: 'no-damage-window', name: 'Untouched', kind: 'nerve', style: 25,
    how: 'Go fifteen seconds without taking a single point of damage while your rank is C or above.',
    cooldownMs: 15000,
  },

  // ── The air ────────────────────────────────────────────────────────────────
  {
    id: 'flight-descend-kill', name: 'Grounded', kind: 'flight', style: 30,
    how: 'Take off, and land the killing blow within three seconds of putting your feet back down.',
  },
  {
    id: 'flight-over-own-wall', name: 'Above the Law', kind: 'flight', style: 10,
    how: 'Fly over your own Coliseum wall while somebody who is not you is stuck behind it.',
    cooldownMs: 4000,
  },
  {
    id: 'barrage-cluster', name: 'Rain of Spears', kind: 'flight', style: 28,
    how: 'Land twenty spears of one Vigilante Vengeance barrage on a single body.',
  },
  {
    id: 'barrage-homing', name: 'Guided Verdict', kind: 'flight', style: 22,
    how: 'Have barrage spears home in on a body carrying all three angel bites.',
  },
  {
    id: 'stance-dance', name: 'Both Feet, Neither Floor', kind: 'flight', style: 15,
    how: 'Change stance twice inside four seconds and land a hit in each one.',
    cooldownMs: 6000,
  },

  // ── The set pieces ─────────────────────────────────────────────────────────
  {
    id: 'verdict-damned', name: 'Damned', kind: 'verdict', style: 35,
    how: 'Return a DAMNED verdict on Judgement Day. It needs 300 damage on the record — or S rank, which stops asking.',
  },
  {
    id: 'verdict-guilty', name: 'Guilty', kind: 'verdict', style: 20,
    how: 'Return any GUILTY verdict on Judgement Day.',
  },
  {
    id: 'verdict-kill', name: 'Capital Sentence', kind: 'verdict', style: 40,
    how: 'Finish somebody while they are still in the chains a verdict put them in.',
  },
  {
    id: 'seraph-trance-kill', name: 'They Walked Into It', kind: 'verdict', style: 32,
    how: 'Finish somebody who is walking toward you entranced by the Seraph.',
  },
  {
    id: 'seraph-swap', name: 'Swift and Blind', kind: 'verdict', style: 26,
    how: 'Swap health with somebody on the scales when they have more of it than you do.',
  },
  {
    id: 'vengeance-wall', name: 'Kicked Into the Wall', kind: 'verdict', style: 34,
    how: 'Kick somebody off the Vigilante Vengeance spear hard enough to put them into a wall.',
  },
  {
    id: 'vengeance-pillar', name: 'Kicked Into the Fire', kind: 'verdict', style: 38,
    how: 'Kick somebody off the Vigilante Vengeance spear straight into a Pillar of Flame.',
  },
  {
    id: 'vengeance-moving-wall', name: 'Kicked Into the Wall (Moving)', kind: 'verdict', style: 42,
    how: 'Kick somebody off the spear into a wall that is itself still crossing the arena. Both of them are yours.',
  },
];

/** The six style ranks, worst first. */
export interface StyleRank {
  letter: string;
  name: string;
  color: number;
  text: string;
  /** Style bleed per second while sitting in this rank. */
  decay: number;
  /** Willpower regeneration multiplier. */
  will: number;
  /** Movement multiplier. */
  speed: number;
  /** Cooldown multiplier. */
  cooldown: number;
}

export const STYLE_RANKS: StyleRank[] = [
  { letter: 'D', name: 'DUTIFUL',    color: 0x8a8f9c, text: '#b9bfcc', decay: 2,  will: 1,    speed: 1,    cooldown: 1 },
  { letter: 'C', name: 'CORRECT',    color: 0x6fb0e8, text: '#a8d4ff', decay: 3,  will: 1.15, speed: 1.04, cooldown: 0.95 },
  { letter: 'B', name: 'BRUTAL',     color: 0x5fd8a0, text: '#a8ffd8', decay: 4,  will: 1.3,  speed: 1.08, cooldown: 0.9 },
  { letter: 'A', name: 'ABSOLUTE',   color: 0xf0d68a, text: '#ffeeb0', decay: 6,  will: 1.5,  speed: 1.12, cooldown: 0.84 },
  { letter: 'S', name: 'SOVEREIGN',  color: 0xff8a3c, text: '#ffc48a', decay: 8,  will: 1.75, speed: 1.17, cooldown: 0.76 },
  { letter: 'SS', name: 'BEYOND JUSTICE', color: 0xff3b5c, text: '#ff9aae', decay: 11, will: 2, speed: 1.22, cooldown: 0.68 },
];

/** Style needed to move up one rank. */
export const STYLE_PER_RANK = 100;

/** The rank index at which Judgement Day stops weighing anybody. */
export const BEYOND_JUSTICE_RANK = 4;

export function getCombo(id: string): ComboDef | undefined {
  return JUSTICE_COMBOS.find((c) => c.id === id);
}

/** Every combo of one kind, for the codex page's sections. */
export function combosOfKind(kind: ComboKind): ComboDef[] {
  return JUSTICE_COMBOS.filter((c) => c.kind === kind);
}

/** Display names for the section headings on the Rules of Law page. */
export const COMBO_KIND_LABELS: Record<ComboKind, { label: string; blurb: string; color: number }> = {
  arena:   { label: 'THE ARENA', blurb: 'The Coliseum, the Pillar of Flame and the border you are allowed to weaponise.', color: 0xc9a13a },
  chain:   { label: 'THE CHAIN', blurb: 'Hooking a wall out of the world and driving it through somebody.', color: 0x7d5f22 },
  spear:   { label: 'THE SPEAR', blurb: 'The stab, the throw, the bites they open and the execution they earn.', color: 0xfff3cf },
  nerve:   { label: 'NERVE', blurb: 'Style for surviving what you should not have survived.', color: 0x2f7bff },
  flight:  { label: 'THE AIR', blurb: 'Everything that can only be done with your feet off the floor.', color: 0xa8ccff },
  verdict: { label: 'THE VERDICT', blurb: 'The set pieces, and the vengeance that ends them.', color: 0xff8a3c },
};
