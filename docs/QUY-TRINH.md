# Quy trình làm việc của nhóm

Hai quy tắc gốc: **mọi việc là một issue** và **mọi thay đổi vào `main` đi qua một pull request có
một bạn khác review**. Phần dưới chỉ là cách làm hai việc đó cho gọn.

- Bảng việc: [SE373 BizOps](https://github.com/users/zAcherttp/projects/2)
- Issue: [zAcherttp/se373-bizops/issues](https://github.com/zAcherttp/se373-bizops/issues)

## 1. Issue và bảng việc

Mở issue bằng **New issue** rồi chọn mẫu:

| Mẫu | Dùng khi |
|---|---|
| **Task** | Có một việc cần làm. Bắt buộc điền "Xong khi": cách ai cũng kiểm được là đã xong |
| **Blocker** | Bạn bị kẹt quá 30 phút. Mở ngay, đừng đợi |
| **Decision** | Nhóm cần chọn giữa nhiều phương án |

Các trường trên bảng:

| Trường | Ý nghĩa |
|---|---|
| **Status** | Todo → In Progress → Done. Issue đóng hoặc PR merge thì tự sang Done |
| **Assignees** | Ai đang làm. Task không ai nhận là task không ai làm |
| **Milestone** | Phase: P1 (27/10), P2 (10/11), P3 (06/12) |
| **Area** | Agent, App, Eval, Dữ liệu công ty, Docs & báo cáo, Hạ tầng & CI |
| **Priority** | P0 phải có, P1 nên có, P2 có thì tốt |
| **Size** | S dưới một ngày, M vài ngày, L cả tuần (nên tách nhỏ) |

Quy tắc nhỏ:

- **Nhận việc = assign mình vào.** Không làm việc chưa có issue; chưa có thì tạo.
- **Đang làm thì kéo sang In Progress**, để người khác nhìn bảng là biết.
- **Đóng issue kèm một dòng kết quả**: link PR, case eval, đoạn trace, ảnh chụp. "Xong rồi" thôi thì chưa đủ.
- **Việc cả nhóm cùng làm** (ví dụ ai cũng viết thẻ thành viên): một issue cha, mỗi người một
  sub-issue có nhãn `per-person`. Bạn chỉ cần đóng sub-issue của mình.

## 2. Branch và pull request

`main` được khoá bằng ruleset: không push thẳng, không force push. Một PR chỉ merge được khi có
**1 approve** từ người khác, **3 check CI xanh** (quét secret, Agent, App) và branch **mới nhất so
với `main`**. Repo chỉ cho **Squash and merge**; branch tự xoá sau khi merge.

```bash
git switch main && git pull                    # bắt đầu từ main mới nhất
git switch -c 12-tool-get-sales                # <số issue>-<tên ngắn>
# ... làm việc, commit nhỏ ...
git commit -m "Add get_sales tool with period filter"
git push -u origin HEAD
gh pr create --fill                            # mô tả PR theo mẫu, có dòng "Closes #12"
```

1. Một PR làm một việc. PR 100 dòng được đọc kỹ; PR 2000 dòng sẽ bị approve cho xong.
2. Mô tả PR: làm gì, vì sao, kiểm tra thế nào, `Closes #<số issue>` để issue tự đóng khi merge.
3. Chọn **một người review** trong mục Reviewers. Còn nháp thì mở dạng **Draft**.
4. GitHub báo branch cũ hơn `main` thì bấm **Update branch** rồi đợi CI chạy lại.
5. Có approve và CI xanh thì **tác giả** bấm **Squash and merge**. Tiêu đề PR thành tiêu đề commit trên `main`, nên viết nó rõ ràng.

Commit và tiêu đề PR: câu mệnh lệnh ngắn nói việc đã làm ("Add approval matrix table"), không
viết "update" hay "fix bug". Tên trong code bằng tiếng Anh; docs và comment viết tiếng Việt được.

## 3. Review

Mỗi bạn vừa mở PR vừa review PR của bạn khác. Khi review:

- Đọc như người sẽ phải sửa chỗ này tháng sau. Chạy thử nếu cần.
- Với thay đổi ở agent, xem bằng chứng: case eval nào qua, trace của lượt chạy trông thế nào.
- Hỏi thay vì phán: "Nếu tool trả về rỗng thì agent làm gì?"
- Để lại ít nhất một comment, rồi chọn **Approve** hoặc **Request changes**.
- Không hiểu thì nói không hiểu. Đó là dấu hiệu code cần rõ hơn, không phải bạn kém.

Có commit mới sau khi approve thì approve cũ tự mất, và người review xem lại phần mới.

## 4. Khi bị kẹt

**Quy tắc 30 phút:** tự thử 30 phút mà không tiến thêm thì mở issue **Blocker**. Một Blocker tốt
có: đang làm task nào, mong đợi gì và thấy gì (lỗi dán dạng chữ), đã thử gì. Ai biết cách gỡ thì
trả lời ngay trong issue, để lần sau người khác tìm được.

## 5. Quyết định

Chọn thư viện, ngành của công ty hư cấu, cắt bớt use case: mở issue **Decision**, bàn trong đó, chốt
xong thì ghi một file vào [`docs/decisions/`](decisions/README.md). Ba tuần sau không ai phải hỏi
"sao mình chọn cái này".

## 6. Agent lập trình (Claude Code, Codex, Cursor...)

Dùng agent thoải mái, với ba giới hạn: agent **không push lên `main`, không merge, không approve**.
Agent làm trên branch của task, mở PR rồi dừng. Người mở PR chịu trách nhiệm hiểu và giải thích được
mọi dòng trong đó: điểm cá nhân nhân với hệ số vấn đáp.

## 7. Repo này công khai

Ai cũng đọc được file, issue, PR, comment và lịch sử commit. Không đưa vào đây: **MSSV, email
trường, số điện thoại, API key, token, nội dung `.env`**. Lỡ đưa vào thì báo ngay trong nhóm, đừng
tự sửa lịch sử. Lộ một API key bị trừ 1 điểm; CI quét secret ở mọi PR, nhưng đừng trông vào nó.

## Tra nhanh

| Việc | Lệnh hoặc chỗ bấm |
|---|---|
| Việc của mình | Bảng → lọc `assignee:@me` |
| Đọc task | `gh issue view <n>` |
| Bắt đầu task | `git switch main && git pull && git switch -c <n>-<ten-ngan>` |
| Mở PR | `git push -u origin HEAD && gh pr create --fill` |
| PR đang chờ mình review | `gh pr list --search "review-requested:@me"` |
| Kiểm trước khi đẩy | `agent/`: `uv run ruff check . && uv run pytest` · `app/`: `pnpm run lint && pnpm run build` |
| Nhãn | `task` · `blocked` · `decision` · `per-person` |
