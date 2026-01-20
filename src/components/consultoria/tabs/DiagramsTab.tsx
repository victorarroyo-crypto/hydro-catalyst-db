import React from 'react';
import { DiagramsSection } from '@/components/diagrams/DiagramsSection';

interface DiagramsTabProps {
  projectId: string;
}

export const DiagramsTab: React.FC<DiagramsTabProps> = ({ projectId }) => {
  return <DiagramsSection projectId={projectId} />;
};
