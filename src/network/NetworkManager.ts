import Peer, { DataConnection } from 'peerjs';
import type { InvasionFx, HuskStatus } from '../invasion/InvasionKit';
import type { NetStatusEntry } from './NetStatusSync';
import type { NetConquestSnap } from '../elements/kits/ConquestKit';

/** Bump when the wire protocol or gameplay sync changes incompatibly. */
export const NET_PROTOCOL_VERSION = 51;

/** A co-op room holds the host plus up to three guests. PvP still needs exactly two. */
export const MAX_PLAYERS = 4;

/** Lobby selection payload exchanged while both players pick loadouts. */
export interface NetSelection {
  elementId: string | null;
  perkId: string | null;
  /** Owned upgrade slots for the selected element (replayed by the peer's sim). */
  upgrades: string[];
  /** Mastery ability bound per slot (e.g. { e: 'starfall' }); replayed by the peer's sim. */
  masteryBinds: Record<string, string>;
  /** Whether Element Mastery is enabled for the selected element (drives passives too). */
  masteryOn: boolean;
  /** Equipped skin id for the selected element (null = default look), rendered by the peer. */
  skin: string | null;
  /**
   * Quantum only: the distinct elements this player's loadout carries, Click's first. The
   * peer needs it to build a replica that starts as the right element — and `elementId` above
   * is already that first element rather than `'quantum'`, so a peer that ignores this field
   * still gets a fighter that works, just one that never shifts. Their shifts then arrive as
   * `qswap` messages.
   */
  bond: string[] | null;
  ready: boolean;
}

/** Technology element events that the cast relay can't carry. */
export type NetTechMsg =
  | { t: 'tech'; k: 'malware'; kind: 'goose' | 'clippy' | 'pong' }
  | { t: 'tech'; k: 'steer'; d: 'up' | 'down' | 'left' | 'right' }
  | { t: 'tech'; k: 'quiz'; pass: boolean }
  // Technology Mastery — the caster clicked their Byte-Bomb; shorten the replica's fuse too.
  | { t: 'tech'; k: 'bytefuse' };

/** Silence upgrade events that the cast relay / state stream can't carry. */
export type NetSilenceMsg =
  // Victim → caster: the victim's sim caught its local fighter in a seeker cone.
  | { t: 'sil'; k: 'panic'; ms: number }
  // Caster → victim: striker transform toggled (terror is caster-local state).
  | { t: 'sil'; k: 'striker'; on: boolean }
  // Caster → victim: maze layout seed so both sims build identical walls.
  | { t: 'sil'; k: 'maze'; seed: number }
  // Victim → caster: vulture dropped the victim here — replay the blood FX.
  | { t: 'sil'; k: 'vulture-drop'; x: number; y: number }
  // ── Silence Mastery — Puppetmaster (all caster → victim) ────────
  // The effigy was planted here. Sent explicitly rather than derived, so both sims
  // agree on the exact spot the Ritual has to land on.
  | { t: 'sil'; k: 'doll'; x: number; y: number }
  // The caster put something into the doll: `dmg` is the already-relayed amount the
  // victim applies to itself; `left` is the doll's remaining HP for their bar.
  | { t: 'sil'; k: 'doll-hit'; dmg: number; left: number }
  | { t: 'sil'; k: 'doll-gone' }
  // Possession start/stop. `dmg` carries the parting hit from a voluntary hand-back.
  | { t: 'sil'; k: 'awaken'; on: boolean; dmg?: number }
  // 20 Hz drive vector + aim for the possessed body, while possession lasts.
  | { t: 'sil'; k: 'puppet-move'; vx: number; vy: number; fa: number };

/**
 * Illusion events the cast relay can't carry — things only one sim knows (where the cursor is,
 * what is under a mask) or positions that belong to the other side's state stream.
 */
export type NetIllusionMsg =
  // Illusionist → victim, 20 Hz while a Guise is up: the clone is here. The cast relay already
  // shrank and hid the illusionist on the victim's sim; only the illusionist knows their cursor.
  | { t: 'ill'; k: 'clone'; x: number; y: number }
  // Illusionist → victim: F+ Re-Trick — I swapped into the clone, which stood here. The victim
  // ends the Guise silently, so the body they were chasing simply becomes real.
  | { t: 'ill'; k: 'retrick'; x: number; y: number }
  // Illusionist → victim: Reality Shift (mastery) fired. Decided on the illusionist's sim, the
  // only one that sees every hit they take; the jump itself rides their state stream, so this
  // carries only the flash and, mid-Dance, the Bomb Dance volley the shift throws.
  | { t: 'ill'; k: 'shift' }
  // Victim → illusionist: I clicked on your face. Resolved entirely on the illusionist's sim,
  // because the whole ability is that the person reaching does not know what they will find:
  // a mask comes off, and an empty face costs them 15.
  | { t: 'ill'; k: 'grab' }
  // Illusionist → victim: the mask is on / off. Sent so the victim's sim can keep hiding the
  // bonus in the damage numbers it draws — never so it can draw the mask, which it must not.
  | { t: 'ill'; k: 'mask'; on: boolean };

/**
 * Psychic events, and the one element whose netcode runs *backwards*.
 *
 * Opened Eyes is not something the psychic does to you — it is something you do to yourself.
 * Both machines can see who picked what, so the psychic's opponent delays their own casts on
 * their own sim (where their shots are actually fired from, and therefore the only place a
 * two-second delay is real rather than cosmetic) and relays the resulting queue back for the
 * psychic to draw. Everything else here is the ordinary attacker → victim direction.
 */
export type NetPsychicMsg =
  // Victim → psychic (≈6 Hz, on change + heartbeat): the abilities sitting in my delayed-cast
  // queue, soonest first, with how many ms each has left.
  | { t: 'psy'; k: 'queue'; ids: string[]; ms: number[] }
  // Psychic → victim: one of my pieces moved. Spawns ride the ordinary cast relay, so both sims
  // number each owner's pieces in the same order and `id` is that serial.
  | { t: 'psy'; k: 'move'; id: number; x: number; y: number }
  // Psychic → victim: as the queen, I slid to here. My body is streamed; this is so the slide's
  // hits and landing are drawn on your side too.
  | { t: 'psy'; k: 'qmove'; x: number; y: number }
  // Psychic → victim (F upgrade, Castle): I swapped with my rook `id`; it came down at (x, y),
  // where I was standing. My body is streamed; the rook's new square and its slam are not.
  | { t: 'psy'; k: 'castle'; id: number; x: number; y: number }
  // Psychic → victim (mastery, Pre-move): I have predicted your `key` ('click', 'e', 'r', 'f',
  // 'q', 'space', 'w', 'a', 's' or 'd'). Your own sim watches your keys for the next `ms` and
  // punishes the first press of it.
  | { t: 'psy'; k: 'premove'; key: string; ms: number }
  // Victim → psychic: your Pre-move caught me pressing `key`. My sim has already stunned, slowed
  // and stretched my own cooldown; your sim deals the burst, so the damage stays attacker-side.
  | { t: 'psy'; k: 'premoved'; key: string };

/**
 * Paint (element id `chalk`). Everything Paint does is *what the player painted*, which no cast
 * relay can carry — so the painter streams it. All painter → victim.
 */
export type NetPaintMsg =
  // The Splotch shape every shot of mine now flies as: [forward, right, kind] per blob, world px.
  | { t: 'pnt'; k: 'brush'; d: number[] }
  // Dabs I just laid on the floor in my open window (E, R or Q): [x, y, kind, linked] each.
  | { t: 'pnt'; k: 'pts'; d: number[] }
  // My window closed — run its fuse / buckets now rather than on your clock.
  | { t: 'pnt'; k: 'end' }
  // My Still Life of you: [dx, dy, kind, linked] about your centre, world px.
  | { t: 'pnt'; k: 'still'; d: number[] }
  // Yin-Yang: white on my bars and black on yours, [slot, u%, v%] per dab.
  | { t: 'pnt'; k: 'yy'; own: number[]; foe: number[] };

/**
 * Conquest ships its whole board rather than events.
 *
 * Every other element's online state is a handful of timers, so a relayed cast plus the peer's
 * own replay of it is enough. Conquest's state is 126 squares, up to eighteen buildings with
 * two upgrade paths each, and a garrison — all of it derived from a chain of earlier decisions,
 * so a single dropped event leaves the two sims permanently disagreeing about who owns what.
 * The snapshot is a few hundred bytes at 4 Hz and cannot drift.
 */
export type NetConquestMsg = { t: 'cnq'; s: NetConquestSnap };

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
  /** Mansion room index this husk haunts (guest hides out-of-room replicas). */
  r?: number;
}

/** Host → guest: the mansion's authoritative room state, inside huskSnap. */
export interface NetMansionState {
  /** Room HP for rooms 1–8 (the hall is indestructible; 5–8 only exist in apocalypse). */
  hp: number[];
  /** Bitmask of lost rooms (bit 0 = room 1). */
  lost: number;
  /** Room index the current wave targets, or -1. */
  target: number;
  /** Apocalypse co-op: the second room under attack this wave, or -1. */
  t2?: number;
  /** True once the cellar's eye has been woken. */
  ap?: boolean;
  /** Corruption per room, quantised to 0–255. Indexed by room. */
  co?: number[];
  /** Bitmask of health tonics still on the kitchen shelf (bit 0 = first bottle). */
  tn?: number;
}

/** Host → guest: the City's state inside huskSnap (City co-op only). */
export interface NetCityState {
  /** The All-Element's health and max. */
  hp: number;
  mhp: number;
  /** Lanes the current wave is pouring out of. */
  ln: number[];
  /** The bots, in party order. */
  b: NetBotState[];
  /** Drafted mutations, each id prefixed with '*' once starred. */
  cu: string[];
}

/** One bot party member, as the guest needs to draw it. */
export interface NetBotState {
  e: string;
  x: number;
  y: number;
  hp: number;
  mhp: number;
  r: number;
  d: boolean;
  f: number;
  /** Bumped every attack, so the guest can play a swing for each one. */
  a: number;
}

export type NetMatchMode = 'pvp' | 'invasion';

/** One player's locked-in loadout, as the host's `start` hands it to everyone. */
export interface NetPartySel {
  elementId: string;
  perkId: string | null;
  upgrades?: string[];
  masteryBinds?: Record<string, string>;
  masteryOn?: boolean;
  skin?: string | null;
  bond?: string[] | null;
}

export interface NetPartyMember {
  slot: number;
  sel: NetPartySel;
}

export type NetMsg =
  | { t: 'hello'; version: number }
  | { t: 'sel'; elementId: string | null; perkId: string | null; upgrades?: string[]; masteryBinds?: Record<string, string>; masteryOn?: boolean; skin?: string | null; bond?: string[] | null; ready: boolean }
  | { t: 'mode'; mode: NetMatchMode; invasionDifficulty: string; invasionMap?: 'city' | 'mansion'; invasionParty?: number }
  | {
      t: 'start';
      mode: NetMatchMode;
      invasionDifficulty?: string;
      invasionMap?: 'city' | 'mansion';
      invasionParty?: number;
      /** Every player in the room, by slot (0 = host). */
      party: NetPartyMember[];
    }
  // inv/fa/st: Silence remaster — invisibility flag, facing angle (radians), stealth meter.
  // dm/fr/dc: the sender's own damage reduction, cap and flat soak, applied by the peer's
  // sim when it resolves a hit on their replica of us (see Fighter.netDefenseMult).
  // room: the mansion room this player is standing in (invasion co-op only).
  | { t: 'state'; x: number; y: number; vx: number; vy: number; hp: number; maxHp: number; shieldHp: number; shieldCharges: number; downed?: boolean; inv?: boolean; fa?: number; st?: number; dm?: number; fr?: number; dc?: number; room?: number }
  | { t: 'cast'; id: string; tx: number; ty: number }
  // ── Room plumbing (NetworkManager-internal; never reaches a handler) ──
  // Host → guest: the slots now in the room, and which one is yours.
  | { t: 'peers'; slots: number[]; you: number }
  // Host → would-be joiner: the room is full or mid-match.
  | { t: 'full' }
  // Host → guest: `m` came from player `from`. Guest → host: deliver `m` to player `to`.
  | { t: 'relay'; from?: number; to?: number; m: NetMsg }
  | { t: 'hit'; amount: number }
  // Attacker → victim: a hit the attacker's sim resolved against its replica of the
  // victim. All multipliers already applied; the victim runs only its own absorb layers.
  | { t: 'dmg'; a: number; p?: 1; f?: 1; tr?: 1 }
  // Attacker → victim (10 Hz): status effects the attacker currently has on the victim.
  | { t: 'fx'; e: NetStatusEntry[]; spd: number; cd: number }
  // Attacker → victim: a knockback/pull the attacker's sim applied to its replica.
  | { t: 'push'; vx: number; vy: number; ms: number }
  // Quantum: the sender shifted onto another of their elements. Self-contained on purpose —
  // the receiver re-keys its replica of them wholesale, because a Quantum's upgrades, mastery
  // binds and skin all belong to the half being worn rather than to the fighter.
  | { t: 'qswap'; elementId: string; upgrades: string[]; masteryBinds: Record<string, string>; masteryOn: boolean; skin: string | null }
  | { t: 'death' }
  | { t: 'lobby' }
  | { t: 'ping'; ts: number }
  | { t: 'pong'; ts: number }
  // ── Invasion co-op (host → guest unless noted) ──────────────────
  | { t: 'huskSnap'; wave: number; shards: number; remaining: number; husks: NetHuskState[]; m?: NetMansionState; c?: NetCityState }
  // Host → guest (City): a wave was announced out of these lanes.
  | { t: 'cityWarn'; wave: number; lanes: number[] }
  // Guest → host (City): the guest kept this draft card. Mutations and boons land on the
  // host's sim; the rest were already applied to the guest's own loadout. Also tells the
  // host the guest is done drafting, so the next wave can start.
  | { t: 'cityPick'; kind: string; id: string }
  // Host → guest: a wave was announced — show the target-room warning.
  | { t: 'waveWarn'; wave: number; room: number }
  // Host → guest: a room fell. The snap's mansion state seals it; this shows the banner.
  | { t: 'roomLost'; room: number }
  // Either → either: somebody held the cellar's eye for five seconds. Both sides
  // flip into apocalypse; the guest's own mansion unfolds its corner wings.
  | { t: 'apoc' }
  // Either → either: a health tonic left the shared shelf.
  | { t: 'tonic'; slot: number }
  // Host → guest: a room's corruption was seeded, took the room, or was cut out.
  | { t: 'corrupt'; room: number; kind: 'seeded' | 'taken' | 'cleansed' }
  // Guest → host: the guest aligned a constellation and the run's shared purse
  // paid for it. The host owns the ledger that gets banked at the end.
  | { t: 'shardSpend'; amount: number }
  | { t: 'huskDeath'; id: number; reward: number; x: number; y: number }
  | { t: 'waveClear'; wave: number; bonus: number }
  | { t: 'huskDamage'; id: number; amount: number } // guest → host
  | { t: 'huskStatus'; id: number; s: HuskStatus }  // guest → host
  // Silence Mastery — Puppetmaster in co-op: the guest is steering one of the host's
  // husks. The host holds its AI off and puts it wherever the guest says. guest → host.
  | { t: 'huskPuppet'; id: number; on: boolean; x: number; y: number }
  | { t: 'allyBite'; damage: number }
  // Husk variant effects: cosmetic replays on the guest — the host already
  // resolved any damage they represent and reports it via 'allyBite'.
  | { t: 'huskFx'; fx: InvasionFx }
  | { t: 'boss'; name: string; color: string }
  | { t: 'revived' } // reviver → the one revived (sendTo)
  | { t: 'runEnd'; wavesCompleted: number; shardsEarned: number }
  | NetTechMsg
  | NetSilenceMsg
  | NetIllusionMsg
  | NetPsychicMsg
  | NetPaintMsg
  | NetConquestMsg;

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

/** `from` is the player slot the message came from (0 = host). */
type MsgHandler = (msg: NetMsg, from: number) => void;
type StatusHandler = (status: NetStatus, detail?: string) => void;
/** The room's membership changed (someone joined or left while others stayed). */
type PeersHandler = (slots: number[]) => void;

/**
 * Guest → host messages the host passes on to the other guests, tagged with who sent them.
 * Everything else a guest says is for the host alone (husk damage, draft picks, …).
 */
const RELAYED = new Set<NetMsg['t']>(['state', 'cast', 'hit', 'sel', 'lobby', 'qswap']);

/**
 * Singleton wrapper around the room's PeerJS links. Lives outside the Phaser scene graph so
 * the connections survive scene transitions (Lobby → Arena → GameOver → Lobby).
 *
 * A star: the host holds one link per guest (slots 1–3) and every guest holds one link to the
 * host (slot 0). A guest's broadcast reaches the other guests through the host, which tags it
 * with the sender's slot, so every handler is told who a message came from. A 1v1 room is
 * just the one-guest case.
 */
class NetworkManager {
  private peer: Peer | null = null;
  /** Host: one link per guest, by slot. Guest: the host's link, at slot 0. */
  private links = new Map<number, DataConnection>();
  private latency = new Map<number, number>();
  private msgHandlers = new Set<MsgHandler>();
  private statusHandlers = new Set<StatusHandler>();
  private peersHandlers = new Set<PeersHandler>();
  private pingTimer: ReturnType<typeof setInterval> | null = null;

  public status: NetStatus = 'idle';
  public isHost = false;
  public roomCode: string | null = null;
  /** Worst round trip among our links. */
  public latencyMs = 0;
  /** Set when the peer reported a protocol version different from ours. */
  public versionMismatch = false;
  /** Our player slot: 0 for the host, 1–3 for a guest (told by the host). */
  public mySlot = 0;
  /** Every slot in the room, ours included, ascending. */
  public slots: number[] = [];
  /** Host: a match is running — turn new joiners away. */
  public locked = false;

  get connected(): boolean {
    if (this.status !== 'connected') return false;
    for (const c of this.links.values()) if (c.open) return true;
    return false;
  }

  /** The other players in the room, ascending. */
  get otherSlots(): number[] {
    return this.slots.filter((s) => s !== this.mySlot);
  }

  // ── Lifecycle ────────────────────────────────────────────────────

  /** Create a lobby. Resolves the room code via status events ('hosting'). */
  host(): void {
    this.disconnect();
    this.isHost = true;
    this.mySlot = 0;
    this.slots = [0];
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
      const slot = this.freeSlot();
      if (slot < 0 || this.locked) {
        // Full, or a match is on — politely refuse.
        conn.on('open', () => {
          try { conn.send({ t: 'full' } satisfies NetMsg); } catch { /* gone already */ }
          setTimeout(() => conn.close(), 300);
        });
        return;
      }
      this.adoptConnection(conn, slot);
    });

    peer.on('error', (err) => {
      if (this.peer !== peer) return;
      const type = (err as { type?: string }).type;
      if (type === 'unavailable-id' && attempt < 4) {
        peer.destroy();
        this.openHostPeer(attempt + 1);
        return;
      }
      // A guest's link failing is not the room failing.
      if (type === 'peer-unavailable' || type === 'webrtc') return;
      this.fail(this.describePeerError(type));
    });

    peer.on('disconnected', () => {
      // Lost signaling server; existing data connections keep working, but new
      // guests could not find us — reconnect so the code stays joinable.
      if (this.peer === peer && !peer.destroyed) peer.reconnect();
    });
  }

  /** Lowest unclaimed guest slot, or -1 when the room is full. Pending links hold their slot. */
  private reserved = new Set<number>();
  private freeSlot(): number {
    for (let s = 1; s < MAX_PLAYERS; s++) {
      if (!this.links.has(s) && !this.reserved.has(s)) return s;
    }
    return -1;
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
      this.adoptConnection(conn, 0);
    });

    peer.on('error', (err) => {
      if (this.peer !== peer) return;
      const type = (err as { type?: string }).type;
      this.fail(this.describePeerError(type));
    });
  }

  /** Host: `slot` is the guest's. Guest: always 0, the host. */
  private adoptConnection(conn: DataConnection, slot: number): void {
    if (this.isHost) this.reserved.add(slot);
    else this.links.set(0, conn);

    conn.on('open', () => {
      if (this.isHost) {
        this.reserved.delete(slot);
        if (this.links.has(slot) || !this.peer) { conn.close(); return; }
        this.links.set(slot, conn);
        this.slots = [0, ...[...this.links.keys()].sort((a, b) => a - b)];
        this.raw(conn, { t: 'hello', version: NET_PROTOCOL_VERSION });
        this.startPingLoop();
        if (this.status !== 'connected') {
          this.versionMismatch = false;
          this.setStatus('connected');
        }
        this.broadcastPeers();
        this.emitPeers();
      } else {
        if (this.links.get(0) !== conn) return;
        this.versionMismatch = false;
        this.raw(conn, { t: 'hello', version: NET_PROTOCOL_VERSION });
        this.startPingLoop();
        // 'connected' waits for the host's 'peers' — until then we don't know our slot.
      }
    });

    conn.on('data', (data) => {
      if (this.isHost ? this.links.get(slot) !== conn : this.links.get(0) !== conn) return;
      const msg = data as NetMsg;
      if (!msg || typeof msg.t !== 'string') return;
      switch (msg.t) {
        case 'ping': this.raw(conn, { t: 'pong', ts: msg.ts }); return;
        case 'pong':
          this.latency.set(slot, Math.max(0, Date.now() - msg.ts));
          this.latencyMs = Math.max(0, ...this.latency.values());
          return;
        case 'hello':
          if (msg.version !== NET_PROTOCOL_VERSION) this.versionMismatch = true;
          return;
        case 'full':
          if (!this.isHost) this.fail('That room is full (or already playing)');
          return;
        case 'peers': {
          if (this.isHost) return;
          this.mySlot = msg.you;
          this.slots = [...msg.slots].sort((a, b) => a - b);
          if (this.status !== 'connected') this.setStatus('connected');
          else this.emitPeers();
          return;
        }
        case 'relay': {
          if (this.isHost) {
            // A guest wants this to reach one particular player.
            const to = msg.to ?? 0;
            if (to === 0) this.dispatch(msg.m, slot);
            else { const c = this.links.get(to); if (c?.open) this.raw(c, { t: 'relay', from: slot, m: msg.m }); }
          } else {
            this.dispatch(msg.m, msg.from ?? 0);
          }
          return;
        }
        default:
          break;
      }
      if (this.isHost && RELAYED.has(msg.t)) {
        for (const [s, c] of this.links) {
          if (s !== slot && c.open) this.raw(c, { t: 'relay', from: slot, m: msg });
        }
      }
      this.dispatch(msg, this.isHost ? slot : 0);
    });

    const onGone = () => {
      if (this.isHost) {
        this.reserved.delete(slot);
        if (this.links.get(slot) !== conn) return;
        this.links.delete(slot);
        this.latency.delete(slot);
        this.slots = [0, ...[...this.links.keys()].sort((a, b) => a - b)];
        if (this.links.size === 0) {
          this.stopPingLoop();
          // Keep the room open so another (or the same) friend can rejoin.
          if (this.peer && !this.peer.destroyed) this.setStatus('hosting', 'Your friend disconnected');
        } else {
          this.broadcastPeers();
          this.emitPeers();
        }
      } else {
        if (this.links.get(0) !== conn) return;
        this.links.delete(0);
        this.stopPingLoop();
        this.fail('The host disconnected');
      }
    };
    conn.on('close', onGone);
    conn.on('error', onGone);
  }

  private dispatch(msg: NetMsg, from: number): void {
    for (const h of [...this.msgHandlers]) h(msg, from);
  }

  private broadcastPeers(): void {
    for (const [s, c] of this.links) {
      if (c.open) this.raw(c, { t: 'peers', slots: this.slots, you: s });
    }
  }

  private emitPeers(): void {
    for (const h of [...this.peersHandlers]) h(this.slots);
  }

  /** Tear everything down and return to idle. */
  disconnect(): void {
    this.stopPingLoop();
    for (const c of this.links.values()) { try { c.close(); } catch { /* already closed */ } }
    if (this.peer) { try { this.peer.destroy(); } catch { /* already destroyed */ } }
    this.links.clear();
    this.latency.clear();
    this.reserved.clear();
    this.peer = null;
    this.roomCode = null;
    this.isHost = false;
    this.mySlot = 0;
    this.slots = [];
    this.locked = false;
    this.latencyMs = 0;
    this.versionMismatch = false;
    this.status = 'idle';
  }

  private fail(detail: string): void {
    for (const c of this.links.values()) { try { c.close(); } catch { /* noop */ } }
    if (this.peer) { try { this.peer.destroy(); } catch { /* noop */ } }
    this.links.clear();
    this.latency.clear();
    this.reserved.clear();
    this.peer = null;
    this.slots = [];
    this.locked = false;
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

  private raw(conn: DataConnection, msg: NetMsg): void {
    try { conn.send(msg); } catch { /* connection died mid-send */ }
  }

  /** To everyone else in the room (a guest's goes to the host, which passes the relayed kinds on). */
  send(msg: NetMsg): void {
    for (const c of this.links.values()) if (c.open) this.raw(c, msg);
  }

  /** To one player. A guest's message for another guest is carried by the host. */
  sendTo(slot: number, msg: NetMsg): void {
    if (slot === this.mySlot) return;
    if (this.isHost) {
      const c = this.links.get(slot);
      if (c?.open) this.raw(c, msg);
      return;
    }
    const host = this.links.get(0);
    if (!host?.open) return;
    this.raw(host, slot === 0 ? msg : { t: 'relay', to: slot, m: msg });
  }

  onMessage(h: MsgHandler): void { this.msgHandlers.add(h); }
  offMessage(h: MsgHandler): void { this.msgHandlers.delete(h); }
  onStatus(h: StatusHandler): void { this.statusHandlers.add(h); }
  offStatus(h: StatusHandler): void { this.statusHandlers.delete(h); }
  onPeers(h: PeersHandler): void { this.peersHandlers.add(h); }
  offPeers(h: PeersHandler): void { this.peersHandlers.delete(h); }

  private setStatus(s: NetStatus, detail?: string): void {
    this.status = s;
    for (const h of [...this.statusHandlers]) h(s, detail);
  }

  private startPingLoop(): void {
    if (this.pingTimer !== null) return;
    this.pingTimer = setInterval(() => {
      for (const c of this.links.values()) if (c.open) this.raw(c, { t: 'ping', ts: Date.now() });
    }, 2000);
  }

  private stopPingLoop(): void {
    if (this.pingTimer !== null) { clearInterval(this.pingTimer); this.pingTimer = null; }
  }
}

export const Net = new NetworkManager();
