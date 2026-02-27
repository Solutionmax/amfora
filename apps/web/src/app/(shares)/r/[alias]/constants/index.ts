export const HTTP_STATUS = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  GONE: 410,
} as const;

export const ERROR_MESSAGES = {
  PASSWORD_REQUIRED: "Password required",
  INVALID_PASSWORD: "Invalid password",
} as const;

export type ErrorType = "inactive" | "notFound" | "expired" | "generic" | null;

export const STATUS_VARIANTS = {
  success: {
    iconBg: "bg-green-100 dark:bg-green-900/20",
    iconColor: "text-green-600 dark:text-green-400",
    titleColor: "text-green-800 dark:text-green-200",
    descriptionColor: "text-green-600 dark:text-green-300",
  },
  warning: {
    iconBg: "bg-amber-100 dark:bg-amber-900/20",
    iconColor: "text-amber-600 dark:text-amber-400",
    titleColor: "text-foreground",
    descriptionColor: "text-muted-foreground",
  },
  error: {
    iconBg: "bg-red-100 dark:bg-red-900/20",
    iconColor: "text-red-600 dark:text-red-400",
    titleColor: "text-foreground",
    descriptionColor: "text-muted-foreground",
  },
  info: {
    iconBg: "bg-orange-100 dark:bg-orange-900/20",
    iconColor: "text-orange-600 dark:text-orange-400",
    titleColor: "text-foreground",
    descriptionColor: "text-muted-foreground",
  },
  neutral: {
    iconBg: "bg-gray-100 dark:bg-gray-900/20",
    iconColor: "text-gray-600 dark:text-gray-400",
    titleColor: "text-foreground",
    descriptionColor: "text-muted-foreground",
  },
};

export const UPLOAD_PROGRESS = {
  INITIAL: 0,
  COMPLETE: 100,
} as const;

export const FILE_STATUS = {
  PENDING: "pending",
  UPLOADING: "uploading",
  SUCCESS: "success",
  ERROR: "error",
} as const;

export const UPLOAD_CONFIG = {
  TEXTAREA_ROWS: 3,
} as const;

export const MESSAGE_TYPES = {
  SUCCESS: "SUCCESS",
  MAX_FILES: "MAX_FILES",
  INACTIVE: "INACTIVE",
  NOT_FOUND: "NOT_FOUND",
  EXPIRED: "EXPIRED",
} as const;

export const BACKGROUND_IMAGES = [
  "/assets/wetransfer-bgs/1.jpg",
  "/assets/wetransfer-bgs/2.jpg",
  "/assets/wetransfer-bgs/3.jpg",
  "/assets/wetransfer-bgs/4.jpg",
  "/assets/wetransfer-bgs/5.jpg",
  "/assets/wetransfer-bgs/6.jpg",
  "/assets/wetransfer-bgs/7.jpg",
  "/assets/wetransfer-bgs/8.jpg",
] as const;
