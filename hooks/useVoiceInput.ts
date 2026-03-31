'use client'

import { useRef, useState } from 'react'

export type ParsedVoiceInput = {
  title: string | null
  description: string | null
  dayIndex: number | null
  startTime: string | null
  endTime: string | null
  isRecurring: boolean | null
  color: string | null
  tutorial: {
    dayIndex: number | null
    startTime: string | null
    endTime: string | null
    isRecurring: boolean | null
  } | null
}

export function useVoiceInput(onParsed: (data: ParsedVoiceInput) => void) {
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const startRecording = async () => {
    setError(null)
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setError('לא ניתן לגשת למיקרופון')
      return
    }

    const recorder = new MediaRecorder(stream)
    chunksRef.current = []

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    recorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop())
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      setIsProcessing(true)
      try {
        const fd = new FormData()
        fd.append('audio', blob, 'recording.webm')
        const res = await fetch('/api/voice-parse', { method: 'POST', body: fd })
        const json = await res.json()
        if (!res.ok || json.error) throw new Error(json.error ?? 'שגיאה בעיבוד הקול')
        const { parsed } = json
        onParsed(parsed as ParsedVoiceInput)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'שגיאה')
      } finally {
        setIsProcessing(false)
      }
    }

    recorder.start()
    recorderRef.current = recorder
    setIsRecording(true)
  }

  const stopRecording = () => {
    recorderRef.current?.stop()
    recorderRef.current = null
    setIsRecording(false)
  }

  return { isRecording, isProcessing, error, startRecording, stopRecording }
}
