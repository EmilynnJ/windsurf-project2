import { useState, useCallback } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { useAuth0 } from '@auth0/auth0-react';
import { useAuth } from '../context/AuthContext';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

const PRESET_AMOUNTS = [
  { label: '$10', value: 1000 },
  { label: '$25', value: 2500 },
  { label: '$50', value: 5000 },
  { label: '$100', value: 10000 },
];

const MIN_AMOUNT = 500; // $5 minimum in cents

interface AddFundsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Inner component that uses Stripe hooks
function PaymentForm({ amount, onSuccess, onCancel }: { 
  amount: number; 
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/dashboard`,
      },
    });

    if (error) {
      setErrorMessage(error.message || 'Payment failed. Please try again.');
      setIsProcessing(false);
    } else {
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      
      {errorMessage && (
        <div style={{ 
          color: '#EF4444', 
          marginTop: '1rem', 
          padding: '0.75rem',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          borderRadius: '8px',
          fontSize: '0.9rem'
        }}>
          {errorMessage}
        </div>
      )}

      <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
        <button
          type="button"
          onClick={onCancel}
          className="btn btn-outline"
          style={{ flex: 1, padding: '0.75rem' }}
          disabled={isProcessing}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          style={{ flex: 1, padding: '0.75rem' }}
          disabled={!stripe || isProcessing}
        >
          {isProcessing ? 'Processing...' : `Pay $${(amount / 100).toFixed(2)}`}
        </button>
      </div>
    </form>
  );
}

// Main modal component
export function AddFundsModal({ isOpen, onClose }: AddFundsModalProps) {
  const { getAccessTokenSilently } = useAuth0();
  const { refreshUser } = useAuth();
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAmountSelect = async (amountInCents: number) => {
    setSelectedAmount(amountInCents);
    setError(null);
    setIsLoading(true);

    try {
      const token = await getAccessTokenSilently();
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

      const response = await fetch(`${apiUrl}/api/payments/create-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ amount: amountInCents }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create payment intent');
      }

      const data = await response.json();
      setClientSecret(data.clientSecret);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize payment');
      setSelectedAmount(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomAmountSubmit = () => {
    const amount = Math.round(parseFloat(customAmount) * 100);
    if (isNaN(amount) || amount < MIN_AMOUNT) {
      setError(`Minimum amount is $${(MIN_AMOUNT / 100).toFixed(2)}`);
      return;
    }
    handleAmountSelect(amount);
  };

  const handlePaymentSuccess = useCallback(async () => {
    // Refresh user balance
    await refreshUser();
    // Close modal
    onClose();
    // Reset state
    setSelectedAmount(null);
    setClientSecret(null);
    setCustomAmount('');
    setError(null);
  }, [refreshUser, onClose]);

  const handleCancel = () => {
    setSelectedAmount(null);
    setClientSecret(null);
    setCustomAmount('');
    setError(null);
  };

  const handleClose = () => {
    onClose();
    // Reset state after a short delay to allow animation
    setTimeout(() => {
      setSelectedAmount(null);
      setClientSecret(null);
      setCustomAmount('');
      setError(null);
    }, 300);
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      padding: '1rem',
    }}>
      <div style={{
        backgroundColor: '#13111A',
        borderRadius: '12px',
        padding: '2rem',
        maxWidth: '500px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        border: '1px solid rgba(255, 105, 180, 0.3)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#FF69B4', margin: 0 }}>
            Add Funds
          </h2>
          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '1.5rem',
              cursor: 'pointer',
              padding: '0.25rem',
            }}
          >
            ×
          </button>
        </div>

        {!clientSecret ? (
          <>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Select an amount to add to your account balance:
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
              {PRESET_AMOUNTS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => handleAmountSelect(preset.value)}
                  disabled={isLoading}
                  className="btn btn-outline"
                  style={{
                    padding: '1rem',
                    textAlign: 'center',
                    borderColor: selectedAmount === preset.value ? '#FF69B4' : undefined,
                    backgroundColor: selectedAmount === preset.value ? 'rgba(255, 105, 180, 0.1)' : undefined,
                  }}
                >
                  <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{preset.label}</div>
                </button>
              ))}
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                Or enter a custom amount (minimum ${(MIN_AMOUNT / 100).toFixed(2)}):
              </p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <span style={{
                    position: 'absolute',
                    left: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                  }}>$</span>
                  <input
                    type="number"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder="0.00"
                    min={(MIN_AMOUNT / 100).toFixed(2)}
                    step="0.01"
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem 0.75rem 2rem',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      backgroundColor: 'rgba(30, 30, 46, 0.5)',
                      color: 'white',
                      fontSize: '1rem',
                    }}
                  />
                </div>
                <button
                  onClick={handleCustomAmountSubmit}
                  disabled={!customAmount || isLoading}
                  className="btn btn-primary"
                  style={{ padding: '0.75rem 1.5rem' }}
                >
                  {isLoading ? 'Loading...' : 'Add'}
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                color: '#EF4444',
                padding: '0.75rem',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderRadius: '8px',
                fontSize: '0.9rem',
                marginBottom: '1rem',
              }}>
                {error}
              </div>
            )}
          </>
        ) : (
          <>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Complete your payment of <strong style={{ color: '#D4AF37' }}>${(selectedAmount! / 100).toFixed(2)}</strong>:
            </p>

            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <PaymentForm
                amount={selectedAmount!}
                onSuccess={handlePaymentSuccess}
                onCancel={handleCancel}
              />
            </Elements>
          </>
        )}
      </div>
    </div>
  );
}
