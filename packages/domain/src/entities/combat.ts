import type { Id } from "@world-building/shared";

export type BattleStatus = "pending" | "active" | "finished";

export interface Battle {
  id: Id;
  campaignId: Id;
  name: string;
  status: BattleStatus;
  mapId: Id;
}

export interface BattleParticipant {
  id: Id;
  battleId: Id;
  characterId: Id;
  initiative: number;
  team: string;
}

export interface GridCell {
  x: number;
  y: number;
}

export type TerrainKey = "normal" | "difficult" | "hazard" | "water" | "wall";

/**
 * Sección 3: cada casilla almacena sus propias propiedades en lugar de que
 * el motor las infiera del terreno global del mapa.
 */
export interface Tile {
  x: number;
  y: number;
  terrain: TerrainKey;
  walkable: boolean;
  movementCost: number;
  occupied: Id | null;
}

export interface BattleMap {
  id: Id;
  name: string;
  width: number;
  height: number;
  cellSize: number;
  imageAssetId: Id | null;
  model3dAssetId: Id | null;
  /** Casillas con propiedades no estándar (bloqueadas, terreno difícil, zonas especiales). El resto usa los valores por defecto. */
  tiles: Tile[];
}

export interface BattleToken {
  id: Id;
  battleId: Id;
  combatantId: Id;
  position: GridCell;
  assetId: Id | null;
}

export interface Turn {
  id: Id;
  battleId: Id;
  round: number;
  participantId: Id;
  startedAt: string;
  endedAt: string | null;
}

/** Representación en combate de un participante: no es el Character completo. */
export interface Combatant {
  id: Id;
  characterId: Id;
  name: string;
  hitPoints: { current: number; max: number };
  armorClass: number;
  speed: number;
  position: GridCell;
  /** Instantánea tomada al entrar en batalla (sección 19): no se vuelve a consultar al personaje. */
  resistances: string[];
  immunities: string[];
  vulnerabilities: string[];
}

export type ConditionKey =
  | "prone"
  | "stunned"
  | "poisoned"
  | "restrained"
  | "invisible"
  | "unconscious";

export interface Condition {
  id: Id;
  key: ConditionKey;
  name: string;
  description: string;
}

/** Sección 11: sistema genérico, no una clase por hechizo. */
export type EffectKind =
  | "damage"
  | "heal"
  | "buff"
  | "debuff"
  | "movement"
  | "condition"
  | "itemCreation"
  | "summon"
  | "resourceChange";

export interface Effect {
  id: Id;
  kind: EffectKind;
  sourceId: Id;
  durationRounds: number | null;
  parameters: Record<string, unknown>;
}

/** Un Effect aplicado a un combatant concreto, con la duración restante (sección 12). */
export interface EffectInstance {
  id: Id;
  combatantId: Id;
  effect: Effect;
  remainingRounds: number | null;
}
