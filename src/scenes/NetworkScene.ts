import Phaser from 'phaser';
import { PeerJSNetworkManager } from '../network/PeerJSNetworkManager';
import { LobbyPacket } from '../network/NetworkTypes';
import * as PlayerData from '../data/PlayerData';

interface ElementDef {
  id: string;
  name: string;
  emoji: string;
  color: number;
}

const ALL_ELEMENTS: ElementDef[] = [
  { id: 'fire',    name: 'Fire',    emoji: '🔥', color: 0xff4400 },
  { id: 'water',   name: 'Water',   emoji: '💧', color: 0x0088ff },
  { id: 'life',    name: 'Life',    emoji: '🌿', color: 0x44cc44 },
  { id: 'air',     name: 'Air',     emoji: '💨', color: 0xaaddff },
  { id: 'earth',   name: 'Earth',   emoji: '🪨', color: 0x887755 },
  { id: 'oil',     name: 'Oil',     emoji: '🛢️',  color: 0x664400 },
  { id: 'shadow',  name: 'Shadow',  emoji: '🌑', color: 0x330044 },
  { id: 'ice',     name: 'Ice',     emoji: '🧊', color: 0x88ccff },
  { id: 'growth',  name: 'Growth',  emoji: '🦠', color: 0x88bb22 },
  { id: 'crystal', name: 'Crystal', emoji: '💎', color: 0x88ccff },
  { id: 'soul',    name: 'Soul',    emoji: '👻', color: 0xccaaff },
  { id: 'hunt',    name: 'Hunt',    emoji: '🐺', color: 0xcc4400 },
  { id: 'sand',    name: 'Time',    emoji: '⏳', color: 0xffdd44 },
];

const COMBINED_IDS = new Set(['oil','shadow','ice','growth','crystal','soul','hunt','sand']);

type Screen = 'role' | 'connecting' | 'waiting' | 'join-input' | 'element-pick' | 'waiting-opponent';

export class NetworkScene extends Phaser.Scene {
  private screen: Screen = 'role';
  private manager: PeerJSNetworkManager | null = null;
  private myElementId: string | null = null;
  private opponentElementId: string | null = null;

  private screenObjects: Phaser.GameObjects.GameObject[] = [];
  private statusText!: Phaser.GameObjects.Text;
  private joinCodeBuffer = '';
  private joinCodeText!: Phaser.GameObjects.Text;
  private keyListener: ((e: KeyboardEvent) => void) | null = null;
  private gameStarted = false;

  constructor() {
    super({ key: 'NetworkScene' });
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;

    this.add.rectangle(cx, height / 2, width, height, 0x0d0d1a);
    const grid = this.add.graphics();
    grid.lineStyle(1, 0x1a1a33, 1);
    for (let x = 0; x < width; x += 60) grid.lineBetween(x, 0, x, height);
    for (let y = 0; y < height; y += 60) grid.lineBetween(0, y, width, y);

    this.add.text(cx, 90, 'ELEMENTAL', {
      fontSize: '68px', fontFamily: '"Arial Black", sans-serif',
      color: '#ff8800', stroke: '#ff2200', strokeThickness: 5,
    }).setOrigin(0.5);

    this.statusText = this.add.text(cx, height - 32, '', {
      fontSize: '13px', fontFamily: 'Arial, sans-serif', color: '#555577',
    }).setOrigin(0.5).setDepth(10);

    this.screenObjects = [];
    this.screen = 'role';
    this.myElementId = null;
    this.opponentElementId = null;
    this.joinCodeBuffer = '';
    this.gameStarted = false;

    this.renderRole();
  }

  // ── Helpers ───────────────────────────────────────────────────────

  private clearScreen(): void {
    for (const obj of this.screenObjects) {
      if (obj.active) (obj as Phaser.GameObjects.GameObject & { destroy(): void }).destroy();
    }
    this.screenObjects = [];
    if (this.keyListener) {
      this.input.keyboard!.off('keydown', this.keyListener);
      this.keyListener = null;
    }
  }

  private push(...objs: Phaser.GameObjects.GameObject[]): void {
    this.screenObjects.push(...objs);
  }

  private setStatus(msg: string, color = '#555577'): void {
    this.statusText.setText(msg).setColor(color);
  }

  private addBtn(
    x: number, y: number, label: string,
    bgColor: number, borderColor: number, action: () => void,
    w = 240, h = 64,
  ): void {
    const rect = this.add.rectangle(x, y, w, h, bgColor, 0.85).setStrokeStyle(2, borderColor);
    const txt  = this.add.text(x, y, label, {
      fontSize: '22px', fontFamily: '"Arial Black", sans-serif', color: '#ffffff',
    }).setOrigin(0.5);
    rect.setInteractive({ useHandCursor: true })
      .on('pointerover', () => { rect.setAlpha(1); rect.setStrokeStyle(3, 0xffffff); })
      .on('pointerout',  () => { rect.setAlpha(0.85); rect.setStrokeStyle(2, borderColor); })
      .on('pointerdown', () => action());
    this.push(rect, txt);
  }

  private addBackBtn(label = '← Back', action?: () => void): void {
    const { width, height } = this.scale;
    const back = this.add.text(width / 2, height - 72, label, {
      fontSize: '16px', fontFamily: 'Arial, sans-serif', color: '#556688',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      .on('pointerover', () => back.setColor('#aabbcc'))
      .on('pointerout',  () => back.setColor('#556688'))
      .on('pointerdown', () => action ? action() : this.renderRole());
    this.push(back);
  }

  // ── Role selection ────────────────────────────────────────────────

  private renderRole(): void {
    this.clearScreen();
    this.screen = 'role';
    const { width, height } = this.scale;
    const cx = width / 2;

    const title = this.add.text(cx, 170, 'ONLINE PVP', {
      fontSize: '28px', fontFamily: '"Arial Black", sans-serif', color: '#ff8844',
    }).setOrigin(0.5);
    this.push(title);

    this.addBtn(cx, height / 2 - 44, 'HOST GAME', 0x1a2a1a, 0x44cc44, () => this.startHost());
    this.addBtn(cx, height / 2 + 48, 'JOIN GAME', 0x1a1a2a, 0x4466ff, () => this.renderJoinInput());

    this.addBackBtn('← Back to Title', () => {
      this.cleanupManager();
      this.scene.start('TitleScene');
    });

    this.setStatus('Choose your role to start an online match.');
  }

  // ── Host flow ─────────────────────────────────────────────────────

  private async startHost(): Promise<void> {
    this.clearScreen();
    this.screen = 'connecting';
    const { width, height } = this.scale;
    const cx = width / 2;
    const msg = this.add.text(cx, height / 2, 'Creating room…', {
      fontSize: '20px', fontFamily: 'Arial, sans-serif', color: '#888888',
    }).setOrigin(0.5);
    this.push(msg);
    this.setStatus('Connecting to PeerJS signaling server…');

    this.manager = new PeerJSNetworkManager();
    this.manager.onError((err) => this.handleError(err));
    this.manager.onDisconnected(() => this.handleDisconnect());

    try {
      const code = await this.manager.hostRoom();
      this.renderWaiting(code);
    } catch (err) {
      this.handleError(String(err));
    }
  }

  private renderWaiting(code: string): void {
    this.clearScreen();
    this.screen = 'waiting';
    const { width, height } = this.scale;
    const cx = width / 2;

    const lbl = this.add.text(cx, height / 2 - 80, 'Share this code with your opponent:', {
      fontSize: '18px', fontFamily: 'Arial, sans-serif', color: '#888888',
    }).setOrigin(0.5);
    const codeText = this.add.text(cx, height / 2 - 16, code, {
      fontSize: '52px', fontFamily: '"Arial Black", sans-serif',
      color: '#ffcc44', stroke: '#884400', strokeThickness: 4,
    }).setOrigin(0.5);
    const waitLbl = this.add.text(cx, height / 2 + 56, 'Waiting for opponent to connect…', {
      fontSize: '16px', fontFamily: 'Arial, sans-serif', color: '#666688',
    }).setOrigin(0.5);
    this.push(lbl, codeText, waitLbl);

    this.addBackBtn('← Cancel', () => { this.cleanupManager(); this.renderRole(); });
    this.setStatus(`Room code: ${code}  •  Waiting for opponent…`);

    this.manager!.onConnected(() => {
      this.setStatus('Opponent connected! Choose your element.');
      this.renderElementPick();
    });
    this.manager!.onLobbyReceived((pkt) => this.handleLobbyPacket(pkt));
  }

  // ── Guest flow ────────────────────────────────────────────────────

  private renderJoinInput(): void {
    this.clearScreen();
    this.screen = 'join-input';
    const { width, height } = this.scale;
    const cx = width / 2;

    const lbl = this.add.text(cx, height / 2 - 110, 'Enter the 6-character room code:', {
      fontSize: '18px', fontFamily: 'Arial, sans-serif', color: '#888888',
    }).setOrigin(0.5);
    const box = this.add.rectangle(cx, height / 2 - 24, 320, 76, 0x111122).setStrokeStyle(2, 0x4466ff);
    this.joinCodeText = this.add.text(cx, height / 2 - 24, '______', {
      fontSize: '44px', fontFamily: '"Arial Black", sans-serif', color: '#ffcc44',
    }).setOrigin(0.5);
    const hint = this.add.text(cx, height / 2 + 52, 'Type code, then press ENTER', {
      fontSize: '13px', fontFamily: 'Arial, sans-serif', color: '#555566',
    }).setOrigin(0.5);
    this.push(lbl, box, this.joinCodeText, hint);

    this.addBackBtn('← Back', () => { this.joinCodeBuffer = ''; this.renderRole(); });
    this.setStatus('Type the 6-character room code from your opponent.');
    this.joinCodeBuffer = '';
    this.updateJoinCodeDisplay();

    this.keyListener = (e: KeyboardEvent) => this.handleJoinKeydown(e);
    this.input.keyboard!.on('keydown', this.keyListener);
  }

  private updateJoinCodeDisplay(): void {
    const filled = this.joinCodeBuffer;
    const display = filled + '_'.repeat(Math.max(0, 6 - filled.length));
    this.joinCodeText?.setText(display);
  }

  private handleJoinKeydown(e: KeyboardEvent): void {
    if (this.screen !== 'join-input') return;
    const key = e.key.toUpperCase();
    if (key === 'BACKSPACE') {
      this.joinCodeBuffer = this.joinCodeBuffer.slice(0, -1);
      this.updateJoinCodeDisplay();
    } else if (key === 'ENTER' && this.joinCodeBuffer.length === 6) {
      this.startJoin(this.joinCodeBuffer);
    } else if (key.length === 1 && /[A-Z0-9]/.test(key) && this.joinCodeBuffer.length < 6) {
      this.joinCodeBuffer += key;
      this.updateJoinCodeDisplay();
    }
  }

  private async startJoin(code: string): Promise<void> {
    this.clearScreen();
    this.screen = 'connecting';
    const { width, height } = this.scale;
    const cx = width / 2;
    const msg = this.add.text(cx, height / 2, `Connecting to room ${code}…`, {
      fontSize: '20px', fontFamily: 'Arial, sans-serif', color: '#888888',
    }).setOrigin(0.5);
    this.push(msg);
    this.setStatus(`Connecting to ${code}…`);

    this.manager = new PeerJSNetworkManager();
    this.manager.onError((err) => this.handleError(err));
    this.manager.onDisconnected(() => this.handleDisconnect());
    this.manager.onLobbyReceived((pkt) => this.handleLobbyPacket(pkt));

    try {
      await this.manager.joinRoom(code);
      this.setStatus('Connected! Choose your element.');
      this.renderElementPick();
    } catch (err) {
      this.handleError(String(err));
    }
  }

  // ── Element selection ─────────────────────────────────────────────

  private renderElementPick(): void {
    this.clearScreen();
    this.screen = 'element-pick';
    const { width, height } = this.scale;
    const cx = width / 2;

    const role = this.manager?.role ?? 'host';
    const title = this.add.text(cx, 155, `${role === 'host' ? 'HOST' : 'GUEST'} — Choose your element`, {
      fontSize: '20px', fontFamily: 'Arial, sans-serif', color: '#888888',
    }).setOrigin(0.5);
    this.push(title);

    const available = ALL_ELEMENTS.filter((e) =>
      !COMBINED_IDS.has(e.id) || PlayerData.isElementUnlocked(e.id),
    );

    const cardW = 120;
    const cardH = 135;
    const gap = 10;
    const cols = 5;
    const rows = Math.ceil(available.length / cols);
    const gridW = cols * cardW + (cols - 1) * gap;
    const startX = cx - gridW / 2;
    const startY = height / 2 - (rows * (cardH + gap)) / 2 + 30;

    available.forEach((el, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const bx = startX + col * (cardW + gap) + cardW / 2;
      const by = startY + row * (cardH + gap) + cardH / 2;

      const card  = this.add.rectangle(bx, by, cardW, cardH, el.color, 0.7).setStrokeStyle(2, el.color);
      const emoji = this.add.text(bx, by - 26, el.emoji, { fontSize: '32px' }).setOrigin(0.5);
      const name  = this.add.text(bx, by + 16, el.name.toUpperCase(), {
        fontSize: '11px', fontFamily: '"Arial Black", sans-serif', color: '#ffffff',
      }).setOrigin(0.5);
      const hint  = this.add.text(bx, by + 34, '▶ SELECT', {
        fontSize: '10px', fontFamily: 'Arial, sans-serif', color: '#ffcc00',
      }).setOrigin(0.5);

      card.setInteractive({ useHandCursor: true })
        .on('pointerover', () => { card.setAlpha(1); card.setStrokeStyle(3, 0xffffff); })
        .on('pointerout',  () => { card.setAlpha(0.7); card.setStrokeStyle(2, el.color); })
        .on('pointerdown', () => this.handleElementChosen(el.id));

      this.push(card, emoji, name, hint);
    });

    this.setStatus('Pick your element. Waiting for opponent to pick theirs…');
  }

  private handleElementChosen(elementId: string): void {
    if (this.screen !== 'element-pick') return;
    this.myElementId = elementId;
    this.screen = 'waiting-opponent';
    this.manager!.sendLobby({ type: 'lobby', action: 'element-chosen', elementId });
    const el = ALL_ELEMENTS.find((e) => e.id === elementId);
    this.setStatus(`You chose ${el?.emoji ?? ''} ${el?.name ?? elementId}. Waiting for opponent…`, '#ffcc44');

    // Dim cards visually
    const { width, height } = this.scale;
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.35).setDepth(4);
    const msg = this.add.text(width / 2, height / 2, `${el?.emoji ?? ''} ${el?.name ?? elementId}\nWaiting for opponent…`, {
      fontSize: '24px', fontFamily: '"Arial Black", sans-serif', color: '#ffcc44',
      align: 'center',
    }).setOrigin(0.5).setDepth(5);
    this.push(overlay, msg);

    this.maybeStartGame();
  }

  private handleLobbyPacket(packet: LobbyPacket): void {
    if (packet.action === 'element-chosen' && packet.elementId) {
      this.opponentElementId = packet.elementId;
      this.maybeStartGame();
    }
    if (packet.action === 'start' && this.manager?.role === 'guest') {
      this.doStartGame();
    }
  }

  private maybeStartGame(): void {
    if (!this.myElementId || !this.opponentElementId) return;
    if (this.manager?.role === 'host') {
      this.manager.sendLobby({ type: 'lobby', action: 'start' });
      this.doStartGame();
    } else {
      // Guest: wait for the 'start' packet, but also start if we have both chosen
      // (handles race condition where 'start' arrived before our pick)
      this.doStartGame();
    }
  }

  private doStartGame(): void {
    if (this.gameStarted || !this.manager || !this.myElementId || !this.opponentElementId) return;
    this.gameStarted = true;

    const role = this.manager.role;
    this.registry.set('networkManager', this.manager);

    // Host = player (left), Guest = npc (right) from ArenaScene's perspective
    const elementId      = role === 'host' ? this.myElementId      : this.opponentElementId;
    const enemyElementId = role === 'host' ? this.opponentElementId : this.myElementId;

    this.scene.start('ArenaScene', {
      elementId,
      enemyElementId,
      isPvP: true,
      isNetworkPvP: true,
      networkRole: role,
    });
  }

  // ── Error / disconnect ────────────────────────────────────────────

  private handleError(err: string): void {
    console.error('[NetworkScene]', err);
    this.setStatus(`Connection error: ${err}`, '#ff4444');
    this.time.delayedCall(2500, () => {
      this.cleanupManager();
      this.renderRole();
    });
  }

  private handleDisconnect(): void {
    if (this.gameStarted) return; // ArenaScene handles mid-game disconnects
    this.setStatus('Opponent disconnected.', '#ff8844');
    this.time.delayedCall(1500, () => {
      this.cleanupManager();
      this.renderRole();
    });
  }

  private cleanupManager(): void {
    this.manager?.disconnect();
    this.manager = null;
    this.registry.remove('networkManager');
    this.gameStarted = false;
  }
}
