import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <Link to="/" className="flex items-center gap-2 text-sm mb-6" style={{ color: 'var(--color-muted)' }}>
        <ArrowLeft size={16} /> Back
      </Link>
      <h1 className="font-serif text-3xl font-semibold mb-2" style={{ color: 'var(--color-text)' }}>Privacy Policy</h1>
      <p className="text-sm mb-8" style={{ color: 'var(--color-muted)' }}>Last updated: July 2026</p>

      <div className="space-y-6 text-sm leading-relaxed" style={{ color: 'var(--color-text)' }}>
        {[
          {
            title: '1. Information We Collect',
            body: 'We collect information you provide directly to us, such as when you create an account (name, username, email, password), add a recipe, or interact with other users. We also collect usage data to improve the service.'
          },
          {
            title: '2. How We Use Your Information',
            body: 'We use the information we collect to operate and improve Savor, personalize your experience, send notifications you have opted into, and ensure the security of the platform.'
          },
          {
            title: '3. Data Storage',
            body: 'Your data is stored securely on our servers. Passwords are hashed using bcrypt and never stored in plain text. Authentication tokens are stored in secure, httpOnly cookies.'
          },
          {
            title: '4. Sharing',
            body: 'We do not sell your personal data. Recipe content and profile information you mark as public are visible to other users. We do not share personal data with third parties except as required by law.'
          },
          {
            title: '5. Your Rights',
            body: 'You may update or delete your account at any time from your profile settings. You may request a copy of your data or its deletion by contacting us.'
          },
          {
            title: '6. Cookies',
            body: 'We use a single secure httpOnly cookie for authentication. We do not use tracking or advertising cookies.'
          },
          {
            title: '7. Contact',
            body: 'For any privacy-related questions, please reach out through the app.'
          },
        ].map(({ title, body }) => (
          <section key={title}>
            <h2 className="font-serif text-lg font-semibold mb-2" style={{ color: 'var(--color-text)' }}>{title}</h2>
            <p style={{ color: 'var(--color-muted)' }}>{body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
