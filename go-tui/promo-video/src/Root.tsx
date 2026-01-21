import { Composition } from 'remotion';
import { MainComposition } from './Composition';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="PromoVideo"
        component={MainComposition}
        durationInFrames={360} // 12 seconds at 30fps
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
