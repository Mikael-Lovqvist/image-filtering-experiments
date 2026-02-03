import { gen_palette } from './color-functions.mjs';

export function rgba_extract_channel(source_buffer, width, height, channel) {
	const dest_buffer = new Uint8Array(width * height);
	const s = channel << 3;
	for (let y=0; y<height; y++) {
		for (let x=0; x<width; x++) {
			const i = width * y + x;
			dest_buffer[i] = (source_buffer[i] >> s) & 0xFF;
		}
	}
	return dest_buffer;
}

export function create_disc_kernel(radius) {
	const side = 2 * radius + 1;
	const dest_buffer = new Uint8Array(side * side);
	const r2 = radius ** 2;
	let sum = 0;
	for (let y=-radius; y<=radius; y++) {
		for (let x=-radius; x<=radius; x++) {
			const i = (y + radius) * side + x + radius;
			const b = x**2 + y**2 <= r2 ? 1 : 0;
			dest_buffer[i] = b * 0xFF;
			sum += b;
		}
	}
	return { width: side, height: side, offset_x: -radius, offset_y: -radius, buffer: dest_buffer, sum };
}


export function apply_erosion_kernel_1ch(source_buffer, width, height, kernel) {

	const dest_buffer = new Uint8Array(width * height);

	const k_x = kernel.offset_x;
	const k_y = kernel.offset_y;
	const k_buf = kernel.buffer;
	const k_width = kernel.width;
	const k_height = kernel.height;

	const k_threshold = kernel.sum;

	for (let y = -k_y; y < height - (k_height + k_y); y++) {
		for (let x = -k_x; x < width  - (k_width  + k_x); x++) {

			let w=0;
			for (let dy=0; dy<k_height; dy++) {
				for (let dx=0; dx<k_width; dx++) {
					const si = width * (y + dy + k_y) + (x + dx + k_x);
					w += source_buffer[si];
				}
			}

			const di = width * y + x;
			dest_buffer[di] = (w >> 8) >= k_threshold ? 255 : 0;
		}
	}

	return dest_buffer;
}



export function create_connected_labels_1ch(source_buffer, width, height) {
	const dest_buffer = new Uint32Array(width * height);
	let label_count = 0;

	function create_single_label() {

		for (let y=0; y<height; y++) {
			for (let x=0; x<width; x++) {
				const i = width * y + x;
				if (source_buffer[i] & 0x80) {
					if (dest_buffer[i] === 0) {
						masked_flood_fill_32(source_buffer, dest_buffer, width, height, x, y, ++label_count);

						return true;
					}
				}
			}
		}
		return false;
	}

	while(create_single_label());

	return { count: label_count, buffer: dest_buffer };

}

export function masked_flood_fill_32(mask_buffer, dest_buffer, width, height, x, y, color) {

	const si = y * width + x;
	if (!(mask_buffer[si] & 0x80)) {
		return;
	}

	dest_buffer[si] = color;

	while (true) {

		let mutation = false;

		for (let y=0; y<height; y++) {
			for (let x=0; x<width; x++) {
				const i = width * y + x;
				function should_expand() {
					if (x > 0) {
						const ic = width * y + x - 1;
						if (dest_buffer[ic] === color && mask_buffer[ic] & 0x80) {
							return true;
						}
					}

					if (x < width - 1) {
						const ic = width * y + x + 1;
						if (dest_buffer[ic] === color && mask_buffer[ic] & 0x80) {
							return true;
						}
					}

					if (y > 0) {
						const ic = width * (y - 1) + x;
						if (dest_buffer[ic] === color && mask_buffer[ic] & 0x80) {
							return true;
						}
					}

					if (y < height - 1) {
						const ic = width * (y + 1) + x;
						if (dest_buffer[ic] === color && mask_buffer[ic] & 0x80) {
							return true;
						}
					}

					return false;

				}

				if (dest_buffer[i] === 0 && should_expand()) {
					dest_buffer[i] = color;
					mutation = true;
				}

			}
		}

		for (let y=height-1; y>=0; y--) {
			for (let x=width-1; x>=0; x--) {
				const i = width * y + x;
				function should_expand() {
					if (x > 0) {
						const ic = width * y + x - 1;
						if (dest_buffer[ic] === color && mask_buffer[ic] & 0x80) {
							return true;
						}
					}

					if (x < width - 1) {
						const ic = width * y + x + 1;
						if (dest_buffer[ic] === color && mask_buffer[ic] & 0x80) {
							return true;
						}
					}

					if (y > 0) {
						const ic = width * (y - 1) + x;
						if (dest_buffer[ic] === color && mask_buffer[ic] & 0x80) {
							return true;
						}
					}

					if (y < height - 1) {
						const ic = width * (y + 1) + x;
						if (dest_buffer[ic] === color && mask_buffer[ic] & 0x80) {
							return true;
						}
					}

					return false;

				}

				if (dest_buffer[i] === 0 && should_expand()) {
					dest_buffer[i] = color;
					mutation = true;
				}

			}
		}

		if (!mutation) {
			break;
		}

	}

}

export function visualize_labels(labels, width, height) {
	const palette = gen_palette(labels.count);
	const dest_buffer = new Uint32Array(width * height);
	const source_buffer = labels.buffer;

	for (let y=0; y<height; y++) {
		for (let x=0; x<width; x++) {
			const i = width * y + x;
			dest_buffer[i] = palette[source_buffer[i]] | 0xFF000000;
			// (0x103050 * source_buffer[i])


		}
	}

	return dest_buffer;

}



export function masked_label_fill_expansion(mask_buffer, dest_buffer, width, height) {

	while (true) {

		let mutation = false;

		for (let y=0; y<height; y++) {
			for (let x=0; x<width; x++) {
				const i = width * y + x;
				function neighbor_label() {
					if (x > 0) {
						const ic = width * y + x - 1;
						if (dest_buffer[ic] !== 0) {
							return dest_buffer[ic];
						}
					}

					if (x < width - 1) {
						const ic = width * y + x + 1;
						if (dest_buffer[ic] !== 0) {
							return dest_buffer[ic];
						}
					}

					if (y > 0) {
						const ic = width * (y - 1) + x;
						if (dest_buffer[ic] !== 0) {
							return dest_buffer[ic];
						}
					}

					if (y < height - 1) {
						const ic = width * (y + 1) + x;
						if (dest_buffer[ic] !== 0) {
							return dest_buffer[ic];
						}
					}

					return 0;

				}

				if (dest_buffer[i] === 0 && (mask_buffer[i] & 0x80)) {
					const label = neighbor_label();
					if (label) {
						dest_buffer[i] = label;
						mutation = true;
					}
				}

			}
		}

		for (let y=height-1; y>=0; y--) {
			for (let x=width-1; x>=0; x--) {
				const i = width * y + x;
				function neighbor_label() {
					if (x > 0) {
						const ic = width * y + x - 1;
						if (dest_buffer[ic] !== 0) {
							return dest_buffer[ic];
						}
					}

					if (x < width - 1) {
						const ic = width * y + x + 1;
						if (dest_buffer[ic] !== 0) {
							return dest_buffer[ic];
						}
					}

					if (y > 0) {
						const ic = width * (y - 1) + x;
						if (dest_buffer[ic] !== 0) {
							return dest_buffer[ic];
						}
					}

					if (y < height - 1) {
						const ic = width * (y + 1) + x;
						if (dest_buffer[ic] !== 0) {
							return dest_buffer[ic];
						}
					}

					return 0;

				}

				if (dest_buffer[i] === 0 && (mask_buffer[i] & 0x80)) {
					const label = neighbor_label();
					if (label) {
						dest_buffer[i] = label;
						mutation = true;
					}
				}

			}
		}

		if (!mutation) {
			break;
		}

	}

}



export function rgb_extract_clamped_square_value(source_buffer, width, height) {
	const dest_buffer = new Uint8Array(width * height);

	for (let y=0; y<height; y++) {
		for (let x=0; x<width; x++) {
			const i = width * y + x;
			const R = source_buffer[i] & 0xFF;
			const G = (source_buffer[i] >> 8) & 0xFF;
			const B = (source_buffer[i] >> 16) & 0xFF;
			const sq_sum = R ** 2 + G ** 2 + B ** 2;
			dest_buffer[i] = Math.min(sq_sum, 0xFF);
		}
	}
	return dest_buffer;
}

export function value_lt_threshold_8(source_buffer, width, height, threshold) {
	const dest_buffer = new Uint8Array(width * height);

	for (let y=0; y<height; y++) {
		for (let x=0; x<width; x++) {
			const i = width * y + x;
			dest_buffer[i] = source_buffer[i] < threshold ? 255 : 0;
		}
	}
	return dest_buffer;
}

export function value_gt_threshold_8(source_buffer, width, height, threshold) {
	const dest_buffer = new Uint8Array(width * height);

	for (let y=0; y<height; y++) {
		for (let x=0; x<width; x++) {
			const i = width * y + x;
			dest_buffer[i] = source_buffer[i] > threshold ? 255 : 0;
		}
	}
	return dest_buffer;
}

export function non_zero_label(source_buffer, width, height) {
	const dest_buffer = new Uint8Array(width * height);

	for (let y=0; y<height; y++) {
		for (let x=0; x<width; x++) {
			const i = width * y + x;
			dest_buffer[i] = source_buffer[i] !== 0 ? 255 : 0;
		}
	}
	return dest_buffer;
}


export function replace_alpha_with_mask(color_buffer, alpha_buffer, width, height) {
	const dest_buffer = new Uint32Array(width * height);

	for (let y=0; y<height; y++) {
		for (let x=0; x<width; x++) {
			const i = width * y + x;
			dest_buffer[i] = color_buffer[i] & 0xFFFFFF | (alpha_buffer[i] << 24);
		}
	}
	return dest_buffer;
}
