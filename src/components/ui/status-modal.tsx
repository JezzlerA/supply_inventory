import { useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle2, XCircle, X } from "lucide-react"
import { Button } from "@/components/ui/button"

export interface StatusModalProps {
  isOpen: boolean
  type: "success" | "error"
  title?: string
  message?: string
  onClose: () => void
  onRetry?: () => void
  autoCloseDuration?: number // ms, defaults to 2500 for success; set 0 to disable
}

const DEFAULTS = {
  success: {
    title: "Update Successful",
    message: "The item has been successfully updated.",
  },
  error: {
    title: "Update Failed",
    message: "Something went wrong. Please try again.",
  },
}

export function StatusModal({
  isOpen,
  type,
  title,
  message,
  onClose,
  onRetry,
  autoCloseDuration,
}: StatusModalProps) {
  const okButtonRef = useRef<HTMLButtonElement>(null)

  const resolvedTitle = title ?? DEFAULTS[type].title
  const resolvedMessage = message ?? DEFAULTS[type].message

  // Auto close for success
  useEffect(() => {
    if (!isOpen || type !== "success") return
    const duration = autoCloseDuration !== undefined ? autoCloseDuration : 2500
    if (duration === 0) return
    const timer = setTimeout(onClose, duration)
    return () => clearTimeout(timer)
  }, [isOpen, type, autoCloseDuration, onClose])

  // Focus OK button when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => okButtonRef.current?.focus(), 50)
    }
  }, [isOpen])

  // ESC key
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [isOpen, onClose])

  const isSuccess = type === "success"

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Modal */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="status-modal-title"
            aria-describedby="status-modal-desc"
            className="fixed inset-0 z-[9999] flex items-center justify-center px-4 pointer-events-none"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
          >
            <div
              className="pointer-events-auto relative w-full max-w-sm rounded-2xl bg-background shadow-2xl border border-border overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 rounded-full p-1.5 text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Top color stripe + icon */}
              <div
                className={`flex flex-col items-center pt-8 pb-4 px-6 ${
                  isSuccess
                    ? "bg-gradient-to-b from-emerald-50/60 to-transparent dark:from-emerald-950/30"
                    : "bg-gradient-to-b from-red-50/60 to-transparent dark:from-red-950/30"
                }`}
              >
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.08 }}
                  className={`rounded-full p-3 mb-3 ${
                    isSuccess
                      ? "bg-emerald-100 dark:bg-emerald-900/50"
                      : "bg-red-100 dark:bg-red-900/50"
                  }`}
                >
                  {isSuccess ? (
                    <CheckCircle2 className="w-10 h-10 text-emerald-500 dark:text-emerald-400" />
                  ) : (
                    <XCircle className="w-10 h-10 text-red-500 dark:text-red-400" />
                  )}
                </motion.div>
              </div>

              {/* Body */}
              <div className="px-6 pb-6 text-center">
                <h2
                  id="status-modal-title"
                  className={`text-lg font-semibold mb-1.5 ${
                    isSuccess
                      ? "text-emerald-700 dark:text-emerald-300"
                      : "text-red-700 dark:text-red-300"
                  }`}
                >
                  {resolvedTitle}
                </h2>
                <p id="status-modal-desc" className="text-sm text-muted-foreground mb-5">
                  {resolvedMessage}
                </p>

                {/* Success auto-close bar */}
                {isSuccess && (autoCloseDuration === undefined || autoCloseDuration > 0) && (
                  <motion.div
                    className="absolute bottom-0 left-0 h-0.5 bg-emerald-400/60 rounded-full"
                    initial={{ width: "100%" }}
                    animate={{ width: "0%" }}
                    transition={{ duration: (autoCloseDuration ?? 2500) / 1000, ease: "linear" }}
                  />
                )}

                {/* Buttons */}
                <div className="flex gap-2 justify-center">
                  {isSuccess ? (
                    <Button
                      ref={okButtonRef}
                      onClick={onClose}
                      className="px-8 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white"
                    >
                      OK
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        onClick={onClose}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      {onRetry && (
                        <Button
                          ref={okButtonRef}
                          onClick={onRetry}
                          className="flex-1 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-white"
                        >
                          Try Again
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
