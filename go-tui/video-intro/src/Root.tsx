import { Composition } from 'remotion';
import { MainComposition } from './Composition';
import './style.css';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="GoTuiPromo"
        component={MainComposition}
        durationInFrames={900} // 30 seconds at 30fps
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
