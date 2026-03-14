import { Card, Button } from '../components/ui';
import { Link } from 'react-router-dom';

export function AboutPage() {
  return (
    <div className="page-wrapper page-enter">
      <section className="section">
        <div className="container container--narrow">
          <h1 className="text-center" style={{ marginBottom: 'var(--space-2)' }}>
            About SoulSeer
          </h1>
          <p className="text-center" style={{ marginBottom: 'var(--space-10)', color: 'var(--text-muted)' }}>
            Where spiritual guidance meets modern connection
          </p>

          {/* Vision */}
          <Card variant="static" style={{ marginBottom: 'var(--space-6)' }}>
            <h2 style={{ marginBottom: 'var(--space-3)', color: 'var(--accent-pink)' }}>Our Vision</h2>
            <p style={{ lineHeight: 1.9, color: 'var(--text-secondary)' }}>
              SoulSeer is a community-driven platform that connects seekers with gifted
              psychic readers through live chat, voice, and video readings. Our mission is
              to make genuine spiritual guidance accessible, personal, and transformative.
            </p>
            <p style={{ lineHeight: 1.9, color: 'var(--text-secondary)', marginTop: 'var(--space-3)' }}>
              Every reading on SoulSeer is a private, real-time conversation between you
              and your chosen reader. Whether you're seeking clarity about love, career,
              life decisions, or spiritual growth — our community of experienced psychics
              is here to guide you.
            </p>
          </Card>

          {/* How It Works */}
          <h2 className="text-center" style={{ marginBottom: 'var(--space-6)' }}>How It Works</h2>
          <div className="grid grid--3" style={{ marginBottom: 'var(--space-8)' }}>
            {[
              { icon: '🔍', title: 'Find Your Reader', desc: 'Browse profiles, specialties, and reviews to find the perfect guide.' },
              { icon: '💬', title: 'Choose Your Reading', desc: 'Select chat, voice, or video — connect in the way that feels right.' },
              { icon: '✨', title: 'Receive Guidance', desc: 'Per-minute billing means you only pay for the time you need.' },
            ].map((step, i) => (
              <Card key={i} variant="glow-gold" className="text-center">
                <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-3)' }}>{step.icon}</div>
                <h3 style={{ marginBottom: 'var(--space-2)', fontSize: '1.1rem' }}>{step.title}</h3>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>{step.desc}</p>
              </Card>
            ))}
          </div>

          {/* Values */}
          <Card variant="static" style={{ marginBottom: 'var(--space-6)' }}>
            <h2 style={{ marginBottom: 'var(--space-3)', color: 'var(--accent-gold)' }}>What We Believe</h2>
            <ul style={{ paddingLeft: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', lineHeight: 1.8, color: 'var(--text-secondary)' }}>
              <li><strong>Authenticity</strong> — Every reader on our platform is carefully vetted for genuine ability and ethical practice.</li>
              <li><strong>Privacy</strong> — Your readings are completely private. We never share session content.</li>
              <li><strong>Fair Pricing</strong> — Transparent per-minute billing with no hidden fees. Readers set their own rates.</li>
              <li><strong>Community</strong> — Our forum connects seekers and readers for shared learning and spiritual growth.</li>
            </ul>
          </Card>

          {/* CTA */}
          <div className="text-center" style={{ paddingTop: 'var(--space-6)' }}>
            <h2 style={{ marginBottom: 'var(--space-4)' }}>Ready to Begin?</h2>
            <div className="flex gap-4 justify-center">
              <Link to="/readers">
                <Button variant="primary" size="lg">Browse Readers</Button>
              </Link>
              <Link to="/community">
                <Button variant="secondary" size="lg">Join the Community</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
