import { listFiles, createFile } from "@/lib/drive";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Settings {
  locale: string;
  activityType: "medical" | "other";
  irpfRate: 7 | 15;
  bookingSlug: string | null;
  createdAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Find a folder by name inside a parent, or return null if not found.
 */
async function findFolder(
  name: string,
  parentId: string,
  accessToken: string,
): Promise<string | null> {
  const files = await listFiles(parentId, accessToken);
  const found = files.find(
    (f) => f.name === name && f.mimeType === "application/vnd.google-apps.folder",
  );
  return found?.id ?? null;
}

/**
 * Find a file by name inside a parent, or return null if not found.
 */
async function findFile(
  name: string,
  parentId: string,
  accessToken: string,
): Promise<string | null> {
  const files = await listFiles(parentId, accessToken);
  const found = files.find(
    (f) => f.name === name && f.mimeType !== "application/vnd.google-apps.folder",
  );
  return found?.id ?? null;
}

/**
 * Create a folder only if it doesn't already exist. Returns the folder ID.
 */
async function ensureFolder(
  name: string,
  parentId: string,
  accessToken: string,
): Promise<string> {
  const existing = await findFolder(name, parentId, accessToken);
  if (existing) return existing;

  const res = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to create folder "${name}": ${body}`);
  }

  const data = await res.json();
  return data.id as string;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface DriveStructure {
  rootId: string;
  facturasId: string;
  gastosId: string;
  autonomasHiddenId: string;
}

/**
 * Create the Autonomas Drive folder structure sequentially.
 * Idempotent: skips folders that already exist.
 *
 * Structure:
 *   My Drive/
 *   └── Autonomas/
 *       ├── Facturas/
 *       ├── Gastos/
 *       └── .autonomas/
 */
export async function initUserDrive(accessToken: string): Promise<DriveStructure> {
  const rootId = await ensureFolder("Autonomas", "root", accessToken);
  const facturasId = await ensureFolder("Facturas", rootId, accessToken);
  const gastosId = await ensureFolder("Gastos", rootId, accessToken);
  const autonomasHiddenId = await ensureFolder(".autonomas", rootId, accessToken);

  return { rootId, facturasId, gastosId, autonomasHiddenId };
}

/**
 * Write income.json, expenses.json, and settings.json to .autonomas/.
 * Idempotent: skips files that already exist.
 */
export async function writeInitialFiles(
  accessToken: string,
  autonomasHiddenId: string,
  settings: Settings,
): Promise<void> {
  const existingIncome = await findFile("income.json", autonomasHiddenId, accessToken);
  if (!existingIncome) {
    await createFile("income.json", autonomasHiddenId, [], accessToken);
  }

  const existingExpenses = await findFile("expenses.json", autonomasHiddenId, accessToken);
  if (!existingExpenses) {
    await createFile("expenses.json", autonomasHiddenId, [], accessToken);
  }

  // Always write settings.json — this is the onboarding completion signal
  const existingSettings = await findFile("settings.json", autonomasHiddenId, accessToken);
  if (!existingSettings) {
    await createFile("settings.json", autonomasHiddenId, settings, accessToken);
  }
}
