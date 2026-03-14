// ============================================================
// AboutPage — About SoulSeer with founder story (exact text from guide)
// ============================================================

export function AboutPage() {
  return (
    <div className="page-content page-enter">
      <div className="container" style={{ maxWidth: '800px' }}>
        {/* Header */}
        <section style={{ textAlign: 'center', padding: '40px 0 32px' }}>
          <h1>About SoulSeer</h1>
        </section>

        {/* Mission text — EXACT copy from the corrected build guide */}
        <section className="card-static" style={{ padding: '36px 28px', lineHeight: '1.9' }}>
          <p style={{ fontSize: '1.05rem', marginBottom: '20px' }}>
            At SoulSeer, we are dedicated to providing ethical, compassionate, and
            judgment-free spiritual guidance. Our mission is twofold: to offer clients
            genuine, heart-centered readings and to uphold fair, ethical standards for
            our readers.
          </p>

          <p style={{ fontSize: '1.05rem', marginBottom: '20px' }}>
            Founded by psychic medium Emilynn, SoulSeer was created as a response to
            the corporate greed that dominates many psychic platforms. Unlike other
            apps, our readers keep the majority of what they earn and play an active
            role in shaping the platform.
          </p>

          <p style={{ fontSize: '1.05rem' }}>
            SoulSeer is more than just an app — it's a soul tribe. A community of
            gifted psychics united by our life's calling: to guide, heal, and empower
            those who seek clarity on their journey.
          </p>
        </section>

        <div className="divider" />

        {/* Founder Section */}
        <section style={{ textAlign: 'center', padding: '16px 0 60px' }}>
          <h2 style={{ marginBottom: '24px' }}>Our Founder</h2>

          <div
            style={{
              maxWidth: '320px',
              margin: '0 auto 24px',
              borderRadius: 'var(--radius-xl)',
              overflow: 'hidden',
              border: '2px solid var(--border-gold)',
              boxShadow: '0 8px 40px rgba(212, 175, 55, 0.15)',
            }}
          >
            <img
              src="https://i.postimg.cc/s2ds9RtC/FOUNDER.jpg"
              alt="Emilynn — Founder of SoulSeer, psychic medium"
              style={{ width: '100%', height: 'auto', display: 'block' }}
              loading="lazy"
            />
          </div>

          <h3
            style={{
              fontFamily: 'var(--font-heading)',
              color: 'var(--primary-pink)',
              fontSize: '2rem',
              marginBottom: '8px',
            }}
          >
            Emilynn
          </h3>
          <p
            style={{
              color: 'var(--accent-gold)',
              fontWeight: 600,
              fontFamily: 'var(--font-body)',
              fontSize: '0.95rem',
              marginBottom: '16px',
            }}
          >
            Psychic Medium &amp; Founder
          </p>
          <p style={{ maxWidth: '520px', margin: '0 auto', fontSize: '0.95rem' }}>
            A gifted psychic medium with a passion for ethical spiritual practice,
            Emilynn created SoulSeer to build a platform where both readers and clients
            are treated with the respect and compassion they deserve.
          </p>
        </section>
      </div>
    </div>
  );
}
