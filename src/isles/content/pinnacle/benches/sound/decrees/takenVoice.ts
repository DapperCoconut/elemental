import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { OBS, SILK, VOICE, VOICE_LIT, ribbon, voiceJar } from '../art';
import { type Who, WHO, alive, clamp, css, dist, fighterOf, other, stepDt } from '../util';

/**
 * DECREE OF THE TAKEN VOICE — Councilor Tacet Muir, Seat of the Rest.
 *
 * He drafted the Muting: a voice that is too loud is taken from its singer and piped up to the
 * Vault. In his room every fighter has a NOISE meter — every cast is noise, every blow you land is
 * noise, and it settles slowly when you are quiet. On the Hour the white ribbon tightens at the
 * throat of the LOUDER voice, and the voice is TAKEN: it leaves them as a little rose light with a
 * silk tail and drifts away toward the Vault's open jars along the top of the room. Until they
 * have it back they are MUTED (abilities locked).
 *   - Catch your own voice and it is yours again — and the first thing it does is SHOUT: a ring
 *     that strikes and shoves the other fighter if they are close.
 *   - The other fighter can strike the voice in flight: two blows and it is SEALED — its owner is
 *     struck and stays muted longer. If it reaches the Vault, it is sealed there instead.
 *   - A dash on the Hour slips the ribbon.
 * He is a silence element: he hides, he waits, he lands one great knife — and a knife is loud.
 * Be the quiet one when the Hour comes round; when his voice flies, get between it and him.
 */

const WARN = 1300;
const DRIFT = 66;
const CATCH_R = 30;
const SEAL_HITS = 2;
const SHOUT_R = 130;

interface Flight { owner: Who; x: number; y: number; vx: number; vy: number; hits: number; born: number; target: StrikeTarget | null; hitReady: number }

const make = (ctx: GimmickCtx): EncounterGimmick => {
  const { W, H, top } = ctx;
  const PERIOD = ctx.hard ? 8200 : 9800;
  const SEAL = ctx.hard ? 24 : 20;
  const noise: Record<Who, number> = { player: 0, npc: 0 };
  let nextHour = 0;
  let warnFor: Who | null = null;
  let warnAt = 0;
  let flight: Flight | null = null;
  let muteTick = 0;
  let sealedUntil: Record<Who, number> = { player: 0, npc: 0 };
  let shoutFx = -9999, shoutX = 0, shoutY = 0;
  let sealFx = -9999, sealX = 0, sealY = 0;
  let selfHit = false;
  let started = false;

  const louder = (): Who | null => {
    if (noise.player < 12 && noise.npc < 12) return null;
    return noise.player >= noise.npc ? 'player' : 'npc';
  };

  const endFlight = () => { flight?.target?.remove(); flight = null; };

  const seal = (time: number, why: 'struck' | 'vault') => {
    if (!flight) return;
    const f = fighterOf(ctx, flight.owner);
    sealFx = time; sealX = flight.x; sealY = flight.y;
    sealedUntil[flight.owner] = time + (why === 'struck' ? 2400 : 1800);
    if (alive(f)) {
      selfHit = true;
      ctx.hit(f, why === 'struck' ? SEAL : 14, f.x, f.y);
      selfHit = false;
      ctx.float(f.x, f.y - 52, why === 'struck' ? 'VOICE SEALED' : 'FILED IN THE VAULT', '#ff9ab0');
    }
    ctx.sfx('hush');
    noise[flight.owner] *= 0.3;
    endFlight();
    nextHour = time + PERIOD;
  };

  const strikeVoice = (by: Who) => {
    const now = ctx.scene.time.now;
    if (!flight || by === flight.owner || now < flight.hitReady) return;
    flight.hitReady = now + 240;
    flight.hits++;
    ctx.sfx('crystal-chime');
    if (flight.hits >= SEAL_HITS) seal(now, 'struck');
  };

  const take = (w: Who, time: number) => {
    const f = fighterOf(ctx, w);
    if (!alive(f)) { nextHour = time + PERIOD; return; }
    if (ctx.dashing(f)) {
      ctx.float(f.x, f.y - 56, 'SLIPPED THE RIBBON', css(w));
      noise[w] *= 0.5;
      nextHour = time + PERIOD;
      return;
    }
    // Thrown off away from the other fighter, then it drifts up toward the Vault.
    const o = fighterOf(ctx, other(w));
    const a = Math.atan2(f.y - o.y, f.x - o.x) * 0.5 - Math.PI / 4;
    flight = { owner: w, x: f.x, y: f.y - 20, vx: Math.cos(a) * 240, vy: Math.sin(a) * 240 - 60, hits: 0, born: time, target: null, hitReady: 0 };
    flight.target = ctx.target({ x: flight.x, y: flight.y, r: 18, passThrough: true, onStruck: (by) => strikeVoice(by) });
    ctx.banner(w === 'player' ? 'YOUR VOICE IS TAKEN — CATCH IT' : 'HIS VOICE IS TAKEN — SEAL IT', w === 'player' ? '#ff9ab0' : '#ffd2ec');
    ctx.sfx('curse-cast');
  };

  const retrieve = (time: number) => {
    if (!flight) return;
    const w = flight.owner;
    const f = fighterOf(ctx, w);
    const o = fighterOf(ctx, other(w));
    shoutFx = time; shoutX = f.x; shoutY = f.y;
    ctx.float(f.x, f.y - 52, 'VOICE RETURNED', css(w));
    ctx.sfx('screech');
    if (alive(o) && dist(o.x, o.y, f.x, f.y) < SHOUT_R) {
      selfHit = true;
      ctx.hit(o, 12, o.x, o.y);
      selfHit = false;
      const a = Math.atan2(o.y - f.y, o.x - f.x);
      ctx.nudge(o, Math.cos(a) * 110, Math.sin(a) * 110);
    }
    noise[w] *= 0.3;
    endFlight();
    nextHour = time + PERIOD;
  };

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextHour = time + 6000; }
      for (const w of WHO) noise[w] = Math.max(0, noise[w] - dt * 6);

      if (!flight && !warnFor && time >= nextHour - WARN) {
        const w = louder();
        if (!w) { nextHour = time + 2600 + WARN; ctx.float(W / 2, top + 90, 'THE ROOM IS QUIET', '#c9b0ff'); }
        else { warnFor = w; warnAt = time; ctx.sfx('heartbeat'); }
      }
      if (warnFor && time >= nextHour) { const w = warnFor; warnFor = null; take(w, time); }

      // Muted while the voice is away (refreshed in short holds, so it lifts as soon as it returns).
      if (time >= muteTick) {
        muteTick = time + 350;
        for (const w of WHO) {
          const f = fighterOf(ctx, w);
          if (alive(f) && ((flight && flight.owner === w) || time < sealedUntil[w])) ctx.silence(f, 450);
        }
      }

      if (flight) {
        const fl = flight;
        // Drift toward the jars along the top, wavering like a held note.
        const tx = clamp(fl.x, 80, W - 80), ty = top + 4;
        const a = Math.atan2(ty - fl.y, tx - fl.x);
        const k = Math.min(1, dt * 1.6);
        fl.vx += (Math.cos(a) * DRIFT - fl.vx) * k;
        fl.vy += (Math.sin(a) * DRIFT - fl.vy) * k;
        fl.x = clamp(fl.x + (fl.vx + Math.sin(time / 260) * 40) * dt, 30, W - 30);
        fl.y = clamp(fl.y + fl.vy * dt, top, H - 30);
        fl.target?.moveTo(fl.x, fl.y);
        const f = fighterOf(ctx, fl.owner);
        if (alive(f) && dist(f.x, f.y, fl.x, fl.y) < CATCH_R) retrieve(time);
        else if (fl.y <= top + 10) seal(time, 'vault');
      }
    },

    onPlayerCast() { noise.player = Math.min(100, noise.player + 7); },
    onNpcCast() { noise.npc = Math.min(100, noise.npc + 7); },
    // A blow landed is noise for whoever landed it.
    onNpcHurt(amount) { if (!selfHit) noise.player = Math.min(100, noise.player + amount * 0.8); },
    onPlayerHurt(amount) { if (!selfHit) noise.npc = Math.min(100, noise.npc + amount * 0.8); },

    npcSeek(): Pt | null {
      if (!flight) return null;
      const n = ctx.npc;
      // His own voice: chase it. Yours: get to it before you do.
      if (flight.owner === 'npc') return { x: flight.x, y: flight.y };
      const a = Math.atan2(n.y - flight.y, n.x - flight.x);
      return { x: flight.x + Math.cos(a) * 40, y: flight.y + Math.sin(a) * 40 };
    },

    drawGround(g, time) {
      // The Vault's mouths along the top: open jars waiting, brighter while a voice is in the air.
      const hungry = flight ? 1 : 0;
      for (let x = 40; x < W; x += 56) {
        g.fillStyle(VOICE, 0.05 + hungry * 0.08 * (0.5 + 0.5 * Math.sin(time / 200 + x))); g.fillEllipse(x, top + 6, 40, 18);
        voiceJar(g, x, top + 20, 18, { open: true, glow: 0, label: false });
      }
      if (flight) {
        // The thread from the voice back to its owner.
        const f = fighterOf(ctx, flight.owner);
        for (let i = 1; i < 12; i++) {
          const k = i / 12;
          g.fillStyle(VOICE, 0.35); g.fillCircle(f.x + (flight.x - f.x) * k, f.y + (flight.y - f.y) * k + Math.sin(time / 150 + i) * 4, 1.6);
        }
      }
      const s = time - shoutFx;
      if (s < 500) { const k = s / 500; g.lineStyle(5 * (1 - k), VOICE_LIT, 1 - k); g.strokeCircle(shoutX, shoutY, 30 + k * SHOUT_R); }
    },

    drawAir(g, time) {
      // The ribbon tightening at the throat of the louder voice — or at both, faintly.
      for (const w of WHO) {
        const f = fighterOf(ctx, w);
        if (!alive(f)) continue;
        const tight = warnFor === w ? clamp((time - warnAt) / WARN, 0, 1) : 0;
        const muted = (flight && flight.owner === w) || time < sealedUntil[w];
        if (tight > 0 || muted) {
          ribbon(g, f.x, f.y - 4, 7 + tight * 3, 0.95);
          if (tight > 0) { g.lineStyle(2, SILK, 0.4 + tight * 0.5); g.strokeCircle(f.x, f.y - 4, 34 - tight * 18); }
        }
      }
      if (flight) {
        const fl = flight;
        // The voice: a rose light with a silk tail, a little mouth open on its note.
        for (let i = 1; i <= 6; i++) {
          g.fillStyle(SILK, 0.5 - i * 0.07);
          g.fillCircle(fl.x - fl.vx * 0.03 * i + Math.sin(time / 120 + i) * 3, fl.y - fl.vy * 0.03 * i + 4, 5 - i * 0.5);
        }
        g.fillStyle(VOICE, 0.22); g.fillCircle(fl.x, fl.y, 24);
        g.fillStyle(VOICE, 0.9); g.fillCircle(fl.x, fl.y, 11);
        g.fillStyle(VOICE_LIT, 1); g.fillCircle(fl.x - 3, fl.y - 3, 5);
        g.fillStyle(0x5a1840, 0.8); g.fillEllipse(fl.x, fl.y + 3, 4, 5 + Math.sin(time / 90) * 1.5);
        for (let i = 0; i < fl.hits; i++) { g.lineStyle(2, OBS.seamLit, 0.9); g.strokeCircle(fl.x, fl.y, 15 + i * 5); }
      }
      const s = time - sealFx;
      if (s < 600) {
        const k = s / 600;
        voiceJar(g, sealX, sealY + 10 - k * 20, 22, { glow: 1 - k });
      }
    },

    drawHud(g) {
      // Two noise meters: yours left, his right — a waveform that grows tall when loud.
      for (const w of WHO) {
        const right = w === 'npc';
        const x0 = right ? W - 150 : 20, y = top + 14;
        const v = noise[w] / 100;
        const loud = louder() === w;
        g.fillStyle(0x07050c, 0.8); g.fillRoundedRect(x0 - 4, y - 14, 138, 28, 6);
        g.lineStyle(1.2, loud ? VOICE_LIT : OBS.edge, loud ? 0.9 : 0.4); g.strokeRoundedRect(x0 - 4, y - 14, 138, 28, 6);
        for (let i = 0; i < 26; i++) {
          const h = 2 + Math.abs(Math.sin(i * 1.7 + v * 8)) * 10 * v + (i / 26 < v ? 2 : 0);
          g.fillStyle(i / 26 < v ? (loud ? VOICE_LIT : VOICE) : OBS.facet, 1);
          g.fillRect(x0 + i * 5, y - h, 3, h * 2);
        }
      }
    },

    destroy() { endFlight(); sealedUntil = { player: 0, npc: 0 }; },
  };
};

export const TAKEN_VOICE: GimmickDef = {
  id: 'bench-sound-taken-voice',
  rules: 'The louder voice shall be taken: on the Hour it flies for the Vault and its singer is muted. Catch it back and it shouts; strike it twice and it is sealed.',
  make,
};
