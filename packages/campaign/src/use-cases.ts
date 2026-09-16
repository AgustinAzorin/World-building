import type { Campaign, CampaignMember, CampaignRole } from "@world-building/domain";
import { DomainError, createId, err, ok, type Id, type Result } from "@world-building/shared";
import type { CampaignMemberRepository, CampaignRepository } from "./ports";

export interface CreateCampaignInput {
  name: string;
  description: string;
  ownerId: Id;
}

export async function createCampaign(
  repo: CampaignRepository,
  input: CreateCampaignInput,
): Promise<Result<Campaign>> {
  const campaign: Campaign = {
    id: createId(),
    name: input.name,
    description: input.description,
    ownerId: input.ownerId,
    createdAt: new Date().toISOString(),
  };
  await repo.save(campaign);
  return ok(campaign);
}

export interface AddCampaignMemberInput {
  campaignId: Id;
  userId: Id;
  role: CampaignRole;
}

export async function addCampaignMember(
  campaignRepo: CampaignRepository,
  memberRepo: CampaignMemberRepository,
  input: AddCampaignMemberInput,
): Promise<Result<CampaignMember>> {
  const campaign = await campaignRepo.findById(input.campaignId);
  if (!campaign) {
    return err(new DomainError("CAMPAIGN_NOT_FOUND", `Campaign ${input.campaignId} not found`));
  }
  const member: CampaignMember = {
    id: createId(),
    campaignId: input.campaignId,
    userId: input.userId,
    role: input.role,
  };
  await memberRepo.save(member);
  return ok(member);
}
