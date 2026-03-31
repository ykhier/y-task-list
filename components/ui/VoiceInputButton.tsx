'use client'

import { Mic, MicOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useVoiceInput, type ParsedVoiceInput } from '@/hooks/useVoiceInput'

interface VoiceInputButtonProps {
  onParsed: (data: ParsedVoiceInput) => void
  className?: string
}

export function VoiceInputButton({ onParsed, className }: VoiceInputButtonProps) {
  const { isRecording, isProcessing, error, startRecording, stopRecording } = useVoiceInput(onParsed)

  return (
    <div className={className}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={isRecording ? stopRecording : startRecording}
        disabled={isProcessing}
        title={isRecording ? 'עצור הקלטה' : 'קלט קולי'}
        className={isRecording ? 'border-red-400 text-red-500 animate-pulse bg-red-50' : ''}
      >
        {isProcessing
          ? <Loader2 className="h-4 w-4 animate-spin" />
          : isRecording
            ? <MicOff className="h-4 w-4" />
            : <Mic className="h-4 w-4" />}
      </Button>
      {error && (
        <p className="text-xs text-red-500 mt-1 max-w-[200px]">{error}</p>
      )}
    </div>
  )
}
