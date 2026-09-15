import {
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useImperativeHandle,
  useState,
  forwardRef,
} from "react";
import { createPortal } from "react-dom";

export interface SuggestionListHandle {
  onKeyDown: (event: KeyboardEvent | { key: string }) => boolean;
}

export interface SuggestionItem {
  id: string;
  label: string;
  detail?: string;
}

export interface SuggestionListProps {
  items: SuggestionItem[];
  command: (item: SuggestionItem) => void;
  clientRect?: (() => DOMRect | null) | null;
}

export const SuggestionList = forwardRef<SuggestionListHandle, SuggestionListProps>(
  function SuggestionList({ items, command, clientRect }, ref): ReactNode {
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => {
      setSelectedIndex(0);
    }, [items]);

    useImperativeHandle(ref, () => ({
      onKeyDown(event: KeyboardEvent | { key: string }) {
        if (items.length === 0) {
          return false;
        }
        if (event.key === "ArrowUp") {
          setSelectedIndex((index) => (index + items.length - 1) % items.length);
          return true;
        }
        if (event.key === "ArrowDown") {
          setSelectedIndex((index) => (index + 1) % items.length);
          return true;
        }
        if (event.key === "Enter" || event.key === "Tab") {
          const item = items[selectedIndex];
          if (item) {
            command(item);
          }
          return true;
        }
        return false;
      },
    }));

    const rect = clientRect?.() ?? null;
    if (!rect || items.length === 0 || typeof document === "undefined") {
      return null;
    }

    return createPortal(
      <div
        className="rt-suggestion"
        style={{ left: rect.left, top: rect.bottom + 6 }}
        role="listbox"
      >
        {items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            role="option"
            aria-selected={index === selectedIndex}
            className={
              index === selectedIndex ? "rt-suggestion-item is-selected" : "rt-suggestion-item"
            }
            onMouseDown={(event) => {
              event.preventDefault();
              command(item);
            }}
          >
            <span>{item.label}</span>
            {item.detail ? <span className="rt-suggestion-detail">{item.detail}</span> : null}
          </button>
        ))}
      </div>,
      document.body,
    );
  },
);
