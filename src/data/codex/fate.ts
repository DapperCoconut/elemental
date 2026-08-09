import { ElementCodex } from '../AbilityCodex';

/**
 * Fate — an element you do not get to choose the abilities of.
 *
 * Verified against `src/elements/fate.ts`, `kits/FateKit.ts`, the five shop upgrades in
 * `data/Upgrades.ts`, the Paper perk in `data/Perks.ts` and the two mastery enhancements in
 * `data/Mastery.ts`.
 */
const fate: ElementCodex = {
  identity:
    'A dealer with a hand of cards fanned out along the bottom of the screen, and no idea what is '
    + 'in it until the deck says. The click does not have an effect — it has whatever the '
    + 'highlighted card has, out of eighteen completely different ones, and the other four keys '
    + 'are all about managing that: throw the hand away and draw a new one, make a card survive '
    + 'being used, make a card hit twice as hard, or bet fifty health on a roulette wheel. Fate '
    + 'is the only element where the correct play is a function of what you happened to draw, and '
    + 'every upgrade it owns is really an attempt to make the randomness smaller.',

  passives: [
    {
      emoji: '🃏',
      name: 'The Hand',
      magic:
        'Six cards, fanned along the bottom of the screen, each with its own face, colour and '
        + 'one-line description. One of them is highlighted at any time and that is the one the '
        + 'click throws. The deck keeps dealing on its own — a card is drawn back into any empty '
        + 'slot every five seconds — so an empty hand is a temporary state rather than a dead one.',
      effects: [
        { tag: 'utility', label: 'The hand', detail: '6 cards, or 8 with Wonder Preserve. Drawn at random from the pool.' },
        { tag: 'utility', label: 'The refill', detail: '1 card back every 5 seconds into an empty slot, automatically.' },
        { tag: 'utility', label: 'Choosing one', detail: 'Click a card in the fan, or press 1–6 (1–8 upgraded), to highlight it. Preserve and Enchant both act on the highlighted card.' },
        { tag: 'utility', label: 'A card is spent when thrown', detail: 'Unless it was Preserved, in which case it stays and the preservation is used up instead.' },
      ],
      notes: [
        'A reroll resets the five-second refill clock, so the fastest way back to a full hand is always E rather than waiting.',
        'The 0.35 second cooldown on the click is the same whatever the card is, so a hand full of 3-damage cards throws exactly as fast as a hand full of 35-damage ones.',
      ],
    },
    {
      emoji: '🎴',
      name: 'The Deck',
      magic:
        'Ten card types to begin with, and eight more once New Cards! is bought — eighteen '
        + 'completely unrelated abilities living in one draw pool. There is no cost difference '
        + 'between them and no weighting except one: the Emperor is ten times rarer than anything '
        + 'else, which makes drawing it the single luckiest thing that can happen to this element.',
      effects: [
        { tag: 'utility', label: 'The base ten', detail: 'Laser, Burst, Barrier, Explosion, Infect, Coin, Heal, Buff, Lightning and Slots. Always in the pool.' },
        { tag: 'utility', label: 'The extra eight', detail: 'Boomerang, Slash, Phase, Striker, Pulse, Chill, Chain and Emperor — only with New Cards! equipped.' },
        { tag: 'utility', label: 'The Emperor', detail: '10× rarer than any other card in the pool. A 12-shot volley, and the reason to keep rerolling.' },
        { tag: 'utility', label: 'Three of them are not attacks', detail: 'Coin, Heal and Buff deal no damage at all — one reflects, one heals, one buffs. Slots summons a machine.' },
      ],
      notes: [
        'Force the Hand of Fate is the only thing in the game that narrows a draw pool, and it is the element\'s answer to being handed three Slots in a row.',
        'With New Cards! the pool is nearly twice as large, which cuts the odds of drawing any specific card almost in half. It is a power increase and a consistency decrease at the same time.',
      ],
    },
  ],

  abilities: {
    'fate-card-throw': {
      magic:
        'You throw the highlighted card. What happens next is entirely a function of which card it '
        + 'was — a hitscan laser, a ring of bullets, a snowball, a dash, a slot machine. The '
        + 'animation, the colour and the sound all come from the card, so a Fate player and their '
        + 'opponent both find out at the same moment.',
      cast: 'Click, at the cursor. 0.35s cooldown, shared across every card. The card is consumed unless it was Preserved.',
      effects: [
        { tag: 'utility', label: 'Whatever is highlighted', detail: 'One of 18 different effects. See the table below for every one of them.' },
        { tag: 'utility', label: 'The modifiers ride the card', detail: 'Enchant doubles it, Tarot quadruples it, and Preserve stops it being spent — all three are properties of the card rather than of the throw.' },
      ],
      variants: {
        label: 'The eighteen cards',
        variants: [
          { emoji: '🔴', name: 'Laser', description: '15 damage, hitscan. Enchanted with Wonder Enchant it also bounces off 3 walls.' },
          { emoji: '💥', name: 'Burst', description: '5 bullets at 5 damage each in a cone. Wonder Enchant adds 2 more bullets.' },
          { emoji: '🛡️', name: 'Barrier', description: 'A ring of 15 bullets at 3 damage each around you. Wonder Enchant doubles the count and slows them 300%, turning it into a wall you stand inside.' },
          { emoji: '💣', name: 'Explosion', description: '20 damage in an area. Wonder Enchant doubles the radius.' },
          { emoji: '☠️', name: 'Infect', description: '3 hits of 5 damage plus poison. Wonder Enchant doubles the duration.' },
          { emoji: '🪙', name: 'Coin', description: 'No damage of its own — it reflects bullets back at double damage. The mastery requirement Ricochet is 50 of these bounces.' },
          { emoji: '💚', name: 'Heal', description: '12 orbs worth 8 health each. The element\'s only sustain.' },
          { emoji: '💪', name: 'Buff', description: '+10% speed, +10% damage and +10% damage reduction for 8 seconds.' },
          { emoji: '⚡', name: 'Lightning', description: '20 damage and a 2-second stun — the hardest control in the deck.' },
          { emoji: '🎰', name: 'Slots', description: 'Summons a slot machine. No direct damage.' },
          { emoji: '🪃', name: 'Boomerang', description: 'Orbits you for 3 seconds, 15 damage to anything it touches.', requiresUpgrade: 'click' },
          { emoji: '⚔️', name: 'Slash', description: 'A close red arc for 15. Wonder Enchant adds a 50% slow for 5 seconds.', requiresUpgrade: 'click' },
          { emoji: '💨', name: 'Phase', description: 'A blink dash at the cursor dealing 10 through anything on the way. Wonder Enchant makes it 1.5× further.', requiresUpgrade: 'click' },
          { emoji: '⚫', name: 'Striker', description: 'A very slow black shot for 35 — the biggest single number in the deck. Wonder Enchant makes it 20% larger.', requiresUpgrade: 'click' },
          { emoji: '🌀', name: 'Pulse', description: '10 damage in an area plus knockback. Wonder Enchant doubles the knockback.', requiresUpgrade: 'click' },
          { emoji: '❄️', name: 'Chill', description: 'A snowball: 5 damage and a large 50% slow. Wonder Enchant adds 3 seconds to the slow.', requiresUpgrade: 'click' },
          { emoji: '🔗', name: 'Chain', description: '10 damage of chaining lightning. Wonder Enchant extends its reach.', requiresUpgrade: 'click' },
          { emoji: '👑', name: 'Emperor', description: 'A volley of 12 bullets at 3 damage each — and 10× rarer than anything else in the pool. Wonder Enchant adds 5 more bullets.', requiresUpgrade: 'click' },
        ],
      },
      upgrade: {
        magic:
          'New Cards! is the biggest single content upgrade in the game: eight more card types '
          + 'shuffled into the same pool, including the only 35-damage single shot in the deck and '
          + 'the Emperor, which is rare enough to be an event.',
        effects: [
          { tag: 'utility', label: 'Eight more types', detail: 'Boomerang, Slash, Phase, Striker, Pulse, Chill, Chain and Emperor, all in the same draw pool as the base ten.', requiresUpgrade: 'click' },
          { tag: 'damage', label: 'The new ceiling', detail: 'Striker is 35 damage in one card, more than double the base pool\'s Laser. Enchanted it is 70, and greatly enchanted 140.', requiresUpgrade: 'click' },
          { tag: 'cost', label: 'A thinner pool', detail: 'Eighteen types instead of ten means any specific card is nearly half as likely to be drawn. More power, less consistency.', requiresUpgrade: 'click' },
        ],
      },
      notes: [
        'The cooldown is on the key, not on the card, so the throttle is 0.35 seconds regardless of what you happened to draw.',
        'A greatly enchanted Striker is 140 damage in one click — by a distance the largest number this element can produce, and it needs the Click upgrade, mastery, and a very lucky draw.',
      ],
    },

    'fate-reroll': {
      magic:
        'The whole hand is thrown away and six new ones are dealt in a riffle. It is the only '
        + 'shuffle in the game, so when the cards riffle it can only mean one thing. Everything '
        + 'that was on those cards — enchantments, preservations, curses — goes with them.',
      cast: 'E. Instant. 6s cooldown.',
      effects: [
        { tag: 'utility', label: 'A whole new hand', detail: 'Every card is discarded and the hand is refilled to its full size in one action.' },
        { tag: 'cost', label: 'Everything on them goes', detail: 'Preserved and Enchanted cards are discarded exactly like plain ones. Rerolling after buffing a card throws the buff away.' },
        { tag: 'utility', label: 'It resets the draw clock', detail: 'The five-second automatic refill starts again from zero, so a reroll is strictly faster than waiting.' },
      ],
      upgrade: {
        magic:
          'Force the Hand of Fate is the element\'s answer to its own randomness. At the start of '
          + 'the match you pick one of five face cards, and it permanently narrows what the deck '
          + 'is allowed to give you — four or five card types instead of eighteen.',
        effects: [
          { tag: 'utility', label: '🤴 King', detail: 'Heal, Buff, Barrier, Phase and Emperor. The defensive hand, and the only one that can draw an Emperor.', requiresUpgrade: 'e' },
          { tag: 'utility', label: '👸 Queen', detail: 'Explosion, Lightning, Chill and Chain. Everything with an area or a control attached.', requiresUpgrade: 'e' },
          { tag: 'utility', label: '🃏 Jack', detail: 'Boomerang, Slash, Burst and Pulse. Close range, fast turnover.', requiresUpgrade: 'e' },
          { tag: 'utility', label: '♠️ Ace', detail: 'Laser, Coin, Infect and Striker. Ranged and precise, and the only pool with the 35-damage Striker in it.', requiresUpgrade: 'e' },
          { tag: 'utility', label: '🎭 Jester', detail: 'No restriction at all — the full eighteen. The option for a player who would rather gamble.', requiresUpgrade: 'e' },
        ],
      },
      notes: [
        'Choosing a face is a whole-match decision made before the first shot, and it cannot be changed.',
        'King is the only pool containing the Emperor, which makes it far and away the highest-ceiling choice — and it has no reliable damage in it at all otherwise.',
      ],
    },

    'fate-preserve': {
      magic:
        'The highlighted card turns gold. The next time you throw it, it comes back — the card is '
        + 'not spent, the preservation is. It is the closest this element gets to picking its own '
        + 'ability: find a card you like, gild it, and throw it twice.',
      cast: 'R, on the highlighted card. 3s cooldown.',
      effects: [
        { tag: 'utility', label: 'One free throw', detail: 'The card stays in your hand instead of being discarded. The gold is consumed doing it.' },
        { tag: 'cost', label: 'It strips the enchantment', detail: 'Preserving a card removes any Enchant on it — unless Wonder Preserve is owned, in which case the two stack.' },
      ],
      upgrade: {
        magic:
          'Wonder Preserve fixes the ability\'s one bad interaction and makes the hand bigger at '
          + 'the same time. A gilded card keeps its purple, and there are two more slots to gild.',
        effects: [
          { tag: 'utility', label: 'They stack', detail: 'Preserve no longer strips Enchant, so a card can be both — double damage and it survives being thrown.', requiresUpgrade: 'r' },
          { tag: 'utility', label: 'A bigger hand', detail: '8 cards instead of 6, selectable with 1–8.', requiresUpgrade: 'r' },
        ],
      },
      notes: [
        'A preserved, enchanted Striker is 70 damage twice from a single card, which is what the R and F upgrades exist to make possible.',
        'The Purging curse from Tarot of Fate strips preservation off the whole hand and puts this key on a 20-second lockout.',
      ],
    },

    'fate-enchant': {
      magic:
        'The highlighted card turns purple and its next use is worth double. With Wonder Enchant '
        + 'it is also worth *more* — every card in the deck has its own second effect that only '
        + 'exists while it is enchanted, and they are all different.',
      cast: 'F, on the highlighted card. 4s cooldown.',
      effects: [
        { tag: 'buff', label: 'Double', detail: '×2 on everything the card does, damage and count alike. A 20-damage Explosion becomes 40; a 15-bullet Barrier becomes 30 bullets.' },
        { tag: 'utility', label: 'It does not stack with Tarot', detail: 'A greatly enchanted card is ×4 and refuses a plain Enchant outright rather than combining with it.' },
      ],
      upgrade: {
        magic:
          'Wonder Enchant gives every card its own second gift. The doubling is still there — this '
          + 'is on top of it, and it is different for all eighteen.',
        effects: [
          { tag: 'utility', label: 'The reach ones', detail: 'Laser bounces off 3 walls, Explosion doubles its radius, Chain gets longer range, Phase goes 1.5× further, Striker is 20% larger.', requiresUpgrade: 'f' },
          { tag: 'utility', label: 'The count ones', detail: 'Burst gets 2 more bullets, Emperor gets 5 more, and Barrier doubles its bullets while slowing them 300% into a standing wall.', requiresUpgrade: 'f' },
          { tag: 'utility', label: 'The control ones', detail: 'Slash adds a 50% slow for 5 seconds, Chill adds 3 seconds to its slow, Pulse doubles its knockback, Infect doubles its duration.', requiresUpgrade: 'f' },
        ],
      },
      notes: [
        'The second gift only applies while the card is enchanted and only if this upgrade is owned. A greatly enchanted card counts as enchanted for it, since it is strictly the stronger version.',
        'Barrier is the card the upgrade changes most: 30 very slow bullets in a ring is a completely different object from 15 fast ones.',
      ],
    },

    'fate-all-in': {
      magic:
        'A roulette wheel appears a hundred pixels from you and orbits wherever your cursor is '
        + 'pointing while the ante gathers on your body. Three seconds later the ball drops. If '
        + 'the enemy is inside the circle they take fifty. If they are not, you do.',
      cast: 'Q, ultimate. The wheel orbits at 100px and follows the cursor for the whole spin. 25s cooldown.',
      effects: [
        { tag: 'damage', label: 'The win', detail: '50 damage to anything within 50px of the wheel when it resolves, with a payout of cards and chips proportional to the stake.' },
        { tag: 'cost', label: 'The loss', detail: '50 self-damage, and the table is swept — dead cards, no chips, no sparkle.' },
        { tag: 'utility', label: 'The spin', detail: '3 seconds, and you can keep repositioning the wheel with the cursor for all of it. It is aimed at the moment it lands, not at the moment it is cast.' },
      ],
      upgrade: {
        magic:
          'Roulette Expert lets you size the bet. A draggable yellow marker appears on your own '
          + 'health bar and whatever is above it is what is on the table — the gambled portion '
          + 'turns yellow so you can see exactly what you are risking. And the wheel spins two '
          + 'seconds longer.',
        effects: [
          { tag: 'utility', label: 'The marker', detail: 'Sets the wager anywhere on your health bar, starting at 50. Hit deals that much; miss takes that much.', requiresUpgrade: 'q' },
          { tag: 'utility', label: 'Longer to aim', detail: '5 seconds of orbit instead of 3, which is a great deal more time to walk the wheel onto somebody.', requiresUpgrade: 'q' },
          { tag: 'cost', label: 'It cuts both ways', detail: 'A big wager is a big win and a big hole. There is no partial payout and no way to call the bet off once the wheel is spinning.', requiresUpgrade: 'q' },
        ],
      },
      notes: [
        'The 25-second cooldown is the shortest ultimate in the game, which is the balance for it being a coin flip you can lose.',
        'The Cocky curse from Tarot of Fate sizes the wager at your entire remaining health for the rest of the match, which turns every subsequent All In into a match point.',
        'A bot cannot steer the wheel with a cursor, so its All In orbits on a fixed angle and is a great deal easier to walk out of.',
      ],
    },
  },

  perks: {
    paper: {
      magic:
        'Right-click and five cards come out of the hand at once in a shotgun spread. What they '
        + 'are worth is not what is printed on them — it is what the five of them make as a poker '
        + 'hand. Five unrelated cards is one damage apiece. A royal flush is forty.',
      cast: 'Right-click. 2s cooldown.',
      effects: [
        { tag: 'damage', label: 'The scale', detail: 'High card 1, pair 2, two pair 4, three of a kind 6, straight 8, flush 10, full house 14, four of a kind 20, straight flush 30, royal flush 40 — per card, across all five.' },
        { tag: 'utility', label: 'Five at once', detail: 'A spread from the hand, fired together rather than one at a time.' },
      ],
      notes: [
        'A four of a kind is 20 per card across five cards — a hundred damage from one right-click — which makes Force the Hand of Fate\'s narrow pools extremely relevant.',
        'A restricted pool of four card types makes pairs and better vastly more likely, so the Ace or Jack faces turn this perk from a curiosity into the element\'s main damage.',
      ],
    },
  },

  mastery: {
    cycle: {
      magic:
        'A hand full of dead draws stops being a dead hand. Right-click a card to bin it, and '
        + 'every third one you throw away the deck immediately deals you two fresh ones — so '
        + 'churning is not just a way of losing cards, it is a way of gaining them.',
      effects: [
        { tag: 'utility', label: 'Binning', detail: 'Right-click any card in the hand to discard it, with no cooldown and no cost.' },
        { tag: 'utility', label: 'The payout', detail: 'Every 3rd card binned deals 2 fresh ones immediately, rather than waiting for the 5-second refill.' },
        { tag: 'utility', label: 'The maths', detail: 'Three binned for two dealt is a net loss of one card, bought instantly instead of over fifteen seconds.' },
      ],
      notes: [
        'It is the only thing in the element that makes a specific card more likely without narrowing the pool: churn until the one you want appears.',
        'The mastery requirement Fortune Teller counts every card that enters your hand, so Cycle trains it as fast as rerolling does.',
      ],
    },
    'tarot-of-fate': {
      magic:
        'The card your mouse is hovering becomes GREATLY ENCHANTED — four times a normal card, '
        + 'overruling a plain Enchant entirely. And it picks up a curse, printed as a small emoji '
        + 'along the bottom of the card, which fires the moment you play it. You can read exactly '
        + 'what it is going to do to you before you throw it. You throw it anyway.',
      cast: 'The bound key, on whichever card the cursor is hovering. 20s cooldown.',
      effects: [
        { tag: 'buff', label: 'Greatly enchanted', detail: '×4 on everything the card does. It replaces a plain Enchant rather than multiplying with it, and it counts as enchanted for Wonder Enchant\'s second gifts.' },
        { tag: 'cost', label: 'The curse fires on play', detail: 'Not on the enchant — on the throw. A greatly enchanted card sitting in your hand costs nothing at all.' },
      ],
      variants: {
        label: 'The nine curses',
        variants: [
          { emoji: '🩹', name: 'Painful', description: '30 damage to you the moment the card is played.' },
          { emoji: '🔥', name: 'Immolating', description: 'Burns every other card out of your hand.' },
          { emoji: '🦠', name: 'Weakening', description: '33% slower for 10 seconds.' },
          { emoji: '🌀', name: 'Confusing', description: 'Your WASD is inverted for 5 seconds.' },
          { emoji: '🦴', name: 'Vulnerable', description: 'The next hit you take is doubled.' },
          { emoji: '💀', name: 'Cursed', description: '15 purple bullets rain in from the sides of the arena at you, 3 damage each.' },
          { emoji: '⭐', name: 'Stunning', description: 'You cannot play any card at all for 5 seconds.' },
          { emoji: '😈', name: 'Cocky', description: 'All In wagers your entire health bar for the rest of the match — permanently, and there is no way to undo it.' },
          { emoji: '✨', name: 'Purging', description: 'Strips enchant, great enchant and preserve off your whole hand, and puts Tarot, Preserve and Enchant on 20-second cooldowns.' },
        ],
      },
      notes: [
        'The curse is drawn on the card before you commit, so this is a decision rather than a punishment — the question is always whether four times this particular card is worth this particular curse.',
        'Cocky is the only curse that lasts the whole match, and it turns the shortest ultimate cooldown in the game into a permanent coin flip for your life.',
        'Purging is the only one that costs you twenty seconds of three separate keys, which makes it far worse on a hand you had already set up.',
      ],
    },
  },
};

export default fate;
