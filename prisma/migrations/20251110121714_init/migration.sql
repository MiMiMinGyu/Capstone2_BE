-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "public";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "RelationshipCategory" AS ENUM ('FAMILY_ELDER_CLOSE', 'FAMILY_SIBLING_ELDER', 'FAMILY_SIBLING_YOUNGER', 'PARTNER_INTIMATE', 'FRIEND_CLOSE', 'ACQUAINTANCE_CASUAL', 'WORK_SENIOR_FORMAL', 'WORK_SENIOR_FRIENDLY', 'WORK_PEER', 'WORK_JUNIOR');

-- CreateEnum
CREATE TYPE "PolitenessLevel" AS ENUM ('FORMAL', 'POLITE', 'CASUAL');

-- CreateEnum
CREATE TYPE "VibeType" AS ENUM ('CALM', 'DIRECT', 'PLAYFUL', 'CARING');

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('user', 'assistant', 'system');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "username" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100),
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "refresh_token" VARCHAR(500),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partners" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" VARCHAR(100) NOT NULL,
    "telegram_id" VARCHAR(100),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "partner_id" UUID NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "conversation_id" UUID NOT NULL,
    "role" "MessageRole" NOT NULL,
    "text" TEXT NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "relationships" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "partner_id" UUID NOT NULL,
    "category" "RelationshipCategory" NOT NULL,
    "politeness" "PolitenessLevel" DEFAULT 'POLITE',
    "vibe" "VibeType" DEFAULT 'CALM',
    "emoji_level" SMALLINT DEFAULT 0,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "relationships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "style_profiles" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "honorific_rules" JSONB DEFAULT '{}',
    "constraints" JSONB DEFAULT '{}',
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "style_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tone_samples" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "category" "RelationshipCategory",
    "politeness" "PolitenessLevel",
    "vibe" "VibeType",
    "embedding" vector,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tone_samples_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_chunks" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "source" VARCHAR(255),
    "title" VARCHAR(255),
    "chunk" TEXT NOT NULL,
    "metadata" JSONB DEFAULT '{}',
    "embedding" vector,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_embeddings" (
    "message_id" UUID NOT NULL,
    "embedding" vector NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_embeddings_pkey" PRIMARY KEY ("message_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "partners_telegram_id_key" ON "partners"("telegram_id");

-- CreateIndex
CREATE INDEX "idx_conversations_partner_id" ON "conversations"("partner_id");

-- CreateIndex
CREATE INDEX "idx_conversations_user_id" ON "conversations"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "conversations_user_id_partner_id_key" ON "conversations"("user_id", "partner_id");

-- CreateIndex
CREATE INDEX "idx_messages_conversation_created" ON "messages"("conversation_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_relationships_partner_id" ON "relationships"("partner_id");

-- CreateIndex
CREATE INDEX "idx_relationships_user_id" ON "relationships"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "relationships_user_id_partner_id_key" ON "relationships"("user_id", "partner_id");

-- CreateIndex
CREATE UNIQUE INDEX "style_profiles_user_id_key" ON "style_profiles"("user_id");

-- CreateIndex
CREATE INDEX "idx_tone_samples_category" ON "tone_samples"("category");

-- CreateIndex
CREATE INDEX "idx_tone_samples_embedding" ON "tone_samples"("embedding");

-- CreateIndex
CREATE INDEX "idx_tone_samples_user_id" ON "tone_samples"("user_id");

-- CreateIndex
CREATE INDEX "idx_knowledge_chunks_embedding" ON "knowledge_chunks"("embedding");

-- CreateIndex
CREATE INDEX "idx_knowledge_chunks_user_id" ON "knowledge_chunks"("user_id");

-- CreateIndex
CREATE INDEX "idx_message_embeddings_embedding" ON "message_embeddings"("embedding");

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "style_profiles" ADD CONSTRAINT "style_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tone_samples" ADD CONSTRAINT "tone_samples_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "message_embeddings" ADD CONSTRAINT "message_embeddings_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
