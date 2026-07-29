import type { FastifyInstance } from 'fastify';
import type { ResolvedStoredUser, SessionUserStore } from '../../../kernel/types/session.js';
import UserRepository from '../repository/user.repository.js';

const repo = new UserRepository();

const store: SessionUserStore = {
  async findByFirebaseUid(uid: string): Promise<ResolvedStoredUser | null> {
    return repo.findByFirebaseUid(uid);
  },
};

export function setSessionUserStore(app: FastifyInstance): void {
  app.setSessionUserStore(store);
}

export default store;

export { store as sessionUserStore };
