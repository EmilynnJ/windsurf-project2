export function PrivacyPolicyPage() {
  const lastUpdated = "October 21, 2025";

  return (
    <div className="page-enter">
      <div className="container">
        <section className="section section--hero section--cosmic">
          <h1 className="heading-1">Privacy Policy</h1>
          <p className="section-title__sub">Last updated: {lastUpdated}</p>
          <div className="divider" />
        </section>

        <section className="section">
          <div className="glass-card">
            <div className="flex flex-col gap-5">
              <p className="body-text">
                SoulSeer (&ldquo;we&rdquo;, &ldquo;our&rdquo;, &ldquo;us&rdquo;)
                respects your privacy and is committed to protecting the personal
                information you share with us. This Privacy Policy explains what
                information we collect, how we use it, how we protect it, and the
                rights you have over it.
              </p>

              <h2 className="heading-3">1. Information We Collect</h2>
              <p className="body-text">We collect the following categories of data:</p>
              <ul className="body-text" style={{ paddingLeft: "1.5rem", listStyle: "disc" }}>
                <li>
                  <strong>Account information</strong> &mdash; email address, full
                  name, optional username, and profile image you provide at
                  sign-up.
                </li>
                <li>
                  <strong>Reader application data</strong> &mdash; for readers, we
                  additionally collect biographical details, specialties, rate
                  preferences, and Stripe Connect onboarding details required to
                  pay you out.
                </li>
                <li>
                  <strong>Payment data</strong> &mdash; payment method data is
                  collected and stored by Stripe, not by SoulSeer. We retain
                  transaction metadata (amount, currency, time, status) for
                  accounting.
                </li>
                <li>
                  <strong>Session data</strong> &mdash; reading duration, rate,
                  total charged, reader earnings, and chat transcripts associated
                  with a reading.
                </li>
                <li>
                  <strong>Technical data</strong> &mdash; IP address, browser,
                  device identifiers, and standard server logs required to operate
                  the service.
                </li>
              </ul>

              <h2 className="heading-3">2. How We Use Your Information</h2>
              <ul className="body-text" style={{ paddingLeft: "1.5rem", listStyle: "disc" }}>
                <li>Provide, operate, and maintain the SoulSeer platform.</li>
                <li>Process payments, credit account balances, and issue reader payouts.</li>
                <li>Authenticate you and protect your account from fraud and abuse.</li>
                <li>Communicate with you about readings, billing, and service updates.</li>
                <li>Comply with our legal and regulatory obligations.</li>
              </ul>

              <h2 className="heading-3">3. Reading Confidentiality</h2>
              <p className="body-text">
                Chat, voice, and video content exchanged during a reading is
                private between you and your reader. Chat transcripts are stored
                on our servers so you can revisit them after the session ends.
                Voice and video streams are transmitted in real time via our
                streaming provider and are not recorded by SoulSeer.
              </p>

              <h2 className="heading-3">4. Sharing Your Information</h2>
              <p className="body-text">
                We share information only with service providers required to run
                the platform: Auth0 for authentication, Stripe for payments and
                payouts, Agora for real-time voice/video, Cloudinary for image
                storage, and a transactional email provider for account emails.
                We do not sell your personal data.
              </p>

              <h2 className="heading-3">5. Data Retention</h2>
              <p className="body-text">
                We retain account and transaction data for as long as your
                account is active and as required to comply with our tax and
                legal obligations. When you delete your account, we soft-delete
                your profile and strip personally-identifying fields while
                preserving aggregate financial records for compliance.
              </p>

              <h2 className="heading-3">6. Your Rights</h2>
              <p className="body-text">
                You can access, correct, or delete your personal information at
                any time from your dashboard. You may also request a copy of the
                data we hold about you, or ask us to restrict or object to
                processing, by contacting us at{" "}
                <a href="mailto:privacy@soulseer.app">privacy@soulseer.app</a>.
              </p>

              <h2 className="heading-3">7. Children</h2>
              <p className="body-text">
                SoulSeer is not intended for users under the age of 18. We do not
                knowingly collect personal information from children.
              </p>

              <h2 className="heading-3">8. Changes to This Policy</h2>
              <p className="body-text">
                We may update this Privacy Policy from time to time. If we make
                material changes we will notify you by email or through the
                dashboard before the change takes effect.
              </p>

              <h2 className="heading-3">9. Contact</h2>
              <p className="body-text">
                Questions or requests about privacy:{" "}
                <a href="mailto:privacy@soulseer.app">privacy@soulseer.app</a>.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
