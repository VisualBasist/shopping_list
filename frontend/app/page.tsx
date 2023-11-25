'use client'
import styles from './page.module.css'
import Link from 'next/link';
import useSWR from 'swr';
import { CircularProgress, List, ListItem, ListItemText } from '@mui/material';

type Store = { id: string, name: string };

export default function Home() {
  const { data: stores, error, isLoading } = useSWR<Store[]>('stores');
  return (
    <main className={styles.main}>
      {error && <p>{error.message}</p>}
      {isLoading && <CircularProgress />}
      {stores &&
        <List>
          {stores.map(x => <ListItem key={x.id}><ListItemText primary={<Link href={`/stores/${x.id}/items`}>{x.name}</Link>} /></ListItem>)}
        </List>
      }
    </main>
  )
}
