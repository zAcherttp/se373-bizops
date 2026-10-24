# 002. Một tài liệu kiến trúc duy nhất

- Ngày: 2026-10-24 · Issue: #25

## Bối cảnh
Repo có hai tài liệu kiến trúc song song: đề xuất tiếng Anh (~7.000 từ, định vị 18/10) và bản v2 tiếng Việt theo Đề 07. Hai bản mâu thuẫn về UC và stack.

## Các phương án
- Giữ cả hai: tốn công đồng bộ, người đọc không biết bản nào đúng.
- Một bản, lấy v2 làm gốc: gộp phần v2 còn thiếu, xoá bản cũ.

## Chốt
`docs/ARCHITECTURE_v2.md` thành `docs/ARCHITECTURE.md`. Gộp gọn phần v2 còn thiếu (tool contract, sổ usage, duyệt chi hai bước, giao thức, request bền, tham khảo); v2 thắng khi mâu thuẫn. Bản cũ xoá, còn trong git.

## Hệ quả
Mọi link trỏ về `docs/ARCHITECTURE.md`. Phần định vị cũ (slot A–E, Proxmox, bộ cài, business pack) chỉ còn một dòng "để sau" ở §1.3.
