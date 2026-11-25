/**
 * Everything said during the unrest. Courts did not get sixty hand-written riots: the people in them say
 * these, keyed by what is happening (a revolt brewing, the court gone to anarchy) and flavoured by the isle —
 * each isle's rebels want something of that isle's fallen tyrant back.
 *
 * `{court}` the court's name, `{prince}` its fallen prince, `{isle}` the isle, `{monarch}` its fallen ruler.
 */

export interface IsleUnrestVoice {
  /** What the agitators on this isle are selling. Ends a revolt challenge. */
  creed: string;
  /** What the ringleader calls themself here. */
  leaderTitle: string;
  /** A townsperson, during anarchy. */
  cower: string;
  /** The wanderer, during a revolt. */
  wandererRevolt: string;
  /** The wanderer, during anarchy. */
  wandererAnarchy: string;
}

export const ISLE_VOICES: Record<string, IsleUnrestVoice> = {
  fire: {
    creed: 'A brand told you who you were. Ask this lot who they are now. They do not know — and I do.',
    leaderTitle: 'the Unbranded King',
    cower: 'The Brand-King burned one mark into us. These ones burn everything else.',
    wandererRevolt: 'Someone is handing out irons again, and calling it belonging. It is a short road from that to a brand.',
    wandererAnarchy: 'I have seen this smoke before. Last time it had a crown on it. This time it does not even have that.',
  },
  water: {
    creed: 'The Queen kept the tide tables. Now nobody does, and the sea takes who it likes. I will keep them.',
    leaderTitle: 'the Tide-Thief',
    cower: 'They cut the mooring lines for fun. Every boat we had is somewhere out past the reef.',
    wandererRevolt: 'They are saying the Undertow was fair, because it drowned everyone the same. That is how it starts.',
    wandererAnarchy: 'The harbour bell is in the harbour. Somebody rolled it off the quay to hear the splash.',
  },
  life: {
    creed: 'The Empress pruned. That was cruel. But look at it now — all weed. A garden wants a gardener.',
    leaderTitle: 'the Weed-Crowned',
    cower: 'They pulled up the seed stores to see what was underneath. There is no planting this year.',
    wandererRevolt: 'A man with shears is telling folk the wild needs tidying. He has not said who gets tidied.',
    wandererAnarchy: 'Everything is trampled. It will grow back — it always does here — but it will not grow back the same.',
  },
  air: {
    creed: 'He taxed our breath, yes. And every lung on this isle was counted, and none went missing. Count yours tonight.',
    leaderTitle: 'the Second Wind',
    cower: 'They are cutting the tether-lines. Half the upper terraces have already drifted.',
    wandererRevolt: 'They want the breath-ledgers reopened. "Just to know who is here." You know how that ends.',
    wandererAnarchy: 'Nobody is selling air any more. Nobody is fixing the bellows either. Stay off the high walks.',
  },
  earth: {
    creed: 'The Regent buried what would not stand still. Dig up a few and ask if they were so wrong to.',
    leaderTitle: 'the Gravel Regent',
    cower: 'They broke open the props for firewood. Mind the east gallery. Mind all of it.',
    wandererRevolt: 'They have started a list of who "would not stand still". The Burier kept a list like that.',
    wandererAnarchy: 'This is what the Regent said would happen without him. I hate that he gets to have been right for a week.',
  },
  electricity: {
    creed: 'The Grid was a leash. It was also every light on this isle. I am offering the lights back.',
    leaderTitle: 'the Live Wire',
    cower: 'They pulled the breakers out to sell the copper. It has been dark for three nights.',
    wandererRevolt: 'Somebody is promising to switch the Draw back on, "only a little". There is no little.',
    wandererAnarchy: 'Do not touch anything that hums. Nobody is earthing anything any more.',
  },
  slime: {
    creed: 'The Matriarch marked the ones she meant to keep. Unmarked, you are nobody\'s. Come and be somebody\'s.',
    leaderTitle: 'the Shed Skin',
    cower: 'They got into the antivenin stores. For the bottles. They poured it out for the bottles.',
    wandererRevolt: 'They are painting the Mark on doors again. Chalk, this time. It was chalk last time too, at first.',
    wandererAnarchy: 'Boil the water. Then do not drink it anyway.',
  },
  fate: {
    creed: 'The House always won. So you always knew who to hate. Who do you hate now? Let me deal you somebody.',
    leaderTitle: 'the House\'s Cut',
    cower: 'They broke the lots-drum open and now everybody has a winning ticket, so nobody does.',
    wandererRevolt: 'A fellow with a marked deck is offering "one fair draw to settle who runs things". He is dealing.',
    wandererAnarchy: 'Every debt on this isle got called in at once. That is all this is. A very loud audit.',
  },
  sound: {
    creed: 'He wrote every part. It was a prison. It was also in tune. Listen to this isle now and tell me you prefer it.',
    leaderTitle: 'the Off-Beat',
    cower: 'They are ringing every bell at once so nobody can call for help over it.',
    wandererRevolt: 'They are handing out sheet music on the corners. One tune, everyone, by sundown. I have heard this piece.',
    wandererAnarchy: 'You cannot hear yourself think in there. I believe that is what it is for.',
  },
  light: {
    creed: 'The Noon bleached people clear, I know. And in all that light nobody could hide anything. I miss being able to see.',
    leaderTitle: 'the False Dawn',
    cower: 'They smashed the lamps "so nobody could be watched". Now it is the watching they do in the dark.',
    wandererRevolt: 'They want one great lamp lit again. "A small noon." There is no such thing as a small noon.',
    wandererAnarchy: 'So this is dusk. We fought for dusk. I had hoped it would be quieter.',
  },
};

export const DEFAULT_VOICE: IsleUnrestVoice = {
  creed: 'The crown is off and nobody picked it up. I am only picking it up.',
  leaderTitle: 'the Uncrowned',
  cower: 'Please — I have nothing. They already took it.',
  wandererRevolt: 'There is somebody on a crate telling people what they are owed. Never a good sign.',
  wandererAnarchy: 'It was meant to be better than this.',
};

// ── Names ──────────────────────────────────────────────────────────────

export const REBEL_FIRST = [
  'Corvin', 'Hesper', 'Maddock', 'Idony', 'Rusk', 'Thessaly', 'Garrow', 'Pell', 'Orsolya', 'Wick', 'Brannoch', 'Sidony',
  'Tamsin', 'Leofric', 'Marrin', 'Dunstan', 'Quill', 'Isaura', 'Harrow', 'Odette', 'Fenwick', 'Malva', 'Stroud', 'Avice',
  'Kester', 'Lorne', 'Briony', 'Halvard', 'Senna', 'Crispin', 'Yarrow', 'Morwen', 'Tobiah', 'Elspet', 'Rooke', 'Linnet',
];
export const REBEL_LAST = [
  'Blackthumb', 'Ashlar', 'Coldiron', 'Greaves', 'Marlowe', 'Stoke', 'Pennywhistle', 'Varrick', 'Underwood', 'Hale', 'Crake',
  'Sallow', 'Thorne', 'Redcap', 'Mossop', 'Dray', 'Kettleby', 'Grimsditch', 'Fallow', 'Oxley', 'Sharpe', 'Tolliver', 'Wren',
];
export const AGITATOR_TITLES = ['Agitator', 'Firebrand', 'Pamphleteer', 'Rabble-Rouser', 'Stump-Speaker', 'Crier'];
export const INSURGENT_TITLES = ['Insurgent', 'Torchbearer', 'Cudgel', 'Looter', 'Barricader', 'Hooligan', 'Breaker', 'Cutpurse'];

// ── Fighters' words ────────────────────────────────────────────────────

/** The first lines of a revolt's challenge; the isle's creed follows. */
export const REVOLT_OPENERS: string[][] = [
  ['You. The one who emptied {prince}\'s chair.', 'Did you think a chair stays empty? Look at this crowd. They want somebody in it.'],
  ['{court} is free. Free to do what? Nobody told them. So I am telling them.', 'And you are the only one here who might say otherwise.'],
  ['They cheered when {prince} went down. They are cheering me now. Same people, same hands.', 'Step off, liberator. This part is not yours.'],
  ['Every tyrant on {isle} is gone and the bread costs the same. People noticed.', 'I only had to say it out loud.'],
  ['I was nothing under {prince}. I intend to be something under nobody.', 'You are standing between me and that.'],
  ['You broke the lock and walked off. Somebody has to hold the door.', 'I have decided it is me. Come and argue it.'],
];
export const REVOLT_BEATEN = [
  'All right. All right! Tell them I said go home.',
  'They only listened because nobody else was talking.',
  'You win. Stay, this time. That is all any of them wanted.',
];

export const INSURGENT_CHALLENGE: string[][] = [
  ['This street is ours. That one too. Ask anyone — if you can find anyone.'],
  ['The liberator! Come to liberate us again? We liked the first one so much we kept going.'],
  ['Nobody is in charge. Do you know how good that feels? You are about to spoil it.'],
  ['Turn out your pockets and you can walk through. No? Suit yourself.'],
  ['{prince} would have had my hands for this. {prince} is not here.'],
  ['I am not with anybody. I am just here while the windows last.'],
  ['You look like someone who thinks this can be put back. Come and try.'],
  ['The boss says nobody gets past. I do not know what past is, but you are not getting it.'],
];
export const INSURGENT_BEATEN = [
  'I am going, I am going.',
  'It was not even my idea.',
  'Fine. Keep your street.',
  'Tell the boss I held you up a bit.',
];

export const LEADER_HIDDEN = ['(The ringleader will not show while their people still hold the streets — {n} left.)'];
export const LEADER_CHALLENGE: string[][] = [
  ['So you went through my people one at a time. Good. I was tired of sharing.', 'They called {prince} a tyrant for wanting {court}. I only want it more honestly.', 'Bring the banner!'],
  ['Look at it. Burning, broken, and mine. Nobody gave me {court} — that is the difference between me and a prince.', 'You gave it away once already. You do not get to do it twice.', 'Rally! Rally to me!'],
  ['You freed this court and left. I stayed. Tell me which of us it belongs to.', 'No — do not tell me. Show the crowd.', 'Banner up!'],
];
export const LEADER_BEATEN = ['It was never going to hold. I knew that. I wanted it anyway.'];

// ── The townsfolk ──────────────────────────────────────────────────────

/** Anyone in a court in anarchy, cowering. One of these, then (sometimes) the isle's own line. */
export const COWER_LINES = [
  'Do not — oh. It is you. Keep your voice down, they will hear.',
  'I am not here. You did not see me. Please.',
  'Is it over? It is not over. I can still hear them.',
  'We were free for a little while. I want you to know it was good, while it was.',
  'They took the shutters for the barricades. Then the door.',
  'I have been behind this crate since yesterday. It is a good crate.',
  'You beat a prince. Surely you can beat a street? Please beat the street.',
  'Get the ones who are roaming first. The one in charge will not come out until they are gone.',
];
/** A shopkeeper or baker in a court in anarchy, instead of their counter. */
export const CLOSED_LINES = [
  'Closed. Looted, mostly, and what is left I am sitting on. Come back when {court} is quiet.',
  'No trade today. No trade until that ringleader is off the square.',
  'The counter is firewood. Ask the one in the hood, if you must buy — but mind what it costs you.',
];
/** Anyone in a court in revolt, before their usual talk. */
export const UNEASY_LINES = [
  'Have you heard them, up by {prince}\'s old seat? Somebody ought to shut that one up before it spreads.',
  'There is a speaker in the square saying we were better off. People are nodding. I do not like the nodding.',
  'It is only talk so far. It was only talk before {prince}, too.',
  'If that agitator is still shouting in a few days, I am boarding the windows.',
];
/** Crowd barks in a court in revolt. */
export const REVOLT_BARKS = [
  'Did you hear what they are saying in the square?',
  'I am not picking a side. I am picking a cellar.',
  'It will blow over. It will. Will it?',
  'Somebody fetch the one who beat {prince}.',
  'Keep walking. Do not look at the crate-speaker.',
];

// ── The dealer ─────────────────────────────────────────────────────────

/** The dark market's keeper: business only. */
export const DEALER_LINES = [
  ['Charms. The ones you know, improved. Every one of them takes something back — it says what, on the tag.', 'I am only here while the street is like this. When it is quiet, so am I.'],
  ['Same goods as the shop that used to be over there. Stronger. Each has a price past the coins: read it before you pay.'],
  ['Buying? What I sell works. What it costs you is written right under what it does.', 'I pack up the day this court is put back in order.'],
];
