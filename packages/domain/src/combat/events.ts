import type { Id } from "@world-building/shared";
import type { GridCell } from "../entities/combat";

/**
 * Event sourcing ligero (sección 8): el log debe ser suficientemente rico
 * para auditoría, replay, debugging, undo y reconstrucción del estado.
 */

interface BaseCombatEvent {
  id: Id;
  battleId: Id;
  round: number;
  actorId: Id;
  timestamp: string;
}

export interface TurnStarted extends BaseCombatEvent {
  type: "TurnStarted";
}

export interface MovementPerformed extends BaseCombatEvent {
  type: "MovementPerformed";
  from: GridCell;
  to: GridCell;
}

export interface AttackDeclared extends BaseCombatEvent {
  type: "AttackDeclared";
  targetIds: Id[];
}

export interface AttackResolved extends BaseCombatEvent {
  type: "AttackResolved";
  targetId: Id;
  hit: boolean;
  roll: number;
}

export interface DamageApplied extends BaseCombatEvent {
  type: "DamageApplied";
  targetId: Id;
  amount: number;
}

export interface ConditionApplied extends BaseCombatEvent {
  type: "ConditionApplied";
  targetId: Id;
  conditionKey: string;
}

export interface SpellCast extends BaseCombatEvent {
  type: "SpellCast";
  spellId: Id;
  targetIds: Id[];
}

export interface TurnEnded extends BaseCombatEvent {
  type: "TurnEnded";
}

export type CombatEvent =
  | TurnStarted
  | MovementPerformed
  | AttackDeclared
  | AttackResolved
  | DamageApplied
  | ConditionApplied
  | SpellCast
  | TurnEnded;

export interface CombatLogEntry {
  event: CombatEvent;
  message: string;
}
