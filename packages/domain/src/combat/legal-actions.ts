import type { Id } from "@world-building/shared";
import type { ActionTemplate } from "../character/action-template";
import { isActionTypeBlocked } from "./conditions";
import { type BattleState, findCombatant } from "./battle-state";

/**
 * Sección 7/8: no mostrar acciones claramente imposibles. Cada chequeo queda
 * expuesto por separado (como en el ejemplo "✓ equipado / ✓ dentro de
 * alcance / ✓ acción disponible") para que la interfaz pueda explicar por qué
 * algo no está disponible. El rango y la línea de visión dependen de un
 * objetivo concreto, así que se validan al resolver la acción (sección 10),
 * no en este listado previo a elegir objetivo.
 */
export interface LegalActionCheck {
  key: "turn" | "alive" | "condition" | "actionsRemaining" | "resource";
  passed: boolean;
  reason: string;
}

export interface LegalAction {
  template: ActionTemplate;
  available: boolean;
  checks: LegalActionCheck[];
}

/** Mover no consume la acción del turno (consume movimiento); terminar turno tampoco. */
const ACTIONS_WITHOUT_ACTION_COST = new Set(["move", "endTurn"]);

export function computeLegalActions(
  state: BattleState,
  actorId: Id,
  templates: ActionTemplate[],
): LegalAction[] {
  const actor = findCombatant(state, actorId);
  const isActorTurn = state.activeParticipantId === actorId;
  const actorAlive = actor !== undefined && actor.hitPoints.current > 0;

  return templates.map((template) => {
    const checks: LegalActionCheck[] = [
      { key: "turn", passed: isActorTurn, reason: isActorTurn ? "Es tu turno" : "No es tu turno" },
      { key: "alive", passed: actorAlive, reason: actorAlive ? "Activo" : "El actor no está activo" },
    ];

    if (actor && template.type !== "endTurn") {
      const blocked = isActionTypeBlocked(state, actorId, template.type);
      checks.push({
        key: "condition",
        passed: !blocked,
        reason: blocked ? "Una condición lo impide" : "Sin condiciones que lo bloqueen",
      });
    }

    if (actor && !ACTIONS_WITHOUT_ACTION_COST.has(template.type)) {
      const hasActionsLeft = actor.actionsRemaining > 0;
      checks.push({
        key: "actionsRemaining",
        passed: hasActionsLeft,
        reason: hasActionsLeft ? "Acción disponible" : "Sin acciones disponibles",
      });
    }

    if (actor && template.resourceCost) {
      const available = (actor.resources[template.resourceCost.resourceName] ?? 0) >= template.resourceCost.amount;
      checks.push({
        key: "resource",
        passed: available,
        reason: available ? "Recurso disponible" : `Sin ${template.resourceCost.resourceName} suficiente`,
      });
    }

    return { template, available: actor !== undefined && checks.every((check) => check.passed), checks };
  });
}
