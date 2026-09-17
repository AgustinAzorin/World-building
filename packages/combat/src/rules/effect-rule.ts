import { createId, DomainError, err, ok } from "@world-building/shared";
import {
  applyEffectToState,
  findCombatant,
  gridDistance,
  hasLineOfSight,
  type CombatEvent,
  type CombatLogEntry,
  type EffectKind,
  type Rule,
} from "@world-building/domain";
import { consumeActionCost } from "./support";
import type { ResourceCostParameters } from "./validate-rule";

/**
 * Un hechizo/objeto declarado como datos (sección 11): qué `Effect`s produce
 * y a quién van dirigidos. El motor no conoce "Bola de Fuego"; conoce esta
 * lista.
 */
export interface EffectSpec {
  kind: EffectKind;
  targetSelector: "self" | "targets";
  durationRounds: number | null;
  parameters: Record<string, unknown>;
}

export interface EffectActionParameters {
  effects?: EffectSpec[];
  spellId?: string;
  itemName?: string;
  range?: number;
  actionCost?: number;
  resourceCost?: ResourceCostParameters;
}

/** Sección 7/10: lanzar hechizo y usar objeto comparten el mismo mecanismo genérico de efectos. */
export const effectRule: Rule = (state, action) => {
  if (action.type !== "castSpell" && action.type !== "useItem") {
    return ok({ events: [], state });
  }

  const actor = findCombatant(state, action.actorId);
  if (!actor) {
    return err(new DomainError("COMBATANT_NOT_FOUND", `Combatant ${action.actorId} no encontrado`));
  }

  const params = action.parameters as EffectActionParameters;
  const range = params.range;
  if (range !== undefined) {
    for (const targetId of action.targetIds) {
      const target = findCombatant(state, targetId);
      if (!target) continue;
      if (gridDistance(actor.position, target.position) > range) {
        return err(new DomainError("OUT_OF_RANGE", `${target.name} está fuera de alcance`));
      }
      if (!hasLineOfSight(state.map, actor.position, target.position)) {
        return err(new DomainError("NO_LINE_OF_SIGHT", `${actor.name} no tiene línea de visión hacia ${target.name}`));
      }
    }
  }

  let nextState = consumeActionCost(state, actor.id, params.actionCost ?? 1, params.resourceCost);
  const events: CombatEvent[] = [];

  const nowIso = new Date().toISOString();
  const base = { battleId: state.battleId, round: state.round, actorId: action.actorId, timestamp: nowIso };
  const declaredEvent: CombatEvent =
    action.type === "castSpell"
      ? { ...base, id: createId(), type: "SpellCast", spellId: params.spellId ?? "unknown-spell", targetIds: action.targetIds }
      : { ...base, id: createId(), type: "ActionPerformed", actionType: "useItem" };
  const declaredLogEntry: CombatLogEntry = {
    event: declaredEvent,
    message:
      action.type === "castSpell"
        ? `${actor.name} lanza ${params.spellId ?? "un hechizo"}`
        : `${actor.name} usa ${params.itemName ?? "un objeto"}`,
  };
  events.push(declaredEvent);
  nextState = { ...nextState, log: [...nextState.log, declaredLogEntry] };

  for (const spec of params.effects ?? []) {
    const targetIds = spec.targetSelector === "self" ? [actor.id] : action.targetIds;
    for (const targetId of targetIds) {
      const effect = { id: createId(), kind: spec.kind, sourceId: action.actorId, durationRounds: spec.durationRounds, parameters: spec.parameters };
      const applied = applyEffectToState(nextState, targetId, effect, {
        battleId: state.battleId,
        round: state.round,
        actorId: action.actorId,
      });
      nextState = applied.state;
      events.push(...applied.events);
    }
  }

  return ok({ events, state: nextState });
};
