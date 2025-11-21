import React from 'react'

interface AIResponseProps {
  text: string
  streaming: boolean
  onCancel?: () => void
}

export const AIResponse: React.FC<AIResponseProps> = ({ text, streaming, onCancel }) => {
  const loadingText = '...'
  return (
    <div className="rounded-2xl bg-secondary/30 border border-white/5 p-4 mt-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-400">AI Response</h3>
        {streaming && (
          <button onClick={onCancel} className="text-xs px-2 py-1 rounded-md bg-zinc-800 text-white hover:bg-zinc-700">Cancel</button>
        )}
      </div>
      <div className="mt-2 text-sm text-white min-h-12 whitespace-pre-wrap">{text || (streaming ? loadingText : '')}</div>
    </div>
  )
}