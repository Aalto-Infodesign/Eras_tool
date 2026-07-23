import { forwardRef } from "react"
import Button from "../Button/Button"
import styles from "./Dialog.module.css"

// Imperatively controlled: the parent holds the ref and calls
// ref.current.showModal() to open it. `onClose` fires both on our own
// close button/backdrop-click AND on the browser's native close paths
// (Escape key), so the parent's own "is it open" state can't drift out of
// sync with the actual <dialog>.
export const Dialog = forwardRef(({ children, onClose, title = "title", width }, ref) => {
  const close = () => ref?.current?.close()

  return (
    <dialog
      id="my-dialog"
      className={styles.dialog}
      ref={ref}
      style={width ? { "--dialog-width": width } : undefined}
      onClick={(e) => e.currentTarget === e.target && close()}
      onClose={onClose}
    >
      <div className={styles.dialogHeader}>
        <h4 className={styles.headerTitle}>{title}</h4>
        <Button size="xs" onClick={close}>
          Close
        </Button>
      </div>
      <div>{children}</div>
    </dialog>
  )
})
