import type { Id } from "@world-building/shared";
import type { GridCell } from "../entities/combat";

/** Sección 7: mover, atacar, lanzar hechizo, usar objeto, defender, interactuar, ayudar, esconderse, correr, acción especial, reacción. */
export type ActionType =
  | "move"
  | "attack"
  | "castSpell"
  | "useItem"
  | "dash"
  | "dodge"
  | "defend"
  | "interact"
  | "help"
  | "hide"
  | "special"
  | "reaction"
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
