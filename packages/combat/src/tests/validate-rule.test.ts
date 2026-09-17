import { describe, expect, it } from "vitest";
import { validateRule } from "../rules/validate-rule";
import { baseAction, baseBattleState, baseCombatant } from "./test-helpers";

describe("validateRule (sección 8): validaciones comunes a cualquier acción", () => {
  it("rechaza actuar fuera de turno", () => {
    const state = baseBattleState({ activeParticipantId: "combatant-2" });
    const result = validateRule(state, baseAction("attack"));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("NOT_YOUR_TURN");
  });

  it("rechaza actuar si el actor está a 0 PV", () => {
    const state = baseBattleState({ participants: [baseCombatant({ hitPoints: { current: 0, max: 20 } })] });
    const result = validateRule(state, baseAction("attack"));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("ACTOR_NOT_ACTIVE");
  });

  it("rechaza una acción bloqueada por una condición", () => {
    const state = baseBattleState({
      conditions: [{ combatantId: "combatant-1", condition: { id: "c1", key: "stunned", name: "Aturdido", description: "" }, remainingRounds: null }],
    });
    const result = validateRule(state, baseAction("attack"));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("ACTION_BLOCKED_BY_CONDITION");
  });

  it("rechaza una acción si no quedan acciones disponibles", () => {
    const state = baseBattleState({ participants: [baseCombatant({ actionsRemaining: 0 })] });
    const result = validateRule(state, baseAction("attack"));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("NO_ACTIONS_REMAINING");
  });

  it("permite moverse aunque no queden acciones (mover no gasta la acción)", () => {
    const state = baseBattleState({ participants: [baseCombatant({ actionsRemaining: 0 })] });
    const result = validateRule(state, baseAction("move"));
    expect(result.ok).toBe(true);
  });

  it("rechaza gastar un recurso insuficiente", () => {
    const state = baseBattleState({ participants: [baseCombatant({ resources: { spellSlot1: 0 } })] });
    const action = baseAction("castSpell", { parameters: { resourceCost: { resourceName: "spellSlot1", amount: 1 } } });
    const result = validateRule(state, action);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("INSUFFICIENT_RESOURCE");
  });

  it("siempre permite terminar el turno", () => {
    const state = baseBattleState({ activeParticipantId: "someone-else" });
    const result = validateRule(state, baseAction("endTurn", { actorId: "someone-else" }));
    expect(result.ok).toBe(true);
  });
});
