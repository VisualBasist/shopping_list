'use client'
import Link from 'next/link';
import useSWR from 'swr';

type Store = { id: string, name: string };

export default function Page() {
    const { data: stores, error, isValidating } = useSWR<Store[]>('http://localhost:8080/stores');
    return (
        <main>
            {error && <p>{error.message}</p>}
            {isValidating && <p>読み込み中</p>}
            {stores &&
                <ul>
                    {stores.map(x => <li key={x.id}><Link href={`/stores/${x.id}/items`}>{x.name}</Link></li>)}
                </ul>
            }
        </main>
    );
}