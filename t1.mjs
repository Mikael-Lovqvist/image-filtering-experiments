import sharp from 'sharp';
import assert from 'node:assert';
import { create_disc_kernel, rgba_extract_channel, apply_erosion_kernel_1ch, create_connected_labels_1ch, visualize_labels, masked_label_fill_expansion } from './image-functions.mjs';
import { preview } from './preview.mjs';

const image = sharp('/home/devilholk/Downloads/dragonmap-sample.png');
const meta = await image.metadata();

assert(meta.channels === 4, 'Expected RGBA (4 channels)');

const byte_buffer = await image.raw().toBuffer();
const source_buffer = new Uint32Array(byte_buffer.buffer, byte_buffer.byteOffset, byte_buffer.byteLength >> 2);

const erosion_kernel = create_disc_kernel(10);
//preview(erosion_kernel.buffer, erosion_kernel.width, erosion_kernel.height);

const mask = rgba_extract_channel(source_buffer, meta.width, meta.height, 3);
//preview(mask, meta.width, meta.height);
const eroded_mask = apply_erosion_kernel_1ch(mask, meta.width, meta.height, erosion_kernel);
//preview(eroded_mask, meta.width, meta.height);

const labels = create_connected_labels_1ch(eroded_mask, meta.width, meta.height);
masked_label_fill_expansion(mask, labels.buffer, meta.width, meta.height);

const visualized_labels = visualize_labels(labels, meta.width, meta.height);
preview(visualized_labels, meta.width, meta.height, 4, 'rgba');

// Debug output
/*
for (let y=0; y<meta.height; y++) {
	for (let x=0; x<meta.width; x++) {
		const i = meta.width * y + x;
		visualized_labels[i] = 0xFF000000;

		if (labels.buffer[i] !== 0) {
			visualized_labels[i] |= 0xffffff;
		}

	}
}
preview(visualized_labels, meta.width, meta.height, 4, 'rgba');
*/




