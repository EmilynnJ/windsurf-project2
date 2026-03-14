export function AboutPage() {
  return (
    <div className="page-enter">
      <div className="container">
        {/* ── Hero Title ─────────────────────────────────── */}
        <section className="section section--hero section--cosmic">
          <h1 className="heading-1">About SoulSeer</h1>
          <div className="divider" />
        </section>

        {/* ── Mission ────────────────────────────────────── */}
        <section className="section">
          <div className="glass-card">
            <div className="section-title">
              <h2 className="section-title__text">Our Mission</h2>
              <div className="section-title__divider" />
            </div>
            <div className="flex flex-col gap-5">
              <p className="body-text">
                SoulSeer was created to bridge the gap between those seeking spiritual
                guidance and genuinely gifted psychic readers. In a world full of
                uncertainty, we believe everyone deserves access to compassionate,
                authentic spiritual insight that can illuminate their path forward.
              </p>
              <p className="body-text">
                Our platform brings together a carefully curated community of psychic
                mediums, tarot readers, clairvoyants, and spiritual advisors — each
                with verified gifts and a deep commitment to helping others navigate
                life&apos;s most profound questions.
              </p>
              <p className="body-text">
                Whether you&apos;re seeking clarity about love, career, life purpose,
                or connection with those who have passed on, SoulSeer provides a safe,
                sacred space for meaningful spiritual experiences through live chat,
                voice, and video readings.
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
                <p className="body-text">
                  Emilynn has been a practicing psychic medium for over a decade,
                  guiding thousands of souls through life&apos;s toughest moments
                  with warmth, honesty, and extraordinary intuitive gifts. Her own
                  journey into the spiritual world began as a child, when she
                  first sensed the presence of energies beyond the visible.
                </p>
                <p className="body-text">
                  Driven by a passion to make genuine spiritual guidance accessible
                  to everyone, Emilynn founded SoulSeer as a community where gifted
                  readers and seekers come together. Her vision is simple: a space
                  where the mystical meets the modern, and where every reading is
                  an opportunity for healing, growth, and connection.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Values ─────────────────────────────────────── */}
        <section className="section">
          <div className="section-title">
            <h2 className="section-title__text">Our Values</h2>
            <div className="section-title__divider" />
          </div>
          <div className="grid grid--3">
            <div className="card card--static">
              <div className="text-center flex flex-col gap-3 items-center">
                <span className="empty-state__icon" aria-hidden="true">✦</span>
                <h3 className="heading-4">Authenticity</h3>
                <p className="body-text">
                  Every reader on our platform is carefully vetted for genuine
                  psychic abilities and a compassionate approach to their craft.
                </p>
              </div>
            </div>
            <div className="card card--static">
              <div className="text-center flex flex-col gap-3 items-center">
                <span className="empty-state__icon" aria-hidden="true">🔮</span>
                <h3 className="heading-4">Connection</h3>
                <p className="body-text">
                  We foster a vibrant spiritual community where seekers and
                  readers support each other on their journeys.
                </p>
              </div>
            </div>
            <div className="card card--static">
              <div className="text-center flex flex-col gap-3 items-center">
                <span className="empty-state__icon" aria-hidden="true">🌙</span>
                <h3 className="heading-4">Accessibility</h3>
                <p className="body-text">
                  Spiritual guidance should be available to all. We offer
                  flexible reading options at a range of price points.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
