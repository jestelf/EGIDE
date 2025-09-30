import React, { useState } from 'react';
import { WidgetPalette } from './WidgetPalette';
import { DashboardCanvas, WidgetInstance } from './DashboardCanvas';

export const DashboardBuilder: React.FC = () => {
  const [widgets, setWidgets] = useState<WidgetInstance[]>([]);

  return (
    <div className="dashboard-builder">
      <WidgetPalette onAdd={widget => setWidgets([...widgets, widget])} />
      <DashboardCanvas widgets={widgets} onUpdate={setWidgets} />
    </div>
  );
};
