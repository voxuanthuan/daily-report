import { AbsoluteFill, Img, staticFile, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';

export const Scene3: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Fade transition from previous scene
  const fadeIn = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });

  // Happy people image
  const imageOpacity = interpolate(frame, [10, 30], [0, 1], { extrapolateRight: 'clamp' });
  const imageScale = spring({
    fps,
    frame: frame - 10,
    config: { damping: 100 },
  });

  // Logo animation
  const logoOpacity = interpolate(frame, [40, 60], [0, 1], { extrapolateRight: 'clamp' });
  const logoY = spring({
    fps,
    frame: frame - 40,
    config: { damping: 200, stiffness: 100 },
  });

  // CTA text
  const ctaOpacity = interpolate(frame, [70, 90], [0, 1], { extrapolateRight: 'clamp' });
  const ctaScale = spring({
    fps,
    frame: frame - 70,
    config: { damping: 100 },
  });

  return (
    <AbsoluteFill style={{ backgroundColor: '#ffffff', opacity: fadeIn }}>
      {/* Happy coworkers background */}
      <AbsoluteFill style={{ opacity: imageOpacity }}>
        <Img
          src={staticFile('happy_coworker_1769006992558.png')}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: `scale(${imageScale})`,
          }}
        />
        {/* Light overlay for better contrast */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(to top, rgba(255,255,255,0.7), rgba(255,255,255,0.2))',
          }}
        />
      </AbsoluteFill>

      {/* End card with logo and CTA */}
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: 'column',
          gap: 40,
        }}
      >
        {/* Logo */}
        <div
          style={{
            opacity: logoOpacity,
            transform: `translateY(${(1 - logoY) * 50}px)`,
          }}
        >
          <Img
            src={staticFile('minimal_logo_1769007178171.png')}
            style={{
              width: 200,
              height: 200,
              filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.2))',
            }}
          />
        </div>

        {/* Product name */}
        <div
          style={{
            opacity: logoOpacity,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: 56,
            fontWeight: 'bold',
            color: '#1a1a1a',
            textAlign: 'center',
          }}
        >
          Jira Daily Report
        </div>

        {/* CTA */}
        <div
          style={{
            opacity: ctaOpacity,
            transform: `scale(${ctaScale})`,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontFamily: 'system-ui, sans-serif',
              fontSize: 64,
              fontWeight: 'bold',
              color: '#5b5bd6',
              marginBottom: 20,
            }}
          >
            Save time. Try Today.
          </div>
          <div
            style={{
              fontFamily: 'monospace',
              fontSize: 36,
              color: '#666',
              backgroundColor: '#f5f5f5',
              padding: '15px 30px',
              borderRadius: '8px',
              display: 'inline-block',
            }}
          >
            npm install -g jira-daily-report
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
