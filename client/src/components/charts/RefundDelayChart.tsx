/**
 * MIT License
 *
 * Copyright (c) 2025 Ronan LE MEILLAT
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Line, Bar } from "react-chartjs-2";
import { Card, CardBody, CardFooter, CardHeader } from "@heroui/card";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from "chart.js";

import { RefundDelayData } from "@/types/data";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
);

// Define props interface
interface RefundDelayChartProps {
  refundDelayData: RefundDelayData[];
  averageDelayInDays: number;
}

/**
 * Chart component to visualize refund delays
 *
 * @param props - Component props
 * @param props.refundDelayData - Array of refund delay data objects
 * @param props.averageDelayInDays - Average delay in days across all refunds
 * @returns The refund delay chart component with line and bar charts
 */
export default function RefundDelayChart({
  refundDelayData,
  averageDelayInDays,
}: RefundDelayChartProps) {
  const { t } = useTranslation();
  const [chartType, setChartType] = useState<"line" | "bar">("line");
  const [sortedData, setSortedData] = useState<RefundDelayData[]>([]);

  // Sort data by refund date
  useEffect(() => {
    if (refundDelayData && refundDelayData.length > 0) {
      // Create a copy of the array to avoid modifying props
      const sorted = [...refundDelayData].sort((a, b) => {
        const dateA = new Date(a.refundDate).getTime();
        const dateB = new Date(b.refundDate).getTime();

        return dateA - dateB;
      });

      setSortedData(sorted);
    }
  }, [refundDelayData]);

  // Format dates for display
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString();
  };

  // Prepare data for Chart.js
  const chartData = {
    labels: sortedData.map((item) => formatDate(item.refundDate)),
    datasets: [
      {
        label: t("refund-delay-days"),
        data: sortedData.map((item) => item.delayInDays),
        fill: false,
        borderColor: "rgb(75, 192, 192)",
        backgroundColor: "rgba(75, 192, 192, 0.5)",
        tension: 0.1,
      },
      {
        label: t("purchase-amount"),
        data: sortedData.map((item) => item.purchaseAmount),
        yAxisID: "y1",
        fill: false,
        borderColor: "rgb(255, 99, 132)",
        backgroundColor: "rgba(255, 99, 132, 0.5)",
        borderDash: [5, 5],
      },
      {
        label: t("refund-amount"),
        data: sortedData.map((item) => item.refundAmount),
        yAxisID: "y1",
        fill: false,
        borderColor: "rgb(54, 162, 235)",
        backgroundColor: "rgba(54, 162, 235, 0.5)",
        borderDash: [3, 3],
      },
    ],
  };

  // Chart options configuration
  const chartOptions: ChartOptions<"line" | "bar"> = {
    responsive: true,
    interaction: {
      mode: "index" as const,
      intersect: false,
    },
    scales: {
      y: {
        type: "linear" as const,
        display: true,
        position: "left" as const,
        title: {
          display: true,
          text: t("delay-days"),
        },
        grid: {
          display: true,
        },
      },
      y1: {
        type: "linear" as const,
        display: true,
        position: "right" as const,
        title: {
          display: true,
          text: t("amount"),
        },
        grid: {
          display: false,
        },
      },
      x: {
        title: {
          display: true,
          text: t("refund-date"),
        },
      },
    },
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: t("refund-delay-analysis"),
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            const label = context.dataset.label || "";
            const value = context.parsed.y;
            const dataIndex = context.dataIndex;
            const dataPoint = sortedData[dataIndex];

            if (dataPoint) {
              if (label === t("refund-delay-days")) {
                return `${label}: ${value} ${t("days")}`;
              } else if (
                label === t("purchase-amount") ||
                label === t("refund-amount")
              ) {
                return `${label}: ${value.toFixed(2)} €`;
              }
            }

            return `${label}: ${value}`;
          },
        },
      },
    },
  };

  // Toggle between chart types
  const toggleChartType = () => {
    setChartType((prev) => (prev === "line" ? "bar" : "line"));
  };

  return (
    <Card className="w-full max-w-5xl">
      <CardHeader className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">{t("refund-delay-chart")}</h2>
        <div className="flex gap-2">
          <button
            className={`px-3 py-1 rounded-md ${chartType === "line" ? "bg-primary text-white" : "bg-gray-200"}`}
            onClick={toggleChartType}
          >
            {t("line-chart")}
          </button>
          <button
            className={`px-3 py-1 rounded-md ${chartType === "bar" ? "bg-primary text-white" : "bg-gray-200"}`}
            onClick={toggleChartType}
          >
            {t("bar-chart")}
          </button>
        </div>
      </CardHeader>
      <CardBody className="overflow-x-auto">
        <div className="min-h-[400px]">
          {sortedData.length > 0 ? (
            chartType === "line" ? (
              <Line data={chartData} options={chartOptions} />
            ) : (
              <Bar data={chartData} options={chartOptions} />
            )
          ) : (
            <div className="flex justify-center items-center h-full">
              <p className="text-gray-500">{t("no-refund-data-available")}</p>
            </div>
          )}
        </div>
      </CardBody>
      <CardFooter>
        <div className="flex flex-col sm:flex-row justify-between w-full">
          <div className="text-sm text-gray-500">
            {t("data-based-on-refunds", { count: sortedData.length })}
          </div>
          <div className="font-medium">
            {t("average-delay")}:{" "}
            <span className="text-primary">
              {averageDelayInDays.toFixed(1)} {t("days")}
            </span>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
