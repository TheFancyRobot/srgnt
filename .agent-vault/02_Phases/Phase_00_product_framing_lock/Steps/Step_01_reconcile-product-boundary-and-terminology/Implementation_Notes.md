# Implementation Notes

- Framework evidence: the later product architecture uses `workspace` as the user-facing model and desktop-first as the product boundary.
- The roadmap was previously about vault evolution rather than product delivery.
### Refinement (readiness checklist pass)

**Exact outcome**: A pull-request-style diff to the Roadmap, Phase 00, Phase 01, and DEC-0001 notes that replaces vault-maintenance language with desktop-first workspace language. Plus a new note `.agent-vault/06_Shared_Knowledge/terminology_rules.md` defining when to use `workspace`, `artifact`, `connector`, `skill`, `executor`, and `vault`.

**Output location**: Terminology rule set lives at `.agent-vault/06_Shared_Knowledge/terminology_rules.md`. All other changes are inline edits to existing notes.

**Constraints**:
- Do not remove historical Obsidian references where they explain the project's evolution.
- The framework document (`srgnt_framework.md`) is read-only; it is the source of truth, not an edit target.
- Language changes must be consistent with DEC-0001 (desktop-first boundary).

**Validation**:
- After edits, search the Roadmap and Phase 00-01 notes for the terms `vault maintenance`, `vault evolution`, `Obsidian-only`. Zero matches = pass.
- The terminology rules note exists and defines at least the 6 terms listed above.
- DEC-0001 is still accurately represented (no contradictions introduced).

**Edge cases**: The `.agent-vault/` directory itself is legitimately called a "vault" — the terminology rules must distinguish between the planning vault (agent-vault) and the user-facing workspace product.

**Junior-readiness verdict**: PASS with the above refinements. A junior developer can execute this step by following the 6-item execution prompt, producing edits to known files and one new terminology note.
**Security considerations**: N/A — this step only edits vault markdown notes. No code, auth, secrets, or user data involved.

**Performance considerations**: N/A — documentation-only step with no runtime behavior.

## Related Notes

- Step: [[02_Phases/Phase_00_product_framing_lock/Steps/Step_01_reconcile-product-boundary-and-terminology|STEP-00-01 Reconcile Product Boundary And Terminology]]
- Phase: [[02_Phases/Phase_00_product_framing_lock/Phase|Phase 00 product framing lock]]
