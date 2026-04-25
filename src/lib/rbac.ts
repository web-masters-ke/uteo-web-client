export interface ClientPageRule {
  roles?: string[];
  teamRoles?: string[];
  requireOrgOwner?: boolean;
}

// Map of pages to who can see them
export const CLIENT_PAGE_ROLES: Record<string, ClientPageRule> = {
  '/team': { roles: ['TRAINER'], teamRoles: ['OWNER', 'ADMIN'] },
  '/departments': { roles: ['TRAINER'], teamRoles: ['OWNER', 'ADMIN'] },
  '/firm-financials': { roles: ['TRAINER'], requireOrgOwner: true },
  '/earnings': { roles: ['TRAINER'] },
  '/availability': { roles: ['TRAINER'] },
  '/wallet': { roles: ['TRAINER', 'CLIENT'] },
  '/payments': { roles: ['CLIENT'] },
  '/favorites': { roles: ['CLIENT'] },
};

export function canAccessClientPage(
  user: { role?: string; teamRole?: string | null; isOrgOwner?: boolean } | null,
  path: string,
): boolean {
  if (!user) return false;

  // Find the matching rule — exact match or startsWith with trailing slash
  const key = Object.keys(CLIENT_PAGE_ROLES).find(
    (k) => path === k || path.startsWith(k + '/'),
  );

  // No rule means page is accessible to all authenticated users
  if (!key) return true;

  const rule = CLIENT_PAGE_ROLES[key];

  // Check base role
  if (rule.roles && !rule.roles.includes(user.role ?? '')) return false;

  // Check team role requirement
  if (rule.teamRoles) {
    if (!user.teamRole || !rule.teamRoles.includes(user.teamRole)) return false;
  }

  // Check org owner requirement
  if (rule.requireOrgOwner && !user.isOrgOwner) return false;

  return true;
}
