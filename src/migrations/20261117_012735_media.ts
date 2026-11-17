import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_windows_blocks_media_columns" AS ENUM('1', '2', '3');
  CREATE TYPE "public"."enum_windows_blocks_media_ratio" AS ENUM('16:9', '4:3', '1:1');
  CREATE TYPE "public"."enum__windows_v_blocks_media_columns" AS ENUM('1', '2', '3');
  CREATE TYPE "public"."enum__windows_v_blocks_media_ratio" AS ENUM('16:9', '4:3', '1:1');
  CREATE TABLE "windows_blocks_media_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"picture_id" integer,
  	"caption" varchar
  );
  
  CREATE TABLE "windows_blocks_media" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"text" varchar,
  	"columns" "enum_windows_blocks_media_columns" DEFAULT '1',
  	"ratio" "enum_windows_blocks_media_ratio" DEFAULT '16:9',
  	"bleed" boolean,
  	"block_name" varchar
  );
  
  CREATE TABLE "_windows_v_blocks_media_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"picture_id" integer,
  	"caption" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_windows_v_blocks_media" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"text" varchar,
  	"columns" "enum__windows_v_blocks_media_columns" DEFAULT '1',
  	"ratio" "enum__windows_v_blocks_media_ratio" DEFAULT '16:9',
  	"bleed" boolean,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  ALTER TABLE "windows_blocks_media_items" ADD CONSTRAINT "windows_blocks_media_items_picture_id_media_id_fk" FOREIGN KEY ("picture_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "windows_blocks_media_items" ADD CONSTRAINT "windows_blocks_media_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."windows_blocks_media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "windows_blocks_media" ADD CONSTRAINT "windows_blocks_media_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."windows"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_windows_v_blocks_media_items" ADD CONSTRAINT "_windows_v_blocks_media_items_picture_id_media_id_fk" FOREIGN KEY ("picture_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_windows_v_blocks_media_items" ADD CONSTRAINT "_windows_v_blocks_media_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_windows_v_blocks_media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_windows_v_blocks_media" ADD CONSTRAINT "_windows_v_blocks_media_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_windows_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "windows_blocks_media_items_order_idx" ON "windows_blocks_media_items" USING btree ("_order");
  CREATE INDEX "windows_blocks_media_items_parent_id_idx" ON "windows_blocks_media_items" USING btree ("_parent_id");
  CREATE INDEX "windows_blocks_media_items_locale_idx" ON "windows_blocks_media_items" USING btree ("_locale");
  CREATE INDEX "windows_blocks_media_items_picture_idx" ON "windows_blocks_media_items" USING btree ("picture_id");
  CREATE INDEX "windows_blocks_media_order_idx" ON "windows_blocks_media" USING btree ("_order");
  CREATE INDEX "windows_blocks_media_parent_id_idx" ON "windows_blocks_media" USING btree ("_parent_id");
  CREATE INDEX "windows_blocks_media_path_idx" ON "windows_blocks_media" USING btree ("_path");
  CREATE INDEX "windows_blocks_media_locale_idx" ON "windows_blocks_media" USING btree ("_locale");
  CREATE INDEX "_windows_v_blocks_media_items_order_idx" ON "_windows_v_blocks_media_items" USING btree ("_order");
  CREATE INDEX "_windows_v_blocks_media_items_parent_id_idx" ON "_windows_v_blocks_media_items" USING btree ("_parent_id");
  CREATE INDEX "_windows_v_blocks_media_items_locale_idx" ON "_windows_v_blocks_media_items" USING btree ("_locale");
  CREATE INDEX "_windows_v_blocks_media_items_picture_idx" ON "_windows_v_blocks_media_items" USING btree ("picture_id");
  CREATE INDEX "_windows_v_blocks_media_order_idx" ON "_windows_v_blocks_media" USING btree ("_order");
  CREATE INDEX "_windows_v_blocks_media_parent_id_idx" ON "_windows_v_blocks_media" USING btree ("_parent_id");
  CREATE INDEX "_windows_v_blocks_media_path_idx" ON "_windows_v_blocks_media" USING btree ("_path");
  CREATE INDEX "_windows_v_blocks_media_locale_idx" ON "_windows_v_blocks_media" USING btree ("_locale");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "windows_blocks_media_items" CASCADE;
  DROP TABLE "windows_blocks_media" CASCADE;
  DROP TABLE "_windows_v_blocks_media_items" CASCADE;
  DROP TABLE "_windows_v_blocks_media" CASCADE;
  DROP TYPE "public"."enum_windows_blocks_media_columns";
  DROP TYPE "public"."enum_windows_blocks_media_ratio";
  DROP TYPE "public"."enum__windows_v_blocks_media_columns";
  DROP TYPE "public"."enum__windows_v_blocks_media_ratio";`)
}
