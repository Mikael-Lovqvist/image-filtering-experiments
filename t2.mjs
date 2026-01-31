// Experiment in removing background

import sharp from 'sharp';
import assert from 'node:assert';
import { rgb_extract_clamped_square_value, value_lt_threshold_8, value_gt_threshold_8, non_zero_label, replace_alpha_with_mask, create_disc_kernel, rgba_extract_channel, apply_erosion_kernel_1ch, create_connected_labels_1ch, visualize_labels, masked_label_fill_expansion } from './image-functions.mjs';
import { preview } from './preview.mjs';


//const input_path = '/home/devilholk/Downloads/00001-68143709.png';
const input_path = '/home/devilholk/Documents/dark-sample.png';
const output_path = './output.png';

const image = sharp(input_path);


const meta = await image.metadata();

assert(meta.channels >= 3, 'Expected RGB/RGBA - 3 or 4 channels');

const byte_buffer = await image.ensureAlpha().raw().toBuffer();
const source_buffer = new Uint32Array(byte_buffer.buffer, byte_buffer.byteOffset, byte_buffer.byteLength >> 2);


const value_buffer = rgb_extract_clamped_square_value(source_buffer, meta.width, meta.height);
const mask = value_gt_threshold_8(value_buffer, meta.width, meta.height, 200);

const erosion_kernel = create_disc_kernel(10);
const eroded_mask = apply_erosion_kernel_1ch(mask, meta.width, meta.height, erosion_kernel);

const labels = create_connected_labels_1ch(eroded_mask, meta.width, meta.height);
masked_label_fill_expansion(mask, labels.buffer, meta.width, meta.height);

const revised_mask = non_zero_label(labels.buffer, meta.width, meta.height);

const touchup_erosion_kernel = create_disc_kernel(3);
const final_eroded_mask = apply_erosion_kernel_1ch(revised_mask, meta.width, meta.height, touchup_erosion_kernel);

const final_result = replace_alpha_with_mask(source_buffer, final_eroded_mask, meta.width, meta.height);
preview(final_result, meta.width, meta.height, 4, 'rgba');

const final_byte_buffer = Buffer.from(final_result.buffer, final_result.byteOffset, final_result.byteLength);
const final_sharp_image = sharp(final_byte_buffer, { raw: { width: meta.width, height: meta.height, channels: 4 }});

final_sharp_image.png({
	palette: true,          // use an 8‑bit palette
	colors: 63,             // 63 visible colours + 1 transparent
	dither: 1,              // Floyd‑Steinberg
	background: { r: 0, g: 0, b: 0, a: 0 } // transparent pixel at index 0
})
.toFile(output_path, (err, info) => {
	if (err) console.error('Error writing PNG:', err);
	else console.log('Indexed PNG written to', output_path);
});