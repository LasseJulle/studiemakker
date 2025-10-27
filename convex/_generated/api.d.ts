/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as ai from "../ai.js";
import type * as aiActions from "../aiActions.js";
import type * as auth from "../auth.js";
import type * as comments from "../comments.js";
import type * as files from "../files.js";
import type * as http from "../http.js";
import type * as mentor from "../mentor.js";
import type * as notes from "../notes.js";
import type * as presence from "../presence.js";
import type * as progress from "../progress.js";
import type * as reminders from "../reminders.js";
import type * as router from "../router.js";
import type * as sharing from "../sharing.js";
import type * as stats from "../stats.js";
import type * as study from "../study.js";
import type * as studyPlans from "../studyPlans.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  ai: typeof ai;
  aiActions: typeof aiActions;
  auth: typeof auth;
  comments: typeof comments;
  files: typeof files;
  http: typeof http;
  mentor: typeof mentor;
  notes: typeof notes;
  presence: typeof presence;
  progress: typeof progress;
  reminders: typeof reminders;
  router: typeof router;
  sharing: typeof sharing;
  stats: typeof stats;
  study: typeof study;
  studyPlans: typeof studyPlans;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
