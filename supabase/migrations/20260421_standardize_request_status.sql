-- Standardize request status from 'fulfilled' to 'approved'
UPDATE public.supply_requests SET status = 'approved' WHERE status = 'fulfilled';

-- Update user_transactions if needed (already mostly using 'Approved')
UPDATE public.user_transactions SET status = 'Approved' WHERE status = 'fulfilled';

-- Add a constraint to prevent invalid status values if desired (Optional, keeping it simple for now)
-- ALTER TABLE public.supply_requests ADD CONSTRAINT valid_status CHECK (status IN ('pending', 'approved', 'rejected'));
