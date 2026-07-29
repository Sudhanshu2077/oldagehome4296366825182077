import type {
  DepartmentRow,
  ModulePermissionRow,
  PermissionRow,
  RolePermissionRow,
  RoleRow,
} from '../repository/rbac.repository.js';
import RbacRepository from '../repository/rbac.repository.js';

export class RbacService {
  constructor(private readonly repo: RbacRepository = new RbacRepository()) {}

  async listRoles(): Promise<RoleRow[]> {
    return this.repo.listRoles();
  }

  async getRole(roleId: string): Promise<RoleRow | null> {
    return this.repo.getRoleByRoleId(roleId);
  }

  async listDepartments(): Promise<DepartmentRow[]> {
    return this.repo.listDepartments();
  }

  async listPermissions(): Promise<PermissionRow[]> {
    return this.repo.listPermissions();
  }

  async listRolePermissions(roleId: string): Promise<RolePermissionRow[]> {
    return this.repo.listRolePermissions(roleId);
  }

  async listModulePermissions(filter: {
    tenantId?: string | null | undefined;
    userId?: string | undefined;
    roleId?: string | undefined;
  }): Promise<ModulePermissionRow[]> {
    return this.repo.listModulePermissions(filter);
  }
}

export default RbacService;
