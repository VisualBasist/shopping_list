'use client'
import styles from './page.module.css'
import Link from 'next/link';
import useSWR from 'swr';
import { CircularProgress } from '@mui/material';

type Store = { id: string, name: string };

export default function Home() {
  const { data: stores, error, isLoading } = useSWR<Store[]>('stores');
  return (
    <main className={styles.main}>
      {error && <p>{error.message}</p>}
      {isLoading && <CircularProgress />}
      {stores &&
        <ul>
          {stores.map(x => <li key={x.id}><Link href={`/stores/${x.id}/items`}>{x.name}</Link></li>)}
        </ul>
      }
    </main>
  )
}
