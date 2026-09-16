import type { BattleState, CombatantState } from "@world-building/domain";
import type { Id } from "@world-building/shared";

/**
 * El combate no conoce cómo se dibuja (sección 10): estas interfaces son el
 * único punto de contacto entre el estado de dominio y una implementación
 * concreta (2D con canvas/SVG, 3D con WebGL/WebGPU).
 */
export type RenderMode = "token2d" | "portrait" | "miniature" | "model3d";

export interface CombatantRenderData {
  combatant: CombatantState;
  mode: RenderMode;
}

export type RenderModeResolver = (combatantId: Id) => RenderMode;

export function toRenderData(
  state: BattleState,
  resolveMode: RenderModeResolver,
): CombatantRenderData[] {
  return state.participants.map((combatant) => ({
    combatant,
    mode: resolveMode(combatant.id),
  }));
}

/** Puerto que implementa cada backend de renderizado concreto. */
export interface BattleRenderer {
  render(data: CombatantRenderData[], state: BattleState): void;
}
