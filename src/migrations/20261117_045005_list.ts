import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_windows_blocks_list_items_icon" AS ENUM('arrow-right', 'arrow-left', 'arrow-up-right', 'arrow-down', 'chevron-right', 'chevron-down', 'close', 'check', 'plus', 'minus', 'search', 'menu', 'more', 'grid', 'window', 'folder', 'file', 'image', 'play', 'mail', 'phone', 'link', 'download', 'upload', 'calendar', 'clock', 'globe', 'sun', 'moon', 'lock', 'info', 'user', 'sliders', 'home', 'power', 'trash', 'copy', 'text', 'chart', 'target', 'contrast', 'keyboard', 'expand', 'star', 'ab', 'eye-off');
  CREATE TYPE "public"."enum_windows_blocks_list_foot_type" AS ENUM('window', 'media', 'address');
  CREATE TYPE "public"."enum_windows_blocks_list_surface" AS ENUM('window', 'paper', 'orange', 'blue', 'mint');
  CREATE TYPE "public"."enum_windows_blocks_list_lead" AS ENUM('none', 'index', 'icon', 'picture');
  CREATE TYPE "public"."enum_windows_blocks_list_rows" AS ENUM('plain', 'link', 'opens');
  CREATE TYPE "public"."enum__windows_v_blocks_list_items_icon" AS ENUM('arrow-right', 'arrow-left', 'arrow-up-right', 'arrow-down', 'chevron-right', 'chevron-down', 'close', 'check', 'plus', 'minus', 'search', 'menu', 'more', 'grid', 'window', 'folder', 'file', 'image', 'play', 'mail', 'phone', 'link', 'download', 'upload', 'calendar', 'clock', 'globe', 'sun', 'moon', 'lock', 'info', 'user', 'sliders', 'home', 'power', 'trash', 'copy', 'text', 'chart', 'target', 'contrast', 'keyboard', 'expand', 'star', 'ab', 'eye-off');
  CREATE TYPE "public"."enum__windows_v_blocks_list_foot_type" AS ENUM('window', 'media', 'address');
  CREATE TYPE "public"."enum__windows_v_blocks_list_surface" AS ENUM('window', 'paper', 'orange', 'blue', 'mint');
  CREATE TYPE "public"."enum__windows_v_blocks_list_lead" AS ENUM('none', 'index', 'icon', 'picture');
  CREATE TYPE "public"."enum__windows_v_blocks_list_rows" AS ENUM('plain', 'link', 'opens');
  CREATE TABLE "windows_blocks_list_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"caption" varchar,
  	"title" varchar,
  	"text" varchar,
  	"end" varchar,
  	"share" numeric,
  	"of" numeric,
  	"icon" "enum_windows_blocks_list_items_icon",
  	"picture_id" integer,
  	"window_id" integer,
  	"url" varchar
  );
  
  CREATE TABLE "windows_blocks_list_foot" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"type" "enum_windows_blocks_list_foot_type" DEFAULT 'window',
  	"window_id" integer,
  	"media_id" integer,
  	"url" varchar,
  	"label" varchar
  );
  
  CREATE TABLE "windows_blocks_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"join" boolean,
  	"title" varchar,
  	"text" varchar,
  	"split" boolean DEFAULT true,
  	"surface" "enum_windows_blocks_list_surface" DEFAULT 'window',
  	"lead" "enum_windows_blocks_list_lead" DEFAULT 'none',
  	"rows" "enum_windows_blocks_list_rows" DEFAULT 'plain',
  	"large" boolean,
  	"end_label" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_windows_v_blocks_list_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"caption" varchar,
  	"title" varchar,
  	"text" varchar,
  	"end" varchar,
  	"share" numeric,
  	"of" numeric,
  	"icon" "enum__windows_v_blocks_list_items_icon",
  	"picture_id" integer,
  	"window_id" integer,
  	"url" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_windows_v_blocks_list_foot" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"type" "enum__windows_v_blocks_list_foot_type" DEFAULT 'window',
  	"window_id" integer,
  	"media_id" integer,
  	"url" varchar,
  	"label" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_windows_v_blocks_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"join" boolean,
  	"title" varchar,
  	"text" varchar,
  	"split" boolean DEFAULT true,
  	"surface" "enum__windows_v_blocks_list_surface" DEFAULT 'window',
  	"lead" "enum__windows_v_blocks_list_lead" DEFAULT 'none',
  	"rows" "enum__windows_v_blocks_list_rows" DEFAULT 'plain',
  	"large" boolean,
  	"end_label" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  ALTER TABLE "windows_blocks_list_items" ADD CONSTRAINT "windows_blocks_list_items_picture_id_media_id_fk" FOREIGN KEY ("picture_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "windows_blocks_list_items" ADD CONSTRAINT "windows_blocks_list_items_window_id_windows_id_fk" FOREIGN KEY ("window_id") REFERENCES "public"."windows"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "windows_blocks_list_items" ADD CONSTRAINT "windows_blocks_list_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."windows_blocks_list"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "windows_blocks_list_foot" ADD CONSTRAINT "windows_blocks_list_foot_window_id_windows_id_fk" FOREIGN KEY ("window_id") REFERENCES "public"."windows"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "windows_blocks_list_foot" ADD CONSTRAINT "windows_blocks_list_foot_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "windows_blocks_list_foot" ADD CONSTRAINT "windows_blocks_list_foot_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."windows_blocks_list"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "windows_blocks_list" ADD CONSTRAINT "windows_blocks_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."windows"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_windows_v_blocks_list_items" ADD CONSTRAINT "_windows_v_blocks_list_items_picture_id_media_id_fk" FOREIGN KEY ("picture_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_windows_v_blocks_list_items" ADD CONSTRAINT "_windows_v_blocks_list_items_window_id_windows_id_fk" FOREIGN KEY ("window_id") REFERENCES "public"."windows"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_windows_v_blocks_list_items" ADD CONSTRAINT "_windows_v_blocks_list_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_windows_v_blocks_list"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_windows_v_blocks_list_foot" ADD CONSTRAINT "_windows_v_blocks_list_foot_window_id_windows_id_fk" FOREIGN KEY ("window_id") REFERENCES "public"."windows"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_windows_v_blocks_list_foot" ADD CONSTRAINT "_windows_v_blocks_list_foot_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_windows_v_blocks_list_foot" ADD CONSTRAINT "_windows_v_blocks_list_foot_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_windows_v_blocks_list"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_windows_v_blocks_list" ADD CONSTRAINT "_windows_v_blocks_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_windows_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "windows_blocks_list_items_order_idx" ON "windows_blocks_list_items" USING btree ("_order");
  CREATE INDEX "windows_blocks_list_items_parent_id_idx" ON "windows_blocks_list_items" USING btree ("_parent_id");
  CREATE INDEX "windows_blocks_list_items_locale_idx" ON "windows_blocks_list_items" USING btree ("_locale");
  CREATE INDEX "windows_blocks_list_items_picture_idx" ON "windows_blocks_list_items" USING btree ("picture_id");
  CREATE INDEX "windows_blocks_list_items_window_idx" ON "windows_blocks_list_items" USING btree ("window_id");
  CREATE INDEX "windows_blocks_list_foot_order_idx" ON "windows_blocks_list_foot" USING btree ("_order");
  CREATE INDEX "windows_blocks_list_foot_parent_id_idx" ON "windows_blocks_list_foot" USING btree ("_parent_id");
  CREATE INDEX "windows_blocks_list_foot_locale_idx" ON "windows_blocks_list_foot" USING btree ("_locale");
  CREATE INDEX "windows_blocks_list_foot_window_idx" ON "windows_blocks_list_foot" USING btree ("window_id");
  CREATE INDEX "windows_blocks_list_foot_media_idx" ON "windows_blocks_list_foot" USING btree ("media_id");
  CREATE INDEX "windows_blocks_list_order_idx" ON "windows_blocks_list" USING btree ("_order");
  CREATE INDEX "windows_blocks_list_parent_id_idx" ON "windows_blocks_list" USING btree ("_parent_id");
  CREATE INDEX "windows_blocks_list_path_idx" ON "windows_blocks_list" USING btree ("_path");
  CREATE INDEX "windows_blocks_list_locale_idx" ON "windows_blocks_list" USING btree ("_locale");
  CREATE INDEX "_windows_v_blocks_list_items_order_idx" ON "_windows_v_blocks_list_items" USING btree ("_order");
  CREATE INDEX "_windows_v_blocks_list_items_parent_id_idx" ON "_windows_v_blocks_list_items" USING btree ("_parent_id");
  CREATE INDEX "_windows_v_blocks_list_items_locale_idx" ON "_windows_v_blocks_list_items" USING btree ("_locale");
  CREATE INDEX "_windows_v_blocks_list_items_picture_idx" ON "_windows_v_blocks_list_items" USING btree ("picture_id");
  CREATE INDEX "_windows_v_blocks_list_items_window_idx" ON "_windows_v_blocks_list_items" USING btree ("window_id");
  CREATE INDEX "_windows_v_blocks_list_foot_order_idx" ON "_windows_v_blocks_list_foot" USING btree ("_order");
  CREATE INDEX "_windows_v_blocks_list_foot_parent_id_idx" ON "_windows_v_blocks_list_foot" USING btree ("_parent_id");
  CREATE INDEX "_windows_v_blocks_list_foot_locale_idx" ON "_windows_v_blocks_list_foot" USING btree ("_locale");
  CREATE INDEX "_windows_v_blocks_list_foot_window_idx" ON "_windows_v_blocks_list_foot" USING btree ("window_id");
  CREATE INDEX "_windows_v_blocks_list_foot_media_idx" ON "_windows_v_blocks_list_foot" USING btree ("media_id");
  CREATE INDEX "_windows_v_blocks_list_order_idx" ON "_windows_v_blocks_list" USING btree ("_order");
  CREATE INDEX "_windows_v_blocks_list_parent_id_idx" ON "_windows_v_blocks_list" USING btree ("_parent_id");
  CREATE INDEX "_windows_v_blocks_list_path_idx" ON "_windows_v_blocks_list" USING btree ("_path");
  CREATE INDEX "_windows_v_blocks_list_locale_idx" ON "_windows_v_blocks_list" USING btree ("_locale");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "windows_blocks_list_items" CASCADE;
  DROP TABLE "windows_blocks_list_foot" CASCADE;
  DROP TABLE "windows_blocks_list" CASCADE;
  DROP TABLE "_windows_v_blocks_list_items" CASCADE;
  DROP TABLE "_windows_v_blocks_list_foot" CASCADE;
  DROP TABLE "_windows_v_blocks_list" CASCADE;
  DROP TYPE "public"."enum_windows_blocks_list_items_icon";
  DROP TYPE "public"."enum_windows_blocks_list_foot_type";
  DROP TYPE "public"."enum_windows_blocks_list_surface";
  DROP TYPE "public"."enum_windows_blocks_list_lead";
  DROP TYPE "public"."enum_windows_blocks_list_rows";
  DROP TYPE "public"."enum__windows_v_blocks_list_items_icon";
  DROP TYPE "public"."enum__windows_v_blocks_list_foot_type";
  DROP TYPE "public"."enum__windows_v_blocks_list_surface";
  DROP TYPE "public"."enum__windows_v_blocks_list_lead";
  DROP TYPE "public"."enum__windows_v_blocks_list_rows";`)
}
