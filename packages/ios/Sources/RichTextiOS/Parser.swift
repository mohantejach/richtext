import Foundation

public enum MarkdownParser {
    public static func parse(_ source: String, slackLineBreaks: Bool = true) -> DocumentNode {
        let normalized = source.replacingOccurrences(of: "\r\n", with: "\n")
            .replacingOccurrences(of: "\r", with: "\n")
        let lines = normalized.split(omittingEmptySubsequences: false, whereSeparator: \.isNewline)
            .map(String.init)
        var blocks: [BlockNode] = []
        var index = 0

        while index < lines.count {
            let line = lines[index]
            if line.trimmingCharacters(in: .whitespaces).isEmpty {
                index += 1
                continue
            }
            if let fence = matchFence(line) {
                let result = readCodeBlock(lines: lines, start: index, opening: fence)
                blocks.append(result.block)
                index = result.nextIndex
                continue
            }
            if let heading = matchHeading(line) {
                blocks.append(.heading(level: heading.level, children: parseInline(heading.content)))
                index += 1
                continue
            }
            if matchListItem(line) != nil {
                let result = readList(lines: lines, start: index, slackLineBreaks: slackLineBreaks)
                blocks.append(result.list)
                index = result.nextIndex
                continue
            }
            let result = readParagraph(lines: lines, start: index, slackLineBreaks: slackLineBreaks)
            blocks.append(result.paragraph)
            index = result.nextIndex
        }
        return DocumentNode(children: blocks)
    }

    public static func parseInline(_ source: String) -> [InlineNode] {
        parseInlineRange(source, start: source.startIndex, end: source.endIndex).nodes
    }
}

private let mentionRegex = try! NSRegularExpression(pattern: "^<@([^|>]+)\\|([^>]+)>")
private let headingRegex = try! NSRegularExpression(pattern: "^(#{1,6})[ \\t]+(.*)$")
private let unorderedRegex = try! NSRegularExpression(pattern: "^(\\s*)([-*+])[ \\t]+(.*)$")
private let orderedRegex = try! NSRegularExpression(pattern: "^(\\s*)(\\d+)\\.[ \\t]+(.*)$")
private let fenceRegex = try! NSRegularExpression(pattern: "^(`{3,}|~{3,})(.*)$")
private let escapable = Set(["\\", "`", "*", "_", "[", "]", "<", ">"])

private func match(_ regex: NSRegularExpression, in string: String) -> [String]? {
    let range = NSRange(string.startIndex..., in: string)
    guard let match = regex.firstMatch(in: string, range: range) else {
        return nil
    }
    var parts: [String] = []
    for index in 0..<match.numberOfRanges {
        guard let range = Range(match.range(at: index), in: string) else {
            parts.append("")
            continue
        }
        parts.append(String(string[range]))
    }
    return parts
}

private func matchFence(_ line: String) -> (marker: String, language: String?)? {
    guard let parts = match(fenceRegex, in: line) else {
        return nil
    }
    let language = parts.count > 2 ? parts[2].trimmingCharacters(in: .whitespaces) : ""
    return (parts[1], language.isEmpty ? nil : language)
}

private func matchHeading(_ line: String) -> (level: Int, content: String)? {
    guard let parts = match(headingRegex, in: line) else {
        return nil
    }
    return (min(parts[1].count, 6), parts[2])
}

private func matchListItem(_ line: String) -> (indent: String, ordered: Bool, content: String)? {
    if let parts = match(orderedRegex, in: line) {
        return (parts[1], true, parts[3])
    }
    if let parts = match(unorderedRegex, in: line) {
        return (parts[1], false, parts[3])
    }
    return nil
}

private func indentWidth(_ prefix: String) -> Int {
    prefix.reduce(0) { $0 + ($1 == "\t" ? 4 : 1) }
}

private func readCodeBlock(
    lines: [String],
    start: Int,
    opening: (marker: String, language: String?)
) -> (block: BlockNode, nextIndex: Int) {
    var body: [String] = []
    var index = start + 1
    while index < lines.count {
        let line = lines[index]
        if let closing = matchFence(line), closing.marker == opening.marker, closing.language == nil {
            index += 1
            break
        }
        body.append(line)
        index += 1
    }
    return (.codeBlock(language: opening.language, value: body.joined(separator: "\n")), index)
}

private func peekNonEmpty(lines: [String], from: Int) -> (index: Int, line: String)? {
    var index = from
    while index < lines.count {
        if !lines[index].trimmingCharacters(in: .whitespaces).isEmpty {
            return (index, lines[index])
        }
        index += 1
    }
    return nil
}

private func readParagraph(
    lines: [String],
    start: Int,
    slackLineBreaks: Bool
) -> (paragraph: BlockNode, nextIndex: Int) {
    var collected: [String] = []
    var index = start
    while index < lines.count {
        let line = lines[index]
        if line.trimmingCharacters(in: .whitespaces).isEmpty {
            break
        }
        if matchFence(line) != nil || matchHeading(line) != nil || matchListItem(line) != nil {
            break
        }
        collected.append(line)
        index += 1
    }
    let joined = slackLineBreaks ? collected.joined(separator: "\n") : collected.joined(separator: " ")
    return (.paragraph(MarkdownParser.parseInline(joined)), index)
}

private func readList(
    lines: [String],
    start: Int,
    slackLineBreaks: Bool
) -> (list: BlockNode, nextIndex: Int) {
    let first = lines[start]
    let firstMatch = matchListItem(first)!
    let ordered = firstMatch.ordered
    let baseIndent = indentWidth(firstMatch.indent)
    let startNumber: Int? = {
        if let parts = match(orderedRegex, in: first) {
            return Int(parts[2])
        }
        return nil
    }()
    var items: [ListItemNode] = []
    var index = start

    while index < lines.count {
        let line = lines[index]
        if line.trimmingCharacters(in: .whitespaces).isEmpty {
            guard let lookahead = peekNonEmpty(lines: lines, from: index + 1) else { break }
            guard let nextItem = matchListItem(lookahead.line),
                  indentWidth(nextItem.indent) >= baseIndent else { break }
            index += 1
            continue
        }
        guard let itemMatch = matchListItem(line) else { break }
        let indent = indentWidth(itemMatch.indent)
        if indent != baseIndent || itemMatch.ordered != ordered { break }
        let result = readListItem(lines: lines, start: index, itemIndent: indent, slackLineBreaks: slackLineBreaks)
        items.append(result.item)
        index = result.nextIndex
    }
    return (.list(ordered: ordered, start: ordered ? startNumber : nil, items: items), index)
}

private func readListItem(
    lines: [String],
    start: Int,
    itemIndent: Int,
    slackLineBreaks: Bool
) -> (item: ListItemNode, nextIndex: Int) {
    let first = matchListItem(lines[start])
    var paragraphLines = [first?.content ?? ""]
    var index = start + 1
    var children: [ListItemChild] = []

    func flushParagraph() {
        let text = paragraphLines.joined(separator: slackLineBreaks ? "\n" : " ")
            .replacingOccurrences(of: "\\s+$", with: "", options: .regularExpression)
        paragraphLines.removeAll()
        if !text.isEmpty {
            children.append(.paragraph(MarkdownParser.parseInline(text)))
        }
    }

    while index < lines.count {
        let line = lines[index]
        if line.trimmingCharacters(in: .whitespaces).isEmpty {
            guard let next = peekNonEmpty(lines: lines, from: index + 1) else { break }
            if let nextItem = matchListItem(next.line) {
                if indentWidth(nextItem.indent) <= itemIndent { break }
                flushParagraph()
                let nested = readList(lines: lines, start: next.index, slackLineBreaks: slackLineBreaks)
                if case let .list(ordered, startValue, items) = nested.list {
                    children.append(.list(ordered: ordered, start: startValue, items: items))
                }
                index = nested.nextIndex
                continue
            }
            index += 1
            continue
        }
        if let itemMatch = matchListItem(line) {
            let indent = indentWidth(itemMatch.indent)
            if indent == itemIndent { break }
            if indent > itemIndent {
                flushParagraph()
                let nested = readList(lines: lines, start: index, slackLineBreaks: slackLineBreaks)
                if case let .list(ordered, startValue, items) = nested.list {
                    children.append(.list(ordered: ordered, start: startValue, items: items))
                }
                index = nested.nextIndex
                continue
            }
            break
        }
        let continuation = line.prefix { $0 == " " || $0 == "\t" }
        if indentWidth(String(continuation)) > itemIndent {
            paragraphLines.append(line.trimmingCharacters(in: .whitespaces))
            index += 1
            continue
        }
        break
    }
    flushParagraph()
    if children.isEmpty {
        children.append(.paragraph([]))
    }
    return (ListItemNode(children: children), index)
}

private func parseInlineRange(
    _ source: String,
    start: String.Index,
    end: String.Index
) -> (nodes: [InlineNode], consumed: String.Index) {
    var nodes: [InlineNode] = []
    var index = start

    func pushText(_ value: String) {
        guard !value.isEmpty else { return }
        if case .text(let existing) = nodes.last {
            nodes[nodes.count - 1] = .text(existing + value)
        } else {
            nodes.append(.text(value))
        }
    }

    while index < end {
        let remaining = source[index..<end]
        if remaining.first == "\n" {
            nodes.append(.hardBreak)
            index = source.index(after: index)
            continue
        }
        if remaining.hasPrefix("\\"), remaining.count > 1 {
            let next = remaining[remaining.index(after: remaining.startIndex)]
            if escapable.contains(String(next)) {
                pushText(String(next))
                index = source.index(index, offsetBy: 2)
                continue
            }
        }
        if let mention = match(mentionRegex, in: String(remaining)) {
            nodes.append(.mention(MentionPayload(userId: mention[1], userName: mention[2])))
            index = source.index(index, offsetBy: mention[0].count)
            continue
        }
        if remaining.hasPrefix("`"), let code = readInlineCode(source, start: index, end: end) {
            nodes.append(.inlineCode(code.value))
            index = code.end
            continue
        }
        if remaining.hasPrefix("["), let link = readLink(source, start: index, end: end) {
            nodes.append(link.node)
            index = link.end
            continue
        }
        if remaining.hasPrefix("***") || remaining.hasPrefix("___") {
            let delimiter = String(remaining.prefix(3))
            if let closer = findCloser(source, start: source.index(index, offsetBy: 3), end: end, delimiter: delimiter) {
                let inner = parseInlineRange(source, start: source.index(index, offsetBy: 3), end: closer).nodes
                nodes.append(.bold([.italic(inner)]))
                index = source.index(closer, offsetBy: 3)
                continue
            }
        }
        if remaining.hasPrefix("**") || remaining.hasPrefix("__") {
            let delimiter = String(remaining.prefix(2))
            if let closer = findCloser(source, start: source.index(index, offsetBy: 2), end: end, delimiter: delimiter) {
                nodes.append(.bold(parseInlineRange(source, start: source.index(index, offsetBy: 2), end: closer).nodes))
                index = source.index(closer, offsetBy: 2)
                continue
            }
        }
        if remaining.hasPrefix("*") || remaining.hasPrefix("_") {
            let delimiter = String(remaining.first!)
            if !isFlankingOpener(source, index: index, delimiter: delimiter) {
                pushText(delimiter)
                index = source.index(after: index)
                continue
            }
            if let closer = findItalicCloser(
                source,
                start: source.index(after: index),
                end: end,
                delimiter: delimiter
            ) {
                nodes.append(.italic(parseInlineRange(source, start: source.index(after: index), end: closer).nodes))
                index = source.index(after: closer)
                continue
            }
        }
        pushText(String(remaining.first!))
        index = source.index(after: index)
    }
    return (nodes, index)
}

private func readInlineCode(
    _ source: String,
    start: String.Index,
    end: String.Index
) -> (value: String, end: String.Index)? {
    var cursor = start
    var tickCount = 0
    while cursor < end, source[cursor] == "`" {
        tickCount += 1
        cursor = source.index(after: cursor)
    }
    guard tickCount > 0 else { return nil }
    let opener = String(repeating: "`", count: tickCount)
    guard let closeRange = source.range(of: opener, range: cursor..<end) else { return nil }
    var value = String(source[cursor..<closeRange.lowerBound])
    if value.hasPrefix(" "), value.hasSuffix(" "), value.trimmingCharacters(in: .whitespaces).isEmpty == false {
        value = String(value.dropFirst().dropLast())
    }
    return (value, closeRange.upperBound)
}

private func readLink(
    _ source: String,
    start: String.Index,
    end: String.Index
) -> (node: InlineNode, end: String.Index)? {
    guard source[start] == "[",
          let labelEnd = findBalanced(source, start: source.index(after: start), end: end, open: "[", close: "]")
    else { return nil }
    let afterLabel = source.index(after: labelEnd)
    guard afterLabel < end, source[afterLabel] == "(",
          let destEnd = findBalanced(source, start: source.index(after: afterLabel), end: end, open: "(", close: ")")
    else { return nil }
    let label = String(source[source.index(after: start)..<labelEnd])
    let destination = String(source[source.index(after: afterLabel)..<destEnd])
        .trimmingCharacters(in: .whitespaces)
    let href = destination.split(whereSeparator: \.isWhitespace).first.map(String.init) ?? ""
    guard !href.isEmpty else { return nil }
    return (.link(href: href, children: MarkdownParser.parseInline(label)), source.index(after: destEnd))
}

private func findBalanced(
    _ source: String,
    start: String.Index,
    end: String.Index,
    open: Character,
    close: Character
) -> String.Index? {
    var depth = 1
    var index = start
    while index < end {
        if source[index] == "\\" {
            index = source.index(index, offsetBy: 2, limitedBy: end) ?? end
            continue
        }
        if source[index...].hasPrefix("<@") {
            if let mentionEnd = source[index..<end].firstIndex(of: ">") {
                index = source.index(after: mentionEnd)
                continue
            }
        }
        if source[index] == "`", let code = readInlineCode(source, start: index, end: end) {
            index = code.end
            continue
        }
        if source[index] == open {
            depth += 1
        } else if source[index] == close {
            depth -= 1
            if depth == 0 { return index }
        }
        index = source.index(after: index)
    }
    return nil
}

private func findCloser(
    _ source: String,
    start: String.Index,
    end: String.Index,
    delimiter: String
) -> String.Index? {
    var index = start
    while index < end {
        if source[index] == "\\" {
            index = source.index(index, offsetBy: 2, limitedBy: end) ?? end
            continue
        }
        if source[index...].hasPrefix("<@") {
            if let mentionEnd = source[index..<end].firstIndex(of: ">") {
                index = source.index(after: mentionEnd)
                continue
            }
        }
        if source[index] == "`", let code = readInlineCode(source, start: index, end: end) {
            index = code.end
            continue
        }
        if source[index...].hasPrefix(delimiter) {
            return index
        }
        index = source.index(after: index)
    }
    return nil
}

private func findItalicCloser(
    _ source: String,
    start: String.Index,
    end: String.Index,
    delimiter: String
) -> String.Index? {
    var index = start
    while index < end {
        if source[index] == "\\" {
            index = source.index(index, offsetBy: 2, limitedBy: end) ?? end
            continue
        }
        if source[index...].hasPrefix("<@") {
            if let mentionEnd = source[index..<end].firstIndex(of: ">") {
                index = source.index(after: mentionEnd)
                continue
            }
        }
        if source[index] == "`", let code = readInlineCode(source, start: index, end: end) {
            index = code.end
            continue
        }
        if source[index...].hasPrefix(delimiter + delimiter) {
            index = source.index(index, offsetBy: 2, limitedBy: end) ?? end
            continue
        }
        if String(source[index]) == delimiter {
            return index
        }
        index = source.index(after: index)
    }
    return nil
}

private func isFlankingOpener(_ source: String, index: String.Index, delimiter: String) -> Bool {
    let prev: Character = index == source.startIndex
        ? " "
        : source[source.index(before: index)]
    let nextIndex = source.index(after: index)
    let next: Character? = nextIndex < source.endIndex ? source[nextIndex] : nil
    guard let next, String(next) != delimiter, !next.isWhitespace else { return false }
    if delimiter == "_", prev.isLetter || prev.isNumber { return false }
    return true
}
