import type { DepartmentCode, RoleId, RoleTier } from '../../../kernel/types/rbac.js';

export interface RoleSeed {
  roleId: RoleId;
  tier: RoleTier;
  label: string;
  labelMr: string;
  description: string;
  level: number;
  system: boolean;
  parentRoleId: RoleId | null;
}

export const SYSTEM_ROLES: readonly RoleSeed[] = [
  { roleId: 'gov-super-admin', tier: 'government', label: 'Government Super Admin', labelMr: 'शासन सुपर व्यवस्थापक', description: 'Top government administrator with cross-tenant visibility across the whole state', level: 1, system: true, parentRoleId: null },
  { roleId: 'state-commissioner', tier: 'government', label: 'State Commissioner', labelMr: 'राज्य आयुक्त', description: 'State-level monitoring officer', level: 2, system: true, parentRoleId: 'gov-super-admin' },
  { roleId: 'regional-officer', tier: 'government', label: 'Regional Officer', labelMr: 'प्रादेशिक अधिकारी', description: 'Region-level monitoring officer', level: 3, system: true, parentRoleId: 'state-commissioner' },
  { roleId: 'district-officer', tier: 'government', label: 'District Officer', labelMr: 'जिल्हा अधिकारी', description: 'District-level monitoring officer', level: 4, system: true, parentRoleId: 'regional-officer' },
  { roleId: 'taluka-officer', tier: 'government', label: 'Taluka Officer', labelMr: 'तालुका अधिकारी', description: 'Taluka-level monitoring officer', level: 5, system: true, parentRoleId: 'district-officer' },
  { roleId: 'institution-head', tier: 'institution', label: 'Institution Head', labelMr: 'संस्था प्रमुख', description: 'Auditing/view-only head of an Old Age Home', level: 6, system: true, parentRoleId: null },
  { roleId: 'assistant-manager', tier: 'institution', label: 'Assistant Manager', labelMr: 'सहाय्यक व्यवस्थापक', description: 'Day-to-day operations manager with full register write access', level: 7, system: true, parentRoleId: 'institution-head' },
  { roleId: 'department-user', tier: 'institution', label: 'Department User', labelMr: 'विभाग वापरकर्ता', description: 'Department staff with register writes scoped to assigned grants', level: 8, system: true, parentRoleId: 'assistant-manager' },
  { roleId: 'family', tier: 'external', label: 'Family', labelMr: 'कुटुंब', description: 'Family member of a resident — limited self-service', level: 9, system: true, parentRoleId: null },
  { roleId: 'donor', tier: 'external', label: 'Donor', labelMr: 'दाता', description: 'Donor with view + donation capabilities', level: 9, system: true, parentRoleId: null },
  { roleId: 'citizen', tier: 'external', label: 'Citizen', labelMr: 'नागरिक', description: 'General citizen — inquiry submission only', level: 9, system: true, parentRoleId: null },
  { roleId: 'volunteer', tier: 'external', label: 'Volunteer', labelMr: 'स्वयंसेवक', description: 'Registered volunteer — self-service profile and activity logging', level: 9, system: true, parentRoleId: null },
];

export interface DepartmentSeed {
  code: DepartmentCode;
  label: string;
  labelMr: string;
  description: string;
}

export const SYSTEM_DEPARTMENTS: readonly DepartmentSeed[] = [
  { code: 'reception', label: 'Reception', labelMr: 'रिसेप्शन', description: 'Front desk and visitor management' },
  { code: 'doctor', label: 'Doctor', labelMr: 'डॉक्टर', description: 'Medical officers' },
  { code: 'nurse', label: 'Nurse', labelMr: 'परिचारिका', description: 'Nursing staff' },
  { code: 'kitchen', label: 'Kitchen', labelMr: 'स्वयंपाकघर', description: 'Kitchen and meal preparation staff' },
  { code: 'store', label: 'Store', labelMr: 'साठा', description: 'Inventory and store management' },
  { code: 'finance', label: 'Finance', labelMr: 'वित्त', description: 'Finance and accounts' },
  { code: 'hr', label: 'HR', labelMr: 'मानव संसाधन', description: 'Human resources' },
  { code: 'volunteer', label: 'Volunteer', labelMr: 'स्वयंसेवक', description: 'Volunteer coordination' },
  { code: 'security', label: 'Security', labelMr: 'सुरक्षा', description: 'Premises security' },
  { code: 'maintenance', label: 'Maintenance', labelMr: 'देखभाल', description: 'Building and equipment maintenance' },
  { code: 'housekeeping', label: 'Housekeeping', labelMr: 'घरकाम', description: 'Cleaning and sanitation staff' },
  { code: 'laundry', label: 'Laundry', labelMr: 'धुलाई', description: 'Laundry service staff' },
];
