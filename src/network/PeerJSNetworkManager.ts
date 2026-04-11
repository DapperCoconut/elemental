import Peer, { DataConnection } from 'peerjs';
import { NetworkManager } from './NetworkManager';
import { P2InputState } from './P2InputState';
import { PeerRole, StatePacket, LobbyPacket, NetworkPacket } from './NetworkTypes';

function randomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export class PeerJSNetworkManager implements NetworkManager {
  private peer: Peer | null = null;
  private conn: DataConnection | null = null;

  private _role: PeerRole = 'host';
  private _isConnected = false;
  private _roomCode = '';

  private inputCb: ((state: P2InputState) => void) | null = null;
  private stateCb: ((state: StatePacket) => void) | null = null;
  private lobbyCb: ((packet: LobbyPacket) => void) | null = null;
  private connectedCb: (() => void) | null = null;
  private disconnectedCb: (() => void) | null = null;
  private errorCb: ((err: string) => void) | null = null;

  get role(): PeerRole { return this._role; }
  get isConnected(): boolean { return this._isConnected; }
  get roomCode(): string { return this._roomCode; }

  hostRoom(): Promise<string> {
    return new Promise((resolve, reject) => {
      this._role = 'host';
      const code = randomCode();
      this._roomCode = code;
      this.peer = new Peer(code);

      this.peer.on('open', () => {
        resolve(code);
      });

      this.peer.on('connection', (conn) => {
        this.conn = conn;
        this.setupConn(conn);
      });

      this.peer.on('error', (err) => {
        reject(err);
        this.errorCb?.(String(err));
      });
    });
  }

  joinRoom(code: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this._role = 'guest';
      this._roomCode = code;
      this.peer = new Peer();

      this.peer.on('open', () => {
        const conn = this.peer!.connect(code);
        this.conn = conn;
        this.setupConn(conn);
        conn.on('open', () => resolve());
        conn.on('error', (err) => reject(err));
      });

      this.peer.on('error', (err) => {
        reject(err);
        this.errorCb?.(String(err));
      });
    });
  }

  private setupConn(conn: DataConnection): void {
    conn.on('open', () => {
      this._isConnected = true;
      this.connectedCb?.();
    });

    conn.on('data', (raw) => {
      let packet: NetworkPacket;
      try {
        packet = (typeof raw === 'string' ? JSON.parse(raw) : raw) as NetworkPacket;
      } catch {
        return;
      }
      if (packet.type === 'input')  this.inputCb?.(packet.input);
      if (packet.type === 'state')  this.stateCb?.(packet);
      if (packet.type === 'lobby')  this.lobbyCb?.(packet);
    });

    conn.on('close', () => {
      this._isConnected = false;
      this.disconnectedCb?.();
    });

    conn.on('error', (err) => {
      this.errorCb?.(String(err));
    });
  }

  private send(packet: NetworkPacket): void {
    if (this.conn?.open) {
      this.conn.send(JSON.stringify(packet));
    }
  }

  sendInput(state: P2InputState): void {
    this.send({ type: 'input', input: state });
  }

  sendState(state: StatePacket): void {
    this.send(state);
  }

  sendLobby(packet: LobbyPacket): void {
    this.send(packet);
  }

  onInputReceived(cb: (state: P2InputState) => void): void  { this.inputCb = cb; }
  onStateReceived(cb: (state: StatePacket) => void): void   { this.stateCb = cb; }
  onLobbyReceived(cb: (packet: LobbyPacket) => void): void  { this.lobbyCb = cb; }
  onConnected(cb: () => void): void                         { this.connectedCb = cb; }
  onDisconnected(cb: () => void): void                      { this.disconnectedCb = cb; }
  onError(cb: (err: string) => void): void                  { this.errorCb = cb; }

  disconnect(): void {
    this.conn?.close();
    this.peer?.destroy();
    this.conn = null;
    this.peer = null;
    this._isConnected = false;
  }
}
