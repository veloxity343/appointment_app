export interface Appointment {
  id: number
  client_name: string
  treatment: string | null
  companions: string | null
  appt_date: string
  appt_time: string
  confirmed: number
  created_at: string
}

export type WeekFilter = 'All' | 'This Week' | 'Next Week' | 'Past'
export type RunDay     = 'Monday' | 'Thursday'
export type TabId      = 'appointments' | 'reminders' | 'data'

export const EXECUTION_MAP: Record<RunDay, string[]> = {
  Monday:   ['Wednesday', 'Thursday', 'Friday'],
  Thursday: ['Saturday',  'Monday',   'Tuesday'],
}
