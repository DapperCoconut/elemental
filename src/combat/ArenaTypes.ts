import Phaser from 'phaser';
import { HealthBar } from './HealthBar';

export interface Puddle {
  sprite: Phaser.GameObjects.Arc;
  expiresAt: number;
  x: number;
  y: number;
  radius: number;
  tickAccum: number;
  owner: 'player' | 'npc';
}

export interface Geyser {
  sprite: Phaser.GameObjects.Arc;
  expiresAt: number;
  x: number;
  y: number;
  radius: number;
  owner: 'player' | 'npc';
}

export interface PainRainShadow {
  sprite: Phaser.GameObjects.Arc;
  fireAt: number;
  x: number;
  y: number;
  fired: boolean;
  owner: 'player' | 'npc';
  damage: number;
  hitRadius: number;
  color: number;
}

export interface Plant {
  sprite: Phaser.GameObjects.Arc;
  label: Phaser.GameObjects.Text;
  healthBar: HealthBar;
  expiresAt: number;
  x: number;
  y: number;
  radius: number;
  hp: number;
  maxHp: number;
  owner: 'player' | 'npc';
  type: 'normal' | 'life' | 'thorn';
  accum: number;
}

export interface Drone {
  sprite: Phaser.GameObjects.Arc;
  hp: number;
  maxHp: number;
  orbitAngle: number;
  shielded: boolean;
  owner: 'player' | 'npc';
}

export interface DarkCloud {
  sprite: Phaser.GameObjects.Arc;
  expiresAt: number;
  x: number;
  y: number;
  radius: number;
  tickAccum: number;
  owner: 'player' | 'npc';
}

export interface SnapTrap {
  sprite: Phaser.GameObjects.Arc;
  label: Phaser.GameObjects.Text;
  expiresAt: number;
  x: number;
  y: number;
  triggered: boolean;
  owner: 'player' | 'npc';
}

export interface CrystalNode {
  sprite: Phaser.GameObjects.Arc;
  x: number;
  y: number;
  owner: 'player' | 'npc';
}

export interface CrystalPortalGate {
  sprite: Phaser.GameObjects.Arc;
  label: Phaser.GameObjects.Text;
  x: number;
  y: number;
  owner: 'player' | 'npc';
}

export interface CrystalClone {
  sprite: Phaser.GameObjects.Arc;
  hp: number;
  maxHp: number;
  offsetX: number;
  offsetY: number;
  hpBar: Phaser.GameObjects.Rectangle;
  hpBg: Phaser.GameObjects.Rectangle;
}

export interface SoulOrb {
  sprite: Phaser.GameObjects.Arc;
  expiresAt: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  owner: 'player' | 'npc';
  lastContactTick: number;
}

export interface SoulSummon {
  sprite: Phaser.GameObjects.Arc;
  hp: number;
  maxHp: number;
  type: 'basic' | 'ghoul' | 'banshee' | 'knight';
  owner: 'player' | 'npc';
  lastContactTick: number;
  ghoulShootAccum: number;
  dx: number;
  dy: number;
}

export interface IcyTrail {
  sprite: Phaser.GameObjects.Arc;
  expiresAt: number;
  x: number;
  y: number;
  radius: number;
  frostTickAccum: number;
  owner: 'player' | 'npc';
}

export interface HuntGrenade {
  sprite: Phaser.GameObjects.Arc;
  x: number; y: number;
  startX: number; startY: number;
  vx: number; vy: number;
  explodeAt: number;
  selfDamage: boolean;
  owner: 'player' | 'npc';
  stopped: boolean;
}

export interface HuntTrailCircle {
  sprite: Phaser.GameObjects.Arc;
  x: number; y: number;
  expiresAt: number;
}

export interface TimePuddle {
  sprite: Phaser.GameObjects.Arc;
  expiresAt: number;
  x: number;
  y: number;
  radius: number;
  owner: 'player' | 'npc';
}

export interface PosSnapshot {
  x: number;
  y: number;
  t: number;
}
