import { ElementCodex } from '../AbilityCodex';
import fire from './fire';
import water from './water';
import life from './life';
import air from './air';
import earth from './earth';
import ice from './ice';
import shadow from './shadow';
import oil from './oil';
import growth from './growth';
import crystal from './crystal';
import soul from './soul';
import hunt from './hunt';
import sand from './sand';
import gravity from './gravity';
import creation from './creation';
import electricity from './electricity';
import slime from './slime';
import light from './light';
import magnet from './magnet';
import metal from './metal';
import plasma from './plasma';
import gunpowder from './gunpowder';
import magic from './magic';
import dream from './dream';
import psychic from './psychic';
import radiation from './radiation';
import magma from './magma';
import dune from './dune';
import fortune from './fortune';
import cloth from './cloth';
import justice from './justice';
import gluttony from './gluttony';
import quantum from './quantum';
import illusion from './illusion';
import passion from './passion';
import ruin from './ruin';
import chalk from './chalk';
import bind from './bind';
import depths from './depths';
import gum from './gum';
import paper from './paper';
import death from './death';
import echo from './echo';
import subterfuge from './subterfuge';
import rubber from './rubber';
import fate from './fate';
import sound from './sound';
import technology from './technology';
import conquest from './conquest';
import silence from './silence';

/**
 * Every element whose abilities have been written up for the info screen.
 *
 * Add an element by writing `./<elementId>.ts` and adding one line here. Order is irrelevant —
 * the screen reads this by key. Anything absent renders a "not yet documented" card rather
 * than an empty pane, so a gap is visible in-game and `node .check-codex.mjs` will list it.
 */
export const CODEX: Record<string, ElementCodex> = {
  fire,
  water,
  life,
  air,
  earth,
  ice,
  shadow,
  oil,
  growth,
  crystal,
  soul,
  hunt,
  sand,
  gravity,
  creation,
  electricity,
  slime,
  light,
  magnet,
  metal,
  plasma,
  gunpowder,
  magic,
  dream,
  psychic,
  radiation,
  magma,
  dune,
  fortune,
  cloth,
  justice,
  gluttony,
  quantum,
  illusion,
  passion,
  ruin,
  chalk,
  bind,
  depths,
  gum,
  paper,
  death,
  echo,
  subterfuge,
  rubber,
  fate,
  sound,
  technology,
  conquest,
  silence,
};
