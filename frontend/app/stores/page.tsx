'use client'
import { CircularProgress } from '@mui/material';
import Link from 'next/link';
import useSWR from 'swr';

type Store = { id: string, name: string };

export default function Page() {
    const { data: stores, error, isLoading } = useSWR<Store[]>('http://localhost:8080/stores');
    return (
        <main>
            {error && <p>{error.message}</p>}
            {isLoading && <CircularProgress />}
            {stores &&
                <ul>
                    {stores.map(x => <li key={x.id}><Link href={`/stores/${x.id}/items`}>{x.name}</Link></li>)}
                </ul>
            }
        </main>
    );
}