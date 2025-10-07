module certification::cert;

use std::string::String;
use sui::event;

public struct CertFactory has key, store {
    id: UID,
    admin: address,
}

public struct Certificate has key, store {
    id: UID,
    student_email: String,
    issuer: address,
    receiver: address,
    student_name: String,
    institution_name: String,
    text: String,
    image_url: String,
    issued_date: String,
    revoked_reason: String,
    expiry_date: u64,
    created_at: u64,
}

entry fun new(ctx: &mut TxContext) {
    let factory = CertFactory {
        id: object::new(ctx),
        admin: ctx.sender(),
    };
    transfer::transfer(factory, ctx.sender());
}

entry fun new_cert(
    factory: &CertFactory,
    student_email: String,
    receiver: address,
    student_name: String,
    institution_name: String,
    text: String,
    image_url: String,
    issued_date: String,
    expiry_date: u64,
    ctx: &mut TxContext,
) {
    assert!(ctx.sender() == factory.admin, EInsufficientPermission);

    let certificate = Certificate {
        id: object::new(ctx),
        student_email,
        issuer: ctx.sender(),
        receiver,
        student_name,
        institution_name,
        text,
        image_url,
        issued_date,
        revoked_reason: std::string::utf8(b""),
        expiry_date,
        created_at: ctx.epoch_timestamp_ms(),
    };

    event::emit(CertificationEvent {
        description: std::string::utf8(b"Certificate Created"),
        certificate_id: object::uid_to_inner(&certificate.id),
        timestamp: ctx.epoch_timestamp_ms(),
    });

    transfer::transfer(certificate, receiver);
}

const EInsufficientPermission: u64 = 0;

entry fun revoke_cert(cert: &mut Certificate, revoked_reason: String, ctx: &TxContext) {
    assert!(ctx.sender() == cert.issuer, EInsufficientPermission);
    cert.revoked_reason = revoked_reason;

    event::emit(CertificationEvent {
        description: std::string::utf8(b"Certificate Revoked"),
        certificate_id: object::uid_to_inner(&cert.id),
        timestamp: ctx.epoch_timestamp_ms(),
    });
}

public struct CertificationEvent has copy, drop {
    description: String,
    certificate_id: ID,
    timestamp: u64,
}
