export type PermissionScope = 'register' | 'inquiry' | 'announcement' | 'event' | 'user' | 'settings' | 'document' | 'master-data' | 'dashboard' | 'audit-log' | 'activity-log' | 'notification' | 'tenant';

export type PermissionAction = 'read' | 'write' | 'approve' | 'reject' | 'export' | 'print' | 'delete';

export type PermissionResource = string;

export interface PermissionKey {
  scope: PermissionScope;
  resource: PermissionResource;
  action: PermissionAction;
}

export function permissionKeyToString(key: PermissionKey): string {
  return `${key.scope}:${key.action}:${key.resource}`;
}

export function parsePermissionKey(value: string): PermissionKey {
  const parts = value.split(':');
  if (parts.length !== 3) {
    throw new Error(`malformed permission key: ${value}`);
  }
  const [scope, action, resource] = parts as [PermissionScope, PermissionAction, PermissionResource];
  return { scope, action, resource };
}

export function isPermissionScope(value: unknown): value is PermissionScope {
  return typeof value === 'string'
    && ['register','inquiry','announcement','event','user','settings','document','master-data','dashboard','audit-log','activity-log','notification','tenant'].includes(value);
}

export function isPermissionAction(value: unknown): value is PermissionAction {
  return typeof value === 'string'
    && ['read','write','approve','reject','export','print','delete'].includes(value);
}
