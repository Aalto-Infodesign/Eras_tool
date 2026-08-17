import { fireEvent, render } from "@testing-library/react"
import { ProgressiveLegend } from "./ProgressiveLegend"

// useMartiniStory pulls in the whole context chain (d3 ESM); only STEP is needed.
const STEP = { STATES: 1, SEGMENT: 2, TRAJECTORY: 3, SILHOUETTE: 4, BOXPLOTS: 5, DONE: 6 }
jest.mock("./useMartiniStory", () => ({
  STEP: { STATES: 1, SEGMENT: 2, TRAJECTORY: 3, SILHOUETTE: 4, BOXPLOTS: 5, DONE: 6 },
}))

jest.mock("../../../contexts/ProcessedDataContext", () => ({
  useData: () => ({ statesOrder: ["a", "b", "c"] }),
}))
jest.mock("../../../contexts/DerivedDataContext", () => ({
  useDerivedData: () => ({ analytics: { ageRange: [8, 23] } }),
}))
jest.mock("../../../contexts/ClusteringContext", () => ({
  useClustering: () => ({
    resultsBySilhouette: new Map([["a-b", { id: "a-b", metrics: { size: 12 } }]]),
    progress: { done: 3, total: 3 },
  }),
}))
jest.mock("../main-charts/ChartsContext", () => ({
  useCharts: () => ({ chartHeight: 400 }),
}))
jest.mock("../../common/Button/Button", () => ({
  __esModule: true,
  default: ({ children, ...rest }) => <button {...rest}>{children}</button>,
}))

const exemplar = {
  links: [
    { source: { state: "a" }, target: { state: "b" }, speed: 4.2 },
    { source: { state: "b" }, target: { state: "c" }, speed: 7.1 },
  ],
}

// data-interactive is the CSS-facing state under test here, and the items carry
// no role of their own (they are clickable divs — see the a11y note in review).
// eslint-disable-next-line testing-library/no-node-access
const items = (c) => Array.from(c.querySelectorAll("[data-interactive]"))

test("items are clickable while the story is running", () => {
  const onSelectStep = jest.fn()
  const { container } = render(
    <ProgressiveLegend step={STEP.TRAJECTORY} exemplar={exemplar} onSelectStep={onSelectStep} />
  )

  const rows = items(container)
  expect(rows).toHaveLength(3)
  expect(rows.map((r) => r.getAttribute("data-interactive"))).toEqual(["true", "true", "true"])

  fireEvent.click(rows[0])
  expect(onSelectStep).toHaveBeenCalledWith(STEP.STATES)
})

test("items are inert once the story is complete", () => {
  const onSelectStep = jest.fn()
  const { container } = render(
    <ProgressiveLegend step={STEP.DONE} exemplar={exemplar} onSelectStep={onSelectStep} />
  )

  const rows = items(container)
  expect(rows).toHaveLength(5)
  // the finished legend is a static reference: no click affordance, no handler
  expect(rows.map((r) => r.getAttribute("data-interactive"))).toEqual(Array(5).fill("false"))
  expect(rows.every((r) => r.getAttribute("data-active") === "false")).toBe(true)

  rows.forEach((r) => fireEvent.click(r))
  expect(onSelectStep).not.toHaveBeenCalled()
})
