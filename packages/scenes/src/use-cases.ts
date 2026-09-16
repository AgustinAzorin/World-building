import type { TimelineEvent } from "@world-building/domain";
import { DomainError, createId, err, ok, type Id, type Result } from "@world-building/shared";
import type { SceneRepository, TimelineEventRepository } from "./ports";

export interface CreateTimelineEventInput {
  timelineId: Id;
  name: string;
  description: string;
  order: number;
  parentEventId: Id | null;
}

export async function createTimelineEvent(
  repo: TimelineEventRepository,
  input: CreateTimelineEventInput,
): Promise<Result<TimelineEvent>> {
  const event: TimelineEvent = {
    id: createId(),
    timelineId: input.timelineId,
    name: input.name,
    description: input.description,
    status: "pending",
    order: input.order,
    parentEventId: input.parentEventId,
    sceneId: null,
  };
  await repo.save(event);
  return ok(event);
}

export async function triggerTimelineEvent(
  repo: TimelineEventRepository,
  eventId: Id,
): Promise<Result<TimelineEvent>> {
  const existing = await repo.findById(eventId);
  if (!existing) {
    return err(new DomainError("TIMELINE_EVENT_NOT_FOUND", `TimelineEvent ${eventId} not found`));
  }
  const updated: TimelineEvent = { ...existing, status: "triggered" };
  await repo.save(updated);
  return ok(updated);
}

export interface AttachSceneInput {
  eventId: Id;
  sceneId: Id;
}

export async function attachScene(
  eventRepo: TimelineEventRepository,
  sceneRepo: SceneRepository,
  input: AttachSceneInput,
): Promise<Result<TimelineEvent>> {
  const event = await eventRepo.findById(input.eventId);
  if (!event) {
    return err(
      new DomainError("TIMELINE_EVENT_NOT_FOUND", `TimelineEvent ${input.eventId} not found`),
    );
  }
  const scene = await sceneRepo.findById(input.sceneId);
  if (!scene) {
    return err(new DomainError("SCENE_NOT_FOUND", `Scene ${input.sceneId} not found`));
  }
  const updated: TimelineEvent = { ...event, sceneId: scene.id };
  await eventRepo.save(updated);
  return ok(updated);
}
