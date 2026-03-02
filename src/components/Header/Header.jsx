import { FilterPanel } from "../dashboard/filter-panel/FilterPanel"
import styles from "./Header.module.css"
export const Header = () => {
  return (
    <header className={styles.header}>
      <h1 className={styles.title}>ERAS</h1>
      <FilterPanel />
    </header>
  )
}
