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
    'A dealer with three cards fanned out across the top of the screen, and no idea what is in '
    + 'them until the deck says. The click does not have an effect — it has whatever the '
    + 'highlighted card has, out of seventeen completely different ones. Around it: a sidestep that '
    + 'leaves decoy cards behind and draws a fresh one whenever a decoy is shot, a die rolled over '
    + 'the head that can be clicked, thrown or simply held, a talisman that curses the foe with '
    + 'crits and drags your near-misses into them, and a roulette wheel you bet your hand on. Fate '
    + 'is the only element where the correct play is a function of what you happened to draw.',

  passives: [
    {
      emoji: '🃏',
      name: 'The Hand',
      basics:
        'You play from a hand of 3 cards, or 4 with Wonder Glyphs, drawn at random from the pool, '
        + 'with one card refilling into an empty slot automatically every 2.5 seconds. Click a card in the '
        + 'fan or press 1–3 (1–4 upgraded) to highlight it; a clicked die acts on whatever is '
        + 'highlighted. Every card is a real playing card that survives 3 throws, tearing a little more '
        + 'each time, and is shredded on the last one.',
      effects: [
        { tag: 'utility', label: 'The hand', detail: '3 cards, or 4 with Wonder Glyphs. Drawn at random from the pool.' },
        { tag: 'utility', label: 'The refill', detail: '1 card back every 2.5 seconds into an empty slot, automatically.' },
        { tag: 'utility', label: 'Choosing one', detail: 'Click a card in the fan, or press 1–3 (1–4 upgraded), to highlight it. A clicked die acts on the highlighted card.' },
        { tag: 'utility', label: 'Three throws a card', detail: 'Each card can be thrown 3 times before it is shredded. The pips along its foot count what is left, and it frays, rips and stains as it wears. A die rolled 2 repairs it.' },
      ],
      notes: [
        'With only three cards every draw matters — Side Shuffle\'s decoys are the only way to draw faster than the 2.5-second clock.',
        'The 0.35 second cooldown on the click is the same whatever the card is, so a hand full of 5-damage cards throws exactly as fast as a hand full of 35-damage ones.',
      ],
    },
    {
      emoji: '🎴',
      name: 'The Deck',
      basics:
        'Nine cards are always in the pool: Laser, Burst, Barrier, Explosion, Infect, Coin, Heal, Buff '
        + 'and Lightning. New Cards! adds eight more — Boomerang, Slash, Phase, Striker, Pulse, '
        + 'Chill, Chain and Emperor — and the Emperor is 10× rarer than anything else in the pool, a '
        + '12-shot volley. Three of them are not attacks at all: Coin reflects, Heal heals and Buff buffs.',
      effects: [
        { tag: 'utility', label: 'The base nine', detail: 'Laser, Burst, Barrier, Explosion, Infect, Coin, Heal, Buff and Lightning. Always in the pool.' },
        { tag: 'utility', label: 'The extra eight', detail: 'Boomerang, Slash, Phase, Striker, Pulse, Chill, Chain and Emperor — only with New Cards! equipped.' },
        { tag: 'utility', label: 'The Emperor', detail: '10× rarer than any other card in the pool. A 12-shot volley.' },
        { tag: 'utility', label: 'Three of them are not attacks', detail: 'Coin, Heal and Buff deal no damage at all — one reflects, one heals, one buffs.' },
      ],
      notes: [
        'Force the Hand of Fate is the only thing in the game that narrows a draw pool, and it is the element\'s answer to being handed three Coins in a row.',
        'With New Cards! the pool is nearly twice as large, which cuts the odds of drawing any specific card almost in half. It is a power increase and a consistency decrease at the same time.',
      ],
    },
  ],

  abilities: {
    'fate-card-throw': {
      basics:
        'Throws whichever card is highlighted at the cursor — one of 17 different effects, all listed '
        + 'below. The modifiers ride the card rather than the throw: a glyph doubles it, Tarot quadruples '
        + 'its next throw, and stars on its type add 15% each. Every card lasts 3 throws. 0.35s cooldown, shared across every card.',
      cast: 'Click, at the cursor. 0.35s cooldown, shared across every card. Each throw uses up one of the card\'s 3 uses.',
      effects: [
        { tag: 'utility', label: 'Whatever is highlighted', detail: 'One of 17 different effects. See the table below for every one of them.' },
        { tag: 'utility', label: 'The modifiers ride the card', detail: 'A glyph doubles it for every throw it has left, Tarot quadruples its next one, and each star on its type adds 15% — properties of the card rather than of the throw.' },
      ],
      variants: {
        label: 'The seventeen cards',
        variants: [
          { emoji: '🔴', name: 'Laser', description: '15 damage, hitscan. Glyphed with Wonder Glyphs it also bounces off 3 walls.' },
          { emoji: '💥', name: 'Burst', description: '5 bullets at 7 damage each in a cone. Wonder Glyphs adds 2 more bullets.' },
          { emoji: '🛡️', name: 'Barrier', description: 'A ring of 18 bullets at 5 damage each around you, plus a shield charge that blocks your next whole hit (2 if glyphed, at most 3 held). Wonder Glyphs doubles the count and slows them 300%, turning it into a wall you stand inside.' },
          { emoji: '💣', name: 'Explosion', description: '20 damage in an area. Wonder Glyphs doubles the radius.' },
          { emoji: '☠️', name: 'Infect', description: '3 hits of 6 damage plus poison. Wonder Glyphs doubles the duration.' },
          { emoji: '🪙', name: 'Coin', description: 'No damage of its own — it reflects bullets back at double damage. The mastery requirement Ricochet is 50 of these bounces.' },
          { emoji: '💚', name: 'Heal', description: '12 orbs worth 10 health each, scattered round the arena.' },
          { emoji: '💪', name: 'Buff', description: '+20% speed, +20% damage and +20% damage reduction for 8 seconds.' },
          { emoji: '⚡', name: 'Lightning', description: '20 damage and a 2-second stun — the hardest control in the deck.' },
          { emoji: '🪃', name: 'Boomerang', description: 'Orbits you for 3 seconds, 15 damage to anything it touches.', requiresUpgrade: 'click' },
          { emoji: '⚔️', name: 'Slash', description: 'A close red arc for 15. Wonder Glyphs adds a 50% slow for 5 seconds.', requiresUpgrade: 'click' },
          { emoji: '💨', name: 'Phase', description: 'A blink dash at the cursor dealing 10 through anything on the way. Wonder Glyphs makes it 1.5× further.', requiresUpgrade: 'click' },
          { emoji: '⚫', name: 'Striker', description: 'A very slow black shot for 35 — the biggest single number in the deck. Wonder Glyphs makes it 20% larger.', requiresUpgrade: 'click' },
          { emoji: '🌀', name: 'Pulse', description: '10 damage in an area plus knockback. Wonder Glyphs doubles the knockback.', requiresUpgrade: 'click' },
          { emoji: '❄️', name: 'Chill', description: 'A snowball: 5 damage and a large 50% slow. Wonder Glyphs adds 3 seconds to the slow.', requiresUpgrade: 'click' },
          { emoji: '🔗', name: 'Chain', description: '10 damage of chaining lightning. Wonder Glyphs extends its reach.', requiresUpgrade: 'click' },
          { emoji: '👑', name: 'Emperor', description: 'A volley of 12 bullets at 3 damage each — and 10× rarer than anything else in the pool. Wonder Glyphs adds 5 more bullets.', requiresUpgrade: 'click' },
        ],
      },
      upgrade: {
        basics:
          'Eight more card types join the same draw pool: Boomerang, Slash, Phase, Striker, Pulse, Chill, '
          + 'Chain and Emperor. Striker alone is 35 damage in one card, more than double the base pool\'s '
          + 'Laser — 70 glyphed and 140 greatly enchanted. The cost is consistency: seventeen types '
          + 'instead of nine means any specific card is nearly half as likely to be drawn.',
        effects: [
          { tag: 'utility', label: 'Eight more types', detail: 'Boomerang, Slash, Phase, Striker, Pulse, Chill, Chain and Emperor, all in the same draw pool as the base ten.', requiresUpgrade: 'click' },
          { tag: 'damage', label: 'The new ceiling', detail: 'Striker is 35 damage in one card, more than double the base pool\'s Laser. Glyphed it is 70, and greatly enchanted 140.', requiresUpgrade: 'click' },
          { tag: 'cost', label: 'A thinner pool', detail: 'Seventeen types instead of nine means any specific card is nearly half as likely to be drawn. More power, less consistency.', requiresUpgrade: 'click' },
        ],
      },
      notes: [
        'The cooldown is on the key, not on the card, so the throttle is 0.35 seconds regardless of what you happened to draw.',
        'A greatly enchanted, three-star Striker is over 200 damage in one click — by a distance the largest number this element can produce, and it needs the Click upgrade, mastery, several lucky 6s and a very lucky draw.',
      ],
    },

    'fate-side-shuffle': {
      basics:
        'A quick sidestep 160px to the right of wherever you are aiming, dealing five face-down cards '
        + 'onto the floor along the way. The cards are decoys: for 2.6 seconds, any enemy bullet that '
        + 'touches one is eaten by it — a shot you dodged — and the deck instantly deals you a card for '
        + 'it (or, with a full hand, puts one throw back on your most worn card). 5s cooldown.',
      cast: 'E. Dashes right of the cursor. 5s cooldown.',
      effects: [
        { tag: 'movement', label: 'The sidestep', detail: '160px to the right of your aim in 0.19s — strafe past a shot rather than backing away from it.' },
        { tag: 'summon', label: 'Five decoys', detail: 'Face-down cards dealt along the path. Each lasts 2.6 seconds and eats the first enemy bullet that touches it.' },
        { tag: 'resource', label: 'A dodge pays', detail: 'Every decoy that is shot instantly draws you 1 card. With a full hand, your most worn card gets 1 throw back instead.' },
      ],
      upgrade: {
        basics:
          'At match start you pick a face card, and for the rest of the match the deck may only deal you '
          + 'its cards — the refill, the decoys\' draws, everything. 🤴 King is Heal, Buff, Barrier, Phase '
          + 'and Emperor. 👸 Queen is Explosion, Lightning, Chill and Chain. 🃏 Jack is Boomerang, Slash, '
          + 'Burst and Pulse. ♠️ Ace is Laser, Coin, Infect and Striker. 🎭 Jester is no restriction at all.',
        effects: [
          { tag: 'utility', label: '🤴 King', detail: 'Heal, Buff, Barrier, Phase and Emperor — 5 types. The defensive hand, and the only one that can draw an Emperor.', requiresUpgrade: 'e' },
          { tag: 'utility', label: '👸 Queen', detail: 'Explosion, Lightning, Chill and Chain — 4 types, everything with an area or a control attached.', requiresUpgrade: 'e' },
          { tag: 'utility', label: '🃏 Jack', detail: 'Boomerang, Slash, Burst and Pulse — 4 types. Close range, fast turnover.', requiresUpgrade: 'e' },
          { tag: 'utility', label: '♠️ Ace', detail: 'Laser, Coin, Infect and Striker — 4 types, and the only pool with the 35-damage Striker in it.', requiresUpgrade: 'e' },
          { tag: 'utility', label: '🎭 Jester', detail: 'No restriction at all — the full 17. The option for a player who would rather gamble.', requiresUpgrade: 'e' },
        ],
      },
      notes: [
        'The decoys only catch bullets — a beam, a blast or a melee swing goes straight through them.',
        '"Right" is relative to the cursor, so aiming at the foe makes it a strafe; aiming away makes it a different direction entirely.',
      ],
    },

    'fate-dice-of-doom': {
      basics:
        'Rolls a die into the air above your head; after half a second it lands on a face from 1 to 6. '
        + 'Then you choose. Click it to spend it on a boost, drag it away and let go to throw it as a '
        + 'projectile, or leave it where it is for a passive bonus that lasts until you use it. Drag it '
        + 'onto a card in your hand to click it onto that card. Pressing R again rolls a new die over '
        + 'the old one. 8s cooldown.',
      cast: 'R to roll; then click the die, drag-and-release it, or leave it held. R again rerolls. 8s cooldown.',
      effects: [
        { tag: 'buff', label: 'Click', detail: '1: glyph the card — double effect for every throw it has left. 2: repair the card to full uses. 3: +50% speed for 5s. 4: 25% shorter cooldowns for 5s. 5: 25% dodge for 5s. 6: a star on that card\'s type, +15% power on every future draw of it (3 stars max).' },
        { tag: 'damage', label: 'Drag', detail: '1: a 32-damage die. 2: 18 damage that heals you 18. 3: 18 damage and a 40% slow for 3s. 4: 18 damage and 3s off all your cooldowns. 5: three small dice for 6 each, every one that hits banks a guaranteed dodge (3 max). 6: a very slow die for 55.' },
        { tag: 'buff', label: 'Held', detail: '1: +15% damage. 2: 3 HP per second. 3: +15% speed. 4: 10% shorter cooldowns. 5: 10% dodge. 6: star boosts doubled.' },
      ],
      upgrade: {
        basics:
          'Glyphed cards now change what they do as well as how much. Laser bounces off 3 walls, '
          + 'Explosion doubles its radius, Chain gets longer range, Phase goes 1.5× further and Striker is '
          + '20% larger. Burst gets 2 more bullets, Emperor 5 more, and Barrier doubles its bullets while '
          + 'slowing them 300% into a standing wall. Slash adds a 50% slow for 5 seconds, Chill adds 3 '
          + 'seconds to its slow, Pulse doubles its knockback and Infect doubles its duration. The hand also '
          + 'grows from 3 cards to 4.',
        effects: [
          { tag: 'utility', label: 'The reach ones', detail: 'Laser bounces off 3 walls, Explosion doubles its radius, Chain gets longer range, Phase goes 1.5× further, Striker is 20% larger.', requiresUpgrade: 'r' },
          { tag: 'utility', label: 'The count ones', detail: 'Burst gets 2 more bullets, Emperor gets 5 more, and Barrier doubles its bullets while slowing them 300% into a standing wall.', requiresUpgrade: 'r' },
          { tag: 'control', label: 'The control ones', detail: 'Slash adds a 50% slow for 5 seconds, Chill adds 3 seconds to its slow, Pulse doubles its knockback, Infect doubles its duration.', requiresUpgrade: 'r' },
          { tag: 'utility', label: 'A bigger hand', detail: '4 cards instead of 3, selectable with 1–4.', requiresUpgrade: 'r' },
        ],
      },
      notes: [
        'Stars belong to the card type, not the card: star a Laser and every Laser you draw for the rest of the match carries it.',
        'A held die is a passive you are choosing over everything else the face could do — and the cooldown keeps running while you hold it.',
        'A greatly enchanted card counts as glyphed for Wonder Glyphs\' second gifts, since it is strictly the stronger version.',
      ],
    },

    'fate-cursed-talisman': {
      basics:
        'Launches a paper talisman that sticks to the first enemy it hits for 12 damage and then orbits '
        + 'them for up to 12 seconds. While it is on them, every hit they take has a 15% chance to crit for '
        + 'double, and any of your bullets that pass within 110px of the talisman are dragged in, spun '
        + 'round it and flung straight into them. It has 33 HP: their own shots can break it off. 10s cooldown.',
      cast: 'F, at the cursor. 10s cooldown.',
      effects: [
        { tag: 'damage', label: 'The hit', detail: '12 damage, and the talisman sticks and orbits them for up to 12 seconds.' },
        { tag: 'debuff', label: 'The curse', detail: 'Every hit they take — from anything — has a 15% chance to crit for 2x.' },
        { tag: 'utility', label: 'The pull', detail: 'Your bullets within 110px of the talisman are dragged into it, circle it for 0.34s, and are flung into the cursed.' },
        { tag: 'cost', label: 'It can be shot off', detail: '33 HP. Their bullets that hit the talisman damage it, and at 0 the curse breaks.' },
      ],
      upgrade: {
        basics:
          'The talisman has 66 HP instead of 33, the cursed crit 25% of the time instead of 15%, and it '
          + 'grabs your bullets from 170px instead of 110px.',
        effects: [
          { tag: 'utility', label: 'Tougher', detail: '66 HP instead of 33 — twice as much shooting to break it.', requiresUpgrade: 'f' },
          { tag: 'debuff', label: 'Nastier', detail: '25% crit chance on the cursed instead of 15%.', requiresUpgrade: 'f' },
          { tag: 'utility', label: 'Greedier', detail: 'Drags your bullets in from 170px instead of 110px.', requiresUpgrade: 'f' },
        ],
      },
      notes: [
        'A spray card like Burst or Emperor thrown roughly at a cursed foe becomes far more accurate: the pellets that would have missed are pulled back in.',
        'One curse per fighter — a second talisman replaces the first rather than stacking.',
      ],
    },

    'fate-all-in': {
      basics:
        'Press Q to open the table, click the cards in your hand you want to wager (or press 1–3), then '
        + 'press Q again to bet them. The cards leave your hand at once, and a wheel orbits you at 100px, '
        + 'following the cursor for 3 seconds. When it lands, anything within 50px of it takes the cards\' '
        + 'worth — 20 per card plus 6 for every throw it had left, doubled by a glyph, quadrupled by Tarot, '
        + 'raised by stars. Miss and the cards are simply gone. 25s cooldown.',
      cast: 'Q, click cards to wager, Q again to bet (Q with none picked cancels). Ultimate. 25s cooldown.',
      effects: [
        { tag: 'damage', label: 'The win', detail: 'Each wagered card is worth 20 + 6 per use left (a fresh card is 38), ×2 glyphed, ×4 greatly enchanted, +15% per star. Three fresh cards land for 114.' },
        { tag: 'cost', label: 'The loss', detail: 'The wagered cards were thrown on the table either way. Miss, and all of them were sacrificed for nothing.' },
        { tag: 'area', label: 'The spin', detail: '3 seconds, 50px radius, and you can keep repositioning the wheel with the cursor for all of it. It is aimed at the moment it lands, not at the moment it is cast.' },
      ],
      upgrade: {
        basics:
          'A marker on your health bar stakes HP on top of the cards, starting at 0: a hit adds it '
          + 'to the damage and a miss takes it from you. The orbit runs 5 seconds instead of 3.',
        effects: [
          { tag: 'utility', label: 'The marker', detail: 'Stakes HP on top of the wagered cards, from 0 up to your current health. Hit: added to the damage. Miss: you take it.', requiresUpgrade: 'q' },
          { tag: 'utility', label: 'Longer to aim', detail: '5 seconds of orbit instead of 3, which is a great deal more time to walk the wheel onto somebody.', requiresUpgrade: 'q' },
        ],
      },
      notes: [
        'A Cursed Talisman on the target means the wager itself can crit for double.',
        'The Cocky curse from Tarot of Fate stakes your entire remaining health on top of the cards for the rest of the match, which turns every All In into a match point.',
        'A bot cannot steer the wheel with a cursor, so its wheel turns toward you at a walkable pace — and it bets its whole hand.',
      ],
    },
  },

  perks: {
    paper: {
      basics:
        'Right-click fires a five-card spread from the hand all at once, and the damage is the poker '
        + 'hand it makes — per card, across all five: high card 1, pair 2, two pair 4, three of a kind 6, '
        + 'straight 8, flush 10, full house 14, four of a kind 20, straight flush 30, royal flush 40. 2s '
        + 'cooldown.',
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
      basics:
        'Right-click any card in the hand to bin it, with no cooldown and no cost, and every third card '
        + 'binned deals two fresh ones immediately rather than waiting for the 2.5-second refill. Three '
        + 'binned for two dealt is a net loss of one card, bought instantly instead of over 7.5 '
        + 'seconds.',
      effects: [
        { tag: 'utility', label: 'Binning', detail: 'Right-click any card in the hand to discard it, with no cooldown and no cost.' },
        { tag: 'utility', label: 'The payout', detail: 'Every 3rd card binned deals 2 fresh ones immediately, rather than waiting for the 2.5-second refill.' },
        { tag: 'utility', label: 'The maths', detail: 'Three binned for two dealt is a net loss of one card, bought instantly instead of over 7.5 seconds.' },
      ],
      notes: [
        'It is the only thing in the element that makes a specific card more likely without narrowing the pool: churn until the one you want appears.',
        'The mastery requirement Fortune Teller counts every card that enters your hand, so Cycle trains it alongside Side Shuffle\'s draws.',
      ],
    },
    'tarot-of-fate': {
      basics:
        'A bindable enchant worth ×4 on everything the card does, for its next throw. It overrules a '
        + 'glyph for that throw rather than multiplying with it (the glyph survives), and it counts as '
        + 'glyphed for Wonder Glyphs\' second gifts. The curse fires on the play — or the wager — rather '
        + 'than on the enchant, so a greatly enchanted card sitting in your hand costs nothing at all. 20s cooldown.',
      cast: 'The bound key, on whichever card the cursor is hovering. 20s cooldown.',
      effects: [
        { tag: 'buff', label: 'Greatly enchanted', detail: '×4 on everything the card\'s next throw does. It overrules a glyph for that throw rather than multiplying with it, and it counts as glyphed for Wonder Glyphs\' second gifts.' },
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
          { emoji: '😈', name: 'Cocky', description: 'All In stakes your entire health bar on top of the cards for the rest of the match — permanently, and there is no way to undo it.' },
          { emoji: '✨', name: 'Purging', description: 'Strips glyphs and great enchants off your whole hand, and puts Tarot, Dice of Doom and Cursed Talisman on 20-second cooldowns.' },
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
