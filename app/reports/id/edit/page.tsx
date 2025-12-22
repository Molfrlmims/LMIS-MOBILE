"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { getStoredToken, removeToken } from "@/lib/auth";
import { apiClient, ApiError } from "@/lib/api";

interface Market {
  id: number;
  name: string;
}

interface Report {
  id: number;
  reportDate: string;
  status: "pending" | "accepted" | "rejected";
  market: { id: number; name: string };
  marketId: number;
  comments: string;
}

interface ReferenceData {
  userWithRelations: {
    markets: Market[];
  };
  currentDate: string;
}

export default function EditReportPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [referenceData, setReferenceData] = useState<ReferenceData | null>(
    null
  );
  const [selectedMarket, setSelectedMarket] = useState<number | null>(null);
  const [reportDate, setReportDate] = useState("");
  const [comments, setComments] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const params = useSearchParams();
  const { toast } = useToast();
  const reportId = Number(params.get("id"));

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    fetchReportAndReference();
  }, [router, reportId]);

  const fetchReportAndReference = async () => {
    try {
      const token = getStoredToken();
      if (!token) return;

      // Fetch both report data and reference data
      const [reportsData, refData]: [any, any] = await Promise.all([
        apiClient.getReports(token),
        apiClient.getReferenceData(token),
      ]);

      const currentReport = reportsData.find((r: Report) => r.id === reportId);
      if (!currentReport) {
        toast({
          title: "Error",
          description: "Report not found",
          variant: "destructive",
        });
        router.back();
        return;
      }

      if (currentReport.status !== "pending") {
        toast({
          title: "Error",
          description: "Only pending reports can be edited",
          variant: "destructive",
        });
        router.back();
        return;
      }

      setReport(currentReport);
      setReferenceData(refData);
      setSelectedMarket(currentReport.marketId || currentReport.market.id);
      setReportDate(currentReport.reportDate.split("T")[0]); // Extract date part
      setComments(currentReport.comments || "");
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          removeToken();
          router.replace("/login");
          return;
        }
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to load report data",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedMarket) {
      toast({
        title: "Validation Error",
        description: "Please select a market",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const token = getStoredToken();
      if (!token) return;

      await apiClient.updateReport(token, reportId, {
        reportDate: new Date(reportDate).toISOString(),
        marketId: selectedMarket,
        status: "pending",
        comments,
      });

      toast({
        title: "Success",
        description: "Report updated successfully!",
      });
      router.push(`/reports/id?id=${reportId}`);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          removeToken();
          router.replace("/login");
          return;
        }
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to update report",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-somali-blue"></div>
      </div>
    );
  }

  if (!report || !referenceData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">
          Report not found or cannot be edited
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 pb-20">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4"
        >
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Edit Report</h1>
            <p className="text-sm text-muted-foreground">ID: {report.id}</p>
          </div>
        </motion.div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Market & Date */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Market & Date</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Market</Label>
                <Select
                  value={selectedMarket?.toString()}
                  onValueChange={(value) =>
                    setSelectedMarket(Number.parseInt(value))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select market" />
                  </SelectTrigger>
                  <SelectContent>
                    {referenceData.userWithRelations.markets.map((market) => (
                      <SelectItem key={market.id} value={market.id.toString()}>
                        {market.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Report Date</Label>
                <Input
                  type="date"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Comments */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Comments</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Add any additional comments..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={4}
              />
            </CardContent>
          </Card>

          {/* Note about items */}
          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
            <CardContent className="pt-6">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>Note:</strong> To edit individual items, save this
                report first, then use the "View Report" page to manage items.
              </p>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedMarket}
            className="w-full h-12 bg-gradient-to-r from-somali-blue to-somali-green hover:from-somali-blue/90 hover:to-somali-green/90"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Updating...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Update Report
              </>
            )}
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
