import { createId, DomainError, err, ok } from "@world-building/shared";
import { findCombatant, type ActionType, type CombatEvent, type CombatLogEntry, type Rule } from "@world-building/domain";
import { consumeActionCost } from "./support";
import type { ResourceCostParameters } from "./validate-rule";

/**
 * Sección 7: acciones que consumen la acción del turno pero no tienen una
 * resolución compuesta propia (defender, ayudar, esconderse, esquivar,
 * acción especial, reacción). `validateRule` ya comprobó turno/recursos.
 */
const GENERIC_ACTION_TYPES: ReadonlySet<ActionType> = new Set([
  "dodge",
  "defend",
  "interact",
  "help",
  "hide",
  "special",
  "reaction",
]);

export const genericActionRule: Rule = (state, action) => {
  if (!GENERIC_ACTION_TYPES.has(action.type)) {
    return ok({ events: [], state });
  }

  const actor = findCombatant(state, action.actorId);
  if (!actor) {
    return err(new DomainError("COMBATANT_NOT_FOUND", `Combatant ${action.actorId} no encontrado`));
  }

  const resourceCost = action.parameters.resourceCost as ResourceCostParameters | undefined;
  const actionCost = action.type === "reaction" ? 0 : Number(action.parameters.actionCost ?? 1);
  const nextState = consumeActionCost(state, actor.id, actionCost, resourceCost);

  const event: CombatEvent = {
    id: createId(),
    battleId: state.battleId,
    round: state.round,
    actorId: action.actorId,
    timestamp: new Date().toISOString(),
    type: "ActionPerformed",
    actionType: action.type,
  };
  const logEntry: CombatLogEntry = { event, message: `${actor.name} realiza: ${action.type}` };

  return ok({ events: [event], state: { ...nextState, log: [...nextState.log, logEntry] } });
};
