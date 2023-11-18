'use client'
import useSWR, { KeyedMutator } from 'swr';
import { Autocomplete, Button, Checkbox, CircularProgress, IconButton, List, ListItem, ListItemIcon, ListItemText, TextField } from '@mui/material';
import { DeleteForever } from '@mui/icons-material';
import { useState } from 'react';
import styles from './page.module.css'

type StoreItem = { item_id: string, name: string, store_id: string, is_done: boolean, price?: number };
type Item = { id: string, name: string };

function StoreListItem(items: StoreItem[], mutate: KeyedMutator<StoreItem[]>) {
    return items.map(x =>
        <ListItem key={x.item_id} secondaryAction={
            <IconButton aria-label="削除">
                <DeleteForever />
            </IconButton>
        }
            onDragOver={e => e.preventDefault()}
            onDrop={async e => {
                const source_item_id = e.dataTransfer.getData("text/plain");
                await put_store_item_ordernumber(x.store_id, source_item_id, x.item_id);
                mutate();
            }}
        >
            <ListItemIcon onClick={async () => {
                // TODO: コンポーネントの外に
                await put_store_item_state(x.store_id, x.item_id, !x.is_done);
                mutate();
            }}>
                <Checkbox edge="start" checked={x.is_done} disableRipple />
            </ListItemIcon>
            <ListItemText primary={x.name} secondary={x.price && <div><span>単価</span><span>{x.price}</span></div>} draggable onDragStart={
                e => {
                    e.dataTransfer.setData("text/plain", x.item_id);
                    e.dataTransfer.dropEffect = "move";
                }
            } />
        </ListItem >);
}

async function send_json_request(path: string, method: 'POST' | 'PUT', body: any) {
    await fetch('http://localhost:8080/' + path,
        {
            method, body: JSON.stringify(body),
            headers: { "Content-Type": "application/json" }
        });
}

async function put_store_item_state(store_id: string, item_id: string, is_done: boolean) {
    await send_json_request(`stores/${store_id}/items/${item_id}/state`, "PUT", { is_done });
}

async function put_store_item_ordernumber(store_id: string, item_id: string, destination_item_id: string) {
    await send_json_request(`stores/${store_id}/items/${item_id}/ordernumber`, "PUT", { destination_item_id });
}

async function postStoreItem(storeId: string, name: string) {
    await send_json_request(`stores/${storeId}/items`, "POST", { name });
}

function ItemAdd({ items, storeId }: { items?: Item[], storeId: string }) {
    const [itemName, setItemName] = useState('');

    return <>
        <Autocomplete
            freeSolo
            options={items?.map(x => x.name) ?? []}
            value={itemName}
            onChange={(_: any, newValue: string | null) => {
                setItemName(newValue ?? '');
            }}
            renderInput={(params) => <TextField {...params} />} />
        <Button variant="contained" onClick={async () => {
            await postStoreItem(storeId, itemName);
            setItemName('');
        }}>登録</Button>
    </>;
}

export default function Page({ params }: { params: { store_id: string } }) {
    const { data: store_items, error, isLoading, mutate } = useSWR<StoreItem[], Error>(`http://localhost:8080/stores/${params.store_id}/items`);
    const { data: items } = useSWR<Item[], Error>(`http://localhost:8080/items`);
    return (
        <main className={styles.main}>
            {error && <p>{error.message}</p>}
            {isLoading && <CircularProgress />}
            {store_items &&
                <>
                    <h1>買う</h1>
                    <ItemAdd items={items} storeId={params.store_id} />
                    <List className={styles.list}>
                        {StoreListItem(store_items.filter(x => !x.is_done), mutate)}
                    </List>
                    <h1>買った</h1>
                    <List className={styles.list}>
                        {StoreListItem(store_items.filter(x => x.is_done), mutate)}
                    </List>
                </>
            }
        </main>
    );
}