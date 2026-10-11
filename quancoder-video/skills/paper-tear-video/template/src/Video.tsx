import React from 'react';
import {AbsoluteFill, Sequence, staticFile, useVideoConfig} from 'remotion';
import {Audio} from '@remotion/media';
import {TransitionSeries, linearTiming} from '@remotion/transitions';
import {paperTear} from './PaperTear';
import {Scene} from './Scene';
import {Grain} from './paper';
import {Watermark} from './Brand';
import data from './data.json';

const T = data.tear;

export const MainVideo: React.FC = () => {
	const {durationInFrames} = useVideoConfig();
	// absolute start of each scene on the main timeline
	const starts: number[] = [];
	data.scenes.reduce((acc, s) => {
		starts.push(acc);
		return acc + s.duration - T;
	}, 0);

	return (
		<AbsoluteFill style={{backgroundColor: '#15120e'}}>
			<TransitionSeries>
				{data.scenes.map((s, i) => (
					<React.Fragment key={s.id}>
						<TransitionSeries.Sequence name={`${s.index}. ${s.label}`} durationInFrames={s.duration}>
							<Scene scene={s} />
						</TransitionSeries.Sequence>
						{i < data.scenes.length - 1 ? (
							<TransitionSeries.Transition
								presentation={paperTear({
									seed: s.id,
									axis: i % 3 === 2 ? 'v' : 'h',
									at: 0.42 + (i % 4) * 0.05,
									tilt: (i % 2 ? -1 : 1) * (120 + (i % 5) * 40),
								})}
								timing={linearTiming({durationInFrames: T})}
							/>
						) : null}
					</React.Fragment>
				))}
			</TransitionSeries>

			<Grain opacity={0.16} />
			<Watermark />

			{/* narration */}
			{data.scenes.map((s, i) => (
				<Sequence key={s.id} name={`VO ${s.id}`} from={starts[i] + s.lead} durationInFrames={s.audioFrames}>
					<Audio src={staticFile(s.audio)} />
				</Sequence>
			))}

			{/* paper rip sound on every tear */}
			{data.scenes.slice(0, -1).map((s, i) => (
				<Sequence key={'rip' + s.id} name={`SFX rip ${i + 1}`} from={starts[i] + s.duration - T} durationInFrames={T + 6}>
					<Audio src={staticFile(`sfx/rip${i % 4}.wav`)} volume={0.55} />
				</Sequence>
			))}

			{/* ambient bed */}
			<Sequence name="Music" durationInFrames={durationInFrames}>
				<Audio
					src={staticFile('music.m4a')}
					volume={(f) => Math.min(1, f / 60) * Math.min(1, (durationInFrames - f) / 90) * 0.13}
				/>
			</Sequence>
		</AbsoluteFill>
	);
};
