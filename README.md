# World-building

Plataforma privada de mesa virtual orientada a un DM: gestión de personajes, combate táctico por turnos y planificación narrativa mediante línea de tiempo de eventos y escenas.

Las bases arquitectónicas completas están en [`docs/arquitectura.md`](docs/arquitectura.md). Este monorepo implementa el esqueleto descripto ahí: un **monolito modular** con el dominio aislado de UI, base de datos y renderer.

## Estructura

```text
apps/
  web/           interfaz de presentación (futuro Next.js)
  game-engine/   punto de entrada que ejecuta el motor sin navegador

packages/
  shared/        tipos base compartidos (Id, Result, errores de dominio)
  domain/        entidades y reglas puras + contrato del motor determinista
  character/     motor de personajes: casos de uso, agregado y contrato hacia el motor de combate
  combat/        casos de uso del motor de combate
  campaign/       casos de uso de campañas
  scenes/        casos de uso de línea de tiempo y escenas
  content/       registro declarativo de contenido (clases, hechizos, dotes, objetos)
  persistence/   puertos de repositorio + adaptadores en memoria (Postgres a futuro)
  renderer/      interfaces de renderizado 2D/3D desacopladas del dominio
```

Cada paquete de `packages/` es independiente: `domain` no depende de ningún otro paquete del repo, y ningún paquete de aplicación importa desde `renderer` ni desde `persistence` salvo a través de sus interfaces (puertos).

## Desarrollo

Requiere [pnpm](https://pnpm.io).

```bash
pnpm install
pnpm build      # tsc -b en todo el monorepo (project references)
pnpm test       # vitest en todos los paquetes
```

## Principios

1. **Domain-first**: el dominio no importa React, el motor 3D, ni acceso directo a la base de datos.
2. **Motor determinista**: `GameState + Action -> Result + NewGameState`, reproducible y testeable.
3. **Datos declarativos**: clases, hechizos, dotes, objetos y condiciones se modelan como datos, no como casos especiales en código.
4. **La interfaz es reemplazable**: el motor de dominio debe poder ejecutarse sin navegador (ver `apps/game-engine`).

Ver [`docs/arquitectura.md`](docs/arquitectura.md) para el detalle completo.
