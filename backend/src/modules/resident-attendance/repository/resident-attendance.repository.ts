import { Types } from 'mongoose';
import { AttSessionModel, AttSessionCounterModel, type AttSessionDoc } from '../entity/resident-attendance.entity.js';

export interface AttEntryRow {
  residentId: string;
  residentNumber: string;
  fullName: string;
  photoUrl: string;
  roomId: string | null;
  roomName: string;
  bedId: string | null;
  bedName: string;
  status: string;
  reason: string;
  markedBy: string | null;
  markedAt: Date;
}

export interface AttCorrectionRow {
  residentId: string;
  residentNumber: string;
  fullName: string;
  originalStatus: string;
  newStatus: string;
  reason: string;
  changedBy: string | null;
  changedAt: Date;
}

export interface AttSessionRow {
  id: string;
  tenantId: string;
  attendanceDate: Date;
  sessionId: string;
  status: string;
  entries: AttEntryRow[];
  corrections: AttCorrectionRow[];
  createdBy: string | null;
  updatedBy: string | null;
  submittedBy: string | null;
  submittedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

function toObjectId(v: string): unknown {
  return Types.ObjectId.isValid(v) ? new Types.ObjectId(v) : v;
}

export function toAttSessionRow(doc: AttSessionDoc): AttSessionRow {
  return {
    id: doc._id.toString(),
    tenantId: doc.tenantId.toString(),
    attendanceDate: doc.attendanceDate,
    sessionId: doc.sessionId,
    status: doc.status,
    entries: (doc.entries ?? []).map((e) => ({
      residentId: String(e.residentId),
      residentNumber: e.residentNumber,
      fullName: e.fullName,
      photoUrl: e.photoUrl,
      roomId: e.roomId ? String(e.roomId) : null,
      roomName: e.roomName,
      bedId: e.bedId ? String(e.bedId) : null,
      bedName: e.bedName,
      status: e.status,
      reason: e.reason,
      markedBy: e.markedBy ? String(e.markedBy) : null,
      markedAt: e.markedAt,
    })),
    corrections: (doc.corrections ?? []).map((c) => ({
      residentId: String(c.residentId),
      residentNumber: c.residentNumber,
      fullName: c.fullName,
      originalStatus: c.originalStatus,
      newStatus: c.newStatus,
      reason: c.reason,
      changedBy: c.changedBy ? String(c.changedBy) : null,
      changedAt: c.changedAt,
    })),
    createdBy: doc.createdBy ? doc.createdBy.toString() : null,
    updatedBy: doc.updatedBy ? doc.updatedBy.toString() : null,
    submittedBy: doc.submittedBy ? doc.submittedBy.toString() : null,
    submittedAt: doc.submittedAt ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export class AttRepository {
  async nextSessionId(tenantId: string, date: Date): Promise<string> {
    const counter = await AttSessionCounterModel.findOneAndUpdate(
      { tenantId: toObjectId(tenantId) },
      { $inc: { seq: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).lean();
    const seq = counter?.seq ?? 1;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `ATT-${y}-${m}-${d}-${String(seq).padStart(6, '0')}`;
  }

  async createSession(input: Record<string, unknown>): Promise<AttSessionRow> {
    const doc = await AttSessionModel.create(input);
    return toAttSessionRow(doc.toObject() as AttSessionDoc);
  }

  async findByDate(tenantId: string, date: Date): Promise<AttSessionRow | null> {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start.getTime() + 86400000);
    const doc = await AttSessionModel.findOne({ tenantId: toObjectId(tenantId), attendanceDate: { $gte: start, $lt: end }, deletedAt: null }).lean();
    return doc ? toAttSessionRow(doc as unknown as AttSessionDoc) : null;
  }

  async listByDateRange(tenantId: string, from: Date, to: Date): Promise<AttSessionRow[]> {
    const start = new Date(from);
    start.setHours(0, 0, 0, 0);
    const end = new Date(to);
    end.setHours(0, 0, 0, 0);
    end.setDate(end.getDate() + 1);
    const docs = await AttSessionModel.find({ tenantId: toObjectId(tenantId), attendanceDate: { $gte: start, $lt: end }, deletedAt: null }).sort({ attendanceDate: 1 }).lean();
    return docs.map((d) => toAttSessionRow(d as unknown as AttSessionDoc));
  }

  async listMonth(tenantId: string, year: number, month: number): Promise<AttSessionRow[]> {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);
    const docs = await AttSessionModel.find({ tenantId: toObjectId(tenantId), attendanceDate: { $gte: start, $lt: end }, deletedAt: null }).sort({ attendanceDate: 1 }).lean();
    return docs.map((d) => toAttSessionRow(d as unknown as AttSessionDoc));
  }

  async update(tenantId: string, id: string, set: Record<string, unknown>): Promise<AttSessionRow | null> {
    const doc = await AttSessionModel.findOneAndUpdate(
      { _id: id, tenantId: toObjectId(tenantId), deletedAt: null },
      { $set: set },
      { new: true },
    ).lean();
    return doc ? toAttSessionRow(doc as unknown as AttSessionDoc) : null;
  }

  async list(tenantIds: string[], page: number, pageSize: number): Promise<{ items: AttSessionRow[]; total: number }> {
    const query: Record<string, unknown> = { deletedAt: null };
    if (tenantIds.length === 1) {
      query.tenantId = toObjectId(tenantIds[0]!);
    } else if (tenantIds.length > 1) {
      query.tenantId = { $in: tenantIds.map((id) => toObjectId(id)) };
    } else {
      return { items: [], total: 0 };
    }
    const [docs, total] = await Promise.all([
      AttSessionModel.find(query).sort({ attendanceDate: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
      AttSessionModel.countDocuments(query),
    ]);
    return { items: docs.map((d) => toAttSessionRow(d as unknown as AttSessionDoc)), total };
  }
}

export default AttRepository;