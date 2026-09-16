import type { Id } from "@world-building/shared";

/**
 * Definiciones de contenido: se modelan como datos (sección 2.4) para que
 * puedan crearse, importarse o modificarse sin tocar código.
 */

export interface Ability {
  id: Id;
  key: string;
  name: string;
  description: string;
}

export interface Spell {
  id: Id;
  name: string;
  level: number;
  school: string;
  castingTime: string;
  range: string;
  duration: string;
  description: string;
  effects: Id[];
}

export interface Feat {
  id: Id;
  name: string;
  description: string;
  prerequisites: string[];
}

export type EquipmentSlot =
  | "head"
  | "chest"
  | "hands"
  | "feet"
  | "mainHand"
  | "offHand"
  | "accessory";

export interface Item {
  id: Id;
  name: string;
  description: string;
  weight: number;
  value: number;
}

export interface Equipment extends Item {
  slot: EquipmentSlot;
  effects: Id[];
}
