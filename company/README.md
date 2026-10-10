# Doanh nghiệp hư cấu

Chưa chốt ngành. Thư mục này sẽ chứa mọi dữ liệu của doanh nghiệp hư cấu, tách khỏi code agent:

| Đường dẫn | Nội dung |
|---|---|
| `company.yaml` | tên, ngành, sơ đồ tổ chức, phòng ban bật, kênh chat, lịch báo cáo |
| `policies/` | tài liệu quy trình nội bộ, là kho RAG cho hỏi đáp có trích dẫn |
| `data/` | dữ liệu mẫu: CRM, đơn hàng, sổ chi, nhân sự |
| `permissions.yaml` | vai trò × phòng ban × tool, hạn mức chi |

Yêu cầu khi chọn ngành: đủ việc cho cả sáu phòng ban, dữ liệu dễ hiểu khi demo, có tình huống chi
tiền cần duyệt.
