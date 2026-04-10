import Phaser from 'phaser';
import { Fighter } from './Fighter';
import { Element } from '../elements/Element';

export class Player extends Fighter {
  constructor(scene: Phaser.Scene, x: number, y: number, element: Element, textureKey = 'elem-fire') {
    super(scene, x, y, textureKey, element, 200, 200);
  }
}
