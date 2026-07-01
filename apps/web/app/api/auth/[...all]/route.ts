import { toNextJsHandler } from 'better-auth/next-js';
import { auth } from '@studyflow/auth';

export const { GET, POST } = toNextJsHandler(auth);
