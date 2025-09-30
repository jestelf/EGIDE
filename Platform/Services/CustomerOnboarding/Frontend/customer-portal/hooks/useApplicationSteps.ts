import { useEffect, useState } from 'react';

interface Step {
  id: string;
  title: string;
  description: string;
  state: 'complete' | 'active' | 'pending';
  startedAt?: string;
  completedAt?: string;
  dueAt?: string;
  onComplete?: (applicantId: string) => void;
}

const defaultSteps: Step[] = [
  {
    id: 'application',
    title: 'Application received',
    description: 'Customer submitted the onboarding application.',
    state: 'complete',
    startedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    completedAt: new Date(Date.now() - 1000 * 60 * 60 * 23).toISOString()
  },
  {
    id: 'documents',
    title: 'Documents review',
    description: 'Compliance team checks uploaded documents and verifies identity.',
    state: 'active',
    startedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    dueAt: new Date(Date.now() + 1000 * 60 * 60 * 6).toISOString(),
    onComplete: () => console.info('Documents review completed')
  },
  {
    id: 'activation',
    title: 'Product activation',
    description: 'Trigger product provisioning workflow and notify customer.',
    state: 'pending',
    onComplete: () => console.info('Activation initiated')
  }
];

export function useApplicationSteps(applicantId: string): Step[] {
  const [steps, setSteps] = useState<Step[]>(defaultSteps);

  useEffect(() => {
    let mounted = true;
    setSteps(defaultSteps.map(step => ({ ...step, applicantId })));
    return () => {
      mounted = false;
    };
  }, [applicantId]);

  return steps;
}
