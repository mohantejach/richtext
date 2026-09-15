import { createContext, useContext, type ReactNode } from "react";
import type { CustomComponents } from "./types";

const ComponentsContext = createContext<CustomComponents>({});

export function ComponentsProvider({
  components,
  children,
}: {
  components: CustomComponents;
  children: ReactNode;
}): ReactNode {
  return (
    <ComponentsContext.Provider value={components}>
      {children}
    </ComponentsContext.Provider>
  );
}

export function useRichTextComponents(): CustomComponents {
  return useContext(ComponentsContext);
}

export function resolveComponent<K extends keyof CustomComponents>(
  components: CustomComponents,
  key: K,
): CustomComponents[K] | undefined {
  return components[key];
}
