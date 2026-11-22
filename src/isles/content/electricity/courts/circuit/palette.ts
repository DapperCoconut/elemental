/**
 * The Circuit Court's colours — one place, so the board-town, the five fights and Prince Byte's
 * Die all read as the same reckoning machine of a court.
 *
 * Circuit is a town laid out like a circuit board, because it *is* one: the Tabulator under the
 * chapel roof reckons every household's Draw off the copper in the streets. The ground is dark
 * solder-mask green under the storm, the streets are bare copper traces gone bronze with weather,
 * the houses are striped like resistors (brown-black-red: the bands say how much a household is
 * allowed to draw), capacitor towers stand blue-grey on the skyline, and over everything the valves
 * glow amber. White silkscreen numbers are printed on the ground beside every door — the Tabulator
 * does not know anybody's name.
 */

/** Solder mask: the board the town is printed on, darkest green under the night. */
export const MASK = 0x123a2a;
export const MASK_LIT = 0x1d5038;
export const MASK_DARK = 0x0a2419;
export const MASK_DEEP = 0x061710;
/** Bare copper traces — the streets. */
export const COPPER = 0xc8763a;
export const COPPER_LIT = 0xf0a868;
export const COPPER_DARK = 0x7a4220;
/** Tinned pads and vias: the solder. */
export const SOLDER = 0xb8c0c4;
export const SOLDER_LIT = 0xeef2f4;
export const SOLDER_DARK = 0x6a7276;
/** Silkscreen: the white print on the board (house numbers, part numbers, arrows). */
export const SILK = 0xe8ece0;
/** Gold pins and fingers: the Die and anything the Prince owns. */
export const GOLD = 0xe2b444;
export const GOLD_LIT = 0xffe08a;
export const GOLD_DARK = 0x8a6a1e;

/** Resistor bodies — a pale tan ceramic; and the colour code painted round them. */
export const CERAMIC = 0xd8c09a;
export const CERAMIC_DARK = 0x9a8460;
export const BAND_COLORS = [0x1a1410, 0x7a3e1a, 0xc8302a, 0xe8782a, 0xe8d03a, 0x3a9a4a, 0x3a5ac8, 0x8a4ac0, 0x8a8a8a, 0xf0f0f0];
/** Capacitor cans: blue-grey sleeve, silver top scored with a cross. */
export const CAN = 0x3a5a7a;
export const CAN_LIT = 0x5a7ea0;
export const CAN_DARK = 0x223a52;
/** Chip bodies: black epoxy, a little purple in the storm-light. */
export const EPOXY = 0x1c1a22;
export const EPOXY_LIT = 0x34303e;
/** Valves (vacuum tubes): glass, the amber of a hot filament, the blue of a gassy one. */
export const VALVE_GLASS = 0xcfe0e8;
export const FILAMENT = 0xffa63a;
export const FILAMENT_LIT = 0xffe0a0;
export const GASGLOW = 0x7a9aff;
/** Nixie tubes: the orange numerals the Tabulator shows its sums in. */
export const NIXIE = 0xff7a2a;
/** Card stock: the buff of a punched card. */
export const CARD = 0xe8d8b0;
export const CARD_DARK = 0xb8a47a;
/** Brass of clockwork automatons and their keys. */
export const BRASS = 0xc89a40;
export const BRASS_LIT = 0xf0cc80;
export const BRASS_DARK = 0x6a4e1a;
/** Iron pylons and the soot of the storm. */
export const IRON = 0x3a3a42;
export const IRON_DARK = 0x1e1e24;
/** The sump: machine oil, black with a rainbow sheen. */
export const OIL = 0x0e0c14;
export const OIL_SHEEN = 0x5a3a8a;
export const OIL_RIM = 0x4a4a52;
/** Signal colours: a live pulse on the copper, the green of a lit diode, the red of a fault. */
export const PULSE = 0x9af6ff;
export const DIODE = 0x5aff8a;
export const FAULT = 0xff3a4a;
/** The storm overhead: lightning white-violet. */
export const BOLT = 0xe0e0ff;

/** Prince Byte: cathode green on black, amber valves in his crown. */
export const BYTE = 0x3ae08a;
export const BYTE_LIT = 0xa0ffcc;
export const BYTE_DARK = 0x0e3a24;

/** The court's accent on the HUD and the map. */
export const CIRCUIT_COLOR = 0x3ad8a0;
