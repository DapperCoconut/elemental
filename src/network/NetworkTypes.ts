import { P2InputState } from './P2InputState';

export type PeerRole = 'host' | 'guest';

/** Sent by guest → host every frame */
export interface InputPacket {
  type: 'input';
  input: P2InputState;
}

/** Sent by host → guest at ~20 Hz */
export interface StatePacket {
  type: 'state';
  tick: number;
  player: FighterSnapshot;
  npc: FighterSnapshot;
  gameOver?: { playerWon: boolean };
}

/** Bidirectional lobby handshake */
export interface LobbyPacket {
  type: 'lobby';
  action: 'element-chosen' | 'ready' | 'start';
  elementId?: string;
}

export interface FighterSnapshot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  shieldCharges: number;
  shieldHp: number;
  chargeRatio: number;
  isInvincible: boolean;
  cooldownMult: number;
}

export type NetworkPacket = InputPacket | StatePacket | LobbyPacket;
