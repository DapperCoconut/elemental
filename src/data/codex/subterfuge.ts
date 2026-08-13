import { ElementCodex } from '../AbilityCodex';

/**
 * Subterfuge — the element that pays other people to do it.
 *
 * Verified against `src/elements/subterfuge.ts`, `kits/SubterfugeKit.ts`, the five shop upgrades
 * in `data/Upgrades.ts`, the Sonic Boom perk in `data/Perks.ts` and the two mastery enhancements
 * in `data/Mastery.ts`. It shipped once under the name Quantum and the id `quantum`; both were
 * handed over when the real Quantum arrived, so this is `subterfuge` end to end.
 */
const subterfuge: ElementCodex = {
  identity:
    'A man in a good coat with three red banknotes hovering over his head and absolutely no '
    + 'intention of fighting you personally. Everything he owns is bought: bullets are bought, '
    + 'people are bought, and — with the ultimate — so is whatever your element was about to do '
    + 'to him. The daggers are the one thing he does with his own hands, and even those are '
    + 'really an investment, because every point of damage they deal is paid back to him as '
    + 'ammunition. Subterfuge has the slowest opening in the game and one of the highest '
    + 'ceilings, because a wallet that has been earning for thirty seconds buys a small firm.',

  passives: [
    {
      emoji: '💵',
      name: 'Dirty Money',
      basics:
        'You start with 2 notes and earn 1 more every 5 seconds, holding 3 at once — 4 with Big Pockets '
        + '— with anything past the cap simply lost, so sitting on a full wallet is throwing money away. '
        + 'It buys everything: a 25-round Spray reload (1), a Lackey (1), a Money Runner (1), a Bribe '
        + '(1), a Thug (2), a Specialist (3) and a retainer recast of a stolen ultimate (2). Reloads, '
        + 'recruits, bribes and recasts all compete for the same three notes; there is no second resource '
        + 'anywhere in the kit.',
      effects: [
        { tag: 'resource', label: 'The income', detail: '2 at the start of the match, and 1 more every 5 seconds.' },
        { tag: 'resource', label: 'The cap', detail: '3 at once — 4 with Big Pockets. Income past the cap is simply lost, so sitting on a full wallet is throwing money away.' },
        { tag: 'resource', label: 'What it buys', detail: 'A 25-round Spray reload (1), a Lackey (1), a Money Runner (1), a Bribe (1), a Thug (2), a Specialist (3), and a retainer recast of a stolen ultimate (2).' },
        { tag: 'utility', label: 'One wallet, everything', detail: 'Reloads, recruits, bribes and retainer recasts all compete for the same three notes. There is no second resource anywhere in the kit.' },
      ],
      notes: [
        'The five-second tick means a Subterfuge player who has been forced to fight has an empty wallet, and one who has been left alone has a full one. Pressure is the counterplay.',
        'A mirror match ultimate is worth 3 money outright — the single largest cash injection in the element.',
      ],
    },
    {
      emoji: '🔫',
      name: 'Kickbacks',
      basics:
        'Damage you personally deal with daggers or Spray refills the gun: 3 bullets for every 10 '
        + 'damage, up to a magazine of 50 — 75 with Steady Hands. You start each match with 25 rounds, '
        + 'and pressing E with none left buys a 25-round reload for 1 money. A recruit\'s damage, a stolen '
        + 'ultimate\'s damage and a Sonic Boom all pay nothing: the kickback is only on the two things you '
        + 'aim yourself.',
      effects: [
        { tag: 'resource', label: 'The conversion', detail: '3 bullets for every 10 damage dealt with daggers or Spray, up to a magazine of 50 — 75 with Steady Hands.' },
        { tag: 'resource', label: 'The magazine', detail: 'You start each match with 25 rounds. Pressing E with none left buys a 25-round reload for 1 money.' },
        { tag: 'utility', label: 'Only your own weapons', detail: 'A recruit\'s damage, a stolen ultimate\'s damage and a Sonic Boom all pay nothing. The kickback is on the two things you personally aim.' },
      ],
      notes: [
        'A recalled dagger is 12 damage and therefore 3 bullets, which is why the Click is genuinely the Spray\'s ammunition supply rather than a separate ability.',
        'At 2 damage a bullet the gun is roughly break-even with itself: 5 shots is 10 damage is 3 bullets back.',
      ],
    },
  ],

  abilities: {
    'sub-cutter': {
      basics:
        'With fewer than three blades out, Click throws one: 8 damage to the first body it passes '
        + 'through at 900 px/s, and then it plants where you aimed. At three out, Click recalls them all '
        + 'for 12 damage each on the way home, once per body per blade — so three blades converging on '
        + 'somebody standing between you and them is 36. Each blade forgets what it has hit when the '
        + 'recall starts. Every point of dagger damage feeds Kickbacks, so a full three-blade recall is '
        + 'about 10 bullets. No cooldown at all.',
      cast: 'Click. Under three out it throws one; at three out it recalls them all. No cooldown at all.',
      effects: [
        { tag: 'damage', label: 'The throw', detail: '8 damage to the first body it passes through at 900 px/s, then it plants where you aimed.' },
        { tag: 'damage', label: 'The recall', detail: '12 damage each on the way home, once per body per blade — so three blades converging on somebody standing between you and them is 36.' },
        { tag: 'utility', label: 'Three out', detail: 'The cap is what makes the ability a rhythm: throw, throw, throw, recall. Each blade forgets what it has hit when the recall starts.' },
        { tag: 'resource', label: 'It pays for the gun', detail: 'Every point of dagger damage feeds Kickbacks — a full three-blade recall is 36 damage and about 10 bullets.' },
      ],
      upgrade: {
        basics:
          'Each blade that reaches you has a 15% chance, rolled on arrival, to stay in orbit instead: '
          + '48px out, turning at 2.6 radians a second for 10 seconds, dealing 12 damage to anything it '
          + 'touches no more than once every 0.5 seconds per blade and surviving the hit. An orbiting blade '
          + 'is not one of your three — it does not need recalling and it does not stop you throwing.',
        effects: [
          { tag: 'summon', label: 'The orbit', detail: '15% chance per blade that reaches you, rolled on arrival. It turns at 2.6 radians a second on a 48px orbit and lasts 10 seconds.', requiresUpgrade: 'click' },
          { tag: 'damage', label: 'The contact', detail: '12 damage to anything the orbiting dagger touches, no more than once every 0.5 seconds per blade — and it survives the hit.', requiresUpgrade: 'click' },
          { tag: 'utility', label: 'They are extra', detail: 'An orbiting blade is not one of your three. It does not need recalling and it does not stop you throwing.', requiresUpgrade: 'click' },
        ],
      },
      notes: [
        'The colours alternate deliberately, so a Subterfuge player can always tell which of the three is theirs at a glance in a crowded recall.',
        'The Crystal ultimate stolen with Q makes your clones throw daggers too, and those are extras beyond the three-blade cap.',
      ],
    },

    'sub-spray': {
      basics:
        'A held submachine gun: one hitscan round every 80ms inside a 15° cone out to 520px, 2 damage '
        + 'each, roughly 25 damage a second on the trigger. The magazine holds 50, starting at 25, and '
        + 'Kickbacks refills it at 3 rounds per 10 damage dealt with daggers or Spray. Pressing E on '
        + 'empty buys a 25-round reload for 1 money instead of firing — there is no free reload anywhere '
        + 'in the kit. 1s cooldown on the press.',
      cast: 'E, held. One round every 80ms while the trigger is down. 1s cooldown on the press. Pressing it with an empty magazine buys a 25-round reload for 1 money instead of firing.',
      effects: [
        { tag: 'damage', label: 'The round', detail: '2 damage, hitscan, out to 520px, inside a 15° cone. Roughly 25 damage a second while the trigger is held.' },
        { tag: 'resource', label: 'The magazine', detail: '50 rounds, starting at 25. Kickbacks refill it at 3 rounds per 10 damage dealt with daggers or Spray.' },
        { tag: 'resource', label: 'The reload', detail: '1 money for 25 rounds, bought by pressing E on empty. There is no free reload anywhere in the kit.' },
      ],
      upgrade: {
        basics:
          'The magazine goes to 75 rounds and Kickbacks fills all of it, and the 15° cone narrows '
          + 'continuously over about 8 seconds of unbroken fire to perfect accuracy at the end. A gap of '
          + '0.45 seconds without firing drops the focus back to zero: this is a weapon for holding down '
          + 'rather than tapping.',
        effects: [
          { tag: 'buff', label: 'The magazine', detail: '75 rounds instead of 50, and Kickbacks fills all of it.', requiresUpgrade: 'e' },
          { tag: 'buff', label: 'The focus', detail: 'The 15° cone narrows continuously over about 8 seconds of unbroken fire, to perfect accuracy at the end of it.', requiresUpgrade: 'e' },
          { tag: 'cost', label: 'It resets fast', detail: 'A gap of 0.45 seconds without firing drops the focus back to zero. This is a weapon for holding down, not for tapping.', requiresUpgrade: 'e' },
        ],
      },
      notes: [
        'Eight seconds of continuous fire is 100 rounds — more than a full magazine — so reaching perfect accuracy needs Kickbacks working the whole time.',
        'A perfectly focused Spray at 25 damage a second is the highest sustained single-target output the element has, and it takes most of a magazine to get there.',
      ],
    },

    'sub-recruit': {
      basics:
        'Hires a Lackey for 1 money: it keeps its distance and sprays the enemy down at 1 damage a '
        + 'pellet every 140ms out to 560px, with a 25-round magazine and a 5-second reload. Loyalty runs '
        + '20 seconds and drains continuously, and every projectile that hits them costs 2 seconds on '
        + 'top. A Bribe refills a recruit\'s loyalty to 120% of its maximum, which is the only way to keep '
        + 'one past its contract. 1s cooldown, and with The Rolodex, holding R opens a hiring wheel '
        + 'instead.',
      cast: 'R, 1 money. 1s cooldown. With The Rolodex, hold R for a hiring wheel instead.',
      effects: [
        { tag: 'summon', label: 'The Lackey', detail: '1 money. Keeps its distance and sprays the enemy down: 1 damage a pellet every 140ms, a 25-round magazine, a 5-second reload, out to 560px.' },
        { tag: 'resource', label: 'Loyalty', detail: '20 seconds, draining continuously. Every projectile that hits them costs 2 seconds of it on top.' },
        { tag: 'utility', label: 'Buying more time', detail: 'A Bribe refills a recruit\'s loyalty to 120% of its maximum — the only way to keep one past its contract.' },
      ],
      upgrade: {
        basics:
          'Three more recruits on a held hiring wheel, with the cursor picking the slice and a release on '
          + 'one you cannot afford simply not hiring. Money Runner (1) sprints around the arena at 280 '
          + 'px/s, holds on for 12 seconds and pays out 2 money when it quits — the only recruit that is a '
          + 'net profit. Thug (2) has 35 seconds of loyalty and a bat: 12 damage, a 2-second stun and heavy '
          + 'knockback within 46px, once every 1.8 seconds. Specialist (3) is armoured, so projectile hits '
          + 'cost it no loyalty at all, carrying a 5-pellet close-range shotgun at 2 damage a pellet, 0.5s '
          + 'between shots, five shots and then a reload, out to 230px.',
        effects: [
          { tag: 'summon', label: 'Money Runner', detail: '1 money. Sprints around the arena at 280 px/s, holds on for 12 seconds, and pays out 2 money when it quits — the only recruit that is a net profit.', requiresUpgrade: 'r' },
          { tag: 'summon', label: 'Thug', detail: '2 money. 35 seconds of loyalty and a bat: 12 damage, a 2-second stun and heavy knockback within 46px, once every 1.8 seconds.', requiresUpgrade: 'r' },
          { tag: 'summon', label: 'Specialist', detail: '3 money. Armoured, so projectile hits cost it no loyalty at all, with a 5-pellet close-range shotgun — 2 damage a pellet, 0.5s between shots, 5 shots and then a reload — out to 230px.', requiresUpgrade: 'r' },
          { tag: 'utility', label: 'The wheel', detail: 'Held rather than tapped, with the cursor picking the slice. Releasing on one you cannot afford simply does not hire.', requiresUpgrade: 'r' },
        ],
      },
      notes: [
        'A Money Runner is the correct opening in almost every match: it costs 1, returns 2, and the twelve seconds it spends running are twelve seconds the enemy has to think about something that is not you.',
        'The Specialist is the only recruit projectiles cannot rush off the field, which makes it the one worth putting in front of you rather than beside you.',
        'A recruit walks in already hired. There is no summoning animation to interrupt and nothing that dispels one except damage and time.',
      ],
    },

    'sub-bribe': {
      basics:
        'One note, aimed at the cursor. On an enemy it is −25% damage dealt for 8 seconds, with money '
        + 'raining on them and a censor bar over their face throughout; on one of your own recruits it '
        + 'refills loyalty to 120% of its maximum, taking a Lackey to 24 seconds and a Thug to 42. A body '
        + 'within 36px of the cursor is bribed directly, and with nothing under the cursor it goes to '
        + 'whichever valid target is nearest instead of failing, so the money is never simply thrown '
        + 'away. 1s cooldown.',
      cast: 'F, 1 money, aimed at the cursor. 1s cooldown. A body within 36px of the cursor is bribed directly; otherwise it goes to whichever valid target is nearest the cursor.',
      effects: [
        { tag: 'debuff', label: 'Bribing an enemy', detail: '−25% damage dealt for 8 seconds, with money raining on them and a censor bar over their face for the whole time.' },
        { tag: 'buff', label: 'Bribing a recruit', detail: 'Loyalty refilled to 120% of its maximum — a Lackey goes to 24 seconds, a Thug to 42.' },
        { tag: 'utility', label: 'It always finds somebody', detail: 'With nothing under the cursor it bribes the nearest valid target instead of failing, so the money is never simply thrown away.' },
      ],
      upgrade: {
        basics:
          'Recruits start levelling. XP comes in at +1 a second, +10 per Bribe and +1 per 25 damage '
          + 'dealt, at 50 XP a level up to V, and every level is +10% move speed, more damage and 8% slower '
          + 'loyalty loss above the first. At level V a Lackey reloads 50% faster, a Money Runner pays 1 '
          + 'money every 15 seconds instead of only on quitting, a Thug doubles its stun to 4 seconds and '
          + 'hits 1.5× harder on the knockback, and a Specialist fires 7 pellets instead of 5. At 10 XP a '
          + 'bribe — a fifth of a level for 1 money — F is the cheapest way to build a made man.',
        effects: [
          { tag: 'resource', label: 'The XP', detail: '+1 a second, +10 per Bribe, and +1 per 25 damage dealt. 50 XP a level, up to V.', requiresUpgrade: 'f' },
          { tag: 'buff', label: 'Every level', detail: '+10% move speed, more damage, and 8% slower loyalty loss per level above the first.', requiresUpgrade: 'f' },
          { tag: 'buff', label: 'At level V', detail: 'Lackeys reload 50% faster. Money Runners pay 1 money every 15 seconds instead of only on quitting. Thugs double their stun to 4 seconds and hit 1.5× harder on the knockback. Specialists fire 7 pellets instead of 5.', requiresUpgrade: 'f' },
          { tag: 'utility', label: 'Bribing is the fast route', detail: '10 XP a bribe is a fifth of a level for 1 money, which makes F the cheapest way to build a made man.', requiresUpgrade: 'f' },
        ],
      },
      notes: [
        'The 25% damage cut is applied victim-side rather than to the bribed fighter, which in a duel is the same outcome and in a crowd means it only protects you.',
        'A level V Money Runner paying 1 every 15 seconds is a permanent 20% raise on the whole element\'s income, which is the strongest thing this upgrade does.',
        'Bribing your own recruit and bribing the enemy are the same key and the same money. Choosing between them is the ability.',
      ],
    },

    'sub-treachery': {
      basics:
        'Steals the enemy element\'s ultimate: whatever their Q does, you do. Most of the roster is '
        + 'routed straight through their own ability, and about a dozen have bespoke crooked versions, '
        + 'all listed below. It takes a 2-second channel of black fog before anything happens, the '
        + 'longest telegraph on any ultimate in this bracket. Gunpowder and Rubber have no version at '
        + 'all, and anything else the game cannot route prints 🚫 NO CONTRACT and is wasted. 40s '
        + 'cooldown.',
      cast: 'Q, ultimate. A 2-second channel, then it resolves. 40s cooldown.',
      effects: [
        { tag: 'utility', label: 'The theft', detail: 'Whatever the enemy element\'s Q does, you do. Most of the roster is routed straight through their own ability; a dozen have bespoke crooked versions.' },
        { tag: 'cost', label: 'The channel', detail: '2 seconds of black fog before anything happens, which is the longest telegraph on any ultimate in this element\'s bracket.' },
        { tag: 'cost', label: 'No contract', detail: 'Gunpowder and Rubber have no version at all, and anything else the game cannot route prints 🚫 NO CONTRACT and is wasted.' },
      ],
      variants: {
        label: 'The crooked versions — what a stolen ultimate becomes',
        variants: [
          { emoji: '🕴️', name: 'Subterfuge (mirror)', description: 'Insider Trading — 3 money instantly, straight into the wallet.' },
          { emoji: '⚙️', name: 'Metal', description: '+50 shield HP, and nothing else at all.' },
          { emoji: '🌱', name: 'Growth', description: 'Two Lackeys hired for free.' },
          { emoji: '👻', name: 'Soul', description: 'Your recruits are ignited: they burn through loyalty 2 seconds faster per second, and go off in a burning area when they finally quit.' },
          { emoji: '🌿', name: 'Life', description: 'Linked — for 5 seconds, damage aimed at you is split across your recruits instead, at a cost of 0.15s of loyalty per point.' },
          { emoji: '🎵', name: 'Sound', description: 'A disco ball for 12 seconds, firing every 3 seconds for 10 damage.' },
          { emoji: '⚡', name: 'Electricity', description: 'Overcharged for 5 seconds: die inside the window and you come back at 25% health.' },
          { emoji: '🧪', name: 'Acid', description: 'Acid falls on the entire screen for 8 seconds at a quarter strength — 1.5 damage every half second, everywhere.' },
          { emoji: '🪨', name: 'Earth · Oil · Ice · Time · Light · Echo · Magic', description: 'Routed straight into those kits — a golem, the train, Frozen Solid without the frost, Always Noon, Speed \'O\' Light, a direct Eclipse and the Necronomicon.' },
          { emoji: '🚫', name: 'Gunpowder · Rubber', description: 'No contract. The ultimate is spent and nothing happens.' },
        ],
      },
      upgrade: {
        basics:
          'For 8 seconds after a theft resolves you can run it again for 2 money out of the same wallet '
          + 'the reloads and recruits come from — no second channel and no cooldown. It re-runs the stolen '
          + 'element rather than rolling fresh, so a good theft is worth twice as much and a 🚫 NO CONTRACT '
          + 'is worth nothing twice.',
        effects: [
          { tag: 'utility', label: 'The window', detail: '8 seconds from the moment the theft resolves.', requiresUpgrade: 'q' },
          { tag: 'resource', label: 'The recast', detail: '2 money, out of the same wallet the reloads and the recruits come from. No second channel and no cooldown.', requiresUpgrade: 'q' },
          { tag: 'utility', label: 'Exactly the same effect', detail: 'It re-runs the stolen element, not a fresh roll — so a good theft is worth two of it and a 🚫 NO CONTRACT is worth nothing twice.', requiresUpgrade: 'q' },
        ],
      },
      notes: [
        'Two seconds of standing in black fog is a real commitment. A Subterfuge player casting Q has decided the next two seconds are survivable.',
        'The mastery requirement is ten *different* elements, tracked as a persistent set across matches rather than a counter, so a favourite matchup only ever counts once.',
        'On Retainer plus a mirror match is 3 money for the theft and 3 more for the recast, at a net cost of 2 — a wallet from nothing.',
      ],
    },
  },

  perks: {
    'sonic-boom': {
      basics:
        'Every recalled dagger booms: 10 damage in a 96px ring plus 420 px/s of knockback over 160ms '
        + 'and a 240ms stagger. It lands wherever the blade was standing when the recall began, so a '
        + 'recall from three planted positions is three separate rings across the arena — or on the '
        + 'victim instead, if the dagger connects on the way back. Once either way.',
      effects: [
        { tag: 'damage', label: 'The boom', detail: '10 damage in a 96px ring.' },
        { tag: 'control', label: 'The shove', detail: '420 px/s of knockback over 160ms, and a 240ms stagger on top of it.' },
        { tag: 'area', label: 'Where it lands', detail: 'Wherever the blade was standing when the recall began — so a recall from 3 planted positions is 3 separate 96px rings across the arena.' },
        { tag: 'utility', label: 'Or on the victim', detail: 'A dagger that connects on the way back booms on the body it hit rather than at its launch point, and only once either way.' },
      ],
      notes: [
        'Three planted daggers plus a recall is 36 damage from the blades and 30 more from the booms, with three knockbacks, from a key that has no cooldown.',
        'Because the ring lands where the blade *was*, planting daggers around somebody is a genuine trap rather than only a damage rotation.',
      ],
    },
  },

  mastery: {
    'big-pockets': {
      basics:
        'The wallet cap goes from 3 to 4 on the same 1-per-5-seconds income. A full wallet now buys a '
        + 'Specialist and leaves change for a reload or a bribe instead of leaving you with nothing, and '
        + 'because income past the cap is lost, it is also 5 more seconds of grace before the tick starts '
        + 'being thrown away.',
      effects: [
        { tag: 'resource', label: 'The cap', detail: '4 money instead of 3, on the same 1-per-5-seconds income.' },
        { tag: 'utility', label: 'Why it matters', detail: 'A full wallet now buys a Specialist and leaves change for a reload or a bribe, instead of leaving you with nothing at all.' },
        { tag: 'utility', label: 'Less waste', detail: 'Income past the cap is lost, so a bigger cap is also 5 more seconds of grace before the tick starts being thrown away.' },
      ],
      notes: [
        'It is a passive with no cast, no cooldown and no tell. It simply changes what a saved-up wallet can do.',
      ],
    },
    'smoke-break': {
      basics:
        'A bindable cigarette: lighting it is −25% damage taken for as long as it burns, 25 seconds of '
        + 'it, with every hit you take costing 1 second on top. The same key again throws it at 900 px/s '
        + 'to the cursor as a 132px cloud lasting 8 seconds. Standing in your own smoke hides you '
        + 'completely, though attacking from inside gives you away and exposes you for 3 seconds, and '
        + 'recruits standing in it lose loyalty at 40% of the usual rate — a Lackey in smoke lasts 50 '
        + 'seconds instead of 20. It blinds only them: on the enemy\'s screen the cloud is drawn over '
        + 'everything as a solid wall, while on yours it sits under the fighters as a thin haze. The same '
        + 'object, rendered at two different depths. 20s cooldown from lighting up.',
      cast: 'The bound key lights it; the same key again throws it. 20s cooldown, counted from lighting up.',
      effects: [
        { tag: 'shield', label: 'The cigarette', detail: '−25% damage taken for as long as it is lit.' },
        { tag: 'utility', label: 'How long it lasts', detail: '25 seconds of burn, and every hit you take costs it 1 second on top.' },
        { tag: 'area', label: 'The cloud', detail: '132px, for 8 seconds, thrown at 900 px/s to the cursor.' },
        { tag: 'utility', label: 'Invisible inside it', detail: 'Standing in your own smoke hides you completely. Attacking from inside gives you away and exposes you for 3 seconds.' },
        { tag: 'buff', label: 'It keeps your staff', detail: 'Recruits standing in the cloud lose loyalty at 40% of the usual rate — a Lackey in smoke lasts 50 seconds instead of 20.' },
        { tag: 'debuff', label: 'It blinds only them', detail: 'On the enemy\'s screen the cloud is drawn over everything as a solid wall. On yours it sits under the fighters as a thin haze. It is the same object, rendered at two different depths.' },
      ],
      notes: [
        'The cigarette and the cloud are the same object and you only get one. Throwing it early buys eight seconds of cover; holding it buys twenty-five seconds of armour.',
        'A Thug and a Specialist standing in the smoke for their whole contract is close to a permanent bodyguard, which is the strongest thing the enhancement does.',
        'The cooldown runs from lighting up rather than from throwing, so a cigarette smoked all the way down is very nearly free.',
      ],
    },
  },
};

export default subterfuge;
