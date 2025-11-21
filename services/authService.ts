
import { UserProfile } from "../types";
import { authenticateUser } from "./sheetService";

const AUTH_KEY = 'nexgen_auth_user';

/**
 * Authenticates a user securely against the backend.
 * Returns the user profile if successful.
 */
export const login = async (identifier: string, pass: string): Promise<UserProfile> => {
    try {
        const user = await authenticateUser(identifier, pass);
        
        if (user && user.isActive) {
            localStorage.setItem(AUTH_KEY, JSON.stringify(user));
            return user;
        }
        throw new Error('Authentication failed');
    } catch (error) {
        // Re-throw to be handled by UI
        throw error;
    }
};

/**
 * Clears the session.
 */
export const logout = () => {
    localStorage.removeItem(AUTH_KEY);
};

/**
 * Checks for an existing session.
 */
export const getCurrentUser = (): UserProfile | null => {
    try {
        const stored = localStorage.getItem(AUTH_KEY);
        return stored ? JSON.parse(stored) : null;
    } catch (e) {
        console.error("Failed to parse user session", e);
        return null;
    }
};
