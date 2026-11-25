import type { BoatDef, DockUpgradeDef } from '../IslesTypes';

/**
 * Boats and dock upgrades — shared by every port. A boat is lost if it sinks, so the cheap raft
 * is a real choice, not a trap: it gets you across in calm water and costs little to lose.
 */
export const BOATS: BoatDef[] = [
  { id: 'raft', name: 'Driftwood Raft', price: 120, hull: 3, speed: 150, handling: 2.2, hold: 1, len: 34, sails: 0, color: 0x8a6a44 },
  { id: 'sloop', name: 'Cinder Sloop', price: 520, hull: 6, speed: 185, handling: 2.8, hold: 1.4, len: 46, sails: 1, color: 0x6b3a26 },
  { id: 'brig', name: 'Brandbreaker Brigantine', price: 1450, hull: 10, speed: 210, handling: 3.1, hold: 1.9, len: 60, sails: 2, color: 0x3a2a2a },
];

export const DOCK_UPGRADES: DockUpgradeDef[] = [
  { id: 'hull', name: 'Iron-Banded Hull', text: '+2 hull per level', prices: [140, 320, 640] },
  { id: 'sails', name: 'Oiled Sails', text: '+12% speed per level: shorter crossings', prices: [120, 280, 560] },
  { id: 'rudder', name: 'Long Rudder', text: 'Steers wide: fewer rocks find the hull per level', prices: [100, 240, 480] },
  { id: 'cannon', name: 'Bow Cannon', text: 'A bow gun that picks its own marks; faster and harder per level', prices: [160, 360, 720] },
  { id: 'pump', name: 'Bilge Pump', text: 'Slowly repairs hull at sea', prices: [220, 520] },
  { id: 'net', name: 'Trawl Net', text: 'Hauls passing loot aboard from further off the rail', prices: [90, 210] },
];
