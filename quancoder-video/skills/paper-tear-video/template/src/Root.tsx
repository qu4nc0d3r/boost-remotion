import React from 'react';
import {Composition} from 'remotion';
import {MainVideo} from './Video';
import data from './data.json';

export const RemotionRoot: React.FC = () => (
	<Composition id="Main" component={MainVideo} width={1080} height={1920} fps={data.fps} durationInFrames={data.total} />
);
