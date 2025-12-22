"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Calendar,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { getStoredToken, removeToken } from "@/lib/auth";
import { apiClient, ApiError } from "@/lib/api";

interface Report {
  id: number;
  reportDate: string;
  status: "pending" | "accepted" | "rejected";
  market: { id: number; name: string };
  region: { id: number; name: string };
  items: Array<{
    id: number;
    speciesId: number;
    gradeId: number;
    gender: string;
    price: number;
    currency: string;
  }>;
  comments: string;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    fetchReports();
  }, [router]);

  useEffect(() => {
    filterReports();
  }, [reports, searchTerm, statusFilter]);

  const fetchReports = async () => {
    try {
      const token = getStoredToken();
      if (!token) return;

      const data: any = await apiClient.getReports(token);
      setReports(data);
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
          description: "Failed to load reports",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const filterReports = () => {
    let filtered = reports;

    if (searchTerm) {
      filtered = filtered.filter(
        (report) =>
          report.market.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          report.comments.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((report) => report.status === statusFilter);
    }

    setFilteredReports(filtered);
  };

  const deleteReport = async (reportId: number) => {
    try {
      const token = getStoredToken();
      if (!token) return;

      await apiClient.deleteReport(token, reportId);
      setReports(reports.filter((r) => r.id !== reportId));
      toast({
        title: "Success",
        description: "Report deleted successfully",
      });
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
          description: "Failed to delete report",
          variant: "destructive",
        });
      }
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
            <h1 className="text-xl font-bold">My Reports</h1>
            <p className="text-sm text-muted-foreground">
              {filteredReports.length} report
              {filteredReports.length !== 1 ? "s" : ""}
            </p>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search reports..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </motion.div>

        {/* Reports List */}
        <div className="space-y-4">
          {filteredReports.map((report, index) => (
            <motion.div
              key={report.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="border-0 bg-card/50 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {report.market.name}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {new Date(report.reportDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <Badge className={getStatusColor(report.status)}>
                      {report.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <div className="text-sm">
                      <span className="font-medium">{report.items.length}</span>{" "}
                      item
                      {report.items.length !== 1 ? "s" : ""} recorded
                    </div>

                    {report.comments && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {report.comments}
                      </p>
                    )}

                    <div className="flex items-center gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          router.push(`/reports/id?id=${report.id}`)
                        }
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>

                      {report.status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              router.push(`/reports/id/edit?id=${report.id}`)
                            }
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteReport(report.id)}
                            className="text-red-500 hover:text-red-600"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}

          {filteredReports.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <div className="text-muted-foreground">
                <p>No reports found</p>
                <p className="text-sm mt-1">
                  {searchTerm || statusFilter !== "all"
                    ? "Try adjusting your filters"
                    : "Start by recording your first market data"}
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
