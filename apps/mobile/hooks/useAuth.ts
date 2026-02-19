import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { authService } from '../services/auth';

export function useAuth() {
  const { user, session, isLoading, isAuthenticated, setUser, setSession, setLoading, signOut } =
    useAuthStore();

  const queryClient = useQueryClient();

  // Restore session on app load
  const sessionQuery = useQuery({
    queryKey: ['auth', 'session'],
    queryFn: async () => {
      const hasSession = await authService.hasStoredSession();
      if (!hasSession) {
        setLoading(false);
        return null;
      }
      try {
        const me = await authService.getMe();
        setUser(me);
        setSession({ accessToken: '', refreshToken: '', expiresAt: 0, user: me });
        return me;
      } catch {
        // Token invalid
        setLoading(false);
        return null;
      } finally {
        setLoading(false);
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authService.login(email, password),
    onSuccess: (data) => {
      setUser(data.user);
      if (data.session) {
        setSession({ ...data.session, user: data.user });
      }
    },
  });

  const signupMutation = useMutation({
    mutationFn: ({
      email,
      password,
      displayName,
    }: {
      email: string;
      password: string;
      displayName?: string;
    }) => authService.signup(email, password, displayName),
    onSuccess: (data) => {
      setUser(data.user);
      if (data.session) {
        setSession({ ...data.session, user: data.user });
      }
    },
  });

  const logoutMutation = useMutation({
    mutationFn: authService.logout,
    onSuccess: () => {
      signOut();
      queryClient.clear();
    },
  });

  return {
    user,
    session,
    isLoading: isLoading || sessionQuery.isLoading,
    isAuthenticated,
    login: loginMutation.mutateAsync,
    signup: signupMutation.mutateAsync,
    logout: logoutMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    isSigningUp: signupMutation.isPending,
    loginError: loginMutation.error,
    signupError: signupMutation.error,
  };
}
