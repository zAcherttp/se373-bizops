# Architecture vocabulary

Updated 2026-10-17. Canonical names from the 2026-10-18 proposal, now folded into [ARCHITECTURE.md](ARCHITECTURE.md) (2026-10-24; it wins on any conflict), and [SE373.tldr](SE373.tldr). This is a terminology change, not a runtime implementation or new deployment topology. Code names are English; employee-facing labels can be localized.

## Business and execution records

| Canonical internal name | Employee-facing label | Meaning |
|---|---|---|
| `WorkRequest` | Request / Yêu cầu | Employee objective, responsible owner, scope, completion conditions and lifecycle |
| `Run` | Run / Lượt thực hiện | One application execution attempt for a WorkRequest; retries/resume follow the explicit attempt policy |
| `Conversation` | Conversation / Hội thoại | Interaction history; can discuss several WorkRequests |
| `Task` | Step / Task | Persisted executable unit with checkpoint, ownership and outcome |
| `Blocker` | Needs attention / Cần xử lý | Unmet dependency, question, approval or device condition with owner, deadline and next action |
| `Approval` | Approval / Phiếu duyệt | Authorized decision bound to the exact proposed action/version and validity period |
| `OperationReceipt` | Evidence / Bằng chứng | Recorded observation/receipt for a tool operation; distinguish confirmed effect from unknown outcome |
| `Artifact` | Result / Tệp kết quả | Produced report/file/output with provenance, version and access policy |
| `Workspace` | Workspace / Không gian làm việc | Authorized execution environment and its persisted resources, not the worker process |
| `Worker` | Usually hidden | Process/device that executes assigned work inside an eligible Workspace/environment |
| `SkillVersion` | Skill / Quy trình dùng lại | Specific reviewed version of reusable instructions |
| `ExecutionContext` | Usually hidden | Server-created principal, effective authority, resource scope and correlation IDs; distinct from model context |
| `CompanyProfile` | Company configuration / Cấu hình doanh nghiệp | Versioned organization, enabled capabilities, workflow and connector bindings |

One Conversation may reference several WorkRequests. A WorkRequest may have multiple Runs, and each Run may execute Tasks and delegate child work. A process restart is not inherently a new business request or permission grant. Stable business operation IDs remain distinct from per-attempt IDs, so recovery does not duplicate actions.

## Logical components

| Canonical name | Responsibility |
|---|---|
| **Request Runtime** | Owns WorkRequest lifecycle and permitted transitions; links Run/Task/checkpoint records |
| **Scheduler** | Determines when persisted work, deadlines or reminders become eligible |
| **Dispatcher** | Selects where eligible work runs, considering worker capability, data location, scope and resource limits |
| **Coordinator** | Model-driven interpretation, bounded decomposition and permitted synthesis |
| **Department Specialist** | Focused department expertise under the originating principal's authority |
| **Supervisor** | Detects stalled/abandoned work and initiates recovery or assigned escalation through Request Runtime |
| **Tool Gateway** | Enforces tool contracts, authorization, approval, recovery requirements and metering for every call |
| **CapabilityRegistry** | Holds capability definitions and contracts; discovery is filtered by authority |
| **Skill Registry** | Holds SkillVersions, review status and scope; approval never grants tool authority |
| **Delivery Service** | Routes messages through channel adapters; tracks attempts, acknowledgement callbacks and reminder delivery |
| **Audit Ledger** | Restricted append-oriented authority/action/outcome events; separate from conversation transcripts |
| **Usage Ledger** | Metered consumption and attempt-level provenance, including unknown/pending usage |
| **Cost Accounting** | Applies versioned rates, reconciles charges/invoices and allocates shared costs without double counting |

Request Runtime owns Blocker lifecycle; Delivery Service delivers its messages and forwards authenticated acknowledgements/resolution inputs. A delivery receipt cannot itself resolve the underlying business problem. Supervisor requests valid transitions rather than maintaining a conflicting task-state store. Mandatory policy enforcement remains backend code.

Scheduler decides **when**; Dispatcher decides **where**; Worker **executes**; Supervisor handles **stalled execution**; Coordinator handles **reasoning**. These are responsibilities, not a requirement for separate processes or microservices. A small implementation can combine them without conflating their contracts.

## Naming conventions and boundaries

- **Registry:** definitions/registrations, e.g. CapabilityRegistry and Skill Registry.
- **Store:** current persisted records, e.g. Request Store and Artifact Store.
- **Ledger:** attributable audit/accounting events; confidential payloads are minimized and access-controlled.
- Avoid `CoreAgent`, `Factory` or `Observer` as catch-all names. Name the concrete responsibility.
- Use `executor` only as a generic deployment capability or existing contract field; name the executing actor Worker and its environment Workspace. This change does not rename YAML keys or existing public APIs.
- Keep employee-facing wording simple: Request, Needs attention, Approval, Result. Technical entities remain in inspection views unless they help the employee act.

## Pi Durable reference vocabulary

When studying Pi, preserve its actual names: `Harness`, `Session`, `Submission` and `Task`. A Pi Session is a storage/runtime scope, not our company boundary. A Pi Submission is admitted conversation input, not automatically a WorkRequest. These describe the reference, not APIs we must implement.

Pi's `run` (input-to-answer turns) is not automatically the application's `Run` attempt. Similar names do not guarantee equivalent lifecycles. Our authored core owns Task IDs, checkpoints and recovery; there is no Pi scheduler underneath it.

## Runtime selection is separate

Superseded by [ADR 003](decisions/003-python-langgraph.md) (2026-10-24): the agent core is Python 3.12 + LangChain 1.x + LangGraph; `agent/runtime/` (TypeScript) and Pi Durable are reference only. DSH and Cordis are not our runtime. Each module must be explainable as described in ARCHITECTURE.md; one execution owner and mandatory security/recovery contracts remain required.
