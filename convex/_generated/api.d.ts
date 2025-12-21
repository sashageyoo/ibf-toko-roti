/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as batches from "../batches.js";
import type * as boms from "../boms.js";
import type * as finishedProducts from "../finishedProducts.js";
import type * as production from "../production.js";
import type * as rawMaterials from "../rawMaterials.js";
import type * as seed from "../seed.js";
import type * as suppliers from "../suppliers.js";
import type * as transactionLogs from "../transactionLogs.js";
import type * as users from "../users.js";
import type * as wasteRecords from "../wasteRecords.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  batches: typeof batches;
  boms: typeof boms;
  finishedProducts: typeof finishedProducts;
  production: typeof production;
  rawMaterials: typeof rawMaterials;
  seed: typeof seed;
  suppliers: typeof suppliers;
  transactionLogs: typeof transactionLogs;
  users: typeof users;
  wasteRecords: typeof wasteRecords;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
