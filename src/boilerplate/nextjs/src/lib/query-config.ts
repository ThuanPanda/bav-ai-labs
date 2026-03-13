"use client";

import { QueryClient } from "@tanstack/react-query";
import { QueryCache } from "@tanstack/react-query";

export function makeQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                retry: 1, // retry up to 2 times
                refetchOnWindowFocus: false, // do not refetch when switching tabs
                refetchOnReconnect: true, // refetch when reconnecting to the network
                staleTime: 1000 * 60, // 1 minute -> consider data "fresh"
            },
        },
        queryCache: new QueryCache({
            onError: (error, query) => {
                console.error(`❌ Error in query [${query.queryHash}]:`, error);
            },
        }),
    });
}
