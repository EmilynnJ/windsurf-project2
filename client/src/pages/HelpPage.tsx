export function HelpPage() {
  const faqs = [
    {
      question: "How do I find a psychic reader?",
      answer: "Browse our verified psychic readers by specialty, availability, or ratings. You can filter by reading type, language, and pricing to find the perfect match for your needs."
    },
    {
      question: "What payment methods do you accept?",
      answer: "We accept all major credit cards, PayPal, and various digital payment methods. Your payment information is securely processed and never stored on our servers."
    },
    {
      question: "How do I know the psychics are legitimate?",
      answer: "All our psychic readers undergo a thorough verification process. We check their credentials, experience, and customer reviews to ensure authenticity and quality."
    },
    {
      question: "Can I cancel or reschedule a reading?",
      answer: "Yes, you can cancel or reschedule a reading up to 24 hours before the scheduled time. Cancellations within 24 hours may incur a fee depending on the psychic's policy."
    },
    {
      question: "How long do readings typically last?",
      answer: "Reading durations vary by psychic and type of reading. Most sessions range from 20 minutes to 1 hour. You can see the typical duration when booking a session."
    },
    {
      question: "Is my personal information secure?",
      answer: "Absolutely. We use industry-standard encryption and security measures to protect your personal information. Your privacy is our top priority."
    }
  ];

  return (
    <div className="help-page" style={{
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Open Sans, Helvetica Neue, sans-serif',
      padding: '2rem 0'
    }}>
      <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 'bold', marginBottom: '1rem' }}>Help Center</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto' }}>
            Find answers to common questions or contact our support team
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', alignItems: 'start' }}>
          {/* Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button className="btn btn-outline" style={{ padding: '0.75rem', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>❓</span>
              <span>Getting Started</span>
            </button>
            <button className="btn btn-outline" style={{ padding: '0.75rem', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>💳</span>
              <span>Payment & Billing</span>
            </button>
            <button className="btn btn-outline" style={{ padding: '0.75rem', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>🔮</span>
              <span>Readings & Sessions</span>
            </button>
            <button className="btn btn-outline" style={{ padding: '0.75rem', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>🔒</span>
              <span>Privacy & Security</span>
            </button>
            <button className="btn btn-outline" style={{ padding: '0.75rem', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>👤</span>
              <span>Account Management</span>
            </button>
            <button className="btn btn-outline" style={{ padding: '0.75rem', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>💬</span>
              <span>Contact Support</span>
            </button>
          </div>

          {/* Main Content */}
          <div>
            <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '1rem' }}>Frequently Asked Questions</h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {faqs.map((faq, index) => (
                  <div key={index}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>{faq.question}</h3>
                    <p style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>{faq.answer}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ padding: '2rem' }}>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '1rem' }}>Still Need Help?</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                Our support team is here to assist you with any questions or concerns.
              </p>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📧</div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>Email Support</h3>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>Get help via email within 24 hours</p>
                  <a href="mailto:support@soulseer.com" style={{ color: 'var(--secondary-purple)', textDecoration: 'none' }}>
                    Contact Us
                  </a>
                </div>
                
                <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>💬</div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>Live Chat</h3>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>Chat with our support team instantly</p>
                  <button className="btn btn-outline">
                    Start Chat
                  </button>
                </div>
                
                <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📖</div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>Knowledge Base</h3>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>Browse our comprehensive help articles</p>
                  <button className="btn btn-outline">
                    Visit KB
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}