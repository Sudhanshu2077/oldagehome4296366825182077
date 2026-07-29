import type { DecodedFirebaseToken } from '../../services/firebase.service.js';
import type {
  DepartmentCode,
  GovernmentJurisdictionLevel,
  RoleId,
  RoleTier,
} from './rbac.js';
import type { RegisterScopeId } from './rbac.js';

export interface GovernmentJurisdiction {
  level: GovernmentJurisdictionLevel;
  stateId: string | null;
  regionId: string | null;
  districtId: string | null;
  talukaId: string | null;
}

export interface SessionUser {
  userId: string;
  firebaseUid: string;
  email: string | undefined;
  emailVerified: boolean;
  displayName: string | undefined;
  photoUrl: string | undefined;
  signInProvider: string | undefined;
  role: RoleId;
  tier: RoleTier;
  tenantId: string | null;
  department: DepartmentCode | null;
  jurisdiction: GovernmentJurisdiction | null;
  grantedPermissions: readonly string[];
  registerWriteScopes: readonly RegisterScopeId[];
  decodedToken: DecodedFirebaseToken;
  sessionDeviceId: string;
}

export interface SessionUserStore {
  findByFirebaseUid(uid: string): Promise<ResolvedStoredUser | null>;
}

export interface ResolvedStoredUser {
  userId: string;
  firebaseUid: string;
  role: RoleId;
  tenantId: string | null;
  department: DepartmentCode | null;
  jurisdiction: GovernmentJurisdiction | null;
  grantedPermissions: readonly string[];
  registerWriteScopes: readonly RegisterScopeId[];
}
