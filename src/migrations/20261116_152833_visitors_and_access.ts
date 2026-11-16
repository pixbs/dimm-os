import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "visitors" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"hash" varchar,
  	"expires" timestamp(3) with time zone NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "visitors_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"windows_id" integer
  );
  
  ALTER TABLE "users" ADD COLUMN "api_key" varchar;
  ALTER TABLE "users" ADD COLUMN "api_key_last4" varchar;
  ALTER TABLE "users" ADD COLUMN "api_key_index" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "visitors_id" integer;
  ALTER TABLE "visitors_rels" ADD CONSTRAINT "visitors_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."visitors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "visitors_rels" ADD CONSTRAINT "visitors_rels_windows_fk" FOREIGN KEY ("windows_id") REFERENCES "public"."windows"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "visitors_hash_idx" ON "visitors" USING btree ("hash");
  CREATE INDEX "visitors_updated_at_idx" ON "visitors" USING btree ("updated_at");
  CREATE INDEX "visitors_created_at_idx" ON "visitors" USING btree ("created_at");
  CREATE INDEX "visitors_rels_order_idx" ON "visitors_rels" USING btree ("order");
  CREATE INDEX "visitors_rels_parent_idx" ON "visitors_rels" USING btree ("parent_id");
  CREATE INDEX "visitors_rels_path_idx" ON "visitors_rels" USING btree ("path");
  CREATE INDEX "visitors_rels_windows_id_idx" ON "visitors_rels" USING btree ("windows_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_visitors_fk" FOREIGN KEY ("visitors_id") REFERENCES "public"."visitors"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_visitors_id_idx" ON "payload_locked_documents_rels" USING btree ("visitors_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "visitors" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "visitors_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "visitors" CASCADE;
  DROP TABLE "visitors_rels" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_visitors_fk";
  
  DROP INDEX "payload_locked_documents_rels_visitors_id_idx";
  ALTER TABLE "users" DROP COLUMN "api_key";
  ALTER TABLE "users" DROP COLUMN "api_key_last4";
  ALTER TABLE "users" DROP COLUMN "api_key_index";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "visitors_id";`)
}
