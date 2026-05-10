export function AboutPage() {
  return (
<<<<<<< HEAD
    <div className="about-page" style={{
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Open Sans, Helvetica Neue, sans-serif',
      padding: '2rem 0'
    }}>
      <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 'bold', marginBottom: '1rem' }}>About SoulSeer</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto' }}>
            Connecting hearts and minds with gifted psychics since 2023
          </p>
        </div>

        <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '1rem' }}>Our Mission</h2>
          <p style={{ color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '1.5rem' }}>
            At SoulSeer, we believe that everyone deserves access to spiritual guidance and insight. Our platform connects 
            individuals with gifted psychics, mediums, and spiritual advisors who offer compassionate and accurate readings.
          </p>
          <p style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>
            We're committed to creating a safe, respectful, and supportive environment where people can explore their 
            spiritual journey and find the clarity they seek.
          </p>
        </div>

        <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '1rem' }}>Meet Our Founder</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '6rem' }}>🧘‍♀️</div>
            <div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.5rem' }}>Alexandra Mystic</h3>
              <p style={{ color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '1rem' }}>
                Alexandra is a certified spiritual counselor with over 15 years of experience in metaphysical studies. 
                After experiencing firsthand the transformative power of authentic psychic guidance, she founded SoulSeer 
                to make spiritual wisdom accessible to everyone.
              </p>
              <p style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>
                "My vision was to create a platform that honors both the sacred art of psychic reading and the seekers 
                who come looking for guidance. SoulSeer represents that vision - a bridge between the spiritual and 
                material worlds."
              </p>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '1rem' }}>Our Values</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem', color: 'var(--accent-gold)' }}>Integrity</h3>
              <p style={{ color: 'var(--text-muted)' }}>We maintain the highest ethical standards in all our interactions</p>
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem', color: 'var(--accent-gold)' }}>Authenticity</h3>
              <p style={{ color: 'var(--text-muted)' }}>We verify all our psychics to ensure genuine abilities</p>
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem', color: 'var(--accent-gold)' }}>Compassion</h3>
              <p style={{ color: 'var(--text-muted)' }}>We approach every seeker with empathy and understanding</p>
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem', color: 'var(--accent-gold)' }}>Accessibility</h3>
              <p style={{ color: 'var(--text-muted)' }}>We make spiritual guidance available to everyone</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
=======
    <div className="page-enter">
      <div className="container">
        {/* ── Hero Title ─────────────────────────────────── */}
        <section className="section section--hero section--cosmic">
          <h1 className="heading-1">About SoulSeer</h1>
          <div className="divider" />
        </section>

        {/* ── Verbatim About Content (Section 17 of Build Guide) ── */}
        <section className="section">
          <div className="glass-card">
            <div className="flex flex-col gap-5">
              <p className="body-text">
                At SoulSeer, we are dedicated to providing ethical, compassionate,
                and judgment-free spiritual guidance. Our mission is twofold: to
                offer clients genuine, heart-centered readings and to uphold fair,
                ethical standards for our readers.
              </p>
              <p className="body-text">
                Founded by psychic medium Emilynn, SoulSeer was created as a
                response to the corporate greed that dominates many psychic
                platforms. Unlike other apps, our readers keep the majority of
                what they earn and play an active role in shaping the platform.
              </p>
              <p className="body-text">
                SoulSeer is more than just an app &mdash; it&apos;s a soul tribe.
                A community of gifted psychics united by our life&apos;s calling:
                to guide, heal, and empower those who seek clarity on their
                journey.
              </p>
            </div>
          </div>
        </section>

        {/* ── Founder ────────────────────────────────────── */}
        <section className="section section--cosmic">
          <div className="glass-card">
            <div className="section-title">
              <h2 className="section-title__text">Our Founder</h2>
              <div className="section-title__divider" />
            </div>
            <div className="founder">
              <img
                src="https://i.postimg.cc/s2ds9RtC/FOUNDER.jpg"
                alt="Emilynn — Psychic Medium and Founder of SoulSeer"
                className="founder__image"
                loading="lazy"
              />
              <div className="flex flex-col gap-3">
                <h3 className="founder__name">Emilynn</h3>
                <p className="founder__title">Psychic Medium &amp; Founder</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
>>>>>>> b0ebfcb9039e92c09e9e94e90785289e0a1daeb8
