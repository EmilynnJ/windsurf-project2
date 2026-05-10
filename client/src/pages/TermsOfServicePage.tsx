export function TermsOfServicePage() {
  const lastUpdated = "May 10, 2026";

  return (
    <div className="page-enter">
      <div className="container">
        <section className="section section--hero section--cosmic">
          <h1 className="heading-1">Terms of Service</h1>
          <p className="section-title__sub">Last updated: {lastUpdated}</p>
          <div className="divider" />
        </section>

        <section className="section">
          <div className="glass-card">
            <div className="flex flex-col gap-5">
              <p className="body-text">
                These Terms of Service (&ldquo;Terms&rdquo;) govern your access
                to and use of SoulSeer (the &ldquo;Service&rdquo;). By creating
                an account or using any feature of the Service you agree to be
                bound by these Terms. If you do not agree, do not use the
                Service.
              </p>

              <h2 className="heading-3">1. Eligibility</h2>
              <p className="body-text">
                You must be at least 18 years old to use SoulSeer. By accepting
                these Terms you represent that you meet this requirement and
                that your use of the Service complies with all laws applicable
                to you.
              </p>

              <h2 className="heading-3">2. Accounts and Roles</h2>
              <p className="body-text">
                Clients may register through Auth0 using social or email
                sign-in. Reader accounts are provisioned only by SoulSeer
                administrators; readers cannot self-register. You are
                responsible for keeping your credentials confidential and for
                all activity on your account.
              </p>

              <h2 className="heading-3">3. Nature of Readings</h2>
              <p className="body-text">
                SoulSeer offers spiritual readings for entertainment and
                self-reflection. Readings are not a substitute for professional
                medical, legal, financial, or psychological advice. Outcomes
                described by a reader are subjective and are not guaranteed.
              </p>

              <h2 className="heading-3">4. Pay-Per-Minute Billing</h2>
              <p className="body-text">
                Clients prepay by adding funds to their account balance through
                Stripe. Each reading is billed by the minute at the reader's
                published rate; the platform retains a 30% service fee and the
                remaining 70% is credited to the reader. Balances are stored
                and charged in U.S. cents (integer values) and are
                non-refundable except as required by law or as expressly
                provided in these Terms.
              </p>

              <h2 className="heading-3">5. Disconnections and Grace Period</h2>
              <p className="body-text">
                If a participant disconnects mid-session, billing pauses and a
                two-minute grace period begins. If the disconnected party
                rejoins within that window the session resumes; otherwise the
                session ends and is billed only for the time actually
                connected.
              </p>

              <h2 className="heading-3">6. Refunds</h2>
              <p className="body-text">
                Refund requests for technical issues or disputed sessions may
                be submitted by contacting support. Refunds are issued at the
                sole discretion of SoulSeer administrators and are processed
                back to the original payment method or as a balance credit.
              </p>

              <h2 className="heading-3">7. Reader Payouts</h2>
              <p className="body-text">
                Readers are paid out through Stripe Connect Express accounts.
                Payouts are initiated by SoulSeer administrators once a
                reader's earned balance reaches the published payout
                threshold. Readers are responsible for completing Stripe
                onboarding and for the tax obligations associated with their
                earnings.
              </p>

              <h2 className="heading-3">8. Acceptable Use</h2>
              <p className="body-text">
                You agree not to use the Service to harass, defame, or
                discriminate against any person; to impersonate another user;
                to upload unlawful, infringing, or harmful content; to attempt
                to circumvent billing, security, or rate-limiting controls; or
                to interfere with the operation of the Service or the
                experience of other users. SoulSeer may suspend or terminate
                accounts that violate this section.
              </p>

              <h2 className="heading-3">9. Community Forum and Content</h2>
              <p className="body-text">
                You retain ownership of the content you post in the community
                forum and grant SoulSeer a non-exclusive, royalty-free license
                to display, store, and moderate that content for the purpose
                of operating the Service. SoulSeer reserves the right to remove
                content or comments that violate these Terms or community
                guidelines.
              </p>

              <h2 className="heading-3">10. Intellectual Property</h2>
              <p className="body-text">
                The Service, including its design, branding, and underlying
                software, is owned by SoulSeer and its licensors. Except for
                the limited license to use the Service granted by these Terms,
                no rights are transferred to you.
              </p>

              <h2 className="heading-3">11. Disclaimers</h2>
              <p className="body-text">
                The Service is provided &ldquo;as is&rdquo; and &ldquo;as
                available&rdquo; without warranties of any kind, express or
                implied. To the fullest extent permitted by law, SoulSeer
                disclaims all warranties of merchantability, fitness for a
                particular purpose, and non-infringement.
              </p>

              <h2 className="heading-3">12. Limitation of Liability</h2>
              <p className="body-text">
                To the maximum extent permitted by law, SoulSeer's aggregate
                liability arising from or related to the Service shall not
                exceed the greater of one hundred U.S. dollars or the amounts
                you paid to SoulSeer in the twelve months preceding the event
                giving rise to the claim.
              </p>

              <h2 className="heading-3">13. Termination</h2>
              <p className="body-text">
                You may close your account at any time from the dashboard.
                SoulSeer may suspend or terminate accounts for violations of
                these Terms, abuse of the Service, or as required by law.
                Termination does not relieve either party of obligations
                accrued before termination.
              </p>

              <h2 className="heading-3">14. Changes to These Terms</h2>
              <p className="body-text">
                We may update these Terms from time to time. Material changes
                will be communicated via email or in-app notice at least seven
                days before they take effect. Your continued use of the
                Service after the effective date constitutes acceptance of the
                updated Terms.
              </p>

              <h2 className="heading-3">15. Governing Law</h2>
              <p className="body-text">
                These Terms are governed by the laws of the State of New York,
                excluding its conflict-of-law principles. The exclusive venue
                for any dispute arising from these Terms is the state and
                federal courts located in New York County, New York.
              </p>

              <h2 className="heading-3">16. Contact</h2>
              <p className="body-text">
                Questions about these Terms can be sent to
                {" "}
                <a
                  href="mailto:hello@soulseerpsychics.com"
                  style={{ color: "#FF69B4" }}
                >
                  hello@soulseerpsychics.com
                </a>
                .
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
