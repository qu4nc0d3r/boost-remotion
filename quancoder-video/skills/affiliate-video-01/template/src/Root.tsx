import React from 'react';
import {Composition} from 'remotion';
import {AffVideo} from './Aff';
import data from './aff.json';

export const RemotionRoot: React.FC = () => (
	<Composition id="Aff" component={AffVideo} width={1080} height={1920} fps={data.fps} durationInFrames={data.total} />
);
