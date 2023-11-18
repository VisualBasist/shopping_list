'use client'
import useSWR, { KeyedMutator } from 'swr';
import { Autocomplete, Button, Checkbox, CircularProgress, IconButton, List, ListItem, ListItemIcon, ListItemText, TextField } from '@mui/material';
import { DeleteForever } from '@mui/icons-material';
import { useState } from 'react';
import styles from './page.module.css'

type StoreItem = { itemId: string, name: string, storeId: string, isDone: boolean, price?: number };
type Item = { id: string, name: string };

function StoreListItem(items: StoreItem[], mutate: KeyedMutator<StoreItem[]>) {
    return items.map(x =>
        <ListItem key={x.itemId} secondaryAction={
            <IconButton aria-label="削除">
                <DeleteForever />
            </IconButton>
        }
            onDragOver={e => e.preventDefault()}
            onDrop={async e => {
                const sourceItemId = e.dataTransfer.getData("text/plain");
                await putStoreItemOrdernumber(x.storeId, sourceItemId, x.itemId);
                mutate();
            }}
        >
            <ListItemIcon onClick={async () => {
                // TODO: コンポーネントの外に
                await putStoreItemState(x.storeId, x.itemId, !x.isDone);
                mutate();
            }}>
                <Checkbox edge="start" checked={x.isDone} disableRipple />
            </ListItemIcon>
            <ListItemText primary={x.name} secondary={x.price && <div><span>単価</span><span>{x.price}</span></div>} draggable onDragStart={
                e => {
                    e.dataTransfer.setData("text/plain", x.itemId);
                    e.dataTransfer.dropEffect = "move";
                }
            } />
        </ListItem >);
}

async function sendJsonRequest(path: string, method: 'POST' | 'PUT', body: any) {
    await fetch('http://localhost:8080/' + path,
        {
            method, body: JSON.stringify(body),
            headers: { "Content-Type": "application/json" }
        });
}

async function putStoreItemState(storeId: string, itemId: string, isDone: boolean) {
    await sendJsonRequest(`stores/${storeId}/items/${itemId}/state`, "PUT", { isDone });
}

async function putStoreItemOrdernumber(storeId: string, itemId: string, destinationItemId: string) {
    await sendJsonRequest(`stores/${storeId}/items/${itemId}/ordernumber`, "PUT", { destinationItemId });
}

async function postStoreItem(storeId: string, name: string) {
    await sendJsonRequest(`stores/${storeId}/items`, "POST", { name });
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

export default function Page({ params }: { params: { storeId: string } }) {
    const { data: storeItems, error, isLoading, mutate } = useSWR<StoreItem[], Error>(`http://localhost:8080/stores/${params.storeId}/items`);
    const { data: items } = useSWR<Item[], Error>(`http://localhost:8080/items`);
    return (
        <main className={styles.main}>
            {error && <p>{error.message}</p>}
            {isLoading && <CircularProgress />}
            {storeItems &&
                <>
                    <h1>買う</h1>
                    <ItemAdd items={items} storeId={params.storeId} />
                    <List className={styles.list}>
                        {StoreListItem(storeItems.filter(x => !x.isDone), mutate)}
                    </List>
                    <h1>買った</h1>
                    <List className={styles.list}>
                        {StoreListItem(storeItems.filter(x => x.isDone), mutate)}
                    </List>
                </>
            }
        </main>
    );
}