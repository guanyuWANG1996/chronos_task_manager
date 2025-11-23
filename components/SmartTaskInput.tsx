import React from 'react'
import { cn } from '../lib/utils'
import { Plus, Loader2 } from 'lucide-react'

interface SmartTaskInputProps {
  onSubmit: (text: string) => void
  loading?: boolean
}

export const SmartTaskInput: React.FC<SmartTaskInputProps> = ({ onSubmit, loading }) => {
  const [value, setValue] = React.useState('')
  const submit = () => {
    const v = value.trim()
    if (!v || loading) return
    onSubmit(v)
    setValue('')
  }
  return (
    <div className="w-full max-w-2xl mx-auto mb-6">
      <div className={cn('rounded-xl border border-white/10 bg-secondary/30 px-3 py-3 text-sm text-white flex items-center gap-2')}> 
        <Plus className="w-4 h-4 text-zinc-400" />
        <input 
          value={value}
          onChange={(e)=>setValue(e.target.value)}
          onKeyDown={(e)=>{ if(e.key==='Enter') submit() }}
          placeholder="Ask AI: e.g. 下周三健身，先热身，再进行主训练最后拉伸放松"
          className="flex-1 bg-transparent outline-none placeholder:text-zinc-500"
        />
        {loading && (
          <Loader2 className="w-4 h-4 text-zinc-400 animate-spin" />
        )}
      </div>
    </div>
  )
}