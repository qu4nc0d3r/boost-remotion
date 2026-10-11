import {continueRender, delayRender, staticFile} from 'remotion';

// Local copies of Google Fonts (OFL) — Be Vietnam Pro, Patrick Hand, Playfair Display.
const faces: [string, string, string][] = [
	['Be Vietnam Pro', 'fonts/BeVietnamPro-Bold.ttf', '700'],
	['Be Vietnam Pro', 'fonts/BeVietnamPro-ExtraBold.ttf', '800'],
	['Patrick Hand', 'fonts/PatrickHand-Regular.ttf', '400'],
	['Playfair Display', 'fonts/PlayfairDisplay.ttf', '400 900'],
];

if (typeof document !== 'undefined') {
	const handle = delayRender('fonts');
	Promise.all(
		faces.map(([family, file, weight]) => {
			const f = new FontFace(family, `url(${staticFile(file)})`, {weight});
			return f.load().then((loaded) => document.fonts.add(loaded));
		}),
	)
		.then(() => continueRender(handle))
		.catch((e) => {
			console.error(e);
			continueRender(handle);
		});
}

export const fonts = {
	body: '"Be Vietnam Pro", sans-serif',
	hand: '"Patrick Hand", cursive',
	display: '"Playfair Display", serif',
};
