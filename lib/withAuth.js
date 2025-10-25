import { getServerSession } from 'next-auth/next';
import { authOptions } from '../pages/api/auth/[...nextauth]';

export async function requireAuth(req, res, requiredRole = null) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return { authorized: false, session: null, error: 'Chưa đăng nhập' };
  }

  if (requiredRole && session.user.role !== requiredRole) {
    return { 
      authorized: false, 
      session, 
      error: `Yêu cầu quyền ${requiredRole}` 
    };
  }

  return { authorized: true, session, error: null };
}

export async function requireAdmin(req, res) {
  return requireAuth(req, res, 'admin');
}
