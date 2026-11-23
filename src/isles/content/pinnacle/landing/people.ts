import type { Cond, NpcDef, Pt, Talk } from '../../../IslesTypes';
import { KING_ID } from '../spec';

/**
 * The Muster — the ten wanderers the player met on ten isles, come to the foot of the spire in ten
 * boats when the Shroud broke, and the three camp hands who came with them.
 *
 * Every wanderer has finished their own story on their own isle; here they are only themselves, on a
 * glass beach, waiting. Their blocks track the climb: arrival, a third of the Council down
 * (`{ seats: 20 }`), two thirds (`{ seats: 40 }`), every seat (`{ seats: 60 }`), and after the King
 * (`{ monarch: 'obsidian-king' }`) — listed most specific first.
 */

const KING: Cond = { monarch: KING_ID };
const S20: Cond = { seats: 20 };
const S40: Cond = { seats: 40 };
const S60: Cond = { seats: 60 };

/** One wanderer's five beats, most specific first. */
const beats = (arrive: string[], third: string[], twoThirds: string[], all: string[], after: string[]): Talk[] => [
  { when: KING, lines: after },
  { when: S60, lines: all },
  { when: S40, lines: twoThirds },
  { when: S20, lines: third },
  { lines: arrive },
];

// ── Where everybody stands ───────────────────────────────────────────

export const AT = {
  tamsin: { x: 500, y: 1100 },
  odo: { x: 220, y: 1274 },
  wendeline: { x: 380, y: 848 },
  barnaby: { x: 690, y: 592 },
  gideon: { x: 800, y: 482 },
  wren: { x: 962, y: 802 },
  tansy: { x: 1470, y: 502 },
  marlo: { x: 1530, y: 818 },
  lark: { x: 1880, y: 638 },
  sable: { x: 2050, y: 892 },
  dock: { x: 1326, y: 1302 },
  stores: { x: 2080, y: 1186 },
  kitchen: { x: 1680, y: 1122 },
} satisfies Record<string, Pt>;

export const PIN_LANDING_NPCS: NpcDef[] = [
  // ── Tamsin Coalwhistle (Brandmark) — the tinker cart ──────────────
  {
    id: 'pin-tamsin', name: 'Tamsin Coalwhistle', title: 'Travelling Tinker', at: AT.tamsin,
    look: { body: 0xc09878, accent: 0x5a4a3a, hand: 0x3a2a22, hat: 'goggles', traits: ['pack', 'scarf', 'tool', 'brand'], size: 0.95, eye: 0xffe0b0 },
    talks: beats(
      [
        'Ha! Told you I had a loud pack. Nine isles heard it, got in their boats and followed the noise.',
        'Ashgrave had a master. Somebody up there handed him the Brand and told him to keep order with it.',
        'Twenty years I never walked the road to the citadel. Then I did. A stair is only a road standing up.',
        'Go on. I will mend whatever you bring back down. Pans, blades, people. I am not fussy.',
      ],
      [
        'Twenty masks split. I feel every one in my teeth, like a pan dropped in the next room.',
        'The Ember Bench wrote the Brand, clause by clause. In a lovely hand, I bet. I want to see the nib.',
        'Bring me a chip of one of those masks. I want to know what the King uses for solder.',
      ],
      [
        'Forty. The lamps on the stair are lit halfway up. I keep waking in the night to check they are on.',
        'I have mended Gideon\'s pick, Odo\'s hose and the Ferryman\'s oarlock. He did not ask. He did not stop me.',
        'Hal would have liked this. Up past bedtime, ten strangers and a fire. He always did.',
      ],
      [
        'Sixty. Every seat. The door at the top wants nothing else from you now except you.',
        'Listen. I let a fire go out once and somebody else paid for it. Do not let this one go out. Come back.',
        'Take the good pan. No — the GOOD one. For luck. Bring it back dented. That is how I will know.',
      ],
      [
        'It went out, the light at the top. Gently. Like a candle somebody was finally allowed to blow out.',
        'I keep picking my pack up to go and putting it down again. Where do you go after the end of the road?',
        'Home, I think. There is a step by the Tithe Fire in Emberport with my name on it. Bettany saves me a loaf.',
      ],
    ),
    barks: [
      { when: KING, lines: ['Where does the road go now?', 'Dented! Good!'] },
      { lines: ['Pans! Mending! Free!', 'A stair is a road standing up.', 'Mind the glass. It bites.'] },
    ],
  },

  // ── Odo Fathomsby (the Drowned Reach) — the diving bell ───────────
  {
    id: 'pin-odo', name: 'Odo Fathomsby', title: 'Salvage Diver', at: AT.odo,
    look: { body: 0x8a9a9a, accent: 0xc9a44a, hand: 0x4a5a5a, hat: 'diving', traits: ['pack', 'tool', 'lantern'], size: 1.15, eye: 0xbfeff0 },
    talks: beats(
      [
        'Ahoy! Odo Fathomsby, salvage. I brought the Bell. And a diving bell. That is two bells. Tilly despaired.',
        'She said "you do not take a diving bell to a war". I said it is not a war, it is a climb. She sighed a lot.',
        'Look at those wrecks. Any one of them is a dive I would have given my teeth for. Today? I leave them be.',
      ],
      [
        'Twenty! The Tide Bench is the second one, yes? The Undertow, written down like a tide table. Ghastly.',
        'I put the Bell on this morning against the wind and caught myself talking to it. It did not answer. Progress.',
      ],
      [
        'Forty! I lit the portholes so you could see the camp from the stair. Did you see? Say you saw.',
        'The Ferryman asked how deep the water goes off this beach. I went down to look. Glass, all the way.',
        'Full of boats, down there. Rows of them. I came up quite quickly. I did not tell him. I think he knows.',
      ],
      [
        'Sixty. Do you know what a diver does before the last dive? Checks his air twice and tells nobody he is scared.',
        'So: are you scared? Good. So am I. Twice. Off you go.',
      ],
      [
        'The glass is clearing! I went down at dawn. You can see the sea floor now, and the old boats. And FISH.',
        'Fish, living in a sunk galley like it is a house. Tilly and I are coming back to raise one. Just one.',
        'Thank you. I said that last time and it was all I had. It is still all I have. It is a good one, though.',
      ],
    ),
    barks: [
      { when: KING, lines: ['Fish in the wrecks!', 'Clear as a bell!'] },
      { lines: ['Two bells!', 'Air: checked. Twice.', 'Mind the hose.'] },
    ],
  },

  // ── Wendeline Burrows (Thornwild) — the skeps ─────────────────────
  {
    id: 'pin-wendeline', name: 'Wendeline Burrows', title: 'Beekeeper, with the Ladies', at: AT.wendeline,
    look: { body: 0xc8a888, accent: 0xe8e2c8, hand: 0x8a7a5a, hat: 'straw', traits: ['pack', 'satchel', 'cane'], size: 1.0, eye: 0xf0e090 },
    talks: beats(
      [
        'The Ladies would not stay home. I opened the skep on the quay and they flew straight out to sea. So.',
        'Primrose is minding the apiary. She sent those primroses. Potted them herself, with her bark hands.',
        'There is nothing for a bee on this beach. Not one flower. They have worked it all day regardless.',
      ],
      [
        'Twenty. The Thorn Bench is where they wrote the Pruning. I would like a word with whoever held the pen.',
        'The Ladies found a flower, on the glass. A green shoot splitting the shingle. They are very pleased with it.',
      ],
      [
        'Forty. The Ladies have stopped flying north. North is the spire now. They fly up it as far as they can.',
        'I took the veil out of my pocket this morning and nearly put it on. Then I let the bees have it.',
      ],
      [
        'All sixty. Bees do not sting unless you swat. Whatever is up there has been swatting for a very long time.',
        'Go gently, and finish it. I will be here, with the Ladies, facing north. Habit.',
      ],
      [
        'The seams went out in the night. The whole spire just rested. The Ladies hummed like a kettle off the boil.',
        'I will take Primrose honey with good news on it, for once. She will ask how it ended. I will say: well.',
      ],
    ),
    barks: [
      { lines: ['Do not swat.', 'They like you. Stand still.', 'North. Always north.'] },
    ],
  },

  // ── Barnaby Tuft (Highspire) — the balloon ────────────────────────
  {
    id: 'pin-barnaby', name: 'Barnaby Tuft', title: 'Aeronaut of the Dandelion', at: AT.barnaby,
    look: { body: 0xd8b08e, accent: 0x7a5a3a, hand: 0x8a6a4a, hat: 'aviator', traits: ['pack', 'scarf', 'satchel'], size: 1.05, eye: 0xd8f0ff },
    talks: beats(
      [
        'Barnaby Tuft, aeronaut! The Dandelion flew me halfway. Then the Shroud\'s backdraught. Then a rowing boat.',
        'She is only half full. Old Needle says the air off this glass is thin and sulky. I say she is resting.',
        'Fine flying above the spire, I am told. Old Needle points out nobody ever came back down to report it.',
      ],
      [
        'Twenty! I have been topping the Dandelion up with my own breath. First breath I ever gave away freely.',
        'The Gale Bench wrote the Breath-Tax. Metered every lungful on Highspire. I should like to meter THEM.',
      ],
      [
        'Forty! Look at her — nearly full. Old Needle is pointing at the top of the spire. So am I.',
        'If it goes badly up there I shall come and fetch you in the balloon. I have not worked out how. Wind, chiefly.',
      ],
      [
        'Sixty. Old Needle has gone quite still. He did that on the Windlass quay the day they bottled her.',
        'He is not frightened. He is listening for which way the wind will turn. So am I. Go up and turn it.',
      ],
      [
        'Wind from the top! Clean and warm, straight down the spire. Old Needle went right round the dial.',
        'I am taking the Dandelion up over the Pinnacle before we sail. Ten isles at once, all free. Come along?',
      ],
    ),
    barks: [
      { when: KING, lines: ['Wind from the top!', 'All the way round the dial!'] },
      { lines: ['She is resting.', 'Thin, sulky air.', 'Old Needle concurs.'] },
    ],
  },

  // ── Gideon Flint (Bedrock Hold) — the cairn ───────────────────────
  {
    id: 'pin-gideon', name: 'Gideon Flint', title: 'Quarryman, Uncollared', at: AT.gideon,
    look: { body: 0x9a8a7a, accent: 0x8c8782, hand: 0x7a6a5a, hat: 'miner', traits: ['tool', 'beard', 'scarf', 'lantern'], size: 1.1, eye: 0xf0e0a0 },
    talks: beats(
      [
        'Brought one stone from every court of the Hold and stacked them true. A man wants one honest wall.',
        'That is my collar on top. Ruth split it on the Scales. I carry it about. It is lighter in two.',
        'The Duchess is quiet. Bad air. Glass all the way down. Smells like a shaft nobody has opened in an age.',
      ],
      [
        'Twenty. The Duchess sang this morning. Short. Like she was not sure she was allowed to.',
        'The Stone Bench wrote the Tithe. Forty years I weighed blocks under that law. I would weigh its author.',
      ],
      [
        'Forty. She is singing properly now. There is air moving in the spire. You have opened something up there.',
        'Rock that has stood a long while does not come down all at once. It talks first. Listen. The spire is talking.',
      ],
      [
        'All sixty. In a mine, the last face is the one holding the roof up. Mind your head going in.',
        'And come back out. I dug out with a spoon once. I will dig for you with a pick. Do not make me.',
      ],
      [
        'Hear her? The Duchess has not stopped since dawn. The air is good. Over the whole sea, the air is good.',
        'Forty years I said the air was bad, and they all thought I meant the mines. Now they know what I meant.',
      ],
    ),
    barks: [
      { when: KING, lines: ['Good air.', 'Hear her sing.'] },
      { lines: ['Honest wall.', 'Listen to the rock.', 'Duchess says wait.'] },
    ],
  },

  // ── Wren Filament (Voltreach) — the lamp-post ─────────────────────
  {
    id: 'pin-wren', name: 'Wren Filament', title: 'The Last Lamplighter', at: AT.wren,
    look: { body: 0xb8a090, accent: 0xffc062, hand: 0x6a4a2a, hat: 'antenna', traits: ['lantern', 'pack', 'scarf'], size: 0.96, eye: 0xffd890 },
    talks: beats(
      [
        'Brought a lamp-post. Dug it up off Coil Row and carried it down the Cableway. This beach needed lighting.',
        'Radio Candle is broadcasting off my crate tonight. Audience of ten. Best ratings we ever had.',
        'All that glass and not one window in it. Whoever built that spire never once wanted to see out.',
      ],
      [
        'Twenty! The first lamps on your stair are lit. Starlight, the real stuff. Not a watt of Grid in it.',
        'The Storm Bench wrote the Draw. I want to see their Meter. I want to see it pinned at nothing.',
      ],
      [
        'Forty. I trimmed every wick in camp. Sable said thank you in a voice like a bell. Made my week.',
        'I tie the ladder knot every night — Tam taught me. Tonight I tied it on your boat. In case. You are welcome.',
      ],
      [
        'Sixty. Know what a lamplighter does at the end of the round? Looks back down the street. Every lamp lit.',
        'Go on up. Last lamp. I will keep this one burning so you can find your way down.',
      ],
      [
        'It went out up there — and look. The glass has gone clear. Sky right through it. Somebody got a window.',
        'Radio Candle is going off the air. No need to broadcast in secret when you can just talk. Last song is yours.',
      ],
    ),
    barks: [
      { when: KING, lines: ['A window!', 'Last song is yours.'] },
      { lines: ['Lit by hand!', 'No Grid here.', 'Radio Candle, on air.'] },
    ],
  },

  // ── Tansy Rue (Fangmire) — the still ──────────────────────────────
  {
    id: 'pin-tansy', name: 'Tansy Rue', title: 'Hedge-Apothecary, with Pestle', at: AT.tansy,
    look: { body: 0xb89a7a, accent: 0x4a6a3a, hand: 0x7a8a5a, hat: 'hood', traits: ['satchel', 'pack', 'scarf'], size: 0.95, eye: 0xd0f070 },
    talks: beats(
      [
        'Pestle came. I told him not to. He sat in the boat until I gave up. Mongooses are not reasonable.',
        'The still is up. Not Draught — never again. A tonic, for climbers. Tastes of liquorice and nerve.',
        'Pestle growled at the stair all afternoon. He only growls at informers. That whole spire is one.',
      ],
      [
        'Twenty. The Venom Bench wrote the Mark. I want the recipe they started from. I have notes. Many notes.',
        'Pestle has stopped growling at the stair. Now he growls at the Ferryman, then goes and sits by him. Mixed.',
      ],
      [
        'Forty. I have brewed a flask for every bench you have left. Do not drink them all at once. Do NOT.',
        'A dose is still a dose, Mother said, and a cure is a cure. Up there is somebody who never knew the difference.',
      ],
      [
        'Sixty. Pestle went three steps up the stair and came back down. Three. That is his way of saying go.',
        'I am not saying be careful. Careful never got anything done on Fangmire. Be quick.',
      ],
      [
        'Pestle slept through the night. First time since we landed. Draped over my boots like a scarf.',
        'Home to burn the last of the ration books. Then I am going to brew something just because it is nice.',
      ],
    ),
    barks: [
      { when: KING, lines: ['Something nice, for once.', 'Shh — he is asleep.'] },
      { lines: ['Liquorice and nerve!', 'Pestle, no.', 'Not Draught. Never.'] },
    ],
  },

  // ── Marlo Fairshake (Lotterhaven) — the card table ────────────────
  {
    id: 'pin-marlo', name: 'Marlo Fairshake', title: 'Honest Card-Sharp, with Tuppence', at: AT.marlo,
    look: { body: 0xc8a890, accent: 0x2a2430, hand: 0xe8e0d0, hat: 'tophat', traits: ['glasses', 'scarf', 'satchel'], size: 1.0, eye: 0xf0d890 },
    talks: beats(
      [
        'Sit, sit. Buttons only, cards face up. I will win most of them and give them back. House rules.',
        'Tuppence has already stolen a chip off the stair. I am posting it back. Address: "Upstairs".',
        'Ten of us on a glass beach under a King who deals himself every hand. The odds have never been so interesting.',
      ],
      [
        'Twenty seats. Tuppence dropped a sliver of mask at my feet this morning. Insufferably proud of herself.',
        'The Lot Bench is the eighth. Somebody up there owes me two years of hours. I will settle for one.',
      ],
      [
        'Forty. I have been dealing patience to pass the time. It keeps coming out. It never comes out.',
        'The Ferryman sat in last night. Bet one coin, very old. "Every fare I was ever paid," he said. Lost it.',
      ],
      [
        'Sixty. Every seat empty. The odds are what they are now: you, him, one stair. That is an honest game.',
        'Here — my forged Lot. It is not lucky. It is not anything. But it has come this far. Let it see the end.',
      ],
      [
        'Tuppence came down from the top with a crown in her beak. A small one. I am posting it to the sea-bed.',
        'Every number won, every name was read — and the house lost. First time in history. I was there.',
      ],
    ),
    barks: [
      { when: KING, lines: ['The house lost!', 'Posted. To the sea.'] },
      { lines: ['Face up. Always.', 'Buttons only.', 'Tuppence, drop it.'] },
    ],
  },

  // ── Lark Halloway (Choirholm) — the bandstand ─────────────────────
  {
    id: 'pin-lark', name: 'Lark Halloway', title: 'Busker, with Patter', at: AT.lark,
    look: { body: 0xd8b498, accent: 0x7a3a4a, hand: 0x8a6a5a, hat: 'none', traits: ['scarf', 'pack', 'satchel'], size: 0.98, eye: 0xf0d890 },
    talks: beats(
      [
        'You can hear me! I still sign it as well. Belt and braces. (She signs it too, grinning.)',
        'Patter came. He shouts "LARK! LARK!" up at the spire in my old voice — the one they took. He kept it for me.',
        'This is a silent bandstand. I built it for the Quay. Nobody plays it yet. I am waiting for a reason.',
      ],
      [
        'Twenty. I played one note on the hurdy-gurdy this morning, and the glass rang back. The spire has an ear.',
        'The Choir Bench is ninth. Sable says there is a vault of voices up there. Jars of them. Shelved.',
      ],
      [
        'Forty. I have started a tune. Not the market song — a new one, with a bar for every bench you break.',
        'Patter knows it already. He sings the bars you have not broken yet, which is presumptuous of him.',
      ],
      [
        'All sixty. The tune is done but for the last line. I am not singing the last line until you come down.',
        'Patter: "COME DOWN! COME DOWN!" — He means it nicely. He means come back.',
      ],
      [
        'I sang the last line. The whole camp joined in, in ten different keys, and the glass sang the harmony.',
        'The bandstand is not silent any more. Odo plays the spoons. Badly. Patter has asked him to stop.',
      ],
    ),
    barks: [
      { when: KING, lines: ['"ENCORE!"', 'Spoons, Odo. No.'] },
      { lines: ['"LARK! LARK!"', '(She hums, out loud.)', 'One note. It rang back.'] },
    ],
  },

  // ── Sable Merrow (Solmara) — the keeper's lantern ─────────────────
  {
    id: 'pin-sable', name: 'Sable Merrow', title: 'Keeper of the Meridian Light, with Nocturne', at: AT.sable,
    look: { body: 0xe4eef2, accent: 0xc8d6de, hand: 0xd8e4ea, hat: 'souwester', traits: ['lantern', 'scarf'], size: 0.95, eye: 0xb8dcf0 },
    talks: beats(
      [
        'I brought the lamp-head down off the Meridian light. It wanted to come. A light should see a dark once.',
        'Nocturne has flown round the spire all evening. There is more shadow here than on all of Solmara.',
        'I am frightened. A Clear cannot hide it, so I will not try. I am glad to be frightened next to a fire.',
      ],
      [
        'Twenty. Some colour came back into my hands this morning, round the knuckles. Grey. But it is a colour.',
        'The Noon Bench is the highest, they say. The Endless Noon, written down. A long way up to all that light.',
      ],
      [
        'Forty. Nocturne flew up the stair today, toward the dark between the benches. She came back. She always does.',
        'I keep the lamp lit and pointed out to sea. Someone has to show the way home, and I know how.',
      ],
      [
        'Sixty. The top of the stair is gold now. Starlight. The first warm light this glass has shown — and a trap.',
        'No. That is not fair, and I do not say what I do not mean. It is a star. Nobody asked it to be a king.',
      ],
      [
        'The star went out, softly, and for a moment over the whole sea it was night. Real night. Everyone looked up.',
        'Nocturne flew out over the water and did not come back until dawn. I did not worry. I have learned not to.',
        'Look at my hands. Colour, all the way to the wrist. I am going to need a hat.',
      ],
    ),
    barks: [
      { when: KING, lines: ['Night. Real night.', 'Colour, to the wrist.'] },
      { lines: ['Toward the dark, Nocturne.', 'The lamp is lit.', 'Frightened. Not hiding it.'] },
    ],
  },

  // ── The Beachmaster (dock) ────────────────────────────────────────
  {
    id: 'pin-dock', name: 'Pell Harrow', title: 'Beachmaster of the Muster', at: AT.dock,
    role: { kind: 'dock', id: 'pin-dock' },
    look: { body: 0x9a7a5a, accent: 0x3a5a6a, hat: 'souwester', traits: ['beard', 'rod', 'pipe'], size: 1.15 },
    talks: [
      {
        when: KING,
        lines: [
          'Boats out: one. I cut it myself in the empty column of the Tally Stone. Took an hour. It is glass.',
          'Then I cut nine more, and one for you, and one for the Ferryman. Column is not empty any more.',
          'Where to? Anywhere. Every sea is open. That is a sentence I never thought I would get to say.',
        ],
      },
      {
        when: S60,
        lines: [
          'Every seat empty. I have had the boats turned bow-out. Nobody asked. It felt right.',
          'If you want to sail home first, I will not think less of you. Nobody here would. The stair will wait.',
        ],
      },
      {
        lines: [
          'Beachmaster. Ten boats in, and yours, and his. I count them twice a night. Habit from the Reach.',
          'Want to sail? Any isle you like — the sea is open. Mind: nobody ever sailed out of here. You would be first.',
          'The jetty is older than any of us. Every plank a different boat. I would not ask whose.',
        ],
      },
    ],
    barks: [
      { when: KING, lines: ['Boats out!', 'Column is not empty.'] },
      { lines: ['Ten in. Count them.', 'Bow-out, lads.', 'Mind the old planks.'] },
    ],
  },

  // ── The Quartermaster (stores) ────────────────────────────────────
  {
    id: 'pin-stores', name: 'Hesper Quill', title: 'Quartermaster of the Muster', at: AT.stores,
    role: { kind: 'shop', id: 'pin-stores' },
    look: { body: 0xb08a6a, accent: 0x4a3a5a, hat: 'tricorn', traits: ['glasses', 'book', 'satchel'], size: 1.0 },
    talks: [
      {
        when: KING,
        lines: [
          'Stock-take: everything accounted for but the King. Struck off. I have never enjoyed a ledger line more.',
          'Prices stand. I am a quartermaster, not a saint. But the tea is on the house tonight.',
        ],
      },
      {
        when: S40,
        lines: [
          'Forty seats. I have moved the Muster Roll to the front of the shelf. You will want it for the top.',
          'Every isle sent stores. The Reach sent rope. The Hold sent stone. Highspire sent a crate of air. Labelled.',
        ],
      },
      {
        lines: [
          'Quartermaster. Ten isles packed this camp and I wrote down every crate. Charms are dear. They are worth it.',
          'The Muster Roll, the Second Oar, a Splinter of Shell, the Tally Chalk. Made for the climb and nothing else.',
          'Food at the counter too. Real food, not trail rations. Nobody climbs that thing on hardtack alone.',
        ],
      },
    ],
    barks: [
      { lines: ['Everything counted.', 'Dear. Worth it.', 'Sign here.'] },
    ],
  },

  // ── The camp cook (kitchen) ───────────────────────────────────────
  {
    id: 'pin-kitchen', name: 'Dottie Firkin', title: 'Cook to the Muster', at: AT.kitchen,
    role: { kind: 'bakery', id: 'pin-kitchen' },
    look: { body: 0xd0a080, accent: 0xe8e0d0, hat: 'chef', traits: ['apron', 'tool'], size: 1.2 },
    talks: [
      {
        when: KING,
        lines: [
          'Last supper turned into first breakfast. I have never been so glad to get a menu wrong.',
          'Bring fish. I will cook it all. We are going to eat like ten isles that do not owe anybody anything.',
        ],
      },
      {
        when: S60,
        lines: [
          'All sixty, and you look half-starved. Sit. Bring me fish from home — anybody\'s home — and I will cook.',
          'Ten bowls on that table, one from every isle. The eleventh is yours. Nobody has eaten out of it yet.',
        ],
      },
      {
        lines: [
          'Cook. Somebody has to feed a war that is not a war. Bring me fish from the isles — any of them.',
          'Last-supper cooking: a bit of everywhere in every pot. Sprat from Brandmark, herring from the Reach.',
          'One meal lasts one fight. Up there, one fight is all you get. Eat properly.',
        ],
      },
    ],
    barks: [
      { lines: ['Bring fish!', 'Sit. Eat.', 'A bit of everywhere.'] },
    ],
  },
];
