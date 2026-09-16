import { describe, expect, it } from "vitest";
import { abilityModifier, proficiencyBonus } from "../combat/modifiers";

describe("abilityModifier", () => {
  it.each([
    [1, -5],
    [8, -1],
    [9, -1],
    [10, 0],
    [11, 0],
    [12, 1],
    [20, 5],
  ])("score %i -> modifier %i", (score, expected) => {
    expect(abilityModifier(score)).toBe(expected);
  });
});

describe("proficiencyBonus", () => {
  it.each([
    [1, 2],
    [4, 2],
    [5, 3],
    [8, 3],
    [9, 4],
    [17, 6],
  ])("level %i -> bonus %i", (level, expected) => {
    expect(proficiencyBonus(level)).toBe(expected);
  });
});
