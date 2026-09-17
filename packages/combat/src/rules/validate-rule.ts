import {
  findCombatant,
  isActionTypeBlocked,
  type Rule,
} from "@world-building/domain";
import { DomainError, err, ok } from "@world-building/shared";

/** Mover no consume la acción del turno (consume movimiento); terminar turno tampoco. */
const ACTIONS_WITHOUT_ACTION_COST = new Set(["move", "endTurn"]);

export interface ResourceCostParameters {
  resourceName: string;
  amount: number;
}

/**
 * Sección 8: comprobaciones que valen para cualquier tipo de acción, en el
 * motor y no solo en el cliente. Corre primero en la cadena de reglas
 * (sección 6, paso "Validate"); las reglas específicas de cada acción
 * (mover, atacar...) asumen que esto ya pasó.
 */
export const validateRule: Rule = (state, action) => {
  if (action.type === "endTurn") {
    return ok({ events: [], state });
  }

  if (state.activeParticipantId !== action.actorId) {
    return err(new DomainError("NOT_YOUR_TURN", `No es el turno de ${action.actorId}`));
  }

  const actor = findCombatant(state, action.actorId);
  if (!actor) {
    return err(new DomainError("ACTOR_NOT_FOUND", `Combatant ${action.actorId} no encontrado`));
  }
  if (actor.hitPoints.current <= 0) {
    return err(new DomainError("ACTOR_NOT_ACTIVE", `${actor.name} no está activo`));
  }

  if (isActionTypeBlocked(state, action.actorId, action.type)) {
    return err(new DomainError("ACTION_BLOCKED_BY_CONDITION", `Una condición impide esa acción a ${actor.name}`));
  }

  if (!ACTIONS_WITHOUT_ACTION_COST.has(action.type) && actor.actionsRemaining <= 0) {
    return err(new DomainError("NO_ACTIONS_REMAINING", `${actor.name} no tiene acciones disponibles`));
  }

  const resourceCost = action.parameters.resourceCost as ResourceCostParameters | undefined;
  if (resourceCost && (actor.resources[resourceCost.resourceName] ?? 0) < resourceCost.amount) {
    return err(
      new DomainError(
        "INSUFFICIENT_RESOURCE",
        `${actor.name} no tiene suficiente ${resourceCost.resourceName}`,
      ),
    );
  }

  return ok({ events: [], state });
};
