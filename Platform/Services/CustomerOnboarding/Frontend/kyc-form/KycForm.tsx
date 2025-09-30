import React, { useReducer } from 'react';

interface DocumentState {
  id: string;
  status: 'idle' | 'uploading' | 'uploaded' | 'failed';
  error?: string;
}

interface FormState {
  documents: DocumentState[];
  currentStep: number;
}

type Action =
  | { type: 'upload:start'; payload: { id: string } }
  | { type: 'upload:success'; payload: { id: string } }
  | { type: 'upload:error'; payload: { id: string; error: string } }
  | { type: 'next' }
  | { type: 'prev' };

const initialState: FormState = {
  documents: [
    { id: 'passport', status: 'idle' },
    { id: 'selfie', status: 'idle' },
    { id: 'income', status: 'idle' }
  ],
  currentStep: 0
};

function reducer(state: FormState, action: Action): FormState {
  switch (action.type) {
    case 'upload:start':
      return {
        ...state,
        documents: state.documents.map(doc =>
          doc.id === action.payload.id ? { ...doc, status: 'uploading', error: undefined } : doc
        )
      };
    case 'upload:success':
      return {
        ...state,
        documents: state.documents.map(doc =>
          doc.id === action.payload.id ? { ...doc, status: 'uploaded' } : doc
        )
      };
    case 'upload:error':
      return {
        ...state,
        documents: state.documents.map(doc =>
          doc.id === action.payload.id ? { ...doc, status: 'failed', error: action.payload.error } : doc
        )
      };
    case 'next':
      return { ...state, currentStep: Math.min(state.currentStep + 1, state.documents.length - 1) };
    case 'prev':
      return { ...state, currentStep: Math.max(state.currentStep - 1, 0) };
    default:
      return state;
  }
}

export const KycForm: React.FC = () => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const currentDoc = state.documents[state.currentStep];

  const startUpload = () => {
    dispatch({ type: 'upload:start', payload: { id: currentDoc.id } });
    setTimeout(() => {
      if (Math.random() > 0.2) {
        dispatch({ type: 'upload:success', payload: { id: currentDoc.id } });
      } else {
        dispatch({ type: 'upload:error', payload: { id: currentDoc.id, error: 'Network issue' } });
      }
    }, 600);
  };

  return (
    <form className="kyc-form">
      <h1>KYC Verification</h1>
      <p>Step {state.currentStep + 1} of {state.documents.length}</p>

      <section>
        <h2>Upload {currentDoc.id}</h2>
        <button type="button" onClick={startUpload} disabled={currentDoc.status === 'uploading'}>
          {currentDoc.status === 'uploading' ? 'Uploading…' : 'Upload document'}
        </button>
        {currentDoc.error && <p role="alert">{currentDoc.error}</p>}
      </section>

      <footer className="kyc-form__actions">
        <button type="button" onClick={() => dispatch({ type: 'prev' })} disabled={state.currentStep === 0}>
          Previous
        </button>
        <button type="button" onClick={() => dispatch({ type: 'next' })}>
          Next
        </button>
      </footer>
    </form>
  );
};

export default KycForm;
