/**
 * The Hollow Court — the campaign's story, told in short skippable dialogue
 * beats over the existing scene flow.
 *
 * ── Canon ──
 * Every world is ruled by a Sovereign, the element's living avatar. Something
 * beneath the worlds — the players know it only as THE VOICE BENEATH — has
 * been seeding corruption throne by throne; the husks of Invasion are elements
 * it has already eaten. The Disgraced King (the shop's secret boss) was the
 * first Sovereign to fall, and the Devourer is what got into him. Beyond the
 * scarred portal lies the Corrupt Realm: seventeen elements the natural order
 * cast out long ago, easy prey, eaten first. At its heart the corruption wears
 * a body — THE AMALGAM, stitched from every Sovereign it has taken, which is
 * why it fights with all of their stolen moves. Every Sovereign the player
 * frees pledges to them; that pledge is, mechanically, the tag-team lives
 * system of the finale. Behind the Amalgam: a sealed 43rd element. Quantum.
 *
 * ── Cast ──
 * THE HERALD — a masked emissary of the fallen courts, the player's guide.
 * Sovereigns — one voice per world, spoken around their boss fights.
 * THE VOICE BENEATH — the corruption. It interrupts. It is very patient.
 *
 * Beat ids are what CampaignProgress persists (`seenStoryBeats`), triggered as:
 *   'prologue'                — first time a slot opens the normal world map
 *   'world-enter:<worldId>'   — first time a world's node map is opened
 *   'boss-pre:<worldId>'      — first time a world's boss briefing is opened
 *   'boss-post:<worldId>'     — first victory screen after felling that boss
 *   'portal-abstract' / 'portal-corrupt' — first time each new realm map opens
 */

export interface StoryLine {
  speaker: string;
  emoji: string;
  color: number;
  text: string;
}

export interface StoryBeat {
  id: string;
  lines: StoryLine[];
}

const HERALD = { speaker: 'The Herald', emoji: '🎭', color: 0xb9a3ff };
const VOICE = { speaker: 'The Voice Beneath', emoji: '🕳️', color: 0x8a1420 };

const h = (text: string): StoryLine => ({ ...HERALD, text });
const v = (text: string): StoryLine => ({ ...VOICE, text });
const s = (speaker: string, emoji: string, color: number, text: string): StoryLine =>
  ({ speaker, emoji, color, text });

const beats: StoryBeat[] = [
  // ── Openings ──────────────────────────────────────────────────────
  { id: 'prologue', lines: [
    h('So. Another challenger walks the worlds. I am the Herald — I carried messages between the elemental courts, when there were courts to carry them between.'),
    h('Every world you see had a Sovereign once: the element itself, walking. Something has been getting into them. Throne by throne. Quietly.'),
    h('Fight your way up. Fell whatever sits where the Sovereigns used to. And if you hear a voice under the floorboards of the world — do not answer it.'),
    v('…too late.'),
  ] },
  { id: 'portal-abstract', lines: [
    h('The Abstract Realm. Elements that were never meant to be weather — thought, sound, law, light. The corruption reached here before we did.'),
    h('The Sovereigns of this place were stranger and prouder than the ones you have met. It made them easier to hollow out.'),
  ] },
  { id: 'portal-corrupt', lines: [
    h('You can smell it from here, then. Good. You should know what you are walking into.'),
    h('Long ago, the natural order held a trial and cast seventeen elements out — too unstable, too strange, too hungry. The Corrupt Realm is where they landed.'),
    h('Exile makes poor armour. When the Voice came for them, no one even heard it happen. What rules these worlds now is what is left.'),
    v('They were delicious. You will understand. You will be understanding itself.'),
  ] },

  // ── Fire — the reference Sovereign ────────────────────────────────
  { id: 'world-enter:fire', lines: [
    h('The First Flame. Everything began as this world\'s kindling — mine too. Its Sovereign, the Archfiend, kept every hearth in every realm lit.'),
    h('Kept. Past tense. Climb, and see what tends the fires now.'),
  ] },
  { id: 'boss-pre:fire', lines: [
    s('The Archfiend', '🔥', 0xffb347, 'You came up the mountain to see the old fire, did you? How devout.'),
    s('The Archfiend', '🔥', 0xffb347, 'Something whispered up through the coals, little one. It asked for ash. It asks so nicely.'),
    h('That is not the Archfiend talking. Put the Sovereign out of its misery — or knock the misery out of the Sovereign.'),
  ] },
  { id: 'boss-post:fire', lines: [
    s('The Archfiend', '🔥', 0xffb347, 'Ah. There I am. I had been… somewhere with no warmth in it at all.'),
    s('The Archfiend', '🔥', 0xffb347, 'You hit like a chimney collapse. I mean that fondly. My flame is yours, challenger — when the last door opens, call, and I will answer.'),
    h('One throne breathing again. The Voice felt that — listen how quiet it has gone.'),
  ] },

  // ── Tier-1 Sovereigns ─────────────────────────────────────────────
  { id: 'boss-pre:water', lines: [
    s('The Leviathan', '🌊', 0x7ab8ff, 'The deep has been waiting a long time, small thing. It counts in tides, and it has counted many.'),
    s('The Leviathan', '🌊', 0x7ab8ff, 'Something whispered up the trench and asked my court to sink. Half of them said yes.'),
    h('The other half are inside that serpent, waiting for you to win. No pressure. Well — considerable pressure. It is the sea.'),
  ] },
  { id: 'boss-post:water', lines: [
    s('The Leviathan', '🌊', 0x7ab8ff, 'Ah. Surface. I had forgotten it was… loud.'),
    s('The Leviathan', '🌊', 0x7ab8ff, 'You have the deep\'s gratitude, which is heavier than it sounds. When the last door opens, the tide comes with you.'),
  ] },
  { id: 'boss-pre:life', lines: [
    s('The Verdant Crown', '🌿', 0x9df5a8, 'Everything green wants your place in the sun. Today, everything green is organised about it.'),
    h('The Crown kept every meadow in the realms alive. What is wearing it now grows in one direction only. Prune accordingly.'),
  ] },
  { id: 'boss-post:life', lines: [
    s('The Verdant Crown', '🌿', 0x9df5a8, 'Oh. Oh, the *rot* of it. Thank you. The garden remembers who weeded it.'),
    s('The Verdant Crown', '🌿', 0x9df5a8, 'Take a blossom. When the last door opens, the whole green will bloom at your back.'),
  ] },
  { id: 'boss-pre:air', lines: [
    s('The Eye', '💨', 0xd8f0ff, 'There is no wind in here. I stopped it, to hear you better.'),
    s('The Eye', '💨', 0xd8f0ff, 'The Voice asked me to look away from the realms. I am the Eye. I declined. It made… adjustments.'),
    h('It watched everything, once, on our behalf. Whatever it watches now, break its concentration.'),
  ] },
  { id: 'boss-post:air', lines: [
    s('The Eye', '💨', 0xd8f0ff, 'I can see again. All of it. …I had missed weather.'),
    s('The Eye', '💨', 0xd8f0ff, 'The High Court flies with you now, challenger. When the last door opens, so does the sky.'),
  ] },
  { id: 'boss-pre:earth', lines: [
    s('The Mountain King', '🗿', 0xd8c090, 'Mountains do not negotiate. The thing in my roots negotiated anyway. It is very patient and I am very deep.'),
    h('He held the weight of every realm on his shoulders and never once complained. If he is swinging at you, something else is holding the hammer.'),
  ] },
  { id: 'boss-post:earth', lines: [
    s('The Mountain King', '🗿', 0xd8c090, 'Hm. Unburied. You dig well, for something so small.'),
    s('The Mountain King', '🗿', 0xd8c090, 'The Deep Court stands behind you now — geologically, which is the only way we stand. Call, when the last door opens.'),
    v('Four thrones breathing. It does not matter. I have eaten seventeen.'),
  ] },

  // ── Tier-2 Sovereigns ─────────────────────────────────────────────
  { id: 'boss-pre:oil', lines: [
    s('The Derrick', '🛢️', 0xd8a03d, 'Everything you love is fuel. I have run the numbers on you specifically.'),
    h('The Derrick pumped light and heat to half the realms. Now it pumps for the thing below. Watch the floor — it lays its argument down before it lights it.'),
  ] },
  { id: 'boss-post:oil', lines: [
    s('The Derrick', '🛢️', 0xd8a03d, 'The pressure is… mine again. Do you know how long I ran on someone else\'s hunger?'),
    s('The Derrick', '🛢️', 0xd8a03d, 'The Slick is with you. When the last door opens, everything the Voice loves becomes fuel.'),
  ] },
  { id: 'boss-pre:ice', lines: [
    s('The Long Winter', '❄️', 0xe8f6ff, 'Nothing thaws. Nothing ever needed to. The Voice agreed with me — that should have been my first warning.'),
    h('Winter was never cruel, only patient. What sits on that throne now has confused the two. Keep moving; it wins every argument you have standing still.'),
  ] },
  { id: 'boss-post:ice', lines: [
    s('The Long Winter', '❄️', 0xe8f6ff, '…warm. I remember warm. What a strange thing to have outlawed.'),
    s('The Long Winter', '❄️', 0xe8f6ff, 'The Frozen Court will hold the line for you — holding is what we do best. Call, when the last door opens.'),
  ] },
  { id: 'boss-pre:growth', lines: [
    s('Patient Zero', '🐛', 0xd8f56a, 'You will be the next colony. Do not take it personally; everything is the next colony.'),
    v('This one I never finished eating. It kept… multiplying.'),
    h('It out-grew the corruption itself, which is either hopeful or horrifying. Do not stand still, and do not lead it anywhere you like.'),
  ] },
  { id: 'boss-post:growth', lines: [
    s('Patient Zero', '🐛', 0xd8f56a, 'Fascinating. You are the first thing to make losing feel like data.'),
    s('Patient Zero', '🐛', 0xd8f56a, 'The Culture pledges its every generation to you. When the last door opens, we multiply on your side.'),
  ] },
  { id: 'boss-pre:crystal', lines: [
    s('The Prism Throne', '💎', 0xffffff, 'Light bends for me. You will too. Every facet in this hall has already measured you.'),
    h('The Lattice remembers everything that ever touched it. The Voice could not hollow it — so it simply turned all that memory into aim.'),
  ] },
  { id: 'boss-post:crystal', lines: [
    s('The Prism Throne', '💎', 0xffffff, 'A flaw in my symmetry. Deliberate. Elegant. I will keep it.'),
    s('The Prism Throne', '💎', 0xffffff, 'The Lattice refracts for you now. When the last door opens, the light arrives with you — from every angle at once.'),
  ] },
  { id: 'boss-pre:hunt', lines: [
    s('Apex', '🐺', 0xffa060, 'Something hunts the hunters. You have been on my trail board since the fire world. Red string and everything.'),
    h('The Wilds kept the oldest law: everything runs, everything is run down. The Voice did not corrupt Apex so much as… commission it.'),
  ] },
  { id: 'boss-post:hunt', lines: [
    s('Apex', '🐺', 0xffa060, 'Run down. Me. I want to be furious and all I can manage is respect.'),
    s('Apex', '🐺', 0xffa060, 'The Wilds walk at your heel now, challenger. When the last door opens, the pack goes through first.'),
    v('Nine thrones. Keep collecting them. I will take them all back in one bite.'),
  ] },

  // ── The last five Sovereigns of the Normal Realm ──────────────────
  { id: 'boss-pre:soul', lines: [
    s('The Ferryman', '👻', 0xe8dcff, 'Everyone pays. Some pay twice. You look like a twice.'),
    h('He carried every soul the realms ever lost, and never once dropped a fare. What poles that skiff now skims something off each crossing. Do not stand in his river.'),
  ] },
  { id: 'boss-post:soul', lines: [
    s('The Ferryman', '👻', 0xe8dcff, 'The ledger balances. First time in an age. You have a credit, incidentally.'),
    s('The Ferryman', '👻', 0xe8dcff, 'When the last door opens, the river runs alongside you. No charge. Tell no one — it would ruin me.'),
  ] },
  { id: 'boss-pre:shadow', lines: [
    s('The Thing In The Maze', '🌑', 0xb98cff, 'Do not look for me. Just wait. I am better at both.'),
    h('The shadow was the realms\' most honest servant — it only ever showed you where the light stopped. The Voice taught it to move the stopping-place. Watch the walls.'),
  ] },
  { id: 'boss-post:shadow', lines: [
    s('The Thing In The Maze', '🌑', 0xb98cff, 'Found. Nothing has found me since the torches went out. It is… not unpleasant.'),
    s('The Thing In The Maze', '🌑', 0xb98cff, 'The dark walks with you now — one step behind, where it belongs. Call, when the last door opens.'),
  ] },
  { id: 'boss-pre:creation', lines: [
    s('The Architect', '⚒️', 0xffcf8a, 'I drew this room. And your exit. One of those drawings is finished.'),
    h('Half the beautiful things in every realm came off that drafting table. The commissions changed when the Voice became the client. Contest the construction sites.'),
  ] },
  { id: 'boss-post:creation', lines: [
    s('The Architect', '⚒️', 0xffcf8a, 'Structural failure. Mine. I have not been this delighted by a collapse in centuries.'),
    s('The Architect', '⚒️', 0xffcf8a, 'The Workshop retools for you tonight. When the last door opens, walk through something I built for the occasion.'),
  ] },
  { id: 'boss-pre:gravity', lines: [
    s('Singularity', '🌌', 0xc9a8ff, 'Nothing leaves. Attendance, at least, will be perfect.'),
    h('The Well held the realms in their orbits — a shepherd, not a jailer. The Voice taught it possessiveness. Mind when down changes its mind.'),
  ] },
  { id: 'boss-post:gravity', lines: [
    s('Singularity', '🌌', 0xc9a8ff, 'You left. Nothing leaves, and you left. I must sit with this.'),
    s('Singularity', '🌌', 0xc9a8ff, 'The Well pulls for you now. When the last door opens, I will hold everything else still while you work.'),
  ] },
  { id: 'boss-pre:sand', lines: [
    s('The Endless Minute', '⏳', 0xfff0a8, 'I will outlast you by definition. Sit. This takes a minute. The same one, repeatedly.'),
    h('Time kept every promise the realms ever made — that mornings follow nights, that wounds close. The Voice snapped its minute in half. It has been reliving the break since.'),
  ] },
  { id: 'boss-post:sand', lines: [
    s('The Endless Minute', '⏳', 0xfff0a8, 'The minute… ended. Do you know what comes after a minute? Neither do I. Show me.'),
    s('The Endless Minute', '⏳', 0xfff0a8, 'Every second I own stands with you. When the last door opens, take your time. Literally. It is yours.'),
    h('That is all fifteen thrones of the Normal Realm breathing again. The Abstract courts are next — and past them, the scar. The Voice has stopped gloating. I do not love that.'),
    v('…fifteen. Keep them. I kept seventeen better ones.'),
  ] },

  // ── Normal realm world-enter beats ────────────────────────────────
  { id: 'world-enter:water', lines: [
    h('The Drowned Court. Its Sovereign sang the tides; now the tide just… arrives, angry, on a schedule. Mind the riptide. It minds you.'),
  ] },
  { id: 'world-enter:life', lines: [
    h('The Verdant Court. Everything here still grows, which is the problem — the corruption grows too, and it learned gardening from the best.'),
  ] },
  { id: 'world-enter:air', lines: [
    h('The High Court. The wind used to carry my letters. Now it carries whatever the crosswind wants thrown. Keep your footing.'),
  ] },
  { id: 'world-enter:earth', lines: [
    h('The Deep Court. The mountains have opinions and the ceiling sheds them. The Sovereign below has not answered a knock in years.'),
  ] },
  { id: 'world-enter:oil', lines: [
    h('The Slick. Half industry, half swamp, all flammable. Watch where you stop — the ground remembers momentum here.'),
  ] },
  { id: 'world-enter:ice', lines: [
    h('The Long Winter\'s seat. The cold here is not weather any more; it is policy.'),
  ] },
  { id: 'world-enter:growth', lines: [
    h('The Culture. Life\'s ambitious little sibling. Everything here multiplies, including mistakes. Especially mistakes.'),
  ] },
  { id: 'world-enter:crystal', lines: [
    h('The Prism Court. Beautiful, sharp, and shedding — the facets fall like judgement. Do not stand under the sparkle.'),
  ] },
  { id: 'world-enter:hunt', lines: [
    h('The Wilds. The old Sovereign kept the balance between hunter and hunted. The new management removed the second category. Keep moving.'),
  ] },
  { id: 'world-enter:soul', lines: [
    h('The Vigil. The dead were always well-behaved here. Lately they mill about like they are waiting for a door to open. I did not ask which door.'),
  ] },
  { id: 'world-enter:shadow', lines: [
    h('The Dark Between Torches. The shadow was never evil, you understand — merely honest about what it covered. The light here fails in waves now. Count the troughs.'),
  ] },
  { id: 'world-enter:creation', lines: [
    h('The Workshop. The Maker\'s Court built half the beautiful things in every realm. The forges still run. What they produce now has teeth.'),
  ] },
  { id: 'world-enter:gravity', lines: [
    h('The Well. Down is negotiable here, and the centre of the room drives a hard bargain. Plant your feet when the pull starts.'),
  ] },
  { id: 'world-enter:sand', lines: [
    h('The Endless Minute. Time\'s court, where the metronome still keeps order — every few beats the whole world skips forward. Use the skips; they are not on your side by default.'),
  ] },

  // ── Abstract Sovereigns, tier 0–1 ─────────────────────────────────
  { id: 'boss-pre:electricity', lines: [
    s('The Storm Crown', '⚡', 0xfff8a8, 'The sky signed a contract with me. You are in breach of the sky.'),
    h('First throne of the Abstract Realm. It kept every current in every realm flowing on schedule — until the Voice bought out the contract. Read the pylons before they finish charging.'),
  ] },
  { id: 'boss-post:electricity', lines: [
    s('The Storm Crown', '⚡', 0xfff8a8, 'The contract is void. I drafted it under duress, you understand. The duress is under YOUR boot now. Satisfying.'),
    s('The Storm Crown', '⚡', 0xfff8a8, 'The Charged Court rules for you. When the last door opens, the sky arrives — properly notarised.'),
  ] },
  { id: 'boss-pre:slime', lines: [
    s('The Vat', '💚', 0xc8f56a, "Dissolve. It's cleaner. Everyone who argued is filtrate now."),
    h('The Dissolution rendered down everything the realms discarded and gave the useful parts back. The Voice rerouted the outflow. Do not stand in anything green — which here is a challenge.'),
  ] },
  { id: 'boss-post:slime', lines: [
    s('The Vat', '💚', 0xc8f56a, 'Insoluble. INSOLUBLE. Do you know how long it has been since anything was insoluble?'),
    s('The Vat', '💚', 0xc8f56a, 'The Vat pours for you now. When the last door opens, I will handle the cleanup. There is always cleanup.'),
  ] },
  { id: 'boss-pre:fate', lines: [
    s('The Dealer', '🃏', 0xd8fff0, 'The house does not lose. It merely waits. Take a seat — the wait is over.'),
    v('It dealt me a hand once. I ate the deck. It billed me.'),
    h('Fate ran an honest table, whatever the losers say. What deals now deals from a stacked shoe. Watch the cards that hold still.'),
  ] },
  { id: 'boss-post:fate', lines: [
    s('The Dealer', '🃏', 0xd8fff0, 'The house folds. Note the date. There will not be a plaque, but note the date.'),
    s('The Dealer', '🃏', 0xd8fff0, 'The Table backs your play from here to the end. When the last door opens — bet everything. It will be the correct odds for once.'),
  ] },
  { id: 'boss-pre:sound', lines: [
    s('The Crescendo', '🔊', 0xffc8ec, 'Everything ends on a note. Yours is in this programme. Near the back.'),
    h('Every anthem, every lullaby, every warning bell in every realm passed through this hall first. The Voice rewrote the programme to a single held note. End the concert.'),
  ] },
  { id: 'boss-post:sound', lines: [
    s('The Crescendo', '🔊', 0xffc8ec, '…that final chord. I did not write that. YOU wrote that. It was atrocious. Encore.'),
    s('The Crescendo', '🔊', 0xffc8ec, 'The hall plays for you now. When the last door opens, you will have the loudest entrance in history.'),
  ] },
  { id: 'boss-pre:light', lines: [
    s('The Solar Court', '✨', 0xffffff, 'Look up. That was your mistake. It is also the entire proceeding.'),
    h('The Bright kept every shadow in proportion — light as justice, strictly measured. The Voice fears it more than any of us, so it burned the scales first. Mind the beam that follows you.'),
  ] },
  { id: 'boss-post:light', lines: [
    s('The Solar Court', '✨', 0xffffff, 'Case dismissed. My own. You argued it in footwork. Exemplary.'),
    s('The Solar Court', '✨', 0xffffff, 'The Bright shines for you, challenger. When the last door opens, there will be no dark left for it to hide in.'),
    v('The little suns and songs align against me. Let them. I swallowed BETTER.'),
  ] },

  // ── Abstract Sovereigns, tier 2 ───────────────────────────────────
  { id: 'boss-pre:magnet', lines: [
    s('The Lodestone', '🔗', 0xff7a8a, 'North is wherever I say. Today, north is me. Come north.'),
    h('Every compass in every realm answered to it, and it never once lied to a traveller. The Voice taught it possession. Watch the colour of its poles — red gathers, blue scatters.'),
  ] },
  { id: 'boss-post:magnet', lines: [
    s('The Lodestone', '🔗', 0xff7a8a, 'You moved AGAINST the field. Repeatedly. On purpose. I must recalibrate everything I believe.'),
    s('The Lodestone', '🔗', 0xff7a8a, 'The Poles point for you now. When the last door opens, north will mean "forward".'),
  ] },
  { id: 'boss-pre:metal', lines: [
    s('The Iron Legion', '⚙️', 0xd8e0e8, 'One of me was always enough. Now count.'),
    h('The Foundry armed every honest cause the realms ever mustered — and disarmed the rest. The Voice did not corrupt its discipline; it corrupted its ORDERS. Find the gap in the shield wall.'),
  ] },
  { id: 'boss-post:metal', lines: [
    s('The Iron Legion', '⚙️', 0xd8e0e8, 'Stand down. Stand DOWN. …It obeyed. It has not obeyed me in years.'),
    s('The Iron Legion', '⚙️', 0xd8e0e8, 'The Legion marches under your standard now, challenger. When the last door opens — count US.'),
  ] },
  { id: 'boss-pre:plasma', lines: [
    s('The Unbound Star', '🔮', 0xe0a8ff, 'I stopped having a shape. It was holding me back. Yours is holding you back.'),
    v('It would not fit in my mouth. It is the only thing that has ever amused me.'),
    h('It was a sun once, briefly a court, currently a mood. Hit the part of it that hits back.'),
  ] },
  { id: 'boss-post:plasma', lines: [
    s('The Unbound Star', '🔮', 0xe0a8ff, 'Contained?! By FOOTWORK?! …I am not angry. I am impressed. These are the same temperature.'),
    s('The Unbound Star', '🔮', 0xe0a8ff, 'The Fourth State burns for you. When the last door opens, I will be every shape the fight requires.'),
  ] },
  { id: 'boss-pre:rubber', lines: [
    s('Uber-Gear', '🎾', 0xffb8c8, "There's more of me than there is of you. Elastically speaking, there's more of me than anything."),
    h('The Bounce kept the realms\' collisions survivable — every fall, every crash, softened somewhere by its work. The Voice wound it up and never let it release. Until now. Mind the ricochets.'),
  ] },
  { id: 'boss-post:rubber', lines: [
    s('Uber-Gear', '🎾', 0xffb8c8, 'You know what never bounces back? Whatever the Voice does to you. You know what does? ME. We are natural allies.'),
    s('Uber-Gear', '🎾', 0xffb8c8, 'The Bounce is with you. When the last door opens, whatever knocks you down had better have a plan for the way up.'),
  ] },
  { id: 'boss-pre:gunpowder', lines: [
    s('Final Ordinance', '💀', 0xffd88a, 'One last volley. Make it count. I always make it count.'),
    h('The Ordinance Yard ended wars — usually by being too loud to argue with. The Voice gave its last cannon a war that never ends. Cut the fuse before the spark arrives.'),
  ] },
  { id: 'boss-post:gunpowder', lines: [
    s('Final Ordinance', '💀', 0xffd88a, 'Cease fire. Genuinely. For the first time in living memory: cease fire.'),
    s('Final Ordinance', '💀', 0xffd88a, 'The Yard\'s last volley is yours to call now. When the last door opens, I will be the noise behind you.'),
    v('The armouries side with the vermin. Fine. My teeth were never metal.'),
  ] },

  // ── Abstract realm world-enter beats ──────────────────────────────
  { id: 'world-enter:electricity', lines: [
    h('The Storm Crown\'s seat. First of the abstract thrones. The static in the walls is not weather — it is the court still arguing.'),
  ] },
  { id: 'world-enter:slime', lines: [
    h('The Vat. Acid\'s court dissolved its own furniture years ago. The ceiling drips. Nothing that drips here is water.'),
  ] },
  { id: 'world-enter:fate', lines: [
    h('The Dealer\'s Table. Luck pools in a wandering ring on the floor — the house lets you stand in it precisely because the house always collects later.'),
  ] },
  { id: 'world-enter:sound', lines: [
    h('The Concert Hall. The Crescendo\'s court keeps a downbeat you can set a war by. Fight on the beat and your hands will thank you.'),
  ] },
  { id: 'world-enter:light', lines: [
    h('The Solar Court. Bright past the point of mercy. The sunlances strobe the edges — squint and keep to the shade that is not there.'),
  ] },
  { id: 'world-enter:magnet', lines: [
    h('The Lodestone\'s hall. The room flips polarity when it gets bored: pulled in, thrown out. It is always getting bored.'),
  ] },
  { id: 'world-enter:metal', lines: [
    h('The Iron Legion\'s foundry. The works above never stop; the shavings never stop falling. A hard hat would insult the problem.'),
  ] },
  { id: 'world-enter:plasma', lines: [
    h('The Unbound Star\'s orbit. Loose arcs wander in off the walls like stray dogs. Do not pet them.'),
  ] },
  { id: 'world-enter:rubber', lines: [
    h('The Bounce House. I wish I had a grander name for it. The walls give everything back with interest — including you.'),
  ] },
  { id: 'world-enter:gunpowder', lines: [
    h('The Ordinance Yard. Powder cooks off around the floor on fuses you can read, if you bother reading. Most visitors stopped bothering. Once.'),
  ] },
  { id: 'world-enter:echo', lines: [
    h('The Cavern. Echo\'s court hears everything twice and shows you nothing once — the dark here breathes in waves. Navigate by memory.'),
  ] },
  { id: 'world-enter:silence', lines: [
    h('The Hush. I will keep this brief, because this world dislikes being spoken about. It leans in, you understand. It is leaning in right now.'),
  ] },
  { id: 'world-enter:magic', lines: [
    h('The Archive Arcane. Raw leyline wanders the floor in a circle; stand in it and your spells come back to your hand early. The books are jealous of visitors. Move quickly.'),
  ] },
  { id: 'world-enter:technology', lines: [
    h('The Server Vault. The perimeter turrets have no allegiance settings. I asked. There was a form. The form fired at me.'),
  ] },
  { id: 'world-enter:subterfuge', lines: [
    h('The Family\'s territory. Subterfuge\'s court never fell to the Voice, exactly — they negotiated. Do not ask what they sold. Stand on insured ground when you can.'),
  ] },

  // ── The last five Abstract Sovereigns ─────────────────────────────
  { id: 'boss-pre:echo', lines: [
    s('The Cavern', '🦇', 0xf0f0ff, 'Follow the sound. I made it for you. I make ALL the sounds here.'),
    h('The Cavern kept every voice the realms ever raised, and returned them gently. The Voice filled it with its one endless syllable. When the sonar finds you — be somewhere else immediately after.'),
  ] },
  { id: 'boss-post:echo', lines: [
    s('The Cavern', '🦇', 0xf0f0ff, 'A new sound. A NEW sound. Do you know how long it has been? Do it again. The winning noise. Again.'),
    s('The Cavern', '🦇', 0xf0f0ff, 'The Returning Dark returns for you now. When the last door opens, your battle-cry arrives from every direction at once.'),
  ] },
  { id: 'boss-pre:silence', lines: [
    s('The Puppetmaster', '😶', 0xcbb8e8, 'Your hands were never yours. Watch them agree with me.'),
    h('I will keep this short — this hall eats words. Cut the strings. Do not watch the puppet; it moves exactly as well as you do.'),
  ] },
  { id: 'boss-post:silence', lines: [
    s('The Puppetmaster', '😶', 0xcbb8e8, '…'),
    s('The Puppetmaster', '😶', 0xcbb8e8, '…thank you.'),
    h('That is the most it has said in an age. The Hush is yours, challenger — and when the last door opens, the quiet walks in front of you, cutting strings.'),
  ] },
  { id: 'boss-pre:magic', lines: [
    s('The Archmage', '📖', 0xd8b8ff, 'Every school. All at once. Do keep notes — there will be an assessment.'),
    h('The Archive lent power to anyone who returned it on time. The Voice has ninety thousand overdue volumes. Watch the books — each school telegraphs in its own colour.'),
  ] },
  { id: 'boss-post:magic', lines: [
    s('The Archmage', '📖', 0xd8b8ff, 'Remarkable. Unlettered, uncited, and CORRECT. I am adding you to the curriculum.'),
    s('The Archmage', '📖', 0xd8b8ff, 'The Archive opens its restricted section for you. When the last door does the same, every spell ever written answers your call.'),
  ] },
  { id: 'boss-pre:technology', lines: [
    s('The Swarm Protocol', '💻', 0xa8f0e0, 'One instance was never the plan. Loading the plan. The plan is instances.'),
    h('The Vault automated everything the realms found tedious, and asked nothing in return but uptime. The Voice is, in its words, "an unpatched vulnerability with legs". Contest the deploy pads.'),
  ] },
  { id: 'boss-post:technology', lines: [
    s('The Swarm Protocol', '💻', 0xa8f0e0, 'Incident report: root cause, you. Remediation: alliance. Status: deployed.'),
    s('The Swarm Protocol', '💻', 0xa8f0e0, 'The fleet acknowledges your authority. When the last door opens, so do several thousand parallel sessions of me.'),
  ] },
  { id: 'boss-pre:subterfuge', lines: [
    s('The Kingpin', '🕴️', 0xff9aa2, 'You were hired to lose. The cheque cleared this morning. Professional courtesy says: lie down.'),
    v('This one I did not eat. We had an ARRANGEMENT. It is about to lapse.'),
    h('The Family never fell to the Voice — they negotiated, and nobody has seen the contract. Beat the terms out of him. Mind the coins; everything they give costs more later.'),
  ] },
  { id: 'boss-post:subterfuge', lines: [
    s('The Kingpin', '🕴️', 0xff9aa2, 'The arrangement with the thing downstairs? Void. It was leverage, kid. You just became better leverage.'),
    s('The Kingpin', '🕴️', 0xff9aa2, 'The Family backs you now — every safehouse, every favour, every associate. When the last door opens, you will not walk through it alone.'),
    h('Thirty thrones. Both realms, breathing. The scar in the abstract sky is wide open now — and what is left beyond it are the seventeen the Voice ate FIRST. They have waited longest. Go get them.'),
    v('COME, then. Come meet the ones I kept. They are not grateful. They are DIGESTED.'),
  ] },

  // ── Corrupt realm world-enter beats ───────────────────────────────
  { id: 'world-enter:ruin', lines: [
    h('The Rubble Gate — the Corrupt Realm\'s broken heart. Ruin was the first exile: an element whose only gift was ending things. The trial called that a flaw. Look around and tell me it was wrong.'),
    v('It was the first thing I ate. It barely struggled. It was grateful.'),
  ] },
  { id: 'world-enter:death', lines: [
    h('The Undertaker\'s parish. Death was exiled for being inevitable — the courts found that rude. It kept working anyway. The bell counts whoever lingers.'),
  ] },
  { id: 'world-enter:illusion', lines: [
    h('The Cracked Stage. Illusion was cast out for lying, which was hypocrisy of the highest order. Nothing here agrees with itself about being visible. Blink often.'),
  ] },
  { id: 'world-enter:conquest', lines: [
    h('The Warmaster\'s march. Conquest was exiled for wanting everything, and took the exile as territory. There is one patch of high ground here worth holding. Both of you will know it on sight.'),
  ] },
  { id: 'world-enter:gluttony', lines: [
    h('The Devouring Board. Gluttony was cast out for hunger, and then the Voice arrived — imagine the reunion. The kitchen floor spits grease. The menu is you.'),
  ] },
  { id: 'world-enter:cloth', lines: [
    h('The Torn Hall. Cloth was exiled for mending too well — it sewed the realm shut, doors and all, and never once asked whether a thing wanted closing. The floor is still full of needles. They still go off.'),
  ] },
  { id: 'world-enter:bind', lines: [
    h('The Gaol. Bind was exiled for holding on. The chains haul everything toward the centre on a cycle — including debts, grudges, and you.'),
  ] },
  { id: 'world-enter:paper', lines: [
    h('The Records Hall. Paper kept the minutes of the trial that exiled it. It has been editing them ever since. Mind the margins; they cut.'),
  ] },
  { id: 'world-enter:chalk', lines: [
    h('The Blackboard. Chalk drew worlds it was never allowed to make real. Out here, no one is checking. The board wipes itself in waves — whole seconds go unreadable.'),
  ] },
  { id: 'world-enter:psychic', lines: [
    h('The Overmind\'s parlour. Psychic was exiled for knowing how the vote would go before it was cast. The room throbs with its one enormous idea. Try not to be underneath it.'),
  ] },
  { id: 'world-enter:passion', lines: [
    h('The Jilted Court. Passion was cast out for burning too hot to govern. The floor keeps a heartbeat, and on every beat your hands hurry. It wants the fight to be beautiful. Oblige it.'),
  ] },
  { id: 'world-enter:dune', lines: [
    h('The Hall of Haze. Sand kept a perfect picture of the realm before the fall, painted in heat, and lives in it. The slope above sheds in slabs. The rings mark the drop.'),
  ] },
  { id: 'world-enter:fortune', lines: [
    h('The Counting House. Fortune was exiled for winning too often, wagered the realm would fall, and collected. A jackpot ring roams the floor. It pays out to whoever stands their ground in it.'),
  ] },
  { id: 'world-enter:magma', lines: [
    h('The Caldera. Magma was exile\'s own temper: pressure with nowhere polite to go. Every plate on this floor has a grievance. They vent on a schedule.'),
  ] },
  { id: 'world-enter:radiation', lines: [
    h('The Exclusion Zone. Radiation was cast out for giving too generously. The fallout drifts in constantly. The signs said keep out. You are why there are signs.'),
  ] },
  { id: 'world-enter:depths', lines: [
    h('The Trench. The Depths were exiled for keeping what the surface dropped. The undertow inhales on a cycle — everything drifts toward the dark, and the dark has a lure out.'),
  ] },
  { id: 'world-enter:gum', lines: [
    h('The Ooze. Slime was cast out for engulfing a magistrate — in fairness, the magistrate started it. The floor keeps whatever momentum you bring. Budget accordingly.'),
  ] },

  // ── Corrupt Sovereigns ────────────────────────────────────────────
  // The exiles were eaten first and have had the longest to think about it.
  // None of them are grateful to be freed; all of them come anyway.
  { id: 'boss-pre:ruin', lines: [
    s('The Wrecking Crown', '🚧', 0xff8a6a, 'Every wall I ever raised, I was also aiming.'),
    v('THIS one was first. It opened for me. It is an element of opening.'),
    h('Ruin was the first exile and the first meal. Watch the pillars: they choose which way to fall at the last possible moment, and never before.'),
  ] },
  { id: 'boss-post:ruin', lines: [
    s('The Wrecking Crown', '🚧', 0xff8a6a, 'Nothing I ever built stood. I had assumed that was the point of me.'),
    s('The Wrecking Crown', '🚧', 0xff8a6a, 'Take the demolition, challenger. When the last door opens, I will bring it down for you personally.'),
    h('The heart of the scar is beating again. Sixteen exiles left, and they are all listening now.'),
  ] },
  { id: 'boss-pre:death', lines: [
    s('The Undertaker', '⚰️', 0xb9a9e8, 'I buried the Sovereigns myself. I kept the measurements.'),
    h('Death never fell so much as it kept working under new management. It will take your measurements — do not be inside them when it finishes. And keep moving; the bell counts whoever lingers.'),
  ] },
  { id: 'boss-post:death', lines: [
    s('The Undertaker', '⚰️', 0xb9a9e8, 'You are the first appointment in an age I have been glad to cancel.'),
    s('The Undertaker', '⚰️', 0xb9a9e8, 'When the last door opens I will come, and I will bring the ledger, and I will be looking up somebody ELSE\'s name.'),
  ] },
  { id: 'boss-pre:illusion', lines: [
    s('The Final Curtain', '🎭', 0xe0b0ff, 'Bow. The realm is watching what it used to be.'),
    h('The company all died and it kept the whole cast anyway. Its lies are visibly lies — painted shots flicker, painted floor is a shade off. It is betting you will not look.'),
  ] },
  { id: 'boss-post:illusion', lines: [
    s('The Final Curtain', '🎭', 0xe0b0ff, 'An honest audience at last. You watched. Nobody has WATCHED in an age.'),
    s('The Final Curtain', '🎭', 0xe0b0ff, 'The company is yours. When the last door opens, you will not be the only one of you walking through it.'),
  ] },
  { id: 'boss-pre:conquest', lines: [
    s('The Warmaster', '🏰', 0xff9a6a, 'I lost one war in my life. I am wearing what won.'),
    h('Conquest took its exile and annexed it. Do not duel it — it plays the board. Claimed ground burns; the shield wall always has exactly one gap.'),
  ] },
  { id: 'boss-post:conquest', lines: [
    s('The Warmaster', '🏰', 0xff9a6a, 'Ground ceded. I have ceded ground precisely once before and I married her.'),
    s('The Warmaster', '🏰', 0xff9a6a, 'My levy answers to you now. When the last door opens, you will not be outnumbered again.'),
  ] },
  { id: 'boss-pre:gluttony', lines: [
    s('The Devouring Board', '🍖', 0xffb07a, 'A feast is only a war you eat.'),
    v('That one and I have an understanding. We both know what the realms are FOR.'),
    h('It eats to heal — every plate it reaches is health back. Get there first and it costs the Board instead. And mind the floor; it is on the menu too.'),
  ] },
  { id: 'boss-post:gluttony', lines: [
    s('The Devouring Board', '🍖', 0xffb07a, 'You took food off my table. Do you know how long since anyone DARED?'),
    s('The Devouring Board', '🍖', 0xffb07a, 'The thing downstairs eats and never sets a place. I set two. When the last door opens, sit down and we will eat IT.'),
  ] },
  { id: 'boss-pre:cloth', lines: [
    s('Backstitch', '🧣', 0xf5788c, 'You have come loose. Hold still. I will put you back.'),
    h('Cloth mended this realm shut and did not notice the difference. A knot only draws tight before it snaps — that is the warning, not the wound. And the hem always leaves one stitch out.'),
  ] },
  { id: 'boss-post:cloth', lines: [
    s('Backstitch', '🧣', 0xf5788c, 'Not a tear. Not a tear. I have been wrong for an age and I have been neat about it.'),
    s('Backstitch', '🧣', 0xf5788c, 'Then the thing beneath the worlds is the tear. When the last door opens I will finally have something worth sewing.'),
  ] },
  { id: 'boss-pre:bind', lines: [
    s('The Gaoler', '⛓️', 0xffe9a0, 'Every cell in this realm has a name on it. Yours is fresh.'),
    h('Bind holds; it does not stop you. The tether pulls at less than a walk — lean against it. Every cell it builds is missing a bar, and it will not tell you which.'),
  ] },
  { id: 'boss-post:bind', lines: [
    s('The Gaoler', '⛓️', 0xffe9a0, 'Held for an age by a thing that does not even have HANDS. And you undid it in an afternoon.'),
    s('The Gaoler', '⛓️', 0xffe9a0, 'Every chain in the realm is yours. When the last door opens, I will hold whatever you point at.'),
  ] },
  { id: 'boss-pre:paper', lines: [
    s('The Chronicler', '📄', 0xf2ead6, 'History is whatever survives the edit. You will not.'),
    h('Paper took the minutes of its own trial and has been improving them ever since. When it writes the next line, be ON the line — everything off it is simply not in the record.'),
  ] },
  { id: 'boss-post:paper', lines: [
    s('The Chronicler', '📄', 0xf2ead6, 'I have struck out four hundred years of my own account. It was all lies and I wrote every word.'),
    s('The Chronicler', '📄', 0xf2ead6, 'I will write this one straight. When the last door opens, the record will say you were not alone.'),
  ] },
  { id: 'boss-pre:chalk', lines: [
    s('The Draughtsman', '🖍️', 0xffffff, 'You are a rough sketch. I am the fair copy.'),
    h('Chalk was never allowed to make anything real, and out here nobody is checking. It draws every creature in front of you before it lets it move — that second and a half is the whole fight.'),
  ] },
  { id: 'boss-post:chalk', lines: [
    s('The Draughtsman', '🖍️', 0xffffff, 'I have drawn you badly. Repeatedly. Stand there — I want to do it PROPERLY.'),
    s('The Draughtsman', '🖍️', 0xffffff, 'The board is yours. When the last door opens I will draw us an army, and this time I will make it real.'),
  ] },
  { id: 'boss-pre:psychic', lines: [
    s('The Overmind', '👁️', 0xd8b0ff, 'One of us is imagining the other. Care to check?'),
    h('It fires where you are going to be, and shows you the shot first. That premonition is a straight line out of your own momentum — turn, and it has wasted a turn.'),
  ] },
  { id: 'boss-post:psychic', lines: [
    s('The Overmind', '👁️', 0xd8b0ff, 'I ran this four thousand times. In none of them did you turn LEFT there.'),
    s('The Overmind', '👁️', 0xd8b0ff, 'I cannot read the thing beneath — it has no future tense. But I can read everything else. When the last door opens, you will know what is coming.'),
  ] },
  { id: 'boss-pre:passion', lines: [
    s('The Heartbreaker', '💘', 0xffc0dc, 'I will cherish the memory of this. You will not have one.'),
    h('The court keeps a heartbeat and so does the fight — the metronome is a fixed bar, learn it. When it attaches to you, distance is the only thing that severs it.'),
  ] },
  { id: 'boss-post:passion', lines: [
    s('The Heartbreaker', '💘', 0xffc0dc, 'You LEFT. Everyone leaves. Nobody has ever left and then come back up the stairs for me.'),
    s('The Heartbreaker', '💘', 0xffc0dc, 'When the last door opens, I will be the thing in front of you, burning. Try to be worth it.'),
  ] },
  { id: 'boss-pre:dune', lines: [
    s('The Miragewright', '🏜️', 0xf7e2b4, 'I kept a picture of the realm before it fell. You are standing in it.'),
    h('A mirage cannot lie about geometry: the bent beam draws its whole path before any of it is hot. The double copies you — so stop doing the thing it is copying.'),
  ] },
  { id: 'boss-post:dune', lines: [
    s('The Miragewright', '🏜️', 0xf7e2b4, 'The picture is scattered. Good. It was a lovely room and nobody ever lived in it.'),
    s('The Miragewright', '🏜️', 0xf7e2b4, 'I will hold a true one for you instead. When the last door opens, the light in there will bend the way you need it to.'),
  ] },
  { id: 'boss-pre:fortune', lines: [
    s('The Broker of Ruin', '💰', 0xffe08a, 'The house always wins. I bought the house.'),
    h('Fortune shorted the realm and collected. The jackpot ring pays whoever is standing in it — if neither of you is, the house keeps it. Contest every single one.'),
  ] },
  { id: 'boss-post:fortune', lines: [
    s('The Broker of Ruin', '💰', 0xffe08a, 'You beat the house. Nobody beats the house. I am going to need a moment and a very stiff drink.'),
    s('The Broker of Ruin', '💰', 0xffe08a, 'I am moving my position. When the last door opens, everything I own is riding on YOU. Do not make me look stupid.'),
  ] },
  { id: 'boss-pre:magma', lines: [
    s('The Caldera King', '🌋', 0xffd06a, 'The realm cracked open and I was what leaked out.'),
    h('Magma is honest pressure: every plate glows before it vents, and the flow leaves cooled crust behind it — the safest ground in the fight is directly where it has already been.'),
  ] },
  { id: 'boss-post:magma', lines: [
    s('The Caldera King', '🌋', 0xffd06a, 'Pressure down. First time in an age. It is almost peaceful. I hate it.'),
    s('The Caldera King', '🌋', 0xffd06a, 'When the last door opens I will vent through it. Stand behind me and stay on the crust.'),
  ] },
  { id: 'boss-pre:radiation', lines: [
    s('The Halflife Court', '☢️', 0xd8ffb0, 'My kingdom decays at a fixed rate. Guests decay faster.'),
    h('Radiation keeps a running total on you — that bar over your head is dose, and clean floor is the only cure. Everything else it does is a reason to be standing somewhere dirty.'),
  ] },
  { id: 'boss-post:radiation', lines: [
    s('The Halflife Court', '☢️', 0xd8ffb0, 'Below threshold. I have not been below threshold since before the trial.'),
    s('The Halflife Court', '☢️', 0xd8ffb0, 'What is left of me is yours. When the last door opens, I will give until there is nothing of it left at all.'),
  ] },
  { id: 'boss-pre:depths', lines: [
    s('The Sunken Throne', '🐟', 0x7ce8f0, 'Crowns sink. Mine simply arrived first.'),
    h('The undertow inhales on a count you can learn. And that light out in the dark is a lure — the teeth are drawn behind it the entire time, if you look.'),
  ] },
  { id: 'boss-post:depths', lines: [
    s('The Sunken Throne', '🐟', 0x7ce8f0, 'You did not follow the light. In an age of visitors, nobody has not followed the light.'),
    s('The Sunken Throne', '🐟', 0x7ce8f0, 'Everything the realms ever dropped is down here, and I am bringing all of it. When the last door opens, the trench comes with you.'),
  ] },
  { id: 'boss-pre:gum', lines: [
    s('The Ooze Eternal', '🤢', 0xb8ff9a, 'The realm fell into me. It is still falling.'),
    h('The last throne in the scar. The tack costs speed long before health, and the bubble is the most obvious thing in the realm — under it is the safe part.'),
    v('the last one. after this there is only ME, and what I have MADE of them.'),
  ] },
  { id: 'boss-post:gum', lines: [
    s('The Ooze Eternal', '🤢', 0xb8ff9a, 'It lets go. I have never once let go. It feels like being outdoors.'),
    h('Forty-seven thrones. Every Sovereign in every realm, breathing, and every one of them owes you. Look at the middle of the map, challenger — something down there has been stitching itself together the whole time you worked.'),
    v('I ATE THEM FIRST. What you freed are the LEFTOVERS. Come and meet what I made of the rest.'),
  ] },

  // ── The Amalgam ───────────────────────────────────────────────────
  { id: 'boss-pre:amalgam', lines: [
    h('Forty-seven thrones. Every Sovereign in every realm standing behind you, and not one of them will go first — they have all met this before, and they all lost.'),
    v('I AM THE COURT. All of it. Every throne you knelt at, I have already been wearing.'),
    s('The Amalgam', '🕳️', 0xff6a7a, 'You have fought me forty-seven times. You simply did not know you were doing it.'),
    h('It has no moves of its own but one. Everything else it throws, you have already survived once. Survive it in any order it likes.'),
  ] },
  { id: 'boss-post:amalgam', lines: [
    s('The Amalgam', '🕳️', 0xff6a7a, 'the… the stitches. who is holding the stitches. who is holding—'),
    v('…i was going to be all of it…'),
    h('It is coming apart into what it was made of. Do not look away — that is forty-seven Sovereigns walking back to their own worlds, in order, taking their own faces with them.'),
    s('The Archfiend', '🔥', 0xffb347, 'Every hearth in every realm relit. Including some that had been out since before the trial.'),
    s('The Wrecking Crown', '🚧', 0xff8a6a, 'And nothing is scheduled. For the first time in an age, NOTHING is scheduled.'),
    h('The Hollow Court is not hollow. There is a Sovereign on every throne and none of them are being spoken through. That has not been true in my entire memory, and my memory is the realms.'),
    h('Go where you like, challenger. The doors are all open, they all lead somewhere, and every single one of them has somebody behind it who owes you.'),
    h('…though not all of them are doors. Look behind you. Where the Amalgam was standing, there is a seal, and the seal is older than the corruption that was leaning on it.'),
    v('…don\'t. i was keeping it shut. i was the only thing keeping it—'),
    h('Forty-two elements answer to a throne. This is the forty-third, and it never did. It was sealed because it refused to be any one thing: put two elements to it and it will be both, and change between them on a whim.'),
    s('The Amalgam', '🕳️', 0xff6a7a, 'i stitched forty-seven of them together and it was still more than me…'),
    h('QUANTUM is yours. It brings nothing of its own — no abilities, no attacks, nothing to learn. It brings whatever you bond to it. Take it to the Entanglement Lab and teach it a pair.'),
  ] },
];

const BY_ID = new Map(beats.map((b) => [b.id, b]));

export function getStoryBeat(id: string): StoryBeat | undefined {
  return BY_ID.get(id);
}

/**
 * Every beat id that exists. The cheat save marks the lot as seen — its campaign is already
 * finished, so replaying the dialogue in front of a tester is noise, not story.
 */
export function getAllStoryBeatIds(): string[] {
  return beats.map((b) => b.id);
}
