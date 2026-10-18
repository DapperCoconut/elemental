import { ElementCodex } from '../AbilityCodex';

/**
 * Gold — the alchemist (element id `fortune`, kept from the shopkeeper it replaced).
 *
 * Verified against `src/elements/fortune.ts` and `kits/FortuneKit.ts`. The five shop upgrades
 * (2026-10-16) are constants in the kit's "Shop upgrades" block and the mastery (2026-10-17) in
 * its "Mastery" block — the shopkeeper's was retired with the 2026-10-15 rework. No perks. Every
 * number below is a constant at the top of the kit.
 */
const fortune: ElementCodex = {
  identity:
    'A gold-obsessed alchemist in brass goggles. One hand throws whatever is nearest; the other turns '
    + 'it to gold on the way. His purse is the element\'s one resource: it fills from standing in his '
    + 'own golden dust, from the blood of an enemy whose heart he has gilded, and from the floor and '
    + 'coins a Midas-cursed enemy leaves behind — and it is spent ten at a time on Advance, three '
    + 'stat cards over his head, the only thing in the kit that makes him permanently better at the '
    + 'rest of it.',

  passives: [
    {
      emoji: '🪙',
      name: 'The Purse',
      basics:
        'Gold starts every match at 0 and is shown as the Gold box in your status tray. Nothing pays '
        + 'it on its own: standing inside your own Gold Plume earns 2 a second; every 20 damage a '
        + 'gold-hearted enemy takes (from anything) earns 1; every 3 seconds spent on Midas gold floor '
        + 'earns 1; a coin dropped by a cursed enemy\'s shot is worth 1 and a golden statue 2, both '
        + 'collected by walking within 28px of them. Fractions are carried, so 2 a second is never '
        + 'rounded away. Gains pop over your head in batches every 0.6 seconds. Advance (E) is the only '
        + 'thing that spends it — 10 a pick.',
      effects: [
        { tag: 'resource', label: 'Gold Plume', detail: '2 gold a second while you stand inside your own cloud (105px).' },
        { tag: 'resource', label: 'Heart of Gold', detail: '1 gold for every 20 damage a gold-hearted enemy takes, from any source.' },
        { tag: 'resource', label: 'Gold floor', detail: '1 gold every 3 seconds you spend standing on Midas floor.' },
        { tag: 'resource', label: 'Loot', detail: 'Coins are worth 1 and statues 2. Walk within 28px to collect; they last 25 seconds.' },
        { tag: 'buff', label: 'Greed', detail: 'Each Greed pick from Advance multiplies every source above by another +25%.' },
      ],
      notes: [
        'The Advance card on your tray fills with the purse as well as with its cooldown — it is only ready at 10 gold.',
        'Only the alchemist can pick coins and statues up; walking over them as the enemy does nothing.',
      ],
    },
  ],

  abilities: {
    'fortune-fray': {
      basics:
        'Throws a clump of 7 grass blades out of one hand in a fan (about ±14°) at 430–540px a '
        + 'second. Over the first 0.18 seconds your other hand gilds them from green to solid gold. '
        + 'Then they fall toward the bottom of the screen under gravity (900px/s²), as if the arena had '
        + 'a floor at the bottom; anything still flying after 1.8 seconds fades. Each blade deals 3 to '
        + 'the first body it touches and is spent. 0.52s cooldown; holding the button keeps throwing.',
      cast: 'Click, aimed at the cursor; hold to keep throwing. 0.52s cooldown.',
      effects: [
        { tag: 'damage', label: 'Per blade', detail: '3 damage, one body per blade. 7 blades a throw — 21 if the whole clump lands.' },
        { tag: 'area', label: 'The arc', detail: 'Leaves at 430–540px/s and falls at 900px/s². Gone after 1.8s or off the screen.' },
        { tag: 'buff', label: 'Sheaf', detail: 'Each Sheaf pick from Advance adds 2 blades to the clump.' },
      ],
      upgrade: {
        basics:
          'Accumulation: a blade that misses and falls all the way to the bottom of the arena stays '
          + 'there, lying on the floor (up to 90; the oldest gives way). Once six or more are down, the '
          + 'pile rolls for a burst — every 1.5 seconds with a small pile, down to every 0.35 seconds with '
          + 'a big one, with a chance of n ÷ (n + 30) for n blades on the floor. A burst picks 5 blades '
          + 'plus a third of the pile, the ones lying nearest the enemy closest to the floor, stirs them '
          + 'for 0.28 seconds, then throws them up on arcs that come down through where that enemy stood. '
          + 'Each is a gold blade worth 3, and one that misses again lands back on the pile.',
        effects: [
          { tag: 'summon', label: 'The pile', detail: 'Blades that reach the floor stay there — up to 90.', requiresUpgrade: 'click' },
          { tag: 'damage', label: 'Bursts', detail: '5 blades + a third of the pile, 3 each, thrown up through the enemy nearest the floor.', requiresUpgrade: 'click' },
          { tag: 'area', label: 'More is more', detail: 'Rolls every 1.5s → 0.35s as the pile grows; chance n ÷ (n + 30). Nothing below 6 blades.', requiresUpgrade: 'click' },
        ],
      },
      notes: [
        'Aim above anything far away: at 300px the clump has dropped roughly 150px by the time it arrives.',
        'Point-blank every blade lands; at range the fall spreads them into a curtain.',
      ],
    },

    'fortune-advance': {
      basics:
        'Spends 10 gold and floats three different stat cards over your head, drawn at random from '
        + 'eight. Click a card to keep it for the rest of the match; picks stack with each other and '
        + 'with themselves. A click on a card is spent on the card — it does not also throw grass. An '
        + 'offer left unanswered for 10 seconds picks one at random (the gold is already gone). Pressing '
        + 'E with fewer than 10 gold is refused without spending the cooldown. 1.5s cooldown.',
      cast: 'E, then Click a card. Needs 10 gold. 1.5s cooldown.',
      effects: [
        { tag: 'resource', label: 'Cost', detail: '10 gold per offer.' },
        { tag: 'buff', label: 'Might', detail: '+10% damage on everything Gold deals, per pick.' },
        { tag: 'shield', label: 'Gilded Hide', detail: '×0.93 damage taken per pick (7%, multiplicative).' },
        { tag: 'buff', label: 'Stride', detail: '+7% movement speed per pick.' },
        { tag: 'buff', label: 'Haste', detail: '×0.92 on every Gold cooldown per pick (8%, multiplicative).' },
        { tag: 'heal', label: 'Vigor', detail: '+30 max HP per pick, and heals the 30.' },
        { tag: 'resource', label: 'Greed', detail: '+25% gold from every source per pick.' },
        { tag: 'buff', label: 'Sheaf', detail: '+2 blades on every Fray per pick.' },
        { tag: 'heal', label: 'Mend', detail: '1.5 HP a second of regeneration per pick.' },
      ],
      upgrade: {
        basics:
          'Artisan: every offer shows two more cards, each set with a jewel on top and an extra price '
          + 'under it, paid when you take it (on top of the 10 the offer cost). A card you cannot afford '
          + 'is greyed and refuses the click. Pearl (8 gold) is worth two picks; Diamond (20) four. Ruby '
          + '(10) turns the card on the enemy instead: Might becomes 10% less damage dealt to you, Gilded '
          + 'Hide 7% more damage taken, Stride 7% slower, Haste 8% longer cooldowns, Vigor 30 less max HP '
          + 'and Mend a 1.5-HP-a-second bleed — never on Greed or Sheaf. Sapphire (8) starts at one '
          + 'pick and grows by one more every 20 seconds, up to six. Jade (12) is worth double for every '
          + 'other jade you own — one is a pick, two are two picks each, three are four each.',
        effects: [
          { tag: 'resource', label: 'Jeweled cards', detail: 'Two extra cards per offer, each with its own price.', requiresUpgrade: 'e' },
          { tag: 'buff', label: 'Pearl · Diamond', detail: '×2 for 8 gold · ×4 for 20 gold.', requiresUpgrade: 'e' },
          { tag: 'debuff', label: 'Ruby', detail: 'The card\'s effect, inverted, on the enemy. 10 gold. Not on Greed or Sheaf.', requiresUpgrade: 'e' },
          { tag: 'buff', label: 'Sapphire', detail: '1 pick, +1 every 20s, up to 6. 8 gold.', requiresUpgrade: 'e' },
          { tag: 'buff', label: 'Jade', detail: 'Each jade is worth 2^(jades owned − 1) picks. 12 gold.', requiresUpgrade: 'e' },
        ],
      },
      notes: [
        'A bar under the cards counts down the 10 seconds before a card is picked for you.',
        'With Artisan, an offer left to its fuse takes one of the three plain cards — never a jeweled one; ruby picks show in your tray as Ruby Curses.',
        'Each pick appears in your status tray with how many times you have taken it.',
        'Online the opponent sees your three cards come up, but not which one you took.',
      ],
    },

    'fortune-plume': {
      basics:
        'Throws a bag of powder at the cursor (up to 380px) in a 0.45-second arc. It bursts where it '
        + 'lands into a 105px cloud of fine golden dust that lasts 6 seconds. Enemies inside take 9 '
        + 'damage a second, in ticks every 0.25 seconds. While you stand inside your own cloud you earn '
        + '2 gold a second. Several clouds can be out at once. 9s cooldown.',
      cast: 'R, at the cursor (up to 380px). 9s cooldown.',
      effects: [
        { tag: 'dot', label: 'The dust', detail: '9 damage a second to every enemy inside, ticking every 0.25s.' },
        { tag: 'area', label: 'The cloud', detail: '105px radius, 6 seconds. Lands 0.45s after the throw.' },
        { tag: 'resource', label: 'Gold', detail: '2 gold a second while you stand inside it.' },
      ],
      upgrade: {
        basics:
          'Glittery Cloak: the cloud is 20% larger (126px) and full of gold leaf. While you stand '
          + 'inside your own cloud, 15% of the attacks that reach you miss. Enemies standing in it shoot '
          + 'wide — a bot or husk aims up to 24° off, and a player\'s own shots leave the hand up to 18° '
          + 'off line.',
        effects: [
          { tag: 'area', label: 'Bigger', detail: '126px instead of 105px.', requiresUpgrade: 'r' },
          { tag: 'shield', label: 'Dodge', detail: '15% of incoming attacks miss while you stand in your own cloud.', requiresUpgrade: 'r' },
          { tag: 'debuff', label: 'Blinding', detail: 'Enemies inside shoot up to 18–24° off their aim.', requiresUpgrade: 'r' },
        ],
      },
      notes: [
        'Dropped on a gold-hearted enemy it forces a choice: stand in the dust, or walk out and stress the heart.',
        'Dropped at your own feet it is an income — the cheapest way to fill the purse for Advance.',
      ],
    },

    'fortune-heart': {
      basics:
        'Lunges 150px toward the cursor in 0.18 seconds, the golden cane thrust out in front. The '
        + 'cane tip sweeps the path and stabs every enemy it passes for 16, once each, and gives each '
        + 'of them a golden heart for 6 seconds. A gold heart cannot take exercise: every pixel they '
        + 'move fills its stress (420px of travel fills it from empty), and it settles by 12% a '
        + 'second while they stand still. A full heart is a heart attack — 28 damage and a 1.4-second '
        + 'stun in which they can neither move nor cast — and the stress starts again from empty for '
        + 'whatever is left of the 6 seconds. Every 20 damage a hearted body takes, from anything, '
        + 'pays you 1 gold. 10s cooldown.',
      cast: 'F, toward the cursor. 10s cooldown.',
      effects: [
        { tag: 'movement', label: 'The lunge', detail: '150px toward the cursor in 0.18s.' },
        { tag: 'damage', label: 'The stab', detail: '16 to every enemy the cane tip passes through, once each.' },
        { tag: 'debuff', label: 'Golden heart', detail: '6 seconds. Stress fills with movement: 420px of travel from empty. Settles 12%/s while still.' },
        { tag: 'control', label: 'Heart attack', detail: '28 damage and a 1.4s stun (no movement, no casting) when the heart fills. Stress resets; the heart stays.' },
        { tag: 'resource', label: 'Blood money', detail: '1 gold for every 20 damage the hearted body takes.' },
      ],
      upgrade: {
        basics:
          'Gold Hex: a golden heart also hexes whoever wears it. While the hex lasts — as long as the '
          + 'heart, and 5 seconds after — every ability they have that is cooling down charges at half '
          + 'speed. It shows in their status tray as Gold Hex.',
        effects: [
          { tag: 'debuff', label: 'Hex', detail: 'Every cooldown charges 50% slower.', requiresUpgrade: 'f' },
          { tag: 'debuff', label: 'Duration', detail: 'The heart\'s 6 seconds, plus 5 more after it.', requiresUpgrade: 'f' },
        ],
      },
      notes: [
        'The heart is drawn over their head and beats faster and redder as the stress climbs — they can see it too.',
        'A single frame of movement counts for at most 60px, so a teleport is not an instant heart attack.',
        'A stunned body does not build stress, so the second attack has to be earned.',
        'Online the heart is decided on the attacker\'s machine; the victim sees the same heart and stress mirrored.',
      ],
    },

    'fortune-midas': {
      basics:
        'Curses the enemy nearest the cursor (within 260px of it; otherwise the enemy nearest you) for '
        + '10 seconds. They slowly turn to gold from the feet up, and so does the floor they walk on: '
        + 'every 26px they travel leaves a patch of gilded floor (about 30px) that stays for the rest '
        + 'of the match. Standing on gold floor makes you 50% faster and earns 1 gold every 3 seconds. '
        + 'Every shot they fire while cursed drops out of the air as a gold coin (+1 when you pick it up), '
        + 'and anything they summon or build turns into a golden statue the moment it appears (+2). '
        + '30s cooldown.',
      cast: 'Q, at the cursor. Instant. 30s cooldown. Ultimate. Refused if there is no enemy at all.',
      effects: [
        { tag: 'debuff', label: 'The curse', detail: '10 seconds on the enemy nearest the cursor (within 260px), else nearest you.' },
        { tag: 'summon', label: 'Gold floor', detail: 'A ~30px patch every 26px they walk, permanent for the match (the oldest of 260 is recycled).' },
        { tag: 'buff', label: 'On gold floor', detail: '+50% movement speed and 1 gold every 3 seconds.' },
        { tag: 'control', label: 'Shots to coins', detail: 'Every projectile they fire becomes a dropped coin worth 1 gold.' },
        { tag: 'control', label: 'Summons to statues', detail: 'Every summon or structure they make turns into a golden statue worth 2 gold. It does nothing else.' },
      ],
      upgrade: {
        basics:
          'Full Metal Alchemy: when the curse runs its full 10 seconds, the enemy is turned to solid '
          + 'gold for 3 seconds — a statue with light rays shining off it, stunned in place, unable to '
          + 'move or cast. Then you choose. Hit it while it stands and it takes double damage from '
          + 'everything; or leave it untouched, and when it melts it leaves 3 gold coins at its feet. '
          + 'Any damage at all cracks the statue and spends the coins. A cleansed or dead target never '
          + 'becomes a statue.',
        effects: [
          { tag: 'control', label: 'Solid gold', detail: '3-second stun (no moving, no casting) when the curse ends on its own.', requiresUpgrade: 'q' },
          { tag: 'damage', label: 'Brittle', detail: 'Takes double damage while it stands.', requiresUpgrade: 'q' },
          { tag: 'resource', label: 'Melt', detail: 'Untouched, it melts into 3 coins (1 gold each).', requiresUpgrade: 'q' },
        ],
      },
      notes: [
        'The floor outlives the curse — a long curse is a road you keep for the whole fight.',
        'Coins and statues last 25 seconds on the floor.',
        'In Invasion a shot only counts as the cursed husk\'s if it is first seen within 70px of it, and summons are not transmuted (husks build nothing).',
        'Online both machines see the curse: your opponent\'s own shots turn to coins on their screen too.',
      ],
    },
  },

  mastery: {
    'gilded-augment': {
      basics:
        'When your HP falls below 30%, the purse starts paying for it: you heal 16 HP a second and move '
        + '30% faster, automatically, until you are back up to 55%. It is not free. It starts at about 2 '
        + 'gold a second and the price climbs the whole time it runs — after 2.5 seconds it costs double, '
        + 'after 5 seconds triple — so a long rescue empties a purse fast. When the gold runs out, it '
        + 'stops. Every Rags to Riches stack makes it heal 35% faster and cost 25% less.',
      cast: 'Passive. Always on while Gold Mastery is enabled and Gold is the element being played.',
      effects: [
        { tag: 'heal', label: 'Bought back', detail: '16 HP a second from below 30% HP until 55%, while you have gold.' },
        { tag: 'buff', label: 'Running on gold', detail: '+30% movement speed while it heals.' },
        { tag: 'cost', label: 'Dearer every second', detail: '~2 gold a second at first, +100% more every 2.5 seconds it keeps running.' },
      ],
      notes: [
        'Each stretch of healing starts at the cheap price again — the climb only counts the current one.',
        'Advance and Rags to Riches spend the same purse, so what you keep in it is your safety net.',
        'A Gold NPC on Nightmare is saved by it the same way.',
      ],
    },
    'rags-to-riches': {
      basics:
        'Needs at least 20 gold, and spends all of it — every coin in the purse, not just twenty. In '
        + 'return a little more of your body turns to solid gold, for the rest of the match: +20% damage '
        + 'on everything Gold does, +50% gold from every source, and Gilded Augment heals 35% faster for '
        + '25% less. It stacks without limit; each use sets another gold plate into the body. '
        + 'Bindable to R, F or Q. 1.5s cooldown.',
      cast: 'The bound key (R, F or Q). Instant. Needs 20 gold and spends the whole purse.',
      effects: [
        { tag: 'cost', label: 'Everything', detail: 'Empties the purse. Refused below 20 gold.' },
        { tag: 'buff', label: 'Gilded', detail: '+20% damage per stack, for the match.' },
        { tag: 'resource', label: 'Richer', detail: '+50% gold earned per stack, added to Greed.' },
        { tag: 'heal', label: 'Better augment', detail: 'Gilded Augment heals 35% faster and costs 25% less per stack.' },
      ],
      notes: [
        'Cash in at exactly 20 and you lose nothing to spare; wait for 40 and the stack costs you an Advance.',
        'The extra gold from earlier stacks makes the next 20 come faster — the element snowballs.',
        'A Gold NPC on Nightmare binds it over Midas Curse, saves every other purse for it, and cashes in only while above half health.',
        'Online the stack reaches your opponent\'s screen, so their copy of your rig gilds too.',
      ],
    },
  },
};

export default fortune;
