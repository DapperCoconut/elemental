import { ElementCodex } from '../AbilityCodex';

/**
 * Fortune — a shopkeeper who set his stall up in the middle of a fight.
 *
 * Verified against `src/elements/fortune.ts`, `kits/FortuneKit.ts` and the five shop upgrades in
 * `Upgrades.ts`. Fortune has no perks and no mastery enhancements; every figure below is a
 * constant at the top of the kit or an entry in its catalogue tables.
 */
const fortune: ElementCodex = {
  identity:
    'Everything Fortune owns is an economy. Blood coins bleed out of every wound anybody takes, a '
    + 'stall stands in the middle of the arena selling to *both* sides, and the two investment '
    + 'buttons are the only things in the game that make a resource grow on its own. The trick is '
    + 'that his opponent is also his customer — they earn coins the same way, they can walk up to '
    + 'the same counter and buy the same bandages, and half of whatever they hand over comes '
    + 'straight back to him. The two illegal pages behind the second tab are the part they never '
    + 'see, and that is where all of his damage lives.',

  passives: [
    {
      emoji: '🪙',
      name: 'Blood Coins',
      magic:
        'Coins do not drop, they bleed. Every wound anybody in the arena takes is metered, and '
        + 'somebody gets paid for it — including the enemy, for hurting you. There is no other '
        + 'income in the element and no way to farm it except by fighting, which is why a Fortune '
        + 'who is losing is also a Fortune who is broke.',
      effects: [
        { tag: 'resource', label: 'The rate', detail: '1 coin per 20 damage dealt, measured on the raw figure before any mitigation. The remainder is carried, so nothing is rounded away.' },
        { tag: 'utility', label: 'Both sides earn', detail: 'Damage dealt to the Fortune player pays the enemy at exactly the same rate. They are running the same economy you are.' },
        { tag: 'utility', label: 'What it buys', detail: 'Everything: the stall, the two investments, and the ultimate — which eats 6 a second while it is on.' },
      ],
      notes: [
        'The meter reads the damage everyone actually took rather than the numbers the abilities announced, so overkill, shields and mitigation all resolve first.',
        'In Invasion the npc slot is a co-op ally, so a husk chewing on it pays the husks. In a plain duel that same slot is the enemy and pays you.',
      ],
    },
    {
      emoji: '🏪',
      name: 'The Stall',
      magic:
        'A canvas-and-timber shop stands in the dead centre of every Fortune match, and it is not '
        + 'yours alone. Stand within reach of the counter and the catalogue opens; press a number '
        + 'to buy. The enemy gets the same counter and the same general page — and every purchase '
        + 'they make hands you a commission.',
      effects: [
        { tag: 'utility', label: 'The counter', detail: 'Fixed at the centre of the arena. Served within 132px, for either side.' },
        { tag: 'utility', label: 'Buying', detail: 'Number keys 1–8 buy the row. T changes tab, but only for the person who owns the stall.' },
        { tag: 'resource', label: 'The commission', detail: 'Half of an enemy purchase, rounded down, paid straight into the shopkeeper\'s purse. A 20-coin Donation hands you 10.' },
        { tag: 'utility', label: 'Three pages', detail: 'GENERAL is public. ARMS and MODS are the illegal pages and only the shopkeeper can see or buy from them — an enemy at the counter is locked to GENERAL.' },
        { tag: 'utility', label: 'The loadout', detail: 'One gun at a time (a second replaces the first) and at most two attachments. That is the whole loadout.' },
      ],
      notes: [
        'A Fortune buying from their own stall pays no commission to themselves — it is skipped rather than paid in a circle.',
        'An NPC or a husk wanders up and buys something about every 9 seconds, which is a steady trickle of commission if you can afford to let them.',
        'The Donation costs 20 and does nothing whatsoever. It is also the single largest source of income in the element — for whoever is running the till.',
      ],
    },
    {
      emoji: '🛒',
      name: 'The Catalogue',
      magic:
        'Eight things on the public shelf, five guns behind the counter, and eight attachments in '
        + 'the drawer under them. This is where the element\'s real numbers live — the five keys are '
        + 'mostly plumbing for the purse, and the purse is what buys a rifle with a fifty-cal on it.',
      effects: [
        { tag: 'heal', label: '🩹 Bandages — 4', detail: 'Heal 20 HP on the spot.' },
        { tag: 'dot', label: '🌶️ Spicy Pepper — 3', detail: 'A fire trail behind you for 5 seconds: a patch every 70ms, each living 2.6s, 26 damage a second inside 22px and setting them alight for 0.9s. Overlapping patches split one patch\'s worth between them — a doubled-back trail is wider, not hotter.' },
        { tag: 'damage', label: '🧨 Explosives Pouch — 3', detail: 'Your next 5 damaging hits also blast everything *else* within 96px for the same damage. Gated to one blast per 260ms, and it deliberately spares the body that was hit.' },
        { tag: 'heal', label: '🧪 Cure-All — 10', detail: 'Cleanses every debuff you are carrying, heals 50, and refuses all new debuffs for 20 seconds — re-applied every frame, so nothing sneaks back in.' },
        { tag: 'damage', label: '🗡️ Ornate Daggers — 5', detail: '3 volleys of 8 daggers, 170ms apart, at 620 px/s in a 0.62-radian fan. 2 damage each — 48 across all three volleys if every dagger lands.' },
        { tag: 'summon', label: '🤖 Death Machine — 8', detail: 'A knife on a vacuum. 96 px/s, turns at 3.2 rad/s, chases the nearest enemy and deals 25 on touch with a 1.4-second per-victim gate. Up to 3 at once.' },
        { tag: 'buff', label: '🏺 The Miracle — 12', detail: '20 seconds in which every good thing is doubled: heals, item durations, capital gains and a winning market settlement.' },
        { tag: 'cost', label: '💝 Donation — 20', detail: 'Thank you for your generous support.' },
        { tag: 'control', label: '🥶 Chilly Pepper — 3', detail: '12 seconds of throwing a freezing ring 132px wide every 3 seconds. Anything of theirs it catches moves 20% slower for 5 seconds.', requiresUpgrade: 'e' },
        { tag: 'heal', label: '🗼 Heal Pylon — 5', detail: 'A pylon dropped at random on the floor. Touch it below full health to heal 10; it goes dark for 5 seconds and lights green again when it has recharged. Up to 4 standing.', requiresUpgrade: 'e' },
        { tag: 'movement', label: '🌀 Tele-Core — 8', detail: '12 seconds in which Space is a teleport straight to the cursor instead of a dash.', requiresUpgrade: 'e' },
      ],
      notes: [
        'ARMS: Pistol (free, 10 damage, 10 rounds, 190ms between shots), Revolver (5 coins, 20 damage, 6 rounds), Rifle (10 coins, 30 damage, a single round and a 1.25s reload), AR (15 coins, 3-round bursts of 8, 30 rounds), Golden Pistol (30 coins, hitscan, 20 damage plus 1 for every 2 coins in your purse).',
        'MODS: Silencer (3, hits silence for 2s), Bigger Mag (3, +3 rounds), Drum Mag (12, +10 rounds), Hollow Point (8, +5 bullet damage), 50 Cal. (15, +10 bullet damage), Sniper Scope (3, double bullet speed and pierce), Action Movie Prop (10, every shot launches you backwards), Acceleration Gear (9, up to 2.2× fire rate as the magazine empties).',
        'A Rifle with Hollow Point and 50 Cal. is 45 a shot for 33 coins — and it still only holds one round.',
        'Acceleration Gear and the two magazine mods pull against each other: a 20-round drum is 20 rounds spent walking up the ramp, where a 6-round revolver is at 2× by its fourth shot.',
        'The Golden Pistol scales off coins you are *holding*, so banking your money makes your gun worse. It is the one item that argues against the other four buttons.',
        'With Risky Marketing (R+) the counter also stocks the Grenade Launcher (20 coins, 3 shells, 20 damage in a 94px blast, 2.7s reload) and the Bouncy Blaster (12 coins, 8 rounds of 10 that ricochet 3 times), plus three grips: Specialized (6), Basic (6) and Dual Grip (25).',
        'The three grips are ordinary attachments and take one of your two slots, so Dual Grip plus a 50 Cal. is a complete loadout.',
        'Safe Marketing (E+) stocks the general page for both sides. An enemy who buys a Tele-Core off your shelf still hands you 4 coins for it.',
      ],
    },
  ],

  abilities: {
    'fortune-fire': {
      magic:
        'Pull the trigger on whatever is in your hand. You start with a free pistol and everything '
        + 'better is a purchase — so this button changes completely over the course of a match, from '
        + 'a peashooter to a single-shot rifle to a golden hitscan that gets stronger the richer you '
        + 'are. The gun is the rate limiter, not the cooldown: it fires the instant the slide has '
        + 'finished travelling.',
      cast: 'Click, held. Refused (and refunded) while reloading, mid-cycle, out of ammunition or while the beam is up — so a held button never quietly burns the cooldown.',
      effects: [
        { tag: 'damage', label: 'Out of the box', detail: 'The Pistol: 10 damage, 10 rounds, a shot every 190ms, 900 px/s, 1.15s reload. It is free and it is yours from the first frame.' },
        { tag: 'damage', label: 'What it becomes', detail: 'Revolver 20 · Rifle 30 · AR 3×8 in a burst · Golden Pistol 20 hitscan plus 1 per 2 coins held. Plus up to +15 from two damage attachments.' },
        { tag: 'utility', label: 'Running dry', detail: 'An empty magazine starts the reload automatically rather than doing nothing.' },
        { tag: 'utility', label: 'The bullets', detail: '1.6 seconds of life, 8px across, stopping on the first body unless a Sniper Scope is fitted — which doubles their speed and makes them pierce.' },
        { tag: 'buff', label: 'The rate is buyable too', detail: 'Acceleration Gear (9 coins) cycles the action faster the emptier the magazine is: 1× on a full one, ramping linearly to 2.2× on the last round. A pistol\'s 190ms gap closes to 86ms, and the AR\'s 3-round burst tightens with it.' },
        { tag: 'resource', label: 'It pays for itself', detail: 'Every bullet that lands is damage, and damage is coins at 1 per 20.' },
      ],
      upgrade: {
        magic:
          'Alt-Fire is a second trigger under the first one, and it is a different trigger on '
          + 'every gun. The pistol empties itself in one long inaccurate rattle. The revolver is '
          + 'held and spun. The AR throws the rest of its clip like a grenade. The golden pistol '
          + 'coughs up something slow and enormous that turns whoever it touches into money.',
        effects: [
          { tag: 'damage', label: 'Pistol — mag dump', detail: 'Every round left in the magazine, one every 55ms, scattered across 0.34 radians. It starts the reload itself, because there is nothing left to reload.', requiresUpgrade: 'click' },
          { tag: 'damage', label: 'Revolver — spin-up', detail: 'Held. 3 seconds of spinning walks the round from 20 to 30 damage, at up to 1.5× speed and 1.6× size, for one round. A fully spun round also pierces.', requiresUpgrade: 'click' },
          { tag: 'damage', label: 'AR — thrown clip', detail: 'The whole remaining clip at 640 px/s to the cursor, bursting there into one bullet per round left, thrown radially at 760 px/s. 30 rounds is 30 bullets.', requiresUpgrade: 'click' },
          { tag: 'debuff', label: 'Golden — Midas round', detail: '5 coins and 2 rounds for one 250 px/s slug: 25 damage, and it gilds them for 5 seconds. Every coin their wounds mint while gilded is worth double.', requiresUpgrade: 'click' },
          { tag: 'damage', label: 'Launcher — Exit Strategy', detail: 'Every shell at your own feet at once: 20 damage each, so a full drum is 60, to everything within 113px — and then you are off the screen for 3 seconds, unhittable and invisible, before falling back down.', requiresUpgrade: 'click' },
          { tag: 'damage', label: 'Blaster — heavy laser', detail: '4 rounds for one 20-damage bolt with 12 wall bounces in it. It passes through bodies rather than stopping on them, and forgets who it has already hit every time it comes off a wall.', requiresUpgrade: 'click' },
          { tag: 'utility', label: 'No second trigger', detail: 'The Rifle has none — it holds one round, and there is nothing clever to do with one round.', requiresUpgrade: 'click' },
        ],
      },
      notes: [
        'The ability\'s own cooldown is 140ms — deliberately shorter than any gun\'s cycle, so the weapon is always the thing setting the rate.',
        'With Dual Grip fitted and a gun bought for it, right click stops being alt-fire altogether and becomes the second gun\'s ordinary trigger.',
        'A Bigger Mag or Drum Mag tops up the magazine you are already holding rather than waiting for the next reload.',
        'The Action Movie Prop turns every shot into a small backward launch, which is the closest thing Fortune has to mobility.',
        'Acceleration Gear is priced off the rounds left *after* the shot, so a magazine emptied without a break gets faster the whole way down — and the reload is what takes the speed away again. It does nothing for the Rifle, whose one round is followed by 1.25 seconds of reloading either way.',
      ],
    },

    'fortune-safe': {
      magic:
        'Five coins into the bank, and the bank does what banks do: it pays you for leaving it '
        + 'alone. It is the only genuinely free money in the game — no risk, no condition, no way '
        + 'to lose it — and it is slow enough that using it means betting the fight will last.',
      cast: 'E. Tap to deposit; hold for 340ms to withdraw the whole balance at once. The tap resolves on release, because until the key comes back up there is no way to know it was not a hold.',
      effects: [
        { tag: 'resource', label: 'The deposit', detail: '5 coins per tap, or whatever you have if it is less. Refused with "NOTHING TO DEPOSIT" at zero.' },
        { tag: 'resource', label: 'Capital gains', detail: '10% of the balance every 10 seconds, rounded down, but never less than 1 coin however small the balance is.' },
        { tag: 'resource', label: 'Withdrawing', detail: 'The whole balance back into your purse in one go, and the clock resets.' },
        { tag: 'buff', label: 'Under the Miracle', detail: 'Capital gains are doubled for the 20 seconds it runs — 20% a settlement.' },
      ],
      upgrade: {
        magic:
          'Safe Marketing does not touch the bank at all. It restocks the shop: three new lines '
          + 'on the public shelf, which is the safest investment the element has — you are not '
          + 'betting on a market, you are widening the counter.',
        effects: [
          { tag: 'control', label: '🥶 Chilly Pepper — 3', detail: 'A ring of rime 132px across, thrown off you every 3 seconds for 12 seconds. Everything of theirs it catches moves at 80% speed for 5 seconds. The first ring goes off the instant you buy it.', requiresUpgrade: 'e' },
          { tag: 'heal', label: '🗼 Heal Pylon — 5', detail: 'One pylon at a random point on the floor. Walking within 30px of a lit one heals 10 HP and darkens it for 5 seconds. They stack to 4, and a body already at full health does not spend the charge.', requiresUpgrade: 'e' },
          { tag: 'movement', label: '🌀 Tele-Core — 8', detail: '12 seconds of Space teleporting you to the cursor instead of dashing 520px in a direction. Clamped 44px inside the arena.', requiresUpgrade: 'e' },
          { tag: 'utility', label: 'They are public', detail: 'All three sit on the GENERAL page, so the enemy at your counter can buy them — and hands you half the price when they do.', requiresUpgrade: 'e' },
          { tag: 'buff', label: 'Under the Miracle', detail: 'The Chilly Pepper and the Tele-Core last 24 seconds instead of 12, and a pylon heals 20.', requiresUpgrade: 'e' },
        ],
      },
      notes: [
        'The 1-coin floor means even a 1-coin deposit doubles every 10 seconds. Small deposits early are quietly the best rate in the element.',
        'Money in the bank is money not in your purse, which matters: the Golden Pistol scales off coins held, and the Paywall can only take what a payer actually has.',
        'Nothing can take money out of the bank but you. It is not lost on death and it is not tollable.',
      ],
    },

    'fortune-risky': {
      magic:
        'Five coins into the market, and the market judges you on the ten seconds that follow. '
        + 'Deal damage and it grows; take damage and it shrinks. Do both and it splits the '
        + 'difference rather than picking a side. It is the same deposit as the bank with the '
        + 'safety taken off, and the thing it is really measuring is whether you are winning.',
      cast: 'R. Tap to invest; hold for 340ms to cash out. Fresh money resets the window it will be judged on, so a deposit made at 9.9 seconds is not settled on somebody else\'s fight.',
      effects: [
        { tag: 'resource', label: 'The deposit', detail: '5 coins per tap. Refused with "NOTHING TO INVEST" at zero.' },
        { tag: 'resource', label: 'A good window', detail: 'Over 50 damage dealt in the 10 seconds: +20%, at least 1 coin.' },
        { tag: 'cost', label: 'A bad window', detail: 'Over 100 damage taken in the 10 seconds: −20%, at least 1 coin. It can be ground to zero.' },
        { tag: 'resource', label: 'Both at once', detail: '+10%. The market splits the difference rather than choosing.' },
        { tag: 'utility', label: 'Neither', detail: 'A quiet ten seconds settles at exactly nothing. Idling does not grow it.' },
        { tag: 'buff', label: 'Under the Miracle', detail: 'The winning rate is doubled to +40%; the losing rate is not.' },
      ],
      upgrade: {
        magic:
          'Risky Marketing, like Safe Marketing, is not about the button at all — it is what the '
          + 'shopkeeper is willing to keep under the counter. Two guns nobody should be selling '
          + 'and three grips that trade one trigger against the other.',
        effects: [
          { tag: 'damage', label: '💣 Grenade Launcher — 20', detail: '3 shells, a 2.7s reload and a shot every 700ms. Each shell flies at 380 px/s to where you aimed and bursts for 20 damage inside 94px, halving out to the rim.', requiresUpgrade: 'r' },
          { tag: 'damage', label: '🟢 Bouncy Blaster — 12', detail: '8 rounds of 10 at 700 px/s, each with 3 wall bounces in it. A bounced round can hit somebody it has already passed through.', requiresUpgrade: 'r' },
          { tag: 'buff', label: '🖐️ Specialized Grip — 6', detail: 'Alt-fire ×1.5 damage, ordinary fire ×0.7.', requiresUpgrade: 'r' },
          { tag: 'buff', label: '✊ Basic Grip — 6', detail: 'Ordinary fire ×1.35, alt-fire ×0.6. Fitting both grips at once is ×0.945 and ×0.9 — a worse gun, twice.', requiresUpgrade: 'r' },
          { tag: 'utility', label: '🤞 Dual Grip — 25', detail: 'The next gun you buy goes into your right hand instead of replacing what you are holding. Two guns, two magazines, two reloads, and right click is now that gun\'s trigger rather than an alt-fire.', requiresUpgrade: 'r' },
          { tag: 'cost', label: 'They are attachments', detail: 'All three grips take one of your two attachment slots, so Dual Grip costs you a 50 Cal. as well as 25 coins.', requiresUpgrade: 'r' },
        ],
      },
      notes: [
        'The take bar is twice the deal bar, so a bruising exchange where you gave as good as you got still settles positive.',
        'Both sides of the meter are fed by the same accounting that pays out coins, so a market window is a genuine record of the last ten seconds of the fight.',
        'Against the bank: 20% beats 10%, but only while you are actually winning. Split deposits are a real strategy.',
      ],
    },

    'fortune-paywall': {
      magic:
        'A row of brass turnstiles drops from the top of the arena to the bottom at your cursor — '
        + 'a full-height line the enemy has to deal with rather than a wall they can walk around. '
        + 'It blocks nothing at all. What it does is bill them: every shot they put through it and '
        + 'every time a body crosses it, charged out of their purse and into yours.',
      cast: 'F, aimed at the cursor — only the horizontal position is used. Clamped 24px inside the arena edges. 12s cooldown.',
      effects: [
        { tag: 'summon', label: 'The line', detail: 'Full arena height, a 30px-wide billing band, 5 seconds. One per side.' },
        { tag: 'resource', label: 'Shots', detail: '1 coin per enemy projectile that crosses the line, charged once per shot. Billed on the crossing rather than on being inside the band, so a rifle round moving 20px a frame is caught as surely as a lobbed grenade. Both the shared projectile group and every kit-local projectile in the game are billed.' },
        { tag: 'resource', label: 'Bodies', detail: '3 coins per crossing, charged on the crossing itself — leaning on a turnstile from one side is free, and walking through it is not.' },
        { tag: 'resource', label: 'Where it goes', detail: 'Straight into the shopkeeper\'s purse. Nothing is destroyed; it changes hands.' },
        { tag: 'damage', label: 'Broke customers', detail: 'An unpaid coin is taken in blood instead: 8 damage each, so a body crossing with an empty purse pays 24. Gated to one blood toll per side every 0.4s, and that damage mints its own coins back through the passive.' },
      ],
      upgrade: {
        magic:
          'Tax Evasion keeps the turnstiles up half again as long, and puts them on somebody\'s '
          + 'desk. Take enough through one wall and a man in a hat is lying at the top of the '
          + 'arena with a rifle, and a red dot settles onto your enemy for five long seconds.',
        effects: [
          { tag: 'utility', label: 'Longer', detail: 'The wall stands 7.5 seconds instead of 5.', requiresUpgrade: 'f' },
          { tag: 'utility', label: 'The trigger', detail: 'More than 10 coins actually collected through one wall. Blood tolls do not count toward it — coins do.', requiresUpgrade: 'f' },
          { tag: 'utility', label: 'The wait', detail: 'He aims for 5 seconds at the healthiest enemy, the reticle closing from 22px to 10px as he settles. One auditor per side at a time, one per wall.', requiresUpgrade: 'f' },
          { tag: 'damage', label: 'The shot', detail: '35 damage the instant the laser stops moving. It cannot miss and it does not care about range.', requiresUpgrade: 'f' },
          { tag: 'debuff', label: 'The assessment', detail: '20% slower and 20% more damage taken from every source, for 8 seconds.', requiresUpgrade: 'f' },
        ],
      },
      notes: [
        'It is a tax, not a barrier — nothing is stopped or slowed by it, and it only damages people who cannot pay.',
        'Against an enemy who has been hoarding for the Cure-All, five seconds of turnstile can be a dozen coins changing sides — and a dozen coins is an audit.',
        'Placed across your own line of fire it costs you nothing: it only bills the other side.',
        'The auditor leaves if his target dies before the laser settles. He does not pick a new one.',
      ],
    },

    'fortune-p2w': {
      magic:
        'A slab of golden light thrown out in front of you that burns everything it touches, and '
        + 'it does not aim — it turns, slowly, toward wherever you are pointing. You walk it onto '
        + 'people. And it is metered: six coins a second, taken as they come due, and it stops '
        + 'dead the instant the purse is empty.',
      cast: 'Q, aimed at the cursor. Refused outright with "💸 INSUFFICIENT FUNDS" if you cannot afford a single second of it. Ultimate, 22s cooldown.',
      effects: [
        { tag: 'damage', label: 'The beam', detail: '95 damage a second, continuous, to anything within 15px of a 520px line out of your chest.' },
        { tag: 'resource', label: 'The bill', detail: '6 coins a second, deducted a whole coin at a time. 8 seconds of full uptime is 48 coins.' },
        { tag: 'utility', label: 'Turning', detail: '1.15 radians a second toward the cursor — about 66°. It is walked onto a target, never snapped to one.' },
        { tag: 'utility', label: 'The window', detail: '8 seconds, or until the money runs out, or until you die. Whichever comes first.' },
        { tag: 'cost', label: 'Going broke', detail: 'It ends with "💸 OUT OF MONEY" the moment a coin comes due and there is none. Nothing is refunded.' },
        { tag: 'utility', label: 'No shooting', detail: 'The gun is refused for the whole time the beam is up.' },
        { tag: 'utility', label: 'It earns nothing', detail: 'The one source of damage in the element that mints no coins. Every point it burns off somebody is subtracted from the passive, so the ultimate cannot pay for itself.' },
      ],
      upgrade: {
        magic:
          'Golden Excess turns the line into a wedge, and the wedge grows with the money going '
          + 'into it. It widens, it brightens, and the gold walks toward furnace orange as the '
          + 'bill climbs — until half the arena is inside it and the purse is empty.',
        effects: [
          { tag: 'area', label: 'The cone', detail: 'A half-angle of 0.10 radians on the first coin, +0.011 per coin the ultimate has burned, up to 1.2 radians — a 138° wedge 520px long.', requiresUpgrade: 'q' },
          { tag: 'damage', label: 'The heat', detail: '95 damage a second at the start, +4.5 per coin burned, capped at 700 a second.', requiresUpgrade: 'q' },
          { tag: 'cost', label: 'The drain', detail: '6 coins a second at the start, +0.22 per coin already burned, up to 70 a second. It accelerates, so a big purse goes into it in seconds rather than over the full 8.', requiresUpgrade: 'q' },
          { tag: 'utility', label: 'The colour', detail: 'The palette walks from gold to furnace orange over the first 90 coins, so the cone reads as how much it has cost.', requiresUpgrade: 'q' },
        ],
      },
      notes: [
        'Eight full seconds of the base beam is 760 damage and 48 coins. The 22-second cooldown is not the real limit — the purse is.',
        'The slow turn is what makes it a positional ability: standing still and sweeping is a way to lose the beam, walking with it is how you keep somebody in it.',
        'It cannot be cast at under 6 coins, so a Paywall that emptied you or a stall run you could not afford genuinely locks your ultimate.',
        'Under Golden Excess a 200-coin purse is gone in about five seconds and buys a 100° cone doing several hundred damage a second. It is not a beam any more, it is a decision about the whole fight.',
      ],
    },
  },
};

export default fortune;
