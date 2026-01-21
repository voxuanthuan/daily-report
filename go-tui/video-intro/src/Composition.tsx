import { AbsoluteFill, Sequence, useCurrentFrame, interpolate, spring, useVideoConfig, Img, staticFile } from 'remotion';
import { Scene } from './Scene';
import './style.css';

export const MainComposition = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <Sequence from={0} durationInFrames={900}>
         <AbsoluteFill style={{ zIndex: 0, opacity: 0.3 }}>
            <Img src={staticFile('matrix_rain_1769004681378.png')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
         </AbsoluteFill>
      </Sequence>

      <Sequence from={0} durationInFrames={150}>
        <Scene title="Tired of slow Jira tools?" subtitle="Wait for it..." color="#e74c3c" />
      </Sequence>

      <Sequence from={150} durationInFrames={150}>
         <AbsoluteFill>
            <Img src={staticFile('cyberpunk_gopher_1769004614782.png')} 
                 style={{ 
                    position: 'absolute', 
                    right: '10%', 
                    top: '20%', 
                    width: '30%', 
                    height: 'auto', 
                    opacity: 0.8,
                    borderRadius: '20px',
                    boxShadow: '0 0 50px rgba(46, 204, 113, 0.5)'
                 }} 
            />
         </AbsoluteFill>
         <Scene title="Meet go-tui" subtitle="The future is terminal." color="#2ecc71" />
      </Sequence>

      <Sequence from={300} durationInFrames={150}>
         <AbsoluteFill>
             <Img src={staticFile('tui_mockup_1769004756606.png')} 
                 style={{ 
                    position: 'absolute', 
                    left: '10%', 
                    bottom: '10%', 
                    width: '40%', 
                    height: 'auto', 
                    opacity: 0.6,
                    transform: 'rotate(-5deg)',
                    border: '2px solid #3498db',
                    borderRadius: '10px'
                 }} 
            />
         </AbsoluteFill>
        <Scene title="20x Faster" subtitle="<10ms Latency" color="#3498db" />
      </Sequence>

       <Sequence from={450} durationInFrames={150}>
        <Scene title="Beautiful Dark Mode" subtitle="Pure aesthetic." color="#9b59b6" />
      </Sequence>
      
       <Sequence from={600} durationInFrames={300}>
        <Scene title="Upgrade Now" subtitle="./bin/jira-report tui" color="#f1c40f" />
      </Sequence>
    </AbsoluteFill>
  );
};
