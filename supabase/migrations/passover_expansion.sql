-- 1. Add passover_points to profiles if not exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='passover_points') THEN
        ALTER TABLE profiles ADD COLUMN passover_points INTEGER DEFAULT 0;
    END IF;
END $$;

-- 2. Create special user groups for winners (Decorated Nicks)
-- Note: Adjusting colors to be glowing/premium.
INSERT INTO user_groups (name, color, display_order) 
VALUES 
('מנצחי חג החירות (זהב)', '#fbbf24', 900),
('נבחרי הנהלה (כסף)', '#e2e8f0', 901)
ON CONFLICT (name) DO NOTHING;

-- 3. Final Shop Cleanup
-- Fix any remaining legacy categories
UPDATE shop_items SET category = 'wands' WHERE category IN ('wand', 'שרביט', 'שרביטים');
UPDATE shop_items SET category = 'potions' WHERE category IN ('potion', 'שיקוי', 'שיקויים');
UPDATE shop_items SET category = 'cards' WHERE category IN ('card', 'קלף', 'קלפים');
UPDATE shop_items SET category = 'companion' WHERE category IN ('חבר', 'חיות', 'pets');
UPDATE shop_items SET category = 'travel' WHERE category IN ('נסיעה', 'broom');

-- Set all existing items to available explicitly
UPDATE shop_items SET is_available = true WHERE is_available IS NOT true;
ALTER TABLE shop_items ALTER COLUMN is_available SET DEFAULT true;
