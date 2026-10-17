import { ElementCodex } from '../AbilityCodex';

/**
 * Sound — a marching-band drum major (reworked 2026-10-15).
 *
 * Verified against `src/elements/sound.ts` and `kits/SoundKit.ts`; every number is a constant at
 * the top of the kit. The five shop upgrades (2026-10-16) are constants in the kit's "Shop upgrades"
 * block. Sound has no mastery since the rework — one is owed. The Harmony and Bass perks were
 * rewritten for the new kit.
 */
const sound: ElementCodex = {
  identity:
    'A drum major in deep maroon. A metronome runs the whole match, and keeping time on it spins '
    + 'your baton faster — and the baton, always out on the field chasing your cursor, is your '
    + 'click attack. The rest of the kit is the band: a dance that ends in a wave, a slam that puts '
    + 'the enemy out of tune, three soul songs to march to, and a bugle solo for the ultimate.',

  passives: [
    {
      emoji: '🎼',
      name: 'The Metronome',
      basics:
        'A beat bar runs above the ability bar for the whole match. A note crosses it every 1.1 '
        + 'seconds, and the last 0.38 seconds of each sweep — about a third of the bar — is a gold '
        + 'window. Click while the note is inside it (or up to 0.09s after it lands) and the beat is '
        + 'played: your baton spins up by 13%. Click anywhere else and you fumble, losing 8%. A beat '
        + 'that goes past without being played costs 5%, and the spin also bleeds away by 6% every '
        + 'second on its own. Each beat can only be played once.',
      effects: [
        { tag: 'utility', label: 'The beat', detail: 'One note every 1.1s, with a 0.38s gold window at the end of the sweep and 0.09s of grace after it.' },
        { tag: 'buff', label: 'Played', detail: '+13% baton spin, and +1 to the combo.' },
        { tag: 'cost', label: 'Fumbled', detail: 'A click outside the window: −8% spin and the combo resets.' },
        { tag: 'cost', label: 'Dropped', detail: 'A beat nobody played: −5% spin and the combo resets. The spin also decays 6% per second (3% with Staccato).' },
      ],
      notes: [
        'The bar is faster than the old two-second metronome, but the window is far wider.',
        'Your spin and combo are shown on the bar; the spin is also in the status tray.',
      ],
    },
    {
      emoji: '🎵',
      name: 'Out of Tune',
      basics:
        'What Fermata does to people. For 8 seconds a discordant line runs through them, and every '
        + 'ability they press has a 25% chance to misfire: the cooldown is spent and nothing happens. '
        + 'Husks are hit too — a quarter of their bites and shots simply do not come out. Pressing R '
        + 'again while anyone is out of tune detonates it.',
      effects: [
        { tag: 'debuff', label: 'Misfire', detail: '25% of ability presses do nothing, but still go on cooldown. Lasts 8s.' },
        { tag: 'damage', label: 'Detonated', detail: '25 damage and a 0.5s stun to each target, and the tune comes off.' },
      ],
      notes: ['Out of Tune shows in the victim\'s status tray, and online it reaches them as a mirrored status.'],
    },
  ],

  abilities: {
    baton: {
      basics:
        'Your baton is always out. It chases your cursor, but never further than 170px from you, and '
        + 'everything it touches is hit for 3 damage at a standstill up to 12 at full spin — each '
        + 'enemy at most once every 0.3 seconds. Clicking is how you keep time on the metronome: a '
        + 'click on the beat spins the baton up, which makes it hit harder, travel faster (280px/s '
        + 'up to 920px/s) and turn faster.',
      cast: 'Click, on the beat. 0.12s cooldown between clicks.',
      effects: [
        { tag: 'damage', label: 'Contact', detail: '3 + 9 × spin damage per touch (3 → 12), once per enemy every 0.3s.' },
        { tag: 'utility', label: 'Leash', detail: 'Follows the cursor, up to 170px from you.' },
        { tag: 'movement', label: 'Travel', detail: '280px/s at no spin, up to 920px/s at full spin (×1.3 with Staccato).' },
      ],
      upgrade: {
        basics:
          'Musical Perfection: a small bar of richer gold sits in the middle of the metronome\'s gold '
          + 'window, 0.07 seconds wide. A beat played inside it spins the baton up 22% instead of 13%. '
          + 'And your baton hits you now too, in a good way: when it touches you (within 30px) you get '
          + '+35% move speed for 0.55 seconds. Once per touch — the baton has to leave you before it '
          + 'can do it again, and never more than once every 0.9 seconds.',
        effects: [
          { tag: 'buff', label: 'Perfect', detail: '+22% spin for a beat in the 0.07s sliver in the middle of the window.', requiresUpgrade: 'click' },
          { tag: 'movement', label: 'Tempo', detail: '+35% move speed for 0.55s when your own baton touches you. Once per touch, 0.9s apart.', requiresUpgrade: 'click' },
        ],
      },
      notes: [
        'The baton hits wherever it is — park it on somebody and keep the beat.',
        'A faint ring around you shows how far it can reach.',
      ],
    },

    crescendo: {
      basics:
        'You start dancing. For 2 seconds your move speed climbs from 1.2× to 2.4×, and a three-line '
        + 'stave of music trails behind you. When the 2 seconds are up you release a wave of music: '
        + '30 damage to every enemy within 180px.',
      cast: 'E. 8s cooldown.',
      effects: [
        { tag: 'movement', label: 'Dance', detail: 'Move speed ramps from 1.2× to 2.4× over 2s.' },
        { tag: 'damage', label: 'The wave', detail: '30 damage to every enemy within 180px at the end of the dance.' },
      ],
      notes: ['The trail of music is only a picture — the damage is all in the wave.'],
      upgrade: {
        basics:
          'Infectious Moves: everyone the wave hits catches the rhythm and dances for 2 seconds. A '
          + 'dancer can still walk, run and dodge, but cannot use a single ability. Husks keep coming '
          + 'at you, but do not bite or shoot until they stop.',
        effects: [
          { tag: 'control', label: 'Dance', detail: '2s: free to move, unable to attack.', requiresUpgrade: 'e' },
        ],
      },
    },

    fermata: {
      basics:
        'You dash to your baton (0.17s), grab it and slam it down toward the cursor. Everything in a '
        + '130px line 40px either side of the slam — or within 46px of where it lands — takes 20 '
        + 'damage and is Out of Tune for 8 seconds. Press R again while any of them is still out of '
        + 'tune to detonate it: 25 damage and a 0.5 second stun to each, with notes sprouting out of '
        + 'them. The detonation costs nothing.',
      cast: 'R, aimed at the cursor. R again with anyone out of tune: detonate (free). 9s cooldown.',
      effects: [
        { tag: 'movement', label: 'Dash', detail: 'To wherever your baton is, in 0.17s.' },
        { tag: 'damage', label: 'Slam', detail: '20 damage in a 130px × 80px line, or within 46px of the impact.' },
        { tag: 'debuff', label: 'Out of Tune', detail: '8s: 25% of the victim\'s abilities misfire.' },
        { tag: 'control', label: 'Detonate', detail: '25 damage and a 0.5s stun to every target still out of tune.' },
      ],
      notes: ['Your baton is left where you slammed it.', 'With the Bass perk, a slam while Staccato plays also lays a row of water charges.'],
      upgrade: {
        basics:
          'Harmony: press R while your baton is right on top of you (within 36px) and, instead of the '
          + 'dash and slam, you get In Tune. An echo of the baton circles you 62px out, hitting anything '
          + 'it passes for 6 (each target at most every 0.45s), and your soul song plays 50% stronger. In '
          + 'Tune also heals you: 12 HP a second to begin with, falling by 2 HP every second — at 6 '
          + 'seconds it is giving nothing, and after that it hurts you instead. Press R again to end it '
          + 'with a burst worth the net of everything it has done so far: the most (36) right at the '
          + 'turn, less after it, and past 12 seconds the burst hurts. If you never recast, it ends '
          + 'itself at 14 seconds with no burst. The cooldown is paid when you tune up.',
        effects: [
          { tag: 'summon', label: 'Echo baton', detail: 'Orbits 62px out, 6 damage per pass, 0.45s per target.', requiresUpgrade: 'r' },
          { tag: 'buff', label: 'In Tune', detail: 'Your soul song is ×1.5 as strong.', requiresUpgrade: 'r' },
          { tag: 'heal', label: 'Regeneration', detail: '12 − 2 × seconds HP a second: healing for 6s, then hurting. Ends at 14s.', requiresUpgrade: 'r' },
          { tag: 'heal', label: 'Recast', detail: 'A burst equal to the net HP In Tune has given — 36 at best, negative if you wait too long.', requiresUpgrade: 'r' },
        ],
      },
    },

    hum: {
      basics:
        'Changes your Soul Song, in the order Staccato → Melody → Smooth. The song you are humming '
        + 'follows you as three notes in its colour, and it is the colour of your plume. Staccato '
        + '(red): +20% damage, and your baton travels 30% faster and loses its spin half as fast. '
        + 'Melody (blue): +25% move speed and 20% shorter cooldowns. Smooth (green): 20% damage '
        + 'resistance and 3 HP a second.',
      cast: 'F. 2.5s cooldown. A match starts on Staccato.',
      effects: [
        { tag: 'buff', label: 'Staccato', detail: '+20% damage on everything Sound does; baton ×1.3 travel and half the spin decay.' },
        { tag: 'buff', label: 'Melody', detail: '+25% move speed; cooldowns recharge 25% faster (20% shorter).' },
        { tag: 'buff', label: 'Smooth', detail: '20% damage resistance and 3 HP per second.' },
      ],
      notes: ['Only one song plays at a time.'],
      upgrade: {
        basics:
          'Practice Makes Perfect: every beat you hit on the metronome practises the song you are '
          + 'humming. Every 5 beats is a level, up to level 10, and each level makes that song\'s '
          + 'effects 8% stronger for the rest of the round (up to 80%). The three songs level '
          + 'separately. A small tab just above the metronome bar shows the song you are playing, its '
          + 'level and the progress to the next one, and a practised song throws off more sparkles and '
          + 'notes the higher it goes.',
        effects: [
          { tag: 'buff', label: 'Levels', detail: '1 level per 5 beats hit, up to 10. Each level: the song\'s bonuses ×(1 + 0.08 × level).', requiresUpgrade: 'f' },
          { tag: 'utility', label: 'Separate', detail: 'Staccato, Melody and Smooth each keep their own level for the round.', requiresUpgrade: 'f' },
        ],
      },
    },

    'call-of-the-void': {
      basics:
        'You take the stage with a bugle for a solo of up to 15 seconds. You cannot move and you '
        + 'cannot be hurt. A three-line staff scrolls across the screen: move between the lines with '
        + 'W/S or the arrow keys, and click as each note reaches the bar on your line. Each note hit '
        + 'deals 15 damage to the nearest enemy, wherever they are. The chart starts with quarter '
        + 'notes, then eighths and the odd slur, then runs of sixteenths and slurs that change line '
        + 'halfway — a slur has to be held through to its end, on the right line, for 15 more. '
        + 'Clicking a note on the wrong line misses it. Press Q to bow out early.',
      cast: 'Q. 30s cooldown, which starts when the solo ends.',
      effects: [
        { tag: 'shield', label: 'On stage', detail: 'Untouchable and rooted for the solo (up to 15s).' },
        { tag: 'damage', label: 'A note', detail: '15 damage to the nearest enemy per note hit, within 0.125s of the bar.' },
        { tag: 'damage', label: 'A slur', detail: '15 for the head, and 15 more if the click is held to the end on the right line.' },
      ],
      notes: [
        'A new chart is written every solo.',
        'A slur that changes line gives you 0.16s to make the switch.',
      ],
      upgrade: {
        basics:
          'Big Finish!: hold Space during the solo to speed it up — the tempo climbs by 0.12× every '
          + 'second you hold it, up to double speed, and it never comes back down. The notes come faster '
          + 'and the solo ends sooner. When the solo ends (or you bow out) you strike a huge gong: every '
          + 'enemy takes up to 150 damage, scaled by your flair — how far you sped it up, nothing at 1× '
          + 'and the full 150 at 2×. Never speed up, and there is no gong at all. The gong leaves you '
          + 'Deaf for 8 seconds: nothing you do deals any damage. Space does not dodge on stage.',
        effects: [
          { tag: 'utility', label: 'Speed up', detail: 'Hold Space: +0.12× tempo a second, up to 2×. Never slows back down.', requiresUpgrade: 'q' },
          { tag: 'damage', label: 'The gong', detail: '150 × flair to every enemy, where flair = tempo − 1.', requiresUpgrade: 'q' },
          { tag: 'cost', label: 'Deaf', detail: '8s after the gong: all your damage is 0.', requiresUpgrade: 'q' },
        ],
      },
    },
  },

  perks: {
    harmony: {
      basics:
        'Every 8th beat you play in a row on the metronome also lobs a brass resonator at your baton, '
        + 'at most one every 3 seconds. It blasts 0.9 seconds after it lands for 20 damage in 100px, '
        + 'and a hit gives +15% move speed and +15% attack speed for 20 seconds, stacking to 4.',
      cast: 'Automatic on every 8th beat in a row.',
      effects: [
        { tag: 'damage', label: 'The blast', detail: '20 damage in a 100px radius, 0.9s after it lands.' },
        { tag: 'buff', label: 'A hit', detail: '+15% move and attack speed for 20s, stacking to 4 (+60%).' },
      ],
      notes: ['The perk\'s ingredients are acid, sound and light.'],
    },
    bass: {
      basics:
        'While Staccato is your song, every Fermata slam also lays a row of 5 water charges down the '
        + 'line it was slammed along, 52px apart. They go off one after another from 0.48 seconds, '
        + '10 damage each in 48px.',
      cast: 'Automatic on a Fermata slam while Staccato plays.',
      effects: [
        { tag: 'damage', label: 'Charges', detail: '5 charges, 10 damage each in a 48px radius, 0.08s apart.' },
      ],
      notes: ['A divine perk: water and sound.'],
    },
  },
};

export default sound;
