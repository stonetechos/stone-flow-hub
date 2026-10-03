-- Migration: 20261003140000_add_natural_stone_cladding_tiles_material_interest.sql
-- Adds 'natural_stone_cladding_tiles' to public.material_interest enum.

ALTER TYPE public.material_interest ADD VALUE IF NOT EXISTS 'natural_stone_cladding_tiles';
