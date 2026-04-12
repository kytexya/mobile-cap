export type AppRole = 'Teacher' | 'Parent' | 'Admin';

const ROLE_MAP: Record<string, AppRole> = {
  teacher: 'Teacher',
  parent: 'Parent',
  admin: 'Admin',
};

const normalizeRoleToken = (value: unknown): AppRole | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const token = value.trim().toLowerCase();

  for (const [key, mappedRole] of Object.entries(ROLE_MAP)) {
    if (token === key || token.includes(key)) {
      return mappedRole;
    }
  }

  return null;
};

export const extractUserRole = (user: any): AppRole => {
  const candidates: unknown[] = [
    user?.role,
    user?.Role,
    user?.userRole,
    user?.roleName,
    ...(Array.isArray(user?.Roles) ? user.Roles : []),
    ...(Array.isArray(user?.roles) ? user.roles : []),
  ];

  for (const candidate of candidates) {
    const directRole = normalizeRoleToken(candidate);
    if (directRole) {
      return directRole;
    }

    if (candidate && typeof candidate === 'object') {
      const objectRole =
        normalizeRoleToken((candidate as any).name) ||
        normalizeRoleToken((candidate as any).role) ||
        normalizeRoleToken((candidate as any).roleName) ||
        normalizeRoleToken((candidate as any).authority);

      if (objectRole) {
        return objectRole;
      }
    }
  }

  const username = typeof user?.username === 'string' ? user.username.toLowerCase() : '';
  if (username.includes('teacher')) {
    return 'Teacher';
  }
  if (username.includes('parent')) {
    return 'Parent';
  }
  if (username.includes('admin')) {
    return 'Admin';
  }

  return 'Parent';
};
