/// Veris Provenance Registry
/// Immutable attestation objects pinned on Sui mainnet.
/// Every Attestation is frozen after creation — permanent, tamper-evident.
module veris::registry {
    use std::string::{Self, String};
    use std::option::{Self, Option};
    use sui::clock::{Self, Clock};
    use sui::event;

    // ── Data ──────────────────────────────────────────────────────────────────

    public struct Attestation has key, store {
        id: UID,
        /// Creator wallet address
        creator: address,
        /// Walrus blob ID of the original file
        blob_id: String,
        /// Walrus blob ID of the AI content credential JSON
        credential_blob_id: String,
        /// SHA-256 hex digest of the file
        sha256: String,
        /// Perceptual hash hex (dHash 64-bit)
        phash: String,
        /// MIME type e.g. "image/jpeg"
        media_type: String,
        /// Parent attestation ID for derivatives
        parent: Option<ID>,
        /// True if the blob is Seal-encrypted
        encrypted: bool,
        /// Unix timestamp in milliseconds (from Sui Clock)
        created_at_ms: u64,
    }

    // ── Events ────────────────────────────────────────────────────────────────

    public struct AttestationCreated has copy, drop {
        attestation_id: ID,
        creator: address,
        blob_id: String,
        sha256: String,
        parent: Option<ID>,
        created_at_ms: u64,
    }

    // ── Entry functions ───────────────────────────────────────────────────────

    /// Register an original file.
    public entry fun register(
        blob_id: vector<u8>,
        credential_blob_id: vector<u8>,
        sha256: vector<u8>,
        phash: vector<u8>,
        media_type: vector<u8>,
        encrypted: bool,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        new_attestation(
            blob_id, credential_blob_id, sha256, phash, media_type,
            encrypted, option::none(), clock, ctx,
        );
    }

    /// Register a certified derivative, referencing the parent by object.
    /// Passing `parent` as a read-only ref ensures it exists on-chain.
    public entry fun register_derivative(
        parent: &Attestation,
        blob_id: vector<u8>,
        credential_blob_id: vector<u8>,
        sha256: vector<u8>,
        phash: vector<u8>,
        media_type: vector<u8>,
        encrypted: bool,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        let pid = object::id(parent);
        new_attestation(
            blob_id, credential_blob_id, sha256, phash, media_type,
            encrypted, option::some(pid), clock, ctx,
        );
    }

    // ── Internal ──────────────────────────────────────────────────────────────

    fun new_attestation(
        blob_id: vector<u8>,
        credential_blob_id: vector<u8>,
        sha256: vector<u8>,
        phash: vector<u8>,
        media_type: vector<u8>,
        encrypted: bool,
        parent: Option<ID>,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        let created_at_ms = clock::timestamp_ms(clock);
        let att = Attestation {
            id: object::new(ctx),
            creator: tx_context::sender(ctx),
            blob_id: string::utf8(blob_id),
            credential_blob_id: string::utf8(credential_blob_id),
            sha256: string::utf8(sha256),
            phash: string::utf8(phash),
            media_type: string::utf8(media_type),
            parent,
            encrypted,
            created_at_ms,
        };
        event::emit(AttestationCreated {
            attestation_id: object::id(&att),
            creator: att.creator,
            blob_id: att.blob_id,
            sha256: att.sha256,
            parent: att.parent,
            created_at_ms,
        });
        transfer::public_freeze_object(att);
    }
}
