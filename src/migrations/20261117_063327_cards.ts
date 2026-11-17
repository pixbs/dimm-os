import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_windows_blocks_cards_items_actions_type" AS ENUM('window', 'media', 'address');
  CREATE TYPE "public"."enum_windows_blocks_cards_items_surface" AS ENUM('raised', 'paper', 'orange', 'blue', 'mint');
  CREATE TYPE "public"."enum_windows_blocks_cards_columns" AS ENUM('1', '2', '3');
  CREATE TYPE "public"."enum_windows_blocks_cards_surface" AS ENUM('window', 'paper', 'orange', 'blue', 'mint');
  CREATE TYPE "public"."enum__windows_v_blocks_cards_items_actions_type" AS ENUM('window', 'media', 'address');
  CREATE TYPE "public"."enum__windows_v_blocks_cards_items_surface" AS ENUM('raised', 'paper', 'orange', 'blue', 'mint');
  CREATE TYPE "public"."enum__windows_v_blocks_cards_columns" AS ENUM('1', '2', '3');
  CREATE TYPE "public"."enum__windows_v_blocks_cards_surface" AS ENUM('window', 'paper', 'orange', 'blue', 'mint');
  CREATE TABLE "windows_blocks_cards_items_actions" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"type" "enum_windows_blocks_cards_items_actions_type" DEFAULT 'window',
  	"window_id" integer,
  	"media_id" integer,
  	"url" varchar,
  	"label" varchar
  );
  
  CREATE TABLE "windows_blocks_cards_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"surface" "enum_windows_blocks_cards_items_surface" DEFAULT 'raised',
  	"text" varchar,
  	"picture_id" integer
  );
  
  CREATE TABLE "windows_blocks_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"tiles" boolean,
  	"columns" "enum_windows_blocks_cards_columns" DEFAULT '2',
  	"join" boolean,
  	"title" varchar,
  	"text" varchar,
  	"split" boolean DEFAULT true,
  	"surface" "enum_windows_blocks_cards_surface" DEFAULT 'window',
  	"block_name" varchar
  );
  
  CREATE TABLE "_windows_v_blocks_cards_items_actions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"type" "enum__windows_v_blocks_cards_items_actions_type" DEFAULT 'window',
  	"window_id" integer,
  	"media_id" integer,
  	"url" varchar,
  	"label" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_windows_v_blocks_cards_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"surface" "enum__windows_v_blocks_cards_items_surface" DEFAULT 'raised',
  	"text" varchar,
  	"picture_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_windows_v_blocks_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"tiles" boolean,
  	"columns" "enum__windows_v_blocks_cards_columns" DEFAULT '2',
  	"join" boolean,
  	"title" varchar,
  	"text" varchar,
  	"split" boolean DEFAULT true,
  	"surface" "enum__windows_v_blocks_cards_surface" DEFAULT 'window',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  ALTER TABLE "windows_blocks_cards_items_actions" ADD CONSTRAINT "windows_blocks_cards_items_actions_window_id_windows_id_fk" FOREIGN KEY ("window_id") REFERENCES "public"."windows"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "windows_blocks_cards_items_actions" ADD CONSTRAINT "windows_blocks_cards_items_actions_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "windows_blocks_cards_items_actions" ADD CONSTRAINT "windows_blocks_cards_items_actions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."windows_blocks_cards_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "windows_blocks_cards_items" ADD CONSTRAINT "windows_blocks_cards_items_picture_id_media_id_fk" FOREIGN KEY ("picture_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "windows_blocks_cards_items" ADD CONSTRAINT "windows_blocks_cards_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."windows_blocks_cards"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "windows_blocks_cards" ADD CONSTRAINT "windows_blocks_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."windows"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_windows_v_blocks_cards_items_actions" ADD CONSTRAINT "_windows_v_blocks_cards_items_actions_window_id_windows_id_fk" FOREIGN KEY ("window_id") REFERENCES "public"."windows"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_windows_v_blocks_cards_items_actions" ADD CONSTRAINT "_windows_v_blocks_cards_items_actions_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_windows_v_blocks_cards_items_actions" ADD CONSTRAINT "_windows_v_blocks_cards_items_actions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_windows_v_blocks_cards_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_windows_v_blocks_cards_items" ADD CONSTRAINT "_windows_v_blocks_cards_items_picture_id_media_id_fk" FOREIGN KEY ("picture_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_windows_v_blocks_cards_items" ADD CONSTRAINT "_windows_v_blocks_cards_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_windows_v_blocks_cards"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_windows_v_blocks_cards" ADD CONSTRAINT "_windows_v_blocks_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_windows_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "windows_blocks_cards_items_actions_order_idx" ON "windows_blocks_cards_items_actions" USING btree ("_order");
  CREATE INDEX "windows_blocks_cards_items_actions_parent_id_idx" ON "windows_blocks_cards_items_actions" USING btree ("_parent_id");
  CREATE INDEX "windows_blocks_cards_items_actions_locale_idx" ON "windows_blocks_cards_items_actions" USING btree ("_locale");
  CREATE INDEX "windows_blocks_cards_items_actions_window_idx" ON "windows_blocks_cards_items_actions" USING btree ("window_id");
  CREATE INDEX "windows_blocks_cards_items_actions_media_idx" ON "windows_blocks_cards_items_actions" USING btree ("media_id");
  CREATE INDEX "windows_blocks_cards_items_order_idx" ON "windows_blocks_cards_items" USING btree ("_order");
  CREATE INDEX "windows_blocks_cards_items_parent_id_idx" ON "windows_blocks_cards_items" USING btree ("_parent_id");
  CREATE INDEX "windows_blocks_cards_items_locale_idx" ON "windows_blocks_cards_items" USING btree ("_locale");
  CREATE INDEX "windows_blocks_cards_items_picture_idx" ON "windows_blocks_cards_items" USING btree ("picture_id");
  CREATE INDEX "windows_blocks_cards_order_idx" ON "windows_blocks_cards" USING btree ("_order");
  CREATE INDEX "windows_blocks_cards_parent_id_idx" ON "windows_blocks_cards" USING btree ("_parent_id");
  CREATE INDEX "windows_blocks_cards_path_idx" ON "windows_blocks_cards" USING btree ("_path");
  CREATE INDEX "windows_blocks_cards_locale_idx" ON "windows_blocks_cards" USING btree ("_locale");
  CREATE INDEX "_windows_v_blocks_cards_items_actions_order_idx" ON "_windows_v_blocks_cards_items_actions" USING btree ("_order");
  CREATE INDEX "_windows_v_blocks_cards_items_actions_parent_id_idx" ON "_windows_v_blocks_cards_items_actions" USING btree ("_parent_id");
  CREATE INDEX "_windows_v_blocks_cards_items_actions_locale_idx" ON "_windows_v_blocks_cards_items_actions" USING btree ("_locale");
  CREATE INDEX "_windows_v_blocks_cards_items_actions_window_idx" ON "_windows_v_blocks_cards_items_actions" USING btree ("window_id");
  CREATE INDEX "_windows_v_blocks_cards_items_actions_media_idx" ON "_windows_v_blocks_cards_items_actions" USING btree ("media_id");
  CREATE INDEX "_windows_v_blocks_cards_items_order_idx" ON "_windows_v_blocks_cards_items" USING btree ("_order");
  CREATE INDEX "_windows_v_blocks_cards_items_parent_id_idx" ON "_windows_v_blocks_cards_items" USING btree ("_parent_id");
  CREATE INDEX "_windows_v_blocks_cards_items_locale_idx" ON "_windows_v_blocks_cards_items" USING btree ("_locale");
  CREATE INDEX "_windows_v_blocks_cards_items_picture_idx" ON "_windows_v_blocks_cards_items" USING btree ("picture_id");
  CREATE INDEX "_windows_v_blocks_cards_order_idx" ON "_windows_v_blocks_cards" USING btree ("_order");
  CREATE INDEX "_windows_v_blocks_cards_parent_id_idx" ON "_windows_v_blocks_cards" USING btree ("_parent_id");
  CREATE INDEX "_windows_v_blocks_cards_path_idx" ON "_windows_v_blocks_cards" USING btree ("_path");
  CREATE INDEX "_windows_v_blocks_cards_locale_idx" ON "_windows_v_blocks_cards" USING btree ("_locale");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "windows_blocks_cards_items_actions" CASCADE;
  DROP TABLE "windows_blocks_cards_items" CASCADE;
  DROP TABLE "windows_blocks_cards" CASCADE;
  DROP TABLE "_windows_v_blocks_cards_items_actions" CASCADE;
  DROP TABLE "_windows_v_blocks_cards_items" CASCADE;
  DROP TABLE "_windows_v_blocks_cards" CASCADE;
  DROP TYPE "public"."enum_windows_blocks_cards_items_actions_type";
  DROP TYPE "public"."enum_windows_blocks_cards_items_surface";
  DROP TYPE "public"."enum_windows_blocks_cards_columns";
  DROP TYPE "public"."enum_windows_blocks_cards_surface";
  DROP TYPE "public"."enum__windows_v_blocks_cards_items_actions_type";
  DROP TYPE "public"."enum__windows_v_blocks_cards_items_surface";
  DROP TYPE "public"."enum__windows_v_blocks_cards_columns";
  DROP TYPE "public"."enum__windows_v_blocks_cards_surface";`)
}
