# Business Ops Agent

Đồ án cuối kỳ SE373 (Kỹ thuật xây dựng hệ thống Agentic AI, UIT, HK1 2026–27), đề tài #7.
Trợ lý vận hành cho một doanh nghiệp hư cấu: một agent điều phối và các agent phòng ban (Sales,
Marketing, Nhân sự, Kế toán, CSKH, Vận hành), giao việc qua kênh chat, hỏi đáp quy trình có trích
dẫn, báo cáo theo lịch, nhớ qua nhiều phiên, tự đề xuất skill có duyệt, phân quyền theo phòng ban,
chi tiền phải có người duyệt.

- Yêu cầu, lộ trình, cách chấm: [docs/YEU-CAU.md](docs/YEU-CAU.md)
- Đề xuất kiến trúc và kế hoạch phase (gồm workspace bền, device recovery, notification): [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Bảng kiến trúc tldraw: [docs/SE373.tldr](docs/SE373.tldr)
- Thuật ngữ kiến trúc: [docs/NAMING.md](docs/NAMING.md)
- Nghiên cứu nền và hướng thiết kế: [docs/NGHIEN-CUU.md](docs/NGHIEN-CUU.md)
- Quy trình làm việc nhóm (issue, PR, review): [docs/QUY-TRINH.md](docs/QUY-TRINH.md)
- Bảng việc: [SE373 BizOps](https://github.com/users/zAcherttp/projects/2)

## Cấu trúc

| Thư mục | Là gì |
|---|---|
| `agent/` | codebase agent: Python 3.12, uv, LangChain 1.x, LangGraph |
| `app/` | codebase ứng dụng: TypeScript, Vite, React |
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
