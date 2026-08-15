-- Fix navigation_items table - add missing columns
ALTER TABLE navigation_items ADD COLUMN IF NOT EXISTS href TEXT;
ALTER TABLE navigation_items ADD COLUMN IF NOT EXISTS visible BOOLEAN DEFAULT TRUE;

-- Copy existing data to new columns
UPDATE navigation_items SET href = url WHERE href IS NULL AND url IS NOT NULL;
UPDATE navigation_items SET visible = active WHERE visible IS NULL;

-- Create index for the visible column
CREATE INDEX IF NOT EXISTS idx_navigation_items_visible ON navigation_items(visible);
