'use client'
import useSWR, { KeyedMutator } from 'swr';
import { Checkbox, CircularProgress, IconButton, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import { DeleteForever } from '@mui/icons-material';
import styles from './page.module.css'

type StoreItem = { item_id: string, name: string, store_id: string, is_done: boolean, price?: number };

function StoreListItem(items: StoreItem[], mutate: KeyedMutator<StoreItem[]>) {
    return items.map(x =>
        <ListItem key={x.item_id} secondaryAction={
            <IconButton aria-label="削除">
                <DeleteForever />
            </IconButton>
        }>
            <ListItemIcon onClick={async () => {
                // TODO: コンポーネントの外に
                await put_store_item_state(x.store_id, x.item_id, !x.is_done);
                mutate();
            }}>
                <Checkbox edge="start" checked={x.is_done} disableRipple />
            </ListItemIcon>
            <ListItemText primary={x.name} secondary={x.price && <div><span>単価</span><span>{x.price}</span></div>} />
        </ListItem >);
}

async function put_store_item_state(store_id: string, item_id: string, is_done: boolean) {
    await fetch(`http://localhost:8080/stores/${store_id}/items/${item_id}/state`,
        {
            method: "PUT", body: JSON.stringify({ is_done }),
            headers: { "Content-Type": "application/json" }
        });
}

export default function Page({ params }: { params: { store_id: string } }) {
    const { data: store_items, error, isLoading, mutate } = useSWR<StoreItem[], Error>(`http://localhost:8080/stores/${params.store_id}/items`);
    return (
        <main className={styles.main}>
            {error && <p>{error.message}</p>}
            {isLoading && <CircularProgress />}
            {store_items &&
                <>
                    <h1>買う</h1>
                    <List>
                        {StoreListItem(store_items.filter(x => !x.is_done), mutate)}
                    </List>
                    <h1>買った</h1>
                    <List>
                        {StoreListItem(store_items.filter(x => x.is_done), mutate)}
                    </List>
                </>
            }
        </main>
    );
}