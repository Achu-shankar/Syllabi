

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."set_current_timestamp_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_current_timestamp_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."announcements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "chatbot_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "is_published" boolean DEFAULT false NOT NULL,
    "published_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."announcements" OWNER TO "postgres";


COMMENT ON TABLE "public"."announcements" IS 'Stores announcements for specific chatbots.';



COMMENT ON COLUMN "public"."announcements"."chatbot_id" IS 'The chatbot this announcement belongs to.';



COMMENT ON COLUMN "public"."announcements"."user_id" IS 'The educator who created this announcement.';



COMMENT ON COLUMN "public"."announcements"."title" IS 'Title of the announcement.';



COMMENT ON COLUMN "public"."announcements"."content" IS 'Main content of the announcement.';



COMMENT ON COLUMN "public"."announcements"."is_published" IS 'Whether the announcement is visible to students.';



COMMENT ON COLUMN "public"."announcements"."published_at" IS 'Timestamp when the announcement was published.';



CREATE TABLE IF NOT EXISTS "public"."chatbot_content_sources" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "chatbot_id" "uuid" NOT NULL,
    "source_type" "text" NOT NULL,
    "file_name" "text",
    "storage_path" "text",
    "source_url" "text",
    "title" "text",
    "indexing_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "error_message" "text",
    "metadata" "jsonb",
    "uploaded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "processed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."chatbot_content_sources" OWNER TO "postgres";


COMMENT ON TABLE "public"."chatbot_content_sources" IS 'Stores content sources (documents, URLs) for chatbots.';



COMMENT ON COLUMN "public"."chatbot_content_sources"."chatbot_id" IS 'The chatbot this content source belongs to.';



COMMENT ON COLUMN "public"."chatbot_content_sources"."source_type" IS 'Type of the content source (e.g., pdf, url).';



COMMENT ON COLUMN "public"."chatbot_content_sources"."file_name" IS 'Original name of the uploaded file.';



COMMENT ON COLUMN "public"."chatbot_content_sources"."storage_path" IS 'Path to the file in object storage.';



COMMENT ON COLUMN "public"."chatbot_content_sources"."source_url" IS 'URL if the source is a web page.';



COMMENT ON COLUMN "public"."chatbot_content_sources"."title" IS 'Display title for this content source.';



COMMENT ON COLUMN "public"."chatbot_content_sources"."indexing_status" IS 'Current status of content processing/indexing.';



COMMENT ON COLUMN "public"."chatbot_content_sources"."error_message" IS 'Error message if content processing failed.';



COMMENT ON COLUMN "public"."chatbot_content_sources"."metadata" IS 'Additional metadata about the source (e.g., page count).';



COMMENT ON COLUMN "public"."chatbot_content_sources"."processed_at" IS 'Timestamp when content processing finished.';



CREATE TABLE IF NOT EXISTS "public"."chatbots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "internal_name" "text" NOT NULL,
    "student_facing_name" "text",
    "logo_url" "text",
    "theme_identifier" "text",
    "welcome_message" "text",
    "suggested_questions" "jsonb" DEFAULT '[]'::"jsonb",
    "is_active" boolean DEFAULT true NOT NULL,
    "shareable_url_slug" "text",
    "customization_details" "jsonb",
    "rate_limit_config" "jsonb",
    "access_control_config" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."chatbots" OWNER TO "postgres";


COMMENT ON TABLE "public"."chatbots" IS 'Stores information about each chatbot created by educators.';



COMMENT ON COLUMN "public"."chatbots"."user_id" IS 'The educator who owns this chatbot.';



COMMENT ON COLUMN "public"."chatbots"."internal_name" IS 'Name for the chatbot, visible to the educator only.';



COMMENT ON COLUMN "public"."chatbots"."student_facing_name" IS 'Public name of the chatbot, visible to students.';



COMMENT ON COLUMN "public"."chatbots"."logo_url" IS 'URL for the chatbot''s logo.';



COMMENT ON COLUMN "public"."chatbots"."theme_identifier" IS 'Identifier for the selected pre-made theme.';



COMMENT ON COLUMN "public"."chatbots"."welcome_message" IS 'Initial message displayed to students.';



COMMENT ON COLUMN "public"."chatbots"."suggested_questions" IS 'JSON array of suggested questions for students.';



COMMENT ON COLUMN "public"."chatbots"."is_active" IS 'Whether the chatbot is currently active and accessible to students.';



COMMENT ON COLUMN "public"."chatbots"."shareable_url_slug" IS 'Unique slug for the student-facing chatbot URL. Must be unique if set.';



COMMENT ON COLUMN "public"."chatbots"."customization_details" IS 'JSON blob for additional customization settings (e.g., UI toggles).';



COMMENT ON COLUMN "public"."chatbots"."rate_limit_config" IS 'JSON blob for future rate limiting configurations.';



COMMENT ON COLUMN "public"."chatbots"."access_control_config" IS 'JSON blob for future student access control settings.';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "user_id" "uuid" NOT NULL,
    "subscription_tier" "text",
    "organization_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."profiles" IS 'Stores additional user-specific settings and preferences, linked to auth.users.';



COMMENT ON COLUMN "public"."profiles"."user_id" IS 'Foreign key referencing the user in auth.users.';



COMMENT ON COLUMN "public"."profiles"."subscription_tier" IS 'The subscription tier of the user (e.g., free, basic, premium).';



COMMENT ON COLUMN "public"."profiles"."organization_name" IS 'Name of the organization the user might belong to.';



ALTER TABLE ONLY "public"."announcements"
    ADD CONSTRAINT "announcements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chatbot_content_sources"
    ADD CONSTRAINT "chatbot_content_sources_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chatbots"
    ADD CONSTRAINT "chatbots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("user_id");



CREATE INDEX "idx_announcements_chatbot_id" ON "public"."announcements" USING "btree" ("chatbot_id");



CREATE INDEX "idx_announcements_is_published" ON "public"."announcements" USING "btree" ("is_published");



CREATE INDEX "idx_announcements_user_id" ON "public"."announcements" USING "btree" ("user_id");



CREATE INDEX "idx_chatbot_content_sources_chatbot_id" ON "public"."chatbot_content_sources" USING "btree" ("chatbot_id");



CREATE INDEX "idx_chatbot_content_sources_indexing_status" ON "public"."chatbot_content_sources" USING "btree" ("indexing_status");



CREATE INDEX "idx_chatbot_content_sources_source_type" ON "public"."chatbot_content_sources" USING "btree" ("source_type");



CREATE UNIQUE INDEX "idx_chatbots_shareable_url_slug_not_null" ON "public"."chatbots" USING "btree" ("shareable_url_slug") WHERE ("shareable_url_slug" IS NOT NULL);



CREATE INDEX "idx_chatbots_user_id" ON "public"."chatbots" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "set_announcements_updated_at" BEFORE UPDATE ON "public"."announcements" FOR EACH ROW EXECUTE FUNCTION "public"."set_current_timestamp_updated_at"();



CREATE OR REPLACE TRIGGER "set_chatbot_content_sources_updated_at" BEFORE UPDATE ON "public"."chatbot_content_sources" FOR EACH ROW EXECUTE FUNCTION "public"."set_current_timestamp_updated_at"();



CREATE OR REPLACE TRIGGER "set_chatbots_updated_at" BEFORE UPDATE ON "public"."chatbots" FOR EACH ROW EXECUTE FUNCTION "public"."set_current_timestamp_updated_at"();



CREATE OR REPLACE TRIGGER "set_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_current_timestamp_updated_at"();



ALTER TABLE ONLY "public"."announcements"
    ADD CONSTRAINT "announcements_chatbot_id_fkey" FOREIGN KEY ("chatbot_id") REFERENCES "public"."chatbots"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."announcements"
    ADD CONSTRAINT "announcements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chatbot_content_sources"
    ADD CONSTRAINT "chatbot_content_sources_chatbot_id_fkey" FOREIGN KEY ("chatbot_id") REFERENCES "public"."chatbots"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chatbots"
    ADD CONSTRAINT "chatbots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE "public"."announcements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chatbot_content_sources" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chatbots" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."set_current_timestamp_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_current_timestamp_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_current_timestamp_updated_at"() TO "service_role";


















GRANT ALL ON TABLE "public"."announcements" TO "anon";
GRANT ALL ON TABLE "public"."announcements" TO "authenticated";
GRANT ALL ON TABLE "public"."announcements" TO "service_role";



GRANT ALL ON TABLE "public"."chatbot_content_sources" TO "anon";
GRANT ALL ON TABLE "public"."chatbot_content_sources" TO "authenticated";
GRANT ALL ON TABLE "public"."chatbot_content_sources" TO "service_role";



GRANT ALL ON TABLE "public"."chatbots" TO "anon";
GRANT ALL ON TABLE "public"."chatbots" TO "authenticated";
GRANT ALL ON TABLE "public"."chatbots" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;
