import { useEffect, useRef, useState } from "react";

import api from "../services/api";

const getFileNameFromUrl = (url) => {
  if (!url) {
    return "";
  }

  try {
    const decoded = decodeURIComponent(url.split("?")[0]);
    const parts = decoded.split("/");

    return parts[parts.length - 1] || "attachment";
  } catch {
    return "attachment";
  }
};

function EditRequest({ requestId, onDone, onCancel }) {
  const [requestTypes, setRequestTypes] = useState([]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requestType, setRequestType] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [existingAttachment, setExistingAttachment] = useState("");
  const [deadline, setDeadline] = useState("");
  const [editable, setEditable] = useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");

  const fileInputRef = useRef(null);

  useEffect(() => {
    const loadRequest = async () => {
      try {
        setLoading(true);
        setLoadError("");

        const [detailResponse, typesResponse] = await Promise.all([
          api.get(`/requests/${requestId}/`),
          api.get("/request-types/"),
        ]);

        const detail = detailResponse.data;

        setTitle(detail.title || "");
        setDescription(detail.description || "");
        setRequestType(String(detail.request_type || ""));
        setExistingAttachment(detail.attachment || "");
        setDeadline(detail.action_deadline || "");
        setEditable(
          detail.status === "DRAFT" && Boolean(detail.is_editable),
        );
        setRequestTypes(typesResponse.data || []);
      } catch (err) {
        console.log("Failed to load draft request:", err);

        setLoadError("Failed to load the draft request.");
      } finally {
        setLoading(false);
      }
    };

    loadRequest();
  }, [requestId]);

  const clearAttachment = () => {
    setAttachment(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    if (!title.trim() || !description.trim() || !requestType) {
      setError("Please fill all required fields.");
      return;
    }

    setSaving(true);

    try {
      const formData = new FormData();

      formData.append("request_type", requestType);
      formData.append("title", title.trim());
      formData.append("description", description.trim());

      if (attachment) {
        formData.append("attachment", attachment);
      }

      await api.patch(`/requests/${requestId}/draft/`, formData);

      onDone();
    } catch (err) {
      console.log("Failed to update draft request:", err);

      setError(
        err.response?.data?.detail || "Failed to update the draft request.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <button type="button" className="btn btn-clear" onClick={onCancel}>
          ← Back to My Requests
        </button>
        <p style={{ marginTop: "15px" }}>Loading draft request...</p>
      </>
    );
  }

  if (loadError) {
    return (
      <>
        <button type="button" className="btn btn-clear" onClick={onCancel}>
          ← Back to My Requests
        </button>

        <div className="alert alert-error" style={{ marginTop: "15px" }}>
          {loadError}
        </div>
      </>
    );
  }

  if (!editable) {
    return (
      <>
        <button type="button" className="btn btn-clear" onClick={onCancel}>
          ← Back to My Requests
        </button>

        <div className="alert alert-error" style={{ marginTop: "15px" }}>
          This request is no longer editable. The 24-hour editing window
          has ended and the request has been submitted automatically.
        </div>
      </>
    );
  }

  return (
    <>
      <button type="button" className="btn btn-clear" onClick={onCancel}>
        ← Back to My Requests
      </button>

      <div className="page-title" style={{ marginTop: "10px" }}>
        <h1>Edit Draft Request</h1>

        <p>
          You can update this request until{" "}
          {deadline ? new Date(deadline).toLocaleString() : "the deadline"}.
          It will then be submitted automatically.
        </p>
      </div>

      <div className="section">
        <div className="section-header">
          <h2>Request Information</h2>

          <span className="status draft">Draft</span>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="edit-request-type">
                Request Type
                <span className="required-mark">*</span>
              </label>

              <select
                id="edit-request-type"
                value={requestType}
                onChange={(e) => setRequestType(e.target.value)}
              >
                <option value="">Select Request Type</option>

                {requestTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="edit-request-title">
                Title
                <span className="required-mark">*</span>
              </label>

              <input
                id="edit-request-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter request title"
              />
            </div>

            <div className="form-group full">
              <label htmlFor="edit-request-description">
                Description
                <span className="required-mark">*</span>
              </label>

              <textarea
                id="edit-request-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your request..."
              />
            </div>

            <div className="form-group full">
              <label htmlFor="edit-request-attachment">
                Attachment
              </label>

              <div className="file-upload">
                <input
                  ref={fileInputRef}
                  id="edit-request-attachment"
                  type="file"
                  className="file-upload-input"
                  onChange={(e) =>
                    setAttachment(e.target.files[0] || null)
                  }
                />

                <label
                  htmlFor="edit-request-attachment"
                  className="file-upload-label"
                >
                  Choose File
                </label>

                <span
                  className={`file-upload-name ${
                    attachment ? "has-file" : ""
                  }`}
                >
                  {attachment
                    ? attachment.name
                    : existingAttachment
                      ? getFileNameFromUrl(existingAttachment)
                      : "No file chosen"}
                </span>

                {attachment && (
                  <button
                    type="button"
                    className="btn btn-clear"
                    onClick={clearAttachment}
                  >
                    Remove
                  </button>
                )}
              </div>

              {existingAttachment && (
                <p className="form-note">
                  Uploading a new file will replace the current attachment.
                </p>
              )}
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-clear"
              onClick={onCancel}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

export default EditRequest;
