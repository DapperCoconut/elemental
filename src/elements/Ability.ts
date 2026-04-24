import Phaser from 'phaser';

export interface CastContext {
  scene: Phaser.Scene;
  casterX: number;
  casterY: number;
  targetX: number;
  targetY: number;
  isPlayerCaster: boolean;
  projectiles: Phaser.Physics.Arcade.Group;
  dealAoeDamage: (cx: number, cy: number, radius: number, damage: number) => void;
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
  activateQuickShot: () => void;
  placeWindTrap: (x: number, y: number) => void;
  grappleTo: (x: number, y: number) => void;
  reportAirSnipeResult: (hit: boolean) => void;
  quickShotActive: boolean;
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
  activateShadowDance: () => void;
  startBlackHole: () => void;
  // Growth
  fireGrowthClick: (tx: number, ty: number) => void;
  openMutateMenu: () => void;
  fireInfect: (tx: number, ty: number) => void;
  activateBloat: () => void;
  triggerMutantMorph: () => void;
  // Crystal
  fireCrystalLaser: (tx: number, ty: number) => void;
  placeCrystalNode: (tx: number, ty: number) => void;
  startCrystalBarrage: (tx: number, ty: number) => void;
  placeCrystalPortal: (tx: number, ty: number) => void;
  activateCrystalTrick: () => void;
  // Soul
  fireSoulOrb: (tx: number, ty: number) => void;
  summonGhost: (ghostType: 'basic' | 'ghoul' | 'banshee' | 'knight' | 'corpse' | 'necromancer') => void;
  soulSacrifice: () => void;
  soulConsume: () => void;
  // Hunt
  huntThrowGrenade: (tx: number, ty: number, holdMs: number) => void;
  huntHuntersTrail: () => void;
  huntBloodPact: () => void;
  huntTransform: () => void;
  huntSlash: (tx: number, ty: number) => void;
  huntLeap: (tx: number, ty: number) => void;
  huntBloodHunt: () => void;
  huntBloodMoon: () => void;
  huntUntransform: () => void;
  huntHybridShotgun: (tx: number, ty: number) => void;
  huntHybridInstinct: () => void;
  huntHybridShriek: (tx: number, ty: number) => void;
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
  creationScytheLaunch: (tx: number, ty: number) => void;
  creationBlock: (x: number, y: number, w: number, h: number) => void;
  creationMaze: () => void;
  // Fate (alt-life)
  fateCoinToss: (tx: number, ty: number) => void;
  fateSpawnSlotMachine: (x: number, y: number) => void;
  fateLuck: () => void;
  fateDice: (tx: number, ty: number) => void;
  fateAllIn: () => void;
  // Magnet (abstract combined: electricity + slime)
  magnetPulse: (x: number, y: number) => void;
  magnetNailShoot: (tx: number, ty: number) => void;
  magnetNailRecall: () => void;
  magnetMagnetize: (tx: number, ty: number) => void;
  magnetProtect: () => void;
  magnetAtomSmasher: (x: number, y: number) => void;
  // Metal (abstract combined: electricity + fate)
  metalSlash: (tx: number, ty: number) => void;
  metalFireAtWill: () => void;
  metalOpenReinforcementMenu: () => void;
  metalChainTether: (tx: number, ty: number) => void;
  metalBloodClot: () => void;
  // Plasma (abstract combined: electricity + light)
  plasmaBurst: (tx: number, ty: number) => void;
  plasmaUnstableArena: (tx: number, ty: number) => void;
  plasmaCurrentLaunch: (tx: number, ty: number) => void;
  plasmaChaosBlades: () => void;
  plasmaChaosIncarnate: () => void;
  // Death (abstract combined: fate + sound)
  death1000Blades: (tx: number, ty: number) => void;
  deathSummonWisps: (count: number) => void;
  deathLoomingDread: () => void;
  deathWispDaemon: () => void;
  deathTrailDash: (tx: number, ty: number) => void;
  deathJudgement: () => void;
  // Void (abstract combined: fate + light)
  voidFloater: (tx: number, ty: number) => void;
  voidReturnToVoid: (tx: number, ty: number) => void;
  voidReLapse: (tx: number, ty: number) => void;
  voidAsh: (tx: number, ty: number) => void;
  voidOfHell: () => void;
  // Adrenaline (abstract combined: electricity + sound)
  adrenalineGoldenShot: (tx: number, ty: number) => void;
  adrenalineDash: (tx: number, ty: number) => void;
  adrenalineToggleSkate: () => void;
  adrenalineSelfInject: () => void;
  adrenalineStyledOn: (tx: number, ty: number) => void;
  adrenalineOllie: () => void;
  adrenalineRush: () => void;
  adrenalineRamp: () => void;
  adrenalineTrick: () => void;
  adrenalineWallTeleport: (tx: number, ty: number) => void;
  adrenalineAddStyle: (points: number, label: string, color?: string) => void;
  adrenalineRegisterShotHit: () => void;
  adrenalineRegisterShotMiss: () => void;
  // Magic (abstract combined: slime + light)
  magicSparkleShot: (tx: number, ty: number) => void;
  magicOpenGrimoire: () => void;
  magicAnchorToggle: (tx: number, ty: number) => void;
  magicMeditateBegin: () => void;
  magicOpenNecronomicon: () => void;
  // Technology (abstract combined: sound + light)
  techFlailEmpower: () => void;
  techDevConsoleOpen: () => void;
  techHackAttribute: () => void;
  techDeleteArea: (x: number, y: number, w: number, h: number) => void;
  techOpSelfBegin: () => void;
  techGearGiveActivate: () => void;
  techRandomEffect: () => void;
  // Silence (abstract combined: slime + sound)
  silenceStartFade: () => void;
  silenceReleaseFade: () => void;
  silenceCastDontLook: (angleRad: number) => void;
  silenceFirePossess: (angleRad: number) => void;
  silenceEnterSlasher: () => void;
  silenceExitSlasher: (voluntary: boolean) => void;
  silenceStartWatch: () => void;
  silenceWatchTendril: (tx: number, ty: number) => void;
  techStartDomain: () => void;
  silenceMachete: (angleRad: number) => void;
  silenceThrowHook: (angleRad: number) => void;
  silenceYankHook: () => void;
  silenceMortalWound: (angleRad: number) => void;
  silenceSlashEmUp: () => void;
  // Echo (abstract combined: fate + light)
  echoEcholocation: (tx: number, ty: number) => void;
  echoGuess: (tx: number, ty: number) => void;
  echoLantern: (tx: number, ty: number) => void;
  echoBatForm: (tx: number, ty: number) => void;
  echoEclipse: (tx: number, ty: number) => void;
  // Quantum (abstract combined: slime + fate)
  quantumWave: (tx: number, ty: number) => void;
  quantumChaosControl: (tx: number, ty: number) => void;
  quantumAtomVibration: (tx: number, ty: number) => void;
  quantumMechanic: (tx: number, ty: number) => void;
  quantumAtomNhilego: (tx: number, ty: number) => void;
  hasPerk: (perkId: string) => boolean;
}

export interface Ability {
  id: string;
  name: string;
  description: string;
  displayKey: string;
  cooldown: number; // ms
  cast(ctx: CastContext): void;
}
