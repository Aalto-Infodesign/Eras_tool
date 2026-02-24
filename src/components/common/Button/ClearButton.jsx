export function ClearButton({ children, isActive, clearFunction }) {
  return (
    <button
      className={`${isActive ? "active" : "inactive"} secondary`}
      onClick={() => isActive && clearFunction([])}
      title="Clear all"
    >
      {children}
    </button>
  )
}
