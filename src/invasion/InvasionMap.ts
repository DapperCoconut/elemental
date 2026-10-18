import Phaser from 'phaser';

export interface MapRoomMeta {
  name: string;
  emoji: string;
}

/**
 * What InvasionKit needs from the place it is defending. Two implementations:
 * the legacy `Mansion` (rooms with HP that fall) and the `CityMap` (lanes that
 * lead to the All-Element). Rooms are full screens either way, so the room
 * index on every husk, shot and zone means the same thing on both.
 */
export interface InvasionMap {
  currentRoom: number;
  /** Per-room HP; Infinity where a room cannot be damaged. */
  hp: number[];
  lost: boolean[];
  readonly isApocalypse: boolean;
  setTheme(color: number | null): void;
  reset(): void;
  destroyHud(): void;
  setTarget(room: number, second?: number): void;
  setApocalypse(on: boolean): void;
  setCorruptionReadout(levels: number[]): void;
  update(
    time: number,
    player: { x: number; y: number; body: Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | null },
    huskCounts: number[],
  ): void;
  standingRooms(): number[];
  allOuterRoomsLost(): boolean;
  /** Returns true the moment this call is the one that loses the room. */
  damageRoom(room: number, amount: number): boolean;
  windowSpawn(room: number, rand: () => number): { x: number; y: number };
  roomMeta(room: number): MapRoomMeta;
}
