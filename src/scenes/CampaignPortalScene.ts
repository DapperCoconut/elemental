import Phaser from 'phaser';
import * as CP from '../data/CampaignProgress';
import {
  C, T, DEPTH, FONT_DISPLAY, FONT_UI, hex, mix,
  addButton, addModal, addWell, fillDiamond,
} from '../ui';
import { Music } from '../audio';

const PORTAL_COST = 10;

export class CampaignPortalScene extends Phaser.Scene {
  private slotIdx: 0 | 1 | 2 = 0;
  /** Which crossing this modal is selling: the Abstract portal, or the scar. */
  private realm: 'abstract' | 'corrupt' = 'abstract';

  constructor() {
    super({ key: 'CampaignPortalScene' });
  }

  init(data: { slotIdx: 0 | 1 | 2; realm?: 'abstract' | 'corrupt' }): void {
    this.slotIdx = data?.slotIdx ?? 0;
    this.realm = data?.realm ?? 'abstract';
  }

  create(): void {
    Music.play('campaign');
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;
    const corrupt = this.realm === 'corrupt';
    const purchased = corrupt
      ? CP.isCorruptPortalUnlocked(this.slotIdx)
      : CP.isPortalUnlocked(this.slotIdx);
    const keys = CP.getKeys(this.slotIdx);
    const cost = corrupt ? CP.CORRUPT_PORTAL_COST : PORTAL_COST;
    // The scar wants blood as well as keys: Sovereigns felled in the Abstract Realm.
    const prereqMet = !corrupt || CP.canOpenCorruptPortal(this.slotIdx);
    const canAfford = keys >= cost && prereqMet;
    const accent = corrupt ? C.blood : C.arcane;

    const panel = addModal(this, {
      w: 520, h: 372, accent,
      title: corrupt
        ? (purchased ? '🔴  THE SCAR IS OPEN' : '🔴  THE SCAR')
        : (purchased ? '🌀  PORTAL ACTIVE' : '🌀  OPEN THE PORTAL'),
      glow: 0.6,
    });

    // ── Rift ────────────────────────────────────────────────────────
    // Concentric rings that counter-rotate, so the portal looks alive whether
    // it is open or still sealed.
    const riftY = panel.contentTop + 70;
    for (let ring = 0; ring < 3; ring++) {
      const g = this.add.graphics().setDepth(DEPTH.modal + 1);
      const r = 34 + ring * 13;
      const seg = 10 + ring * 4;
      for (let i = 0; i < seg; i++) {
        if (i % 2 === 1) continue;
        const a0 = (Math.PI * 2 * i) / seg;
        const a1 = (Math.PI * 2 * (i + 0.85)) / seg;
        g.lineStyle(3 - ring * 0.6, accent, purchased ? 0.75 - ring * 0.16 : 0.3 - ring * 0.07);
        g.beginPath();
        g.arc(0, 0, r, a0, a1, false);
        g.strokePath();
      }
      g.setPosition(cx, riftY);
      this.tweens.add({
        targets: g, angle: ring % 2 === 0 ? 360 : -360,
        duration: 12000 + ring * 5000, repeat: -1,
      });
    }

    const core = this.add.graphics().setDepth(DEPTH.modal + 1);
    for (let k = 6; k >= 1; k--) {
      core.fillStyle(accent, purchased ? 0.06 : 0.025);
      core.fillCircle(cx, riftY, 12 + k * 4);
    }
    fillDiamond(core, cx, riftY, 16, mix(C.plate, accent, purchased ? 0.5 : 0.15), 0.95);

    if (purchased) {
      this.add.text(cx, cy + 46, corrupt
        ? 'Press SPACE on the world map to reach\nthe Corrupt Realm. It knows you now.'
        : 'Press SPACE on the world map\nto cross between realms.', {
        fontSize: '16px', fontFamily: FONT_UI, color: T.normal, align: 'center', lineSpacing: 7,
      }).setOrigin(0.5).setDepth(DEPTH.modalContent);

      addButton(this, {
        x: cx, y: cy + 128, w: 180, h: 44,
        label: 'CLOSE', icon: '◄', variant: 'quiet', accent: C.steel, fontSize: 15,
        depth: DEPTH.modalContent,
        onClick: () => this.close(),
      });
    } else {
      this.add.text(cx, cy + 12, corrupt
        ? 'A tear in the Abstract sky, weeping red.\nThe cast-out elements are on the other side.'
        : 'Travel between realms.\nThe Abstract awaits beyond.', {
        fontSize: '15px', fontFamily: FONT_UI, color: T.normal, align: 'center', lineSpacing: 6,
      }).setOrigin(0.5).setDepth(DEPTH.modalContent);

      // Price ledger: cost against the wallet, so the shortfall is obvious.
      addWell(this, cx, cy + 74, 300, 46, accent, DEPTH.modal + 1, 6);
      this.add.text(cx - 130, cy + 74, 'COST', {
        fontSize: '9px', fontFamily: FONT_DISPLAY, color: T.faint, letterSpacing: 2,
      }).setOrigin(0, 0.5).setDepth(DEPTH.modalContent);
      this.add.text(cx - 84, cy + 74, `🗝️ ${cost}`, {
        fontSize: '16px', fontFamily: FONT_DISPLAY, color: T.gold,
      }).setOrigin(0, 0.5).setDepth(DEPTH.modalContent);
      this.add.text(cx + 130, cy + 74, `YOU HAVE  🗝️ ${keys}`, {
        fontSize: '12px', fontFamily: FONT_DISPLAY,
        color: keys >= cost ? T.good : T.bad, letterSpacing: 0.5,
      }).setOrigin(1, 0.5).setDepth(DEPTH.modalContent);

      if (corrupt && !prereqMet) {
        this.add.text(cx, cy + 104,
          `The scar only answers strength: fell ${CP.CORRUPT_PORTAL_CHALLENGES} Sovereigns in the Abstract Realm ` +
          `(${CP.abstractChallengesCleared(this.slotIdx)}/${CP.CORRUPT_PORTAL_CHALLENGES}).`, {
            fontSize: '10.5px', fontFamily: FONT_UI, color: T.bad, align: 'center',
            wordWrap: { width: 420 },
          }).setOrigin(0.5).setDepth(DEPTH.modalContent);
      }

      addButton(this, {
        x: cx, y: cy + 136, w: 220, h: 50,
        label: corrupt ? 'TEAR IT WIDER' : 'PURCHASE', icon: '✦',
        sublabel: canAfford ? undefined : (prereqMet ? 'Not enough keys' : 'Sovereigns still stand'),
        accent: canAfford ? (corrupt ? C.blood : C.verdant) : C.steel,
        variant: canAfford ? 'solid' : 'quiet',
        fontSize: 18,
        depth: DEPTH.modalContent,
        disabled: !canAfford,
        onClick: () => {
          const bought = corrupt
            ? CP.purchaseCorruptPortal(this.slotIdx)
            : CP.purchasePortal(this.slotIdx);
          if (!bought) return;
          // Opening a portal is a campaign-defining moment — step straight
          // through it rather than dumping the player back on the old map
          // (which is also stale by now, since it was drawn with the rift sealed).
          this.cameras.main.flash(420, corrupt ? 220 : 157, corrupt ? 40 : 92, corrupt ? 40 : 255);
          this.input.keyboard!.removeAllListeners();
          this.time.delayedCall(520, () => {
            this.scene.stop('CampaignWorldMapScene');
            this.scene.stop();
            this.scene.start('CampaignWorldMapScene', {
              slotIdx: this.slotIdx,
              mode: corrupt ? 'corrupt' : 'abstract',
            });
          });
        },
      });

      addButton(this, {
        x: cx, y: cy + 186, w: 150, h: 32,
        label: 'BACK', icon: '◄', variant: 'quiet', accent: C.steel, fontSize: 12,
        depth: DEPTH.modalContent,
        onClick: () => this.close(),
      });
    }

    this.input.keyboard!.on('keydown-ESC', () => this.close());
  }

  private close(): void {
    this.scene.stop();
    this.scene.resume('CampaignWorldMapScene');
  }
}
