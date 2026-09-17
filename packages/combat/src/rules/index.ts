import type { Rule } from "@world-building/domain";
import { attackRule } from "./attack-rule";
import { effectRule } from "./effect-rule";
import { genericActionRule } from "./generic-action-rule";
import { dashRule, moveRule } from "./move-rule";
import { validateRule } from "./validate-rule";

export * from "./attack-rule";
export * from "./effect-rule";
export * from "./generic-action-rule";
export * from "./move-rule";
export * from "./support";
export * from "./validate-rule";

/**
 * Cadena por defecto (sección 6): valida primero, luego la regla específica
 * de cada tipo de acción resuelve (cada `Rule` se ignora a sí misma si el
 * `action.type` no le corresponde).
 */
export const DEFAULT_COMBAT_RULES: Rule[] = [validateRule, moveRule, dashRule, attackRule, effectRule, genericActionRule];
