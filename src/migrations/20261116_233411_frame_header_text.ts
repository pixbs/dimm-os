import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_windows_blocks_header_actions_type" AS ENUM('window', 'media', 'address');
  CREATE TYPE "public"."enum_windows_blocks_header_level" AS ENUM('display', 'title', 'heading');
  CREATE TYPE "public"."enum_windows_blocks_header_surface" AS ENUM('window', 'paper', 'orange', 'blue', 'mint');
  CREATE TYPE "public"."enum__windows_v_blocks_header_actions_type" AS ENUM('window', 'media', 'address');
  CREATE TYPE "public"."enum__windows_v_blocks_header_level" AS ENUM('display', 'title', 'heading');
  CREATE TYPE "public"."enum__windows_v_blocks_header_surface" AS ENUM('window', 'paper', 'orange', 'blue', 'mint');
  CREATE TABLE "windows_blocks_header_actions" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"type" "enum_windows_blocks_header_actions_type" DEFAULT 'window',
  	"window_id" integer,
  	"media_id" integer,
  	"url" varchar,
  	"label" varchar
  );
  
  CREATE TABLE "windows_blocks_header" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"level" "enum_windows_blocks_header_level" DEFAULT 'title',
  	"surface" "enum_windows_blocks_header_surface" DEFAULT 'window',
  	"title" varchar,
  	"text" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "windows_blocks_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"join" boolean,
  	"title" varchar,
  	"text" varchar,
  	"split" boolean DEFAULT true,
  	"body" jsonb,
  	"block_name" varchar
  );
  
  CREATE TABLE "_windows_v_blocks_header_actions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"type" "enum__windows_v_blocks_header_actions_type" DEFAULT 'window',
  	"window_id" integer,
  	"media_id" integer,
  	"url" varchar,
  	"label" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_windows_v_blocks_header" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"level" "enum__windows_v_blocks_header_level" DEFAULT 'title',
  	"surface" "enum__windows_v_blocks_header_surface" DEFAULT 'window',
  	"title" varchar,
  	"text" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_windows_v_blocks_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"join" boolean,
  	"title" varchar,
  	"text" varchar,
  	"split" boolean DEFAULT true,
  	"body" jsonb,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  ALTER TABLE "windows_blocks_header_actions" ADD CONSTRAINT "windows_blocks_header_actions_window_id_windows_id_fk" FOREIGN KEY ("window_id") REFERENCES "public"."windows"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "windows_blocks_header_actions" ADD CONSTRAINT "windows_blocks_header_actions_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "windows_blocks_header_actions" ADD CONSTRAINT "windows_blocks_header_actions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."windows_blocks_header"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "windows_blocks_header" ADD CONSTRAINT "windows_blocks_header_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."windows"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "windows_blocks_text" ADD CONSTRAINT "windows_blocks_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."windows"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_windows_v_blocks_header_actions" ADD CONSTRAINT "_windows_v_blocks_header_actions_window_id_windows_id_fk" FOREIGN KEY ("window_id") REFERENCES "public"."windows"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_windows_v_blocks_header_actions" ADD CONSTRAINT "_windows_v_blocks_header_actions_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_windows_v_blocks_header_actions" ADD CONSTRAINT "_windows_v_blocks_header_actions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_windows_v_blocks_header"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_windows_v_blocks_header" ADD CONSTRAINT "_windows_v_blocks_header_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_windows_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_windows_v_blocks_text" ADD CONSTRAINT "_windows_v_blocks_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_windows_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "windows_blocks_header_actions_order_idx" ON "windows_blocks_header_actions" USING btree ("_order");
  CREATE INDEX "windows_blocks_header_actions_parent_id_idx" ON "windows_blocks_header_actions" USING btree ("_parent_id");
  CREATE INDEX "windows_blocks_header_actions_locale_idx" ON "windows_blocks_header_actions" USING btree ("_locale");
  CREATE INDEX "windows_blocks_header_actions_window_idx" ON "windows_blocks_header_actions" USING btree ("window_id");
  CREATE INDEX "windows_blocks_header_actions_media_idx" ON "windows_blocks_header_actions" USING btree ("media_id");
  CREATE INDEX "windows_blocks_header_order_idx" ON "windows_blocks_header" USING btree ("_order");
  CREATE INDEX "windows_blocks_header_parent_id_idx" ON "windows_blocks_header" USING btree ("_parent_id");
  CREATE INDEX "windows_blocks_header_path_idx" ON "windows_blocks_header" USING btree ("_path");
  CREATE INDEX "windows_blocks_header_locale_idx" ON "windows_blocks_header" USING btree ("_locale");
  CREATE INDEX "windows_blocks_text_order_idx" ON "windows_blocks_text" USING btree ("_order");
  CREATE INDEX "windows_blocks_text_parent_id_idx" ON "windows_blocks_text" USING btree ("_parent_id");
  CREATE INDEX "windows_blocks_text_path_idx" ON "windows_blocks_text" USING btree ("_path");
  CREATE INDEX "windows_blocks_text_locale_idx" ON "windows_blocks_text" USING btree ("_locale");
  CREATE INDEX "_windows_v_blocks_header_actions_order_idx" ON "_windows_v_blocks_header_actions" USING btree ("_order");
  CREATE INDEX "_windows_v_blocks_header_actions_parent_id_idx" ON "_windows_v_blocks_header_actions" USING btree ("_parent_id");
  CREATE INDEX "_windows_v_blocks_header_actions_locale_idx" ON "_windows_v_blocks_header_actions" USING btree ("_locale");
  CREATE INDEX "_windows_v_blocks_header_actions_window_idx" ON "_windows_v_blocks_header_actions" USING btree ("window_id");
  CREATE INDEX "_windows_v_blocks_header_actions_media_idx" ON "_windows_v_blocks_header_actions" USING btree ("media_id");
  CREATE INDEX "_windows_v_blocks_header_order_idx" ON "_windows_v_blocks_header" USING btree ("_order");
  CREATE INDEX "_windows_v_blocks_header_parent_id_idx" ON "_windows_v_blocks_header" USING btree ("_parent_id");
  CREATE INDEX "_windows_v_blocks_header_path_idx" ON "_windows_v_blocks_header" USING btree ("_path");
  CREATE INDEX "_windows_v_blocks_header_locale_idx" ON "_windows_v_blocks_header" USING btree ("_locale");
  CREATE INDEX "_windows_v_blocks_text_order_idx" ON "_windows_v_blocks_text" USING btree ("_order");
  CREATE INDEX "_windows_v_blocks_text_parent_id_idx" ON "_windows_v_blocks_text" USING btree ("_parent_id");
  CREATE INDEX "_windows_v_blocks_text_path_idx" ON "_windows_v_blocks_text" USING btree ("_path");
  CREATE INDEX "_windows_v_blocks_text_locale_idx" ON "_windows_v_blocks_text" USING btree ("_locale");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "windows_blocks_header_actions" CASCADE;
  DROP TABLE "windows_blocks_header" CASCADE;
  DROP TABLE "windows_blocks_text" CASCADE;
  DROP TABLE "_windows_v_blocks_header_actions" CASCADE;
  DROP TABLE "_windows_v_blocks_header" CASCADE;
  DROP TABLE "_windows_v_blocks_text" CASCADE;
  DROP TYPE "public"."enum_windows_blocks_header_actions_type";
  DROP TYPE "public"."enum_windows_blocks_header_level";
  DROP TYPE "public"."enum_windows_blocks_header_surface";
  DROP TYPE "public"."enum__windows_v_blocks_header_actions_type";
  DROP TYPE "public"."enum__windows_v_blocks_header_level";
  DROP TYPE "public"."enum__windows_v_blocks_header_surface";`)
}
