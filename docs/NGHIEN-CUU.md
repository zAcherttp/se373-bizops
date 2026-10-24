# Nghiên cứu nền · Business Ops Agent

Tổng hợp ban đầu ngày 10/10/2026; đồng bộ hướng thiết kế ngày 15/10/2026 theo đề xuất kiến trúc lúc đó (issue [#16](https://github.com/zAcherttp/se373-bizops/issues/16)). Kiến trúc hiện hành ở [ARCHITECTURE.md](ARCHITECTURE.md) (24/10/2026); chỗ nào khác thì ARCHITECTURE.md thắng. Tài liệu này là nghiên cứu, không phải ADR. Các nhận định về sản phẩm/model và giá cần xác minh lại trước khi triển khai; không dùng bảng so sánh cũ làm bằng chứng một framework thiếu năng lực.

## 1. Các hệ thống tham khảo

| | Hermes Agent | OpenClaw | Grok Bot | OpenAI Dots |
|---|---|---|---|---|
| Là gì | agent tự cải thiện, tự host; Nous Research, MIT, Python ([repo](https://github.com/NousResearch/hermes-agent)) | agent local điều khiển qua app nhắn tin; MIT, TypeScript ([repo](https://github.com/openclaw/openclaw)) | đội bot của xAI, mỗi bot có máy tính trên cloud, beta 11/08/2026 ([x.ai](https://x.ai/news/introducing-grok-bot)) | agent luôn chạy trong ChatGPT, ra mắt DevDay 29/09/2026 ([9to5google](https://9to5google.com/2026/09/29/openai-dots-agent/)) |
| Điều phối và phân vai | `delegate_task` sinh subagent; bảng Kanban điều phối các profile | mỗi agent một workspace; định tuyến theo kênh, "luật cụ thể nhất thắng" | bot điều phối; **mỗi bot một việc chính** | mỗi người một Dot; Dot chuyên trách cho tổ chức đang preview |
| Kênh chat | gateway 25+ nền tảng | 20+ kênh | app, Slack | ChatGPT, Slack, Teams |
| Báo cáo theo lịch | cron, mỗi lần chạy một phiên mới, gửi kết quả lên kênh | cron và heartbeat 30 phút | routine theo lịch hoặc sự kiện | việc định kỳ, mục tiêu đứng |
| Nhớ qua nhiều phiên | `MEMORY.md` và `USER.md` nhỏ, tìm lại phiên cũ bằng FTS5 | `MEMORY.md` và ghi chú theo ngày, tìm lai vector và từ khoá | memory theo bot; dữ liệu gốc phải nằm ở hệ thống chính | người dùng không xem hay sửa được memory (chưa kiểm chứng) |
| Tự tạo skill | `skill_manage`; **duyệt tắt mặc định**, bật thì skill chờ ở thư mục pending, xem diff rồi duyệt | Skill Workshop, áp dụng ngay, có phiên bản để hoàn tác, **không có bước duyệt** | skill học từ thao tác mẫu chỉ là **bản nháp** | không có |
| Phân quyền | allowlist/pairing và profile; chưa xác minh đáp ứng RBAC nghiệp vụ của nhóm | allow/deny tool theo agent | các bot dùng chung một máy, "không phải ranh giới bảo mật" | danh tính riêng cho Dot chuyên trách (preview) |
| Duyệt hành động tốn tiền | có gate lệnh và tool hook; cần thiết kế riêng quyền duyệt nghiệp vụ, action/version và hạn duyệt | duyệt lệnh exec, không ai trả lời thì từ chối | mua, gửi, xoá đều phải duyệt; "hỏi trước thắng"; hết hạn sau khoảng 10 phút | auto-review hành động, agent không sửa được bộ kiểm |

Ba ý tưởng đáng học từ các hệ thống khác:
- **Paperclip** ([repo](https://github.com/paperclipai/paperclip)): mô hình công ty như sơ đồ tổ chức; ngân sách theo agent dừng cứng; mọi duyệt và chi phí vào nhật ký kiểm toán.
- **Salesforce Agent Script** ([docs](https://architect.salesforce.com/docs/architect/fundamentals/guide/hybrid-reasoning-agentforce-builder-agent-script)): "quyết định nào viết được bằng code thì phải viết bằng code"; hành động chỉ hiện ra khi điều kiện trước đã thoả, và LLM không được tự đặt biến điều kiện.
- **Microsoft Entra Agent ID** ([docs](https://learn.microsoft.com/en-us/entra/agent-id/agent-blueprint)): mỗi agent có danh tính riêng, khai báo trước quyền truy cập cần có, admin duyệt, mọi hành động được ghi lại.

Rủi ro đã được ghi nhận: skill và memory học được là bề mặt tấn công. Đầu độc một loại trạng thái lâu dài làm tỉ lệ tấn công OpenClaw tăng từ 24,6% lên 64–74% ([arXiv 2604.04759](https://arxiv.org/abs/2604.04759)). Tháng 2/2026 có 341 skill độc hại trên ClawHub ([The Hacker News](https://thehackernews.com/2026/02/researchers-find-341-malicious-clawhub.html)).

## 2. Hướng thiết kế: hơn một bản sao Hermes ở đâu

Bản thiết kế để nhóm review nằm ở [ARCHITECTURE.md](ARCHITECTURE.md); không duy trì một kiến trúc song song tại đây. Hướng đề xuất:

1. **Hỗ trợ nhân viên:** specialist thực thi thay mặt principal đã xác thực; phân vai không cấp quyền.
2. **Core tin cậy + extension:** identity, policy, approval, lifecycle và audit bắt buộc; phòng ban, connector, channel và model theo contract rõ ràng.
3. **Tool theo scope:** lọc catalog theo quyền; kiểm lại tool, tham số và record lúc thực thi. Delegation chỉ giữ hoặc thu hẹp quyền.
4. **Request bền:** admission, checkpoint, lease/heartbeat, recovery và escalation có chủ; không mất việc im lặng; retry không lặp hành động chi tiền.
5. **Duyệt ngoài LLM:** phiếu gắn action/version, số tiền, người duyệt và hạn; resume kiểm lại quyền.
6. **Memory/skill có nguồn và scope:** bản tóm tắt giữ policy của nguồn; không tự học dữ liệu riêng vào bộ nhớ chung. Skill mới qua eval và người duyệt trước activation.
7. **Audit và chi phí:** phân biệt transcript, ledger quyền/hành động và ledger usage/cost; hạn chế payload nhạy cảm. Chi phí ước tính phải phân biệt với bill đã đối soát.
8. **Theo phase:** làm vertical slice có demo/eval/trace trước; RAG/persistence/workflow ở phase 2, multi-agent/MCP ở phase 3.

Hermes hiện có durable Kanban, bounded delegation, staged skill writes và tool approval hooks. Tham khảo [source snapshot đã khảo sát](https://github.com/NousResearch/hermes-agent/tree/dfa79389773271ee78c41a7af340848948d461ee); đây là khảo sát tĩnh, chưa phải runtime/security benchmark. Quyền nghiệp vụ của nhóm vẫn phải được kiểm chứng riêng.

## 3. Framework: hướng TypeScript, scaffold Python hiện tại

Theo cập nhật giảng viên do người dùng cung cấp (17/10/2026), Python/LangGraph không bắt buộc. Hướng đề xuất là agent core TypeScript tự xây; scaffold Python hiện tại chưa migrate. Giữ contract adapter JSON cho endpoint không có native tool calling và test offline bằng model giả. Nhóm phải hiểu trách nhiệm, state và failure/recovery của từng module.

DeepSeek Harness dùng **Cordis**, không phải Cortex. Mượn contract dịch vụ, khai báo dependency, lifecycle và cấu hình composition; Cordis là candidate dependency composition cần đánh giá, chưa chốt. Bắt đầu bằng package registry lúc startup, không hot reload hay marketplace plugin không tin cậy. Một plugin in-process không phải security sandbox.

Các connector, retrieval/store và channel là interface đổi được. Capability khai báo permission cần dùng; backend mới cấp và kiểm quyền thực tế. Tình trạng support RAG/memory/channel của DSH thay đổi theo extension và cần đánh giá riêng, không khẳng định là không có. Xem [DeepSeek Harness architecture](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.md).

## 4. System 1: model quyết định nhanh (Jev, Laya)

Đây là **thử nghiệm tùy chọn**, chưa chọn Jev/Laya hay backend khác. Candidate: routing phòng ban, phân loại request, answerability và escalation. So sánh với rule và LLM structured output trên cùng tập eval: accuracy, unsafe false acceptance, latency, cost và fallback. Không dùng classifier để cấp quyền, công bố memory/skill nhạy cảm hay thay duyệt chi tiền bắt buộc. Các claim về license, availability và giá cần xác minh trước khi chọn.

## 5. Model

Thông tin model/giá dưới đây là ghi chú nghiên cứu ban đầu, không phải lựa chọn kiến trúc hay bảng giá billing đã xác nhận. Cost Accounting dùng price catalog có version và đối soát provider; không hard-code các giá này vào ledger.

Baseline có tool calling native: Claude Haiku 5.5 (`claude-haiku-5-5`, $0,10 / $0,50 mỗi triệu token input/output với prompt dưới 100K) hoặc DeepSeek V4. Gemma 4 26B và Qwen3.8-27B của trường là profile model yếu (chỉ trong Wi-Fi trường, context 32K, không tool calling native). Chạy cùng bộ eval trên các model để thấy phần nào do harness gánh.

Scaffold Python hiện tại đổi provider bằng `init_chat_model("anthropic:…" / "deepseek:…" / "openai:…")` (langchain-anthropic
1.7.5, langchain-deepseek 1.1.1 có `deepseek-v4-flash` và `deepseek-v4-pro`). Mỗi model một
**profile harness** khai báo trong `models.yaml`: profile mạnh dùng tool calling native và ít
middleware; profile yếu dùng `JsonToolChat`, chọn bớt tool mỗi bước (`LLMToolSelectorMiddleware`),
retry, giới hạn chặt hơn, nén context sớm hơn. Bộ eval là pytest chạy lặp qua các profile.

## 6. Pi Durable: execution contract (17/10/2026)

Khảo sát README/spec ở [commit 8efd314](https://github.com/earendil-works/pi/tree/8efd314fa3d3232ce197d8d7a6a5660530b9d83e/packages/durable), chưa chạy benchmark. Pi Durable chỉ làm reference và testbed so sánh tùy chọn, không phải runtime dependency. Core agent là Python + LangGraph ([ADR 003](decisions/003-python-langgraph.md)); tool contract và recovery category ở [ARCHITECTURE.md §4.6](ARCHITECTURE.md#46-tool-gateway--mcp-servers-l4).

Mượn durable admission, committed progress, task ownership, wait không đồng nghĩa cancel, explicit replay policy và usage theo attempt. Nhóm đề xuất ba nhánh recovery: safe_to_repeat / reconcile_first / human_resolution_required. Call bên ngoài bị ngắt là unknown đến khi đối soát; không tự mua/gửi lại. Tool contract gắn quyền, approval, operation/receipt, recovery và metering; nested call vẫn qua gate, chi phí child không cộng hai lần.

Giới hạn nguồn: package experimental, storage một process sở hữu và không có cross-process locking; cấu hình SQLite mặc định không bảo đảm không mất commit mới nhất khi host/power failure. Không coi guard extension tùy chọn là policy bắt buộc của sản phẩm.

## 7. Workspace, thiết bị và notification (17/10/2026)

Ghi chú lịch sử từ đề xuất 18/10 (đã để sau, xem [ARCHITECTURE.md §1.3](ARCHITECTURE.md#13-ngoài-phạm-vi)): server giữ authority/lifecycle; workspace độc lập laptop; device mất kết nối chuyển wait có deadline, reconnect event và backoff không gọi model. Delivery Service dùng blocker chung để dedup, ack, reminder và escalation đa kênh theo policy. VM chỉ là spike P3 giới hạn, không phải bằng chứng durable hoặc HA. Agent map tổ chức chỉ tạo cấu hình dự thảo có nguồn để người duyệt; strict on-prem phải giải quyết ngoại lệ chat/model ngoài mạng. Các thử nghiệm optional phải chứng minh lợi ích so với baseline và không làm trượt mandatory coverage.

## Thuật ngữ hiện hành

Dùng [NAMING.md](NAMING.md): Request Runtime, Scheduler, Dispatcher, Coordinator, Department Specialist, Worker, Workspace, Tool Gateway, Supervisor, Delivery Service, Audit Ledger, Usage Ledger và Cost Accounting. Thuật ngữ của upstream giữ nguyên khi mô tả nguồn; tên logical component không đồng nghĩa process riêng. Runtime/language selection là quyết định tách biệt.
