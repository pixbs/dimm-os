import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_windows_blocks_list_items_icon" ADD VALUE 'accessibility';
  ALTER TYPE "public"."enum_windows_blocks_list_items_icon" ADD VALUE 'hand';
  ALTER TYPE "public"."enum_windows_blocks_list_items_icon" ADD VALUE 'cookie';
  ALTER TYPE "public"."enum_windows_blocks_list_items_icon" ADD VALUE 'shield';
  ALTER TYPE "public"."enum_windows_icon" ADD VALUE 'accessibility';
  ALTER TYPE "public"."enum_windows_icon" ADD VALUE 'hand';
  ALTER TYPE "public"."enum_windows_icon" ADD VALUE 'cookie';
  ALTER TYPE "public"."enum_windows_icon" ADD VALUE 'shield';
  ALTER TYPE "public"."enum__windows_v_blocks_list_items_icon" ADD VALUE 'accessibility';
  ALTER TYPE "public"."enum__windows_v_blocks_list_items_icon" ADD VALUE 'hand';
  ALTER TYPE "public"."enum__windows_v_blocks_list_items_icon" ADD VALUE 'cookie';
  ALTER TYPE "public"."enum__windows_v_blocks_list_items_icon" ADD VALUE 'shield';
  ALTER TYPE "public"."enum__windows_v_version_icon" ADD VALUE 'accessibility';
  ALTER TYPE "public"."enum__windows_v_version_icon" ADD VALUE 'hand';
  ALTER TYPE "public"."enum__windows_v_version_icon" ADD VALUE 'cookie';
  ALTER TYPE "public"."enum__windows_v_version_icon" ADD VALUE 'shield';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "windows_blocks_list_items" ALTER COLUMN "icon" SET DATA TYPE text;
  DROP TYPE "public"."enum_windows_blocks_list_items_icon";
  CREATE TYPE "public"."enum_windows_blocks_list_items_icon" AS ENUM('arrow-right', 'arrow-left', 'arrow-up-right', 'arrow-down', 'chevron-right', 'chevron-down', 'close', 'check', 'plus', 'minus', 'search', 'menu', 'more', 'grid', 'window', 'folder', 'file', 'image', 'play', 'mail', 'phone', 'link', 'download', 'upload', 'calendar', 'clock', 'globe', 'sun', 'moon', 'lock', 'info', 'user', 'sliders', 'home', 'power', 'trash', 'copy', 'text', 'chart', 'target', 'contrast', 'keyboard', 'expand', 'star', 'ab', 'eye-off');
  ALTER TABLE "windows_blocks_list_items" ALTER COLUMN "icon" SET DATA TYPE "public"."enum_windows_blocks_list_items_icon" USING "icon"::"public"."enum_windows_blocks_list_items_icon";
  ALTER TABLE "windows" ALTER COLUMN "icon" SET DATA TYPE text;
  DROP TYPE "public"."enum_windows_icon";
  CREATE TYPE "public"."enum_windows_icon" AS ENUM('arrow-right', 'arrow-left', 'arrow-up-right', 'arrow-down', 'chevron-right', 'chevron-down', 'close', 'check', 'plus', 'minus', 'search', 'menu', 'more', 'grid', 'window', 'folder', 'file', 'image', 'play', 'mail', 'phone', 'link', 'download', 'upload', 'calendar', 'clock', 'globe', 'sun', 'moon', 'lock', 'info', 'user', 'sliders', 'home', 'power', 'trash', 'copy', 'text', 'chart', 'target', 'contrast', 'keyboard', 'expand', 'star', 'ab', 'eye-off');
  ALTER TABLE "windows" ALTER COLUMN "icon" SET DATA TYPE "public"."enum_windows_icon" USING "icon"::"public"."enum_windows_icon";
  ALTER TABLE "_windows_v_blocks_list_items" ALTER COLUMN "icon" SET DATA TYPE text;
  DROP TYPE "public"."enum__windows_v_blocks_list_items_icon";
  CREATE TYPE "public"."enum__windows_v_blocks_list_items_icon" AS ENUM('arrow-right', 'arrow-left', 'arrow-up-right', 'arrow-down', 'chevron-right', 'chevron-down', 'close', 'check', 'plus', 'minus', 'search', 'menu', 'more', 'grid', 'window', 'folder', 'file', 'image', 'play', 'mail', 'phone', 'link', 'download', 'upload', 'calendar', 'clock', 'globe', 'sun', 'moon', 'lock', 'info', 'user', 'sliders', 'home', 'power', 'trash', 'copy', 'text', 'chart', 'target', 'contrast', 'keyboard', 'expand', 'star', 'ab', 'eye-off');
  ALTER TABLE "_windows_v_blocks_list_items" ALTER COLUMN "icon" SET DATA TYPE "public"."enum__windows_v_blocks_list_items_icon" USING "icon"::"public"."enum__windows_v_blocks_list_items_icon";
  ALTER TABLE "_windows_v" ALTER COLUMN "version_icon" SET DATA TYPE text;
  DROP TYPE "public"."enum__windows_v_version_icon";
  CREATE TYPE "public"."enum__windows_v_version_icon" AS ENUM('arrow-right', 'arrow-left', 'arrow-up-right', 'arrow-down', 'chevron-right', 'chevron-down', 'close', 'check', 'plus', 'minus', 'search', 'menu', 'more', 'grid', 'window', 'folder', 'file', 'image', 'play', 'mail', 'phone', 'link', 'download', 'upload', 'calendar', 'clock', 'globe', 'sun', 'moon', 'lock', 'info', 'user', 'sliders', 'home', 'power', 'trash', 'copy', 'text', 'chart', 'target', 'contrast', 'keyboard', 'expand', 'star', 'ab', 'eye-off');
  ALTER TABLE "_windows_v" ALTER COLUMN "version_icon" SET DATA TYPE "public"."enum__windows_v_version_icon" USING "version_icon"::"public"."enum__windows_v_version_icon";`)
}
