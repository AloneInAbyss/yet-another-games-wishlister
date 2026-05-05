export const routes = {
  home: "/",
  auth: {
    login: "/login",
    confirm: "/auth/confirm",
  },
  app: {
    dashboard: "/dashboard",
  },
} as const;

export const routeAccess = {
  authOnly: [routes.auth.login],
  protected: [routes.app.dashboard],
} as const;
