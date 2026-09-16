const SPARKLES = [
  { top: '5%', left: '14%', size: 3, delay: 0, duration: 2.6, kind: 'dot', color: 'rgba(255, 196, 140, 0.95)' },
  { top: '9%', left: '72%', size: 7, delay: 0.4, duration: 3.2, kind: 'star', color: 'rgba(186, 214, 255, 0.9)' },
  { top: '14%', left: '38%', size: 2, delay: 1.1, duration: 2.1, kind: 'dot', color: 'rgba(255, 255, 255, 0.95)' },
  { top: '18%', left: '86%', size: 4, delay: 0.8, duration: 2.8, kind: 'dot', color: 'rgba(221, 196, 255, 0.9)' },
  { top: '22%', left: '8%', size: 6, delay: 1.6, duration: 3.4, kind: 'star', color: 'rgba(255, 214, 170, 0.95)' },
  { top: '27%', left: '54%', size: 3, delay: 0.2, duration: 2.4, kind: 'dot', color: 'rgba(186, 230, 255, 0.9)' },
  { top: '32%', left: '24%', size: 2, delay: 2.1, duration: 2.9, kind: 'dot', color: 'rgba(255, 236, 210, 0.95)' },
  { top: '36%', left: '78%', size: 7, delay: 1.3, duration: 3.1, kind: 'star', color: 'rgba(255, 255, 255, 0.9)' },
  { top: '41%', left: '46%', size: 3, delay: 0.6, duration: 2.5, kind: 'dot', color: 'rgba(255, 186, 150, 0.9)' },
  { top: '46%', left: '12%', size: 2, delay: 1.9, duration: 2.2, kind: 'dot', color: 'rgba(210, 228, 255, 0.95)' },
  { top: '50%', left: '68%', size: 6, delay: 0.3, duration: 3.6, kind: 'star', color: 'rgba(221, 196, 255, 0.85)' },
  { top: '55%', left: '32%', size: 3, delay: 2.4, duration: 2.7, kind: 'dot', color: 'rgba(255, 255, 255, 0.95)' },
  { top: '59%', left: '88%', size: 2, delay: 1.0, duration: 2.3, kind: 'dot', color: 'rgba(255, 214, 170, 0.9)' },
  { top: '64%', left: '18%', size: 7, delay: 1.7, duration: 3.3, kind: 'star', color: 'rgba(186, 214, 255, 0.9)' },
  { top: '68%', left: '58%', size: 3, delay: 0.9, duration: 2.6, kind: 'dot', color: 'rgba(255, 196, 140, 0.9)' },
  { top: '73%', left: '42%', size: 2, delay: 2.2, duration: 2.0, kind: 'dot', color: 'rgba(221, 196, 255, 0.9)' },
  { top: '77%', left: '80%', size: 4, delay: 0.5, duration: 2.9, kind: 'dot', color: 'rgba(255, 255, 255, 0.95)' },
  { top: '82%', left: '10%', size: 6, delay: 1.4, duration: 3.5, kind: 'star', color: 'rgba(255, 226, 186, 0.95)' },
  { top: '86%', left: '64%', size: 3, delay: 2.0, duration: 2.4, kind: 'dot', color: 'rgba(186, 230, 255, 0.9)' },
  { top: '91%', left: '28%', size: 2, delay: 0.7, duration: 2.8, kind: 'dot', color: 'rgba(255, 214, 170, 0.9)' },
  { top: '11%', left: '52%', size: 2, delay: 1.8, duration: 2.5, kind: 'dot', color: 'rgba(255, 255, 255, 0.9)' },
  { top: '39%', left: '6%', size: 3, delay: 2.6, duration: 3.0, kind: 'dot', color: 'rgba(221, 196, 255, 0.85)' },
  { top: '71%', left: '92%', size: 2, delay: 1.2, duration: 2.7, kind: 'dot', color: 'rgba(186, 214, 255, 0.9)' },
  { top: '94%', left: '48%', size: 6, delay: 0.1, duration: 3.4, kind: 'star', color: 'rgba(255, 196, 140, 0.85)' },
];

export default function SidebarSparkles() {
  return (
    <div className="sidebar-sparkles" aria-hidden="true">
      {SPARKLES.map((sparkle, index) => (
        <span
          key={index}
          className={`sidebar-sparkle sidebar-sparkle--${sparkle.kind}`}
          style={{
            top: sparkle.top,
            left: sparkle.left,
            width: sparkle.size,
            height: sparkle.size,
            color: sparkle.color,
            backgroundColor: sparkle.kind === 'dot' ? sparkle.color : 'transparent',
            animationDelay: `${sparkle.delay}s`,
            animationDuration: `${sparkle.duration}s`,
            boxShadow: sparkle.kind === 'dot' ? `0 0 ${sparkle.size * 2.4}px ${sparkle.color}` : 'none',
          }}
        />
      ))}
    </div>
  );
}
