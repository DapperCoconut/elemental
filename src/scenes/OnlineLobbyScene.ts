import Phaser from 'phaser';
import * as PlayerData from '../data/PlayerData';
import { isMasteryComplete } from '../data/Mastery';
import { getQuantumLoadout, loadoutElements, upgradesFor } from '../data/QuantumLoadout';
import { getPerksForElement, perkLoadoutBadge } from '../data/Perks';
import { Net, NetMsg, NetStatus, NetMatchMode, NetPartyMember, NetPartySel, MAX_PLAYERS } from '../network/NetworkManager';
import { INVASION_DIFFICULTIES } from '../invasion/InvasionKit';
import { allSelectableElements, findElementDef } from '../data/ElementRoster';
import {
  C, T, DEPTH, FONT_DISPLAY, FONT_UI, hex, mix,
  addBackdrop, addButton, addCardPlate, addPanel, addTitle, addWell, showToast, UiButton,
  ALL_CORNERS, ElementPortrait, fillNotchedGradient, strokeNotched,
} from '../ui';
import { Music } from '../audio';

type LobbyPhase = 'entry' | 'hosting' | 'joining' | 'room';

interface Loadout {
  elementId: string | null;
  perkId: string | null;
  upgrades: string[];
  masteryBinds: Record<string, string>;
  masteryOn: boolean;
  skin: string | null;
  /** Quantum only: the elements the loadout carries, Click's first. `elementId` is the first. */
  bond: string[] | null;
  ready: boolean;
}

/** Another player in the room, as their 'sel' messages describe them. */
interface OtherPlayer extends Loadout {
  /** False while they are still on a results screen. */
  inLobby: boolean;
}

/** One row of the right-hand roster panel. */
interface RosterRow {
  well: Phaser.GameObjects.Graphics;
  xy: { x: number; y: number };
  portrait: ElementPortrait | null;
  portraitId: string | null;
  placeholder: Phaser.GameObjects.Text | null;
  tag: Phaser.GameObjects.Text;
  name: Phaser.GameObjects.Text;
  perk: Phaser.GameObjects.Text;
  ready: Phaser.GameObjects.Text;
}

const blankLoadout = (): Loadout => ({
  elementId: null, perkId: null, upgrades: [], masteryBinds: {}, masteryOn: false, skin: null, bond: null, ready: false,
});

/** The lobby's own accent — a teal that reads as "network", not "element". */
const ACCENT = 0x2ee6c0;

export class OnlineLobbyScene extends Phaser.Scene {
  private phase: LobbyPhase = 'entry';
  private phaseObjects: Phaser.GameObjects.GameObject[] = [];

  private mySel: Loadout = blankLoadout();
  /** Everyone else in the room, by player slot. */
  private others = new Map<number, OtherPlayer>();

  private roomMode: NetMatchMode = 'pvp';
  private roomInvasionDifficulty = 'normal';
  /** Co-op map (City or the legacy Mansion) and, for the City, the party size bots fill out to. */
  private roomInvasionMap: 'city' | 'mansion' = 'city';
  private roomInvasionParty = 3;
  private mapLabel: Phaser.GameObjects.Text | null = null;
  private pvpPaint: ((state: 'idle' | 'hover' | 'active') => void) | null = null;
  private coopPaint: ((state: 'idle' | 'hover' | 'active') => void) | null = null;
  private diffLabel: Phaser.GameObjects.Text | null = null;
  private oppPanelHeader: Phaser.GameObjects.Text | null = null;

  private joinCode = '';
  private joinError = '';
  private toastText: Phaser.GameObjects.Text | null = null;
  private pingText: Phaser.GameObjects.Text | null = null;

  // Room-phase widgets that get refreshed in place
  /** The other players, one row each (up to three), with a live portrait per row. */
  private rosterRows: RosterRow[] = [];
  private myPerkLabel: Phaser.GameObjects.Text | null = null;
  private readyBtn: UiButton | null = null;
  private startBtn: UiButton | null = null;
  private tileByElement = new Map<string, { paint: (state: 'idle' | 'hover' | 'active') => void }>();
  private perkList: { id: string | null; name: string }[] = [];
  private perkIdx = 0;

  private readonly msgHandler = (msg: NetMsg, from: number) => this.onNetMessage(msg, from);
  private readonly statusHandler = (status: NetStatus, detail?: string) => this.onNetStatus(status, detail);
  private readonly peersHandler = () => this.onPeersChanged();

  constructor() {
    super({ key: 'OnlineLobbyScene' });
  }

  create(): void {
    Music.play('online');
    const { width, height } = this.scale;

    this.phaseObjects = [];
    this.mySel = blankLoadout();
    this.others.clear();
    // Back in the lobby: the room takes joiners again.
    Net.locked = false;
    this.roomMode = 'pvp';
    this.roomInvasionDifficulty = 'normal';
    this.roomInvasionMap = 'city';
    this.roomInvasionParty = 3;
    this.joinCode = '';
    this.joinError = '';
    this.toastText = null;

    addBackdrop(this, { accent: ACCENT, variant: 'void', motes: 22 });
    addTitle(this, { x: width / 2, y: 48, text: 'ONLINE BATTLE', accent: ACCENT, size: 38 });
    void height;

    this.pingText = this.add.text(width - 16, 16, '', {
      fontSize: '12px', fontFamily: FONT_DISPLAY, color: hex(mix(ACCENT, 0xffffff, 0.4)), letterSpacing: 1,
    }).setOrigin(1, 0).setDepth(DEPTH.content + 10);
    this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        this.pingText?.setText(Net.connected ? `📶 ${Net.latencyMs} ms` : '');
      },
    });

    Net.onMessage(this.msgHandler);
    Net.onStatus(this.statusHandler);
    Net.onPeers(this.peersHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      Net.offMessage(this.msgHandler);
      Net.offStatus(this.statusHandler);
      Net.offPeers(this.peersHandler);
    });

    this.input.keyboard!.on('keydown', this.handleKey, this);

    // Coming back from a finished match (or a mid-session revisit): if the
    // connection is still alive, drop straight into the room.
    if (Net.connected) {
      Net.send({ t: 'lobby' });
      this.syncOthers();
      this.showRoom();
      this.pushMySelection();
    } else if (Net.status === 'hosting') {
      this.showHosting();
    } else {
      Net.disconnect();
      this.showEntry();
    }
  }

  // ── Phase rendering ──────────────────────────────────────────────

  private clearPhase(): void {
    for (const o of this.phaseObjects) o.destroy();
    this.phaseObjects = [];
    for (const r of this.rosterRows) r.portrait?.destroy();
    this.rosterRows = [];
    this.myPerkLabel = null;
    this.readyBtn = null;
    this.startBtn = null;
    this.pvpPaint = null;
    this.coopPaint = null;
    this.diffLabel = null;
    this.oppPanelHeader = null;
    this.tileByElement.clear();
  }

  private showEntry(): void {
    this.clearPhase();
    this.phase = 'entry';
    const { width, height } = this.scale;
    const cx = width / 2;

    this.addPhaseText(cx, 150, `Battle a friend, or defend the city with up to ${MAX_PLAYERS - 1} of them — one hosts, the rest join with the room code.`, {
      fontSize: '16px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif', color: '#8899aa',
    }).setOrigin(0.5);

    this.makeButton(cx, 260, 300, 74, 'HOST GAME', C.verdant, () => {
      Net.host();
      this.showHosting();
    }, '🏠');
    this.makeButton(cx, 360, 300, 74, 'JOIN GAME', C.frost, () => {
      this.showJoining();
    }, '🔑');
    this.makeButton(cx, height - 60, 200, 48, 'BACK', C.steel, () => {
      Net.disconnect();
      this.scene.start('TitleScene');
    });
  }

  private showHosting(): void {
    this.clearPhase();
    this.phase = 'hosting';
    const { width, height } = this.scale;
    const cx = width / 2;

    this.addPhaseText(cx, 170, 'ROOM CODE', {
      fontSize: '18px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif', color: '#8899aa',
    }).setOrigin(0.5);

    const codeText = this.addPhaseText(cx, 235, Net.roomCode ?? '····', {
      fontSize: '72px',
      fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
      color: hex(mix(C.gold, 0xffffff, 0.3)),
      stroke: hex(mix(C.gold, 0x000000, 0.75)),
      strokeThickness: 5,
      letterSpacing: 18,
    } as Phaser.Types.GameObjects.Text.TextStyle).setOrigin(0.5);

    const waiting = this.addPhaseText(cx, 330, 'Waiting for players', {
      fontSize: '20px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif', color: '#44ccaa',
    }).setOrigin(0.5);
    this.tweens.add({ targets: waiting, alpha: 0.35, duration: 700, yoyo: true, repeat: -1 });

    this.addPhaseText(cx, 380, `Friends pick JOIN GAME and type this code — up to ${MAX_PLAYERS} players for co-op.`, {
      fontSize: '14px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif', color: '#667788',
    }).setOrigin(0.5);

    // Room code may not be claimed yet — refresh once it is.
    if (!Net.roomCode) {
      this.time.addEvent({
        delay: 200,
        repeat: 24,
        callback: () => {
          if (this.phase === 'hosting' && Net.roomCode && codeText.active) {
            codeText.setText(Net.roomCode);
          }
        },
      });
    }

    this.makeButton(cx, height - 60, 200, 48, 'CANCEL', C.steel, () => {
      Net.disconnect();
      this.showEntry();
    });
  }

  private showJoining(): void {
    this.clearPhase();
    this.phase = 'joining';
    const { width, height } = this.scale;
    const cx = width / 2;

    this.addPhaseText(cx, 170, 'ENTER ROOM CODE', {
      fontSize: '18px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif', color: '#8899aa',
    }).setOrigin(0.5);

    const codeBox = addWell(this, cx, 245, 330, 92, C.frost, DEPTH.panel, 10);
    this.phaseObjects.push(codeBox);
    const codeText = this.addPhaseText(cx, 245, '', {
      fontSize: '56px',
      fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
      color: '#ffffff',
      letterSpacing: 14,
    } as Phaser.Types.GameObjects.Text.TextStyle).setOrigin(0.5).setName('joinCodeText');

    const refresh = () => codeText.setText(this.joinCode.padEnd(4, '·'));
    refresh();

    this.addPhaseText(cx, 315, 'Type the 4-letter code, then press ENTER', {
      fontSize: '14px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif', color: '#667788',
    }).setOrigin(0.5);

    this.addPhaseText(cx, 350, '', {
      fontSize: '15px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif', color: '#ff5555',
    }).setOrigin(0.5).setName('joinErrorText');

    this.makeButton(cx, 425, 240, 56, 'JOIN', C.frost, () => this.tryJoin(), '▶');
    this.makeButton(cx, height - 60, 200, 48, 'BACK', C.steel, () => {
      Net.disconnect();
      this.showEntry();
    });
  }

  private tryJoin(): void {
    if (this.joinCode.length < 4) {
      this.setJoinError('Code must be 4 characters');
      return;
    }
    this.setJoinError('');
    this.setJoinStatus('Connecting…');
    Net.join(this.joinCode);
  }

  private setJoinError(msg: string): void {
    this.joinError = msg;
    const t = this.children.getByName('joinErrorText') as Phaser.GameObjects.Text | null;
    if (t) { t.setColor('#ff5555'); t.setText(msg); }
  }

  private setJoinStatus(msg: string): void {
    const t = this.children.getByName('joinErrorText') as Phaser.GameObjects.Text | null;
    if (t) { t.setColor('#44ccaa'); t.setText(msg); }
  }

  // ── Room (connected) phase ───────────────────────────────────────

  private showRoom(): void {
    this.clearPhase();
    this.phase = 'room';
    const { width, height } = this.scale;
    const cx = width / 2;

    this.mySel.ready = false;

    this.addPhaseText(cx, 92, `ROOM ${Net.roomCode ?? ''}   —   ${Net.isHost ? 'you are hosting' : `joined as player ${Net.mySlot + 1}`}`, {
      fontSize: '15px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif', color: '#8899aa',
    }).setOrigin(0.5);

    // ── Match mode + invasion difficulty (host-controlled) ──────────
    const modeTile = (x: number, w: number, label: string, accent: number, onPick: () => void) => {
      const plate = addCardPlate(this, { x, y: 122, w, h: 28, accent, cut: 8 });
      this.add.text(x, 122, label, {
        fontSize: '12px', fontFamily: FONT_DISPLAY, color: T.bright, letterSpacing: 1,
      }).setOrigin(0.5).setDepth(DEPTH.content);
      this.phaseObjects.push(plate.g);
      if (Net.isHost) {
        const hit = this.add.rectangle(x, 122, w, 28, 0xffffff, 0)
          .setDepth(DEPTH.content + 1)
          .setInteractive({ useHandCursor: true })
          .on('pointerdown', onPick);
        this.phaseObjects.push(hit);
      }
      return plate.paint;
    };
    this.pvpPaint = modeTile(cx - 110, 130, '⚔ PVP', C.verdant, () => this.setRoomMode('pvp'));
    this.coopPaint = modeTile(cx + 30, 140, '🧟 CO-OP', C.arcane, () => this.setRoomMode('invasion'));

    const diffArrow = (x: number, dir: -1 | 1) => {
      const a = this.add.text(x, 122, dir < 0 ? '◀' : '▶', {
        fontSize: '13px', fontFamily: FONT_DISPLAY, color: T.dim,
      }).setOrigin(0.5).setDepth(DEPTH.content);
      this.phaseObjects.push(a);
      if (Net.isHost) {
        a.setInteractive({ useHandCursor: true })
          .on('pointerover', () => a.setColor(T.bright))
          .on('pointerout', () => a.setColor(T.dim))
          .on('pointerdown', () => this.cycleInvasionDifficulty(dir));
      }
      return a;
    };
    diffArrow(cx + 150, -1);
    diffArrow(cx + 250, 1);
    this.diffLabel = this.addPhaseText(cx + 200, 122, '', {
      fontSize: '12px', fontFamily: FONT_DISPLAY, color: T.gold, letterSpacing: 1,
    }).setOrigin(0.5);
    // Map + party: one label the host clicks through — City ×2/×3/×4, then the Mansion.
    this.mapLabel = this.addPhaseText(cx + 340, 122, '', {
      fontSize: '12px', fontFamily: FONT_DISPLAY, color: T.bright, letterSpacing: 1,
    }).setOrigin(0.5);
    if (Net.isHost) {
      this.mapLabel.setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.cycleInvasionMap());
    }

    // ── My panel (left) ─────────────────────────────
    const panelY = 148;
    const panelH = 400;
    const myPanel = addPanel(this, {
      x: 250, y: panelY + panelH / 2, w: 460, h: panelH,
      accent: ACCENT, title: 'YOUR LOADOUT', glow: 0.35,
    });
    this.phaseObjects.push(...myPanel.objects);

    // Element grid — every element this save has unlocked (dummy excluded).
    // Compact 8-wide tiles so even a fully-unlocked save (30 elements, 4 rows)
    // stays clear of the perk row and READY button below.
    const pool = allSelectableElements();
    // A fully-unlocked save carries far more than the eight-wide grid was drawn for,
    // so the tiles shrink to keep the whole roster inside the panel.
    const dense = pool.length > 32;
    const tile = dense ? 38 : 48;
    const gap = dense ? 5 : 6;
    const cols = Math.min(pool.length, Math.floor((440 + gap) / (tile + gap)));
    const gridW = cols * tile + (cols - 1) * gap;
    const gx0 = 250 - gridW / 2 + tile / 2;
    const gy0 = panelY + 56;

    pool.forEach((el, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const bx = gx0 + col * (tile + gap);
      const by = gy0 + row * (tile + gap);

      const plate = addCardPlate(this, {
        x: bx, y: by, w: tile, h: tile, accent: el.color, cut: 9,
      });
      const emoji = this.add.text(bx, by - (dense ? 5 : 7), el.emoji, { fontSize: dense ? '15px' : '19px' })
        .setOrigin(0.5).setDepth(DEPTH.content);
      const name = this.add.text(bx, by + (dense ? 12 : 15), el.name, {
        fontSize: dense ? '7px' : '8px', fontFamily: FONT_UI, color: T.normal,
      }).setOrigin(0.5).setDepth(DEPTH.content);

      const hit = this.add.rectangle(bx, by, tile, tile, 0xffffff, 0)
        .setDepth(DEPTH.content + 1)
        .setInteractive({ useHandCursor: true });
      this.phaseObjects.push(plate.g, emoji, name, hit);
      this.tileByElement.set(el.id, { paint: plate.paint });

      hit.on('pointerover', () => { if (this.mySel.elementId !== el.id) plate.paint('hover'); });
      hit.on('pointerout', () => { if (this.mySel.elementId !== el.id) plate.paint('idle'); });
      hit.on('pointerdown', () => this.pickElement(el.id));
    });

    // Perk cycler
    const perkY = panelY + panelH - 84;
    this.addPhaseText(250, perkY - 22, 'PERK', {
      fontSize: '12px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#8899aa',
    }).setOrigin(0.5);
    const mkArrow = (x: number, dir: -1 | 1) => {
      const a = this.add.text(x, perkY, dir < 0 ? '◀' : '▶', {
        fontSize: '22px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif', color: '#ffffff',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      a.on('pointerover', () => a.setColor('#ffcc00'));
      a.on('pointerout', () => a.setColor('#ffffff'));
      a.on('pointerdown', () => this.cyclePerk(dir));
      this.phaseObjects.push(a);
    };
    mkArrow(250 - 150, -1);
    mkArrow(250 + 150, 1);
    this.myPerkLabel = this.addPhaseText(250, perkY, '—', {
      fontSize: '15px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif', color: '#ffcc88',
    }).setOrigin(0.5);

    // Ready button
    this.readyBtn = addButton(this, {
      x: 250, y: panelY + panelH - 32, w: 230, h: 46,
      label: 'READY UP', accent: C.gold, variant: 'solid', fontSize: 17,
      onClick: () => this.toggleReady(),
    });
    this.phaseObjects.push(this.readyBtn.container);

    // ── Roster panel (right) ────────────────────────
    const oppPanel = addPanel(this, {
      x: 710, y: panelY + panelH / 2, w: 400, h: panelH,
      accent: C.arcane, glow: 0.35,
    });
    this.phaseObjects.push(...oppPanel.objects);
    this.oppPanelHeader = this.addPhaseText(710, panelY + 22, 'OPPONENT', {
      fontSize: '16px', fontFamily: FONT_DISPLAY,
      color: hex(mix(C.arcane, 0xffffff, 0.5)), letterSpacing: 3,
    }).setOrigin(0.5);

    // One row per other player, each with their actual fighter standing in a lit well — the
    // same portrait the roster cards use.
    for (let i = 0; i < MAX_PLAYERS - 1; i++) {
      const rowY = panelY + 98 + i * 112;
      const xy = { x: 600, y: rowY };
      const well = this.add.graphics().setDepth(DEPTH.content);
      this.phaseObjects.push(well);
      const tag = this.addPhaseText(680, rowY - 34, '', {
        fontSize: '11px', fontFamily: FONT_DISPLAY, color: T.dim, letterSpacing: 2,
      }).setOrigin(0, 0.5);
      const name = this.addPhaseText(680, rowY - 12, '', {
        fontSize: '18px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#ffffff',
      }).setOrigin(0, 0.5);
      const perk = this.addPhaseText(680, rowY + 12, '', {
        fontSize: '13px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif', color: '#ffcc88',
      }).setOrigin(0, 0.5);
      const ready = this.addPhaseText(680, rowY + 34, '', {
        fontSize: '14px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#886666',
      }).setOrigin(0, 0.5);
      this.rosterRows.push({ well, xy, portrait: null, portraitId: null, placeholder: null, tag, name, perk, ready });
    }

    // ── Bottom bar: start / leave ───────────────────
    if (Net.isHost) {
      this.startBtn = addButton(this, {
        x: cx + 110, y: height - 52, w: 300, h: 56,
        label: 'START BATTLE', icon: '⚔', accent: C.verdant, variant: 'solid', fontSize: 19,
        onClick: () => this.hostStart(),
      });
      this.phaseObjects.push(this.startBtn.container);
    } else {
      this.addPhaseText(cx + 110, height - 52, 'The host starts the battle when everyone is ready.', {
        fontSize: '13px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif', color: '#667788',
      }).setOrigin(0.5);
    }

    this.makeButton(120, height - 52, 160, 48, 'LEAVE', C.blood, () => {
      Net.disconnect();
      this.showEntry();
    });

    // Default selection: fire + its equipped perk
    this.pickElement(this.mySel.elementId ?? 'fire');

    if (Net.versionMismatch) {
      this.toast('⚠ Different game versions detected — the battle may desync!');
    }

    this.refreshRoomWidgets();
  }

  private pickElement(elementId: string): void {
    // Quantum has to resolve to a real element before any of the loadout below means anything:
    // the upgrades, binds and skin all belong to the element being worn. The element list
    // travels alongside so the peer can build a replica that shifts with us.
    if (elementId === 'quantum') {
      const lo = getQuantumLoadout();
      const forms = loadoutElements(lo);
      this.pickElement(forms[0]);
      // What the opening element brings is the loadout's call, not its own page's: Third
      // State's per-slot upgrades, Quantum's own mastery (the borrowed passive), no perk.
      this.mySel.upgrades = upgradesFor(lo, forms[0]);
      this.mySel.masteryOn = lo.passive === forms[0];
      this.mySel.masteryBinds = {};
      this.perkList = [{ id: null, name: 'No perk' }];
      this.perkIdx = 0;
      this.mySel.perkId = null;
      this.mySel.bond = forms;
      this.refreshRoomWidgets();
      this.pushMySelection();
      return;
    }
    if (this.mySel.ready) this.toggleReady();
    // Picking anything else drops a loadout we were carrying.
    if (this.mySel.elementId !== elementId) this.mySel.bond = null;
    this.mySel.elementId = elementId;
    this.mySel.upgrades = PlayerData.getActiveUpgrades(elementId);
    // Gold and Harvest replaced elements whose retired masteries may have left the flag on in an
    // old save, and Psychic's mastery was redone; the arena gates those three on the new mastery
    // being finished, so the lobby does too.
    this.mySel.masteryOn = PlayerData.isMasteryEnabled(elementId)
      && ((elementId !== 'fortune' && elementId !== 'gluttony' && elementId !== 'psychic' && elementId !== 'magnet' && elementId !== 'radiation' && elementId !== 'passion' && elementId !== 'sound' && elementId !== 'dream') || isMasteryComplete(elementId));
    this.mySel.masteryBinds = this.mySel.masteryOn ? PlayerData.getMasteryBinds(elementId) : {};
    this.mySel.skin = PlayerData.getEquippedSkin(elementId);

    // Rebuild the perk list for this element: none + unlocked perks
    const unlockedIds = PlayerData.getUnlockedPerks(elementId);
    this.perkList = [
      { id: null, name: 'No perk' },
      ...getPerksForElement(elementId)
        .filter((p) => unlockedIds.includes(p.id))
        .map((p) => ({ id: p.id as string | null, name: `${p.emoji ?? ''} ${p.name}`.trim() })),
    ];
    // A two-slot element's saved pair is offered as one more entry, so it can be taken online.
    const equipped = PlayerData.getEquippedPerk(elementId);
    if (equipped && !this.perkList.some((p) => p.id === equipped)) {
      this.perkList.push({ id: equipped, name: perkLoadoutBadge(equipped) ?? equipped });
    }
    this.perkIdx = Math.max(0, this.perkList.findIndex((p) => p.id === equipped));
    this.mySel.perkId = this.perkList[this.perkIdx].id;

    this.refreshRoomWidgets();
    this.pushMySelection();
  }

  private cyclePerk(dir: -1 | 1): void {
    if (this.perkList.length === 0) return;
    if (this.mySel.ready) this.toggleReady();
    this.perkIdx = (this.perkIdx + dir + this.perkList.length) % this.perkList.length;
    this.mySel.perkId = this.perkList[this.perkIdx].id;
    this.refreshRoomWidgets();
    this.pushMySelection();
  }

  private toggleReady(): void {
    if (!this.mySel.elementId) return;
    this.mySel.ready = !this.mySel.ready;
    this.refreshRoomWidgets();
    this.pushMySelection();
  }

  private pushMySelection(): void {
    Net.send({ t: 'sel', elementId: this.mySel.elementId, perkId: this.mySel.perkId, upgrades: this.mySel.upgrades, masteryBinds: this.mySel.masteryBinds, masteryOn: this.mySel.masteryOn, skin: this.mySel.skin, bond: this.mySel.bond, ready: this.mySel.ready });
  }

  private refreshRoomWidgets(): void {
    if (this.phase !== 'room') return;

    // Element tile highlight
    for (const [id, tile] of this.tileByElement) {
      tile.paint(id === this.mySel.elementId ? 'active' : 'idle');
    }

    if (this.myPerkLabel?.active) {
      this.myPerkLabel.setText(this.perkList[this.perkIdx]?.name ?? '—');
    }

    if (this.readyBtn) {
      this.readyBtn
        .setLabel(this.mySel.ready ? '✔ READY' : 'READY UP')
        .setAccent(this.mySel.ready ? C.verdant : C.gold);
    }

    // Roster: the other players in slot order, empty rows for the open seats.
    const slots = [...this.others.keys()].sort((x, y) => x - y);
    this.rosterRows.forEach((row, i) => {
      if (!row.name.active) return;
      const slot = slots[i];
      const other = slot !== undefined ? this.others.get(slot) : undefined;
      // In PvP only the first other seat is ever filled; the rest stay dark.
      if (!other) {
        const open = this.roomMode === 'invasion' || i === 0;
        this.setRowPortrait(row, null, open ? 'waiting' : 'away');
        row.tag.setText(open ? `PLAYER ${i + 2}` : '');
        row.name.setText(open ? (i === 0 ? 'Waiting for a friend…' : 'Open seat') : '').setColor('#667788');
        row.perk.setText('');
        row.ready.setText('');
        return;
      }
      row.tag.setText(`PLAYER ${slot + 1}${slot === 0 ? ' · HOST' : ''}`);
      if (!other.inLobby) {
        this.setRowPortrait(row, null, 'away');
        row.name.setText('Still at the results…').setColor('#aabbcc');
        row.perk.setText('');
        row.ready.setText('AWAY').setColor('#886666');
        return;
      }
      const el = other.elementId ? findElementDef(other.elementId) : null;
      this.setRowPortrait(row, el?.id ?? null, 'waiting');
      row.name.setText(el ? `${el.emoji}  ${el.name}` : 'Choosing…').setColor('#ffffff');
      row.perk.setText(perkLoadoutBadge(other.perkId) ?? 'No perk');
      if (other.ready) row.ready.setText('✔ READY').setColor('#66ff66');
      else row.ready.setText('NOT READY').setColor('#cc8888');
    });

    // Start button state (host only) — disabled until everyone is locked in.
    if (this.startBtn) {
      this.startBtn.setDisabled(this.startBlocker() !== null);
    }

    // Match mode + invasion difficulty
    if (this.pvpPaint && this.coopPaint) {
      const isCoop = this.roomMode === 'invasion';
      this.pvpPaint(isCoop ? 'idle' : 'active');
      this.coopPaint(isCoop ? 'active' : 'idle');
    }
    if (this.diffLabel?.active) {
      const diff = INVASION_DIFFICULTIES.find((d) => d.id === this.roomInvasionDifficulty) ?? INVASION_DIFFICULTIES[0];
      this.diffLabel.setText(this.roomMode === 'invasion' ? diff.label : '').setColor(diff.colorHex);
      this.diffLabel.setVisible(this.roomMode === 'invasion');
    }
    if (this.oppPanelHeader?.active) {
      this.oppPanelHeader.setText(this.roomMode === 'invasion' ? 'ALLIES' : 'OPPONENT');
    }
    if (this.mapLabel?.active) {
      this.mapLabel.setVisible(this.roomMode === 'invasion').setText(this.roomInvasionMap === 'city'
        ? `🏙️ CITY · ${this.roomInvasionParty} DEFENDERS` : '🏚️ MANSION');
    }
  }

  private sendRoomMode(): void {
    Net.send({
      t: 'mode', mode: this.roomMode, invasionDifficulty: this.roomInvasionDifficulty,
      invasionMap: this.roomInvasionMap, invasionParty: this.roomInvasionParty,
    });
  }

  /** Humans in the room right now — the City never seats fewer defenders than that. */
  private humans(): number {
    return 1 + this.others.size;
  }

  /** City with N → 4 defenders (bots fill the seats past the humans), then the Mansion. */
  private cycleInvasionMap(): void {
    if (!Net.isHost || this.phase !== 'room') return;
    const min = Math.max(2, this.humans());
    if (this.roomInvasionMap === 'mansion') { this.roomInvasionMap = 'city'; this.roomInvasionParty = min; }
    else if (this.roomInvasionParty < 4) this.roomInvasionParty = Math.max(min, this.roomInvasionParty + 1);
    else this.roomInvasionMap = 'mansion';
    this.sendRoomMode();
    this.refreshRoomWidgets();
  }

  private setRoomMode(mode: NetMatchMode): void {
    if (!Net.isHost || this.phase !== 'room') return;
    this.roomMode = mode;
    this.sendRoomMode();
    this.refreshRoomWidgets();
  }

  private cycleInvasionDifficulty(dir: -1 | 1): void {
    if (!Net.isHost || this.phase !== 'room') return;
    const idx = Math.max(0, INVASION_DIFFICULTIES.findIndex((d) => d.id === this.roomInvasionDifficulty));
    this.roomInvasionDifficulty = INVASION_DIFFICULTIES[(idx + dir + INVASION_DIFFICULTIES.length) % INVASION_DIFFICULTIES.length].id;
    this.sendRoomMode();
    this.refreshRoomWidgets();
  }

  /** Why the host can't start yet, or null when everyone is set. */
  private startBlocker(): string | null {
    if (!this.mySel.ready || !this.mySel.elementId) return 'Pick an element and ready up!';
    if (this.others.size === 0) return 'Waiting for players to join';
    if (this.roomMode === 'pvp' && this.others.size > 1) return 'PvP is one on one — switch to CO-OP for a bigger party';
    for (const o of this.others.values()) {
      if (!o.inLobby || !o.ready || !o.elementId) return 'Everyone must be ready!';
    }
    return null;
  }

  private static partySel(l: Loadout): NetPartySel {
    return {
      elementId: l.elementId ?? 'fire', perkId: l.perkId, upgrades: l.upgrades, masteryBinds: l.masteryBinds,
      masteryOn: l.masteryOn, skin: l.skin, bond: l.bond,
    };
  }

  private hostStart(): void {
    if (!Net.isHost) return;
    const blocker = this.startBlocker();
    if (blocker) { this.toast(blocker); return; }
    // The City seats at least every human.
    if (this.roomMode === 'invasion') this.roomInvasionParty = Math.max(this.roomInvasionParty, this.humans());
    const party: NetPartyMember[] = [{ slot: 0, sel: OnlineLobbyScene.partySel(this.mySel) }];
    for (const [slot, o] of [...this.others].sort((x, y) => x[0] - y[0])) {
      party.push({ slot, sel: OnlineLobbyScene.partySel(o) });
    }
    Net.send({
      t: 'start',
      mode: this.roomMode,
      invasionDifficulty: this.roomMode === 'invasion' ? this.roomInvasionDifficulty : undefined,
      invasionMap: this.roomInvasionMap,
      invasionParty: this.roomInvasionParty,
      party,
    });
    this.startMatch(party);
  }

  private startMatch(party: NetPartyMember[]): void {
    const isCoop = this.roomMode === 'invasion';
    const mine = party.find((m) => m.slot === Net.mySlot)?.sel;
    // Our arena's `npc` slot carries one other player in full (their kit replayed); in co-op
    // the rest ride along as lighter replicas. The lowest other slot takes the npc seat.
    const others = party.filter((m) => m.slot !== Net.mySlot).sort((a, b) => a.slot - b.slot);
    const primary = others[0];
    if (!mine || !primary) return;
    Net.locked = true;
    const theirs = primary.sel;
    // An element list means that side is Quantum: hand ArenaScene `'quantum'` so it builds a
    // shifting fighter rather than a plain one stuck as the starting element. Our own loadout
    // is read from the save; theirs rides in as the replica's rotation list.
    const myBond = mine.bond && mine.bond.length >= 1 ? mine.bond : undefined;
    const theirBond = theirs.bond && theirs.bond.length >= 1 ? theirs.bond : undefined;
    this.scene.start('ArenaScene', {
      elementId: myBond ? 'quantum' : mine.elementId,
      enemyElementId: theirBond ? 'quantum' : theirs.elementId,
      npcQuantumForms: theirBond,
      difficulty: 3,
      playerPerk: mine.perkId,
      npcPerk: theirs.perkId,
      mode: isCoop ? 'invasion' : undefined,
      invasionDifficulty: isCoop ? this.roomInvasionDifficulty : undefined,
      invasionMap: isCoop ? this.roomInvasionMap : undefined,
      invasionParty: isCoop ? Math.max(this.roomInvasionParty, party.length) : undefined,
      online: {
        isHost: Net.isHost,
        npcUpgrades: theirs.upgrades ?? [],
        npcMasteryBinds: theirs.masteryBinds ?? {},
        npcMasteryOn: theirs.masteryOn ?? false,
        npcSkin: theirs.skin ?? null,
        mySlot: Net.mySlot,
        npcSlot: primary.slot,
        extraAllies: isCoop
          ? others.slice(1).map((m) => ({ slot: m.slot, elementId: m.sel.bond?.[0] ?? m.sel.elementId, skin: m.sel.skin ?? null }))
          : [],
      },
    });
  }

  // ── Network events ───────────────────────────────────────────────

  /** Match `others` to the room's membership: new slots get a blank seat, departed ones go. */
  private syncOthers(): void {
    const live = new Set(Net.otherSlots);
    for (const slot of [...this.others.keys()]) if (!live.has(slot)) this.others.delete(slot);
    for (const slot of live) {
      if (!this.others.has(slot)) this.others.set(slot, { ...blankLoadout(), inLobby: true });
    }
  }

  private onPeersChanged(): void {
    const before = this.others.size;
    this.syncOthers();
    if (this.others.size > before) this.toast('A player joined');
    else if (this.others.size < before) this.toast('A player left');
    // A newcomer has seen nobody's loadout yet — everyone re-announces theirs.
    this.pushMySelection();
    if (Net.isHost) {
      // Keep the City's seats at least as many as the humans.
      this.roomInvasionParty = Math.max(this.roomInvasionParty, Math.min(4, this.humans()));
      if (this.others.size > 1 && this.roomMode === 'pvp') this.roomMode = 'invasion';
      this.sendRoomMode();
    }
    this.refreshRoomWidgets();
  }

  private onNetMessage(msg: NetMsg, from: number): void {
    switch (msg.t) {
      case 'sel': {
        const other = this.others.get(from) ?? { ...blankLoadout(), inLobby: true };
        Object.assign(other, {
          elementId: msg.elementId, perkId: msg.perkId, upgrades: msg.upgrades ?? [], masteryBinds: msg.masteryBinds ?? {},
          masteryOn: msg.masteryOn ?? false, skin: msg.skin ?? null, bond: msg.bond ?? null, ready: msg.ready, inLobby: true,
        });
        this.others.set(from, other);
        this.refreshRoomWidgets();
        break;
      }
      case 'lobby': {
        // A player (re-)entered the lobby — refresh their view of us.
        const other = this.others.get(from);
        if (other) { other.inLobby = true; other.ready = false; }
        this.pushMySelection();
        if (Net.isHost) this.sendRoomMode();
        this.refreshRoomWidgets();
        break;
      }
      case 'mode':
        if (!Net.isHost) {
          this.roomMode = msg.mode;
          this.roomInvasionDifficulty = msg.invasionDifficulty;
          this.roomInvasionMap = msg.invasionMap ?? 'mansion';
          this.roomInvasionParty = msg.invasionParty ?? 2;
          this.refreshRoomWidgets();
        }
        break;
      case 'start':
        if (!Net.isHost && msg.party.every((m) => !!m.sel.elementId)) {
          this.roomMode = msg.mode;
          this.roomInvasionDifficulty = msg.invasionDifficulty ?? 'normal';
          this.roomInvasionMap = msg.invasionMap ?? 'mansion';
          this.roomInvasionParty = msg.invasionParty ?? 2;
          this.startMatch(msg.party);
        }
        break;
      default:
        break;
    }
  }

  private onNetStatus(status: NetStatus, detail?: string): void {
    if (status === 'connected') {
      this.syncOthers();
      this.showRoom();
      this.pushMySelection();
      if (Net.isHost) this.sendRoomMode();
    } else if (status === 'hosting' && this.phase === 'room') {
      this.others.clear();
      this.toast(detail ?? 'Your friend disconnected');
      this.showHosting();
    } else if (status === 'error') {
      if (this.phase === 'joining') {
        this.setJoinError(detail ?? 'Connection failed');
      } else {
        this.toast(detail ?? 'Connection lost');
        this.showEntry();
      }
    }
  }

  // ── Input & misc helpers ─────────────────────────────────────────

  private handleKey(event: KeyboardEvent): void {
    if (this.phase === 'joining') {
      const key = event.key.toUpperCase();
      if (/^[A-Z0-9]$/.test(key) && this.joinCode.length < 4) {
        this.joinCode += key;
      } else if (event.key === 'Backspace') {
        this.joinCode = this.joinCode.slice(0, -1);
        this.setJoinError('');
      } else if (event.key === 'Enter') {
        this.tryJoin();
        return;
      }
      const t = this.children.getByName('joinCodeText') as Phaser.GameObjects.Text | null;
      if (t) t.setText(this.joinCode.padEnd(4, '·'));
    } else if (event.key === 'Escape') {
      if (this.phase === 'entry') {
        Net.disconnect();
        this.scene.start('TitleScene');
      }
    }
  }

  private toast(msg: string): void {
    this.toastText?.destroy();
    this.toastText = null;
    showToast(this, msg, { accent: C.gold, y: this.scale.height - 34 });
  }

  private addPhaseText(x: number, y: number, text: string, style: Phaser.Types.GameObjects.Text.TextStyle): Phaser.GameObjects.Text {
    const t = this.add.text(x, y, text, style);
    this.phaseObjects.push(t);
    return t;
  }

  /**
   * Show `elementId`'s live fighter in a roster row's well, or a placeholder mark when there is
   * nobody to show. Rebuilds only when the id actually changes — a portrait owns a scene
   * update hook, and tearing one down every network tick would thrash the display list.
   */
  private setRowPortrait(row: RosterRow, elementId: string | null, state: 'waiting' | 'away'): void {
    if (!row.well.active) return;
    if (elementId === row.portraitId && elementId !== null) return;
    if (elementId === null && row.placeholder) {
      row.placeholder.setText(state === 'away' ? '💤' : '❔');
      return;
    }

    row.portrait?.destroy();
    row.portrait = null;
    row.placeholder?.destroy();
    row.placeholder = null;
    row.portraitId = elementId;

    const { x, y } = row.xy;
    const w = 130;
    const h = 96;
    const accent = (elementId ? findElementDef(elementId)?.color : null) ?? C.arcane;

    row.well.clear();
    fillNotchedGradient(row.well, x - w / 2, y - h / 2, w, h,
      mix(C.void_, accent, elementId ? 0.12 : 0.03), C.void_, 1, 10, ALL_CORNERS, 14);
    if (elementId) {
      for (let k = 5; k >= 1; k--) {
        row.well.fillStyle(accent, 0.04);
        row.well.fillCircle(x, y + 6, 10 + k * 7);
      }
    }
    strokeNotched(row.well, x - w / 2, y - h / 2, w, h, accent, elementId ? 0.6 : 0.25, 1.5, 10, ALL_CORNERS);

    if (!elementId) {
      row.placeholder = this.add.text(x, y, state === 'away' ? '💤' : '❔', { fontSize: '44px' })
        .setOrigin(0.5).setDepth(DEPTH.content + 1).setAlpha(0.75);
      this.phaseObjects.push(row.placeholder);
      return;
    }

    row.portrait = new ElementPortrait(this, {
      x, y, w: w - 12, h: h - 10,
      elementId, mastered: false,
      depth: DEPTH.content + 1, scale: 0.6,
    });
  }

  /** Phase-scoped button — torn down with the rest of the phase. */
  private makeButton(
    x: number, y: number, w: number, h: number,
    label: string, accent: number, onClick: () => void, icon?: string,
  ): void {
    const btn = addButton(this, {
      x, y, w, h, label, icon, accent,
      variant: h >= 60 ? 'solid' : 'ghost',
      fontSize: Math.min(21, h - 26),
      onClick,
    });
    this.phaseObjects.push(btn.container);
  }
}
