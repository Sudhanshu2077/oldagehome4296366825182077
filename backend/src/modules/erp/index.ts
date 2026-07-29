import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { PHASE2_MODULES } from './definitions/phase2.defs.js';
import { PHASE3_MODULES } from './definitions/phase3.defs.js';
import { buildModelFor, registerErpModule } from './module-engine.js';
import type { FieldDef } from './module-definition.js';
import { ok } from '../../kernel/response/api-response.js';

export const ALL_ERP_MODULES = [...PHASE2_MODULES, ...PHASE3_MODULES] as const;

const erpModule: FastifyPluginAsync = async (app: FastifyInstance): Promise<void> => {
  for (const def of ALL_ERP_MODULES) {
    const model = buildModelFor(def);
    registerErpModule(app, def, model);
  }

  app.get('/modules', { preHandler: [app.authenticate] }, async (_req, reply) => {
    reply.send(ok(ALL_ERP_MODULES.map((d) => ({
      code: d.code,
      title: d.title,
      titleMr: d.titleMr,
      workflow: d.workflow ? { states: d.workflow.states, transitions: d.workflow.transitions } : null,
      fields: d.fields.map((f: FieldDef) => ({ key: f.key, type: f.type, label: f.label, labelMr: f.labelMr ?? '', required: f.required ?? false, enum: f.enum ?? null })),
    }))));
  });
};

export { erpModule };
export default erpModule;
