import { act, renderHook } from "@testing-library/react"
import { useMartiniStory, STEP } from "./useMartiniStory"

const mockSetIsMartiniDone = jest.fn()
let mockClustering
let mockInitialDone = false

jest.mock("../../../contexts/ClusteringContext", () => ({
  useClustering: () => mockClustering,
}))
jest.mock("../../../contexts/DerivedDataContext", () => ({
  useDerivedData: () => ({
    selectedLinks: [
      { id: "m1", source: { x: 1, state: "a" }, target: { state: "b" }, speed: 2 },
      { id: "m1", source: { x: 2, state: "b" }, target: { state: "c" }, speed: 3 },
    ],
  }),
}))
jest.mock("../../../contexts/FiltersContext", () => ({
  useFilters: () => ({ setSelectedSilhouettesNames: jest.fn() }),
}))
// Mirrors ChartsProvider: isMartiniDone is real state, so flipping it re-renders
// and feeds back into storyActive the way it does in the app.
jest.mock("../main-charts/ChartsContext", () => {
  const { useCallback, useState } = require("react")
  return {
    useCharts: () => {
      const [isMartiniDone, setDone] = useState(mockInitialDone)
      const setIsMartiniDone = useCallback((v) => {
        mockSetIsMartiniDone(v)
        setDone(v)
      }, [])
      return { isMartiniDone, setIsMartiniDone }
    },
  }
})

const noResults = { resultsBySilhouette: new Map(), revealedSilhouettes: new Set() }
const withResults = {
  resultsBySilhouette: new Map([["a-b", { id: "a-b", medianMedoidID: "m1" }]]),
  revealedSilhouettes: new Set(["a-b"]),
}

beforeEach(() => {
  jest.useFakeTimers()
  mockSetIsMartiniDone.mockClear()
  mockInitialDone = false
  mockClustering = noResults
})
afterEach(() => jest.useRealTimers())

test("does not end the story just because clustering hasn't produced results yet", () => {
  const { result } = renderHook(() => useMartiniStory())

  // THE REGRESSION: canAdvance is false here (no exemplar), which used to
  // immediately flag the story as done and ungate every chart layer.
  expect(result.current.canAdvance).toBe(false)
  expect(mockSetIsMartiniDone).not.toHaveBeenCalled()
  expect(result.current.storyActive).toBe(true)
  expect(result.current.step).toBe(STEP.STATES)

  // layers past the current step stay gated
  expect(result.current.show(STEP.STATES)).toBe(true)
  expect(result.current.show(STEP.SEGMENT)).toBe(false)
  expect(result.current.show(STEP.BOXPLOTS)).toBe(false)

  // and it does not auto-advance while the data isn't ready
  act(() => jest.advanceTimersByTime(20000))
  expect(result.current.step).toBe(STEP.STATES)
})

test("auto-advances once the data arrives, gating layers as it goes", () => {
  const { result, rerender } = renderHook(() => useMartiniStory())

  mockClustering = withResults
  rerender()
  expect(result.current.canAdvance).toBe(true)
  expect(result.current.exemplar?.silhouette).toBe("a-b")

  act(() => jest.advanceTimersByTime(5000))
  expect(result.current.step).toBe(STEP.SEGMENT)
  expect(result.current.show(STEP.SEGMENT)).toBe(true)
  expect(result.current.show(STEP.TRAJECTORY)).toBe(false)

  act(() => jest.advanceTimersByTime(5000))
  expect(result.current.step).toBe(STEP.TRAJECTORY)
  expect(mockSetIsMartiniDone).not.toHaveBeenCalled()
})

test("clicking a previous legend item re-gates the chart", () => {
  const { result, rerender } = renderHook(() => useMartiniStory())
  mockClustering = withResults
  rerender()

  act(() => result.current.goToStep(STEP.SILHOUETTE))
  expect(result.current.step).toBe(STEP.SILHOUETTE)
  expect(result.current.show(STEP.SILHOUETTE)).toBe(true)
  expect(result.current.show(STEP.BOXPLOTS)).toBe(false)

  // stepping back hides the later layers again
  act(() => result.current.goToStep(STEP.SEGMENT))
  expect(result.current.step).toBe(STEP.SEGMENT)
  expect(result.current.show(STEP.SILHOUETTE)).toBe(false)
  expect(result.current.show(STEP.SEGMENT)).toBe(true)

  // manual control pins it — no auto-advance from under the user
  act(() => jest.advanceTimersByTime(20000))
  expect(result.current.step).toBe(STEP.SEGMENT)

  // ...and Next still works by hand
  act(() => result.current.next())
  expect(result.current.step).toBe(STEP.TRAJECTORY)
})

test("marks the story done only when it reaches the end", () => {
  const { result } = renderHook(() => useMartiniStory())
  expect(mockSetIsMartiniDone).not.toHaveBeenCalled()

  act(() => result.current.goToStep(STEP.BOXPLOTS))
  expect(mockSetIsMartiniDone).not.toHaveBeenCalled()

  act(() => result.current.next())
  expect(result.current.step).toBe(STEP.DONE)
  expect(mockSetIsMartiniDone).toHaveBeenCalledWith(true)
})

test("Skip ends the story and ungates everything", () => {
  const { result } = renderHook(() => useMartiniStory())
  act(() => result.current.skip())

  expect(result.current.step).toBe(STEP.DONE)
  expect(mockSetIsMartiniDone).toHaveBeenCalledWith(true)
  expect(result.current.show(STEP.BOXPLOTS)).toBe(true)
})

test("stepping back after the story is over is a no-op", () => {
  const { result } = renderHook(() => useMartiniStory())
  act(() => result.current.skip())
  expect(result.current.step).toBe(STEP.DONE)

  // Rewinding here would strip legend items while show() left the chart whole,
  // so goToStep must refuse rather than desync the two.
  act(() => result.current.goToStep(STEP.SEGMENT))
  expect(result.current.step).toBe(STEP.DONE)
  expect(result.current.show(STEP.BOXPLOTS)).toBe(true)
})

test("story stays inert for a user who already finished it", () => {
  mockInitialDone = true
  const { result } = renderHook(() => useMartiniStory())

  expect(result.current.storyActive).toBe(false)
  expect(result.current.step).toBe(STEP.DONE)
  expect(result.current.show(STEP.BOXPLOTS)).toBe(true)
})
