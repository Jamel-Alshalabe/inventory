"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AlertTriangle, Lock } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface ConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: "default" | "destructive"
  onConfirm: (password?: string) => void
  isLoading?: boolean
  requirePassword?: boolean
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "تأكيد",
  cancelText = "إلغاء",
  variant = "destructive",
  onConfirm,
  isLoading = false,
  requirePassword = false,
}: ConfirmationDialogProps) {
  const [password, setPassword] = React.useState("")

  React.useEffect(() => {
    if (!open) setPassword("")
  }, [open])

  const handleConfirm = () => {
    if (requirePassword && !password) return
    onConfirm(password)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]" dir="rtl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {variant === "destructive" && (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
            )}
            <DialogTitle className="text-right">{title}</DialogTitle>
          </div>
          <DialogDescription className="text-right mt-2">
            {description}
          </DialogDescription>
        </DialogHeader>

        {requirePassword && (
          <div className="space-y-3 py-4">
            <div className="space-y-2">
              <Label htmlFor="password-confirm" className="text-right block">
                كلمة المرور للتأكيد
              </Label>
              <div className="relative">
                <Input
                  id="password-confirm"
                  type="password"
                  placeholder="أدخل كلمة مرور حسابك"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10 bg-[#0e0c20] text-white border-slate-700"
                />
                <Lock className="absolute right-3 top-2.5 h-4 w-4 text-slate-500" />
              </div>
              <p className="text-xs text-slate-400 text-right">
                يرجى إدخال كلمة المرور الخاصة بك للمتابعة.
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="flex-row-reverse gap-2 pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="border-slate-700 text-slate-300"
          >
            {cancelText}
          </Button>
          <Button
            variant={variant}
            onClick={handleConfirm}
            disabled={isLoading || (requirePassword && !password)}
          >
            {isLoading ? "جاري التنفيذ..." : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Hook for easier usage
export function useConfirmation() {
  const [state, setState] = React.useState<{
    open: boolean
    title: string
    description: string
    onConfirm: (password?: string) => void
    confirmText?: string
    cancelText?: string
    variant?: "default" | "destructive"
    requirePassword?: boolean
  }>({
    open: false,
    title: "",
    description: "",
    onConfirm: () => {},
  })

  const confirm = React.useCallback(
    (options: {
      title: string
      description: string
      onConfirm: (password?: string) => void
      confirmText?: string
      cancelText?: string
      variant?: "default" | "destructive"
      requirePassword?: boolean
    }) => {
      setState({
        open: true,
        ...options,
      })
    },
    []
  )

  const ConfirmationComponent = React.useCallback(
    ({ isLoading = false }: { isLoading?: boolean }) => (
      <ConfirmationDialog
        open={state.open}
        onOpenChange={(open) => setState((prev) => ({ ...prev, open }))}
        title={state.title}
        description={state.description}
        confirmText={state.confirmText}
        cancelText={state.cancelText}
        variant={state.variant}
        requirePassword={state.requirePassword}
        onConfirm={(password) => {
          state.onConfirm(password)
          setState((prev) => ({ ...prev, open: false }))
        }}
        isLoading={isLoading}
      />
    ),
    [state]
  )

  return {
    confirm,
    ConfirmationComponent,
  }
}
