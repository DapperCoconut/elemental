import type { TowerDef } from '../StrongholdTypes';
import { ab, path, up } from './helpers';

/** Rubber, Magic, Technology, Silence, Echo, Justice, Dream and Paint (`chalk`). */
export const BATCH4_TOWERS: Record<string, TowerDef> = {
  rubber: {
    cost: 70, range: 170, role: 'attack', body: { kind: 'ground' },
    blurb: 'Cheap bouncer. Every punch ricochets through the pack.',
    signature: { name: 'Ricochet', desc: 'Its punches bounce on to more husks.' },
    traits: {},
    attacks: {
      punch: ab(7, 600, { kind: 'bolt', color: 0xff5577, speed: 600, bounces: 2 }, 'Rubber Punch: bounces through three husks.', { name: 'Rubber Punch', rider: { knockback: 8 } }),
    },
    paths: [
      path('Ricochet', 'More bounces, harder balls', [
        up('Extra Bounce', 90, 'Punches bounce through five husks and hit +2.', 'bubbles', {
          mods: { punch: { damageAdd: 2, fx: { bounces: 4 } } },
        }),
        up('Hard Rubber', 200, 'Punches 30% faster.', 'bubbles', {
          mods: { punch: { cooldownMult: 0.7 } },
        }),
        up('Sling Shot', 650, 'Adds a heavy ball that bounces through seven husks.', 'barrel', {
          add: { sling: ab(40, 2500, { kind: 'bolt', color: 0xff88aa, speed: 640, size: 1.4, bounces: 6 }, 'Sling Shot: a heavy ball that bounces through seven.', { name: 'Sling Shot', rider: { knockback: 20 }, gesture: 'e' }) },
        }),
        up('Superball', 2000, 'Every ball hits ×2.5, bounces three more times, punches 20% faster.', 'orbit', {
          mods: { '*': { damageMult: 2.5 }, punch: { cooldownMult: 0.8, fx: { bounces: 7 } }, sling: { fx: { bounces: 9 } } },
        }),
        up('Atom-Nhilego', 6000, 'One ball that will not stop: bounces 25 times, leaves husks brittle. All balls ×2.', { kind: 'star', color: 0xff3366 }, {
          add: { atom: ab(60, 1500, { kind: 'bolt', color: 0xff3366, speed: 720, size: 1.8, bounces: 25 }, 'Atom-Nhilego: a ball that bounces 25 times.', { name: 'Atom-Nhilego', rider: { brittle: { add: 5, ms: 3000 } } }) },
          mods: { '*': { damageMult: 2 } },
        }),
      ]),
      path('Bounce House', 'Shove the pack back up the road', [
        up('Springy', 120, 'Punches shove husks 20px back.', 'spikes', {
          mods: { punch: { rider: { knockback: 20 } } },
        }),
        up('Rubber Band', 300, 'Stretches a band across the road every 7s; husks must chew through.', 'chains', {
          add: { band: ab(0, 7000, { kind: 'barrier', ms: 5000, hp: 90, color: 0xff5577, label: '➰' }, 'Rubber Banding: a band stretched across the road.', { name: 'Rubber Band', gesture: 'f' }) },
        }),
        up('Bounce Form', 900, 'ABILITY — Rubberage: a huge bounce flings everything near 120px back. Also springs out every 4.5s.', 'shield', {
          add: { spring: ab(14, 4500, { kind: 'nova', radius: 90, color: 0xff5577 }, 'Bounce Form: springs out, knocking the pack back.', { name: 'Bounce Form', rider: { knockback: 60 }, gesture: 'r' }) },
          active: { name: 'Rubberage', desc: 'Everything within 160px takes 120 and is flung 120px back.', cooldown: 25000, cast: ab(120, 0, { kind: 'nova', radius: 160, color: 0xffaacc }, 'A huge bounce.', { rider: { knockback: 120 } }) },
        }),
        up('Elastic Rebound', 2400, 'Springs shove 100px, the band holds 220, and stopped husks take ×1.5.', 'shield', {
          mods: { spring: { damageMult: 3, rider: { knockback: 100 } }, band: { fx: { hp: 220 } } },
          traits: { bully: 1.5 },
        }),
        up('Rubber Planet', 8000, 'ABILITY — Big Bounce: every husk on the map takes 400, is flung back, and some bounce to the breach.', { kind: 'moon', color: 0xff88aa }, {
          active: { name: 'Big Bounce', desc: 'Map-wide: 400 damage, 250px shove, 15% sent to the breach.', cooldown: 40000, global: true, cast: ab(400, 0, { kind: 'field', color: 0xff88aa }, 'Big Bounce.', { rider: { knockback: 250, banish: 0.15 } }) },
        }),
      ]),
      path('Slingshot', 'Long-range, charged single shots', [
        up('Taut Band', 100, 'Reach +15%; punches hit +3.', 'scope', {
          range: 1.15,
          mods: { punch: { damageAdd: 3 } },
        }),
        up('Draw Back', 280, 'Each hit in a row on the same husk lands +15%, up to +150%.', 'scope', {
          traits: { focus: { per: 0.15, cap: 1.5 } },
        }),
        up('Slingshot Ace', 1100, 'Adds a charged sling: the longer it waits, the harder it hits (up to ×2.5). Reach +20%.', 'pennant', {
          range: 1.2,
          add: { ace: ab(90, 2200, { kind: 'bolt', color: 0xff3366, speed: 900, size: 1.3, pierce: 1 }, 'Slingshot Ace: a charged shot that pierces one.', { name: 'Slingshot Ace', charge: { perSec: 0.4, cap: 2.5 }, gesture: 'e' }) },
        }),
        up('Rubber Bullet', 3000, 'The sling hits ×2.5 and stuns for 0.6s. Bosses take ×1.3.', 'pennant', {
          mods: { ace: { damageMult: 2.5, rider: { stun: 600 } } },
          traits: { bossBane: 1.3 },
        }),
        up('Hypervelocity', 9000, 'Sling ×3, 40% faster, and tears 6% of a husk\'s current health.', { kind: 'eye', color: 0xff3366 }, {
          mods: { ace: { damageMult: 3, cooldownMult: 0.6, rider: { pct: 0.06 } } },
        }),
      ]),
    ],
  },

  magic: {
    cost: 180, range: 200, role: 'attack', body: { kind: 'ground' },
    blurb: 'Spellbook. Seeking stars that never miss.',
    signature: { name: 'Arcane Aim', desc: 'Its stars seek their target.' },
    traits: {},
    attacks: {
      sparkle: ab(16, 600, { kind: 'bolt', look: 'star', color: 0x9944ff, speed: 480, homing: true }, 'Sparkle Shot: a seeking star.', { name: 'Sparkle Shot', dtype: 'magic' }),
    },
    paths: [
      path('Missilecraft', 'More stars, faster, everywhere', [
        up('Twin Stars', 200, 'Casts two seeking stars at once.', 'motes', {
          mods: { sparkle: { countAdd: 1, fx: { spread: 0.4 } } },
        }),
        up('Quickcast', 380, 'Casts 25% faster.', 'motes', {
          mods: { sparkle: { cooldownMult: 0.75 } },
        }),
        up('Magic Missiles', 1300, 'Adds a volley of five seekers every 2.5s.', 'book', {
          add: { missiles: ab(14, 2500, { kind: 'bolt', look: 'star', color: 0xbb88ff, speed: 460, homing: true, count: 5, spread: 1.2 }, 'Magic Missiles: five seekers.', { name: 'Magic Missiles', dtype: 'magic', gesture: 'r' }) },
        }),
        up('Arcane Barrage', 3600, 'Missiles fire three volleys back to back; every star ×1.6.', 'book', {
          mods: { missiles: { fx: { salvo: 3 } }, '*': { damageMult: 1.6 } },
        }),
        up('Archmage', 11000, 'Every star ×3, and eight missiles to a volley.', { kind: 'hat', color: 0x9944ff }, {
          mods: { '*': { damageMult: 3 }, missiles: { countAdd: 3 } },
        }),
      ]),
      path('Spellbook', 'Walls, sight and storms', [
        up('Wall of Fire', 180, 'Adds a wall of fire on the road every 5s.', 'runes', {
          add: { wall: ab(12, 5000, { kind: 'zone', radius: 70, ms: 4000, color: 0xff7733, shape: 'fire' }, 'Wall of Fire, from the spellbook.', { name: 'Wall of Fire', rider: { burn: 1500 }, gesture: 'e' }) },
        }),
        up('Third Eye', 400, 'Sees hidden husks, and its stars strip their camouflage for good.', 'eye', {
          traits: { detect: true },
          mods: { sparkle: { rider: { unmask: true } } },
        }),
        up('Arcane Storm', 1200, 'ABILITY — Arcane Storm: the road becomes a spell circle for 6s. Fire walls ×1.5.', 'runes', {
          mods: { wall: { damageMult: 1.5 } },
          active: { name: 'Arcane Storm', desc: 'A 150px spell circle: 80/s and slows, for 6s.', cooldown: 30000, cast: ab(80, 0, { kind: 'zone', radius: 150, ms: 6000, color: 0x9944ff, shape: 'rune' }, 'Arcane Storm.', { rider: { slow: { mult: 0.6, ms: 600 } } }) },
        }),
        up('Transmogrify', 3000, 'Turns a weakened husk (under 30%) into a toy that marches back up the road.', 'cards', {
          add: { polymorph: ab(30, 9000, { kind: 'convert', thresholdFrac: 0.3, color: 0xbb88ff, look: 'piece' }, 'Transmogrify: a weak husk becomes a toy soldier.', { name: 'Transmogrify', gesture: 'q' }) },
        }),
        up('Grand Magus', 9500, 'ABILITY — Cataclysm: every husk on the map takes 1200 and is Weakened ×1.3 for 5s.', { kind: 'star', color: 0xbb88ff }, {
          active: { name: 'Cataclysm', desc: 'Map-wide: 1200 damage and Weaken ×1.3 for 5s.', cooldown: 50000, global: true, cast: ab(1200, 0, { kind: 'field', color: 0x9944ff }, 'Cataclysm.', { rider: { weaken: { mult: 1.3, ms: 5000 } } }) },
        }),
      ]),
      path('Duplication', 'Copies of the mage that fight on their own', [
        up('Mirror Image', 160, 'A copy of the mage stands beside it and casts for 10s.', 'cape', {
          add: { image: ab(10, 9000, { kind: 'sentry', ms: 10000, max: 1, attackMs: 650, range: 170, color: 0x9944ff, look: 'idol' }, 'Duplication: a copy of the mage fights beside it.', { name: 'Mirror Image', gesture: 'f' }) },
        }),
        up('Twin Copies', 450, 'Two copies at once, each lasting 15s.', 'cape', {
          mods: { image: { countAdd: 1, fx: { ms: 15000 } } },
        }),
        up('Arcane Echo', 1500, 'Every spell repeats 0.6s later at half strength.', 'sparks', {
          traits: { echo: { delayMs: 600, mult: 0.5 } },
        }),
        up('Coven', 3800, 'Copies hit ×3 and cast 30% faster.', 'crystals', {
          mods: { image: { damageMult: 3, fx: { attackMs: 450 } } },
        }),
        up('Hall of Mirrors', 10000, 'Four copies, each ×2.5; echoes land at full strength.', { kind: 'halo', color: 0xbb88ff }, {
          mods: { image: { countAdd: 2, damageMult: 2.5 } },
          traits: { echo: { delayMs: 500, mult: 1 } },
        }),
      ]),
    ],
  },

  technology: {
    cost: 350, range: 180, role: 'support', body: { kind: 'ground' },
    blurb: 'Saboteur. Overclocks your best tower and hacks the road.',
    signature: { name: 'Upload', desc: 'Supercharges the strongest tower near it every 11s.' },
    traits: {},
    attacks: {
      packets: ab(8, 300, { kind: 'bolt', look: 'bolt', color: 0x44ccaa, speed: 760 }, 'Addicting Cruncher: rapid packets.', { name: 'Cruncher', dtype: 'energy' }),
      upload: ab(0, 11000, { kind: 'overclock', ms: 6000, fireRateMult: 1.5, damageMult: 1.2, color: 0x44ffcc }, 'Upload: overclocks the best tower nearby for 6s.', { name: 'Upload', gesture: 'r' }),
    },
    paths: [
      path('Overclocker', 'Make every tower around it better', [
        up('Faster Upload', 200, 'Uploads every 7.7s instead of 11s.', 'antenna', {
          mods: { upload: { cooldownMult: 0.7 } },
        }),
        up('Wide Network', 450, 'Towers within 160px fire 10% faster.', 'antenna', {
          traits: { aura: { radius: 160, fireRate: 1.1, label: 'NETWORK', color: 0x44ccaa } },
        }),
        up('Server Farm', 1600, 'Towers within 180px cost 15% less to build and upgrade; network +15% fire rate.', 'gears', {
          traits: { discount: { radius: 180, mult: 0.85 }, aura: { radius: 170, fireRate: 1.15, label: 'NETWORK', color: 0x44ccaa } },
        }),
        up('Supercomputer', 4200, 'Uploads give ×2.2 fire rate and ×1.6 damage; the network sees hidden husks.', 'gears', {
          mods: { upload: { fx: { fireRateMult: 2.2, damageMult: 1.6 } } },
          traits: { aura: { radius: 180, fireRate: 1.15, detect: true, label: 'NETWORK', color: 0x44ccaa } },
        }),
        up('Singularity', 12000, 'Network: +25% fire rate, +20% damage, +10% reach, detection. Uploads twice as often.', { kind: 'halo', color: 0x88ffee }, {
          mods: { upload: { cooldownMult: 0.5 } },
          traits: { aura: { radius: 220, fireRate: 1.25, damage: 1.2, range: 1.1, detect: true, label: 'SINGULARITY', color: 0x88ffee } },
        }),
      ]),
      path('Admin Console', 'Confuse, drag, and crash the whole road', [
        up('Popup Ads', 150, 'A popup every 5s: husks near it turn round to look.', 'eye', {
          add: { popup: ab(6, 5000, { kind: 'splash', radius: 80, color: 0x66ffcc }, 'Overt Advertisement: husks turn round to look.', { name: 'Popup Ads', rider: { confuse: 1500 }, gesture: 'e' }) },
        }),
        up('Web Drag', 400, 'A web zone every 7s that drags husks back up the road.', 'chains', {
          add: { web: ab(4, 7000, { kind: 'zone', radius: 80, ms: 3000, color: 0x22aa88, shape: 'rune', pull: 70 }, 'Web Drag: drags husks back up the road.', { name: 'Web Drag', gesture: 'f' }) },
        }),
        up('Admin Console', 1400, 'ABILITY — EMP: 150 damage and a 2.5s stun to everything within 220px. Sees hidden husks.', 'antenna', {
          traits: { detect: true },
          active: { name: 'EMP', desc: 'Everything within 220px: 150 damage, stunned 2.5s.', cooldown: 30000, cast: ab(150, 0, { kind: 'nova', radius: 220, color: 0x88ffee }, 'EMP.', { rider: { stun: 2500 } }) },
        }),
        up('Firewall', 3500, 'A firewall across the road every 6s: everything that crosses takes 80 and turns brittle.', 'bricks', {
          add: { firewall: ab(80, 6000, { kind: 'fence', ms: 8000, color: 0x44ffcc, width: 6 }, 'Firewall: every husk that crosses takes the hit.', { name: 'Firewall', rider: { brittle: { add: 5, ms: 3000 } } }) },
        }),
        up('System Crash', 10500, 'ABILITY — System Crash: every husk on the map takes 600 and is stunned 3s.', { kind: 'skull', color: 0x44ffcc }, {
          active: { name: 'System Crash', desc: 'Map-wide: 600 damage, stunned 3s.', cooldown: 45000, global: true, cast: ab(600, 0, { kind: 'field', color: 0x44ffcc }, 'System Crash.', { rider: { stun: 3000 } }) },
        }),
      ]),
      path('Byte Bombs', 'Mines, miners and a drone botnet', [
        up('Logic Bomb', 220, 'Drops two logic-bomb mines on the road every 5s.', 'barrel', {
          add: { mines: ab(40, 5000, { kind: 'trap', count: 2, hits: 1, ms: 12000, color: 0x44ffcc, look: 'mine', blast: 50 }, 'Byte-Bomb: logic bombs on the road.', { name: 'Logic Bomb', gesture: 'q' }) },
        }),
        up('Crypto Miner', 500, 'Mines 2 gold a second while a wave is on.', 'coins', {
          traits: { trickle: 2 },
        }),
        up('Botnet', 1500, 'Launches two hovering drones that shoot on their own.', 'gears', {
          add: { drones: ab(14, 8000, { kind: 'sentry', ms: 15000, max: 2, attackMs: 400, range: 170, color: 0x44ccaa, look: 'drone' }, 'Botnet: drones that shoot on their own.', { name: 'Botnet', gesture: 'f' }) },
        }),
        up('Zero-Day', 4000, 'Every hit corrodes armour and leaves husks brittle; four mines a drop.', 'sparks', {
          mods: { '*': { rider: { corrode: 3000, brittle: { add: 6, ms: 3000 } } }, mines: { countAdd: 2 } },
        }),
        up('Skynet', 11000, 'Four drones, each ×3; mining rises to 6 gold a second.', { kind: 'eye', color: 0xff4455 }, {
          mods: { drones: { countAdd: 2, damageMult: 3 } },
          traits: { trickle: 6 },
        }),
      ]),
    ],
  },

  silence: {
    cost: 205, range: 200, role: 'attack', body: { kind: 'ground' },
    blurb: 'Assassin. Sees hidden husks, doubles damage on them, finishes the weak.',
    signature: { name: 'Assassin', desc: 'Sees hidden husks and hits them ×2. Stabs execute husks under 15%.' },
    traits: { detect: true, vsHidden: 2 },
    attacks: {
      stab: ab(28, 900, { kind: 'execute', thresholdFrac: 0.15, color: 0x8866aa }, 'Stab: kills husks under 15% outright.', { name: 'Stab' }),
    },
    paths: [
      path('Assassin', 'Executes and critical stabs', [
        up('Keen Blade', 150, 'Stabs hit +8.', 'spikes', {
          mods: { stab: { damageAdd: 8 } },
        }),
        up('Hunting Ground', 400, 'Executes under 22%; 15% of stabs crit for ×2.5.', 'spikes', {
          mods: { stab: { fx: { thresholdFrac: 0.22 } } },
          traits: { crit: { chance: 0.15, mult: 2.5 } },
        }),
        up('Run', 1400, 'Stabs 30% faster, and a heavy blow every 6s executes under 35%.', 'cape', {
          mods: { stab: { cooldownMult: 0.7 } },
          add: { run: ab(120, 6000, { kind: 'execute', thresholdFrac: 0.35, color: 0xaa88cc }, 'Run: executes a husk under 35%.', { name: 'Run', gesture: 'q' }) },
        }),
        up('Terror', 3800, 'Every blow ×2.2 and Weakens the husk ×1.25 for 3s.', 'skull', {
          mods: { '*': { damageMult: 2.2, rider: { weaken: { mult: 1.25, ms: 3000 } } } },
        }),
        up('Oblivion', 11000, 'Every blow ×2.5 and tears 5% of current health; stabs execute under 30%.', { kind: 'horns', color: 0x5a3a7a }, {
          mods: { '*': { damageMult: 2.5, rider: { pct: 0.05 } }, stab: { fx: { thresholdFrac: 0.3 } } },
        }),
      ]),
      path('Ritualist', 'Circles, watchers and silence', [
        up('Ritual Circle', 160, 'Drops a ritual circle every 6s that stuns its first victim.', 'runes', {
          add: { ritual: ab(60, 6000, { kind: 'trap', count: 1, hits: 1, ms: 15000, color: 0x3d2a4d, look: 'rune' }, 'Ritual: a circle that stuns its first victim.', { name: 'Ritual', rider: { stun: 1000 }, gesture: 'r' }) },
        }),
        up('Watchers', 450, 'Two watchers stand by the road and strike for 15s.', 'eye', {
          add: { watchers: ab(12, 7000, { kind: 'sentry', ms: 15000, max: 2, attackMs: 900, range: 140, color: 0x5a3a7a, look: 'idol' }, 'Watch: watchers stand by the road and strike.', { name: 'Watchers', gesture: 'e' }) },
        }),
        up('Hush', 1500, 'ABILITY — Hush: every husk on the map takes 100 and is stunned 2.5s.', 'runes', {
          active: { name: 'Hush', desc: 'Map-wide: 100 damage, stunned 2.5s.', cooldown: 35000, global: true, cast: ab(100, 0, { kind: 'field', color: 0x3d2a4d }, 'Hush.', { rider: { stun: 2500 } }) },
        }),
        up('Mature Watchers', 3600, 'Watchers hit ×3, faster, and each strike stuns 0.3s.', 'eye', {
          mods: { watchers: { damageMult: 3, fx: { attackMs: 600 }, rider: { stun: 300 } } },
        }),
        up('Absolute Silence', 10000, 'ABILITY — Absolute Silence: map-wide 700 damage, 4s stun, and every disguise stripped.', { kind: 'halo', color: 0x3d2a4d }, {
          active: { name: 'Absolute Silence', desc: 'Map-wide: 700 damage, 4s stun, camouflage stripped.', cooldown: 45000, global: true, cast: ab(700, 0, { kind: 'field', color: 0x2a1a3a }, 'Absolute Silence.', { rider: { stun: 4000, unmask: true } }) },
        }),
      ]),
      path('Puppeteer', 'Stalkers, and husks turned against their own', [
        up('Stalker', 200, 'A stalker creeps up the road every 7s, striking four husks.', 'cape', {
          add: { stalker: ab(26, 7000, { kind: 'minion', hits: 4, speed: 90, ms: 9000, color: 0x3d2a4d, look: 'ghost' }, 'Stalk: a stalker creeps up the road.', { name: 'Stalker', gesture: 'f' }) },
        }),
        up('Long Stalk', 500, 'Stalkers strike three more husks and come 20% more often.', 'cape', {
          mods: { stalker: { pierceAdd: 3, cooldownMult: 0.8 } },
        }),
        up('Puppetmaster', 1600, 'Every 9s, takes a husk under 40% by its strings and walks it back up the road.', 'chains', {
          add: { puppet: ab(25, 9000, { kind: 'convert', thresholdFrac: 0.4, color: 0x8866aa, look: 'convert' }, 'Puppetmaster: a weak husk walks back for you.', { name: 'Puppetmaster', gesture: 'q' }) },
        }),
        up('Marionettes', 4200, 'Puppets twice as often, under 55%; stalkers ×2.', 'chains', {
          mods: { puppet: { cooldownMult: 0.5, fx: { thresholdFrac: 0.55 } }, stalker: { damageMult: 2 } },
        }),
        up('Grand Guignol', 12000, 'Husks dying near it rise 35% of the time; stalkers ×3; puppets under 70%.', { kind: 'skull', color: 0x8866aa }, {
          traits: { raiseDead: { chance: 0.35, hits: 6 } },
          mods: { stalker: { damageMult: 3 }, puppet: { fx: { thresholdFrac: 0.7 } } },
        }),
      ]),
    ],
  },

  echo: {
    cost: 155, range: 180, role: 'attack', body: { kind: 'ground' },
    blurb: 'Every cast twice. Sonar finds what hides.',
    signature: { name: 'Reverb', desc: 'Every instant cast echoes 0.6s later at half strength. Sees hidden husks.' },
    traits: { echo: { delayMs: 600, mult: 0.5 }, detect: true },
    attacks: {
      pulse: ab(10, 650, { kind: 'bolt', look: 'note', color: 0xccccff, speed: 560 }, 'Echo: a pulse of sound.', { name: 'Echo Pulse' }),
    },
    paths: [
      path('Resonance', 'Louder echoes, until they hit as hard', [
        up('Sustain', 120, 'Echoes land at 70%; pulses hit +2.', 'notes', {
          traits: { echo: { delayMs: 600, mult: 0.7 } },
          mods: { pulse: { damageAdd: 2 } },
        }),
        up('Double Time', 350, 'Pulses 25% faster.', 'notes', {
          mods: { pulse: { cooldownMult: 0.75 } },
        }),
        up('Resonance', 1100, 'Adds a ringing ping every 2.5s that leaves husks brittle.', 'drum', {
          add: { ping: ab(30, 2500, { kind: 'splash', radius: 70, color: 0xaaaaff, shape: 'ring' }, 'Resonance: a ping that leaves husks brittle.', { name: 'Resonance', rider: { brittle: { add: 4, ms: 2500 } }, gesture: 'e' }) },
        }),
        up('Feedback Loop', 3200, 'Echoes land at full strength, sooner; everything ×1.6.', 'drum', {
          traits: { echo: { delayMs: 450, mult: 1 } },
          mods: { '*': { damageMult: 1.6 } },
        }),
        up('Cacophony', 9500, 'Everything ×2.5, pings 60% wider, three pulses at once.', { kind: 'horns', color: 0xccccff }, {
          mods: { '*': { damageMult: 2.5 }, ping: { areaMult: 1.6 }, pulse: { countAdd: 2, fx: { spread: 0.5 } } },
        }),
      ]),
      path('Sonar', 'Find them, light them, deafen them', [
        up('Sonar Ping', 140, 'Pulses strip a hidden husk\'s camouflage for good.', 'antenna', {
          mods: { pulse: { rider: { unmask: true } } },
        }),
        up('Lantern', 380, 'Reach +10%; lights a slowing lantern zone on the road every 7s.', 'lantern', {
          range: 1.1,
          add: { lantern: ab(6, 7000, { kind: 'zone', radius: 90, ms: 5000, color: 0xddddff, shape: 'rune' }, 'Lantern: lights the road and slows.', { name: 'Lantern', rider: { reveal: 2000, slow: { mult: 0.8, ms: 600 } }, gesture: 'r' }) },
        }),
        up('Total Eclipse', 1300, 'ABILITY — Total Eclipse: a deafening ring — 200 damage and a 1.5s stun within 220px.', 'antenna', {
          active: { name: 'Total Eclipse', desc: 'Everything within 220px: 200 damage, stunned 1.5s.', cooldown: 28000, cast: ab(200, 0, { kind: 'nova', radius: 220, color: 0xeeeeff }, 'Total Eclipse.', { rider: { stun: 1500 } }) },
        }),
        up('Echolocation', 3000, 'Reach +15%; hidden husks take ×1.8; hits in a row ramp +10% up to +100%.', 'eye', {
          range: 1.15,
          traits: { vsHidden: 1.8, focus: { per: 0.1, cap: 1 } },
        }),
        up('Grand Cacophony', 9000, 'ABILITY — Grand Cacophony: every husk on the map takes 700 and is stunned 2s.', { kind: 'moon', color: 0xddddff }, {
          active: { name: 'Grand Cacophony', desc: 'Map-wide: 700 damage, stunned 2s.', cooldown: 42000, global: true, cast: ab(700, 0, { kind: 'field', color: 0xccccff }, 'Grand Cacophony.', { rider: { stun: 2000 } }) },
        }),
      ]),
      path('Bat Colony', 'Bats that swoop up the road', [
        up('Bat Form', 200, 'A bat swoops up the road every 5s, striking four husks.', 'wings', {
          add: { bats: ab(14, 5000, { kind: 'minion', hits: 4, speed: 140, ms: 6000, color: 0x8888cc, look: 'crow' }, 'Bat Form: a bat swoops up the road.', { name: 'Bats', gesture: 'f' }) },
        }),
        up('Colony', 450, 'Bats come 40% more often and strike two more husks.', 'wings', {
          mods: { bats: { cooldownMult: 0.6, countAdd: 2 } },
        }),
        up('Shriek Bats', 1400, 'Bats ×2.5; kills burst into two sonic shards.', 'sparks', {
          mods: { bats: { damageMult: 2.5 } },
          traits: { shrapnel: { count: 2, frac: 0.1 } },
        }),
        up('Swarm', 3600, 'A whole swarm every 4s: ten strikes each.', 'bones', {
          add: { swarm: ab(30, 4000, { kind: 'minion', hits: 10, speed: 180, ms: 6000, color: 0x6666aa, look: 'crow', size: 1.3 }, 'Swarm: a cloud of bats up the road.', { name: 'Swarm' }) },
        }),
        up('Night Choir', 10000, 'Everything ×3, and echoes land at 80%.', { kind: 'wings', color: 0x6666aa }, {
          mods: { '*': { damageMult: 3 } },
          traits: { echo: { delayMs: 600, mult: 0.8 } },
        }),
      ]),
    ],
  },

  justice: {
    cost: 380, range: 240, role: 'sniper', body: { kind: 'ground' },
    blurb: 'Magistrate. Long spears, executions, and bosses humbled.',
    signature: { name: 'Sentence', desc: 'Bosses take ×1.4 from its spears.' },
    traits: { bossBane: 1.4 },
    attacks: {
      spear: ab(40, 800, { kind: 'bolt', look: 'needle', color: 0xe8c24a, speed: 900, pierce: 2 }, 'Spear Thrust: a spear through three husks.', { name: 'Spear Thrust' }),
    },
    paths: [
      path('Executioner', 'Heavier spears and final verdicts', [
        up('Weighted Spear', 250, 'Spears hit +15.', 'spikes', {
          mods: { spear: { damageAdd: 15 } },
        }),
        up('Swift Verdict', 600, 'Spears 25% faster.', 'spikes', {
          mods: { spear: { cooldownMult: 0.75 } },
        }),
        up('Judgement Day', 2000, 'Spears ×1.4; every 8s a verdict executes a husk under 30%.', 'book', {
          mods: { spear: { damageMult: 1.4 } },
          add: { judgement: ab(150, 8000, { kind: 'execute', thresholdFrac: 0.3, color: 0xffd700 }, 'Judgement Day: executes a husk under 30%.', { name: 'Judgement Day', gesture: 'q' }) },
        }),
        up('Tribunal', 5000, 'Everything ×2.2; bosses take ×1.8.', 'book', {
          mods: { '*': { damageMult: 2.2 } },
          traits: { bossBane: 1.8 },
        }),
        up('Final Judgement', 14000, 'Everything ×2.5; spears tear 4% of current health; verdicts execute under 45%.', { kind: 'crown', color: 0xffd700 }, {
          mods: { '*': { damageMult: 2.5 }, spear: { rider: { pct: 0.04 } }, judgement: { fx: { thresholdFrac: 0.45 } } },
        }),
      ]),
      path('Coliseum', 'Arenas, rallies and a valkyrie', [
        up('Coliseum', 220, 'An arena of judgement every 6s that slows husks inside.', 'bricks', {
          add: { arena: ab(8, 6000, { kind: 'zone', radius: 90, ms: 4000, color: 0xe8c24a, shape: 'holy' }, 'Coliseum: an arena that slows.', { name: 'Coliseum', rider: { slow: { mult: 0.7, ms: 600 } }, gesture: 'e' }) },
        }),
        up('Sheer Will', 550, 'Every 9s, towers within 160px hit 25% harder for 5s.', 'banner', {
          add: { will: ab(0, 9000, { kind: 'rally', radius: 160, ms: 5000, damageMult: 1.25, color: 0xffe08a }, 'Sheer Will: nearby towers hit harder.', { name: 'Sheer Will', gesture: 'r' }) },
        }),
        up('Valkyrie', 1800, 'ABILITY — Flight of the Valkyrie: a 600px diving strike — 400 damage and a stun.', 'wings', {
          active: { name: 'Valkyrie', desc: 'A 600px dive down the road: 400 damage, stunned 0.8s.', cooldown: 25000, cast: ab(400, 0, { kind: 'line', length: 600, width: 70, color: 0xfff0b0 }, 'Flight of the Valkyrie.', { rider: { stun: 800 } }) },
        }),
        up('Oathkeeper', 4000, 'Wards the keep: 3 lives of breaches soaked each wave. Rallies +40%.', 'shield', {
          traits: { keepWard: 3 },
          mods: { will: { fx: { damageMult: 1.4 } } },
        }),
        up('Divine Verdict', 12000, 'ABILITY — Divine Verdict: every husk on the map takes 1000 and is Weakened ×1.4 for 6s.', { kind: 'halo', color: 0xffd700 }, {
          active: { name: 'Divine Verdict', desc: 'Map-wide: 1000 damage, Weaken ×1.4 for 6s.', cooldown: 50000, global: true, cast: ab(1000, 0, { kind: 'field', color: 0xffd700 }, 'Divine Verdict.', { rider: { weaken: { mult: 1.4, ms: 6000 } } }) },
        }),
      ]),
      path('Vigilante', 'Long reach, bounties and wanted posters', [
        up('Eagle Eye', 180, 'Reach +25%.', 'scope', {
          range: 1.25,
        }),
        up('Bounty Hunter', 500, 'Kills in its reach pay 25% more gold.', 'sack', {
          traits: { plunder: 0.25 },
        }),
        up('Vengeance', 2200, 'A spear from heaven every 6s; 20% of hits crit ×2.', 'pennant', {
          add: { vengeance: ab(180, 6000, { kind: 'splash', radius: 90, color: 0xffd700, delayMs: 700, shape: 'strike' }, 'Vigilante Vengeance: a spear from heaven.', { name: 'Vengeance', gesture: 'q' }) },
          traits: { crit: { chance: 0.2, mult: 2 } },
        }),
        up('Wanted Poster', 4500, 'Each hit pays 1 gold (up to 60 a wave); everything ×2.', 'coins', {
          traits: { goldOnHit: { perHit: 1, cap: 60 } },
          mods: { '*': { damageMult: 2 } },
        }),
        up('Lawgiver', 13000, 'Reach +40%, sees and unmasks hidden husks, everything ×2.5.', { kind: 'eye', color: 0xffd700 }, {
          range: 1.4,
          traits: { detect: true },
          mods: { '*': { damageMult: 2.5, rider: { unmask: true } } },
        }),
      ]),
    ],
  },

  dream: {
    cost: 125, range: 190, role: 'control', body: { kind: 'ground' },
    blurb: 'Sandman. Puts husks to sleep where they stand.',
    signature: { name: 'Sandman', desc: 'Sleeps stop husks dead until the timer ends or they take three hits.' },
    traits: {},
    attacks: {
      sand: ab(8, 650, { kind: 'bolt', color: 0x8f7cff, speed: 520 }, 'Sandmen: a kick of sand; a quarter of hits put it to sleep.', { name: 'Sandmen', rider: { sleep: 1500, chance: 0.25 } }),
    },
    paths: [
      path('Lullaby', 'Deeper sleep for the whole road', [
        up('Drowsy', 100, '40% of sand kicks send a husk to sleep.', 'motes', {
          mods: { sand: { rider: { chance: 0.4 } } },
        }),
        up('Delve', 280, 'A drowsy haze every 6s that puts waders to sleep.', 'motes', {
          add: { haze: ab(4, 6000, { kind: 'zone', radius: 80, ms: 4000, color: 0x8f7cff, shape: 'smoke' }, 'Delve: a drowsy haze on the road.', { name: 'Delve', rider: { sleep: 1200, chance: 0.3 }, gesture: 'e' }) },
        }),
        up('Sleep Tight', 900, 'Every 8s, everything within 120px falls asleep for 2.5s.', 'moon', {
          add: { tight: ab(0, 8000, { kind: 'nova', radius: 120, color: 0xb8a8ff }, 'Sleep Tight: everything near it falls asleep.', { name: 'Sleep Tight', rider: { sleep: 2500 }, gesture: 'f' }) },
        }),
        up('Music Box', 2600, 'Sleeping and slowed husks take ×1.8; every hit leaves them brittle.', 'drum', {
          traits: { bully: 1.8 },
          mods: { '*': { rider: { brittle: { add: 4, ms: 2500 } } } },
        }),
        up('Eternal Sleep', 7500, 'Sleep Tight every 4s, 50% wider, 4s long; the haze 60% wider.', { kind: 'moon', color: 0xb8a8ff }, {
          mods: { tight: { cooldownMult: 0.5, areaMult: 1.5, rider: { sleep: 4000 } }, haze: { areaMult: 1.6 } },
        }),
      ]),
      path('Nightmare', 'Bad dreams that send them running back', [
        up('Pillow Fight', 150, 'Throws a pillow every 3.5s that knocks husks back.', 'cape', {
          add: { pillow: ab(22, 3500, { kind: 'bolt', color: 0xeeeeff, speed: 480, size: 1.5 }, 'Pillow Fight: a pillow that knocks back.', { name: 'Pillow Fight', rider: { knockback: 40 }, gesture: 'r' }) },
        }),
        up('Bad Dreams', 400, 'Pillows also turn husks round for 1.5s.', 'horns', {
          mods: { pillow: { rider: { confuse: 1500 } } },
        }),
        up('Nightmare', 1300, 'ABILITY — Nightmare: 120 damage within 180px and the pack runs back for 3s.', 'skull', {
          active: { name: 'Nightmare', desc: 'Within 180px: 120 damage, confused 3s.', cooldown: 30000, cast: ab(120, 0, { kind: 'splash', radius: 180, color: 0x5a3aaa, shape: 'ring' }, 'Nightmare.', { rider: { confuse: 3000 } }) },
        }),
        up('Night Terrors', 3200, 'Pillows ×3 and tear 4% of current health.', 'horns', {
          mods: { pillow: { damageMult: 3, rider: { pct: 0.04 } } },
        }),
        up('Waking Nightmare', 9500, 'ABILITY — Waking Nightmare: map-wide 500 damage, 4s confusion, 20% flee to the breach.', { kind: 'eye', color: 0x5a3aaa }, {
          active: { name: 'Waking Nightmare', desc: 'Map-wide: 500 damage, confused 4s, 20% sent to the breach.', cooldown: 48000, global: true, cast: ab(500, 0, { kind: 'field', color: 0x5a3aaa }, 'Waking Nightmare.', { rider: { confuse: 4000, banish: 0.2 } }) },
        }),
      ]),
      path('Dreamcatcher', 'Sweet dreams that pay', [
        up('Sweet Dreams', 150, 'Pays 25 gold every wave cleared.', 'coins', {
          traits: { income: 25 },
        }),
        up('Daydream', 400, 'Every 10s, towers within 160px fire 20% faster for 5s.', 'star', {
          add: { daydream: ab(0, 10000, { kind: 'rally', radius: 160, ms: 5000, fireRateMult: 1.2, color: 0xb8a8ff }, 'Daydream: nearby towers fire faster.', { name: 'Daydream', gesture: 'f' }) },
        }),
        up('Lucid', 1500, 'Pays 150 a wave; towers within 150px cost 10% less.', 'gold-trim', {
          traits: { income: 150, discount: { radius: 150, mult: 0.9 } },
        }),
        up('Reverie', 3800, 'Earns 10 gold a second while a wave is on; daydreams +35%.', 'coins', {
          traits: { trickle: 10 },
          mods: { daydream: { fx: { fireRateMult: 1.35 } } },
        }),
        up('Dreamland', 9000, 'Pays 400 a wave and 14 a second; towers within 180px cost 20% less.', { kind: 'crown', color: 0xb8a8ff }, {
          traits: { income: 400, trickle: 14, discount: { radius: 180, mult: 0.8 } },
        }),
      ]),
    ],
  },

  chalk: {
    cost: 95, range: 190, role: 'control', body: { kind: 'ground' },
    blurb: 'Painter. Wet paint makes everything hit harder.',
    signature: { name: 'Wet Paint', desc: 'Its splotches Expose: the next hit on that husk lands ×1.5.' },
    traits: {},
    attacks: {
      splotch: ab(9, 600, { kind: 'bolt', color: 0xe0457b, speed: 540, splash: 30 }, 'Splotch: a splash of paint that Exposes.', { name: 'Splotch', rider: { expose: 2500 } }),
    },
    paths: [
      path('Pigments', 'Paint that makes every tower hit harder', [
        up('Bright Colours', 90, 'Splotches also Weaken ×1.15 for 3s.', 'motes', {
          mods: { splotch: { rider: { weaken: { mult: 1.15, ms: 3000 } } } },
        }),
        up('Wet Paint', 250, 'Splotches 25% faster and wider.', 'motes', {
          mods: { splotch: { cooldownMult: 0.75, fx: { splash: 45 } } },
        }),
        up('Masterpiece', 950, 'Paints a 200px canvas on the road every 14s that Weakens ×1.3.', 'banner', {
          add: { canvas: ab(10, 14000, { kind: 'zone', radius: 200, ms: 7000, color: 0xe0457b, shape: 'paint' }, 'Masterpiece: a canvas that Weakens.', { name: 'Masterpiece', rider: { weaken: { mult: 1.3, ms: 1500 } }, gesture: 'q' }) },
        }),
        up('Yin-Yang', 2600, 'Everything ×2 and leaves husks brittle (+6 per hit).', 'moon', {
          mods: { '*': { damageMult: 2, rider: { brittle: { add: 6, ms: 3000 } } } },
        }),
        up('Magnum Opus', 8000, 'Canvas 30% wider and Weakens ×1.6; everything ×2.5.', { kind: 'halo', color: 0xe0457b }, {
          mods: { canvas: { areaMult: 1.3, rider: { weaken: { mult: 1.6, ms: 1500 } } }, '*': { damageMult: 2.5 } },
        }),
      ]),
      path('Still Life', 'Slick paint and frozen pictures', [
        up('Congealed Paint', 140, 'A slick every 6s that halves their pace.', 'bubbles', {
          add: { slick: ab(3, 6000, { kind: 'zone', radius: 80, ms: 6000, color: 0x6aa0ff, shape: 'paint' }, 'Congealed Paint: a slick that halves their pace.', { name: 'Congealed Paint', rider: { slow: { mult: 0.5, ms: 600 } }, gesture: 'r' }) },
        }),
        up('Still Life', 420, 'Every 8s, paints the pack into a picture — frozen 1.5s.', 'book', {
          add: { still: ab(10, 8000, { kind: 'splash', radius: 90, color: 0xffffff }, 'Still Life: the pack frozen in a picture.', { name: 'Still Life', rider: { freeze: 1500 }, gesture: 'f' }) },
        }),
        up('Whitewash', 1200, 'ABILITY — Whitewash: paints the whole road — every husk takes 80 and freezes 2.5s.', 'book', {
          active: { name: 'Whitewash', desc: 'Map-wide: 80 damage, frozen 2.5s.', cooldown: 30000, global: true, cast: ab(80, 0, { kind: 'field', color: 0xffffff }, 'Whitewash.', { rider: { freeze: 2500 } }) },
        }),
        up('Mural', 3000, 'Still Life every 4.8s and ×4.', 'bricks', {
          mods: { still: { cooldownMult: 0.6, damageMult: 4 } },
        }),
        up('Gallery', 9000, 'ABILITY — Living Portrait: map-wide 600 damage, 4s freeze, camouflage painted over.', { kind: 'star', color: 0xffffff }, {
          active: { name: 'Living Portrait', desc: 'Map-wide: 600 damage, frozen 4s, camouflage stripped.', cooldown: 45000, global: true, cast: ab(600, 0, { kind: 'field', color: 0xeeeeff }, 'Living Portrait.', { rider: { freeze: 4000, unmask: true } }) },
        }),
      ]),
      path('Volatile', 'Paint bombs and spray cans', [
        up('Volatile Orange', 180, 'Drops a paint bomb on the road every 4s.', 'barrel', {
          add: { bomb: ab(34, 4000, { kind: 'trap', count: 1, hits: 1, ms: 14000, color: 0xff8a2a, look: 'mine', blast: 60 }, 'Volatile Orange: a paint bomb on the road.', { name: 'Volatile Orange', gesture: 'e' }) },
        }),
        up('Splatter', 400, 'Two paint bombs a drop.', 'barrel', {
          mods: { bomb: { countAdd: 1 } },
        }),
        up('Paint Barrel', 1400, 'Bombs ×2.5; kills spatter three shards into neighbours.', 'sparks', {
          mods: { bomb: { damageMult: 2.5 } },
          traits: { shrapnel: { count: 3, frac: 0.1 } },
        }),
        up('Spray Can', 3500, 'Splotches come in bursts of three, ×1.5.', 'gears', {
          mods: { splotch: { damageMult: 1.5, fx: { salvo: 3 } } },
        }),
        up('Pop Art', 10000, 'Everything ×3; four bombs a drop, 30% wider.', { kind: 'sun', color: 0xff8a2a }, {
          mods: { '*': { damageMult: 3 }, bomb: { countAdd: 2, areaMult: 1.3 } },
        }),
      ]),
    ],
  },
};
