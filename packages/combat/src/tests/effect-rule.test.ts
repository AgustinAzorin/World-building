import { describe, expect, it } from "vitest";
import { effectRule } from "../rules/effect-rule";
import { baseAction, baseBattleState, baseCombatant } from "./test-helpers";

describe("effectRule (sección 7/11): lanzar hechizo / usar objeto aplican efectos genéricos", () => {
  it("un hechizo con un efecto de daño a un objetivo lo aplica", () => {
    const attacker = baseCombatant({ id: "combatant-1", position: { x: 0, y: 0 } });
    const target = baseCombatant({ id: "combatant-2", position: { x: 2, y: 0 }, hitPoints: { current: 20, max: 20 } });
    const state = baseBattleState({ participants: [attacker, target] });

    const action = baseAction("castSpell", {
      targetIds: [target.id],
      parameters: {
        spellId: "fireball",
        range: 10,
        effects: [{ kind: "damage", targetSelector: "targets", durationRounds: null, parameters: { amount: 8, damageType: "fire" } }],
      },
    });

    const result = effectRule(state, action);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const updatedTarget = result.value.state.participants.find((p) => p.id === target.id)!;
    expect(updatedTarget.hitPoints.current).toBe(12);
    expect(result.value.events.some((event) => event.type === "SpellCast")).toBe(true);
    expect(result.value.events.some((event) => event.type === "DamageApplied")).toBe(true);
  });

  it("un efecto con targetSelector 'self' se aplica al actor, no al objetivo", () => {
    const attacker = baseCombatant({ id: "combatant-1", hitPoints: { current: 10, max: 20 } });
    const target = baseCombatant({ id: "combatant-2" });
    const state = baseBattleState({ participants: [attacker, target] });

    const action = baseAction("useItem", {
      targetIds: [target.id],
      parameters: {
        itemName: "Poción",
        effects: [{ kind: "heal", targetSelector: "self", durationRounds: null, parameters: { amount: 5 } }],
      },
    });

    const result = effectRule(state, action);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.state.participants.find((p) => p.id === attacker.id)!.hitPoints.current).toBe(15);
    expect(result.value.state.participants.find((p) => p.id === target.id)!.hitPoints.current).toBe(target.hitPoints.current);
  });

  it("rechaza un objetivo fuera de alcance", () => {
    const attacker = baseCombatant({ id: "combatant-1", position: { x: 0, y: 0 } });
    const farTarget = baseCombatant({ id: "combatant-2", position: { x: 9, y: 9 } });
    const state = baseBattleState({ participants: [attacker, farTarget] });

    const action = baseAction("castSpell", { targetIds: [farTarget.id], parameters: { range: 1, effects: [] } });
    const result = effectRule(state, action);
    expect(result.ok).toBe(false);
  });

  it("ignora acciones que no son castSpell/useItem", () => {
    const state = baseBattleState();
    const result = effectRule(state, baseAction("attack"));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.state).toBe(state);
  });
});
