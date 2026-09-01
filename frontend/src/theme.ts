// BiteGo design tokens — from design_guidelines.json (Warm Sand & Cinnamon).
export const C = {
  surface: "#FDFBF7",
  onSurface: "#1C1917",
  surfaceSecondary: "#FFFFFF",
  onSurfaceSecondary: "#1C1917",
  surfaceTertiary: "#F2EFE9",
  onSurfaceTertiary: "#44403C",
  surfaceInverse: "#1C1917",
  onSurfaceInverse: "#FDFBF7",
  brand: "#C25934",
  brandPrimary: "#C25934",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#E07B59",
  brandTertiary: "#F5E8E4",
  onBrandTertiary: "#A14221",
  success: "#3C7C49",
  onSuccess: "#FFFFFF",
  warning: "#C78D24",
  onWarning: "#FFFFFF",
  error: "#B0413E",
  onError: "#FFFFFF",
  info: "#4A6E82",
  onInfo: "#FFFFFF",
  border: "#E5E1D8",
  borderStrong: "#D4CFC4",
  divider: "#E5E1D8",
  muted: "#78716C",
};

export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, "2xl": 32, "3xl": 48 };
export const R = { sm: 6, md: 12, lg: 20, pill: 999 };

export const F = {
  regular: "PlusJakartaSans-Regular",
  medium: "PlusJakartaSans-Medium",
  semibold: "PlusJakartaSans-SemiBold",
};

// Font scale
export const T = { sm: 12, base: 14, lg: 16, xl: 20, "2xl": 24, "3xl": 30 };

export const shadow = {
  shadowColor: "#1C1917",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08,
  shadowRadius: 12,
  elevation: 3,
};

export const ORDER_STATUS_LABELS: Record<string, string> = {
  PLACED: "Order Placed",
  ACCEPTED: "Restaurant Accepted",
  PREPARING: "Preparing",
  READY: "Food Ready",
  ASSIGNED: "Delivery Partner Assigned",
  PICKED_UP: "Picked Up",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REJECTED: "Rejected",
};

export const TRACK_STEPS = [
  "PLACED", "ACCEPTED", "PREPARING", "READY",
  "ASSIGNED", "PICKED_UP", "OUT_FOR_DELIVERY", "DELIVERED",
];
