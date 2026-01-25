-- Drop the current constraint
ALTER TABLE knowledge_documents 
DROP CONSTRAINT IF EXISTS knowledge_documents_sector_check;

-- Create the new constraint including 'plastics'
ALTER TABLE knowledge_documents 
ADD CONSTRAINT knowledge_documents_sector_check 
CHECK (
  (sector IS NULL) OR 
  (sector = ANY (ARRAY[
    'general', 
    'food_beverage', 
    'pulp_paper', 
    'textile', 
    'plastics',
    'chemical', 
    'pharma', 
    'oil_gas', 
    'metal', 
    'mining', 
    'power', 
    'electronics', 
    'automotive', 
    'cosmetics',
    'cooling_towers',
    'desalination'
  ]::text[]))
);