-- Eliminar el constraint actual
ALTER TABLE knowledge_documents 
DROP CONSTRAINT IF EXISTS knowledge_documents_sector_check;

-- Crear el nuevo constraint con todos los sectores (incluyendo cooling_towers y desalination)
ALTER TABLE knowledge_documents 
ADD CONSTRAINT knowledge_documents_sector_check 
CHECK (
  (sector IS NULL) OR 
  (sector = ANY (ARRAY[
    'general', 
    'food_beverage', 
    'pulp_paper', 
    'textile', 
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
  ]))
);