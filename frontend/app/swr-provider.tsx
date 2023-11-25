'use client';
import { SWRConfig } from 'swr'
export const SWRProvider = ({ children }: { children: React.ReactNode }) => {
    return <SWRConfig value={{ fetcher: (resource, init) => fetch(process.env.NEXT_PUBLIC_BACKEND_BASE_URL + resource, init).then(res => res.json()) }}>{children}</SWRConfig>
};