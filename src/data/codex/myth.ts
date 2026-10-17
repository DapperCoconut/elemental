import { ElementCodex } from '../AbilityCodex';

/**
 * Myth — the ultimate element.
 *
 * Verified against `src/elements/myth.ts` and `kits/MythKit.ts`. Myth has no shop upgrades,
 * perks or mastery enhancements yet; every figure below is a constant at the top of the kit. The
 * tray is five keys; Final Destiny re-arms the same five as guns, and those five are documented
 * as their own entries.
 */
const myth: ElementCodex = {
  identity:
    'Myth is a storyteller with a crowd. Every ability has a first act you can always cast and a '
    + 'second act that costs an Echo Shard — the whip\'s phantom maces, Truth Breaker\'s true-damage '
    + 'dash, a longer and faster Determination, the beast\'s recall — and the crowd ringing the arena '
    + 'throws you a shard whenever you put 45 damage together inside four seconds. Truth Breaker is '
    + 'the game\'s one source of true damage: nothing on the other side can block it. The ultimate, '
    + 'Final Destiny, drops you into first person for fifteen seconds with a pistol, a shotgun, a '
    + 'grenade launcher, a hunter rifle and a shadow rocket on the five keys.',

  passives: [
    {
      emoji: '🎭',
      name: 'The Crowd',
      basics:
        'A crowd fills the border all the way round the arena, and it is watching you. Deal 45 damage '
        + 'inside any four-second window and it cheers for 2.6 seconds — jumping, arms up, confetti of '
        + 'stars — and throws you an Echo Shard, then it sits back down for 5 seconds before it can be '
        + 'won over again. Take 50 damage inside four seconds and it jeers instead: you are Jeered for 4 '
        + 'seconds, taking 10% more damage, and the booing cannot repeat for 6 seconds.',
      effects: [
        { tag: 'resource', label: 'The cheer', detail: '45 damage dealt inside a rolling 4s window = +1 Echo Shard (3 held at most) and a 2.6s cheer. 5s before the meter can pay out again; the window empties when it does.' },
        { tag: 'debuff', label: 'The jeer', detail: '50 damage taken (pre-mitigation) inside a rolling 4s window = Jeered for 4s: 10% more damage taken. 6s before it can repeat.' },
        { tag: 'utility', label: 'Who counts', detail: 'Only damage this kit dealt fills the cheer meter; everything aimed at you fills the jeer meter, mitigated or not.' },
      ],
      notes: [
        'The whole crowd — both bots in a mirror share it — is one mood: a cheer and a jeer cannot overlap, the newer one wins.',
        'The bot reads how close the crowd is to cheering and presses with the whip when a shard is near.',
      ],
    },
    {
      emoji: '💠',
      name: 'Echo Shards',
      basics:
        'The crowd\'s currency, held as spinning cyan crystals over your head, three at most. Every '
        + 'ability spends one for its second act: right-click enhances the whip for 8 seconds, E again inside '
        + 'the 3-second window after a slash is a 240px true-damage dash, R again during Determination adds '
        + '5 seconds of immunity and 25% speed, F again while the beast is loose calls it home with its catch. '
        + 'A recast never touches the ability\'s cooldown, so with three shards E is a slash and three dashes.',
      effects: [
        { tag: 'resource', label: 'The cap', detail: '3 shards held at most. A cheer with a full hand is wasted.' },
        { tag: 'resource', label: 'The spend', detail: 'One shard per recast. A press with none is refused and the base cooldown is untouched.' },
        { tag: 'utility', label: 'Not a cooldown', detail: 'Recasts stamp nothing: every one is instant and repeatable while the window and the shards hold.' },
      ],
      notes: [
        'Final Destiny spends nothing and ends the Truth Breaker window — in there, the shards simply wait.',
        'The bot spends its own shards: the dash when you are inside 280px of it, the recall when the beast is carrying you off, the longer Determination when it is under half health.',
      ],
    },
  ],

  abilities: {
    'myth-whip': {
      basics:
        'Lash a cosmic whip 180px along your aim: everyone within 22px of the lash takes 12. The star mace at '
        + 'the tip — the last 36px — hits for 24 instead and stuns for 0.6 seconds. Right-click spends an Echo '
        + 'Shard to enhance the whip for 8 seconds: every lash leaves a phantom mace circling where the tip '
        + 'landed, 26px wide, for 3 seconds, hitting anyone it touches for 6 every half second.',
      cast: 'Click, aimed at the cursor; hold to lash every 0.65s. Right-click spends a shard for the enhancement.',
      effects: [
        { tag: 'damage', label: 'The lash', detail: '12 damage to everyone within 22px of the 180px line.' },
        { tag: 'damage', label: 'The star mace', detail: '24 instead of 12 for a body within 18px of the tip (plus its own radius).' },
        { tag: 'control', label: 'The mace\'s stun', detail: '0.6s stun on a tip hit. Held still and disarmed for the duration.' },
        { tag: 'summon', label: 'Phantom maces', detail: 'Right-click, 1 shard: for 8s each lash drops a mace that orbits the tip point at 26px for 3s — 6 damage per touch, once per 0.5s per body.', },
      ],
      notes: [
        'Aim a little past the target so the tip, not the rope, is what lands — that is double damage and a stun.',
        'A stunned body is where Truth Breaker goes next; the bot knows this.',
      ],
    },

    'myth-truth': {
      basics:
        'Draw Excalibur and slash a 150px arc, 45° either side of your aim, for 22 TRUE damage: no armour, '
        + 'resistance, shield, absorber, dodge roll, flat reduction, damage cap, extra health or menu cut has '
        + 'any say — only invincibility frames stop it. For 3 seconds after, E again spends an Echo Shard to '
        + 'dash 240px along your aim in 0.22 seconds, cutting everyone within 46px for 32 more true damage; '
        + 'each dash reopens the window, so three shards are three dashes.',
      cast: 'E, aimed at the cursor. 6s cooldown. E again inside the window with a shard is the dash, free of the cooldown.',
      effects: [
        { tag: 'damage', label: 'The slash', detail: '22 true damage in a 150px arc, ±45° off the aim.' },
        { tag: 'utility', label: 'True damage', detail: 'Skips the entire mitigation stage and every absorb layer: shields, absorbers, weak/clotted/corrupt HP, flat reductions, caps, Clay\'s Fuse, the damage budget. Vulnerability amplifiers still apply. Invincibility and dodge i-frames still stop it.' },
        { tag: 'movement', label: 'The dash', detail: '1 shard: 240px in 0.22s along the aim, within 3s of a slash.' },
        { tag: 'damage', label: 'The dash\'s cut', detail: '32 true damage to everyone within 46px of you during the dash, once each.' },
        { tag: 'resource', label: 'The window', detail: '3s after the slash; a dash sets it to 3.22s again, so the chain only ends when the shards do.' },
      ],
      notes: [
        'High Gravity still kills the dash, as it kills every dash in the game — the shard is kept.',
        'Online, true damage carries its own relay flag so the victim\'s shields do not catch it on their side either.',
      ],
    },

    'myth-determination': {
      basics:
        'Decide you will not fall: invincible for 1.5 seconds, then immune to every stun, root and slow for '
        + '3 seconds. R again while it runs spends an Echo Shard for 5 more seconds of immunity and 25% '
        + 'more movement speed for all of what is left.',
      cast: 'R. 14s cooldown. R again during the effect with a shard extends it, once per cast.',
      effects: [
        { tag: 'shield', label: 'Invincible', detail: '1.5s during which nothing lands — including true damage.' },
        { tag: 'buff', label: 'Unstoppable', detail: '3s immune to stuns, roots, slows and forced movement, starting as the invincibility ends.' },
        { tag: 'buff', label: 'The recast', detail: '1 shard: +5s of immunity and ×1.25 movement speed for the rest of the effect.' },
      ],
      notes: [
        'The bot presses it after taking 28 in a second and a half, which is also when you should.',
        'A second Determination before the first ends does not stack — it restarts the clock.',
      ],
    },

    'myth-beast': {
      basics:
        'A portal opens 70px behind you and, after half a second, a beast pours out of it and runs along '
        + 'your aim at 260 px/s. Everyone within 42px of its head is caught: dragged in front of it and bitten '
        + 'for 8 every half second until the beast hits a wall and dissolves. If the beast runs through you, '
        + 'you flip over it for 20% speed for 4 seconds. F again while it is loose spends an Echo Shard to '
        + 'call it home: it turns back toward its portal dragging its catch, and you can flip again on the way.',
      cast: 'F, aimed at the cursor. 16s cooldown; refused while a beast of yours is already loose. F again with a shard recalls it.',
      effects: [
        { tag: 'summon', label: 'The beast', detail: 'Emerges 0.45s after the portal opens 70px behind you, 260 px/s along the aim, a 30px head and nine body segments.' },
        { tag: 'control', label: 'The catch', detail: 'Bodies within 42px of the head are held 26px ahead of it and carried until it stops. Unstoppable and knockback-immune bodies cannot be caught.' },
        { tag: 'dot', label: 'The bite', detail: '8 damage every 0.5s to everything caught.' },
        { tag: 'buff', label: 'The flip', detail: 'Pass within 50px of the head: a 0.52s vault and 20% speed for 4s. 0.9s before it can happen again.' },
        { tag: 'movement', label: 'The recall', detail: '1 shard: the beast reverses toward its portal with everything it holds and dissolves on arrival.' },
      ],
      notes: [
        'Cast it with your back to a wall and the portal is pushed inside the arena: it never opens off the floor.',
        'The bot walks into its own beast\'s path to flip, and recalls it when the beast is carrying you more than 200px away.',
      ],
    },

    'myth-destiny': {
      basics:
        'Fifteen seconds in first person. The arena is drawn from your feet along a yaw you steer with the '
        + 'cursor — its distance from the centre of the screen is your turn rate, the crosshair is where the '
        + 'shots go — and WASD walks forward, back and sideways relative to where you look. The five keys '
        + 'become five guns, each with its own cooldown, and the whip, the blade, the oath and the beast are '
        + 'off the keys until it ends.',
      cast: 'Q, facing the cursor. 30s cooldown. Cannot be ended early.',
      effects: [
        { tag: 'utility', label: 'The view', detail: '15s. A 90° field of view, the real walls and the real 80px grid in perspective, every body and shot as a billboard scaled by distance.' },
        { tag: 'movement', label: 'The controls', detail: 'Cursor offset cubed × 3.1 rad/s turns you; the crosshair aims within ±41° of the facing. WASD is forward/back/strafe at full speed.' },
        { tag: 'utility', label: 'The guns', detail: 'Click Pistol (0.36s), E Shotgun (2.2s), R Grenade Barrage (6s), F Hunter Rifle (4.5s), Q Shadow Rocket (12s) — each documented on its own card.' },
        { tag: 'cost', label: 'The trade', detail: 'No whip, slash, oath or beast for the duration; the Truth Breaker window closes on cast. Shards are kept.' },
      ],
      notes: [
        'Everyone else sees you standing in the arena with the gun in both hands, firing in two dimensions — your shots are ordinary arena shots.',
        'A speech bubble pins to the corners of the screen while you are in there, since heads are not where the picture says.',
      ],
    },

    'myth-pistol': {
      basics:
        'Final Destiny\'s Click. A 980 px/s round for 8 damage that lives 1.1 seconds. Every hit leaves the '
        + 'target Exposed to Myth: 5% more damage taken per stack for 5 seconds, up to 4 stacks.',
      cast: 'Click in first person; hold to fire every 0.36s.',
      effects: [
        { tag: 'damage', label: 'The round', detail: '8 damage on the first body within 20px of its path. 980 px/s, gone after 1.1s or a wall.' },
        { tag: 'debuff', label: 'Exposed', detail: '+1 stack per hit, 4 at most: 5% more damage taken per stack for 5s, refreshed by each hit.' },
      ],
      notes: ['It is a registered projectile: anything that steals or intercepts shots can take it.'],
    },

    'myth-shotgun': {
      basics:
        'Final Destiny\'s E. Seven pellets in a 28° cone out to 200px, 6 damage each to the first body on their '
        + 'line, so a point-blank target eats all seven for 42. Exposed stacks count double against it: a target at '
        + '15% vulnerability takes 30% more from every pellet.',
      cast: 'E in first person. 2.2s cooldown.',
      effects: [
        { tag: 'damage', label: 'The pellets', detail: '7 × 6, ±14° fan, 200px reach, 14px wide each. One body can take all seven.' },
        { tag: 'damage', label: 'The doubling', detail: 'Each pellet is multiplied by 1 + 2 × the target\'s Exposed fraction: ×1.2 at one stack, ×1.4 at four.' },
      ],
      notes: ['Four pistol stacks then a point-blank shotgun is 42 × 1.4 — the kit\'s biggest single press.'],
    },

    'myth-grenades': {
      basics:
        'Final Destiny\'s R. Three grenades lobbed 230px in a 40° cone, landing 0.7 seconds later 60ms apart. Each '
        + 'bursts for 14 in a 72px radius. A body caught by a second grenade of the same salvo takes ×1.25 from '
        + 'it, and ×1.5 from a third.',
      cast: 'R in first person. 6s cooldown.',
      effects: [
        { tag: 'damage', label: 'Each grenade', detail: '14 damage within 72px of where it lands, 230px out along ±20°.' },
        { tag: 'damage', label: 'Stacking', detail: 'Per body per salvo: 1st hit ×1, 2nd ×1.25, 3rd ×1.5 — up to 52.5 for all three.' },
        { tag: 'utility', label: 'The flight', detail: '0.7s in the air; the landing rings grow on the floor as they come down.' },
      ],
      notes: ['The landing points are clamped inside the arena, so a wall shot still lands three.'],
    },

    'myth-rifle': {
      basics:
        'Final Destiny\'s F. One round down your aim for 900px that passes through everyone within 16px of the '
        + 'line for 26 damage. Pass within 9px of a body\'s centre and it is a headshot: ×1.5, 39.',
      cast: 'F in first person. 4.5s cooldown.',
      effects: [
        { tag: 'damage', label: 'The round', detail: '26 to every body within 16px of a 900px line. Pierces.' },
        { tag: 'damage', label: 'Headshot', detail: '×1.5 (39) when the line passes within 9px of the body\'s centre.' },
      ],
      notes: ['It is hitscan: there is nothing to dodge once the crosshair is on them.'],
    },

    'myth-rocket': {
      basics:
        'Final Destiny\'s Q. A slow rocket at 190 px/s that bursts for 30 in a 150px radius when it meets a body or '
        + 'a wall, +20 to the body it struck directly, and leaves a 110px cloud for 5 seconds that does 5 a second '
        + 'to everyone standing in it.',
      cast: 'Q in first person. 12s cooldown.',
      effects: [
        { tag: 'damage', label: 'The blast', detail: '30 damage within 150px of the burst.' },
        { tag: 'damage', label: 'Direct hit', detail: '+20 to a body within 22px of the rocket itself: 50.' },
        { tag: 'dot', label: 'The cloud', detail: '110px radius, 5s, 2.5 damage every 0.5s to grounded bodies inside it.' },
        { tag: 'utility', label: 'The flight', detail: '190 px/s — slow enough to walk away from, and a registered projectile.' },
      ],
      notes: ['Fire it at a body the beast or the mace is holding; the bot does exactly that.'],
    },
  },
};

export default myth;
