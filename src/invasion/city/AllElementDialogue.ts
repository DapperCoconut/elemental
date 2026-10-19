/**
 * The All-Element's dream lines for the City invasion. The All-Element sleeps on its plinth at the top of
 * Main Street and talks to the player's element half-asleep, as a piece of itself it dreamed awake. One set
 * of lines per element id (intro, wave milestones, hurt, saved, fallen, downed), plus a default set for any
 * id without its own entry.
 */
export interface DreamLines {
  /** Spoken as the run opens, one line per click. Exactly 3 lines. */
  intro: [string, string, string];
  /** One line each, after waves 5, 10 and 15 are held. */
  milestones: [string, string, string];
  /** The All-Element has dropped below half health. */
  hurt: string;
  /** Wave 20 held: the city is saved, and the endless night begins. */
  saved: string;
  /** The All-Element has fallen; the run is lost. */
  fallen: string;
  /** The player's element was knocked down (they will get back up). */
  downed: string;
}

export const DEFAULT_DREAM: DreamLines = {
  intro: [
    'Mm. Someone is awake. I am not. I am dreaming this whole city, and you have wandered into it.',
    'I do not quite know you yet. You feel new, like a colour I forgot I owned.',
    'The husks climb out of my dream through three gates. Keep them off my plinth while I sleep. Please.',
  ],
  milestones: [
    'Five waves. The red gate has gone quiet. I dreamed you standing in front of it.',
    'Ten. Half the night is behind us and you are still here. Stay that way.',
    'Fifteen. The rifts are getting tired. So am I. So, I suspect, are you.',
  ],
  hurt: 'Ow. Something is chewing on the dream. They are on the plinth. Get them off.',
  saved: 'Twenty. The city is safe. The night is not over, though. In my dreams it never is. Keep going.',
  fallen: 'I am waking up wrong. Everything is coming apart at the colours.',
  downed: 'Up. I dreamed you once; I can dream you standing again.',
};

export const DREAM_LINES: Record<string, DreamLines> = {
  fire: {
    intro: [
      'Mm. Warm. I always know when it is you. The dream gets a little singed at the edges.',
      'You hit faster than anything else I am made of. You also set yourself on fire doing it. I worry.',
      'The husks are coming up through the gates. Burn them for me, and try not to burn you.',
    ],
    milestones: [
      'Five waves. The red gate smells like toast. I am choosing to find that comforting.',
      'Ten. You are still burning and still standing. Both at once. Show-off.',
      'Fifteen. The night is cold everywhere except where you are. I can feel it from here.',
    ],
    hurt: 'I am cracking. Fire, please, get between me and them. You are the fastest thing I have.',
    saved: 'Twenty. You held my city with your bare, burning hands. The dark keeps coming. Stay lit.',
    fallen: 'Cold. It went so cold. Was that you going out, or me?',
    downed: 'Embers still count. Breathe on them. Get up.',
  },
  water: {
    intro: [
      'Shh. I am asleep. I can hear you rippling, though. You always sound like rain on a roof.',
      'Of everything I am, you are the part that explains itself plainly. I like that. It is restful.',
      'Long slashes, slow puddles, a pad to run on. Use all of it. Keep the husks off me till morning.',
    ],
    milestones: [
      'Five waves. Your puddles are full of husk footprints. They did not get far.',
      'Ten. The green gate is soaked. You are very thorough. I dreamed of tides.',
      'Fifteen. Steady as a river. I do not know how you do it, and I am you.',
    ],
    hurt: 'They are breaking through. Flood the plinth if you have to. I will dry.',
    saved: 'Twenty. The city is safe, washed clean. The night keeps raining husks. Keep flowing.',
    fallen: 'The current stopped. I did not know currents could stop.',
    downed: 'Water does not stay knocked over. It just finds the low ground and gets back up.',
  },
  life: {
    intro: [
      'Mmm. Something is growing near my plinth. Oh, it is you. Hello, little gardener.',
      'You plant seeds and hide behind them while they take the punches. Very sensible. Very you.',
      'Plant all of Main Street if you like. Just keep the husks from reaching me while I dream.',
    ],
    milestones: [
      'Five waves. There are flowers coming up through the cobbles. The husks hate it. I love it.',
      'Ten. Your garden has eaten half the yellow lane. I hope you water it.',
      'Fifteen. Every seed you lost bought you a second. You spent them well.',
    ],
    hurt: 'They are trampling me like a lawn. Grow something between us. Anything. Quickly.',
    saved: 'Twenty. The city is saved and it is mostly hedge now. The night goes on. Keep planting.',
    fallen: 'Winter came all at once. Nothing is coming back up.',
    downed: 'Seeds go into the ground before they come out of it. Up you come.',
  },
  air: {
    intro: [
      'Hm? Something keeps rushing past me. Ah. Air. Of course you could not hold still to say hello.',
      'Fans, spins, a grapple hook. Every hit you take, you bank a dodge. I find you exhausting. Lovingly.',
      'I am trying to sleep. Spin around the gates and keep the husks off me. You were going to anyway.',
    ],
    milestones: [
      'Five waves. You have crossed all three lanes about forty times. I lost count. I was dreaming.',
      'Ten. The husks keep swinging at where you were. It is very funny from here.',
      'Fifteen. Still moving. I do not think you know how to stop. Do not learn tonight.',
    ],
    hurt: 'Air, they are on top of me. Hook in, blow them off, then go back to being a breeze.',
    saved: 'Twenty. The city breathes again. The night keeps blowing in. Ride it.',
    fallen: 'The wind dropped. Everything is so still. I hate still.',
    downed: 'A gust can be knocked flat. It cannot be kept there. Up.',
  },
  earth: {
    intro: [
      'Mm. The ground under my plinth just settled. That is you, isn\'t it? I always sleep better on you.',
      'You charge a shield, throw boulders, then carve the world into four weathers. You build, you.',
      'Make this city whatever climate you like. Just do not let the husks climb the hill to me.',
    ],
    milestones: [
      'Five waves. There is a rock where the red gate used to have a road. I approve.',
      'Ten. The green lane is three climates now. The husks look very confused about their coats.',
      'Fifteen. You have not moved an inch. The husks have moved a great many inches. Backwards.',
    ],
    hurt: 'They are chipping at me. Wall me in, Earth. I will not mind the dark.',
    saved: 'Twenty. You held. Of course you held; you are the floor. The night is long. Stay put.',
    fallen: 'The ground gave way. I did not think you could.',
    downed: 'Mountains fall over all the time. They just take an age about it. Do not take an age.',
  },
  oil: {
    intro: [
      'Mm, diesel. Oil is on the field, and already planning something. I can hear the cogs.',
      'A drone, shield generators, and at the very end, a train. You do all the setup and none of the waiting.',
      'Set your pieces at the gates and keep the husks off my plinth. I would like to see the train later.',
    ],
    milestones: [
      'Five waves. Your drone has a favourite lane. It is the red one. It will not tell me why.',
      'Ten. The generators are humming. The husks keep bouncing off. You planned this, didn\'t you?',
      'Fifteen. All that setup is paying out. I can smell the payoff. It smells like smoke.',
    ],
    hurt: 'They are on the plinth. Drop a generator on me. I promise to sit still.',
    saved: 'Twenty. The city is saved, Commander. The night is not. Stoke the engine.',
    fallen: 'The engine seized. Everything you built is just metal now.',
    downed: 'Restart. Prime the pump. You are not done laying track.',
  },
  shadow: {
    intro: [
      'Ah. The dark under my plinth moved. It is only you, Shadow. You always arrive like a draught.',
      'Tentacles, traps, a black hole. You pick one poor victim and pile Hopelessness on until it breaks.',
      'There are a great many victims coming up the lanes. Pick them all. Keep them away from me.',
    ],
    milestones: [
      'Five waves. The husks at the red gate have stopped trying. You did that. It was rude. Well done.',
      'Ten. Your black hole ate a whole wave and burped. I heard it in my sleep.',
      'Fifteen. The night is your colour. You look comfortable in it. Unsettlingly so.',
    ],
    hurt: 'Something has its teeth in me. Grab it with whatever you grab with. Pull.',
    saved: 'Twenty. Saved. And now the night begins in earnest, which I think you were looking forward to.',
    fallen: 'The dark took me too. I always thought it was on my side.',
    downed: 'Shadows cannot be knocked down. They are already on the floor. Stand up out of it.',
  },
  ice: {
    intro: [
      'Brr. Hm. The air went crisp. Hello, Ice. You always tuck the dream in a little too tight.',
      'Stack the frost and freeze them solid, then skate off while they think about it. Patient, you.',
      'The husks are slow already. Make them slower. Make them statues. Keep them off me while I sleep.',
    ],
    milestones: [
      'Five waves. The yellow gate has a husk sculpture garden now. Very tasteful.',
      'Ten. Half the night, and the green lane is a skating rink. I would join you if I were awake.',
      'Fifteen. Cold and calm. You never panic. It is very soothing to dream about.',
    ],
    hurt: 'They have reached me. Freeze them where they stand, and me with them if you must.',
    saved: 'Twenty. The city keeps. You kept it, like fruit on ice. The night goes on; stay cold.',
    fallen: 'Melting. I am melting. That was supposed to be your joke.',
    downed: 'Ice breaks clean and refreezes harder. Get up and prove it.',
  },
  growth: {
    intro: [
      'Mm, I feel a bit feverish. Oh, it is you, Growth. Hello. Please do not infect the dream.',
      'Bacteria, viruses, spore walls that never stop getting bigger. You win by waiting. I admire it.',
      'Let it spread through every lane. Keep the husks off my plinth while your little friends work.',
    ],
    milestones: [
      'Five waves. The husks are coughing. I did not know husks could cough. You taught them.',
      'Ten. Your spore wall is taller than the clock tower. It was not that tall an hour ago.',
      'Fifteen. Everything out there is infected now. Except me. Keep it that way.',
    ],
    hurt: 'They are at me, Growth. Wall me off. Spores, slime, whatever. I am not picky tonight.',
    saved: 'Twenty. The city is saved and slightly mouldy. The night breeds more. So do you.',
    fallen: 'Everything stopped spreading. Even you.',
    downed: 'Things that grow do not stay down. It is literally the only thing they do. Up.',
  },
  crystal: {
    intro: [
      'Ooh. Sparkly. My dream just refracted. That must be Crystal, playing with the light again.',
      'You plant crystals, bank your laser off them, and let two clones fire the same shot back. Show-off.',
      'Set your crystals on the gate roads and keep the husks away from me. I want to watch the bounces.',
    ],
    milestones: [
      'Five waves. That laser went through three husks and a lamppost. The lamppost had it coming.',
      'Ten. Your clones are arguing about who fired first. I can hear them in my sleep.',
      'Fifteen. The whole of Main Street is a prism now. The husks keep walking into angles.',
    ],
    hurt: 'They are cracking me, Crystal. Put something shiny between us.',
    saved: 'Twenty. Saved, and glittering. The night keeps coming; keep bouncing it back at them.',
    fallen: 'Shattered. I can see myself in all the pieces, and none of them are awake.',
    downed: 'A cracked crystal still catches the light. Get up and catch some.',
  },
  soul: {
    intro: [
      'Mm. Someone lit a lantern by my bed. Soul. You always visit with the dead in tow.',
      'You reap the corpses, raise them, and let your Amalgam hold the line while you stand well back.',
      'There will be plenty of corpses tonight. Use them. Keep the husks off my plinth while I dream.',
    ],
    milestones: [
      'Five waves. Your Amalgam is wearing three of the husks now. It looks pleased with itself.',
      'Ten. The lantern is so full it hums. I think it is humming at me.',
      'Fifteen. Every husk that falls in the yellow lane gets back up on our side. That is a good trade.',
    ],
    hurt: 'They have me, Soul. Send the big one up the hill. Now, please.',
    saved: 'Twenty. The city lives because the dead worked a night shift. The night goes on. So do they.',
    fallen: 'Your lantern is the last light. Then it is not.',
    downed: 'Death is your trade, not your destination. Back up.',
  },
  hunt: {
    intro: [
      'Mm. Something is pacing outside my dream. A hunter. Or a beast. With you it depends on the clock.',
      'Two kits in one skin, and one of them takes the wheel when it wants to. I love you both. Cautiously.',
      'Hunt the husks back into the rifts. Whichever of you is driving, keep them off my plinth.',
    ],
    milestones: [
      'Five waves. The hunter set traps on the red road. The beast ate them. Teamwork.',
      'Ten. I heard howling at the green gate. Then I heard the husks stop.',
      'Fifteen. The night belongs to predators. You are the biggest one out there. Good.',
    ],
    hurt: 'Something got past you. Smell it out and tear it off me.',
    saved: 'Twenty. The hunt is won. The night is not, and the beast knows it. Let it run.',
    fallen: 'The prey got the hunter. I did not dream that ending.',
    downed: 'Hunter or beast, both of you know how to get up. Pick one and do it.',
  },
  sand: {
    intro: [
      'Tick. Tock. Mm. I know that click. That is Time, spinning the cylinder by my bed.',
      'Six rounds, a lasso that drags them back to where they were, and a noon that stops the clock dead.',
      'Hold the gates till sunrise, gunslinger. It is a long way off. Keep the husks away from me.',
    ],
    milestones: [
      'Five waves. Six shots, five waves. You are ahead of the clock. Do not get cocky.',
      'Ten. You dragged one husk back through the green gate so hard it was born again. Fair enough.',
      'Fifteen. Is it noon yet? It feels like noon. Everything out there just stopped.',
    ],
    hurt: 'Time, they are on me. Stop the clock. Stop it right here.',
    saved: 'Twenty. The city is saved. Midnight, though, is just getting started. Reload.',
    fallen: 'The clock ran out. Even yours.',
    downed: 'Rewind a little. There. Now stand up.',
  },
  gravity: {
    intro: [
      'Ugh. I feel heavy. Gravity must be close. You always make the dream sink a little.',
      'You pull meteors out of the sky and slam them into the street. Everything you throw lands late.',
      'Late is fine. Just make it land on the husks and not on me. Hold the gates while I sleep.',
    ],
    milestones: [
      'Five waves. There is a crater in the red lane. There used to be a road. And some husks.',
      'Ten. That meteor took four seconds to land. The husks waited politely. Well, they had no choice.',
      'Fifteen. The sky is running out of rocks. Do not let that stop you.',
    ],
    hurt: 'They are pulling me down. Pull them down harder, Gravity.',
    saved: 'Twenty. Saved. The night keeps falling; you are the only thing that falls harder.',
    fallen: 'Weightless. I am drifting off the plinth. Catch me. Too late.',
    downed: 'You of all things know how falling works. Now do the other direction.',
  },
  creation: {
    intro: [
      'Mm. Sawdust. Someone is building in my dream. Creation, you never come empty-handed.',
      'Fan daggers, walls, and for thirty seconds the whole stage becomes your workshop. I like your tools.',
      'Build me a nice thick wall between the gates and my plinth, would you? Keep the husks out.',
    ],
    milestones: [
      'Five waves. You walled off the yellow lane and then decorated it. Lovely joinery.',
      'Ten. The husks are lost in your corridors. I would be too.',
      'Fifteen. Every dagger you threw tonight is in a husk. You make them well.',
    ],
    hurt: 'They are through your walls and at me. Build faster, artisan.',
    saved: 'Twenty. The city is saved, and slightly renovated. The night needs more walls. Keep hammering.',
    fallen: 'The workshop is quiet. Nothing left to make.',
    downed: 'Every craftsman hits their own thumb once. Get up.',
  },
  electricity: {
    intro: [
      'Bzzt. Mm. My hair would be standing up if I had any. Electricity, is that you?',
      'You hurt yourself to charge up, then spend the whole bar in one go. You are a terrible battery.',
      'A wonderful terrible battery. Discharge on the husks and keep them off me while I sleep.',
    ],
    milestones: [
      'Five waves. The red gate streetlights flickered. That was you. All of it was you.',
      'Ten. You took a hit on purpose again. I saw. I am not angry. I am charged.',
      'Fifteen. That last discharge lit up the whole city. The husks saw their own skeletons.',
    ],
    hurt: 'They are draining me. Spend it, Electricity. Spend the whole bar on them.',
    saved: 'Twenty. Saved. The night is a long circuit. Do not let the current drop.',
    fallen: 'Flatline. No charge left anywhere.',
    downed: 'You are hurt. Good news: that is how you charge. Get up and use it.',
  },
  slime: {
    intro: [
      'Mm. Something is hissing near the plinth. Acid, that had better not be my stone you are eating.',
      'Your pools never fade, and you hit harder standing in them. You like a home. I understand.',
      'Pour the lanes full. Make the husks wade. Just keep them, and you, off my plinth.',
    ],
    milestones: [
      'Five waves. The red lane is a lake now. A very bad lake. The husks dislike swimming.',
      'Ten. You have not left your puddle in ten waves. Comfortable?',
      'Fifteen. Half the city is dissolving. Keep the half I am sitting on.',
    ],
    hurt: 'They are on me, Acid. Melt them off. Carefully. I am also meltable.',
    saved: 'Twenty. Saved, and permanently stained. The night is long and the pools are forever. Stand in one.',
    fallen: 'Eaten through. Everything is eaten through.',
    downed: 'Get up and get back in your pool. Things go better for you there.',
  },
  fate: {
    intro: [
      'Mm. Shuffle, shuffle. I hear cards in my sleep. Fate is at the table again.',
      'Six cards you never quite choose, and you keep the good ones. You make luck look like a plan.',
      'Deal the husks a bad hand and keep them away from my plinth. Whatever you draw, play it.',
    ],
    milestones: [
      'Five waves. You drew badly and won anyway. I saw the hand. That was not a winning hand.',
      'Ten. That card you preserved has torn edges. It has been very busy.',
      'Fifteen. The odds say we should have lost by now. The odds have stopped talking to me.',
    ],
    hurt: 'Bad draw, Fate. They are on me. Play something. Anything.',
    saved: 'Twenty. The house is saved. The night is a new deck. Cut it.',
    fallen: 'The cards came up blank. All of them.',
    downed: 'Fold? You? Never. Pick the hand back up.',
  },
  sound: {
    intro: [
      'Boom. Boom. Mm. Someone is keeping time on my dream. That is Sound, leading the band.',
      'You spin the baton on the beat, knock them out of tune, and finish on a bugle solo. Very loud.',
      'Play the husks a march back to their gates. Keep the tempo, keep them off me, let me sleep.',
    ],
    milestones: [
      'Five waves. The red gate is out of tune. Every husk at it is out of tune. Good.',
      'Ten. You have not missed a beat in ten waves. I have been tapping my mote along.',
      'Fifteen. The whole city is marching to you now. The husks too, just badly.',
    ],
    hurt: 'They are drumming on me, Sound. Wrong rhythm entirely. Drive them off.',
    saved: 'Twenty. The city is saved. Strike up the night song. There is no last verse.',
    fallen: 'The band stopped. The silence is enormous.',
    downed: 'You dropped the baton. Pick it up on the next downbeat.',
  },
  light: {
    intro: [
      'Vroom. Mm. Headlights in my dream. Light is out on the streets again, way over the limit.',
      'Steer, drift, take the ramps, and spear whatever is left on the racing line. You are a menace.',
      'Main Street is your track tonight. Lap the gates and keep the husks off my plinth.',
    ],
    milestones: [
      'Five waves. You drifted the whole red lane on two wheels. I felt it in my sleep.',
      'Ten. Half the race done. The husks are all skid marks.',
      'Fifteen. Fastest lap of the night. I would give you a trophy if I had hands.',
    ],
    hurt: 'Pit stop! They are on me, Light. Floor it up the hill.',
    saved: 'Twenty. Chequered flag, the city is yours. The night is an endless circuit. Keep driving.',
    fallen: 'The lights went out on the track. Every one of them.',
    downed: 'Spun out. Happens. Straighten up and go.',
  },
  magnet: {
    intro: [
      'Clink, clink. Mm. Someone is dropping coins on my dream. That is Magnet, hoarding scrap.',
      'Coins, nails, spikes, then one big Repulse to send the whole junk pile flying. And then, a mech.',
      'Throw your scrap at the husks and keep them off my plinth. I want to see the mech.',
    ],
    milestones: [
      'Five waves. There are nails in every husk at the green gate. You were thorough.',
      'Ten. You picked up a lamp post. I did not know it was magnetic. Neither did the lamp post.',
      'Fifteen. The scrap pile is huge. One Repulse and the whole night goes flying.',
    ],
    hurt: 'They are stuck to me, Magnet. Pull them off. Repel them. Mech them.',
    saved: 'Twenty. Saved. The night will bring more junk. You love junk. Go.',
    fallen: 'Everything let go. The coins are just coins now.',
    downed: 'Polarity flipped. Flip it back and stand up.',
  },
  metal: {
    intro: [
      'Mm. Iron on the air. Metal, you smell like a cut lip. You always do.',
      'Your blood is your ammunition and your health at once. You bleed them, then you bleed yourself.',
      'Spend it carefully tonight. Keep the husks off my plinth and keep enough red in you to stand.',
    ],
    milestones: [
      'Five waves. The red lane is redder. I will not ask whose.',
      'Ten. You are still bleeding and still swinging. That is your whole philosophy, isn\'t it?',
      'Fifteen. The husks are bleeding out. You taught them that.',
    ],
    hurt: 'I am bleeding too, now, Metal. Show them how you do it.',
    saved: 'Twenty. The city is saved. You paid for it in red. The night wants more. Ration it.',
    fallen: 'Drained. There was not enough blood in the whole city.',
    downed: 'Clot. Breathe. Get back up and make them bleed for that.',
  },
  plasma: {
    intro: [
      'Oh no. Oh, it is Plasma. My dream just went sideways and started crackling.',
      'Every blade and zone you make can hurt you too. You have no favourites. Not even yourself.',
      'Please make the chaos face the gates. Keep the husks off my plinth. And maybe off you.',
    ],
    milestones: [
      'Five waves. The yellow gate exploded. I think that was good. Was that good?',
      'Ten. You hurt yourself four times and the husks forty. Those are fine odds for you.',
      'Fifteen. The city is half on fire and half electrified and somehow standing. That is your style.',
    ],
    hurt: 'They are on me, Plasma. Be chaos at them, not at me. I know that is hard.',
    saved: 'Twenty. The city is saved by pure accident and pure talent. The night needs more chaos. Oblige it.',
    fallen: 'Every zone went off at once. Including the one under me.',
    downed: 'Was that them or you? Doesn\'t matter. Up.',
  },
  gunpowder: {
    intro: [
      'Mm, powder smoke. Gunpowder, did you bring the entire armoury into my dream again?',
      'Your arsenal grows all match. Then you fire everything at once and get blown down the street.',
      'Point it at the gates, fire at will, and keep the husks off my plinth. Mind the recoil.',
    ],
    milestones: [
      'Five waves. The armoury is getting bigger. So is the hole at the red gate.',
      'Ten. You knocked yourself across two lanes with that volley. Graceful, almost.',
      'Fifteen. Everything you own is loaded. The husks can feel it.',
    ],
    hurt: 'They are on me. Fire everything, Gunpowder. Yes, everything.',
    saved: 'Twenty. Saved, with a ringing in my ears. The night is long. Keep reloading.',
    fallen: 'The last shot misfired. The armoury is cold.',
    downed: 'Blown back again. You know the drill. Dust off and load.',
  },
  echo: {
    intro: [
      'Hello? Hello? ...hello. Oh. Echo. You answer me before I finish dreaming the words.',
      'You fight half blind, bounce sound off the walls and read what comes back. I envy your ears.',
      'Listen for the husks in the lanes. Keep them off my plinth. I will try to sleep quietly.',
    ],
    milestones: [
      'Five waves. You heard the red gate open before it did. I heard you hearing it.',
      'Ten. Your pings are mapping the whole city. Including my snoring. Sorry.',
      'Fifteen. The husks keep stepping where your sound lands. You guess very well.',
    ],
    hurt: 'Can you hear that? That is them, on me. Ping them. Ping them hard.',
    saved: 'Twenty. The city is saved. The night keeps whispering. Keep listening.',
    fallen: 'Nothing comes back. No matter what I call.',
    downed: 'Shout. Listen for where the floor is. Stand on it.',
  },
  rubber: {
    intro: [
      'Boing. Mm. Something just ricocheted off my dream. Rubber, of course. You bounce off everything.',
      'Sling off the walls, send their shots home, snap back on the band. You are very hard to hurt.',
      'Bounce the husks back down the lanes and keep them off my plinth. Stretch if you need to.',
    ],
    milestones: [
      'Five waves. A husk threw something and it came home to it. That was you. Nice.',
      'Ten. You have used every wall in the city. The houses are very confused.',
      'Fifteen. Still springy. I do not know how you are not tired. Rubber does not get tired, I suppose.',
    ],
    hurt: 'They are on me. Snap back, Rubber. Snap back to me now.',
    saved: 'Twenty. Saved, and still bouncing. The night keeps throwing things. Throw them back.',
    fallen: 'The band snapped. Nothing comes back.',
    downed: 'Flattened? You are rubber. Pop back into shape.',
  },
  magic: {
    intro: [
      'Mm. Pages turning. Magic is reading at the foot of my bed again.',
      'Five spells on a wheel, an anchor to blink back to, and more options than you have keys. Show-off.',
      'Read out something nasty for the husks. Keep them off my plinth, and drop your anchor near me.',
    ],
    milestones: [
      'Five waves. You used all five spells on one husk. I think it is still spinning.',
      'Ten. Your anchor is next to my plinth. I feel safer. That was probably the idea.',
      'Fifteen. Your little elementals patrol the rooftops like they own them. They do now.',
    ],
    hurt: 'They are on me, Magic. Blink home to the anchor. Cast something loud.',
    saved: 'Twenty. The city is saved. The night is the long chapter. Turn the page.',
    fallen: 'The book closed. The spells are just words.',
    downed: 'Wrong spell. Spin the wheel and try another one, standing up.',
  },
  technology: {
    intro: [
      'Mm. Beep. Loading. Technology is installing itself in my dream. Did I click accept?',
      'Popups, uploads, a drag cursor. You fight their screen as hard as their body. Very rude. Very clever.',
      'Hack the husks back down the lanes. Keep them off my plinth. Please do not update me mid-sleep.',
    ],
    milestones: [
      'Five waves. The husks at the green gate are stuck closing your popups. Forever, I hope.',
      'Ten. Upload complete. I do not know what you uploaded. I am scared to ask.',
      'Fifteen. The whole city is lagging. Except you. Patched in, are we?',
    ],
    hurt: 'Critical error. They are on me. Drag them off, Technology.',
    saved: 'Twenty. The city is saved. The night is buffering. Stay online.',
    fallen: 'System failure. No restore point.',
    downed: 'Have you tried turning yourself off and on again? Good. Now get up.',
  },
  silence: {
    intro: [
      '...Mm. It went very quiet. Silence is in the room. You are always closer than I think.',
      'Stealth, stalkers, rituals. Every cast you make is a knife you will use a minute from now.',
      'Set your traps in the lanes. Keep the husks off my plinth. Do not tell me where you are.',
    ],
    milestones: [
      'Five waves. I did not see you once. The husks at the red gate did not either, briefly.',
      'Ten. Your stalker matured in the yellow lane. Something screamed. Then nothing.',
      'Fifteen. Every setup you made tonight paid off. I can count the backstabs by the hush.',
    ],
    hurt: 'They are on me. Come out of the fog, Silence. Just this once.',
    saved: 'Twenty. The city is saved without a sound. The night is your hunting ground now. Go quiet.',
    fallen: '...',
    downed: 'Quietly now. Stand up. Nobody saw.',
  },
  subterfuge: {
    intro: [
      'Mm. My pocket feels lighter. Subterfuge, did you just pick the pocket of a dream?',
      'Recalled daggers, bought loyalty, a stolen ultimate. You fight with their kit and keep the change.',
      'Steal whatever the husks have and turn it on them. Keep them off my plinth. Give my motes back.',
    ],
    milestones: [
      'Five waves. Two husks at the green gate are working for you now. How much did that cost?',
      'Ten. Your daggers keep coming home. Loyal little things. Unlike everyone else you pay.',
      'Fifteen. You stole a whole wave\'s worth of tricks. I am almost proud.',
    ],
    hurt: 'They are robbing me blind. Out-thieve them, Subterfuge.',
    saved: 'Twenty. The city is saved. The night is full of things to steal. Help yourself.',
    fallen: 'They took everything. Even the part of me that was you.',
    downed: 'Play dead later. Steal yourself a second wind now.',
  },
  justice: {
    intro: [
      'Order. Order in the dream. Mm. That is Justice, gavel in hand.',
      'Two full trays, ground and air, and one bar of Willpower paying for both. You never stop judging.',
      'The husks are guilty of trespass. Sentence them at the gates and keep them off my plinth.',
    ],
    milestones: [
      'Five waves. The red gate docket is cleared. Swift justice.',
      'Ten. You switched to the air tray and the husks never looked up. Overruled.',
      'Fifteen. Your Willpower is holding. So is the verdict.',
    ],
    hurt: 'Objection. They are on me, Justice. Rule on it. Now.',
    saved: 'Twenty. The city is acquitted. The night is a long session. The court stays open.',
    fallen: 'Case dismissed. Everything dismissed.',
    downed: 'Recess is over, Magistrate. Rise.',
  },
  dream: {
    intro: [
      'Oh. Oh, it is you. Dream. You feel like a pillow I lost years ago.',
      'You make them sleepy and cash it in, and a second you steps out to fight. I do that too. Look.',
      'You know what this dream is. You know what climbs out of it. Keep them off me. Let me keep dreaming.',
    ],
    milestones: [
      'Five waves. I dreamed you holding the red gate. Then I opened one eye, and you were.',
      'Ten. The husks are yawning. You have been tucking them in, haven\'t you? Forever.',
      'Fifteen. Your second body walked past my plinth and nodded at me. I nodded back. Strange night.',
    ],
    hurt: 'Dream, it is turning into a nightmare. You know how to fix those. Please.',
    saved: 'Twenty. You kept my dream safe from my dream. The night goes on, and so do we. Sleep tight, fight hard.',
    fallen: 'I am waking up. I do not want to. Not without you.',
    downed: 'Shh. You are only dozing. Wake up in the dream, and stand.',
  },
  quantum: {
    intro: [
      'Mm. I see you twice. No, you are two things at once. Quantum, you never pick one.',
      'Two bonded elements, split across your cooldowns, the arena and every hit you land. Greedy.',
      'Hold the gates as both of you. Keep the husks off my plinth in at least one of your states.',
    ],
    milestones: [
      'Five waves. You held the red gate and the green one at the same time. I think. I did not observe.',
      'Ten. Your bond is humming. Both halves of you seem to agree tonight. Rare.',
      'Fifteen. The husks cannot decide which you to hit. Neither can I.',
    ],
    hurt: 'They are on me in every state. Collapse onto them, Quantum.',
    saved: 'Twenty. The city is saved, probably. The night is uncertain. You are good at that.',
    fallen: 'Decohered. Both of you, and all of me.',
    downed: 'Superposition: down and up. Pick up.',
  },
  radiation: {
    intro: [
      'Mm. My teeth are humming. Radiation is nearby, and probably lining up a shot.',
      'Tag a body three times, then the railgun. A closing sight, a lead bunker. You are a patient killer.',
      'Find a rooftop over the lanes and pick the husks off before they reach me. Do not glow on my plinth.',
    ],
    milestones: [
      'Five waves. That railgun went from the yellow gate to the river. Through things.',
      'Ten. Half the husks out there are tagged twice. Waiting for a third. Waiting for you.',
      'Fifteen. The bunker held. So did you. So did I, mostly.',
    ],
    hurt: 'They are on me. Take the shot, Radiation. I trust your aim.',
    saved: 'Twenty. The city is saved. The night will glow for decades. Keep the scope up.',
    fallen: 'Half-life over. All of it, at once.',
    downed: 'Duck into the bunker. Breathe. Back on the sight.',
  },
  depths: {
    intro: [
      'Mm. Salt. Pressure. Depths, you always pull my dream a little under.',
      'Piranhas, algae, a shark. If you hold still long enough, the sea hands you a weapon. Fish patiently.',
      'Cast your line at the gates and keep the husks off my plinth. I will try not to drown in my sleep.',
    ],
    milestones: [
      'Five waves. The piranhas ate the red lane husks to the knee. Then above the knee.',
      'Ten. The green gate is all algae now. Very pretty. Very slippery.',
      'Fifteen. The shark has a favourite husk. It eats that one every wave.',
    ],
    hurt: 'They have me, Depths. Send up something with teeth.',
    saved: 'Twenty. The city is above water. The night is a deep one. Keep fishing.',
    fallen: 'The tide went out and took me with it.',
    downed: 'Surface. Breathe. Dive back in.',
  },
  psychic: {
    intro: [
      'Mm. You knew I would say that. Psychic, you always see my lines two seconds early.',
      'You stand chess pieces on the board and let their auras arm you. Every match is a game to you.',
      'Set the board across the lanes. Keep the husks off my plinth. I will be your king. A sleepy one.',
    ],
    milestones: [
      'Five waves. The husks at the red gate walked into a fork. You saw it coming. Of course.',
      'Ten. Your queen is holding the green lane alone. Terrifying lady.',
      'Fifteen. You are ten moves ahead. The husks are on move one. Forever.',
    ],
    hurt: 'Check. They have me in check, Psychic. Find the move.',
    saved: 'Twenty. Not checkmate. The city is saved. The night is a new game; set up the pieces.',
    fallen: 'Checkmate. You saw it two seconds early. I am sorry I did not.',
    downed: 'A sacrifice, not a loss. Back on the board.',
  },
  ruin: {
    intro: [
      'Mm. Something smells of rust and old paint. Ruin is walking through my dream, breaking it on purpose.',
      'You lock their abilities, rot them, skewer them off the board for good. You take things away. Neatly.',
      'Take everything from the husks. Their legs, ideally. Keep them off my plinth while I sleep.',
    ],
    milestones: [
      'Five waves. The red lane husks forgot how to do anything. You rusted them shut.',
      'Ten. Half the night, and nothing out there is working properly. Except you.',
      'Fifteen. You have locked so many things tonight. Do not lock me. I am fragile.',
    ],
    hurt: 'They are on me. Ruin them, Ruin. Ruin all of them.',
    saved: 'Twenty. The city is saved; the husks are ruined. The night is long and there is much left to break.',
    fallen: 'Rusted through. Just like you always do to everyone else.',
    downed: 'A little rust on you. Shake it off. Up.',
  },
  tempest: {
    intro: [
      'Mm. My dream is getting windy. Thunder in the distance. Tempest, you brought weather.',
      'You knock things back, leave the floor, ride the currents and slam your own fronts. Every wall is yours.',
      'Blow the husks back down their lanes and into their gates. Keep them off my plinth. Mind the roof.',
    ],
    milestones: [
      'Five waves. A husk went over the yellow gate wall. Then another. Then you.',
      'Ten. You have not touched the ground in two waves. Show-off.',
      'Fifteen. The night is all storm now. You are in the eye. Comfortable?',
    ],
    hurt: 'They have me, Tempest. Blow them off the hill. Into a wall, if one is handy.',
    saved: 'Twenty. The city is saved. The storm keeps rolling. Ride it.',
    fallen: 'The storm passed. It took me with it.',
    downed: 'Lightning strikes twice. Strike again.',
  },
  myth: {
    intro: [
      'Mm. A crowd is cheering in my dream. Oh. It is Myth. Of course they are cheering. You hired them.',
      'The ultimate element, a legend with Echo Shards and a second act for everything. I made you, you know.',
      'Put on a show at the gates and keep the husks off my plinth. Try not to be too modest. Kidding.',
    ],
    milestones: [
      'Five waves. The crowd paid well for that. I could hear the Shards from here.',
      'Ten. Second act on every ability. The husks keep thinking the show is over. It never is.',
      'Fifteen. They will sing about tonight. You will make sure of it.',
    ],
    hurt: 'Legend, the crowd is watching me lose. Fix it. With style.',
    saved: 'Twenty. The city is saved; the legend grows. The night wants an encore. Give it one.',
    fallen: 'The curtain fell. The crowd went home.',
    downed: 'Legends always fall once in the second act. Rise for the third.',
  },
  marrow: {
    intro: [
      'Mm. My joints ache. Marrow, you are in my dream like a fever fighting a cold.',
      'Antibodies, white cells, and a bone bar to pay for all of it. You are an immune response. Mine.',
      'The husks are an infection. Fight them off at the gates and keep them away from my plinth.',
    ],
    milestones: [
      'Five waves. The red gate is inflamed. In a good way. You are doing your job.',
      'Ten. Your white cells are chasing husks down the green lane. They will not stop.',
      'Fifteen. The bone bar is holding. So is the city\'s skeleton.',
    ],
    hurt: 'The infection is in me. Respond, Marrow. Respond everything.',
    saved: 'Twenty. The fever broke. The city is saved. The night carries more sickness. Stay vigilant.',
    fallen: 'The infection won. I am all husk.',
    downed: 'Immune systems do not quit. Get up and fight it off.',
  },
  cloth: {
    intro: [
      'Mm. Soft. Someone tucked a scarf around my dream. Cloth, you always cover me.',
      'Your health bar is a scarf, and the scarf is the hitbox. The rest is tetrominoes. Fit them well.',
      'Stitch the gates shut and keep the husks off my plinth. Try not to unravel tonight.',
    ],
    milestones: [
      'Five waves. You blocked the red lane with an L-piece. It fit perfectly. Satisfying.',
      'Ten. Your scarf is a little frayed. It is still the nicest thing in the city.',
      'Fifteen. You have patched every hole the husks made. You sew faster than they tear.',
    ],
    hurt: 'They are tearing at me, Cloth. Pin them down. Pin them all.',
    saved: 'Twenty. The city is mended. The night is a long seam. Keep sewing.',
    fallen: 'Unravelled. Every thread at once.',
    downed: 'Torn, not finished. Tie it off and get up.',
  },
  magma: {
    intro: [
      'Mm. Sulphur and sea salt. Magma, your volcano rumbles even in my sleep.',
      'Feed the volcano with your attacks, ride the blunderbuss recoil, raise your ship with that cursed pendant.',
      'Put your crew on the gates and keep the husks off my plinth. Do not ask the pendant for advice.',
    ],
    milestones: [
      'Five waves. You rode the recoil across the red lane. Rough sailing.',
      'Ten. The volcano is fed and grumpy. The husks can feel it in their feet.',
      'Fifteen. Your ship rose out of the green gate. I am not sure where you found water.',
    ],
    hurt: 'They are boarding me, Captain. Fire the blunderbuss.',
    saved: 'Twenty. The city is saved; the volcano is fed. The night is a long voyage. Sail on.',
    fallen: 'The volcano went cold. The ship sank with it.',
    downed: 'Man overboard. Climb back up the rope.',
  },
  chalk: {
    intro: [
      'Mm. Turpentine. Someone is painting on the inside of my eyelids. Paint, of course.',
      'What you paint is what you throw. A line, a blob, a little face. All of it is a weapon.',
      'Paint the street. Keep the husks off my plinth. Try not to paint a moustache on me.',
    ],
    milestones: [
      'Five waves. Your orange loop in the red lane is wobbly. The bucket you threw in it was not.',
      'Ten. You painted a wall across the green gate. They refuse to cross it.',
      'Fifteen. The whole city is your canvas. The husks are your still lifes.',
    ],
    hurt: 'They are on me, Painter. Paint something sharp. Fast.',
    saved: 'Twenty. The city is saved, and covered in paint. The night is a blank canvas. Fill it.',
    fallen: 'Painted over. Blank canvas. Nothing left.',
    downed: 'Smudged, not finished. Get up and repaint yourself.',
  },
  wax: {
    intro: [
      'Mm. Honey. Bzzz. Wax is near, and so are about a thousand bees.',
      'A wax foil, a loose swarm, and a hive that pays back every bee fivefold. You run a tidy apiary.',
      'Fence at the gates, send the swarm, keep the husks off my plinth. Do not let the bees nest in me.',
    ],
    milestones: [
      'Five waves. The red gate husks are swollen and furious. That means the bees are working.',
      'Ten. The hive is humming. Fivefold returns. The husks are underwater in bees.',
      'Fifteen. Your foil has not dulled. Neither have you.',
    ],
    hurt: 'They are on me, Wax. Send the swarm. Every bee.',
    saved: 'Twenty. The city is saved and sticky. The night needs a busier hive. Keep tending.',
    fallen: 'The hive went quiet. Wax melts.',
    downed: 'Up. The bees are watching, and they gossip.',
  },
  clay: {
    intro: [
      'Mm. Wet and earthy. Clay, you are shaping something in my dream again.',
      'A golem on your cursor that cannot die, a shield sculpted by hand, eight layers of clay. Very hands-on.',
      'Send your golem to the gates. Keep the husks off my plinth. Do not sculpt my nose while I sleep.',
    ],
    milestones: [
      'Five waves. The golem holds the red lane alone. Immortal and stubborn. Like a pot.',
      'Ten. You ran the walls of the green gate. Up, around, back down on top of them.',
      'Fifteen. Eight layers, fused. The husks are just mud on your boots.',
    ],
    hurt: 'They are on me, Clay. Shape me a wall. Quickly.',
    saved: 'Twenty. The city is saved, and partly re-sculpted. The night is long. Keep shaping.',
    fallen: 'Cracked in the kiln. All of it.',
    downed: 'Squash it back into shape. Stand.',
  },
  paper: {
    intro: [
      'Mm. Rustling pages. Paper, are you reading me a bedtime story?',
      'Three storybooks, one open at a time, and a journal that remembers what happened last run. I remember too.',
      'Open the right book at the gates and keep the husks off my plinth. Write it down after.',
    ],
    milestones: [
      'Five waves. A good chapter. The red gate husks did not read ahead.',
      'Ten. Your journal is getting thick. Half the night already in ink.',
      'Fifteen. The husks keep walking into the plot twist. Every time.',
    ],
    hurt: 'They are tearing my pages, Paper. Write them out of the story.',
    saved: 'Twenty. The city is saved; the story continues. The night has endless chapters. Keep writing.',
    fallen: 'The end. I did not want it to be.',
    downed: 'Just a paper cut. Turn the page and stand.',
  },
  bind: {
    intro: [
      'Mm. Someone is praying in my dream. Bind, I can hear your idols humming.',
      'Summon, sacrifice, pray. The idols take your faith and hand back somebody else\'s power.',
      'Kneel at the gates if you must, but keep the husks off my plinth. I would rather not be sacrificed.',
    ],
    milestones: [
      'Five waves. The red lane idols are smiling. I do not trust them, but they hold.',
      'Ten. You gave up something to hold the green gate. I saw. Thank you.',
      'Fifteen. Your faith is strong tonight. The idols are almost generous.',
    ],
    hurt: 'They are at the altar, Bind. Pray harder. Or summon harder. Both.',
    saved: 'Twenty. The city is saved; the idols are pleased. The night asks for more devotion. Keep praying.',
    fallen: 'The idols turned their faces away.',
    downed: 'Kneeling is not falling. Rise from your prayers.',
  },
  dune: {
    intro: [
      'Mm. Grit in my dream. Sand, you are shifting the whole floor again.',
      'The ground is alive under you. You bury them, walk beneath it, then glass the arena. I sleep on dunes.',
      'Swallow the husks in the lanes and keep them off my plinth. Please do not bury me.',
    ],
    milestones: [
      'Five waves. The red lane is a dune sea. There were husks. Now there are humps.',
      'Ten. You surfaced under a husk at the green gate. It is still looking for you.',
      'Fifteen. You glassed the yellow lane. It glitters in the moonlight. The husks are inside.',
    ],
    hurt: 'They are on me, Sand. Bury them. Bury them deep.',
    saved: 'Twenty. The city is saved. The night drifts on like sand. Keep shifting.',
    fallen: 'Buried. Everything buried.',
    downed: 'Dig yourself out. You know the way up.',
  },
  illusion: {
    intro: [
      'Mm. Is that you? Or that? Or that? Illusion. You are never where my dream puts you.',
      'Veils that bend every shot through them, and you blink between corners. Nothing is real with you.',
      'Make the husks lose their way to my plinth. Make them chase shadows all night.',
    ],
    milestones: [
      'Five waves. The husks at the red gate attacked a lamppost for a while. You did that.',
      'Ten. Every shot through your veil goes somewhere else. The green lane is a hall of mirrors.',
      'Fifteen. I am not sure which of you is real. The husks gave up deciding.',
    ],
    hurt: 'They found the real me, Illusion. Show them a fake one.',
    saved: 'Twenty. The city is saved. Or is it? Yes. The night goes on. Keep them guessing.',
    fallen: 'The veil dropped. Everything is exactly where it looks. Terrible.',
    downed: 'That was a decoy falling, right? Prove it. Get up.',
  },
  conquest: {
    intro: [
      'Mm. Marching feet. Coins. Building sounds. Conquest is setting up a war in my dream.',
      'Income, buildings, soldiers and territory, all bolted onto a fist fight. You play two games at once.',
      'Claim the lanes. Build at the gates. Keep the husks off my plinth. It is the capital, after all.',
    ],
    milestones: [
      'Five waves. You own the red lane now. There is a barracks on it. Was that there before?',
      'Ten. Your soldiers hold the green gate. Your income is excellent. Your general is tired.',
      'Fifteen. The whole city flies your flag. The husks are only renting.',
    ],
    hurt: 'The capital is under siege, Warlord. Send everything.',
    saved: 'Twenty. The city is conquered. Defended. Both. The night is a long war. Keep building.',
    fallen: 'The capital fell. The flags came down.',
    downed: 'A general does not stay down. Your troops are watching.',
  },
  passion: {
    intro: [
      'Mm. Hymns. Candle smoke. Devotion, you are praying over me again. I am not dead, only napping.',
      'You do no damage at all. You fill them with faith until they convert. That is somehow worse.',
      'Convert the husks at the gates. Keep them off my plinth. Perhaps preach a little quieter.',
    ],
    milestones: [
      'Five waves. The red gate husks are praying with you now. They seem calmer.',
      'Ten. Half the night, and your congregation is half husk. Lovely choir.',
      'Fifteen. The faithful hold the green gate for you. They believe very hard.',
    ],
    hurt: 'They are on me, Devotion. Pray faster. Convert harder.',
    saved: 'Twenty. The city is saved, and much more religious. The night is long. Keep the faith.',
    fallen: 'The candles went out. All of them.',
    downed: 'The faithful stumble. They also stand. Rise.',
  },
  death: {
    intro: [
      'Mm. Steel. A cold blade drawn. Death has come to my bedside, very politely.',
      'Disarm, riposte, amputate. Your kit is made entirely of their mistakes. The husks make many.',
      'Duel them at the gates. Keep the husks off my plinth. And please, no amputations on me.',
    ],
    milestones: [
      'Five waves. The red lane husks lunged. You were not there. Then you were.',
      'Ten. That riposte took three husks in one motion. Elegant. Terrifying.',
      'Fifteen. You have not taken a clean hit all night. The husks keep giving you openings.',
    ],
    hurt: 'They are on me, Death. Punish their mistakes.',
    saved: 'Twenty. The city is saved. The night keeps attacking. Keep parrying.',
    fallen: 'Even Death takes a holiday, apparently.',
    downed: 'Death does not stay dead. Rise and riposte.',
  },
  fortune: {
    intro: [
      'Mm. Clinking metal. Gold. Gold everywhere. Hello, alchemist. You are counting in your sleep.',
      'You turn grass, blood and floor into gold, then spend it ten at a time on yourself. A bit vain.',
      'Transmute the husks at the gates. Keep them off my plinth. I am already shiny enough.',
    ],
    milestones: [
      'Five waves. The red gate is gilded. The husks are gilded. Everything is gold.',
      'Ten. You have spent eighty gold on yourself tonight. Worth every coin.',
      'Fifteen. The city glitters. The husks are blinded by the shine.',
    ],
    hurt: 'They are on me, Gold. Spend it. All of it.',
    saved: 'Twenty. The city is saved, and much richer. The night is long, but you are wealthy.',
    fallen: 'Lead. It all went back to lead.',
    downed: 'Pay yourself back up. Get up.',
  },
  gum: {
    intro: [
      'Mm. Sticky. Squishy. Slime is crawling around my dream again.',
      'Your hand is the hitbox. You grab them, ooze across the floor, then zip along your own trails.',
      'Grab the husks at the gates and keep them off my plinth. Please do not grab me.',
    ],
    milestones: [
      'Five waves. You grabbed a husk in the red lane and threw it back through the gate. Bravo.',
      'Ten. Your trails crisscross the whole city. You zip along them like a bead on a string.',
      'Fifteen. The husks are all slimy now. They cannot get a grip. You can.',
    ],
    hurt: 'They are on me, Slime. Grab them off. Hold on tight.',
    saved: 'Twenty. The city is saved and slimed. The night is long and sticky. Keep oozing.',
    fallen: 'Dried out. Nothing left to stick.',
    downed: 'Splatted? Ooze back together and get up.',
  },
  gluttony: {
    intro: [
      'Mm. Rustling straw. A sweet rot. Harvest, standing silent over my field again.',
      'You sow purple mold, let it rot anyone standing in it, then reap the corrupted with your scythe.',
      'Sow the lanes and reap the husks. Keep them off my plinth. Keep the mold off it too.',
    ],
    milestones: [
      'Five waves. The red lane is purple. The husks in it are softer. You reaped them.',
      'Ten. Half the night, and the mold reaches the green gate. The harvest is heavy.',
      'Fifteen. Your scythe has not stopped swinging. The field is almost clear.',
    ],
    hurt: 'They are at my roots, Harvest. Reap them. Reap them now.',
    saved: 'Twenty. The city is saved. The night is a long growing season. Keep reaping.',
    fallen: 'The field went fallow. Nothing left to harvest.',
    downed: 'Scarecrows do not fall. Pick yourself back up on your pole.',
  },
};

/** The lines for an element id, or the default set. */
export function dreamLinesFor(elementId: string): DreamLines {
  return DREAM_LINES[elementId] ?? DEFAULT_DREAM;
}
