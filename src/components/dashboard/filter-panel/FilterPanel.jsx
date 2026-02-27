import { useMemo } from "react"
import { useFilters } from "../../../contexts/FiltersContext"
import styles from "./FilterPanel.module.css"
import { X } from "lucide-react"

export function FilterPanel() {
  const activeFilters = useActiveFilters()

  if (activeFilters.length === 0) return null
  {
    /* <Chip key={filter.id} label={filter.label} onRemove={filter.onRemove} /> */
  }
  return (
    <section className={styles.filterPanel}>
      {activeFilters.map((filter) => (
        <p>
          <span>{filter.label}</span>
          <button onClick={filter.onRemove}>
            <X />
          </button>
        </p>
      ))}
    </section>
  )
}

// useActiveFilters.js
export const useActiveFilters = () => {
  const { filters, resetFilter } = useFilters()

  const activeFilters = useMemo(() => {
    const chips = []

    // // Value filter
    // if (filters.date) {
    //   chips.push({
    //     id: "Date",
    //     label: `Search: ${filters.search}`,
    //     onRemove: () => setFilters((prev) => ({ ...prev, search: "" })),
    //   })
    // }

    // Range filter
    if (filters.date.isActive) {
      chips.push({
        id: "date",
        label: `Date: ${filters.date.selection[0].toFixed(0)}–${filters.date.selection[1].toFixed(0)}`,
        onRemove: () => resetFilter("date"),
      })
    }
    // Range filter
    if (filters.diseaseDuration.isActive) {
      chips.push({
        id: "diseaseDuration",
        label: `diseaseDuration: ${filters.diseaseDuration.selection[0].toFixed(0)}–${filters.diseaseDuration.selection[1].toFixed(0)}`,
        onRemove: () => resetFilter("diseaseDuration"),
      })
    }

    // // Multi-select
    // filters.categories?.forEach((cat) => {
    //   chips.push({
    //     id: `category-${cat}`,
    //     label: cat,
    //     onRemove: () =>
    //       setFilters((prev) => ({
    //         ...prev,
    //         categories: prev.categories.filter((c) => c !== cat),
    //       })),
    //   })
    // })

    return chips
  }, [filters])

  return activeFilters
}
