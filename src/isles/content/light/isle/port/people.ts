import type { Cond, NpcDef, NpcLook, Pt, Talk } from '../../../../IslesTypes';

/**
 * The people of Meridian Quay — Solmara's harbour, where every Outer Sea crossing lands.
 *
 * It has been noon here for twenty-two years. The quay is sunburnt, squinting and very, very tired:
 * nobody has slept lying down in a dark room since the Heliostat went up, children have never seen a
 * star, and the one hour of licensed shade a day is queued for outside the Dusk-house with a ticket.
 * Doors are glass, curtains are contraband, every bag that lands is emptied out on a table in the sun.
 * And the Clears — the bleached, translucent and shadowless — walk the jetties as a warning.
 *
 * Dialogue blocks are listed most specific first: Despot down → a prince down → their quest done →
 * default. Talk on the quay is quiet and practical, and keeps coming back to the dark, the way a
 * hungry town keeps coming back to bread.
 */

const DESPOT: Cond = { monarch: 'auriel' };
const princes = (count: number): Cond => ({ princesOfIsle: 'light', count });

// ── Positions (shared with the area's POIs and quests) ──────────────

export const AT = {
  dock: { x: 1160, y: 1200 },
  store: { x: 1560, y: 664 },
  tackle: { x: 1975, y: 1236 },
  baker: { x: 760, y: 676 },
  customs: { x: 1880, y: 1162 },
  nell: { x: 560, y: 1150 },
  hobb: { x: 1910, y: 840 },
  jory: { x: 2290, y: 1236 },
  rosamund: { x: 440, y: 660 },
  tobiah: { x: 1300, y: 1360 },
} satisfies Record<string, Pt>;

export const MERIDIAN_NPCS: NpcDef[] = [
  // ── Dockmaster / boatwright ───────────────────────────────────────
  {
    id: 'meridian-dock', name: 'Ottoline Brack', title: 'Dockmaster & Boatwright', at: AT.dock,
    role: { kind: 'dock', id: 'meridian-dock' },
    look: { body: 0xc8805a, accent: 0xe8e0c8, hat: 'goggles', traits: ['tool', 'apron'], size: 1.15, eye: 0x6a8ab8 },
    talks: [
      {
        when: DESPOT,
        lines: [
          'I took the smoked goggles off this morning and could see. Just see. No squinting. I sat down on a bollard.',
          'The hulls are cooler. The pitch stays in the seams overnight. Overnight! I have said that word twelve times.',
          'Want a boat? I will paint her any colour you like. Not white. Never again. Something you can see at dusk.',
        ],
      },
      {
        when: { prince: 'lumen' },
        lines: [
          'Lumen is down. The Burning Glass on the Noon terrace has stopped. Somebody threw a sheet over the lens.',
          'A sheet! Over the lens! I walked up the Noon Steps to look at it and cried in public. I am a dockmaster.',
        ],
      },
      {
        when: { questDone: 'meridian-declared' },
        lines: [
          'Nell has her barrels back, lids and all. Glaze will be explaining himself to the Tribunal. Let him squint.',
          'You did a good thing for a stranger off a boat. The quay noticed. The quay notices everything. It has to.',
        ],
      },
      {
        lines: [
          'Off the Stair and onto the quay — eyes down, the stones throw it back at you. Welcome to Meridian.',
          'It is noon. It is always noon. You will stop asking what time it is in about a day. Everybody does.',
          'Hulls, mending, boats: that is me. Tackle is Halloran, east by the lighthouse. Bread is the Golden Crust.',
          'Customs will want your bags first. All of them. Opened. On the table. In the sun. Do not argue. It is quicker.',
        ],
      },
    ],
    barks: [
      { when: DESPOT, lines: ['Overnight! The pitch held overnight!', 'Not white. Anything but white.'] },
      { lines: ['Eyes down. The stones throw it back.', 'White paint, or the planks split.', 'Mind the slip. It is hot enough to fry on.'] },
    ],
  },

  // ── General store ─────────────────────────────────────────────────
  {
    id: 'meridian-store', name: 'Cassius Penhallow', title: 'The Glass Counter', at: AT.store,
    role: { kind: 'shop', id: 'meridian-store' },
    look: { body: 0xd8a888, accent: 0x5a7aa8, hat: 'tophat', traits: ['glasses', 'satchel'], size: 0.95, eye: 0x8ab8d8 },
    talks: [
      {
        when: DESPOT,
        lines: [
          'I put a box on the counter. A plain wooden box with a lid. People keep coming in just to look at it.',
          'Somebody asked what was in it. I said "mind your own business." Do you know how long I waited to say that?',
        ],
      },
      {
        when: { prince: 'artifex' },
        lines: [
          'Artifex has fallen and the Workshop has stopped grinding mirrors. They are making lampshades. Lampshades!',
          'I have ordered forty. I have nothing to put under them. I will think of something. Candles. Night. Something.',
        ],
      },
      {
        when: { questDone: 'meridian-lined-with-night' },
        lines: [
          'Rosamund came in for a spool of black thread. I wrapped it in brown paper. Wrapped it. My hands shook.',
          'Black thread is not on any list. I checked. Twice. A man in my position has to know which lists things are on.',
        ],
      },
      {
        lines: [
          'The Glass Counter! Every item on show, nothing in a drawer, nothing under a cloth. Clarity is good for trade.',
          'That is what I am supposed to say. Charms — bits of the isle that do things. Lenses, tickets, a locket.',
          'Equip three — TAB, then pick. Food at the counter too. Eat it here. Wrapped food is a hiding place, I am told.',
        ],
      },
    ],
    barks: [
      { when: DESPOT, lines: ['A box! With a lid! Come and look!'] },
      { lines: ['Everything on show!', 'Charms, lenses, sun-tea.', 'Nothing hidden here, officer.'] },
    ],
  },

  // ── Tackle shop ───────────────────────────────────────────────────
  {
    id: 'meridian-tackle', name: 'Wren Halloran', title: 'Halloran\'s Lines & Lenses', at: AT.tackle,
    role: { kind: 'tackle', id: 'meridian-tackle' },
    look: { body: 0xb8785a, accent: 0x3a6a7a, hat: 'souwester', traits: ['rod', 'scarf'], size: 1.0, eye: 0xc8e0f0 },
    talks: [
      {
        when: DESPOT,
        lines: [
          'I fished last night. In the dark. The beacon bass came up glowing like a lamp under the water. Hundreds.',
          'They come up to feed at night. Nobody knew. Twenty-two years and nobody knew what a fish does at night.',
        ],
      },
      {
        when: { questDone: 'meridian-face-down' },
        lines: [
          'The buoys are face-down. The quay is not being watched from the hill. I keep turning round to check anyway.',
          'My father was reported by a buoy for sleeping under an upturned skiff. I fish off it now. Upside right.',
        ],
      },
      {
        when: { prince: 'sigil' },
        lines: [
          'Sigil is down and the Mana Font in the Arcane Court is fishable without a permit. Rune trout! Hex eels!',
          'You want the prism rod for it. The font is liquid light; a plain rod just shows you glare. Prism splits it.',
        ],
      },
      {
        lines: [
          'Halloran\'s Lines and Lenses. Rods, hooks, and the only prism rod on the Outer Sea. I grind the tips myself.',
          'Sea fish off the Stair or the moles — herring for learning, skate if you have a strong arm and patience.',
          'The noon pool up the hill and the Mana Font want the prism rod. Too bright to see into without it.',
        ],
      },
    ],
    barks: [
      { when: DESPOT, lines: ['They feed at NIGHT!', 'Beacon bass by the hundred.'] },
      { lines: ['Prism rods, ground by hand.', 'Herring on the Stair this morning.', 'Do not look at the buoys. They look back.'] },
    ],
  },

  // ── Bakery ────────────────────────────────────────────────────────
  {
    id: 'meridian-baker', name: 'Dorrit Amberley', title: 'The Golden Crust', at: AT.baker,
    role: { kind: 'bakery', id: 'meridian-bakery' },
    look: { body: 0xe8b890, accent: 0xf4ecd8, hat: 'chef', traits: ['apron'], size: 1.2, eye: 0xa86a3a },
    talks: [
      {
        when: DESPOT,
        lines: [
          'I left a dough to prove overnight in a cupboard with the door shut. In the dark. Like my grandmother did.',
          'It rose like a moon. I have not seen the moon. I am told it looks like that. I wept into the flour bin.',
        ],
      },
      {
        when: { prince: 'hue' },
        lines: [
          'Hue is down. The Mural Court painters came down for bread and one of them had painted a shadow on her hand.',
          'Just a little grey under her thumb. She kept looking at it. I gave her a loaf for free and do not regret it.',
        ],
      },
      {
        when: { questDone: 'meridian-queue-bread' },
        lines: [
          'Old Ezekiel ate his queue-loaf in the queue and nobody docked him a minute. The whole line clapped.',
          'I bake twelve for the queue every morning now. Every noon, I mean. There is no morning. You know what I mean.',
        ],
      },
      {
        lines: [
          'The Golden Crust! Everything gold on this isle is the Despot\'s except my crust. He has not thought of it yet.',
          'Bring me a catch and coin and I will bake it into something that sees you through a fight. One fight.',
          'I bake for the Dusk-house queue as well. People faint in that line. Bread helps. Shade would help more.',
        ],
      },
    ],
    barks: [
      { when: DESPOT, lines: ['It rose like a moon!', 'Bread proved in the dark!'] },
      { lines: ['Golden loaves! Sunburst rolls!', 'Fresh as the noon. Always noon.', 'Mind the oven, it is the only warm I like.'] },
    ],
  },

  // ── Customs clerk ─────────────────────────────────────────────────
  {
    id: 'meridian-customs', name: 'Tamsin Lowe', title: 'Clerk of the Customs of Clarity', at: AT.customs,
    look: { body: 0xd8b098, accent: 0xf0ecdc, hat: 'visor', traits: ['book', 'glasses'], size: 0.95, eye: 0x7a9ab8 },
    talks: [
      {
        when: DESPOT,
        lines: [
          'The table is empty. I came in this morning and nobody had a bag open. I did not know what to do with my hands.',
          'I have taken the stamp home. I am going to use it to press patterns in pastry. Sunbursts. Ironically.',
        ],
      },
      {
        when: { prince: 'verdict' },
        lines: [
          'Verdict has fallen. The Tribunal is not trying shade-thieves. Glaze\'s cases came back unread.',
          'I have started letting people keep their letters folded. I read the address and hand them back. Folded.',
        ],
      },
      {
        when: { questDone: 'meridian-declared' },
        lines: [
          'Glaze has a new desk in a corridor somewhere up the hill. With a window. Facing the sun. I hope it is south.',
          'Nell\'s barrels went through with their lids on. I stamped them CLEAR. They were not. That was the best part.',
        ],
      },
      {
        lines: [
          'Arrival? Bags on the table, please. All the way open. — I am joking. The Inspector is at lunch. Go on through.',
          'Everything that lands is spread out in the sun and looked at. Letters unfolded. Loaves cut. Dolls opened.',
          'A lid is a hiding place. A box is a hiding place. A pocket is borderline. That is the Inspector\'s phrase.',
        ],
      },
    ],
    barks: [
      { when: DESPOT, lines: ['Keep your letters folded!', 'Nothing to declare. Lovely.'] },
      { lines: ['Bags open, please.', 'Every lid lifted.', 'Thank you for being seen.'] },
    ],
  },

  // ── Fishwife ──────────────────────────────────────────────────────
  {
    id: 'meridian-nell', name: 'Nell Gully', title: 'Fishwife of the Glass Market', at: AT.nell,
    look: { body: 0xc87a5a, accent: 0x6a8aa0, hat: 'headwrap', traits: ['apron', 'tool'], size: 1.1, eye: 0x8ac0d0 },
    talks: [
      {
        when: DESPOT,
        lines: [
          'I salted a barrel last night and put the lid on and went to bed. In the dark. With the lid on. Both of us.',
          'The fish keep better. I keep better. My husband\'s lantern came down from the gorge and I buried it. At last.',
        ],
      },
      {
        when: { prince: 'wisp' },
        lines: [
          'Wisp is down. They are letting the souls out of the lanterns in the Lantern Court. Mine is in one of those.',
          'My Gideon. Drowned off the east mole, nine years gone. Caught in a lantern so he would never lie in the dark.',
          'I am going up the gorge with a lantern-key. I want to see him go out. Just out. Like a light ought to.',
        ],
      },
      {
        when: { questDone: 'meridian-declared' },
        lines: [
          'My barrels! Lids on! You can salt herring again in Meridian without it going to slime in the sun.',
          'Twelve years I have fought that man over lids. Twelve. You did it in an afternoon. Have a herring.',
        ],
      },
      {
        lines: [
          'Glass roof, see. So the Inspector can look in from the steps. The fish cook on the slab before they sell.',
          'Ice from the Workshop melts faster than they can cart it. I sell by the minute. Herring! Fresh as now!',
        ],
      },
    ],
    barks: [
      { when: DESPOT, lines: ['Lids on! Lids on everything!', 'Salt herring! Kept in the dark!'] },
      { lines: ['Herring! Fresh as now!', 'Mackerel like a mirror!', 'Buy it before the slab cooks it.'] },
    ],
  },

  // ── The man in the queue ──────────────────────────────────────────
  {
    id: 'meridian-hobb', name: 'Ezekiel Hobb', title: 'In the Dusk-house Queue', at: AT.hobb,
    look: { body: 0xc89070, accent: 0x8a7a6a, hat: 'straw', traits: ['cane', 'beard'], size: 0.95, eye: 0xd8d0c0 },
    talks: [
      {
        when: DESPOT,
        lines: [
          'No queue. I came down at the usual hour out of habit and there was no queue. Just the door. Open.',
          'I went in and sat in the dark and nobody timed me. I stayed six hours. I came out and it was dark outside too.',
          'Seventy-nine years old and I cried at a sunset like a baby. Good. Babies have the right idea about sunsets.',
        ],
      },
      {
        when: princes(3),
        lines: [
          'Half the courts fallen and the clerk is giving out extra minutes. Extra minutes! He looks frightened. Good.',
          'They say the Heliostat\'s mirrors shook on the summit last week. Like something up there flinched.',
        ],
      },
      {
        when: { questDone: 'meridian-queue-bread' },
        lines: [
          'I ate my bread in the queue and the clerk went white and then went away. I have my hour back. With crumbs.',
          'Tell Dorrit the crust was perfect. Tell her I dream about it. I do dream. Sitting up. Twenty minutes a go.',
        ],
      },
      {
        lines: [
          'In the queue since — well. Since. You lose the hours. That is the joke. There is one hour, and it is noon.',
          'One ticket, one hour of shade a day, per household. I am a household of one. So I come every day.',
          'Inside there is a dark room with benches. You sleep sitting up. The clerk calls time with a stopwatch.',
        ],
      },
    ],
    barks: [
      { when: DESPOT, lines: ['No queue! No queue at all!', 'Six hours in the dark. Lovely.'] },
      { lines: ['Hold my place.', 'Not long now. It is never long now.', 'Is that the watch? Is it ticking?'] },
    ],
  },

  // ── The boy who has never seen a star ─────────────────────────────
  {
    id: 'meridian-jory', name: 'Jory Penrose', title: 'Lighthouse Boy', at: AT.jory,
    look: { body: 0xd8a080, accent: 0x5a8ab8, hat: 'cap', traits: ['satchel'], size: 0.74, eye: 0x6aa0d8 },
    talks: [
      {
        when: { flag: 'sable-dusk-4' },
        lines: [
          'She lit it! Mrs Merrow lit the lamp and it went round and round over the water and I SAW it go round!',
          'It is not even the best thing. The best thing is the stars. There are MORE of them every time you look.',
        ],
      },
      {
        when: DESPOT,
        lines: [
          'I saw the sun go DOWN. Into the sea! It went orange and then it went in and I thought it had broken!',
          'Then the stars came out and I screamed. Everybody screamed. Mum says that is the right thing to do with stars.',
        ],
      },
      {
        when: princes(6),
        lines: [
          'All six! Mum says when the Despot goes the sun will move. I do not believe it. The sun does not move.',
          'Mrs Merrow says it does. She says it used to go right down into the sea every day and come back. Every day!',
        ],
      },
      {
        when: { questDone: 'meridian-lamp-room' },
        lines: [
          'The lens is back together in the lamp room. Mrs Merrow came and looked and did not say anything for ages.',
          'Then she said "you will see it lit, Jory." She does not say things she does not mean. She cannot hide them.',
        ],
      },
      {
        lines: [
          'That is the lighthouse. Mrs Merrow kept it. Before. Before everything. It is not allowed to be lit now.',
          'A lamp means there is a night, see. And there is no night. So there is no lamp. That is the law.',
          'What is a star like? Mrs Merrow says it is like a hole in the dark with light coming through. What is dark?',
        ],
      },
    ],
    barks: [
      { when: DESPOT, lines: ['MORE stars every time!', 'It went round and round!'] },
      { lines: ['What is a star like?', 'One day it will be lit.', 'Mrs Merrow kept the lamp, you know.'] },
    ],
  },

  // ── The seamstress ────────────────────────────────────────────────
  {
    id: 'meridian-rosamund', name: 'Rosamund Vell', title: 'Seamstress', at: AT.rosamund,
    look: { body: 0xe0b098, accent: 0xb85a7a, hat: 'none', traits: ['scarf', 'glasses'], size: 0.98, eye: 0x8a6a8a },
    talks: [
      {
        when: DESPOT,
        lines: [
          'Curtains! Look! Real ones, lined, in every window I could reach. I sewed for three days and nobody came.',
          'Tobiah sleeps behind them. In a bed. Lying down. His hands are nearly the colour of hands again.',
        ],
      },
      {
        when: { questDone: 'meridian-lined-with-night' },
        lines: [
          'He wears the hood at night — I mean, in his hour. Under it his cheek has gone pink. Pink! A Clear!',
          'Ashcombe will be reporting me, I suppose. Let him. You cannot bleach a seamstress twice. I asked.',
        ],
      },
      {
        when: princes(2),
        lines: [
          'Two courts. I have started sewing linings into my shirts. Black linings. Inside, where nobody looks.',
          'It is a small thing. You would be surprised how much a small black thing helps, worn against the skin.',
        ],
      },
      {
        lines: [
          'White linen, white linen, white linen. "Sun-veils" they call them. Gauze so thin it throws no shade at all.',
          'That is all I am allowed to sew. A shadow on a sheet is a crime. So is a sheet over a window. So is a hood.',
          'My brother is a Clear. You will have seen him on the jetty. He was bleached for sleeping under a blanket.',
        ],
      },
    ],
    barks: [
      { when: DESPOT, lines: ['Curtains! Lined ones!', 'He sleeps lying down now.'] },
      { lines: ['White linen. Always white.', 'Gauze so thin it casts nothing.', 'Mind you do not drop a shadow.'] },
    ],
  },

  // ── The Clear on the jetty ────────────────────────────────────────
  {
    id: 'meridian-tobiah', name: 'Tobiah Vell', title: 'A Clear', at: AT.tobiah, wander: 30,
    look: { body: 0xeef6fa, accent: 0xdce8f0, hand: 0xe0eef4, hat: 'none', traits: [], size: 1.05, eye: 0xc8e8f8 },
    talks: [
      {
        when: DESPOT,
        lines: [
          'I stood on the Stair at sunset and watched my hand go grey in the dusk. Grey. Then the dark came. Then me.',
          'Every night a little more. Rosamund measures it against a swatch. I am "pale ecru" this week. She is thrilled.',
        ],
      },
      {
        when: princes(4),
        lines: [
          'Four courts. People have started looking at me again. Not through me. At me. It is very strange.',
          'A child put her hand on my arm today to see if it was real. It was. I told her so. She did not scream.',
        ],
      },
      {
        when: { questDone: 'meridian-lined-with-night' },
        lines: [
          'In the hood, for my hour, it is dark. Properly dark. I felt my own face get warm. Colour coming back.',
          'Rosamund cried. I could not see it, it was dark. I could hear it. That is the point of dark, I think.',
        ],
      },
      {
        lines: [
          'You can see the jetty through me. It is all right. Everybody does. They are meant to. That is what I am for.',
          'I slept under a blanket. One night, with it pulled over my head. A buoy saw the shape of me and flashed it in.',
          'The Burning Glass took nine hours. You fade from the edges in. I do not cast a shadow. Look. — No. Nothing.',
        ],
      },
    ],
    barks: [
      { when: DESPOT, lines: ['Pale ecru this week.', 'Grey in the dusk. Grey!'] },
      { lines: ['Look through me. Go on.', 'No shadow. See?', 'The jetty is very white today. Through me.'] },
    ],
  },
];

// ── The crowd ───────────────────────────────────────────────────────

const CROWD_LOOKS: NpcLook[] = [
  { body: 0xd09070, accent: 0xf0ecdc, hat: 'straw', traits: ['satchel'] },
  { body: 0xc8805a, accent: 0xe8e0c8, hat: 'headwrap' },
  { body: 0xb87858, accent: 0xd8d0b8, hat: 'souwester', traits: ['rod'], size: 1.15 },
  { body: 0xe0a888, accent: 0xf4f0e4, hat: 'none', traits: ['apron'] },
  { body: 0xd8a080, accent: 0xc8c0a8, hat: 'straw', traits: ['cane'] },
  { body: 0xc88868, accent: 0xb8a888, hat: 'cap', traits: ['tool'] },
  { body: 0xe0b090, accent: 0xa8c0d0, hat: 'none', size: 0.74 },
  // Clears — pale as glass, walking the quay as a warning.
  { body: 0xeef6fa, accent: 0xdce8f0, hand: 0xe0eef4, hat: 'none' },
  { body: 0xe8f2f8, accent: 0xd8e4ec, hand: 0xdce8f0, hat: 'hood' },
];

export const MERIDIAN_CROWD: { count: number; looks: NpcLook[]; paths: Pt[][]; barks: Talk[] } = {
  count: 14,
  looks: CROWD_LOOKS,
  paths: [
    // The High Street, end to end across the town terrace.
    [{ x: 140, y: 750 }, { x: 700, y: 752 }, { x: 1300, y: 770 }, { x: 1800, y: 752 }, { x: 2460, y: 750 }],
    // Up and down the middle stairs from the Noon Steps to the quay.
    [{ x: 1300, y: 180 }, { x: 1300, y: 500 }, { x: 1300, y: 980 }, { x: 1300, y: 1200 }],
    // The Dusk-house queue, shuffling between the rails.
    [{ x: 1910, y: 700 }, { x: 1910, y: 760 }, { x: 1910, y: 870 }, { x: 1910, y: 760 }],
    // The Quay Promenade.
    [{ x: 200, y: 1200 }, { x: 900, y: 1180 }, { x: 1500, y: 1220 }, { x: 2250, y: 1180 }],
    // Round the fish market's stalls.
    [{ x: 380, y: 1160 }, { x: 760, y: 1160 }, { x: 760, y: 990 }, { x: 380, y: 990 }],
    // Along the top terrace below the domes.
    [{ x: 200, y: 360 }, { x: 1100, y: 360 }, { x: 1500, y: 360 }, { x: 2450, y: 360 }],
    // Out along the Meridian Stair and back.
    [{ x: 1300, y: 1290 }, { x: 1300, y: 1430 }],
    // The arrivals' line past the inspection table.
    [{ x: 1620, y: 1190 }, { x: 1820, y: 1190 }, { x: 1720, y: 1172 }],
  ],
  barks: [
    { when: DESPOT, lines: [
      'It went DOWN. Into the sea!', 'I slept lying down. Lying DOWN.', 'There are holes in the dark with light coming through.',
      'My shadow is as long as a street!', 'The lighthouse is lit. Look at it go round.',
    ] },
    { when: princes(4), lines: [
      'Four courts!', 'The clerk gave me twenty extra minutes.', 'They say a cloud was seen over the Workshop. A CLOUD.',
    ] },
    { when: { prince: 'lumen' }, lines: [
      'The Burning Glass has a sheet over it!', 'Lumen is down. Shh — not near the buoys.', 'No bleachings this week.',
    ] },
    { lines: [
      'Is it noon? It is noon.', 'Have you a ticket?', 'Eyes down, the stones are bright.', 'My hour is at the second bell.',
      'I dreamt of a cloud.', 'Do not stand behind the wall. People talk.', 'Herring on the Stair this morning.',
    ] },
  ],
};
