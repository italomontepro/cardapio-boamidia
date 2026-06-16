'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

interface CreatedSuccessDialogProps {
  slug: string
  tempPassword: string
  adminEmail: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreatedSuccessDialog({
  slug,
  tempPassword,
  adminEmail,
  open,
  onOpenChange,
}: CreatedSuccessDialogProps) {
  const router = useRouter()
  const [copied, setCopied] = useState(false)

  async function handleCopyPassword() {
    await navigator.clipboard.writeText(tempPassword)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleClose() {
    onOpenChange(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={(details) => {
      if (!details) handleClose()
    }}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Restaurante criado com sucesso</DialogTitle>
          <DialogDescription>
            Compartilhe o link e a senha temporária abaixo com o administrador do restaurante. A senha não será exibida novamente.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Link do cardápio: /r/{slug}</Label>
            <Input readOnly value={`/r/${slug}`} className="font-mono text-sm" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Senha temporária (copie agora — não será mostrada novamente)</Label>
            <div className="flex gap-2">
              <Input
                readOnly
                type="text"
                value={tempPassword}
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyPassword}
                className="shrink-0"
              >
                {copied ? 'Copiado!' : 'Copiar'}
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-muted-foreground">E-mail do administrador</Label>
            <p className="text-sm text-muted-foreground">{adminEmail}</p>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
