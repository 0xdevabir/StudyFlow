/** Shared auth types so the API and web agree on the shape of `req.user`. */
export interface SessionUser {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  image?: string | null;
  timezone?: string;
  locale?: string;
}

export interface AuthSession {
  user: SessionUser;
  session: {
    id: string;
    userId: string;
    token: string;
    expiresAt: Date | string;
  };
}
