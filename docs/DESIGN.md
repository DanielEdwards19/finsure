# Mortgage Intelligence — Design and Behaviour Rules

Prototype for the Finsure broker network. Fictional data throughout. This file
records every rule the prototype has been built to follow, so the behaviour
survives a move to a repository and further development.

---

## 1. What this prototype is

A hardcoded, deterministic prototype of a broker workspace. Three workflows:

1. **Network intelligence** — natural-language queries over a fictional network of 30 branches, 100 brokers, 200 applications, resolved from records rather than prose.
2. **Residential email compliance review** — evidence-anchored findings over an 18-thread email archive.
3. **Commercial loan application** — a guided setup driven by one central application-state object, with document analysis that prefills the application.

Nothing calls a network service. There is no backend, no OCR, no upload, no
storage, no lender integration and no credit decision. Every result is either a
hardcoded fact or a value computed from hardcoded records.

---

## 2. Non-negotiable guardrails

These are product-safety rules, not stylistic preferences.

- **Never state that a file is compliant or non-compliant.** The compliance workflow reports evidence found, potential gaps and items requiring review. Human assessment is always required, and that is stated on screen.
- **No legal or credit advice.** No statement that an application is approved, will be approved, or is "guaranteed suitable".
- **No superlatives in lender results.** The only permitted result language is: `Proposed option`, `Suitable alternative for consideration`, `Policy confirmation required`, `Insufficient information to assess`, `Not presently preferred`. Never "best", "cheapest" or "recommended lender".
- **Absence of a document is never proof of absence of a fact.** Missing files produce "Information required" or "Requires review", never a negative finding. `INTENTIONAL_GAPS` in `commercial-docs.js` encodes this explicitly.
- **Every simulated figure is labelled.** Rates, repayments, DSCR and calculator outputs carry an indicative-simulation label. Lender product names and publicly described features are real (checked 4 August 2026); pricing is not.
- **Every extracted or derived value carries its source.** Sources are one of: `Read from the supporting documents`, `Broker-provided during guided setup`, `Existing client record`, `System calculation — indicative`. Nothing appears on the canvas without one.
- **Prototype documents are marked as fictional.** `PROTOTYPE_LABEL` appears on every document preview.

---

## 3. Data integrity rules

- **One central state object.** The commercial application is a single state object (`createApp` in `commercial.js`). The chat asks questions; the canvas renders the application. Both read the same derived model, so they cannot disagree.
- **Everything derived is recomputed.** `deriveFields`, `docRegister`, `activeFindings`, `progression`, `canvasSections` are all pure functions of the answer set. Changing an earlier answer can never leave a stale fact behind.
- **Relationships by identifier, never by display name.** `branchId` (`BR-*`), `brokerId` (`BROKER-*`), `clientId` (`CLI-*`), `applicationId` (`APP-*`). Access scoping and every lookup resolve through these.
- **No per-customer hardcoded prose.** Query answers are computed from the records in `data.js` by `query.js`. Adding a record must change the answers with no other edits.
- **Findings are anchored to real evidence.** Every compliance finding resolves to an actual message in `emails.js` with author, date and subject, and every extracted field to a document, page and section in `commercial-docs.js`.

---

## 4. Access control

Three fixed identities in `access.js`. Switching identity changes the
**accessible dataset** everywhere, not just the displayed name:

| Identity        | Level        | Scope                                   |
| --------------- | ------------ | --------------------------------------- |
| Brendan Chapman | organisation | All branches, brokers, clients, lenders |
| Leo Bell        | branch owner | One branch and its brokers              |
| Rachael Nguyen  | broker       | Own clients and applications            |

Scope is applied by `setScope` in `query.js` and `compliance.js`, so markers,
tables, KPIs and findings all narrow together. Map layers available per identity
come from `LAYERS_FOR`.

---

## 5. Commercial application model

### 5.1 Progression effects

Every controlled answer option carries deterministic effects: canvas fields,
document requirements, findings, a progression effect and a route. Effects,
most restrictive first (`commercial-flow.js`):

| Effect  | Meaning                                                            | Comparison state                                   |
| ------- | ------------------------------------------------------------------ | -------------------------------------------------- |
| `BLOCK` | Mandatory identity, authority or classification unresolved         | Comparison blocked — no product cards shown at all |
| `PAUSE` | A material fact needs broker review before a meaningful comparison | Comparison paused                                  |
| `COND`  | May proceed with visible assumptions and conditions                | Available with conditions                          |
| `INFO`  | Recorded for the file                                              | No effect                                          |

The most restrictive active effect wins. When blocked, product cards are not
rendered — nothing on screen may hint at a lender.

### 5.2 Minimum information gate

`GATE` must be satisfied before any product matching begins: borrower and entity
recorded, authority and privacy status recorded, purpose, security, amount and
trading history. `CHECKS` runs continuously as a review panel alongside it.

### 5.3 Finalisation

`CONFIRMATIONS` are explicit broker attestations (information reviewed, purpose
and consumer-credit consideration, comparison basis, client choice). `canFinalise`
requires all of them plus a clear progression state. A recommendation cannot be
recorded before the comparison has been opened.

### 5.4 Field states

`Broker confirmed` / `Ready for broker confirmation` → good, `Requires review` /
`Needs reconfirmation` → warn, `Information required` → bad. Document states:
`Obtained`, `Outstanding`, `Requires clarification`, `Not applicable`.

---

## 6. Document analysis rules

The Harbourview pack (11 documents, `commercial-docs.js`) is the prototype's
document workflow.

- **Documents come first.** "Do you have the client's documents to upload?" is the first question in the flow.
- **No file picker.** After authority and privacy confirmation, one action attaches the whole bundled pack. Analysis runs five mocked progress states, then reads the hardcoded source map.
- **Identity is detected, not asked.** ABN and legal name are matched from the company extract (`CLIENT_MATCH`) against `CLIENT_BOOK`.
- **Suppression rule.** A questionnaire question is suppressed _only_ when its field is current, consistent and broker-confirmed. Extracted values always remain reviewable and source-linked.
- **Confidence and review state.** Each extracted field carries a confidence and a review state (`awaiting broker confirmation`, `cross-checked, awaiting broker confirmation`, etc). High-confidence fields can be confirmed in bulk; nothing is silently accepted.
- **Conflicts pause, they do not overwrite.** An extracted value that contradicts a recorded one raises a conflict; lender comparison pauses until it is resolved.
- **Draft documents never resolve a fact.** The draft occupancy plan stays `Requires review`.
- **Removing a document recalculates.** Withdrawing an attachment withdraws the answers it produced.

---

## 7. Visual system

Dark teal, single scale, Inter throughout. No stylesheet classes — all styling is
inline (see §8).

**Colour**

| Token                    | Value                                                                 |
| ------------------------ | --------------------------------------------------------------------- |
| Page background          | `linear-gradient(180deg,#002D37 0%,#004E5F 100%)`                     |
| Sign-in background       | `linear-gradient(163.884deg,rgb(1,29,34) 13.74%,rgb(0,16,19) 98.76%)` |
| Surface / panel          | `rgb(1,28,34)`                                                        |
| Inset / code surface     | `rgb(7,8,9)`                                                          |
| Hairline border          | `rgb(43,45,49)`                                                       |
| Primary text             | `#fff`                                                                |
| Secondary text           | `#a0a2a6`                                                             |
| Tertiary / placeholder   | `rgb(130,130,130)`                                                    |
| Accent (selection, warn) | `rgb(255,153,0)`                                                      |
| Good                     | `rgba(120,255,190,.14)` fill, `rgb(190,255,225)` text                 |
| Warn                     | `rgba(255,153,0,.16)` fill, `rgb(255,214,150)` text                   |
| Bad                      | `rgba(255,120,110,.16)` fill, `rgb(255,190,185)` text                 |
| Muted                    | `rgba(255,255,255,.06)` fill, `rgb(160,162,166)` text                 |
| Link                     | `#8fb0ff`, hover `#b5caff`                                            |

**Type** — Inter 400/500/600 only. Display 32px/500, page title 28px/500,
section title 17px/600, body 15px, secondary 12.5–13px, pill and meta 11.5px,
label caps 11px/600 with `.06em` letter-spacing.

**Shape** — panels `18px`, cards `12px`, logo tiles `8px`, pills `999px`.
Pills are `7px 11px` with a `1px` inset ring rather than a border.

**Motion** — three keyframes only: `miIn` (6px rise + fade, for entering
content), `miSpin` (loading), `miShimmer` (pending/analysing states).
Glass surfaces use `rgba(0,20,25,0.9)` with `backdrop-filter: blur(8px)`.

**Iconography** — SVG masks tinted with `background`, never inline colour.
Lender marks are real supplied PNGs normalised to a 256px square on a white
`36px` tile; a lender with no supplied file falls back to a monogram badge
(`lenders.js`).

**Layout** — desktop canvas fills available width (no max-width cap); mobile is a
sheet-based stack with a five-item bottom tab bar (Home, History, Help, News,
Account) and hit targets at or above 44px.

---

## 8. Code conventions

- **Design Component format.** `Mortgage Intelligence.dc.html` is a single component: template markup, then one `Component extends DCLogic` logic class. `support.js` is the runtime and is not hand-edited.
- **Inline styles only.** No CSS classes. The only rules in `<helmet><style>` are body resets, the font link, keyframes and scrollbar styling — things that cannot be inline.
- **No expressions in template holes.** `{{ dotted.path }}` only. Everything computed lives in `renderVals()`.
- **Static values are literals, not holes.** A hole is used only for a genuinely live runtime value.
- **Logic modules are plain ES modules** loaded with dynamic `import()` on mount, in one `Promise.all`. No npm, no build step, no cycles.
- **Australian English** in all copy. Dates as `4 August 2026`, currency as `$2,420,000`.
- **Copy voice** — matter-of-fact and specific. State what is known, its source and what remains outstanding. No reassurance, no marketing language, no emoji.

---

## 9. File map

| File                            | Lines  | Role                                                                           |
| ------------------------------- | ------ | ------------------------------------------------------------------------------ |
| `Mortgage Intelligence.dc.html` | ~6,460 | The entire UI: sign-in, dashboard, map, chat, lists, commercial canvas, mobile |
| `support.js`                    | —      | Design Component runtime (generated; do not edit)                              |
| `commercial.js`                 | ~1,420 | Central application-state engine, client book, scenarios                       |
| `commercial-flow.js`            | ~870   | Question matrix, document catalogue, findings, gate, checks, progression       |
| `commercial-docs.js`            | ~240   | Harbourview pack manifest, source map, extraction result, intentional gaps     |
| `commercial-products.js`        | ~260   | Lender products, calculator, comparison, result vocabulary                     |
| `data.js`                       | ~5,850 | Generated network data: branches, brokers, applications                        |
| `emails.js`                     | ~1,610 | Generated email archive: 18 threads, 77 messages                               |
| `query.js`                      | ~450   | Entity resolution and computed query answers                                   |
| `compliance.js`                 | ~580   | Residential email compliance rules and findings                                |
| `documents.js`                  | ~190   | Julie Smith client-file document records                                       |
| `timeline.js`                   | ~125   | Residential pipeline and next-action guidance                                  |
| `lenders.js`                    | ~160   | Lender identity, logos, offices                                                |
| `access.js`                     | ~115   | Three identities and dataset scoping                                           |

Static assets: `assets/` (logo, icons, file-type icons, lender marks),
`files/julie-smith/` (residential client file), and
`uploads/Harbourview_COM-DEMO-0001_Prototype_Document_Pack/` (commercial pack).

---

## 10. Running it

Serve the folder over HTTP — the ES module imports will not resolve from
`file://`:

```
python3 -m http.server 8000
```

Then open `http://localhost:8000/Mortgage%20Intelligence.dc.html`.

---

## 11. Rules for extending it

1. Add data, not prose. A new branch, broker or application must flow through `query.js` without touching answer text.
2. New answer options must declare their full effect set: fields, documents, findings, progression effect, route.
3. Any new figure on screen needs a source label and, if simulated, a simulation label.
4. Never add a result state outside the permitted result vocabulary.
5. Keep styling inline. Introducing a stylesheet breaks the streaming render.
6. Preserve the identifier-based relationships; do not match on display names.
