# Rust patterns

Code examples for each rule in `SKILL.md`. The underlying principles are language-agnostic. See the **type-system-discipline** and **boundary-discipline** principle skills.

## Newtype branding

Wrap semantic primitives so they can't be mixed up. Validate once at the boundary. Downstream code trusts the type.

```rust
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct AgentId(u64);

impl AgentId {
    /// Parse at the boundary; everything downstream takes the typed value.
    pub fn parse(input: u64) -> Result<Self, AgentIdError> {
        if input == 0 {
            return Err(AgentIdError::Zero);
        }
        Ok(Self(input))
    }
}
```

Derive the boilerplate (`Debug`, `Clone, Copy`, `PartialEq, Eq, Hash`) rather than reaching for a macro until the repetition hurts.

## Enums with payloads

Model variants as enums carrying their data, so contradictory states don't compile.

```rust
// Don't. These fields admit `loaded: true` with `data: None`.
struct BadState {
    loading: bool,
    loaded: bool,
    data: Option<Report>,
    error: Option<String>,
}

// Do. Each variant carries exactly its data.
enum ReportState {
    Idle,
    Loading,
    Loaded { report: Report },
    Failed { error: ReportError },
}
```

Derive booleans from a single source (`matches!(state, ReportState::Loaded { .. })`) instead of storing them.

## Exhaustive matches

Unannotated `match`, no wildcard arm. A new variant must break every match site.

```rust
fn label(state: &ReportState) -> &'static str {
    match state {
        ReportState::Idle => "idle",
        ReportState::Loading => "loading",
        ReportState::Loaded { .. } => "loaded",
        ReportState::Failed { .. } => "failed",
        // No `_ =>` arm: adding a variant must fail compilation here.
    }
}
```

## Boundary parsing

External data parses into typed models at the edge; untyped values stop at that parse.

```rust
#[derive(serde::Deserialize)]
pub struct LaunchParams {
    pub agent: String,
    pub retries: u32,
}

pub fn parse_launch(raw: &[u8]) -> Result<LaunchParams, serde_json::Error> {
    serde_json::from_slice(raw)
}
```

Everything past this function takes `LaunchParams`, never `serde_json::Value`. Reject unknown fields (`#[serde(deny_unknown_fields)]`) when the input is a protocol you control.

## Result propagation and typed errors

`?` over `unwrap`. Library errors are enums; context attaches at layer boundaries.

```rust
#[derive(Debug, thiserror::Error)]
pub enum StoreError {
    #[error("agent {agent} not found")]
    NotFound { agent: AgentId },
    #[error("io: {0}")]
    Io(#[from] std::io::Error),
}
```

`expect` belongs in tests, or at a provably infallible site with a comment saying why it can't fail.

## No guards across await

Never hold a lock guard across an `.await`; the future may resume on another thread.

```rust
// Don't. The guard is held across the await; deadlock and Send errors follow.
async fn bad(cache: &std::sync::Mutex<HashMap<K, V>>, k: K) -> Option<V> {
    let guard = cache.lock().unwrap();
    let v = guard.get(&k).cloned();
    write_through(&k).await; // guard still alive here.
    v
}

// Do. Scope the guard, drop it, then await. Sync locks are parking_lot:
// guards return directly, no poisoning unwrap.
async fn good(cache: &parking_lot::Mutex<HashMap<K, V>>, k: K) -> Option<V> {
    let v = { cache.lock().get(&k).cloned() };
    write_through(&k).await;
    v
}
```


For locks genuinely held across awaits, use an async-aware mutex (`tokio::sync::Mutex`) — and question whether the sharing can be removed instead.

## Hot-path discipline

Borrow instead of allocating; `copied` instead of `cloned` on `Copy` types.

```rust
// Don't.
fn total_bad(ids: &Vec<AgentId>) -> u64 {
    ids.iter().map(|id| format!("{id:?}").len() as u64).sum()
}

// Do. Takes a slice, no allocation, returns the sum directly.
fn total(ids: &[AgentId]) -> u64 {
    ids.iter().map(|id| id.0).sum()
}
```

Take `&str`/`&[u8]` at API edges, reuse buffers across calls, and clone only at the moment ownership is genuinely required.
