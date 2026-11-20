import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Only adds: the texts that exist become the English ones, and their old column stays, filled no longer, until a
// migration that only removes.
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "media_locales" (
  	"alt" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "media_locales" ADD CONSTRAINT "media_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "media_locales_parent_id_locale_unique" ON "media_locales" USING btree ("_parent_id","_locale");
  INSERT INTO "media_locales" ("alt", "_locale", "_parent_id") SELECT "alt", 'en', "id" FROM "media";
  ALTER TABLE "media" ALTER COLUMN "alt" DROP NOT NULL;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   UPDATE "media" SET "alt" = "media_locales"."alt" FROM "media_locales" WHERE "media_locales"."_parent_id" = "media"."id" AND "media_locales"."_locale" = 'en';
  ALTER TABLE "media" ALTER COLUMN "alt" SET NOT NULL;
  DROP TABLE "media_locales" CASCADE;`)
}
