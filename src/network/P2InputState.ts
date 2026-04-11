export interface P2InputState {
  // Movement
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  // Aiming (local: IJKL keys; network: unused — use aimX/aimY instead)
  aimUp: boolean;
  aimDown: boolean;
  aimLeft: boolean;
  aimRight: boolean;
  // Abilities (maps to click / e / r / f / q)
  click: boolean;
  e: boolean;
  r: boolean;
  f: boolean;
  q: boolean;
  // Dodge
  dodge: boolean;
  // Absolute aim target in normalized screen coords (0–1), used in network mode
  aimX?: number;
  aimY?: number;
  // Sequence number for network ordering (increment each frame)
  seq: number;
}

export const emptyP2Input = (): P2InputState => ({
  up: false, down: false, left: false, right: false,
  aimUp: false, aimDown: false, aimLeft: false, aimRight: false,
  click: false, e: false, r: false, f: false, q: false,
  dodge: false,
  seq: 0,
});
