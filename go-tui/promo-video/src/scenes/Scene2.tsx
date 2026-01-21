import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, staticFile } from 'remotion';

export const Scene2: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Background fade in
  const bgOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });

  // Typing animation
  const command = 'jira-report generate';
  const typingProgress = Math.min(Math.floor(interpolate(frame, [15, 60], [0, command.length])), command.length);
  const typedCommand = command.substring(0, typingProgress);

  // Cursor blink
  const cursorOpacity = Math.floor((frame % 20) / 10) === 0 ? 1 : 0;

  // Enter key press animation
  const enterPressed = frame > 70;
  const enterScale = spring({
    fps,
    frame: frame - 70,
    config: { damping: 200 },
    from: 1,
    to: 0.95,
  });

  // Report table fade in
  const reportOpacity = interpolate(frame, [80, 100], [0, 1], { extrapolateRight: 'clamp' });

  // "Report ready" text
  const readyTextOpacity = interpolate(frame, [95, 110], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: '#0d1117', opacity: bgOpacity }}>
      {/* Terminal window */}
      <div
        style={{
          position: 'absolute',
          top: '10%',
          left: '10%',
          right: '10%',
          padding: '30px',
          backgroundColor: '#161b22',
          borderRadius: '12px',
          boxShadow: '0 25px 50px rgba(0,0,0,0.7)',
          border: '1px solid #30363d',
        }}
      >
        {/* Terminal header */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#ff5f56' }} />
          <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#ffbd2e' }} />
          <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#27c93f' }} />
        </div>

        {/* Command prompt */}
        <div style={{ fontFamily: 'monospace', fontSize: 32, color: '#c9d1d9' }}>
          <span style={{ color: '#58a6ff' }}>$ </span>
          {typedCommand}
          {!enterPressed && <span style={{ opacity: cursorOpacity }}>▊</span>}
        </div>

        {/* Report output */}
        {enterPressed && (
          <div
            style={{
              marginTop: '30px',
              opacity: reportOpacity,
              transform: `scale(${enterScale})`,
            }}
          >
            {/* Show uploaded screenshot of report */}
            <img
              src={staticFile('uploaded_image_1769009680488.png')}
              style={{
                width: '100%',
                maxHeight: '400px',
                objectFit: 'contain',
                borderRadius: '6px',
              }}
            />
          </div>
        )}
      </div>

      {/* "Report ready" text overlay */}
      <AbsoluteFill
        style={{
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingBottom: '10%',
          opacity: readyTextOpacity,
        }}
      >
        <div
          style={{
            fontFamily: 'system-ui, sans-serif',
            fontSize: 60,
            fontWeight: 'bold',
            color: '#27c93f',
            textShadow: '0 4px 20px rgba(39, 201, 63, 0.5)',
          }}
        >
          ✓ Report ready
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
