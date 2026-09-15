#if canImport(UIKit)
import UIKit
import SwiftUI

enum RichTextAttr {
    static let mention = NSAttributedString.Key("com.company.richtext.mention")
    static let headingLevel = NSAttributedString.Key("com.company.richtext.headingLevel")
    static let codeBlock = NSAttributedString.Key("com.company.richtext.codeBlock")
    static let listOrdered = NSAttributedString.Key("com.company.richtext.listOrdered")
}

enum AttributedMarkdown {
    static func attributedString(
        from document: DocumentNode,
        components: RichTextComponentRegistry
    ) -> NSAttributedString {
        let result = NSMutableAttributedString()
        for (index, block) in document.children.enumerated() {
            if index > 0 {
                result.append(NSAttributedString(string: "\n\n"))
            }
            result.append(attributedBlock(block, components: components))
        }
        return result
    }

    static func markdown(from attributed: NSAttributedString) -> String {
        if attributed.length == 0 {
            return ""
        }
        let paragraphs = splitBlocks(attributed)
        return paragraphs.map { inlineMarkdown($0) }.joined(separator: "\n\n")
    }

    private static func attributedBlock(
        _ node: BlockNode,
        components: RichTextComponentRegistry
    ) -> NSAttributedString {
        switch node {
        case .paragraph(let children):
            return attributedInline(children, components: components)
        case .heading(let level, let children):
            var attrs = headingAttrs(level)
            attrs[RichTextAttr.headingLevel] = level
            return attributedInline(children, components: components, extra: attrs)
        case .codeBlock(let language, let value):
            return NSAttributedString(
                string: value,
                attributes: [
                    .font: UIFont.monospacedSystemFont(ofSize: 15, weight: .regular),
                    .backgroundColor: UIColor.secondarySystemBackground,
                    RichTextAttr.codeBlock: language ?? "",
                ]
            )
        case .list(let ordered, let start, let items):
            let result = NSMutableAttributedString()
            for (index, item) in items.enumerated() {
                if index > 0 { result.append(NSAttributedString(string: "\n")) }
                let marker = ordered ? "\((start ?? 1) + index). " : "• "
                var markerAttrs: [NSAttributedString.Key: Any] = [
                    RichTextAttr.listOrdered: ordered,
                ]
                result.append(NSAttributedString(string: marker, attributes: markerAttrs))
                for child in item.children {
                    switch child {
                    case .paragraph(let children):
                        result.append(attributedInline(children, components: components, extra: markerAttrs))
                    case .list(let nestedOrdered, let nestedStart, let nestedItems):
                        result.append(NSAttributedString(string: "\n"))
                        result.append(
                            attributedBlock(
                                .list(ordered: nestedOrdered, start: nestedStart, items: nestedItems),
                                components: components
                            )
                        )
                    }
                }
            }
            return result
        }
    }

    private static func attributedInline(
        _ nodes: [InlineNode],
        components: RichTextComponentRegistry,
        extra: [NSAttributedString.Key: Any] = [:]
    ) -> NSAttributedString {
        let result = NSMutableAttributedString()
        for node in nodes {
            result.append(attributedInlineNode(node, components: components, extra: extra))
        }
        return result
    }

    private static func attributedInlineNode(
        _ node: InlineNode,
        components: RichTextComponentRegistry,
        extra: [NSAttributedString.Key: Any]
    ) -> NSAttributedString {
        switch node {
        case .text(let value):
            return NSAttributedString(string: value, attributes: extra.merging(baseAttrs()) { current, _ in current })
        case .hardBreak:
            return NSAttributedString(string: "\n", attributes: extra)
        case .mention(let payload):
            return mentionAttachment(payload: payload, components: components)
        case .bold(let children):
            var attrs = extra.merging(baseAttrs()) { current, _ in current }
            attrs[.font] = UIFont.systemFont(ofSize: 16, weight: .bold)
            return attributedInline(children, components: components, extra: attrs)
        case .italic(let children):
            var attrs = extra
            attrs[.obliqueness] = 0.2
            return attributedInline(children, components: components, extra: attrs)
        case .inlineCode(let value):
            return NSAttributedString(
                string: value,
                attributes: extra.merging([
                    .font: UIFont.monospacedSystemFont(ofSize: 15, weight: .regular),
                    .backgroundColor: UIColor.secondarySystemBackground,
                ]) { _, new in new }
            )
        case .link(let href, let children):
            var attrs = extra
            attrs[.link] = URL(string: href)
            attrs[.foregroundColor] = UIColor.systemBlue
            return attributedInline(children, components: components, extra: attrs)
        }
    }

    static func mentionAttachment(
        payload: MentionPayload,
        components: RichTextComponentRegistry
    ) -> NSAttributedString {
        let attachment = MentionTextAttachment(payload: payload, components: components)
        let result = NSMutableAttributedString(attachment: attachment)
        result.addAttribute(
            RichTextAttr.mention,
            value: payload,
            range: NSRange(location: 0, length: result.length)
        )
        return result
    }

    private static func baseAttrs() -> [NSAttributedString.Key: Any] {
        [.font: UIFont.systemFont(ofSize: 16)]
    }

    private static func headingAttrs(_ level: Int) -> [NSAttributedString.Key: Any] {
        let size: CGFloat = [28, 24, 22, 20, 18, 16][max(0, min(level - 1, 5))]
        return [.font: UIFont.systemFont(ofSize: size, weight: .bold)]
    }

    private static func splitBlocks(_ attributed: NSAttributedString) -> [NSAttributedString] {
        let text = attributed.string as NSString
        let parts = text.components(separatedBy: "\n\n")
        var blocks: [NSAttributedString] = []
        var cursor = 0
        for (index, part) in parts.enumerated() {
            let length = (part as NSString).length
            if length > 0 {
                blocks.append(attributed.attributedSubstring(from: NSRange(location: cursor, length: length)))
            }
            cursor += length
            if index < parts.count - 1 {
                cursor += 2
            }
        }
        return blocks
    }

    private static func inlineMarkdown(_ attributed: NSAttributedString) -> String {
        if attributed.length == 0 {
            return ""
        }
        let first = attributed.attributes(at: 0, effectiveRange: nil)
        if let language = first[RichTextAttr.codeBlock] as? String {
            return "```\(language)\n\(attributed.string)\n```"
        }
        var prefix = ""
        if let level = first[RichTextAttr.headingLevel] as? Int {
            prefix = String(repeating: "#", count: level) + " "
        }
        var output = ""
        attributed.enumerateAttributes(in: NSRange(location: 0, length: attributed.length)) { attrs, range, _ in
            if let payload = attrs[RichTextAttr.mention] as? MentionPayload {
                output += "<@\(payload.userId)|\(payload.userName)>"
                return
            }
            if let attachment = attrs[.attachment] as? MentionTextAttachment {
                output += "<@\(attachment.payload.userId)|\(attachment.payload.userName)>"
                return
            }
            let chunk = attributed.attributedSubstring(from: range).string
            if chunk.isEmpty { return }
            if let url = attrs[.link] as? URL {
                output += "[\(chunk)](\(url.absoluteString))"
                return
            }
            var wrapped = chunk
            let font = attrs[.font] as? UIFont
            if font?.fontDescriptor.symbolicTraits.contains(.traitMonoSpace) == true {
                wrapped = "`\(chunk)`"
            } else {
                if font?.fontDescriptor.symbolicTraits.contains(.traitBold) == true,
                   attrs[RichTextAttr.headingLevel] == nil {
                    wrapped = "**\(wrapped)**"
                }
                if attrs[.obliqueness] != nil || font?.fontDescriptor.symbolicTraits.contains(.traitItalic) == true {
                    wrapped = "*\(wrapped)*"
                }
            }
            output += wrapped
        }
        if first[RichTextAttr.listOrdered] as? Bool == true {
            return output
                .replacingOccurrences(of: "• ", with: "- ")
        }
        if first[RichTextAttr.listOrdered] as? Bool == false {
            return output.replacingOccurrences(of: "• ", with: "- ")
        }
        return prefix + output
    }
}

final class MentionTextAttachment: NSTextAttachment {
    let payload: MentionPayload

    init(payload: MentionPayload, components: RichTextComponentRegistry) {
        self.payload = payload
        super.init(data: nil, ofType: nil)
        let view: AnyView
        if let custom = components.mention {
            view = custom(payload)
        } else {
            view = AnyView(
                Text("@\(payload.userName)")
                    .font(.body.weight(.semibold))
                    .foregroundColor(.blue)
                    .padding(.horizontal, 6)
                    .background(Color.blue.opacity(0.12))
                    .clipShape(Capsule())
            )
        }
        image = Snapshotter.image(from: view)
        bounds = CGRect(x: 0, y: -4, width: image?.size.width ?? 80, height: image?.size.height ?? 20)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
}

enum Snapshotter {
    static func image(from view: AnyView) -> UIImage {
        let controller = UIHostingController(rootView: view)
        let target = controller.view!
        target.backgroundColor = .clear
        let fitting = target.systemLayoutSizeFitting(UIView.layoutFittingCompressedSize)
        let size = CGSize(width: max(fitting.width, 40), height: max(fitting.height, 18))
        target.bounds = CGRect(origin: .zero, size: size)
        let renderer = UIGraphicsImageRenderer(size: size)
        return renderer.image { _ in
            target.drawHierarchy(in: target.bounds, afterScreenUpdates: true)
        }
    }
}
#endif
