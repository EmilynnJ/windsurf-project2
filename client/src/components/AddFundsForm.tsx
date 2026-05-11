import { useState, useEffect, useCallback, useMemo } from 'react';
import { loadStripe, type Stripe as StripeClient } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Button, Input } from './ui';
import { apiService } from '../services/api';
import { useToast } from './ToastProvider';

/* ── Constants ──────────────────────────────────────────────── */
const PRESET_AMOUNTS = [10, 25, 50, 100]; // dollars
const MIN_AMOUNT = 5;

/* ── Lazy Stripe loader (single instance) ───────────────────── */
let stripePromise: Promise<StripeClient | null> | null = null;
function getStripe(): Promise<StripeClient | null> {
  if (stripePromise) return stripePromise;
  const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
  if (!key) {
    stripePromise = Promise.resolve(null);
    return stripePromise;
  }
  stripePromise = loadStripe(key);
  return stripePromise;
}

/* ── Dark-mystical Stripe Elements appearance ───────────────── */
const stripeAppearance = {
  theme: 'night' as const,
  variables: {
    colorPrimary: '#FF69B4',
    colorBackground: '#13111A',
    colorText: '#FFFFFF',
    colorDanger: '#ff4d6d',
    fontFamily: '"Playfair Display", Georgia, serif',
    borderRadius: '8px',
  },
};

/* ────────────────────────────────────────────────────────────────
   Step 1: Amount selection
   ──────────────────────────────────────────────────────────── */
interface AmountStepProps {
  selectedAmount: number | null;
  setSelectedAmount: (n: number | null) => void;
  customAmount: string;
  setCustomAmount: (s: string) => void;
}

function AmountStep({
  selectedAmount,
  setSelectedAmount,
  customAmount,
  setCustomAmount,
}: AmountStepProps) {
  return (
    <div className="flex flex-col gap-5">
      <p className="body-text">Select an amount or enter a custom value:</p>
      <div className="amount-presets">
        {PRESET_AMOUNTS.map((amt) => (
          <button
            type="button"
            key={amt}
            className={`amount-preset ${selectedAmount === amt ? 'amount-preset--selected' : ''}`}
            onClick={() => {
              setSelectedAmount(amt);
              setCustomAmount('');
            }}
            aria-pressed={selectedAmount === amt}
          >
            ${amt}
          </button>
        ))}
      </div>
      <Input
        label="Custom Amount"
        type="number"
        placeholder="Enter amount..."
        value={customAmount}
        onChange={(e) => {
          setCustomAmount(e.target.value);
          setSelectedAmount(null);
        }}
        help={`Minimum $${MIN_AMOUNT}.00`}
        min={MIN_AMOUNT}
      />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Step 2: Stripe Payment Element + submit
   ──────────────────────────────────────────────────────────── */
interface CardStepProps {
  amountCents: number;
  onSuccess: (amountCents: number) => void;
  onCancel: () => void;
}

function CardStep({ amountCents, onSuccess, onCancel }: CardStepProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { addToast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!stripe || !elements) return;

      setSubmitting(true);
      try {
        const { error, paymentIntent } = await stripe.confirmPayment({
          elements,
          redirect: 'if_required',
          confirmParams: {
            return_url: window.location.href,
          },
        });

        if (error) {
          addToast('error', error.message ?? 'Payment failed. Please try again.');
          setSubmitting(false);
          return;
        }

        if (paymentIntent?.status === 'succeeded') {
          onSuccess(amountCents);
          return;
        }

        if (paymentIntent?.status === 'processing') {
          addToast(
            'info',
            'Payment is processing. Your balance will update once Stripe confirms.',
          );
          onSuccess(0); // Pass 0 to close dialog without adding balance
          return;
        }

        addToast('error', 'Payment did not complete. Please try again.');
      } catch (err) {
        addToast('error', err instanceof Error ? err.message : 'Payment failed.');
      } finally {
        setSubmitting(false);
      }
    },
    [stripe, elements, addToast, amountCents, onSuccess],
  );

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <p className="body-text">
        Adding <strong>${(amountCents / 100).toFixed(2)}</strong> to your balance.
      </p>
      <PaymentElement options={{ layout: 'tabs' }} />
      <div className="flex gap-3 justify-end">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
          Back
        </Button>
        <Button
          type="submit"
          variant="gold"
          loading={submitting}
          disabled={!stripe || !elements || submitting}
        >
          Pay ${(amountCents / 100).toFixed(2)}
        </Button>
      </div>
    </form>
  );
}

/* ────────────────────────────────────────────────────────────────
   Top-level AddFundsForm — renders Step 1 or Step 2
   ──────────────────────────────────────────────────────────── */
export interface AddFundsFormProps {
  /** Called after the PaymentIntent succeeds. */
  onSuccess: (amountCents: number) => void;
  /** Called when the user cancels out of the modal. */
  onCancel: () => void;
}

export function AddFundsForm({ onSuccess, onCancel }: AddFundsFormProps) {
  const { addToast } = useToast();

  const [selectedAmount, setSelectedAmount] = useState<number | null>(25);
  const [customAmount, setCustomAmount] = useState('');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [amountCents, setAmountCents] = useState<number | null>(null);
  const [creatingIntent, setCreatingIntent] = useState(false);

  const effectiveDollars = selectedAmount ?? (customAmount.trim() ? parseFloat(customAmount) : NaN);
  const canContinue =
    Number.isFinite(effectiveDollars) && effectiveDollars >= MIN_AMOUNT;

  const handleContinue = useCallback(async () => {
    if (!canContinue) {
      addToast('error', `Minimum deposit is $${MIN_AMOUNT}.00`);
      return;
    }
    setCreatingIntent(true);
    try {
      const cents = Math.round(effectiveDollars * 100);
      const res = await apiService.post<{ clientSecret: string }>(
        '/api/payments/create-intent',
        { amount: cents },
      );
      if (!res.clientSecret) {
        throw new Error('Stripe did not return a client secret');
      }
      setClientSecret(res.clientSecret);
      setAmountCents(cents);
    } catch (err) {
      addToast(
        'error',
        err instanceof Error ? err.message : 'Could not start payment',
      );
    } finally {
      setCreatingIntent(false);
    }
  }, [canContinue, effectiveDollars, addToast]);

  // Step 2: Stripe Elements — memoize `options` so Elements doesn't reset on every render
  const stripeOptions = useMemo(
    () =>
      clientSecret
        ? { clientSecret, appearance: stripeAppearance }
        : null,
    [clientSecret],
  );

  // Warm up Stripe lazily so the first modal open feels snappier
  useEffect(() => {
    void getStripe();
  }, []);

  if (clientSecret && stripeOptions && amountCents !== null) {
    return (
      <Elements stripe={getStripe()} options={stripeOptions}>
        <CardStep
          amountCents={amountCents}
          onSuccess={onSuccess}
          onCancel={() => {
            setClientSecret(null);
            setAmountCents(null);
          }}
        />
      </Elements>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <AmountStep
        selectedAmount={selectedAmount}
        setSelectedAmount={setSelectedAmount}
        customAmount={customAmount}
        setCustomAmount={setCustomAmount}
      />
      <div className="flex gap-3 justify-end">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={creatingIntent}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="gold"
          onClick={handleContinue}
          loading={creatingIntent}
          disabled={!canContinue || creatingIntent}
        >
          Continue → Payment
        </Button>
      </div>
    </div>
  );
}
