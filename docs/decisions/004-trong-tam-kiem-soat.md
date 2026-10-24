# 004. Trọng tâm: kiểm soát và độ tin cậy

- Ngày: 2026-10-24 · Issue: #25

## Bối cảnh
Rubric chấm thiết kế harness và kiểm chứng theo từng UC; nhóm cần trọng tâm để không dàn trải.

## Các phương án
- Nhiều tính năng nông: demo rộng, khó bảo vệ khi vấn đáp.
- Ít tính năng, kiểm soát sâu: có bằng chứng eval và trace.

## Chốt
Chiều sâu là kiểm soát và độ tin cậy: quyền ép bằng code, cổng duyệt trước hành động, resume sau restart không tạo bản ghi trùng, kiểm chứng bằng luật (không dùng LLM làm giám khảo), trạng thái tường minh (xong / chờ duyệt / bị từ chối hoặc hết hạn / lỗi cần người xử lý).

## Hệ quả
Mạch demo và ba baseline eval (workflow cố định, một agent, hệ thống có kiểm soát; cùng dữ liệu, model, budget) ở `docs/ARCHITECTURE.md` §1.4 và §11.
