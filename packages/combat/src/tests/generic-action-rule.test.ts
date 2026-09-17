import { describe, expect, it } from "vitest";
import { genericActionRule } from "../rules/generic-action-rule";
import { baseAction, baseBattleState, baseCombatant } from "./test-helpers";

describe("genericActionRule (sección 7): defender, ayudar, esconderse, esquivar...", () => {
  it("consume la acción del turno y registra el resultado en el log", () => {
    const state = baseBattleState();
    const result = genericActionRule(state, baseAction("hide"));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.state.participants[0]!.actionsRemaining).toBe(0);
    expect(result.value.state.log.some((entry) => entry.message.includes("hide"))).toBe(true);
  });

  it("una reacción no consume la acción del turno", () => {
    const state = baseBattleState();
    const result = genericActionRule(state, baseAction("reaction"));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.state.participants[0]!.actionsRemaining).toBe(1);
  });

  it("ignora tipos de acción con resolución propia (move, attack)", () => {
    const state = baseBattleState();
    const result = genericActionRule(state, baseAction("attack"));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.state).toBe(state);
  });
});
