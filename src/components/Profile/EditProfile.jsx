import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ReactCrop, { centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { useAuth } from "../../contexts/AuthContext";
import "./Profile.css";

function EditProfile() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Crop state
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState();
  const [showCropModal, setShowCropModal] = useState(false);
  const imgRef = useRef(null);
  const fileInputRef = useRef();

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    const API = import.meta.env.VITE_API_URL;
    fetch(`${API}/api/users/${user.id}`)
      .then((r) => r.json())
      .then((p) => {
        setName(p.name || "");
        setBio(p.bio || "");
        if (p.avatarUrl) setAvatarPreview(`${API}${p.avatarUrl}`);
      });
  }, [user]);

  function handleAvatarChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setImageSrc(reader.result); setShowCropModal(true); };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  const onImageLoad = useCallback((e) => {
    imgRef.current = e.currentTarget;
    const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
    const c = centerCrop(makeAspectCrop({ unit: "%", width: 80 }, 1, w, h), w, h);
    setCrop(c);
    setCompletedCrop(c);
  }, []);

  function confirmCrop() {
    const img = imgRef.current;
    if (!img || !completedCrop) return;
    const canvas = document.createElement("canvas");
    const size = 400;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    const scaleX = img.naturalWidth / img.width;
    const scaleY = img.naturalHeight / img.height;
    ctx.drawImage(
      img,
      completedCrop.x * scaleX, completedCrop.y * scaleY,
      completedCrop.width * scaleX, completedCrop.height * scaleY,
      0, 0, size, size
    );
    canvas.toBlob((blob) => {
      const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(blob));
      setShowCropModal(false);
      setImageSrc(null);
    }, "image/jpeg", 0.9);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setSaving(true);

    const formData = new FormData();
    formData.append("name", name);
    formData.append("bio", bio);
    if (avatarFile) formData.append("avatar", avatarFile);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/users/me`, {
        method: "PATCH",
        credentials: "include",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading || !user) return null;

  const API = import.meta.env.VITE_API_URL;

  return (
    <div className="edit-profile-page">
      <div className="edit-profile-card">
        <div className="edit-profile-header">
          <button className="profile-back" onClick={() => navigate(`/profile/${user.id}`)}>← Retour</button>
          <h1>Modifier mon profil</h1>
        </div>

        <form className="edit-profile-form" onSubmit={handleSubmit}>
          {error && <div className="edit-profile-error">{error}</div>}
          {success && <div className="edit-profile-success">Profil mis à jour ✓</div>}

          {/* Avatar */}
          <div className="edit-avatar-section">
            <div className="edit-avatar-preview" onClick={() => fileInputRef.current.click()}>
              {avatarPreview
                ? <img src={avatarPreview} alt="avatar" />
                : <span>{(name || "?")[0]?.toUpperCase()}</span>
              }
              <div className="edit-avatar-overlay">📷</div>
            </div>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp"
              style={{ display: "none" }} onChange={handleAvatarChange} />
          </div>

          {showCropModal && (
            <div className="crop-overlay" onClick={() => setShowCropModal(false)}>
              <div className="crop-modal" onClick={e => e.stopPropagation()}>
                <h3>Recadrer l'avatar</h3>
                <div className="crop-container">
                  <ReactCrop crop={crop} onChange={c => setCrop(c)} onComplete={c => setCompletedCrop(c)} aspect={1}>
                    <img src={imageSrc} alt="crop" onLoad={onImageLoad} className="crop-img" />
                  </ReactCrop>
                </div>
                <div className="crop-actions">
                  <button type="button" className="crop-cancel" onClick={() => setShowCropModal(false)}>Annuler</button>
                  <button type="button" className="crop-confirm" onClick={confirmCrop}>Confirmer</button>
                </div>
              </div>
            </div>
          )}

          <div className="edit-field">
            <label>Nom</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Votre nom" />
          </div>

          <div className="edit-field">
            <label>Bio</label>
            <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Parlez-vous un peu…" rows={3} />
          </div>

          <button type="submit" className="edit-save-btn" disabled={saving}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default EditProfile;
