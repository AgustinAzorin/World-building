import type { Id } from "@world-building/shared";
import type { ActionTemplate } from "../character/action-template";
import type { ModifierTemplate } from "../character/modifiers";

/**
 * Definiciones de contenido: se modelan como datos (sección 2.4) para que
 * puedan crearse, importarse o modificarse sin tocar código.
 */

export interface AttributeDefinition {
  id: Id;
  key: string;
  name: string;
  abbreviation: string;
}

export interface SkillDefinition {
  id: Id;
  key: string;
  name: string;
  attributeKey: string;
  domain: string;
}

/**
 * Unifica habilidad, rasgo, dote, característica de clase, característica de
 * especie y habilidad especial (sección 7): todas comparten la misma forma
 * (nombre, descripción, requisitos, nivel requerido, efectos, acciones
 * generadas, recursos consumidos) y solo cambian por su `kind`.
 */
export type FeatureKind =
  | "ability"
  | "trait"
  | "feat"
  | "classFeature"
  | "speciesFeature"
  | "specialAbility";

export interface FeatureDefinition {
  id: Id;
  kind: FeatureKind;
  name: string;
  description: string;
  requirements: string[];
  requiredLevel: number | null;
  modifiers: ModifierTemplate[];
  grantedActions: ActionTemplate[];
  resourceCost: { resourceName: string; amount: number } | null;
}

export type SpellComponent = "verbal" | "somatic" | "material";

export interface SpellDamage {
  diceExpression: string;
  damageType: string;
}

export interface SpellSavingThrow {
  attributeKey: string;
  effectOnSuccess: "half" | "none" | "negate";
}

export interface Spell {
  id: Id;
  name: string;
  level: number;
  school: string;
  castingTime: string;
  range: string;
  duration: string;
  components: SpellComponent[];
  target: string;
  description: string;
  damage: SpellDamage | null;
  savingThrow: SpellSavingThrow | null;
  concentration: boolean;
  resourceCost: { resourceName: string; amount: number } | null;
  /** El hechizo "debe poder generar acciones utilizables en combate" (sección 8). */
  grantedAction: ActionTemplate;
}

export type ItemKind =
  | "weapon"
  | "armor"
  | "shield"
  | "accessory"
  | "tool"
  | "consumable"
  | "magic"
  | "custom";

export interface Item {
  id: Id;
  kind: ItemKind;
  name: string;
  description: string;
  weight: number;
  value: number;
  /** "Cada objeto puede modificar estadísticas o generar acciones" (sección 9). */
  modifiers: ModifierTemplate[];
  grantedActions: ActionTemplate[];
}

export type EquipmentSlot =
  | "head"
  | "chest"
  | "hands"
  | "feet"
  | "mainHand"
  | "offHand"
  | "accessory";

export interface Equipment extends Item {
  slot: EquipmentSlot;
}
