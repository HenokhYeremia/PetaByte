# Petabyte Audit Report

Generated: 2026-06-20

## Summary

| Metric | Status |
|--------|--------|
| **Total Tests** | 213 passed, 0 failed |
| **Formatting** | Fixed (0 remaining issues) |
| **Clippy Errors** | 0 |
| **Clippy Warnings (original)** | ~450 |
| **Clippy Warnings (after `--fix`)** | ~181 (unique to lib/bench targets) |
| **Auto-fixes applied** | ~270 warnings fixed across all crates |
| **Circular Dependencies** | None |
| **Build** | Clean |

---

## 1. Test Coverage by Crate

| Crate | Tests | Status |
|-------|-------:|--------|
| petabyte-shared | 17 | All pass |
| petabyte-shared-models | 11 | All pass |
| petabyte-scanner | 32 | All pass |
| petabyte-cache-cleaner | 49 | All pass |
| petabyte-core-engine | 29 | All pass |
| petabyte-database | 31 | All pass |
| petabyte-duplicate-detector | 19 | All pass |
| petabyte-hasher | 5 | All pass |
| petabyte-health-score | 20 | All pass |
| petabyte-smart-move | 0 | N/A |
| petabyte-app | 0 | N/A |
| petabyte (src-tauri) | 0 | N/A |
| **Total** | **213** | **100% pass** |

## 2. Formatting

Ran `cargo fmt --all` — all formatting issues resolved. `cargo fmt --all --check` now passes cleanly.

## 3. Auto-Fixes Applied

`cargo clippy --fix --allow-dirty` was run, fixing ~270 warnings across all crates. Types of auto-fixed warnings include:

| Category | Count | Examples |
|----------|-------|----------|
| `format_insecure_args` | ~128 | Variables in `format!` → direct args |
| `redundant_closure` | ~29 | Inline closure into function |
| `useless_vec` | ~10 | `vec![]` → `[]` or `Vec::new()` |
| `let_with_match` / `if_let` | ~5 | Match → if let |
| `redundant_continue` | ~2 | Remove unnecessary continue |
| `unnecessary_debug_fmt` | ~2 | Remove Debug formatting |
| `needless_borrow` | ~3 | Remove unnecessary `&` |
| `clone_on_copy` | ~2 | Remove `.clone()` on Copy types |
| `similar_order` / `sort_by_key` | ~1 | Use sort_by_key |
| `bool_to_int_with_if` | ~4 | Use From for bool→int |
| Others | ~84 | See individual crate totals |

Files modified: 60+ across all 10 crates.

## 4. Remaining Clippy Warnings by Category (after --fix)

| Warning | Count | Description |
|---------|-------|-------------|
| `cast_lossless` (`u64`→`f64`) | 18 | Loss of precision widening |
| `cast_sign_loss` (`u64`→`i64`) | 17 | May wrap on overflow |
| `cast_possible_truncation` (`usize`→`u32`) | 2 | Truncation on 64-bit |
| `cast_possible_truncation` (`u128`→`u64`) | 1 | Truncation possible |
| `cast_sign_loss` (`i64`→`u64`) | 3 | May lose sign |
| `cast_sign_loss` (`u32`→`i32`) | 2 | May wrap |
| `cast_lossless` (`u64`→`usize`) | 2 | Truncation on 32-bit |
| `cast_precision_loss` (`f64`→`u64`) | 1 | Truncation |
| `cast_sign_loss` (`f64`→`u64`) | 1 | May lose sign |
| `bool_to_int_with_if` | 4 | Use `From` for bool→int casts |

### Medium-Impact (idiom & API design)

| Warning | Count | Description |
|---------|-------|-------------|
| `missing_errors_doc` | 109 | `Result`-returning fns missing `# Errors` |
| `missing_must_use` (fns) | 18 | Pure fns should be `#[must_use]` |
| `missing_must_use` (methods) | 92 | Methods returning values should be `#[must_use]` |
| `missing_must_use` (Self-returning) | 9 | Builder-like methods returning Self |
| `let_with_match` / `if_let` | 5 | Simplify `match` to `if let` |
| `redundant_closure` | 29 | Inline closures |
| `manual_char_comparison` | 1 | Use `matches!` |
| `unused_self` | 1 | Remove unnecessary `self` |
| `vec_init_then_push` / useless `vec!` | 10 | Simplify vec initialization |
| `redundant_continue` | 2 | Unnecessary continues |
| `match_arms_with_same_body` | 1 | Collapse arms |
| `unnecessary_literal_unwrap` | 6 | Various `map().unwrap_*` patterns |
| `while_let_loop` | 7 | Convert loops |
| `similar_names` | 6 | Confusingly similar bindings |
| `semicolon_if_nothing_returned` | 3 | Add `;` for consistency |

### Low-Impact (style & minor)

| Warning | Count | Description |
|---------|-------|-------------|
| `format_insecure_args` | 128 | Variables usable directly in `format!` |
| `too_many_arguments` | 2 | Functions with 9+ parameters |
| `too_many_lines` | 1 | Function >100 lines |
| `items_after_statements` | 3 | Items after statements (confusing) |
| `wildcard_imports` | 3 | Use specific imports |
| `let_else` | 1 | Rewrite as `let...else` |
| `implicit_clone` | 1 | Unnecessary `to_vec()` |
| `clone_on_copy` | 2 | Cloning a Copy type |
| `default_implemented` | 3 | Add `Default` impls |
| `unnecessary_debug_format` | 2 | Simplify debug formatting |
| `needless_borrow` | 3 | Unnecessary references |
| `trivially_copy_pass_by_ref` | 2 | Pass by value instead of ref |
| `similar_order` / `sort_by_key` | 1 | Use `sort_by_key` |
| `assert_eq_on_bool` | 1 | Use `assert!` |
| `single_char_pattern` | 1 | Use char not string pattern |
| `unused_import` | 1 | Remove unused import |
| `return_self_not_must_use` | several | Redundant return |
| `error_other` | 2 | Use `io::Error::other` |
| `let_with_match` / `else_if_without_else` | 1 | Collapse if-else |

### Per-Crate Warning Counts (unique, before → after --fix)

| Crate | Lib (before) | Lib (after) | Reduction |
|-------|-------------:|------------:|----------:|
| petabyte-database | 159 | 58 | -63% |
| petabyte-shared-models | 66 | 37 | -44% |
| petabyte-duplicate-detector | 41 | 8 | -80% |
| petabyte-scanner | 35 | 14 | -60% |
| petabyte-health-score | 32 | 19 | -41% |
| petabyte-app | 30 | 15 | -50% |
| petabyte-cache-cleaner | 23 | 5 | -78% |
| petabyte-smart-move | 20 | 5 | -75% |
| petabyte-core-engine | 16 | 12 | -25% |
| petabyte-shared | 15 | 0 | -100% |
| petabyte-hasher | 13 | 7 | -46% |

## 4. Dependency Graph

```
petabyte (binary)
 └── petabyte-app
     └── petabyte-shared, petabyte-shared-models

petabyte-cache-cleaner
 ├── petabyte-shared, petabyte-shared-models
 └── external: chrono, regex, serde_yaml, trash, walkdir

petabyte-core-engine
 ├── petabyte-shared, petabyte-shared-models
 └── external: uuid

petabyte-database
 ├── petabyte-scanner, petabyte-shared, petabyte-shared-models
 └── external: rusqlite, uuid

petabyte-duplicate-detector
 ├── petabyte-shared, petabyte-shared-models
 └── external: blake3, rayon

petabyte-hasher
 ├── petabyte-shared, petabyte-shared-models
 └── external: blake3

petabyte-health-score
 ├── petabyte-shared, petabyte-shared-models
 └── external: chrono

petabyte-smart-move
 ├── petabyte-shared, petabyte-shared-models
 └── external: blake3, trash, uuid

petabyte-scanner (leaf)
petabyte-shared (leaf)
petabyte-shared-models (leaf)
```

**No circular dependencies.** The dependency DAG is clean:
- `petabyte-shared` and `petabyte-shared-models` are foundational leaves (no internal deps).
- `petabyte-scanner` is a leaf.
- All other crates depend only on shared foundations + external crates.

## 5. Recommendations (Priority Order)

1. **Fix cast warnings** (cast_lossless, cast_sign_loss, cast_possible_truncation) — ~47 issues with real bug potential
2. **Address `missing_errors_doc`** (109) — improve API documentation
3. **Add `#[must_use]`** (119 total) — prevent ignored return values
4. **Reduce function arguments** in the 2 functions with 9+/7+ params
