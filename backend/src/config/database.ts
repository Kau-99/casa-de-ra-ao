import mongoose from 'mongoose';

export async function connectDatabase(): Promise<void> {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI não definida nas variáveis de ambiente.');
  }

  mongoose.connection.on('connected', () => {
    console.log(`[DB] Conectado: ${mongoose.connection.host}/${mongoose.connection.db?.databaseName}`);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[DB] Desconectado do MongoDB.');
  });

  mongoose.connection.on('error', (err) => {
    console.error('[DB] Erro de conexão:', err.message);
  });

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
