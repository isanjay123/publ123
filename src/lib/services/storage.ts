export type StoredDocument = {
  path: string;
  fileName: string;
  sizeBytes: number;
  uploadedAt: string;
  provider: "mock" | "cloud";
};

export interface FileStorageService {
  upload(input: { applicationId: string; fileName: string; sizeBytes: number }): Promise<StoredDocument>;
}

export const mockFileStorage: FileStorageService = {
  async upload({ applicationId, fileName, sizeBytes }) {
    return {
      path: `applications/${applicationId}/${fileName}`,
      fileName,
      sizeBytes,
      uploadedAt: new Date().toISOString(),
      provider: "mock",
    };
  },
};

export function getFileStorage(): FileStorageService {
  return mockFileStorage;
}
