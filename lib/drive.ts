const DRIVE_API = "https://www.googleapis.com/drive/v3";
const UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";

export class AuthError extends Error {
  constructor(message = "Google Drive: invalid or expired access token") {
    super(message);
    this.name = "AuthError";
  }
}

export class DriveError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "DriveError";
  }
}

async function driveRequest(
  url: string,
  accessToken: string,
  options: RequestInit = {},
): Promise<Response> {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(options.headers ?? {}),
    },
  });

  if (res.status === 401) {
    throw new AuthError();
  }

  if (!res.ok) {
    const body = await res.text();
    throw new DriveError(res.status, body);
  }

  return res;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
}

/**
 * List files in a Drive folder.
 */
export async function listFiles(
  folderId: string,
  accessToken: string,
): Promise<DriveFile[]> {
  const params = new URLSearchParams({
    q: `'${folderId}' in parents and trashed = false`,
    fields: "files(id,name,mimeType,modifiedTime)",
    pageSize: "1000",
  });

  const res = await driveRequest(
    `${DRIVE_API}/files?${params}`,
    accessToken,
  );
  const data = await res.json();
  return data.files as DriveFile[];
}

/**
 * Create a JSON file in a Drive folder.
 * Returns the new file's ID.
 */
export async function createFile(
  name: string,
  folderId: string,
  content: unknown,
  accessToken: string,
): Promise<string> {
  const metadata = { name, parents: [folderId], mimeType: "application/json" };
  const body = new FormData();
  body.append(
    "metadata",
    new Blob([JSON.stringify(metadata)], { type: "application/json" }),
  );
  body.append(
    "file",
    new Blob([JSON.stringify(content)], { type: "application/json" }),
  );

  const res = await driveRequest(
    `${UPLOAD_API}/files?uploadType=multipart&fields=id`,
    accessToken,
    { method: "POST", body },
  );
  const data = await res.json();
  return data.id as string;
}

/**
 * Update the content of an existing Drive file.
 */
export async function updateFile(
  fileId: string,
  content: unknown,
  accessToken: string,
): Promise<void> {
  await driveRequest(
    `${UPLOAD_API}/files/${fileId}?uploadType=media`,
    accessToken,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(content),
    },
  );
}

/**
 * Get the content of a Drive file.
 */
export async function getFile<T = unknown>(
  fileId: string,
  accessToken: string,
): Promise<T> {
  const res = await driveRequest(
    `${DRIVE_API}/files/${fileId}?alt=media`,
    accessToken,
  );
  return res.json() as Promise<T>;
}

/**
 * Upload a binary file (e.g. image/PDF) to a Drive folder.
 * Returns the new file's ID.
 */
export async function uploadFile(
  name: string,
  folderId: string,
  blob: Blob,
  mimeType: string,
  accessToken: string,
): Promise<string> {
  const metadata = { name, parents: [folderId], mimeType };
  const body = new FormData();
  body.append(
    "metadata",
    new Blob([JSON.stringify(metadata)], { type: "application/json" }),
  );
  body.append("file", new Blob([blob], { type: mimeType }));

  const res = await driveRequest(
    `${UPLOAD_API}/files?uploadType=multipart&fields=id`,
    accessToken,
    { method: "POST", body },
  );
  const data = await res.json();
  return data.id as string;
}
