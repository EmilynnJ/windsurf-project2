export function AboutPage() {
  return (
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
