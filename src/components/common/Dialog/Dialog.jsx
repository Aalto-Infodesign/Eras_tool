import { forwardRef } from "react"

export const Dialog = forwardRef(({ children, toggleDialog }, ref) => {
  return (
    <dialog
      id="my-dialog"
      ref={dialogRef}
      onClick={(e) => e.currentTarget === e.target && toggleDialog()}
      popover
    >
      <div>{children}</div>
      <Button onClick={toggleDialog}>Close</Button>
    </dialog>
  )
})

// Function for reference

function toggleDialog() {
  const ref = dialogRef.current

  if (!ref) return

  ref.hasAttribute("open") ? ref.close() : ref.showModal()
}
