export interface EmojiItemRecord {
  name: string;
  char: string;
  aliases: string[];
}

export const EMOJI_CATALOG: EmojiItemRecord[] = [
  { name: "smile", char: "😄", aliases: ["happy", "smile"] },
  { name: "grinning", char: "😀", aliases: ["grin"] },
  { name: "joy", char: "😂", aliases: ["laugh", "lol"] },
  { name: "rofl", char: "🤣", aliases: ["rofl"] },
  { name: "wink", char: "😉", aliases: ["wink"] },
  { name: "blush", char: "😊", aliases: ["blush"] },
  { name: "heart_eyes", char: "😍", aliases: ["love"] },
  { name: "thinking", char: "🤔", aliases: ["think"] },
  { name: "neutral", char: "😐", aliases: ["neutral"] },
  { name: "cry", char: "😢", aliases: ["sad"] },
  { name: "sob", char: "😭", aliases: ["sob"] },
  { name: "angry", char: "😠", aliases: ["angry"] },
  { name: "thumbsup", char: "👍", aliases: ["+1", "yes"] },
  { name: "thumbsdown", char: "👎", aliases: ["-1", "no"] },
  { name: "clap", char: "👏", aliases: ["clap"] },
  { name: "wave", char: "👋", aliases: ["hello", "wave"] },
  { name: "pray", char: "🙏", aliases: ["please", "thanks"] },
  { name: "fire", char: "🔥", aliases: ["fire", "lit"] },
  { name: "tada", char: "🎉", aliases: ["party", "tada"] },
  { name: "rocket", char: "🚀", aliases: ["ship", "rocket"] },
  { name: "star", char: "⭐", aliases: ["star"] },
  { name: "sparkles", char: "✨", aliases: ["sparkle"] },
  { name: "heart", char: "❤️", aliases: ["heart", "love"] },
  { name: "check", char: "✅", aliases: ["check", "done"] },
  { name: "x", char: "❌", aliases: ["x", "nope"] },
  { name: "warning", char: "⚠️", aliases: ["warn"] },
  { name: "bulb", char: "💡", aliases: ["idea"] },
  { name: "eyes", char: "👀", aliases: ["eyes"] },
  { name: "100", char: "💯", aliases: ["100"] },
  { name: "ok_hand", char: "👌", aliases: ["ok"] },
  { name: "raised_hands", char: "🙌", aliases: ["hooray"] },
  { name: "muscle", char: "💪", aliases: ["strong"] },
  { name: "brain", char: "🧠", aliases: ["brain"] },
  { name: "writing", char: "✍️", aliases: ["write"] },
  { name: "calendar", char: "📅", aliases: ["date"] },
  { name: "clock", char: "🕒", aliases: ["time"] },
  { name: "link", char: "🔗", aliases: ["link"] },
  { name: "lock", char: "🔒", aliases: ["lock"] },
  { name: "unlock", char: "🔓", aliases: ["unlock"] },
  { name: "bug", char: "🐛", aliases: ["bug"] },
  { name: "computer", char: "💻", aliases: ["laptop"] },
  { name: "phone", char: "📱", aliases: ["mobile"] },
  { name: "email", char: "📧", aliases: ["mail"] },
  { name: "memo", char: "📝", aliases: ["memo", "note"] },
  { name: "book", char: "📚", aliases: ["books"] },
  { name: "coffee", char: "☕", aliases: ["coffee"] },
  { name: "pizza", char: "🍕", aliases: ["pizza"] },
  { name: "sun", char: "☀️", aliases: ["sun"] },
  { name: "moon", char: "🌙", aliases: ["moon"] },
  { name: "rain", char: "🌧️", aliases: ["rain"] },
];

export function searchEmoji(query: string, catalog: EmojiItemRecord[] = EMOJI_CATALOG): EmojiItemRecord[] {
  const normalized = query.trim().toLowerCase().replace(/^:/, "");
  if (!normalized) {
    return catalog.slice(0, 20);
  }
  return catalog
    .filter((item) => {
      if (item.name.includes(normalized)) {
        return true;
      }
      return item.aliases.some((alias) => alias.includes(normalized));
    })
    .slice(0, 20);
}
