/* eslint-disable no-restricted-globals */

self.onmessage = ({ data: { silhouettes } }) => {
  const result = computePoset(silhouettes)
  self.postMessage(result)
}
