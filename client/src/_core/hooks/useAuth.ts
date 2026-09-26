import { trpc } from "@/lib/trpc";
import { useCallback, useMemo } from "react";

export function useAuth() {
  const utils = trpc.useUtils();

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: user => utils.auth.me.setData(undefined, user),
  });
  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: user => utils.auth.me.setData(undefined, user),
  });
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => utils.auth.me.setData(undefined, null),
  });

  const login = useCallback(
    (input: { username: string; password: string }) => loginMutation.mutateAsync(input),
    [loginMutation],
  );
  const register = useCallback(
    (input: { username: string; password: string; name?: string }) => registerMutation.mutateAsync(input),
    [registerMutation],
  );
  const logout = useCallback(async () => {
    await logoutMutation.mutateAsync();
  }, [logoutMutation]);

  const state = useMemo(
    () => ({
      user: meQuery.data ?? null,
      loading: meQuery.isLoading,
      isAuthenticated: Boolean(meQuery.data),
    }),
    [meQuery.data, meQuery.isLoading],
  );

  return {
    ...state,
    login,
    loginError: loginMutation.error,
    loginPending: loginMutation.isPending,
    register,
    registerError: registerMutation.error,
    registerPending: registerMutation.isPending,
    logout,
  };
}
