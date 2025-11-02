import "sonner/dist/styles.css";
import type { PropsWithChildren } from "react";
import { Toaster } from "sonner";
import SSEProvider from "./sse";

export default function Providers({ children }: PropsWithChildren) {
  return (
    <SSEProvider>
      <Toaster expand position="top-right" richColors closeButton />
      {children}
    </SSEProvider>
  )
}