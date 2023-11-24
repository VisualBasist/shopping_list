'use client'
import useSWR, { KeyedMutator } from 'swr';
import { Autocomplete, Button, Checkbox, CircularProgress, IconButton, List, ListItem, ListItemIcon, ListItemText, TextField } from '@mui/material';
import { DeleteForever } from '@mui/icons-material';
import { Dispatch, useState } from 'react';
import styles from './page.module.css'

type Store = { name: string };
type StoreItem = { itemId: string, name: string, storeId: string, isDone: boolean, price?: number };
type Item = { id: string, name: string };

function StoreListItem(items: StoreItem[], mutate: KeyedMutator<StoreItem[]>) {
    return items.map(x =>
        <ListItem
            key={x.itemId}
            data-item-id={x.itemId}
            secondaryAction={
                <IconButton aria-label="削除" onClick={async () => {
                    await fetch('http://localhost:8080/' + `stores/${x.storeId}/items/${x.itemId}`, { method: "DELETE" });
                    mutate();
                }}>
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
            <ListItemText primary={x.name} secondary={x.price && <><span>単価</span><span>{x.price}</span></>} draggable onDragStart={e => {
                e.dataTransfer.setData("text/plain", x.itemId);
                e.dataTransfer.dropEffect = "move";
            }
            }
                sx={{ touchAction: 'none' }}
                onTouchEnd={async e => {
                    const changedTouche = e.changedTouches[0];
                    const destinationElement = (document.elementsFromPoint(changedTouche.clientX, changedTouche.clientY) as HTMLElement[]).find(x => x.dataset.itemId);
                    if (destinationElement != null) {
                        await putStoreItemOrdernumber(x.storeId, x.itemId, destinationElement.dataset.itemId!);
                        mutate();
                    }
                }}
            />
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

function ItemAdd({ items, storeId, mutate }: { items?: Item[], storeId: string, mutate: KeyedMutator<any> }) {
    const [itemName, setItemName] = useState('');

    return <>
        <Autocomplete
            freeSolo
            options={items?.map(x => x.name) ?? []}
            inputValue={itemName}
            onInputChange={(_: any, newValue: string) => {
                setItemName(newValue);
            }}
            renderInput={(params) => <TextField {...params} />} />
        <Button variant="contained" onClick={async () => {
            await postStoreItem(storeId, itemName);
            mutate();
            setItemName('');
        }}>登録</Button>
    </>;
}

export default function Page({ params }: { params: { storeId: string } }) {
    const { data: store } = useSWR<Store, Error>(`http://localhost:8080/stores/${params.storeId}`);
    const { data: storeItems, error, isLoading, mutate } = useSWR<StoreItem[], Error>(`http://localhost:8080/stores/${params.storeId}/items`);
    const { data: items } = useSWR<Item[], Error>(`http://localhost:8080/items`);
    return (
        <main className={styles.main}>
            <p>{store?.name}</p>
            {error && <p>{error.message}</p>}
            {isLoading && <CircularProgress />}
            {storeItems &&
                <>
                    <h1>買う</h1>
                    <ItemAdd items={items} storeId={params.storeId} mutate={mutate} />
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