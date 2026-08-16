export function LoadingPan() {
  return (
    <div style={{ position: 'relative', width: 56, height: 64, display: 'inline-block' }}>
      <div style={{
        position: 'absolute',
        width: 13, height: 13,
        borderRadius: '50%',
        backgroundColor: '#f59e0b',
        left: '58%',
        bottom: 26,
        animation: 'food-jump 0.7s ease-in-out infinite',
        transformOrigin: 'bottom center',
      }} />
      <span style={{
        position: 'absolute',
        bottom: 0, left: 0,
        fontSize: 40,
        lineHeight: 1,
        userSelect: 'none',
        animation: 'pan-shake 0.7s ease-in-out infinite',
        transformOrigin: '20% 85%',
      }}>
        🍳
      </span>
    </div>
  );
}
