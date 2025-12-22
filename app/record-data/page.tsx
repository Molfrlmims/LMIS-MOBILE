"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Trash2, Save, Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { getStoredToken, removeToken } from "@/lib/auth";
import { apiClient, ApiError, ImageUploadData } from "@/lib/api";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import {
  Camera as CapacitorCamera,
  CameraResultType,
  CameraSource,
} from "@capacitor/camera";
import { z } from "zod";
import { offlineService } from "@/lib/offiline-service";
import useGeolocation from "@/hooks/use-geolocation";

// ==================== ZOD SCHEMAS ====================

const reportItemSchema = z.object({
  tempId: z.string(),
  speciesId: z.number().min(1, "Species is required"),
  gradeId: z.number().min(1, "Grade is required"),
  gender: z.enum(["male", "female"]),
  price: z.number().min(0.01, "Price must be greater than 0"),
  currency: z.string().min(1, "Currency is required"),
  countryId: z.number().optional(),
  quantity: z.number().int().min(1, "Quantity must be at least 1").optional(),
});

const marketDataFormSchema = z.object({
  selectedMarket: z.number().min(1, "Market selection is required"),
  reportDate: z.string().min(1, "Report date is required"),
  comments: z.string().optional(),
  items: z
    .array(reportItemSchema)
    .min(1, "At least one price item is required"),
});

// ==================== TYPES ====================

interface Market {
  id: number;
  name: string;
  marketType: "export" | "local";
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
  userWithRelations: {
    markets: Market[];
  };
  livestockSpecies: Species[];
  genders: { MALE: string; FEMALE: string };
  defaultCurrency: string;
  currentDate: string;
  countries: Array<{
    id: number;
    name: string;
    code: string;
    flag: string;
  }>;
}

interface ReportItem {
  tempId: string;
  speciesId: number;
  gradeId: number;
  gender: string;
  price: number;
  currency: string;
  countryId?: number;
  quantity?: number;
}

interface Country {
  id: number;
  name: string;
  code: string;
  flag: string;
}

interface IndexedCountries {
  [index: number]: Country;
}

interface CapturedImage {
  tempId: string;
  file: File;
  description?: string;
}

interface FormErrors {
  selectedMarket?: string;
  reportDate?: string;
  items?: string;
  itemErrors?: {
    [index: number]: {
      speciesId?: string;
      gradeId?: string;
      gender?: string;
      price?: string;
      currency?: string;
      countryId?: string;
      image?: string;
      quantity?: string;
    };
  };
}

// ==================== COMPONENT ====================

export default function RecordDataPage() {
  const [referenceData, setReferenceData] = useState<ReferenceData | null>(
    null
  );
  const [selectedMarket, setSelectedMarket] = useState<number | null>(null);
  const [reportDate, setReportDate] = useState("");
  const [comments, setComments] = useState("");
  const [items, setItems] = useState<ReportItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selected, setSelected] = useState<IndexedCountries | null>({});
  const [capturedImages, setCapturedImages] = useState<CapturedImage[]>([]);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const { location, error: locationError } = useGeolocation();

  console.log("location in record data page:", location);

  const router = useRouter();
  const { toast } = useToast();

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

      const data: any = await apiClient.getReferenceData(token);
      setReferenceData(data);
      setReportDate(data.currentDate);
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

  const validateForm = (): boolean => {
    try {
      marketDataFormSchema.parse({
        selectedMarket: selectedMarket || 0,
        reportDate,
        comments,
        items,
      });

      const itemsWithoutImages = items.filter(
        (item) => !capturedImages.some((img) => img.tempId === item.tempId)
      );

      if (itemsWithoutImages.length > 0) {
        const newErrors: FormErrors = {
          items: `${itemsWithoutImages.length} item(s) are missing photos`,
        };

        const itemErrors: { [index: number]: any } = {};
        items.forEach((item, index) => {
          if (!capturedImages.some((img) => img.tempId === item.tempId)) {
            if (!itemErrors[index]) itemErrors[index] = {};
            itemErrors[index].image = "Photo is required for this item";
          }
        });

        newErrors.itemErrors = itemErrors;
        setFormErrors(newErrors);
        return false;
      }

      setFormErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: FormErrors = {};
        const itemErrors: { [index: number]: any } = {};

        error.errors.forEach((err) => {
          const path = err.path[0];

          if (path === "selectedMarket") {
            newErrors.selectedMarket = err.message;
          } else if (path === "reportDate") {
            newErrors.reportDate = err.message;
          } else if (path === "items") {
            newErrors.items = err.message;
          } else if (path === "items" && err.path[1] !== undefined) {
            const itemIndex = err.path[1] as number;
            const field = err.path[2] as string;

            if (!itemErrors[itemIndex]) {
              itemErrors[itemIndex] = {};
            }
            itemErrors[itemIndex][field] = err.message;
          }
        });

        newErrors.itemErrors = itemErrors;
        setFormErrors(newErrors);
      }
      return false;
    }
  };

  const validateItem = (index: number): boolean => {
    try {
      reportItemSchema.parse(items[index]);

      const item = items[index];
      const hasImage = capturedImages.some((img) => img.tempId === item.tempId);

      setFormErrors((prev) => ({
        ...prev,
        itemErrors: {
          ...prev.itemErrors,
          [index]: {
            ...prev.itemErrors?.[index],
            image: hasImage ? undefined : "Photo is required for this item",
          },
        },
      }));

      return hasImage;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const itemErrors: { [index: number]: any } = {
          ...formErrors.itemErrors,
        };
        itemErrors[index] = {};

        error.errors.forEach((err) => {
          const field = err.path[0] as string;
          itemErrors[index][field] = err.message;
        });

        setFormErrors((prev) => ({
          ...prev,
          itemErrors,
        }));
      }
      return false;
    }
  };

  const generateUUID = (): string => {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const addItem = () => {
    if (!referenceData) return;

    const newItem: ReportItem = {
      tempId: generateUUID(),
      speciesId: referenceData.livestockSpecies[0]?.id || 1,
      gradeId: referenceData.livestockSpecies[0]?.grades[0]?.id || 1,
      gender: "male",
      price: 0,
      currency: referenceData.defaultCurrency,
      quantity: 1,
    };
    setItems([...items, newItem]);
  };

  const removeItem = (index: number) => {
    const itemToRemove = items[index];
    setItems(items.filter((_, i) => i !== index));
    setCapturedImages((prev) =>
      prev.filter((img) => img.tempId !== itemToRemove.tempId)
    );

    setFormErrors((prev) => {
      const newItemErrors = { ...prev.itemErrors };
      delete newItemErrors[index];
      return { ...prev, itemErrors: newItemErrors };
    });
  };

  const updateItem = (index: number, field: keyof ReportItem, value: any) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setItems(updatedItems);

    setTimeout(() => validateItem(index), 100);
  };

  const capturePhoto = async (tempId: string, index: number) => {
    try {
      const photo = await CapacitorCamera.getPhoto({
        resultType: CameraResultType.DataUrl,
        quality: 70,
        allowEditing: false,
        source: CameraSource.Camera,
        promptLabelHeader: "Take Photo",
        promptLabelPhoto: "From Gallery",
        promptLabelPicture: "Take Picture",
      });

      if (photo.dataUrl) {
        const response = await fetch(photo.dataUrl);
        const blob = await response.blob();
        const file = new File([blob], `item-${tempId}.jpg`, {
          type: blob.type,
        });

        setCapturedImages((prev) => [
          ...prev.filter((img) => img.tempId !== tempId),
          { tempId, file },
        ]);

        setTimeout(() => validateItem(index), 100);
      }
    } catch (error) {
      console.error("Camera error:", error);
      if (error !== "User cancelled photos app") {
        toast({
          title: "Error",
          description: "Failed to capture photo",
          variant: "destructive",
        });
      }
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix all errors before submitting",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const token = getStoredToken();
      if (!token) return;

      const createReportData = {
        reportDate: new Date(reportDate).toISOString(),
        marketId: selectedMarket,
        comments: comments || undefined,
        latitude: location?.latitude,
        longitude: location?.longitude,
        items: items.map((item) => ({
          tempId: item.tempId,
          speciesId: item.speciesId,
          gradeId: item.gradeId,
          gender: item.gender.toLowerCase(),
          price: item.price,
          currency: item.currency,
          countryId: item.countryId,
          quantity: item.quantity,
        })),
      };

      const savedReport = await apiClient.createReport(token, createReportData);
      console.log("saved report  offline ??", savedReport.offline);
      toast({
        title: "Report queued for submission when online  ",
      });
      if (savedReport.offline) {
        if (capturedImages.length > 0) {
          // Store images with tempIds for later sync
          console.log("storing images offline");
          await offlineService.storeOfflineReportImages(
            capturedImages.map((img) => ({
              tempId: img.tempId,
              file: img.file,
              description: img.description,
            }))
          );
        }
        toast({
          title: "Images queued for upload when online",
        });
        router.push("/reports");
        return;
      }

      const tempIdToDbIdMap = new Map<string, number>();
      if (savedReport.items) {
        savedReport.items.forEach((item: any) => {
          if (item.tempId) {
            tempIdToDbIdMap.set(item.tempId, item.id);
          }
        });
      }

      if (capturedImages.length > 0) {
        const imageMetadata = capturedImages
          .map((capturedImage) => {
            const dbItemId = tempIdToDbIdMap.get(capturedImage.tempId);
            return dbItemId
              ? {
                  itemId: dbItemId,
                  description:
                    capturedImage.description || `Image for item ${dbItemId}`,
                }
              : null;
          })
          .filter(
            (meta): meta is { itemId: number; description: string } =>
              meta !== null
          );

        const files = capturedImages.map((capturedImage) => capturedImage.file);

        const uploadResult = await apiClient.uploadImages(token, {
          reportId: savedReport.id!,
          images: imageMetadata,
          files: files,
        });

        if (uploadResult.offline) {
          toast({
            title: "Report submitted, images queued",
            description:
              "Your report was submitted but images will upload when online",
          });
        } else {
          toast({
            title: "Complete success",
            description: "Report and images submitted successfully",
          });
        }
      } else {
        toast({
          title: "Success",
          description: "Report submitted successfully",
        });
      }

      router.push("/reports");
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
        console.error("Submission error:", error);
        toast({
          title: "Error",
          description: "Failed to submit market data",
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

  return (
    <div className="min-h-screen py-4 px-2 pb-20 ">
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
            <h1 className="text-xl font-bold">Record Market Data</h1>
            <p className="text-sm text-muted-foreground">
              Submit livestock prices with photos
            </p>
          </div>
        </motion.div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Market Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Market & Date</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Market</Label>
                <Select
                  value={selectedMarket?.toString()}
                  onValueChange={(value) => {
                    setSelectedMarket(Number.parseInt(value));
                    setItems([]);
                    setSelected({});
                    setComments("");
                    setCapturedImages([]);
                    setFormErrors({});
                  }}
                >
                  <SelectTrigger
                    className={
                      formErrors.selectedMarket ? "border-red-500" : ""
                    }
                  >
                    <SelectValue placeholder="Select market" />
                  </SelectTrigger>
                  <SelectContent>
                    {referenceData?.userWithRelations.markets.map((market) => (
                      <SelectItem key={market.id} value={market.id.toString()}>
                        {market.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.selectedMarket && (
                  <p className="text-red-500 text-xs mt-1">
                    {formErrors.selectedMarket}
                  </p>
                )}
              </div>
              <div>
                <Label>Report Date</Label>
                <Input
                  type="date"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  className={formErrors.reportDate ? "border-red-500" : ""}
                />
                {formErrors.reportDate && (
                  <p className="text-red-500 text-xs mt-1">
                    {formErrors.reportDate}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Livestock Items</CardTitle>
              <Button
                size="sm"
                onClick={addItem}
                className="bg-somali-green hover:bg-somali-green/90"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Item
              </Button>
            </CardHeader>
            <CardContent>
              {formErrors.items && (
                <p className="text-red-500 text-xs mb-4">{formErrors.items}</p>
              )}

              <AnimatePresence>
                {items.map((item, index) => {
                  const itemImage = capturedImages.find(
                    (img) => img.tempId === item.tempId
                  );
                  const itemError = formErrors.itemErrors?.[index];

                  return (
                    <motion.div
                      key={item.tempId}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border rounded-lg p-4 mb-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">Item {index + 1}</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(index)}
                          className="text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Capture Image */}
                      <div className="space-y-2 ">
                        <div className="flex gap-3 items-center">
                          <Button
                            size="sm"
                            onClick={() => capturePhoto(item.tempId, index)}
                            className={
                              itemError?.image ? "border-red-500" : "border"
                            }
                          >
                            <Camera className="h-4 w-4 mr-2" />
                            {itemImage ? "Retake Photo" : "Capture Photo"}
                          </Button>
                          {itemImage && (
                            <div className="relative">
                              <Image
                                src={URL.createObjectURL(itemImage.file)}
                                alt="Captured"
                                width={60}
                                height={60}
                                className="rounded-lg border"
                              />
                              <Badge className="absolute -top-2 -right-2 bg-green-500">
                                ✓
                              </Badge>
                            </div>
                          )}
                        </div>
                        {itemError?.image && (
                          <p className="text-red-500 text-xs">
                            {itemError.image}
                          </p>
                        )}
                        {!itemImage && (
                          <p className="text-xs text-muted-foreground">
                            📸 Photo required for this livestock item
                          </p>
                        )}
                      </div>

                      {/* Inputs */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Species</Label>
                          <Select
                            value={item.speciesId.toString()}
                            onValueChange={(value) =>
                              updateItem(
                                index,
                                "speciesId",
                                Number.parseInt(value)
                              )
                            }
                          >
                            <SelectTrigger
                              className={cn(
                                "h-9",
                                itemError?.speciesId ? "border-red-500" : ""
                              )}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {referenceData?.livestockSpecies.map(
                                (species) => (
                                  <SelectItem
                                    key={species.id}
                                    value={species.id.toString()}
                                  >
                                    {species.name}
                                  </SelectItem>
                                )
                              )}
                            </SelectContent>
                          </Select>
                          {itemError?.speciesId && (
                            <p className="text-red-500 text-xs mt-1">
                              {itemError.speciesId}
                            </p>
                          )}
                        </div>

                        <div>
                          <Label className="text-xs">Grade</Label>
                          <Select
                            value={item.gradeId.toString()}
                            onValueChange={(value) =>
                              updateItem(
                                index,
                                "gradeId",
                                Number.parseInt(value)
                              )
                            }
                          >
                            <SelectTrigger
                              className={cn(
                                "h-9",
                                itemError?.gradeId ? "border-red-500" : ""
                              )}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {referenceData?.livestockSpecies
                                .find((s) => s.id === item.speciesId)
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
                          {itemError?.gradeId && (
                            <p className="text-red-500 text-xs mt-1">
                              {itemError.gradeId}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Gender</Label>
                          <Select
                            value={item.gender}
                            onValueChange={(value) =>
                              updateItem(index, "gender", value)
                            }
                          >
                            <SelectTrigger
                              className={cn(
                                "h-9",
                                itemError?.gender ? "border-red-500" : ""
                              )}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="male">Male</SelectItem>
                              <SelectItem value="female">Female</SelectItem>
                            </SelectContent>
                          </Select>
                          {itemError?.gender && (
                            <p className="text-red-500 text-xs mt-1">
                              {itemError.gender}
                            </p>
                          )}
                        </div>

                        <div>
                          <Label className="text-xs">Price</Label>
                          <Input
                            type="number"
                            value={item.price}
                            onChange={(e) =>
                              updateItem(
                                index,
                                "price",
                                Number.parseFloat(e.target.value) || 0
                              )
                            }
                            className={cn(
                              "h-9",
                              itemError?.price ? "border-red-500" : ""
                            )}
                            min="0"
                            step="0.01"
                          />
                          {itemError?.price && (
                            <p className="text-red-500 text-xs mt-1">
                              {itemError.price}
                            </p>
                          )}
                        </div>

                        <div>
                          <Label className="text-xs">Currency</Label>
                          <Input
                            value={item.currency}
                            onChange={(e) =>
                              updateItem(index, "currency", e.target.value)
                            }
                            className={cn(
                              "h-9",
                              itemError?.currency ? "border-red-500" : ""
                            )}
                          />
                          {itemError?.currency && (
                            <p className="text-red-500 text-xs mt-1">
                              {itemError.currency}
                            </p>
                          )}
                        </div>
                        <div>
                          <Label className="text-xs">Quantity</Label>
                          <Input
                            type="number"
                            value={item.quantity || ""}
                            onChange={(e) =>
                              updateItem(
                                index,
                                "quantity",
                                e.target.value
                                  ? Number.parseInt(e.target.value)
                                  : undefined
                              )
                            }
                            className={cn(
                              "h-9",
                              itemError?.quantity ? "border-red-500" : ""
                            )}
                            min="0"
                            step="1"
                          />
                          {itemError?.quantity && (
                            <p className="text-red-500 text-xs mt-1">
                              {itemError.quantity}
                            </p>
                          )}
                        </div>
                      </div>

                      {referenceData?.userWithRelations.markets.find(
                        (market) => market.id === selectedMarket
                      )?.marketType === "export" && (
                        <motion.div
                          className="w-full border rounded-lg"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2, delay: 0.3 }}
                        >
                          <Command>
                            <CommandInput placeholder="Search country..." />
                            <CommandList className="max-h-14">
                              <CommandEmpty>No country found.</CommandEmpty>
                              <CommandGroup heading="Countries">
                                {referenceData?.countries.map((country) => (
                                  <CommandItem
                                    key={country.id}
                                    value={country.name}
                                    onSelect={() => {
                                      setSelected({ [index]: country });
                                      updateItem(
                                        index,
                                        "countryId",
                                        country.id
                                      );
                                    }}
                                  >
                                    <img
                                      src={country.flag}
                                      alt={country.name}
                                      className="w-5 h-5 mr-2 rounded-sm"
                                    />
                                    {country.name}
                                    <Check
                                      className={cn(
                                        "ml-auto h-4 w-4",
                                        selected?.[index]?.name === country.name
                                          ? "opacity-100"
                                          : "opacity-0"
                                      )}
                                    />
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>

                          {selected?.[index] && (
                            <p className="text-sm p-4 border-t flex gap-2">
                              <p> Selected : </p>
                              <Image
                                src={selected?.[index]?.flag}
                                alt={selected?.[index]?.name}
                                width={20}
                                height={20}
                                className="rounded-sm"
                              />{" "}
                              <p> {selected?.[index]?.name} </p>
                            </p>
                          )}
                        </motion.div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {items.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No items added yet</p>
                  <p className="text-sm">Click "Add Item" to start</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Comments */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Comments</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Add any additional comments (optional)..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full h-12 bg-gradient-to-r from-somali-blue to-somali-green hover:from-somali-blue/90 hover:to-somali-green/90"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Submitting...
              </>
            ) : (
              <>
                <Save className="h-5 w-5 mr-2" />
                Submit Report
              </>
            )}
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
