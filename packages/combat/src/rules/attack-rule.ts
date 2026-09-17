import { createId, DomainError, err, ok, type Id } from "@world-building/shared";
import {
  applyDamage,
  attackRollConditionModifier,
  findCombatant,
  formatRollResolution,
  gridDistance,
  hasLineOfSight,
  resolveRoll,
  rollDice,
  type CombatEvent,
  type CombatLogEntry,
  type ConditionKey,
  type RandomSource,
  type Rule,
} from "@world-building/domain";
import { consumeActionCost } from "./support";
import type { ResourceCostParameters } from "./validate-rule";

export interface AttackActionParameters {
  attackBonus?: number;
  range?: number;
  damageDice?: { count: number; sides: number };
  damageBonus?: number;
  damageType?: string;
  weaponName?: string;
  actionCost?: number;
  resourceCost?: ResourceCostParameters;
}

const DOWNED_CONDITION: ConditionKey = "unconscious";

/**
 * Sección 10: ataque como resolución compuesta —
 * validate -> roll -> calculate modifiers -> compare defense -> hit/miss ->
 * calculate damage -> apply resistance -> apply damage -> trigger effects -> log.
 */
export function createAttackRule(random: RandomSource = Math.random): Rule {
  return (state, action) => {
    if (action.type !== "attack") {
      return ok({ events: [], state });
    }

    const attacker = findCombatant(state, action.actorId);
    if (!attacker) {
      return err(new DomainError("COMBATANT_NOT_FOUND", `Combatant ${action.actorId} no encontrado`));
    }
    const targetId = action.targetIds[0];
    if (!targetId) {
      return err(new DomainError("INVALID_ACTION", "attack requiere un objetivo"));
    }
    const target = findCombatant(state, targetId);
    if (!target) {
      return err(new DomainError("TARGET_NOT_FOUND", `Combatant ${targetId} no encontrado`));
    }
    if (target.hitPoints.current <= 0) {
      return err(new DomainError("TARGET_NOT_ACTIVE", `${target.name} ya no está en pie`));
    }

    const params = action.parameters as AttackActionParameters;
    const range = params.range ?? 1;
    if (gridDistance(attacker.position, target.position) > range) {
      return err(new DomainError("OUT_OF_RANGE", `${target.name} está fuera de alcance`));
    }
    if (!hasLineOfSight(state.map, attacker.position, target.position)) {
      return err(new DomainError("NO_LINE_OF_SIGHT", `${attacker.name} no tiene línea de visión hacia ${target.name}`));
    }

    const weaponName = params.weaponName ?? "su ataque";
    const conditionModifier = attackRollConditionModifier(state, attacker.id);
    const attackRoll = rollDice(1, 20, random);
    const attackResolution = resolveRoll(attackRoll, [
      { source: "bono de ataque", amount: params.attackBonus ?? 0 },
      ...(conditionModifier !== 0 ? [{ source: "condición", amount: conditionModifier }] : []),
    ]);
    const hit = attackResolution.total >= target.armorClass;

    const nowIso = new Date().toISOString();
    const base = { battleId: state.battleId, round: state.round, actorId: action.actorId, timestamp: nowIso };

    const attackResolvedEvent: CombatEvent = {
      ...base,
      id: createId(),
      type: "AttackResolved",
      targetId,
      hit,
      roll: attackResolution.total,
    };
    const events: CombatEvent[] = [attackResolvedEvent];
    let logEntries: CombatLogEntry[] = [
      {
        event: attackResolvedEvent,
        message: `${attacker.name} ataca a ${target.name} con ${weaponName}: ${formatRollResolution(attackResolution)} (${hit ? "impacta" : "falla"})`,
      },
    ];

    let nextState = consumeActionCost(state, attacker.id, params.actionCost ?? 1, params.resourceCost);
    let participants = nextState.participants;

    if (hit) {
      const damageDice = params.damageDice ?? { count: 1, sides: 4 };
      const damageRoll = rollDice(damageDice.count, damageDice.sides, random);
      const damageResolution = resolveRoll(damageRoll, [
        { source: "bono de daño", amount: params.damageBonus ?? 0 },
      ]);
      const { current, applied } = applyDamage(target, damageResolution.total, params.damageType);

      participants = participants.map((participant) =>
        participant.id === targetId ? { ...participant, hitPoints: { ...participant.hitPoints, current } } : participant,
      );

      const damageEvent: CombatEvent = { ...base, id: createId(), type: "DamageApplied", targetId, amount: applied };
      events.push(damageEvent);
      logEntries.push({
        event: damageEvent,
        message: `Daño: ${formatRollResolution(damageResolution)} → ${applied} aplicados. ${target.name}: ${target.hitPoints.current} → ${current} PV`,
      });

      if (current <= 0) {
        const downedId: Id = targetId;
        const alreadyDowned = state.conditions.some(
          (entry) => entry.combatantId === downedId && entry.condition.key === DOWNED_CONDITION,
        );
        if (!alreadyDowned) {
          const conditionEvent: CombatEvent = {
            ...base,
            id: createId(),
            type: "ConditionApplied",
            targetId: downedId,
            conditionKey: DOWNED_CONDITION,
          };
          events.push(conditionEvent);
          logEntries.push({ event: conditionEvent, message: `${target.name} queda inconsciente` });
          nextState = {
            ...nextState,
            conditions: [
              ...nextState.conditions,
              {
                combatantId: downedId,
                condition: { id: createId(), key: DOWNED_CONDITION, name: "Inconsciente", description: "No puede realizar ninguna acción." },
                remainingRounds: null,
              },
            ],
          };
        }
      }
    }

    return ok({
      events,
      state: { ...nextState, participants, log: [...nextState.log, ...logEntries] },
    });
  };
}

export const attackRule = createAttackRule();
