import { ActivityLog } from '../models';

/* Registra uma ação administrativa — nunca falha (erros são silenciosos para não quebrar fluxo) */
export async function logActivity(adminEmail: string, action: string, details = ''): Promise<void> {
  try {
    await ActivityLog.create({ adminEmail, action, details });
  } catch {}
}
