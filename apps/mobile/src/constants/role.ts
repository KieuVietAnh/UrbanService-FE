export const USER_ROLES = {
  RESIDENT: 'service-user',
  STAFF: 'system-staff',
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];