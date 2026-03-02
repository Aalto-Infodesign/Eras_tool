import styles from "./ShortcutSpan.module.css"

export const ShortcutSpan = ({ children, separator = null }) => {
  return (
    <>
      <span className={styles.shortcut}>{children}</span>
      {separator && <span className={styles.separator}>{separator}</span>}
    </>
  )
}
