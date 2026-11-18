import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "windows_locales" ADD COLUMN "aside_title" varchar;
  ALTER TABLE "_windows_v_locales" ADD COLUMN "version_aside_title" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "windows_locales" DROP COLUMN "aside_title";
  ALTER TABLE "_windows_v_locales" DROP COLUMN "version_aside_title";`)
}
