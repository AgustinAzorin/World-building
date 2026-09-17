import { describe, expect, it } from "vitest";
import type { MapState } from "../combat/battle-state";
import { hasLineOfSight, movementCostTo, reachableTiles } from "../combat/movement";
import type { Tile } from "../entities/combat";

function tile(overrides: Partial<Tile> & Pick<Tile, "x" | "y">): Tile {
  return { terrain: "normal", walkable: true, movementCost: 1, occupied: null, ...overrides };
}

function mapWithTiles(tiles: Tile[], width = 5, height = 5): MapState {
  const record: Record<string, Tile> = {};
  for (const t of tiles) {
    record[`${t.x},${t.y}`] = t;
  }
  return { mapId: "map-1", width, height, tiles: record };
}

describe("reachableTiles (sección 9)", () => {
  it("una casilla vacía cuesta 1 y las adyacentes (incluidas diagonales) entran en el presupuesto", () => {
    const map = mapWithTiles([]);
    const reachable = reachableTiles(map, { x: 2, y: 2 }, 1);
    const keys = reachable.map((entry) => `${entry.cell.x},${entry.cell.y}`).sort();
    expect(keys).toEqual(["1,1", "1,2", "1,3", "2,1", "2,3", "3,1", "3,2", "3,3"].sort());
    expect(reachable.every((entry) => entry.cost === 1)).toBe(true);
  });

  it("una casilla no transitable (obstáculo) bloquea el paso", () => {
    const map = mapWithTiles([tile({ x: 3, y: 2, walkable: false })]);
    const reachable = reachableTiles(map, { x: 2, y: 2 }, 1);
    expect(reachable.find((entry) => entry.cell.x === 3 && entry.cell.y === 2)).toBeUndefined();
  });

  it("una casilla ocupada por otro combatant no es alcanzable", () => {
    const map = mapWithTiles([tile({ x: 3, y: 2, occupied: "other-combatant" })]);
    const reachable = reachableTiles(map, { x: 2, y: 2 }, 1);
    expect(reachable.find((entry) => entry.cell.x === 3 && entry.cell.y === 2)).toBeUndefined();
  });

  it("ignora la ocupación del propio actor en su casilla de origen", () => {
    const map = mapWithTiles([tile({ x: 2, y: 2, occupied: "self" })]);
    const reachable = reachableTiles(map, { x: 2, y: 2 }, 1, "self");
    expect(reachable.length).toBeGreaterThan(0);
  });

  it("el terreno difícil incrementa el coste y limita cuánto se puede avanzar", () => {
    const map = mapWithTiles([tile({ x: 3, y: 2, movementCost: 3 })]);
    expect(movementCostTo(map, { x: 2, y: 2 }, { x: 3, y: 2 }, 2)).toBeNull();
    expect(movementCostTo(map, { x: 2, y: 2 }, { x: 3, y: 2 }, 3)).toBe(3);
  });

  it("no devuelve casillas fuera del mapa", () => {
    const map = mapWithTiles([], 2, 2);
    const reachable = reachableTiles(map, { x: 0, y: 0 }, 5);
    expect(reachable.every((entry) => entry.cell.x < 2 && entry.cell.y < 2)).toBe(true);
  });
});

describe("hasLineOfSight (sección 8)", () => {
  it("dos casillas sin obstáculos entre medio tienen línea de visión", () => {
    const map = mapWithTiles([]);
    expect(hasLineOfSight(map, { x: 0, y: 0 }, { x: 4, y: 4 })).toBe(true);
  });

  it("un muro entre origen y destino bloquea la visión", () => {
    const map = mapWithTiles([tile({ x: 2, y: 2, walkable: false })]);
    expect(hasLineOfSight(map, { x: 0, y: 0 }, { x: 4, y: 4 })).toBe(false);
  });
});
