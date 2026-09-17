import { describe, expect, it } from "vitest";
import { applyEffectToState, tickEffects } from "../combat/effects";
import type { Effect } from "../entities/combat";
import { baseBattleState, baseCombatant } from "./combat-test-helpers";

const ctx = { battleId: "battle-1", round: 1, actorId: "attacker-1" };

function effect(overrides: Partial<Effect> = {}): Effect {
  return { id: "effect-1", kind: "damage", sourceId: "attacker-1", durationRounds: null, parameters: {}, ...overrides };
}

describe("applyEffectToState (sección 11)", () => {
  it("daño simple reduce los PV actuales", () => {
    const state = baseBattleState();
    const { state: next } = applyEffectToState(state, "combatant-1", effect({ parameters: { amount: 6 } }), ctx);
    expect(next.participants[0]!.hitPoints.current).toBe(14);
  });

  it("aplica resistencia (mitad de daño)", () => {
    const state = baseBattleState({ participants: [baseCombatant({ resistances: ["fire"] })] });
    const { state: next } = applyEffectToState(
      state,
      "combatant-1",
      effect({ parameters: { amount: 10, damageType: "fire" } }),
      ctx,
    );
    expect(next.participants[0]!.hitPoints.current).toBe(15);
  });

  it("aplica inmunidad (sin daño)", () => {
    const state = baseBattleState({ participants: [baseCombatant({ immunities: ["fire"] })] });
    const { state: next } = applyEffectToState(
      state,
      "combatant-1",
      effect({ parameters: { amount: 10, damageType: "fire" } }),
      ctx,
    );
    expect(next.participants[0]!.hitPoints.current).toBe(20);
  });

  it("aplica vulnerabilidad (doble daño)", () => {
    const state = baseBattleState({ participants: [baseCombatant({ vulnerabilities: ["fire"] })] });
    const { state: next } = applyEffectToState(
      state,
      "combatant-1",
      effect({ parameters: { amount: 5, damageType: "fire" } }),
      ctx,
    );
    expect(next.participants[0]!.hitPoints.current).toBe(10);
  });

  it("curación no supera el máximo de PV", () => {
    const state = baseBattleState({ participants: [baseCombatant({ hitPoints: { current: 18, max: 20 } })] });
    const { state: next } = applyEffectToState(state, "combatant-1", effect({ kind: "heal", parameters: { amount: 10 } }), ctx);
    expect(next.participants[0]!.hitPoints.current).toBe(20);
  });

  it("un efecto de condición añade la condición al combatant", () => {
    const state = baseBattleState();
    const { state: next } = applyEffectToState(
      state,
      "combatant-1",
      effect({ kind: "condition", parameters: { conditionKey: "poisoned" } }),
      ctx,
    );
    expect(next.conditions).toHaveLength(1);
    expect(next.conditions[0]!.condition.key).toBe("poisoned");
  });

  it("resourceChange modifica el recurso del combatant", () => {
    const state = baseBattleState({ participants: [baseCombatant({ resources: { ki: 3 } })] });
    const { state: next } = applyEffectToState(
      state,
      "combatant-1",
      effect({ kind: "resourceChange", parameters: { resourceName: "ki", amount: -1 } }),
      ctx,
    );
    expect(next.participants[0]!.resources.ki).toBe(2);
  });

  it("movement reposiciona al combatant", () => {
    const state = baseBattleState();
    const { state: next } = applyEffectToState(
      state,
      "combatant-1",
      effect({ kind: "movement", parameters: { destination: { x: 5, y: 5 } } }),
      ctx,
    );
    expect(next.participants[0]!.position).toEqual({ x: 5, y: 5 });
  });

  it("un efecto no reconocido (buff) no rompe el motor y queda registrado con su duración", () => {
    const state = baseBattleState();
    const { state: next } = applyEffectToState(state, "combatant-1", effect({ kind: "buff", durationRounds: 3 }), ctx);
    expect(next.effects).toHaveLength(1);
    expect(next.effects[0]!.remainingRounds).toBe(3);
  });
});

describe("tickEffects (sección 12: duración de efectos y condiciones)", () => {
  it("un daño periódico se repite en cada tick y expira al agotar sus rondas", () => {
    const dot = effect({ kind: "damage", durationRounds: 2, parameters: { amount: 3 } });
    const state = baseBattleState({ effects: [{ id: "instance-1", combatantId: "combatant-1", effect: dot, remainingRounds: 2 }] });

    const firstTick = tickEffects(state, "combatant-1", ctx);
    expect(firstTick.state.participants[0]!.hitPoints.current).toBe(17);
    expect(firstTick.state.effects).toHaveLength(1);
    expect(firstTick.state.effects[0]!.remainingRounds).toBe(1);

    const secondTick = tickEffects(firstTick.state, "combatant-1", ctx);
    expect(secondTick.state.participants[0]!.hitPoints.current).toBe(17);
    expect(secondTick.state.effects).toHaveLength(0);
  });

  it("una condición con duración se retira cuando llega a 0 rondas", () => {
    const state = baseBattleState({
      conditions: [
        {
          combatantId: "combatant-1",
          condition: { id: "c1", key: "poisoned", name: "Envenenado", description: "" },
          remainingRounds: 1,
        },
      ],
    });

    const { state: next } = tickEffects(state, "combatant-1", ctx);
    expect(next.conditions).toHaveLength(0);
  });
});
