import { PreviewScript } from '../../../ui/AbilityPreview';
import * as fire from './fire';
import * as water from './water';
import * as life from './life';
import * as air from './air';
import * as earth from './earth';
import * as ice from './ice';
import * as shadow from './shadow';
import * as oil from './oil';
import * as growth from './growth';
import * as crystal from './crystal';
import * as soul from './soul';
import * as hunt from './hunt';
import * as sand from './sand';
import * as gravity from './gravity';
import * as creation from './creation';
import * as electricity from './electricity';
import * as slime from './slime';
import * as light from './light';
import * as magnet from './magnet';
import * as metal from './metal';
import * as plasma from './plasma';
import * as gunpowder from './gunpowder';
import * as magic from './magic';
import * as dream from './dream';
import * as psychic from './psychic';
import * as radiation from './radiation';
import * as magma from './magma';
import * as dune from './dune';
import * as fortune from './fortune';
import * as marrow from './marrow';
import * as justice from './justice';
import * as gluttony from './gluttony';
import * as quantum from './quantum';
import * as illusion from './illusion';
import * as passion from './passion';
import * as ruin from './ruin';
import * as chalk from './chalk';
import * as bind from './bind';
import * as depths from './depths';
import * as gum from './gum';
import * as paper from './paper';
import * as death from './death';
import * as echo from './echo';
import * as subterfuge from './subterfuge';
import * as rubber from './rubber';
import * as fate from './fate';
import * as sound from './sound';
import * as technology from './technology';
import * as conquest from './conquest';
import * as silence from './silence';
import * as subj from './subjects';

/**
 * The ability showcase registry.
 *
 * Keyed `elementId:abilityId` for the base ability and `elementId:abilityId:up` for the form
 * the shop upgrade turns it into. The info screen's BASE / UPGRADED tabs read the matching key,
 * so switching tabs re-stages the loop as well as re-writing the text — an upgrade that changes
 * what the ability *is* (Titan Form, Flame Charge, the Expert Dancer flip) gets shown, not
 * described.
 *
 * A missing key is not an error. The screen falls back to the base loop and says so, and if
 * there is no base loop either it draws a labelled placeholder.
 *
 * ## Adding one
 *
 * Write the script in `./<elementId>.ts` and add its key below. A script gets a masked, scaled
 * box and a caster mark; call the element's real `Fx` and avatar rather than redrawing the art,
 * or the preview will drift from the ability the first time anybody retunes it.
 */
export const PREVIEWS: Record<string, PreviewScript> = {
  // ── Fire ──
  'fire:fireball': fire.fireball,
  'fire:fireball:up': fire.fireballUpgraded,
  'fire:flame-dash': fire.flameDash,
  'fire:flame-dash:up': fire.flameDashUpgraded,
  'fire:pressure-bomb': fire.pressureBomb,
  'fire:pressure-bomb:up': fire.pressureBombUpgraded,
  'fire:flame-body': fire.flameBody,
  'fire:flame-body:up': fire.flameBodyUpgraded,
  'fire:flame-nuke': fire.flameNuke,
  'fire:flame-nuke:up': fire.flameNukeUpgraded,

  // ── Water ──
  'water:water-cut': water.waterCut,
  'water:water-cut:up': water.waterCutUpgraded,
  'water:splash': water.splash,
  'water:splash:up': water.splashUpgraded,
  'water:geyser': water.geyser,
  'water:geyser:up': water.geyserUpgraded,
  'water:pressure-dagger': water.pressureDagger,
  'water:pressure-dagger:up': water.pressureDaggerUpgraded,
  'water:pain-rain': water.painRain,
  'water:pain-rain:up': water.painRainUpgraded,

  // ── Life ──
  'life:petal-shotgun': life.petalShotgun,
  'life:petal-shotgun:up': life.petalShotgunUpgraded,
  'life:plant': life.plant,
  'life:plant:up': life.plantUpgraded,
  'life:grow': life.grow,
  'life:grow:up': life.growUpgraded,
  'life:thorns': life.thorns,
  'life:thorns:up': life.thornsUpgraded,
  'life:thorn-drag': life.thornDrag,
  'life:thorn-drag:up': life.thornDragUpgraded,

  // ── Air ──
  'air:wind-splice': air.windSplice,
  'air:wind-splice:up': air.windSpliceUpgraded,
  'air:spin-dance': air.spinDance,
  'air:spin-dance:up': air.spinDanceUpgraded,
  'air:gale-glaive': air.galeGlaive,
  'air:gale-glaive:up': air.galeGlaiveUpgraded,
  'air:sky-grapple': air.skyGrapple,
  'air:sky-grapple:up': air.skyGrappleUpgraded,
  'air:wind-breaker': air.windBreaker,
  'air:wind-breaker:up': air.windBreakerUpgraded,

  // ── Earth ──
  'earth:bash': earth.bash,
  'earth:bash:up': earth.bashUpgraded,
  'earth:repair': earth.repair,
  'earth:repair:up': earth.repairUpgraded,
  'earth:rock-dance': earth.rockDance,
  'earth:rock-dance:up': earth.rockDanceUpgraded,
  'earth:quake': earth.quake,
  'earth:quake:up': earth.quakeUpgraded,
  'earth:golem-ritual': earth.golemRitual,
  'earth:golem-ritual:up': earth.golemRitualUpgraded,

  // ── Ice ──
  'ice:ice-spike': ice.iceSpike,
  'ice:ice-spike:up': ice.iceSpikeUpgraded,
  'ice:frost-blast': ice.frostBlast,
  'ice:frost-blast:up': ice.frostBlastUpgraded,
  'ice:block-up': ice.blockUp,
  'ice:block-up:up': ice.blockUpUpgraded,
  'ice:skate': ice.skate,
  'ice:skate:up': ice.skateUpgraded,
  'ice:frozen-solid': ice.frozenSolid,
  'ice:frozen-solid:up': ice.frozenSolidUpgraded,

  // ── Shadow ──
  'shadow:dark-drain': shadow.darkDrain,
  'shadow:dark-drain:up': shadow.darkDrainUpgraded,
  'shadow:tentacle': shadow.tentacle,
  'shadow:tentacle:up': shadow.tentacleUpgraded,
  'shadow:snap-trap': shadow.snapTrap,
  'shadow:snap-trap:up': shadow.snapTrapUpgraded,
  'shadow:tentacle-wall': shadow.tentacleWall,
  'shadow:tentacle-wall:up': shadow.tentacleWallUpgraded,
  'shadow:black-hole': shadow.blackHole,
  'shadow:black-hole:up': shadow.blackHoleUpgraded,

  // ── Oil ──
  'oil:drone-command': oil.droneCommand,
  'oil:drone-command:up': oil.droneCommandUpgraded,
  'oil:barrel-roll': oil.barrelRoll,
  'oil:barrel-roll:up': oil.barrelRollUpgraded,
  'oil:drone-destroy': oil.droneDestroy,
  'oil:drone-destroy:up': oil.droneDestroyUpgraded,
  'oil:shield-gen': oil.shieldGen,
  'oil:shield-gen:up': oil.shieldGenUpgraded,
  'oil:train-morph': oil.trainMorph,
  'oil:train-morph:up': oil.trainMorphUpgraded,

  // ── Growth ──
  'growth:growth-click': growth.growthClick,
  'growth:growth-click:up': growth.growthClickUpgraded,
  'growth:growth-evolve': growth.growthEvolve,
  'growth:growth-evolve:up': growth.growthEvolveUpgraded,
  'growth:growth-virus': growth.growthVirus,
  'growth:growth-virus:up': growth.growthVirusUpgraded,
  'growth:spore-spray': growth.sporeSpray,
  'growth:spore-spray:up': growth.sporeSprayUpgraded,
  'growth:auxiliary-growth': growth.auxiliaryGrowth,
  'growth:auxiliary-growth:up': growth.auxiliaryGrowthUpgraded,

  // ── Crystal ──
  'crystal:crystal-laser': crystal.crystalLaser,
  'crystal:crystal-laser:up': crystal.crystalLaserUpgraded,
  'crystal:crystal-place': crystal.placeCrystal,
  'crystal:crystal-place:up': crystal.placeCrystalUpgraded,
  'crystal:crystal-atune': crystal.crystalAtune,
  'crystal:crystal-atune:up': crystal.crystalAtuneUpgraded,
  'crystal:crystal-portal': crystal.crystalPortal,
  'crystal:crystal-portal:up': crystal.crystalPortalUpgraded,
  'crystal:crystal-trick': crystal.crystalTrick,
  'crystal:crystal-trick:up': crystal.crystalTrickUpgraded,

  // ── Soul ──
  'soul:soul-lantern-light': soul.lanternLight,
  'soul:soul-lantern-light:up': soul.lanternLightUpgraded,
  'soul:soul-arise': soul.arise,
  'soul:soul-arise:up': soul.ariseUpgraded,
  'soul:soul-grave': soul.graveAbility,
  'soul:soul-grave:up': soul.graveUpgraded,
  'soul:soul-death-whistle': soul.deathWhistle,
  'soul:soul-death-whistle:up': soul.deathWhistleUpgraded,
  'soul:soul-hells-torment': soul.hellsTorment,
  'soul:soul-hells-torment:up': soul.hellsTormentUpgraded,

  // ── Hunt (three forms; keyed by ability id, since the keys repeat) ──
  'hunt:hunt-crossbow': hunt.crossbow,
  'hunt:hunt-crossbow:up': hunt.crossbowUpgraded,
  'hunt:hunt-blast': hunt.blast,
  'hunt:hunt-blast:up': hunt.blastUpgraded,
  'hunt:hunt-grenade': hunt.grenade_,
  'hunt:hunt-grenade:up': hunt.grenadeUpgraded,
  'hunt:hunt-trail': hunt.trail,
  'hunt:hunt-trail:up': hunt.trailUpgraded,
  'hunt:hunt-release-beast': hunt.releaseBeast,
  'hunt:hunt-release-beast:up': hunt.releaseBeastUpgraded,
  'hunt:hunt-slash': hunt.slash,
  'hunt:hunt-slash:up': hunt.slashUpgraded,
  'hunt:hunt-pounce': hunt.pounce,
  'hunt:hunt-pounce:up': hunt.pounceUpgraded,
  'hunt:hunt-roar': hunt.roar,
  'hunt:hunt-roar:up': hunt.roarUpgraded,
  'hunt:hunt-grapple': hunt.grapple,
  'hunt:hunt-grapple:up': hunt.grappleUpgraded,
  'hunt:hunt-blood-scent': hunt.bloodScent,
  'hunt:hunt-blood-scent:up': hunt.bloodScentUpgraded,
  'hunt:hunt-hybrid-shotgun': hunt.hybridShotgun,
  'hunt:hunt-hybrid-shotgun:up': hunt.hybridShotgunUpgraded,
  'hunt:hunt-roll': hunt.roll,
  'hunt:hunt-roll:up': hunt.rollUpgraded,
  'hunt:hunt-hook': hunt.hook,
  'hunt:hunt-hook:up': hunt.hookUpgraded,
  'hunt:hunt-adrenaline': hunt.adrenaline,
  'hunt:hunt-adrenaline:up': hunt.adrenalineUpgraded,
  'hunt:hunt-give-in': hunt.giveIn,
  'hunt:hunt-give-in:up': hunt.giveInUpgraded,

  // ── Time (element id `sand`) ──
  'sand:time-barrage': sand.quickShot,
  'sand:time-barrage:up': sand.quickShotUpgraded,
  'sand:time-warp': sand.lasso,
  'sand:time-warp:up': sand.lassoUpgraded,
  'sand:time-remain': sand.remain,
  'sand:time-remain:up': sand.remainUpgraded,
  'sand:time-halt': sand.bounty,
  'sand:time-halt:up': sand.bountyUpgraded,
  'sand:time-timeless': sand.alwaysNoon,
  'sand:time-timeless:up': sand.alwaysNoonUpgraded,

  // ── Gravity ──
  'gravity:space-slash': gravity.spaceSlash,
  'gravity:space-slash:up': gravity.spaceSlashUpgraded,
  'gravity:meteor-rain': gravity.meteorRain,
  'gravity:meteor-rain:up': gravity.meteorRainUpgraded,
  'gravity:space-slam': gravity.spaceSlam,
  'gravity:space-slam:up': gravity.spaceSlamUpgraded,
  'gravity:grav-bomb': gravity.gravBomb,
  'gravity:grav-bomb:up': gravity.gravBombUpgraded,
  'gravity:lunar-landing': gravity.lunarLanding,
  'gravity:lunar-landing:up': gravity.lunarLandingUpgraded,

  // ── Creation ──
  'creation:dagger-spray': creation.daggerSpray,
  'creation:dagger-spray:up': creation.daggerSprayUpgraded,
  'creation:charged-bolt': creation.chargedBolt,
  'creation:charged-bolt:up': creation.chargedBoltUpgraded,
  'creation:wrench-plans': creation.wrenchPlans,
  'creation:wrench-plans:up': creation.wrenchPlansUpgraded,
  'creation:creation-block': creation.createBlock,
  'creation:creation-block:up': creation.createBlockUpgraded,
  'creation:maze-of-doom': creation.workshop,
  'creation:maze-of-doom:up': creation.workshopUpgraded,

  // ── Electricity ──
  'electricity:electro-ball': electricity.electroBall,
  'electricity:electro-ball:up': electricity.electroBallUpgraded,
  'electricity:electro-dash': electricity.electroDash,
  'electricity:electro-dash:up': electricity.electroDashUpgraded,
  'electricity:kinetic-discharge': electricity.kineticDischarge,
  'electricity:kinetic-discharge:up': electricity.kineticDischargeUpgraded,
  'electricity:pain-battery': electricity.painBattery,
  'electricity:pain-battery:up': electricity.painBatteryUpgraded,
  'electricity:restart': electricity.restart,
  'electricity:restart:up': electricity.restartUpgraded,

  // ── Acid (slime) ──
  'slime:poison-whip': slime.poisonWhip,
  'slime:poison-whip:up': slime.poisonWhipUpgraded,
  'slime:vile-spray': slime.vileSpray,
  'slime:vile-spray:up': slime.vileSprayUpgraded,
  'slime:snake-burrow': slime.snakeBurrow,
  'slime:snake-burrow:up': slime.snakeBurrowUpgraded,
  'slime:purge': slime.purge,
  'slime:purge:up': slime.purgeUpgraded,
  'slime:acid-apocalypse': slime.acidApocalypse,
  'slime:acid-apocalypse:up': slime.acidApocalypseUpgraded,

  // ── Light ──
  'light:light-lance': light.lightLance,
  'light:light-lance:up': light.lightLanceUpgraded,
  'light:blink': light.blink,
  'light:blink:up': light.blinkUpgraded,
  'light:prism-ramp': light.prismRamp,
  'light:prism-ramp:up': light.prismRampUpgraded,
  'light:light-trick': light.lightTrick,
  'light:light-trick:up': light.lightTrickUpgraded,
  'light:speed-o-light': light.speedOLight,
  'light:speed-o-light:up': light.speedOLightUpgraded,

  // ── Magnet ──
  'magnet:mag-pulse': magnet.magPulse,
  'magnet:mag-pulse:up': magnet.magPulseUpgraded,
  'magnet:nail-implant': magnet.nailImplant,
  'magnet:nail-implant:up': magnet.nailImplantUpgraded,
  'magnet:magnetize': magnet.magnetize,
  'magnet:magnetize:up': magnet.magnetizeUpgraded,
  'magnet:protect': magnet.protect,
  'magnet:protect:up': magnet.protectUpgraded,
  'magnet:atom-smasher': magnet.atomSmasher,
  'magnet:atom-smasher:up': magnet.atomSmasherUpgraded,

  // ── Metal ──
  'metal:metal-slash': metal.metalSlash,
  'metal:metal-slash:up': metal.metalSlashUpgraded,
  'metal:metal-flail-craft': metal.flailCraft,
  'metal:metal-flail-craft:up': metal.flailCraftUpgraded,
  'metal:metal-blood-transfusion': metal.bloodTransfusion,
  'metal:metal-blood-transfusion:up': metal.bloodTransfusionUpgraded,
  'metal:metal-chain-tether': metal.chainTether,
  'metal:metal-chain-tether:up': metal.chainTetherUpgraded,
  'metal:metal-clot-armor': metal.clotArmor,
  'metal:metal-clot-armor:up': metal.clotArmorUpgraded,

  // ── Plasma ──
  'plasma:plasma-burst': plasma.plasmaBurst,
  'plasma:plasma-burst:up': plasma.plasmaBurstUpgraded,
  'plasma:plasma-arena': plasma.unstableArena,
  'plasma:plasma-arena:up': plasma.unstableArenaUpgraded,
  'plasma:plasma-current': plasma.plasmaCurrent,
  'plasma:plasma-current:up': plasma.plasmaCurrentUpgraded,
  'plasma:plasma-chaos-blades': plasma.chaosBlades,
  'plasma:plasma-chaos-blades:up': plasma.chaosBladesUpgraded,
  'plasma:plasma-pure-chaos': plasma.pureChaos,
  'plasma:plasma-pure-chaos:up': plasma.pureChaosUpgraded,

  // ── Gunpowder ──
  'gunpowder:gunpowder-musket-shot': gunpowder.musketShot,
  'gunpowder:gunpowder-musket-shot:up': gunpowder.musketShotUpgraded,
  'gunpowder:gunpowder-explosive-retreat': gunpowder.explosiveRetreat,
  'gunpowder:gunpowder-explosive-retreat:up': gunpowder.explosiveRetreatUpgraded,
  'gunpowder:gunpowder-fire-at-will': gunpowder.fireAtWill,
  'gunpowder:gunpowder-fire-at-will:up': gunpowder.fireAtWillUpgraded,
  'gunpowder:gunpowder-arsenal-expansion': gunpowder.arsenalExpansion,
  'gunpowder:gunpowder-arsenal-expansion:up': gunpowder.arsenalExpansionUpgraded,
  'gunpowder:gunpowder-blunderblast': gunpowder.blunderBlast,
  'gunpowder:gunpowder-blunderblast:up': gunpowder.blunderBlastUpgraded,

  // ── Magic ──
  'magic:magic-sparkle-shot': magic.sparkleShot,
  'magic:magic-sparkle-shot:up': magic.sparkleShotUpgraded,
  'magic:magic-grimoire': magic.grimoire,
  'magic:magic-grimoire:up': magic.grimoireUpgraded,
  'magic:magic-anchor': magic.magicAnchor,
  'magic:magic-anchor:up': magic.magicAnchorUpgraded,
  'magic:magic-meditate': magic.meditate,
  'magic:magic-meditate:up': magic.meditateUpgraded,
  'magic:magic-necronomicon': magic.necronomicon,
  'magic:magic-necronomicon:up': magic.necronomiconUpgraded,

  // ── Dream ──
  'dream:dream-trance': dream.trance,
  'dream:dream-pillow-fight': dream.pillowFight,
  'dream:dream-dreamcatcher': dream.dreamcatcher,
  'dream:dream-nightmare': dream.nightmare,
  'dream:dream-oasis': dream.oasis,
  'dream:dream-haunt': dream.haunt,
  'dream:dream-spirit-tear': dream.spiritTear,
  'dream:mastery:dream-duel': dream.dreamDuel,
  'dream:mastery:lifelong-dream': dream.lifelongDream,

  // ── Psychic ──
  'psychic:psychic-headache': psychic.headache,
  'psychic:psychic-headache:up': psychic.headacheUpgraded,
  'psychic:psychic-mind-control': psychic.mindControl,
  'psychic:psychic-mind-control:up': psychic.mindControlUpgraded,
  'psychic:psychic-dodge-destiny': psychic.dodgeDestiny,
  'psychic:psychic-dodge-destiny:up': psychic.dodgeDestinyUpgraded,
  'psychic:psychic-migraine': psychic.migraine,
  'psychic:psychic-migraine:up': psychic.migraineUpgraded,
  'psychic:psychic-coma': psychic.coma,
  'psychic:psychic-coma:up': psychic.comaUpgraded,

  // ── Radiation ──
  'radiation:radiation-railgun': radiation.railgun,
  'radiation:radiation-railgun:up': radiation.railgunUpgraded,
  'radiation:radiation-baton': radiation.baton,
  'radiation:radiation-baton:up': radiation.batonUpgraded,
  'radiation:radiation-xray': radiation.xray,
  'radiation:radiation-xray:up': radiation.xrayUpgraded,
  'radiation:radiation-waste': radiation.waste,
  'radiation:radiation-waste:up': radiation.wasteUpgraded,
  'radiation:radiation-extermination': radiation.extermination,
  'radiation:radiation-extermination:up': radiation.exterminationUpgraded,

  // ── Magma ──
  'magma:magma-plume': magma.plume,
  'magma:magma-volcano': magma.volcano,
  'magma:magma-bloat': magma.bloat,
  'magma:magma-jet': magma.jet,
  'magma:magma-dragon-kin': magma.dragonKin,

  // ── Sand (dune) ──
  'dune:dune-striker': dune.striker,
  'dune:dune-ruins': dune.ruins,
  'dune:dune-pyramid': dune.pyramid,
  'dune:dune-sandwalk': dune.sandwalk,
  'dune:dune-final-trail': dune.finalTrail,

  // ── Fortune ──
  'fortune:fortune-fire': fortune.openFire,
  'fortune:fortune-fire:up': fortune.openFireUpgraded,
  'fortune:fortune-safe': fortune.safeInvestment,
  'fortune:fortune-safe:up': fortune.safeInvestmentUpgraded,
  'fortune:fortune-risky': fortune.riskyInvestment,
  'fortune:fortune-risky:up': fortune.riskyInvestmentUpgraded,
  'fortune:fortune-paywall': fortune.paywall,
  'fortune:fortune-paywall:up': fortune.paywallUpgraded,
  'fortune:fortune-p2w': fortune.payToWin,
  'fortune:fortune-p2w:up': fortune.payToWinUpgraded,

  // ── Marrow ──
  'marrow:marrow-antibody': marrow.antiBodyBlast,
  'marrow:marrow-antibody:up': marrow.antiBodyBlastUpgraded,
  'marrow:marrow-macrosma': marrow.macrosma,
  'marrow:marrow-macrosma:up': marrow.macrosmaUpgraded,
  'marrow:marrow-neutralize': marrow.neutralize,
  'marrow:marrow-neutralize:up': marrow.neutralizeUpgraded,
  'marrow:marrow-dendricles': marrow.dendricles,
  'marrow:marrow-dendricles:up': marrow.dendriclesUpgraded,
  'marrow:marrow-mastacre': marrow.mastacre,
  'marrow:marrow-mastacre:up': marrow.mastacreUpgraded,

  // ── Justice ── (ground five, then the flight five)
  'justice:justice-stab': justice.stab,
  'justice:justice-coliseum': justice.coliseum,
  'justice:justice-sheer-will': justice.sheerWill,
  'justice:justice-flight': justice.flight,
  'justice:justice-judgement-day': justice.judgementDay,
  'justice:justice-spear-throw': justice.spearThrow,
  'justice:justice-bind': justice.bind,
  'justice:justice-pillar': justice.pillar,
  'justice:justice-descend': justice.descend,
  'justice:justice-seraphim': justice.seraphim,
  'justice:mastery:combo-excelsius': justice.comboExcelsius,
  'justice:mastery:vigilante-vengeance': justice.vigilanteVengeance,

  // ── Gluttony ── (the chef's five, then the butcher's)
  'gluttony:glut-knife': gluttony.knife,
  'gluttony:glut-forage': gluttony.forage,
  'gluttony:glut-charcoal': gluttony.charcoal,
  'gluttony:glut-butcher': gluttony.butcher,
  'gluttony:glut-feast': gluttony.feast,
  'gluttony:glut-cleave': gluttony.cleave,
  'gluttony:glut-poach': gluttony.poach,
  'gluttony:glut-cannibalize': gluttony.cannibalize,
  'gluttony:glut-return': gluttony.returnToKitchen,
  'gluttony:glut-maw': gluttony.mawAwakening,
  // Gluttony's five upgrades each buy two abilities, so each one owns two upgraded loops:
  // the chef's half and the butcher's.
  'gluttony:glut-knife:up': gluttony.knifeUp,
  'gluttony:glut-forage:up': gluttony.forageUp,
  'gluttony:glut-charcoal:up': gluttony.charcoalUp,
  'gluttony:glut-butcher:up': gluttony.butcherUp,
  'gluttony:glut-feast:up': gluttony.feastUp,
  'gluttony:glut-cleave:up': gluttony.cleaveUp,
  'gluttony:glut-poach:up': gluttony.poachUp,
  'gluttony:glut-cannibalize:up': gluttony.cannibalizeUp,
  'gluttony:glut-return:up': gluttony.returnUp,
  'gluttony:glut-maw:up': gluttony.mawAwakeningUp,

  // ── Quantum (the Third State's five; the bond itself is in the passives) ──
  'quantum:quantum-splicers': quantum.splicers,
  'quantum:quantum-ability-split': quantum.abilitySplit,
  'quantum:quantum-arena-split': quantum.arenaSplit,
  'quantum:quantum-effect-split': quantum.effectSplit,
  'quantum:quantum-parasite': quantum.parasite,

  // ── Illusion ──
  'illusion:illusion-crack-shot': illusion.crackShot,
  'illusion:illusion-crack-shot:up': illusion.crackShotUpgraded,
  'illusion:illusion-veil': illusion.veil,
  'illusion:illusion-veil:up': illusion.veilUpgraded,
  'illusion:illusion-relocate': illusion.relocate,
  'illusion:illusion-relocate:up': illusion.relocateUpgraded,
  'illusion:illusion-tesseract': illusion.tesseract4d,
  'illusion:illusion-tesseract:up': illusion.tesseractUpgraded,
  'illusion:illusion-dance': illusion.dance,
  'illusion:illusion-dance:up': illusion.danceUpgraded,

  // ── Passion ──
  'passion:passion-loveshot': passion.loveshot,
  'passion:passion-loveshot:up': passion.loveshotUpgraded,
  'passion:passion-flirt': passion.flirt,
  'passion:passion-flirt:up': passion.flirtUpgraded,
  'passion:passion-smooch': passion.smooch,
  'passion:passion-smooch:up': passion.smoochUpgraded,
  'passion:passion-manipulate': passion.manipulate,
  'passion:passion-manipulate:up': passion.manipulateUpgraded,
  'passion:passion-exhibition': passion.exhibition,
  'passion:passion-exhibition:up': passion.exhibitionUpgraded,

  // ── Ruin ──
  'ruin:ruin-shred': ruin.shred,
  'ruin:ruin-shred:up': ruin.shredUpgraded,
  'ruin:ruin-lockdown': ruin.lockdown,
  'ruin:ruin-lockdown:up': ruin.lockdownUpgraded,
  'ruin:ruin-skewer': ruin.skewer,
  'ruin:ruin-skewer:up': ruin.skewerUpgraded,
  'ruin:ruin-spikes': ruin.spikes,
  'ruin:ruin-spikes:up': ruin.spikesUpgraded,
  'ruin:ruin-decay': ruin.decay,
  'ruin:ruin-decay:up': ruin.decayUpgraded,

  // ── Chalk ──
  'chalk:chalk-ward': chalk.ward,
  'chalk:chalk-ward:up': chalk.wardUpgraded,
  'chalk:chalk-explosive': chalk.explosive,
  'chalk:chalk-explosive:up': chalk.explosiveUpgraded,
  'chalk:chalk-perma': chalk.perma,
  'chalk:chalk-perma:up': chalk.permaUpgraded,
  'chalk:chalk-shield': chalk.shield,
  'chalk:chalk-shield:up': chalk.shieldUpgraded,
  'chalk:chalk-masterpiece': chalk.masterpiece,
  'chalk:chalk-masterpiece:up': chalk.masterpieceUpgraded,

  // ── Bind ──
  'bind:bind-summon': bind.summon,
  'bind:bind-summon:up': bind.summonUpgraded,
  'bind:bind-shards': bind.shards,
  'bind:bind-shards:up': bind.shardsUpgraded,
  'bind:bind-idol': bind.idol,
  'bind:bind-idol:up': bind.idolUpgraded,
  'bind:bind-protection': bind.protection,
  'bind:bind-protection:up': bind.protectionUpgraded,
  'bind:bind-treachery': bind.treachery,
  'bind:bind-treachery:up': bind.treacheryUpgraded,

  // ── Depths ──
  'depths:depths-piranha': depths.piranha,
  'depths:depths-piranha:up': depths.piranhaUpgraded,
  'depths:depths-lungfish': depths.lungfish,
  'depths:depths-lungfish:up': depths.lungfishUpgraded,
  'depths:depths-eutrophication': depths.eutrophication,
  'depths:depths-eutrophication:up': depths.eutrophicationUpgraded,
  'depths:depths-angler': depths.angler,
  'depths:depths-angler:up': depths.anglerUpgraded,
  'depths:depths-megalodon': depths.megalodon,
  'depths:depths-megalodon:up': depths.megalodonUpgraded,

  // ── Slime (id `gum`) ──
  'gum:gum-grab': gum.grab,
  'gum:gum-grab:up': gum.grabUpgraded,
  'gum:gum-surge': gum.surge,
  'gum:gum-surge:up': gum.surgeUpgraded,
  'gum:gum-gumball': gum.gumball,
  'gum:gum-gumball:up': gum.gumballUpgraded,
  'gum:gum-oozorbtion': gum.oozorbtion,
  'gum:gum-oozorbtion:up': gum.oozorbtionUpgraded,
  'gum:gum-solidify': gum.solidify,
  'gum:gum-solidify:up': gum.solidifyUpgraded,

  // ── Paper ──
  'paper:paper-storybook': paper.storybook,
  'paper:paper-storybook:up': paper.storybookUpgraded,
  'paper:paper-plane': paper.paperPlane,
  'paper:paper-plane:up': paper.paperPlaneUpgraded,
  'paper:paper-shuriken': paper.paperShuriken,
  'paper:paper-shuriken:up': paper.paperShurikenUpgraded,
  'paper:paper-mache': paper.macheMonsters,
  'paper:paper-mache:up': paper.macheMonstersUpgraded,
  'paper:paper-climax': paper.climax,
  'paper:paper-climax:up': paper.climaxUpgraded,

  // ── Death ──
  'death:death-styx': death.styxShurikens,
  'death:death-styx:up': death.styxShurikensUpgraded,
  'death:death-disarm': death.disarm,
  'death:death-disarm:up': death.disarmUpgraded,
  'death:death-riposte': death.riposte,
  'death:death-riposte:up': death.riposteUpgraded,
  'death:death-amputate': death.amputate,
  'death:death-amputate:up': death.amputateUpgraded,
  'death:death-deal': death.dealWithDeath,
  'death:death-deal:up': death.dealWithDeathUpgraded,

  // ── Echo ──
  'echo:echo-shot': echo.echolocation,
  'echo:echo-shot:up': echo.echolocationUpgraded,
  'echo:echo-guess': echo.guess,
  'echo:echo-guess:up': echo.guessUpgraded,
  'echo:echo-lantern': echo.lantern,
  'echo:echo-lantern:up': echo.lanternUpgraded,
  'echo:echo-bat': echo.batForm,
  'echo:echo-bat:up': echo.batFormUpgraded,
  'echo:echo-eclipse': echo.totalEclipse,
  'echo:echo-eclipse:up': echo.totalEclipseUpgraded,

  // ── Subterfuge ──
  'subterfuge:sub-cutter': subterfuge.cutter,
  'subterfuge:sub-cutter:up': subterfuge.cutterUpgraded,
  'subterfuge:sub-spray': subterfuge.spray,
  'subterfuge:sub-spray:up': subterfuge.sprayUpgraded,
  'subterfuge:sub-recruit': subterfuge.recruit,
  'subterfuge:sub-recruit:up': subterfuge.recruitUpgraded,
  'subterfuge:sub-bribe': subterfuge.bribe,
  'subterfuge:sub-bribe:up': subterfuge.bribeUpgraded,
  'subterfuge:sub-treachery': subterfuge.treachery,
  'subterfuge:sub-treachery:up': subterfuge.treacheryUpgraded,

  // ── Rubber ──
  'rubber:rubber-punch': rubber.punch,
  'rubber:rubber-punch:up': rubber.punchUpgraded,
  'rubber:rubber-sling': rubber.sling,
  'rubber:rubber-sling:up': rubber.slingUpgraded,
  'rubber:rubber-bounce-form': rubber.bounceForm,
  'rubber:rubber-bounce-form:up': rubber.bounceFormUpgraded,
  'rubber:rubber-band': rubber.band,
  'rubber:rubber-band:up': rubber.bandUpgraded,
  'rubber:rubberage': rubber.rubberage,
  'rubber:rubberage:up': rubber.rubberageUpgraded,

  // ── Fate ──
  'fate:fate-card-throw': fate.cardThrow,
  'fate:fate-card-throw:up': fate.cardThrowUpgraded,
  'fate:fate-reroll': fate.reroll,
  'fate:fate-reroll:up': fate.rerollUpgraded,
  'fate:fate-preserve': fate.preserve,
  'fate:fate-preserve:up': fate.preserveUpgraded,
  'fate:fate-enchant': fate.enchant,
  'fate:fate-enchant:up': fate.enchantUpgraded,
  'fate:fate-all-in': fate.allIn,
  'fate:fate-all-in:up': fate.allInUpgraded,

  // ── Sound ──
  'sound:staccato': sound.staccato,
  'sound:staccato:up': sound.staccatoUpgraded,
  'sound:disc-dice': sound.discDice,
  'sound:disc-dice:up': sound.discDiceUpgraded,
  'sound:boombox': sound.boombox,
  'sound:boombox:up': sound.boomboxUpgraded,
  'sound:bugle': sound.bugle,
  'sound:bugle:up': sound.bugleUpgraded,
  'sound:coda': sound.coda,
  'sound:coda:up': sound.codaUpgraded,

  // ── Technology ──
  'technology:tech-cruncher': technology.cruncher,
  'technology:tech-cruncher:up': technology.cruncherUpgraded,
  'technology:tech-ads': technology.ads,
  'technology:tech-ads:up': technology.adsUpgraded,
  'technology:tech-upload': technology.upload,
  'technology:tech-upload:up': technology.uploadUpgraded,
  'technology:tech-webdrag': technology.webDrag,
  'technology:tech-webdrag:up': technology.webDragUpgraded,
  'technology:tech-admin': technology.admin,
  'technology:tech-admin:up': technology.adminUpgraded,

  // ── Conquest ──
  'conquest:conquest-banner': conquest.banner,
  'conquest:conquest-banner:up': conquest.bannerUpgraded,
  'conquest:conquest-barracks': conquest.barracks,
  'conquest:conquest-barracks:up': conquest.barracksUpgraded,
  'conquest:conquest-turret': conquest.turret,
  'conquest:conquest-turret:up': conquest.turretUpgraded,
  'conquest:conquest-barricade': conquest.barricade,
  'conquest:conquest-barricade:up': conquest.barricadeUpgraded,
  'conquest:conquest-expansion': conquest.expansion,
  'conquest:conquest-expansion:up': conquest.expansionUpgraded,
  'silence:silence-stab': silence.stab,
  'silence:silence-stab:up': silence.stabUpgraded,
  'silence:silence-watch': silence.watch,
  'silence:silence-watch:up': silence.watchUpgraded,
  'silence:silence-ritual': silence.ritual,
  'silence:silence-ritual:up': silence.ritualUpgraded,
  'silence:silence-feast': silence.feast,
  'silence:silence-feast:up': silence.feastUpgraded,
  'silence:silence-run': silence.run,
  'silence:silence-run:up': silence.runUpgraded,

  // ── Passives ──
  'air:passive:wind-dodge': subj.airWindDodge,
  'air:passive:momentum': subj.airMomentum,
  'life:passive:the-garden': subj.lifeTheGarden,
  'earth:passive:the-shield': subj.earthShieldPassive,
  'ice:passive:frost-stacks': ice.passiveFrostStacks,
  'ice:passive:shatter-the-shell': ice.passiveShatterTheShell,
  'shadow:passive:hopelessness': shadow.passiveHopelessness,
  'shadow:passive:shadow-pools': shadow.passiveShadowPools,
  'oil:passive:the-drone-swarm': oil.passiveDroneSwarm,
  'oil:passive:oil-puddles-and-oily': oil.passiveOilPuddles,
  'growth:passive:dna': growth.passiveDna,
  'growth:passive:infection': growth.passiveInfection,
  'crystal:passive:compounding-bounces': crystal.passiveBounces,
  'soul:passive:the-corpse-queue': soul.passiveCorpseQueue,
  'soul:passive:amalgams': soul.passiveAmalgams,
  'hunt:passive:buried-bolts': hunt.passiveBuriedBolts,
  'hunt:passive:the-beast-s-body': hunt.passiveBeastBody,
  'hunt:passive:possession': hunt.passivePossession,
  'sand:passive:the-bounty': sand.passiveBounty,
  'sand:passive:time-puddles': sand.passivePuddles,
  'sand:passive:time-energy': sand.passiveEnergy,
  'creation:passive:the-nexus': creation.passiveNexus,
  'creation:passive:the-six-brews': creation.passiveBrews,
  'electricity:passive:kinetic-power': electricity.passiveKineticPower,
  'slime:passive:acid-pools': slime.passiveAcidPools,
  'slime:passive:acid-coverage': slime.passiveAcidCoverage,
  'light:passive:the-acceleration-meter': light.passiveAccelMeter,
  'magnet:passive:the-rods': magnet.passiveTheRods,
  'metal:passive:the-blood-bar': metal.passiveBloodBar,
  'metal:passive:aggressive-bleeding': metal.passiveAggressiveBleeding,
  'plasma:passive:it-hits-you-too': plasma.passiveItHitsYouToo,
  'plasma:passive:chaos': plasma.passiveChaos,
  'gunpowder:passive:three-muskets': gunpowder.passiveThreeMuskets,
  'gunpowder:passive:the-arsenal': gunpowder.passiveTheArsenal,
  'magic:passive:the-spell-wheel': magic.passiveTheSpellWheel,
  'magic:passive:darkness': magic.passiveDarkness,
  'dream:passive:sleepiness': dream.passiveSleepiness,
  'dream:passive:cosmic-cursor': dream.passiveCosmicCursor,
  'dream:passive:rest': dream.passiveRest,
  'psychic:passive:opened-eyes': psychic.openedEyes,
  'psychic:passive:stress': psychic.stress,
  'psychic:mastery:predictors-snare': psychic.masterySnare,
  'psychic:mastery:utter-focus': psychic.masteryUtterFocus,
  'radiation:passive:critical-mission': radiation.criticalMission,
  'radiation:passive:irradiated': radiation.irradiated,
  'magma:passive:pressure': magma.pressure,
  'magma:passive:lava-on-the-floor': magma.lavaOnTheFloor,
  'magma:mastery:obsidian-coat': magma.masteryObsidianCoat,
  'magma:mastery:magma-saw': magma.masteryMagmaSaw,
  'dune:passive:the-jump': dune.theJump,
  'dune:passive:courses-and-falling': dune.coursesAndFalling,
  'fortune:passive:blood-coins': fortune.bloodCoins,
  'fortune:passive:the-stall': fortune.theStall,
  'fortune:passive:the-catalogue': fortune.theCatalogue,
  'fortune:mastery:battle-pass': fortune.masteryBattlePass,
  'fortune:mastery:drive-by-flex': fortune.masteryDriveByFlex,
  'marrow:passive:the-bone-bar': marrow.theBoneBar,
  'marrow:passive:inflammation': marrow.inflammation,
  'justice:passive:willpower': justice.willpower,
  'justice:passive:two-stances': justice.twoStances,
  'gluttony:passive:the-larder': gluttony.theLarder,
  'gluttony:passive:the-grill': gluttony.theGrill,
  'gluttony:passive:the-prep-strip': gluttony.thePrepStrip,
  'gluttony:passive:the-maw': gluttony.theMaw,
  'gluttony:passive:the-hunger-bar': gluttony.theHungerBar,
  'gluttony:mastery:snacking': gluttony.masterySnacking,
  'gluttony:mastery:chefs-friend': gluttony.masteryChefsFriend,
  'quantum:passive:bonded': quantum.bonded,
  'quantum:passive:collapse': quantum.collapse,
  'quantum:passive:quantum-instability': quantum.instability,
  'quantum:passive:torn-collapse': quantum.tornCollapse,
  'illusion:passive:never-quite-there': illusion.neverQuiteThere,
  'illusion:passive:folded': illusion.folded,
  'illusion:mastery:reality-shift': illusion.masteryRealityShift,
  'illusion:mastery:masquerade': illusion.masteryMasquerade,
  'dune:mastery:unsatiable': dune.masteryUnsatiable,
  'dune:mastery:tempered-temptation': dune.masteryTemperedTemptation,
  'passion:passive:the-love-bar': passion.theLoveBar,
  'passion:passive:the-three-stages': passion.theThreeStages,
  'passion:mastery:attraction': passion.masteryAttraction,
  'passion:mastery:perfume': passion.masteryPerfume,
  'ruin:mastery:combo-breaker': ruin.masteryComboBreaker,
  'ruin:mastery:second-skin': ruin.masterySecondSkin,
  'radiation:mastery:snipers-instinct': radiation.masteryInstinct,
  'radiation:mastery:gamma-tether': radiation.masteryTether,
  'ruin:passive:rust': ruin.rust,
  'ruin:passive:nothing-comes-back': ruin.nothingComesBack,
  'chalk:passive:the-drawing-window': chalk.theDrawingWindow,
  'chalk:passive:standing-on-it': chalk.standingOnIt,
  'chalk:mastery:chalk-smudge': chalk.masteryChalkSmudge,
  'chalk:mastery:living-chalk': chalk.masteryLivingChalk,
  'bind:mastery:vessel-of-the-broken-god': bind.masteryVessel,
  'bind:mastery:ritual-sacrifice': bind.masteryRitual,
  'bind:passive:the-patron': bind.thePatron,
  'bind:passive:the-turning': bind.theTurning,
  'depths:passive:the-anglerfish': depths.theAnglerfish,
  'depths:passive:feeding-frenzy': depths.feedingFrenzy,
  'depths:mastery:camo-fade': depths.masteryCamoFade,
  'depths:mastery:release-the-kraken': depths.masteryReleaseTheKraken,
  'gum:passive:the-hand': gum.theHand,
  'gum:passive:the-smack': gum.theSmack,
  'gum:mastery:slime-split': gum.masterySplit,
  'gum:mastery:oobleck': gum.masteryOobleck,
  'paper:passive:the-journal': paper.theJournal,
  'paper:passive:the-shelf': paper.theShelf,
  'paper:mastery:spirit-of-the-story': paper.masterySpirit,
  'paper:mastery:restructure': paper.masteryRestructure,
  'death:passive:midnight': death.midnight,
  'death:passive:nothing-is-damage': death.nothingIsDamage,
  'death:mastery:inevitability': death.masteryInevitability,
  'death:mastery:delay-the-inevitable': death.masteryDelay,
  'echo:passive:the-dark': echo.theDark,
  'echo:passive:psychic-eyes': echo.psychicEye,
  'subterfuge:passive:dirty-money': subterfuge.dirtyMoney,
  'subterfuge:passive:kickbacks': subterfuge.kickbacks,
  'rubber:passive:stored-tension': rubber.storedTension,
  'fate:passive:the-hand': fate.theHand,
  'fate:passive:the-deck': fate.theDeck,
  'sound:passive:the-metronome': sound.theMetronome,
  'sound:passive:the-bank': sound.theBank,
  'technology:passive:the-cruncher-streak': technology.theCruncherStreak,
  'technology:passive:two-screens': technology.twoScreens,
  'conquest:passive:the-board': conquest.theBoard,
  'conquest:passive:authority': conquest.authorityPassive,
  'conquest:passive:one-path-only': conquest.onePathOnly,
  'conquest:mastery:dictatorship': conquest.masteryDictatorship,
  'conquest:mastery:market': conquest.masteryMarket,
  'silence:passive:the-fog': silence.theFog,
  'silence:passive:silenced': silence.silenced,
  'silence:passive:the-rear-arc': silence.theRearArc,

  // ── Perks ──
  'fire:perk:alcohol': subj.firePerkAlcohol,
  'water:perk:stalagmite': subj.waterPerkStalagmite,
  'life:perk:mycology': subj.lifePerkMycology,
  'air:perk:hawk': subj.airPerkHawk,
  'earth:perk:obsidian': subj.earthPerkObsidian,
  'ice:perk:rink': ice.perkRink,
  'ice:perk:snow': ice.perkSnow,
  'shadow:perk:void-shade': shadow.perkVoidShade,
  'shadow:perk:plume': shadow.perkString,
  'shadow:perk:death': shadow.perkDeath,
  'oil:perk:bio-fuel': oil.perkBioFuel,
  'oil:perk:gasoline': oil.perkGasoline,
  'growth:perk:virus': growth.perkVirus,
  'crystal:perk:gateway': crystal.perkGateway,
  'soul:perk:ward': soul.perkWard,
  'soul:perk:call-of-the-void': soul.perkCallOfTheVoid,
  'hunt:perk:rage': hunt.perkRage,
  'hunt:perk:hell': hunt.perkHell,
  'sand:perk:purge': sand.perkPurge,
  'gravity:perk:quake': gravity.perkQuake,
  'creation:perk:automaton': creation.perkAutomaton,
  'electricity:perk:phoenix': electricity.perkPhoenix,
  'light:perk:flicker': light.perkFlicker,
  'magnet:perk:blade': magnet.perkBlade,
  'metal:perk:gunpowder': metal.perkExsanguinate,
  'plasma:perk:solar': plasma.perkSolar,
  'gunpowder:perk:corruption': gunpowder.perkCorruption,
  'gunpowder:perk:demon': gunpowder.perkDemon,
  'magic:perk:thunder': magic.perkThunder,
  'magic:perk:decay': magic.perkDecay,

  'echo:perk:beacon': echo.perkBeacon,
  'subterfuge:perk:sonic-boom': subterfuge.perkSonicBoom,
  'rubber:perk:uber-gear': rubber.perkUberGear,
  'fate:perk:paper': fate.perkPaper,
  'sound:perk:harmony': sound.perkHarmony,
  'technology:perk:adrenaline': technology.perkAdrenaline,
  'silence:perk:torture': silence.perkTorture,

  // ── Mastery ──
  'fire:mastery:burning-body': subj.fireMasteryBurningBody,
  'fire:mastery:heatwave': subj.fireMasteryHeatwave,
  'water:mastery:slipstream': subj.waterMasterySlipstream,
  'water:mastery:siphon': subj.waterMasterySiphon,
  'life:mastery:thorn-thrash': subj.lifeMasteryThornThrash,
  'life:mastery:reap': subj.lifeMasteryReap,
  'air:mastery:dancers-momentum': subj.airMasteryDancersMomentum,
  'air:mastery:winds-of-change': subj.airMasteryWindsOfChange,
  'earth:mastery:unbreakable': subj.earthMasteryUnbreakable,
  'earth:mastery:dust-screen': subj.earthMasteryDustScreen,
  'ice:mastery:viral-frost': ice.masteryViralFrost,
  'ice:mastery:icicle-impale': ice.masteryIcicleImpale,
  'ice:mastery:curling-stone': ice.masteryCurlingStone,
  'shadow:mastery:shared-suffering': shadow.masterySharedSuffering,
  'shadow:mastery:shadow-beacon': shadow.masteryShadowBeacon,
  'oil:mastery:drone-array': oil.masteryDroneArray,
  'oil:mastery:turret': oil.masteryTurret,
  'growth:mastery:secret-upgrades': growth.masterySecretUpgrades,
  'growth:mastery:syringe-shot': growth.masterySyringeShot,
  'crystal:mastery:resonance': crystal.masteryResonance,
  'crystal:mastery:crystal-shredder': crystal.masteryCrystalShredder,
  'soul:mastery:strength-in-numbers': soul.masteryStrengthInNumbers,
  'soul:mastery:grave-mistake': soul.masteryGraveMistake,
  'hunt:mastery:weak-points': hunt.masteryWeakPoints,
  'hunt:mastery:beastling': hunt.masteryBeastling,
  'sand:mastery:passive-manipulation': sand.masteryPassiveManipulation,
  'sand:mastery:time-bomb': sand.masteryTimeBomb,
  'gravity:mastery:gravity-aura': gravity.masteryGravityAura,
  'gravity:mastery:starfall': gravity.masteryStarfall,
  'creation:mastery:springboard': creation.masterySpringboard,
  'creation:mastery:mortar-command': creation.masteryMortarCommand,
  'electricity:mastery:kinetic-shield': electricity.masteryKineticShield,
  'electricity:mastery:kinetic-bomb': electricity.masteryKineticBomb,
  'slime:mastery:acid-walker': slime.masteryAcidWalker,
  'slime:mastery:breakdown': slime.masteryBreakdown,
  'light:mastery:unstoppable': light.masteryUnstoppable,
  'light:mastery:killer-kebab': light.masteryKillerKebab,
  'magnet:mastery:metal-detector': magnet.masteryMetalDetector,
  'magnet:mastery:mag-lev': magnet.masteryMagLev,
  'metal:mastery:natural-clot': metal.masteryNaturalClot,
  'metal:mastery:steel-shield': metal.masterySteelShield,
  'plasma:mastery:chaos-storm': plasma.masteryChaosStorm,
  'plasma:mastery:unstable-orbital': plasma.masteryUnstableOrbital,
  'gunpowder:mastery:fireworks': gunpowder.masteryFireworks,
  'gunpowder:mastery:overload': gunpowder.masteryOverload,
  'magic:mastery:levitate': magic.masteryLevitate,
  'magic:mastery:transmogrify': magic.masteryTransmogrify,
  'echo:mastery:vibration-detection': echo.masteryVibrationDetection,
  'echo:mastery:echo-bloom': echo.masteryEchoBloom,
  'subterfuge:mastery:big-pockets': subterfuge.masteryBigPockets,
  'subterfuge:mastery:smoke-break': subterfuge.masterySmokeBreak,
  'rubber:mastery:vulcanization': rubber.masteryVulcanization,
  'rubber:mastery:atom-nhilego': rubber.masteryAtomNhilego,
  'fate:mastery:cycle': fate.masteryCycle,
  'fate:mastery:tarot-of-fate': fate.masteryTarotOfFate,
  'technology:mastery:vpn': technology.masteryVpn,
  'technology:mastery:byte-bomb': technology.masteryByteBomb,
  'silence:mastery:weep': silence.masteryWeep,
  'silence:mastery:puppetmaster': silence.masteryPuppetmaster,
};

/**
 * The loop to play for an ability, and whether it is the upgraded staging or a fallback to the
 * base one. `upgraded` callers get told when they are watching the base loop so the caption
 * can say so rather than quietly misrepresenting the upgrade.
 */
export function getPreview(
  elementId: string, abilityId: string, upgraded: boolean,
): { script: PreviewScript; isUpgradedStaging: boolean } | null {
  if (upgraded) {
    const up = PREVIEWS[`${elementId}:${abilityId}:up`];
    if (up) return { script: up, isUpgradedStaging: true };
  }
  const base = PREVIEWS[`${elementId}:${abilityId}`];
  return base ? { script: base, isUpgradedStaging: false } : null;
}

/**
 * The loop for anything that is not a keyed ability.
 *
 * Passives, perks and mastery enhancements are as worth showing as the five keys — often more
 * so, because a passive has no cast to watch for and a perk can rewrite what a key does. They
 * share the registry under a namespaced key so there is one place to look:
 *
 *   `fire:mastery:heatwave`   `water:perk:stalagmite`   `air:passive:wind-dodge`
 */
export function getSubjectPreview(
  elementId: string, kind: 'passive' | 'perk' | 'mastery', id: string,
): PreviewScript | null {
  return PREVIEWS[`${elementId}:${kind}:${id}`] ?? null;
}
