import Phaser from 'phaser';
import { FONT_UI } from '../../ui';
import { TownWalker } from '../../campaign/town/TownWalker';
import { Net } from '../../network/NetworkManager';
import * as Save from '../IslesSave';
import { Coop } from '../net/IslesCoop';
import type { FightCall } from '../net/IslesMsg';
import type { Pt } from '../IslesTypes';

/**
 * The party, in the open world: the other players walking the same court, the room code on the HUD, and
 * the three things a party does together — go through a gate, start a fight, see the world change.
 *
 * `IsleWorldScene` owns one per area. Outside a party it does nothing at all.
 */

export interface CoopWorldHooks {
  /** Go to `area` because the party is (never asks the host again). */
  follow(area: string, o: { arriveFrom?: string; pos?: Pt }): void;
  /** Host: a guest walked through a gate — lead the party there, if the host is free to. */
  lead(area: string, o: { arriveFrom?: string; pos?: Pt }): void;
  /** Launch this fight (guest: the host called it; host: a guest asked for it). */
  fight(call: FightCall, asked: boolean): void;
  /** The world changed under us (a court freed, a revolt risen): redraw the area where we stand. */
  redraw(): void;
  /** The party is over: go home. */
  home(why: string): void;
  toast(s: string): void;
  /** Talking, trading or fishing — not a moment to be yanked elsewhere. */
  busy(): boolean;
}

interface Other { walker: TownWalker; plate: Phaser.GameObjects.Text; x: number; y: number; face: number; element: string }

const OVERLAYS = ['IslesInventoryScene', 'IslesGeneScene', 'IslesMapScene'];

export class CoopWorld {
  private others = new Map<number, Other>();
  private hud: Phaser.GameObjects.Text;
  private sendAt = 0;
  private snapAt = 0;
  private sig = '';
  private redrawDue = false;
  private gone = false;

  constructor(private scene: Phaser.Scene, private area: string, private hooks: CoopWorldHooks, hudDepth: number) {
    this.hud = scene.add.text(16, 42, '', {
      fontFamily: FONT_UI, fontSize: '12px', color: '#bfe6ff', stroke: '#000', strokeThickness: 3,
    }).setScrollFactor(0).setDepth(hudDepth);
    this.sig = this.worldSig();
    Coop.world = {
      onWorld: (area) => this.onWorld(area),
      onGoto: (m, from) => {
        if (this.gone) return;
        const o = { arriveFrom: m.arriveFrom, pos: m.x !== undefined && m.y !== undefined ? { x: m.x, y: m.y } : undefined };
        if (Coop.isHost) {
          if (!this.hooks.busy()) this.hooks.lead(m.area, o);
          else this.hooks.toast(`${Coop.nameOf(from)} wants to lead the party on.`);
        }
        else if (m.area !== this.area) { this.surface(); this.hooks.follow(m.area, o); }
      },
      onFight: (call, from) => {
        if (this.gone) return;
        if (Coop.isHost && this.hooks.busy()) { this.hooks.toast(`${Coop.nameOf(from)} is calling the party to a fight.`); return; }
        this.surface();
        this.hooks.fight(call, Coop.isHost);
      },
      onSea: (dest) => this.hooks.toast(`⛵ The host has put to sea${dest === 'wastes' ? ' for the Far Wastes' : ''}. Wait on the quay.`),
      onLeft: (why) => { if (!this.gone) { this.surface(); this.hooks.home(why); } },
      onParty: () => this.refreshHud(),
    };
    if (Coop.isGuest) Coop.hello();
    else if (Coop.isHost) Coop.pushWorld(area);
    this.refreshHud();
  }

  /** Close whatever menu is over the world, so the world can act. */
  private surface(): void {
    for (const k of OVERLAYS) if (this.scene.scene.isActive(k)) this.scene.scene.stop(k);
    if (this.scene.scene.isPaused()) this.scene.scene.resume();
  }

  /** What a guest would have to see redrawn if it changed. */
  private worldSig(): string {
    if (!Save.hasActive()) return '';
    const s = Save.S();
    return [s.encounters.length, s.princes.length, s.monarchs.length, s.hard, s.flags.length, JSON.stringify(s.unrest)].join('|');
  }

  private onWorld(area: string): void {
    if (this.gone || !Coop.isGuest) return;
    if (area !== this.area) {
      // The party is somewhere else (I have just arrived, or come back from a fight): go to them.
      if (!this.hooks.busy()) { this.surface(); this.hooks.follow(area, {}); }
      return;
    }
    const sig = this.worldSig();
    if (sig !== this.sig) { this.sig = sig; this.redrawDue = true; }
  }

  private refreshHud(): void {
    if (this.gone) return;
    if (!Coop.active) { this.hud.setText(''); return; }
    const code = Coop.roomCode;
    if (Coop.isHost) {
      const n = Net.connected ? Net.otherSlots.length : 0;
      this.hud.setText(code ? `🌐 Room ${code}  ·  ${n ? `${n + 1} in the party` : 'waiting for friends'}` : '🌐 Opening a room…');
    } else {
      this.hud.setText(`🌐 In ${Coop.nameOf(0)}'s world  ·  ${Net.slots.length} in the party`);
    }
  }

  /** Everyone asks the party to go somewhere through this. Returns true when the walk is the party's to make. */
  travel(to: string, o: { arriveFrom?: string; pos?: Pt }): boolean {
    if (!Coop.together) return false;
    const m = { k: 'goto' as const, area: to, arriveFrom: o.arriveFrom, x: o.pos?.x, y: o.pos?.y };
    if (Coop.isGuest) { Coop.send(m); this.hooks.toast('Leading the party on…'); return true; }
    Coop.send(m);
    return false;
  }

  update(now: number, me: { x: number; y: number; f: number; m: boolean }, dt: number): void {
    if (this.gone || !Coop.active) return;
    if (now >= this.sendAt) {
      this.sendAt = now + 100;
      Coop.walk({ area: this.area, x: Math.round(me.x), y: Math.round(me.y), f: Math.round(me.f * 100) / 100, m: me.m });
    }
    if (Coop.isHost && now >= this.snapAt) { this.snapAt = now + 2000; Coop.pushWorld(this.area); this.refreshHud(); }
    if (this.redrawDue && !this.hooks.busy()) { this.redrawDue = false; this.hooks.redraw(); return; }

    const here = Coop.walkersIn(this.area);
    const live = new Set<number>();
    for (const w of here) {
      live.add(w.slot);
      let o = this.others.get(w.slot);
      if (o && o.element !== w.element) { o.walker.destroy(); o.plate.destroy(); this.others.delete(w.slot); o = undefined; }
      if (!o) {
        const walker = new TownWalker(this.scene, w.element, w.x, w.y, { bare: true });
        const plate = this.scene.add.text(w.x, w.y - 64, w.name, {
          fontFamily: FONT_UI, fontSize: '11px', color: '#bfe6ff', stroke: '#000', strokeThickness: 3,
        }).setOrigin(0.5, 1).setDepth(9200);
        o = { walker, plate, x: w.x, y: w.y, face: w.f, element: w.element };
        this.others.set(w.slot, o);
      }
      const dx = w.x - o.x, dy = w.y - o.y;
      // A long way off means they came through a gate: put them there rather than slide them across the map.
      if (dx * dx + dy * dy > 400 * 400) { o.x = w.x; o.y = w.y; } else { o.x += dx * 0.22; o.y += dy * 0.22; }
      o.face = w.f;
      o.walker.update(dt, o.x, o.y, w.m, o.face);
      o.plate.setPosition(o.x, o.y - 64);
    }
    for (const [slot, o] of this.others) {
      if (live.has(slot)) continue;
      o.walker.destroy(); o.plate.destroy();
      this.others.delete(slot);
    }
  }

  /** The others standing in this area, for the minimap. */
  dots(): Pt[] { return [...this.others.values()].map((o) => ({ x: o.x, y: o.y })); }

  destroy(): void {
    this.gone = true;
    if (Coop.world) Coop.world = null;
    for (const o of this.others.values()) { o.walker.destroy(); o.plate.destroy(); }
    this.others.clear();
  }
}
