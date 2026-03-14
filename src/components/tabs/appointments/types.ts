// ─── types.ts ─────────────────────────────────────────────────────────────────

export interface DialogState {
  open:       boolean
  mode:       'add' | 'edit'
  id?:        number
  name:       string
  treatment:  string
  date:       string
  dateInput:  string
  time:       string
  timeInput:  string
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
