import { ElementCodex } from '../AbilityCodex';

/**
 * Rubber — everything is stored tension.
 *
 * Verified against `src/elements/rubber.ts`, `kits/RubberKit.ts`, the five shop upgrades in
 * `data/Upgrades.ts`, the Uber-Gear perk in `data/Perks.ts` and the two mastery enhancements in
 * `data/Mastery.ts`.
 */
const rubber: ElementCodex = {
  identity:
    'A ball of gum that has worked out it can be a weapon by being pulled. Nothing in this kit '
    + 'is thrown or fired — it is stretched and let go. The punch is wound up by dragging the '
    + 'mouse backwards, the sling fires *you* out of a V strung between two walls, the anchor is '
    + 'a rubber band with one end nailed to the floor, and the ultimate fills the room with '
    + 'bouncing balls that get faster the longer they are left alone. Every single ability is '
    + 'about the same question: how far are you willing to pull it before you let go.',

  passives: [
    {
      emoji: '🪀',
      name: 'Stored Tension',
      basics:
        'Three abilities are wound up by dragging the cursor, and all three pay by how far you pulled. '
        + 'The punch is 8 damage at no pull rising to 35 at a full 72px drag over 1.5 seconds. The sling '
        + 'launches at 400 px/s at the minimum 20px pull rising to 860 at the full 130px. The anchor '
        + 'whips for 5 damage at low tension up to 30 at maximum, launched at 500–1500 px/s. Every band '
        + 'in the element thins as it stretches and goes pale at the top, so how much tension is stored '
        + 'is readable off the art rather than off a bar.',
      effects: [
        { tag: 'damage', label: 'The punch', detail: '8 damage at no pull, rising to 35 at a full 72px drag over 1.5 seconds.' },
        { tag: 'movement', label: 'The sling', detail: '400 px/s at the minimum 20px pull, rising to 860 at the full 130px.' },
        { tag: 'damage', label: 'The anchor', detail: '5 damage at low tension, rising to 30 at maximum, launched at 500–1500 px/s.' },
        { tag: 'utility', label: 'The strand tells you', detail: 'Every band in the element thins as it stretches and goes pale at the top, so the amount of stored tension is readable off the art rather than off a bar.' },
      ],
      notes: [
        'The click has a 0.35 second cooldown and the sling three, so the real limiter on this element is how long you are prepared to stand still winding something up.',
        'Uber-Gear and Vulcanization both feed exactly these numbers rather than adding new ones, which is why they compound so hard.',
      ],
    },
  ],

  abilities: {
    'rubber-punch': {
      basics:
        'Hold Click and drag the cursor to wind up, release to punch: 8 damage at no pull scaling to 35 '
        + 'at a full 72px drag held 1.5 seconds, with 130px of arm at full extension and a 40px hit '
        + 'radius around the fist. It takes 130ms to go out, 60ms at full stretch and 100ms to snap back, '
        + 'so a punch owns about a third of a second whatever it hits — and a punch that lands on your '
        + 'own Rubber Banding anchor destroys it outright, unless it is a Bouncy Anchor. 0.35s cooldown.',
      cast: 'Click, held. Drag the cursor to wind up; release to punch. 0.35s cooldown.',
      effects: [
        { tag: 'damage', label: 'The fist', detail: '8 damage at no pull, scaling to 35 at a full 72px drag held for 1.5 seconds.' },
        { tag: 'area', label: 'The reach', detail: '130px of arm at full extension, with a 40px hit radius around the fist itself.' },
        { tag: 'utility', label: 'The timing', detail: '130ms out, 60ms held at full stretch, 100ms to snap back — so a punch owns about a third of a second whatever it hits.' },
        { tag: 'utility', label: 'It smashes your own anchor', detail: 'A punch that lands on a Rubber Banding anchor destroys it outright, unless it is a Bouncy Anchor.' },
      ],
      upgrade: {
        basics:
          'Holding for another full 1.5 seconds past maximum pull over-stretches the arm and fires the '
          + 'fist instead: 50 damage on a 14px projectile at 780 px/s, bouncing off up to 3 walls and then '
          + 'snapping back along the exact path it took at 2600 px/s, so the return leg is a second pass '
          + 'over everything it already flew past. Releasing anywhere short of fully over-stretched is an '
          + 'ordinary 35-damage punch.',
        effects: [
          { tag: 'damage', label: 'The shot', detail: '50 damage, at 780 px/s, on a 14px fist.', requiresUpgrade: 'click' },
          { tag: 'utility', label: 'The bounces', detail: 'Up to 3 walls, and then it snaps back along the exact path it took at 2600 px/s — so the return leg is a second pass over everything it already flew past.', requiresUpgrade: 'click' },
          { tag: 'cost', label: 'The over-stretch', detail: 'Another full 1.5 seconds of holding past maximum pull. Releasing anywhere short of fully over-stretched is an ordinary 35-damage punch.', requiresUpgrade: 'click' },
        ],
      },
      notes: [
        'Three seconds of winding up for a single 50-damage shot is the longest commitment in the element, and the bounces are what make it worth it — a bazooka fist crossing a small room hits three times.',
        'The mastery requirement Haymaker needs a hundred bazooka hits, which is only trainable with this upgrade owned.',
      ],
    },

    'rubber-sling': {
      basics:
        'Anchors two arms 45° either side of your aim; drag back to load and release to launch yourself '
        + 'along it at 400 px/s at the 20px minimum pull up to 860 at the full 130px, dealing 28 damage '
        + 'to anything you fly through. Under 20px of drag the band just goes slack and nothing launches '
        + 'at all, and the cast is spent. The flight normally ends when you physically arrive at the '
        + 'wall, with a hard cap of 3 seconds. 3s cooldown.',
      cast: 'E, aimed at the cursor. The two arms anchor at 45° either side of the aim. Drag back to load, release to launch. 3s cooldown.',
      effects: [
        { tag: 'movement', label: 'The launch', detail: '400 px/s at the 20px minimum pull, up to 860 px/s at the full 130px, along the aim.' },
        { tag: 'damage', label: 'Contact', detail: '28 damage to anything you fly through.' },
        { tag: 'cost', label: 'Too little pull', detail: 'Under 20px of drag the band just goes slack and nothing launches at all — the cast is spent.' },
        { tag: 'utility', label: 'The flight ends at the wall', detail: 'Normally you simply stop when you physically arrive; the hard cap is 3 seconds.' },
      ],
      upgrade: {
        basics:
          'Up to 3 more wall bounces, each redirected toward the cursor at the moment of contact rather '
          + 'than reflected off the wall — so an upgraded sling is a genuine four-stop route you steer '
          + 'rather than a ricochet. The 28 contact damage applies on every leg, so a 4-bounce sling '
          + 'through a stationary target is four separate hits, 112 in total.',
        effects: [
          { tag: 'movement', label: 'The bounces', detail: 'Up to 3 more wall bounces, each redirected toward the cursor at the moment of contact.', requiresUpgrade: 'e' },
          { tag: 'damage', label: 'Still 28 a pass', detail: 'The 28 contact damage keeps applying on every leg of the journey, so a 4-bounce sling through a stationary target is 4 separate hits — 112.', requiresUpgrade: 'e' },
          { tag: 'utility', label: 'You steer it', detail: 'The bounce direction is read live off the cursor rather than reflected off the wall, which makes an upgraded sling a genuine four-stop route rather than a ricochet.', requiresUpgrade: 'e' },
        ],
      },
      notes: [
        'Vulcanization at full cure adds a fourth bounce and 60% more launch speed, and past 75% the sling itself becomes a fireball that hits 50% harder and sets what it touches alight.',
        'The bot does not use the V at all — it gets a simplified 650ms dash-attack with the same contact damage.',
      ],
    },

    'rubber-bounce-form': {
      basics:
        'Three seconds as a bar: every enemy projectile within 50px is turned around and sent back at '
        + '1.6× its original speed, homing on whoever fired it. All four other abilities are locked out '
        + 'for the whole duration, so it is a commitment rather than a panic button, and the silhouette '
        + 'really does become a bar — a visible tell to the person deciding whether to keep shooting. 8s '
        + 'cooldown.',
      cast: 'R. 3 seconds, and no other ability answers for any of it. 8s cooldown.',
      effects: [
        { tag: 'shield', label: 'The reflection', detail: 'Every enemy projectile within 50px of the bar is turned around and sent back at 1.6× its original speed, homing on whoever fired it.' },
        { tag: 'cost', label: 'Nothing else works', detail: 'All four other abilities are locked out for the full 3 seconds. It is a commitment, not a panic button.' },
        { tag: 'utility', label: 'It is a shape change', detail: 'The silhouette really does become a bar, which is a visible tell to the person deciding whether to keep shooting.' },
      ],
      upgrade: {
        basics:
          'While an anchor is mid-flight toward you on a hold-F reel, tapping R fires it instead: 50 '
          + 'damage to everything in its path as it flies to the cursor and off the arena. The anchor '
          + 'detaches entirely and leaves, so the combo ends the Rubber Banding early. Tapping R at any '
          + 'other time is Bounce Form as normal.',
        effects: [
          { tag: 'damage', label: 'The combo shot', detail: '50 damage to everything in the anchor\'s path as it flies to the cursor and off the arena.', requiresUpgrade: 'r' },
          { tag: 'utility', label: 'The window', detail: 'Only while the anchor is mid-flight toward you on a hold-F reel. Tapping R at any other time is Bounce Form as normal.', requiresUpgrade: 'r' },
          { tag: 'cost', label: 'The anchor is gone', detail: 'It detaches entirely and leaves the arena, so the combo ends the Rubber Banding early.', requiresUpgrade: 'r' },
        ],
      },
      notes: [
        'Reflected shots carry the attacker\'s own damage figure, which makes Bounce Form devastating against burst elements and nearly worthless against melee ones.',
        'Vulcanization holds the form longer, and past 75% every reflected bullet deals 1.5× and sets its target on fire.',
        'The mastery requirement Backboard needs 250 reflections, which is the largest single number any Rubber requirement asks for.',
      ],
    },

    'rubber-band': {
      basics:
        'Plants an anchor that stands 12 seconds and then dissolves. You move freely within 170px of '
        + 'it, and past that the band drags you back, down to 30% move speed at a full 420px of stretch. '
        + 'Tapping F recalls you to the anchor over 220ms, through whatever is in the way; holding F '
        + 'reels the anchor toward you instead, and enough tension sends it flying straight past — 5 '
        + 'damage at low tension up to 30 at maximum, launched at 500–1500 px/s and overshooting you by '
        + 'up to 260px. It is fragile: your own Rubber Punch landing on it shatters it outright. 25s '
        + 'cooldown, so there is more time without one than with one.',
      cast: 'F plants it. Tap F again to snap yourself back; hold F to reel the anchor in instead. 25s cooldown. The anchor lasts 12 seconds.',
      effects: [
        { tag: 'control', label: 'The leash', detail: 'Free movement within 170px of the anchor. Past that the band starts dragging, down to 30% move speed at a full 420px of stretch.' },
        { tag: 'movement', label: 'The snap-back', detail: 'A tap recalls you to the anchor over 220ms, through whatever is in the way.' },
        { tag: 'damage', label: 'Reeling it in', detail: 'Holding F pulls the anchor toward you, and enough tension sends it flying straight past — 5 damage at low tension up to 30 at maximum, launched at 500–1500 px/s and overshooting you by up to 260px.' },
        { tag: 'cost', label: 'It is fragile', detail: 'A Rubber Punch that lands on your own anchor shatters it outright.' },
        { tag: 'utility', label: 'The clock', detail: '12 seconds and it dissolves on its own. The 25-second cooldown means there is more time without one than with one.' },
      ],
      upgrade: {
        basics:
          'The anchor stops shattering — attacks knock it flying instead, 160px of launch plus 22 more '
          + 'per point of damage carried, capped at 1300, with friction bleeding it off — and stands 18 '
          + 'seconds instead of 12. The snap-back also bruises: 15 damage to anything within 34px of the '
          + 'line you are recalled along.',
        effects: [
          { tag: 'utility', label: 'Unbreakable', detail: 'Attacks knock it flying instead of destroying it: 160px of launch plus 22 more per point of damage carried, capped at 1300, with friction bleeding it off.', requiresUpgrade: 'f' },
          { tag: 'utility', label: 'Longer', detail: '18 seconds instead of 12.', requiresUpgrade: 'f' },
          { tag: 'damage', label: 'The snap-back bruises', detail: '15 damage to anything within 34px of the line you are recalled along.', requiresUpgrade: 'f' },
        ],
      },
      notes: [
        'The leash is genuinely a cost. Planting an anchor and then being forced 400px away from it is a 70% speed cut you did to yourself.',
        'Bouncy Anchor plus Bounce Combo is the element\'s hardest single hit outside the bazooka: reel it in, bounce it off your chest, 50 damage down a line.',
        'Vulcanization whips the anchor around harder, and past 75% it pulses a 15-damage fire blast in a 78px circle every 3 seconds on its own.',
      ],
    },

    'rubberage': {
      basics:
        'Fills the arena with 15 balls for 10 seconds, each dealing 5 damage and 620 px/s of shove on '
        + 'contact with a 0.35s per-target cooldown per ball. They start at 240 px/s and accelerate '
        + 'continuously to a ceiling of 820. In a room full of them the knockback is what actually kills '
        + '— being knocked into the next one. 56s cooldown, the longest in the game.',
      cast: 'Q, ultimate. Instant, no aim. 56s cooldown — the longest in the game.',
      effects: [
        { tag: 'damage', label: 'The balls', detail: '15 of them, 5 damage and heavy knockback on contact, with a 0.35s per-target cooldown per ball.' },
        { tag: 'area', label: 'The acceleration', detail: '240 px/s at the start, accelerating continuously to a ceiling of 820 over the 10 seconds they are alive.' },
        { tag: 'control', label: 'The knockback', detail: '620 px/s of shove per hit, which in a room full of balls is what actually kills — being knocked into the next one.' },
      ],
      upgrade: {
        basics:
          'You become one of them: ball-sized at 42% of your normal footprint, bouncing off walls toward '
          + 'the cursor and accelerating like the rest, dealing 5 damage and the same 620 px/s knockback on '
          + 'contact. And there are more of them — 25 balls instead of 15, at 8 damage instead of 5, for 14 '
          + 'seconds instead of 10. None of that is on the shop card.',
        effects: [
          { tag: 'movement', label: 'You become one', detail: 'Ball-sized — 42% of your normal footprint — bouncing off walls toward the cursor and accelerating like the rest.', requiresUpgrade: 'q' },
          { tag: 'damage', label: 'You hit like one', detail: '5 damage and the same 620 px/s knockback on contact.', requiresUpgrade: 'q' },
          { tag: 'damage', label: 'And there are more of them', detail: '25 balls instead of 15, at 8 damage instead of 5, for 14 seconds instead of 10. None of that is on the shop card.', requiresUpgrade: 'q' },
        ],
      },
      notes: [
        'The Q upgrade is far larger than it is advertised as. "You also become a purple rubber ball" is a third of what it does — the count, the damage and the duration all go up with it.',
        'Uber-Gear runs the whole ultimate 50% longer with balls that never lose speed, and Vulcanization spins them up to the ceiling faster.',
        'Fifty-six seconds is the longest cooldown of any ultimate. A Rubberage that catches nobody is most of a minute gone.',
      ],
    },
  },

  perks: {
    'uber-gear': {
      basics:
        'Every rubber hit you land winds you up 4% more elasticity, to a ceiling of +60%, feeding punch '
        + 'damage, sling launch speed and Rubberage ball damage all at once and all by the same figure. '
        + 'Rubberage itself runs 50% longer — 15 seconds instead of 10 — and its balls never lose speed '
        + 'once they have gained it. The meter holds for 5 seconds after your last landed hit and then '
        + 'decays 8 percentage points a second until it is gone.',
      effects: [
        { tag: 'buff', label: 'The wind-up', detail: '+4% elasticity per rubber hit landed, to a ceiling of +60%.' },
        { tag: 'buff', label: 'What it feeds', detail: 'Punch damage, sling launch speed and Rubberage ball damage, all at once and all by the same figure.' },
        { tag: 'buff', label: 'The ultimate', detail: 'Rubberage runs 50% longer — 15 seconds instead of 10 — and its balls never lose speed once they have gained it.' },
        { tag: 'cost', label: 'The decay', detail: 'Nothing at all for 5 seconds after your last landed hit, and then 8 percentage points a second until it is gone.' },
      ],
      notes: [
        'Fifteen landed hits is the cap, and the five-second grace means a Rubber player in a fight almost never falls off it.',
        'It is the only thing in the element that rewards the click for being cheap rather than for being wound up — fifteen quick 8-damage jabs is the fastest route to +60%.',
      ],
    },
  },

  mastery: {
    vulcanization: {
      basics:
        'Damage cures you: 1% per 5 damage taken up to 100%, on an exponential curve that is barely '
        + 'noticeable at 20% and dangerous by 60%. It shortens punch charge time by up to 50% and every '
        + 'cooldown in the kit by up to 40%, and strengthens sling speed by up to 60% with its wall '
        + 'bounces raised to 4, Bounce Form\'s duration by up to double, the anchor whip by up to 80% and '
        + 'Rubberage\'s spin-up by up to 150%. From 75% you run hot: the sling becomes a fireball hitting '
        + '50% harder, reflected bullets deal 1.5× and set fires, Rubberage balls hit for 2 more, charged '
        + 'punches ignite, and the anchor pulses a 15-damage blast in a 78px circle every 3 seconds — and '
        + 'anything the hot form touches catches fire for 3 seconds.',
      effects: [
        { tag: 'resource', label: 'The cure', detail: '1% per 5 damage taken, to 100%. The curve is exponential rather than linear — barely noticeable at 20%, dangerous by 60%.' },
        { tag: 'buff', label: 'What it shortens', detail: 'Punch charge time by up to 50%, and every cooldown in the kit by up to 40%.' },
        { tag: 'buff', label: 'What it strengthens', detail: 'Sling speed by up to 60% and its wall bounces to 4, Bounce Form\'s duration by up to double, the anchor whip by up to 80%, and Rubberage\'s spin-up by up to 150%.' },
        { tag: 'damage', label: 'Running hot at 75%', detail: 'The sling becomes a fireball hitting 50% harder, reflected bullets deal 1.5× and set fires, Rubberage balls hit for 2 more, charged punches ignite, and the anchor pulses a 15-damage blast in a 78px circle every 3 seconds.' },
        { tag: 'dot', label: 'Everything burns', detail: 'Anything the hot form touches catches fire for 3 seconds.' },
      ],
      notes: [
        'The only way to charge it is to be hit, which makes it the one mastery in the game that rewards losing the health fight — and it does not decay.',
        'Getting to 75% is 375 damage taken, which is most of a full health bar. A vulcanized Rubber player is a player who has already been beaten up.',
      ],
    },
    'atom-nhilego': {
      basics:
        'A bindable chase. The first zone opens somewhere in the arena rather than at your cursor, 70px '
        + 'across, and detonates 3 seconds later for 25 damage to every enemy inside it. Stand inside a '
        + 'zone when it goes off and the next one opens 10% larger, for as long as you keep reaching them '
        + '— there is no way to continue a chain from outside, so chasing the zones is the ability. The '
        + 'first one you fail to reach ends the run and heals you 10 HP for every zone you did make. 20s '
        + 'cooldown.',
      cast: 'The bound key opens the first zone. 20s cooldown.',
      effects: [
        { tag: 'damage', label: 'The detonation', detail: '25 damage to every enemy inside the zone, 3 seconds after it opens.' },
        { tag: 'area', label: 'The first zone', detail: '70px radius, placed somewhere in the arena rather than at your cursor.' },
        { tag: 'buff', label: 'The chain', detail: 'Stand inside a zone when it goes off and the next one opens 10% larger, for as long as you keep reaching them.' },
        { tag: 'heal', label: 'The payout', detail: 'The first zone you fail to reach ends the run and heals you 10 HP for every zone you did make.' },
        { tag: 'cost', label: 'You have to be in the blast', detail: 'There is no way to continue a chain from outside. Chasing the zones is the ability.' },
      ],
      notes: [
        'The zones are placed for you, not aimed, so the chain is a route the arena hands you rather than one you plan.',
        'A ten-zone run is 250 damage across the arena and 100 health back, which is close to a second ultimate on a 20-second cooldown — and it requires spending twenty-odd seconds sprinting through your own explosions.',
        'It pairs with Vulcanization exactly as you would hope: being caught by your own blasts is not a mistake, it is fuel.',
      ],
    },
  },
};

export default rubber;
