const initialState = {
  past: [], // previous states
  present: null, // current state
  future: [], // states after undo
}

export function historyReducer(state, action) {
  const { past, present, future } = state

  switch (action.type) {
    case "DO": {
      // A new action wipes the future (you branched off)
      return {
        past: [...past, present],
        present: action.newPresent,
        future: [],
      }
    }
    case "UNDO": {
      if (past.length === 0) return state // nothing to undo
      const previous = past[past.length - 1]
      return {
        past: past.slice(0, -1),
        present: previous,
        future: [present, ...future],
      }
    }
    case "REDO": {
      if (future.length === 0) return state // nothing to redo
      const next = future[0]
      return {
        past: [...past, present],
        present: next,
        future: future.slice(1),
      }
    }
    default:
      return state
  }
}
