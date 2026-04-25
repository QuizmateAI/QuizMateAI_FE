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
	() => import("@/pages/Users/Individual/Workspace/WorkspacePage"),
);

export const loadGroupWorkspacePage = createNamespacedRouteLoader(
	"/group-workspaces",
	() => import("@/pages/Users/Group/GroupWorkspacePage"),
);

export const loadHomePage = createNamespacedRouteLoader(
	"/home",
	() => import("@/pages/Users/Home/HomePage"),
);

export const preloadWorkspacePage = createRoutePreloader("workspace-page", loadWorkspacePage);
export const preloadGroupWorkspacePage = createRoutePreloader("group-workspace-page", loadGroupWorkspacePage);
export const preloadHomePage = createRoutePreloader("home-page", loadHomePage);

// Các route nhẹ khác (profile/plan/wallet) không cần namespace riêng → preload chỉ code chunk.
export const loadProfilePage = () => import("@/pages/Users/Profile/ProfilePage");
export const loadPlanPage = () => import("@/pages/Users/Plan/PlanPage");
export const loadWalletPage = () => import("@/pages/Users/Credit/WalletPage");
export const loadPaymentPage = () => import("@/pages/Payment/PaymentPage");
export const loadFeedbackSystemLayout = () => import("@/pages/Users/Feedback/FeedbackSystemLayout");

export const preloadProfilePage = createRoutePreloader("profile-page", loadProfilePage);
export const preloadPlanPage = createRoutePreloader("plan-page", loadPlanPage);
export const preloadWalletPage = createRoutePreloader("wallet-page", loadWalletPage);
export const preloadPaymentPage = createRoutePreloader("payment-page", loadPaymentPage);
export const preloadFeedbackSystemLayout = createRoutePreloader("feedback-system-layout", loadFeedbackSystemLayout);

// Heavy dialog chunks mở ngay sau khi tạo workspace — preload cùng với trang để
// khi Suspense fire thì chunk đã sẵn sàng (loại bỏ 1-3s wait).
export const loadIndividualWorkspaceProfileConfigDialog = () =>
  import("@/pages/Users/Individual/Workspace/Components/IndividualWorkspaceProfileConfigDialog");
export const loadGroupWorkspaceProfileConfigDialog = () =>
  import("@/pages/Users/Group/Components/GroupWorkspaceProfileConfigDialog");

export const preloadIndividualWorkspaceProfileConfigDialog = createRoutePreloader(
  "individual-ws-profile-config-dialog",
  loadIndividualWorkspaceProfileConfigDialog,
);
export const preloadGroupWorkspaceProfileConfigDialog = createRoutePreloader(
  "group-ws-profile-config-dialog",
  loadGroupWorkspaceProfileConfigDialog,
);

// Combo preloader: khi user tỏ intent sẽ tạo workspace (hover/focus vào nút Create)
// → warm cả trang và dialog song song để flow create→popup chạy tức thì.
export function preloadIndividualWorkspaceCreateFlow() {
  void preloadWorkspacePage();
  void preloadIndividualWorkspaceProfileConfigDialog();
}
export function preloadGroupWorkspaceCreateFlow() {
  void preloadGroupWorkspacePage();
  void preloadGroupWorkspaceProfileConfigDialog();
}
