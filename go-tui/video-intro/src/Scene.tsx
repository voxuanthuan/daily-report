import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';

export const Scene: React.FC<{ title: string; subtitle: string; color: string }> = ({ title, subtitle, color }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const scale = spring({
    fps,
    frame,
    config: {
      damping: 200,
    },
  });

  const moveUp = interpolate(frame, [0, 100], [50, 0], {
     extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: 'black',
        justifyContent: 'center',
        alignItems: 'center',
        opacity,
      }}
    >
      <div style={{ textAlign: 'center', transform: `translateY(${moveUp}px) scale(${scale})` }}>
        <h1
          style={{
            fontFamily: 'system-ui, sans-serif',
            fontSize: 120,
            fontWeight: 'bold',
            color: color,
            margin: 0,
            textShadow: '0 0 20px rgba(255, 255, 255, 0.2)',
          }}
        >
          {title}
        </h1>
        <h2
          style={{
            fontFamily: 'monospace',
            fontSize: 50,
            color: 'white',
            marginTop: 20,
            opacity: 0.8,
          }}
        >
          {subtitle}
        </h2>
      </div>
    </AbsoluteFill>
  );
};
