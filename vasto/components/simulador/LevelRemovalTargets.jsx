export default function LevelRemovalTargets({ activeLevels, yForLevel, left, right, removeLevel, english }) {
  return <g data-level-controls="true">{activeLevels.map((index) => <g key={index} role="button" tabIndex={0} aria-disabled={activeLevels.length <= 1} aria-label={english ? `Remove level ${index + 1} from this module` : `Remover nível ${index + 1} deste módulo`} className={activeLevels.length > 1 ? "cursor-pointer outline-none focus:[&>rect]:stroke-[#ff5500] hover:[&>rect]:fill-red-500/15" : "cursor-default"} onClick={() => removeLevel(index)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); removeLevel(index); } }}>
    <title>{english ? "Click to remove only this level from this module" : "Clique para remover apenas este nível deste módulo"}</title>
    <rect x={left} y={yForLevel(index) - 12} width={right - left} height="24" fill="transparent" stroke="transparent" rx="3" />
  </g>)}</g>;
}
