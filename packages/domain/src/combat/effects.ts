import { createId, type Id } from "@world-building/shared";
import type { Condition, ConditionKey, Effect } from "../entities/combat";
import { DEFAULT_CONDITIONS } from "./conditions";
import type { CombatEvent, CombatLogEntry } from "./events";
import { type BattleState, type CombatantState, findCombatant } from "./battle-state";

function replaceCombatant(
  state: BattleState,
  combatantId: Id,
  patch: Partial<CombatantState>,
): BattleState {
  return {
    ...state,
    participants: state.participants.map((participant) =>
      participant.id === combatantId ? { ...participant, ...patch } : participant,
    ),
  };
}

/** Sección 12: aplica resistencia/inmunidad/vulnerabilidad de la instantánea del combatant. */
export function applyDamage(
  target: CombatantState,
  amount: number,
  damageType?: string,
): { current: number; applied: number } {
  let applied = Math.max(0, amount);
  if (damageType) {
    if (target.immunities.includes(damageType)) applied = 0;
    else if (target.resistances.includes(damageType)) applied = Math.floor(applied / 2);
    else if (target.vulnerabilities.includes(damageType)) applied = applied * 2;
  }
  return { current: Math.max(0, target.hitPoints.current - applied), applied };
}

export interface EffectApplicationResult {
  state: BattleState;
  events: CombatEvent[];
}

interface EffectContext {
  battleId: Id;
  round: number;
  actorId: Id;
}

function baseEvent(ctx: EffectContext) {
  return {
    id: createId(),
    battleId: ctx.battleId,
    round: ctx.round,
    actorId: ctx.actorId,
    timestamp: new Date().toISOString(),
  };
}

function appendLog(state: BattleState, event: CombatEvent, message: string): BattleState {
  const logEntry: CombatLogEntry = { event, message };
  return { ...state, log: [...state.log, logEntry] };
}

function registerEffectInstance(
  state: BattleState,
  targetId: Id,
  effect: Effect,
  remainingRounds: number | null,
): BattleState {
  if (remainingRounds === null) return state;
  return {
    ...state,
    effects: [...state.effects, { id: createId(), combatantId: targetId, effect, remainingRounds }],
  };
}

/**
 * Sección 11: aplica un `Effect` a un combatant concreto. Un efecto con
 * duración se registra en `state.effects` para que `tickEffects` lo repita o
 * lo retire cuando corresponda (sección 12). `remainingRoundsOverride` lo usa
 * `tickEffects` para reinstalar el efecto con la duración ya decrementada en
 * lugar de reiniciarla a `effect.durationRounds`.
 */
export function applyEffectToState(
  state: BattleState,
  targetId: Id,
  effect: Effect,
  ctx: EffectContext,
  remainingRoundsOverride: number | null = effect.durationRounds,
): EffectApplicationResult {
  const target = findCombatant(state, targetId);
  if (!target) {
    return { state, events: [] };
  }

  switch (effect.kind) {
    case "damage": {
      const amount = Number(effect.parameters.amount ?? 0);
      const damageType = effect.parameters.damageType as string | undefined;
      const { current, applied } = applyDamage(target, amount, damageType);
      const event: CombatEvent = { ...baseEvent(ctx), type: "DamageApplied", targetId, amount: applied };
      let nextState = replaceCombatant(state, targetId, { hitPoints: { ...target.hitPoints, current } });
      nextState = appendLog(
        nextState,
        event,
        `${target.name} recibe ${applied} de daño (${target.hitPoints.current} → ${current} PV)`,
      );
      nextState = registerEffectInstance(nextState, targetId, effect, remainingRoundsOverride);
      return { state: nextState, events: [event] };
    }
    case "heal": {
      const amount = Number(effect.parameters.amount ?? 0);
      const current = Math.min(target.hitPoints.max, target.hitPoints.current + amount);
      const event: CombatEvent = { ...baseEvent(ctx), type: "HealingApplied", targetId, amount };
      let nextState = replaceCombatant(state, targetId, { hitPoints: { ...target.hitPoints, current } });
      nextState = appendLog(
        nextState,
        event,
        `${target.name} recupera ${amount} PV (${target.hitPoints.current} → ${current} PV)`,
      );
      nextState = registerEffectInstance(nextState, targetId, effect, remainingRoundsOverride);
      return { state: nextState, events: [event] };
    }
    case "condition": {
      const conditionKey = effect.parameters.conditionKey as ConditionKey;
      const definition = DEFAULT_CONDITIONS[conditionKey];
      const condition: Condition = { id: createId(), ...definition };
      const event: CombatEvent = { ...baseEvent(ctx), type: "ConditionApplied", targetId, conditionKey };
      let nextState: BattleState = {
        ...state,
        conditions: [
          ...state.conditions,
          { combatantId: targetId, condition, remainingRounds: effect.durationRounds },
        ],
      };
      nextState = appendLog(nextState, event, `${target.name} queda ${condition.name.toLowerCase()}`);
      return { state: nextState, events: [event] };
    }
    case "resourceChange": {
      const resourceName = String(effect.parameters.resourceName ?? "");
      const amount = Number(effect.parameters.amount ?? 0);
      const current = (target.resources[resourceName] ?? 0) + amount;
      const event: CombatEvent = { ...baseEvent(ctx), type: "EffectApplied", targetId, effectKind: effect.kind };
      let nextState = replaceCombatant(state, targetId, {
        resources: { ...target.resources, [resourceName]: current },
      });
      nextState = appendLog(
        nextState,
        event,
        `${target.name}: ${resourceName} ${amount >= 0 ? "+" : ""}${amount} (${current})`,
      );
      return { state: nextState, events: [event] };
    }
    case "movement": {
      const destination = effect.parameters.destination as { x: number; y: number } | undefined;
      if (!destination) return { state, events: [] };
      const event: CombatEvent = { ...baseEvent(ctx), type: "MovementPerformed", from: target.position, to: destination };
      let nextState = replaceCombatant(state, targetId, { position: destination });
      nextState = appendLog(nextState, event, `${target.name} es desplazado a (${destination.x}, ${destination.y})`);
      return { state: nextState, events: [event] };
    }
    default: {
      // buff, debuff, itemCreation, summon: se deja registrada la instancia
      // (sección 18, replays); su interpretación numérica concreta la resuelve
      // quien generó el efecto (rasgo, hechizo u objeto), sin duplicar esa lógica aquí.
      const event: CombatEvent = { ...baseEvent(ctx), type: "EffectApplied", targetId, effectKind: effect.kind };
      let nextState = appendLog(state, event, `${target.name} recibe el efecto "${effect.kind}"`);
      nextState = registerEffectInstance(nextState, targetId, effect, remainingRoundsOverride);
      return { state: nextState, events: [event] };
    }
  }
}

/**
 * Sección 6/12: al empezar el turno de un combatant, sus efectos con
 * duración avanzan una ronda; los de daño/curación periódica vuelven a
 * aplicarse, y los que llegan a 0 rondas se retiran.
 */
export function tickEffects(state: BattleState, combatantId: Id, ctx: EffectContext): EffectApplicationResult {
  let nextState = state;
  const events: CombatEvent[] = [];
  const instances = nextState.effects.filter((instance) => instance.combatantId === combatantId);

  for (const instance of instances) {
    if (instance.remainingRounds === null) continue;
    const remainingRounds = instance.remainingRounds - 1;
    const withoutInstance = { ...nextState, effects: nextState.effects.filter((entry) => entry.id !== instance.id) };

    if (remainingRounds <= 0) {
      const event: CombatEvent = {
        ...baseEvent(ctx),
        type: "EffectExpired",
        targetId: combatantId,
        effectKind: instance.effect.kind,
      };
      nextState = appendLog(withoutInstance, event, `El efecto "${instance.effect.kind}" expira`);
      events.push(event);
      continue;
    }

    if (instance.effect.kind === "damage" || instance.effect.kind === "heal") {
      const reapplied = applyEffectToState(withoutInstance, combatantId, instance.effect, ctx, remainingRounds);
      nextState = reapplied.state;
      events.push(...reapplied.events);
    } else {
      nextState = {
        ...withoutInstance,
        effects: [...withoutInstance.effects, { ...instance, remainingRounds }],
      };
    }
  }

  const activeConditions = nextState.conditions.filter(
    (entry) => entry.combatantId === combatantId && entry.remainingRounds !== null,
  );
  for (const entry of activeConditions) {
    const remainingRounds = entry.remainingRounds! - 1;
    if (remainingRounds <= 0) {
      nextState = { ...nextState, conditions: nextState.conditions.filter((c) => c !== entry) };
      const event: CombatEvent = {
        ...baseEvent(ctx),
        type: "ConditionExpired",
        targetId: combatantId,
        conditionKey: entry.condition.key,
      };
      nextState = appendLog(nextState, event, `${entry.condition.name} deja de afectar al combatant`);
      events.push(event);
    } else {
      nextState = {
        ...nextState,
        conditions: nextState.conditions.map((c) => (c === entry ? { ...c, remainingRounds } : c)),
      };
    }
  }

  return { state: nextState, events };
}
