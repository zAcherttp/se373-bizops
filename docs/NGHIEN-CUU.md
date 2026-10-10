# Nghiên cứu nền · Business Ops Agent

Tổng hợp ngày 10/10/2026. Mỗi nhận định có nguồn; mục nào chưa kiểm chứng được thì ghi rõ.

## 1. Các hệ thống tham khảo

| | Hermes Agent | OpenClaw | Grok Bot | OpenAI Dots |
|---|---|---|---|---|
| Là gì | agent tự cải thiện, tự host; Nous Research, MIT, Python ([repo](https://github.com/NousResearch/hermes-agent)) | agent local điều khiển qua app nhắn tin; MIT, TypeScript ([repo](https://github.com/openclaw/openclaw)) | đội bot của xAI, mỗi bot có máy tính trên cloud, beta 11/08/2026 ([x.ai](https://x.ai/news/introducing-grok-bot)) | agent luôn chạy trong ChatGPT, ra mắt DevDay 29/09/2026 ([9to5google](https://9to5google.com/2026/09/29/openai-dots-agent/)) |
| Điều phối và phân vai | `delegate_task` sinh subagent; bảng Kanban điều phối các profile | mỗi agent một workspace; định tuyến theo kênh, "luật cụ thể nhất thắng" | bot điều phối; **mỗi bot một việc chính** | mỗi người một Dot; Dot chuyên trách cho tổ chức đang preview |
| Kênh chat | gateway 25+ nền tảng | 20+ kênh | app, Slack | ChatGPT, Slack, Teams |
| Báo cáo theo lịch | cron, mỗi lần chạy một phiên mới, gửi kết quả lên kênh | cron và heartbeat 30 phút | routine theo lịch hoặc sự kiện | việc định kỳ, mục tiêu đứng |
| Nhớ qua nhiều phiên | `MEMORY.md` và `USER.md` nhỏ, tìm lại phiên cũ bằng FTS5 | `MEMORY.md` và ghi chú theo ngày, tìm lai vector và từ khoá | memory theo bot; dữ liệu gốc phải nằm ở hệ thống chính | người dùng không xem hay sửa được memory (chưa kiểm chứng) |
| Tự tạo skill | `skill_manage`; **duyệt tắt mặc định**, bật thì skill chờ ở thư mục pending, xem diff rồi duyệt | Skill Workshop, áp dụng ngay, có phiên bản để hoàn tác, **không có bước duyệt** | skill học từ thao tác mẫu chỉ là **bản nháp** | không có |
| Phân quyền | chỉ allowlist người dùng, **không có RBAC** | allow/deny tool theo agent | các bot dùng chung một máy, "không phải ranh giới bảo mật" | danh tính riêng cho Dot chuyên trách (preview) |
| Duyệt hành động tốn tiền | chỉ duyệt lệnh shell nguy hiểm, quá 300 giây thì từ chối | duyệt lệnh exec, không ai trả lời thì từ chối | mua, gửi, xoá đều phải duyệt; "hỏi trước thắng"; hết hạn sau khoảng 10 phút | auto-review hành động, agent không sửa được bộ kiểm |

Ba ý tưởng đáng học từ các hệ thống khác:
- **Paperclip** ([repo](https://github.com/paperclipai/paperclip)): mô hình công ty như sơ đồ tổ chức; ngân sách theo agent dừng cứng; mọi duyệt và chi phí vào nhật ký kiểm toán.
- **Salesforce Agent Script** ([docs](https://architect.salesforce.com/docs/architect/fundamentals/guide/hybrid-reasoning-agentforce-builder-agent-script)): "quyết định nào viết được bằng code thì phải viết bằng code"; hành động chỉ hiện ra khi điều kiện trước đã thoả, và LLM không được tự đặt biến điều kiện.
- **Microsoft Entra Agent ID** ([docs](https://learn.microsoft.com/en-us/entra/agent-id/agent-blueprint)): mỗi agent có danh tính riêng, khai báo trước quyền truy cập cần có, admin duyệt, mọi hành động được ghi lại.

Rủi ro đã được ghi nhận: skill và memory học được là bề mặt tấn công. Đầu độc một loại trạng thái lâu dài làm tỉ lệ tấn công OpenClaw tăng từ 24,6% lên 64–74% ([arXiv 2604.04759](https://arxiv.org/abs/2604.04759)). Tháng 2/2026 có 341 skill độc hại trên ClawHub ([The Hacker News](https://thehackernews.com/2026/02/researchers-find-341-malicious-clawhub.html)).

## 2. Hướng thiết kế: hơn một bản sao Hermes ở đâu

Hermes là tài liệu tham khảo tốt nhưng không nên làm nền: nó quá lớn để cả nhóm giải thích hết khi vấn đáp, không có phân quyền theo phòng ban hay duyệt chi tiền, và cần tool calling native mà endpoint trường không có. Tám nguyên tắc:

1. **Mỗi bước một chủ.** Agent phòng ban hẹp; điều phối định tuyến rõ ràng, không để một agent làm mọi thứ.
2. **Chính sách phòng ban là dữ liệu, thi hành ngoài LLM.** Mỗi phòng ban một file khai báo tool, phạm vi dữ liệu, hạn mức chi; kiểm trước mọi tool call. Đây là chỗ Hermes không có.
3. **Phiếu duyệt là object lưu bền.** Có trạng thái (chờ, duyệt, từ chối, hết hạn), vai trò người được duyệt, ngưỡng tiền, hạn, dòng nhật ký. Hành động tốn tiền chỉ chạy từ một phiếu đã duyệt.
4. **Đề xuất skill như một pull request kèm eval.** Diff được xem trước; skill chỉ được dùng khi bài kiểm phát lại đạt và người duyệt đồng ý.
5. **Routine là chương trình kiểm chứng được.** Báo cáo = truy vấn dữ liệu xác định + phần LLM viết diễn giải; có nút "chạy ngay" để demo và test.
6. **Memory là bản ghi có nguồn, người dùng xem được.** Dữ liệu gốc vẫn ở hệ thống chính. Câu trả lời hỏi đáp phải trích mã đoạn tài liệu; câu không có trích dẫn bị chặn.
7. **Trace trước tiên.** Mọi quyết định chính sách, phiếu duyệt và tool call đều là sự kiện trong trace; eval chấm trên trace.
8. **Coi skill, memory và tin nhắn vào là không tin cậy.** Không cài skill bên thứ ba; quét nội dung trước khi ghi vào memory.

## 3. Framework: Python + LangChain/LangGraph

| Yêu cầu | LangChain/LangGraph (Python) | DSH (TypeScript) |
|---|---|---|
| Workflow LangGraph có bước duyệt (bắt buộc phase 2) | có sẵn: `StateGraph`, `interrupt()`, `Command(resume)` | không có |
| Endpoint trường (không có tool calling native) | đã có `JsonToolChat` từ BTVN-03 | phải viết adapter mới |
| RAG có trích dẫn | có loader, splitter, vector store; trích dẫn tự làm | không có |
| Memory qua nhiều phiên | LangGraph Store (SQLite, Postgres) | không có |
| Kênh Telegram/Slack/Discord | python-telegram-bot, slack-bolt, discord.py, đều không cần URL public | không có |
| Lưu state, chạy tiếp, nén context | checkpointer, `SummarizationMiddleware` | có |
| Multi-agent, MCP | subagent, `langchain-mcp-adapters` | có |
| Trace | Langfuse, LangSmith, JSONL tự viết | có log JSONL |
| Độ ổn định | bản minor hằng tuần, pin bằng `uv.lock` | chưa có bản stable nào; 33 bản pre-release từ tháng 8 |

Ý tưởng plugin của DSH vẫn giữ, viết lại bằng Python: phòng ban là package có `manifest.yaml` được tự phát hiện; đăng ký trả về hàm huỷ để gỡ sạch; một file `company.yaml` quyết định bật gì; kênh chat và các tầng RAG là interface đổi được. Không dùng `deepagents` ở phase 1 vì nó gói sẵn subagent và filesystem, tức kiến thức chưa học.

## 4. System 1: model quyết định nhanh (Jev, Laya)

Dùng cho quyết định có kiểu, lặp nhiều, tập lựa chọn nhỏ: định tuyến phòng ban, lọc prompt injection, kiểm câu hỏi có trả lời được từ tài liệu không, chấm trích dẫn, khớp skill (nhiều lần "không khớp" là tín hiệu đề xuất skill mới), quyết định có ghi nhớ không, mức độ gấp của ticket CSKH, chấm eval theo rubric. Một interface, ba backend: Laya chạy local (Apache 2.0, có tiếng Việt), Jev qua API (early access), LLM với output enum làm đường lùi. **Classifier không bao giờ nới một luật cứng**: chi tiền luôn phải duyệt.

## 5. Model

Baseline có tool calling native: Claude Haiku 5.5 (`claude-haiku-5-5`, $0,10 / $0,50 mỗi triệu token input/output với prompt dưới 100K) hoặc DeepSeek V4. Gemma 4 26B và Qwen3.8-27B của trường là profile model yếu (chỉ trong Wi-Fi trường, context 32K, không tool calling native). Chạy cùng bộ eval trên các model để thấy phần nào do harness gánh.

Đổi provider bằng `init_chat_model("anthropic:…" / "deepseek:…" / "openai:…")` (langchain-anthropic
1.7.5, langchain-deepseek 1.1.1 có `deepseek-v4-flash` và `deepseek-v4-pro`). Mỗi model một
**profile harness** khai báo trong `models.yaml`: profile mạnh dùng tool calling native và ít
middleware; profile yếu dùng `JsonToolChat`, chọn bớt tool mỗi bước (`LLMToolSelectorMiddleware`),
retry, giới hạn chặt hơn, nén context sớm hơn. Bộ eval là pytest chạy lặp qua các profile.
