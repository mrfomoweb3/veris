// ── AI / Credential ───────────────────────────────────────────────────────────

export type AiOrigin = 'likely-camera' | 'possibly-ai' | 'unknown';

export interface AddressScreen {
  malicious: boolean;
  source: string;
  detail?: string;
}

export interface Credential {
  description: string;
  tags: string[];
  aiOrigin: AiOrigin;
  metadata: Record<string, unknown>;
  addressScreen: AddressScreen;
}

// ── Attestation ───────────────────────────────────────────────────────────────

export interface AttestationDTO {
  /** Sui object id — also serves as the on-chain attestation ID */
  id: string;
  creator: string;
  blobId: string;
  credentialBlobId: string;
  sha256: string;
  phash: string;
  mediaType: string;
  parent: string | null;
  encrypted: boolean;
  createdAtMs: number;
  suiObjectUrl: string;
  txDigest?: string;
}

// ── Register ──────────────────────────────────────────────────────────────────

export interface PrepareResponse {
  sha256: string;
  phash: string;
  mediaType: string;
  blobId: string;
  credentialBlobId: string;
  credential: Credential;
  /** Base64-encoded unsigned PTB; the frontend wallet signs + executes this */
  txBytes: string;
  parentId: string | null;
}

export interface RegisterResponse {
  attestation: AttestationDTO;
  txDigest: string;
  /** Convenience fields matching the frontend receipt shape */
  receipt: {
    attId: string;
    blobId: string;
    objId: string;
  };
}

// ── Verify ────────────────────────────────────────────────────────────────────

export type VerifyStatus = 'authentic' | 'modified' | 'unknown';

export interface VerifyResult {
  status: VerifyStatus;
  similarity?: number;
  attestation?: AttestationDTO;
  diff?: string[];
}

// ── Lineage ───────────────────────────────────────────────────────────────────

export interface LineageNode extends AttestationDTO {
  changeSummary?: string;
}

export interface Lineage {
  rootId: string;
  nodes: LineageNode[];
}

// ── Explorer ──────────────────────────────────────────────────────────────────

export interface ExplorerPage {
  items: AttestationDTO[];
  nextCursor: string | null;
}
