import { createContext, useContext, type ReactNode } from "react";

const AssistantHeaderSlotContext = createContext<HTMLElement | null>(null);

export function AssistantHeaderSlotProvider({
  target,
  children,
}: {
  target: HTMLElement | null;
  children: ReactNode;
}) {
  return (
    <AssistantHeaderSlotContext.Provider value={target}>
      {children}
    </AssistantHeaderSlotContext.Provider>
  );
}

export function useAssistantHeaderSlot() {
  return useContext(AssistantHeaderSlotContext);
}