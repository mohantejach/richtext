import SwiftUI
import RichTextiOS

struct MentionPill: View {
    let payload: MentionPayload

    var body: some View {
        Text("@\(payload.userName)")
            .font(.body.weight(.bold))
            .foregroundStyle(.white)
            .padding(.horizontal, 8)
            .padding(.vertical, 2)
            .background(Color.teal)
            .clipShape(Capsule())
    }
}

struct ChatMessageView: View {
    let markdown: String

    var body: some View {
        MessageRendererView(
            text: markdown,
            components: RichTextComponentRegistry(
                mention: { payload in AnyView(MentionPill(payload: payload)) },
                bold: { content in AnyView(content.foregroundStyle(.purple)) }
            )
        )
    }
}

struct ChatComposerView: View {
    @State private var text = "Hello **team**, ask <@u123|Jane Doe>!"

    var body: some View {
        RichTextEditorView(
            text: $text,
            components: RichTextComponentRegistry(
                mention: { payload in AnyView(MentionPill(payload: payload)) }
            ),
            mentionProvider: { query in
                [
                    MentionItem(id: "u123", label: "Jane Doe"),
                    MentionItem(id: "u1", label: "Ada Lovelace"),
                ].filter { $0.label.lowercased().contains(query.lowercased()) || query.isEmpty }
            }
        )
    }
}
