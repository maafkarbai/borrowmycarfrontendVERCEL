// src/components/ButtonAccent.jsx - Simplified Payment Modal (Cash and Card Only)
import { useState, useEffect } from "react";
import {
  X,
  CreditCard,
  Lock,
  CheckCircle,
  AlertCircle,
  MapPin,
  Clock,
  Banknote,
} from "lucide-react";
import API from "../api";

const PaymentModal = ({
  isOpen,
  onClose,
  bookingData,
  onPaymentSuccess,
  onPaymentError,
}) => {
  const [paymentMethod, setPaymentMethod] = useState("stripe");
  const [processing, setProcessing] = useState(false);

  // Form states
  const [cardForm, setCardForm] = useState({
    cardNumber: "",
    expiryDate: "",
    cvv: "",
    cardholderName: "",
    saveCard: false,
  });

  const [cashOnPickupForm, setCashOnPickupForm] = useState({
    meetingLocation: "",
    meetingTime: "",
    notes: "",
    agreeToTerms: false,
  });

  const [errors, setErrors] = useState({});
  const [_savedCards, _setSavedCards] = useState([]);
  const [selectedSavedCard, setSelectedSavedCard] = useState("");

  // Payment Methods (Cash and Card only)
  const paymentMethods = [
    {
      id: "stripe",
      name: "Credit/Debit Card",
      icon: CreditCard,
      description: "Pay securely with Visa, Mastercard, or American Express",
      processing: "Instant",
      fees: "3.5% + AED 1.50",
    },
    {
      id: "cash_on_pickup",
      name: "Cash on Pickup",
      icon: Banknote,
      description: "Pay cash when you collect the car",
      processing: "At pickup",
      fees: "Free",
    },
  ];

  // Fetch saved cards on modal open
  useEffect(() => {
    if (isOpen) {
      fetchSavedCards();
    }
  }, [isOpen]);

  const fetchSavedCards = async () => {
    try {
      const response = await API.get("/payments/saved-cards");
      _setSavedCards(response.data.data?.cards || []);
    } catch (error) {
      console.error("Failed to fetch saved cards:", error);
    }
  };

  // Calculate fees function
  const calculateFees = () => {
    const baseAmount = bookingData?.totalAmount || 0;
    let fee = 0;
    switch (paymentMethod) {
      case "stripe":
        fee = Math.round(baseAmount * 0.035 + 1.5);
        break;
      case "cash_on_pickup":
        fee = 0;
        break;
      default:
        fee = 0;
    }
    return fee;
  };

  // Validation functions
  const validateStripeForm = () => {
    const newErrors = {};

    if (selectedSavedCard) {
      if (!cardForm.cvv || cardForm.cvv.length < 3) {
        newErrors.cvv = "CVV is required";
      }
    } else {
      const cardNumber = cardForm.cardNumber.replace(/\s/g, "");
      if (!cardNumber || cardNumber.length < 13 || cardNumber.length > 19) {
        newErrors.cardNumber = "Valid card number is required";
      }
      if (!cardForm.expiryDate || !/^\d{2}\/\d{2}$/.test(cardForm.expiryDate)) {
        newErrors.expiryDate = "Valid expiry date is required (MM/YY)";
      }
      if (!cardForm.cvv || cardForm.cvv.length < 3) {
        newErrors.cvv = "Valid CVV is required";
      }
      if (!cardForm.cardholderName.trim()) {
        newErrors.cardholderName = "Cardholder name is required";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateCashOnPickup = () => {
    const newErrors = {};
    if (!cashOnPickupForm.meetingLocation.trim()) {
      newErrors.meetingLocation = "Meeting location is required";
    }
    if (!cashOnPickupForm.meetingTime) {
      newErrors.meetingTime = "Meeting time is required";
    }
    if (!cashOnPickupForm.agreeToTerms) {
      newErrors.agreeToTerms = "You must agree to the terms";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Main payment processing function
  const processPayment = async () => {
    setProcessing(true);

    try {
      // Prepare base payment data
      let paymentData = {
        paymentMethod: paymentMethod,
        amount: bookingData.totalAmount,
        currency: "AED",
        bookingId: bookingData.bookingId,
        carId: bookingData.carId,
        carTitle: bookingData.carTitle,
        startDate: bookingData.startDate,
        endDate: bookingData.endDate,
        numberOfDays: bookingData.numberOfDays,
      };

      let isValid = false;

      // Validate and add payment method specific data
      switch (paymentMethod) {
        case "stripe":
          isValid = validateStripeForm();
          if (isValid) {
            paymentData.cardDetails = selectedSavedCard
              ? { savedCardId: selectedSavedCard, cvv: cardForm.cvv }
              : cardForm;
          }
          break;

        case "cash_on_pickup":
          isValid = validateCashOnPickup();
          if (isValid) {
            paymentData.cashDetails = cashOnPickupForm;
          }
          break;
      }

      if (!isValid) {
        setProcessing(false);
        return;
      }

      // Process payment via API
      const response = await API.post("/payments/process", paymentData);

      if (response.data.success) {
        onPaymentSuccess?.(response.data.data);
        onClose();
      } else {
        throw new Error(response.data.message || "Payment failed");
      }
    } catch (error) {
      console.error("Payment error:", error);
      onPaymentError?.(
        error.response?.data?.message || error.message || "Payment failed"
      );
    } finally {
      setProcessing(false);
    }
  };

  // Reset forms when payment method changes
  const handlePaymentMethodChange = (method) => {
    setPaymentMethod(method);
    setErrors({});
    setSelectedSavedCard("");
  };

  if (!isOpen) return null;

  const fees = calculateFees();
  const totalWithFees = (bookingData?.totalAmount || 0) + fees;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Complete Payment</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
            disabled={processing}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Booking Summary */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-medium mb-2">Booking Summary</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Car:</span>
                <span className="font-medium">{bookingData?.carTitle}</span>
              </div>
              <div className="flex justify-between">
                <span>Duration:</span>
                <span>{bookingData?.numberOfDays} days</span>
              </div>
              <div className="flex justify-between">
                <span>Dates:</span>
                <span>
                  {new Date(bookingData?.startDate).toLocaleDateString()} -{" "}
                  {new Date(bookingData?.endDate).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between font-medium border-t pt-2 mt-2">
                <span>Subtotal:</span>
                <span>AED {bookingData?.totalAmount}</span>
              </div>
              {fees > 0 && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Processing fee:</span>
                  <span>AED {fees}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
                <span>Total:</span>
                <span>AED {totalWithFees}</span>
              </div>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="mb-6">
            <h3 className="font-medium mb-4">Select Payment Method</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {paymentMethods.map((method) => {
                const IconComponent = method.icon;
                return (
                  <div
                    key={method.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      paymentMethod === method.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => handlePaymentMethodChange(method.id)}
                  >
                    <div className="flex items-center mb-2">
                      <IconComponent className="h-5 w-5 mr-2" />
                      <span className="font-medium">{method.name}</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {method.description}
                    </p>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Processing: {method.processing}</span>
                      <span>Fees: {method.fees}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Payment Form */}
          <div className="mb-6">
            <h3 className="font-medium mb-4">Payment Details</h3>
            {paymentMethod === "stripe" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Card Number
                  </label>
                  <input
                    type="text"
                    placeholder="1234 5678 9012 3456"
                    value={cardForm.cardNumber}
                    onChange={(e) =>
                      setCardForm(prev => ({...prev, cardNumber: e.target.value}))
                    }
                    className={`w-full p-3 border rounded-lg ${
                      errors.cardNumber ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  {errors.cardNumber && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.cardNumber}
                    </p>
                  )}
                </div>
                {/* Add other card form fields here */}
              </div>
            )}

            {paymentMethod === "cash_on_pickup" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Meeting Location
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Enter meeting location"
                      value={cashOnPickupForm.meetingLocation}
                      onChange={(e) =>
                        setCashOnPickupForm((prev) => ({
                          ...prev,
                          meetingLocation: e.target.value,
                        }))
                      }
                      className={`w-full pl-10 p-3 border rounded-lg ${
                        errors.meetingLocation
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                    />
                  </div>
                  {errors.meetingLocation && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.meetingLocation}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Meeting Time
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <input
                      type="datetime-local"
                      value={cashOnPickupForm.meetingTime}
                      onChange={(e) =>
                        setCashOnPickupForm((prev) => ({
                          ...prev,
                          meetingTime: e.target.value,
                        }))
                      }
                      className={`w-full pl-10 p-3 border rounded-lg ${
                        errors.meetingTime ? "border-red-500" : "border-gray-300"
                      }`}
                    />
                  </div>
                  {errors.meetingTime && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.meetingTime}
                    </p>
                  )}
                </div>

                <div className="flex items-start">
                  <input
                    type="checkbox"
                    id="agreeTerms"
                    checked={cashOnPickupForm.agreeToTerms}
                    onChange={(e) =>
                      setCashOnPickupForm((prev) => ({
                        ...prev,
                        agreeToTerms: e.target.checked,
                      }))
                    }
                    className="mt-1 mr-2"
                  />
                  <label htmlFor="agreeTerms" className="text-sm text-gray-600">
                    I agree to meet at the specified location and time with exact
                    cash amount
                  </label>
                </div>
                {errors.agreeToTerms && (
                  <p className="text-red-500 text-sm mt-1">{errors.agreeToTerms}</p>
                )}
              </div>
            )}
          </div>

          {/* Security Notice */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <Lock className="h-5 w-5 text-green-600 mr-2" />
              <span className="text-sm text-green-800">
                Your payment information is encrypted and secure.
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={processing}
            >
              Cancel
            </button>
            <button
              onClick={processPayment}
              disabled={processing}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {processing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Pay AED {totalWithFees}
                </>
              )}
            </button>
          </div>

          {/* Payment Method Specific Instructions */}
          {paymentMethod === "cash_on_pickup" && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-medium text-yellow-900 mb-2">
                Cash Payment Guidelines
              </h4>
              <div className="text-sm text-yellow-800 space-y-1">
                <p>• Bring exact amount: AED {totalWithFees}</p>
                <p>• Meeting location and time are confirmed upon booking</p>
                <p>• Bring valid ID for verification</p>
                <p>• Late arrival may result in booking cancellation</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;