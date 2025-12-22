"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
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
import { ArrowLeft, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { getStoredToken, removeToken } from "@/lib/auth";
import { apiClient, ApiError } from "@/lib/api";
import { useSearchParams } from "next/navigation";
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

export default function AddReportItemPage() {
  const [referenceData, setReferenceData] = useState<ReferenceData | null>(
    null
  );
  const [speciesId, setSpeciesId] = useState<number>(0);
  const [gradeId, setGradeId] = useState<number>(0);
  const [gender, setGender] = useState<string>("male");
  const [price, setPrice] = useState<number>(0);
  const [currency, setCurrency] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const reportId = Number(searchParams.get("id"));

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    fetchReferenceData();
  }, [router]);

  const fetchReferenceData = async () => {
    try {
      const token = getStoredToken();
      if (!token) return;

      // Verify report exists and is pending
      const [reportsData, refData]: [any, any] = await Promise.all([
        apiClient.getReports(token),
        apiClient.getReferenceData(token),
      ]);

      const report:any = reportsData.find((r: any) => r.id === reportId);
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
          description: "Items can only be added to pending reports",
          variant: "destructive",
        });
        router.back();
        return;
      }

      setReferenceData(refData);
      setCurrency(refData.defaultCurrency.toLowerCase());

      // Set default species and grade
      if (refData.livestockSpecies.length > 0) {
        setSpeciesId(refData.livestockSpecies[0].id);
        if (refData.livestockSpecies[0].grades.length > 0) {
          setGradeId(refData.livestockSpecies[0].grades[0].id);
        }
      }
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
          description: "Failed to load reference data",
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

      // First get the current report
      const reportsData:any = await apiClient.getReports(token);
      const report = reportsData.find((r: any) => r.id === reportId);

      if (!report) {
        throw new Error("Report not found");
      }

      // Add the new item to the existing items
      const newItem = {
        speciesId,
        gradeId,
        gender,
        price,
        currency: currency.toLowerCase(),
      };

      // Update the report with the new items array
      await apiClient.addReportItem(token, reportId, newItem);

      toast({
        title: "Success",
        description: "Item added successfully!",
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
          description: "Failed to add item",
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

  if (!referenceData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Failed to load reference data</p>
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
            <h1 className="text-xl font-bold">Add New Item</h1>
            <p className="text-sm text-muted-foreground">
              Report ID: {reportId}
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
                    placeholder="0.00"
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
                Adding...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </>
            )}
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
