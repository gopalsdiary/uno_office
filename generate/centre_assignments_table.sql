-- =============================================================================
-- Centre Assignments Table - Supabase SQL
-- =============================================================================
-- এই টেবিলে জেনারেট করা সকল দায়িত্ব বন্টন সংরক্ষণ করা হবে
-- 
-- 📋 ব্যবহার পদ্ধতি:
-- 1. Supabase Dashboard এ যান
-- 2. SQL Editor খুলুন
-- 3. নিচের পুরো কোড কপি করুন
-- 4. Paste করে "RUN" বাটনে ক্লিক করুন
-- 5. সফল হলে "Success" মেসেজ দেখাবে
-- =============================================================================

-- পুরাতন টেবিল থাকলে মুছে ফেলুন (প্রয়োজন হলে comment out করুন)
-- DROP TABLE IF EXISTS centre_assignments CASCADE;

-- নতুন টেবিল তৈরি করুন
CREATE TABLE IF NOT EXISTS centre_assignments (
    -- Primary Key
    assignment_id BIGSERIAL PRIMARY KEY,
    
    -- Vote Centre Information
    vote_centre_iid INTEGER NOT NULL,
    vote_centre_code TEXT NOT NULL,
    
    -- Officer Type (presiding, ass_presiding, polling)
    officer_type TEXT NOT NULL CHECK (officer_type IN ('presiding', 'ass_presiding', 'polling')),
    
    -- Officer Information
    officer_iid INTEGER NOT NULL,
    officer_name TEXT,
    officer_designation TEXT,
    officer_gender TEXT,
    
    -- Booth Information
    booth_number INTEGER,
    person_number INTEGER,
    
    -- Assignment Code
    assign_code TEXT NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint
    CONSTRAINT unique_assignment UNIQUE (vote_centre_iid, officer_type, officer_iid)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_centre_assignments_vote_centre ON centre_assignments(vote_centre_iid);
CREATE INDEX IF NOT EXISTS idx_centre_assignments_officer_type ON centre_assignments(officer_type);
CREATE INDEX IF NOT EXISTS idx_centre_assignments_assign_code ON centre_assignments(assign_code);
CREATE INDEX IF NOT EXISTS idx_centre_assignments_created_at ON centre_assignments(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE centre_assignments ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to read
CREATE POLICY "Allow authenticated users to read" ON centre_assignments
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Create policy to allow authenticated users to insert
CREATE POLICY "Allow authenticated users to insert" ON centre_assignments
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Create policy to allow authenticated users to update
CREATE POLICY "Allow authenticated users to update" ON centre_assignments
    FOR UPDATE
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Create policy to allow authenticated users to delete
CREATE POLICY "Allow authenticated users to delete" ON centre_assignments
    FOR DELETE
    USING (auth.role() = 'authenticated');

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_centre_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_centre_assignments_updated_at ON centre_assignments;
CREATE TRIGGER trigger_update_centre_assignments_updated_at
    BEFORE UPDATE ON centre_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_centre_assignments_updated_at();

-- =============================================================================
-- 📊 Sample Queries - এই query গুলো পরে ব্যবহার করতে পারবেন
-- =============================================================================

-- 1️⃣ কোন একটি কেন্দ্রের সব দায়িত্ব দেখা
/*
SELECT * FROM centre_assignments 
WHERE vote_centre_iid = 1 
ORDER BY officer_type, booth_number;
*/

-- 2️⃣ একজন অফিসার কোথায় এসাইন হয়েছে তা দেখা
/*
SELECT * FROM centre_assignments 
WHERE officer_name ILIKE '%নাম%';
*/

-- 3️⃣ প্রিসাইডিং অফিসারদের তালিকা
/*
SELECT * FROM centre_assignments 
WHERE officer_type = 'presiding' 
ORDER BY vote_centre_code;
*/

-- 4️⃣ একটি নির্দিষ্ট বুথের সব অফিসার
/*
SELECT * FROM centre_assignments 
WHERE vote_centre_iid = 1 AND booth_number = 1;
*/

-- 5️⃣ সর্বশেষ জেনারেট করা দায়িত্ব
/*
SELECT * FROM centre_assignments 
ORDER BY created_at DESC 
LIMIT 100;
*/

-- 6️⃣ কত জন অফিসার প্রতিটি টাইপে আছে
/*
SELECT officer_type, COUNT(*) as total 
FROM centre_assignments 
GROUP BY officer_type;
*/

-- 7️⃣ লিঙ্গ ভিত্তিক পরিসংখ্যান
/*
SELECT officer_type, officer_gender, COUNT(*) as total 
FROM centre_assignments 
WHERE officer_gender IS NOT NULL 
GROUP BY officer_type, officer_gender 
ORDER BY officer_type, officer_gender;
*/

-- 8️⃣ সব ডেটা মুছে ফেলুন (সাবধান!)
/*
DELETE FROM centre_assignments;
*/

-- =============================================================================
-- ✅ টেবিল সফলভাবে তৈরি হয়েছে!
-- এখন 2_centre_edit.html পেজ ব্যবহার করে দায়িত্ব বন্টন করতে পারবেন।
-- =============================================================================
