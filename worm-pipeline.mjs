// Note - This file is based on t2.mjs but ChatGPT 5.2 from OpenAI was asked to deal with input arguments and annotate progress.
// Experiment in removing background
// Usage: node wowm-pipeline.mjs <input_path> <output_path>

import sharp from 'sharp';
import assert from 'node:assert';
import * as IMOP from './image-functions.mjs';

import { log_write } from './log.mjs';

const island_pre_label_erosion = 10;

assert(process.argv.length >= 4, 'Expected two positional arguments: <input_path> <output_path>');

const input_path = process.argv[2];
const output_path = process.argv[3];

log_write('Input path:', input_path, 'Output path:', output_path);

log_write('Loading image with sharp');
const image = sharp(input_path);

log_write('Reading image metadata');
const meta = await image.metadata();

assert(meta.channels >= 3, 'Expected RGB/RGBA - 3 or 4 channels');
log_write(`Image metadata: ${meta.width}x${meta.height}, ${meta.channels} channels`);

log_write('Ensuring alpha channel and decoding to raw RGBA');
const byte_buffer = await image.ensureAlpha().raw().toBuffer();

log_write('Creating Uint32 view over raw pixel buffer');
const source_buffer = new Uint32Array(byte_buffer.buffer, byte_buffer.byteOffset, byte_buffer.byteLength >> 2);

log_write('Extracting clamped squared RGB intensity values');
const value_buffer = IMOP.rgb_extract_clamped_square_value(source_buffer, meta.width, meta.height);

log_write('Thresholding intensity values to create initial mask');
const mask = IMOP.value_gt_threshold_8(value_buffer, meta.width, meta.height, 200);

log_write(`Creating large disc erosion kernel (radius ${island_pre_label_erosion})`);
const erosion_kernel = IMOP.create_disc_kernel(island_pre_label_erosion);

log_write('Applying erosion to remove small bright regions');
const eroded_mask = IMOP.apply_erosion_kernel_1ch(mask, meta.width, meta.height, erosion_kernel);

log_write('Labeling connected components in eroded mask');
const labels = IMOP.create_connected_labels_1ch(eroded_mask, meta.width, meta.height);

log_write('Expanding original mask using surviving labels');
IMOP.masked_label_fill_expansion(mask, labels.buffer, meta.width, meta.height);

log_write('Converting non-zero labels back into a binary mask');
const revised_mask = IMOP.non_zero_label(labels.buffer, meta.width, meta.height);

log_write('Creating small disc erosion kernel (radius 3) for edge cleanup');
const touchup_erosion_kernel = IMOP.create_disc_kernel(3);

log_write('Applying final erosion to smooth mask edges');
const final_eroded_mask = IMOP.apply_erosion_kernel_1ch(revised_mask, meta.width, meta.height, touchup_erosion_kernel);

log_write('Replacing alpha channel with final mask');
const final_result = IMOP.replace_alpha_with_mask(source_buffer, final_eroded_mask, meta.width, meta.height);

log_write('Wrapping processed buffer for sharp');
const final_byte_buffer = Buffer.from(final_result.buffer, final_result.byteOffset, final_result.byteLength);

const final_sharp_image = sharp(final_byte_buffer, {
	raw: { width: meta.width, height: meta.height, channels: 4 }
});

log_write('Encoding full color PNG with transparency');
final_sharp_image
	.png().toFile(output_path, (err, info) => {
		if (err) {
			console.error('Error writing PNG:', err);
		} else {
			log_write('Indexed PNG written to', output_path);
		}
	});
