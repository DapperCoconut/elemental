import { Fighter } from '../entities/Fighter';

/**
 * The contract behind Ruin Mastery's Combo Breaker.
 *
 * A great many elements run on a bar rather than on cooldowns — Electricity's kinetic charge,
 * Silence's terror, Marrow's inflammation, Passion's love, Gluttony's hunger, Bind's anger,
 * Sound's hype, Conquest's Authority, Growth's DNA, Metal's blood, Psychic's stress. Combo
 * Breaker halves how fast every one of them fills, which is only possible if the halving lives
 * at the moment the number goes *up* rather than inside thirty different kits' idea of a bar.
 *
 * So there is no registry and no interface: every kit routes its own gain through this one
 * function, handing it the fighter the meter belongs to. One line per gain site, and a kit that
 * grows a new resource later gets the passive for free by using the same helper as its
 * neighbours.
 *
 * Rules for a call site:
 * - Pass the fighter who *owns* the bar, not the one who was hit. A meter that fills off damage
 *   dealt still belongs to the dealer.
 * - Only wrap gains. Spending, decay and hard resets are the bar's own business, and halving
 *   them would make the passive a buff.
 * - Wrap the amount, never the clamp: `Math.min(MAX, v + meterGain(f, n))`, so a bar already at
 *   its ceiling behaves exactly as it did before.
 */
export function meterGain(f: Fighter | null | undefined, amount: number): number {
  return f ? amount * f.meterGainMult : amount;
}

/** Fractions owed to a fighter, per meter, by {@link meterStep}. */
const carries = new WeakMap<Fighter, Map<string, number>>();

/**
 * The same tax, for a meter that only ever moves in whole steps.
 *
 * Plenty of bars are stack counts rather than numbers — a Styx brand, a Justice bite, a rung of
 * a radiation dose, a link of a Sand chain. Halving those directly is incoherent (half a stack
 * is not a thing, and any parallel per-stack bookkeeping desyncs the moment it rounds), so the
 * halved remainder is *carried* instead: two bites become one, and the second one comes on the
 * fourth. Over any real fight it is exactly the same 50%, and it never hands out a fractional
 * stack to a system that cannot hold one.
 *
 * `key` names the meter, so one fighter's brands and bites carry separately. Returns how many
 * whole steps to actually apply — which may be 0, and a caller that has a flourish to play
 * should check that before playing it.
 */
export function meterStep(f: Fighter | null | undefined, key: string, amount = 1): number {
  if (!f || f.meterGainMult >= 1) return amount;
  let byKey = carries.get(f);
  if (!byKey) { byKey = new Map<string, number>(); carries.set(f, byKey); }
  const owed = (byKey.get(key) ?? 0) + amount * f.meterGainMult;
  const whole = Math.floor(owed);
  byKey.set(key, owed - whole);
  return whole;
}
