import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import {
  ActiveStatus, StatusDescriptor, collectStatuses, remainingMs,
} from '../../combat/StatusEffects';
import { Sfx } from '../../audio';
import * as UI from '../../ui';

/**
 * What each status sounds like when it lands on the player.
 *
 * The tray already knows the exact moment an effect appears, which makes it the
 * natural place to announce one — no kit has to remember to play a sound when it
 * applies a slow. Anything not listed uses the generic buff/debuff sting chosen
 * by its priority (debuffs sort below 100).
 */
const STATUS_SOUNDS: Record<string, string> = {
  molten: 'status-burn', burning: 'status-burn', 'lava-burn': 'status-burn', 'oily-burn': 'status-burn',
  toxic: 'status-poison', sickness: 'status-poison', 'plague-carrier': 'status-poison',
  bleeding: 'status-bleed',
  frozen: 'status-freeze', frost: 'status-freeze', 'void-frost': 'status-freeze',
  permafrost: 'status-freeze', permavoid: 'status-freeze',
  disarmed: 'status-stun', chicken: 'status-stun', 'chain-bound': 'status-root',
  skewered: 'status-root', wrenched: 'status-curse', vibration: 'status-mark',
  silenced: 'status-silence',
  confused: 'status-confuse', wandering: 'status-confuse', hallucinating: 'status-confuse',
  inverted: 'status-confuse', intoxicated: 'status-confuse', unsteady: 'status-debuff',
  lagging: 'glitch', panicked: 'status-fear', hopeless: 'status-fear',
  'high-gravity': 'status-slow', sluggish: 'status-slow', hobbled: 'status-slow', slowed: 'status-slow',
  exposed: 'status-mark', marked: 'status-mark', vulnerable: 'status-mark',
  purged: 'status-debuff', 'heal-block': 'status-curse', 'dark-link': 'status-drain',
  oily: 'status-debuff', fragile: 'status-debuff', weakened: 'status-debuff',
  shrunk: 'status-debuff', grown: 'status-buff',
  invincible: 'status-invincible', levitating: 'status-invincible',
  'in-menu': 'shield-up',
  unbreakable: 'status-invincible', unstoppable: 'status-invincible',
  'shield-charge': 'shield-up', 'shield-hp': 'shield-up', absorbing: 'shield-up',
  armored: 'shield-up', clotted: 'shield-up', 'weak-hp': 'shield-up',
  'natural-clot': 'status-regen', regen: 'status-regen',
  thorns: 'status-buff', empowered: 'status-buff', crit: 'status-buff', dodge: 'status-buff',
  haste: 'status-haste', swift: 'status-haste',
};

// ── StatusHudArenaApi ─────────────────────────────────────────────────────

export interface StatusHudArenaApi {
  readonly scene: Phaser.Scene;
  readonly player: Fighter;
  /** Invasion pushes the tray down a row so it clears the shard/difficulty corner labels. */
  readonly isInvasion: boolean;
}

/** A kit-registered effect that has no generic Fighter field behind it. */
export interface CustomStatus {
  name: string;
  emoji: string;
  color: number;
  description: string;
  /** Expiry in either clock (Date.now() epoch or scene.time.now); omit for untimed. */
  until?: number;
  /** Stack/magnitude shown in the corner; omit for none. */
  count?: number;
  suffix?: string;
  /** Sort position. Defaults to 120 (alongside the utility buffs). */
  priority?: number;
}

const BOX = 34;
const GAP = 4;
const PER_ROW = 9;
const MAX_ROWS = 2;
const SLOT_COUNT = PER_ROW * MAX_ROWS;

/** Gap from the right edge of the screen. Rows fill right-to-left from there. */
const MARGIN_X = 16;
/**
 * Row 1 sits below the 1v1 "ENEMY" label at y=20. Invasion adds a row of offset on top,
 * to clear the shard counter and difficulty badge stacked at the top-right corner.
 */
const ORIGIN_Y = 60;

const DEPTH_BOX = 40;
const DEPTH_FILL = 41;
const DEPTH_ICON = 42;
const DEPTH_COUNT = 43;
const DEPTH_TIP_PANEL = 50;
const DEPTH_TIP_TEXT = 51;

const TIP_W = 230;
const TIP_PAD = 8;

/** A synthetic "and N more" entry standing in for effects past the last box. */
function overflowChip(rest: ActiveStatus[]): ActiveStatus {
  return {
    desc: {
      id: '__overflow__', name: `+${rest.length} more`, emoji: '➕', color: 0x8899aa,
      description: rest.map((s) => `${s.desc.emoji} ${s.desc.name}`).join('\n'),
      priority: 999, kind: 'amount', read: () => 0,
    },
    until: 0, remainingMs: 0, count: rest.length,
  };
}

interface Slot {
  bg: Phaser.GameObjects.Rectangle;
  fill: Phaser.GameObjects.Rectangle;
  icon: Phaser.GameObjects.Text;
  count: Phaser.GameObjects.Text;
  /** Descriptor id currently bound to this slot, or null when hidden. */
  boundId: string | null;
  /** What the frame layer paints for this slot this frame. */
  color: number;
  ratio: number;
  debuff: boolean;
  remainingMs: number;
}

/**
 * The top-right effect tray: one box per status currently on the local player, up to nine
 * per row wrapping to a second row. Each box is tinted to match its emoji and carries a
 * fill that drains bottom-up as the effect expires; hovering one opens a tooltip with the
 * exact seconds left and a description of what the effect does.
 *
 * Everything is read off the local player's own `Fighter`, which every mode writes to
 * locally — online play is victim-authoritative (the peer's cast is replayed on this sim,
 * and that replay is what stamps the status onto our fighter) and invasion husks debuff
 * `arena.player` directly. So there is nothing mode-specific here and no netcode involved.
 */
export class StatusHudKit {
  private slots: Slot[] = [];
  private tipPanel: Phaser.GameObjects.Graphics | null = null;
  /** One layer paints every slot's tile, timer sweep and rim — redrawn each frame. */
  private frameGfx: Phaser.GameObjects.Graphics | null = null;
  private tipTitle: Phaser.GameObjects.Text | null = null;
  private tipBody: Phaser.GameObjects.Text | null = null;
  private tipTimer: Phaser.GameObjects.Text | null = null;

  /**
   * Per-status duration memory. Fighter fields store only an expiry, never a start time,
   * so the first sighting of an id (or any forward jump in its expiry, i.e. a refresh)
   * defines the full duration the drain is measured against.
   */
  private totals = new Map<string, number>();
  private custom = new Map<string, CustomStatus>();
  private hoveredSlot: Slot | null = null;
  /** Status ids already announced, so a multi-second effect only sounds once. */
  private heard = new Set<string>();

  constructor(private arena: StatusHudArenaApi) {
    this.buildSlots();
    this.buildTooltip();
  }

  /**
   * Called at every match start. ArenaScene restarts itself via `scene.start`, and Phaser
   * destroys the whole display list on scene shutdown — so every object this kit made in the
   * previous match is already dead. Rebuild them rather than reusing the stale references,
   * or the tray silently stops rendering from the second match onward.
   */
  reset(): void {
    this.totals.clear();
    this.custom.clear();
    this.heard.clear();
    this.destroy();
    this.buildSlots();
    this.buildTooltip();
  }

  /**
   * Register (or with `null`, clear) an element-specific effect that has no generic
   * Fighter field. Safe to call every frame — re-registering the same id just updates it.
   */
  setCustom(id: string, status: CustomStatus | null): void {
    if (status) this.custom.set(id, status);
    else this.custom.delete(id);
  }

  update(_dt: number): void {
    const player = this.arena.player;
    if (!player || !player.active) {
      for (const slot of this.slots) this.hideSlot(slot);
      this.frameGfx?.clear();
      this.hideTooltip();
      return;
    }

    const nowWall = Date.now();
    const nowGame = this.arena.scene.time.now;
    const statuses = collectStatuses(player, nowWall, nowGame, this.customStatuses(nowWall, nowGame));

    // Duration memory: seed on first sight, re-seed whenever an effect is refreshed or
    // extended, and forget ids that dropped off so a later re-application starts fresh.
    const live = new Set<string>();
    for (const s of statuses) {
      live.add(s.desc.id);
      if (s.remainingMs <= 0) continue;
      const known = this.totals.get(s.desc.id);
      if (known === undefined || s.remainingMs > known) this.totals.set(s.desc.id, s.remainingMs);
    }
    for (const id of [...this.totals.keys()]) if (!live.has(id)) this.totals.delete(id);

    // Anything that just appeared in the tray announces itself; anything that
    // dropped off gets a short "effect over" blip and is re-armed to sound again
    // next time it lands.
    for (const s of statuses) {
      const id = s.desc.id;
      if (this.heard.has(id)) continue;
      this.heard.add(id);
      const sound = STATUS_SOUNDS[id] ?? (s.desc.priority < 100 ? 'status-debuff' : 'status-buff');
      Sfx.play(sound, { volume: 0.85 });
    }
    for (const id of [...this.heard]) {
      if (live.has(id)) continue;
      this.heard.delete(id);
      Sfx.play('status-expire', { volume: 0.6 });
    }

    // Two rows hold 18, which is already far more than a normal fight produces. If even
    // that overflows, give up the last box to a chip that names what didn't fit rather
    // than dropping effects with no trace.
    const shown = statuses.length > SLOT_COUNT
      ? [...statuses.slice(0, SLOT_COUNT - 1), overflowChip(statuses.slice(SLOT_COUNT - 1))]
      : statuses;
    shown.forEach((status, i) => this.paintSlot(this.slots[i], status));
    for (let i = shown.length; i < this.slots.length; i++) this.hideSlot(this.slots[i]);
    this.paintFrames();

    this.refreshTooltip(shown);
  }

  /** Tear down all HUD objects (scene shutdown). */
  destroy(): void {
    for (const slot of this.slots) {
      slot.bg.destroy(); slot.fill.destroy(); slot.icon.destroy(); slot.count.destroy();
    }
    this.slots = [];
    this.frameGfx?.destroy();
    this.frameGfx = null;
    this.hoveredSlot = null;
    this.tipPanel?.destroy(); this.tipTitle?.destroy();
    this.tipBody?.destroy(); this.tipTimer?.destroy();
    this.tipPanel = null; this.tipTitle = null; this.tipBody = null; this.tipTimer = null;
  }

  // ── Internals ───────────────────────────────────────────────────────────

  /** Kit-registered effects converted into the same shape as Fighter-sourced ones. */
  private customStatuses(nowWall: number, nowGame: number): ActiveStatus[] {
    const out: ActiveStatus[] = [];
    for (const [id, c] of this.custom) {
      const until = c.until ?? 0;
      const left = until > 0 ? remainingMs(until, nowWall, nowGame) : 0;
      if (until > 0 && left <= 0) { this.custom.delete(id); continue; }
      const desc: StatusDescriptor = {
        id, name: c.name, emoji: c.emoji, color: c.color, description: c.description,
        priority: c.priority ?? 120,
        kind: until > 0 ? 'timer' : 'flag',
        read: () => 0,
        suffix: c.suffix,
      };
      out.push({ desc, until, remainingMs: left, count: c.count ?? 0 });
    }
    return out;
  }

  private buildSlots(): void {
    const scene = this.arena.scene;
    this.frameGfx = scene.add.graphics().setDepth(DEPTH_BOX).setScrollFactor(0);
    for (let i = 0; i < SLOT_COUNT; i++) {
      // The rectangle is only the hover target now; the frame layer paints the tile.
      const bg = scene.add.rectangle(0, 0, BOX, BOX, 0x000000, 0.001)
        .setDepth(DEPTH_BOX).setScrollFactor(0).setVisible(false);
      const fill = scene.add.rectangle(0, 0, BOX - 4, BOX - 4, 0x333355, 0)
        .setOrigin(0.5, 1).setDepth(DEPTH_FILL).setScrollFactor(0).setVisible(false);
      const icon = scene.add.text(0, 0, '', { fontSize: '18px' })
        .setOrigin(0.5).setDepth(DEPTH_ICON).setScrollFactor(0).setVisible(false);
      const count = scene.add.text(0, 0, '', {
        fontSize: '10px', fontFamily: UI.FONT_DISPLAY,
        color: '#ffffff', stroke: '#000000', strokeThickness: 3,
      }).setOrigin(1, 1).setDepth(DEPTH_COUNT).setScrollFactor(0).setVisible(false);

      const slot: Slot = { bg, fill, icon, count, boundId: null, color: 0, ratio: 1, debuff: false, remainingMs: 0 };
      // Hover only — no pointerdown handler, so the arena's click-to-cast path is untouched.
      bg.setInteractive({ useHandCursor: false })
        .on('pointerover', () => { this.hoveredSlot = slot; })
        .on('pointerout', () => { if (this.hoveredSlot === slot) this.hoveredSlot = null; });

      this.slots.push(slot);
    }
    this.layoutSlots();
  }

  /**
   * Place every pooled box on its row/column for the current mode. Columns run right-to-left
   * from a fixed anchor at the screen's right edge, so a box never shifts as neighbours come
   * and go — the highest-priority effect always sits in the far-right slot.
   */
  private layoutSlots(): void {
    const rightX = this.arena.scene.scale.width - MARGIN_X;
    const baseY = ORIGIN_Y + (this.arena.isInvasion ? BOX + GAP : 0);
    this.slots.forEach((slot, i) => {
      const col = i % PER_ROW;
      const row = Math.floor(i / PER_ROW);
      const x = rightX - col * (BOX + GAP) - BOX / 2;
      const y = baseY + row * (BOX + GAP) + BOX / 2;
      slot.bg.setPosition(x, y);
      slot.fill.setPosition(x, y + BOX / 2 - 2);
      slot.icon.setPosition(x, y - 1);
      slot.count.setPosition(x + BOX / 2 - 2, y + BOX / 2 - 1);
    });
  }

  private buildTooltip(): void {
    const scene = this.arena.scene;
    this.tipPanel = scene.add.graphics().setDepth(DEPTH_TIP_PANEL).setScrollFactor(0).setVisible(false);
    this.tipTitle = scene.add.text(0, 0, '', {
      fontSize: '13px', fontFamily: UI.FONT_DISPLAY, color: '#ffffff', stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0, 0).setDepth(DEPTH_TIP_TEXT).setScrollFactor(0).setVisible(false);
    this.tipTimer = scene.add.text(0, 0, '', {
      fontSize: '11px', fontFamily: UI.FONT_DISPLAY, color: '#ffdd66',
    }).setOrigin(0, 0).setDepth(DEPTH_TIP_TEXT).setScrollFactor(0).setVisible(false);
    this.tipBody = scene.add.text(0, 0, '', {
      fontSize: '11px', fontFamily: UI.FONT_UI, color: '#c8d4e4', wordWrap: { width: TIP_W - TIP_PAD * 2 },
    }).setOrigin(0, 0).setDepth(DEPTH_TIP_TEXT).setScrollFactor(0).setVisible(false);
  }

  private paintSlot(slot: Slot, status: ActiveStatus): void {
    const { desc } = status;
    slot.boundId = desc.id;

    slot.bg.setVisible(true);
    slot.icon.setVisible(true).setText(desc.emoji);

    const total = this.totals.get(desc.id) ?? 0;
    slot.ratio = status.remainingMs > 0 && total > 0
      ? Phaser.Math.Clamp(status.remainingMs / total, 0, 1)
      : 1;
    slot.color = desc.color;
    slot.debuff = desc.priority < 100;
    slot.remainingMs = status.remainingMs;
    // A timer about to lapse blinks its icon.
    const ending = status.remainingMs > 0 && status.remainingMs < 1500;
    slot.icon.setAlpha(ending ? 0.55 + 0.45 * Math.abs(Math.sin(this.arena.scene.time.now * 0.012)) : 1);

    const label = this.countLabel(status);
    slot.count.setVisible(label !== '').setText(label);
  }

  /**
   * Every visible tile: a drop-shadowed plate tinted by the effect's colour, cut on the
   * diagonal for debuffs and on all four corners for buffs so the two read apart at a glance,
   * a clock sweep darkening the time already spent, and a rim that drains around the tile.
   */
  private paintFrames(): void {
    const g = this.frameGfx;
    if (!g || !g.active) return;
    g.clear();
    const now = this.arena.scene.time.now;
    for (const slot of this.slots) {
      if (!slot.boundId || !slot.bg.visible) continue;
      const cx = slot.bg.x;
      const cy = slot.bg.y;
      const x = cx - BOX / 2;
      const y = cy - BOX / 2;
      const col = slot.color;
      const corners = slot.debuff ? UI.DIAGONAL_CORNERS : UI.ALL_CORNERS;
      const cut = slot.debuff ? 9 : 6;

      UI.fillNotched(g, x + 1, y + 3, BOX, BOX, 0x000000, 0.5, cut, corners);
      UI.fillNotchedGradient(g, x, y, BOX, BOX,
        UI.mix(UI.tintPlate(col, 0.35), 0xffffff, 0.06), UI.mix(UI.tintPlate(col, 0.15), 0x000000, 0.5),
        0.95, cut, corners, 10);
      // Coloured core glow behind the icon.
      g.fillStyle(col, 0.16); g.fillCircle(cx, cy - 1, BOX * 0.36);
      g.fillStyle(col, 0.1); g.fillCircle(cx, cy - 1, BOX * 0.46);

      // Clock sweep over the spent portion of a timed effect.
      if (slot.ratio < 0.999) {
        const start = -Math.PI / 2;
        const spent = (1 - slot.ratio) * Math.PI * 2;
        g.fillStyle(0x000000, 0.45);
        // Kept inside the tile's inscribed circle so the sweep never spills past the plate.
        g.slice(cx, cy, BOX * 0.42, start, start + spent, false);
        g.fillPath();
      }

      UI.strokeNotched(g, x, y, BOX, BOX, UI.mix(col, 0x000000, 0.35), 0.9, 3, cut, corners);
      UI.strokeNotched(g, x, y, BOX, BOX, col, 0.85, 1.5, cut, corners);
      UI.drawSheen(g, x, y, BOX, BOX, UI.lighten(col, 0.7), 0.4, cut);

      // Remaining-time rim along the foot of the tile.
      if (slot.ratio < 0.999) {
        g.fillStyle(0x000000, 0.6);
        g.fillRect(x + 4, y + BOX - 4, BOX - 8, 2.5);
        g.fillStyle(UI.lighten(col, 0.35), 1);
        g.fillRect(x + 4, y + BOX - 4, (BOX - 8) * slot.ratio, 2.5);
      }

      // Debuffs carry a small warning chevron, buffs a small spark.
      if (slot.debuff) {
        g.fillStyle(0xff4d4d, 0.95);
        g.fillTriangle(x + BOX - 3, y + 3, x + BOX - 10, y + 3, x + BOX - 3, y + 10);
      } else {
        UI.fillDiamond(g, x + 5, y + 5, 2.5, UI.lighten(col, 0.5), 0.9);
      }

      // Lapsing soon: the rim flashes.
      if (slot.remainingMs > 0 && slot.remainingMs < 1500) {
        const a = Math.abs(Math.sin(now * 0.012));
        UI.strokeNotched(g, x - 2, y - 2, BOX + 4, BOX + 4, 0xffffff, a * 0.6, 1.5, cut + 1, corners);
      }
    }
  }

  private countLabel(status: ActiveStatus): string {
    const { desc, count } = status;
    if (count <= 0) return '';
    if (desc.kind === 'stack') return `x${count}`;
    return `${count}${desc.suffix ?? ''}`;
  }

  private hideSlot(slot: Slot): void {
    slot.boundId = null;
    slot.bg.setVisible(false);
    slot.fill.setVisible(false);
    slot.icon.setVisible(false);
    slot.count.setVisible(false);
  }

  private refreshTooltip(shown: ActiveStatus[]): void {
    const slot = this.hoveredSlot;
    if (!slot || !slot.boundId) { this.hideTooltip(); return; }
    const status = shown.find((s) => s.desc.id === slot.boundId);
    if (!status) { this.hideTooltip(); return; }

    const panel = this.tipPanel!; const title = this.tipTitle!;
    const body = this.tipBody!; const timer = this.tipTimer!;
    const { desc } = status;

    title.setText(desc.name).setColor(`#${desc.color.toString(16).padStart(6, '0')}`);
    timer.setText(this.tooltipDetail(status));
    body.setText(desc.description);

    // Lay the panel out under the hovered box, right-aligned to it so a box near the screen
    // edge opens inward. The clamp below is the backstop.
    const anchorX = slot.bg.x + BOX / 2 - TIP_W;
    const anchorY = slot.bg.y + BOX / 2 + 6;
    const height = TIP_PAD * 2 + title.height + timer.height + body.height + 6;
    const { width: SW, height: SH } = this.arena.scene.scale;
    const x = Phaser.Math.Clamp(anchorX, 4, Math.max(4, SW - TIP_W - 4));
    const y = Phaser.Math.Clamp(anchorY, 4, Math.max(4, SH - height - 4));

    panel.clear();
    UI.fillNotched(panel, x + 2, y + 4, TIP_W, height, 0x000000, 0.5, 8);
    UI.fillNotchedGradient(panel, x, y, TIP_W, height,
      UI.mix(UI.tintPlate(desc.color, 0.22), 0xffffff, 0.04), UI.mix(UI.C.void_, desc.color, 0.05), 0.97, 8, UI.ALL_CORNERS, 12);
    UI.strokeNotched(panel, x, y, TIP_W, height, desc.color, 0.75, 1.5, 8);
    panel.fillStyle(desc.color, 0.8);
    panel.fillRect(x + 1, y + 8, 2, height - 16);
    UI.drawSheen(panel, x, y, TIP_W, height, UI.lighten(desc.color, 0.7), 0.35, 8);
    panel.setVisible(true);
    title.setPosition(x + TIP_PAD, y + TIP_PAD).setVisible(true);
    timer.setPosition(x + TIP_PAD, y + TIP_PAD + title.height + 2).setVisible(true);
    body.setPosition(x + TIP_PAD, y + TIP_PAD + title.height + timer.height + 5).setVisible(true);
  }

  /** The yellow line under the tooltip title: exact time left, or the stack/magnitude. */
  private tooltipDetail(status: ActiveStatus): string {
    const parts: string[] = [];
    if (status.remainingMs > 0) parts.push(`${(status.remainingMs / 1000).toFixed(1)}s remaining`);
    if (status.count > 0) {
      parts.push(status.desc.kind === 'stack'
        ? `${status.count} stack${status.count === 1 ? '' : 's'}`
        : `${status.count}${status.desc.suffix ?? ''}`);
    }
    return parts.join('  ·  ') || 'Active';
  }

  private hideTooltip(): void {
    this.tipPanel?.setVisible(false);
    this.tipTitle?.setVisible(false);
    this.tipBody?.setVisible(false);
    this.tipTimer?.setVisible(false);
  }
}
