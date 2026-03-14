// ============================================================
// HelpPage — Searchable FAQ & contact info
// ============================================================

import { useState, useMemo } from 'react';

interface FaqItem {
  question: string;
  answer: string;
  category: string;
}

const FAQ_DATA: FaqItem[] = [
  {
    category: 'Getting Started',
    question: 'How do I get a reading?',
    answer:
      'Browse our Readers page to find a psychic that resonates with you. Check their specialties, read reviews, and when they\'re online, click "Start Reading" to begin a chat, voice, or video session.',
  },
  {
    category: 'Getting Started',
    question: 'Do I need an account to get a reading?',
    answer:
      'Yes, you\'ll need to create a free account and add funds to your balance before starting a reading. Sign up takes just a moment through our secure authentication.',
  },
  {
    category: 'Pricing & Payments',
    question: 'How does pricing work?',
    answer:
      'Readings are billed per minute. Each reader sets their own rates for chat, voice, and video sessions. You can see their rates on their profile before starting. Your balance is deducted in real time during the session.',
  },
  {
    category: 'Pricing & Payments',
    question: 'How do I add funds to my account?',
    answer:
      'Go to your Dashboard and click "Add Funds." We accept all major credit and debit cards through our secure payment processor, Stripe.',
  },
  {
    category: 'Pricing & Payments',
    question: 'What happens if my balance runs out during a reading?',
    answer:
      'You\'ll receive a low balance warning when you have less than 2 minutes of session time remaining. If your balance reaches zero, the session will end automatically. Make sure to top up before or during your reading!',
  },
  {
    category: 'Readings',
    question: 'What types of readings are available?',
    answer:
      'We offer three types: Chat (text-based), Voice (audio call), and Video (face-to-face). Not all readers offer every type — check their profile for available options.',
  },
  {
    category: 'Readings',
    question: 'How do I know if a reader is available?',
    answer:
      'Readers who are currently online and available show a green "Online" badge on their profile. The home page also displays currently online readers.',
  },
  {
    category: 'Readings',
    question: 'Can I leave a review after a reading?',
    answer:
      'Yes! After your reading is completed, you\'ll be able to rate your experience and leave a written review. Reviews help other clients find great readers.',
  },
  {
    category: 'Account',
    question: 'How do I become a reader on SoulSeer?',
    answer:
      'We welcome gifted psychics to our community! Contact our team through the support email below. We\'ll review your application and, if approved, set up your reader profile.',
  },
  {
    category: 'Account',
    question: 'How do readers get paid?',
    answer:
      'Readers keep the majority of their earnings. Payouts are processed regularly through Stripe. Reader earnings are tracked in real time on the Reader Dashboard.',
  },
  {
    category: 'Community',
    question: 'What is the Community Hub?',
    answer:
      'The Community Hub is our forum where members discuss spiritual topics, share experiences, ask readers questions, and connect with like-minded souls. Anyone can read posts, but you need an account to comment.',
  },
  {
    category: 'Technical',
    question: 'What devices can I use SoulSeer on?',
    answer:
      'SoulSeer works on any modern web browser — Chrome, Safari, Firefox, or Edge on desktop, tablet, or mobile. For voice and video readings, make sure your microphone and camera permissions are enabled.',
  },
  {
    category: 'Technical',
    question: 'Is my information secure?',
    answer:
      'Absolutely. We use Auth0 for secure authentication and Stripe for payment processing. Your personal data and financial information are encrypted and never shared.',
  },
];

const CATEGORIES = [...new Set(FAQ_DATA.map((f) => f.category))];

export function HelpPage() {
  const [search, setSearch] = useState('');
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredFaq = useMemo(() => {
    let items = FAQ_DATA;
    if (selectedCategory) {
      items = items.filter((f) => f.category === selectedCategory);
    }
    if (search.trim()) {
      const lower = search.toLowerCase();
      items = items.filter(
        (f) =>
          f.question.toLowerCase().includes(lower) ||
          f.answer.toLowerCase().includes(lower)
      );
    }
    return items;
  }, [search, selectedCategory]);

  return (
    <div className="page-content page-enter">
      <div className="container" style={{ maxWidth: '800px' }}>
        <section style={{ textAlign: 'center', padding: '40px 0 32px' }}>
          <h1>Help &amp; FAQ</h1>
          <p style={{ marginTop: '12px', maxWidth: '500px', margin: '12px auto 0' }}>
            Find answers to common questions about SoulSeer.
          </p>
        </section>

        {/* Search */}
        <div style={{ marginBottom: '24px' }}>
          <input
            type="text"
            placeholder="Search questions..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setOpenIndex(null); }}
            style={{ fontSize: '1rem' }}
            aria-label="Search FAQ"
          />
        </div>

        {/* Category filters */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '28px' }}>
          <button
            className={`btn btn-sm ${!selectedCategory ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => { setSelectedCategory(null); setOpenIndex(null); }}
          >
            All
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`btn btn-sm ${selectedCategory === cat ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => { setSelectedCategory(cat); setOpenIndex(null); }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* FAQ Accordion */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filteredFaq.length === 0 ? (
            <div className="empty-state">
              <p>No questions match your search.</p>
            </div>
          ) : (
            filteredFaq.map((item, idx) => (
              <div
                key={idx}
                className="card-static"
                style={{
                  padding: 0,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  border:
                    openIndex === idx
                      ? '1px solid var(--border-gold)'
                      : '1px solid var(--border-subtle)',
                }}
                onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
              >
                <div
                  style={{
                    padding: '16px 20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <div>
                    <span
                      className="badge badge-gold"
                      style={{ fontSize: '0.6rem', marginBottom: '6px' }}
                    >
                      {item.category}
                    </span>
                    <h4
                      style={{
                        fontSize: '0.95rem',
                        fontWeight: 600,
                        color:
                          openIndex === idx
                            ? 'var(--primary-pink)'
                            : 'var(--text-light)',
                      }}
                    >
                      {item.question}
                    </h4>
                  </div>
                  <span
                    style={{
                      color: 'var(--text-light-muted)',
                      fontSize: '1.2rem',
                      transition: 'transform 0.2s',
                      transform: openIndex === idx ? 'rotate(180deg)' : 'none',
                      flexShrink: 0,
                    }}
                  >
                    ▾
                  </span>
                </div>

                {openIndex === idx && (
                  <div
                    style={{
                      padding: '0 20px 16px',
                      borderTop: '1px solid var(--border-subtle)',
                      paddingTop: '14px',
                    }}
                  >
                    <p style={{ fontSize: '0.9rem', lineHeight: 1.7 }}>{item.answer}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="divider" />

        {/* Contact Section */}
        <section style={{ textAlign: 'center', padding: '16px 0 60px' }}>
          <h2 style={{ marginBottom: '16px' }}>Still Need Help?</h2>
          <p style={{ marginBottom: '24px' }}>
            Our support team is here to assist you on your spiritual journey.
          </p>
          <div
            className="card-static"
            style={{
              display: 'inline-flex',
              flexDirection: 'column',
              gap: '12px',
              padding: '24px 32px',
              textAlign: 'left',
            }}
          >
            <div>
              <span style={{ color: 'var(--text-light-muted)', fontSize: '0.85rem' }}>
                Email
              </span>
              <p style={{ color: 'var(--accent-gold)', fontWeight: 600 }}>
                support@soulseer.app
              </p>
            </div>
            <div>
              <span style={{ color: 'var(--text-light-muted)', fontSize: '0.85rem' }}>
                Community
              </span>
              <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
                <a
                  href="https://www.facebook.com/groups/soulseer"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--primary-pink)', fontSize: '0.9rem' }}
                >
                  Facebook Group
                </a>
                <a
                  href="https://discord.gg/soulseer"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--primary-pink)', fontSize: '0.9rem' }}
                >
                  Discord
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
