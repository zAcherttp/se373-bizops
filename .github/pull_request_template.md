## Làm gì, vì sao

<!-- Một hai câu. PR nhỏ, một việc. -->

Closes #

## Kiểm tra thế nào

<!-- Lệnh đã chạy, case eval, link hoặc đoạn trace, ảnh chụp màn hình app. -->

## Trước khi xin review

- [ ] Branch mới nhất so với `main`
- [ ] `agent/`: `uv run ruff check . && uv run pytest` qua (nếu có sửa)
- [ ] `app/`: `pnpm run lint && pnpm run build` qua (nếu có sửa)
- [ ] Không có key, token hay `.env` trong diff
- [ ] Đã chọn một người review
