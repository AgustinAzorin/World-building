import { describe, expect, it } from "vitest";
import { formatRollResolution, resolveRoll, rollDice } from "../combat/dice";

describe("rollDice", () => {
  it("con una fuente de aleatoriedad fija, produce siempre la misma cara", () => {
    const roll = rollDice(3, 6, () => 0.5);
    // floor(0.5 * 6) + 1 = 4
    expect(roll.results).toEqual([4, 4, 4]);
    expect(roll.total).toBe(12);
  });

  it("por defecto usa Math.random y devuelve valores dentro de rango", () => {
    const roll = rollDice(5, 20);
    expect(roll.results).toHaveLength(5);
    for (const result of roll.results) {
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(20);
    }
  });
});

describe("resolveRoll / formatRollResolution (sección 13)", () => {
  it("registra la tirada exactamente como en el ejemplo: 1d20 + 5 = 17", () => {
    const roll = rollDice(1, 20, () => 11 / 20); // cara 12
    const resolution = resolveRoll(roll, [{ source: "bono de ataque", amount: 5 }]);
    expect(resolution.total).toBe(17);
    expect(formatRollResolution(resolution)).toBe("1d20 + 5 = 17");
  });

  it("sin modificadores, no muestra el signo", () => {
    const roll = rollDice(1, 20, () => 11 / 20);
    const resolution = resolveRoll(roll);
    expect(formatRollResolution(resolution)).toBe("1d20 = 12");
  });

  it("con modificador negativo neto, usa el signo -", () => {
    const roll = rollDice(1, 20, () => 11 / 20);
    const resolution = resolveRoll(roll, [
      { source: "bono", amount: 2 },
      { source: "condición", amount: -5 },
    ]);
    expect(resolution.total).toBe(9);
    expect(formatRollResolution(resolution)).toBe("1d20 - 3 = 9");
  });
});
