import React from 'react';

type StepState = 'complete' | 'active' | 'pending';

export interface TimelineItem {
  id: string;
  title: string;
  state: StepState;
  startedAt?: string;
  completedAt?: string;
}

export const Timeline: React.FC<{ items: TimelineItem[] }> = ({ items }) => (
  <ol className="timeline" role="list">
    {items.map(item => (
      <li key={item.id} className={`timeline__item timeline__item--${item.state}`}>
        <header>
          <span className="timeline__title">{item.title}</span>
          <span className="timeline__state" aria-label={`State: ${item.state}`}>{item.state}</span>
        </header>
        <footer>
          {item.startedAt && <time>Started {new Date(item.startedAt).toLocaleString()}</time>}
          {item.completedAt && <time>Completed {new Date(item.completedAt).toLocaleString()}</time>}
        </footer>
      </li>
    ))}
  </ol>
);
