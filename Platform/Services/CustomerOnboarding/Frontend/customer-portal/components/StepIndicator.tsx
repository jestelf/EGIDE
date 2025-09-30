import React from 'react';

export interface StepIndicatorProps {
  title: string;
  description: string;
  dueAt?: string;
  onComplete?: () => void;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({ title, description, dueAt, onComplete }) => (
  <article className="step-indicator">
    <header>
      <h2>{title}</h2>
      {dueAt && <time aria-label="Due date">Due {new Date(dueAt).toLocaleString()}</time>}
    </header>
    <p>{description}</p>
    {onComplete && (
      <button type="button" onClick={onComplete}>
        Complete step
      </button>
    )}
  </article>
);
