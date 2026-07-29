import { RoleModel, type RoleDoc } from '../entity/role.entity.js';
import { PermissionModel, type PermissionDoc } from '../entity/permission.entity.js';
import { RolePermissionModel, type RolePermissionDoc } from '../entity/role-permission.entity.js';
import { ModulePermissionModel, type ModulePermissionDoc } from '../entity/module-permission.entity.js';
import { DepartmentModel, type DepartmentDoc } from '../entity/department.entity.js';

export interface RoleRow {
  id: string;
  roleId: string;
  tier: 'government' | 'institution' | 'external';
  label: string;
  labelMr: string;
  description: string;
  level: number;
  isActive: boolean;
  system: boolean;
  parentRoleId: string | null;
}

export interface PermissionRow {
  id: string;
  scope: string;
  action: string;
  resource: string;
  label: string;
  description: string;
}

export interface RolePermissionRow {
  roleId: string;
  scope: string;
  action: string;
  resource: string;
}

export interface ModulePermissionRow {
  id: string;
  tenantId: string | null;
  userId: string | null;
  roleId: string;
  scope: string;
  resource: string;
  action: string;
  granted: boolean;
}

function toRoleRow(doc: RoleDoc): RoleRow {
  return {
    id: doc._id.toString(),
    roleId: doc.roleId,
    tier: doc.tier,
    label: doc.label,
    labelMr: doc.labelMr,
    description: doc.description,
    level: doc.level,
    isActive: doc.isActive,
    system: doc.system,
    parentRoleId: doc.parentRoleId,
  };
}

function toPermissionRow(doc: PermissionDoc): PermissionRow {
  return {
    id: doc._id.toString(),
    scope: doc.scope,
    action: doc.action,
    resource: doc.resource,
    label: doc.label,
    description: doc.description,
  };
}

function toRolePermissionRow(doc: RolePermissionDoc): RolePermissionRow {
  return {
    roleId: doc.roleId,
    scope: doc.scope,
    action: doc.action,
    resource: doc.resource,
  };
}

function toModulePermissionRow(doc: ModulePermissionDoc): ModulePermissionRow {
  return {
    id: doc._id.toString(),
    tenantId: doc.tenantId ? doc.tenantId.toString() : null,
    userId: doc.userId ? doc.userId.toString() : null,
    roleId: doc.roleId,
    scope: doc.scope,
    resource: doc.resource,
    action: doc.action,
    granted: doc.granted,
  };
}

export interface DepartmentRow {
  id: string;
  code: string;
  label: string;
  labelMr: string;
  description: string;
  isActive: boolean;
}

function toDepartmentRow(doc: DepartmentDoc): DepartmentRow {
  return {
    id: doc._id.toString(),
    code: doc.code,
    label: doc.label,
    labelMr: doc.labelMr,
    description: doc.description,
    isActive: doc.isActive,
  };
}

export class RbacRepository {
  async listRoles(): Promise<RoleRow[]> {
    const docs = await RoleModel.find().sort({ level: 1 }).lean();
    return docs.map((d) => toRoleRow(d as RoleDoc));
  }

  async getRoleByRoleId(roleId: string): Promise<RoleRow | null> {
    const doc = await RoleModel.findOne({ roleId }).lean();
    return doc ? toRoleRow(doc as RoleDoc) : null;
  }

  async createRole(input: Omit<RoleRow, 'id'>): Promise<RoleRow> {
    const doc = await RoleModel.create(input);
    return toRoleRow(doc.toObject() as RoleDoc);
  }

  async listDepartments(): Promise<DepartmentRow[]> {
    const docs = await DepartmentModel.find().sort({ label: 1 }).lean();
    return docs.map((d) => toDepartmentRow(d as DepartmentDoc));
  }

  async createDepartment(input: Omit<DepartmentRow, 'id'>): Promise<DepartmentRow> {
    const doc = await DepartmentModel.create(input);
    return toDepartmentRow(doc.toObject() as DepartmentDoc);
  }

  async listPermissions(): Promise<PermissionRow[]> {
    const docs = await PermissionModel.find().sort({ scope: 1, action: 1, resource: 1 }).lean();
    return docs.map((d) => toPermissionRow(d as PermissionDoc));
  }

  async createPermission(input: Omit<PermissionRow, 'id'>): Promise<PermissionRow> {
    const doc = await PermissionModel.create(input);
    return toPermissionRow(doc.toObject() as PermissionDoc);
  }

  async listRolePermissions(roleId: string): Promise<RolePermissionRow[]> {
    const docs = await RolePermissionModel.find({ roleId }).lean();
    return docs.map((d) => toRolePermissionRow(d as RolePermissionDoc));
  }

  async listModulePermissions(filter: {
    tenantId?: string | null | undefined;
    userId?: string | undefined;
    roleId?: string | undefined;
  }): Promise<ModulePermissionRow[]> {
    const q: Record<string, unknown> = {};
    if (filter.tenantId !== undefined) q.tenantId = filter.tenantId;
    if (filter.userId) q.userId = filter.userId;
    if (filter.roleId) q.roleId = filter.roleId;
    const docs = await ModulePermissionModel.find(q).lean();
    return docs.map((d) => toModulePermissionRow(d as ModulePermissionDoc));
  }
}

export default RbacRepository;
