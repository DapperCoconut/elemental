import { ElementCodex } from '../AbilityCodex';

/**
 * Subterfuge — the element that pays other people to do it.
 *
 * Verified against `src/elements/subterfuge.ts`, `kits/SubterfugeKit.ts` (every number below is a
 * constant at the top of the kit), `kits/SubterfugeRide.ts` for the Hijack rides, the five shop
 * upgrades in `data/Upgrades.ts`, the Sonic Boom perk in `data/Perks.ts` and the two mastery
 * enhancements in `data/Mastery.ts`. It shipped once under the name Quantum and the id `quantum`;
 * both were handed over when the real Quantum arrived, so this is `subterfuge` end to end.
 */
const subterfuge: ElementCodex = {
  identity:
    'A man in a good coat with three red banknotes hovering over his head and absolutely no '
    + 'intention of fighting you personally. Everything he owns is bought: bullets are bought, '
    + 'people are bought, and — with the ultimate — so is whatever your element was about to do '
    + 'to him. The daggers are the one thing he does with his own hands, and even those are '
    + 'really an investment, because every point of damage they deal is paid back to him as '
    + 'ammunition. His hired men do not follow him anywhere: each one stands where he was hired '
    + 'and shoots from there, so the payroll is a position he builds rather than a pack he leads. '
    + 'With the upgrades, everything else he can buy is a money bar sitting above an ability card '
    + 'or over a recruit\'s head, and it is bought with a click.',

  passives: [
    {
      emoji: '💵',
      name: 'Dirty Money',
      basics:
        'You start with 2 notes and earn 1 more every 5 seconds, holding 3 at once — 4 with Big '
        + 'Pockets — and the clock does not run while the wallet is full, so sitting on a full wallet '
        + 'is throwing money away. It buys everything: a 25-round Spray reload (1), a Thug (1) and a '
        + 'Bribe (1), and with the upgrades Full Set (2), Luxury Rounds (2), a Rolodex specialist (2), '
        + 'a Laundering bag (1, paying 2 back), a level-3 recruit\'s favour (1 or 2) and a retainer '
        + 'recast of a stolen ultimate (2). There is no second resource anywhere in the kit.',
      effects: [
        { tag: 'resource', label: 'The income', detail: '2 at the start of the match, and 1 more every 5 seconds.' },
        { tag: 'resource', label: 'The cap', detail: '3 at once — 4 with Big Pockets. The 5-second clock is reset while the wallet is full, so sitting on a full wallet is throwing money away.' },
        { tag: 'resource', label: 'What it buys', detail: 'A 25-round Spray reload (1), a Thug (1) and a Bribe (1). With the upgrades: Full Set (2), Luxury Rounds (2), a Rolodex specialist (2), a Laundering bag (1), a level-3 favour (1 or 2) and a retainer recast (2). With mastery, a Hijack ride (1 to 4).' },
        { tag: 'utility', label: 'Money bars', detail: 'Everything an upgrade sells is a bar above its ability card or over a recruit\'s head, with the price printed on it as 1 to 3 small notes. A click on a bar is spent there and never also throws a dagger.' },
        { tag: 'utility', label: 'One wallet, everything', detail: 'Reloads, recruits, bribes, bars and recasts all compete for the same 3 notes. There is no second resource anywhere in the kit.' },
      ],
      notes: [
        'The five-second tick means a Subterfuge player who has been forced to spend has an empty wallet, and one who has been left alone has a full one. Pressure is the counterplay.',
        'A mirror match ultimate is worth 3 money outright, capped by the wallet — the single largest cash injection in the element.',
      ],
    },
    {
      emoji: '🔫',
      name: 'Kickbacks',
      basics:
        'Damage you personally deal with daggers or Spray refills the gun: 3 bullets for every 10 '
        + 'damage, up to a magazine of 50. You start each match with 25 rounds, and pressing E with '
        + 'nothing loaded buys a 25-round reload for 1 money. A recruit\'s damage, a stolen ultimate\'s '
        + 'damage, a Hijack ride and a Sonic Boom all pay nothing: the kickback is only on the two '
        + 'things you aim yourself.',
      effects: [
        { tag: 'resource', label: 'The conversion', detail: '3 bullets for every 10 damage dealt with daggers or Spray, up to a magazine of 50. Damage short of a 10 is carried over to the next hit.' },
        { tag: 'resource', label: 'The magazine', detail: 'You start each match with 25 rounds. Pressing E with nothing loaded buys a 25-round reload for 1 money.' },
        { tag: 'utility', label: 'Only your own weapons', detail: 'A recruit\'s damage, a stolen ultimate\'s damage, a ride and a Sonic Boom all pay 0. The kickback is on the 2 things you personally aim.' },
      ],
      notes: [
        'A recalled dagger is 18 damage, which is 3 bullets with 8 damage carried toward the next 3 — the Click is genuinely the Spray\'s ammunition supply rather than a separate ability.',
        'At 2 damage a bullet the gun is roughly break-even with itself: 5 shots is 10 damage is 3 bullets back.',
      ],
    },
  ],

  abilities: {
    'sub-cutter': {
      basics:
        'With fewer than three blades out, Click throws one: 8 damage to every body it passes through '
        + 'at 1350 px/s, and then it plants where you aimed. At three out, Click recalls them all for '
        + '18 damage each on the way home, once per body per blade — so three blades converging on '
        + 'somebody standing between you and them is 54. Each blade forgets what it has hit when the '
        + 'recall starts. The hand needs 0.38 seconds to come back between throws and 0.85 seconds '
        + 'after a recall, and the Click card draws that wait as a bar. Every point of dagger damage '
        + 'feeds Kickbacks.',
      cast: 'Click. Under three out it throws one; at three out it recalls them all. No cooldown, but 0.38s between throws and 0.85s after a recall.',
      effects: [
        { tag: 'damage', label: 'The throw', detail: '8 damage to each body it passes through at 1350 px/s, once per body, then it plants where you aimed.' },
        { tag: 'damage', label: 'The recall', detail: '18 damage each on the way home, once per body per blade — so 3 blades converging on somebody standing between you and them is 54.' },
        { tag: 'cost', label: 'The hand', detail: '0.38 seconds before the next throw, and 0.85 seconds empty-handed after a recall. The Click card shows the wait as a bar.' },
        { tag: 'utility', label: 'Three out', detail: 'The cap of 3 is what makes the ability a rhythm: throw, throw, throw, recall. Each blade forgets what it has hit when the recall starts.' },
        { tag: 'resource', label: 'It pays for the gun', detail: 'Every point of dagger damage feeds Kickbacks — a full three-blade recall is 54 damage and 15 bullets.' },
      ],
      upgrade: {
        basics:
          'A money bar appears above the Click card. Clicking it spends 2 money and lets you carry 5 '
          + 'daggers instead of 3 for 10 seconds, with the bar draining to show how long is left. It '
          + 'cannot be bought again until it runs out. A five-blade recall is up to 90 damage, and when '
          + 'the 10 seconds end the cap drops straight back to 3, so the next click with more than that '
          + 'standing in the floor is a recall.',
        effects: [
          { tag: 'resource', label: 'The bar', detail: '2 money, clicked on the bar above the Click card. It cannot be bought again while it is running.', requiresUpgrade: 'click' },
          { tag: 'buff', label: 'Five out', detail: '5 daggers at once instead of 3, for 10 seconds. The bar drains to show how long is left.', requiresUpgrade: 'click' },
          { tag: 'damage', label: 'The bigger recall', detail: '5 blades home through the same body is 90 damage and 27 bullets from Kickbacks.', requiresUpgrade: 'click' },
          { tag: 'utility', label: 'When it ends', detail: 'The cap is 3 again at once. With 3 or more still planted, the next click recalls them all.', requiresUpgrade: 'click' },
        ],
      },
      notes: [
        'The colours alternate deliberately, so a Subterfuge player can always tell which blades are theirs at a glance in a crowded recall.',
        'Planted daggers are also what a level-3 Sniper\'s air strike aims by: one is a loose scatter, two is the line between them, three or more is the patch of floor they fence off.',
        'The Crystal ultimate stolen with Q makes your clones throw daggers too, and those are extras beyond the three-blade cap.',
      ],
    },

    'sub-spray': {
      basics:
        'A held submachine gun: one hitscan round every 80ms inside a 15° cone out to 520px, 2 damage '
        + 'each, roughly 25 damage a second on the trigger. The magazine holds 50, starting at 25, and '
        + 'Kickbacks refills it at 3 rounds per 10 damage dealt with daggers or Spray. Pressing E with '
        + 'nothing loaded buys a 25-round reload for 1 money instead of firing — there is no free '
        + 'reload anywhere in the kit. The 1s cooldown starts when you let go of the trigger.',
      cast: 'E, held. One round every 80ms while the trigger is down. 1s cooldown from letting go. Pressing it with nothing loaded buys a 25-round reload for 1 money instead of firing.',
      effects: [
        { tag: 'damage', label: 'The round', detail: '2 damage, hitscan, out to 520px, inside a 15° cone. Roughly 25 damage a second while the trigger is held.' },
        { tag: 'resource', label: 'The magazine', detail: '50 rounds, starting at 25. Kickbacks refill it at 3 rounds per 10 damage dealt with daggers or Spray.' },
        { tag: 'resource', label: 'The reload', detail: '1 money for 25 rounds, bought by pressing E with nothing loaded. There is no free reload anywhere in the kit.' },
      ],
      upgrade: {
        basics:
          'The 15° cone narrows continuously over about 8 seconds of unbroken fire to perfect accuracy '
          + 'at the end, and a gap of 0.45 seconds without firing drops the focus back to zero. The '
          + 'magazine is still 50. A money bar above the E card also sells Luxury Rounds: 2 money for 35 '
          + 'rounds that deal 3 damage each, are fired before anything in the magazine and go exactly '
          + 'where they are pointed. They are held apart from the 50, and the bar cannot be bought again '
          + 'until all 35 are spent.',
        effects: [
          { tag: 'buff', label: 'The focus', detail: 'The 15° cone narrows continuously over about 8 seconds of unbroken fire, to perfect accuracy at the end of it.', requiresUpgrade: 'e' },
          { tag: 'cost', label: 'It resets fast', detail: 'A gap of 0.45 seconds without firing drops the focus back to 0. This is a weapon for holding down, not for tapping.', requiresUpgrade: 'e' },
          { tag: 'resource', label: 'Luxury Rounds', detail: '2 money on the bar above the E card for 35 rounds, held apart from the 50-round magazine. The bar drains as they are fired and cannot be bought again until all 35 are gone.', requiresUpgrade: 'e' },
          { tag: 'damage', label: 'What they do', detail: '3 damage each instead of 2, with no cone at all, and they are fired first — about 37 damage a second for 2.8 seconds, 105 in total.', requiresUpgrade: 'e' },
        ],
      },
      notes: [
        'Eight seconds of continuous fire is 100 rounds — two full magazines — so reaching perfect accuracy needs Kickbacks, a reload or Luxury Rounds working the whole time.',
        'Luxury Rounds pay Kickbacks like any other bullet: 35 of them landing is 105 damage and 30 ordinary rounds back, so the 2 money also refills most of the magazine behind them.',
        'With nothing in the magazine, Luxury Rounds still fire. The reload on E is only offered when both are empty.',
      ],
    },

    'sub-recruit': {
      basics:
        'Hires a Thug for 1 money. He steps out 46px from you on the side you are aiming, and stands '
        + 'there for the rest of his contract: 1 damage a round from a Tommy gun every 140ms inside a '
        + '15° cone out to 560px, a 25-round drum and a 5-second reload. Loyalty runs 40 seconds and '
        + 'drains continuously; an enemy projectile that reaches him is stopped and costs him 2 seconds '
        + 'on top. You can have 3 recruits at a time, and a fourth press with the payroll full spends '
        + 'nothing. A Bribe refills a recruit\'s loyalty to 120% of its maximum, which is the only way '
        + 'to keep one past his contract. 1s cooldown.',
      cast: 'R, 1 money. 1s cooldown. He appears 46px from you toward the cursor and never moves. Refused, at no cost, with 3 recruits already out.',
      effects: [
        { tag: 'summon', label: 'The Thug', detail: '1 money. Stands 46px from where you hired him and never walks: 1 damage a round every 140ms in a 15° cone out to 560px.' },
        { tag: 'cost', label: 'The drum', detail: '25 rounds, gone in 3.5 seconds of firing, then a 5-second reload — about 3 damage a second over a whole cycle.' },
        { tag: 'resource', label: 'Loyalty', detail: '40 seconds, draining continuously. Every enemy projectile that hits him is stopped by him and costs 2 seconds on top.' },
        { tag: 'utility', label: 'Three on the payroll', detail: 'At most 3 recruits of any kind at once. Hiring with 3 out is refused and costs 0.' },
        { tag: 'utility', label: 'Buying more time', detail: 'A Bribe refills a recruit\'s loyalty to 120% of its maximum — 48 seconds — the only way to keep one past his contract.' },
      ],
      upgrade: {
        basics:
          'A money bar above the R card opens a short list of specialists at 2 money each, and like '
          + 'Thugs they stand where they are hired, each with the same 40 seconds of loyalty. The '
          + 'Enforcer carries a shotgun — 5 pellets of 2 every 0.9 seconds out to 230px, five shells '
          + 'and then a 4-second reload — and a shield, so projectiles cost him no loyalty at all. The '
          + 'Sniper reaches the whole arena for 14, once every 3.5 seconds. The Medic has a pistol for '
          + '1 damage every 0.9 seconds out to 420px, heals you for 2 a second while you are hurt and '
          + 'within 150px of him, and slows the loyalty drain of other recruits inside that ring by 15%.',
        effects: [
          { tag: 'utility', label: 'The bar', detail: 'Click the bar above the R card and it opens a list; click a name to hire it for 2 money, placed beside you facing the nearest enemy. It is greyed out with 3 recruits already on the payroll.', requiresUpgrade: 'r' },
          { tag: 'summon', label: 'Enforcer', detail: '2 money. A shotgun: 5 pellets of 2 damage across a 22° fan every 0.9 seconds, out to 230px, 5 shells and then a 4-second reload. His shield means projectile hits cost him 0 loyalty.', requiresUpgrade: 'r' },
          { tag: 'summon', label: 'Sniper', detail: '2 money. 14 damage once every 3.5 seconds at a range of 1400px, which is the whole arena.', requiresUpgrade: 'r' },
          { tag: 'summon', label: 'Medic', detail: '2 money. A pistol for 1 damage every 0.9 seconds out to 420px — he is not there for the pistol.', requiresUpgrade: 'r' },
          { tag: 'heal', label: 'The Medic\'s care', detail: '2 health a second while you are hurt and standing within 150px of him. Other recruits inside the same ring lose loyalty 15% slower; he does not slow his own.', requiresUpgrade: 'r' },
          { tag: 'summon', label: 'Bard (Moral perk)', detail: 'With the Moral perk equipped a fourth name joins the list for 1 money: he wanders the arena at 240 px/s for 15 seconds and every other recruit\'s loyalty drains at 25% speed while he is out.', requiresUpgrade: 'r' },
        ],
      },
      notes: [
        'Nobody on the payroll walks anywhere. Where you are standing and where you are aiming when you hire is the whole of a recruit\'s positioning, so a Thug hired in a corner guards a corner.',
        'The Enforcer is the only recruit projectiles cannot rush off the field, which makes him the one worth putting in front of the others rather than beside them.',
        'A recruit hired within 96px of your Hijack ride climbs into a free seat and shoots from it as you drive.',
        'A recruit walks in already hired. There is no summoning animation to interrupt and nothing that dispels one except lost loyalty.',
      ],
    },

    'sub-bribe': {
      basics:
        'One note, aimed at the cursor. On an enemy it is −25% damage dealt for 8 seconds, with money '
        + 'raining on them and a censor bar over their face throughout; on one of your own recruits it '
        + 'refills loyalty to 120% of its maximum, taking any of them from 40 seconds to 48. An enemy '
        + 'within 36px of the cursor or a recruit within 30px is bribed directly, and with nothing under '
        + 'the cursor it goes to whichever valid target is nearest instead of failing, so the money is '
        + 'never simply thrown away. 1s cooldown.',
      cast: 'F, 1 money, aimed at the cursor. 1s cooldown. An enemy within 36px of the cursor or a recruit within 30px is bribed directly; otherwise it goes to whichever valid target is nearest the cursor.',
      effects: [
        { tag: 'debuff', label: 'Bribing an enemy', detail: '−25% damage dealt for 8 seconds, with money raining on them and a censor bar over their face for the whole time.' },
        { tag: 'buff', label: 'Bribing a recruit', detail: 'Loyalty refilled to 120% of its maximum — 48 seconds on a 40-second contract.' },
        { tag: 'utility', label: 'It always finds somebody', detail: 'With nothing within 36px of the cursor it bribes the nearest valid target instead of failing, so the 1 money is never simply thrown away.' },
      ],
      upgrade: {
        basics:
          'Bribing a recruit also promotes him one level, up to level 3 — there is no experience to '
          + 'earn, only bribes — and each kind of recruit gets its own perk at each level, worn as gold '
          + 'chevrons over his head. At level 3 he also has a favour to sell on a small money bar above '
          + 'him: a Thug skips a reload for 1, an Enforcer flies a helicopter in to move a recruit for '
          + '1, a Sniper calls an air strike on your planted daggers for 1, and a Medic makes you '
          + 'invincible for 5 seconds for 2. A money bar above the F card also launders: 1 money sets a '
          + 'bag behind you, and if you take less than 50 damage in the next 3 seconds it pays back 2.',
        effects: [
          { tag: 'buff', label: 'One bribe, one level', detail: 'Each bribe on a recruit is +1 level, to a maximum of 3, on top of the loyalty refill. Three notes make a made man; a Bard is never promoted.', requiresUpgrade: 'f' },
          { tag: 'buff', label: 'Thug', detail: '1 More Gun: a round every 100ms in a 7° cone. 2 Active Reload: when the drum runs dry he lobs a grenade for 10 damage in 72px, landing 0.75s later. 3 Suppressing Fire: a 40-round drum, and anyone he hits takes 15% more damage from everything for 2 seconds.', requiresUpgrade: 'f' },
          { tag: 'buff', label: 'Enforcer', detail: '1 Pump Action: a shot every 0.6 seconds instead of 0.9. 2 Juggernaut: reach 330px instead of 230, and his own loyalty drains 25% slower. 3 Protector: pellets hit for 3, and his shield covers every recruit within 165px.', requiresUpgrade: 'f' },
          { tag: 'buff', label: 'Sniper', detail: '1 High Caliber: 18 damage plus 4 true damage. 2 Professional: a shot every 2.4 seconds instead of 3.5, and it pierces everybody on the line. 3 Bounty Hunter: 24 damage, with a 25% chance of a headshot for double.', requiresUpgrade: 'f' },
          { tag: 'buff', label: 'Medic', detail: '1 More Supplies: heals 3 a second and his shots deal 2. 2 Triage: recruits near him drain 30% slower, and his healing rises by up to +150% the lower your health is. 3 Savior: you move 20% faster while he is healing you.', requiresUpgrade: 'f' },
          { tag: 'resource', label: 'Favour — reload', detail: 'Level-3 Thug, 1 money, on the bar over his head while he is reloading: the 5-second reload ends at once with a full 40-round drum.', requiresUpgrade: 'f' },
          { tag: 'movement', label: 'Favour — helicopter', detail: 'Level-3 Enforcer, 1 money: click his bar, click a recruit, click a spot. A helicopter flies in at 520 px/s, hooks him and sets him down there; while he hangs from it he neither shoots nor loses loyalty. 4 seconds between flights.', requiresUpgrade: 'f' },
          { tag: 'area', label: 'Favour — air strike', detail: 'Level-3 Sniper, 1 money: a flare goes up and 5 seconds later a plane drops 10 bombs, 14 damage in 62px each. No planted dagger: the whole arena. 1: a 175px scatter around it. 2: down the line between them. 3 or more: inside the shape they fence off. 8 seconds between strikes.', requiresUpgrade: 'f' },
          { tag: 'shield', label: 'Favour — Savior', detail: 'Level-3 Medic, 2 money: nothing can damage you for 5 seconds, shown as a gold halo closing in as it runs out.', requiresUpgrade: 'f' },
          { tag: 'resource', label: 'Laundering', detail: '1 money on the bar above the F card sets a bag on the floor behind you. After 3 seconds it pays 2 back; take 50 damage or more in that time and the bag and the note in it are gone. One bag at a time.', requiresUpgrade: 'f' },
        ],
      },
      notes: [
        'The 25% damage cut is applied victim-side rather than to the bribed fighter, which in a duel is the same outcome and in a crowd means it only protects you.',
        'The air strike reads the daggers at the moment the plane arrives, not when the flare goes up — so there are 5 seconds to plant or move them after paying, and a recall in that time turns a tight triangle back into the whole arena.',
        'Laundering is +1 money every 3 seconds for anyone not being hit, which more than doubles the element\'s income while it lasts. It is the best reason in the kit to hide behind three recruits.',
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
        { tag: 'utility', label: 'The theft', detail: 'Whatever the enemy element\'s Q does, you do. Most of the roster is routed straight through their own ability; about 12 have bespoke crooked versions.' },
        { tag: 'cost', label: 'The channel', detail: '2 seconds of black fog before anything happens, which is the longest telegraph on any ultimate in this element\'s bracket.' },
        { tag: 'cost', label: 'No contract', detail: 'Gunpowder and Rubber have no version at all — 2 elements — and anything else the game cannot route prints 🚫 NO CONTRACT and is wasted.' },
      ],
      variants: {
        label: 'The crooked versions — what a stolen ultimate becomes',
        variants: [
          { emoji: '🕴️', name: 'Subterfuge (mirror)', description: 'Insider Trading — 3 money instantly, straight into the wallet, up to its cap.' },
          { emoji: '⚙️', name: 'Metal', description: '+50 shield HP, and nothing else at all.' },
          { emoji: '🌱', name: 'Growth', description: 'Two Thugs hired for free, as far as the three-recruit payroll has room. With it already full, every recruit\'s loyalty is refilled to 120% instead.' },
          { emoji: '👻', name: 'Soul', description: 'Your recruits are ignited: they burn through loyalty 2 seconds faster per second, and go off for 20 damage in a 90px burning area when they finally quit.' },
          { emoji: '🌿', name: 'Life', description: 'Linked — for 5 seconds, damage aimed at you is split across your recruits instead, at a cost of 0.15s of loyalty per point.' },
          { emoji: '🎵', name: 'Sound', description: 'A disco ball for 12 seconds, firing every 3 seconds for 10 damage.' },
          { emoji: '⚡', name: 'Electricity', description: 'Overcharged for 5 seconds: die inside the window and you come back at 25% health.' },
          { emoji: '🧪', name: 'Venom', description: 'Acid falls on the entire screen for 8 seconds at a quarter strength — 1.5 damage every half second, everywhere.' },
          { emoji: '🪨', name: 'Earth · Oil · Ice · Time · Light · Echo · Math', description: 'Routed straight into those kits — a golem, the train, Frozen Solid without the frost, Always Noon, a Supernova, a direct Eclipse and 42.' },
          { emoji: '🚫', name: 'Gunpowder · Rubber', description: 'No contract. The ultimate is spent and nothing happens.' },
        ],
      },
      upgrade: {
        basics:
          'For 8 seconds after a theft resolves, a money bar sits above the Q card, draining with the '
          + 'window. Clicking it — or pressing Q again — runs the stolen ultimate once more for 2 money '
          + 'out of the same wallet the reloads and recruits come from, with no second channel and no '
          + 'cooldown, and as often inside the 8 seconds as you can pay for. It re-runs the stolen '
          + 'element rather than rolling fresh, so a good theft is worth twice as much and a 🚫 NO '
          + 'CONTRACT is worth nothing twice.',
        effects: [
          { tag: 'utility', label: 'The window', detail: '8 seconds from the moment the theft resolves, shown as a draining money bar above the Q card. A recast does not reopen it.', requiresUpgrade: 'q' },
          { tag: 'resource', label: 'The recast', detail: '2 money, by clicking the bar or pressing Q again. No second channel and no cooldown — a full wallet of 4 is 2 recasts inside one window.', requiresUpgrade: 'q' },
          { tag: 'utility', label: 'Exactly the same effect', detail: 'It re-runs the stolen element, not a fresh roll — so a good theft is worth 2 of it and a 🚫 NO CONTRACT is worth nothing twice.', requiresUpgrade: 'q' },
        ],
      },
      notes: [
        'Two seconds of standing in black fog is a real commitment. A Subterfuge player casting Q has decided the next two seconds are survivable.',
        'The mastery requirement is ten *different* elements, tracked as a persistent set across matches rather than a counter, so a favourite matchup only ever counts once.',
        'On Retainer in a mirror match turns 2 money into 3, but only up to the wallet\'s cap — worth doing from an emptied wallet and a waste from a full one.',
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
        { tag: 'utility', label: 'Or on the victim', detail: 'A dagger that connects on the way back booms on the body it hit rather than at its launch point, and only 1 boom per blade either way.' },
      ],
      notes: [
        'Three planted daggers plus a recall is 54 damage from the blades and 30 more from the booms, with three knockbacks, from a key that has no cooldown.',
        'With Full Set running it is five blades and five booms: up to 90 from the steel and 50 from the noise.',
        'Because the ring lands where the blade *was*, planting daggers around somebody is a genuine trap rather than only a damage rotation.',
      ],
    },
  },

  mastery: {
    'big-pockets': {
      basics:
        'The wallet cap goes from 3 to 4 on the same 1-per-5-seconds income. A full wallet now buys '
        + 'two 2-money bars back to back, or a specialist and two bribes to promote him, and it is the '
        + 'only way to reach the 4 money a Hijacked tank costs. Because the clock stops at the cap, it '
        + 'is also 5 more seconds of income before the tick starts being thrown away.',
      effects: [
        { tag: 'resource', label: 'The cap', detail: '4 money instead of 3, on the same 1-per-5-seconds income.' },
        { tag: 'utility', label: 'Why it matters', detail: 'A full wallet now covers 2 of the 2-money purchases at once — a specialist and Luxury Rounds, or 2 retainer recasts — instead of 1 and change.' },
        { tag: 'utility', label: 'The tank', detail: 'A Hijack is capped by what is in the wallet, and the tank costs 4. Without the fourth note the best ride you could ever charge is the 3-money sports car.' },
        { tag: 'utility', label: 'Less waste', detail: 'Income past the cap is lost, so a bigger cap is also 5 more seconds of grace before the tick starts being thrown away.' },
      ],
      notes: [
        'It is a passive with no cast, no cooldown and no tell. It simply changes what a saved-up wallet can do.',
      ],
    },
    'hijack': {
      basics:
        'A bindable theft: tap the key and 1 money leaves a car beside you, toward the cursor. Hold it '
        + 'instead and every step up costs one more — a motorcycle for 2 after 0.45 seconds, a sports '
        + 'car for 3 after 0.95, a tank for 4 after 1.5 — and the wallet caps how far the hold can '
        + 'climb. Space beside the ride gets in and Space again gets out. W and S are the throttle, A '
        + 'and D steer, and it slides like a car. Ramming hurts more the faster you are going. While '
        + 'you drive, hits land on the ride instead of you, and when its health runs out it explodes '
        + 'for 25 in 115px without harming you; parked, it stops enemy shots while yours pass through. '
        + 'From the driver\'s seat you can Spray and nothing else. 15s cooldown from the theft.',
      cast: 'The bound key: tap for the car (1 money), hold 0.45s / 0.95s / 1.5s for the motorcycle (2), sports car (3) or tank (4), and release to steal it. Space within 66px gets in and out. WASD drives; in the tank, Click fires the gun. 15s cooldown.',
      effects: [
        { tag: 'resource', label: 'The price', detail: '1 money for a tap. Held, the ride steps up at 0.45s, 0.95s and 1.5s and costs 2, 3 and 4 — never more than the wallet holds. The charge is drawn over your head as 4 slots.' },
        { tag: 'summon', label: 'Car', detail: '1 money. 75 HP, 330 px/s, 1 seat for a recruit.' },
        { tag: 'summon', label: 'Motorcycle', detail: '2 money. 50 HP, 540 px/s, no seat — and while you ride it any hit has a 35% chance to simply miss.' },
        { tag: 'summon', label: 'Sports car', detail: '3 money. 150 HP, 470 px/s, the sharpest steering of the 4 and 2 seats.' },
        { tag: 'summon', label: 'Tank', detail: '4 money. 250 HP, 2 seats and only 105 px/s — but Click fires its gun: 35 damage in a 96px blast at 760 px/s, once every 2.5 seconds. It pivots on the spot.' },
        { tag: 'damage', label: 'Ramming', detail: 'Above 130 px/s: 6 damage plus up to 19 more with speed — about 17 from a car flat out, 21 from the sports car, 23 from the motorcycle. The tank is a flat 22. A 520 px/s shove with each hit, once every 0.75s per target, and the ride loses 30% of its speed.' },
        { tag: 'shield', label: 'Behind the wheel', detail: 'Every hit aimed at you lands on the ride\'s health instead. At 0 it explodes for 25 damage in 115px, which never touches you, and you are left standing.' },
        { tag: 'utility', label: 'Parked', detail: 'An empty ride is a wall: enemy projectiles inside its footprint are stopped and taken off its health, while your own shots pass through. Each side has 1 ride, and stealing another replaces it.' },
        { tag: 'cost', label: 'One hand on the wheel', detail: 'Driving leaves you 1 ability: E still fires the Spray, and its Luxury Rounds bar still works. Daggers, R, F, Q and every other money bar are out of reach until you get out.' },
        { tag: 'utility', label: 'Passengers', detail: 'A recruit hired within 96px of a ride with a free seat climbs in and shoots as you drive. A helicopter that sets one down beside it does the same.' },
      ],
      notes: [
        'The ride is left beside you, not under you. Stealing it and getting into it are two separate presses, and the 15 seconds start at the first.',
        'A motorcycle parked is 50 HP of cover and nothing more; the 35% miss chance only exists while somebody is riding it.',
        'A sports car with two level-3 recruits in the back seats is a moving gun line, which is the one thing the stationary payroll cannot otherwise be.',
        'The Hijack card\'s bar shows the cooldown on foot, the charge while the key is held, and the tank\'s gun reloading while you drive.',
      ],
    },
  },
};

export default subterfuge;
