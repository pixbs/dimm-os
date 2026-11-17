import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_site_inside_actions_type" AS ENUM('window', 'media', 'address');
  CREATE TABLE "site_inside_actions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"type" "enum_site_inside_actions_type" DEFAULT 'window',
  	"window_id" integer,
  	"media_id" integer,
  	"url" varchar,
  	"label" varchar
  );
  
  CREATE TABLE "site_locales" (
  	"inside_title" varchar,
  	"inside_text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "site" ADD COLUMN "inside_picture_id" integer;
  ALTER TABLE "site_inside_actions" ADD CONSTRAINT "site_inside_actions_window_id_windows_id_fk" FOREIGN KEY ("window_id") REFERENCES "public"."windows"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_inside_actions" ADD CONSTRAINT "site_inside_actions_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_inside_actions" ADD CONSTRAINT "site_inside_actions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_locales" ADD CONSTRAINT "site_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "site_inside_actions_order_idx" ON "site_inside_actions" USING btree ("_order");
  CREATE INDEX "site_inside_actions_parent_id_idx" ON "site_inside_actions" USING btree ("_parent_id");
  CREATE INDEX "site_inside_actions_locale_idx" ON "site_inside_actions" USING btree ("_locale");
  CREATE INDEX "site_inside_actions_window_idx" ON "site_inside_actions" USING btree ("window_id");
  CREATE INDEX "site_inside_actions_media_idx" ON "site_inside_actions" USING btree ("media_id");
  CREATE UNIQUE INDEX "site_locales_parent_id_locale_unique" ON "site_locales" USING btree ("_parent_id","_locale");
  ALTER TABLE "site" ADD CONSTRAINT "site_inside_picture_id_media_id_fk" FOREIGN KEY ("inside_picture_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "site_inside_inside_picture_idx" ON "site" USING btree ("inside_picture_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "site_inside_actions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "site_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "site_inside_actions" CASCADE;
  DROP TABLE "site_locales" CASCADE;
  ALTER TABLE "site" DROP CONSTRAINT "site_inside_picture_id_media_id_fk";
  
  DROP INDEX "site_inside_inside_picture_idx";
  ALTER TABLE "site" DROP COLUMN "inside_picture_id";
  DROP TYPE "public"."enum_site_inside_actions_type";`)
}
