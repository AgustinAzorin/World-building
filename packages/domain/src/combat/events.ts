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

/** Sección 2/6: tirada de iniciativa de un participante al empezar la batalla. */
export interface InitiativeRolled extends BaseCombatEvent {
  type: "InitiativeRolled";
  roll: number;
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

export interface ConditionExpired extends BaseCombatEvent {
  type: "ConditionExpired";
  targetId: Id;
  conditionKey: string;
}

export interface HealingApplied extends BaseCombatEvent {
  type: "HealingApplied";
  targetId: Id;
  amount: number;
}

export interface EffectApplied extends BaseCombatEvent {
  type: "EffectApplied";
  targetId: Id;
  effectKind: string;
}

export interface EffectExpired extends BaseCombatEvent {
  type: "EffectExpired";
  targetId: Id;
  effectKind: string;
}

export interface SpellCast extends BaseCombatEvent {
  type: "SpellCast";
  spellId: Id;
  targetIds: Id[];
}

export interface TurnEnded extends BaseCombatEvent {
  type: "TurnEnded";
}

/** Comodín para acciones sin resolución compuesta propia (defender, ayudar, esconderse...). */
export interface ActionPerformed extends BaseCombatEvent {
  type: "ActionPerformed";
  actionType: string;
}

export type CombatEvent =
  | TurnStarted
  | InitiativeRolled
  | MovementPerformed
  | AttackDeclared
  | AttackResolved
  | DamageApplied
  | HealingApplied
  | ConditionApplied
  | ConditionExpired
  | EffectApplied
  | EffectExpired
  | SpellCast
  | ActionPerformed
  | TurnEnded;

export interface CombatLogEntry {
  event: CombatEvent;
  message: string;
}
