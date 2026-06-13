import { convexAuth } from "@convex-dev/auth/server";
import * as handlers from "./lib/auth/handlers";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: handlers.authProviders,
  jwt: handlers.authJwt,
  callbacks: handlers.authCallbacks,
});
