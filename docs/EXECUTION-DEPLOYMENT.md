# Bổ sung kiến trúc: workspace bền và tháo nút thắt

**Ngày:** 17/10/2026. **Trạng thái:** đề xuất cho nhóm review, chưa triển khai/chưa là ADR. Theo [Decision #18](https://github.com/zAcherttp/se373-bizops/issues/18), bổ sung vào [PR #17](https://github.com/zAcherttp/se373-bizops/pull/17). Nền tảng và contract tool: [ARCHITECTURE.md](ARCHITECTURE.md). Không có PR #18 tại thời điểm kiểm tra.

## 1. Quyết định đề xuất

1. Agent có workspace thực thi bền, độc lập với laptop; thiết bị nhân viên là executor/nguồn dữ liệu tùy chọn.
2. Server là nguồn quyết định identity, policy, approval và request lifecycle; không chỉ là observer. Giữ Python/LangGraph, không thêm runtime agent thứ hai.
3. Chọn nơi chạy theo capability, vị trí dữ liệu, quyền, tài nguyên và chi phí đo được. Bắt đầu bằng rule; không tự di chuyển dữ liệu để cứu task.
4. Mất thiết bị tạo trạng thái chờ có deadline, không biến thành vòng gọi model để polling.
5. Notification broker quản lý một blocker xuyên nhiều kênh, có acknowledgement, reminder và escalation; không broadcast mọi kênh mặc định.
6. Thử nghiệm một VM nội bộ ở P3 sau khi core persistence/recovery hoạt động; không xây platform quản lý VM hay VM riêng cho từng nhân viên.
7. Mục tiêu là không mất request im lặng trong mô hình lỗi và mục tiêu phục hồi đã công bố, không tuyên bố mọi nghiệp vụ thành công 100%.

## 2. Ba nơi thực thi, một hợp đồng

| Nơi chạy | Phù hợp | Giới hạn |
|---|---|---|
| Browser worker / WASM | File nhân viên chọn, parse/chuẩn hóa, tính toán, preview; model nhỏ nếu benchmark phù hợp | Có thể freeze/discard/offline; không phải executor always-on; không giữ credential chung |
| Worker nội bộ gần dữ liệu | Query/aggregate trong mạng doanh nghiệp, batch và công việc phòng ban | Do công ty quản lý, quyền tối thiểu; không dùng máy nhân viên khác làm compute pool |
| Workspace server/container/VM | Workflow cần tiếp tục sau khi người dùng rời đi, công cụ cần môi trường ổn định | Chỉ là nơi thực thi; request/checkpoint/policy nằm ở core, có backup và recovery |

Giảm tải theo thứ tự: truy vấn/tính toán tại nguồn → tiền xử lý local → chỉ gửi bằng chứng cần thiết → tái sử dụng artifact còn hợp lệ theo version/scope → model cho reasoning và ngoại lệ. Không mặc định chuyển toàn bộ agent loop xuống browser. Local computation không làm phí API token tự giảm; không coi chi phí bị chuyển sang thiết bị là chi phí biến mất.

### Bổ sung contract tool/executor

```yaml
execution:
  allowed_locations: [server, employee_device]
  requires_local_input: false
  fallback: server
```

Ví dụ minh họa, không bảo đảm connector đã có fallback. Contract thực tế còn cần data residency/transfer policy, runtime/image/tool version, input/output schema, deadline, resource limits và cách kiểm chứng output. Replay/reconciliation và metering dùng contract trong ARCHITECTURE §4.

Một work item mang principal, effective scope, request/run/attempt/operation ID, input references, version, lease và budget; không nhúng credential rộng vào browser. Client results là đầu vào chưa được tin cậy: validate và kiểm chứng theo tác động, không dùng số liệu client tự báo để bỏ qua approval hoặc kết luận đã chi tiền. Đồng thời áp dụng gate cho mọi tool/nested call ở server.

## 3. Device-offline và phục hồi

1. Worker mất kết nối/heartbeat → lease hết hạn theo chính sách. Server ghi `blocked` với `waiting_reason=device_offline`, device ID, owner, last checkpoint, next action và deadline.
2. Xác định tình trạng operation đang dở. Kết quả side effect chưa rõ phải reconcile, không gán thất bại và chạy lại mù.
3. Nếu có executor thay thế tương thích **và** được phép truy cập dữ liệu, chuyển bước an toàn sang executor đó. Giữ business operation ID; tạo attempt ID mới, kiểm quyền và chống stale worker ghi kết quả.
4. Nếu thiếu file chỉ có trên máy gốc hoặc policy cấm chuyển, chờ đúng máy/người phụ trách. Không chuyển dữ liệu nhân viên A sang máy B.
5. Tạo blocker và notification intent bền. Release worker; không giữ request LLM mở, không gọi model chỉ để kiểm máy đã online chưa.
6. Reconnect gửi event; server xác thực lại device/principal, kiểm request vẫn chờ, quyền hiện tại và phiên bản checkpoint trước resume. Event trùng được dedup.
7. Timer dự phòng backoff tăng dần, có jitter và trần, không vượt deadline; reset khi có tiến triển thật. Reconnect event có thể đánh thức ngay dù timer kế tiếp còn xa.
8. Đến deadline: escalate cho owner được cấu hình; giữ request và evidence để xử lý tiếp. Không retry vô hạn. Nếu thiết bị cũ trở lại sau reassignment, từ chối kết quả stale hoặc đối soát trước nhận.

Scheduler xử lý các thời điểm/event được lưu bền, không tạo cron riêng để gọi agent liên tục. Chờ người trả lời, chờ duyệt và chờ thiết bị là những nguyên nhân khác nhau; mỗi nguyên nhân có owner và chính sách riêng.

## 4. Notification broker và escalation đa kênh

Tất cả kênh là adapter của cùng broker. Bắt đầu bằng app inbox + một kênh đã chọn theo môn học; email, push hoặc kênh khác chỉ thêm khi nhu cầu rõ. Có adapter không đồng nghĩa được phép gửi hoặc dữ liệu được phép rời mạng.

Một blocker record chứa `blocker_id`, request, loại nút thắt, người cần phản hồi, hành động cần làm, severity, deadline, policy/audience và trạng thái resolution. Mỗi message/delivery attempt có ID và receipt riêng. Thông báo lặp dùng dedup key gồm blocker, recipient, channel và reminder stage; việc resend không tạo task nghiệp vụ mới.

- Phân biệt queued/sent/delivered (nếu kênh hỗ trợ), acknowledged và resolved. Không có read receipt thì không tự kết luận đã đọc.
- Chọn kênh theo cấu hình người dùng/doanh nghiệp, mức khẩn và quyền; dùng fallback/reminder từng bước, không bắn tất cả cùng lúc.
- Quiet hours, cooldown, quota và deadline phải được cấu hình. Chỉ trường hợp đã định nghĩa là khẩn mới vượt quiet hours.
- Acknowledgement từ một kênh cập nhật blocker chung và dừng các reminder chờ acknowledgement; nếu chưa resolved, vẫn giữ deadline và escalation đã định nghĩa.
- Mọi callback/action phải xác thực; giữ approval trong workflow có thẩm quyền. Link trong tin nhắn không phải permission grant. Tin công khai chỉ nêu trạng thái chung, nội dung nhạy cảm nằm trong app có quyền.
- Quyền người nhận và audience được kiểm trước mỗi delivery; scheduler job không mượn credential creator đã mất quyền.
- Ghi outcome request và delivery intent bằng outbox/transaction hợp lệ. Lỗi kênh retry riêng; không chạy lại business workflow. Broker cũng phải phục hồi sau crash.

Ví dụ: “Request R đang chờ file trên thiết bị của bạn. Kết nối lại máy hoặc mở app để chọn nguồn khác.” Không gửi lương, nội dung chứng từ hay đường dẫn nội bộ nhạy cảm vào thông báo rộng.

## 5. Workspace bền và thử nghiệm VM

Workspace là một thực thể được cấp quyền và có vòng đời; VM là một implementation. Định danh workspace, owner/scope, image/tool version và volume/artifact references; không dùng conversation ID làm quyền truy cập filesystem.

**P3 spike giới hạn:** một VM Linux nội bộ với image chuẩn bị trước, Python worker, persistent volume và một workload. Core/request store nằm ngoài guest VM để guest restart không xóa trạng thái công việc. Chọn vòng đời theo công việc/scope, không mặc định một VM cho mỗi specialist hay mỗi người.

Yêu cầu trước khi chạy dữ liệu nhạy cảm:

- Quota CPU/RAM/disk/time, egress allowlist, credential ngắn hạn hoặc gateway, quản lý patch/image.
- Workspace tách theo scope; không để file HR tồn tại trong workspace dùng lại cho Sales. Hủy/sanitize volume theo retention, không ghi secret vào snapshot.
- Health/start/stop/drain rõ; artifact và checkpoint phải được lưu trước khi deprovision. Snapshot VM không thay backup business state và không rollback giao dịch ngoài.
- Tool có cấu trúc là đường thao tác mặc định; không cấp shell hoặc GUI toàn quyền để vượt gateway. Không chạy code/plugin không tin cậy chỉ vì nó ở trong VM.
- Desktop streaming và computer-use chỉ xét nếu use case cần, không phải điều kiện để spike thành công.

Browser đóng mà workspace còn chạy thì task tiếp tục. Guest chết thì recovery monitor tiếp quản. Nếu guest và core cùng một host bị tắt, cần external health alert và đường backup/restore; không gọi đây là high availability.

## 6. Triển khai nội bộ và khả năng thích nghi

Đề xuất deployment profile: một instance riêng trong hạ tầng mỗi doanh nghiệp, dùng chung code sản phẩm; organization/policy/workflow templates/connector bindings theo config có version và người duyệt. Không xây SaaS multi-tenant hay framework cấu hình mọi doanh nghiệp trong đồ án.

Nếu gọi là **hoàn toàn nội bộ**, model inference, storage, telemetry và xử lý phải nằm trong hạ tầng được cho phép, không tự dùng cloud fallback. Telegram/Slack/Discord và model API bên ngoài là ngoại lệ phải nêu rõ; cần hỏi giảng viên về kênh thay thế nếu strict on-prem xung đột yêu cầu chat. Thiếu executor/model nội bộ thì chờ hoặc escalate, không âm thầm gửi dữ liệu ra ngoài.

Tự map tổ chức là extension tùy chọn: CSV nhân viên + một số SOP được cấp phép → tổ chức/quy trình/thẩm quyền dự thảo có nguồn → phát hiện thiếu/mâu thuẫn → hỏi đúng owner → diff/validation/dry-run → human activation. Không suy ra quyền từ chức danh, lịch sử truy cập hoặc confidence của model. Proposal restricted vẫn restricted; không kích hoạt quyền/workflow qua suy luận tự động.

Browser offloading, local model, auto-map và visual matching đều là ứng viên thử nghiệm, không thêm thành use case bắt buộc hoặc cam kết tất cả phải hoàn thành. Chọn một thử nghiệm nếu mandatory coverage và P1/P2 đã có đường giao hàng.

## 7. Gói triển khai theo phase

| Giai đoạn | Phần bổ sung | Không kéo scope sớm |
|---|---|---|
| P1 · 27/10 | Giữ vertical slice, lỗi hiển thị rõ, contract tool và ID/usage | Không đẩy VM/multi-agent/durable distributed runtime vào P1 |
| P2 · 10/11 | Durable blocker/wait, notification broker app + một channel, reconnect/backoff, approval/resume, server worker | Không claim recoverability trước fault test; ưu tiên core persistence |
| P3 · 06/12 | Một VM/workspace spike nếu khả thi; executor placement và cost comparison; demo interruption/recovery | Không VM fleet, marketplace, full desktop streaming hay compute swarm |

### Demo cuối kỳ đề xuất

Nhân viên giao việc → workspace thực hiện → đóng laptop vẫn tiến triển → gặp bước cần file local thì chờ và thông báo → người dùng kết nối lại → kiểm quyền/reconcile rồi tiếp tục → kết quả có evidence. Restart worker/guest tại một điểm đã công bố để chứng minh không mất request và không tạo action trùng. Các biến thể live phải nằm trong phạm vi đã kiểm thử, không giả vờ task nào cũng thành công.

### Đo thành công đúng cách

- **Business success:** tỷ lệ đạt mục tiêu, có evidence.
- **Lifecycle coverage:** tỷ lệ request đã nhận có state/owner/next action hợp lệ; waiting không được tính là thành công nghiệp vụ.
- **Recovery:** tỷ lệ khôi phục/escalate đúng trong từng fault scenario, thời gian phát hiện và phục hồi, action trùng.
- **Blocker resolution:** thời gian chờ, số reminder, tỷ lệ ack/resolved, thất bại delivery và escalation chưa có người xử lý.
- **Cost/load:** CPU/RAM/server traffic, model tokens, local/device resource use, VM idle/startup/storage và tổng cost; so với baseline server-only trên cùng workload và quality criteria.

Mục tiêu thiết kế là mọi request được nhận đều có đường xử lý rõ trong fault model đã công bố. Không hứa 100% business success, không coi hỏi liên tục là hoàn thành, không che hard failure. Hard failure/escalation có error code, lý do, evidence, owner và next action. Phân loại thiếu thông tin, thiếu quyền, lỗi transient, thiết bị mất, outcome ngoài chưa rõ và unsupported để tránh lỗi cứng không cần thiết.

### Acceptance cần bổ sung

1. Đóng browser không cancel request đang chạy trên workspace; task cần file local chuyển đúng wait reason.
2. Kill worker/guest, duplicate reconnect và stale worker: một business effect, nhiều attempt có audit đúng.
3. Backoff không gọi model; event reconnect wake sớm; quá deadline escalate; quyền bị revoke không resume bằng scope cũ.
4. Kênh A lỗi → fallback B theo policy; ack ở B dừng reminder ack trên A; ack chưa resolve vẫn giữ deadline.
5. Callback giả, group-chat không đủ quyền, offline-only data và policy cấm egress đều bị chặn.
6. Broker crash sau gửi/trước receipt không lặp nghiệp vụ; message có thể at-least-once tùy kênh, không hứa exactly-once delivery.
7. Restart VM không mất request; volume reuse không lộ dữ liệu khác scope; external effect uncertain được reconcile.
8. Báo cáo chi phí gồm VM/local processing và retries; không lấy giảm server CPU làm bằng chứng tổng chi phí giảm.

## 8. Nhóm cần quyết định

Chọn primary channel và fallback; blocker owner/deadline/quiet hours; một workload cho spike; VM host và resource cap; strict on-prem hay ngoại lệ; policy chuyển dữ liệu và executor fallback; ngưỡng recovery; scope giữ được theo thời gian học. Ghi quyết định qua issue/ADR sau team review, không coi tài liệu này là đã chốt.

Nguồn trải nghiệm Dot là transcript người dùng cung cấp trong chat: persistent identity, automation theo event, điều tra trước khi người dùng mở app và tiếp tục cùng thread trên nhiều thiết bị. Transcript không mô tả crash recovery hay bảo đảm completion; không dùng nó làm bằng chứng implementation của OpenAI.

Nguồn kỹ thuật: [WebAssembly sandbox](https://webassembly.org/docs/security/), [browser lifecycle](https://developer.chrome.com/docs/web-platform/page-lifecycle-api), [ONNX Runtime Web](https://onnxruntime.ai/docs/tutorials/web/), và Pi Durable đã pin trong ARCHITECTURE §11. Các lựa chọn này là tham khảo; chưa phải benchmark hay runtime được nhóm chọn.
