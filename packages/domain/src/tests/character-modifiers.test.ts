import { describe, expect, it } from "vitest";
import {
  ARMOR_CLASS_TARGET,
  computeDerivedValue,
  type ActiveModifier,
} from "../character/modifiers";

describe("computeDerivedValue", () => {
  it("explica de dónde sale la CA (sección 10): 10 base + 3 armadura + 2 escudo + 1 rasgo = 16", () => {
    const modifiers: ActiveModifier[] = [
      { source: "Armadura de cuero tachonado", target: ARMOR_CLASS_TARGET, amount: 3, operation: "add" },
      { source: "Escudo", target: ARMOR_CLASS_TARGET, amount: 2, operation: "add" },
      { source: "Rasgo: Piel de dragón", target: ARMOR_CLASS_TARGET, amount: 1, operation: "add" },
      { source: "Otro objetivo, no debe contar", target: "speed", amount: 99, operation: "add" },
    ];

    const derived = computeDerivedValue(10, "base", ARMOR_CLASS_TARGET, modifiers);

    expect(derived.total).toBe(16);
    expect(derived.breakdown).toEqual([
      { source: "base", amount: 10 },
      { source: "Armadura de cuero tachonado", amount: 3 },
      { source: "Escudo", amount: 2 },
      { source: "Rasgo: Piel de dragón", amount: 1 },
    ]);
  });

  it("un modificador 'set' reemplaza la suma", () => {
    const modifiers: ActiveModifier[] = [
      { source: "Armadura", target: ARMOR_CLASS_TARGET, amount: 3, operation: "add" },
      { source: "Anillo de protección absoluta", target: ARMOR_CLASS_TARGET, amount: 20, operation: "set" },
    ];

    const derived = computeDerivedValue(10, "base", ARMOR_CLASS_TARGET, modifiers);

    expect(derived.total).toBe(20);
    expect(derived.breakdown).toEqual([
      { source: "Anillo de protección absoluta", amount: 20 },
    ]);
  });

  it("sin modificadores relevantes, el total es el valor base", () => {
    const derived = computeDerivedValue(30, "velocidad base", "speed", []);
    expect(derived).toEqual({ total: 30, breakdown: [{ source: "velocidad base", amount: 30 }] });
  });
});
