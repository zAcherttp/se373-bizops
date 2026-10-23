# Business Ops Agent

Đồ án cuối kỳ SE373 (Kỹ thuật xây dựng hệ thống Agentic AI, UIT, HK1 2026–27), đề tài #7.
Doanh nghiệp vừa và nhỏ ở Việt Nam vừa chat vừa giao việc trong nhóm Zalo/WhatsApp, nên việc trôi
sau một hai ngày và mọi người phải đọc lại cả luồng tin. Sản phẩm là một core tự host, không phụ thuộc
kênh: bot cùng các agent phòng ban (Sales, Marketing, Nhân sự, Kế toán, CSKH, Vận hành) và một agent
điều phối vào thẳng kênh chat công ty đang dùng (Zalo, Slack, WhatsApp, Teams) qua channel adapter,
hoặc tích hợp qua MCP server. Lời hứa: tin nhắn nào là việc thì không bị mất. Tin giao việc thành work
item có người phụ trách, hạn, nhắc việc và leo thang; duyệt ngay trong luồng chat; agent chủ động theo
dõi số liệu, hỏi khi thiếu dữ liệu và soạn nháp chờ người duyệt. Web app không phải app chat mà là
console: danh sách việc, màn hình duyệt, xem trace, cài đặt, dashboard eval. Doanh nghiệp tự host trên
hạ tầng của mình cùng đội tư vấn; công ty demo là hư cấu. Vẫn giữ các yêu cầu đề tài: hỏi đáp quy trình
có trích dẫn, báo cáo theo lịch, nhớ qua nhiều phiên, skill đề xuất phải được duyệt, phân quyền theo
phòng ban, chi tiền phải có người duyệt.

- Yêu cầu, lộ trình, cách chấm: [docs/YEU-CAU.md](docs/YEU-CAU.md)
- Đề xuất kiến trúc và kế hoạch phase (gồm workspace bền, device recovery, notification): [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Bảng kiến trúc tldraw: [docs/SE373.tldr](docs/SE373.tldr)
- Thuật ngữ kiến trúc: [docs/NAMING.md](docs/NAMING.md)
- Nghiên cứu nền và hướng thiết kế: [docs/NGHIEN-CUU.md](docs/NGHIEN-CUU.md)
- Quy trình làm việc nhóm (issue, PR, review): [docs/QUY-TRINH.md](docs/QUY-TRINH.md)
- Bảng việc: [SE373 BizOps](https://github.com/users/zAcherttp/projects/2)

Hướng đề xuất: agent core TypeScript do nhóm tự xây, tham khảo contract của Pi Durable, không dùng
Pi Durable làm runtime dependency. Python/LangGraph không còn là ràng buộc theo cập nhật giảng viên
do người dùng cung cấp (17/10/2026). Scaffold và lệnh chạy dưới đây vẫn là hiện trạng Python; chưa migrate.
Xem [kiến trúc](docs/ARCHITECTURE.md#runtime-ownership-and-pi-durable) và [quy trình vấn đáp module](docs/QUY-TRINH.md#6-agent-lập-trình-claude-code-codex-cursor).

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
