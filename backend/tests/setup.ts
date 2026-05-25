import mongoose from 'mongoose';
import { beforeAll, afterAll, afterEach } from 'vitest';

/* Usa mongodb-memory-server ou a URI de test configurada no .env */
const TEST_URI = process.env.MONGODB_URI_TEST ?? 'mongodb://localhost:27017/helvinho_test';

beforeAll(async () => {
  await mongoose.connect(TEST_URI);
});

afterEach(async () => {
  /* Limpa todas as collections entre testes para isolamento */
  const collections = mongoose.connection.collections;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
});

afterAll(async () => {
  await mongoose.disconnect();
});
