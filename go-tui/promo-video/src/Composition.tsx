import { AbsoluteFill, Sequence, Img, staticFile } from 'remotion';
import { Scene1 } from './scenes/Scene1';
import { Scene2 } from './scenes/Scene2';
import { Scene3 } from './scenes/Scene3';

export const MainComposition = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {/* Scene 1: Frustrated Developer (0-3s = 0-90 frames) */}
      <Sequence from={0} durationInFrames={90}>
        <Scene1 />
      </Sequence>

      {/* Scene 2: Terminal Demo (3-7s = 90-210 frames, duration 120) */}
      <Sequence from={90} durationInFrames={120}>
        <Scene2 />
      </Sequence>

      {/* Scene 3: Happy Ending + CTA (7-12s = 210-360 frames, duration 150) */}
      <Sequence from={210} durationInFrames={150}>
        <Scene3 />
      </Sequence>
    </AbsoluteFill>
  );
};
