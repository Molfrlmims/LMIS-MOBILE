"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

interface ReportItem {
  id: number;
  speciesId: number;
  gradeId: number;
  gender: string;
  price: number;
  currency: string;
}

interface Species {
  id: number;
  name: string;
  grades: Array<{
    id: number;
    code: string;
    description: string;
  }>;
}

interface ReferenceData {
  livestockSpecies: Species[];
  genders: { MALE: string; FEMALE: string };
  defaultCurrency: string;
}

export default function EditReportItemPage() {
  const [item, setItem] = useState<ReportItem | null>(null);
  const [referenceData, setReferenceData] = useState<ReferenceData | null>(
    null
  );
  const [speciesId, setSpeciesId] = useState<number>(0);
  const [gradeId, setGradeId] = useState<number>(0);
  const [gender, setGender] = useState<string>("");
  const [price, setPrice] = useState<number>(0);
  const [currency, setCurrency] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const params = useSearchParams();
  console.log("params", params);
  const { toast } = useToast();
  const reportId = Number(params.get("id"));
  const itemId = Number(params.get("itemid"));
  console.log("reportId", reportId, "itemId", itemId);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    fetchItemAndReference();
  }, [router, reportId, itemId]);

  const fetchItemAndReference = async () => {
    try {
      const token = getStoredToken();
      if (!token) return;

      // Fetch both report data and reference data
      const [reportsData, refData]: [any, any] = await Promise.all([
        apiClient.getReports(token),
        apiClient.getReferenceData(token),
      ]);

      console.log("Fetched reportsData:", reportsData, "reportId", reportId);
      const report = reportsData.find((r: any) => {
        console.log("Checking report:", r.id, "against", reportId);
        return r.id === reportId;
      });

      if (!report) {
        toast({
          title: "Error",
          description: "Report not found",
          variant: "destructive",
        });
        router.back();
        return;
      }

      if (report.status !== "pending") {
        toast({
          title: "Error",
          description: "Only items in pending reports can be edited",
          variant: "destructive",
        });
        router.back();
        return;
      }

      console.log("itemId", itemId, "report.items", report.items);
      const currentItem = report.items.find((i: ReportItem) => i.id === itemId);
      if (!currentItem) {
        toast({
          title: "Error",
          description: "Item not found",
          variant: "destructive",
        });
        router.back();
        return;
      }

      setItem(currentItem);
      setReferenceData(refData);
      setSpeciesId(currentItem.livestock.id);
      setGradeId(currentItem.livestock.id);
      setGender(currentItem.livestock.id);
      setPrice(currentItem.livestock.price);
      setCurrency(currentItem.currency);
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
          description: "Failed to load item data",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!speciesId || !gradeId || !gender || price <= 0) {
      toast({
        title: "Validation Error",
        description: "Please fill in all fields with valid values",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const token = getStoredToken();
      if (!token) return;

      await apiClient.updateReportItem(token, reportId, itemId, {
        speciesId,
        gradeId,
        gender,
        price,
        currency: currency.toLowerCase(),
      });

      toast({
        title: "Success",
        description: "Item updated successfully!",
      });
      router.push(`/reports/${reportId}`);
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
          description: "Failed to update item",
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

  if (!item || !referenceData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">
          Item not found or cannot be edited
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
            <h1 className="text-xl font-bold">Edit Item</h1>
            <p className="text-sm text-muted-foreground">
              Report ID: {reportId} | Item ID: {itemId}
            </p>
          </div>
        </motion.div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Item Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Species</Label>
                  <Select
                    value={speciesId.toString()}
                    onValueChange={(value) => {
                      const newSpeciesId = Number.parseInt(value);
                      setSpeciesId(newSpeciesId);
                      // Reset grade when species changes
                      const species = referenceData.livestockSpecies.find(
                        (s) => s.id === newSpeciesId
                      );
                      if (species && species.grades.length > 0) {
                        setGradeId(species.grades[0].id);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {referenceData.livestockSpecies.map((species) => (
                        <SelectItem
                          key={species.id}
                          value={species.id.toString()}
                        >
                          {species.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Grade</Label>
                  <Select
                    value={gradeId.toString()}
                    onValueChange={(value) =>
                      setGradeId(Number.parseInt(value))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {referenceData.livestockSpecies
                        .find((s) => s.id === speciesId)
                        ?.grades.map((grade) => (
                          <SelectItem
                            key={grade.id}
                            value={grade.id.toString()}
                          >
                            {grade.code}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Gender</Label>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Price</Label>
                  <Input
                    type="number"
                    value={price}
                    onChange={(e) =>
                      setPrice(Number.parseFloat(e.target.value) || 0)
                    }
                    min="0"
                    step="0.01"
                  />
                </div>

                <div>
                  <Label>Currency</Label>
                  <Input
                    value={currency.toUpperCase()}
                    onChange={(e) => setCurrency(e.target.value.toLowerCase())}
                    placeholder="USD"
                  />
                </div>
              </div>

              {/* Grade description */}
              {referenceData.livestockSpecies
                .find((s) => s.id === speciesId)
                ?.grades.find((g) => g.id === gradeId)?.description && (
                <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
                  <strong>Grade Description:</strong>{" "}
                  {
                    referenceData.livestockSpecies
                      .find((s) => s.id === speciesId)
                      ?.grades.find((g) => g.id === gradeId)?.description
                  }
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={
              isSubmitting || !speciesId || !gradeId || !gender || price <= 0
            }
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
                Update Item
              </>
            )}
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
