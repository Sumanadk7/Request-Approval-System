import { API_URL } from "../services/api";

const API_ORIGIN = API_URL.replace(/\/api\/?$/, "");

export function getAttachmentUrl(path) {
    if (!path) {
        return "";
    }

    if (/^https?:\/\//i.test(path)) {
        return path;
    }

    return `${API_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
}

export function getFileNameFromUrl(path) {
    if (!path) {
        return "";
    }

    const clean = path.split("?")[0];
    const name = clean.substring(clean.lastIndexOf("/") + 1);

    try {
        return decodeURIComponent(name);
    } catch {
        return name;
    }
}

export function formatFileSize(bytes) {
    if (!bytes || bytes <= 0) {
        return "";
    }

    const units = ["B", "KB", "MB", "GB"];
    const index = Math.min(
        Math.floor(Math.log(bytes) / Math.log(1024)),
        units.length - 1
    );

    return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}
