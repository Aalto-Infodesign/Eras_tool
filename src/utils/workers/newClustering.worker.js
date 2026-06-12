function pointwiseMeanshift(data, bandwidth, kernelCenter, maxIteration = 100, epsilon = 1e-4) {
  //filter dataspace around bandwidth
  const squED = (a, b) => a.map((v, n) => Math.pow(v - b[n], 2)).reduce((acc, el) => acc + el)
  const getMedoid = (data, kernel) =>
    [...data].sort((a, b) => squED(a, kernel) - squED(b, kernel))[0]

  const isNN = (row) =>
    kernelCenter.every(
      (dimension, n) => dimension + bandwidth >= row[n] && dimension - bandwidth <= row[n],
    )
  const nn = data.filter((row) => isNN(row))

  //if < maxIteration
  //  compute the mean shift (ms)
  if (maxIteration !== 0) {
    maxIteration = maxIteration - 1
    const newKernelCenter = nn
      .reduce((acc, el) => acc.map((dim, n) => el[n] + dim)) //Sigma
      .map((e) => e / nn.length) //Ratio

    //if epsilon <= ms
    //  converge
    if (Math.sqrt(squED(kernelCenter, newKernelCenter)) <= epsilon) {
      //extract medoid nn
      const medoid = getMedoid(nn, kernelCenter)
      // return cluster centroid and medoid
      return { kernelCenter, medoid }
    }
    //else recusrion
    else {
      return pointwiseMeanshift(data, bandwidth, newKernelCenter, maxIteration, epsilon)
    }
  } else {
    const medoid = getMedoid(nn, kernelCenter)
    // return cluster centroid and medoid
    return { kernelCenter, medoid }
  }
}
