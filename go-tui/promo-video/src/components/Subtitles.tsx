import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';

export const Subtitles: React.FC = () => {
  const frame = useCurrentFrame();

  // Subtitle timings based on voiceover script
  // [0-4s = 0-120 frames] "Still copying Jira tasks every morning?"
  // [4-8s = 120-240 frames] "Run one command — and your daily report is ready."
  // [8-12s = 240-360 frames] "Save time. Try Jira Daily Report today."

  let subtitleText = '';
  let subtitleOpacity = 0;

  if (frame >= 0 && frame < 120) {
    subtitleText = 'Spending hours on daily Jira reports?';
    subtitleOpacity = interpolate(frame, [0, 15, 105, 120], [0, 1, 1, 0]);
  } else if (frame >= 120 && frame < 240) {
    subtitleText = 'Run one command — and your daily report is ready.';
    subtitleOpacity = interpolate(frame, [120, 135, 225, 240], [0, 1, 1, 0]);
  } else if (frame >= 240 && frame < 360) {
    subtitleText = 'Save time. Try Jira Daily Report today.';
    subtitleOpacity = interpolate(frame, [240, 255, 345, 360], [0, 1, 1, 0]);
  }

  if (!subtitleText) return null;

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: '8%',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          opacity: subtitleOpacity,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: 40,
          fontWeight: 600,
          color: 'white',
          textAlign: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          padding: '15px 40px',
          borderRadius: '8px',
          maxWidth: '80%',
          lineHeight: 1.4,
        }}
      >
        {subtitleText}
      </div>
    </AbsoluteFill>
  );
};
