import { cookies } from 'next/headers'
import { AppShell } from '@/components/AppShell'
import type { TabId, WeekFilter } from '@/types'

export default async function Home() {
  const jar        = await cookies()
  const activeTab  = (jar.get('activeTab')?.value  ?? 'appointments') as TabId
  const weekFilter = (jar.get('weekFilter')?.value ?? 'All') as WeekFilter

  return <AppShell initialTab={activeTab} initialWeekFilter={weekFilter} />
}
