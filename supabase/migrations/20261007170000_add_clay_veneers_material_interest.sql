-- Migration: 20261007170000_add_clay_veneers_material_interest.sql
-- Adds 'clay_veneers' to public.material_interest enum.

ALTER TYPE public.material_interest ADD VALUE IF NOT EXISTS 'clay_veneers';
