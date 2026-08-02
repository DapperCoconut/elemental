import Phaser from 'phaser';
import * as PlayerData from '../data/PlayerData';
import { ELEMENT_MAP } from '../elements/ElementRegistry';
import { C, T, DEPTH, FONT_DISPLAY, FONT_UI, hex, mix } from './Theme';
import { ALL_CORNERS, fillNotched, fillNotchedGradient, strokeNotched } from './Shapes';
import { addButton } from './Button';

/** Quantum's colour, matching `quantumElement.color`. */
const Q_CYAN = 0x7df9ff;

/** Above every scene's own content — this is a modal, and nothing may be clicked behind it. */
const OVERLAY_DEPTH = DEPTH.modal;

const ROW_H = 46;
const PANEL_W = 420;
const MAX_ROWS = 6;

/**
 * The modal that asks "which pair is Quantum carrying today".
 *
 * Four different screens can start a fight — the main menu, the campaign, the gauntlet and the
 * online lobby — and all four have to ask this the moment Quantum is picked. Rather than grow
 * a bond phase into each of them, they all open this: an overlay listing the bonds that have
 * actually been researched, one click each.
 *
 * The list is short by construction (bonds are researched one at a time, in the Entanglement
 * Lab), so this is a list of pairs rather than a roster of elements to combine — the
 * combining already happened. `onPick` receives the chosen order, which matters: the first
 * element is the half the fight starts as.
 */
export function openBondPicker(
  scene: Phaser.Scene,
  onPick: (a: string, b: string) => void,
  onCancel?: () => void,
): void {
  const { width, height } = scene.scale;
  const cx = width / 2;
  const objects: Phaser.GameObjects.GameObject[] = [];

  const close = (): void => {
    for (const o of objects) if (o.active) (o as Phaser.GameObjects.GameObject & { destroy(): void }).destroy();
    objects.length = 0;
  };

  // Every researched pair, plus the starter one that is granted rather than researched, plus
  // whatever is currently equipped — a bond picked on a screen with a fuller roster (or on a
  // cheat profile, where every pair is legal) must not vanish from this list.
  const carried = PlayerData.getQuantumBond();
  const keys = [
    PlayerData.bondKey(PlayerData.STARTER_BOND[0], PlayerData.STARTER_BOND[1]),
    ...(carried ? [PlayerData.bondKey(carried[0], carried[1])] : []),
    ...PlayerData.getResearchedBonds(),
  ];
  const bonds = [...new Set(keys)]
    .map((k) => k.split('+'))
    .filter((h) => h.length === 2 && ELEMENT_MAP[h[0]] && ELEMENT_MAP[h[1]]);

  const rows = Math.min(bonds.length, MAX_ROWS);
  const panelH = 96 + rows * ROW_H;
  const top = height / 2 - panelH / 2;

  // Scrim. Interactive so a stray click lands here rather than on the screen underneath.
  const scrim = scene.add.rectangle(0, 0, width, height, 0x000000, 0.72)
    .setOrigin(0).setDepth(OVERLAY_DEPTH).setInteractive();
  objects.push(scrim);

  const panel = scene.add.graphics().setDepth(OVERLAY_DEPTH + 1);
  fillNotched(panel, cx - PANEL_W / 2, top, PANEL_W, panelH, mix(Q_CYAN, 0x000000, 0.88), 0.97, 12, ALL_CORNERS);
  strokeNotched(panel, cx - PANEL_W / 2, top, PANEL_W, panelH, Q_CYAN, 0.5, 2, 12, ALL_CORNERS);
  objects.push(panel);

  objects.push(scene.add.text(cx, top + 24, '⚛  CHOOSE A BOND', {
    fontSize: '15px', fontFamily: FONT_DISPLAY, color: hex(Q_CYAN), letterSpacing: 2,
  }).setOrigin(0.5).setDepth(OVERLAY_DEPTH + 2));

  objects.push(scene.add.text(cx, top + 46, 'Tap the half you want to start the fight as.', {
    fontSize: '10px', fontFamily: FONT_UI, color: T.faint,
  }).setOrigin(0.5).setDepth(OVERLAY_DEPTH + 2));

  bonds.slice(0, MAX_ROWS).forEach(([a, b], i) => {
    const y = top + 70 + i * ROW_H;
    const ea = ELEMENT_MAP[a];
    const eb = ELEMENT_MAP[b];

    const row = scene.add.graphics().setDepth(OVERLAY_DEPTH + 2);
    fillNotchedGradient(row, cx - PANEL_W / 2 + 16, y, PANEL_W - 32, ROW_H - 8,
      mix(ea.color, 0x000000, 0.7), mix(eb.color, 0x000000, 0.7), 0.95, 6, ALL_CORNERS, 8);
    strokeNotched(row, cx - PANEL_W / 2 + 16, y, PANEL_W - 32, ROW_H - 8, Q_CYAN, 0.3, 1, 6, ALL_CORNERS);
    objects.push(row);

    objects.push(scene.add.text(cx, y + (ROW_H - 8) / 2,
      `${ea.emoji} ${ea.name.toUpperCase()}   ⇄   ${eb.emoji} ${eb.name.toUpperCase()}`, {
        fontSize: '12px', fontFamily: FONT_DISPLAY, color: T.bright, letterSpacing: 1,
      }).setOrigin(0.5).setDepth(OVERLAY_DEPTH + 3));

    const hit = scene.add.rectangle(cx, y + (ROW_H - 8) / 2, PANEL_W - 32, ROW_H - 8, 0x000000, 0.001)
      .setDepth(OVERLAY_DEPTH + 4).setInteractive({ useHandCursor: true });
    // Both orders are offered by tapping either end: left half starts as `a`, right as `b`.
    hit.on('pointerdown', (p: Phaser.Input.Pointer) => {
      const startsWithB = p.worldX > cx;
      close();
      if (startsWithB) onPick(b, a); else onPick(a, b);
    });
    objects.push(hit);
  });

  if (!bonds.length) {
    objects.push(scene.add.text(cx, top + 90, 'No bonds researched yet.\nVisit the Entanglement Lab.', {
      fontSize: '12px', fontFamily: FONT_UI, color: T.faint, align: 'center', lineSpacing: 5,
    }).setOrigin(0.5).setDepth(OVERLAY_DEPTH + 2));
  }

  const cancel = addButton(scene, {
    x: cx, y: top + panelH - 22, w: 120, h: 28, label: 'BACK',
    accent: C.steel, fontSize: 11,
    onClick: () => { close(); onCancel?.(); },
  });
  cancel.container.setDepth(OVERLAY_DEPTH + 3);
  objects.push(cancel.container);
}
