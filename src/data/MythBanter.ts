/**
 * What Myth says to whoever is across the arena — and what they say back.
 *
 * Myth is a collector of legends, and every fight is a tale told to the crowd ringing the
 * arena. MythKit plays three exchanges per match as speech bubbles over the two heads: an
 * opener a few seconds in, a mid-fight exchange once first blood is well past, and a closer
 * when either side is about to fall. Each set is written for the opponent's element so the
 * player learns something true about that element from its own mouth.
 *
 * Keyed by element id (mind the traps: `sand` is Time, `dune` is Sand, `slime` is Acid,
 * `gum` is Slime, `passion` is Devotion, `fortune` is Gold, `gluttony` is Harvest). `king` is
 * the Disgraced King, `reality` the finale, `myth` a mirror. Anything unlisted — husks, odd
 * bosses — gets `default` through `banterFor`.
 */

export interface BanterLine { who: 'myth' | 'foe'; text: string }

export interface BanterSet {
  /** Spoken a few seconds into the fight. 3 or 4 lines, alternating speakers, Myth first. */
  opener: BanterLine[];
  /** Mid-fight, once first blood is well past. 2 or 3 lines. */
  mid: BanterLine[];
  /** When either side is close to falling. Exactly 2 lines. */
  closer: BanterLine[];
}

const m = (text: string): BanterLine => ({ who: 'myth', text });
const f = (text: string): BanterLine => ({ who: 'foe', text });

export const MYTH_BANTER: Record<string, BanterSet> = {
  // ── The base five ───────────────────────────────────────────────────────
  fire: {
    opener: [
      m('Fire. The first story anyone ever told was told around you.'),
      f('And the first thing anyone ever did with a story was burn it. Keep up.'),
      m('No wards, no summons. Just a caster willing to stand inside the blaze.'),
      f('Standing inside it is the only part I am good at.'),
    ],
    mid: [
      m('The crowd loves you. They always love the one who cooks himself.'),
      f('Let them. Every hit I land is bigger than every hit I take. Do the sums.'),
    ],
    closer: [
      m('Even a bonfire ends in ash, old friend.'),
      f('Ash is just fire resting. Write that down.'),
    ],
  },
  water: {
    opener: [
      m('Water. The patient element. The crowd expects me to wait you out.'),
      f('Then the crowd has read me correctly. I cover ground and I wait.'),
      m('A puddle at my feet, a slash from the length of the room. I know your rhythm.'),
      f('Knowing a tide does not stop it coming in.'),
    ],
    mid: [
      m('Nothing you do hits hard. Everything you do hits twice.'),
      f('Pressure, storyteller. Stand still and it compounds.'),
    ],
    closer: [
      m('The sea has a shore, Water. We have reached it.'),
      f('Every shore is just where the sea is still thinking.'),
    ],
  },
  life: {
    opener: [
      m('Life. Of all the legends, yours is the one that fights by proxy.'),
      f('Four of my keys never touch you. The garden does the hard part.'),
      m('Seeds that take the hits so the gardener never has to. Clever, and a little cowardly.'),
      f('A gardener who dies in the first frost grows nothing. Call it what you like.'),
    ],
    mid: [
      m('A Life player with no plants up is a Life player with no kit. I am counting.'),
      f('Count faster. I plant quicker than you cut.'),
    ],
    closer: [
      m('Every garden goes to seed. Let the stars have this one.'),
      f('Seeds are how a garden survives you, Myth.'),
    ],
  },
  air: {
    opener: [
      m('A dancer with two war fans. The air you displace is the weapon, is that the tale?'),
      f('The air is the weapon. The momentum is the armour. Try to keep up.'),
      m('You bank a dodge off every hit you land. Survival built, not spent.'),
      f('Which is why you will swing at where I was. Everyone does.'),
    ],
    mid: [
      m('The crowd cannot follow you. Neither, I confess, can Excalibur.'),
      f('Good. Grapple hook next. Mind the fans on the way in.'),
    ],
    closer: [
      m('Every dance ends with the dancer standing still.'),
      f('Standing still is the bow. I earned it.'),
    ],
  },
  earth: {
    opener: [
      m('Earth. A shield with its own health bar, and rocks orbiting it. Siege equipment, walking.'),
      f('The shield is an object, not a number. Hit it and see which one of us notices.'),
      m('And at the end you carve the arena into four climates of your choosing.'),
      f('The ground was always mine. I only remind it.'),
    ],
    mid: [
      m('I have seen mountains fall, Worldshaper. It takes a long time.'),
      f('I have seen storytellers fall. It takes about a rock.'),
    ],
    closer: [
      m('Stone remembers everything. Remember this.'),
      f('I will be the ground you are buried in. That is remembering.'),
    ],
  },

  // ── Combined ────────────────────────────────────────────────────────────
  oil: {
    opener: [
      m('A drum machinist. Thirty seconds of building before a single blow. The crowd is restless.'),
      f('Let them squirm. Quadcopters first, barrels second, then the train.'),
      m('Hardware over magic. You end the round as a locomotive, if the legend is honest.'),
      f('The legend is a schedule. Stand on the tracks and find out.'),
    ],
    mid: [
      m('All setup, then all payoff. I admire a story with structure.'),
      f('Less admiring, more moving. The drones have your range.'),
    ],
    closer: [
      m('Every machine stops when the crude runs dry.'),
      f('Mine stops when it hits something. Guess what.'),
    ],
  },
  shadow: {
    opener: [
      m('Shadow. You cast the lowest damage of your tier and the most ways to make someone stay.'),
      f('Hopelessness, storyteller. I do not need to hit hard when you hit soft.'),
      m('Pools of living dark, limbs reaching out of them. A black hole at the end.'),
      f('And a victim who stops believing the fight can be won. That is the real ability.'),
    ],
    mid: [
      m('The stars in me are old, Stalker. They have outlasted darker things than you.'),
      f('Stars go out. I am what is left after.'),
    ],
    closer: [
      m('Even a shadow needs a light to be cast by. Mine is Excalibur.'),
      f('And when the eye on your hilt closes, where does that leave you?'),
    ],
  },
  ice: {
    opener: [
      m('Ice. A spike for eight damage, and that is deliberately the point.'),
      f('The shot is not the payload. The frost is. Everything I do keeps the ledger.'),
      m('Stacks, kept alive, cashed in at once. A full freeze at the bottom of the account.'),
      f('Forty-five percent more from everything, Myth. Including you.'),
    ],
    mid: [
      m('You turtle, you skate, you lock them in place. An accountant with a blade.'),
      f('An accountant never loses. He only waits for the books to close.'),
    ],
    closer: [
      m('Every winter ends. The crowd has thawed, Controller.'),
      f('Winters end. Glaciers do not. Watch the stacks.'),
    ],
  },
  growth: {
    opener: [
      m('A single cell with an upgrade tree. You start weaker than anything you will meet.'),
      f('Twelve damage and nothing else. Give me a minute and I will be something.'),
      m('Damage into DNA, DNA into stat lines. The only build chosen inside the fight.'),
      f('Evolution does not plan. It just keeps what worked. Keep hitting me.'),
    ],
    mid: [
      m('The crowd cannot tell what you are becoming. Neither can you, I suspect.'),
      f('That is the point. Bacteria, viruses, a second body. Whichever you fear most.'),
    ],
    closer: [
      m('Everything that grows has a season. Yours is up.'),
      f('Cut one cell and the colony remembers your shape.'),
    ],
  },
  crystal: {
    opener: [
      m('Crystal. Optics as combat. A shard that leaves your hand and simply does not stop.'),
      f('Fifteen damage, and half again on every bounce. Build the room, then fire into it.'),
      m('Lances to ricochet off, gates to snap through, clones to fire the same shot back.'),
      f('No ceiling, Myth. None. Give me three bounces and we are done.'),
    ],
    mid: [
      m('You have no ability that hits hard on its own. The whole fight is geometry.'),
      f('And you are standing on the wrong side of the angle.'),
    ],
    closer: [
      m('A crystal shatters along the lines it grew. I know where they are.'),
      f('Then you know where the shards will fly. Does the crowd?'),
    ],
  },
  soul: {
    opener: [
      m('Soul. A summoner with no summon button. Headstones that spit out hunters.'),
      f('They hunt you, and my lantern burns them down. Every kill makes it hit harder.'),
      m('And the corpses rise as Amalgams at your side. The only true crew in the game.'),
      f('Three bodies that heal, hold and hit. One of you. The maths are unkind.'),
    ],
    mid: [
      m('Soul Lord. The lantern goes golden and angelic. A beautiful ending to a grim tale.'),
      f('It is not an ending, storyteller. It is an ascension. Yours is the ending.'),
    ],
    closer: [
      m('A lantern is only as bright as what it has burned.'),
      f('Then you will make it very bright indeed.'),
    ],
  },
  hunt: {
    opener: [
      m('A man with a crossbow, and the thing living inside him, taking turns.'),
      f('Human form is patient. Bolts that stay in. A shotgun. A scent trail to run on.'),
      m('And then the clock runs out and the beast comes out whether you asked or not.'),
      f('Twelve seconds of teeth and momentum. I do not ask. It does not either.'),
    ],
    mid: [
      m('Which of you is talking right now? The crowd would like to know.'),
      f('Whichever one has the controls. Ask again in ten seconds.'),
    ],
    closer: [
      m('Every hunt ends with something lying still.'),
      f('Yes. And the beast is still hungry.'),
    ],
  },
  sand: {
    opener: [
      m('Time. A revolver, a rope, and a clock only you are allowed to wind.'),
      f('Six chambers, twelve damage apiece. No burst. I win by making you pay twice.'),
      m('Once when you rewind them out of the position they earned. Once as a bounty on their cooldowns.'),
      f('Everything I do is a delay, Myth. You simply have not been hit yet.'),
    ],
    mid: [
      m('The stars in me are older than your clock, Gunslinger.'),
      f('Older, yes. And every one of them is already dead. The light is just late.'),
    ],
    closer: [
      m('Every story has a noon. Yours stops the clock dead.'),
      f('And this one stops with you in the lasso.'),
    ],
  },
  gravity: {
    opener: [
      m('Gravity. Rocks from the sky and a hand on everybody\'s position.'),
      f('Telegraphed circles on the floor. You were supposed to walk out of them.'),
      m('Teleport, slam, tether, fling. You make the circles land by moving the other fighter into them.'),
      f('Fully upgraded I leave the board entirely. A night sky and a flying moon.'),
    ],
    mid: [
      m('Everything you throw lands late. The crowd is learning to count.'),
      f('Let them count. Meteors do not care who is counting.'),
    ],
    closer: [
      m('Everything that goes up comes down. Even moons.'),
      f('Especially on storytellers.'),
    ],
  },
  creation: {
    opener: [
      m('Creation. The only element that brings its own machine to the fight.'),
      f('The Nexus brews. I fire steel into it and drink what comes out.'),
      m('Walls to decide where the fight is allowed to happen. A workshop for thirty seconds.'),
      f('Fully upgraded it folds into a mech and hands me three sliders. How dangerous do you want the room?'),
    ],
    mid: [
      m('Artisan. You build; I remember. We would have got along, in another tale.'),
      f('Another tale, another arena. In this one I need the floor space.'),
    ],
    closer: [
      m('Every workshop closes. Sweep up the daggers.'),
      f('The Nexus is still brewing. Nothing closes while it brews.'),
    ],
  },

  // ── Abstract ────────────────────────────────────────────────────────────
  electricity: {
    opener: [
      m('Electricity. The only resource bar that fills when things go badly.'),
      f('Every point of damage you land is charge going in. Hit me. Please.'),
      m('Bigger shots, a longer blink, a bomb sized by the meter, a revive worth the bar.'),
      f('Built to be losing and then suddenly not. The Abstract Realm made me honest about it.'),
    ],
    mid: [
      m('A thought that was never meant to be weather. That is what the Abstract ones are.'),
      f('Weather is thought in a hurry. Watch the bar, storyteller.'),
    ],
    closer: [
      m('Every storm discharges. Then it is just rain.'),
      f('One discharge. The whole bar. Then we talk about rain.'),
    ],
  },
  slime: {
    opener: [
      m('Acid. The only element whose real resource is square footage.'),
      f('Permanent pools. They never fade. Coverage decides how hard everything hits.'),
      m('Lashes, a snake burrow, a purge. All of it reads how much of the floor you own.'),
      f('Unremarkable damage per second, Myth. Remarkable damage per minute.'),
    ],
    mid: [
      m('You are turning the arena into a map of where I cannot stand.'),
      f('Correct. The map gets smaller. You get slower. The crowd gets quieter.'),
    ],
    closer: [
      m('Even acid eats through to something it cannot dissolve.'),
      f('Nothing yet. You are not it either.'),
    ],
  },
  fate: {
    opener: [
      m('Fate. A hand of torn cards along the bottom of the screen, and no say in what it holds.'),
      f('Eighteen cards. The click is whatever the deck says. I never choose. I manage.'),
      m('Preserve the good ones, enchant the better ones, bet fifty health on a wheel.'),
      f('You claim to decide your own fate, Myth. Pick a card. We will see.'),
    ],
    mid: [
      m('The crowd gasps at every draw. You are the only gambler they root for.'),
      f('They root for the deck. I am just the hands.'),
    ],
    closer: [
      m('The last card is always the same one. I have read this ending.'),
      f('Torn cards tear differently every time. Nobody has read this one.'),
    ],
  },
  sound: {
    opener: [
      m('A drum major in deep maroon. A metronome runs your whole match, I am told.'),
      f('Keep time and the baton spins faster. Lose it and I am just a man with a stick.'),
      m('A dance that ends in a wave, a slam that puts them out of tune, a bugle for the finale.'),
      f('Three soul songs to march to. Pick a tempo, Myth. I will make you keep it.'),
    ],
    mid: [
      m('Out of tune. A quarter of my presses misfire. That is a cruel little song.'),
      f('It is a very good song. You simply cannot hear it properly.'),
    ],
    closer: [
      m('Every march ends when the band stops.'),
      f('Bands do not stop. They go around the corner.'),
    ],
  },
  light: {
    opener: [
      m('Light. Hold the mouse and you stop being a fighter and become a car.'),
      f('Half size, always moving, steering with the cursor. The lance does the talking.'),
      m('Six damage at a crawl. A hundred and six flat out. Everything else keeps the needle up.'),
      f('Ramps, drifts, a trick. The ultimate is a hundred and twenty-five teleports. Stay on the line.'),
    ],
    mid: [
      m('The crowd is watching the corners. A racer loses it all in the corners.'),
      f('A racer loses speed in the corners. I lose nothing. Watch the straight.'),
    ],
    closer: [
      m('Every race ends at a wall, one way or another.'),
      f('Not if the lance gets there first.'),
    ],
  },
  magnet: {
    opener: [
      m('A scrap-metal magician. Coins in the air, nails in me, spikes in the floor.'),
      f('And Repulse fires whatever is in front of it. Set it all up. Let it all go.'),
      m('And the ending is a giant scrap mech. I confess I came to see that.'),
      f('Then stay standing long enough. It only fits half on the screen.'),
    ],
    mid: [
      m('You left a nail in me, Scrapper. The crowd thinks it is funny.'),
      f('It homes when I rip it out. The crowd will think that is funnier.'),
    ],
    closer: [
      m('Scrap is just a machine that stopped being wanted.'),
      f('Scrap is a machine waiting for a magnet. Here I am.'),
    ],
  },
  metal: {
    opener: [
      m('Metal. Steel that runs on other people.'),
      f('Everything I do spills blood on the floor. Every pool is mine to walk over.'),
      m('Into a bar that becomes health, or plate, or a sword out of the sky.'),
      f('I have to stand where I was already winning to keep winning. So I do.'),
    ],
    mid: [
      m('You bleed me, then you bleed yourself. The crowd finds that hard to cheer.'),
      f('Blood is ammunition and health bar at once. Cheering is optional.'),
    ],
    closer: [
      m('Steel rusts. Even yours, Bleeder.'),
      f('Not while there is blood to drink.'),
    ],
  },
  plasma: {
    opener: [
      m('Plasma. Raw current with no manners. Four of five abilities can kill the one who cast them.'),
      f('The arena explodes under whoever is standing in it. Me included. Pure chaos.'),
      m('Blades that bounce back through you, an ultimate that turns on you if there is no one else.'),
      f('What it buys is coverage, Myth. The room is dangerous to be in. All of it.'),
    ],
    mid: [
      m('The crowd ducks every time you press a key. So do you.'),
      f('Ducking is a skill. I am very good at it.'),
    ],
    closer: [
      m('Chaos does not pick sides. That was always the flaw in the tale.'),
      f('No favourites, storyteller. Not even you.'),
    ],
  },
  gunpowder: {
    opener: [
      m('A musketeer. Three shots in a genuinely heavy musket, and a reload that means walking.'),
      f('Walking back to where I dropped them, yes. Mind the arsenal in the meantime.'),
      m('Thirteen guns, assembled all match, fired all at once. Half with a drawback attached.'),
      f('Building the loadout is most of playing me. Being blown backwards is the rest.'),
    ],
    mid: [
      m('You are assembling an armoury while the crowd waits. Theatrical. I approve.'),
      f('Less approving, more dodging. The next volley is thirteen wide.'),
    ],
    closer: [
      m('Black powder only tells one story, and it is short.'),
      f('Short and loud. Cover your ears, storyteller.'),
    ],
  },
  rubber: {
    opener: [
      m('A ball of gum that worked out it can be a weapon by being pulled.'),
      f('Nothing thrown, nothing fired. Stretched and let go. Every single ability.'),
      m('Wind the punch by dragging back, sling yourself out of a V between two walls.'),
      f('And the ultimate fills the room with balls that get faster the longer they are left. Boing.'),
    ],
    mid: [
      m('You reflect my shots home. The crowd enjoys it more than I do.'),
      f('Snap back on the band, Myth. Everything comes home eventually.'),
    ],
    closer: [
      m('Everything that stretches eventually snaps.'),
      f('Snapping is the attack. You keep describing my kit as if it were a weakness.'),
    ],
  },
  magic: {
    opener: [
      m('Magic. A caster with no medium of its own. Borrowed fire, water, thorns, wind and stone.'),
      f('Five spells on one wheel, five familiars on the other. More options than keys.'),
      m('Nothing you conjure is meant to be used once. Dupe copies, the Crosshair keeps paying.'),
      f('And a corrupted button at the hub of each wheel, if you have read that far.'),
    ],
    mid: [
      m('You throw scrolls. I carry a sword that has read every one of them.'),
      f('Then it knows the next one is Anchor. Watch me teleport back to it anyway.'),
    ],
    closer: [
      m('Every spellbook has a last page, Spellbook.'),
      f('Mine has two wheels and no last page. Keep reading.'),
    ],
  },
  technology: {
    opener: [
      m('Somebody has plugged the arena into a machine. The machine is not on my side.'),
      f('Popups solid for you, transparent for me. A cord that turns you into a box on a grid.'),
      m('Interface turned into a weapon. The ultimate is a typing test, if the legend is true.'),
      f('It is. Hope you can spell. The crowd will watch you fumble it.'),
    ],
    mid: [
      m('A drag cursor that picks people up. I am a storyteller, not a file.'),
      f('Everything is a file to the right cursor. Uploading.'),
    ],
    closer: [
      m('Every machine has an off switch.'),
      f('Not this one. It has a restart.'),
    ],
  },
  silence: {
    opener: [
      m('Silence. A thin dark thing that lives in the fog at the edge, and hates being seen.'),
      f('...'),
      m('Bank stealth in the fog and you vanish. Health bar and all. The next knife worth double.'),
      f('Stop describing me. It is the opposite of what I am for.'),
    ],
    mid: [
      m('Watchers standing around, staring. A beam that steals abilities for twenty seconds.'),
      f('You talk too much to be stalked properly. Turn around.'),
    ],
    closer: [
      m('Every silence is broken eventually. Usually by a crowd.'),
      f('Usually by a knife.'),
    ],
  },
  echo: {
    opener: [
      m('Echo. The arena has gone black but for a circle around each of us.'),
      f('Who knows where the other one is. That is the whole match. Every key is a guess.'),
      m('A bouncing shout fired into the dark. A literal bet on a patch of floor.'),
      f('Sonar, storyteller. Say something again. I am listening.'),
    ],
    mid: [
      m('The crowd cannot see either of us. They cheer at the sounds.'),
      f('So do I. Keep talking. It is how I aim.'),
    ],
    closer: [
      m('An echo only lives as long as the voice that made it.'),
      f('And yours is loud enough to live on for a while.'),
    ],
  },
  subterfuge: {
    opener: [
      m('A man in a good coat with three red banknotes over his head. No intention of fighting me himself.'),
      f('Correct. Bullets are bought. People are bought. Your ultimate, shortly, is bought.'),
      m('The daggers are the one thing you do with your own hands.'),
      f('And every point they deal pays me back. Even my hands are an investment.'),
    ],
    mid: [
      m('A thief who fights with my kit rather than his own. The crowd is unsure who to cheer.'),
      f('They will cheer whoever I paid. Which is everyone.'),
    ],
    closer: [
      m('Every spy is found out at the end of the story.'),
      f('Only the ones in stories. Goodbye, Myth.'),
    ],
  },

  quantum: {
    opener: [
      m('Quantum. The sealed element behind the Amalgam. The only one with no subject of its own.'),
      f('Two elements bonded. My dodge collapses me onto the other half. Same body, different keys.'),
      m('Everything the half you left behind put in the world keeps running. That is the trick.'),
      f('The price is Instability. Every hit makes me more uncertain. Hit carefully.'),
    ],
    mid: [
      m('You were sealed away for a reason. The crowd remembers the door.'),
      f('The door opened. That is the only part of the tale that matters now.'),
    ],
    closer: [
      m('Every superposition collapses to one answer.'),
      f('And you do not get to pick which.'),
    ],
  },

  // ── Divine and finale ───────────────────────────────────────────────────
  justice: {
    opener: [
      m('Justice. Two characters sharing one bar of Willpower.'),
      f('A magistrate with a spear on the ground. A valkyrie over her own walls in the air.'),
      m('And the ending puts me on a set of scales and reads out what I took off you.'),
      f('A hundred eyes open at the finish. The style meter decides how many.'),
    ],
    mid: [
      m('You fence the arena off in marble. Law as architecture.'),
      f('Law is architecture. You are standing in the dock.'),
    ],
    closer: [
      m('Every verdict is read aloud. The crowd leans in.'),
      f('Guilty. Of being in my arena.'),
    ],
  },
  dream: {
    opener: [
      m('Dream. The element earned by sparing the Devourer of Kings. I know that mercy well.'),
      f('Two little guns and a pillow. You get sleepy, and then I come and visit.'),
      m('You will not hurt me while I sleep. The crowd has worked out what you do instead.'),
      f('I step inside. In there you are awake, and nothing I do will wake you up.'),
    ],
    mid: [
      m('I will not sleep, Sandman. The stars never do.'),
      f('Everyone says that. Your meter says otherwise.'),
    ],
    closer: [
      m('Every dream ends in waking. This is the waking.'),
      f('Then I will see you in the next one. Sleep tight.'),
    ],
  },

  // ── Corrupt ─────────────────────────────────────────────────────────────
  chalk: {
    opener: [
      m('Chalk. Every other element aims something. You draw.'),
      f('Four of my keys do nothing when pressed. The cursor lays the line. The line is the ability.'),
      m('White goes up at once. Red runs like a fuse. Blue waits. The shape is the spell.'),
      f('Hold still a moment. I want to scribble over you properly.'),
    ],
    mid: [
      m('The natural order cast you out, Artist. Seventeen of you. The Corrupt Realm.'),
      f('Cast out for colouring outside the lines. I would do it again.'),
    ],
    closer: [
      m('Chalk smudges. Every drawing does.'),
      f('Smudges are still mine. Even the one you are standing in.'),
    ],
  },
  magma: {
    opener: [
      m('A buccaneer cooled out of the crust. Tricorn, eye patch, a hook and an obsidian cutlass.'),
      f('Aye. And a volcano I feed with my own shots. Ask where my summon is, not where you are.'),
      m('A blunderbuss you ride the recoil of. A cursed pendant that raises a ship. Grand stuff.'),
      f('The pendant costs plenty, storyteller. The ship is worth every coin.'),
    ],
    mid: [
      m('The crowd wants the ship. They are chanting for it.'),
      f('Then they will have it, and you will be under the keel.'),
    ],
    closer: [
      m('Every volcano sleeps. Every pirate hangs.'),
      f('Not this one. Not while the pressure gauge reads red.'),
    ],
  },
  wax: {
    opener: [
      m('Wax. Apiary magic with a fencer\'s discipline. A foil and a hive.'),
      f('Candles whose light is armour. Hives that pay bees back five to one. Sticky bombs for either.'),
      m('Every bee on me is another percent I take. I can feel them.'),
      f('Then stop moving and feel more of them.'),
    ],
    mid: [
      m('A swarm, loosed. The crowd is scattering, Apiarist.'),
      f('The hive remembers who it was fired at. That is you.'),
    ],
    closer: [
      m('Every candle burns down to the plate.'),
      f('And the wax is still there in the morning.'),
    ],
  },
  clay: {
    opener: [
      m('Pottery as a martial art. You fight through a golem the size of two of us, living on your cursor.'),
      f('It swallows whatever you shoot at it and does the hitting. I shape the rest by hand.'),
      m('A shield dragged out of a drawing, a wall-running smear, eight layers of fused clay.'),
      f('The fused form counts hits instead of health. Bring a lot of them.'),
    ],
    mid: [
      m('The potter hides behind the pot. The crowd would like to see the potter.'),
      f('The crowd can wait. The pot is immortal; the potter is busy.'),
    ],
    closer: [
      m('Clay cracks in the kiln. Every shaper learns it.'),
      f('Cracks are the glaze, Myth. Look closer.'),
    ],
  },
  illusion: {
    opener: [
      m('A stage magician who worked out the trick is worth more than the knife.'),
      f('Nothing I do burns or bleeds. I just make your answer wrong.'),
      m('A bullet that pays out on the wall it missed. A pane that bends what crosses it.'),
      f('And a clone. Which of us is talking? The crowd cannot tell. Can you?'),
    ],
    mid: [
      m('Veils bend every shot. Excalibur has no veil, Phantom. It is a sword.'),
      f('It is a sword aimed at the wrong one of me.'),
    ],
    closer: [
      m('Every trick is explained at the end of the act.'),
      f('Not by the magician. Never by the magician.'),
    ],
  },
  depths: {
    opener: [
      m('Depths. Every other element pushes damage at me. You bait.'),
      f('Stand still and the water takes me. Body gone, bar gone. A green orb left behind.'),
      m('Drawn with the same brush as a real healing orb. Whatever eats it walks into your burst.'),
      f('Piranhas, algae, a shark. Stand still long enough and the sea hands me a weapon.'),
    ],
    mid: [
      m('The crowd cannot see you. An angler who became the lure. Very good.'),
      f('The pocket of air is over there. You will want it shortly.'),
    ],
    closer: [
      m('Every tide goes out and leaves what it drowned on the sand.'),
      f('And every tide comes back for it.'),
    ],
  },
  ruin: {
    opener: [
      m('Ruin. Every other element builds. You only take away.'),
      f('The click deletes shots. The E deletes what you just pressed. The F deletes everything you built.'),
      m('And a rot on the whole arena that is never checked against a clock.'),
      f('Because it never wears off. Nothing of mine does. Nothing of yours lasts.'),
    ],
    mid: [
      m('You turned my armour inside out. The crowd winced.'),
      f('The crowd should. Twenty-five percent less became twenty-five more.'),
    ],
    closer: [
      m('Ruins are where legends are told from, Disabler. I will be fine.'),
      f('Legends rot too. Slower. But they rot.'),
    ],
  },
  dune: {
    opener: [
      m('Sand. The only kit whose damage lives in its feet.'),
      f('No dodge. A real jump. Every button after that buys height.'),
      m('An obstacle course for a buff, a cruel one for a turret, a pyramid with lava rising.'),
      f('And a flintlock whose bonuses add up. Fired mid-jump, off my own course, it hurts.'),
    ],
    mid: [
      m('The floor is a live simulation. You bury me, then walk beneath it. The crowd cannot see.'),
      f('They will see when I glass the whole arena. Everyone sees that.'),
    ],
    closer: [
      m('Every dune moves. None of them arrive.'),
      f('This one arrived. You are standing in it.'),
    ],
  },
  conquest: {
    opener: [
      m('Conquest. A real-time strategy board bolted to a duel. You own things; I do things.'),
      f('Nine squares and a town centre paying two Authority a second whether I fight or not.'),
      m('Three buildings with tower-defence upgrade trees, soldiers, a market if the legend is current.'),
      f('It is. Propaganda is health here. Hold a square or leave the board.'),
    ],
    mid: [
      m('A warlord with an economy. The crowd is counting your income.'),
      f('Then they know I can afford to lose this exchange. Can you?'),
    ],
    closer: [
      m('Every empire ends on a map that forgot its name.'),
      f('This map has my name on every square.'),
    ],
  },
  passion: {
    opener: [
      m('Devotion. A priest in a tall white mitre, who never deals a single point of damage.'),
      f('Not one. Every sermon and every drop of holy water fills a bar over your head. Faith.'),
      m('At two hundred I am converted on the spot, whatever my health. A gentle ending.'),
      f('Nothing lowers it, Myth. The bar works against you all the way up. Kneel early.'),
    ],
    mid: [
      m('The crowd cannot decide whether to cheer or pray.'),
      f('They are the same thing, done properly.'),
    ],
    closer: [
      m('Every faith has a last believer.'),
      f('And you are about to be mine.'),
    ],
  },
  paper: {
    opener: [
      m('Paper. Your passive is written between matches, not during them. A journal.'),
      f('Every fight is filed away. A win teaches me how to press you. A loss, how to survive you.'),
      m('Three storybooks on a shelf, cycled with the right hand. The click is whichever is open.'),
      f('I have notes on you already, storyteller. Chapter one was short.'),
    ],
    mid: [
      m('Two storytellers in one arena. The crowd is spoiled.'),
      f('One storyteller. One subject. Hold still for the illustration.'),
    ],
    closer: [
      m('Paper burns, Storyteller. The stars have watched a lot of libraries go.'),
      f('The journal is in the save. Burn what you like.'),
    ],
  },
  death: {
    opener: [
      m('Death. A sentinel in a shroud, katana overhead, and a clock running since the first frame.'),
      f('At midnight the person in front of me simply dies. Through everything. Even you.'),
      m('Shurikens for their legs, Disarm to cash the brands in, Riposte for a window.'),
      f('Every ability is arithmetic on one minute. Your minute. Check the corner of the screen.'),
    ],
    mid: [
      m('The crowd is watching the clock more than the fight.'),
      f('Wise crowd. The sheath is drawn at midnight.'),
    ],
    closer: [
      m('Even Death is a character in somebody\'s story, Duellist.'),
      f('Yes. The last one.'),
    ],
  },
  fortune: {
    opener: [
      m('Gold. An alchemist in brass goggles. One hand throws, the other gilds it on the way.'),
      f('Grass, blood, floor. All of it gold. The purse fills and I spend it ten at a time.'),
      m('Three stat cards over your head. The only thing in the kit that makes you better forever.'),
      f('Forever is the right price. Your heart gilds nicely, by the way.'),
    ],
    mid: [
      m('A Midas curse. Everything I touch is a coin for your purse.'),
      f('And every coin is another Advance. The crowd loves a self-made man.'),
    ],
    closer: [
      m('All that glitters, Alchemist. You know the rest.'),
      f('Is mine. That is the rest.'),
    ],
  },
  cloth: {
    opener: [
      m('Cloth. You have no health bar. You have a scarf, trailing wherever you just walked.'),
      f('The scarf is the hitbox. Miss me by a foot and you still catch the tail.'),
      m('And it shrinks as it is cut. A dying tailor is harder to hit than a healthy one.'),
      f('A pin seven times a second, a long pin that reels you in. Hold still for a fitting.'),
    ],
    mid: [
      m('You build the rest of your kit out of tetrominoes. The crowd is leaning in.'),
      f('A five-by-five loom. The tapestry sews itself over the floor. Mind the stitches.'),
    ],
    closer: [
      m('Every thread has an end, Tailor.'),
      f('Mine is three inches long now and nobody can hit it.'),
    ],
  },
  marrow: {
    opener: [
      m('Marrow. You do not aim. You deploy.'),
      f('Four keys put a cell on the field. The cell walks itself at whatever is nearest. You.'),
      m('A length of bone with five sockets. A sixth cell refused. Every cast a decision.'),
      f('Antibodies, white cells, a fever. An immune response, Myth. You are the infection.'),
    ],
    mid: [
      m('The crowd is unsure whether to cheer a bloodstream.'),
      f('The bloodstream does not need a crowd. It needs the bone bar to hold.'),
    ],
    closer: [
      m('Every fever breaks.'),
      f('After the infection is dead. Which is you.'),
    ],
  },
  tempest: {
    opener: [
      m('Tempest. A knockback brawler who can leave the floor.'),
      f('Two charges of wind, refilled by moving. A roll that kicks. Fronts to slam my own self onto.'),
      m('Three currents drift across the arena. Ride one and the same keys become flight.'),
      f('Height is the resource. Every landing pays out by how far it came down. Look up.'),
    ],
    mid: [
      m('Every wall in the arena is a weapon to you. The crowd is standing well back.'),
      f('Twelve damage per wall, storyteller. There are four of them.'),
    ],
    closer: [
      m('Every storm has an eye, and the eye is where it ends.'),
      f('The eye is where you end. I just dive.'),
    ],
  },
  psychic: {
    opener: [
      m('A monk who stared at a chessboard until the third eye opened.'),
      f('Every ability you press is held two seconds. Your shadow shows where you will stand.'),
      m('Pawns from the hand. A bishop, a knight, a rook on the board, each with an aura.'),
      f('And a queen, if you let me. Check, storyteller. You simply have not noticed yet.'),
    ],
    mid: [
      m('The crowd is two seconds behind you. So, apparently, am I.'),
      f('Everyone is. That is what it means to open the eye.'),
    ],
    closer: [
      m('Every game ends in mate or in a drawn board.'),
      f('There are no draws against me. Resign.'),
    ],
  },
  radiation: {
    opener: [
      m('A sniper in lead plate. Your click is a procedure, not a shot.'),
      f('Tag a body three times and the railgun fires itself. One miss scrubs the board. Hold still.'),
      m('A sighting cone held closed, a lead bunker to hide in, a uranium rod for the brave.'),
      f('Irradiated turns every heal into a hit. Do not get better on my watch.'),
    ],
    mid: [
      m('A bunker in the middle of a duel. The crowd thinks it is cheating.'),
      f('The crowd is not being sighted. Two tags. One more.'),
    ],
    closer: [
      m('Everything radioactive decays, Sniper. It is the whole point of you.'),
      f('Slowly. Very slowly. Long after you.'),
    ],
  },
  bind: {
    opener: [
      m('Bind. Something in chains that asked for help, and got an answer.'),
      f('The eye in the hole in the sky does the fighting. It burns, it shatters, it keeps an account.'),
      m('Overheat its beam, starve the idol, hide behind its hexes, and its anger climbs.'),
      f('Fill it and it turns around and uses this kit on me. Nothing else asks you to manage a god.'),
    ],
    mid: [
      m('A supplicant. You sacrifice and pray, and the idols hand back somebody else\'s power.'),
      f('Tonight it may hand back yours. Pray the eye stays patient.'),
    ],
    closer: [
      m('Every chain has a weakest link. I am looking at it.'),
      f('The eye is looking at you. Which of us is chained?'),
    ],
  },
  gum: {
    opener: [
      m('Slime. The only character in the game that cannot walk.'),
      f('Nothing under me but more me. One enormous gummy arm. Throw it, grip, haul the rest in.'),
      m('The hand is the legs, the weapon and the inventory. A whole element in one decision.'),
      f('Picking anything up is the same move as moving. Including you.'),
    ],
    mid: [
      m('You zip along your own trails. The crowd has never seen locomotion like it.'),
      f('Ooze across the floor, grab, repeat. It is not elegant. It is sticky.'),
    ],
    closer: [
      m('Everything sticky dries out eventually, Grabber.'),
      f('Not in a puddle this size.'),
    ],
  },
  gluttony: {
    opener: [
      m('A scarecrow with a burlap sack for a head, and a scythe taller than it is.'),
      f('I plant rot. Purple mold with eyes and mouths. It spreads. It does not stop.'),
      m('The sickle heals more off a rotten body. The crows bite harder. The scythe reaps sooner.'),
      f('The mold grows hearts, storyteller. Cut one and see what the field does.'),
    ],
    mid: [
      m('Harvest. The crowd came for a hero and found a field of eyes.'),
      f('The field was always watching. The crowd only noticed today.'),
    ],
    closer: [
      m('Every harvest ends with the field cut back to stubble.'),
      f('And the scarecrow still standing in it. Always.'),
    ],
  },

  // ── Bosses ──────────────────────────────────────────────────────────────
  king: {
    opener: [
      m('The Disgraced King. The first Sovereign to fall. The Devourer is what got into you.'),
      f('It did not get in. It was invited. The throne was cold, storyteller. It was warm.'),
      m('Every crown in the Hollow Court was lost after yours. The crowd remembers.'),
      f('The crowd remembers a king. Let them see what one does without a kingdom.'),
    ],
    mid: [
      m('I have the Devourer\'s ending written. Spare it or kill it; the tale forks there.'),
      f('Then you know more than I did. Nobody told me there was a fork.'),
    ],
    closer: [
      m('Every king is a story the next one tells badly.'),
      f('Tell it well, Myth. Tell them I fought.'),
    ],
  },
  reality: {
    opener: [
      m('Reality. The crack in the title screen. The thing the whole roster pledged against.'),
      f('I am what the stars are painted on, Myth. You are a very confident brushstroke.'),
      m('I decide my own fate. The eye on my hilt has never once blinked at that.'),
      f('Deciding is permitted. It changes nothing. Trials first, then the chapel.'),
    ],
    mid: [
      m('A fake death, a defeated boss that fires forever. You cheat, Reality.'),
      f('I am the rules. Cheating is what you call the ones you did not read.'),
    ],
    closer: [
      m('Every reality is somebody\'s myth, in the end.'),
      f('And every myth is a reality that lost. Choose which you are.'),
    ],
  },
  myth: {
    opener: [
      m('Another Myth. The crowd has two legends tonight and only one ending.'),
      f('There is no ending, brother. Fate is decided. You are just late to the decision.'),
      m('I decide my own. That is the whole of me. The stars, the blade, the eye on the hilt.'),
      f('Then decide to lose. It would be the first choice you have ever made.'),
    ],
    mid: [
      m('Our Excaliburs cut true. Nothing blocks either of us. Only one of us flinches.'),
      f('The crowd pays shards to whichever of us is the better story. Count yours.'),
    ],
    closer: [
      m('Every legend is told twice. The second telling is the one that lasts.'),
      f('Then this is the second telling. Goodnight, brother.'),
    ],
  },
  default: {
    opener: [
      m('I do not know your legend. That is rare. The crowd is as curious as I am.'),
      f('...'),
      m('No answer. Then I will write one, and the stars will keep it.'),
    ],
    mid: [
      m('Husks are elements the Voice Beneath has already eaten. Were you somebody once?'),
      f('...'),
      m('Then let the ending be kind, at least. Excalibur can be kind.'),
    ],
    closer: [
      m('Every tale ends. Even the ones nobody remembers the start of.'),
      f('...'),
    ],
  },
};

/** The set for an opponent element id, falling back to `default`. */
export function banterFor(elementId: string): BanterSet {
  return MYTH_BANTER[elementId] ?? MYTH_BANTER.default;
}
