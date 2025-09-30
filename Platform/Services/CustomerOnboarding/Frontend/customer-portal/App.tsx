import React, { useMemo } from 'react';
import { StepIndicator } from './components/StepIndicator';
import { Timeline } from './components/Timeline';
import { useApplicationSteps } from './hooks/useApplicationSteps';
import { useKYCStatus } from './hooks/useKYCStatus';

export interface ApplicantSummary {
  id: string;
  fullName: string;
  riskBand: 'low' | 'medium' | 'high';
  nextAction: string;
}

export const CustomerPortal: React.FC<{ applicant: ApplicantSummary }> = ({ applicant }) => {
  const steps = useApplicationSteps(applicant.id);
  const kycStatus = useKYCStatus(applicant.id);

  const currentStep = useMemo(() => steps.find(step => step.state === 'active') ?? steps[0], [steps]);

  return (
    <div className="customer-portal">
      <header className="customer-portal__header">
        <h1>{applicant.fullName}</h1>
        <span className={`risk-tag risk-tag--${applicant.riskBand}`}>Risk: {applicant.riskBand.toUpperCase()}</span>
      </header>

      <section className="customer-portal__timeline">
        <Timeline items={steps} />
      </section>

      <section className="customer-portal__details">
        <StepIndicator
          title={currentStep.title}
          description={currentStep.description}
          dueAt={currentStep.dueAt}
          onComplete={() => currentStep.onComplete?.(applicant.id)}
        />
        <div className="kyc-status">
          <h2>KYC Status</h2>
          <ul>
            {kycStatus.checks.map(check => (
              <li key={check.id} className={`kyc-status__item kyc-status__item--${check.state}`}>
                <span>{check.title}</span>
                <span>{check.state === 'passed' ? '✅' : check.state === 'pending' ? '⏳' : '❌'}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="customer-portal__footer">
        <button onClick={() => currentStep.onComplete?.(applicant.id)}>Mark Step Complete</button>
        <button className="secondary" onClick={() => window.open('/runbooks/onboarding', '_blank')}>Open Runbook</button>
      </footer>
    </div>
  );
};

export default CustomerPortal;
