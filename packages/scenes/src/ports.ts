import type { Scene, TimelineEvent } from "@world-building/domain";
import type { Id } from "@world-building/shared";

export interface TimelineEventRepository {
  findById(id: Id): Promise<TimelineEvent | null>;
  save(event: TimelineEvent): Promise<void>;
}

export interface SceneRepository {
  findById(id: Id): Promise<Scene | null>;
  save(scene: Scene): Promise<void>;
}
