export default function FloorLevelDimension({ x, floorY, firstLevelY, scale, format, english }) {
  const distance = Math.max(0, (floorY - firstLevelY) / scale);
  if (!Number.isFinite(distance) || distance <= 0) return null;
  return <g pointerEvents="none" aria-label={`${english ? "Floor to underside of first level" : "Chão à face inferior do primeiro nível"}: ${format(distance)}`}>
    <title>{english ? "Clear height from floor to the underside of the first remaining level" : "Altura livre do chão à face inferior do primeiro nível que permanece"}</title>
    <line x1={x} y1={firstLevelY} x2={x} y2={floorY} stroke="#a6a6a6" strokeWidth="1.5" />
    <line x1={x - 4} y1={firstLevelY} x2={x + 4} y2={firstLevelY} stroke="#a6a6a6" strokeWidth="1.5" />
    <line x1={x - 4} y1={floorY} x2={x + 4} y2={floorY} stroke="#a6a6a6" strokeWidth="1.5" />
    <text x={x + 10} y={(firstLevelY + floorY) / 2 + 4} fill="#666" fontSize="13" stroke="white" strokeWidth="2" paintOrder="stroke">{format(distance)}</text>
  </g>;
}
