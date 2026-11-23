import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "windows_locales" ADD COLUMN "meta_title" varchar;
  ALTER TABLE "windows_locales" ADD COLUMN "meta_description" varchar;
  ALTER TABLE "windows_locales" ADD COLUMN "meta_image_id" integer;
  ALTER TABLE "_windows_v_locales" ADD COLUMN "version_meta_title" varchar;
  ALTER TABLE "_windows_v_locales" ADD COLUMN "version_meta_description" varchar;
  ALTER TABLE "_windows_v_locales" ADD COLUMN "version_meta_image_id" integer;
  ALTER TABLE "site_locales" ADD COLUMN "meta_title" varchar;
  ALTER TABLE "site_locales" ADD COLUMN "meta_description" varchar;
  ALTER TABLE "site_locales" ADD COLUMN "meta_image_id" integer;
  ALTER TABLE "windows_locales" ADD CONSTRAINT "windows_locales_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_windows_v_locales" ADD CONSTRAINT "_windows_v_locales_version_meta_image_id_media_id_fk" FOREIGN KEY ("version_meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_locales" ADD CONSTRAINT "site_locales_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "windows_meta_meta_image_idx" ON "windows_locales" USING btree ("meta_image_id","_locale");
  CREATE INDEX "_windows_v_version_meta_version_meta_image_idx" ON "_windows_v_locales" USING btree ("version_meta_image_id","_locale");
  CREATE INDEX "site_meta_meta_image_idx" ON "site_locales" USING btree ("meta_image_id","_locale");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "windows_locales" DROP CONSTRAINT "windows_locales_meta_image_id_media_id_fk";
  
  ALTER TABLE "_windows_v_locales" DROP CONSTRAINT "_windows_v_locales_version_meta_image_id_media_id_fk";
  
  ALTER TABLE "site_locales" DROP CONSTRAINT "site_locales_meta_image_id_media_id_fk";
  
  DROP INDEX "windows_meta_meta_image_idx";
  DROP INDEX "_windows_v_version_meta_version_meta_image_idx";
  DROP INDEX "site_meta_meta_image_idx";
  ALTER TABLE "windows_locales" DROP COLUMN "meta_title";
  ALTER TABLE "windows_locales" DROP COLUMN "meta_description";
  ALTER TABLE "windows_locales" DROP COLUMN "meta_image_id";
  ALTER TABLE "_windows_v_locales" DROP COLUMN "version_meta_title";
  ALTER TABLE "_windows_v_locales" DROP COLUMN "version_meta_description";
  ALTER TABLE "_windows_v_locales" DROP COLUMN "version_meta_image_id";
  ALTER TABLE "site_locales" DROP COLUMN "meta_title";
  ALTER TABLE "site_locales" DROP COLUMN "meta_description";
  ALTER TABLE "site_locales" DROP COLUMN "meta_image_id";`)
}
