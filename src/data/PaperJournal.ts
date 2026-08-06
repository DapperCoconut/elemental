import * as PlayerData from './PlayerData';

/**
 * Paper's passive: the Journal.
 *
 * Paper is the only element in the game whose passive lives outside the match. Every fight you
 * take as Paper is written up afterwards — a win teaches you how to press that element, a loss
 * teaches you how to survive it — and the notes stay in the save forever. Six entries per
 * element: three earned by beating it, three earned by being beaten by it.
 *
 * The whole system is deliberately built out of five effects and nothing else:
 *
 *   resist    take less damage from that element
 *   pressure  deal more damage to that element
 *   shrug     debuffs that element applies to you expire sooner
 *   footwork  move faster in that matchup
 *   guard     start the fight with shield
 *
 * Two reasons for a fixed vocabulary rather than 250 bespoke mechanics. The obvious one is that
 * bespoke mechanics for forty-odd elements is forty-odd new chokepoints in ArenaScene. The less
 * obvious one is balance: every entry is worth exactly one step of exactly one effect, so a
 * completed journal is worth the same against Fire as it is against Conquest no matter how the
 * archetypes shuffle. What *is* bespoke is the shape — which six of the five effects an element
 * teaches, and in what order — and that is chosen to answer how that element actually kills you.
 * Fire teaches you to shrug off burns first because burns are what Fire does; Metal teaches you
 * to eat the first hit because Metal opens with one.
 *
 * Adding a new element: add one row to `JOURNAL_ELEMENTS`. Nothing else in this file, and
 * nothing at all in PaperKit — it reads whatever is here. `MISSING_ELEMENTS` at the bottom is
 * the check that keeps this honest.
 */

// ── The five effects ─────────────────────────────────────────────────────────

export type JournalEffect = 'resist' | 'pressure' | 'shrug' | 'footwork' | 'guard';

/**
 * What one entry of each effect is worth. Every entry is worth exactly one step, so tuning the
 * whole passive — all 252 entries of it — is editing this one object.
 *
 * The budget: six entries against one element comes out at roughly a 15–20% swing. A defensive
 * archetype lands ~10% resist and 40% shorter debuffs; an offensive one ~18% extra damage. The
 * matchup tilts, and you still have to play it.
 */
export const JOURNAL_STEP: Record<JournalEffect, number> = {
  /** Fraction of incoming damage from that element removed. */
  resist: 0.05,
  /** Fraction added to damage you deal to that element. */
  pressure: 0.06,
  /** Fraction cut off the remaining duration of debuffs it applies to you. */
  shrug: 0.2,
  /** Fraction added to your movement speed in that matchup. */
  footwork: 0.05,
  /** Flat shield HP granted once, at the start of the fight. */
  guard: 25,
};

/**
 * Ceiling on the shrug fraction. Nothing in the table can reach it (three shrugs is 60%), but
 * the multiplier this becomes is applied to live timers, and a value at or past 1 would make
 * every debuff in the game expire the instant it landed.
 */
const SHRUG_CAP = 0.85;

export interface JournalBonuses {
  resist: number;
  pressure: number;
  shrug: number;
  footwork: number;
  guard: number;
  /** How many of the six entries are unlocked — what the HUD and the info panel show. */
  unlocked: number;
}

export const NO_JOURNAL_BONUSES: JournalBonuses = {
  resist: 0, pressure: 0, shrug: 0, footwork: 0, guard: 0, unlocked: 0,
};

// ── Archetypes ───────────────────────────────────────────────────────────────

/**
 * Which six effects an element teaches, in unlock order: the three loss entries first, then the
 * three win entries. Losses always teach defence and wins always teach offence — that is the
 * fiction of the passive, and it also means a player who keeps losing keeps getting help.
 */
type Archetype = 'dot' | 'burst' | 'control' | 'mobile' | 'attrition' | 'arcane';

const RECIPES: Record<Archetype, [JournalEffect, JournalEffect, JournalEffect, JournalEffect, JournalEffect, JournalEffect]> = {
  /** Kills you over time. Learn to shed what it puts on you. */
  dot: ['shrug', 'shrug', 'resist', 'pressure', 'pressure', 'footwork'],
  /** Kills you in one exchange. Learn to survive the exchange. */
  burst: ['resist', 'guard', 'resist', 'pressure', 'footwork', 'pressure'],
  /** Kills you by taking the fight away from you. Learn to keep moving. */
  control: ['shrug', 'footwork', 'shrug', 'footwork', 'pressure', 'resist'],
  /** Kills you by being somewhere you are not. Learn to be there too. */
  mobile: ['footwork', 'resist', 'footwork', 'pressure', 'pressure', 'resist'],
  /** Kills you by outlasting you. Learn to bring more to spend. */
  attrition: ['guard', 'resist', 'guard', 'pressure', 'resist', 'pressure'],
  /** Kills you a different way every time. Learn a bit of everything. */
  arcane: ['shrug', 'guard', 'resist', 'pressure', 'footwork', 'pressure'],
};

// ── The table ────────────────────────────────────────────────────────────────

/**
 * One element's six entries. `pages` is ordered exactly like the recipe above — loss 1, loss 2,
 * loss 3, win 1, win 2, win 3 — and each is a title and the observation behind it. The mechanical
 * line underneath is generated from the recipe by `effectText`, so a title can never drift out of
 * sync with what the entry actually does.
 */
interface JournalElement {
  name: string;
  emoji: string;
  color: number;
  archetype: Archetype;
  pages: [string, string][];
}

const JOURNAL_ELEMENTS: Record<string, JournalElement> = {
  fire: {
    name: 'Fire', emoji: '🔥', color: 0xff4400, archetype: 'dot',
    pages: [
      ['Ash in the Margins', 'The burn kept eating long after the flame was out. It is not one attack, it is two.'],
      ['Second-Degree Notes', 'Everything it throws leaves something behind. Treat the aftermath as the real hit.'],
      ['Flashover', 'The blow that finished you arrived while you were already burning. Budget for both.'],
      ['Fuel and Air', 'Fire needs both. Deny it either and the whole kit stalls out.'],
      ['Where the Wick Sits', 'There is always a beat between the ignition and the spread. That beat is yours.'],
      ['Backdraft Steps', 'Move across the heat, never through it. The ground remembers longer than the air.'],
    ],
  },
  water: {
    name: 'Water', emoji: '💧', color: 0x0088ff, archetype: 'attrition',
    pages: [
      ['Wet Paper', 'You went soft before you went down. Bring something between you and the first wave.'],
      ['Undertow', 'It never hits hard. It hits again, and again, and the arithmetic does the rest.'],
      ['The Long Drown', 'Water wins ties. Turn up with a bigger margin than you think you need.'],
      ['Surface Tension', 'Every pool has an edge, and the edge is the only part of it that is thin.'],
      ['Reading the Current', 'Its damage arrives on a rhythm. Once you are counting it you are ahead of it.'],
      ['Break the Bank', 'Cut the source and the flood is only a puddle with ambitions.'],
    ],
  },
  life: {
    name: 'Life', emoji: '🌿', color: 0x44cc44, archetype: 'attrition',
    pages: [
      ['Outlived', 'It healed more than you dealt. Everything else about the fight was irrelevant.'],
      ['The Green Wall', 'Its damage is an afterthought. Its refusal to die is the whole ability set.'],
      ['Root Depth', 'You cannot win a long fight against something that gets longer the longer it goes.'],
      ['Between Blooms', 'Healing has a gap in it. Everything you have should land inside that gap.'],
      ['Cut, Do Not Saw', 'One large wound outruns the regrowth. Six small ones feed it.'],
      ['Thorn Ledger', 'Its retaliation is fixed and its recovery is not. Trade on purpose, not by accident.'],
    ],
  },
  air: {
    name: 'Air', emoji: '💨', color: 0xaaddff, archetype: 'mobile',
    pages: [
      ['Chasing Weather', 'You spent the whole fight arriving where it had been. Set off earlier.'],
      ['Windburn', 'The gusts are not the damage. They are the setup, and you kept blocking the setup.'],
      ['Lee Side', 'There is a still spot behind every gale. Stand in it and it has to come to you.'],
      ['Pressure Drop', 'It is fragile between gusts, and the gusts are loud enough to hear coming.'],
      ['Into the Gust', 'Closing during the push costs less than closing after it. Nothing about that is intuitive.'],
      ['Trim the Sail', 'Give the wind less of you to push and it stops being able to steer you.'],
    ],
  },
  earth: {
    name: 'Earth', emoji: '🪨', color: 0x887755, archetype: 'attrition',
    pages: [
      ['Buried', 'You had nothing left to spend and it had barely started. Bring reserves.'],
      ['Shield First', 'Every exchange started on its terms because it was armoured before the bell.'],
      ['Weight of It', 'It does not need to be fast. It needs you to still be standing there.'],
      ['Fault Lines', 'Stone is strong in one direction only. Hit it in the other one.'],
      ['Between Quakes', 'The ground tells you where it will break a moment before it breaks.'],
      ['Chip, Then Split', 'The armour comes off in pieces. Take the pieces and the rest is soft.'],
    ],
  },
  oil: {
    name: 'Oil', emoji: '🛢️', color: 0x664400, archetype: 'dot',
    pages: [
      ['Slick Underfoot', 'The coating was the attack. Everything that came after was just the match.'],
      ['Soaked Through', 'You cannot shake it off by moving. You have to stop it going on in the first place.'],
      ['One Spark', 'It only needed one, and it had all fight to find it.'],
      ['Dry Ground', 'Where it has not poured, it has almost nothing. Make the fight happen there.'],
      ['The Barrel Is the Target', 'Everything it does comes out of something you can see and hit.'],
      ['Off the Slick', 'Its footing is worse than yours on its own puddles. That is a real edge.'],
    ],
  },
  shadow: {
    name: 'Shadow', emoji: '🌑', color: 0x330044, archetype: 'control',
    pages: [
      ['Losing Heart', 'It never out-damaged you. It made your damage smaller until it did.'],
      ['Where the Dark Thins', 'You froze because you could not see. Movement was always the answer.'],
      ['The Weight', 'Hopelessness is a number. Numbers can be paid down, but not by standing still.'],
      ['Between Tentacles', 'The gaps are regular. Once you have the spacing the wall is a door.'],
      ['Light It Up', 'It is at its most solid the instant before it commits. Punish the commitment.'],
      ['Stakes and Strings', 'What it plants, it needs. Deny the ground and you have denied the ability.'],
    ],
  },
  ice: {
    name: 'Ice', emoji: '🧊', color: 0x88ccff, archetype: 'control',
    pages: [
      ['Frozen Solid', 'You died standing up. The damage was almost a formality.'],
      ['Sliding Away', 'Fighting the slip loses. Using it wins. This took several attempts to learn.'],
      ['Stack Counting', 'The freeze arrives on a schedule you can count. Count it out loud if you have to.'],
      ['Thin Ice', 'It commits hard to the freeze and has nothing spare while it lands.'],
      ['Warm Line', 'Approach on a curve. A straight line is what its cones are shaped for.'],
      ['After the Stone', 'Its heavy plays leave it planted for a beat longer than it thinks.'],
    ],
  },
  growth: {
    name: 'Growth', emoji: '🦠', color: 0x88bb22, archetype: 'dot',
    pages: [
      ['Infected', 'The sickness did more than the body did. You were fighting the wrong thing.'],
      ['Culture Notes', 'It gets stronger between exchanges. Rest is a resource you were donating.'],
      ['Spore Count', 'The air itself was against you and you kept treating it as background.'],
      ['Cut the Colony', 'It spends itself to grow. Interrupt the growth and it has spent it for nothing.'],
      ['Young Bodies', 'Whatever it just made is the weakest thing on the board. Take it immediately.'],
      ['Upwind', 'Everything it puts in the air drifts. Fight from the side it is not drifting to.'],
    ],
  },
  crystal: {
    name: 'Crystal', emoji: '💎', color: 0x88ccff, archetype: 'attrition',
    pages: [
      ['Refracted', 'Your best hit went somewhere else entirely, and you did not notice for ten seconds.'],
      ['Facet Count', 'Every structure it plants is another turn it gets for free. Arrive shielded.'],
      ['The Long Cut', 'It builds faster than you break. Change one of those two numbers.'],
      ['Cleavage Plane', 'Crystal splits clean along one line. Find the line, ignore the rest of it.'],
      ['Take the Nodes', 'The board is the ability. Clear the board and it is an ordinary fighter.'],
      ['Through the Gate', 'Its portals work for whoever is standing in them. That includes you.'],
    ],
  },
  soul: {
    name: 'Soul', emoji: '👻', color: 0xccaaff, archetype: 'control',
    pages: [
      ['Hollowed', 'It took pieces of you and used them. Every trade was worse than it looked.'],
      ['Do Not Stand Still', 'Anything anchored is something it can reach. Anchors include you.'],
      ['Ghost Weight', 'What it puts on you is real even when it is transparent. Shed it early.'],
      ['Between Wisps', 'The swarm has gaps and the gaps are wide. Walk, do not sprint.'],
      ['The Anchor Point', 'Everything it does comes back to one spot. Break the spot, break the fight.'],
      ['Unfinished Business', 'It is at its thinnest immediately after it spends the big one.'],
    ],
  },
  hunt: {
    name: 'Hunt', emoji: '🐺', color: 0xcc4400, archetype: 'burst',
    pages: [
      ['Run Down', 'It picked the moment, not you. Your job is to make the moment cost something.'],
      ['First Bite', 'The opening exchange decided it. Turn up with something to spend on that exchange.'],
      ['Marked', 'Once it has a mark on you the fight is on rails. Break the rails early.'],
      ['Between Forms', 'The change is the window. It is short and it is completely reliable.'],
      ['Do Not Be Prey', 'It commits to a line when it pounces. Cross the line rather than fleeing it.'],
      ['Reload Window', 'Its human form has to stop to work. Every stop is an invitation.'],
    ],
  },
  sand: {
    name: 'Time', emoji: '⏳', color: 0xffdd44, archetype: 'control',
    pages: [
      ['Out of Step', 'It got extra turns and you got fewer. Nothing about the damage was the problem.'],
      ['Between Ticks', 'You were always half a beat behind. Start moving before you have a reason to.'],
      ['The Debt', 'What it does to your clock catches up all at once. Do not let it accumulate.'],
      ['Ahead of the Hand', 'Commit early against it. By the time you have read the play it is over.'],
      ['Sand in the Works', 'Every clock it stops, it has to restart. That restart is loud.'],
      ['Rewound', 'It undoes positions, not damage. Damage is therefore the only thing worth doing.'],
    ],
  },
  gravity: {
    name: 'Gravity', emoji: '🌌', color: 0x8844cc, archetype: 'control',
    pages: [
      ['Pinned', 'You never chose where you stood. Every other mistake followed from that one.'],
      ['Escape Velocity', 'Fighting the pull head-on costs everything. Go around the outside of it.'],
      ['Heavy Air', 'The weight it puts on you does not announce itself. It just makes you slow and dead.'],
      ['The Well Has an Edge', 'Its pull falls off fast. One extra step is the difference.'],
      ['Falling Sideways', 'Let it move you and spend the movement. Free travel is still travel.'],
      ['After the Star', 'Its big plays leave it flat-footed for a full beat. That beat is the fight.'],
    ],
  },
  creation: {
    name: 'Creation', emoji: '🔨', color: 0xcc6622, archetype: 'attrition',
    pages: [
      ['Out-Built', 'It ended the fight with more on the board than it started with. You did not.'],
      ['The Workshop', 'Everything it does comes from somewhere. You spent the fight fighting the output.'],
      ['Bench Depth', 'It replaces what it loses. Bring enough to break the same thing twice.'],
      ['Unfinished Work', 'Whatever it is building is at its weakest while it is being built.'],
      ['Pull the Nexus', 'One structure holds the rest up. Everything else is a distraction from it.'],
      ['Wrenched', 'It punishes casting, not you. Cast on your terms and the punish never lands.'],
    ],
  },
  electricity: {
    name: 'Electricity', emoji: '⚡', color: 0xffee44, archetype: 'burst',
    pages: [
      ['Grounded', 'It arrived before the decision to dodge did. Assume the hit and plan past it.'],
      ['Arc Path', 'The chain went through everything you owned. Spread out or bring a buffer.'],
      ['Charge Time', 'The wind-up is short but it is not nothing. It is exactly one heartbeat.'],
      ['Between Bolts', 'It has to gather before it strikes. Gathering is the only slow thing it does.'],
      ['Off the Line', 'Its bolts travel straight. Sidestep beats retreat every single time.'],
      ['Earth It', 'Break the first link and the whole chain is one hit instead of five.'],
    ],
  },
  slime: {
    name: 'Acid', emoji: '🧪', color: 0x88dd22, archetype: 'dot',
    pages: [
      ['Eaten Through', 'The damage kept arriving after the ability ended. That is most of its output.'],
      ['Corrosion Log', 'It stacks. You treated each application as one hit and lost the count.'],
      ['Vapour', 'Even the air around it was doing work. Range was worth more than you gave it.'],
      ['Neutralise', 'It has to reapply constantly. Deny two applications and the third is worthless.'],
      ['The Whip Arc', 'Its reach is fixed and generous, but the arc is readable and slow to reset.'],
      ['Dry Footing', 'Off its own residue it is an ordinary fighter with an ordinary kit.'],
    ],
  },
  fate: {
    name: 'Fate', emoji: '🎴', color: 0xffcc00, archetype: 'arcane',
    pages: [
      ['Bad Draw', 'It got a run of them. That is not luck, that is a hand it built on purpose.'],
      ['Curse Ledger', 'What it puts on you is worse than what it throws at you. Prepare for the wrong one.'],
      ['House Edge', 'Over a long fight the odds are not neutral. Make it a short fight.'],
      ['Count the Hand', 'It only holds so many. Once you have counted them you know what is left.'],
      ['Force the Discard', 'Pressure makes it spend the good card on a bad moment.'],
      ['Between Reshuffles', 'Its hand is empty for a moment every cycle, and it is a long moment.'],
    ],
  },
  sound: {
    name: 'Sound', emoji: '🔊', color: 0xff44aa, archetype: 'mobile',
    pages: [
      ['Deafened', 'You lost the fight by half a step, over and over, until the halves added up.'],
      ['Standing Wave', 'The damage sat in places rather than travelling. You walked into all of them.'],
      ['Off-Beat', 'Everything it does is rhythmic. You were on the beat and the beat was its.'],
      ['Node and Antinode', 'Its waves have dead spots. The dead spots are exactly where it does not want you.'],
      ['Inside the Ring', 'Close is safer than mid against it, which is the opposite of what it looks like.'],
      ['Silence Between', 'The gap after a big wave is the longest quiet moment it ever gives you.'],
    ],
  },
  light: {
    name: 'Light', emoji: '🌟', color: 0xffffaa, archetype: 'mobile',
    pages: [
      ['Outrun', 'It was never where you aimed. Aim where it is going, not where it was.'],
      ['Blinded', 'The lance came out of a bright patch you had stopped looking at.'],
      ['Cornering', 'It is fastest in a straight line. Make the arena full of corners.'],
      ['Off the Ramp', 'Everything fast it does starts from something it placed. Break the something.'],
      ['Head On', 'Meeting the charge costs it more than it costs you. Nobody believes this until it works.'],
      ['Slow Restart', 'It has to build speed again from nothing. Nothing is a long way from fast.'],
    ],
  },
  magnet: {
    name: 'Magnet', emoji: '🧲', color: 0xcc2244, archetype: 'control',
    pages: [
      ['Dragged', 'You were furniture. Every position in that fight was chosen for you.'],
      ['Polarity Notes', 'Push and pull look the same until you are already moving. Watch the hands.'],
      ['Held', 'What it locks onto stays locked. Break it in the first half-second or not at all.'],
      ['Perpendicular', 'Field lines pull along one axis. Move across them and the grip is nothing.'],
      ['Take the Iron', 'Its board is its ability. An empty floor is an empty kit.'],
      ['Flip the Charge', 'It commits to a polarity. Committing is the one thing it cannot do twice quickly.'],
    ],
  },
  metal: {
    name: 'Metal', emoji: '⚙️', color: 0x8899aa, archetype: 'burst',
    pages: [
      ['Run Through', 'One exchange, most of your health. Come to that exchange with something spare.'],
      ['First Swing', 'It opens hard on purpose. Survive the opening and the rest is even.'],
      ['Blood Ledger', 'It gets stronger from the damage it deals. Small hits are not small.'],
      ['Between Swings', 'The blade has to come back. It always has to come back.'],
      ['Inside the Reach', 'Too close is a real place, and it is a place the sabre does not work.'],
      ['Clotted', 'What it banks it can spend. Force it to spend early and it has nothing at the end.'],
    ],
  },
  plasma: {
    name: 'Plasma', emoji: '🔮', color: 0xaa22ff, archetype: 'dot',
    pages: [
      ['Cooked', 'Nothing hit you hard. Everything hit you, constantly, from everywhere.'],
      ['Field Notes', 'The arena itself was doing damage. Position was worth more than defence.'],
      ['Contained', 'It shrinks the space you have. Use the space while it is still there.'],
      ['Unstable', 'What it summons is dangerous to it too. Fight next to its own hazards.'],
      ['Between Arcs', 'The arcs have a period. It is short, but it is a period and not a stream.'],
      ['Outside the Storm', 'Its damage falls off hard past the edge. Live on the edge.'],
    ],
  },
  gunpowder: {
    name: 'Gunpowder', emoji: '💀', color: 0x440066, archetype: 'burst',
    pages: [
      ['Shot', 'It hit for a third of you from across the arena and you had no answer ready.'],
      ['Volley Discipline', 'The second shot is the one that kills. Have something up for the second shot.'],
      ['Powder Count', 'It only carries so much, and it kept firing because you never made it count.'],
      ['Reload', 'Its whole kit stops to reload. The stop is generous and completely reliable.'],
      ['Broken Line', 'Everything it fires is a straight line from a visible barrel. Break the line.'],
      ['Too Close for the Musket', 'At range it wins. Inside its own blast radius it does not.'],
    ],
  },
  rubber: {
    name: 'Rubber', emoji: '🪀', color: 0xff5577, archetype: 'mobile',
    pages: [
      ['Bounced', 'It came back from everywhere. Committing to a direction was always a mistake.'],
      ['Rebound Angle', 'Your own shots came home. Watch what is behind it, not just it.'],
      ['Elastic Limit', 'It has a snap point and you never pushed it that far.'],
      ['Off the Wall', 'Its returns are geometric. Once you have the angle you have the whole ability.'],
      ['Between Bounces', 'It is committed mid-flight and cannot change its mind. Meet it where it lands.'],
      ['Cut the Band', 'Anything anchoring it is doing half the work. Break the anchor.'],
    ],
  },
  magic: {
    name: 'Magic', emoji: '📖', color: 0x9944ff, archetype: 'arcane',
    pages: [
      ['Out-Read', 'You prepared for the wrong element, twice, in the same fight.'],
      ['Borrowed Kit', 'Whatever it stole, it used better than the original did. Assume the worst version.'],
      ['Sigil Notes', 'It telegraphs in symbols rather than in movement. Learn the symbols.'],
      ['Between Pages', 'Changing what it is costs it a beat, and it has to change constantly.'],
      ['Force the Repeat', 'Pressure makes it fall back to the one spell it is comfortable with.'],
      ['Half of Everything', 'It carries a slice of many kits and the master of none. Beat the slice.'],
    ],
  },
  technology: {
    name: 'Technology', emoji: '💻', color: 0x44ccaa, archetype: 'attrition',
    pages: [
      ['Out-Scaled', 'It ended the fight with more systems running than it started with. Every time.'],
      ['Uptime', 'Its damage is small and permanent. Yours was large and occasional. Small won.'],
      ['Bandwidth', 'The longer it runs the worse the matchup gets. Bring a clock of your own.'],
      ['Pull the Plug', 'Everything it deploys is a physical object standing on the floor.'],
      ['Latency', 'What it does to your inputs is worse than what it does to your health.'],
      ['Boot Time', 'A fresh deployment is useless for a moment. Fight during the moment.'],
    ],
  },
  silence: {
    name: 'Silence', emoji: '🫥', color: 0x1a0022, archetype: 'control',
    pages: [
      ['Lost in It', 'You never saw the fight. That is the fight — everything else is decoration.'],
      ['Keep Walking', 'Standing still in the fog is how it finds you. It is not subtle about this.'],
      ['Muted', 'Losing your abilities mattered more than losing your health. Plan for the mute.'],
      ['Edge of the Fog', 'Its cover has a boundary and the boundary is where it is weakest.'],
      ['Follow the Sound', 'It gives itself away constantly. You were listening for the wrong thing.'],
      ['Break the Grab', 'Everything it does funnels into one hold. Refuse the hold and it has no plan B.'],
    ],
  },
  echo: {
    name: 'Echo', emoji: '🦇', color: 0xccccff, archetype: 'control',
    pages: [
      ['Blind', 'It knew where you were the entire time and you never once knew where it was.'],
      ['Stop Sprinting', 'Movement is what it hears. Slow is a stealth option, and you never used it.'],
      ['Paranoia', 'What it does to your head lasts past the ability. Ride it out rather than reacting.'],
      ['Between Pings', 'It is deaf between pulses, and the pulses are further apart than they feel.'],
      ['Toward the Chirp', 'The sound comes from it. Walking at it is counter-intuitive and correct.'],
      ['Break the Lantern', 'What it lights the arena with can be taken away from it.'],
    ],
  },
  subterfuge: {
    name: 'Subterfuge', emoji: '🕴️', color: 0xcc2233, archetype: 'mobile',
    pages: [
      ['Outnumbered', 'It never fought you alone and you kept letting it choose the terms.'],
      ['Paid For', 'Everything it did cost money it earned while you were not pressuring it.'],
      ['The Blade Comes First', 'The knife work is the damage. The rest is how it gets to do the knife work.'],
      ['Break the Payroll', 'Kill what it hired and it has spent the fight on nothing.'],
      ['Crowd It', 'It needs room to work. In a corner the whole kit is one dagger.'],
      ['Between Contracts', 'It is broke and alone for a window every cycle. That window is the fight.'],
    ],
  },
  dummy: {
    name: 'Practice Dummy', emoji: '🎯', color: 0xbbaa88, archetype: 'attrition',
    pages: [
      ['Losing to Furniture', 'It does nothing. There is no note to write here that is kind.'],
      ['Patience', 'It will outlast anyone who is not paying attention, including you.'],
      ['Stuffing', 'There is more of it than there looks. Bring enough to finish the job.'],
      ['Centre Mass', 'It does not dodge. Every shot you take should be a shot that lands.'],
      ['No Reprisal', 'Nothing it does needs respecting. Spend everything, every time.'],
      ['Sawdust', 'Once you know how much it holds, the fight is just arithmetic you have already done.'],
    ],
  },
  justice: {
    name: 'Justice', emoji: '⚖️', color: 0xffd76a, archetype: 'burst',
    pages: [
      ['Judged', 'The verdict landed in one blow. Nothing before it mattered and nothing after it existed.'],
      ['Standing Trial', 'It opens from the stance it wants. Come armoured for whichever one it picks.'],
      ['Willpower', 'It converts your pressure into its own resource. Sloppy damage is a donation.'],
      ['Between Stances', 'The change is committed and slow. It is the only slow thing about it.'],
      ['Off the Scales', 'It fights along one axis at a time. Refuse the axis.'],
      ['Contempt', 'Force it to spend the verdict early and the rest of the fight is ordinary.'],
    ],
  },
  dream: {
    name: 'Dream', emoji: '🌙', color: 0x9d8cff, archetype: 'control',
    pages: [
      ['Asleep', 'You lost consciousness, not health. The health went afterwards, at its leisure.'],
      ['Stay Awake', 'Drowsiness builds while you are passive. Passive is the one thing you cannot afford.'],
      ['Sleep Debt', 'It accumulates across the whole fight and never resets on its own.'],
      ['Between Lulls', 'Its pressure comes in waves and the trough is long. Act in the trough.'],
      ['Damage Wakes You', 'Taking a hit is a tool. Sometimes the cheapest way out is to be hit.'],
      ['Break the Pendulum', 'What it swings needs room and rhythm. Deny either and it is inert.'],
    ],
  },
  chalk: {
    name: 'Chalk', emoji: '🖍️', color: 0xf4f1e6, archetype: 'attrition',
    pages: [
      ['Drawn Into It', 'It built the arena around you one line at a time and you watched it happen.'],
      ['Erase Early', 'Every mark it leaves is a future problem. Bring something for the first few.'],
      ['The Whole Board', 'By the end there was nowhere to stand that it had not already drawn on.'],
      ['Smudge', 'What it draws can be walked through before it sets. Setting takes a moment.'],
      ['Break the Line', 'Its shapes need to close. An open shape does nothing at all.'],
      ['Blank Ground', 'Fight where it has not drawn and it has to start the whole kit again.'],
    ],
  },
  magma: {
    name: 'Magma', emoji: '🌋', color: 0xff5a1e, archetype: 'dot',
    pages: [
      ['Cooked Through', 'The floor did more damage than it did. You kept looking at the wrong thing.'],
      ['Pressure Reading', 'It gets stronger every time you hit it. Your own damage was arming the vessel.'],
      ['Nowhere Cool', 'It fills the arena and then waits. Waiting is the entire plan and it works.'],
      ['Bleed the Vessel', 'Whatever it is pressurising has to release. Be somewhere else when it does.'],
      ['Cold Ground', 'The unburnt floor is small and it is the whole game. Own it.'],
      ['Between Eruptions', 'It has to build again after every release, and building is slow.'],
    ],
  },
  illusion: {
    name: 'Illusion', emoji: '🎭', color: 0xb45cff, archetype: 'control',
    pages: [
      ['Fooled', 'You spent the fight fighting something that was not there. Twice.'],
      ['Do Not Commit', 'Every big swing you took went into empty air. Jab until you are certain.'],
      ['Folded', 'What it did to your shape was not cosmetic. It changed what could hit you.'],
      ['Find the Real One', 'Only one of them affects the world. Watch the floor, not the figures.'],
      ['Through the Pane', 'Its warps are two-way. Use its own geometry to arrive somewhere it did not plan for.'],
      ['Between Tricks', 'It is exposed for a beat every time the illusion resets.'],
    ],
  },
  depths: {
    name: 'Depths', emoji: '🐟', color: 0x0e8f9c, archetype: 'mobile',
    pages: [
      ['Drowned', 'It never needed to out-damage you. It needed you to stay where it put you.'],
      ['The Lure', 'You followed the light. Everyone follows the light. Stop following the light.'],
      ['Deep Water', 'The longer you spend in its range the worse every number gets.'],
      ['Shallow Ground', 'Its pressure falls off. Fight at the edge and it has to come to the edge.'],
      ['Between Bites', 'The big one commits to a line and cannot turn. Cross it, do not outrun it.'],
      ['Cut the Line', 'What it throws it wants back. Deny the return and it is down an ability.'],
    ],
  },
  ruin: {
    name: 'Ruin', emoji: '🧱', color: 0xc4392c, archetype: 'burst',
    pages: [
      ['Undone', 'It took your abilities away and then took its time. Bring defence for the taking.'],
      ['Locked Out', 'Losing a key mid-fight is worse than losing health. Have a plan without it.'],
      ['The Rot', 'What it puts on you does not expire. Nothing else in the game does that.'],
      ['Between Wedges', 'Its locks are aimed. Being off the aim is the whole counterplay.'],
      ['Move Through It', 'It punishes standing and rewards nothing else. Keep the fight in motion.'],
      ['Raze the Razer', 'It spends heavily on the board clear. Immediately after, it is empty.'],
    ],
  },
  dune: {
    name: 'Sand', emoji: '🏜️', color: 0xe8c87a, archetype: 'burst',
    pages: [
      ['Shot From Above', 'It was standing on something it built. That is where the forty-five comes from.'],
      ['Mid-Climb', 'While it is on a course it is not chasing you. That is the window, and it is long.'],
      ['Knock It Down', 'Everything it builds can be knocked over, and it detonates when it goes.'],
      ['Reloading', 'Two seconds between shots, one if it took the orb. Count them.'],
      ['The Worm Has A Head', 'Only the head hurts. The rest of it is a wall you can walk through.'],
      ['Nothing Under It', 'Wait for it to be in the air with no pillar beneath. Twenty of that fall is free.'],
    ],
  },
  conquest: {
    name: 'Conquest', emoji: '🏰', color: 0xc23a2e, archetype: 'attrition',
    pages: [
      ['Out-Built', 'You fought the units. It was always about the buildings and you never touched one.'],
      ['Early Pressure', 'It was allowed to develop unmolested and the fight was decided by then.'],
      ['The Board Wins', 'By the second minute the arithmetic was fixed. Change the first minute.'],
      ['Raze It', 'Its board is the ability. Nothing else it does matters if the board is gone.'],
      ['Between Builds', 'It is at its poorest the instant after it commits Authority.'],
      ['Cut the Economy', 'Deny income and every tree it has planned collapses at once.'],
    ],
  },
  passion: {
    name: 'Passion', emoji: '💘', color: 0xff5fa2, archetype: 'mobile',
    pages: [
      ['Charmed', 'Your health was never the bar that mattered and you were watching the wrong one.'],
      ['The Other Meter', 'Nothing lowers it. Every hit you take is permanent progress toward losing.'],
      ['Distance', 'It fills the bar faster the longer it is near you. Near is a choice.'],
      ['Break the Spell', 'It has to keep landing hits to progress. Two clean dodges is a whole exchange denied.'],
      ['Out of Reach', 'Its best tools are close-range. Range is the entire counterplay.'],
      ['Between Roses', 'It commits fully to the big plays and has nothing at all for a beat afterwards.'],
    ],
  },
  paper: {
    name: 'Paper', emoji: '📄', color: 0xf2ead6, archetype: 'arcane',
    pages: [
      ['Read First', 'It had a journal on you and you had nothing on it. That is the whole difference.'],
      ['Cover to Cover', 'It knew which book to open before you had picked a stance.'],
      ['Dog-Eared', 'Everything you tried, it had written down years ago.'],
      ['A Blank Page', 'Its buffs are matchup-specific. Fight it as something it has never studied.'],
      ['Between Books', 'Cycling costs it a beat and it has to cycle constantly.'],
      ['Write It Down', 'Whatever it does to you, it can be done back. Take notes.'],
    ],
  },
};

// ── Entries ──────────────────────────────────────────────────────────────────

export interface JournalEntry {
  /** Which result earns it. */
  source: 'loss' | 'win';
  /** How many of that result you need — 1, 2 or 3. */
  rank: number;
  effect: JournalEffect;
  name: string;
  note: string;
  /** The mechanical line, generated so it can never disagree with `effect`. */
  effectText: string;
  unlocked: boolean;
}

/** The generated mechanical line for one entry. */
function effectText(effect: JournalEffect, elementName: string): string {
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  switch (effect) {
    case 'resist': return `Take ${pct(JOURNAL_STEP.resist)} less damage from ${elementName}.`;
    case 'pressure': return `Deal ${pct(JOURNAL_STEP.pressure)} more damage to ${elementName}.`;
    case 'shrug': return `Debuffs ${elementName} puts on you wear off ${pct(JOURNAL_STEP.shrug)} sooner.`;
    case 'footwork': return `Move ${pct(JOURNAL_STEP.footwork)} faster while fighting ${elementName}.`;
    case 'guard': return `Start every fight against ${elementName} with ${JOURNAL_STEP.guard} shield.`;
  }
}

/** True if this element has a journal at all. */
export function hasJournal(elementId: string): boolean {
  return !!JOURNAL_ELEMENTS[elementId];
}

export function journalElementName(elementId: string): string {
  return JOURNAL_ELEMENTS[elementId]?.name ?? elementId;
}

export function journalElementEmoji(elementId: string): string {
  return JOURNAL_ELEMENTS[elementId]?.emoji ?? '❔';
}

export function journalElementColor(elementId: string): number {
  return JOURNAL_ELEMENTS[elementId]?.color ?? 0xf2ead6;
}

/** Every element with a journal, in table order — what the info panel lists. */
export function journalElementIds(): string[] {
  return Object.keys(JOURNAL_ELEMENTS);
}

/**
 * The six entries for one element, with `unlocked` resolved against the save. Loss entry N needs
 * N losses; win entry N needs N wins. Always six, always in the same order — the info panel shows
 * locked entries greyed rather than hiding them, so the journal reads as a thing to fill in.
 */
export function journalEntries(elementId: string): JournalEntry[] {
  const el = JOURNAL_ELEMENTS[elementId];
  if (!el) return [];
  const record = PlayerData.getPaperJournal(elementId);
  const recipe = RECIPES[el.archetype];
  return el.pages.map((page, i) => {
    const source: 'loss' | 'win' = i < 3 ? 'loss' : 'win';
    const rank = (i % 3) + 1;
    const effect = recipe[i];
    return {
      source,
      rank,
      effect,
      name: page[0],
      note: page[1],
      effectText: effectText(effect, el.name),
      unlocked: (source === 'loss' ? record.losses : record.wins) >= rank,
    };
  });
}

/**
 * Everything the journal is currently doing to you against `elementId`, summed.
 *
 * Called every frame by PaperKit, so it stays allocation-light and returns the shared
 * `NO_JOURNAL_BONUSES` for an element with nothing written up yet.
 */
export function journalBonuses(elementId: string): JournalBonuses {
  const el = JOURNAL_ELEMENTS[elementId];
  if (!el) return NO_JOURNAL_BONUSES;
  const record = PlayerData.getPaperJournal(elementId);
  if (record.wins === 0 && record.losses === 0) return NO_JOURNAL_BONUSES;

  const recipe = RECIPES[el.archetype];
  const out: JournalBonuses = { resist: 0, pressure: 0, shrug: 0, footwork: 0, guard: 0, unlocked: 0 };
  for (let i = 0; i < 6; i++) {
    const needed = (i % 3) + 1;
    const have = i < 3 ? record.losses : record.wins;
    if (have < needed) continue;
    out[recipe[i]] += JOURNAL_STEP[recipe[i]];
    out.unlocked++;
  }
  out.shrug = Math.min(out.shrug, SHRUG_CAP);
  return out;
}

/** How many of the six entries against `elementId` are filled in. */
export function journalProgress(elementId: string): { unlocked: number; wins: number; losses: number } {
  const record = PlayerData.getPaperJournal(elementId);
  return {
    unlocked: Math.min(3, record.wins) + Math.min(3, record.losses),
    wins: record.wins,
    losses: record.losses,
  };
}

/** Filled entries across every element — the headline number on the Journal tab. */
export function journalTotalUnlocked(): number {
  let total = 0;
  for (const id of Object.keys(JOURNAL_ELEMENTS)) total += journalProgress(id).unlocked;
  return total;
}

/** Six per element. */
export function journalTotalPossible(): number {
  return Object.keys(JOURNAL_ELEMENTS).length * 6;
}

/**
 * Write up a finished fight.
 *
 * Only called when the player was Paper and the fight had one identifiable enemy element —
 * ArenaScene owns that decision. Returns the entries this result just unlocked, so the game-over
 * screen can show what was learned; an unrecognised element or a fourth win of the same kind
 * returns nothing and costs nothing.
 */
export function recordJournalResult(elementId: string, won: boolean): JournalEntry[] {
  if (!JOURNAL_ELEMENTS[elementId]) return [];
  const before = PlayerData.getPaperJournal(elementId);
  const source: 'loss' | 'win' = won ? 'win' : 'loss';
  const had = won ? before.wins : before.losses;
  if (had >= 3) {
    // Still recorded — the tally is shown in the info panel even past the third — but nothing
    // new is learned, so there is nothing to report.
    PlayerData.addPaperJournalResult(elementId, won);
    return [];
  }
  PlayerData.addPaperJournalResult(elementId, won);
  return journalEntries(elementId).filter((e) => e.source === source && e.rank === had + 1);
}
