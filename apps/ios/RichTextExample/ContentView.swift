import SwiftUI
import UIKit
import RichTextiOS

private let people = [
    MentionItem(id: "u123", label: "Jane Doe"),
    MentionItem(id: "u1", label: "Ada Lovelace"),
    MentionItem(id: "u9", label: "Sam Lee"),
    MentionItem(id: "u42", label: "Grace Hopper"),
]

private let samples: [(id: String, label: String, text: String)] = [
    (
        "canonical",
        "Canonical",
        "Hello **team**, check this code `const x = 1;` and ask <@u123|Jane Doe>!"
    ),
    (
        "status",
        "Heading + list",
        """
        # Status
        - ship **v1**
        - ask <@u9|Sam Lee>

        See [Help](https://example.com/help).

        ```ts
        const ok = true;
        ```
        """
    ),
    (
        "thread",
        "Thread",
        "Hey <@u1|Ada Lovelace>, the *deploy* is ready.\nPing <@u42|Grace Hopper> if CI is red."
    ),
]

struct MentionPill: View {
    let payload: MentionPayload

    var body: some View {
        Text("@\(payload.userName)")
            .font(.subheadline.weight(.bold))
            .foregroundStyle(.white)
            .padding(.horizontal, 8)
            .padding(.vertical, 2)
            .background(Color.teal)
            .clipShape(Capsule())
    }
}

struct ContentView: View {
    @State private var markdown = samples[0].text
    @State private var selectedSample = samples[0].id
    @State private var useCustomComponents = true

    private var components: RichTextComponentRegistry {
        guard useCustomComponents else {
            return .default
        }
        return RichTextComponentRegistry(
            mention: { payload in AnyView(MentionPill(payload: payload)) },
            bold: { content in AnyView(content.foregroundStyle(Color.purple)) },
            codeBlock: { payload in
                AnyView(
                    Text(payload.value)
                        .font(.system(.footnote, design: .monospaced))
                        .foregroundStyle(Color.white)
                        .padding(10)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color.black.opacity(0.85))
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                )
            }
        )
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Text("Edit Markdown + mention tokens, preview the renderer, and inspect the SMS strip. Type @ for people and : for emoji.")
                        .foregroundStyle(.secondary)

                    Toggle("Custom components", isOn: $useCustomComponents)

                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack {
                            ForEach(samples, id: \.id) { sample in
                                Button(sample.label) {
                                    selectedSample = sample.id
                                    markdown = sample.text
                                }
                                .buttonStyle(.borderedProminent)
                                .tint(selectedSample == sample.id ? .indigo : .gray)
                            }
                        }
                    }

                    section("Editor") {
                        RichTextEditorView(
                            text: $markdown,
                            components: components,
                            placeholder: "Write a Slack-like message",
                            mentionProvider: { query in
                                let normalized = query.lowercased()
                                return people.filter {
                                    $0.label.lowercased().contains(normalized) || normalized.isEmpty
                                }
                            }
                        )
                        .padding(8)
                        .background(Color(.secondarySystemBackground))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    }

                    section("Renderer") {
                        MessageRendererView(text: markdown, components: components)
                            .padding(12)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Color(.secondarySystemBackground))
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                    }

                    section("SMS / Twilio") {
                        Text(stripMarkdownAndMentions(markdown))
                            .padding(12)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Color(.secondarySystemBackground))
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                    }

                    section("Stored Markdown") {
                        Text(markdown)
                            .font(.system(.footnote, design: .monospaced))
                            .padding(12)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Color.black.opacity(0.85))
                            .foregroundStyle(.white)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                }
                .padding()
            }
            .navigationTitle("Rich Text")
        }
    }

    private func section<Content: View>(_ title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title.uppercased())
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)
            content()
        }
    }
}

#Preview {
    ContentView()
}
