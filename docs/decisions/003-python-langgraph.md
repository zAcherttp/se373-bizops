# 003. Agent core Python + LangGraph, app Next.js

- Ngày: 2026-10-24 · Issue: #25 · Thay cho quyết định 2026-10-18 (agent core TypeScript)

## Bối cảnh
Ngày 18/10 nhóm định viết agent core bằng TypeScript sau khi giảng viên nói Python và LangGraph không bắt buộc. Lab của môn, Đề 07 và scaffold `agent/` đều dùng Python + LangGraph; PR #20 đã thử một lõi xử lý lỗi bằng TypeScript.

## Các phương án
- TypeScript tự viết: cùng ngôn ngữ với app, nhưng phải tự làm checkpoint, interrupt, resume.
- Python + LangGraph: có sẵn checkpointer, `interrupt()`, `Send`; khớp lab và Đề.

## Chốt
Agent core: Python 3.12, uv, LangChain 1.x, LangGraph. App: Next.js. `agent/runtime/` chỉ để tham khảo, không xoá.

## Hệ quả
Migrate `app/` từ Vite sang Next.js (#31). Ý tưởng recovery từ `agent/runtime/` được cài lại trên LangGraph.
