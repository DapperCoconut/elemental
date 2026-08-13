import { ElementCodex } from '../AbilityCodex';

/**
 * Ruin — the element that only subtracts.
 *
 * Verified against `src/elements/ruin.ts`, `kits/RuinKit.ts`, `Fighter.takeDamage`/`preUpdate`
 * (for weak HP) and the five shop upgrades in `data/Upgrades.ts`. Ruin has no perks and no
 * mastery enhancements; every figure below is a constant at the top of the kit.
 */
const ruin: ElementCodex = {
  identity:
    'Every other element in the game builds something — a stance, a board, a pet, a stack of '
    + 'buffs. Ruin only takes things away. The click deletes shots out of the air, the E '
    + 'deletes the ability they just used, the F deletes everything they built and turns '
    + 'whatever they were wearing inside out, and the ultimate is a rot on the entire arena '
    + 'that is never checked against a clock because it never wears off. The one thing it '
    + 'gives is grey weak health, which is a gift the way a rusted skewer through the ribs is '
    + 'a gift. The character is falling apart on purpose: covered in spikes, one eye an empty '
    + 'socket, and cracked from crown to feet a little further with every point of health he '
    + 'loses.',

  passives: [
    {
      emoji: '⚙️',
      name: 'Rust',
      basics:
        'Rust takes N points off health and puts N points into the weak pool. Displayed health is '
        + 'unchanged at the instant it lands; what changed is which pool it is in. Weak HP drains at 3 a '
        + 'second from the moment it exists — a tenth of a 400-health fighter is 40 points and about 13 '
        + 'seconds of bleed — and it is spent before health on any incoming damage that is not pierce, so '
        + 'rusting somebody hands them a decaying buffer in exchange for permanently spending health they '
        + 'will have to heal back. Every rust in the kit is floored so the victim keeps at least 1 '
        + 'health: rust sets a kill up, it never lands one. It comes from Rusty Skewer, at 10% of current '
        + 'health on impale, and from Shatter Starter\'s rusted projectiles, where the shot\'s whole damage '
        + 'is moved instead of dealt.',
      effects: [
        { tag: 'utility', label: 'What it does', detail: 'Takes N points off health and puts N points into the weak pool. Total displayed health is unchanged at the instant it lands; what changed is which pool it is in.' },
        { tag: 'dot', label: 'The leak', detail: 'Weak HP drains at 3 a second, always, from the moment it exists. A tenth of a 400-health fighter is 40 points and about 13 seconds of bleed.' },
        { tag: 'shield', label: 'It does soak', detail: 'Weak HP is spent before health on any incoming damage that is not pierce — so rusting somebody hands them a decaying buffer in exchange for permanently spending health they will have to heal back.' },
        { tag: 'utility', label: 'It cannot finish', detail: 'Every rust in the kit is floored so the victim keeps at least 1 health. Rust sets a kill up; it never lands one.' },
        { tag: 'utility', label: 'Where it comes from', detail: 'Rusty Skewer (10% of current health on impale) and Shatter Starter\'s rusted projectiles (the shot\'s whole damage, moved instead of dealt).' },
      ],
      notes: [
        'Rust is skipped entirely for a body whose health is not this machine\'s to write — an online replica, or a co-op ally under friendly-fire protection. Those hits fall back to landing normally.',
        'Pierce damage ignores the weak pool completely and goes to health, so anything that pierces is the clean answer to being rusted.',
      ],
    },
    {
      emoji: '🧱',
      name: 'Nothing Comes Back',
      basics:
        'Almost nothing this element does wears off. Decay stacks (up to 10), Lockjaw teeth (uncapped), '
        + 'ability blunting (up to 7 per ability) and ruin cracks (uncapped in number and in size) are '
        + 'all permanent for the match. Only the padlock itself at 20 seconds, the inverted-buff window '
        + 'at 8, and the ride on a skewer are timed. The rig\'s crack pattern is driven straight off 1 − '
        + 'hp/maxHp, so how broken the Ruin player looks is an exact readout of how close they are to '
        + 'dying.',
      effects: [
        { tag: 'debuff', label: 'What is permanent', detail: 'Decay stacks (up to 10), Lockjaw teeth (uncapped), ability blunting (up to 7 per ability), and ruin cracks (uncapped in number and in size).' },
        { tag: 'utility', label: 'What is not', detail: 'Only the padlock itself (20s), the inverted-buff window (8s) and the ride on a skewer are timed. Everything else outlives them.' },
        { tag: 'utility', label: 'The tell', detail: 'The rig\'s crack pattern is driven straight off 1 − hp/maxHp, so how broken the Ruin player looks is an exact readout of how close they are to dying.' },
      ],
      notes: [
        'The consequence is that Ruin is the one element where a long fight is strictly bad for the other side. Nothing they do resets the clock, because there is no clock.',
        'It resets between matches, not within one. Everything here is handed back on the next match start.',
      ],
    },
  ],

  abilities: {
    'ruin-shred': {
      basics:
        'A wedge thrown at the cursor at 720 px/s for 2.4 seconds — about 1730px, the length of the '
        + 'arena and back — dealing 15 damage to each body within 30px, once each, and never stopping on '
        + 'anybody. It destroys every enemy projectile within 34px as it passes, from the shared shot '
        + 'group and from the kit-local registries holding the projectiles that never join one, sparing '
        + 'healing shots because they are somebody\'s medicine rather than an attack, and only ever eating '
        + 'the other side\'s ammunition. A wedge that ate anything prints ✂️ SHREDDED ×N where it finally '
        + 'dies. 0.75s cooldown.',
      cast: 'Click, aimed at the cursor, launched 26px out. 0.75s cooldown.',
      effects: [
        { tag: 'damage', label: 'The wedge', detail: '15 damage to each body within 30px of it, once per body — it never stops on anybody.' },
        { tag: 'area', label: 'The flight', detail: '720 px/s for 2.4 seconds, so about 1730px, or the length of the arena and back.' },
        { tag: 'control', label: 'The shredding', detail: 'Destroys every enemy projectile within 34px as it passes, from the shared shot group and from the kit-local registries that hold the projectiles which never join one.' },
        { tag: 'utility', label: 'What it spares', detail: 'Healing shots are somebody\'s medicine rather than an attack and are left alone, and it only ever eats the *other* side\'s ammunition.' },
        { tag: 'utility', label: 'The tally', detail: 'A wedge that ate anything prints ✂️ SHREDDED ×N where it finally died.' },
      ],
      upgrade: {
        basics:
          'The wedge leaves crystals: one per shot destroyed plus one per 50 damage it has dealt, 15px '
          + 'across, capped at 14 per side with a 15th shattering the oldest so the field moves rather than '
          + 'stalling. Each bites anybody within 31px for 10 damage, at most once per victim every 0.8 '
          + 'seconds — cheap enough to be an accident, slow enough not to be a wall — and rusts what flies '
          + 'through: any non-healing shot passing within 22px comes out at half size and rusted, moving '
          + 'its damage into the weak pool instead of dealing it, and spent on the first body it reaches. '
          + 'The filter is blind, so a crystal field rusts both sides\' shots: firing through your own is as '
          + 'much of a decision as walking through it, because a rusted shot of yours can no longer kill '
          + 'anybody.',
        effects: [
          { tag: 'summon', label: 'The crystals', detail: 'One per shot destroyed, plus one per 50 damage the wedge has dealt. 15px across, capped at 14 per side — a 15th shatters the oldest, so the field moves rather than stalling.', requiresUpgrade: 'click' },
          { tag: 'damage', label: 'They bite', detail: '10 damage to anybody who comes within 31px, at most once per victim per 0.8 seconds. Cheap enough to be an accident, slow enough not to be a wall.', requiresUpgrade: 'click' },
          { tag: 'debuff', label: 'They rust what flies through', detail: 'Any non-healing shot passing within 22px comes out at half size and rusted: instead of dealing its damage it moves that much health into the weak pool, and is spent on the first body it reaches.', requiresUpgrade: 'click' },
          { tag: 'cost', label: 'The filter is blind', detail: 'A crystal field rusts *both* sides\' shots. Firing through your own is as much of a decision as walking through it, because a rusted shot of yours can no longer kill anybody.', requiresUpgrade: 'click' },
        ],
      },
      notes: [
        'Against a volley element the click is close to a hard counter — one wedge through an Air splice or a Gunpowder burst deletes the whole thing and, with the upgrade, converts it into a minefield.',
        'A rusted shot is spent on impact whatever it hits, so the upgrade quietly turns a piercing projectile into a single-target one.',
        'The crystals are structures, so somebody else\'s Spikes of Ruin — or any other purge in the game — can raze them.',
      ],
    },

    'ruin-lockdown': {
      basics:
        'Puts a padlock on whichever fighter is nearest the cursor inside 460px, locking their '
        + 'last-cast ability for 20 seconds however ready its own cooldown reads — so locking the good '
        + 'one means baiting it out first. Nothing in reach, or a target who has not cast anything yet, '
        + 'hands the whole 25-second cooldown straight back. A second padlock on the same body replaces '
        + 'the picture rather than the effect.',
      cast: 'E. Aimed at a fighter rather than a point: the padlock goes on whoever is nearest to the cursor inside 460px. 25s cooldown.',
      effects: [
        { tag: 'control', label: 'The lock', detail: '20 seconds during which that one ability cannot be cast, however ready its own cooldown reads.' },
        { tag: 'utility', label: 'What gets locked', detail: 'Their last-cast ability, whatever it was. Locking the good one means baiting it out first.' },
        { tag: 'area', label: 'The reach', detail: '460px, measured from you to them — the cursor only chooses between the candidates already inside it.' },
        { tag: 'utility', label: 'Refunded on a whiff', detail: 'Nothing in reach, or a target who has not cast anything yet, hands the whole 25-second cooldown straight back. A 25-second wall for no effect is not a trade anybody would take.' },
        { tag: 'utility', label: 'One lock drawn per victim', detail: 'A second padlock on the same body replaces the picture rather than the effect.' },
      ],
      upgrade: {
        basics:
          'Every lock leaves teeth in the ability: 12 damage per stack charged every time it is cast, so '
          + 'three sets of teeth on one ability is 36 a press. Nothing takes a stack off inside a match and '
          + 'there is no cap, so a Ruin player who keeps locking the same ability turns it into a '
          + 'self-inflicted wound. It hangs off the cast event rather than the keypress, which is the one '
          + 'place charge-and-release abilities and Psychic\'s two-second-delayed casts all pass through.',
        effects: [
          { tag: 'damage', label: 'The bite', detail: '12 damage per stack, charged every time the ability is cast. Three sets of teeth on one ability is 36 a press.', requiresUpgrade: 'e' },
          { tag: 'utility', label: 'No cap, no expiry', detail: 'Nothing takes a stack off inside a match. A Ruin player who keeps locking the same ability turns it into a self-inflicted wound.', requiresUpgrade: 'e' },
          { tag: 'utility', label: 'Every route counts', detail: 'Hung off the cast event rather than the keypress, which is the one place charge-and-release abilities and Psychic\'s two-second-delayed casts all pass through.', requiresUpgrade: 'e' },
        ],
      },
      notes: [
        'A locked ability that is being punished by Lockjaw is a genuine dilemma for its owner: the ability itself still works perfectly, it just costs blood now.',
        'The bite is credited to whoever set the teeth rather than counting as self-harm, so it still lands on a co-op ally who is otherwise protected from friendly fire.',
        'Because the target is chosen by proximity to the cursor and the range is checked from you, the two failure modes are different — one is "walk closer", the other is "wait for them to press something".',
      ],
    },

    'ruin-skewer': {
      basics:
        'Throws a 150px spike at 620 px/s that catches anything within 40px of its point, up to 3 '
        + 'riders, ending on the arena wall or after 5 seconds if it never finds one. Each rider takes 10 '
        + 'damage as they go on and has 10% of their current health moved into the weak pool — 40 points '
        + 'of grey on a 400-health target, draining at 3 a second. Riders are written to a fixed spot on '
        + 'the shaft every frame, the first 49px behind the point and then every 34px back, and disarmed '
        + 'on a rolling 250ms refresh, so they can neither walk nor cast for the whole trip. They are '
        + 'dropped where the spike stopped, clamped 30px inside the play area, with 🧱 TORN OFF on a wall '
        + 'and 🩸 SLID FREE if it timed out. One in the air per side. 15s cooldown.',
      cast: 'R, aimed at the cursor, launched 34px out. One in the air per side — a second would only steal the first one\'s riders. 15s cooldown.',
      effects: [
        { tag: 'damage', label: 'The impale', detail: '10 damage to each rider as they go on.' },
        { tag: 'debuff', label: 'The rust', detail: '10% of their current health moved into the weak pool, which then drains at 3/s. On a 400-health target that is 40 points of grey.' },
        { tag: 'control', label: 'The ride', detail: 'Riders are written to a fixed spot on the shaft every frame — first at 49px behind the point, then every 34px back — and disarmed on a rolling 250ms refresh, so they can neither walk nor cast for the whole trip.' },
        { tag: 'area', label: 'The spike', detail: '150px long, 620 px/s, catching anything within 40px of the point, up to 3 riders. It ends on the arena wall, or after 5 seconds if it somehow never finds one.' },
        { tag: 'utility', label: 'The landing', detail: 'Riders are dropped where the spike stopped, clamped 30px inside the play area. 🧱 TORN OFF on a wall, 🩸 SLID FREE if it simply timed out.' },
      ],
      upgrade: {
        basics:
          'A spike that passes through one of your crystals drinks it — at most one per throw, checked at '
          + 'the point as it flies, and the crystal is eaten outright. A fed spike deals 15% of the rider\'s '
          + 'current health as ordinary damage instead of the 10% rust, through shields and mitigation like '
          + 'any other hit rather than around them. Real damage is worse for anybody who was going to '
          + 'survive the ride; the rust is worse for anybody who was not going to heal. A fed spike is the '
          + 'finisher, an unfed one is the tax.',
        effects: [
          { tag: 'damage', label: 'The transfusion', detail: '15% of the rider\'s current health as ordinary damage instead of the 10% rust — through shields and mitigation like any other hit, rather than around them.', requiresUpgrade: 'r' },
          { tag: 'utility', label: 'One crystal, one spike', detail: 'The shaft drinks at most one crystal per throw, checked at the point as it flies. It eats the crystal outright.', requiresUpgrade: 'r' },
          { tag: 'utility', label: 'Which is better', detail: 'Real damage is worse for anybody who was going to survive the ride; the rust is worse for anybody who was not going to heal. A fed spike is the finisher, an unfed one is the tax.', requiresUpgrade: 'r' },
        ],
      },
      notes: [
        'The ordinary rust goes around shields on purpose, and is skipped entirely for an online replica or a co-op ally — those riders take only the 10.',
        'Three riders is three separate rusts, each a tenth of that rider\'s own health.',
        'A skewer aimed along a wall rather than at it buys the longest possible ride, because it ends the moment the point reaches the boundary.',
      ],
    },

    'ruin-spikes': {
      basics:
        'A ring that tracks you for a 2-second fuse and then erupts for 15 damage to every enemy within '
        + '122px of wherever you were standing. Every plain buff on a caught fighter is flipped on the '
        + 'spot — a damage boost becomes a cut of the same size, a damage reduction becomes fragility, a '
        + 'cooldown discount becomes a penalty, a speed boost becomes a slow — while crit, dodge, regen, '
        + 'reflect, flat reduction, damage caps, shield charges, shield HP, clotted HP, unstoppable, '
        + 'levitation, self-damage immunity and invincibility are simply taken away. For 8 seconds '
        + 'afterwards buffs living inside other kits, a stance\'s haste or a form\'s speed, are inverted as '
        + 'well, caught at the two places they are actually felt: the speed aggregate and the mitigation '
        + 'product. Every structure, building and summon inside the circle that is not yours stops '
        + 'existing — not damaged, deleted — printing 🏚️ N RAZED, and the blast reports how many '
        + 'concrete buffs it found with 🔻 N BUFFS TURNED or 🔻 RUINED. One ring per side. 18s cooldown.',
      cast: 'F. Instant, no aim, one ring per side at a time. The ring tracks you for its whole 2-second fuse. 18s cooldown.',
      effects: [
        { tag: 'damage', label: 'The eruption', detail: '15 damage to every enemy within 122px of wherever you were standing when the fuse ran out.' },
        { tag: 'debuff', label: 'Buffs turned inside out', detail: 'Every plain buff on a caught fighter is flipped on the spot: a damage boost becomes a cut of the same size, a damage reduction becomes fragility, a cooldown discount becomes a penalty, a speed boost becomes a slow. Crit, dodge, regen, reflect, flat reduction, damage caps, shield charges, shield HP, clotted HP, unstoppable, levitation, self-damage immunity and invincibility are all simply taken away.' },
        { tag: 'debuff', label: 'The window', detail: '8 seconds in which buffs living inside other kits — a stance\'s haste, a form\'s speed — are inverted as well, caught at the two places they are actually felt: the speed aggregate and the mitigation product.' },
        { tag: 'summon', label: 'Razed', detail: 'Every structure, building and summon inside the circle that is not yours stops existing. Not damaged — deleted. It prints 🏚️ N RAZED.' },
        { tag: 'utility', label: 'The count', detail: 'It says how many concrete buffs it found: 🔻 N BUFFS TURNED, or 🔻 RUINED when there were none.' },
      ],
      upgrade: {
        basics:
          'The eruption detonates your crystals in a chain, 110ms between links, with a blast or a flying '
          + 'spike both counting as a detonator so the run carries well past any one blast radius — and a '
          + 'crystal already fused cannot be re-lit, which is what stops it looping forever. Each '
          + 'detonation is 25 damage to every enemy within 150px plus 12 ruin spikes thrown in a full '
          + 'circle at 440 px/s for a second, 15 damage each within 16px and each spike hitting a given '
          + 'body only once. A spike that lands takes a permanent 10% off whatever ability its victim used '
          + 'last, compounding to a maximum of 7 stacks, at which point that ability is doing 47.8% of what '
          + 'it used to. Every crystal that goes off also widens every one of your ruin cracks by 3%.',
        effects: [
          { tag: 'damage', label: 'The blast', detail: '25 damage to every enemy within 150px of each detonating crystal.', requiresUpgrade: 'f' },
          { tag: 'damage', label: 'The spikes', detail: '12 ruin spikes thrown in a full circle at 440 px/s for 1 second, 15 damage each to anything within 16px, and each spike hits a given body only once.', requiresUpgrade: 'f' },
          { tag: 'debuff', label: 'Blunting', detail: 'A spike that lands takes a permanent 10% off whatever ability its victim used last, compounding to a maximum of 7 stacks — at which point that one ability is doing 47.8% of what it used to.', requiresUpgrade: 'f' },
          { tag: 'utility', label: 'The chain', detail: '110ms between links, and a blast or a flying spike both count as a detonator, so the run carries well past any one blast radius. A crystal already fused cannot be re-lit, which is what stops it looping forever.', requiresUpgrade: 'f' },
          { tag: 'utility', label: 'And the cracks', detail: 'Every crystal that goes off widens every one of your ruin cracks by 3%.', requiresUpgrade: 'f' },
        ],
      },
      notes: [
        'Against anything that puts objects on the board — Creation, Conquest, Oil, Technology, Illusion\'s panes — the raze alone is worth the cooldown, and it is the only thing in the game that deletes a structure rather than shooting it.',
        'Blunting is applied to whichever ability the victim cast most recently, so the spikes tend to bite whatever they were spamming, which is usually the right answer.',
        'Where several blunted attackers exist at once, the receiving end takes the single deepest cut rather than the product of all of them.',
        'The ring following you means it can be walked onto somebody. It also means it can be walked *off* somebody by them, and the fuse is long enough for that to be a real decision on both sides.',
      ],
    },

    'ruin-decay': {
      basics:
        'Hits every enemy at any range with a stack of decay: ×0.9 movement speed, ×1.1 damage taken '
        + 'and ×0.9 damage dealt, all three compounding rather than adding — so ten stacks is ×0.35 '
        + 'speed, ×2.59 damage taken and their damage cut to 34.9% of what it was. It never expires, '
        + 'there is no cleanse and nothing decays the decay; only the end of the match removes it. The '
        + 'cap is a wall: an 11th cast prints ☠️ NOTHING LEFT TO ROT, spends the 15-second cooldown, and '
        + 'does nothing else.',
      cast: 'Q, ultimate. Instant, no aim, hits every enemy at any range. 15s cooldown — a short leash for something that never comes off, which is exactly why it caps.',
      effects: [
        { tag: 'debuff', label: 'Per stack', detail: '×0.9 movement speed, ×1.1 damage taken and ×0.9 damage dealt — all three compounding, not adding.' },
        { tag: 'debuff', label: 'At the cap', detail: '10 stacks is ×0.35 speed (65% slower), ×2.59 damage taken, and their damage cut to 34.9% of what it was.' },
        { tag: 'utility', label: 'It never expires', detail: 'No duration, no cleanse and no decay-of-the-decay. The only thing that removes it is the end of the match.' },
        { tag: 'cost', label: 'The cap is a wall', detail: 'An 11th cast prints ☠️ NOTHING LEFT TO ROT — and still spends the 15-second cooldown, with no refund and no other effect.' },
      ],
      upgrade: {
        basics:
          'Every cast also opens 2 ruin cracks, 46px across to start, placed by sampling 20 spots and '
          + 'keeping the one furthest from every crack already down so a long match spreads them out. Any '
          + 'enemy standing in one takes 12 damage a second, charged as 6 every half second. They only ever '
          + 'grow — +3% radius on every crack every time any ruin crystal anywhere goes off, uncapped, with '
          + 'nothing shrinking them — and a crystal standing inside one of your cracks is charged, striking '
          + 'the nearest enemy within 200px for 15 every 1.5 seconds, hitscan, with nothing to dodge and no '
          + 'line of sight to break.',
        effects: [
          { tag: 'summon', label: 'The cracks', detail: '2 per cast, 46px across to start, placed by sampling 20 spots and keeping the one furthest from every crack already down so a long match spreads them out.', requiresUpgrade: 'q' },
          { tag: 'dot', label: 'Standing in one', detail: '12 damage a second, charged as 6 every half second, to any enemy inside any of your cracks.', requiresUpgrade: 'q' },
          { tag: 'utility', label: 'They only grow', detail: '+3% radius on every crack, every time any ruin crystal anywhere goes off. Uncapped, and nothing shrinks them.', requiresUpgrade: 'q' },
          { tag: 'damage', label: 'Ruinic lightning', detail: 'A crystal standing inside one of your cracks is charged: every 1.5 seconds it strikes the nearest enemy within 200px for 15. Hitscan — there is nothing to dodge and no line of sight to break.', requiresUpgrade: 'q' },
        ],
      },
      notes: [
        'The two halves of the rot are written onto one field. Taking 10% more per stack and dealing 10% less per stack are the same trade seen from opposite ends, because a hit has no attacker attached by the time it resolves — so the "deal less" half is applied as the Ruin side taking less.',
        'Blunting from Chain Reaction rides that same field, so a decayed, blunted attacker is multiplying two permanent penalties together.',
        'The cracks stop at ten casts, because the cracks only open on a cast that actually adds a stack. Once the rot is capped the crack engine is finished for the match.',
        'Fifteen seconds of cooldown for something permanent means the correct opening move against Ruin is to be aggressive early: every 15 seconds you let them live is another 10% forever.',
      ],
    },
  },

  mastery: {
    'combo-breaker': {
      basics:
        'Everything every enemy\'s resource bars gain is halved, whatever fills them — damage dealt, '
        + 'damage taken, seconds survived, bodies eaten, shots landed. Stack counters that cannot hold a '
        + 'fraction, like a Styx brand, a Justice bite, a rung of a radiation dose, a link of a Sand '
        + 'chain or a frost stack, carry the halved remainder instead, so two become one and the second '
        + 'arrives on the fourth. Draining, spending and hard resets all run at their normal speed, a bar '
        + 'that empties on a timer emptying exactly as fast as it always did, and a meter already at its '
        + 'ceiling is unaffected — the payoff at the top of any bar is exactly the size it always was. '
        + 'Only the climb is taxed.',
      cast: 'Passive. On for the whole match while Ruin Mastery is enabled and Ruin is the element being played.',
      effects: [
        { tag: 'debuff', label: 'Every meter', detail: '×0.5 on everything every enemy\'s resource bars gain, whatever fills them — damage dealt, damage taken, seconds survived, bodies eaten, shots landed.' },
        { tag: 'debuff', label: 'Whole-step meters', detail: 'Stack counters that cannot hold a fraction — a Styx brand, a Justice bite, a rung of a radiation dose, a link of a Sand chain, a frost stack — carry the halved remainder instead, so two become one and the second arrives on the fourth.' },
        { tag: 'utility', label: 'What it does not touch', detail: 'Draining, spending and hard resets all run at their normal speed. A bar that empties on a timer empties exactly as fast as it always did.' },
        { tag: 'utility', label: 'Nothing is capped away', detail: 'A meter already at its ceiling is unaffected, and the payoff at the top of any bar is exactly the size it always was. Only the climb is taxed.' },
      ],
      notes: [
        'It is a tax on the ramp, not on the upkeep. Elements that open strong barely feel it; elements that are quietly banking toward one enormous window feel almost nothing else.',
        'The halving is applied where the number goes up rather than where the bar is read, which is why it covers sources the bar\'s own element never enumerated — a kit that grows a new way to feed its meter later inherits the tax for free.',
        'A meter that hangs over a victim still belongs to whoever is filling it. Love over an enemy\'s head, drowsiness, a stress pool: all of them are the caster\'s progress, so it is the caster who is taxed and the victim who is spared nothing.',
        'The one thing it is not is a cleanse. Everything already on the board when Ruin walks in stays exactly where it is.',
      ],
    },
    'second-skin': {
      basics:
        'A bindable burst of 25 plates thrown in an even circle at 540 px/s for 0.82s — about 440px of '
        + 'reach in every direction at once — dealing 15 damage on a shared hit list, so standing in the '
        + 'middle is 15 damage and one revert rather than 25 of either. Anything a plate touches is put '
        + 'back into the body it started the match in: Hunt\'s beast and hybrid, Justice\'s flight, '
        + 'Gluttony\'s butcher, Earth\'s titan, Fire\'s flame body, Magnet\'s board, Acid\'s burrow, Speed \'O\' '
        + 'Light, a Silence possession, a Magic chicken, a tempered Sand, a gum zip-line, a Creation '
        + 'mech, a Growth body swap and an Illusion fold. It is not a pause: the form does not come back, '
        + 'everything spent getting into it is spent, and even a permanent one like a Give In beast ends '
        + 'anyway — this is the only thing in the game that ends one early. Every cast shrinks you ×0.8 '
        + 'in size and hitbox, permanently, so five layers is 32.8% of the size you started at and '
        + 'nothing hands any of it back. There are exactly five casts in the whole match; a sixth press '
        + 'prints 🦎 NOTHING LEFT TO SHED and does nothing. 14s cooldown.',
      cast: 'The bound key (E, R, F or Q). Instant, no aim — the burst is a full circle centred on you. 14 second cooldown, and five casts in the entire match.',
      effects: [
        { tag: 'damage', label: 'The plates', detail: '25 shards at 15 damage, thrown in an even circle at 540 px/s for 0.82s — about 440px of reach in every direction at once.' },
        { tag: 'utility', label: 'One plate per body', detail: 'All 25 share a single hit list, so standing in the middle of the burst is 15 damage and one revert, never 25 of either.' },
        { tag: 'control', label: 'Back to base form', detail: 'Anything a plate touches is put back in the body it started the match in: Hunt\'s beast and hybrid, Justice\'s flight, Gluttony\'s butcher, Earth\'s titan, Fire\'s flame body, Magnet\'s board, Acid\'s burrow, Speed \'O\' Light, a Silence possession, a Magic chicken, a tempered Sand, a gum zip-line, a Creation mech, a Growth body swap and an Illusion fold.' },
        { tag: 'control', label: 'It is not a duration', detail: 'The form does not pause and it does not come back. Everything spent getting into it is spent, and a permanent one — a Give In beast — ends anyway. This is the only thing in the game that ends one early.' },
        { tag: 'cost', label: 'You shrink', detail: '×0.8 size and hitbox, permanently, on every cast. Five layers is 32.8% of the size you started at, and nothing in the game hands any of it back.' },
        { tag: 'cost', label: 'Five, and then never', detail: 'The card empties on the fifth cast and stays empty for the rest of the match. A sixth press prints 🦎 NOTHING LEFT TO SHED and does nothing at all.' },
      ],
      notes: [
        'The shrink is a gift and a wound in the same line. A third-size body is a nightmare to hit — and it is also a body that has to physically be somewhere for half of Ruin\'s own kit, since the skewer, the ring and the crystals are all placed relative to it.',
        'The five are the design. There is no regeneration, no cooldown reduction and no upgrade that adds a sixth, so every cast is a decision about whether *this* transformation is the one worth a layer.',
        'The reverting half is worth nothing at all against an element with no form to break — the plates still land and still hurt, but half the card is dead weight. Against Hunt, Gluttony, Earth or Justice it is close to a full counter to their strongest button.',
        'Ending a form is not the same as razing a structure. Spikes of Ruin destroys what somebody *built*; this ends what somebody *became*. A Creation pilot is thrown clear of their mech and the mech is left standing.',
        'The bot spends its five deliberately: it will not shed at range, and it prefers the two moments the kit itself set up — somebody threaded onto its skewer, or somebody caught inside a spike ring that is about to erupt.',
      ],
    },
  },
};

export default ruin;
