'use client'
import useSWR from 'swr';
import { CircularProgress } from '@mui/material';
import styles from './page.module.css'

type StoreItem = { id: string, name: string, is_done: boolean, price?: number };

function ListItem(items: StoreItem[]) {
    return items.map(x => <li key={x.id}>{x.name}{x.price && <span>単価{x.price}</span>}</li>);
}

export default function Page({ params }: { params: { store_id: string } }) {
    const { data: store_items, error, isLoading } = useSWR<StoreItem[], Error>(`http://localhost:8080/stores/${params.store_id}/items`);
    return (
        <main className={styles.main}>
            {error && <p>{error.message}</p>}
            {isLoading && <CircularProgress />}
            {store_items &&
                <>
                    <h1>買う</h1>
                    <ul>
                        {ListItem(store_items.filter(x => !x.is_done))}
                    </ul>
                    <h1>買った</h1>
                    <ul>
                        {ListItem(store_items.filter(x => x.is_done))}
                    </ul>
                </>
            }
        </main>
    );
}