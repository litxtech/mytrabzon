import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";
import { supabase } from "@/lib/supabase";
import { Platform } from "react-native";
import Constants from "expo-constants";

export const trpc = createTRPCReact<AppRouter>();

const stripTrailingSlash = (url: string) => url.replace(/\/$/, "");

const resolveFromManifest = () => {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    Constants.expoConfig?.extra?.expoGo?.debuggerHost ??
    Constants.manifest2?.extra?.expoGo?.debuggerHost ??
    Constants.manifest?.debuggerHost ??
    null;

  if (!hostUri) {
    return null;
  }

  const cleaned = hostUri
    .replace(/^exp:\/\//, "")
    .replace(/^https?:\/\//, "");

  const [hostPart, portPartWithPath] = cleaned.split(":");
  const host = hostPart?.split("/")[0] ?? "127.0.0.1";
  const port = portPartWithPath?.split("/")[0];

  if (host.endsWith(".exp.direct")) {
    return `https://${host}`;
  }

  const resolvedPort = port ?? "8081";
  return `http://${host}:${resolvedPort}`;
};

const getBaseUrl = () => {
  const explicit = process.env.EXPO_PUBLIC_RORK_API_BASE_URL?.trim();
  if (explicit) {
    const sanitized = stripTrailingSlash(explicit);
    console.log("tRPC base URL (env)", sanitized);
    return sanitized;
  }

  if (Platform.OS === "web" && typeof window !== "undefined" && window.location?.origin) {
    const origin = stripTrailingSlash(window.location.origin);
    console.log("tRPC base URL (web origin)", origin);
    return origin;
  }

  const manifestUrl = resolveFromManifest();
  if (manifestUrl) {
    const sanitized = stripTrailingSlash(manifestUrl);
    console.log("tRPC base URL (manifest)", sanitized);
    return sanitized;
  }

  const fallback = "http://127.0.0.1:8081";
  console.warn("tRPC base URL falling back to localhost", fallback);
  return fallback;
};

const baseUrl = getBaseUrl();

export const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: `${baseUrl}/api/trpc`,
      transformer: superjson,
      async headers() {
        try {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;

          if (token) {
            return {
              Authorization: `Bearer ${token}`,
            };
          }
        } catch (error) {
          console.error("Failed to attach Supabase auth header", error);
        }

        return {};
      },
    }),
  ],
});
