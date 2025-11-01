import "sonner/dist/styles.css";
import type { PropsWithChildren } from "react";
import { Toaster } from "sonner";

export default function Providers({ children }: PropsWithChildren) {
  return (
    <>
      <Toaster expand position="top-right" richColors closeButton />
      {children}
    </>
  )
}