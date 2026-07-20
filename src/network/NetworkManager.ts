import Peer, { DataConnection } from 'peerjs';
import type { InvasionFx, HuskStatus } from '../invasion/InvasionKit';

/** Bump when the wire protocol or gameplay sync changes incompatibly. */
export const NET_PROTOCOL_VERSION = 3;

/** Lobby selection payload exchanged while both players pick loadouts. */
export interface NetSelection {
  elementId: string | null;
  perkId: string | null;
  ready: boolean;
}

/** A single husk's networked state, as broadcast by the invasion co-op host. */
export interface NetHuskState {
  id: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  /** Index into HUSK_VARIANTS — drives the replica's colour and size. */
  v?: number;
  /** True while a demon is riding this husk (guest tints it to match). */
  p?: boolean;
}

export type NetMatchMode = 'pvp' | 'invasion';

export type NetMsg =
  | { t: 'hello'; version: number }
  | { t: 'sel'; elementId: string | null; perkId: string | null; ready: boolean }
  | { t: 'mode'; mode: NetMatchMode; invasionDifficulty: string }
  | {
      t: 'start';
      mode: NetMatchMode;
      invasionDifficulty?: string;
      hostSel: { elementId: string; perkId: string | null };
      guestSel: { elementId: string; perkId: string | null };
    }
  | { t: 'state'; x: number; y: number; vx: number; vy: number; hp: number; maxHp: number; shieldHp: number; shieldCharges: number; downed?: boolean }
  | { t: 'cast'; id: string; tx: number; ty: number }
  | { t: 'hit'; amount: number }
  | { t: 'death' }
  | { t: 'lobby' }
  | { t: 'ping'; ts: number }
  | { t: 'pong'; ts: number }
  // ── Invasion co-op (host → guest unless noted) ──────────────────
  | { t: 'huskSnap'; wave: number; shards: number; remaining: number; husks: NetHuskState[] }
  | { t: 'huskDeath'; id: number; reward: number; x: number; y: number }
  | { t: 'waveClear'; wave: number; bonus: number }
  | { t: 'huskDamage'; id: number; amount: number } // guest → host
  | { t: 'huskStatus'; id: number; s: HuskStatus }  // guest → host
  | { t: 'allyBite'; damage: number }
  // Husk variant effects: cosmetic replays on the guest — the host already
  // resolved any damage they represent and reports it via 'allyBite'.
  | { t: 'huskFx'; fx: InvasionFx }
  | { t: 'boss'; name: string; color: string }
  | { t: 'revived' } // either → either
  | { t: 'runEnd'; wavesCompleted: number; shardsEarned: number };

export type NetStatus = 'idle' | 'starting' | 'hosting' | 'joining' | 'connected' | 'error';

/** Room codes: unambiguous uppercase alphabet (no O/0, I/1, etc.). */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 4;
const PEER_ID_PREFIX = 'elemental-battle-';

function randomCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

type MsgHandler = (msg: NetMsg) => void;
type StatusHandler = (status: NetStatus, detail?: string) => void;

/**
 * Singleton wrapper around a single PeerJS 1:1 connection. Lives outside the
 * Phaser scene graph so the connection survives scene transitions
 * (Lobby → Arena → GameOver → Lobby).
 */
class NetworkManager {
  private peer: Peer | null = null;
  private conn: DataConnection | null = null;
  private msgHandlers = new Set<MsgHandler>();
  private statusHandlers = new Set<StatusHandler>();
  private pingTimer: ReturnType<typeof setInterval> | null = null;

  public status: NetStatus = 'idle';
  public isHost = false;
  public roomCode: string | null = null;
  public latencyMs = 0;
  /** Set when the peer reported a protocol version different from ours. */
  public versionMismatch = false;

  get connected(): boolean {
    return this.status === 'connected' && !!this.conn?.open;
  }

  // ── Lifecycle ────────────────────────────────────────────────────

  /** Create a lobby. Resolves the room code via status events ('hosting'). */
  host(): void {
    this.disconnect();
    this.isHost = true;
    this.setStatus('starting');
    this.openHostPeer(0);
  }

  private openHostPeer(attempt: number): void {
    const code = randomCode();
    const peer = new Peer(PEER_ID_PREFIX + code);
    this.peer = peer;

    peer.on('open', () => {
      if (this.peer !== peer) return;
      this.roomCode = code;
      this.setStatus('hosting');
    });

    peer.on('connection', (conn) => {
      if (this.peer !== peer) return;
      if (this.conn) {
        // Lobby is full — politely refuse extra joiners.
        conn.on('open', () => conn.close());
        return;
      }
      this.adoptConnection(conn);
    });

    peer.on('error', (err) => {
      if (this.peer !== peer) return;
      const type = (err as { type?: string }).type;
      if (type === 'unavailable-id' && attempt < 4) {
        peer.destroy();
        this.openHostPeer(attempt + 1);
        return;
      }
      this.fail(this.describePeerError(type));
    });

    peer.on('disconnected', () => {
      // Lost signaling server; existing data connection (if any) keeps working.
      if (this.peer === peer && !this.conn) peer.reconnect();
    });
  }

  /** Join a lobby by room code. */
  join(code: string): void {
    this.disconnect();
    this.isHost = false;
    this.roomCode = code.toUpperCase().trim();
    this.setStatus('starting');

    const peer = new Peer();
    this.peer = peer;

    peer.on('open', () => {
      if (this.peer !== peer) return;
      this.setStatus('joining');
      const conn = peer.connect(PEER_ID_PREFIX + this.roomCode, {
        reliable: true,
        serialization: 'json',
      });
      this.adoptConnection(conn);
    });

    peer.on('error', (err) => {
      if (this.peer !== peer) return;
      const type = (err as { type?: string }).type;
      this.fail(this.describePeerError(type));
    });
  }

  private adoptConnection(conn: DataConnection): void {
    this.conn = conn;

    conn.on('open', () => {
      if (this.conn !== conn) return;
      this.versionMismatch = false;
      this.setStatus('connected');
      this.send({ t: 'hello', version: NET_PROTOCOL_VERSION });
      this.startPingLoop();
    });

    conn.on('data', (data) => {
      if (this.conn !== conn) return;
      const msg = data as NetMsg;
      if (!msg || typeof msg.t !== 'string') return;
      if (msg.t === 'ping') { this.send({ t: 'pong', ts: msg.ts }); return; }
      if (msg.t === 'pong') { this.latencyMs = Math.max(0, Date.now() - msg.ts); return; }
      if (msg.t === 'hello') {
        this.versionMismatch = msg.version !== NET_PROTOCOL_VERSION;
        return;
      }
      for (const h of [...this.msgHandlers]) h(msg);
    });

    const onGone = () => {
      if (this.conn !== conn) return;
      this.conn = null;
      this.stopPingLoop();
      if (this.isHost && this.peer && !this.peer.destroyed) {
        // Keep the room open so another (or the same) friend can rejoin.
        this.setStatus('hosting', 'Opponent disconnected');
      } else {
        this.fail('Opponent disconnected');
      }
    };
    conn.on('close', onGone);
    conn.on('error', onGone);
  }

  /** Tear everything down and return to idle. */
  disconnect(): void {
    this.stopPingLoop();
    if (this.conn) { try { this.conn.close(); } catch { /* already closed */ } }
    if (this.peer) { try { this.peer.destroy(); } catch { /* already destroyed */ } }
    this.conn = null;
    this.peer = null;
    this.roomCode = null;
    this.isHost = false;
    this.latencyMs = 0;
    this.versionMismatch = false;
    this.status = 'idle';
  }

  private fail(detail: string): void {
    if (this.conn) { try { this.conn.close(); } catch { /* noop */ } }
    if (this.peer) { try { this.peer.destroy(); } catch { /* noop */ } }
    this.conn = null;
    this.peer = null;
    this.stopPingLoop();
    this.setStatus('error', detail);
  }

  private describePeerError(type: string | undefined): string {
    switch (type) {
      case 'peer-unavailable': return 'Room not found — check the code';
      case 'unavailable-id': return 'Could not claim a room code — try again';
      case 'network': return 'Cannot reach the matchmaking server';
      case 'browser-incompatible': return 'This browser does not support WebRTC';
      default: return 'Connection error — try again';
    }
  }

  // ── Messaging ────────────────────────────────────────────────────

  send(msg: NetMsg): void {
    if (this.conn?.open) {
      try { this.conn.send(msg); } catch { /* connection died mid-send */ }
    }
  }

  onMessage(h: MsgHandler): void { this.msgHandlers.add(h); }
  offMessage(h: MsgHandler): void { this.msgHandlers.delete(h); }
  onStatus(h: StatusHandler): void { this.statusHandlers.add(h); }
  offStatus(h: StatusHandler): void { this.statusHandlers.delete(h); }

  private setStatus(s: NetStatus, detail?: string): void {
    this.status = s;
    for (const h of [...this.statusHandlers]) h(s, detail);
  }

  private startPingLoop(): void {
    this.stopPingLoop();
    this.pingTimer = setInterval(() => {
      if (this.conn?.open) this.send({ t: 'ping', ts: Date.now() });
    }, 2000);
  }

  private stopPingLoop(): void {
    if (this.pingTimer !== null) { clearInterval(this.pingTimer); this.pingTimer = null; }
  }
}

export const Net = new NetworkManager();
