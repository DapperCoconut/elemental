import Phaser from 'phaser';
import { Sfx } from '../audio';
import * as PlayerData from '../data/PlayerData';

/**
 * The gramophone in the cellar, and the only thing in the mansion that will
 * take money out of your pocket rather than out of the run.
 *
 * Put the needle down and the house skips ahead. Whatever was climbing through
 * the windows stops climbing, the waves you paid past never happen, and you
 * come out the other side facing a night already well underway — with the
 * kill rewards and the boss timer that go with it.
 *
 * Two rules keep it from being a way to buy the whole run:
 *   - It only reaches wave 8. Past that the record is worn through and the
 *     needle skates; nothing you own moves the counter further.
 *   - It is paid in banked **corrupt shards** — the ones on your save, not the
 *     ones this run has scraped together. Skipping is a thing you fund with
 *     previous nights, and the price of each further wave climbs steeply, so a
 *     jump from wave one to wave eight costs more than most runs ever earn.
 *
 * The house charges more the worse the night already is: every difficulty above
 * NORMAL marks the whole ladder up, and once the eye in the corner is awake the
 * price doubles again on top of that.
 */

/** The furthest the needle reaches. Nothing skips past this. */
export const MAX_SKIP_WAVE = 8;

/**
 * What it costs to have the house skip *into* each wave, before multipliers.
 * A skip is charged the sum of every wave it steps over, so the ladder is
 * cumulative and the last rung is most of the bill.
 */
const WAVE_TOLL: Record<number, number> = {
  2: 25, 3: 45, 4: 75, 5: 120, 6: 190, 7: 300, 8: 450,
};

/** Worse nights cost more to walk out of. */
const DIFFICULTY_MULT: Record<string, number> = { normal: 1, brutal: 1.6, masochistic: 2.4 };

/** And once the eye is open, everything in the house wants twice as much. */
const APOCALYPSE_MULT = 2;

/** Price of moving the needle from `from` to `to`, all multipliers applied. */
export function skipPrice(from: number, to: number, difficultyId: string, apocalypse: boolean): number {
  let base = 0;
  for (let w = Math.max(2, from + 1); w <= to; w++) base += WAVE_TOLL[w] ?? 0;
  return Math.round(base * (DIFFICULTY_MULT[difficultyId] ?? 1) * (apocalypse ? APOCALYPSE_MULT : 1));
}

export interface RecordPlayerHooks {
  readonly scene: Phaser.Scene;
  /** The wave the run is on right now — 0 before the first one is announced. */
  currentWave(): number;
  difficultyId(): string;
  apocalypseActive(): boolean;
  /** Drop the needle: cancel what is on the field and set the counter to `wave`. */
  skipTo(wave: number): void;
  /** Co-op guests may look at the sleeve, but the host owns the wave counter. */
  readOnly(): boolean;
}

const DEPTH = 62;

export class RecordPlayer {
  private open = false;
  private objs: Phaser.GameObjects.GameObject[] = [];
  private rowObjs: Phaser.GameObjects.GameObject[] = [];
  /** The record on the platter, spun by hand each frame while the panel is up. */
  private disc: Phaser.GameObjects.Graphics | null = null;
  private discAngle = 0;

  constructor(private hooks: RecordPlayerHooks) {}

  get isOpen(): boolean { return this.open; }

  reset(): void {
    this.close();
  }

  destroy(): void {
    this.close();
  }

  toggle(): void {
    if (this.open) this.close(); else this.show();
  }

  /** The first wave the needle could still reach from where the run stands. */
  private firstTarget(): number {
    return Math.max(2, this.hooks.currentWave() + 1);
  }

  /** Every wave still on the record, cheapest first. Empty once you are past 8. */
  targets(): number[] {
    const out: number[] = [];
    for (let w = this.firstTarget(); w <= MAX_SKIP_WAVE; w++) out.push(w);
    return out;
  }

  private priceOf(wave: number): number {
    return skipPrice(
      this.hooks.currentWave(), wave,
      this.hooks.difficultyId(), this.hooks.apocalypseActive(),
    );
  }

  // ── The panel ─────────────────────────────────────────────────────

  show(): void {
    if (this.open) return;
    this.open = true;
    Sfx.play('ui-open');
    const scene = this.hooks.scene;
    const { width, height } = scene.scale;

    const dim = scene.add.rectangle(width / 2, height / 2, width, height, 0x0a0604, 0.93)
      .setDepth(DEPTH).setInteractive();
    dim.on('pointerdown', () => { /* swallowed */ });
    this.objs.push(dim);

    // The cabinet: a walnut plinth with a brass horn coming out of the corner.
    const cx = width * 0.28, cy = height * 0.54;
    const cab = scene.add.graphics().setDepth(DEPTH + 1);
    cab.fillStyle(0x000000, 0.45);
    cab.fillEllipse(cx, cy + 108, 250, 34);
    cab.fillStyle(0x4a3220, 1);
    cab.fillRoundedRect(cx - 118, cy - 26, 236, 126, 8);
    cab.fillStyle(0x63432a, 1);
    cab.fillRoundedRect(cx - 118, cy - 26, 236, 20, 8);
    cab.lineStyle(2, 0x241608, 1);
    cab.strokeRoundedRect(cx - 118, cy - 26, 236, 126, 8);
    // Inlay banding along the front.
    cab.lineStyle(1, 0xa07a4a, 0.7);
    cab.strokeRoundedRect(cx - 106, cy + 6, 212, 80, 4);
    // Platter felt.
    cab.fillStyle(0x2a1a10, 1);
    cab.fillEllipse(cx, cy - 16, 190, 62);
    cab.fillStyle(0x7a2030, 1);
    cab.fillEllipse(cx, cy - 18, 178, 56);
    this.objs.push(cab);

    // The record itself, redrawn every frame so it turns.
    this.disc = scene.add.graphics().setDepth(DEPTH + 2);
    this.objs.push(this.disc);

    // The horn, and the arm reaching over the platter.
    const horn = scene.add.graphics().setDepth(DEPTH + 3);
    horn.fillStyle(0x8a6a2a, 1);
    horn.fillTriangle(cx + 96, cy - 40, cx + 178, cy - 148, cx + 214, cy - 74);
    horn.fillStyle(0xc79b52, 1);
    horn.fillTriangle(cx + 100, cy - 44, cx + 176, cy - 142, cx + 204, cy - 78);
    horn.fillStyle(0x2a1c0a, 1);
    horn.fillEllipse(cx + 190, cy - 110, 46, 76);
    horn.fillStyle(0x1a1006, 1);
    horn.fillEllipse(cx + 190, cy - 110, 32, 56);
    horn.lineStyle(2, 0xdfc07a, 1);
    horn.strokeTriangle(cx + 96, cy - 40, cx + 178, cy - 148, cx + 214, cy - 74);
    // Tone arm.
    horn.lineStyle(4, 0xa87e3e, 1);
    horn.lineBetween(cx + 96, cy - 40, cx + 26, cy - 24);
    horn.fillStyle(0xdfc07a, 1);
    horn.fillCircle(cx + 96, cy - 40, 6);
    horn.fillStyle(0xe8e0d0, 1);
    horn.fillTriangle(cx + 22, cy - 28, cx + 30, cy - 28, cx + 26, cy - 14);
    this.objs.push(horn);

    this.objs.push(scene.add.text(width / 2, 30, '🎵  THE GRAMOPHONE', {
      fontSize: '18px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
      color: '#e8c88a', stroke: '#1a0e04', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(DEPTH + 4));
    this.objs.push(scene.add.text(width / 2, 52,
      'Drop the needle further down the record and the night skips ahead. '
      + 'Paid from your banked corrupt shards — not this run\'s.', {
        fontSize: '11px', fontFamily: 'Georgia, serif', color: '#a08a6a',
      }).setOrigin(0.5).setDepth(DEPTH + 4));

    const close = scene.add.text(width - 26, 28, '✕', {
      fontSize: '22px', fontFamily: '"Arial Black", sans-serif', color: '#8a7455',
    }).setOrigin(0.5).setDepth(DEPTH + 5).setInteractive({ useHandCursor: true });
    close.on('pointerover', () => close.setColor('#e8c88a'));
    close.on('pointerout', () => close.setColor('#8a7455'));
    close.on('pointerdown', () => this.close());
    this.objs.push(close);

    this.repaint();
  }

  close(): void {
    if (!this.open) return;
    this.open = false;
    Sfx.play('ui-close');
    this.clearRows();
    for (const o of this.objs) o.destroy();
    this.objs = [];
    this.disc = null;
  }

  private clearRows(): void {
    for (const o of this.rowObjs) o.destroy();
    this.rowObjs = [];
  }

  /** The track listing down the right side: one row per wave still on the record. */
  private repaint(): void {
    this.clearRows();
    const scene = this.hooks.scene;
    const { width, height } = scene.scale;
    const panelX = width * 0.72;
    const top = height * 0.2;
    const banked = PlayerData.getCorruptShards();
    const readOnly = this.hooks.readOnly();
    const targets = this.targets();

    const g = scene.add.graphics().setDepth(DEPTH + 2);
    g.fillStyle(0x150d06, 0.95);
    g.fillRoundedRect(panelX - 178, top, 356, height * 0.62, 8);
    g.lineStyle(2, 0x6a4a24, 1);
    g.strokeRoundedRect(panelX - 178, top, 356, height * 0.62, 8);
    this.rowObjs.push(g);

    this.rowObjs.push(scene.add.text(panelX, top + 20, `🩸  ${banked}  BANKED`, {
      fontSize: '15px', fontFamily: '"Arial Black", sans-serif', color: '#cc44ff',
    }).setOrigin(0.5).setDepth(DEPTH + 3));

    const mods: string[] = [];
    const dm = DIFFICULTY_MULT[this.hooks.difficultyId()] ?? 1;
    if (dm !== 1) mods.push(`×${dm} ${this.hooks.difficultyId().toUpperCase()}`);
    if (this.hooks.apocalypseActive()) mods.push(`×${APOCALYPSE_MULT} APOCALYPSE`);
    this.rowObjs.push(scene.add.text(panelX, top + 40,
      mods.length ? `THE HOUSE IS ASKING MORE:  ${mods.join('   ')}` : 'Standing price.', {
        fontSize: '10px', fontFamily: 'Georgia, serif', color: mods.length ? '#ff8866' : '#7a6a52',
      }).setOrigin(0.5).setDepth(DEPTH + 3));

    // A co-op guest has no wave counter of its own — the host owns the night —
    // so it is shown the sleeve rather than a track listing it cannot read.
    if (readOnly) {
      this.rowObjs.push(scene.add.text(panelX, top + 130,
        'Somebody else already has a hand on the arm.\n\n'
        + 'Only the player hosting this house can move the needle. '
        + 'When they do, the night skips for both of you.', {
          fontSize: '13px', fontFamily: 'Georgia, serif', color: '#8a7455', align: 'center',
          wordWrap: { width: 300 },
        }).setOrigin(0.5).setDepth(DEPTH + 3));
      return;
    }

    if (targets.length === 0) {
      this.rowObjs.push(scene.add.text(panelX, top + 130,
        'The record is worn through past the eighth band.\n\n'
        + 'The needle skates. Whatever comes now, comes.', {
          fontSize: '13px', fontFamily: 'Georgia, serif', color: '#8a7455', align: 'center',
          wordWrap: { width: 300 },
        }).setOrigin(0.5).setDepth(DEPTH + 3));
      return;
    }

    let y = top + 70;
    for (const wave of targets) {
      const price = this.priceOf(wave);
      const affordable = banked >= price;
      const usable = affordable && !readOnly;

      const row = scene.add.rectangle(panelX, y + 18, 330, 38, usable ? 0x2a1c0c : 0x1a1208, 0.95)
        .setStrokeStyle(2, usable ? 0xc79b52 : 0x4a3a24)
        .setDepth(DEPTH + 3);
      this.rowObjs.push(row);

      const label = scene.add.text(panelX - 150, y + 18, `▶  SKIP TO WAVE ${wave}`, {
        fontSize: '13px', fontFamily: '"Arial Black", sans-serif',
        color: usable ? '#e8c88a' : '#6a5a44',
      }).setOrigin(0, 0.5).setDepth(DEPTH + 4);
      this.rowObjs.push(label);

      const cost = scene.add.text(panelX + 150, y + 18, `🩸 ${price}`, {
        fontSize: '13px', fontFamily: '"Arial Black", sans-serif',
        color: affordable ? '#cc44ff' : '#8a4466',
      }).setOrigin(1, 0.5).setDepth(DEPTH + 4);
      this.rowObjs.push(cost);

      if (!usable) {
        y += 44;
        continue;
      }
      row.setInteractive({ useHandCursor: true });
      row.on('pointerover', () => { row.setFillStyle(0x40290f, 1); label.setColor('#fff0c8'); });
      row.on('pointerout', () => { row.setFillStyle(0x2a1c0c, 0.95); label.setColor('#e8c88a'); });
      row.on('pointerdown', () => this.buy(wave, price));
      y += 44;
    }

    this.rowObjs.push(scene.add.text(panelX, top + height * 0.62 - 30,
      'Anything already through a window walks back out, and pays nothing on the way.', {
        fontSize: '10px', fontFamily: 'Georgia, serif', color: '#7a6a52', align: 'center',
        wordWrap: { width: 320 },
      }).setOrigin(0.5).setDepth(DEPTH + 3));
  }

  private buy(wave: number, price: number): void {
    if (this.hooks.readOnly()) return;
    if (!PlayerData.spendCorruptShards(price)) {
      // The banked total moved under us (co-op, another tab) — just redraw it.
      Sfx.play('ui-denied');
      this.repaint();
      return;
    }
    Sfx.play('ui-purchase');
    this.hooks.skipTo(wave);
    this.close();
  }

  /** Spins the record while the panel is up. Driven from the kit's frame. */
  update(delta: number): void {
    const g = this.disc;
    if (!this.open || !g) return;
    const { width, height } = this.hooks.scene.scale;
    const cx = width * 0.28, cy = height * 0.54 - 18;
    this.discAngle += delta / 900;
    g.clear();
    // Shellac, seen at a slant — an ellipse rather than a circle.
    g.fillStyle(0x120c0c, 1);
    g.fillEllipse(cx, cy, 172, 54);
    g.lineStyle(1, 0x2e2422, 0.9);
    for (let r = 22; r < 86; r += 9) g.strokeEllipse(cx, cy, r * 2, r * 0.63);
    // The label, turning with it.
    g.fillStyle(0xa8362e, 1);
    g.fillEllipse(cx, cy, 54, 17);
    g.fillStyle(0xd6d0c0, 1);
    for (let i = 0; i < 4; i++) {
      const a = this.discAngle + (i / 4) * Math.PI * 2;
      g.fillCircle(cx + Math.cos(a) * 20, cy + Math.sin(a) * 6.3, 1.6);
    }
    g.fillStyle(0x0a0606, 1);
    g.fillEllipse(cx, cy, 7, 2.4);
    // Highlight sweeping across the grooves as it turns.
    const ha = this.discAngle;
    g.fillStyle(0xffffff, 0.09);
    g.fillTriangle(
      cx, cy,
      cx + Math.cos(ha) * 86, cy + Math.sin(ha) * 27,
      cx + Math.cos(ha + 0.55) * 86, cy + Math.sin(ha + 0.55) * 27,
    );
  }
}
