import type { Id } from "@world-building/shared";

/**
 * Adaptador en memoria compartido por los repositorios simples (findById/save).
 * Sirve para tests y como implementación inicial; PostgreSQL reemplaza esto
 * más adelante detrás de los mismos puertos.
 */
export class InMemoryStore<T extends { id: Id }> {
  private readonly items = new Map<Id, T>();

  async findById(id: Id): Promise<T | null> {
    return this.items.get(id) ?? null;
  }

  async save(item: T): Promise<void> {
    this.items.set(item.id, item);
  }

  async list(): Promise<T[]> {
    return Array.from(this.items.values());
  }
}
