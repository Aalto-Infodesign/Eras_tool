import React, { useEffect, useState } from "react";
import { UMAP } from "umap-js";

const UmapGrid = () => {
  const [embedding, setEmbedding] = useState([]);

  // Generate a dummy dataset
  const generateDummyData = (numPoints, dimensions) => {
    return Array.from({ length: numPoints }, () =>
      Array.from({ length: dimensions }, () => Math.random() * 10)
    );
  };

  useEffect(() => {
    const data = generateDummyData(25, 5); // 25 points, each with 5 dimensions
    const dataSize = data.length;

    // Dynamically adjust UMAP parameters based on data size
    const nNeighbors = Math.min(Math.max(2, Math.floor(Math.sqrt(dataSize))), dataSize - 1);
    const minDist = dataSize > 50 ? 0.5 : 0.1; // Smaller for small datasets
    const spread = dataSize > 50 ? 1.0 : 1.5; // Higher spread for small datasets

    // Set up the UMAP reducer with the adjusted parameters
    const reducer = new UMAP({
      nNeighbors,
      minDist,
      spread,
      nComponents: 2
    });

    // Fit and transform the data
    reducer.fit(data);
    setEmbedding(reducer.getEmbedding());
  }, []);

  return (
    <div style={gridStyles}>
      {embedding.map((point, i) => (
        <svg key={i} width="50" height="50">
          <circle cx={point[0] * 10 + 25} cy={point[1] * 10 + 25} r="4" fill="steelblue" />
        </svg>
      ))}
    </div>
  );
};

// Define styles for the grid layout
const gridStyles = {
  display: "grid",
  gridTemplateColumns: "repeat(5, 50px)", // 5x5 grid
  gap: "4px",
  justifyContent: "center",
  marginTop: "20px"
};

export default UmapGrid;
