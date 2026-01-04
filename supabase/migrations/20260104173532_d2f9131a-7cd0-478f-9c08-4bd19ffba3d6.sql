-- Enable REPLICA IDENTITY FULL for real-time updates
ALTER TABLE technologies REPLICA IDENTITY FULL;
ALTER TABLE taxonomy_tipos REPLICA IDENTITY FULL;
ALTER TABLE taxonomy_subcategorias REPLICA IDENTITY FULL;
ALTER TABLE taxonomy_sectores REPLICA IDENTITY FULL;
ALTER TABLE technological_trends REPLICA IDENTITY FULL;
ALTER TABLE projects REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE technologies;
ALTER PUBLICATION supabase_realtime ADD TABLE taxonomy_tipos;
ALTER PUBLICATION supabase_realtime ADD TABLE taxonomy_subcategorias;
ALTER PUBLICATION supabase_realtime ADD TABLE taxonomy_sectores;
ALTER PUBLICATION supabase_realtime ADD TABLE technological_trends;
ALTER PUBLICATION supabase_realtime ADD TABLE projects;