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

export interface BattleMap {
  id: Id;
  name: string;
  width: number;
  height: number;
  cellSize: number;
  imageAssetId: Id | null;
  model3dAssetId: Id | null;
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

export type EffectKind = "buff" | "debuff" | "damageOverTime" | "healOverTime";

export interface Effect {
  id: Id;
  kind: EffectKind;
  sourceId: Id;
  durationRounds: number | null;
  parameters: Record<string, unknown>;
}
