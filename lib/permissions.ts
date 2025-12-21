// Role-based permission system for IBF Bakery
// Implements Separation of Duties (SoD) as per PROMPT.md

export type UserRole =
  | "admin"
  | "manager_inventaris"
  | "operator_gudang"
  | "manager_produksi"
  | "operator_produksi"
  | "qc";

// Permission action types
export type Permission =
  // Items
  | "items:create"
  | "items:view"
  | "items:view_price"
  | "items:edit"
  | "items:delete"
  // Batches/Inventory
  | "batches:view"
  | "batches:receive"
  | "batches:adjust"
  | "batches:delete"
  | "batches:set_qc_status"
  // Suppliers
  | "suppliers:create"
  | "suppliers:view"
  | "suppliers:edit"
  | "suppliers:delete"
  // Recipes/BOM
  | "recipes:create"
  | "recipes:view"
  | "recipes:edit"
  | "recipes:delete"
  // Production
  | "production:plan"
  | "production:execute"
  | "production:cancel"
  | "production:input_result"
  // Material Requests
  | "material_requests:create"
  | "material_requests:approve"
  | "material_requests:execute"
  // Stock Adjustments
  | "stock_adjustments:request"
  | "stock_adjustments:approve"
  // Users
  | "users:manage";

// Permission matrix per role
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    // Admin has all permissions
    "items:create",
    "items:view",
    "items:view_price",
    "items:edit",
    "items:delete",
    "batches:view",
    "batches:receive",
    "batches:adjust",
    "batches:delete",
    "batches:set_qc_status",
    "suppliers:create",
    "suppliers:view",
    "suppliers:edit",
    "suppliers:delete",
    "recipes:create",
    "recipes:view",
    "recipes:edit",
    "recipes:delete",
    "production:plan",
    "production:execute",
    "production:cancel",
    "production:input_result",
    "material_requests:create",
    "material_requests:approve",
    "material_requests:execute",
    "stock_adjustments:request",
    "stock_adjustments:approve",
    "users:manage",
  ],

  manager_inventaris: [
    // Full warehouse/inventory control
    "items:create",
    "items:view",
    "items:view_price",
    "items:edit",
    "items:delete",
    "batches:view",
    "batches:receive",
    "batches:adjust",
    "batches:delete",
    "suppliers:create",
    "suppliers:view",
    "suppliers:edit",
    "suppliers:delete",
    "material_requests:approve",
    "stock_adjustments:approve",
  ],

  operator_gudang: [
    // Limited input: receive stock, view items (no price)
    "items:view", // No price view
    "batches:view",
    "batches:receive",
    "material_requests:execute",
    "stock_adjustments:request", // Can request, needs approval
  ],

  manager_produksi: [
    // Production planning and recipes
    "items:view",
    "items:view_price",
    "recipes:create",
    "recipes:view",
    "recipes:edit",
    "recipes:delete",
    "production:plan",
    "production:execute",
    "production:cancel",
    "material_requests:create",
  ],

  operator_produksi: [
    // Work order execution only
    "production:input_result",
    "material_requests:create",
  ],

  qc: [
    // Quality control only
    "batches:view",
    "batches:set_qc_status",
    "production:input_result", // Can input QC results
  ],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: UserRole | undefined, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Check if a role can access a specific route
 */
export function canAccessRoute(role: UserRole | undefined, route: string): boolean {
  if (!role) return false;

  const routePermissions: Record<string, Permission[]> = {
    "/": [], // Dashboard - all roles
    "/inventory": ["batches:view"],
    "/items": ["items:view"],
    "/suppliers": ["suppliers:view"],
    "/recipes": ["recipes:view"],
    "/production": ["production:plan", "production:execute", "production:input_result"],
    "/users": ["users:manage"],
  };

  const requiredPerms = routePermissions[route];
  if (!requiredPerms || requiredPerms.length === 0) return true;

  return requiredPerms.some((perm) => hasPermission(role, perm));
}

/**
 * Get display-friendly role name
 */
export function getRoleDisplayName(role: UserRole): string {
  const names: Record<UserRole, string> = {
    admin: "Administrator",
    manager_inventaris: "Manager Inventaris",
    operator_gudang: "Operator Gudang",
    manager_produksi: "Manager Produksi",
    operator_produksi: "Operator Produksi",
    qc: "Kontrol Kualitas",
  };
  return names[role] || role;
}

/**
 * Check if role is warehouse-related
 */
export function isWarehouseRole(role: UserRole | undefined): boolean {
  return role === "admin" || role === "manager_inventaris" || role === "operator_gudang";
}

/**
 * Check if role is production-related
 */
export function isProductionRole(role: UserRole | undefined): boolean {
  return (
    role === "admin" || role === "manager_produksi" || role === "operator_produksi" || role === "qc"
  );
}
