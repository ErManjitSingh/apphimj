export default function MiniSparkline({
  data = [],
  color = '#f97316',
  width = 72,
  height = 28,
  fill = false,
  className = '',
}) {
  const values = (Array.isArray(data) ? data : [])
    .map((n) => Number(n) || 0)
    .slice(-8);
  if (values.length < 2) {
    return <div style={{ width, height }} className={`shrink-0 ${className}`} />;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = (width - 4) / (values.length - 1);
  const coords = values.map((v, i) => {
    const x = 2 + i * step;
    const y = height - 4 - ((v - min) / span) * (height - 8);
    return { x, y };
  });
  const points = coords.map(({ x, y }) => `${x},${y}`).join(' ');
  const last = coords[coords.length - 1];
  const area = `2,${height} ${points} ${width - 2},${height}`;
  const gradId = `spark-${color.replace('#', '')}-${width}-${height}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`shrink-0 overflow-visible ${className}`}
    >
      {fill && (
        <>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.35" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon fill={`url(#${gradId})`} points={area} />
        </>
      )}
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      <circle cx={last.x} cy={last.y} r="2.4" fill={color} />
    </svg>
  );
}
