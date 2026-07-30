import Phaser from 'phaser';
import * as PlayerData from '../data/PlayerData';
import { getPerksForElement, getPerkById } from '../data/Perks';
import { Net, NetMsg, NetStatus, NetMatchMode } from '../network/NetworkManager';
import { INVASION_DIFFICULTIES } from '../invasion/InvasionKit';
import {
  ElementDef,
  ELEMENTS,
  COMBINED_ELEMENTS,
  ABSTRACT_ELEMENTS,
  ABSTRACT_COMBINED_ELEMENTS,
  ABSTRACT_ELEMENT_UNLOCK_MAP,
} from './MenuScene';
import {
  C, T, DEPTH, FONT_DISPLAY, FONT_UI, hex, mix,
  addBackdrop, addButton, addCardPlate, addPanel, addTitle, addWell, showToast, UiButton,
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
  ready: boolean;
}

/** The lobby's own accent — a teal that reads as "network", not "element". */
const ACCENT = 0x2ee6c0;

export class OnlineLobbyScene extends Phaser.Scene {
  private phase: LobbyPhase = 'entry';
  private phaseObjects: Phaser.GameObjects.GameObject[] = [];

  private mySel: Loadout = { elementId: null, perkId: null, upgrades: [], masteryBinds: {}, masteryOn: false, skin: null, ready: false };
  private oppSel: Loadout = { elementId: null, perkId: null, upgrades: [], masteryBinds: {}, masteryOn: false, skin: null, ready: false };
  private oppInLobby = false;

  private roomMode: NetMatchMode = 'pvp';
  private roomInvasionDifficulty = 'normal';
  private pvpPaint: ((state: 'idle' | 'hover' | 'active') => void) | null = null;
  private coopPaint: ((state: 'idle' | 'hover' | 'active') => void) | null = null;
  private diffLabel: Phaser.GameObjects.Text | null = null;
  private oppPanelHeader: Phaser.GameObjects.Text | null = null;

  private joinCode = '';
  private joinError = '';
  private toastText: Phaser.GameObjects.Text | null = null;
  private pingText: Phaser.GameObjects.Text | null = null;

  // Room-phase widgets that get refreshed in place
  private oppPanelTexts: Phaser.GameObjects.Text[] = [];
  private myPerkLabel: Phaser.GameObjects.Text | null = null;
  private readyBtn: UiButton | null = null;
  private startBtn: UiButton | null = null;
  private tileByElement = new Map<string, { paint: (state: 'idle' | 'hover' | 'active') => void }>();
  private perkList: { id: string | null; name: string }[] = [];
  private perkIdx = 0;

  private readonly msgHandler = (msg: NetMsg) => this.onNetMessage(msg);
  private readonly statusHandler = (status: NetStatus, detail?: string) => this.onNetStatus(status, detail);

  constructor() {
    super({ key: 'OnlineLobbyScene' });
  }

  create(): void {
    Music.play('online');
    const { width, height } = this.scale;

    this.phaseObjects = [];
    this.mySel = { elementId: null, perkId: null, upgrades: [], masteryBinds: {}, masteryOn: false, skin: null, ready: false };
    this.oppSel = { elementId: null, perkId: null, upgrades: [], masteryBinds: {}, masteryOn: false, skin: null, ready: false };
    this.oppInLobby = false;
    this.roomMode = 'pvp';
    this.roomInvasionDifficulty = 'normal';
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
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      Net.offMessage(this.msgHandler);
      Net.offStatus(this.statusHandler);
    });

    this.input.keyboard!.on('keydown', this.handleKey, this);

    // Coming back from a finished match (or a mid-session revisit): if the
    // connection is still alive, drop straight into the room.
    if (Net.connected) {
      Net.send({ t: 'lobby' });
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
    this.oppPanelTexts = [];
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

    this.addPhaseText(cx, 150, 'Battle a friend — one of you hosts, the other joins with the room code.', {
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

    const waiting = this.addPhaseText(cx, 330, 'Waiting for a challenger', {
      fontSize: '20px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif', color: '#44ccaa',
    }).setOrigin(0.5);
    this.tweens.add({ targets: waiting, alpha: 0.35, duration: 700, yoyo: true, repeat: -1 });

    this.addPhaseText(cx, 380, 'Your friend picks JOIN GAME and types this code.', {
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

    this.oppInLobby = true;
    this.mySel.ready = false;

    this.addPhaseText(cx, 92, `ROOM ${Net.roomCode ?? ''}   —   ${Net.isHost ? 'you are hosting' : 'joined as challenger'}`, {
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
    const pool = this.unlockedElements();
    const cols = Math.min(8, pool.length);
    const tile = 48;
    const gap = 6;
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
      const emoji = this.add.text(bx, by - 7, el.emoji, { fontSize: '19px' })
        .setOrigin(0.5).setDepth(DEPTH.content);
      const name = this.add.text(bx, by + 15, el.name, {
        fontSize: '8px', fontFamily: FONT_UI, color: T.normal,
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

    // ── Opponent panel (right) ──────────────────────
    const oppPanel = addPanel(this, {
      x: 710, y: panelY + panelH / 2, w: 400, h: panelH,
      accent: C.arcane, glow: 0.35,
    });
    this.phaseObjects.push(...oppPanel.objects);
    this.oppPanelHeader = this.addPhaseText(710, panelY + 22, 'OPPONENT', {
      fontSize: '16px', fontFamily: FONT_DISPLAY,
      color: hex(mix(C.arcane, 0xffffff, 0.5)), letterSpacing: 3,
    }).setOrigin(0.5);

    const oppEmoji = this.addPhaseText(710, panelY + 150, '❔', { fontSize: '72px' }).setOrigin(0.5);
    const oppName = this.addPhaseText(710, panelY + 225, 'Choosing…', {
      fontSize: '22px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#ffffff',
    }).setOrigin(0.5);
    const oppPerk = this.addPhaseText(710, panelY + 260, '', {
      fontSize: '14px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif', color: '#ffcc88',
    }).setOrigin(0.5);
    const oppReady = this.addPhaseText(710, panelY + panelH - 30, 'NOT READY', {
      fontSize: '18px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#886666',
    }).setOrigin(0.5);
    this.oppPanelTexts = [oppEmoji, oppName, oppPerk, oppReady];

    // ── Bottom bar: start / leave ───────────────────
    if (Net.isHost) {
      this.startBtn = addButton(this, {
        x: cx + 110, y: height - 52, w: 300, h: 56,
        label: 'START BATTLE', icon: '⚔', accent: C.verdant, variant: 'solid', fontSize: 19,
        onClick: () => this.hostStart(),
      });
      this.phaseObjects.push(this.startBtn.container);
    } else {
      this.addPhaseText(cx + 110, height - 52, 'The host starts the battle when both players are ready.', {
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

  private unlockedElements(): ElementDef[] {
    const completedGauntlets = PlayerData.getCompletedGauntlets();
    const unlockedCombined = COMBINED_ELEMENTS.filter((e) => PlayerData.isElementUnlocked(e.id));
    const unlockedAbstract = ABSTRACT_ELEMENTS.filter((e) => {
      const needed = ABSTRACT_ELEMENT_UNLOCK_MAP[e.id];
      return needed ? completedGauntlets.includes(needed) : false;
    });
    const unlockedAbstractCombined = ABSTRACT_COMBINED_ELEMENTS.filter((e) => PlayerData.isElementUnlocked(e.id));
    return [...ELEMENTS, ...unlockedCombined, ...unlockedAbstract, ...unlockedAbstractCombined];
  }

  private pickElement(elementId: string): void {
    if (this.mySel.ready) this.toggleReady();
    this.mySel.elementId = elementId;
    this.mySel.upgrades = PlayerData.getActiveUpgrades(elementId);
    this.mySel.masteryOn = PlayerData.isMasteryEnabled(elementId);
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
    const equipped = PlayerData.getEquippedPerk(elementId);
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
    Net.send({ t: 'sel', elementId: this.mySel.elementId, perkId: this.mySel.perkId, upgrades: this.mySel.upgrades, masteryBinds: this.mySel.masteryBinds, masteryOn: this.mySel.masteryOn, skin: this.mySel.skin, ready: this.mySel.ready });
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

    // Opponent panel
    const [oppEmoji, oppName, oppPerk, oppReady] = this.oppPanelTexts;
    if (oppEmoji?.active) {
      if (!this.oppInLobby) {
        oppEmoji.setText('💤');
        oppName.setText('Waiting for opponent…');
        oppPerk.setText('');
        oppReady.setText('AWAY').setColor('#886666');
      } else {
        const el = this.oppSel.elementId ? this.findElementDef(this.oppSel.elementId) : null;
        oppEmoji.setText(el?.emoji ?? '❔');
        oppName.setText(el ? el.name : 'Choosing…');
        const perk = this.oppSel.perkId ? getPerkById(this.oppSel.perkId) : null;
        oppPerk.setText(perk ? `${perk.emoji ?? ''} ${perk.name}`.trim() : 'No perk');
        if (this.oppSel.ready) {
          oppReady.setText('✔ READY').setColor('#66ff66');
        } else {
          oppReady.setText('NOT READY').setColor('#cc8888');
        }
      }
    }

    // Start button state (host only) — disabled until both sides are locked in.
    if (this.startBtn) {
      const canStart = this.mySel.ready && this.oppSel.ready && !!this.mySel.elementId && !!this.oppSel.elementId && this.oppInLobby;
      this.startBtn.setDisabled(!canStart);
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
      this.oppPanelHeader.setText(this.roomMode === 'invasion' ? 'ALLY' : 'OPPONENT');
    }
  }

  private setRoomMode(mode: NetMatchMode): void {
    if (!Net.isHost || this.phase !== 'room') return;
    this.roomMode = mode;
    Net.send({ t: 'mode', mode: this.roomMode, invasionDifficulty: this.roomInvasionDifficulty });
    this.refreshRoomWidgets();
  }

  private cycleInvasionDifficulty(dir: -1 | 1): void {
    if (!Net.isHost || this.phase !== 'room') return;
    const idx = Math.max(0, INVASION_DIFFICULTIES.findIndex((d) => d.id === this.roomInvasionDifficulty));
    this.roomInvasionDifficulty = INVASION_DIFFICULTIES[(idx + dir + INVASION_DIFFICULTIES.length) % INVASION_DIFFICULTIES.length].id;
    Net.send({ t: 'mode', mode: this.roomMode, invasionDifficulty: this.roomInvasionDifficulty });
    this.refreshRoomWidgets();
  }

  private findElementDef(id: string): ElementDef | undefined {
    return ELEMENTS.find((e) => e.id === id)
      ?? COMBINED_ELEMENTS.find((e) => e.id === id)
      ?? ABSTRACT_ELEMENTS.find((e) => e.id === id)
      ?? ABSTRACT_COMBINED_ELEMENTS.find((e) => e.id === id);
  }

  private hostStart(): void {
    if (!Net.isHost) return;
    if (!(this.mySel.ready && this.oppSel.ready && this.mySel.elementId && this.oppSel.elementId && this.oppInLobby)) {
      this.toast('Both players must be ready!');
      return;
    }
    Net.send({
      t: 'start',
      mode: this.roomMode,
      invasionDifficulty: this.roomMode === 'invasion' ? this.roomInvasionDifficulty : undefined,
      hostSel: { elementId: this.mySel.elementId, perkId: this.mySel.perkId, upgrades: this.mySel.upgrades, masteryBinds: this.mySel.masteryBinds, masteryOn: this.mySel.masteryOn, skin: this.mySel.skin },
      guestSel: { elementId: this.oppSel.elementId, perkId: this.oppSel.perkId, upgrades: this.oppSel.upgrades, masteryBinds: this.oppSel.masteryBinds, masteryOn: this.oppSel.masteryOn, skin: this.oppSel.skin },
    });
    this.startMatch(
      { elementId: this.mySel.elementId, perkId: this.mySel.perkId, upgrades: this.mySel.upgrades, masteryBinds: this.mySel.masteryBinds, masteryOn: this.mySel.masteryOn, skin: this.mySel.skin },
      { elementId: this.oppSel.elementId, perkId: this.oppSel.perkId, upgrades: this.oppSel.upgrades, masteryBinds: this.oppSel.masteryBinds, masteryOn: this.oppSel.masteryOn, skin: this.oppSel.skin },
    );
  }

  private startMatch(
    mine: { elementId: string; perkId: string | null; upgrades?: string[]; masteryBinds?: Record<string, string>; masteryOn?: boolean; skin?: string | null },
    theirs: { elementId: string; perkId: string | null; upgrades?: string[]; masteryBinds?: Record<string, string>; masteryOn?: boolean; skin?: string | null },
  ): void {
    const isCoop = this.roomMode === 'invasion';
    this.scene.start('ArenaScene', {
      elementId: mine.elementId,
      enemyElementId: theirs.elementId,
      difficulty: 3,
      playerPerk: mine.perkId,
      npcPerk: theirs.perkId,
      mode: isCoop ? 'invasion' : undefined,
      invasionDifficulty: isCoop ? this.roomInvasionDifficulty : undefined,
      online: {
        isHost: Net.isHost,
        npcUpgrades: theirs.upgrades ?? [],
        npcMasteryBinds: theirs.masteryBinds ?? {},
        npcMasteryOn: theirs.masteryOn ?? false,
        npcSkin: theirs.skin ?? null,
      },
    });
  }

  // ── Network events ───────────────────────────────────────────────

  private onNetMessage(msg: NetMsg): void {
    switch (msg.t) {
      case 'sel':
        this.oppInLobby = true;
        this.oppSel = { elementId: msg.elementId, perkId: msg.perkId, upgrades: msg.upgrades ?? [], masteryBinds: msg.masteryBinds ?? {}, masteryOn: msg.masteryOn ?? false, skin: msg.skin ?? null, ready: msg.ready };
        this.refreshRoomWidgets();
        break;
      case 'lobby':
        // Peer (re-)entered the lobby — refresh their view of us.
        this.oppInLobby = true;
        this.oppSel.ready = false;
        this.pushMySelection();
        this.refreshRoomWidgets();
        break;
      case 'mode':
        if (!Net.isHost) {
          this.roomMode = msg.mode;
          this.roomInvasionDifficulty = msg.invasionDifficulty;
          this.refreshRoomWidgets();
        }
        break;
      case 'start':
        if (!Net.isHost && msg.guestSel.elementId && msg.hostSel.elementId) {
          this.roomMode = msg.mode;
          this.roomInvasionDifficulty = msg.invasionDifficulty ?? 'normal';
          this.startMatch(
            msg.guestSel as { elementId: string; perkId: string | null; upgrades?: string[]; masteryBinds?: Record<string, string>; masteryOn?: boolean; skin?: string | null },
            msg.hostSel as { elementId: string; perkId: string | null; upgrades?: string[]; masteryBinds?: Record<string, string>; masteryOn?: boolean; skin?: string | null },
          );
        }
        break;
      default:
        break;
    }
  }

  private onNetStatus(status: NetStatus, detail?: string): void {
    if (status === 'connected') {
      this.showRoom();
      this.pushMySelection();
    } else if (status === 'hosting' && this.phase === 'room') {
      this.toast(detail ?? 'Opponent disconnected');
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
