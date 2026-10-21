-- Migration: Fix QUO-000012 to ensure both Sealer Chemical and Sealer Application Labour exist with correct rates and quantities
DO $$
DECLARE
  v_quote_id uuid;
  v_labour_item_id uuid;
BEGIN
  SELECT id INTO v_quote_id FROM quotes WHERE quote_no = 'QUO-000012' LIMIT 1;
  IF v_quote_id IS NOT NULL THEN
    -- 1. Ensure the labour item with rate=10 & qty=80 is accurately labeled 'Sealer Application Labour' with unit 'sqft'
    SELECT id INTO v_labour_item_id FROM quote_items
    WHERE quote_id = v_quote_id AND unit_price = 10 AND quantity = 80
    LIMIT 1;

    IF v_labour_item_id IS NOT NULL THEN
      UPDATE quote_items
      SET description = 'Sealer Application Labour',
          unit = 'sqft',
          hsn_sac = '9954'
      WHERE id = v_labour_item_id;
    END IF;

    -- 2. Ensure the Sealer Chemical line item exists (2 ltr @ Rs 2500 = Rs 5000)
    IF NOT EXISTS (
      SELECT 1 FROM quote_items
      WHERE quote_id = v_quote_id AND unit_price = 2500
    ) THEN
      INSERT INTO quote_items (
        quote_id,
        description,
        quantity,
        unit,
        unit_price,
        tax_pct,
        hsn_sac,
        sort_order
      ) VALUES (
        v_quote_id,
        'Sealer Chemical — Solvent Based Water Oil and Dust Repellent',
        2,
        'ltr',
        2500,
        0,
        '38249900',
        4
      );
    END IF;

    -- 3. Touch the quote to ensure any listeners/totals recalculate
    UPDATE quotes
    SET updated_at = now()
    WHERE id = v_quote_id;
  END IF;
END $$;
