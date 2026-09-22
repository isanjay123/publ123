export type OcrResult = {
  documentType: string;
  confidence: number;
  fields: Record<string, string>;
  provider: "mock" | "external";
};

export interface OcrService {
  extract(input: { fileName: string; expectedDocument?: string }): Promise<OcrResult>;
}

export const mockOcrService: OcrService = {
  async extract({ fileName, expectedDocument }) {
    const documentType = expectedDocument ?? fileName.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
    return {
      documentType,
      confidence: 0.92,
      fields: {
        holderName: "Pending verification",
        issuedOn: new Date().toISOString().slice(0, 10),
        documentNumber: "AUTO-EXTRACT-PENDING",
      },
      provider: "mock",
    };
  },
};

export function getOcrService(): OcrService {
  return mockOcrService;
}
