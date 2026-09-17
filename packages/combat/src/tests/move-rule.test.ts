import { describe, expect, it } from "vitest";
import { dashRule, moveRule } from "../rules/move-rule";
import { baseAction, baseBattleState, baseCombatant, baseMap } from "./test-helpers";

describe("moveRule (sección 9)", () => {
  it("mueve al actor y descuenta el coste de movimiento", () => {
    const state = baseBattleState();
    const action = baseAction("move", { destination: { x: 1, y: 0 } });

    const result = moveRule(state, action);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const combatant = result.value.state.participants[0]!;
    expect(combatant.position).toEqual({ x: 1, y: 0 });
    expect(combatant.movementRemaining).toBe(29);
    expect(result.value.events[0]!.type).toBe("MovementPerformed");
  });

  it("rechaza un destino fuera del movimiento restante", () => {
    const state = baseBattleState({ participants: [baseCombatant({ movementRemaining: 1 })] });
    const action = baseAction("move", { destination: { x: 5, y: 5 } });

    const result = moveRule(state, action);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("UNREACHABLE_DESTINATION");
  });

  it("rechaza moverse a una casilla ocupada por otro combatant", () => {
    const map = baseMap({ tiles: { "1,0": { x: 1, y: 0, terrain: "normal", walkable: true, movementCost: 1, occupied: "combatant-2" } } });
    const state = baseBattleState({ map });
    const action = baseAction("move", { destination: { x: 1, y: 0 } });

    const result = moveRule(state, action);
    expect(result.ok).toBe(false);
  });

  it("ignora acciones que no son de movimiento", () => {
    const state = baseBattleState();
    const result = moveRule(state, baseAction("attack"));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.state).toBe(state);
  });
});

describe("dashRule (sección 7: correr duplica el movimiento)", () => {
  it("suma la velocidad al movimiento restante y consume la acción", () => {
    const state = baseBattleState({ participants: [baseCombatant({ movementRemaining: 10, speed: 30 })] });
    const result = dashRule(state, baseAction("dash"));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const combatant = result.value.state.participants[0]!;
    expect(combatant.movementRemaining).toBe(40);
    expect(combatant.actionsRemaining).toBe(0);
  });
});
