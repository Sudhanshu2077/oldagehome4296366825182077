import { UserModel, type UserDoc } from '../entity/user.entity.js';
import type { DepartmentCode, RoleId } from '../../../kernel/types/rbac.js';
import type { RegisterScopeId } from '../../../kernel/types/rbac.js';
import type { GovernmentJurisdiction } from '../../../kernel/types/session.js';
import type { ResolvedStoredUser } from '../../../kernel/types/session.js';

export interface CreateUserInput {
  firebaseUid: string;
  email: string;
  emailVerified?: boolean;
  displayName?: string;
  photoUrl?: string;
  roleId: RoleId;
  tenantId: string | null;
  departmentCode: DepartmentCode | null;
  jurisdiction: GovernmentJurisdiction | null;
  grantedPermissions?: readonly string[];
  registerWriteScopes?: readonly RegisterScopeId[];
  createdBy?: string;
}

export interface UpdateUserInput {
  roleId?: RoleId;
  tenantId?: string | null;
  departmentCode?: DepartmentCode | null;
  jurisdiction?: GovernmentJurisdiction | null;
  grantedPermissions?: readonly string[];
  registerWriteScopes?: readonly RegisterScopeId[];
  isActive?: boolean;
  updatedBy?: string;
}

export interface UserRow {
  id: string;
  firebaseUid: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
  photoUrl: string;
  roleId: RoleId;
  tenantId: string | null;
  departmentCode: DepartmentCode | null;
  jurisdiction: GovernmentJurisdiction | null;
  grantedPermissions: string[];
  registerWriteScopes: RegisterScopeId[];
  isActive: boolean;
  isLocked: boolean;
  lockedReason: string;
  lockedUntil: Date | null;
  lastLoginAt: Date | null;
  lastLoginIp: string;
  lastLoginDeviceId: string;
  createdAt: Date;
  updatedAt: Date;
}

export function toUserRow(doc: UserDoc): UserRow {
  return {
    id: doc._id.toString(),
    firebaseUid: doc.firebaseUid,
    email: doc.email,
    emailVerified: doc.emailVerified,
    displayName: doc.displayName,
    photoUrl: doc.photoUrl,
    roleId: doc.roleId as RoleId,
    tenantId: doc.tenantId ? doc.tenantId.toString() : null,
    departmentCode: doc.departmentCode as DepartmentCode | null,
    jurisdiction: doc.jurisdiction
      ? ({
          level: doc.jurisdiction.level ?? 'all',
          stateId: doc.jurisdiction.stateId ? doc.jurisdiction.stateId.toString() : null,
          regionId: doc.jurisdiction.regionId ? doc.jurisdiction.regionId.toString() : null,
          districtId: doc.jurisdiction.districtId ? doc.jurisdiction.districtId.toString() : null,
          talukaId: doc.jurisdiction.talukaId ? doc.jurisdiction.talukaId.toString() : null,
        } as GovernmentJurisdiction)
      : null,
    grantedPermissions: doc.grantedPermissions ?? [],
    registerWriteScopes: (doc.registerWriteScopes ?? []) as RegisterScopeId[],
    isActive: doc.isActive,
    isLocked: doc.isLocked,
    lockedReason: doc.lockedReason,
    lockedUntil: doc.lockedUntil,
    lastLoginAt: doc.lastLoginAt,
    lastLoginIp: doc.lastLoginIp,
    lastLoginDeviceId: doc.lastLoginDeviceId,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export class UserRepository {
  async findByFirebaseUid(uid: string): Promise<ResolvedStoredUser | null> {
    const doc = await UserModel.findOne({ firebaseUid: uid, isActive: true }).lean();
    if (!doc) return null;
    return this.toResolved(doc as unknown as UserDoc);
  }

  async findById(id: string): Promise<UserRow | null> {
    const doc = await UserModel.findById(id).lean();
    return doc ? toUserRow(doc as UserDoc) : null;
  }

  async findByEmail(email: string): Promise<UserRow | null> {
    const doc = await UserModel.findOne({ email: email.toLowerCase() }).lean();
    return doc ? toUserRow(doc as unknown as UserDoc) : null;
  }

  async findByTenant(tenantId: string): Promise<UserRow[]> {
    const docs = await UserModel.find({ tenantId }).lean();
    return docs.map((d) => toUserRow(d as UserDoc));
  }

  async create(input: CreateUserInput): Promise<UserRow> {
    const doc = await UserModel.create({
      firebaseUid: input.firebaseUid,
      email: input.email,
      emailVerified: input.emailVerified ?? false,
      displayName: input.displayName ?? '',
      photoUrl: input.photoUrl ?? '',
      roleId: input.roleId,
      tenantId: input.tenantId,
      departmentCode: input.departmentCode,
      jurisdiction: input.jurisdiction ?? undefined,
      grantedPermissions: input.grantedPermissions ?? [],
      registerWriteScopes: input.registerWriteScopes ?? [],
      createdBy: input.createdBy ?? null,
    });
    return toUserRow(doc.toObject() as UserDoc);
  }

  async update(id: string, input: UpdateUserInput): Promise<UserRow | null> {
    const set: Record<string, unknown> = {};
    if (input.roleId !== undefined) set.roleId = input.roleId;
    if (input.tenantId !== undefined) set.tenantId = input.tenantId;
    if (input.departmentCode !== undefined) set.departmentCode = input.departmentCode;
    if (input.jurisdiction !== undefined) set.jurisdiction = input.jurisdiction ?? null;
    if (input.grantedPermissions !== undefined) set.grantedPermissions = input.grantedPermissions;
    if (input.registerWriteScopes !== undefined) set.registerWriteScopes = input.registerWriteScopes;
    if (input.isActive !== undefined) set.isActive = input.isActive;
    if (input.updatedBy !== undefined) set.updatedBy = input.updatedBy;

    const doc = await UserModel.findByIdAndUpdate(
      id,
      { $set: set },
      { new: true, runValidators: true },
    ).lean();
    return doc ? toUserRow(doc as UserDoc) : null;
  }

  async recordLogin(id: string, ip: string, deviceId: string): Promise<void> {
    await UserModel.findByIdAndUpdate(id, {
      $set: { lastLoginAt: new Date(), lastLoginIp: ip, lastLoginDeviceId: deviceId },
    });
  }

  async setLock(id: string, locked: boolean, reason = '', lockedUntil: Date | null = null): Promise<void> {
    await UserModel.findByIdAndUpdate(id, {
      $set: { isLocked: locked, lockedReason: reason, lockedUntil },
    });
  }

  private toResolved(doc: UserDoc): ResolvedStoredUser {
    return {
      userId: doc._id.toString(),
      firebaseUid: doc.firebaseUid,
      role: doc.roleId as RoleId,
      tenantId: doc.tenantId ? doc.tenantId.toString() : null,
      department: doc.departmentCode as DepartmentCode | null,
      jurisdiction: doc.jurisdiction
        ? ({
            level: doc.jurisdiction.level ?? 'all',
            stateId: doc.jurisdiction.stateId ? doc.jurisdiction.stateId.toString() : null,
            regionId: doc.jurisdiction.regionId ? doc.jurisdiction.regionId.toString() : null,
            districtId: doc.jurisdiction.districtId ? doc.jurisdiction.districtId.toString() : null,
            talukaId: doc.jurisdiction.talukaId ? doc.jurisdiction.talukaId.toString() : null,
          } as GovernmentJurisdiction)
        : null,
      grantedPermissions: doc.grantedPermissions ?? [],
      registerWriteScopes: (doc.registerWriteScopes ?? []) as RegisterScopeId[],
    };
  }
}

export default UserRepository;
