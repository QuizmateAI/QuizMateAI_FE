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

export const loadWorkspacePage = () => import("@/Pages/Users/Individual/Workspace/WorkspacePage");
export const loadGroupWorkspacePage = () => import("@/Pages/Users/Group/GroupWorkspacePage");

export const preloadWorkspacePage = createRoutePreloader("workspace-page", loadWorkspacePage);
export const preloadGroupWorkspacePage = createRoutePreloader("group-workspace-page", loadGroupWorkspacePage);
