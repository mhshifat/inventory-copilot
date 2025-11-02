import { createContext, useContext } from "react";
import { useEventSource } from "remix-utils/sse/react";

interface SSEState {
    eventData: string | null;
}

const SSEContext = createContext<SSEState | null>(null);

export default function SSEProvider({ children }: { children: React.ReactNode }) {
    const eventData = useEventSource('/api/sse');

    return (
        <SSEContext.Provider value={{ eventData }}>
            {children}
        </SSEContext.Provider>
    )
}

export function useSSE() {
    const context = useContext(SSEContext);
    if (!context) {
        throw new Error("useSSE must be used within a SSEProvider");
    }
    return context;
}