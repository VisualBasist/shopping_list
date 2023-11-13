'use client'
import useSWR from 'swr';
import { Checkbox, CircularProgress, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import styles from './page.module.css'

type StoreItem = { id: string, name: string, is_done: boolean, price?: number };

function StoreListItem(items: StoreItem[]) {
    return items.map(x =>
        <ListItem key={x.id}>
            <ListItemIcon onClick={() => console.log(x)}>
                <Checkbox edge="start" checked={x.is_done} disableRipple />
            </ListItemIcon>
            <ListItemText primary={x.name} secondary={x.price && <div><span>単価</span><span>{x.price}</span></div>} />
        </ListItem>);
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
                    <List>
                        {StoreListItem(store_items.filter(x => !x.is_done))}
                    </List>
                    <h1>買った</h1>
                    <List>
                        {StoreListItem(store_items.filter(x => x.is_done))}
                    </List>
                </>
            }
        </main>
    );
}