import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Plus, Trash2 } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import { useLocation } from "react-router";

import { storeApi } from "@/api/store/storeSystemApi";
// import { decodeToken } from "../../config/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import Heading from "../../components/element/Heading";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { ComboBox } from "../../components/ui/combobox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "../../components/ui/form";

type StoreItem = {
  groupname?: string;
  item_code?: string;
  itemname?: string;
  uom?: string;
};

type IndentItem = {
  category: string;
  productName: string;
  itemCode: string;
  uom: string;
  requestQty: string;
  make: string;
  specification: string;
  purpose: string;
  costLocation: string;
  stock?: string;
};

type IndentForm = {
  formType: "INDENT" | "REQUISITION" | "";
  indentSeries: string;
  department: string;
  requesterName: string;
  username: string;
  division: string;
  hod: string;
  items: IndentItem[];
};

const indentDivisionMap: Record<string, string> = {
  I1: "SM",
  I3: "RP",
  I4: "PM",
  I5: "CO",
};

const requisitionDivisionMap: Record<string, string> = {
  R1: "SM",
  R3: "RP",
  R4: "PM",
};

export default function UserIndent() {
  const location = useLocation();
  const { user: authUser } = useAuth();
  const [storeItems, setStoreItems] = useState<StoreItem[]>([]);
  const [uomList, setUomList] = useState<string[]>([]);
  const [costLocations, setCostLocations] = useState<string[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingCostLocations, setLoadingCostLocations] = useState(false);
  const [previousDivision, setPreviousDivision] = useState("");
  const [stockMap, setStockMap] = useState<Record<string, number>>({});
  const [loadingStock, setLoadingStock] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<IndentForm>({
    defaultValues: {
      formType: "",
      indentSeries: "",
      department: "",
      requesterName: "",
      username: "",
      division: "",
      hod: "",
      items: [
        {
          category: "",
          productName: "",
          itemCode: "",
          uom: "",
          requestQty: "",
          make: "",
          specification: "",
          purpose: "",
          costLocation: "",
          stock: "0",
        },
      ],
    },
  });

  const { control, watch, handleSubmit, setValue, reset, getValues } = form;
  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const itemCount = watch("items").length;
  const formType = watch("formType");
  const indentSeries = watch("indentSeries");
  const division = watch("division");
  const department = watch("department");

  const uomOptions = useMemo(
    () => uomList.map((value) => ({ label: value, value })),
    [uomList]
  );

  const costLocationOptions = useMemo(
    () => costLocations.map((value) => ({ label: value, value })),
    [costLocations]
  );

  const groupOptions = useMemo(() => {
    const uniqueGroups = Array.from(
      new Set(storeItems.map((item) => item.groupname).filter(Boolean))
    );
    return uniqueGroups.map((group) => ({ label: group || "", value: group || "" }));
  }, [storeItems]);

  const productOptions = useMemo(
    () =>
      storeItems.map((item) => ({
        label: item.itemname || "",
        value: item.item_code || "",
      })),
    [storeItems]
  );

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const queryType = params.get("formType");
    if (queryType === "INDENT" || queryType === "REQUISITION") {
      setValue("formType", queryType);
      setValue("indentSeries", "");
      setValue("division", "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // First try to get from auth context (from login response)
    if (authUser) {
      setValue("requesterName", authUser.user_name || "");
      setValue("username", authUser.user_name || "");
      setValue("department", authUser.user_access || authUser.department || "");
    }

    // If department is still missing, fetch from API
    if (!authUser?.user_access && !authUser?.department) {
      const token = localStorage.getItem("token");
      if (!token) return;
      // const decoded = decodeToken(token);
      const employeeId = authUser?.employee_id;
      if (!employeeId) return;

      let active = true;

      const loadUser = async () => {
        try {
          const res: any = await storeApi.getUser(employeeId);
          if (!active) return;

          // Match original code structure: res.data?.success && res.data.data
          if (res?.data?.success && res.data.data) {
            const apiUser = res.data.data;
            if (!authUser?.user_name) {
              setValue("requesterName", apiUser.user_name || "");
              setValue("username", apiUser.username || "");
            }
            setValue("department", apiUser.user_access || apiUser.department || "");
          } else if (res?.data?.data) {
            const apiUser = res.data.data;
            if (!authUser?.user_name) {
              setValue("requesterName", apiUser.user_name || "");
              setValue("username", apiUser.username || "");
            }
            setValue("department", apiUser.user_access || apiUser.department || "");
          } else if (res?.data) {
            const apiUser = res.data;
            if (!authUser?.user_name) {
              setValue("requesterName", apiUser.user_name || "");
              setValue("username", apiUser.username || "");
            }
            setValue("department", apiUser.user_access || apiUser.department || "");
          }
        } catch (err) {
          console.warn("Failed to load user info", err);
        }
      };

      void loadUser();

      return () => {
        active = false;
      };
    }
  }, [setValue, authUser]);

  useEffect(() => {
    if (!department) {
      setValue("hod", "");
      return;
    }

    let active = true;
    const fetchHOD = async () => {
      try {
        const res: any = await storeApi.getHOD(department);
        if (active && res?.success && res.data) {
          setValue("hod", res.data.hod || "");
        }
      } catch (err) {
        console.warn("Failed to fetch HOD for department:", department, err);
        if (active) setValue("hod", "");
      }
    };

    fetchHOD();
    return () => { active = false; };
  }, [department, setValue]);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        setLoadingProducts(true);
        const res = (await storeApi.getItems()) as any;
        const rawItems = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
            ? res
            : [];

        const normalized = (rawItems as any[])
          .map((item) => ({
            groupname: String(
              item.groupname || item.groupName || item.GROUP_NAME || ""
            ).trim(),
            item_code: String(
              item.item_code || item.itemCode || item.ITEM_CODE || ""
            ).trim(),
            itemname: String(
              item.itemname || item.item_name || item.ITEM_NAME || ""
            ).trim(),
            uom: String(
              item.uom || item.UOM || item.COL3 || ""
            ).trim(),
          }))
          .filter((item) => item.item_code && item.itemname);

        const uniqueItems = Array.from(
          new Map<string, StoreItem>(
            normalized.map((item) => [item.item_code || "", item])
          ).values()
        );

        setStoreItems(uniqueItems);
      } catch (err) {
        console.error("Failed to load items", err);
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchItems();
  }, []);

  useEffect(() => {
    const fetchTodayStock = async () => {
      try {
        setLoadingStock(true);
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, "0");
        const dd = String(today.getDate()).padStart(2, "0");
        const todayStr = `${dd}-${mm}-${yyyy}`;

        const res: any = await storeApi.getStock(todayStr, todayStr);
        let dataArray: any[] = [];
        if (Array.isArray(res)) dataArray = res;
        else if (res?.data && Array.isArray(res.data)) dataArray = res.data;
        else if (res?.data?.data && Array.isArray(res.data.data)) dataArray = res.data.data;

        const mapping: Record<string, number> = {};
        dataArray.forEach((r: any) => {
          const code = String(r.COL1 ?? r.itemCode ?? "").trim();
          const stock = Number(r.COL5 ?? r.closingQty ?? 0);
          if (code) mapping[code] = stock;
        });
        setStockMap(mapping);
      } catch (err) {
        console.warn("Failed to fetch stock data", err);
      } finally {
        setLoadingStock(false);
      }
    };
    fetchTodayStock();
  }, []);

  useEffect(() => {
    const fetchUoms = async () => {
      try {
        const res = await storeApi.getUom();
        const data = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
            ? res
            : [];
        if (Array.isArray(data)) {
          const uniqueUoms = Array.from(
            new Set(
              data.map((row: any) => row.uom || row.UOM).filter(Boolean)
            )
          );
          setUomList(uniqueUoms);
        } else {
          setUomList([]);
        }
      } catch (err) {
        console.warn("UOM endpoint not available.", err);
        setUomList([]);
      }
    };

    fetchUoms();
  }, []);

  useEffect(() => {
    if (!indentSeries) return;

    const mapped =
      indentDivisionMap[indentSeries] ||
      requisitionDivisionMap[indentSeries] ||
      "";

    if (mapped) {
      setValue("division", mapped);
    }
  }, [indentSeries, setValue]);

  useEffect(() => {
    const fetchLocations = async () => {
      const divisionChanged =
        previousDivision !== "" && previousDivision !== division;

      if (!division && previousDivision) {
        // If division becomes empty from a previous value, clear item cost locations
        const currentItems = getValues("items");
        currentItems.forEach((_, index) => {
          setValue(`items.${index}.costLocation`, "");
        });
      }
      setPreviousDivision(division); // Update previousDivision here for the next render

      try {
        setLoadingCostLocations(true);
        let res: any;
        if (!division) {
          // Fetch all locations if no division is selected
          res = await storeApi.getCostLocations();
        } else if (division === "RP") {
          res = await storeApi.getCostLocationsRP();
        } else if (division === "PM") {
          res = await storeApi.getCostLocationsPM();
        } else if (division === "CO") {
          res = await storeApi.getCostLocationsCO();
        } else {
          res = await storeApi.getCostLocations(division);
        }

        const payload = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
            ? res
            : [];

        if (payload.length) {
          const locations = payload
            .map((item: any) => item.cost_name || item.COST_NAME)
            .filter(Boolean);
          setCostLocations(locations);

          if (divisionChanged) {
            const currentItems = getValues("items");
            currentItems.forEach((_, index) => {
              setValue(`items.${index}.costLocation`, "");
            });
          }

          setPreviousDivision(division);
        } else {
          setCostLocations([]);
        }
      } catch (err) {
        console.error("Failed to load cost locations", division, err);
        setCostLocations([]);
      } finally {
        setLoadingCostLocations(false);
      }
    };

    fetchLocations();
  }, [division, previousDivision, setValue, getValues]);

  const handleProductSelect = (index: number, selectedItemCode: string) => {
    if (!selectedItemCode) {
      setValue(`items.${index}.productName`, "");
      setValue(`items.${index}.itemCode`, "");
      setValue(`items.${index}.category`, "");
      return;
    }

    const selectedItem = storeItems.find(
      (item) => item.item_code === selectedItemCode
    );

    const itemCode = selectedItem?.item_code || "";
    setValue(`items.${index}.productName`, selectedItem?.itemname || "");
    setValue(`items.${index}.itemCode`, itemCode);
    setValue(`items.${index}.category`, selectedItem?.groupname || "");
    if ((selectedItem as any)?.uom) {
      setValue(`items.${index}.uom`, (selectedItem as any).uom);
    }

    // Auto-fill stock
    const stockVal = stockMap[itemCode] ?? 0;
    setValue(`items.${index}.stock`, String(stockVal));
  };

  const generateRequestNumber = async (
    currentFormType: "INDENT" | "REQUISITION"
  ) => {
    const prefix = currentFormType === "INDENT" ? "IND" : "REQ";
    try {
      const res = await storeApi.getAllIndents();
      const list = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res)
          ? res
          : [];

      const numbers = list
        .map((row: any) => {
          const value = row.request_number ?? row.requestNumber ?? "";
          if (typeof value !== "string") return 0;
          if (!value.toUpperCase().startsWith(prefix)) return 0;
          const numeric = value.replace(/[^0-9]/g, "");
          const parsed = parseInt(numeric, 10);
          return Number.isNaN(parsed) ? 0 : parsed;
        })
        .filter((num: unknown): num is number => typeof num === "number");

      const nextNumber =
        numbers.reduce((max, current) => (current > max ? current : max), 0) + 1;

      return `${prefix}${String(nextNumber).padStart(2, "0")}`;
    } catch (error) {
      console.error("Failed to generate request number:", error);
      return `${prefix}${String(Date.now() % 100).padStart(2, "0")}`;
    }
  };

  const onSubmit = async (data: IndentForm) => {
    try {
      setSubmitting(true);
      if (!data.items.length) {
        toast.error("Please add at least one item");
        return;
      }

      if (!data.requesterName || !data.department) {
        toast.error("Please fill in user details");
        return;
      }

      if (!data.formType || !data.indentSeries) {
        toast.error("Please pick a form type and series");
        return;
      }

      const requestNumber = await generateRequestNumber(data.formType);

      const isHod = String(authUser?.store_role_access || "").toLowerCase().includes("hod");

      const invalidItems = data.items.some(
        (item) => !item.productName || !item.itemCode || !item.uom || !item.requestQty
      );

      if (invalidItems) {
        toast.error("Please ensure all items have a Product, UOM, and Required Quantity");
        return;
      }

      const payloads = data.items.map((item) => ({
        form_type: data.formType,
        indent_series: data.indentSeries,
        requester_name: data.requesterName,
        department: data.department,
        division: data.division,
        item_code: item.itemCode,
        product_name: item.productName,
        category: item.category,
        group_name: item.category,
        request_qty: Number(item.requestQty) || 0,
        uom: item.uom,
        specification: item.specification.trim(),
        make: item.make,
        purpose: item.purpose,
        cost_location: item.costLocation,
        request_status: isHod ? "APPROVED" : "PENDING",
        request_number: requestNumber,
        created_at: new Date().toISOString(),
      }));

      if (!payloads.length) {
        toast.error("Add at least one valid item");
        return;
      }

      await Promise.all(payloads.map((payload) => storeApi.submitIndent(payload)));
      toast.success("Indent submitted successfully!", {
        style: {
          background: "#10b981",
          color: "#ffffff",
        },
      });

      reset((prev) => ({
        ...prev,
        indentSeries: "",
        division: "",
        items: [
          {
            category: "",
            productName: "",
            itemCode: "",
            uom: "",
            requestQty: "",
            make: "",
            specification: "",
            purpose: "",
            costLocation: "",
            stock: "0",
          },
        ],
      }));
    } catch (err: any) {
      console.error("Error submitting indent:", err);
      const message = err?.response?.data?.message || "Failed to save indent";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full p-4 md:p-6 lg:p-8">
      <div className="px-4 md:px-6 lg:px-8 mb-6">
        <Heading
          heading="User Indent Form"
          subtext="Create a new Store/Purchase Indent or Requisition"
        >
          <ClipboardList size={50} className="text-primary" />
        </Heading>
      </div>

      <div className="px-4 md:px-6 lg:px-8">
        <Form {...form}>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-8 bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100"
          >
            {/* Header */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Department */}


              {/* Form Type */}
              <FormField
                control={control}
                name="formType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Form Type</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        className="border border-gray-300 rounded-md h-10 px-3 text-sm w-full bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        onChange={(e) => {
                          const v = e.target.value as 'INDENT' | 'REQUISITION' | '';
                          field.onChange(v);
                          // reset indentSeries & division when form type changes
                          setValue('indentSeries', '');
                          setValue('division', '');
                        }}
                      >
                        <option value="">Select Form Type</option>
                        <option value="INDENT">Indent Form</option>
                        <option value="REQUISITION">Requisition Form</option>
                      </select>
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* requester */}
              <FormField
                control={control}
                name="requesterName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>User Name</FormLabel>
                    <FormControl>
                      <Input {...field} readOnly className="bg-gray-100" />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        readOnly
                        className="bg-gray-100"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* HOD (Auto) */}
              <FormField
                control={control}
                name="hod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Head of Department (HOD)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        readOnly
                        className="bg-gray-100 cursor-not-allowed"
                        placeholder="Auto from department"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Indent / Requisition Series */}
              <FormField
                control={control}
                name="indentSeries"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{formType === 'REQUISITION' ? 'Requisition Series' : 'Indent Series'}</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        className="border border-gray-300 rounded-md h-10 px-3 text-sm w-full bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">
                          {formType === 'REQUISITION'
                            ? 'Select requisition series'
                            : 'Select indent series'}
                        </option>

                        {formType === 'INDENT' && (
                          <>
                            <option value="I1">I1-INDENT-SMS</option>
                            <option value="I3">I3-INDENT-PATRA ROLLING</option>
                            <option value="I4">I4-PIPE MILL</option>
                            <option value="I5">I5-INDENT- GENERAL</option>
                          </>
                        )}

                        {formType === 'REQUISITION' && (
                          <>
                            <option value="R1">R1 - REQUISITION-STORE-SMS</option>
                            <option value="R3">R3 - REQUISITION-STORE-TMT ROLLING</option>
                            <option value="R4">R4 - REQUISITION-STORE-PIPE</option>
                          </>
                        )}
                      </select>
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* division (auto) */}
              <FormField
                control={control}
                name="division"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Division</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        readOnly
                        className="bg-gray-100 cursor-not-allowed"
                        placeholder="Auto from series"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Items */}
            <div className="space-y-6">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="border rounded-xl p-4 bg-slate-50 space-y-4"
                >
                  <div className="flex justify-between items-center">
                    <p className="font-medium text-sm">Item {index + 1}</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                      disabled={itemCount === 1}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Product Name */}
                    <FormField
                      control={control}
                      name={`items.${index}.productName`}
                      render={() => {
                        return (
                          <FormItem>
                            <FormLabel className="flex items-center gap-1">
                              Product Name
                              <span className="text-red-500">*</span>
                            </FormLabel>
                            <FormControl>
                              <ComboBox
                                options={productOptions}
                                value={
                                  getValues(`items.${index}.itemCode`)
                                    ? [getValues(`items.${index}.itemCode`)]
                                    : []
                                }
                                onChange={(val) =>
                                  handleProductSelect(index, val[0] || '')
                                }
                                placeholder={
                                  loadingProducts
                                    ? 'Loading products...'
                                    : productOptions.length === 0
                                      ? 'No products available'
                                      : 'Search or Select Product'
                                }
                                disabled={loadingProducts}
                                className="w-full"
                              />
                            </FormControl>
                          </FormItem>
                        );
                      }}
                    />

                    {/* Group Name (Now Auto-filled) */}
                    <FormField
                      control={control}
                      name={`items.${index}.category`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Group Name</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              readOnly
                              placeholder="Auto-filled from product"
                              className="bg-gray-100 cursor-not-allowed"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {/* Item Code */}
                    <FormField
                      control={control}
                      name={`items.${index}.itemCode`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Item Code</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              readOnly
                              className="bg-gray-100"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {/* UOM */}
                    <FormField
                      control={control}
                      name={`items.${index}.uom`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1">
                            UOM
                            <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <ComboBox
                              options={uomOptions}
                              value={field.value ? [field.value] : []}
                              onChange={(val) => field.onChange(val[0] || '')}
                              placeholder="Select UOM"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {/* Qty */}
                    <FormField
                      control={control}
                      name={`items.${index}.requestQty`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1">
                            Required Qty
                            <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              placeholder="Enter Qty"
                              min="1"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {/* Make */}
                    <FormField
                      control={control}
                      name={`items.${index}.make`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Make / Brand</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter Brand" />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {/* Stock Display */}
                    <FormField
                      control={control}
                      name={`items.${index}.stock`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Stock (Closing Qty)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                {...field}
                                readOnly
                                className={`bg-gray-100 font-semibold ${Number(field.value) === 0 ? "text-red-600" : "text-green-600"
                                  }`}
                              />
                              {loadingStock && (
                                <div className="absolute right-3 top-2.5">
                                  <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                                </div>
                              )}
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {/* Cost Location */}
                    <FormField
                      control={control}
                      name={`items.${index}.costLocation`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cost / Project Location</FormLabel>
                          <FormControl>
                            <ComboBox
                              options={costLocationOptions}
                              value={field.value ? [field.value] : []}
                              onChange={(val) => field.onChange(val[0] || '')}
                              placeholder={
                                loadingCostLocations
                                  ? 'Loading locations...'
                                  : 'Select Cost Location'
                              }
                              disabled={loadingCostLocations}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Specification + Purpose */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={control}
                      name={`items.${index}.specification`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Specification</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              rows={2}
                              placeholder="Enter technical spec"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name={`items.${index}.purpose`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Purpose / Place of Use</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              rows={2}
                              placeholder="Enter purpose / use"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-between pt-4">
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-10"
                disabled={submitting}
              >
                {submitting ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    Submitting...
                  </div>
                ) : (
                  "Submit"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex items-center gap-2"
                onClick={() =>
                  append({
                    category: '',
                    productName: '',
                    itemCode: '',
                    uom: '',
                    requestQty: '',
                    make: '',
                    specification: '',
                    purpose: '',
                    costLocation: '',
                  })
                }
              >
                <Plus size={16} />
                Add Product
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
