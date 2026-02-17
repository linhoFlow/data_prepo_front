import type { DataRow } from './dataProcessor';

export interface PreprocessingSession {
    id: string;
    fileName: string;
    date: string;
    rowCount: number;
    columnCount: number;
    transformations: string[];
    data?: DataRow[];
}

function getStorage(isAuthenticated: boolean): Storage {
    return isAuthenticated ? localStorage : sessionStorage;
}

const SESSIONS_KEY = 'dataprep_sessions';

export function saveSession(session: PreprocessingSession, isAuthenticated: boolean): void {
    const storage = getStorage(isAuthenticated);
    const existing = getSessions(isAuthenticated);
    const updated = [session, ...existing.filter((s) => s.id !== session.id)].slice(0, 20);
    storage.setItem(SESSIONS_KEY, JSON.stringify(updated.map(({ data, ...rest }) => rest)));
    // Save data separately for the active session
    if (session.data) {
        storage.setItem(`dataprep_data_${session.id}`, JSON.stringify(session.data));
    }
}

export function getSessions(isAuthenticated: boolean): PreprocessingSession[] {
    const storage = getStorage(isAuthenticated);
    try {
        return JSON.parse(storage.getItem(SESSIONS_KEY) || '[]');
    } catch {
        return [];
    }
}

export function getSessionData(id: string, isAuthenticated: boolean): DataRow[] | null {
    const storage = getStorage(isAuthenticated);
    try {
        const raw = storage.getItem(`dataprep_data_${id}`);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export function deleteSession(id: string, isAuthenticated: boolean): void {
    const storage = getStorage(isAuthenticated);
    const existing = getSessions(isAuthenticated);
    storage.setItem(SESSIONS_KEY, JSON.stringify(existing.filter((s) => s.id !== id)));
    storage.removeItem(`dataprep_data_${id}`);
}
