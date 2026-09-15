# connect-chat-utils

Cross-platform Slack-like rich text for Web (React), iOS (SwiftUI), and Android (Jetpack Compose).

Storage and transport is **standard Markdown plus mention tokens**:

```text
Hello **team**, check this code `const x = 1;` and ask <@u123|Jane Doe>!
```

The renderer and the editor on every platform take that raw string as input. The editor exports the same format on save. Teams inject custom UI for `mention`, `bold`, `italic`, `codeBlock`, `heading`, `link`, `list`, and related node types. Missing overrides fall back to platform defaults.

## Packages

| Package | Platform | Install |
|---|---|---|
| `@company/rich-text-core` | Shared TypeScript AST, parser, serializer, SMS strip | npm workspace |
| `@company/rich-text-web` | React renderer + Tiptap editor | npm workspace |
| `RichTextiOS` | Swift Package Manager | `packages/ios` |
| `richtext-android` | Gradle / Maven module | `packages/android` |

```text
apps/
  web/                  Vite playground (npm run example:web)
  ios/                  Xcode app (open RichTextExample.xcodeproj)
packages/
  core/                 @company/rich-text-core
  web/                  @company/rich-text-web
  ios/                  RichTextiOS (SPM)
  android/              library + Compose example app
  fixtures/             shared Markdown samples
```

## Example apps

Runnable playgrounds for local QA. Each one has an editor, renderer, custom-component toggle, sample messages, `@` mention lookup, `:` emoji suggestions, and an SMS preview.

### Web

```bash
npm install
npm run example:web
```

Opens at http://localhost:5173.

### iOS

```bash
open apps/ios/RichTextExample.xcodeproj
```

Select an iPhone simulator and press Run. The app links the local `RichTextiOS` package.

To build from the CLI (Mac Catalyst, no simulator runtime required):

```bash
xcodebuild -project apps/ios/RichTextExample.xcodeproj -scheme RichTextExample \
  -destination 'generic/platform=macOS,variant=Mac Catalyst' \
  CODE_SIGNING_ALLOWED=NO build
```

### Android

Open `packages/android` in Android Studio and run the **example** configuration, or:

```bash
cd packages/android
./gradlew :example:installDebug
```

`local.properties` with `sdk.dir` is required (Android Studio creates this automatically).

## Markdown subset

- Bold `**text**` / `__text__`
- Italic `*text*` / `_text_`
- Nested `***bold italic***`
- Inline code `` `code` ``
- Fenced code blocks
- Headings `#`–`######`
- Ordered and unordered lists (nested)
- Links `[label](url)`
- Mentions `<@userId|userName>`
- Slack-style single newlines as hard breaks
- Backslash escapes: `\* \_ \` \[ \] \< \>`

Mentions and Markdown inside inline code or fenced blocks are left literal.

## SMS / Twilio

`stripMarkdownAndMentions` is implemented in TypeScript, Swift, and Kotlin.

```text
Hello **team** and <@u123|Jane Doe>!
→ Hello team and @Jane Doe!
```

### TypeScript

```ts
import { stripMarkdownAndMentions } from "@company/rich-text-core";
// or from "@company/rich-text-web"
```

### Swift

```swift
import RichTextiOS
let sms = stripMarkdownAndMentions(markdown)
```

### Kotlin

```kotlin
import com.company.richtext.strip.stripMarkdownAndMentions
val sms = stripMarkdownAndMentions(markdown)
```

## Web

```bash
npm install @company/rich-text-web
```

```tsx
import {
  RichTextEditor,
  RichTextRenderer,
  type CustomComponents,
} from "@company/rich-text-web";
import "@company/rich-text-web/styles.css";

const components: CustomComponents = {
  Mention: ({ userName }) => <span className="pill">@{userName}</span>,
  Bold: ({ children }) => <strong className="brand">{children}</strong>,
  // Italic, InlineCode, CodeBlock, Heading, Link, List, ListItem, Paragraph
  // are optional — omitted keys use default elements.
};

<RichTextRenderer text={markdown} components={components} />

<RichTextEditor
  value={markdown}
  onChange={setMarkdown}
  components={components}
  onMentionQuery={async (query) => fetchUsers(query)}
/>
```

Tiptap maps custom React components through NodeViews (mention, heading, code block, lists, paragraph) and MarkViews (bold, italic, inline code, link). `@` opens mention suggestions; `:` opens the emoji picker.

## iOS (Swift Package Manager)

In Xcode: File → Add Package Dependencies → add `packages/ios`.

```swift
import RichTextiOS

let components = RichTextComponentRegistry(
    mention: { payload in AnyView(MentionPill(payload: payload)) }
)

MessageRendererView(text: markdown, components: components)

RichTextEditorView(
    text: $markdown,
    components: components,
    mentionProvider: { query in await searchPeople(query) }
)
```

If a node type has no custom view, the renderer uses native `AttributedString` / system text styling.

## Android (Gradle)

```kotlin
include(":richtext-android")
project(":richtext-android").projectDir =
    File(settingsDir, "../connect-chat-utils/packages/android/richtext-android")
```

```kotlin
val components = RichTextComponents.build(
    mention = { data -> MentionChip(data.mention!!) },
    bold = { data -> BrandBold { data.content() } },
)

MessageRenderer(text = markdown, components = components)

RichTextEditor(
    text = markdown,
    onTextChange = { markdown = it },
    components = components,
    onMentionQuery = { query -> searchPeople(query) },
)
```

`RichTextComponents.slots` is a `Map<NodeType, @Composable (NodeData) -> Unit>`. Absent keys fall back to `Text` + `AnnotatedString`.

## Edit-message pipeline

1. Load the stored Markdown + mention string into the editor (`value` / `text`).
2. The editor parses it into editable rich state (ProseMirror, `NSAttributedString`, or `AnnotatedString`).
3. On save, the editor serializes back to Markdown + `<@userId|userName>`.

## Development

```bash
npm install
npm test
npm run build

cd packages/ios && swift test
cd packages/android && ./gradlew :richtext-android:testDebugUnitTest
```
