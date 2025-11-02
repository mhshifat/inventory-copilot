import "sonner/dist/styles.css";
import type { PropsWithChildren } from "react";
import { Toaster } from "sonner";
import SSEProvider from "./sse";

interface ProvidersProps {
  shop: string;
}

export default function Providers({ children, shop }: PropsWithChildren<ProvidersProps>) {
  return (
    <SSEProvider
      shop={shop}
    >
      <Toaster expand position="top-right" richColors closeButton />
      {children}
    </SSEProvider>
  )
}