import Button from "./Button"

export function ClearButton({ children, isActive, clearFunction }) {
  return (
    <Button
      size="xs"
      disabled={!isActive}
      variant={`secondary`}
      onClick={() => isActive && clearFunction([])}
      title="Clear all"
    >
      {children}
    </Button>
  )
}
