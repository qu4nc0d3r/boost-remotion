import React from 'react';
import {SceneView} from './SceneView';
import thumb from './thumb.json';

// Still art for thumbnails: one scene rendered at a fixed frame, no captions/watermark.
export const ThumbArt: React.FC = () => {
	const t: any = thumb;
	return (
		<SceneView
			s={{id: 'thumb', index: 99, label: '', lead: 0, audioFrames: t.audioFrames ?? 150, duration: 999, camera: t.camera ?? {static: true}, night: t.night, tint: t.tint, sky: t.sky, skyStrength: t.skyStrength, items: t.items}}
			frame={t.frame ?? 150}
		/>
	);
};
