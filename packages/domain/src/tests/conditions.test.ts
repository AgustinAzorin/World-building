import { describe, expect, it } from "vitest";
import { attackRollConditionModifier, isActionTypeBlocked, isIncapacitated } from "../combat/conditions";
import type { BattleState } from "../combat/battle-state";
import type { Condition } from "../entities/combat";

function condition(key: Condition["key"]): Condition {
  return { id: `cond-${key}`, key, name: key, description: "" };
}

function stateWithConditions(entries: { combatantId: string; key: Condition["key"] }[]): BattleState {
  return {
    battleId: "battle-1",
    round: 1,
    activeParticipantId: "actor-1",
    participants: [],
    map: { mapId: "map-1", width: 5, height: 5, tiles: {} },
    conditions: entries.map((entry) => ({
      combatantId: entry.combatantId,
      condition: condition(entry.key),
      remainingRounds: null,
    })),
    effects: [],
    log: [],
  };
}

describe("condiciones (sección 12)", () => {
  it("incapacitated (aturdido/inconsciente) bloquea cualquier acción, como en el ejemplo del doc", () => {
    const state = stateWithConditions([{ combatantId: "actor-1", key: "stunned" }]);
    expect(isIncapacitated(state, "actor-1")).toBe(true);
    expect(isActionTypeBlocked(state, "actor-1", "attack")).toBe(true);
    expect(isActionTypeBlocked(state, "actor-1", "move")).toBe(true);
  });

  it("un combatant sin condiciones no está bloqueado", () => {
    const state = stateWithConditions([]);
    expect(isIncapacitated(state, "actor-1")).toBe(false);
    expect(isActionTypeBlocked(state, "actor-1", "attack")).toBe(false);
  });

  it("restrained bloquea moverse/correr pero no atacar", () => {
    const state = stateWithConditions([{ combatantId: "actor-1", key: "restrained" }]);
    expect(isActionTypeBlocked(state, "actor-1", "move")).toBe(true);
    expect(isActionTypeBlocked(state, "actor-1", "dash")).toBe(true);
    expect(isActionTypeBlocked(state, "actor-1", "attack")).toBe(false);
  });

  it("poisoned altera los modificadores de ataque (ejemplo del doc)", () => {
    const state = stateWithConditions([{ combatantId: "actor-1", key: "poisoned" }]);
    expect(attackRollConditionModifier(state, "actor-1")).toBe(-2);
  });

  it("sin condiciones relevantes, el modificador de ataque es 0", () => {
    const state = stateWithConditions([{ combatantId: "actor-1", key: "invisible" }]);
    expect(attackRollConditionModifier(state, "actor-1")).toBe(0);
  });
});
