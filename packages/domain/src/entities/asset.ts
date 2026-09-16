import type { Id } from "@world-building/shared";

export type AssetKind = "portrait" | "image" | "model3d" | "map" | "audio";

export interface Asset {
  id: Id;
  kind: AssetKind;
  url: string;
  name: string;
}
