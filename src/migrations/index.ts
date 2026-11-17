import * as migration_20261115_001553_initial from './20261115_001553_initial';
import * as migration_20261116_130705_content_model from './20261116_130705_content_model';
import * as migration_20261116_152833_visitors_and_access from './20261116_152833_visitors_and_access';
import * as migration_20261116_233411_frame_header_text from './20261116_233411_frame_header_text';

export const migrations = [
  {
    up: migration_20261115_001553_initial.up,
    down: migration_20261115_001553_initial.down,
    name: '20261115_001553_initial',
  },
  {
    up: migration_20261116_130705_content_model.up,
    down: migration_20261116_130705_content_model.down,
    name: '20261116_130705_content_model',
  },
  {
    up: migration_20261116_152833_visitors_and_access.up,
    down: migration_20261116_152833_visitors_and_access.down,
    name: '20261116_152833_visitors_and_access',
  },
  {
    up: migration_20261116_233411_frame_header_text.up,
    down: migration_20261116_233411_frame_header_text.down,
    name: '20261116_233411_frame_header_text'
  },
];
