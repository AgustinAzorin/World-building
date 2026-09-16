import type { Campaign, CampaignMember } from "@world-building/domain";
import type { Id } from "@world-building/shared";

export interface CampaignRepository {
  findById(id: Id): Promise<Campaign | null>;
  save(campaign: Campaign): Promise<void>;
}

export interface CampaignMemberRepository {
  listByCampaignId(campaignId: Id): Promise<CampaignMember[]>;
  save(member: CampaignMember): Promise<void>;
}
