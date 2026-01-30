//Clanker-coded
// Returns an array of [r,g,b] (0–255), visually well-spread
export function gen_palette(count) {
	const out = [];
	const golden = 0.618033988749895; // golden ratio conjugate
	let h = 0;
	out.push(0x0);
	for (let i = 0; i < count; i++) {
		h = (h + golden) % 1;
		const s = 0.65;
		const v = 0.95;
		out.push(hsv_to_rgb24(h, s, v));
	}
	return out;
}

export function hsv_to_rgb24(h, s, v) {
	const i = Math.floor(h * 6);
	const f = h * 6 - i;
	const p = v * (1 - s);
	const q = v * (1 - f * s);
	const t = v * (1 - (1 - f) * s);

	let r, g, b;
	switch (i % 6) {
		case 0: r = v; g = t; b = p; break;
		case 1: r = q; g = v; b = p; break;
		case 2: r = p; g = v; b = t; break;
		case 3: r = p; g = q; b = v; break;
		case 4: r = t; g = p; b = v; break;
		case 5: r = v; g = p; b = q; break;
	}

	return Math.round(r * 255) | (Math.round(g * 255) << 8) | (Math.round(b * 255) << 16);

}
