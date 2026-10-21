import FloorLevelDimension from './FloorLevelDimension';
export default function ModuleLevelDimensions({ activeLevels, yForLevel, thickness, x, floorY, scale, format, english }) {
  if (!activeLevels.length) return null;
  return <g pointerEvents="none">
    <FloorLevelDimension x={x} floorY={floorY} firstLevelY={yForLevel(activeLevels[0])} scale={scale} format={format} english={english} />
    {activeLevels.slice(0, -1).map((level, index) => {
      const top = yForLevel(activeLevels[index + 1]);
      const bottom = yForLevel(level) - thickness;
      if (bottom <= top) return null;
      return <g key={level}>
        <line x1={x} y1={top} x2={x} y2={bottom} stroke="#a6a6a6" strokeWidth="1.5" />
        <line x1={x - 4} y1={top} x2={x + 4} y2={top} stroke="#a6a6a6" strokeWidth="1.5" />
        <line x1={x - 4} y1={bottom} x2={x + 4} y2={bottom} stroke="#a6a6a6" strokeWidth="1.5" />
        <text x={x + 8} y={(top + bottom) / 2 + 4} fill="#666" fontSize="13" stroke="white" strokeWidth="3" paintOrder="stroke">{format((bottom - top) / scale)}</text>
      </g>;
    })}
  </g>;
}
