import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Spinner } from "@heroui/spinner";
import { Divider } from "@heroui/divider";
import { Button } from "@heroui/button";

import DefaultLayout from "@/layouts/default";
import { useSecuredApi } from "@/components/auth0";
import {
  PurchasesStatisticsData,
  PurchaseStatisticsResponse,
  RefundBalanceResponse,
  RefundDelayData,
  RefundDelayResponse,
} from "@/types/data";
import RefundDelayChart from "@/components/charts/RefundDelayChart";
import { Link } from "react-router-dom";
import { cleanAmazonOrderNumber } from "@/utilities/amazon";

export default function StatsPage() {
  // Use specific types for each API endpoint
  const { getJson } = useSecuredApi();

  const { t } = useTranslation();
  const [refundBalance, setRefundBalance] = useState(0);
  const [refundedAmount, setRefundedAmount] = useState(0);
  const [purchasedAmount, setPurchasedAmount] = useState(0);
  const [purchasesStatistics, setPurchasesStatistics] = useState(
    {} as PurchasesStatisticsData,
  );
  const [averageDelayInDays, setAverageDelayInDays] = useState(0);
  const [refundDelay, setRefundDelay] = useState([] as RefundDelayData[]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [daysFilterInput, setDaysFilterInput] = useState<number | null>(null);
  const [daysFilter, setDaysFilter] = useState<number | null>(null);
  const [statsLimit, setStatsLimit] = useState<{ type: string; value: number } | null>(null);

  // Debounce the days filter input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDaysFilter(daysFilterInput);
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(timer);
  }, [daysFilterInput]);

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    // Build the refund-balance URL with optional parameters
    let balanceUrl = `${import.meta.env.API_BASE_URL}/stats/refund-balance`;
    if (daysFilter) {
      balanceUrl += `?daysLimit=${daysFilter}`;
    }

    Promise.all([
      // Load refund balance data
      getJson(balanceUrl)
        .then((_response) => {
          const response = _response as RefundBalanceResponse & { limit?: { type: string; value: number } };

          if (response.success) {
            setRefundBalance(response.balance);
            setRefundedAmount(response.refundedAmount);
            setPurchasedAmount(response.purchasedAmount);
            if (response.limit) {
              setStatsLimit(response.limit);
            }

            return true;
          }

          return false;
        })
        .catch((error) => {
          console.error("Error fetching balance stats:", error);
          setError("Failed to load refund balance data");

          return false;
        }),

      // Load refund delay data
      getJson(`${import.meta.env.API_BASE_URL}/stats/refund-delay${daysFilter ? `?daysLimit=${daysFilter}` : ""}`)
        .then((_response) => {
          const response = _response as RefundDelayResponse;

          if (response.success) {
            setRefundDelay(response.data);
            setAverageDelayInDays(response.averageDelayInDays);

            return true;
          }

          return false;
        })
        .catch((error) => {
          console.error("Error fetching delay stats:", error);
          setError((prevError) =>
            prevError
              ? `${prevError}, and failed to load refund delay data`
              : "Failed to load refund delay data",
          );

          return false;
        }),

      // Load /api/stats/purchases which returns a PurchasesStatisticsResponse
      getJson(`${import.meta.env.API_BASE_URL}/stats/purchases`)
        .then((_response) => {
          const response = _response as PurchaseStatisticsResponse;

          if (response.success) {
            setPurchasesStatistics(response.data);

            return true;
          }

          return false;
        })
        .catch((error) => {
          console.error("Error fetching purchases stats:", error);
          setError((prevError) =>
            prevError
              ? `${prevError}, and failed to load purchases statistics`
              : "Failed to load purchases statistics",
          );

          return false;
        }),
    ]).finally(() => {
      setIsLoading(false);
    });
  }, [daysFilter]);

  if (isLoading) {
    return (
      <DefaultLayout>
        <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
          <h1 className="text-2xl font-bold">{t("statistics")}</h1>
          <Spinner size="lg" />
          <p>{t("loading")}...</p>
        </section>
      </DefaultLayout>
    );
  }

  if (error) {
    return (
      <DefaultLayout>
        <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
          <h1 className="text-2xl font-bold">{t("statistics")}</h1>
          <div className="p-4 bg-danger-50 text-danger border border-danger-200 rounded-lg">
            <p>{error}</p>
          </div>
        </section>
      </DefaultLayout>
    );
  }

  return (
    <DefaultLayout>
      <section className="flex flex-col items-center justify-center gap-6 py-8 md:py-10">
        <h1 className="text-3xl font-bold">{t("statistics-dashboard")}</h1>

        {/* Filter Controls */}
        <div className="w-full max-w-5xl bg-card p-4 rounded-lg border border-default-200">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold">{t("filter-by-days")}</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  placeholder={t("enter-number-of-days")}
                  value={daysFilterInput || ""}
                  onChange={(e) => setDaysFilterInput(e.target.value ? parseInt(e.target.value) : null)}
                  className="px-3 py-2 border border-default-200 rounded-lg bg-default-100"
                />
                <Button
                  color="primary"
                  onPress={() => setDaysFilterInput(null)}
                >
                  {t("reset")}
                </Button>
              </div>
            </div>
            {statsLimit && (
              <div className="text-sm text-default-500">
                <span>{t("current-limit")}: </span>
                <span className="font-semibold">
                  {statsLimit.type === "days"
                    ? `${statsLimit.value} ${t("days")}`
                    : statsLimit.type === "purchases"
                      ? `${statsLimit.value} ${t("purchases")}`
                      : `${t("default")} (${statsLimit.value})`}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Refund Balance Card */}
          <Card>
            <CardHeader className="flex gap-3">
              <div className="flex flex-col">
                <p className="text-sm text-default-500">
                  {t("refund-balance")}
                </p>
                <p className="text-2xl font-bold">
                  {refundBalance.toFixed(2)} €
                  <span
                    className={`text-sm ml-2 ${refundBalance >= 0 ? "text-success" : "text-danger"}`}
                  >
                    {refundBalance >= 0 ? t("credit") : t("debit")}
                  </span>
                </p>
              </div>
            </CardHeader>
            <CardBody>
              <div className="flex justify-between">
                <div>
                  <p className="text-sm text-default-500">
                    {t("total-purchases")}
                  </p>
                  <p>{purchasedAmount.toFixed(2)} €</p>
                </div>
                <div>
                  <p className="text-sm text-default-500 lowercase">
                    {t("total-refunds")}
                  </p>
                  <p>{refundedAmount.toFixed(2)} €</p>
                </div>
              </div>
              {/* Progress bar showing refund percentage */}
              <div className="mt-4">
                <div className="flex justify-between text-xs mb-1">
                  <span>{t("refund-progress")}</span>
                  <span>
                    {Math.round(
                      (1 -
                        purchasesStatistics.totalNotRefundedAmount /
                        purchasesStatistics.totalPurchaseAmount) *
                      100,
                    )}
                    %
                  </span>
                </div>
                <div className="w-full bg-default-100 rounded-full h-2.5">
                  <div
                    className="bg-primary h-2.5 rounded-full"
                    style={{
                      width: `${(1 - purchasesStatistics.totalNotRefundedAmount / purchasesStatistics.totalPurchaseAmount) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Average Delay Card */}
          <Card>
            <CardHeader className="flex gap-3">
              <div className="flex flex-col">
                <p className="text-sm text-default-500">
                  {t("average-refund-delay")}
                </p>
                <p className="text-2xl font-bold">
                  {averageDelayInDays.toFixed(1)} {t("days")}
                </p>
              </div>
            </CardHeader>
            <CardBody>
              <p className="text-sm text-default-500">
                {t("based-on-count", { count: refundDelay.length })}
              </p>

              {/* Small visualization of average vs target */}
              <div className="mt-4">
                <div className="flex justify-between text-xs mb-1">
                  <span>{t("delay-target")}</span>
                  <span>30 {t("days")}</span>
                </div>
                <div className="w-full bg-default-100 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full ${averageDelayInDays <= 30 ? "bg-success" : "bg-danger"}`}
                    style={{
                      width: `${Math.min((averageDelayInDays / 30) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Refunds Count Card */}
          <Card>
            <CardHeader className="flex gap-3">
              <div className="flex flex-col">
                <p className="text-sm text-default-500">
                  {t("total-refunds-count")}
                </p>
                <p className="text-2xl font-bold">{refundDelay.length}</p>
              </div>
            </CardHeader>
            <CardBody>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between">
                  <p className="text-sm text-default-500">
                    {t("latest-refund")}
                  </p>
                  {refundDelay.length > 0 ? (
                    <p>
                      {new Date(
                        Math.max(
                          ...refundDelay.map((item) =>
                            new Date(item.refundDate).getTime(),
                          ),
                        ),
                      ).toLocaleDateString()}
                    </p>
                  ) : (
                    <p>-</p>
                  )}
                </div>
                <div className="flex justify-between">
                  <p className="text-sm text-default-500">
                    {t("largest-refund")}
                  </p>
                  {refundDelay.length > 0 ? (
                    <p>
                      {Math.max(
                        ...refundDelay.map((item) => item.refundAmount),
                      ).toFixed(2)}{" "}
                      €
                    </p>
                  ) : (
                    <p>-</p>
                  )}
                </div>
                <div className="flex justify-between">
                  <p className="text-sm text-default-500 lowercase">
                    {t("outstanding-amount")}
                  </p>
                  {purchasesStatistics.totalNotRefundedAmount > 0 ? (
                    <p>
                      {purchasesStatistics.totalNotRefundedAmount.toFixed(2)} €
                    </p>
                  ) : (
                    <p>-</p>
                  )}
                </div>
                <div className="flex justify-between">
                  <p className="text-sm text-default-500 lowercase">
                    {t("total-purchases")}
                  </p>
                  {purchasesStatistics.totalPurchaseAmount > 0 ? (
                    <p>
                      {purchasesStatistics.totalPurchaseAmount.toFixed(2)} €
                    </p>
                  ) : (
                    <p>-</p>
                  )}
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        <Divider className="my-4" />

        {/* Refund Delay Chart */}
        <RefundDelayChart
          averageDelayInDays={averageDelayInDays}
          refundDelayData={refundDelay}
        />

        {/* Detailed Refund Delay Table - Only shown if there are items */}
        {refundDelay.length > 0 && (
          <div className="w-full max-w-5xl mt-6">
            <h2 className="text-xl font-semibold mb-3">
              {t("refund-delay-details")}
            </h2>
            <div className="overflow-x-auto bg-card rounded-lg border border-default-200">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-default-100">
                    <th className="p-3 text-left">#</th>
                    <th className="p-3 text-left">{t("purchase-date")}</th>
                    <th className="p-3 text-left">{t("refund-date")}</th>
                    <th className="p-3 text-left">{t("order")}</th>
                    <th className="p-3 text-right">{t("purchase-amount")}</th>
                    <th className="p-3 text-right">{t("refund-amount")}</th>
                    <th className="p-3 text-right">{t("difference")}</th>
                    <th className="p-3 text-right">{t("delay-days")}</th>
                  </tr>
                </thead>
                <tbody>
                  {refundDelay.map((item, index) => (
                    <tr
                      key={item.purchaseId}
                      className={index % 2 === 0 ? "bg-white" : "bg-default-50"}
                    >
                      <td className="p-3">{index + 1}</td>
                      <td className="p-3">
                        {new Date(item.purchaseDate).toLocaleDateString()}
                      </td>
                      <td className="p-3">
                        {new Date(item.refundDate).toLocaleDateString()}
                      </td>
                      <td className="p-3">
                        <Link
                          className="text-blue-500 hover:underline break-keep"
                          target="_blank"
                          to={`${import.meta.env.AMAZON_BASE_URL}${item.order}`}
                        >
                          {cleanAmazonOrderNumber(item.order)}
                        </Link></td>
                      <td className="p-3 text-right">
                        {item.purchaseAmount.toFixed(2)} €
                      </td>
                      <td className="p-3 text-right">
                        {item.refundAmount.toFixed(2)} €
                      </td>
                      <td className="p-3 text-right">
                        <span
                          className={
                            item.refundAmount >= item.purchaseAmount
                              ? "text-success"
                              : "text-danger"
                          }
                        >
                          {(item.refundAmount - item.purchaseAmount).toFixed(2)}{" "}
                          €
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <span
                          className={
                            item.delayInDays <= 30
                              ? "text-success"
                              : "text-danger"
                          }
                        >
                          {item.delayInDays}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </DefaultLayout>
  );
}
