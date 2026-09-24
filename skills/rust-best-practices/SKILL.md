---
name: rust-best-practices
description: Rust best practices. Use when reading or editing any .rs file.
paths: ["**/*.rs"]
disable-model-invocation: true
---

# Rust best practices

Apply the **type-system-discipline** principle skill first. Where the repository's AGENTS.md or lint config is stricter, it wins.

| Rule | Summary |
|------|---------|
| Enums with payloads | Model variants as enums carrying their data so impossible states can't be represented. No `bool` + `Option` field bags where contradictory combinations compile. |
| Newtype branding | Wrap semantic primitives (`UserId`, `Slot`) in newtypes when two values of the same primitive could be mixed up — ids, keys, quantities with units. Validate once at the boundary, trust the type downstream. |
| Constructive modeling | Build the shape so the illegal value can't be constructed: a head plus a tail for non-empty, a start plus a duration for ranges. Not a runtime assert. |
| Simplest total type | Keep `Vec<T>` / `&str` while every operation on them stays total. Strengthen only where the loose type forces `unwrap`, a panic, or a "should never happen" comment. |
| Exhaustive matches | Unannotated `match` on enums; no wildcard arms. Adding a variant must break compilation at every match site. `#[non_exhaustive]` only for cross-crate APIs you don't own. |
| Schema-derived types | Derive from the authoritative schema (serde attributes, proto, OpenAPI) instead of hand-maintaining a parallel struct. |
| Boundary parsing | External data (RPC payloads, JSON, CLI args, env, config files) parses into typed models at the edge; `serde_json::Value` and friends stop at that parse. See the **boundary-discipline** principle skill. |
| No guards across await | Never hold a `Mutex`/`RefCell` guard (std or `parking_lot`) across an `.await`. Restructure, or use an async-aware lock. |
| parking_lot locks | Prefer `parking_lot::{Mutex, RwLock}` over std when lock results would be unwrapped: guards return directly, no poisoning path. Locks held across `.await` stay async-aware (`tokio::sync::Mutex`). |
| Result propagation | `?` over `unwrap`/`expect`. No `expect` outside tests or provably infallible sites, and those carry a comment saying why it can't fail. |
| Typed errors | Library errors are enums (`thiserror`); context attaches with `map_err`/`.context()` at layer boundaries. No stringly `Box<dyn Error>` in library APIs. |
| Async traits | RPITIT (`fn foo(&self) -> impl Future<Output = T> + Send`) over `#[async_trait]`. Implementations may use `async fn` when they satisfy the contract. |
| Hot-path discipline | No avoidable allocation, clone, or copy, everywhere — not only in measured hot paths: borrow, take `&str`/`&[u8]`, reuse buffers, return `&'static str` over allocating for constants. `iter()` over `into_iter()` on references, `copied()` over `cloned()` on `Copy` types. |
| Inline format args | `format!("{x}")`, not `format!("{}", x)`. |
| Comments and docs | Comments end with periods. `///` goes before attributes. Module docs are `//!` at the top of the file. Every `unsafe` block documents its safety requirements. |
| Structured logging | `tracing` events with context fields under the component's target. No `println!`/`eprintln!`/`dbg!` in shipped code. |
| Whole-object tests | Assert entire structures over field-by-field fields. No tests for statically defined values. Fuzz parsers and serializers; property-test invariants. |
| Green before done | `cargo fmt` and `cargo clippy --workspace --all-targets --all-features` clean before declaring finished; fix findings, don't suppress them. |

Examples: `references/patterns.md`.
