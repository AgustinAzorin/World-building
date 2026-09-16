import { randomUUID } from "node:crypto";

export type Id = string;

export function createId(): Id {
  return randomUUID();
}
