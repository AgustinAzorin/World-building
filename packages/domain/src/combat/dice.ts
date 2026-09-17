/**
 * Sección 13: separar `DiceRoll`, `Modifier` y `Resolution` para poder
 * mostrar al jugador exactamente cómo se produjo un resultado, p.ej.
 * "1d20 + 5 = 17".
 */

/** Fuente de aleatoriedad en [0, 1); inyectable para hacer las tiradas deterministas en tests. */
export type RandomSource = () => number;

export interface DiceRoll {
  count: number;
  sides: number;
  results: number[];
  total: number;
}

export function rollDice(count: number, sides: number, random: RandomSource = Math.random): DiceRoll {
  const results = Array.from({ length: count }, () => Math.floor(random() * sides) + 1);
  return { count, sides, results, total: results.reduce((sum, value) => sum + value, 0) };
}

export interface RollModifier {
  source: string;
  amount: number;
}

export interface RollResolution {
  roll: DiceRoll;
  modifiers: RollModifier[];
  total: number;
}

export function resolveRoll(roll: DiceRoll, modifiers: RollModifier[] = []): RollResolution {
  const modifierTotal = modifiers.reduce((sum, modifier) => sum + modifier.amount, 0);
  return { roll, modifiers, total: roll.total + modifierTotal };
}

/** Ejemplo (sección 13): "1d20 + 5 = 17". */
export function formatRollResolution(resolution: RollResolution): string {
  const modifierTotal = resolution.modifiers.reduce((sum, modifier) => sum + modifier.amount, 0);
  const expression = `${resolution.roll.count}d${resolution.roll.sides}`;
  if (modifierTotal === 0) {
    return `${expression} = ${resolution.total}`;
  }
  const sign = modifierTotal >= 0 ? "+" : "-";
  return `${expression} ${sign} ${Math.abs(modifierTotal)} = ${resolution.total}`;
}
