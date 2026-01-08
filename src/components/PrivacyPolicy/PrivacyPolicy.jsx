import { Link } from "react-router-dom";
import "./PrivacyPolicy.css";

export default function PrivacyPolicy() {
  return (
    <div className="privacy-policy">
      <Link to="/" className="back-home">
        ← Back to home
      </Link>

      <h1>Privacy Policy</h1>

      <p>
        This Privacy Policy describes how information is collected, used, and
        shared when you visit this website.
      </p>

      <h2>Personal Data</h2>
      <p>
        We do not directly collect any personal data such as name, email address,
        or phone number.
      </p>

      <h2>Cookies</h2>
      <p>
        This website uses cookies to improve user experience and to display
        personalized advertisements.
      </p>

      <h2>Google AdSense</h2>
      <p>
        This site uses Google AdSense, a service provided by Google Inc. Google
        uses cookies, including the DoubleClick cookie, to serve ads based on
        users' visits to this and other websites.
      </p>
      <p>
        Users may opt out of personalized advertising by visiting the Google Ads
        Settings.
      </p>

      <h2>Third-Party Services</h2>
      <p>
        Third-party vendors, including Google, may use cookies or web beacons to
        collect information as a result of ad serving on this website.
      </p>

      <h2>Consent</h2>
      <p>
        By using this website, you consent to this Privacy Policy.
      </p>

      <h2>Updates</h2>
      <p>
        This Privacy Policy may be updated at any time. Changes will be posted on
        this page.
      </p>

      <p className="last-update">
        Last updated: {new Date().toLocaleDateString()}
      </p>
    </div>
  );
}
