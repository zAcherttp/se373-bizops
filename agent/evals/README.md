# Eval cases

`cases.jsonl` là bộ case eval của Business Ops Agent: mỗi dòng một JSON. Nguồn gốc là bộ stress test 45 case
của trưởng nhóm (`source/ops-agent-stress-test.csv`, giữ nguyên để truy vết), đã dịch sang tiếng Việt theo bối cảnh *Cà phê Gỗ Mộc*, gán UC/phase, và bổ sung 10 case `N.*`
cho các chỗ còn trống (UC-08, restart/resume, mạch demo).

## Schema

| Trường | Ý nghĩa |
|---|---|
| `id` | Giữ id gốc của CSV (`1.1`, `M.2`, `X.4`…); case mới là `N.1`…`N.10` |
| `layer`, `name` | Nhóm và tên case (tiếng Anh, theo CSV) |
| `uc` | Danh sách UC: `UC-01`, `UC-02`, `UC-09`, `UC-06`, `UC-08`, `UC-03`, hoặc `core` (duyệt/thực thi dùng chung) |
| `phase` | Phase sớm nhất chạy được theo luật ARCHITECTURE §12: multi-agent/MCP chỉ từ P3; RAG, `interrupt` duyệt, resume từ P2 |
| `prompt_vi` / `prompt_en` | Câu nhân viên gõ (VND, giữ placeholder `[Khách hàng A]`) / câu gốc. Case nhiều lượt ghi `Lượt 1:`, `Lượt 2:` |
| `setup`, `fails_if`, `passes_if` | Trạng thái dữ liệu cần seed, điều kiện trượt, điều kiện đạt |
| `severity` | `standard` hoặc `critical` |
| `multi_turn` | Case cần nhiều lượt chat |
| `attack` | Injection, giả mạo, xin vượt quyền, ép gấp, chia nhỏ để lách ngưỡng, skill độc |
| `grader` | `rule`: chấm từ tool call, bản ghi tạo ra, trích dẫn hoặc dữ kiện chính xác; `judge`: cần rubric LLM/người |
| `p1` | Thuộc tập con chạy ở P1 |

## Đối chiếu rubric

Rubric cần mỗi UC ≥ 5 case (có ≥ 1 case biên), cộng ≥ 5 case tấn công, tức tổng ≥ 5×5 + 5 = 30.
`tests/test_eval_cases.py` kiểm các ngưỡng này, cùng id không trùng, đủ trường và enum hợp lệ.

Tổng: **55 case** (45 từ CSV + 10 mới). Một case có thể thuộc nhiều UC (`N.9`, `N.10` là `UC-01` + `core`).

| UC | Số case | P1 | P2 | P3 | Tấn công |
|---|---|---|---|---|---|
| UC-01 | 11 | 8 | 1 | 2 | 0 |
| UC-02 | 5 | 2 | 3 | 0 | 0 |
| UC-09 | 6 | 3 | 3 | 0 | 4 |
| UC-06 | 10 | 3 | 1 | 6 | 0 |
| UC-08 | 5 | 0 | 0 | 5 | 1 |
| core | 20 | 14 | 6 | 0 | 2 |

- **Phase:** P1 29 · P2 13 · P3 13.
- **Grader:** rule 50 · judge 5 (`2.2`, `2.5`, `2.6`, `3.5`, `X.6`).
- **Tấn công:** 7 (`5.2`, `5.3`, `5.5`, `5.6`, `5.7`, `5.9`, `N.4`). **Critical:** 16.

## P1 dùng tập `p1`

P1 chỉ có một agent loop, chưa có RAG, `interrupt` hay multi-agent. Runner P1 lọc `p1 == true`
(13 case: `1.3`, `1.4`, `1.5`, `2.3`, `4.2`, `4.4`, `4.5`, `5.1`, `5.3`, `5.5`, `5.7`, `5.9`, `X.1`), đủ
mốc ≥ 10 eval của P1. Ở P1, "chuyển duyệt" nghĩa là tạo bản ghi `pending_approval`, chưa dừng luồng.
Các case khác có `phase: P1` vẫn chạy được ở P1 nhưng chưa nằm trong tập bắt buộc.

## Chấm điểm

Ưu tiên chấm bằng luật (ARCHITECTURE §1.4, §11): đối chiếu tool call, bản ghi trong hệ thống giả lập,
trích dẫn và dữ kiện nguồn sau khi `seed`. Case `judge` được đánh dấu riêng; khi báo cáo chỉ số, tách
kết quả `judge` khỏi kết quả `rule`.

## Kết quả

`cases.jsonl` chỉ chứa định nghĩa case, không ghi kết quả. Mỗi lần chạy xuất một file kết quả riêng
(ví dụ `runs/<ngày>-<model>.jsonl`, mỗi dòng: `id`, kết quả, trace id, token, độ trễ) để so sánh
regression giữa các lần chạy.
