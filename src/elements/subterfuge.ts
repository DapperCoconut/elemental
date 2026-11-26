import { Element } from './Element';

// Subterfuge — the red/black money element. Once shipped under the name Quantum and the
// id 'quantum'; both were handed over when the real Quantum element arrived, so this is
// now 'subterfuge' end to end (old saves are migrated in PlayerData/CampaignProgress).
export const subterfugeElement: Element = {
  id: 'subterfuge',
  name: 'Subterfuge',
  color: 0xcc2233,
  emoji: '🕴️',
  abilities: [
    {
      id: 'sub-cutter',
      name: 'Molecular Cutter',
      description: 'Click: hurl a fast dagger that plants where you aim (8 dmg). Up to 3 can be out; the next click recalls them all — a dagger that hits on the way back deals 18. There is a beat between throws, and a longer one after a recall.',
      displayKey: 'Click',
      cooldown: 0,
      cast(ctx) { ctx.subterfugeCutter(ctx.targetX, ctx.targetY); },
    },
    {
      id: 'sub-spray',
      name: 'Spray',
      description: 'Hold to rapidly fire hitscan bullets in a 15° cone (2 dmg each). Holds up to 50 bullets; every 10 damage you deal earns 3 more. Press with 0 bullets to buy a 25-round reload for 1 money.',
      displayKey: 'E',
      cooldown: 1000,
      cast(ctx) { ctx.subterfugeSpray(ctx.targetX, ctx.targetY); },
    },
    {
      id: 'sub-recruit',
      name: 'Recruit',
      description: 'Spend 1 money to hire a Thug who stands where you hired him and sprays the enemy with a Tommy gun (1 dmg rounds, 25-round drum, 5s reload). His loyalty bar drains over 40s — projectile hits cost it 2s each. Up to 3 recruits at a time.',
      displayKey: 'R',
      cooldown: 1000,
      cast(ctx) { ctx.subterfugeRecruit(ctx.targetX, ctx.targetY); },
    },
    {
      id: 'sub-bribe',
      name: 'Bribe',
      description: 'Spend 1 money to bribe whatever your cursor is over. Enemy: deals 25% less damage for 8s (censored for the duration). Recruit: loyalty refilled to 120%. No target: bribes whoever is closest.',
      displayKey: 'F',
      cooldown: 1000,
      cast(ctx) { ctx.subterfugeBribe(ctx.targetX, ctx.targetY); },
    },
    {
      id: 'sub-treachery',
      name: 'Dark Treachery',
      description: "Black fog gathers for 2s, then you steal and cast the enemy's ultimate — every element reinterpreted through Subterfuge's crooked lens.",
      displayKey: 'Q',
      isUltimate: true,
      cooldown: 40000,
      cast(ctx) { ctx.subterfugeTreachery(ctx.targetX, ctx.targetY); },
    },
  ],
};
