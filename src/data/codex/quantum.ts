import { ElementCodex } from '../AbilityCodex';

/**
 * Quantum — the element built out of other elements' abilities.
 *
 * Verified against `src/elements/quantum.ts`, `kits/QuantumKit.ts` (key routing, the npc's
 * rotation and instability), `data/QuantumLoadout.ts` (the slot table) and
 * `kits/QuantumCoreKit.ts` (the five abilities below). Quantum has no perks. It sells exactly
 * one upgrade — Third State, filed under the Click slot — which makes its own five abilities
 * slottable and lets each slot's upgrade be switched on; its mastery is three permissions on the
 * customization page rather than a passive and a bindable of its own.
 */
const quantum: ElementCodex = {
  identity:
    'Quantum is the only element with no subject matter. Each of its five keys carries another '
    + 'element\'s ability for that key — Fire\'s Click, Ice\'s E, Gravity\'s R — chosen on its '
    + 'customization page from whatever you have entangled in the Entanglement Lab. Pressing a key '
    + 'makes you that key\'s element for the cast: the same body, the same health, the same status '
    + 'effects, a different kit under your hands. Everything the elements you are not currently '
    + 'wearing put into the world keeps running. The price is Quantum Instability: every hit you '
    + 'take makes you more fragile. Buy Third State and Quantum\'s own kit — one that does nothing '
    + 'but split things in half, including itself — joins the list of things you can slot.',

  passives: [
    {
      emoji: '⚛️',
      name: 'Entangled',
      basics:
        'Quantum is up to five elements on one body. Each key — Click, E, R, F, Q — carries one '
        + 'element\'s ability for that same key, chosen on the customization page; an element has to be '
        + 'entangled in the Entanglement Lab first, one at a time, and Fire and Water come entangled. '
        + 'A slot carries the ability and nothing else — no upgrade, no perk, no mastery — until Third '
        + 'State lets its upgrade be switched on and Quantum Mastery lends it a passive, a sixth key and an '
        + 'alternate Q. Health, shields, status effects and cooldown timers are shared, so a shift '
        + 'changes what you can do and never what has been done to you. The elements you are not wearing '
        + 'keep running: a fire pool keeps burning, a turret keeps firing, a summon keeps hunting while '
        + 'you are off being another one.',
      effects: [
        { tag: 'utility', label: 'Five keys, five elements', detail: 'Each key carries one entangled element\'s ability for that same key. The fight opens as Click\'s element. The body never changes: Quantum always wears its own character, whatever is live.' },
        { tag: 'utility', label: 'Abilities only', detail: 'A slot brings the base ability alone: no upgrade, no perk, no mastery. Third State switches upgrades on per slot; Quantum Mastery is the only mastery a loadout carries.' },
        { tag: 'utility', label: 'One body', detail: 'Health, shields, status effects and cooldown timers are shared. A shift changes what you can do, never what has been done to you.' },
        { tag: 'summon', label: 'The dormant elements keep running', detail: 'Everything an element you are not wearing left in the world is still ticked every frame — a fire pool keeps burning, a turret keeps firing, a summon keeps hunting.' },
        { tag: 'utility', label: 'Cooldowns carry', detail: 'Timestamps are per ability id on one body, so a cooldown you started on one key is still running when you come back to it.' },
      ],
      notes: [
        'The element is granted for finishing the campaign — it is the sealed 43rd element behind the Amalgam.',
        'An enemy Quantum has no keys to route: it carries three random elements and rotates through them on a rhythm, about every 16 seconds on the easiest difficulty down to every 5.5 on Nightmare, plus one out-of-rhythm swap when it drops below 45% health.',
        'Anything that needs you to *stay* one element — a form, an aura, a held charge — ends the moment you press another element\'s key.',
      ],
    },
    {
      emoji: '🔄',
      name: 'Shift',
      basics:
        'Pressing a key is the swap. A fresh E, R, F or Q makes you the element that owns that key '
        + 'before the press reaches it, so the ability casts exactly as it would on its own element; '
        + 'holding the mouse with no key pressed makes you Click\'s element. The re-key is instant and '
        + 'the 380ms ring is decoration. Dodging is only a dodge. A shift costs nothing and leaves your '
        + 'body as it is — Quantum always looks like Quantum; instability is the whole price.',
      effects: [
        { tag: 'utility', label: 'On key press', detail: 'A fresh E/R/F/Q makes you that key\'s element before the press reaches it. Holding the mouse with no key pressed makes you Click\'s element.' },
        { tag: 'utility', label: 'It is instant', detail: 'The 380ms ring is decoration. The re-key happens on the frame you press.' },
        { tag: 'utility', label: 'Nothing is left behind', detail: 'Anything the element you just left put in the world stays there and keeps working — the shift changes your kit, not the arena.' },
        { tag: 'utility', label: 'Free', detail: 'A shift never costs health, whatever your instability — yours or an enemy Quantum\'s.' },
      ],
      notes: [
        'Two keys in one frame: the later one wins.',
        'Abilities stay on their own key — an element\'s E can only ever sit on E.',
      ],
    },
    {
      emoji: '💥',
      name: 'Quantum Instability',
      basics:
        '1 point per hit taken, whatever the hit was worth, capped at 50 — and each point is 1% more '
        + 'damage taken, so at the cap everything hits you half again as hard. It sheds 1 point every 2 '
        + 'seconds, so a full 50 takes 100 seconds to clear on its own. A hit fully eaten by a shield '
        + 'charge, a damage absorber or flat reduction adds nothing: the counter only sees damage that '
        + 'got through.',
      effects: [
        { tag: 'debuff', label: 'Building it', detail: '1 point per hit taken, whatever the hit was worth, to a cap of 50.' },
        { tag: 'debuff', label: 'What it does', detail: 'One point is 1% more damage taken, one for one. At the 50 cap everything hits you half again as hard.' },
        { tag: 'utility', label: 'Shedding it', detail: '1 point every 2 seconds, so a full 50 takes 100 seconds to clear on its own.' },
        { tag: 'utility', label: 'What does not count', detail: 'A hit fully eaten by a shield charge, a damage absorber or flat reduction adds nothing — the counter only sees damage that got through.' },
      ],
      notes: [
        'An enemy Quantum pays exactly what you do: the same counter, the same decay, nothing more.',
        'The status box hides itself entirely at zero and turns red at 40 as a warning.',
      ],
    },
  ],

  abilities: {
    'quantum-splicers': {
      basics:
        'Five permanent blades on a 48px orbit turning at 1.7 rad/s — a revolution every 3.7 seconds — '
        + 'cutting for 8 damage, at most once per blade per target every 500ms, which is about 11 damage '
        + 'a second at rest. Holding the click drives the ring out to 112px at 5.4 rad/s, a revolution '
        + 'every 1.16 seconds and roughly 34 damage a second, easing out and back rather than snapping so '
        + 'the button is readable. Each blade is 30px long and cuts from its tip, about 9px past the '
        + 'orbit, so a wide ring reaches roughly 130px from your chest. The blades are your body rather '
        + 'than a summon: leaving the third state takes them with it, and nothing that purges summons can '
        + 'touch them. Each cast marks the ring wide for 1.15s against a 900ms cooldown.',
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
        basics:
          'Makes Quantum itself an element you can slot — without it this entire ability list is '
          + 'unreachable. Quantum\'s five keys are Atom Splicers on '
          + 'Click (five permanent blades, 8 a cut, driven out to 112px and 5.4 rad/s while held), Ability '
          + 'Split on E (the next ability you cast has its cooldown halved, and the charge survives a '
          + 'shift), Arena Split on R (a seam down the middle of the room for 15 seconds that the enemy '
          + 'cannot cross and no shot from either side survives), Effect Split on F (every effect on you '
          + 'halved in strength and stretched to 2.5× its remaining duration), and Quantum Parasite on Q (a '
          + 'ten-bead worm that bites for 35 and becomes two worms every time anybody cuts it). It costs '
          + '2000 shards and is filed under the Click slot, which is why the shop\'s other four Quantum '
          + 'plates read COMING SOON.',
        effects: [
          { tag: 'utility', label: 'Slottable', detail: 'Quantum\'s own kit joins the roster on the customization page, key for key. Without it, this whole ability list is unreachable.' },
          { tag: 'damage', label: 'Atom Splicers', detail: 'Click: five permanent blades on a 48px orbit, 8 a cut, driven out to 112px and 5.4 rad/s while held.' },
          { tag: 'buff', label: 'Ability Split', detail: 'E: the next ability you cast has its cooldown halved — and the charge survives a shift.' },
          { tag: 'control', label: 'Arena Split', detail: 'R: a seam down the middle of the room for 15s that the enemy cannot cross and no shot from either side survives.' },
          { tag: 'buff', label: 'Effect Split', detail: 'F: every effect on you halved in strength and stretched to 2.5× its remaining duration.' },
          { tag: 'summon', label: 'Quantum Parasite', detail: 'Q: a ten-bead worm that bites for 35 and becomes two worms every time anybody cuts it.' },
          { tag: 'cost', label: 'The price', detail: '2000 shards, and it is filed under the Click slot — the shop\'s other four Quantum plates read COMING SOON because there is nothing else to sell.' },
        ],
      },
    },

    'quantum-ability-split': {
      basics:
        'The next ability you cast runs at ×0.5 of its own cooldown — a 30-second ultimate comes back '
        + 'in 15. The charge is held on the fighter rather than the kit, so it crosses a shift '
        + 'intact, and it is spent by the very next stamped cast whatever that is, announced with "⚛️ '
        + 'Halved!" as it goes. Atom Splicers cannot spend it, so holding the mouse button while the '
        + 'charge is up is safe. 11s cooldown.',
      cast: 'E. No aim, no channel. The charge waits until you cast something. 11s cooldown.',
      effects: [
        { tag: 'buff', label: 'The halving', detail: 'The next ability you cast runs at ×0.5 of its own cooldown — a 30-second ultimate comes back in 15.' },
        { tag: 'utility', label: 'It survives a shift', detail: 'The charge is held on the fighter, not the kit, so it crosses a shift intact.' },
        { tag: 'utility', label: 'Spent once', detail: 'Consumed by the very next stamped cast, whatever that is, and announced with "⚛️ Halved!" as it goes.' },
        { tag: 'utility', label: 'The exemption', detail: 'Atom Splicers cannot spend it. Holding the mouse button while the charge is up is safe.' },
      ],
      notes: [
        'It cannot eat its own cooldown: E is already stamped by the time the charge is set.',
        'The whole value of this is what you point it at. Halving a 900ms Click is nothing; halving another element\'s ultimate is 15 or 20 seconds of a fight.',
        'Nothing but casting spends it — it has no timer of its own and will sit on you indefinitely.',
      ],
    },

    'quantum-arena-split': {
      basics:
        'Raises a seam down the exact middle of the arena, full height, 10px either side of the centre '
        + 'line, for 15 seconds. Everyone you are fighting is held on whichever half they were standing '
        + 'in at the cast, with their inward velocity zeroed at the line, and any projectile within 20px '
        + 'of the seam is destroyed outright — the band is wider than the wall on purpose, so the fastest '
        + 'shots in the game cannot tunnel through between two frames. You walk through freely; your '
        + 'shots do not. Casting again replaces your own seam rather than raising a second. 24s cooldown.',
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
      basics:
        'Rewrites everything on you on the frame you press it. Every timed effect has its remaining '
        + 'duration multiplied by 2.5, buffs and debuffs alike from any element, and while the window '
        + 'runs every damage multiplier on you is dragged halfway back to neutral — a ×1.5 vulnerability '
        + 'becomes ×1.25 and a ×0.5 armour becomes ×0.75 — with the same halving applied to your net '
        + 'move-speed multiplier, so a big slow and a big sprint are both cut in half. The window lasts '
        + 'as long as the longest thing it stretched, with a floor of 4 seconds when there was nothing '
        + 'timed to work on. Pressing it on a clean body is weak rather than wasted, since plenty of '
        + 'multipliers are rewritten every frame by their own kit and carry no expiry, and those are '
        + 'halved for the floor. 15s cooldown.',
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
      basics:
        'Throws a worm along the aim: 10 beads 18px apart, 11px across, running at 215 px/s and '
        + 'reflecting off every arena wall for 15 seconds. The mouth bites for 35, at most once per '
        + 'victim every 800ms. The 8 middle beads have 35 HP each and take damage from any projectile in '
        + 'the arena whoever fired it, while the mouth and the tail swallow a shot whole and take nothing '
        + '— and every cut multiplies it: the destroyed bead is spent and the body comes apart there, the '
        + 'front half carrying on and the back half reversing with its old tail becoming a new mouth, '
        + 'both inheriting the original 15-second clock. Eight cuttable beads means at most 9 parasites '
        + 'from one press, each with its own 35-damage bite on its own gate. Two mouths that meet shove '
        + 'each other apart and turn away rather than passing through. 26s cooldown.',
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
  mastery: {
    'borrowed-passive': {
      basics:
        'Always on, no key. One mastery passive from any entangled element whose mastery you have '
        + 'completed — picked on the customization page — rides along on every loadout, exactly as '
        + 'it would on its own element: Fire\'s Burning Body, Air\'s dodge, Earth\'s Unbreakable.',
      effects: [
        { tag: 'buff', label: 'One passive', detail: 'Exactly one element\'s mastery passive, chosen from entangled elements whose mastery is complete. It is always on, whichever element you are wearing.' },
        { tag: 'utility', label: 'Not that element\'s bindable', detail: 'Only the passive half comes along. The element\'s mastery ability is a separate pick — the sixth key.' },
      ],
      notes: [
        'The element lending the passive does not need to sit on any of the five keys.',
      ],
    },
    'sixth-slot': {
      basics:
        'A sixth key, G. It carries any mastery ability from any entangled element whose mastery you '
        + 'have completed. Pressing G makes you that element for the cast, the way the five slots do, and '
        + 'the ability keeps its own cooldown and its own rules.',
      cast: 'Press G. The arena hands the lending kit the G key in place of the key its ability is normally bound over (F where allowed, else R, else Q).',
      effects: [
        { tag: 'utility', label: 'Any mastery ability', detail: 'Every bindable enhancement of every entangled, mastered element is on offer — one at a time.' },
        { tag: 'utility', label: 'Its own key', detail: 'The five slots keep their base abilities. If the lending element also sits on the key the ability binds over, that key still casts the base ability and G casts the mastery one.' },
        { tag: 'buff', label: 'Mastered while live', detail: 'The lending element counts as mastered while it is the element you reached through G, so its passive is on for that stretch.' },
      ],
    },
    'alternate-collapse': {
      basics:
        'Your Q slot can be switched to its element\'s alternate ultimate, when that element has one '
        + 'unlocked. A toggle on the customization page, read each fight.',
      effects: [
        { tag: 'utility', label: 'Alternate Q', detail: 'The Q slot casts the element\'s alternate ultimate in place of its base one. Needs the alternate unlocked on that element.' },
      ],
    },
  },
};

export default quantum;
