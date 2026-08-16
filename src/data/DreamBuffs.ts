/**
 * The Dream Journal — every boon Lifelong Dream can hand out, element by element.
 *
 * Dream Mastery's bindable ability asks you to pick an element and then hold the thought for
 * ten seconds. When the counter runs out the dream comes true, and you are given *everything
 * that element could ever be given*: not its abilities — you keep your own keys — but every
 * standing buff its own kit, its own upgrades and its own mastery are capable of putting on the
 * body that wears it, all at once and for the rest of the match.
 *
 * ## The model
 *
 * A boon is a bundle of stat writes. Nothing here spawns anything, aims anything or has a
 * cooldown: a dream is what it *feels like* to be that element, distilled to numbers that
 * DreamKit can hold on a Fighter every frame. Every field is optional and every field composes
 * — an element with four boons that each nudge `damage` is a body dealing the product of all
 * four.
 *
 * Three of the fields are one-shots rather than upkeep (`maxHp`, `shield`, `charges`): they are
 * paid once at the moment the dream lands, and handed back by `DreamKit.reset()`.
 *
 * ## Adding an element
 *
 * Put it in {@link DREAM_BOONS} keyed by element id. Two to four boons is the shape — each one
 * named after a real thing in that element's kit, so a reader who knows the element recognises
 * what they are being given. The **Dream Journal** tab on Dream's info screen renders this table
 * verbatim, so a boon with no `blurb` is a boon nobody can read about.
 *
 * Deliberately absent: `dream` itself (you cannot dream of being yourself) and `quantum` (it is
 * not an element, it is a pair of them — see `QuantumKit`). Everything else on the roster is
 * here, all 48 of them.
 */

/** One standing buff. Every field is optional; a boon is whichever ones it sets. */
export interface DreamBoon {
  emoji: string;
  name: string;
  /** One sentence in the element's own language. The journal and the pop-up both read this. */
  blurb: string;

  // ── Upkeep: written onto the body every frame while the dream holds ──
  /** Movement multiplier. 1.2 = 20% faster. */
  speed?: number;
  /** Outgoing damage multiplier. */
  damage?: number;
  /** Incoming damage multiplier. Below 1 is armour. */
  armor?: number;
  /** Cooldown multiplier. Below 1 is faster. */
  cooldown?: number;
  /** Health per second. */
  regen?: number;
  /** Fraction of the damage landing on your enemy that comes back to you as health. */
  lifesteal?: number;
  /** Fraction of the damage landing on *you* that is thrown back at whoever is nearest. */
  thorns?: number;
  /** Floor under `dodgeChance`, re-asserted every frame so spending it never empties it. */
  dodge?: number;
  /** Added to `critChance`. */
  crit?: number;
  /** Raises `critMult` to at least this. */
  critMult?: number;
  /** Damage a second to anything standing on top of you. */
  contact?: number;
  /** Flat amount subtracted from every incoming hit, before anything else. */
  flatCut?: number;
  /** Ceiling on any single hit. */
  cap?: number;
  /** Body scale. Below 1 is a smaller target. */
  size?: number;
  /** Health may not be driven below this. */
  floor?: number;
  /** Nothing can force-move you. */
  knockbackImmune?: boolean;
  /** Every stun, root and slow in the game slides off. */
  unstoppable?: boolean;
  /** You are off the floor: static hazards cannot reach you. */
  levitate?: boolean;
  /** Burn, poison, frost and every other tick is scrubbed off you as it lands. */
  cleanse?: boolean;
  /** Projectiles pass straight through you. */
  phase?: boolean;

  // ── One-shots: paid once when the dream lands ──
  /** Flat maximum health, granted and healed for the same amount. */
  maxHp?: number;
  /** Shield HP handed over once. */
  shield?: number;
  /** Shield charges handed over once. */
  charges?: number;
}

/**
 * Every element's dream, keyed by element id. Order inside a list is the order the journal
 * prints them and the order the pop-ups announce them in.
 */
export const DREAM_BOONS: Record<string, DreamBoon[]> = {
  // ── The base five ──────────────────────────────────────────────────────────
  fire: [
    { emoji: '🔥', name: 'Flame Body', blurb: 'You are on fire, permanently, and it only burns other people. 8 damage a second to anything standing on you.', contact: 8, damage: 1.15 },
    { emoji: '🌋', name: 'Burning Body', blurb: 'Nothing sticks to a bonfire. Burn, poison, frost and every other tick is scrubbed off the moment it lands.', cleanse: true },
    { emoji: '☀️', name: 'Exposed', blurb: 'You see where the next hit should go. 15% of everything you throw comes out double.', crit: 0.15 },
  ],
  water: [
    { emoji: '⛲', name: 'Pressure Rider', blurb: 'You are riding your own geyser and you never come down. 25% faster.', speed: 1.25 },
    { emoji: '🌊', name: 'Slipstream', blurb: 'The water gets out of your way and closes behind you — a fifth off every cooldown.', cooldown: 0.8 },
    { emoji: '🗡️', name: 'Laminar Edge', blurb: 'Everything you hold is a pressure dagger. 15% more damage, and a fifth of it comes back to you.', damage: 1.15, lifesteal: 0.2 },
  ],
  life: [
    { emoji: '🌿', name: 'Photosynthesis', blurb: 'You are growing again, all the time. 5 health a second, forever.', regen: 5 },
    { emoji: '🌹', name: 'Thorns', blurb: 'You are unpleasant to touch. A quarter of everything that lands on you goes back the way it came.', thorns: 0.25 },
    { emoji: '🌻', name: 'Deep Roots', blurb: 'A bigger pool to grow into: 60 more health, handed over full.', maxHp: 60 },
  ],
  air: [
    { emoji: '💨', name: 'Wind Dancer', blurb: 'You are never quite where the hit was aimed. A third of everything simply misses.', dodge: 0.33 },
    { emoji: '🌪️', name: 'Spin Dance', blurb: 'The air keeps handing your abilities back. A third off every cooldown.', cooldown: 0.67 },
    { emoji: '🕊️', name: 'Gale Step', blurb: 'Nothing heavy enough to shove you exists any more, and you move 20% faster.', speed: 1.2, knockbackImmune: true },
  ],
  earth: [
    { emoji: '🪨', name: 'Unbreakable', blurb: 'No single hit in the game may take more than 25 off you, and nothing can push you an inch.', cap: 25, knockbackImmune: true },
    { emoji: '🛡️', name: 'Shield Up', blurb: 'A slab of stone across your arm: 80 shield health, and 4 off every hit that gets past it.', shield: 80, flatCut: 4 },
    { emoji: '⛰️', name: 'Titan Form', blurb: 'Bigger, heavier, harder to hurt. 20% larger and a fifth less damage taken.', size: 1.2, armor: 0.8 },
  ],

  // ── Combined ───────────────────────────────────────────────────────────────
  oil: [
    { emoji: '🛢️', name: 'Slick', blurb: 'Everything slides off you and you slide off everything. 20% faster, 10% less taken.', speed: 1.2, armor: 0.9 },
    { emoji: '🚁', name: 'Drone Array', blurb: 'Three drones you never asked for, holding station. 25% less damage taken.', armor: 0.75 },
    { emoji: '🔥', name: 'Oily Burn', blurb: 'You are flammable in the way a threat is flammable. 6 damage a second to anything touching you.', contact: 6 },
  ],
  shadow: [
    { emoji: '🌑', name: 'Hopelessness', blurb: 'Being near you is exhausting. Whoever you are fighting deals a quarter less.', armor: 0.75 },
    { emoji: '🩸', name: 'Dark Drain', blurb: 'Every wound you open feeds you. A third of the damage landing on them lands on your health bar as a gift.', lifesteal: 0.33 },
    { emoji: '🕳️', name: 'Dark Resonance', blurb: 'The dark makes room for you: 15% more damage and a smaller silhouette.', damage: 1.15, size: 0.85 },
  ],
  ice: [
    { emoji: '🧊', name: 'Permafrost', blurb: 'A rind of ice over everything. 20% less damage taken and 5 off every hit.', armor: 0.8, flatCut: 5 },
    { emoji: '❄️', name: 'Frostbite', blurb: 'Standing next to you costs blood. 7 damage a second to anything in contact.', contact: 7 },
    { emoji: '🥌', name: 'Curling Stone', blurb: 'You slide instead of walking, and nothing stops a stone. 15% faster, unshovable.', speed: 1.15, knockbackImmune: true },
  ],
  growth: [
    { emoji: '🦠', name: 'Titanic', blurb: 'You evolved upward. 80 more health and a body a fifth wider.', maxHp: 80, size: 1.2 },
    { emoji: '🧬', name: 'Regenerative', blurb: 'A cell line that will not stop dividing. 4 health a second.', regen: 4 },
    { emoji: '🌵', name: 'Spines', blurb: 'Every surface of you is a hazard. 10 damage a second on contact, and a fifth of what you take goes back.', contact: 10, thorns: 0.2 },
    { emoji: '🐚', name: 'Carapace', blurb: 'A shell grown over a shell. 15% less damage taken.', armor: 0.85 },
  ],
  crystal: [
    { emoji: '💎', name: 'Facets', blurb: 'Three shells of grown crystal, and each one eats a whole hit.', charges: 3 },
    { emoji: '🔷', name: 'Refraction', blurb: 'Light bends round you and comes back sharp. 30% of what lands on you goes back at whoever threw it.', thorns: 0.3 },
    { emoji: '🪞', name: 'Shredder', blurb: 'Everything you touch is being cut by something with an edge. 20% more damage.', damage: 1.2 },
  ],
  soul: [
    { emoji: '👻', name: 'Strength in Numbers', blurb: 'You are never fighting alone, even when you are. 30% less damage taken.', armor: 0.7 },
    { emoji: '🕯️', name: 'Death Whistle', blurb: 'The dead keep paying you back. A quarter of the damage you cause comes home as health.', lifesteal: 0.25 },
    { emoji: '⚰️', name: 'Arise', blurb: '2 health a second, and a body that is already half elsewhere.', regen: 2, size: 0.9 },
  ],
  hunt: [
    { emoji: '🐺', name: 'Beast Form', blurb: 'The beast is out and it is not going back in. 30% faster, 25% more damage.', speed: 1.3, damage: 1.25 },
    { emoji: '🩸', name: 'Blood Scent', blurb: 'You can smell where the soft part is. A quarter of your hits land double.', crit: 0.25 },
    { emoji: '💉', name: 'Adrenaline', blurb: 'Nothing gets to hold you still. Every stun, root and slow slides straight off.', unstoppable: true },
  ],
  sand: [
    { emoji: '⏳', name: 'Manipulation', blurb: 'Your own clock runs at a different speed to everyone else\'s. Half the cooldown on everything.', cooldown: 0.5 },
    { emoji: '🕰️', name: 'Rush', blurb: 'The world is moving through treacle and you are not. 25% faster.', speed: 1.25 },
    { emoji: '⌛', name: 'Remain', blurb: 'A version of you that has already survived this. 15% less damage taken.', armor: 0.85 },
  ],
  gravity: [
    { emoji: '🌌', name: 'Moon Rider', blurb: 'Your feet are not on the floor and nothing on it can reach you.', levitate: true, knockbackImmune: true },
    { emoji: '🌠', name: 'Gravity Aura', blurb: 'Everything near you is falling toward you, including the hits. 20% less damage taken.', armor: 0.8 },
    { emoji: '☄️', name: 'Starfall', blurb: 'Something enormous is following you around. 20% more damage.', damage: 1.2 },
  ],
  creation: [
    { emoji: '⚒️', name: 'Buff Potion', blurb: 'Green glass, drunk and never wearing off. 25% more damage.', damage: 1.25 },
    { emoji: '🧪', name: 'Protection Potion', blurb: 'Blue glass, same deal. 25% less damage taken.', armor: 0.75 },
    { emoji: '🥾', name: 'Speed Pad', blurb: 'The floor helps. 20% faster.', speed: 1.2 },
    { emoji: '🧱', name: 'Piston Push', blurb: 'A machined frame under the skin: 70 shield health and no shoving you off it.', shield: 70, knockbackImmune: true },
  ],

  // ── Abstract ───────────────────────────────────────────────────────────────
  electricity: [
    { emoji: '⚡', name: 'Kinetic Shield', blurb: 'A field of stored charge you never spend. 25% less damage taken.', armor: 0.75 },
    { emoji: '🔌', name: 'Charged', blurb: 'Everything happens sooner. A quarter off every cooldown and 20% faster on your feet.', cooldown: 0.75, speed: 1.2 },
    { emoji: '💥', name: 'Discharge', blurb: 'Standing next to you completes a circuit. 9 damage a second on contact.', contact: 9 },
  ],
  slime: [
    { emoji: '🟢', name: 'Acid Walker', blurb: 'You leave a burn wherever you have been, and anything in reach of you is dissolving. 10 a second.', contact: 10 },
    { emoji: '🧫', name: 'Purge', blurb: 'Nothing survives contact with your bloodstream. Every burn, poison and freeze is scrubbed off.', cleanse: true },
    { emoji: '🐍', name: 'Burrow', blurb: 'Half of you is under the floor. 20% less damage taken and 15% faster.', armor: 0.8, speed: 1.15 },
  ],
  fate: [
    { emoji: '🃏', name: 'All In', blurb: 'The deck is on your side. 30% of your hits come out double, and doubles are worth two and a half.', crit: 0.3, critMult: 2.5 },
    { emoji: '🎲', name: 'Preserve', blurb: 'The cards keep dealing you the out. A quarter of everything aimed at you simply misses.', dodge: 0.25 },
    { emoji: '✨', name: 'Enchant', blurb: 'Everything you own has a rune on it. 15% more damage.', damage: 1.15 },
  ],
  sound: [
    { emoji: '🔊', name: 'Hype', blurb: 'The crowd never stops and neither do you. A third off every cooldown.', cooldown: 0.67 },
    { emoji: '🎻', name: 'Soloist', blurb: 'You are the only thing anyone can hear. 25% more damage.', damage: 1.25 },
    { emoji: '🎧', name: 'Sound System', blurb: 'A wall of bass between you and the room. 20% less damage taken.', armor: 0.8 },
  ],
  light: [
    { emoji: '✨', name: 'Unstoppable', blurb: 'Light does not get held. Every stun, root and slow slides off.', unstoppable: true },
    { emoji: '🏎️', name: 'Speed of Light', blurb: 'You are travelling faster than the fight is. 35% faster.', speed: 1.35 },
    { emoji: '🔦', name: 'Lance', blurb: 'Everything you throw arrives sharpened. 20% more damage.', damage: 1.2 },
  ],

  // ── Abstract combined ──────────────────────────────────────────────────────
  magnet: [
    { emoji: '🧲', name: 'Protect', blurb: 'An orb of held iron between you and the room. 90 shield health.', shield: 90 },
    { emoji: '🔩', name: 'Nail Implant', blurb: 'There is metal under your skin and it is pointed outward. 30% of what you take goes back.', thorns: 0.3 },
    { emoji: '🛹', name: 'Mag-Lev', blurb: 'You are riding a board that does not touch the ground. 20% faster and nothing pushes you.', speed: 1.2, knockbackImmune: true },
  ],
  metal: [
    { emoji: '⚙️', name: 'Natural Clot', blurb: 'You stop bleeding before the wound finishes opening. 6 off every incoming hit.', flatCut: 6 },
    { emoji: '🛡️', name: 'Steel Shield', blurb: 'Plate, worn permanently. 25% less damage taken.', armor: 0.75 },
    { emoji: '🩸', name: 'Blood Blade', blurb: 'The blade drinks. 20% more damage and a fifth of it comes back.', damage: 1.2, lifesteal: 0.2 },
  ],
  plasma: [
    { emoji: '🔮', name: 'Pure Chaos', blurb: 'You are not a body any more, you are an event. 30% more damage.', damage: 1.3 },
    { emoji: '⚛️', name: 'Current', blurb: 'The air round you is ionised. 11 damage a second to anything touching you.', contact: 11 },
    { emoji: '🌀', name: 'Arena', blurb: 'The hazards are yours now. 15% less damage taken and nothing shoves you.', armor: 0.85, knockbackImmune: true },
  ],
  gunpowder: [
    { emoji: '💀', name: 'Fire at Will', blurb: 'Every barrel is loaded. A third off every cooldown.', cooldown: 0.67 },
    { emoji: '🎯', name: 'Musket Aim', blurb: 'You only ever shoot the important part. 30% of your hits come out double.', crit: 0.3 },
    { emoji: '🧨', name: 'Overload', blurb: 'Everything you throw is overcharged. 20% more damage.', damage: 1.2 },
  ],
  echo: [
    { emoji: '🦇', name: 'Echolocation', blurb: 'You hear the swing before it starts. A third of everything aimed at you misses.', dodge: 0.33 },
    { emoji: '🔁', name: 'Bloom', blurb: 'Everything you do happens twice, and the second one is free. 30% off every cooldown.', cooldown: 0.7 },
    { emoji: '🌑', name: 'Eclipse', blurb: 'You are hard to look at directly. 15% smaller and 10% less damage taken.', size: 0.85, armor: 0.9 },
  ],
  rubber: [
    { emoji: '🪀', name: 'Bounce Form', blurb: 'Nothing that hits you keeps its energy. A third of it goes straight back.', thorns: 0.33 },
    { emoji: '🎈', name: 'Rubberage', blurb: 'You are moving too fast to grab and too springy to shove. 30% faster.', speed: 1.3, knockbackImmune: true },
    { emoji: '🥊', name: 'Rubber Punch', blurb: 'Everything you throw has recoil in it. 20% more damage.', damage: 1.2 },
  ],
  magic: [
    { emoji: '📖', name: 'Levitate', blurb: 'Your feet have not touched the ground in some time. Nothing on the floor can reach you.', levitate: true },
    { emoji: '🪄', name: 'Meditate', blurb: 'The book gives everything back sooner. 30% off every cooldown.', cooldown: 0.7 },
    { emoji: '🕯️', name: 'Necronomicon', blurb: 'A price already paid. 20% more damage and a quarter of it feeds you.', damage: 1.2, lifesteal: 0.25 },
  ],
  technology: [
    { emoji: '💻', name: 'Admin', blurb: 'You have write access to the fight. 35% off every cooldown.', cooldown: 0.65 },
    { emoji: '🛰️', name: 'Uplink', blurb: 'A firewall you did not have to configure. 80 shield health.', shield: 80 },
    { emoji: '📈', name: 'Ads', blurb: 'Sponsored, and it shows. 20% more damage and 15% faster.', damage: 1.2, speed: 1.15 },
  ],
  silence: [
    { emoji: '🫥', name: 'Stealth', blurb: 'Nobody is quite sure where you are standing. 30% of everything aimed at you misses.', dodge: 0.3 },
    { emoji: '🔪', name: 'Backstab', blurb: 'You are always behind them. 35% of your hits come out double.', crit: 0.35 },
    { emoji: '🌫️', name: 'Fog', blurb: 'The room has gone quiet and grey and it is on your side. 15% less damage taken.', armor: 0.85 },
  ],
  subterfuge: [
    { emoji: '🕴️', name: 'Smoke Break', blurb: 'Unbothered, and harder to hit for it. 25% less damage taken.', armor: 0.75 },
    { emoji: '💰', name: 'Bribe', blurb: 'Whoever you are fighting has been paid to be careless. 10% less damage taken, 25% more dealt.', armor: 0.9, damage: 1.25 },
    { emoji: '🗡️', name: 'Treachery', blurb: 'You pick the moment. A quarter of your hits land double.', crit: 0.25 },
  ],

  // ── Divine ─────────────────────────────────────────────────────────────────
  justice: [
    { emoji: '💙', name: 'Sheer Will', blurb: 'You have decided not to lose. 20% faster and 25% less damage taken.', speed: 1.2, armor: 0.75 },
    { emoji: '🛡️', name: 'Indomitable Will', blurb: 'Nothing may take your last point of health from you. Ever.', floor: 1 },
    { emoji: '🏛️', name: 'My Arena', blurb: 'Wherever you are standing is your coliseum. 25% more damage.', damage: 1.25 },
  ],

  // ── Unstable ───────────────────────────────────────────────────────────────
  radiation: [
    { emoji: '☢️', name: 'Irradiated', blurb: 'Standing near you is a diagnosis. 12 damage a second on contact.', contact: 12 },
    { emoji: '🔭', name: "Sniper's Instinct", blurb: 'You are always the wrong distance away for them. 20% less damage taken.', armor: 0.8 },
    { emoji: '☣️', name: 'Gamma', blurb: 'Everything you throw is hot. 25% more damage.', damage: 1.25 },
  ],
  depths: [
    { emoji: '🐟', name: 'Camo Fade', blurb: 'The water is dark and you are the same colour as it. 30% of everything aimed at you misses.', dodge: 0.3 },
    { emoji: '🦈', name: 'Megalodon', blurb: 'Something enormous is swimming where you are walking. 25% more damage and a fifth of it feeds you.', damage: 1.25, lifesteal: 0.2 },
    { emoji: '🫧', name: 'Lungfish', blurb: 'You are built for pressure. 3 health a second and 20% faster.', regen: 3, speed: 1.2 },
  ],
  psychic: [
    { emoji: '👁️', name: 'Opened Eyes', blurb: 'You already know what is coming. A third of everything aimed at you misses.', dodge: 0.33 },
    { emoji: '🧠', name: 'Coma', blurb: 'Half of you is somewhere the fight cannot reach. 30% less damage taken.', armor: 0.7 },
    { emoji: '🌀', name: 'Utter Focus', blurb: 'Nothing is late any more. 30% off every cooldown.', cooldown: 0.7 },
  ],
  ruin: [
    { emoji: '🧱', name: 'Second Skin', blurb: 'You have shed most of yourself. A third smaller, and much harder to land on.', size: 0.67, dodge: 0.2 },
    { emoji: '🪓', name: 'Shred', blurb: 'Everything you touch comes apart. 30% more damage.', damage: 1.3 },
    { emoji: '⛓️', name: 'Combo Breaker', blurb: 'Nothing anyone is building against you ever finishes. 20% less damage taken.', armor: 0.8 },
  ],
  cloth: [
    { emoji: '🧣', name: 'Longer Scarf', blurb: 'More of you than there was. 70 more health and 5 off every hit.', maxHp: 70, flatCut: 5 },
    { emoji: '🪡', name: 'Running Repair', blurb: 'Darned as fast as it is cut. 5 health a second and nothing sticks to you.', regen: 5, cleanse: true },
    { emoji: '📌', name: 'Sharpened', blurb: 'Every pin filed to a point. 20% more damage.', damage: 1.2 },
  ],
  magma: [
    { emoji: '🌋', name: 'Molten Body', blurb: 'You are not solid and it is not comfortable to stand near. 13 damage a second on contact.', contact: 13 },
    { emoji: '🐉', name: 'Dragon Kin', blurb: 'Something old is wearing you. 20% less damage taken and 20% more dealt.', armor: 0.8, damage: 1.2 },
    { emoji: '🪨', name: 'Cooled Crust', blurb: 'A rind of black rock. 6 off every incoming hit and nothing shoves you.', flatCut: 6, knockbackImmune: true },
  ],
  chalk: [
    { emoji: '🖍️', name: 'Masterpiece', blurb: 'Whatever you draw is true. 30% more damage.', damage: 1.3 },
    { emoji: '🟦', name: 'Confined', blurb: 'A box drawn round you that nothing has permission to enter. 90 shield health.', shield: 90 },
    { emoji: '👻', name: 'Living Chalk', blurb: 'You are a smudge on a board. 15% smaller and a fifth of everything misses.', size: 0.85, dodge: 0.2 },
  ],
  paper: [
    { emoji: '📗', name: 'Knight', blurb: 'The armour chapter, left open. 20% less damage taken.', armor: 0.8 },
    { emoji: '📘', name: 'Alien', blurb: 'The one where the technology is not from here. 20% more damage.', damage: 1.2 },
    { emoji: '📕', name: 'Fantasy', blurb: 'The one where you are quick. 25% faster.', speed: 1.25 },
    { emoji: '📓', name: 'Herbology', blurb: 'The one where the wound closes. 3 health a second.', regen: 3 },
  ],
  bind: [
    { emoji: '⛓️', name: 'Faith', blurb: 'Something is holding the other end of you. 25% more damage.', damage: 1.25 },
    { emoji: '🕯️', name: 'Idol', blurb: 'A patron who has already been paid. 25% less damage taken.', armor: 0.75 },
    { emoji: '🩸', name: 'Tithe', blurb: 'Every wound you open is owed to you. A third of it comes back as health.', lifesteal: 0.33 },
  ],
  dune: [
    { emoji: '🏜️', name: 'Sand Barrier', blurb: 'A veil of moving sand you never let drop. 25% less damage taken.', armor: 0.75 },
    { emoji: '🏃', name: 'Sandwalk', blurb: 'The course never ends and you never slow down. 30% faster.', speed: 1.3 },
    { emoji: '🔫', name: 'Striker', blurb: 'Iron sights on everything you own. 25% of your hits land double.', crit: 0.25 },
  ],
  gum: [
    { emoji: '🫠', name: 'The Pool', blurb: 'There is simply more of you. 90 more health, handed over full.', maxHp: 90 },
    { emoji: '🟩', name: 'Ooze', blurb: 'A bigger, softer, stickier body. 20% larger and impossible to shove.', size: 1.2, knockbackImmune: true },
    { emoji: '🧪', name: 'Oozorbtion', blurb: 'Things sink into you rather than through you. 6 off every incoming hit.', flatCut: 6 },
  ],
  illusion: [
    { emoji: '🎭', name: 'Dance', blurb: 'Shots pass through the place you appear to be standing.', phase: true },
    { emoji: '🪄', name: 'Veil', blurb: 'Half of what is looking at you is looking at the wrong one. A third of everything misses.', dodge: 0.33 },
    { emoji: '🔷', name: 'Tesseract', blurb: 'You are folded smaller than you should be. 20% smaller, 20% more damage.', size: 0.8, damage: 1.2 },
  ],
  conquest: [
    { emoji: '🏰', name: 'Home Ground', blurb: 'Every square you stand on is yours. 35% less damage taken.', armor: 0.65 },
    { emoji: '🚩', name: 'Banner', blurb: 'A standard planted in you. 70 more health.', maxHp: 70 },
    { emoji: '⚔️', name: 'Barracks', blurb: 'You are never outnumbered. 20% more damage.', damage: 1.2 },
  ],
  passion: [
    { emoji: '🌹', name: 'The Rose', blurb: 'It takes every hit before you do. 25% less damage taken.', armor: 0.75 },
    { emoji: '💘', name: 'Love', blurb: 'The bar is full and it never empties. 30% more damage.', damage: 1.3 },
    { emoji: '💋', name: 'Perfume', blurb: 'Nobody wants to hurt you very much. 20% faster and 2 health a second.', speed: 1.2, regen: 2 },
  ],
  death: [
    { emoji: '⚰️', name: 'Sheathed', blurb: 'The blade is always full and always ready. 35% of your hits land double.', crit: 0.35 },
    { emoji: '🌊', name: 'Styx', blurb: 'Everyone you are fighting is branded. They deal 20% less.', armor: 0.8 },
    { emoji: '🕰️', name: 'The Deal', blurb: 'You have already agreed the terms. 25% more damage and a fifth of it comes back.', damage: 1.25, lifesteal: 0.2 },
  ],
  fortune: [
    { emoji: '🪙', name: 'Interest', blurb: 'Everything you own is paying you. 3 health a second.', regen: 3 },
    { emoji: '🎟️', name: 'Battle Pass', blurb: 'Thirty tiers, all of them bought. 25% more damage and 15% faster.', damage: 1.25, speed: 1.15 },
    { emoji: '🔫', name: 'Death Machine', blurb: 'The expensive gun, and you did not pay for it. 30% of your hits land double.', crit: 0.3 },
  ],
  gluttony: [
    { emoji: '🍖', name: 'Snacking', blurb: 'There is always something in a pocket and it is always going in. 6 health a second.', regen: 6 },
    { emoji: '🥩', name: 'Feast', blurb: 'A larder you never have to spend. 80 more health.', maxHp: 80 },
    { emoji: '🔪', name: 'Butcher', blurb: 'Everything in front of you is a cut. 25% more damage.', damage: 1.25 },
  ],
};

/** Every element id Lifelong Dream may be pointed at, in roster order. */
export function dreamableElementIds(): string[] {
  return Object.keys(DREAM_BOONS);
}

/** The boons for an element, or an empty list for one that has not been written up. */
export function dreamBoons(elementId: string): DreamBoon[] {
  return DREAM_BOONS[elementId] ?? [];
}

/**
 * A one-line summary of what a dream is worth, for the picker's rows. Built from the boons
 * themselves rather than written twice, so a table edit can never leave the picker lying.
 */
export function dreamSummary(elementId: string): string {
  const boons = dreamBoons(elementId);
  if (!boons.length) return 'no dream recorded';
  const bits: string[] = [];
  const pct = (v: number) => `${Math.round(Math.abs(1 - v) * 100)}%`;
  let dmg = 1, arm = 1, spd = 1, cdr = 1, regen = 0, hp = 0;
  let crit = 0, dodge = 0, contact = 0, life = 0, thorn = 0, shield = 0, flat = 0;
  const flags: string[] = [];
  for (const b of boons) {
    if (b.damage) dmg *= b.damage;
    if (b.armor) arm *= b.armor;
    if (b.speed) spd *= b.speed;
    if (b.cooldown) cdr *= b.cooldown;
    regen += b.regen ?? 0;
    hp += b.maxHp ?? 0;
    crit += b.crit ?? 0;
    dodge += b.dodge ?? 0;
    contact += b.contact ?? 0;
    life += b.lifesteal ?? 0;
    thorn += b.thorns ?? 0;
    shield += (b.shield ?? 0) + (b.charges ?? 0) * 25;
    flat += b.flatCut ?? 0;
    if (b.unstoppable) flags.push('unstoppable');
    if (b.levitate) flags.push('levitating');
    if (b.phase) flags.push('shots pass through');
    if (b.cleanse) flags.push('nothing sticks');
    if (b.knockbackImmune) flags.push('unshovable');
    if (b.floor) flags.push('cannot be killed');
    if (b.cap) flags.push(`${b.cap} damage cap`);
  }
  if (dmg !== 1) bits.push(`+${pct(dmg)} dmg`);
  if (arm !== 1) bits.push(`−${pct(arm)} taken`);
  if (spd !== 1) bits.push(`+${pct(spd)} speed`);
  if (cdr !== 1) bits.push(`−${pct(cdr)} cooldown`);
  if (regen) bits.push(`+${regen}/s`);
  if (hp) bits.push(`+${hp} HP`);
  if (shield) bits.push(`${shield} shield`);
  if (flat) bits.push(`−${flat} per hit`);
  if (crit) bits.push(`+${Math.round(crit * 100)}% crit`);
  if (dodge) bits.push(`+${Math.round(dodge * 100)}% dodge`);
  if (contact) bits.push(`${contact}/s contact`);
  if (life) bits.push(`${Math.round(life * 100)}% lifesteal`);
  if (thorn) bits.push(`${Math.round(thorn * 100)}% thorns`);
  bits.push(...flags);
  return bits.join(' · ');
}
