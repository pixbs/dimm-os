import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_windows_blocks_stats_surface" AS ENUM('window', 'paper', 'orange', 'blue', 'mint');
  CREATE TYPE "public"."enum_windows_blocks_quote_surface" AS ENUM('window', 'paper', 'orange', 'blue', 'mint');
  CREATE TYPE "public"."enum_windows_blocks_facts_surface" AS ENUM('window', 'paper', 'orange', 'blue', 'mint');
  CREATE TYPE "public"."enum_windows_blocks_table_surface" AS ENUM('window', 'paper', 'orange', 'blue', 'mint');
  CREATE TYPE "public"."enum__windows_v_blocks_stats_surface" AS ENUM('window', 'paper', 'orange', 'blue', 'mint');
  CREATE TYPE "public"."enum__windows_v_blocks_quote_surface" AS ENUM('window', 'paper', 'orange', 'blue', 'mint');
  CREATE TYPE "public"."enum__windows_v_blocks_facts_surface" AS ENUM('window', 'paper', 'orange', 'blue', 'mint');
  CREATE TYPE "public"."enum__windows_v_blocks_table_surface" AS ENUM('window', 'paper', 'orange', 'blue', 'mint');
  CREATE TABLE "windows_blocks_stats_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"label" varchar
  );
  
  CREATE TABLE "windows_blocks_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"join" boolean,
  	"title" varchar,
  	"text" varchar,
  	"split" boolean DEFAULT true,
  	"surface" "enum_windows_blocks_stats_surface" DEFAULT 'window',
  	"block_name" varchar
  );
  
  CREATE TABLE "windows_blocks_quote" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"surface" "enum_windows_blocks_quote_surface" DEFAULT 'window',
  	"text" varchar,
  	"name" varchar,
  	"role" varchar,
  	"avatar_id" integer,
  	"block_name" varchar
  );
  
  CREATE TABLE "windows_blocks_facts_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"value" varchar
  );
  
  CREATE TABLE "windows_blocks_facts" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"join" boolean,
  	"title" varchar,
  	"text" varchar,
  	"split" boolean DEFAULT true,
  	"surface" "enum_windows_blocks_facts_surface" DEFAULT 'window',
  	"block_name" varchar
  );
  
  CREATE TABLE "windows_blocks_table_columns" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar
  );
  
  CREATE TABLE "windows_blocks_table_rows" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"first" varchar,
  	"second" varchar,
  	"third" varchar
  );
  
  CREATE TABLE "windows_blocks_table" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"join" boolean,
  	"title" varchar,
  	"text" varchar,
  	"surface" "enum_windows_blocks_table_surface" DEFAULT 'window',
  	"block_name" varchar
  );
  
  CREATE TABLE "_windows_v_blocks_stats_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"label" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_windows_v_blocks_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"join" boolean,
  	"title" varchar,
  	"text" varchar,
  	"split" boolean DEFAULT true,
  	"surface" "enum__windows_v_blocks_stats_surface" DEFAULT 'window',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_windows_v_blocks_quote" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"surface" "enum__windows_v_blocks_quote_surface" DEFAULT 'window',
  	"text" varchar,
  	"name" varchar,
  	"role" varchar,
  	"avatar_id" integer,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_windows_v_blocks_facts_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"value" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_windows_v_blocks_facts" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"join" boolean,
  	"title" varchar,
  	"text" varchar,
  	"split" boolean DEFAULT true,
  	"surface" "enum__windows_v_blocks_facts_surface" DEFAULT 'window',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_windows_v_blocks_table_columns" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_windows_v_blocks_table_rows" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"first" varchar,
  	"second" varchar,
  	"third" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_windows_v_blocks_table" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"join" boolean,
  	"title" varchar,
  	"text" varchar,
  	"surface" "enum__windows_v_blocks_table_surface" DEFAULT 'window',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  ALTER TABLE "windows_blocks_stats_items" ADD CONSTRAINT "windows_blocks_stats_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."windows_blocks_stats"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "windows_blocks_stats" ADD CONSTRAINT "windows_blocks_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."windows"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "windows_blocks_quote" ADD CONSTRAINT "windows_blocks_quote_avatar_id_media_id_fk" FOREIGN KEY ("avatar_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "windows_blocks_quote" ADD CONSTRAINT "windows_blocks_quote_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."windows"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "windows_blocks_facts_items" ADD CONSTRAINT "windows_blocks_facts_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."windows_blocks_facts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "windows_blocks_facts" ADD CONSTRAINT "windows_blocks_facts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."windows"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "windows_blocks_table_columns" ADD CONSTRAINT "windows_blocks_table_columns_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."windows_blocks_table"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "windows_blocks_table_rows" ADD CONSTRAINT "windows_blocks_table_rows_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."windows_blocks_table"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "windows_blocks_table" ADD CONSTRAINT "windows_blocks_table_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."windows"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_windows_v_blocks_stats_items" ADD CONSTRAINT "_windows_v_blocks_stats_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_windows_v_blocks_stats"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_windows_v_blocks_stats" ADD CONSTRAINT "_windows_v_blocks_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_windows_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_windows_v_blocks_quote" ADD CONSTRAINT "_windows_v_blocks_quote_avatar_id_media_id_fk" FOREIGN KEY ("avatar_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_windows_v_blocks_quote" ADD CONSTRAINT "_windows_v_blocks_quote_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_windows_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_windows_v_blocks_facts_items" ADD CONSTRAINT "_windows_v_blocks_facts_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_windows_v_blocks_facts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_windows_v_blocks_facts" ADD CONSTRAINT "_windows_v_blocks_facts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_windows_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_windows_v_blocks_table_columns" ADD CONSTRAINT "_windows_v_blocks_table_columns_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_windows_v_blocks_table"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_windows_v_blocks_table_rows" ADD CONSTRAINT "_windows_v_blocks_table_rows_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_windows_v_blocks_table"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_windows_v_blocks_table" ADD CONSTRAINT "_windows_v_blocks_table_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_windows_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "windows_blocks_stats_items_order_idx" ON "windows_blocks_stats_items" USING btree ("_order");
  CREATE INDEX "windows_blocks_stats_items_parent_id_idx" ON "windows_blocks_stats_items" USING btree ("_parent_id");
  CREATE INDEX "windows_blocks_stats_items_locale_idx" ON "windows_blocks_stats_items" USING btree ("_locale");
  CREATE INDEX "windows_blocks_stats_order_idx" ON "windows_blocks_stats" USING btree ("_order");
  CREATE INDEX "windows_blocks_stats_parent_id_idx" ON "windows_blocks_stats" USING btree ("_parent_id");
  CREATE INDEX "windows_blocks_stats_path_idx" ON "windows_blocks_stats" USING btree ("_path");
  CREATE INDEX "windows_blocks_stats_locale_idx" ON "windows_blocks_stats" USING btree ("_locale");
  CREATE INDEX "windows_blocks_quote_order_idx" ON "windows_blocks_quote" USING btree ("_order");
  CREATE INDEX "windows_blocks_quote_parent_id_idx" ON "windows_blocks_quote" USING btree ("_parent_id");
  CREATE INDEX "windows_blocks_quote_path_idx" ON "windows_blocks_quote" USING btree ("_path");
  CREATE INDEX "windows_blocks_quote_locale_idx" ON "windows_blocks_quote" USING btree ("_locale");
  CREATE INDEX "windows_blocks_quote_avatar_idx" ON "windows_blocks_quote" USING btree ("avatar_id");
  CREATE INDEX "windows_blocks_facts_items_order_idx" ON "windows_blocks_facts_items" USING btree ("_order");
  CREATE INDEX "windows_blocks_facts_items_parent_id_idx" ON "windows_blocks_facts_items" USING btree ("_parent_id");
  CREATE INDEX "windows_blocks_facts_items_locale_idx" ON "windows_blocks_facts_items" USING btree ("_locale");
  CREATE INDEX "windows_blocks_facts_order_idx" ON "windows_blocks_facts" USING btree ("_order");
  CREATE INDEX "windows_blocks_facts_parent_id_idx" ON "windows_blocks_facts" USING btree ("_parent_id");
  CREATE INDEX "windows_blocks_facts_path_idx" ON "windows_blocks_facts" USING btree ("_path");
  CREATE INDEX "windows_blocks_facts_locale_idx" ON "windows_blocks_facts" USING btree ("_locale");
  CREATE INDEX "windows_blocks_table_columns_order_idx" ON "windows_blocks_table_columns" USING btree ("_order");
  CREATE INDEX "windows_blocks_table_columns_parent_id_idx" ON "windows_blocks_table_columns" USING btree ("_parent_id");
  CREATE INDEX "windows_blocks_table_columns_locale_idx" ON "windows_blocks_table_columns" USING btree ("_locale");
  CREATE INDEX "windows_blocks_table_rows_order_idx" ON "windows_blocks_table_rows" USING btree ("_order");
  CREATE INDEX "windows_blocks_table_rows_parent_id_idx" ON "windows_blocks_table_rows" USING btree ("_parent_id");
  CREATE INDEX "windows_blocks_table_rows_locale_idx" ON "windows_blocks_table_rows" USING btree ("_locale");
  CREATE INDEX "windows_blocks_table_order_idx" ON "windows_blocks_table" USING btree ("_order");
  CREATE INDEX "windows_blocks_table_parent_id_idx" ON "windows_blocks_table" USING btree ("_parent_id");
  CREATE INDEX "windows_blocks_table_path_idx" ON "windows_blocks_table" USING btree ("_path");
  CREATE INDEX "windows_blocks_table_locale_idx" ON "windows_blocks_table" USING btree ("_locale");
  CREATE INDEX "_windows_v_blocks_stats_items_order_idx" ON "_windows_v_blocks_stats_items" USING btree ("_order");
  CREATE INDEX "_windows_v_blocks_stats_items_parent_id_idx" ON "_windows_v_blocks_stats_items" USING btree ("_parent_id");
  CREATE INDEX "_windows_v_blocks_stats_items_locale_idx" ON "_windows_v_blocks_stats_items" USING btree ("_locale");
  CREATE INDEX "_windows_v_blocks_stats_order_idx" ON "_windows_v_blocks_stats" USING btree ("_order");
  CREATE INDEX "_windows_v_blocks_stats_parent_id_idx" ON "_windows_v_blocks_stats" USING btree ("_parent_id");
  CREATE INDEX "_windows_v_blocks_stats_path_idx" ON "_windows_v_blocks_stats" USING btree ("_path");
  CREATE INDEX "_windows_v_blocks_stats_locale_idx" ON "_windows_v_blocks_stats" USING btree ("_locale");
  CREATE INDEX "_windows_v_blocks_quote_order_idx" ON "_windows_v_blocks_quote" USING btree ("_order");
  CREATE INDEX "_windows_v_blocks_quote_parent_id_idx" ON "_windows_v_blocks_quote" USING btree ("_parent_id");
  CREATE INDEX "_windows_v_blocks_quote_path_idx" ON "_windows_v_blocks_quote" USING btree ("_path");
  CREATE INDEX "_windows_v_blocks_quote_locale_idx" ON "_windows_v_blocks_quote" USING btree ("_locale");
  CREATE INDEX "_windows_v_blocks_quote_avatar_idx" ON "_windows_v_blocks_quote" USING btree ("avatar_id");
  CREATE INDEX "_windows_v_blocks_facts_items_order_idx" ON "_windows_v_blocks_facts_items" USING btree ("_order");
  CREATE INDEX "_windows_v_blocks_facts_items_parent_id_idx" ON "_windows_v_blocks_facts_items" USING btree ("_parent_id");
  CREATE INDEX "_windows_v_blocks_facts_items_locale_idx" ON "_windows_v_blocks_facts_items" USING btree ("_locale");
  CREATE INDEX "_windows_v_blocks_facts_order_idx" ON "_windows_v_blocks_facts" USING btree ("_order");
  CREATE INDEX "_windows_v_blocks_facts_parent_id_idx" ON "_windows_v_blocks_facts" USING btree ("_parent_id");
  CREATE INDEX "_windows_v_blocks_facts_path_idx" ON "_windows_v_blocks_facts" USING btree ("_path");
  CREATE INDEX "_windows_v_blocks_facts_locale_idx" ON "_windows_v_blocks_facts" USING btree ("_locale");
  CREATE INDEX "_windows_v_blocks_table_columns_order_idx" ON "_windows_v_blocks_table_columns" USING btree ("_order");
  CREATE INDEX "_windows_v_blocks_table_columns_parent_id_idx" ON "_windows_v_blocks_table_columns" USING btree ("_parent_id");
  CREATE INDEX "_windows_v_blocks_table_columns_locale_idx" ON "_windows_v_blocks_table_columns" USING btree ("_locale");
  CREATE INDEX "_windows_v_blocks_table_rows_order_idx" ON "_windows_v_blocks_table_rows" USING btree ("_order");
  CREATE INDEX "_windows_v_blocks_table_rows_parent_id_idx" ON "_windows_v_blocks_table_rows" USING btree ("_parent_id");
  CREATE INDEX "_windows_v_blocks_table_rows_locale_idx" ON "_windows_v_blocks_table_rows" USING btree ("_locale");
  CREATE INDEX "_windows_v_blocks_table_order_idx" ON "_windows_v_blocks_table" USING btree ("_order");
  CREATE INDEX "_windows_v_blocks_table_parent_id_idx" ON "_windows_v_blocks_table" USING btree ("_parent_id");
  CREATE INDEX "_windows_v_blocks_table_path_idx" ON "_windows_v_blocks_table" USING btree ("_path");
  CREATE INDEX "_windows_v_blocks_table_locale_idx" ON "_windows_v_blocks_table" USING btree ("_locale");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "windows_blocks_stats_items" CASCADE;
  DROP TABLE "windows_blocks_stats" CASCADE;
  DROP TABLE "windows_blocks_quote" CASCADE;
  DROP TABLE "windows_blocks_facts_items" CASCADE;
  DROP TABLE "windows_blocks_facts" CASCADE;
  DROP TABLE "windows_blocks_table_columns" CASCADE;
  DROP TABLE "windows_blocks_table_rows" CASCADE;
  DROP TABLE "windows_blocks_table" CASCADE;
  DROP TABLE "_windows_v_blocks_stats_items" CASCADE;
  DROP TABLE "_windows_v_blocks_stats" CASCADE;
  DROP TABLE "_windows_v_blocks_quote" CASCADE;
  DROP TABLE "_windows_v_blocks_facts_items" CASCADE;
  DROP TABLE "_windows_v_blocks_facts" CASCADE;
  DROP TABLE "_windows_v_blocks_table_columns" CASCADE;
  DROP TABLE "_windows_v_blocks_table_rows" CASCADE;
  DROP TABLE "_windows_v_blocks_table" CASCADE;
  DROP TYPE "public"."enum_windows_blocks_stats_surface";
  DROP TYPE "public"."enum_windows_blocks_quote_surface";
  DROP TYPE "public"."enum_windows_blocks_facts_surface";
  DROP TYPE "public"."enum_windows_blocks_table_surface";
  DROP TYPE "public"."enum__windows_v_blocks_stats_surface";
  DROP TYPE "public"."enum__windows_v_blocks_quote_surface";
  DROP TYPE "public"."enum__windows_v_blocks_facts_surface";
  DROP TYPE "public"."enum__windows_v_blocks_table_surface";`)
}
