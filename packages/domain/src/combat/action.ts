import type { Id } from "@world-building/shared";
import type { GridCell } from "../entities/combat";

export type ActionType =
  | "move"
  | "attack"
  | "castSpell"
  | "useItem"
  | "dash"
  | "dodge"
  | "endTurn";

/** Entidad estructurada que el motor recibe y valida (sección 7). */
export interface Action {
  id: Id;
  actorId: Id;
  type: ActionType;
  targetIds: Id[];
  origin: GridCell | null;
  destination: GridCell | null;
  parameters: Record<string, unknown>;
}
