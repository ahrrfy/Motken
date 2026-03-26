import { userMethods } from "./users";
import { mosqueMethods } from "./mosques";
import { assignmentMethods } from "./assignments";
import { educationMethods } from "./education";
import { trackingMethods } from "./tracking";
import { communicationMethods } from "./communication";
import { gamificationMethods } from "./gamification";
import { managementMethods } from "./management";
import { knowledgeMethods } from "./knowledge";
import { systemMethods } from "./system";

import type { IStorage } from "./types";

export type { IStorage } from "./types";

class DatabaseStorage implements IStorage {
  // Methods are assigned via Object.assign below
}

Object.assign(
  DatabaseStorage.prototype,
  userMethods,
  mosqueMethods,
  assignmentMethods,
  educationMethods,
  trackingMethods,
  communicationMethods,
  gamificationMethods,
  managementMethods,
  knowledgeMethods,
  systemMethods,
);

export const storage = new DatabaseStorage() as IStorage;
export { DatabaseStorage };
