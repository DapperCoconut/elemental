import Phaser from 'phaser';

export interface CastContext {
  scene: Phaser.Scene;
  casterX: number;
  casterY: number;
  targetX: number;
  targetY: number;
  isPlayerCaster: boolean;
  projectiles: Phaser.Physics.Arcade.Group;
  /** Maps a fire visual color through the caster's equipped skin (identity without one). */
  fireColor: (base: number) => number;
  /** Maps a water visual color through the caster's equipped skin (identity without one). */
  waterColor: (base: number) => number;
  /** Maps a life visual color through the caster's equipped skin (identity without one). */
  lifeColor: (base: number) => number;
  /** Maps an air visual color through the caster's equipped skin (identity without one). */
  airColor: (base: number) => number;
  dealAoeDamage: (cx: number, cy: number, radius: number, damage: number) => void;
  /** Fire Mastery: same as dealAoeDamage but tracks zombie kills for the Nuclear Cleansing challenge (player-only). */
  dealFlameNukeDamage: (cx: number, cy: number, radius: number, damage: number) => void;
  /**
   * Molten perk (divine): Flame Nuke's detonation is replaced by a screen-wide eruption owned
   * by FireKit. Optional — only fire's Q reaches for it, so the other CastContext implementers
   * are free to leave it out.
   */
  fireMoltenEruption?: () => void;
  /** Molten perk (divine): burn the caster for the hotter Pressure Bomb they just threw. */
  fireScorchCaster?: () => void;
  /**
   * Pressure Bomb's fuse: FireKit plants the charge, marks the ground red and detonates it
   * 1.5s later (scattering bomblets with Cluster Bomb, R+). Optional — only fire's R reaches
   * for it, so the other CastContext implementers are free to leave it out.
   */
  fireLobPressureBomb?: (x: number, y: number, damage: number) => void;
  dashCaster: (vx: number, vy: number) => void;
  healCaster: (amount: number) => void;
  damageCaster: (amount: number) => void;
  setCasterSpeedMultiplier: (mult: number) => void;
  lockCaster: (durationMs: number) => void;
  addShieldCharge: () => void;
  spawnPuddle: (x: number, y: number) => void;
  spawnGeyser: (x: number, y: number) => void;
  spawnPainRain: () => void;
  spawnPlant: (x: number, y: number) => void;
  growPlants: () => void;
  thornPlants: () => void;
  startThornDrag: () => void;
  // ── Air (the wind dancer) — every one of these lands in AirKit ──
  /** Click: the near fan cut plus the shear of wind thrown off it. */
  airSplice: (x: number, y: number) => void;
  /** E: the 360° turn, or E+'s flip along the aim. */
  airSpinDance: (x: number, y: number) => void;
  /** R: both fans thrown as one glaive, parked on the point, then recalled. */
  airGaleGlaive: (x: number, y: number) => void;
  /** F: hook to the point, untouchable in flight. */
  airSkyGrapple: (x: number, y: number) => void;
  /** Q: five seconds of being the weather, then the throw along this aim. */
  airWindBreaker: (x: number, y: number) => void;
  addShieldHp: (amount: number) => void;
  getShieldHp: () => number;
  setShieldHp: (amount: number) => void;
  slamCaster: () => void;
  dealMeleeDamage: (range: number, damage: number, knockback?: number) => void;
  startBullRush: () => void;
  spawnDrone: () => void;
  commandDrones: (x: number, y: number) => void;
  launchDrone: (x: number, y: number) => void;
  placeFirewall: (x: number, y: number) => void;
  startOverdrive: (x: number, y: number) => void;
  // Shadow
  launchDarkBomb: (x: number, y: number) => void;
  // Ice
  fireIceSpike: (targetX: number, targetY: number) => void;
  fireFrostBlast: (targetX: number, targetY: number) => void;
  toggleBlockUp: () => void;
  startSkate: () => void;
  fireFrozenSolid: (targetX: number, targetY: number) => void;
  activateTentacle: (x: number, y: number) => void;
  placeSnapTrap: () => void;
  summonTentacleWall: (x: number, y: number) => void;
  startBlackHole: (x: number, y: number) => void;
  // Growth
  fireGrowthClick: (tx: number, ty: number) => void;
  growthToggleEvolve: () => void;
  growthVirus: (tx: number, ty: number) => void;
  growthSporeSpray: (tx: number, ty: number) => void;
  growthAuxiliaryGrowth: (tx: number, ty: number) => void;
  // Crystal
  fireCrystalLaser: (tx: number, ty: number) => void;
  placeCrystalNode: (tx: number, ty: number) => void;
  activateCrystalAtune: () => void;
  placeCrystalPortal: (tx: number, ty: number) => void;
  activateCrystalTrick: () => void;
  // Soul
  soulLantern: (tx: number, ty: number) => void;
  /** Start charging the soul beam at a fixed point (bots); the kit fires it when full. */
  soulBeam: (tx: number, ty: number) => void;
  soulArise: () => void;
  soulGrave: (tx: number, ty: number) => void;
  soulDeathWhistle: (tx: number, ty: number) => void;
  soulHellsTorment: () => void;
  // Hunt — human form
  huntCrossbow: (tx: number, ty: number) => void;
  /** `chargeMs` is the E+ Mine Blast hold; 0 for the uncharged cone. */
  huntBlast: (tx: number, ty: number, chargeMs: number) => void;
  huntGrenade: (tx: number, ty: number) => void;
  huntTrail: () => void;
  huntReleaseBeast: () => void;
  // Hunt — beast form
  huntSlash: (tx: number, ty: number) => void;
  huntPounce: (tx: number, ty: number) => void;
  huntRoar: (tx: number, ty: number) => void;
  huntGrapple: (tx: number, ty: number) => void;
  huntBloodScent: () => void;
  // Hunt — hybrid form
  huntHybridShotgun: (tx: number, ty: number) => void;
  huntRoll: (tx: number, ty: number) => void;
  huntHook: (tx: number, ty: number) => void;
  huntAdrenaline: () => void;
  huntGiveIn: () => void;
  // Sand (legacy)
  sandFlintlock: (tx: number, ty: number) => void;
  sandBlindingSand: (tx: number, ty: number) => void;
  sandToggleTornado: () => void;
  sandMirage: (tx: number, ty: number) => void;
  sandActivateGlass: () => void;
  // Time (replaces Sand)
  timeBarrage: (tx: number, ty: number) => void;
  timeWarp: (tx: number, ty: number) => void;
  timeRemain: () => void;
  timeHalt: () => void;
  timeTimeless: () => void;
  // Gravity
  gravitySlash: (x1: number, y1: number, x2: number, y2: number) => void;
  gravityMeteorShadow: (x: number, y: number) => void;
  gravityMeteorRainNpcBurst: (tx: number, ty: number) => void;
  gravitySpaceSlam: () => void;
  gravityGravBombSnap: (x: number, y: number) => void;
  gravityLunarLanding: () => void;
  // Creation
  creationDaggerSpray: (tx: number, ty: number, count: number) => void;
  creationBolt: (tx: number, ty: number, tier: 'copper' | 'silver' | 'gold') => void;
  creationWrench: (tx: number, ty: number) => void;
  creationBlock: (x: number, y: number, w: number, h: number) => void;
  creationWorkshop: () => void;
  // Fate (alt-life)
  fateThrowCard: (tx: number, ty: number) => void;
  fateReroll: () => void;
  fatePreserve: () => void;
  fateEnchant: () => void;
  fateAllIn: () => void;
  // Magnet (abstract combined: electricity + slime)
  magnetCoin: (tx: number, ty: number) => void;
  magnetRepulse: (tx: number, ty: number) => void;
  magnetNail: (tx: number, ty: number) => void;
  magnetSpike: (tx: number, ty: number) => void;
  magnetMecha: () => void;
  /** Non-ability presses (no cooldown): rip nails out, ride to a spike, hold the coins. */
  magnetRecall: () => void;
  magnetZip: (tx: number, ty: number) => void;
  magnetHover: (on: boolean) => void;
  // Metal (abstract combined: electricity + fate)
  metalSlash: (tx: number, ty: number) => void;
  metalFlailCraft: () => void;
  /** NPC-only: trigger an idle flail into a swing (the player does this by clicking directly in MetalKit). */
  metalTriggerFlailSwing: () => void;
  metalBloodTransfusionTick: () => void;
  metalChainTether: (tx: number, ty: number) => void;
  metalClotArmor: () => void;
  // Plasma (abstract combined: electricity + light)
  plasmaBurst: (tx: number, ty: number) => void;
  plasmaUnstableArena: (tx: number, ty: number) => void;
  plasmaCurrentLaunch: (tx: number, ty: number) => void;
  plasmaChaosBlades: () => void;
  plasmaPureChaos: () => void;
  // Gunpowder (abstract combined: fate + sound)
  gunpowderMusketShot: (tx: number, ty: number) => void;
  gunpowderExplosiveRetreat: (tx: number, ty: number) => void;
  gunpowderFireAtWill: (tx: number, ty: number) => void;
  gunpowderArsenalExpansion: () => void;
  gunpowderBlunderBlast: (tx: number, ty: number) => void;
  // Rubber (abstract combined: slime + fate)
  rubberPunch: (tx: number, ty: number, pullRatio: number) => void;
  rubberSlingShotStart: (cursorAngle: number) => void;
  rubberSlingShotRelease: (vx: number, vy: number) => void;
  rubberBounceForm: () => void;
  rubberBandStart: () => void;
  rubberage: () => void;
  // Magic (abstract combined: slime + light)
  magicSparkleShot: (tx: number, ty: number) => void;
  magicOpenGrimoire: () => void;
  magicAnchorToggle: (tx: number, ty: number) => void;
  magicMeditateBegin: () => void;
  magicOpenNecronomicon: () => void;
  // Technology (abstract combined: sound + light)
  techCruncherFire: (tx: number, ty: number) => void;
  techAdsCast: () => void;
  techUploadCast: (tx: number, ty: number) => void;
  techWebDragCast: () => void;
  techAdminCast: () => void;
  // Silence (abstract combined: slime + sound)
  silenceStab: (tx: number, ty: number) => void;
  silenceSummonStalker: (tx: number, ty: number) => void;
  silenceRitual: (tx: number, ty: number) => void;
  silenceFeast: (tx: number, ty: number) => void;
  silenceRun: (tx: number, ty: number) => void;
  // Echo (abstract combined: fate + light)
  echoEcholocation: (tx: number, ty: number) => void;
  echoGuess: (tx: number, ty: number) => void;
  echoLantern: (tx: number, ty: number) => void;
  echoBatForm: (tx: number, ty: number) => void;
  echoEclipse: (tx: number, ty: number) => void;
  // Subterfuge (abstract combined: slime + fate)
  subterfugeCutter: (tx: number, ty: number) => void;
  subterfugeSpray: (tx: number, ty: number) => void;
  subterfugeRecruit: (tx: number, ty: number) => void;
  subterfugeBribe: (tx: number, ty: number) => void;
  subterfugeTreachery: (tx: number, ty: number) => void;
  // Justice (divine: the Devourer of Kings, killed). Ground stance, then flight stance.
  justiceStab: (tx: number, ty: number) => void;
  justiceColiseum: () => void;
  justiceSheerWill: () => void;
  justiceFlight: () => void;
  justiceJudgementDay: () => void;
  justiceSpearThrow: (tx: number, ty: number) => void;
  justiceBind: (tx: number, ty: number) => void;
  justicePillar: (tx: number, ty: number) => void;
  justiceDescend: () => void;
  justiceSeraphim: () => void;
  // Dream (divine: the Devourer of Kings, spared)
  dreamTrance: () => void;
  dreamPillowFight: (tx: number, ty: number) => void;
  dreamDreamcatcher: () => void;
  dreamNightmare: () => void;
  dreamOasis: () => void;
  /** Dream Mastery — Dream Duel: the spirit's two keys, live only while a duel is running. */
  dreamHaunt: (tx: number, ty: number) => void;
  dreamSpiritTear: (tx: number, ty: number) => void;
  // Chalk (test element: cheat mode only for now)
  // Wax (test element: cheat mode only for now)
  waxStingerStrikes: (tx: number, ty: number) => void;
  waxSwarm: (tx: number, ty: number) => void;
  waxCandleMount: (tx: number, ty: number) => void;
  waxHiveHearth: (tx: number, ty: number) => void;
  waxStickyBombs: (tx: number, ty: number) => void;
  // Clay (test element: cheat mode only for now)
  claySlam: () => void;
  clayRupture: () => void;
  clayClot: () => void;
  claySlink: (tx: number, ty: number) => void;
  clayFuse: () => void;
  chalkWard: () => void;
  chalkExplosive: () => void;
  chalkPerma: () => void;
  chalkShield: () => void;
  chalkMasterpiece: () => void;
  // Magma
  magmaPlume: (tx: number, ty: number) => void;
  magmaVolcano: (tx: number, ty: number) => void;
  magmaBloat: () => void;
  magmaBlunder: (tx: number, ty: number) => void;
  magmaMutiny: () => void;
  // Illusion (test element: cheat mode only for now)
  illusionCrackShot: (tx: number, ty: number) => void;
  illusionVeil: (tx: number, ty: number) => void;
  illusionRelocate: () => void;
  /** F — Guise: shrink, vanish and send a full-size clone after the cursor. */
  illusionGuise: (tx: number, ty: number) => void;
  /** F+ — Re-Trick: swap into the live clone. A recast, so it never touches the cooldown. */
  illusionRetrick: () => void;
  illusionDance: () => void;
  // Ruin (test element: cheat mode only for now)
  ruinShred: (tx: number, ty: number) => void;
  ruinLockdown: (tx: number, ty: number) => void;
  ruinSkewer: (tx: number, ty: number) => void;
  ruinSpikes: () => void;
  ruinDecay: () => void;
  // Sand — element id `dune` (test element: cheat mode only for now)
  duneStriker: (tx: number, ty: number) => void;
  duneRuins: () => void;
  dunePyramid: () => void;
  duneSandwalk: (tx: number, ty: number) => void;
  duneFinalTrail: () => void;
  // Depths (test element: cheat mode only for now)
  depthsPiranha: (tx: number, ty: number) => void;
  depthsLungfish: (tx: number, ty: number) => void;
  depthsEutrophication: () => void;
  depthsAngler: (tx: number, ty: number) => void;
  depthsMegalodon: (tx: number, ty: number) => void;
  // Devotion (id `passion`)
  passionSermon: (tx: number, ty: number) => void;
  passionHolyWater: (tx: number, ty: number) => void;
  passionGrenade: (tx: number, ty: number) => void;
  passionCrucifix: (tx: number, ty: number) => void;
  passionAscendance: (tx: number, ty: number) => void;
  // Conquest (test element: cheat mode only for now)
  conquestBanner: () => void;
  conquestBuild: (kind: 'barracks' | 'turret' | 'barricade') => void;
  conquestExpansion: () => void;
  // Paper (test element: cheat mode only for now)
  paperStorybook: (tx: number, ty: number) => void;
  paperPlane: (tx: number, ty: number) => void;
  paperShuriken: (tx: number, ty: number) => void;
  paperMache: () => void;
  paperClimax: (tx: number, ty: number) => void;
  // Gold (element id `fortune`; test element: cheat mode only for now)
  fortuneFray: (tx: number, ty: number) => void;
  fortuneAdvance: () => void;
  fortunePlume: (tx: number, ty: number) => void;
  fortuneHeart: (tx: number, ty: number) => void;
  fortuneMidas: (tx: number, ty: number) => void;
  // Cloth (test element: cheat mode only for now)
  clothPin: (tx: number, ty: number) => void;
  clothLongpin: (tx: number, ty: number) => void;
  clothSafetyLine: () => void;
  clothPinCushion: () => void;
  clothTapestry: () => void;

  // Marrow (test element: cheat mode only for now)
  marrowAntibody: (tx: number, ty: number) => void;
  marrowMacrosma: () => void;
  marrowNeutralize: () => void;
  marrowDendricles: (tx: number, ty: number) => void;
  marrowMastacre: () => void;
  // Tempest (test element: cheat mode only for now)
  tempestGale: (tx: number, ty: number) => void;
  tempestKick: (tx: number, ty: number) => void;
  tempestFront: (tx: number, ty: number) => void;
  tempestUpdraft: () => void;
  tempestForecast: (tx: number, ty: number) => void;
  // Myth (test element)
  mythWhip: (tx: number, ty: number) => void;
  mythTruth: (tx: number, ty: number) => void;
  mythDetermination: () => void;
  mythBeast: (tx: number, ty: number) => void;
  mythDestiny: (tx: number, ty: number) => void;
  mythPistol: (tx: number, ty: number) => void;
  mythShotgun: (tx: number, ty: number) => void;
  mythGrenades: (tx: number, ty: number) => void;
  mythRifle: (tx: number, ty: number) => void;
  mythRocket: (tx: number, ty: number) => void;
  // Death (test element: cheat mode only for now)
  deathStyxShot: (tx: number, ty: number) => void;
  deathDisarm: (tx: number, ty: number) => void;
  deathRiposte: (tx: number, ty: number) => void;
  deathAmputate: (tx: number, ty: number) => void;
  deathDeal: (tx: number, ty: number) => void;
  // Psychic (test element: cheat mode only for now)
  psychicEnPassant: (tx: number, ty: number) => void;
  psychicBishop: (tx: number, ty: number) => void;
  psychicKnight: (tx: number, ty: number) => void;
  psychicRook: (tx: number, ty: number) => void;
  psychicQueen: () => void;
  /**
   * Not an ability: the bot's click on the board, carrying out the move PsychicKit planned for
   * it (`NpcAiState.npcPsychicMove`). A no-op on the player's context — the player's clicks are
   * read by the kit's own input handler.
   */
  psychicMovePiece: (tx: number, ty: number) => void;
  // Sound — every ability is resolved by SoundKit, keyed by ability id.
  soundCast: (abilityId: string, tx: number, ty: number) => void;
  // Radiation (test element: cheat mode only for now)
  radiationRailgun: (tx: number, ty: number) => void;
  radiationBarrage: (tx: number, ty: number) => void;
  radiationBunker: () => void;
  radiationBaton: (tx: number, ty: number) => void;
  radiationExtermination: () => void;
  // Bind (test element: cheat mode only for now)
  bindSummon: (tx: number, ty: number) => void;
  bindShards: (tx: number, ty: number) => void;
  bindIdol: (tx: number, ty: number) => void;
  bindProtection: () => void;
  bindTreachery: () => void;
  // Slime (test element: cheat mode only for now; id is `gum`, since `slime` is Acid's)
  gumGrab: (tx: number, ty: number) => void;
  gumSurge: (tx: number, ty: number) => void;
  gumGumball: (tx: number, ty: number) => void;
  gumOozorbtion: () => void;
  gumSolidify: () => void;

  // Quantum's Third State — the kit the bond's third stop supplies (QuantumCoreKit)
  quantumSplicers: () => void;
  quantumAbilitySplit: () => void;
  quantumArenaSplit: () => void;
  quantumEffectSplit: () => void;
  quantumParasite: (tx: number, ty: number) => void;
  // Harvest (element id `gluttony`, test element: cheat mode only for now).
  harvestSickle: (tx: number, ty: number) => void;
  harvestSow: () => void;
  harvestFrenzy: (tx: number, ty: number) => void;
  harvestConsume: (tx: number, ty: number) => void;
  harvestReap: (tx: number, ty: number) => void;
  hasPerk: (perkId: string) => boolean;
}

export interface Ability {
  id: string;
  name: string;
  description: string;
  displayKey: string;
  cooldown: number; // ms
  /** True for Q (ultimate) abilities. Used by Finality card to halve cooldown. */
  isUltimate?: boolean;
  cast(ctx: CastContext): void;
}
