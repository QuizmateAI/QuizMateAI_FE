import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import UpgradePlanDialog from "@/Pages/Payment/components/UpgradePlanDialog";
import PaymentResultPage from "@/Pages/Payment/PaymentResultPage";
import { getPurchasablePlans } from "@/api/PaymentAPI";

let mockQuery = "";
const mockNavigate = vi.fn();
const mockNavigateWithLoading = vi.fn();

vi.mock("@/api/PaymentAPI", () => ({
  getPurchasablePlans: vi.fn(),
}));

vi.mock("@/hooks/useDarkMode", () => ({
  useDarkMode: () => ({ isDarkMode: false, toggleDarkMode: vi.fn() }),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useSearchParams: () => [new URLSearchParams(mockQuery)],
}));

vi.mock("@/hooks/useNavigateWithLoading", () => ({
  useNavigateWithLoading: () => mockNavigateWithLoading,
}));

vi.mock("@/Components/features/Users/UserProfilePopover", () => ({
  default: () => <div data-testid="user-profile-popover" />,
}));

vi.mock("@/Components/ui/button", () => ({
  Button: ({ children, ...props }) => <button {...props}>{children}</button>,
}));

vi.mock("@/Components/ui/dialog", () => ({
  Dialog: ({ open, children }) => (open ? <div data-testid="dialog-root">{children}</div> : null),
  DialogContent: ({ children }) => <div>{children}</div>,
}));

vi.mock("@/Pages/Users/Profile/Components/PlanCard", () => ({
  default: ({ plan, onUpgrade, disabled }) => (
    <button type="button" onClick={() => onUpgrade(plan)} disabled={disabled}>
      {plan.planName} - {plan.price}
    </button>
  ),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key) => {
      const map = {
        "paymentResult.successTitle": "Payment Successful",
        "paymentResult.failTitle": "Payment Failed",
        "paymentResult.orderId": "Order ID",
        "paymentResult.transId": "Transaction ID",
        "paymentResult.amount": "Amount",
        "paymentResult.orderInfo": "Order Info",
        "paymentResult.payType": "Payment Type",
        "paymentResult.time": "Time",
        "paymentResult.details": "Details",
        "payment.backToPlans": "Back to plans",
      };
      return map[key] || key;
    },
    i18n: {
      language: "vi",
      changeLanguage: vi.fn(),
    },
  }),
}));

describe("Payment test cases execution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQuery = "";
  });

  it("TC_PAY_01: shows purchasable plans with expected values", async () => {
    getPurchasablePlans.mockResolvedValue({
      data: [
        { planId: 1, planName: "Pro Monthly", price: 99000 },
        { planId: 2, planName: "Premium Yearly", price: 999000 },
      ],
    });

    render(<UpgradePlanDialog open onOpenChange={vi.fn()} planType="INDIVIDUAL" />);

    expect(await screen.findByText("Pro Monthly - 99000")).toBeInTheDocument();
    expect(screen.getByText("Premium Yearly - 999000")).toBeInTheDocument();
  });

  it("TC_PAY_02: routes to payment with planId and workspaceId for group upgrade", async () => {
    const onOpenChange = vi.fn();

    getPurchasablePlans.mockResolvedValue({
      data: [{ planId: 7, planName: "Group Pro", price: 499000 }],
    });

    render(
      <UpgradePlanDialog
        open
        onOpenChange={onOpenChange}
        planType="GROUP"
        preSelectedWorkspaceId={123}
      />
    );

    fireEvent.click(await screen.findByRole("button", { name: "Group Pro - 499000" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(mockNavigate).toHaveBeenCalledWith("/payment?planId=7&workspaceId=123");
  });

  it("TC_PAY_03: shows success result details from payment callback params", async () => {
    mockQuery = "status=success&orderId=ORD123&amount=100000&transId=TX999&payType=qr&responseTime=1736206800000";

    render(<PaymentResultPage />);

    expect(screen.getByText("Payment Successful")).toBeInTheDocument();
    expect(screen.getByText("ORD123")).toBeInTheDocument();
    expect(screen.getByText("TX999")).toBeInTheDocument();
    expect(screen.getByText("100.000₫")).toBeInTheDocument();
    expect(screen.getByText("QR Code")).toBeInTheDocument();
  });

  it("TC_PAY_03 (cancel/fail path): shows failed status when gateway returns non-success code", async () => {
    mockQuery = "status=failed&resultCode=99&orderId=ORD124";

    render(<PaymentResultPage />);

    await waitFor(() => {
      expect(screen.getByText("Payment Failed")).toBeInTheDocument();
    });
  });
});
