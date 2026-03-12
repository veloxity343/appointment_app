// ─── types.ts ─────────────────────────────────────────────────────────────────

export interface DialogState {
  open:       boolean
  mode:       'add' | 'edit'
  id?:        number
  name:       string
  treatment:  string
  date:       string      // ISO yyyy-mm-dd
  dateInput:  string      // display string shown in text input
  time:       string      // HH:MM 24-hr
  timeInput:  string      // display string shown in text input
  companions: string
  error:      string
}

export const EMPTY_DIALOG: DialogState = {
  open: false, mode: 'add',
  name: '', treatment: '',
  date: '', dateInput: '',
  time: '', timeInput: '',
  companions: '', error: '',
}
