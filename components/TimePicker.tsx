import React from 'react'

interface TimePickerProps {
  value?: string
  onChange: (value: string) => void
}

export const TimePicker: React.FC<TimePickerProps> = ({ value, onChange }) => {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as any)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const hours = Array.from({ length: 24 }, (_, i) => i)
  const minutes = [0, 15, 30, 45]

  const display = value && value.length > 0 ? value : '--:--'

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(v => !v)} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white text-left">
        {display}
      </button>
      {open && (
        <div className="absolute z-30 mt-2 w-full bg-[#18181b] border border-zinc-800 rounded-xl shadow-xl p-3 grid grid-cols-2 gap-3">
          <div className="max-h-40 overflow-auto">
            {hours.map(h => (
              <button key={h} type="button" onClick={() => {
                const hh = String(h).padStart(2, '0')
                const mm = value?.split(':')[1] ?? '00'
                onChange(`${hh}:${mm}`)
              }} className="block w-full text-left px-2 py-1 rounded hover:bg-zinc-800 text-sm text-white">
                {String(h).padStart(2, '0')}
              </button>
            ))}
          </div>
          <div className="max-h-40 overflow-auto">
            {minutes.map(m => (
              <button key={m} type="button" onClick={() => {
                const hh = value?.split(':')[0] ?? '00'
                const mm = String(m).padStart(2, '0')
                onChange(`${hh}:${mm}`)
              }} className="block w-full text-left px-2 py-1 rounded hover:bg-zinc-800 text-sm text-white">
                {String(m).padStart(2, '0')}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}