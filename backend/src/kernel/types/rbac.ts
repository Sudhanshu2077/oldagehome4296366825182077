export type RoleTier = 'government' | 'institution' | 'external';

export type GovernmentRoleId =
  | 'gov-super-admin'
  | 'state-commissioner'
  | 'regional-officer'
  | 'district-officer'
  | 'taluka-officer';

export type InstitutionRoleId = 'institution-head' | 'assistant-manager' | 'department-user';

export type ExternalRoleId = 'family' | 'donor' | 'citizen' | 'volunteer';

export type RoleId = GovernmentRoleId | InstitutionRoleId | ExternalRoleId;

export type GovernmentJurisdictionLevel = 'state' | 'region' | 'district' | 'taluka' | 'all';

export type DepartmentCode =
  | 'reception'
  | 'doctor'
  | 'nurse'
  | 'kitchen'
  | 'store'
  | 'finance'
  | 'hr'
  | 'volunteer'
  | 'security'
  | 'maintenance'
  | 'housekeeping'
  | 'laundry';

export const GOVERNMENT_ROLE_IDS: readonly GovernmentRoleId[] = [
  'gov-super-admin',
  'state-commissioner',
  'regional-officer',
  'district-officer',
  'taluka-officer',
];

export const INSTITUTION_ROLE_IDS: readonly InstitutionRoleId[] = [
  'institution-head',
  'assistant-manager',
  'department-user',
];

export const EXTERNAL_ROLE_IDS: readonly ExternalRoleId[] = ['family', 'donor', 'citizen', 'volunteer'];

export const DEPARTMENT_CODES: readonly DepartmentCode[] = [
  'reception','doctor','nurse','kitchen','store',
  'finance','hr','volunteer','security','maintenance',
  'housekeeping','laundry',
];

export function isRoleId(value: unknown): value is RoleId {
  return typeof value === 'string'
    && (
      (GOVERNMENT_ROLE_IDS as readonly string[]).includes(value)
      || (INSTITUTION_ROLE_IDS as readonly string[]).includes(value)
      || (EXTERNAL_ROLE_IDS as readonly string[]).includes(value)
    );
}

export function tierOfRole(role: RoleId): RoleTier {
  if ((GOVERNMENT_ROLE_IDS as readonly string[]).includes(role)) return 'government';
  if ((INSTITUTION_ROLE_IDS as readonly string[]).includes(role)) return 'institution';
  return 'external';
}

export type RegisterScopeId = 'R1'|'R2'|'R3'|'R4'|'R5'|'R6'|'R7'|'R8'|'R9'|'R10'|'R11'|'R12'|'R13';

export const REGISTER_SCOPE_IDS: readonly RegisterScopeId[] = [
  'R1','R2','R3','R4','R5','R6','R7',
  'R8','R9','R10','R11','R12','R13',
];

export function isRegisterScopeId(value: unknown): value is RegisterScopeId {
  return typeof value === 'string' && (REGISTER_SCOPE_IDS as readonly string[]).includes(value);
}
