import { AIJobModel, type AIJobDoc } from '../entity/ai-job.entity.js';

export interface AIJobRow {
  id: string;
  tenantId: string | null;
  kind: string;
  prompt: string;
  status: 'pending' | 'completed' | 'failed';
  result: unknown;
  error: string;
  createdAt: Date;
  updatedAt: Date;
}

export function toAIJobRow(doc: AIJobDoc): AIJobRow {
  return {
    id: doc._id.toString(),
    tenantId: doc.tenantId ? doc.tenantId.toString() : null,
    kind: doc.kind,
    prompt: doc.prompt,
    status: doc.status,
    result: doc.result,
    error: doc.error,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export class AIJobRepository {
  async create(input: {
    tenantId: string | null;
    kind: string;
    prompt: string;
    createdBy: string | null;
  }): Promise<AIJobRow> {
    const doc = await AIJobModel.create({
      tenantId: input.tenantId,
      kind: input.kind,
      prompt: input.prompt,
      createdBy: input.createdBy,
    });
    return toAIJobRow(doc.toObject() as AIJobDoc);
  }

  async findById(id: string): Promise<AIJobRow | null> {
    const doc = await AIJobModel.findById(id).lean();
    return doc ? toAIJobRow(doc as unknown as AIJobDoc) : null;
  }

  async complete(id: string, result: unknown): Promise<AIJobRow | null> {
    const doc = await AIJobModel.findByIdAndUpdate(id, { $set: { status: 'completed', result } }, { new: true }).lean();
    return doc ? toAIJobRow(doc as unknown as AIJobDoc) : null;
  }

  async fail(id: string, error: string): Promise<AIJobRow | null> {
    const doc = await AIJobModel.findByIdAndUpdate(id, { $set: { status: 'failed', error } }, { new: true }).lean();
    return doc ? toAIJobRow(doc as unknown as AIJobDoc) : null;
  }

  async listRecent(tenantId: string | null, limit: number): Promise<AIJobRow[]> {
    const filter: Record<string, unknown> = {};
    if (tenantId) filter.tenantId = tenantId;
    const docs = await AIJobModel.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
    return docs.map((d) => toAIJobRow(d as unknown as AIJobDoc));
  }
}

export default AIJobRepository;
