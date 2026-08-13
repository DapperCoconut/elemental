import { ElementCodex } from '../AbilityCodex';

/**
 * Fortune — a shopkeeper who set his stall up in the middle of a fight.
 *
 * Verified against `src/elements/fortune.ts`, `kits/FortuneKit.ts`, the five shop upgrades in
 * `Upgrades.ts` and the two mastery enhancements in `Mastery.ts`. Fortune has no perks; every
 * figure below is a constant at the top of the kit or an entry in one of its tables.
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
      basics:
        '1 coin for every 20 damage dealt, measured on the raw figure before any mitigation, with the '
        + 'remainder carried so nothing is rounded away. Both sides earn: damage dealt to the Fortune '
        + 'player pays the enemy at exactly the same rate, so they are running the same economy you are. '
        + 'Coins buy everything — the stall, both investments and the ultimate, which eats 6 a second '
        + 'while it is on.',
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
      basics:
        'A counter fixed at the centre of the arena, served within 132px by either side. Number keys '
        + '1–8 buy the row and T changes tab, though only for the shopkeeper. Half of any enemy purchase, '
        + 'rounded down, is paid straight into your purse — a 20-coin Donation hands you 10. There are '
        + 'three pages: GENERAL is public, while ARMS and MODS are the illegal pages only you can see or '
        + 'buy from, so an enemy at the counter is locked to GENERAL. Your loadout is one gun at a time, '
        + 'a second replacing the first, and at most two attachments.',
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
      basics:
        'The public shelf. 🩹 Bandages (4) heals 20 on the spot. 🌶️ Spicy Pepper (3) lays a fire trail '
        + 'for 5 seconds — a patch every 70ms, each living 2.6s, 26 damage a second inside 22px and 0.9s '
        + 'alight — with overlapping patches splitting one patch\'s worth between them, so a doubled-back '
        + 'trail is wider rather than hotter. 🧨 Explosives Pouch (3) makes your next 5 damaging hits '
        + 'also blast everything else within 96px for the same damage, gated to one blast per 260ms and '
        + 'deliberately sparing the body that was hit. 🧪 Cure-All (10) cleanses every debuff, heals 50 '
        + 'and refuses all new debuffs for 20 seconds, re-applied every frame. 🗡️ Ornate Daggers (5) '
        + 'fires 3 volleys of 8 daggers 170ms apart at 620 px/s in a 0.62-radian fan for 2 damage each — '
        + '48 if every one lands. 🤖 Death Machine (8) is a knife on a vacuum: 96 px/s, turning at 3.2 '
        + 'rad/s, chasing the nearest enemy for 25 on touch with a 1.4-second per-victim gate, up to 3 at '
        + 'once. 🏺 The Miracle (12) doubles every good thing for 20 seconds — heals, item durations, '
        + 'capital gains and a winning market settlement. 💝 Donation (20) thanks you for your generous '
        + 'support. With Safe Marketing three more join the public page: 🥶 Chilly Pepper (3), 🗼 Heal '
        + 'Pylon (5) and 🌀 Tele-Core (8).',
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
      basics:
        'Fires whichever gun you are holding, held down. Out of the box that is the Pistol — 10 damage, '
        + '10 rounds, a shot every 190ms at 900 px/s with a 1.15s reload — free and yours from the first '
        + 'frame. Bought guns replace it: Revolver 20, Rifle 30, AR 3×8 in a burst, Golden Pistol 20 '
        + 'hitscan plus 1 per 2 coins held, and up to +15 on top from two damage attachments. Bullets '
        + 'live 1.6 seconds, are 8px across and stop on the first body unless a Sniper Scope is fitted, '
        + 'which doubles their speed and makes them pierce; an empty magazine starts the reload '
        + 'automatically. Acceleration Gear (9 coins) cycles the action faster the emptier the magazine '
        + 'is — 1× on a full one ramping to 2.2× on the last round, closing a pistol\'s 190ms gap to 86ms. '
        + 'Every bullet that lands is damage, and damage is coins. Refused and refunded while reloading, '
        + 'mid-cycle, out of ammunition or while the beam is up, so a held button never quietly burns the '
        + 'cooldown.',
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
        basics:
          'Right click becomes a second trigger, different on every gun. The Pistol dumps the whole '
          + 'magazine, one round every 55ms across 0.34 radians, and starts its own reload. The Revolver '
          + 'spins up over 3 seconds, walking one round from 20 to 30 damage at up to 1.5× speed and 1.6× '
          + 'size — a fully spun round also pierces. The AR throws the whole remaining clip at 640 px/s to '
          + 'the cursor, where it bursts into one bullet per round left, thrown radially at 760 px/s, so 30 '
          + 'rounds is 30 bullets. The Golden Pistol spends 5 coins and 2 rounds on a 250 px/s Midas slug: '
          + '25 damage and 5 seconds gilded, during which every coin their wounds mint is worth double. The '
          + 'Launcher\'s Exit Strategy detonates every shell at your own feet at once for 20 damage each '
          + 'within 113px — 60 from a full drum — and then takes you off the screen for 3 seconds, '
          + 'unhittable and invisible, before you fall back down. The Blaster spends 4 rounds on a '
          + '20-damage bolt carrying 12 wall bounces that passes through bodies and forgets who it has hit '
          + 'every time it comes off a wall. The Rifle has none: it holds one round, and there is nothing '
          + 'clever to do with one round.',
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
      basics:
        'The safe. Tap E to deposit 5 coins, or whatever you have if it is less, refused with "NOTHING '
        + 'TO DEPOSIT" at zero; hold for 340ms to withdraw the whole balance in one go and reset the '
        + 'clock. The balance pays capital gains of 10% every 10 seconds, rounded down but never less '
        + 'than 1 coin however small it is — doubled to 20% a settlement while the Miracle runs. The tap '
        + 'resolves on release, because until the key comes back up there is no way to know it was not a '
        + 'hold.',
      cast: 'E. Tap to deposit; hold for 340ms to withdraw the whole balance at once. The tap resolves on release, because until the key comes back up there is no way to know it was not a hold.',
      effects: [
        { tag: 'resource', label: 'The deposit', detail: '5 coins per tap, or whatever you have if it is less. Refused with "NOTHING TO DEPOSIT" at zero.' },
        { tag: 'resource', label: 'Capital gains', detail: '10% of the balance every 10 seconds, rounded down, but never less than 1 coin however small the balance is.' },
        { tag: 'resource', label: 'Withdrawing', detail: 'The whole balance back into your purse in one go, and the clock resets.' },
        { tag: 'buff', label: 'Under the Miracle', detail: 'Capital gains are doubled for the 20 seconds it runs — 20% a settlement.' },
      ],
      upgrade: {
        basics:
          'Adds three lines to the public GENERAL page, so the enemy at your counter can buy them too — '
          + 'and hands you half the price when they do. 🥶 Chilly Pepper (3) throws a 132px ring of rime '
          + 'off you every 3 seconds for 12 seconds, the first the instant you buy it, slowing anything of '
          + 'theirs it catches to 80% speed for 5 seconds. 🗼 Heal Pylon (5) drops a pylon at a random '
          + 'point on the floor; walking within 30px of a lit one heals 10 and darkens it for 5 seconds, '
          + 'they stack to 4, and a body already at full health does not spend the charge. 🌀 Tele-Core (8) '
          + 'makes Space a teleport straight to the cursor instead of a 520px dash for 12 seconds, clamped '
          + '44px inside the arena. Under the Miracle the Pepper and the Tele-Core run 24 seconds and a '
          + 'pylon heals 20.',
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
      basics:
        'The market, judged on how the last ten seconds actually went. Tap R to invest 5 coins, refused '
        + 'with "NOTHING TO INVEST" at zero; hold 340ms to cash out. Over 50 damage dealt in the window '
        + 'settles at +20%, at least 1 coin. Over 100 damage taken settles at −20%, at least 1 coin, and '
        + 'it can be ground to nothing. Both at once splits the difference at +10%, and a quiet ten '
        + 'seconds settles at exactly zero — idling does not grow it. The Miracle doubles the winning '
        + 'rate to +40% and leaves the losing rate alone. Fresh money resets the window it will be judged '
        + 'on, so a deposit at 9.9 seconds is not settled on somebody else\'s fight.',
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
        basics:
          'Opens the ARMS and MODS pages further. 💣 Grenade Launcher (20) holds 3 shells with a 2.7s '
          + 'reload and a shot every 700ms, each flying 380 px/s to where you aimed and bursting for 20 '
          + 'inside 94px, halving out to the rim. 🟢 Bouncy Blaster (12) holds 8 rounds of 10 at 700 px/s '
          + 'with 3 wall bounces each, and a bounced round can hit somebody it has already passed through. '
          + '🖐️ Specialized Grip (6) is ×1.5 alt-fire and ×0.7 ordinary fire; ✊ Basic Grip (6) is ×1.35 '
          + 'ordinary and ×0.6 alt — fitting both at once is ×0.945 and ×0.9, a worse gun twice over. 🤞 '
          + 'Dual Grip (25) puts the next gun you buy in your right hand instead of replacing what you '
          + 'hold: two guns, two magazines, two reloads, with right click now that gun\'s trigger rather '
          + 'than an alt-fire. All three grips occupy one of your two attachment slots, so Dual Grip costs '
          + 'you a 50 Cal. as well as 25 coins.',
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
      basics:
        'Raises a full-height turnstile at the cursor\'s horizontal position, clamped 24px inside the '
        + 'edges, standing 5 seconds — one per side. Every enemy projectile that crosses the 30px billing '
        + 'band costs 1 coin, charged once per shot on the crossing rather than on being inside it, so a '
        + 'rifle round moving 20px a frame is caught as surely as a lobbed grenade, and both the shared '
        + 'projectile group and every kit-local projectile in the game are billed. A body crossing costs '
        + '3, charged on the crossing itself, so leaning on it from one side is free and walking through '
        + 'is not. Everything collected goes straight into your purse — nothing is destroyed, it changes '
        + 'hands. An unpaid coin is taken in blood at 8 damage each, so a body crossing with an empty '
        + 'purse pays 24, gated to one blood toll per side every 0.4s, and that damage mints its own '
        + 'coins back through the passive. 12s cooldown.',
      cast: 'F, aimed at the cursor — only the horizontal position is used. Clamped 24px inside the arena edges. 12s cooldown.',
      effects: [
        { tag: 'summon', label: 'The line', detail: 'Full arena height, a 30px-wide billing band, 5 seconds. One per side.' },
        { tag: 'resource', label: 'Shots', detail: '1 coin per enemy projectile that crosses the line, charged once per shot. Billed on the crossing rather than on being inside the band, so a rifle round moving 20px a frame is caught as surely as a lobbed grenade. Both the shared projectile group and every kit-local projectile in the game are billed.' },
        { tag: 'resource', label: 'Bodies', detail: '3 coins per crossing, charged on the crossing itself — leaning on a turnstile from one side is free, and walking through it is not.' },
        { tag: 'resource', label: 'Where it goes', detail: 'Straight into the shopkeeper\'s purse. Nothing is destroyed; it changes hands.' },
        { tag: 'damage', label: 'Broke customers', detail: 'An unpaid coin is taken in blood instead: 8 damage each, so a body crossing with an empty purse pays 24. Gated to one blood toll per side every 0.4s, and that damage mints its own coins back through the passive.' },
      ],
      upgrade: {
        basics:
          'The wall stands 7.5 seconds instead of 5, and collecting more than 10 actual coins through one '
          + 'wall — blood tolls do not count — summons an auditor. He aims for 5 seconds at the healthiest '
          + 'enemy, the reticle closing from 22px to 10px as he settles, then fires the instant the laser '
          + 'stops moving for 35 damage that cannot miss and does not care about range, leaving them 20% '
          + 'slower and taking 20% more damage from every source for 8 seconds. One auditor per side at a '
          + 'time, one per wall.',
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
      basics:
        'A continuous beam dealing 95 damage a second to anything within 15px of a 520px line out of '
        + 'your chest, turning toward the cursor at 1.15 radians a second — about 66°, so it is walked '
        + 'onto a target and never snapped to one. It costs 6 coins a second, deducted a whole coin at a '
        + 'time, so 8 seconds of full uptime is 48 coins, and it runs for 8 seconds or until the money '
        + 'runs out or you die. Going broke ends it with "💸 OUT OF MONEY" and nothing is refunded. Your '
        + 'gun is refused for the whole time it is up, and it is the one source of damage in the element '
        + 'that mints no coins at all — every point it burns off somebody is subtracted from the passive, '
        + 'so the ultimate cannot pay for itself. Refused outright with "💸 INSUFFICIENT FUNDS" if you '
        + 'cannot afford a single second. 22s cooldown.',
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
        basics:
          'The beam widens and heats as it eats. The half-angle starts at 0.10 radians and grows 0.011 '
          + 'per coin burned, up to 1.2 radians — a 138° wedge 520px long. Damage starts at the same 95 a '
          + 'second and grows 4.5 per coin burned, capped at 700 a second. The drain accelerates with it: 6 '
          + 'a second at the start, +0.22 per coin already burned, up to 70 a second, so a big purse goes '
          + 'into it in seconds rather than over the full 8. The palette walks from gold to furnace orange '
          + 'over the first 90 coins, so the cone reads as how much it has cost.',
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

  mastery: {
    'battle-pass': {
      basics:
        'A 30-tier ladder bought strictly in order with B, anywhere in the arena, at 3 coins a tier — '
        + '90 for the whole thing — and rolled fresh every match. Twelve of the rewards are stat buffs '
        + 'that stack with themselves: +12% weapon damage, +10% fire rate, −12% reload, +2 magazine, +6% '
        + 'movement, +10% coin rate, +3% capital gains, investments settling 15% sooner, +1 coin every '
        + 'reload, piercing bullets, +15 maximum health, +25 shield HP. About a third of the non-star '
        + 'tiers hand over ordinary public-shelf items rather than selling them — guns and attachments '
        + 'are never on the pass, so the ARMS and MODS pages stay something you buy. Every fifth tier is '
        + 'an item⁺: Bandages⁺ heals 55, Cure-All⁺ is 120 health and 45 seconds, Ornate Daggers⁺ is 5 '
        + 'volleys of 12 at 6 each, Death Machine⁺ is 45 damage at 150 px/s and does not count against '
        + 'your three, Explosives Pouch⁺ is 12 charges and catches the body you actually hit, Spicy '
        + 'Pepper⁺ burns 1.8× as hot for 12.5s, and The Miracle⁺ runs 45 seconds. The item tiers are '
        + 'filtered by which corrupt upgrades you own. And 90 coins is three Golden Pistols, two full '
        + 'beams or nine Cure-Alls — the pass is the fourth thing your purse is for, not free value.',
      cast: 'Passive, with a key. B buys the next tier for 3 coins, anywhere in the arena, and the tiers are bought strictly in order. The whole ladder is randomised at the start of every match.',
      effects: [
        { tag: 'resource', label: 'The ladder', detail: '30 tiers, 3 coins each — 90 coins for the whole thing. Strictly in order; there is no skipping to the good one.' },
        { tag: 'buff', label: 'Mostly stat buffs', detail: '12 of them, rolled at random and stacking with themselves: +12% weapon damage, +10% fire rate, −12% reload, +2 magazine, +6% movement, +10% coin rate, +3% capital gains, investments settling 15% sooner, +1 coin every reload, piercing bullets, +15 maximum health, +25 shield HP.' },
        { tag: 'utility', label: 'And free items', detail: 'About a third of the non-star tiers are ordinary lines off the public shelf, handed over rather than sold. Guns and attachments are never on the pass — the ARMS and MODS pages stay something you have to buy.' },
        { tag: 'buff', label: 'Every fifth tier is an item⁺', detail: 'Tiers 5, 10, 15, 20, 25 and 30 — six of them. Bandages⁺ heals 55 rather than 20. Cure-All⁺ is 120 health and 45 seconds. Ornate Daggers⁺ is 5 volleys of 12 at 6 each rather than 3 of 8 at 2. Death Machine⁺ is 45 damage and 150 px/s, and it does not count against your three. Explosives Pouch⁺ is 12 charges and catches the body you actually hit. Spicy Pepper⁺ burns 1.8× as hot for 12.5s. The Miracle⁺ runs 45 seconds.' },
        { tag: 'utility', label: 'Rolled fresh', detail: 'Every match is a different ladder. The item tiers are filtered by which corrupt upgrades you own, so a Safe Marketing player can be handed Tele-Cores and a player without it cannot.' },
        { tag: 'cost', label: 'It is competing with everything', detail: '90 coins is three Golden Pistols, or two full 8-second beams, or nine Cure-Alls. The pass is not free value, it is the fourth thing your purse is for.' },
      ],
      notes: [
        'A buff rolled twice is applied twice. Two Filed Triggers is genuinely +21% fire rate — nothing on the ladder is unique.',
        'The coin-rate buff is taken off the price of a coin rather than added to the payout, so the fractional remainder still carries and nothing is rounded away.',
        'Vitamins and Cheap Plating are the only two that happen to your body rather than to a number, so they are the only two a Ruin Combo Breaker cannot slow down.',
        'A Fortune NPC on Nightmare climbs the pass too, with anything it is not saving for a beam. It has no ribbon to read; it simply spends.',
      ],
    },
    'drive-by-flex': {
      basics:
        'A bindable car launched on the heading the cursor sets, which it never changes again: 155 '
        + 'px/s, reflecting off the arena edges, 5 bounces and then it explodes. It rams anything within '
        + '27px for 18 damage on a 0.9-second per-victim gate, and the wreck is 30 damage inside 92px '
        + 'falling to 18 at the rim — not optional, the car always ends this way. Space within 54px puts '
        + 'you on the roof, where your body is carried and you have traded steering for a firing '
        + 'platform: 40% faster reload and a 35% faster trigger, both multipliers on the rate rather than '
        + 'subtractions from the gap, so they stack with Acceleration Gear and the battle pass without '
        + 'ever producing a negative wait. Space again steps off, and a car that explodes with you aboard '
        + 'throws you clear — it is your car. It also adds a GARAGE tab to your stall, reachable with T, '
        + 'holding nine buffs of which the car may carry three, for the whole match rather than per car: '
        + '🛞 Quick Tires (1) +45% speed, re-read every frame so it speeds up the car already on the '
        + 'floor; 🔱 Spiked Bumper (2) ram 18 → 34; 🛡️ Stronger Chassis (2) +3 bounces; 💣 Suicide '
        + 'Mission (2) a 25% bigger death blast throwing 16 shrapnel rounds of 8 at 620 px/s; 🌤️ Sunroof '
        + '(3) a 60% faster reload, 70% faster trigger and +20% weapon damage aboard; 🎖️ Mounted Gunner '
        + '(3) +5 magazine while riding, topped up the instant you climb on and taken back when you step '
        + 'down; 🤖 Robo-Gunner (3) an automatic on the roof firing 3 rounds a second at 2 damage each '
        + 'within 200px, aiming itself independently of where the car is going; 🏁 Speedster (5) 2.4× '
        + 'speed, +10 bounces and a burning trail of the Spicy Pepper\'s own fire patches every 80ms; 🚜 '
        + 'Tank (7) 0.45× speed, +5 bounces, ram ×2.2 and a 15-damage shell in a 70px blast every 3 '
        + 'seconds at anything within 165px. One car at a time, and the 24s cooldown does not start until '
        + 'the car is gone.',
      cast: 'The bound key (E, R, F or Q), aimed — the cursor sets the heading it leaves on, and it never turns again. One car at a time; the 24 second cooldown does not start until the car is gone.',
      effects: [
        { tag: 'summon', label: 'The car', detail: '155 px/s, 5 bounces, and it explodes on the fifth. It reflects off the arena edges; a corner counts as one bounce, not two.' },
        { tag: 'damage', label: 'The ram', detail: '18 damage to anything within 27px of it, with a 0.9 second per-victim gate so a car grinding along somebody is not a blender.' },
        { tag: 'damage', label: 'The wreck', detail: '30 damage inside 92px when the last bounce runs out, falling to 18 at the rim. It is not optional — the car always ends this way.' },
        { tag: 'movement', label: 'Riding it', detail: 'Space within 54px puts you on the roof. Your body is carried by the car; you have traded steering for a firing platform. Space again steps off.' },
        { tag: 'buff', label: 'What the roof is worth', detail: '40% faster reload and a 35% faster trigger while you are aboard. Both are multipliers on the rate rather than subtractions from the gap, so they stack with Acceleration Gear and the battle pass without ever producing a negative wait.' },
        { tag: 'utility', label: 'It will not hurt you', detail: 'A car that explodes with you on it throws you clear instead. It is your car.' },
        { tag: 'utility', label: 'The GARAGE', detail: 'A fourth tab on your own stall, reachable with T like the others. Nine buffs, and the car may carry three of them — for the whole match, not per car.' },
        { tag: 'movement', label: '🛞 Quick Tires — 1', detail: '+45% speed. Re-read every frame, so it speeds up the car already on the floor.' },
        { tag: 'damage', label: '🔱 Spiked Bumper — 2', detail: 'Ram damage 18 → 34.' },
        { tag: 'utility', label: '🛡️ Stronger Chassis — 2', detail: '+3 bounces, so 8 instead of 5.' },
        { tag: 'damage', label: '💣 Suicide Mission — 2', detail: 'The death blast grows 25% and throws 16 shrapnel rounds of 8 damage each, radially, at 620 px/s.' },
        { tag: 'buff', label: '🌤️ Sunroof — 3', detail: 'The ride becomes a 60% faster reload and a 70% faster trigger, plus 20% weapon damage for as long as you are aboard.' },
        { tag: 'resource', label: '🎖️ Mounted Gunner — 3', detail: '+5 magazine while riding, topped up the instant you climb on rather than at the next reload — and taken back off when you step down.' },
        { tag: 'damage', label: '🤖 Robo-Gunner — 3', detail: 'An automatic on the roof: 3 rounds a second at 2 damage each, at anything within 200px. It aims itself, independently of where the car is going.' },
        { tag: 'movement', label: '🏁 Speedster — 5', detail: '2.4× speed, +10 bounces, and a burning trail behind it — the Spicy Pepper\'s own fire patches, 26 damage a second, laid every 80ms.' },
        { tag: 'damage', label: '🚜 Tank — 7', detail: '0.45× speed, +5 bounces, ram damage ×2.2 (so 40, or 75 with a Spiked Bumper), and a 15-damage explosive shell inside a 70px blast every 3 seconds at anything within 165px.' },
      ],
      notes: [
        'Speedster and Tank are the two ends of the same idea and they stack — 2.4 × 0.45 is very nearly the speed you started with, with fifteen extra bounces and a cannon on it.',
        'Everything the garage sells is read out of the buff list every frame rather than baked into the car when it spawned, so a buff bought mid-drive applies to the car already out.',
        'The cooldown is measured from the wreck, not from the cast. A Speedster with a Stronger Chassis is out for a very long time, and it has already paid for that in the time it was out.',
        'The shrapnel, the Robo-Gunner\'s rounds and the Tank\'s shells are ordinary Fortune bullets, so a Paywall bills the other side for them exactly as it bills anything else.',
        'A Fortune NPC on Nightmare climbs onto its own car to reload and steps off the moment the magazine is back or the fight comes within 150px. It never rides into a fight it cannot move out of.',
      ],
    },
  },
};

export default fortune;
