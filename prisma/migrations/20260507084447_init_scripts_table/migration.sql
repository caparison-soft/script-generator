-- CreateTable
CREATE TABLE "scripts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "user_email" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "script_text" TEXT NOT NULL,
    "generation_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scripts_pkey" PRIMARY KEY ("id")
);
