import type { Campaign, CampaignMember } from "@world-building/domain";
import type { CampaignMemberRepository } from "@world-building/campaign";
import type { Id } from "@world-building/shared";
import { InMemoryStore } from "./in-memory-store";

export class InMemoryCampaignRepository extends InMemoryStore<Campaign> {}

export class InMemoryCampaignMemberRepository implements CampaignMemberRepository {
  private readonly members = new Map<Id, CampaignMember>();

  async listByCampaignId(campaignId: Id): Promise<CampaignMember[]> {
    return Array.from(this.members.values()).filter(
      (member) => member.campaignId === campaignId,
    );
  }

  async save(member: CampaignMember): Promise<void> {
    this.members.set(member.id, member);
  }
}
