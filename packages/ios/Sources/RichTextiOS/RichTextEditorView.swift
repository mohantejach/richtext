import SwiftUI
#if canImport(UIKit)
import UIKit
#endif

public struct RichTextEditorView: View {
    @Binding public var text: String
    public var components: RichTextComponentRegistry
    public var placeholder: String
    public var mentionProvider: (String) async -> [MentionItem]
    public var emojiCatalog: [EmojiItem]

    @State private var mentionQuery: String?
    @State private var emojiQuery: String?
    @State private var mentionItems: [MentionItem] = []
    @State private var insertMention: MentionItem?
    @State private var insertEmoji: EmojiItem?

    public init(
        text: Binding<String>,
        components: RichTextComponentRegistry = .default,
        placeholder: String = "Write a message",
        mentionProvider: @escaping (String) async -> [MentionItem] = { _ in [] },
        emojiCatalog: [EmojiItem] = EmojiCatalog.all
    ) {
        self._text = text
        self.components = components
        self.placeholder = placeholder
        self.mentionProvider = mentionProvider
        self.emojiCatalog = emojiCatalog
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            #if canImport(UIKit)
            EditorTextView(
                text: $text,
                components: components,
                placeholder: placeholder,
                mentionQuery: $mentionQuery,
                emojiQuery: $emojiQuery,
                insertMention: $insertMention,
                insertEmoji: $insertEmoji
            )
            .frame(minHeight: 88)
            #else
            TextEditor(text: $text)
                .frame(minHeight: 88)
            #endif
            if let mentionQuery {
                SuggestionPanel(
                    title: "People",
                    items: mentionItems.map { "\($0.label)" }
                ) { index in
                    if mentionItems.indices.contains(index) {
                        insertMention = mentionItems[index]
                    }
                }
            }
            if let emojiQuery {
                let items = EmojiCatalog.search(emojiQuery, catalog: emojiCatalog)
                SuggestionPanel(
                    title: "Emoji",
                    items: items.map { "\($0.char)  :\($0.name):" }
                ) { index in
                    if items.indices.contains(index) {
                        insertEmoji = items[index]
                    }
                }
            }
        }
        .task(id: mentionQuery) {
            guard let mentionQuery else {
                mentionItems = []
                return
            }
            mentionItems = await mentionProvider(mentionQuery)
        }
    }
}

struct SuggestionPanel: View {
    let title: String
    let items: [String]
    let onSelect: (Int) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(title)
                .font(.caption.weight(.semibold))
                .padding(.horizontal, 12)
                .padding(.top, 8)
            ForEach(Array(items.enumerated()), id: \.offset) { index, item in
                Button {
                    onSelect(index)
                } label: {
                    Text(item)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                }
            }
        }
        .background(.thinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .padding(.top, 4)
    }
}

#if canImport(UIKit)
struct EditorTextView: UIViewRepresentable {
    @Binding var text: String
    var components: RichTextComponentRegistry
    var placeholder: String
    @Binding var mentionQuery: String?
    @Binding var emojiQuery: String?
    @Binding var insertMention: MentionItem?
    @Binding var insertEmoji: EmojiItem?

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    func makeUIView(context: Context) -> UITextView {
        let view = UITextView()
        view.delegate = context.coordinator
        view.font = .systemFont(ofSize: 16)
        view.backgroundColor = .clear
        view.adjustsFontForContentSizeCategory = true
        context.coordinator.applyMarkdown(text, to: view)
        return view
    }

    func updateUIView(_ uiView: UITextView, context: Context) {
        context.coordinator.parent = self
        if let mention = insertMention {
            context.coordinator.insertMention(mention, in: uiView)
            DispatchQueue.main.async { insertMention = nil }
        }
        if let emoji = insertEmoji {
            context.coordinator.insertEmoji(emoji, in: uiView)
            DispatchQueue.main.async { insertEmoji = nil }
        }
        if uiView.attributedText.string != NSAttributedString(
            attributedString: AttributedMarkdown.attributedString(
                from: MarkdownParser.parse(text),
                components: components
            )
        ).string, !uiView.isFirstResponder {
            context.coordinator.applyMarkdown(text, to: uiView)
        }
    }

    final class Coordinator: NSObject, UITextViewDelegate {
        var parent: EditorTextView

        init(_ parent: EditorTextView) {
            self.parent = parent
        }

        func applyMarkdown(_ markdown: String, to view: UITextView) {
            view.attributedText = AttributedMarkdown.attributedString(
                from: MarkdownParser.parse(markdown),
                components: parent.components
            )
        }

        func textViewDidChange(_ textView: UITextView) {
            parent.text = AttributedMarkdown.markdown(from: textView.attributedText)
            detectTriggers(in: textView)
        }

        func insertMention(_ item: MentionItem, in view: UITextView) {
            replaceQuery(in: view, prefix: "@") { range in
                let payload = MentionPayload(userId: item.id, userName: item.label)
                let chip = AttributedMarkdown.mentionAttachment(payload: payload, components: parent.components)
                view.textStorage.replaceCharacters(in: range, with: chip)
                view.textStorage.insert(NSAttributedString(string: " "), at: range.location + chip.length)
                view.selectedRange = NSRange(location: range.location + chip.length + 1, length: 0)
            }
            parent.mentionQuery = nil
            parent.text = AttributedMarkdown.markdown(from: view.attributedText)
        }

        func insertEmoji(_ item: EmojiItem, in view: UITextView) {
            replaceQuery(in: view, prefix: ":") { range in
                view.textStorage.replaceCharacters(in: range, with: NSAttributedString(string: "\(item.char) "))
                view.selectedRange = NSRange(location: range.location + item.char.count + 1, length: 0)
            }
            parent.emojiQuery = nil
            parent.text = AttributedMarkdown.markdown(from: view.attributedText)
        }

        private func replaceQuery(in view: UITextView, prefix: Character, mutate: (NSRange) -> Void) {
            let cursor = view.selectedRange.location
            let ns = view.attributedText.string as NSString
            let before = ns.substring(to: min(cursor, ns.length))
            guard let at = before.lastIndex(of: prefix) else { return }
            let utf16 = before[at...].utf16.count
            let range = NSRange(location: cursor - utf16, length: utf16)
            mutate(range)
        }

        private func detectTriggers(in view: UITextView) {
            let cursor = view.selectedRange.location
            let ns = view.attributedText.string as NSString
            let before = ns.substring(to: min(cursor, ns.length))
            parent.mentionQuery = query(in: before, prefix: "@")
            parent.emojiQuery = query(in: before, prefix: ":")
        }

        private func query(in before: String, prefix: Character) -> String? {
            guard let index = before.lastIndex(of: prefix) else { return nil }
            if index > before.startIndex {
                let previous = before[before.index(before: index)]
                if previous.isLetter || previous.isNumber {
                    return nil
                }
            }
            let token = String(before[index...].dropFirst())
            if token.contains(where: \.isWhitespace) { return nil }
            return token
        }
    }
}
#endif
