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
      magic:
        'The grey band on the right-hand end of a health bar. Rust does not damage anybody — it '
        + '*moves* health out of the pool that heals and into a pool that does not, and then '
        + 'lets that pool leak away. Because it is a move rather than a hit it walks straight '
        + 'past shields, absorbers and every mitigation multiplier in the game, and because it '
        + 'is not damage it can never be the thing that kills somebody.',
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
      magic:
        'Almost everything Ruin applies is written once and never checked against a clock '
        + 'again. Unstoppable Decay has no duration. Lockjaw\'s teeth have no duration. The '
        + 'blunting a ruin spike takes out of an ability has no duration, and a ruin crack in '
        + 'the floor never closes. The character carries the same rule: his frame cracks '
        + 'further apart the more health he loses and never knits back together while he is '
        + 'still standing.',
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
      magic:
        'A fat, notched wedge of scrap thrown flat down a lane, spinning and trailing a smear '
        + 'of blood-dark air behind it. It is not aimed at a person so much as at a line: it '
        + 'goes through bodies without slowing down and it tears apart every shot the other '
        + 'side has in the air on the way, so the corridor it opens is as much of the ability '
        + 'as the damage is.',
      cast: 'Click, aimed at the cursor, launched 26px out. 0.75s cooldown.',
      effects: [
        { tag: 'damage', label: 'The wedge', detail: '15 damage to each body within 30px of it, once per body — it never stops on anybody.' },
        { tag: 'area', label: 'The flight', detail: '720 px/s for 2.4 seconds, so about 1730px, or the length of the arena and back.' },
        { tag: 'control', label: 'The shredding', detail: 'Destroys every enemy projectile within 34px as it passes, from the shared shot group and from the kit-local registries that hold the projectiles which never join one.' },
        { tag: 'utility', label: 'What it spares', detail: 'Healing shots are somebody\'s medicine rather than an attack and are left alone, and it only ever eats the *other* side\'s ammunition.' },
        { tag: 'utility', label: 'The tally', detail: 'A wedge that ate anything prints ✂️ SHREDDED ×N where it finally died.' },
      ],
      upgrade: {
        magic:
          'Shatter Starter is the foundation the whole element is built on. Every shot the '
          + 'wedge tears out of the air leaves a ruin crystal growing where the shot died, and '
          + 'every fifty damage the wedge deals grows one more. Nothing else in this kit makes '
          + 'crystals, and the R, F and Q upgrades all read them rather than adding anything of '
          + 'their own — buying any of those without this one is buying a hook with nothing to '
          + 'hang on it.',
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
      magic:
        'A chain runs out and a rusted padlock snaps shut on whoever it reaches, the shackle '
        + 'closing over about a fifth of a second and the lock hanging above them for as long as '
        + 'it holds. What it locks is not chosen — it is whatever they did last. The cooldown on '
        + 'that ability keeps ticking, keeps finishing, and keeps saying it is ready. It is not.',
      cast: 'E. Aimed at a fighter rather than a point: the padlock goes on whoever is nearest to the cursor inside 460px. 25s cooldown.',
      effects: [
        { tag: 'control', label: 'The lock', detail: '20 seconds during which that one ability cannot be cast, however ready its own cooldown reads.' },
        { tag: 'utility', label: 'What gets locked', detail: 'Their last-cast ability, whatever it was. Locking the good one means baiting it out first.' },
        { tag: 'area', label: 'The reach', detail: '460px, measured from you to them — the cursor only chooses between the candidates already inside it.' },
        { tag: 'utility', label: 'Refunded on a whiff', detail: 'Nothing in reach, or a target who has not cast anything yet, hands the whole 25-second cooldown straight back. A 25-second wall for no effect is not a trade anybody would take.' },
        { tag: 'utility', label: 'One lock drawn per victim', detail: 'A second padlock on the same body replaces the picture rather than the effect.' },
      ],
      upgrade: {
        magic:
          'Lockjaw leaves teeth. The padlock still comes off after twenty seconds; the bite '
          + 'marks do not. From the moment it is applied, that ability costs its owner health '
          + 'every single time they use it, for the rest of the match — and locking the same '
          + 'ability again does not refresh anything, it simply adds another set of teeth.',
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
      magic:
        'A huge barbed iron spike thrown flat across the arena. It does not stop on a body — it '
        + 'threads them, up to three of them at once, spaced along the shaft behind the point, '
        + 'disarmed and carried wherever the spike is going until it buries itself in a wall. '
        + 'The ten damage is almost beside the point. What it really does is take a tenth of '
        + 'somebody out of the pool that heals and put it in the one that rots.',
      cast: 'R, aimed at the cursor, launched 34px out. One in the air per side — a second would only steal the first one\'s riders. 15s cooldown.',
      effects: [
        { tag: 'damage', label: 'The impale', detail: '10 damage to each rider as they go on.' },
        { tag: 'debuff', label: 'The rust', detail: '10% of their current health moved into the weak pool, which then drains at 3/s. On a 400-health target that is 40 points of grey.' },
        { tag: 'control', label: 'The ride', detail: 'Riders are written to a fixed spot on the shaft every frame — first at 49px behind the point, then every 34px back — and disarmed on a rolling 250ms refresh, so they can neither walk nor cast for the whole trip.' },
        { tag: 'area', label: 'The spike', detail: '150px long, 620 px/s, catching anything within 40px of the point, up to 3 riders. It ends on the arena wall, or after 5 seconds if it somehow never finds one.' },
        { tag: 'utility', label: 'The landing', detail: 'Riders are dropped where the spike stopped, clamped 30px inside the play area. 🧱 TORN OFF on a wall, 🩸 SLID FREE if it simply timed out.' },
      ],
      upgrade: {
        magic:
          'Ruin Transfusion feeds the spike. Thrown through one of your own ruin crystals it '
          + 'drinks it — the crystal is gone and the shaft comes out the far side lit with what '
          + 'was inside it. A fed spike stops being interested in moving health around and '
          + 'simply takes some.',
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
      magic:
        'A red ring opens on the floor around you and then follows you for two full seconds — '
        + 'it is worn, not placed, so the question it asks the other side is whether they can '
        + 'afford to be anywhere near you at all. When it goes, spikes come up through the '
        + 'floor across the whole circle, everything anybody built inside it stops existing, '
        + 'and whatever the people caught in it were wearing is turned inside out.',
      cast: 'F. Instant, no aim, one ring per side at a time. The ring tracks you for its whole 2-second fuse. 18s cooldown.',
      effects: [
        { tag: 'damage', label: 'The eruption', detail: '15 damage to every enemy within 122px of wherever you were standing when the fuse ran out.' },
        { tag: 'debuff', label: 'Buffs turned inside out', detail: 'Every plain buff on a caught fighter is flipped on the spot: a damage boost becomes a cut of the same size, a damage reduction becomes fragility, a cooldown discount becomes a penalty, a speed boost becomes a slow. Crit, dodge, regen, reflect, flat reduction, damage caps, shield charges, shield HP, clotted HP, unstoppable, levitation, self-damage immunity and invincibility are all simply taken away.' },
        { tag: 'debuff', label: 'The window', detail: '8 seconds in which buffs living inside other kits — a stance\'s haste, a form\'s speed — are inverted as well, caught at the two places they are actually felt: the speed aggregate and the mitigation product.' },
        { tag: 'summon', label: 'Razed', detail: 'Every structure, building and summon inside the circle that is not yours stops existing. Not damaged — deleted. It prints 🏚️ N RAZED.' },
        { tag: 'utility', label: 'The count', detail: 'It says how many concrete buffs it found: 🔻 N BUFFS TURNED, or 🔻 RUINED when there were none.' },
      ],
      upgrade: {
        magic:
          'Chain Reaction makes the eruption a detonator. Every one of your ruin crystals inside '
          + 'the circle goes off, a tenth of a second apart, and each one that goes off lights '
          + 'the fuse under every crystal *it* can reach — so a field that took a match to build '
          + 'comes apart in one long run of bangs marching across the floor.',
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
      magic:
        'A wave of sickly ochre goes out across the entire arena and settles on everybody on '
        + 'the other side of the fight as a coat of rot: cracks crawling over the body, flakes '
        + 'of them dropping off onto the floor wherever they walk. It is the only permanent '
        + 'status in the game. Nothing checks it against a timestamp, because there is no '
        + 'timestamp — there is only a stack count that goes one way.',
      cast: 'Q, ultimate. Instant, no aim, hits every enemy at any range. 15s cooldown — a short leash for something that never comes off, which is exactly why it caps.',
      effects: [
        { tag: 'debuff', label: 'Per stack', detail: '×0.9 movement speed, ×1.1 damage taken and ×0.9 damage dealt — all three compounding, not adding.' },
        { tag: 'debuff', label: 'At the cap', detail: '10 stacks is ×0.35 speed (65% slower), ×2.59 damage taken, and their damage cut to 34.9% of what it was.' },
        { tag: 'utility', label: 'It never expires', detail: 'No duration, no cleanse and no decay-of-the-decay. The only thing that removes it is the end of the match.' },
        { tag: 'cost', label: 'The cap is a wall', detail: 'An 11th cast prints ☠️ NOTHING LEFT TO ROT — and still spends the 15-second cooldown, with no refund and no other effect.' },
      ],
      upgrade: {
        magic:
          'Ruin Cracks tears the floor as well as the people standing on it. Every cast opens '
          + 'two more open sores in the ground — bedrock showing through, a teal seam of ruin '
          + 'running along the bottom of each — and they never close. They also feed: a ruin '
          + 'crystal grown on top of one stops being something you have to walk into and starts '
          + 'shooting at you.',
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
};

export default ruin;
