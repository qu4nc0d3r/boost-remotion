import React from 'react';
import {Composition, Still} from 'remotion';
import {MainVideo} from './Video';
import './fonts';
import data from './data.json';
import {ThumbArt} from './Thumb';

export const RemotionRoot: React.FC = () => (
	<>
		<Composition id="Main" component={MainVideo} width={1920} height={1080} fps={data.fps} durationInFrames={data.total} />
		<Composition id="Thumb" component={ThumbArt} width={1920} height={1080} fps={30} durationInFrames={1} />
	</>
);
