--
-- PostgreSQL database dump
--

-- Dumped from database version 17.8 (92d3c18)
-- Dumped by pg_dump version 17.4

-- Started on 2026-05-06 12:52:34

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 2 (class 3079 OID 155648)
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- TOC entry 3558 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- TOC entry 266 (class 1255 OID 155685)
-- Name: update_modified_column(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.update_modified_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_modified_column() OWNER TO neondb_owner;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 229 (class 1259 OID 155869)
-- Name: attempt_detail; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.attempt_detail (
    detail_id uuid DEFAULT gen_random_uuid() NOT NULL,
    log_id uuid,
    question_id uuid,
    selected_ans text,
    is_correct boolean
);


ALTER TABLE public.attempt_detail OWNER TO neondb_owner;

--
-- TOC entry 228 (class 1259 OID 155851)
-- Name: attempt_section_log; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.attempt_section_log (
    log_id uuid DEFAULT gen_random_uuid() NOT NULL,
    attempt_id uuid,
    section_id uuid,
    status character varying(20) DEFAULT 'in_progress'::character varying,
    started_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    end_at timestamp with time zone
);


ALTER TABLE public.attempt_section_log OWNER TO neondb_owner;

--
-- TOC entry 223 (class 1259 OID 155767)
-- Name: exam; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.exam (
    exam_id uuid DEFAULT gen_random_uuid() NOT NULL,
    room_id uuid,
    title character varying(200) NOT NULL,
    type character varying(50),
    capacity integer,
    duration integer NOT NULL,
    start_time timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone
);


ALTER TABLE public.exam OWNER TO neondb_owner;

--
-- TOC entry 227 (class 1259 OID 155831)
-- Name: exam_attempt; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.exam_attempt (
    attempt_id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    exam_id uuid,
    attempt_type character varying(50),
    marks numeric(5,2) DEFAULT 0.0,
    status character varying(20) DEFAULT 'in_progress'::character varying,
    started_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    end_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.exam_attempt OWNER TO neondb_owner;

--
-- TOC entry 219 (class 1259 OID 155701)
-- Name: exam_room; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.exam_room (
    room_id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    type character varying(50),
    price numeric(10,2) DEFAULT 0.0,
    test_quantity integer DEFAULT 0,
    status character varying(20) DEFAULT 'active'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone
);


ALTER TABLE public.exam_room OWNER TO neondb_owner;

--
-- TOC entry 224 (class 1259 OID 155780)
-- Name: exam_section; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.exam_section (
    section_id uuid DEFAULT gen_random_uuid() NOT NULL,
    exam_id uuid NOT NULL,
    title character varying(150) NOT NULL,
    duration integer
);


ALTER TABLE public.exam_section OWNER TO neondb_owner;

--
-- TOC entry 221 (class 1259 OID 155736)
-- Name: payment; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.payment (
    transaction_id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    room_id uuid,
    amount numeric(10,2) NOT NULL,
    type character varying(50),
    status character varying(20) DEFAULT 'pending'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.payment OWNER TO neondb_owner;

--
-- TOC entry 225 (class 1259 OID 155791)
-- Name: question; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.question (
    question_id uuid DEFAULT gen_random_uuid() NOT NULL,
    section_id uuid NOT NULL,
    parent_id uuid,
    content text NOT NULL,
    image_url character varying(255),
    options jsonb,
    correct_answer text,
    point numeric(5,2) DEFAULT 0.0,
    type character varying(50),
    question_type character varying(50),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone
);


ALTER TABLE public.question OWNER TO neondb_owner;

--
-- TOC entry 226 (class 1259 OID 155812)
-- Name: question_explanation; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.question_explanation (
    explanation_id uuid DEFAULT gen_random_uuid() NOT NULL,
    question_id uuid NOT NULL,
    display_order integer DEFAULT 1 NOT NULL,
    block_type character varying(20) NOT NULL,
    content_text text,
    image_url character varying(255),
    alt_text character varying(255),
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone,
    CONSTRAINT chk_question_explanation_block_type CHECK (((block_type)::text = ANY ((ARRAY['text'::character varying, 'image'::character varying])::text[]))),
    CONSTRAINT chk_question_explanation_has_content CHECK (((((block_type)::text = 'text'::text) AND (content_text IS NOT NULL)) OR (((block_type)::text = 'image'::text) AND (image_url IS NOT NULL))))
);


ALTER TABLE public.question_explanation OWNER TO neondb_owner;

--
-- TOC entry 222 (class 1259 OID 155755)
-- Name: room_activity_stats; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.room_activity_stats (
    room_id uuid NOT NULL,
    attempt_count bigint DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.room_activity_stats OWNER TO neondb_owner;

--
-- TOC entry 220 (class 1259 OID 155712)
-- Name: user_room_access; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.user_room_access (
    user_id uuid NOT NULL,
    room_id uuid NOT NULL,
    granted_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    expired_at timestamp with time zone,
    source_type character varying(50) DEFAULT 'system'::character varying NOT NULL,
    source_ref_id uuid,
    granted_by_user_id uuid,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    note character varying(255),
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.user_room_access OWNER TO neondb_owner;

--
-- TOC entry 218 (class 1259 OID 155686)
-- Name: users; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.users (
    user_id uuid DEFAULT gen_random_uuid() NOT NULL,
    username character varying(50) NOT NULL,
    password character varying(255) NOT NULL,
    fullname character varying(100) NOT NULL,
    email character varying(100) NOT NULL,
    avatar_provider character varying(50),
    avatar_key character varying(255),
    avatar_url text,
    gender character varying(20),
    date_of_birth date,
    phone character varying(20),
    province_code character varying(20),
    province_name character varying(100),
    ward_code character varying(20),
    ward_name character varying(100),
    address_detail character varying(255),
    role character varying(20) DEFAULT 'student'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone
);


ALTER TABLE public.users OWNER TO neondb_owner;

--
-- TOC entry 3380 (class 2606 OID 155876)
-- Name: attempt_detail attempt_detail_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.attempt_detail
    ADD CONSTRAINT attempt_detail_pkey PRIMARY KEY (detail_id);


--
-- TOC entry 3377 (class 2606 OID 155858)
-- Name: attempt_section_log attempt_section_log_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.attempt_section_log
    ADD CONSTRAINT attempt_section_log_pkey PRIMARY KEY (log_id);


--
-- TOC entry 3370 (class 2606 OID 155840)
-- Name: exam_attempt exam_attempt_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.exam_attempt
    ADD CONSTRAINT exam_attempt_pkey PRIMARY KEY (attempt_id);


--
-- TOC entry 3356 (class 2606 OID 155774)
-- Name: exam exam_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.exam
    ADD CONSTRAINT exam_pkey PRIMARY KEY (exam_id);


--
-- TOC entry 3342 (class 2606 OID 155711)
-- Name: exam_room exam_room_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.exam_room
    ADD CONSTRAINT exam_room_pkey PRIMARY KEY (room_id);


--
-- TOC entry 3359 (class 2606 OID 155785)
-- Name: exam_section exam_section_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.exam_section
    ADD CONSTRAINT exam_section_pkey PRIMARY KEY (section_id);


--
-- TOC entry 3351 (class 2606 OID 155744)
-- Name: payment payment_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.payment
    ADD CONSTRAINT payment_pkey PRIMARY KEY (transaction_id);


--
-- TOC entry 3368 (class 2606 OID 155825)
-- Name: question_explanation question_explanation_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.question_explanation
    ADD CONSTRAINT question_explanation_pkey PRIMARY KEY (explanation_id);


--
-- TOC entry 3365 (class 2606 OID 155801)
-- Name: question question_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.question
    ADD CONSTRAINT question_pkey PRIMARY KEY (question_id);


--
-- TOC entry 3354 (class 2606 OID 155761)
-- Name: room_activity_stats room_activity_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.room_activity_stats
    ADD CONSTRAINT room_activity_stats_pkey PRIMARY KEY (room_id);


--
-- TOC entry 3348 (class 2606 OID 155720)
-- Name: user_room_access user_room_access_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_room_access
    ADD CONSTRAINT user_room_access_pkey PRIMARY KEY (user_id, room_id);


--
-- TOC entry 3336 (class 2606 OID 155700)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 3338 (class 2606 OID 155696)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);


--
-- TOC entry 3340 (class 2606 OID 155698)
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- TOC entry 3381 (class 1259 OID 155913)
-- Name: idx_attempt_detail_question_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_attempt_detail_question_id ON public.attempt_detail USING btree (question_id);


--
-- TOC entry 3371 (class 1259 OID 155910)
-- Name: idx_exam_attempt_exam_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_exam_attempt_exam_id ON public.exam_attempt USING btree (exam_id);


--
-- TOC entry 3372 (class 1259 OID 155911)
-- Name: idx_exam_attempt_exam_user; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_exam_attempt_exam_user ON public.exam_attempt USING btree (exam_id, user_id);


--
-- TOC entry 3373 (class 1259 OID 155909)
-- Name: idx_exam_attempt_status_started_at; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_exam_attempt_status_started_at ON public.exam_attempt USING btree (status, started_at DESC);


--
-- TOC entry 3374 (class 1259 OID 155907)
-- Name: idx_exam_attempt_user_exam; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_exam_attempt_user_exam ON public.exam_attempt USING btree (user_id, exam_id);


--
-- TOC entry 3357 (class 1259 OID 155901)
-- Name: idx_exam_room; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_exam_room ON public.exam USING btree (room_id);


--
-- TOC entry 3360 (class 1259 OID 155902)
-- Name: idx_exam_section_exam_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_exam_section_exam_id ON public.exam_section USING btree (exam_id);


--
-- TOC entry 3349 (class 1259 OID 155899)
-- Name: idx_payment_user; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_payment_user ON public.payment USING btree (user_id);


--
-- TOC entry 3366 (class 1259 OID 155906)
-- Name: idx_question_explanation_question_order; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_question_explanation_question_order ON public.question_explanation USING btree (question_id, display_order);


--
-- TOC entry 3361 (class 1259 OID 155905)
-- Name: idx_question_options; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_question_options ON public.question USING gin (options);


--
-- TOC entry 3362 (class 1259 OID 155904)
-- Name: idx_question_parent; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_question_parent ON public.question USING btree (parent_id);


--
-- TOC entry 3363 (class 1259 OID 155903)
-- Name: idx_question_section; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_question_section ON public.question USING btree (section_id);


--
-- TOC entry 3352 (class 1259 OID 155900)
-- Name: idx_room_activity_stats_attempt_count; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_room_activity_stats_attempt_count ON public.room_activity_stats USING btree (attempt_count DESC, updated_at DESC);


--
-- TOC entry 3343 (class 1259 OID 155897)
-- Name: idx_user_room_access_room_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_user_room_access_room_status ON public.user_room_access USING btree (room_id, status);


--
-- TOC entry 3344 (class 1259 OID 155898)
-- Name: idx_user_room_access_source; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_user_room_access_source ON public.user_room_access USING btree (source_type, source_ref_id);


--
-- TOC entry 3345 (class 1259 OID 155895)
-- Name: idx_user_room_access_user; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_user_room_access_user ON public.user_room_access USING btree (user_id);


--
-- TOC entry 3346 (class 1259 OID 155896)
-- Name: idx_user_room_access_user_status_expiry; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_user_room_access_user_status_expiry ON public.user_room_access USING btree (user_id, status, expired_at);


--
-- TOC entry 3382 (class 1259 OID 155914)
-- Name: uq_attempt_detail_log_question; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX uq_attempt_detail_log_question ON public.attempt_detail USING btree (log_id, question_id);


--
-- TOC entry 3378 (class 1259 OID 155912)
-- Name: uq_attempt_section_log_attempt_section; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX uq_attempt_section_log_attempt_section ON public.attempt_section_log USING btree (attempt_id, section_id);


--
-- TOC entry 3375 (class 1259 OID 155908)
-- Name: uq_exam_attempt_user_exam_in_progress; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX uq_exam_attempt_user_exam_in_progress ON public.exam_attempt USING btree (user_id, exam_id) WHERE ((status)::text = 'in_progress'::text);


--
-- TOC entry 3407 (class 2620 OID 155894)
-- Name: exam_attempt update_exam_attempt_modtime; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER update_exam_attempt_modtime BEFORE UPDATE ON public.exam_attempt FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- TOC entry 3404 (class 2620 OID 155891)
-- Name: exam update_exam_modtime; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER update_exam_modtime BEFORE UPDATE ON public.exam FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- TOC entry 3401 (class 2620 OID 155888)
-- Name: exam_room update_exam_room_modtime; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER update_exam_room_modtime BEFORE UPDATE ON public.exam_room FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- TOC entry 3403 (class 2620 OID 155890)
-- Name: payment update_payment_modtime; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER update_payment_modtime BEFORE UPDATE ON public.payment FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- TOC entry 3406 (class 2620 OID 155893)
-- Name: question_explanation update_question_explanation_modtime; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER update_question_explanation_modtime BEFORE UPDATE ON public.question_explanation FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- TOC entry 3405 (class 2620 OID 155892)
-- Name: question update_question_modtime; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER update_question_modtime BEFORE UPDATE ON public.question FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- TOC entry 3402 (class 2620 OID 155889)
-- Name: user_room_access update_user_room_access_modtime; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER update_user_room_access_modtime BEFORE UPDATE ON public.user_room_access FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- TOC entry 3400 (class 2620 OID 155887)
-- Name: users update_users_modtime; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER update_users_modtime BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- TOC entry 3398 (class 2606 OID 155877)
-- Name: attempt_detail attempt_detail_log_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.attempt_detail
    ADD CONSTRAINT attempt_detail_log_id_fkey FOREIGN KEY (log_id) REFERENCES public.attempt_section_log(log_id) ON DELETE CASCADE;


--
-- TOC entry 3399 (class 2606 OID 155882)
-- Name: attempt_detail attempt_detail_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.attempt_detail
    ADD CONSTRAINT attempt_detail_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.question(question_id) ON DELETE RESTRICT;


--
-- TOC entry 3396 (class 2606 OID 155859)
-- Name: attempt_section_log attempt_section_log_attempt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.attempt_section_log
    ADD CONSTRAINT attempt_section_log_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES public.exam_attempt(attempt_id) ON DELETE CASCADE;


--
-- TOC entry 3397 (class 2606 OID 155864)
-- Name: attempt_section_log attempt_section_log_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.attempt_section_log
    ADD CONSTRAINT attempt_section_log_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.exam_section(section_id) ON DELETE CASCADE;


--
-- TOC entry 3394 (class 2606 OID 155846)
-- Name: exam_attempt exam_attempt_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.exam_attempt
    ADD CONSTRAINT exam_attempt_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exam(exam_id) ON DELETE RESTRICT;


--
-- TOC entry 3395 (class 2606 OID 155841)
-- Name: exam_attempt exam_attempt_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.exam_attempt
    ADD CONSTRAINT exam_attempt_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE RESTRICT;


--
-- TOC entry 3389 (class 2606 OID 155775)
-- Name: exam exam_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.exam
    ADD CONSTRAINT exam_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.exam_room(room_id) ON DELETE CASCADE;


--
-- TOC entry 3390 (class 2606 OID 155786)
-- Name: exam_section exam_section_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.exam_section
    ADD CONSTRAINT exam_section_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exam(exam_id) ON DELETE CASCADE;


--
-- TOC entry 3386 (class 2606 OID 155750)
-- Name: payment payment_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.payment
    ADD CONSTRAINT payment_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.exam_room(room_id) ON DELETE SET NULL;


--
-- TOC entry 3387 (class 2606 OID 155745)
-- Name: payment payment_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.payment
    ADD CONSTRAINT payment_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- TOC entry 3393 (class 2606 OID 155826)
-- Name: question_explanation question_explanation_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.question_explanation
    ADD CONSTRAINT question_explanation_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.question(question_id) ON DELETE CASCADE;


--
-- TOC entry 3391 (class 2606 OID 155807)
-- Name: question question_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.question
    ADD CONSTRAINT question_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.question(question_id) ON DELETE CASCADE;


--
-- TOC entry 3392 (class 2606 OID 155802)
-- Name: question question_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.question
    ADD CONSTRAINT question_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.exam_section(section_id) ON DELETE CASCADE;


--
-- TOC entry 3388 (class 2606 OID 155762)
-- Name: room_activity_stats room_activity_stats_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.room_activity_stats
    ADD CONSTRAINT room_activity_stats_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.exam_room(room_id) ON DELETE CASCADE;


--
-- TOC entry 3383 (class 2606 OID 155731)
-- Name: user_room_access user_room_access_granted_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_room_access
    ADD CONSTRAINT user_room_access_granted_by_user_id_fkey FOREIGN KEY (granted_by_user_id) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- TOC entry 3384 (class 2606 OID 155726)
-- Name: user_room_access user_room_access_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_room_access
    ADD CONSTRAINT user_room_access_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.exam_room(room_id) ON DELETE CASCADE;


--
-- TOC entry 3385 (class 2606 OID 155721)
-- Name: user_room_access user_room_access_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_room_access
    ADD CONSTRAINT user_room_access_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- TOC entry 2126 (class 826 OID 16394)
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;


--
-- TOC entry 2125 (class 826 OID 16393)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;


-- Completed on 2026-05-06 12:52:46

--
-- PostgreSQL database dump complete
--

