import { useEffect, useRef, useState } from "react";

import api from "../services/api";

function CreateRequest() {
  const [requestTypes, setRequestTypes] = useState([]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requestType, setRequestType] = useState("");
  const [attachment, setAttachment] = useState(null);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchRequestTypes = async () => {
      try {
        const response = await api.get("/request-types/");
        setRequestTypes(response.data);
      } catch (error) {
        console.log("Failed to fetch request types:", error);

        setError("Failed to load request types.");
      }
    };

    fetchRequestTypes();
  }, []);

  const clearAttachment = () => {
    setAttachment(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setRequestType("");
    clearAttachment();
    setMessage("");
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    if (!title.trim() || !description.trim() || !requestType) {
      setError("Please fill all required fields.");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();

      formData.append("request_type", requestType);
      formData.append("title", title.trim());
      formData.append("description", description.trim());

      if (attachment) {
        formData.append("attachment", attachment);
      }

      await api.post("/requests/create/", formData);

      setMessage(
        "Request saved as a draft. You can edit or delete it in My Requests for the next 24 hours; it will then be submitted automatically.",
      );

      setTitle("");
      setDescription("");
      setRequestType("");
      clearAttachment();
    } catch (error) {
      console.log("Failed to create request:", error);

      setError(
        error.response?.data?.detail || "Failed to submit request.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="page-title">
        <h1>Create Request</h1>

        <p>
          Create a request. You can edit or delete it for 24 hours before
          it is submitted automatically for approval.
        </p>
      </div>

      <div className="section">
        <div className="section-header">
          <h2>Request Information</h2>
        </div>

        {message && (
          <div className="alert alert-success">{message}</div>
        )}

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="request-type">
                Request Type
                <span className="required-mark">*</span>
              </label>

              <select
                id="request-type"
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
              <label htmlFor="request-title">
                Title
                <span className="required-mark">*</span>
              </label>

              <input
                id="request-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter request title"
              />
            </div>

            <div className="form-group full">
              <label htmlFor="request-description">
                Description
                <span className="required-mark">*</span>
              </label>

              <textarea
                id="request-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your request..."
              />
            </div>

            <div className="form-group full">
              <label htmlFor="request-attachment">
                Attachment
              </label>

              <div className="file-upload">
                <input
                  ref={fileInputRef}
                  id="request-attachment"
                  type="file"
                  className="file-upload-input"
                  onChange={(e) =>
                    setAttachment(e.target.files[0] || null)
                  }
                />

                <label
                  htmlFor="request-attachment"
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
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-clear"
              onClick={resetForm}
            >
              Clear
            </button>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? "Saving..." : "Save Request"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

export default CreateRequest;
