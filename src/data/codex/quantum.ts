import { ElementCodex } from '../AbilityCodex';

/**
 * Quantum — the element that is two other elements, and the third thing they can become.
 *
 * Verified against `src/elements/quantum.ts`, `kits/QuantumKit.ts` (the bond, the collapse and
 * instability) and `kits/QuantumCoreKit.ts` (the five abilities). Quantum has no perks and no
 * mastery; it sells exactly one upgrade — Third State, filed under the Click slot — and that
 * upgrade is what makes the five abilities below reachable at all.
 */
const quantum: ElementCodex = {
  identity:
    'Quantum is the only element with no subject matter. Before the fight you bond two other '
    + 'elements together in the Entanglement Lab; in the fight, your dodge collapses the bond onto '
    + 'the other half — the same body, the same health, the same status effects, a completely '
    + 'different five keys. Everything the half you left behind put into the world keeps running '
    + 'while you are the other one. The price is Quantum Instability: every hit you take makes you '
    + 'more fragile, and collapsing while unstable tears at you. Buy Third State and the coin '
    + 'becomes a three-sided one, whose third face is a kit that does nothing but split things in '
    + 'half — including itself.',

  passives: [
    {
      emoji: '⚛️',
      name: 'Bonded',
      magic:
        'You are not borrowing another element\'s abilities; you are being that element. A collapse '
        + 'rewrites the whole player side — the active element, the shop upgrades in play, the '
        + 'mastery binds, the equipped skin and the ability tray all follow whichever half you are '
        + 'wearing. And because both halves have always shared one body, nothing needs merging: '
        + 'health, shields, cooldown timestamps and every status effect are common by construction.',
      effects: [
        { tag: 'utility', label: 'Two kits', detail: 'The pair is chosen before the fight and researched one bond at a time in the Entanglement Lab. Each half brings its own 5 abilities, its own upgrades, its own mastery and its own skin.' },
        { tag: 'utility', label: 'One body', detail: 'Health, shields, status effects and cooldown timers are shared. A swap changes what you can do, never what has been done to you.' },
        { tag: 'summon', label: 'The dormant half keeps running', detail: 'Everything the half you are not wearing left in the world is still ticked every frame — a fire pool keeps burning, a turret keeps firing, a summon keeps hunting, while you are off being the other element.' },
        { tag: 'utility', label: 'Cooldowns carry', detail: 'Timestamps are per ability id on one body, so a cooldown you started as one half is still running when you come back to it.' },
      ],
      notes: [
        'The element is granted for finishing the campaign — it is the sealed 43rd element behind the Amalgam.',
        'An enemy Quantum rotates on a rhythm rather than in reaction to you: about every 16 seconds on the easiest difficulty down to every 5.5 on Nightmare, plus one out-of-rhythm swap when it drops below 45% health.',
        'A bot never owns Third State, because it has no save to buy it from. An online opponent can, and their third stop is adopted the first time you see them wearing it.',
      ],
    },
    {
      emoji: '🔄',
      name: 'Collapse',
      magic:
        'There is no swap key. Your dodge is the swap — the dash still happens exactly as it would '
        + 'for anybody else, and the body arrives as the other element. A ring snaps outward while '
        + 'a counter-ring closes in, three orbit ticks turning with them, and the new element\'s '
        + 'name is printed over your head.',
      effects: [
        { tag: 'movement', label: 'On dodge', detail: 'Dodging advances the cycle by one and re-keys you instantly. The dash is unaffected.' },
        { tag: 'utility', label: 'The cycle', detail: 'Two stops normally — first element, second element — and three with Third State: first, second, Quantum, then back to first.' },
        { tag: 'utility', label: 'It is instant', detail: 'The 380ms collapse ring is decoration. The re-key happens on the frame you dodge.' },
        { tag: 'utility', label: 'Nothing is left behind', detail: 'Anything the half you just left put in the world stays there and keeps working — the collapse changes your kit, not the arena.' },
      ],
      notes: [
        'Because the swap rides the dodge, a Quantum on cooldown for its dodge cannot change shape at all.',
        'A Quantum with no bond simply dodges like anybody else.',
      ],
    },
    {
      emoji: '💥',
      name: 'Quantum Instability',
      magic:
        'Carrying two kits is paid for one hit at a time. Every hit that actually lands on you '
        + 'makes the body holding both halves a little less able to hold them, and that shows up as '
        + 'plain vulnerability — nothing about it cares how large the hit was, only that there was '
        + 'one.',
      effects: [
        { tag: 'debuff', label: 'Building it', detail: '1 point per hit taken, whatever the hit was worth, to a cap of 50.' },
        { tag: 'debuff', label: 'What it does', detail: 'One point is 1% more damage taken, one for one. At the 50 cap everything hits you half again as hard.' },
        { tag: 'utility', label: 'Shedding it', detail: '1 point every 2 seconds, so a full 50 takes 100 seconds to clear on its own.' },
        { tag: 'utility', label: 'What does not count', detail: 'A hit fully eaten by a shield charge, a damage absorber or flat reduction adds nothing — the counter only sees damage that got through.' },
      ],
      notes: [
        'An enemy Quantum pays exactly what you do; the bot is subject to the same counter and will refuse a swap it cannot afford.',
        'The status box hides itself entirely at zero and turns red at 40, which is the threshold where a collapse starts costing health.',
      ],
    },
    {
      emoji: '⚠️',
      name: 'Torn Collapse',
      magic:
        'A body that is already coming apart does not enjoy being asked to be something else. Above '
        + 'a certain amount of instability the collapse still works — it just takes a piece out of '
        + 'you on the way through, which is what stops the bond from being a free reset every time '
        + 'a matchup goes badly.',
      effects: [
        { tag: 'cost', label: 'The tear', detail: '25 damage to yourself for collapsing at 40 instability or above. The swap itself always succeeds.' },
        { tag: 'utility', label: 'Self-inflicted', detail: 'It is booked as self-damage, so it lands in online matches too rather than being filtered out by the damage relay.' },
        { tag: 'utility', label: 'It does not scale', detail: 'Flat 25 at 40 instability and flat 25 at the 50 cap — there is no worse version of it to be afraid of.' },
      ],
      notes: [
        'Forty instability is forty hits taken inside the decay window. Rotating on a rhythm keeps you well clear of it; rotating in a panic is what costs.',
        'The 25 goes through your own instability multiplier like anything else, so a torn collapse at the cap really costs closer to 38.',
      ],
    },
  ],

  abilities: {
    'quantum-splicers': {
      magic:
        'You come apart into five blades and they never come back. While the third state is worn '
        + 'the ring is simply there, turning slowly around you at arm\'s length and cutting anything '
        + 'that walks into it. Holding the button drives the whole ring out to more than twice the '
        + 'radius and three times the speed — it covers far more ground and passes far more often, '
        + 'but the cut is the same cut. This is the only Click in the game that is a permanent '
        + 'field rather than an attack.',
      cast: 'Click, held. No aim — the ring is centred on you. Each cast marks the ring wide for 1.15s against a 900ms cooldown, so holding keeps it out there and a tap lets it fall back in.',
      effects: [
        { tag: 'damage', label: 'The cut', detail: '8 damage per blade, at most once per blade per target every 500ms. Five blades sweeping means about 11 damage a second at rest and roughly 34 with the ring driven wide.' },
        { tag: 'area', label: 'At rest', detail: '5 blades on a 48px orbit, turning at 1.7 rad/s — a revolution every 3.7 seconds.' },
        { tag: 'area', label: 'Driven wide', detail: '112px orbit at 5.4 rad/s — a revolution every 1.16 seconds. The ring eases out and back rather than snapping, so the button is readable.' },
        { tag: 'utility', label: 'The reach', detail: 'Each blade is 30px long and cuts from its tip, which sits about 9px past the orbit — so a wide ring reaches roughly 130px from your chest.' },
        { tag: 'summon', label: 'Not a summon', detail: 'The blades are your body while the form is worn. Leaving the third state takes them with it, and nothing that purges summons can touch them.' },
      ],
      notes: [
        'The damage per cut never changes. The button buys coverage and frequency, never power.',
        'This Click is specifically exempt from Ability Split, so holding the mouse cannot eat a halved cooldown you were saving.',
        'A wide ring is also a wall of your own blades to stand behind: anything that walks into you is being cut on the way in.',
      ],
      upgrade: {
        magic:
          'Third State is Quantum\'s only upgrade, and it is not really an upgrade to this ability — '
          + 'it is what creates it. Your bond stops being a coin: the cycle grows a third stop, and '
          + 'that stop is Quantum itself, wearing a kit of its own for the first time. Every one of '
          + 'the five abilities splits something.',
        effects: [
          { tag: 'utility', label: 'A third stop', detail: 'The dodge cycles first element → second element → Quantum → first element. Without it, this whole ability list is unreachable.' },
          { tag: 'damage', label: 'Atom Splicers', detail: 'Click: five permanent blades on a 48px orbit, 8 a cut, driven out to 112px and 5.4 rad/s while held.' },
          { tag: 'buff', label: 'Ability Split', detail: 'E: the next ability you cast has its cooldown halved — and the charge survives a collapse.' },
          { tag: 'control', label: 'Arena Split', detail: 'R: a seam down the middle of the room for 15s that the enemy cannot cross and no shot from either side survives.' },
          { tag: 'buff', label: 'Effect Split', detail: 'F: every effect on you halved in strength and stretched to 2.5× its remaining duration.' },
          { tag: 'summon', label: 'Quantum Parasite', detail: 'Q: a ten-bead worm that bites for 35 and becomes two worms every time anybody cuts it.' },
          { tag: 'cost', label: 'The price', detail: '2000 shards, and it is filed under the Click slot — the shop\'s other four Quantum plates read COMING SOON because there is nothing else to sell.' },
        ],
      },
    },

    'quantum-ability-split': {
      magic:
        'You take the next thing you are going to do and cut its recovery in half before you have '
        + 'even done it. The charge does not sit on this kit — it is banked on your own body, which '
        + 'is why it is still there after you have collapsed into something else entirely. Arm it '
        + 'as Quantum, spend it on the other half of your bond.',
      cast: 'E. No aim, no channel. The charge waits until you cast something. 11s cooldown.',
      effects: [
        { tag: 'buff', label: 'The halving', detail: 'The next ability you cast runs at ×0.5 of its own cooldown — a 30-second ultimate comes back in 15.' },
        { tag: 'utility', label: 'It survives a collapse', detail: 'The charge is held on the fighter, not the kit, so it crosses a bond swap intact.' },
        { tag: 'utility', label: 'Spent once', detail: 'Consumed by the very next stamped cast, whatever that is, and announced with "⚛️ Halved!" as it goes.' },
        { tag: 'utility', label: 'The exemption', detail: 'Atom Splicers cannot spend it. Holding the mouse button while the charge is up is safe.' },
      ],
      notes: [
        'It cannot eat its own cooldown: E is already stamped by the time the charge is set.',
        'The whole value of this is what you point it at. Halving a 900ms Click is nothing; halving the other half of your bond\'s ultimate is 15 or 20 seconds of a fight.',
        'Nothing but casting spends it — it has no timer of its own and will sit on you indefinitely.',
      ],
    },

    'quantum-arena-split': {
      magic:
        'A standing wave comes up the middle of the room and stays there for fifteen seconds. It is '
        + 'not a wall exactly — you walk through it as though it were not there — but the enemy '
        + 'cannot, and neither can anything either of you shoots. Every projectile that touches the '
        + 'seam is deleted in a flash of white, including your own.',
      cast: 'R. No aim — the seam is always the exact middle of the arena, full height. 24s cooldown, 15s of wall.',
      effects: [
        { tag: 'control', label: 'The seam', detail: '15 seconds, standing at the arena\'s centre line, 10px either side of it.' },
        { tag: 'control', label: 'Pinned', detail: 'Everyone you are fighting is held on whichever half they were standing in at the cast, with their inward velocity zeroed at the line.' },
        { tag: 'shield', label: 'Nothing crosses', detail: 'Any projectile within 20px of the seam is destroyed outright. The band is wider than the wall on purpose, so the fastest shots in the game cannot tunnel through between two frames.' },
        { tag: 'movement', label: 'You are exempt', detail: 'Only the caster\'s enemies are held. You walk through freely — but your shots do not.' },
        { tag: 'utility', label: 'One a side', detail: 'Casting it again replaces your own seam rather than raising a second one.' },
      ],
      notes: [
        'Half the room for fifteen seconds is the strongest zoning in the element, and it is aimed at nothing: the line is always the centre.',
        'Your own projectiles dying on it means the seam is a commitment — crossing to their side to fight means fighting without anything you throw from the far half.',
        'A victim standing exactly on the line is pushed to the far side from you, so it can never trap somebody in your lap.',
      ],
    },

    'quantum-effect-split': {
      magic:
        'Everything currently riding on you — every buff, every curse, every burn, every slow — is '
        + 'cut along its own length. Half the strength, two and a half times the clock. It does not '
        + 'discriminate, and it reaches whatever the other half of your bond left on you before you '
        + 'collapsed, which is the only way anything in the game can edit an effect that way.',
      cast: 'F. No aim. Everything is rewritten on the frame you press it. 15s cooldown.',
      effects: [
        { tag: 'buff', label: 'The stretch', detail: 'Every timed effect on you has its remaining duration multiplied by 2.5 — buffs and debuffs alike, from any element.' },
        { tag: 'debuff', label: 'The halving', detail: 'While the split window runs, every damage multiplier on you is dragged halfway back to neutral: a ×1.5 vulnerability becomes ×1.25 and a ×0.5 armour becomes ×0.75.' },
        { tag: 'movement', label: 'Speed too', detail: 'The same halving is applied to your net move-speed multiplier, so a big slow and a big sprint are both cut in half.' },
        { tag: 'utility', label: 'The window', detail: 'It lasts as long as the longest thing it stretched, with a floor of 4 seconds when there was nothing timed to work on.' },
        { tag: 'utility', label: 'On a clean body', detail: 'Pressing it with nothing on you is weak rather than wasted: plenty of multipliers are rewritten every frame by their own kit and carry no expiry, and those are halved for the 4-second floor.' },
      ],
      notes: [
        'This is a two-edged ability by design. A body carrying a big vulnerability wants it; a body carrying a big buff should not press it.',
        'The right time is nearly always immediately after being hit with something long and nasty — a heavy debuff becomes a mild one you carry for two and a half times as long.',
        'Both halves work through the same two generic chokepoints Ruin\'s spikes use, so it covers every element in the game without any kit cooperating.',
      ],
    },

    'quantum-parasite': {
      magic:
        'Something tears out of the floor: ten beads of it, a mouth at the front and a tail at the '
        + 'back, and it goes bouncing around the room biting. What makes it a Quantum ability is '
        + 'what happens when somebody shoots it. The eight beads in the middle can be destroyed by '
        + 'anybody\'s shots — and a destroyed bead does not kill the parasite, it makes two of them, '
        + 'with the back half turning around and coming back at whoever cut it. The mouth and the '
        + 'tail cannot be killed at all.',
      cast: 'Q, thrown along the aim. Ultimate, 26s cooldown. It lives 15 seconds.',
      effects: [
        { tag: 'summon', label: 'The parasite', detail: '10 beads, 18px apart, 11px across, running at 215 px/s and reflecting off every arena wall.' },
        { tag: 'damage', label: 'The bite', detail: '35 damage from the mouth only, at most once per victim every 800ms.' },
        { tag: 'utility', label: 'Cuttable', detail: 'The 8 middle beads have 35 HP each and take damage from any projectile in the arena, whoever fired it. The mouth and the tail swallow a shot whole and take nothing.' },
        { tag: 'summon', label: 'Every cut is a multiplication', detail: 'A destroyed bead is spent and the body comes apart there: the front half keeps going and the back half is reversed, its old tail becoming a new mouth. Both halves inherit the original 15-second clock.' },
        { tag: 'summon', label: 'The ceiling', detail: 'Eight cuttable beads means at most 9 parasites out of one press — each with its own 35-damage bite on its own 800ms gate.' },
        { tag: 'utility', label: 'They shove', detail: 'Two mouths that meet push each other apart and turn away rather than passing through.' },
      ],
      notes: [
        'You can farm your own worm. Anything you throw at your own parasite is a cut, and a cut is a reward — this is the only ultimate in the game the caster is encouraged to shoot.',
        'It is also the reason shooting one is a mistake for the enemy, and there is no way for them to tell the difference in the moment.',
        'A cut next to the mouth leaves a single bead. That bead is the mouth, which cannot be killed, so it carries on as a one-bead parasite until its timer runs out.',
        'The parasites are summons and can be purged — Ruin\'s Spikes of Ruin will clear them. The blades and the seam are not summons and survive it.',
      ],
    },
  },
};

export default quantum;
