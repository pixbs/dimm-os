import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "senders" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "senders_id" integer;
  CREATE INDEX "senders_key_idx" ON "senders" USING btree ("key");
  CREATE INDEX "senders_updated_at_idx" ON "senders" USING btree ("updated_at");
  CREATE INDEX "senders_created_at_idx" ON "senders" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_senders_fk" FOREIGN KEY ("senders_id") REFERENCES "public"."senders"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_senders_id_idx" ON "payload_locked_documents_rels" USING btree ("senders_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "senders" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "senders" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_senders_fk";
  
  DROP INDEX "payload_locked_documents_rels_senders_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "senders_id";`)
}
