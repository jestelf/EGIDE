import { useEffect, useState } from 'react';

interface Check {
  id: string;
  title: string;
  state: 'passed' | 'pending' | 'failed';
}

interface Status {
  checks: Check[];
}

const initialStatus: Status = {
  checks: [
    { id: 'pep', title: 'PEP screening', state: 'passed' },
    { id: 'sanctions', title: 'Sanctions lists', state: 'passed' },
    { id: 'behaviour', title: 'Behavioural analytics', state: 'pending' }
  ]
};

export function useKYCStatus(applicantId: string): Status {
  const [status, setStatus] = useState<Status>(initialStatus);

  useEffect(() => {
    let mounted = true;
    const timer = setTimeout(() => {
      if (!mounted) return;
      setStatus(prev => ({
        checks: prev.checks.map(check =>
          check.id === 'behaviour' ? { ...check, state: 'passed' } : check
        )
      }));
    }, 2000);
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [applicantId]);

  return status;
}
