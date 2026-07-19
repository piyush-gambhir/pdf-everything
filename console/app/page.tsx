import { redirect } from 'next/navigation';

/** The console is the app; `/` is just an entry point into it. */
export default function RootPage() {
  redirect('/console');
}
