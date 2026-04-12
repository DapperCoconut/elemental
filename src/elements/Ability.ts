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
  huntVampireStake: (tx: number, ty: number) => void;
  huntGarlicTrap: (tx: number, ty: number) => void;
  huntBatForm: () => void;
  huntVampireDrain: () => void;
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
}

export interface Ability {
  id: string;
  name: string;
  description: string;
  displayKey: string;
  cooldown: number; // ms
  cast(ctx: CastContext): void;
}
