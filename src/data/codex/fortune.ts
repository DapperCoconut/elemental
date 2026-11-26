import { ElementCodex } from '../AbilityCodex';

/**
 * Gold — the alchemist and his factory (element id `fortune`, kept from the shopkeeper it replaced).
 *
 * Verified against `src/elements/fortune.ts`, `kits/FortuneKit.ts`, `kits/FortuneTycoon.ts` and
 * `kits/FortuneBilliards.ts` (the tycoon rework). The five shop upgrades are constants in the kit's
 * "Shop upgrades" block and in the tycoon file, the mastery in the kit's "Mastery" block. No perks.
 * Every number below is a named constant in one of those files.
 */
const fortune: ElementCodex = {
  identity:
    'A gold-obsessed alchemist in brass goggles who has built a factory to prove it. A tycoon runs '
    + 'along the top of the screen all match — droppers, a conveyor, a refiner — paying gold into his '
    + 'purse on its own. The purse buys more factory, or it buys Advance: three stat cards over his '
    + 'head, ten gold a pick. Finish the factory and Rebirth tears it down in exchange for a better '
    + 'alchemist. Underneath that he fights with thrown grass, a cane, and a handful of pool balls.',

  passives: [
    {
      emoji: '🏭',
      name: 'The Tycoon',
      basics:
        'A strip of machinery along the top of the screen, running from the first second of the match. '
        + 'Droppers on the left let pieces of ore fall onto a conveyor; the belt carries each piece right, '
        + 'under whatever upgraders have been built over it, into the refiner, which pays its value into '
        + 'your purse (the Gold box in your status tray, 0 at the start). You begin with one dropper: a '
        + 'piece worth 1 gold every 2 seconds. Everything else is bought by clicking a pad under the belt '
        + '— the next dropper, the next upgrader, the next refiner level — one pad per chain at a time, '
        + 'green when you can afford it and red when you cannot. Eight pads in all, 160 gold together; '
        + 'when all eight are bought the tycoon is complete, which is what Rebirth (Q) waits for.',
      effects: [
        { tag: 'resource', label: 'First dropper', detail: '1 piece worth 1 gold every 2 seconds. Free, and always there.' },
        { tag: 'resource', label: 'Droppers', detail: 'Two more of the same for 6 and 12 gold, then a Heavy Dropper for 26: a piece worth 5 every 5 seconds.' },
        { tag: 'buff', label: 'Upgraders', detail: 'Bought in order for 8, 16 and 32 gold: +1 to every piece, +1 again, then ×1.5 (the Multiplier).' },
        { tag: 'buff', label: 'Refiner', detail: 'Refiner II (20 gold) pays 25% more for every piece; Refiner III (40 gold) pays 50% more.' },
        { tag: 'area', label: 'The belt', detail: 'Runs at 78px a second — a piece from the first dropper takes about 5 seconds to reach the refiner.' },
        { tag: 'resource', label: 'Heart of Gold', detail: '1 gold for every 20 damage a gold-hearted enemy takes, from any source.' },
        { tag: 'resource', label: 'Gold health', detail: '1 gold for every 10 gold health an enemy cuts away (Rebirth gives 150).' },
        { tag: 'buff', label: 'Greed and Rebirth', detail: 'Each Greed pick and each Rebirth adds +25% to gold from every source.' },
        { tag: 'cost', label: 'Spending', detail: 'Pads cost 6 to 40 gold each. Advance (E) costs 10 a pick.' },
      ],
      notes: [
        'A click on a pad is spent on the pad — it does not also throw grass. Hover a pad to read what it builds and what it costs.',
        'Upgraders only touch pieces that pass under them, so ore already past one when it is built is paid at its old value.',
        'Fractions are carried, so nothing is rounded away. Gains pop over your head in batches every 0.6 seconds.',
        'The tycoon stops while you are dead. Yours sits top-left under your health bar; an enemy alchemist\'s sits bottom-right, above the ability tray.',
        'Online your opponent sees your tycoon run and every pad you buy.',
      ],
    },
  ],

  abilities: {
    'fortune-fray': {
      basics:
        'Throws a clump of 7 grass blades out of one hand in a fan (about ±14°) at 430–540px a '
        + 'second. Over the first 0.18 seconds your other hand gilds them from green to solid gold. '
        + 'Then they fall toward the bottom of the screen under gravity (900px/s²), as if the arena had '
        + 'a floor at the bottom; anything still flying after 1.8 seconds fades. Each blade deals 2 to '
        + 'the first body it touches and is spent. 0.52s cooldown; holding the button keeps throwing.',
      cast: 'Click, aimed at the cursor; hold to keep throwing. 0.52s cooldown.',
      effects: [
        { tag: 'damage', label: 'Per blade', detail: '2 damage, one body per blade. 7 blades a throw — 14 if the whole clump lands.' },
        { tag: 'area', label: 'The arc', detail: 'Leaves at 430–540px/s and falls at 900px/s². Gone after 1.8s or off the screen.' },
        { tag: 'buff', label: 'Sheaf', detail: 'Each Sheaf pick from Advance adds 2 blades to the clump.' },
      ],
      upgrade: {
        basics:
          'Life-support: right click switches your tycoon into Life-support, and right click switches it '
          + 'back. In Life-support every dropper runs 25% slower, and the refiner pays health instead of '
          + 'gold — 1.5 HP for every gold the piece would have made (Greed and Rebirth still count). The '
          + 'refiner glows red while it is on. A blue pad also appears under your first dropper: it costs '
          + '10 shards — your real shards, not gold — and makes that dropper\'s pieces worth 3 times as much '
          + 'for the rest of the match. It survives Rebirth.',
        effects: [
          { tag: 'heal', label: 'Life-support', detail: 'Right click: the refiner pays 1.5 HP per gold instead of gold. Right click again to switch back.', requiresUpgrade: 'click' },
          { tag: 'cost', label: 'Slower belt', detail: 'Every dropper drops 25% slower while it is on.', requiresUpgrade: 'click' },
          { tag: 'resource', label: 'Triple Dropper', detail: 'A pad for 10 shards: the first dropper\'s pieces are worth 3. Kept through Rebirth.', requiresUpgrade: 'click' },
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

    'fortune-billiards': {
      basics:
        'Throws a handful of 5 golden pool balls onto the floor ahead of you (toward the cursor, 62 to '
        + '150px away) and pulls out your cane as a cue, for up to 8 seconds. The cue points at the cursor. '
        + 'Hold the mouse button to draw it back — the longer you hold, the harder the shot, full power '
        + 'after 1 second — and release to strike. The cane thrusts out up to 112px: the first of your balls in its line shoots '
        + 'off at 300 to 1050px a second, and anyone standing in the line before that ball is poked by '
        + 'the cane itself. The balls are real — they knock into each other, come off the walls, bounce '
        + 'off bodies and roll to a stop. A ball moving fast enough hurts whoever it hits, and the harder '
        + 'the better. One shot, then the cane goes away. Balls stay on the floor for 14 seconds (10 at '
        + 'most). 12s cooldown.',
      cast: 'R, toward the cursor. Then aim, hold to draw back and release to shoot. 12s cooldown.',
      effects: [
        { tag: 'summon', label: 'The rack', detail: '5 balls, landing 0.38s after the throw. 14 seconds on the floor.' },
        { tag: 'damage', label: 'Ball', detail: '5 to 22 damage by speed (nothing below 130px/s). Once per ball per body every 0.35s.' },
        { tag: 'damage', label: 'Cane', detail: '8 to 18 by power, to anyone in the line of the thrust.' },
        { tag: 'area', label: 'Physics', detail: 'Balls collide with each other, the walls and enemy bodies, and roll to a stop. Up to 10 of yours on the floor.' },
      ],
      upgrade: {
        basics:
          'Billiard Blitz: when a ball from your shot hits an enemy, the cane comes straight back for '
          + 'another shot, and every ball of yours stays on the floor at least 6 more seconds. Hit again '
          + 'and you go again — a good table can be shot for a long time.',
        effects: [
          { tag: 'buff', label: 'Go again', detail: 'A ball hitting an enemy gives the cane back for another shot.', requiresUpgrade: 'r' },
          { tag: 'summon', label: 'Longer table', detail: 'Your balls last at least 6 seconds more each time.', requiresUpgrade: 'r' },
        ],
      },
      notes: [
        'While the cane is out a click is a cue shot, not grass. A dashed sight shows the line, and a ring shows the ball you will hit.',
        'Bank shots work: a ball off a wall or another ball still hurts if it arrives fast enough.',
        'A gold-hearted enemy has to move to get out of the way of the balls — and moving fills the heart.',
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

    'fortune-rebirth': {
      basics:
        'Only when your tycoon is complete — all eight pads bought. You flash white in a column of '
        + 'light and come back a little more golden: chunks of you are raw gold ore from now on. The '
        + 'tycoon is reset to its first dropper, and you gain, for the rest of the match: +25% gold from '
        + 'every source, +15% damage on everything Gold deals, 15% less damage taken, and 150 gold '
        + 'health. Gold health is spent before your own health, and every 10 of it an enemy cuts away '
        + 'pays you 1 gold. Three rebirths at most; pressing Q before the tycoon is complete does nothing.',
      cast: 'Q. Needs a complete tycoon. Up to 3 times a match.',
      effects: [
        { tag: 'resource', label: 'Richer', detail: '+25% gold from every source, per rebirth.' },
        { tag: 'buff', label: 'Stronger', detail: '+15% damage per rebirth.' },
        { tag: 'shield', label: 'Tougher', detail: '×0.85 damage taken per rebirth.' },
        { tag: 'shield', label: 'Gold health', detail: '+150 gold health: spent first, and pays 1 gold per 10 lost.' },
        { tag: 'cost', label: 'The price', detail: 'The tycoon goes back to one dropper — every pad must be bought again.' },
      ],
      upgrade: {
        basics:
          'Golden Glory: every rebirth also builds one special machine on your tycoon, chosen at random '
          + 'from six you cannot buy, and it stays through every later rebirth. Midas Dropper: one piece '
          + 'on the belt at a time, worth 14. Mega Drill: a near-constant stream of tiny pieces (0.2 each, '
          + 'one every 0.4s; flat upgraders give them only a quarter). Dragon Upgrader: triples a piece, '
          + 'but burns 1 in 4. Tunnel of Fortune: +2, then ×1.25, in one upgrader. Shredder: a refiner '
          + 'part that pays 3 times as much for pieces no upgrader has touched. Flaming Furnace: heats up '
          + 'with every piece fed in, paying up to double, and cools down slowly when the belt runs dry.',
        effects: [
          { tag: 'resource', label: 'Droppers', detail: 'Midas Dropper (one at a time, 14 each) · Mega Drill (0.2 every 0.4s).', requiresUpgrade: 'q' },
          { tag: 'buff', label: 'Upgraders', detail: 'Dragon (×3, 25% burned) · Tunnel of Fortune (+2 then ×1.25).', requiresUpgrade: 'q' },
          { tag: 'buff', label: 'Refiners', detail: 'Shredder (×3 for unupgraded ore) · Flaming Furnace (up to ×2 while hot).', requiresUpgrade: 'q' },
        ],
      },
      notes: [
        'The bar on the card fills as you buy the tycoon, and stays empty once all three rebirths are spent.',
        'Rebirth resets the machines, not the purse — gold you were saving is still yours.',
        'Your rig gains three more plates of raw gold with every rebirth.',
      ],
    },
  },

  mastery: {
    'gilded-augment': {
      basics:
        'When your health and gold health together fall below 30% of your max HP, the purse starts '
        + 'paying for it: you gain 16 gold health a second and move 30% faster, automatically, until '
        + 'health and gold health are back up to 55%. Gold health is spent before your own health, and '
        + 'every 10 of it an enemy cuts away pays you 1 gold back. It is not free: it starts at about 2 '
        + 'gold a second and the price climbs the whole time it runs — after 2.5 seconds it costs '
        + 'double, after 5 seconds triple. When the gold runs out, it stops.',
      cast: 'Passive. Always on while Gold Mastery is enabled and Gold is the element being played.',
      effects: [
        { tag: 'shield', label: 'Bought back', detail: '16 gold health a second from below 30% until 55%, while you have gold.' },
        { tag: 'buff', label: 'Running on gold', detail: '+30% movement speed while it runs.' },
        { tag: 'cost', label: 'Dearer every second', detail: '~2 gold a second at first, +100% more every 2.5 seconds it keeps running.' },
      ],
      notes: [
        'Each stretch starts at the cheap price again — the climb only counts the current one.',
        'Gold health it buys pays a little back as it is cut away, so the true price is lower than it looks.',
        'A Gold NPC on Nightmare is saved by it the same way.',
      ],
    },
    'no-pain-no-gain': {
      basics:
        'Stab yourself with a golden dagger for 18 damage (gold health takes it first, and it never '
        + 'kills you). The blood sprays out of the other side of you — away from the cursor — in a '
        + 'rough, widening splatter about 165px long, with a few stray drops off to the sides. Half a '
        + 'second later it sets, from the near end outward, into gold. Standing on your gold pays 1 gold '
        + 'every 2 seconds. The gold stays for the rest of the match, and you can lay more. Bindable to '
        + 'R, F or Q. 7s cooldown.',
      cast: 'The bound key (R, F or Q). Aim away from where you want the gold. 7s cooldown.',
      effects: [
        { tag: 'cost', label: 'The stab', detail: '18 damage to yourself. Never the killing blow.' },
        { tag: 'summon', label: 'Golden blood', detail: '11 blots in a widening spray plus 3 strays, opposite the cursor. Permanent.' },
        { tag: 'resource', label: 'Standing on it', detail: '1 gold every 2 seconds.' },
      ],
      notes: [
        'The dagger cuts gold health first, and cut gold health pays — after a Rebirth the stab partly pays for itself.',
        'A Gold NPC on Nightmare binds it over Rebirth, stabs whenever it is above 60% health and walks onto its gold.',
        'Online the splatter is laid from the same seed on both machines, so both floors match.',
      ],
    },
  },
};

export default fortune;
