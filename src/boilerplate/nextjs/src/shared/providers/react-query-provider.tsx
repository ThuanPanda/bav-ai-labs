"use client";

import { ReactNode, useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { makeQueryClient } from "@/lib/query-config";

export function ReactQueryProvider({ children }: { children: ReactNode }) {
    const [queryClient] = useState(makeQueryClient);

    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
}
