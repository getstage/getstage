import { useQuery } from "@tanstack/react-query";
import {
  desktopSessionQueryKey,
  getDesktopSessionCached,
} from "@/lib/auth/session";

export function useDesktopSession() {
  return useQuery({
    queryKey: desktopSessionQueryKey,
    queryFn: getDesktopSessionCached,
    retry: false,
  });
}
