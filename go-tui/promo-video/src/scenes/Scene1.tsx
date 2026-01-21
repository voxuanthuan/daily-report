import { AbsoluteFill, Img, staticFile, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';

export const Scene1: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Fade in image
  const opacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });

  // Slow zoom effect
  const scale = interpolate(frame, [0, 90], [1, 1.1], { extrapolateRight: 'clamp' });

  // Text animation
  const textOpacity = interpolate(frame, [10, 30], [0, 1], { extrapolateRight: 'clamp' });
  const textY = spring({
    fps,
    frame: frame - 10,
    config: { damping: 100 },
  });

  return (
    <AbsoluteFill style={{ backgroundColor: '#1a1a1a' }}>
      {/* Background image */}
      <AbsoluteFill style={{ opacity }}>
        <Img
          src={staticFile('frustrated_developer_1769006820359.png')}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: `scale(${scale})`,
          }}
        />
        {/* Overlay for better text contrast */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.6))',
          }}
        />
      </AbsoluteFill>



      {/* Text overlay */}
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'flex-start',
          paddingLeft: '10%',
          opacity: textOpacity,
          transform: `translateY(${(1 - textY) * 20}px)`,
        }}
      >
        <h1
          style={{
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: 80,
            fontWeight: 'bold',
            color: 'white',
            margin: 0,
            textShadow: '0 4px 20px rgba(0,0,0,0.8)',
            lineHeight: 1.2,
          }}
        >
          Spending hours on<br />daily Jira reports?
        </h1>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
