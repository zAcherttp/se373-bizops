# Business Ops Agent

Đồ án cuối kỳ SE373 (Kỹ thuật xây dựng hệ thống Agentic AI, UIT, HK1 2026–27), đề tài #7.
Hệ thống gồm một orchestrator và sáu agent phòng ban (Sales, Marketing, Nhân sự, Kế toán, CSKH,
Vận hành) cho một doanh nghiệp hư cấu (chuỗi cà phê), làm năm use case theo danh sách chính thức của
Đề 07: UC-01 định tuyến và tách việc liên phòng ban, UC-02 hỏi đáp quy định có trích dẫn, UC-09 phân
quyền và audit log, UC-06 báo cáo định kỳ, UC-08 tự đề xuất skill có người duyệt (UC-03 dự phòng).
Người dùng giao việc qua room web, Discord hoặc Slack. Trọng tâm là kiểm soát và độ tin cậy: quyền ép
bằng code, cổng duyệt trước hành động, resume sau restart không tạo bản ghi trùng, kiểm chứng bằng luật,
trạng thái kết thúc tường minh. Không có tool chi tiền thật: lệnh chi chỉ là bản ghi chờ duyệt.

- Yêu cầu, lộ trình, cách chấm: [docs/YEU-CAU.md](docs/YEU-CAU.md)
- Kiến trúc, use case và kế hoạch phase: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Quyết định của nhóm (ADR): [docs/decisions/](docs/decisions/README.md)
- Bảng kiến trúc tldraw: [docs/SE373.tldr](docs/SE373.tldr)
- Thuật ngữ kiến trúc: [docs/NAMING.md](docs/NAMING.md)
- Nghiên cứu nền và hướng thiết kế: [docs/NGHIEN-CUU.md](docs/NGHIEN-CUU.md)
- Quy trình làm việc nhóm (issue, PR, review): [docs/QUY-TRINH.md](docs/QUY-TRINH.md)
- Bảng việc: [SE373 BizOps](https://github.com/users/zAcherttp/projects/2)

Stack: agent core Python 3.12 + uv + LangChain 1.x + LangGraph; app Next.js (bootstrap hiện tại là
Vite, sẽ migrate). `agent/runtime/` (TypeScript) chỉ để tham khảo. Xem [kiến trúc §13](docs/ARCHITECTURE.md#13-quyết-định-công-nghệ)
và [quy trình vấn đáp module](docs/QUY-TRINH.md#6-agent-lập-trình-claude-code-codex-cursor).

## Cấu trúc

| Thư mục | Là gì |
|---|---|
| `agent/` | codebase agent: Python 3.12, uv, LangChain 1.x, LangGraph |
| `agent/runtime/` | chỉ tham khảo: TypeScript failure-policy + bounded single-attempt executor (PR #20), không phải runtime |
| `app/` | codebase ứng dụng: TypeScript, React; hiện là Vite, mục tiêu Next.js |
| `company/` | dữ liệu doanh nghiệp hư cấu (chưa chốt ngành) |
| `docs/` | yêu cầu, nghiên cứu, thiết kế |

Trong `agent/src/bizops/core/`:

| File | Vai trò |
|---|---|
| `models.py` | dựng model theo profile trong `agent/models.yaml` (Claude Haiku 5.5, DeepSeek V4, model của trường) |
| `json_tools.py` | giao thức gọi tool bằng JSON cho model không có tool calling native |
| `skills.py` | skill dạng `SKILL.md`, nạp theo progressive disclosure qua tool `load_skill` |
| `trace.py` | trace từng bước ra `agent/traces/<run_id>.jsonl` |

## Chạy

```bash
cp .env.example .env            # điền key; .env không bao giờ được commit

cd agent
uv sync
uv run pytest                   # không cần API key: test dùng model giả

cd ../app
pnpm install
pnpm dev
```

Chọn model bằng `BIZOPS_PROFILE` trong `.env`. Profile `gemma-uit` và `qwen-uit` chỉ chạy được trong
Wi-Fi trường.
