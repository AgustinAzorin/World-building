import type { Id } from "@world-building/shared";
import type { ActionType } from "../combat/action";

/**
 * Sección 7/8/9: rasgos, hechizos y objetos "pueden generar acciones
 * utilizables en combate". Un ActionTemplate es esa acción en forma de dato,
 * todavía no ligada a un actor/objetivo concreto (eso lo hace el motor de
 * combate al crear la `Action` real a partir de esta plantilla).
 */
export type ActionRangeKind = "melee" | "ranged" | "touch" | "self";

export interface ActionRange {
  kind: ActionRangeKind;
  distance: number | null;
}

export type ActionTargetKind = "self" | "ally" | "enemy" | "any";

export interface ActionTargeting {
  minTargets: number;
  maxTargets: number;
  kinds: ActionTargetKind[];
}

export interface ActionResourceCost {
  resourceName: string;
  amount: number;
}

export type ActionTemplateSource = "base" | "weapon" | "spell" | "feature" | "item";

export interface ActionTemplate {
  key: string;
  name: string;
  type: ActionType;
  source: ActionTemplateSource;
  sourceId: Id | null;
  range: ActionRange;
  targeting: ActionTargeting;
  resourceCost: ActionResourceCost | null;
  description: string;
}

/** Acciones que cualquier personaje tiene disponibles sin equipamiento ni rasgos. */
export const BASE_ACTION_TEMPLATES: ActionTemplate[] = [
  {
    key: "dash",
    name: "Correr",
    type: "dash",
    source: "base",
    sourceId: null,
    range: { kind: "self", distance: null },
    targeting: { minTargets: 0, maxTargets: 0, kinds: [] },
    resourceCost: null,
    description: "Duplica el movimiento disponible este turno.",
  },
  {
    key: "dodge",
    name: "Esquivar",
    type: "dodge",
    source: "base",
    sourceId: null,
    range: { kind: "self", distance: null },
    targeting: { minTargets: 0, maxTargets: 0, kinds: [] },
    resourceCost: null,
    description: "Dificulta ser alcanzado hasta el próximo turno.",
  },
  {
    key: "endTurn",
    name: "Terminar turno",
    type: "endTurn",
    source: "base",
    sourceId: null,
    range: { kind: "self", distance: null },
    targeting: { minTargets: 0, maxTargets: 0, kinds: [] },
    resourceCost: null,
    description: "Cede el turno al siguiente participante.",
  },
];
