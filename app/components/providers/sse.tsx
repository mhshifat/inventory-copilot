import { createContext, useContext } from "react";
import { useEventSource } from "remix-utils/sse/react";

interface SSEState {
    eventData: string | null;
}

const SSEContext = createContext<SSEState | null>(null);

interface SSEProviderProps {
    shop: string;
    children: React.ReactNode;
}

export default function SSEProvider({ children, shop }: SSEProviderProps) {
    const eventData = useEventSource('/api/sse?shop=' + encodeURIComponent(shop));

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