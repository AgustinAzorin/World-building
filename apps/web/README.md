# apps/web

Placeholder de la capa de presentación (sección 12 de `docs/arquitectura.md`).

Cuando arranque el trabajo de UI, esta app se monta como Next.js/React y consume
únicamente los casos de uso de `packages/character`, `packages/combat`,
`packages/campaign` y `packages/scenes` (nunca el dominio ni la persistencia
directamente). Interfaces previstas: Character Sheet, Character Builder,
Battle Board, Action Panel, Timeline Editor, Scene Viewer, DM Dashboard.
