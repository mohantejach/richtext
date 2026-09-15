import type { ReactNode } from "react";
import type { CustomComponents, MentionItem } from "../src";

export function TealMention({ userName }: { userId: string; userName: string }): ReactNode {
  return (
    <span
      style={{
        background: "#0f766e",
        color: "white",
        borderRadius: 999,
        padding: "0 8px",
        fontWeight: 700,
      }}
    >
      @{userName}
    </span>
  );
}

export function BrandBold({ children }: { children?: ReactNode }): ReactNode {
  return <strong style={{ color: "#7c3aed" }}>{children}</strong>;
}

export const exampleComponents: CustomComponents = {
  Mention: TealMention,
  Bold: BrandBold,
};

export async function lookupTeammates(query: string): Promise<MentionItem[]> {
  const people: MentionItem[] = [
    { id: "u123", label: "Jane Doe" },
    { id: "u9", label: "Sam Lee" },
    { id: "u1", label: "Ada Lovelace" },
  ];
  const normalized = query.trim().toLowerCase();
  return people.filter((person) => person.label.toLowerCase().includes(normalized));
}
