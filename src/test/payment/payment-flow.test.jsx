import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen, waitFor, fireEvent } from "@testing-library/react";
import UpgradePlanDialog from "@/Pages/Payment/components/UpgradePlanDialog";
import PaymentResultPage from "@/Pages/Payment/PaymentResultPage";
import { getPurchasablePlans } from "@/api/PaymentAPI";
import { getPaymentByOrderId } from "@/api/ManagementSystemAPI";

let mockQuery = "";
const mockNavigate = vi.fn();
const mockNavigateWithLoading = vi.fn();

vi.mock("@/api/PaymentAPI", () => ({
  getPurchasablePlans: vi.fn(),
}));

vi.mock("@/api/ManagementSystemAPI", () => ({
  getPaymentByOrderId: vi.fn(),
}));

vi.mock("@/hooks/useCurrentSubscription", () => ({
  createPlanSummaryFromPurchase: () => null,
  useCurrentSubscription: () => ({ summary: null }),
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
        "paymentResult.gatewayCurrency": "Gateway currency",
        "paymentResult.orderInfo": "Order Info",
        "paymentResult.payType": "Payment Type",
        "paymentResult.time": "Time",
        "paymentResult.details": "Details",
        "paymentResult.backendRejected": "Payment was rejected by backend",
        "payment.backToPlans": "Back to plans",
        "payment.processing": "Processing",
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
    getPaymentByOrderId.mockResolvedValue({ data: null });
  });

  afterEach(() => {
    vi.useRealTimers();
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
    expect(mockNavigate).toHaveBeenCalledWith("/payments?planId=7&workspaceId=123");
  });

  it("TC_PAY_03: shows success result details from verified backend payment record", async () => {
    mockQuery = "status=success&orderId=ORD123&amount=100000&transId=QUERY-TX&payType=qr&responseTime=1736206800000";
    getPaymentByOrderId.mockResolvedValue({
      data: {
        orderId: "ORD123",
        paymentStatus: "COMPLETED",
        amount: 100000,
        gatewayTransactionId: "TX999",
        gatewayCurrency: "VND",
        gatewayVerifiedAt: "2026-04-24T03:00:00.000Z",
      },
    });

    render(<PaymentResultPage />);

    expect(await screen.findByText("Payment Successful")).toBeInTheDocument();
    expect(screen.getByText("ORD123")).toBeInTheDocument();
    expect(screen.getByText("TX999")).toBeInTheDocument();
    expect(screen.getByText("100.000₫")).toBeInTheDocument();
    expect(screen.getByText("VND")).toBeInTheDocument();
    expect(screen.getByText("QR Code")).toBeInTheDocument();
  });

  it("TC_PAY_03 (cancel/fail path): shows failed status when gateway returns non-success code", async () => {
    mockQuery = "status=failed&resultCode=99&orderId=ORD124";

    render(<PaymentResultPage />);

    await waitFor(() => {
      expect(screen.getByText("Payment Failed")).toBeInTheDocument();
    });
  });

  it("TC_PAY_04: polls pending payment result until backend marks it completed", async () => {
    vi.useFakeTimers();
    mockQuery = "status=success&orderId=ORD-POLL&amount=100000";
    getPaymentByOrderId
      .mockResolvedValueOnce({
        data: { orderId: "ORD-POLL", paymentStatus: "PENDING", amount: 100000 },
      })
      .mockResolvedValueOnce({
        data: { orderId: "ORD-POLL", paymentStatus: "COMPLETED", amount: 100000 },
      });

    render(<PaymentResultPage />);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(getPaymentByOrderId).toHaveBeenCalledTimes(1);
    expect(screen.getAllByText("Processing").length).toBeGreaterThan(0);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });

    expect(getPaymentByOrderId).toHaveBeenCalledTimes(2);
    expect(screen.getByText("Payment Successful")).toBeInTheDocument();
  });

  it("TC_PAY_05: shows failed result when backend rejects a gateway success callback", async () => {
    mockQuery = "status=success&orderId=ORD-MISMATCH&amount=100000&transId=TX-MISMATCH";
    getPaymentByOrderId.mockResolvedValue({
      data: {
        orderId: "ORD-MISMATCH",
        paymentStatus: "FAILED",
        amount: 100000,
      },
    });

    render(<PaymentResultPage />);

    expect(await screen.findByText("Payment Failed")).toBeInTheDocument();
    expect(screen.queryByText("Payment Successful")).not.toBeInTheDocument();
  });
});
