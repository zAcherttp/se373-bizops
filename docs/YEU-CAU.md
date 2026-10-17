# Yêu cầu đồ án · Business Ops Agent

Tổng hợp từ slide giới thiệu đồ án (07/10/2026) và mô tả đề tài #7. Danh sách use case chính thức
chưa được đánh số trong mô tả đề tài đã cung cấp; mục 5 là gợi ý, không phải danh sách đã chốt. Xem [ARCHITECTURE.md](ARCHITECTURE.md) cho đề xuất hệ thống và phase plan.

## 1. Đề tài

Trợ lý vận hành doanh nghiệp "như Hermes Agent": một **agent điều phối** cùng các **agent phòng
ban** (Sales, Marketing, Nhân sự, Kế toán, CSKH, Vận hành). Dùng một doanh nghiệp hư cấu.

| Năng lực đề yêu cầu | Ghi chú |
|---|---|
| Giao việc qua kênh chat | Telegram, Slack hoặc Discord |
| Hỏi đáp quy trình nội bộ có trích dẫn | RAG, câu trả lời trỏ về đúng đoạn tài liệu |
| Báo cáo định kỳ theo lịch | chạy không cần người gọi |
| Nhớ về công ty qua nhiều phiên | memory dài hạn |
| Tự đề xuất skill mới, có duyệt | skill chỉ được dùng sau khi người duyệt |
| Phân quyền theo phòng ban | tool và dữ liệu giới hạn theo phòng ban |
| Chi tiền phải có người duyệt | human-in-the-loop trước hành động tốn tiền |

Giảng viên thực hành phụ trách: NHNghĩa.

## 2. Lộ trình và hạn nộp

Cuối mỗi phase: gắn tag trên repo và nộp video demo ngắn. **Mỗi phase chỉ dùng kiến thức đã học
đến thời điểm đó.**

| Phase | Hạn | Phải có |
|---|---|---|
| 1 · Bootstrap | 27/10 (tuần 7), kiến thức buổi 1–5 | đăng ký nhóm, đề tài, use case và người sở hữu; repo, CI, codebase ứng dụng và codebase agent; agent loop ≥ 2 tool, 1 skill, log từng bước; 1 use case chạy từ ứng dụng tới agent; ≥ 10 eval case |
| 2 · Mở rộng | 10/11 (tuần 9), buổi 6–8 | RAG có trích dẫn; lưu state, dừng rồi chạy tiếp được, nén context; **workflow LangGraph có bước người duyệt**; ≥ 3 use case |
| 3 · Hoàn thiện | 06/12 (tuần 12), buổi 9–11 | eval đầy đủ, chạy lại để so sánh; multi-agent hoặc MCP; kiểm thử an toàn; xem được trace; ≥ 5 use case phủ K1–K8; báo cáo, video |

## 3. Cách chấm (50% điểm môn, thang 10)

| Phần | Điểm | Chi tiết |
|---|---|---|
| Agent | 7,5 | mỗi use case 1,5 = chức năng chạy đúng (0,5) + thiết kế harness đúng kỹ thuật (0,5) + kiểm chứng bằng eval, trace (0,5). 5 use case trọn điểm là đủ; làm thêm để bù use case chưa trọn |
| Phần mềm | 2,5 | sáng tạo 0,5 · độ phức tạp kỹ thuật 0,75 · độ hoàn thiện 0,75 · khối lượng 0,5. Desktop, web hoặc CLI, phải tích hợp agent thật |
| Trừ | | thiếu mỗi mảng K1–K8: −0,5 · lộ API key: −1,0 · sao chép, gian lận: 0 điểm |
| Cá nhân | | điểm nhóm × hệ số vấn đáp (0–1,0). Mỗi người phải trình bày được use case mình sở hữu và trả lời về thiết kế agent |

Điểm chấm theo những gì **demo được**, không theo những gì đã viết. Mỗi use case vì vậy cần: một
kịch bản demo chạy ổn định, một bộ eval chạy lại được, và trace xem được.

Trình bày hai vòng: trong pool 10 nhóm (GVTH chấm, chọn 2 đề tài), rồi 10 đề tài tốt nhất trình bày
trước lớp.

## 4. Tám mảng kiến thức phải phủ

| Mã | Mảng | Năng lực của đề tài phủ mảng này |
|---|---|---|
| K1 | Tích hợp model, structured output, agent loop, kiến trúc model + harness | agent điều phối và agent phòng ban; giao thức JSON cho model yếu |
| K2 | Tool use và agent skills | tool CRM, kế toán, lịch, kênh chat; skill theo phòng ban, đề xuất skill có duyệt |
| K3 | RAG | hỏi đáp quy trình nội bộ có trích dẫn |
| K4 | Memory, state, context | nhớ công ty qua nhiều phiên; nén context |
| K5 | Workflow orchestration, human-in-the-loop | workflow LangGraph có bước duyệt chi tiền; báo cáo theo lịch |
| K6 | Multi-agent hoặc MCP | agent điều phối giao việc hoặc tích hợp MCP |
| K7 | Verification và evaluation | eval chạy lại được, so sánh regression |
| K8 | Security, governance, observability | phân quyền theo phòng ban, kiểm thử an toàn, eval, trace |

Tên các mảng theo **bản nháp rubric v3** (06/10/2026, trên branch của PR #15; chưa rõ đã là bản chính thức). Theo bản nháp này:

- Mỗi use case viết đủ 6 mục: mô tả; 1–3 mảng K chính; yêu cầu kỹ thuật; 3–6 tiêu chí chấp nhận có ngưỡng; ≥ 5 eval case, có ≥ 1 case biên hoặc lỗi; trace của ≥ 1 lần chạy thành công.
- Mỗi use case chấm 3 tiêu chí × 0,5: chức năng (đạt tiêu chí chấp nhận, demo ổn định), thiết kế harness (mức của các mảng K chính), kiểm chứng (eval có case biên, số liệu, trace, phân tích case hỏng, regression).
- Yêu cầu nền chung: workflow ≥ 3 node có điều kiện dừng; sơ đồ `agent = model + harness` chỉ rõ ≥ 4 lớp harness kèm bảng failure mode; ≥ 1 công cụ ngoài và ≥ 2 skill dùng lại được có contract đầy đủ; trace mọi lần chạy; eval chạy bằng một lệnh, tối thiểu 5 case × số use case + 5 case tấn công (5 use case = 30 case), regression ≥ 2 lần; README, `.env.example`, báo cáo, video, bảng phân công use case, mục minh bạch dùng AI.
- Tool hoặc skill chạy lệnh nguy hiểm mà không có approval gate thì điểm thiết kế harness của use case đó bằng 0.

Điều kiện Phase 1 (≥ 10 eval) vẫn theo slide.

## 5. Use case (gợi ý, chờ nhóm chọn)

| # | Use case | Mảng chính | Phase sớm nhất |
|---|---|---|---|
| 1 | Hỏi quy trình nội bộ, trả lời có trích dẫn | K3, K2 | 2 (RAG) |
| 2 | Đề nghị chi tiền: kiểm hạn mức, trình duyệt, ghi sổ | K5, K8 | 2 (LangGraph + duyệt) |
| 3 | Báo cáo doanh số tuần tự gửi lên kênh chat theo lịch | K1, K2, K5 | 1 |
| 4 | Một yêu cầu liên phòng ban, điều phối chia việc rồi tổng hợp | K6 | 3 |
| 5 | Agent nhận ra việc lặp lại, đề xuất skill mới, người duyệt rồi mới dùng | K1, K8 | 3 |
| 6 | Nhớ thông tin công ty và sở thích người dùng qua nhiều phiên | K4 | 2 |

## 6. Ràng buộc kỹ thuật đã biết

- Endpoint LLM miễn phí của trường chỉ vào được từ Wi-Fi trường và **không có tool calling native**
  (chỉ có structured output). Lab của môn yêu cầu endpoint có tool calling, nên nếu dùng endpoint
  trường thì phải có lớp chuyển giao thức (đã làm ở BTVN-03), hoặc dùng một provider khác khi dev.
- Không commit key: `.env` nằm trong `.gitignore`; CI chạy quét secret trên mọi commit.

## 7. Đã chốt và còn mở

- **Nhóm 5 người là bắt buộc.** Hiện có 3, đang tìm thêm 2 (10/10).
- **Codebase agent: Python + LangChain 1.x + LangGraph** (khớp lab của môn; phase 2 bắt buộc
  LangGraph). Codebase ứng dụng có thể dùng TypeScript.
- **Model:** baseline có tool calling native (Claude Haiku 5.5 hoặc DeepSeek V4); model của trường
  là profile model yếu để chứng minh harness.
- **Còn mở:** công ty, năm use case và owner. Giảng viên cho phép đề xuất use case; vẫn phải phủ các năng lực của đề tài. Portfolio đề xuất ở [ARCHITECTURE.md](ARCHITECTURE.md), chưa được nhóm thông qua.
