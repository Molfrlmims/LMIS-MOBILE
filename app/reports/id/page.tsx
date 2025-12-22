"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Calendar,
  MapPin,
  Store,
  MessageSquare,
  DollarSign,
  Plus,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { getStoredToken, removeToken } from "@/lib/auth";
import { apiClient, ApiError } from "@/lib/api";

interface ReportItem {
  id: number;
  livestock?: {
    species?: { name: string };
    grade?: { code: string; description: string };
    gender?: string;
  };
  price: number;
  currency: string;
}

interface Report {
  id: number;
  reportDate: string;
  status: "pending" | "accepted" | "rejected";
  market: { id: number; name: string };
  region: { id: number; name: string };
  items: ReportItem[];
  comments: string;
  createdAt: string;
  updatedAt: string;
}

export default function ViewReportPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
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

      // Fetch report data
      const [reportsData]: [any] = await Promise.all([
        apiClient.getReports(token),
      ]);

      const currentReport: any = reportsData.find(
        (r: Report) => r.id === reportId
      );
      if (!currentReport) {
        toast({
          title: "Error",
          description: "Report not found",
          variant: "destructive",
        });
        router.back();
        return;
      }

      console.log("Current Report:", currentReport);

      setReport(currentReport);
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

  const deleteReportItem = async (itemId: number) => {
    try {
      const token = getStoredToken();
      if (!token) return;

      await apiClient.deleteReportItem(token, reportId, itemId);

      // Update local state
      setReport((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.filter((item) => item.id !== itemId),
            }
          : null
      );

      toast({
        title: "Success",
        description: "Item deleted successfully",
      });
    } catch (error) {
      if (error instanceof ApiError) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to delete item",
          variant: "destructive",
        });
      }
    }
  };

  const deleteReport = async () => {
    setIsDeleting(true);
    try {
      const token = getStoredToken();
      if (!token) return;

      await apiClient.deleteReport(token, reportId);
      toast({
        title: "Success",
        description: "Report deleted successfully",
      });
      router.push("/reports");
    } catch (error) {
      if (error instanceof ApiError) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to delete report",
          variant: "destructive",
        });
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "accepted":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "rejected":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-somali-blue"></div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Report not found</p>
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
          <div className="flex-1">
            <h1 className="text-xl font-bold">Report Details</h1>
            <p className="text-sm text-muted-foreground">ID: {report.id}</p>
          </div>
          <Badge className={getStatusColor(report.status)}>
            {report.status}
          </Badge>
        </motion.div>

        {/* Report Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-0 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Store className="h-5 w-5 text-somali-blue" />
                {report.market.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Report Date</p>
                    <p className="text-sm font-medium">
                      {new Date(report.reportDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Region</p>
                    <p className="text-sm font-medium">{report.region.name}</p>
                  </div>
                </div>
              </div>

              {report.comments && (
                <>
                  <Separator />
                  <div className="flex items-start gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Comments</p>
                      <p className="text-sm">{report.comments}</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Items */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-0 bg-card/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">
                Livestock Items ({report.items.length})
              </CardTitle>
              {report.status === "pending" && (
                <Button
                  size="sm"
                  onClick={() => router.push(`/reports/id/add-item?id=${reportId}`)}
                  className="bg-somali-green hover:bg-somali-green/90"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {report.items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No items in this report</p>
                  {report.status === "pending" && (
                    <p className="text-sm mt-1">Click "Add Item" to start</p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {report.items.map((item, index) => {
                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="border rounded-lg p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <Badge variant="outline">Item {index + 1}</Badge>
                          {report.status === "pending" && (
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  const itemId = item.id;
                                  router.push(
                                    `/reports/id/items/itemid/edit?id=${reportId}&itemid=${itemId}`
                                  );
                                }}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-red-500 hover:text-red-600"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Delete Item
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete this item?
                                      This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteReportItem(item.id)}
                                      className="bg-red-500 hover:bg-red-600"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-muted-foreground">Species</p>
                            <p className="font-medium">
                              {item.livestock?.species?.name || "Unknown   "}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Grade</p>
                            <p className="font-medium">
                              {item.livestock?.grade?.code || "Unknown   "}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Gender</p>
                            <p className="font-medium capitalize">
                              {item.livestock?.gender || "Unknown   "}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Price</p>
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              <p className="font-medium">
                                {item.price} {item.currency.toUpperCase()}
                              </p>
                            </div>
                          </div>
                        </div>

                        {item.livestock?.grade?.description !== "Unknown" && (
                          <div className="text-xs text-muted-foreground">
                            <p>{item.livestock?.grade?.description}</p>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Actions */}
        {report.status === "pending" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex gap-3">
              <Button
                onClick={() => router.push(`/reports/id/edit?id=${reportId}`)}
                className="flex-1 bg-somali-blue hover:bg-somali-blue/90"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Report
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="text-red-500 border-red-200 hover:bg-red-50 bg-transparent"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Report</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this entire report? This
                      action cannot be undone and will remove all items in this
                      report.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={deleteReport}
                      disabled={isDeleting}
                      className="bg-red-500 hover:bg-red-600"
                    >
                      {isDeleting ? "Deleting..." : "Delete Report"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </motion.div>
        )}

        {/* Timestamps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-0 bg-card/50 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                <div>
                  <p>Created</p>
                  <p>{new Date(report.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <p>Updated</p>
                  <p>{new Date(report.updatedAt).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
