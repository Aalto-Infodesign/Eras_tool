import { createContext, useContext, useState } from "react"

const DnDContext = createContext([null, (_) => {}])

export const DnDProvider = ({ children }) => {
  const [type, setType] = useState(null)
  const [label, setLabel] = useState(null)
  const [color, setColor] = useState(null)

  const value = { type, setType, label, setLabel, color, setColor }

  return <DnDContext.Provider value={value}>{children}</DnDContext.Provider>
}

export default DnDContext

export const useDnD = () => {
  return useContext(DnDContext)
}
