// Codebase ứng dụng của Business Ops Agent. Các màn hình dự kiến (xem docs/YEU-CAU.md):
// trò chuyện với agent, hộp phiếu duyệt (chi tiền, skill mới), xem trace từng bước, quản lý skill.
const SCREENS = [
  { name: "Trò chuyện", detail: "giao việc cho agent điều phối" },
  { name: "Phiếu duyệt", detail: "đề nghị chi tiền và skill mới chờ người duyệt" },
  { name: "Trace", detail: "từng bước model, tool, quyết định chính sách" },
  { name: "Skill", detail: "skill theo phòng ban và bản đề xuất" },
]

export default function App() {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", maxWidth: 720, margin: "48px auto", padding: "0 16px" }}>
      <h1>Business Ops Agent</h1>
      <p>Khung ứng dụng. Agent chạy ở <code>agent/</code> (Python, LangGraph).</p>
      <ul>
        {SCREENS.map((s) => (
          <li key={s.name}>
            <strong>{s.name}</strong>: {s.detail}
          </li>
        ))}
      </ul>
    </main>
  )
}
