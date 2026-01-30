// Send picture over to preview webapp

import sharp from 'sharp';


export async function preview(image_buffer, width, height, channels=1, colourspace='b-w', endpoint='http://localhost:3888/emit/demo') {
	const byte_buffer = Buffer.from(
		image_buffer.buffer,
		image_buffer.byteOffset,
		image_buffer.byteLength
	)
	const res = await fetch(endpoint, {
		method: 'POST',
		body: await sharp(byte_buffer, { raw: { width, height, channels }}).png({ bitdepth: 8, colourspace}).toBuffer(),
	});
}



