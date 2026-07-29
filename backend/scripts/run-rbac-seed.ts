import { RoleModel } from '../src/modules/rbac/entity/role.entity.js';
import { DepartmentModel } from '../src/modules/rbac/entity/department.entity.js';
import { PermissionModel } from '../src/modules/rbac/entity/permission.entity.js';
import { RolePermissionModel } from '../src/modules/rbac/entity/role-permission.entity.js';
import { SYSTEM_ROLES, SYSTEM_DEPARTMENTS } from '../src/modules/rbac/repository/system-seed.js';
import { REGISTER_SCOPE_IDS } from '../src/kernel/types/rbac.js';
import { UserModel } from '../src/modules/user/entity/user.entity.js';
import { getLogger } from '../src/config/logger.js';

const GOV_READ_SCOPES = ['register', 'inquiry', 'announcement', 'event', 'dashboard', 'audit-log', 'activity-log', 'master-data', 'tenant'];

export async function runRbacSeed(): Promise<void> {
  const logger = getLogger();
  logger.info('seeding RBAC bootstrap data');

  for (const role of SYSTEM_ROLES) {
    await RoleModel.findOneAndUpdate({ roleId: role.roleId }, { $set: role }, { upsert: true, new: true });
  }

  for (const dept of SYSTEM_DEPARTMENTS) {
    await DepartmentModel.findOneAndUpdate({ code: dept.code }, { $set: dept }, { upsert: true, new: true });
  }

  const permissions: { scope: string; action: string; resource: string }[] = [];
  for (const r of REGISTER_SCOPE_IDS) {
    permissions.push({ scope: 'register', action: 'read', resource: r });
    permissions.push({ scope: 'register', action: 'write', resource: r });
  }
  for (const scope of ['inquiry', 'announcement', 'event', 'user', 'settings', 'document', 'master-data', 'dashboard', 'audit-log', 'activity-log', 'notification']) {
    permissions.push({ scope, action: 'read', resource: '*' });
    permissions.push({ scope, action: 'write', resource: '*' });
  }

  const permissionIds = new Map<string, string>();
  for (const p of permissions) {
    const doc = await PermissionModel.findOneAndUpdate(
      { scope: p.scope, action: p.action, resource: p.resource },
      { $set: p },
      { upsert: true, new: true },
    );
    permissionIds.set(`${p.scope}:${p.action}:${p.resource}`, doc._id.toString());
  }

  async function grantRole(roleId: string, keys: string[]): Promise<void> {
    for (const key of keys) {
      const permissionId = permissionIds.get(key);
      if (!permissionId) continue;
      const [scope, action, resource] = key.split(':');
      await RolePermissionModel.findOneAndUpdate(
        { roleId, permissionId },
        { $set: { roleId, permissionId, scope, action, resource } },
        { upsert: true },
      );
    }
  }

  const govKeys = [...GOV_READ_SCOPES.map((s) => `${s}:read:*`), 'notification:write:*'];
  for (const govRole of ['gov-super-admin', 'state-commissioner', 'regional-officer', 'district-officer', 'taluka-officer']) {
    await grantRole(govRole, govKeys);
  }

  await grantRole('institution-head', [
    ...REGISTER_SCOPE_IDS.map((r) => `register:read:${r}`),
    'announcement:read:*', 'announcement:write:*',
    'event:read:*', 'event:write:*',
    'user:read:*', 'user:write:*',
    'settings:read:*', 'settings:write:*',
    'audit-log:read:*', 'activity-log:read:*',
    'document:read:*', 'document:write:*',
    'dashboard:read:*',
    'notification:write:*',
  ]);

  await grantRole('assistant-manager', [
    ...REGISTER_SCOPE_IDS.flatMap((r) => [`register:read:${r}`, `register:write:${r}`]),
    'inquiry:read:*', 'inquiry:write:*',
    'announcement:read:*', 'announcement:write:*',
    'event:read:*', 'event:write:*',
    'user:read:*',
    'settings:read:*',
    'audit-log:read:*', 'activity-log:read:*',
    'document:read:*', 'document:write:*',
    'dashboard:read:*',
    'notification:write:*',
  ]);

  await grantRole('department-user', [
    ...REGISTER_SCOPE_IDS.map((r) => `register:read:${r}`),
    'inquiry:read:*', 'inquiry:write:*',
    'announcement:read:*', 'event:read:*',
    'dashboard:read:*',
  ]);

  await grantRole('family', ['inquiry:write:*', 'announcement:read:*', 'event:read:*']);
  await grantRole('donor', ['inquiry:write:*', 'announcement:read:*', 'event:read:*']);
  await grantRole('citizen', ['inquiry:write:*']);
  await grantRole('volunteer', ['inquiry:write:*', 'announcement:read:*', 'event:read:*']);

  const govAdminUid = process.env.GOV_ADMIN_FIREBASE_UID;
  const govAdminEmail = process.env.GOV_ADMIN_EMAIL;
  if (govAdminUid && govAdminEmail) {
    await UserModel.findOneAndUpdate(
      { firebaseUid: govAdminUid },
      {
        $set: {
          firebaseUid: govAdminUid,
          email: govAdminEmail,
          roleId: 'gov-super-admin',
          tenantId: null,
          grantedPermissions: govKeys,
          isActive: true,
        },
      },
      { upsert: true },
    );
    logger.info({ govAdminEmail }, 'gov super admin provisioned');
  }

  logger.info('seed complete');
}
