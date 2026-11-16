import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Only adds: the tables of authorship and of Media's versions stay until a migration that only removes.
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_windows_actions_type" AS ENUM('window', 'media', 'address');
  CREATE TYPE "public"."enum_windows_aside_actions_type" AS ENUM('window', 'media', 'address');
  CREATE TYPE "public"."enum_windows_tile" AS ENUM('orange', 'blue', 'mint', 'paper', 'raised');
  CREATE TYPE "public"."enum_windows_icon" AS ENUM('arrow-right', 'arrow-left', 'arrow-up-right', 'arrow-down', 'chevron-right', 'chevron-down', 'close', 'check', 'plus', 'minus', 'search', 'menu', 'more', 'grid', 'window', 'folder', 'file', 'image', 'play', 'mail', 'phone', 'link', 'download', 'upload', 'calendar', 'clock', 'globe', 'sun', 'moon', 'lock', 'info', 'user', 'sliders', 'home', 'power', 'trash', 'copy', 'text', 'chart', 'target', 'contrast', 'keyboard', 'expand', 'star', 'ab', 'eye-off');
  CREATE TYPE "public"."enum_windows_aside_type" AS ENUM('none', 'contents', 'record');
  CREATE TYPE "public"."enum_windows_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__windows_v_version_actions_type" AS ENUM('window', 'media', 'address');
  CREATE TYPE "public"."enum__windows_v_version_aside_actions_type" AS ENUM('window', 'media', 'address');
  CREATE TYPE "public"."enum__windows_v_version_tile" AS ENUM('orange', 'blue', 'mint', 'paper', 'raised');
  CREATE TYPE "public"."enum__windows_v_version_icon" AS ENUM('arrow-right', 'arrow-left', 'arrow-up-right', 'arrow-down', 'chevron-right', 'chevron-down', 'close', 'check', 'plus', 'minus', 'search', 'menu', 'more', 'grid', 'window', 'folder', 'file', 'image', 'play', 'mail', 'phone', 'link', 'download', 'upload', 'calendar', 'clock', 'globe', 'sun', 'moon', 'lock', 'info', 'user', 'sliders', 'home', 'power', 'trash', 'copy', 'text', 'chart', 'target', 'contrast', 'keyboard', 'expand', 'star', 'ab', 'eye-off');
  CREATE TYPE "public"."enum__windows_v_published_locale" AS ENUM('en', 'de');
  CREATE TYPE "public"."enum__windows_v_version_aside_type" AS ENUM('none', 'contents', 'record');
  CREATE TYPE "public"."enum__windows_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_media_live" AS ENUM('not-found', 'postmark', 'portrait');
  CREATE TYPE "public"."enum_users_role" AS ENUM('admin', 'content');
  CREATE TYPE "public"."enum_site_timezone" AS ENUM('Pacific/Midway', 'Pacific/Niue', 'Pacific/Honolulu', 'Pacific/Rarotonga', 'America/Anchorage', 'Pacific/Gambier', 'America/Los_Angeles', 'America/Tijuana', 'America/Denver', 'America/Phoenix', 'America/Chicago', 'America/Guatemala', 'America/New_York', 'America/Bogota', 'America/Caracas', 'America/Santiago', 'America/Buenos_Aires', 'America/Sao_Paulo', 'Atlantic/South_Georgia', 'Atlantic/Azores', 'Atlantic/Cape_Verde', 'Europe/London', 'Europe/Berlin', 'Africa/Lagos', 'Europe/Athens', 'Africa/Cairo', 'Europe/Moscow', 'Asia/Riyadh', 'Asia/Dubai', 'Asia/Baku', 'Asia/Karachi', 'Asia/Tashkent', 'Asia/Calcutta', 'Asia/Dhaka', 'Asia/Almaty', 'Asia/Jakarta', 'Asia/Bangkok', 'Asia/Shanghai', 'Asia/Singapore', 'Asia/Tokyo', 'Asia/Seoul', 'Australia/Brisbane', 'Australia/Sydney', 'Pacific/Guam', 'Pacific/Noumea', 'Pacific/Auckland', 'Pacific/Fiji');
  ALTER TYPE "public"."_locales" ADD VALUE 'de';
  CREATE TABLE "windows_actions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"type" "enum_windows_actions_type" DEFAULT 'window',
  	"window_id" integer,
  	"media_id" integer,
  	"url" varchar,
  	"label" varchar
  );
  
  CREATE TABLE "windows_aside_facts" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"value" varchar
  );
  
  CREATE TABLE "windows_aside_actions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"type" "enum_windows_aside_actions_type" DEFAULT 'window',
  	"window_id" integer,
  	"media_id" integer,
  	"url" varchar,
  	"label" varchar
  );
  
  CREATE TABLE "windows_facts" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"value" varchar
  );
  
  CREATE TABLE "windows" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"_order" varchar,
  	"paper" boolean,
  	"stamp" varchar,
  	"width" numeric,
  	"height" numeric,
  	"one_size" boolean,
  	"open_at_start" boolean,
  	"tile" "enum_windows_tile",
  	"icon" "enum_windows_icon",
  	"key" varchar,
  	"cover_id" integer,
  	"slug" varchar,
  	"parent_id" integer,
  	"kind" varchar,
  	"hidden" boolean,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "windows_locales" (
  	"title" varchar,
  	"aside_type" "enum_windows_aside_type" DEFAULT 'none',
  	"description" varchar,
  	"caption" varchar,
  	"headline" varchar,
  	"note" varchar,
  	"_status" "enum_windows_status" DEFAULT 'draft',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "windows_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"windows_id" integer
  );
  
  CREATE TABLE "_windows_v_version_actions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"type" "enum__windows_v_version_actions_type" DEFAULT 'window',
  	"window_id" integer,
  	"media_id" integer,
  	"url" varchar,
  	"label" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_windows_v_version_aside_facts" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"value" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_windows_v_version_aside_actions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"type" "enum__windows_v_version_aside_actions_type" DEFAULT 'window',
  	"window_id" integer,
  	"media_id" integer,
  	"url" varchar,
  	"label" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_windows_v_version_facts" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"value" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_windows_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version__order" varchar,
  	"version_paper" boolean,
  	"version_stamp" varchar,
  	"version_width" numeric,
  	"version_height" numeric,
  	"version_one_size" boolean,
  	"version_open_at_start" boolean,
  	"version_tile" "enum__windows_v_version_tile",
  	"version_icon" "enum__windows_v_version_icon",
  	"version_key" varchar,
  	"version_cover_id" integer,
  	"version_slug" varchar,
  	"version_parent_id" integer,
  	"version_kind" varchar,
  	"version_hidden" boolean,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"published_locale" "enum__windows_v_published_locale",
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_windows_v_locales" (
  	"version_title" varchar,
  	"version_aside_type" "enum__windows_v_version_aside_type" DEFAULT 'none',
  	"version_description" varchar,
  	"version_caption" varchar,
  	"version_headline" varchar,
  	"version_note" varchar,
  	"version__status" "enum__windows_v_version_status" DEFAULT 'draft',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_windows_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"windows_id" integer
  );
  
  CREATE TABLE "site_boot" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"value" varchar NOT NULL,
  	"status" varchar NOT NULL
  );
  
  CREATE TABLE "site_about" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"value" varchar NOT NULL
  );
  
  CREATE TABLE "site" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"email" varchar NOT NULL,
  	"place" varchar NOT NULL,
  	"timezone" "enum_site_timezone" NOT NULL,
  	"counted_id" integer,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "users" ADD COLUMN "role" "enum_users_role" DEFAULT 'content' NOT NULL;
  ALTER TABLE "media" ADD COLUMN "live" "enum_media_live";
  ALTER TABLE "media" ADD COLUMN "prefix" varchar DEFAULT '';
  ALTER TABLE "media" ADD COLUMN "_objectkey" varchar;
  ALTER TABLE "media" ADD COLUMN "variants_tiny_url" varchar;
  ALTER TABLE "media" ADD COLUMN "variants_tiny_width" numeric;
  ALTER TABLE "media" ADD COLUMN "variants_tiny_height" numeric;
  ALTER TABLE "media" ADD COLUMN "variants_tiny_mime_type" varchar;
  ALTER TABLE "media" ADD COLUMN "variants_tiny_filesize" numeric;
  ALTER TABLE "media" ADD COLUMN "variants_tiny_filename" varchar;
  ALTER TABLE "media" ADD COLUMN "variants_tiny_prefix" varchar;
  ALTER TABLE "media" ADD COLUMN "variants_tiny__objectkey" varchar;
  ALTER TABLE "media" ADD COLUMN "variants_tiny__stored" boolean;
  ALTER TABLE "media" ADD COLUMN "variants_share_url" varchar;
  ALTER TABLE "media" ADD COLUMN "variants_share_width" numeric;
  ALTER TABLE "media" ADD COLUMN "variants_share_height" numeric;
  ALTER TABLE "media" ADD COLUMN "variants_share_mime_type" varchar;
  ALTER TABLE "media" ADD COLUMN "variants_share_filesize" numeric;
  ALTER TABLE "media" ADD COLUMN "variants_share_filename" varchar;
  ALTER TABLE "media" ADD COLUMN "variants_share_prefix" varchar;
  ALTER TABLE "media" ADD COLUMN "variants_share__objectkey" varchar;
  ALTER TABLE "media" ADD COLUMN "variants_share__stored" boolean;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "windows_id" integer;
  ALTER TABLE "windows_actions" ADD CONSTRAINT "windows_actions_window_id_windows_id_fk" FOREIGN KEY ("window_id") REFERENCES "public"."windows"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "windows_actions" ADD CONSTRAINT "windows_actions_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "windows_actions" ADD CONSTRAINT "windows_actions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."windows"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "windows_aside_facts" ADD CONSTRAINT "windows_aside_facts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."windows"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "windows_aside_actions" ADD CONSTRAINT "windows_aside_actions_window_id_windows_id_fk" FOREIGN KEY ("window_id") REFERENCES "public"."windows"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "windows_aside_actions" ADD CONSTRAINT "windows_aside_actions_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "windows_aside_actions" ADD CONSTRAINT "windows_aside_actions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."windows"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "windows_facts" ADD CONSTRAINT "windows_facts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."windows"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "windows" ADD CONSTRAINT "windows_cover_id_media_id_fk" FOREIGN KEY ("cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "windows" ADD CONSTRAINT "windows_parent_id_windows_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."windows"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "windows_locales" ADD CONSTRAINT "windows_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."windows"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "windows_rels" ADD CONSTRAINT "windows_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."windows"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "windows_rels" ADD CONSTRAINT "windows_rels_windows_fk" FOREIGN KEY ("windows_id") REFERENCES "public"."windows"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_windows_v_version_actions" ADD CONSTRAINT "_windows_v_version_actions_window_id_windows_id_fk" FOREIGN KEY ("window_id") REFERENCES "public"."windows"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_windows_v_version_actions" ADD CONSTRAINT "_windows_v_version_actions_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_windows_v_version_actions" ADD CONSTRAINT "_windows_v_version_actions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_windows_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_windows_v_version_aside_facts" ADD CONSTRAINT "_windows_v_version_aside_facts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_windows_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_windows_v_version_aside_actions" ADD CONSTRAINT "_windows_v_version_aside_actions_window_id_windows_id_fk" FOREIGN KEY ("window_id") REFERENCES "public"."windows"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_windows_v_version_aside_actions" ADD CONSTRAINT "_windows_v_version_aside_actions_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_windows_v_version_aside_actions" ADD CONSTRAINT "_windows_v_version_aside_actions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_windows_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_windows_v_version_facts" ADD CONSTRAINT "_windows_v_version_facts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_windows_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_windows_v" ADD CONSTRAINT "_windows_v_parent_id_windows_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."windows"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_windows_v" ADD CONSTRAINT "_windows_v_version_cover_id_media_id_fk" FOREIGN KEY ("version_cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_windows_v" ADD CONSTRAINT "_windows_v_version_parent_id_windows_id_fk" FOREIGN KEY ("version_parent_id") REFERENCES "public"."windows"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_windows_v_locales" ADD CONSTRAINT "_windows_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_windows_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_windows_v_rels" ADD CONSTRAINT "_windows_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_windows_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_windows_v_rels" ADD CONSTRAINT "_windows_v_rels_windows_fk" FOREIGN KEY ("windows_id") REFERENCES "public"."windows"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_boot" ADD CONSTRAINT "site_boot_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_about" ADD CONSTRAINT "site_about_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site" ADD CONSTRAINT "site_counted_id_windows_id_fk" FOREIGN KEY ("counted_id") REFERENCES "public"."windows"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "windows_actions_order_idx" ON "windows_actions" USING btree ("_order");
  CREATE INDEX "windows_actions_parent_id_idx" ON "windows_actions" USING btree ("_parent_id");
  CREATE INDEX "windows_actions_locale_idx" ON "windows_actions" USING btree ("_locale");
  CREATE INDEX "windows_actions_window_idx" ON "windows_actions" USING btree ("window_id");
  CREATE INDEX "windows_actions_media_idx" ON "windows_actions" USING btree ("media_id");
  CREATE INDEX "windows_aside_facts_order_idx" ON "windows_aside_facts" USING btree ("_order");
  CREATE INDEX "windows_aside_facts_parent_id_idx" ON "windows_aside_facts" USING btree ("_parent_id");
  CREATE INDEX "windows_aside_facts_locale_idx" ON "windows_aside_facts" USING btree ("_locale");
  CREATE INDEX "windows_aside_actions_order_idx" ON "windows_aside_actions" USING btree ("_order");
  CREATE INDEX "windows_aside_actions_parent_id_idx" ON "windows_aside_actions" USING btree ("_parent_id");
  CREATE INDEX "windows_aside_actions_locale_idx" ON "windows_aside_actions" USING btree ("_locale");
  CREATE INDEX "windows_aside_actions_window_idx" ON "windows_aside_actions" USING btree ("window_id");
  CREATE INDEX "windows_aside_actions_media_idx" ON "windows_aside_actions" USING btree ("media_id");
  CREATE INDEX "windows_facts_order_idx" ON "windows_facts" USING btree ("_order");
  CREATE INDEX "windows_facts_parent_id_idx" ON "windows_facts" USING btree ("_parent_id");
  CREATE INDEX "windows_facts_locale_idx" ON "windows_facts" USING btree ("_locale");
  CREATE INDEX "windows__order_idx" ON "windows" USING btree ("_order");
  CREATE INDEX "windows_cover_idx" ON "windows" USING btree ("cover_id");
  CREATE UNIQUE INDEX "windows_slug_idx" ON "windows" USING btree ("slug");
  CREATE INDEX "windows_parent_idx" ON "windows" USING btree ("parent_id");
  CREATE INDEX "windows_updated_at_idx" ON "windows" USING btree ("updated_at");
  CREATE INDEX "windows_created_at_idx" ON "windows" USING btree ("created_at");
  CREATE INDEX "windows__status_idx" ON "windows_locales" USING btree ("_status","_locale");
  CREATE UNIQUE INDEX "windows_locales_parent_id_locale_unique" ON "windows_locales" USING btree ("_parent_id","_locale");
  CREATE INDEX "windows_rels_order_idx" ON "windows_rels" USING btree ("order");
  CREATE INDEX "windows_rels_parent_idx" ON "windows_rels" USING btree ("parent_id");
  CREATE INDEX "windows_rels_path_idx" ON "windows_rels" USING btree ("path");
  CREATE INDEX "windows_rels_windows_id_idx" ON "windows_rels" USING btree ("windows_id");
  CREATE INDEX "_windows_v_version_actions_order_idx" ON "_windows_v_version_actions" USING btree ("_order");
  CREATE INDEX "_windows_v_version_actions_parent_id_idx" ON "_windows_v_version_actions" USING btree ("_parent_id");
  CREATE INDEX "_windows_v_version_actions_locale_idx" ON "_windows_v_version_actions" USING btree ("_locale");
  CREATE INDEX "_windows_v_version_actions_window_idx" ON "_windows_v_version_actions" USING btree ("window_id");
  CREATE INDEX "_windows_v_version_actions_media_idx" ON "_windows_v_version_actions" USING btree ("media_id");
  CREATE INDEX "_windows_v_version_aside_facts_order_idx" ON "_windows_v_version_aside_facts" USING btree ("_order");
  CREATE INDEX "_windows_v_version_aside_facts_parent_id_idx" ON "_windows_v_version_aside_facts" USING btree ("_parent_id");
  CREATE INDEX "_windows_v_version_aside_facts_locale_idx" ON "_windows_v_version_aside_facts" USING btree ("_locale");
  CREATE INDEX "_windows_v_version_aside_actions_order_idx" ON "_windows_v_version_aside_actions" USING btree ("_order");
  CREATE INDEX "_windows_v_version_aside_actions_parent_id_idx" ON "_windows_v_version_aside_actions" USING btree ("_parent_id");
  CREATE INDEX "_windows_v_version_aside_actions_locale_idx" ON "_windows_v_version_aside_actions" USING btree ("_locale");
  CREATE INDEX "_windows_v_version_aside_actions_window_idx" ON "_windows_v_version_aside_actions" USING btree ("window_id");
  CREATE INDEX "_windows_v_version_aside_actions_media_idx" ON "_windows_v_version_aside_actions" USING btree ("media_id");
  CREATE INDEX "_windows_v_version_facts_order_idx" ON "_windows_v_version_facts" USING btree ("_order");
  CREATE INDEX "_windows_v_version_facts_parent_id_idx" ON "_windows_v_version_facts" USING btree ("_parent_id");
  CREATE INDEX "_windows_v_version_facts_locale_idx" ON "_windows_v_version_facts" USING btree ("_locale");
  CREATE INDEX "_windows_v_parent_idx" ON "_windows_v" USING btree ("parent_id");
  CREATE INDEX "_windows_v_version_version__order_idx" ON "_windows_v" USING btree ("version__order");
  CREATE INDEX "_windows_v_version_version_cover_idx" ON "_windows_v" USING btree ("version_cover_id");
  CREATE INDEX "_windows_v_version_version_slug_idx" ON "_windows_v" USING btree ("version_slug");
  CREATE INDEX "_windows_v_version_version_parent_idx" ON "_windows_v" USING btree ("version_parent_id");
  CREATE INDEX "_windows_v_version_version_updated_at_idx" ON "_windows_v" USING btree ("version_updated_at");
  CREATE INDEX "_windows_v_version_version_created_at_idx" ON "_windows_v" USING btree ("version_created_at");
  CREATE INDEX "_windows_v_created_at_idx" ON "_windows_v" USING btree ("created_at");
  CREATE INDEX "_windows_v_updated_at_idx" ON "_windows_v" USING btree ("updated_at");
  CREATE INDEX "_windows_v_published_locale_idx" ON "_windows_v" USING btree ("published_locale");
  CREATE INDEX "_windows_v_latest_idx" ON "_windows_v" USING btree ("latest");
  CREATE INDEX "_windows_v_autosave_idx" ON "_windows_v" USING btree ("autosave");
  CREATE INDEX "_windows_v_version_version__status_idx" ON "_windows_v_locales" USING btree ("version__status","_locale");
  CREATE UNIQUE INDEX "_windows_v_locales_parent_id_locale_unique" ON "_windows_v_locales" USING btree ("_parent_id","_locale");
  CREATE INDEX "_windows_v_rels_order_idx" ON "_windows_v_rels" USING btree ("order");
  CREATE INDEX "_windows_v_rels_parent_idx" ON "_windows_v_rels" USING btree ("parent_id");
  CREATE INDEX "_windows_v_rels_path_idx" ON "_windows_v_rels" USING btree ("path");
  CREATE INDEX "_windows_v_rels_windows_id_idx" ON "_windows_v_rels" USING btree ("windows_id");
  CREATE INDEX "site_boot_order_idx" ON "site_boot" USING btree ("_order");
  CREATE INDEX "site_boot_parent_id_idx" ON "site_boot" USING btree ("_parent_id");
  CREATE INDEX "site_boot_locale_idx" ON "site_boot" USING btree ("_locale");
  CREATE INDEX "site_about_order_idx" ON "site_about" USING btree ("_order");
  CREATE INDEX "site_about_parent_id_idx" ON "site_about" USING btree ("_parent_id");
  CREATE INDEX "site_about_locale_idx" ON "site_about" USING btree ("_locale");
  CREATE INDEX "site_counted_idx" ON "site" USING btree ("counted_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_windows_fk" FOREIGN KEY ("windows_id") REFERENCES "public"."windows"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "media_variants_tiny_variants_tiny_filename_idx" ON "media" USING btree ("variants_tiny_filename");
  CREATE INDEX "media_variants_share_variants_share_filename_idx" ON "media" USING btree ("variants_share_filename");
  CREATE INDEX "payload_locked_documents_rels_windows_id_idx" ON "payload_locked_documents_rels" USING btree ("windows_id");`)
  // Everyone who could sign in before the roles was an admin.
  await db.execute(sql`UPDATE "users" SET "role" = 'admin'`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`

  ALTER TABLE "windows_actions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "windows_aside_facts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "windows_aside_actions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "windows_facts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "windows" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "windows_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "windows_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_windows_v_version_actions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_windows_v_version_aside_facts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_windows_v_version_aside_actions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_windows_v_version_facts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_windows_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_windows_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_windows_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "site_boot" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "site_about" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "site" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "windows_actions" CASCADE;
  DROP TABLE "windows_aside_facts" CASCADE;
  DROP TABLE "windows_aside_actions" CASCADE;
  DROP TABLE "windows_facts" CASCADE;
  DROP TABLE "windows" CASCADE;
  DROP TABLE "windows_locales" CASCADE;
  DROP TABLE "windows_rels" CASCADE;
  DROP TABLE "_windows_v_version_actions" CASCADE;
  DROP TABLE "_windows_v_version_aside_facts" CASCADE;
  DROP TABLE "_windows_v_version_aside_actions" CASCADE;
  DROP TABLE "_windows_v_version_facts" CASCADE;
  DROP TABLE "_windows_v" CASCADE;
  DROP TABLE "_windows_v_locales" CASCADE;
  DROP TABLE "_windows_v_rels" CASCADE;
  DROP TABLE "site_boot" CASCADE;
  DROP TABLE "site_about" CASCADE;
  DROP TABLE "site" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_windows_fk";
  
  DROP TYPE "public"."_locales";
  CREATE TYPE "public"."_locales" AS ENUM('en');
  DROP INDEX "media_variants_tiny_variants_tiny_filename_idx";
  DROP INDEX "media_variants_share_variants_share_filename_idx";
  DROP INDEX "payload_locked_documents_rels_windows_id_idx";
  ALTER TABLE "media" DROP COLUMN "live";
  ALTER TABLE "media" DROP COLUMN "prefix";
  ALTER TABLE "media" DROP COLUMN "_objectkey";
  ALTER TABLE "media" DROP COLUMN "variants_tiny_url";
  ALTER TABLE "media" DROP COLUMN "variants_tiny_width";
  ALTER TABLE "media" DROP COLUMN "variants_tiny_height";
  ALTER TABLE "media" DROP COLUMN "variants_tiny_mime_type";
  ALTER TABLE "media" DROP COLUMN "variants_tiny_filesize";
  ALTER TABLE "media" DROP COLUMN "variants_tiny_filename";
  ALTER TABLE "media" DROP COLUMN "variants_tiny_prefix";
  ALTER TABLE "media" DROP COLUMN "variants_tiny__objectkey";
  ALTER TABLE "media" DROP COLUMN "variants_tiny__stored";
  ALTER TABLE "media" DROP COLUMN "variants_share_url";
  ALTER TABLE "media" DROP COLUMN "variants_share_width";
  ALTER TABLE "media" DROP COLUMN "variants_share_height";
  ALTER TABLE "media" DROP COLUMN "variants_share_mime_type";
  ALTER TABLE "media" DROP COLUMN "variants_share_filesize";
  ALTER TABLE "media" DROP COLUMN "variants_share_filename";
  ALTER TABLE "media" DROP COLUMN "variants_share_prefix";
  ALTER TABLE "media" DROP COLUMN "variants_share__objectkey";
  ALTER TABLE "media" DROP COLUMN "variants_share__stored";
  ALTER TABLE "users" DROP COLUMN "role";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "windows_id";
  DROP TYPE "public"."enum_windows_actions_type";
  DROP TYPE "public"."enum_windows_aside_actions_type";
  DROP TYPE "public"."enum_windows_tile";
  DROP TYPE "public"."enum_windows_icon";
  DROP TYPE "public"."enum_windows_aside_type";
  DROP TYPE "public"."enum_windows_status";
  DROP TYPE "public"."enum__windows_v_version_actions_type";
  DROP TYPE "public"."enum__windows_v_version_aside_actions_type";
  DROP TYPE "public"."enum__windows_v_version_tile";
  DROP TYPE "public"."enum__windows_v_version_icon";
  DROP TYPE "public"."enum__windows_v_published_locale";
  DROP TYPE "public"."enum__windows_v_version_aside_type";
  DROP TYPE "public"."enum__windows_v_version_status";
  DROP TYPE "public"."enum_media_live";
  DROP TYPE "public"."enum_users_role";
  DROP TYPE "public"."enum_site_timezone";`)
}
