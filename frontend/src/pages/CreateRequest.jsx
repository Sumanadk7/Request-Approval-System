import { useEffect, useState } from "react";

import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";

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

    useEffect(() => {

        const fetchRequestTypes = async () => {

            try {

                const response = await api.get(
                    "/request-types/"
                );

                setRequestTypes(response.data);

            } catch (error) {

                console.log(
                    "Failed to fetch request types:",
                    error
                );

                setError(
                    "Failed to load request types."
                );
            }
        };

        fetchRequestTypes();

    }, []);

    const handleSubmit = async (e) => {

        e.preventDefault();

        setMessage("");
        setError("");

        if (!title || !description || !requestType) {

            setError(
                "Please fill all required fields."
            );

            return;
        }

        setLoading(true);

        try {

            const formData = new FormData();

            formData.append("request_type", requestType);
            formData.append("title", title);
            formData.append("description", description);

            if (attachment) {
                formData.append(
                    "attachment",
                    attachment
                );
            }

            const response = await api.post(
                "/requests/create/",
                formData
            );

            console.log(
                "Created request:",
                response.data
            );

            setMessage(
                "Request submitted successfully."
            );

            setTitle("");
            setDescription("");
            setRequestType("");
            setAttachment(null);

        } catch (error) {

            console.log(
                "Failed to create request:",
                error
            );

            setError(
                "Failed to submit request."
            );

        } finally {

            setLoading(false);

        }
    };

    return (
        <div>

            <Navbar />

            <div className="dashboard-content">

                <Sidebar
                    role="USER"
                    isAdmin={false}
                />

                <main>

                    <div className="page-title">

                        <h1>Create Request</h1>

                        <p>
                            Submit a new request for approval.
                        </p>

                    </div>

                    <div className="section">

                        <div className="section-header">
                            <h2>Request Information</h2>
                        </div>

                        {message && (
                            <p
                                style={{
                                    color: "#15803d",
                                    marginBottom: "15px"
                                }}
                            >
                                {message}
                            </p>
                        )}

                        {error && (
                            <p
                                style={{
                                    color: "#dc2626",
                                    marginBottom: "15px"
                                }}
                            >
                                {error}
                            </p>
                        )}

                        <form onSubmit={handleSubmit}>

                            <div className="form-grid">

                                <div className="form-group">

                                    <label>
                                        Request Type
                                    </label>

                                    <select
                                        value={requestType}
                                        onChange={(e) =>
                                            setRequestType(
                                                e.target.value
                                            )
                                        }
                                    >

                                        <option value="">
                                            Select Request Type
                                        </option>

                                        {requestTypes.map(
                                            (type) => (

                                                <option
                                                    key={type.id}
                                                    value={type.id}
                                                >
                                                    {type.name}
                                                </option>

                                            )
                                        )}

                                    </select>

                                </div>

                                <div className="form-group">

                                    <label>
                                        Title
                                    </label>

                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) =>
                                            setTitle(
                                                e.target.value
                                            )
                                        }
                                        placeholder="Enter request title"
                                    />

                                </div>

                                <div className="form-group full">

                                    <label>
                                        Description
                                    </label>

                                    <textarea
                                        value={description}
                                        onChange={(e) =>
                                            setDescription(
                                                e.target.value
                                            )
                                        }
                                        placeholder="Describe your request..."
                                    />

                                </div>

                                <div className="form-group full">

                                    <label>
                                        Attachment
                                    </label>

                                    <input
                                        type="file"
                                        onChange={(e) =>
                                            setAttachment(
                                                e.target.files[0]
                                            )
                                        }
                                    />

                                </div>

                            </div>

                            <div className="form-actions">

                                <button
                                    type="button"
                                    className="btn btn-clear"
                                    onClick={() => {
                                        setTitle("");
                                        setDescription("");
                                        setRequestType("");
                                        setAttachment(null);
                                        setMessage("");
                                        setError("");
                                    }}
                                >
                                    Clear
                                </button>

                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={loading}
                                >
                                    {loading
                                        ? "Submitting..."
                                        : "Submit Request"}
                                </button>

                            </div>

                        </form>

                    </div>

                </main>

            </div>

        </div>
    );
}

export default CreateRequest;