import { preloadRouteNamespaces } from '@/i18n';

const preloadedRoutes = new Map();

function createRoutePreloader(key, loader) {
	return () => {
		if (!preloadedRoutes.has(key)) {
			const promise = loader().catch((error) => {
				preloadedRoutes.delete(key);
				throw error;
			});
			preloadedRoutes.set(key, promise);
		}

		return preloadedRoutes.get(key);
	};
}

function createNamespacedRouteLoader(pathname, loader) {
	return async () => {
		const [module] = await Promise.all([
			loader(),
			preloadRouteNamespaces(pathname),
		]);

		return module;
	};
}

export const loadWorkspacePage = createNamespacedRouteLoader(
	"/workspaces",
	() => import("@/Pages/Users/Individual/Workspace/WorkspacePage"),
);

export const loadGroupWorkspacePage = createNamespacedRouteLoader(
	"/group-workspaces",
	() => import("@/Pages/Users/Group/GroupWorkspacePage"),
);

export const loadHomePage = createNamespacedRouteLoader(
	"/home",
	() => import("@/Pages/Users/Home/HomePage"),
);

export const preloadWorkspacePage = createRoutePreloader("workspace-page", loadWorkspacePage);
export const preloadGroupWorkspacePage = createRoutePreloader("group-workspace-page", loadGroupWorkspacePage);
export const preloadHomePage = createRoutePreloader("home-page", loadHomePage);
