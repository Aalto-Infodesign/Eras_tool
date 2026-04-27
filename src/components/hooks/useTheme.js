// useTheme.js
import { useState, useEffect } from "react"

export function useTheme() {
  const [theme, setTheme] = useState("dark")
  // const [theme, setTheme] = useState(
  //   () =>
  //     localStorage.getItem("theme") ??
  //     (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"),
  // )

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme)
    localStorage.setItem("theme", theme)
  }, [theme])

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"))

  return { theme, toggle }
}
