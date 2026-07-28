import { useState } from "react";
import "./StarRating.css";

function StarRating({ slug, avgRating, ratingCount, myRating: initialMyRating, readonly = false }) {
  const [myRating, setMyRating] = useState(initialMyRating || 0);
  const [hover, setHover] = useState(0);
  const [avg, setAvg] = useState(avgRating || 0);
  const [count, setCount] = useState(ratingCount || 0);
  const [saving, setSaving] = useState(false);

  async function handleRate(score) {
    if (readonly || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/recipes/${slug}/rate`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score }),
      });
      if (res.ok) {
        const data = await res.json();
        setMyRating(score);
        setAvg(data.avgRating);
        setCount(data.ratingCount);
      }
    } finally {
      setSaving(false);
    }
  }

  const display = hover || myRating;

  return (
    <div className="star-rating">
      <div className="stars">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={`star ${star <= display ? "filled" : ""} ${star <= (avg || 0) && !display ? "avg" : ""}`}
            onClick={() => handleRate(star)}
            onMouseEnter={() => !readonly && setHover(star)}
            onMouseLeave={() => !readonly && setHover(0)}
            disabled={readonly || saving}
            aria-label={`${star} étoile${star > 1 ? "s" : ""}`}
          >
            ★
          </button>
        ))}
      </div>
      <span className="star-info">
        {avg > 0 ? `${avg.toFixed(1)} / 5 · ${count} avis` : "Pas encore noté"}
      </span>
    </div>
  );
}

export default StarRating;
