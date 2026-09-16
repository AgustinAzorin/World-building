import type { Id } from "@world-building/shared";

/**
 * Registro declarativo genérico (sección 2.4): clases, hechizos, dotes,
 * objetos y condiciones se cargan como datos en lugar de codificarse
 * como casos especiales.
 */
export interface ContentRegistry<T extends { id: Id }> {
  register(item: T): void;
  registerAll(items: T[]): void;
  get(id: Id): T | undefined;
  list(): T[];
}

export function createContentRegistry<T extends { id: Id }>(): ContentRegistry<T> {
  const items = new Map<Id, T>();

  return {
    register(item) {
      items.set(item.id, item);
    },
    registerAll(newItems) {
      for (const item of newItems) {
        items.set(item.id, item);
      }
    },
    get(id) {
      return items.get(id);
    },
    list() {
      return Array.from(items.values());
    },
  };
}
