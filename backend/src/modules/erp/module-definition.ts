import type { DepartmentCode } from '../../kernel/types/rbac.js';

export type FieldType = 'string' | 'text' | 'number' | 'date' | 'boolean' | 'enum' | 'objectid' | 'array' | 'mixed';

export interface FieldDef {
  key: string;
  type: FieldType;
  label: string;
  labelMr?: string;
  required?: boolean;
  enum?: readonly string[];
  ref?: string;
  index?: boolean;
  unique?: boolean;
  default?: unknown;
}

export interface WorkflowDef {
  field: string;
  states: readonly string[];
  initial: string;
  transitions: Record<string, readonly string[]>;
  transitionRoles?: readonly string[];
}

export interface ModuleDef {
  code: string;
  title: string;
  titleMr: string;
  collection: string;
  fields: readonly FieldDef[];
  workflow?: WorkflowDef;
  writeRoles?: readonly string[];
  writeDepartments?: readonly DepartmentCode[];
  searchableFields?: readonly string[];
  defaultSort?: string;
  dateFieldForLock?: string;
  onTransitionHook?: 'admission-approve' | 'none';
}

export const P = { required: true } as const;
