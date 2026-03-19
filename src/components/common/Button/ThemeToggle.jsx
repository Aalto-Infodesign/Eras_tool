// ThemeToggle.jsx
import { useTheme } from "../../hooks/useTheme"
import Button from "./Button"

export function ThemeToggle() {
  const { theme, toggle } = useTheme()

  return <Button onClick={toggle}>{theme === "dark" ? "☀️ Light" : "🌙 Dark"}</Button>
}
