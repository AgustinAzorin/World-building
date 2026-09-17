import type { ActionType } from "./action";
import type { Condition, ConditionKey } from "../entities/combat";
import type { BattleState } from "./battle-state";

/**
 * Sección 12: las condiciones modifican qué puede hacer un combatant.
 * `blocksAllActions` cubre el ejemplo `incapacitated -> availableActions = []`;
 * `attackRollModifier` cubre `poisoned -> attack modifiers altered`.
 */
export interface ConditionBehavior {
  blocksAllActions?: boolean;
  blocksActionTypes?: ActionType[];
  attackRollModifier?: number;
}

export const CONDITION_BEHAVIORS: Record<ConditionKey, ConditionBehavior> = {
  prone: { blocksActionTypes: ["dash"], attackRollModifier: -2 },
  stunned: { blocksAllActions: true },
  poisoned: { attackRollModifier: -2 },
  restrained: { blocksActionTypes: ["move", "dash"], attackRollModifier: -2 },
  invisible: {},
  unconscious: { blocksAllActions: true },
};

export const DEFAULT_CONDITIONS: Record<ConditionKey, Omit<Condition, "id">> = {
  prone: { key: "prone", name: "Derribado", description: "Solo puede arrastrarse; no puede correr." },
  stunned: { key: "stunned", name: "Aturdido", description: "No puede realizar ninguna acción." },
  poisoned: { key: "poisoned", name: "Envenenado", description: "Sufre penalización a sus tiradas de ataque." },
  restrained: { key: "restrained", name: "Apresado", description: "No puede moverse ni correr." },
  invisible: { key: "invisible", name: "Invisible", description: "No puede ser visto sin medios especiales." },
  unconscious: { key: "unconscious", name: "Inconsciente", description: "No puede realizar ninguna acción." },
};

function conditionsFor(state: BattleState, combatantId: string): ConditionBehavior[] {
  return state.conditions
    .filter((entry) => entry.combatantId === combatantId)
    .map((entry) => CONDITION_BEHAVIORS[entry.condition.key]);
}

export function isIncapacitated(state: BattleState, combatantId: string): boolean {
  return conditionsFor(state, combatantId).some((behavior) => behavior.blocksAllActions);
}

export function isActionTypeBlocked(
  state: BattleState,
  combatantId: string,
  actionType: ActionType,
): boolean {
  if (isIncapacitated(state, combatantId)) return true;
  return conditionsFor(state, combatantId).some((behavior) =>
    behavior.blocksActionTypes?.includes(actionType),
  );
}

/** Suma de penalizaciones/bonos a tiradas de ataque que aportan las condiciones activas (sección 12). */
export function attackRollConditionModifier(state: BattleState, combatantId: string): number {
  return conditionsFor(state, combatantId).reduce(
    (sum, behavior) => sum + (behavior.attackRollModifier ?? 0),
    0,
  );
}
