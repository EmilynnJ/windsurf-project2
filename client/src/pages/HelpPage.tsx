import { useState } from 'react';
import { Card, Button, SearchInput } from '../components/ui';

interface FAQ {
  question: string;
  answer: string;
  category: string;
}

const FAQS: FAQ[] = [
  { category: 'Getting Started', question: 'How do I get a reading?', answer: 'Browse our readers, choose one who resonates with you, select a reading type (chat, voice, or video), ensure you have funds in your account, and start your session.' },
  { category: 'Getting Started', question: 'What types of readings are available?', answer: 'We offer three types: Chat (text-based), Voice (audio call), and Video (video call). Each reader sets their own rates for the types they offer.' },
  { category: 'Billing', question: 'How does billing work?', answer: 'Readings are billed per minute at the reader\'s set rate. You need a minimum balance of $5.00 to start a session. Billing begins when both parties are connected.' },
  { category: 'Billing', question: 'How do I add funds?', answer: 'Go to your Dashboard → Add Funds tab. Choose a preset amount or enter a custom amount. Payments are processed securely through Stripe.' },
  { category: 'Billing', question: 'Can I get a refund?', answer: 'If you experience technical issues during a reading, contact our support team. We review each case individually and may offer a full or partial refund.' },
  { category: 'Readings', question: 'What if my reader goes offline during a session?', answer: 'If a reader disconnects unexpectedly, you\'ll only be charged for the time you were connected. Any issues can be reported to our support team.' },
  { category: 'Readings', question: 'Are readings private?', answer: 'Absolutely. All reading sessions are private between you and your reader. We do not record, store, or share session content.' },
  { category: 'Account', question: 'How do I become a reader?', answer: 'Reader accounts are created by our admin team. If you\'re interested in becoming a SoulSeer reader, contact us at support@soulseer.app.' },
  { category: 'Account', question: 'How do I change my password?', answer: 'Password management is handled through Auth0. Click "Sign In" and use the "Forgot Password" option on the login page.' },
  { category: 'Community', question: 'How does the community forum work?', answer: 'The community hub is a space to share experiences, ask questions, and connect with other seekers and readers. Create posts, reply to discussions, and engage respectfully.' },
];

export function HelpPage() {
  const [search, setSearch] = useState('');
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const filtered = search
    ? FAQS.filter(
        (f) =>
          f.question.toLowerCase().includes(search.toLowerCase()) ||
          f.answer.toLowerCase().includes(search.toLowerCase())
      )
    : FAQS;

  const categories = [...new Set(filtered.map((f) => f.category))];

  return (
    <div className="page-wrapper page-enter">
      <section className="section">
        <div className="container container--narrow">
          <h1 className="text-center" style={{ marginBottom: 'var(--space-2)' }}>
            Help Center
          </h1>
          <p className="text-center" style={{ marginBottom: 'var(--space-8)', color: 'var(--text-muted)' }}>
            Find answers to common questions
          </p>

          <div style={{ marginBottom: 'var(--space-8)' }}>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search for help..."
            />
          </div>

          {categories.map((cat) => (
            <div key={cat} style={{ marginBottom: 'var(--space-6)' }}>
              <h3 style={{ marginBottom: 'var(--space-3)', color: 'var(--accent-gold)' }}>{cat}</h3>
              <div className="flex flex-col gap-2">
                {filtered
                  .filter((f) => f.category === cat)
                  .map((faq, i) => {
                    const globalIdx = FAQS.indexOf(faq);
                    const isOpen = openIndex === globalIdx;
                    return (
                      <Card key={i} variant="static">
                        <button
                          className="faq-toggle"
                          onClick={() => setOpenIndex(isOpen ? null : globalIdx)}
                          aria-expanded={isOpen}
                          style={{
                            width: '100%',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-primary)',
                            padding: 0,
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '0.95rem',
                            textAlign: 'left',
                          }}
                        >
                          {faq.question}
                          <span style={{ opacity: 0.5, marginLeft: '8px' }}>
                            {isOpen ? '−' : '+'}
                          </span>
                        </button>
                        {isOpen && (
                          <p style={{
                            marginTop: 'var(--space-3)',
                            color: 'var(--text-secondary)',
                            lineHeight: 1.8,
                            fontSize: '0.9rem',
                          }}>
                            {faq.answer}
                          </p>
                        )}
                      </Card>
                    );
                  })}
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="empty-state">
              <div className="empty-state__icon">🔍</div>
              <h3 className="empty-state__title">No Results</h3>
              <p className="empty-state__text">Try different search terms or browse all categories.</p>
              <Button variant="secondary" onClick={() => setSearch('')}>Clear Search</Button>
            </div>
          )}

          {/* Contact */}
          <Card variant="glow-gold" className="text-center" style={{ marginTop: 'var(--space-8)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Still Need Help?</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>
              Our support team is here for you.
            </p>
            <a href="mailto:support@soulseer.app">
              <Button variant="gold">Contact Support</Button>
            </a>
          </Card>
        </div>
      </section>
    </div>
  );
}
