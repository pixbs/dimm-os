import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_windows_blocks_list_source" AS ENUM('items', 'window');
  CREATE TYPE "public"."enum_windows_blocks_cards_source" AS ENUM('items', 'window');
  CREATE TYPE "public"."enum__windows_v_blocks_list_source" AS ENUM('items', 'window');
  CREATE TYPE "public"."enum__windows_v_blocks_cards_source" AS ENUM('items', 'window');
  ALTER TABLE "windows_blocks_list" ADD COLUMN "source" "enum_windows_blocks_list_source" DEFAULT 'items';
  ALTER TABLE "windows_blocks_list" ADD COLUMN "from_id" integer;
  ALTER TABLE "windows_blocks_list" ADD COLUMN "filter" boolean;
  ALTER TABLE "windows_blocks_list" ADD COLUMN "limit" numeric;
  ALTER TABLE "windows_blocks_cards" ADD COLUMN "source" "enum_windows_blocks_cards_source" DEFAULT 'items';
  ALTER TABLE "windows_blocks_cards" ADD COLUMN "from_id" integer;
  ALTER TABLE "_windows_v_blocks_list" ADD COLUMN "source" "enum__windows_v_blocks_list_source" DEFAULT 'items';
  ALTER TABLE "_windows_v_blocks_list" ADD COLUMN "from_id" integer;
  ALTER TABLE "_windows_v_blocks_list" ADD COLUMN "filter" boolean;
  ALTER TABLE "_windows_v_blocks_list" ADD COLUMN "limit" numeric;
  ALTER TABLE "_windows_v_blocks_cards" ADD COLUMN "source" "enum__windows_v_blocks_cards_source" DEFAULT 'items';
  ALTER TABLE "_windows_v_blocks_cards" ADD COLUMN "from_id" integer;
  ALTER TABLE "windows_blocks_list" ADD CONSTRAINT "windows_blocks_list_from_id_windows_id_fk" FOREIGN KEY ("from_id") REFERENCES "public"."windows"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "windows_blocks_cards" ADD CONSTRAINT "windows_blocks_cards_from_id_windows_id_fk" FOREIGN KEY ("from_id") REFERENCES "public"."windows"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_windows_v_blocks_list" ADD CONSTRAINT "_windows_v_blocks_list_from_id_windows_id_fk" FOREIGN KEY ("from_id") REFERENCES "public"."windows"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_windows_v_blocks_cards" ADD CONSTRAINT "_windows_v_blocks_cards_from_id_windows_id_fk" FOREIGN KEY ("from_id") REFERENCES "public"."windows"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "windows_blocks_list_from_idx" ON "windows_blocks_list" USING btree ("from_id");
  CREATE INDEX "windows_blocks_cards_from_idx" ON "windows_blocks_cards" USING btree ("from_id");
  CREATE INDEX "_windows_v_blocks_list_from_idx" ON "_windows_v_blocks_list" USING btree ("from_id");
  CREATE INDEX "_windows_v_blocks_cards_from_idx" ON "_windows_v_blocks_cards" USING btree ("from_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "windows_blocks_list" DROP CONSTRAINT "windows_blocks_list_from_id_windows_id_fk";
  
  ALTER TABLE "windows_blocks_cards" DROP CONSTRAINT "windows_blocks_cards_from_id_windows_id_fk";
  
  ALTER TABLE "_windows_v_blocks_list" DROP CONSTRAINT "_windows_v_blocks_list_from_id_windows_id_fk";
  
  ALTER TABLE "_windows_v_blocks_cards" DROP CONSTRAINT "_windows_v_blocks_cards_from_id_windows_id_fk";
  
  DROP INDEX "windows_blocks_list_from_idx";
  DROP INDEX "windows_blocks_cards_from_idx";
  DROP INDEX "_windows_v_blocks_list_from_idx";
  DROP INDEX "_windows_v_blocks_cards_from_idx";
  ALTER TABLE "windows_blocks_list" DROP COLUMN "source";
  ALTER TABLE "windows_blocks_list" DROP COLUMN "from_id";
  ALTER TABLE "windows_blocks_list" DROP COLUMN "filter";
  ALTER TABLE "windows_blocks_list" DROP COLUMN "limit";
  ALTER TABLE "windows_blocks_cards" DROP COLUMN "source";
  ALTER TABLE "windows_blocks_cards" DROP COLUMN "from_id";
  ALTER TABLE "_windows_v_blocks_list" DROP COLUMN "source";
  ALTER TABLE "_windows_v_blocks_list" DROP COLUMN "from_id";
  ALTER TABLE "_windows_v_blocks_list" DROP COLUMN "filter";
  ALTER TABLE "_windows_v_blocks_list" DROP COLUMN "limit";
  ALTER TABLE "_windows_v_blocks_cards" DROP COLUMN "source";
  ALTER TABLE "_windows_v_blocks_cards" DROP COLUMN "from_id";
  DROP TYPE "public"."enum_windows_blocks_list_source";
  DROP TYPE "public"."enum_windows_blocks_cards_source";
  DROP TYPE "public"."enum__windows_v_blocks_list_source";
  DROP TYPE "public"."enum__windows_v_blocks_cards_source";`)
}
