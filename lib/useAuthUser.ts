import { useAuthContext } from "@/components/AuthProvider";

export function useAuthUser() {
  return useAuthContext();
}
