import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui';

/* ── FAQ Data ───────────────────────────────────────────────── */
const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: 'How do I get started with a reading?',
    a: 'Browse our readers page, choose a reader whose specialties resonate with you, and click "Start Reading." You\'ll need to create an account and add a minimum of $5 to your balance before your first session.',
  },
  {
    q: 'What types of readings are available?',
    a: 'SoulSeer offers three types of live readings: Chat (text-based), Voice (audio call), and Video (face-to-face). Each reader sets their own per-minute rate for each type, so you can choose what fits your comfort level and budget.',
  },
  {
    q: 'How does billing work?',
    a: 'Readings are billed per minute at the reader\'s listed rate. Charges are deducted from your account balance in real time. You can top up your balance anytime from your dashboard with preset amounts or a custom amount (minimum $5).',
  },
  {
    q: 'Can I get a refund?',
    a: 'If you experience a technical issue during a reading, please contact our support team. We review each case individually and may issue account credits or refunds at our discretion.',
  },
  {
    q: 'Are the readings confidential?',
    a: 'Absolutely. All readings are private sessions between you and your reader. We do not record, monitor, or share any reading content. Your privacy is sacred to us.',
  },
  {
    q: 'What if my reader goes offline during a session?',
    a: 'If a reader disconnects unexpectedly, the session timer pauses automatically. You\'ll have the option to wait for reconnection or end the session. You are only charged for the time you were actively connected.',
  },
  {
    q: 'How do I become a reader on SoulSeer?',
    a: 'Reader accounts are created by our admin team after an application and vetting process. If you\'re a gifted psychic interested in joining our community, please reach out through our contact info below.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept all major credit and debit cards through our secure payment processor, Stripe. All transactions are encrypted and PCI-compliant.',
  },
];

/* ── Accordion Item ─────────────────────────────────────────── */
function AccordionItem({
  question,
  answer,
  isOpen,
  onToggle,
}: {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={`accordion__item ${isOpen ? 'accordion__item--open' : ''}`}>
      <button
        className="accordion__trigger"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={`faq-${question.slice(0, 20).replace(/\s/g, '-')}`}
      >
        <span>{question}</span>
        <span className="accordion__chevron" aria-hidden="true">▼</span>
      </button>
      {isOpen && (
        <div
          className="accordion__content"
          id={`faq-${question.slice(0, 20).replace(/\s/g, '-')}`}
          role="region"
        >
          {answer}
        </div>
      )}
    </div>
  );
}

/* ── Help Page ──────────────────────────────────────────────── */
export function HelpPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleItem = useCallback((index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  }, []);

  return (
    <div className="page-enter">
      <div className="container container--narrow">
        {/* ── Title ──────────────────────────────────── */}
        <section className="section section--hero section--cosmic">
          <h1 className="heading-1">Help Center</h1>
          <p className="hero__tagline">Everything you need to know about SoulSeer</p>
          <div className="divider" />
        </section>

        {/* ── How Readings Work ──────────────────────── */}
        <section className="section">
          <div className="section-title">
            <h2 className="section-title__text">How Readings Work</h2>
            <div className="section-title__divider" />
          </div>
          <div className="grid grid--3">
            <div className="card card--static">
              <div className="text-center flex flex-col gap-3 items-center">
                <span className="empty-state__icon" aria-hidden="true">1️⃣</span>
                <h3 className="heading-4">Choose a Reader</h3>
                <p className="body-text">
                  Browse our community of gifted psychics. Filter by specialty,
                  reading type, and see who is online right now.
                </p>
              </div>
            </div>
            <div className="card card--static">
              <div className="text-center flex flex-col gap-3 items-center">
                <span className="empty-state__icon" aria-hidden="true">2️⃣</span>
                <h3 className="heading-4">Fund Your Account</h3>
                <p className="body-text">
                  Add a minimum of $5 to your balance. Choose from preset amounts
                  or enter a custom amount that works for you.
                </p>
              </div>
            </div>
            <div className="card card--static">
              <div className="text-center flex flex-col gap-3 items-center">
                <span className="empty-state__icon" aria-hidden="true">3️⃣</span>
                <h3 className="heading-4">Start Your Reading</h3>
                <p className="body-text">
                  Connect instantly via chat, voice, or video. You&apos;re billed
                  per minute — end the session anytime you choose.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ ────────────────────────────────────── */}
        <section className="section">
          <div className="section-title">
            <h2 className="section-title__text">Frequently Asked Questions</h2>
            <div className="section-title__divider" />
          </div>
          <div className="accordion">
            {FAQ_ITEMS.map((item, i) => (
              <AccordionItem
                key={i}
                question={item.q}
                answer={item.a}
                isOpen={openIndex === i}
                onToggle={() => toggleItem(i)}
              />
            ))}
          </div>
        </section>

        {/* ── Getting Started ────────────────────────── */}
        <section className="section section--cosmic">
          <div className="glass-card text-center">
            <h2 className="section-title__text">Ready to Begin?</h2>
            <p className="body-text" style={{ maxWidth: 500, margin: '0 auto' }}>
              Your spiritual journey awaits. Browse our community of gifted
              readers and connect with someone who resonates with your soul.
            </p>
            <div className="flex gap-4 justify-center" style={{ marginTop: 'var(--space-6)' }}>
              <Link to="/readers">
                <Button variant="primary" size="lg">Browse Readers</Button>
              </Link>
              <Link to="/about">
                <Button variant="secondary" size="lg">Learn More</Button>
              </Link>
            </div>
          </div>
        </section>

        {/* ── Contact ────────────────────────────────── */}
        <section className="section">
          <div className="section-title">
            <h2 className="section-title__text">Contact Us</h2>
            <div className="section-title__divider" />
          </div>
          <div className="card card--static text-center">
            <div className="flex flex-col gap-4 items-center">
              <p className="body-text">
                Can&apos;t find what you&apos;re looking for? Our support team is here to help.
              </p>
              <div className="flex flex-col gap-2">
                <p className="body-text">
                  <strong>Email:</strong>{' '}
                  <a href="mailto:support@soulseer.app">support@soulseer.app</a>
                </p>
                <p className="body-text">
                  <strong>Hours:</strong> Monday – Friday, 9 AM – 9 PM EST
                </p>
              </div>
              <p className="caption">
                We typically respond within 24 hours. For urgent session issues,
                please include your reading ID in your message.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
