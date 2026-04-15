import { useState, useCallback } from "react"

type StatusType = "success" | "error"

interface StatusState {
  open: boolean
  type: StatusType
  title?: string
  message?: string
  onRetry?: () => void
}

const CLOSED: StatusState = { open: false, type: "success" }

export function useStatusModal() {
  const [status, setStatus] = useState<StatusState>(CLOSED)

  const showSuccess = useCallback((title?: string, message?: string) => {
    setStatus({ open: true, type: "success", title, message })
  }, [])

  const showError = useCallback((message?: string, onRetry?: () => void, title?: string) => {
    setStatus({ open: true, type: "error", title, message, onRetry })
  }, [])

  const close = useCallback(() => setStatus(s => ({ ...s, open: false })), [])

  return { status, showSuccess, showError, close }
}
