'use client'
import useSWR from 'swr';

type StoreItem = { id: string, name: string, price?: number };

export default function Page({ params }: { params: { store_id: string } }) {
    const { data: store_items, error, isLoading } = useSWR<StoreItem[], Error>(`http://localhost:8080/stores/${params.store_id}/items`);
    return (
        <main>
            {error && <p>{error.message}</p>}
            {isLoading && <p>読み込み中</p>}
            {store_items &&
                <ul>
                    {store_items.map(x => <li key={x.id}>{x.name}{x.price && <span>単価{x.price}</span>}</li>)}
                </ul>
            }
        </main>
    );
}