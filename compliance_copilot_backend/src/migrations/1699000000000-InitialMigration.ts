import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialMigration1699000000000 implements MigrationInterface {
  name = 'InitialMigration1699000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable UUID extension
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Create merchants table
    await queryRunner.query(`
      CREATE TABLE "merchants" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "shopify_shop_id" character varying(255) NOT NULL,
        "shop_domain" character varying(255) NOT NULL,
        "shop_name" character varying(255) NOT NULL,
        "access_token" text NOT NULL,
        "subscription_plan" character varying(50) NOT NULL DEFAULT 'free',
        "compliance_status" character varying(50) NOT NULL DEFAULT 'pending',
        "compliance_score" integer NOT NULL DEFAULT '0',
        "last_audit_date" TIMESTAMP,
        "webhook_verified" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_merchants_shopify_shop_id" UNIQUE ("shopify_shop_id"),
        CONSTRAINT "PK_merchants" PRIMARY KEY ("id")
      )
    `);

    // Create privacy_policies table
    await queryRunner.query(`
      CREATE TABLE "privacy_policies" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "merchant_id" uuid NOT NULL,
        "version" integer NOT NULL,
        "content" text NOT NULL,
        "ai_generated" boolean NOT NULL DEFAULT false,
        "status" character varying NOT NULL DEFAULT 'draft',
        "published_at" TIMESTAMP,
        "metadata" json,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_privacy_policies" PRIMARY KEY ("id")
      )
    `);

    // Create data_collection_points table
    await queryRunner.query(`
      CREATE TABLE "data_collection_points" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "merchant_id" uuid NOT NULL,
        "collection_type" character varying(100) NOT NULL,
        "data_categories" text array NOT NULL,
        "purpose" text NOT NULL,
        "legal_basis" character varying(100) NOT NULL,
        "retention_period" integer,
        "third_party_sharing" boolean NOT NULL DEFAULT false,
        "data_source" character varying,
        "processing_location" character varying,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_data_collection_points" PRIMARY KEY ("id")
      )
    `);

    // Create compliance_audits table
    await queryRunner.query(`
      CREATE TABLE "compliance_audits" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "merchant_id" uuid NOT NULL,
        "audit_type" character varying(100) NOT NULL,
        "status" character varying(50) NOT NULL,
        "risk_score" integer,
        "findings" jsonb,
        "recommendations" jsonb,
        "audit_data" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "completed_at" TIMESTAMP,
        CONSTRAINT "PK_compliance_audits" PRIMARY KEY ("id")
      )
    `);

    // Create data_subject_requests table
    await queryRunner.query(`
      CREATE TABLE "data_subject_requests" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "merchant_id" uuid NOT NULL,
        "request_type" character varying(50) NOT NULL,
        "customer_email" character varying(255) NOT NULL,
        "customer_id" character varying,
        "status" character varying NOT NULL DEFAULT 'pending',
        "request_data" jsonb,
        "response_data" jsonb,
        "deadline" TIMESTAMP NOT NULL,
        "priority" character varying NOT NULL DEFAULT 'normal',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "completed_at" TIMESTAMP,
        CONSTRAINT "PK_data_subject_requests" PRIMARY KEY ("id")
      )
    `);

    // Create consent_records table
    await queryRunner.query(`
      CREATE TABLE "consent_records" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "merchant_id" uuid NOT NULL,
        "customer_id" character varying NOT NULL,
        "consent_type" character varying(100) NOT NULL,
        "consent_given" boolean NOT NULL,
        "consent_method" character varying(100),
        "ip_address" inet,
        "user_agent" text,
        "consent_data" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "withdrawn_at" TIMESTAMP,
        CONSTRAINT "PK_consent_records" PRIMARY KEY ("id")
      )
    `);

    // Create breach_incidents table
    await queryRunner.query(`
      CREATE TABLE "breach_incidents" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "merchant_id" uuid NOT NULL,
        "incident_type" character varying(100) NOT NULL,
        "severity" character varying(50) NOT NULL,
        "affected_records" integer,
        "description" text NOT NULL,
        "status" character varying NOT NULL DEFAULT 'investigating',
        "reported_to_authority" boolean NOT NULL DEFAULT false,
        "authority_reference" character varying,
        "incident_data" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "resolved_at" TIMESTAMP,
        CONSTRAINT "PK_breach_incidents" PRIMARY KEY ("id")
      )
    `);

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "privacy_policies" 
      ADD CONSTRAINT "FK_privacy_policies_merchant" 
      FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "data_collection_points" 
      ADD CONSTRAINT "FK_data_collection_points_merchant" 
      FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "compliance_audits" 
      ADD CONSTRAINT "FK_compliance_audits_merchant" 
      FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "data_subject_requests" 
      ADD CONSTRAINT "FK_data_subject_requests_merchant" 
      FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "consent_records" 
      ADD CONSTRAINT "FK_consent_records_merchant" 
      FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "breach_incidents" 
      ADD CONSTRAINT "FK_breach_incidents_merchant" 
      FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE CASCADE
    `);

    // Create indexes for better performance
    await queryRunner.query(
      `CREATE INDEX "IDX_merchants_shopify_shop_id" ON "merchants" ("shopify_shop_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_merchants_shop_domain" ON "merchants" ("shop_domain")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_privacy_policies_merchant_id" ON "privacy_policies" ("merchant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_data_collection_points_merchant_id" ON "data_collection_points" ("merchant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_compliance_audits_merchant_id" ON "compliance_audits" ("merchant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_data_subject_requests_merchant_id" ON "data_subject_requests" ("merchant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_consent_records_merchant_id" ON "consent_records" ("merchant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_breach_incidents_merchant_id" ON "breach_incidents" ("merchant_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints
    await queryRunner.query(
      `ALTER TABLE "breach_incidents" DROP CONSTRAINT "FK_breach_incidents_merchant"`,
    );
    await queryRunner.query(
      `ALTER TABLE "consent_records" DROP CONSTRAINT "FK_consent_records_merchant"`,
    );
    await queryRunner.query(
      `ALTER TABLE "data_subject_requests" DROP CONSTRAINT "FK_data_subject_requests_merchant"`,
    );
    await queryRunner.query(
      `ALTER TABLE "compliance_audits" DROP CONSTRAINT "FK_compliance_audits_merchant"`,
    );
    await queryRunner.query(
      `ALTER TABLE "data_collection_points" DROP CONSTRAINT "FK_data_collection_points_merchant"`,
    );
    await queryRunner.query(
      `ALTER TABLE "privacy_policies" DROP CONSTRAINT "FK_privacy_policies_merchant"`,
    );

    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_breach_incidents_merchant_id"`);
    await queryRunner.query(`DROP INDEX "IDX_consent_records_merchant_id"`);
    await queryRunner.query(
      `DROP INDEX "IDX_data_subject_requests_merchant_id"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_compliance_audits_merchant_id"`);
    await queryRunner.query(
      `DROP INDEX "IDX_data_collection_points_merchant_id"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_privacy_policies_merchant_id"`);
    await queryRunner.query(`DROP INDEX "IDX_merchants_shop_domain"`);
    await queryRunner.query(`DROP INDEX "IDX_merchants_shopify_shop_id"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE "breach_incidents"`);
    await queryRunner.query(`DROP TABLE "consent_records"`);
    await queryRunner.query(`DROP TABLE "data_subject_requests"`);
    await queryRunner.query(`DROP TABLE "compliance_audits"`);
    await queryRunner.query(`DROP TABLE "data_collection_points"`);
    await queryRunner.query(`DROP TABLE "privacy_policies"`);
    await queryRunner.query(`DROP TABLE "merchants"`);
  }
}
