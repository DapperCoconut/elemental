import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import type { NetBotState, NetCityState } from '../../network/NetworkManager';
import { CityMap, CITY_MAIN } from './CityMap';
import { AllElement } from './AllElement';
import { Companion, companionTag } from './Companions';
import { CityHud } from './CityHud';
import { CityLoadoutApi, DraftCard, DraftOverlay, rollDraft, mutationName } from './CityDraft';
import { cityLaneLabel, cityWarningText } from './CityDirector';
import { ALT_ULT_SLOT } from '../../data/AltUlts';
import { WAVE_BANNER_Y, ROOM_WARNING_MS } from '../InvasionKit';
import { CityRelics } from './CityRelics';
import { CityDream } from './CityDream';
import { CityMutations } from './CityMutations';
import type { Husk } from '../Husk';

/** What the guest's city view needs from the co-op kit. */
export interface CityGuestHost {
  readonly scene: Phaser.Scene;
  readonly player: Fighter;
  readonly loadout: CityLoadoutApi | null;
  onRoomChanged(room: number): void;
  /** The guest kept a card — relay it to the host. */
  sendPick(kind: string, id: string): void;
  latchPointer(): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  /** The husk replicas the guest can hit. */
  livingHusks(): Husk[];
  /** The arena's projectile group, for the projectile artifacts. */
  readonly projectiles: Phaser.Physics.Arcade.Group | null;
}

interface BotReplica {
  bot: Companion;
  tx: number;
  ty: number;
  seq: number;
}

/**
 * The co-op guest's City. The host simulates everything — husks, the
 * All-Element's health, the bots — so this side only walks its own copy of
 * the map, draws the All-Element and the bots from the host's snapshots, and
 * runs its own draft (its own unlocks, its own loadout). Mutations the guest keeps
 * are its own, run here against the replicas; boons are relayed and the host
 * applies them to the shared world.
 */
export class CityGuest {
  readonly map: CityMap;
  private core: AllElement | null = null;
  private bots: BotReplica[] = [];
  private hud: CityHud;
  private draft: DraftOverlay;
  private fxG: Phaser.GameObjects.Graphics;
  private bursts: Array<{ x: number; y: number; r: number; color: number; t: number; room: number }> = [];
  private lanes: number[] = [];
  private dream: CityDream;
  /** The guest's own mutations. */
  readonly mutations: CityMutations;
  /** The guest's own drafted items and artifacts, run here against the replicas. */
  readonly relics: CityRelics;

  constructor(private host: CityGuestHost) {
    this.map = new CityMap(host.scene, { onRoomChanged: (room) => { this.refreshVisibility(); host.onRoomChanged(room); } });
    this.map.reset();
    const at = this.map.allElementPos();
    this.core = new AllElement(host.scene, at.x, at.y);
    this.hud = new CityHud(host.scene);
    this.draft = new DraftOverlay(host.scene, () => host.latchPointer());
    this.fxG = host.scene.add.graphics().setDepth(6.5);
    this.dream = new CityDream(host.scene, host.player.element.id, (open) => { if (!open) host.latchPointer(); });
    void this.dream.intro();
    const map = this.map;
    this.mutations = new CityMutations({
      get scene() { return host.scene; },
      get player() { return host.player; },
      currentRoom: () => map.currentRoom,
      livingHusks: () => host.livingHusks(),
      showFloatingText: (x, y, t, c) => host.showFloatingText(x, y, t, c),
      authoritative: false,
    });
    this.relics = new CityRelics({
      get scene() { return host.scene; },
      get player() { return host.player; },
      get projectiles() { return host.projectiles; },
      foes: () => host.livingHusks().filter((h) => h.roomIndex === map.currentRoom),
      // Husk shots are the host's; the guest's ghost copies are not slowed or read.
      foeShots: () => [],
      showFloatingText: (x, y, t, c) => host.showFloatingText(x, y, t, c),
      authoritative: false,
      coop: true,
    });
  }

  get currentRoom(): number { return this.map.currentRoom; }
  get isDraftOpen(): boolean { return this.draft.isOpen || this.dream.isOpen; }
  get laneLabel(): string | undefined { return cityLaneLabel(this.lanes); }

  destroy(): void {
    this.draft.close();
    this.dream.destroy();
    this.mutations.destroy();
    this.relics.destroy();
    this.hud.destroy();
    this.fxG.destroy();
    for (const b of this.bots) b.bot.destroy();
    this.bots = [];
    this.core?.destroy();
    this.core = null;
    this.map.destroyHud();
  }

  applySnap(c: NetCityState): void {
    if (this.core) {
      this.core.maxHp = c.mhp;
      this.core.hp = c.hp;
    }
    this.lanes = c.ln;
    this.map.setTargets(c.ln);
    this.syncBots(c.b);
  }

  private syncBots(states: NetBotState[]): void {
    const scene = this.host.scene;
    // The party never changes shape mid-run, but a late first snap can arrive with it.
    while (this.bots.length > states.length) this.bots.pop()!.bot.destroy();
    states.forEach((s, i) => {
      let rep = this.bots[i];
      if (!rep || rep.bot.elementId !== s.e) {
        rep?.bot.destroy();
        const bot = new Companion(scene, s.x, s.y, s.e, i);
        rep = { bot, tx: s.x, ty: s.y, seq: s.a };
        this.bots[i] = rep;
      }
      rep.tx = s.x;
      rep.ty = s.y;
      const b = rep.bot;
      b.maxHp = s.mhp;
      b.hp = s.hp;
      if (s.d && !b.downed) b.downedAt = scene.time.now;
      b.downed = s.d;
      b.roomIndex = s.r;
      b.facingAngle = s.f;
      b.setAngle(s.d ? 90 : 0);
      if (s.a !== rep.seq) {
        rep.seq = s.a;
        b.avatar?.play('punch', s.f);
        this.bursts.push({
          x: b.x + Math.cos(s.f) * 26, y: b.y + Math.sin(s.f) * 26, r: 22, color: b.tint, t: 0, room: s.r,
        });
      }
    });
  }

  private refreshVisibility(): void {
    const view = this.map.currentRoom;
    for (const { bot } of this.bots) {
      const on = bot.roomIndex === view;
      bot.setVisible(on);
      bot.setHealthBarVisible(on);
      bot.nameTag.setVisible(on);
    }
  }

  update(time: number, delta: number, huskCounts: number[]): void {
    this.map.update(time, this.host.player, huskCounts);
    this.core?.draw(time, this.map.currentRoom === CITY_MAIN);
    if (this.core) this.dream.onHealth(this.core.hp / Math.max(1, this.core.maxHp));
    this.hud.paint(this.host.loadout, this.host.player.element.abilities, this.mutations.active);
    this.mutations.update(time, delta);
    this.relics.update(delta);

    const view = this.map.currentRoom;
    for (const rep of this.bots) {
      const b = rep.bot;
      const body = b.body as Phaser.Physics.Arcade.Body | null;
      const dx = rep.tx - b.x, dy = rep.ty - b.y;
      if (Math.hypot(dx, dy) > 200) body?.reset(rep.tx, rep.ty);
      else body?.setVelocity(dx * 8, dy * 8);
      const on = b.roomIndex === view;
      b.setVisible(on);
      b.setHealthBarVisible(on);
      b.nameTag.setVisible(on).setPosition(b.x, b.y - 44);
      const tag = companionTag(b, time);
      if (b.nameTag.text !== tag) b.nameTag.setText(tag);
      if (b.bodyless) b.setAlpha(0); else b.setAlpha(b.downed ? 0.5 : 1);
      b.avatar?.setFacing(b.facingAngle);
      b.avatar?.update(delta, b.x, b.y, on ? (b.downed ? 0.45 : 1) : 0);
    }

    const g = this.fxG;
    g.clear();
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const f = this.bursts[i];
      f.t += delta;
      if (f.t >= 260) { this.bursts.splice(i, 1); continue; }
      if (f.room !== view) continue;
      const k = f.t / 260;
      g.fillStyle(f.color, 0.5 * (1 - k));
      g.fillCircle(f.x, f.y, f.r * (0.4 + k * 0.6));
    }
  }

  /** Same banner the host shows. */
  showWarning(wave: number, lanes: number[]): void {
    this.lanes = lanes;
    this.map.setTargets(lanes);
    const scene = this.host.scene;
    // The guest gets no wave-start message; the husks arrive one warning after this one.
    scene.time.delayedCall(ROOM_WARNING_MS, () => this.relics.onWaveBegan());
    const text = scene.add.text(scene.scale.width / 2, WAVE_BANNER_Y, cityWarningText(wave, lanes), {
      fontSize: '20px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
      color: '#ffcc66', stroke: '#1d2e0f', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(25);
    scene.tweens.add({ targets: text, alpha: 0, delay: 4200, duration: 700, onComplete: () => text.destroy() });
  }

  /** The wave is held: the guest drafts from its own unlocks. */
  openDraft(wave: number): void {
    this.dream.onWaveHeld(wave);
    if (wave === 20) this.dream.saved();
    // Items refill what they spend (shields, dodge, revive) every wave held.
    this.relics.onWaveCleared();
    const loadout = this.host.loadout;
    this.lanes = [];
    this.map.setTargets([]);
    if (!loadout) { this.host.sendPick('none', ''); return; }
    const cards = rollDraft({
      loadout,
      mutationTaken: (id) => this.mutations.has(id),
      mutationStarred: (id) => this.mutations.isStarred(id),
      relics: this.relics,
    });
    if (cards.length === 0) { this.host.sendPick('none', ''); return; }
    void this.draft.open(cards, wave, []).then((card) => this.keep(card, loadout));
  }

  private keep(card: DraftCard, loadout: CityLoadoutApi): void {
    const p = this.host.player;
    switch (card.kind) {
      case 'ability': loadout.unlockKey(card.id); break;
      case 'upgrade': loadout.addUpgrade(card.id); break;
      case 'perk': loadout.addPerk(card.id); break;
      case 'mastery': loadout.enableMastery(); break;
      case 'alt-ult': loadout.addUpgrade(ALT_ULT_SLOT); break;
      case 'mutation': {
        const starred = this.mutations.take(card.id);
        this.host.showFloatingText(p.x, p.y - 76, `🧬 ${starred ? '★ ' : ''}${mutationName(card.id).toUpperCase()} — YOU MUTATE`, '#ff7788');
        break;
      }
      case 'boon':
        if (card.id === 'vigor') { p.increaseMaxHp(60); p.heal(p.maxHp); }
        break;
      // The guest's own, on the guest's sim — the host only hears the news.
      case 'item': this.relics.takeItem(card.id); break;
      case 'artifact': this.relics.takeArtifact(card.id); break;
      default: break;
    }
    this.host.showFloatingText(p.x, p.y - 60, `${card.emoji} ${card.title}`, '#ffe9a8');
    this.host.sendPick(card.kind, card.id);
  }

  /** A downed guest stands back up beside the plinth. */
  jumpHome(): void {
    this.map.jumpTo(CITY_MAIN);
  }
}
