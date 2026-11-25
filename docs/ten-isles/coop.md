# Ten Isles co-op — duo, trio (and a fourth)

Play the campaign with friends over the game's existing PeerJS rooms. Code: `src/isles/net/` (`IslesCoop.ts` the
party and the wire, `IslesMsg.ts` the protocol), `src/isles/world/CoopWorld.ts` (the party in the open world),
`src/isles/fight/CoopFight.ts` (a shared fight), `src/isles/scenes/IslesJoinScene.ts` (joining by code),
`IslesSave.setVisiting` (a guest's view of the host's world). Net protocol 66 — one envelope, `{ t: 'isles', m }`.

## How it plays

- **Host:** in the world, ESC → *Play with friends — open this world*. A room code appears at the top left.
- **Join:** on the voyage screen, highlight one of your own voyages and press **J**, then type the code. You go
  as that voyage — its element, genes, charms, artifact, meal, boat and pockets — into the host's world.
- **The host's save is the world.** What is freed, every quest, every chest and lever, the unrest, the Fall: a guest
  sees all of it exactly as the host has it and changes none of it. Guests cannot take or hand in quests, open
  chests, pull levers, speak to the meteor or chart a course; they *can* talk, shop, bake, fish, change element and
  spend orbs on their own genes. Nothing a guest does while visiting is written to their own world, and their own
  saved position is untouched.
- **Walking.** Everyone sees everyone (a name plate, a blue dot on the minimap). The party moves together: when
  anyone walks through a gate or uses a waystone, the host's game makes the journey and everyone follows. (A
  guest's step through a gate is a request; if the host is mid-conversation they get a note instead.)
- **Fights.** Anyone can challenge a champion, a prince, a monarch, a councilor or a rebel; everyone out walking
  goes in. See below. Guests take home coins and orbs (60% of a champion's purse; 120 🪙 + 2 🔮 for a prince;
  400 + 6 for a monarch); the host is paid, and the world changes, exactly as in a solo game.
- **Sailing.** The host sails alone; guests wait on the quay and are brought to the new isle when the host lands.
- **Leaving.** ESC → *Leave the party* / *Close the room*. If the host goes, guests wake in their own world.

## A shared fight (`CoopFight`)

Every player's game runs the whole fight against its own player — the same bot, court rule, boss and signatures —
so none of the 600 rules or 71 bosses needed to learn about a second target. What is shared is the foe:

- **One health pool.** The host's foe is the truth. A guest's blows are counted on their own screen and sent to
  the host (`f-dmg`); the host's foe takes them and its health comes back at 12 Hz (`f-all`). A guest's foe cannot
  fall by itself (`minHpFloor`): it falls — or, a boss, turns over a phase — when the host's does (`n`, the count
  of times the pool has run out).
- **More of it.** The foe takes 1 / (1 + 0.7 × extra players) of every blow, on every screen.
- **One body** in a duel: a guest's bot is drawn where the host's stands. A boss holds its own ground per screen.
- **The others** are shown as you fight: a translucent figure of their element, name and health bar.
- **Nobody dies alone.** A killing blow while a friend is still up puts you *down* for 8 s (untouchable, helpless),
  then back up at 40%. When the last one standing falls, the fight is lost for everyone.
- Every rule rolls from one seed the host sends with the fight.

## Known limits (this is a first version, not runtime-tested)

- The foe's *attacks* are per screen: its bot (or boss) picks its casts against whoever's screen it is on, and a
  rule's hazards are each player's own. You see where your friends are and how they are doing, not their shots.
- A guest's bot follows the host's position but decides its own casts, so it can look as if it changes its mind.
- Rules that hurt or heal the foe themselves do it per screen; the health sync irons the difference out.
- Voyages and the Far Wastes are not shared. Cutscenes play per player.
- A guest who is in a menu on another isle when a fight is called sits it out.
- Two players with the same voyage name ("Wanderer 1") show the same name plate.
