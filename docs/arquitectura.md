# Plataforma de Rol — Bases Arquitectónicas

## 1. Objetivo

Construir una plataforma privada de mesa virtual orientada a un DM, inspirada en herramientas como Roll20, pero diseñada alrededor de tres capacidades principales:

1. Gestión completa de personajes.
2. Motor de combate táctico por turnos con cuadrícula y representación 2D/3D.
3. Planificación narrativa mediante un árbol cronológico de eventos y escenas.

La arquitectura debe permitir que estas capacidades evolucionen sin quedar acopladas entre sí.

## 2. Principios arquitectónicos

### 2.1 Domain-first

El dominio debe ser independiente de React, el motor 3D, la base de datos y cualquier proveedor externo.

Las reglas de personajes y combate no deben vivir dentro de componentes visuales.

### 2.2 Separación de responsabilidades

Separar como mínimo:

- UI / presentación.
- Aplicación / casos de uso.
- Dominio / reglas.
- Persistencia.
- Infraestructura.
- Renderizado 2D/3D.

### 2.3 Motor determinista

El motor de reglas debe recibir un estado y una acción y producir un resultado.

Conceptualmente:

`GameState + Action -> Result + NewGameState`

Esto permitirá reproducir combates, testear reglas y eventualmente implementar replay/undo.

### 2.4 Datos declarativos

Clases, habilidades, dotes, hechizos, objetos, condiciones, acciones y reglas deberían modelarse como datos cuando sea razonable, en lugar de estar codificados exclusivamente como casos especiales.

Esto facilita crear contenido propio.

## 3. Arquitectura recomendada

Para una primera versión se recomienda un **monolito modular**, no microservicios.

Módulos:

```text
apps/
  web/
  game-engine/

packages/
  domain/
  character/
  combat/
  campaign/
  scenes/
  content/
  persistence/
  shared/
  renderer/
```

La separación lógica debe existir desde el comienzo aunque físicamente todo pueda desplegarse como una sola aplicación.

## 4. Capas

### Domain

Entidades y reglas puras:

- Character
- Campaign
- Battle
- Combatant
- Ability
- Spell
- Feat
- Item
- Equipment
- Condition
- Effect
- TimelineEvent
- Scene

No debe importar React ni acceder directamente a PostgreSQL.

### Application

Casos de uso:

- CreateCharacter
- UpdateCharacter
- EquipItem
- CreateBattle
- StartBattle
- ExecuteAction
- EndTurn
- CreateTimelineEvent
- TriggerTimelineEvent
- AttachScene

### Infrastructure

Implementaciones concretas:

- PostgreSQL
- almacenamiento de imágenes
- almacenamiento de modelos 3D
- autenticación
- exportaciones/importaciones

### Presentation

Interfaces:

- Character Sheet
- Character Builder
- Battle Board
- Action Panel
- Timeline Editor
- Scene Viewer
- DM Dashboard

## 5. Modelo de datos conceptual

Entidades principales:

```text
User
Campaign
CampaignMember

Character
CharacterClass
CharacterAbility
CharacterSpell
CharacterFeat
CharacterTrait
CharacterItem
CharacterRelationship
CharacterFaction

Battle
BattleParticipant
BattleMap
BattleToken
Turn
Action
Effect
Condition

Timeline
TimelineEvent
EventCondition
EventOutcome
Scene
SceneAsset
```

Una campaña debe ser el límite natural de aislamiento de datos.

## 6. Estado de combate

El combate debe poseer un estado serializable.

Ejemplo conceptual:

```ts
BattleState {
  round: number
  activeParticipantId: string
  participants: CombatantState[]
  map: MapState
  conditions: ConditionState[]
  log: CombatLogEntry[]
}
```

No almacenar únicamente el resultado final. El estado debe permitir reconstruir qué ocurrió.

## 7. Acciones

Una acción debe ser una entidad estructurada:

```ts
Action {
  id
  actorId
  type
  targetIds
  origin
  destination
  parameters
}
```

El motor valida:

- recursos disponibles;
- distancia;
- línea de visión;
- requisitos;
- equipamiento;
- condiciones;
- turno;
- acciones restantes.

Luego genera:

- tiradas;
- efectos;
- daño;
- cambios de estado;
- consumo de recursos;
- log.

## 8. Event sourcing ligero

No es necesario implementar Event Sourcing completo inicialmente, pero el combate debe conservar un log de eventos suficientemente rico para:

- auditoría;
- replay;
- debugging;
- undo;
- reconstrucción del estado.

Ejemplo:

```text
TurnStarted
MovementPerformed
AttackDeclared
AttackResolved
DamageApplied
ConditionApplied
SpellCast
TurnEnded
```

## 9. Assets

Los assets deben abstraerse mediante un `Asset` común:

```text
Asset
 ├── portrait
 ├── image
 ├── model3d
 ├── map
 └── audio (futuro)
```

Un personaje no debe depender directamente de un archivo concreto. Debe referenciar assets mediante IDs.

## 10. 2D y 3D

La lógica de combate no debe conocer cómo se dibuja un personaje.

El mismo `Combatant` puede representarse mediante:

- token 2D;
- retrato;
- miniatura;
- modelo 3D.

El renderer recibe el estado y decide cómo visualizarlo.

## 11. Persistencia

PostgreSQL es una buena base para:

- campañas;
- personajes;
- reglas;
- relaciones;
- eventos;
- estados de combate.

Los archivos pesados no deberían almacenarse directamente en PostgreSQL. Usar object storage para:

- imágenes;
- modelos;
- mapas;
- archivos exportados.

## 12. Tecnología sugerida

Una implementación web moderna podría utilizar:

- TypeScript.
- React / Next.js para interfaz.
- PostgreSQL.
- ORM tipado.
- Object storage compatible con S3.
- WebSockets para sincronización futura.
- Un renderer 3D basado en WebGL/WebGPU, aislado del dominio.

La elección concreta de librerías debe quedar detrás de interfaces donde sea posible.

## 13. Testing

Prioridad:

### Unit tests

Reglas de:

- atributos;
- modificadores;
- acciones;
- alcance;
- daño;
- condiciones;
- recursos;
- iniciativa.

### Integration tests

- persistencia;
- creación de campañas;
- creación de personajes;
- creación de batallas.

### Scenario tests

Ejecutar combates completos reproducibles.

## 14. Requisitos no funcionales

- Guardado automático.
- Versionado razonable de datos.
- Validación server-side.
- IDs estables.
- Import/export de campañas.
- Backups.
- Logs.
- Manejo explícito de errores.
- Compatibilidad futura con multijugador aunque la primera versión sea para uso personal.

## 15. Regla fundamental

La interfaz debe poder cambiar completamente sin tener que reescribir las reglas del juego.

El motor de dominio debe poder ejecutarse sin navegador.
