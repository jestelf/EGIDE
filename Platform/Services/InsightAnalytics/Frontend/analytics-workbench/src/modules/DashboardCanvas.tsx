import React from 'react';

export interface WidgetInstance {
  id: string;
  type: 'chart' | 'kpi';
  title: string;
  query: string;
}

export const DashboardCanvas: React.FC<{
  widgets: WidgetInstance[];
  onUpdate: (widgets: WidgetInstance[]) => void;
}> = ({ widgets, onUpdate }) => (
  <section className="dashboard-canvas">
    <h2>Canvas</h2>
    {widgets.length === 0 && <p>No widgets yet</p>}
    <ul>
      {widgets.map(widget => (
        <li key={widget.id}>
          <strong>{widget.title}</strong>
          <code>{widget.query}</code>
          <button type="button" onClick={() => onUpdate(widgets.filter(item => item.id !== widget.id))}>
            Remove
          </button>
        </li>
      ))}
    </ul>
  </section>
);
