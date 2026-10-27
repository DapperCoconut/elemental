# Ability tray

<!-- Moved out of CLAUDE.md to keep it short; CLAUDE.md links here. -->

The in-match tray prints no descriptions: each card is a keycap, the name, and RMB / HOLD / RECAST tags from `src/data/AbilityTags.ts` (keep it current when an ability's controls change), plus a charge readout on a charged ultimate. `UI.AbilityCardFace` draws it; kits still write the hidden `lbl`/`desc` texts and the face re-reads `lbl` ("E  Name" / "[E] Name"), so tags only show while the card carries its own ability's name.
