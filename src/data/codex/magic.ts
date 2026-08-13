import { ElementCodex } from '../AbilityCodex';

/**
 * Magic — two books, ten spells, and a meter that kills you.
 *
 * Verified against `src/elements/magic.ts`, `kits/MagicKit.ts`, the magic block of
 * `data/Upgrades.ts`, the Thunder perk in `data/Perks.ts`, the Decay divine perk in
 * `data/DivinePerks.ts` and Magic Mastery in `data/Mastery.ts`. Numbers here are the ones the
 * kit actually applies, including the several places where the spell wheel's own labels round
 * them off.
 */
const magic: ElementCodex = {
  identity:
    'A caster with no medium of its own. Magic borrows fire, rain, thorns, wind and stone out of '
    + 'two books — a five-spell Grimoire on E and a five-spell Necronomicon on Q — and every cast '
    + 'is a two-part act: pick a wedge off a wheel, then aim for two full seconds while the spell '
    + 'gathers. Buy either book\'s upgrade and a black version of all five spells appears behind a '
    + 'toggle, stronger in every case and paid for in Darkness, which at 100 kills you outright.',

  passives: [
    {
      emoji: '📖',
      name: 'The Spell Wheel',
      basics:
        'Both books are cast off a radial menu. Hold E for the Grimoire\'s five spells or Q for the '
        + 'Necronomicon\'s five: the wheel is 130px across, centred on you and follows you if you walk. '
        + 'Point the cursor at a wedge or step across them with ← and →, and the selected wedge grows '
        + '10px and brightens. A release under 150ms with no arrow key pressed re-casts your last pick '
        + 'from that book instead of whatever is highlighted, so a repeat cast costs one tap. Every wheel '
        + 'spell fires 2 seconds after release at the live cursor position, with both fighters free to '
        + 'move throughout, and the cooldown — 5s for the Grimoire, 30s for the Necronomicon — is stamped '
        + 'when the spell fires rather than when you released, so a Grimoire cast is about 7 seconds '
        + 'apart in practice.',
      effects: [
        { tag: 'utility', label: 'Opening it', detail: 'Hold E for the Grimoire\'s 5 spells or Q for the Necronomicon\'s 5. The wheel is 130px across and centred on you, and it follows you if you walk.' },
        { tag: 'utility', label: 'Choosing', detail: 'Point the cursor at a wedge, or step across them with ← and →. The selected wedge grows 10px and brightens.' },
        { tag: 'utility', label: 'The quick tap', detail: 'A release under 150ms with no arrow key pressed re-casts your last pick from that book instead of whatever is highlighted — a repeat cast costs one tap.' },
        { tag: 'cost', label: 'The two-second aim', detail: 'Every wheel spell fires 2 seconds after release, at the live cursor position. You keep moving and shooting through it; so does the other fighter.' },
        { tag: 'utility', label: 'When the cooldown starts', detail: 'The Grimoire\'s 5s and the Necronomicon\'s 30s are stamped when the spell fires, not when you released — so a Grimoire cast is 7 seconds apart in practice.' },
      ],
      notes: [
        'Nothing about the wheel locks you: you can walk, click and be hit while it is open and while the count runs.',
        'The NPC has no wheel. It picks by range and health — close in it takes the knockback spell, far out the cloud, low on health the stone — and it never sees a dark spell.',
      ],
    },
    {
      emoji: '☠️',
      name: 'Darkness',
      basics:
        'A ☠ n/100 bar under you that only exists once you own Dark Grimoire or Dark Necronomicon. '
        + 'Every dark Grimoire spell adds 25, every dark Necronomicon spell 50, a Wild Anchor blind '
        + 'teleport 10, and Decay charges 25 for an E reset and 99 for a Q reset. At 100 you take damage '
        + 'equal to your entire remaining health — an unconditional death, not a large hit — and crossing '
        + '75 fires a 120px warning ring and a 180ms shake, once. The only way down is Wandering Mind: '
        + 'each meditation orb absorbed removes 5 Darkness as well as healing 5 HP. The caster stains as '
        + 'it climbs, the floor circle and the book\'s runes going violet to magenta past 40%.',
      effects: [
        { tag: 'resource', label: 'The bar', detail: 'A 60×6px readout under you reading ☠ n/100. It only exists once you own E+ Dark Grimoire or Q+ Dark Necronomicon.' },
        { tag: 'cost', label: 'What fills it', detail: 'Every dark Grimoire spell adds 25, every dark Necronomicon spell 50, and a Wild Anchor blind teleport 10. Decay charges 25 for an E reset and 99 for a Q reset.' },
        { tag: 'cost', label: 'The ceiling', detail: 'At 100 you take damage equal to your entire remaining health — an unconditional death, not a large hit.' },
        { tag: 'utility', label: 'The warning', detail: 'Crossing 75 fires a 120px ring off you and a 180ms camera shake, once.' },
        { tag: 'heal', label: 'Cleaning it off', detail: 'With F+ Wandering Mind each meditation orb you absorb removes 5 Darkness as well as healing 5 HP. That is the only way down.' },
        { tag: 'utility', label: 'The tell', detail: 'The caster stains as it climbs — the floor circle and the book\'s runes go from violet to magenta past 40%, and a darkness aura rides at the bar\'s own fill level.' },
      ],
      notes: [
        'Generating 500 Darkness across your career is the mastery\'s Soul Harvester requirement, so the meter is something the element wants you to run hot.',
        'Nothing decays it on a timer. A bar left at 90 is still at 90 next round of casting.',
      ],
    },
  ],

  abilities: {
    'magic-sparkle-shot': {
      basics:
        'A star fired at 450 px/s that stops dead after 180px and, one second later, detonates for 14 '
        + 'damage in a 55px radius — with the arming visibly drawn, so a stopped sparkle is a one-second '
        + 'warning to whoever is next to it. If it runs into somebody in flight it deals 6 instead and is '
        + 'consumed, so the 14 never happens. 3s cooldown.',
      cast: 'Click, aimed at the cursor. Instant, 3s cooldown.',
      effects: [
        { tag: 'damage', label: 'Direct hit', detail: '6 damage if it runs into somebody in flight — and that consumes it, so the 14 never happens.' },
        { tag: 'utility', label: 'Flight', detail: '450 px/s, stopping dead once it has covered 180px from where you stood.' },
        { tag: 'damage', label: 'The burst', detail: 'After 1 second stationary it detonates for 14 damage in a 55px radius, to anybody standing in it.' },
        { tag: 'utility', label: 'Reading the fuse', detail: 'The star visibly winds up over that second — the arming is drawn, so a stopped sparkle is a one-second warning to whoever is next to it.' },
      ],
      upgrade: {
        basics:
          'Two more stars trail the leader, 32px and 64px back along its line of flight, bursting for 11 '
          + 'damage each in a 45px radius. They deal no contact damage and cannot detonate on their own — '
          + 'they go off in the same frame the leader does, wherever they happen to be. All told that is '
          + 'one 55px circle and two 45px circles strung along about 165px of ground, for 36 damage if all '
          + 'three connect.',
        effects: [
          { tag: 'damage', label: 'Two more bursts', detail: '11 damage each (75% of 14) in a 45px radius, one 32px and one 64px behind the leader along its line of flight.', requiresUpgrade: 'click' },
          { tag: 'utility', label: 'Tied to the leader', detail: 'The trailing pair deal no contact damage at all and cannot detonate on their own — they go off in the same frame the leader does, wherever they happen to be.', requiresUpgrade: 'click' },
          { tag: 'area', label: 'Total footprint', detail: 'One 55px circle and two 45px circles strung 64px back along the aim — roughly a 165px line of ground covered for 36 damage if all three connect.', requiresUpgrade: 'click' },
        ],
      },
      notes: [
        'A direct hit is worth 6 and a miss is worth 14 — the ability pays you for aiming at the floor in front of somebody rather than at them.',
        'The star you see is painted by the kit, not the sprite; the sprite is invisible and only there so the arena can register the 6-damage collision.',
      ],
    },

    'magic-grimoire': {
      basics:
        'The five-spell wheel: Flame Burst, Storm Cloud, Virulent Thorns, Compression Blast and Gaia\'s '
        + 'Guidance, each listed in full below. The biggest single hit is Virulent Thorns at 25 damage '
        + 'two seconds after the vine lands, and the 2-second bind carrying it is worth more than the '
        + 'number. 5s cooldown from the moment the spell fires, so about 7 seconds between one release '
        + 'and the next cast landing, and a tap shorter than 150ms with no arrow key re-fires your last '
        + 'pick without ever showing the wheel.',
      cast: 'Hold E to open the wheel, release to commit. The spell fires 2s later at the cursor. 5s cooldown, stamped on fire.',
      effects: [
        { tag: 'utility', label: 'Five spells', detail: 'Flame Burst, Storm Cloud, Virulent Thorns, Compression Blast and Gaia\'s Guidance — the full figures for each are below.' },
        { tag: 'damage', label: 'Best single hit', detail: 'Virulent Thorns, at 25 damage 2 seconds after the vine lands — and the 2s bind that carries it is worth more than the number.' },
        { tag: 'utility', label: 'Availability', detail: '5s cooldown from the moment the spell fires, so about 7s between one release and the next cast landing.' },
        { tag: 'utility', label: 'Repeat casting', detail: 'A tap shorter than 150ms with no arrow key re-fires your last pick without ever showing the wheel.' },
      ],
      variants: {
        label: 'The Grimoire\'s five wedges — the black five replace them entirely while Dark Magic is toggled on (E+)',
        variants: [
          { emoji: '🔥', name: 'Flame Burst', description: 'Three fire clouds thrown at −25°, 0° and +25°, each 35px across. They coast out at 250 px/s and slow to a stop, live 3 seconds, and burn anybody inside for 2 damage every 0.25s — 8 a second per cloud — while refreshing a 2-second burn.' },
          { emoji: '🌧️', name: 'Storm Cloud', description: 'A raincloud parked 80px along your aim for 6 seconds. It lets go exactly once, 3 seconds in: no damage at all, but everybody within 110px is slowed by half for 1.5 seconds.' },
          { emoji: '🌿', name: 'Virulent Thorns', description: 'A vine dart at 650 px/s that deals nothing on impact and instead binds whoever it hits for 2 seconds — no movement, no abilities. If they are still bound when it expires, the vine bursts for 25 damage.' },
          { emoji: '💨', name: 'Compression Blast', description: 'A wall of air detonated 70px in front of you: 8 damage in a 90px radius and 650 of velocity thrown radially outward, plus a short camera shake. Anybody knockback-immune takes the damage and does not move.' },
          { emoji: '🪨', name: "Gaia's Guidance", description: 'Three conjured stones take up a 56px orbit around you for 5 seconds. Each deals 10 damage on contact (at most once every 0.3s) and each also swats one enemy projectile out of the air — but any single use shatters it, so the set is three interactions long.' },
          { emoji: '🖤', name: 'Corrupt Flames', description: 'A single 70px cloud of black fire that follows your cursor for 5 seconds, ticking 4 damage every 0.5s, refreshing a 3-second burn, and laying cursed fire that costs a further 2 damage every 0.5s for 3s. +25 Darkness.', requiresUpgrade: 'e' },
          { emoji: '🖤', name: 'Acid Cloud', description: 'A 40px green cloud 80px along the aim for 8 seconds, pulsing out to 90px every 3 seconds. The pulses deal no damage — each one stacks a 3-second mark that raises all damage that target takes by 25%. +25 Darkness.', requiresUpgrade: 'e' },
          { emoji: '🖤', name: 'Draining Thorns', description: 'An instant vine arm out to 200px along the cursor, 22px thick. Anybody on the line takes 15 damage and you are healed 15 — no travel time, no projectile to dodge. +25 Darkness.', requiresUpgrade: 'e' },
          { emoji: '🖤', name: 'Recalling Gale', description: 'A 90° cone 200px deep that deals 18 damage once, then drags everybody inside it toward you at 320 velocity for a full second. +25 Darkness.', requiresUpgrade: 'e' },
          { emoji: '🖤', name: "Gaia's Temple", description: 'A small temple raised at the cursor with three stones orbiting its 56px ring for 10 seconds. Contact is 15 damage (once every 0.4s per stone) and an 80% slow for 1 second; the stones also eat enemy projectiles. +25 Darkness.', requiresUpgrade: 'e' },
        ],
      },
      upgrade: {
        basics:
          'Adds a 24px toggle at the centre of the open wheel that swaps all five wedges for dark '
          + 'versions and stays swapped between casts. Corrupt Flames is a 70px cursed cloud that lerps 10% '
          + 'of the way to your cursor every frame for 5 seconds: 4 damage per 0.5s inside it, a 3s burn, '
          + 'and cursed fire for a further 2 per 0.5s over 3s. Acid Cloud runs 8 seconds, pulsing to 90px '
          + 'every 3s, each pulse adding a stack of +25% damage taken for 3 seconds — and the stacks add, '
          + 'so two pulses is +50%. Draining Thorns is an instant 200px vine dealing 15 to the first '
          + 'fighter within 22px of the line and healing you exactly 15. Recalling Gale is a ±45° cone '
          + '200px deep for 18 damage on cast and then a 320-velocity pull toward you every frame for a '
          + 'second. The price is +25 Darkness a cast, on a bar that kills you at 100 — four dark Grimoire '
          + 'spells with no meditation in between is a suicide.',
        effects: [
          { tag: 'utility', label: 'The toggle', detail: 'A 24px button at the centre of the open wheel, only drawn once you own the upgrade. Clicking it swaps all 5 wedges and stays swapped between casts.', requiresUpgrade: 'e' },
          { tag: 'dot', label: 'Corrupt Flames', detail: 'A 70px cursed cloud that lerps 10% of the way to your cursor every frame for 5s: 4 damage per 0.5s inside it, a 3s burn, and cursed fire for a further 2 damage per 0.5s over 3s.', requiresUpgrade: 'e' },
          { tag: 'debuff', label: 'Acid Cloud', detail: 'An 8s cloud pulsing to 90px every 3s. Each pulse adds one stack of +25% damage taken for 3 seconds, and the stacks add — two pulses is +50%.', requiresUpgrade: 'e' },
          { tag: 'heal', label: 'Draining Thorns', detail: 'An instant 200px vine: 15 damage to the first fighter within 22px of the line, and exactly 15 healed back to you.', requiresUpgrade: 'e' },
          { tag: 'control', label: 'Recalling Gale', detail: 'A ±45° cone 200px deep: 18 damage once on cast, then a 320-velocity pull toward you every frame for 1 second.', requiresUpgrade: 'e' },
          { tag: 'summon', label: "Gaia's Temple", detail: 'A fixed 10s temple at the cursor with 3 stones on a 56px orbit: 15 damage per contact and an 80% slow for 1s, and each stone blocks one projectile before it shatters.', requiresUpgrade: 'e' },
          { tag: 'cost', label: 'The price', detail: '+25 Darkness per dark cast, on a bar that kills you at 100 — four dark Grimoire spells with nothing spent on meditation is a suicide.', requiresUpgrade: 'e' },
        ],
      },
      notes: [
        'The Acid Cloud\'s pop-up reads "⛈️ ACID −25%", which is backwards: the stack raises the damage that target takes by 25%, it does not reduce anything.',
        'Casting every Grimoire spell 10 times each is the mastery\'s Grimoire Adept requirement — it counts the wedge index, so a dark cast counts toward the same wedge as its light twin.',
        'Storm Cloud lives 6 seconds but only ever pulses once, because its second pulse would fall outside its own lifetime.',
      ],
    },

    'magic-anchor': {
      basics:
        'The first press inscribes a rune circle at your feet, drawn on the floor and visible to both '
        + 'fighters, which never expires. The second press recalls you to it instantly from any distance '
        + '— no travel, no line of sight, nothing to interrupt — and deals 20 damage to everybody within '
        + '120px of the mark with a 160ms camera shake. The 8s cooldown is only stamped on the recall; '
        + 'planting is free and does not start the clock.',
      cast: 'R. First press plants the anchor at your feet; second press recalls you to it. 8s cooldown, stamped on the recall.',
      effects: [
        { tag: 'summon', label: 'The mark', detail: 'A rune circle inscribed at your position, drawn on the floor layer and visible to both fighters until you use it. It never expires.' },
        { tag: 'movement', label: 'The recall', detail: 'An instant reposition to the mark from any distance — no travel, no line of sight, nothing to interrupt it.' },
        { tag: 'damage', label: 'Arrival', detail: '20 damage to everybody within 120px of the anchor, with a 160ms camera shake.' },
        { tag: 'utility', label: 'Availability', detail: 'The 8s cooldown is only stamped when you recall. Planting the mark is free and does not start the clock.' },
      ],
      upgrade: {
        basics:
          'Every recall now grants +25% move speed for 3 seconds with a pink aura, and pressing R again '
          + 'within 1.5 seconds of one teleports you to a uniformly random point at least 60px from every '
          + 'wall, with a departure and an arrival burst, for +50% move speed instead and a black aura. The '
          + 'wild jump costs 10 Darkness and welds 2 extra seconds onto the anchor cooldown — 10 seconds '
          + 'rather than 8 before you can plant again.',
        effects: [
          { tag: 'buff', label: 'Clean landing', detail: '+25% move speed for 3 seconds after every recall, with a pink aura.', requiresUpgrade: 'r' },
          { tag: 'movement', label: 'Wild re-cast', detail: 'Pressing R again within 1.5s of a recall teleports you to a uniformly random point at least 60px from every wall, with a departure and an arrival burst.', requiresUpgrade: 'r' },
          { tag: 'buff', label: 'Wild speed', detail: '+50% move speed for 3 seconds instead, with a black aura.', requiresUpgrade: 'r' },
          { tag: 'cost', label: 'What it costs', detail: '+10 Darkness, and 2 extra seconds welded onto the anchor cooldown — 10s rather than 8s before you can plant again.', requiresUpgrade: 'r' },
        ],
      },
      notes: [
        'The wild re-cast is only offered when you have no anchor down, i.e. in the window straight after a recall. Planting a fresh mark closes it immediately.',
        'The blind teleport deals no damage at all — it is pure escape, and it can just as easily put you next to the other fighter.',
      ],
    },

    'magic-meditate': {
      basics:
        'Channels healing orbs: one every 0.5s from a random screen edge, travelling at 200 px/s '
        + 'straight at you and healing 5 on arrival within 24px. An orb that passes within 28px of an '
        + 'enemy deals 8 damage and is consumed there, so a fighter standing between you and the edge is '
        + 'eating your healing. The base channel pins you at zero velocity — you can still cast, click '
        + 'and turn, you simply cannot walk — and any damage that lands ends it and costs a further 20 '
        + 'health on top of the hit. 6s cooldown, stamped when the channel ends.',
      cast: 'F. The base channel roots you where you stand and does not end on its own.',
      effects: [
        { tag: 'heal', label: 'The orbs', detail: 'One orb every 0.5s from a random screen edge, travelling at 200 px/s straight at you. Reaching within 24px of you heals 5.' },
        { tag: 'damage', label: 'Orbs as weapons', detail: 'An orb that passes within 28px of an enemy deals 8 damage and is consumed there — a fighter standing between you and the edge is eating your healing.' },
        { tag: 'cost', label: 'Rooted', detail: 'The base channel pins you at zero velocity for as long as it runs. You can still cast, click and turn — you simply cannot walk.' },
        { tag: 'cost', label: 'Interrupted', detail: 'Any damage that lands ends the channel and costs you a further 20 health on top of the hit itself.' },
        { tag: 'utility', label: 'Availability', detail: '6s cooldown, stamped when the channel ends rather than when it starts.' },
      ],
      upgrade: {
        basics:
          'You walk at 25% speed instead of being rooted, leaving a rune mote behind you every 90ms, and '
          + 'the damage absorber is never installed at all — a hit that lands costs you the hit and nothing '
          + 'else, with no broken channel and no 20 health. Releasing F ends it cleanly, which is the only '
          + 'deliberate way to stop, and each orb absorbed removes 5 Darkness as well as healing 5, so '
          + 'twenty orbs undoes four dark Grimoire casts.',
        effects: [
          { tag: 'movement', label: 'Mobile channel', detail: 'You move at 25% of your normal speed instead of being rooted, leaving a rune mote behind you every 90ms.', requiresUpgrade: 'f' },
          { tag: 'shield', label: 'Uninterruptible', detail: 'The damage absorber is never installed, so a hit that lands costs you the hit and nothing else — no broken channel, no 20 health.', requiresUpgrade: 'f' },
          { tag: 'utility', label: 'Ends on release', detail: 'Letting go of F ends it cleanly, which is the only way to stop meditating on purpose.', requiresUpgrade: 'f' },
          { tag: 'resource', label: 'Cleansing', detail: 'Each orb absorbed removes 5 Darkness as well as healing 5 — 20 orbs undoes four dark Grimoire casts.', requiresUpgrade: 'f' },
        ],
      },
      notes: [
        'The base channel has no duration and no release check: once it starts, the only thing that ends it is taking damage — and that costs 20. F+ is what makes the ability voluntary.',
        'Healing 200 HP through the orbs is the mastery\'s Inner Peace requirement, and F+ is by far the safest way to get there.',
        'The NPC\'s version is a plain 3-second channel that ends on its own.',
      ],
    },

    'magic-necronomicon': {
      basics:
        'The ultimate wheel: Flame Barrage, Final Drench, Thorn Prison, Tornado Blast and Gaia\'s Rage, '
        + 'each listed in full below. The biggest single number is Thorn Prison at 35 damage on release '
        + 'plus 3 a second for up to 5 seconds of imprisonment. 30s cooldown from the moment the spell '
        + 'fires — one Necronomicon spell per half-minute of fight — and the same sub-150ms tap re-fires '
        + 'your last pick without opening the wheel.',
      cast: 'Hold Q to open the wheel, release to commit. The spell fires 2s later at the cursor. 30s cooldown, stamped on fire.',
      effects: [
        { tag: 'utility', label: 'Five ultimates', detail: 'Flame Barrage, Final Drench, Thorn Prison, Tornado Blast and Gaia\'s Rage — full figures for each below.' },
        { tag: 'damage', label: 'Biggest single number', detail: 'Thorn Prison, at 35 damage on release plus 3 a second for up to 5 seconds of total imprisonment.' },
        { tag: 'utility', label: 'Availability', detail: '30s cooldown from the moment the spell fires — one Necronomicon spell per half-minute of fight.' },
        { tag: 'utility', label: 'Repeat casting', detail: 'The same sub-150ms tap re-fires your last Necronomicon pick without opening the wheel.' },
      ],
      variants: {
        label: 'The Necronomicon\'s five wedges — the black five replace them entirely while Dark Magic is toggled on (Q+)',
        variants: [
          { emoji: '🌋', name: 'Flame Barrage', description: 'Ten fire clouds fanned across 70° at 200–260 px/s, each 40px across and living 6 seconds. Anybody inside one takes 3 damage every 0.2s — 15 a second per cloud, and the fan overlaps — while a 4-second burn is refreshed on them.' },
          { emoji: '🌊', name: 'Final Drench', description: 'A storm parked 80px along your aim for 12 seconds. It lets go every 3 seconds out to 130px: 12 damage and a 50% slow for 1.5s each time, three times over.' },
          { emoji: '🌿', name: 'Thorn Prison', description: 'A heavy dark vine at 380 px/s. Whoever it hits is pinned to the spot it landed and chained to all four corners of the arena for 5 seconds, taking 3 damage a second. Their own shots can cut the chains — 15 damage each — but the cage deals 35 damage when it ends either way.' },
          { emoji: '🌪️', name: 'Tornado Blast', description: '10 damage and 700 of knockback in a 90px burst 70px ahead of you, then a funnel that stays for 10 seconds. It roams at 150 px/s, re-picking a direction every 0.4–0.8s and heading for the enemy 40% of the time, and every 0.2s deals 4 damage and throws anybody within 80px away at 450.' },
          { emoji: '🪨', name: "Gaia's Rage", description: 'Five heavy stones on a 64px orbit around you for 12 seconds, 20 damage a contact. These ones crack rather than shatter — each survives its first hit or block and only breaks on the second, so the set is ten interactions long.' },
          { emoji: '🖤', name: 'Dark Barrage', description: 'Three 60px cursed clouds thrown at −25°, 0° and +25° that then chase your cursor for 4 seconds, ticking 4 damage every 0.5s with a 3-second burn and cursed fire on top. +50 Darkness.', requiresUpgrade: 'q' },
          { emoji: '🖤', name: 'Acid Rain', description: 'Three green clouds planted 100px around you at even thirds, each lasting 8 seconds and pulsing out to 80px every 2 seconds. Every pulse stacks another 3-second +25% damage-taken mark. +50 Darkness.', requiresUpgrade: 'q' },
          { emoji: '🖤', name: 'Torture Trap', description: 'An instant 200px vine. On a hit it threads a 5-second lifesteal link: 3 damage a second down the thread, and every point of damage that target takes from any source at all is healed straight back to you. +50 Darkness.', requiresUpgrade: 'q' },
          { emoji: '🖤', name: 'Hurricane Vacuum', description: 'A ±45° cone 220px deep dealing 12 damage once, then dragging everybody in it toward you at 400 velocity for a second — followed by an ash-black funnel for 10 seconds. +50 Darkness.', requiresUpgrade: 'q' },
          { emoji: '🖤', name: "Gaia's Monument", description: 'A monument raised at the cursor with five heavy stones on an 80px orbit for 15 seconds. Contact is 20 damage and a 1-second stun, and each stone cracks before it breaks. +50 Darkness.', requiresUpgrade: 'q' },
        ],
      },
      upgrade: {
        basics:
          'The same 24px centre toggle, on the Q wheel, sticky between casts and independent of the '
          + 'Grimoire\'s. Dark Barrage launches three 60px cursed clouds at 120 px/s across a 50° fan that '
          + 'then home on your cursor for 4 seconds, each dealing 4 damage per 0.5s plus a 3s burn and '
          + 'cursed fire at 2 per 0.5s. Acid Rain puts three 36px clouds at 100px around you for 8 seconds, '
          + 'pulsing to 80px every 2s, each pulse another +25% damage-taken stack for 3 seconds — and three '
          + 'clouds stack fast. Torture Trap is a 5-second thread dealing 3 a second and healing you 100% '
          + 'of every point of damage that target takes, from you, from a hazard, from anything. Hurricane '
          + 'Vacuum is 12 damage once in a ±45°, 220px cone, a 400-velocity pull for a second, and a '
          + '10-second dark funnel doing 4 damage per 0.2s within 80px. The price is +50 Darkness a cast: '
          + 'two dark ultimates is 100 and a guaranteed death unless meditation has cleaned the bar in '
          + 'between.',
        effects: [
          { tag: 'utility', label: 'The toggle', detail: 'The same 24px centre button, on the Q wheel, only drawn once Q+ is owned. Sticky between casts and independent of the Grimoire\'s toggle.', requiresUpgrade: 'q' },
          { tag: 'dot', label: 'Dark Barrage', detail: 'Three 60px cursed clouds launched at 120 px/s across a 50° fan, then homing on your cursor for 4s: 4 damage per 0.5s each, a 3s burn and cursed fire at 2 damage per 0.5s.', requiresUpgrade: 'q' },
          { tag: 'debuff', label: 'Acid Rain', detail: 'Three 36px clouds at 100px around you for 8s, pulsing to 80px every 2s. Each pulse is another +25% damage-taken stack for 3s, and three clouds stack fast.', requiresUpgrade: 'q' },
          { tag: 'heal', label: 'Torture Trap', detail: 'A 5-second thread: 3 damage a second, and 100% of every point of damage that target takes — from you, from a hazard, from anything — healed to you.', requiresUpgrade: 'q' },
          { tag: 'control', label: 'Hurricane Vacuum', detail: '12 damage once in a ±45°, 220px cone, a 400-velocity pull for 1 second, and a 10-second dark funnel doing 4 damage per 0.2s within 80px.', requiresUpgrade: 'q' },
          { tag: 'summon', label: "Gaia's Monument", detail: 'Five 13px stones on an 80px orbit at the cursor for 15s: 20 damage and a 1-second stun per contact, twice per stone before it breaks.', requiresUpgrade: 'q' },
          { tag: 'cost', label: 'The price', detail: '+50 Darkness per dark ultimate. Two of them is 100 and a guaranteed death unless meditation has cleaned the bar in between.', requiresUpgrade: 'q' },
        ],
      },
      notes: [
        'Thorn Prison deals its 35 damage whether the captive breaks out or serves the full five seconds — cutting all four chains buys the time back, not the hit.',
        'Hurricane Vacuum\'s funnel does not actually pull. The initial cone does, then the funnel reverts to the ordinary tornado behaviour and throws people away from it; the kit says as much in a comment.',
        'Casting all five Necronomicon spells at least once is the mastery\'s Apocalypse Scholar requirement — one full round of the wheel across your whole career.',
      ],
    },
  },

  perks: {
    thunder: {
      basics:
        'The first press of E is a Lightning Call and the first Q an Apocalypse Call: an arming press '
        + 'that casts nothing and still stamps the full cooldown, so a charged spell is one whole '
        + 'cooldown slower to arrive. The next press of that key is the charged cast. Flame Burst and '
        + 'Flame Barrage are cast twice in the same instant, 6 and 20 clouds stacked on the same lines. '
        + 'Storm Cloud, Final Drench and dark Acid Cloud halve their pulse interval, and Acid Rain halves '
        + 'all three of its clouds. A charged Virulent Thorns stuns the fighter it binds for 2 seconds, a '
        + 'charged Draining Thorns stuns for 2 outright, and a charged Torture Trap runs 3 seconds '
        + 'longer. Compression Blast, Tornado Blast, Recalling Gale and Hurricane Vacuum all add a 50% '
        + 'slow for 3 seconds. A charged Gaia\'s Temple gains one extra orb and a charged Gaia\'s Monument '
        + 'two, each bolted on with a lightning strike at 15 damage a contact. And a charged Necronomicon '
        + 'cast immediately gives 15 of its 30 seconds back.',
      cast: 'No key of its own. The first E is Lightning Call, the first Q is Apocalypse Call; the next press of that key is the charged cast.',
      effects: [
        { tag: 'utility', label: 'Arming', detail: 'The arming press casts nothing and still stamps the full cooldown — 5s for the Grimoire, 30s for the Necronomicon — so a charged spell is one whole cooldown slower to arrive.' },
        { tag: 'damage', label: 'Charged fire', detail: 'Flame Burst and Flame Barrage are cast twice in the same instant — 6 clouds and 20 clouds respectively, stacked on the same lines.' },
        { tag: 'utility', label: 'Charged weather', detail: 'Storm Cloud, Final Drench and the dark Acid Cloud have their pulse interval halved, so a 3-second downpour becomes 1.5 — Acid Rain halves all three of its clouds.' },
        { tag: 'control', label: 'Charged vine', detail: 'A charged Virulent Thorns also stuns the fighter it binds for 2 seconds on impact; a charged Draining Thorns stuns for 2s outright; a charged Torture Trap runs 3 seconds longer.' },
        { tag: 'control', label: 'Charged wind', detail: 'Compression Blast, Tornado Blast, Recalling Gale and Hurricane Vacuum all add a 50% slow for 3 seconds on top of their own effect.' },
        { tag: 'summon', label: 'Charged stone', detail: 'A charged Gaia\'s Temple gains 1 extra orb and a charged Gaia\'s Monument gains 2, each bolted on with a lightning strike at 15 damage a contact.' },
        { tag: 'buff', label: 'Apocalypse discount', detail: 'A charged Necronomicon cast immediately gives 15 seconds of its own 30-second cooldown back.' },
      ],
      notes: [
        'A charged Gaia\'s Guidance is 4 stones instead of 3, still 10 damage and 5 seconds.',
        'A charged Gaia\'s Rage is a downgrade: instead of 5 stones at 20 damage for 12 seconds it builds 5 at 12 damage on a tighter 56px orbit for 8 seconds. The charge makes that wedge strictly worse.',
        'Thorn Prison has no charged behaviour at all — the charge is spent for nothing if you release on it.',
        'The perk\'s ingredients are electricity, acid and light.',
      ],
    },
    decay: {
      basics:
        'A press of E or Q that lands while that ability is cooling clears the cooldown instead of '
        + 'doing nothing: 25 Darkness for the Grimoire, 99 for the Necronomicon. There is no '
        + 'affordability check at all — from 1 Darkness or higher, a Necronomicon reset takes you to 100 '
        + 'and kills you on the spot. The press that pays only refreshes the key; the next press is the '
        + 'one that opens the wheel.',
      cast: 'No key. Triggers on a press of E or Q that lands while that ability is on cooldown.',
      effects: [
        { tag: 'utility', label: 'Grimoire reset', detail: 'E while the Grimoire is cooling clears its cooldown outright, for 25 Darkness.' },
        { tag: 'utility', label: 'Necronomicon reset', detail: 'Q while the Necronomicon is cooling clears its 30-second cooldown, for 99 Darkness.' },
        { tag: 'cost', label: 'No affordability check', detail: 'The charge is applied unconditionally. From 1 Darkness or higher, a Necronomicon reset takes you to 100 and kills you on the spot.' },
        { tag: 'utility', label: 'It does not cast', detail: 'The press that pays only refreshes the key. The next press is the one that opens the wheel.' },
      ],
      notes: [
        'The reset is paid after the readout is drawn, so the "DECAY — READY" text lands before the corruption does — including on the press that kills you.',
        'It works without either book upgrade: Decay generates Darkness on a caster who has no other way of making it, and no way at all of cleansing it unless F+ is owned.',
        'The perk\'s ingredients are life and acid.',
      ],
    },
  },

  mastery: {
    levitate: {
      basics:
        'Any damage whose source has not moved more than 1px in the last 3 seconds is refused outright '
        + '— no damage, no status, nothing — and every puddle effect in the arena skips you entirely, '
        + 'slow included. Projectiles, dashes, drags, orbiting stone and any hazard still travelling land '
        + 'normally, and the 3-second clock resets the instant a source moves. No key, no cooldown, no '
        + 'cost, applied every frame for as long as Magic Mastery is on.',
      effects: [
        { tag: 'shield', label: 'Stationary immunity', detail: 'Any damage whose source has not moved more than 1px in the last 3 seconds is refused outright — no damage, no status, nothing.' },
        { tag: 'shield', label: 'Puddles', detail: 'Every puddle effect in the arena skips a levitating fighter entirely, slow included.' },
        { tag: 'utility', label: 'What still hits', detail: 'Projectiles, dashes, drags, orbiting stone and any hazard that is still travelling all land normally — the 3-second clock resets the instant a source moves.' },
        { tag: 'utility', label: 'Always on', detail: 'No key, no cooldown, no cost. It is applied every frame for as long as Magic Mastery is switched on.' },
      ],
      notes: [
        'The rig says it: the floor circle shrinks by nearly half and the shadow moves out from under the caster\'s feet.',
        'Ruin\'s Unstoppable Decay strips buffs, and Levitate is one of the things it takes.',
      ],
    },
    transmogrify: {
      basics:
        'A bindable bolt travelling 130 px/s — slower than a walking fighter — connecting within 22px '
        + 'and expiring at the arena edge. Whoever it hits becomes a chicken for 8 seconds: unable to '
        + 'cast any ability at all, wandering at 60% speed in a direction that re-rolls every 0.4–0.9s, '
        + 'sprite swapped outright and restored when it ends, with a gold circle and feathers on the way '
        + 'in. The compensation is that their cooldowns run at half length throughout, so they come out '
        + 'of it with everything ready. Binding it costs that slot\'s base ability for the whole match — '
        + 'on Q, that means no Necronomicon at all. 12s cooldown.',
      cast:
        'Bindable to E, R, F or Q, replacing that slot\'s base ability for the match. Fired at the '
        + 'cursor, 12s cooldown.',
      effects: [
        { tag: 'utility', label: 'The bolt', detail: '130 px/s in a straight line — slower than a walking fighter — connecting within 22px. It expires at the arena edge.' },
        { tag: 'control', label: 'Chickened', detail: '8 seconds during which the target cannot cast any ability at all, and wanders at 60% of their speed in a direction that re-rolls every 0.4–0.9s.' },
        { tag: 'buff', label: 'The compensation', detail: 'Their cooldowns run at half length for the duration — cooldownMult ×0.5 — so they come out of it with everything ready.' },
        { tag: 'utility', label: 'The transformation', detail: 'Their sprite is swapped for the chicken outright and restored when the 8 seconds are up, with a gold circle and feathers on the way in.' },
        { tag: 'cost', label: 'What binding it costs', detail: 'The slot it is bound over loses its base ability for the whole match — binding it to Q means no Necronomicon at all.' },
      ],
      notes: [
        'The wander is applied after the AI has already decided where to go, so it beats every other movement the target had planned.',
        'It is the one thing in the kit with no aim delay — the 2-second wheel countdown does not apply, because it is not a wheel spell.',
      ],
    },
  },
};

export default magic;
