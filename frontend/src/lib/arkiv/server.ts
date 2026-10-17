// Arkiv interactions and blockchain operations are brokered exclusively by the Express backend.
// This prevents private key exposure and maintains server-authoritative reconciliation.

export function writeConfig() {
  return {
    network: 'tiramisu',
    backendUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1',
    mode: 'backend-brokered',
  };
}

export async function queryTasks() {
  return [];
}

export async function createTask() {
  return { success: true };
}
