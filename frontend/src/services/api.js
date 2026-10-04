
import axios from "axios";

const api = axios.create({
    baseURL: "http://127.0.0.1:8001/api",
});

// Attach access token to every request
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("access");

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Automatically refresh expired access token
api.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        // Only handle 401 once for each request
        if (
            error.response?.status === 401 &&
            !originalRequest._retry
        ) {
            originalRequest._retry = true;

            const refreshToken = localStorage.getItem("refresh");

            if (!refreshToken) {
                return Promise.reject(error);
            }

            try {
                // Use plain axios here so the refresh request
                // does not go through this same interceptor.
                const refreshResponse = await axios.post(
                    "http://127.0.0.1:8001/api/token/refresh/",
                    {
                        refresh: refreshToken,
                    }
                );

                const newAccessToken = refreshResponse.data.access;

                localStorage.setItem("access", newAccessToken);

                // Retry the original request with the new token
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

                return api(originalRequest);
            } catch (refreshError) {
                console.log("Refresh token expired or invalid.");

                localStorage.removeItem("access");
                localStorage.removeItem("refresh");
                localStorage.removeItem("username");
                localStorage.removeItem("role");

                window.location.reload();

                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default api;
