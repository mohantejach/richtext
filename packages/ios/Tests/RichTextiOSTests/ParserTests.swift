import XCTest
@testable import RichTextiOS

final class ParserTests: XCTestCase {
    func testCanonicalSample() {
        let source = "Hello **team**, check this code `const x = 1;` and ask <@u123|Jane Doe>!"
        let document = MarkdownParser.parse(source)
        XCTAssertEqual(document.children.count, 1)
        guard case .paragraph(let children) = document.children[0] else {
            return XCTFail("expected paragraph")
        }
        XCTAssertEqual(children.count, 7)
        XCTAssertEqual(children[0], .text("Hello "))
        XCTAssertEqual(children[1], .bold([.text("team")]))
        XCTAssertEqual(children[3], .inlineCode("const x = 1;"))
        XCTAssertEqual(children[5], .mention(MentionPayload(userId: "u123", userName: "Jane Doe")))
    }

    func testRoundTrip() {
        let source = "Hello **team**, check this code `const x = 1;` and ask <@u123|Jane Doe>!"
        XCTAssertEqual(MarkdownSerializer.serialize(MarkdownParser.parse(source)), source)
    }

    func testDoesNotParseMarkdownInsideCode() {
        let document = MarkdownParser.parse("use `**not bold**`")
        guard case .paragraph(let children) = document.children[0] else {
            return XCTFail("expected paragraph")
        }
        XCTAssertEqual(children, [.text("use "), .inlineCode("**not bold**")])
    }
}

final class StripTests: XCTestCase {
    func testStripCanonicalSample() {
        let source = "Hello **team**, check this code `const x = 1;` and ask <@u123|Jane Doe>!"
        XCTAssertEqual(
            stripMarkdownAndMentions(source),
            "Hello team, check this code const x = 1; and ask @Jane Doe!"
        )
    }
}
