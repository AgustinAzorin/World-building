import type { Id } from "@world-building/shared";

export interface User {
  id: Id;
  email: string;
  displayName: string;
}

export type CampaignRole = "dm" | "player";

export interface CampaignMember {
  id: Id;
  campaignId: Id;
  userId: Id;
  role: CampaignRole;
}

export interface Campaign {
  id: Id;
  name: string;
  description: string;
  ownerId: Id;
  createdAt: string;
}
