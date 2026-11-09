import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

type DeleteTaskButtonProps = {
  title: string
  kind?: 'Aufgabe' | 'Subaufgabe'
  /** Wenn gesetzt, wird statt der Bestätigung diese Fehlermeldung angezeigt (KR-1). */
  blockedReason?: string | undefined
  onConfirm: () => void
}

export function DeleteTaskButton({ title, kind = 'Aufgabe', blockedReason, onConfirm }: DeleteTaskButtonProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-destructive"
            aria-label={`${kind} „${title}“ löschen`}
          />
        }
      >
        <Trash2 aria-hidden="true" />
      </AlertDialogTrigger>
      <AlertDialogContent>
        {blockedReason ? (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Löschen nicht möglich</AlertDialogTitle>
              <AlertDialogDescription>{blockedReason}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Verstanden</AlertDialogCancel>
            </AlertDialogFooter>
          </>
        ) : (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>{kind} löschen?</AlertDialogTitle>
              <AlertDialogDescription>
                {`„${title}“ wird dauerhaft entfernt${kind === 'Aufgabe' ? ', inklusive aller Subaufgaben' : ''}. Dieser Schritt kann nicht rückgängig gemacht werden.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={onConfirm}>
                Löschen
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  )
}
