-- Migration: 20261011131000_add_website_customer_type.sql
-- Adds 'website' to public.customer_type enum.

ALTER TYPE public.customer_type ADD VALUE IF NOT EXISTS 'website';
