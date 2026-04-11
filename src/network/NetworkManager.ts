import { P2InputState } from './P2InputState';
import { PeerRole, StatePacket, LobbyPacket } from './NetworkTypes';

export interface NetworkManager {
  readonly role: PeerRole;
  readonly isConnected: boolean;
  readonly roomCode: string;

  // Connection lifecycle
  hostRoom(): Promise<string>;
  joinRoom(code: string): Promise<void>;
  disconnect(): void;

  // Guest → Host: input each frame
  sendInput(state: P2InputState): void;
  onInputReceived(cb: (state: P2InputState) => void): void;

  // Host → Guest: authoritative state at ~20 Hz
  sendState(state: StatePacket): void;
  onStateReceived(cb: (state: StatePacket) => void): void;

  // Bidirectional: lobby handshake before game starts
  sendLobby(packet: LobbyPacket): void;
  onLobbyReceived(cb: (packet: LobbyPacket) => void): void;

  // Lifecycle events
  onConnected(cb: () => void): void;
  onDisconnected(cb: () => void): void;
  onError(cb: (err: string) => void): void;
}
