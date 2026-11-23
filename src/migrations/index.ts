import * as migration_20261115_001553_initial from './20261115_001553_initial';
import * as migration_20261116_130705_content_model from './20261116_130705_content_model';
import * as migration_20261116_152833_visitors_and_access from './20261116_152833_visitors_and_access';
import * as migration_20261116_233411_frame_header_text from './20261116_233411_frame_header_text';
import * as migration_20261117_012735_media from './20261117_012735_media';
import * as migration_20261117_032857_stats_quote_facts_table from './20261117_032857_stats_quote_facts_table';
import * as migration_20261117_045005_list from './20261117_045005_list';
import * as migration_20261117_063327_cards from './20261117_063327_cards';
import * as migration_20261117_084432_collections_in_sections from './20261117_084432_collections_in_sections';
import * as migration_20261117_231451_about from './20261117_231451_about';
import * as migration_20261118_165306_record_card_title from './20261118_165306_record_card_title';
import * as migration_20261118_173904_forms from './20261118_173904_forms';
import * as migration_20261118_211013_cleanup_job from './20261118_211013_cleanup_job';
import * as migration_20261118_211252_message_limit from './20261118_211252_message_limit';
import * as migration_20261119_182115_alt_per_language from './20261119_182115_alt_per_language';
import * as migration_20261119_185659_drop_unused from './20261119_185659_drop_unused';
import * as migration_20261122_174946_icons_for_settings from './20261122_174946_icons_for_settings';
import * as migration_20261123_043755_seo_meta from './20261123_043755_seo_meta';

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
    name: '20261116_233411_frame_header_text',
  },
  {
    up: migration_20261117_012735_media.up,
    down: migration_20261117_012735_media.down,
    name: '20261117_012735_media',
  },
  {
    up: migration_20261117_032857_stats_quote_facts_table.up,
    down: migration_20261117_032857_stats_quote_facts_table.down,
    name: '20261117_032857_stats_quote_facts_table',
  },
  {
    up: migration_20261117_045005_list.up,
    down: migration_20261117_045005_list.down,
    name: '20261117_045005_list',
  },
  {
    up: migration_20261117_063327_cards.up,
    down: migration_20261117_063327_cards.down,
    name: '20261117_063327_cards',
  },
  {
    up: migration_20261117_084432_collections_in_sections.up,
    down: migration_20261117_084432_collections_in_sections.down,
    name: '20261117_084432_collections_in_sections',
  },
  {
    up: migration_20261117_231451_about.up,
    down: migration_20261117_231451_about.down,
    name: '20261117_231451_about',
  },
  {
    up: migration_20261118_165306_record_card_title.up,
    down: migration_20261118_165306_record_card_title.down,
    name: '20261118_165306_record_card_title',
  },
  {
    up: migration_20261118_173904_forms.up,
    down: migration_20261118_173904_forms.down,
    name: '20261118_173904_forms',
  },
  {
    up: migration_20261118_211013_cleanup_job.up,
    down: migration_20261118_211013_cleanup_job.down,
    name: '20261118_211013_cleanup_job',
  },
  {
    up: migration_20261118_211252_message_limit.up,
    down: migration_20261118_211252_message_limit.down,
    name: '20261118_211252_message_limit',
  },
  {
    up: migration_20261119_182115_alt_per_language.up,
    down: migration_20261119_182115_alt_per_language.down,
    name: '20261119_182115_alt_per_language',
  },
  {
    up: migration_20261119_185659_drop_unused.up,
    down: migration_20261119_185659_drop_unused.down,
    name: '20261119_185659_drop_unused',
  },
  {
    up: migration_20261122_174946_icons_for_settings.up,
    down: migration_20261122_174946_icons_for_settings.down,
    name: '20261122_174946_icons_for_settings',
  },
  {
    up: migration_20261123_043755_seo_meta.up,
    down: migration_20261123_043755_seo_meta.down,
    name: '20261123_043755_seo_meta'
  },
];
