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

## Cấu hình theo đề xuất kiến trúc

Theo [ARCHITECTURE.md](../docs/ARCHITECTURE.md), dữ liệu dưới đây là kế hoạch, chưa triển khai. Một công ty chính và cấu hình công ty nhỏ thứ hai có thể chứng minh cùng workflow thích nghi được; ngành và use case vẫn chờ nhóm chốt.

- `company.yaml`: capability/package được bật, version và connector binding; cấu hình có schema, người quản lý và version.
- `permissions.yaml`: role, quan hệ nhân viên-record, action/resource scope và quyền duyệt; không chỉ phòng ban × tool. Agent không tự sửa policy.
- Record/tài liệu có nguồn và policy; chunk, memory, skill proposal và result kế thừa hạn chế của nguồn.
- Chỉ dùng dữ liệu tổng hợp hư cấu; không đưa payroll hoặc PII thật vào repo public.
- Quy mô 500 người là kịch bản mục tiêu; concurrency và capacity phải có workload/test chứng minh.

Tên miền cấu hình là **CompanyProfile**; đây là cấu hình có version và người quản lý, không phải quyền do agent tự suy ra. Xem [thuật ngữ](../docs/NAMING.md).
