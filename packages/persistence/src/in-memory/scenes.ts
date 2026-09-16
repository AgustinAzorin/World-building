import type { Scene, TimelineEvent } from "@world-building/domain";
import { InMemoryStore } from "./in-memory-store";

export class InMemoryTimelineEventRepository extends InMemoryStore<TimelineEvent> {}
export class InMemorySceneRepository extends InMemoryStore<Scene> {}
