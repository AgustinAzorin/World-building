import type { Id } from "@world-building/shared";

export interface Timeline {
  id: Id;
  campaignId: Id;
  name: string;
}

export interface EventCondition {
  id: Id;
  eventId: Id;
  description: string;
  parameters: Record<string, unknown>;
}

export interface EventOutcome {
  id: Id;
  eventId: Id;
  description: string;
  parameters: Record<string, unknown>;
}

export type TimelineEventStatus = "pending" | "triggered" | "skipped";

export interface TimelineEvent {
  id: Id;
  timelineId: Id;
  name: string;
  description: string;
  status: TimelineEventStatus;
  order: number;
  parentEventId: Id | null;
  sceneId: Id | null;
}

export interface Scene {
  id: Id;
  campaignId: Id;
  name: string;
  description: string;
}

export interface SceneAsset {
  id: Id;
  sceneId: Id;
  assetId: Id;
}
